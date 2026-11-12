// Panel de administrador: todo lo de aquí exige role ADMIN (ver routes/admin.routes.js).
import bcrypt from 'bcryptjs'
import {
  User, Court, Reservation, ClassProgram, ClassEnrollment, ClassBooking, ClassSession,
  Tournament, TournamentRegistration, Product, Order,
} from '../models/index.js'
import { AppError } from '../utils/AppError.js'

/* ── Resumen (dashboard) ──────────────────────────── */

const sumField = async (Model, match, field) => {
  const [row] = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: `$${field}` } } }])
  return row?.total ?? 0
}

// GET /api/admin/stats → números del panel general (calculados en el servidor)
export async function getStats(req, res) {
  const [
    users, courts, activeCourts, reservations, activeReservations, orders, pendingOrders,
    enrollments, classBookings, registrations, lowStock,
    reservationsRevenue, ordersRevenue, classesRevenue,
  ] = await Promise.all([
    User.countDocuments(),
    Court.countDocuments(),
    Court.countDocuments({ active: true }),
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: 'CONFIRMED' }),
    Order.countDocuments(),
    Order.countDocuments({ status: 'PENDING' }),
    ClassEnrollment.countDocuments({ status: 'ACTIVE' }),
    ClassBooking.countDocuments({ status: 'ACTIVE' }),
    TournamentRegistration.countDocuments({ status: 'ACTIVE' }),
    Product.find({ active: true, stock: { $lte: 3 } }).select('name stock').sort({ stock: 1 }),
    sumField(Reservation, { status: 'CONFIRMED' }, 'totalPrice'),
    sumField(Order, { status: 'PAID' }, 'total'),
    sumField(ClassBooking, { status: 'ACTIVE' }, 'price'),
  ])

  res.json({
    data: {
      users, courts, activeCourts, reservations, activeReservations, orders, pendingOrders,
      enrollments, classBookings, registrations, lowStock,
      revenue: {
        reservations: reservationsRevenue,
        orders: ordersRevenue,
        classes: classesRevenue,
        total: reservationsRevenue + ordersRevenue + classesRevenue,
      },
    },
  })
}

/* ── CRUD genérico: canchas, productos y torneos ─── */
// Para borrar se comprueba antes si tiene historial (reservas, pedidos, inscripciones).
// Si lo tiene, no se borra: se pide desactivarlo, así no se pierden datos de otras personas.

function crud(Model, { label, notFoundCode, sort = { createdAt: 1 }, inUse }) {
  const findOr404 = async (id) => {
    const doc = await Model.findById(id)
    if (!doc) throw new AppError(404, notFoundCode, `${label} no encontrado`)
    return doc
  }

  return {
    list: async (req, res) => {
      res.json({ data: await Model.find().sort(sort) })
    },
    create: async (req, res) => {
      res.status(201).json({ data: await Model.create(req.body) })
    },
    update: async (req, res) => {
      const doc = await findOr404(req.params.id)
      Object.assign(doc, req.body)
      res.json({ data: await doc.save() })
    },
    remove: async (req, res) => {
      const doc = await findOr404(req.params.id)
      const reason = await inUse(doc)
      if (reason) throw new AppError(409, 'IN_USE', reason)
      await doc.deleteOne()
      res.json({ data: { deleted: true, id: doc._id } })
    },
  }
}

export const courts = crud(Court, {
  label: 'Cancha',
  notFoundCode: 'COURT_NOT_FOUND',
  inUse: async (court) =>
    (await Reservation.exists({ court: court._id }))
      ? 'Esta cancha tiene reservas. Desactívala en lugar de borrarla.'
      : null,
})

export const products = crud(Product, {
  label: 'Producto',
  notFoundCode: 'PRODUCT_NOT_FOUND',
  inUse: async (product) =>
    (await Order.exists({ 'items.product': product._id }))
      ? 'Este producto aparece en pedidos. Desactívalo en lugar de borrarlo.'
      : null,
})

export const tournaments = crud(Tournament, {
  label: 'Torneo',
  notFoundCode: 'TOURNAMENT_NOT_FOUND',
  sort: { startDate: 1 },
  inUse: async (tournament) =>
    (await TournamentRegistration.exists({ tournament: tournament._id, status: 'ACTIVE' }))
      ? 'Este torneo tiene personas inscritas: no se puede borrar.'
      : null,
})

// Al editar un torneo, los cupos no pueden quedar por debajo de los ya inscritos
export async function updateTournament(req, res) {
  if (req.body.capacity !== undefined) {
    const tournament = await Tournament.findById(req.params.id)
    if (tournament && req.body.capacity < tournament.registeredCount) {
      throw new AppError(400, 'CAPACITY_TOO_LOW', `Ya hay ${tournament.registeredCount} inscritos: los cupos no pueden ser menos`)
    }
  }
  return tournaments.update(req, res)
}

/* ── Programas de clases ──────────────────────────── */

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// [1, 3, 5] → "Lunes, Miércoles y Viernes" (el domingo va al final)
function daysText(weekdays) {
  const names = [...new Set(weekdays)].sort((a, b) => (a || 7) - (b || 7)).map((d) => DAY_NAMES[d])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0]
}

// Convierte un grupo del formulario al formato del modelo
const toGroup = ({ minAge, maxAge, coachName, coachTitle, monthlyPrice, capacity }) => ({
  minAge,
  maxAge: maxAge ?? null,
  coach: { name: coachName, title: coachTitle || undefined },
  monthlyPrice,
  capacity,
})

export const listClassPrograms = async (req, res) => {
  res.json({ data: await ClassProgram.find().sort({ createdAt: 1 }) })
}

export async function createClassProgram(req, res) {
  const { weekdays, groups, ...rest } = req.body
  const program = await ClassProgram.create({
    ...rest,
    weekdays,
    daysOfWeek: daysText(weekdays),
    groups: groups.map(toGroup),
  })
  res.status(201).json({ data: program })
}

export async function updateClassProgram(req, res) {
  const program = await ClassProgram.findById(req.params.id)
  if (!program) throw new AppError(404, 'CLASS_NOT_FOUND', 'Programa no encontrado')

  const { weekdays, groups, ...rest } = req.body
  Object.assign(program, rest)
  if (weekdays) {
    program.weekdays = weekdays
    program.daysOfWeek = daysText(weekdays)
  }

  if (groups) {
    const keepIds = new Set(groups.filter((g) => g._id).map((g) => g._id))

    // Grupos que se quitan: solo si nadie está inscrito en ellos
    for (const old of program.groups) {
      if (keepIds.has(String(old._id))) continue
      const used = await ClassEnrollment.exists({ group: old._id, status: 'ACTIVE' })
        || await ClassBooking.exists({ group: old._id, status: 'ACTIVE' })
      if (used) {
        throw new AppError(409, 'IN_USE', `El grupo de ${old.minAge} años tiene alumnos: no se puede quitar`)
      }
    }

    program.groups = groups.map((g) => {
      const old = g._id && program.groups.id(g._id)
      if (g._id && !old) throw new AppError(400, 'GROUP_NOT_FOUND', 'Uno de los grupos no existe')
      if (old && g.capacity < (old.enrolledCount ?? 0)) {
        throw new AppError(400, 'CAPACITY_TOO_LOW', `El grupo de ${old.minAge} años ya tiene ${old.enrolledCount} inscritos: los cupos no pueden ser menos`)
      }
      // Los grupos que ya existen conservan su _id y sus inscritos
      if (!old) return toGroup(g)
      const group = { ...toGroup(g), _id: old._id, enrolledCount: old.enrolledCount ?? 0 }
      // Si el profesor es el mismo, se conserva su foto
      if (old.coach?.name === g.coachName) group.coach.photoUrl = old.coach.photoUrl
      return group
    })
  }

  res.json({ data: await program.save() })
}

export async function deleteClassProgram(req, res) {
  const program = await ClassProgram.findById(req.params.id)
  if (!program) throw new AppError(404, 'CLASS_NOT_FOUND', 'Programa no encontrado')
  const used = await ClassEnrollment.exists({ program: program._id }) || await ClassBooking.exists({ program: program._id })
  if (used) throw new AppError(409, 'IN_USE', 'Este programa tiene alumnos o clases reservadas. Desactívalo en lugar de borrarlo.')
  await ClassSession.deleteMany({ group: { $in: program.groups.map((g) => g._id) } })
  await program.deleteOne()
  res.json({ data: { deleted: true, id: program._id } })
}

/* ── Pedidos ──────────────────────────────────────── */

export async function listOrders(req, res) {
  const orders = await Order.find().populate('user', 'name email phone').sort({ createdAt: -1 })
  res.json({ data: orders })
}

// PATCH /api/admin/orders/:id/status → si se cancela, las unidades vuelven al inventario
export async function updateOrderStatus(req, res) {
  const { status } = req.body
  const order = await Order.findById(req.params.id)
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Pedido no encontrado')
  if (order.status === status) return res.json({ data: order })
  if (order.status === 'CANCELLED') {
    throw new AppError(409, 'ORDER_CANCELLED', 'Un pedido cancelado no se puede reactivar: el stock ya se devolvió')
  }

  // Cambio atómico: si dos administradores cancelan a la vez, solo uno devuelve el stock
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { $set: { status } },
    { returnDocument: 'after' },
  ).populate('user', 'name email phone')
  if (!updated) throw new AppError(409, 'ORDER_CHANGED', 'El pedido cambió mientras tanto. Recarga e inténtalo de nuevo.')

  if (status === 'CANCELLED') {
    await Promise.all(order.items.map((item) =>
      Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })))
  }
  res.json({ data: updated })
}

/* ── Usuarios ─────────────────────────────────────── */

export async function listUsers(req, res) {
  res.json({ data: await User.find().sort({ createdAt: -1 }) })
}

export async function createUser(req, res) {
  const { password, ...data } = req.body
  if (await User.exists({ email: data.email })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email ya está registrado')
  }
  const user = await User.create({ ...data, phone: data.phone || undefined, passwordHash: await bcrypt.hash(password, 10) })
  res.status(201).json({ data: user })
}

// Evita quedarse sin ningún administrador
async function ensureAnotherAdmin(user) {
  if (user.role !== 'ADMIN') return
  const admins = await User.countDocuments({ role: 'ADMIN' })
  if (admins <= 1) throw new AppError(409, 'LAST_ADMIN', 'Debe quedar al menos un administrador')
}

export async function updateUser(req, res) {
  const user = await User.findById(req.params.id)
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')

  const { password, ...data } = req.body
  if (data.role === 'USER' && user.role === 'ADMIN') {
    if (user._id.equals(req.user._id)) {
      throw new AppError(409, 'SELF_DEMOTE', 'No puedes quitarte a ti mismo el rol de administrador')
    }
    await ensureAnotherAdmin(user)
  }
  if (data.email && data.email !== user.email && (await User.exists({ email: data.email }))) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email ya está registrado')
  }

  Object.assign(user, data)
  if (data.phone === '') user.phone = undefined
  if (password) user.passwordHash = await bcrypt.hash(password, 10)
  res.json({ data: await user.save() })
}

export async function deleteUser(req, res) {
  const user = await User.findById(req.params.id)
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')
  if (user._id.equals(req.user._id)) {
    throw new AppError(409, 'SELF_DELETE', 'No puedes borrar tu propia cuenta desde el panel')
  }
  await ensureAnotherAdmin(user)

  const hasHistory = await Promise.all([
    Reservation.exists({ user: user._id }),
    Order.exists({ user: user._id }),
    ClassEnrollment.exists({ user: user._id }),
    ClassBooking.exists({ user: user._id }),
    TournamentRegistration.exists({ user: user._id }),
  ])
  if (hasHistory.some(Boolean)) {
    throw new AppError(409, 'IN_USE', 'Este usuario tiene reservas, pedidos o inscripciones: no se puede borrar')
  }
  await user.deleteOne()
  res.json({ data: { deleted: true, id: user._id } })
}

/* ── Reservas ─────────────────────────────────────── */

export async function listReservations(req, res) {
  const reservations = await Reservation.find()
    .populate('court', 'name type')
    .populate('user', 'name email phone')
    .sort({ date: -1, startHour: -1 })
  res.json({ data: reservations })
}

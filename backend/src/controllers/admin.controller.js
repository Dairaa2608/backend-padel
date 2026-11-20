// Panel de administrador: todo lo de aquí exige role ADMIN (ver routes/admin.routes.js).
import bcrypt from 'bcryptjs'
import {
  User, Court, Reservation, ClassProgram, ClassEnrollment, ClassBooking, ClassSession,
  Tournament, TournamentRegistration, Product, Order, Fine,
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
    reservationsRevenue, ordersRevenue, classBookingsRevenue, enrollmentsRevenue, tournamentsRevenue,
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
    sumField(ClassBooking, { status: 'ACTIVE', type: 'SINGLE', paymentStatus: 'PAID' }, 'price'),
    sumField(ClassEnrollment, { status: 'ACTIVE', paymentStatus: 'PAID' }, 'amount'),
    sumField(TournamentRegistration, { status: 'ACTIVE', paymentStatus: 'PAID' }, 'amount'),
  ])
  const classesRevenue = classBookingsRevenue + enrollmentsRevenue

  res.json({
    data: {
      users, courts, activeCourts, reservations, activeReservations, orders, pendingOrders,
      enrollments, classBookings, registrations, lowStock,
      revenue: {
        reservations: reservationsRevenue,
        orders: ordersRevenue,
        classes: classesRevenue,
        tournaments: tournamentsRevenue,
        total: reservationsRevenue + ordersRevenue + classesRevenue + tournamentsRevenue,
      },
    },
  })
}

const revenueMonthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

export async function getRevenueReport(req, res) {
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const months = new Map(Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1))
    const key = revenueMonthKey(date)
    return [key, {
      key,
      label: new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date),
      total: 0,
      pending: 0,
      categories: { courts: 0, store: 0, classes: 0, tournaments: 0, fines: 0 },
    }]
  }))

  const createdAt = { $gte: from, $lt: to }
  const paymentDateInRange = {
    $or: [
      { paymentDate: createdAt },
      { paymentDate: { $exists: false }, createdAt },
    ],
  }
  const recordedPayment = { $in: ['PAID', 'PENDING'] }
  const [reservations, orders, classBookings, classEnrollments, tournamentRegistrations, fines] = await Promise.all([
    Reservation.find({ status: 'CONFIRMED', createdAt })
      .populate('user', 'name email')
      .populate('court', 'name'),
    Order.find({ status: { $in: ['PAID', 'PENDING'] }, createdAt })
      .populate('user', 'name email'),
    ClassBooking.find({ type: 'SINGLE', status: 'ACTIVE', price: { $gt: 0 }, paymentStatus: recordedPayment, ...paymentDateInRange })
      .populate('user', 'name email')
      .populate('program', 'name'),
    ClassEnrollment.find({ status: 'ACTIVE', amount: { $gt: 0 }, paymentStatus: recordedPayment, ...paymentDateInRange })
      .populate('user', 'name email')
      .populate('program', 'name'),
    TournamentRegistration.find({ status: 'ACTIVE', amount: { $gt: 0 }, paymentStatus: recordedPayment, ...paymentDateInRange })
      .populate('user', 'name email')
      .populate('tournament', 'name'),
    // Multas: pagadas (ingreso) y pendientes (por cobrar)
    Fine.find({ status: { $in: ['PAID', 'PENDING'] }, $or: [{ paidAt: createdAt }, { status: 'PENDING', createdAt }] })
      .populate('user', 'name email'),
  ])

  const transactions = [
    ...reservations.map((reservation) => ({
      id: `reservation-${reservation._id}`,
      date: reservation.createdAt,
      customer: reservation.user?.name ?? 'Usuario eliminado',
      email: reservation.user?.email ?? '',
      category: 'courts',
      description: `${reservation.court?.name ?? 'Reserva'} · ${reservation.date}`,
      amount: reservation.totalPrice,
      paymentMethod: null,
      status: 'CONFIRMED',
    })),
    ...orders.map((order) => ({
      id: `order-${order._id}`,
      date: order.createdAt,
      customer: order.user?.name ?? 'Usuario eliminado',
      email: order.user?.email ?? '',
      category: 'store',
      description: `Pedido #${String(order._id).slice(-6).toUpperCase()}`,
      amount: order.total,
      paymentMethod: order.paymentMethod,
      status: order.status,
    })),
    ...classBookings.map((booking) => ({
      id: `class-${booking._id}`,
      date: booking.paymentDate ?? booking.createdAt,
      customer: booking.user?.name ?? 'Usuario eliminado',
      email: booking.user?.email ?? '',
      category: 'classes',
      description: booking.program?.name ?? 'Clase suelta',
      amount: booking.price,
      paymentMethod: booking.paymentMethod,
      status: booking.paymentStatus,
    })),
    ...classEnrollments.map((enrollment) => ({
      id: `enrollment-${enrollment._id}`,
      date: enrollment.paymentDate ?? enrollment.createdAt,
      customer: enrollment.user?.name ?? 'Usuario eliminado',
      email: enrollment.user?.email ?? '',
      category: 'classes',
      description: `${enrollment.program?.name ?? 'Clase'} · inscripción mensual`,
      amount: enrollment.amount,
      paymentMethod: enrollment.paymentMethod,
      status: enrollment.paymentStatus,
    })),
    ...tournamentRegistrations.map((registration) => ({
      id: `tournament-${registration._id}`,
      date: registration.paymentDate ?? registration.createdAt,
      customer: registration.user?.name ?? 'Usuario eliminado',
      email: registration.user?.email ?? '',
      category: 'tournaments',
      description: registration.tournament?.name ?? 'Inscripción a torneo',
      amount: registration.amount,
      paymentMethod: registration.paymentMethod,
      status: registration.paymentStatus,
    })),
    ...fines.map((fine) => ({
      id: `fine-${fine._id}`,
      date: fine.paidAt ?? fine.createdAt,
      customer: fine.user?.name ?? 'Usuario eliminado',
      email: fine.user?.email ?? '',
      category: 'fines',
      description: `Multa · ${fine.description}`,
      amount: fine.amount,
      paymentMethod: fine.paymentMethod ?? null,
      status: fine.status,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  const summary = {
    confirmed: 0,
    pending: 0,
    confirmedTransactions: 0,
    pendingTransactions: 0,
    paymentMethodsRecorded: 0,
    categories: { courts: 0, store: 0, classes: 0, tournaments: 0, fines: 0 },
  }

  for (const transaction of transactions) {
    const month = months.get(revenueMonthKey(new Date(transaction.date)))
    if (transaction.paymentMethod) summary.paymentMethodsRecorded += 1
    if (transaction.status === 'PENDING') {
      summary.pending += transaction.amount
      summary.pendingTransactions += 1
      month.pending += transaction.amount
      continue
    }

    summary.confirmed += transaction.amount
    summary.confirmedTransactions += 1
    summary.categories[transaction.category] += transaction.amount
    month.total += transaction.amount
    month.categories[transaction.category] += transaction.amount
  }

  res.json({
    data: {
      from,
      summary,
      months: [...months.values()],
      transactions: transactions.slice(0, 100),
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

// GET /api/admin/users/details → lista usuarios con info de torneos, clases y compras

// GET /api/admin/users → lista básica de usuarios
export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 })
  res.json({ data: users })
}

export async function listUsersDetails(req, res) {
  const users = await User.find().sort({ createdAt: -1 })
  const data = await Promise.all(users.map(async (user) => {
    const [hasTournament, hasEnrollment, hasBooking, hasDebt, hasProduct] = await Promise.all([
      TournamentRegistration.exists({ user: user._id, status: 'ACTIVE' }),
      ClassEnrollment.exists({ user: user._id, status: 'ACTIVE' }),
      ClassBooking.exists({ user: user._id, status: 'ACTIVE' }),
      Order.exists({ user: user._id, status: 'PENDING' }),
      Order.exists({ user: user._id, status: { $in: ['PAID', 'PENDING'] } }),
    ])
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      hasTournament: !!hasTournament,
      hasClass: !!(hasEnrollment || hasBooking),
      hasDebt: !!hasDebt,
      hasProduct: !!hasProduct,
    }
  }))
  res.json({ data })
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
    Fine.exists({ user: user._id }),
  ])
  if (hasHistory.some(Boolean)) {
    throw new AppError(409, 'IN_USE', 'Este usuario tiene reservas, pedidos, inscripciones o multas: no se puede borrar')
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

/* ── Multas ───────────────────────────────────────── */

// GET /api/admin/fines → todas las multas, con el usuario
export async function listFines(req, res) {
  const fines = await Fine.find().populate('user', 'name email phone').populate('createdBy', 'name').sort({ createdAt: -1 })
  res.json({ data: fines })
}

// POST /api/admin/fines → multa manual (daños, conducta…)
export async function createFine(req, res) {
  const { userId, amount, description } = req.body
  const user = await User.findById(userId)
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado')
  const fine = await Fine.create({ user: user._id, reason: 'MANUAL', amount, description, createdBy: req.user._id })
  res.status(201).json({ data: await fine.populate('user', 'name email phone') })
}

// PATCH /api/admin/fines/:id { status: 'PAID' | 'WAIVED' } → pagada en el club o anulada
export async function updateFine(req, res) {
  const { status } = req.body
  const fine = await Fine.findOneAndUpdate(
    { _id: req.params.id, status: 'PENDING' },
    { $set: { status, ...(status === 'PAID' && { paymentMethod: 'CASH', paidAt: new Date() }) } },
    { returnDocument: 'after' },
  ).populate('user', 'name email phone')
  if (!fine) throw new AppError(409, 'FINE_NOT_PENDING', 'La multa no existe o ya no está pendiente')
  res.json({ data: fine })
}

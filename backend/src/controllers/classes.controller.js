import { ClassProgram, ClassEnrollment, ClassBooking, ClassSession } from '../models/index.js'
import { availabilityQuerySchema, SINGLE_CLASS_PRICES } from '../schemas/class.schemas.js'
import { AppError } from '../utils/AppError.js'
import { hashCedula } from '../utils/cedula.js'
import { isPast, weekdayOf, hourFromSlot, todayInColombia } from '../utils/dates.js'

/* ── Ayudas ─────────────────────────────────────────── */

async function findProgramAndGroup(programId, groupId) {
  const program = await ClassProgram.findById(programId)
  const group = program?.groups.id(groupId)
  if (!program || !program.active || !group) {
    throw new AppError(404, 'CLASS_NOT_FOUND', 'Programa o grupo no encontrado')
  }
  return { program, group }
}

function checkSchedule(program, schedule) {
  if (!program.scheduleSlots.includes(schedule)) {
    throw new AppError(400, 'INVALID_SCHEDULE', `Horarios disponibles: ${program.scheduleSlots.join(', ')}`)
  }
}

// La fecha tiene que ser futura y caer en un día del programa
function checkClassDate(program, date, schedule) {
  if (Number.isNaN(new Date(date).getTime())) {
    throw new AppError(400, 'INVALID_DATE', 'La fecha no es válida')
  }
  if (isPast(date, hourFromSlot(schedule))) {
    throw new AppError(400, 'PAST_DATE', 'No puedes elegir una fecha u hora que ya pasó')
  }
  if (!program.weekdays.includes(weekdayOf(date))) {
    throw new AppError(400, 'INVALID_DAY', `Este programa solo tiene clases: ${program.daysOfWeek}`)
  }
}

// Cupos libres de un grupo para la inscripción mensual
const monthlySpotsLeft = (group) => Math.max(group.capacity - (group.enrolledCount ?? 0), 0)

// Cupos libres de un grupo un día concreto (inscritos del mes + clases sueltas/cortesía de ese día)
async function daySpotsLeft(group, date) {
  const session = await ClassSession.findOne({ group: group._id, date })
  return Math.max(monthlySpotsLeft(group) - (session?.booked ?? 0), 0)
}

/* ── Catálogo ───────────────────────────────────────── */

// GET /api/classes → programas con sus grupos y cupos libres del mes (público)
export async function listPrograms(req, res) {
  const programs = await ClassProgram.find({ active: true }).sort({ createdAt: 1 })
  const data = programs.map((program) => {
    const json = program.toJSON()
    json.groups = program.groups.map((group) => ({
      ...group.toJSON(),
      enrolledCount: group.enrolledCount ?? 0,
      spotsLeft: monthlySpotsLeft(group),
    }))
    return json
  })
  res.json({ data: { programs: data, singleClassPrices: SINGLE_CLASS_PRICES } })
}

// GET /api/classes/:programId/groups/:groupId/availability?date=2026-11-16 → cupos ese día
export async function getDayAvailability(req, res) {
  const { date } = availabilityQuerySchema.parse(req.query)
  const { program, group } = await findProgramAndGroup(req.params.programId, req.params.groupId)
  const validDay = program.weekdays.includes(weekdayOf(date))
  res.json({
    data: { date, validDay, daysOfWeek: program.daysOfWeek, spotsLeft: validDay ? await daySpotsLeft(group, date) : 0 },
  })
}

// GET /api/classes/:programId/groups/:groupId/dates → próximos días con clase y sus cupos.
// Así la página muestra solo los días disponibles en vez de un calendario libre.
export async function listUpcomingDates(req, res) {
  const { program, group } = await findProgramAndGroup(req.params.programId, req.params.groupId)
  const DAYS_AHEAD = 21 // las próximas 3 semanas

  const dates = []
  const day = new Date(`${todayInColombia()}T12:00:00Z`)
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = day.toISOString().slice(0, 10)
    if (program.weekdays.includes(weekdayOf(date))) dates.push(date)
    day.setUTCDate(day.getUTCDate() + 1)
  }

  // Una sola consulta para los cupos ocupados de todos esos días
  const sessions = await ClassSession.find({ group: group._id, date: { $in: dates } })
  const booked = Object.fromEntries(sessions.map((s) => [s.date, s.booked]))

  res.json({
    data: {
      daysOfWeek: program.daysOfWeek,
      dates: dates.map((date) => ({ date, spotsLeft: Math.max(monthlySpotsLeft(group) - (booked[date] ?? 0), 0) })),
    },
  })
}

/* ── Inscripción mensual (2 o 4 personas) ───────────── */

// POST /api/classes/enrollments
export async function enroll(req, res) {
  const { programId, groupId, schedule, level, birthDate, partySize } = req.body
  const { program, group } = await findProgramAndGroup(programId, groupId)
  checkSchedule(program, schedule)

  const existing = await ClassEnrollment.findOne({ user: req.user._id, group: group._id })
  if (existing?.status === 'ACTIVE') {
    throw new AppError(409, 'ALREADY_ENROLLED', 'Ya estás inscrito en este grupo')
  }

  // Si algún día ya hay clases sueltas o de cortesía, esos cupos también están ocupados
  const busiestDay = await ClassSession.findOne({ group: group._id, booked: { $gt: 0 } }).sort({ booked: -1 })
  const maxAllowed = group.capacity - partySize - (busiestDay?.booked ?? 0)

  // Reserva los cupos en un solo paso: MongoDB solo suma si caben todas las personas
  const reserved = await ClassProgram.findOneAndUpdate(
    {
      _id: program._id,
      groups: {
        $elemMatch: {
          _id: group._id,
          $or: [{ enrolledCount: { $lte: maxAllowed } }, { enrolledCount: { $exists: false } }],
        },
      },
    },
    { $inc: { 'groups.$.enrolledCount': partySize } },
  )
  if (!reserved || maxAllowed < 0) {
    if (reserved) await releaseMonthlySpots(program._id, group._id, partySize)
    throw new AppError(409, 'GROUP_FULL', `No quedan cupos para ${partySize} personas en este grupo`)
  }

  try {
    let enrollment
    if (existing) {
      // Se había inscrito y canceló: se reactiva la misma inscripción
      Object.assign(existing, { status: 'ACTIVE', schedule, level, birthDate, partySize })
      enrollment = await existing.save()
    } else {
      enrollment = await ClassEnrollment.create({
        user: req.user._id, program: program._id, group: group._id, schedule, level, birthDate, partySize,
      })
    }
    res.status(201).json({ data: enrollment })
  } catch (error) {
    await releaseMonthlySpots(program._id, group._id, partySize)
    if (error.code === 11000) {
      throw new AppError(409, 'ALREADY_ENROLLED', 'Ya estás inscrito en este grupo')
    }
    throw error
  }
}

const releaseMonthlySpots = (programId, groupId, partySize) =>
  ClassProgram.updateOne(
    { _id: programId, 'groups._id': groupId },
    { $inc: { 'groups.$.enrolledCount': -partySize } },
  )

// GET /api/classes/enrollments/me → mis inscripciones mensuales activas
export async function listMyEnrollments(req, res) {
  const enrollments = await ClassEnrollment.find({ user: req.user._id, status: 'ACTIVE' })
    .populate('program', 'name type color daysOfWeek groups')
    .sort({ createdAt: -1 })
  res.json({ data: enrollments })
}

// PATCH /api/classes/enrollments/:id/cancel
export async function cancelEnrollment(req, res) {
  const enrollment = await ClassEnrollment.findById(req.params.id)
  const isOwner = enrollment?.user.equals(req.user._id)
  if (!enrollment || (!isOwner && req.user.role !== 'ADMIN')) {
    throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Inscripción no encontrada')
  }
  if (enrollment.status === 'CANCELLED') {
    throw new AppError(409, 'ALREADY_CANCELLED', 'Esta inscripción ya estaba cancelada')
  }

  enrollment.status = 'CANCELLED'
  await enrollment.save()
  await releaseMonthlySpots(enrollment.program, enrollment.group, enrollment.partySize)
  res.json({ data: enrollment })
}

/* ── Clase suelta o de cortesía (1, 2 o 4 personas) ─── */

// POST /api/classes/bookings
export async function bookClass(req, res) {
  const { type, programId, groupId, date, schedule, partySize, cedula } = req.body
  const { program, group } = await findProgramAndGroup(programId, groupId)
  checkSchedule(program, schedule)
  checkClassDate(program, date, schedule)

  const isCourtesy = type === 'COURTESY'
  const cedulaHash = isCourtesy ? hashCedula(cedula) : undefined

  // Comprobación previa para dar un mensaje claro (la garantía final la dan los índices únicos)
  if (isCourtesy) {
    const used = await ClassBooking.exists({
      type: 'COURTESY', status: 'ACTIVE', $or: [{ cedulaHash }, { user: req.user._id }],
    })
    if (used) {
      throw new AppError(409, 'COURTESY_USED', 'La clase de cortesía es solo para la primera vez y ya fue usada')
    }
  }

  // Reserva los cupos de ese día en un solo paso
  const maxAllowed = monthlySpotsLeft(group) - partySize
  await ClassSession.updateOne({ group: group._id, date }, { $setOnInsert: { booked: 0 } }, { upsert: true })
  const reserved = await ClassSession.findOneAndUpdate(
    { group: group._id, date, booked: { $lte: maxAllowed } },
    { $inc: { booked: partySize } },
  )
  if (!reserved) {
    const left = await daySpotsLeft(group, date)
    const spots = left === 1 ? 'queda 1 cupo' : `quedan ${left} cupos`
    throw new AppError(409, 'CLASS_FULL', `Ese día solo ${spots} en este grupo`)
  }

  try {
    const booking = await ClassBooking.create({
      user: req.user._id,
      type,
      program: program._id,
      group: group._id,
      date,
      schedule,
      partySize,
      // El precio lo calcula el servidor: nunca se acepta el que envía el navegador
      price: isCourtesy ? 0 : SINGLE_CLASS_PRICES[partySize],
      cedulaHash,
    })
    res.status(201).json({ data: booking })
  } catch (error) {
    // Si algo falla, se devuelven los cupos reservados
    await ClassSession.updateOne({ group: group._id, date }, { $inc: { booked: -partySize } })
    if (error.code === 11000) {
      throw new AppError(409, 'COURTESY_USED', 'La clase de cortesía es solo para la primera vez y ya fue usada')
    }
    throw error
  }
}

// GET /api/classes/bookings/me → mis clases sueltas y de cortesía
export async function listMyBookings(req, res) {
  const bookings = await ClassBooking.find({ user: req.user._id })
    .populate('program', 'name type color daysOfWeek groups')
    .sort({ date: -1 })
  res.json({ data: bookings })
}

// PATCH /api/classes/bookings/:id/cancel → solo antes de la clase
export async function cancelBooking(req, res) {
  const booking = await ClassBooking.findById(req.params.id)
  const isOwner = booking?.user.equals(req.user._id)
  if (!booking || (!isOwner && req.user.role !== 'ADMIN')) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'Clase no encontrada')
  }
  if (booking.status === 'CANCELLED') {
    throw new AppError(409, 'ALREADY_CANCELLED', 'Esta clase ya estaba cancelada')
  }
  if (isPast(booking.date, hourFromSlot(booking.schedule))) {
    throw new AppError(400, 'CLASS_STARTED', 'No puedes cancelar una clase que ya empezó o pasó')
  }

  booking.status = 'CANCELLED'
  await booking.save()
  await ClassSession.updateOne({ group: booking.group, date: booking.date }, { $inc: { booked: -booking.partySize } })
  res.json({ data: booking })
}
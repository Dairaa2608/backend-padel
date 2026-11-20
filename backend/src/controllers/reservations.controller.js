import { Court, Reservation, Fine } from '../models/index.js'
import { OPENING_HOUR, CLOSING_HOUR } from '../models/Reservation.js'
import { availabilityQuerySchema } from '../schemas/reservation.schemas.js'
import { AppError } from '../utils/AppError.js'
import { isPast, hoursUntil } from '../utils/dates.js'
import { LATE_CANCELLATION_HOURS, LATE_CANCELLATION_RATE } from '../utils/fines.js'

async function findActiveCourt(id) {
  const court = await Court.findById(id)
  if (!court || !court.active) {
    throw new AppError(404, 'COURT_NOT_FOUND', 'Cancha no encontrada')
  }
  return court
}

// GET /api/courts/:id/availability?date=2026-11-15
// Devuelve cada hora del día y si está libre u ocupada
export async function getAvailability(req, res) {
  const { date } = availabilityQuerySchema.parse(req.query)
  const court = await findActiveCourt(req.params.id)

  const reservations = await Reservation.find({ court: court._id, date, status: 'CONFIRMED' })
  const occupied = new Set(reservations.flatMap((r) => r.slots))

  const slots = []
  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    const reason = occupied.has(hour) ? 'RESERVED' : isPast(date, hour) ? 'PAST' : null
    slots.push({ hour, available: reason === null, reason })
  }

  res.json({ data: { courtId: court._id, date, pricePerHour: court.pricePerHour, slots } })
}

// POST /api/reservations
export async function createReservation(req, res) {
  const { courtId, date, startHour, endHour } = req.body
  const court = await findActiveCourt(courtId)

  if (isPast(date, startHour)) {
    throw new AppError(400, 'PAST_DATE', 'No puedes reservar una fecha u hora que ya pasó')
  }

  try {
    const reservation = await Reservation.create({
      user: req.user._id,
      court: court._id,
      date,
      startHour,
      endHour,
      // El precio lo calcula el servidor: nunca se acepta el que envía el navegador
      totalPrice: court.pricePerHour * (endHour - startHour),
    })
    await reservation.populate('court', 'name type pricePerHour imageUrl')
    res.status(201).json({ data: reservation })
  } catch (error) {
    // Error 11000 = el índice único de MongoDB detectó que alguna hora ya está reservada
    if (error.code === 11000) {
      throw new AppError(409, 'SLOT_TAKEN', 'Ese horario ya está reservado. Elige otra hora o cancha')
    }
    throw error
  }
}

// GET /api/reservations/me → reservas del usuario con sesión (más recientes primero)
export async function listMyReservations(req, res) {
  const reservations = await Reservation.find({ user: req.user._id })
    .populate('court', 'name type pricePerHour imageUrl')
    .sort({ date: -1, startHour: -1 })
  res.json({ data: reservations })
}

// GET /api/reservations → todas las reservas (solo ADMIN). Opcional: ?date=2026-11-15
export async function listAllReservations(req, res) {
  const filter = req.query.date ? { date: availabilityQuerySchema.parse(req.query).date } : {}
  const reservations = await Reservation.find(filter)
    .populate('court', 'name type')
    .populate('user', 'name email phone')
    .sort({ date: -1, startHour: -1 })
  res.json({ data: reservations })
}

// PATCH /api/reservations/:id/cancel → la cancela su dueño (o un ADMIN)
export async function cancelReservation(req, res) {
  const reservation = await Reservation.findById(req.params.id)
  const isOwner = reservation?.user.equals(req.user._id)

  if (!reservation || (!isOwner && req.user.role !== 'ADMIN')) {
    // Mismo mensaje si no existe o es de otra persona: no se revela qué reservas existen
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Reserva no encontrada')
  }
  if (reservation.status === 'CANCELLED') {
    throw new AppError(409, 'ALREADY_CANCELLED', 'Esta reserva ya estaba cancelada')
  }
  if (isPast(reservation.date, reservation.startHour)) {
    throw new AppError(400, 'PAST_RESERVATION', 'No puedes cancelar una reserva que ya empezó o pasó')
  }

  // Cambio atómico: si se pulsa "cancelar" dos veces a la vez, solo una cuenta (y solo se multa una vez)
  const cancelled = await Reservation.findOneAndUpdate(
    { _id: reservation._id, status: 'CONFIRMED' },
    { $set: { status: 'CANCELLED' } },
    { returnDocument: 'after' },
  ).populate('court', 'name type pricePerHour imageUrl')
  if (!cancelled) throw new AppError(409, 'ALREADY_CANCELLED', 'Esta reserva ya estaba cancelada')

  // Multa por cancelación tardía: si la cancela su dueño con menos de 24 h, paga el 50 %.
  // Si la cancela el administrador (por ejemplo, por lluvia o mantenimiento) no hay multa.
  let fine = null
  if (isOwner && hoursUntil(reservation.date, reservation.startHour) < LATE_CANCELLATION_HOURS) {
    fine = await Fine.create({
      user: reservation.user,
      reason: 'LATE_CANCELLATION',
      description: `Cancelación con menos de ${LATE_CANCELLATION_HOURS} h · ${cancelled.court?.name ?? 'Reserva'} ${reservation.date}`,
      amount: Math.round(reservation.totalPrice * LATE_CANCELLATION_RATE),
      reservation: reservation._id,
    })
  }

  // No se borra: queda cancelada y el horario libre otra vez
  res.json({ data: { ...cancelled.toJSON(), fine } })
}
import { Tournament, TournamentRegistration } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { todayInColombia } from '../utils/dates.js'

// Añade los cupos libres a cada torneo antes de enviarlo
const withSpots = (tournament) => {
  const data = tournament.toJSON()
  data.registeredCount = tournament.registeredCount ?? 0
  data.spotsLeft = Math.max(tournament.capacity - data.registeredCount, 0)
  return data
}

// Las inscripciones se cierran el día que empieza el torneo
const hasStarted = (tournament) => tournament.startDate <= todayInColombia()

// GET /api/tournaments → torneos con sus cupos libres (público)
export async function listTournaments(req, res) {
  const tournaments = await Tournament.find().sort({ startDate: 1 })
  res.json({ data: tournaments.map(withSpots) })
}

// GET /api/tournaments/registrations/me → mis inscripciones activas
export async function listMyRegistrations(req, res) {
  const registrations = await TournamentRegistration.find({ user: req.user._id, status: 'ACTIVE' })
    .populate('tournament')
    .sort({ createdAt: -1 })
  res.json({ data: registrations })
}

// POST /api/tournaments/:id/register
export async function registerToTournament(req, res) {
  const tournament = await Tournament.findById(req.params.id)
  if (!tournament) {
    throw new AppError(404, 'TOURNAMENT_NOT_FOUND', 'Torneo no encontrado')
  }
  if (hasStarted(tournament)) {
    throw new AppError(400, 'REGISTRATION_CLOSED', 'Las inscripciones de este torneo ya cerraron')
  }

  const existing = await TournamentRegistration.findOne({ user: req.user._id, tournament: tournament._id })
  if (existing?.status === 'ACTIVE') {
    throw new AppError(409, 'ALREADY_REGISTERED', 'Ya estás inscrito en este torneo')
  }

  // Reserva un cupo en un solo paso: MongoDB solo suma 1 si todavía quedan cupos.
  // Así, aunque se inscriban varias personas a la vez, nunca se supera la capacidad.
  const reserved = await Tournament.findOneAndUpdate(
    { _id: tournament._id, $expr: { $lt: [{ $ifNull: ['$registeredCount', 0] }, '$capacity'] } },
    { $inc: { registeredCount: 1 } },
  )
  if (!reserved) {
    throw new AppError(409, 'TOURNAMENT_FULL', 'No quedan cupos en este torneo')
  }

  try {
    let registration
    if (existing) {
      // Se había inscrito y canceló: se reactiva la misma inscripción
      existing.status = 'ACTIVE'
      existing.level = req.body.level
      registration = await existing.save()
    } else {
      registration = await TournamentRegistration.create({
        user: req.user._id,
        tournament: tournament._id,
        level: req.body.level,
      })
    }
    await registration.populate('tournament')
    res.status(201).json({ data: registration })
  } catch (error) {
    // Si algo falla, se devuelve el cupo reservado
    await Tournament.updateOne({ _id: tournament._id }, { $inc: { registeredCount: -1 } })
    if (error.code === 11000) {
      throw new AppError(409, 'ALREADY_REGISTERED', 'Ya estás inscrito en este torneo')
    }
    throw error
  }
}

// PATCH /api/tournaments/registrations/:id/cancel
export async function cancelRegistration(req, res) {
  const registration = await TournamentRegistration.findById(req.params.id).populate('tournament')
  const isOwner = registration?.user.equals(req.user._id)

  if (!registration || (!isOwner && req.user.role !== 'ADMIN')) {
    throw new AppError(404, 'REGISTRATION_NOT_FOUND', 'Inscripción no encontrada')
  }
  if (registration.status === 'CANCELLED') {
    throw new AppError(409, 'ALREADY_CANCELLED', 'Esta inscripción ya estaba cancelada')
  }
  if (hasStarted(registration.tournament)) {
    throw new AppError(400, 'TOURNAMENT_STARTED', 'No puedes cancelar: el torneo ya empezó')
  }

  registration.status = 'CANCELLED'
  await registration.save()
  // El cupo queda libre otra vez
  await Tournament.updateOne({ _id: registration.tournament._id }, { $inc: { registeredCount: -1 } })
  res.json({ data: registration })
}

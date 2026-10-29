import { Court } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

// GET /api/courts → canchas activas
export async function listCourts(req, res) {
  const courts = await Court.find({ active: true }).sort({ createdAt: 1 })
  res.json({ data: courts })
}

// GET /api/courts/:id → una cancha
export async function getCourt(req, res) {
  const court = await Court.findById(req.params.id)
  if (!court) {
    throw new AppError(404, 'COURT_NOT_FOUND', 'Cancha no encontrada')
  }
  res.json({ data: court })
}

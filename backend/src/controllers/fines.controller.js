import { Fine } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { withFines } from '../utils/fines.js'

// GET /api/fines/me → mis multas (las pendientes primero)
export async function listMyFines(req, res) {
  const fines = await Fine.find({ user: req.user._id }).sort({ status: -1, createdAt: -1 })
  res.json({ data: fines })
}

// POST /api/fines/:id/pay { paymentMethod: 'CARD' | 'PSE' } → pago simulado
export async function payFine(req, res) {
  const fine = await Fine.findById(req.params.id)
  if (!fine || !fine.user.equals(req.user._id)) {
    throw new AppError(404, 'FINE_NOT_FOUND', 'Multa no encontrada')
  }
  // Cambio atómico: si se pulsa "pagar" dos veces, solo cuenta una
  const paid = await Fine.findOneAndUpdate(
    { _id: fine._id, status: 'PENDING' },
    { $set: { status: 'PAID', paymentMethod: req.body.paymentMethod, paidAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!paid) throw new AppError(409, 'FINE_NOT_PENDING', 'Esta multa ya no está pendiente')
  res.json({ data: { fine: paid, user: await withFines(req.user) } })
}

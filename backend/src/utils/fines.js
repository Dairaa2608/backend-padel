// Reglas de las multas
import { Fine } from '../models/index.js'

export const LATE_CANCELLATION_HOURS = 24 // cancelar con menos de 24 h…
export const LATE_CANCELLATION_RATE = 0.5 // …cuesta el 50 % de la reserva

// Total que debe una persona en multas sin pagar
export async function pendingFinesTotal(userId) {
  const [row] = await Fine.aggregate([
    { $match: { user: userId, status: 'PENDING' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total ?? 0
}

// El usuario para enviar al navegador, con lo que debe en multas
export async function withFines(user) {
  return { ...user.toJSON(), pendingFines: await pendingFinesTotal(user._id) }
}

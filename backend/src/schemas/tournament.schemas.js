import { z } from 'zod'
import { PAYMENT_METHODS } from '../utils/payment.js'

export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional']

export const registerTournamentSchema = z.object({
  level: z.enum(LEVELS, 'Elige tu nivel de juego'),
  paymentMethod: z.enum(PAYMENT_METHODS, 'Elige un método de pago'),
})

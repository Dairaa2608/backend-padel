import { z } from 'zod'

// Las multas se pagan en línea (simulado): en efectivo se pagan en el club y las marca el admin
export const payFineSchema = z.object({
  paymentMethod: z.enum(['CARD', 'PSE'], 'Elige tarjeta o PSE'),
})

// Multa manual del administrador
export const createFineSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{24}$/i, 'Elige un usuario'),
  amount: z.coerce.number().int('El valor debe ser un número entero').min(1000, 'El valor mínimo es $1.000').max(5_000_000, 'Valor demasiado alto'),
  description: z.string().trim().min(5, 'Escribe el motivo (mínimo 5 caracteres)').max(200),
})

// El admin la marca como pagada (en efectivo, en el club) o la anula
export const updateFineSchema = z.object({
  status: z.enum(['PAID', 'WAIVED'], 'Estado no válido'),
})

import { z } from 'zod'

const name = z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(80)
const email = z.string().trim().toLowerCase().pipe(z.email('El email no es válido'))
const phone = z.string().trim().regex(/^[+]?[0-9\s\-()]{7,20}$/, 'El teléfono no es válido')

export const registerSchema = z.object({
  name,
  email,
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72),
  phone: phone.optional(),
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

export const updateProfileSchema = z
  .object({ name, email, phone })
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar')
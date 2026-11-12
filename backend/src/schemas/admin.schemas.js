// Validaciones de los formularios del panel de administrador.
// Para editar se usa la versión .partial(): solo se envían los campos que cambian.
import { z } from 'zod'

const text = (label, min = 2, max = 120) =>
  z.string().trim().min(min, `${label}: mínimo ${min} caracteres`).max(max, `${label}: máximo ${max} caracteres`)
const price = (label) => z.coerce.number().int(`${label} debe ser un número entero`).min(0, `${label} no puede ser negativo`)
const positive = (label) => z.coerce.number().int(`${label} debe ser un número entero`).min(1, `${label} debe ser al menos 1`)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
const optionalUrl = z.string().trim().max(500).optional().or(z.literal(''))

const atLeastOne = (schema) =>
  schema.refine((data) => Object.keys(data).length > 0, 'Envía al menos un campo para actualizar')

/* ── Canchas ─────────────────────────────────────── */
export const courtSchema = z.object({
  name: text('Nombre', 2, 60),
  type: z.enum(['INDOOR', 'OUTDOOR'], 'El tipo debe ser Interior o Exterior'),
  pricePerHour: positive('El precio por hora'),
  description: text('Descripción', 5, 300),
  features: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  imageUrl: optionalUrl,
  active: z.boolean().default(true),
})
export const courtUpdateSchema = atLeastOne(courtSchema.partial())

/* ── Productos ───────────────────────────────────── */
export const productSchema = z.object({
  name: text('Nombre', 2, 80),
  description: text('Descripción', 5, 300),
  price: positive('El precio'),
  stock: price('El stock'),
  badge: z.enum(['', 'Nuevo', 'Oferta', 'Destacado']).default(''),
  imageUrl: optionalUrl,
  active: z.boolean().default(true),
})
export const productUpdateSchema = atLeastOne(productSchema.partial())

/* ── Torneos ─────────────────────────────────────── */
const tournamentBase = z.object({
  name: text('Nombre', 3, 80),
  description: text('Descripción', 5, 300),
  startDate: date,
  endDate: date,
  category: text('Categoría', 2, 40),
  level: text('Nivel', 2, 60),
  location: text('Lugar', 2, 80),
  fee: price('La inscripción'),
  prize: price('El premio'),
  capacity: positive('Los cupos'),
  imageUrl: optionalUrl,
})
const datesInOrder = (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate
const datesMessage = { message: 'La fecha de fin no puede ser anterior a la de inicio', path: ['endDate'] }
export const tournamentSchema = tournamentBase.refine(datesInOrder, datesMessage)
export const tournamentUpdateSchema = atLeastOne(tournamentBase.partial()).refine(datesInOrder, datesMessage)

/* ── Programas de clases ─────────────────────────── */
const groupSchema = z.object({
  _id: z.string().optional(), // si viene, es un grupo que ya existe
  minAge: z.coerce.number().int().min(0, 'Edad mínima inválida'),
  maxAge: z.coerce.number().int().min(0).nullable().optional(),
  coachName: text('Profesor', 2, 60),
  coachTitle: z.string().trim().max(80).optional().or(z.literal('')),
  monthlyPrice: positive('El precio mensual'),
  capacity: positive('Los cupos'),
})

export const classProgramSchema = z.object({
  name: text('Nombre', 3, 60),
  type: text('Tipo', 2, 30),
  description: text('Descripción', 5, 300),
  weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Elige al menos un día de clase'),
  scheduleSlots: z.array(z.string().trim().min(1)).min(1, 'Escribe al menos un horario'),
  sessionHours: positive('Las horas por clase'),
  hoursPerWeek: positive('Las horas por semana'),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, 'El color debe ser como #1a73e8').default('#1a73e8'),
  imageUrl: optionalUrl,
  active: z.boolean().default(true),
  groups: z.array(groupSchema).min(1, 'El programa necesita al menos un grupo'),
})
export const classProgramUpdateSchema = atLeastOne(classProgramSchema.partial())

/* ── Pedidos ─────────────────────────────────────── */
export const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELLED'], 'Estado no válido'),
})

/* ── Usuarios ────────────────────────────────────── */
const userFields = {
  name: text('Nombre', 2, 80),
  email: z.string().trim().toLowerCase().pipe(z.email('El email no es válido')),
  phone: z.string().trim().regex(/^[+]?[0-9\s\-()]{7,20}$/, 'El teléfono no es válido').optional().or(z.literal('')),
  role: z.enum(['USER', 'ADMIN'], 'El rol debe ser Cliente o Administrador'),
}
const password = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72)

export const createUserSchema = z.object({ ...userFields, password })
export const updateUserSchema = atLeastOne(z.object({ ...userFields, password }).partial())

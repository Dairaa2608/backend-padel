import { z } from 'zod'

// El pádel se juega en parejas: nunca 3 personas
export const MONTHLY_PARTY_SIZES = [2, 4]
export const CLASS_PARTY_SIZES = [1, 2, 4]

// Precio de una clase suelta según cuántas personas vienen (en pesos)
export const SINGLE_CLASS_PRICES = { 1: 100000, 2: 120000, 4: 160000 }

const objectId = (message) => z.string().regex(/^[0-9a-f]{24}$/i, message)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
const level = z.enum(['Principiante', 'Intermedio', 'Avanzado'], 'Elige tu nivel de juego')

// Inscripción mensual a un grupo
export const enrollSchema = z.object({
programId: objectId('El programa no es válido'),
groupId: objectId('El grupo no es válido'),
schedule: z.string().min(1, 'Elige un horario'),
level,
birthDate: date,
partySize: z.coerce
    .number()
    .refine((n) => MONTHLY_PARTY_SIZES.includes(n), 'La inscripción mensual es para 2 o 4 personas (parejas)'),
})

// Clase suelta o de cortesía en una fecha concreta
export const bookClassSchema = z
  .object({
    type: z.enum(['SINGLE', 'COURTESY'], 'El tipo de clase no es válido'),
    programId: objectId('El programa no es válido'),
    groupId: objectId('El grupo no es válido'),
    date,
    schedule: z.string().min(1, 'Elige un horario'),
    partySize: z.coerce
    .number()
    .refine((n) => CLASS_PARTY_SIZES.includes(n), 'La clase es para 1, 2 o 4 personas'),
    cedula: z.string().trim().regex(/^\d{6,10}$/, 'La cédula debe tener entre 6 y 10 dígitos').optional(),
})
.refine((data) => data.type !== 'COURTESY' || data.cedula, {
    message: 'Para la clase de cortesía necesitamos tu cédula',
    path: ['cedula'],
    })

export const availabilityQuerySchema = z.object({ date })
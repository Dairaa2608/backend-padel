import { z } from 'zod'
import { OPENING_HOUR, CLOSING_HOUR } from '../models/Reservation.js'

const date = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'La fecha no es válida')

export const availabilityQuerySchema = z.object({ date })

export const createReservationSchema = z
    .object({
    courtId: z.string().regex(/^[0-9a-f]{24}$/i, 'La cancha no es válida'),
    date,
    startHour: z.coerce
        .number('La hora de inicio debe ser un número')
        .int('La hora de inicio debe ser una hora en punto')
        .min(OPENING_HOUR, `El club abre a las ${OPENING_HOUR}:00`)
        .max(CLOSING_HOUR - 1, `La última reserva empieza a las ${CLOSING_HOUR - 1}:00`),
    endHour: z.coerce
        .number('La hora de fin debe ser un número')
        .int('La hora de fin debe ser una hora en punto')
        .min(OPENING_HOUR + 1, `El club abre a las ${OPENING_HOUR}:00`)
        .max(CLOSING_HOUR, `El club cierra a las ${CLOSING_HOUR}:00`),
    })
    .refine((data) => data.endHour > data.startHour, {
    message: 'La hora de fin debe ser posterior a la de inicio',
    path: ['endHour'],
    })
import { z } from 'zod'

export const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Profesional']

export const registerTournamentSchema = z.object({
  level: z.enum(LEVELS, 'Elige tu nivel de juego'),
})

import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
})

export const chatbotMessageSchema = z.object({
  messages: z.array(messageSchema)
    .min(1)
    .max(12)
    .refine((messages) => messages[0]?.role === 'user', 'La conversación debe iniciar con un mensaje del usuario')
    .refine((messages) => messages[messages.length - 1]?.role === 'user', 'El último mensaje debe ser del usuario')
    .refine((messages) => messages.every((message, index) =>
      index === 0 || message.role !== messages[index - 1].role),
    'Los mensajes deben alternar entre usuario y asistente'),
})

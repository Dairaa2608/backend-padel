import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { sendMessage } from '../controllers/chatbot.controller.js'
import { validate } from '../middlewares/validate.js'
import { chatbotMessageSchema } from '../schemas/chatbot.schemas.js'
import { AppError } from '../utils/AppError.js'

const router = Router()

const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) =>
    next(new AppError(429, 'CHATBOT_RATE_LIMIT', 'Has enviado muchos mensajes. Espera un momento e inténtalo de nuevo.')),
})

router.post('/', chatbotLimiter, validate(chatbotMessageSchema), sendMessage)

export default router

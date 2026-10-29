import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { register, login, logout, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { registerSchema, loginSchema } from '../schemas/auth.schemas.js'
import { AppError } from '../utils/AppError.js'

const router = Router()

// Máximo 10 intentos FALLIDOS cada 15 minutos por IP: dificulta adivinar contraseñas a la fuerza
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
        limit: 10,
    skipSuccessfulRequests: true,
    handler: (req, res, next) =>
    next(new AppError(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Espera unos minutos')),
})

router.post('/register', authLimiter, validate(registerSchema), register)
router.post('/login', authLimiter, validate(loginSchema), login)
router.post('/logout', logout)
router.get('/me', requireAuth, me)

export default router
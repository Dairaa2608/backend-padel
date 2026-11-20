import { isAccountVerified } from '../models/User.js'
import { User, Fine } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { COOKIE_NAME, verifyToken } from '../utils/token.js'

// Exige sesión iniciada. Si el token es válido, deja el usuario en req.user.
export async function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión')
    }

    let payload
    try {
    payload = verifyToken(token)
    } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Tu sesión expiró. Inicia sesión de nuevo')
    }

    const user = await User.findById(payload.sub)
    if (!user) {
    throw new AppError(401, 'INVALID_TOKEN', 'Tu sesión ya no es válida. Inicia sesión de nuevo')
        }

    req.user = user
    next()
}

// Exige uno de los roles indicados. Se usa siempre después de requireAuth.
export const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'No tienes permiso para hacer esto')
    }
    next()
}


// Para reservar, inscribirse o comprar hay que haber verificado la cuenta (por correo o por SMS)
export function requireVerifiedEmail(req, res, next) {
  if (!isAccountVerified(req.user)) {
    return next(new AppError(403, 'ACCOUNT_NOT_VERIFIED', 'Primero verifica tu cuenta con un código por correo o por SMS'))
  }
  next()
}

// Con una multa sin pagar no se puede reservar, inscribirse ni comprar
export async function requireNoPendingFines(req, res, next) {
  const pending = await Fine.find({ user: req.user._id, status: 'PENDING' }).select('amount')
  if (pending.length) {
    const total = pending.reduce((sum, fine) => sum + fine.amount, 0)
    const what = pending.length === 1 ? 'una multa pendiente' : `${pending.length} multas pendientes`
    return next(new AppError(403, 'FINES_PENDING', `Tienes ${what} por $${total.toLocaleString('es-CO')}. Págala en tu perfil para seguir.`))
  }
  next()
}

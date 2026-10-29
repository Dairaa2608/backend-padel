import { User } from '../models/index.js'
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

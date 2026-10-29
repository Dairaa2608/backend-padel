// Crear y leer el token de sesión (JWT) que se guarda en una cookie.
import jwt from 'jsonwebtoken'

export const COOKIE_NAME = 'token'
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export function createToken(user) {
    return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET)
}

// httpOnly: el JavaScript de la página NO puede leer la cookie (protege contra robos por XSS)
export const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SEVEN_DAYS,
}
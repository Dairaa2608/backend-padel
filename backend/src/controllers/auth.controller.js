import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { COOKIE_NAME, cookieOptions, createToken } from '../utils/token.js'

// Inicia la sesión: guarda el token en una cookie y devuelve el usuario
function sendSession(res, statusCode, user) {
res.cookie(COOKIE_NAME, createToken(user), cookieOptions)
res.status(statusCode).json({ data: user })
}

// POST /api/auth/register
export async function register(req, res) {
const { name, email, password, phone } = req.body

if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email ya está registrado')
}

const passwordHash = await bcrypt.hash(password, 10)
  // El rol nunca viene del cliente: todo registro nuevo es USER
const user = await User.create({ name, email, passwordHash, phone })
sendSession(res, 201, user)
}

// POST /api/auth/login
export async function login(req, res) {
const { email, password } = req.body
const user = await User.findOne({ email }).select('+passwordHash')

  // Mismo mensaje si el email no existe o la contraseña es incorrecta:
  // así no se revela qué emails están registrados
const valid = user && (await bcrypt.compare(password, user.passwordHash))
if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos')
}

sendSession(res, 200, user)
}

// POST /api/auth/logout
export function logout(req, res) {
res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined })
res.json({ data: { message: 'Sesión cerrada' } })
}

// GET /api/auth/me → el usuario de la sesión actual
export function me(req, res) {
res.json({ data: req.user })
}

import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { COOKIE_NAME, cookieOptions, createToken } from '../utils/token.js'
import { sendMail } from '../utils/mailer.js'
import { welcomeEmail, verificationEmail, verificationSms } from '../emails/welcome.js'
import { createCode, checkCode } from '../utils/verification.js'
import { sendSms } from '../utils/sms.js'

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
  // El rol nunca viene del cliente: todo registro nuevo es USER.
  // La cuenta nace sin verificar: se envía un código al correo (y al celular si lo dio).
const user = new User({ name, email, passwordHash, phone, emailVerified: false, phoneVerified: phone ? false : undefined })
const emailCode = createCode(user, 'email')
const phoneCode = phone ? createCode(user, 'phone') : null
await user.save()
sendSession(res, 201, user)

  // Se envían después de responder: el registro no espera a Gmail ni a Twilio,
  // y si algo falla la cuenta igual queda creada (se puede pedir otro código)
sendMail({ to: user.email, ...welcomeEmail(user, emailCode) })
if (phoneCode) sendSms({ to: user.phone, body: verificationSms(phoneCode) })
}

// Envía un código nuevo por el canal pedido
export async function sendVerificationCode(user, channel) {
const code = createCode(user, channel)
await user.save()
if (channel === 'email') sendMail({ to: user.email, ...verificationEmail(user, code) })
else sendSms({ to: user.phone, body: verificationSms(code) })
}

// POST /api/auth/verify { channel: 'email' | 'phone', code }
export async function verify(req, res) {
const { channel, code } = req.body
const user = await User.findById(req.user._id).select('+verification')
const result = checkCode(user, channel, code)
await user.save()
if (!result.ok) throw new AppError(400, 'INVALID_CODE', result.message)
res.json({ data: user })
}

// POST /api/auth/verify/resend { channel: 'email' | 'phone' }
export async function resendCode(req, res) {
const { channel } = req.body
const user = await User.findById(req.user._id).select('+verification')
if (channel === 'phone' && !user.phone) {
    throw new AppError(400, 'NO_PHONE', 'Tu cuenta no tiene teléfono. Añádelo en tu perfil')
}
if (channel === 'email' ? user.emailVerified !== false : user.phoneVerified !== false) {
    throw new AppError(409, 'ALREADY_VERIFIED', channel === 'email' ? 'Tu correo ya está verificado' : 'Tu teléfono ya está verificado')
}
await sendVerificationCode(user, channel)
res.json({ data: { sent: true, channel } })
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

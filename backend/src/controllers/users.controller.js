import { User } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

// PATCH /api/users/me → el usuario edita su propio perfil.
// Si cambia el correo o el teléfono, queda sin verificar (se verifica de nuevo en /verificar).
export async function updateMe(req, res) {
  const { email, phone } = req.body
  if (email && email !== req.user.email && (await User.exists({ email }))) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email ya está registrado')
  }

  const user = await User.findById(req.user._id).select('+verification')
  const emailChanged = email !== undefined && email !== user.email
  const phoneChanged = phone !== undefined && phone !== (user.phone ?? '')

  Object.assign(user, req.body)
  if (emailChanged) user.emailVerified = false
  if (phoneChanged) user.phoneVerified = phone ? false : undefined
  await user.save()

  res.json({ data: user })
}

// GET /api/users → lista de usuarios (solo ADMIN)
export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 })
  res.json({ data: users })
}
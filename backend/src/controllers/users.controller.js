import { User } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

// PATCH /api/users/me → el usuario edita su propio perfil
export async function updateMe(req, res) {
  const { email } = req.body
  if (email && email !== req.user.email && (await User.exists({ email }))) {
    throw new AppError(409, 'EMAIL_TAKEN', 'Este email ya está registrado')
  }

  Object.assign(req.user, req.body)
  await req.user.save()
  res.json({ data: req.user })
}

// GET /api/users → lista de usuarios (solo ADMIN)
export async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 })
  res.json({ data: users })
}
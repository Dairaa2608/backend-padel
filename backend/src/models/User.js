import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false → la contraseña nunca se devuelve en las consultas salvo que se pida explícitamente
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  },
  { timestamps: true }, // añade createdAt y updatedAt automáticamente
)

export const User = mongoose.model('User', userSchema)

import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false → la contraseña nunca se devuelve en las consultas salvo que se pida explícitamente
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
    // Verificación de la cuenta con un código (ver utils/verification.js).
    // Las cuentas creadas antes de existir la verificación no tienen el campo: cuentan como verificadas.
    emailVerified: Boolean,
    phoneVerified: Boolean,
    // Códigos pendientes, cifrados (nunca se devuelven al navegador)
    verification: {
      type: {
        email: { codeHash: String, expiresAt: Date, attempts: Number, sentAt: Date },
        phone: { codeHash: String, expiresAt: Date, attempts: Number, sentAt: Date },
      },
      select: false,
      _id: false,
    },
  },
  {
    timestamps: true, // añade createdAt y updatedAt automáticamente
    toJSON: {
      // Al enviar un usuario como JSON, nunca se incluye la contraseña cifrada
      transform(doc, ret) {
        delete ret.passwordHash
        delete ret.verification
        delete ret.__v
        // Lo que no tiene el campo cuenta como verificado
        ret.emailVerified = doc.emailVerified !== false
        ret.phoneVerified = doc.phone ? doc.phoneVerified !== false : false
        // La cuenta queda verificada con el correo O con el teléfono (como en Gmail)
        ret.accountVerified = isAccountVerified(doc)
        return ret
      },
    },
  },
)

// ¿Confirmó la cuenta? Basta con el correo o con el teléfono.
// Las cuentas antiguas (sin el campo emailVerified) cuentan como verificadas.
export function isAccountVerified(user) {
  return user.emailVerified !== false || user.phoneVerified === true
}

export const User = mongoose.model('User', userSchema)
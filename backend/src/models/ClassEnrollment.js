import mongoose from 'mongoose'

const classEnrollmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassProgram', required: true },
    group: { type: mongoose.Schema.Types.ObjectId, required: true }, // _id del grupo dentro del programa
    schedule: { type: String, required: true }, // uno de program.scheduleSlots
    level: { type: String, required: true },
    birthDate: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
  },
  { timestamps: true },
)

// Un usuario no puede inscribirse dos veces en el mismo grupo
// (si cancela y vuelve, se reactiva la inscripción existente)
classEnrollmentSchema.index({ user: 1, group: 1 }, { unique: true })
classEnrollmentSchema.index({ group: 1, status: 1 }) // contar cupos ocupados

export const ClassEnrollment = mongoose.model('ClassEnrollment', classEnrollmentSchema)

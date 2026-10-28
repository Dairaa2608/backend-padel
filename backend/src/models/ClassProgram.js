import mongoose from 'mongoose'

// El profesor y los grupos van DENTRO del programa (documentos embebidos):
// siempre se muestran juntos, así que se leen con una sola consulta.
const coachSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    title: String,
    photoUrl: String,
  },
  { _id: false },
)

const groupSchema = new mongoose.Schema({
  minAge: { type: Number, required: true, min: 0 },
  maxAge: { type: Number, default: null }, // null = "en adelante"
  coach: { type: coachSchema, required: true },
  monthlyPrice: { type: Number, required: true, min: 1 },
  capacity: { type: Number, required: true, min: 1 },
})

const classProgramSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: { type: String, required: true }, // Regular, Intensiva, Verano, Fin de Semana
    description: { type: String, required: true },
    daysOfWeek: { type: String, required: true },
    hoursPerWeek: { type: Number, required: true },
    sessionHours: { type: Number, required: true },
    scheduleSlots: [String], // horarios que puede elegir el alumno
    color: String,
    imageUrl: String,
    active: { type: Boolean, default: true },
    groups: [groupSchema],
  },
  { timestamps: true },
)

export const ClassProgram = mongoose.model('ClassProgram', classProgramSchema)

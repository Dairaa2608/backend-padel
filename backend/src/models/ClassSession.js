import mongoose from 'mongoose'

// Contador de personas con clase suelta o de cortesía en un grupo, un día concreto.
// Los inscritos mensuales se cuentan aparte (enrolledCount del grupo).
const classSessionSchema = new mongoose.Schema({
  group: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  booked: { type: Number, default: 0, min: 0 },
})

classSessionSchema.index({ group: 1, date: 1 }, { unique: true })

export const ClassSession = mongoose.model('ClassSession', classSessionSchema)
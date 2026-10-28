import mongoose from 'mongoose'

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    category: { type: String, required: true }, // Profesional, Amateur, Comunidad
    level: { type: String, required: true },
    location: { type: String, required: true },
    fee: { type: Number, required: true, min: 0 },
    prize: { type: Number, required: true, min: 0 },
    capacity: { type: Number, required: true, min: 1 },
    imageUrl: String,
  },
  { timestamps: true },
)

tournamentSchema.pre('validate', function () {
  if (this.endDate < this.startDate) {
    this.invalidate('endDate', 'La fecha de fin no puede ser anterior a la de inicio')
  }
})

export const Tournament = mongoose.model('Tournament', tournamentSchema)

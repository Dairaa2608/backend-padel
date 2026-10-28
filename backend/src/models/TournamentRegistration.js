import mongoose from 'mongoose'

const tournamentRegistrationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    level: { type: String, required: true },
    partnerName: String, // pendiente: ¿inscripción por parejas?
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
  },
  { timestamps: true },
)

tournamentRegistrationSchema.index({ user: 1, tournament: 1 }, { unique: true })
tournamentRegistrationSchema.index({ tournament: 1, status: 1 }) // contar cupos ocupados

export const TournamentRegistration = mongoose.model('TournamentRegistration', tournamentRegistrationSchema)

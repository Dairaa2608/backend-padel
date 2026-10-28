import mongoose from 'mongoose'

export const OPENING_HOUR = 7
export const CLOSING_HOUR = 23

const reservationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    court: { type: mongoose.Schema.Types.ObjectId, ref: 'Court', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // "2026-11-15"
    startHour: { type: Number, required: true, min: OPENING_HOUR, max: CLOSING_HOUR - 1 },
    endHour: { type: Number, required: true, max: CLOSING_HOUR },
    // Horas que ocupa la reserva: de 18 a 20 → [18, 19]. Se calcula sola (ver abajo).
    slots: [Number],
    totalPrice: { type: Number, required: true, min: 0 }, // se copia al reservar: no cambia si sube el precio
    status: { type: String, enum: ['CONFIRMED', 'CANCELLED'], default: 'CONFIRMED' },
  },
  { timestamps: true },
)

reservationSchema.pre('validate', function () {
  if (this.endHour <= this.startHour) {
    this.invalidate('endHour', 'La hora de fin debe ser posterior a la de inicio')
  }
  this.slots = []
  for (let h = this.startHour; h < this.endHour; h++) this.slots.push(h)
})

// Evita reservas dobles: no puede haber dos reservas CONFIRMADAS de la misma cancha
// el mismo día que compartan una hora. Lo garantiza MongoDB, aunque lleguen dos peticiones a la vez.
reservationSchema.index(
  { court: 1, date: 1, slots: 1 },
  { unique: true, partialFilterExpression: { status: 'CONFIRMED' } },
)
reservationSchema.index({ user: 1, date: -1 }) // "mis reservas"

export const Reservation = mongoose.model('Reservation', reservationSchema)

import mongoose from 'mongoose'

// Multas: por cancelar tarde una reserva (automática) o puestas por el administrador.
// Mientras haya una multa PENDING, la persona no puede reservar, inscribirse ni comprar.
const fineSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, enum: ['LATE_CANCELLATION', 'MANUAL'], required: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 }, // pesos colombianos
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }, // solo en cancelación tardía
    status: { type: String, enum: ['PENDING', 'PAID', 'WAIVED'], default: 'PENDING' }, // WAIVED = anulada por el admin
    paymentMethod: { type: String, enum: ['CARD', 'PSE', 'CASH'] },
    paidAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin que la puso (multa manual)
  },
  { timestamps: true },
)

fineSchema.index({ user: 1, status: 1 })
// Una reserva cancelada tarde genera como mucho UNA multa
fineSchema.index({ reservation: 1 }, { unique: true, partialFilterExpression: { reservation: { $exists: true } } })

export const Fine = mongoose.model('Fine', fineSchema)

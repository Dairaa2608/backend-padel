import mongoose from 'mongoose'

// Una clase en una fecha concreta: suelta (pagada) o de cortesía (gratis)
const classBookingSchema = new mongoose.Schema(
{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['SINGLE', 'COURTESY'], required: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassProgram', required: true },
    group: { type: mongoose.Schema.Types.ObjectId, required: true }, // _id del grupo dentro del programa
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    schedule: { type: String, required: true }, // uno de program.scheduleSlots
    partySize: { type: Number, enum: [1, 2, 4], required: true },
    price: { type: Number, required: true, min: 0 }, // 0 en las de cortesía
    // Cédula cifrada (solo en las de cortesía): permite comprobar si ya se usó sin poder leerla
    cedulaHash: { type: String, select: false },
    status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' },
},
{
    timestamps: true,
    toJSON: {
      // La huella de la cédula nunca sale del servidor
    transform(doc, ret) {
        delete ret.cedulaHash
        delete ret.__v
        return ret
    },
    },
    },
)

// Una sola cortesía activa por CÉDULA y otra por CUENTA. Lo garantiza MongoDB,
// aunque lleguen dos solicitudes a la vez. Si se cancela antes de la clase, se puede volver a pedir.
const activeCourtesy = { type: 'COURTESY', status: 'ACTIVE' }
classBookingSchema.index({ cedulaHash: 1 }, { unique: true, partialFilterExpression: activeCourtesy })
classBookingSchema.index({ user: 1, type: 1 }, { unique: true, partialFilterExpression: activeCourtesy })
classBookingSchema.index({ user: 1, date: -1 }) // "mis clases"

export const ClassBooking = mongoose.model('ClassBooking', classBookingSchema)
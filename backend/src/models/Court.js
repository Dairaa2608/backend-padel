import mongoose from 'mongoose'

const courtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['INDOOR', 'OUTDOOR'], required: true },
    pricePerHour: { type: Number, required: true, min: 1 }, // pesos colombianos, sin decimales
    description: { type: String, required: true },
    features: [String],
    imageUrl: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Court = mongoose.model('Court', courtSchema)

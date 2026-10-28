import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 1 },
    stock: { type: Number, default: 0, min: 0 },
    badge: String, // "Nuevo", "Oferta", "Destacado"
    imageUrl: String,
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Product = mongoose.model('Product', productSchema)

import mongoose from 'mongoose'

// Los productos comprados van DENTRO del pedido, con el nombre y el precio
// del momento de la compra: si mañana cambia el precio, el pedido no se altera.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: {
      type: [orderItemSchema],
      validate: { validator: (items) => items.length > 0, message: 'El pedido debe tener al menos un producto' },
    },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'PAID', 'CANCELLED'], default: 'PENDING' },
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, createdAt: -1 })

export const Order = mongoose.model('Order', orderSchema)

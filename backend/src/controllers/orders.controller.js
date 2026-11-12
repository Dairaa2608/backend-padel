import { Product, Order } from '../models/index.js'
import { AppError } from '../utils/AppError.js'
import { SHIPPING_COST, FREE_SHIPPING_FROM } from '../schemas/order.schemas.js'

// Devuelve las unidades al inventario (si el pedido no se pudo completar)
const restock = (reserved) =>
  Promise.all(reserved.map(({ product, quantity }) => Product.updateOne({ _id: product }, { $inc: { stock: quantity } })))

// POST /api/orders → crea un pedido y descuenta el stock
export async function createOrder(req, res) {
  const { address, phone, paymentMethod } = req.body

  // Si el mismo producto viene dos veces, se suman las cantidades
  const quantities = new Map()
  for (const { productId, quantity } of req.body.items) {
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity)
  }

  // Se descuenta el stock producto por producto, en un solo paso cada uno:
  // MongoDB solo resta si quedan suficientes unidades (así dos compras a la vez no venden de más).
  const reserved = []
  for (const [productId, quantity] of quantities) {
    const product = await Product.findOneAndUpdate(
      { _id: productId, active: true, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
    )
    if (!product) {
      await restock(reserved)
      const current = await Product.findById(productId)
      if (!current || !current.active) {
        throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Uno de los productos ya no está disponible')
      }
      const left = current.stock === 0 ? 'está agotado' : `solo quedan ${current.stock} unidades`
      throw new AppError(409, 'OUT_OF_STOCK', `"${current.name}" ${left}`)
    }
    // El nombre y el precio se copian del producto en la base de datos, nunca del navegador
    reserved.push({ product: product._id, name: product.name, quantity, unitPrice: product.price })
  }

  const subtotal = reserved.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST

  try {
    const order = await Order.create({
      user: req.user._id,
      items: reserved,
      subtotal,
      shipping,
      total: subtotal + shipping,
      address,
      phone,
      paymentMethod,
      // Pago simulado: tarjeta y PSE quedan pagados; contraentrega se paga al recibir
      status: paymentMethod === 'CASH' ? 'PENDING' : 'PAID',
    })
    res.status(201).json({ data: order })
  } catch (error) {
    await restock(reserved)
    throw error
  }
}

// GET /api/orders/me → mis pedidos, del más reciente al más antiguo
export async function listMyOrders(req, res) {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.json({ data: orders })
}

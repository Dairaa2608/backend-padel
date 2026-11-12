import { Product } from '../models/index.js'
import { AppError } from '../utils/AppError.js'

// GET /api/products → productos activos con su stock (público)
export async function listProducts(req, res) {
  const products = await Product.find({ active: true }).sort({ createdAt: 1 })
  res.json({ data: products })
}

// GET /api/products/:id → un producto
export async function getProduct(req, res) {
  const product = await Product.findById(req.params.id)
  if (!product || !product.active) {
    throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Producto no encontrado')
  }
  res.json({ data: product })
}

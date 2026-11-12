import { z } from 'zod'

// Envío: $15.000, gratis desde $300.000 (lo calcula siempre el servidor)
export const SHIPPING_COST = 15000
export const FREE_SHIPPING_FROM = 300000
export const PAYMENT_METHODS = ['CARD', 'PSE', 'CASH']

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'El producto no es válido')

// El navegador solo envía QUÉ compra y CUÁNTO. Los precios y el total los pone la API.
export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        quantity: z.coerce.number().int('La cantidad debe ser un número entero').min(1, 'La cantidad mínima es 1').max(20, 'Máximo 20 unidades por producto'),
      }),
    )
    .min(1, 'El carrito está vacío')
    .max(30, 'Demasiados productos en un solo pedido'),
  address: z.string().trim().min(5, 'Escribe la dirección de entrega completa').max(200),
  phone: z.string().trim().regex(/^[0-9+\s-]{7,20}$/, 'El teléfono no es válido'),
  paymentMethod: z.enum(PAYMENT_METHODS, 'Elige un método de pago'),
})

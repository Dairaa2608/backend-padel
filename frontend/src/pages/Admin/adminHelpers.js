// Textos y formatos que usa el panel de administrador.
import { formatHour } from '../../utils/courts'

export const formatMoney = (n) => `$${Number(n ?? 0).toLocaleString('es-CO')}`

export const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

// "2026-12-12" → "12 dic 2026" (sin problemas de zona horaria)
export const formatDay = (day) => (day ? formatDate(`${day}T12:00:00`) : '-')

export const hourRange = (start, end) => `${formatHour(start)} - ${formatHour(end)}`

// Número corto y fácil de leer para un pedido
export const orderNumber = (order) => `#${String(order._id).slice(-6).toUpperCase()}`

export const COURT_TYPES = { INDOOR: 'Interior', OUTDOOR: 'Exterior' }
export const ROLES = { USER: 'Cliente', ADMIN: 'Administrador' }
export const PAYMENT_METHODS = { CARD: 'Tarjeta', PSE: 'PSE', CASH: 'Contraentrega' }
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

// Estado → [texto, clase de color de Admin.css]
export const RESERVATION_STATUS = { CONFIRMED: ['Confirmada', 'confirmada'], CANCELLED: ['Cancelada', 'cancelada'] }
export const ORDER_STATUS = {
  PENDING: ['Pendiente', 'pendiente'],
  PAID: ['Pagado', 'pagado'],
  CANCELLED: ['Cancelado', 'cancelada'],
}

export const ageRange = (group) => (group.maxAge == null ? `${group.minAge}+ años` : `${group.minAge} - ${group.maxAge} años`)

// "a, b , c" → ['a', 'b', 'c']
export const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean)

// ¿Coincide el texto buscado con alguno de estos valores?
export const matches = (search, ...values) => {
  const q = search.trim().toLowerCase()
  return !q || values.some((v) => String(v ?? '').toLowerCase().includes(q))
}

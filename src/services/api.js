import imgPala from '../img/adidas-pala-de-padel-cross-it-light-3.4-2025_1.webp'
import imgPelotas from '../img/tubo-de-3-bolas-de-padel-presurizadas-kuikma-pb-club.jpg'
import imgMuñequera from '../img/munequera-y-cinturon.webp'
import imgPaletero from '../img/paletero pro.webp'
import imgCamiseta from '../img/camisa dry fit.jpg'
import imgGrip from '../img/grip antidezlizante.jpg'

/* ══════════════════════════════════════════════════
   MOCK DATABASE
   ══════════════════════════════════════════════════ */

const _products = [
  { id: 1, name: 'Pala Profesional Adidas',    desc: 'Pala de carbono para jugadores avanzados. Máximo control y potencia en cada golpe.', price: 280000, badge: 'Nuevo',     badgeColor: '#0a7c5c', img: imgPala },
  { id: 2, name: 'Pack de Pelotas Oficiales',  desc: 'Pack con 3 pelotas de pádel homologadas para competición. Duración prolongada.',            price:  35000, badge: 'Oferta',    badgeColor: '#e53935', img: imgPelotas },
  { id: 3, name: 'Muñequera + Cinturón',       desc: 'Set de muñequeras técnicas y cinturón lumbar ajustable para máxima sujeción.',             price:  68000, badge: null,       badgeColor: null,      img: imgMuñequera },
  { id: 4, name: 'Paletero Deportivo Wilson',  desc: 'Bolsa de palas amplia con compartimentos laterales y bolsillo interior.',                 price: 120000, badge: 'Destacado', badgeColor: '#1565c0', img: imgPaletero },
  { id: 5, name: 'Camiseta Técnica Dry-Fit',   desc: 'Camiseta transpirable de alto rendimiento. Diseño exclusivo de PadelZone.',              price:  55000, badge: null,       badgeColor: null,      img: imgCamiseta },
  { id: 6, name: 'Grip Antideslizante Premium',desc: 'Pack de 3 grips antideslizantes de alta adherencia. Reducen la vibración.',               price:  22000, badge: 'Agotado',  badgeColor: '#757575', img: imgGrip },
]

const _clases = [
  { id: 1, nombre: 'Clases Regulares',  desc: 'Entrenamiento semanal todos los niveles.', precio: 180000, modalidad: 'Pago mensual' },
  { id: 2, nombre: 'Clases Intensivas', desc: 'Programa de mejora acelerada en 8 semanas.', precio: 280000, modalidad: 'Programa completo' },
  { id: 3, nombre: 'Clases para Niños',desc: 'Iniciación para menores de 12 años.', precio: 120000, modalidad: 'Pago mensual' },
  { id: 4, nombre: 'Torneo de Verano', desc: 'Torneo estacional con premios.', precio: 80000, modalidad: 'Por inscripción' },
]

const _torneos = [
  { id: 1, nombre: 'Torneo Amateur', fecha: '2026-06-15', lugar: 'PadelZone Central', categoria: 'Amateur' },
  { id: 2, nombre: 'Copa PadelZone', fecha: '2026-07-20', lugar: 'PadelZone Premium', categoria: 'Profesional' },
  { id: 3, nombre: 'Torneo Express', fecha: '2026-08-10', lugar: 'PadelZone Express', categoria: 'Mixto' },
]

// Carrito persistido en localStorage
let _cart = []
const CART_KEY = 'padelzone_cart'

const loadCart = () => {
  try { _cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]') } catch { _cart = [] }
}
const saveCart = () => {
  localStorage.setItem(CART_KEY, JSON.stringify(_cart))
}

/* ══════════════════════════════════════════════════
   API REAL (backend Express + MongoDB)
   ══════════════════════════════════════════════════ */

// Dirección de la API. Se puede cambiar con VITE_API_URL en el archivo .env del frontend.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Hace una petición a la API y devuelve el campo `data` de la respuesta.
 * Si la API responde con error, lanza un Error con el mensaje y el código HTTP.
 */
async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // Envía y recibe la cookie de sesión (el "token") en cada petición
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw Object.assign(new Error('No se pudo conectar con el servidor. ¿Está encendida la API?'), { status: 0 })
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    // Si la API explica qué campo está mal, se muestra ese motivo concreto
    const message = body?.error?.details?.[0]?.message || body?.error?.message || 'Error inesperado del servidor'
    throw Object.assign(new Error(message), { status: response.status, code: body?.error?.code })
  }
  return body.data
}

/* ══════════════════════════════════════════════════
   HELPERS (datos simulados)
   ══════════════════════════════════════════════════ */

function _delay(ms = 350) {
  return new Promise((r) => setTimeout(r, ms + Math.random() * 250))
}

function _page(total, page, limit) {
  const start = (page - 1) * limit
  return { data: total.slice(start, start + limit), total: total.length, page, limit }
}

function _status(error, fallback = 500) {
  return error?.status || fallback
}

/* ══════════════════════════════════════════════════
   API CLASS
   ══════════════════════════════════════════════════ */
//   Todos los métodos devuelven Promise y simulan latencia de red

class Api {

  /* ── PRODUCTOS ──────────────────────────────── */

  /** GET /api/products — lista todos los productos */
  getProducts() {
    return _delay(350).then(() => _products.map((p) => ({ ...p })))
  }

  /** GET /api/products/:id — producto por id */
  getProductById(id) {
    return _delay(200).then(() => {
      const p = _products.find((x) => x.id === id)
      if (!p) throw Object.assign(new Error('Producto no encontrado'), { status: 404 })
      return { ...p }
    })
  }

  /* ── CARRITO ────────────────────────────────── */

  /** GET /api/cart — devuelve el carrito con datos de producto */
  getCart() {
    return _delay(200).then(() => {
      loadCart()
      return _cart.map(({ productId, qty }) => {
        const p = _products.find((x) => x.id === productId)
        return p ? { ...p, qty } : null
      }).filter(Boolean)
    })
  }

  /** POST /api/cart — agrega o incrementa un producto */
  addToCart({ productId, qty = 1 }) {
    return _delay(200).then(() => {
      loadCart()
      const idx = _cart.findIndex((c) => c.productId === productId)
      if (idx >= 0) {
        _cart[idx].qty += qty
      } else {
        _cart.push({ productId, qty })
      }
      saveCart()
      return _cart.map(({ productId: pid, qty: q }) => {
        const p = _products.find((x) => x.id === pid)
        return p ? { ...p, qty: q } : null
      }).filter(Boolean)
    })
  }

  /** PUT /api/cart/:id — actualiza cantidad (qty === 0 elimina el producto) */
  updateQty({ productId, qty }) {
    return _delay(150).then(() => {
      loadCart()
      const idx = _cart.findIndex((c) => c.productId === productId)
      if (idx >= 0) {
        if (qty <= 0) {
          _cart.splice(idx, 1)
        } else {
          _cart[idx].qty = qty
        }
      }
      saveCart()
      return _cart.map(({ productId: pid, qty: q }) => {
        const p = _products.find((x) => x.id === pid)
        return p ? { ...p, qty: q } : null
      }).filter(Boolean)
    })
  }

  /** DELETE /api/cart/:id — elimina un producto del carrito */
  removeFromCart(productId) {
    return _delay(150).then(() => {
      loadCart()
      _cart = _cart.filter((c) => c.productId !== productId)
      saveCart()
      return _cart.map(({ productId: pid, qty: q }) => {
        const p = _products.find((x) => x.id === pid)
        return p ? { ...p, qty: q } : null
      }).filter(Boolean)
    })
  }

  /** DELETE /api/cart — vacía el carrito completamente */
  clearCart() {
    return _delay(150).then(() => {
      _cart = []
      saveCart()
      return []
    })
  }

  /* ── CHECKOUT ──────────────────────────────── */

  /**
   * POST /api/checkout
   * @param {{items:Array,shipping:number,method:string}}
   * @returns {Promise<{orderId:string,status:string,total:number,createdAt:string}>}
   */
  createOrder({ items, shipping = 0, method = 'card' }) {
    return _delay(1200).then(() => {
      const orderId = `PZ-${Date.now().toString(36).toUpperCase()}`
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
      const total = subtotal + shipping
      _cart = []
      saveCart()
      return { orderId, status: 'confirmed', method, total, subtotal, shipping, createdAt: new Date().toISOString() }
    })
  }

  /* ── CANCHAS (API real) ─────────────────── */

  /** GET /api/courts — lista de canchas activas */
  getCourts() {
    return request('/courts')
  }

  /** GET /api/courts/:id — una cancha */
  getCourtById(id) {
    return request(`/courts/${id}`)
  }

  /* ── CLASES ─────────────────────────────── */

  /**
   * GET /api/classes
   * @param {{page?:number,limit?:number}}
   * @returns {Promise<{data:Array,total:number,page:number,limit:number}>}
   */
  getClasses(params = {}) {
    return _delay(350).then(() => {
      const { page = 1, limit = 10 } = params
      return _page(_clases, page, limit)
    })
  }

  /* ── TORNEOS ───────────────────────────── */

  /**
   * GET /api/tournaments
   * @param {{page?:number,limit?:number}}
   * @returns {Promise<{data:Array,total:number,page:number,limit:number}>}
   */
  getTournaments(params = {}) {
    return _delay(350).then(() => {
      const { page = 1, limit = 10 } = params
      return _page(_torneos, page, limit)
    })
  }

  /* ── AUTH (API real) ─────────────────── */

  /** POST /api/auth/register — crea la cuenta e inicia sesión */
  register({ name, email, password, phone }) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone: phone || undefined }),
    })
  }

  /** POST /api/auth/login — inicia sesión (la API guarda el token en una cookie) */
  login({ email, password }) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  }

  /** POST /api/auth/logout — cierra la sesión */
  logout() {
    return request('/auth/logout', { method: 'POST' })
  }

  /** GET /api/auth/me — usuario de la sesión actual (error 401 si no hay sesión) */
  me() {
    return request('/auth/me')
  }
}

/* ══════════════════════════════════════════════════
    EXPORT
   ══════════════════════════════════════════════════ */

export const api = new Api()
export default api
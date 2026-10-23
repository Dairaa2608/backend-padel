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

const _canchas = [
  { id: 1, nombre: 'Central',     precio_hora: 120000, disponible: true,  tipo: 'Profesional' },
  { id: 2, nombre: 'Premium',     precio_hora: 160000, disponible: true,  tipo: 'Premium' },
  { id: 3, nombre: 'Recreativa',  precio_hora: 100000, disponible: true,  tipo: 'Recreativa' },
  { id: 4, nombre: 'Profesional', precio_hora: 180000, disponible: false, tipo: 'Profesional' },
  { id: 5, nombre: 'Express',     precio_hora:  90000, disponible: true,  tipo: 'Express' },
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
   HELPERS
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

  /* ── CANCHAS ───────────────────────────────── */

  /**
   * GET /api/courts
   * @param {{page?:number,limit?:number}}
   * @returns {Promise<{data:Array,total:number,page:number,limit:number}>}
   */
  getCourts(params = {}) {
    return _delay(400).then(() => {
      const { page = 1, limit = 10 } = params
      return _page(_canchas, page, limit)
    })
  }

  /**
   * GET /api/courts/:id
   * @param {{id:number}}
   * @returns {Promise<Object>}
   */
  getCourtById({ id }) {
    return _delay(200).then(() => {
      const c = _canchas.find((x) => x.id === id)
      if (!c) throw Object.assign(new Error('Cancha no encontrada'), { status: 404 })
      return { ...c }
    })
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

  /* ── AUTH ──────────────────────────────── */

  /**
   * POST /api/auth/login
   * @param {{email:string,password:string}}
   * @returns {Promise<{token:string,user:{id:number,nombre:string,email:string}}>}
   */
  async login({ email, password }) {
    await _delay(600)
    if (!email || !password) {
      throw Object.assign(new Error('Email y contraseña requeridos'), { status: 400 })
    }
    if (password.length < 4) {
      throw Object.assign(new Error('Credenciales inválidas'), { status: 401 })
    }
    return {
      token: `mock-jwt-${Date.now().toString(36)}`,
      user: { id: 1, nombre: 'Jugador Demo', email },
    }
  }

  /**
   * GET /api/profile
   * @param {string} token — token del usuario (no se valida en mock)
   * @returns {Promise<{id:number,nombre:string,email:string,telefono:string,membresia:string}>}
   */
  getProfile(token) {
    return _delay(250).then(() => ({
      id: 1, nombre: 'Jugador Demo', email: 'demo@padelzone.com',
      telefono: '+57 300 000 0000', membresia: 'VIP',
    }))
  }
}

/* ══════════════════════════════════════════════════
   EXPORT
   ══════════════════════════════════════════════════ */

export const api = new Api()
export default api

/* ══════════════════════════════════════════════════
   CARRITO (se guarda en el navegador)
   ══════════════════════════════════════════════════ */
// El carrito es solo una lista de { productId, qty } en localStorage.
// Los precios y el stock siempre vienen de la API; el total final lo calcula el servidor.

const CART_KEY = 'padelzone_cart'

const loadCart = () => {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    // Los carritos antiguos (de los datos de prueba) usaban ids numéricos: se descartan
    return Array.isArray(cart) ? cart.filter((c) => typeof c.productId === 'string' && c.qty > 0) : []
  } catch {
    return []
  }
}
const saveCart = (cart) => {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  return cart
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
   API CLASS
   ══════════════════════════════════════════════════ */

class Api {

  /* ── PRODUCTOS (API real) ──────────────── */

  /** GET /api/products — productos activos con su stock */
  getProducts() {
    return request('/products')
  }

  /** GET /api/products/:id — un producto */
  getProductById(id) {
    return request(`/products/${id}`)
  }

  /* ── CARRITO (en el navegador) ───────────── */

  /** Devuelve [{ productId, qty }] */
  getCart() {
    return loadCart()
  }

  /** Agrega un producto o suma una unidad más */
  addToCart({ productId, qty = 1 }) {
    const cart = loadCart()
    const item = cart.find((c) => c.productId === productId)
    if (item) item.qty += qty
    else cart.push({ productId, qty })
    return saveCart(cart)
  }

  /** Cambia la cantidad (0 o menos lo quita del carrito) */
  updateQty({ productId, qty }) {
    const cart = loadCart()
      .map((c) => (c.productId === productId ? { ...c, qty } : c))
      .filter((c) => c.qty > 0)
    return saveCart(cart)
  }

  /** Quita un producto del carrito */
  removeFromCart(productId) {
    return saveCart(loadCart().filter((c) => c.productId !== productId))
  }

  /** Vacía el carrito */
  clearCart() {
    return saveCart([])
  }

  /* ── PEDIDOS (API real) ──────────────────── */

  /**
   * POST /api/orders — compra lo que hay en el carrito.
   * Solo se envía qué productos y cuántos: la API pone los precios, el envío y el total,
   * y descuenta el stock. El pago es simulado (no se envían datos de tarjeta).
   */
  createOrder({ items, address, phone, paymentMethod }) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map(({ productId, qty }) => ({ productId, quantity: qty })),
        address,
        phone,
        paymentMethod,
      }),
    })
  }

  /** GET /api/orders/me — mis pedidos */
  getMyOrders() {
    return request('/orders/me')
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


  /* ── RESERVAS (API real) ────────────────── */

  /** GET /api/courts/:id/availability?date= — horas libres y ocupadas de una cancha */
  getAvailability(courtId, date) {
    return request(`/courts/${courtId}/availability?date=${date}`)
  }

  /** POST /api/reservations — reservar (el precio lo calcula la API) */
  createReservation({ courtId, date, startHour, endHour }) {
    return request('/reservations', {
      method: 'POST',
      body: JSON.stringify({ courtId, date, startHour, endHour }),
    })
  }

  /** GET /api/reservations/me — mis reservas */
  getMyReservations() {
    return request('/reservations/me')
  }

  /** PATCH /api/reservations/:id/cancel — cancelar una reserva */
  cancelReservation(id) {
    return request(`/reservations/${id}/cancel`, { method: 'PATCH' })
  }
  /* ── CLASES (API real) ─────────────────── */

  /** GET /api/classes — programas, grupos con cupos libres y precios de la clase suelta */
  getClasses() {
    return request('/classes')
  }

  /** GET /api/classes/:programId/groups/:groupId/dates — próximos días con clase y sus cupos */
  getClassDates(programId, groupId) {
    return request(`/classes/${programId}/groups/${groupId}/dates`)
  }

  /** POST /api/classes/enrollments — inscripción mensual (siempre individual) */
  enrollInClass({ programId, groupId, schedule, level, birthDate }) {
    return request('/classes/enrollments', {
      method: 'POST',
      body: JSON.stringify({ programId, groupId, schedule, level, birthDate }),
    })
  }

  /** POST /api/classes/bookings — clase suelta o de cortesía (1, 2 o 4 personas) */
  bookClass({ type, programId, groupId, date, schedule, partySize, cedula }) {
    return request('/classes/bookings', {
      method: 'POST',
      body: JSON.stringify({ type, programId, groupId, date, schedule, partySize, cedula }),
    })
  }

  /** GET — mis inscripciones mensuales y mis clases sueltas/cortesía */
  getMyClassEnrollments() {
    return request('/classes/enrollments/me')
  }

  getMyClassBookings() {
    return request('/classes/bookings/me')
  }

  /** PATCH — cancelar una inscripción mensual o una clase */
  cancelClassEnrollment(id) {
    return request(`/classes/enrollments/${id}/cancel`, { method: 'PATCH' })
  }

  cancelClassBooking(id) {
    return request(`/classes/bookings/${id}/cancel`, { method: 'PATCH' })
  }

  /* ── TORNEOS (API real) ─────────────────── */

  /** GET /api/tournaments — torneos con sus cupos libres */
  getTournaments() {
    return request('/tournaments')
  }

  /** GET /api/tournaments/registrations/me — mis inscripciones activas */
  getMyTournamentRegistrations() {
    return request('/tournaments/registrations/me')
  }

  /** POST /api/tournaments/:id/register — inscribirse (la API comprueba los cupos) */
  registerToTournament(tournamentId, { level }) {
    return request(`/tournaments/${tournamentId}/register`, {
      method: 'POST',
      body: JSON.stringify({ level }),
    })
  }

  /** PATCH /api/tournaments/registrations/:id/cancel — cancelar mi inscripción */
  cancelTournamentRegistration(registrationId) {
    return request(`/tournaments/registrations/${registrationId}/cancel`, { method: 'PATCH' })
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
  /** PATCH /api/users/me — edita el perfil del usuario con sesión */
  updateProfile({ name, email, phone }) {
    return request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, email, phone: phone || undefined }),
    })
  }

}

/* ══════════════════════════════════════════════════
    EXPORT
   ══════════════════════════════════════════════════ */

export const api = new Api()
export default api
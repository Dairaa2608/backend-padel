import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Tienda.css'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { toViewProduct } from '../../utils/products'

// Solo para mostrar el total aproximado: el total real lo calcula la API
const SHIPPING = 15000
const FREE_SHIPPING_THRESHOLD = 300000

const PAYMENT_LABELS = { CARD: 'Tarjeta', PSE: 'PSE', CASH: 'Contraentrega' }

function tiendaKey(key, extra = '') {
  return `tienda-${key}${extra}`
}

/* ═══════════════════════
   DEFAULT EXPORT
   ═══════════════════════ */

export default function Tienda() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState(() => api.getCart()) // [{ productId, qty }] guardado en el navegador
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [purchase, setPurchase] = useState(null) // pedido creado por la API

  /* ── Productos (con su stock) desde la API ── */
  const loadProducts = useCallback(() =>
    api.getProducts()
      .then((list) => setProducts(list.map(toViewProduct)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false)), [])

  useEffect(() => { loadProducts() }, [loadProducts])

  /* ── El carrito con los datos del producto (precio y stock actuales) ── */
  const cartItems = cart
    .map(({ productId, qty }) => {
      const product = products.find((p) => p.id === productId)
      return product && !product.outOfStock ? { ...product, qty: Math.min(qty, product.stock) } : null
    })
    .filter(Boolean)

  const showToast = (text) => {
    setToast(text)
    setTimeout(() => setToast(null), 2800)
  }

  /* ── Agregar al carrito (sin pasar del stock) ── */
  const addToCart = (product) => {
    const inCart = cartItems.find((i) => i.id === product.id)?.qty ?? 0
    if (inCart >= product.stock) {
      showToast(`Solo hay ${product.stock} unidades de "${product.name}"`)
      return
    }
    setCart(api.addToCart({ productId: product.id, qty: 1 }))
    showToast(`"${product.name}" agregado al carrito`)
    if (!cartOpen) setCartOpen(true)
  }

  /* ── Eliminar del carrito ── */
  const removeFromCart = (id) => setCart(api.removeFromCart(id))

  /* ── Modificar cantidad ── */
  const changeQty = (id, delta) => {
    const current = cartItems.find((i) => i.id === id)
    if (!current) return
    const newQty = Math.min(current.qty + delta, current.stock)
    setCart(api.updateQty({ productId: id, qty: newQty }))
  }

  /* ── Vaciar carrito ── */
  const clearCart = () => setCart(api.clearCart())

  /* ── Totales (aproximados: la API los vuelve a calcular) ── */
  const subtotal = cartItems.reduce((s, item) => s + item.price * item.qty, 0)
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : cartItems.length ? SHIPPING : 0
  const total = subtotal + shippingCost

  /* ── Checkout: para comprar hay que iniciar sesión ── */
  const handleCheckout = () => {
    setCartOpen(false)
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/tiendas' } })
      return
    }
    setCheckoutOpen(true)
  }

  // Envía el pedido. Si falla (por ejemplo, se agotó un producto), el error se muestra en el formulario.
  const handlePay = async ({ address, phone, method }) => {
    try {
      const order = await api.createOrder({ items: cartItems.map((i) => ({ productId: i.id, qty: i.qty })), address, phone, paymentMethod: method })
      setCart(api.clearCart())
      setCheckoutOpen(false)
      setPurchase(order)
      setTimeout(() => setPurchase(null), 5000)
    } finally {
      // El stock cambió (por esta compra o por la de otra persona): se vuelve a pedir
      loadProducts()
    }
  }

  /* ═══════════════════════
     RENDER
     ═══════════════════════ */

  if (loading) {
    return (
      <section className="tienda-page">
        <div className="tienda-loading">
          <i className="material-icons spinning">refresh</i>
          <p>Cargando productos…</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="tienda-page">
        <div className="tienda-error">
          <i className="material-icons">error_outline</i>
          <p>Error: {error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="tienda-page">
      {toast && <Toast message={toast} />}

      {/* ── Header ── */}
      <div className="tienda-header">
        <div className="tienda-header-content">
          <span className="tienda-eyebrow">PadelZone Store</span>
          <h1>Nuestros Productos</h1>
          <p>Equipamiento oficial para jugar al más alto nivel</p>
        </div>
        <button
          className="cart-badge"
          onClick={() => setCartOpen((v) => !v)}
          aria-label="Abrir carrito"
        >
          <i className="material-icons">shopping_cart</i>
          <span className="cart-count">{cartItems.reduce((s, i) => s + i.qty, 0)}</span>
        </button>
        <div className="tienda-header-bg" />
      </div>

      {/* ── Products grid ── */}
      <div className="tienda-container">
        <div className="tienda-products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              formatPrice={formatPrice}
              onAddToCart={() => addToCart(product)}
            />
          ))}
        </div>
      </div>

      {/* ── Cart drawer ── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        formatPrice={formatPrice}
        subtotal={subtotal}
        shippingCost={shippingCost}
        total={total}
        onRemove={removeFromCart}
        onChangeQty={changeQty}
        onClear={clearCart}
        onCheckout={handleCheckout}
      />

      {/* ── Checkout modal ── */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cartItems}
        formatPrice={formatPrice}
        subtotal={subtotal}
        shippingCost={shippingCost}
        total={total}
        user={user}
        onConfirmPay={handlePay}
      />

      {/* ── Purchase success ── */}
      {purchase && <PurchaseSuccess order={purchase} formatPrice={formatPrice} />}
    </section>
  )
}

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */

function formatPrice(price) {
  return '$' + price.toLocaleString('es-CO')
}

/* ═══════════════════════════════════════
   COMPONENTES INTERNOS
   ═══════════════════════════════════════ */

function ProductCard({ product, formatPrice, onAddToCart }) {
  const isOutOfStock = product.outOfStock

  return (
    <div className={`product-card ${isOutOfStock ? 'product-card--disabled' : ''}`}>
      {product.badge && (
        <span className="product-badge" style={{ backgroundColor: product.badgeColor }}>
          {product.badge}
        </span>
      )}

      <div className="product-image-wrapper">
        <img className="product-image" src={product.img} alt={product.name} />
        <div className="product-image-overlay" />
      </div>

      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.desc}</p>
        {!isOutOfStock && product.stock <= 5 && (
          <small className="product-stock">¡Últimas {product.stock} unidades!</small>
        )}
        <div className="product-footer">
          <span className="product-price">{formatPrice(product.price)} COP</span>
          {isOutOfStock ? (
            <button className="product-btn product-btn--disabled" disabled>
              Agotado
            </button>
          ) : (
            <button className="product-btn" onClick={onAddToCart}>
              Agregar al carrito
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Toast({ message }) {
  return (
    <div className="tienda-toast">
      <i className="material-icons">check_circle</i>
      <span>{message}</span>
    </div>
  )
}

/* ── Cart drawer ────────────────────────── */

function CartDrawer({
  open,
  onClose,
  items,
  formatPrice,
  subtotal,
  shippingCost,
  total,
  onRemove,
  onChangeQty,
  onClear,
  onCheckout,
}) {
  return (
    <>
      <div
        className={`cart-overlay ${open ? 'cart-overlay--visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`cart-drawer ${open ? 'cart-drawer--open' : ''}`}>
        <div className="cart-header">
          <h2>
            <i className="material-icons">shopping_bag</i>
            Carrito
          </h2>
          <button className="cart-close-btn" onClick={onClose} aria-label="Cerrar carrito">
            <i className="material-icons">close</i>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <i className="material-icons">shopping_cart_off</i>
            <p>Tu carrito está vacío</p>
            <button className="product-btn" onClick={onClose}>Seguir comprando</button>
          </div>
        ) : (
          <>
            <ul className="cart-items">
              {items.map((item) => (
                <li className="cart-item" key={tiendaKey(item.id, 'cart')}>
                  <div className="cart-item-image">
                    <img src={item.img} alt={item.name} />
                  </div>
                  <div className="cart-item-right">
                    <div className="cart-item-top-row">
                      <h4>{item.name}</h4>
                      <div className="cart-item-actions">
                        <button
                          className="qty-btn qty-minus"
                          onClick={() => onChangeQty(item.id, -1)}
                          aria-label="Reducir cantidad"
                        >
                          <i className="material-icons">remove</i>
                        </button>
                        <span className="qty-value">{item.qty}</span>
                        <button
                          className="qty-btn qty-plus"
                          disabled={item.qty >= item.stock}
                          title={item.qty >= item.stock ? 'No hay más unidades disponibles' : undefined}
                          onClick={() => onChangeQty(item.id, 1)}
                          aria-label="Aumentar cantidad"
                        >
                          <i className="material-icons">add</i>
                        </button>
                      </div>
                    </div>
                    <div className="cart-item-bottom-row">
                      <span className="cart-item-price">{formatPrice(item.price)} COP</span>
                      <button
                        className="cart-item-remove"
                        onClick={() => onRemove(item.id)}
                        aria-label="Eliminar producto"
                      >
                        <i className="material-icons">delete_outline</i>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Shipping progress bar */}
            {shippingCost > 0 && subtotal > 0 && (
              <div className="cart-shipping-progress">
                <div className="sp-label">
                  <i className="material-icons">local_shipping</i>
                  <span>Faltan <strong>{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} COP</strong> para envío gratis</span>
                </div>
                <div className="sp-track">
                  <div
                    className="sp-fill"
                    style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {shippingCost === 0 && subtotal > 0 && (
              <div className="cart-shipping-progress cart-shipping-progress--done">
                <div className="sp-label">
                  <i className="material-icons">check_circle</i>
                  <span>¡Envío <strong>gratis</strong> aplicado!</span>
                </div>
                <div className="sp-track">
                  <div className="sp-fill sp-fill--full" />
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="cart-totals">
              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)} COP</span>
              </div>
              <div className="cart-total-row">
                <span>Envío</span>
                <span>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost) + ' COP'}</span>
              </div>
              <div className="cart-total-row cart-total-final">
                <span>Total</span>
                <span>{formatPrice(total)} COP</span>
              </div>
            </div>

            <button className="cart-checkout-btn" onClick={onCheckout}>
              Proceder al pago
            </button>
            <button className="cart-clear-btn" onClick={onClear}>
              Vaciar carrito
            </button>
          </>
        )}
      </aside>
    </>
  )
}

/* ── Checkout modal ──────────────────────── */

function CheckoutModal({ open, onClose, items, formatPrice, subtotal, shippingCost, total, user, onConfirmPay }) {
  const [step, setStep] = useState('summary')
  const [form, setForm] = useState({ phone: user?.phone || '', address: '', method: 'CARD' })
  const [payError, setPayError] = useState('')

  if (!open) return null

  const handleNext = () => step === 'summary' && setStep('form')
  const handlePrev = () => setStep('summary')

  const handleClose = () => {
    setStep('summary')
    setPayError('')
    onClose()
  }

  // El pago es simulado: no se piden ni se envían datos de tarjeta
  const handleSubmit = async (e) => {
    e.preventDefault()
    setPayError('')
    setStep('processing')
    try {
      await onConfirmPay(form)
      setStep('summary')
      setForm({ phone: user?.phone || '', address: '', method: 'CARD' })
    } catch (err) {
      setPayError(err.message)
      setStep('form')
    }
  }

  return (
    <div className="checkout-overlay" onClick={handleClose}>
      <section className="checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button className="checkout-close-btn" onClick={handleClose} aria-label="Cerrar">
          <i className="material-icons">close</i>
        </button>

        {/* STEP 1 — Resumen */}
        {step === 'summary' && (
          <>
            <div className="checkout-head">
              <i className="material-icons">receipt_long</i>
              <h2>Resumen del pedido</h2>
            </div>

            <ul className="checkout-items">
              {items.map((item) => (
                <li className="checkout-item" key={tiendaKey(item.id, 'ck')}>
                  <div className="checkout-item-detail">
                    <span className="checkout-item-name">{item.name}</span>
                    <span className="checkout-item-meta">Cantidad: {item.qty} × {formatPrice(item.price)}</span>
                  </div>
                  <span className="checkout-item-total">{formatPrice(item.price * item.qty)} COP</span>
                </li>
              ))}
            </ul>

            <div className="checkout-totals">
              <div className="ck-row"><span>Subtotal</span><span>{formatPrice(subtotal)} COP</span></div>
              <div className="ck-row"><span>Envío{shippingCost === 0 ? ' (gratis)' : ''}</span><span>{formatPrice(shippingCost)} COP</span></div>
              <div className="ck-row ck-row--total"><span>Total</span><span>{formatPrice(total)} COP</span></div>
            </div>

            <button className="cart-checkout-btn" onClick={handleNext}>
              Continuar con la compra
            </button>
          </>
        )}

        {/* STEP 2 — Formulario */}
        {step === 'form' && (
          <>
            <div className="checkout-head">
              <i className="material-icons">person</i>
              <h2>Datos de entrega</h2>
            </div>

            <form className="checkout-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="ck-name">Nombre completo</label>
                <input id="ck-name" type="text" value={user?.name || ''} disabled />
              </div>

              <div className="form-group">
                <label htmlFor="ck-email">Correo electrónico</label>
                <input id="ck-email" type="email" value={user?.email || ''} disabled />
              </div>

              <div className="form-group">
                <label htmlFor="ck-phone">Teléfono</label>
                <input
                  id="ck-phone"
                  type="tel"
                  required
                  placeholder="+57 300 000 0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="ck-address">Dirección de entrega</label>
                <input
                  id="ck-address"
                  type="text"
                  required
                  placeholder="Calle, número, ciudad"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Método de pago</label>
                <div className="payment-methods">
                  {[
                    { value: 'CARD', icon: 'credit_card', label: PAYMENT_LABELS.CARD },
                    { value: 'PSE', icon: 'account_balance', label: PAYMENT_LABELS.PSE },
                    { value: 'CASH', icon: 'payments', label: PAYMENT_LABELS.CASH },
                  ].map((m) => (
                    <label
                      key={m.value}
                      className={`payment-method ${form.method === m.value ? 'payment-method--active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.value}
                        checked={form.method === m.value}
                        onChange={(e) => setForm({ ...form, method: e.target.value })}
                      />
                      <i className="material-icons">{m.icon}</i>
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              <p className="checkout-note">
                <i className="material-icons">info</i>
                Pago simulado: no se realiza ningún cobro y no se piden datos de tarjeta.
              </p>

              {payError && <p className="checkout-error">{payError}</p>}

              <div className="checkout-actions">
                <button type="button" className="btn-secondary" onClick={handlePrev}>
                  Volver
                </button>
                <button type="submit" className="cart-checkout-btn">
                  Pagar {formatPrice(total)} COP
                </button>
              </div>
            </form>
          </>
        )}

        {/* STEP 3 — Procesando */}
        {step === 'processing' && (
          <div className="checkout-processing">
            <div className="spinner-ring" />
            <p>Procesando tu pago…</p>
            <span>Esto puede tardar unos segundos</span>
          </div>
        )}
      </section>
    </div>
  )
}

/* ── Purchase success overlay ───────────── */

function PurchaseSuccess({ order, formatPrice }) {
  const number = order._id.slice(-6).toUpperCase()
  return (
    <div className="success-overlay">
      <div className="success-box">
        <div className="success-icon">
          <i className="material-icons">check_circle</i>
        </div>
        <h2>¡Compra realizada!</h2>
        <p>
          Pedido <strong>#{number}</strong> · Total <strong>{formatPrice(order.total)} COP</strong>
          <br />
          {order.paymentMethod === 'CASH'
            ? 'Pagarás al recibir el pedido.'
            : `Pago simulado con ${PAYMENT_LABELS[order.paymentMethod]}: no se realizó ningún cobro real.`}
        </p>
      </div>
    </div>
  )
}

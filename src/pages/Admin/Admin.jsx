// Panel de administrador.
// El diseño (barra superior, menú lateral, tablas y modales) es el trabajo de mi compañero (Admin.css);
// los datos vienen de nuestra API: /api/admin/* (solo para usuarios con role ADMIN).
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { isPastSlot } from '../../utils/courts'
import AdminModal from './AdminForms'
import {
  formatMoney, formatDate, formatDay, hourRange, orderNumber, ageRange, matches,
  COURT_TYPES, ROLES, PAYMENT_METHODS, RESERVATION_STATUS, ORDER_STATUS,
} from './adminHelpers'
import './Admin.css'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', title: 'Panel General', icon: 'dashboard', section: 'Principal' },
  { id: 'courts', label: 'Canchas', title: 'Canchas', icon: 'sports_tennis', section: 'Instalaciones y Juego' },
  { id: 'reservations', label: 'Reservas', title: 'Control de Reservas', icon: 'event', section: 'Instalaciones y Juego' },
  { id: 'classes', label: 'Clases', title: 'Programas de Clases', icon: 'school', section: 'Instalaciones y Juego' },
  { id: 'tournaments', label: 'Torneos', title: 'Torneos', icon: 'emoji_events', section: 'Instalaciones y Juego' },
  { id: 'products', label: 'Tienda', title: 'Inventario de la Tienda', icon: 'inventory_2', section: 'Comercio y Usuarios' },
  { id: 'orders', label: 'Pedidos', title: 'Pedidos', icon: 'receipt_long', section: 'Comercio y Usuarios' },
  { id: 'users', label: 'Usuarios', title: 'Usuarios y Roles', icon: 'people_alt', section: 'Comercio y Usuarios' },
]
const SECTIONS = [...new Set(TABS.map((t) => t.section))]

export default function Admin() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [tab, setTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modal, setModal] = useState(null) // { resource, item }

  const [stats, setStats] = useState(null)
  const [data, setData] = useState({ courts: [], reservations: [], classes: [], tournaments: [], products: [], orders: [], users: [] })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Carga todo de una vez (son pocos datos) para que los contadores del menú estén al día
  const loadAll = useCallback(() =>
    Promise.all([
      api.getAdminStats(),
      api.adminList('courts'),
      api.getAllReservations(),
      api.adminList('classes'),
      api.adminList('tournaments'),
      api.adminList('products'),
      api.getAllOrders(),
      api.adminList('users'),
    ])
      .then(([s, courts, reservations, classes, tournaments, products, orders, users]) => {
        setStats(s)
        setData({ courts, reservations, classes, tournaments, products, orders, users })
      })
      .catch((err) => showToast(`No se pudieron cargar los datos: ${err.message}`, 'error'))
      .finally(() => setLoading(false)), [])

  useEffect(() => { loadAll() }, [loadAll])

  const changeTab = (id) => {
    setTab(id)
    setSearch('')
    setStatusFilter('all')
  }

  const refresh = () => {
    setLoading(true)
    loadAll()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Ejecuta una acción, avisa del resultado y recarga los datos
  const run = async (action, okMessage) => {
    try {
      await action()
      showToast(okMessage)
      await loadAll()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const save = async (payload) => {
    const { resource, item } = modal
    if (item) await api.adminUpdate(resource, item._id, payload)
    else await api.adminCreate(resource, payload)
    setModal(null)
    showToast(item ? 'Cambios guardados' : 'Creado correctamente')
    await loadAll()
  }

  const remove = (resource, item, name) => {
    if (!window.confirm(`¿Seguro que quieres borrar "${name}"? No se puede deshacer.`)) return
    run(() => api.adminDelete(resource, item._id), 'Borrado correctamente')
  }

  const current = TABS.find((t) => t.id === tab)

  return (
    <div className="admin-layout-wrapper">
      {/* Barra superior */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <Link to="/admin" className="admin-brand">
            <img src="/IconPadel.png" alt="Logo" className="admin-logo-img" />
            <div className="admin-brand-info">
              <span className="admin-brand-title">PadelZone</span>
              <span className="admin-badge-role">ADMIN</span>
            </div>
          </Link>
          <span className="admin-breadcrumb-divider">/</span>
          <span className="admin-current-section">{current.title}</span>
        </div>

        <div className="admin-topbar-right">
          <Link to="/" className="btn-admin-link" title="Ver la web como la ven los clientes">
            <i className="material-icons">open_in_new</i>
            <span>Ver web</span>
          </Link>
          <button className="btn-theme-minimal" onClick={toggleTheme} title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <i className="material-icons">{isDark ? 'dark_mode' : 'light_mode'}</i>
          </button>
          <div className="admin-user-profile">
            <div className="admin-avatar"><i className="material-icons">shield</i></div>
            <div className="admin-user-info hide-on-small">
              <span className="admin-user-name">{user?.name}</span>
              <span className="admin-user-email">{user?.email}</span>
            </div>
          </div>
          <button className="btn-admin-logout" onClick={handleLogout} title="Cerrar sesión">
            <i className="material-icons">logout</i>
            <span>Salir</span>
          </button>
        </div>
      </header>

      <div className="admin-body">
        {/* Menú lateral */}
        <aside className="admin-sidebar">
          {SECTIONS.map((section) => (
            <div key={section}>
              <div className="admin-sidebar-section-title">{section}</div>
              <ul className="admin-nav-list">
                {TABS.filter((t) => t.section === section).map((t) => (
                  <li key={t.id} className={`admin-nav-item ${tab === t.id ? 'active' : ''}`}>
                    <button onClick={() => changeTab(t.id)}>
                      <span className="admin-nav-item-left">
                        <i className="material-icons">{t.icon}</i>
                        <span>{t.label}</span>
                      </span>
                      {data[t.id] && <span className="admin-nav-badge">{data[t.id].length}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="admin-sidebar-footer">
            <span><span className="admin-status-dot"></span>Conectado a MongoDB</span>
          </div>
        </aside>

        <main className="admin-main">
          {toast && (
            <div className={`admin-alert-toast ${toast.type}`}>
              <i className="material-icons">{toast.type === 'success' ? 'check_circle' : 'error'}</i>
              <span>{toast.message}</span>
            </div>
          )}

          {loading && !stats ? (
            <p className="admin-empty-state">Cargando datos…</p>
          ) : (
            <>
              {tab === 'dashboard' && <Dashboard stats={stats} reservations={data.reservations} onRefresh={refresh} loading={loading} goTo={changeTab} />}

              {tab === 'courts' && (
                <Section title="Canchas" subtitle="Precio por hora, tipo y si están disponibles para reservar" onNew={() => setModal({ resource: 'courts' })} newLabel="Nueva cancha">
                  <Table head={['Nombre', 'Tipo', 'Precio / hora', 'Estado', 'Acciones']} empty={!data.courts.length}>
                    {data.courts.map((c) => (
                      <tr key={c._id}>
                        <td><strong>{c.name}</strong></td>
                        <td>{COURT_TYPES[c.type]}</td>
                        <td>{formatMoney(c.pricePerHour)}</td>
                        <td><Pill active={c.active} /></td>
                        <td><Actions onEdit={() => setModal({ resource: 'courts', item: c })} onDelete={() => remove('courts', c, c.name)} /></td>
                      </tr>
                    ))}
                  </Table>
                </Section>
              )}

              {tab === 'reservations' && (
                <Section title="Control de reservas" subtitle="Todas las reservas de canchas. Puedes cancelar las que aún no han empezado.">
                  <Toolbar search={search} onSearch={setSearch} placeholder="Buscar por cliente o cancha…"
                    filters={[['all', 'Todas'], ['CONFIRMED', 'Confirmadas'], ['CANCELLED', 'Canceladas']]}
                    filter={statusFilter} onFilter={setStatusFilter} />
                  <Table head={['Cancha', 'Cliente', 'Contacto', 'Fecha', 'Horario', 'Total', 'Estado', 'Acción']}
                    rows={data.reservations
                      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
                      .filter((r) => matches(search, r.court?.name, r.user?.name, r.user?.email))}
                    render={(r) => (
                      <tr key={r._id}>
                        <td><strong>{r.court?.name ?? '—'}</strong></td>
                        <td>{r.user?.name ?? 'Usuario borrado'}</td>
                        <td>{r.user?.email ?? '-'}</td>
                        <td>{formatDay(r.date)}</td>
                        <td>{hourRange(r.startHour, r.endHour)}</td>
                        <td>{formatMoney(r.totalPrice)}</td>
                        <td><Status map={RESERVATION_STATUS} value={r.status} /></td>
                        <td>
                          {r.status === 'CONFIRMED' && !isPastSlot(r.date, r.startHour) ? (
                            <button className="btn-icon-subtle danger" title="Cancelar reserva"
                              onClick={() => window.confirm('¿Cancelar esta reserva? La hora quedará libre.') &&
                                run(() => api.cancelReservation(r._id), 'Reserva cancelada')}>
                              <i className="material-icons">cancel</i>
                            </button>
                          ) : <span className="admin-muted">—</span>}
                        </td>
                      </tr>
                    )} />
                </Section>
              )}

              {tab === 'classes' && (
                <Section title="Programas de clases" subtitle="Días, horarios, grupos por edad, profesores, precios y cupos" onNew={() => setModal({ resource: 'classes' })} newLabel="Nuevo programa">
                  <Table head={['Programa', 'Días', 'Grupos', 'Inscritos', 'Estado', 'Acciones']} empty={!data.classes.length}>
                    {data.classes.map((p) => {
                      const enrolled = p.groups.reduce((s, g) => s + (g.enrolledCount ?? 0), 0)
                      const capacity = p.groups.reduce((s, g) => s + g.capacity, 0)
                      return (
                        <tr key={p._id}>
                          <td><span className="admin-color-dot" style={{ background: p.color }} /><strong>{p.name}</strong></td>
                          <td>{p.daysOfWeek}</td>
                          <td>{p.groups.map((g) => <div key={g._id} className="admin-small">{ageRange(g)} · {g.coach?.name} · {formatMoney(g.monthlyPrice)}</div>)}</td>
                          <td>{enrolled} / {capacity}</td>
                          <td><Pill active={p.active} /></td>
                          <td><Actions onEdit={() => setModal({ resource: 'classes', item: p })} onDelete={() => remove('classes', p, p.name)} /></td>
                        </tr>
                      )
                    })}
                  </Table>
                </Section>
              )}

              {tab === 'tournaments' && (
                <Section title="Torneos" subtitle="Fechas, inscripción, premio y cupos" onNew={() => setModal({ resource: 'tournaments' })} newLabel="Nuevo torneo">
                  <Table head={['Torneo', 'Categoría', 'Fechas', 'Inscripción', 'Inscritos', 'Acciones']} empty={!data.tournaments.length}>
                    {data.tournaments.map((t) => (
                      <tr key={t._id}>
                        <td><strong>{t.name}</strong><div className="admin-small">{t.level}</div></td>
                        <td>{t.category}</td>
                        <td>{formatDay(t.startDate)} → {formatDay(t.endDate)}</td>
                        <td>{formatMoney(t.fee)}</td>
                        <td>{t.registeredCount ?? 0} / {t.capacity}</td>
                        <td><Actions onEdit={() => setModal({ resource: 'tournaments', item: t })} onDelete={() => remove('tournaments', t, t.name)} /></td>
                      </tr>
                    ))}
                  </Table>
                </Section>
              )}

              {tab === 'products' && (
                <Section title="Inventario de la tienda" subtitle="Precios, stock y productos visibles en la tienda" onNew={() => setModal({ resource: 'products' })} newLabel="Nuevo producto">
                  <Toolbar search={search} onSearch={setSearch} placeholder="Buscar producto…" />
                  <Table head={['Producto', 'Precio', 'Stock', 'Etiqueta', 'Estado', 'Acciones']}
                    rows={data.products.filter((p) => matches(search, p.name))}
                    render={(p) => (
                      <tr key={p._id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{formatMoney(p.price)}</td>
                        <td><span className={p.stock === 0 ? 'admin-stock-out' : p.stock <= 3 ? 'admin-stock-low' : ''}>{p.stock === 0 ? 'Agotado' : `${p.stock} uds.`}</span></td>
                        <td>{p.badge || '—'}</td>
                        <td><Pill active={p.active} /></td>
                        <td><Actions onEdit={() => setModal({ resource: 'products', item: p })} onDelete={() => remove('products', p, p.name)} /></td>
                      </tr>
                    )} />
                </Section>
              )}

              {tab === 'orders' && (
                <Section title="Pedidos" subtitle="Compras de la tienda. Si cancelas un pedido, las unidades vuelven al stock.">
                  <Toolbar search={search} onSearch={setSearch} placeholder="Buscar por cliente o número…"
                    filters={[['all', 'Todos'], ['PENDING', 'Pendientes'], ['PAID', 'Pagados'], ['CANCELLED', 'Cancelados']]}
                    filter={statusFilter} onFilter={setStatusFilter} />
                  <Table head={['Pedido', 'Cliente', 'Fecha', 'Productos', 'Total', 'Pago', 'Estado']}
                    rows={data.orders
                      .filter((o) => statusFilter === 'all' || o.status === statusFilter)
                      .filter((o) => matches(search, orderNumber(o), o.user?.name, o.user?.email))}
                    render={(o) => (
                      <tr key={o._id}>
                        <td><strong>{orderNumber(o)}</strong></td>
                        <td>{o.user?.name ?? 'Usuario borrado'}<div className="admin-small">{o.address}</div></td>
                        <td>{formatDate(o.createdAt)}</td>
                        <td>{o.items.map((i) => <div key={i.product} className="admin-small">{i.quantity} × {i.name}</div>)}</td>
                        <td>{formatMoney(o.total)}</td>
                        <td>{PAYMENT_METHODS[o.paymentMethod] ?? '-'}</td>
                        <td>
                          {o.status === 'CANCELLED' ? <Status map={ORDER_STATUS} value={o.status} /> : (
                            <select className="admin-inline-select" value={o.status}
                              onChange={(e) => {
                                const status = e.target.value
                                if (status === 'CANCELLED' && !window.confirm('¿Cancelar el pedido? Las unidades vuelven al stock y no se puede deshacer.')) return
                                run(() => api.updateOrderStatus(o._id, status), `Pedido ${orderNumber(o)} actualizado`)
                              }}>
                              <option value="PENDING">Pendiente</option>
                              <option value="PAID">Pagado</option>
                              <option value="CANCELLED">Cancelado</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    )} />
                </Section>
              )}

              {tab === 'users' && (
                <Section title="Usuarios y roles" subtitle="Crea cuentas, cambia datos y decide quién es administrador" onNew={() => setModal({ resource: 'users' })} newLabel="Nuevo usuario">
                  <Toolbar search={search} onSearch={setSearch} placeholder="Buscar por nombre o email…" />
                  <Table head={['Nombre', 'Email', 'Teléfono', 'Rol', 'Registro', 'Acciones']}
                    rows={data.users.filter((u) => matches(search, u.name, u.email))}
                    render={(u) => (
                      <tr key={u._id}>
                        <td><strong>{u.name}</strong>{u._id === user?._id && <span className="admin-small"> (tú)</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || '-'}</td>
                        <td><span className={`pill-status ${u.role === 'ADMIN' ? 'admin' : 'cliente'}`}>{ROLES[u.role]}</span></td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td><Actions onEdit={() => setModal({ resource: 'users', item: u })} onDelete={() => remove('users', u, u.name)} /></td>
                      </tr>
                    )} />
                </Section>
              )}
            </>
          )}
        </main>
      </div>

      {modal && <AdminModal resource={modal.resource} item={modal.item} onClose={() => setModal(null)} onSave={save} />}
    </div>
  )
}

/* ── Dashboard ────────────────────────────────────── */

function Dashboard({ stats, reservations, onRefresh, loading, goTo }) {
  const metrics = [
    ['Ingresos', formatMoney(stats.revenue.total), 'payments', 'Reservas + tienda pagada + clases sueltas'],
    ['Reservas activas', stats.activeReservations, 'event', plural(stats.reservations, 'reserva', 'reservas') + ' en total'],
    ['Canchas activas', `${stats.activeCourts} / ${stats.courts}`, 'sports_tennis', 'Disponibles para reservar'],
    ['Usuarios', stats.users, 'group', 'Cuentas registradas'],
    ['Pedidos pendientes', stats.pendingOrders, 'receipt_long', plural(stats.orders, 'pedido', 'pedidos') + ' en total'],
    ['Alumnos de clases', stats.enrollments, 'school', plural(stats.classBookings, 'clase suelta o de cortesía', 'clases sueltas o de cortesía')],
    ['Inscritos en torneos', stats.registrations, 'emoji_events', 'Inscripciones activas'],
    ['Poco stock', stats.lowStock.length, 'inventory_2', stats.lowStock.map((p) => `${p.name} (${p.stock})`).join(', ') || 'Todo con stock'],
  ]

  return (
    <div>
      <div className="admin-view-header">
        <div className="admin-view-title">
          <h1>Resumen general</h1>
          <p>Actividad del club calculada en el servidor con los datos de MongoDB</p>
        </div>
        <button className="btn-admin-action-primary" onClick={onRefresh}>
          <i className="material-icons">sync</i>
          <span>{loading ? 'Actualizando…' : 'Actualizar'}</span>
        </button>
      </div>

      <div className="admin-metrics-row">
        {metrics.map(([label, value, icon, sub]) => (
          <div className="metric-box" key={label}>
            <div className="metric-box-top">
              <span className="metric-box-label">{label}</span>
              <div className="metric-box-icon"><i className="material-icons">{icon}</i></div>
            </div>
            <div className="metric-box-value">{value}</div>
            <div className="metric-box-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="admin-card-pro">
        <div className="admin-toolbar">
          <span className="admin-toolbar-title">Últimas reservas</span>
          <button className="btn-secondary-pro" onClick={() => goTo('reservations')}>Ver todas</button>
        </div>
        <Table head={['Cancha', 'Cliente', 'Fecha', 'Horario', 'Total', 'Estado']}
          rows={reservations.slice(0, 5)}
          render={(r) => (
            <tr key={r._id}>
              <td><strong>{r.court?.name}</strong></td>
              <td>{r.user?.name ?? '-'}</td>
              <td>{formatDay(r.date)}</td>
              <td>{hourRange(r.startHour, r.endHour)}</td>
              <td>{formatMoney(r.totalPrice)}</td>
              <td><Status map={RESERVATION_STATUS} value={r.status} /></td>
            </tr>
          )} />
      </div>
    </div>
  )
}

/* ── Piezas de la interfaz ────────────────────────── */

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function Section({ title, subtitle, onNew, newLabel, children }) {
  return (
    <div>
      <div className="admin-view-header">
        <div className="admin-view-title">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {onNew && (
          <button className="btn-admin-action-primary" onClick={onNew}>
            <i className="material-icons">add</i>
            <span>{newLabel}</span>
          </button>
        )}
      </div>
      <div className="admin-card-pro">{children}</div>
    </div>
  )
}

function Toolbar({ search, onSearch, placeholder, filters, filter, onFilter }) {
  return (
    <div className="admin-toolbar">
      <div className="admin-search-box">
        <i className="material-icons">search</i>
        <input type="text" placeholder={placeholder} value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
      {filters && (
        <div className="admin-filters-group">
          {filters.map(([value, label]) => (
            <button key={value} className={`admin-filter-pill ${filter === value ? 'active' : ''}`} onClick={() => onFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Tabla: se le pasan las filas ya hechas (children) o una lista + cómo dibujar cada fila
function Table({ head, children, rows, render, empty }) {
  const body = rows ? rows.map(render) : children
  const isEmpty = rows ? rows.length === 0 : empty
  return (
    <div className="admin-table-container">
      <table className="table-pro">
        <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {body}
          {isEmpty && <tr><td colSpan={head.length} className="admin-empty-state">No hay nada que mostrar</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function Actions({ onEdit, onDelete }) {
  return (
    <div className="table-actions">
      <button className="btn-icon-subtle" onClick={onEdit} title="Editar"><i className="material-icons">edit</i></button>
      <button className="btn-icon-subtle danger" onClick={onDelete} title="Borrar"><i className="material-icons">delete</i></button>
    </div>
  )
}

const Pill = ({ active }) => (
  <span className={`pill-status ${active ? 'disponible' : 'mantenimiento'}`}>{active ? 'Activo' : 'Inactivo'}</span>
)

const Status = ({ map, value }) => {
  const [label, css] = map[value] ?? [value, '']
  return <span className={`pill-status ${css}`}>{label}</span>
}

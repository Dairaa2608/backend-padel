import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import './Admin.css'

export default function Admin() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' })

  // Data states
  const [courts, setCourts] = useState([])
  const [reservations, setReservations] = useState([])
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [tournaments, setTournaments] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])

  // Search/Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Modal states
  const [modalType, setModalType] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})

  const tabLabels = {
    dashboard: 'Panel General',
    canchas: 'Pistas y Canchas',
    reservas: 'Control de Reservas',
    usuarios: 'Usuarios y Accesos',
    clases: 'Clases y Clínicas',
    torneos: 'Torneos y Campeonatos',
    productos: 'Inventario de Tienda',
    pedidos: 'Ventas y Facturación',
  }

  const showAlert = (message, type = 'success') => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000)
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [c, r, u, cl, t, p, o] = await Promise.all([
        api.getCourts().catch(() => []),
        api.getAllReservations().catch(() => []),
        api.getUsers().catch(() => []),
        api.getClasses().catch(() => []),
        api.getTournaments().catch(() => []),
        api.getProducts().catch(() => []),
        api.getAllOrders().catch(() => []),
      ])
      setCourts(Array.isArray(c) ? c : (c?.canchas || []))
      setReservations(Array.isArray(r) ? r : [])
      setUsers(Array.isArray(u) ? u : [])
      setClasses(Array.isArray(cl) ? cl : (cl?.clases || []))
      setTournaments(Array.isArray(t) ? t : (t?.torneos || []))
      setProducts(Array.isArray(p) ? p : (p?.productos || []))
      setOrders(Array.isArray(o) ? o : [])
    } catch (err) {
      showAlert('Error al actualizar datos: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // --- Modal Helpers ---
  const openModal = (type, item = null) => {
    setModalType(type)
    setEditingItem(item)
    if (item) {
      setFormData({ ...item })
    } else {
      if (type === 'court') setFormData({ nombre: '', tipo: 'Estándar', precio_por_hora: 35000, disponible: true, imagen: '' })
      if (type === 'product') setFormData({ nombre: '', descripcion: '', categoria: 'Palas', precio: 150000, stock: 10, imagen: '' })
      if (type === 'user') setFormData({ name: '', email: '', password: '', phone: '', rol: 'cliente' })
      if (type === 'class') setFormData({ nombre: '', nivel: 'Principiante', precio: 40000, cupos_maximos: 4, horario: '18:00 - 19:30' })
      if (type === 'tournament') setFormData({ nombre: '', categoria: '3ª Categoría', precio_inscripcion: 80000, max_participantes: 16, fecha_inicio: '', fecha_fin: '' })
    }
  }

  const closeModal = () => {
    setModalType(null)
    setEditingItem(null)
    setFormData({})
  }

  // --- Handlers: Canchas ---
  const handleSaveCourt = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.updateCourt(editingItem.id || editingItem._id, formData)
        showAlert('Cancha actualizada correctamente')
      } else {
        await api.createCourt(formData)
        showAlert('Cancha creada con éxito')
      }
      closeModal()
      loadAllData()
    } catch (err) {
      showAlert('Error al guardar cancha: ' + err.message, 'error')
    }
  }

  const handleDeleteCourt = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta cancha?')) return
    try {
      await api.deleteCourt(id)
      showAlert('Cancha eliminada')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // --- Handlers: Reservas ---
  const handleCancelReservation = async (id) => {
    if (!window.confirm('¿Confirmas la cancelación administrativa de esta reserva?')) return
    try {
      await api.cancelReservation(id)
      showAlert('Reserva cancelada')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // --- Handlers: Productos ---
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.updateProduct(editingItem.id || editingItem._id, formData)
        showAlert('Producto actualizado')
      } else {
        await api.createProduct(formData)
        showAlert('Producto creado')
      }
      closeModal()
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('¿Eliminar este producto del catálogo?')) return
    try {
      await api.deleteProduct(id)
      showAlert('Producto eliminado')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // --- Handlers: Usuarios ---
  const handleSaveUser = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.updateUser(editingItem.id || editingItem._id, formData)
        showAlert('Usuario actualizado')
      } else {
        await api.createUser(formData)
        showAlert('Usuario creado con éxito')
      }
      closeModal()
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateUser(userId, { rol: newRole })
      showAlert(`Rol actualizado a ${newRole}`)
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleDeleteUser = async (id) => {
    if (!window.confirm('¿Eliminar este usuario del sistema?')) return
    try {
      await api.deleteUser(id)
      showAlert('Usuario eliminado')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // --- Handlers: Clases y Torneos ---
  const handleSaveClass = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.updateClass(editingItem.id || editingItem._id, formData)
        showAlert('Clase actualizada')
      } else {
        await api.createClass(formData)
        showAlert('Clase programada con éxito')
      }
      closeModal()
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleDeleteClass = async (id) => {
    if (!window.confirm('¿Eliminar esta clase?')) return
    try {
      await api.deleteClass(id)
      showAlert('Clase eliminada')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleSaveTournament = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await api.updateTournament(editingItem.id || editingItem._id, formData)
        showAlert('Torneo actualizado')
      } else {
        await api.createTournament(formData)
        showAlert('Torneo creado con éxito')
      }
      closeModal()
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  const handleDeleteTournament = async (id) => {
    if (!window.confirm('¿Eliminar este torneo?')) return
    try {
      await api.deleteTournament(id)
      showAlert('Torneo eliminado')
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // --- Handlers: Pedidos ---
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus)
      showAlert(`Estado de pedido actualizado a ${newStatus}`)
      loadAllData()
    } catch (err) {
      showAlert('Error: ' + err.message, 'error')
    }
  }

  // Cálculos de métricas
  const totalRevenue = orders
    .filter(o => o.estado === 'pagado')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0) +
    reservations
    .filter(r => r.estado === 'confirmada')
    .reduce((sum, r) => sum + (Number(r.total) || 0), 0)

  const activeCourtsCount = courts.filter(c => c.disponible !== false).length

  return (
    <div className="admin-layout-wrapper">
      {/* 1. TOPBAR DEDICADA Y AUTÓNOMA DEL ADMINISTRADOR */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <Link to="/admin" className="admin-brand">
            <img src="/IconPadel.png" alt="Logo" className="admin-logo-img" />
            <div className="admin-brand-info">
              <span className="admin-brand-title">PadelZone</span>
              <span className="admin-badge-role">ADMIN SUITE</span>
            </div>
          </Link>
          <span className="admin-breadcrumb-divider">/</span>
          <span className="admin-current-section">{tabLabels[activeTab]}</span>
        </div>

        <div className="admin-topbar-right">
          <Link to="/" className="btn-admin-link" title="Inspeccionar la web pública como visitante">
            <i className="material-icons">open_in_new</i>
            <span>Ver Web</span>
          </Link>

          <button
            className="btn-theme-minimal"
            onClick={toggleTheme}
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          >
            <i className="material-icons">{isDark ? 'dark_mode' : 'light_mode'}</i>
          </button>

          <div className="admin-user-profile">
            <div className="admin-avatar">
              <i className="material-icons">shield</i>
            </div>
            <div className="admin-user-info hide-on-small">
              <span className="admin-user-name">{user?.name || user?.nombre || 'Administrador'}</span>
              <span className="admin-user-email">{user?.email || 'admin@padelzone.com'}</span>
            </div>
          </div>

          <button className="btn-admin-logout" onClick={handleLogout} title="Cerrar sesión de administrador">
            <i className="material-icons">logout</i>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* 2. ESTRUCTURA INTERNA: SIDEBAR + MAIN AREA */}
      <div className="admin-body">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-section-title">Principal</div>
          <ul className="admin-nav-list">
            <li className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('dashboard'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">dashboard</i>
                  <span>Dashboard</span>
                </span>
              </button>
            </li>
          </ul>

          <div className="admin-sidebar-section-title">Instalaciones & Juego</div>
          <ul className="admin-nav-list">
            <li className={`admin-nav-item ${activeTab === 'canchas' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('canchas'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">sports_tennis</i>
                  <span>Pistas / Canchas</span>
                </span>
                <span className="admin-nav-badge">{courts.length}</span>
              </button>
            </li>
            <li className={`admin-nav-item ${activeTab === 'reservas' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('reservas'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">event</i>
                  <span>Reservas</span>
                </span>
                <span className="admin-nav-badge">{reservations.length}</span>
              </button>
            </li>
            <li className={`admin-nav-item ${activeTab === 'clases' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('clases'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">school</i>
                  <span>Clases</span>
                </span>
                <span className="admin-nav-badge">{classes.length}</span>
              </button>
            </li>
            <li className={`admin-nav-item ${activeTab === 'torneos' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('torneos'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">emoji_events</i>
                  <span>Torneos</span>
                </span>
                <span className="admin-nav-badge">{tournaments.length}</span>
              </button>
            </li>
          </ul>

          <div className="admin-sidebar-section-title">Comercio & Usuarios</div>
          <ul className="admin-nav-list">
            <li className={`admin-nav-item ${activeTab === 'productos' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('productos'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">inventory_2</i>
                  <span>Inventario / Tienda</span>
                </span>
                <span className="admin-nav-badge">{products.length}</span>
              </button>
            </li>
            <li className={`admin-nav-item ${activeTab === 'pedidos' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('pedidos'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">receipt_long</i>
                  <span>Pedidos</span>
                </span>
                <span className="admin-nav-badge">{orders.length}</span>
              </button>
            </li>
            <li className={`admin-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}>
              <button onClick={() => { setActiveTab('usuarios'); setSearchTerm(''); setFilterStatus('all'); }}>
                <span className="admin-nav-item-left">
                  <i className="material-icons">people_alt</i>
                  <span>Usuarios y Roles</span>
                </span>
                <span className="admin-nav-badge">{users.length}</span>
              </button>
            </li>
          </ul>

          <div className="admin-sidebar-footer">
            <span><span className="admin-status-dot"></span>Sistema Operativo</span>
            <span>v1.2</span>
          </div>
        </aside>

        {/* Contenido Principal */}
        <main className="admin-main">
          {/* Toast Notification */}
          {alert.show && (
            <div className={`admin-alert-toast ${alert.type}`}>
              <i className="material-icons">{alert.type === 'success' ? 'check_circle' : 'error'}</i>
              <span>{alert.message}</span>
            </div>
          )}

          {/* =========================================================
              TAB: DASHBOARD
              ========================================================= */}
          {activeTab === 'dashboard' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Resumen Ejecutivo</h1>
                  <p>Métricas consolidadas de actividad, instalaciones e ingresos</p>
                </div>
                <button className="btn-admin-action-primary" onClick={loadAllData}>
                  <i className="material-icons">sync</i>
                  <span>{loading ? 'Actualizando...' : 'Sincronizar'}</span>
                </button>
              </div>

              <div className="admin-metrics-row">
                <div className="metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Reservas Registradas</span>
                    <div className="metric-box-icon"><i className="material-icons">event</i></div>
                  </div>
                  <div className="metric-box-value">{reservations.length}</div>
                  <div className="metric-box-sub">Total acumulado</div>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Ingresos Totales</span>
                    <div className="metric-box-icon"><i className="material-icons">payments</i></div>
                  </div>
                  <div className="metric-box-value">${totalRevenue.toLocaleString()}</div>
                  <div className="metric-box-sub">Pagos confirmados</div>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Pistas Operativas</span>
                    <div className="metric-box-icon"><i className="material-icons">sports_tennis</i></div>
                  </div>
                  <div className="metric-box-value">{activeCourtsCount} / {courts.length}</div>
                  <div className="metric-box-sub">Disponibles ahora</div>
                </div>

                <div className="metric-box">
                  <div className="metric-box-top">
                    <span className="metric-box-label">Usuarios Registrados</span>
                    <div className="metric-box-icon"><i className="material-icons">group</i></div>
                  </div>
                  <div className="metric-box-value">{users.length}</div>
                  <div className="metric-box-sub">Clientes y profesores</div>
                </div>
              </div>

              <div className="admin-card-pro">
                <div className="admin-toolbar">
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Actividad Reciente de Reservas</span>
                  <button className="btn-secondary-pro" onClick={() => setActiveTab('reservas')}>
                    Ver Todas las Reservas
                  </button>
                </div>
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Pista</th>
                        <th>Cliente</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.slice(0, 5).map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.court}</strong></td>
                          <td>{r.user?.nombre || r.user?.email || 'Cliente'}</td>
                          <td>{r.date}</td>
                          <td>{r.startHour} - {r.endHour}</td>
                          <td>${Number(r.total).toLocaleString()}</td>
                          <td><span className={`pill-status ${r.estado}`}>{r.estado}</span></td>
                        </tr>
                      ))}
                      {reservations.length === 0 && (
                        <tr><td colSpan="6" className="admin-empty-state">No se registran reservas recientes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: CANCHAS
              ========================================================= */}
          {activeTab === 'canchas' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Gestión de Pistas de Pádel</h1>
                  <p>Administra tarifas por hora, tipología y disponibilidad operativa</p>
                </div>
                <button className="btn-admin-action-primary" onClick={() => openModal('court')}>
                  <i className="material-icons">add</i>
                  <span>Nueva Cancha</span>
                </button>
              </div>

              <div className="admin-card-pro">
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Precio / Hora</th>
                        <th>Disponibilidad</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courts.map(c => (
                        <tr key={c.id || c._id}>
                          <td><strong>{c.nombre}</strong></td>
                          <td>{c.tipo}</td>
                          <td>${Number(c.precio_por_hora || 0).toLocaleString()}</td>
                          <td>
                            <span className={`pill-status ${c.disponible ? 'disponible' : 'mantenimiento'}`}>
                              {c.disponible ? 'Disponible' : 'Mantenimiento'}
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-icon-subtle" onClick={() => openModal('court', c)} title="Editar pista">
                                <i className="material-icons">edit</i>
                              </button>
                              <button className="btn-icon-subtle danger" onClick={() => handleDeleteCourt(c.id || c._id)} title="Eliminar pista">
                                <i className="material-icons">delete</i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: RESERVAS
              ========================================================= */}
          {activeTab === 'reservas' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Control Global de Reservas</h1>
                  <p>Supervisión de turnos de todos los clientes y cancelación de ser requerido</p>
                </div>
              </div>

              <div className="admin-card-pro">
                <div className="admin-toolbar">
                  <div className="admin-search-box">
                    <i className="material-icons">search</i>
                    <input
                      type="text"
                      placeholder="Buscar por cliente o cancha..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="admin-filters-group">
                    {['all', 'confirmada', 'pendiente', 'cancelada'].map(st => (
                      <button
                        key={st}
                        className={`admin-filter-pill ${filterStatus === st ? 'active' : ''}`}
                        onClick={() => setFilterStatus(st)}
                      >
                        {st === 'all' ? 'Todas' : st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Pista</th>
                        <th>Cliente</th>
                        <th>Contacto</th>
                        <th>Fecha</th>
                        <th>Horario</th>
                        <th>Total</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations
                        .filter(r => filterStatus === 'all' || r.estado === filterStatus)
                        .filter(r =>
                          (r.court || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.user?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(r => (
                          <tr key={r.id}>
                            <td><strong>{r.court}</strong></td>
                            <td>{r.user?.nombre || 'Usuario'}</td>
                            <td>{r.user?.email || r.user?.telefono || '-'}</td>
                            <td>{r.date}</td>
                            <td>{r.startHour} - {r.endHour}</td>
                            <td>${Number(r.total).toLocaleString()}</td>
                            <td><span className={`pill-status ${r.estado}`}>{r.estado}</span></td>
                            <td>
                              {r.estado !== 'cancelada' ? (
                                <button
                                  className="btn-icon-subtle danger"
                                  onClick={() => handleCancelReservation(r.id)}
                                  title="Cancelar reserva administrativamente"
                                >
                                  <i className="material-icons">cancel</i>
                                </button>
                              ) : (
                                <span style={{ color: '#71717a', fontSize: '0.78rem' }}>Anulada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: USUARIOS Y ROLES
              ========================================================= */}
          {activeTab === 'usuarios' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Usuarios y Permisos</h1>
                  <p>Control de roles (cliente, profesor, admin) y administración de accesos</p>
                </div>
                <button className="btn-admin-action-primary" onClick={() => openModal('user')}>
                  <i className="material-icons">person_add</i>
                  <span>Nuevo Usuario</span>
                </button>
              </div>

              <div className="admin-card-pro">
                <div className="admin-toolbar">
                  <div className="admin-search-box">
                    <i className="material-icons">search</i>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Rol</th>
                        <th>Asignar Rol</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter(u =>
                          (u.name || u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(u => (
                          <tr key={u.id || u._id}>
                            <td><strong>{u.name || u.nombre}</strong></td>
                            <td>{u.email}</td>
                            <td>{u.phone || u.telefono || '-'}</td>
                            <td><span className={`pill-status ${u.rol}`}>{u.rol}</span></td>
                            <td>
                              <select
                                value={u.rol}
                                onChange={(e) => handleRoleChange(u.id || u._id, e.target.value)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  color: 'inherit',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="cliente" style={{ color: '#000' }}>Cliente</option>
                                <option value="profesor" style={{ color: '#000' }}>Profesor</option>
                                <option value="admin" style={{ color: '#000' }}>Administrador</option>
                              </select>
                            </td>
                            <td>
                              <button
                                className="btn-icon-subtle danger"
                                onClick={() => handleDeleteUser(u.id || u._id)}
                                title="Eliminar usuario"
                              >
                                <i className="material-icons">delete</i>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: CLASES
              ========================================================= */}
          {activeTab === 'clases' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Clases y Entrenamientos</h1>
                  <p>Programación de módulos formativos, niveles y cupos</p>
                </div>
                <button className="btn-admin-action-primary" onClick={() => openModal('class')}>
                  <i className="material-icons">add</i>
                  <span>Nueva Clase</span>
                </button>
              </div>

              <div className="admin-card-pro">
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Clase / Especialidad</th>
                        <th>Nivel</th>
                        <th>Horario</th>
                        <th>Cupos</th>
                        <th>Precio</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map(cl => (
                        <tr key={cl.id || cl._id}>
                          <td><strong>{cl.nombre || cl.titulo}</strong></td>
                          <td>{cl.nivel}</td>
                          <td>{cl.horario || '-'}</td>
                          <td>{cl.cupos_maximos || 4} alumnos</td>
                          <td>${Number(cl.precio || 0).toLocaleString()}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-icon-subtle" onClick={() => openModal('class', cl)} title="Editar clase">
                                <i className="material-icons">edit</i>
                              </button>
                              <button className="btn-icon-subtle danger" onClick={() => handleDeleteClass(cl.id || cl._id)} title="Eliminar clase">
                                <i className="material-icons">delete</i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: TORNEOS
              ========================================================= */}
          {activeTab === 'torneos' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Torneos y Campeonatos</h1>
                  <p>Organización de eventos competitivos y gestión de categorías</p>
                </div>
                <button className="btn-admin-action-primary" onClick={() => openModal('tournament')}>
                  <i className="material-icons">add</i>
                  <span>Nuevo Torneo</span>
                </button>
              </div>

              <div className="admin-card-pro">
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Torneo</th>
                        <th>Categoría</th>
                        <th>Inscripción</th>
                        <th>Máx Parejas</th>
                        <th>Fechas</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournaments.map(t => (
                        <tr key={t.id || t._id}>
                          <td><strong>{t.nombre}</strong></td>
                          <td>{t.categoria}</td>
                          <td>${Number(t.precio_inscripcion || 0).toLocaleString()}</td>
                          <td>{t.max_participantes || 16}</td>
                          <td>{t.fecha_inicio} al {t.fecha_fin}</td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-icon-subtle" onClick={() => openModal('tournament', t)} title="Editar torneo">
                                <i className="material-icons">edit</i>
                              </button>
                              <button className="btn-icon-subtle danger" onClick={() => handleDeleteTournament(t.id || t._id)} title="Eliminar torneo">
                                <i className="material-icons">delete</i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: TIENDA E INVENTARIO
              ========================================================= */}
          {activeTab === 'productos' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Inventario de Tienda</h1>
                  <p>Gestión de existencias, precios y catálogo de equipamiento</p>
                </div>
                <button className="btn-admin-action-primary" onClick={() => openModal('product')}>
                  <i className="material-icons">add</i>
                  <span>Nuevo Producto</span>
                </button>
              </div>

              <div className="admin-card-pro">
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Artículo</th>
                        <th>Categoría</th>
                        <th>Precio</th>
                        <th>Stock</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id || p._id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.imagen && (
                                <img
                                  src={p.imagen}
                                  alt=""
                                  style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '5px' }}
                                />
                              )}
                              <strong>{p.nombre}</strong>
                            </div>
                          </td>
                          <td>{p.categoria || 'Equipamiento'}</td>
                          <td>${Number(p.precio || 0).toLocaleString()}</td>
                          <td>
                            <span style={{ fontWeight: 600, color: (p.stock || 0) <= 3 ? '#f87171' : '#34d399' }}>
                              {p.stock} u.
                            </span>
                          </td>
                          <td>
                            <div className="table-actions">
                              <button className="btn-icon-subtle" onClick={() => openModal('product', p)} title="Editar producto">
                                <i className="material-icons">edit</i>
                              </button>
                              <button className="btn-icon-subtle danger" onClick={() => handleDeleteProduct(p.id || p._id)} title="Eliminar producto">
                                <i className="material-icons">delete</i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB: PEDIDOS Y FACTURACIÓN
              ========================================================= */}
          {activeTab === 'pedidos' && (
            <div>
              <div className="admin-view-header">
                <div className="admin-view-title">
                  <h1>Ventas y Facturación</h1>
                  <p>Órdenes comerciales emitidas a través de la tienda web</p>
                </div>
              </div>

              <div className="admin-card-pro">
                <div className="admin-table-container">
                  <table className="table-pro">
                    <thead>
                      <tr>
                        <th>Nº Orden</th>
                        <th>Cliente</th>
                        <th>Artículos</th>
                        <th>Total</th>
                        <th>Método</th>
                        <th>Estado</th>
                        <th>Actualizar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id || o._id}>
                          <td><small style={{ color: '#71717a' }}>#{String(o.id || o._id).slice(-6)}</small></td>
                          <td>{o.user?.nombre || o.user?.email || 'Cliente'}</td>
                          <td>{Array.isArray(o.items) ? `${o.items.length} artículos` : '-'}</td>
                          <td><strong>${Number(o.total || 0).toLocaleString()}</strong></td>
                          <td>{o.metodo_pago || 'Tarjeta'}</td>
                          <td><span className={`pill-status ${o.estado}`}>{o.estado}</span></td>
                          <td>
                            <select
                              value={o.estado}
                              onChange={(e) => handleOrderStatusChange(o.id || o._id, e.target.value)}
                              style={{
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'inherit',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '0.8rem'
                              }}
                            >
                              <option value="pendiente" style={{ color: '#000' }}>Pendiente</option>
                              <option value="pagado" style={{ color: '#000' }}>Pagado</option>
                              <option value="cancelado" style={{ color: '#000' }}>Cancelado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr><td colSpan="7" className="admin-empty-state">No hay órdenes comerciales registradas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          MODALES DE CREACIÓN Y EDICIÓN (PROLIJOS)
          ========================================================= */}
      {modalType && (
        <div className="modal-overlay-pro" onClick={closeModal}>
          <div className="modal-content-pro" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pro">
              <h3>
                {editingItem ? 'Editar' : 'Nuevo'}{' '}
                {modalType === 'court' && 'Pista de Pádel'}
                {modalType === 'product' && 'Artículo de Tienda'}
                {modalType === 'user' && 'Usuario del Sistema'}
                {modalType === 'class' && 'Módulo de Clase'}
                {modalType === 'tournament' && 'Torneo Oficial'}
              </h3>
              <button className="modal-close-btn" onClick={closeModal}>&times;</button>
            </div>

            {/* FORM CANCHA */}
            {modalType === 'court' && (
              <form onSubmit={handleSaveCourt}>
                <div className="modal-body-pro">
                  <div className="form-field-pro">
                    <label>Nombre de la Pista</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre || ''}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Cancha 1 Panorámica"
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Tipo</label>
                      <select value={formData.tipo || 'Estándar'} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                        <option value="Estándar">Estándar</option>
                        <option value="Panorámica">Panorámica</option>
                        <option value="Cubierta">Cubierta</option>
                      </select>
                    </div>
                    <div className="form-field-pro">
                      <label>Tarifa / Hora ($)</label>
                      <input
                        type="number"
                        required
                        value={formData.precio_por_hora || ''}
                        onChange={e => setFormData({ ...formData, precio_por_hora: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-field-pro">
                    <label>Ruta de Imagen (opcional)</label>
                    <input
                      type="text"
                      value={formData.imagen || ''}
                      onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                      placeholder="/img/canchapadel.jpg"
                    />
                  </div>
                  <div className="form-field-pro" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="disp"
                      checked={formData.disponible !== false}
                      onChange={e => setFormData({ ...formData, disponible: e.target.checked })}
                    />
                    <label htmlFor="disp" style={{ margin: 0, cursor: 'pointer' }}>Operativa y disponible para turnos</label>
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button type="button" className="btn-secondary-pro" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-admin-action-primary">Guardar Pista</button>
                </div>
              </form>
            )}

            {/* FORM PRODUCTO */}
            {modalType === 'product' && (
              <form onSubmit={handleSaveProduct}>
                <div className="modal-body-pro">
                  <div className="form-field-pro">
                    <label>Nombre del Producto</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre || ''}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Pala Bullpadel Vertex 04"
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Categoría</label>
                      <select value={formData.categoria || 'Palas'} onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                        <option value="Palas">Palas</option>
                        <option value="Ropa">Ropa</option>
                        <option value="Pelotas">Pelotas</option>
                        <option value="Accesorios">Accesorios</option>
                      </select>
                    </div>
                    <div className="form-field-pro">
                      <label>Precio ($)</label>
                      <input
                        type="number"
                        required
                        value={formData.precio || ''}
                        onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Stock Disponible</label>
                      <input
                        type="number"
                        required
                        value={formData.stock || ''}
                        onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-field-pro">
                      <label>Ruta de Imagen</label>
                      <input
                        type="text"
                        value={formData.imagen || ''}
                        onChange={e => setFormData({ ...formData, imagen: e.target.value })}
                        placeholder="/img/paletero pro.webp"
                      />
                    </div>
                  </div>
                  <div className="form-field-pro">
                    <label>Descripción técnica</label>
                    <textarea
                      rows="2"
                      value={formData.descripcion || ''}
                      onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Detalles del artículo..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button type="button" className="btn-secondary-pro" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-admin-action-primary">Guardar Producto</button>
                </div>
              </form>
            )}

            {/* FORM USUARIO */}
            {modalType === 'user' && (
              <form onSubmit={handleSaveUser}>
                <div className="modal-body-pro">
                  <div className="form-field-pro">
                    <label>Nombre Completo</label>
                    <input
                      type="text"
                      required
                      value={formData.name || formData.nombre || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field-pro">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  {!editingItem && (
                    <div className="form-field-pro">
                      <label>Contraseña de Acceso</label>
                      <input
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Teléfono</label>
                      <input
                        type="text"
                        value={formData.phone || formData.telefono || ''}
                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-field-pro">
                      <label>Rol Inicial</label>
                      <select value={formData.rol || 'cliente'} onChange={e => setFormData({ ...formData, rol: e.target.value })}>
                        <option value="cliente">Cliente</option>
                        <option value="profesor">Profesor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button type="button" className="btn-secondary-pro" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-admin-action-primary">Guardar Usuario</button>
                </div>
              </form>
            )}

            {/* FORM CLASE */}
            {modalType === 'class' && (
              <form onSubmit={handleSaveClass}>
                <div className="modal-body-pro">
                  <div className="form-field-pro">
                    <label>Título de la Clase</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre || formData.titulo || ''}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Clínica de Voleas y Paredes"
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Nivel</label>
                      <select value={formData.nivel || 'Principiante'} onChange={e => setFormData({ ...formData, nivel: e.target.value })}>
                        <option value="Principiante">Principiante</option>
                        <option value="Intermedio">Intermedio</option>
                        <option value="Avanzado">Avanzado</option>
                      </select>
                    </div>
                    <div className="form-field-pro">
                      <label>Precio ($)</label>
                      <input
                        type="number"
                        value={formData.precio || 40000}
                        onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Cupo Máximo</label>
                      <input
                        type="number"
                        value={formData.cupos_maximos || 4}
                        onChange={e => setFormData({ ...formData, cupos_maximos: Number(e.target.value) })}
                      />
                    </div>
                    <div className="form-field-pro">
                      <label>Horario</label>
                      <input
                        type="text"
                        value={formData.horario || ''}
                        onChange={e => setFormData({ ...formData, horario: e.target.value })}
                        placeholder="Ej: Mar y Jue 19:00"
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button type="button" className="btn-secondary-pro" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-admin-action-primary">Guardar Clase</button>
                </div>
              </form>
            )}

            {/* FORM TORNEO */}
            {modalType === 'tournament' && (
              <form onSubmit={handleSaveTournament}>
                <div className="modal-body-pro">
                  <div className="form-field-pro">
                    <label>Nombre del Torneo</label>
                    <input
                      type="text"
                      required
                      value={formData.nombre || ''}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Torneo Clausura PadelZone"
                    />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Categoría</label>
                      <select value={formData.categoria || '3ª Categoría'} onChange={e => setFormData({ ...formData, categoria: e.target.value })}>
                        <option value="1ª Categoría">1ª Categoría</option>
                        <option value="2ª Categoría">2ª Categoría</option>
                        <option value="3ª Categoría">3ª Categoría</option>
                        <option value="4ª Categoría">4ª Categoría</option>
                        <option value="Femenino">Femenino</option>
                      </select>
                    </div>
                    <div className="form-field-pro">
                      <label>Inscripción por Pareja ($)</label>
                      <input
                        type="number"
                        required
                        value={formData.precio_inscripcion || ''}
                        onChange={e => setFormData({ ...formData, precio_inscripcion: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-field-pro">
                      <label>Fecha de Inicio</label>
                      <input
                        type="date"
                        value={formData.fecha_inicio || ''}
                        onChange={e => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      />
                    </div>
                    <div className="form-field-pro">
                      <label>Fecha de Fin</label>
                      <input
                        type="date"
                        value={formData.fecha_fin || ''}
                        onChange={e => setFormData({ ...formData, fecha_fin: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer-pro">
                  <button type="button" className="btn-secondary-pro" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-admin-action-primary">Guardar Torneo</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

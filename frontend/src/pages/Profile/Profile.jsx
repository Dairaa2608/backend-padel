import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { getCourtImage, getCourtTypeLabel, formatPrice, formatHour, todayString } from '../../utils/courts'
import './Profile.css'

// Convierte una reserva tal como llega de la API al formato de las tarjetas
const toViewReservation = (r) => ({
  id: r._id,
  court: r.court?.name ?? 'Cancha',
  courtType: getCourtTypeLabel(r.court?.type),
  img: getCourtImage(r.court),
  date: r.date,
  startHourNumber: r.startHour,
  startHour: formatHour(r.startHour),
  endHour: formatHour(r.endHour),
  duration: r.endHour - r.startHour,
  total: r.totalPrice,
  status: r.status,
})

// Confirmada y todavía no ha empezado
const isUpcoming = (res) => {
  if (res.status !== 'CONFIRMED') return false
  const today = todayString()
  return res.date > today || (res.date === today && res.startHourNumber > new Date().getHours())
}

function Profile() {
  const { user, isAuthenticated, isAdmin, logout, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [reservations, setReservations] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' })
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('reservations')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [reservationsError, setReservationsError] = useState('')

  // Mis reservas, pedidas a la API (ya vienen ordenadas: las más recientes primero)
  const loadReservations = () => {
    api.getMyReservations()
      .then((data) => {
        setReservations(data.map(toViewReservation))
        setReservationsError('')
      })
      .catch((err) => setReservationsError(err.message))
  }

  // Al abrir el perfil se piden mis reservas a la API
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadReservations()
  }, [isAuthenticated, navigate])

  // La API marca la reserva como cancelada y el horario queda libre otra vez
  const handleCancelReservation = async (id) => {
    try {
      await api.cancelReservation(id)
      loadReservations()
    } catch (err) {
      setReservationsError(err.message)
    } finally {
      setCancelTarget(null)
    }
  }

  const startEdit = () => {
    setEditForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
    setEditError('')
    setEditMode(true)
  }

  // Guarda los cambios en la base de datos a través de la API
  const handleEditSave = async () => {
    setSaving(true)
    setEditError('')
    try {
      await updateProfile(editForm)
      setEditMode(false)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const confirmed = reservations.filter(r => r.status === 'CONFIRMED')
  const upcoming = reservations.filter(isUpcoming)
  const past = reservations.filter(r => !isUpcoming(r))

  return (
    <div className="profile-page">

      {/* Header */}
      <div className="profile-header">
        <div className="container">
          <div className="profile-header-content">
            <div className="profile-avatar">
              {getInitials(user?.name)}
            </div>
            <div className="profile-header-info">
              <h1>{user?.name || 'Usuario'}</h1>
              <p>{user?.email}</p>
              <span className="profile-badge">
                <i className="material-icons">{isAdmin ? 'admin_panel_settings' : 'verified'}</i>
                {isAdmin ? 'Administrador' : 'Miembro PadelZone'}
              </span>
            </div>
            <button className="profile-logout-btn" onClick={handleLogout}>
              <i className="material-icons">logout</i>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="container profile-body">

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat-card">
            <i className="material-icons">event_available</i>
            <div>
              <span className="stat-number">{confirmed.length}</span>
              <span className="stat-label">Reservas totales</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <i className="material-icons">upcoming</i>
            <div>
              <span className="stat-number">{upcoming.length}</span>
              <span className="stat-label">Próximas</span>
            </div>
          </div>
          <div className="profile-stat-card">
            <i className="material-icons">payments</i>
            <div>
              <span className="stat-number">
                {formatPrice(confirmed.reduce((acc, r) => acc + r.total, 0))}
              </span>
              <span className="stat-label">Total gastado</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <i className="material-icons">event</i>
            Mis Reservaciones
            {upcoming.length > 0 && (
              <span className="tab-badge">{upcoming.length}</span>
            )}
          </button>
          <button
            className={`profile-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <i className="material-icons">person</i>
            Mis Datos
          </button>
        </div>

        {/* Tab: Reservaciones */}
        {activeTab === 'reservations' && (
          <div className="profile-reservations">

            {reservationsError && (
              <p className="profile-edit-error">
                <i className="material-icons">error_outline</i>
                {reservationsError}
              </p>
            )}

            {reservations.length === 0 ? (
              <div className="profile-empty">
                <i className="material-icons">event_busy</i>
                <h5>No tienes reservaciones aún</h5>
                <p>Reserva una cancha y aparecerá aquí</p>
                <button className="profile-empty-btn" onClick={() => navigate('/reservar')}>
                  Reservar Ahora
                </button>
              </div>
            ) : (
              <>
                {/* Próximas */}
                {upcoming.length > 0 && (
                  <>
                    <h6 className="res-group-title">
                      <i className="material-icons">upcoming</i>
                      Próximas Reservaciones
                    </h6>
                    <div className="res-cards-grid">
                      {upcoming.map(res => (
                        <ReservationCard
                          key={res.id}
                          res={res}
                          upcoming={true}
                          onCancel={() => setCancelTarget(res.id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Pasadas */}
                {past.length > 0 && (
                  <>
                    <h6 className="res-group-title past">
                      <i className="material-icons">history</i>
                      Historial
                    </h6>
                    <div className="res-cards-grid">
                      {past.map(res => (
                        <ReservationCard
                          key={res.id}
                          res={res}
                          upcoming={false}
                          onCancel={null}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab: Datos */}
        {activeTab === 'data' && (
          <div className="profile-data-card">
            <div className="profile-data-header">
              <h5>Información Personal</h5>
              {!editMode && (
                <button className="profile-edit-btn" onClick={startEdit}>
                  <i className="material-icons">edit</i>
                  Editar
                </button>
              )}
            </div>

            {editMode ? (
              <div className="profile-edit-form">
                {editError && (
                  <p className="profile-edit-error">
                    <i className="material-icons">error_outline</i>
                    {editError}
                  </p>
                )}
                <div className="profile-edit-field">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="profile-edit-actions">
                  <button className="profile-save-btn" onClick={handleEditSave} disabled={saving}>
                    <i className="material-icons">check</i>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="profile-cancel-edit-btn" onClick={() => setEditMode(false)} disabled={saving}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-data-rows">
                <div className="profile-data-row">
                  <div className="profile-data-icon">
                    <i className="material-icons">person</i>
                  </div>
                  <div>
                    <p className="profile-data-label">Nombre</p>
                    <p className="profile-data-value">{user?.name || '—'}</p>
                  </div>
                </div>
                <div className="profile-data-row">
                  <div className="profile-data-icon">
                    <i className="material-icons">email</i>
                  </div>
                  <div>
                    <p className="profile-data-label">Email</p>
                    <p className="profile-data-value">{user?.email || '—'}</p>
                  </div>
                </div>
                <div className="profile-data-row">
                  <div className="profile-data-icon">
                    <i className="material-icons">phone</i>
                  </div>
                  <div>
                    <p className="profile-data-label">Teléfono</p>
                    <p className="profile-data-value">{user?.phone || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal cancelar */}
      {cancelTarget && (
        <div className="profile-modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-icon">
              <i className="material-icons">warning</i>
            </div>
            <h5>¿Cancelar reservación?</h5>
            <p>Esta acción no se puede deshacer.</p>
            <div className="profile-modal-actions">
              <button
                className="profile-modal-confirm"
                onClick={() => handleCancelReservation(cancelTarget)}
              >
                Sí, cancelar
              </button>
              <button
                className="profile-modal-dismiss"
                onClick={() => setCancelTarget(null)}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function ReservationCard({ res, upcoming, onCancel }) {
  const statusLabel = res.status === 'CANCELLED' ? 'Cancelada' : upcoming ? 'Próxima' : 'Completada'
  return (
    <div className={`res-card ${upcoming ? 'upcoming' : 'past'}`}>
      <div className="res-card-img">
        <img src={res.img} alt={res.court} />
        <span className={`res-card-status ${upcoming ? 'upcoming' : 'past'}`}>
          {statusLabel}
        </span>
      </div>
      <div className="res-card-body">
        <div className="res-card-title-row">
          <h6>{res.court}</h6>
          <span className="res-card-price">{formatPrice(res.total)}</span>
        </div>
        <div className="res-card-details">
          <p>
            <i className="material-icons">calendar_today</i>
            {res.date}
          </p>
          <p>
            <i className="material-icons">schedule</i>
            {res.startHour} – {res.endHour}
          </p>
          <p>
            <i className="material-icons">timer</i>
            {res.duration}h · {res.courtType}
          </p>
        </div>
        {upcoming && onCancel && (
          <button className="res-card-cancel-btn" onClick={onCancel}>
            <i className="material-icons">cancel</i>
            Cancelar Reserva
          </button>
        )}
      </div>
    </div>
  )
}

export default Profile
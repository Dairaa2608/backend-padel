import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { getCourtImage, getCourtTypeLabel, formatPrice, formatHour, todayString } from '../../utils/courts'
import './Reservations.css'

// Convierte una cancha tal como llega de la API al formato que usa esta página
const toViewCourt = (court) => ({
  id: court._id,
  name: court.name,
  price: court.pricePerHour,
  type: getCourtTypeLabel(court.type),
  desc: court.description,
  img: getCourtImage(court),
})

const emptyForm = { court: '', date: '', startHour: '', endHour: '' }

function Reservations() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courts, setCourts] = useState([])
  const [loadingCourts, setLoadingCourts] = useState(true)
  const [form, setForm] = useState(emptyForm)
  // Horas del día elegido: [{ hour: 18, available: false, reason: 'RESERVED' }, ...]
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showCourtModal, setShowCourtModal] = useState(false)
  const [savedReservation, setSavedReservation] = useState(null)

  // 1. Al abrir la página se piden las canchas a la API.
  //    Si se llegó desde "Reservar Ahora" (?court=Cancha Central), esa cancha queda elegida.
  useEffect(() => {
    api.getCourts()
      .then((data) => {
        const list = data.map(toViewCourt)
        setCourts(list)
        const courtName = new URLSearchParams(window.location.search).get('court')
        const preselected = list.find((c) => c.name === courtName)
        if (preselected) setForm((prev) => ({ ...prev, court: preselected.id }))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingCourts(false))
  }, [])

  // 2. Cada vez que cambian la cancha o la fecha, se piden las horas libres
  const loadSlots = (courtId, date) =>
    api.getAvailability(courtId, date)
      .then((data) => setSlots(data.slots))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSlots(false))

  useEffect(() => {
    if (form.court && form.date) {
      loadSlots(form.court, form.date)
    }
  }, [form.court, form.date])

  const selectedCourt = courts.find((c) => c.id === form.court)
  const hasSlots = Boolean(form.court && form.date && slots.length)
  const isAvailable = (hour) => slots.find((s) => s.hour === hour)?.available

  // Hora de fin: desde la hora siguiente al inicio hasta la primera hora ocupada
  const endHours = []
  if (form.startHour !== '') {
    for (let h = Number(form.startHour) + 1; h <= 23; h++) {
      endHours.push(h)
      if (h === 23 || !isAvailable(h)) break
    }
  }

  const duration = form.startHour !== '' && form.endHour !== ''
    ? Number(form.endHour) - Number(form.startHour)
    : 0

  const total = selectedCourt ? selectedCourt.price * duration : 0

  const handleChange = (e) => {
    const { name, value } = e.target
    setError('')
    if (name === 'date') {
      setSlots([])
      setLoadingSlots(Boolean(form.court && value))
      setForm((prev) => ({ ...prev, date: value, startHour: '', endHour: '' }))
    } else if (name === 'startHour') {
      setForm((prev) => ({ ...prev, startHour: value, endHour: '' }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectCourt = (court) => {
    setError('')
    setSlots([])
    setLoadingSlots(Boolean(form.date))
    setForm((prev) => ({ ...prev, court: court.id, startHour: '', endHour: '' }))
    setShowCourtModal(false)
  }

  // 3. Se envía la reserva a la API: ella comprueba que el horario siga libre
  const handleSubmit = async () => {
    if (!form.court || !form.date || form.startHour === '' || form.endHour === '') {
      setError('Elige la cancha, la fecha y el horario.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const reservation = await api.createReservation({
        courtId: form.court,
        date: form.date,
        startHour: Number(form.startHour),
        endHour: Number(form.endHour),
      })
      setSavedReservation(reservation)
    } catch (err) {
      setError(err.message)
      // Si alguien reservó esa hora mientras tanto, se actualizan las horas libres
      if (err.status === 409) {
        setForm((prev) => ({ ...prev, startHour: '', endHour: '' }))
        setLoadingSlots(true)
        loadSlots(form.court, form.date)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSavedReservation(null)
    setSlots([])
    setForm(emptyForm)
  }

  const slotLabel = (slot) => {
    if (slot.reason === 'RESERVED') return ' (ocupada)'
    if (slot.reason === 'PAST') return ' (ya pasó)'
    return ''
  }

  return (
    <div className="reservations-page">

      <div className="reservations-header">
        <div className="container">
          <h1>Reservar Cancha</h1>
          <p>Completa el formulario y asegura tu horario preferido</p>
        </div>
      </div>

      <div className="container reservations-body">
        <div className="reservations-grid">

          {/* Formulario */}
          <div className="res-form-card">
            <div className="res-section">
              <h5>Información de Reserva</h5>
              <p className="res-subtitle">Selecciona la cancha, fecha y horario para tu reserva</p>

              {/* Botón selector de cancha */}
              <div className="res-field full">
                <label>Cancha</label>
                <button
                  className={`res-court-selector-btn ${selectedCourt ? 'selected' : ''}`}
                  onClick={() => setShowCourtModal(true)}
                  disabled={loadingCourts}
                >
                  {selectedCourt ? (
                    <>
                      <img src={selectedCourt.img} alt={selectedCourt.name} />
                      <div className="res-court-selector-info">
                        <span className="res-court-selector-name">{selectedCourt.name}</span>
                        <span className="res-court-selector-sub">
                          {selectedCourt.type} · {formatPrice(selectedCourt.price)}/hora
                        </span>
                      </div>
                      <i className="material-icons res-court-selector-change">edit</i>
                    </>
                  ) : (
                    <>
                      <div className="res-court-selector-placeholder">
                        <i className="material-icons">sports_tennis</i>
                      </div>
                      <span className="res-court-selector-text">
                        {loadingCourts ? 'Cargando canchas…' : 'Ver y elegir cancha'}
                      </span>
                      <i className="material-icons">chevron_right</i>
                    </>
                  )}
                </button>
              </div>

              {/* Preview grande */}
              {selectedCourt && (
                <div className="res-court-preview-large">
                  <img src={selectedCourt.img} alt={selectedCourt.name} />
                  <div className="res-court-preview-overlay">
                    <div className="res-court-preview-badge">
                      <i className="material-icons">
                        {selectedCourt.type === 'Interior' ? 'home' : 'wb_sunny'}
                      </i>
                      {selectedCourt.type}
                    </div>
                    <div className="res-court-preview-text">
                      <h6>{selectedCourt.name}</h6>
                      <p>{selectedCourt.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha */}
              <div className="res-field full" style={{ marginTop: '20px' }}>
                <label>Fecha</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  min={todayString()}
                  onChange={handleChange}
                />
              </div>

              {/* Rango de horas */}
              <div className="res-row">
                <div className="res-field">
                  <label>Hora de inicio</label>
                  <div className="res-select-wrapper">
                    <select
                      name="startHour"
                      value={form.startHour}
                      onChange={handleChange}
                      disabled={!hasSlots || loadingSlots}
                    >
                      <option value="">
                        {loadingSlots ? 'Cargando…' : hasSlots ? 'Desde' : 'Elige cancha y fecha'}
                      </option>
                      {slots.map((slot) => (
                        <option key={slot.hour} value={slot.hour} disabled={!slot.available}>
                          {formatHour(slot.hour)}{slotLabel(slot)}
                        </option>
                      ))}
                    </select>
                    <i className="material-icons">expand_more</i>
                  </div>
                </div>

                <div className="res-field">
                  <label>Hora de fin</label>
                  <div className="res-select-wrapper">
                    <select
                      name="endHour"
                      value={form.endHour}
                      onChange={handleChange}
                      disabled={form.startHour === ''}
                    >
                      <option value="">Hasta</option>
                      {endHours.map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)} ({h - Number(form.startHour)}h)
                        </option>
                      ))}
                    </select>
                    <i className="material-icons">expand_more</i>
                  </div>
                </div>
              </div>

              {hasSlots && !slots.some((s) => s.available) && (
                <p className="res-error">
                  <i className="material-icons">event_busy</i>
                  No quedan horas libres ese día en esta cancha. Prueba otra fecha o cancha.
                </p>
              )}

              {duration > 0 && (
                <div className="res-duration-badge">
                  <i className="material-icons">timer</i>
                  {duration} hora{duration > 1 ? 's' : ''} de reserva
                  — Total: {formatPrice(total)}
                </div>
              )}
            </div>

            <hr className="res-divider" />

            {/* Los datos de contacto se toman de la sesión: ya no hay que escribirlos */}
            <div className="res-section">
              <h5>Información de Contacto</h5>
              <p className="res-subtitle">
                Usamos los datos de tu cuenta. Puedes cambiarlos en{' '}
                <a href="/perfil" onClick={(e) => { e.preventDefault(); navigate('/perfil') }}>Mi perfil</a>.
              </p>

              <div className="res-field full">
                <label>Nombre Completo</label>
                <input type="text" value={user?.name || ''} disabled />
              </div>

              <div className="res-row">
                <div className="res-field">
                  <label>Email</label>
                  <input type="email" value={user?.email || ''} disabled />
                </div>
                <div className="res-field">
                  <label>Teléfono</label>
                  <input type="tel" value={user?.phone || 'Sin teléfono'} disabled />
                </div>
              </div>
            </div>

            {error && (
              <p className="res-error" role="alert">
                <i className="material-icons">error_outline</i>
                {error}
              </p>
            )}

            <button className="res-btn-confirm" onClick={handleSubmit} disabled={submitting}>
              <i className="material-icons">{submitting ? 'hourglass_empty' : 'check'}</i>
              {submitting ? 'Reservando…' : 'Confirmar Reserva'}
            </button>
          </div>

          {/* Resumen */}
          <div className="res-summary-card">
            <h5>Resumen de Reserva</h5>
            <div className="res-summary-rows">
              <div className="res-summary-row">
                <span>Cancha</span>
                <span>{selectedCourt ? selectedCourt.name : '—'}</span>
              </div>
              <div className="res-summary-row">
                <span>Fecha</span>
                <span>{form.date || '—'}</span>
              </div>
              <div className="res-summary-row">
                <span>Desde</span>
                <span>{form.startHour !== '' ? formatHour(Number(form.startHour)) : '—'}</span>
              </div>
              <div className="res-summary-row">
                <span>Hasta</span>
                <span>{form.endHour !== '' ? formatHour(Number(form.endHour)) : '—'}</span>
              </div>
              <div className="res-summary-row">
                <span>Duración</span>
                <span>{duration > 0 ? `${duration}h` : '—'}</span>
              </div>
            </div>

            <div className="res-summary-total">
              <span>Total</span>
              <span className="res-total-price">{formatPrice(total)}</span>
            </div>

            <div className="res-policies">
              <p><strong>Políticas de Reserva</strong></p>
              <ul>
                <li>Puedes cancelar desde tu perfil antes de la hora de inicio</li>
                <li>Llega 10 minutos antes de tu reserva</li>
                <li>Equipamiento básico incluido</li>
                <li>Mínimo 1 hora de reserva</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Modal selector de canchas */}
      {showCourtModal && (
        <div className="court-modal-overlay" onClick={() => setShowCourtModal(false)}>
          <div className="court-modal" onClick={e => e.stopPropagation()}>

            <div className="court-modal-header">
              <h5>Selecciona tu Cancha</h5>
              <button className="court-modal-close" onClick={() => setShowCourtModal(false)}>
                <i className="material-icons">close</i>
              </button>
            </div>

            <div className="court-modal-grid">
              {courts.map(court => (
                <div
                  key={court.id}
                  className={`court-modal-card ${form.court === court.id ? 'active' : ''}`}
                  onClick={() => handleSelectCourt(court)}
                >
                  <div className="court-modal-img">
                    <img src={court.img} alt={court.name} />
                    <span className="court-modal-badge">
                      <i className="material-icons">
                        {court.type === 'Interior' ? 'home' : 'wb_sunny'}
                      </i>
                      {court.type}
                    </span>
                    {form.court === court.id && (
                      <div className="court-modal-selected-check">
                        <i className="material-icons">check_circle</i>
                      </div>
                    )}
                  </div>
                  <div className="court-modal-info">
                    <div className="court-modal-title-row">
                      <span className="court-modal-name">{court.name}</span>
                      <span className="court-modal-price">{formatPrice(court.price)}/h</span>
                    </div>
                    <p className="court-modal-desc">{court.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Modal confirmación */}
      {savedReservation && (
        <div className="res-modal-overlay" onClick={handleClose}>
          <div className="res-modal" onClick={e => e.stopPropagation()}>
            <div className="res-modal-icon">
              <i className="material-icons">check_circle</i>
            </div>
            <h4>¡Reserva Confirmada!</h4>
            <p>Tu reserva ha sido registrada exitosamente.</p>
            <div className="res-modal-details">
              <p><strong>Cancha:</strong> {savedReservation.court.name}</p>
              <p><strong>Fecha:</strong> {savedReservation.date}</p>
              <p><strong>Horario:</strong> {formatHour(savedReservation.startHour)} – {formatHour(savedReservation.endHour)}</p>
              <p><strong>Duración:</strong> {savedReservation.endHour - savedReservation.startHour}h</p>
              <p><strong>Total:</strong> {formatPrice(savedReservation.totalPrice)}</p>
            </div>
            <button className="res-modal-btn" onClick={() => navigate('/perfil')}>Ver mis reservas</button>
            <button className="res-modal-btn res-modal-btn-secondary" onClick={handleClose}>Hacer otra reserva</button>
          </div>
        </div>
      )}

    </div>
  )
}

export default Reservations
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import PaymentSimulator from '../../components/PaymentSimulator/PaymentSimulator'
import './Tournaments.css'

import t1 from '../../img/Torneo1.png'
import t2 from '../../img/Torneo2.png'
import t3 from '../../img/Torneo3.png'

// Las imágenes siguen en el frontend: se asocian a cada torneo por su nombre
const tournamentImages = {
  'Copa PadelZone 2026': t1,
  'Torneo Amateur Summer': t2,
  'Liga Comunidad PadelZone': t3,
}

const categoryColors = {
  'Profesional': '#1565c0',
  'Amateur': '#00897b',
  'Comunidad': '#6a1b9a'
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatPrice = (p) => p ? `$${p.toLocaleString('es-CO')}` : '$0'

const PAYMENT_METHOD_LABELS = {
  CARD: 'Tarjeta (simulada)',
  PSE: 'PSE (simulado)',
  CASH: 'Efectivo (pendiente)',
}

// Convierte un torneo tal como llega de la API al formato que usa esta página
const toViewTournament = (t) => ({
  id: t._id,
  img: tournamentImages[t.name] || t.imageUrl || t1,
  name: t.name,
  desc: t.description,
  date: t.startDate,
  endDate: t.endDate,
  category: t.category,
  prize: formatPrice(t.prize),
  fee: t.fee,
  spots: t.capacity,
  spotsLeft: t.spotsLeft,
  location: t.location,
  level: t.level,
})

const toViewRegistration = (r) => ({
  id: r._id,
  tournamentId: r.tournament._id,
  tournamentName: r.tournament.name,
  tournamentDate: r.tournament.startDate,
  tournamentEndDate: r.tournament.endDate,
  category: r.tournament.category,
  prize: formatPrice(r.tournament.prize),
  fee: r.tournament.fee,
  amount: r.amount,
  paymentMethod: r.paymentMethod,
  paymentStatus: r.paymentStatus,
  level: r.level,
})

function Tournaments() {
  const { user, isAuthenticated } = useAuth()

  const [tournaments, setTournaments] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedTournament, setSelectedTournament] = useState(null)
  const [step, setStep] = useState('form')
  const [showModal, setShowModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [activeTab, setActiveTab] = useState('active')
  const [cancelTarget, setCancelTarget] = useState(null)

  const [form, setForm] = useState({ level: '' })
  const [formError, setFormError] = useState('')

  const [paymentMethod, setPaymentMethod] = useState('CARD')
  const [paymentOutcome, setPaymentOutcome] = useState('APPROVED')
  const [paymentError, setPaymentError] = useState('')
  const [paying, setPaying] = useState(false)

  // Torneos (con cupos reales) y, si hay sesión, mis inscripciones
  const loadData = () =>
    Promise.all([
      api.getTournaments(),
      isAuthenticated ? api.getMyTournamentRegistrations() : [],
    ])
      .then(([tournamentsData, registrationsData]) => {
        setTournaments(tournamentsData.map(toViewTournament))
        setRegistrations(registrationsData.map(toViewRegistration))
        setLoadError('')
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  const userRegistrations = registrations

  const isRegistered = (tournamentId) =>
    registrations.some(r => r.tournamentId === tournamentId)

  const handleOpenModal = (tournament) => {
    setSelectedTournament(tournament)
    setForm({ level: '' })
    setPaymentMethod('CARD')
    setPaymentOutcome('APPROVED')
    setFormError('')
    setPaymentError('')
    setStep('form')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedTournament(null)
    setStep('form')
  }

  const handleNextStep = () => {
    if (!form.level) {
      setFormError('Selecciona tu nivel de juego.')
      return
    }
    setFormError('')
    setStep('payment')
  }

  const handlePayment = async () => {
    setPaymentError('')
    if (paymentMethod !== 'CASH' && paymentOutcome === 'DECLINED') {
      setPaymentError('La transacción de prueba fue rechazada. No se registró la inscripción.')
      return
    }
    setPaying(true)

    try {
      await api.registerToTournament(selectedTournament.id, { level: form.level, paymentMethod })
      await loadData()
      setShowModal(false)
      setSuccessMessage(paymentMethod === 'CASH'
        ? 'Inscripción confirmada; el pago en efectivo queda pendiente.'
        : '¡Inscripción y pago simulado confirmados!')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3500)
    } catch (err) {
      setPaymentError(err.message)
      loadData()
    } finally {
      setPaying(false)
    }
  }

  const handleCancelRegistration = async (id) => {
    try {
      await api.cancelTournamentRegistration(id)
      await loadData()
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setCancelTarget(null)
    }
  }

  const spotsPercent = (t) => ((t.spots - t.spotsLeft) / t.spots) * 100

  return (
    <div className="tournaments-page">

      <div className="tournaments-header">
        <div className="container">
          <h1>Torneos y Competiciones</h1>
          <p>Participa en nuestros torneos y demuestra tu nivel en la cancha</p>
        </div>
      </div>

      <div className="container tournaments-body">

        {isAuthenticated && (
          <div className="tournaments-tabs">
            <button
              className={`tournaments-tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <i className="material-icons">emoji_events</i>
              Torneos Disponibles
            </button>
            <button
              className={`tournaments-tab ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              <i className="material-icons">how_to_reg</i>
              Mis Inscripciones
              {userRegistrations.length > 0 && (
                <span className="tab-count">{userRegistrations.length}</span>
              )}
            </button>
          </div>
        )}

        {loading && (
          <div className="tournaments-empty">
            <i className="material-icons spinning">refresh</i>
            <p>Cargando torneos…</p>
          </div>
        )}

        {loadError && (
          <div className="tournament-form-error">
            <i className="material-icons">error_outline</i>
            {loadError}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="tournaments-grid">
            {tournaments.map(tournament => (
              <div className="tournament-card" key={tournament.id}>
                <div className="tournament-img-wrapper">
                  <img src={tournament.img} alt={tournament.name} />
                  <span
                    className="tournament-category-badge"
                    style={{ backgroundColor: categoryColors[tournament.category] }}
                  >
                    {tournament.category}
                  </span>
                  {isRegistered(tournament.id) && (
                    <div className="tournament-registered-badge">
                      <i className="material-icons">check_circle</i>
                      Inscrito
                    </div>
                  )}
                </div>

                <div className="tournament-info">
                  <div className="tournament-title-row">
                    <h5>{tournament.name}</h5>
                    <span className="tournament-fee">{formatPrice(tournament.fee)}</span>
                  </div>
                  <p className="tournament-desc">{tournament.desc}</p>

                  <div className="tournament-details">
                    <div className="tournament-detail">
                      <i className="material-icons">calendar_today</i>
                      <span>{formatDate(tournament.date)} – {formatDate(tournament.endDate)}</span>
                    </div>
                    <div className="tournament-detail">
                      <i className="material-icons">location_on</i>
                      <span>{tournament.location}</span>
                    </div>
                    <div className="tournament-detail">
                      <i className="material-icons">fitness_center</i>
                      <span>{tournament.level}</span>
                    </div>
                    <div className="tournament-detail prize">
                      <i className="material-icons">emoji_events</i>
                      <span>Premio: {tournament.prize}</span>
                    </div>
                  </div>

                  <div className="tournament-spots">
                    <div className="tournament-spots-header">
                      <span>Cupos disponibles</span>
                      <span className="spots-count">{tournament.spotsLeft} / {tournament.spots}</span>
                    </div>
                    <div className="tournament-progress">
                      <div
                        className="tournament-progress-bar"
                        style={{ width: `${spotsPercent(tournament)}%` }}
                      />
                    </div>
                  </div>

                  {isRegistered(tournament.id) ? (
                    <button className="tournament-btn-registered" disabled>
                      <i className="material-icons">check</i>
                      Ya estás inscrito
                    </button>
                  ) : tournament.spotsLeft === 0 ? (
                    <button className="tournament-btn-full" disabled>
                      <i className="material-icons">block</i>
                      Cupos agotados
                    </button>
                  ) : (
                    <button
                      className="tournament-btn"
                      onClick={() => isAuthenticated
                        ? handleOpenModal(tournament)
                        : window.location.href = '/login'
                      }
                    >
                      <i className="material-icons">how_to_reg</i>
                      {isAuthenticated
                        ? `Inscribirme — ${formatPrice(tournament.fee)}`
                        : 'Inicia sesión para inscribirte'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'mine' && (
          <div className="my-registrations">
            {userRegistrations.length === 0 ? (
              <div className="tournaments-empty">
                <i className="material-icons">emoji_events</i>
                <h5>No tienes inscripciones aún</h5>
                <p>Explora los torneos disponibles y participa</p>
                <button className="tournament-btn" onClick={() => setActiveTab('active')}>
                  Ver Torneos
                </button>
              </div>
            ) : (
              <div className="my-registrations-grid">
                {userRegistrations.map(reg => (
                  <div className="my-reg-card" key={reg.id}>
                    <div className="my-reg-header"
                      style={{ backgroundColor: categoryColors[reg.category] || '#010231' }}
                    >
                      <i className="material-icons">emoji_events</i>
                      <span>{reg.category}</span>
                    </div>
                    <div className="my-reg-body">
                      <h6>{reg.tournamentName}</h6>
                      <div className="my-reg-detail">
                        <i className="material-icons">calendar_today</i>
                        <span>{formatDate(reg.tournamentDate)} – {formatDate(reg.tournamentEndDate)}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">emoji_events</i>
                        <span>Premio: {reg.prize}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">fitness_center</i>
                        <span>Nivel: {reg.level}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">credit_card</i>
                        <span>{PAYMENT_METHOD_LABELS[reg.paymentMethod] || 'Método no registrado'}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">payments</i>
                        <span>Inscripción: {reg.amount == null ? 'Importe no registrado' : formatPrice(reg.amount)}</span>
                      </div>

                      <div className="my-reg-footer">
                        <span className={`my-reg-status ${reg.paymentStatus === 'PENDING' ? 'payment-pending' : ''}`}>
                          <i className="material-icons">{reg.paymentStatus === 'PENDING' ? 'schedule' : 'check_circle'}</i>
                          {reg.paymentStatus === 'PENDING' ? 'Pago pendiente' : reg.paymentStatus === 'PAID' ? 'Pagada' : 'Confirmada'}
                        </span>
                        <button
                          className="my-reg-cancel-btn"
                          onClick={() => setCancelTarget(reg.id)}
                        >
                          <i className="material-icons">cancel</i>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {showModal && selectedTournament && (
        <div className="tournament-modal-overlay" onClick={handleCloseModal}>
          <div className="tournament-modal" onClick={e => e.stopPropagation()}>

            <div className="tournament-modal-header">
              <div className="tournament-modal-steps">
                <span className={`modal-step ${step === 'form' ? 'active' : 'done'}`}>
                  <i className="material-icons">{step === 'form' ? 'person' : 'check'}</i>
                  Datos
                </span>
                <div className="modal-step-divider" />
                <span className={`modal-step ${step === 'payment' ? 'active' : ''}`}>
                  <i className="material-icons">credit_card</i>
                  Pago
                </span>
              </div>
              <button className="tournament-modal-close" onClick={handleCloseModal}>
                <i className="material-icons">close</i>
              </button>
            </div>

            {step === 'form' && (
              <div className="tournament-modal-body">
                <h6 className="modal-section-title">
                  Inscripción — {selectedTournament.name}
                </h6>

                {formError && (
                  <div className="tournament-form-error">
                    <i className="material-icons">error_outline</i>
                    {formError}
                  </div>
                )}

                <div className="tournament-form-field">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    disabled
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    value={user?.phone || 'Sin teléfono'}
                    disabled
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Tu nivel de juego</label>
                  <div className="tournament-select-wrapper">
                    <select
                      value={form.level}
                      onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                    >
                      <option value="">Selecciona tu nivel</option>
                      <option value="Principiante">Principiante</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                      <option value="Profesional">Profesional</option>
                    </select>
                    <i className="material-icons">expand_more</i>
                  </div>
                </div>

                <div className="tournament-modal-info">
                  <p><i className="material-icons">calendar_today</i> {formatDate(selectedTournament.date)}</p>
                  <p><i className="material-icons">emoji_events</i> Premio: {selectedTournament.prize}</p>
                  <p><i className="material-icons">group</i> {selectedTournament.spotsLeft} cupos disponibles</p>
                </div>

                <button className="tournament-modal-btn" onClick={handleNextStep}>
                  <i className="material-icons">arrow_forward</i>
                  Continuar al Pago — {formatPrice(selectedTournament.fee)}
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="tournament-modal-body">
                <h6 className="modal-section-title">Pago de Inscripción</h6>

                <div className="payment-summary">
                  <div className="payment-summary-row">
                    <span>Torneo</span>
                    <span>{selectedTournament.name}</span>
                  </div>
                  <div className="payment-summary-row total">
                    <span>Total a pagar</span>
                    <span>{formatPrice(selectedTournament.fee)}</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="tournament-form-error">
                    <i className="material-icons">error_outline</i>
                    {paymentError}
                  </div>
                )}

                <PaymentSimulator
                  method={paymentMethod}
                  onMethodChange={(method) => {
                    setPaymentMethod(method)
                    setPaymentError('')
                  }}
                  outcome={paymentOutcome}
                  onOutcomeChange={(outcome) => {
                    setPaymentOutcome(outcome)
                    setPaymentError('')
                  }}
                  cashLabel="Efectivo (pago pendiente)"
                  cashDescription="La inscripción quedará activa con pago pendiente en efectivo."
                />

                <div className="payment-actions">
                  <button className="payment-back-btn" onClick={() => setStep('form')} disabled={paying}>
                    <i className="material-icons">arrow_back</i>
                    Volver
                  </button>
                  <button className="tournament-modal-btn" onClick={handlePayment} disabled={paying}>
                    {paying ? (
                      <>
                        <i className="material-icons spinning">refresh</i>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="material-icons">payment</i>
                        {paymentMethod === 'CASH' ? 'Registrar pago pendiente' : `Simular pago ${formatPrice(selectedTournament.fee)}`}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="tournament-modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="cancel-modal-icon">
              <i className="material-icons">warning</i>
            </div>
            <h5>¿Cancelar inscripción?</h5>
            <p>Esta acción no se puede deshacer y perderás tu cupo.</p>
            <div className="cancel-modal-actions">
              <button
                className="cancel-modal-confirm"
                onClick={() => handleCancelRegistration(cancelTarget)}
              >
                Sí, cancelar
              </button>
              <button
                className="cancel-modal-dismiss"
                onClick={() => setCancelTarget(null)}
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="tournament-toast">
          <i className="material-icons">check_circle</i>
          {successMessage}
        </div>
      )}

    </div>
  )
}

export default Tournaments
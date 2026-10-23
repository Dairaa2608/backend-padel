import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './Tournaments.css'

import t1 from '../../img/Torneo1.png'
import t2 from '../../img/Torneo2.png'
import t3 from '../../img/Torneo3.png'

const tournaments = [
  {
    id: 1,
    img: t1,
    name: 'Copa PadelZone 2026',
    desc: 'El torneo más importante del año. Compite contra los mejores jugadores de la región.',
    date: '2026-06-15',
    endDate: '2026-06-20',
    category: 'Profesional',
    prize: '$2.000.000',
    fee: 50000,
    spots: 16,
    spotsLeft: 6,
    location: 'Canchas Premium e Interior',
    level: 'Avanzado'
  },
  {
    id: 2,
    img: t2,
    name: 'Torneo Amateur Summer',
    desc: 'Ideal para jugadores que dan sus primeros pasos en la competencia. ¡Anímate a participar!',
    date: '2026-07-05',
    endDate: '2026-07-07',
    category: 'Amateur',
    prize: '$800.000',
    fee: 30000,
    spots: 24,
    spotsLeft: 14,
    location: 'Canchas Recreativa y Express',
    level: 'Principiante / Intermedio'
  },
  {
    id: 3,
    img: t3,
    name: 'Liga Comunidad PadelZone',
    desc: 'Torneo mensual para miembros activos. Formato de liga con partidos cada fin de semana.',
    date: '2026-08-01',
    endDate: '2026-08-31',
    category: 'Comunidad',
    prize: '$500.000',
    fee: 20000,
    spots: 32,
    spotsLeft: 20,
    location: 'Todas las canchas',
    level: 'Todos los niveles'
  }
]

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

const formatCard = (val) =>
  val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

const formatExpiry = (val) =>
  val.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')

function Tournaments() {
  const { user, isAuthenticated } = useAuth()

  const [selectedTournament, setSelectedTournament] = useState(null)
  const [step, setStep] = useState('form')
  const [showModal, setShowModal] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [cancelTarget, setCancelTarget] = useState(null)
  const [, forceUpdate] = useState(0)

  const [form, setForm] = useState({ name: '', email: '', phone: '', level: '' })
  const [formError, setFormError] = useState('')

  const [payment, setPayment] = useState({ card: '', holder: '', expiry: '', cvv: '' })
  const [paymentError, setPaymentError] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    const handler = () => forceUpdate(n => n + 1)
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const getRegistrations = () =>
    JSON.parse(localStorage.getItem('padelzone_tournaments') || '[]')

  const userRegistrations = getRegistrations().filter(r => r.email === user?.email)

  const isRegistered = (tournamentId) =>
    getRegistrations().some(r => r.tournamentId === tournamentId && r.email === user?.email)

  const handleOpenModal = (tournament) => {
    setSelectedTournament(tournament)
    setForm({ name: user?.name || '', email: user?.email || '', phone: '', level: '' })
    setPayment({ card: '', holder: '', expiry: '', cvv: '' })
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
    if (!form.name || !form.email || !form.phone || !form.level) {
      setFormError('Por favor completa todos los campos.')
      return
    }
    setFormError('')
    setStep('payment')
  }

  const handlePayment = () => {
    const rawCard = payment.card.replace(/\s/g, '')
    if (rawCard.length < 16 || !payment.holder || !payment.expiry || payment.cvv.length < 3) {
      setPaymentError('Por favor completa todos los datos de pago.')
      return
    }
    setPaymentError('')
    setPaying(true)

    setTimeout(() => {
      const reservationId = Date.now()
      const createdAt = new Date().toISOString()

      const registration = {
        id: reservationId,
        tournamentId: selectedTournament.id,
        tournamentName: selectedTournament.name,
        tournamentDate: selectedTournament.date,
        tournamentEndDate: selectedTournament.endDate,
        category: selectedTournament.category,
        prize: selectedTournament.prize,
        fee: selectedTournament.fee,
        name: form.name,
        email: form.email,
        phone: form.phone,
        level: form.level,
        cardLast4: payment.card.replace(/\s/g, '').slice(-4),
        registeredAt: createdAt
      }

      const existing = getRegistrations()
      existing.push(registration)
      localStorage.setItem('padelzone_tournaments', JSON.stringify(existing))

      setPaying(false)
      setShowModal(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3500)
    }, 1800)
  }

  const handleCancelRegistration = (id) => {
    const all = getRegistrations()
    const updated = all.filter(r => r.id !== id)
    localStorage.setItem('padelzone_tournaments', JSON.stringify(updated))
    setCancelTarget(null)
    forceUpdate(n => n + 1)
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
                        <span>Pagado con tarjeta •••• {reg.cardLast4}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">payments</i>
                        <span>Inscripción: {formatPrice(reg.fee || 0)}</span>
                      </div>

                      <div className="my-reg-footer">
                        <span className="my-reg-status">
                          <i className="material-icons">check_circle</i>
                          Confirmada
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
                    placeholder="Tu nombre"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
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

                <div className="credit-card-preview">
                  <div className="credit-card-chip">
                    <i className="material-icons">contactless</i>
                  </div>
                  <div className="credit-card-number">
                    {payment.card || '•••• •••• •••• ••••'}
                  </div>
                  <div className="credit-card-bottom">
                    <div>
                      <p className="credit-card-label">Titular</p>
                      <p className="credit-card-value">
                        {payment.holder || 'NOMBRE APELLIDO'}
                      </p>
                    </div>
                    <div>
                      <p className="credit-card-label">Vence</p>
                      <p className="credit-card-value">{payment.expiry || 'MM/AA'}</p>
                    </div>
                  </div>
                </div>

                <div className="tournament-form-field">
                  <label>Número de tarjeta</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={payment.card}
                    maxLength={19}
                    onChange={e => setPayment(p => ({ ...p, card: formatCard(e.target.value) }))}
                  />
                </div>

                <div className="tournament-form-field">
                  <label>Nombre del titular</label>
                  <input
                    type="text"
                    placeholder="Como aparece en la tarjeta"
                    value={payment.holder}
                    onChange={e => setPayment(p => ({ ...p, holder: e.target.value.toUpperCase() }))}
                  />
                </div>

                <div className="payment-row">
                  <div className="tournament-form-field">
                    <label>Fecha de vencimiento</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      value={payment.expiry}
                      maxLength={5}
                      onChange={e => setPayment(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    />
                  </div>
                  <div className="tournament-form-field">
                    <label>CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      value={payment.cvv}
                      maxLength={4}
                      onChange={e => setPayment(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))}
                    />
                  </div>
                </div>

                <p className="payment-disclaimer">
                  <i className="material-icons">lock</i>
                  Pago simulado — ningún dato real es procesado
                </p>

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
                        Pagar {formatPrice(selectedTournament.fee)}
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
          ¡Inscripción y pago confirmados exitosamente!
        </div>
      )}

    </div>
  )
}

export default Tournaments
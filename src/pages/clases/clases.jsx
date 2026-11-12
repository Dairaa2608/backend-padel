import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { formatPrice, todayString } from '../../utils/courts'
import './clases.css'

import imgRegular from '../../img/regular.png'
import imgIntensiva from '../../img/intensivas.jpg'
import imgVerano from '../../img/niños.jpg'
import imgFinde from '../../img/Torneo1.png'
import imgProfeValentina from '../../img/profesora.jpg'
import imgprhombre from '../../img/hombre.png'
import imgprmujer from '../../img/profesora1.jpg'

// Las fotos siguen en el frontend: se asocian por nombre
const programImages = {
  'Clases Regulares': imgRegular,
  'Clases Intensivas': imgIntensiva,
  'Clases de Verano': imgVerano,
  'Clases Fin de Semana': imgFinde,
}

const coachPhotos = {
  'Sofía Restrepo': imgprmujer,
  'Andrés Quiroga': imgprhombre,
  'Valentina Salazar': imgProfeValentina,
}

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado']
const PARTY_SIZES = [1, 2, 4] // el pádel se juega en parejas: nunca 3
const MONTHLY_PARTY_SIZES = [2, 4]

// "2026-11-16" → "Lun, 16 de nov"
const dateLabel = (date) => {
  const label = new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const ageLabel = (g) => (g.maxAge === null ? `${g.minAge} años en adelante` : `${g.minAge} - ${g.maxAge} años`)
const peopleLabel = (n) => `${n} persona${n > 1 ? 's' : ''}`

// Convierte un programa tal como llega de la API al formato que usa esta página
const toViewProgram = (p) => ({
  id: p._id,
  tipo: p.type,
  nombre: p.name,
  descripcion: p.description,
  imagen: programImages[p.name] || p.imageUrl || imgRegular,
  horasSemana: p.hoursPerWeek,
  duracionClase: p.sessionHours,
  diasSemana: p.daysOfWeek,
  weekdays: p.weekdays,
  color: p.color || '#010231',
  horarios: p.scheduleSlots,
  grupos: p.groups.map((g) => ({
    id: g._id,
    edad: ageLabel(g),
    precio: g.monthlyPrice,
    capacidad: g.capacity,
    cuposLibres: g.spotsLeft,
    profesor: {
      nombre: g.coach.name,
      cargo: g.coach.title,
      foto: g.coach.photoUrl || coachPhotos[g.coach.name] || imgprhombre,
    },
  })),
})

const formatCard = (val) =>
  val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

const formatExpiry = (val) =>
  val.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')

const emptyPayment = { card: '', holder: '', expiry: '', cvv: '' }

function Clases() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [programas, setProgramas] = useState([])
  const [precioSuelta, setPrecioSuelta] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [activeTab, setActiveTab] = useState('active')
  const [misInscripciones, setMisInscripciones] = useState([])
  const [misClasesSueltas, setMisClasesSueltas] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null) // { kind: 'enrollment' | 'booking', id }
  const [toast, setToast] = useState('')

  // Modal de inscripción mensual o clase suelta
  const [modal, setModal] = useState(null) // { mode: 'MONTHLY' | 'SINGLE', clase, grupo }
  const [step, setStep] = useState('form')
  const [form, setForm] = useState({ nivel: '', fechaNacimiento: '', horario: '', fecha: '', personas: 2 })
  const [formError, setFormError] = useState('')
  const [fechas, setFechas] = useState([]) // próximos días con clase: [{ date, spotsLeft }]
  const [payment, setPayment] = useState(emptyPayment)
  const [sending, setSending] = useState(false)

  // Modal de clase de cortesía. Si se vuelve del registro o del login con
  // { openCourtesy: true }, el formulario se abre directamente.
  const [showCourtesy, setShowCourtesy] = useState(() => Boolean(location.state?.openCourtesy))
  const [courtesy, setCourtesy] = useState({ cedula: '', programId: '', groupId: '', fecha: '', horario: '', personas: 1 })
  const [courtesyError, setCourtesyError] = useState('')
  const [courtesyFechas, setCourtesyFechas] = useState([])

  /* ── Carga de datos ─────────────────────────────────── */

  const loadData = () =>
    Promise.all([
      api.getClasses(),
      isAuthenticated ? api.getMyClassEnrollments() : [],
      isAuthenticated ? api.getMyClassBookings() : [],
    ])
      .then(([catalogo, inscripciones, clases]) => {
        setProgramas(catalogo.programs.map(toViewProgram))
        setPrecioSuelta(catalogo.singleClassPrices)
        setMisInscripciones(inscripciones)
        setMisClasesSueltas(clases)
        setLoadError('')
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    loadData()
  }, [isAuthenticated])

  // Se borra la marca para que el formulario no se vuelva a abrir al recargar
  useEffect(() => {
    if (location.state?.openCourtesy) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state, location.pathname, navigate])

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3500)
  }

  /* ── Inscripción mensual y clase suelta ─────────────── */

  const openModal = (mode, clase, grupo) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/clases' } })
      return
    }
    setModal({ mode, clase, grupo })
    setForm({ nivel: '', fechaNacimiento: '', horario: clase.horarios[0], fecha: '', personas: mode === 'MONTHLY' ? 2 : 1 })
    setPayment(emptyPayment)
    setFormError('')
    setFechas([])
    setStep('form')
    // Para la clase suelta se piden los próximos días con clase de ese grupo
    if (mode === 'SINGLE') {
      api.getClassDates(clase.id, grupo.id)
        .then((data) => setFechas(data.dates))
        .catch((err) => setFormError(err.message))
    }
  }

  const closeModal = () => setModal(null)

  // Si cambia el número de personas y el día elegido ya no tiene cupo para todas, se quita
  const changePersonas = (n) => {
    const elegido = fechas.find((f) => f.date === form.fecha)
    setForm((p) => ({ ...p, personas: n, fecha: elegido && elegido.spotsLeft < n ? '' : p.fecha }))
    setFormError('')
  }

  const totalModal = modal
    ? modal.mode === 'MONTHLY' ? modal.grupo.precio * form.personas : precioSuelta[form.personas]
    : 0

  const handleNextStep = () => {
    if (modal.mode === 'MONTHLY' && (!form.nivel || !form.fechaNacimiento || !form.horario)) {
      setFormError('Completa tu nivel, fecha de nacimiento y horario.')
      return
    }
    if (modal.mode === 'MONTHLY' && modal.grupo.cuposLibres < form.personas) {
      setFormError(`Este grupo solo tiene ${modal.grupo.cuposLibres} cupos libres.`)
      return
    }
    if (modal.mode === 'SINGLE' && (!form.fecha || !form.horario)) {
      setFormError('Elige el día y el horario de la clase.')
      return
    }
    setFormError('')
    setStep('payment')
  }

  // El pago es simulado: los datos de la tarjeta solo se validan aquí y NUNCA se envían
  const handlePayment = async () => {
    if (payment.card.replace(/\s/g, '').length < 16 || !payment.holder || !payment.expiry || payment.cvv.length < 3) {
      setFormError('Por favor completa todos los datos de pago.')
      return
    }
    setFormError('')
    setSending(true)
    try {
      const { clase, grupo, mode } = modal
      if (mode === 'MONTHLY') {
        await api.enrollInClass({
          programId: clase.id, groupId: grupo.id, schedule: form.horario,
          level: form.nivel, birthDate: form.fechaNacimiento, partySize: form.personas,
        })
      } else {
        await api.bookClass({
          type: 'SINGLE', programId: clase.id, groupId: grupo.id,
          date: form.fecha, schedule: form.horario, partySize: form.personas,
        })
      }
      await loadData()
      setModal(null)
      showToast(mode === 'MONTHLY' ? '¡Inscripción confirmada!' : '¡Clase reservada!')
    } catch (err) {
      setFormError(err.message)
      setStep('form')
      loadData()
    } finally {
      setSending(false)
    }
  }

  /* ── Clase de cortesía ──────────────────────────────── */

  const openCourtesy = () => {
    if (!isAuthenticated) {
      // Hay que tener cuenta: se registra y vuelve aquí con el formulario abierto
      navigate('/registro', { state: { from: '/clases', openCourtesy: true } })
      return
    }
    setCourtesyError('')
    setShowCourtesy(true)
  }

  const courtesyProgram = programas.find((p) => p.id === courtesy.programId)

  const updateCourtesy = (changes) => {
    const next = { ...courtesy, ...changes }
    if (changes.programId !== undefined) {
      Object.assign(next, { groupId: '', horario: '', fecha: '' })
      setCourtesyFechas([])
    }
    if (changes.groupId !== undefined) {
      next.fecha = ''
      setCourtesyFechas([])
      if (next.programId && next.groupId) {
        api.getClassDates(next.programId, next.groupId)
          .then((data) => setCourtesyFechas(data.dates))
          .catch((err) => setCourtesyError(err.message))
      }
    }
    // Si cambia el número de personas y el día elegido ya no tiene cupo, se quita
    if (changes.personas !== undefined) {
      const elegido = courtesyFechas.find((f) => f.date === next.fecha)
      if (elegido && elegido.spotsLeft < changes.personas) next.fecha = ''
    }
    setCourtesy(next)
    setCourtesyError('')
  }

  const handleCourtesySubmit = async () => {
    const { cedula, programId, groupId, fecha, horario } = courtesy
    if (!/^\d{6,10}$/.test(cedula)) {
      setCourtesyError('Escribe tu cédula: solo números, entre 6 y 10 dígitos.')
      return
    }
    if (!programId || !groupId || !fecha || !horario) {
      setCourtesyError('Elige el programa, el grupo, el horario y el día.')
      return
    }
    setSending(true)
    try {
      await api.bookClass({
        type: 'COURTESY', programId, groupId, date: fecha,
        schedule: horario, partySize: courtesy.personas, cedula,
      })
      await loadData()
      setShowCourtesy(false)
      setCourtesy({ cedula: '', programId: '', groupId: '', fecha: '', horario: '', personas: 1 })
      setCourtesyFechas([])
      showToast('¡Tu clase de cortesía está confirmada! 🎾')
    } catch (err) {
      // Si la cédula o la cuenta ya usaron su cortesía, la API lo rechaza
      setCourtesyError(err.message)
    } finally {
      setSending(false)
    }
  }

  /* ── Cancelar ───────────────────────────────────────── */

  const handleCancel = async () => {
    try {
      if (cancelTarget.kind === 'enrollment') {
        await api.cancelClassEnrollment(cancelTarget.id)
      } else {
        await api.cancelClassBooking(cancelTarget.id)
      }
      await loadData()
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setCancelTarget(null)
    }
  }

  const activeBookings = misClasesSueltas.filter((b) => b.status === 'ACTIVE')
  const totalMisClases = misInscripciones.length + activeBookings.length

  const groupName = (program, groupId) => {
    const group = program?.groups?.find((g) => g._id === groupId)
    return group ? ageLabel(group) : ''
  }

  return (
    <div className="clases-page">
      <div className="clases-hero">
        <h1>Clases de Padel</h1>
        <p>Encuentra el programa perfecto para tu edad y nivel. Aprende con los mejores entrenadores.</p>
      </div>

      <div className="clases-container container">

        {/* Banner: clase de cortesía */}
        <div className="cortesia-banner">
          <div className="cortesia-banner-text">
            <i className="material-icons">card_giftcard</i>
            <div>
              <h3>¿Es tu primera vez con nosotros?</h3>
              <p>Prueba una clase gratis, solo o con tu pareja de juego (1, 2 o 4 personas).</p>
            </div>
          </div>
          <button className="cortesia-banner-btn" onClick={openCourtesy}>
            Quiero mi clase de cortesía
          </button>
        </div>

        {isAuthenticated && (
          <div className="tournaments-tabs">
            <button
              className={`tournaments-tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              <i className="material-icons">school</i>
              Clases Disponibles
            </button>
            <button
              className={`tournaments-tab ${activeTab === 'mine' ? 'active' : ''}`}
              onClick={() => setActiveTab('mine')}
            >
              <i className="material-icons">how_to_reg</i>
              Mis Clases
              {totalMisClases > 0 && <span className="tab-count">{totalMisClases}</span>}
            </button>
          </div>
        )}

        {loading && <p className="clases-status">Cargando clases…</p>}
        {loadError && (
          <div className="tournament-form-error">
            <i className="material-icons">error_outline</i>
            {loadError}
          </div>
        )}

        {activeTab === 'active' && programas.map(clase => (
          <div className="clase-card" key={clase.id}>
            <div className="clase-card-imagen">
              <img src={clase.imagen} alt={clase.nombre} />
              <span className="clase-badge" style={{ backgroundColor: clase.color }}>
                {clase.tipo}
              </span>
            </div>

            <div className="clase-card-body">
              <h2 className="clase-titulo">{clase.nombre}</h2>
              <p className="clase-descripcion">{clase.descripcion}</p>

              <div className="clase-info-row">
                <span><i className="material-icons">schedule</i> {clase.duracionClase}h por clase</span>
                <span><i className="material-icons">fitness_center</i> {clase.horasSemana}h / semana</span>
                <span><i className="material-icons">calendar_today</i> {clase.diasSemana}</span>
              </div>

              <div className="clase-grupos">
                {clase.grupos.map(grupo => {
                  const lleno = grupo.cuposLibres === 0
                  const mensualPosible = grupo.cuposLibres >= Math.min(...MONTHLY_PARTY_SIZES)
                  return (
                    <div className={`clase-grupo ${lleno ? 'sin-cupo' : ''}`} key={grupo.id}>
                      <div className="grupo-header">
                        <span className="grupo-edad">
                          <i className="material-icons">group</i>
                          {grupo.edad}
                        </span>
                        <span className="grupo-precio">{formatPrice(grupo.precio)} / mes</span>
                      </div>

                      <div className="grupo-profesor">
                        <img src={grupo.profesor.foto} alt={grupo.profesor.nombre} className="profesor-foto" />
                        <div>
                          <p className="profesor-nombre">{grupo.profesor.nombre}</p>
                          <p className="profesor-cargo">{grupo.profesor.cargo}</p>
                        </div>
                      </div>

                      <div className="grupo-cupos">
                        <span>Cupos libres: {grupo.cuposLibres} / {grupo.capacidad}</span>
                        <div className="cupos-barra">
                          <div
                            className="cupos-fill"
                            style={{
                              width: `${((grupo.capacidad - grupo.cuposLibres) / grupo.capacidad) * 100}%`,
                              backgroundColor: clase.color
                            }}
                          />
                        </div>
                        {lleno && <small className="grupo-aviso">Grupo lleno</small>}
                      </div>

                      <button
                        className="btn-inscribir"
                        style={{ backgroundColor: clase.color }}
                        disabled={!mensualPosible}
                        onClick={() => openModal('MONTHLY', clase, grupo)}
                      >
                        <i className="material-icons">how_to_reg</i>
                        Inscripción mensual · {formatPrice(grupo.precio)} c/u
                      </button>
                      <button
                        className="btn-suelta"
                        style={{ color: clase.color, borderColor: clase.color }}
                        disabled={lleno}
                        onClick={() => openModal('SINGLE', clase, grupo)}
                      >
                        <i className="material-icons">event</i>
                        Clase suelta · desde {formatPrice(precioSuelta[1])}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {activeTab === 'mine' && (
          <div className="my-registrations">
            {totalMisClases === 0 ? (
              <div className="tournaments-empty">
                <i className="material-icons">school</i>
                <h5>No tienes clases todavía</h5>
                <p>Explora las clases disponibles y encuentra la ideal para ti</p>
                <button className="tournament-btn" onClick={() => setActiveTab('active')}>
                  Ver Clases
                </button>
              </div>
            ) : (
              <div className="my-registrations-grid">
                {misInscripciones.map(ins => (
                  <div className="my-reg-card" key={ins._id}>
                    <div className="my-reg-header" style={{ backgroundColor: ins.program?.color || '#010231' }}>
                      <i className="material-icons">school</i>
                      <span>Mensual</span>
                    </div>
                    <div className="my-reg-body">
                      <h6>{ins.program?.name}</h6>
                      <div className="my-reg-detail">
                        <i className="material-icons">calendar_today</i>
                        <span>{ins.program?.daysOfWeek} · {ins.schedule}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">group</i>
                        <span>Grupo: {groupName(ins.program, ins.group)} · {peopleLabel(ins.partySize)}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">fitness_center</i>
                        <span>Nivel: {ins.level}</span>
                      </div>
                      <div className="my-reg-footer">
                        <span className="my-reg-status">
                          <i className="material-icons">check_circle</i>
                          Activa
                        </span>
                        <button className="my-reg-cancel-btn" onClick={() => setCancelTarget({ kind: 'enrollment', id: ins._id })}>
                          <i className="material-icons">cancel</i>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeBookings.map(b => (
                  <div className="my-reg-card" key={b._id}>
                    <div className="my-reg-header" style={{ backgroundColor: b.program?.color || '#010231' }}>
                      <i className="material-icons">{b.type === 'COURTESY' ? 'card_giftcard' : 'event'}</i>
                      <span>{b.type === 'COURTESY' ? 'Cortesía' : 'Clase suelta'}</span>
                    </div>
                    <div className="my-reg-body">
                      <h6>{b.program?.name}</h6>
                      <div className="my-reg-detail">
                        <i className="material-icons">calendar_today</i>
                        <span>{dateLabel(b.date)} · {b.schedule}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">group</i>
                        <span>Grupo: {groupName(b.program, b.group)} · {peopleLabel(b.partySize)}</span>
                      </div>
                      <div className="my-reg-detail">
                        <i className="material-icons">payments</i>
                        <span>{b.price === 0 ? 'Gratis' : formatPrice(b.price)}</span>
                      </div>
                      <div className="my-reg-footer">
                        <span className="my-reg-status">
                          <i className="material-icons">check_circle</i>
                          Confirmada
                        </span>
                        {b.date >= todayString() && (
                          <button className="my-reg-cancel-btn" onClick={() => setCancelTarget({ kind: 'booking', id: b._id })}>
                            <i className="material-icons">cancel</i>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal: inscripción mensual o clase suelta */}
      {modal && (
        <div className="tournament-modal-overlay" onClick={closeModal}>
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
              <button className="tournament-modal-close" onClick={closeModal}>
                <i className="material-icons">close</i>
              </button>
            </div>

            {formError && (
              <div className="tournament-form-error">
                <i className="material-icons">error_outline</i>
                {formError}
              </div>
            )}

            {step === 'form' && (
              <div className="tournament-modal-body">
                <h6 className="modal-section-title">
                  {modal.mode === 'MONTHLY' ? 'Inscripción mensual' : 'Clase suelta'} - {modal.clase.nombre} ({modal.grupo.edad})
                </h6>

                <div className="tournament-form-field">
                  <label>Titular</label>
                  <input type="text" value={`${user?.name || ''} · ${user?.email || ''}`} disabled />
                </div>

                <div className="tournament-form-field">
                  <label>¿Cuántas personas vienen?</label>
                  <PersonasSelector
                    opciones={modal.mode === 'MONTHLY' ? MONTHLY_PARTY_SIZES : PARTY_SIZES}
                    value={form.personas}
                    onChange={changePersonas}
                    disabledIf={(n) => modal.mode === 'MONTHLY' && n > modal.grupo.cuposLibres}
                  />
                  <small className="personas-ayuda">
                    {modal.mode === 'MONTHLY'
                      ? `Se juega en parejas: 2 o 4 personas · ${formatPrice(modal.grupo.precio)} por persona al mes`
                      : `1 persona ${formatPrice(precioSuelta[1])} · 2 personas ${formatPrice(precioSuelta[2])} · 4 personas ${formatPrice(precioSuelta[4])}`}
                  </small>
                </div>

                {modal.mode === 'SINGLE' && (
                  <div className="tournament-form-field">
                    <label>Elige el día ({modal.clase.diasSemana})</label>
                    <DiasDisponibles fechas={fechas} value={form.fecha} personas={form.personas}
                      onChange={(fecha) => setForm(p => ({ ...p, fecha }))} />
                  </div>
                )}

                {modal.mode === 'MONTHLY' && (
                  <>
                    <div className="tournament-form-field">
                      <label>Fecha de nacimiento del titular</label>
                      <input type="date" value={form.fechaNacimiento} onChange={e => setForm(p => ({ ...p, fechaNacimiento: e.target.value }))} />
                    </div>
                    <div className="tournament-form-field">
                      <label>Nivel de juego</label>
                      <div className="tournament-select-wrapper">
                        <select value={form.nivel} onChange={e => setForm(p => ({ ...p, nivel: e.target.value }))}>
                          <option value="">Selecciona tu nivel</option>
                          {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <i className="material-icons">expand_more</i>
                      </div>
                    </div>
                  </>
                )}

                <div className="tournament-form-field">
                  <label>Horario</label>
                  <div className="tournament-select-wrapper">
                    <select value={form.horario} onChange={e => setForm(p => ({ ...p, horario: e.target.value }))}>
                      {modal.clase.horarios.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <i className="material-icons">expand_more</i>
                  </div>
                </div>

                <div className="tournament-modal-info">
                  <p><i className="material-icons">calendar_today</i> {modal.clase.diasSemana}</p>
                  <p><i className="material-icons">emoji_events</i> Profesor: {modal.grupo.profesor.nombre}</p>
                </div>

                <button className="tournament-modal-btn" style={{ backgroundColor: modal.clase.color }} onClick={handleNextStep}>
                  <i className="material-icons">arrow_forward</i>
                  Continuar al Pago - {formatPrice(totalModal)}
                </button>
              </div>
            )}

            {step === 'payment' && (
              <div className="tournament-modal-body">
                <h6 className="modal-section-title">Pago</h6>

                <div className="payment-summary">
                  <div className="payment-summary-row">
                    <span>{modal.mode === 'MONTHLY' ? 'Inscripción mensual' : `Clase suelta · ${dateLabel(form.fecha)}`}</span>
                    <span>{modal.clase.nombre}</span>
                  </div>
                  <div className="payment-summary-row">
                    <span>Personas</span>
                    <span>{form.personas}</span>
                  </div>
                  <div className="payment-summary-row total">
                    <span>Total</span>
                    <span style={{ color: modal.clase.color }}>{formatPrice(totalModal)}</span>
                  </div>
                </div>

                <div className="credit-card-preview" style={{ background: modal.clase.color }}>
                  <div className="credit-card-chip">
                    <i className="material-icons">contactless</i>
                  </div>
                  <div className="credit-card-number">
                    {payment.card || 'xxxx xxxx xxxx xxxx'}
                  </div>
                  <div className="credit-card-bottom">
                    <div>
                      <p className="credit-card-label">Titular</p>
                      <p className="credit-card-value">{payment.holder || 'NOMBRE APELLIDO'}</p>
                    </div>
                    <div>
                      <p className="credit-card-label">Vence</p>
                      <p className="credit-card-value">{payment.expiry || 'MM/AA'}</p>
                    </div>
                  </div>
                </div>

                <div className="tournament-form-field">
                  <label>Número de tarjeta</label>
                  <input type="text" placeholder="1234 5678 9012 3456" value={payment.card} maxLength={19}
                    onChange={e => setPayment(p => ({ ...p, card: formatCard(e.target.value) }))} />
                </div>

                <div className="tournament-form-field">
                  <label>Nombre del titular</label>
                  <input type="text" placeholder="Como aparece en la tarjeta" value={payment.holder}
                    onChange={e => setPayment(p => ({ ...p, holder: e.target.value.toUpperCase() }))} />
                </div>

                <div className="payment-row">
                  <div className="tournament-form-field">
                    <label>Fecha de vencimiento</label>
                    <input type="text" placeholder="MM/AA" value={payment.expiry} maxLength={5}
                      onChange={e => setPayment(p => ({ ...p, expiry: formatExpiry(e.target.value) }))} />
                  </div>
                  <div className="tournament-form-field">
                    <label>CVV</label>
                    <input type="password" placeholder="xxx" value={payment.cvv} maxLength={4}
                      onChange={e => setPayment(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>

                <p className="payment-disclaimer">
                  <i className="material-icons">lock</i>
                  Pago simulado - los datos de la tarjeta no se envían ni se guardan
                </p>

                <div className="payment-actions">
                  <button className="payment-back-btn" onClick={() => setStep('form')} disabled={sending}>
                    <i className="material-icons">arrow_back</i>
                    Volver
                  </button>
                  <button className="tournament-modal-btn" style={{ backgroundColor: modal.clase.color }} onClick={handlePayment} disabled={sending}>
                    <i className="material-icons">{sending ? 'hourglass_empty' : 'payment'}</i>
                    {sending ? 'Procesando...' : `Pagar ${formatPrice(totalModal)}`}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Modal: clase de cortesía */}
      {showCourtesy && isAuthenticated && (
        <div className="tournament-modal-overlay" onClick={() => setShowCourtesy(false)}>
          <div className="tournament-modal" onClick={e => e.stopPropagation()}>
            <div className="tournament-modal-header">
              <h6 className="modal-section-title">
                <i className="material-icons">card_giftcard</i> Clase de cortesía
              </h6>
              <button className="tournament-modal-close" onClick={() => setShowCourtesy(false)}>
                <i className="material-icons">close</i>
              </button>
            </div>

            <div className="tournament-modal-body">
              <p className="cortesia-nota">
                Es gratis y solo se puede usar <strong>una vez por persona</strong>. Con tu cédula
                comprobamos que sea tu primera clase (se guarda protegida: nadie puede leerla).
              </p>

              {courtesyError && (
                <div className="tournament-form-error">
                  <i className="material-icons">error_outline</i>
                  {courtesyError}
                </div>
              )}

              <div className="tournament-form-field">
                <label>Titular</label>
                <input type="text" value={`${user?.name || ''} · ${user?.email || ''}`} disabled />
              </div>

              <div className="tournament-form-field">
                <label>Número de cédula</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Solo números"
                  maxLength={10}
                  value={courtesy.cedula}
                  onChange={e => updateCourtesy({ cedula: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="tournament-form-field">
                <label>Programa</label>
                <div className="tournament-select-wrapper">
                  <select value={courtesy.programId} onChange={e => updateCourtesy({ programId: e.target.value })}>
                    <option value="">Elige un programa</option>
                    {programas.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.diasSemana})</option>)}
                  </select>
                  <i className="material-icons">expand_more</i>
                </div>
              </div>

              {courtesyProgram && (
                <>
                  <div className="tournament-form-field">
                    <label>Grupo</label>
                    <div className="tournament-select-wrapper">
                      <select value={courtesy.groupId} onChange={e => updateCourtesy({ groupId: e.target.value })}>
                        <option value="">Elige tu grupo</option>
                        {courtesyProgram.grupos.map(g => (
                          <option key={g.id} value={g.id}>{g.edad} · {g.profesor.nombre}</option>
                        ))}
                      </select>
                      <i className="material-icons">expand_more</i>
                    </div>
                  </div>

                  <div className="tournament-form-field">
                    <label>Horario</label>
                    <div className="tournament-select-wrapper">
                      <select value={courtesy.horario} onChange={e => updateCourtesy({ horario: e.target.value })}>
                        <option value="">Elige un horario</option>
                        {courtesyProgram.horarios.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <i className="material-icons">expand_more</i>
                    </div>
                  </div>
                </>
              )}

              <div className="tournament-form-field">
                <label>¿Cuántas personas vienen?</label>
                <PersonasSelector
                  opciones={PARTY_SIZES}
                  value={courtesy.personas}
                  onChange={(n) => updateCourtesy({ personas: n })}
                />
              </div>

              {courtesy.groupId && (
                <div className="tournament-form-field">
                  <label>Elige el día ({courtesyProgram?.diasSemana})</label>
                  <DiasDisponibles fechas={courtesyFechas} value={courtesy.fecha} personas={courtesy.personas}
                    onChange={(fecha) => updateCourtesy({ fecha })} />
                </div>
              )}

              <button className="tournament-modal-btn" onClick={handleCourtesySubmit} disabled={sending}>
                <i className="material-icons">{sending ? 'hourglass_empty' : 'card_giftcard'}</i>
                {sending ? 'Confirmando...' : 'Confirmar mi clase gratis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="tournament-modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="cancel-modal" onClick={e => e.stopPropagation()}>
            <div className="cancel-modal-icon">
              <i className="material-icons">warning</i>
            </div>
            <h5>¿Cancelar?</h5>
            <p>Liberarás tu cupo para que lo use otra persona.</p>
            <div className="cancel-modal-actions">
              <button className="cancel-modal-confirm" onClick={handleCancel}>
                Sí, cancelar
              </button>
              <button className="cancel-modal-dismiss" onClick={() => setCancelTarget(null)}>
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="tournament-toast">
          <i className="material-icons">check_circle</i>
          {toast}
        </div>
      )}
    </div>
  )
}

// Botones redondos 1 / 2 / 4
function PersonasSelector({ opciones, value, onChange, disabledIf = () => false }) {
  return (
    <div className="personas-filtro compacto">
      {opciones.map((n) => (
        <button
          key={n}
          type="button"
          className={`personas-btn ${value === n ? 'activo' : ''}`}
          disabled={disabledIf(n)}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// Solo los próximos días con clase, con sus cupos. Los que no tienen sitio salen desactivados.
function DiasDisponibles({ fechas, value, personas, onChange }) {
  if (fechas.length === 0) {
    return <p className="dias-cargando">Cargando días disponibles…</p>
  }
  return (
    <div className="dias-grid">
      {fechas.map(({ date, spotsLeft }) => {
        const caben = spotsLeft >= personas
        return (
          <button
            key={date}
            type="button"
            className={`dia-btn ${value === date ? 'activo' : ''}`}
            disabled={!caben}
            onClick={() => onChange(date)}
          >
            <strong>{dateLabel(date)}</strong>
            <small>{spotsLeft === 0 ? 'Lleno' : `${caben ? '' : 'Solo '}${spotsLeft} cupo${spotsLeft === 1 ? '' : 's'}`}</small>
          </button>
        )
      })}
    </div>
  )
}

export default Clases

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { getCourtImage, getCourtTypeLabel, formatPrice } from '../../utils/courts'
import './Courts.css'

// Convierte una cancha de la API al formato que usa el carrusel
const toViewCourt = (court) => ({
  id: court._id,
  img: getCourtImage(court),
  name: court.name,
  price: `${formatPrice(court.pricePerHour)}/hora`,
  desc: court.description,
  type: getCourtTypeLabel(court.type),
  typeIcon: court.type === 'INDOOR' ? 'home' : 'wb_sunny',
  features: court.features ?? [],
})

const VISIBLE = 3
const CARD_GAP = 32

function Courts() {
  const viewportRef = useRef(null)
  const [current, setCurrent] = useState(VISIBLE)
  const [animated, setAnimated] = useState(true)
  const [cardWidth, setCardWidth] = useState(300)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [selectedCourt, setSelectedCourt] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [courts, setCourts] = useState([])
  const [loadError, setLoadError] = useState('')

  // Las canchas vienen de la API (GET /api/courts)
  useEffect(() => {
    api.getCourts()
      .then((list) => setCourts(list.map(toViewCourt)))
      .catch((err) => setLoadError(err.message))
  }, [])

  // Copias al principio y al final para que el carrusel dé la vuelta sin saltos
  const cloned = courts.length ? [...courts.slice(-VISIBLE), ...courts, ...courts.slice(0, VISIBLE)] : []

  // Calcular ancho al montar y al redimensionar
  useEffect(() => {
    const calcWidth = () => {
      if (viewportRef.current) {
        const total = viewportRef.current.offsetWidth
        setCardWidth((total - CARD_GAP * (VISIBLE - 1)) / VISIBLE)
      }
    }
    calcWidth()
    window.addEventListener('resize', calcWidth)
    return () => window.removeEventListener('resize', calcWidth)
  }, [])

  // Restaurar animación tras salto
  useEffect(() => {
    if (!animated) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimated(true))
      )
    }
  }, [animated])

  const offset = -(current * (cardWidth + CARD_GAP))

  const move = useCallback((direction) => {
    setAnimated(true)
    setCurrent(prev => prev + direction)
  }, [])

  const handleTransitionEnd = useCallback(() => {
    if (current >= courts.length + VISIBLE) {
      setAnimated(false)
      setCurrent(VISIBLE)
    }
    if (current < VISIBLE) {
      setAnimated(false)
      setCurrent(courts.length + VISIBLE - 1)
    }
  }, [current, courts.length])

  const realIndex = courts.length ? (current - VISIBLE + courts.length) % courts.length : 0

  const openModal = (court) => {
    setSelectedCourt(court)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setTimeout(() => setSelectedCourt(null), 300)
  }

  const handleReserve = (courtName) => {
    closeModal()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/reservar', search: `?court=${encodeURIComponent(courtName)}` } } })
    } else {
      navigate(`/reservar?court=${encodeURIComponent(courtName)}`)
    }
  }

  return (
    <section className="courts-section">
      <div className="container">
        <div className="courts-header">
          <h2>Nuestras Canchas</h2>
          <p>Descubre nuestras instalaciones de primera categoría, diseñadas para ofrecerte la mejor experiencia de juego</p>
        </div>
      </div>

      {!courts.length && (
        <p className="courts-loading">
          {loadError ? `No se pudieron cargar las canchas: ${loadError}` : 'Cargando canchas…'}
        </p>
      )}

      {courts.length > 0 && (
      <>
      <div className="courts-carousel-wrapper">

        <button className="courts-arrow left" onClick={() => move(-1)}>
          <i className="material-icons">chevron_left</i>
        </button>

        <div className="courts-carousel-viewport" ref={viewportRef}>
          <div
            className="courts-track"
            style={{
              transform: `translateX(${offset}px)`,
              transition: animated ? 'transform 0.5s ease' : 'none'
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {cloned.map((court, i) => (
              <div
                className="court-card"
                key={`${court.id}-${i}`}
                style={{ minWidth: `${cardWidth}px` }}
                onClick={() => openModal(court)}
              >
                <div className="court-img-wrapper">
                  <img src={court.img} alt={court.name} />
                  <span className="court-badge">
                    <i className="material-icons">{court.typeIcon}</i>
                    {court.type}
                  </span>
                </div>

                <div className="court-info">
                  <div className="court-title-row">
                    <h5>{court.name}</h5>
                    <span className="court-price">{court.price}</span>
                  </div>
                  <p className="court-desc">{court.desc}</p>
                  <p className="court-capacity">
                    <i className="material-icons">group</i>
                    Capacidad: 4 jugadores
                  </p>
                  <p className="court-features-title">Características:</p>
                  <ul className="court-features">
                    {court.features.map((f, j) => (
                      <li key={j}>
                        <i className="material-icons">check</i>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="btn court-btn waves-effect waves-light"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleReserve(court.name)
                    }}
                  >
                    Reservar Ahora
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

        <button className="courts-arrow right" onClick={() => move(1)}>
          <i className="material-icons">chevron_right</i>
        </button>

      </div>

      <div className="courts-dots">
        {courts.map((court, i) => (
          <span
            key={court.id}
            className={`courts-dot ${i === realIndex ? 'active' : ''}`}
            onClick={() => { setAnimated(true); setCurrent(i + VISIBLE) }}
          />
        ))}
      </div>

      </>
      )}

      <div className="button-container"> 
        <button className="btn-outline-courts" onClick={() => window.location.href = '/canchas'}>
          Ver Todas las Canchas <i className="material-icons right">arrow_forward</i>
        </button>
      </div>

      {/* Modal de detalles de cancha */}
      {modalOpen && selectedCourt && (
        <div className="court-modal-overlay" onClick={closeModal}>
          <div className="court-modal" onClick={e => e.stopPropagation()}>
            <button className="court-modal-close" onClick={closeModal}>
              <i className="material-icons">close</i>
            </button>

            <div className="court-modal-content">
              <div className="court-modal-img-wrapper">
                <img src={selectedCourt.img} alt={selectedCourt.name} />
                <span className="court-modal-badge">
                  <i className="material-icons">{selectedCourt.typeIcon}</i>
                  {selectedCourt.type}
                </span>
              </div>

              <div className="court-modal-info">
                <div className="court-modal-title-row">
                  <h3>{selectedCourt.name}</h3>
                  <span className="court-modal-price">{selectedCourt.price}</span>
                </div>

                <p className="court-modal-desc">{selectedCourt.desc}</p>

                <div className="court-modal-capacity">
                  <i className="material-icons">group</i>
                  Capacidad: 4 jugadores
                </div>

                <div className="court-modal-features">
                  <h6>Características:</h6>
                  <ul>
                    {selectedCourt.features.map((f, j) => (
                      <li key={j}>
                        <i className="material-icons">check_circle</i>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  className="court-modal-btn waves-effect waves-light"
                  onClick={() => handleReserve(selectedCourt.name)}
                >
                  <i className="material-icons">event</i>
                  Reservar Esta Cancha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

export default Courts
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Courts.css'

import c1 from '../../img/Cancha1.jpg'
import c2 from '../../img/Cancha2.jpg'
import c3 from '../../img/Cancha3.jpg'
import c4 from '../../img/Cancha4.jpg'
import c5 from '../../img/Cancha5.jpg'

// Las fotos siguen dentro del frontend: se asocian a cada cancha por su nombre
const courtImages = {
  'Cancha Central': c1,
  'Cancha Premium': c2,
  'Cancha Recreativa': c3,
  'Cancha Profesional': c4,
  'Cancha Express': c5,
}

const courtTypes = {
  INDOOR: { label: 'Interior', icon: 'home' },
  OUTDOOR: { label: 'Exterior', icon: 'wb_sunny' },
}

// Convierte una cancha tal como llega de la API al formato que usa esta página
const toViewCourt = (court, index) => ({
  id: court._id,
  order: index,
  name: court.name,
  price: court.pricePerHour,
  type: courtTypes[court.type]?.label ?? court.type,
  typeIcon: courtTypes[court.type]?.icon ?? 'sports_tennis',
  desc: court.description,
  features: court.features,
  img: court.imageUrl || courtImages[court.name] || c1,
})

const filters = ['Todas', 'Interior', 'Exterior']

function CourtsPage() {
  const [activeFilter, setActiveFilter] = useState('Todas')
  const [sortBy, setSortBy] = useState('default')
  const [courts, setCourts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchCourts = () =>
    api.getCourts()
      .then((data) => setCourts(data.map(toViewCourt)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

  // Al abrir la página se piden las canchas a la API
  useEffect(() => {
    fetchCourts()
  }, [])

  const retry = () => {
    setLoading(true)
    setError(null)
    fetchCourts()
  }

  const filtered = courts
    .filter(c => activeFilter === 'Todas' || c.type === activeFilter)
    .sort((a, b) => {
      if (sortBy === 'asc')  return a.price - b.price
      if (sortBy === 'desc') return b.price - a.price
      return a.order - b.order
    })

  const formatPrice = (p) => `$${p.toLocaleString('es-CO')}`

  return (
    <div className="courts-page">

      {/* Header */}
      <div className="courts-page-header">
        <div className="container">
          <h1>Nuestras Canchas</h1>
          <p>Encuentra la cancha perfecta para tu nivel y estilo de juego</p>
        </div>
      </div>

      <div className="container courts-page-body">

        {/* Barra de filtros */}
        <div className="courts-filter-bar">
          <div className="courts-filter-types">
            {filters.map(f => (
              <button
                key={f}
                className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="courts-sort">
            <label>Ordenar por precio:</label>
            <div className="res-select-wrapper">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">Por defecto</option>
                <option value="asc">Menor a mayor</option>
                <option value="desc">Mayor a menor</option>
              </select>
              <i className="material-icons">expand_more</i>
            </div>
          </div>
        </div>

        {loading && (
          <div className="courts-status">
            <i className="material-icons spinning">refresh</i>
            <p>Cargando canchas…</p>
          </div>
        )}

        {error && (
          <div className="courts-status courts-status-error">
            <i className="material-icons">error_outline</i>
            <p>{error}</p>
            <button className="btn court-btn" onClick={retry}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (<>
        {/* Contador */}
        <p className="courts-count">
          {filtered.length} {filtered.length === 1 ? 'cancha encontrada' : 'canchas encontradas'}
        </p>

        {/* Grid */}
        <div className="courts-page-grid">
          {filtered.map(court => (
            <div className="court-page-card" key={court.id}>

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
                  <span className="court-price">{formatPrice(court.price)}/hora</span>
                </div>
                <p className="court-desc">{court.desc}</p>
                <p className="court-capacity">
                  <i className="material-icons">group</i>
                  Capacidad: 4 jugadores
                </p>
                <p className="court-features-title">Características:</p>
                <ul className="court-features">
                  {court.features.map((f, i) => (
                    <li key={i}>
                      <i className="material-icons">check</i>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="btn court-btn waves-effect waves-light"
                  onClick={() => navigate('/reservar')}
                >
                  Reservar Ahora
                </button>
              </div>

            </div>
          ))}
        </div>
        </>)}

      </div>
    </div>
  )
}

export default CourtsPage
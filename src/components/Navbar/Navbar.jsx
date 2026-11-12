import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import './Navbar.css'

function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [servicesOpen, setServicesOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav className="navbar-main">
      <div className="nav-wrapper container">

        <Link to="/" className="brand-logo">
          <img src="/IconPadel.png" alt="PadelZone Logo" className="nav-logo" />
          PadelZone
        </Link>

        {/* Botón de modo oscuro en móviles */}
        <div className="nav-actions-mobile hide-on-large-only">
          <button
            className="btn-theme-minimal"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Alternar tema claro u oscuro"
          >
            <i className="material-icons">{isDark ? 'dark_mode' : 'light_mode'}</i>
          </button>
        </div>

        <ul className="right hide-on-med-and-down">
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/canchas">Canchas</Link></li>

          <li className="nav-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="nav-dropdown-trigger"
              onClick={() => setServicesOpen(!servicesOpen)}
            >
              Servicios
              <i className={`material-icons nav-chevron ${servicesOpen ? 'open' : ''}`}>
                expand_more
              </i>
            </button>

            {servicesOpen && (
              <div className="nav-dropdown-menu">
                <Link to="/reservar" className="nav-dropdown-item" onClick={() => setServicesOpen(false)}>
                  <i className="material-icons">event_available</i>
                  Reservas
                </Link>
                <Link to="/clases" className="nav-dropdown-item" onClick={() => setServicesOpen(false)}>
                  <i className="material-icons">sports_tennis</i>
                  Clases
                </Link>
                <Link to="/tiendas" className="nav-dropdown-item" onClick={() => setServicesOpen(false)}>
                  <i className="material-icons">storefront</i>
                  Tiendas
                </Link>
                <Link to="/torneos" className="nav-dropdown-item" onClick={() => setServicesOpen(false)}>
                  <i className="material-icons">emoji_events</i>
                  Torneos
                </Link>
              </div>
            )}
          </li>

          <li><Link to="/contacto">Contacto</Link></li>
          {(isAdmin || user?.role === 'ADMIN' || user?.rol === 'admin') && (
            <li>
              <Link to="/admin" style={{
                background: '#ff9800',
                color: '#1a2238',
                borderRadius: '6px',
                padding: '0 12px',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                lineHeight: '34px',
                height: '34px',
                marginTop: '15px',
                boxShadow: '0 2px 6px rgba(255, 152, 0, 0.4)'
              }}>
                <i className="material-icons" style={{ fontSize: '18px' }}>admin_panel_settings</i>
                Panel Admin
              </Link>
            </li>
          )}
          <li>
            <button
              className="btn-theme-minimal"
              onClick={toggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar tema claro u oscuro"
            >
              <i className="material-icons">{isDark ? 'dark_mode' : 'light_mode'}</i>
            </button>
          </li>
          <li>
            {isAuthenticated ? (
              <div className="nav-user">
                <span className="nav-user-name" onClick={() => navigate('/perfil')} style={{ cursor: 'pointer' }}>
                  <i className="material-icons left">person</i>
                  {user?.name || 'Usuario'}
                </span>
                <button className="btn-logout waves-effect" onClick={handleLogout}>
                  <i className="material-icons left">logout</i>
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-login">
                <i className="material-icons left">account_circle</i>
                Iniciar Sesión
              </Link>
            )}
          </li>
        </ul>

      </div>
    </nav>
  )
}

export default Navbar


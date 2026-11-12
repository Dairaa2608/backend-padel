import { Link } from 'react-router-dom'
import './ForgotPassword.css'

// La app todavía no envía correos, así que no se finge un envío:
// se explica cómo recuperar la cuenta con ayuda del club.
const CLUB_PHONE = '+57 300 000 0000'
const CLUB_EMAIL = 'info@padelzone.com'

function ForgotPassword({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="forgot-modal-overlay" onClick={onClose}>
      <div className="forgot-modal" onClick={e => e.stopPropagation()}>
        <button className="forgot-modal-close" onClick={onClose} aria-label="Cerrar">
          <i className="material-icons">close</i>
        </button>

        <div className="forgot-modal-content">
          <div className="forgot-modal-header">
            <h2>Recuperar Contraseña</h2>
            <p>
              Por ahora el cambio de contraseña se hace con ayuda del club.
              Contáctanos desde el correo con el que te registraste y te ayudamos a recuperar tu cuenta.
            </p>
          </div>

          <ul className="forgot-contact">
            <li>
              <i className="material-icons" aria-hidden="true">mail</i>
              <a href={`mailto:${CLUB_EMAIL}?subject=Recuperar%20contrase%C3%B1a`}>{CLUB_EMAIL}</a>
            </li>
            <li>
              <i className="material-icons" aria-hidden="true">phone</i>
              <a href={`tel:${CLUB_PHONE.replace(/\s/g, '')}`}>{CLUB_PHONE}</a>
            </li>
            <li>
              <i className="material-icons" aria-hidden="true">store</i>
              <span>O pásate por la recepción del club con tu cédula</span>
            </li>
          </ul>

          <Link to="/contacto" className="forgot-btn" onClick={onClose}>
            <i className="material-icons" aria-hidden="true">support_agent</i>
            Ir a Contacto
          </Link>

          <div className="forgot-footer">
            <button type="button" className="back-to-login" onClick={onClose}>
              ← Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword

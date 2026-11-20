// Página "Verifica tu cuenta": se escribe el código de 6 dígitos que llegó al correo (y al celular).
// Hasta verificar el correo no se puede reservar, inscribirse ni comprar (lo exige la API).
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import '../Register/Register.css'
import './Verify.css'

export default function Verify() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/reservar'
  // Si acaba de registrarse, los códigos se acaban de enviar
  const justSent = Boolean(location.state?.justRegistered)

  // Al llegar desde el registro, la página empieza arriba
  useEffect(() => { window.scrollTo(0, 0) }, [])

  const emailDone = user?.emailVerified !== false
  const hasPhone = Boolean(user?.phone)

  return (
    <div className="register-page">
      <div className="register-header">
        <div className="container">
          <h1>Verifica tu cuenta</h1>
          <p>Te enviamos un código de 6 dígitos para confirmar que los datos son tuyos</p>
        </div>
      </div>

      <div className="container">
        <div className="register-card verify-card">
          <CodeBox
            channel="email"
            icon="mail"
            title="Correo electrónico"
            destination={user?.email}
            verified={emailDone}
            hint="Revisa también la carpeta de spam o promociones."
            justSent={justSent}
          />

          {hasPhone && (
            <CodeBox
              channel="phone"
              icon="smartphone"
              title="Celular"
              destination={user.phone}
              verified={user.phoneVerified}
              hint="Te llega por SMS o WhatsApp. Es opcional: puedes hacerlo después."
            justSent={justSent}
            />
          )}

          {emailDone ? (
            <button className="verify-continue" onClick={() => navigate(from, { replace: true })}>
              <i className="material-icons">arrow_forward</i>
              Continuar
            </button>
          ) : (
            <p className="verify-note">
              <i className="material-icons">lock</i>
              Para reservar, inscribirte o comprar primero verifica tu correo.
            </p>
          )}

          <p className="verify-footer">
            ¿El correo no es correcto? Cámbialo en <Link to="/perfil">tu perfil</Link> y te enviaremos otro código.
          </p>
        </div>
      </div>
    </div>
  )
}

const RESEND_SECONDS = 60

function CodeBox({ channel, icon, title, destination, verified, hint, justSent }) {
  const { verifyCode } = useAuth()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState(null) // { type: 'error' | 'ok', text }
  const [sending, setSending] = useState(false)
  // Al llegar de registrarse, el código se acaba de enviar: hay que esperar para pedir otro
  const [wait, setWait] = useState(justSent ? RESEND_SECONDS : 0)

  // Cuenta atrás para poder reenviar
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  if (verified) {
    return (
      <div className="verify-box verified">
        <i className="material-icons verify-icon">verified</i>
        <div>
          <strong>{title} verificado</strong>
          <span className="verify-destination">{destination}</span>
        </div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSending(true)
    try {
      await verifyCode(channel, code)
      // Al verificar, el usuario cambia y esta caja pasa a "verificado"
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setCode('')
    } finally {
      setSending(false)
    }
  }

  const resend = async () => {
    setMessage(null)
    try {
      await api.resendVerificationCode(channel)
      setMessage({ type: 'ok', text: 'Te enviamos un código nuevo' })
      setWait(RESEND_SECONDS)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  return (
    <form className="verify-box" onSubmit={submit}>
      <i className="material-icons verify-icon">{icon}</i>
      <div className="verify-body">
        <strong>{title}</strong>
        <span className="verify-destination">Enviamos el código a <b>{destination}</b></span>

        <div className="verify-row">
          <input
            className="verify-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label={`Código de verificación del ${title.toLowerCase()}`}
          />
          <button type="submit" className="verify-btn" disabled={code.length !== 6 || sending}>
            {sending ? 'Verificando…' : 'Verificar'}
          </button>
        </div>

        {message && <p className={`verify-msg ${message.type}`}>{message.text}</p>}

        <div className="verify-resend">
          <small>{hint}</small>
          <button type="button" onClick={resend} disabled={wait > 0}>
            {wait > 0 ? `Reenviar en ${wait}s` : 'Reenviar código'}
          </button>
        </div>
      </div>
    </form>
  )
}

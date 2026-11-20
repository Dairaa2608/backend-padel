// Página "Verifica tu cuenta", como en Gmail:
//  1. La persona elige cómo recibir el código: por correo o por SMS.
//  2. Solo entonces se envía, y escribe el código de 6 dígitos.
// Con verificar uno de los dos, la cuenta queda lista para reservar, inscribirse y comprar.
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import '../Register/Register.css'
import './Verify.css'

const RESEND_SECONDS = 60

// "valeria.lopez@gmail.com" → "v•••••z@gmail.com"
const maskEmail = (email = '') => {
  const [name, domain] = email.split('@')
  if (!domain) return email
  return name.length <= 2 ? `${name[0]}•@${domain}` : `${name[0]}${'•'.repeat(Math.min(name.length - 2, 5))}${name.at(-1)}@${domain}`
}

// "312 326 0070" → "••• ••• 0070"
const maskPhone = (phone = '') => `••• ••• ${phone.replace(/\D/g, '').slice(-4)}`

export default function Verify() {
  const { user, needsVerification } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/reservar'

  const [channel, setChannel] = useState(null) // null = eligiendo · 'email' | 'phone' = escribiendo el código
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // La página empieza arriba (al llegar desde el registro)
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Envía el código por el canal elegido y pasa a escribirlo
  const choose = async (selected) => {
    setError('')
    setSending(true)
    try {
      await api.sendVerificationCode(selected)
      setChannel(selected)
    } catch (err) {
      // Si ya se envió hace menos de un minuto, igual se puede escribir el código que llegó
      if (err.code === 'WAIT_BEFORE_RESEND') setChannel(selected)
      else setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="register-page">
      <div className="register-header">
        <div className="container">
          <h1>Verifica tu cuenta</h1>
          <p>Confirma que eres tú con un código de 6 dígitos</p>
        </div>
      </div>

      <div className="container">
        <div className="register-card verify-card">
          {!needsVerification ? (
            <Done onContinue={() => navigate(from, { replace: true })} />
          ) : channel ? (
            <CodeStep
              channel={channel}
              destination={channel === 'email' ? maskEmail(user?.email) : maskPhone(user?.phone)}
              onBack={() => { setChannel(null); setError('') }}
            />
          ) : (
            <>
              <h2 className="verify-title">¿Cómo quieres recibir tu código?</h2>

              <button type="button" className="verify-option" onClick={() => choose('email')} disabled={sending}>
                <i className="material-icons verify-icon">mail</i>
                <span className="verify-option-text">
                  <strong>Enviar un correo</strong>
                  <span>{maskEmail(user?.email)}</span>
                </span>
                <i className="material-icons verify-arrow">chevron_right</i>
              </button>

              {user?.phone ? (
                <button type="button" className="verify-option" onClick={() => choose('phone')} disabled={sending}>
                  <i className="material-icons verify-icon">sms</i>
                  <span className="verify-option-text">
                    <strong>Enviar un SMS</strong>
                    <span>{maskPhone(user.phone)}</span>
                  </span>
                  <i className="material-icons verify-arrow">chevron_right</i>
                </button>
              ) : (
                <p className="verify-footer">
                  ¿Prefieres un SMS? Añade tu teléfono en <Link to="/perfil">tu perfil</Link>.
                </p>
              )}

              {sending && <p className="verify-msg ok">Enviando código…</p>}
              {error && <p className="verify-msg error">{error}</p>}

              <p className="verify-note">
                <i className="material-icons">lock</i>
                Para reservar, inscribirte o comprar primero verifica tu cuenta.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Paso 2: escribir el código ───────────────────── */

function CodeStep({ channel, destination, onBack }) {
  const { verifyCode } = useAuth()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState(null) // { type: 'error' | 'ok', text }
  const [checking, setChecking] = useState(false)
  const [wait, setWait] = useState(RESEND_SECONDS) // el código se acaba de enviar

  // Cuenta atrás para poder reenviar
  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setChecking(true)
    try {
      await verifyCode(channel, code) // si es correcto, la página pasa a "Cuenta verificada"
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setCode('')
    } finally {
      setChecking(false)
    }
  }

  const resend = async () => {
    setMessage(null)
    try {
      await api.sendVerificationCode(channel)
      setMessage({ type: 'ok', text: 'Te enviamos un código nuevo' })
      setWait(RESEND_SECONDS)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const isEmail = channel === 'email'

  return (
    <form className="verify-step" onSubmit={submit}>
      <i className="material-icons verify-big-icon">{isEmail ? 'mark_email_read' : 'sms'}</i>
      <h2 className="verify-title">Escribe el código</h2>
      <p className="verify-destination">
        {isEmail ? 'Te enviamos un correo a ' : 'Te enviamos un SMS al '}<b>{destination}</b>
      </p>

      <input
        className="verify-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        aria-label="Código de verificación"
        autoFocus
      />
      <button type="submit" className="verify-continue" disabled={code.length !== 6 || checking}>
        {checking ? 'Verificando…' : 'Verificar'}
      </button>

      {message && <p className={`verify-msg ${message.type}`}>{message.text}</p>}

      <div className="verify-resend">
        <small>{isEmail ? 'Revisa también spam o promociones.' : 'Puede tardar unos segundos.'}</small>
        <button type="button" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? `Reenviar en ${wait}s` : 'Reenviar código'}
        </button>
      </div>

      <button type="button" className="verify-back" onClick={onBack}>
        <i className="material-icons">arrow_back</i>
        Probar otro método
      </button>
    </form>
  )
}

/* ── Listo ────────────────────────────────────────── */

function Done({ onContinue }) {
  return (
    <div className="verify-step">
      <i className="material-icons verify-big-icon done">verified</i>
      <h2 className="verify-title">¡Cuenta verificada!</h2>
      <p className="verify-destination">Ya puedes reservar canchas, inscribirte en clases y torneos y comprar en la tienda.</p>
      <button type="button" className="verify-continue" onClick={onContinue}>
        <i className="material-icons">arrow_forward</i>
        Continuar
      </button>
    </div>
  )
}

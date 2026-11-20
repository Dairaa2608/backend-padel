// Códigos de verificación de la cuenta (correo y teléfono), como hace Gmail.
// - 6 dígitos al azar (crypto), guardados CIFRADOS: si alguien ve la base de datos, no ve el código.
// - Vencen a los 15 minutos y permiten 5 intentos.
// - Para reenviar hay que esperar 60 segundos.
import crypto from 'node:crypto'
import { AppError } from './AppError.js'

export const CODE_MINUTES = 15
const MAX_ATTEMPTS = 5
const RESEND_SECONDS = 60

const hash = (code) => crypto.createHash('sha256').update(code).digest('hex')

// Crea un código nuevo para 'email' o 'phone' y lo guarda (cifrado) en el usuario.
// Devuelve el código en claro SOLO para enviarlo; nunca se guarda así.
export function createCode(user, channel) {
  const previous = user.verification?.[channel]
  if (previous?.sentAt && Date.now() - previous.sentAt.getTime() < RESEND_SECONDS * 1000) {
    const wait = Math.ceil((RESEND_SECONDS * 1000 - (Date.now() - previous.sentAt.getTime())) / 1000)
    throw new AppError(429, 'WAIT_BEFORE_RESEND', `Espera ${wait} segundos para pedir otro código`)
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
  user.set(`verification.${channel}`, {
    codeHash: hash(code),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60 * 1000),
    attempts: 0,
    sentAt: new Date(),
  })
  return code
}

// Comprueba el código. Si es correcto, marca el correo o el teléfono como verificado.
export function checkCode(user, channel, code) {
  const pending = user.verification?.[channel]
  if (!pending?.codeHash) {
    throw new AppError(400, 'NO_CODE', 'No hay ningún código pendiente. Pide uno nuevo')
  }
  if (pending.expiresAt < new Date()) {
    throw new AppError(400, 'CODE_EXPIRED', 'El código venció. Pide uno nuevo')
  }
  if (pending.attempts >= MAX_ATTEMPTS) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Demasiados intentos. Pide un código nuevo')
  }

  // Comparación en tiempo constante: no da pistas de cuántos dígitos acertó
  const ok = crypto.timingSafeEqual(Buffer.from(hash(code)), Buffer.from(pending.codeHash))
  if (!ok) {
    const used = pending.attempts + 1
    const left = MAX_ATTEMPTS - used
    user.set(`verification.${channel}.attempts`, used)
    const message = left === 0 ? 'Código incorrecto. Pide un código nuevo'
      : `Código incorrecto. Te ${left === 1 ? 'queda 1 intento' : `quedan ${left} intentos`}`
    return { ok: false, message }
  }

  user.set(channel === 'email' ? 'emailVerified' : 'phoneVerified', true)
  user.set(`verification.${channel}`, undefined)
  return { ok: true }
}

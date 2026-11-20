// Envío de mensajes al celular (SMS o WhatsApp) con Twilio.
//
// Dos modos:
//  1. REAL: si en el .env están TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_FROM, se envía con Twilio.
//     SMS_CHANNEL="whatsapp" envía por WhatsApp en lugar de SMS.
//  2. PRUEBA: si no están, el mensaje se muestra en la consola de la API (no se envía nada).
//
// Se usa la API REST de Twilio directamente con fetch (no hace falta instalar su librería).

const TWILIO_API = process.env.TWILIO_API_URL || 'https://api.twilio.com/2010-04-01'

// Convierte un número colombiano al formato internacional que pide Twilio (+573001234567).
// Devuelve null si no parece un número válido.
export function toInternationalPhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/[^\d+]/g, '')
  if (/^\+\d{10,15}$/.test(digits)) return digits // ya viene con indicativo: +57…, +34…
  if (/^3\d{9}$/.test(digits)) return `+57${digits}` // celular colombiano: 300 123 4567
  if (/^57\d{10}$/.test(digits)) return `+${digits}` // 573001234567
  return null
}

// Envía un mensaje. Nunca lanza error: si falla, solo lo anota en la consola,
// para que un problema con el mensaje no impida registrarse.
export async function sendSms({ to, body }) {
  const phone = toInternationalPhone(to)
  if (!phone) {
    console.warn('📱 Número no válido, no se envía el mensaje:', to)
    return false
  }

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env
  const whatsapp = process.env.SMS_CHANNEL === 'whatsapp'

  if (!sid || !token || !from) {
    console.log(`📱 Mensaje de PRUEBA para ${phone} (configura Twilio en el .env para enviarlo de verdad):\n   ${body}`)
    return true
  }

  try {
    const response = await fetch(`${TWILIO_API}/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: whatsapp ? `whatsapp:${phone}` : phone,
        From: whatsapp ? `whatsapp:${from}` : from,
        Body: body,
      }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.message || `Twilio respondió ${response.status}`)

    console.log(`📱 ${whatsapp ? 'WhatsApp' : 'SMS'} enviado a ${phone}`)
    return true
  } catch (error) {
    console.error(`❌ No se pudo enviar el ${whatsapp ? 'WhatsApp' : 'SMS'} a ${phone} →`, error.message)
    return false
  }
}

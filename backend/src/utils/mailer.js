// Envío de correos con Nodemailer usando una cuenta de Gmail.
// Necesita en el .env: MAIL_USER (el correo) y MAIL_PASS (una "contraseña de aplicación" de Google,
// NO la contraseña normal del correo). Si no están, la API sigue funcionando sin enviar correos.
import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  const { MAIL_USER, MAIL_PASS } = process.env
  if (!MAIL_USER || !MAIL_PASS) return null

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: MAIL_USER, pass: MAIL_PASS.replace(/\s/g, '') }, // Google la muestra con espacios
  })
  return transporter
}

// Envía un correo. Nunca lanza error: si falla, solo lo anota en la consola,
// para que un problema con el correo no impida registrarse.
export async function sendMail({ to, subject, html, text }) {
  const mailer = getTransporter()
  if (!mailer) {
    console.warn('✉️  MAIL_USER / MAIL_PASS no definidos: no se envía el correo a', to)
    return false
  }
  try {
    await mailer.sendMail({ from: `"PadelZone" <${process.env.MAIL_USER}>`, to, subject, html, text })
    console.log('✉️  Correo enviado a', to)
    return true
  } catch (error) {
    console.error('❌ No se pudo enviar el correo a', to, '→', error.message)
    return false
  }
}

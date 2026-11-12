// Envío de correos con Nodemailer.
//
// Dos modos:
//  1. REAL (Gmail): si en el .env están MAIL_USER y MAIL_PASS, se envía desde esa cuenta.
//     MAIL_PASS es una "contraseña de aplicación" de Google, NO la contraseña normal.
//  2. PRUEBA (Ethereal): si no están, se usa un buzón de prueba gratuito. El correo no llega
//     a ninguna bandeja: en la consola aparece un enlace para verlo en el navegador.
import nodemailer from 'nodemailer'

let transporterPromise = null
let testMode = false

async function createTransporter() {
  const { MAIL_USER, MAIL_PASS } = process.env
  if (MAIL_USER && MAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: MAIL_USER, pass: MAIL_PASS.replace(/\s/g, '') }, // Google la muestra con espacios
    })
  }

  // Sin Gmail configurado: cuenta de prueba de Ethereal (se crea sola, no hay que registrarse)
  testMode = true
  const account = await nodemailer.createTestAccount()
  console.log('✉️  Correos en modo PRUEBA (Ethereal): verás un enlace para abrir cada correo')
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  })
}

function getTransporter() {
  transporterPromise ??= createTransporter().catch((error) => {
    transporterPromise = null // se vuelve a intentar en el próximo correo
    throw error
  })
  return transporterPromise
}

// Envía un correo. Nunca lanza error: si falla, solo lo anota en la consola,
// para que un problema con el correo no impida registrarse.
export async function sendMail({ to, subject, html, text }) {
  try {
    const mailer = await getTransporter()
    const from = `"PadelZone" <${process.env.MAIL_USER || 'no-reply@padelzone.com'}>`
    const info = await mailer.sendMail({ from, to, subject, html, text })
    if (testMode) {
      console.log(`✉️  Correo de prueba para ${to} → ábrelo aquí: ${nodemailer.getTestMessageUrl(info)}`)
    } else {
      console.log('✉️  Correo enviado a', to)
    }
    return true
  } catch (error) {
    console.error('❌ No se pudo enviar el correo a', to, '→', error.message)
    return false
  }
}

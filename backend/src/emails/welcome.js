// Correo de bienvenida que recibe cada persona al registrarse.

// Evita que un nombre con caracteres raros rompa el HTML del correo
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function welcomeEmail({ name }) {
  const firstName = escapeHtml(name.split(' ')[0])
  const siteUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  const subject = `¡Bienvenido a PadelZone, ${name.split(' ')[0]}! 🎾`

  const text = `Hola ${name.split(' ')[0]},

¡Gracias por registrarte en PadelZone, el club de pádel de Neiva!

Ya puedes:
- Reservar canchas
- Inscribirte en clases (y probar tu clase de cortesía gratis)
- Participar en torneos
- Comprar en nuestra tienda

Entra aquí: ${siteUrl}

¡Nos vemos en la cancha!
El equipo de PadelZone`

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f8;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#020b2d,#0a7c5c);padding:28px;text-align:center;color:#ffffff">
      <h1 style="margin:0;font-size:26px">PadelZone</h1>
      <p style="margin:6px 0 0;opacity:.85">Club de pádel · Neiva</p>
    </div>
    <div style="padding:28px;color:#222;line-height:1.6">
      <h2 style="margin-top:0;color:#0a7c5c">¡Hola, ${firstName}! 🎾</h2>
      <p>Gracias por registrarte en <strong>PadelZone</strong>. Tu cuenta ya está lista.</p>
      <p>Esto es lo que puedes hacer:</p>
      <ul>
        <li>Reservar canchas</li>
        <li>Inscribirte en clases y probar tu <strong>clase de cortesía gratis</strong></li>
        <li>Participar en torneos</li>
        <li>Comprar en nuestra tienda</li>
      </ul>
      <p style="text-align:center;margin:28px 0">
        <a href="${siteUrl}" style="background:#0a7c5c;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Ir a PadelZone</a>
      </p>
      <p>¡Nos vemos en la cancha!<br>El equipo de PadelZone</p>
    </div>
    <div style="background:#f4f6f8;padding:14px;text-align:center;font-size:12px;color:#777">
      Recibiste este correo porque te registraste en PadelZone.
    </div>
  </div>
</div>`

  return { subject, text, html }
}

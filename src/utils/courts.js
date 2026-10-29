// Ayudas para mostrar las canchas que llegan de la API.
import c1 from '../img/Cancha1.jpg'
import c2 from '../img/Cancha2.jpg'
import c3 from '../img/Cancha3.jpg'
import c4 from '../img/Cancha4.jpg'
import c5 from '../img/Cancha5.jpg'

// Las fotos siguen dentro del frontend: se asocian a cada cancha por su nombre
const courtImages = {
  'Cancha Central': c1,
  'Cancha Premium': c2,
  'Cancha Recreativa': c3,
  'Cancha Profesional': c4,
  'Cancha Express': c5,
}

const courtTypes = {
  INDOOR: 'Interior',
  OUTDOOR: 'Exterior',
}

export const getCourtImage = (court) => court?.imageUrl || courtImages[court?.name] || c1

export const getCourtTypeLabel = (type) => courtTypes[type] ?? type

export const formatPrice = (price) => `$${(price ?? 0).toLocaleString('es-CO')}`

// 18 → "6:00 PM"
export const formatHour = (h) => {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 12 ? 12 : h
  return `${display}:00 ${suffix}`
}

// Fecha de hoy en el computador del usuario, como "2026-11-15"
export const todayString = () => new Date().toLocaleDateString('en-CA')
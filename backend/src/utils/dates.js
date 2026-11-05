// Fecha y hora actuales en Colombia (el club está en Neiva), sin depender
// de la zona horaria del computador o del servidor donde corra la API.
const TIME_ZONE = 'America/Bogota'

// Fecha de hoy como texto "2026-11-15"
export function todayInColombia() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date())
}

// Hora actual (0 a 23)
export function currentHourInColombia() {
    const hour = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23' }).format(new Date())
    return Number(hour)
}

// ¿Esa hora de ese día ya pasó?
export function isPast(date, hour) {
    const today = todayInColombia()
    return date < today || (date === today && hour <= currentHourInColombia())
}

// Día de la semana de una fecha "2026-11-16": 0 = domingo … 6 = sábado
export function weekdayOf(date) {
    return new Date(`${date}T12:00:00Z`).getUTCDay()
}

// "4:00 PM" → 16
export function hourFromSlot(slot) {
    const [, h, period] = slot.match(/^(\d{1,2}):\d{2}\s*(AM|PM)$/i)
    const hour = Number(h) % 12
    return period.toUpperCase() === 'PM' ? hour + 12 : hour
}
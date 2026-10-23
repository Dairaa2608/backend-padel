// Datos iniciales de PadelZone, tomados del frontend (antes estaban fijos en el código).
// Ejecutar con: npm run db:seed
// Se puede ejecutar varias veces: usa upsert y no duplica registros.
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma.js'

const courts = [
  { name: 'Cancha Central', type: 'OUTDOOR', pricePerHour: 120000, description: 'Cancha principal con césped sintético de última generación', features: ['Iluminación LED', 'Césped sintético premium', 'Vestuarios incluidos'] },
  { name: 'Cancha Premium', type: 'INDOOR', pricePerHour: 160000, description: 'Cancha techada con climatización y iluminación LED', features: ['Climatización', 'Cristal panorámico', 'Suelo profesional'] },
  { name: 'Cancha Recreativa', type: 'OUTDOOR', pricePerHour: 100000, description: 'Perfecta para principiantes y partidos casuales', features: ['Ideal principiantes', 'Ambiente relajado', 'Precio accesible'] },
  { name: 'Cancha Profesional', type: 'INDOOR', pricePerHour: 180000, description: 'Diseñada para torneos y jugadores de alto rendimiento', features: ['Normas oficiales', 'Gradas para público', 'Iluminación HD'] },
  { name: 'Cancha Express', type: 'OUTDOOR', pricePerHour: 90000, description: 'Ideal para partidos rápidos en horarios de menor demanda', features: ['Acceso rápido', 'Sin reserva mínima', 'Estacionamiento cercano'] },
]

const coaches = {
  carlos: { name: 'Carlos Mendoza', title: 'Director Técnico WPT', photoUrl: 'https://randomuser.me/api/portraits/men/32.jpg' },
  sofia: { name: 'Sofía Restrepo', title: 'Entrenadora Certificada FEP' },
  andres: { name: 'Andrés Quiroga', title: 'Coach de Alto Rendimiento' },
  valentina: { name: 'Valentina Salazar', title: 'Especialista en Formación Junior' },
}

// Rangos de edad del frontend: "10 - 14", "15 - 21", "22 en adelante"
const AGES = [[10, 14], [15, 21], [22, null]]

const programs = [
  {
    name: 'Clases Regulares', type: 'Regular', color: '#1a73e8',
    description: 'Aprende las bases del pádel con ritmo constante. Ideal para quienes quieren progresar sin sacrificar su rutina.',
    daysOfWeek: 'Lunes, Miércoles y Viernes', hoursPerWeek: 8, sessionHours: 2,
    scheduleSlots: ['8:00 AM', '10:00 AM', '4:00 PM', '6:00 PM'],
    groups: [['valentina', 180000, 12], ['sofia', 200000, 10], ['carlos', 220000, 12]],
  },
  {
    name: 'Clases Intensivas', type: 'Intensiva', color: '#e53935',
    description: 'Programa de alto rendimiento para jugadores que quieren subir de nivel rápidamente con entrenamiento diario.',
    daysOfWeek: 'Lunes a Sábado', hoursPerWeek: 12, sessionHours: 2,
    scheduleSlots: ['7:00 AM', '9:00 AM', '3:00 PM', '5:00 PM'],
    groups: [['valentina', 280000, 8], ['andres', 320000, 8], ['andres', 350000, 10]],
  },
  {
    name: 'Clases de Verano', type: 'Verano', color: '#f9a825',
    description: 'Aprovecha la temporada para iniciarte o perfeccionar tu juego. Ambiente dinámico y grupos reducidos.',
    daysOfWeek: 'Martes, Jueves y Sábado', hoursPerWeek: 10, sessionHours: 2,
    scheduleSlots: ['8:00 AM', '10:00 AM', '2:00 PM', '4:00 PM'],
    groups: [['valentina', 150000, 14], ['sofia', 170000, 12], ['carlos', 190000, 14]],
  },
  {
    name: 'Clases Fin de Semana', type: 'Fin de Semana', color: '#43a047',
    description: 'Para quienes trabajan entre semana. Clases concentradas el sábado y domingo para no perder el ritmo.',
    daysOfWeek: 'Sábado y Domingo', hoursPerWeek: 8, sessionHours: 4,
    scheduleSlots: ['9:00 AM', '11:00 AM', '3:00 PM', '5:00 PM'],
    groups: [['valentina', 160000, 10], ['sofia', 180000, 10], ['carlos', 200000, 12]],
  },
]

const tournaments = [
  { name: 'Copa PadelZone 2026', description: 'El torneo más importante del año. Compite contra los mejores jugadores de la región.', startDate: '2026-06-15', endDate: '2026-06-20', category: 'Profesional', level: 'Avanzado', location: 'Canchas Premium e Interior', fee: 50000, prize: 2000000, capacity: 16 },
  { name: 'Torneo Amateur Summer', description: 'Ideal para jugadores que dan sus primeros pasos en la competencia. ¡Anímate a participar!', startDate: '2026-07-05', endDate: '2026-07-07', category: 'Amateur', level: 'Principiante / Intermedio', location: 'Canchas Recreativa y Express', fee: 30000, prize: 800000, capacity: 24 },
  { name: 'Liga Comunidad PadelZone', description: 'Torneo mensual para miembros activos. Formato de liga con partidos cada fin de semana.', startDate: '2026-08-01', endDate: '2026-08-31', category: 'Comunidad', level: 'Todos los niveles', location: 'Todas las canchas', fee: 20000, prize: 500000, capacity: 32 },
]

const products = [
  { name: 'Pala Profesional Adidas', description: 'Pala de carbono para jugadores avanzados. Máximo control y potencia en cada golpe.', price: 280000, stock: 10, badge: 'Nuevo' },
  { name: 'Pack de Pelotas Oficiales', description: 'Pack con 3 pelotas de pádel homologadas para competición. Duración prolongada.', price: 35000, stock: 50, badge: 'Oferta' },
  { name: 'Muñequera + Cinturón', description: 'Set de muñequeras técnicas y cinturón lumbar ajustable para máxima sujeción.', price: 68000, stock: 20 },
  { name: 'Paletero Deportivo Wilson', description: 'Bolsa de palas amplia con compartimentos laterales y bolsillo interior.', price: 120000, stock: 8, badge: 'Destacado' },
  { name: 'Camiseta Técnica Dry-Fit', description: 'Camiseta transpirable de alto rendimiento. Diseño exclusivo de PadelZone.', price: 55000, stock: 30 },
  // "Agotado" en el frontend = stock 0 (ya no hace falta guardarlo como badge)
  { name: 'Grip Antideslizante Premium', description: 'Pack de 3 grips antideslizantes de alta adherencia. Reducen la vibración.', price: 22000, stock: 0 },
]

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.warn('⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no definidos: no se crea el administrador')
    return
  }
  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Administrador', email, passwordHash, role: 'ADMIN' },
  })
}

async function seedClasses() {
  const coachIds = {}
  for (const [key, data] of Object.entries(coaches)) {
    const existing = await prisma.coach.findFirst({ where: { name: data.name } })
    coachIds[key] = (existing ?? await prisma.coach.create({ data })).id
  }

  for (const { groups, ...data } of programs) {
    const program = await prisma.classProgram.upsert({
      where: { name: data.name },
      update: data,
      create: data,
    })
    const groupCount = await prisma.classGroup.count({ where: { programId: program.id } })
    if (groupCount > 0) continue

    await prisma.classGroup.createMany({
      data: groups.map(([coach, monthlyPrice, capacity], i) => ({
        programId: program.id,
        coachId: coachIds[coach],
        minAge: AGES[i][0],
        maxAge: AGES[i][1],
        monthlyPrice,
        capacity,
      })),
    })
  }
}

async function main() {
  await seedAdmin()

  for (const data of courts) {
    await prisma.court.upsert({ where: { name: data.name }, update: data, create: data })
  }

  await seedClasses()

  for (const t of tournaments) {
    const data = { ...t, startDate: new Date(t.startDate), endDate: new Date(t.endDate) }
    await prisma.tournament.upsert({ where: { name: data.name }, update: data, create: data })
  }

  for (const data of products) {
    await prisma.product.upsert({ where: { name: data.name }, update: data, create: data })
  }

  console.log('✅ Seed completado')
}

main()
  .catch((error) => {
    console.error('❌ Error en el seed:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

// Datos de demostración para presentar el proyecto.
// Ejecutar con: npm run seed:demo  (después de npm run seed)
//
// ⚠️ Borra TODAS las inscripciones y clases (mensuales, sueltas y de cortesía) y deja:
//   - todos los grupos de clases con sus cupos libres,
//   - menos "Clases Regulares · 15 - 21 años", que queda LLENO con 5 alumnos de prueba
//     (5 inscripciones mensuales de 2 personas = 10 de 10 cupos).
// Así se puede mostrar que un grupo lleno ya no deja inscribirse.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/db.js'
import { User, ClassProgram, ClassEnrollment, ClassBooking, ClassSession } from '../models/index.js'

const DEMO_PASSWORD = 'Demo12345'
const DEMO_STUDENTS = [
  { name: 'Laura Gómez', email: 'demo1@padelzone.com' },
  { name: 'Andrés Peña', email: 'demo2@padelzone.com' },
  { name: 'Camila Rojas', email: 'demo3@padelzone.com' },
  { name: 'Mateo Díaz', email: 'demo4@padelzone.com' },
  { name: 'Sara Méndez', email: 'demo5@padelzone.com' },
]

async function main() {
  await connectDB()

  // 1. Todas las clases vuelven a tener sus cupos libres
  await Promise.all([ClassEnrollment.deleteMany({}), ClassBooking.deleteMany({}), ClassSession.deleteMany({})])
  await ClassProgram.updateMany({}, { $set: { 'groups.$[].enrolledCount': 0 } })

  // 2. Alumnos de prueba (se crean una sola vez)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const students = []
  for (const data of DEMO_STUDENTS) {
    const user = await User.findOneAndUpdate(
      { email: data.email },
      { $setOnInsert: { ...data, passwordHash, role: 'USER' } },
      { upsert: true, returnDocument: 'after' },
    )
    students.push(user)
  }

  // 3. Llenar "Clases Regulares · 15 - 21 años"
  const program = await ClassProgram.findOne({ name: 'Clases Regulares' })
  const group = program?.groups.find((g) => g.minAge === 15)
  if (!group) {
    throw new Error('No se encontró el grupo de 15 - 21 años de Clases Regulares. Ejecuta antes npm run seed')
  }

  const partySize = 2
  const enrollments = students.map((user) => ({
    user: user._id,
    program: program._id,
    group: group._id,
    schedule: program.scheduleSlots[0],
    level: 'Intermedio',
    birthDate: new Date('2006-03-15'),
    partySize,
  }))
  await ClassEnrollment.insertMany(enrollments)

  // El contador de cupos debe coincidir con las inscripciones creadas
  const enrolled = Math.min(enrollments.length * partySize, group.capacity)
  await ClassProgram.updateOne(
    { _id: program._id, 'groups._id': group._id },
    { $set: { 'groups.$.enrolledCount': enrolled } },
  )

  console.log('✅ Datos de demostración listos')
  console.log(`   Todos los grupos con cupos libres, menos Clases Regulares · 15 - 21 años: ${enrolled}/${group.capacity} (lleno)`)
  console.log(`   Alumnos de prueba: demo1@padelzone.com … demo5@padelzone.com · contraseña: ${DEMO_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('❌ Error en los datos de demostración:', error.message)
    process.exitCode = 1
  })
  .finally(disconnectDB)

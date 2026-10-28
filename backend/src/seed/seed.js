// Carga los datos iniciales en MongoDB.
// Ejecutar con: npm run seed
// Se puede ejecutar varias veces: actualiza lo que ya existe y no duplica registros.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDB, disconnectDB } from '../config/db.js'
import { User, Court, ClassProgram, Tournament, Product, Reservation, ClassEnrollment, TournamentRegistration, Order } from '../models/index.js'
import { courts, coaches, AGES, programs, tournaments, products } from './data.js'

// Busca por nombre: si existe lo actualiza, si no lo crea
const upsertByName = (Model, data) =>
  Model.findOneAndUpdate({ name: data.name }, data, { upsert: true, runValidators: true })

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.warn('⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no definidos: no se crea el administrador')
    return
  }
  const exists = await User.exists({ email })
  if (exists) return

  const passwordHash = await bcrypt.hash(password, 10)
  await User.create({ name: 'Administrador', email, passwordHash, role: 'ADMIN' })
}

async function main() {
  await connectDB()

  // Crea las colecciones e índices (únicos, anti-reservas dobles…) aunque todavía estén vacías
  for (const Model of [User, Court, Reservation, ClassProgram, ClassEnrollment, Tournament, TournamentRegistration, Product, Order]) {
    await Model.syncIndexes()
  }

  await seedAdmin()

  for (const court of courts) await upsertByName(Court, court)

  for (const { groups, ...program } of programs) {
    const exists = await ClassProgram.exists({ name: program.name })
    // Los grupos solo se crean la primera vez: así no cambian sus _id (las inscripciones los usan)
    const data = exists ? program : {
      ...program,
      groups: groups.map(([coach, monthlyPrice, capacity], i) => ({
        minAge: AGES[i][0],
        maxAge: AGES[i][1],
        coach: coaches[coach],
        monthlyPrice,
        capacity,
      })),
    }
    await upsertByName(ClassProgram, data)
  }

  for (const tournament of tournaments) await upsertByName(Tournament, tournament)
  for (const product of products) await upsertByName(Product, product)

  console.log('✅ Seed completado')
}

main()
  .catch((error) => {
    console.error('❌ Error en el seed:', error.message)
    process.exitCode = 1
  })
  .finally(disconnectDB)

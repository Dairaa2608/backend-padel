// Punto de entrada: carga el .env, conecta a MongoDB y arranca el servidor.
import 'dotenv/config'
import { app } from './app.js'
import { connectDB } from './config/db.js'

const PORT = process.env.PORT || 3000

try {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀 API escuchando en http://localhost:${PORT}/api`)
  })
} catch (error) {
  console.error('❌ No se pudo arrancar la API:', error.message)
  process.exit(1)
}

// Todas las rutas de la API. Cada módulo se monta en su propio prefijo.
import { Router } from 'express'
import mongoose from 'mongoose'
import courtsRoutes from './courts.routes.js'

const router = Router()

// Comprobar que la API (y la conexión a MongoDB) funcionan
router.get('/health', (req, res) => {
  res.json({
    data: {
      status: 'ok',
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  })
})

router.use('/courts', courtsRoutes)

export default router

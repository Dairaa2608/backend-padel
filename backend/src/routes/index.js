// Todas las rutas de la API. Cada módulo se monta en su propio prefijo.
import { Router } from 'express'
import mongoose from 'mongoose'
import courtsRoutes from './courts.routes.js'
import authRoutes from './auth.routes.js'
import usersRoutes from './users.routes.js'
import reservationsRoutes from './reservations.routes.js'

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
router.use('/auth', authRoutes)
router.use('/users', usersRoutes)
router.use('/reservations', reservationsRoutes)

export default router
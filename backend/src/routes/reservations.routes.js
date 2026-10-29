import { Router } from 'express'
import {
  createReservation,
  listMyReservations,
  listAllReservations,
  cancelReservation,
} from '../controllers/reservations.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { createReservationSchema } from '../schemas/reservation.schemas.js'

const router = Router()

// Todas las rutas de reservas exigen sesión iniciada
router.use(requireAuth)

router.post('/', validate(createReservationSchema), createReservation)
router.get('/me', listMyReservations)
router.get('/', requireRole('ADMIN'), listAllReservations)
router.patch('/:id/cancel', cancelReservation)

export default router
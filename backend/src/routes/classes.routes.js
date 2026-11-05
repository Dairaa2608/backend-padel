import { Router } from 'express'
import {
  listPrograms,
  getDayAvailability,
  enroll,
  listMyEnrollments,
  cancelEnrollment,
  bookClass,
  listMyBookings,
  cancelBooking,
} from '../controllers/classes.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { enrollSchema, bookClassSchema } from '../schemas/class.schemas.js'

const router = Router()

// Públicas: ver programas, grupos y cupos
router.get('/', listPrograms)
router.get('/:programId/groups/:groupId/availability', getDayAvailability)

// Inscripción mensual (2 o 4 personas)
router.post('/enrollments', requireAuth, validate(enrollSchema), enroll)
router.get('/enrollments/me', requireAuth, listMyEnrollments)
router.patch('/enrollments/:id/cancel', requireAuth, cancelEnrollment)

// Clase suelta o de cortesía (1, 2 o 4 personas)
router.post('/bookings', requireAuth, validate(bookClassSchema), bookClass)
router.get('/bookings/me', requireAuth, listMyBookings)
router.patch('/bookings/:id/cancel', requireAuth, cancelBooking)

export default router
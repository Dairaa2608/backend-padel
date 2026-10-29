import { Router } from 'express'
import { listCourts, getCourt } from '../controllers/courts.controller.js'
import { getAvailability } from '../controllers/reservations.controller.js'

const router = Router()

router.get('/', listCourts)
router.get('/:id', getCourt)
router.get('/:id/availability', getAvailability)

export default router
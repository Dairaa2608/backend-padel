import { Router } from 'express'
import { listMyFines, payFine } from '../controllers/fines.controller.js'
import { requireAuth } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { payFineSchema } from '../schemas/fine.schemas.js'

const router = Router()

router.get('/me', requireAuth, listMyFines)
router.post('/:id/pay', requireAuth, validate(payFineSchema), payFine)

export default router

import { Router } from 'express'
import { updateMe, listUsers } from '../controllers/users.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { updateProfileSchema } from '../schemas/auth.schemas.js'

const router = Router()

router.patch('/me', requireAuth, validate(updateProfileSchema), updateMe)
router.get('/', requireAuth, requireRole('ADMIN'), listUsers)

export default router
import { Router } from 'express'
import { createOrder, listMyOrders } from '../controllers/orders.controller.js'
import { requireAuth, requireVerifiedEmail, requireNoPendingFines } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { createOrderSchema } from '../schemas/order.schemas.js'

const router = Router()

router.post('/', requireAuth, requireVerifiedEmail, requireNoPendingFines, validate(createOrderSchema), createOrder)
router.get('/me', requireAuth, listMyOrders)

export default router

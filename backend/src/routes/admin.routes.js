// Rutas del panel de administrador: TODAS exigen sesión iniciada y role ADMIN.
import { Router } from 'express'
import * as admin from '../controllers/admin.controller.js'
import { requireAuth, requireRole } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import {
  courtSchema, courtUpdateSchema, productSchema, productUpdateSchema,
  tournamentSchema, tournamentUpdateSchema, classProgramSchema, classProgramUpdateSchema,
  orderStatusSchema, createUserSchema, updateUserSchema,
} from '../schemas/admin.schemas.js'

const router = Router()
router.use(requireAuth, requireRole('ADMIN'))

router.get('/stats', admin.getStats)

router.get('/courts', admin.courts.list)
router.post('/courts', validate(courtSchema), admin.courts.create)
router.patch('/courts/:id', validate(courtUpdateSchema), admin.courts.update)
router.delete('/courts/:id', admin.courts.remove)

router.get('/products', admin.products.list)
router.post('/products', validate(productSchema), admin.products.create)
router.patch('/products/:id', validate(productUpdateSchema), admin.products.update)
router.delete('/products/:id', admin.products.remove)

router.get('/tournaments', admin.tournaments.list)
router.post('/tournaments', validate(tournamentSchema), admin.tournaments.create)
router.patch('/tournaments/:id', validate(tournamentUpdateSchema), admin.updateTournament)
router.delete('/tournaments/:id', admin.tournaments.remove)

router.get('/classes', admin.listClassPrograms)
router.post('/classes', validate(classProgramSchema), admin.createClassProgram)
router.patch('/classes/:id', validate(classProgramUpdateSchema), admin.updateClassProgram)
router.delete('/classes/:id', admin.deleteClassProgram)

router.get('/reservations', admin.listReservations)
// Para cancelar una reserva se usa PATCH /api/reservations/:id/cancel (permite al ADMIN)

router.get('/orders', admin.listOrders)
router.patch('/orders/:id/status', validate(orderStatusSchema), admin.updateOrderStatus)

router.get('/users', admin.listUsers)
router.post('/users', validate(createUserSchema), admin.createUser)
router.patch('/users/:id', validate(updateUserSchema), admin.updateUser)
router.delete('/users/:id', admin.deleteUser)

export default router

import { Router } from 'express'
import {
  listTournaments,
  listMyRegistrations,
  registerToTournament,
  cancelRegistration,
} from '../controllers/tournaments.controller.js'
import { requireAuth, requireVerifiedEmail, requireNoPendingFines } from '../middlewares/auth.js'
import { validate } from '../middlewares/validate.js'
import { registerTournamentSchema } from '../schemas/tournament.schemas.js'

const router = Router()

router.get('/', listTournaments)
router.get('/registrations/me', requireAuth, listMyRegistrations)
router.post('/:id/register', requireAuth, requireVerifiedEmail, requireNoPendingFines, validate(registerTournamentSchema), registerToTournament)
router.patch('/registrations/:id/cancel', requireAuth, cancelRegistration)

export default router

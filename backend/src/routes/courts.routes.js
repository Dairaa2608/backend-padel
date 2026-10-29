import { Router } from 'express'
import { listCourts, getCourt } from '../controllers/courts.controller.js'

const router = Router()

router.get('/', listCourts)
router.get('/:id', getCourt)

export default router

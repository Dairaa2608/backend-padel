// Configura la aplicación Express (sin arrancarla: eso lo hace server.js).
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import routes from './routes/index.js'
import { notFound } from './middlewares/notFound.js'
import { errorHandler } from './middlewares/errorHandler.js'

export const app = express()

// Solo el frontend indicado en CLIENT_URL puede llamar a la API desde el navegador
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))
// Convierte el cuerpo JSON de las peticiones en req.body (máximo 100 KB)
app.use(express.json({ limit: '100kb' }))
// Lee las cookies de la petición (ahí viaja el token de sesión) y las deja en req.cookies
app.use(cookieParser())

app.use('/api', routes)

// Siempre al final: primero "ruta no encontrada", luego el manejador de errores
app.use(notFound)
app.use(errorHandler)
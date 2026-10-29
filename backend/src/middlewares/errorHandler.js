import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError.js'

// Último middleware: recibe cualquier error y responde siempre con el mismo formato:
// { "error": { "code": "...", "message": "...", "details": ... } }
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err

  if (err instanceof ZodError) {
    // Datos que no cumplen el esquema de validación (ver middlewares/validate.js)
    const details = err.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    error = new AppError(400, 'VALIDATION_ERROR', 'Datos inválidos', details)
  } else if (err instanceof mongoose.Error.CastError) {
    // Ej.: /api/courts/abc → "abc" no es un id válido de MongoDB
    error = new AppError(400, 'INVALID_ID', `El valor "${err.value}" no es un id válido`)
  } else if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
    error = new AppError(400, 'VALIDATION_ERROR', 'Datos inválidos', details)
  } else if (err.code === 11000) {
    error = new AppError(409, 'DUPLICATE', 'Ya existe un registro con esos datos', err.keyValue)
  } else if (err.type === 'entity.parse.failed') {
    error = new AppError(400, 'INVALID_JSON', 'El cuerpo de la petición no es un JSON válido')
  }

  if (!(error instanceof AppError)) {
    // Error inesperado: se registra completo en la consola, pero al cliente no se le dan detalles
    console.error('💥 Error inesperado:', err)
    error = new AppError(500, 'INTERNAL_ERROR', 'Error interno del servidor')
  }

  res.status(error.statusCode).json({
    error: { code: error.code, message: error.message, details: error.details },
  })
}
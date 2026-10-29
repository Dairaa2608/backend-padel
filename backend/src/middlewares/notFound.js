import { AppError } from '../utils/AppError.js'

// Se ejecuta cuando ninguna ruta coincide con la URL pedida
export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `No existe la ruta ${req.method} ${req.originalUrl}`))
}

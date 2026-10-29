// Error "esperado" de la aplicación (recurso no encontrado, datos inválidos…).
// El errorHandler lo convierte en una respuesta con su código HTTP.
export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

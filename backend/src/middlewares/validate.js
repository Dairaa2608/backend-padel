// Valida req.body con un esquema de Zod antes de llegar al controlador.
// Si los datos no son válidos, el errorHandler responde 400 con el detalle de cada campo.
export const validate = (schema) => (req, res, next) => {
  req.body = schema.parse(req.body ?? {})
  next()
}
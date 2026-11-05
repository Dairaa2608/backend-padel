// La cédula es un dato personal: no se guarda tal cual.
// Se guarda su "huella" (HMAC-SHA256 con una clave secreta del servidor):
//  - la misma cédula siempre produce la misma huella → se puede comprobar si ya se usó
//  - con la huella no se puede averiguar la cédula, ni siquiera mirando la base de datos
import crypto from 'node:crypto'

export function hashCedula(cedula) {
return crypto.createHmac('sha256', process.env.CEDULA_SECRET).update(cedula).digest('hex')
}
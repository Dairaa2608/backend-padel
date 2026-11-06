'use strict';
const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
function createReservasController(svc) {
  return {
    create: asyncHandler(async (req,res)=>success(res, await svc.create({ userId: req.user.id, ...req.body }), 'Reserva creada', 201)),
    mine: asyncHandler(async (req,res)=>success(res, await svc.mine(req.user.id), 'Mis reservas')),
    cancel: asyncHandler(async (req,res)=>success(res, await svc.cancel(req.params.id, req.user.id, req.user.rol), 'Reserva cancelada')),
    listAll: asyncHandler(async (_req,res)=>success(res, await svc.listAll(), 'Reservas')),
  };
}
module.exports = { createReservasController };

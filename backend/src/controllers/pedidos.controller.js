'use strict';
const { asyncHandler } = require('../utils/asyncHandler');
const { success } = require('../utils/response');
function createPedidosController(svc) {
  return {
    create: asyncHandler(async (req,res)=>success(res, await svc.create(req.user.id, req.body), 'Pedido creado', 201)),
    mine: asyncHandler(async (req,res)=>success(res, await svc.mine(req.user.id), 'Mis pedidos')),
    pay: asyncHandler(async (req,res)=>success(res, await svc.pay(req.params.id, req.user.id), 'Pedido pagado')),
    listAll: asyncHandler(async (_req,res)=>success(res, await svc.listAll(), 'Pedidos')),
    updateStatus: asyncHandler(async (req,res)=>success(res, await svc.updateStatus(req.params.id, req.body.estado), 'Estado actualizado')),
  };
}
module.exports = { createPedidosController };

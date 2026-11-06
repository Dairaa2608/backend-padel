'use strict';
const { Router } = require('express');
const { validate } = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const { z } = require('zod');
const { objectId } = require('../utils/schemas/common.schema');

function createPedidosRouter(svc, requireAuth) {
  const router = Router();
  const c = require('../controllers/pedidos.controller').createPedidosController(svc);
  router.post('/', requireAuth, c.create);
  router.get('/mine', requireAuth, c.mine);
  router.post('/:id/pay', requireAuth, validate(z.object({ params: z.object({ id: objectId }) })), c.pay);
  router.get('/', requireAuth, requireRoles('admin'), c.listAll);
  router.patch('/:id/status', requireAuth, requireRoles('admin'), validate(z.object({ params: z.object({ id: objectId }), body: z.object({ estado: z.string() }) })), c.updateStatus);
  return router;
}
module.exports = { createPedidosRouter };

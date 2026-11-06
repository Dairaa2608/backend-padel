'use strict';

const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');
const { Pedido, PedidoItem, Producto, Domicilio, Factura } = require('../models');

class PedidoService {
  constructor(repos) {
    this.pedidos = repos.pedidos;
    this.pedidoItems = repos.pedidoItems;
    this.productos = repos.productos;
    this.domicilio = repos.domicilio;
    this.factura = repos.factura;
  }

  async create(userId, { items = [], shipping = 0, method = 'card', address }) {
    if (!Array.isArray(items) || items.length === 0) throw new AppError('Carrito vacío', 400);
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // validate and snapshot
      let subtotal = 0;
      const prepared = [];
      for (const it of items) {
        const pid = it.productId || it.id || it.product_id;
        const qty = Number(it.qty || it.cantidad || 1);
        if (!pid || qty <= 0) throw new AppError('Item inválido', 400);
        const prod = await Producto.findById(pid).session(session);
        if (!prod) throw new AppError('Producto no encontrado', 404);
        if (Number(prod.stock || 0) < qty) throw new AppError(`Stock insuficiente: ${prod.nombre}`, 409);
        const precio = Number(prod.precio || 0);
        subtotal += precio * qty;
        prepared.push({ prod, qty, precio, nombre: prod.nombre });
      }
      const envio = Number(shipping || 0);
      const total = subtotal + envio;

      const pedido = await this.pedidos.insertOne({
        usuario_id: userId,
        estado: 'pendiente',
        subtotal,
        envio,
        total,
        metodo_pago: method || null,
        fecha_creacion: new Date(),
      }, session);

      // items
      for (const p of prepared) {
        await this.pedidoItems.insertOne({
          pedido_id: pedido._id,
          producto_id: p.prod._id,
          cantidad: p.qty,
          nombre: p.nombre,
          precio: p.precio,
        }, session);
        // discount stock
        p.prod.stock = Number(p.prod.stock || 0) - p.qty;
        await p.prod.save({ session });
      }

      // domicilio
      if (address) {
        await this.domicilio.insertOne({
          pedido_id: pedido._id,
          nombre: address.name || '',
          email: address.email || '',
          telefono: address.phone || '',
          direccion: address.address || address.direccion || '',
        }, session);
      }

      // factura
      await this.factura.insertOne({
        pedido_id: pedido._id,
        numero: `FAC-${Date.now().toString().slice(-8)}`,
        total,
        fecha: new Date(),
        estado: 'emitida',
      }, session);

      await session.commitTransaction();
      session.endSession();
      return {
        orderId: String(pedido._id),
        status: pedido.estado,
        subtotal,
        shipping: envio,
        total,
        createdAt: pedido.fecha_creacion,
      };
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async pay(pedidoId, userId) {
    const p = await Pedido.findById(pedidoId);
    if (!p) throw new AppError('Pedido no encontrado', 404);
    if (String(p.usuario_id) !== String(userId)) throw new AppError('No autorizado', 403);
    p.estado = 'pagado';
    await p.save();
    return { orderId: String(p._id), status: p.estado };
  }

  async mine(userId) {
    const list = await Pedido.find({ usuario_id: userId }).sort({ fecha_creacion: -1 }).lean();
    const out = [];
    for (const ped of list) {
      const items = await PedidoItem.find({ pedido_id: ped._id }).lean();
      const dom = await Domicilio.findOne({ pedido_id: ped._id }).lean();
      const fac = await Factura.findOne({ pedido_id: ped._id }).lean();
      out.push({
        id: String(ped._id),
        ...ped,
        items,
        domicilio: dom,
        factura: fac,
      });
    }
    return out;
  }

  async listAll() {
    const list = await Pedido.find({}).sort({ fecha_creacion: -1 }).lean();
    const out = [];
    for (const ped of list) {
      const usuario = ped.usuario_id ? await mongoose.model('Usuario').findById(ped.usuario_id).select('nombre email telefono').lean() : null;
      const items = await PedidoItem.find({ pedido_id: ped._id }).lean();
      const dom = await Domicilio.findOne({ pedido_id: ped._id }).lean();
      const fac = await Factura.findOne({ pedido_id: ped._id }).lean();
      out.push({
        id: String(ped._id),
        ...ped,
        user: usuario ? { id: String(usuario._id), nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono } : null,
        items,
        domicilio: dom,
        factura: fac,
      });
    }
    return out;
  }

  async updateStatus(pedidoId, estado) {
    const p = await Pedido.findById(pedidoId);
    if (!p) throw new AppError('Pedido no encontrado', 404);
    p.estado = estado;
    await p.save();
    return { id: String(p._id), estado: p.estado };
  }
}

module.exports = { PedidoService };

'use strict';

const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');
const { Reserva } = require('../models');

class ReservaService {
  constructor(repos) {
    this.reservas = repos.reservas;
    this.canchas = repos.canchas;
  }

  #toHours(h) {
    if (!h) return null;
    // accept "7", "07:00", "7:00 AM" not expected but try
    const m = String(h).match(/(\d{1,2})/);
    if (m) return parseInt(m[1]);
    return null;
  }

  async create({ userId, cancha_id, fecha, hora_inicio, hora_fin, nombre, email, phone }) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const cancha = await this.canchas.findById(cancha_id).session(session);
      if (!cancha) throw new AppError('Cancha no encontrada', 404);
      if (cancha.disponible === false) throw new AppError('Cancha no disponible', 409);

      const hi = this.#toHours(hora_inicio);
      const hf = this.#toHours(hora_fin);
      if (hi === null || hf === null || hf <= hi) throw new AppError('Horario inválido', 400);

      // check overlap: same cancha, same fecha, estados pendientes/confirmadas
      const existing = await Reserva.find({ cancha_id: cancha._id, fecha, estado: { $in: ['pendiente', 'confirmada'] } }).session(session).lean();
      for (const r of existing) {
        const rhi = this.#toHours(r.hora_inicio);
        const rhf = this.#toHours(r.hora_fin);
        if (rhi === null || rhf === null) continue;
        if (!(hf <= rhi || hi >= rhf)) {
          throw new AppError('Horario no disponible (traslape)', 409);
        }
      }

      const duracion = hf - hi;
      const precio = Number(cancha.precio_por_hora || 0) * duracion;

      const reserva = await this.reservas.insertOne({
        usuario_id: userId,
        tipo: 'cancha',
        cancha_id: cancha._id,
        fecha,
        hora_inicio: typeof hora_inicio === 'string' && hora_inicio.includes(':') ? hora_inicio : `${hi}:00`,
        hora_fin: typeof hora_fin === 'string' && hora_fin.includes(':') ? hora_fin : `${hf}:00`,
        estado: 'confirmada',
        precio,
        fecha_creacion: new Date(),
      }, session);

      await session.commitTransaction();
      session.endSession();
      return {
        id: String(reserva._id),
        court: cancha.nombre,
        courtId: String(cancha._id),
        date: fecha,
        startHour: hora_inicio,
        endHour: hora_fin,
        duration: duracion,
        total: precio,
        name: nombre,
        email,
        phone,
        estado: reserva.estado,
      };
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  }

  async mine(userId) {
    const list = await Reserva.find({ usuario_id: userId, tipo: 'cancha' }).sort({ fecha_creacion: -1 }).lean();
    const out = [];
    for (const r of list) {
      const cancha = r.cancha_id ? await this.canchas.findById(r.cancha_id).lean() : null;
      out.push({
        id: String(r._id),
        court: cancha?.nombre,
        courtId: cancha ? String(cancha._id) : null,
        courtType: cancha?.tipo,
        date: r.fecha,
        startHour: r.hora_inicio,
        endHour: r.hora_fin,
        total: r.precio,
        estado: r.estado,
        createdAt: r.fecha_creacion,
      });
    }
    return out;
  }

  async cancel(id, userId, userRole) {
    const r = await Reserva.findById(id);
    if (!r) throw new AppError('Reserva no encontrada', 404);
    if (userRole !== 'admin' && String(r.usuario_id) !== String(userId)) throw new AppError('No autorizado', 403);
    r.estado = 'cancelada';
    await r.save();
    return { id: String(r._id), estado: r.estado };
  }

  async listAll() {
    const list = await Reserva.find({}).sort({ fecha_creacion: -1 }).lean();
    const out = [];
    for (const r of list) {
      const cancha = r.cancha_id ? await this.canchas.findById(r.cancha_id).lean() : null;
      const usuario = r.usuario_id ? await mongoose.model('Usuario').findById(r.usuario_id).select('nombre email telefono').lean() : null;
      out.push({
        id: String(r._id),
        court: cancha?.nombre || 'Cancha',
        courtId: cancha ? String(cancha._id) : null,
        courtType: cancha?.tipo,
        user: usuario ? { id: String(usuario._id), nombre: usuario.nombre, email: usuario.email, telefono: usuario.telefono } : null,
        date: r.fecha,
        startHour: r.hora_inicio,
        endHour: r.hora_fin,
        total: r.precio,
        estado: r.estado,
        createdAt: r.fecha_creacion,
      });
    }
    return out;
  }
}

module.exports = { ReservaService };

'use strict';

/**
 * Script para crear o promover un usuario Administrador en PadelZone.
 * Uso:
 *   node scripts/crear_admin.js admin@padelzone.com Password123 "Admin PadelZone"
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/padelzone';

async function main() {
  const email = process.argv[2] || 'admin@padelzone.com';
  const password = process.argv[3] || 'Admin123456!';
  const nombre = process.argv[4] || 'Administrador Principal';

  console.log(`Conectando a: ${URI}`);
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();

  const usuarios = db.collection('usuarios');
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await usuarios.findOne({ email: normalizedEmail });
  if (existing) {
    await usuarios.updateOne(
      { _id: existing._id },
      { $set: { rol: 'admin', nombre: nombre || existing.nombre } }
    );
    console.log(`✔ Usuario existente '${normalizedEmail}' actualizado a rol: 'admin'`);
  } else {
    const password_hash = await bcrypt.hash(password, 12);
    await usuarios.insertOne({
      nombre,
      email: normalizedEmail,
      password_hash,
      rol: 'admin',
      fecha_registro: new Date(),
    });
    console.log(`✔ Usuario administrador creado con éxito:`);
    console.log(`   Email: ${normalizedEmail}`);
    console.log(`   Password: ${password}`);
    console.log(`   Rol: admin`);
  }

  await client.close();
}

main().catch((err) => {
  console.error('Error al crear admin:', err.message);
  process.exit(1);
});


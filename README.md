# PadelZone

Proyecto final: aplicación web de pádel con frontend React y API REST en Node.js, Express y MongoDB (Mongoose).

## Requisitos

- Node.js 20 o superior.
- MongoDB local o una base de datos en MongoDB Atlas.

## Backend

```bash
cd backend
npm install
cp .env.example .env
# Edita .env: configura MONGODB_URI y cambia JWT_SECRET por una clave propia
npm run dev
```

El servidor usa `MONGODB_URI` y `JWT_SECRET` del archivo `backend/.env`. La clave JWT debe tener al menos 16 caracteres. Para Atlas, usa la URI de conexión proporcionada por Atlas. No compartas ni subas `.env` al repositorio.

API: `http://localhost:3000/api`

Health check: `http://localhost:3000/api/health`

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

La variable `VITE_API_URL` configura la URL de la API; el valor de ejemplo es `http://localhost:3000`.

App: `http://localhost:5173`

## Scripts

- Backend: `npm run dev`, `npm start`, `npm run crear-db`.
- Frontend: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.

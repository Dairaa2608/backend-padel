# PadelZone — Backend

API y base de datos del club de pádel PadelZone (stack **MERN**: MongoDB, Express, React, Node.js).

- **Base de datos:** MongoDB Atlas (en la nube, plan gratuito)
- **ODM:** Mongoose
- **Node.js:** 20 o superior (recomendado: la versión LTS más reciente)

## Puesta en marcha (primera vez)

Todos los comandos se ejecutan dentro de la carpeta `backend/`.

### 1. Crear la base de datos en MongoDB Atlas

1. Crea una cuenta en <https://www.mongodb.com/cloud/atlas/register>.
2. Crea un clúster **gratuito (M0)**.
3. En **Database Access**, crea un usuario de base de datos con contraseña (guárdala).
4. En **Network Access**, añade tu IP (o `0.0.0.0/0` solo para desarrollo).
5. En el clúster, pulsa **Connect → Drivers** y copia la cadena de conexión (`mongodb+srv://...`).

### 2. Variables de entorno

Copia `.env.example` como `.env`:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env
# Mac / Linux
cp .env.example .env
```

Abre `.env` y pega tu cadena de conexión en `MONGODB_URI`, con tu usuario y contraseña de Atlas.
Escribe `padelzone` como nombre de la base de datos, justo antes del `?`:

```
MONGODB_URI="mongodb+srv://miusuario:miclave@cluster0.xxxxx.mongodb.net/padelzone?retryWrites=true&w=majority"
```

Cambia también `SEED_ADMIN_PASSWORD` por una contraseña propia (la del administrador de la página).

> **¿MongoDB instalado en tu computador (Compass con `localhost:27017`)?** Usa
> `MONGODB_URI="mongodb://localhost:27017/padelzone"` en lugar de la cadena de Atlas.

### 3. Instalar dependencias y cargar los datos

```bash
npm install
npm run seed
```

Debe aparecer `✅ Conectado a MongoDB` y `✅ Seed completado`.

### 4. Comprobar que funcionó

En Atlas, abre tu clúster → **Browse Collections** → base de datos `padelzone`. Deberías ver:

| Colección | Documentos |
|---|---|
| `courts` | 5 canchas |
| `classprograms` | 4 programas (con 12 grupos dentro) |
| `tournaments` | 3 torneos |
| `products` | 6 productos |
| `users` | 1 administrador |
| `reservations`, `classenrollments`, `tournamentregistrations`, `orders` | vacías (se llenarán al usar la app) |

### 5. Arrancar la API

```bash
npm run dev
```

Debe aparecer `🚀 API escuchando en http://localhost:3000/api`. Abre en el navegador:

- <http://localhost:3000/api/health> → `{"data":{"status":"ok","database":"connected"}}`
- <http://localhost:3000/api/courts> → las 5 canchas desde MongoDB

Para apagarla: **Ctrl + C**.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Arranca la API en modo desarrollo: se reinicia sola al guardar un archivo |
| `npm start` | Arranca la API (modo producción, sin reinicio automático) |
| `npm run seed` | Crea los índices y carga los datos iniciales (se puede ejecutar varias veces sin duplicar) |

## Endpoints

| Método | Ruta | Qué devuelve |
|---|---|---|
| GET | `/api/health` | Estado de la API y de la conexión a MongoDB |
| GET | `/api/courts` | Canchas activas |
| GET | `/api/courts/:id` | Una cancha |

### Formato de las respuestas

Todas las respuestas usan el mismo formato, para que el frontend las maneje igual:

```json
// Éxito
{ "data": { ... } }

// Error
{ "error": { "code": "COURT_NOT_FOUND", "message": "Cancha no encontrada" } }
```

| Código HTTP | Cuándo |
|---|---|
| 200 | Todo bien |
| 400 | Datos o id inválidos (`VALIDATION_ERROR`, `INVALID_ID`, `INVALID_JSON`) |
| 404 | No existe el recurso o la ruta (`NOT_FOUND`, `COURT_NOT_FOUND`) |
| 409 | Registro duplicado (`DUPLICATE`) |
| 500 | Error inesperado del servidor (`INTERNAL_ERROR`) |

## Estructura

```
backend/
├─ src/
│  ├─ server.js        ← punto de entrada: carga .env, conecta a MongoDB y arranca
│  ├─ app.js           ← configura Express (CORS, JSON, rutas, errores)
│  ├─ config/db.js     ← conexión a MongoDB
│  ├─ routes/          ← qué URL llama a qué función
│  ├─ controllers/     ← qué hace cada URL (consulta los modelos y responde)
│  ├─ middlewares/     ← piezas que se ejecutan en cada petición (errores, 404…)
│  ├─ utils/           ← utilidades (AppError)
│  ├─ models/          ← un archivo por colección (esquemas de Mongoose)
│  └─ seed/            ← datos iniciales y script que los carga
├─ .env.example        ← plantilla de configuración (sin secretos)
└─ package.json
```

## Modelo de datos

```mermaid
erDiagram
    USER ||--o{ RESERVATION : hace
    COURT ||--o{ RESERVATION : "se reserva en"
    USER ||--o{ CLASS_ENROLLMENT : "se inscribe"
    CLASS_PROGRAM ||--o{ CLASS_ENROLLMENT : "recibe (en un grupo)"
    USER ||--o{ TOURNAMENT_REGISTRATION : "se inscribe"
    TOURNAMENT ||--o{ TOURNAMENT_REGISTRATION : recibe
    USER ||--o{ ORDER : compra
    PRODUCT ||--o{ ORDER : "aparece en (items)"
```

### Decisiones de diseño

- **Documentos embebidos donde se leen juntos:** los grupos y su profesor van dentro de `classprograms`; los productos comprados van dentro de `orders`.
- **Referencias donde crecen sin límite:** reservas e inscripciones son colecciones aparte que apuntan al usuario y a la cancha, clase o torneo.
- **Sin reservas dobles:** cada reserva guarda las horas que ocupa (`slots`, p. ej. 18–20 → `[18, 19]`) y un índice único sobre cancha + fecha + hora impide que dos reservas **confirmadas** compartan una hora. Lo garantiza MongoDB aunque lleguen dos peticiones a la vez. Las canceladas no bloquean el horario.
- **Dinero en pesos enteros:** sin decimales, para evitar errores de redondeo.
- **Precios copiados** en `reservations.totalPrice` y `orders.items.unitPrice`: si un precio cambia, lo ya reservado o comprado no se altera.
- **Cancelar no borra:** se cambia `status` a `CANCELLED` y queda el historial.
- **Contraseñas** cifradas con bcrypt y ocultas por defecto en las consultas (`select: false`).
- **No hay colección de carrito:** el carrito vive en el frontend; solo se guarda el pedido final.
- **No se guardan datos de tarjetas:** si se implementan pagos reales, se hará con una pasarela de pago.

### Pendiente de confirmar

- Inscripción a torneos individual o por parejas (`partnerName` es opcional por ahora).
- Imágenes: hoy están dentro del frontend; los campos `imageUrl` quedan vacíos hasta definir dónde se alojan.
- Control de cupos en clases y torneos: se hará en la API al inscribir (contando inscripciones activas).

## Errores comunes

| Error | Causa y solución |
|---|---|
| `Falta MONGODB_URI en el archivo .env` | No existe el archivo `.env` (paso 2) o la variable está vacía |
| `bad auth : authentication failed` | Usuario o contraseña de Atlas incorrectos en `MONGODB_URI`. Si la contraseña tiene símbolos (`@`, `#`, `/`…), cámbiala por una sin símbolos |
| `Could not connect to any servers in your MongoDB Atlas cluster` | Tu IP no está permitida: Atlas → **Network Access** → añade tu IP actual |
| `EADDRINUSE: address already in use :::3000` | Ya hay otra API encendida en el puerto 3000: ciérrala (Ctrl + C en su terminal) o cambia `PORT` en `.env` |
| `Invalid scheme, expected connection string to start with "mongodb://"` | La línea `MONGODB_URI` de `.env` está mal escrita: espacios, comillas curvas o falta `mongodb://` |
| `querySrv ENOTFOUND` | La dirección del clúster está mal copiada, o tu red bloquea MongoDB (prueba con otra red) |

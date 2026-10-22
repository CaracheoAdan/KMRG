# ARQUITECTURA Y SEGURIDAD (Fuente de la Verdad)

> **AVISO CRÍTICO**: Este documento representa la **fuente de la verdad** técnica, estructural y de seguridad del proyecto KMRG. DEBE ser consultado y respetado estrictamente antes de generar, modificar o refactorizar cualquier archivo en este repositorio.

---

## 1. Arquitectura del Proyecto

El proyecto está estructurado como un monorepo con tres aplicaciones independientes y tipado estricto en **TypeScript**:

```text
KMRG/
├── backend/          # API REST Node.js + Express + Prisma ORM + PostgreSQL
├── admin-web/        # Panel Web en React + Vite + Tailwind CSS + TypeScript
├── mobile-app/       # App Móvil en React Native + Expo + TypeScript
├── .github/workflows # Integración Continua (typecheck + tests)
├── ARCHITECTURE_AND_SECURITY.md
└── README.md
```

### 1.1. `/backend`
- **Tecnologías**: Node.js, Express, TypeScript (`strict: true`), Prisma ORM, PostgreSQL, Zod, Pino (`pino` + `pino-http`), Vitest + Supertest.
- **Responsabilidad**:
  - Gestión de datos centralizados (mensajes, hitos, interacciones, usuarios administradores).
  - Autenticación y control de accesos mediante JWT en cookie `httpOnly` (`kmrg_session`) más defensa CSRF por cabecera personalizada (`X-Requested-With: kmrg-admin`).
  - Exposición de endpoints REST seguros con validación estricta en Zod.
  - Políticas de CORS diferenciadas, Rate Limiting granular y logs estructurados con redacción de cabeceras sensibles.

### 1.2. `/admin-web`
- **Tecnologías**: React, Vite, Tailwind CSS, TypeScript, Axios, Lucide Icons.
- **Responsabilidad**:
  - Panel administrativo para gestionar la base de datos (crear, editar y eliminar mensajes e hitos).
  - Autenticación segura mediante correo/contraseña respaldada por cookie `httpOnly` (`withCredentials: true`) e hidratación de sesión vía `GET /api/auth/me` (sin almacenar tokens en `localStorage`).
  - Visualización del historial de interacciones enviadas desde la app móvil.

### 1.3. `/mobile-app`
- **Tecnologías**: React Native, Expo, TypeScript, Expo Notifications, AsyncStorage.
- **Responsabilidad**:
  - Consumo de API para sincronización de mensajes (`GET /api/mobile/messages/sync`) e hitos (`GET /api/mobile/milestones`) con almacenamiento local en caché.
  - Confirmación de lectura (`POST /api/mobile/messages/:id/read`) con cola persistente offline para reintentos automáticos.
  - Envío de interacciones específicas (`POST /api/mobile/interact`, ej. botón "Pensando en ti").
  - Programación de notificaciones locales en el teléfono basadas en las fechas programadas de los mensajes (`scheduled_date`).

---

## 2. Modelo de Datos, Migraciones y Tipos Seguros

### 2.1. Reglas Generales de Tipado y Base de Datos
- **Llaves Primarias (PK)**: Obligatorio el uso de **UUIDv4** en todas las tablas. Prohibido el uso de enteros autoincrementables para prevenir ataques de enumeración.
- **Fechas**: Almacenamiento obligatorio en formato `TIMESTAMPTZ` o `DATE` en PostgreSQL, y validadas como fechas reales de calendario (`YYYY-MM-DD`) o cadenas ISO 8601 en la API.
- **Validación en Runtime**: Todos los payloads entrantes (`body`, `params`, `query`) son validados mediante esquemas de **Zod** antes de llegar a los controladores.
- **Manejo de Errores Prisma**: Las operaciones `update` y `delete` se ejecutan en una sola consulta a la base de datos y traducen el código `P2025` (*record not found*) a HTTP `404` mediante un helper compartido (`handlePrismaError`).
- **Migraciones Versionadas**: Los cambios de esquema se versionan en `backend/prisma/migrations/` y se aplican en producción con `npm run prisma:deploy` (`prisma migrate deploy`).

### 2.2. Esquema Base (PostgreSQL / Prisma)

#### Tabla `messages`
- `id`: UUID (Primary Key, default `uuid()`)
- `content`: TEXT (Contenido del mensaje o carta, 1..5000 caracteres)
- `scheduled_date`: DATE (Fecha asignada para que el mensaje sea visible/desbloqueado)
- `theme_color`: VARCHAR(50) (Color hexadecimal estricto `#RRGGBB`)
- `is_read`: BOOLEAN (default: `false`, indica si el destinatario ya leyó el mensaje)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `milestones`
- `id`: UUID (Primary Key, default `uuid()`)
- `title`: VARCHAR(255) (Título del hito o aniversario)
- `date`: DATE (Fecha del acontecimiento)
- `image_url`: VARCHAR(1024) (URL `http(s)` de la imagen o recurso visual)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `interactions`
- `id`: UUID (Primary Key, default `uuid()`)
- `type`: VARCHAR(100) (Lista blanca: `'thinking_of_you'`, `'heartbeat'`, `'reaction'`)
- `payload`: JSONB (default: `'{}'`, metadatos acotados a máximo 20 claves y 2 KB)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `admin_users`
- `id`: UUID (Primary Key, default `uuid()`)
- `email`: VARCHAR(255) (Unique, normalizado en minúsculas)
- `password_hash`: VARCHAR(255) (Hash con `bcrypt`, factor de costo 12)
- `created_at`: TIMESTAMPTZ (default: `now()`)

---

## 3. Reglas de Seguridad (Obligatorias)

1. **Prevención de Inyección SQL**:
   - Queda estrictamente prohibido concatenar strings en consultas SQL raw.
   - Toda interacción con la base de datos se ejecuta vía Prisma ORM.

2. **Autenticación Admin por Cookie `httpOnly` + Defensa CSRF**:
   - `POST /api/auth/login` emite un JWT firmado con `HS256` (con `iss`, `aud` y `sub` verificados) y lo almacena exclusivamente en la cookie `kmrg_session` con atributos `HttpOnly`, `SameSite=Strict`, `Secure` (en `NODE_ENV=production`), `Path=/api` y `maxAge` acorde a `JWT_EXPIRES_IN`. El cuerpo de la respuesta **nunca** incluye el token JWT.
   - `GET /api/auth/me` permite hidratar la sesión del panel web leyendo la cookie `kmrg_session`, y `POST /api/auth/logout` limpia la cookie.
   - **Defensa CSRF**: Toda petición mutable (métodos distintos de `GET`, `HEAD`, `OPTIONS`) hacia `/api/admin/*`, `/api/auth/logout` y `/api/auth/register` exige la cabecera personalizada `X-Requested-With: kmrg-admin` (si falta o no coincide, responde `403 Forbidden`). Un formulario HTML o petición simple cross-site no puede fijar esta cabecera sin pasar antes por un preflight CORS autorizado.
   - **Requisito Same-Site en Producción**: Debido a que la cookie `kmrg_session` utiliza `SameSite=Strict`, en producción el panel `admin-web` y el `backend` **deben desplegarse bajo el mismo sitio registrable (same-site)** (por ejemplo, `admin.tudominio.com` y `api.tudominio.com`, o bajo el mismo dominio mediante un reverse proxy en `/api`) para que el navegador adjunte la cookie en las peticiones XHR/Fetch con `withCredentials: true`.
   - **Registro de Administradores**: `POST /api/auth/register` nunca es público; exige sesión de un administrador activo, cabecera CSRF y que `ALLOW_ADMIN_REGISTRATION=true` esté habilitado explícitamente. El primer administrador se crea mediante `npm run prisma:seed` usando `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

3. **Seguridad y Modelo de Amenazas de la App Móvil**:
   - Rutas móviles expuestas bajo `/api/mobile`:
     - `GET /api/mobile/messages/sync`: sincronización de mensajes.
     - `GET /api/mobile/milestones`: sincronización de hitos ordenados por fecha ascendente.
     - `POST /api/mobile/messages/:id/read`: marca un mensaje como leído (`is_read = true`), con validación de UUID y Rate Limiting de **30 peticiones/minuto por IP**.
     - `POST /api/mobile/interact`: registra una interacción afectiva, con lista blanca de tipos, tamaño de payload acotado y Rate Limiting estricto de **5 peticiones/minuto por IP**.
   - **Limitación inherente de `EXPO_PUBLIC_MOBILE_API_KEY`**: Cualquier variable prefijada con `EXPO_PUBLIC_` se incrusta en el bundle JavaScript del cliente y es **extraíble al descompilar el APK/IPA**. Por lo tanto, la `x-api-key` móvil actúa únicamente como filtro básico anti-ruido/bots casuales y se verifica en tiempo constante (`crypto.timingSafeEqual`). La protección real reside en que los endpoints móviles **no permiten crear, modificar ni eliminar contenido administrativo** (solo lectura, marcado de `is_read=true` e inserción acotada de interacciones) junto con validación estricta de esquemas y Rate Limiting por IP.

4. **Configuración de CORS y Cabeceras**:
   - CORS restringe orígenes verificados a `ADMIN_WEB_URL` (más redes locales en `development`), habilita `credentials: true` y declara `allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With']`.
   - Se aplica `helmet()` globalmente y límite de tamaño de cuerpo (`100kb`) en los parsers JSON/URL-encoded.

5. **Logs Estructurados y Redacción de Secretos**:
   - El backend utiliza `pino` y `pino-http` asignando un `X-Request-Id` por solicitud y redactando automáticamente `req.headers.authorization`, `req.headers.cookie`, `req.headers["x-api-key"]` y `res.headers["set-cookie"]`.
   - En `NODE_ENV=production`, el servidor aborta el arranque si detecta valores por defecto de desarrollo en `DATABASE_URL`, `JWT_SECRET` o `MOBILE_API_KEY`.

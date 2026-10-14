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
├── ARCHITECTURE_AND_SECURITY.md
└── README.md
```

### 1.1. `/backend`
- **Tecnologías**: Node.js, Express (o Fastify), TypeScript, Prisma ORM, PostgreSQL.
- **Responsabilidad**:
  - Gestión de datos centralizados (mensajes, hitos, interacciones, usuarios administradores).
  - Autenticación y control de accesos mediante JWT.
  - Exposición de endpoints REST seguros con validación Zod.
  - Políticas de CORS diferenciadas y Rate Limiting estricto.

### 1.2. `/admin-web`
- **Tecnologías**: React, Vite, Tailwind CSS, TypeScript, Axios/Fetch, Lucide Icons / Headless UI.
- **Responsabilidad**:
  - Panel administrativo para gestionar la base de datos (crear, editar, eliminar mensajes e hitos).
  - Autenticación segura mediante usuario/contraseña con almacenamiento de token JWT en sesión/cookies seguras.
  - Visualización del registro de interacciones en tiempo real.

### 1.3. `/mobile-app`
- **Tecnologías**: React Native, Expo, TypeScript, Expo Notifications, AsyncStorage / SQLite.
- **Responsabilidad**:
  - Consumo de API en modo de solo lectura (GET) con almacenamiento local en caché.
  - Envío de interacciones específicas (ej. botón "Pensando en ti") a endpoints dedicados.
  - Programación de notificaciones locales en el teléfono basadas en las fechas de los mensajes programados.
  - Capacidad offline para mostrar mensajes previamente sincronizados.

---

## 2. Modelo de Datos y Tipos Seguros

### 2.1. Reglas Generales de Tipado y DB
- **Llaves Primarias (PK)**: Obligatorio el uso de **UUIDv4** en todas las tablas. Prohibido el uso de enteros autoincrementables para prevenir ataques de enumeración.
- **Fechas**: Almacenamiento obligatorio en formato `TIMESTAMPTZ` o `DATE` en PostgreSQL, y representadas estrictamente como cadenas ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) o `YYYY-MM-DD` en la API.
- **Validación en Runtime**: Todos los payloads entrantes (`body`, `params`, `query`) deben ser validados mediante esquemas de **Zod** antes de ser procesados por los controladores.
- **TypeScript Strict**: `tsconfig.json` con `"strict": true` en todos los proyectos.

### 2.2. Esquema Base Requerido (PostgreSQL / Prisma)

#### Tabla `messages`
- `id`: UUID (Primary Key, default: `gen_random_uuid()` / `uuid()`)
- `content`: TEXT (Contenido del mensaje o carta)
- `scheduled_date`: DATE (Fecha asignada para que el mensaje sea visible/desbloqueado)
- `theme_color`: VARCHAR(50) (Color o estilo temático del mensaje, ej. `#FF5733` o `romantic-rose`)
- `is_read`: BOOLEAN (default: `false`, indica si el destinatario ya leyó el mensaje)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `milestones`
- `id`: UUID (Primary Key, default: `gen_random_uuid()` / `uuid()`)
- `title`: VARCHAR(255) (Título del hito o aniversario)
- `date`: DATE (Fecha del acontecimiento)
- `image_url`: VARCHAR(1024) (URL de la imagen o recurso visual)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `interactions`
- `id`: UUID (Primary Key, default: `gen_random_uuid()` / `uuid()`)
- `type`: VARCHAR(100) (Tipo de interacción: ej. `'thinking_of_you'`, `'heartbeat'`, `'reaction'`)
- `payload`: JSONB (default: `'{}'`, metadatos opcionales como hora local, notas o emoji)
- `created_at`: TIMESTAMPTZ (default: `now()`)

#### Tabla `admin_users` (Soporte de autenticación admin)
- `id`: UUID (Primary Key, default: `gen_random_uuid()` / `uuid()`)
- `email`: VARCHAR(255) (Unique)
- `password_hash`: VARCHAR(255) (Hash con bcrypt/argon2)
- `created_at`: TIMESTAMPTZ (default: `now()`)

---

## 3. Reglas de Seguridad (Obligatorias)

1. **Prevención de Inyección SQL**:
   - Queda estrictamente prohibido concatenar strings en queries SQL raw.
   - Toda interacción con la base de datos debe ejecutarse vía el ORM (Prisma) o mediante sentencias parametrizadas.

2. **Autenticación y Autorización**:
   - El panel de administración (`/admin-web`) opera protegido por tokens **JWT**.
   - Ninguna ruta de escritura (`POST`, `PUT`, `PATCH`, `DELETE`) puede ser pública, a excepción expresa del endpoint de interacción móvil.
   - Las contraseñas deben estar hasheadas con `bcrypt` (mínimo cost factor de 10) o `argon2`.

3. **Seguridad de la App Móvil**:
   - La app móvil solo tiene acceso a endpoints `GET` para sincronizar datos.
   - El único endpoint de escritura autorizado para la app móvil es `POST /api/interactions` (ej. botón "Pensando en ti").
   - Dicho endpoint debe estar protegido por un `x-api-key` estático verificado en middleware y un middleware de **Rate Limiting** estricto (ej. máximo 5 peticiones por minuto por IP/dispositivo) para evitar inundaciones o abusos.

4. **Configuración de CORS**:
   - En el backend, CORS debe estar configurado de forma explícita:
     - Métodos de escritura (`POST`, `PUT`, `DELETE`, `PATCH`) y rutas administrativas solo deben admitir solicitudes con origen verificado del panel de administración (`ADMIN_WEB_URL`).
     - Los endpoints móviles deben restringirse adecuadamente sin exponer cabeceras inseguras ni permitir orígenes no autorizados en rutas de gestión.

5. **Variables de Entorno y Secretos**:
   - Ningún secreto, cadena de conexión a PostgreSQL, API key o secreto JWT debe estar hardcodeado en el código fuente.
   - Todo se inyecta vía archivos `.env`.
   - Se debe mantener un archivo `.env.example` en cada subproyecto como documentación de variables requeridas.
   - Todos los archivos `.env` y `.env.*.local` deben estar listados en `.gitignore`.

---

## 4. Funcionalidades Core a Soportar

1. **Descarga Anticipada (Prefetching)**:
   - La app móvil cuenta con una estrategia de sincronización que descarga los mensajes programados futuros (o aquellos desbloqueables próximamente) hacia el almacenamiento local seguro (`AsyncStorage` / `SQLite`).
   - Esto garantiza funcionamiento fluido incluso sin conexión activa.

2. **Notificaciones Locales Programadas**:
   - A partir de los mensajes sincronizados y sus fechas (`scheduled_date`), la app móvil programa notificaciones locales en el sistema operativo del teléfono (vía `expo-notifications`).
   - Las notificaciones se disparan de manera autónoma en el dispositivo a la hora y fecha estipulada para avisar que un nuevo mensaje está disponible.

3. **Interacciones en Tiempo Real (Botón "Pensando en ti")**:
   - La app móvil expone un botón dedicado para enviar una señal de afecto inmediata (`POST /api/interactions`).
   - El backend registra la interacción en la base de datos y puede disparar webhooks o notificaciones push para alertar al panel web o al destinatario en tiempo real.

# KMRG

Proyecto monorepo compuesto por un Backend en Node.js + Express + PostgreSQL, un Panel de Administración Web en React + Vite y una Aplicación Móvil en React Native + Expo. Todo estrictamente tipado con TypeScript (`strict: true`).

> **Documento de Referencia Obligatorio:** Consulta [ARCHITECTURE_AND_SECURITY.md](ARCHITECTURE_AND_SECURITY.md) para conocer las reglas de arquitectura, modelo de datos, autenticación por cookie `httpOnly` + CSRF, migraciones y directrices de seguridad.

---

## Estructura del Proyecto

- [`/backend`](backend): API REST con Express, Prisma ORM, validación con Zod, autenticación con cookie `httpOnly` (`kmrg_session`) + protección CSRF, logger estructurado con Pino, rate limiting y suite de tests con Vitest + Supertest.
- [`/admin-web`](admin-web): Panel Web con React 18, Vite y Tailwind CSS para gestión de mensajes, hitos e interacciones.
- [`/mobile-app`](mobile-app): Aplicación móvil React Native con Expo, sincronización offline-first de mensajes e hitos, confirmación de lectura con cola de reintentos y botón de interacción "Pensando en ti".

---

## Inicio Rápido

### 1. Instalación (raíz del monorepo)
```bash
npm install
```

### 2. Backend (Base de datos, migraciones y seed)
```bash
cd backend
cp .env.example .env
# Configura DATABASE_URL, secretos y SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD en .env

# Generar cliente Prisma
npm run prisma:generate

# Aplicar migraciones en desarrollo (o `npm run prisma:deploy` en producción)
npm run prisma:migrate

# Crear el usuario administrador inicial y datos de ejemplo
# Requiere definir SEED_ADMIN_PASSWORD (mínimo 8 caracteres) en .env o en el entorno
npm run prisma:seed

# Iniciar servidor en modo desarrollo
npm run dev
```

### 3. Admin Web
```bash
cd admin-web
cp .env.example .env
npm run dev
```

### 4. Mobile App
```bash
cd mobile-app
cp .env.example .env
npm run start
```

---

## Verificación de Tipos y Tests

Desde la raíz del monorepo puedes ejecutar la verificación estática de TypeScript y la suite de pruebas automatizadas del backend:

```bash
# Typecheck de los tres paquetes
npx tsc --noEmit -p backend
npx tsc --noEmit -p admin-web
cd mobile-app && npx tsc --noEmit

# Ejecutar tests de seguridad y contrato de la API en el backend (Vitest + Supertest)
npm --workspace=backend test
```

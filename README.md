# KMRG

Proyecto monorepo compuesto por un Backend en Node.js + PostgreSQL, un Panel de Administración Web en React + Vite y una Aplicación Móvil en React Native + Expo. Todo estrictamente tipado con TypeScript.

> 📖 **Documento de Referencia Obligatorio:** Consulta [ARCHITECTURE_AND_SECURITY.md](ARCHITECTURE_AND_SECURITY.md) para conocer las reglas de arquitectura, modelo de datos y directrices de seguridad.

---

## 📁 Estructura del Proyecto

- [`/backend`](backend): API REST con Express, Prisma ORM, validación con Zod, autenticación JWT para admin, rate limiting y CORS estricto.
- [`/admin-web`](admin-web): Panel Web con React 18, Vite y Tailwind CSS para gestión de mensajes, hitos e interacciones.
- [`/mobile-app`](mobile-app): Aplicación móvil React Native con Expo, consumo de solo lectura, almacenamiento en caché y botón de interacción "Pensando en ti".

---

## 🚀 Inicio Rápido

### 1. Backend
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run dev
```

### 2. Admin Web
```bash
cd admin-web
cp .env.example .env
npm install
npm run dev
```

### 3. Mobile App
```bash
cd mobile-app
cp .env.example .env
npm install
npm run start
```

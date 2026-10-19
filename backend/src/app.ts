import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { apiRateLimiter } from './middlewares/rateLimiter';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import mobileRoutes from './routes/mobile.routes';

const app: Application = express();

// ── 1. Seguridad HTTP ──
app.use(helmet());

// ── 2. CORS granular según ARCHITECTURE_AND_SECURITY.md ──
const allowedOrigins = [env.ADMIN_WEB_URL];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Las apps móviles nativas y herramientas CLI no envían header Origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    // En desarrollo permitir cualquier localhost, 127.0.0.1 y direcciones IP de red local (LAN)
    if (
      env.NODE_ENV === 'development' &&
      (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin))
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS bloqueado para el origen: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
};
app.use(cors(corsOptions));

// ── 3. Rate Limiting general ──
app.use(apiRateLimiter);

// ── 4. Body parsing ──
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── 5. Rutas ──
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);    // Requiere JWT en cada ruta
app.use('/api/mobile', mobileRoutes);  // Requiere x-api-key + rate limiter

// ── 6. 404 ──
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${_req.method} ${_req.originalUrl}`,
  });
});

// ── 7. Error handler centralizado ──
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

export default app;

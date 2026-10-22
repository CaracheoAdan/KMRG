import express, { Application, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { httpLogger, logger } from './config/logger';
import { apiRateLimiter } from './middlewares/rateLimiter';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import mobileRoutes from './routes/mobile.routes';

const app: Application = express();

// Detrás de un proxy inverso, confiar en X-Forwarded-For para que el rate limiting use la IP real.
if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

// ── 0. Logger HTTP estructurado con requestId ──
app.disable('x-powered-by');
app.use(httpLogger);

// ── 1. Seguridad HTTP ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  }),
);

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
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With'],
  credentials: true,
};
app.use(cors(corsOptions));

// ── 3. Rate Limiting general ──
app.use(apiRateLimiter);

// ── 4. Cookies y Body parsing ──
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── 5. Rutas ──
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);    // Requiere cookie kmrg_session + cabecera CSRF
app.use('/api/mobile', mobileRoutes);  // Requiere x-api-key + rate limiter

// ── 6. 404 ──
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${_req.method} ${_req.originalUrl}`,
  });
});

// ── 7. Error handler centralizado ──
app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  // JSON malformado o cuerpo demasiado grande → error del cliente, no del servidor
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'JSON malformado en el cuerpo de la solicitud' });
    return;
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'El cuerpo de la solicitud es demasiado grande' });
    return;
  }
  if (err.message?.startsWith('CORS bloqueado')) {
    res.status(403).json({ success: false, message: 'Origen no permitido' });
    return;
  }

  logger.error({ err }, 'Error no manejado');
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  });
});

export default app;


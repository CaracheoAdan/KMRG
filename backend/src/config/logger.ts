import crypto from 'crypto';
import pino from 'pino';
import pinoHttp from 'pino-http';

const nodeEnv = process.env.NODE_ENV ?? 'development';

/**
 * Logger estructurado (JSON en producción, legible con pino-pretty en desarrollo).
 * Se redactan cabeceras sensibles para no filtrar credenciales en los logs.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (nodeEnv === 'test' ? 'silent' : 'info'),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  ...(nodeEnv === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } }
    : {}),
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id =
      typeof existing === 'string' && existing.length > 0 && existing.length <= 128
        ? existing
        : crypto.randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
});


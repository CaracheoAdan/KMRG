import rateLimit from 'express-rate-limit';

// Limitador estricto para interacciones móviles (máximo 5 peticiones por minuto por IP)
export const interactionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas interacciones enviadas en poco tiempo. Por favor espera un minuto.',
  },
});

// Limitador para confirmación de lectura móvil (máximo 30 peticiones por minuto por IP)
export const messageReadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas confirmaciones de lectura en poco tiempo. Intenta más tarde.',
  },
});

// Limitador anti fuerza bruta para login/registro (10 intentos fallidos cada 15 minutos por IP)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  },
});

// Limitador general para la API
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Límite de peticiones excedido. Intenta más tarde.',
  },
});


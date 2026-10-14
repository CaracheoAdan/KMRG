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

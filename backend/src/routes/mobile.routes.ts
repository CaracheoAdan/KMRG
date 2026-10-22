import { Router } from 'express';
import { requireMobileApiKey } from '../middlewares/apiKey.middleware';
import { interactionRateLimiter, messageReadRateLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate.middleware';
import { syncMessages, markMessageAsRead } from '../controllers/messages.controller';
import { listMilestones } from '../controllers/milestones.controller';
import { createInteraction } from '../controllers/interactions.controller';
import { createInteractionSchema } from '../schemas/interactions.schema';
import { uuidParamSchema } from '../schemas/messages.schema';

const router = Router();

// ── GET /api/mobile/messages/sync ──
// Retorna los mensajes para caché local y programación de notificaciones.
router.get('/messages/sync', requireMobileApiKey, syncMessages);

// ── GET /api/mobile/milestones ──
// Retorna todos los hitos ordenados por fecha ascendente.
router.get('/milestones', requireMobileApiKey, listMilestones);

// ── POST /api/mobile/messages/:id/read ──
// Marca un mensaje como leído desde la app móvil (con rate limit 30 req/min).
router.post(
  '/messages/:id/read',
  messageReadRateLimiter,
  requireMobileApiKey,
  validate({ params: uuidParamSchema }),
  markMessageAsRead,
);

// ── POST /api/mobile/interact ──
// Registra una interacción (ej. botón "Pensando en ti").
// Protegido con x-api-key + Rate Limiting estricto (5 req/min por IP).
router.post(
  '/interact',
  interactionRateLimiter,
  requireMobileApiKey,
  validate({ body: createInteractionSchema }),
  createInteraction,
);

export default router;


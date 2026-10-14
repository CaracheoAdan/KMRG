import { Router } from 'express';
import { requireMobileApiKey } from '../middlewares/apiKey.middleware';
import { interactionRateLimiter } from '../middlewares/rateLimiter';
import { validate } from '../middlewares/validate.middleware';
import { syncMessages } from '../controllers/messages.controller';
import { createInteraction } from '../controllers/interactions.controller';
import { createInteractionSchema } from '../schemas/interactions.schema';

const router = Router();

// ── GET /api/mobile/messages/sync ──
// Retorna mensajes con scheduled_date >= HOY para caché local.
// Protegido con x-api-key estático.
router.get('/messages/sync', requireMobileApiKey, syncMessages);

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

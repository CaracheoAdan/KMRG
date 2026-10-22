import { Router } from 'express';
import { requireAdminAuth } from '../middlewares/auth.middleware';
import { requireCsrfHeader } from '../middlewares/csrf.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  listMessages,
  createMessage,
  updateMessage,
  deleteMessage,
} from '../controllers/messages.controller';
import {
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '../controllers/milestones.controller';
import { listInteractions } from '../controllers/interactions.controller';
import {
  createMessageSchema,
  updateMessageSchema,
  uuidParamSchema,
} from '../schemas/messages.schema';
import {
  createMilestoneSchema,
  updateMilestoneSchema,
} from '../schemas/milestones.schema';

const router = Router();

// ── Todas las rutas admin requieren cookie de sesión + cabecera CSRF en mutaciones ──
router.use(requireCsrfHeader);
router.use(requireAdminAuth);

// ── Messages CRUD ──
router.get('/messages', listMessages);
router.post('/messages', validate({ body: createMessageSchema }), createMessage);
router.put('/messages/:id', validate({ params: uuidParamSchema, body: updateMessageSchema }), updateMessage);
router.delete('/messages/:id', validate({ params: uuidParamSchema }), deleteMessage);

// ── Milestones CRUD ──
router.get('/milestones', listMilestones);
router.post('/milestones', validate({ body: createMilestoneSchema }), createMilestone);
router.put('/milestones/:id', validate({ params: uuidParamSchema, body: updateMilestoneSchema }), updateMilestone);
router.delete('/milestones/:id', validate({ params: uuidParamSchema }), deleteMilestone);

// ── Interactions (solo lectura desde admin) ──
router.get('/interactions', listInteractions);

export default router;


import { Router } from 'express';
import {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  registerAdmin,
} from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { requireAdminAuth } from '../middlewares/auth.middleware';
import { requireCsrfHeader } from '../middlewares/csrf.middleware';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', authRateLimiter, validate({ body: loginSchema }), loginAdmin);
router.post('/logout', requireCsrfHeader, logoutAdmin);
router.get('/me', requireAdminAuth, getCurrentAdmin);

// SEGURIDAD: el registro NUNCA es público. Solo un admin autenticado puede crear otro admin,
// y además debe estar habilitado explícitamente con ALLOW_ADMIN_REGISTRATION=true.
// El primer admin se crea con `npm run prisma:seed`.
router.post(
  '/register',
  authRateLimiter,
  requireCsrfHeader,
  requireAdminAuth,
  validate({ body: registerSchema }),
  registerAdmin,
);

export default router;


import { Router } from 'express';
import { loginAdmin, registerAdmin } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/login', validate({ body: loginSchema }), loginAdmin);
router.post('/register', validate({ body: registerSchema }), registerAdmin);

export default router;

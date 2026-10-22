import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Correo electrónico no válido').max(255),
  // Límite superior: bcrypt solo usa los primeros 72 bytes y evita DoS con cuerpos enormes.
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(72),
});

export const registerSchema = z.object({
  email: z.string().trim().email('Correo electrónico no válido').max(255),
  password: z
    .string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .max(72)
    .regex(/[a-z]/, 'Debe contener una minúscula')
    .regex(/[A-Z]/, 'Debe contener una mayúscula')
    .regex(/\d/, 'Debe contener un número'),
});

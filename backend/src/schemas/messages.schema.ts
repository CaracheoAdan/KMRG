import { z } from 'zod';

export const createMessageSchema = z.object({
  content: z.string().min(1, 'El contenido del mensaje no puede estar vacío'),
  scheduled_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'scheduled_date debe ser una fecha válida en formato ISO 8601 o YYYY-MM-DD',
  }),
  theme_color: z.string().min(1, 'El color temático es requerido').max(50),
  is_read: z.boolean().optional().default(false),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  scheduled_date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'scheduled_date debe ser una fecha válida',
  }).optional(),
  theme_color: z.string().min(1).max(50).optional(),
  is_read: z.boolean().optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUIDv4 válido'),
});

import { z } from 'zod';
import { dateOnlySchema } from './messages.schema';

// Solo se aceptan URLs https (o http en desarrollo local) para evitar esquemas peligrosos (javascript:, data:, file:).
const imageUrlSchema = z
  .string()
  .url('image_url debe ser una URL válida')
  .max(1024)
  .refine((val) => /^https?:\/\//i.test(val), 'image_url debe usar http(s)');

export const createMilestoneSchema = z.object({
  author: z.string().trim().min(1).max(50).optional().default('Javier'),
  title: z.string().trim().min(1, 'El título es requerido').max(255),
  date: dateOnlySchema,
  image_url: imageUrlSchema,
});

export const updateMilestoneSchema = z
  .object({
    author: z.string().trim().min(1).max(50).optional(),
    title: z.string().trim().min(1).max(255).optional(),
    date: dateOnlySchema.optional(),
    image_url: imageUrlSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Debe enviar al menos un campo a actualizar');

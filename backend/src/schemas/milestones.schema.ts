import { z } from 'zod';
import { dateOnlySchema } from './messages.schema';

// Se aceptan URLs http(s) o Data URLs de imagen comprimida (data:image/...) para evitar esquemas peligrosos (javascript:, file:).
const imageUrlSchema = z
  .string()
  .trim()
  .min(1, 'image_url es obligatoria')
  .max(500000, 'La imagen excede el tamaño máximo permitido')
  .refine(
    (val) => /^https?:\/\/.+/i.test(val) || /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/i.test(val),
    'image_url debe ser una URL http(s) válida o una imagen data:image/'
  );

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

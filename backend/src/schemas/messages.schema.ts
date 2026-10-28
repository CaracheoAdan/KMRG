import { z } from 'zod';

// Fecha de calendario estricta YYYY-MM-DD (columna DATE en PostgreSQL).
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD')
  .refine((val) => {
    const d = new Date(`${val}T00:00:00.000Z`);
    return !isNaN(d.getTime()) && d.toISOString().startsWith(val);
  }, 'La fecha no es válida');

// Color hexadecimal de 6 dígitos (#RRGGBB). La app móvil concatena opacidad hex al final.
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'theme_color debe ser un color hexadecimal #RRGGBB');

export const createMessageSchema = z.object({
  sender: z.string().trim().min(1).max(50).optional().default('Javier'),
  recipient: z.string().trim().min(1).max(50).optional().default('Karla'),
  content: z.string().trim().min(1, 'El contenido del mensaje no puede estar vacío').max(5000),
  scheduled_date: dateOnlySchema,
  theme_color: hexColorSchema,
  is_read: z.boolean().optional().default(false),
});

export const updateMessageSchema = z
  .object({
    sender: z.string().trim().min(1).max(50).optional(),
    recipient: z.string().trim().min(1).max(50).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    scheduled_date: dateOnlySchema.optional(),
    theme_color: hexColorSchema.optional(),
    is_read: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, 'Debe enviar al menos un campo a actualizar');

export const uuidParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUIDv4 válido'),
});

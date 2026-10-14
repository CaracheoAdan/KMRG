import { z } from 'zod';

export const createMilestoneSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(255),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'date debe ser una fecha válida en formato ISO 8601 o YYYY-MM-DD',
  }),
  image_url: z.string().url('image_url debe ser una URL válida').max(1024),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'date debe ser una fecha válida',
  }).optional(),
  image_url: z.string().url('image_url debe ser una URL válida').max(1024).optional(),
});

import { z } from 'zod';

export const createInteractionSchema = z.object({
  type: z.string().min(1, 'El tipo de interacción es obligatorio').max(100),
  payload: z.record(z.any()).optional().default({}),
});

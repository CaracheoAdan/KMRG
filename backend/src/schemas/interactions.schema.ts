import { z } from 'zod';

// Tipos de interacción permitidos (lista blanca).
export const INTERACTION_TYPES = ['thinking_of_you', 'heartbeat', 'reaction'] as const;

const MAX_PAYLOAD_BYTES = 2048;

export const createInteractionSchema = z.object({
  type: z.enum(INTERACTION_TYPES, {
    errorMap: () => ({ message: `type debe ser uno de: ${INTERACTION_TYPES.join(', ')}` }),
  }),
  payload: z
    .record(z.union([z.string().max(500), z.number(), z.boolean(), z.null()]))
    .optional()
    .default({})
    .refine((p) => Object.keys(p).length <= 20, { message: 'payload admite como máximo 20 claves' })
    .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD_BYTES, {
      message: `payload no puede exceder ${MAX_PAYLOAD_BYTES} bytes`,
    }),
});

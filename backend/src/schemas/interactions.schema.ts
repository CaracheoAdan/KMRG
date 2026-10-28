import { z } from 'zod';

// Tipos de interacción permitidos (lista blanca).
export const INTERACTION_TYPES = [
  'thinking_of_you',
  'heartbeat',
  'reaction',
  'sync_home_state',
  'sync_movies_state',
  'sync_games_state',
  'sync_places_state',
] as const;

const MAX_PAYLOAD_BYTES = 32768;

export const createInteractionSchema = z.object({
  sender: z.string().trim().min(1).max(50).optional().default('Javier'),
  type: z.enum(INTERACTION_TYPES, {
    errorMap: () => ({ message: `type debe ser uno de: ${INTERACTION_TYPES.join(', ')}` }),
  }),
  payload: z
    .record(z.any())
    .optional()
    .default({})
    .refine((p) => JSON.stringify(p).length <= MAX_PAYLOAD_BYTES, {
      message: `payload no puede exceder ${MAX_PAYLOAD_BYTES} bytes`,
    }),
});

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';
import { logger } from './logger';

export const supabase: SupabaseClient | null =
  env.NODE_ENV !== 'test' && env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

if (supabase) {
  logger.info({ supabaseUrl: env.SUPABASE_URL }, 'Cliente Supabase inicializado para sincronización en vivo');
} else {
  logger.info('Supabase no configurado o modo test, operando en modo local');
}

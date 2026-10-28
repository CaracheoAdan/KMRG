import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from './logger';

dotenv.config();

// Valores por defecto SOLO para desarrollo local. En producción se rechazan.
const DEV_DEFAULTS = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/kmrg_db?schema=public',
  JWT_SECRET: 'super_secret_jwt_key_kmrg_change_in_production_32chars',
  MOBILE_API_KEY: 'kmrg_mobile_secure_api_key_2026',
} as const;

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().default(DEV_DEFAULTS.DATABASE_URL),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres').default(DEV_DEFAULTS.JWT_SECRET),
  JWT_EXPIRES_IN: z.string().default('12h'),
  MOBILE_API_KEY: z.string().min(24, 'MOBILE_API_KEY debe tener al menos 24 caracteres').default(DEV_DEFAULTS.MOBILE_API_KEY),
  ADMIN_WEB_URL: z.string().url().default('http://localhost:5173'),
  // Permite registrar nuevos admins vía API (solo por un admin autenticado). Desactivado por defecto.
  ALLOW_ADMIN_REGISTRATION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // Número de proxies de confianza (ej. 1 detrás de Nginx/Render/Railway) para que el rate limit use la IP real.
  TRUST_PROXY: z.string().default('0').transform((val) => parseInt(val, 10)),
  // Supabase Cloud opcional para sincronización bidireccional en vivo
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.fatal({ errors: parsed.error.format() }, 'Error de validación en variables de entorno');
  process.exit(1);
}

// En producción está prohibido usar los secretos por defecto del repositorio.
if (parsed.data.NODE_ENV === 'production') {
  const insecure = (Object.keys(DEV_DEFAULTS) as (keyof typeof DEV_DEFAULTS)[]).filter(
    (key) => parsed.data[key] === DEV_DEFAULTS[key],
  );
  if (insecure.length > 0) {
    logger.fatal({ insecure }, 'Variables con valores por defecto inseguros en producción');
    process.exit(1);
  }
}

export const env = parsed.data;


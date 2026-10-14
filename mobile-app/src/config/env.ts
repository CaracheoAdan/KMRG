/**
 * Variables de entorno para la aplicación móvil KMRG
 * En Expo, las variables prefijadas con EXPO_PUBLIC_ se inyectan en tiempo de compilación.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const MOBILE_API_KEY =
  process.env.EXPO_PUBLIC_MOBILE_API_KEY || 'kmrg_mobile_secure_api_key_2026';

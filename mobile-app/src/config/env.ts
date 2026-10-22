/**
 * Variables de entorno para la aplicación móvil KMRG
 * En Expo, las variables prefijadas con EXPO_PUBLIC_ se inyectan en tiempo de compilación.
 *
 * ⚠️ Todo lo EXPO_PUBLIC_ queda embebido en el bundle y puede extraerse del APK/IPA.
 * La API key móvil NO es un secreto fuerte: solo filtra tráfico casual. La protección real
 * de los endpoints móviles es que sean de solo lectura + rate limiting en el backend.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const MOBILE_API_KEY = process.env.EXPO_PUBLIC_MOBILE_API_KEY ?? '';

if (!MOBILE_API_KEY) {
  console.warn('[env] EXPO_PUBLIC_MOBILE_API_KEY no está definida. La sincronización fallará.');
}

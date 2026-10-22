/**
 * Parche temporal e idempotente para `expo-notifications` en Android cuando se ejecuta dentro de Expo Go.
 *
 * ¿Por qué existe este script?
 * En versiones recientes del SDK de Expo, `expo-notifications` intenta importar de forma estricta
 * el módulo nativo `ExpoTopicSubscriptionModule` en Android (`requireNativeModule('ExpoTopicSubscriptionModule')`).
 * Sin embargo, el cliente precompilado de Expo Go para Android no incluye dicho módulo nativo para suscripción
 * a tópicos FCM, provocando una excepción fatal al iniciar la app aunque solo se utilicen notificaciones locales.
 *
 * ¿Cuándo se puede eliminar?
 * Este script es exclusivo para compatibilidad con Expo Go durante el desarrollo. Cuando el proyecto migre
 * a un Development Build personalizado (`npx expo run:android` / `expo-dev-client` / EAS Build), el módulo
 * nativo se enlaza directamente en el binario y tanto este script como el hook `postinstall` pueden eliminarse.
 */

const fs = require('fs');
const path = require('path');

const PATCH_MARKER = '// @kmrg-patched: expo-notifications-topic-subscription-safe';

const targetPaths = [
  path.resolve(
    __dirname,
    '..',
    'node_modules',
    'expo-notifications',
    'build',
    'TopicSubscriptionModule.android.js'
  ),
  path.resolve(
    __dirname,
    '..',
    'mobile-app',
    'node_modules',
    'expo-notifications',
    'build',
    'TopicSubscriptionModule.android.js'
  ),
];

const safeCode = `${PATCH_MARKER}
import { requireNativeModule, requireOptionalNativeModule } from 'expo-modules-core';

let nativeModule = null;

try {
  if (typeof requireOptionalNativeModule === 'function') {
    nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
  }
} catch (e) {
  nativeModule = null;
}

if (!nativeModule) {
  try {
    nativeModule = requireNativeModule('ExpoTopicSubscriptionModule');
  } catch (e) {
    nativeModule = {
      addListener: () => {},
      removeListeners: () => {},
      subscribeToTopicAsync: () => Promise.resolve(null),
      unsubscribeFromTopicAsync: () => Promise.resolve(null),
    };
  }
}

export default nativeModule;
`;

try {
  let foundAny = false;

  for (const filePath of targetPaths) {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath) || !fs.existsSync(filePath)) {
      continue;
    }

    foundAny = true;
    const currentContent = fs.readFileSync(filePath, 'utf8');

    if (currentContent.includes(PATCH_MARKER)) {
      console.log(`[patch-expo-notifications] Parche ya aplicado en ${filePath} (omitido).`);
      continue;
    }

    fs.writeFileSync(filePath, safeCode, 'utf8');
    console.log(`[patch-expo-notifications] Parche aplicado correctamente en ${filePath}.`);
  }

  if (!foundAny) {
    console.log(
      '[patch-expo-notifications] No se encontró TopicSubscriptionModule.android.js en node_modules (omitido).'
    );
  }
} catch (error) {
  console.warn(
    '[patch-expo-notifications] Advertencia no fatal aplicando el parche:',
    error && error.message ? error.message : error
  );
} finally {
  process.exit(0);
}

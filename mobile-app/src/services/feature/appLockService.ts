import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export const APP_LOCK_ENABLED_KEY = '@kmrg_app_lock_enabled';
export const APP_LOCK_GRACE_KEY = '@kmrg_app_lock_grace_seconds';
export const DEFAULT_GRACE_SECONDS = 30;

export const GRACE_PERIOD_OPTIONS: Array<{ seconds: number; label: string; description: string }> = [
  { seconds: 0, label: 'Inmediato', description: 'Al salir de la app' },
  { seconds: 30, label: '30 segundos', description: 'Recomendado' },
  { seconds: 60, label: '1 minuto', description: 'Cómodo para pausas cortas' },
  { seconds: 300, label: '5 minutos', description: 'Solo tras inactividad' },
];

export interface AppLockSettings {
  enabled: boolean;
  graceSeconds: number;
}

export interface BiometricCapability {
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  label: string;
}

type SettingsListener = (settings: AppLockSettings) => void;
const listeners = new Set<SettingsListener>();

function notifyListeners(settings: AppLockSettings): void {
  listeners.forEach((fn) => {
    try {
      fn(settings);
    } catch {
      // Ignorar errores en listeners
    }
  });
}

export function subscribeAppLockSettings(listener: SettingsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function isAppLockEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(APP_LOCK_ENABLED_KEY);
    return raw === '1' || raw === 'true';
  } catch {
    return false;
  }
}

export async function getAppLockGraceSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(APP_LOCK_GRACE_KEY);
    if (raw === null) return DEFAULT_GRACE_SECONDS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_GRACE_SECONDS;
  } catch {
    return DEFAULT_GRACE_SECONDS;
  }
}

export async function getAppLockSettings(): Promise<AppLockSettings> {
  const [enabled, graceSeconds] = await Promise.all([
    isAppLockEnabled(),
    getAppLockGraceSeconds(),
  ]);
  return { enabled, graceSeconds };
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_LOCK_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Ignorar error de almacenamiento
  }
  const settings = await getAppLockSettings();
  notifyListeners({ ...settings, enabled });
}

export async function setAppLockGraceSeconds(seconds: number): Promise<void> {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds) : DEFAULT_GRACE_SECONDS;
  try {
    await AsyncStorage.setItem(APP_LOCK_GRACE_KEY, String(safeSeconds));
  } catch {
    // Ignorar error de almacenamiento
  }
  const settings = await getAppLockSettings();
  notifyListeners({ ...settings, graceSeconds: safeSeconds });
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      label: 'No disponible en navegador web',
    };
  }

  try {
    const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);

    const available = Boolean(hasHardware && isEnrolled);
    const names: string[] = [];
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      names.push(Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento facial');
    }
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      names.push(Platform.OS === 'ios' ? 'Touch ID' : 'Huella digital');
    }
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      names.push('Iris');
    }

    let label = 'Biometría del dispositivo';
    if (!hasHardware) {
      label = 'Tu dispositivo no cuenta con sensor biométrico';
    } else if (!isEnrolled) {
      label = 'Sin huella o rostro configurado en el teléfono';
    } else if (names.length > 0) {
      label = `${names.join(' / ')} listo`;
    }

    return {
      available,
      hasHardware,
      isEnrolled,
      supportedTypes,
      label,
    };
  } catch {
    return {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      label: 'No se pudo verificar la biometría',
    };
  }
}

export async function authenticateAppLock(
  promptMessage = 'Desbloquea KMRG'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
  }
  try {
    const cap = await getBiometricCapability();
    if (!cap.available) {
      const enrolledLevel = await LocalAuthentication.getEnrolledLevelAsync().catch(
        () => LocalAuthentication.SecurityLevel.NONE
      );
      if (enrolledLevel === LocalAuthentication.SecurityLevel.NONE && !cap.hasHardware) {
        return true;
      }
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Usar código',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });
    return Boolean(result.success);
  } catch {
    return false;
  }
}

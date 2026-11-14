import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { FONTS } from '../../theme/designSystem';
import {
  authenticateAppLock,
  DEFAULT_GRACE_SECONDS,
  getAppLockSettings,
  subscribeAppLockSettings,
} from '../../services/feature/appLockService';

export interface AppLockGateProps {
  children: React.ReactNode;
}

export const AppLockGate: React.FC<AppLockGateProps> = ({ children }) => {
  const { colors, primaryColor } = useTheme();
  const { getDisplayName, profile } = useProfile();

  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const enabledRef = useRef(false);
  const graceSecondsRef = useRef(DEFAULT_GRACE_SECONDS);
  const backgroundedAtRef = useRef<number | null>(null);
  const authInFlightRef = useRef(false);

  const runUnlockPrompt = useCallback(async () => {
    if (authInFlightRef.current) return;
    authInFlightRef.current = true;
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      if (Platform.OS === 'web') {
        setIsLocked(false);
        return;
      }
      const ok = await authenticateAppLock('Desbloquea KMRG');
      if (ok) {
        setIsLocked(false);
        setAuthError(null);
      } else {
        setAuthError('Autenticación cancelada. Toca "Desbloquear" para intentar de nuevo.');
      }
    } finally {
      authInFlightRef.current = false;
      setIsAuthenticating(false);
    }
  }, []);

  // Carga inicial (cold start) y suscripción a cambios de ajustes
  useEffect(() => {
    let mounted = true;

    (async () => {
      const settings = await getAppLockSettings();
      if (!mounted) return;
      enabledRef.current = settings.enabled;
      graceSecondsRef.current = settings.graceSeconds;

      if (settings.enabled && Platform.OS !== 'web') {
        setIsLocked(true);
        void runUnlockPrompt();
      } else {
        setIsLocked(false);
      }
    })();

    const unsubscribe = subscribeAppLockSettings((next) => {
      enabledRef.current = next.enabled;
      graceSecondsRef.current = next.graceSeconds;
      if (!next.enabled) {
        setIsLocked(false);
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [runUnlockPrompt]);

  // Vigilar el paso a segundo plano y regreso
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now();
        }
        return;
      }

      if (nextState === 'active') {
        const bgAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (!enabledRef.current || bgAt === null || Platform.OS === 'web') return;

        const elapsedSeconds = (Date.now() - bgAt) / 1000;
        if (elapsedSeconds >= graceSecondsRef.current) {
          setIsLocked(true);
          void runUnlockPrompt();
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [runUnlockPrompt]);

  const greetingName = profile ? getDisplayName(profile) : 'Amor';

  return (
    <View style={styles.root}>
      {children}
      {isLocked ? (
        <View
          style={[styles.overlay, { backgroundColor: colors.background }]}
          accessibilityViewIsModal
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="lock-closed" size={36} color={primaryColor} />
            </View>

            <Text style={[styles.brand, { color: primaryColor }]}>KMRG</Text>
            <Text style={[styles.title, { color: colors.text }]}>
              Rincón privado de {greetingName}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Usa tu huella, Face ID o el código de tu teléfono para proteger sus recuerdos y cartas.
            </Text>

            {authError ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>{authError}</Text>
            ) : null}

            <TouchableOpacity
              onPress={() => void runUnlockPrompt()}
              disabled={isAuthenticating}
              activeOpacity={0.85}
              style={[
                styles.unlockBtn,
                { backgroundColor: primaryColor, opacity: isAuthenticating ? 0.65 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Desbloquear"
            >
              {isAuthenticating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="finger-print" size={20} color="#ffffff" />
              )}
              <Text style={styles.unlockBtnText}>
                {isAuthenticating ? 'Verificando...' : 'Desbloquear'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brand: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 18,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 20,
  },
  unlockBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

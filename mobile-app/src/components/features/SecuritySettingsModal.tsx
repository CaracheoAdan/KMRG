import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import {
  FeatureCard,
  FeatureModalProps,
  FeatureModalShell,
} from './FeatureModalShell';
import {
  authenticateAppLock,
  BiometricCapability,
  DEFAULT_GRACE_SECONDS,
  getAppLockSettings,
  getBiometricCapability,
  GRACE_PERIOD_OPTIONS,
  setAppLockEnabled,
  setAppLockGraceSeconds,
  subscribeAppLockSettings,
} from '../../services/feature/appLockService';

export const SecuritySettingsModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [graceSeconds, setGraceSeconds] = useState(DEFAULT_GRACE_SECONDS);
  const [capability, setCapability] = useState<BiometricCapability>({
    available: false,
    hasHardware: false,
    isEnrolled: false,
    supportedTypes: [],
    label: 'Verificando sensor...',
  });
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    const [settings, cap] = await Promise.all([
      getAppLockSettings(),
      getBiometricCapability(),
    ]);
    setEnabled(settings.enabled);
    setGraceSeconds(settings.graceSeconds);
    setCapability(cap);
  }, []);

  useEffect(() => {
    if (visible) {
      setStatusMessage(null);
      void refreshState();
    }
  }, [visible, refreshState]);

  useEffect(() => {
    const unsub = subscribeAppLockSettings((next) => {
      setEnabled(next.enabled);
      setGraceSeconds(next.graceSeconds);
    });
    return unsub;
  }, []);

  const handleToggleLock = async (nextValue: boolean) => {
    if (busy) return;
    setStatusMessage(null);

    if (nextValue && !capability.available) {
      setStatusMessage(
        'Para activar el bloqueo primero configura Face ID, Touch ID o tu huella digital en los Ajustes del teléfono.'
      );
      return;
    }

    setBusy(true);
    try {
      const prompt = nextValue
        ? 'Confirma tu identidad para activar el bloqueo de KMRG'
        : 'Confirma tu identidad para desactivar el bloqueo de KMRG';
      const ok = await authenticateAppLock(prompt);
      if (!ok) {
        setStatusMessage('No se completó la verificación biométrica.');
        return;
      }
      await setAppLockEnabled(nextValue);
      setEnabled(nextValue);
      setStatusMessage(
        nextValue
          ? 'Bloqueo biométrico activado correctamente.'
          : 'Bloqueo biométrico desactivado.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSelectGrace = async (seconds: number) => {
    setGraceSeconds(seconds);
    await setAppLockGraceSeconds(seconds);
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Seguridad y Privacidad"
      subtitle="Protege sus cartas, fotos y recuerdos con biometría"
      icon="shield-checkmark-outline"
    >
      {/* Estado de capacidad biométrica */}
      <FeatureCard>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.badgeCircle,
              {
                backgroundColor: capability.available
                  ? `${colors.success}20`
                  : `${colors.warning}20`,
              },
            ]}
          >
            <Ionicons
              name={capability.available ? 'finger-print' : 'alert-circle-outline'}
              size={24}
              color={capability.available ? colors.success : colors.warning}
            />
          </View>
          <View style={styles.statusTextCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Estado biométrico del dispositivo
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {capability.label}
            </Text>
          </View>
        </View>
      </FeatureCard>

      {/* Interruptor principal */}
      <FeatureCard>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Bloqueo con huella o Face ID
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Solicita tu huella, rostro o código al abrir KMRG o regresar a la app.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => void handleToggleLock(v)}
            disabled={busy || (!capability.available && !enabled)}
            trackColor={{ false: colors.border, true: `${primaryColor}80` }}
            thumbColor={enabled ? primaryColor : colors.surfaceAlt}
          />
        </View>

        {statusMessage ? (
          <View
            style={[
              styles.noticeBox,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={primaryColor} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              {statusMessage}
            </Text>
          </View>
        ) : null}
      </FeatureCard>

      {/* Selección de tiempo de gracia */}
      <FeatureCard>
        <Text style={[styles.sectionHeader, { color: colors.text }]}>
          Tiempo de gracia al salir de la app
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>
          Elige cuánto tiempo puede estar KMRG en segundo plano antes de volver a pedir desbloqueo.
        </Text>

        <View style={styles.optionsList}>
          {GRACE_PERIOD_OPTIONS.map((opt) => {
            const selected = graceSeconds === opt.seconds;
            return (
              <TouchableOpacity
                key={opt.seconds}
                onPress={() => void handleSelectGrace(opt.seconds)}
                activeOpacity={0.8}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: selected ? `${primaryColor}14` : colors.surfaceAlt,
                    borderColor: selected ? primaryColor : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <View style={styles.optionTextCol}>
                  <Text
                    style={[
                      styles.optionLabel,
                      { color: selected ? primaryColor : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    {opt.description}
                  </Text>
                </View>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selected ? primaryColor : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </FeatureCard>
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  switchInfo: {
    flex: 1,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  optionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});

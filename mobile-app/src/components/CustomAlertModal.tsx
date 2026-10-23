import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Alert as RNAlert,
  AlertButton,
  AlertOptions,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { useTheme } from '../contexts/ThemeContext';
import { PressableScale } from './ui/Kit';
import { FONTS } from '../theme/designSystem';

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: AlertOptions;
  customIcon?: string;
  badgeText?: string;
}

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
  hideAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

// Referencia global para interceptar RNAlert.alert
let globalShowAlert: ((config: AlertConfig) => void) | null = null;

export const CustomAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, primaryColor, isDark } = useTheme();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showAlert = (newConfig: AlertConfig) => {
    setConfig(newConfig);
    setVisible(true);
    scaleAnim.setValue(0.88);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  };

  const hideAlert = (onHidden?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      setVisible(false);
      setConfig(null);
      if (onHidden) onHidden();
    });
  };

  useEffect(() => {
    globalShowAlert = showAlert;

    // Interceptar Alert.alert nativo de React Native para que todas las pantallas
    // muestren automáticamente la ventana emergente con diseño romántico y color del tema
    const originalAlert = RNAlert.alert;
    RNAlert.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => {
      if (globalShowAlert) {
        globalShowAlert({
          title,
          message,
          buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Aceptar' }],
          options,
        });
      } else {
        originalAlert(title, message, buttons, options);
      }
    };

    return () => {
      globalShowAlert = null;
      RNAlert.alert = originalAlert;
    };
  }, []);

  // Determinar icono, estilo y temática del modal según el texto y contexto
  const getAlertEmblem = () => {
    if (!config) return { icon: 'sparkles', color: primaryColor, isSealed: false };

    if (config.customIcon) {
      return { icon: config.customIcon, color: primaryColor, isSealed: false };
    }

    const lowerTitle = (config.title || '').toLowerCase();
    const lowerMsg = (config.message || '').toLowerCase();
    const combined = `${lowerTitle} ${lowerMsg}`;

    // Caso 1: Carta Sellada, Candado o Cápsula del Tiempo
    if (
      combined.includes('sellad') ||
      combined.includes('candado') ||
      combined.includes('cápsula') ||
      combined.includes('capsula') ||
      combined.includes('sobre cerrado') ||
      combined.includes('lock')
    ) {
      return { icon: 'lock-closed', color: primaryColor, isSealed: true };
    }

    // Caso 2: Acción destructiva / Eliminar
    const hasDestructive = config.buttons?.some((b) => b.style === 'destructive');
    if (
      hasDestructive ||
      combined.includes('eliminar') ||
      combined.includes('borrar') ||
      combined.includes('quitar') ||
      combined.includes('¿estás seguro') ||
      combined.includes('estas seguro')
    ) {
      return { icon: 'trash-outline', color: '#f43f5e', isSealed: false };
    }

    // Caso 3: Error
    if (combined.includes('error') || combined.includes('falló') || combined.includes('fallo')) {
      return { icon: 'alert-circle-outline', color: '#f43f5e', isSealed: false };
    }

    // Caso 4: Advertencia / Permiso
    if (combined.includes('permiso') || combined.includes('requerido') || combined.includes('incompleto') || combined.includes('aviso')) {
      return { icon: 'alert-circle-outline', color: '#f59e0b', isSealed: false };
    }

    // Caso 5: Éxito / Amor / Latido / Perfil
    if (
      combined.includes('guardado') ||
      combined.includes('éxito') ||
      combined.includes('exito') ||
      combined.includes('latido') ||
      combined.includes('perfil') ||
      combined.includes('amor')
    ) {
      return { icon: 'heart', color: primaryColor, isSealed: false };
    }

    // Por defecto
    return { icon: 'sparkles', color: primaryColor, isSealed: false };
  };

  const emblem = getAlertEmblem();
  const buttons = config?.buttons && config.buttons.length > 0 ? config.buttons : [{ text: 'Entendido' }];

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => {
          if (config?.options?.cancelable !== false) {
            hideAlert();
          }
        }}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: opacityAnim,
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.65)',
              },
            ]}
          />

          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: emblem.isSealed ? `${primaryColor}40` : colors.border,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Emblema con halo de brillo romántico */}
            <View
              style={[
                styles.emblemHalo,
                {
                  backgroundColor: `${emblem.color}15`,
                  borderColor: `${emblem.color}35`,
                },
              ]}
            >
              <View
                style={[
                  styles.emblemInner,
                  {
                    backgroundColor: emblem.color,
                  },
                ]}
              >
                <Ionicons name={emblem.icon} size={28} color="#ffffff" />
              </View>
            </View>

            {/* Badge opcional de Carta Sellada */}
            {emblem.isSealed && (
              <View
                style={[
                  styles.sealedBadge,
                  {
                    backgroundColor: `${primaryColor}18`,
                    borderColor: `${primaryColor}40`,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={11} color={primaryColor} />
                <Text style={[styles.sealedBadgeText, { color: primaryColor }]}>
                  {config?.badgeText || 'PROTEGIDO CON AMOR'}
                </Text>
              </View>
            )}

            {/* Título en tipografía elegante */}
            <Text style={[styles.title, { color: colors.text }]}>{config?.title}</Text>

            {/* Mensaje descriptivo con alto contraste y formato limpio */}
            {Boolean(config?.message) && (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {config?.message}
              </Text>
            )}

            {/* Fila o columna de botones según la cantidad de opciones */}
            <View
              style={[
                styles.buttonContainer,
                buttons.length > 2 && { flexDirection: 'column' },
              ]}
            >
              {buttons.map((btn, index) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isPrimary = !isCancel && !isDestructive;

                let btnBg = primaryColor;
                let textColor = '#ffffff';

                if (isCancel) {
                  btnBg = isDark ? '#27272a' : '#f1f5f9';
                  textColor = colors.textSecondary;
                } else if (isDestructive) {
                  btnBg = '#fee2e2';
                  textColor = '#ef4444';
                }

                return (
                  <PressableScale
                    key={`btn-${index}-${btn.text}`}
                    onPress={() => {
                      hideAlert(() => {
                        if (btn.onPress) btn.onPress();
                      });
                    }}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: btnBg,
                        flex: buttons.length <= 2 ? 1 : undefined,
                        width: buttons.length > 2 ? '100%' : undefined,
                      },
                      isCancel && {
                        borderWidth: 1,
                        borderColor: isDark ? '#3f3f46' : '#e2e8f0',
                      },
                    ]}
                    scaleTo={0.96}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: textColor },
                        isPrimary && { fontWeight: '800' },
                      ]}
                      numberOfLines={1}
                    >
                      {btn.text}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
  },
  emblemHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  emblemInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sealedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  sealedBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18.5,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: FONTS.serif,
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  actionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

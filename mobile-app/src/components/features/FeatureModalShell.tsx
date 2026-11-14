import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Contrato común de todos los modales de Features v2.
 * Cada feature exporta: `export const XxxModal: React.FC<FeatureModalProps>`.
 */
export interface FeatureModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ShellProps extends FeatureModalProps {
  title: string;
  subtitle?: string;
  icon?: string;
  /** Si es false, el contenido se renderiza sin ScrollView (útil para FlatList propias). */
  scroll?: boolean;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

/** Contenedor de pantalla completa con cabecera consistente y soporte de teclado. */
export const FeatureModalShell: React.FC<ShellProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  scroll = true,
  headerRight,
  children,
}) => {
  const { colors, primaryColor } = useTheme();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="chevron-down" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <View style={styles.titleRow}>
              {icon ? <Ionicons name={icon as any} size={18} color={primaryColor} /> : null}
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {title}
              </Text>
            </View>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>{headerRight}</View>
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {scroll ? (
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 48 : 48 },
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.flex, styles.contentNoScroll]}>{children}</View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

/** Tarjeta básica temática reutilizable dentro de los modales. */
export const FeatureCard: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/** Botón primario temático. */
export const FeatureButton: React.FC<{
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: any;
}> = ({ label, onPress, icon, disabled, variant = 'primary', style }) => {
  const { colors, primaryColor } = useTheme();
  const bg =
    variant === 'primary' ? primaryColor : variant === 'danger' ? colors.danger : colors.surfaceAlt;
  const fg = variant === 'ghost' ? colors.text : '#ffffff';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon as any} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { minWidth: 40, alignItems: 'flex-end' },
  content: { padding: 16, paddingBottom: 48, gap: 14 },
  contentNoScroll: { padding: 16 },
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
});

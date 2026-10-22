import React, { useState, useEffect, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale, EmptyState } from '../components/ui/Kit';
import { UserProfile, Message } from '../types';
import { createSupabaseMessage } from '../services/SupabaseService';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import {
  getCurrentProfile,
  toLocalDateString,
  getSentMessages,
  formatDisplayDate,
} from '../services/StorageService';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const PRESET_COLORS = [
  { hex: '#e63946', label: 'Rojo' },
  { hex: '#9333ea', label: 'Morado' },
  { hex: '#0284c7', label: 'Azul' },
  { hex: '#2a9d8f', label: 'Verde' },
  { hex: '#f4a261', label: 'Cálido' },
];

export const WriteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile>('Javier');
  const [activeTab, setActiveTab] = useState<'write' | 'sent'>('write');
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => toLocalDateString(new Date()));
  const [themeColor, setThemeColor] = useState(primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSealingEnvelope, setIsSealingEnvelope] = useState(false);
  const sealAnim = useRef(new Animated.Value(0)).current;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sentLetters, setSentLetters] = useState<Message[]>([]);
  const [sentPage, setSentPage] = useState(0);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) {
        setProfile(p);
        getSentMessages(p).then(setSentLetters);
      }
    });
  }, []);

  const recipient: UserProfile = profile === 'Javier' ? 'Karla' : 'Javier';
  const recipientDisplay = profile === 'Javier' ? 'Karlita' : 'Javier';

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Mensaje vacío', 'Por favor escribe lo que sientes antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createSupabaseMessage({
        sender: profile,
        recipient,
        content: content.trim(),
        scheduled_date: scheduledDate,
        theme_color: themeColor,
      });

      if (result.success) {
        setIsSealingEnvelope(true);
        Animated.sequence([
          Animated.timing(sealAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ]).start(() => {
          setIsSealingEnvelope(false);
          sealAnim.setValue(0);
          Alert.alert(
            'Carta Sellada',
            `Tu sobre quedó cerrado con candado y se abrirá para ${recipientDisplay} el ${formatDisplayDate(scheduledDate)}.`,
            [
              {
                text: 'Aceptar',
                onPress: () => {
                  setContent('');
                  getSentMessages(profile).then(setSentLetters);
                  navigation.navigate('Hoy');
                },
              },
            ]
          );
        });
      } else {
        Alert.alert('Aviso', result.error || 'No se pudo enviar la carta.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar la carta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PAGE_SIZE = 3;
  const totalPages = Math.max(1, Math.ceil(sentLetters.length / PAGE_SIZE));
  const visibleSent = sentLetters.slice(sentPage * PAGE_SIZE, (sentPage + 1) * PAGE_SIZE);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fixedViewport}
      >
        {/* Cabecera Compacta + Selector de Vista */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>Para {recipientDisplay}</Text>
            <Text style={styles.subtitle}>Cartas sorpresa con fecha de apertura</Text>
          </View>

          <View style={[styles.tabSwitch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}>
            <PressableScale
              onPress={() => setActiveTab('write')}
              style={[
                styles.tabBtn,
                activeTab === 'write' && { backgroundColor: primaryColor },
              ]}
              scaleTo={0.96}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'write' ? { color: colors.primaryOn, fontWeight: '800' } : { color: colors.textSecondary },
                ]}
              >
                Escribir
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                setSentPage(0);
                setActiveTab('sent');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'sent' && { backgroundColor: primaryColor },
              ]}
              scaleTo={0.96}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'sent' ? { color: colors.primaryOn, fontWeight: '800' } : { color: colors.textSecondary },
                ]}
              >
                Enviadas ({sentLetters.length})
              </Text>
            </PressableScale>
          </View>
        </View>

        {activeTab === 'write' ? (
          <View style={styles.writeViewport}>
            {/* Hoja de Carta / Papel con Previsualización del Sobre */}
            <View
              style={[
                styles.paperSheet,
                {
                  backgroundColor: colors.paper,
                  borderColor: `${themeColor}50`,
                },
              ]}
            >
              {/* Banda decorativa que previsualiza el color del sobre seleccionado */}
              <View style={[styles.envelopeFlapAccent, { backgroundColor: themeColor }]}>
                <Ionicons name="mail" size={12} color="#ffffff" />
                <Text style={styles.envelopeFlapText}>
                  Sobre {PRESET_COLORS.find((c) => c.hex === themeColor)?.label || ''}
                </Text>
              </View>

              {/* Encabezado decorativo de la carta */}
              <View style={styles.paperHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="heart" size={14} color={themeColor} />
                  <Text style={[styles.paperRecipient, { color: colors.textSecondary }]}>
                    Para {recipientDisplay}
                  </Text>
                </View>
                <Text style={[styles.paperDateStamp, { color: colors.textMuted }]}>
                  {formatDisplayDate(toLocalDateString(new Date()), { day: 'numeric', month: 'short' })}
                </Text>
              </View>

              {/* Área de texto en la hoja */}
              <TextInput
                multiline
                value={content}
                onChangeText={setContent}
                placeholder={`Escribe aquí lo que sientes por ${recipientDisplay}...`}
                placeholderTextColor={colors.textMuted}
                style={[styles.paperTextInput, { color: colors.text }]}
                textAlignVertical="top"
              />

              {/* Pie de la hoja: contador discreto */}
              <View style={styles.paperFooter}>
                <Text style={[styles.paperCharCounter, { color: colors.textMuted }]}>
                  {content.length > 0 ? `${content.length} caracteres` : 'Escribe con el corazón'}
                </Text>
              </View>
            </View>

            {/* Opciones: Fecha de apertura y selector de color con etiqueta clara */}
            <View style={[styles.envelopeConfigCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Selector de Fecha Prominente */}
              <PressableScale
                onPress={() => setShowDatePicker(true)}
                style={[styles.datePickerProminent, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                scaleTo={0.97}
                accessibilityLabel="Seleccionar fecha de apertura"
              >
                <View style={[styles.dateIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                  <Ionicons name="calendar" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dateLabelMini, { color: colors.textMuted }]}>FECHA DE DESBLOQUEO</Text>
                  <Text style={[styles.datePickerProminentText, { color: colors.text }]} numberOfLines={1}>
                    Se abrirá el {formatDisplayDate(scheduledDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </PressableScale>

              {/* Color del sobre con etiqueta */}
              <View style={styles.colorPickerContainer}>
                <Text style={[styles.colorPickerLabel, { color: colors.textSecondary }]}>
                  Color del sobre
                </Text>
                <View style={styles.colorRow}>
                  {PRESET_COLORS.map((color) => {
                    const isSelected = themeColor === color.hex;
                    return (
                      <PressableScale
                        key={color.hex}
                        onPress={() => setThemeColor(color.hex)}
                        style={[
                          styles.colorDot,
                          { backgroundColor: color.hex },
                          isSelected && styles.colorDotSelected,
                        ]}
                        scaleTo={0.9}
                        accessibilityLabel={`Color ${color.label}`}
                      >
                        {isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>

            <DatePickerModal
              visible={showDatePicker}
              value={scheduledDate}
              onSelect={(selected) => setScheduledDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de Desbloqueo"
            />

            <PressableScale
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                isSubmitting && { opacity: 0.7 },
              ]}
              scaleTo={0.97}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.primaryOn} />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color={colors.primaryOn} />
                  <Text style={[styles.submitButtonText, { color: colors.primaryOn }]}>
                    Programar con Candado
                  </Text>
                </>
              )}
            </PressableScale>
          </View>
        ) : (
          <View style={styles.sentContainer}>
            <View style={{ flex: 1, justifyContent: 'flex-start', gap: 10 }}>
              {visibleSent.length === 0 ? (
                <EmptyState
                  icon="mail-outline"
                  title="Sin cartas enviadas"
                  message="Aún no has programado cartas sorpresa. Escribe una para que se abra en una fecha especial."
                />
              ) : (
                visibleSent.map((letter) => {
                  const isFuture =
                    toLocalDateString(letter.scheduled_date) > toLocalDateString(new Date());
                  return (
                    <View
                      key={letter.id}
                      style={[
                        styles.sentCard,
                        {
                          borderLeftWidth: 4,
                          borderLeftColor: letter.theme_color || colors.primary,
                        },
                      ]}
                    >
                      <View style={styles.sentTopRow}>
                        <View style={styles.badgeWithDot}>
                          <View
                            style={[
                              styles.colorIndicator,
                              { backgroundColor: letter.theme_color || colors.primary },
                            ]}
                          />
                          <Text style={styles.sentDateText}>
                            {isFuture
                              ? `Se abrirá el ${formatDisplayDate(letter.scheduled_date)}`
                              : `Abierta el ${formatDisplayDate(letter.scheduled_date)}`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.lockStatusBadge,
                            {
                              backgroundColor: isFuture ? `${colors.primary}15` : '#e6f4ea',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isFuture ? 'lock-closed' : 'checkmark-circle'}
                            size={12}
                            color={isFuture ? colors.primary : '#2a9d8f'}
                          />
                          <Text
                            style={[
                              styles.lockStatusText,
                              { color: isFuture ? colors.primary : '#2a9d8f' },
                            ]}
                          >
                            {isFuture ? 'Sellada' : 'Abierta'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sentSnippet} numberOfLines={2}>
                        “{letter.content}”
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={sentPage === 0}
                  onPress={() => setSentPage((p) => Math.max(0, p - 1))}
                  style={[styles.pageBtn, sentPage === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={16} color="#1e293b" />
                  <Text style={styles.pageBtnText}>Anterior</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Página {sentPage + 1} de {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={sentPage >= totalPages - 1}
                  onPress={() => setSentPage((p) => Math.min(totalPages - 1, p + 1))}
                  style={[styles.pageBtn, sentPage >= totalPages - 1 && { opacity: 0.4 }]}
                >
                  <Text style={styles.pageBtnText}>Siguiente</Text>
                  <Ionicons name="chevron-forward" size={16} color="#1e293b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal de Animación: Sobre Sellándose */}
      <Modal visible={isSealingEnvelope} transparent animationType="fade">
        <View style={styles.sealingOverlay}>
          <Animated.View
            style={[
              styles.sealingCard,
              {
                backgroundColor: colors.surface,
                transform: [
                  {
                    scale: sealAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.85, 1.05, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.sealingEnvelopeBody, { backgroundColor: themeColor }]}>
              <View style={styles.sealingWax}>
                <Ionicons name="lock-closed" size={26} color="#ffffff" />
              </View>
            </View>
            <Text style={[styles.sealingTitle, { color: colors.text }]}>Sellando con candado...</Text>
            <Text style={[styles.sealingSub, { color: colors.textMuted }]}>
              Tu sobre se abrirá para {recipientDisplay} el {formatDisplayDate(scheduledDate)}
            </Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  subtitle: {
    fontSize: 11,
    color: c.textSecondary,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.textSecondary,
  },
  writeViewport: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  paperSheet: {
    backgroundColor: c.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    minHeight: 220,
    flex: 1,
    justifyContent: 'space-between',
  },
  envelopeFlapAccent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  envelopeFlapText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    marginBottom: 8,
  },
  paperRecipient: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  paperDateStamp: {
    fontSize: 11,
    fontWeight: '600',
  },
  paperTextInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: c.text,
    fontFamily: SERIF_FONT,
    textAlignVertical: 'top',
    paddingVertical: 4,
  },
  paperFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: c.border,
    marginTop: 6,
  },
  paperCharCounter: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  envelopeConfigCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  datePickerProminent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  dateIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerProminentText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  sealingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sealingCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  sealingEnvelopeBody: {
    width: 100,
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sealingWax: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sealingTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  sealingSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  envelopeConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorPickerContainer: {
    alignItems: 'flex-end',
  },
  colorPickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  formCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
  },
  charCounter: {
    fontSize: 11,
    color: c.textMuted,
  },
  textArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: c.text,
    fontFamily: SERIF_FONT,
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  datePickerCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateLabelMini: {
    fontSize: 9,
    fontWeight: '800',
    color: c.textMuted,
  },
  datePickerSelectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
    textTransform: 'capitalize',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.primaryOn,
  },
  sentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  sentCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  sentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    textTransform: 'capitalize',
  },
  lockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sentSnippet: {
    fontSize: 13,
    color: '#495057',
    fontFamily: SERIF_FONT,
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
});

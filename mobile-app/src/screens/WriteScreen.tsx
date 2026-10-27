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
import { createSupabaseMessage, updateSupabaseMessage } from '../services/SupabaseService';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import {
  getCurrentProfile,
  toLocalDateString,
  getSentMessages,
  formatDisplayDate,
} from '../services/StorageService';
import { syncWidgetData } from '../services/WidgetSyncService';
import { sendPartnerPushNotification } from '../services/NotificationService';
import { getHomeState, saveHomeState } from '../services/CoupleSyncService';

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

  const getTodayString = () => toLocalDateString(new Date());

  const [scheduledDate, setScheduledDate] = useState(() => getTodayString());
  const [themeColor, setThemeColor] = useState(primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSealingEnvelope, setIsSealingEnvelope] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const [sealedModalData, setSealedModalData] = useState<{
    scheduledDate: string;
    recipientDisplay: string;
    isUpdate?: boolean;
  } | null>(null);

  const sealAnim = useRef(new Animated.Value(0)).current;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sentLetters, setSentLetters] = useState<Message[]>([]);
  const [sentPage, setSentPage] = useState(0);

  const loadSentLetters = async (userProfile: UserProfile) => {
    try {
      const letters = await getSentMessages(userProfile);
      setSentLetters(letters);
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) {
        setProfile(p);
        void loadSentLetters(p);
      }
    });
  }, []);

  const recipient: UserProfile = profile === 'Javier' ? 'Karla' : 'Javier';
  const recipientDisplay = profile === 'Javier' ? 'Karlita' : 'Javier';

  const isTodaySelected = scheduledDate === getTodayString();
  const todayLetter = sentLetters.find(
    (l) => toLocalDateString(l.scheduled_date) === getTodayString()
  );
  const hasSentToday = Boolean(todayLetter);

  // Iniciar edición únicamente cuando se llama desde la tarjeta del día en Enviadas
  const handleStartEditLetter = (letter: Message) => {
    setEditingMessageId(letter.id);
    setContent(letter.content);
    setScheduledDate(toLocalDateString(letter.scheduled_date));
    setThemeColor(letter.theme_color || primaryColor);
    setActiveTab('write');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setContent('');
    setScheduledDate(getTodayString());
    setActiveTab('sent');
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Mensaje vacío', 'Por favor escribe lo que sientes antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = getTodayString();
      const isToday = scheduledDate <= todayStr;

      if (editingMessageId) {
        // Guardar corrección de la carta de hoy
        const result = await updateSupabaseMessage(editingMessageId, {
          content: content.trim(),
          scheduled_date: scheduledDate,
          theme_color: themeColor,
        });

        if (result.success) {
          if (isToday) {
            void getHomeState().then((home) => {
              void saveHomeState(profile, {
                ...home,
                stickyNote: {
                  author: profile,
                  text: content.trim(),
                  updatedAt: new Date().toISOString(),
                },
              });
            });
          }

          Alert.alert(
            '¡Carta actualizada!',
            'Tus cambios han sido guardados y se reflejan de inmediato.'
          );
          setEditingMessageId(null);
          setContent('');
          setScheduledDate(getTodayString());
          await loadSentLetters(profile);
          setActiveTab('sent');
        } else {
          Alert.alert('Aviso', result.error || 'No se pudo actualizar la carta.');
        }
      } else {
        // Enviar nueva carta (hoy si aún no hay, o programada a futuro)
        const result = await createSupabaseMessage({
          sender: profile,
          recipient,
          content: content.trim(),
          scheduled_date: scheduledDate,
          theme_color: themeColor,
        });

        if (result.success) {
          if (isToday) {
            void getHomeState().then((home) => {
              void saveHomeState(profile, {
                ...home,
                stickyNote: {
                  author: profile,
                  text: content.trim(),
                  updatedAt: new Date().toISOString(),
                },
              });
            });
          }

          void getHomeState().then((home) => {
            const token = home?.pushTokens?.[recipient];
            if (token) {
              void sendPartnerPushNotification(
                token,
                `KMRG 💌 Carta de ${profile === 'Karla' ? 'Karlita' : 'Javier'}`,
                isToday
                  ? `¡Te ha dejado una carta especial para hoy!`
                  : `Te ha escrito una carta especial para el ${scheduledDate}.`,
                { type: 'SEALED_LETTER', sender: profile }
              );
            }
          });

          setIsSealingEnvelope(true);
          Animated.sequence([
            Animated.timing(sealAnim, {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.delay(200),
          ]).start(() => {
            setIsSealingEnvelope(false);
            sealAnim.setValue(0);
            setSealedModalData({
              scheduledDate,
              recipientDisplay,
              isUpdate: false,
            });
          });
          await loadSentLetters(profile);
        } else {
          Alert.alert('Aviso', result.error || 'No se pudo enviar la carta.');
        }
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
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title}>Para {recipientDisplay}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {editingMessageId ? 'Editando tu carta de hoy' : 'Cartas del día y sorpresas programadas'}
            </Text>
          </View>

          <View style={[styles.tabSwitch, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 }]}>
            <PressableScale
              onPress={() => {
                if (editingMessageId) setEditingMessageId(null);
                setActiveTab('write');
              }}
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
            {/* Banner cuando se está editando la carta desde Enviadas */}
            {editingMessageId && (
              <View style={[styles.editingBanner, { backgroundColor: `${primaryColor}18`, borderColor: `${primaryColor}40` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="create" size={16} color={primaryColor} />
                  <Text style={[styles.editingBannerText, { color: primaryColor }]} numberOfLines={1}>
                    Editando carta de hoy ({formatDisplayDate(scheduledDate)})
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                  <Text style={[styles.cancelEditBtnText, { color: primaryColor }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Hoja de Carta / Papel con Previsualización del Sobre */}
            <View
              style={[
                styles.paperSheet,
                {
                  backgroundColor: colors.paper,
                  borderColor: themeColor,
                  borderTopWidth: 4,
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
                  {formatDisplayDate(scheduledDate, { day: 'numeric', month: 'short' })}
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

            {/* Opciones: Fecha de apertura y selector de color */}
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
                  <Text style={[styles.dateLabelMini, { color: colors.textMuted }]}>FECHA DE ENTREGA / DESBLOQUEO</Text>
                  <Text style={[styles.datePickerProminentText, { color: colors.text }]} numberOfLines={1}>
                    {isTodaySelected
                      ? '✨ Hoy mismo (Entrega inmediata)'
                      : `Se abrirá el ${formatDisplayDate(scheduledDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
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
              minDate={getTodayString()}
              onSelect={(selected) => setScheduledDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de Entrega o Apertura"
            />

            {/* CONTROL DEL BOTÓN DE ACCIÓN:
                1. Si estamos editando desde Enviadas: muestra 'Guardar Cambios de la Carta'.
                2. Si es para hoy y YA fue enviada: NO muestra el botón de enviar directamente en Escribir;
                   muestra la tarjeta informativa invitando a ir a Enviadas para editar en la tarjeta del día.
                3. Si aún no se envía hoy o es una fecha futura: muestra el botón para enviar/sellar.
            */}
            {editingMessageId ? (
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
                    <Ionicons name="checkmark-circle" size={17} color={colors.primaryOn} />
                    <Text style={styles.submitButtonText}>Guardar Cambios de la Carta</Text>
                  </>
                )}
              </PressableScale>
            ) : isTodaySelected && hasSentToday ? (
              <View style={[styles.alreadySentTodayCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <View style={[styles.alreadySentTodayIcon, { backgroundColor: '#2a9d8f18' }]}>
                  <Ionicons name="checkmark-done-circle" size={22} color="#2a9d8f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alreadySentTodayTitle, { color: colors.text }]}>
                    Carta de hoy ya enviada
                  </Text>
                  <Text style={[styles.alreadySentTodaySub, { color: colors.textMuted }]}>
                    Para editarla, ve a la pestaña "Enviadas" y toca el botón de la tarjeta del día.
                  </Text>
                </View>
                <PressableScale
                  onPress={() => setActiveTab('sent')}
                  style={[styles.goToSentBtn, { backgroundColor: primaryColor }]}
                  scaleTo={0.96}
                >
                  <Text style={[styles.goToSentBtnText, { color: colors.primaryOn }]}>Ver en Enviadas</Text>
                </PressableScale>
              </View>
            ) : (
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
                    <Ionicons
                      name={isTodaySelected ? 'paper-plane' : 'lock-closed'}
                      size={17}
                      color={colors.primaryOn}
                    />
                    <Text style={styles.submitButtonText}>
                      {isTodaySelected ? 'Enviar Carta para Hoy' : 'Sellar Carta con Candado'}
                    </Text>
                  </>
                )}
              </PressableScale>
            )}
          </View>
        ) : (
          <View style={styles.sentContainer}>
            <View style={{ flex: 1, justifyContent: 'flex-start', gap: 10 }}>
              {visibleSent.length === 0 ? (
                <EmptyState
                  icon="mail-outline"
                  title="Sin cartas enviadas"
                  message="Aún no has escrito cartas. Escribe una para hoy o prográmala para una fecha especial."
                />
              ) : (
                visibleSent.map((letter) => {
                  const letterDateStr = toLocalDateString(letter.scheduled_date);
                  const isTodayLetter = letterDateStr === getTodayString();
                  const isFuture = letterDateStr > getTodayString();

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
                            {isTodayLetter
                              ? 'Carta de Hoy'
                              : isFuture
                              ? `Se abrirá el ${formatDisplayDate(letter.scheduled_date)}`
                              : `Entregada el ${formatDisplayDate(letter.scheduled_date)}`}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* EL BOTÓN DE EDITAR SOLO APARECE EN LA TARJETA DEL DÍA (NO EN LAS PASADAS NI FUTURAS) */}
                          {isTodayLetter && (
                            <TouchableOpacity
                              onPress={() => handleStartEditLetter(letter)}
                              style={[styles.editTodayBtn, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="pencil" size={12} color={colors.primary} />
                              <Text style={[styles.editTodayBtnText, { color: colors.primary }]}>
                                Editar
                              </Text>
                            </TouchableOpacity>
                          )}

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
                              {isFuture ? 'Sellada' : 'Entregada'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.sentSnippet,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
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
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                  <Text style={[styles.pageBtnText, { color: colors.text }]}>Anterior</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Página {sentPage + 1} de {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={sentPage >= totalPages - 1}
                  onPress={() => setSentPage((p) => Math.min(totalPages - 1, p + 1))}
                  style={[styles.pageBtn, sentPage >= totalPages - 1 && { opacity: 0.4 }]}
                >
                  <Text style={[styles.pageBtnText, { color: colors.text }]}>Siguiente</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text} />
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
                <Ionicons name={isTodaySelected ? 'paper-plane' : 'lock-closed'} size={26} color="#ffffff" />
              </View>
            </View>
            <Text style={[styles.sealingTitle, { color: colors.text }]}>
              {isTodaySelected ? 'Entregando tu carta...' : 'Sellando con candado...'}
            </Text>
            <Text style={[styles.sealingSub, { color: colors.textMuted }]}>
              {isTodaySelected
                ? `Tu carta ya está lista para ${recipientDisplay}`
                : `Tu sobre se abrirá para ${recipientDisplay} el ${formatDisplayDate(scheduledDate)}`}
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Confirmación: Carta Sellada / Entregada */}
      <Modal
        visible={Boolean(sealedModalData)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (sealedModalData) {
            setSealedModalData(null);
            setContent('');
            void loadSentLetters(profile);
            navigation.navigate('Hoy');
          }
        }}
      >
        <View style={styles.sealingOverlay}>
          <View
            style={[
              styles.sealedSuccessCard,
              {
                backgroundColor: colors.surface,
                borderColor: `${themeColor}40`,
              },
            ]}
          >
            {/* Halo del sobre */}
            <View
              style={[
                styles.sealedEmblemHalo,
                {
                  backgroundColor: `${themeColor}15`,
                  borderColor: `${themeColor}35`,
                },
              ]}
            >
              <View style={[styles.sealedEmblemInner, { backgroundColor: themeColor }]}>
                <Ionicons
                  name={sealedModalData?.scheduledDate === getTodayString() ? 'paper-plane' : 'lock-closed'}
                  size={28}
                  color="#ffffff"
                />
              </View>
            </View>

            <View
              style={[
                styles.sealedPillBadge,
                {
                  backgroundColor: `${themeColor}18`,
                  borderColor: `${themeColor}40`,
                },
              ]}
            >
              <Ionicons name="sparkles" size={11} color={themeColor} />
              <Text style={[styles.sealedPillText, { color: themeColor }]}>
                {sealedModalData?.scheduledDate === getTodayString()
                  ? 'CARTA ENTREGADA HOY'
                  : 'CARTA SELLADA CON CANDADO'}
              </Text>
            </View>

            <Text style={[styles.sealedSuccessTitle, { color: colors.text }]}>
              {sealedModalData?.scheduledDate === getTodayString()
                ? '¡Tu carta fue entregada!'
                : '¡Tu carta está protegida!'}
            </Text>

            <Text style={[styles.sealedSuccessMessage, { color: colors.textSecondary }]}>
              {sealedModalData?.scheduledDate === getTodayString() ? (
                <>
                  Tu carta ya está visible para{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>
                    {sealedModalData?.recipientDisplay}
                  </Text>{' '}
                  en su sección de Hoy.
                </>
              ) : (
                <>
                  Tu sobre quedó cerrado y se abrirá mágicamente para{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>
                    {sealedModalData?.recipientDisplay}
                  </Text>{' '}
                  el{' '}
                  <Text style={{ fontWeight: '800', color: themeColor }}>
                    {sealedModalData ? formatDisplayDate(sealedModalData.scheduledDate) : ''}
                  </Text>
                  .
                </>
              )}
            </Text>

            <View
              style={[
                styles.sealedInfoBox,
                {
                  backgroundColor: isDark ? '#27272a' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={themeColor}
                style={{ marginTop: 2 }}
              />
              <Text style={[styles.sealedInfoText, { color: colors.textMuted }]}>
                Si notas algún error en tu carta de hoy, puedes corregirla desde 'Enviadas'.
              </Text>
            </View>

            <PressableScale
              onPress={() => {
                setSealedModalData(null);
                setContent('');
                void loadSentLetters(profile);
                navigation.navigate('Hoy');
              }}
              style={[styles.sealedDoneBtn, { backgroundColor: themeColor }]}
              scaleTo={0.96}
            >
              <Text style={styles.sealedDoneBtnText}>Ver en Hoy</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    fixedViewport: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 4,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      fontFamily: SERIF_FONT,
    },
    subtitle: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 1,
    },
    tabSwitch: {
      flexDirection: 'row',
      borderRadius: 12,
      padding: 3,
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
    editingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 4,
    },
    editingBannerText: {
      fontSize: 12,
      fontWeight: '700',
    },
    cancelEditBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    cancelEditBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    alreadySentTodayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 10,
      marginBottom: 6,
    },
    alreadySentTodayIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alreadySentTodayTitle: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    alreadySentTodaySub: {
      fontSize: 10.5,
      marginTop: 2,
      lineHeight: 14,
    },
    goToSentBtn: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goToSentBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    writeViewport: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 16,
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
      minHeight: 200,
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
      marginBottom: 6,
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
      marginBottom: 6,
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
    dateLabelMini: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    datePickerProminentText: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 1,
    },
    colorPickerContainer: {
      alignItems: 'flex-start',
      width: '100%',
    },
    colorPickerLabel: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
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
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 10,
      marginBottom: 6,
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
    editTodayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      borderWidth: 1,
    },
    editTodayBtnText: {
      fontSize: 11,
      fontWeight: '700',
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
    },
    pageIndicator: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
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
    sealedSuccessCard: {
      width: '100%',
      maxWidth: 340,
      borderRadius: 26,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 22,
      alignItems: 'center',
      borderWidth: 1.5,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    sealedEmblemHalo: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      marginBottom: 12,
    },
    sealedEmblemInner: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    sealedPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    sealedPillText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    sealedSuccessTitle: {
      fontSize: 18.5,
      fontWeight: '800',
      textAlign: 'center',
      fontFamily: SERIF_FONT,
      marginBottom: 8,
    },
    sealedSuccessMessage: {
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 14,
      paddingHorizontal: 6,
    },
    sealedInfoBox: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 18,
    },
    sealedInfoText: {
      flex: 1,
      fontSize: 11.5,
      lineHeight: 16.5,
    },
    sealedDoneBtn: {
      width: '100%',
      paddingVertical: 13,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sealedDoneBtnText: {
      color: '#ffffff',
      fontSize: 14.5,
      fontWeight: '800',
    },
  });

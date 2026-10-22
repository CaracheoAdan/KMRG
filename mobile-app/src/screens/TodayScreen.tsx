import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Message, HomeState } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { VoiceNoteWidget } from '../components/VoiceNoteWidget';
import { TimeCapsulesWidget } from '../components/TimeCapsulesWidget';
import {
  MoodMascot,
  PRESET_FEELINGS,
  MoodFeelingType,
  resolveFeelingType,
} from '../components/MoodMascot';
import {
  getTodayMessage,
  markMessageAsRead,
  formatDisplayDate,
  toLocalDateString,
} from '../services/StorageService';
import {
  syncSupabaseMessages,
  sendSupabaseInteraction,
  markSupabaseMessageRead,
} from '../services/SupabaseService';
import {
  getHomeState,
  saveHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { scheduleDailyMessage } from '../services/NotificationService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

export const TodayScreen: React.FC = () => {
  const { profile } = useProfile();
  const { primaryColor } = useTheme();
  const currentProfile = profile || 'Karla';

  const [message, setMessage] = useState<Message | null>(null);
  const [homeState, setHomeState] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingInteraction, setSendingInteraction] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Selector de fecha aniversario
  const [showAnniversaryPicker, setShowAnniversaryPicker] = useState(false);

  // Modal Estado de Ánimo con Monito
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);
  const [tempFeeling, setTempFeeling] = useState<MoodFeelingType>('feliz');
  const [tempStatus, setTempStatus] = useState('');
  const [tempSong, setTempSong] = useState('');

  // Modal Próxima Cita
  const [isNextEventModalOpen, setIsNextEventModalOpen] = useState(false);
  const [tempEventTitle, setTempEventTitle] = useState('');
  const [tempEventDate, setTempEventDate] = useState(() => toLocalDateString(new Date()));
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);

  // Animaciones
  const heartScale = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      await syncSupabaseMessages();
    } catch {
      // Continuar con caché
    }

    const [todayMsg, syncedHome] = await Promise.all([
      getTodayMessage(currentProfile),
      getHomeState(),
    ]);

    setMessage(todayMsg);
    setHomeState(syncedHome);

    if (todayMsg && !todayMsg.is_read) {
      await markMessageAsRead(todayMsg.id);
      void markSupabaseMessageRead(todayMsg.id);
    }

    if (isRefresh) {
      void scheduleDailyMessage();
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, [currentProfile]);

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel('kmrg-live-interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          const newInteraction = payload.new;
          if (!newInteraction) return;

          if (newInteraction.type === 'sync_home_state' && newInteraction.payload) {
            setHomeState((prev) => ({ ...prev, ...newInteraction.payload }));
            return;
          }

          if (
            newInteraction.type === 'thinking_of_you' &&
            newInteraction.sender !== currentProfile
          ) {
            const senderName = newInteraction.sender === 'Javier' ? 'Javier 💙' : 'Karlita 💜';
            Alert.alert(
              '❤️ Pensando en ti',
              `${senderName} acaba de enviarte un latido desde su corazón.`
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, [loadData, currentProfile]);

  const updateAndSyncHome = async (next: HomeState) => {
    setHomeState(next);
    await saveHomeState(currentProfile, next);
  };

  // Cálculo del Tiempo Juntos
  const timeTogether = useMemo(() => {
    const start = new Date(`${homeState.anniversaryDate}T00:00:00`);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - start.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;
    return { totalDays, years, months, days };
  }, [homeState.anniversaryDate]);

  // Cuenta regresiva a próxima cita
  const daysUntilNextEvent = useMemo(() => {
    const target = new Date(`${homeState.nextEventDate}T23:59:59`);
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }, [homeState.nextEventDate]);

  const handleHeartPress = async () => {
    if (sendingInteraction) return;
    setSendingInteraction(true);

    const isNative = Platform.OS !== 'web';
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.32,
        friction: 3,
        tension: 140,
        useNativeDriver: isNative,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: isNative,
      }),
    ]).start();

    const todayStr = toLocalDateString(new Date());
    if (homeState.lastInteractionDate !== todayStr) {
      const nextHome: HomeState = {
        ...homeState,
        streakCount: (homeState.streakCount || 1) + 1,
        lastInteractionDate: todayStr,
      };
      void updateAndSyncHome(nextHome);
    }

    const recipientLabel = currentProfile === 'Karla' ? 'Javier 💙' : 'Karlita 💜';
    const result = await sendSupabaseInteraction(currentProfile, 'thinking_of_you', {
      message_id: message?.id || null,
      timestamp: new Date().toISOString(),
    });

    setInteractionFeedback({
      text: result.success
        ? `¡Latido enviado a ${recipientLabel}!`
        : `¡Tu amor quedó registrado para ${recipientLabel}!`,
      success: result.success,
    });

    feedbackOpacity.setValue(0);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: isNative,
    }).start();

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: isNative,
      }).start(() => {
        setInteractionFeedback(null);
        setSendingInteraction(false);
      });
    }, 2800);
  };

  const openMyMoodEditor = () => {
    const myMood = homeState.moods[currentProfile];
    const initialFeeling = resolveFeelingType(myMood?.feeling, myMood?.emoji, myMood?.status);
    setTempFeeling(initialFeeling);
    setTempStatus(myMood?.status || '');
    setTempSong(myMood?.song || '');
    setIsMoodModalOpen(true);
  };

  const handleSaveMood = async () => {
    const preset = PRESET_FEELINGS.find((f) => f.id === tempFeeling);
    const finalStatus = tempStatus.trim() || preset?.label || 'Feliz';
    const finalEmoji = preset?.emoji || '😊';

    const nextHome: HomeState = {
      ...homeState,
      moods: {
        ...homeState.moods,
        [currentProfile]: {
          feeling: tempFeeling,
          emoji: finalEmoji,
          status: finalStatus,
          song: tempSong.trim(),
          updatedAt: new Date().toISOString(),
        },
      },
    };
    await updateAndSyncHome(nextHome);
    setIsMoodModalOpen(false);
  };

  const handleSaveNextEvent = async () => {
    if (!tempEventTitle.trim()) return;
    await updateAndSyncHome({
      ...homeState,
      nextEventTitle: tempEventTitle.trim(),
      nextEventDate: tempEventDate,
    });
    setIsNextEventModalOpen(false);
  };

  const backgroundColor = `${primaryColor}08`;
  const isScheduledForToday = message
    ? toLocalDateString(message.scheduled_date) === toLocalDateString(new Date())
    : false;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar style="dark" />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader streakCount={homeState.streakCount || 1} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={primaryColor}
          />
        }
      >
        {/* ================= 1. CARTA DEL DÍA (PROTAGONISTA) ================= */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
            <Text style={styles.loadingText}>Abriendo tu carta...</Text>
          </View>
        ) : message ? (
          <View style={styles.cardContainer}>
            <View style={styles.headerBadgeContainer}>
              <View style={[styles.headerBadge, { backgroundColor: `${primaryColor}20` }]}>
                <Ionicons name="sparkles" size={13} color={primaryColor} />
                <Text style={[styles.headerBadgeText, { color: primaryColor }]}>
                  {isScheduledForToday
                    ? currentProfile === 'Karla'
                      ? 'Para ti Karlita, mi amor'
                      : 'Para ti, mi amor'
                    : 'Carta especial'}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDisplayDate(message.scheduled_date)}</Text>
            </View>

            <View
              style={[
                styles.messageCard,
                { borderTopColor: primaryColor, borderTopWidth: 4 },
              ]}
            >
              <Text style={[styles.quoteMark, { color: `${primaryColor}30` }]}>“</Text>
              <Text style={styles.messageContent}>{message.content}</Text>
              <Text style={[styles.quoteMarkClose, { color: `${primaryColor}30` }]}>”</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { borderTopColor: primaryColor, borderTopWidth: 4 }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="mail-open-outline" size={32} color={primaryColor} />
            </View>
            <Text style={styles.emptyTitle}>
              {currentProfile === 'Karla' ? '¡Hola Karlita hermosa!' : '¡Hola Javier!'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {currentProfile === 'Karla'
                ? 'Cada instante de mi día estás en mi mente y en mi corazón, mi vida.'
                : 'Puedes programar una nueva carta sorpresa desde la pestaña Escribir.'}
            </Text>
          </View>
        )}

        {/* ================= 2. BOTÓN DE LATIDO EN TIEMPO REAL ================= */}
        <View style={styles.interactionSection}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <TouchableOpacity
              onPress={handleHeartPress}
              activeOpacity={0.85}
              style={[
                styles.heartButton,
                { backgroundColor: primaryColor, shadowColor: primaryColor },
              ]}
            >
              <Ionicons name="heart" size={30} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.heartButtonLabel}>Pensando en ti</Text>

          {interactionFeedback && (
            <Animated.View style={[styles.feedbackContainer, { opacity: feedbackOpacity }]}>
              <Ionicons
                name={interactionFeedback.success ? 'heart' : 'sparkles'}
                size={14}
                color={primaryColor}
              />
              <Text style={[styles.feedbackText, { color: primaryColor }]}>
                {interactionFeedback.text}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* ================= 3. WIDGET VISUAL: TIEMPO JUNTOS ================= */}
        <TouchableOpacity
          onPress={() => setShowAnniversaryPicker(true)}
          style={styles.counterCard}
          activeOpacity={0.85}
        >
          <View style={styles.counterHeaderRow}>
            <View style={styles.counterTitleWrap}>
              <View style={[styles.miniIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="infinite" size={16} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.widgetTitle}>Tiempo Juntos</Text>
                <Text style={styles.widgetSub}>
                  Desde el {formatDisplayDate(homeState.anniversaryDate)}
                </Text>
              </View>
            </View>
            <View style={[styles.totalDaysPill, { backgroundColor: primaryColor }]}>
              <Text style={styles.totalDaysPillText}>{timeTogether.totalDays} días</Text>
            </View>
          </View>

          <View style={styles.timeBoxesRow}>
            <View style={[styles.timeBox, { backgroundColor: `${primaryColor}0d` }]}>
              <Text style={[styles.timeBoxVal, { color: primaryColor }]}>
                {timeTogether.years}
              </Text>
              <Text style={styles.timeBoxUnit}>Años</Text>
            </View>
            <View style={[styles.timeBox, { backgroundColor: `${primaryColor}0d` }]}>
              <Text style={[styles.timeBoxVal, { color: primaryColor }]}>
                {timeTogether.months}
              </Text>
              <Text style={styles.timeBoxUnit}>Meses</Text>
            </View>
            <View style={[styles.timeBox, { backgroundColor: `${primaryColor}0d` }]}>
              <Text style={[styles.timeBoxVal, { color: primaryColor }]}>
                {timeTogether.days}
              </Text>
              <Text style={styles.timeBoxUnit}>Días</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= 4. NUESTRO ESTADO HOY CON EL MONITO ================= */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Nuestro Estado Hoy</Text>
          <TouchableOpacity onPress={openMyMoodEditor} style={styles.sectionActionBtn}>
            <Ionicons name="create-outline" size={14} color={primaryColor} />
            <Text style={[styles.sectionActionText, { color: primaryColor }]}>
              Actualizar el mío
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.moodsGrid}>
          {(['Karla', 'Javier'] as const).map((person) => {
            const m = homeState.moods[person];
            const isMe = currentProfile === person;
            const feelingType = resolveFeelingType(m?.feeling, m?.emoji, m?.status);
            const feelingObj = PRESET_FEELINGS.find((f) => f.id === feelingType);

            return (
              <TouchableOpacity
                key={person}
                onPress={isMe ? openMyMoodEditor : undefined}
                activeOpacity={isMe ? 0.8 : 1}
                style={[
                  styles.moodCard,
                  isMe && { borderColor: `${primaryColor}45`, borderWidth: 1.5 },
                ]}
              >
                {/* Monito Chibi */}
                <View style={styles.mascotHolder}>
                  <MoodMascot feeling={feelingType} size="sm" accentColor={primaryColor} />
                </View>

                {/* Info del sentimiento */}
                <View style={styles.moodInfoContent}>
                  <View style={styles.moodHeaderLine}>
                    <Text style={styles.moodPersonName}>
                      {person === 'Karla' ? 'Karlita' : 'Javier'}
                    </Text>
                    <View style={[styles.feelingChip, { backgroundColor: `${primaryColor}14` }]}>
                      <Text style={[styles.feelingChipText, { color: primaryColor }]}>
                        {feelingObj?.label || 'Feliz'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.moodStatusMessage} numberOfLines={2}>
                    {m?.status || 'Pensando en ti'}
                  </Text>

                  {m?.song ? (
                    <View style={[styles.songBadge, { backgroundColor: `${primaryColor}10` }]}>
                      <Ionicons name="musical-notes" size={11} color={primaryColor} />
                      <Text style={[styles.songBadgeText, { color: primaryColor }]} numberOfLines={1}>
                        {m.song}
                      </Text>
                    </View>
                  ) : null}

                  {isMe && (
                    <Text style={[styles.changeHintText, { color: primaryColor }]}>
                      Toca para cambiar
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= 5. WIDGET VISUAL: PRÓXIMA CITA ================= */}
        <TouchableOpacity
          onPress={() => {
            setTempEventTitle(homeState.nextEventTitle);
            setTempEventDate(homeState.nextEventDate);
            setIsNextEventModalOpen(true);
          }}
          style={styles.nextEventCard}
          activeOpacity={0.85}
        >
          <View style={[styles.eventIconBox, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="calendar" size={20} color={primaryColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.eventLabel}>PRÓXIMA CITA JUNTOS</Text>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {homeState.nextEventTitle}
            </Text>
            <Text style={styles.eventDateSub}>
              {formatDisplayDate(homeState.nextEventDate)}
            </Text>
          </View>
          <View style={[styles.daysLeftBadge, { backgroundColor: primaryColor }]}>
            <Text style={styles.daysLeftNum}>{daysUntilNextEvent}</Text>
            <Text style={styles.daysLeftUnit}>días</Text>
          </View>
        </TouchableOpacity>

        {/* ================= 6. NOTAS DE VOZ EN TIEMPO REAL ================= */}
        <VoiceNoteWidget
          voiceNotes={homeState.voiceNotes || []}
          currentProfile={currentProfile}
          primaryColor={primaryColor}
          onSaveVoiceNote={(note) => {
            const currentNotes = homeState.voiceNotes || [];
            void updateAndSyncHome({
              ...homeState,
              voiceNotes: [note, ...currentNotes],
            });
          }}
          onDeleteVoiceNote={(id) => {
            const currentNotes = homeState.voiceNotes || [];
            void updateAndSyncHome({
              ...homeState,
              voiceNotes: currentNotes.filter((n) => n.id !== id),
            });
          }}
        />

        {/* ================= 7. CÁPSULAS DEL TIEMPO CON CANDADO ================= */}
        <TimeCapsulesWidget
          capsules={homeState.timeCapsules || []}
          currentProfile={currentProfile}
          primaryColor={primaryColor}
          onSaveCapsule={(cap) => {
            const currentCaps = homeState.timeCapsules || [];
            void updateAndSyncHome({
              ...homeState,
              timeCapsules: [cap, ...currentCaps],
            });
          }}
          onDeleteCapsule={(id) => {
            const currentCaps = homeState.timeCapsules || [];
            void updateAndSyncHome({
              ...homeState,
              timeCapsules: currentCaps.filter((c) => c.id !== id),
            });
          }}
        />
      </ScrollView>

      {/* Selector de Fecha de Aniversario */}
      <DatePickerModal
        visible={showAnniversaryPicker}
        value={homeState.anniversaryDate}
        onSelect={(selected) => {
          void updateAndSyncHome({ ...homeState, anniversaryDate: selected });
        }}
        onClose={() => setShowAnniversaryPicker(false)}
        title="Fecha de nuestro aniversario"
      />

      {/* Selector de Fecha de Próxima Cita */}
      <DatePickerModal
        visible={showEventDatePicker}
        value={tempEventDate}
        onSelect={(selected) => setTempEventDate(selected)}
        onClose={() => setShowEventDatePicker(false)}
        title="Fecha de nuestra próxima cita"
      />

      {/* ================= MODAL: EDITAR MI ESTADO CON EL MONITO ================= */}
      <Modal
        visible={isMoodModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMoodModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>¿Cómo te sientes hoy?</Text>
                <Text style={styles.modalSubtitle}>
                  Elige un sentimiento o escribe tus propias palabras
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMoodModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Presentación del Monito reactivo */}
              <View style={[styles.monitoShowcase, { backgroundColor: `${primaryColor}0d` }]}>
                <MoodMascot feeling={tempFeeling} size="lg" accentColor={primaryColor} />
                <View style={styles.monitoMeta}>
                  <Text style={[styles.monitoTitle, { color: primaryColor }]}>
                    {PRESET_FEELINGS.find((f) => f.id === tempFeeling)?.label}
                  </Text>
                  <Text style={styles.monitoSub}>
                    {PRESET_FEELINGS.find((f) => f.id === tempFeeling)?.description}
                  </Text>
                </View>
              </View>

              {/* Selector de Sentimientos Básicos */}
              <Text style={styles.inputLabel}>Selecciona el sentimiento de tu monito</Text>
              <View style={styles.feelingsGrid}>
                {PRESET_FEELINGS.map((item) => {
                  const active = tempFeeling === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setTempFeeling(item.id)}
                      style={[
                        styles.feelingOptionBtn,
                        active && {
                          backgroundColor: `${primaryColor}18`,
                          borderColor: primaryColor,
                          borderWidth: 1.5,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.feelingOptionLabel,
                          active && { color: primaryColor, fontWeight: '700' },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* O escribe libremente cómo te sientes */}
              <Text style={styles.inputLabel}>O escribe con tus propias palabras</Text>
              <TextInput
                value={tempStatus}
                onChangeText={setTempStatus}
                placeholder={`Ej. ${
                  PRESET_FEELINGS.find((f) => f.id === tempFeeling)?.description || 'Me siento genial hoy...'
                }`}
                placeholderTextColor="#adb5bd"
                style={styles.modalInput}
                maxLength={90}
              />

              {/* Canción del momento (opcional) */}
              <Text style={styles.inputLabel}>Canción que estoy escuchando (opcional)</Text>
              <TextInput
                value={tempSong}
                onChangeText={setTempSong}
                placeholder="Ej. Ojitos Lindos - Bad Bunny"
                placeholderTextColor="#adb5bd"
                style={styles.modalInput}
                maxLength={60}
              />

              <TouchableOpacity
                onPress={handleSaveMood}
                style={[styles.modalSaveBtn, { backgroundColor: primaryColor }]}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.modalSaveBtnText}>Guardar Mi Estado</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Editar Próxima Cita */}
      <Modal
        visible={isNextEventModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNextEventModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Próxima Cita Juntos</Text>
              <TouchableOpacity onPress={() => setIsNextEventModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>¿Qué plan tienen?</Text>
            <TextInput
              value={tempEventTitle}
              onChangeText={setTempEventTitle}
              placeholder="Ej. Noche de cine, Cenita romántica..."
              placeholderTextColor="#adb5bd"
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Fecha de la cita</Text>
            <TouchableOpacity
              onPress={() => setShowEventDatePicker(true)}
              style={styles.dateSelectorBtn}
            >
              <Ionicons name="calendar-outline" size={18} color={primaryColor} />
              <Text style={styles.dateSelectorText}>{formatDisplayDate(tempEventDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveNextEvent}
              style={[styles.modalSaveBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.modalSaveBtnText}>Guardar Próxima Cita</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  headerBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  messageCard: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    padding: 18,
    position: 'relative',
  },
  quoteMark: {
    fontSize: 28,
    fontFamily: SERIF_FONT,
    position: 'absolute',
    top: 6,
    left: 10,
    lineHeight: 28,
  },
  quoteMarkClose: {
    fontSize: 28,
    fontFamily: SERIF_FONT,
    position: 'absolute',
    bottom: -8,
    right: 12,
    lineHeight: 28,
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#1e293b',
    fontFamily: SERIF_FONT,
    textAlign: 'center',
    paddingVertical: 8,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  interactionSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  heartButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },
  heartButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    letterSpacing: 0.3,
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  counterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  counterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
  },
  widgetSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  totalDaysPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalDaysPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  timeBoxesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  timeBoxVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  timeBoxUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moodsGrid: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  mascotHolder: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodInfoContent: {
    flex: 1,
  },
  moodHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  moodPersonName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  feelingChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  feelingChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  moodStatusMessage: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '500',
  },
  songBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  songBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  changeHintText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  nextEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  eventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
    marginTop: 2,
  },
  eventDateSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  daysLeftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
  },
  daysLeftNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  daysLeftUnit: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  monitoShowcase: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginBottom: 14,
  },
  monitoMeta: {
    alignItems: 'center',
    marginTop: 6,
  },
  monitoTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  monitoSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  feelingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  feelingOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  feelingOptionEmoji: {
    fontSize: 15,
  },
  feelingOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 16,
    marginBottom: 4,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Image,
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
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

export const TodayScreen: React.FC = () => {
  const { profile, getDisplayName, getAvatarUri } = useProfile();
  const { primaryColor } = useTheme();
  const currentProfile = profile || 'Karla';

  const [message, setMessage] = useState<Message | null>(null);
  const [homeState, setHomeState] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [loading, setLoading] = useState(true);
  const [sendingInteraction, setSendingInteraction] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Modales para mantener CERO scroll en la pantalla principal
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCapsulesModalOpen, setIsCapsulesModalOpen] = useState(false);
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [petNameDraft, setPetNameDraft] = useState('Pochito');
  const [isEditingPetName, setIsEditingPetName] = useState(false);

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
  const petBounce = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isNative = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(petBounce, {
          toValue: -7,
          duration: 950,
          useNativeDriver: isNative,
        }),
        Animated.timing(petBounce, {
          toValue: 0,
          duration: 950,
          useNativeDriver: isNative,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [petBounce]);

  const loadData = useCallback(async () => {
    setLoading(true);
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

    setLoading(false);
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
            const senderName = newInteraction.sender === 'Javier' ? 'Javier' : 'Karlita';
            Alert.alert(
              'Pensando en ti',
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

  // Mascota de pareja (estilo Pou: se mantiene feliz cuando se mandan corazones)
  const petInfo = useMemo(() => {
    const rawPet = homeState.couplePet || DEFAULT_HOME_STATE.couplePet!;
    const lastFedMs = new Date(rawPet.lastFedAt || Date.now()).getTime();
    const hoursSinceFed = Math.max(0, (Date.now() - lastFedMs) / (1000 * 60 * 60));
    const decay = Math.floor(hoursSinceFed * 2);
    const effectiveHappiness = Math.max(15, Math.min(100, (rawPet.happiness ?? 92) - decay));
    return {
      ...rawPet,
      effectiveHappiness,
    };
  }, [homeState.couplePet]);

  const handleSavePetName = async () => {
    const clean = petNameDraft.trim() || 'Pochito';
    const nextHome: HomeState = {
      ...homeState,
      couplePet: {
        ...petInfo,
        name: clean,
      },
    };
    setIsEditingPetName(false);
    await updateAndSyncHome(nextHome);
  };

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
    const nextHappiness = Math.min(100, petInfo.effectiveHappiness + 25);
    const nextXp = (petInfo.xp || 0) + 25;
    const nextLevel = Math.floor(nextXp / 100) + 1;

    const nextHome: HomeState = {
      ...homeState,
      streakCount:
        homeState.lastInteractionDate !== todayStr
          ? (homeState.streakCount || 1) + 1
          : homeState.streakCount || 1,
      lastInteractionDate: todayStr,
      couplePet: {
        name: petInfo.name || 'Pochito',
        happiness: nextHappiness,
        xp: nextXp,
        level: nextLevel,
        heartsFedTotal: (petInfo.heartsFedTotal || 0) + 1,
        lastFedAt: new Date().toISOString(),
        lastFedBy: currentProfile,
      },
    };
    void updateAndSyncHome(nextHome);

    const recipientRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';
    const recipientLabel = getDisplayName(recipientRole);
    const result = await sendSupabaseInteraction(currentProfile, 'thinking_of_you', {
      message_id: message?.id || null,
      timestamp: new Date().toISOString(),
    });

    setInteractionFeedback({
      text: result.success
        ? `Latido para ${recipientLabel} • ¡${petInfo.name} +25% feliz!`
        : `Guardado para ${recipientLabel} • ¡${petInfo.name} alimentado!`,
      success: result.success,
    });

    feedbackOpacity.setValue(0);
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: isNative,
    }).start();

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: isNative,
      }).start(() => {
        setInteractionFeedback(null);
        setSendingInteraction(false);
      });
    }, 2400);
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
    const finalEmoji = preset?.emoji || 'Feliz';

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
  const voiceCount = (homeState.voiceNotes || []).length;
  const capsulesCount = (homeState.timeCapsules || []).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar style="dark" />
      <AppHeader streakCount={homeState.streakCount || 1} />

      {/* ================= PANEL PRINCIPAL SIN SCROLL (ONE-VIEWPORT BENTO) ================= */}
      <View style={styles.bentoViewport}>
        {/* 1. CARTA DEL DÍA + CORAZÓN DE LATIDO EN TIEMPO REAL */}
        <View style={[styles.heroCard, { borderTopColor: primaryColor }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.headerBadge, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="sparkles" size={12} color={primaryColor} />
              <Text style={[styles.headerBadgeText, { color: primaryColor }]}>
                {currentProfile === 'Karla' ? 'Para ti Karlita, mi amor' : 'Carta del Día'}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {message ? formatDisplayDate(message.scheduled_date) : 'Hoy'}
            </Text>
          </View>

          <View style={styles.heroBodyRow}>
            <TouchableOpacity
              onPress={() => message && setIsLetterModalOpen(true)}
              activeOpacity={0.85}
              style={{ flex: 1, paddingRight: 10 }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={primaryColor} />
              ) : (
                <>
                  <Text style={styles.messageContent} numberOfLines={3}>
                    “
                    {message
                      ? message.content
                      : currentProfile === 'Karla'
                      ? 'Cada instante de mi día estás en mi mente y en mi corazón, mi vida.'
                      : 'Programa una nueva carta sorpresa para Karlita desde la pestaña Escribir.'}
                    ”
                  </Text>
                  {message && message.content.length > 95 && (
                    <Text style={[styles.readMoreHint, { color: primaryColor }]}>
                      Toca para leer completa
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Botón de Latido integrado */}
            <View style={styles.heartColumn}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <TouchableOpacity
                  onPress={() => void handleHeartPress()}
                  activeOpacity={0.85}
                  style={[
                    styles.heartButton,
                    { backgroundColor: primaryColor, shadowColor: primaryColor },
                  ]}
                >
                  <Ionicons name="heart" size={24} color="#ffffff" />
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.heartButtonLabel}>Latido</Text>
            </View>
          </View>

          {interactionFeedback && (
            <Animated.View style={[styles.feedbackPill, { opacity: feedbackOpacity }]}>
              <Ionicons name="heart" size={12} color={primaryColor} />
              <Text style={[styles.feedbackText, { color: primaryColor }]}>
                {interactionFeedback.text}
              </Text>
            </Animated.View>
          )}
        </View>

        {/* 2. FILA BENTO: TIEMPO JUNTOS + PRÓXIMA CITA (LADO A LADO) */}
        <View style={styles.bentoRow}>
          {/* Tarjeta Izquierda: Tiempo Juntos */}
          <TouchableOpacity
            onPress={() => setShowAnniversaryPicker(true)}
            style={styles.bentoHalfCard}
            activeOpacity={0.85}
          >
            <View style={styles.bentoCardHeader}>
              <View style={[styles.miniIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="infinite" size={14} color={primaryColor} />
              </View>
              <Text style={styles.bentoLabel}>TIEMPO JUNTOS</Text>
            </View>
            <Text style={[styles.bentoBigNumber, { color: primaryColor }]}>
              {timeTogether.totalDays} <Text style={styles.bentoUnitText}>días</Text>
            </Text>
            <Text style={styles.bentoSubText}>
              {timeTogether.years}a • {timeTogether.months}m • {timeTogether.days}d
            </Text>
          </TouchableOpacity>

          {/* Tarjeta Derecha: Próxima Cita */}
          <TouchableOpacity
            onPress={() => {
              setTempEventTitle(homeState.nextEventTitle);
              setTempEventDate(homeState.nextEventDate);
              setIsNextEventModalOpen(true);
            }}
            style={styles.bentoHalfCard}
            activeOpacity={0.85}
          >
            <View style={styles.bentoCardHeader}>
              <View style={[styles.miniIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="calendar" size={14} color={primaryColor} />
              </View>
              <Text style={styles.bentoLabel}>PRÓXIMA CITA</Text>
            </View>
            <Text style={styles.bentoEventTitle} numberOfLines={1}>
              {homeState.nextEventTitle}
            </Text>
            <View style={styles.bentoEventBottom}>
              <Text style={styles.bentoSubText} numberOfLines={1}>
                {formatDisplayDate(homeState.nextEventDate, { day: 'numeric', month: 'short' })}
              </Text>
              <View style={[styles.daysLeftMiniPill, { backgroundColor: primaryColor }]}>
                <Text style={styles.daysLeftMiniText}>Faltan {daysUntilNextEvent}d</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. NUESTRO ESTADO HOY CON EL MONITO (2 COLUMNAS LADO A LADO) */}
        <View style={styles.moodSectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Nuestro Estado Hoy</Text>
            <TouchableOpacity onPress={openMyMoodEditor} style={styles.sectionActionBtn}>
              <Ionicons name="create-outline" size={14} color={primaryColor} />
              <Text style={[styles.sectionActionText, { color: primaryColor }]}>
                Cambiar mi estado
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bentoRow}>
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
                    styles.moodBentoCard,
                    isMe && { borderColor: `${primaryColor}45`, borderWidth: 1.5 },
                  ]}
                >
                  <View style={styles.moodBentoTop}>
                    <MoodMascot feeling={feelingType} size="sm" accentColor={primaryColor} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {getAvatarUri(person) && (
                          <Image
                            source={{ uri: getAvatarUri(person)! }}
                            style={{ width: 16, height: 16, borderRadius: 8 }}
                          />
                        )}
                        <Text style={styles.moodPersonName} numberOfLines={1}>
                          {getDisplayName(person)}
                        </Text>
                      </View>
                      <View style={[styles.feelingChip, { backgroundColor: `${primaryColor}14` }]}>
                        <Text
                          style={[styles.feelingChipText, { color: primaryColor }]}
                          numberOfLines={1}
                        >
                          {feelingObj?.label || 'Feliz'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.moodStatusMessage} numberOfLines={2}>
                    {m?.status || 'Pensando en ti'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. DOCK INFERIOR: MASCOTA DE PAREJA (POU), NOTAS DE VOZ Y CÁPSULAS (SIN SCROLL) */}
        <View style={styles.bottomDockRow}>
          <TouchableOpacity
            onPress={() => {
              setPetNameDraft(petInfo.name || 'Pochito');
              setIsEditingPetName(false);
              setIsPetModalOpen(true);
            }}
            style={[styles.dockButton, { borderColor: `${primaryColor}45` }]}
            activeOpacity={0.85}
          >
            <View style={[styles.pouMiniAvatar, { backgroundColor: '#fde68a' }]}>
              <View style={styles.pouMiniEyesRow}>
                <View style={styles.pouMiniEye} />
                <View style={styles.pouMiniEye} />
              </View>
              <View style={styles.pouMiniSmile} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dockTitle} numberOfLines={1}>
                {petInfo.name}
              </Text>
              <Text style={[styles.dockSub, { color: primaryColor, fontWeight: '700' }]}>
                ♥ {petInfo.effectiveHappiness}% • Nv.{petInfo.level}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsVoiceModalOpen(true)}
            style={[styles.dockButton, { borderColor: `${primaryColor}35` }]}
            activeOpacity={0.85}
          >
            <View style={[styles.dockIconBox, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="mic" size={16} color={primaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dockTitle} numberOfLines={1}>
                Voz
              </Text>
              <Text style={styles.dockSub}>{voiceCount} notas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsCapsulesModalOpen(true)}
            style={[styles.dockButton, { borderColor: `${primaryColor}35` }]}
            activeOpacity={0.85}
          >
            <View style={[styles.dockIconBox, { backgroundColor: `${primaryColor}15` }]}>
              <Ionicons name="hourglass" size={16} color={primaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dockTitle} numberOfLines={1}>
                Cápsulas
              </Text>
              <Text style={styles.dockSub}>{capsulesCount} selladas</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= MODAL: MASCOTA DE PAREJA (ESTILO POU) ================= */}
      <Modal
        visible={isPetModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPetModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {isEditingPetName ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <TextInput
                      value={petNameDraft}
                      onChangeText={setPetNameDraft}
                      maxLength={18}
                      style={[styles.textInput, { flex: 1, marginBottom: 0, paddingVertical: 6 }]}
                      autoFocus
                    />
                    <TouchableOpacity
                      onPress={() => void handleSavePetName()}
                      style={[
                        styles.closeBtn,
                        { backgroundColor: primaryColor },
                      ]}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsEditingPetName(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Text style={styles.modalTitle}>{petInfo.name}</Text>
                    <Ionicons name="pencil" size={14} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setIsPetModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Nuestra mascota de pareja • Se alimenta cada vez que se mandan un corazón
            </Text>

            {/* Habitación de la Mascota tipo Pou */}
            <View style={[styles.pouRoomCard, { backgroundColor: `${primaryColor}10` }]}>
              <View style={styles.pouStatsTopRow}>
                <View style={[styles.pouBadgePill, { backgroundColor: '#ffffff' }]}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.pouBadgeText}>Nivel {petInfo.level}</Text>
                </View>
                <View style={[styles.pouBadgePill, { backgroundColor: '#ffffff' }]}>
                  <Ionicons name="heart" size={12} color={primaryColor} />
                  <Text style={styles.pouBadgeText}>
                    {petInfo.heartsFedTotal} corazones recibidos
                  </Text>
                </View>
              </View>

              {/* Personaje Pou Animado */}
              <Animated.View
                style={[
                  styles.pouBodyLarge,
                  {
                    transform: [{ translateY: petBounce }, { scale: heartScale }],
                    backgroundColor:
                      petInfo.effectiveHappiness >= 75
                        ? '#fde68a'
                        : petInfo.effectiveHappiness >= 45
                        ? '#fed7aa'
                        : '#e2e8f0',
                  },
                ]}
              >
                {/* Coronita o Corazón en la cabeza */}
                <View style={[styles.pouTopHat, { backgroundColor: primaryColor }]}>
                  <Ionicons name="heart" size={14} color="#ffffff" />
                </View>

                {/* Ojos expresivos estilo Pou */}
                <View style={styles.pouEyesRow}>
                  <View style={styles.pouEyeWhite}>
                    <View style={styles.pouEyePupil} />
                    <View style={styles.pouEyeSparkle} />
                  </View>
                  <View style={styles.pouEyeWhite}>
                    <View style={styles.pouEyePupil} />
                    <View style={styles.pouEyeSparkle} />
                  </View>
                </View>

                {/* Mejillas sonrojadas */}
                <View style={styles.pouCheeksRow}>
                  <View style={[styles.pouCheek, { backgroundColor: `${primaryColor}55` }]} />
                  <View style={[styles.pouCheek, { backgroundColor: `${primaryColor}55` }]} />
                </View>

                {/* Boca según nivel de felicidad */}
                {petInfo.effectiveHappiness >= 50 ? (
                  <View style={styles.pouSmileHappy} />
                ) : (
                  <View style={styles.pouMouthSad} />
                )}
              </Animated.View>

              {/* Estado de ánimo de la mascota */}
              <Text style={styles.pouMoodComment}>
                {petInfo.effectiveHappiness >= 80
                  ? `¡${petInfo.name} está radiante de amor gracias a sus latidos!`
                  : petInfo.effectiveHappiness >= 50
                  ? `${petInfo.name} está contento, ¡mándense un corazón para darle energía!`
                  : `${petInfo.name} los extraña... ¡envíale un corazón a tu pareja para cuidarlo!`}
              </Text>

              {/* Barra de Felicidad */}
              <View style={styles.pouBarContainer}>
                <View style={styles.pouBarHeader}>
                  <Text style={styles.pouBarLabel}> Amor y Bienestar</Text>
                  <Text style={[styles.pouBarPercent, { color: primaryColor }]}>
                    {petInfo.effectiveHappiness}%
                  </Text>
                </View>
                <View style={styles.pouBarTrack}>
                  <View
                    style={[
                      styles.pouBarFill,
                      {
                        width: `${petInfo.effectiveHappiness}%`,
                        backgroundColor:
                          petInfo.effectiveHappiness >= 50 ? primaryColor : '#f59e0b',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Botón para Mandar Corazón y Alimentar */}
            <TouchableOpacity
              onPress={() => void handleHeartPress()}
              style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.85}
            >
              <Ionicons name="heart" size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}>
                Mandar Corazón a {getDisplayName(currentProfile === 'Karla' ? 'Javier' : 'Karla')} (+25% Amor)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: LEER CARTA DEL DÍA COMPLETA ================= */}
      <Modal
        visible={isLetterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLetterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Carta del Día</Text>
              <TouchableOpacity
                onPress={() => setIsLetterModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.fullLetterText}>“{message?.content}”</Text>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: NOTAS DE VOZ ================= */}
      <Modal
        visible={isVoiceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVoiceModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuestras Notas de Voz</Text>
              <TouchableOpacity
                onPress={() => setIsVoiceModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
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
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: CÁPSULAS DEL TIEMPO ================= */}
      <Modal
        visible={isCapsulesModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCapsulesModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cápsulas del Tiempo</Text>
              <TouchableOpacity
                onPress={() => setIsCapsulesModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
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
          </View>
        </View>
      </Modal>

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

            <View style={[styles.monitoShowcase, { backgroundColor: `${primaryColor}0d` }]}>
              <MoodMascot feeling={tempFeeling} size="lg" accentColor={primaryColor} />
            </View>

            <View style={styles.feelingsGrid}>
              {PRESET_FEELINGS.map((item) => {
                const selected = tempFeeling === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setTempFeeling(item.id)}
                    style={[
                      styles.feelingOptionBtn,
                      selected && {
                        backgroundColor: `${primaryColor}18`,
                        borderColor: primaryColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.feelingOptionLabel,
                        selected && { color: primaryColor, fontWeight: '800' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>Mensaje de cómo te sientes</Text>
            <TextInput
              value={tempStatus}
              onChangeText={setTempStatus}
              placeholder="Ej. Feliz y pensando en ti..."
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
            />

            <TouchableOpacity
              onPress={() => void handleSaveMood()}
              style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Guardar mi Estado</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL: EDITAR PRÓXIMA CITA ================= */}
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
              <Text style={styles.modalTitle}>Próxima Cita Especial</Text>
              <TouchableOpacity
                onPress={() => setIsNextEventModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nombre del plan o cita</Text>
            <TextInput
              value={tempEventTitle}
              onChangeText={setTempEventTitle}
              placeholder="Ej. Cena de aniversario, Ida al cine..."
              placeholderTextColor="#94a3b8"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Fecha</Text>
            <TouchableOpacity
              onPress={() => setShowEventDatePicker(true)}
              style={styles.dateSelectorBtn}
            >
              <Ionicons name="calendar" size={18} color={primaryColor} />
              <Text style={styles.dateSelectorText}>{formatDisplayDate(tempEventDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleSaveNextEvent()}
              style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Guardar Cita</Text>
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
  bentoViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  readMoreHint: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  heartColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  heartButtonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  feedbackText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoHalfCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    justifyContent: 'space-between',
  },
  bentoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  bentoBigNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  bentoUnitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  bentoSubText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  bentoEventTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  bentoEventBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  daysLeftMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  daysLeftMiniText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  moodSectionWrap: {
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
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
  moodBentoCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  moodBentoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  moodPersonName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  feelingChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  feelingChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  moodStatusMessage: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  bottomDockRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 9,
    borderWidth: 1,
  },
  dockIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  dockSub: {
    fontSize: 10,
    color: '#64748b',
  },
  pouMiniAvatar: {
    width: 30,
    height: 28,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1.5,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pouMiniEyesRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  pouMiniEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1e293b',
  },
  pouMiniSmile: {
    width: 8,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 1.5,
    borderColor: '#1e293b',
    marginTop: 2,
  },
  pouRoomCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pouStatsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  pouBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pouBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  pouBodyLarge: {
    width: 112,
    height: 100,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    borderWidth: 3,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    position: 'relative',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  pouTopHat: {
    position: 'absolute',
    top: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pouEyesRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 6,
  },
  pouEyeWhite: {
    width: 22,
    height: 24,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pouEyePupil: {
    width: 10,
    height: 11,
    borderRadius: 5,
    backgroundColor: '#0f172a',
  },
  pouEyeSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  pouCheeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 76,
    marginTop: 2,
  },
  pouCheek: {
    width: 14,
    height: 7,
    borderRadius: 4,
  },
  pouSmileHappy: {
    width: 24,
    height: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: '#1e293b',
    backgroundColor: '#f43f5e',
    marginTop: 2,
  },
  pouMouthSad: {
    width: 18,
    height: 8,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: '#475569',
    marginTop: 4,
  },
  pouMoodComment: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  pouBarContainer: {
    width: '100%',
  },
  pouBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pouBarLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  pouBarPercent: {
    fontSize: 11,
    fontWeight: '900',
  },
  pouBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  pouBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLetterText: {
    fontSize: 17,
    lineHeight: 26,
    color: '#1e293b',
    fontFamily: SERIF_FONT,
    marginVertical: 10,
  },
  monitoShowcase: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    marginBottom: 12,
  },
  feelingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  feelingOptionBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  feelingOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 10,
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
    marginBottom: 12,
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

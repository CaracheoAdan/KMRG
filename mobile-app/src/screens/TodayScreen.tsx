import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { ThemePalette } from '../theme/designSystem';
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
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../components/ui/Icon';
import { FadeSection, PressableScale, HeartbeatButton } from '../components/ui/Kit';
import { Message, HomeState, UserProfile } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { Milestone } from '../types';
import { HeartbeatHeatmap } from '../components/HeartbeatHeatmap';
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
  getCachedMilestones,
} from '../services/StorageService';
import {
  syncSupabaseMessages,
  sendSupabaseInteraction,
  markSupabaseMessageRead,
  pruneOldInteractions,
} from '../services/SupabaseService';
import {
  registerDevicePushToken,
  sendPartnerPushNotification,
} from '../services/NotificationService';
import {
  getHomeState,
  saveHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import {
  syncWidgetData,
  notifyHeartbeatInWidget,
  clearHeartbeatInWidget,
} from '../services/WidgetSyncService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

export const TodayScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { profile, getDisplayName, getAvatarUri } = useProfile();
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
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const startAnniv = new Date(`${homeState.anniversaryDate || '2026-06-18'}T00:00:00`);
  const diffAnnivMs = Math.max(0, Date.now() - startAnniv.getTime());
  const daysTogether = Math.floor(diffAnnivMs / (1000 * 60 * 60 * 24));
  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [petNameDraft, setPetNameDraft] = useState('Pochito');
  const [isEditingPetName, setIsEditingPetName] = useState(false);

  useEffect(() => {
    void getCachedMilestones().then((m) => {
      if (m) setMilestones(m);
    });
  }, []);

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
      await syncSupabaseMessages(currentProfile);
    } catch {
      // Continuar con caché
    }

    const [todayMsg, syncedHome] = await Promise.all([
      getTodayMessage(currentProfile),
      getHomeState(),
    ]);

    setMessage(todayMsg);
    setHomeState(syncedHome);

    // Registrar y sincronizar automáticamente el Push Token para notificaciones remotas
    void registerDevicePushToken().then((token) => {
      if (token && syncedHome.pushTokens?.[currentProfile] !== token) {
        const nextHome: HomeState = {
          ...syncedHome,
          pushTokens: {
            ...(syncedHome.pushTokens || {}),
            [currentProfile]: token,
          },
        };
        setHomeState(nextHome);
        void saveHomeState(currentProfile, nextHome);
      }
    });

    // Poda periódica en segundo plano para mantener la BD ligera
    void pruneOldInteractions();

    if (todayMsg && !todayMsg.is_read) {
      await markMessageAsRead(todayMsg.id);
      void markSupabaseMessageRead(todayMsg.id);
    }

    // Sincronizar datos automáticamente con los Widgets de la pantalla de inicio
    try {
      const start = new Date(`${syncedHome.anniversaryDate}T00:00:00`);
      const diffMs = Math.max(0, Date.now() - start.getTime());
      const daysTogether = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const partnerRole: 'Javier' | 'Karla' = currentProfile === 'Karla' ? 'Javier' : 'Karla';
      const partnerDisplayName = getDisplayName(partnerRole);

      // El widget muestra exclusivamente la NOTITA que le dejó su pareja (carta del día o stickyNote)
      // NUNCA consume el estado de ánimo (mood)
      let partnerNote = '';
      if (todayMsg && todayMsg.sender === partnerRole && todayMsg.content?.trim()) {
        partnerNote = todayMsg.content.trim();
      } else if (
        syncedHome.stickyNote &&
        syncedHome.stickyNote.author === partnerRole &&
        syncedHome.stickyNote.text?.trim()
      ) {
        partnerNote = syncedHome.stickyNote.text.trim();
      }

      const todayStr = toLocalDateString(new Date());
      const isStreakActive = syncedHome.lastInteractionDate === todayStr;

      void syncWidgetData({
        daysTogether,
        anniversaryDate: syncedHome.anniversaryDate,
        noteText: partnerNote,
        noteSender: partnerNote ? partnerDisplayName : '',
        nextEventTitle: syncedHome.nextEventTitle || '',
        nextEventDate: syncedHome.nextEventDate || '',
        accentColor: primaryColor,
        streakActive: isStreakActive,
      });
    } catch {
      // Ignorar si el widget no está activo
    }

    setLoading(false);
  }, [currentProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    void loadData();

    // 1. Canal de interacciones y estado general
    const channel = supabase
      .channel('kmrg-live-interactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          const newInteraction = payload.new;
          if (!newInteraction) return;

          if (newInteraction.type === 'sync_home_state' && newInteraction.payload) {
            const incomingHome = newInteraction.payload as Partial<HomeState>;
            setHomeState((prev) => ({ ...prev, ...incomingHome }));

            const partnerRole: 'Javier' | 'Karla' = currentProfile === 'Karla' ? 'Javier' : 'Karla';
            const partnerDisplayName = getDisplayName(partnerRole);

            // Sincronizar en vivo el widget SOLO si la pareja actualizó su NOTITA real (NUNCA el estado de ánimo)
            let partnerNote: string | undefined = undefined;
            if (incomingHome.stickyNote && incomingHome.stickyNote.author === partnerRole) {
              const text = (incomingHome.stickyNote.text || '').trim();
              if (text) {
                partnerNote = text;
              }
            }

            void syncWidgetData({
              ...(partnerNote !== undefined ? {
                noteText: partnerNote,
                noteSender: partnerNote ? partnerDisplayName : '',
              } : {}),
              ...(incomingHome.nextEventDate !== undefined ? { nextEventDate: incomingHome.nextEventDate } : {}),
              ...(incomingHome.nextEventTitle !== undefined ? { nextEventTitle: incomingHome.nextEventTitle } : {}),
            });
            return;
          }

          if (
            newInteraction.type === 'thinking_of_you' &&
            newInteraction.sender !== currentProfile
          ) {
            const senderName = newInteraction.sender === 'Javier' ? 'Javier' : 'Karlita';
            void notifyHeartbeatInWidget(senderName);
            Alert.alert(
              'Pensando en ti',
              `${senderName} acaba de enviarte un latido desde su corazón.`
            );
          }
        }
      )
      .subscribe();

    // 2. Canal de cartas/notitas del día en vivo: actualizar el widget inmediatamente al recibir una carta
    const msgChannel = supabase
      .channel('kmrg-live-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMsg = payload.new;
          if (!newMsg) return;
          const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';
          const partnerDisplayName = getDisplayName(partnerRole);
          const todayStr = toLocalDateString(new Date());

          if (newMsg.sender === partnerRole && toLocalDateString(newMsg.scheduled_date) <= todayStr) {
            setMessage(newMsg);
            const cleanText = (newMsg.content || '').trim();
            void syncWidgetData({
              noteText: cleanText,
              noteSender: cleanText ? partnerDisplayName : '',
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(msgChannel);
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

  // Ticker de fecha actual del dispositivo (recalcula al volver de segundo plano y a medianoche)
  const [currentDateTick, setCurrentDateTick] = useState(() => toLocalDateString(new Date()));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setCurrentDateTick(toLocalDateString(new Date()));
        void loadData();
      }
    });

    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const msToMidnight = Math.max(1000, midnight.getTime() - now.getTime());
    const timer = setTimeout(() => {
      setCurrentDateTick(toLocalDateString(new Date()));
      void loadData();
    }, msToMidnight);

    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [loadData]);

  // Cuenta regresiva a próxima cita calculada desde medianoche de hoy
  const daysUntilNextEvent = useMemo(() => {
    if (!homeState.nextEventDate || !homeState.nextEventDate.trim()) return null;
    const parts = homeState.nextEventDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [y, m, d] = parts;
    const target = new Date(y, m - 1, d, 0, 0, 0);
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [homeState.nextEventDate, currentDateTick]);

  const hasValidNextEvent = daysUntilNextEvent !== null;

  // Mascota de pareja (estilo Pou: se mantiene feliz, seria o triste según los corazones recibidos)
  const petInfo = useMemo(() => {
    const rawPet = homeState.couplePet || DEFAULT_HOME_STATE.couplePet!;
    const lastFedMs = new Date(rawPet.lastFedAt || Date.now()).getTime();
    const hoursSinceFed = Math.max(0, (Date.now() - lastFedMs) / (1000 * 60 * 60));
    const decay = Math.floor(hoursSinceFed * 2);
    const effectiveHappiness = Math.max(15, Math.min(100, (rawPet.happiness ?? 92) - decay));

    // Tres estados emocionales según su amor:
    // - Feliz: felicidad >= 65
    // - Seria: 35 <= felicidad < 65
    // - Triste: felicidad < 35
    const mood: 'feliz' | 'seria' | 'triste' =
      effectiveHappiness >= 65
        ? 'feliz'
        : effectiveHappiness >= 35
        ? 'seria'
        : 'triste';

    const heartsKarla = Number(rawPet.heartsFedKarla ?? 0);
    const heartsJavier = Number(rawPet.heartsFedJavier ?? 0);
    const totalFed = Math.max(rawPet.heartsFedTotal || 0, heartsKarla + heartsJavier);

    let leader: 'Karla' | 'Javier' | 'Empate' = 'Empate';
    if (heartsKarla > heartsJavier) leader = 'Karla';
    else if (heartsJavier > heartsKarla) leader = 'Javier';

    const diffHearts = Math.abs(heartsKarla - heartsJavier);
    const sumHearts = heartsKarla + heartsJavier;
    const karlaPercent = sumHearts > 0 ? Math.round((heartsKarla / sumHearts) * 100) : 50;
    const javierPercent = sumHearts > 0 ? Math.round((heartsJavier / sumHearts) * 100) : 50;

    return {
      ...rawPet,
      effectiveHappiness,
      mood,
      heartsFedTotal: totalFed,
      heartsFedKarla: heartsKarla,
      heartsFedJavier: heartsJavier,
      leader,
      diffHearts,
      karlaPercent,
      javierPercent,
    };
  }, [homeState.couplePet]);

  const handleSavePetName = async () => {
    const clean = petNameDraft.trim() || 'Pochito';
    const nextHome: HomeState = {
      ...homeState,
      couplePet: {
        name: clean,
        happiness: petInfo.happiness,
        xp: petInfo.xp,
        level: petInfo.level,
        heartsFedTotal: petInfo.heartsFedTotal,
        heartsFedKarla: petInfo.heartsFedKarla,
        heartsFedJavier: petInfo.heartsFedJavier,
        lastFedAt: petInfo.lastFedAt,
        lastFedBy: petInfo.lastFedBy,
        accessory: petInfo.accessory || 'none',
        unlockedAccessories: petInfo.unlockedAccessories || ['none'],
      },
    };
    setHomeState(nextHome);
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
    const currentKarla = Number(petInfo.heartsFedKarla || 0);
    const currentJavier = Number(petInfo.heartsFedJavier || 0);
    const nextKarla = currentProfile === 'Karla' ? currentKarla + 1 : currentKarla;
    const nextJavier = currentProfile === 'Javier' ? currentJavier + 1 : currentJavier;
    const nextTotal = (petInfo.heartsFedTotal || 0) + 1;

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
        heartsFedTotal: nextTotal,
        heartsFedKarla: nextKarla,
        heartsFedJavier: nextJavier,
        lastFedAt: new Date().toISOString(),
        lastFedBy: currentProfile,
        accessory: petInfo.accessory || 'none',
        unlockedAccessories: petInfo.unlockedAccessories || ['none'],
      },
    };
    void updateAndSyncHome(nextHome);

    const recipientRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';
    const recipientLabel = getDisplayName(recipientRole);
    const result = await sendSupabaseInteraction(currentProfile, 'thinking_of_you', {
      message_id: message?.id || null,
      timestamp: new Date().toISOString(),
    });

    const recipientPushToken = homeState.pushTokens?.[recipientRole];
    if (recipientPushToken) {
      void sendPartnerPushNotification(
        recipientPushToken,
        'KMRG ❤️ Latido de Amor',
        `¡${getDisplayName(currentProfile)} está pensando en ti en este momento!`,
        { type: 'HEARTBEAT', sender: currentProfile }
      );
    }
    void clearHeartbeatInWidget();
    void syncWidgetData({
      streakActive: true,
      accentColor: primaryColor,
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
    const title = tempEventTitle.trim();
    if (!title) return;
    await updateAndSyncHome({
      ...homeState,
      nextEventTitle: title,
      nextEventDate: tempEventDate,
    });
    void syncWidgetData({
      nextEventTitle: title,
      nextEventDate: tempEventDate,
    });
    setIsNextEventModalOpen(false);
  };

  const handleClearNextEvent = async () => {
    await updateAndSyncHome({
      ...homeState,
      nextEventTitle: '',
      nextEventDate: '',
    });
    void syncWidgetData({
      nextEventTitle: '',
      nextEventDate: '',
    });
    setIsNextEventModalOpen(false);
  };


  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const NEGATIVE_FEELINGS = ['triste', 'enojado', 'cansado'];
  const POSITIVE_FEELINGS = ['feliz', 'enamorado', 'divertido', 'tranquilo'];
  const POSITIVE_TEXT = /(feliz|content|alegr|ganas de verte|enamorad|genial|emocionad|de maravilla)/i;
  const NEGATIVE_TEXT = /(triste|enoj|molest|frustrad|agotad|estres|mal día|deprim)/i;
  const hasMoodMismatch = (feeling: string, status?: string) => {
    if (!status) return false;
    if (NEGATIVE_FEELINGS.includes(feeling) && POSITIVE_TEXT.test(status)) return true;
    if (POSITIVE_FEELINGS.includes(feeling) && NEGATIVE_TEXT.test(status)) return true;
    return false;
  };

  const partnerRoleForLabel = currentProfile === 'Karla' ? 'Javier' : 'Karla';
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      {/* Contenedor Fijo SIN Scroll Vertical (flex: 1 entre header y barra inferior) */}
      <View style={styles.fixedRootContainer}>
        {/* 1. CARTA DEL DÍA (flex 2.2) */}
        <FadeSection index={0} style={styles.sectionHero}>
          <LinearGradient
            colors={[colors.primaryLight, colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dsHero}
          >
            <Text style={[styles.dsQuoteMark, { color: colors.primary }]} pointerEvents="none">
              “
            </Text>

            <View style={styles.heroTopRow}>
              <View style={[styles.dsBadge, { backgroundColor: colors.surface }]}>
                <Ionicons name="sparkles" size={13} color={colors.primary} />
                <Text
                  style={[styles.dsBadgeText, { color: colors.primary }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {currentProfile === 'Karla'
                    ? `Para ti, ${getDisplayName(currentProfile)}`
                    : 'Carta del día'}
                </Text>
              </View>
              <Text style={styles.dsDate} maxFontSizeMultiplier={1.2}>
                {formatDisplayDate(new Date(), { day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <View style={styles.heroBodyRow}>
              <TouchableOpacity
                onPress={() => message && setIsLetterModalOpen(true)}
                activeOpacity={0.85}
                style={styles.dsLetterTouch}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text
                      style={styles.dsLetterText}
                      numberOfLines={3}
                      adjustsFontSizeToFit
                      minimumFontScale={0.72}
                      maxFontSizeMultiplier={1.2}
                    >
                      “{message
                        ? message.content
                        : currentProfile === 'Karla'
                        ? 'Cada instante de mi día estás en mi mente y en mi corazón, mi vida.'
                        : `Programa una carta sorpresa para ${getDisplayName('Karla')} desde la pestaña Escribir.`}”
                    </Text>
                    {message && message.content.length > 120 && (
                      <Text
                        style={[styles.readMoreHint, { color: colors.primary }]}
                        maxFontSizeMultiplier={1.2}
                      >
                        Toca para leer completa 💌
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.heartButtonWrapper}>
                <HeartbeatButton
                  onPress={() => void handleHeartPress()}
                  disabled={sendingInteraction}
                  size={46}
                />
              </View>
            </View>

            {interactionFeedback && (
              <Animated.View style={[styles.feedbackPill, { opacity: feedbackOpacity }]}>
                <Ionicons name="heart" size={13} color={colors.primary} />
                <Text
                  style={[styles.feedbackText, { color: colors.primary }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                >
                  {interactionFeedback.text}
                </Text>
              </Animated.View>
            )}
          </LinearGradient>
        </FadeSection>

        {/* 2. TIEMPO JUNTOS + PRÓXIMA CITA (flex 1.5) */}
        <FadeSection index={1} style={styles.sectionRowHalf}>
          <PressableScale
            onPress={() => setShowAnniversaryPicker(true)}
            style={styles.dsCard}
            accessibilityLabel="Cambiar fecha de aniversario"
          >
            <View style={styles.dsCardHeader}>
              <View style={[styles.dsIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="infinite" size={15} color={colors.primary} />
              </View>
              <Text style={styles.dsCardLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                TIEMPO JUNTOS
              </Text>
            </View>

            <View style={styles.daysNumberRow}>
              <Text
                style={[styles.dsBigNumber, { color: colors.primary }]}
                maxFontSizeMultiplier={1.2}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {timeTogether.totalDays}
              </Text>
              <Text style={styles.dsBigUnit} maxFontSizeMultiplier={1.2}>
                días
              </Text>
            </View>

            <View style={styles.dsChipsRow}>
              {[
                timeTogether.years > 0 ? plural(timeTogether.years, 'año', 'años') : null,
                timeTogether.months > 0 ? plural(timeTogether.months, 'mes', 'meses') : null,
                timeTogether.days > 0 ? plural(timeTogether.days, 'día', 'días') : null,
              ]
                .filter(Boolean)
                .map((txt) => (
                  <View key={txt!} style={[styles.dsMiniChip, { backgroundColor: colors.primaryLight }]}>
                    <Text
                      style={[styles.dsMiniChipText, { color: colors.primary }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                    >
                      {txt}
                    </Text>
                  </View>
                ))}
            </View>
          </PressableScale>

          <PressableScale
            onPress={() => {
              setTempEventTitle(homeState.nextEventTitle || '');
              setTempEventDate(hasValidNextEvent ? homeState.nextEventDate : toLocalDateString(new Date()));
              setIsNextEventModalOpen(true);
            }}
            style={styles.dsCard}
            accessibilityLabel="Editar próxima cita"
          >
            <View style={styles.dsCardHeader}>
              <View style={[styles.dsIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="calendar" size={15} color={colors.primary} />
              </View>
              <Text style={styles.dsCardLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                PRÓXIMA CITA
              </Text>
            </View>

            <Text
              style={styles.dsEventTitle}
              numberOfLines={2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
            >
              {hasValidNextEvent ? (homeState.nextEventTitle || 'Cita especial') : 'Sin citas programadas'}
            </Text>

            <View style={styles.eventBottomRow}>
              <Text style={styles.dsEventDate} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {hasValidNextEvent
                  ? formatDisplayDate(homeState.nextEventDate, { day: 'numeric', month: 'short' })
                  : 'Toca para agendar'}
              </Text>
              {hasValidNextEvent && daysUntilNextEvent !== null && (
                <View style={[styles.dsCountdownPill, { backgroundColor: colors.primary }]}>
                  <Text
                    style={[styles.dsCountdownText, { color: colors.primaryOn }]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    {daysUntilNextEvent === 0
                      ? '¡Es hoy!'
                      : `Faltan ${plural(daysUntilNextEvent, 'día', 'días')}`}
                  </Text>
                </View>
              )}
            </View>
          </PressableScale>
        </FadeSection>

        {/* 3. NUESTRO ESTADO HOY (flex 2) */}
        <FadeSection index={2} style={styles.sectionMoodBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.dsSectionTitle} maxFontSizeMultiplier={1.2}>
              Nuestro estado hoy
            </Text>
            <PressableScale onPress={openMyMoodEditor} style={styles.dsLinkBtn} scaleTo={0.94}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text
                style={[styles.dsLinkText, { color: colors.primary }]}
                maxFontSizeMultiplier={1.2}
              >
                Cambiar mi estado
              </Text>
            </PressableScale>
          </View>

          <View style={styles.moodCardsRow}>
            {(['Karla', 'Javier'] as const).map((person) => {
              const m = homeState.moods[person];
              const isMe = currentProfile === person;
              const feelingType = resolveFeelingType(m?.feeling, m?.emoji, m?.status);
              const feelingObj = PRESET_FEELINGS.find((f) => f.id === feelingType);
              const mismatch = hasMoodMismatch(feelingType, m?.status);

              return (
                <PressableScale
                  key={person}
                  onPress={isMe ? openMyMoodEditor : undefined}
                  disabled={!isMe}
                  scaleTo={0.97}
                  style={[
                    styles.dsCard,
                    { flex: 1 },
                    isMe && { borderWidth: 1.5, borderColor: colors.primary },
                  ]}
                >
                  <View style={styles.moodBentoTop}>
                    <MoodMascot feeling={feelingType} size="sm" accentColor={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        {getAvatarUri(person) && (
                          <Image
                            source={{ uri: getAvatarUri(person)! }}
                            style={{ width: 18, height: 18, borderRadius: 9 }}
                          />
                        )}
                        <Text
                          style={styles.moodPersonName}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                        >
                          {getDisplayName(person)}
                        </Text>
                      </View>
                      <View style={[styles.feelingChip, { backgroundColor: colors.primaryLight }]}>
                        <Text
                          style={[styles.feelingChipText, { color: colors.primary }]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                        >
                          {feelingObj?.label || 'Feliz'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text
                    style={styles.moodStatusMessage}
                    numberOfLines={3}
                    maxFontSizeMultiplier={1.2}
                  >
                    {m?.status || 'Pensando en ti'}
                  </Text>

                  {mismatch && (
                    <View style={[styles.mismatchBox, { backgroundColor: colors.surfaceAlt }]}>
                      <Ionicons name="information-circle-outline" size={13} color={colors.warning} />
                      <Text
                        style={[styles.mismatchText, { color: colors.warning }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        maxFontSizeMultiplier={1.2}
                      >
                        Ánimo y mensaje no coinciden
                      </Text>
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </FadeSection>

        {/* 4. NUESTRA MASCOTA (ACCESO PRINCIPAL) */}
        <FadeSection index={3} style={styles.sectionQuickRow}>
          <PressableScale
            onPress={() => {
              setPetNameDraft(petInfo.name || 'Pochito');
              setIsEditingPetName(false);
              setIsPetModalOpen(true);
            }}
            style={styles.dsPetCardHorizontal}
            accessibilityLabel={petInfo.name || 'Pochito'}
          >
            <View
              style={[
                styles.dsQuickIcon,
                {
                  backgroundColor:
                    petInfo.mood === 'feliz'
                      ? '#fde68a'
                      : petInfo.mood === 'seria'
                      ? '#fed7aa'
                      : '#e2e8f0',
                  borderColor:
                    petInfo.mood === 'feliz'
                      ? '#f59e0b'
                      : petInfo.mood === 'seria'
                      ? '#fb923c'
                      : '#94a3b8',
                  borderWidth: 1.5,
                  marginRight: 12,
                  marginBottom: 0,
                },
              ]}
            >
              <View style={styles.pouMiniAvatarUnified}>
                <View style={styles.pouMiniEyesRow}>
                  <View style={styles.pouMiniEye} />
                  <View style={styles.pouMiniEye} />
                </View>
                {petInfo.mood === 'feliz' && <View style={styles.pouMiniSmile} />}
                {petInfo.mood === 'seria' && <View style={styles.pouMiniSerious} />}
                {petInfo.mood === 'triste' && <View style={styles.pouMiniSad} />}
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.dsQuickTitle} numberOfLines={1}>
                  {petInfo.name || 'Pochito'}
                </Text>
                <View
                  style={[
                    styles.petLevelTag,
                    {
                      backgroundColor:
                        petInfo.mood === 'feliz'
                          ? '#ecfdf5'
                          : petInfo.mood === 'seria'
                          ? '#fffbeb'
                          : '#f1f5f9',
                      borderColor:
                        petInfo.mood === 'feliz'
                          ? '#a7f3d0'
                          : petInfo.mood === 'seria'
                          ? '#fde68a'
                          : '#cbd5e1',
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.petLevelTagText,
                      {
                        color:
                          petInfo.mood === 'feliz'
                            ? '#059669'
                            : petInfo.mood === 'seria'
                            ? '#b45309'
                            : '#475569',
                      },
                    ]}
                  >
                    {petInfo.mood === 'feliz' ? '😊 Feliz' : petInfo.mood === 'seria' ? '😐 Serio' : '🥺 Triste'}
                  </Text>
                </View>
                <View style={[styles.petLevelTag, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.petLevelTagText, { color: colors.primary }]}>Nv. {petInfo.level}</Text>
                </View>
              </View>
              <Text style={styles.dsQuickSub} numberOfLines={1}>
                {petInfo.leader === 'Empate'
                  ? `Amor parejo (${petInfo.heartsFedKarla} 💕 c/u) · ${petInfo.effectiveHappiness}% de amor`
                  : `👑 Más mimado por ${petInfo.leader === 'Karla' ? 'Karlita' : 'Javier'} (${
                      petInfo.leader === 'Karla' ? petInfo.heartsFedKarla : petInfo.heartsFedJavier
                    } 💕) · ${petInfo.effectiveHappiness}% de amor`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressableScale>
        </FadeSection>
      </View>

      {/* ================= MODAL: MASCOTA DE PAREJA (ESTILO POU) ================= */}
      <Modal
        visible={isPetModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPetModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={styles.modalSubtitle}>
                Nuestra mascota de pareja • Se alimenta cada vez que se mandan un corazón
              </Text>

              {/* Habitación de la Mascota tipo Pou */}
              <View
                style={[
                  styles.pouRoomCard,
                  {
                    backgroundColor:
                      petInfo.mood === 'feliz'
                        ? `${primaryColor}10`
                        : petInfo.mood === 'seria'
                        ? '#fffbeb'
                        : '#f1f5f9',
                  },
                ]}
              >
                <View style={styles.pouStatsTopRow}>
                  <View style={[styles.pouBadgePill, { backgroundColor: '#ffffff' }]}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.pouBadgeText}>Nivel {petInfo.level}</Text>
                  </View>
                  <View
                    style={[
                      styles.pouBadgePill,
                      {
                        backgroundColor:
                          petInfo.mood === 'feliz'
                            ? '#ecfdf5'
                            : petInfo.mood === 'seria'
                            ? '#fffbeb'
                            : '#f8fafc',
                        borderColor:
                          petInfo.mood === 'feliz'
                            ? '#a7f3d0'
                            : petInfo.mood === 'seria'
                            ? '#fde68a'
                            : '#cbd5e1',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pouBadgeText,
                        {
                          color:
                            petInfo.mood === 'feliz'
                              ? '#059669'
                              : petInfo.mood === 'seria'
                              ? '#b45309'
                              : '#475569',
                        },
                      ]}
                    >
                      {petInfo.mood === 'feliz'
                        ? '😊 ¡Feliz!'
                        : petInfo.mood === 'seria'
                        ? '😐 Serio'
                        : '🥺 Triste'}
                    </Text>
                  </View>
                  <View style={[styles.pouBadgePill, { backgroundColor: '#ffffff' }]}>
                    <Ionicons name="heart" size={12} color={primaryColor} />
                    <Text style={styles.pouBadgeText}>
                      {petInfo.heartsFedTotal} corazones
                    </Text>
                  </View>
                </View>

                {/* Personaje Pou Animado con 3 estados: Feliz, Serio, Triste */}
                <Animated.View
                  style={[
                    styles.pouBodyLarge,
                    {
                      transform: [{ translateY: petBounce }, { scale: heartScale }],
                      backgroundColor:
                        petInfo.mood === 'feliz'
                          ? '#fde68a'
                          : petInfo.mood === 'seria'
                          ? '#fed7aa'
                          : '#e2e8f0',
                      borderColor:
                        petInfo.mood === 'feliz'
                          ? '#d97706'
                          : petInfo.mood === 'seria'
                          ? '#ea580c'
                          : '#64748b',
                      shadowColor:
                        petInfo.mood === 'feliz'
                          ? '#d97706'
                          : petInfo.mood === 'seria'
                          ? '#ea580c'
                          : '#64748b',
                    },
                  ]}
                >
                  {/* Accesorios de Pochito 2.0 */}
                  {petInfo.accessory === 'crown' && (
                    <View style={[styles.pouTopHat, { backgroundColor: '#f59e0b' }]}>
                      <Text style={{ fontSize: 18 }}>👑</Text>
                    </View>
                  )}
                  {petInfo.accessory === 'party_hat' && (
                    <View style={[styles.pouTopHat, { backgroundColor: primaryColor }]}>
                      <Text style={{ fontSize: 18 }}>🥳</Text>
                    </View>
                  )}
                  {petInfo.accessory === 'flower' && (
                    <View style={[styles.pouTopHat, { backgroundColor: '#ec4899', right: 10 }]}>
                      <Text style={{ fontSize: 18 }}>🌸</Text>
                    </View>
                  )}
                  {petInfo.accessory === 'sunglasses' && (
                    <View style={[styles.pouTopHat, { top: 35, backgroundColor: 'transparent' }]}>
                      <Text style={{ fontSize: 24 }}>🕶️</Text>
                    </View>
                  )}
                  {(!petInfo.accessory || petInfo.accessory === 'none') && (
                    <View style={[styles.pouTopHat, { backgroundColor: primaryColor }]}>
                      <Ionicons name="heart" size={14} color="#ffffff" />
                    </View>
                  )}

                  {/* Ojos expresivos estilo Pou */}
                  <View style={styles.pouEyesRow}>
                    <View style={styles.pouEyeWhite}>
                      <View
                        style={[
                          styles.pouEyePupil,
                          petInfo.mood === 'seria' && styles.pouEyePupilSerious,
                          petInfo.mood === 'triste' && styles.pouEyePupilSad,
                        ]}
                      />
                      {petInfo.mood === 'feliz' && <View style={styles.pouEyeSparkle} />}
                      {petInfo.mood === 'triste' && (
                        <View style={styles.pouTeardrop}>
                          <Ionicons name="water" size={11} color="#38bdf8" />
                        </View>
                      )}
                    </View>
                    <View style={styles.pouEyeWhite}>
                      <View
                        style={[
                          styles.pouEyePupil,
                          petInfo.mood === 'seria' && styles.pouEyePupilSerious,
                          petInfo.mood === 'triste' && styles.pouEyePupilSad,
                        ]}
                      />
                      {petInfo.mood === 'feliz' && <View style={styles.pouEyeSparkle} />}
                    </View>
                  </View>

                  {/* Mejillas sonrojadas según estado de ánimo */}
                  <View style={styles.pouCheeksRow}>
                    <View
                      style={[
                        styles.pouCheek,
                        {
                          backgroundColor:
                            petInfo.mood === 'feliz'
                              ? `${primaryColor}55`
                              : petInfo.mood === 'seria'
                              ? '#ea580c25'
                              : '#94a3b825',
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.pouCheek,
                        {
                          backgroundColor:
                            petInfo.mood === 'feliz'
                              ? `${primaryColor}55`
                              : petInfo.mood === 'seria'
                              ? '#ea580c25'
                              : '#94a3b825',
                        },
                      ]}
                    />
                  </View>

                  {/* Boca según nivel de felicidad (Feliz, Serio o Triste) */}
                  {petInfo.mood === 'feliz' && <View style={styles.pouSmileHappy} />}
                  {petInfo.mood === 'seria' && <View style={styles.pouMouthSerious} />}
                  {petInfo.mood === 'triste' && <View style={styles.pouMouthSad} />}
                </Animated.View>

                {/* Estado de ánimo de la mascota */}
                <Text style={styles.pouMoodComment}>
                  {petInfo.mood === 'feliz'
                    ? `¡${petInfo.name} está súper feliz y rebosante de amor! Brinca de alegría cada vez que se mandan corazones.`
                    : petInfo.mood === 'seria'
                    ? `${petInfo.name} está serio y pensativo... Necesita cariñitos para volver a sonreír.`
                    : `${petInfo.name} está triste y los extraña mucho... ¡Mándense un corazón ahora para devolverle el ánimo!`}
                </Text>

                {/* Barra de Felicidad */}
                <View style={styles.pouBarContainer}>
                  <View style={styles.pouBarHeader}>
                    <Text style={styles.pouBarLabel}>Amor y Bienestar</Text>
                    <Text
                      style={[
                        styles.pouBarPercent,
                        {
                          color:
                            petInfo.mood === 'feliz'
                              ? '#10b981'
                              : petInfo.mood === 'seria'
                              ? '#f59e0b'
                              : '#64748b',
                        },
                      ]}
                    >
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
                            petInfo.mood === 'feliz'
                              ? '#10b981'
                              : petInfo.mood === 'seria'
                              ? '#f59e0b'
                              : '#64748b',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Conexión Semanal */}
                <HeartbeatHeatmap
                  streakCount={homeState.streakCount || 1}
                  lastInteractionDate={homeState.lastInteractionDate}
                  primaryColor={primaryColor}
                />
              </View>

              {/* RANKING DE AMOR: ¿Quién le da más corazones a la mascota? */}
              <View style={styles.petLoveLeaderCard}>
                <View style={styles.petLoveLeaderHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16 }}>👑</Text>
                    <Text style={styles.petLoveLeaderTitle}>¿Quién da más amor a {petInfo.name}?</Text>
                  </View>
                  <View
                    style={[
                      styles.petLeaderBadge,
                      {
                        backgroundColor:
                          petInfo.leader === 'Karla'
                            ? '#ffe4e6'
                            : petInfo.leader === 'Javier'
                            ? '#e0f2fe'
                            : '#f3e8ff',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.petLeaderBadgeText,
                        {
                          color:
                            petInfo.leader === 'Karla'
                              ? '#e11d48'
                              : petInfo.leader === 'Javier'
                              ? '#0284c7'
                              : '#9333ea',
                        },
                      ]}
                    >
                      {petInfo.leader === 'Empate'
                        ? '🤝 ¡Amor sincronizado!'
                        : petInfo.leader === 'Karla'
                        ? `👑 Karlita va ganando (+${petInfo.diffHearts})`
                        : `👑 Javier va ganando (+${petInfo.diffHearts})`}
                    </Text>
                  </View>
                </View>

                {/* Tarjetas comparativas lado a lado */}
                <View style={styles.petLoveRow}>
                  {/* Karlita */}
                  <View
                    style={[
                      styles.petPartnerCard,
                      petInfo.leader === 'Karla' && styles.petPartnerCardLeader,
                      { borderColor: petInfo.leader === 'Karla' ? '#f43f5e' : '#fecdd3' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={[styles.petPartnerAvatarSmall, { backgroundColor: '#f43f5e' }]}>
                        <Text style={styles.petPartnerAvatarText}>K</Text>
                      </View>
                      <Text style={styles.petPartnerName} numberOfLines={1}>Karlita</Text>
                      {petInfo.leader === 'Karla' && <Text style={{ fontSize: 13 }}>👑</Text>}
                    </View>
                    <Text style={[styles.petPartnerHearts, { color: '#e11d48' }]}>
                      {petInfo.heartsFedKarla} 💕
                    </Text>
                    <Text style={styles.petPartnerPercent}>{petInfo.karlaPercent}% del amor</Text>
                  </View>

                  {/* Javier */}
                  <View
                    style={[
                      styles.petPartnerCard,
                      petInfo.leader === 'Javier' && styles.petPartnerCardLeader,
                      { borderColor: petInfo.leader === 'Javier' ? '#0284c7' : '#bae6fd' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={[styles.petPartnerAvatarSmall, { backgroundColor: '#0284c7' }]}>
                        <Text style={styles.petPartnerAvatarText}>J</Text>
                      </View>
                      <Text style={styles.petPartnerName} numberOfLines={1}>Javier</Text>
                      {petInfo.leader === 'Javier' && <Text style={{ fontSize: 13 }}>👑</Text>}
                    </View>
                    <Text style={[styles.petPartnerHearts, { color: '#0369a1' }]}>
                      {petInfo.heartsFedJavier} 💕
                    </Text>
                    <Text style={styles.petPartnerPercent}>{petInfo.javierPercent}% del amor</Text>
                  </View>
                </View>

                {/* Barra de proporción (Duelo de corazones) */}
                <View style={styles.petRatioTrack}>
                  <View style={[styles.petRatioFillLeft, { width: `${petInfo.karlaPercent}%` }]} />
                  <View style={[styles.petRatioFillRight, { width: `${petInfo.javierPercent}%` }]} />
                </View>
              </View>

              {/* Armario de Pochito */}
              <View style={{ marginTop: 10, marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 8 }}>
                  Armario de {petInfo.name}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {[
                    { id: 'none', label: 'Sin gorro', emoji: '✨', minLvl: 1, minHearts: 0 },
                    { id: 'crown', label: 'Corona Real', emoji: '👑', minLvl: 2, minHearts: 3 },
                    { id: 'flower', label: 'Florecita', emoji: '🌸', minLvl: 3, minHearts: 8 },
                    { id: 'sunglasses', label: 'Gafas Cool', emoji: '🕶️', minLvl: 4, minHearts: 15 },
                    { id: 'party_hat', label: 'Fiesta', emoji: '🥳', minLvl: 5, minHearts: 25 },
                  ].map((item) => {
                    const isUnlocked = petInfo.level >= item.minLvl || (petInfo.heartsFedTotal || 0) >= item.minHearts;
                    const isEquipped = (petInfo.accessory || 'none') === item.id;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => {
                          if (!isUnlocked) {
                            Alert.alert(
                              'Accesorio Bloqueado 🔒',
                              `Para desbloquear ${item.label}, ${petInfo.name} necesita alcanzar el Nivel ${item.minLvl} o recibir ${item.minHearts} corazones.`
                            );
                            return;
                          }
                          const updated: HomeState = {
                            ...homeState,
                            couplePet: {
                              name: petInfo.name || 'Pochito',
                              happiness: petInfo.happiness,
                              xp: petInfo.xp,
                              level: petInfo.level,
                              heartsFedTotal: petInfo.heartsFedTotal,
                              heartsFedKarla: petInfo.heartsFedKarla,
                              heartsFedJavier: petInfo.heartsFedJavier,
                              lastFedAt: petInfo.lastFedAt,
                              lastFedBy: petInfo.lastFedBy,
                              accessory: item.id as any,
                              unlockedAccessories: petInfo.unlockedAccessories || ['none'],
                            },
                          };
                          void updateAndSyncHome(updated);
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 14,
                          backgroundColor: isEquipped ? `${primaryColor}20` : '#f8fafc',
                          borderWidth: 1.5,
                          borderColor: isEquipped ? primaryColor : '#e2e8f0',
                          alignItems: 'center',
                          gap: 2,
                          minWidth: 70,
                          opacity: isUnlocked ? 1 : 0.6,
                        }}
                      >
                        <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: isEquipped ? primaryColor : '#475569' }}>
                          {item.label}
                        </Text>
                        {!isUnlocked && (
                          <Text style={{ fontSize: 8, color: '#94a3b8' }}>Nv.{item.minLvl}</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
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
            </ScrollView>
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

      {/* Selector de Fecha de Aniversario */}
      <DatePickerModal
        visible={showAnniversaryPicker}
        value={homeState.anniversaryDate}
        onSelect={(selected) => {
          void updateAndSyncHome({ ...homeState, anniversaryDate: selected });
          try {
            const start = new Date(`${selected}T00:00:00`);
            const diffMs = Math.max(0, Date.now() - start.getTime());
            const daysTogether = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            void syncWidgetData({ anniversaryDate: selected, daysTogether });
          } catch {
            // Ignorar
          }
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
              maxLength={50}
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

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              {hasValidNextEvent && (
                <TouchableOpacity
                  onPress={() => void handleClearNextEvent()}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: '#fee2e2' }]}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.primaryBtnText, { color: '#ef4444' }]}>Quitar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => void handleSaveNextEvent()}
                style={[styles.primaryBtn, { flex: hasValidNextEvent ? 2 : 1, backgroundColor: primaryColor }]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Guardar Cita</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fixedRootContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionHero: {
    flex: 2.2,
    minHeight: 120,
  },
  sectionRowHalf: {
    flex: 1.5,
    minHeight: 85,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  sectionMoodBlock: {
    flex: 2,
    minHeight: 110,
    justifyContent: 'space-between',
    gap: 6,
  },
  moodCardsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  sectionQuickRow: {
    flex: 1,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  dsHero: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  dsQuoteMark: {
    position: 'absolute',
    top: 4,
    left: 8,
    fontSize: 72,
    fontFamily: SERIF_FONT,
    opacity: 0.16,
    lineHeight: 72,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  dsBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  dsDate: {
    fontSize: 11.5,
    color: c.textMuted,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroBodyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 2,
  },
  dsLetterTouch: {
    flex: 1,
    justifyContent: 'center',
  },
  dsLetterText: {
    fontSize: 22,
    lineHeight: 28,
    color: c.text,
    fontFamily: SERIF_FONT,
    fontWeight: '600',
  },
  readMoreHint: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  heartButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  feedbackText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dsCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: c.surface,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
  },
  dsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dsCardLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.5,
    flex: 1,
  },
  daysNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginVertical: 1,
  },
  dsBigNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
    lineHeight: 30,
  },
  dsBigUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  dsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    alignItems: 'center',
  },
  dsMiniChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dsMiniChipText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  dsEventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
    lineHeight: 18,
    marginVertical: 1,
  },
  eventBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  dsEventDate: {
    fontSize: 11,
    color: c.textMuted,
    textTransform: 'capitalize',
    flex: 1,
  },
  dsCountdownPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dsCountdownText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  dsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  dsLinkText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  moodBentoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  moodPersonName: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  feelingChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    marginTop: 1,
  },
  feelingChipText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  moodStatusMessage: {
    fontSize: 11.5,
    color: c.textSecondary,
    lineHeight: 15,
    marginVertical: 2,
  },
  mismatchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mismatchText: {
    fontSize: 10.5,
    fontWeight: '600',
    flex: 1,
  },
  dsPetCardHorizontal: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  petLevelTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  petLevelTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dsQuickCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dsQuickIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pouMiniAvatarUnified: {
    width: 24,
    height: 22,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderWidth: 1.5,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dsQuickTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
  },
  dsQuickSub: {
    fontSize: 9.5,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: 1,
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
  pouMiniSerious: {
    width: 7,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#1e293b',
    marginTop: 3,
  },
  pouMiniSad: {
    width: 8,
    height: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderTopWidth: 1.5,
    borderColor: '#475569',
    marginTop: 3,
  },
  pouRoomCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: c.border,
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
    borderColor: c.border,
  },
  pouBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.textSecondary,
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
    backgroundColor: c.surface,
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
    backgroundColor: c.surface,
  },
  pouEyePupilSerious: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pouEyePupilSad: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 3,
  },
  pouTeardrop: {
    position: 'absolute',
    bottom: -6,
    left: -4,
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
  pouMouthSerious: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#1e293b',
    marginTop: 7,
  },
  pouMoodComment: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
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
    color: c.textSecondary,
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
  petLoveLeaderCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 12,
    marginVertical: 10,
    width: '100%',
  },
  petLoveLeaderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  petLoveLeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: c.text,
  },
  petLeaderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  petLeaderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  petLoveRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  petPartnerCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
  },
  petPartnerCardLeader: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  petPartnerAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petPartnerAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  petPartnerName: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },
  petPartnerHearts: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 2,
  },
  petPartnerPercent: {
    fontSize: 10,
    fontWeight: '600',
    color: c.textSecondary,
  },
  petRatioTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  petRatioFillLeft: {
    height: '100%',
    backgroundColor: '#f43f5e',
  },
  petRatioFillRight: {
    height: '100%',
    backgroundColor: '#0284c7',
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
    backgroundColor: c.surface,
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
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullLetterText: {
    fontSize: 17,
    lineHeight: 26,
    color: c.text,
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
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  feelingOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
    marginBottom: 10,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
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
    color: c.primaryOn,
  },
});

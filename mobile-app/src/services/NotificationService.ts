import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { supabase } from '../config/supabase';
import { HomeState, UserProfile } from '../types';
import {
  DEFAULT_GAMES_STATE,
  DEFAULT_HOME_STATE,
  DEFAULT_MOVIES_STATE,
  DEFAULT_PLACES_STATE,
  GamesState,
  SpecialPlacesState,
} from './CoupleSyncService';
import { getCachedMessages, toLocalDateString, toLocalDateAtHour, getRelationshipCelebrationInfo } from './StorageService';
import { notifyHeartbeatInWidget } from './WidgetSyncService';

const NOTIFIED_EVENTS_STORAGE_KEY = '@kmrg_notified_events_v1';
const LAST_SEEN_INTERACTION_TS_KEY = '@kmrg_last_seen_interaction_ts_v1';
const notifiedMemoryCache = new Set<string>();
let memoryCacheLoaded = false;

// Instantáneas en memoria para detectar qué cambió en cada estado sincronizado
let prevHomeSnapshot: HomeState | null = null;
let prevGamesSnapshot: GamesState | null = null;
let prevMoviesIdsSnapshot = new Set<string>();
let prevBucketIdsSnapshot = new Set<string>();
let prevPlacesIdsSnapshot = new Set<string>();

// Configuración segura del manejador de notificaciones (muestra banner superior y sonido siempre)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Ignorar en entornos donde no esté disponible
}

async function ensureNotifiedCacheLoaded(): Promise<void> {
  if (memoryCacheLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(NOTIFIED_EVENTS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach((k) => {
          if (typeof k === 'string') notifiedMemoryCache.add(k);
        });
      }
    }
  } catch {
    // Ignorar error de lectura
  }
  memoryCacheLoaded = true;
}

async function markEventAsNotified(eventKey: string): Promise<boolean> {
  await ensureNotifiedCacheLoaded();
  if (notifiedMemoryCache.has(eventKey)) {
    return false;
  }
  notifiedMemoryCache.add(eventKey);
  try {
    const list = Array.from(notifiedMemoryCache).slice(-150);
    await AsyncStorage.setItem(NOTIFIED_EVENTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignorar error de escritura
  }
  return true;
}

/**
 * Solicita permisos para notificaciones al usuario y configura canales de máxima prioridad en Android
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Permiso de notificaciones no concedido.');
      return false;
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('daily-messages', {
          name: 'Mensajes de Amor KMRG',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#e63946',
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
          showBadge: true,
        });

        await Notifications.setNotificationChannelAsync('partner-activity', {
          name: 'Latidos y Actividad de Pareja',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 300, 150, 300],
          lightColor: '#ec4899',
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
          showBadge: true,
        });
      } catch {
        console.log('[NotificationService] Canal de notificaciones omitido en Expo Go.');
      }
    }

    return true;
  } catch (error) {
    console.warn('Error configurando permisos de notificaciones:', error);
    return false;
  }
};

/**
 * Muestra una notificación inmediata en la barra de notificaciones del teléfono
 * con deduplicación por eventKey para evitar notificaciones repetidas.
 */
export const showInstantSystemNotification = async (
  title: string,
  body: string,
  eventKey?: string,
  data: Record<string, unknown> = {}
): Promise<boolean> => {
  try {
    if (eventKey) {
      const isNew = await markEventAsNotified(eventKey);
      if (!isNew) return false;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title.trim(),
        body: body.trim(),
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        data,
      },
      trigger: Platform.OS === 'android' ? { channelId: 'partner-activity' } : null,
    });

    return true;
  } catch (error) {
    console.warn('[NotificationService] Error mostrando notificación en barra:', error);
    return false;
  }
};

/**
 * Programa la notificación local diaria si hay un mensaje para la fecha actual o próximas fechas
 * Por defecto a las 7:00 AM.
 */
export const scheduleDailyMessage = async (): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const messages = await getCachedMessages();
    if (messages.length === 0) return;

    const now = new Date();
    const todayStr = toLocalDateString(now);

    // Cancelar solo las notificaciones programadas a futuro (no las ya mostradas en la barra)
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Verificar si hay un mensaje programado para hoy aún no leído
    const todayMessage = messages.find((m) => toLocalDateString(m.scheduled_date) === todayStr);

    if (todayMessage && !todayMessage.is_read) {
      const targetTimeToday = new Date(now);
      targetTimeToday.setHours(7, 0, 0, 0);

      if (now < targetTimeToday) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'KMRG ❤️',
            body: 'Tienes un nuevo mensaje 💌',
            sound: true,
            data: { messageId: todayMessage.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetTimeToday,
            ...(Platform.OS === 'android' ? { channelId: 'daily-messages' } : {}),
          },
        });
      }
    }

    // 2. Programar notificaciones anticipadas para mensajes futuros (a las 7:00 AM de cada fecha)
    const futureMessages = messages
      .filter((m) => toLocalDateString(m.scheduled_date) > todayStr)
      .sort((a, b) =>
        toLocalDateString(a.scheduled_date).localeCompare(toLocalDateString(b.scheduled_date))
      );

    for (const msg of futureMessages.slice(0, 60)) {
      const scheduledDate = toLocalDateAtHour(msg.scheduled_date, 7);

      if (scheduledDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'KMRG ❤️',
            body: 'Tienes un nuevo mensaje 💌',
            sound: true,
            data: { messageId: msg.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: scheduledDate,
            ...(Platform.OS === 'android' ? { channelId: 'daily-messages' } : {}),
          },
        });
      }
    }
  } catch (error) {
    console.warn('Error programando notificaciones locales:', error);
  }
};

/**
 * Registra y devuelve el token de Expo Push para este dispositivo
 */
export const registerDevicePushToken = async (): Promise<string | null> => {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: '7f11a031-8db2-49bd-be59-44f2a3426c2a',
    });
    return tokenResult?.data || null;
  } catch (error) {
    console.log('[NotificationService] No se pudo obtener push token (usando motor Realtime/Local):', error);
    return null;
  }
};

/**
 * Envía una notificación push inmediata al dispositivo de la pareja vía Expo Push API
 */
const EXPO_PUSH_TOKEN_REGEX = /^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]+\]$/;

export const sendPartnerPushNotification = async (
  recipientToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<boolean> => {
  if (
    !recipientToken ||
    typeof recipientToken !== 'string' ||
    !EXPO_PUSH_TOKEN_REGEX.test(recipientToken.trim())
  ) {
    return false;
  }

  const safeTitle = (title || '').trim().slice(0, 80);
  const safeBody = (body || '').trim().slice(0, 240);

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientToken.trim(),
        title: safeTitle,
        body: safeBody,
        sound: 'default',
        priority: 'high',
        channelId: 'partner-activity',
        data,
      }),
    });

    const result = await response.json();
    return result?.data?.status === 'ok';
  } catch (error) {
    console.warn('[NotificationService] Error enviando push notification:', error);
    return false;
  }
};

function getPartnerLabel(sender: string): string {
  return sender === 'Karla' ? 'Karlita' : 'Javier';
}

/**
 * Analiza una interacción entrante de la pareja y dispara la notificación correspondiente
 * en la barra de notificaciones del teléfono.
 */
export async function processPartnerInteractionForNotification(
  interaction: any,
  currentProfile: UserProfile
): Promise<void> {
  if (!interaction || !interaction.sender || interaction.sender === currentProfile) {
    return;
  }

  const sender = interaction.sender as UserProfile;
  const senderName = getPartnerLabel(sender);
  const interactionId = String(interaction.id || interaction.created_at || Date.now());
  const type = interaction.type;
  const payload = interaction.payload || {};

  // 1. Latido de Amor ('thinking_of_you')
  if (type === 'thinking_of_you') {
    void notifyHeartbeatInWidget(senderName);
    await showInstantSystemNotification(
      `❤️ Latido de ${senderName}`,
      `¡${senderName} está pensando en ti en este momento!`,
      `heartbeat_${interactionId}`,
      { type: 'HEARTBEAT', sender }
    );
    return;
  }

  // 2. Cambios en Inicio ('sync_home_state')
  if (type === 'sync_home_state' && payload) {
    const incHome = payload as HomeState;
    const prev = prevHomeSnapshot;
    prevHomeSnapshot = incHome;

    if (!prev) return;

    // 2a. Estado de ánimo actualizado por la pareja
    const prevPartnerMoodTime = new Date(prev.moods?.[sender]?.updatedAt || 0).getTime();
    const incPartnerMoodTime = new Date(incHome.moods?.[sender]?.updatedAt || 0).getTime();
    if (incPartnerMoodTime > prevPartnerMoodTime && incPartnerMoodTime > 0) {
      const moodStatus = incHome.moods?.[sender]?.status || incHome.moods?.[sender]?.emoji || 'Nuevo estado';
      await showInstantSystemNotification(
        `✨ Estado de ${senderName}`,
        `${senderName} actualizó su estado: "${moodStatus}"`,
        `mood_${sender}_${incHome.moods?.[sender]?.updatedAt}`,
        { type: 'MOOD_UPDATE', sender }
      );
      return;
    }

    // 2b. Notita adhesiva actualizada por la pareja
    const prevStickyTime = new Date(prev.stickyNote?.updatedAt || 0).getTime();
    const incStickyTime = new Date(incHome.stickyNote?.updatedAt || 0).getTime();
    if (
      incHome.stickyNote?.author === sender &&
      incStickyTime > prevStickyTime &&
      incHome.stickyNote?.text?.trim()
    ) {
      await showInstantSystemNotification(
        `📝 Nueva notita de ${senderName}`,
        `“${incHome.stickyNote.text.trim()}”`,
        `sticky_${incHome.stickyNote.updatedAt}`,
        { type: 'STICKY_NOTE', sender }
      );
      return;
    }

    // 2c. Nota de voz nueva
    const prevVoiceIds = new Set((prev.voiceNotes || []).map((v) => v.id));
    const newVoice = (incHome.voiceNotes || []).find(
      (v) => v.sender === sender && !prevVoiceIds.has(v.id)
    );
    if (newVoice) {
      await showInstantSystemNotification(
        `🎙️ Nota de voz de ${senderName}`,
        `${senderName} te dejó una nueva nota de voz.`,
        `voice_${newVoice.id}`,
        { type: 'VOICE_NOTE', sender }
      );
      return;
    }

    // 2d. Canción del día dedicada
    const prevSongTime = new Date(prev.todaySong?.updatedAt || 0).getTime();
    const incSongTime = new Date(incHome.todaySong?.updatedAt || 0).getTime();
    if (
      incHome.todaySong?.addedBy === sender &&
      incSongTime > prevSongTime &&
      incHome.todaySong?.title
    ) {
      await showInstantSystemNotification(
        `🎵 Canción dedicada por ${senderName}`,
        `${incHome.todaySong.title} - ${incHome.todaySong.artist || ''}`,
        `song_${incHome.todaySong.updatedAt}`,
        { type: 'TODAY_SONG', sender }
      );
      return;
    }

    // 2e. Próxima cita agendada
    if (
      incHome.nextEventTitle &&
      (incHome.nextEventTitle !== prev.nextEventTitle || incHome.nextEventDate !== prev.nextEventDate)
    ) {
      await showInstantSystemNotification(
        `📅 Nueva cita con ${senderName}`,
        `Agendó: "${incHome.nextEventTitle}" (${incHome.nextEventDate})`,
        `event_${incHome.nextEventTitle}_${incHome.nextEventDate}`,
        { type: 'NEXT_EVENT', sender }
      );
      return;
    }

    // 2f. Nueva cápsula del tiempo o razón para amar
    const prevCapsIds = new Set((prev.timeCapsules || []).map((c) => c.id));
    const newCap = (incHome.timeCapsules || []).find(
      (c) => c.sender === sender && !prevCapsIds.has(c.id)
    );
    if (newCap) {
      await showInstantSystemNotification(
        `⏳ Cápsula del Tiempo de ${senderName}`,
        `${senderName} guardó la cápsula "${newCap.title}".`,
        `capsule_${newCap.id}`,
        { type: 'TIME_CAPSULE', sender }
      );
      return;
    }

    const prevReasonIds = new Set((prev.loveReasons || []).map((r) => r.id));
    const newReason = (incHome.loveReasons || []).find(
      (r) => r.author === sender && !prevReasonIds.has(r.id)
    );
    if (newReason) {
      await showInstantSystemNotification(
        `💖 Libro de Amor`,
        `${senderName} escribió una nueva razón por la que te ama.`,
        `reason_${newReason.id}`,
        { type: 'LOVE_REASON', sender }
      );
      return;
    }

    // 2g. Reacción o nota de agradecimiento en una carta
    const prevExtras = prev.letterExtras || {};
    const incExtras = incHome.letterExtras || {};
    for (const [msgId, extra] of Object.entries(incExtras)) {
      if (!extra || extra.repliedBy !== sender) continue;
      const prevEx = prevExtras[msgId];
      const prevTime = new Date(prevEx?.updatedAt || 0).getTime();
      const incTime = new Date(extra.updatedAt || 0).getTime();
      if (incTime > prevTime) {
        if (extra.replyText && extra.replyText !== prevEx?.replyText) {
          await showInstantSystemNotification(
            `💌 Nota de ${senderName} en tu carta`,
            `${extra.reaction ? extra.reaction + ' ' : ''}“${extra.replyText}”`,
            `letter_reply_${msgId}_${extra.updatedAt}`,
            { type: 'LETTER_REPLY', messageId: msgId, sender }
          );
          return;
        }
        if (extra.reaction && extra.reaction !== prevEx?.reaction) {
          await showInstantSystemNotification(
            `💌 Reacción de ${senderName}`,
            `${senderName} reaccionó con ${extra.reaction} a tu carta.`,
            `letter_react_${msgId}_${extra.reaction}`,
            { type: 'LETTER_REACTION', messageId: msgId, sender }
          );
          return;
        }
      }
    }
    return;
  }

  // 3. Actividad en Juegos ('sync_games_state')
  if (type === 'sync_games_state' && payload) {
    const incGames = payload as GamesState;
    const prev = prevGamesSnapshot;
    prevGamesSnapshot = incGames;

    if (!prev) return;

    // 3a. Invitación a Battleship
    if (
      incGames.battleship?.phase === 'invited' &&
      prev.battleship?.phase !== 'invited' &&
      incGames.battleship?.invitedBy === sender
    ) {
      await showInstantSystemNotification(
        `⚓ ¡Desafío Naval de ${senderName}!`,
        `${senderName} te invitó a una partida de Battleship.`,
        `bs_invite_${interactionId}`,
        { type: 'GAME_BATTLESHIP_INVITE', sender }
      );
      return;
    }

    // 3b. Fin de partida en Battleship
    if (
      incGames.battleship?.phase === 'finished' &&
      prev.battleship?.phase !== 'finished' &&
      incGames.battleship?.winner === sender
    ) {
      await showInstantSystemNotification(
        `⚓ ¡Fin de la Batalla Naval!`,
        `${senderName} hundió toda tu flota. Entra para ver dónde estaban sus barcos.`,
        `bs_win_${interactionId}`,
        { type: 'GAME_BATTLESHIP_FINISHED', sender }
      );
      return;
    }

    // 3c. Disparo en Battleship y ahora es tu turno
    const prevShotsCount =
      (prev.battleship?.shotsByKarla?.length || 0) + (prev.battleship?.shotsByJavier?.length || 0);
    const incShotsCount =
      (incGames.battleship?.shotsByKarla?.length || 0) +
      (incGames.battleship?.shotsByJavier?.length || 0);
    if (
      incGames.battleship?.phase === 'battle' &&
      incShotsCount > prevShotsCount &&
      incGames.battleship?.turn === currentProfile
    ) {
      await showInstantSystemNotification(
        `⚓ Tu turno en Battleship`,
        `${senderName} realizó su ataque naval. ¡Te toca disparar!`,
        `bs_turn_${incShotsCount}_${interactionId}`,
        { type: 'GAME_BATTLESHIP_TURN', sender }
      );
      return;
    }

    // 3d. Ambos listos en Battleship -> Inicia combate
    if (
      incGames.battleship?.phase === 'battle' &&
      prev.battleship?.phase === 'setup'
    ) {
      await showInstantSystemNotification(
        `⚓ ¡Flotas listas en Battleship!`,
        `${senderName} confirmó su flota. ¡Comienza la batalla naval!`,
        `bs_start_${interactionId}`,
        { type: 'GAME_BATTLESHIP_START', sender }
      );
      return;
    }

    // 3e. Turno en 3 en Raya
    const prevTttMoves = (prev.ticTacToe?.board || []).filter(Boolean).length;
    const incTttMoves = (incGames.ticTacToe?.board || []).filter(Boolean).length;
    if (
      incTttMoves > prevTttMoves &&
      !incGames.ticTacToe?.winner &&
      incGames.ticTacToe?.turn === currentProfile
    ) {
      await showInstantSystemNotification(
        `🎮 Tu turno en 3 en Raya`,
        `${senderName} marcó una casilla. ¡Es tu turno!`,
        `ttt_turn_${incGames.ticTacToe.round}_${incTttMoves}`,
        { type: 'GAME_TTT_TURN', sender }
      );
      return;
    }

    // 3f. Turno en Ajedrez
    const myChessColor = currentProfile === 'Karla' ? 'w' : 'b';
    if (
      incGames.chess?.turn === myChessColor &&
      prev.chess?.turn !== myChessColor &&
      !incGames.chess?.winner
    ) {
      await showInstantSystemNotification(
        `♟️ Tu turno en Ajedrez`,
        `${senderName} movió una pieza. ¡Te toca jugar!`,
        `chess_turn_${interactionId}`,
        { type: 'GAME_CHESS_TURN', sender }
      );
      return;
    }

    // 3g. Reto en Ahorcado
    if (
      incGames.hangman?.isPartnerChallenge &&
      incGames.hangman?.word !== prev.hangman?.word
    ) {
      await showInstantSystemNotification(
        `🔤 Reto en El Ahorcado`,
        `${senderName} te retó a adivinar una palabra secreta (${incGames.hangman.category}).`,
        `hangman_challenge_${incGames.hangman.word}`,
        { type: 'GAME_HANGMAN_CHALLENGE', sender }
      );
      return;
    }
    return;
  }

  // 4. Cine y Planes ('sync_movies_state')
  if (type === 'sync_movies_state' && payload) {
    const movies = Array.isArray(payload.movies) ? payload.movies : [];
    const bucket = Array.isArray(payload.bucketList) ? payload.bucketList : [];

    if (prevMoviesIdsSnapshot.size > 0) {
      const addedMovie = movies.find(
        (m: any) => m.addedBy === sender && !prevMoviesIdsSnapshot.has(m.id)
      );
      if (addedMovie) {
        movies.forEach((m: any) => prevMoviesIdsSnapshot.add(m.id));
        await showInstantSystemNotification(
          `🎬 Nueva película en Cine`,
          `${senderName} agregó "${addedMovie.title}" para ver juntos.`,
          `movie_add_${addedMovie.id}`,
          { type: 'MOVIE_ADDED', sender }
        );
        return;
      }
    }
    movies.forEach((m: any) => prevMoviesIdsSnapshot.add(m.id));

    if (prevBucketIdsSnapshot.size > 0) {
      const addedBucket = bucket.find(
        (b: any) => b.addedBy === sender && !prevBucketIdsSnapshot.has(b.id)
      );
      if (addedBucket) {
        bucket.forEach((b: any) => prevBucketIdsSnapshot.add(b.id));
        await showInstantSystemNotification(
          `✨ Nuevo plan en lista de sueños`,
          `${senderName} agregó: "${addedBucket.title}"`,
          `bucket_add_${addedBucket.id}`,
          { type: 'BUCKET_ADDED', sender }
        );
        return;
      }
    }
    bucket.forEach((b: any) => prevBucketIdsSnapshot.add(b.id));
    return;
  }

  // 5. Lugares Especiales ('sync_places_state')
  if (type === 'sync_places_state' && payload) {
    const places = Array.isArray(payload.places) ? payload.places : [];
    if (prevPlacesIdsSnapshot.size > 0) {
      const addedPlace = places.find(
        (p: any) => p.addedBy === sender && !prevPlacesIdsSnapshot.has(p.id)
      );
      if (addedPlace) {
        places.forEach((p: any) => prevPlacesIdsSnapshot.add(p.id));
        await showInstantSystemNotification(
          `📍 Nuevo Lugar Especial`,
          `${senderName} agregó "${addedPlace.title}" al mapa de recuerdos.`,
          `place_add_${addedPlace.id}`,
          { type: 'PLACE_ADDED', sender }
        );
        return;
      }
    }
    places.forEach((p: any) => prevPlacesIdsSnapshot.add(p.id));
  }
}

/**
 * Revisa en Supabase si hubo latidos o cartas enviados por la pareja mientras la app
 * estaba cerrada o en segundo plano (usado también por el Widget de Android).
 */
export async function checkMissedPartnerNotifications(
  currentProfile?: UserProfile | null
): Promise<void> {
  try {
    let profile = currentProfile;
    if (!profile) {
      const storedProfile = await AsyncStorage.getItem('@kmrg_user_profile');
      if (storedProfile === 'Karla' || storedProfile === 'Javier') {
        profile = storedProfile;
      }
    }
    if (!profile) return;

    const partnerRole: UserProfile = profile === 'Karla' ? 'Javier' : 'Karla';
    const partnerName = getPartnerLabel(partnerRole);

    const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_INTERACTION_TS_KEY);
    const lastSeenMs = lastSeenRaw ? Number(lastSeenRaw) : Date.now() - 15 * 60 * 1000;
    const nowMs = Date.now();

    // 1. Verificar últimos latidos e interacciones de la pareja
    const { data: recentInteractions } = await supabase
      .from('interactions')
      .select('id, sender, type, payload, created_at')
      .eq('sender', partnerRole)
      .order('created_at', { ascending: false })
      .limit(5);

    if (Array.isArray(recentInteractions) && recentInteractions.length > 0) {
      for (const item of recentInteractions.reverse()) {
        const createdMs = new Date(item.created_at || 0).getTime();
        if (createdMs > lastSeenMs && nowMs - createdMs < 12 * 60 * 60 * 1000) {
          await processPartnerInteractionForNotification(item, profile);
        }
      }
    }

    // 2. Verificar si hay una carta nueva enviada recientemente por la pareja
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, sender, scheduled_date, created_at, is_read')
      .eq('sender', partnerRole)
      .order('created_at', { ascending: false })
      .limit(3);

    if (Array.isArray(recentMessages) && recentMessages.length > 0) {
      const todayStr = toLocalDateString(new Date());
      for (const msg of recentMessages) {
        const createdMs = new Date(msg.created_at || 0).getTime();
        if (createdMs > lastSeenMs && !msg.is_read) {
          const isToday = toLocalDateString(msg.scheduled_date) <= todayStr;
          await showInstantSystemNotification(
            `💌 Nueva carta de ${partnerName}`,
            isToday
              ? `¡${partnerName} te ha dejado una carta especial para hoy!`
              : `${partnerName} te escribió una carta sorpresa para el ${toLocalDateString(msg.scheduled_date)}.`,
            `letter_${msg.id}`,
            { type: 'SEALED_LETTER', messageId: msg.id }
          );
        }
      }
    }

    await AsyncStorage.setItem(LAST_SEEN_INTERACTION_TS_KEY, String(nowMs));
  } catch {
    // Ignorar errores de red en segundo plano
  }
}

/**
 * Inicializa las instantáneas locales para comparar cambios entrantes con precisión
 */
async function initNotificationSnapshots(): Promise<void> {
  try {
    const [homeRaw, gamesRaw, moviesRaw, placesRaw] = await Promise.all([
      AsyncStorage.getItem('@kmrg_couple_home_state_v2'),
      AsyncStorage.getItem('@kmrg_couple_games_state_v2'),
      AsyncStorage.getItem('@kmrg_couple_movies_state_v2'),
      AsyncStorage.getItem('@kmrg_couple_places_state_v1'),
    ]);

    prevHomeSnapshot = homeRaw
      ? { ...DEFAULT_HOME_STATE, ...JSON.parse(homeRaw) }
      : DEFAULT_HOME_STATE;
    prevGamesSnapshot = gamesRaw
      ? { ...DEFAULT_GAMES_STATE, ...JSON.parse(gamesRaw) }
      : DEFAULT_GAMES_STATE;

    const moviesParsed = moviesRaw ? JSON.parse(moviesRaw) : DEFAULT_MOVIES_STATE;
    (moviesParsed.movies || []).forEach((m: any) => prevMoviesIdsSnapshot.add(m.id));
    (moviesParsed.bucketList || []).forEach((b: any) => prevBucketIdsSnapshot.add(b.id));

    const placesParsed: SpecialPlacesState = placesRaw
      ? JSON.parse(placesRaw)
      : DEFAULT_PLACES_STATE;
    (placesParsed.places || []).forEach((p: any) => prevPlacesIdsSnapshot.add(p.id));
  } catch {
    // Ignorar error de inicialización
  }
}

/**
 * Suscripción global en vivo (Realtime + Polling de respaldo + AppState)
 * para notificar latidos, cartas, estados, juegos y recuerdos en la barra del teléfono.
 */

/**
 * Verifica automáticamente si hoy cumplen un nuevo mes juntos ("Mesario"),
 * Aniversario anual o un número redondo de días (100, 200, 365, 500 días)
 * y lanza una notificación festiva en la barra del teléfono.
 */
export async function checkAndNotifySpecialRelationshipDay(
  anniversaryDate?: string | null
): Promise<void> {
  try {
    let anniv = anniversaryDate;
    if (!anniv) {
      const homeRaw = await AsyncStorage.getItem('@kmrg_couple_home_state_v2');
      if (homeRaw) {
        const parsed = JSON.parse(homeRaw);
        anniv = parsed?.anniversaryDate;
      }
    }
    const info = getRelationshipCelebrationInfo(anniv || '2024-02-14', new Date());
    if (!info.isSpecialToday) return;

    const todayStr = toLocalDateString(new Date());
    await showInstantSystemNotification(
      `${info.badgeText} 💜`,
      info.subtitle,
      `special_day_${info.type}_${todayStr}`,
      { type: 'SPECIAL_RELATIONSHIP_DAY', celebrationType: info.type, totalDays: info.totalDays }
    );
  } catch {
    // Ignorar error
  }
}

export function startGlobalPartnerNotificationWatcher(
  currentProfile: UserProfile
): () => void {
  void ensureNotifiedCacheLoaded();
  void initNotificationSnapshots();
  void checkMissedPartnerNotifications(currentProfile);
  void checkAndNotifySpecialRelationshipDay();

  const channel = supabase
    .channel(`kmrg-global-partner-notifications-${currentProfile}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'interactions' },
      (payload: any) => {
        if (payload?.new) {
          void AsyncStorage.setItem(LAST_SEEN_INTERACTION_TS_KEY, String(Date.now()));
          void processPartnerInteractionForNotification(payload.new, currentProfile);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload: any) => {
        const msg = payload?.new;
        if (msg && msg.sender && msg.sender !== currentProfile) {
          const senderName = getPartnerLabel(msg.sender);
          const todayStr = toLocalDateString(new Date());
          const isToday = toLocalDateString(msg.scheduled_date) <= todayStr;
          void showInstantSystemNotification(
            `💌 Nueva carta de ${senderName}`,
            isToday
              ? `¡${senderName} te ha dejado una carta especial para hoy!`
              : `${senderName} te escribió una carta sorpresa para el ${toLocalDateString(msg.scheduled_date)}.`,
            `letter_${msg.id}`,
            { type: 'SEALED_LETTER', messageId: msg.id }
          );
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'milestones' },
      (payload: any) => {
        const ms = payload?.new;
        if (ms && ms.id && ms.title) {
          void showInstantSystemNotification(
            `📸 Nuevo recuerdo en su Álbum`,
            `Se agregó "${ms.title}" a sus recuerdos especiales.`,
            `milestone_${ms.id}`,
            { type: 'NEW_MILESTONE', milestoneId: ms.id }
          );
        }
      }
    )
    .subscribe();

  // Respaldo periódico cada 25s por si el socket entra en reposo cuando la pantalla está apagada
  const interval = setInterval(() => {
    void checkMissedPartnerNotifications(currentProfile);
  }, 25000);

  const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active' || nextState === 'background') {
      void checkMissedPartnerNotifications(currentProfile);
    }
  });

  return () => {
    clearInterval(interval);
    appStateSub.remove();
    void supabase.removeChannel(channel);
  };
}

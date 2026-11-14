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
import { notifyHeartbeatInWidget, syncWidgetData } from './WidgetSyncService';
import { rescheduleAllFeatureReminders } from './feature/featureReminders';
import { getPartnerPushToken, savePushToken } from './feature/pushTokenService';

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

    await rescheduleAllFeatureReminders();
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
  recipientOrToken: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<boolean> => {
  let targetToken = (recipientOrToken || '').trim();

  // Si se pasa el perfil ('Karla' | 'Javier') o un token inválido/vacío, resolver el token real
  if (targetToken === 'Karla' || targetToken === 'Javier') {
    targetToken = (await getPartnerPushToken(targetToken)) || '';
  } else if (!EXPO_PUSH_TOKEN_REGEX.test(targetToken)) {
    const senderProfile = (data?.sender as UserProfile) || undefined;
    if (senderProfile === 'Karla' || senderProfile === 'Javier') {
      const inferredPartner: UserProfile = senderProfile === 'Karla' ? 'Javier' : 'Karla';
      targetToken = (await getPartnerPushToken(inferredPartner)) || '';
    }
  }

  if (!targetToken || !EXPO_PUSH_TOKEN_REGEX.test(targetToken)) {
    return false;
  }

  const safeTitle = (title || '').trim().slice(0, 80);
  const safeBody = (body || '').trim().slice(0, 240);

  const payload = {
    to: targetToken,
    title: safeTitle,
    body: safeBody,
    sound: 'default',
    priority: 'high',
    ttl: 86400,
    channelId: 'partner-activity',
    _displayInForeground: true,
    data,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      const status = Array.isArray(result?.data)
        ? result.data[0]?.status
        : result?.data?.status;
      if (status === 'ok') return true;
    } catch (error) {
      if (attempt === 1) {
        console.warn('[NotificationService] Error enviando push notification:', error);
      }
    }
  }
  return false;
};

/**
 * Resuelve automáticamente el token Push de la pareja (desde tabla `push_tokens`, caché o `homeState`)
 * y le envía una notificación Push remota inmediata que despierta su teléfono aunque la app esté cerrada.
 */
export const notifyPartnerPushByProfile = async (
  sender: UserProfile,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<boolean> => {
  const partner: UserProfile = sender === 'Karla' ? 'Javier' : 'Karla';
  const token = await getPartnerPushToken(partner);
  if (!token) return false;
  return sendPartnerPushNotification(token, title, body, { ...data, sender });
};

function getPartnerLabel(sender: string): string {
  return sender === 'Karla' ? 'Karlita' : 'Javier';
}

/**
 * Detecta cambios entre el estado anterior y el nuevo estado sincronizado por `sender`,
 * y dispara automáticamente la notificación Push remota hacia el teléfono de la pareja.
 * Garantiza que TODA acción (notita, nota de voz, canción, libro de amor, juegos, cine, lugares)
 * despierte el teléfono de la pareja de inmediato sin esperar a que abra la app.
 */
export async function dispatchOutgoingSyncPushNotification(
  sender: UserProfile,
  syncType: string,
  prevState: any,
  nextState: any
): Promise<void> {
  if (!sender || !nextState) return;
  const senderName = getPartnerLabel(sender);

  try {
    // 1. Cambios en Inicio ('sync_home_state')
    if (syncType === 'sync_home_state') {
      const prev = (prevState || prevHomeSnapshot || DEFAULT_HOME_STATE) as HomeState;
      const incHome = nextState as HomeState;
      prevHomeSnapshot = incHome;

      // 1a. Notita adhesiva
      const prevStickyTime = new Date(prev.stickyNote?.updatedAt || 0).getTime();
      const incStickyTime = new Date(incHome.stickyNote?.updatedAt || 0).getTime();
      if (
        incHome.stickyNote?.author === sender &&
        incStickyTime > prevStickyTime &&
        incHome.stickyNote?.text?.trim() &&
        incHome.stickyNote.text.trim() !== prev.stickyNote?.text?.trim()
      ) {
        const key = `out_sticky_${incHome.stickyNote.updatedAt}`;
        if (await markEventAsNotified(key)) {
          await notifyPartnerPushByProfile(
            sender,
            `📝 Nueva notita de ${senderName}`,
            `“${incHome.stickyNote.text.trim()}”`,
            { type: 'STICKY_NOTE' }
          );
        }
        return;
      }

      // 1b. Nota de voz nueva
      const prevVoiceIds = new Set((prev.voiceNotes || []).map((v) => v.id));
      const newVoice = (incHome.voiceNotes || []).find(
        (v) => v.sender === sender && !prevVoiceIds.has(v.id)
      );
      if (newVoice) {
        const key = `out_voice_${newVoice.id}`;
        if (await markEventAsNotified(key)) {
          await notifyPartnerPushByProfile(
            sender,
            `🎙️ Nota de voz de ${senderName}`,
            `${senderName} te dejó una nueva nota de voz.`,
            { type: 'VOICE_NOTE' }
          );
        }
        return;
      }

      // 1c. Canción del día dedicada
      const prevSongTime = new Date(prev.todaySong?.updatedAt || 0).getTime();
      const incSongTime = new Date(incHome.todaySong?.updatedAt || 0).getTime();
      if (
        incHome.todaySong?.addedBy === sender &&
        incSongTime > prevSongTime &&
        incHome.todaySong?.title
      ) {
        const key = `out_song_${incHome.todaySong.updatedAt}`;
        if (await markEventAsNotified(key)) {
          await notifyPartnerPushByProfile(
            sender,
            `🎵 Canción dedicada por ${senderName}`,
            `${incHome.todaySong.title} - ${incHome.todaySong.artist || ''}`,
            { type: 'TODAY_SONG' }
          );
        }
        return;
      }

      // 1d. Cápsula del tiempo nueva
      const prevCapsIds = new Set((prev.timeCapsules || []).map((c) => c.id));
      const newCap = (incHome.timeCapsules || []).find(
        (c) => c.sender === sender && !prevCapsIds.has(c.id)
      );
      if (newCap) {
        const key = `out_capsule_${newCap.id}`;
        if (await markEventAsNotified(key)) {
          await notifyPartnerPushByProfile(
            sender,
            `⏳ Cápsula del Tiempo de ${senderName}`,
            `${senderName} guardó la cápsula "${newCap.title}".`,
            { type: 'TIME_CAPSULE' }
          );
        }
        return;
      }

      // 1e. Nueva razón en el Libro de Amor
      const prevReasonIds = new Set((prev.loveReasons || []).map((r) => r.id));
      const newReason = (incHome.loveReasons || []).find(
        (r) => r.author === sender && !prevReasonIds.has(r.id)
      );
      if (newReason) {
        const key = `out_reason_${newReason.id}`;
        if (await markEventAsNotified(key)) {
          await notifyPartnerPushByProfile(
            sender,
            `💖 Libro de Amor`,
            `${senderName} escribió una nueva razón por la que te ama.`,
            { type: 'LOVE_REASON' }
          );
        }
        return;
      }
      return;
    }

    // 2. Inicio y Fin de Juegos ('sync_games_state')
    if (syncType === 'sync_games_state') {
      const prev = (prevState || prevGamesSnapshot || DEFAULT_GAMES_STATE) as GamesState;
      const incGames = nextState as GamesState;
      prevGamesSnapshot = incGames;

      // Battleship
      if (
        incGames.battleship?.phase === 'invited' &&
        prev.battleship?.phase !== 'invited' &&
        incGames.battleship?.invitedBy === sender
      ) {
        await notifyPartnerPushByProfile(
          sender,
          `⚓ ¡Desafío Naval de ${senderName}!`,
          `${senderName} te invitó a una partida de Battleship.`,
          { type: 'GAME_BATTLESHIP_INVITE' }
        );
        return;
      }
      if (incGames.battleship?.phase === 'battle' && prev.battleship?.phase === 'setup') {
        await notifyPartnerPushByProfile(
          sender,
          `⚓ ¡Flotas listas en Battleship!`,
          `${senderName} confirmó su flota. ¡Comienza la batalla naval!`,
          { type: 'GAME_BATTLESHIP_START' }
        );
        return;
      }
      if (incGames.battleship?.phase === 'finished' && prev.battleship?.phase !== 'finished') {
        const isSenderWinner = incGames.battleship?.winner === sender;
        await notifyPartnerPushByProfile(
          sender,
          isSenderWinner ? `⚓ ¡Fin de la Batalla Naval!` : `⚓ ¡Victoria en Battleship! 🏆`,
          isSenderWinner
            ? `${senderName} hundió toda tu flota. Entra para ver dónde estaban sus barcos.`
            : `¡Has hundido la flota de ${senderName}! Fin de la partida.`,
          { type: 'GAME_BATTLESHIP_FINISHED' }
        );
        return;
      }

      // 3 en Raya
      const prevTttMoves = (prev.ticTacToe?.board || []).filter(Boolean).length;
      const incTttMoves = (incGames.ticTacToe?.board || []).filter(Boolean).length;
      if (prevTttMoves === 0 && incTttMoves === 1 && !incGames.ticTacToe?.winner) {
        await notifyPartnerPushByProfile(
          sender,
          `🎮 ¡Nueva partida de 3 en Raya!`,
          `${senderName} inició una partida de 3 en Raya.`,
          { type: 'GAME_TTT_START' }
        );
        return;
      }
      if (incGames.ticTacToe?.winner && !prev.ticTacToe?.winner) {
        const winner = incGames.ticTacToe.winner;
        const body =
          winner === 'Empate'
            ? `¡La partida contra ${senderName} terminó en empate!`
            : winner === sender
            ? `¡${senderName} ha ganado la ronda de 3 en Raya!`
            : `¡Has ganado la ronda contra ${senderName}!`;
        await notifyPartnerPushByProfile(sender, `🎮 ¡Fin de 3 en Raya!`, body, {
          type: 'GAME_TTT_FINISHED',
        });
        return;
      }

      // Ajedrez
      if (!prev.chess?.lastMove && Boolean(incGames.chess?.lastMove) && !incGames.chess?.winner) {
        await notifyPartnerPushByProfile(
          sender,
          `♟️ ¡Nueva partida de Ajedrez!`,
          `${senderName} inició una partida de ajedrez.`,
          { type: 'GAME_CHESS_START' }
        );
        return;
      }
      if (incGames.chess?.winner && !prev.chess?.winner) {
        const winnerColor = incGames.chess.winner;
        const partnerWon =
          (winnerColor === 'w' && sender === 'Karla') ||
          (winnerColor === 'b' && sender === 'Javier');
        await notifyPartnerPushByProfile(
          sender,
          `♟️ ¡Fin de la partida de Ajedrez!`,
          partnerWon
            ? `¡${senderName} logró el jaque mate!`
            : `¡Jaque mate a ${senderName}! Has ganado la partida.`,
          { type: 'GAME_CHESS_FINISHED' }
        );
        return;
      }

      // Ahorcado
      if (
        incGames.hangman?.isPartnerChallenge &&
        incGames.hangman?.word !== prev.hangman?.word
      ) {
        await notifyPartnerPushByProfile(
          sender,
          `🔤 ¡Reto en El Ahorcado!`,
          `${senderName} te retó a adivinar una palabra secreta (${incGames.hangman.category || 'Palabra de amor'}).`,
          { type: 'GAME_HANGMAN_CHALLENGE' }
        );
        return;
      }
      if (
        incGames.hangman?.status &&
        incGames.hangman.status !== 'playing' &&
        prev.hangman?.status === 'playing'
      ) {
        const isWon = incGames.hangman.status === 'won';
        await notifyPartnerPushByProfile(
          sender,
          isWon ? `🔤 ¡Palabra descifrada en El Ahorcado!` : `🔤 ¡Fin en El Ahorcado!`,
          isWon
            ? `${senderName} logró adivinar la palabra secreta: "${incGames.hangman.word}".`
            : `No se logró descifrar la palabra: "${incGames.hangman.word}".`,
          { type: 'GAME_HANGMAN_FINISHED' }
        );
        return;
      }

      // Dibuja y Adivina
      if (
        incGames.drawGuess?.phase === 'drawing' &&
        prev.drawGuess?.phase === 'choosing_word' &&
        incGames.drawGuess?.drawer === sender
      ) {
        await notifyPartnerPushByProfile(
          sender,
          `🎨 ¡Dibuja y Adivina!`,
          `${senderName} empezó a dibujar. ¡Entra a adivinar!`,
          { type: 'GAME_DRAWGUESS_START' }
        );
        return;
      }
      if (incGames.drawGuess?.phase === 'game_over' && prev.drawGuess?.phase !== 'game_over') {
        await notifyPartnerPushByProfile(
          sender,
          `🎨 ¡Fin de Dibuja y Adivina!`,
          `Se completaron las rondas con ${senderName}. ¡Mira los puntajes finales!`,
          { type: 'GAME_DRAWGUESS_FINISHED' }
        );
        return;
      }

      // Sudoku
      if ((incGames.sudoku?.completedCount || 0) > (prev.sudoku?.completedCount || 0)) {
        await notifyPartnerPushByProfile(
          sender,
          `🧩 ¡Sudoku completado!`,
          `${senderName} completó un tablero de Sudoku.`,
          { type: 'GAME_SUDOKU_FINISHED' }
        );
        return;
      }

      // Dominó
      const isNewDomino =
        (incGames.domino?.phase === 'playing' && prev.domino?.phase !== 'playing') ||
        ((prev.domino?.board || []).length === 0 && (incGames.domino?.board || []).length === 1);
      if (isNewDomino && !incGames.domino?.winner) {
        await notifyPartnerPushByProfile(
          sender,
          `🁡 ¡Nueva partida de Dominó!`,
          `${senderName} abrió la mesa de Dominó.`,
          { type: 'GAME_DOMINO_START' }
        );
        return;
      }
      if (incGames.domino?.phase === 'round_over' && prev.domino?.phase !== 'round_over') {
        const winner = incGames.domino.winner;
        const body =
          winner === 'Empate'
            ? `¡La mesa se trancó en empate con ${senderName}!`
            : winner === sender
            ? `¡${senderName} cerró la mano y ganó la partida de Dominó!`
            : `¡Has ganado la partida de Dominó contra ${senderName}!`;
        await notifyPartnerPushByProfile(sender, `🁡 ¡Fin del Dominó!`, body, {
          type: 'GAME_DOMINO_FINISHED',
        });
        return;
      }

      // UNO
      if (
        incGames.uno?.phase === 'playing' &&
        prev.uno?.phase !== 'playing' &&
        !incGames.uno?.winner
      ) {
        await notifyPartnerPushByProfile(
          sender,
          `🎴 ¡Nueva partida de UNO!`,
          `${senderName} barajó e inició una partida de cartas UNO.`,
          { type: 'GAME_UNO_START' }
        );
        return;
      }
      if (incGames.uno?.phase === 'round_over' && prev.uno?.phase !== 'round_over') {
        const winner = incGames.uno.winner;
        const body =
          winner === sender
            ? `¡${senderName} se quedó sin cartas y ganó la partida de UNO!`
            : `¡Te quedaste sin cartas y ganaste la partida de UNO a ${senderName}!`;
        await notifyPartnerPushByProfile(sender, `🎴 ¡Fin de la partida de UNO!`, body, {
          type: 'GAME_UNO_FINISHED',
        });
        return;
      }
      return;
    }

    // 3. Cine y Planes ('sync_movies_state')
    if (syncType === 'sync_movies_state') {
      const prevMovies: any[] = Array.isArray(prevState?.movies) ? prevState.movies : [];
      const incMovies: any[] = Array.isArray(nextState?.movies) ? nextState.movies : [];
      const prevMovieIds = new Set(prevMovies.map((m) => m.id));
      const addedMovie = incMovies.find((m) => m.addedBy === sender && !prevMovieIds.has(m.id));
      if (addedMovie) {
        await notifyPartnerPushByProfile(
          sender,
          `🎬 Nueva película en Cine`,
          `${senderName} agregó "${addedMovie.title}" para ver juntos.`,
          { type: 'MOVIE_ADDED' }
        );
        return;
      }

      const prevBucket: any[] = Array.isArray(prevState?.bucketList) ? prevState.bucketList : [];
      const incBucket: any[] = Array.isArray(nextState?.bucketList) ? nextState.bucketList : [];
      const prevBucketIds = new Set(prevBucket.map((b) => b.id));
      const addedBucket = incBucket.find((b) => b.addedBy === sender && !prevBucketIds.has(b.id));
      if (addedBucket) {
        await notifyPartnerPushByProfile(
          sender,
          `✨ Nuevo plan en lista de sueños`,
          `${senderName} agregó: "${addedBucket.title}"`,
          { type: 'BUCKET_ADDED' }
        );
        return;
      }
      return;
    }

    // 4. Lugares Especiales ('sync_places_state')
    if (syncType === 'sync_places_state') {
      const prevPlaces: any[] = Array.isArray(prevState?.places) ? prevState.places : [];
      const incPlaces: any[] = Array.isArray(nextState?.places) ? nextState.places : [];
      const prevPlaceIds = new Set(prevPlaces.map((p) => p.id));
      const addedPlace = incPlaces.find((p) => p.addedBy === sender && !prevPlaceIds.has(p.id));
      if (addedPlace) {
        await notifyPartnerPushByProfile(
          sender,
          `📍 Nuevo Lugar Especial`,
          `${senderName} agregó "${addedPlace.title}" al mapa de recuerdos.`,
          { type: 'PLACE_ADDED' }
        );
      }
    }
  } catch {
    // No bloquear guardado si falla el envío push
  }
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
  // Solo notificar al INICIO y al FINAL de cada juego (no en cada movimiento o turno)
  if (type === 'sync_games_state' && payload) {
    const incGames = payload as GamesState;
    const prev = prevGamesSnapshot;
    prevGamesSnapshot = incGames;

    if (!prev) return;

    // --- A. BATTLESHIP ---
    // A1. Inicio: Invitación a Battleship
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

    // A2. Inicio: Flotas listas -> Comienza el combate
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

    // A3. Fin: Fin de partida en Battleship (hundimiento total)
    if (
      incGames.battleship?.phase === 'finished' &&
      prev.battleship?.phase !== 'finished'
    ) {
      const isSenderWinner = incGames.battleship?.winner === sender;
      await showInstantSystemNotification(
        isSenderWinner ? `⚓ ¡Fin de la Batalla Naval!` : `⚓ ¡Victoria en Battleship! 🏆`,
        isSenderWinner
          ? `${senderName} hundió toda tu flota. Entra para ver dónde estaban sus barcos.`
          : `¡Has hundido la flota de ${senderName}! Fin de la partida.`,
        `bs_win_${interactionId}`,
        { type: 'GAME_BATTLESHIP_FINISHED', sender }
      );
      return;
    }

    // --- B. 3 EN RAYA (TIC-TAC-TOE) ---
    // B1. Inicio: Nueva partida o ronda iniciada por la pareja
    const prevTttMoves = (prev.ticTacToe?.board || []).filter(Boolean).length;
    const incTttMoves = (incGames.ticTacToe?.board || []).filter(Boolean).length;
    const isNewTttRound =
      (incGames.ticTacToe?.round && incGames.ticTacToe.round > (prev.ticTacToe?.round || 0) && !incGames.ticTacToe?.winner) ||
      (prev.ticTacToe?.winner && !incGames.ticTacToe?.winner) ||
      (prevTttMoves === 0 && incTttMoves === 1 && !incGames.ticTacToe?.winner);
    if (isNewTttRound) {
      await showInstantSystemNotification(
        `🎮 ¡Nueva partida de 3 en Raya!`,
        `${senderName} inició una partida de 3 en Raya.`,
        `ttt_start_${incGames.ticTacToe?.round || 1}_${interactionId}`,
        { type: 'GAME_TTT_START', sender }
      );
      return;
    }

    // B2. Fin: Ganador o empate en 3 en Raya
    if (incGames.ticTacToe?.winner && !prev.ticTacToe?.winner) {
      const winner = incGames.ticTacToe.winner;
      let body = `¡Partida finalizada!`;
      if (winner === 'Empate') {
        body = `¡La partida contra ${senderName} terminó en empate!`;
      } else if (winner === sender) {
        body = `¡${senderName} ha ganado la ronda!`;
      } else {
        body = `¡Has ganado la ronda contra ${senderName}!`;
      }
      await showInstantSystemNotification(
        `🎮 ¡Fin de 3 en Raya!`,
        body,
        `ttt_finish_${incGames.ticTacToe?.round || 1}_${interactionId}`,
        { type: 'GAME_TTT_FINISHED', sender }
      );
      return;
    }

    // --- C. AJEDREZ (CHESS) ---
    // C1. Inicio: Nueva partida reiniciada o primer movimiento
    const isNewChessGame =
      (prev.chess?.winner && !incGames.chess?.winner) ||
      (Boolean(prev.chess?.lastMove) && !incGames.chess?.lastMove && !incGames.chess?.winner) ||
      (!prev.chess?.lastMove && Boolean(incGames.chess?.lastMove) && !incGames.chess?.winner);
    if (isNewChessGame) {
      await showInstantSystemNotification(
        `♟️ ¡Nueva partida de Ajedrez!`,
        `${senderName} inició una partida de ajedrez.`,
        `chess_start_${interactionId}`,
        { type: 'GAME_CHESS_START', sender }
      );
      return;
    }

    // C2. Fin: Jaque mate en Ajedrez
    if (incGames.chess?.winner && !prev.chess?.winner) {
      const winnerColor = incGames.chess.winner;
      const partnerWon = (winnerColor === 'w' && sender === 'Karla') || (winnerColor === 'b' && sender === 'Javier');
      await showInstantSystemNotification(
        `♟️ ¡Fin de la partida de Ajedrez!`,
        partnerWon
          ? `¡${senderName} logró el jaque mate!`
          : `¡Jaque mate a ${senderName}! Has ganado la partida.`,
        `chess_finish_${interactionId}`,
        { type: 'GAME_CHESS_FINISHED', sender }
      );
      return;
    }

    // --- D. EL AHORCADO (HANGMAN) ---
    // D1. Inicio: Desafío con palabra secreta
    if (
      incGames.hangman?.isPartnerChallenge &&
      incGames.hangman?.word !== prev.hangman?.word
    ) {
      await showInstantSystemNotification(
        `🔤 ¡Reto en El Ahorcado!`,
        `${senderName} te retó a adivinar una palabra secreta (${incGames.hangman.category || 'Palabra de amor'}).`,
        `hangman_challenge_${interactionId}`,
        { type: 'GAME_HANGMAN_CHALLENGE', sender }
      );
      return;
    }

    // D2. Fin: Palabra resuelta o vidas agotadas
    if (
      incGames.hangman?.status &&
      incGames.hangman.status !== 'playing' &&
      prev.hangman?.status === 'playing'
    ) {
      const isWon = incGames.hangman.status === 'won';
      await showInstantSystemNotification(
        isWon ? `🔤 ¡Palabra descifrada en El Ahorcado!` : `🔤 ¡Fin en El Ahorcado!`,
        isWon
          ? `${senderName} logró adivinar la palabra secreta: "${incGames.hangman.word}".`
          : `No se logró descifrar la palabra: "${incGames.hangman.word}".`,
        `hangman_finish_${interactionId}`,
        { type: 'GAME_HANGMAN_FINISHED', sender }
      );
      return;
    }

    // --- E. DIBUJA Y ADIVINA (DRAW & GUESS) ---
    // E1. Inicio: Nueva ronda con dibujo comenzado
    if (
      incGames.drawGuess?.phase === 'drawing' &&
      prev.drawGuess?.phase === 'choosing_word' &&
      incGames.drawGuess?.drawer === sender
    ) {
      await showInstantSystemNotification(
        `🎨 ¡Dibuja y Adivina!`,
        `${senderName} empezó a dibujar. ¡Entra a adivinar!`,
        `drawguess_start_${incGames.drawGuess.currentRound || 1}_${interactionId}`,
        { type: 'GAME_DRAWGUESS_START', sender }
      );
      return;
    }

    // E2. Fin: Partida completada (todas las rondas finalizadas)
    if (
      incGames.drawGuess?.phase === 'game_over' &&
      prev.drawGuess?.phase !== 'game_over'
    ) {
      await showInstantSystemNotification(
        `🎨 ¡Fin de Dibuja y Adivina!`,
        `Se completaron las rondas con ${senderName}. ¡Mira los puntajes finales!`,
        `drawguess_gameover_${interactionId}`,
        { type: 'GAME_DRAWGUESS_FINISHED', sender }
      );
      return;
    }

    // --- F. SUDOKU COLABORATIVO ---
    // F1. Fin: Tablero completado con éxito
    if (
      (incGames.sudoku?.completedCount || 0) > (prev.sudoku?.completedCount || 0)
    ) {
      await showInstantSystemNotification(
        `🧩 ¡Sudoku completado!`,
        `${senderName} completó un tablero de Sudoku.`,
        `sudoku_finish_${interactionId}`,
        { type: 'GAME_SUDOKU_FINISHED', sender }
      );
      return;
    }

    // --- G. DOMINÓ ---
    // G1. Inicio: Nueva partida de dominó
    const isNewDomino =
      (incGames.domino?.phase === 'playing' && prev.domino?.phase !== 'playing') ||
      ((prev.domino?.board || []).length === 0 && (incGames.domino?.board || []).length === 1);
    if (isNewDomino && !incGames.domino?.winner) {
      await showInstantSystemNotification(
        `🁡 ¡Nueva partida de Dominó!`,
        `${senderName} colocó ficha y abrió la mesa de Dominó.`,
        `domino_start_${interactionId}`,
        { type: 'GAME_DOMINO_START', sender }
      );
      return;
    }

    // G2. Fin: Mano de dominó terminada (victoria o tranca)
    if (incGames.domino?.phase === 'round_over' && prev.domino?.phase !== 'round_over') {
      const winner = incGames.domino.winner;
      let body = `¡Partida de Dominó finalizada!`;
      if (winner === 'Empate') {
        body = `¡La mesa se trancó en empate con ${senderName}!`;
      } else if (winner === sender) {
        body = `¡${senderName} cerró la mano y ganó la partida de Dominó!`;
      } else {
        body = `¡Has ganado la partida de Dominó contra ${senderName}!`;
      }
      await showInstantSystemNotification(
        `🁡 ¡Fin del Dominó!`,
        body,
        `domino_finish_${interactionId}`,
        { type: 'GAME_DOMINO_FINISHED', sender }
      );
      return;
    }

    // --- H. UNO ---
    // H1. Inicio: Nueva partida de UNO
    if (
      incGames.uno?.phase === 'playing' &&
      prev.uno?.phase !== 'playing' &&
      !incGames.uno?.winner
    ) {
      await showInstantSystemNotification(
        `🎴 ¡Nueva partida de UNO!`,
        `${senderName} barajó e inició una partida de cartas UNO.`,
        `uno_start_${interactionId}`,
        { type: 'GAME_UNO_START', sender }
      );
      return;
    }

    // H2. Fin: Partida de UNO ganada
    if (incGames.uno?.phase === 'round_over' && prev.uno?.phase !== 'round_over') {
      const winner = incGames.uno.winner;
      const body =
        winner === sender
          ? `¡${senderName} se quedó sin cartas y ganó la partida de UNO!`
          : `¡Te quedaste sin cartas y ganaste la partida de UNO a ${senderName}!`;
      await showInstantSystemNotification(
        `🎴 ¡Fin de la partida de UNO!`,
        body,
        `uno_finish_${interactionId}`,
        { type: 'GAME_UNO_FINISHED', sender }
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
      const storedProfile =
        (await AsyncStorage.getItem('@kmrg_current_profile')) ||
        (await AsyncStorage.getItem('@kmrg_device_bound_profile'));
      if (storedProfile === 'Karla' || storedProfile === 'Javier') {
        profile = storedProfile;
      }
    }
    if (!profile) return;

    const partnerRole: UserProfile = profile === 'Karla' ? 'Javier' : 'Karla';
    const partnerName = getPartnerLabel(partnerRole);

    const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_INTERACTION_TS_KEY);
    const lastSeenMs = lastSeenRaw ? Number(lastSeenRaw) : Date.now() - 15 * 60 * 1000;
    let maxSeenMs = lastSeenMs;
    const nowMs = Date.now();
    const cutoffIso = new Date(Math.max(0, lastSeenMs - 5000)).toISOString();

    // 1. Verificar ÚNICAMENTE interacciones nuevas posteriores a lastSeenMs (ahorra >98% de Egress)
    const { data: recentInteractions } = await supabase
      .from('interactions')
      .select('id, sender, type, payload, created_at')
      .eq('sender', partnerRole)
      .gt('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(4);

    if (Array.isArray(recentInteractions) && recentInteractions.length > 0) {
      for (const item of recentInteractions.reverse()) {
        const createdMs = new Date(item.created_at || 0).getTime();
        if (createdMs > maxSeenMs) {
          maxSeenMs = createdMs;
        }
        if (createdMs > lastSeenMs - 5000 && nowMs - createdMs < 12 * 60 * 60 * 1000) {
          await processPartnerInteractionForNotification(item, profile);
        }
      }
    }

    // 2. Verificar ÚNICAMENTE cartas nuevas posteriores a lastSeenMs
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, sender, scheduled_date, created_at, is_read')
      .eq('sender', partnerRole)
      .gt('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(3);

    if (Array.isArray(recentMessages) && recentMessages.length > 0) {
      const todayStr = toLocalDateString(new Date());
      for (const msg of recentMessages) {
        const createdMs = new Date(msg.created_at || 0).getTime();
        if (createdMs > maxSeenMs) {
          maxSeenMs = createdMs;
        }
        if (createdMs > lastSeenMs - 5000 && !msg.is_read) {
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

    const nextCursorMs = Math.max(maxSeenMs, nowMs - 2000);
    await AsyncStorage.setItem(LAST_SEEN_INTERACTION_TS_KEY, String(nextCursorMs));
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

  // Mantener un receptor de notificaciones push remotas para deduplicar el evento local si ya llegó vía Push
  const pushReceivedSub = Notifications.addNotificationReceivedListener((notification) => {
    try {
      const data = notification?.request?.content?.data as any;
      if (data?.type === 'HEARTBEAT' && data?.sender) {
        void notifyHeartbeatInWidget(getPartnerLabel(String(data.sender)));
      }
    } catch {}
  });

  let activeChannel: any = null;
  const subscribeRealtimeChannel = () => {
    if (activeChannel) {
      try {
        void supabase.removeChannel(activeChannel);
      } catch {}
    }

    activeChannel = supabase
      .channel(`kmrg-global-partner-notifications-${currentProfile}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload?.new) {
            const createdMs = new Date(payload.new.created_at || Date.now()).getTime();
            void AsyncStorage.setItem(LAST_SEEN_INTERACTION_TS_KEY, String(createdMs));
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
          if (ms && ms.id && ms.title && ms.author !== currentProfile) {
            void showInstantSystemNotification(
              `📸 Nuevo recuerdo en su Álbum`,
              `Se agregó "${ms.title}" a sus recuerdos especiales.`,
              `milestone_${ms.id}`,
              { type: 'NEW_MILESTONE', milestoneId: ms.id }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shared_doodles' },
        (payload: any) => {
          const doodle = payload?.new;
          if (doodle && doodle.author && doodle.author !== currentProfile) {
            const senderName = getPartnerLabel(doodle.author);
            const doodleTitle = doodle.title || 'Dibujito para ti';
            void showInstantSystemNotification(
              `🎨 ¡Notita dibujada de ${senderName}!`,
              `Te dedicó una notita en servilleta: "${doodleTitle}"`,
              `doodle_${doodle.id}`,
              { type: 'SHARED_DOODLE_ADDED', doodleId: doodle.id }
            );
            void syncWidgetData({
              noteText: `🎨 "${doodleTitle}"`,
              noteSender: senderName,
              isDoodleNote: true,
              doodleTitle: doodleTitle,
            });
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => {
            void checkMissedPartnerNotifications(currentProfile);
          }, 2500);
        }
      });
  };

  subscribeRealtimeChannel();

  // Respaldo periódico ligero cada 2 min solo con app activa (la consulta ahora usa cursor .gt para 0 bytes si no hay novedades)
  const interval = setInterval(() => {
    if (AppState.currentState === 'active') {
      void checkMissedPartnerNotifications(currentProfile);
    }
  }, 120000);

  const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      subscribeRealtimeChannel();
      void checkMissedPartnerNotifications(currentProfile);
    }
  });

  return () => {
    clearInterval(interval);
    appStateSub.remove();
    pushReceivedSub.remove();
    if (activeChannel) {
      void supabase.removeChannel(activeChannel);
    }
  };
}

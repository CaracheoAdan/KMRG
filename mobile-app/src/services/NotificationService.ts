import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCachedMessages, toLocalDateString, toLocalDateAtHour } from './StorageService';

// Configuración segura del manejador de notificaciones
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  // Ignorar en entornos donde no esté disponible
}

/**
 * Solicita permisos para notificaciones locales al usuario
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
      } catch {
        // En Expo Go en Android, NotificationsChannelsProvider no está presente y lanza NPE
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

    // Cancelar notificaciones previas programadas para evitar duplicados
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 1. Verificar si hay un mensaje programado para hoy aún no leído
    const todayMessage = messages.find((m) => toLocalDateString(m.scheduled_date) === todayStr);

    if (todayMessage && !todayMessage.is_read) {
      // Hora objetivo: 7:00 AM del día de hoy
      const targetTimeToday = new Date(now);
      targetTimeToday.setHours(7, 0, 0, 0);

      if (now < targetTimeToday) {
        // Aún no son las 7:00 AM, programar para las 7:00 AM de hoy
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

    // Programar hasta 60 mensajes futuros (2 meses de cartas anticipadas en hardware local)
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

    console.log('[NotificationService] Notificaciones locales programadas correctamente.');
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
    console.log('[NotificationService] No se pudo obtener push token (normal en emulador o sin EAS):', error);
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
        channelId: 'daily-messages',
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

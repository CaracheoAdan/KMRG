import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getCachedMessages, toLocalDateString } from './StorageService';

// Configuración global del manejador de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
      await Notifications.setNotificationChannelAsync('daily-messages', {
        name: 'Mensajes de Amor KMRG',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e63946',
        sound: 'default',
      });
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

    // 1. Verificar si hay un mensaje programado para hoy
    const todayMessage = messages.find((m) => toLocalDateString(m.scheduled_date) === todayStr);

    if (todayMessage) {
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
          },
        });
      }
    }

    // 2. Programar notificaciones anticipadas para mensajes futuros (a las 7:00 AM de cada fecha)
    const futureMessages = messages.filter((m) => toLocalDateString(m.scheduled_date) > todayStr);

    for (const msg of futureMessages.slice(0, 10)) {
      const scheduledDate = new Date(msg.scheduled_date);
      scheduledDate.setHours(7, 0, 0, 0);

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
          },
        });
      }
    }

    console.log('[NotificationService] Notificaciones locales programadas correctamente.');
  } catch (error) {
    console.warn('Error programando notificaciones locales:', error);
  }
};

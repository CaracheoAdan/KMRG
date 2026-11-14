import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fetchAll, readCache } from './featureStore';
import { formatDisplayDate, toLocalDateString } from '../StorageService';
import { getQuestionForDate } from './dailyQuestionBank';

type ReminderCoupleEventRow = {
  id: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  remind_minutes_before: number;
};

type ReminderImportantDateRow = {
  id: string;
  title: string;
  kind: 'birthday' | 'anniversary' | 'monthiversary' | 'custom';
  date: string;
  recurring_yearly: boolean;
  owner?: 'Javier' | 'Karla' | null;
};

interface CandidateNotification {
  triggerDate: Date;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

const MAX_DAYS_AHEAD = 60;
const MAX_NOTIFICATIONS = 40;

function parseYMD(dateStr: string): [number, number, number] | null {
  const clean = toLocalDateString(dateStr);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null;
  return [parts[0], parts[1], parts[2]];
}

function makeClampedDate(year: number, month0: number, day: number, hour = 0, minute = 0): Date {
  const maxDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, maxDay), hour, minute, 0, 0);
}

/**
 * Obtiene las próximas ocurrencias de una fecha importante dentro de la ventana de 60 días.
 */
function getUpcomingOccurrencesForImportantDate(
  item: ReminderImportantDateRow,
  now: Date
): Array<{ year: number; month0: number; day: number; count: number | null }> {
  const parsed = parseYMD(item.date);
  if (!parsed) return [];
  const [baseYear, baseMonth, baseDay] = parsed;
  const baseMonth0 = baseMonth - 1;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const results: Array<{ year: number; month0: number; day: number; count: number | null }> = [];

  if (item.kind === 'monthiversary') {
    // Puede ocurrir hasta 2 o 3 veces dentro de 60 días
    for (let offset = 0; offset <= 2; offset++) {
      const totalMonth0 = todayMidnight.getFullYear() * 12 + todayMidnight.getMonth() + offset;
      const yr = Math.floor(totalMonth0 / 12);
      const m0 = totalMonth0 % 12;
      const occ = makeClampedDate(yr, m0, baseDay);
      if (occ.getTime() < todayMidnight.getTime()) continue;
      const monthsDiff = (yr - baseYear) * 12 + (m0 - baseMonth0);
      results.push({
        year: occ.getFullYear(),
        month0: occ.getMonth(),
        day: occ.getDate(),
        count: monthsDiff > 0 ? monthsDiff : null,
      });
    }
    return results;
  }

  if (item.recurring_yearly) {
    for (let yrOffset = 0; yrOffset <= 1; yrOffset++) {
      const yr = todayMidnight.getFullYear() + yrOffset;
      const occ = makeClampedDate(yr, baseMonth0, baseDay);
      if (occ.getTime() < todayMidnight.getTime()) continue;
      const yearsDiff = yr - baseYear;
      results.push({
        year: occ.getFullYear(),
        month0: occ.getMonth(),
        day: occ.getDate(),
        count: yearsDiff > 0 ? yearsDiff : null,
      });
    }
    return results;
  }

  const singleOcc = makeClampedDate(baseYear, baseMonth0, baseDay);
  if (singleOcc.getTime() >= todayMidnight.getTime()) {
    results.push({
      year: singleOcc.getFullYear(),
      month0: singleOcc.getMonth(),
      day: singleOcc.getDate(),
      count: null,
    });
  }
  return results;
}

async function loadMergedRows<T extends { id: string } & Record<string, unknown>>(table: string): Promise<T[]> {
  const cached = await readCache<T>(table);
  const remote = await fetchAll<T>(table);
  const map = new Map<string, T>();
  remote.forEach((r) => {
    if (r?.id) map.set(r.id, r);
  });
  cached.forEach((r) => {
    if (r?.id && !map.has(r.id)) map.set(r.id, r);
  });
  return Array.from(map.values());
}

/**
 * Reprograma los recordatorios locales de Agenda compartida (`couple_events`)
 * y Fechas importantes (`important_dates`) para los próximos 60 días (máx. 40 notificaciones).
 * Solo cancela las notificaciones previamente agendadas con `data.kind === 'feature_reminder'`.
 */
export async function rescheduleAllFeatureReminders(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    // 1. Cancelar únicamente los recordatorios previos de features v2
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const data = item.content?.data as Record<string, unknown> | undefined;
      if (data?.kind === 'feature_reminder') {
        try {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        } catch {
          // Ignorar error individual de cancelación
        }
      }
    }

    const [events, importantDates] = await Promise.all([
      loadMergedRows<ReminderCoupleEventRow>('couple_events'),
      loadMergedRows<ReminderImportantDateRow>('important_dates'),
    ]);

    const now = new Date();
    const nowMs = now.getTime();
    const horizonMs = nowMs + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
    const candidates: CandidateNotification[] = [];

    // 2. Candidatos de Agenda de citas (respetando remind_minutes_before)
    for (const ev of events) {
      if (!ev || !ev.title || !ev.event_date) continue;
      const remindMins =
        typeof ev.remind_minutes_before === 'number' ? ev.remind_minutes_before : 60;
      if (remindMins <= 0) continue; // 0 = Sin recordatorio

      const parsedDate = parseYMD(ev.event_date);
      if (!parsedDate) continue;
      const [yr, mo, dy] = parsedDate;

      let hour = 9;
      let minute = 0;
      if (ev.event_time && /^\d{2}:\d{2}$/.test(ev.event_time.trim())) {
        const [h, m] = ev.event_time.trim().split(':').map(Number);
        if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          hour = h;
          minute = m;
        }
      }

      const eventDateTime = new Date(yr, mo - 1, dy, hour, minute, 0, 0);
      const triggerDate = new Date(eventDateTime.getTime() - remindMins * 60 * 1000);
      const triggerMs = triggerDate.getTime();

      if (triggerMs <= nowMs || triggerMs > horizonMs) continue;

      let timingLabel = `el ${formatDisplayDate(ev.event_date)}`;
      if (remindMins === 15) timingLabel = 'en 15 minutos';
      else if (remindMins === 60) timingLabel = 'en 1 hora';
      else if (remindMins === 1440) timingLabel = 'mañana';

      const timeSuffix = ev.event_time ? ` a las ${ev.event_time}` : '';
      const locSuffix = ev.location ? ` · 📍 ${ev.location}` : '';

      candidates.push({
        triggerDate,
        title: `📅 Cita: ${ev.title}`,
        body: `Recordatorio: "${ev.title}" es ${timingLabel}${timeSuffix}${locSuffix}.`,
        data: {
          kind: 'feature_reminder',
          source: 'couple_event',
          eventId: ev.id,
          eventDate: ev.event_date,
        },
      });
    }

    // 3. Candidatos de Fechas importantes (1 día antes a las 9:00 AM + el mismo día a las 9:00 AM)
    for (const item of importantDates) {
      if (!item || !item.title || !item.date) continue;
      const occurrences = getUpcomingOccurrencesForImportantDate(item, now);

      for (const occ of occurrences) {
        const occDateStr = `${occ.year}-${String(occ.month0 + 1).padStart(2, '0')}-${String(
          occ.day
        ).padStart(2, '0')}`;

        const countSuffix =
          occ.count && occ.count > 0
            ? item.kind === 'monthiversary'
              ? ` (${occ.count} ${occ.count === 1 ? 'mes' : 'meses'})`
              : item.kind === 'birthday'
              ? ` (cumple ${occ.count} ${occ.count === 1 ? 'año' : 'años'})`
              : ` (${occ.count} ${occ.count === 1 ? 'año' : 'años'})`
            : '';

        // 3a. 1 día antes a las 9:00 AM
        const dayBefore9am = new Date(occ.year, occ.month0, occ.day - 1, 9, 0, 0, 0);
        if (dayBefore9am.getTime() > nowMs && dayBefore9am.getTime() <= horizonMs) {
          candidates.push({
            triggerDate: dayBefore9am,
            title: `✨ Mañana: ${item.title}`,
            body: `Mañana es "${item.title}"${countSuffix}. ¡Prepárense para celebrar juntos! ❤️`,
            data: {
              kind: 'feature_reminder',
              source: 'important_date_before',
              dateId: item.id,
              date: occDateStr,
            },
          });
        }

        // 3b. El mismo día a las 9:00 AM
        const onDay9am = new Date(occ.year, occ.month0, occ.day, 9, 0, 0, 0);
        if (onDay9am.getTime() > nowMs && onDay9am.getTime() <= horizonMs) {
          candidates.push({
            triggerDate: onDay9am,
            title: `🎉 ¡Hoy es ${item.title}!`,
            body: `¡Hoy celebramos "${item.title}"${countSuffix}! Que sea un día inolvidable 💜`,
            data: {
              kind: 'feature_reminder',
              source: 'important_date_day',
              dateId: item.id,
              date: occDateStr,
            },
          });
        }
      }
    }

    // 4. Ordenar por fecha más próxima y limitar a 40 notificaciones
    candidates.sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime());
    const toSchedule = candidates.slice(0, MAX_NOTIFICATIONS);

    for (const notif of toSchedule) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notif.title,
          body: notif.body,
          sound: true,
          data: notif.data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: notif.triggerDate,
          ...(Platform.OS === 'android' ? { channelId: 'partner-activity' } : {}),
        },
      });
    }
  } catch (err) {
    console.warn('[featureReminders] Error reprogramando recordatorios:', err);
  }
}

/**
 * Cancela los recordatorios locales programados específicamente para "Próxima Cita" en Hoy.
 */
export async function cancelNextEventReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const data = item.content?.data as Record<string, unknown> | undefined;
      if (data?.kind === 'next_event_reminder') {
        try {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        } catch {
          // Ignorar error individual de cancelación
        }
      }
    }
  } catch (err) {
    console.warn('[featureReminders] Error cancelando recordatorios de Próxima Cita:', err);
  }
}

/**
 * Cancela los recordatorios programados de "Pregunta del día".
 */
export async function cancelDailyQuestionReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      const data = item.content?.data as Record<string, unknown> | undefined;
      if (data?.kind === 'daily_question_reminder') {
        try {
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
        } catch {
          // Ignorar error individual de cancelación
        }
      }
    }
  } catch (err) {
    console.warn('[featureReminders] Error cancelando recordatorios de Pregunta del día:', err);
  }
}

/**
 * Programa recordatorios diarios a las 20:30 para contestar la Pregunta del día.
 * Si hoy ya se respondió, cancela el de hoy y deja programados los días siguientes.
 */
export async function scheduleDailyQuestionReminder(hasAnsweredToday: boolean): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await cancelDailyQuestionReminders();

    const now = new Date();
    const startOffset = hasAnsweredToday ? 1 : 0;

    for (let offset = startOffset; offset <= 3; offset++) {
      const target = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        20,
        30,
        0,
        0
      );
      if (target.getTime() <= now.getTime()) continue;

      const dateStr = toLocalDateString(target);
      const q = getQuestionForDate(dateStr);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: offset === 0 ? '💬 ¡No olviden la pregunta de hoy!' : '💬 Nueva pregunta del día lista',
          body: `${q.category}: "${q.question}"`,
          sound: true,
          data: {
            kind: 'daily_question_reminder',
            feature: 'daily_question',
            date: dateStr,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: target,
          ...(Platform.OS === 'android' ? { channelId: 'partner-activity' } : {}),
        },
      });
    }
  } catch (err) {
    console.warn('[featureReminders] Error programando recordatorios de Pregunta del día:', err);
  }
}

/**
 * Programa recordatorios automáticos (24 horas antes y 1 hora antes) para la "Próxima Cita" de pareja.
 */
export async function scheduleNextEventReminders(
  title: string,
  dateStr: string,
  timeStr?: string
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    await cancelNextEventReminders();

    const parsedDate = parseYMD(dateStr);
    if (!parsedDate) return;
    const [yr, mo, dy] = parsedDate;

    let hour = 10;
    let minute = 0;
    const hasCustomTime = Boolean(timeStr && /^\d{2}:\d{2}$/.test(timeStr.trim()));
    if (hasCustomTime && timeStr) {
      const [h, m] = timeStr.trim().split(':').map(Number);
      if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        hour = h;
        minute = m;
      }
    }

    const eventDateTime = new Date(yr, mo - 1, dy, hour, minute, 0, 0);
    if (isNaN(eventDateTime.getTime())) return;

    const cleanTitle = title.trim() || 'Cita especial 💕';
    const timeSuffix = hasCustomTime && timeStr ? ` a las ${timeStr.trim()}` : '';
    const nowMs = Date.now();

    const reminders = [
      {
        triggerDate: new Date(eventDateTime.getTime() - 24 * 60 * 60 * 1000),
        title: `📅 Mañana tienen cita: ${cleanTitle}`,
        body: `Mañana es su cita${timeSuffix} (${formatDisplayDate(dateStr)}). ¡Prepárate! 💕`,
        slot: '24h_before',
      },
      {
        triggerDate: new Date(eventDateTime.getTime() - 60 * 60 * 1000),
        title: `⏰ ¡Su cita es en 1 hora!: ${cleanTitle}`,
        body: `Ya casi es hora de "${cleanTitle}"${timeSuffix}. ¡Disfruten muchísimo juntos!`,
        slot: '1h_before',
      },
    ];

    for (const r of reminders) {
      if (r.triggerDate.getTime() <= nowMs) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          sound: true,
          data: {
            kind: 'next_event_reminder',
            slot: r.slot,
            eventDate: dateStr,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.triggerDate,
          ...(Platform.OS === 'android' ? { channelId: 'partner-activity' } : {}),
        },
      });
    }
  } catch (err) {
    console.warn('[featureReminders] Error programando recordatorios de Próxima Cita:', err);
  }
}

import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';
import { rescheduleAllFeatureReminders } from './featureReminders';
import { getHomeState, saveHomeState } from '../CoupleSyncService';
import { syncWidgetData } from '../WidgetSyncService';
import { sendPartnerPushNotification } from '../NotificationService';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { UserProfile } from '../../types';

export type EventReminderMinutes = 0 | 15 | 60 | 1440;

export type CoupleEvent = {
  id: string;
  title: string;
  event_date: string; // 'YYYY-MM-DD'
  event_time: string | null; // 'HH:mm' opcional
  location: string | null;
  notes: string | null;
  remind_minutes_before: number; // 0 | 15 | 60 | 1440
  created_by: UserProfile;
  created_at: string;
  updated_at: string;
};

export interface UpsertCoupleEventInput {
  id?: string;
  title: string;
  event_date: string;
  event_time?: string | null;
  location?: string | null;
  notes?: string | null;
  remind_minutes_before?: number;
  created_by: UserProfile;
}

const TABLE = 'couple_events';

export const REMINDER_OPTIONS: Array<{ value: EventReminderMinutes; label: string }> = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 15, label: '15 min antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
];

export function formatReminderOption(minutes: number): string {
  const found = REMINDER_OPTIONS.find((o) => o.value === minutes);
  if (found) return found.label;
  if (minutes <= 0) return 'Sin recordatorio';
  if (minutes < 60) return `${minutes} min antes`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h antes`;
  return `${Math.round(minutes / 1440)} d antes`;
}

export function normalizeTimeInput(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getEventTimestamp(event: Pick<CoupleEvent, 'event_date' | 'event_time'>, fallbackEndOfDay = true): Date {
  const cleanDate = toLocalDateString(event.event_date);
  const [y, m, d] = cleanDate.split('-').map(Number);
  const normTime = normalizeTimeInput(event.event_time);
  if (normTime) {
    const [hh, mm] = normTime.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh, mm, 0, 0);
  }
  return fallbackEndOfDay
    ? new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999)
    : new Date(y, (m || 1) - 1, d || 1, 9, 0, 0, 0);
}

export function isEventUpcoming(event: CoupleEvent, now: Date = new Date()): boolean {
  const todayStr = toLocalDateString(now);
  const evDateStr = toLocalDateString(event.event_date);
  if (evDateStr > todayStr) return true;
  if (evDateStr < todayStr) return false;
  // Si es hoy: si tiene hora, comprobar si no ha pasado hace más de 1 hora; si no tiene hora, todo el día cuenta como próxima
  const normTime = normalizeTimeInput(event.event_time);
  if (!normTime) return true;
  const dt = getEventTimestamp(event, false);
  return dt.getTime() >= now.getTime() - 30 * 60 * 1000;
}

export function formatEventCountdown(event: CoupleEvent, now: Date = new Date()): string {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const cleanDate = toLocalDateString(event.event_date);
  const [y, m, d] = cleanDate.split('-').map(Number);
  const evMidnight = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
  const diffDays = Math.round((evMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const normTime = normalizeTimeInput(event.event_time);
    if (normTime) {
      const target = getEventTimestamp(event, false);
      const diffMs = target.getTime() - now.getTime();
      if (diffMs > 0) {
        const totalMins = Math.ceil(diffMs / 60000);
        if (totalMins < 60) {
          return `Hoy · en ${totalMins} min`;
        }
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        return mins > 0 ? `Hoy · en ${hrs}h ${mins}m` : `Hoy · en ${hrs} h`;
      }
    }
    return '¡Es hoy!';
  }

  if (diffDays === 1) return 'Mañana';
  if (diffDays > 1) return `en ${diffDays} días`;
  if (diffDays === -1) return 'Ayer';
  return `hace ${Math.abs(diffDays)} días`;
}

export function splitAndSortEvents(
  events: CoupleEvent[],
  now: Date = new Date()
): { upcoming: CoupleEvent[]; past: CoupleEvent[] } {
  const upcoming: CoupleEvent[] = [];
  const past: CoupleEvent[] = [];

  for (const ev of events) {
    if (!ev || !ev.id) continue;
    if (isEventUpcoming(ev, now)) {
      upcoming.push(ev);
    } else {
      past.push(ev);
    }
  }

  upcoming.sort((a, b) => {
    const da = toLocalDateString(a.event_date);
    const db = toLocalDateString(b.event_date);
    if (da !== db) return da.localeCompare(db);
    const ta = normalizeTimeInput(a.event_time) || '23:59';
    const tb = normalizeTimeInput(b.event_time) || '23:59';
    return ta.localeCompare(tb);
  });

  past.sort((a, b) => {
    const da = toLocalDateString(a.event_date);
    const db = toLocalDateString(b.event_date);
    if (da !== db) return db.localeCompare(da);
    const ta = normalizeTimeInput(a.event_time) || '00:00';
    const tb = normalizeTimeInput(b.event_time) || '00:00';
    return tb.localeCompare(ta);
  });

  return { upcoming, past };
}

export async function getAllEvents(): Promise<CoupleEvent[]> {
  return fetchAll<CoupleEvent>(TABLE, { orderBy: 'event_date', ascending: true });
}

export async function getCachedEvents(): Promise<CoupleEvent[]> {
  return readCache<CoupleEvent>(TABLE);
}

export async function getUpcomingEvents(limit = 2): Promise<CoupleEvent[]> {
  const all = await getAllEvents();
  const { upcoming } = splitAndSortEvents(all, new Date());
  return upcoming.slice(0, Math.max(1, limit));
}

export async function saveCoupleEvent(input: UpsertCoupleEventInput): Promise<CoupleEvent> {
  const nowIso = new Date().toISOString();
  const existing = input.id ? (await readCache<CoupleEvent>(TABLE)).find((e) => e.id === input.id) : undefined;

  const cleanTitle = sanitizeInput(input.title, 160);
  if (!cleanTitle) {
    throw new Error('El título de la cita es obligatorio.');
  }

  const cleanDate = toLocalDateString(input.event_date);
  const cleanTime = normalizeTimeInput(input.event_time);
  const cleanLocation = input.location ? sanitizeInput(input.location, 255) || null : null;
  const cleanNotes = input.notes ? sanitizeInput(input.notes, 1000) || null : null;
  const rawRemind =
    typeof input.remind_minutes_before === 'number' ? input.remind_minutes_before : 60;
  const remindMinutes = Math.max(0, Math.min(10080, Math.round(rawRemind)));

  const row: CoupleEvent = {
    id: input.id || generateId(),
    title: cleanTitle,
    event_date: cleanDate,
    event_time: cleanTime,
    location: cleanLocation,
    notes: cleanNotes,
    remind_minutes_before: remindMinutes,
    created_by: existing?.created_by || input.created_by,
    created_at: existing?.created_at || nowIso,
    updated_at: nowIso,
  };

  const saved = await upsertRow<CoupleEvent>(TABLE, row);
  void rescheduleAllFeatureReminders();

  if (!input.id) {
    try {
      const partner: UserProfile = input.created_by === 'Javier' ? 'Karla' : 'Javier';
      const senderName = input.created_by === 'Karla' ? 'Karlita' : 'Javier';
      const timeLabel = cleanTime ? ` a las ${cleanTime}` : '';
      void sendPartnerPushNotification(
        partner,
        `📅 Nueva cita con ${senderName}`,
        `${senderName} agendó: "${cleanTitle}" (${cleanDate}${timeLabel}).`,
        { type: 'COUPLE_EVENT_ADDED', eventId: saved.id, sender: input.created_by }
      );
    } catch {}
  }

  return saved;
}

export async function deleteCoupleEvent(id: string): Promise<void> {
  await deleteRow(TABLE, id);
  void rescheduleAllFeatureReminders();
}

export function subscribeCoupleEvents(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

/**
 * Sincroniza la cita más próxima de la agenda compartida hacia HomeState y el widget nativo
 * para que la tarjeta "Próxima Cita" en Hoy siempre refleje la agenda compartida y la ruleta.
 */
export async function syncNextEventSummaryToHome(
  activeProfile: UserProfile
): Promise<CoupleEvent | null> {
  const all = await getAllEvents();
  const { upcoming } = splitAndSortEvents(all, new Date());
  const top = upcoming[0] || null;

  const nextTitle = top ? top.title : '';
  const nextDate = top ? toLocalDateString(top.event_date) : '';
  const nextTime = top?.event_time || '';

  try {
    const currentHome = await getHomeState();
    const changed =
      (currentHome.nextEventTitle || '') !== nextTitle ||
      (currentHome.nextEventDate || '') !== nextDate ||
      (currentHome.nextEventTime || '') !== nextTime;

    if (changed) {
      await saveHomeState(activeProfile, {
        ...currentHome,
        nextEventTitle: nextTitle,
        nextEventDate: nextDate,
        nextEventTime: nextTime,
        nextEventUpdatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Continuar actualizando widget aunque el sync de HomeState falle offline
  }

  void syncWidgetData({
    nextEventTitle: nextTitle,
    nextEventDate: nextDate,
  });

  return top;
}

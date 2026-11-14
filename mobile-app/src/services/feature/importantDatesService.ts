import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';
import { rescheduleAllFeatureReminders } from './featureReminders';
import { sendPartnerPushNotification } from '../NotificationService';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { UserProfile } from '../../types';

export type ImportantDateKind = 'birthday' | 'anniversary' | 'monthiversary' | 'custom';

export type ImportantDate = {
  id: string;
  title: string;
  kind: ImportantDateKind;
  date: string; // 'YYYY-MM-DD'
  recurring_yearly: boolean;
  owner: UserProfile | null;
  created_by: UserProfile;
  created_at: string;
};

export interface UpsertImportantDateInput {
  id?: string;
  title: string;
  kind: ImportantDateKind;
  date: string;
  recurring_yearly?: boolean;
  owner?: UserProfile | null;
  created_by: UserProfile;
}

export interface ComputedImportantDate extends ImportantDate {
  nextOccurrenceDate: string; // 'YYYY-MM-DD'
  daysRemaining: number; // 0 = hoy, >0 futuro, <0 pasado (si no es recurrente)
  isToday: boolean;
  yearsOrMonthsCount: number | null;
  celebrationBadge: string | null;
  countdownLabel: string;
}

export interface ImportantDatePreset {
  key: string;
  label: string;
  title: string;
  kind: ImportantDateKind;
  owner: UserProfile | null;
  recurring_yearly: boolean;
  icon: string;
  defaultDate?: string;
}

const TABLE = 'important_dates';

export const IMPORTANT_DATE_PRESETS: ImportantDatePreset[] = [
  {
    key: 'javier_bday',
    label: 'Cumpleaños de Javier',
    title: 'Cumpleaños de Javier',
    kind: 'birthday',
    owner: 'Javier',
    recurring_yearly: true,
    icon: 'cake',
  },
  {
    key: 'karla_bday',
    label: 'Cumpleaños de Karla',
    title: 'Cumpleaños de Karla',
    kind: 'birthday',
    owner: 'Karla',
    recurring_yearly: true,
    icon: 'cake',
  },
  {
    key: 'monthiversary',
    label: 'Mesiversario',
    title: 'Mesiversario',
    kind: 'monthiversary',
    owner: null,
    recurring_yearly: true,
    icon: 'calendar-heart',
    defaultDate: '2024-02-14',
  },
];

export const KIND_META: Record<
  ImportantDateKind,
  { label: string; icon: string; recurrenceHint: string }
> = {
  birthday: {
    label: 'Cumpleaños',
    icon: 'cake',
    recurrenceHint: 'Se repite cada año',
  },
  anniversary: {
    label: 'Aniversario',
    icon: 'calendar-heart',
    recurrenceHint: 'Se repite cada año',
  },
  monthiversary: {
    label: 'Mesiversario',
    icon: 'sparkles',
    recurrenceHint: 'Se repite cada mes',
  },
  custom: {
    label: 'Especial',
    icon: 'gift',
    recurrenceHint: 'Personalizada',
  },
};

function makeClampedDate(year: number, month0: number, day: number): Date {
  const maxDay = new Date(year, month0 + 1, 0).getDate();
  return new Date(year, month0, Math.min(day, maxDay), 0, 0, 0, 0);
}

/**
 * Calcula la próxima ocurrencia, días restantes, si es hoy y la edad/años/meses que se cumplen.
 */
export function computeImportantDateInfo(
  item: ImportantDate,
  now: Date = new Date()
): ComputedImportantDate {
  const cleanDate = toLocalDateString(item.date);
  const parts = cleanDate.split('-').map(Number);
  const baseYear = parts[0] || now.getFullYear();
  const baseMonth = parts[1] || 1;
  const baseDay = parts[2] || 1;
  const baseMonth0 = baseMonth - 1;

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const baseDateMidnight = makeClampedDate(baseYear, baseMonth0, baseDay);

  let nextOcc: Date;
  let yearsOrMonthsCount: number | null = null;

  if (item.kind === 'monthiversary') {
    // Recurre mensualmente en el día baseDay
    let cand = makeClampedDate(todayMidnight.getFullYear(), todayMidnight.getMonth(), baseDay);
    if (cand.getTime() < todayMidnight.getTime()) {
      const nextM = todayMidnight.getMonth() + 1;
      cand = makeClampedDate(
        todayMidnight.getFullYear() + Math.floor(nextM / 12),
        nextM % 12,
        baseDay
      );
    }
    if (baseDateMidnight.getTime() > cand.getTime()) {
      cand = baseDateMidnight;
    }
    nextOcc = cand;
    const monthsDiff =
      (nextOcc.getFullYear() - baseYear) * 12 + (nextOcc.getMonth() - baseMonth0);
    yearsOrMonthsCount = monthsDiff > 0 ? monthsDiff : null;
  } else if (item.recurring_yearly) {
    let cand = makeClampedDate(todayMidnight.getFullYear(), baseMonth0, baseDay);
    if (cand.getTime() < todayMidnight.getTime()) {
      cand = makeClampedDate(todayMidnight.getFullYear() + 1, baseMonth0, baseDay);
    }
    if (baseDateMidnight.getTime() > cand.getTime()) {
      cand = baseDateMidnight;
    }
    nextOcc = cand;
    const yearsDiff = nextOcc.getFullYear() - baseYear;
    yearsOrMonthsCount = yearsDiff > 0 ? yearsDiff : null;
  } else {
    nextOcc = baseDateMidnight;
    yearsOrMonthsCount = null;
  }

  const daysRemaining = Math.round(
    (nextOcc.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isToday = daysRemaining === 0;
  const nextOccurrenceDate = toLocalDateString(nextOcc);

  let celebrationBadge: string | null = null;
  if (yearsOrMonthsCount && yearsOrMonthsCount > 0) {
    if (item.kind === 'birthday') {
      celebrationBadge = isToday
        ? `🎂 ¡Cumple ${yearsOrMonthsCount} ${yearsOrMonthsCount === 1 ? 'año' : 'años'} hoy!`
        : `Cumplirá ${yearsOrMonthsCount} ${yearsOrMonthsCount === 1 ? 'año' : 'años'}`;
    } else if (item.kind === 'anniversary') {
      celebrationBadge = isToday
        ? `💖 ¡${yearsOrMonthsCount} ${yearsOrMonthsCount === 1 ? 'año' : 'años'} juntos!`
        : `Aniversario #${yearsOrMonthsCount} (${yearsOrMonthsCount} ${
            yearsOrMonthsCount === 1 ? 'año' : 'años'
          })`;
    } else if (item.kind === 'monthiversary') {
      celebrationBadge = isToday
        ? `🥂 ¡Mesiversario #${yearsOrMonthsCount}!`
        : `Mes #${yearsOrMonthsCount} (${yearsOrMonthsCount} ${
            yearsOrMonthsCount === 1 ? 'mes' : 'meses'
          })`;
    } else {
      celebrationBadge = `${yearsOrMonthsCount} ${
        yearsOrMonthsCount === 1 ? 'año' : 'años'
      }`;
    }
  }

  let countdownLabel = '';
  if (isToday) {
    countdownLabel = '¡Es hoy!';
  } else if (daysRemaining === 1) {
    countdownLabel = 'Mañana';
  } else if (daysRemaining > 1) {
    countdownLabel = `Faltan ${daysRemaining} días`;
  } else if (daysRemaining === -1) {
    countdownLabel = 'Fue ayer';
  } else {
    countdownLabel = `Hace ${Math.abs(daysRemaining)} días`;
  }

  return {
    ...item,
    nextOccurrenceDate,
    daysRemaining,
    isToday,
    yearsOrMonthsCount,
    celebrationBadge,
    countdownLabel,
  };
}

/**
 * Ordena las fechas importantes: primero las próximas (de hoy en adelante, menor número de días restantes primero),
 * y al final las no recurrentes que ya pasaron.
 */
export function sortImportantDates(
  items: ImportantDate[],
  now: Date = new Date()
): ComputedImportantDate[] {
  return items
    .filter((i) => i && i.id)
    .map((i) => computeImportantDateInfo(i, now))
    .sort((a, b) => {
      const aUpcoming = a.daysRemaining >= 0 ? 0 : 1;
      const bUpcoming = b.daysRemaining >= 0 ? 0 : 1;
      if (aUpcoming !== bUpcoming) return aUpcoming - bUpcoming;
      if (a.daysRemaining >= 0 && b.daysRemaining >= 0) {
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
        return a.title.localeCompare(b.title);
      }
      return b.daysRemaining - a.daysRemaining;
    });
}

export async function getAllImportantDates(): Promise<ImportantDate[]> {
  return fetchAll<ImportantDate>(TABLE, { orderBy: 'date', ascending: true });
}

export async function getCachedImportantDates(): Promise<ImportantDate[]> {
  return readCache<ImportantDate>(TABLE);
}

export async function saveImportantDate(
  input: UpsertImportantDateInput
): Promise<ImportantDate> {
  const nowIso = new Date().toISOString();
  const existing = input.id
    ? (await readCache<ImportantDate>(TABLE)).find((d) => d.id === input.id)
    : undefined;

  const cleanTitle = sanitizeInput(input.title, 160);
  if (!cleanTitle) {
    throw new Error('El título de la fecha importante es obligatorio.');
  }

  const cleanDate = toLocalDateString(input.date);
  const kind: ImportantDateKind = ['birthday', 'anniversary', 'monthiversary', 'custom'].includes(
    input.kind
  )
    ? input.kind
    : 'custom';

  const owner: UserProfile | null =
    kind === 'birthday'
      ? input.owner === 'Javier' || input.owner === 'Karla'
        ? input.owner
        : null
      : input.owner === 'Javier' || input.owner === 'Karla'
      ? input.owner
      : null;

  const recurringYearly =
    kind === 'monthiversary'
      ? true
      : typeof input.recurring_yearly === 'boolean'
      ? input.recurring_yearly
      : true;

  const row: ImportantDate = {
    id: input.id || generateId(),
    title: cleanTitle,
    kind,
    date: cleanDate,
    recurring_yearly: recurringYearly,
    owner,
    created_by: existing?.created_by || input.created_by,
    created_at: existing?.created_at || nowIso,
  };

  const saved = await upsertRow<ImportantDate>(TABLE, row);
  void rescheduleAllFeatureReminders();

  if (!input.id) {
    try {
      const partner: UserProfile = input.created_by === 'Javier' ? 'Karla' : 'Javier';
      const senderName = input.created_by === 'Karla' ? 'Karlita' : 'Javier';
      void sendPartnerPushNotification(
        partner,
        `🎉 Nueva fecha especial`,
        `${senderName} agregó "${cleanTitle}" (${cleanDate}).`,
        { type: 'IMPORTANT_DATE_ADDED', id: saved.id, sender: input.created_by }
      );
    } catch {}
  }

  return saved;
}

export async function deleteImportantDate(id: string): Promise<void> {
  await deleteRow(TABLE, id);
  void rescheduleAllFeatureReminders();
}

export function subscribeImportantDates(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

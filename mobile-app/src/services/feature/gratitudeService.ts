import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { getHomeState } from '../CoupleSyncService';
import { sendPartnerPushNotification } from '../NotificationService';
import { fetchAll, upsertRow, subscribeTable } from './featureStore';

export type GratitudeEntryRow = {
  id?: string;
  entry_date: string;
  profile: UserProfile;
  text: string;
  created_at?: string;
  updated_at?: string;
};

export interface GratitudeDayGroup {
  date: string;
  monthKey: string; // 'YYYY-MM'
  javier?: GratitudeEntryRow;
  karla?: GratitudeEntryRow;
}

const TABLE = 'gratitude_entries';

/**
 * Obtiene todas las entradas del diario de gratitud ordenadas de más reciente a más antigua.
 * Exportada también para uso del libro de amor / exportación.
 */
export async function getGratitudeEntries(): Promise<GratitudeEntryRow[]> {
  return fetchAll<GratitudeEntryRow>(TABLE, {
    orderBy: 'entry_date',
    ascending: false,
    limit: 500,
  });
}

export async function saveGratitudeEntry(params: {
  profile: UserProfile;
  text: string;
  date?: string;
}): Promise<GratitudeEntryRow> {
  const dateStr = toLocalDateString(params.date || new Date());
  const cleanText = sanitizeInput(params.text, 1000);
  if (!cleanText) {
    throw new Error('Escribe algo por lo que agradeces hoy.');
  }

  const now = new Date().toISOString();
  const saved = await upsertRow<GratitudeEntryRow>(
    TABLE,
    {
      entry_date: dateStr,
      profile: params.profile,
      text: cleanText,
      updated_at: now,
    },
    {
      onConflict: 'entry_date,profile',
      matchKeys: ['entry_date', 'profile'],
    }
  );

  // Push a la pareja
  try {
    const partner: UserProfile = params.profile === 'Javier' ? 'Karla' : 'Javier';
    const senderName = params.profile === 'Karla' ? 'Karlita' : 'Javier';
    await sendPartnerPushNotification(
      partner,
      `🌷 Diario de gratitud`,
      `${senderName} escribió por qué da gracias hoy: "${cleanText.slice(0, 90)}"`,
      { type: 'GRATITUDE_ENTRY', date: dateStr, sender: params.profile }
    );
  } catch {
    // Ignorar error de push
  }

  return saved;
}

export function subscribeGratitudeEntries(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

export function groupGratitudeByDate(entries: GratitudeEntryRow[]): GratitudeDayGroup[] {
  const map = new Map<string, { javier?: GratitudeEntryRow; karla?: GratitudeEntryRow }>();

  for (const e of entries) {
    if (!e || !e.entry_date) continue;
    const date = toLocalDateString(e.entry_date);
    const item = map.get(date) || {};
    if (e.profile === 'Javier') item.javier = e;
    if (e.profile === 'Karla') item.karla = e;
    map.set(date, item);
  }

  return Array.from(map.entries())
    .map(([date, pair]) => ({
      date,
      monthKey: date.slice(0, 7),
      javier: pair.javier,
      karla: pair.karla,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

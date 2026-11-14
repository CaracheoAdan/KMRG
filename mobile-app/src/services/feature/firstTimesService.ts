import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { SupabaseMediaService } from '../SupabaseMediaService';
import { sendPartnerPushNotification } from '../NotificationService';
import { getPartnerPushToken } from './pushTokenService';
import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';

export type FirstTimeItem = {
  id: string;
  title: string;
  category: string;
  event_date: string; // 'YYYY-MM-DD'
  notes: string | null;
  photo_url: string | null;
  created_by: UserProfile;
  created_at: string;
};

export interface UpsertFirstTimeInput {
  id?: string;
  title: string;
  category?: string;
  event_date: string;
  notes?: string | null;
  photo_url?: string | null;
  created_by: UserProfile;
}

export interface FirstTimePreset {
  id: string;
  title: string;
  category: string;
  emoji: string;
}

const TABLE = 'first_times';

export const FIRST_TIME_CATEGORIES = [
  'Especial',
  'Viaje',
  'Cita',
  'Celebración',
  'Hogar',
  'Aventura',
] as const;

export const FIRST_TIME_PRESETS: FirstTimePreset[] = [
  {
    id: 'preset-1',
    title: 'Nuestro primer viaje',
    category: 'Viaje',
    emoji: '✈️',
  },
  {
    id: 'preset-2',
    title: 'Nuestro primer concierto',
    category: 'Aventura',
    emoji: '🎶',
  },
  {
    id: 'preset-3',
    title: 'Primera Navidad juntos',
    category: 'Celebración',
    emoji: '🎄',
  },
  {
    id: 'preset-4',
    title: 'Primera vez cocinando juntos',
    category: 'Hogar',
    emoji: '👩‍🍳',
  },
  {
    id: 'preset-5',
    title: 'Primera película en el cine',
    category: 'Cita',
    emoji: '🍿',
  },
  {
    id: 'preset-6',
    title: 'Nuestro primer aniversario',
    category: 'Especial',
    emoji: '👑',
  },
];

function sortChronologically(items: FirstTimeItem[]): FirstTimeItem[] {
  return [...items].sort((a, b) => {
    const da = toLocalDateString(a.event_date);
    const db = toLocalDateString(b.event_date);
    if (da !== db) return da.localeCompare(db);
    return (a.created_at || '').localeCompare(b.created_at || '');
  });
}

/**
 * Obtiene todas las "Primeras Veces" ordenadas cronológicamente.
 * Exportada también para el Libro de Amor (LoveBookModal).
 */
export async function getAllFirstTimes(): Promise<FirstTimeItem[]> {
  const rows = await fetchAll<FirstTimeItem>(TABLE, {
    orderBy: 'event_date',
    ascending: true,
    limit: 500,
  });
  return sortChronologically(rows);
}

export async function getCachedFirstTimes(): Promise<FirstTimeItem[]> {
  const rows = await readCache<FirstTimeItem>(TABLE);
  return sortChronologically(rows);
}

export async function saveFirstTime(input: UpsertFirstTimeInput): Promise<FirstTimeItem> {
  const cleanTitle = sanitizeInput(input.title, 160);
  if (!cleanTitle) {
    throw new Error('Escribe el título de esta primera vez.');
  }

  const cleanCategory = sanitizeInput(input.category || 'Especial', 60) || 'Especial';
  const cleanDate = toLocalDateString(input.event_date);
  const cleanNotes = input.notes ? sanitizeInput(input.notes, 1000) || null : null;

  const existing = input.id
    ? (await readCache<FirstTimeItem>(TABLE)).find((item) => item.id === input.id)
    : undefined;

  let finalPhotoUrl: string | null = input.photo_url ?? existing?.photo_url ?? null;
  if (
    finalPhotoUrl &&
    (finalPhotoUrl.startsWith('file://') ||
      finalPhotoUrl.startsWith('/') ||
      finalPhotoUrl.startsWith('data:image/'))
  ) {
    try {
      finalPhotoUrl = await SupabaseMediaService.uploadPhoto(finalPhotoUrl, 'memories');
    } catch {
      // Conservar URI local en caso de estar offline
    }
  }

  const nowIso = new Date().toISOString();
  const row: FirstTimeItem = {
    id: input.id || generateId(),
    title: cleanTitle,
    category: cleanCategory,
    event_date: cleanDate,
    notes: cleanNotes,
    photo_url: finalPhotoUrl,
    created_by: existing?.created_by || input.created_by,
    created_at: existing?.created_at || nowIso,
  };

  const saved = await upsertRow<FirstTimeItem>(TABLE, row);

  if (!input.id) {
    try {
      const partner: UserProfile = input.created_by === 'Javier' ? 'Karla' : 'Javier';
      const senderName = input.created_by === 'Karla' ? 'Karlita' : 'Javier';
      const token = await getPartnerPushToken(partner);
      if (token) {
        await sendPartnerPushNotification(
          token,
          `🏅 Nueva "Primera Vez" con ${senderName}`,
          `${senderName} guardó el recuerdo: "${cleanTitle}" (${cleanDate}).`,
          { type: 'FIRST_TIME_ADDED', id: saved.id }
        );
      }
    } catch {
      // Ignorar error de push
    }
  }

  return saved;
}

export async function deleteFirstTime(id: string): Promise<void> {
  await deleteRow(TABLE, id);
}

export function subscribeFirstTimes(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

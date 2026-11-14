import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { sendPartnerPushNotification } from '../NotificationService';
import { getPartnerPushToken } from './pushTokenService';
import { syncWidgetData } from '../WidgetSyncService';
import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';

export interface DoodlePoint {
  x: number;
  y: number;
}

export interface DoodleStroke {
  color: string;
  width: number;
  points: DoodlePoint[];
}

export type SharedDoodle = {
  id: string;
  author: UserProfile;
  title: string;
  strokes: DoodleStroke[];
  background_color: string;
  created_at: string;
};

const TABLE = 'shared_doodles';

export const DOODLE_COLORS = [
  '#e11d48', // Rojo amor
  '#9333ea', // Morado Karlita
  '#0284c7', // Azul Javier
  '#059669', // Verde esmeralda
  '#d97706', // Ámbar cálido
  '#ec4899', // Rosa pastel
  '#1e293b', // Tinta oscura
] as const;

export const DOODLE_BRUSH_WIDTHS = [
  { value: 3, label: 'Fino' },
  { value: 6, label: 'Medio' },
  { value: 11, label: 'Grueso' },
] as const;

export const NAPKIN_BACKGROUNDS = [
  { value: '#fffdf6', label: 'Servilleta crema' },
  { value: '#fff0f3', label: 'Rosa suave' },
  { value: '#f3e8ff', label: 'Lavanda' },
  { value: '#fef9c3', label: 'Post-it cálido' },
] as const;

export function pointsToSvgPath(points?: DoodlePoint[] | null): string {
  if (!points || !Array.isArray(points) || points.length === 0) return '';
  const valid = points.filter((pt) => pt && typeof pt.x === 'number' && typeof pt.y === 'number');
  if (valid.length === 0) return '';
  if (valid.length === 1) {
    const p = valid[0];
    const x = Math.round(p.x * 10) / 10;
    const y = Math.round(p.y * 10) / 10;
    return `M ${x} ${y} L ${x + 0.5} ${y + 0.5}`;
  }
  return valid
    .map((pt, index) => {
      const x = Math.round(pt.x * 10) / 10;
      const y = Math.round(pt.y * 10) / 10;
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');
}

export interface DoodleBoundingBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

export function getDoodleBoundingBox(strokes?: DoodleStroke[] | null): DoodleBoundingBox {
  if (!strokes || !Array.isArray(strokes) || strokes.length === 0) {
    return { minX: 0, minY: 0, width: 350, height: 310 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of strokes) {
    if (!s || !Array.isArray(s.points)) continue;
    for (const p of s.points) {
      if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') continue;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, width: 350, height: 310 };
  }

  const pad = 16;
  const clampedMinX = Math.max(0, minX - pad);
  const clampedMinY = Math.max(0, minY - pad);
  const width = Math.max(80, maxX - clampedMinX + pad);
  const height = Math.max(80, maxY - clampedMinY + pad);

  return {
    minX: Math.round(clampedMinX),
    minY: Math.round(clampedMinY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

function normalizeStrokes(raw: unknown): DoodleStroke[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object' && Array.isArray((s as any).points))
    .map((s: any) => {
      const cleanedPoints: DoodlePoint[] = [];
      for (const pt of s.points as any[]) {
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') continue;
        const next = {
          x: Math.round(pt.x * 10) / 10,
          y: Math.round(pt.y * 10) / 10,
        };
        const prev = cleanedPoints[cleanedPoints.length - 1];
        if (prev) {
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          if (dx * dx + dy * dy < 6) continue;
        }
        cleanedPoints.push(next);
      }
      return {
        color: typeof s.color === 'string' ? s.color : '#e11d48',
        width: typeof s.width === 'number' && s.width > 0 ? s.width : 5,
        points: cleanedPoints,
      };
    })
    .filter((s) => s.points.length > 0);
}

export async function getAllDoodles(force = false): Promise<SharedDoodle[]> {
  const rows = await fetchAll<SharedDoodle>(TABLE, {
    orderBy: 'created_at',
    ascending: false,
    limit: 40,
    force,
  });
  return rows
    .map((r) => ({
      ...r,
      strokes: normalizeStrokes(r.strokes),
      background_color: r.background_color || '#fffdf6',
    }))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getCachedDoodles(): Promise<SharedDoodle[]> {
  const rows = await readCache<SharedDoodle>(TABLE);
  return rows
    .map((r) => ({
      ...r,
      strokes: normalizeStrokes(r.strokes),
      background_color: r.background_color || '#fffdf6',
    }))
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function saveDoodle(input: {
  author: UserProfile;
  title?: string;
  strokes: DoodleStroke[];
  background_color?: string;
}): Promise<SharedDoodle> {
  const cleanStrokes = normalizeStrokes(input.strokes);
  if (cleanStrokes.length === 0) {
    throw new Error('Dibuja algo en la servilleta antes de dedicarlo.');
  }

  const cleanTitle =
    sanitizeInput(input.title || 'Dibujito para ti', 160) || 'Dibujito para ti';
  const bg = sanitizeInput(input.background_color || '#fffdf6', 20) || '#fffdf6';
  const nowIso = new Date().toISOString();

  const row: SharedDoodle = {
    id: generateId(),
    author: input.author,
    title: cleanTitle,
    strokes: cleanStrokes,
    background_color: bg,
    created_at: nowIso,
  };

  const saved = await upsertRow<SharedDoodle>(TABLE, row);

  try {
    const partner: UserProfile = input.author === 'Javier' ? 'Karla' : 'Javier';
    const senderName = input.author === 'Karla' ? 'Karlita' : 'Javier';
    const token = await getPartnerPushToken(partner);
    if (token) {
      await sendPartnerPushNotification(
        token,
        `🎨 ¡Notita dibujada de ${senderName}!`,
        `${senderName} te dedicó un dibujo: "${cleanTitle}". ¡Entra para verlo!`,
        { type: 'SHARED_DOODLE_ADDED', doodleId: saved.id }
      );
    }
    void syncWidgetData({
      noteText: `🎨 "${cleanTitle}"`,
      noteSender: senderName,
      isDoodleNote: true,
      doodleTitle: cleanTitle,
    });
  } catch {
    // Ignorar error de push o widget
  }

  return saved;
}

export async function deleteDoodle(id: string): Promise<void> {
  await deleteRow(TABLE, id);
}

export function subscribeDoodles(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

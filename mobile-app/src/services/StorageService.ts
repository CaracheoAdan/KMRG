import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Message, Milestone } from '../types';

const PROFILE_KEY = '@kmrg_current_profile';
const MESSAGES_KEY = '@kmrg_messages_cache';
const MILESTONES_KEY = '@kmrg_milestones_cache';

export const LOVE_NICKNAMES = [
  'Karlita',
  'Mi Amor',
  'Flaquita',
  'Preciosa',
  'Hermosa',
  'Meme',
  'Mi Vida',
  'Mi Alma',
];

/**
 * Obtiene el perfil actual seleccionado en el teléfono ('Javier' o 'Karla')
 * Si no está configurado, retorna null para mostrar la pantalla de corazones inicial
 */
export const getCurrentProfile = async (): Promise<UserProfile | null> => {
  try {
    const profile = await AsyncStorage.getItem(PROFILE_KEY);
    if (profile === 'Javier' || profile === 'Karla') return profile;
    return null;
  } catch {
    return null;
  }
};

export const setCurrentProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, profile);
  } catch (error) {
    console.warn('Error guardando perfil:', error);
  }
};

export const resetCurrentProfile = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.warn('Error reseteando perfil:', error);
  }
};

/**
 * Formatea fechas a YYYY-MM-DD sin desfase horario.
 * Si dateInput ya es un string YYYY-MM-DD, lo preserva directamente sin parsear a UTC.
 */
export const toLocalDateString = (dateInput?: string | Date | null): string => {
  if (!dateInput) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    // Si ya empieza con YYYY-MM-DD (e.g. "2026-10-24" o "2026-10-24T00:00:00")
    if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return trimmed.substring(0, 10);
    }
    // Si viene en otro formato de texto
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const SPANISH_MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const SPANISH_MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

export const formatDisplayDate = (
  dateInput?: string | Date | null,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return '';
  try {
    const str = toLocalDateString(dateInput);
    const parts = str.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return String(dateInput);
    const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    if (isNaN(d.getTime())) return String(dateInput);

    try {
      return d.toLocaleDateString(
        'es-ES',
        options || {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        }
      );
    } catch {
      const day = parts[2];
      const monthIdx = parts[1] - 1;
      const isShort = options?.month === 'short';
      const monthStr = (isShort ? SPANISH_MONTHS_SHORT : SPANISH_MONTHS_LONG)[monthIdx] || `${parts[1]}`;
      return `${day} ${monthStr}`;
    }
  } catch {
    return String(dateInput || '');
  }
};

export const toLocalDateAtHour = (dateInput: string | Date, hour: number): Date => {
  const [year, month, day] = toLocalDateString(dateInput).split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
};

export interface TimeTogetherBreakdown {
  totalDays: number;
  years: number;
  months: number;
  days: number;
}

/**
 * Calcula con precisión de calendario real el tiempo transcurrido desde el aniversario.
 * Respeta la duración exacta de cada mes (28, 30, 31 días) en lugar de aproximar con meses fijos de 30 días.
 */
export const calculateTimeTogether = (
  anniversaryDateStr?: string | null,
  nowInput: Date = new Date()
): TimeTogetherBreakdown => {
  if (!anniversaryDateStr) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }

  const clean = toLocalDateString(anniversaryDateStr);
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }
  const [startYear, startMonth, startDay] = parts;

  const start = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const now = new Date(
    nowInput.getFullYear(),
    nowInput.getMonth(),
    nowInput.getDate(),
    0,
    0,
    0,
    0
  );

  if (now.getTime() < start.getTime()) {
    return { totalDays: 0, years: 0, months: 0, days: 0 };
  }

  // 1. Días totales exactos
  const diffMs = now.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 2. Desglose exacto de calendario (Años, Meses, Días)
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    // Tomar los días del mes inmediatamente anterior al mes de `now`
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    totalDays,
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
};

/**
 * Caché local de Mensajes
 */
export const getCachedMessages = async (): Promise<Message[]> => {
  try {
    const raw = await AsyncStorage.getItem(MESSAGES_KEY);
    if (!raw) return [];
    const parsed: Message[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCachedMessages = async (messages: Message[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch (error) {
    console.warn('Error guardando mensajes en caché local:', error);
  }
};

/**
 * Obtiene la carta del día o más reciente para el usuario actual.
 * BLINDAJE: Solo devuelve cartas cuya fecha ya llegó (scheduled_date <= HOY),
 * protegiendo las sorpresas futuras escritas por la pareja.
 */
export const getTodayMessage = async (profile: UserProfile): Promise<Message | null> => {
  try {
    const messages = await getCachedMessages();
    const todayStr = toLocalDateString(new Date());

    // PRIVACIDAD ESTRICTA:
    // Solo cartas dirigidas al destinatario actual cuya fecha de apertura ya llegó (scheduled_date <= HOY).
    const myUnlockedMessages = messages.filter((m) => {
      const recipient = m.recipient === 'Ella' ? 'Karla' : m.recipient;
      const isTargetRecipient = recipient ? recipient === profile : m.sender !== profile;
      const isUnlocked = toLocalDateString(m.scheduled_date) <= todayStr;
      return isTargetRecipient && isUnlocked;
    });

    // 1. Mensaje exacto del día de hoy
    const exactToday = myUnlockedMessages.find((m) => toLocalDateString(m.scheduled_date) === todayStr);
    if (exactToday) return exactToday;

    // 2. Mensaje desbloqueado más reciente
    const sorted = myUnlockedMessages.sort((a, b) =>
      toLocalDateString(b.scheduled_date).localeCompare(toLocalDateString(a.scheduled_date))
    );

    return sorted.length > 0 ? sorted[0] : null;
  } catch (error) {
    console.warn('Error obteniendo carta de hoy:', error);
    return null;
  }
};

/**
 * Cartas pasadas y del día ya desbloqueadas para la línea de tiempo de 'Nosotros'.
 * PRIVACIDAD: Nunca devuelve cartas de fechas futuras ni cartas dirigidas a otra persona.
 */
export const getPastMessages = async (profile: UserProfile): Promise<Message[]> => {
  try {
    const messages = await getCachedMessages();
    const todayStr = toLocalDateString(new Date());

    return messages
      .filter((m) => {
        const recipient = m.recipient === 'Ella' ? 'Karla' : m.recipient;
        const isTargetRecipient = recipient ? recipient === profile : m.sender !== profile;
        const isUnlocked = toLocalDateString(m.scheduled_date) <= todayStr;
        return isTargetRecipient && isUnlocked;
      })
      .sort((a, b) =>
        toLocalDateString(b.scheduled_date).localeCompare(toLocalDateString(a.scheduled_date))
      );
  } catch {
    return [];
  }
};

/**
 * Cartas enviadas por este perfil (para ver en 'Escribir' > 'Enviadas').
 * PRIVACIDAD: Si la fecha es futura, el contenido de la carta se enmascara
 * como '🔒 Sorpresa sellada 💌' para evitar cualquier filtración antes de tiempo.
 */
export const getSentMessages = async (profile: UserProfile): Promise<Message[]> => {
  try {
    const messages = await getCachedMessages();
    const todayStr = toLocalDateString(new Date());
    return messages
      .filter((m) => m.sender === profile)
      .map((m) => {
        const isFuture = toLocalDateString(m.scheduled_date) > todayStr;
        return isFuture ? { ...m, content: '🔒 Sorpresa sellada 💌' } : m;
      })
      .sort((a, b) =>
        toLocalDateString(b.scheduled_date).localeCompare(toLocalDateString(a.scheduled_date))
      );
  } catch {
    return [];
  }
};

/**
 * Marca un mensaje localmente como leído
 */
export const markMessageAsRead = async (id: string): Promise<void> => {
  try {
    const messages = await getCachedMessages();
    const updated = messages.map((m) => (m.id === id ? { ...m, is_read: true } : m));
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Error marcando mensaje como leído:', error);
  }
};

/**
 * Deduplica una lista de recuerdos eliminando duplicados por ID, por URL de imagen
 * o por firma de autor + fecha + título, priorizando elementos canónicos de Supabase sobre 'local-'.
 */
export const deduplicateMilestones = (list: Milestone[]): Milestone[] => {
  if (!Array.isArray(list) || list.length === 0) return [];

  const seenIds = new Set<string>();
  const seenImageUrls = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Milestone[] = [];

  // Priorizar hitos canónicos de Supabase (sin prefijo 'local-')
  const sorted = [...list].sort((a, b) => {
    const aIsLocal = a.id?.startsWith('local-') ? 1 : 0;
    const bIsLocal = b.id?.startsWith('local-') ? 1 : 0;
    if (aIsLocal !== bIsLocal) return aIsLocal - bIsLocal;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  for (const m of sorted) {
    if (!m || !m.id) continue;
    if (seenIds.has(m.id)) continue;

    const img = (m.image_url || '').trim();
    const sig = `${(m.author || '').toLowerCase()}_${toLocalDateString(m.date)}_${(m.title || '').trim().toLowerCase()}`;

    // Si la URL de imagen ya existe, es el mismo recuerdo duplicado
    if (img && seenImageUrls.has(img)) {
      continue;
    }
    // Si coinciden autor, fecha y título exacto, es el mismo recuerdo duplicado
    if (seenSignatures.has(sig)) {
      continue;
    }

    seenIds.add(m.id);
    if (img) seenImageUrls.add(img);
    seenSignatures.add(sig);
    result.push(m);
  }

  return result.sort((a, b) =>
    toLocalDateString(a.date).localeCompare(toLocalDateString(b.date))
  );
};

/**
 * Caché local de Recuerdos / Hitos (siempre deduplicada)
 */
export const getCachedMilestones = async (): Promise<Milestone[]> => {
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_KEY);
    if (!raw) return [];
    const parsed: Milestone[] = JSON.parse(raw);
    return Array.isArray(parsed) ? deduplicateMilestones(parsed) : [];
  } catch {
    return [];
  }
};

export const saveCachedMilestones = async (milestones: Milestone[]): Promise<void> => {
  try {
    const clean = deduplicateMilestones(milestones);
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(clean));
  } catch (error) {
    console.warn('Error guardando hitos en caché local:', error);
  }
};

export const addLocalMilestone = async (milestone: {
  author: UserProfile;
  title: string;
  date: string;
  image_url: string;
}): Promise<Milestone> => {
  const newMilestone: Milestone = {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    author: milestone.author,
    title: milestone.title.trim(),
    date: milestone.date,
    image_url: milestone.image_url,
    created_at: new Date().toISOString(),
  };

  const existing = await getCachedMilestones();
  const updated = deduplicateMilestones([...existing, newMilestone]);

  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
  return newMilestone;
};

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
 * Formatea fechas a YYYY-MM-DD sin desfase horario
 */
export const toLocalDateString = (dateInput: string | Date): string => {
  if (typeof dateInput === 'string' && dateInput.includes('T')) {
    return dateInput.substring(0, 10);
  }
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (
  dateInput: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const str = toLocalDateString(dateInput);
  const [year, month, day] = str.split('-').map(Number);
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return d.toLocaleDateString(
    'es-ES',
    options || {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }
  );
};

export const toLocalDateAtHour = (dateInput: string | Date, hour: number): Date => {
  const [year, month, day] = toLocalDateString(dateInput).split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
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
        return isFuture
          ? { ...m, content: '🔒 Sorpresa sellada 💌' }
          : m;
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
 * Caché local de Recuerdos / Hitos
 */
export const getCachedMilestones = async (): Promise<Milestone[]> => {
  try {
    const raw = await AsyncStorage.getItem(MILESTONES_KEY);
    if (!raw) return [];
    const parsed: Milestone[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCachedMilestones = async (milestones: Milestone[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(milestones));
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
  const updated = [...existing, newMilestone].sort((a, b) =>
    toLocalDateString(a.date).localeCompare(toLocalDateString(b.date))
  );

  await AsyncStorage.setItem(MILESTONES_KEY, JSON.stringify(updated));
  return newMilestone;
};

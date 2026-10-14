import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../types';

const STORAGE_KEY = '@kmrg_messages_cache';

/**
 * Formatea una fecha o string ISO a YYYY-MM-DD en la zona horaria local
 */
export const toLocalDateString = (dateInput: string | Date): string => {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene todos los mensajes almacenados en la caché local
 */
export const getCachedMessages = async (): Promise<Message[]> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: Message[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Error leyendo mensajes de almacenamiento local:', error);
    return [];
  }
};

/**
 * Guarda o actualiza los mensajes en el almacenamiento local (merge por id)
 */
export const saveCachedMessages = async (newMessages: Message[]): Promise<void> => {
  try {
    const existing = await getCachedMessages();
    const map = new Map<string, Message>();

    // Indexar existentes
    for (const msg of existing) {
      map.set(msg.id, msg);
    }

    // Sobrescribir / agregar nuevos
    for (const msg of newMessages) {
      map.set(msg.id, msg);
    }

    const merged = Array.from(map.values());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn('Error guardando mensajes en almacenamiento local:', error);
  }
};

/**
 * Retorna el mensaje del día de hoy (scheduled_date === HOY)
 * Si no hay uno exacto de hoy, busca el mensaje más reciente desbloqueado (scheduled_date <= HOY)
 */
export const getTodayMessage = async (): Promise<Message | null> => {
  try {
    const messages = await getCachedMessages();
    const todayStr = toLocalDateString(new Date());

    // 1. Buscar coincidencia exacta con el día de hoy
    const exactToday = messages.find((m) => toLocalDateString(m.scheduled_date) === todayStr);
    if (exactToday) return exactToday;

    // 2. Si no hay exacto de hoy, devolver el mensaje desbloqueado más reciente
    const unlocked = messages
      .filter((m) => toLocalDateString(m.scheduled_date) <= todayStr)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());

    return unlocked.length > 0 ? unlocked[0] : null;
  } catch (error) {
    console.warn('Error obteniendo mensaje de hoy:', error);
    return null;
  }
};

/**
 * Retorna todos los mensajes pasados (scheduled_date < HOY) para la línea de tiempo
 */
export const getPastMessages = async (): Promise<Message[]> => {
  try {
    const messages = await getCachedMessages();
    const todayStr = toLocalDateString(new Date());

    return messages
      .filter((m) => toLocalDateString(m.scheduled_date) < todayStr)
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
  } catch (error) {
    console.warn('Error obteniendo mensajes pasados:', error);
    return [];
  }
};

/**
 * Marca un mensaje local como leído
 */
export const markMessageAsRead = async (id: string): Promise<void> => {
  try {
    const messages = await getCachedMessages();
    const updated = messages.map((m) => (m.id === id ? { ...m, is_read: true } : m));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Error marcando mensaje como leído:', error);
  }
};

import axios from 'axios';
import { API_URL, MOBILE_API_KEY } from '../config/env';
import { Message, ApiResponse } from '../types';
import { saveCachedMessages, getCachedMessages } from './StorageService';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': MOBILE_API_KEY,
  },
});

/**
 * Servicio de sincronización con el backend KMRG
 * Descarga anticipadamente los mensajes futuros y los guarda en caché local.
 * Si no hay conexión, falla en silencio para garantizar una experiencia mágica e ininterrumpida.
 */
export const syncMessages = async (): Promise<Message[]> => {
  try {
    const response = await apiClient.get<ApiResponse<Message[]>>('/mobile/messages/sync');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const remoteMessages = response.data.data;
      await saveCachedMessages(remoteMessages);
      return await getCachedMessages();
    }
  } catch (error) {
    // Manejo de error silencioso: funcionamiento offline transparente
    console.log('[SyncService] Modo sin conexión o servidor no disponible. Usando caché local.');
  }
  return await getCachedMessages();
};

/**
 * Envía una interacción en tiempo real al backend (ej. botón "Pensando en ti")
 */
export const sendInteraction = async (
  type: string = 'thinking_of_you',
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await apiClient.post<ApiResponse<unknown>>('/mobile/interact', {
      type,
      payload: {
        ...payload,
        client_timestamp: new Date().toISOString(),
      },
    });
    return { success: response.data.success ?? true };
  } catch (error: any) {
    const msg = error.response?.data?.message || 'Error al conectar';
    console.log('[SyncService] No se pudo enviar la interacción:', msg);
    return { success: false, message: msg };
  }
};

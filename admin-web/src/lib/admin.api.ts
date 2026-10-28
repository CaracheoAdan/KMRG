import api from './api';

export interface EmergencyResetResult {
  success: boolean;
  message: string;
  payload?: {
    mode: 'cita' | 'full';
    timestamp: string;
    cleanHome: Record<string, unknown>;
  };
}

/**
 * Envía una señal remota de emergencia al backend y Supabase para destrabar
 * la app móvil en los dispositivos de Karla y Javier.
 */
export const triggerEmergencyReset = async (
  mode: 'cita' | 'full' = 'cita'
): Promise<EmergencyResetResult> => {
  const response = await api.post<EmergencyResetResult>('/admin/emergency-reset', {
    mode,
  });
  return response.data;
};

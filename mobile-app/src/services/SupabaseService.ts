import { supabase } from '../config/supabase';
import { Message, Milestone, Interaction, UserProfile } from '../types';
import {
  saveCachedMessages,
  getCachedMessages,
  saveCachedMilestones,
  getCachedMilestones,
  toLocalDateString,
} from './StorageService';

/**
 * Sincroniza mensajes desde Supabase con blindaje de privacidad:
 * En una arquitectura de 2 teléfonos, solo se descargan cartas cuya fecha ya llegó
 * (scheduled_date <= HOY) o aquellas que fueron redactadas por el propio usuario actual.
 * Las cartas futuras dirigidas a este usuario quedan en el servidor hasta su fecha de apertura.
 */
export const syncSupabaseMessages = async (currentProfile?: UserProfile): Promise<Message[]> => {
  try {
    const todayStr = toLocalDateString(new Date());
    let query = supabase
      .from('messages')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (currentProfile) {
      const alias = currentProfile === 'Karla' ? 'Ella' : currentProfile;
      query = query.or(`scheduled_date.lte.${todayStr},sender.eq.${currentProfile},sender.eq.${alias}`);
    } else {
      query = query.lte('scheduled_date', todayStr);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      const local = await getCachedMessages();
      const map = new Map<string, Message>();
      local.forEach((m) => map.set(m.id, m));
      (data as Message[]).forEach((m) => map.set(m.id, m));
      const merged = Array.from(map.values());
      await saveCachedMessages(merged);
      return merged;
    }
  } catch (error) {
    console.log('[SupabaseSync] Modo sin conexión. Usando caché local de mensajes.');
  }
  return await getCachedMessages();
};

/**
 * Publica una carta desde el teléfono
 */
export const createSupabaseMessage = async (msg: {
  sender: UserProfile;
  recipient: UserProfile;
  content: string;
  scheduled_date: string;
  theme_color: string;
}): Promise<{ success: boolean; data?: Message; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          sender: msg.sender,
          recipient: msg.recipient,
          content: msg.content.trim(),
          scheduled_date: msg.scheduled_date,
          theme_color: msg.theme_color,
          is_read: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Actualizar caché local
    await syncSupabaseMessages();
    return { success: true, data: data as Message };
  } catch (error: any) {
    console.warn('Error al guardar mensaje en Supabase:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Marca una carta como leída en Supabase
 */
export const markSupabaseMessageRead = async (id: string): Promise<void> => {
  try {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
  } catch (error) {
    console.log('[SupabaseSync] Lectura guardada solo localmente.');
  }
};

/**
 * Sincroniza hitos y recuerdos desde Supabase
 */
export const syncSupabaseMilestones = async (): Promise<Milestone[]> => {
  try {
    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .order('date', { ascending: true });

    if (!error && Array.isArray(data)) {
      const existing = await getCachedMilestones();
      const localOnly = existing.filter((m) => m.id.startsWith('local-'));
      
      const map = new Map<string, Milestone>();
      for (const m of data as Milestone[]) {
        map.set(m.id, m);
      }
      for (const m of localOnly) {
        map.set(m.id, m);
      }

      const merged = Array.from(map.values()).sort((a, b) =>
        toLocalDateString(a.date).localeCompare(toLocalDateString(b.date))
      );

      await saveCachedMilestones(merged);
      return merged;
    }
  } catch (error) {
    console.log('[SupabaseSync] Modo sin conexión. Usando recuerdos locales.');
  }
  return await getCachedMilestones();
};

/**
 * Sube un nuevo recuerdo a Supabase para que ambos teléfonos lo vean
 */
export const createSupabaseMilestone = async (milestone: {
  author: UserProfile;
  title: string;
  date: string;
  image_url: string;
}): Promise<{ success: boolean; data?: Milestone; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('milestones')
      .insert([
        {
          author: milestone.author,
          title: milestone.title.trim(),
          date: milestone.date,
          image_url: milestone.image_url,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await syncSupabaseMilestones();
    return { success: true, data: data as Milestone };
  } catch (error: any) {
    console.warn('Error al guardar hito en Supabase:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Elimina un recuerdo tanto de Supabase como de la caché local
 */
export const deleteSupabaseMilestone = async (id: string): Promise<boolean> => {
  try {
    if (!id.startsWith('local-')) {
      await supabase.from('milestones').delete().eq('id', id);
    }
    const current = await getCachedMilestones();
    const updated = current.filter((m) => m.id !== id);
    await saveCachedMilestones(updated);
    return true;
  } catch (error) {
    console.warn('Error eliminando hito:', error);
    return false;
  }
};
export const sendSupabaseInteraction = async (
  sender: UserProfile,
  type: string = 'thinking_of_you',
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase.from('interactions').insert([
      {
        sender,
        type,
        payload,
      },
    ]);
    return { success: !error };
  } catch (error) {
    return { success: false };
  }
};

/**
 * Poda interacciones transitorias antiguas (> 3 días) para mantener la base de datos veloz y ligera
 */
export const pruneOldInteractions = async (): Promise<void> => {
  try {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('interactions').delete().lt('created_at', cutoff);
  } catch {
    // Silencioso
  }
};

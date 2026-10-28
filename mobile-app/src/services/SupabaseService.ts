import { supabase } from '../config/supabase';
import { Message, Milestone, Interaction, UserProfile } from '../types';
import {
  saveCachedMessages,
  getCachedMessages,
  saveCachedMilestones,
  getCachedMilestones,
  deduplicateMilestones,
  toLocalDateString,
} from './StorageService';

const VALID_PROFILES = new Set<UserProfile>(['Javier', 'Karla']);

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

    const safeProfile =
      currentProfile && VALID_PROFILES.has(currentProfile) ? currentProfile : undefined;

    if (safeProfile) {
      const alias = safeProfile === 'Karla' ? 'Ella' : safeProfile;
      query = query.or(`scheduled_date.lte.${todayStr},sender.eq.${safeProfile},sender.eq.${alias}`);
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
 * Actualiza una carta existente en Supabase y sincroniza la caché local
 */
export const updateSupabaseMessage = async (
  id: string,
  updates: {
    content?: string;
    scheduled_date?: string;
    theme_color?: string;
  }
): Promise<{ success: boolean; data?: Message; error?: string }> => {
  try {
    const patch: any = {};
    if (updates.content !== undefined) patch.content = updates.content.trim();
    if (updates.scheduled_date !== undefined) patch.scheduled_date = updates.scheduled_date;
    if (updates.theme_color !== undefined) patch.theme_color = updates.theme_color;

    const { data, error } = await supabase
      .from('messages')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await syncSupabaseMessages();
    return { success: true, data: data as Message };
  } catch (error: any) {
    console.warn('Error al actualizar mensaje en Supabase:', error.message);
    try {
      const local = await getCachedMessages();
      const updated = local.map((m) =>
        m.id === id
          ? {
              ...m,
              ...updates,
              content: updates.content !== undefined ? updates.content.trim() : m.content,
            }
          : m
      );
      await saveCachedMessages(updated);
      const found = updated.find((m) => m.id === id);
      return { success: true, data: found };
    } catch {
      return { success: false, error: error.message };
    }
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

      const uploadedImageUrls = new Set(
        (data as Milestone[]).map((m) => (m.image_url || '').trim()).filter(Boolean)
      );
      const uploadedSignatures = new Set(
        (data as Milestone[]).map(
          (m) => `${(m.author || '').toLowerCase()}_${toLocalDateString(m.date)}_${(m.title || '').trim().toLowerCase()}`
        )
      );

      // Conservar solo los recuerdos locales que NO existan ya en Supabase
      const pendingLocalOnly = localOnly.filter((m) => {
        const img = (m.image_url || '').trim();
        if (img && uploadedImageUrls.has(img)) return false;
        const sig = `${(m.author || '').toLowerCase()}_${toLocalDateString(m.date)}_${(m.title || '').trim().toLowerCase()}`;
        if (uploadedSignatures.has(sig)) return false;
        return true;
      });

      const map = new Map<string, Milestone>();
      for (const m of data as Milestone[]) {
        map.set(m.id, m);
      }
      for (const m of pendingLocalOnly) {
        map.set(m.id, m);
      }

      const merged = deduplicateMilestones(Array.from(map.values()));
      await saveCachedMilestones(merged);
      return merged;
    }
  } catch (error) {
    console.log('[SupabaseSync] Modo sin conexión. Usando recuerdos locales.');
  }
  return deduplicateMilestones(await getCachedMilestones());
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

    const newMilestone = data as Milestone;

    // Actualizar caché local agregando el elemento canónico y eliminando cualquier copia local
    const existing = await getCachedMilestones();
    const cleanList = existing.filter(
      (m) =>
        m.id !== newMilestone.id &&
        !(m.image_url && m.image_url.trim() === newMilestone.image_url?.trim()) &&
        !(
          m.title.trim().toLowerCase() === newMilestone.title.trim().toLowerCase() &&
          toLocalDateString(m.date) === toLocalDateString(newMilestone.date) &&
          m.author === newMilestone.author
        )
    );
    const updated = deduplicateMilestones([...cleanList, newMilestone]);
    await saveCachedMilestones(updated);

    return { success: true, data: newMilestone };
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
 * Poda interacciones transitorias antiguas (> 3 días) y estados históricos redundantes
 * para mantener la base de datos veloz, ligera y dentro de los límites de Supabase.
 */
export const pruneOldInteractions = async (): Promise<void> => {
  try {
    // 0. Intentar usar función almacenada del servidor PostgreSQL si está disponible
    const { error: rpcError } = await supabase.rpc('prune_kmrg_interactions');
    if (!rpcError) return;

    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Podar latidos efímeros 'thinking_of_you' con más de 3 días
    await supabase
      .from('interactions')
      .delete()
      .eq('type', 'thinking_of_you')
      .lt('created_at', cutoff);

    // 2. Podar estados antiguos de sync_* conservando siempre las 5 versiones más recientes por cada tipo
    const stateTypes = [
      'sync_home_state',
      'sync_movies_state',
      'sync_games_state',
      'sync_places_state',
    ];

    for (const syncType of stateTypes) {
      const { data } = await supabase
        .from('interactions')
        .select('id, created_at')
        .eq('type', syncType)
        .order('created_at', { ascending: false })
        .range(5, 50);

      if (data && data.length > 0) {
        const idsToDelete = data.map((row) => row.id);
        await supabase.from('interactions').delete().in('id', idsToDelete);
      }
    }
  } catch {
    // Silencioso
  }
};

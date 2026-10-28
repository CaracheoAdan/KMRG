import { useEffect, useState } from 'react';
import { HomeState } from '../types';
import {
  getHomeState,
  subscribeHomeState,
  notifyHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { supabase } from '../config/supabase';

let sharedHomeChannelInitialized = false;

function ensureSharedHomeRealtimeChannel(): void {
  if (sharedHomeChannelInitialized) return;
  sharedHomeChannelInitialized = true;

  supabase
    .channel('kmrg-shared-home-state')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'interactions' },
      (payload: { new?: { type?: string; payload?: Partial<HomeState> } }) => {
        if (payload.new?.type === 'sync_home_state' && payload.new?.payload) {
          notifyHomeState({ ...DEFAULT_HOME_STATE, ...payload.new.payload });
        }
      }
    )
    .subscribe();
}

/**
 * Fuente única del estado de Hoy (racha, mascota, perfiles).
 * Todas las pantallas (header incluido) leen la racha desde aquí reutilizando un único canal Realtime.
 */
export function useHomeState(): HomeState {
  const [home, setHome] = useState<HomeState>(DEFAULT_HOME_STATE);

  useEffect(() => {
    let mounted = true;
    ensureSharedHomeRealtimeChannel();

    void getHomeState().then((s) => {
      if (mounted) setHome(s);
    });

    const unsub = subscribeHomeState((s) => {
      if (mounted) setHome(s);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  return home;
}

export function useStreak(): number {
  return useHomeState().streakCount || 1;
}

import { useEffect, useState } from 'react';
import { HomeState } from '../types';
import {
  getHomeState,
  subscribeHomeState,
  notifyHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { supabase } from '../config/supabase';

/**
 * Fuente única del estado de Hoy (racha, mascota, perfiles).
 * Todas las pantallas (header incluido) leen la racha desde aquí para que siempre coincida.
 */
export function useHomeState(): HomeState {
  const [home, setHome] = useState<HomeState>(DEFAULT_HOME_STATE);

  useEffect(() => {
    let mounted = true;
    void getHomeState().then((s) => {
      if (mounted) setHome(s);
    });

    const unsub = subscribeHomeState((s) => {
      if (mounted) setHome(s);
    });

    const channel = supabase
      .channel(`kmrg-home-state-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload.new?.type === 'sync_home_state' && payload.new?.payload) {
            notifyHomeState({ ...DEFAULT_HOME_STATE, ...payload.new.payload });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      unsub();
      void supabase.removeChannel(channel);
    };
  }, []);

  return home;
}

export function useStreak(): number {
  return useHomeState().streakCount || 1;
}

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_URL = 'https://pnkhsdoprjssiimwlijc.supabase.co';
const DEFAULT_KEY = 'sb_publishable_FXyQRy0c_S4TyiayCQtAcQ_uJMVLWSZ';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_URL;
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_KEY;

const SUPABASE_URL = (rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http'))
  ? rawUrl.trim()
  : DEFAULT_URL;

const SUPABASE_ANON_KEY = (rawKey && typeof rawKey === 'string' && rawKey.length > 10)
  ? rawKey.trim()
  : DEFAULT_KEY;

let client: any;
try {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  console.error('[Supabase] Error al inicializar cliente principal, usando fallback seguro:', e);
  client = createClient(DEFAULT_URL, DEFAULT_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = client;

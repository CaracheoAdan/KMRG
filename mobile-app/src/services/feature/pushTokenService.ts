import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../../config/supabase';
import { UserProfile } from '../../types';

const HOME_STATE_KEY = '@kmrg_couple_home_state_v2';
const PARTNER_TOKEN_CACHE_PREFIX = '@kmrg_partner_push_token_';

export async function savePushToken(profile: UserProfile, token: string): Promise<void> {
  if (!profile || !token || typeof token !== 'string' || !token.trim()) return;
  const cleanToken = token.trim();
  try {
    await AsyncStorage.setItem(`${PARTNER_TOKEN_CACHE_PREFIX}${profile}`, cleanToken);
  } catch {}
  try {
    await supabase.from('push_tokens').upsert(
      [
        {
          profile,
          token: cleanToken,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'profile' }
    );
  } catch {
    // Ignorar errores de red o tabla no provisionada aún
  }
}

export async function getPartnerPushToken(partner: UserProfile): Promise<string | null> {
  if (!partner) return null;
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('profile', partner)
      .maybeSingle();

    if (!error && data && typeof data.token === 'string' && data.token.trim()) {
      const clean = data.token.trim();
      try {
        await AsyncStorage.setItem(`${PARTNER_TOKEN_CACHE_PREFIX}${partner}`, clean);
      } catch {}
      return clean;
    }
  } catch {
    // Fallback a caché local o homeState.pushTokens
  }

  try {
    const cachedToken = await AsyncStorage.getItem(`${PARTNER_TOKEN_CACHE_PREFIX}${partner}`);
    if (cachedToken && cachedToken.trim()) {
      return cachedToken.trim();
    }
  } catch {}

  try {
    const rawHome = await AsyncStorage.getItem(HOME_STATE_KEY);
    if (rawHome) {
      const parsed = JSON.parse(rawHome);
      const fallbackToken = parsed?.pushTokens?.[partner];
      if (typeof fallbackToken === 'string' && fallbackToken.trim()) {
        return fallbackToken.trim();
      }
    }
  } catch {}

  try {
    const { data } = await supabase
      .from('interactions')
      .select('payload')
      .eq('type', 'sync_home_state')
      .order('created_at', { ascending: false })
      .limit(1);
    const remoteToken = (data?.[0]?.payload as any)?.pushTokens?.[partner];
    if (typeof remoteToken === 'string' && remoteToken.trim()) {
      const clean = remoteToken.trim();
      try {
        await AsyncStorage.setItem(`${PARTNER_TOKEN_CACHE_PREFIX}${partner}`, clean);
      } catch {}
      return clean;
    }
  } catch {}

  return null;
}

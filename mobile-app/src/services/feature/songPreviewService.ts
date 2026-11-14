import AsyncStorage from '@react-native-async-storage/async-storage';

export const SONG_PREVIEW_CACHE_KEY = '@kmrg_song_preview_cache';

export type SongProvider = 'spotify' | 'youtube' | 'apple_music' | 'other';

export interface SongPreviewMetadata {
  url: string;
  provider: SongProvider;
  providerLabel: string;
  title?: string;
  authorName?: string;
  thumbnailUrl?: string;
  fetchedAt: string;
}

const memoryCache = new Map<string, SongPreviewMetadata>();

export function isValidSongUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return /^https?:\/\/\S+/i.test(rawUrl.trim());
}

export function detectSongProvider(rawUrl?: string): SongProvider {
  if (!rawUrl || typeof rawUrl !== 'string') return 'other';
  const lower = rawUrl.trim().toLowerCase();
  if (lower.includes('spotify.com') || lower.includes('spotify.link')) {
    return 'spotify';
  }
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('music.youtube.com')
  ) {
    return 'youtube';
  }
  if (lower.includes('music.apple.com') || lower.includes('itunes.apple.com')) {
    return 'apple_music';
  }
  return 'other';
}

export function getProviderLabel(provider: SongProvider): string {
  switch (provider) {
    case 'spotify':
      return 'Spotify';
    case 'youtube':
      return 'YouTube';
    case 'apple_music':
      return 'Apple Music';
    default:
      return 'Enlace';
  }
}

async function readCacheMap(): Promise<Record<string, SongPreviewMetadata>> {
  try {
    const raw = await AsyncStorage.getItem(SONG_PREVIEW_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeCacheEntry(url: string, meta: SongPreviewMetadata): Promise<void> {
  memoryCache.set(url, meta);
  try {
    const map = await readCacheMap();
    map[url] = meta;
    // Conservar las 100 entradas más recientes
    const keys = Object.keys(map);
    if (keys.length > 100) {
      const sorted = keys.sort((a, b) =>
        (map[a]?.fetchedAt || '').localeCompare(map[b]?.fetchedAt || '')
      );
      for (let i = 0; i < sorted.length - 100; i++) {
        delete map[sorted[i]];
      }
    }
    await AsyncStorage.setItem(SONG_PREVIEW_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignorar error de caché local
  }
}

export async function getCachedSongPreview(rawUrl?: string): Promise<SongPreviewMetadata | null> {
  if (!isValidSongUrl(rawUrl)) return null;
  const cleanUrl = rawUrl!.trim();
  if (memoryCache.has(cleanUrl)) {
    return memoryCache.get(cleanUrl)!;
  }
  const map = await readCacheMap();
  if (map[cleanUrl]) {
    memoryCache.set(cleanUrl, map[cleanUrl]);
    return map[cleanUrl];
  }
  return null;
}

export async function fetchSongPreview(rawUrl?: string): Promise<SongPreviewMetadata | null> {
  if (!isValidSongUrl(rawUrl)) return null;
  const cleanUrl = rawUrl!.trim();

  const cached = await getCachedSongPreview(cleanUrl);
  if (cached && (cached.title || cached.thumbnailUrl || cached.provider === 'apple_music')) {
    return cached;
  }

  const provider = detectSongProvider(cleanUrl);
  const providerLabel = getProviderLabel(provider);

  const baseline: SongPreviewMetadata = {
    url: cleanUrl,
    provider,
    providerLabel,
    fetchedAt: new Date().toISOString(),
  };

  let oembedEndpoint: string | null = null;
  if (provider === 'spotify') {
    oembedEndpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(cleanUrl)}`;
  } else if (provider === 'youtube') {
    oembedEndpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
  }

  if (!oembedEndpoint) {
    await writeCacheEntry(cleanUrl, baseline);
    return baseline;
  }

  try {
    const response = await fetch(oembedEndpoint);
    if (!response.ok) {
      return cached || baseline;
    }
    const data: any = await response.json();
    const enriched: SongPreviewMetadata = {
      url: cleanUrl,
      provider,
      providerLabel,
      title: typeof data?.title === 'string' ? data.title.trim() : undefined,
      authorName: typeof data?.author_name === 'string' ? data.author_name.trim() : undefined,
      thumbnailUrl:
        typeof data?.thumbnail_url === 'string' ? data.thumbnail_url.trim() : undefined,
      fetchedAt: new Date().toISOString(),
    };
    await writeCacheEntry(cleanUrl, enriched);
    return enriched;
  } catch {
    return cached || baseline;
  }
}

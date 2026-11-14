import React, { useEffect, useState } from 'react';
import {
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import {
  detectSongProvider,
  fetchSongPreview,
  getProviderLabel,
  isValidSongUrl,
  SongPreviewMetadata,
  SongProvider,
} from '../../services/feature/songPreviewService';

export interface SongLinkPreviewProps {
  url?: string;
  fallbackTitle?: string;
  fallbackArtist?: string;
  compact?: boolean;
}

function getProviderStyle(
  provider: SongProvider,
  primaryColor: string
): { color: string; icon: string } {
  switch (provider) {
    case 'spotify':
      return { color: '#1DB954', icon: 'musical-notes' };
    case 'youtube':
      return { color: '#FF0000', icon: 'logo-youtube' };
    case 'apple_music':
      return { color: '#FA243C', icon: 'musical-note' };
    default:
      return { color: primaryColor, icon: 'link-outline' };
  }
}

export const SongLinkPreview: React.FC<SongLinkPreviewProps> = ({
  url,
  fallbackTitle,
  fallbackArtist,
  compact = false,
}) => {
  const { colors, primaryColor } = useTheme();
  const [meta, setMeta] = useState<SongPreviewMetadata | null>(null);

  useEffect(() => {
    let active = true;
    if (!isValidSongUrl(url)) {
      setMeta(null);
      return;
    }
    fetchSongPreview(url).then((res) => {
      if (active) setMeta(res);
    });
    return () => {
      active = false;
    };
  }, [url]);

  if (!isValidSongUrl(url)) {
    return null;
  }

  const cleanUrl = url!.trim();
  const provider = meta?.provider || detectSongProvider(cleanUrl);
  const providerLabel = meta?.providerLabel || getProviderLabel(provider);
  const { color: badgeColor, icon: badgeIcon } = getProviderStyle(provider, primaryColor);

  const displayTitle = meta?.title || fallbackTitle || 'Escuchar canción';
  const displayArtist = meta?.authorName || fallbackArtist || providerLabel;
  const thumbSize = compact ? 46 : 56;

  const handleOpen = async () => {
    try {
      await Linking.openURL(cleanUrl);
    } catch {
      // Ignorar si no se puede abrir el enlace
    }
  };

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
        },
      ]}
    >
      {meta?.thumbnailUrl ? (
        <Image
          source={{ uri: meta.thumbnailUrl }}
          style={[
            styles.thumbnail,
            { width: thumbSize, height: thumbSize, borderRadius: compact ? 10 : 12 },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.thumbPlaceholder,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: compact ? 10 : 12,
              backgroundColor: `${badgeColor}18`,
            },
          ]}
        >
          <Ionicons name={badgeIcon as any} size={compact ? 20 : 24} color={badgeColor} />
        </View>
      )}

      <View style={styles.infoCol}>
        <View style={styles.badgeRow}>
          <View style={[styles.providerBadge, { backgroundColor: `${badgeColor}18` }]}>
            <Ionicons name={badgeIcon as any} size={11} color={badgeColor} />
            <Text style={[styles.providerBadgeText, { color: badgeColor }]}>
              {providerLabel}
            </Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {displayTitle}
        </Text>

        {displayArtist ? (
          <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
            {displayArtist}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => void handleOpen()}
        activeOpacity={0.85}
        style={[styles.playBtn, { backgroundColor: primaryColor }]}
        accessibilityRole="button"
        accessibilityLabel={`Reproducir en ${providerLabel}`}
      >
        <Ionicons name="play" size={14} color="#ffffff" />
        <Text style={styles.playBtnText}>Reproducir</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
  containerCompact: {
    padding: 8,
    marginTop: 8,
  },
  thumbnail: {
    backgroundColor: '#0f172a',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  artist: {
    fontSize: 11,
    marginTop: 1,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  playBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

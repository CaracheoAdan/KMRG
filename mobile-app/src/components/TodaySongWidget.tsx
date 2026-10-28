import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  Platform,
  Vibration,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { TodaySongData, UserProfile } from '../types';
import { FONTS } from '../theme/designSystem';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  song?: TodaySongData;
  currentProfile: UserProfile;
  primaryColor: string;
  onSaveSong: (song: TodaySongData) => void;
}

const isSafeHttpUrl = (rawUrl?: string): boolean =>
  Boolean(rawUrl && /^https?:\/\//i.test(rawUrl.trim()));

export const TodaySongWidget: React.FC<Props> = ({
  song,
  currentProfile,
  primaryColor,
  onSaveSong,
}) => {
  const { colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [dedication, setDedication] = useState('');
  const [url, setUrl] = useState('');

  const handleOpenModal = () => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setDedication(song.dedication || '');
      setUrl(song.url || '');
    } else {
      setTitle('');
      setArtist('');
      setDedication('');
      setUrl('');
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !artist.trim()) return;

    if (Platform.OS !== 'web') {
      Vibration.vibrate(30);
    }

    const newSong: TodaySongData = {
      title: title.trim(),
      artist: artist.trim(),
      dedication: dedication.trim() || undefined,
      url: url.trim() || undefined,
      addedBy: currentProfile,
      updatedAt: new Date().toISOString(),
    };

    onSaveSong(newSong);
    setIsModalOpen(false);
  };

  const handlePlaySong = async () => {
    if (song?.url && isSafeHttpUrl(song.url)) {
      try {
        await Linking.openURL(song.url.trim());
        return;
      } catch {
        // Fallback: search on YouTube
      }
    }
    if (song) {
      const query = encodeURIComponent(`${song.title} ${song.artist}`);
      void Linking.openURL(`https://www.youtube.com/results?search_query=${query}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="musical-notes-outline" size={18} color={primaryColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nuestra Canción de Hoy</Text>
        </View>
        <TouchableOpacity
          onPress={handleOpenModal}
          style={[styles.editBtn, { backgroundColor: `${primaryColor}15` }]}
        >
          <Ionicons name={song ? 'pencil' : 'add'} size={14} color={primaryColor} />
          <Text style={[styles.editBtnText, { color: primaryColor }]}>
            {song ? 'Cambiar' : 'Dedicar'}
          </Text>
        </TouchableOpacity>
      </View>

      {!song ? (
        <TouchableOpacity
          onPress={handleOpenModal}
          style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}15` }]}>
            <Ionicons name="musical-note" size={24} color={primaryColor} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>¿Cuál es la banda sonora de hoy?</Text>
          <Text style={styles.emptySubtitle}>
            Dedícale una canción a tu pareja para escuchar juntos durante el día.
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.contentRow}>
            {/* Vinilo / Disco animado */}
            <TouchableOpacity
              onPress={handlePlaySong}
              style={[styles.vinylCircle, { backgroundColor: '#0f172a' }]}
              activeOpacity={0.85}
            >
              <View style={[styles.vinylGroove, { borderColor: `${primaryColor}60` }]}>
                <Ionicons name="play" size={18} color="#ffffff" style={{ marginLeft: 2 }} />
              </View>
            </TouchableOpacity>

            <View style={styles.infoCol}>
              <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                {song.title}
              </Text>
              <Text style={[styles.artistName, { color: colors.textSecondary }]} numberOfLines={1}>
                {song.artist}
              </Text>
              <Text style={styles.dedicatedBy}>
                Dedicada por {song.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
              </Text>
            </View>
          </View>

          {!!song.dedication && (
            <View style={[styles.dedicationBox, { borderLeftColor: primaryColor, backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.dedicationText, { color: colors.textSecondary }]}>“{song.dedication}”</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handlePlaySong}
            style={[styles.listenBtn, { backgroundColor: `${primaryColor}12` }]}
          >
            <Ionicons name="logo-youtube" size={16} color={primaryColor} />
            <Text style={[styles.listenBtnText, { color: primaryColor }]}>
              Escuchar en YouTube / Spotify
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Dedicar Canción */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Dedicar Canción de Hoy</Text>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Título de la canción *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Yellow, Por Primera Vez, Saturno..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Artista / Grupo *</Text>
            <TextInput
              value={artist}
              onChangeText={setArtist}
              placeholder="Ej. Coldplay, Camilo, Pablo Alborán..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Dedicatoria especial</Text>
            <TextInput
              value={dedication}
              onChangeText={setDedication}
              placeholder="¿Por qué pensaste en tu amor al escucharla?..."
              placeholderTextColor="#94a3b8"
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              multiline
            />

            <Text style={styles.inputLabel}>Link de Spotify o YouTube (opcional)</Text>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://open.spotify.com/... o https://youtu.be/..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveBtn,
                {
                  backgroundColor:
                    title.trim() && artist.trim() ? primaryColor : '#cbd5e1',
                },
              ]}
              disabled={!title.trim() || !artist.trim()}
            >
              <Ionicons name="heart" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Dedicar a mi Amor</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vinylCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vinylGroove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  artistName: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  dedicatedBy: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 3,
  },
  dedicationBox: {
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  dedicationText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  listenBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  closeBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

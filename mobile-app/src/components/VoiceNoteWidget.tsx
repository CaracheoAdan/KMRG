import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Vibration,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
let AudioModule: any = null;
let FileSystemModule: any = null;

try {
  AudioModule = require('expo-av')?.Audio;
} catch {
  AudioModule = null;
}

try {
  FileSystemModule = require('expo-file-system/legacy');
} catch {
  FileSystemModule = null;
}
import { Ionicons } from './ui/Icon';
import { VoiceNoteData, UserProfile } from '../types';
import { FONTS } from '../theme/designSystem';

interface Props {
  voiceNotes: VoiceNoteData[];
  currentProfile: UserProfile;
  primaryColor: string;
  onSaveVoiceNote: (note: VoiceNoteData) => void;
  onDeleteVoiceNote: (id: string) => void;
}

export const VoiceNoteWidget: React.FC<Props> = ({
  voiceNotes,
  currentProfile,
  primaryColor,
  onSaveVoiceNote,
  onDeleteVoiceNote,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playProgress, setPlayProgress] = useState<number>(0);

  // Estado de grabación
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteTranscript, setNoteTranscript] = useState('');
  const [liveWaveform, setLiveWaveform] = useState<number[]>([
    0.35, 0.6, 0.45, 0.8, 0.5, 0.9, 0.4, 0.75, 0.55, 0.85, 0.5, 0.65, 0.4, 0.7,
  ]);

  const recordingRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const recordedUriRef = useRef<string | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
      }
      if (recordingRef.current) {
        void recordingRef.current.stopAndUnloadAsync();
      }
    };
  }, []);

  const simulatePlayback = (note: VoiceNoteData) => {
    const totalMs = Math.max(3, note.durationSeconds) * 1000;
    const stepMs = 120;
    let elapsed = 0;

    playTimerRef.current = setInterval(() => {
      elapsed += stepMs;
      const ratio = Math.min(1, elapsed / totalMs);
      setPlayProgress(ratio);
      if (ratio >= 1) {
        if (playTimerRef.current) clearInterval(playTimerRef.current);
        setPlayingId(null);
        setPlayProgress(0);
      }
    }, stepMs);
  };

  const handleTogglePlay = async (note: VoiceNoteData) => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }

    if (playingId === note.id) {
      setPlayingId(null);
      setPlayProgress(0);
      return;
    }

    if (Platform.OS !== 'web') {
      Vibration.vibrate(25);
    }

    setPlayingId(note.id);
    setPlayProgress(0);

    if (!note.audioUri || !AudioModule || !FileSystemModule) {
      simulatePlayback(note);
      return;
    }

    try {
      let playUri = note.audioUri;
      if (playUri.startsWith('data:audio/')) {
        const cachePath = `${FileSystemModule.cacheDirectory}vn_${note.id}.m4a`;
        const base64Content = playUri.replace(/^data:audio\/[^;]+;base64,/, '');
        await FileSystemModule.writeAsStringAsync(cachePath, base64Content, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        playUri = cachePath;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await AudioModule.Sound.createAsync(
        { uri: playUri },
        { shouldPlay: true },
        (status: any) => {
          if (!status.isLoaded) return;
          if (status.durationMillis && status.positionMillis) {
            const ratio = Math.min(1, status.positionMillis / status.durationMillis);
            setPlayProgress(ratio);
          }
          if (status.didJustFinish) {
            setPlayingId(null);
            setPlayProgress(0);
          }
        }
      );
      soundRef.current = sound;
    } catch (err) {
      console.warn('Fallo al reproducir audio real, usando modo visual:', err);
      simulatePlayback(note);
    }
  };

  const startRecording = async () => {
    if (!AudioModule) {
      // Fallback visual fluido si el binario del teléfono no tiene el módulo nativo compilado
      setIsRecording(true);
      setRecordSeconds(0);
      if (Platform.OS !== 'web') {
        Vibration.vibrate(40);
      }
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            void stopRecording();
            return 30;
          }
          return prev + 1;
        });
        setLiveWaveform(
          Array.from({ length: 14 }, () => +(0.25 + Math.random() * 0.72).toFixed(2))
        );
      }, 1000);
      return;
    }

    try {
      const permission = await AudioModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso necesario',
          'Se requiere acceso al micrófono para grabar notas de voz.'
        );
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {}
        recordingRef.current = null;
      }

      const { recording } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.LOW_QUALITY,
        (status: any) => {
          if (status.metering !== undefined) {
            const db = Math.max(-60, status.metering);
            const norm = Math.min(1, Math.max(0.18, (db + 60) / 60));
            setLiveWaveform((prev) => [...prev.slice(1), norm]);
          }
        },
        100
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSeconds(0);
      recordedUriRef.current = null;

      if (Platform.OS !== 'web') {
        Vibration.vibrate(40);
      }

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            void stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Error iniciando grabación:', err);
      // Fallback a simulación si el dispositivo no soporta grabación
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
        setLiveWaveform(
          Array.from({ length: 14 }, () => +(0.25 + Math.random() * 0.72).toFixed(2))
        );
      }, 1000);
    }
  };

  const stopRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordedUriRef.current = uri;
      } catch (e) {
        console.warn('Error deteniendo grabación:', e);
      }
      recordingRef.current = null;
    }
  };

  const handleConfirmSave = async () => {
    await stopRecording();
    const uri = recordedUriRef.current;
    let finalAudioUri = uri || '';

    if (uri && FileSystemModule) {
      try {
        const base64Data = await FileSystemModule.readAsStringAsync(uri, {
          encoding: FileSystemModule.EncodingType.Base64,
        });
        if (base64Data) {
          finalAudioUri = `data:audio/m4a;base64,${base64Data}`;
        }
      } catch (err) {
        console.warn('Error leyendo archivo de audio grabado:', err);
      }
    }

    const newNote: VoiceNoteData = {
      id: `vn-${Date.now()}`,
      sender: currentProfile,
      title:
        noteTitle.trim() ||
        `Nota de voz de ${currentProfile === 'Karla' ? 'Karlita' : 'Javier'}`,
      durationSeconds: Math.max(2, recordSeconds || 5),
      waveform: liveWaveform,
      audioUri: finalAudioUri,
      transcript:
        noteTranscript.trim() || 'Escucha este mensaje especial para ti.',
      createdAt: new Date().toISOString(),
    };

    onSaveVoiceNote(newNote);
    setNoteTitle('');
    setNoteTranscript('');
    setRecordSeconds(0);
    recordedUriRef.current = null;
    setIsRecordModalOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="mic-outline" size={18} color={primaryColor} />
          <Text style={styles.sectionTitle}>Notas de Voz</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsRecordModalOpen(true)}
          style={[styles.recordBtn, { backgroundColor: `${primaryColor}15` }]}
        >
          <Ionicons name="mic" size={14} color={primaryColor} />
          <Text style={[styles.recordBtnText, { color: primaryColor }]}>Grabar Nota</Text>
        </TouchableOpacity>
      </View>

      {voiceNotes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Aún no hay notas de voz hoy. Graba un mensaje rápido para sorprender a tu pareja.
          </Text>
        </View>
      ) : (
        voiceNotes.slice(0, 3).map((note) => {
          const isPlaying = playingId === note.id;
          return (
            <View key={note.id} style={styles.voiceCard}>
              <TouchableOpacity
                onPress={() => void handleTogglePlay(note)}
                style={[styles.playButton, { backgroundColor: primaryColor }]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={18}
                  color="#ffffff"
                />
              </TouchableOpacity>

              <View style={styles.voiceCenter}>
                <View style={styles.voiceTopRow}>
                  <Text style={styles.voiceTitle} numberOfLines={1}>
                    {note.title}
                  </Text>
                  <Text style={styles.voiceDuration}>{note.durationSeconds}s</Text>
                </View>

                {/* Barras de Onda de Audio */}
                <View style={styles.waveformRow}>
                  {(note.waveform || liveWaveform).map((bar, idx, arr) => {
                    const activeBar = isPlaying && idx / arr.length <= playProgress;
                    return (
                      <View
                        key={idx}
                        style={[
                          styles.waveBar,
                          {
                            height: Math.max(6, Math.round(bar * 22)),
                            backgroundColor: activeBar ? primaryColor : `${primaryColor}40`,
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {note.transcript ? (
                  <Text style={styles.voiceTranscript} numberOfLines={1}>
                    “{note.transcript}”
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => onDeleteVoiceNote(note.id)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={15} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Modal para grabar nota de voz */}
      <Modal
        visible={isRecordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void stopRecording();
          setIsRecordModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Nota de Voz</Text>
              <TouchableOpacity
                onPress={() => {
                  void stopRecording();
                  setIsRecordModalOpen(false);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={[styles.recorderBox, { backgroundColor: `${primaryColor}0d` }]}>
              <Text style={[styles.timerText, { color: primaryColor }]}>
                00:{String(recordSeconds).padStart(2, '0')} / 00:30
              </Text>

              <View style={styles.liveWaveRow}>
                {liveWaveform.map((val, i) => (
                  <View
                    key={i}
                    style={[
                      styles.liveWaveBar,
                      {
                        height: isRecording ? Math.max(8, val * 34) : 10,
                        backgroundColor: isRecording ? primaryColor : '#cbd5e1',
                      },
                    ]}
                  />
                ))}
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (isRecording) {
                    void stopRecording();
                  } else {
                    void startRecording();
                  }
                }}
                style={[
                  styles.micCircleBtn,
                  { backgroundColor: isRecording ? '#ef4444' : primaryColor },
                ]}
              >
                <Ionicons
                  name={isRecording ? 'stop' : 'mic'}
                  size={26}
                  color="#ffffff"
                />
              </TouchableOpacity>
              <Text style={styles.recorderHint}>
                {isRecording
                  ? 'Grabando onda de voz... Toca para detener'
                  : 'Toca el micrófono para grabar hasta 30 segundos'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Título corto</Text>
            <TextInput
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Ej. Buenos días mi amor"
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Dedicatoria / Subtítulo de voz</Text>
            <TextInput
              value={noteTranscript}
              onChangeText={setNoteTranscript}
              placeholder="Escribe la frase que acompaña tu audio..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={() => void handleConfirmSave()}
              style={[styles.saveBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="send" size={16} color="#ffffff" />
              <Text style={styles.saveBtnText}>Enviar Nota de Voz</Text>
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
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  recordBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  voiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCenter: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  voiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  voiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  voiceDuration: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
    marginVertical: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },
  voiceTranscript: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
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
  recorderBox: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 14,
    fontFamily: FONTS.serif,
  },
  liveWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 40,
    marginBottom: 16,
  },
  liveWaveBar: {
    width: 6,
    borderRadius: 3,
  },
  micCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  recorderHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 12,
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

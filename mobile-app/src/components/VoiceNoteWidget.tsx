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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, []);

  const handleTogglePlay = (note: VoiceNoteData) => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
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
    const totalMs = Math.max(3, note.durationSeconds) * 1000;
    const stepMs = 150;
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

  const startRecording = () => {
    setIsRecording(true);
    setRecordSeconds(0);
    if (Platform.OS !== 'web') {
      Vibration.vibrate(40);
    }

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
  };

  const stopRecording = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleConfirmSave = () => {
    stopRecording();
    const newNote: VoiceNoteData = {
      id: `vn-${Date.now()}`,
      sender: currentProfile,
      title: noteTitle.trim() || `Nota de voz de ${currentProfile === 'Karla' ? 'Karlita' : 'Javier'}`,
      durationSeconds: Math.max(4, recordSeconds || 8),
      waveform: liveWaveform,
      transcript: noteTranscript.trim() || 'Escucha este mensaje especial para ti.',
      createdAt: new Date().toISOString(),
    };
    onSaveVoiceNote(newNote);
    setNoteTitle('');
    setNoteTranscript('');
    setRecordSeconds(0);
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
                onPress={() => handleTogglePlay(note)}
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
          stopRecording();
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
                  stopRecording();
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
                onPress={isRecording ? stopRecording : startRecording}
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
              onPress={handleConfirmSave}
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
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCenter: {
    flex: 1,
  },
  voiceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  voiceDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    marginVertical: 4,
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },
  voiceTranscript: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recorderBox: {
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  liveWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 38,
    marginVertical: 10,
  },
  liveWaveBar: {
    width: 4,
    borderRadius: 2,
  },
  micCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  recorderHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#1e293b',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

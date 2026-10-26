import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Vibration,
  KeyboardAvoidingView,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../components/ui/Icon';
import { QuickNoteMessage, UserProfile, HomeState } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getHomeState,
  saveHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { sendPartnerPushNotification } from '../services/NotificationService';
import { SupabaseMediaService } from '../services/SupabaseMediaService';
import * as ImagePicker from 'expo-image-picker';

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

interface ChatScreenProps {
  navigation?: any;
  onClose?: () => void;
  visible?: boolean;
}

const POCHITO_STICKERS = [
  { id: 'pochito_love', label: 'Enamorado', icon: 'heart', emoji: '🥰' },
  { id: 'pochito_hug', label: 'Abrazo', icon: 'people', emoji: '🫂' },
  { id: 'pochito_kiss', label: 'Beso', icon: 'flame', emoji: '💋' },
  { id: 'pochito_sleep', label: 'Mimitos', icon: 'moon', emoji: '😴' },
  { id: 'pochito_stars', label: 'Estrellitas', icon: 'sparkles', emoji: '✨' },
];

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, onClose, visible }) => {
  const { profile, getDisplayName, getAvatarUri } = useProfile();
  const { colors, isDark, primaryColor } = useTheme();
  const currentProfile = profile || 'Karla';
  const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';
  const partnerName = getDisplayName(partnerRole);
  const partnerAvatar = getAvatarUri(partnerRole);

  const [homeState, setHomeState] = useState<HomeState>(() => DEFAULT_HOME_STATE);
  const petName = homeState.couplePet?.name || 'Pochito';
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);

  // Grabación de Audio / Notas de Voz
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>([
    0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.4, 0.7,
  ]);
  const recordingRef = useRef<any>(null);
  const recordedUriRef = useRef<string | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reproducción de Audio
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const soundRef = useRef<any>(null);

  const scrollRef = useRef<any>(null);

  // Cargar estado inicial y sincronizar
  useEffect(() => {
    let isMounted = true;
    void getHomeState().then((state) => {
      if (isMounted && state) {
        setHomeState(state);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Scroll al final al cargar o recibir mensajes
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [homeState.quickNotes]);

  // Limpiar reproductor al desmontar
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  const handleSendTextMessage = async (textToSend?: string, stickerToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text && !stickerToSend) return;

    if (Platform.OS !== 'web') Vibration.vibrate(20);

    const newMessage: QuickNoteMessage = {
      id: `qn-${Date.now()}`,
      sender: currentProfile,
      text: text || undefined,
      sticker: stickerToSend,
      createdAt: new Date().toISOString(),
    };

    const currentNotes = homeState.quickNotes || [];
    const updatedNotes = [...currentNotes, newMessage].slice(-80);
    const updatedHome: HomeState = {
      ...homeState,
      quickNotes: updatedNotes,
    };

    setHomeState(updatedHome);
    setInputText('');
    setShowStickers(false);

    await saveHomeState(currentProfile, updatedHome);

    // Push notification a la pareja
    const recipientToken = homeState.pushTokens?.[partnerRole];
    if (recipientToken) {
      const preview =
        text ||
        (stickerToSend
          ? `Sticker de ${petName} ${stickerToSend.replace('pochito_', '')}`
          : 'Nuevo mensaje');
      void sendPartnerPushNotification(
        recipientToken,
        `KMRG 💭 Mensaje de ${getDisplayName(currentProfile)}`,
        preview,
        { type: 'CHAT_MESSAGE', sender: currentProfile }
      );
    }
  };

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Se necesita acceso a la galería.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const localUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        // Subir a Supabase Storage con fallback local
        const uploadedUrl = await SupabaseMediaService.uploadPhoto(localUri, 'memories');

        const newMessage: QuickNoteMessage = {
          id: `qn-${Date.now()}`,
          sender: currentProfile,
          photoUrl: uploadedUrl,
          createdAt: new Date().toISOString(),
        };

        const currentNotes = homeState.quickNotes || [];
        const updatedNotes = [...currentNotes, newMessage].slice(-80);
        const updatedHome: HomeState = {
          ...homeState,
          quickNotes: updatedNotes,
        };

        setHomeState(updatedHome);
        await saveHomeState(currentProfile, updatedHome);

        const recipientToken = homeState.pushTokens?.[partnerRole];
        if (recipientToken) {
          void sendPartnerPushNotification(
            recipientToken,
            `KMRG 📸 Foto de ${getDisplayName(currentProfile)}`,
            'Te ha enviado una fotografía en el chat.',
            { type: 'CHAT_PHOTO', sender: currentProfile }
          );
        }
      }
    } catch (e) {
      console.warn('Error al enviar foto:', e);
    }
  };

  // Iniciar grabación de audio
  const handleStartRecording = async () => {
    if (Platform.OS !== 'web') Vibration.vibrate(30);

    if (!AudioModule) {
      // Modo simulación visual si falta el binario nativo
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
        setLiveWaveform(Array.from({ length: 12 }, () => +(0.2 + Math.random() * 0.75).toFixed(2)));
      }, 1000);
      return;
    }

    try {
      const perm = await AudioModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Micrófono requerido', 'Permite el acceso al micrófono para grabar notas de voz.');
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

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Error al iniciar grabación:', err);
      setIsRecording(true);
      setRecordSeconds(0);
    }
  };

  // Detener y Enviar Grabación de Voz
  const handleStopAndSendAudio = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setIsRecording(false);

    let finalAudioUri = '';
    const duration = recordSeconds || 1;

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordedUriRef.current = uri;

        if (uri && FileSystemModule) {
          const base64 = await FileSystemModule.readAsStringAsync(uri, {
            encoding: FileSystemModule.EncodingType.Base64,
          });
          if (base64) {
            finalAudioUri = `data:audio/m4a;base64,${base64}`;
          }
        } else if (uri) {
          finalAudioUri = uri;
        }
      } catch (e) {
        console.warn('Error deteniendo grabación:', e);
      }
      recordingRef.current = null;
    }

    if (!finalAudioUri) {
      // Fallback para simulación
      finalAudioUri = `simulated-voice-${Date.now()}`;
    }

    if (Platform.OS !== 'web') Vibration.vibrate([0, 30, 40]);

    const newMessage: QuickNoteMessage = {
      id: `qn-${Date.now()}`,
      sender: currentProfile,
      audioUri: finalAudioUri,
      audioDurationSeconds: duration,
      createdAt: new Date().toISOString(),
    };

    const currentNotes = homeState.quickNotes || [];
    const updatedNotes = [...currentNotes, newMessage].slice(-80);
    const updatedHome: HomeState = {
      ...homeState,
      quickNotes: updatedNotes,
    };

    setHomeState(updatedHome);
    setRecordSeconds(0);
    await saveHomeState(currentProfile, updatedHome);

    const recipientToken = homeState.pushTokens?.[partnerRole];
    if (recipientToken) {
      void sendPartnerPushNotification(
        recipientToken,
        `KMRG 🎙️ Nota de voz de ${getDisplayName(currentProfile)}`,
        `Te ha enviado un mensaje de voz (${duration}s).`,
        { type: 'CHAT_VOICE', sender: currentProfile }
      );
    }
  };

  // Cancelar grabación
  const handleCancelRecording = async () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Reproducir Nota de Voz
  const handlePlayAudio = async (msg: QuickNoteMessage) => {
    if (!msg.audioUri) return;

    if (playingMessageId === msg.id) {
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
        } catch {}
      }
      setPlayingMessageId(null);
      return;
    }

    if (Platform.OS !== 'web') Vibration.vibrate(20);
    setPlayingMessageId(msg.id);

    if (!AudioModule || msg.audioUri.startsWith('simulated-voice-')) {
      // Simulación visual
      setTimeout(() => {
        setPlayingMessageId(null);
      }, (msg.audioDurationSeconds || 3) * 1000);
      return;
    }

    try {
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
      }

      let playUri = msg.audioUri;
      if (playUri.startsWith('data:audio/') && FileSystemModule) {
        const cachePath = `${FileSystemModule.cacheDirectory}vn_${msg.id}.m4a`;
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
          if (status.didJustFinish) {
            setPlayingMessageId(null);
          }
        }
      );
      soundRef.current = sound;
    } catch (err) {
      console.warn('Error reproduciendo audio:', err);
      setPlayingMessageId(null);
    }
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('Hoy');
    }
  };

  const messages = homeState.quickNotes || [];

  const mainChatView = (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Cabecera del Chat */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.partnerInfo}>
            <View style={styles.avatarBox}>
              {partnerAvatar ? (
                <Image source={{ uri: partnerAvatar }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                  <Text style={[styles.avatarText, { color: primaryColor }]}>
                    {partnerName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={[styles.partnerNameText, { color: colors.text }]}>{partnerName}</Text>
              <Text style={styles.onlineStatusText}>En nuestro rincón íntimo 💕</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') Vibration.vibrate([0, 40, 60]);
              void handleSendTextMessage('¡Te mando un latido gigante! ❤️');
            }}
            style={[styles.quickHeartBtn, { backgroundColor: `${primaryColor}15` }]}
          >
            <Ionicons name="heart" size={20} color={primaryColor} />
          </TouchableOpacity>
        </View>

        {/* Lista de Mensajes del Chat */}
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="chatbubbles" size={38} color={primaryColor} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Tu chat privado con {partnerName}
              </Text>
              <Text style={styles.emptySubtitle}>
                Escríbanse cositas lindas, envíense notas de voz, fotos y stickers de ${petName}.
              </Text>
            </View>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender === currentProfile;
              const isPlaying = playingMessageId === msg.id;
              const sticker = POCHITO_STICKERS.find((s) => s.id === msg.sticker);

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.myMessageRow : styles.partnerMessageRow,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe
                        ? [styles.myBubble, { backgroundColor: primaryColor }]
                        : [styles.partnerBubble, { backgroundColor: colors.surfaceAlt }],
                    ]}
                  >
                    {/* Contenido: Texto */}
                    {msg.text ? (
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.myMessageText : { color: colors.text },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    ) : null}

                    {/* Contenido: Sticker de Pochito */}
                    {sticker ? (
                      <View style={styles.stickerBox}>
                        <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
                        <Text
                          style={[
                            styles.stickerLabel,
                            isMe ? { color: '#ffffff' } : { color: colors.textSecondary },
                          ]}
                        >
                          {petName} {sticker.label}
                        </Text>
                      </View>
                    ) : null}

                    {/* Contenido: Foto */}
                    {msg.photoUrl ? (
                      <Image source={{ uri: msg.photoUrl }} style={styles.chatPhoto} resizeMode="cover" />
                    ) : null}

                    {/* Contenido: Nota de Voz */}
                    {msg.audioUri ? (
                      <TouchableOpacity
                        onPress={() => handlePlayAudio(msg)}
                        style={styles.audioBubbleRow}
                      >
                        <View
                          style={[
                            styles.audioPlayBtn,
                            isMe
                              ? { backgroundColor: '#ffffff' }
                              : { backgroundColor: primaryColor },
                          ]}
                        >
                          <Ionicons
                            name={isPlaying ? 'pause' : 'play'}
                            size={16}
                            color={isMe ? primaryColor : '#ffffff'}
                          />
                        </View>
                        <View style={styles.audioWaveformPlaceholder}>
                          <View
                            style={[
                              styles.miniWaveBar,
                              { height: 16, backgroundColor: isMe ? '#ffffff' : primaryColor },
                            ]}
                          />
                          <View
                            style={[
                              styles.miniWaveBar,
                              { height: 24, backgroundColor: isMe ? '#ffffff' : primaryColor },
                            ]}
                          />
                          <View
                            style={[
                              styles.miniWaveBar,
                              { height: 12, backgroundColor: isMe ? '#ffffff' : primaryColor },
                            ]}
                          />
                          <View
                            style={[
                              styles.miniWaveBar,
                              { height: 20, backgroundColor: isMe ? '#ffffff' : primaryColor },
                            ]}
                          />
                          <View
                            style={[
                              styles.miniWaveBar,
                              { height: 14, backgroundColor: isMe ? '#ffffff' : primaryColor },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.audioDurationText,
                            isMe ? { color: '#ffffff' } : { color: colors.textSecondary },
                          ]}
                        >
                          {msg.audioDurationSeconds || 3}s
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    <Text
                      style={[
                        styles.messageTimeText,
                        isMe ? styles.myTimeText : styles.partnerTimeText,
                      ]}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Selector de Stickers de Pochito */}
        {showStickers && (
          <View style={[styles.stickersTray, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={styles.stickersTrayTitle}>Stickers Exclusivos de {petName}</Text>
            <View style={styles.stickersGrid}>
              {POCHITO_STICKERS.map((stk) => (
                <TouchableOpacity
                  key={stk.id}
                  onPress={() => handleSendTextMessage('', stk.id)}
                  style={styles.stickerGridItem}
                >
                  <Text style={styles.stickerBigEmoji}>{stk.emoji}</Text>
                  <Text style={styles.stickerGridLabel}>{stk.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Barra de Entrada / Grabación */}
        {isRecording ? (
          /* MODO GRABACIÓN DE AUDIO ACTIVO */
          <View style={[styles.recordingBar, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={handleCancelRecording} style={styles.cancelRecBtn}>
              <Ionicons name="trash" size={20} color="#ef4444" />
            </TouchableOpacity>

            <View style={styles.recordingTimerBox}>
              <View style={styles.redRecDot} />
              <Text style={styles.recordingTimerText}>
                {Math.floor(recordSeconds / 60)}:
                {recordSeconds % 60 < 10 ? `0${recordSeconds % 60}` : recordSeconds % 60}
              </Text>
              {/* Live Waveform Bars */}
              <View style={styles.liveWaveContainer}>
                {liveWaveform.map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.liveWaveBar,
                      { height: Math.max(4, h * 24), backgroundColor: primaryColor },
                    ]}
                  />
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleStopAndSendAudio}
              style={[styles.sendVoiceBtn, { backgroundColor: '#10b981' }]}
            >
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        ) : (
          /* MODO ENTRADA ESTÁNDAR */
          <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowStickers((v) => !v)}
              style={styles.actionIconBtn}
            >
              <Ionicons
                name={showStickers ? 'close-circle' : 'happy-outline'}
                size={24}
                color={showStickers ? primaryColor : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePickPhoto} style={styles.actionIconBtn}>
              <Ionicons name="camera-outline" size={24} color={colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border },
              ]}
              placeholder={`Escríbele a ${partnerName}...`}
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />

            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={() => handleSendTextMessage()}
                style={[styles.sendBtn, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="send" size={17} color="#ffffff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleStartRecording}
                style={[styles.micBtn, { backgroundColor: `${primaryColor}20` }]}
              >
                <Ionicons name="mic" size={22} color={primaryColor} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (visible !== undefined) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        {mainChatView}
      </Modal>
    );
  }

  return mainChatView;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  partnerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    position: 'relative',
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  partnerNameText: {
    fontSize: 16,
    fontWeight: '800',
  },
  onlineStatusText: {
    fontSize: 11,
    color: '#64748b',
  },
  quickHeartBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  partnerMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  partnerBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  myMessageText: {
    color: '#ffffff',
  },
  stickerBox: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  stickerEmoji: {
    fontSize: 48,
  },
  stickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  chatPhoto: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  audioBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioWaveformPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 26,
  },
  miniWaveBar: {
    width: 3,
    borderRadius: 2,
  },
  audioDurationText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  messageTimeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  partnerTimeText: {
    color: '#94a3b8',
  },
  stickersTray: {
    padding: 12,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  stickersTrayTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'center',
  },
  stickersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stickerGridItem: {
    alignItems: 'center',
    padding: 6,
  },
  stickerBigEmoji: {
    fontSize: 32,
  },
  stickerGridLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  actionIconBtn: {
    padding: 6,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  cancelRecBtn: {
    padding: 8,
  },
  recordingTimerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redRecDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingTimerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ef4444',
  },
  liveWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 8,
  },
  liveWaveBar: {
    width: 3,
    borderRadius: 2,
  },
  sendVoiceBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

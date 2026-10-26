import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { QuickNoteMessage, UserProfile } from '../types';
import { FONTS } from '../theme/designSystem';

interface Props {
  messages: QuickNoteMessage[];
  currentProfile: UserProfile;
  primaryColor: string;
  onSendNote: (text: string, sticker?: string) => void;
  onClearNotes?: () => void;
}

const POCHITO_STICKERS = [
  { id: 'pochito_love', label: 'Enamorado', icon: 'heart', emoji: '🥰' },
  { id: 'pochito_hug', label: 'Abrazo', icon: 'people', emoji: '🫂' },
  { id: 'pochito_kiss', label: 'Beso', icon: 'flame', emoji: '💋' },
  { id: 'pochito_sleep', label: 'Mimitos', icon: 'moon', emoji: '😴' },
  { id: 'pochito_stars', label: 'Estrellitas', icon: 'sparkles', emoji: '✨' },
];

const QUICK_PRESETS = [
  'Te amo infinito ❤️',
  'Pensando en ti 💭',
  'Ya voy en camino 🚗',
  'Te mando un besito 💋',
  'Mira el cielo ✨',
];

export const QuickNotesWidget: React.FC<Props> = ({
  messages,
  currentProfile,
  primaryColor,
  onSendNote,
}) => {
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);

  const handleSend = (text: string, sticker?: string) => {
    const trimmed = text.trim();
    if (!trimmed && !sticker) return;

    if (Platform.OS !== 'web') {
      Vibration.vibrate(30);
    }

    onSendNote(trimmed, sticker);
    setInputText('');
    setShowStickers(false);
  };

  const recentMessages = messages.slice(-5);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="chatbubbles-outline" size={18} color={primaryColor} />
          <Text style={styles.sectionTitle}>Notitas Rápidas</Text>
        </View>
        <Text style={styles.headerSubtitle}>Chat íntimo al instante</Text>
      </View>

      <View style={styles.card}>
        {recentMessages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-circle-outline" size={32} color={`${primaryColor}60`} />
            <Text style={styles.emptyText}>
              Envíale una frase cortita o un sticker de Pochito para alegrarle el momento.
            </Text>
          </View>
        ) : (
          <View style={styles.messagesList}>
            {recentMessages.map((msg) => {
              const isMe = msg.sender === currentProfile;
              const senderName = msg.sender === 'Karla' ? 'Karlita' : 'Javier';
              const stickerObj = POCHITO_STICKERS.find((s) => s.id === msg.sticker);

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageBubbleWrapper,
                    isMe ? styles.myWrapper : styles.partnerWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMe
                        ? [styles.myBubble, { backgroundColor: primaryColor }]
                        : styles.partnerBubble,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.senderLabel}>{senderName}</Text>
                    )}

                    {stickerObj && (
                      <View style={styles.stickerBadge}>
                        <Text style={styles.stickerEmoji}>{stickerObj.emoji}</Text>
                        <Text
                          style={[
                            styles.stickerLabel,
                            { color: isMe ? '#ffffff' : '#475569' },
                          ]}
                        >
                          Pochito {stickerObj.label}
                        </Text>
                      </View>
                    )}

                    {!!msg.text && (
                      <Text
                        style={[
                          styles.messageText,
                          { color: isMe ? '#ffffff' : '#1e293b' },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    )}

                    <Text
                      style={[
                        styles.messageTime,
                        { color: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8' },
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
            })}
          </View>
        )}

        {/* Barra de Frases Rápidas */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {QUICK_PRESETS.map((preset, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.presetChip, { borderColor: `${primaryColor}30` }]}
              onPress={() => handleSend(preset)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetChipText, { color: primaryColor }]}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Panel Desplegable de Stickers de Pochito */}
        {showStickers && (
          <View style={[styles.stickersContainer, { backgroundColor: `${primaryColor}0d` }]}>
            <Text style={styles.stickersTitle}>Stickers de Pochito</Text>
            <View style={styles.stickersGrid}>
              {POCHITO_STICKERS.map((stk) => (
                <TouchableOpacity
                  key={stk.id}
                  style={styles.stickerBtn}
                  onPress={() => handleSend('', stk.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.stickerBigEmoji}>{stk.emoji}</Text>
                  <Text style={styles.stickerBtnLabel}>{stk.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input con Botón de Enviar y Stickers */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[
              styles.stickerToggleBtn,
              showStickers && { backgroundColor: `${primaryColor}20` },
            ]}
            onPress={() => setShowStickers(!showStickers)}
          >
            <Text style={{ fontSize: 18 }}>🥰</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe una notita con amor..."
            placeholderTextColor="#94a3b8"
            maxLength={140}
            onSubmitEditing={() => handleSend(inputText)}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim().length > 0 ? primaryColor : '#cbd5e1',
              },
            ]}
            disabled={inputText.trim().length === 0}
            onPress={() => handleSend(inputText)}
          >
            <Ionicons name="arrow-up" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
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
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  messagesList: {
    gap: 8,
    marginBottom: 12,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  myWrapper: {
    justifyContent: 'flex-end',
  },
  partnerWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myBubble: {
    borderBottomRightRadius: 4,
  },
  partnerBubble: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  stickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  stickerEmoji: {
    fontSize: 24,
  },
  stickerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stickersContainer: {
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  stickersTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stickerBtn: {
    alignItems: 'center',
    padding: 4,
  },
  stickerBigEmoji: {
    fontSize: 26,
  },
  stickerBtnLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stickerToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

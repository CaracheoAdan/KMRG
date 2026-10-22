import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, Message } from '../types';
import { createSupabaseMessage } from '../services/SupabaseService';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import {
  getCurrentProfile,
  toLocalDateString,
  getSentMessages,
  formatDisplayDate,
} from '../services/StorageService';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const PRESET_COLORS = [
  { hex: '#e63946', label: 'Rojo' },
  { hex: '#9333ea', label: 'Morado' },
  { hex: '#0284c7', label: 'Azul' },
  { hex: '#2a9d8f', label: 'Verde' },
  { hex: '#f4a261', label: 'Cálido' },
];

export const WriteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { primaryColor } = useTheme();
  const [profile, setProfile] = useState<UserProfile>('Javier');
  const [activeTab, setActiveTab] = useState<'write' | 'sent'>('write');
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => toLocalDateString(new Date()));
  const [themeColor, setThemeColor] = useState(primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sentLetters, setSentLetters] = useState<Message[]>([]);
  const [sentPage, setSentPage] = useState(0);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) {
        setProfile(p);
        getSentMessages(p).then(setSentLetters);
      }
    });
  }, []);

  const recipient: UserProfile = profile === 'Javier' ? 'Karla' : 'Javier';
  const recipientDisplay = profile === 'Javier' ? 'Karlita' : 'Javier';

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Mensaje vacío', 'Por favor escribe lo que sientes antes de enviar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createSupabaseMessage({
        sender: profile,
        recipient,
        content: content.trim(),
        scheduled_date: scheduledDate,
        theme_color: themeColor,
      });

      if (result.success) {
        Alert.alert(
          'Carta Programada',
          `Tu carta quedó guardada con candado y se abrirá para ${recipientDisplay} el ${scheduledDate}.`,
          [
            {
              text: 'Aceptar',
              onPress: () => {
                setContent('');
                getSentMessages(profile).then(setSentLetters);
                navigation.navigate('Hoy');
              },
            },
          ]
        );
      } else {
        Alert.alert('Aviso', result.error || 'No se pudo enviar la carta.');
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar la carta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PAGE_SIZE = 3;
  const totalPages = Math.max(1, Math.ceil(sentLetters.length / PAGE_SIZE));
  const visibleSent = sentLetters.slice(sentPage * PAGE_SIZE, (sentPage + 1) * PAGE_SIZE);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fixedViewport}
      >
        {/* Cabecera Compacta + Selector de Vista */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.title}>Para {recipientDisplay}</Text>
            <Text style={styles.subtitle}>Cartas sorpresa con fecha de apertura</Text>
          </View>

          <View style={styles.tabSwitch}>
            <TouchableOpacity
              onPress={() => setActiveTab('write')}
              style={[
                styles.tabBtn,
                activeTab === 'write' && { backgroundColor: primaryColor },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'write' && { color: '#ffffff' },
                ]}
              >
                Escribir
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSentPage(0);
                setActiveTab('sent');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'sent' && { backgroundColor: primaryColor },
              ]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'sent' && { color: '#ffffff' },
                ]}
              >
                Enviadas ({sentLetters.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeTab === 'write' ? (
          <View style={styles.formCard}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Tu Carta de Amor</Text>
              <Text style={styles.charCounter}>{content.length} caracteres</Text>
            </View>

            <TextInput
              multiline
              value={content}
              onChangeText={setContent}
              placeholder={`Escribe aquí lo que sientes por ${recipientDisplay}...`}
              placeholderTextColor="#adb5bd"
              style={[styles.textArea, { borderColor: `${themeColor}40` }]}
              textAlignVertical="top"
            />

            {/* Fila Compacta: Fecha + Color */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerCompact}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar" size={16} color={primaryColor} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dateLabelMini}>APERTURA</Text>
                  <Text style={styles.datePickerSelectedText} numberOfLines={1}>
                    {formatDisplayDate(scheduledDate, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.colorRow}>
                {PRESET_COLORS.map((color) => {
                  const isSelected = themeColor === color.hex;
                  return (
                    <TouchableOpacity
                      key={color.hex}
                      onPress={() => setThemeColor(color.hex)}
                      style={[
                        styles.colorDot,
                        { backgroundColor: color.hex },
                        isSelected && styles.colorDotSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <DatePickerModal
              visible={showDatePicker}
              value={scheduledDate}
              onSelect={(selected) => setScheduledDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de Desbloqueo"
            />

            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                { backgroundColor: themeColor },
                isSubmitting && { opacity: 0.7 },
              ]}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={16} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Programar con Candado</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sentContainer}>
            <View style={{ flex: 1, justifyContent: 'flex-start', gap: 10 }}>
              {visibleSent.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="mail-outline" size={38} color={primaryColor} />
                  <Text style={styles.emptyText}>Aún no has programado cartas.</Text>
                </View>
              ) : (
                visibleSent.map((letter) => {
                  const isFuture =
                    toLocalDateString(letter.scheduled_date) > toLocalDateString(new Date());
                  return (
                    <View key={letter.id} style={styles.sentCard}>
                      <View style={styles.sentTopRow}>
                        <View style={styles.badgeWithDot}>
                          <View
                            style={[styles.colorIndicator, { backgroundColor: letter.theme_color }]}
                          />
                          <Text style={styles.sentDateText}>
                            {formatDisplayDate(letter.scheduled_date)}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.lockStatusBadge,
                            {
                              backgroundColor: isFuture ? `${primaryColor}15` : '#e6f4ea',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isFuture ? 'lock-closed' : 'checkmark-circle'}
                            size={12}
                            color={isFuture ? primaryColor : '#2a9d8f'}
                          />
                          <Text
                            style={[
                              styles.lockStatusText,
                              { color: isFuture ? primaryColor : '#2a9d8f' },
                            ]}
                          >
                            {isFuture ? 'Con candado' : 'Abierta'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.sentSnippet} numberOfLines={2}>
                        “{letter.content}”
                      </Text>
                    </View>
                  );
                })
              )}
            </View>

            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  disabled={sentPage === 0}
                  onPress={() => setSentPage((p) => Math.max(0, p - 1))}
                  style={[styles.pageBtn, sentPage === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={16} color="#1e293b" />
                  <Text style={styles.pageBtnText}>Anterior</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Página {sentPage + 1} de {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={sentPage >= totalPages - 1}
                  onPress={() => setSentPage((p) => Math.min(totalPages - 1, p + 1))}
                  style={[styles.pageBtn, sentPage >= totalPages - 1 && { opacity: 0.4 }]}
                >
                  <Text style={styles.pageBtnText}>Siguiente</Text>
                  <Ionicons name="chevron-forward" size={16} color="#1e293b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  formCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f3f5',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#495057',
  },
  charCounter: {
    fontSize: 11,
    color: '#adb5bd',
  },
  textArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#2b2d42',
    fontFamily: SERIF_FONT,
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  datePickerCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateLabelMini: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
  },
  datePickerSelectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.12 }],
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  sentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  sentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  sentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sentDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  lockStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sentSnippet: {
    fontSize: 13,
    color: '#495057',
    fontFamily: SERIF_FONT,
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
});

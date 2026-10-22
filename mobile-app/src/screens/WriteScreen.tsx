import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
  { hex: '#e63946', label: 'Rojo Pasión' },
  { hex: '#9333ea', label: 'Morado Karlita' },
  { hex: '#0284c7', label: 'Azul Javier' },
  { hex: '#2a9d8f', label: 'Verde Esperanza' },
  { hex: '#f4a261', label: 'Cálido Atardecer' },
];

export const WriteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { primaryColor } = useTheme();
  const [profile, setProfile] = useState<UserProfile>('Javier');
  const [content, setContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => toLocalDateString(new Date()));
  const [themeColor, setThemeColor] = useState(primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sentLetters, setSentLetters] = useState<Message[]>([]);

  useEffect(() => {
    getCurrentProfile().then((p) => {
      if (p) {
        setProfile(p);
        getSentMessages(p).then(setSentLetters);
      }
    });
  }, []);

  const recipient: UserProfile = profile === 'Javier' ? 'Karla' : 'Javier';
  const recipientDisplay = profile === 'Javier' ? 'Karlita (mi amor)' : 'Javier (mi vida)';

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
          '💌 Carta Enviada',
          `Tu carta quedó guardada con candado y se desbloqueará para ${recipientDisplay} el ${scheduledDate}.`,
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
        Alert.alert('Aviso', result.error || 'No se pudo enviar la carta. Revisa tu conexión.');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar la carta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="pencil" size={20} color={primaryColor} />
            </View>
            <Text style={styles.title}>Escribir para {recipientDisplay}</Text>
            <Text style={styles.subtitle}>
              Sorprende a tu pareja con un mensaje que se abrirá en su fecha especial
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Tu Carta de Amor</Text>
            <TextInput
              multiline
              numberOfLines={6}
              value={content}
              onChangeText={setContent}
              placeholder={`Escribe aquí lo que sientes por ${recipient === 'Karla' ? 'Karlita' : 'Javier'}...`}
              placeholderTextColor="#adb5bd"
              style={[styles.textArea, { borderColor: `${themeColor}40` }]}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>{content.length} caracteres</Text>

            <Text style={styles.inputLabel}>Fecha de Desbloqueo</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.datePickerInputButton}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerInputLeft}>
                <View style={[styles.datePickerIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                  <Ionicons name="calendar" size={18} color={primaryColor} />
                </View>
                <View>
                  <Text style={styles.datePickerSelectedText}>
                    {formatDisplayDate(scheduledDate, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.datePickerHint}>Toca para elegir fecha en el calendario</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#adb5bd" />
            </TouchableOpacity>

            <DatePickerModal
              visible={showDatePicker}
              value={scheduledDate}
              onSelect={(selected) => setScheduledDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de Desbloqueo"
            />

            <Text style={styles.inputLabel}>Color Temático</Text>
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
                    {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {content.trim().length > 0 && (
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: `${themeColor}15`,
                    borderColor: `${themeColor}35`,
                  },
                ]}
              >
                <Text style={[styles.previewBadge, { color: themeColor }]}>
                  ASÍ LO LEERÁ {recipient.toUpperCase()}
                </Text>
                <Text style={styles.previewText}>“{content.trim()}”</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSubmit}
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
                  <Ionicons name="send" size={16} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Programar con Candado 🔒</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Cartas que ya has programado para tu pareja */}
          {sentLetters.length > 0 && (
            <View style={styles.sentSection}>
              <View style={styles.sentHeaderRow}>
                <Ionicons name="lock-closed-outline" size={16} color="#6c757d" />
                <Text style={styles.sentTitle}>Cartas que le has preparado</Text>
              </View>
              {sentLetters.map((letter) => {
                const isFuture = toLocalDateString(letter.scheduled_date) > toLocalDateString(new Date());
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
                      <View style={[styles.lockStatusBadge, isFuture ? [styles.lockFuture, { backgroundColor: `${primaryColor}15` }] : styles.lockOpened]}>
                        <Ionicons
                          name={isFuture ? 'lock-closed' : 'checkmark-circle'}
                          size={12}
                          color={isFuture ? primaryColor : '#2a9d8f'}
                        />
                        <Text style={[styles.lockStatusText, { color: isFuture ? primaryColor : '#2a9d8f' }]}>
                          {isFuture ? 'Con candado' : 'Abierta'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.sentSnippet} numberOfLines={2}>
                      “{letter.content}”
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff0f3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
    maxWidth: 300,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
    marginTop: 12,
  },
  textArea: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#2b2d42',
    fontFamily: SERIF_FONT,
    lineHeight: 22,
    minHeight: 120,
  },
  charCounter: {
    fontSize: 11,
    color: '#adb5bd',
    textAlign: 'right',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#2b2d42',
  },
  datePickerInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  datePickerInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  datePickerHint: {
    fontSize: 11,
    color: '#adb5bd',
    marginTop: 2,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  previewBox: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginVertical: 14,
    alignItems: 'center',
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  previewText: {
    fontSize: 16,
    color: '#2b2d42',
    textAlign: 'center',
    fontFamily: SERIF_FONT,
    lineHeight: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sentSection: {
    marginTop: 28,
  },
  sentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#495057',
  },
  sentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
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
  lockFuture: {
    backgroundColor: '#fff0f3',
  },
  lockOpened: {
    backgroundColor: '#e6f4ea',
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
});

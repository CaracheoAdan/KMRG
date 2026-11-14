import React, { useState, useEffect, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
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
  Keyboard,
  Animated,
  Modal,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SupabaseMediaService } from '../services/SupabaseMediaService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale, EmptyState } from '../components/ui/Kit';
import { UserProfile, Message } from '../types';
import {
  createSupabaseMessage,
  updateSupabaseMessage,
  deleteSupabaseMessage,
} from '../services/SupabaseService';
import { DatePickerModal } from '../components/DatePickerModal';
import { AppHeader } from '../components/AppHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useProfile } from '../contexts/ProfileContext';
import {
  getCurrentProfile,
  toLocalDateString,
  getSentMessages,
  getRawMessageById,
  formatDisplayDate,
  encodeLetterWithPhoto,
  parseLetterContentAndPhoto,
} from '../services/StorageService';
import { syncWidgetData } from '../services/WidgetSyncService';
import { sendPartnerPushNotification } from '../services/NotificationService';
import { getHomeState, saveHomeState, DEFAULT_HOME_STATE } from '../services/CoupleSyncService';
import { HomeState } from '../types';

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

const MiniPartnerAvatar: React.FC<{
  uri?: string | null;
  name: string;
  size?: number;
  bgColor: string;
  textColor: string;
}> = ({ uri, name, size = 34, bgColor, textColor }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: Math.max(10, Math.round(size * 0.45)), fontWeight: '800', color: textColor }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

export const WriteScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { colors, isDark, primaryColor } = useTheme();
  const { profile: ctxProfile, getDisplayName, getAvatarUri } = useProfile();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile>(ctxProfile || 'Javier');
  const [activeTab, setActiveTab] = useState<'write' | 'sent'>('write');
  const [content, setContent] = useState('');

  const getTodayString = () => toLocalDateString(new Date());

  const [scheduledDate, setScheduledDate] = useState(() => getTodayString());
  const [themeColor, setThemeColor] = useState(primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSealingEnvelope, setIsSealingEnvelope] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [homeState, setHomeState] = useState<HomeState>(DEFAULT_HOME_STATE);

  const [sealedModalData, setSealedModalData] = useState<{
    scheduledDate: string;
    recipientDisplay: string;
    isUpdate?: boolean;
  } | null>(null);

  const sealAnim = useRef(new Animated.Value(0)).current;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [sentLetters, setSentLetters] = useState<Message[]>([]);
  const [previewSentLetter, setPreviewSentLetter] = useState<Message | null>(null);

  const loadSentLetters = async (userProfile: UserProfile) => {
    try {
      const [letters, home] = await Promise.all([getSentMessages(userProfile), getHomeState()]);
      setSentLetters(letters);
      if (home) setHomeState(home);
    } catch {
      // Ignorar
    }
  };

  useEffect(() => {
    if (ctxProfile) {
      setProfile(ctxProfile);
      void loadSentLetters(ctxProfile);
      return;
    }
    getCurrentProfile().then((p) => {
      if (p) {
        setProfile(p);
        void loadSentLetters(p);
      }
    });
  }, [ctxProfile]);

  const recipient: UserProfile = profile === 'Javier' ? 'Karla' : 'Javier';
  const recipientDisplay = getDisplayName(recipient);
  const recipientAvatarUri = getAvatarUri(recipient);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const todayStrNow = getTodayString();
  const sealedCount = sentLetters.filter((l) => toLocalDateString(l.scheduled_date) > todayStrNow).length;
  const deliveredCount = sentLetters.length - sealedCount;

  const isTodaySelected = scheduledDate === getTodayString();
  const todayLetter = sentLetters.find(
    (l) => toLocalDateString(l.scheduled_date) === getTodayString()
  );
  const hasSentToday = Boolean(todayLetter);

  // Iniciar edición únicamente cuando se llama desde la tarjeta del día en Enviadas
  const handlePickLetterPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a tu galería para adjuntar una foto a la carta.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const uri = asset.base64 ? 'data:image/jpeg;base64,' + asset.base64 : asset.uri;
        setSelectedPhotoUri(uri);
      }
    } catch (e) {
      console.warn('Error seleccionando foto para carta:', e);
    }
  };

  const handleStartEditLetter = async (letter: Message) => {
    const extraPhoto = homeState.letterExtras?.[letter.id]?.photoUrl;
    const rawLetter = await getRawMessageById(letter.id);
    const sourceContent =
      rawLetter && rawLetter.content && rawLetter.content !== '🔒 Sorpresa sellada 💌'
        ? rawLetter.content
        : letter.content === '🔒 Sorpresa sellada 💌'
        ? ''
        : letter.content;
    const parsed = parseLetterContentAndPhoto(sourceContent, extraPhoto);
    setEditingMessageId(letter.id);
    setContent(parsed.text);
    setSelectedPhotoUri(parsed.photoUrl);
    setScheduledDate(toLocalDateString(letter.scheduled_date));
    setThemeColor(letter.theme_color || primaryColor);
    setActiveTab('write');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setContent('');
    setSelectedPhotoUri(null);
    setScheduledDate(getTodayString());
    setActiveTab('sent');
  };

  const handleDeleteLetter = (letter: Message) => {
    const isTodayLetter = toLocalDateString(letter.scheduled_date) === getTodayString();
    Alert.alert(
      '¿Eliminar carta?',
      isTodayLetter
        ? '¿Seguro que deseas eliminar tu carta de hoy? Esta acción no se puede deshacer.'
        : `¿Seguro que deseas eliminar la carta programada para el ${formatDisplayDate(letter.scheduled_date)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteSupabaseMessage(letter.id);
            if (ok) {
              if (previewSentLetter?.id === letter.id) {
                setPreviewSentLetter(null);
              }
              if (editingMessageId === letter.id) {
                setEditingMessageId(null);
                setContent('');
                setSelectedPhotoUri(null);
                setScheduledDate(getTodayString());
              }
              await loadSentLetters(profile);
            } else {
              Alert.alert('Error', 'No se pudo eliminar la carta.');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Mensaje vacío', 'Por favor escribe lo que sientes antes de enviar.');
      return;
    }
    if (content.trim() === '🔒 Sorpresa sellada 💌') {
      Alert.alert('Aviso', 'Escribe el nuevo contenido de tu carta antes de guardar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = getTodayString();
      const isToday = scheduledDate <= todayStr;

      let finalPhotoUrl: string | null = null;
      if (selectedPhotoUri) {
        finalPhotoUrl = await SupabaseMediaService.uploadPhoto(selectedPhotoUri, 'memories');
      }
      const encodedContent = encodeLetterWithPhoto(content.trim(), finalPhotoUrl);

      if (editingMessageId) {
        // Guardar corrección de la carta de hoy
        const result = await updateSupabaseMessage(editingMessageId, {
          content: encodedContent,
          scheduled_date: scheduledDate,
          theme_color: themeColor,
        });

        if (result.success) {
          const safePhoto =
            finalPhotoUrl && !finalPhotoUrl.startsWith('data:') ? finalPhotoUrl : undefined;
          void getHomeState().then((home) => {
            const prevExtra = home.letterExtras?.[editingMessageId];
            const nextExtras = {
              ...(home.letterExtras || {}),
              [editingMessageId]: {
                ...(prevExtra || { messageId: editingMessageId }),
                messageId: editingMessageId,
                photoUrl: safePhoto,
                updatedAt: new Date().toISOString(),
              },
            };
            const nextHome: HomeState = {
              ...home,
              letterExtras: nextExtras,
              ...(isToday
                ? {
                    stickyNote: {
                      author: profile,
                      text: content.trim(),
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : {}),
            };
            setHomeState(nextHome);
            void saveHomeState(profile, nextHome);
          });

          Alert.alert(
            '¡Carta actualizada!',
            'Tus cambios han sido guardados y se reflejan de inmediato.'
          );
          setEditingMessageId(null);
          setContent('');
          setSelectedPhotoUri(null);
          setScheduledDate(getTodayString());
          await loadSentLetters(profile);
          setActiveTab('sent');
        } else {
          Alert.alert('Aviso', result.error || 'No se pudo actualizar la carta.');
        }
      } else {
        // Enviar nueva carta (hoy si aún no hay, o programada a futuro)
        const result = await createSupabaseMessage({
          sender: profile,
          recipient,
          content: encodedContent,
          scheduled_date: scheduledDate,
          theme_color: themeColor,
        });

        if (result.success) {
          const savedId = result.data?.id;
          const safePhoto =
            finalPhotoUrl && !finalPhotoUrl.startsWith('data:') ? finalPhotoUrl : undefined;
          void getHomeState().then((home) => {
            const nextExtras = { ...(home.letterExtras || {}) };
            if (savedId && safePhoto) {
              nextExtras[savedId] = {
                messageId: savedId,
                photoUrl: safePhoto,
                updatedAt: new Date().toISOString(),
              };
            }
            const nextHome: HomeState = {
              ...home,
              letterExtras: nextExtras,
              ...(isToday
                ? {
                    stickyNote: {
                      author: profile,
                      text: content.trim(),
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : {}),
            };
            setHomeState(nextHome);
            void saveHomeState(profile, nextHome);
          });

          void sendPartnerPushNotification(
            recipient,
            `KMRG 💌 Carta de ${profile === 'Karla' ? 'Karlita' : 'Javier'}`,
            isToday
              ? `¡Te ha dejado una carta especial para hoy!`
              : `Te ha escrito una carta especial para el ${scheduledDate}.`,
            { type: 'SEALED_LETTER', sender: profile }
          );

          setIsSealingEnvelope(true);
          Animated.sequence([
            Animated.timing(sealAnim, {
              toValue: 1,
              duration: 650,
              useNativeDriver: true,
            }),
            Animated.delay(200),
          ]).start(() => {
            setIsSealingEnvelope(false);
            sealAnim.setValue(0);
            setSealedModalData({
              scheduledDate,
              recipientDisplay,
              isUpdate: false,
            });
          });
          await loadSentLetters(profile);
        } else {
          Alert.alert('Aviso', result.error || 'No se pudo enviar la carta.');
        }
      }
    } catch {
      Alert.alert('Error', 'Ocurrió un error inesperado al guardar la carta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.fixedViewport}
      >
        {/* Hero Editorial + Selector Segmentado */}
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.06)', colors.surface]
              : [colors.primaryLight, colors.surface]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.writeHeroBanner, { borderColor: colors.border }]}
        >
          <View style={styles.writeHeroTop}>
            <View style={[styles.recipientAvatarRing, { borderColor: `${themeColor}55` }]}>
              <MiniPartnerAvatar
                uri={recipientAvatarUri}
                name={recipientDisplay}
                size={40}
                bgColor={colors.primaryLight}
                textColor={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.writeHeroEyebrow, { color: colors.primary }]}>
                {editingMessageId ? 'EDITANDO CARTA' : 'BUZÓN DE AMOR'}
              </Text>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                Para {recipientDisplay}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {editingMessageId
                  ? isTodaySelected
                    ? 'Modificando tu carta de hoy'
                    : `Carta programada (${formatDisplayDate(scheduledDate)})`
                  : 'Cartas del día y sorpresas con candado'}
              </Text>
            </View>
          </View>

          <View style={[styles.tabSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PressableScale
              onPress={() => {
                if (editingMessageId) setEditingMessageId(null);
                setActiveTab('write');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'write'
                  ? { backgroundColor: primaryColor }
                  : { backgroundColor: colors.surfaceAlt },
              ]}
              scaleTo={0.96}
            >
              <Ionicons
                name={activeTab === 'write' ? 'create-outline' : 'pencil'}
                size={16}
                color={activeTab === 'write' ? colors.primaryOn : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'write'
                    ? { color: colors.primaryOn, fontWeight: '800' }
                    : { color: colors.textSecondary },
                ]}
              >
                Escribir
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => {
                setActiveTab('sent');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'sent'
                  ? { backgroundColor: primaryColor }
                  : { backgroundColor: colors.surfaceAlt },
              ]}
              scaleTo={0.96}
            >
              <Ionicons
                name={activeTab === 'sent' ? 'mail-open' : 'mail-outline'}
                size={16}
                color={activeTab === 'sent' ? colors.primaryOn : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'sent'
                    ? { color: colors.primaryOn, fontWeight: '800' }
                    : { color: colors.textSecondary },
                ]}
              >
                Enviadas ({sentLetters.length})
              </Text>
            </PressableScale>
          </View>
        </LinearGradient>

        {activeTab === 'write' ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.writeViewport,
              { flexGrow: 1 },
              isKeyboardVisible && { paddingBottom: 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Banner cuando se está editando la carta desde Enviadas */}
            {editingMessageId && (
              <View style={[styles.editingBanner, { backgroundColor: `${primaryColor}18`, borderColor: `${primaryColor}40` }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Ionicons name="create-outline" size={16} color={primaryColor} />
                  <Text style={[styles.editingBannerText, { color: primaryColor }]} numberOfLines={1}>
                    {isTodaySelected
                      ? `Editando carta de hoy (${formatDisplayDate(scheduledDate)})`
                      : `Editando carta programada (${formatDisplayDate(scheduledDate)})`}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
                  <Text style={[styles.cancelEditBtnText, { color: primaryColor }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Hoja de Carta Editorial */}
            <View
              style={[
                styles.paperSheet,
                {
                  backgroundColor: colors.paper,
                  borderColor: colors.border,
                  borderTopColor: themeColor,
                  borderTopWidth: 4,
                },
              ]}
            >
              {/* Banda superior tipo sello postal */}
              <View style={styles.paperTopStampRow}>
                <View style={[styles.envelopeFlapAccent, { backgroundColor: themeColor }]}>
                  <Ionicons name="mail" size={12} color="#ffffff" />
                  <Text style={styles.envelopeFlapText}>
                    Sobre {PRESET_COLORS.find((c) => c.hex === themeColor)?.label || 'Especial'}
                  </Text>
                </View>

                <View style={[styles.paperStampBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Ionicons
                    name={isTodaySelected ? 'sparkles' : 'lock-closed'}
                    size={11}
                    color={themeColor}
                  />
                  <Text style={[styles.paperDateStamp, { color: colors.textSecondary }]}>
                    {formatDisplayDate(scheduledDate, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>

              {/* Encabezado decorativo de la carta */}
              <View style={styles.paperHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="heart" size={14} color={themeColor} />
                  <Text style={[styles.paperRecipient, { color: colors.text }]}>
                    Querid{recipient === 'Karla' ? 'a' : 'o'} {recipientDisplay}:
                  </Text>
                </View>
              </View>

              {/* Área de texto en la hoja */}
              <TextInput
                multiline
                value={content}
                onChangeText={setContent}
                placeholder={`Escribe aquí lo que sientes por ${recipientDisplay}...`}
                placeholderTextColor={colors.textMuted}
                style={[styles.paperTextInput, { color: colors.text }]}
                textAlignVertical="top"
              />

              {/* Vista previa de foto adjunta si existe */}
              {selectedPhotoUri && (
                <View
                  style={[
                    styles.attachedPhotoCard,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                >
                  <Image
                    source={{ uri: selectedPhotoUri }}
                    style={{ width: 48, height: 48, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.text }}>
                      Fotografía adjunta
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                      Se revelará al abrir el sobre
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedPhotoUri(null)}
                    style={{ padding: 6 }}
                    accessibilityLabel="Quitar foto de la carta"
                  >
                    <Ionicons name="close-circle" size={20} color="#e11d48" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Pie de la hoja: botón para adjuntar foto + contador */}
              <View style={[styles.paperFooter, { justifyContent: 'space-between', alignItems: 'center' }]}>
                <TouchableOpacity
                  onPress={() => void handlePickLetterPhoto()}
                  style={[
                    styles.attachPhotoPill,
                    {
                      backgroundColor: `${themeColor}18`,
                      borderColor: `${themeColor}45`,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={14} color={themeColor} />
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: themeColor }}>
                    {selectedPhotoUri ? 'Cambiar foto' : 'Adjuntar foto'}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.paperCharCounter, { color: colors.textMuted }]}>
                  {content.length > 0
                    ? `${wordCount} ${wordCount === 1 ? 'palabra' : 'palabras'} • ${content.length}`
                    : 'Escribe con el corazón'}
                </Text>
              </View>
            </View>

            {/* Opciones: Fecha de apertura y selector de color */}
            <View style={[styles.envelopeConfigCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {/* Selector de Fecha Prominente */}
              <PressableScale
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.datePickerProminent,
                  {
                    backgroundColor: isTodaySelected ? colors.surfaceAlt : `${themeColor}10`,
                    borderColor: isTodaySelected ? colors.border : `${themeColor}45`,
                  },
                ]}
                scaleTo={0.97}
                accessibilityLabel="Seleccionar fecha de apertura"
              >
                <View style={[styles.dateIconCircle, { backgroundColor: `${themeColor}1C` }]}>
                  <Ionicons name={isTodaySelected ? 'calendar' : 'lock-closed'} size={17} color={themeColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dateLabelMini, { color: colors.textMuted }]}>
                    FECHA DE ENTREGA / DESBLOQUEO
                  </Text>
                  <Text style={[styles.datePickerProminentText, { color: colors.text }]} numberOfLines={1}>
                    {isTodaySelected
                      ? 'Hoy mismo (Entrega inmediata)'
                      : `Se abrirá el ${formatDisplayDate(scheduledDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </PressableScale>

              {/* Color del sobre con etiqueta */}
              <View style={styles.colorPickerContainer}>
                <View style={styles.colorHeaderRow}>
                  <Text style={[styles.colorPickerLabel, { color: colors.textSecondary }]}>
                    Color del sobre
                  </Text>
                  <Text style={[styles.colorSelectedLabel, { color: themeColor }]}>
                    {PRESET_COLORS.find((c) => c.hex === themeColor)?.label || 'Personalizado'}
                  </Text>
                </View>
                <View style={styles.colorRow}>
                  {PRESET_COLORS.map((color) => {
                    const isSelected = themeColor === color.hex;
                    return (
                      <PressableScale
                        key={color.hex}
                        onPress={() => setThemeColor(color.hex)}
                        style={[
                          styles.colorDotOuter,
                          isSelected && { borderColor: color.hex, borderWidth: 2 },
                        ]}
                        scaleTo={0.9}
                        accessibilityLabel={`Color ${color.label}`}
                      >
                        <View style={[styles.colorDot, { backgroundColor: color.hex }]}>
                          {isSelected && <Ionicons name="checkmark" size={13} color="#ffffff" />}
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            </View>

            <DatePickerModal
              visible={showDatePicker}
              value={scheduledDate}
              minDate={getTodayString()}
              onSelect={(selected) => setScheduledDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de Entrega o Apertura"
            />

            {editingMessageId ? (
              <PressableScale
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  isSubmitting && { opacity: 0.7 },
                ]}
                scaleTo={0.97}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.primaryOn} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.primaryOn} />
                    <Text style={styles.submitButtonText}>
                      {isTodaySelected ? 'Guardar Cambios de la Carta' : 'Guardar Cambios de Carta Programada'}
                    </Text>
                  </>
                )}
              </PressableScale>
            ) : isTodaySelected && hasSentToday ? (
              <View style={[styles.alreadySentTodayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View
                  style={[
                    styles.alreadySentTodayIcon,
                    { backgroundColor: isDark ? 'rgba(42, 157, 143, 0.2)' : '#e6f4ea' },
                  ]}
                >
                  <Ionicons name="checkmark-done-circle" size={22} color="#2a9d8f" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alreadySentTodayTitle, { color: colors.text }]}>
                    Carta de hoy ya enviada
                  </Text>
                  <Text style={[styles.alreadySentTodaySub, { color: colors.textMuted }]}>
                    Para editarla, entra a "Enviadas" y toca la tarjeta de hoy.
                  </Text>
                </View>
                <PressableScale
                  onPress={() => setActiveTab('sent')}
                  style={[styles.goToSentBtn, { backgroundColor: primaryColor }]}
                  scaleTo={0.96}
                >
                  <Text style={[styles.goToSentBtnText, { color: colors.primaryOn }]}>Ver Enviadas</Text>
                </PressableScale>
              </View>
            ) : (
              <PressableScale
                onPress={() => void handleSubmit()}
                disabled={isSubmitting}
                style={[
                  styles.submitButton,
                  { backgroundColor: themeColor || colors.primary },
                  isSubmitting && { opacity: 0.7 },
                ]}
                scaleTo={0.97}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons
                      name={isTodaySelected ? 'paper-plane' : 'lock-closed'}
                      size={17}
                      color="#ffffff"
                    />
                    <Text style={[styles.submitButtonText, { color: '#ffffff' }]}>
                      {isTodaySelected ? 'Enviar Carta para Hoy' : 'Sellar Carta con Candado'}
                    </Text>
                  </>
                )}
              </PressableScale>
            )}
          </ScrollView>
        ) : (
          <View style={styles.sentContainer}>
            {/* Resumen rápido bento de cartas enviadas */}
            {sentLetters.length > 0 && (
              <View style={styles.sentSummaryRow}>
                <View style={[styles.sentStatPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="mail-open-outline" size={13} color={colors.primary} />
                  <Text style={[styles.sentStatText, { color: colors.text }]}>
                    {deliveredCount} entregadas
                  </Text>
                </View>
                <View style={[styles.sentStatPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed" size={13} color="#f59e0b" />
                  <Text style={[styles.sentStatText, { color: colors.text }]}>
                    {sealedCount} selladas
                  </Text>
                </View>
              </View>
            )}

            {sentLetters.length === 0 ? (
              <EmptyState
                icon="mail-outline"
                title="Sin cartas enviadas"
                message="Aún no has escrito cartas. Escribe una para hoy o prográmala para una fecha especial."
              />
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 28, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {sentLetters.map((letter) => {
                  const letterDateStr = toLocalDateString(letter.scheduled_date);
                  const isTodayLetter = letterDateStr === getTodayString();
                  const isFuture = letterDateStr > getTodayString();
                  const accent = letter.theme_color || colors.primary;

                  return (
                    <TouchableOpacity
                      key={letter.id}
                      activeOpacity={0.86}
                      onPress={() => setPreviewSentLetter(letter)}
                      style={[
                        styles.sentCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderLeftWidth: 4,
                          borderLeftColor: accent,
                        },
                      ]}
                    >
                      <View style={styles.sentTopRow}>
                        <View style={[styles.badgeWithDot, { flex: 1, marginRight: 6 }]}>
                          <View style={[styles.colorIndicator, { backgroundColor: accent }]} />
                          <Text style={[styles.sentDateText, { color: colors.text }]} numberOfLines={1}>
                            {isTodayLetter
                              ? 'Carta de Hoy'
                              : isFuture
                              ? `Para el ${formatDisplayDate(letter.scheduled_date)}`
                              : `Entregada el ${formatDisplayDate(letter.scheduled_date)}`}
                          </Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {(isTodayLetter || isFuture) && (
                            <>
                              <TouchableOpacity
                                onPress={() => handleStartEditLetter(letter)}
                                style={[
                                  styles.editTodayBtn,
                                  { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` },
                                ]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="pencil" size={12} color={colors.primary} />
                                <Text style={[styles.editTodayBtnText, { color: colors.primary }]}>
                                  Editar
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDeleteLetter(letter)}
                                style={[
                                  styles.editTodayBtn,
                                  {
                                    backgroundColor: isDark ? 'rgba(225, 29, 72, 0.16)' : '#fef2f2',
                                    borderColor: isDark ? 'rgba(225, 29, 72, 0.35)' : '#fecdd3',
                                  },
                                ]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                accessibilityLabel="Eliminar carta"
                              >
                                <Ionicons name="trash-outline" size={12} color="#e11d48" />
                              </TouchableOpacity>
                            </>
                          )}

                          <View
                            style={[
                              styles.lockStatusBadge,
                              {
                                backgroundColor: isFuture
                                  ? `${accent}18`
                                  : isDark
                                    ? 'rgba(42, 157, 143, 0.2)'
                                    : '#e6f4ea',
                              },
                            ]}
                          >
                            <Ionicons
                              name={isFuture ? 'lock-closed' : 'checkmark-circle'}
                              size={12}
                              color={isFuture ? accent : '#2a9d8f'}
                            />
                            <Text
                              style={[
                                styles.lockStatusText,
                                { color: isFuture ? accent : '#2a9d8f' },
                              ]}
                            >
                              {isFuture ? 'Sellada' : 'Entregada'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {(() => {
                        const extra = homeState.letterExtras?.[letter.id];
                        const parsed = parseLetterContentAndPhoto(letter.content, extra?.photoUrl);
                        return (
                          <>
                            <Text
                              style={[
                                styles.sentSnippet,
                                { color: colors.textSecondary },
                              ]}
                              numberOfLines={2}
                            >
                              “{parsed.text}”
                            </Text>
                            {(parsed.photoUrl || extra?.reaction || extra?.replyText) && (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                {parsed.photoUrl && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                                    <Ionicons name="image" size={11} color={colors.primary} />
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: colors.primary }}>Con foto</Text>
                                  </View>
                                )}
                                {!isFuture && extra?.reaction && (
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      backgroundColor: isDark ? 'rgba(219, 39, 119, 0.16)' : '#fdf2f8',
                                      paddingHorizontal: 8,
                                      paddingVertical: 3,
                                      borderRadius: 999,
                                      borderWidth: 1,
                                      borderColor: isDark ? 'rgba(244, 114, 182, 0.3)' : '#fbcfe8',
                                    }}
                                  >
                                    <Text style={{ fontSize: 11 }}>{extra.reaction}</Text>
                                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: isDark ? '#f472b6' : '#db2777' }}>
                                      Reacción de {recipientDisplay}
                                    </Text>
                                  </View>
                                )}
                                {!isFuture && extra?.replyText ? (
                                  <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.text, flex: 1 }} numberOfLines={1}>
                                    💬 “{extra.replyText}”
                                  </Text>
                                ) : null}
                              </View>
                            )}
                          </>
                        );
                      })()}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal de Animación: Sobre Sellándose */}
      <Modal visible={isSealingEnvelope} transparent animationType="fade">
        <View style={styles.sealingOverlay}>
          <Animated.View
            style={[
              styles.sealingCard,
              {
                backgroundColor: colors.surface,
                transform: [
                  {
                    scale: sealAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.85, 1.05, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.sealingEnvelopeBody, { backgroundColor: themeColor }]}>
              <View style={styles.sealingWax}>
                <Ionicons name={isTodaySelected ? 'paper-plane' : 'lock-closed'} size={26} color="#ffffff" />
              </View>
            </View>
            <Text style={[styles.sealingTitle, { color: colors.text }]}>
              {isTodaySelected ? 'Entregando tu carta...' : 'Sellando con candado...'}
            </Text>
            <Text style={[styles.sealingSub, { color: colors.textMuted }]}>
              {isTodaySelected
                ? `Tu carta ya está lista para ${recipientDisplay}`
                : `Tu sobre se abrirá para ${recipientDisplay} el ${formatDisplayDate(scheduledDate)}`}
            </Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de Confirmación: Carta Sellada / Entregada */}
      <Modal
        visible={Boolean(sealedModalData)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (sealedModalData) {
            setSealedModalData(null);
            setContent('');
            setSelectedPhotoUri(null);
            void loadSentLetters(profile);
            navigation.navigate('Hoy');
          }
        }}
      >
        <View style={styles.sealingOverlay}>
          <View
            style={[
              styles.sealedSuccessCard,
              {
                backgroundColor: colors.surface,
                borderColor: `${themeColor}40`,
              },
            ]}
          >
            {/* Halo del sobre */}
            <View
              style={[
                styles.sealedEmblemHalo,
                {
                  backgroundColor: `${themeColor}15`,
                  borderColor: `${themeColor}35`,
                },
              ]}
            >
              <View style={[styles.sealedEmblemInner, { backgroundColor: themeColor }]}>
                <Ionicons
                  name={sealedModalData?.scheduledDate === getTodayString() ? 'paper-plane' : 'lock-closed'}
                  size={28}
                  color="#ffffff"
                />
              </View>
            </View>

            <View
              style={[
                styles.sealedPillBadge,
                {
                  backgroundColor: `${themeColor}18`,
                  borderColor: `${themeColor}40`,
                },
              ]}
            >
              <Ionicons name="sparkles" size={11} color={themeColor} />
              <Text style={[styles.sealedPillText, { color: themeColor }]}>
                {sealedModalData?.scheduledDate === getTodayString()
                  ? 'CARTA ENTREGADA HOY'
                  : 'CARTA SELLADA CON CANDADO'}
              </Text>
            </View>

            <Text style={[styles.sealedSuccessTitle, { color: colors.text }]}>
              {sealedModalData?.scheduledDate === getTodayString()
                ? '¡Tu carta fue entregada!'
                : '¡Tu carta está protegida!'}
            </Text>

            <Text style={[styles.sealedSuccessMessage, { color: colors.textSecondary }]}>
              {sealedModalData?.scheduledDate === getTodayString() ? (
                <>
                  Tu carta ya está visible para{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>
                    {sealedModalData?.recipientDisplay}
                  </Text>{' '}
                  en su sección de Hoy.
                </>
              ) : (
                <>
                  Tu sobre quedó cerrado y se abrirá mágicamente para{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>
                    {sealedModalData?.recipientDisplay}
                  </Text>{' '}
                  el{' '}
                  <Text style={{ fontWeight: '800', color: themeColor }}>
                    {sealedModalData ? formatDisplayDate(sealedModalData.scheduledDate) : ''}
                  </Text>
                  .
                </>
              )}
            </Text>

            <View
              style={[
                styles.sealedInfoBox,
                {
                  backgroundColor: isDark ? '#27272a' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark"
                size={16}
                color={themeColor}
                style={{ marginTop: 2 }}
              />
              <Text style={[styles.sealedInfoText, { color: colors.textMuted }]}>
                Si notas algún error en tu carta de hoy, puedes corregirla desde 'Enviadas'.
              </Text>
            </View>

            <PressableScale
              onPress={() => {
                setSealedModalData(null);
                setContent('');
                setSelectedPhotoUri(null);
                void loadSentLetters(profile);
                navigation.navigate('Hoy');
              }}
              style={[styles.sealedDoneBtn, { backgroundColor: themeColor }]}
              scaleTo={0.96}
            >
              <Text style={styles.sealedDoneBtnText}>Ver en Hoy</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Modal de Vista Previa Completa de Carta Enviada */}
      <Modal
        visible={Boolean(previewSentLetter)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewSentLetter(null)}
      >
        <View style={styles.sealingOverlay}>
          {previewSentLetter && (() => {
            const letterDateStr = toLocalDateString(previewSentLetter.scheduled_date);
            const isTodayLetter = letterDateStr === getTodayString();
            const isFuture = letterDateStr > getTodayString();
            const extra = homeState.letterExtras?.[previewSentLetter.id];
            const parsed = parseLetterContentAndPhoto(previewSentLetter.content, extra?.photoUrl);
            const accent = previewSentLetter.theme_color || primaryColor;

            return (
              <View
                style={[
                  styles.sealedSuccessCard,
                  {
                    backgroundColor: colors.paper,
                    borderColor: accent,
                    borderTopWidth: 5,
                    maxWidth: 370,
                    maxHeight: '84%',
                    alignItems: 'stretch',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name={isFuture ? 'lock-closed' : 'mail-open'} size={16} color={accent} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text, fontFamily: SERIF_FONT }} numberOfLines={1}>
                      Para {recipientDisplay}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.lockStatusBadge,
                      {
                        backgroundColor: isFuture
                          ? `${accent}18`
                          : isDark
                            ? 'rgba(42, 157, 143, 0.2)'
                            : '#e6f4ea',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isFuture ? 'lock-closed' : 'checkmark-circle'}
                      size={12}
                      color={isFuture ? accent : '#2a9d8f'}
                    />
                    <Text
                      style={[
                        styles.lockStatusText,
                        { color: isFuture ? accent : '#2a9d8f' },
                      ]}
                    >
                      {isFuture ? 'Sellada' : 'Entregada'}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 11.5, color: colors.textMuted, marginBottom: 10, fontWeight: '600' }}>
                  {isFuture
                    ? `Programada para abrirse el ${formatDisplayDate(previewSentLetter.scheduled_date, { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : `Fecha de entrega: ${formatDisplayDate(previewSentLetter.scheduled_date, { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </Text>

                <ScrollView
                  style={{ maxHeight: 320 }}
                  showsVerticalScrollIndicator={false}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      lineHeight: 24,
                      color: colors.text,
                      fontFamily: SERIF_FONT,
                    }}
                  >
                    {parsed.text}
                  </Text>

                  {parsed.photoUrl && (
                    <View style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                      <Image
                        source={{ uri: parsed.photoUrl }}
                        style={{ width: '100%', height: 190 }}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {(extra?.reaction || extra?.replyText) && (
                    <View
                      style={{
                        marginTop: 12,
                        padding: 10,
                        borderRadius: 12,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: colors.border,
                        gap: 4,
                      }}
                    >
                      {extra?.reaction && (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.text }}>
                          Reacción de {recipientDisplay}: {extra.reaction}
                        </Text>
                      )}
                      {extra?.replyText ? (
                        <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.textSecondary }}>
                          💬 “{extra.replyText}”
                        </Text>
                      ) : null}
                    </View>
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
                  {(isTodayLetter || isFuture) && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const target = previewSentLetter;
                          setPreviewSentLetter(null);
                          handleStartEditLetter(target);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 12,
                          paddingVertical: 9,
                          borderRadius: 12,
                          backgroundColor: `${accent}18`,
                          borderWidth: 1,
                          borderColor: `${accent}40`,
                        }}
                      >
                        <Ionicons name="pencil" size={14} color={accent} />
                        <Text style={{ fontSize: 12, fontWeight: '800', color: accent }}>Editar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteLetter(previewSentLetter)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          paddingHorizontal: 10,
                          paddingVertical: 9,
                          borderRadius: 12,
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.16)' : '#fef2f2',
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(225, 29, 72, 0.35)' : '#fecdd3',
                        }}
                      >
                        <Ionicons name="trash-outline" size={14} color="#e11d48" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <PressableScale
                    onPress={() => setPreviewSentLetter(null)}
                    style={[
                      styles.sealedDoneBtn,
                      { backgroundColor: accent, flex: 1, paddingVertical: 10 },
                    ]}
                    scaleTo={0.96}
                  >
                    <Text style={styles.sealedDoneBtnText}>Cerrar</Text>
                  </PressableScale>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    fixedViewport: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 6,
      justifyContent: 'space-between',
    },
    writeHeroBanner: {
      borderRadius: 20,
      padding: 12,
      borderWidth: 1,
      marginBottom: 10,
      gap: 10,
    },
    writeHeroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    recipientAvatarRing: {
      padding: 2,
      borderRadius: 999,
      borderWidth: 2,
    },
    writeHeroEyebrow: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 1.1,
      marginBottom: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      fontFamily: SERIF_FONT,
    },
    subtitle: {
      fontSize: 11.5,
      color: c.textMuted,
      marginTop: 1,
    },
    tabSwitch: {
      flexDirection: 'row',
      borderRadius: 15,
      padding: 4,
      borderWidth: 1,
      gap: 6,
    },
    tabBtn: {
      flex: 1,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 11,
    },
    tabBtnText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.textSecondary,
    },
    editingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 4,
    },
    editingBannerText: {
      fontSize: 12,
      fontWeight: '700',
    },
    cancelEditBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    cancelEditBtnText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    alreadySentTodayCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 10,
      marginBottom: 6,
    },
    alreadySentTodayIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alreadySentTodayTitle: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    alreadySentTodaySub: {
      fontSize: 10.5,
      marginTop: 2,
      lineHeight: 14,
    },
    goToSentBtn: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    goToSentBtnText: {
      fontSize: 11,
      fontWeight: '800',
    },
    writeViewport: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 10,
      paddingBottom: 16,
    },
    paperSheet: {
      backgroundColor: c.paper,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
      minHeight: 210,
      flex: 1,
      justifyContent: 'space-between',
    },
    paperTopStampRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    envelopeFlapAccent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 9,
    },
    envelopeFlapText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    paperStampBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 9,
      borderWidth: 1,
    },
    paperHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginBottom: 6,
    },
    paperRecipient: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: SERIF_FONT,
    },
    paperDateStamp: {
      fontSize: 10.5,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    paperTextInput: {
      flex: 1,
      fontSize: 15,
      lineHeight: 24,
      color: c.text,
      fontFamily: SERIF_FONT,
      textAlignVertical: 'top',
      paddingVertical: 6,
    },
    attachedPhotoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
      marginBottom: 4,
      padding: 8,
      borderRadius: 14,
      borderWidth: 1,
    },
    attachPhotoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    paperFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: 6,
    },
    paperCharCounter: {
      fontSize: 11,
      fontStyle: 'italic',
    },
    envelopeConfigCard: {
      backgroundColor: c.surface,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    datePickerProminent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 10,
    },
    dateIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateLabelMini: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    datePickerProminentText: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 1,
    },
    colorPickerContainer: {
      alignItems: 'flex-start',
      width: '100%' as const,
    },
    colorHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%' as const,
      marginBottom: 6,
    },
    colorPickerLabel: {
      fontSize: 10.5,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    colorSelectedLabel: {
      fontSize: 11,
      fontWeight: '800',
    },
    colorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    colorDotOuter: {
      padding: 2,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 16,
      marginTop: 8,
      marginBottom: 6,
    },
    submitButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: c.primaryOn,
    },
    sentContainer: {
      flex: 1,
    },
    sentSummaryRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    sentStatPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 13,
      borderWidth: 1,
    },
    sentStatText: {
      fontSize: 12,
      fontWeight: '700',
    },
    sentCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
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
      fontSize: 12.5,
      fontWeight: '700',
      color: c.text,
      textTransform: 'capitalize',
    },
    editTodayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
    },
    editTodayBtnText: {
      fontSize: 11,
      fontWeight: '700',
    },
    lockStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    lockStatusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    sentSnippet: {
      fontSize: 13.5,
      fontFamily: SERIF_FONT,
      lineHeight: 19,
    },
    sealingOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    sealingCard: {
      width: '100%' as const,
      maxWidth: 320,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    sealingEnvelopeBody: {
      width: 100,
      height: 70,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    sealingWax: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    sealingTitle: {
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
      fontFamily: SERIF_FONT,
    },
    sealingSub: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 18,
    },
    sealedSuccessCard: {
      width: '100%' as const,
      maxWidth: 340,
      borderRadius: 26,
      paddingHorizontal: 22,
      paddingTop: 24,
      paddingBottom: 22,
      alignItems: 'center',
      borderWidth: 1.5,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    sealedEmblemHalo: {
      width: 68,
      height: 68,
      borderRadius: 34,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      marginBottom: 12,
    },
    sealedEmblemInner: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    sealedPillBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 3.5,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    sealedPillText: {
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    sealedSuccessTitle: {
      fontSize: 18.5,
      fontWeight: '800',
      textAlign: 'center',
      fontFamily: SERIF_FONT,
      marginBottom: 8,
    },
    sealedSuccessMessage: {
      fontSize: 13.5,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 14,
      paddingHorizontal: 6,
    },
    sealedInfoBox: {
      width: '100%' as const,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 18,
    },
    sealedInfoText: {
      flex: 1,
      fontSize: 11.5,
      lineHeight: 16.5,
    },
    sealedDoneBtn: {
      width: '100%' as const,
      paddingVertical: 13,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sealedDoneBtnText: {
      color: '#ffffff',
      fontSize: 14.5,
      fontWeight: '800',
    },
  });

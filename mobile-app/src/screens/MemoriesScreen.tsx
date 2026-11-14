import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  ScrollView,
  Platform,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  Vibration,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale, EmptyState } from '../components/ui/Kit';
import * as ImagePicker from 'expo-image-picker';
import { PhotoCalendar } from '../components/PhotoCalendar';
import { DatePickerModal } from '../components/DatePickerModal';
import { SpecialPlacesMap } from '../components/SpecialPlacesMap';
import { Message, Milestone } from '../types';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import {
  getPastMessages,
  getCachedMilestones,
  deduplicateMilestones,
  calculateTimeTogether,
  formatDisplayDate,
  addLocalMilestone,
  toLocalDateString,
  parseLetterContentAndPhoto,
} from '../services/StorageService';
import { exportCoupleBookToPdf } from '../services/BookExportService';
import { getSpecialPlacesState } from '../services/CoupleSyncService';
import {
  syncSupabaseMilestones,
  createSupabaseMilestone,
  updateSupabaseMilestone,
  deleteSupabaseMilestone,
} from '../services/SupabaseService';
import { scheduleDailyMessage } from '../services/NotificationService';
import { SupabaseMediaService } from '../services/SupabaseMediaService';
import { LoveBookModal } from '../components/LoveBookModal';
import { TimeCapsuleModal } from '../components/TimeCapsuleModal';
import {
  getHomeState,
  saveHomeState,
  subscribeHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { TimeCapsuleItem } from '../types';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const { width } = Dimensions.get('window');
const GRID_IMAGE_SIZE = (width - 36 - 16) / 3; // 3 columnas para estilo Google Fotos

type ViewMode = 'timeline' | 'album' | 'calendar' | 'map';

interface TimelineLetterItemProps {
  item: Message;
  extra?: { photoUrl?: string; reaction?: string; replyText?: string };
  isLast: boolean;
  isDark: boolean;
  primaryColor: string;
  colors: ThemePalette;
  styles: any;
  onSelectSealed: (item: Message) => void;
  onSelectOpen: (item: Message) => void;
}

const TimelineLetterItem = React.memo<TimelineLetterItemProps>(
  ({ item, extra, isLast, isDark, primaryColor, colors, styles, onSelectSealed, onSelectOpen }) => {
    const parsed = parseLetterContentAndPhoto(item.content, extra?.photoUrl);
    const formattedDate = formatDisplayDate(item.scheduled_date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const isSealed = toLocalDateString(item.scheduled_date) > toLocalDateString(new Date());

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineNode, { borderColor: primaryColor }]}>
            <View style={[styles.timelineNodeInner, { backgroundColor: primaryColor }]} />
          </View>
          {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => {
            if (isSealed) {
              onSelectSealed(item);
              return;
            }
            onSelectOpen(item);
          }}
          style={styles.memoryCardWrapper}
          accessibilityLabel={`Leer carta del ${formattedDate}`}
        >
          <View style={styles.memoryHeader}>
            <Text
              style={[
                styles.dateBadge,
                { color: primaryColor, backgroundColor: `${primaryColor}15` },
              ]}
            >
              {formattedDate}
            </Text>
            {item.is_read && (
              <View style={styles.readBadge}>
                <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
                <Text style={[styles.readCheck, { color: colors.textMuted }]}>Leída</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.memoryCard,
              {
                backgroundColor: colors.paper,
                borderColor: colors.border,
                borderWidth: 1,
                borderLeftColor: item.theme_color || primaryColor,
                borderLeftWidth: 4,
              },
            ]}
          >
            {isSealed ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                <Ionicons name="lock-closed" size={14} color={colors.primary} />
                <Text
                  style={[
                    styles.memoryContent,
                    { color: colors.primary, fontWeight: '700', fontStyle: 'italic' },
                  ]}
                >
                  Sellada con candado hasta el {formattedDate}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.memoryContent,
                    { color: colors.text, fontFamily: SERIF_FONT },
                  ]}
                  numberOfLines={4}
                >
                  “{parsed.text || 'Sin contenido'}”
                </Text>
                {(parsed.photoUrl || extra?.reaction || extra?.replyText) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {parsed.photoUrl && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${primaryColor}15`, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 999 }}>
                        <Ionicons name="image" size={11} color={primaryColor} />
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: primaryColor }}>Con foto</Text>
                      </View>
                    )}
                    {extra?.reaction && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isDark ? 'rgba(219, 39, 119, 0.16)' : '#fdf2f8',
                          paddingHorizontal: 7,
                          paddingVertical: 2.5,
                          borderRadius: 999,
                        }}
                      >
                        <Text style={{ fontSize: 11 }}>{extra.reaction}</Text>
                      </View>
                    )}
                    {extra?.replyText ? (
                      <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        💬 “{extra.replyText}”
                      </Text>
                    ) : null}
                  </View>
                )}
                <View style={styles.readMoreRow}>
                  <Ionicons name="mail-open-outline" size={13} color={primaryColor} />
                  <Text style={[styles.readMoreText, { color: primaryColor }]}>
                    Toca para leer carta completa
                  </Text>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  }
);

export const MemoriesScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { profile, getDisplayName } = useProfile();
  const currentProfile = profile || 'Karla';
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');

  const [memories, setMemories] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modo de vista: 'timeline' (Línea de tiempo), 'album' (Álbum tipo Google Fotos), 'calendar' (Calendario mensual con fotos)
  const [viewMode, setViewMode] = useState<ViewMode>('album');

  // Filtros y búsqueda de Álbum y Cartas
  const [albumSearch, setAlbumSearch] = useState('');
  const [albumAuthorFilter, setAlbumAuthorFilter] = useState<'all' | 'Karla' | 'Javier'>('all');
  const [albumSortOrder, setAlbumSortOrder] = useState<'desc' | 'asc'>('desc');
  const [letterSearch, setLetterSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<'all' | 'photos' | 'sealed' | 'replied'>('all');

  // Modal para agregar recuerdos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => toLocalDateString(new Date()));
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal para ver tarjeta completa de recuerdo en grande
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  // Modal para ver carta completa con animación de sobre
  const milestoneScrollRef = useRef<any>(null);
  const selectedLetterScrollRef = useRef<any>(null);
  const [selectedLetter, setSelectedLetter] = useState<Message | null>(null);
  const [selectedReactionDraft, setSelectedReactionDraft] = useState<string | null>(null);
  const [sealedLetterPreview, setSealedLetterPreview] = useState<Message | null>(null);
  const letterAnim = useRef(new Animated.Value(0)).current;

  const resolveLetterPersonName = (person?: string | null): string => {
    if (!person) return '';
    const lower = person.trim().toLowerCase();
    if (lower === 'karla' || lower === 'karlita') return getDisplayName('Karla');
    if (lower === 'javier') return getDisplayName('Javier');
    return person;
  };

  useEffect(() => {
    if (selectedLetter) {
      setLetterReplyInput(homeState.letterExtras?.[selectedLetter.id]?.replyText || '');
      setSelectedReactionDraft(homeState.letterExtras?.[selectedLetter.id]?.reaction || null);
      letterAnim.setValue(0);
      Animated.spring(letterAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedLetter, letterAnim]);

  // Fecha seleccionada en el calendario
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toLocalDateString(new Date()));

  // Zoom de columnas del Álbum estilo Google Fotos (2, 3, 4 o 5 fotos por fila; por defecto 3)
  const [albumColumns, setAlbumColumns] = useState<2 | 3 | 4 | 5>(3);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchConsumedRef = useRef<boolean>(false);

  // Zoom dentro del visor de foto individual
  const [photoZoomScale, setPhotoZoomScale] = useState<number>(1);
  const photoPinchStartDistRef = useRef<number | null>(null);
  const photoPinchBaseScaleRef = useRef<number>(1);

  useEffect(() => {
    setPhotoZoomScale(1);
  }, [selectedMilestone?.id]);

  const [timelinePage, setTimelinePage] = useState(0);

  // Modales de Libro de Amor y Cápsulas del Tiempo
  const [isLoveBookOpen, setIsLoveBookOpen] = useState(false);
  const [isExportingBookPdf, setIsExportingBookPdf] = useState(false);
  const [letterReplyInput, setLetterReplyInput] = useState('');
  const [isTimeCapsuleOpen, setIsTimeCapsuleOpen] = useState(false);
  const [homeState, setHomeState] = useState(() => DEFAULT_HOME_STATE);

  useEffect(() => {
    void getHomeState().then((s) => {
      if (s) setHomeState(s);
    });
    const unsub = subscribeHomeState((s) => {
      setHomeState(s);
    });
    return () => {
      unsub();
    };
  }, []);

  const handleSaveCapsule = async (newCap: TimeCapsuleItem) => {
    const updatedCapsules = [newCap, ...(homeState.timeCapsules || [])];
    const nextHome = { ...homeState, timeCapsules: updatedCapsules };
    setHomeState(nextHome);
    await saveHomeState(currentProfile, nextHome);
  };

  const runBookExport = async (mode: 'share' | 'print' | 'auto' = 'auto') => {
    if (isExportingBookPdf) return;
    setIsExportingBookPdf(true);
    try {
      const [latestHome, placesState] = await Promise.all([
        getHomeState(),
        getSpecialPlacesState(),
      ]);
      await exportCoupleBookToPdf({
        anniversaryDate: latestHome.anniversaryDate,
        primaryColor,
        loveReasons: latestHome.loveReasons || [],
        messages: memories,
        milestones,
        places: placesState.places || [],
        letterExtras: latestHome.letterExtras || {},
        mode,
      });
    } catch (err: any) {
      console.warn('Error al exportar libro:', err);
      Alert.alert('Error al exportar', err?.message || 'No se pudo generar el libro en PDF.');
    } finally {
      setIsExportingBookPdf(false);
    }
  };

  const handleExportPrintableBookPdf = () => {
    if (isExportingBookPdf) return;
    Alert.alert(
      'Nuestro Libro de Amor',
      '¿Cómo deseas abrir o guardar tu libro en PDF?',
      [
        {
          text: 'Compartir archivo PDF',
          onPress: () => void runBookExport('share'),
        },
        {
          text: 'Imprimir / Vista Previa',
          onPress: () => void runBookExport('print'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSaveSelectedLetterReaction = async (reactionEmoji?: string, replyNote?: string) => {
    if (!selectedLetter) return;
    const prevExtra = homeState.letterExtras?.[selectedLetter.id];
    const parsed = parseLetterContentAndPhoto(selectedLetter.content, prevExtra?.photoUrl);
    const safePhotoUrl =
      parsed.photoUrl && !parsed.photoUrl.startsWith('data:') ? parsed.photoUrl : undefined;
    const nextExtra = {
      ...(prevExtra || {}),
      messageId: selectedLetter.id,
      photoUrl: safePhotoUrl,
      reaction: reactionEmoji !== undefined ? reactionEmoji : prevExtra?.reaction,
      replyText: replyNote !== undefined ? replyNote.trim() : prevExtra?.replyText,
      repliedBy: currentProfile,
      updatedAt: new Date().toISOString(),
    };
    const nextHome = {
      ...homeState,
      letterExtras: {
        ...(homeState.letterExtras || {}),
        [selectedLetter.id]: nextExtra,
      },
    };
    setHomeState(nextHome);
    await saveHomeState(currentProfile, nextHome);
  };

  const handleOpenCapsule = async (capId: string) => {
    const nowIso = new Date().toISOString();
    const updatedCapsules = (homeState.timeCapsules || []).map((c) =>
      c.id === capId ? { ...c, isOpened: true, openedAt: c.openedAt || nowIso } : c
    );
    const nextHome = { ...homeState, timeCapsules: updatedCapsules };
    setHomeState(nextHome);
    await saveHomeState(currentProfile, nextHome);
  };

  const handleDeleteCapsule = async (capId: string) => {
    const updatedCapsules = (homeState.timeCapsules || []).filter((c) => c.id !== capId);
    const nextHome = {
      ...homeState,
      timeCapsules: updatedCapsules,
      deletedIds: Array.from(new Set([...(homeState.deletedIds || []), capId])).slice(-200),
    };
    setHomeState(nextHome);
    await saveHomeState(currentProfile, nextHome);
  };

  const timeTogether = useMemo(
    () => calculateTimeTogether(homeState.anniversaryDate),
    [homeState.anniversaryDate]
  );
  const daysTogether = timeTogether.totalDays;

  const loadMemories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    // 1. Mostrar inmediatamente las fotos y cartas guardadas en caché local (0ms espera)
    const [cachedPast, cachedMilestones] = await Promise.all([
      getPastMessages(currentProfile),
      getCachedMilestones(),
    ]);
    setMemories(cachedPast);
    if (cachedMilestones.length > 0) {
      setMilestones(deduplicateMilestones(cachedMilestones));
    }
    setLoading(false);

    // 2. Sincronizar con Supabase en segundo plano y actualizar si hay cambios
    const synced = await syncSupabaseMilestones();
    if (synced && synced.length > 0) {
      setMilestones(deduplicateMilestones(synced));
    }

    if (isRefresh) {
      setFailedImages({});
      void scheduleDailyMessage();
      setRefreshing(false);
    }
  }, [currentProfile]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleImageError = useCallback((milestoneId: string) => {
    setFailedImages((prev) => ({ ...prev, [milestoneId]: true }));
  }, []);

  // Borrar recuerdo con DOBLE CONFIRMACIÓN
  const handleDeleteMilestone = (milestone: Milestone) => {
    Alert.alert(
      '¿Eliminar Recuerdo?',
      `¿Estás seguro de que deseas borrar "${milestone.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '⚠️ Confirmación Definitiva',
              'Esta acción no se puede deshacer. Se eliminará de ambos teléfonos.',
              [
                { text: 'No, conservar', style: 'cancel' },
                {
                  text: 'Sí, borrar definitivamente',
                  style: 'destructive',
                  onPress: async () => {
                    await deleteSupabaseMilestone(milestone.id);
                    setMilestones((prev) => prev.filter((m) => m.id !== milestone.id));
                    setSelectedMilestone(null);
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso necesario',
          'Se requiere acceso a la galería para seleccionar la fotografía de tu recuerdo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? 'data:image/jpeg;base64,' + asset.base64 : asset.uri;
        setSelectedImageUri(uri);
      }
    } catch (error) {
      console.warn('Error al abrir la galería:', error);
    }
  };

  const handleSaveMilestone = async () => {
    if (isSaving) return;
    if (!newTitle.trim()) {
      Alert.alert('Título requerido', 'Por favor escribe un título para este recuerdo.');
      return;
    }
    if (!selectedImageUri) {
      Alert.alert('Foto requerida', 'Por favor selecciona una fotografía.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingMilestone) {
        let finalUrl = selectedImageUri;
        if (
          selectedImageUri !== editingMilestone.image_url &&
          !selectedImageUri.startsWith('http://') &&
          !selectedImageUri.startsWith('https://')
        ) {
          finalUrl = await SupabaseMediaService.uploadPhoto(selectedImageUri, 'memories');
        }

        const res = await updateSupabaseMilestone(editingMilestone.id, {
          title: newTitle.trim(),
          date: newDate,
          image_url: finalUrl,
        });

        const updatedItem: Milestone = res.data || {
          ...editingMilestone,
          title: newTitle.trim(),
          date: newDate,
          image_url: finalUrl,
        };

        setMilestones((prev) =>
          deduplicateMilestones(prev.map((m) => (m.id === editingMilestone.id ? updatedItem : m)))
        );

        setEditingMilestone(null);
        setNewTitle('');
        setSelectedImageUri(null);
        setIsModalOpen(false);
        return;
      }

      const finalImage = await SupabaseMediaService.uploadPhoto(selectedImageUri, 'memories');

      // Intentar guardar primero en Supabase
      const res = await createSupabaseMilestone({
        author: currentProfile,
        title: newTitle.trim(),
        date: newDate,
        image_url: finalImage,
      });

      let savedMilestone: Milestone;
      if (res.success && res.data) {
        savedMilestone = res.data;
      } else {
        // Fallback offline en caso de que falle la conexión
        savedMilestone = await addLocalMilestone({
          author: currentProfile,
          title: newTitle.trim(),
          date: newDate,
          image_url: finalImage,
        });
      }

      setMilestones((prev) => {
        const withoutDup = prev.filter(
          (m) =>
            m.id !== savedMilestone.id &&
            !(m.image_url && m.image_url.trim() === savedMilestone.image_url?.trim()) &&
            !(
              m.title.trim().toLowerCase() === savedMilestone.title.trim().toLowerCase() &&
              toLocalDateString(m.date) === toLocalDateString(savedMilestone.date) &&
              m.author === savedMilestone.author
            )
        );
        return deduplicateMilestones([...withoutDup, savedMilestone]);
      });

      setNewTitle('');
      setSelectedImageUri(null);
      setIsModalOpen(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el recuerdo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mapeo de fechas para el calendario y álbum
  const milestonesByDate = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    const cleanList = deduplicateMilestones(milestones);
    for (const m of cleanList) {
      const dateKey = toLocalDateString(m.date);
      const list = map.get(dateKey) || [];
      list.push(m);
      map.set(dateKey, list);
    }
    return map;
  }, [milestones]);

  // Marcadores para el calendario interactivo
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const dateKey of milestonesByDate.keys()) {
      marks[dateKey] = {
        marked: true,
        dotColor: primaryColor,
      };
    }
    // Marcar la fecha actualmente seleccionada
    if (selectedCalendarDate) {
      marks[selectedCalendarDate] = {
        ...(marks[selectedCalendarDate] || {}),
        selected: true,
        selectedColor: primaryColor,
      };
    }
    return marks;
  }, [milestonesByDate, selectedCalendarDate, primaryColor]);

  // Recuerdos correspondientes a la fecha seleccionada en el calendario
  const currentCalendarMilestones = useMemo(() => {
    return milestonesByDate.get(selectedCalendarDate) || [];
  }, [milestonesByDate, selectedCalendarDate]);

  // Renderizador de la Vista Álbum estilo Google Fotos (Scroll hacia abajo + Zoom 2..5 fotos por línea + Agrupado por Mes)
  const sortedAlbumMilestones = useMemo(() => {
    return deduplicateMilestones(milestones).sort((a, b) =>
      toLocalDateString(b.date).localeCompare(toLocalDateString(a.date))
    );
  }, [milestones]);

  const filteredAlbumMilestones = useMemo(() => {
    const query = albumSearch.trim().toLowerCase();
    const list = sortedAlbumMilestones.filter((m) => {
      if (albumAuthorFilter !== 'all') {
        const authorNorm = (m.author || '').trim().toLowerCase();
        if (albumAuthorFilter === 'Karla' && authorNorm !== 'karla' && authorNorm !== 'karlita') {
          return false;
        }
        if (albumAuthorFilter === 'Javier' && authorNorm !== 'javier') {
          return false;
        }
      }
      if (query) {
        const hayTitle = (m.title || '').toLowerCase().includes(query);
        const hayDate = formatDisplayDate(m.date).toLowerCase().includes(query);
        if (!hayTitle && !hayDate) return false;
      }
      return true;
    });
    if (albumSortOrder === 'asc') {
      return [...list].reverse();
    }
    return list;
  }, [sortedAlbumMilestones, albumSearch, albumAuthorFilter, albumSortOrder]);

  const filteredMemories = useMemo(() => {
    const query = letterSearch.trim().toLowerCase();
    const todayStr = toLocalDateString(new Date());
    return memories.filter((item) => {
      const extra = homeState.letterExtras?.[item.id];
      const parsed = parseLetterContentAndPhoto(item.content, extra?.photoUrl);
      const isSealed = item.scheduled_date > todayStr;

      if (letterFilter === 'photos' && !parsed.photoUrl) return false;
      if (letterFilter === 'sealed' && !isSealed) return false;
      if (letterFilter === 'replied' && !extra?.replyText && !extra?.reaction) return false;

      if (query) {
        const hayText = !isSealed && (parsed.text || '').toLowerCase().includes(query);
        const hayDate = formatDisplayDate(item.scheduled_date).toLowerCase().includes(query);
        const hayReply = (extra?.replyText || '').toLowerCase().includes(query);
        if (!hayText && !hayDate && !hayReply) return false;
      }
      return true;
    });
  }, [memories, homeState.letterExtras, letterSearch, letterFilter]);

  const handleShareMilestone = async (m: Milestone) => {
    try {
      const formatted = formatDisplayDate(m.date, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      await Share.share({
        message: `Recuerdo KMRG: "${m.title}" (${formatted})${m.image_url ? `\n${m.image_url}` : ''}`,
        url: m.image_url,
      });
    } catch {
      // Cancelado o no soportado
    }
  };

  const groupedAlbumByMonth = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Milestone[] }> = [];
    const map = new Map<string, { key: string; label: string; items: Milestone[] }>();
    for (const m of filteredAlbumMilestones) {
      const dateStr = toLocalDateString(m.date);
      const ym = dateStr.slice(0, 7); // YYYY-MM
      let group = map.get(ym);
      if (!group) {
        const rawLabel = formatDisplayDate(`${ym}-01`, { month: 'long', year: 'numeric' });
        const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
        group = { key: ym, label, items: [] };
        map.set(ym, group);
        groups.push(group);
      }
      group.items.push(m);
    }
    return groups;
  }, [filteredAlbumMilestones]);

  const changeAlbumColumns = (next: 2 | 3 | 4 | 5) => {
    setAlbumColumns((prev) => {
      if (prev !== next && Platform.OS !== 'web') {
        Vibration.vibrate(12);
      }
      return next;
    });
  };

  const handleAlbumTouchStart = (e: any) => {
    const touches = e?.nativeEvent?.touches;
    if (touches && touches.length === 2) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchConsumedRef.current = false;
    }
  };

  const handleAlbumTouchMove = (e: any) => {
    const touches = e?.nativeEvent?.touches;
    if (
      touches &&
      touches.length === 2 &&
      pinchStartDistRef.current !== null &&
      !pinchConsumedRef.current
    ) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      const dist = Math.hypot(dx, dy);
      const delta = dist - pinchStartDistRef.current;
      // Pellizcar abriendo (> 42px) acerca la vista (menos columnas = fotos más grandes)
      // Pellizcar cerrando (< -42px) aleja la vista (más fotos por línea: 3, 4, 5)
      if (delta > 42) {
        pinchConsumedRef.current = true;
        setAlbumColumns((c) => {
          const next = Math.max(2, c - 1) as 2 | 3 | 4 | 5;
          if (next !== c && Platform.OS !== 'web') Vibration.vibrate(15);
          return next;
        });
      } else if (delta < -42) {
        pinchConsumedRef.current = true;
        setAlbumColumns((c) => {
          const next = Math.min(5, c + 1) as 2 | 3 | 4 | 5;
          if (next !== c && Platform.OS !== 'web') Vibration.vibrate(15);
          return next;
        });
      }
    }
  };

  const handleAlbumTouchEnd = () => {
    pinchStartDistRef.current = null;
    pinchConsumedRef.current = false;
  };

  const renderAlbumView = () => {
    if (sortedAlbumMilestones.length === 0) {
      return (
        <View style={styles.emptyAlbumBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="images-outline" size={40} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>Tu Álbum de Recuerdos</Text>
          <Text style={styles.emptySubtitle}>
            Aún no hay fotos guardadas. Toca el botón "+" para agregar vuestro primer momento especial juntos.
          </Text>
        </View>
      );
    }

    const gap = albumColumns >= 4 ? 3 : albumColumns === 3 ? 4 : 8;
    const itemWidthPct =
      albumColumns === 2
        ? '48.7%'
        : albumColumns === 3
        ? '32.4%'
        : albumColumns === 4
        ? '24.2%'
        : '19.2%';

    return (
      <View
        style={styles.albumContainer}
        onTouchStart={handleAlbumTouchStart}
        onTouchMove={handleAlbumTouchMove}
        onTouchEnd={handleAlbumTouchEnd}
      >
        {/* Cabecera estilo Google Fotos con controles de zoom (2, 3, 4 o 5 fotos por fila) */}
        <View style={[styles.albumToolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.albumDateHeader}>
            <View style={[styles.albumCountIconBadge, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="images-outline" size={14} color={primaryColor} />
            </View>
            <Text style={styles.albumDateText}>
              {filteredAlbumMilestones.length === sortedAlbumMilestones.length
                ? `${sortedAlbumMilestones.length} ${sortedAlbumMilestones.length === 1 ? 'recuerdo' : 'recuerdos'}`
                : `${filteredAlbumMilestones.length} de ${sortedAlbumMilestones.length}`}
            </Text>
          </View>

          <View style={[styles.zoomControlsBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() =>
                changeAlbumColumns(Math.min(5, albumColumns + 1) as 2 | 3 | 4 | 5)
              }
              disabled={albumColumns >= 5}
              style={[styles.zoomStepBtn, albumColumns >= 5 && { opacity: 0.35 }]}
              accessibilityLabel="Alejar álbum (más fotos por fila)"
            >
              <Ionicons name="remove" size={14} color={colors.text} />
            </TouchableOpacity>

            {([2, 3, 4, 5] as const).map((cols) => {
              const active = albumColumns === cols;
              return (
                <TouchableOpacity
                  key={cols}
                  onPress={() => changeAlbumColumns(cols)}
                  style={[
                    styles.zoomColChip,
                    active && { backgroundColor: primaryColor },
                  ]}
                  accessibilityLabel={`${cols} fotos por fila`}
                >
                  <Text
                    style={[
                      styles.zoomColChipText,
                      { color: active ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    {cols}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() =>
                changeAlbumColumns(Math.max(2, albumColumns - 1) as 2 | 3 | 4 | 5)
              }
              disabled={albumColumns <= 2}
              style={[styles.zoomStepBtn, albumColumns <= 2 && { opacity: 0.35 }]}
              accessibilityLabel="Acercar álbum (fotos más grandes)"
            >
              <Ionicons name="add" size={14} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Buscador y filtros rápidos del Álbum */}
        <View style={styles.filterBlock}>
          <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={14} color={colors.textMuted} />
            <TextInput
              value={albumSearch}
              onChangeText={setAlbumSearch}
              placeholder="Buscar recuerdo por título o fecha..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {albumSearch.length > 0 && (
              <TouchableOpacity onPress={() => setAlbumSearch('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {[
              { id: 'all' as const, label: 'Todos' },
              { id: 'Karla' as const, label: karlaName },
              { id: 'Javier' as const, label: javierName },
            ].map((chip) => {
              const active = albumAuthorFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setAlbumAuthorFilter(chip.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? primaryColor : colors.surface,
                      borderColor: active ? primaryColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primaryOn : colors.textSecondary },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              onPress={() => setAlbumSortOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
              style={[
                styles.filterChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical-outline" size={12} color={primaryColor} />
              <Text style={[styles.filterChipText, { color: colors.text }]}>
                {albumSortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {groupedAlbumByMonth.length === 0 ? (
          <View style={styles.emptyFilterBox}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
              Sin recuerdos con ese filtro
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAlbumSearch('');
                setAlbumAuthorFilter('all');
              }}
              style={[styles.clearFilterBtn, { backgroundColor: `${primaryColor}16`, borderColor: `${primaryColor}35` }]}
            >
              <Text style={[styles.clearFilterText, { color: primaryColor }]}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <FlatList
          style={{ flex: 1 }}
          data={groupedAlbumByMonth}
          keyExtractor={(group) => group.key}
          contentContainerStyle={styles.albumScrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void loadMemories(true);
              }}
              tintColor={primaryColor}
              colors={[primaryColor]}
            />
          }
          renderItem={({ item: group }) => (
            <View style={styles.albumMonthSection}>
              <View style={styles.albumMonthHeaderRow}>
                <Text style={[styles.albumMonthTitle, { color: colors.text }]}>
                  {group.label}
                </Text>
                <Text style={[styles.albumMonthCount, { color: colors.textMuted }]}>
                  {group.items.length} {group.items.length === 1 ? 'foto' : 'fotos'}
                </Text>
              </View>

              <View style={[styles.albumGrid, { gap }]}>
                {group.items.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setSelectedMilestone(m)}
                    style={[
                      styles.albumGridItem,
                      {
                        width: itemWidthPct,
                        borderRadius: albumColumns >= 4 ? 6 : albumColumns === 3 ? 10 : 14,
                      },
                    ]}
                    activeOpacity={0.88}
                  >
                    <Image
                      source={{ uri: m.image_url }}
                      style={styles.albumGridImage}
                      resizeMode="cover"
                      resizeMethod="resize"
                      fadeDuration={0}
                    />
                    {albumColumns === 2 && m.author && (
                      <View style={styles.albumAuthorBadge}>
                        <Text style={styles.albumAuthorBadgeText}>
                          {resolveLetterPersonName(m.author).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {albumColumns <= 3 && (
                      <LinearGradient
                        colors={['transparent', 'rgba(0, 0, 0, 0.78)']}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={[
                          styles.albumItemOverlay,
                          albumColumns === 3 && { paddingHorizontal: 5, paddingVertical: 4, paddingTop: 14 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.albumItemTitle,
                            albumColumns === 3 && { fontSize: 9.5 },
                          ]}
                          numberOfLines={1}
                        >
                          {m.title}
                        </Text>
                        <Text
                          style={[
                            styles.albumItemDateText,
                            albumColumns === 3 && { fontSize: 8 },
                          ]}
                          numberOfLines={1}
                        >
                          {formatDisplayDate(m.date, { day: 'numeric', month: 'short' })}
                        </Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
        )}
      </View>
    );
  };

  // Renderizador del Calendario Gráfico Mensual (con Scroll para ver todas las fotos del día)
  const renderCalendarView = () => {
    return (
      <View style={styles.calendarWrapper}>
        <View style={styles.calendarCard}>
          <PhotoCalendar
            selectedDate={selectedCalendarDate}
            markedDates={markedDates}
            onSelectDate={(dateStr) => setSelectedCalendarDate(dateStr)}
          />
        </View>

        {/* Lista con scroll de todos los recuerdos del día seleccionado */}
        <View style={[styles.calendarDaySection, { flex: 1 }]}>
          <View style={[styles.calendarDayHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <Text style={styles.calendarDayHeaderText}>
              {formatDisplayDate(selectedCalendarDate, {
                weekday: 'short',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>
              {currentCalendarMilestones.length} {currentCalendarMilestones.length === 1 ? 'foto' : 'fotos'}
            </Text>
          </View>
          {currentCalendarMilestones.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <Ionicons name="sparkles-outline" size={18} color={colors.textMuted} />
              <Text style={styles.emptyDayText}>
                Sin recuerdo guardado en esta fecha
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingTop: 8 }}
            >
              {currentCalendarMilestones.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => setSelectedMilestone(photo)}
                  style={[styles.dayPhotoCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  activeOpacity={0.88}
                >
                  <Image
                    source={{ uri: photo.image_url }}
                    style={styles.dayPhotoImage}
                    resizeMethod="resize"
                    fadeDuration={0}
                  />
                  <View style={styles.dayPhotoMeta}>
                    <Text style={styles.dayPhotoTitle} numberOfLines={1}>
                      {photo.title}
                    </Text>
                    <Text style={styles.dayPhotoSub}>
                      Toca para ver en tamaño completo
                    </Text>
                  </View>
                  <View style={[styles.dayPhotoExpandIcon, { backgroundColor: `${primaryColor}16` }]}>
                    <Ionicons name="expand-outline" size={15} color={primaryColor} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  // Renderizador de Cartas Guardadas (Scroll Fluido y Tarjetas Completas Sin Cortes)
  const renderTimelinePaginatedView = () => {
    if (memories.length === 0) {
      return (
        <EmptyState
          icon="mail-outline"
          title="Nuestra historia apenas comienza"
          message="Los mensajes que se vayan leyendo día tras día se guardarán aquí en su cápsula del tiempo."
        />
      );
    }

    return (
      <View style={styles.timelineFixedContainer}>
        <View style={[styles.timelineHeaderBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.albumCountIconBadge, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="mail-open" size={14} color={primaryColor} />
            </View>
            <Text style={styles.sectionTitle}>Cartas Guardadas</Text>
          </View>
          <View style={[styles.timelineCountPill, { backgroundColor: `${primaryColor}15` }]}>
            <Text style={[styles.timelineCountText, { color: primaryColor }]}>
              {filteredMemories.length === memories.length
                ? `${memories.length} ${memories.length === 1 ? 'carta' : 'cartas'}`
                : `${filteredMemories.length} de ${memories.length}`}
            </Text>
          </View>
        </View>

        {/* Buscador y filtros rápidos de Cartas */}
        <View style={[styles.filterBlock, { marginTop: 6 }]}>
          <View style={[styles.searchBarBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={14} color={colors.textMuted} />
            <TextInput
              value={letterSearch}
              onChangeText={setLetterSearch}
              placeholder="Buscar carta por texto o fecha..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
            {letterSearch.length > 0 && (
              <TouchableOpacity onPress={() => setLetterSearch('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close-circle" size={15} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {[
              { id: 'all' as const, label: 'Todas' },
              { id: 'photos' as const, label: 'Con foto' },
              { id: 'sealed' as const, label: 'Selladas' },
              { id: 'replied' as const, label: 'Con respuesta' },
            ].map((chip) => {
              const active = letterFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setLetterFilter(chip.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? primaryColor : colors.surface,
                      borderColor: active ? primaryColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? colors.primaryOn : colors.textSecondary },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredMemories.length === 0 ? (
          <View style={styles.emptyFilterBox}>
            <Ionicons name="mail-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
              No encontramos cartas con ese filtro
            </Text>
            <TouchableOpacity
              onPress={() => {
                setLetterSearch('');
                setLetterFilter('all');
              }}
              style={[styles.clearFilterBtn, { backgroundColor: `${primaryColor}16`, borderColor: `${primaryColor}35` }]}
            >
              <Text style={[styles.clearFilterText, { color: primaryColor }]}>Ver todas las cartas</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <FlatList
          style={{ flex: 1, marginTop: 6 }}
          data={filteredMemories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.timelineScrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          renderItem={({ item, index }) => (
            <TimelineLetterItem
              item={item}
              extra={homeState.letterExtras?.[item.id]}
              isLast={index === filteredMemories.length - 1}
              isDark={isDark}
              primaryColor={primaryColor}
              colors={colors}
              styles={styles}
              onSelectSealed={setSealedLetterPreview}
              onSelectOpen={setSelectedLetter}
            />
          )}
        />
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      {/* Hero Editorial Compacto de Nuestra Historia */}
      <View style={styles.header}>
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.06)', colors.surface]
              : [colors.primaryLight, colors.surface]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.storyHeroCard, { borderColor: colors.border }]}
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.storyEyebrow, { color: colors.primary }]}>
                NUESTRA HISTORIA • {daysTogether} DÍAS • {sortedAlbumMilestones.length} FOTOS • {memories.length} CARTAS
              </Text>
              <Text style={styles.screenTitle} numberOfLines={1}>
                Cada Recuerdo Juntos
              </Text>
            </View>

            <PressableScale
              onPress={() => {
                setEditingMilestone(null);
                setNewTitle('');
                setNewDate(toLocalDateString(new Date()));
                setSelectedImageUri(null);
                setIsModalOpen(true);
              }}
              style={[styles.heroAddMemoryBtn, { backgroundColor: primaryColor }]}
              scaleTo={0.94}
              accessibilityLabel="Agregar recuerdo"
            >
              <Ionicons name="add" size={17} color={colors.primaryOn} />
              <Text style={[styles.heroAddMemoryText, { color: colors.primaryOn }]}>Recuerdo</Text>
            </PressableScale>
          </View>

          <View style={styles.storyQuickToolsRow}>
            <PressableScale
              onPress={() => void handleExportPrintableBookPdf()}
              disabled={isExportingBookPdf}
              style={[styles.storyToolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              scaleTo={0.95}
              accessibilityLabel="Exportar Nuestro Libro en PDF"
            >
              {isExportingBookPdf ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Ionicons name="book-outline" size={16} color="#8b5cf6" />
              )}
              <Text style={[styles.storyToolText, { color: colors.text }]} numberOfLines={1}>
                Libro PDF
              </Text>
            </PressableScale>

            <PressableScale
              onPress={() => setIsLoveBookOpen(true)}
              style={[styles.storyToolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              scaleTo={0.95}
              accessibilityLabel="Collage de Nuestro Amor"
            >
              <Ionicons name="images" size={16} color="#f59e0b" />
              <Text style={[styles.storyToolText, { color: colors.text }]} numberOfLines={1}>
                Collage
              </Text>
            </PressableScale>

            <PressableScale
              onPress={() => setIsTimeCapsuleOpen(true)}
              style={[styles.storyToolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
              scaleTo={0.95}
              accessibilityLabel="Cápsulas del Tiempo"
            >
              <Ionicons name="hourglass" size={16} color={primaryColor} />
              <Text style={[styles.storyToolText, { color: colors.text }]} numberOfLines={1}>
                Cápsulas
              </Text>
            </PressableScale>
          </View>
        </LinearGradient>
      </View>

      {/* Selector Editorial de Modos de Vista: Álbum | Mapa | Calendario | Cartas */}
      <View style={[styles.viewToggleContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { id: 'album', label: 'Álbum', icon: 'images-outline', activeIcon: 'images' },
          { id: 'map', label: 'Mapa', icon: 'map', activeIcon: 'map' },
          { id: 'calendar', label: 'Calendario', icon: 'calendar-outline', activeIcon: 'calendar' },
          { id: 'timeline', label: 'Cartas', icon: 'mail-open-outline', activeIcon: 'mail-open' },
        ].map((item) => {
          const active = viewMode === item.id;
          return (
            <PressableScale
              key={item.id}
              onPress={() => setViewMode(item.id as ViewMode)}
              style={[
                styles.viewToggleBtn,
                { flex: 1 },
                active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
              ]}
              scaleTo={0.95}
            >
              <Ionicons
                name={(active ? item.activeIcon : item.icon) as any}
                size={15}
                color={active ? colors.primaryOn : colors.textMuted}
              />
              <Text
                style={[
                  styles.viewToggleText,
                  active
                    ? { color: colors.primaryOn, fontWeight: '800' }
                    : { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Cargando recuerdos...</Text>
        </View>
      ) : (
        <View style={styles.fixedViewport}>
          {viewMode === 'album' && renderAlbumView()}
          {viewMode === 'map' && (
            <SpecialPlacesMap currentProfile={currentProfile} primaryColor={primaryColor} />
          )}
          {viewMode === 'calendar' && renderCalendarView()}
          {viewMode === 'timeline' && renderTimelinePaginatedView()}
        </View>
      )}

      {/* Modal DETALLE DE LA TARJETA (Al darle click a un recuerdo, con Zoom y navegación Anterior/Siguiente) */}
      <Modal
        visible={Boolean(selectedMilestone)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedMilestone(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailCard}>
            {selectedMilestone && (() => {
              const navList = filteredAlbumMilestones.some((m) => m.id === selectedMilestone.id)
                ? filteredAlbumMilestones
                : sortedAlbumMilestones;
              const currentIdx = navList.findIndex((m) => m.id === selectedMilestone.id);
              const hasPrev = currentIdx > 0;
              const hasNext = currentIdx >= 0 && currentIdx < navList.length - 1;
              const authorLabel = resolveLetterPersonName(selectedMilestone.author);

              return (
                <>
                  <View
                    style={styles.detailImageWrapper}
                    onTouchStart={(e: any) => {
                      const touches = e?.nativeEvent?.touches;
                      if (touches && touches.length === 2) {
                        const dx = touches[0].pageX - touches[1].pageX;
                        const dy = touches[0].pageY - touches[1].pageY;
                        photoPinchStartDistRef.current = Math.hypot(dx, dy);
                        photoPinchBaseScaleRef.current = photoZoomScale;
                      }
                    }}
                    onTouchMove={(e: any) => {
                      const touches = e?.nativeEvent?.touches;
                      if (
                        touches &&
                        touches.length === 2 &&
                        photoPinchStartDistRef.current &&
                        photoPinchStartDistRef.current > 0
                      ) {
                        const dx = touches[0].pageX - touches[1].pageX;
                        const dy = touches[0].pageY - touches[1].pageY;
                        const dist = Math.hypot(dx, dy);
                        const ratio = dist / photoPinchStartDistRef.current;
                        const nextScale = Math.min(3, Math.max(1, photoPinchBaseScaleRef.current * ratio));
                        setPhotoZoomScale(Number(nextScale.toFixed(2)));
                      }
                    }}
                    onTouchEnd={() => {
                      photoPinchStartDistRef.current = null;
                    }}
                  >
                    <Image
                      source={{ uri: selectedMilestone.image_url }}
                      style={[
                        styles.detailImage,
                        { transform: [{ scale: photoZoomScale }] },
                      ]}
                      resizeMode={photoZoomScale > 1 ? 'contain' : 'cover'}
                    />

                    {/* Barra superior del visor: Contador, Compartir y Cerrar */}
                    <View style={styles.detailTopOverlayRow}>
                      {currentIdx >= 0 ? (
                        <View style={styles.detailCounterPill}>
                          <Text style={styles.detailCounterText}>
                            {currentIdx + 1} / {navList.length}
                          </Text>
                        </View>
                      ) : (
                        <View />
                      )}

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => void handleShareMilestone(selectedMilestone)}
                          style={styles.detailOverlayCircleBtn}
                          accessibilityLabel="Compartir recuerdo"
                        >
                          <Ionicons name="share-outline" size={18} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setSelectedMilestone(null)}
                          style={styles.detailOverlayCircleBtn}
                          accessibilityLabel="Cerrar visor"
                        >
                          <Ionicons name="close" size={20} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Controles de Zoom sobre la foto (1x / 2x / 3x) */}
                    <View style={styles.photoZoomBadgeRow}>
                      {[1, 2, 3].map((scaleVal) => {
                        const active = Math.round(photoZoomScale) === scaleVal;
                        return (
                          <TouchableOpacity
                            key={scaleVal}
                            onPress={() => setPhotoZoomScale(scaleVal)}
                            style={[
                              styles.photoZoomChip,
                              active && { backgroundColor: primaryColor },
                            ]}
                          >
                            <Text style={styles.photoZoomChipText}>{scaleVal}x</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Flechas para recorrer fotos en el visor */}
                    {hasPrev && (
                      <TouchableOpacity
                        onPress={() => setSelectedMilestone(navList[currentIdx - 1])}
                        style={[styles.detailNavArrow, { left: 10 }]}
                        accessibilityLabel="Foto anterior"
                      >
                        <Ionicons name="chevron-back" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    )}
                    {hasNext && (
                      <TouchableOpacity
                        onPress={() => setSelectedMilestone(navList[currentIdx + 1])}
                        style={[styles.detailNavArrow, { right: 10 }]}
                        accessibilityLabel="Foto siguiente"
                      >
                        <Ionicons name="chevron-forward" size={20} color="#ffffff" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.detailBody}>
                    <View style={styles.detailMetaRow}>
                      <View style={styles.detailDateRow}>
                        <Ionicons name="calendar-outline" size={15} color={primaryColor} />
                        <Text style={styles.detailDate}>
                          {formatDisplayDate(selectedMilestone.date, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      {authorLabel ? (
                        <View style={[styles.detailAuthorPill, { backgroundColor: `${primaryColor}15` }]}>
                          <Ionicons name="person" size={11} color={primaryColor} />
                          <Text style={[styles.detailAuthorText, { color: primaryColor }]}>
                            {authorLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.detailTitle}>{selectedMilestone.title}</Text>

                    {/* Acciones: Editar, Borrar con doble confirmación y Cerrar */}
                    <View style={styles.detailActionsRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            const target = selectedMilestone;
                            setEditingMilestone(target);
                            setNewTitle(target.title);
                            setNewDate(toLocalDateString(target.date));
                            setSelectedImageUri(target.image_url);
                            setSelectedMilestone(null);
                            setIsModalOpen(true);
                          }}
                          style={[
                            styles.deleteMilestoneBtn,
                            { backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}35`, borderWidth: 1 },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="pencil" size={15} color={primaryColor} />
                          <Text style={[styles.deleteMilestoneText, { color: primaryColor }]}>Editar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteMilestone(selectedMilestone)}
                          style={[styles.deleteMilestoneBtn, { borderColor: `${primaryColor}30` }]}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="trash-outline" size={16} color={primaryColor} />
                          <Text style={[styles.deleteMilestoneText, { color: primaryColor }]}>Eliminar</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => setSelectedMilestone(null)}
                        style={styles.closeMilestoneBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.closeMilestoneText}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal Agregar / Editar Recuerdo */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setEditingMilestone(null);
          setIsModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingMilestone ? 'Editar Recuerdo' : 'Nuevo Recuerdo'}
                </Text>
                <Text style={styles.modalSubtitle}>Se sincronizará en ambos teléfonos</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingMilestone(null);
                  setIsModalOpen(false);
                }}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={milestoneScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            >

            <TouchableOpacity
              onPress={handlePickImage}
              style={[
                styles.imagePickerBox,
                selectedImageUri ? styles.imagePickerBoxFilled : null,
              ]}
              activeOpacity={0.8}
            >
              {selectedImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImageUri }} style={styles.pickedImage} />
                  <View style={styles.changeImageBadge}>
                    <Ionicons name="camera" size={14} color="#ffffff" />
                    <Text style={styles.changeImageText}>Cambiar foto</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyPickerContent}>
                  <View style={[styles.pickerIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                    <Ionicons name="image-outline" size={28} color={primaryColor} />
                  </View>
                  <Text style={styles.pickerTitle}>Toca para elegir una foto</Text>
                  <Text style={styles.pickerSubtitle}>De tu galería de fotos</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Título del momento</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                onFocus={() => setTimeout(() => milestoneScrollRef.current?.scrollToEnd({ animated: true }), 180)}
                placeholder="Ej. Nuestro primer aniversario juntos"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha del recuerdo</Text>
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
                      {formatDisplayDate(newDate, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.datePickerHint}>Toca para cambiar de fecha</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <DatePickerModal
              visible={showDatePicker}
              value={newDate}
              onSelect={(selected) => setNewDate(selected)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha del recuerdo"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingMilestone(null);
                  setIsModalOpen(false);
                }}
                style={styles.modalCancelBtn}
                disabled={isSaving}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveMilestone}
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: primaryColor },
                  isSaving && { opacity: 0.7 },
                ]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="heart" size={16} color="#ffffff" />
                    <Text style={styles.modalSubmitText}>
                      {editingMilestone ? 'Guardar cambios' : 'Guardar recuerdo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para Leer Carta Completa con Animación de Sobre Abierto */}
      <Modal
        visible={Boolean(selectedLetter)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedLetter(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.letterModalOverlay}
        >
          <Animated.View
            style={[
              styles.letterPaperCard,
              {
                backgroundColor: colors.paper,
                borderColor: colors.border,
                transform: [
                  {
                    scale: letterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.85, 1],
                    }),
                  },
                  {
                    translateY: letterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Cabecera del sobre / carta */}
            <View
              style={[
                styles.letterModalHeaderFlap,
                { backgroundColor: selectedLetter?.theme_color || primaryColor },
              ]}
            >
              <Ionicons name="mail-open" size={16} color="#ffffff" />
              <Text style={styles.letterModalFlapText}>
                Carta del {selectedLetter ? formatDisplayDate(selectedLetter.scheduled_date) : ''}
              </Text>
            </View>

            <View style={styles.letterModalBody}>
              <View style={styles.letterHeaderDecor}>
                <Ionicons
                  name="heart"
                  size={16}
                  color={selectedLetter?.theme_color || primaryColor}
                />
                <Text style={[styles.letterRecipientText, { color: colors.textSecondary }]}>
                  Para {resolveLetterPersonName(selectedLetter?.recipient)}
                </Text>
              </View>

              <ScrollView
                ref={selectedLetterScrollRef}
                style={styles.letterScrollArea}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  const extra = selectedLetter ? homeState.letterExtras?.[selectedLetter.id] : undefined;
                  const parsed = parseLetterContentAndPhoto(selectedLetter?.content, extra?.photoUrl);
                  return (
                    <>
                      <Text
                        style={[
                          styles.letterFullContent,
                          { color: colors.text, fontFamily: SERIF_FONT },
                        ]}
                      >
                        {parsed.text}
                      </Text>

                      {parsed.photoUrl && (
                        <View style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                          <Image
                            source={{ uri: parsed.photoUrl }}
                            style={{ width: '100%', height: 200 }}
                            resizeMode="cover"
                          />
                        </View>
                      )}

                      {/* Reacciones y nota de agradecimiento en la carta */}
                      <View style={{ marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 10 }}>
                          {['❤️', '🥺', '🥰', '😭', '🔥', '✨'].map((emoji) => {
                            const active = (selectedReactionDraft ?? extra?.reaction) === emoji;
                            return (
                              <TouchableOpacity
                                key={emoji}
                                onPress={() => {
                                  setSelectedReactionDraft(emoji);
                                  if (Platform.OS !== 'web') Vibration.vibrate(15);
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: 6,
                                  borderRadius: 10,
                                  alignItems: 'center',
                                  backgroundColor: active ? `${primaryColor}22` : colors.surfaceAlt,
                                  borderWidth: 1,
                                  borderColor: active ? primaryColor : colors.border,
                                }}
                              >
                                <Text style={{ fontSize: 17 }}>{emoji}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TextInput
                            value={letterReplyInput}
                            onChangeText={setLetterReplyInput}
                            onFocus={() => setTimeout(() => selectedLetterScrollRef.current?.scrollToEnd({ animated: true }), 180)}
                            placeholder="Pegar nota de agradecimiento..."
                            placeholderTextColor={colors.textMuted}
                            style={{
                              flex: 1,
                              backgroundColor: colors.surfaceAlt,
                              borderRadius: 10,
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              fontSize: 12,
                              color: colors.text,
                              borderWidth: 1,
                              borderColor: colors.border,
                            }}
                            maxLength={160}
                          />
                          <TouchableOpacity
                            onPress={async () => {
                              const finalReaction = selectedReactionDraft || extra?.reaction;
                              await handleSaveSelectedLetterReaction(finalReaction || undefined, letterReplyInput);
                              setSelectedLetter(null);
                              if (Platform.OS !== 'web') Vibration.vibrate(25);
                            }}
                            style={{
                              backgroundColor: selectedLetter?.theme_color || primaryColor,
                              paddingHorizontal: 13,
                              paddingVertical: 8,
                              borderRadius: 10,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 11.5 }}>Pegar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>

              <View style={styles.letterModalFooter}>
                <Text style={[styles.letterAuthorText, { color: colors.textMuted }]}>
                  Con amor, {resolveLetterPersonName(selectedLetter?.sender)}
                </Text>
                <PressableScale
                  onPress={() => setSelectedLetter(null)}
                  style={[
                    styles.letterCloseBtn,
                    { backgroundColor: selectedLetter?.theme_color || primaryColor },
                  ]}
                  scaleTo={0.94}
                >
                  <Text style={styles.letterCloseBtnText}>Guardar en Sobre</Text>
                </PressableScale>
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal para Ver Detalles de Carta Sellada con Candado */}
      <Modal
        visible={Boolean(sealedLetterPreview)}
        transparent
        animationType="fade"
        onRequestClose={() => setSealedLetterPreview(null)}
      >
        <View style={styles.letterModalOverlay}>
          <View
            style={[
              styles.sealedPreviewCard,
              {
                backgroundColor: colors.surface,
                borderColor: `${sealedLetterPreview?.theme_color || primaryColor}45`,
              },
            ]}
          >
            {/* Halo con sobre sellado */}
            <View
              style={[
                styles.sealedPreviewHalo,
                {
                  backgroundColor: `${sealedLetterPreview?.theme_color || primaryColor}15`,
                  borderColor: `${sealedLetterPreview?.theme_color || primaryColor}35`,
                },
              ]}
            >
              <View
                style={[
                  styles.sealedPreviewInner,
                  { backgroundColor: sealedLetterPreview?.theme_color || primaryColor },
                ]}
              >
                <Ionicons name="lock-closed" size={28} color="#ffffff" />
              </View>
            </View>

            <View
              style={[
                styles.sealedPreviewBadge,
                {
                  backgroundColor: `${sealedLetterPreview?.theme_color || primaryColor}18`,
                  borderColor: `${sealedLetterPreview?.theme_color || primaryColor}40`,
                },
              ]}
            >
              <Ionicons
                name="sparkles"
                size={11}
                color={sealedLetterPreview?.theme_color || primaryColor}
              />
              <Text
                style={[
                  styles.sealedPreviewBadgeText,
                  { color: sealedLetterPreview?.theme_color || primaryColor },
                ]}
              >
                CARTA SELLADA CON CANDADO
              </Text>
            </View>

            <Text style={[styles.sealedPreviewTitle, { color: colors.text }]}>
              Sorpresa Especial de Amor
            </Text>

            <Text style={[styles.sealedPreviewSub, { color: colors.textSecondary }]}>
              Esta carta fue escrita por{' '}
              <Text style={{ fontWeight: '800', color: colors.text }}>
                {resolveLetterPersonName(sealedLetterPreview?.sender)}
              </Text>{' '}
              para abrirse el{' '}
              <Text
                style={{
                  fontWeight: '800',
                  color: sealedLetterPreview?.theme_color || primaryColor,
                }}
              >
                {sealedLetterPreview ? formatDisplayDate(sealedLetterPreview.scheduled_date) : ''}
              </Text>
              .
            </Text>

            {/* Countdown chip */}
            {(() => {
              if (!sealedLetterPreview?.scheduled_date) return null;
              const target = new Date(`${sealedLetterPreview.scheduled_date}T00:00:00`);
              const diffMs = Math.max(0, target.getTime() - Date.now());
              const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const label =
                days <= 0
                  ? '¡Se desbloquea hoy mismo!'
                  : days === 1
                  ? '¡Falta solo 1 día para descubrirla!'
                  : `Faltan ${days} días para desbloquearla`;

              return (
                <View
                  style={[
                    styles.sealedCountdownPill,
                    {
                      backgroundColor: `${sealedLetterPreview?.theme_color || primaryColor}14`,
                      borderColor: `${sealedLetterPreview?.theme_color || primaryColor}30`,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={13}
                    color={sealedLetterPreview?.theme_color || primaryColor}
                  />
                  <Text
                    style={[
                      styles.sealedCountdownText,
                      { color: sealedLetterPreview?.theme_color || primaryColor },
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              );
            })()}

            <Text style={[styles.sealedPreviewDesc, { color: colors.textMuted }]}>
              El candado se abrirá automáticamente en la fecha indicada. ¡La magia y la espera
              valdrán la pena!
            </Text>

            <PressableScale
              onPress={() => setSealedLetterPreview(null)}
              style={[
                styles.sealedCloseBtn,
                { backgroundColor: sealedLetterPreview?.theme_color || primaryColor },
              ]}
              scaleTo={0.96}
            >
              <Text style={styles.sealedCloseBtnText}>Esperar con ilusión 💕</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Modal El Libro de Nuestro Amor */}
      <LoveBookModal
        visible={isLoveBookOpen}
        onClose={() => setIsLoveBookOpen(false)}
        primaryColor={primaryColor}
        currentProfile={currentProfile}
        daysTogether={daysTogether}
        streakCount={homeState.streakCount || 1}
        milestones={milestones}
        messages={memories}
        petName={homeState.couplePet?.name || 'Pochito'}
        anniversaryDate={homeState.anniversaryDate}
      />

      {/* Modal Cápsulas del Tiempo Multimedia */}
      <TimeCapsuleModal
        visible={isTimeCapsuleOpen}
        onClose={() => setIsTimeCapsuleOpen(false)}
        capsules={homeState.timeCapsules || []}
        currentProfile={currentProfile}
        primaryColor={primaryColor}
        onSaveCapsule={handleSaveCapsule}
        onOpenCapsule={handleOpenCapsule}
        onDeleteCapsule={handleDeleteCapsule}
      />
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  letterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  letterPaperCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  letterModalHeaderFlap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  letterModalFlapText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  letterModalBody: {
    padding: 18,
    flexShrink: 1,
  },
  letterHeaderDecor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  letterRecipientText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  letterScrollArea: {
    maxHeight: 260,
  },
  letterFullContent: {
    fontSize: 16,
    lineHeight: 26,
  },
  letterModalFooter: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  letterAuthorText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  letterCloseBtn: {
    minHeight: 42,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterCloseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  sealedPreviewCard: {
    width: '100%',
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
  sealedPreviewHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  sealedPreviewInner: {
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
  sealedPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  sealedPreviewBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sealedPreviewTitle: {
    fontSize: 18.5,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: SERIF_FONT,
    marginBottom: 8,
  },
  sealedPreviewSub: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  sealedCountdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  sealedCountdownText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sealedPreviewDesc: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  sealedCloseBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealedCloseBtnText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
  },
  storyHeroCard: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 1,
  },
  heroAddMemoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 2,
  },
  heroAddMemoryText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  storyQuickToolsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  storyToolPill: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  storyToolText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 15,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: c.border,
    gap: 4,
  },
  viewToggleBtn: {
    flex: 1,
    minHeight: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: c.textMuted,
    fontStyle: 'italic',
  },
  // Estilo Álbum tipo Google Fotos (Scroll continuo + Zoom 2..5 columnas)
  albumContainer: {
    flex: 1,
    paddingTop: 2,
  },
  albumToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
  },
  filterBlock: {
    gap: 6,
    marginBottom: 8,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 11,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    paddingVertical: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyFilterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  emptyFilterTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '800',
  },
  albumCountIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumScrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  albumMonthSection: {
    gap: 6,
  },
  albumMonthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  albumMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  albumMonthCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  zoomControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 3,
  },
  zoomStepBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomColChip: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomColChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  albumDateGroup: {
    gap: 6,
  },
  albumDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  albumDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text,
  },
  albumCountText: {
    fontSize: 11,
    color: c.textMuted,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignContent: 'flex-start',
  },
  albumGridItem: {
    width: '32.4%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    position: 'relative',
  },
  photoZoomBadgeRow: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  photoZoomChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  photoZoomChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  detailNavArrow: {
    position: 'absolute',
    top: '44%',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGridImage: {
    width: '100%',
    height: '100%',
  },
  albumAuthorBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumAuthorBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  albumItemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 6,
  },
  albumItemTitle: {
    fontSize: 10,
    color: c.primaryOn,
    fontWeight: '700',
  },
  albumItemDateText: {
    fontSize: 8.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  pagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  pagerBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pagerBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  pagerIndicator: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  pagerDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pagerDotActive: {
    width: 14,
    borderRadius: 3,
  },
  emptyAlbumBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  // Estilo Calendario Cero Scroll
  calendarWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  calendarDaySection: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  calendarDayHeader: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  calendarDayHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text,
    textTransform: 'capitalize',
  },
  emptyDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '600',
  },
  dayPhotosRow: {
    gap: 8,
  },
  dayPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: c.surfaceAlt,
  },
  dayPhotoImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  dayPhotoMeta: {
    flex: 1,
  },
  dayPhotoTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.text,
  },
  dayPhotoSub: {
    fontSize: 10.5,
    color: c.textMuted,
    marginTop: 2,
  },
  dayPhotoExpandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Línea de tiempo Cero Scroll
  timelineFixedContainer: {
    flex: 1,
    paddingVertical: 2,
  },
  timelineHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
  },
  timelineCountPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 9,
  },
  timelineCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  timelineScrollContent: {
    paddingBottom: 60,
    gap: 12,
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  timelineTrack: {
    width: 22,
    alignItems: 'center',
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    zIndex: 1,
  },
  timelineNodeInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: c.border,
    marginTop: 2,
    marginBottom: -2,
  },
  memoryCardWrapper: {
    flex: 1,
    marginLeft: 8,
    marginBottom: 4,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dateBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    textTransform: 'capitalize',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readCheck: {
    fontSize: 10,
    color: c.textMuted,
  },
  memoryCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 11,
    borderLeftWidth: 4,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  memoryContent: {
    fontSize: 13,
    lineHeight: 19,
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: c.textSecondary,
    textAlign: 'center',
  },
  // Modal de Detalle de Tarjeta
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    width: width - 40,
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  detailImageWrapper: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailTopOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailCounterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  detailCounterText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
  },
  detailOverlayCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: {
    padding: 20,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailAuthorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  detailAuthorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailDate: {
    fontSize: 13,
    color: c.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    fontFamily: SERIF_FONT,
    lineHeight: 26,
    marginBottom: 20,
  },
  detailActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 10,
  },
  deleteMilestoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: c.primaryLight,
  },
  deleteMilestoneText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primary,
  },
  closeMilestoneBtn: {
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeMilestoneText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  // Modal de Crear Recuerdo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
  },
  imagePickerBox: {
    height: 150,
    backgroundColor: c.primaryLight,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  imagePickerBoxFilled: {
    borderStyle: 'solid',
    borderColor: c.border,
  },
  imagePreviewContainer: {
    width: '100%' as const,
    height: '100%' as const,
    position: 'relative',
  },
  pickedImage: {
    width: '100%' as const,
    height: '100%' as const,
    resizeMode: 'cover',
  },
  changeImageBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changeImageText: {
    fontSize: 11,
    color: c.primaryOn,
    fontWeight: '600',
  },
  emptyPickerContent: {
    alignItems: 'center',
  },
  pickerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primary,
  },
  pickerSubtitle: {
    fontSize: 12,
    color: c.textMuted,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
  },
  datePickerInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  datePickerInputLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
    textTransform: 'capitalize',
  },
  datePickerHint: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textSecondary,
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primaryOn,
  },
});

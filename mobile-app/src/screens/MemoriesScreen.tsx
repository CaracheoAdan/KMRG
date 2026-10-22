import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/Kit';
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
  formatDisplayDate,
  addLocalMilestone,
  toLocalDateString,
} from '../services/StorageService';
import {
  syncSupabaseMilestones,
  createSupabaseMilestone,
  deleteSupabaseMilestone,
} from '../services/SupabaseService';
import { scheduleDailyMessage } from '../services/NotificationService';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const { width } = Dimensions.get('window');
const GRID_IMAGE_SIZE = (width - 36 - 16) / 3; // 3 columnas para estilo Google Fotos

type ViewMode = 'timeline' | 'album' | 'calendar' | 'map';

export const MemoriesScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { profile } = useProfile();
  const currentProfile = profile || 'Karla';

  const [memories, setMemories] = useState<Message[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modo de vista: 'timeline' (Línea de tiempo), 'album' (Álbum tipo Google Fotos), 'calendar' (Calendario mensual con fotos)
  const [viewMode, setViewMode] = useState<ViewMode>('album');

  // Modal para agregar recuerdos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(() => toLocalDateString(new Date()));
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal para ver tarjeta completa de recuerdo en grande
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  // Fecha seleccionada en el calendario
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => toLocalDateString(new Date()));

  // Paginación para cero scroll
  const [albumPage, setAlbumPage] = useState(0);
  const [timelinePage, setTimelinePage] = useState(0);

  const loadMemories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    await syncSupabaseMilestones();

    const [past, cachedMilestones] = await Promise.all([
      getPastMessages(currentProfile),
      getCachedMilestones(),
    ]);

    setMemories(past);
    setMilestones(cachedMilestones);
    if (isRefresh) {
      setFailedImages({});
      void scheduleDailyMessage();
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
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
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.warn('Error al abrir la galería:', error);
    }
  };

  const handleSaveMilestone = async () => {
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
      const local = await addLocalMilestone({
        author: currentProfile,
        title: newTitle.trim(),
        date: newDate,
        image_url: selectedImageUri,
      });

      void createSupabaseMilestone({
        author: currentProfile,
        title: newTitle.trim(),
        date: newDate,
        image_url: selectedImageUri,
      });

      setMilestones((prev) =>
        [...prev, local].sort((a, b) =>
          toLocalDateString(a.date).localeCompare(toLocalDateString(b.date))
        )
      );

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
    for (const m of milestones) {
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

  // Renderizador de la Vista Álbum (Cero Scroll con Cuadrícula Paginada 6 fotos por página)
  const renderAlbumView = () => {
    const sortedMilestones = [...milestones].sort((a, b) =>
      toLocalDateString(b.date).localeCompare(toLocalDateString(a.date))
    );

    if (sortedMilestones.length === 0) {
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

    const pageSize = 6;
    const totalPages = Math.max(1, Math.ceil(sortedMilestones.length / pageSize));
    const safePage = Math.min(albumPage, totalPages - 1);
    const visibleMilestones = sortedMilestones.slice(
      safePage * pageSize,
      safePage * pageSize + pageSize
    );

    return (
      <View style={styles.albumContainer}>
        <View style={styles.albumDateHeader}>
          <Ionicons name="images-outline" size={15} color={primaryColor} />
          <Text style={styles.albumDateText}>
            Fotografías Guardadas ({sortedMilestones.length})
          </Text>
        </View>

        <View style={styles.albumGrid}>
          {visibleMilestones.map((m) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setSelectedMilestone(m)}
              style={styles.albumGridItem}
              activeOpacity={0.88}
            >
              <Image
                source={{ uri: m.image_url }}
                style={styles.albumGridImage}
                resizeMode="cover"
              />
              <View style={styles.albumItemOverlay}>
                <Text style={styles.albumItemTitle} numberOfLines={1}>
                  {m.title}
                </Text>
                <Text style={styles.albumItemDateText} numberOfLines={1}>
                  {formatDisplayDate(m.date, { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {totalPages > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              disabled={safePage === 0}
              onPress={() => setAlbumPage((p) => Math.max(0, p - 1))}
              style={[styles.pagerBtn, safePage === 0 && { opacity: 0.35 }]}
            >
              <Ionicons name="chevron-back" size={15} color="#334155" />
              <Text style={styles.pagerBtnText}>Anterior</Text>
            </TouchableOpacity>

            <Text style={styles.pagerIndicator}>
              Página {safePage + 1} de {totalPages}
            </Text>

            <TouchableOpacity
              disabled={safePage >= totalPages - 1}
              onPress={() => setAlbumPage((p) => Math.min(totalPages - 1, p + 1))}
              style={[styles.pagerBtn, safePage >= totalPages - 1 && { opacity: 0.35 }]}
            >
              <Text style={styles.pagerBtnText}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={15} color="#334155" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Renderizador del Calendario Gráfico Mensual (Cero Scroll)
  const renderCalendarView = () => {
    const firstPhoto = currentCalendarMilestones[0] || null;

    return (
      <View style={styles.calendarWrapper}>
        <View style={styles.calendarCard}>
          <PhotoCalendar
            selectedDate={selectedCalendarDate}
            markedDates={markedDates}
            onSelectDate={(dateStr) => setSelectedCalendarDate(dateStr)}
          />
        </View>

        {/* Tarjeta compacta del día seleccionado */}
        <View style={styles.calendarDaySection}>
          {!firstPhoto ? (
            <View style={styles.emptyDayBox}>
              <Ionicons name="sparkles-outline" size={18} color="#adb5bd" />
              <Text style={styles.emptyDayText}>
                {formatDisplayDate(selectedCalendarDate, {
                  day: 'numeric',
                  month: 'short',
                })}
                : Sin foto registrada este día
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setSelectedMilestone(firstPhoto)}
              style={styles.dayPhotoCard}
              activeOpacity={0.88}
            >
              <Image source={{ uri: firstPhoto.image_url }} style={styles.dayPhotoImage} />
              <View style={styles.dayPhotoMeta}>
                <Text style={styles.dayPhotoTitle} numberOfLines={1}>
                  {firstPhoto.title}
                </Text>
                <Text style={styles.dayPhotoSub}>
                  {formatDisplayDate(selectedCalendarDate, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  · Toca para ampliar
                </Text>
              </View>
              <Ionicons name="expand-outline" size={16} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Renderizador de Cartas Paginadas (Cero Scroll)
  const renderTimelinePaginatedView = () => {
    if (memories.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="book-outline" size={40} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>Nuestra historia apenas comienza</Text>
          <Text style={styles.emptySubtitle}>
            Los mensajes que se vayan leyendo día tras día se guardarán aquí en su cápsula del tiempo.
          </Text>
        </View>
      );
    }

    const pageSize = 3;
    const totalPages = Math.max(1, Math.ceil(memories.length / pageSize));
    const safePage = Math.min(timelinePage, totalPages - 1);
    const visibleMemories = memories.slice(
      safePage * pageSize,
      safePage * pageSize + pageSize
    );

    return (
      <View style={styles.timelineFixedContainer}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={16} color={primaryColor} />
          <Text style={styles.sectionTitle}>Cartas Guardadas ({memories.length})</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'flex-start', gap: 8, marginTop: 6 }}>
          {visibleMemories.map((item, idx) => {
            const isLast = idx === visibleMemories.length - 1;
            const formattedDate = formatDisplayDate(item.scheduled_date, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
            return (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineNode, { borderColor: primaryColor }]}>
                    <View style={[styles.timelineNodeInner, { backgroundColor: primaryColor }]} />
                  </View>
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.memoryCardWrapper}>
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
                        <Ionicons name="checkmark-done" size={13} color="#adb5bd" />
                        <Text style={styles.readCheck}>Leído</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.memoryCard, { borderLeftColor: primaryColor }]}>
                    <Text style={styles.memoryContent} numberOfLines={3}>
                      {item.content}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {totalPages > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              disabled={safePage === 0}
              onPress={() => setTimelinePage((p) => Math.max(0, p - 1))}
              style={[styles.pagerBtn, safePage === 0 && { opacity: 0.35 }]}
            >
              <Ionicons name="chevron-back" size={15} color="#334155" />
              <Text style={styles.pagerBtnText}>Anterior</Text>
            </TouchableOpacity>

            <Text style={styles.pagerIndicator}>
              Página {safePage + 1} de {totalPages}
            </Text>

            <TouchableOpacity
              disabled={safePage >= totalPages - 1}
              onPress={() => setTimelinePage((p) => Math.min(totalPages - 1, p + 1))}
              style={[styles.pagerBtn, safePage >= totalPages - 1 && { opacity: 0.35 }]}
            >
              <Text style={styles.pagerBtnText}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={15} color="#334155" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.screenTitle}>Nuestra Historia</Text>
            <Text style={styles.screenSubtitle}>Cada recuerdo, cada lugar y cada fotografía</Text>
          </View>
          <View style={styles.headerButtonsRow}>
            <PressableScale
              onPress={() => setIsModalOpen(true)}
              style={[styles.headerAddBtn, { backgroundColor: primaryColor }]}
              scaleTo={0.92}
              accessibilityLabel="Agregar recuerdo"
            >
              <Ionicons name="add" size={20} color={colors.primaryOn} />
            </PressableScale>
          </View>
        </View>
      </View>

      {/* Selector de Modos de Vista: Álbum | Mapa | Calendario | Cartas (Sin solapamiento) */}
      <View style={[styles.viewToggleContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.viewToggleScroll}
        >
          {[
            { id: 'album', label: 'Álbum', icon: 'images' },
            { id: 'map', label: 'Mapa', icon: 'map' },
            { id: 'calendar', label: 'Calendario', icon: 'calendar' },
            { id: 'timeline', label: 'Cartas', icon: 'mail-open-outline' },
          ].map((item) => {
            const active = viewMode === item.id;
            return (
              <PressableScale
                key={item.id}
                onPress={() => setViewMode(item.id as ViewMode)}
                style={[
                  styles.viewToggleBtn,
                  active
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                scaleTo={0.95}
              >
                <Ionicons
                  name={item.icon as any}
                  size={14}
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
        </ScrollView>
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

      {/* Modal DETALLE DE LA TARJETA (Al darle click a un recuerdo) */}
      <Modal
        visible={Boolean(selectedMilestone)}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedMilestone(null)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailCard}>
            {selectedMilestone && (
              <>
                <View style={styles.detailImageWrapper}>
                  <Image
                    source={{ uri: selectedMilestone.image_url }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedMilestone(null)}
                    style={styles.detailCloseBtn}
                  >
                    <Ionicons name="close" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.detailBody}>
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

                  <Text style={styles.detailTitle}>{selectedMilestone.title}</Text>

                  {/* Acciones: Borrar con doble confirmación */}
                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity
                      onPress={() => handleDeleteMilestone(selectedMilestone)}
                      style={[styles.deleteMilestoneBtn, { borderColor: `${primaryColor}30` }]}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={16} color={primaryColor} />
                      <Text style={[styles.deleteMilestoneText, { color: primaryColor }]}>Eliminar recuerdo</Text>
                    </TouchableOpacity>

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
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Agregar Recuerdo */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nuevo Recuerdo</Text>
                <Text style={styles.modalSubtitle}>Se sincronizará en ambos teléfonos</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#6c757d" />
              </TouchableOpacity>
            </View>

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
                placeholder="Ej. Nuestro primer aniversario juntos"
                placeholderTextColor="#adb5bd"
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
                <Ionicons name="chevron-forward" size={18} color="#adb5bd" />
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
                onPress={() => setIsModalOpen(false)}
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
                    <Text style={styles.modalSubmitText}>Guardar recuerdo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerThemeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  screenSubtitle: {
    fontSize: 11,
    color: c.textSecondary,
    marginTop: 1,
  },
  viewToggleContainer: {
    backgroundColor: c.surfaceAlt,
    borderRadius: 14,
    padding: 3,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: c.border,
  },
  viewToggleScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewToggleBtnActive: {
    backgroundColor: c.surface,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  viewToggleTextActive: {
    color: c.primary,
    fontWeight: '800',
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 8,
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
  // Estilo Álbum Cero Scroll
  albumContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  albumDateGroup: {
    gap: 6,
  },
  albumDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
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
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignContent: 'flex-start',
  },
  albumGridItem: {
    width: GRID_IMAGE_SIZE,
    height: GRID_IMAGE_SIZE * 1.15,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f1f3f5',
    position: 'relative',
  },
  albumGridImage: {
    width: '100%',
    height: '100%',
  },
  albumItemOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 4,
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
    paddingTop: 6,
  },
  pagerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  pagerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  pagerIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
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
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#faf9f9',
  },
  dayPhotoImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  dayPhotoMeta: {
    flex: 1,
  },
  dayPhotoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text,
  },
  dayPhotoSub: {
    fontSize: 10.5,
    color: c.textMuted,
    marginTop: 1,
  },
  // Línea de tiempo Cero Scroll
  timelineFixedContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
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
    backgroundColor: '#e9ecef',
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
    fontSize: 10.5,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
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
    color: '#343a40',
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
    backgroundColor: '#fff0f3',
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
  detailCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBody: {
    padding: 20,
  },
  detailDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  detailDate: {
    fontSize: 13,
    color: '#e63946',
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
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  deleteMilestoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#fff0f3',
  },
  deleteMilestoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e63946',
  },
  closeMilestoneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f1f3f5',
  },
  closeMilestoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
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
    backgroundColor: '#f1f3f5',
  },
  imagePickerBox: {
    height: 150,
    backgroundColor: '#fff0f3',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#fce4ec',
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
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
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
    shadowColor: '#e63946',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e63946',
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
    color: '#495057',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    backgroundColor: '#fff0f3',
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
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#e63946',
    shadowColor: '#e63946',
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

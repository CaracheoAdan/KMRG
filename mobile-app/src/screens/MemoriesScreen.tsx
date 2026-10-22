import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
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
const GRID_IMAGE_SIZE = (width - 48 - 12) / 3; // 3 columnas para estilo Google Fotos

type ViewMode = 'timeline' | 'album' | 'calendar' | 'map';

export const MemoriesScreen: React.FC = () => {
  const { profile } = useProfile();
  const { primaryColor, openThemeModal } = useTheme();
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

  // Renderizador de la Vista Álbum (estilo Google Fotos ordenado por fechas)
  const renderAlbumView = () => {
    const dates = Array.from(milestonesByDate.keys()).sort().reverse();

    if (dates.length === 0) {
      return (
        <View style={styles.emptyAlbumBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="images-outline" size={44} color={primaryColor} />
          </View>
          <Text style={styles.emptyTitle}>Tu Álbum de Recuerdos</Text>
          <Text style={styles.emptySubtitle}>
            Aún no hay fotos guardadas. Toca el botón "+" para agregar vuestro primer momento especial juntos.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.albumContainer}>
        {dates.map((dateStr) => {
          const items = milestonesByDate.get(dateStr) || [];
          return (
            <View key={dateStr} style={styles.albumDateGroup}>
              {/* Encabezado de Fecha tipo Google Fotos */}
              <View style={styles.albumDateHeader}>
                <Ionicons name="calendar-outline" size={15} color={primaryColor} />
                <Text style={styles.albumDateText}>
                  {formatDisplayDate(dateStr, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.albumCountText}>
                  ({items.length} {items.length === 1 ? 'foto' : 'fotos'})
                </Text>
              </View>

              {/* Cuadrícula de fotos */}
              <View style={styles.albumGrid}>
                {items.map((m) => (
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
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Renderizador del Calendario Gráfico Mensual (como Google Fotos / Google Calendar)
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

        {/* Sección de fotos del día seleccionado */}
        <View style={styles.calendarDaySection}>
          <View style={styles.calendarDayHeader}>
            <Text style={styles.calendarDayHeaderText}>
              {formatDisplayDate(selectedCalendarDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {currentCalendarMilestones.length === 0 ? (
            <View style={styles.emptyDayBox}>
              <Ionicons name="sparkles-outline" size={24} color="#adb5bd" />
              <Text style={styles.emptyDayText}>No hay fotos registradas este día.</Text>
            </View>
          ) : (
            <View style={styles.dayPhotosRow}>
              {currentCalendarMilestones.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setSelectedMilestone(m)}
                  style={styles.dayPhotoCard}
                  activeOpacity={0.88}
                >
                  <Image source={{ uri: m.image_url }} style={styles.dayPhotoImage} />
                  <View style={styles.dayPhotoMeta}>
                    <Text style={styles.dayPhotoTitle} numberOfLines={2}>
                      {m.title}
                    </Text>
                    <Text style={styles.dayPhotoSub}>Toca para ver en grande</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTimelineItem = ({ item, index }: { item: Message; index: number }) => {
    if (viewMode !== 'timeline') return null;

    const isLast = index === memories.length - 1;
    const formattedDate = formatDisplayDate(item.scheduled_date, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const themeColor = primaryColor;

    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineNode, { borderColor: themeColor }]}>
            <View style={[styles.timelineNodeInner, { backgroundColor: themeColor }]} />
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        <View style={styles.memoryCardWrapper}>
          <View style={styles.memoryHeader}>
            <Text style={[styles.dateBadge, { color: themeColor, backgroundColor: `${themeColor}15` }]}>
              {formattedDate}
            </Text>
            {item.is_read && (
              <View style={styles.readBadge}>
                <Ionicons name="checkmark-done" size={14} color="#adb5bd" />
                <Text style={styles.readCheck}>Leído</Text>
              </View>
            )}
          </View>

          <View style={[styles.memoryCard, { borderLeftColor: themeColor }]}>
            <Text style={styles.memoryContent}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.screenTitle}>Nuestra Historia</Text>
            <Text style={styles.screenSubtitle}>Cada recuerdo, cada fotografía guardada para siempre</Text>
          </View>
          <View style={styles.headerButtonsRow}>
            <TouchableOpacity
              onPress={() => setIsModalOpen(true)}
              style={[styles.headerAddBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.8}
              accessibilityLabel="Agregar recuerdo"
            >
              <Ionicons name="add" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Selector de Modos de Vista: Álbum | Mapa | Calendario | Cartas */}
      <View style={styles.viewToggleContainer}>
        <TouchableOpacity
          onPress={() => setViewMode('album')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'album' && [styles.viewToggleBtnActive, { backgroundColor: `${primaryColor}18` }],
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="images"
            size={15}
            color={viewMode === 'album' ? primaryColor : '#6c757d'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'album' && [styles.viewToggleTextActive, { color: primaryColor }],
            ]}
          >
            Álbum
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('map')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'map' && [styles.viewToggleBtnActive, { backgroundColor: `${primaryColor}18` }],
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="map"
            size={15}
            color={viewMode === 'map' ? primaryColor : '#6c757d'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'map' && [styles.viewToggleTextActive, { color: primaryColor }],
            ]}
          >
            Mapa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('calendar')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'calendar' && [styles.viewToggleBtnActive, { backgroundColor: `${primaryColor}18` }],
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="calendar"
            size={15}
            color={viewMode === 'calendar' ? primaryColor : '#6c757d'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'calendar' && [styles.viewToggleTextActive, { color: primaryColor }],
            ]}
          >
            Calendario
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setViewMode('timeline')}
          style={[
            styles.viewToggleBtn,
            viewMode === 'timeline' && [styles.viewToggleBtnActive, { backgroundColor: `${primaryColor}18` }],
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="mail-open-outline"
            size={15}
            color={viewMode === 'timeline' ? primaryColor : '#6c757d'}
          />
          <Text
            style={[
              styles.viewToggleText,
              viewMode === 'timeline' && [styles.viewToggleTextActive, { color: primaryColor }],
            ]}
          >
            Cartas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Cargando recuerdos...</Text>
        </View>
      ) : (
        <FlatList
          data={viewMode === 'timeline' ? memories : []}
          keyExtractor={(item) => item.id}
          renderItem={renderTimelineItem}
          ListHeaderComponent={
            viewMode === 'album' ? (
              renderAlbumView()
            ) : viewMode === 'map' ? (
              <SpecialPlacesMap currentProfile={currentProfile} primaryColor={primaryColor} />
            ) : viewMode === 'calendar' ? (
              renderCalendarView()
            ) : (
              <View style={{ marginBottom: 12 }}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time-outline" size={18} color={primaryColor} />
                  <Text style={styles.sectionTitle}>Cápsula del Tiempo</Text>
                </View>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMemories(true)}
              tintColor={primaryColor}
            />
          }
          ListEmptyComponent={
            viewMode === 'timeline' ? (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: `${primaryColor}18` }]}>
                  <Ionicons name="book-outline" size={44} color={primaryColor} />
                </View>
                <Text style={styles.emptyTitle}>Nuestra historia apenas comienza</Text>
                <Text style={styles.emptySubtitle}>
                  Los mensajes que se vayan leyendo día tras día se guardarán aquí para construir nuestra
                  cápsula del tiempo.
                </Text>
              </View>
            ) : null
          }
        />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e63946',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e63946',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 24,
    marginVertical: 12,
    gap: 4,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  viewToggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  viewToggleTextActive: {
    color: '#e63946',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8d99ae',
    fontStyle: 'italic',
  },
  // Estilo Álbum Google Fotos
  albumContainer: {
    gap: 20,
  },
  albumDateGroup: {
    gap: 8,
  },
  albumDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  albumDateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  albumCountText: {
    fontSize: 12,
    color: '#adb5bd',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  albumGridItem: {
    width: GRID_IMAGE_SIZE,
    height: GRID_IMAGE_SIZE,
    borderRadius: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  albumItemTitle: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyAlbumBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  // Estilo Calendario
  calendarWrapper: {
    gap: 16,
  },
  calendarCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f3f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarDaySection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#f1f3f5',
    gap: 12,
  },
  calendarDayHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  calendarDayHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  emptyDayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  emptyDayText: {
    fontSize: 13,
    color: '#adb5bd',
  },
  dayPhotosRow: {
    gap: 10,
  },
  dayPhotoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#faf9f9',
    borderWidth: 1,
    borderColor: '#f1f3f5',
  },
  dayPhotoImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  dayPhotoMeta: {
    flex: 1,
  },
  dayPhotoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2b2d42',
  },
  dayPhotoSub: {
    fontSize: 11,
    color: '#8d99ae',
    marginTop: 2,
  },
  // Línea de tiempo
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b2d42',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineTrack: {
    width: 28,
    alignItems: 'center',
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    marginTop: 4,
    marginBottom: -4,
  },
  memoryCardWrapper: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'capitalize',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  readCheck: {
    fontSize: 11,
    color: '#adb5bd',
  },
  memoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memoryContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#343a40',
    fontFamily: SERIF_FONT,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
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
    color: '#2b2d42',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6c757d',
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
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: '#2b2d42',
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
    borderTopColor: '#f1f3f5',
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
    backgroundColor: '#ffffff',
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
    color: '#2b2d42',
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6c757d',
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
    borderColor: '#f1f3f5',
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
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyPickerContent: {
    alignItems: 'center',
  },
  pickerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
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
    color: '#8d99ae',
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
    color: '#2b2d42',
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
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  datePickerHint: {
    fontSize: 11,
    color: '#adb5bd',
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
    color: '#ffffff',
  },
});

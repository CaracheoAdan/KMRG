import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import {
  formatDisplayDate,
  toLocalDateString,
  calculateTimeTogether,
} from '../../services/StorageService';
import { DatePickerModal } from '../DatePickerModal';
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  FirstTimeItem,
  FirstTimePreset,
  FIRST_TIME_CATEGORIES,
  FIRST_TIME_PRESETS,
  getAllFirstTimes,
  saveFirstTime,
  deleteFirstTime,
  subscribeFirstTimes,
} from '../../services/feature/firstTimesService';
import { UserProfile } from '../../types';

function formatElapsedSince(dateStr: string): string {
  const clean = toLocalDateString(dateStr);
  const today = toLocalDateString(new Date());
  if (clean === today) return '¡Hoy mismo!';
  if (clean > today) return 'Próximamente';

  const breakdown = calculateTimeTogether(clean, new Date());
  if (breakdown.years > 0) {
    const yrLabel = breakdown.years === 1 ? '1 año' : `${breakdown.years} años`;
    if (breakdown.months > 0) {
      return `Hace ${yrLabel} y ${breakdown.months}m (${breakdown.totalDays} días)`;
    }
    return `Hace ${yrLabel} (${breakdown.totalDays} días)`;
  }
  if (breakdown.months > 0) {
    const mLabel = breakdown.months === 1 ? '1 mes' : `${breakdown.months} meses`;
    if (breakdown.days > 0) {
      return `Hace ${mLabel} y ${breakdown.days}d (${breakdown.totalDays} días)`;
    }
    return `Hace ${mLabel} (${breakdown.totalDays} días)`;
  }
  return `Hace ${breakdown.totalDays} ${breakdown.totalDays === 1 ? 'día' : 'días'}`;
}

export const FirstTimesModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor, primaryLight } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';

  const [items, setItems] = useState<FirstTimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado del formulario (crear o editar)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Especial');
  const [eventDate, setEventDate] = useState<string>(toLocalDateString(new Date()));
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllFirstTimes();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadData();
    const unsub = subscribeFirstTimes(() => {
      void loadData();
    });
    return unsub;
  }, [visible, loadData]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) =>
        toLocalDateString(a.event_date).localeCompare(toLocalDateString(b.event_date))
      ),
    [items]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Especial');
    setEventDate(toLocalDateString(new Date()));
    setNotes('');
    setPhotoUri(null);
  };

  const handleOpenNew = (preset?: FirstTimePreset) => {
    resetForm();
    if (preset) {
      setTitle(preset.title);
      setCategory(preset.category);
    }
    setShowForm(true);
  };

  const handleStartEdit = (item: FirstTimeItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category || 'Especial');
    setEventDate(toLocalDateString(item.event_date));
    setNotes(item.notes || '');
    setPhotoUri(item.photo_url || null);
    setShowForm(true);
  };

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tus fotos para adjuntar una imagen al recuerdo.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.78,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0];
        if (asset.base64) {
          setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setPhotoUri(asset.uri);
        }
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar la fotografía.');
    }
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Falta el título', 'Escribe el nombre de esta primera vez especial.');
      return;
    }
    setSaving(true);
    try {
      await saveFirstTime({
        id: editingId || undefined,
        title: cleanTitle,
        category,
        event_date: eventDate,
        notes: notes.trim() || null,
        photo_url: photoUri,
        created_by: activeProfile,
      });
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar el recuerdo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: FirstTimeItem) => {
    Alert.alert(
      'Eliminar recuerdo',
      `¿Deseas eliminar "${item.title}" de sus primeras veces?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteFirstTime(item.id);
            if (editingId === item.id) {
              resetForm();
              setShowForm(false);
            }
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Nuestras Primeras Veces"
      subtitle="Cada primera vez que construye nuestra historia"
      icon="ribbon"
    >
      {/* Cabecera de contador y botón de agregar */}
      <View
        style={[
          styles.topBanner,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <View style={styles.topBannerLeft}>
          <Ionicons name="ribbon" size={18} color={primaryColor} />
          <Text style={[styles.topBannerNum, { color: colors.text }]}>{sortedItems.length}</Text>
          <Text style={[styles.topBannerLabel, { color: colors.textSecondary }]}>
            {sortedItems.length === 1
              ? 'primera vez guardada'
              : 'primeras veces guardadas'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (showForm) {
              resetForm();
              setShowForm(false);
            } else {
              handleOpenNew();
            }
          }}
          style={[styles.newBtn, { backgroundColor: primaryColor }]}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={16} color="#ffffff" />
          <Text style={styles.newBtnText}>
            {showForm ? 'Cerrar' : 'Agregar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Presets rápidos */}
      <View style={styles.presetsBlock}>
        <Text style={[styles.presetsHeading, { color: colors.textSecondary }]}>
          Ideas rápidas para agregar:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {FIRST_TIME_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              onPress={() => handleOpenNew(preset)}
              style={[
                styles.presetChip,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Text style={styles.presetEmoji}>{preset.emoji}</Text>
              <Text style={[styles.presetText, { color: colors.text }]}>{preset.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Formulario de crear / editar */}
      {showForm ? (
        <FeatureCard style={{ borderColor: primaryColor, borderWidth: 1.5 }}>
          <View style={styles.formHeaderRow}>
            <Ionicons
              name={editingId ? 'create-outline' : 'sparkles'}
              size={17}
              color={primaryColor}
            />
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Editar Primera Vez' : 'Registrar Nueva Primera Vez'}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Título del recuerdo *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Nuestro primer viaje juntos"
            placeholderTextColor={colors.textMuted}
            maxLength={160}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Categoría
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {FIRST_TIME_CATEGORIES.map((cat) => {
              const active = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: active ? primaryColor : colors.surfaceAlt,
                      borderColor: active ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: active ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Fecha de esa primera vez
          </Text>
          <TouchableOpacity
            onPress={() => setIsDatePickerOpen(true)}
            style={[
              styles.dateSelectorBtn,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={primaryColor} />
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {formatDisplayDate(eventDate, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Notas o anécdota (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="¿Qué pasó ese día? ¿Cómo se sintieron?"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          {/* Fotografía opcional */}
          <View style={styles.photoRow}>
            <TouchableOpacity
              onPress={handlePickPhoto}
              style={[
                styles.photoPickBtn,
                { backgroundColor: primaryLight, borderColor: primaryColor },
              ]}
            >
              <Ionicons name="camera-outline" size={17} color={primaryColor} />
              <Text style={[styles.photoPickText, { color: primaryColor }]}>
                {photoUri ? 'Cambiar fotografía' : 'Adjuntar foto (opcional)'}
              </Text>
            </TouchableOpacity>

            {photoUri ? (
              <TouchableOpacity
                onPress={() => setPhotoUri(null)}
                style={[styles.removePhotoBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            ) : null}
          </View>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
          ) : null}

          <View style={styles.formButtonsRow}>
            <FeatureButton
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                resetForm();
                setShowForm(false);
              }}
            />
            <View style={styles.flex}>
              <FeatureButton
                label={
                  saving
                    ? 'Guardando...'
                    : editingId
                    ? 'Guardar cambios'
                    : 'Guardar primera vez'
                }
                icon="checkmark-circle"
                onPress={handleSave}
                disabled={saving || !title.trim()}
              />
            </View>
          </View>
        </FeatureCard>
      ) : null}

      {loading && sortedItems.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={primaryColor} />
        </View>
      ) : null}

      {/* Línea de tiempo cronológica */}
      {sortedItems.length === 0 ? (
        <FeatureCard style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aún no han registrado primeras veces
          </Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Elijan una de las ideas rápidas de arriba o agreguen su primer viaje, concierto o momento inolvidable juntos.
          </Text>
          <FeatureButton
            label="Registrar nuestra primera vez"
            icon="add"
            onPress={() => handleOpenNew()}
          />
        </FeatureCard>
      ) : (
        sortedItems.map((item, idx) => (
          <FeatureCard key={item.id} style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <View style={[styles.orderBadge, { backgroundColor: primaryLight }]}>
                <Text style={[styles.orderBadgeText, { color: primaryColor }]}>
                  #{idx + 1}
                </Text>
              </View>
              <View style={styles.headerMetaCol}>
                <View style={styles.categoryLine}>
                  <Text style={[styles.categoryBadgeText, { color: primaryColor }]}>
                    {item.category || 'Especial'}
                  </Text>
                  <Text style={[styles.elapsedText, { color: colors.textMuted }]}>
                    {formatElapsedSince(item.event_date)}
                  </Text>
                </View>
                <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
              </View>
            </View>

            {item.photo_url ? (
              <Image
                source={{ uri: item.photo_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : null}

            {item.notes ? (
              <Text style={[styles.itemNotes, { color: colors.textSecondary }]}>
                {item.notes}
              </Text>
            ) : null}

            <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
              <View style={styles.footerDateWrap}>
                <Ionicons name="calendar-outline" size={14} color={primaryColor} />
                <Text style={[styles.footerDateText, { color: colors.textSecondary }]}>
                  {formatDisplayDate(item.event_date, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {' · '}
                  {getDisplayName(item.created_by)}
                </Text>
              </View>

              <View style={styles.footerActions}>
                <TouchableOpacity
                  onPress={() => handleStartEdit(item)}
                  style={[styles.actionIconBtn, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="Editar"
                >
                  <Ionicons name="create-outline" size={16} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={[styles.actionIconBtn, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="Eliminar"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </FeatureCard>
        ))
      )}

      <DatePickerModal
        visible={isDatePickerOpen}
        value={eventDate}
        onSelect={(d) => setEventDate(d)}
        onClose={() => setIsDatePickerOpen(false)}
        title="Fecha de nuestra primera vez"
        showQuickSelect={false}
      />
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  topBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBannerNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  topBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  newBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  presetsBlock: {
    gap: 6,
  },
  presetsHeading: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetEmoji: {
    fontSize: 15,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
    flex: 1,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  photoPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photoPickText: {
    fontSize: 13,
    fontWeight: '700',
  },
  removePhotoBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    marginBottom: 10,
  },
  formButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  timelineCard: {
    gap: 10,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  orderBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  orderBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  headerMetaCol: {
    flex: 1,
    gap: 3,
  },
  categoryLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  elapsedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  cardImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
  },
  itemNotes: {
    fontSize: 13,
    lineHeight: 19,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  footerDateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

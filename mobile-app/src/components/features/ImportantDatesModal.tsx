import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FeatureButton,
  FeatureCard,
  FeatureModalProps,
  FeatureModalShell,
} from './FeatureModalShell';
import { Ionicons } from '../ui/Icon';
import { DatePickerModal } from '../DatePickerModal';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatDisplayDate, toLocalDateString } from '../../services/StorageService';
import { UserProfile } from '../../types';
import {
  ComputedImportantDate,
  deleteImportantDate,
  getAllImportantDates,
  getCachedImportantDates,
  IMPORTANT_DATE_PRESETS,
  ImportantDate,
  ImportantDateKind,
  ImportantDatePreset,
  KIND_META,
  saveImportantDate,
  sortImportantDates,
  subscribeImportantDates,
} from '../../services/feature/importantDatesService';

const KIND_KEYS: ImportantDateKind[] = ['birthday', 'anniversary', 'monthiversary', 'custom'];

export const ImportantDatesModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();

  const [items, setItems] = useState<ImportantDate[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos del formulario
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ImportantDateKind>('custom');
  const [date, setDate] = useState(() => toLocalDateString(new Date()));
  const [recurringYearly, setRecurringYearly] = useState(true);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const cached = await getCachedImportantDates();
    if (cached.length > 0) setItems(cached);
    const fresh = await getAllImportantDates();
    setItems(fresh);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setNow(new Date());
    void loadData();
    const unsub = subscribeImportantDates(() => {
      void loadData();
    });
    return () => {
      unsub();
    };
  }, [visible, loadData]);

  const computedList = useMemo(() => sortImportantDates(items, now), [items, now]);
  const todayCelebrations = useMemo(
    () => computedList.filter((item) => item.isToday),
    [computedList]
  );

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setKind('custom');
    setDate(toLocalDateString(new Date()));
    setRecurringYearly(true);
    setOwner(null);
    setErrorMsg(null);
  }, []);

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleSelectPreset = (preset: ImportantDatePreset) => {
    // Verificar si ya existe una fecha con ese preset para editarla o crearla
    const existing = items.find(
      (i) =>
        (preset.kind === 'birthday' && i.kind === 'birthday' && i.owner === preset.owner) ||
        (preset.kind === 'monthiversary' && i.kind === 'monthiversary') ||
        i.title.toLowerCase() === preset.title.toLowerCase()
    );

    if (existing) {
      handleStartEdit(existing);
      return;
    }

    setEditingId(null);
    setTitle(preset.title);
    setKind(preset.kind);
    setOwner(preset.owner);
    setRecurringYearly(preset.recurring_yearly);
    setDate(preset.defaultDate || toLocalDateString(new Date()));
    setErrorMsg(null);
    setIsFormOpen(true);
    setDatePickerOpen(true);
  };

  const handleStartEdit = (item: ImportantDate) => {
    setEditingId(item.id);
    setTitle(item.title);
    setKind(item.kind);
    setDate(toLocalDateString(item.date));
    setRecurringYearly(item.kind === 'monthiversary' ? true : item.recurring_yearly);
    setOwner(item.owner || null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Escribe el nombre de la fecha importante.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await saveImportantDate({
        id: editingId || undefined,
        title: cleanTitle,
        kind,
        date,
        recurring_yearly: kind === 'monthiversary' ? true : recurringYearly,
        owner: kind === 'birthday' ? owner || 'Javier' : owner,
        created_by: profile || 'Javier',
      });
      await loadData();
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo guardar la fecha importante.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (item: ImportantDate) => {
    Alert.alert(
      'Eliminar fecha importante',
      `¿Quieres eliminar "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteImportantDate(item.id);
            if (editingId === item.id) {
              setIsFormOpen(false);
              resetForm();
            }
            await loadData();
          },
        },
      ]
    );
  };

  const renderImportantDateCard = (item: ComputedImportantDate) => {
    const meta = KIND_META[item.kind] || KIND_META.custom;

    return (
      <FeatureCard
        key={item.id}
        style={[
          styles.dateCard,
          item.isToday && {
            borderColor: primaryColor,
            borderWidth: 2,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {item.isToday ? (
          <View style={[styles.todayHighlightRibbon, { backgroundColor: primaryColor }]}>
            <Ionicons name="sparkles" size={14} color="#ffffff" />
            <Text style={styles.todayHighlightRibbonText}>¡Es hoy! Día de celebrar juntos</Text>
          </View>
        ) : null}

        <View style={styles.cardTopRow}>
          <View style={[styles.kindIconBox, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name={meta.icon as any} size={20} color={primaryColor} />
          </View>

          <View style={styles.cardMainInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <View style={styles.tagsRow}>
              <View style={[styles.kindTag, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.kindTagText, { color: colors.textSecondary }]}>
                  {meta.label}
                </Text>
              </View>
              {item.owner ? (
                <View style={[styles.kindTag, { backgroundColor: `${primaryColor}14` }]}>
                  <Text style={[styles.kindTagText, { color: primaryColor }]}>
                    {getDisplayName(item.owner)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.kindTag, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.kindTagText, { color: colors.textMuted }]}>
                  {item.kind === 'monthiversary'
                    ? 'Cada mes'
                    : item.recurring_yearly
                    ? 'Cada año'
                    : 'Única vez'}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.countdownPill,
              {
                backgroundColor: item.isToday ? primaryColor : `${primaryColor}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.countdownPillText,
                { color: item.isToday ? '#ffffff' : primaryColor },
              ]}
            >
              {item.countdownLabel}
            </Text>
          </View>
        </View>

        {item.celebrationBadge ? (
          <View style={[styles.celebrationBadgeBox, { backgroundColor: `${primaryColor}12` }]}>
            <Ionicons name="sparkles" size={14} color={primaryColor} />
            <Text style={[styles.celebrationBadgeText, { color: primaryColor }]}>
              {item.celebrationBadge}
            </Text>
          </View>
        ) : null}

        <View style={styles.datesInfoBox}>
          <View style={styles.dateInfoLine}>
            <Ionicons name="calendar-days" size={14} color={colors.textMuted} />
            <Text style={[styles.dateInfoLabel, { color: colors.textSecondary }]}>
              Próxima celebración:{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {formatDisplayDate(item.nextOccurrenceDate, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </Text>
          </View>
          <View style={styles.dateInfoLine}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.dateInfoLabel, { color: colors.textMuted }]}>
              Fecha origen:{' '}
              {formatDisplayDate(item.date, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleStartEdit(item)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="create-outline" size={14} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleConfirmDelete(item)}
            style={[styles.actionBtn, { backgroundColor: `${colors.danger}15` }]}
          >
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </FeatureCard>
    );
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Fechas importantes"
      subtitle="Cumpleaños, aniversarios, mesiversarios y días únicos"
      icon="cake"
      headerRight={
        <TouchableOpacity
          onPress={() => {
            if (isFormOpen) {
              setIsFormOpen(false);
              resetForm();
            } else {
              handleStartCreate();
            }
          }}
          style={[styles.headerAddBtn, { backgroundColor: primaryColor }]}
          accessibilityRole="button"
          accessibilityLabel={isFormOpen ? 'Cerrar formulario' : 'Agregar fecha importante'}
        >
          <Ionicons name={isFormOpen ? 'close' : 'add'} size={20} color="#ffffff" />
        </TouchableOpacity>
      }
    >
      {/* Banner si hoy se celebra alguna fecha */}
      {todayCelebrations.length > 0 ? (
        <FeatureCard
          style={[
            styles.todayHeroCard,
            { backgroundColor: primaryColor, borderColor: primaryColor },
          ]}
        >
          <View style={styles.todayHeroHeader}>
            <Ionicons name="sparkles" size={22} color="#ffffff" />
            <Text style={styles.todayHeroTitle}>¡Es hoy! 🎉</Text>
          </View>
          {todayCelebrations.map((c) => (
            <Text key={c.id} style={styles.todayHeroItem}>
              • {c.title} {c.celebrationBadge ? `— ${c.celebrationBadge}` : ''}
            </Text>
          ))}
        </FeatureCard>
      ) : null}

      {/* Accesos rápidos (Presets) */}
      <View style={styles.presetsSection}>
        <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
          AGREGAR RÁPIDO
        </Text>
        <View style={styles.presetsRow}>
          {IMPORTANT_DATE_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.key}
              onPress={() => handleSelectPreset(preset)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name={preset.icon as any} size={15} color={primaryColor} />
              <Text style={[styles.presetChipText, { color: colors.text }]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Formulario */}
      {isFormOpen ? (
        <FeatureCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="calendar-heart" size={18} color={primaryColor} />
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Editar fecha importante' : 'Nueva fecha importante'}
            </Text>
          </View>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: `${colors.danger}18` }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de fecha</Text>
          <View style={styles.kindsGrid}>
            {KIND_KEYS.map((k) => {
              const selected = kind === k;
              const meta = KIND_META[k];
              return (
                <TouchableOpacity
                  key={k}
                  onPress={() => {
                    setKind(k);
                    if (k === 'birthday' && !owner) {
                      setOwner('Javier');
                    }
                    if (k === 'monthiversary') {
                      setRecurringYearly(true);
                    }
                  }}
                  style={[
                    styles.kindChoiceBtn,
                    {
                      backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                      borderColor: selected ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={meta.icon as any}
                    size={15}
                    color={selected ? '#ffffff' : primaryColor}
                  />
                  <Text
                    style={[
                      styles.kindChoiceText,
                      { color: selected ? '#ffffff' : colors.text },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {kind === 'birthday' ? (
            <View style={styles.ownerSection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                ¿De quién es el cumpleaños?
              </Text>
              <View style={styles.ownerRow}>
                {(['Javier', 'Karla'] as UserProfile[]).map((p) => {
                  const selected = owner === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setOwner(p);
                        if (
                          !title.trim() ||
                          title === 'Cumpleaños de Javier' ||
                          title === 'Cumpleaños de Karla'
                        ) {
                          setTitle(`Cumpleaños de ${p}`);
                        }
                      }}
                      style={[
                        styles.ownerBtn,
                        {
                          backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                          borderColor: selected ? primaryColor : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="cake"
                        size={15}
                        color={selected ? '#ffffff' : primaryColor}
                      />
                      <Text
                        style={[
                          styles.ownerBtnText,
                          { color: selected ? '#ffffff' : colors.text },
                        ]}
                      >
                        {getDisplayName(p)} ({p})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Título *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Nuestro Aniversario, Primer Viaje..."
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
            {kind === 'birthday'
              ? 'Fecha de nacimiento *'
              : kind === 'monthiversary'
              ? 'Fecha de inicio (se celebra ese día cada mes) *'
              : 'Fecha *'}
          </Text>
          <TouchableOpacity
            onPress={() => setDatePickerOpen(true)}
            style={[
              styles.dateSelectorBtn,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <Ionicons name="calendar-outline" size={16} color={primaryColor} />
            <Text style={[styles.dateSelectorText, { color: colors.text }]}>
              {formatDisplayDate(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </TouchableOpacity>

          {kind === 'monthiversary' ? (
            <View style={[styles.recurrenceInfoBox, { backgroundColor: `${primaryColor}12` }]}>
              <Ionicons name="sparkles" size={15} color={primaryColor} />
              <Text style={[styles.recurrenceInfoText, { color: primaryColor }]}>
                El mesiversario se repite automáticamente todos los meses.
              </Text>
            </View>
          ) : (
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={[styles.switchTitle, { color: colors.text }]}>
                  Repetir cada año
                </Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Calcula la próxima fecha anual y cuántos años se cumplen
                </Text>
              </View>
              <Switch
                value={recurringYearly}
                onValueChange={setRecurringYearly}
                trackColor={{ false: colors.border, true: `${primaryColor}88` }}
                thumbColor={recurringYearly ? primaryColor : '#f4f3f4'}
              />
            </View>
          )}

          <View style={styles.formBtnsRow}>
            <FeatureButton
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              style={styles.flexBtn}
            />
            <FeatureButton
              label={saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar fecha'}
              icon="checkmark-circle"
              disabled={saving}
              onPress={handleSave}
              style={styles.flexBtn}
            />
          </View>
        </FeatureCard>
      ) : (
        <FeatureButton
          label="Agregar fecha personalizada"
          icon="add"
          onPress={handleStartCreate}
        />
      )}

      {/* Lista ordenada por proximidad */}
      <View style={styles.listHeader}>
        <Text style={[styles.listHeaderTitle, { color: colors.text }]}>
          Próximas celebraciones ({computedList.length})
        </Text>
      </View>

      {computedList.length === 0 ? (
        <FeatureCard style={styles.emptyCard}>
          <Ionicons name="cake" size={28} color={primaryColor} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aún no hay fechas importantes registradas
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Usa los botones rápidos de arriba para agregar los cumpleaños de Javier, Karla o su
            Mesiversario.
          </Text>
        </FeatureCard>
      ) : (
        computedList.map(renderImportantDateCard)
      )}

      <DatePickerModal
        visible={datePickerOpen}
        value={date}
        title="Selecciona la fecha"
        showQuickSelect={false}
        onSelect={(d) => setDate(d)}
        onClose={() => setDatePickerOpen(false)}
      />
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayHeroCard: {
    gap: 6,
  },
  todayHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  todayHeroItem: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  presetsSection: {
    gap: 8,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  formCard: {
    gap: 10,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBanner: {
    padding: 10,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  kindsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kindChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  kindChoiceText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  ownerSection: {
    gap: 6,
  },
  ownerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ownerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ownerBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateSelectorText: {
    fontSize: 13.5,
    fontWeight: '600',
    textTransform: 'capitalize',
    flex: 1,
  },
  recurrenceInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  recurrenceInfoText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  formBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  flexBtn: {
    flex: 1,
  },
  listHeader: {
    marginTop: 4,
  },
  listHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  dateCard: {
    gap: 10,
  },
  todayHighlightRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  todayHighlightRibbonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kindIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMainInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  kindTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  kindTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countdownPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  celebrationBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  celebrationBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  datesInfoBox: {
    gap: 4,
  },
  dateInfoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateInfoLabel: {
    fontSize: 12.5,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
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
import {
  CoupleEvent,
  deleteCoupleEvent,
  EventReminderMinutes,
  formatEventCountdown,
  formatReminderOption,
  getAllEvents,
  getCachedEvents,
  getUpcomingEvents,
  normalizeTimeInput,
  REMINDER_OPTIONS,
  saveCoupleEvent,
  splitAndSortEvents,
  subscribeCoupleEvents,
  syncNextEventSummaryToHome,
} from '../../services/feature/eventsService';

export { getUpcomingEvents };

const QUICK_TIMES = ['12:00', '15:00', '18:00', '20:00', '21:00'];

/**
 * Tarjeta compacta para la pantalla de Inicio que muestra las próximas 2 citas agendadas.
 */
export const NextEventsPreviewCard: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors, primaryColor } = useTheme();
  const [events, setEvents] = useState<CoupleEvent[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());

  const loadUpcoming = useCallback(async () => {
    const cached = await getCachedEvents();
    if (cached.length > 0) {
      const { upcoming } = splitAndSortEvents(cached, new Date());
      setEvents(upcoming.slice(0, 2));
    }
    const fresh = await getUpcomingEvents(2);
    setEvents(fresh);
  }, []);

  useEffect(() => {
    void loadUpcoming();
    const unsub = subscribeCoupleEvents(() => {
      void loadUpcoming();
    });
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [loadUpcoming]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Agenda compartida de citas"
      style={[
        styles.previewCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.previewHeader}>
        <View style={styles.previewTitleRow}>
          <View style={[styles.previewIconBadge, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="calendar-heart" size={18} color={primaryColor} />
          </View>
          <View>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              Agenda de citas
            </Text>
            <Text style={[styles.previewSubtitle, { color: colors.textMuted }]}>
              {events.length > 0
                ? `${events.length === 1 ? 'Próxima cita programada' : 'Próximas 2 citas juntos'}`
                : 'Planeen su próxima salida'}
            </Text>
          </View>
        </View>
        <View style={[styles.previewActionPill, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.previewActionText, { color: primaryColor }]}>Ver agenda</Text>
          <Ionicons name="chevron-forward" size={14} color={primaryColor} />
        </View>
      </View>

      {events.length === 0 ? (
        <View style={[styles.previewEmptyBox, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.previewEmptyText, { color: colors.textSecondary }]}>
            No hay citas próximas. Toca aquí para agendar una cita especial.
          </Text>
        </View>
      ) : (
        <View style={styles.previewList}>
          {events.map((ev) => {
            const countdown = formatEventCountdown(ev, now);
            const isToday = countdown.startsWith('¡Es hoy!') || countdown.startsWith('Hoy');
            return (
              <View
                key={ev.id}
                style={[
                  styles.previewItem,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: isToday ? primaryColor : colors.border,
                  },
                ]}
              >
                <View style={styles.previewItemMain}>
                  <Text
                    style={[styles.previewItemTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {ev.title}
                  </Text>
                  <View style={styles.previewMetaRow}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.previewMetaText, { color: colors.textSecondary }]}>
                      {formatDisplayDate(ev.event_date, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {ev.event_time ? ` · ${ev.event_time}` : ''}
                    </Text>
                    {ev.location ? (
                      <>
                        <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                        <Text
                          style={[styles.previewMetaText, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {ev.location}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <View
                  style={[
                    styles.countdownBadge,
                    {
                      backgroundColor: isToday ? primaryColor : `${primaryColor}18`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.countdownBadgeText,
                      { color: isToday ? '#ffffff' : primaryColor },
                    ]}
                  >
                    {countdown}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const CoupleEventsModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();

  const [events, setEvents] = useState<CoupleEvent[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos del formulario
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(() => toLocalDateString(new Date()));
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [remindMinutes, setRemindMinutes] = useState<EventReminderMinutes>(60);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const cached = await getCachedEvents();
    if (cached.length > 0) setEvents(cached);
    const fresh = await getAllEvents();
    setEvents(fresh);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setNow(new Date());
    void loadData();
    const unsub = subscribeCoupleEvents(() => {
      void loadData();
    });
    const timer = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [visible, loadData]);

  const { upcoming, past } = useMemo(() => splitAndSortEvents(events, now), [events, now]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setEventDate(toLocalDateString(new Date()));
    setEventTime('');
    setLocation('');
    setNotes('');
    setRemindMinutes(60);
    setErrorMsg(null);
  }, []);

  const handleStartCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (ev: CoupleEvent) => {
    setEditingId(ev.id);
    setTitle(ev.title);
    setEventDate(toLocalDateString(ev.event_date));
    setEventTime(ev.event_time || '');
    setLocation(ev.location || '');
    setNotes(ev.notes || '');
    const rem: EventReminderMinutes =
      ev.remind_minutes_before === 0 ||
      ev.remind_minutes_before === 15 ||
      ev.remind_minutes_before === 60 ||
      ev.remind_minutes_before === 1440
        ? ev.remind_minutes_before
        : 60;
    setRemindMinutes(rem);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleFormatTimeTyping = (text: string) => {
    const cleaned = text.replace(/[^0-9:]/g, '');
    if (cleaned.length === 2 && !cleaned.includes(':') && eventTime.length === 1) {
      setEventTime(`${cleaned}:`);
      return;
    }
    setEventTime(cleaned.slice(0, 5));
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg('Escribe un título para su cita.');
      return;
    }
    if (eventTime.trim() && !normalizeTimeInput(eventTime)) {
      setErrorMsg('La hora debe tener el formato HH:mm (ej. 19:30).');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await saveCoupleEvent({
        id: editingId || undefined,
        title: trimmedTitle,
        event_date: eventDate,
        event_time: normalizeTimeInput(eventTime),
        location: location.trim() || null,
        notes: notes.trim() || null,
        remind_minutes_before: remindMinutes,
        created_by: profile || 'Javier',
      });
      await loadData();
      void syncNextEventSummaryToHome(profile || 'Javier');
      setIsFormOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo guardar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = (ev: CoupleEvent) => {
    Alert.alert(
      'Eliminar cita',
      `¿Quieres eliminar "${ev.title}" de la agenda compartida?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCoupleEvent(ev.id);
            if (editingId === ev.id) {
              setIsFormOpen(false);
              resetForm();
            }
            await loadData();
            void syncNextEventSummaryToHome(profile || 'Javier');
          },
        },
      ]
    );
  };

  const renderEventCard = (ev: CoupleEvent, isPastSection: boolean) => {
    const countdown = formatEventCountdown(ev, now);
    const isToday = !isPastSection && (countdown.startsWith('¡Es hoy!') || countdown.startsWith('Hoy'));

    return (
      <FeatureCard
        key={ev.id}
        style={[
          styles.eventCard,
          isToday && { borderColor: primaryColor, borderWidth: 1.5 },
          isPastSection && { opacity: 0.78 },
        ]}
      >
        <View style={styles.eventCardTop}>
          <View style={styles.eventTitleWrap}>
            <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.title}</Text>
            <Text style={[styles.eventAuthor, { color: colors.textMuted }]}>
              Agendada por {getDisplayName(ev.created_by)}
            </Text>
          </View>
          <View
            style={[
              styles.countdownBadge,
              {
                backgroundColor: isPastSection
                  ? colors.surfaceAlt
                  : isToday
                  ? primaryColor
                  : `${primaryColor}18`,
              },
            ]}
          >
            <Text
              style={[
                styles.countdownBadgeText,
                {
                  color: isPastSection
                    ? colors.textMuted
                    : isToday
                    ? '#ffffff'
                    : primaryColor,
                },
              ]}
            >
              {countdown}
            </Text>
          </View>
        </View>

        <View style={styles.eventDetailsList}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={15} color={primaryColor} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {formatDisplayDate(ev.event_date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {ev.event_time ? (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={15} color={primaryColor} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {ev.event_time} hrs
              </Text>
            </View>
          ) : null}

          {ev.location ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={15} color={primaryColor} />
              <Text style={[styles.detailText, { color: colors.text }]}>{ev.location}</Text>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Ionicons name="notifications-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.detailTextMuted, { color: colors.textSecondary }]}>
              {formatReminderOption(ev.remind_minutes_before)}
            </Text>
          </View>
        </View>

        {ev.notes ? (
          <View style={[styles.notesBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{ev.notes}</Text>
          </View>
        ) : null}

        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleStartEdit(ev)}
            style={[styles.iconActionBtn, { backgroundColor: colors.surfaceAlt }]}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${ev.title}`}
          >
            <Ionicons name="create-outline" size={15} color={colors.text} />
            <Text style={[styles.iconActionText, { color: colors.text }]}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleConfirmDelete(ev)}
            style={[styles.iconActionBtn, { backgroundColor: `${colors.danger}15` }]}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${ev.title}`}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
            <Text style={[styles.iconActionText, { color: colors.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </FeatureCard>
    );
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Agenda de citas"
      subtitle="Nuestros planes, salidas y momentos especiales"
      icon="calendar-heart"
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
          accessibilityLabel={isFormOpen ? 'Cerrar formulario' : 'Nueva cita'}
        >
          <Ionicons name={isFormOpen ? 'close' : 'add'} size={20} color="#ffffff" />
        </TouchableOpacity>
      }
    >
      {/* Formulario de crear / editar cita */}
      {isFormOpen ? (
        <FeatureCard style={styles.formCard}>
          <View style={styles.formHeaderRow}>
            <Ionicons name="calendar-clock" size={18} color={primaryColor} />
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Editar cita' : 'Nueva cita juntos'}
            </Text>
          </View>

          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: `${colors.danger}18` }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Título de la cita *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Cena romántica, Picnic al atardecer..."
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

          <View style={styles.rowTwoCols}>
            <View style={styles.colFlex}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Fecha *</Text>
              <TouchableOpacity
                onPress={() => setDatePickerOpen(true)}
                style={[
                  styles.dateSelectorBtn,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="calendar-outline" size={16} color={primaryColor} />
                <Text style={[styles.dateSelectorText, { color: colors.text }]} numberOfLines={1}>
                  {formatDisplayDate(eventDate, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.colTime}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Hora (opcional)
              </Text>
              <TextInput
                value={eventTime}
                onChangeText={handleFormatTimeTyping}
                placeholder="HH:mm"
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.quickTimeRow}>
            {QUICK_TIMES.map((qt) => {
              const selected = eventTime === qt;
              return (
                <TouchableOpacity
                  key={qt}
                  onPress={() => setEventTime(selected ? '' : qt)}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                      borderColor: selected ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      { color: selected ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    {qt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Lugar (opcional)
          </Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Ej. Restaurante favorito, Centro, Casa..."
            placeholderTextColor={colors.textMuted}
            maxLength={255}
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
            Notas o detalles (opcional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Código de vestimenta, sorpresa, reservación..."
            placeholderTextColor={colors.textMuted}
            maxLength={1000}
            multiline
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

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Recordatorio</Text>
          <View style={styles.reminderGrid}>
            {REMINDER_OPTIONS.map((opt) => {
              const selected = remindMinutes === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setRemindMinutes(opt.value)}
                  style={[
                    styles.reminderChip,
                    {
                      backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                      borderColor: selected ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={14}
                    color={selected ? '#ffffff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.reminderChipText,
                      { color: selected ? '#ffffff' : colors.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formButtonsRow}>
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
              label={saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agendar cita'}
              icon="checkmark-circle"
              disabled={saving}
              onPress={handleSave}
              style={styles.flexBtn}
            />
          </View>
        </FeatureCard>
      ) : (
        <FeatureButton
          label="Agendar nueva cita"
          icon="add"
          onPress={handleStartCreate}
        />
      )}

      {/* Sección: Próximas */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="calendar-clock" size={18} color={primaryColor} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Próximas</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${primaryColor}18` }]}>
          <Text style={[styles.countPillText, { color: primaryColor }]}>{upcoming.length}</Text>
        </View>
      </View>

      {upcoming.length === 0 ? (
        <FeatureCard style={styles.emptyCard}>
          <Ionicons name="calendar-heart" size={28} color={primaryColor} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No tienen citas próximas agendadas
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Planeen su próxima salida, cena o escapada juntos y reciban un recordatorio.
          </Text>
        </FeatureCard>
      ) : (
        upcoming.map((ev) => renderEventCard(ev, false))
      )}

      {/* Sección: Pasadas */}
      <View style={[styles.sectionHeader, { marginTop: 10 }]}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pasadas</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={[styles.countPillText, { color: colors.textMuted }]}>{past.length}</Text>
        </View>
      </View>

      {past.length === 0 ? (
        <FeatureCard style={styles.emptyCardSmall}>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Aquí aparecerá el historial de sus citas pasadas.
          </Text>
        </FeatureCard>
      ) : (
        past.map((ev) => renderEventCard(ev, true))
      )}

      <DatePickerModal
        visible={datePickerOpen}
        value={eventDate}
        title="Fecha de la cita"
        onSelect={(d) => setEventDate(d)}
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
  formCard: {
    gap: 10,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  colFlex: {
    flex: 1,
    gap: 6,
  },
  colTime: {
    width: 115,
    gap: 6,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textTransform: 'capitalize',
  },
  quickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reminderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reminderChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  flexBtn: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyCardSmall: {
    alignItems: 'center',
    paddingVertical: 16,
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
  eventCard: {
    gap: 10,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  eventTitleWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  eventAuthor: {
    fontSize: 11,
    marginTop: 2,
  },
  countdownBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  countdownBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  eventDetailsList: {
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
    flex: 1,
  },
  detailTextMuted: {
    fontSize: 12,
    flex: 1,
  },
  notesBox: {
    padding: 10,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  iconActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Preview card para pantalla de Inicio
  previewCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  previewIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  previewActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  previewActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewEmptyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  previewEmptyText: {
    fontSize: 12.5,
    flex: 1,
  },
  previewList: {
    gap: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  previewItemMain: {
    flex: 1,
    gap: 3,
  },
  previewItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  previewMetaText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
});

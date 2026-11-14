import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatDisplayDate, toLocalDateString } from '../../services/StorageService';
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  GratitudeEntryRow,
  getGratitudeEntries,
  saveGratitudeEntry,
  subscribeGratitudeEntries,
  groupGratitudeByDate,
} from '../../services/feature/gratitudeService';
import { UserProfile } from '../../types';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatMonthKey(monthKey: string): string {
  const parts = monthKey.split('-').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return monthKey;
  const [year, month] = parts;
  const mName = MONTH_NAMES_ES[month - 1] || monthKey;
  return `${mName} ${year}`;
}

export const GratitudeModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';

  const [entries, setEntries] = useState<GratitudeEntryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [isEditingToday, setIsEditingToday] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const todayStr = toLocalDateString(new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGratitudeEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadData();
    const unsub = subscribeGratitudeEntries(() => {
      void loadData();
    });
    return unsub;
  }, [visible, loadData]);

  const groups = useMemo(() => groupGratitudeByDate(entries), [entries]);

  const myTodayEntry = useMemo(
    () =>
      entries.find(
        (e) => toLocalDateString(e.entry_date) === todayStr && e.profile === activeProfile
      ),
    [entries, todayStr, activeProfile]
  );

  useEffect(() => {
    if (myTodayEntry?.text && !isEditingToday) {
      setDraft(myTodayEntry.text);
    } else if (!myTodayEntry?.text) {
      setDraft('');
    }
  }, [myTodayEntry?.text, isEditingToday]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => set.add(g.monthKey));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [groups]);

  const filteredGroups = useMemo(
    () =>
      selectedMonth === 'ALL'
        ? groups
        : groups.filter((g) => g.monthKey === selectedMonth),
    [groups, selectedMonth]
  );

  const handleSaveToday = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveGratitudeEntry({
        profile: activeProfile,
        text: trimmed,
        date: todayStr,
      });
      setIsEditingToday(false);
      setStatusMsg('Guardado en su diario de gratitud ✨');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const showEditor = !myTodayEntry?.text || isEditingToday;

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Diario de gratitud"
      subtitle="Agradeciendo lo bonito de cada día juntos"
      icon="journal"
    >
      {/* Contador total */}
      <View style={[styles.counterBanner, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={styles.counterItem}>
          <Ionicons name="heart" size={18} color={primaryColor} />
          <Text style={[styles.counterValue, { color: colors.text }]}>{entries.length}</Text>
          <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
            {entries.length === 1 ? 'agradecimiento en total' : 'agradecimientos en total'}
          </Text>
        </View>
        <View style={styles.counterItem}>
          <Ionicons name="calendar-outline" size={16} color={primaryColor} />
          <Text style={[styles.counterLabel, { color: colors.textSecondary }]}>
            {groups.length} {groups.length === 1 ? 'día' : 'días'}
          </Text>
        </View>
      </View>

      {/* Entrada de hoy */}
      <FeatureCard style={{ borderColor: primaryColor, borderWidth: 1 }}>
        <View style={styles.todayHeader}>
          <View style={styles.todayTitleRow}>
            <Ionicons name="sparkles" size={16} color={primaryColor} />
            <Text style={[styles.todayTitle, { color: colors.text }]}>
              Hoy agradezco... ({getDisplayName(activeProfile)})
            </Text>
          </View>
          <Text style={[styles.todayDate, { color: colors.textMuted }]}>
            {formatDisplayDate(todayStr, { day: 'numeric', month: 'short' })}
          </Text>
        </View>

        {showEditor ? (
          <View style={styles.editorWrap}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Hoy agradezco por..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={1000}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
            <View style={styles.editorButtons}>
              {isEditingToday ? (
                <FeatureButton
                  label="Cancelar"
                  variant="ghost"
                  onPress={() => {
                    setIsEditingToday(false);
                    setDraft(myTodayEntry?.text || '');
                  }}
                />
              ) : null}
              <View style={styles.flex}>
                <FeatureButton
                  label={
                    saving
                      ? 'Guardando...'
                      : myTodayEntry?.text
                      ? 'Actualizar gratitud de hoy'
                      : 'Guardar gratitud de hoy'
                  }
                  icon="checkmark-circle"
                  onPress={handleSaveToday}
                  disabled={saving || !draft.trim()}
                />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.savedTodayWrap}>
            <View style={[styles.savedBubble, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.savedText, { color: colors.text }]}>{myTodayEntry?.text}</Text>
            </View>
            <View style={styles.savedFooter}>
              <Text style={[styles.savedHint, { color: colors.success }]}>
                {statusMsg || '✓ Ya escribiste tu gratitud de hoy'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDraft(myTodayEntry?.text || '');
                  setIsEditingToday(true);
                }}
                style={[styles.editBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="pencil" size={13} color={primaryColor} />
                <Text style={[styles.editBtnText, { color: primaryColor }]}>Editar hoy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </FeatureCard>

      {/* Filtro por mes */}
      {availableMonths.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthFilterRow}
        >
          <TouchableOpacity
            onPress={() => setSelectedMonth('ALL')}
            style={[
              styles.monthChip,
              {
                backgroundColor: selectedMonth === 'ALL' ? primaryColor : colors.surfaceAlt,
                borderColor: selectedMonth === 'ALL' ? primaryColor : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.monthChipText,
                { color: selectedMonth === 'ALL' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              Todos ({groups.length})
            </Text>
          </TouchableOpacity>
          {availableMonths.map((mKey) => {
            const active = selectedMonth === mKey;
            return (
              <TouchableOpacity
                key={mKey}
                onPress={() => setSelectedMonth(mKey)}
                style={[
                  styles.monthChip,
                  {
                    backgroundColor: active ? primaryColor : colors.surfaceAlt,
                    borderColor: active ? primaryColor : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    { color: active ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {formatMonthKey(mKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Línea de tiempo agrupada por fecha (ambas entradas lado a lado) */}
      <View style={styles.timelineHeader}>
        <Ionicons name="book-outline" size={16} color={primaryColor} />
        <Text style={[styles.timelineTitle, { color: colors.text }]}>
          Línea de tiempo de gratitud
        </Text>
        {loading ? <ActivityIndicator size="small" color={primaryColor} /> : null}
      </View>

      {filteredGroups.length === 0 ? (
        <FeatureCard>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aún no hay entradas en este periodo. ¡Escribe hoy tu primer motivo de gratitud!
          </Text>
        </FeatureCard>
      ) : (
        filteredGroups.map((g) => (
          <FeatureCard key={g.date} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Ionicons name="calendar-outline" size={14} color={primaryColor} />
              <Text style={[styles.dayDateText, { color: colors.text }]}>
                {formatDisplayDate(g.date, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>

            <View style={styles.sideBySideRow}>
              {/* Columna Karlita */}
              <View
                style={[
                  styles.personCol,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <View style={styles.personColHeader}>
                  <Ionicons name="heart" size={12} color={primaryColor} />
                  <Text style={[styles.personColName, { color: primaryColor }]}>
                    {getDisplayName('Karla')}
                  </Text>
                </View>
                {g.karla?.text ? (
                  <Text style={[styles.entryBodyText, { color: colors.text }]}>
                    {g.karla.text}
                  </Text>
                ) : (
                  <Text style={[styles.entryEmptyText, { color: colors.textMuted }]}>
                    Sin entrada este día
                  </Text>
                )}
              </View>

              {/* Columna Javier */}
              <View
                style={[
                  styles.personCol,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <View style={styles.personColHeader}>
                  <Ionicons name="heart" size={12} color={primaryColor} />
                  <Text style={[styles.personColName, { color: primaryColor }]}>
                    {getDisplayName('Javier')}
                  </Text>
                </View>
                {g.javier?.text ? (
                  <Text style={[styles.entryBodyText, { color: colors.text }]}>
                    {g.javier.text}
                  </Text>
                ) : (
                  <Text style={[styles.entryEmptyText, { color: colors.textMuted }]}>
                    Sin entrada este día
                  </Text>
                )}
              </View>
            </View>
          </FeatureCard>
        ))
      )}
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  counterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  counterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  todayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  todayDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  editorWrap: {
    gap: 10,
  },
  input: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  editorButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedTodayWrap: {
    gap: 8,
  },
  savedBubble: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  savedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  savedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savedHint: {
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  monthChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  dayCard: {
    gap: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDateText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 10,
  },
  personCol: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  personColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  personColName: {
    fontSize: 12,
    fontWeight: '800',
  },
  entryBodyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  entryEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

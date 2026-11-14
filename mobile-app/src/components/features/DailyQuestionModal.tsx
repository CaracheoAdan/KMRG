import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import { getQuestionForDate } from '../../services/feature/dailyQuestionBank';
import {
  DailyAnswerRow,
  fetchDailyAnswers,
  saveDailyAnswer,
  subscribeDailyAnswers,
  buildDailyQuestionGroups,
} from '../../services/feature/dailyQuestionService';
import { UserProfile } from '../../types';
import { sendPartnerPushNotification } from '../../services/NotificationService';

export const DailyQuestionModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';
  const partnerProfile: UserProfile = activeProfile === 'Javier' ? 'Karla' : 'Javier';

  const [rows, setRows] = useState<DailyAnswerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remindedPartner, setRemindedPartner] = useState(false);

  const todayStr = toLocalDateString(new Date());
  const todayQuestion = useMemo(() => getQuestionForDate(todayStr), [todayStr]);

  const loadData = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = await fetchDailyAnswers(force);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadData(true);
    const unsub = subscribeDailyAnswers(() => {
      void loadData(true);
    });
    return unsub;
  }, [visible, loadData]);

  const { groups, bothAnsweredTotal, streakDays } = useMemo(
    () => buildDailyQuestionGroups(rows),
    [rows]
  );

  const todayGroup = useMemo(
    () => groups.find((g) => g.date === todayStr),
    [groups, todayStr]
  );

  const myTodayAnswer =
    activeProfile === 'Javier' ? todayGroup?.javier : todayGroup?.karla;
  const partnerTodayAnswer =
    activeProfile === 'Javier' ? todayGroup?.karla : todayGroup?.javier;

  const hasMyAnswer = Boolean(myTodayAnswer?.answer);
  const hasPartnerAnswer = Boolean(partnerTodayAnswer?.answer);
  const bothAnsweredToday = hasMyAnswer && hasPartnerAnswer;
  // Cada perfil puede editar su respuesta del día hasta que la pareja responda
  const canEditToday = !hasMyAnswer || (!hasPartnerAnswer && isEditing);

  useEffect(() => {
    if (myTodayAnswer?.answer && !isEditing) {
      setDraft(myTodayAnswer.answer);
    } else if (!myTodayAnswer?.answer) {
      setDraft('');
    }
  }, [myTodayAnswer?.answer, isEditing]);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setErrorMsg('Escribe tu respuesta antes de guardar.');
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      await saveDailyAnswer({
        profile: activeProfile,
        answer: trimmed,
        date: todayStr,
      });
      setIsEditing(false);
      await loadData();
    } catch (e: any) {
      setErrorMsg(e?.message || 'No se pudo guardar tu respuesta.');
    } finally {
      setSaving(false);
    }
  };

  const pastCompletedGroups = useMemo(
    () => groups.filter((g) => g.date !== todayStr && g.bothAnswered),
    [groups, todayStr]
  );

  const myName = getDisplayName(activeProfile);
  const partnerName = getDisplayName(partnerProfile);

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Pregunta del día"
      subtitle="Conociéndonos más cada día"
      icon="help-circle"
    >
      {/* Resumen de racha y días completados */}
      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="flame" size={16} color={primaryColor} />
          <Text style={[styles.statValue, { color: colors.text }]}>{streakDays}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {streakDays === 1 ? 'día de racha' : 'días de racha'}
          </Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Ionicons name="heart" size={16} color={primaryColor} />
          <Text style={[styles.statValue, { color: colors.text }]}>{bothAnsweredTotal}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {bothAnsweredTotal === 1 ? 'día respondido juntos' : 'días respondidos juntos'}
          </Text>
        </View>
      </View>

      {/* Tarjeta de la pregunta de hoy */}
      <FeatureCard style={{ borderColor: primaryColor, borderWidth: 1 }}>
        <View style={styles.questionHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={13} color={primaryColor} />
            <Text style={[styles.categoryText, { color: primaryColor }]}>
              {todayQuestion.category} · Hoy
            </Text>
          </View>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
            {formatDisplayDate(todayStr, { day: 'numeric', month: 'short' })}
          </Text>
        </View>

        <Text style={[styles.questionTitle, { color: colors.text }]}>
          {todayQuestion.question}
        </Text>

        {/* Mi respuesta */}
        <View style={styles.sectionBlock}>
          <View style={styles.personHeader}>
            <Ionicons
              name={hasMyAnswer ? 'checkmark-circle' : 'create-outline'}
              size={16}
              color={hasMyAnswer ? colors.success : primaryColor}
            />
            <Text style={[styles.personTitle, { color: colors.text }]}>
              Tu respuesta ({myName})
            </Text>
            {hasMyAnswer && !hasPartnerAnswer && !isEditing ? (
              <TouchableOpacity
                onPress={() => {
                  setDraft(myTodayAnswer?.answer || '');
                  setIsEditing(true);
                }}
                style={[styles.editChip, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="pencil" size={12} color={primaryColor} />
                <Text style={[styles.editChipText, { color: primaryColor }]}>Editar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {canEditToday ? (
            <View style={styles.editorWrap}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Escribe lo que sientes o piensas..."
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
              {errorMsg ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
              ) : null}
              <View style={styles.editorActions}>
                {isEditing ? (
                  <FeatureButton
                    label="Cancelar"
                    variant="ghost"
                    onPress={() => {
                      setIsEditing(false);
                      setDraft(myTodayAnswer?.answer || '');
                      setErrorMsg(null);
                    }}
                  />
                ) : null}
                <View style={styles.flex}>
                  <FeatureButton
                    label={saving ? 'Guardando...' : hasMyAnswer ? 'Actualizar respuesta' : 'Enviar respuesta'}
                    icon="send"
                    onPress={handleSave}
                    disabled={saving || !draft.trim()}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.answerBubble, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.answerText, { color: colors.text }]}>
                {myTodayAnswer?.answer}
              </Text>
            </View>
          )}
        </View>

        {/* Respuesta de la pareja */}
        <View style={styles.sectionBlock}>
          <View style={styles.personHeader}>
            <Ionicons
              name={bothAnsweredToday ? 'heart' : 'lock-closed'}
              size={16}
              color={bothAnsweredToday ? primaryColor : colors.textMuted}
            />
            <Text style={[styles.personTitle, { color: colors.text }]}>
              Respuesta de {partnerName}
            </Text>
          </View>

          {!hasMyAnswer ? (
            <View style={[styles.lockedBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="lock-closed" size={20} color={primaryColor} />
              <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                Responde primero para descubrir la respuesta de tu pareja 🔒
              </Text>
              {hasPartnerAnswer ? (
                <Text style={[styles.lockedHint, { color: primaryColor }]}>
                  ¡{partnerName} ya respondió! En cuanto envíes la tuya se desbloqueará.
                </Text>
              ) : null}
            </View>
          ) : !hasPartnerAnswer ? (
            <View style={[styles.lockedBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name="hourglass-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                Esperando a que {partnerName} responda la pregunta de hoy...
              </Text>
              <Text style={[styles.lockedHint, { color: colors.textMuted }]}>
                Puedes editar tu respuesta mientras tanto.
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                <TouchableOpacity
                  onPress={() => void loadData(true)}
                  disabled={loading}
                  style={[styles.checkPartnerButton, { borderColor: primaryColor }]}
                >
                  <Ionicons name="refresh" size={13} color={primaryColor} />
                  <Text style={[styles.checkPartnerText, { color: primaryColor }]}>
                    {loading ? 'Comprobando...' : 'Comprobar si ya respondió'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (remindedPartner) return;
                    setRemindedPartner(true);
                    void sendPartnerPushNotification(
                      partnerProfile,
                      '💬 Pregunta del día pendiente',
                      `${myName} ya contestó la pregunta de hoy y está esperando tu respuesta para desbloquearla 🔒`,
                      { type: 'DAILY_QUESTION_REMINDER', date: todayStr, sender: activeProfile }
                    );
                  }}
                  disabled={remindedPartner}
                  style={[
                    styles.checkPartnerButton,
                    {
                      borderColor: remindedPartner ? colors.border : primaryColor,
                      backgroundColor: remindedPartner ? colors.surface : `${primaryColor}14`,
                    },
                  ]}
                >
                  <Ionicons
                    name={remindedPartner ? 'checkmark-circle' : 'notifications-outline'}
                    size={13}
                    color={remindedPartner ? colors.success : primaryColor}
                  />
                  <Text
                    style={[
                      styles.checkPartnerText,
                      { color: remindedPartner ? colors.success : primaryColor },
                    ]}
                  >
                    {remindedPartner ? '¡Aviso enviado!' : `Recordarle a ${partnerName}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.answerBubble, { backgroundColor: colors.primaryLight, borderColor: primaryColor }]}>
              <Text style={[styles.answerText, { color: colors.text }]}>
                {partnerTodayAnswer?.answer}
              </Text>
            </View>
          )}
        </View>
      </FeatureCard>

      {/* Historial de días anteriores donde ambos respondieron */}
      <View style={styles.historyHeader}>
        <Ionicons name="calendar-outline" size={16} color={primaryColor} />
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          Historial de respuestas ({pastCompletedGroups.length})
        </Text>
        <TouchableOpacity
          onPress={() => void loadData(true)}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.refreshIconBtn}
        >
          <Ionicons name="refresh" size={16} color={primaryColor} />
        </TouchableOpacity>
        {loading ? <ActivityIndicator size="small" color={primaryColor} /> : null}
      </View>

      {pastCompletedGroups.length === 0 ? (
        <FeatureCard>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aquí aparecerán las preguntas de días anteriores cuando ambos hayan respondido.
          </Text>
        </FeatureCard>
      ) : (
        pastCompletedGroups.map((g) => (
          <FeatureCard key={g.date} style={styles.historyCard}>
            <View style={styles.questionHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.categoryText, { color: primaryColor }]}>
                  {g.question.category}
                </Text>
              </View>
              <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                {formatDisplayDate(g.date, { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
            </View>
            <Text style={[styles.historyQuestion, { color: colors.text }]}>
              {g.question.question}
            </Text>

            <View style={styles.historyAnswersGrid}>
              <View style={[styles.historyAnswerBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.historyAuthor, { color: primaryColor }]}>
                  {getDisplayName('Karla')}
                </Text>
                <Text style={[styles.historyAnswerText, { color: colors.text }]}>
                  {g.karla?.answer || '—'}
                </Text>
              </View>
              <View style={[styles.historyAnswerBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Text style={[styles.historyAuthor, { color: primaryColor }]}>
                  {getDisplayName('Javier')}
                </Text>
                <Text style={[styles.historyAnswerText, { color: colors.text }]}>
                  {g.javier?.answer || '—'}
                </Text>
              </View>
            </View>
          </FeatureCard>
        ))
      )}
    </FeatureModalShell>
  );
};

/**
 * Tarjeta compacta para la pantalla de inicio con la pregunta de hoy y el estado actual.
 */
export const DailyQuestionPreviewCard: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const { colors, primaryColor } = useTheme();
  const { profile } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';

  const [rows, setRows] = useState<DailyAnswerRow[]>([]);
  const todayStr = toLocalDateString(new Date());
  const todayQuestion = useMemo(() => getQuestionForDate(todayStr), [todayStr]);

  const load = useCallback(async () => {
    const data = await fetchDailyAnswers();
    setRows(data);
  }, []);

  useEffect(() => {
    void load();
    const unsub = subscribeDailyAnswers(() => {
      void load();
    });
    return unsub;
  }, [load]);

  const todayRows = useMemo(
    () => rows.filter((r) => toLocalDateString(r.question_date) === todayStr),
    [rows, todayStr]
  );

  const myAnswered = todayRows.some((r) => r.profile === activeProfile && Boolean(r.answer));
  const partnerAnswered = todayRows.some((r) => r.profile !== activeProfile && Boolean(r.answer));

  let statusLabel = 'Te toca responder';
  let statusIcon = 'help-circle';
  let statusColor = primaryColor;

  if (myAnswered && partnerAnswered) {
    statusLabel = '¡Ambos respondieron!';
    statusIcon = 'checkmark-circle';
    statusColor = colors.success;
  } else if (myAnswered && !partnerAnswered) {
    statusLabel = 'Esperando a tu pareja';
    statusIcon = 'hourglass-outline';
    statusColor = colors.warning;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.previewCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Pregunta del día: ${todayQuestion.question}. Estado: ${statusLabel}`}
    >
      <View style={styles.previewTopRow}>
        <View style={styles.previewTitleWrap}>
          <View style={[styles.previewIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="help-circle" size={18} color={primaryColor} />
          </View>
          <Text style={[styles.previewHeaderTitle, { color: colors.text }]}>
            Pregunta del día
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.surfaceAlt }]}>
          <Ionicons name={statusIcon as any} size={13} color={statusColor} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={[styles.previewQuestion, { color: colors.text }]} numberOfLines={2}>
        “{todayQuestion.question}”
      </Text>

      <View style={styles.previewFooter}>
        <Text style={[styles.previewCategory, { color: colors.textMuted }]}>
          {todayQuestion.category}
        </Text>
        <View style={styles.previewActionRow}>
          <Text style={[styles.previewActionText, { color: primaryColor }]}>
            {myAnswered && partnerAnswered ? 'Ver respuestas' : myAnswered ? 'Ver estado' : 'Responder'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={primaryColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
    marginBottom: 14,
  },
  sectionBlock: {
    marginTop: 10,
    gap: 8,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  personTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  editChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editorWrap: {
    gap: 10,
  },
  input: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  answerBubble: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  lockedBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  lockedText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 19,
  },
  lockedHint: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  checkPartnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
  },
  checkPartnerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshIconBtn: {
    padding: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  historyCard: {
    gap: 10,
  },
  historyQuestion: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  historyAnswersGrid: {
    gap: 8,
    marginTop: 4,
  },
  historyAnswerBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
  },
  historyAuthor: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  historyAnswerText: {
    fontSize: 13,
    lineHeight: 19,
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewQuestion: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  previewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  previewCategory: {
    fontSize: 11,
    fontWeight: '600',
  },
  previewActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  previewActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

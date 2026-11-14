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
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  QuizQuestionRow,
  QuizAttemptRow,
  QUIZ_SUGGESTED_TEMPLATES,
  QuizSuggestedTemplate,
  fetchQuizData,
  createQuizQuestion,
  deleteQuizQuestion,
  submitQuizAttempt,
  subscribeQuizChanges,
} from '../../services/feature/quizService';
import { UserProfile } from '../../types';

type QuizTab = 'responder' | 'crear' | 'resultados';

interface RecentFeedback {
  questionId: string;
  questionText: string;
  chosenIndex: number;
  correctIndex: number;
  options: string[];
  isCorrect: boolean;
}

export const QuizModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';
  const partnerProfile: UserProfile = activeProfile === 'Javier' ? 'Karla' : 'Javier';

  const [tab, setTab] = useState<QuizTab>('responder');
  const [questions, setQuestions] = useState<QuizQuestionRow[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Estado para "Responder"
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [lastFeedback, setLastFeedback] = useState<RecentFeedback | null>(null);

  // Estado para "Crear"
  const [questionDraft, setQuestionDraft] = useState('');
  const [optionsDraft, setOptionsDraft] = useState<string[]>(['', '']);
  const [correctIndexDraft, setCorrectIndexDraft] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'ok'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchQuizData();
      setQuestions(data.questions);
      setAttempts(data.attempts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadData();
    const unsub = subscribeQuizChanges(() => {
      void loadData();
    });
    return unsub;
  }, [visible, loadData]);

  const myAttemptedQuestionIds = useMemo(() => {
    const set = new Set<string>();
    attempts.forEach((a) => {
      if (a.profile === activeProfile) set.add(a.question_id);
    });
    return set;
  }, [attempts, activeProfile]);

  // Preguntas escritas por mi pareja que aún no he respondido
  const pendingPartnerQuestions = useMemo(
    () =>
      questions.filter(
        (q) => q.author === partnerProfile && !myAttemptedQuestionIds.has(q.id)
      ),
    [questions, partnerProfile, myAttemptedQuestionIds]
  );

  // Mis preguntas creadas
  const myCreatedQuestions = useMemo(
    () => questions.filter((q) => q.author === activeProfile),
    [questions, activeProfile]
  );

  const handleSelectAnswer = async (q: QuizQuestionRow, chosenIndex: number) => {
    if (submittingId) return;
    setSubmittingId(q.id);
    try {
      const attempt = await submitQuizAttempt({
        question: q,
        profile: activeProfile,
        chosenIndex,
      });
      setLastFeedback({
        questionId: q.id,
        questionText: q.question,
        chosenIndex,
        correctIndex: Number(q.correct_index),
        options: q.options,
        isCorrect: attempt.is_correct,
      });
      await loadData();
    } finally {
      setSubmittingId(null);
    }
  };

  const applyTemplate = (tpl: QuizSuggestedTemplate) => {
    setQuestionDraft(tpl.question);
    setOptionsDraft([...tpl.options]);
    setCorrectIndexDraft(tpl.correctIndex);
    setFormMsg(null);
  };

  const handleAddOption = () => {
    if (optionsDraft.length >= 4) return;
    setOptionsDraft((prev) => [...prev, '']);
  };

  const handleRemoveOption = (idx: number) => {
    if (optionsDraft.length <= 2) return;
    const next = optionsDraft.filter((_, i) => i !== idx);
    setOptionsDraft(next);
    if (correctIndexDraft >= next.length) {
      setCorrectIndexDraft(0);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    setOptionsDraft((prev) => prev.map((item, i) => (i === idx ? val : item)));
  };

  const handleCreateQuestion = async () => {
    const cleanQ = questionDraft.trim();
    const validOpts = optionsDraft.map((o) => o.trim()).filter(Boolean);
    if (!cleanQ) {
      setFormMsg({ type: 'error', text: 'Escribe una pregunta sobre ti.' });
      return;
    }
    if (validOpts.length < 2) {
      setFormMsg({ type: 'error', text: 'Completa al menos 2 opciones de respuesta.' });
      return;
    }

    // Ajustar el índice correcto según las opciones no vacías
    const chosenText = (optionsDraft[correctIndexDraft] || '').trim();
    const resolvedCorrectIdx = Math.max(0, validOpts.findIndex((o) => o === chosenText));

    setCreating(true);
    setFormMsg(null);
    try {
      await createQuizQuestion({
        author: activeProfile,
        question: cleanQ,
        options: validOpts,
        correctIndex: resolvedCorrectIdx,
      });
      setQuestionDraft('');
      setOptionsDraft(['', '']);
      setCorrectIndexDraft(0);
      setFormMsg({ type: 'ok', text: '¡Pregunta creada! Tu pareja ya puede responderla.' });
      await loadData();
    } catch (e: any) {
      setFormMsg({ type: 'error', text: e?.message || 'Error al guardar la pregunta.' });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuizQuestion(id);
    await loadData();
  };

  // Estadísticas por persona para "Resultados"
  const stats = useMemo(() => {
    const questionMap = new Map<string, QuizQuestionRow>();
    questions.forEach((q) => questionMap.set(q.id, q));

    // Filtrar intentos cuyas preguntas aún existen
    const validAttempts = attempts.filter((a) => questionMap.has(a.question_id));

    const calcFor = (person: UserProfile) => {
      const personAttempts = validAttempts.filter((a) => a.profile === person);
      const total = personAttempts.length;
      const correct = personAttempts.filter((a) => a.is_correct).length;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { total, correct, pct };
    };

    return {
      karla: calcFor('Karla'),
      javier: calcFor('Javier'),
      validAttempts,
      questionMap,
    };
  }, [questions, attempts]);

  const myName = getDisplayName(activeProfile);
  const partnerName = getDisplayName(partnerProfile);

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="¿Qué tanto me conoces?"
      subtitle="Pon a prueba cuánto saben el uno del otro"
      icon="brain"
    >
      {/* Selector de pestañas */}
      <View style={[styles.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        {(
          [
            { key: 'responder', label: `Responder (${pendingPartnerQuestions.length})`, icon: 'help-circle' },
            { key: 'crear', label: 'Crear', icon: 'add-circle-outline' },
            { key: 'resultados', label: 'Resultados', icon: 'trophy-outline' },
          ] as const
        ).map((item) => {
          const active = tab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[
                styles.tabBtn,
                active && { backgroundColor: primaryColor },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={item.icon}
                size={15}
                color={active ? '#ffffff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: active ? '#ffffff' : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && questions.length === 0 ? (
        <ActivityIndicator size="small" color={primaryColor} />
      ) : null}

      {/* PESTAÑA 1: RESPONDER */}
      {tab === 'responder' ? (
        <View style={styles.section}>
          {lastFeedback ? (
            <FeatureCard
              style={{
                borderColor: lastFeedback.isCorrect ? colors.success : colors.danger,
                borderWidth: 1.5,
              }}
            >
              <View style={styles.feedbackHeader}>
                <Ionicons
                  name={lastFeedback.isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={22}
                  color={lastFeedback.isCorrect ? colors.success : colors.danger}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: lastFeedback.isCorrect ? colors.success : colors.danger },
                  ]}
                >
                  {lastFeedback.isCorrect
                    ? '¡Correcto! Conoces muy bien a tu pareja 🎉'
                    : '¡Casi! Esa no era la respuesta correcta 🤭'}
                </Text>
              </View>
              <Text style={[styles.feedbackQuestion, { color: colors.text }]}>
                {lastFeedback.questionText}
              </Text>
              <Text style={[styles.feedbackDetail, { color: colors.textSecondary }]}>
                Respuesta correcta:{' '}
                <Text style={{ fontWeight: '800', color: colors.text }}>
                  {lastFeedback.options[lastFeedback.correctIndex] || ''}
                </Text>
              </Text>
              <TouchableOpacity
                onPress={() => setLastFeedback(null)}
                style={[styles.dismissBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.dismissText, { color: primaryColor }]}>Entendido</Text>
              </TouchableOpacity>
            </FeatureCard>
          ) : null}

          {pendingPartnerQuestions.length === 0 ? (
            <FeatureCard>
              <View style={styles.emptyWrap}>
                <Ionicons name="sparkles" size={28} color={primaryColor} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  ¡Estás al día con las preguntas de {partnerName}!
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Ve a la pestaña "Crear" para escribir nuevas preguntas sobre ti y retar a {partnerName}.
                </Text>
                <FeatureButton
                  label="Crear una pregunta sobre mí"
                  icon="add"
                  onPress={() => setTab('crear')}
                />
              </View>
            </FeatureCard>
          ) : (
            pendingPartnerQuestions.map((q, idx) => (
              <FeatureCard key={q.id}>
                <View style={styles.qBadgeRow}>
                  <View style={[styles.authorBadge, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="heart" size={12} color={primaryColor} />
                    <Text style={[styles.authorBadgeText, { color: primaryColor }]}>
                      Escrita por {partnerName}
                    </Text>
                  </View>
                  <Text style={[styles.qCounter, { color: colors.textMuted }]}>
                    #{idx + 1} de {pendingPartnerQuestions.length}
                  </Text>
                </View>

                <Text style={[styles.questionTitle, { color: colors.text }]}>{q.question}</Text>

                <View style={styles.optionsList}>
                  {q.options.map((opt, optIdx) => (
                    <TouchableOpacity
                      key={`${q.id}_opt_${optIdx}`}
                      disabled={submittingId === q.id}
                      onPress={() => handleSelectAnswer(q, optIdx)}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: colors.surfaceAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Opción ${optIdx + 1}: ${opt}`}
                    >
                      <View style={[styles.optionLetter, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.optionLetterText, { color: primaryColor }]}>
                          {String.fromCharCode(65 + optIdx)}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FeatureCard>
            ))
          )}
        </View>
      ) : null}

      {/* PESTAÑA 2: CREAR */}
      {tab === 'crear' ? (
        <View style={styles.section}>
          <FeatureCard>
            <View style={styles.templateHeader}>
              <Ionicons name="bulb" size={16} color={primaryColor} />
              <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
                Plantillas sugeridas (toca una para usarla)
              </Text>
            </View>
            <View style={styles.templatesWrap}>
              {QUIZ_SUGGESTED_TEMPLATES.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => applyTemplate(tpl)}
                  style={[
                    styles.templateChip,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.templateChipText, { color: colors.text }]} numberOfLines={2}>
                    {tpl.question}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FeatureCard>

          <FeatureCard>
            <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
              Nueva pregunta sobre ti ({myName})
            </Text>
            <TextInput
              value={questionDraft}
              onChangeText={setQuestionDraft}
              placeholder="Ej. ¿Cuál es mi lugar favorito para una cita?"
              placeholderTextColor={colors.textMuted}
              maxLength={300}
              multiline
              style={[
                styles.questionInput,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.helperLabel, { color: colors.textSecondary }]}>
              Opciones (2 a 4) · Toca el círculo para marcar la respuesta correcta:
            </Text>

            <View style={styles.optionsEditorList}>
              {optionsDraft.map((opt, idx) => {
                const isCorrect = correctIndexDraft === idx;
                return (
                  <View key={`draft_opt_${idx}`} style={styles.optionDraftRow}>
                    <TouchableOpacity
                      onPress={() => setCorrectIndexDraft(idx)}
                      style={[
                        styles.radioBtn,
                        {
                          borderColor: isCorrect ? colors.success : colors.border,
                          backgroundColor: isCorrect ? colors.success : colors.surfaceAlt,
                        },
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isCorrect }}
                      accessibilityLabel={`Marcar opción ${idx + 1} como correcta`}
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={isCorrect ? '#ffffff' : colors.textMuted}
                      />
                    </TouchableOpacity>
                    <TextInput
                      value={opt}
                      onChangeText={(v) => handleOptionChange(idx, v)}
                      placeholder={`Opción ${idx + 1}${isCorrect ? ' (Correcta)' : ''}`}
                      placeholderTextColor={colors.textMuted}
                      maxLength={120}
                      style={[
                        styles.optionInput,
                        {
                          backgroundColor: colors.surfaceAlt,
                          color: colors.text,
                          borderColor: isCorrect ? colors.success : colors.border,
                        },
                      ]}
                    />
                    {optionsDraft.length > 2 ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveOption(idx)}
                        style={styles.removeOptBtn}
                        accessibilityLabel={`Quitar opción ${idx + 1}`}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {optionsDraft.length < 4 ? (
              <TouchableOpacity
                onPress={handleAddOption}
                style={[styles.addOptionBtn, { borderColor: colors.border }]}
              >
                <Ionicons name="add" size={16} color={primaryColor} />
                <Text style={[styles.addOptionText, { color: primaryColor }]}>
                  Agregar otra opción ({optionsDraft.length}/4)
                </Text>
              </TouchableOpacity>
            ) : null}

            {formMsg ? (
              <Text
                style={[
                  styles.formMsgText,
                  { color: formMsg.type === 'error' ? colors.danger : colors.success },
                ]}
              >
                {formMsg.text}
              </Text>
            ) : null}

            <FeatureButton
              label={creating ? 'Guardando...' : 'Publicar pregunta para mi pareja'}
              icon="sparkles"
              onPress={handleCreateQuestion}
              disabled={creating}
            />
          </FeatureCard>

          {/* Lista de mis preguntas creadas */}
          <View style={styles.myListHeader}>
            <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
              Mis preguntas creadas ({myCreatedQuestions.length})
            </Text>
          </View>
          {myCreatedQuestions.length === 0 ? (
            <FeatureCard>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Aún no has creado preguntas. ¡Usa una plantilla arriba para empezar!
              </Text>
            </FeatureCard>
          ) : (
            myCreatedQuestions.map((q) => (
              <FeatureCard key={q.id}>
                <View style={styles.myQuestionRow}>
                  <View style={styles.flex}>
                    <Text style={[styles.myQuestionTitle, { color: colors.text }]}>
                      {q.question}
                    </Text>
                    <Text style={[styles.myQuestionCorrect, { color: colors.success }]}>
                      ✓ Correcta: {q.options[q.correct_index] ?? q.options[0]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteQuestion(q.id)}
                    style={[styles.deleteBtn, { backgroundColor: colors.surfaceAlt }]}
                    accessibilityLabel="Eliminar pregunta"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </FeatureCard>
            ))
          )}
        </View>
      ) : null}

      {/* PESTAÑA 3: RESULTADOS */}
      {tab === 'resultados' ? (
        <View style={styles.section}>
          <View style={styles.scoreRow}>
            <FeatureCard style={styles.scoreCard}>
              <Ionicons name="trophy" size={22} color={primaryColor} />
              <Text style={[styles.scorePerson, { color: colors.text }]}>
                {getDisplayName('Karla')}
              </Text>
              <Text style={[styles.scorePct, { color: primaryColor }]}>
                {stats.karla.pct}%
              </Text>
              <Text style={[styles.scoreMeta, { color: colors.textSecondary }]}>
                {stats.karla.correct} de {stats.karla.total} aciertos
              </Text>
            </FeatureCard>

            <FeatureCard style={styles.scoreCard}>
              <Ionicons name="trophy" size={22} color={primaryColor} />
              <Text style={[styles.scorePerson, { color: colors.text }]}>
                {getDisplayName('Javier')}
              </Text>
              <Text style={[styles.scorePct, { color: primaryColor }]}>
                {stats.javier.pct}%
              </Text>
              <Text style={[styles.scoreMeta, { color: colors.textSecondary }]}>
                {stats.javier.correct} de {stats.javier.total} aciertos
              </Text>
            </FeatureCard>
          </View>

          <Text style={[styles.cardSectionTitle, { color: colors.text }]}>
            Historial de intentos ({stats.validAttempts.length})
          </Text>

          {stats.validAttempts.length === 0 ? (
            <FeatureCard>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Todavía no hay intentos registrados. ¡Respondan preguntas para ver sus estadísticas!
              </Text>
            </FeatureCard>
          ) : (
            stats.validAttempts.map((a) => {
              const q = stats.questionMap.get(a.question_id);
              if (!q) return null;
              const chosenLabel = q.options[a.chosen_index] ?? 'Opción';
              const correctLabel = q.options[q.correct_index] ?? 'Opción';
              return (
                <FeatureCard key={a.id}>
                  <View style={styles.attemptRow}>
                    <Ionicons
                      name={a.is_correct ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={a.is_correct ? colors.success : colors.danger}
                    />
                    <View style={styles.flex}>
                      <Text style={[styles.attemptPerson, { color: primaryColor }]}>
                        {getDisplayName(a.profile)} respondió a {getDisplayName(q.author)}
                      </Text>
                      <Text style={[styles.attemptQuestion, { color: colors.text }]}>
                        {q.question}
                      </Text>
                      <Text style={[styles.attemptAnswer, { color: colors.textSecondary }]}>
                        Eligió: <Text style={{ fontWeight: '700', color: colors.text }}>{chosenLabel}</Text>
                        {!a.is_correct ? ` · Correcta: ${correctLabel}` : ''}
                      </Text>
                    </View>
                  </View>
                </FeatureCard>
              );
            })
          )}
        </View>
      ) : null}
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 14 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  feedbackQuestion: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackDetail: {
    fontSize: 13,
    marginBottom: 10,
  },
  dismissBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dismissText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  qBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  authorBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qCounter: {
    fontSize: 11,
    fontWeight: '700',
  },
  questionTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  templatesWrap: {
    gap: 8,
  },
  templateChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionInput: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  helperLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionsEditorList: {
    gap: 8,
    marginBottom: 10,
  },
  optionDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  removeOptBtn: {
    padding: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  addOptionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formMsgText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  myListHeader: {
    marginTop: 4,
  },
  myQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myQuestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  myQuestionCorrect: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  scorePerson: {
    fontSize: 14,
    fontWeight: '700',
  },
  scorePct: {
    fontSize: 26,
    fontWeight: '800',
  },
  scoreMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  attemptPerson: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  attemptQuestion: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  attemptAnswer: {
    fontSize: 12,
  },
});

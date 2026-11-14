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
import { getMoviesState } from '../../services/CoupleSyncService';
import { BucketItem, UserProfile } from '../../types';
import {
  addSavingsContribution,
  deleteSavingsContribution,
  deleteSavingsGoal,
  formatCurrencyMXN,
  getAllSavingsData,
  getCachedSavingsData,
  GOAL_EMOJI_PRESETS,
  saveSavingsGoal,
  SavingsGoal,
  SavingsGoalSummary,
  subscribeSavings,
} from '../../services/feature/savingsService';

export const SavingsModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();

  const [summaries, setSummaries] = useState<SavingsGoalSummary[]>([]);
  const [bucketItems, setBucketItems] = useState<BucketItem[]>([]);
  const [celebrationMessage, setCelebrationMessage] = useState<string | null>(null);

  // Estado del formulario de meta
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalEmoji, setGoalEmoji] = useState('🐷');
  const [goalDeadline, setGoalDeadline] = useState<string | null>(null);
  const [linkedBucketId, setLinkedBucketId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // Estado del panel de abono / retiro por meta
  const [activeContribGoalId, setActiveContribGoalId] = useState<string | null>(null);
  const [contribMode, setContribMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [contribProfile, setContribProfile] = useState<UserProfile>('Javier');
  const [contribAmount, setContribAmount] = useState('');
  const [contribNote, setContribNote] = useState('');
  const [savingContrib, setSavingContrib] = useState(false);
  const [expandedHistoryGoalId, setExpandedHistoryGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setContribProfile(profile);
    }
  }, [profile]);

  const loadData = useCallback(async () => {
    const cached = await getCachedSavingsData();
    if (cached.summaries.length > 0) {
      setSummaries(cached.summaries);
    }
    const [fresh, moviesState] = await Promise.all([
      getAllSavingsData(),
      getMoviesState(),
    ]);
    setSummaries(fresh.summaries);
    setBucketItems(Array.isArray(moviesState.bucketList) ? moviesState.bucketList : []);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setCelebrationMessage(null);
    void loadData();
    const unsub = subscribeSavings(() => {
      void loadData();
    });
    return () => {
      unsub();
    };
  }, [visible, loadData]);

  const bucketMap = useMemo(() => {
    const map = new Map<string, BucketItem>();
    bucketItems.forEach((b) => map.set(b.id, b));
    return map;
  }, [bucketItems]);

  const globalTotals = useMemo(() => {
    let totalSaved = 0;
    let totalTarget = 0;
    let completedCount = 0;
    for (const s of summaries) {
      totalSaved += s.totalSaved;
      totalTarget += s.goal.target_amount;
      if (s.isCompleted) completedCount += 1;
    }
    return { totalSaved, totalTarget, completedCount };
  }, [summaries]);

  const resetGoalForm = useCallback(() => {
    setEditingGoalId(null);
    setGoalTitle('');
    setGoalTarget('');
    setGoalEmoji('🐷');
    setGoalDeadline(null);
    setLinkedBucketId(null);
    setGoalError(null);
  }, []);

  const handleStartCreateGoal = () => {
    resetGoalForm();
    setIsGoalFormOpen(true);
  };

  const handleStartEditGoal = (goal: SavingsGoal) => {
    setEditingGoalId(goal.id);
    setGoalTitle(goal.title);
    setGoalTarget(String(goal.target_amount));
    setGoalEmoji(goal.emoji || '🐷');
    setGoalDeadline(goal.deadline);
    setLinkedBucketId(goal.linked_bucket_item_id);
    setGoalError(null);
    setIsGoalFormOpen(true);
  };

  const handleSaveGoal = async () => {
    const cleanTitle = goalTitle.trim();
    if (!cleanTitle) {
      setGoalError('Escribe un nombre para la meta de ahorro.');
      return;
    }
    const numericTarget = Number(goalTarget.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
    if (isNaN(numericTarget) || numericTarget <= 0) {
      setGoalError('Ingresa un monto objetivo válido mayor a 0.');
      return;
    }

    setSavingGoal(true);
    setGoalError(null);
    try {
      await saveSavingsGoal({
        id: editingGoalId || undefined,
        title: cleanTitle,
        target_amount: numericTarget,
        currency: 'MXN',
        emoji: goalEmoji || '🐷',
        deadline: goalDeadline,
        linked_bucket_item_id: linkedBucketId,
        created_by: profile || 'Javier',
      });
      await loadData();
      setIsGoalFormOpen(false);
      resetGoalForm();
    } catch (err: any) {
      setGoalError(err?.message || 'No se pudo guardar la meta.');
    } finally {
      setSavingGoal(false);
    }
  };

  const handleConfirmDeleteGoal = (goal: SavingsGoal) => {
    Alert.alert(
      'Eliminar meta de ahorro',
      `¿Quieres eliminar "${goal.title}" y todo su historial de movimientos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteSavingsGoal(goal.id);
            if (editingGoalId === goal.id) {
              setIsGoalFormOpen(false);
              resetGoalForm();
            }
            await loadData();
          },
        },
      ]
    );
  };

  const handleOpenContributionBox = (goalId: string, mode: 'deposit' | 'withdraw') => {
    setActiveContribGoalId(goalId);
    setContribMode(mode);
    setContribProfile(profile || 'Javier');
    setContribAmount('');
    setContribNote('');
  };

  const handleSubmitContribution = async (summary: SavingsGoalSummary) => {
    const rawNum = Number(contribAmount.replace(/,/g, '.').replace(/[^0-9.]/g, ''));
    if (isNaN(rawNum) || rawNum <= 0) {
      Alert.alert('Monto inválido', 'Ingresa una cantidad mayor a $0 MXN.');
      return;
    }

    const signedAmount = contribMode === 'withdraw' ? -Math.abs(rawNum) : Math.abs(rawNum);
    setSavingContrib(true);
    try {
      const result = await addSavingsContribution({
        goal_id: summary.goal.id,
        profile: contribProfile,
        amount: signedAmount,
        note: contribNote.trim() || null,
      });
      setActiveContribGoalId(null);
      setContribAmount('');
      setContribNote('');
      await loadData();

      if (result.justCompleted) {
        setCelebrationMessage(
          `🎉 ¡Felicidades! Completaron el 100% de la meta "${summary.goal.title}" (${formatCurrencyMXN(
            summary.goal.target_amount,
            summary.goal.currency
          )}).`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo registrar el movimiento.');
    } finally {
      setSavingContrib(false);
    }
  };

  const handleDeleteContribution = (contribId: string, goalId: string) => {
    Alert.alert('Eliminar movimiento', '¿Quieres borrar este registro de la alcancía?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteSavingsContribution(contribId, goalId);
          await loadData();
        },
      },
    ]);
  };

  const renderGoalCard = (summary: SavingsGoalSummary) => {
    const { goal } = summary;
    const linkedBucket = goal.linked_bucket_item_id
      ? bucketMap.get(goal.linked_bucket_item_id)
      : undefined;
    const isContribOpen = activeContribGoalId === goal.id;
    const isHistoryOpen = expandedHistoryGoalId === goal.id;

    return (
      <FeatureCard
        key={goal.id}
        style={[
          styles.goalCard,
          summary.isCompleted && {
            borderColor: colors.success,
            borderWidth: 1.5,
          },
        ]}
      >
        {/* Banner de meta alcanzada */}
        {summary.isCompleted ? (
          <View style={[styles.completedBanner, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="trophy" size={16} color={colors.success} />
            <Text style={[styles.completedBannerText, { color: colors.success }]}>
              ¡Meta completada! 🎉{' '}
              {goal.completed_at
                ? `Lograda el ${formatDisplayDate(goal.completed_at, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : '¡Lo lograron juntos!'}
            </Text>
          </View>
        ) : null}

        {/* Cabecera de la meta */}
        <View style={styles.goalHeaderRow}>
          <View style={[styles.emojiBadge, { backgroundColor: `${primaryColor}15` }]}>
            <Text style={styles.emojiText}>{goal.emoji || '🐷'}</Text>
          </View>
          <View style={styles.goalTitleWrap}>
            <Text style={[styles.goalTitle, { color: colors.text }]}>{goal.title}</Text>
            {linkedBucket ? (
              <View style={styles.bucketLinkBadge}>
                <Ionicons name="sparkles" size={12} color={primaryColor} />
                <Text
                  style={[styles.bucketLinkText, { color: primaryColor }]}
                  numberOfLines={1}
                >
                  Plan vinculado: {linkedBucket.title}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.percentPill, { backgroundColor: `${primaryColor}18` }]}>
            <Text style={[styles.percentPillText, { color: primaryColor }]}>
              {summary.progressPercent}%
            </Text>
          </View>
        </View>

        {/* Monto ahorrado vs objetivo */}
        <View style={styles.amountsRow}>
          <View>
            <Text style={[styles.amountSavedLabel, { color: colors.textMuted }]}>
              AHORRADO JUNTOS
            </Text>
            <Text style={[styles.amountSavedValue, { color: colors.text }]}>
              {formatCurrencyMXN(summary.totalSaved, goal.currency)}
              <Text style={[styles.amountTargetInline, { color: colors.textMuted }]}>
                {' '}
                / {formatCurrencyMXN(goal.target_amount, goal.currency)}
              </Text>
            </Text>
          </View>
          {summary.remainingAmount > 0 ? (
            <View style={styles.remainingWrap}>
              <Text style={[styles.amountSavedLabel, { color: colors.textMuted }]}>FALTAN</Text>
              <Text style={[styles.remainingValue, { color: colors.textSecondary }]}>
                {formatCurrencyMXN(summary.remainingAmount, goal.currency)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Barra de progreso */}
        <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(0, summary.progressPercent))}%`,
                backgroundColor: summary.isCompleted ? colors.success : primaryColor,
              },
            ]}
          />
        </View>

        {/* Desglose por persona */}
        <View style={styles.perPersonRow}>
          <View style={[styles.personBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.personName, { color: colors.textSecondary }]}>
              {getDisplayName('Javier')}
            </Text>
            <Text style={[styles.personTotal, { color: colors.text }]}>
              {formatCurrencyMXN(summary.totalJavier, goal.currency)}
            </Text>
          </View>
          <View style={[styles.personBox, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.personName, { color: colors.textSecondary }]}>
              {getDisplayName('Karla')}
            </Text>
            <Text style={[styles.personTotal, { color: colors.text }]}>
              {formatCurrencyMXN(summary.totalKarla, goal.currency)}
            </Text>
          </View>
        </View>

        {/* Fecha límite y ahorro mensual sugerido */}
        {goal.deadline ? (
          <View style={[styles.deadlineBox, { backgroundColor: `${primaryColor}10` }]}>
            <View style={styles.deadlineLine}>
              <Ionicons name="calendar-clock" size={15} color={primaryColor} />
              <Text style={[styles.deadlineText, { color: colors.text }]}>
                Fecha meta:{' '}
                <Text style={{ fontWeight: '700' }}>
                  {formatDisplayDate(goal.deadline, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {summary.daysUntilDeadline !== null
                  ? summary.daysUntilDeadline > 0
                    ? ` (${summary.daysUntilDeadline} días)`
                    : summary.daysUntilDeadline === 0
                    ? ' (¡Hoy!)'
                    : ' (Plazo vencido)'
                  : ''}
              </Text>
            </View>
            {summary.suggestedMonthlyTotal !== null && summary.remainingAmount > 0 ? (
              <Text style={[styles.suggestedMonthlyText, { color: primaryColor }]}>
                💡 Sugerido mensual: {formatCurrencyMXN(summary.suggestedMonthlyTotal, goal.currency)}/mes
                ({formatCurrencyMXN(summary.suggestedMonthlyPerPerson || 0, goal.currency)} c/u)
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Botones de Abonar / Retirar */}
        {isContribOpen ? (
          <View
            style={[
              styles.contribFormBox,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
          >
            <View style={styles.contribModeTabs}>
              <TouchableOpacity
                onPress={() => setContribMode('deposit')}
                style={[
                  styles.contribModeTab,
                  contribMode === 'deposit' && { backgroundColor: primaryColor },
                ]}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={contribMode === 'deposit' ? '#ffffff' : colors.text}
                />
                <Text
                  style={[
                    styles.contribModeTabText,
                    { color: contribMode === 'deposit' ? '#ffffff' : colors.text },
                  ]}
                >
                  Abonar (+)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setContribMode('withdraw')}
                style={[
                  styles.contribModeTab,
                  contribMode === 'withdraw' && { backgroundColor: colors.danger },
                ]}
              >
                <Ionicons
                  name="remove"
                  size={15}
                  color={contribMode === 'withdraw' ? '#ffffff' : colors.text}
                />
                <Text
                  style={[
                    styles.contribModeTabText,
                    { color: contribMode === 'withdraw' ? '#ffffff' : colors.text },
                  ]}
                >
                  Retirar (-)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contribProfileRow}>
              {(['Javier', 'Karla'] as UserProfile[]).map((p) => {
                const selected = contribProfile === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setContribProfile(p)}
                    style={[
                      styles.contribProfileChip,
                      {
                        backgroundColor: selected ? primaryColor : colors.surface,
                        borderColor: selected ? primaryColor : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.contribProfileChipText,
                        { color: selected ? '#ffffff' : colors.text },
                      ]}
                    >
                      {getDisplayName(p)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.contribInputsRow}>
              <TextInput
                value={contribAmount}
                onChangeText={setContribAmount}
                placeholder="Monto ($ MXN)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  styles.contribAmountInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />
              <TextInput
                value={contribNote}
                onChangeText={setContribNote}
                placeholder="Nota opcional (ej. Quincena)"
                placeholderTextColor={colors.textMuted}
                maxLength={255}
                style={[
                  styles.input,
                  styles.contribNoteInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
              />
            </View>

            <View style={styles.contribBtnsRow}>
              <FeatureButton
                label="Cancelar"
                variant="ghost"
                onPress={() => setActiveContribGoalId(null)}
                style={styles.flexBtn}
              />
              <FeatureButton
                label={
                  savingContrib
                    ? 'Guardando...'
                    : contribMode === 'deposit'
                    ? 'Guardar abono'
                    : 'Registrar retiro'
                }
                variant={contribMode === 'withdraw' ? 'danger' : 'primary'}
                disabled={savingContrib}
                onPress={() => handleSubmitContribution(summary)}
                style={styles.flexBtn}
              />
            </View>
          </View>
        ) : (
          <View style={styles.quickContribRow}>
            <TouchableOpacity
              onPress={() => handleOpenContributionBox(goal.id, 'deposit')}
              style={[styles.primaryContribBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="add" size={16} color="#ffffff" />
              <Text style={styles.primaryContribBtnText}>Abonar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleOpenContributionBox(goal.id, 'withdraw')}
              style={[
                styles.secondaryContribBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Ionicons name="wallet" size={15} color={colors.textSecondary} />
              <Text style={[styles.secondaryContribBtnText, { color: colors.text }]}>
                Retiro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                setExpandedHistoryGoalId(isHistoryOpen ? null : goal.id)
              }
              style={[
                styles.secondaryContribBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.secondaryContribBtnText, { color: colors.text }]}>
                Historial ({summary.contributions.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Historial de aportaciones y retiros */}
        {isHistoryOpen ? (
          <View style={[styles.historySection, { borderTopColor: colors.border }]}>
            <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>
              Movimientos recientes
            </Text>
            {summary.contributions.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: colors.textMuted }]}>
                Aún no hay abonos ni retiros en esta meta.
              </Text>
            ) : (
              summary.contributions.map((c) => {
                const isPositive = c.amount > 0;
                return (
                  <View
                    key={c.id}
                    style={[styles.historyRow, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <View style={styles.historyRowMain}>
                      <View style={styles.historyTopLine}>
                        <Text style={[styles.historyPerson, { color: colors.text }]}>
                          {getDisplayName(c.profile)}
                        </Text>
                        <Text
                          style={[
                            styles.historyAmount,
                            { color: isPositive ? colors.success : colors.danger },
                          ]}
                        >
                          {isPositive ? '+' : ''}
                          {formatCurrencyMXN(c.amount, goal.currency)}
                        </Text>
                      </View>
                      {c.note ? (
                        <Text style={[styles.historyNote, { color: colors.textSecondary }]}>
                          “{c.note}”
                        </Text>
                      ) : null}
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {formatDisplayDate(c.created_at, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteContribution(c.id, goal.id)}
                      style={styles.historyDeleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Eliminar movimiento"
                    >
                      <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {/* Acciones de editar / eliminar meta */}
        <View style={[styles.goalFooterActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleStartEditGoal(goal)}
            style={[styles.footerBtn, { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name="create-outline" size={14} color={colors.text} />
            <Text style={[styles.footerBtnText, { color: colors.text }]}>Editar meta</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleConfirmDeleteGoal(goal)}
            style={[styles.footerBtn, { backgroundColor: `${colors.danger}15` }]}
          >
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <Text style={[styles.footerBtnText, { color: colors.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </FeatureCard>
    );
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Alcancía de sueños"
      subtitle="Nuestras metas de ahorro para viajes, citas y planes"
      icon="piggy-bank"
      headerRight={
        <TouchableOpacity
          onPress={() => {
            if (isGoalFormOpen) {
              setIsGoalFormOpen(false);
              resetGoalForm();
            } else {
              handleStartCreateGoal();
            }
          }}
          style={[styles.headerAddBtn, { backgroundColor: primaryColor }]}
          accessibilityRole="button"
          accessibilityLabel={isGoalFormOpen ? 'Cerrar formulario' : 'Nueva meta de ahorro'}
        >
          <Ionicons name={isGoalFormOpen ? 'close' : 'add'} size={20} color="#ffffff" />
        </TouchableOpacity>
      }
    >
      {/* Mensaje de celebración cuando una meta llega al 100% */}
      {celebrationMessage ? (
        <FeatureCard
          style={[
            styles.celebrationHero,
            { backgroundColor: colors.success, borderColor: colors.success },
          ]}
        >
          <View style={styles.celebrationHeroTop}>
            <Ionicons name="trophy" size={22} color="#ffffff" />
            <Text style={styles.celebrationHeroTitle}>¡Meta lograda juntos!</Text>
          </View>
          <Text style={styles.celebrationHeroText}>{celebrationMessage}</Text>
        </FeatureCard>
      ) : null}

      {/* Resumen general de la alcancía */}
      <FeatureCard style={styles.summaryHeroCard}>
        <View style={styles.summaryHeroRow}>
          <View style={[styles.summaryIconWrap, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="piggy-bank" size={24} color={primaryColor} />
          </View>
          <View style={styles.summaryMainText}>
            <Text style={[styles.summaryCaption, { color: colors.textMuted }]}>
              TOTAL AHORRADO EN PAREJA
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.text }]}>
              {formatCurrencyMXN(globalTotals.totalSaved, 'MXN')}
            </Text>
            <Text style={[styles.summarySubtext, { color: colors.textSecondary }]}>
              {summaries.length}{' '}
              {summaries.length === 1 ? 'meta activa' : 'metas registradas'} ·{' '}
              {globalTotals.completedCount}{' '}
              {globalTotals.completedCount === 1 ? 'completada' : 'completadas'}
            </Text>
          </View>
        </View>
      </FeatureCard>

      {/* Formulario de crear / editar meta */}
      {isGoalFormOpen ? (
        <FeatureCard style={styles.formCard}>
          <View style={styles.formHeader}>
            <Ionicons name="wallet" size={18} color={primaryColor} />
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingGoalId ? 'Editar meta de ahorro' : 'Nueva meta de ahorro'}
            </Text>
          </View>

          {goalError ? (
            <View style={[styles.errorBanner, { backgroundColor: `${colors.danger}18` }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{goalError}</Text>
            </View>
          ) : null}

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Ícono / Emoji
          </Text>
          <View style={styles.emojiSelectorRow}>
            {GOAL_EMOJI_PRESETS.map((em) => {
              const selected = goalEmoji === em;
              return (
                <TouchableOpacity
                  key={em}
                  onPress={() => setGoalEmoji(em)}
                  style={[
                    styles.emojiOption,
                    {
                      backgroundColor: selected ? `${primaryColor}25` : colors.surfaceAlt,
                      borderColor: selected ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Text style={styles.emojiOptionText}>{em}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Nombre de la meta *
          </Text>
          <TextInput
            value={goalTitle}
            onChangeText={setGoalTitle}
            placeholder="Ej. Viaje a la playa, Concierto, Cena aniversario..."
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
            Monto objetivo (MXN) *
          </Text>
          <TextInput
            value={goalTarget}
            onChangeText={setGoalTarget}
            placeholder="Ej. 5000"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
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
            Fecha límite (opcional · calcula ahorro mensual sugerido)
          </Text>
          <View style={styles.deadlinePickerRow}>
            <TouchableOpacity
              onPress={() => setDatePickerOpen(true)}
              style={[
                styles.dateSelectorBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <Ionicons name="calendar-outline" size={16} color={primaryColor} />
              <Text style={[styles.dateSelectorText, { color: colors.text }]}>
                {goalDeadline
                  ? formatDisplayDate(goalDeadline, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Sin fecha límite'}
              </Text>
            </TouchableOpacity>
            {goalDeadline ? (
              <TouchableOpacity
                onPress={() => setGoalDeadline(null)}
                style={[styles.clearDateBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {bucketItems.length > 0 ? (
            <>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Vincular a un plan de su lista de sueños (opcional)
              </Text>
              <View style={styles.bucketChoicesWrap}>
                <TouchableOpacity
                  onPress={() => setLinkedBucketId(null)}
                  style={[
                    styles.bucketChoiceChip,
                    {
                      backgroundColor: !linkedBucketId ? primaryColor : colors.surfaceAlt,
                      borderColor: !linkedBucketId ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.bucketChoiceText,
                      { color: !linkedBucketId ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    Ninguno
                  </Text>
                </TouchableOpacity>
                {bucketItems.map((b) => {
                  const selected = linkedBucketId === b.id;
                  return (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => {
                        setLinkedBucketId(selected ? null : b.id);
                        if (!goalTitle.trim() && !selected) {
                          setGoalTitle(b.title);
                        }
                      }}
                      style={[
                        styles.bucketChoiceChip,
                        {
                          backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                          borderColor: selected ? primaryColor : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="sparkles"
                        size={12}
                        color={selected ? '#ffffff' : primaryColor}
                      />
                      <Text
                        style={[
                          styles.bucketChoiceText,
                          { color: selected ? '#ffffff' : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {b.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={styles.formBtnsRow}>
            <FeatureButton
              label="Cancelar"
              variant="ghost"
              onPress={() => {
                setIsGoalFormOpen(false);
                resetGoalForm();
              }}
              style={styles.flexBtn}
            />
            <FeatureButton
              label={savingGoal ? 'Guardando...' : editingGoalId ? 'Actualizar' : 'Crear meta'}
              icon="checkmark-circle"
              disabled={savingGoal}
              onPress={handleSaveGoal}
              style={styles.flexBtn}
            />
          </View>
        </FeatureCard>
      ) : (
        <FeatureButton
          label="Nueva meta de ahorro"
          icon="add"
          onPress={handleStartCreateGoal}
        />
      )}

      {/* Listado de metas */}
      {summaries.length === 0 ? (
        <FeatureCard style={styles.emptyCard}>
          <Ionicons name="piggy-bank" size={30} color={primaryColor} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Aún no tienen metas en su alcancía
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Creen una meta para su próximo viaje, concierto o sueño de su lista de planes y
            registren los aportes de Javier y Karla.
          </Text>
        </FeatureCard>
      ) : (
        summaries.map(renderGoalCard)
      )}

      <DatePickerModal
        visible={datePickerOpen}
        value={goalDeadline || toLocalDateString(new Date())}
        title="Fecha límite de la meta"
        minDate={toLocalDateString(new Date())}
        onSelect={(d) => setGoalDeadline(d)}
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
  celebrationHero: {
    gap: 6,
  },
  celebrationHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  celebrationHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  celebrationHeroText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 19,
  },
  summaryHeroCard: {
    padding: 16,
  },
  summaryHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMainText: {
    flex: 1,
    gap: 2,
  },
  summaryCaption: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  summaryTotalValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  summarySubtext: {
    fontSize: 12,
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
  emojiSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionText: {
    fontSize: 18,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  deadlinePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSelectorBtn: {
    flex: 1,
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
  clearDateBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketChoicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bucketChoiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  bucketChoiceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  flexBtn: {
    flex: 1,
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
  goalCard: {
    gap: 12,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  completedBannerText: {
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 22,
  },
  goalTitleWrap: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bucketLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bucketLinkText: {
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  percentPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  percentPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  amountsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amountSavedLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  amountSavedValue: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  amountTargetInline: {
    fontSize: 13,
    fontWeight: '600',
  },
  remainingWrap: {
    alignItems: 'flex-end',
  },
  remainingValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  perPersonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  personBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personName: {
    fontSize: 12,
    fontWeight: '600',
  },
  personTotal: {
    fontSize: 13,
    fontWeight: '800',
  },
  deadlineBox: {
    padding: 10,
    borderRadius: 12,
    gap: 4,
  },
  deadlineLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 12.5,
    flex: 1,
  },
  suggestedMonthlyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickContribRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryContribBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryContribBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryContribBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryContribBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  contribFormBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  contribModeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  contribModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  contribModeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  contribProfileRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contribProfileChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  contribProfileChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  contribInputsRow: {
    gap: 8,
  },
  contribAmountInput: {
    fontWeight: '700',
  },
  contribNoteInput: {
    fontSize: 13,
  },
  contribBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historySection: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  historyEmpty: {
    fontSize: 12.5,
    fontStyle: 'italic',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  historyRowMain: {
    flex: 1,
    gap: 2,
  },
  historyTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyPerson: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  historyNote: {
    fontSize: 12,
  },
  historyDate: {
    fontSize: 11,
  },
  historyDeleteBtn: {
    padding: 6,
  },
  goalFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  footerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

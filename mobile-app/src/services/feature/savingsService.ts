import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { sendPartnerPushNotification } from '../NotificationService';
import { UserProfile } from '../../types';

export type SavingsGoal = {
  id: string;
  title: string;
  target_amount: number;
  currency: string; // 'MXN' por defecto
  deadline: string | null; // 'YYYY-MM-DD' opcional
  linked_bucket_item_id: string | null;
  emoji: string | null;
  created_by: UserProfile;
  completed_at: string | null;
  created_at: string;
};

export type SavingsContribution = {
  id: string;
  goal_id: string;
  profile: UserProfile;
  amount: number; // positivo = aporte, negativo = retiro
  note: string | null;
  created_at: string;
};

export interface UpsertSavingsGoalInput {
  id?: string;
  title: string;
  target_amount: number;
  currency?: string;
  deadline?: string | null;
  linked_bucket_item_id?: string | null;
  emoji?: string | null;
  created_by: UserProfile;
  completed_at?: string | null;
}

export interface AddContributionInput {
  goal_id: string;
  profile: UserProfile;
  amount: number; // positivo para abono, negativo para retiro
  note?: string | null;
}

export interface SavingsGoalSummary {
  goal: SavingsGoal;
  contributions: SavingsContribution[];
  totalSaved: number;
  totalJavier: number;
  totalKarla: number;
  remainingAmount: number;
  progressRatio: number; // 0..1
  progressPercent: number; // 0..100
  isCompleted: boolean;
  daysUntilDeadline: number | null;
  suggestedMonthlyTotal: number | null;
  suggestedMonthlyPerPerson: number | null;
}

const GOALS_TABLE = 'savings_goals';
const CONTRIBS_TABLE = 'savings_contributions';

export const GOAL_EMOJI_PRESETS = ['🐷', '✈️', '🏖️', '🏠', '💍', '🚗', '🎟️', '🍽️', '🎁', '✨'];

export function formatCurrencyMXN(amount: number, currency = 'MXN'): string {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
      maximumFractionDigits: num % 1 === 0 ? 0 : 2,
    }).format(num);
  } catch {
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num).toFixed(num % 1 === 0 ? 0 : 2);
    return `${sign}$${abs} ${currency || 'MXN'}`;
  }
}

function normalizeGoalRow(raw: any): SavingsGoal {
  return {
    id: String(raw.id),
    title: String(raw.title || ''),
    target_amount: Number(raw.target_amount) || 0,
    currency: String(raw.currency || 'MXN'),
    deadline: raw.deadline ? toLocalDateString(String(raw.deadline)) : null,
    linked_bucket_item_id: raw.linked_bucket_item_id ? String(raw.linked_bucket_item_id) : null,
    emoji: raw.emoji ? String(raw.emoji) : '🐷',
    created_by: raw.created_by === 'Karla' ? 'Karla' : 'Javier',
    completed_at: raw.completed_at ? String(raw.completed_at) : null,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

function normalizeContributionRow(raw: any): SavingsContribution {
  return {
    id: String(raw.id),
    goal_id: String(raw.goal_id),
    profile: raw.profile === 'Karla' ? 'Karla' : 'Javier',
    amount: Number(raw.amount) || 0,
    note: raw.note ? String(raw.note) : null,
    created_at: String(raw.created_at || new Date().toISOString()),
  };
}

export function buildGoalSummary(
  rawGoal: SavingsGoal,
  allContributions: SavingsContribution[],
  now: Date = new Date()
): SavingsGoalSummary {
  const goal = normalizeGoalRow(rawGoal);
  const contributions = allContributions
    .filter((c) => c && c.goal_id === goal.id)
    .map(normalizeContributionRow)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  let totalJavier = 0;
  let totalKarla = 0;
  for (const c of contributions) {
    if (c.profile === 'Javier') totalJavier += c.amount;
    else totalKarla += c.amount;
  }

  const totalSaved = Math.max(0, Number((totalJavier + totalKarla).toFixed(2)));
  const target = Math.max(1, goal.target_amount);
  const remainingAmount = Math.max(0, Number((target - totalSaved).toFixed(2)));
  const progressRatio = Math.min(1, Math.max(0, totalSaved / target));
  const progressPercent = Math.min(100, Math.round((totalSaved / target) * 100));
  const isCompleted = Boolean(goal.completed_at) || totalSaved >= target;

  let daysUntilDeadline: number | null = null;
  let suggestedMonthlyTotal: number | null = null;
  let suggestedMonthlyPerPerson: number | null = null;

  if (goal.deadline) {
    const cleanDeadline = toLocalDateString(goal.deadline);
    const [y, m, d] = cleanDeadline.split('-').map(Number);
    const deadlineMidnight = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    daysUntilDeadline = Math.round(
      (deadlineMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (remainingAmount > 0) {
      const monthsRemaining =
        daysUntilDeadline <= 30 ? 1 : Math.max(1, daysUntilDeadline / 30.4375);
      suggestedMonthlyTotal = Math.ceil(remainingAmount / monthsRemaining);
      suggestedMonthlyPerPerson = Math.ceil(suggestedMonthlyTotal / 2);
    }
  }

  return {
    goal,
    contributions,
    totalSaved,
    totalJavier: Number(totalJavier.toFixed(2)),
    totalKarla: Number(totalKarla.toFixed(2)),
    remainingAmount,
    progressRatio,
    progressPercent,
    isCompleted,
    daysUntilDeadline,
    suggestedMonthlyTotal,
    suggestedMonthlyPerPerson,
  };
}

export async function getAllSavingsData(): Promise<{
  goals: SavingsGoal[];
  contributions: SavingsContribution[];
  summaries: SavingsGoalSummary[];
}> {
  const [rawGoals, rawContribs] = await Promise.all([
    fetchAll<SavingsGoal>(GOALS_TABLE, { orderBy: 'created_at', ascending: false }),
    fetchAll<SavingsContribution>(CONTRIBS_TABLE, { orderBy: 'created_at', ascending: false }),
  ]);

  const goals = rawGoals.map(normalizeGoalRow);
  const contributions = rawContribs.map(normalizeContributionRow);
  const summaries = goals.map((g) => buildGoalSummary(g, contributions));

  return { goals, contributions, summaries };
}

export async function getCachedSavingsData(): Promise<{
  goals: SavingsGoal[];
  contributions: SavingsContribution[];
  summaries: SavingsGoalSummary[];
}> {
  const [rawGoals, rawContribs] = await Promise.all([
    readCache<SavingsGoal>(GOALS_TABLE),
    readCache<SavingsContribution>(CONTRIBS_TABLE),
  ]);
  const goals = rawGoals.map(normalizeGoalRow);
  const contributions = rawContribs.map(normalizeContributionRow);
  const summaries = goals.map((g) => buildGoalSummary(g, contributions));
  return { goals, contributions, summaries };
}

export async function saveSavingsGoal(input: UpsertSavingsGoalInput): Promise<SavingsGoal> {
  const nowIso = new Date().toISOString();
  const existing = input.id
    ? (await readCache<SavingsGoal>(GOALS_TABLE)).find((g) => g.id === input.id)
    : undefined;

  const cleanTitle = sanitizeInput(input.title, 160);
  if (!cleanTitle) {
    throw new Error('El nombre de la meta es obligatorio.');
  }

  const targetAmount = Number(input.target_amount);
  if (isNaN(targetAmount) || targetAmount <= 0) {
    throw new Error('El monto objetivo debe ser mayor a 0.');
  }

  const cleanEmoji = input.emoji ? sanitizeInput(input.emoji, 16) || '🐷' : '🐷';
  const cleanDeadline = input.deadline ? toLocalDateString(input.deadline) : null;
  const cleanBucketId = input.linked_bucket_item_id
    ? sanitizeInput(input.linked_bucket_item_id, 64) || null
    : null;

  // Verificar si con el nuevo monto objetivo ya se completó o sigue pendiente
  const contribs = await readCache<SavingsContribution>(CONTRIBS_TABLE);
  const goalId = input.id || generateId();
  const currentTotal = contribs
    .filter((c) => c.goal_id === goalId)
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  let completedAt: string | null =
    input.completed_at !== undefined ? input.completed_at : existing?.completed_at || null;
  if (currentTotal >= targetAmount && !completedAt) {
    completedAt = nowIso;
  } else if (currentTotal < targetAmount && existing && targetAmount > existing.target_amount) {
    completedAt = null;
  }

  const row: SavingsGoal = {
    id: goalId,
    title: cleanTitle,
    target_amount: Number(targetAmount.toFixed(2)),
    currency: input.currency ? sanitizeInput(input.currency, 3).toUpperCase() || 'MXN' : 'MXN',
    deadline: cleanDeadline,
    linked_bucket_item_id: cleanBucketId,
    emoji: cleanEmoji,
    created_by: existing?.created_by || input.created_by,
    completed_at: completedAt,
    created_at: existing?.created_at || nowIso,
  };

  const savedGoal = await upsertRow<SavingsGoal>(GOALS_TABLE, row);

  if (!input.id) {
    try {
      const partner: UserProfile = input.created_by === 'Javier' ? 'Karla' : 'Javier';
      const senderName = input.created_by === 'Karla' ? 'Karlita' : 'Javier';
      void sendPartnerPushNotification(
        partner,
        `${cleanEmoji} Nueva meta en Alcancía`,
        `${senderName} creó la meta "${cleanTitle}" (${formatCurrencyMXN(targetAmount, row.currency)}).`,
        { type: 'SAVINGS_GOAL_ADDED', goalId: savedGoal.id, sender: input.created_by }
      );
    } catch {}
  }

  return savedGoal;
}

export async function deleteSavingsGoal(goalId: string): Promise<void> {
  const contribs = await readCache<SavingsContribution>(CONTRIBS_TABLE);
  const related = contribs.filter((c) => c.goal_id === goalId);
  for (const c of related) {
    await deleteRow(CONTRIBS_TABLE, c.id);
  }
  await deleteRow(GOALS_TABLE, goalId);
}

/**
 * Registra un aporte (amount > 0) o retiro (amount < 0) y marca la meta como completada
 * automáticamente si se alcanza `target_amount`.
 */
export async function addSavingsContribution(input: AddContributionInput): Promise<{
  contribution: SavingsContribution;
  justCompleted: boolean;
  updatedGoal: SavingsGoal | null;
}> {
  const amount = Number(input.amount);
  if (isNaN(amount) || amount === 0) {
    throw new Error('Ingresa un monto válido distinto de 0.');
  }

  const nowIso = new Date().toISOString();
  const row: SavingsContribution = {
    id: generateId(),
    goal_id: input.goal_id,
    profile: input.profile,
    amount: Number(amount.toFixed(2)),
    note: input.note ? sanitizeInput(input.note, 255) || null : null,
    created_at: nowIso,
  };

  const savedContrib = await upsertRow<SavingsContribution>(CONTRIBS_TABLE, row);

  // Recalcular total de la meta para marcar completed_at automáticamente al llegar al 100%
  const [goals, allContribs] = await Promise.all([
    readCache<SavingsGoal>(GOALS_TABLE),
    readCache<SavingsContribution>(CONTRIBS_TABLE),
  ]);

  const goal = goals.find((g) => g.id === input.goal_id);
  let justCompleted = false;
  let updatedGoal: SavingsGoal | null = goal ? normalizeGoalRow(goal) : null;

  if (updatedGoal) {
    const summary = buildGoalSummary(updatedGoal, allContribs);
    if (summary.totalSaved >= updatedGoal.target_amount && !updatedGoal.completed_at) {
      justCompleted = true;
      updatedGoal = await upsertRow<SavingsGoal>(GOALS_TABLE, {
        ...updatedGoal,
        completed_at: nowIso,
      });
    } else if (summary.totalSaved < updatedGoal.target_amount && updatedGoal.completed_at) {
      updatedGoal = await upsertRow<SavingsGoal>(GOALS_TABLE, {
        ...updatedGoal,
        completed_at: null,
      });
    }
  }

  try {
    const partner: UserProfile = input.profile === 'Javier' ? 'Karla' : 'Javier';
    const senderName = input.profile === 'Karla' ? 'Karlita' : 'Javier';
    const goalTitle = updatedGoal?.title || 'su alcancía';
    const formattedAmount = formatCurrencyMXN(Math.abs(amount), updatedGoal?.currency || 'MXN');
    void sendPartnerPushNotification(
      partner,
      justCompleted
        ? `🎉 ¡Meta completada en Alcancía!`
        : amount > 0
        ? `🐷 Nuevo abono de ${senderName}`
        : `🐷 Retiro en Alcancía`,
      justCompleted
        ? `¡${senderName} abonó ${formattedAmount} y completaron "${goalTitle}"! 💖`
        : `${senderName} ${amount > 0 ? 'abonó' : 'retiró'} ${formattedAmount} en "${goalTitle}".`,
      { type: 'SAVINGS_CONTRIBUTION', goalId: input.goal_id, sender: input.profile }
    );
  } catch {}

  return {
    contribution: savedContrib,
    justCompleted,
    updatedGoal,
  };
}

export async function deleteSavingsContribution(contributionId: string, goalId: string): Promise<void> {
  await deleteRow(CONTRIBS_TABLE, contributionId);

  const [goals, allContribs] = await Promise.all([
    readCache<SavingsGoal>(GOALS_TABLE),
    readCache<SavingsContribution>(CONTRIBS_TABLE),
  ]);
  const goal = goals.find((g) => g.id === goalId);
  if (goal) {
    const normalized = normalizeGoalRow(goal);
    const summary = buildGoalSummary(normalized, allContribs);
    if (summary.totalSaved < normalized.target_amount && normalized.completed_at) {
      await upsertRow<SavingsGoal>(GOALS_TABLE, {
        ...normalized,
        completed_at: null,
      });
    } else if (summary.totalSaved >= normalized.target_amount && !normalized.completed_at) {
      await upsertRow<SavingsGoal>(GOALS_TABLE, {
        ...normalized,
        completed_at: new Date().toISOString(),
      });
    }
  }
}

export function subscribeSavings(onChange: () => void): () => void {
  const unsubGoals = subscribeTable(GOALS_TABLE, onChange);
  const unsubContribs = subscribeTable(CONTRIBS_TABLE, onChange);
  return () => {
    unsubGoals();
    unsubContribs();
  };
}

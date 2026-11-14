import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { toLocalDateString } from '../StorageService';
import { getHomeState } from '../CoupleSyncService';
import { sendPartnerPushNotification } from '../NotificationService';
import { fetchAll, upsertRow, subscribeTable } from './featureStore';
import { DailyQuestionItem, getQuestionById, getQuestionForDate } from './dailyQuestionBank';
import { scheduleDailyQuestionReminder } from './featureReminders';

export type DailyAnswerRow = {
  id?: string;
  question_date: string;
  question_id: string;
  profile: UserProfile;
  answer: string;
  created_at?: string;
  updated_at?: string;
};

export interface DailyDayGroup {
  date: string;
  question: DailyQuestionItem;
  javier?: DailyAnswerRow;
  karla?: DailyAnswerRow;
  bothAnswered: boolean;
}

const TABLE = 'daily_answers';

export async function fetchDailyAnswers(force = false): Promise<DailyAnswerRow[]> {
  return fetchAll<DailyAnswerRow>(TABLE, {
    orderBy: 'question_date',
    ascending: false,
    limit: 300,
    force,
  });
}

export async function saveDailyAnswer(params: {
  profile: UserProfile;
  answer: string;
  date?: string;
}): Promise<DailyAnswerRow> {
  const dateStr = toLocalDateString(params.date || new Date());
  const question = getQuestionForDate(dateStr);
  const cleanAnswer = sanitizeInput(params.answer, 1000);
  if (!cleanAnswer) {
    throw new Error('La respuesta no puede estar vacía.');
  }

  const now = new Date().toISOString();
  const saved = await upsertRow<DailyAnswerRow>(
    TABLE,
    {
      question_date: dateStr,
      question_id: question.id,
      profile: params.profile,
      answer: cleanAnswer,
      updated_at: now,
    },
    {
      onConflict: 'question_date,profile',
      matchKeys: ['question_date', 'profile'],
    }
  );

  // Notificación push a la pareja
  try {
    const partner: UserProfile = params.profile === 'Javier' ? 'Karla' : 'Javier';
    const senderName = params.profile === 'Karla' ? 'Karlita' : 'Javier';
    await sendPartnerPushNotification(
      partner,
      `💬 Pregunta del día`,
      `${senderName} ya respondió la pregunta de hoy. ¡Entra para descubrir qué dijo!`,
      { type: 'DAILY_QUESTION', date: dateStr, sender: params.profile }
    );
  } catch {
    // Ignorar error de push opcional
  }

  // Cancelar recordatorio pendiente de hoy y dejar listos los siguientes días
  if (dateStr === toLocalDateString(new Date())) {
    void scheduleDailyQuestionReminder(true);
  }

  return saved;
}

export function subscribeDailyAnswers(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

/**
 * Agrupa todas las respuestas por fecha y calcula estadísticas (días que ambos respondieron y racha).
 */
export function buildDailyQuestionGroups(rows: DailyAnswerRow[]): {
  groups: DailyDayGroup[];
  bothAnsweredTotal: number;
  streakDays: number;
} {
  const byDate = new Map<string, { javier?: DailyAnswerRow; karla?: DailyAnswerRow; qId?: string }>();

  for (const r of rows) {
    if (!r || !r.question_date) continue;
    const d = toLocalDateString(r.question_date);
    const entry = byDate.get(d) || {};
    if (r.profile === 'Javier') entry.javier = r;
    if (r.profile === 'Karla') entry.karla = r;
    if (r.question_id) entry.qId = r.question_id;
    byDate.set(d, entry);
  }

  const groups: DailyDayGroup[] = Array.from(byDate.entries())
    .map(([date, info]) => {
      const q = (info.qId && getQuestionById(info.qId)) || getQuestionForDate(date);
      const bothAnswered = Boolean(info.javier?.answer && info.karla?.answer);
      return {
        date,
        question: q,
        javier: info.javier,
        karla: info.karla,
        bothAnswered,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const bothAnsweredTotal = groups.filter((g) => g.bothAnswered).length;

  // Calcular racha consecutiva de días en que ambos respondieron (contando desde hoy o ayer)
  const bothDatesSet = new Set(groups.filter((g) => g.bothAnswered).map((g) => g.date));
  let streakDays = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  const todayStr = toLocalDateString(cursor);
  if (!bothDatesSet.has(todayStr)) {
    // Si hoy aún no responden ambos, verificar si ayer sí respondieron para mantener la racha activa
    cursor.setDate(cursor.getDate() - 1);
  }

  while (bothDatesSet.has(toLocalDateString(cursor))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { groups, bothAnsweredTotal, streakDays };
}

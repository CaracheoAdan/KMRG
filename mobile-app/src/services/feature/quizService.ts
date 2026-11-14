import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { getHomeState } from '../CoupleSyncService';
import { sendPartnerPushNotification } from '../NotificationService';
import { fetchAll, upsertRow, deleteRow, subscribeTable } from './featureStore';

export type QuizQuestionRow = {
  id: string;
  author: UserProfile;
  question: string;
  options: string[];
  correct_index: number;
  created_at?: string;
};

export type QuizAttemptRow = {
  id: string;
  question_id: string;
  profile: UserProfile;
  chosen_index: number;
  is_correct: boolean;
  created_at?: string;
};

export interface QuizSuggestedTemplate {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export const QUIZ_SUGGESTED_TEMPLATES: QuizSuggestedTemplate[] = [
  {
    id: 'tpl_1',
    question: '¿Cuál es mi comida favorita cuando quiero consentirme?',
    options: ['Tacos', 'Sushi', 'Pizza', 'Hamburguesa'],
    correctIndex: 0,
  },
  {
    id: 'tpl_2',
    question: '¿Qué prefiero hacer en un domingo libre?',
    options: ['Dormir hasta tarde y ver pelis', 'Salir a pasear o pueblear', 'Ir por un cafecito y postre', 'Jugar videojuegos'],
    correctIndex: 0,
  },
  {
    id: 'tpl_3',
    question: '¿Cuál es mi lenguaje del amor principal?',
    options: ['Tiempo de calidad', 'Contacto físico y abrazos', 'Palabras bonitas', 'Detalles y sorpresas'],
    correctIndex: 0,
  },
  {
    id: 'tpl_4',
    question: '¿Qué sabor de helado o postre elijo casi siempre?',
    options: ['Chocolate', 'Vainilla / Oreo', 'Frutos rojos / Fresa', 'Caramelo / Café'],
    correctIndex: 0,
  },
  {
    id: 'tpl_5',
    question: '¿Qué destino me ilusiona más visitar contigo?',
    options: ['Una playa paradisíaca', 'Europa', 'Japón', 'Una cabaña en el bosque'],
    correctIndex: 0,
  },
  {
    id: 'tpl_6',
    question: '¿En qué momento del día tengo más energía?',
    options: ['Temprano por la mañana', 'A media tarde', 'De noche / madrugada', 'Después de una siesta'],
    correctIndex: 2,
  },
  {
    id: 'tpl_7',
    question: '¿Qué me calma más rápido cuando estoy estresado/a?',
    options: ['Un abrazo largo tuyo', 'Comer algo rico', 'Escuchar música', 'Salir a caminar'],
    correctIndex: 0,
  },
  {
    id: 'tpl_8',
    question: '¿Qué género de película prefiero para una noche de cine juntos?',
    options: ['Comedia romántica', 'Terror / Suspenso', 'Acción / Ciencia ficción', 'Animación'],
    correctIndex: 0,
  },
];

const QUESTIONS_TABLE = 'quiz_questions';
const ATTEMPTS_TABLE = 'quiz_attempts';

function normalizeOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
  }
  return [];
}

export async function fetchQuizData(): Promise<{
  questions: QuizQuestionRow[];
  attempts: QuizAttemptRow[];
}> {
  const [rawQuestions, attempts] = await Promise.all([
    fetchAll<QuizQuestionRow>(QUESTIONS_TABLE, { orderBy: 'created_at', ascending: false, limit: 300 }),
    fetchAll<QuizAttemptRow>(ATTEMPTS_TABLE, { orderBy: 'created_at', ascending: false, limit: 500 }),
  ]);

  const questions = rawQuestions
    .map((q) => ({
      ...q,
      options: normalizeOptions(q.options),
      correct_index: Number(q.correct_index) || 0,
    }))
    .filter((q) => q.options.length >= 2);

  return { questions, attempts };
}

export async function createQuizQuestion(params: {
  author: UserProfile;
  question: string;
  options: string[];
  correctIndex: number;
}): Promise<QuizQuestionRow> {
  const cleanQuestion = sanitizeInput(params.question, 300);
  const cleanOptions = params.options
    .map((o) => sanitizeInput(o, 120))
    .filter((o) => o.length > 0)
    .slice(0, 4);

  if (!cleanQuestion) {
    throw new Error('Escribe una pregunta.');
  }
  if (cleanOptions.length < 2) {
    throw new Error('Agrega al menos 2 opciones de respuesta.');
  }
  const safeCorrect =
    params.correctIndex >= 0 && params.correctIndex < cleanOptions.length ? params.correctIndex : 0;

  const created = await upsertRow<QuizQuestionRow>(QUESTIONS_TABLE, {
    id: '',
    author: params.author,
    question: cleanQuestion,
    options: cleanOptions,
    correct_index: safeCorrect,
    created_at: new Date().toISOString(),
  });

  // Push a la pareja
  try {
    const partner: UserProfile = params.author === 'Javier' ? 'Karla' : 'Javier';
    const senderName = params.author === 'Karla' ? 'Karlita' : 'Javier';
    await sendPartnerPushNotification(
      partner,
      `🧠 Nuevo reto en "¿Qué tanto me conoces?"`,
      `${senderName} creó una nueva pregunta para ti. ¡Demuestra cuánto le conoces!`,
      { type: 'QUIZ_NEW_QUESTION', sender: params.author }
    );
  } catch {
    // Ignorar error de push
  }

  return created;
}

export async function deleteQuizQuestion(questionId: string): Promise<void> {
  await deleteRow(QUESTIONS_TABLE, questionId);
}

export async function submitQuizAttempt(params: {
  question: QuizQuestionRow;
  profile: UserProfile;
  chosenIndex: number;
}): Promise<QuizAttemptRow> {
  const isCorrect = params.chosenIndex === Number(params.question.correct_index);
  const saved = await upsertRow<QuizAttemptRow>(
    ATTEMPTS_TABLE,
    {
      id: '',
      question_id: params.question.id,
      profile: params.profile,
      chosen_index: params.chosenIndex,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    },
    {
      onConflict: 'question_id,profile',
      matchKeys: ['question_id', 'profile'],
    }
  );

  // Push al autor de la pregunta
  try {
    const partner: UserProfile = params.profile === 'Javier' ? 'Karla' : 'Javier';
    const responderName = params.profile === 'Karla' ? 'Karlita' : 'Javier';
    await sendPartnerPushNotification(
      partner,
      isCorrect ? `🏆 ¡${responderName} acertó tu pregunta!` : `🤭 ${responderName} intentó tu pregunta`,
      `Pregunta: "${params.question.question.slice(0, 80)}"`,
      { type: 'QUIZ_ATTEMPT', isCorrect, sender: params.profile }
    );
  } catch {
    // Ignorar
  }

  return saved;
}

export function subscribeQuizChanges(onChange: () => void): () => void {
  const unsubQ = subscribeTable(QUESTIONS_TABLE, onChange);
  const unsubA = subscribeTable(ATTEMPTS_TABLE, onChange);
  return () => {
    unsubQ();
    unsubA();
  };
}

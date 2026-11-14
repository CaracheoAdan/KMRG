import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import {
  BucketItem,
  DominoState,
  DrawGuessState,
  HomeState,
  LetterExtraData,
  LoveReason,
  MovieItem,
  MoviesAndPlansState,
  QuickNoteMessage,
  SpecialPlace,
  TimeCapsuleItem,
  UnoState,
  UserProfile,
  VoiceNoteData,
} from '../types';
import { toLocalDateString } from './StorageService';
import { sanitizeInput } from '../theme/designSystem';

const HOME_STATE_KEY = '@kmrg_couple_home_state_v2';
const MOVIES_STATE_KEY = '@kmrg_couple_movies_state_v2';
const GAMES_STATE_KEY = '@kmrg_couple_games_state_v2';
const PLACES_STATE_KEY = '@kmrg_couple_places_state_v1';

// Limpia emojis residuales de etiquetas heredadas para mantener una tipografía limpia
const stripLegacyEmoji = (value: string): string =>
  value
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/gu,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

export const DEFAULT_SPECIAL_PLACES: SpecialPlace[] = [
  {
    id: 'place-1792771302670',
    title: 'Primer beso 💜',
    category: 'Primera Vez',
    address: '20.51399, -100.82658',
    date: '2026-10-23',
    notes:
      'Desde este día, supe que quería estar contigo el resto de mi vida, sin importar qué pasara.',
    rating: 5,
    latitude: 20.513986925980635,
    longitude: -100.8265775063644,
    mapX: 50,
    mapY: 50,
    addedBy: 'Javier',
    favorite: true,
  },
];

export const DEFAULT_HOME_STATE: HomeState = {
  anniversaryDate: '2024-02-14',
  nextEventTitle: '',
  nextEventDate: '',
  nextEventTime: '',
  nextEventUpdatedAt: '1970-01-01T00:00:00.000Z',
  streakCount: 1,
  lastInteractionDate: '1970-01-01',
  moods: {
    Javier: {
      emoji: 'Enamorado/a',
      status: '',
      song: '',
      updatedAt: '1970-01-01T00:00:00.000Z',
    },
    Karla: {
      emoji: 'Enamorado/a',
      status: '',
      song: '',
      updatedAt: '1970-01-01T00:00:00.000Z',
    },
  },
  stickyNote: {
    author: 'Javier',
    text: '',
    updatedAt: '1970-01-01T00:00:00.000Z',
  },
  loveReasons: [],
  voiceNotes: [],
  timeCapsules: [],
  couplePet: {
    name: 'Pochito',
    happiness: 100,
    xp: 0,
    level: 1,
    heartsFedTotal: 0,
    heartsFedKarla: 0,
    heartsFedJavier: 0,
    lastFedAt: '1970-01-01T00:00:00.000Z',
    lastFedBy: 'Javier',
  },
  partnerProfiles: {
    Karla: {
      id: 'Karla',
      displayName: 'Karlita',
      avatarUri: null,
      updatedAt: '1970-01-01T00:00:00.000Z',
    },
    Javier: {
      id: 'Javier',
      displayName: 'Javier',
      avatarUri: null,
      updatedAt: '1970-01-01T00:00:00.000Z',
    },
  },
};

export const DEFAULT_MOVIES_STATE: MoviesAndPlansState = {
  movies: [],
  bucketList: [],
  foodOptions: [
    'Taquitos',
    'Sushi',
    'Pizza en pijama',
    'Hamburguesas y papas',
    'Alitas y Boneless',
    'Cafecito y Postre',
    'Cine con Nachos y Palomitas',
    'Ida por helado',
  ],
};

export interface ChessPiece {
  type: 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
  color: 'w' | 'b'; // 'w' = Karlita, 'b' = Javier
}

export interface BattleshipShip {
  id: string;
  name: string;
  size: number;
  orientation: 'H' | 'V';
  cells: number[]; // Índices 0..99 en cuadrícula naval oficial 10x10
}

export const BATTLESHIP_FLEET_TEMPLATE: Array<{ id: string; name: string; size: number }> = [
  { id: 'carrier', name: 'Portaaviones', size: 5 },
  { id: 'battleship', name: 'Acorazado', size: 4 },
  { id: 'cruiser', name: 'Crucero', size: 3 },
  { id: 'submarine', name: 'Submarino', size: 3 },
  { id: 'destroyer', name: 'Destructor', size: 2 },
];

export const createRandomBattleshipFleet = (): BattleshipShip[] => {
  const occupied = new Set<number>();
  const fleet: BattleshipShip[] = [];

  for (const spec of BATTLESHIP_FLEET_TEMPLATE) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 300) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const maxR = horizontal ? 10 : 10 - spec.size + 1;
      const maxC = horizontal ? 10 - spec.size + 1 : 10;
      const r = Math.floor(Math.random() * maxR);
      const c = Math.floor(Math.random() * maxC);

      const candidate: number[] = [];
      let collision = false;
      for (let i = 0; i < spec.size; i++) {
        const nr = horizontal ? r : r + i;
        const nc = horizontal ? c + i : c;
        const idx = nr * 10 + nc;
        if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10 || idx < 0 || idx >= 100 || occupied.has(idx)) {
          collision = true;
          break;
        }
        candidate.push(idx);
      }

      if (!collision) {
        candidate.forEach((idx) => occupied.add(idx));
        fleet.push({
          id: spec.id,
          name: spec.name,
          size: spec.size,
          orientation: horizontal ? 'H' : 'V',
          cells: candidate,
        });
        placed = true;
      }
    }
  }
  return fleet;
};

export interface GameScoreItem {
  winsKarla: number;
  winsJavier: number;
  pointsKarla: number;
  pointsJavier: number;
  trophiesKarla: number;
  trophiesJavier: number;
}

export interface GameScoreBreakdown {
  tictactoe: GameScoreItem;
  sudoku: GameScoreItem;
  chess: GameScoreItem;
  hangman: GameScoreItem;
  battleship: GameScoreItem;
  drawguess: GameScoreItem;
  domino: GameScoreItem;
  uno: GameScoreItem;
}

export interface WeeklyChampionSummary {
  weekKey: string;
  winner: UserProfile | 'Empate';
  pointsKarla: number;
  pointsJavier: number;
  trophiesKarla: number;
  trophiesJavier: number;
}

export interface GamesLeaderboard {
  pointsKarla: number;
  pointsJavier: number;
  trophiesKarla: number;
  trophiesJavier: number;
  weekKey: string;
  breakdown: GameScoreBreakdown;
  lastWeekSummary?: WeeklyChampionSummary | null;
}

export const UNIFIED_GAME_REWARDS = {
  POINTS_PER_WIN: 100,
  TROPHIES_PER_WIN: 1,
  POINTS_PER_TIE: 30,
  TROPHIES_PER_TIE: 0,
} as const;

export function getWeeklyResetKey(d: Date = new Date()): string {
  const target = new Date(d.getTime());
  const dayNr = (target.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = new Date(firstThursday).getFullYear();
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}

export function getDaysRemainingInWeek(d: Date = new Date()): number {
  const day = d.getDay();
  if (day === 0) return 0;
  return 7 - day;
}

export const createDefaultGameScoreItem = (): GameScoreItem => ({
  winsKarla: 0,
  winsJavier: 0,
  pointsKarla: 0,
  pointsJavier: 0,
  trophiesKarla: 0,
  trophiesJavier: 0,
});

export const createDefaultBreakdown = (): GameScoreBreakdown => ({
  tictactoe: createDefaultGameScoreItem(),
  sudoku: createDefaultGameScoreItem(),
  chess: createDefaultGameScoreItem(),
  hangman: createDefaultGameScoreItem(),
  battleship: createDefaultGameScoreItem(),
  drawguess: createDefaultGameScoreItem(),
  domino: createDefaultGameScoreItem(),
  uno: createDefaultGameScoreItem(),
});

export interface SudokuSessionState {
  sessionId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  board: number[][];
  fixed: boolean[][];
  solution: number[][];
  notes: Record<string, number[]>;
  score: number;
  mistakes: number;
  completed: boolean;
  completedBy?: UserProfile | null;
  placedBy?: Record<string, UserProfile>;
  updatedAt?: number;
  version?: number;
}

export interface GamesState {
  leaderboard: GamesLeaderboard;
  ticTacToe: {
    board: Array<'Javier' | 'Karla' | null>;
    winningLine: number[] | null;
    turn: UserProfile;
    winner: UserProfile | 'Empate' | null;
    scoreJavier: number;
    scoreKarla: number;
    round: number;
    infiniteMode?: boolean;
    moveOrder?: number[];
    updatedAt?: number;
    version?: number;
  };
  sudoku: {
    bestScoreKarla: number;
    bestScoreJavier: number;
    completedCount: number;
    session?: SudokuSessionState | null;
  };
  hangman: {
    roundId?: string;
    word: string;
    hint: string;
    category: string;
    author: string;
    isPartnerChallenge: boolean;
    guessed: string[];
    status: 'playing' | 'won' | 'lost';
    winner?: UserProfile | null;
    scoreJavier: number;
    scoreKarla: number;
    streak: number;
    hintUsed?: boolean;
    updatedAt?: number;
    version?: number;
  };
  chess: {
    matchId?: string;
    board: Array<Array<ChessPiece | null>>;
    turn: 'w' | 'b';
    capturedByW: string[];
    capturedByB: string[];
    lastMove: { from: [number, number]; to: [number, number] } | null;
    winner: 'w' | 'b' | null;
    winsKarla: number;
    winsJavier: number;
    moveHistory?: string[];
    updatedAt?: number;
    version?: number;
  };
  battleship: {
    matchId?: string;
    phase: 'idle' | 'invited' | 'setup' | 'battle' | 'finished';
    invitedBy: UserProfile | null;
    lastUpdatedBy?: UserProfile | null;
    readyKarla: boolean;
    readyJavier: boolean;
    fleetKarla: BattleshipShip[];
    fleetJavier: BattleshipShip[];
    shotsByKarla: number[]; // Disparos de Karlita hacia el mar 10x10 de Javier
    shotsByJavier: number[]; // Disparos de Javier hacia el mar 10x10 de Karlita
    turn: UserProfile;
    lastShot: {
      shooter: UserProfile;
      cell: number;
      hit: boolean;
      sunkShipName?: string;
    } | null;
    winner: UserProfile | null;
    winsKarla: number;
    winsJavier: number;
    updatedAt?: number;
    version?: number;
  };
  drawGuess: DrawGuessState;
  domino: DominoState;
  uno: UnoState;
}

export const createInitialChessBoard = (): Array<Array<ChessPiece | null>> => {
  const backRow = (color: 'w' | 'b'): ChessPiece[] => [
    { type: 'r', color },
    { type: 'n', color },
    { type: 'b', color },
    { type: 'q', color },
    { type: 'k', color },
    { type: 'b', color },
    { type: 'n', color },
    { type: 'r', color },
  ];
  const pawnRow = (color: 'w' | 'b'): ChessPiece[] =>
    Array.from({ length: 8 }, () => ({ type: 'p', color }));
  const emptyRow = (): Array<ChessPiece | null> => Array.from({ length: 8 }, () => null);

  return [
    backRow('b'),
    pawnRow('b'),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    pawnRow('w'),
    backRow('w'),
  ];
};

export const DEFAULT_GAMES_STATE: GamesState = {
  leaderboard: {
    pointsKarla: 0,
    pointsJavier: 0,
    trophiesKarla: 0,
    trophiesJavier: 0,
    weekKey: getWeeklyResetKey(),
    breakdown: createDefaultBreakdown(),
    lastWeekSummary: null,
  },
  ticTacToe: {
    board: Array(9).fill(null),
    winningLine: null,
    turn: 'Karla',
    winner: null,
    scoreJavier: 0,
    scoreKarla: 0,
    round: 1,
    updatedAt: 0,
    version: 0,
  },
  sudoku: {
    bestScoreKarla: 0,
    bestScoreJavier: 0,
    completedCount: 0,
    session: null,
  },
  hangman: {
    roundId: 'hm_initial',
    word: 'GUITARRA',
    hint: 'Instrumento musical de seis cuerdas con caja de resonancia',
    category: 'Objetos',
    author: 'Juego Normal',
    isPartnerChallenge: false,
    guessed: [],
    status: 'playing',
    winner: null,
    scoreJavier: 0,
    scoreKarla: 0,
    streak: 0,
    updatedAt: 0,
    version: 0,
  },
  chess: {
    matchId: 'chess_initial',
    board: createInitialChessBoard(),
    turn: 'w',
    capturedByW: [],
    capturedByB: [],
    lastMove: null,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    updatedAt: 0,
    version: 0,
  },
  battleship: {
    matchId: 'bs_initial',
    phase: 'idle',
    invitedBy: null,
    readyKarla: false,
    readyJavier: false,
    fleetKarla: createRandomBattleshipFleet(),
    fleetJavier: createRandomBattleshipFleet(),
    shotsByKarla: [],
    shotsByJavier: [],
    turn: 'Karla',
    lastShot: null,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    updatedAt: 0,
    version: 0,
  },
  drawGuess: {
    phase: 'idle',
    currentRound: 1,
    drawer: 'Karla',
    guesser: 'Javier',
    wordChoices: null,
    selectedWord: null,
    selectedWordDifficulty: null,
    selectedWordCategory: null,
    wordLength: 0,
    roundDeadline: null,
    isPaused: false,
    pausedSecondsRemaining: null,
    lastActiveTimestamp: null,
    strokes: [],
    attempts: [],
    revealedIndices: [],
    usedHint: false,
    roundPoints: 0,
    scoreKarla: 0,
    scoreJavier: 0,
    guesserScoreKarla: 0,
    guesserScoreJavier: 0,
    correctGuessesKarla: 0,
    correctGuessesJavier: 0,
    totalGuessTimeKarla: 0,
    totalGuessTimeJavier: 0,
    usedWords: [],
    roundsHistory: [],
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
  },
  domino: {
    phase: 'idle',
    board: [],
    openLeft: null,
    openRight: null,
    handKarla: [],
    handJavier: [],
    boneyard: [],
    turn: 'Karla',
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    consecutivePasses: 0,
    lastAction: null,
  },
  uno: {
    phase: 'idle',
    deck: [],
    discardPile: [],
    currentCard: { id: 'red-7-init', color: 'red', value: '7' },
    currentColor: 'red',
    handKarla: [],
    handJavier: [],
    turn: 'Karla',
    calledUnoKarla: false,
    calledUnoJavier: false,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
    lastAction: null,
  },
};

function normalizeHomeState(state: HomeState): HomeState {
  const safeMoods = {
    ...DEFAULT_HOME_STATE.moods,
    ...(state.moods || {}),
  };
  return {
    ...DEFAULT_HOME_STATE,
    ...state,
    nextEventTitle: stripLegacyEmoji(
      sanitizeInput(state.nextEventTitle || DEFAULT_HOME_STATE.nextEventTitle, 100)
    ),
    nextEventDate: sanitizeInput(state.nextEventDate || '', 20),
    nextEventTime: sanitizeInput(state.nextEventTime || '', 10),
    nextEventUpdatedAt: state.nextEventUpdatedAt || '1970-01-01T00:00:00.000Z',
    moods: {
      Javier: {
        ...DEFAULT_HOME_STATE.moods.Javier,
        ...(safeMoods.Javier || {}),
        feeling: safeMoods.Javier?.feeling,
        emoji: sanitizeInput(safeMoods.Javier?.emoji || DEFAULT_HOME_STATE.moods.Javier.emoji, 40),
        status: sanitizeInput(safeMoods.Javier?.status || '', 120),
        song: sanitizeInput(safeMoods.Javier?.song || '', 80),
        updatedAt: safeMoods.Javier?.updatedAt || DEFAULT_HOME_STATE.moods.Javier.updatedAt,
      },
      Karla: {
        ...DEFAULT_HOME_STATE.moods.Karla,
        ...(safeMoods.Karla || {}),
        feeling: safeMoods.Karla?.feeling,
        emoji: sanitizeInput(safeMoods.Karla?.emoji || DEFAULT_HOME_STATE.moods.Karla.emoji, 40),
        status: sanitizeInput(safeMoods.Karla?.status || '', 120),
        song: sanitizeInput(safeMoods.Karla?.song || '', 80),
        updatedAt: safeMoods.Karla?.updatedAt || DEFAULT_HOME_STATE.moods.Karla.updatedAt,
      },
    },
    stickyNote: {
      author: state.stickyNote?.author === 'Karla' ? 'Karla' : 'Javier',
      text: sanitizeInput(state.stickyNote?.text || '', 500),
      updatedAt: state.stickyNote?.updatedAt || '1970-01-01T00:00:00.000Z',
    },
    loveReasons: Array.isArray(state.loveReasons)
      ? state.loveReasons.slice(-60).map((r) => ({
          ...r,
          text: sanitizeInput(r.text || '', 300),
        }))
      : DEFAULT_HOME_STATE.loveReasons,
    voiceNotes: Array.isArray(state.voiceNotes)
      ? state.voiceNotes.slice(0, 20)
      : DEFAULT_HOME_STATE.voiceNotes,
    timeCapsules: Array.isArray(state.timeCapsules)
      ? state.timeCapsules.slice(0, 30)
      : DEFAULT_HOME_STATE.timeCapsules,
    quickNotes: Array.isArray(state.quickNotes)
      ? state.quickNotes.slice(-25)
      : undefined,
    letterExtras: state.letterExtras
      ? Object.fromEntries(
          Object.entries(state.letterExtras)
            .slice(-40)
            .map(([k, v]) => [
              k,
              {
                ...v,
                photoUrl: v?.photoUrl && !v.photoUrl.startsWith('data:') ? v.photoUrl : undefined,
              },
            ])
        )
      : undefined,
    todaySong: state.todaySong
      ? {
          ...state.todaySong,
          title: sanitizeInput(state.todaySong.title || '', 120),
          artist: sanitizeInput(state.todaySong.artist || '', 120),
          dedication: state.todaySong.dedication
            ? sanitizeInput(state.todaySong.dedication, 300)
            : undefined,
          url:
            state.todaySong.url && /^https?:\/\//i.test(state.todaySong.url.trim())
              ? state.todaySong.url.trim()
              : undefined,
        }
      : undefined,
    couplePet: {
      ...DEFAULT_HOME_STATE.couplePet!,
      ...(state.couplePet || {}),
      name: sanitizeInput(state.couplePet?.name || 'Pochito', 24) || 'Pochito',
      heartsFedTotal: Number(state.couplePet?.heartsFedTotal) || 0,
      heartsFedKarla: Number(state.couplePet?.heartsFedKarla) || 0,
      heartsFedJavier: Number(state.couplePet?.heartsFedJavier) || 0,
    },
    partnerProfiles: {
      Karla: {
        id: 'Karla',
        displayName:
          sanitizeInput(state.partnerProfiles?.Karla?.displayName || 'Karlita', 24) || 'Karlita',
        avatarUri: state.partnerProfiles?.Karla?.avatarUri ?? null,
        updatedAt: state.partnerProfiles?.Karla?.updatedAt,
      },
      Javier: {
        id: 'Javier',
        displayName:
          sanitizeInput(state.partnerProfiles?.Javier?.displayName || 'Javier', 24) || 'Javier',
        avatarUri: state.partnerProfiles?.Javier?.avatarUri ?? null,
        updatedAt: state.partnerProfiles?.Javier?.updatedAt,
      },
    },
  };
}

function isDefaultUntouchedMood(m?: { emoji?: string; status?: string; feeling?: string; song?: string; updatedAt?: string }): boolean {
  if (!m) return true;
  if (m.updatedAt && m.updatedAt !== '1970-01-01T00:00:00.000Z') {
    return false;
  }
  return !m.status?.trim() && !m.feeling && !m.song?.trim() && (!m.emoji || m.emoji === 'Enamorado/a');
}

function pickBestMood<T extends { emoji: string; status: string; feeling?: string; song?: string; updatedAt: string }>(
  baseMood: T,
  incMood: T
): T {
  const baseIsDefault = isDefaultUntouchedMood(baseMood);
  const incIsDefault = isDefaultUntouchedMood(incMood);

  // Nunca permitir que un estado default vacío sobreescriba un estado de ánimo real personalizado
  if (incIsDefault && !baseIsDefault) return baseMood;
  if (baseIsDefault && !incIsDefault) return incMood;

  const baseTime = new Date(baseMood.updatedAt || 0).getTime();
  const incTime = new Date(incMood.updatedAt || 0).getTime();
  return incTime >= baseTime ? incMood : baseMood;
}

export function mergeHomeStates(base: HomeState, incoming: HomeState): HomeState {
  const normBase = normalizeHomeState(base);
  const normIncoming = normalizeHomeState(incoming);

  // Preservar fecha de aniversario personalizada (el default '2024-02-14' nunca pisa una fecha real)
  const anniversaryDate =
    normIncoming.anniversaryDate && normIncoming.anniversaryDate !== DEFAULT_HOME_STATE.anniversaryDate
      ? normIncoming.anniversaryDate
      : normBase.anniversaryDate || DEFAULT_HOME_STATE.anniversaryDate;

  // Preservar próximo evento agendado usando timestamp cuando exista
  const nextEventBaseTime = new Date(normBase.nextEventUpdatedAt || 0).getTime();
  const nextEventIncTime = new Date(normIncoming.nextEventUpdatedAt || 0).getTime();
  let nextEventSource = normIncoming;
  if (nextEventBaseTime > 0 || nextEventIncTime > 0) {
    nextEventSource = nextEventIncTime >= nextEventBaseTime ? normIncoming : normBase;
  } else {
    nextEventSource = normIncoming.nextEventDate?.trim()
      ? normIncoming
      : normBase.nextEventDate?.trim()
      ? normBase
      : normIncoming;
  }
  const nextEventTitle = nextEventSource.nextEventTitle || '';
  const nextEventDate = nextEventSource.nextEventDate || '';
  const nextEventTime = nextEventSource.nextEventTime || '';
  const nextEventUpdatedAt =
    nextEventSource.nextEventUpdatedAt || '1970-01-01T00:00:00.000Z';

  // Notita fija: una notita vacía por defecto nunca pisa una notita con texto real
  const stickyBaseHasText = Boolean(normBase.stickyNote?.text?.trim());
  const stickyIncHasText = Boolean(normIncoming.stickyNote?.text?.trim());
  const stickyBaseTime = new Date(normBase.stickyNote?.updatedAt || 0).getTime();
  const stickyIncTime = new Date(normIncoming.stickyNote?.updatedAt || 0).getTime();
  const stickyNote =
    stickyIncHasText && !stickyBaseHasText
      ? normIncoming.stickyNote
      : !stickyIncHasText && stickyBaseHasText
      ? normBase.stickyNote
      : stickyIncTime >= stickyBaseTime
      ? normIncoming.stickyNote
      : normBase.stickyNote;

  // Razones para amar: unión por ID sin perder ninguna
  const reasonsMap = new Map<string, LoveReason>();
  (normBase.loveReasons || []).forEach((r) => reasonsMap.set(r.id, r));
  (normIncoming.loveReasons || []).forEach((r) => reasonsMap.set(r.id, r));

  // Notas de voz: unión por ID sin perder ninguna
  const voiceMap = new Map<string, VoiceNoteData>();
  (normBase.voiceNotes || []).forEach((v) => voiceMap.set(v.id, v));
  (normIncoming.voiceNotes || []).forEach((v) => voiceMap.set(v.id, v));

  // Cápsulas de tiempo: unión por ID sin perder ninguna
  const capsulesMap = new Map<string, TimeCapsuleItem>();
  (normBase.timeCapsules || []).forEach((c) => capsulesMap.set(c.id, c));
  (normIncoming.timeCapsules || []).forEach((c) => capsulesMap.set(c.id, c));

  // Mascota de pareja Pochito: retener mayor nivel, xp, corazones y accesorios
  const basePet = normBase.couplePet || DEFAULT_HOME_STATE.couplePet!;
  const incPet = normIncoming.couplePet || DEFAULT_HOME_STATE.couplePet!;
  const unlockedAccs = Array.from(
    new Set([
      ...(basePet.unlockedAccessories || ['none']),
      ...(incPet.unlockedAccessories || ['none']),
    ])
  );

  const basePetTime = new Date(basePet.lastFedAt || 0).getTime();
  const incPetTime = new Date(incPet.lastFedAt || 0).getTime();
  const isIncPetDefault =
    incPetTime <= 0 &&
    (incPet.heartsFedTotal || 0) === 0 &&
    (incPet.level || 1) === 1 &&
    (!incPet.accessory || incPet.accessory === 'none') &&
    (!incPet.name || incPet.name === 'Pochito');

  const couplePet = {
    name: !isIncPetDefault && incPetTime >= basePetTime
      ? (incPet.name || basePet.name || 'Pochito')
      : (basePet.name !== 'Pochito' ? basePet.name : (incPet.name || 'Pochito')),
    level: Math.max(basePet.level || 1, incPet.level || 1),
    xp: Math.max(basePet.xp || 0, incPet.xp || 0),
    happiness: Math.max(basePet.happiness || 50, incPet.happiness || 50),
    heartsFedTotal: Math.max(basePet.heartsFedTotal || 0, incPet.heartsFedTotal || 0),
    heartsFedKarla: Math.max(basePet.heartsFedKarla || 0, incPet.heartsFedKarla || 0),
    heartsFedJavier: Math.max(basePet.heartsFedJavier || 0, incPet.heartsFedJavier || 0),
    lastFedAt: incPetTime >= basePetTime ? incPet.lastFedAt : basePet.lastFedAt,
    lastFedBy: incPetTime >= basePetTime ? (incPet.lastFedBy || basePet.lastFedBy) : (basePet.lastFedBy || incPet.lastFedBy),
    accessory: !isIncPetDefault && incPetTime >= basePetTime
      ? (incPet.accessory || basePet.accessory || 'none')
      : (basePet.accessory && basePet.accessory !== 'none' ? basePet.accessory : (incPet.accessory || 'none')),
    unlockedAccessories: unlockedAccs,
  };

  // Perfiles de pareja: conservar avatares y nombres según timestamp individual de cada uno
  const karlaProfileBaseTime = new Date(normBase.partnerProfiles?.Karla?.updatedAt || 0).getTime();
  const karlaProfileIncTime = new Date(normIncoming.partnerProfiles?.Karla?.updatedAt || 0).getTime();
  const javierProfileBaseTime = new Date(normBase.partnerProfiles?.Javier?.updatedAt || 0).getTime();
  const javierProfileIncTime = new Date(normIncoming.partnerProfiles?.Javier?.updatedAt || 0).getTime();

  // Si incoming es más reciente o igual, gana incoming para Karla; si no, base
  const karlaWinner =
    karlaProfileIncTime >= karlaProfileBaseTime
      ? normIncoming.partnerProfiles?.Karla || normBase.partnerProfiles?.Karla
      : normBase.partnerProfiles?.Karla || normIncoming.partnerProfiles?.Karla;

  // Si incoming es más reciente o igual, gana incoming para Javier; si no, base
  const javierWinner =
    javierProfileIncTime >= javierProfileBaseTime
      ? normIncoming.partnerProfiles?.Javier || normBase.partnerProfiles?.Javier
      : normBase.partnerProfiles?.Javier || normIncoming.partnerProfiles?.Javier;

  // Si ambos timestamps eran 0 (datos legados sin updatedAt):
  // conservar el avatar no nulo para evitar regresión
  const karlaAvatar =
    karlaProfileIncTime !== 0 || karlaProfileBaseTime !== 0
      ? (karlaWinner?.avatarUri ?? null)
      : (normIncoming.partnerProfiles?.Karla?.avatarUri ||
         normBase.partnerProfiles?.Karla?.avatarUri ||
         null);

  const javierAvatar =
    javierProfileIncTime !== 0 || javierProfileBaseTime !== 0
      ? (javierWinner?.avatarUri ?? null)
      : (normIncoming.partnerProfiles?.Javier?.avatarUri ||
         normBase.partnerProfiles?.Javier?.avatarUri ||
         null);

  const partnerProfiles = {
    Karla: {
      id: 'Karla' as const,
      displayName: karlaWinner?.displayName?.trim() || 'Karlita',
      avatarUri: karlaAvatar,
      updatedAt:
        karlaWinner?.updatedAt ||
        (karlaProfileIncTime >= karlaProfileBaseTime
          ? normIncoming.partnerProfiles?.Karla?.updatedAt
          : normBase.partnerProfiles?.Karla?.updatedAt),
    },
    Javier: {
      id: 'Javier' as const,
      displayName: javierWinner?.displayName?.trim() || 'Javier',
      avatarUri: javierAvatar,
      updatedAt:
        javierWinner?.updatedAt ||
        (javierProfileIncTime >= javierProfileBaseTime
          ? normIncoming.partnerProfiles?.Javier?.updatedAt
          : normBase.partnerProfiles?.Javier?.updatedAt),
    },
  };

  // Notitas rápidas: unión por ID ordenadas por fecha
  const quickMap = new Map<string, QuickNoteMessage>();
  (normBase.quickNotes || []).forEach((n) => quickMap.set(n.id, n));
  (normIncoming.quickNotes || []).forEach((n) => quickMap.set(n.id, n));
  const quickNotes = Array.from(quickMap.values())
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-50);

  // Canción de hoy: más reciente
  const songBaseTime = new Date(normBase.todaySong?.updatedAt || 0).getTime();
  const songIncTime = new Date(normIncoming.todaySong?.updatedAt || 0).getTime();
  const todaySong =
    songIncTime >= songBaseTime
      ? normIncoming.todaySong
      : (normBase.todaySong || normIncoming.todaySong);

  return {
    ...normBase,
    ...normIncoming,
    anniversaryDate,
    nextEventTitle,
    nextEventDate,
    nextEventTime,
    nextEventUpdatedAt,
    streakCount: Math.max(normBase.streakCount || 1, normIncoming.streakCount || 1),
    lastInteractionDate:
      normIncoming.lastInteractionDate && normIncoming.lastInteractionDate > normBase.lastInteractionDate
        ? normIncoming.lastInteractionDate
        : (normBase.lastInteractionDate || '1970-01-01'),
    moods: {
      Javier: pickBestMood(normBase.moods.Javier, normIncoming.moods.Javier),
      Karla: pickBestMood(normBase.moods.Karla, normIncoming.moods.Karla),
    },
    stickyNote,
    loveReasons: Array.from(reasonsMap.values()).filter(
      (item) => !(normBase.deletedIds || []).includes(item.id) && !(normIncoming.deletedIds || []).includes(item.id)
    ),
    voiceNotes: Array.from(voiceMap.values()).filter(
      (item) => !(normBase.deletedIds || []).includes(item.id) && !(normIncoming.deletedIds || []).includes(item.id)
    ),
    timeCapsules: Array.from(capsulesMap.values()).filter(
      (item) => !(normBase.deletedIds || []).includes(item.id) && !(normIncoming.deletedIds || []).includes(item.id)
    ),
    deletedIds: Array.from(new Set([...(normBase.deletedIds || []), ...(normIncoming.deletedIds || [])])).slice(-200),
    couplePet,
    partnerProfiles,
    pushTokens: {
      ...(normBase.pushTokens || {}),
      ...(normIncoming.pushTokens || {}),
    },
    quickNotes,
    todaySong,
    letterExtras: (() => {
      const mergedExtras: Record<string, LetterExtraData> = {
        ...(normBase.letterExtras || {}),
      };
      for (const [msgId, incExtra] of Object.entries(normIncoming.letterExtras || {})) {
        const existing = mergedExtras[msgId];
        if (!existing) {
          mergedExtras[msgId] = incExtra;
        } else {
          const baseT = new Date(existing.updatedAt || 0).getTime();
          const incT = new Date(incExtra.updatedAt || 0).getTime();
          const winner = incT >= baseT ? incExtra : existing;
          const older = incT >= baseT ? existing : incExtra;
          const rawPhoto = winner.photoUrl || older.photoUrl;
          mergedExtras[msgId] = {
            ...older,
            ...winner,
            photoUrl: rawPhoto && !rawPhoto.startsWith('data:') ? rawPhoto : undefined,
            reaction: winner.reaction || older.reaction,
            replyText: winner.replyText || older.replyText,
            repliedBy: winner.repliedBy || older.repliedBy,
          };
        }
      }
      return mergedExtras;
    })(),
  };
}

export function mergeMoviesStates(
  base: MoviesAndPlansState,
  incoming: MoviesAndPlansState
): MoviesAndPlansState {
  const normBase = normalizeMoviesState(base);
  const normIncoming = normalizeMoviesState(incoming);

  // Unir películas por ID sin perder ninguna calificación ni notas
  const moviesMap = new Map<string, MovieItem>();
  normBase.movies.forEach((m) => moviesMap.set(m.id, m));
  normIncoming.movies.forEach((m) => {
    if (moviesMap.has(m.id)) {
      const existing = moviesMap.get(m.id)!;
      moviesMap.set(m.id, {
        ...existing,
        ...m,
        watched: existing.watched || m.watched,
        ratingJavier: m.ratingJavier ?? existing.ratingJavier,
        ratingKarla: m.ratingKarla ?? existing.ratingKarla,
        notes: m.notes || existing.notes,
      });
    } else {
      moviesMap.set(m.id, m);
    }
  });

  // Unir bucket list por ID sin perder ítems completados
  const bucketMap = new Map<string, BucketItem>();
  normBase.bucketList.forEach((b) => bucketMap.set(b.id, b));
  normIncoming.bucketList.forEach((b) => {
    if (bucketMap.has(b.id)) {
      const existing = bucketMap.get(b.id)!;
      bucketMap.set(b.id, {
        ...existing,
        ...b,
        completed: existing.completed || b.completed,
      });
    } else {
      bucketMap.set(b.id, b);
    }
  });

  // Unir opciones de comida personalizadas
  const foods = Array.from(
    new Set([...normBase.foodOptions, ...normIncoming.foodOptions])
  );

  const deletedMovies = new Set([...(normBase.deletedIds || []), ...(normIncoming.deletedIds || [])]);
  return {
    movies: Array.from(moviesMap.values()).filter((m) => !deletedMovies.has(m.id)),
    bucketList: Array.from(bucketMap.values()).filter((b) => !deletedMovies.has(b.id)),
    foodOptions: foods.length > 0 ? foods : DEFAULT_MOVIES_STATE.foodOptions,
    deletedIds: Array.from(deletedMovies).slice(-200),
  };
}

export function mergeSpecialPlaces(
  base: SpecialPlacesState,
  incoming: SpecialPlacesState
): SpecialPlacesState {
  const normBase = normalizePlacesState(base);
  const normIncoming = normalizePlacesState(incoming);

  const placesMap = new Map<string, SpecialPlace>();
  normBase.places.forEach((p) => placesMap.set(p.id, p));
  normIncoming.places.forEach((p) => {
    if (placesMap.has(p.id)) {
      const existing = placesMap.get(p.id)!;
      placesMap.set(p.id, {
        ...existing,
        ...p,
        favorite: existing.favorite || p.favorite,
        imageUri: p.imageUri || existing.imageUri,
      });
    } else {
      placesMap.set(p.id, p);
    }
  });

  const deletedPlaces = new Set([...(normBase.deletedIds || []), ...(normIncoming.deletedIds || [])]);
  return {
    places: Array.from(placesMap.values()).filter((p) => !deletedPlaces.has(p.id)),
    deletedIds: Array.from(deletedPlaces).slice(-200),
  };
}

function mergeScoreItem(a?: GameScoreItem, b?: GameScoreItem): GameScoreItem {
  const itemA = a || createDefaultGameScoreItem();
  const itemB = b || createDefaultGameScoreItem();
  return {
    winsKarla: Math.max(itemA.winsKarla, itemB.winsKarla),
    winsJavier: Math.max(itemA.winsJavier, itemB.winsJavier),
    pointsKarla: Math.max(itemA.pointsKarla, itemB.pointsKarla),
    pointsJavier: Math.max(itemA.pointsJavier, itemB.pointsJavier),
    trophiesKarla: Math.max(itemA.trophiesKarla, itemB.trophiesKarla),
    trophiesJavier: Math.max(itemA.trophiesJavier, itemB.trophiesJavier),
  };
}

export function mergeGamesStates(base: GamesState, incoming: GamesState): GamesState {
  const normBase = normalizeGamesState(base);
  const normIncoming = normalizeGamesState(incoming);

  // Si una de las dos tiene una semana más reciente, esa toma precedencia
  if (normIncoming.leaderboard.weekKey > normBase.leaderboard.weekKey) {
    return normIncoming;
  }
  if (normBase.leaderboard.weekKey > normIncoming.leaderboard.weekKey) {
    return normBase;
  }

  // Misma semana: combinamos puntuaciones de manera consistente
  const mergedBreakdown: GameScoreBreakdown = {
    tictactoe: mergeScoreItem(normBase.leaderboard.breakdown.tictactoe, normIncoming.leaderboard.breakdown.tictactoe),
    sudoku: mergeScoreItem(normBase.leaderboard.breakdown.sudoku, normIncoming.leaderboard.breakdown.sudoku),
    chess: mergeScoreItem(normBase.leaderboard.breakdown.chess, normIncoming.leaderboard.breakdown.chess),
    hangman: mergeScoreItem(normBase.leaderboard.breakdown.hangman, normIncoming.leaderboard.breakdown.hangman),
    battleship: mergeScoreItem(normBase.leaderboard.breakdown.battleship, normIncoming.leaderboard.breakdown.battleship),
    drawguess: mergeScoreItem(normBase.leaderboard.breakdown.drawguess, normIncoming.leaderboard.breakdown.drawguess),
    domino: mergeScoreItem(normBase.leaderboard.breakdown.domino, normIncoming.leaderboard.breakdown.domino),
    uno: mergeScoreItem(normBase.leaderboard.breakdown.uno, normIncoming.leaderboard.breakdown.uno),
  };

  const pickFresher = <T extends { version?: number; updatedAt?: number | string }>(
    baseVal: T,
    incVal: T
  ): boolean => {
    const bVer = typeof baseVal?.version === 'number' ? baseVal.version : 0;
    const iVer = typeof incVal?.version === 'number' ? incVal.version : 0;
    if (iVer !== bVer) return iVer > bVer;
    const bTs = typeof baseVal?.updatedAt === 'number' ? baseVal.updatedAt : 0;
    const iTs = typeof incVal?.updatedAt === 'number' ? incVal.updatedAt : 0;
    return iTs >= bTs;
  };

  return {
    ...normBase,
    ...normIncoming,
    leaderboard: {
      pointsKarla: Math.max(normBase.leaderboard.pointsKarla || 0, normIncoming.leaderboard.pointsKarla || 0),
      pointsJavier: Math.max(normBase.leaderboard.pointsJavier || 0, normIncoming.leaderboard.pointsJavier || 0),
      trophiesKarla: Math.max(normBase.leaderboard.trophiesKarla || 0, normIncoming.leaderboard.trophiesKarla || 0),
      trophiesJavier: Math.max(normBase.leaderboard.trophiesJavier || 0, normIncoming.leaderboard.trophiesJavier || 0),
      weekKey: normIncoming.leaderboard.weekKey,
      breakdown: mergedBreakdown,
      lastWeekSummary: normIncoming.leaderboard.lastWeekSummary || normBase.leaderboard.lastWeekSummary || null,
    },
    ticTacToe: (() => {
      const baseTtt = normBase.ticTacToe;
      const incTtt = normIncoming.ticTacToe;
      let active = incTtt;
      if ((incTtt.round || 1) !== (baseTtt.round || 1)) {
        active = (incTtt.round || 1) > (baseTtt.round || 1) ? incTtt : baseTtt;
      } else {
        const bVer = typeof baseTtt.version === 'number' ? baseTtt.version : 0;
        const iVer = typeof incTtt.version === 'number' ? incTtt.version : 0;
        if (iVer !== bVer) {
          active = iVer > bVer ? incTtt : baseTtt;
        } else {
          const bTs = typeof baseTtt.updatedAt === 'number' ? baseTtt.updatedAt : 0;
          const iTs = typeof incTtt.updatedAt === 'number' ? incTtt.updatedAt : 0;
          if (iTs !== bTs) {
            active = iTs > bTs ? incTtt : baseTtt;
          } else {
            const bMoves = (baseTtt.board || []).filter(Boolean).length;
            const iMoves = (incTtt.board || []).filter(Boolean).length;
            active = iMoves >= bMoves ? incTtt : baseTtt;
          }
        }
      }
      return {
        ...active,
        version: Math.max(baseTtt.version || 0, incTtt.version || 0),
        scoreKarla: Math.max(baseTtt.scoreKarla || 0, incTtt.scoreKarla || 0),
        scoreJavier: Math.max(baseTtt.scoreJavier || 0, incTtt.scoreJavier || 0),
      };
    })(),
    sudoku: (() => {
      const baseSud = normBase.sudoku;
      const incSud = normIncoming.sudoku;
      const bSess = baseSud.session || null;
      const iSess = incSud.session || null;
      let mergedSession = iSess || bSess || null;
      if (bSess && iSess) {
        if (bSess.sessionId !== iSess.sessionId) {
          mergedSession = pickFresher(bSess, iSess) ? iSess : bSess;
        } else {
          const useInc =
            (iSess.version || 0) !== (bSess.version || 0)
              ? (iSess.version || 0) > (bSess.version || 0)
              : (iSess.updatedAt || 0) !== (bSess.updatedAt || 0)
              ? (iSess.updatedAt || 0) > (bSess.updatedAt || 0)
              : iSess.completed ||
                iSess.board.flat().filter((n) => n !== 0).length >=
                  bSess.board.flat().filter((n) => n !== 0).length;
          mergedSession = useInc ? iSess : bSess;
        }
      }
      return {
        bestScoreKarla: Math.max(baseSud.bestScoreKarla || 0, incSud.bestScoreKarla || 0),
        bestScoreJavier: Math.max(baseSud.bestScoreJavier || 0, incSud.bestScoreJavier || 0),
        completedCount: Math.max(baseSud.completedCount || 0, incSud.completedCount || 0),
        session: mergedSession,
      };
    })(),
    chess: (() => {
      const baseCh = normBase.chess;
      const incCh = normIncoming.chess;
      const sameMatch = (baseCh.matchId || '') === (incCh.matchId || '');
      let active = incCh;
      if (!sameMatch) {
        active = pickFresher(baseCh, incCh) ? incCh : baseCh;
      } else {
        const bVer = typeof baseCh.version === 'number' ? baseCh.version : 0;
        const iVer = typeof incCh.version === 'number' ? incCh.version : 0;
        if (iVer !== bVer) {
          active = iVer > bVer ? incCh : baseCh;
        } else {
          const bTs = typeof baseCh.updatedAt === 'number' ? baseCh.updatedAt : 0;
          const iTs = typeof incCh.updatedAt === 'number' ? incCh.updatedAt : 0;
          if (iTs !== bTs) {
            active = iTs > bTs ? incCh : baseCh;
          } else {
            const bHist = baseCh.moveHistory?.length || 0;
            const iHist = incCh.moveHistory?.length || 0;
            active = iHist >= bHist ? incCh : baseCh;
          }
        }
      }
      return {
        ...active,
        version: Math.max(baseCh.version || 0, incCh.version || 0),
        winsKarla: Math.max(baseCh.winsKarla || 0, incCh.winsKarla || 0),
        winsJavier: Math.max(baseCh.winsJavier || 0, incCh.winsJavier || 0),
      };
    })(),
    hangman: (() => {
      const baseHm = normBase.hangman;
      const incHm = normIncoming.hangman;
      const sameRound = (baseHm.roundId || '') === (incHm.roundId || '');
      if (!sameRound) {
        const useInc = pickFresher(baseHm, incHm);
        const active = useInc ? incHm : baseHm;
        return {
          ...active,
          version: Math.max(baseHm.version || 0, incHm.version || 0),
          scoreKarla: Math.max(baseHm.scoreKarla || 0, incHm.scoreKarla || 0),
          scoreJavier: Math.max(baseHm.scoreJavier || 0, incHm.scoreJavier || 0),
        };
      }

      const useInc = pickFresher(baseHm, incHm);
      const active = useInc ? incHm : baseHm;
      const unionGuessed = Array.from(new Set([...(baseHm.guessed || []), ...(incHm.guessed || [])]));
      const wordUpper = (active.word || '').toUpperCase();
      const allRevealed =
        wordUpper.length > 0 && wordUpper.split('').every((ch) => ch === ' ' || unionGuessed.includes(ch));
      const wrongCount = unionGuessed.filter((l) => !wordUpper.includes(l)).length;
      const isWon = baseHm.status === 'won' || incHm.status === 'won' || allRevealed;
      const isLost = !isWon && (baseHm.status === 'lost' || incHm.status === 'lost' || wrongCount >= 6);
      const nextStatus: 'playing' | 'won' | 'lost' = isWon ? 'won' : isLost ? 'lost' : 'playing';

      return {
        ...active,
        guessed: unionGuessed,
        hintUsed: Boolean(baseHm.hintUsed || incHm.hintUsed),
        status: nextStatus,
        winner: isWon ? (active.winner || incHm.winner || baseHm.winner || null) : null,
        streak: nextStatus === 'lost' ? 0 : Math.max(baseHm.streak || 0, incHm.streak || 0),
        version: Math.max(baseHm.version || 0, incHm.version || 0),
        scoreKarla: Math.max(baseHm.scoreKarla || 0, incHm.scoreKarla || 0),
        scoreJavier: Math.max(baseHm.scoreJavier || 0, incHm.scoreJavier || 0),
      };
    })(),
    battleship: (() => {
      const baseBs = normBase.battleship;
      const incBs = normIncoming.battleship;

      const baseMatchId = baseBs.matchId || '';
      const incMatchId = incBs.matchId || '';
      // Si pertenecen a partidas distintas (nuevo matchId), NUNCA mezclar ganador ni disparos de la partida previa
      if ((baseMatchId || incMatchId) && baseMatchId !== incMatchId) {
        const useInc = pickFresher(baseBs, incBs);
        const active = useInc ? incBs : baseBs;
        return {
          ...active,
          version: Math.max(baseBs.version || 0, incBs.version || 0),
          winsKarla: Math.max(baseBs.winsKarla || 0, incBs.winsKarla || 0),
          winsJavier: Math.max(baseBs.winsJavier || 0, incBs.winsJavier || 0),
        };
      }

      const isPhaseEarly = (p: string) => p === 'setup' || p === 'invited' || p === 'idle';
      const isPhaseLate = (p: string) => p === 'finished' || p === 'battle';

      // Protección contra paquetes viejos de una partida terminada cuando ya se reinició la sala
      if (isPhaseEarly(baseBs.phase) && isPhaseLate(incBs.phase)) {
        if ((baseBs.updatedAt || 0) > (incBs.updatedAt || 0) || (baseBs.version || 0) > (incBs.version || 0)) {
          return {
            ...baseBs,
            winsKarla: Math.max(baseBs.winsKarla || 0, incBs.winsKarla || 0),
            winsJavier: Math.max(baseBs.winsJavier || 0, incBs.winsJavier || 0),
          };
        }
      }

      // Si se está reiniciando explícitamente a setup/idle
      const isReset = isPhaseEarly(incBs.phase) && isPhaseLate(baseBs.phase);
      const isNewGame = isPhaseEarly(incBs.phase);

      // Ready flags: respetar cambios explícitos del jugador que emite (confirmar o desbloquear "Modificar Flota")
      // sin sobrescribir el estado de listo del otro jugador
      const readyK = isReset
        ? incBs.readyKarla
        : incBs.lastUpdatedBy === 'Karla'
        ? incBs.readyKarla
        : (baseBs.readyKarla || incBs.readyKarla);
      const readyJ = isReset
        ? incBs.readyJavier
        : incBs.lastUpdatedBy === 'Javier'
        ? incBs.readyJavier
        : (baseBs.readyJavier || incBs.readyJavier);
      const bothReady = readyK && readyJ;

      // Flota de Karla: preservar la confirmada si ya está lista
      const fleetK = isReset
        ? (incBs.fleetKarla || baseBs.fleetKarla)
        : (incBs.readyKarla && Array.isArray(incBs.fleetKarla) && incBs.fleetKarla.length === 5)
        ? incBs.fleetKarla
        : (baseBs.readyKarla && Array.isArray(baseBs.fleetKarla) && baseBs.fleetKarla.length === 5)
        ? baseBs.fleetKarla
        : (Array.isArray(incBs.fleetKarla) && incBs.fleetKarla.length === 5)
        ? incBs.fleetKarla
        : baseBs.fleetKarla;

      // Flota de Javier: preservar la confirmada si ya está lista
      const fleetJ = isReset
        ? (incBs.fleetJavier || baseBs.fleetJavier)
        : (incBs.readyJavier && Array.isArray(incBs.fleetJavier) && incBs.fleetJavier.length === 5)
        ? incBs.fleetJavier
        : (baseBs.readyJavier && Array.isArray(baseBs.fleetJavier) && baseBs.fleetJavier.length === 5)
        ? baseBs.fleetJavier
        : (Array.isArray(incBs.fleetJavier) && incBs.fleetJavier.length === 5)
        ? incBs.fleetJavier
        : baseBs.fleetJavier;

      // Disparos acumulativos sin duplicados (ningún tiro confirmado se pierde)
      const shotsK = isNewGame
        ? (incBs.shotsByKarla || [])
        : Array.from(new Set([...(baseBs.shotsByKarla || []), ...(incBs.shotsByKarla || [])]));
      const shotsJ = isNewGame
        ? (incBs.shotsByJavier || [])
        : Array.from(new Set([...(baseBs.shotsByJavier || []), ...(incBs.shotsByJavier || [])]));

      let phase = incBs.phase;
      if (!isNewGame && (incBs.winner || baseBs.winner)) {
        phase = 'finished';
      } else if (!isNewGame && (bothReady || incBs.phase === 'battle' || baseBs.phase === 'battle')) {
        phase = 'battle';
      }

      const baseTotalShots = (baseBs.shotsByKarla?.length || 0) + (baseBs.shotsByJavier?.length || 0);
      const incTotalShots = (incBs.shotsByKarla?.length || 0) + (incBs.shotsByJavier?.length || 0);
      const lastShot = isNewGame
        ? null
        : incTotalShots >= baseTotalShots
        ? incBs.lastShot || baseBs.lastShot
        : baseBs.lastShot || incBs.lastShot;

      const turn = isNewGame ? incBs.turn : (incTotalShots >= baseTotalShots ? incBs.turn : baseBs.turn);

      return {
        ...baseBs,
        ...incBs,
        version: Math.max(baseBs.version || 0, incBs.version || 0),
        phase,
        readyKarla: readyK,
        readyJavier: readyJ,
        fleetKarla: fleetK,
        fleetJavier: fleetJ,
        shotsByKarla: shotsK,
        shotsByJavier: shotsJ,
        turn,
        lastShot,
        winner: isNewGame ? null : (incBs.winner || baseBs.winner || null),
        winsKarla: Math.max(baseBs.winsKarla || 0, incBs.winsKarla || 0),
        winsJavier: Math.max(baseBs.winsJavier || 0, incBs.winsJavier || 0),
      };
    })(),
    drawGuess: (() => {
      const baseDg = normBase.drawGuess || DEFAULT_GAMES_STATE.drawGuess;
      const incDg = normIncoming.drawGuess || DEFAULT_GAMES_STATE.drawGuess;

      const baseVer = typeof baseDg.version === 'number' ? baseDg.version : 0;
      const incVer = typeof incDg.version === 'number' ? incDg.version : 0;
      const baseTs = typeof baseDg.updatedAt === 'number' ? baseDg.updatedAt : 0;
      const incTs = typeof incDg.updatedAt === 'number' ? incDg.updatedAt : 0;

      const isIncomingFresher =
        incVer !== baseVer
          ? incVer > baseVer
          : incTs > baseTs ||
            (incTs === baseTs && (
              (incDg.currentRound || 1) > (baseDg.currentRound || 1) ||
              (incDg.roundsHistory?.length || 0) > (baseDg.roundsHistory?.length || 0) ||
              (incDg.strokes?.length || 0) !== (baseDg.strokes?.length || 0) ||
              incDg.phase !== baseDg.phase
            ));

      const activeState = isIncomingFresher ? incDg : baseDg;
      const otherState = isIncomingFresher ? baseDg : incDg;

      const activePhase = activeState.phase || 'idle';
      const shouldKeepActiveStrokes = activePhase === 'drawing' || activePhase === 'round_end';

      // En una misma ronda de dibujo, un intento del adivinador jamás debe borrar los trazos del dibujante
      const isSameDrawingRound =
        (baseDg.currentRound || 1) === (incDg.currentRound || 1) &&
        baseDg.phase === 'drawing' &&
        incDg.phase === 'drawing';

      let resolvedStrokes = shouldKeepActiveStrokes ? (activeState.strokes || []) : [];
      let resolvedStrokesTs = activeState.strokesUpdatedAt || 0;
      if (isSameDrawingRound) {
        const bStrokeTs = typeof baseDg.strokesUpdatedAt === 'number' ? baseDg.strokesUpdatedAt : 0;
        const iStrokeTs = typeof incDg.strokesUpdatedAt === 'number' ? incDg.strokesUpdatedAt : 0;
        if (bStrokeTs !== iStrokeTs) {
          const strokeOwner = iStrokeTs > bStrokeTs ? incDg : baseDg;
          resolvedStrokes = strokeOwner.strokes || [];
          resolvedStrokesTs = strokeOwner.strokesUpdatedAt || 0;
        } else if ((baseDg.strokes?.length || 0) > 0 && (incDg.strokes?.length || 0) === 0) {
          resolvedStrokes = baseDg.strokes || [];
        } else if ((incDg.strokes?.length || 0) > 0 && (baseDg.strokes?.length || 0) === 0) {
          resolvedStrokes = incDg.strokes || [];
        }
      }

      return {
        ...otherState,
        ...activeState,
        version: Math.max(baseVer, incVer),
        strokes: resolvedStrokes,
        strokesUpdatedAt: resolvedStrokesTs,
        attempts: activeState.attempts || [],
        roundsHistory: (activeState.roundsHistory || []).slice(-6).map((r) => ({ ...r, strokes: [] })),
        winsKarla: Math.max(baseDg.winsKarla || 0, incDg.winsKarla || 0),
        winsJavier: Math.max(baseDg.winsJavier || 0, incDg.winsJavier || 0),
        scoreKarla: Math.max(baseDg.scoreKarla || 0, incDg.scoreKarla || 0),
        scoreJavier: Math.max(baseDg.scoreJavier || 0, incDg.scoreJavier || 0),
      };
    })(),
    domino: (() => {
      const baseDom = normBase.domino || DEFAULT_GAMES_STATE.domino;
      const incDom = normIncoming.domino || DEFAULT_GAMES_STATE.domino;
      const baseVer = typeof baseDom.version === 'number' ? baseDom.version : 0;
      const incVer = typeof incDom.version === 'number' ? incDom.version : 0;
      const baseTs = typeof baseDom.updatedAt === 'number' ? baseDom.updatedAt : 0;
      const incTs = typeof incDom.updatedAt === 'number' ? incDom.updatedAt : 0;
      const isIncomingFresher = incVer !== baseVer ? incVer > baseVer : incTs >= baseTs;
      const active = isIncomingFresher ? incDom : baseDom;
      return {
        ...active,
        version: Math.max(baseVer, incVer),
        winsKarla: Math.max(baseDom.winsKarla || 0, incDom.winsKarla || 0),
        winsJavier: Math.max(baseDom.winsJavier || 0, incDom.winsJavier || 0),
        scoreKarla: Math.max(baseDom.scoreKarla || 0, incDom.scoreKarla || 0),
        scoreJavier: Math.max(baseDom.scoreJavier || 0, incDom.scoreJavier || 0),
      };
    })(),
    uno: (() => {
      const baseUno = normBase.uno || DEFAULT_GAMES_STATE.uno;
      const incUno = normIncoming.uno || DEFAULT_GAMES_STATE.uno;
      const baseVer = typeof baseUno.version === 'number' ? baseUno.version : 0;
      const incVer = typeof incUno.version === 'number' ? incUno.version : 0;
      const baseTs = typeof baseUno.updatedAt === 'number' ? baseUno.updatedAt : 0;
      const incTs = typeof incUno.updatedAt === 'number' ? incUno.updatedAt : 0;
      const isIncomingFresher = incVer !== baseVer ? incVer > baseVer : incTs >= baseTs;
      const active = isIncomingFresher ? incUno : baseUno;
      return {
        ...active,
        version: Math.max(baseVer, incVer),
        winsKarla: Math.max(baseUno.winsKarla || 0, incUno.winsKarla || 0),
        winsJavier: Math.max(baseUno.winsJavier || 0, incUno.winsJavier || 0),
        scoreKarla: Math.max(baseUno.scoreKarla || 0, incUno.scoreKarla || 0),
        scoreJavier: Math.max(baseUno.scoreJavier || 0, incUno.scoreJavier || 0),
      };
    })(),
  };
}

function normalizeMoviesState(state: MoviesAndPlansState): MoviesAndPlansState {
  const movies = Array.isArray(state.movies)
    ? state.movies.map((m) => ({
        ...m,
        title: sanitizeInput(m.title || '', 120),
        genre: stripLegacyEmoji(m.genre || 'Otro') || 'Otro',
        notes: m.notes ? sanitizeInput(m.notes, 300) : undefined,
      }))
    : DEFAULT_MOVIES_STATE.movies;

  const bucketList = Array.isArray(state.bucketList)
    ? state.bucketList.map((b) => ({
        ...b,
        title: stripLegacyEmoji(sanitizeInput(b.title || '', 160)),
      }))
    : DEFAULT_MOVIES_STATE.bucketList;

  const foodOptions = Array.isArray(state.foodOptions)
    ? state.foodOptions.map((f) => stripLegacyEmoji(sanitizeInput(f, 80))).filter(Boolean)
    : DEFAULT_MOVIES_STATE.foodOptions;

  return {
    movies,
    bucketList,
    foodOptions: foodOptions.length > 0 ? foodOptions : DEFAULT_MOVIES_STATE.foodOptions,
    deletedIds: Array.isArray(state.deletedIds) ? state.deletedIds : [],
  };
}

// Sellado de información oculta (manos y mazos) para que los payloads de red no viajen en texto plano
const SEAL_KEY = 'KMRG_COUPLE_VAULT_2026';

export function sealHiddenData<T>(data: T): string {
  try {
    const json = JSON.stringify(data);
    let out = '';
    for (let i = 0; i < json.length; i++) {
      const code = json.charCodeAt(i) ^ SEAL_KEY.charCodeAt(i % SEAL_KEY.length);
      out += code.toString(16).padStart(4, '0');
    }
    return `kmrg_sealed:${out}`;
  } catch {
    return '';
  }
}

export function unsealHiddenData<T>(raw: unknown, fallback: T): T {
  if (Array.isArray(raw)) return raw as unknown as T;
  if (typeof raw === 'string' && raw.startsWith('kmrg_sealed:')) {
    try {
      const hex = raw.slice('kmrg_sealed:'.length);
      let json = '';
      for (let i = 0; i < hex.length; i += 4) {
        const code = parseInt(hex.slice(i, i + 4), 16) ^ SEAL_KEY.charCodeAt((i / 4) % SEAL_KEY.length);
        json += String.fromCharCode(code);
      }
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function sealGamesPayloadForNetwork(state: GamesState): Record<string, unknown> {
  const copy: any = { ...state };
  if (state.domino) {
    copy.domino = {
      ...state.domino,
      handKarla: sealHiddenData(state.domino.handKarla),
      handJavier: sealHiddenData(state.domino.handJavier),
      boneyard: sealHiddenData(state.domino.boneyard),
    };
  }
  if (state.uno) {
    copy.uno = {
      ...state.uno,
      deck: sealHiddenData(state.uno.deck),
      handKarla: sealHiddenData(state.uno.handKarla),
      handJavier: sealHiddenData(state.uno.handJavier),
    };
  }
  return copy;
}

function normalizeGamesState(state: GamesState): GamesState {
  const currentWeek = getWeeklyResetKey();
  const rawLb = (state && state.leaderboard) || DEFAULT_GAMES_STATE.leaderboard;
  const isExpiredWeek = Boolean(rawLb.weekKey && rawLb.weekKey !== currentWeek);

  let normalizedLb: GamesLeaderboard;
  let resetGamesForNewWeek = false;

  if (isExpiredWeek) {
    // La semana terminó -> Archivar resumen del ganador semanal y reiniciar para el nuevo torneo semanal
    resetGamesForNewWeek = true;
    const prevWinner: UserProfile | 'Empate' =
      (rawLb.pointsKarla || 0) > (rawLb.pointsJavier || 0)
        ? 'Karla'
        : (rawLb.pointsJavier || 0) > (rawLb.pointsKarla || 0)
        ? 'Javier'
        : 'Empate';

    normalizedLb = {
      pointsKarla: 0,
      pointsJavier: 0,
      trophiesKarla: 0,
      trophiesJavier: 0,
      weekKey: currentWeek,
      breakdown: createDefaultBreakdown(),
      lastWeekSummary: {
        weekKey: rawLb.weekKey,
        winner: prevWinner,
        pointsKarla: rawLb.pointsKarla || 0,
        pointsJavier: rawLb.pointsJavier || 0,
        trophiesKarla: rawLb.trophiesKarla || 0,
        trophiesJavier: rawLb.trophiesJavier || 0,
      },
    };
  } else {
    // Misma semana o primera inicialización
    const rawBreakdown = rawLb.breakdown || ({} as Partial<GameScoreBreakdown>);

    const tttWinsK = state?.ticTacToe?.scoreKarla || 0;
    const tttWinsJ = state?.ticTacToe?.scoreJavier || 0;
    const sudokuDone = state?.sudoku?.completedCount || 0;
    const chessWinsK = state?.chess?.winsKarla || 0;
    const chessWinsJ = state?.chess?.winsJavier || 0;
    const hangmanWinsK = state?.hangman?.scoreKarla || 0;
    const hangmanWinsJ = state?.hangman?.scoreJavier || 0;
    const bsWinsK = state?.battleship?.winsKarla || 0;
    const bsWinsJ = state?.battleship?.winsJavier || 0;

    const breakdown: GameScoreBreakdown = {
      tictactoe: rawBreakdown.tictactoe || {
        winsKarla: tttWinsK,
        winsJavier: tttWinsJ,
        pointsKarla: tttWinsK * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: tttWinsJ * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: tttWinsK * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: tttWinsJ * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      sudoku: rawBreakdown.sudoku || {
        winsKarla: sudokuDone,
        winsJavier: sudokuDone,
        pointsKarla: sudokuDone * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: sudokuDone * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: sudokuDone * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: sudokuDone * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      chess: rawBreakdown.chess || {
        winsKarla: chessWinsK,
        winsJavier: chessWinsJ,
        pointsKarla: chessWinsK * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: chessWinsJ * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: chessWinsK * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: chessWinsJ * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      hangman: rawBreakdown.hangman || {
        winsKarla: hangmanWinsK,
        winsJavier: hangmanWinsJ,
        pointsKarla: hangmanWinsK * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: hangmanWinsJ * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: hangmanWinsK * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: hangmanWinsJ * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      battleship: rawBreakdown.battleship || {
        winsKarla: bsWinsK,
        winsJavier: bsWinsJ,
        pointsKarla: bsWinsK * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: bsWinsJ * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: bsWinsK * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: bsWinsJ * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      drawguess: rawBreakdown.drawguess || {
        winsKarla: state?.drawGuess?.winsKarla || 0,
        winsJavier: state?.drawGuess?.winsJavier || 0,
        pointsKarla: state?.drawGuess?.scoreKarla || 0,
        pointsJavier: state?.drawGuess?.scoreJavier || 0,
        trophiesKarla: (state?.drawGuess?.winsKarla || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: (state?.drawGuess?.winsJavier || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      domino: rawBreakdown.domino || {
        winsKarla: state?.domino?.winsKarla || 0,
        winsJavier: state?.domino?.winsJavier || 0,
        pointsKarla: (state?.domino?.winsKarla || 0) * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: (state?.domino?.winsJavier || 0) * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: (state?.domino?.winsKarla || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: (state?.domino?.winsJavier || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
      uno: rawBreakdown.uno || {
        winsKarla: state?.uno?.winsKarla || 0,
        winsJavier: state?.uno?.winsJavier || 0,
        pointsKarla: (state?.uno?.winsKarla || 0) * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        pointsJavier: (state?.uno?.winsJavier || 0) * UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        trophiesKarla: (state?.uno?.winsKarla || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        trophiesJavier: (state?.uno?.winsJavier || 0) * UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
      },
    };

    normalizedLb = {
      pointsKarla: typeof rawLb.pointsKarla === 'number' ? rawLb.pointsKarla : 0,
      pointsJavier: typeof rawLb.pointsJavier === 'number' ? rawLb.pointsJavier : 0,
      trophiesKarla: typeof rawLb.trophiesKarla === 'number' ? rawLb.trophiesKarla : 0,
      trophiesJavier: typeof rawLb.trophiesJavier === 'number' ? rawLb.trophiesJavier : 0,
      weekKey: currentWeek,
      breakdown,
      lastWeekSummary: rawLb.lastWeekSummary || null,
    };
  }

  const baseTtt = state?.ticTacToe || DEFAULT_GAMES_STATE.ticTacToe;
  const baseSudoku = state?.sudoku || DEFAULT_GAMES_STATE.sudoku;
  const baseHangman = state?.hangman || DEFAULT_GAMES_STATE.hangman;
  const baseChess = state?.chess || DEFAULT_GAMES_STATE.chess;
  const baseBs = state?.battleship || DEFAULT_GAMES_STATE.battleship;

  return {
    leaderboard: normalizedLb,
    ticTacToe: {
      ...DEFAULT_GAMES_STATE.ticTacToe,
      ...baseTtt,
      scoreKarla: resetGamesForNewWeek ? 0 : baseTtt.scoreKarla || 0,
      scoreJavier: resetGamesForNewWeek ? 0 : baseTtt.scoreJavier || 0,
      round: resetGamesForNewWeek ? 1 : baseTtt.round || 1,
    },
    sudoku: {
      ...DEFAULT_GAMES_STATE.sudoku,
      ...baseSudoku,
      completedCount: resetGamesForNewWeek ? 0 : baseSudoku.completedCount || 0,
      bestScoreKarla: resetGamesForNewWeek ? 0 : baseSudoku.bestScoreKarla || 0,
      bestScoreJavier: resetGamesForNewWeek ? 0 : baseSudoku.bestScoreJavier || 0,
      session:
        baseSudoku.session &&
        Array.isArray(baseSudoku.session.board) &&
        baseSudoku.session.board.length === 9 &&
        Array.isArray(baseSudoku.session.solution) &&
        baseSudoku.session.solution.length === 9
          ? baseSudoku.session
          : null,
    },
    hangman: {
      ...DEFAULT_GAMES_STATE.hangman,
      ...baseHangman,
      scoreKarla: resetGamesForNewWeek ? 0 : baseHangman.scoreKarla || 0,
      scoreJavier: resetGamesForNewWeek ? 0 : baseHangman.scoreJavier || 0,
      streak: resetGamesForNewWeek ? 0 : baseHangman.streak || 0,
      hint: stripLegacyEmoji(baseHangman?.hint || DEFAULT_GAMES_STATE.hangman.hint),
      category: stripLegacyEmoji(baseHangman?.category || DEFAULT_GAMES_STATE.hangman.category),
    },
    chess: {
      ...DEFAULT_GAMES_STATE.chess,
      ...baseChess,
      winsKarla: resetGamesForNewWeek ? 0 : baseChess.winsKarla || 0,
      winsJavier: resetGamesForNewWeek ? 0 : baseChess.winsJavier || 0,
    },
    battleship: {
      ...DEFAULT_GAMES_STATE.battleship,
      ...baseBs,
      winsKarla: resetGamesForNewWeek ? 0 : baseBs.winsKarla || 0,
      winsJavier: resetGamesForNewWeek ? 0 : baseBs.winsJavier || 0,
      phase: baseBs?.phase || 'idle',
      fleetKarla:
        Array.isArray(baseBs?.fleetKarla) &&
        baseBs.fleetKarla.length === 5 &&
        baseBs.fleetKarla[0]?.size === 5
          ? baseBs.fleetKarla
          : DEFAULT_GAMES_STATE.battleship.fleetKarla,
      fleetJavier:
        Array.isArray(baseBs?.fleetJavier) &&
        baseBs.fleetJavier.length === 5 &&
        baseBs.fleetJavier[0]?.size === 5
          ? baseBs.fleetJavier
          : DEFAULT_GAMES_STATE.battleship.fleetJavier,
      shotsByKarla: Array.isArray(baseBs?.shotsByKarla) ? baseBs.shotsByKarla : [],
      shotsByJavier: Array.isArray(baseBs?.shotsByJavier) ? baseBs.shotsByJavier : [],
    },
    drawGuess: {
      ...DEFAULT_GAMES_STATE.drawGuess,
      ...(state?.drawGuess || {}),
      phase: state?.drawGuess?.phase || 'idle',
      drawer: state?.drawGuess?.drawer || 'Karla',
      guesser: state?.drawGuess?.guesser || 'Javier',
      strokes:
        state?.drawGuess?.phase === 'drawing' || state?.drawGuess?.phase === 'round_end'
          ? state?.drawGuess?.strokes || []
          : [],
      roundsHistory: Array.isArray(state?.drawGuess?.roundsHistory)
        ? state.drawGuess.roundsHistory.slice(-6).map((r) => ({ ...r, strokes: [] }))
        : [],
      winsKarla: resetGamesForNewWeek ? 0 : state?.drawGuess?.winsKarla || 0,
      winsJavier: resetGamesForNewWeek ? 0 : state?.drawGuess?.winsJavier || 0,
    },
    domino: {
      ...DEFAULT_GAMES_STATE.domino,
      ...(state?.domino || {}),
      handKarla: unsealHiddenData(state?.domino?.handKarla, DEFAULT_GAMES_STATE.domino.handKarla),
      handJavier: unsealHiddenData(state?.domino?.handJavier, DEFAULT_GAMES_STATE.domino.handJavier),
      boneyard: unsealHiddenData(state?.domino?.boneyard, DEFAULT_GAMES_STATE.domino.boneyard),
      winsKarla: resetGamesForNewWeek ? 0 : state?.domino?.winsKarla || 0,
      winsJavier: resetGamesForNewWeek ? 0 : state?.domino?.winsJavier || 0,
      scoreKarla: resetGamesForNewWeek ? 0 : state?.domino?.scoreKarla || 0,
      scoreJavier: resetGamesForNewWeek ? 0 : state?.domino?.scoreJavier || 0,
    },
    uno: {
      ...DEFAULT_GAMES_STATE.uno,
      ...(state?.uno || {}),
      deck: unsealHiddenData(state?.uno?.deck, DEFAULT_GAMES_STATE.uno.deck),
      handKarla: unsealHiddenData(state?.uno?.handKarla, DEFAULT_GAMES_STATE.uno.handKarla),
      handJavier: unsealHiddenData(state?.uno?.handJavier, DEFAULT_GAMES_STATE.uno.handJavier),
      winsKarla: resetGamesForNewWeek ? 0 : state?.uno?.winsKarla || 0,
      winsJavier: resetGamesForNewWeek ? 0 : state?.uno?.winsJavier || 0,
      scoreKarla: resetGamesForNewWeek ? 0 : state?.uno?.scoreKarla || 0,
      scoreJavier: resetGamesForNewWeek ? 0 : state?.uno?.scoreJavier || 0,
    },
  };
}

export interface SpecialPlacesState {
  places: SpecialPlace[];
  deletedIds?: string[];
}

export const DEFAULT_PLACES_STATE: SpecialPlacesState = {
  places: DEFAULT_SPECIAL_PLACES,
};

function normalizePlacesState(state: SpecialPlacesState): SpecialPlacesState {
  const places = Array.isArray(state?.places)
    ? state.places.map((p) => ({
        ...p,
        title: sanitizeInput(p.title || 'Lugar Especial', 100),
        address: sanitizeInput(p.address || '', 160),
        notes: sanitizeInput(p.notes || '', 300),
      }))
    : DEFAULT_SPECIAL_PLACES;

  return { places, deletedIds: Array.isArray(state?.deletedIds) ? state.deletedIds : [] };
}

const lastSyncFetchMs = new Map<string, number>();
const inFlightSyncPromises = new Map<string, Promise<any>>();
const STATE_FETCH_COOLDOWN_MS = 15_000;

async function fetchLatestSyncedState<T>(
  syncType: string,
  localKey: string,
  defaultValue: T,
  normalizer?: (val: T) => T,
  merger?: (localVal: T, remoteVal: T) => T,
  forceRefresh: boolean = false
): Promise<T> {
  // Deduplicar peticiones simultáneas del mismo syncType al arrancar la app
  const existingPromise = !forceRefresh ? inFlightSyncPromises.get(syncType) : undefined;
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const runFetch = async (): Promise<T> => {
    const applyNormalize = (val: T): T => (normalizer ? normalizer(val) : val);

    let localCached: T | null = null;
    try {
      let raw = await AsyncStorage.getItem(localKey);

      // Migración automática de claves legadas/anteriores para evitar pérdida de datos en actualizaciones
      if (!raw) {
        const legacyCandidates = [
          localKey.replace('_v2', '_v1'),
          localKey.replace('_v2', ''),
          localKey.replace('_v1', ''),
        ];
        for (const leg of legacyCandidates) {
          if (leg !== localKey) {
            const legRaw = await AsyncStorage.getItem(leg);
            if (legRaw) {
              raw = legRaw;
              // Escribir en la clave actual para futuras lecturas rápidas
              await AsyncStorage.setItem(localKey, legRaw);
              break;
            }
          }
        }
      }

      if (raw) {
        localCached = applyNormalize({ ...defaultValue, ...(JSON.parse(raw) as T) });
      }
    } catch {
      // Ignorar error de lectura local
    }

    const lastFetch = lastSyncFetchMs.get(syncType) || 0;
    if (!forceRefresh && localCached && Date.now() - lastFetch < STATE_FETCH_COOLDOWN_MS) {
      return localCached;
    }

    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('payload, created_at')
        .eq('type', syncType)
        .order('created_at', { ascending: false })
        .limit(2);

      if (!error && data && data.length > 0) {
        lastSyncFetchMs.set(syncType, Date.now());
        const validPayloads = data
          .filter((row: any) => row && row.payload && typeof row.payload === 'object')
          .map((row: any) => applyNormalize({ ...defaultValue, ...(row.payload as T) }))
          .reverse(); // Ordenar del más antiguo al más reciente para preservar historial

        if (validPayloads.length > 0) {
          let remoteMerged = validPayloads[0];
          for (let i = 1; i < validPayloads.length; i++) {
            remoteMerged = merger
              ? merger(remoteMerged, validPayloads[i])
              : { ...remoteMerged, ...validPayloads[i] };
          }

          const finalState = localCached
            ? merger
              ? merger(localCached, remoteMerged)
              : { ...remoteMerged, ...localCached }
            : remoteMerged;
          await AsyncStorage.setItem(localKey, JSON.stringify(finalState));
          return finalState;
        }
      }
    } catch {
      // Usar caché local si no hay red
    }

    return localCached ?? applyNormalize(defaultValue);
  };

  const promise = runFetch().finally(() => {
    inFlightSyncPromises.delete(syncType);
  });
  inFlightSyncPromises.set(syncType, promise);
  return promise;
}

function collectArrayIds(obj: any): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const keys = ['loveReasons', 'voiceNotes', 'timeCapsules', 'movies', 'bucketList', 'places'];
  const ids: string[] = [];
  for (const k of keys) {
    if (Array.isArray(obj[k])) {
      for (const item of obj[k]) {
        if (item && typeof item.id === 'string') ids.push(item.id);
      }
    }
  }
  return ids;
}

const lastBroadcastSerialized = new Map<string, string>();

async function saveAndBroadcastState<T>(
  sender: UserProfile,
  syncType: string,
  localKey: string,
  newState: T,
  normalizer?: (val: T) => T,
  merger?: (baseVal: T, incVal: T) => T
): Promise<T> {
  let cleanState: any = normalizer ? normalizer(newState) : newState;
  let prevParsedState: any = null;

  try {
    const prevRaw = await AsyncStorage.getItem(localKey);
    if (prevRaw && cleanState && typeof cleanState === 'object') {
      const prevParsed = JSON.parse(prevRaw);
      prevParsedState = prevParsed;
      const isUninitializedDefault =
        syncType === 'sync_home_state' && cleanState.lastInteractionDate === '1970-01-01';
      const prevIds = collectArrayIds(prevParsed);
      const currentIds = new Set(collectArrayIds(cleanState));
      const newlyDeleted = isUninitializedDefault ? [] : prevIds.filter((id) => !currentIds.has(id));
      const existingDeleted: string[] = Array.isArray(cleanState.deletedIds)
        ? cleanState.deletedIds
        : Array.isArray(prevParsed?.deletedIds)
        ? prevParsed.deletedIds
        : [];
      if (newlyDeleted.length > 0 || existingDeleted.length > 0) {
        cleanState = {
          ...cleanState,
          deletedIds: Array.from(new Set([...existingDeleted, ...newlyDeleted])).slice(-200),
        };
      }
      if (merger) {
        cleanState = merger(prevParsed as T, cleanState as T);
      }
    }
    await AsyncStorage.setItem(localKey, JSON.stringify(cleanState));
    lastSyncFetchMs.set(syncType, Date.now());
  } catch {
    // Ignorar error local
  }

  // Disparar automáticamente notificación Push remota a la pareja si la acción lo amerita
  try {
    const { dispatchOutgoingSyncPushNotification } = require('./NotificationService');
    if (typeof dispatchOutgoingSyncPushNotification === 'function') {
      void dispatchOutgoingSyncPushNotification(sender, syncType, prevParsedState, cleanState);
    }
  } catch {
    // Ignorar si no está disponible en entorno de test
  }

  try {
    const networkPayload =
      syncType === 'sync_games_state'
        ? sealGamesPayloadForNetwork(cleanState as GamesState)
        : (cleanState as unknown as Record<string, unknown>);
    const serialized = JSON.stringify(networkPayload);
    if (lastBroadcastSerialized.get(syncType) === serialized) {
      return cleanState as T;
    }
    lastBroadcastSerialized.set(syncType, serialized);
    await supabase.from('interactions').insert([
      {
        sender,
        type: syncType,
        payload: networkPayload,
      },
    ]);
  } catch {
    // Guardado localmente
  }

  return cleanState as T;
}

export const getCachedHomeState = async (): Promise<HomeState> => {
  try {
    const raw = await AsyncStorage.getItem(HOME_STATE_KEY);
    if (raw) {
      return normalizeHomeState({ ...DEFAULT_HOME_STATE, ...(JSON.parse(raw) as HomeState) });
    }
  } catch {
    // Ignorar error de lectura local
  }
  return DEFAULT_HOME_STATE;
};

export const getHomeState = async (): Promise<HomeState> => {
  const synced = await fetchLatestSyncedState<HomeState>(
    'sync_home_state',
    HOME_STATE_KEY,
    DEFAULT_HOME_STATE,
    normalizeHomeState,
    mergeHomeStates
  );
  notifyHomeState(synced);
  return synced;
};

// Fuente única de verdad para el estado de Hoy (racha, mascota, perfiles): los listeners se notifican en cada guardado
const homeStateListeners = new Set<(s: HomeState) => void>();

export function subscribeHomeState(listener: (s: HomeState) => void): () => void {
  homeStateListeners.add(listener);
  return () => {
    homeStateListeners.delete(listener);
  };
}

export function notifyHomeState(state: HomeState): void {
  const clean = normalizeHomeState(state);
  homeStateListeners.forEach((l) => l(clean));
}

export async function applyIncomingRealtimeHomeState(
  incoming: Partial<HomeState>
): Promise<HomeState> {
  const cached = await getCachedHomeState();
  const merged = mergeHomeStates(
    cached,
    { ...DEFAULT_HOME_STATE, ...incoming } as HomeState
  );
  try {
    await AsyncStorage.setItem(HOME_STATE_KEY, JSON.stringify(merged));
    lastSyncFetchMs.set('sync_home_state', Date.now());
  } catch {}
  notifyHomeState(merged);
  return merged;
}

export async function applyIncomingRealtimePlacesState(
  currentPlaces: SpecialPlace[],
  incoming: Partial<SpecialPlacesState>
): Promise<SpecialPlacesState> {
  let base: SpecialPlacesState = { places: currentPlaces };
  try {
    const raw = await AsyncStorage.getItem(PLACES_STATE_KEY);
    if (raw) {
      base = normalizePlacesState({ ...DEFAULT_PLACES_STATE, ...(JSON.parse(raw) as SpecialPlacesState) });
    }
  } catch {}
  const merged = mergeSpecialPlaces(
    base,
    normalizePlacesState({ ...DEFAULT_PLACES_STATE, ...incoming } as SpecialPlacesState)
  );
  try {
    await AsyncStorage.setItem(PLACES_STATE_KEY, JSON.stringify(merged));
    lastSyncFetchMs.set('sync_places_state', Date.now());
  } catch {}
  return merged;
}

export const saveHomeState = async (sender: UserProfile, state: HomeState): Promise<void> => {
  notifyHomeState(state);
  const merged = await saveAndBroadcastState<HomeState>(
    sender,
    'sync_home_state',
    HOME_STATE_KEY,
    state,
    normalizeHomeState,
    mergeHomeStates
  );
  notifyHomeState(merged);
};

export const getMoviesState = (): Promise<MoviesAndPlansState> =>
  fetchLatestSyncedState<MoviesAndPlansState>(
    'sync_movies_state',
    MOVIES_STATE_KEY,
    DEFAULT_MOVIES_STATE,
    normalizeMoviesState,
    mergeMoviesStates
  );

export const saveMoviesState = async (
  sender: UserProfile,
  state: MoviesAndPlansState
): Promise<void> => {
  await saveAndBroadcastState<MoviesAndPlansState>(
    sender,
    'sync_movies_state',
    MOVIES_STATE_KEY,
    state,
    normalizeMoviesState,
    mergeMoviesStates
  );
};

export const getGamesState = (forceRefresh: boolean = false): Promise<GamesState> =>
  fetchLatestSyncedState<GamesState>(
    'sync_games_state',
    GAMES_STATE_KEY,
    DEFAULT_GAMES_STATE,
    normalizeGamesState,
    mergeGamesStates,
    forceRefresh
  );

export async function applyIncomingRealtimeGamesState(
  currentState: GamesState | null,
  incoming: Partial<GamesState>
): Promise<GamesState> {
  let base: GamesState = currentState ? normalizeGamesState(currentState) : DEFAULT_GAMES_STATE;
  try {
    const raw = await AsyncStorage.getItem(GAMES_STATE_KEY);
    if (raw) {
      const parsed = normalizeGamesState({ ...DEFAULT_GAMES_STATE, ...(JSON.parse(raw) as GamesState) });
      base = currentState ? mergeGamesStates(parsed, base) : parsed;
    }
  } catch {}
  const incomingNormalized = normalizeGamesState({
    ...DEFAULT_GAMES_STATE,
    ...incoming,
  } as GamesState);
  const merged = mergeGamesStates(base, incomingNormalized);
  try {
    await AsyncStorage.setItem(GAMES_STATE_KEY, JSON.stringify(merged));
    lastSyncFetchMs.set('sync_games_state', Date.now());
  } catch {}
  return merged;
}

export const saveGamesState = async (sender: UserProfile, state: GamesState): Promise<GamesState> => {
  return await saveAndBroadcastState<GamesState>(
    sender,
    'sync_games_state',
    GAMES_STATE_KEY,
    state,
    normalizeGamesState,
    mergeGamesStates
  );
};

export const getSpecialPlacesState = (): Promise<SpecialPlacesState> =>
  fetchLatestSyncedState<SpecialPlacesState>(
    'sync_places_state',
    PLACES_STATE_KEY,
    DEFAULT_PLACES_STATE,
    normalizePlacesState,
    mergeSpecialPlaces
  );

export const saveSpecialPlacesState = async (
  sender: UserProfile,
  state: SpecialPlacesState
): Promise<void> => {
  await saveAndBroadcastState<SpecialPlacesState>(
    sender,
    'sync_places_state',
    PLACES_STATE_KEY,
    state,
    normalizePlacesState,
    mergeSpecialPlaces
  );
};

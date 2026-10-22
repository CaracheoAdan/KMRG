import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import {
  HomeState,
  MoviesAndPlansState,
  SpecialPlace,
  UserProfile,
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
    id: 'place-1',
    title: 'Nuestra Primera Cita',
    category: 'Primera Vez',
    address: 'Centro Histórico, Ciudad de México',
    date: '2024-02-14',
    notes: 'El lugar donde comenzó nuestra historia y no dejamos de platicar ni un segundo.',
    rating: 5,
    latitude: 19.4326,
    longitude: -99.1332,
    mapX: 26,
    mapY: 36,
    addedBy: 'Javier',
    favorite: true,
  },
  {
    id: 'place-2',
    title: 'Cafetería de Tardes Lluviosas',
    category: 'Cafetería',
    address: 'Colonia Roma Norte',
    date: '2024-05-18',
    notes: 'Nuestro rincón favorito para pedir café caliente, postre y reírnos horas enteras.',
    rating: 5,
    latitude: 19.4194,
    longitude: -99.1625,
    mapX: 54,
    mapY: 58,
    addedBy: 'Karla',
    favorite: true,
  },
  {
    id: 'place-3',
    title: 'Mirador del Atardecer',
    category: 'Mirador',
    address: 'Parque La Mexicana, Santa Fe',
    date: '2024-08-22',
    notes: 'Vimos el cielo pintarse de tonos dorados y violetas mientras caminábamos de la mano.',
    rating: 5,
    latitude: 19.3574,
    longitude: -99.2689,
    mapX: 76,
    mapY: 28,
    addedBy: 'Javier',
    favorite: true,
  },
];

export const DEFAULT_HOME_STATE: HomeState = {
  anniversaryDate: '2024-02-14',
  nextEventTitle: 'Nuestra próxima cita especial',
  nextEventDate: toLocalDateString(new Date(Date.now() + 7 * 86400000)),
  streakCount: 1,
  lastInteractionDate: toLocalDateString(new Date()),
  moods: {
    Javier: {
      emoji: 'Enamorado/a',
      status: 'Pensando en mi flaquita hermosa',
      song: '',
      updatedAt: new Date().toISOString(),
    },
    Karla: {
      emoji: 'Feliz',
      status: 'Feliz y con ganas de verte mi amor',
      song: '',
      updatedAt: new Date().toISOString(),
    },
  },
  stickyNote: {
    author: 'Javier',
    text: '',
    updatedAt: new Date().toISOString(),
  },
  loveReasons: [],
  voiceNotes: [
    {
      id: 'vn-default-1',
      sender: 'Javier',
      title: 'Nota de voz para ti, mi amor',
      durationSeconds: 12,
      waveform: [0.3, 0.55, 0.8, 0.45, 0.9, 0.7, 0.95, 0.6, 0.4, 0.85, 0.65, 0.5, 0.75, 0.35],
      transcript: 'Te amo muchísimo Karlita, espero que tengas un día hermoso.',
      createdAt: new Date().toISOString(),
    },
  ],
  timeCapsules: [
    {
      id: 'tc-default-1',
      sender: 'Javier',
      recipient: 'Karla',
      title: 'Para Nuestro Próximo Aniversario',
      occasion: 'Aniversario',
      content:
        'Cada día a tu lado confirma que eres el amor de mi vida. Gracias por construir esta historia conmigo.',
      unlockDate: toLocalDateString(new Date(Date.now() + 14 * 86400000)),
      themeColor: '#9333ea',
      createdAt: new Date().toISOString(),
    },
  ],
  couplePet: {
    name: 'Pochito',
    happiness: 85,
    xp: 40,
    level: 1,
    heartsFedTotal: 2,
    lastFedAt: new Date().toISOString(),
    lastFedBy: 'Javier',
  },
  partnerProfiles: {
    Karla: {
      id: 'Karla',
      displayName: 'Karlita',
    },
    Javier: {
      id: 'Javier',
      displayName: 'Javier',
    },
  },
};

export const DEFAULT_MOVIES_STATE: MoviesAndPlansState = {
  movies: [
    {
      id: 'm1',
      title: 'Cuestión de Tiempo (About Time)',
      genre: 'Romance',
      addedBy: 'Javier',
      watched: false,
      year: '2013',
      director: 'Richard Curtis',
      posterUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Video118/v4/68/78/42/687842e9-9b4f-d314-9234-3a94eb48b63a/pr_source.lsr/600x900bb.jpg',
      synopsis:
        'Tim descubre que puede viajar en el tiempo y decide usar su don para conquistar a Mary y valorar cada día juntos.',
    },
    {
      id: 'm2',
      title: 'Your Name (Kimi no Na wa)',
      genre: 'Animación',
      addedBy: 'Karla',
      watched: false,
      year: '2016',
      director: 'Makoto Shinkai',
      posterUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Video128/v4/1c/3a/76/1c3a764c-e145-9328-7b5e-e784f9e536d8/pr_source.lsr/600x900bb.jpg',
      synopsis:
        'Dos jóvenes conectados por un hilo rojo del destino intercambian cuerpos a través del tiempo y buscan encontrarse.',
    },
    {
      id: 'm3',
      title: 'Diario de una Pasión (The Notebook)',
      genre: 'Romance',
      addedBy: 'Javier',
      watched: true,
      watchedDate: toLocalDateString(new Date()),
      ratingJavier: 5,
      ratingKarla: 5,
      notes: 'Nos encantó verla juntos.',
      year: '2004',
      director: 'Nick Cassavetes',
      posterUrl:
        'https://is1-ssl.mzstatic.com/image/thumb/Video124/v4/f3/7b/5c/f37b5c1c-91f2-1d68-a892-8a4a6bc94a31/pr_source.lsr/600x900bb.jpg',
    },
  ],
  bucketList: [
    {
      id: 'b1',
      title: 'Ver el atardecer juntos comiendo nuestro postre favorito',
      completed: false,
      addedBy: 'Javier',
    },
    {
      id: 'b2',
      title: 'Hacer un maratón de películas en pijama todo el domingo',
      completed: false,
      addedBy: 'Karla',
    },
    {
      id: 'b3',
      title: 'Viajar juntos a la playa',
      completed: false,
      addedBy: 'Javier',
    },
    {
      id: 'b4',
      title: 'Tener nuestra propia aplicación privada para nosotros dos',
      completed: true,
      completedDate: toLocalDateString(new Date()),
      addedBy: 'Javier',
    },
  ],
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
        if (occupied.has(idx)) {
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

export interface GamesState {
  leaderboard: {
    pointsKarla: number;
    pointsJavier: number;
    trophiesKarla: number;
    trophiesJavier: number;
  };
  ticTacToe: {
    board: Array<'Javier' | 'Karla' | null>;
    winningLine: number[] | null;
    turn: UserProfile;
    winner: UserProfile | 'Empate' | null;
    scoreJavier: number;
    scoreKarla: number;
    round: number;
  };
  sudoku: {
    bestScoreKarla: number;
    bestScoreJavier: number;
    completedCount: number;
  };
  hangman: {
    word: string;
    hint: string;
    category: string;
    author: string;
    isPartnerChallenge: boolean;
    guessed: string[];
    status: 'playing' | 'won' | 'lost';
    scoreJavier: number;
    scoreKarla: number;
    streak: number;
  };
  chess: {
    board: Array<Array<ChessPiece | null>>;
    turn: 'w' | 'b';
    capturedByW: string[];
    capturedByB: string[];
    lastMove: { from: [number, number]; to: [number, number] } | null;
    winner: 'w' | 'b' | null;
    winsKarla: number;
    winsJavier: number;
  };
  battleship: {
    phase: 'idle' | 'invited' | 'setup' | 'battle' | 'finished';
    invitedBy: UserProfile | null;
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
  };
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
  },
  ticTacToe: {
    board: Array(9).fill(null),
    winningLine: null,
    turn: 'Karla',
    winner: null,
    scoreJavier: 0,
    scoreKarla: 0,
    round: 1,
  },
  sudoku: {
    bestScoreKarla: 0,
    bestScoreJavier: 0,
    completedCount: 0,
  },
  hangman: {
    word: 'GUITARRA',
    hint: 'Instrumento musical de seis cuerdas con caja de resonancia',
    category: 'Objetos',
    author: 'Juego Normal',
    isPartnerChallenge: false,
    guessed: [],
    status: 'playing',
    scoreJavier: 0,
    scoreKarla: 0,
    streak: 0,
  },
  chess: {
    board: createInitialChessBoard(),
    turn: 'w',
    capturedByW: [],
    capturedByB: [],
    lastMove: null,
    winner: null,
    winsKarla: 0,
    winsJavier: 0,
  },
  battleship: {
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
    moods: {
      Javier: {
        ...DEFAULT_HOME_STATE.moods.Javier,
        ...(safeMoods.Javier || {}),
        status: sanitizeInput(safeMoods.Javier?.status || '', 120),
      },
      Karla: {
        ...DEFAULT_HOME_STATE.moods.Karla,
        ...(safeMoods.Karla || {}),
        status: sanitizeInput(safeMoods.Karla?.status || '', 120),
      },
    },
    voiceNotes: Array.isArray(state.voiceNotes)
      ? state.voiceNotes
      : DEFAULT_HOME_STATE.voiceNotes,
    timeCapsules: Array.isArray(state.timeCapsules)
      ? state.timeCapsules
      : DEFAULT_HOME_STATE.timeCapsules,
    couplePet: {
      ...DEFAULT_HOME_STATE.couplePet!,
      ...(state.couplePet || {}),
      name: sanitizeInput(state.couplePet?.name || 'Pochito', 24) || 'Pochito',
    },
    partnerProfiles: {
      Karla: {
        id: 'Karla',
        displayName:
          sanitizeInput(state.partnerProfiles?.Karla?.displayName || 'Karlita', 24) || 'Karlita',
        avatarUri: state.partnerProfiles?.Karla?.avatarUri || null,
      },
      Javier: {
        id: 'Javier',
        displayName:
          sanitizeInput(state.partnerProfiles?.Javier?.displayName || 'Javier', 24) || 'Javier',
        avatarUri: state.partnerProfiles?.Javier?.avatarUri || null,
      },
    },
  };
}

function mergeHomeStates(base: HomeState, incoming: HomeState): HomeState {
  const normBase = normalizeHomeState(base);
  const normIncoming = normalizeHomeState(incoming);

  const javierBaseTime = new Date(normBase.moods.Javier.updatedAt || 0).getTime();
  const javierIncTime = new Date(normIncoming.moods.Javier.updatedAt || 0).getTime();
  const karlaBaseTime = new Date(normBase.moods.Karla.updatedAt || 0).getTime();
  const karlaIncTime = new Date(normIncoming.moods.Karla.updatedAt || 0).getTime();

  return {
    ...normBase,
    ...normIncoming,
    streakCount: Math.max(normBase.streakCount || 1, normIncoming.streakCount || 1),
    moods: {
      Javier: javierIncTime >= javierBaseTime ? normIncoming.moods.Javier : normBase.moods.Javier,
      Karla: karlaIncTime >= karlaBaseTime ? normIncoming.moods.Karla : normBase.moods.Karla,
    },
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
  };
}

function normalizeGamesState(state: GamesState): GamesState {
  return {
    leaderboard: {
      ...DEFAULT_GAMES_STATE.leaderboard,
      ...(state.leaderboard || {}),
    },
    ticTacToe: {
      ...DEFAULT_GAMES_STATE.ticTacToe,
      ...(state.ticTacToe || {}),
    },
    sudoku: {
      ...DEFAULT_GAMES_STATE.sudoku,
      ...(state.sudoku || {}),
    },
    hangman: {
      ...DEFAULT_GAMES_STATE.hangman,
      ...(state.hangman || {}),
      hint: stripLegacyEmoji(state.hangman?.hint || DEFAULT_GAMES_STATE.hangman.hint),
      category: stripLegacyEmoji(state.hangman?.category || DEFAULT_GAMES_STATE.hangman.category),
    },
    chess: {
      ...DEFAULT_GAMES_STATE.chess,
      ...(state.chess || {}),
    },
    battleship: {
      ...DEFAULT_GAMES_STATE.battleship,
      ...(state.battleship || {}),
      phase: state.battleship?.phase || 'idle',
      fleetKarla:
        Array.isArray(state.battleship?.fleetKarla) &&
        state.battleship.fleetKarla.length === 5 &&
        state.battleship.fleetKarla[0]?.size === 5
          ? state.battleship.fleetKarla
          : DEFAULT_GAMES_STATE.battleship.fleetKarla,
      fleetJavier:
        Array.isArray(state.battleship?.fleetJavier) &&
        state.battleship.fleetJavier.length === 5 &&
        state.battleship.fleetJavier[0]?.size === 5
          ? state.battleship.fleetJavier
          : DEFAULT_GAMES_STATE.battleship.fleetJavier,
      shotsByKarla: Array.isArray(state.battleship?.shotsByKarla)
        ? state.battleship.shotsByKarla
        : [],
      shotsByJavier: Array.isArray(state.battleship?.shotsByJavier)
        ? state.battleship.shotsByJavier
        : [],
    },
  };
}

export interface SpecialPlacesState {
  places: SpecialPlace[];
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

  return { places };
}

async function fetchLatestSyncedState<T>(
  syncType: string,
  localKey: string,
  defaultValue: T,
  normalizer?: (val: T) => T,
  merger?: (localVal: T, remoteVal: T) => T
): Promise<T> {
  const applyNormalize = (val: T): T => (normalizer ? normalizer(val) : val);

  let localCached: T | null = null;
  try {
    const raw = await AsyncStorage.getItem(localKey);
    if (raw) {
      localCached = applyNormalize({ ...defaultValue, ...(JSON.parse(raw) as T) });
    }
  } catch {
    // Ignorar error de lectura local
  }

  try {
    const { data, error } = await supabase
      .from('interactions')
      .select('payload, created_at')
      .eq('type', syncType)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0 && data[0].payload) {
      const remoteRaw = applyNormalize({ ...defaultValue, ...(data[0].payload as T) });
      const finalState =
        localCached && merger ? merger(localCached, remoteRaw) : remoteRaw;
      await AsyncStorage.setItem(localKey, JSON.stringify(finalState));
      return finalState;
    }
  } catch {
    // Usar caché local si no hay red
  }

  return localCached ?? applyNormalize(defaultValue);
}

async function saveAndBroadcastState<T>(
  sender: UserProfile,
  syncType: string,
  localKey: string,
  newState: T,
  normalizer?: (val: T) => T
): Promise<void> {
  const cleanState = normalizer ? normalizer(newState) : newState;

  try {
    await AsyncStorage.setItem(localKey, JSON.stringify(cleanState));
  } catch {
    // Ignorar error local
  }

  try {
    await supabase.from('interactions').insert([
      {
        sender,
        type: syncType,
        payload: cleanState as unknown as Record<string, unknown>,
      },
    ]);
  } catch {
    // Guardado localmente
  }
}

export const getHomeState = (): Promise<HomeState> =>
  fetchLatestSyncedState<HomeState>(
    'sync_home_state',
    HOME_STATE_KEY,
    DEFAULT_HOME_STATE,
    normalizeHomeState,
    mergeHomeStates
  );

export const saveHomeState = (sender: UserProfile, state: HomeState): Promise<void> =>
  saveAndBroadcastState<HomeState>(
    sender,
    'sync_home_state',
    HOME_STATE_KEY,
    state,
    normalizeHomeState
  );

export const getMoviesState = (): Promise<MoviesAndPlansState> =>
  fetchLatestSyncedState<MoviesAndPlansState>(
    'sync_movies_state',
    MOVIES_STATE_KEY,
    DEFAULT_MOVIES_STATE,
    normalizeMoviesState
  );

export const saveMoviesState = (sender: UserProfile, state: MoviesAndPlansState): Promise<void> =>
  saveAndBroadcastState<MoviesAndPlansState>(
    sender,
    'sync_movies_state',
    MOVIES_STATE_KEY,
    state,
    normalizeMoviesState
  );

export const getGamesState = (): Promise<GamesState> =>
  fetchLatestSyncedState<GamesState>(
    'sync_games_state',
    GAMES_STATE_KEY,
    DEFAULT_GAMES_STATE,
    normalizeGamesState
  );

export const saveGamesState = (sender: UserProfile, state: GamesState): Promise<void> =>
  saveAndBroadcastState<GamesState>(
    sender,
    'sync_games_state',
    GAMES_STATE_KEY,
    state,
    normalizeGamesState
  );

export const getSpecialPlacesState = (): Promise<SpecialPlacesState> =>
  fetchLatestSyncedState<SpecialPlacesState>(
    'sync_places_state',
    PLACES_STATE_KEY,
    DEFAULT_PLACES_STATE,
    normalizePlacesState
  );

export const saveSpecialPlacesState = (
  sender: UserProfile,
  state: SpecialPlacesState
): Promise<void> =>
  saveAndBroadcastState<SpecialPlacesState>(
    sender,
    'sync_places_state',
    PLACES_STATE_KEY,
    state,
    normalizePlacesState
  );

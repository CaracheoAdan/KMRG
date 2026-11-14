import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/Kit';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { TicTacToeArena } from '../components/games/TicTacToeArena';
import { SudokuArena } from '../components/games/SudokuArena';
import { ChessArena } from '../components/games/ChessArena';
import { HangmanArena } from '../components/games/HangmanArena';
import { HANGMAN_DICTIONARY } from '../components/games/hangmanDictionary';
import { BattleshipArena } from '../components/games/BattleshipArena';
import { DrawGuessArena } from '../components/games/DrawGuessArena';
import { DominoArena } from '../components/games/DominoArena';
import { UnoArena } from '../components/games/UnoArena';
import {
  startNewDominoGame,
  placeTileOnBoard,
  calculateHandPips,
  canPlayTile,
  getPlayableTiles,
  DOMINO_TARGET_SCORE,
} from '../components/games/domino/dominoLogic';
import {
  startNewUnoGame,
  processCardEffect,
  canPlayUnoCard,
  shuffleDeck,
  penalizeMissedUno,
  drawCardsWithRecycle,
  calculateUnoHandPoints,
  UNO_TARGET_SCORE,
} from '../components/games/uno/unoLogic';
import { GameVectorIcon } from '../components/games/common/GameCustomIcons';
import { DominoTile, UnoCard, UserProfile, DominoState, UnoState, PetAccessoryType } from '../types';
import { MoodMascot } from '../components/MoodMascot';
import { PochitoBear } from '../components/PochitoBear';
import { GameHeader } from '../components/games/common/GameHeader';
import { GameButton } from '../components/games/common/GameButton';
import { CelebrationOverlay } from '../components/games/common/CelebrationOverlay';
import { GameScoreBreakdownModal } from '../components/games/common/GameScoreBreakdownModal';
import { GAMES_THEME, triggerGameHaptic } from '../theme/gamesTheme';
import {
  getGamesState,
  saveGamesState,
  applyIncomingRealtimeGamesState,
  DEFAULT_GAMES_STATE,
  GamesState,
  SudokuSessionState,
  ChessPiece,
  createInitialChessBoard,
  createRandomBattleshipFleet,
  BattleshipShip,
  GameScoreBreakdown,
  UNIFIED_GAME_REWARDS,
  getWeeklyResetKey,
  createDefaultBreakdown,
  createDefaultGameScoreItem,
  getHomeState,
  subscribeHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Tamaños calibrados para que TODO quepa en una sola pantalla SIN scroll
const COMPACT_BOARD_SIZE = Math.min(SCREEN_W - 56, Math.floor(SCREEN_H * 0.31), 252);
const FULL_BOARD_SIZE = Math.min(SCREEN_W - 32, Math.floor(SCREEN_H * 0.42), 336);

type GameTab = 'tictactoe' | 'sudoku' | 'chess' | 'hangman' | 'battleship' | 'drawguess' | 'domino' | 'uno';

interface VictoryCelebration {
  winnerName: string;
  gameTitle: string;
  pointsEarned: number;
  subtitle: string;
  color: string;
  onPlayAgain: () => void;
}

const ALL_GAMES: Array<{
  id: GameTab;
  label: string;
  icon: string;
  description: string;
  bgTint: string;
  iconColor: string;
}> = [
  { id: 'tictactoe', label: '3 en Raya', icon: 'grid', description: 'Clásico duelo en parejas', bgTint: '#ede9fe', iconColor: '#7c3aed' },
  { id: 'sudoku', label: 'Sudoku', icon: 'apps', description: 'Rompecabezas colaborativo', bgTint: '#e0f2fe', iconColor: '#0284c7' },
  { id: 'chess', label: 'Ajedrez', icon: 'trophy', description: 'Estrategia y jaque mate', bgTint: '#fef3c7', iconColor: '#d97706' },
  { id: 'battleship', label: 'Battleship', icon: 'boat', description: 'Hunde la flota enemiga', bgTint: '#cffafe', iconColor: '#0891b2' },
  { id: 'hangman', label: 'Ahorcado', icon: 'extension-puzzle', description: 'Adivina la palabra oculta', bgTint: '#ffe4e6', iconColor: '#e11d48' },
  { id: 'drawguess', label: 'Dibuja y Adivina', icon: 'brush', description: 'Pictionary en tiempo real', bgTint: '#ecfdf5', iconColor: '#10b981' },
  { id: 'domino', label: 'Dominó', icon: 'apps', description: 'Mesa clásica de 28 fichas', bgTint: '#eef2ff', iconColor: '#6366f1' },
  { id: 'uno', label: 'UNO', icon: 'flame', description: 'Colores, +2, +4 y comodines', bgTint: '#fef2f2', iconColor: '#ef4444' },
];

// HANGMAN_DICTIONARY se importa desde '../components/games/hangmanDictionary'

const BASE_SUDOKU = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

type SavedSudokuSession = SudokuSessionState;

function createGameUid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Elimina de forma automática el número colocado de todas las notas candidatas
 * de su misma fila, columna y bloque 3x3.
 */
function clearSudokuPeerNotes(
  notes: Record<string, number[]>,
  r: number,
  c: number,
  val: number
): Record<string, number[]> {
  const nextNotes: Record<string, number[]> = { ...notes };
  delete nextNotes[`${r}-${c}`];
  const boxRow = Math.floor(r / 3);
  const boxCol = Math.floor(c / 3);

  Object.keys(nextNotes).forEach((key) => {
    const [krStr, kcStr] = key.split('-');
    const kr = Number(krStr);
    const kc = Number(kcStr);
    const samePeer =
      kr === r ||
      kc === c ||
      (Math.floor(kr / 3) === boxRow && Math.floor(kc / 3) === boxCol);
    if (samePeer && Array.isArray(nextNotes[key])) {
      const filtered = nextNotes[key].filter((n) => n !== val);
      if (filtered.length > 0) {
        nextNotes[key] = filtered;
      } else {
        delete nextNotes[key];
      }
    }
  });

  return nextNotes;
}

function createSudokuSession(difficulty: 'easy' | 'medium' | 'hard'): SavedSudokuSession {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }

  let solution = BASE_SUDOKU.map((row) => row.map((v) => digits[v - 1]));
  if (Math.random() > 0.5) {
    solution = solution.reverse();
  }

  const blanks = difficulty === 'easy' ? 28 : difficulty === 'medium' ? 40 : 50;
  const board = solution.map((r) => [...r]);
  const fixed = Array.from({ length: 9 }, () => Array(9).fill(true));

  let removed = 0;
  while (removed < blanks) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (board[r][c] !== 0) {
      board[r][c] = 0;
      fixed[r][c] = false;
      removed++;
    }
  }

  return {
    sessionId: createGameUid('sud'),
    difficulty,
    board,
    fixed,
    solution,
    notes: {},
    score: 0,
    mistakes: 0,
    completed: false,
    completedBy: null,
    placedBy: {},
    updatedAt: Date.now(),
    version: 1,
  };
}

const CHESS_SYMBOLS: Record<string, string> = {
  'w-k': '♔',
  'w-q': '♕',
  'w-r': '♖',
  'w-b': '♗',
  'w-n': '♘',
  'w-p': '♙',
  'b-k': '♚',
  'b-q': '♛',
  'b-r': '♜',
  'b-b': '♝',
  'b-n': '♞',
  'b-p': '♟',
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const GamesScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { profile, getDisplayName, getAvatarUri } = useProfile();
  const currentProfile = profile || 'Karla';

  const [activeGame, setActiveGame] = useState<GameTab | null>(null);
  const [pendingGameToLaunch, setPendingGameToLaunch] = useState<GameTab | null>(null);
  const [isDraggingShip, setIsDraggingShip] = useState<boolean>(false);
  const [gamesState, setGamesState] = useState<GamesState>(DEFAULT_GAMES_STATE);
  const gamesStateRef = useRef<GamesState>(gamesState);
  gamesStateRef.current = gamesState;
  const [petMeta, setPetMeta] = useState<{ name: string; accessory: PetAccessoryType }>({
    name: DEFAULT_HOME_STATE.couplePet?.name || 'Pochito',
    accessory: DEFAULT_HOME_STATE.couplePet?.accessory || 'none',
  });
  const [isFullScreenGame, setIsFullScreenGame] = useState<boolean>(false);

  // Modal de desglose de puntos por juego y torneo semanal
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownPlayer, setBreakdownPlayer] = useState<'all' | 'Karla' | 'Javier'>('all');

  const handleOpenScoreBreakdown = (player: 'all' | 'Karla' | 'Javier' = 'all') => {
    void triggerGameHaptic('light');
    setBreakdownPlayer(player);
    setIsBreakdownModalOpen(true);
  };

  // Estado de Celebración Grande y Alegre al Ganar
  const [victoryCelebration, setVictoryCelebration] = useState<VictoryCelebration | null>(null);
  const victoryScale = useRef(new Animated.Value(0.5)).current;

  // --- Estado de Sudoku Cooperativo (compartido en tiempo real) ---
  const MAX_SUDOKU_MISTAKES = 3;
  const fallbackSudokuRef = useRef<SavedSudokuSession | null>(null);
  if (!fallbackSudokuRef.current) {
    fallbackSudokuRef.current = createSudokuSession('easy');
  }
  const sudoku: SavedSudokuSession = gamesState.sudoku?.session || fallbackSudokuRef.current;
  const isSudokuSyncedRef = useRef<boolean>(false);
  const [selectedSudokuCell, setSelectedSudokuCell] = useState<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const sudokuInputRef = useRef<any>(null);

  // --- Estado de Ajedrez ---
  const [selectedChessPos, setSelectedChessPos] = useState<[number, number] | null>(null);
  const [chessHistory, setChessHistory] = useState<Array<GamesState['chess']>>([]);

  // --- Estado de Ahorcado ---
  const [isCustomWordModalOpen, setIsCustomWordModalOpen] = useState(false);
  const [customWordInput, setCustomWordInput] = useState('');
  const [customHintInput, setCustomHintInput] = useState('');
  const [customCatInput, setCustomCatInput] = useState('Reto Especial');

  // --- Estado de Battleship 10x10 (Drag & Rotate Fluido + Lanzamiento de Bala) ---
  const [battleshipRadarMode, setBattleshipRadarMode] = useState<'attack' | 'fleet'>('attack');
  const [selectedSetupShipId, setSelectedSetupShipId] = useState<string>('carrier');
  const [setupOrientation, setSetupOrientation] = useState<'H' | 'V'>('H');
  const [localSetupFleet, setLocalSetupFleet] = useState<BattleshipShip[] | null>(null);
  const dragSessionRef = useRef<{
    shipId: string;
    startCell: number;
    lastCell: number;
    didDragMove: boolean;
    startedOnSelectedShip: boolean;
  } | null>(null);

  const [firingBullet, setFiringBullet] = useState<{
    cellIdx: number;
    isHit: boolean;
  } | null>(null);
  const bulletProgress = useRef(new Animated.Value(0)).current;
  const explosionScale = useRef(new Animated.Value(0)).current;
  const radarPulseAnim = useRef(new Animated.Value(0)).current;
  const hitBannerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(radarPulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [radarPulseAnim]);

  const triggerVictoryCelebration = useCallback(
    (data: VictoryCelebration) => {
      setVictoryCelebration(data);
      victoryScale.setValue(0.4);
      Animated.spring(victoryScale, {
        toValue: 1,
        friction: 4,
        tension: 95,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    },
    [victoryScale]
  );

  const hasLoadedGamesRef = useRef<boolean>(false);

  const loadAll = useCallback(async (forceRefresh: boolean = false) => {
    const loaded = await getGamesState(forceRefresh);
    hasLoadedGamesRef.current = true;
    gamesStateRef.current = loaded;
    setGamesState(loaded);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAll(true);
    }, [loadAll])
  );

  useEffect(() => {
    if (activeGame) {
      void loadAll(true);
    }
  }, [activeGame, loadAll]);

  useEffect(() => {
    void loadAll(true);
    void getHomeState().then((home) => {
      if (home?.couplePet) {
        setPetMeta({
          name: home.couplePet.name || 'Pochito',
          accessory: home.couplePet.accessory || 'none',
        });
      }
    });
    const unsubHome = subscribeHomeState((home) => {
      if (home?.couplePet) {
        setPetMeta({
          name: home.couplePet.name || 'Pochito',
          accessory: home.couplePet.accessory || 'none',
        });
      }
    });

    const channel = supabase
      .channel('kmrg-games-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (
            payload.new?.type === 'sync_games_state' &&
            payload.new?.payload &&
            payload.new?.sender !== currentProfile
          ) {
            void applyIncomingRealtimeGamesState(
              gamesStateRef.current,
              payload.new.payload as GamesState
            ).then((merged) => {
              gamesStateRef.current = merged;
              setGamesState(merged);
            });
          }
        }
      )
      .subscribe();

    return () => {
      unsubHome();
      void supabase.removeChannel(channel);
    };
  }, [loadAll, currentProfile]);

  const updateAndSyncGames = useCallback(
    async (nextOrUpdater: GamesState | ((prev: GamesState) => GamesState)) => {
      const base = gamesStateRef.current;
      const next =
        typeof nextOrUpdater === 'function' ? nextOrUpdater(base) : nextOrUpdater;
      gamesStateRef.current = next;
      setGamesState(next);
      const saved = await saveGamesState(currentProfile, next);
      gamesStateRef.current = saved;
      setGamesState(saved);
    },
    [currentProfile]
  );

  const persistSudoku = useCallback(
    async (nextSudoku: SavedSudokuSession) => {
      const stamped: SavedSudokuSession = {
        ...nextSudoku,
        updatedAt: Date.now(),
        version: (nextSudoku.version || 0) + 1,
      };
      await updateAndSyncGames((curr) => ({
        ...curr,
        sudoku: {
          ...curr.sudoku,
          session: stamped,
        },
      }));
    },
    [updateAndSyncGames]
  );

  const addLeaderboardReward = (
    baseState: GamesState,
    winner: 'Karla' | 'Javier',
    points: number = UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
    trophy: number = UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
    gameKey?: keyof GameScoreBreakdown
  ): GamesState['leaderboard'] => {
    const lb = baseState.leaderboard || DEFAULT_GAMES_STATE.leaderboard;
    const currentWeek = getWeeklyResetKey();

    const nextPointsKarla = winner === 'Karla' ? lb.pointsKarla + points : lb.pointsKarla;
    const nextPointsJavier = winner === 'Javier' ? lb.pointsJavier + points : lb.pointsJavier;
    const nextTrophiesKarla = winner === 'Karla' ? lb.trophiesKarla + trophy : lb.trophiesKarla;
    const nextTrophiesJavier = winner === 'Javier' ? lb.trophiesJavier + trophy : lb.trophiesJavier;

    const breakdown: GameScoreBreakdown = { ...(lb.breakdown || createDefaultBreakdown()) };
    if (gameKey) {
      const prev = breakdown[gameKey] || createDefaultGameScoreItem();
      breakdown[gameKey] = {
        winsKarla: winner === 'Karla' ? prev.winsKarla + 1 : prev.winsKarla,
        winsJavier: winner === 'Javier' ? prev.winsJavier + 1 : prev.winsJavier,
        pointsKarla: winner === 'Karla' ? prev.pointsKarla + points : prev.pointsKarla,
        pointsJavier: winner === 'Javier' ? prev.pointsJavier + points : prev.pointsJavier,
        trophiesKarla: winner === 'Karla' ? prev.trophiesKarla + trophy : prev.trophiesKarla,
        trophiesJavier: winner === 'Javier' ? prev.trophiesJavier + trophy : prev.trophiesJavier,
      };
    }

    return {
      pointsKarla: nextPointsKarla,
      pointsJavier: nextPointsJavier,
      trophiesKarla: nextTrophiesKarla,
      trophiesJavier: nextTrophiesJavier,
      weekKey: currentWeek,
      breakdown,
      lastWeekSummary: lb.lastWeekSummary || null,
    };
  };

  const addLeaderboardTie = (
    baseState: GamesState,
    gameKey?: keyof GameScoreBreakdown
  ): GamesState['leaderboard'] => {
    const lb = baseState.leaderboard || DEFAULT_GAMES_STATE.leaderboard;
    const currentWeek = getWeeklyResetKey();
    const tiePts = UNIFIED_GAME_REWARDS.POINTS_PER_TIE;

    const breakdown: GameScoreBreakdown = { ...(lb.breakdown || createDefaultBreakdown()) };
    if (gameKey) {
      const prev = breakdown[gameKey] || createDefaultGameScoreItem();
      breakdown[gameKey] = {
        ...prev,
        pointsKarla: prev.pointsKarla + tiePts,
        pointsJavier: prev.pointsJavier + tiePts,
      };
    }

    return {
      pointsKarla: lb.pointsKarla + tiePts,
      pointsJavier: lb.pointsJavier + tiePts,
      trophiesKarla: lb.trophiesKarla,
      trophiesJavier: lb.trophiesJavier,
      weekKey: currentWeek,
      breakdown,
      lastWeekSummary: lb.lastWeekSummary || null,
    };
  };

  // =========================================================================
  // 1. TRES EN RAYA
  // =========================================================================
  const handleNewTicTacToeRound = useCallback(async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const ttt = curr.ticTacToe;
      return {
        ...curr,
        ticTacToe: {
          ...ttt,
          board: Array(9).fill(null),
          winningLine: null,
          winner: null,
          moveOrder: [],
          turn: ttt.round % 2 === 0 ? 'Karla' : 'Javier',
          round: (ttt.round || 1) + 1,
          version: (ttt.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  }, [updateAndSyncGames]);

  const handleToggleTicTacToeMode = async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const ttt = curr.ticTacToe;
      return {
        ...curr,
        ticTacToe: {
          ...ttt,
          infiniteMode: !ttt.infiniteMode,
          board: Array(9).fill(null),
          winningLine: null,
          winner: null,
          moveOrder: [],
          turn: ttt.round % 2 === 0 ? 'Karla' : 'Javier',
          version: (ttt.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  const prevTttStateRef = useRef<{ round: number; winner: 'Javier' | 'Karla' | 'Empate' | null }>({
    round: gamesState.ticTacToe.round || 1,
    winner: gamesState.ticTacToe.winner || null,
  });

  useEffect(() => {
    const ttt = gamesState.ticTacToe;
    const prev = prevTttStateRef.current;
    const winner = ttt.winner || null;

    if (!winner && prev.winner !== null) {
      setVictoryCelebration(null);
    } else if (
      (winner === 'Karla' || winner === 'Javier') &&
      (prev.winner !== winner || prev.round !== ttt.round) &&
      activeGame === 'tictactoe'
    ) {
      triggerVictoryCelebration({
        winnerName: winner === 'Karla' ? 'Karlita' : 'Javier',
        gameTitle: 'Tres en Raya',
        pointsEarned: UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        subtitle: 'Tres en línea impecables. ¡Qué gran jugada!',
        color: winner === 'Karla' ? '#9333ea' : '#0284c7',
        onPlayAgain: () => void handleNewTicTacToeRound(),
      });
    }

    prevTttStateRef.current = { round: ttt.round || 1, winner };
  }, [gamesState.ticTacToe.winner, gamesState.ticTacToe.round, activeGame, handleNewTicTacToeRound, triggerVictoryCelebration]);

  const handleTicTacToePress = async (index: number) => {
    const curr = gamesStateRef.current;
    const ttt = curr.ticTacToe;
    if (ttt.board[index] || ttt.winner) return;
    if (ttt.turn !== currentProfile) {
      Alert.alert(
        'Espera tu turno',
        `Ahora le toca mover a ${getDisplayName(ttt.turn)}.`
      );
      return;
    }

    const newBoard = [...ttt.board];
    let nextMoveOrder = [...(ttt.moveOrder || [])];
    if (ttt.infiniteMode) {
      const playerOrder = nextMoveOrder.filter((pos) => newBoard[pos] === ttt.turn);
      if (playerOrder.length >= 3) {
        const oldestIdx = playerOrder[0];
        newBoard[oldestIdx] = null;
        nextMoveOrder = nextMoveOrder.filter((pos) => pos !== oldestIdx);
      }
      nextMoveOrder.push(index);
    }
    newBoard[index] = ttt.turn;

    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    let winner: 'Javier' | 'Karla' | 'Empate' | null = null;
    let winningLine: number[] | null = null;

    for (const line of lines) {
      const [a, b, c] = line;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = newBoard[a];
        winningLine = line;
        break;
      }
    }

    if (!winner && newBoard.every((cell) => cell !== null)) {
      winner = 'Empate';
    }

    const nextTurn = ttt.turn === 'Karla' ? 'Javier' : 'Karla';
    const nextScoreKarla = winner === 'Karla' ? ttt.scoreKarla + 1 : ttt.scoreKarla;
    const nextScoreJavier = winner === 'Javier' ? ttt.scoreJavier + 1 : ttt.scoreJavier;

    let nextLeaderboard = curr.leaderboard;
    if (winner === 'Karla' || winner === 'Javier') {
      nextLeaderboard = addLeaderboardReward(
        curr,
        winner,
        UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        'tictactoe'
      );
    } else if (winner === 'Empate') {
      nextLeaderboard = addLeaderboardTie(curr, 'tictactoe');
    }

    await updateAndSyncGames({
      ...curr,
      leaderboard: nextLeaderboard,
      ticTacToe: {
        ...ttt,
        board: newBoard,
        winningLine,
        moveOrder: nextMoveOrder,
        turn: nextTurn,
        winner,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        version: (ttt.version || 0) + 1,
        updatedAt: Date.now(),
      },
    });
  };

  // =========================================================================
  // 2. SUDOKU
  // =========================================================================
  const handleNewSudokuGame = useCallback(
    async (diff: 'easy' | 'medium' | 'hard') => {
      const fresh = createSudokuSession(diff);
      setSelectedSudokuCell(null);
      setVictoryCelebration(null);
      await persistSudoku(fresh);
    },
    [persistSudoku]
  );

  // Publicar tablero cooperativo inicial si todavía no existe uno en la nube
  useEffect(() => {
    if (
      activeGame === 'sudoku' &&
      hasLoadedGamesRef.current &&
      !gamesState.sudoku?.session &&
      !isSudokuSyncedRef.current
    ) {
      isSudokuSyncedRef.current = true;
      void persistSudoku(fallbackSudokuRef.current!);
    }
  }, [activeGame, gamesState.sudoku?.session, persistSudoku]);

  const prevSudokuCompletionRef = useRef<{ sessionId?: string; completed: boolean }>({
    sessionId: sudoku.sessionId,
    completed: sudoku.completed,
  });

  useEffect(() => {
    const prev = prevSudokuCompletionRef.current;
    if (!sudoku.completed && prev.completed) {
      setVictoryCelebration(null);
    } else if (
      sudoku.completed &&
      (!prev.completed || prev.sessionId !== sudoku.sessionId) &&
      activeGame === 'sudoku'
    ) {
      const finisher = sudoku.completedBy || currentProfile;
      triggerVictoryCelebration({
        winnerName: getDisplayName(finisher),
        gameTitle: 'Sudoku Cooperativo',
        pointsEarned: UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        subtitle: 'Completaron juntos todo el tablero con maestría.',
        color: primaryColor,
        onPlayAgain: () => void handleNewSudokuGame(sudoku.difficulty),
      });
    }
    prevSudokuCompletionRef.current = {
      sessionId: sudoku.sessionId,
      completed: sudoku.completed,
    };
  }, [
    sudoku.completed,
    sudoku.sessionId,
    sudoku.completedBy,
    sudoku.difficulty,
    activeGame,
    currentProfile,
    getDisplayName,
    primaryColor,
    handleNewSudokuGame,
    triggerVictoryCelebration,
  ]);

  const isSudokuGameOver = sudoku.mistakes >= MAX_SUDOKU_MISTAKES && !sudoku.completed;

  const handleSelectSudokuCell = (r: number, c: number) => {
    setSelectedSudokuCell([r, c]);
    if (!sudoku.fixed[r][c] && !sudoku.completed && sudoku.mistakes < MAX_SUDOKU_MISTAKES) {
      setTimeout(() => {
        sudokuInputRef.current?.focus();
      }, 20);
    }
  };

  const handleSudokuNumberPress = async (num: number) => {
    const latestSudoku = gamesStateRef.current.sudoku?.session || sudoku;
    if (!selectedSudokuCell || latestSudoku.completed || latestSudoku.mistakes >= MAX_SUDOKU_MISTAKES) return;
    const [r, c] = selectedSudokuCell;
    if (latestSudoku.fixed[r][c]) return;

    const cellKey = `${r}-${c}`;

    if (num === 0) {
      const nextBoard = latestSudoku.board.map((row) => [...row]);
      nextBoard[r][c] = 0;
      const nextNotes = { ...latestSudoku.notes };
      delete nextNotes[cellKey];
      const nextPlacedBy = { ...(latestSudoku.placedBy || {}) };
      delete nextPlacedBy[cellKey];
      await persistSudoku({
        ...latestSudoku,
        board: nextBoard,
        notes: nextNotes,
        placedBy: nextPlacedBy,
      });
      return;
    }

    if (isNoteMode && latestSudoku.board[r][c] === 0) {
      const currentNotes = latestSudoku.notes[cellKey] || [];
      const nextCellNotes = currentNotes.includes(num)
        ? currentNotes.filter((n) => n !== num)
        : [...currentNotes, num].sort();
      await persistSudoku({
        ...latestSudoku,
        notes: { ...latestSudoku.notes, [cellKey]: nextCellNotes },
      });
      return;
    }

    const correctVal = latestSudoku.solution[r][c];
    const nextBoard = latestSudoku.board.map((row) => [...row]);
    const wasAlreadyCorrect = latestSudoku.board[r][c] === correctVal;
    nextBoard[r][c] = num;

    let nextScore = latestSudoku.score;
    let nextMistakes = latestSudoku.mistakes;
    let nextNotes = latestSudoku.notes;
    const nextPlacedBy = { ...(latestSudoku.placedBy || {}) };
    const mult = latestSudoku.difficulty === 'easy' ? 1 : latestSudoku.difficulty === 'medium' ? 1.5 : 2;

    if (num === correctVal) {
      if (!wasAlreadyCorrect) {
        nextScore += Math.round(50 * mult);
      }
      nextPlacedBy[cellKey] = currentProfile;
      nextNotes = clearSudokuPeerNotes(latestSudoku.notes, r, c, num);
    } else {
      nextMistakes += 1;
      nextScore = Math.max(0, nextScore - 20);
      if (nextMistakes >= MAX_SUDOKU_MISTAKES) {
        sudokuInputRef.current?.blur();
      }
    }

    const isComplete = nextBoard.every((row, ri) =>
      row.every((cell, ci) => cell === latestSudoku.solution[ri][ci])
    );

    if (isComplete) {
      sudokuInputRef.current?.blur();
      const bonus = Math.round(500 * mult);
      const finalScore = nextScore + bonus;
      const completedSession: SavedSudokuSession = {
        ...latestSudoku,
        board: nextBoard,
        notes: nextNotes,
        placedBy: nextPlacedBy,
        score: finalScore,
        mistakes: nextMistakes,
        completed: true,
        completedBy: currentProfile,
        updatedAt: Date.now(),
        version: (latestSudoku.version || 0) + 1,
      };

      await updateAndSyncGames((curr) => {
        const bestK =
          currentProfile === 'Karla'
            ? Math.max(curr.sudoku.bestScoreKarla, finalScore)
            : curr.sudoku.bestScoreKarla;
        const bestJ =
          currentProfile === 'Javier'
            ? Math.max(curr.sudoku.bestScoreJavier, finalScore)
            : curr.sudoku.bestScoreJavier;
        const nextLb = addLeaderboardReward(
          curr,
          currentProfile,
          UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
          UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
          'sudoku'
        );

        return {
          ...curr,
          leaderboard: nextLb,
          sudoku: {
            bestScoreKarla: bestK,
            bestScoreJavier: bestJ,
            completedCount: (curr.sudoku.completedCount || 0) + 1,
            session: completedSession,
          },
        };
      });
      return;
    }

    await persistSudoku({
      ...latestSudoku,
      board: nextBoard,
      notes: nextNotes,
      placedBy: nextPlacedBy,
      score: nextScore,
      mistakes: nextMistakes,
    });
  };

  const handleSudokuHint = async () => {
    const latestSudoku = gamesStateRef.current.sudoku?.session || sudoku;
    if (!selectedSudokuCell || latestSudoku.completed) {
      Alert.alert('Selecciona una casilla', 'Toca una casilla vacía del tablero para revelar su número.');
      return;
    }
    const [r, c] = selectedSudokuCell;
    if (latestSudoku.fixed[r][c] || latestSudoku.board[r][c] === latestSudoku.solution[r][c]) return;

    const val = latestSudoku.solution[r][c];
    const nextBoard = latestSudoku.board.map((row) => [...row]);
    nextBoard[r][c] = val;
    const nextNotes = clearSudokuPeerNotes(latestSudoku.notes, r, c, val);
    const nextPlacedBy = { ...(latestSudoku.placedBy || {}), [`${r}-${c}`]: currentProfile };
    const isComplete = nextBoard.every((row, ri) =>
      row.every((cell, ci) => cell === latestSudoku.solution[ri][ci])
    );

    if (isComplete) {
      sudokuInputRef.current?.blur();
      const mult = latestSudoku.difficulty === 'easy' ? 1 : latestSudoku.difficulty === 'medium' ? 1.5 : 2;
      const bonus = Math.round(500 * mult);
      const finalScore = Math.max(0, latestSudoku.score - 15) + bonus;
      const completedSession: SavedSudokuSession = {
        ...latestSudoku,
        board: nextBoard,
        notes: nextNotes,
        placedBy: nextPlacedBy,
        score: finalScore,
        completed: true,
        completedBy: currentProfile,
        updatedAt: Date.now(),
        version: (latestSudoku.version || 0) + 1,
      };
      await updateAndSyncGames((curr) => {
        const bestK =
          currentProfile === 'Karla'
            ? Math.max(curr.sudoku.bestScoreKarla, finalScore)
            : curr.sudoku.bestScoreKarla;
        const bestJ =
          currentProfile === 'Javier'
            ? Math.max(curr.sudoku.bestScoreJavier, finalScore)
            : curr.sudoku.bestScoreJavier;
        const nextLb = addLeaderboardReward(
          curr,
          currentProfile,
          UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
          UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
          'sudoku'
        );
        return {
          ...curr,
          leaderboard: nextLb,
          sudoku: {
            bestScoreKarla: bestK,
            bestScoreJavier: bestJ,
            completedCount: (curr.sudoku.completedCount || 0) + 1,
            session: completedSession,
          },
        };
      });
      return;
    }

    await persistSudoku({
      ...latestSudoku,
      board: nextBoard,
      notes: nextNotes,
      placedBy: nextPlacedBy,
      score: Math.max(0, latestSudoku.score - 15),
    });
  };

  const remainingDigitsCount = useMemo(() => {
    const counts: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = sudoku.board[r][c];
        if (val >= 1 && val <= 9 && val === sudoku.solution[r][c]) {
          counts[val] = Math.max(0, counts[val] - 1);
        }
      }
    }
    return counts;
  }, [sudoku.board, sudoku.solution]);

  // =========================================================================
  // 3. AJEDREZ
  // =========================================================================
  const getValidChessMoves = useCallback(
    (board: Array<Array<ChessPiece | null>>, r: number, c: number): Array<[number, number]> => {
      const piece = board[r]?.[c];
      if (!piece) return [];

      const moves: Array<[number, number]> = [];
      const inBounds = (row: number, col: number) => row >= 0 && row < 8 && col >= 0 && col < 8;
      const isEnemy = (row: number, col: number) =>
        inBounds(row, col) && board[row][col] !== null && board[row][col]?.color !== piece.color;
      const isEmpty = (row: number, col: number) => inBounds(row, col) && board[row][col] === null;

      if (piece.type === 'p') {
        const dir = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;
        if (isEmpty(r + dir, c)) {
          moves.push([r + dir, c]);
          if (r === startRow && isEmpty(r + dir * 2, c)) {
            moves.push([r + dir * 2, c]);
          }
        }
        if (isEnemy(r + dir, c - 1)) moves.push([r + dir, c - 1]);
        if (isEnemy(r + dir, c + 1)) moves.push([r + dir, c + 1]);
      } else if (piece.type === 'n') {
        const jumps = [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ];
        for (const [dr, dc] of jumps) {
          if (isEmpty(r + dr, c + dc) || isEnemy(r + dr, c + dc)) {
            moves.push([r + dr, c + dc]);
          }
        }
      } else if (piece.type === 'k') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (isEmpty(r + dr, c + dc) || isEnemy(r + dr, c + dc)) {
              moves.push([r + dr, c + dc]);
            }
          }
        }
      } else {
        const dirs: Array<[number, number]> = [];
        if (piece.type === 'r' || piece.type === 'q') {
          dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
        }
        if (piece.type === 'b' || piece.type === 'q') {
          dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
        }
        for (const [dr, dc] of dirs) {
          let nr = r + dr;
          let nc = c + dc;
          while (inBounds(nr, nc)) {
            if (isEmpty(nr, nc)) {
              moves.push([nr, nc]);
            } else {
              if (isEnemy(nr, nc)) moves.push([nr, nc]);
              break;
            }
            nr += dr;
            nc += dc;
          }
        }
      }
      return moves;
    },
    []
  );

  const isKingInCheck = useMemo(() => {
    const board = gamesState.chess.board;
    const currentTurn = gamesState.chess.turn;
    let kingPos: [number, number] | null = null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]?.[c];
        if (p && p.type === 'k' && p.color === currentTurn) {
          kingPos = [r, c];
          break;
        }
      }
    }
    if (!kingPos) return false;

    const enemyColor = currentTurn === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r]?.[c];
        if (p && p.color === enemyColor) {
          const moves = getValidChessMoves(board, r, c);
          if (moves.some(([mr, mc]) => mr === kingPos![0] && mc === kingPos![1])) {
            return true;
          }
        }
      }
    }
    return false;
  }, [gamesState.chess.board, gamesState.chess.turn, getValidChessMoves]);

  const materialAdvantage = useMemo(() => {
    let scoreW = 0;
    let scoreB = 0;
    for (const row of gamesState.chess.board) {
      for (const p of row) {
        if (!p) continue;
        if (p.color === 'w') scoreW += PIECE_VALUES[p.type] || 0;
        else scoreB += PIECE_VALUES[p.type] || 0;
      }
    }
    return scoreW - scoreB;
  }, [gamesState.chess.board]);

  const validChessTargets = useMemo(() => {
    if (!selectedChessPos) return [];
    return getValidChessMoves(gamesState.chess.board, selectedChessPos[0], selectedChessPos[1]);
  }, [selectedChessPos, gamesState.chess.board, getValidChessMoves]);

  const handleResetChess = useCallback(
    (skipConfirm = false) => {
      const doReset = async () => {
        setSelectedChessPos(null);
        setChessHistory([]);
        setVictoryCelebration(null);
        await updateAndSyncGames((curr) => ({
          ...curr,
          chess: {
            ...curr.chess,
            matchId: createGameUid('chess'),
            board: createInitialChessBoard(),
            turn: 'w',
            capturedByW: [],
            capturedByB: [],
            lastMove: null,
            winner: null,
            moveHistory: [],
            version: (curr.chess.version || 0) + 1,
            updatedAt: Date.now(),
          },
        }));
      };

      if (skipConfirm) {
        void doReset();
        return;
      }

      Alert.alert(
        '¿Reiniciar partida de ajedrez?',
        'Se borrará el tablero actual y se comenzará una partida nueva con Blancas (Karlita).',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reiniciar', style: 'destructive', onPress: () => void doReset() },
        ]
      );
    },
    [updateAndSyncGames]
  );

  const prevChessStateRef = useRef<{ matchId?: string; winner: 'w' | 'b' | 'draw' | null }>({
    matchId: gamesState.chess.matchId,
    winner: gamesState.chess.winner || null,
  });

  useEffect(() => {
    const chess = gamesState.chess;
    const prev = prevChessStateRef.current;
    const winner = chess.winner || null;

    if (!winner && prev.winner !== null) {
      setVictoryCelebration(null);
    } else if (
      (winner === 'w' || winner === 'b') &&
      (prev.winner !== winner || prev.matchId !== chess.matchId) &&
      activeGame === 'chess'
    ) {
      triggerVictoryCelebration({
        winnerName: winner === 'w' ? 'Karlita' : 'Javier',
        gameTitle: '¡Jaque Mate en Ajedrez!',
        pointsEarned: UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        subtitle: 'Victoria magistral en el tablero real.',
        color: winner === 'w' ? '#9333ea' : '#0284c7',
        onPlayAgain: () => handleResetChess(true),
      });
    }

    prevChessStateRef.current = { matchId: chess.matchId, winner };
  }, [gamesState.chess.winner, gamesState.chess.matchId, activeGame, handleResetChess, triggerVictoryCelebration]);

  const handleChessCellPress = async (
    r: number,
    c: number,
    promoteTo?: 'q' | 'r' | 'b' | 'n'
  ) => {
    const curr = gamesStateRef.current;
    const chess = curr.chess;
    if (chess.winner) return;

    const myColor = currentProfile === 'Karla' ? 'w' : 'b';
    const clickedPiece = chess.board[r][c];
    if (chess.turn !== myColor) {
      if (clickedPiece || selectedChessPos) {
        setSelectedChessPos(null);
        Alert.alert(
          'Espera tu turno',
          `Es turno de ${getDisplayName(chess.turn === 'w' ? 'Karla' : 'Javier')}.`
        );
      }
      return;
    }

    if (selectedChessPos) {
      const validTargets = getValidChessMoves(chess.board, selectedChessPos[0], selectedChessPos[1]);
      const isValidTarget = validTargets.some(([tr, tc]) => tr === r && tc === c);
      if (isValidTarget) {
        const [sr, sc] = selectedChessPos;
        const movingPiece = chess.board[sr][sc];
        if (!movingPiece) return;

        setChessHistory((prev) => [...prev.slice(-10), chess]);

        const nextBoard = chess.board.map((row) => [...row]);
        const targetPiece = nextBoard[r][c];

        const isPromoMove = movingPiece.type === 'p' && (r === 0 || r === 7);
        const promotedType = isPromoMove ? (promoteTo || 'q') : movingPiece.type;
        const promotedPiece: ChessPiece = { type: promotedType, color: movingPiece.color };

        nextBoard[r][c] = promotedPiece;
        nextBoard[sr][sc] = null;

        const COLS_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const PIECE_PREFIX: Record<ChessPiece['type'], string> = {
          k: 'R',
          q: 'D',
          r: 'T',
          b: 'A',
          n: 'C',
          p: '',
        };
        const fromSq = `${COLS_LETTERS[sc]}${8 - sr}`;
        const toSq = `${COLS_LETTERS[c]}${8 - r}`;
        const promoSuffix = isPromoMove ? `=${PIECE_PREFIX[promotedType]}` : '';
        const moveLabel = `${PIECE_PREFIX[movingPiece.type]}${fromSq}${targetPiece ? '×' : '→'}${toSq}${promoSuffix}`;
        const nextMoveHistory = [...(chess.moveHistory || []), moveLabel];

        const capturedSymbol = targetPiece
          ? CHESS_SYMBOLS[`${targetPiece.color}-${targetPiece.type}`]
          : null;

        const nextCapturedW =
          movingPiece.color === 'w' && capturedSymbol
            ? [...chess.capturedByW, capturedSymbol]
            : chess.capturedByW;
        const nextCapturedB =
          movingPiece.color === 'b' && capturedSymbol
            ? [...chess.capturedByB, capturedSymbol]
            : chess.capturedByB;

        const nextWinner = targetPiece?.type === 'k' ? movingPiece.color : null;
        const nextWinsKarla = nextWinner === 'w' ? (chess.winsKarla || 0) + 1 : chess.winsKarla || 0;
        const nextWinsJavier = nextWinner === 'b' ? (chess.winsJavier || 0) + 1 : chess.winsJavier || 0;

        let nextLb = curr.leaderboard;
        if (nextWinner === 'w') {
          nextLb = addLeaderboardReward(
            curr,
            'Karla',
            UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
            UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
            'chess'
          );
        } else if (nextWinner === 'b') {
          nextLb = addLeaderboardReward(
            curr,
            'Javier',
            UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
            UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
            'chess'
          );
        }

        setSelectedChessPos(null);
        await updateAndSyncGames({
          ...curr,
          leaderboard: nextLb,
          chess: {
            ...chess,
            matchId: chess.matchId || createGameUid('chess'),
            board: nextBoard,
            turn: chess.turn === 'w' ? 'b' : 'w',
            capturedByW: nextCapturedW,
            capturedByB: nextCapturedB,
            lastMove: { from: [sr, sc], to: [r, c] },
            winner: nextWinner,
            winsKarla: nextWinsKarla,
            winsJavier: nextWinsJavier,
            moveHistory: nextMoveHistory,
            version: (chess.version || 0) + 1,
            updatedAt: Date.now(),
          },
        });
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === chess.turn) {
      setSelectedChessPos([r, c]);
    } else {
      setSelectedChessPos(null);
    }
  };

  const handleUndoChessMove = async () => {
    if (chessHistory.length === 0) return;
    const prevChess = chessHistory[chessHistory.length - 1];
    setChessHistory((h) => h.slice(0, -1));
    setSelectedChessPos(null);
    await updateAndSyncGames((curr) => ({
      ...curr,
      chess: {
        ...prevChess,
        matchId: prevChess.matchId || curr.chess.matchId || createGameUid('chess'),
        version: (curr.chess.version || 0) + 1,
        updatedAt: Date.now(),
      },
    }));
  };

  // =========================================================================
  // 4. EL AHORCADO
  // =========================================================================
  const hangman = gamesState.hangman;
  const wrongGuessesCount = hangman.guessed.filter((l) => !hangman.word.includes(l)).length;
  const maxWrong = 6;

  const handleRandomHangmanWord = useCallback(async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const hm = curr.hangman;
      const available = HANGMAN_DICTIONARY.filter((d) => d.word !== hm.word);
      const pick = available[Math.floor(Math.random() * available.length)] || HANGMAN_DICTIONARY[0];
      return {
        ...curr,
        hangman: {
          ...hm,
          roundId: createGameUid('hm'),
          word: pick.word.toUpperCase(),
          hint: pick.hint,
          category: pick.category,
          author: 'Diccionario',
          isPartnerChallenge: false,
          guessed: [],
          hintUsed: false,
          status: 'playing',
          winner: null,
          version: (hm.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  }, [updateAndSyncGames]);

  const prevHangmanStateRef = useRef<{ roundId?: string; status: 'playing' | 'won' | 'lost' }>({
    roundId: hangman.roundId,
    status: hangman.status,
  });

  useEffect(() => {
    const prev = prevHangmanStateRef.current;
    if (hangman.status === 'playing' && (prev.status !== 'playing' || prev.roundId !== hangman.roundId)) {
      setVictoryCelebration(null);
    } else if (
      hangman.status === 'won' &&
      (prev.status !== 'won' || prev.roundId !== hangman.roundId) &&
      activeGame === 'hangman'
    ) {
      const winnerProfile = hangman.winner || currentProfile;
      const winnerLabel = getDisplayName(winnerProfile);
      triggerVictoryCelebration({
        winnerName: winnerLabel,
        gameTitle: '¡Palabra Descifrada!',
        pointsEarned: UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        subtitle:
          winnerProfile === currentProfile
            ? `Adivinaste "${hangman.word}" y sumaron racha de ${hangman.streak || 1}.`
            : `${winnerLabel} adivinó "${hangman.word}" (racha de ${hangman.streak || 1}).`,
        color: primaryColor,
        onPlayAgain: () => void handleRandomHangmanWord(),
      });
    }
    prevHangmanStateRef.current = {
      roundId: hangman.roundId,
      status: hangman.status,
    };
  }, [
    hangman.status,
    hangman.winner,
    hangman.roundId,
    hangman.word,
    hangman.streak,
    activeGame,
    currentProfile,
    getDisplayName,
    primaryColor,
    handleRandomHangmanWord,
    triggerVictoryCelebration,
  ]);

  const handleRevealHangmanLetter = async () => {
    const curr = gamesStateRef.current;
    const hm = curr.hangman;
    if (hm.status !== 'playing' || hm.hintUsed) return;
    const unguessedLetters = Array.from(
      new Set(
        hm.word
          .split('')
          .filter((ch) => ch !== ' ' && !hm.guessed.includes(ch))
      )
    );
    if (unguessedLetters.length === 0) return;

    const pick = unguessedLetters[Math.floor(Math.random() * unguessedLetters.length)];
    const nextGuessed = [...hm.guessed, pick];
    const allRevealed = hm.word
      .split('')
      .every((ch) => ch === ' ' || nextGuessed.includes(ch));

    let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
    let nextScoreKarla = hm.scoreKarla || 0;
    let nextScoreJavier = hm.scoreJavier || 0;
    let nextStreak = hm.streak || 0;
    let nextLb = curr.leaderboard;

    if (allRevealed) {
      nextStatus = 'won';
      nextStreak += 1;
      if (currentProfile === 'Karla') nextScoreKarla += 1;
      else nextScoreJavier += 1;
      nextLb = addLeaderboardReward(
        curr,
        currentProfile,
        UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        'hangman'
      );
    }

    await updateAndSyncGames({
      ...curr,
      leaderboard: nextLb,
      hangman: {
        ...hm,
        roundId: hm.roundId || createGameUid('hm'),
        guessed: nextGuessed,
        hintUsed: true,
        status: nextStatus,
        winner: nextStatus === 'won' ? currentProfile : null,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        streak: nextStreak,
        version: (hm.version || 0) + 1,
        updatedAt: Date.now(),
      },
    });
  };

  const handleGuessLetter = async (letter: string) => {
    const curr = gamesStateRef.current;
    const hm = curr.hangman;
    if (hm.status !== 'playing' || hm.guessed.includes(letter)) return;

    const nextGuessed = [...hm.guessed, letter];
    const nextWrong = nextGuessed.filter((l) => !hm.word.includes(l)).length;

    const allRevealed = hm.word
      .split('')
      .every((ch) => ch === ' ' || nextGuessed.includes(ch));

    let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
    let nextScoreKarla = hm.scoreKarla || 0;
    let nextScoreJavier = hm.scoreJavier || 0;
    let nextStreak = hm.streak || 0;
    let nextLb = curr.leaderboard;

    if (allRevealed) {
      nextStatus = 'won';
      nextStreak += 1;
      if (currentProfile === 'Karla') nextScoreKarla += 1;
      else nextScoreJavier += 1;
      nextLb = addLeaderboardReward(
        curr,
        currentProfile,
        UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        'hangman'
      );
    } else if (nextWrong >= maxWrong) {
      nextStatus = 'lost';
      nextStreak = 0;
    }

    await updateAndSyncGames({
      ...curr,
      leaderboard: nextLb,
      hangman: {
        ...hm,
        roundId: hm.roundId || createGameUid('hm'),
        guessed: nextGuessed,
        status: nextStatus,
        winner: nextStatus === 'won' ? currentProfile : null,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        streak: nextStreak,
        version: (hm.version || 0) + 1,
        updatedAt: Date.now(),
      },
    });
  };

  const handleSaveCustomHangman = async () => {
    const cleaned = customWordInput
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-ZÑ ]/g, '');

    if (cleaned.length < 2) {
      Alert.alert('Palabra muy corta', 'Escribe una palabra de al menos 2 letras.');
      return;
    }

    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const hm = curr.hangman;
      return {
        ...curr,
        hangman: {
          ...hm,
          roundId: createGameUid('hm'),
          word: cleaned,
          hint: customHintInput.trim() || 'Reto especial de tu pareja',
          category: customCatInput.trim() || 'Reto de Pareja',
          author: getDisplayName(currentProfile),
          isPartnerChallenge: true,
          guessed: [],
          hintUsed: false,
          status: 'playing',
          winner: null,
          version: (hm.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });

    setCustomWordInput('');
    setCustomHintInput('');
    setIsCustomWordModalOpen(false);
  };

  // =========================================================================
  // 5. BATTLESHIP PRO 10x10 (BATALLA NAVAL DE MESA CON INVITACIÓN Y DESPLIEGUE)
  // =========================================================================
  const bs = gamesState.battleship || DEFAULT_GAMES_STATE.battleship;
  const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const COL_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  const isShipSunk = (ship: BattleshipShip, shots: number[]): boolean =>
    ship.cells.every((c) => shots.includes(c));

  const remainingShipsKarla = useMemo(
    () => bs.fleetKarla.filter((s) => !isShipSunk(s, bs.shotsByJavier)).length,
    [bs.fleetKarla, bs.shotsByJavier]
  );

  const remainingShipsJavier = useMemo(
    () => bs.fleetJavier.filter((s) => !isShipSunk(s, bs.shotsByKarla)).length,
    [bs.fleetJavier, bs.shotsByKarla]
  );

  const syncedMyFleet = currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier;
  const myFleet = bs.phase === 'setup' && localSetupFleet ? localSetupFleet : syncedMyFleet;
  const enemyFleet = currentProfile === 'Karla' ? bs.fleetJavier : bs.fleetKarla;
  const myShots = currentProfile === 'Karla' ? bs.shotsByKarla : bs.shotsByJavier;
  const enemyShotsAtMe = currentProfile === 'Karla' ? bs.shotsByJavier : bs.shotsByKarla;
  const amIReady = currentProfile === 'Karla' ? bs.readyKarla : bs.readyJavier;
  const isPartnerReady = currentProfile === 'Karla' ? bs.readyJavier : bs.readyKarla;

  useEffect(() => {
    if (bs.phase === 'setup') {
      setLocalSetupFleet(currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier);
    } else {
      setLocalSetupFleet(null);
    }
  }, [bs.phase, currentProfile, bs.fleetKarla, bs.fleetJavier]);

  const prevBsStateRef = useRef<{ matchId?: string; winner: 'Karla' | 'Javier' | null }>({
    matchId: bs.matchId,
    winner: bs.winner || null,
  });

  useEffect(() => {
    const prev = prevBsStateRef.current;
    const currentWinner = bs.winner || null;

    if (!currentWinner && prev.winner !== null) {
      setVictoryCelebration(null);
    } else if (
      currentWinner &&
      (prev.winner === null || prev.matchId !== bs.matchId) &&
      activeGame === 'battleship'
    ) {
      const didIWin = currentWinner === currentProfile;
      triggerVictoryCelebration({
        winnerName: getDisplayName(currentWinner),
        gameTitle: didIWin ? '¡Flota Enemiga Hundida!' : '¡Fin de la Batalla Naval!',
        pointsEarned: didIWin ? UNIFIED_GAME_REWARDS.POINTS_PER_WIN : 0,
        subtitle: didIWin
          ? 'Destruiste los 5 buques de guerra en el radar 10x10.'
          : `${getDisplayName(currentWinner)} hundió toda tu flota. Puedes volver al tablero para ver dónde estaban sus barcos.`,
        color: currentWinner === 'Karla' ? '#9333ea' : '#0284c7',
        onPlayAgain: () => void handleResetBattleship(),
      });
    }
    prevBsStateRef.current = { matchId: bs.matchId, winner: currentWinner };
  }, [bs.winner, bs.matchId, activeGame, currentProfile, getDisplayName, triggerVictoryCelebration]);

  // Helper inteligente sin colisiones ni errores: busca la casilla libre más cercana en el tablero 10x10
  const findNearestValidCellsForShip = (
    fleet: BattleshipShip[],
    shipId: string,
    size: number,
    targetRow: number,
    targetCol: number,
    orientation: 'H' | 'V'
  ): number[] | null => {
    const occupied = new Set<number>();
    fleet.forEach((s) => {
      if (s.id !== shipId) {
        s.cells.forEach((c) => occupied.add(c));
      }
    });

    const maxR = orientation === 'V' ? 10 - size : 9;
    const maxC = orientation === 'H' ? 10 - size : 9;
    const clampedR = Math.max(0, Math.min(maxR, targetRow));
    const clampedC = Math.max(0, Math.min(maxC, targetCol));

    const candidates: Array<{ r: number; c: number; dist: number }> = [];
    for (let r = 0; r <= maxR; r++) {
      for (let c = 0; c <= maxC; c++) {
        const dist = Math.abs(r - clampedR) + Math.abs(c - clampedC);
        candidates.push({ r, c, dist });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);

    for (const cand of candidates) {
      const cells: number[] = [];
      let valid = true;
      for (let i = 0; i < size; i++) {
        const rr = orientation === 'H' ? cand.r : cand.r + i;
        const cc = orientation === 'H' ? cand.c + i : cand.c;
        const idx = rr * 10 + cc;
        if (occupied.has(idx)) {
          valid = false;
          break;
        }
        cells.push(idx);
      }
      if (valid) return cells;
    }
    return null;
  };

  // Mover o rotar un barco instantáneamente en memoria local (60fps, CERO alertas de error)
  const moveOrRotateShipLocally = (
    shipId: string,
    anchorCellIdx: number,
    newOrientation?: 'H' | 'V'
  ) => {
    if (amIReady) return;
    const baseFleet = localSetupFleet || syncedMyFleet;
    const targetShip = baseFleet.find((s) => s.id === shipId);
    if (!targetShip) return;

    const orient: 'H' | 'V' = newOrientation || targetShip.orientation || setupOrientation || 'H';
    const row = Math.floor(anchorCellIdx / 10);
    const col = anchorCellIdx % 10;

    const validCells = findNearestValidCellsForShip(
      baseFleet,
      shipId,
      targetShip.size,
      row,
      col,
      orient
    );
    if (!validCells) return;

    setSelectedSetupShipId(shipId);
    setSetupOrientation(orient);
    setLocalSetupFleet(
      baseFleet.map((s) =>
        s.id === shipId ? { ...s, orientation: orient, cells: validCells } : s
      )
    );
  };

  // Rotar el barco actualmente seleccionado ahí mismo donde está
  const handleRotateSelectedShipInPlace = (explicitShipId?: string) => {
    if (amIReady) return;
    const baseFleet = localSetupFleet || syncedMyFleet;
    const idToRotate = explicitShipId || selectedSetupShipId;
    const ship = baseFleet.find((s) => s.id === idToRotate) || baseFleet[0];
    if (!ship) return;

    const currentOrient =
      ship.orientation ||
      (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V');
    const nextOrient: 'H' | 'V' = currentOrient === 'H' ? 'V' : 'H';
    const anchorCell = ship.cells[0] ?? 0;
    moveOrRotateShipLocally(ship.id, anchorCell, nextOrient);
  };

  // 1) Enviar invitación de partida en vivo
  const handleSendBattleshipInvite = async () => {
    setVictoryCelebration(null);
    setBattleshipRadarMode('fleet');
    const freshK = createRandomBattleshipFleet();
    const freshJ = createRandomBattleshipFleet();
    setLocalSetupFleet(currentProfile === 'Karla' ? freshK : freshJ);
    await updateAndSyncGames((curr) => {
      const currBs = curr.battleship;
      return {
        ...curr,
        battleship: {
          ...currBs,
          matchId: createGameUid('bs'),
          phase: 'invited',
          invitedBy: currentProfile,
          lastUpdatedBy: currentProfile,
          readyKarla: false,
          readyJavier: false,
          fleetKarla: freshK,
          fleetJavier: freshJ,
          shotsByKarla: [],
          shotsByJavier: [],
          turn: currentProfile,
          lastShot: null,
          winner: null,
          version: (currBs.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // 2) Aceptar la invitación e ir a la fase de acomodar barcos en 10x10
  const handleAcceptBattleshipInvite = async () => {
    setVictoryCelebration(null);
    setBattleshipRadarMode('fleet');
    const latestBs = gamesStateRef.current.battleship;
    setLocalSetupFleet(currentProfile === 'Karla' ? latestBs.fleetKarla : latestBs.fleetJavier);
    await updateAndSyncGames((curr) => {
      const currBs = curr.battleship;
      return {
        ...curr,
        battleship: {
          ...currBs,
          matchId: currBs.matchId || createGameUid('bs'),
          phase: 'setup',
          lastUpdatedBy: currentProfile,
          readyKarla: false,
          readyJavier: false,
          shotsByKarla: [],
          shotsByJavier: [],
          lastShot: null,
          winner: null,
          version: (currBs.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // 4) Reacomodar mi flota al azar durante el despliegue
  const handleShuffleMyFleet = () => {
    if (amIReady) return;
    const randomFleet = createRandomBattleshipFleet();
    setLocalSetupFleet(randomFleet);
  };

  // 5) Confirmar "¡Flota Lista!" o desbloquear para modificar flota y pasar a batalla cuando ambos estén listos
  const handleConfirmFleetReady = async (fleetToSave?: BattleshipShip[], readyState = true) => {
    const isK = currentProfile === 'Karla';
    await updateAndSyncGames((curr) => {
      const currBs = curr.battleship;
      const latestMyFleet = isK ? currBs.fleetKarla : currBs.fleetJavier;
      const myFleetToPersist =
        fleetToSave && fleetToSave.length === 5
          ? fleetToSave
          : localSetupFleet && localSetupFleet.length === 5
          ? localSetupFleet
          : latestMyFleet;

      const nextReadyK = isK ? readyState : currBs.readyKarla;
      const nextReadyJ = !isK ? readyState : currBs.readyJavier;
      const bothReady = nextReadyK && nextReadyJ;

      if (bothReady) {
        setBattleshipRadarMode('attack');
      }

      return {
        ...curr,
        battleship: {
          ...currBs,
          matchId: currBs.matchId || createGameUid('bs'),
          phase: bothReady ? 'battle' : 'setup',
          lastUpdatedBy: currentProfile,
          readyKarla: nextReadyK,
          readyJavier: nextReadyJ,
          fleetKarla: isK ? myFleetToPersist : currBs.fleetKarla,
          fleetJavier: !isK ? myFleetToPersist : currBs.fleetJavier,
          version: (currBs.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // 6) Reiniciar a nueva sala de preparación 10x10
  const handleResetBattleship = async () => {
    setVictoryCelebration(null);
    setBattleshipRadarMode('fleet');
    const freshK = createRandomBattleshipFleet();
    const freshJ = createRandomBattleshipFleet();
    setLocalSetupFleet(currentProfile === 'Karla' ? freshK : freshJ);
    await updateAndSyncGames((curr) => {
      const currBs = curr.battleship;
      return {
        ...curr,
        battleship: {
          ...currBs,
          matchId: createGameUid('bs'),
          phase: 'setup',
          invitedBy: currentProfile,
          lastUpdatedBy: currentProfile,
          readyKarla: false,
          readyJavier: false,
          fleetKarla: freshK,
          fleetJavier: freshJ,
          shotsByKarla: [],
          shotsByJavier: [],
          turn: currBs.turn === 'Karla' ? 'Javier' : 'Karla',
          lastShot: null,
          winner: null,
          version: (currBs.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // 7) Disparar proyectil animado (bala/torpedo) en cuadrícula 10x10
  const handleBattleshipFire = async (cellIdx: number) => {
    const startBs = gamesStateRef.current.battleship;
    if (startBs.winner || startBs.phase !== 'battle' || firingBullet) return;

    if (startBs.turn !== currentProfile) {
      Alert.alert(
        `Turno de ${getDisplayName(startBs.turn)}`,
        `Espera a que ${getDisplayName(startBs.turn)} realice su disparo naval.`
      );
      return;
    }

    const shooter = currentProfile;
    const isShooterKarla = shooter === 'Karla';
    const currentShots = isShooterKarla ? startBs.shotsByKarla : startBs.shotsByJavier;
    const targetFleet = isShooterKarla ? startBs.fleetJavier : startBs.fleetKarla;
    const firingMatchId = startBs.matchId;

    if (currentShots.includes(cellIdx)) return;

    const hitShip = targetFleet.find((s) => s.cells.includes(cellIdx));
    const isHit = Boolean(hitShip);

    // Lanzar animación visual del proyectil / bala volando hacia la casilla objetivo
    setFiringBullet({ cellIdx, isHit });
    bulletProgress.setValue(0);
    explosionScale.setValue(0);

    await new Promise<void>((resolve) => {
      Animated.sequence([
        Animated.timing(bulletProgress, {
          toValue: 1,
          duration: 340,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(explosionScale, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => resolve());
    });

    setFiringBullet(null);

    if (isHit) {
      hitBannerScale.setValue(1.22);
      Animated.spring(hitBannerScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }

    await updateAndSyncGames((latestState) => {
      const latestBs = latestState.battleship;
      // Si la partida se reinició durante la animación, no aplicar el disparo viejo
      if (latestBs.phase !== 'battle' || latestBs.matchId !== firingMatchId || latestBs.winner) {
        return latestState;
      }

      const latestShots = isShooterKarla ? latestBs.shotsByKarla : latestBs.shotsByJavier;
      if (latestShots.includes(cellIdx)) {
        return latestState;
      }

      const latestTargetFleet = isShooterKarla ? latestBs.fleetJavier : latestBs.fleetKarla;
      const nextShots = [...latestShots, cellIdx];
      const latestHitShip = latestTargetFleet.find((s) => s.cells.includes(cellIdx));
      const justSunk = latestHitShip
        ? latestHitShip.cells.every((c) => nextShots.includes(c))
        : false;
      const allEnemySunk = latestTargetFleet.every((s) =>
        s.cells.every((c) => nextShots.includes(c))
      );
      const nextWinner: 'Karla' | 'Javier' | null = allEnemySunk ? shooter : null;

      const nextTurn: 'Karla' | 'Javier' = isHit
        ? shooter
        : shooter === 'Karla'
        ? 'Javier'
        : 'Karla';

      let nextLb = latestState.leaderboard;
      if (nextWinner) {
        nextLb = addLeaderboardReward(
          latestState,
          nextWinner,
          UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
          UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
          'battleship'
        );
      }

      return {
        ...latestState,
        leaderboard: nextLb,
        battleship: {
          ...latestBs,
          matchId: latestBs.matchId || createGameUid('bs'),
          lastUpdatedBy: shooter,
          phase: nextWinner ? 'finished' : 'battle',
          shotsByKarla: isShooterKarla ? nextShots : latestBs.shotsByKarla,
          shotsByJavier: !isShooterKarla ? nextShots : latestBs.shotsByJavier,
          turn: nextTurn,
          lastShot: {
            shooter,
            cell: cellIdx,
            hit: isHit,
            sunkShipName: justSunk && latestHitShip ? latestHitShip.name : undefined,
          },
          winner: nextWinner,
          winsKarla: nextWinner === 'Karla' ? (latestBs.winsKarla || 0) + 1 : latestBs.winsKarla || 0,
          winsJavier: nextWinner === 'Javier' ? (latestBs.winsJavier || 0) + 1 : latestBs.winsJavier || 0,
          version: (latestBs.version || 0) + 1,
          updatedAt: Date.now(),
        },
      };
    });
  };

  // Renderizador de un segmento conectado de barco (Proa, Cubierta con Torreta, Popa)
  const renderConnectedShipSegment = (
    ship: BattleshipShip,
    cellIdx: number,
    cellPx: number,
    isHit: boolean,
    isSunk: boolean,
    isSelectedForSetup: boolean
  ) => {
    const segIdx = ship.cells.indexOf(cellIdx);
    const isBow = segIdx === 0;
    const isStern = segIdx === ship.cells.length - 1;
    const isHoriz =
      (ship.orientation ||
        (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';

    const radius = Math.max(8, Math.floor(cellPx * 0.45));
    const SHIP_VIBRANT_COLORS: Record<string, string> = {
      carrier: '#f43f5e',     // Portaaviones (5) - Coral vibrante
      battleship: '#f59e0b',  // Acorazado (4) - Ámbar dorado
      cruiser: '#8b5cf6',     // Crucero (3) - Púrpura elegante
      submarine: '#10b981',   // Submarino (3) - Esmeralda
      destroyer: '#ec4899',   // Destructor (2) - Rosa intenso
    };
    const defaultColor = SHIP_VIBRANT_COLORS[ship.id] || '#0ea5e9';
    const hullBg = isSunk
      ? '#ef4444'
      : isSelectedForSetup
      ? '#38bdf8'
      : defaultColor;
    const hullBorder = isSelectedForSetup ? '#fef08a' : '#ffffff';

    return (
      <View
        pointerEvents="none"
        style={[
          styles.shipHullSegment,
          {
            backgroundColor: hullBg,
            borderColor: hullBorder,
            width: isHoriz ? '100%' : '82%',
            height: isHoriz ? '82%' : '100%',
            borderTopLeftRadius: isBow ? radius : 0,
            borderBottomLeftRadius: isHoriz ? (isBow ? radius : 0) : isStern ? radius : 0,
            borderTopRightRadius: isHoriz ? (isStern ? radius : 0) : isBow ? radius : 0,
            borderBottomRightRadius: isStern ? radius : 0,
            borderLeftWidth: isHoriz ? (isBow ? 1.5 : 0) : 1.5,
            borderRightWidth: isHoriz ? (isStern ? 1.5 : 0) : 1.5,
            borderTopWidth: isHoriz ? 1.5 : isBow ? 1.5 : 0,
            borderBottomWidth: isHoriz ? 1.5 : isStern ? 1.5 : 0,
          },
        ]}
      >
        {/* Detalle interno de cubierta naval (Torreta / Radar / Fuego si fue impactado) */}
        {isSunk ? (
          <Ionicons name="skull" size={Math.max(10, cellPx * 0.5)} color="#fca5a5" />
        ) : isHit ? (
          <Ionicons name="flame" size={Math.max(11, cellPx * 0.54)} color="#fde047" />
        ) : isBow || isStern ? (
          <View style={styles.shipTurretCircle} />
        ) : (
          <View style={styles.shipBridgeDeck} />
        )}
      </View>
    );
  };

  const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  const lb = gamesState.leaderboard || DEFAULT_GAMES_STATE.leaderboard;

  const handleUpdateDrawGuessState = useCallback(
    async (nextDg: any) => {
      await updateAndSyncGames((curr) => {
        const currentVersion = curr.drawGuess?.version || 0;
        return {
          ...curr,
          drawGuess: {
            ...nextDg,
            version: Math.max(nextDg?.version || 0, currentVersion + 1),
          },
        };
      });
    },
    [updateAndSyncGames]
  );

  const handleDrawGuessReward = useCallback(
    async (winner: 'Karla' | 'Javier' | 'Empate', points: number) => {
      await updateAndSyncGames((curr) => {
        let nextLb: GamesState['leaderboard'];
        if (winner === 'Empate') {
          nextLb = addLeaderboardTie(curr, 'drawguess');
        } else {
          nextLb = addLeaderboardReward(
            curr,
            winner,
            points,
            UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
            'drawguess'
          );
        }
        return {
          ...curr,
          leaderboard: nextLb,
        };
      });
    },
    [updateAndSyncGames]
  );

  const handleResetDrawGuess = useCallback(async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const currentVersion = curr.drawGuess?.version || 0;
      const nextDg: GamesState['drawGuess'] = {
        ...DEFAULT_GAMES_STATE.drawGuess,
        phase: 'choosing_word',
        currentRound: 1,
        drawer: 'Karla',
        guesser: 'Javier',
        wordChoices: null,
        selectedWord: null,
        drawerWord: null,
        strokes: [],
        strokesUpdatedAt: Date.now(),
        attempts: [],
        revealedIndices: [],
        usedHint: false,
        scoreKarla: 0,
        scoreJavier: 0,
        guesserScoreKarla: 0,
        guesserScoreJavier: 0,
        correctGuessesKarla: 0,
        correctGuessesJavier: 0,
        roundsHistory: [],
        updatedAt: Date.now(),
        version: currentVersion + 1,
      };
      return {
        ...curr,
        drawGuess: nextDg,
      };
    });
  }, [updateAndSyncGames]);

  // =========================================================================
  // 7. DOMINÓ CLÁSICO (DUELO DE 28 FICHAS)
  // =========================================================================
  const handleResetDomino = useCallback(async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const winsK = curr.domino?.winsKarla || 0;
      const winsJ = curr.domino?.winsJavier || 0;
      const prevScoreK = curr.domino?.scoreKarla || 0;
      const prevScoreJ = curr.domino?.scoreJavier || 0;
      // Reiniciar acumulado si alguno ya alcanzó la meta de 100 puntos
      const resetScores = prevScoreK >= DOMINO_TARGET_SCORE || prevScoreJ >= DOMINO_TARGET_SCORE;
      const currentVersion = curr.domino?.version || 0;
      const customNames = {
        Karla: getDisplayName('Karla'),
        Javier: getDisplayName('Javier'),
      };
      // Comienza quien tenga el doble más alto (regla oficial de dominó)
      const nextDom = startNewDominoGame(undefined, customNames);
      return {
        ...curr,
        domino: {
          ...nextDom,
          winsKarla: winsK,
          winsJavier: winsJ,
          scoreKarla: resetScores ? 0 : prevScoreK,
          scoreJavier: resetScores ? 0 : prevScoreJ,
          updatedAt: Date.now(),
          version: currentVersion + 1,
        },
      };
    });
  }, [getDisplayName, updateAndSyncGames]);

  const prevDominoStateRef = useRef<{ phase?: DominoState['phase']; winner?: UserProfile | 'Empate' | null }>({
    phase: gamesState.domino?.phase,
    winner: gamesState.domino?.winner || null,
  });

  useEffect(() => {
    const dom = gamesState.domino;
    const prev = prevDominoStateRef.current;
    if (!dom) return;

    if (dom.phase === 'playing' && prev.phase === 'round_over') {
      setVictoryCelebration(null);
    } else if (
      dom.phase === 'round_over' &&
      dom.winner &&
      prev.phase !== 'round_over' &&
      activeGame === 'domino'
    ) {
      const winnerProfile = dom.winner === 'Empate' ? null : dom.winner;
      triggerVictoryCelebration({
        winnerName: winnerProfile ? getDisplayName(winnerProfile) : '¡Empate!',
        gameTitle: winnerProfile ? '¡Dominó!' : '¡Juego Trancado!',
        pointsEarned: winnerProfile
          ? UNIFIED_GAME_REWARDS.POINTS_PER_WIN
          : UNIFIED_GAME_REWARDS.POINTS_PER_TIE,
        subtitle:
          dom.lastAction ||
          (winnerProfile
            ? `${getDisplayName(winnerProfile)} ganó la ronda de dominó.`
            : 'La mesa se cerró en empate.'),
        color: '#6366f1',
        onPlayAgain: () => void handleResetDomino(),
      });
    }

    prevDominoStateRef.current = { phase: dom.phase, winner: dom.winner || null };
  }, [
    gamesState.domino?.phase,
    gamesState.domino?.winner,
    gamesState.domino?.lastAction,
    activeGame,
    getDisplayName,
    handleResetDomino,
    triggerVictoryCelebration,
  ]);

  const handlePlayDominoTile = async (tile: DominoTile, side: 'left' | 'right') => {
    const curr = gamesStateRef.current;
    const dom = curr.domino;
    if (!dom || dom.turn !== currentProfile || dom.phase !== 'playing') return;

    const myHand = currentProfile === 'Karla' ? dom.handKarla : dom.handJavier;
    if (!myHand.some((t) => t.id === tile.id)) return;

    const playCheck = canPlayTile(tile, dom.openLeft, dom.openRight);
    if (side === 'left' && !playCheck.canPlayLeft) return;
    if (side === 'right' && !playCheck.canPlayRight) return;

    const result = placeTileOnBoard(dom.board, tile, side, dom.openLeft, dom.openRight);
    if (!result.isValid) return;

    const nextHandKarla =
      currentProfile === 'Karla' ? dom.handKarla.filter((t) => t.id !== tile.id) : dom.handKarla;
    const nextHandJavier =
      currentProfile === 'Javier' ? dom.handJavier.filter((t) => t.id !== tile.id) : dom.handJavier;

    const currentHandAfter = currentProfile === 'Karla' ? nextHandKarla : nextHandJavier;
    const opponentHandAfter = currentProfile === 'Karla' ? nextHandJavier : nextHandKarla;
    let nextPhase: DominoState['phase'] = dom.phase;
    let nextWinner = dom.winner;
    let nextWinsKarla = dom.winsKarla || 0;
    let nextWinsJavier = dom.winsJavier || 0;
    let nextScoreKarla = dom.scoreKarla || 0;
    let nextScoreJavier = dom.scoreJavier || 0;
    let nextLeaderboard = curr.leaderboard;
    let actionLabel = `${getDisplayName(currentProfile)} colocó ${tile.left}-${tile.right}`;

    if (currentHandAfter.length === 0) {
      nextPhase = 'round_over';
      nextWinner = currentProfile;
      const roundPips = calculateHandPips(opponentHandAfter);
      if (currentProfile === 'Karla') {
        nextWinsKarla++;
        nextScoreKarla += roundPips;
      } else {
        nextWinsJavier++;
        nextScoreJavier += roundPips;
      }

      nextLeaderboard = addLeaderboardReward(
        curr,
        currentProfile,
        UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        'domino'
      );
      actionLabel = `${getDisplayName(currentProfile)} colocó su última ficha (+${roundPips} pts).`;
    }

    const nextTurn: UserProfile = currentProfile === 'Karla' ? 'Javier' : 'Karla';

    await updateAndSyncGames({
      ...curr,
      leaderboard: nextLeaderboard,
      domino: {
        ...dom,
        phase: nextPhase,
        board: result.nextBoard,
        openLeft: result.nextOpenLeft,
        openRight: result.nextOpenRight,
        handKarla: nextHandKarla,
        handJavier: nextHandJavier,
        turn: nextTurn,
        winner: nextWinner,
        winsKarla: nextWinsKarla,
        winsJavier: nextWinsJavier,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        consecutivePasses: 0,
        lastAction: actionLabel,
        updatedAt: Date.now(),
        version: (dom.version || 0) + 1,
      },
    });
  };

  const handleDrawDominoBoneyard = async () => {
    const curr = gamesStateRef.current;
    const dom = curr.domino;
    if (!dom || dom.turn !== currentProfile || dom.phase !== 'playing' || dom.boneyard.length === 0) return;

    // Validar que el jugador no tenga jugadas válidas antes de robar del pozo
    const myHand = currentProfile === 'Karla' ? dom.handKarla : dom.handJavier;
    if (getPlayableTiles(myHand, dom.openLeft, dom.openRight).length > 0) return;

    const nextBoneyard = [...dom.boneyard];
    const drawnTile = nextBoneyard.pop()!;

    const nextHandKarla =
      currentProfile === 'Karla' ? [...dom.handKarla, drawnTile] : dom.handKarla;
    const nextHandJavier =
      currentProfile === 'Javier' ? [...dom.handJavier, drawnTile] : dom.handJavier;

    await updateAndSyncGames({
      ...curr,
      domino: {
        ...dom,
        boneyard: nextBoneyard,
        handKarla: nextHandKarla,
        handJavier: nextHandJavier,
        lastAction: `${getDisplayName(currentProfile)} robó una ficha del pozo`,
        updatedAt: Date.now(),
        version: (dom.version || 0) + 1,
      },
    });
  };

  const handlePassDominoTurn = async () => {
    const curr = gamesStateRef.current;
    const dom = curr.domino;
    if (!dom || dom.turn !== currentProfile || dom.phase !== 'playing') return;

    // Validar que el pozo esté vacío y no tenga jugadas antes de pasar
    const myHand = currentProfile === 'Karla' ? dom.handKarla : dom.handJavier;
    if (dom.boneyard.length > 0 || getPlayableTiles(myHand, dom.openLeft, dom.openRight).length > 0) {
      return;
    }

    const consecutive = (dom.consecutivePasses || 0) + 1;
    const nextTurn: UserProfile = currentProfile === 'Karla' ? 'Javier' : 'Karla';

    if (consecutive >= 2) {
      const pipsKarla = calculateHandPips(dom.handKarla);
      const pipsJavier = calculateHandPips(dom.handJavier);

      let winner: UserProfile | 'Empate' = 'Empate';
      let nextLeaderboard = curr.leaderboard;
      let nextWinsK = dom.winsKarla || 0;
      let nextWinsJ = dom.winsJavier || 0;
      let nextScoreK = dom.scoreKarla || 0;
      let nextScoreJ = dom.scoreJavier || 0;

      if (pipsKarla < pipsJavier) {
        winner = 'Karla';
        nextWinsK++;
        nextScoreK += pipsJavier;
        nextLeaderboard = addLeaderboardReward(
          curr,
          'Karla',
          UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
          UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
          'domino'
        );
      } else if (pipsJavier < pipsKarla) {
        winner = 'Javier';
        nextWinsJ++;
        nextScoreJ += pipsKarla;
        nextLeaderboard = addLeaderboardReward(
          curr,
          'Javier',
          UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
          UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
          'domino'
        );
      } else {
        winner = 'Empate';
        nextLeaderboard = addLeaderboardTie(curr, 'domino');
      }

      await updateAndSyncGames({
        ...curr,
        leaderboard: nextLeaderboard,
        domino: {
          ...dom,
          phase: 'round_over',
          winner,
          winsKarla: nextWinsK,
          winsJavier: nextWinsJ,
          scoreKarla: nextScoreK,
          scoreJavier: nextScoreJ,
          consecutivePasses: consecutive,
          lastAction: `¡Tranca! ${getDisplayName('Karla')}: ${pipsKarla} pts vs ${getDisplayName('Javier')}: ${pipsJavier} pts.`,
          updatedAt: Date.now(),
          version: (dom.version || 0) + 1,
        },
      });
      return;
    }

    await updateAndSyncGames({
      ...curr,
      domino: {
        ...dom,
        turn: nextTurn,
        consecutivePasses: consecutive,
        lastAction: `${getDisplayName(currentProfile)} pasó turno`,
        updatedAt: Date.now(),
        version: (dom.version || 0) + 1,
      },
    });
  };

  // =========================================================================
  // 8. UNO (JUEGO DE CARTAS EN PAREJA)
  // =========================================================================
  const handleResetUno = useCallback(async () => {
    setVictoryCelebration(null);
    await updateAndSyncGames((curr) => {
      const winsK = curr.uno?.winsKarla || 0;
      const winsJ = curr.uno?.winsJavier || 0;
      const prevScoreK = curr.uno?.scoreKarla || 0;
      const prevScoreJ = curr.uno?.scoreJavier || 0;
      const resetScores = prevScoreK >= UNO_TARGET_SCORE || prevScoreJ >= UNO_TARGET_SCORE;
      const currentVersion = curr.uno?.version || 0;
      const starter: UserProfile = (winsK + winsJ) % 2 === 0 ? 'Karla' : 'Javier';
      const customNames = {
        Karla: getDisplayName('Karla'),
        Javier: getDisplayName('Javier'),
      };
      const nextUno = startNewUnoGame(starter, customNames);
      return {
        ...curr,
        uno: {
          ...nextUno,
          winsKarla: winsK,
          winsJavier: winsJ,
          scoreKarla: resetScores ? 0 : prevScoreK,
          scoreJavier: resetScores ? 0 : prevScoreJ,
          updatedAt: Date.now(),
          version: currentVersion + 1,
        },
      };
    });
  }, [getDisplayName, updateAndSyncGames]);

  const prevUnoStateRef = useRef<{ phase?: UnoState['phase']; winner?: UserProfile | null }>({
    phase: gamesState.uno?.phase,
    winner: gamesState.uno?.winner || null,
  });

  useEffect(() => {
    const un = gamesState.uno;
    const prev = prevUnoStateRef.current;
    if (!un) return;

    if (un.phase === 'playing' && prev.phase === 'round_over') {
      setVictoryCelebration(null);
    } else if (
      un.phase === 'round_over' &&
      un.winner &&
      prev.phase !== 'round_over' &&
      activeGame === 'uno'
    ) {
      triggerVictoryCelebration({
        winnerName: getDisplayName(un.winner),
        gameTitle: '¡VICTORIA EN UNO!',
        pointsEarned: UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        subtitle: un.lastAction || `¡${getDisplayName(un.winner)} se quedó sin cartas!`,
        color: '#ef4444',
        onPlayAgain: () => void handleResetUno(),
      });
    }

    prevUnoStateRef.current = { phase: un.phase, winner: un.winner || null };
  }, [
    gamesState.uno?.phase,
    gamesState.uno?.winner,
    gamesState.uno?.lastAction,
    activeGame,
    getDisplayName,
    handleResetUno,
    triggerVictoryCelebration,
  ]);

  const handlePlayUnoCard = async (
    card: UnoCard,
    chosenColor?: 'red' | 'yellow' | 'green' | 'blue'
  ) => {
    const curr = gamesStateRef.current;
    const un = curr.uno;
    if (!un || un.turn !== currentProfile || un.phase !== 'playing') return;

    const myHand = currentProfile === 'Karla' ? un.handKarla : un.handJavier;
    if (!canPlayUnoCard(card, un.currentCard, un.currentColor, myHand)) return;

    const customNames = {
      Karla: getDisplayName('Karla'),
      Javier: getDisplayName('Javier'),
    };
    const effect = processCardEffect(un, card, chosenColor, customNames);

    const currentHandAfter =
      currentProfile === 'Karla' ? effect.nextHandKarla : effect.nextHandJavier;
    const opponentHandAfter =
      currentProfile === 'Karla' ? effect.nextHandJavier : effect.nextHandKarla;
    let nextPhase: UnoState['phase'] = un.phase;
    let nextWinner = un.winner;
    let nextWinsKarla = un.winsKarla || 0;
    let nextWinsJavier = un.winsJavier || 0;
    let nextScoreKarla = un.scoreKarla || 0;
    let nextScoreJavier = un.scoreJavier || 0;
    let nextLeaderboard = curr.leaderboard;
    let finalActionMessage = effect.actionMessage;

    if (currentHandAfter.length === 0) {
      nextPhase = 'round_over';
      nextWinner = currentProfile;
      const roundPoints = calculateUnoHandPoints(opponentHandAfter);
      if (currentProfile === 'Karla') {
        nextWinsKarla++;
        nextScoreKarla += roundPoints;
      } else {
        nextWinsJavier++;
        nextScoreJavier += roundPoints;
      }

      nextLeaderboard = addLeaderboardReward(
        curr,
        currentProfile,
        UNIFIED_GAME_REWARDS.POINTS_PER_WIN,
        UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN,
        'uno'
      );
      finalActionMessage = `¡${getDisplayName(currentProfile)} se quedó sin cartas (+${roundPoints} pts de mano rival)!`;
    }

    await updateAndSyncGames({
      ...curr,
      leaderboard: nextLeaderboard,
      uno: {
        ...un,
        phase: nextPhase,
        deck: effect.nextDeck,
        discardPile: effect.nextDiscardPile,
        currentCard: card,
        currentColor: effect.nextCurrentColor,
        handKarla: effect.nextHandKarla,
        handJavier: effect.nextHandJavier,
        turn: effect.nextTurn,
        hasDrawnThisTurn: false,
        calledUnoKarla: effect.nextCalledUnoKarla,
        calledUnoJavier: effect.nextCalledUnoJavier,
        winner: nextWinner,
        winsKarla: nextWinsKarla,
        winsJavier: nextWinsJavier,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        lastAction: finalActionMessage,
        updatedAt: Date.now(),
        version: (un.version || 0) + 1,
      },
    });
  };

  const handleDrawUnoCard = async () => {
    const curr = gamesStateRef.current;
    const un = curr.uno;
    if (!un || un.turn !== currentProfile || un.phase !== 'playing' || un.hasDrawnThisTurn) return;

    const drawResult = drawCardsWithRecycle(un.deck, un.discardPile, un.currentCard, 1);
    if (drawResult.drawn.length === 0) return;

    const drawnCard = drawResult.drawn[0];
    const nextHandKarla =
      currentProfile === 'Karla' ? [...un.handKarla, drawnCard] : un.handKarla;
    const nextHandJavier =
      currentProfile === 'Javier' ? [...un.handJavier, drawnCard] : un.handJavier;

    const myNextHand = currentProfile === 'Karla' ? nextHandKarla : nextHandJavier;
    const canPlayDrawn = canPlayUnoCard(drawnCard, un.currentCard, un.currentColor, myNextHand);
    const nextTurn = canPlayDrawn
      ? currentProfile
      : currentProfile === 'Karla'
      ? 'Javier'
      : 'Karla';

    await updateAndSyncGames({
      ...curr,
      uno: {
        ...un,
        deck: drawResult.nextDeck,
        discardPile: drawResult.nextDiscardPile,
        handKarla: nextHandKarla,
        handJavier: nextHandJavier,
        turn: nextTurn,
        hasDrawnThisTurn: canPlayDrawn,
        calledUnoKarla: nextHandKarla.length <= 1 ? un.calledUnoKarla : false,
        calledUnoJavier: nextHandJavier.length <= 1 ? un.calledUnoJavier : false,
        lastAction: `${getDisplayName(currentProfile)} robó 1 carta`,
        updatedAt: Date.now(),
        version: (un.version || 0) + 1,
      },
    });
  };

  const handlePassUnoTurn = async () => {
    const curr = gamesStateRef.current;
    const un = curr.uno;
    if (!un || un.turn !== currentProfile || un.phase !== 'playing' || !un.hasDrawnThisTurn) return;

    const nextTurn: UserProfile = currentProfile === 'Karla' ? 'Javier' : 'Karla';
    await updateAndSyncGames({
      ...curr,
      uno: {
        ...un,
        turn: nextTurn,
        hasDrawnThisTurn: false,
        lastAction: `${getDisplayName(currentProfile)} pasó turno tras robar`,
        updatedAt: Date.now(),
        version: (un.version || 0) + 1,
      },
    });
  };

  const handleCallUno = async () => {
    const curr = gamesStateRef.current;
    const un = curr.uno;
    if (!un) return;

    await updateAndSyncGames({
      ...curr,
      uno: {
        ...un,
        calledUnoKarla: currentProfile === 'Karla' ? true : un.calledUnoKarla,
        calledUnoJavier: currentProfile === 'Javier' ? true : un.calledUnoJavier,
        lastAction: `¡${getDisplayName(currentProfile)} cantó UNO!`,
        updatedAt: Date.now(),
        version: (un.version || 0) + 1,
      },
    });
  };

  const handleCatchUnoMiss = async () => {
    const curr = gamesStateRef.current;
    const un = curr.uno;
    if (!un || un.phase !== 'playing') return;
    const partnerProfile: UserProfile = currentProfile === 'Karla' ? 'Javier' : 'Karla';
    const partnerHand = partnerProfile === 'Karla' ? un.handKarla : un.handJavier;
    const partnerCalledUno = partnerProfile === 'Karla' ? un.calledUnoKarla : un.calledUnoJavier;

    if (partnerHand.length === 1 && !partnerCalledUno) {
      const customNames = {
        Karla: getDisplayName('Karla'),
        Javier: getDisplayName('Javier'),
      };
      const pen = penalizeMissedUno(un, partnerProfile, customNames);
      await updateAndSyncGames({
        ...curr,
        uno: {
          ...un,
          deck: pen.nextDeck,
          discardPile: pen.nextDiscardPile,
          handKarla: pen.nextHandKarla,
          handJavier: pen.nextHandJavier,
          calledUnoKarla: pen.nextCalledUnoKarla,
          calledUnoJavier: pen.nextCalledUnoJavier,
          lastAction: pen.actionMessage,
          updatedAt: Date.now(),
          version: (un.version || 0) + 1,
        },
      });
    }
  };

  // Renderizador adaptable del juego activo (En Pantalla Completa se transforma en Consola Pro Independiente)
  const renderActiveGameArena = (isFull: boolean) => {
    const proMaxBoard = Math.min(SCREEN_W - 24, Math.floor(SCREEN_H * 0.48), 380);
    const boardPx = isFull ? proMaxBoard : COMPACT_BOARD_SIZE;
    const chessCellPx = Math.floor((boardPx - 18) / 8);
    const sudokuCellPx = Math.floor((boardPx - 6) / 9);
    const bsCoordHeaderPx = isFull ? 16 : 12;
    const battleshipCellPx = Math.floor((boardPx - bsCoordHeaderPx - 4) / 10);

    return (
      <View
        style={[
          styles.arenaCard,
          { width: '100%', alignItems: 'center' },
          isFull && { backgroundColor: 'transparent', borderWidth: 0, padding: 0 },
          !isFull && { backgroundColor: colors.surface, borderColor: colors.border },
          (activeGame === 'drawguess' || activeGame === 'domino' || activeGame === 'uno') && {
            flex: 1,
            width: '100%',
            padding: 0,
            margin: 0,
          },
        ]}
      >

        {/* ================= 1. TRES EN RAYA (MODULAR) ================= */}
        {activeGame === 'tictactoe' && (
          <TicTacToeArena
            boardPx={boardPx}
            isFull={isFull}
            primaryColor={primaryColor}
            ticTacToeState={gamesState.ticTacToe}
            onCellPress={(idx) => void handleTicTacToePress(idx)}
            onNewRound={() => void handleNewTicTacToeRound()}
            onToggleInfiniteMode={() => void handleToggleTicTacToeMode()}
          />
        )}

                {/* ================= 2. SUDOKU (MODULAR) ================= */}
        {activeGame === 'sudoku' && (
          <SudokuArena
            sudoku={sudoku}
            isFull={isFull}
            sudokuCellPx={sudokuCellPx}
            primaryColor={primaryColor}
            currentProfile={currentProfile}
            isNoteMode={isNoteMode}
            setIsNoteMode={setIsNoteMode}
            selectedSudokuCell={selectedSudokuCell}
            onSelectCell={handleSelectSudokuCell}
            onNumberPress={(num) => void handleSudokuNumberPress(num)}
            onHint={() => void handleSudokuHint()}
            onNewGame={(diff) => void handleNewSudokuGame(diff)}
            isSudokuGameOver={isSudokuGameOver}
          />
        )}

                {/* ================= 3. AJEDREZ (MODULAR) ================= */}
        {activeGame === 'chess' && (
          <ChessArena
            chess={gamesState.chess}
            isFull={isFull}
            chessCellPx={chessCellPx}
            primaryColor={primaryColor}
            isKingInCheck={isKingInCheck}
            selectedChessPos={selectedChessPos}
            validChessTargets={validChessTargets}
            chessHistoryLength={chessHistory.length}
            onCellPress={(r, c, promoteTo) => void handleChessCellPress(r, c, promoteTo)}
            onUndo={() => void handleUndoChessMove()}
            onReset={() => handleResetChess(false)}
          />
        )}

        {/* ================= 4. AHORCADO ================= */}
        {activeGame === 'hangman' && (
          <HangmanArena
            hangman={hangman}
            isFull={isFull}
            primaryColor={primaryColor}
            wrongGuessesCount={wrongGuessesCount}
            maxWrong={maxWrong}
            petAccessory={petMeta.accessory}
            onGuessLetter={(letter) => void handleGuessLetter(letter)}
            onRandomWord={() => void handleRandomHangmanWord()}
            onChallengePartner={() => setIsCustomWordModalOpen(true)}
            onRevealLetter={() => void handleRevealHangmanLetter()}
          />
        )}

                {/* ================= 5. BATTLESHIP 10x10 (MODULAR) ================= */}
        {activeGame === 'battleship' && (
          <BattleshipArena
            boardPx={boardPx}
            isFull={isFull}
            primaryColor={primaryColor}
            currentProfile={currentProfile}
            battleshipState={bs}
            onSendInvite={() => void handleSendBattleshipInvite()}
            onAcceptInvite={() => void handleAcceptBattleshipInvite()}
            onReadyFleet={(fleet, ready = true) => {
              setLocalSetupFleet(fleet);
              void handleConfirmFleetReady(fleet, ready);
            }}
            onFire={(idx) => void handleBattleshipFire(idx)}
            onReset={() => void handleResetBattleship()}
            onDragStateChange={setIsDraggingShip}
          />
        )}

        {/* ================= 6. DIBUJA Y ADIVINA (MODULAR) ================= */}
        {activeGame === 'drawguess' && (
          <DrawGuessArena
            currentProfile={currentProfile}
            primaryColor="#10b981"
            gameState={gamesState.drawGuess || DEFAULT_GAMES_STATE.drawGuess}
            onUpdateGameState={handleUpdateDrawGuessState}
            onFinishGameReward={handleDrawGuessReward}
            onBack={() => setActiveGame(null)}
            onOpenScoreBreakdown={(p) => handleOpenScoreBreakdown(p || 'all')}
          />
        )}

        {/* ================= 7. DOMINÓ (MODULAR) ================= */}
        {activeGame === 'domino' && (() => {
          const dom = gamesState.domino || DEFAULT_GAMES_STATE.domino;
          const myHand = currentProfile === 'Karla' ? dom.handKarla : dom.handJavier;
          const partnerTileCount = currentProfile === 'Karla' ? dom.handJavier.length : dom.handKarla.length;
          const myScore = currentProfile === 'Karla' ? (dom.scoreKarla || 0) : (dom.scoreJavier || 0);
          const partnerScore = currentProfile === 'Karla' ? (dom.scoreJavier || 0) : (dom.scoreKarla || 0);

          return (
            <DominoArena
              myHand={myHand}
              partnerTileCount={partnerTileCount}
              boneyardCount={dom.boneyard.length}
              board={dom.board}
              openLeft={dom.openLeft}
              openRight={dom.openRight}
              openingTileId={dom.openingTileId}
              myScore={myScore}
              partnerScore={partnerScore}
              partnerName={getDisplayName(currentProfile === 'Karla' ? 'Javier' : 'Karla')}
              isMyTurn={dom.turn === currentProfile}
              isPlaying={dom.phase === 'playing'}
              lastAction={dom.lastAction}
              primaryColor="#6366f1"
              onPlayTile={(tile, side) => void handlePlayDominoTile(tile, side)}
              onDrawBoneyard={() => void handleDrawDominoBoneyard()}
              onPassTurn={() => void handlePassDominoTurn()}
              onNewRound={() => void handleResetDomino()}
            />
          );
        })()}

        {/* ================= 8. UNO (MODULAR) ================= */}
        {activeGame === 'uno' && (() => {
          const un = gamesState.uno || DEFAULT_GAMES_STATE.uno;
          const myHand = currentProfile === 'Karla' ? un.handKarla : un.handJavier;
          const partnerCardCount = currentProfile === 'Karla' ? un.handJavier.length : un.handKarla.length;
          const calledPartner = currentProfile === 'Karla' ? un.calledUnoJavier : un.calledUnoKarla;
          const calledSelf = currentProfile === 'Karla' ? un.calledUnoKarla : un.calledUnoJavier;
          const myScore = currentProfile === 'Karla' ? (un.scoreKarla || 0) : (un.scoreJavier || 0);
          const partnerScore = currentProfile === 'Karla' ? (un.scoreJavier || 0) : (un.scoreKarla || 0);

          return (
            <UnoArena
              myHand={myHand}
              partnerCardCount={partnerCardCount}
              deckCount={un.deck.length}
              currentCard={un.currentCard}
              currentColor={un.currentColor}
              partnerName={getDisplayName(currentProfile === 'Karla' ? 'Javier' : 'Karla')}
              isMyTurn={un.turn === currentProfile}
              isPlaying={un.phase === 'playing'}
              hasDrawnThisTurn={Boolean(un.hasDrawnThisTurn)}
              myScore={myScore}
              partnerScore={partnerScore}
              calledUnoPartner={calledPartner}
              calledUnoSelf={calledSelf}
              lastAction={un.lastAction}
              primaryColor="#ef4444"
              onPlayCard={(card, color) => void handlePlayUnoCard(card, color)}
              onDrawCard={() => void handleDrawUnoCard()}
              onPassTurn={() => void handlePassUnoTurn()}
              onCallUno={() => void handleCallUno()}
              onCatchUnoMiss={() => void handleCatchUnoMiss()}
              onNewRound={() => void handleResetUno()}
            />
          );
        })()}
      </View>
    );
  };

  const activeMatches = useMemo(() => {
    const list: Array<{
      id: GameTab;
      name: string;
      icon: string;
      statusText: string;
      detail: string;
      isMyTurn: boolean;
    }> = [];

    // TicTacToe
    if (
      !gamesState.ticTacToe.winner &&
      gamesState.ticTacToe.board.some((c) => c !== null)
    ) {
      const isMyTurn = gamesState.ticTacToe.turn === currentProfile;
      list.push({
        id: 'tictactoe',
        name: '3 en Raya',
        icon: 'grid',
        statusText: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.ticTacToe.turn)}`,
        detail: isMyTurn ? 'Te toca marcar casilla' : 'Esperando tirada',
        isMyTurn,
      });
    }

    // Battleship
    if (!gamesState.battleship.winner && gamesState.battleship.phase === 'battle') {
      const isMyTurn = gamesState.battleship.turn === currentProfile;
      list.push({
        id: 'battleship',
        name: 'Battleship',
        icon: 'boat',
        statusText: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.battleship.turn)}`,
        detail: isMyTurn ? 'Dispara al radar enemigo' : 'Esperando ataque',
        isMyTurn,
      });
    }

    // Chess
    if (!gamesState.chess.winner && (gamesState.chess.lastMove !== null || gamesState.chess.capturedByW.length > 0 || gamesState.chess.capturedByB.length > 0)) {
      const isWhite = currentProfile === 'Karla';
      const isMyTurn =
        (gamesState.chess.turn === 'w' && isWhite) || (gamesState.chess.turn === 'b' && !isWhite);
      list.push({
        id: 'chess',
        name: 'Ajedrez',
        icon: 'trophy',
        statusText: isMyTurn ? 'Tu turno' : 'Turno de tu pareja',
        detail: isMyTurn ? 'Haz tu próximo movimiento' : 'Pensando jugada',
        isMyTurn,
      });
    }

    // Sudoku
    if (
      !sudoku.completed &&
      sudoku.board.some((row, r) =>
        row.some((v, c) => v !== 0 && !sudoku.fixed[r][c])
      )
    ) {
      list.push({
        id: 'sudoku',
        name: 'Sudoku',
        icon: 'apps',
        statusText: 'En curso',
        detail: `${sudoku.mistakes}/${MAX_SUDOKU_MISTAKES} errores`,
        isMyTurn: true,
      });
    }

    // Hangman
    if (gamesState.hangman.status === 'playing' && gamesState.hangman.guessed.length > 0) {
      const wrongCount = gamesState.hangman.guessed.filter(
        (l) => !gamesState.hangman.word.toUpperCase().includes(l)
      ).length;
      list.push({
        id: 'hangman',
        name: 'Ahorcado',
        icon: 'extension-puzzle',
        statusText: 'En curso',
        detail: `${gamesState.hangman.category} • ${6 - wrongCount} vidas`,
        isMyTurn: true,
      });
    }

    // Draw & Guess
    if (
      gamesState.drawGuess &&
      gamesState.drawGuess.phase !== 'game_over' &&
      gamesState.drawGuess.phase !== 'idle'
    ) {
      const isMeDrawer = gamesState.drawGuess.drawer === currentProfile;
      const drawerName = getDisplayName(gamesState.drawGuess.drawer);
      const isChoosing = gamesState.drawGuess.phase === 'choosing_word';
      list.push({
        id: 'drawguess',
        name: 'Dibuja y Adivina',
        icon: 'brush',
        statusText: isChoosing
          ? (isMeDrawer ? 'Elige palabra' : `${drawerName} elige`)
          : (isMeDrawer ? 'Te toca dibujar' : 'Te toca adivinar'),
        detail: `Ronda ${gamesState.drawGuess.currentRound} de 6`,
        isMyTurn: isChoosing ? isMeDrawer : true,
      });
    }

    // Dominó
    if (gamesState.domino && gamesState.domino.phase === 'playing' && gamesState.domino.board.length > 0) {
      const isMyTurn = gamesState.domino.turn === currentProfile;
      list.push({
        id: 'domino',
        name: 'Dominó',
        icon: 'apps',
        statusText: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.domino.turn)}`,
        detail: isMyTurn ? 'Coloca una ficha en la mesa' : 'Esperando ficha',
        isMyTurn,
      });
    }

    // UNO
    if (gamesState.uno && gamesState.uno.phase === 'playing') {
      const isMyTurn = gamesState.uno.turn === currentProfile;
      list.push({
        id: 'uno',
        name: 'UNO',
        icon: 'flame',
        statusText: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.uno.turn)}`,
        detail: isMyTurn ? 'Juega carta o roba del mazo' : 'Esperando jugada',
        isMyTurn,
      });
    }

    return list;
  }, [gamesState, currentProfile, sudoku, getDisplayName]);

  const getGameStatus = useCallback(
    (id: GameTab) => {
      switch (id) {
        case 'tictactoe': {
          if (gamesState.ticTacToe.winner) return { text: 'Nueva partida', isMyTurn: false };
          const hasBoardMoves = gamesState.ticTacToe.board.some((c) => c !== null);
          const hasScores = (gamesState.ticTacToe.scoreKarla || 0) > 0 || (gamesState.ticTacToe.scoreJavier || 0) > 0;
          if (!hasBoardMoves && !hasScores) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const isMyTurn = gamesState.ticTacToe.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : 'Su turno',
            isMyTurn,
          };
        }
        case 'battleship': {
          if (gamesState.battleship.phase === 'idle' || gamesState.battleship.phase === 'finished' || gamesState.battleship.winner) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          if (gamesState.battleship.phase === 'setup') {
            const hasWins = (gamesState.battleship.winsKarla || 0) > 0 || (gamesState.battleship.winsJavier || 0) > 0;
            if (!gamesState.battleship.readyKarla && !gamesState.battleship.readyJavier && !hasWins) {
              return { text: 'Nueva partida', isMyTurn: false };
            }
            const isMyTurn = currentProfile === 'Karla' ? !gamesState.battleship.readyKarla : !gamesState.battleship.readyJavier;
            return { text: isMyTurn ? 'Tu turno' : 'Su turno', isMyTurn };
          }
          const isMyTurn = gamesState.battleship.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : 'Su turno',
            isMyTurn,
          };
        }
        case 'chess': {
          if (gamesState.chess.winner) return { text: 'Nueva partida', isMyTurn: false };
          const hasMoves = chessHistory.length > 0 || gamesState.chess.lastMove !== null;
          const hasScores = (gamesState.chess.winsKarla || 0) > 0 || (gamesState.chess.winsJavier || 0) > 0;
          if (!hasMoves && !hasScores) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const isWhite = currentProfile === 'Karla';
          const isMyTurn =
            (gamesState.chess.turn === 'w' && isWhite) || (gamesState.chess.turn === 'b' && !isWhite);
          return {
            text: isMyTurn ? 'Tu turno' : 'Su turno',
            isMyTurn,
          };
        }
        case 'sudoku': {
          const hasUserInput = sudoku.board.some((row, r) =>
            row.some((v, c) => v !== 0 && !sudoku.fixed[r][c])
          );
          if (sudoku.completed || !hasUserInput) return { text: 'Nueva partida', isMyTurn: false };
          return { text: 'Tu turno', isMyTurn: true };
        }
        case 'hangman': {
          const hasActivity = gamesState.hangman.guessed.length > 0 || Boolean(gamesState.hangman.isPartnerChallenge);
          if (gamesState.hangman.status !== 'playing' || !hasActivity) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          return { text: 'Tu turno', isMyTurn: true };
        }
        case 'drawguess': {
          const dg = gamesState.drawGuess;
          if (!dg || dg.phase === 'game_over' || dg.phase === 'idle') return { text: 'Nueva partida', isMyTurn: false };
          const isDrawer = (dg.drawer || 'Karla') === currentProfile;
          if (dg.phase === 'choosing_word') {
            return {
              text: isDrawer ? 'Tu turno' : 'Su turno',
              isMyTurn: isDrawer,
            };
          }
          return { text: 'Tu turno', isMyTurn: true };
        }
        case 'domino': {
          const dom = gamesState.domino;
          if (!dom || dom.phase === 'round_over' || dom.winner || dom.phase === 'idle') {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const hasWins = (dom.winsKarla || 0) > 0 || (dom.winsJavier || 0) > 0;
          if ((dom.board?.length || 0) === 0 && !dom.lastAction && !hasWins) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const isMyTurn = dom.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : 'Su turno',
            isMyTurn,
          };
        }
        case 'uno': {
          const un = gamesState.uno;
          if (!un || un.phase === 'round_over' || un.winner || un.phase === 'idle') {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const hasWins = (un.winsKarla || 0) > 0 || (un.winsJavier || 0) > 0;
          if ((un.discardPile?.length || 0) <= 1 && !un.lastAction && !hasWins) {
            return { text: 'Nueva partida', isMyTurn: false };
          }
          const isMyTurn = un.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : 'Su turno',
            isMyTurn,
          };
        }
      }
    },
    [gamesState, currentProfile, sudoku, chessHistory.length]
  );

  const getGameNaturalStatus = useCallback(
    (id: GameTab) => {
      const partnerName = currentProfile === 'Karla' ? 'Javier' : 'Karlita';
      switch (id) {
        case 'tictactoe': {
          if (gamesState.ticTacToe.winner) {
            if (gamesState.ticTacToe.winner === 'Empate') return 'Ronda empatada';
            return gamesState.ticTacToe.winner === currentProfile
              ? '¡Ganaste la última ronda!'
              : `${partnerName} ganó la última ronda`;
          }
          return gamesState.ticTacToe.turn === currentProfile
            ? '¡Tu turno de marcar!'
            : `Turno de ${partnerName}`;
        }
        case 'battleship': {
          if (gamesState.battleship.winner) {
            return gamesState.battleship.winner === currentProfile
              ? '¡Ganaste la batalla naval!'
              : `${partnerName} ganó la batalla`;
          }
          if (gamesState.battleship.phase === 'setup') {
            const isReady =
              currentProfile === 'Karla'
                ? gamesState.battleship.readyKarla
                : gamesState.battleship.readyJavier;
            return isReady
              ? `Esperando que ${partnerName} acomode su flota`
              : 'Falta acomodar tu flota';
          }
          return gamesState.battleship.turn === currentProfile
            ? '¡Tu turno de disparar!'
            : `Turno de disparar de ${partnerName}`;
        }
        case 'chess': {
          if (gamesState.chess.winner) {
            const winnerProfile = gamesState.chess.winner === 'w' ? 'Karla' : 'Javier';
            return winnerProfile === currentProfile
              ? '¡Ganaste por jaque mate!'
              : `${partnerName} ganó por jaque mate`;
          }
          const isWhite = currentProfile === 'Karla';
          const isMyTurn =
            (gamesState.chess.turn === 'w' && isWhite) ||
            (gamesState.chess.turn === 'b' && !isWhite);
          return isMyTurn ? 'Tu turno de mover' : `Turno de mover de ${partnerName}`;
        }
        case 'sudoku': {
          if (sudoku.completed) return '¡Tablero completado juntos!';
          const filledCount = sudoku.board.flat().filter((v) => v !== 0).length;
          return `Partida en curso (${filledCount}/81 celdas)`;
        }
        case 'hangman': {
          if (gamesState.hangman.status === 'won') return '¡Palabra descifrada!';
          if (gamesState.hangman.status === 'lost') return 'Palabra no descifrada';
          if (gamesState.hangman.isPartnerChallenge) {
            return `${partnerName} te retó una palabra`;
          }
          const lives = 6 - wrongGuessesCount;
          return `Adivina la palabra (${lives} vidas restantes)`;
        }
        case 'drawguess': {
          const dg = gamesState.drawGuess;
          if (!dg || dg.phase === 'game_over') return 'Partida finalizada';
          const isDrawer = dg.drawer === currentProfile;
          if (dg.phase === 'choosing_word') {
            return isDrawer
              ? 'Te toca elegir la palabra'
              : `Esperando que ${partnerName} elija palabra`;
          }
          if (dg.phase === 'drawing') {
            return isDrawer
              ? '¡Dibuja la palabra en el lienzo!'
              : '¡Adivina lo que se está dibujando!';
          }
          return `Ronda ${dg.currentRound} de 6 finalizada`;
        }
        case 'domino': {
          const dom = gamesState.domino;
          if (!dom || dom.phase === 'idle') return 'Mesa clásica de 28 fichas';
          if (dom.winner) {
            return dom.winner === currentProfile
              ? '¡Ganaste la mano de dominó!'
              : dom.winner === 'Empate'
              ? 'Mano trancada en empate'
              : `${partnerName} ganó la mano`;
          }
          return dom.turn === currentProfile
            ? '¡Te toca colocar ficha en la mesa!'
            : `Esperando ficha de ${partnerName}`;
        }
        case 'uno': {
          const un = gamesState.uno;
          if (!un || un.phase === 'idle') return 'Colores, números y comodines';
          if (un.winner) {
            return un.winner === currentProfile
              ? '¡Ganaste la partida de UNO!'
              : `${partnerName} ganó la partida`;
          }
          return un.turn === currentProfile
            ? '¡Tu turno de tirar o robar carta!'
            : `Turno de ${partnerName}`;
        }
      }
    },
    [gamesState, currentProfile, sudoku, wrongGuessesCount]
  );

  const getGameTurnLabel = (id: GameTab) => {
    switch (id) {
      case 'tictactoe': {
        const turn = gamesState.ticTacToe.turn;
        return turn === currentProfile ? 'Tu turno' : `Turno de ${getDisplayName(turn)}`;
      }
      case 'sudoku':
        return 'Colaborativo';
      case 'chess': {
        const isWhite = currentProfile === 'Karla';
        const isMyTurn =
          (gamesState.chess.turn === 'w' && isWhite) || (gamesState.chess.turn === 'b' && !isWhite);
        return isMyTurn
          ? 'Tu turno'
          : `Turno de ${getDisplayName(gamesState.chess.turn === 'w' ? 'Karla' : 'Javier')}`;
      }
      case 'battleship': {
        if (gamesState.battleship.phase === 'setup') return 'Acomodo de Flota';
        const turn = gamesState.battleship.turn;
        return turn === currentProfile ? 'Tu turno de disparar' : `Turno de ${getDisplayName(turn)}`;
      }
      case 'hangman':
        return 'Adivinando palabra';
      case 'drawguess': {
        const dg = gamesState.drawGuess;
        if (!dg) return 'Dibuja y Adivina';
        const drawer = dg.drawer || 'Karla';
        const isDrawer = drawer === currentProfile;
        const drawerName = getDisplayName(drawer);
        if (dg.phase === 'choosing_word') {
          return isDrawer ? 'Elige tu palabra' : `Turno de ${drawerName}`;
        }
        if (dg.phase === 'drawing') {
          return isDrawer ? 'Tú dibujas' : `${drawerName} dibuja`;
        }
        if (dg.phase === 'round_end') {
          return 'Fin de ronda';
        }
        return 'Dibuja y Adivina';
      }
      case 'domino': {
        const dom = gamesState.domino;
        const turn = dom?.turn || 'Karla';
        return turn === currentProfile ? 'Tu turno de tirar' : `Turno de ${getDisplayName(turn)}`;
      }
      case 'uno': {
        const un = gamesState.uno;
        const turn = un?.turn || 'Karla';
        return turn === currentProfile ? 'Tu turno de tirar' : `Turno de ${getDisplayName(turn)}`;
      }
    }
  };

  const handleResetCurrentGame = () => {
    if (!activeGame) return;
    const gameLabel = ALL_GAMES.find((g) => g.id === activeGame)?.label || 'este juego';
    Alert.alert(
      `¿Reiniciar ${gameLabel}?`,
      'Se reiniciará la partida actual para ambos jugadores. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            switch (activeGame) {
              case 'tictactoe':
                void handleNewTicTacToeRound();
                break;
              case 'sudoku':
                void handleNewSudokuGame(sudoku.difficulty);
                break;
              case 'chess':
                void handleResetChess();
                break;
              case 'battleship':
                void handleResetBattleship();
                break;
              case 'hangman':
                void handleRandomHangmanWord();
                break;
              case 'drawguess':
                void handleResetDrawGuess();
                break;
              case 'domino':
                void handleResetDomino();
                break;
              case 'uno':
                void handleResetUno();
                break;
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      {/* ================= VISTA LOBBY ZERO-SCROLL: MARCADOR + GRID 2x4 SIN SCROLL ================= */}
      <View style={styles.lobbyZeroScrollContainer}>
        {/* 1. Marcador Editorial Bento Karlita vs Javier con Pochito ("Panzón") */}
        {(() => {
          const karlaAvatarUri = getAvatarUri('Karla');
          const javierAvatarUri = getAvatarUri('Javier');
          const karlaName = getDisplayName('Karla');
          const javierName = getDisplayName('Javier');
          const karlaLeading = lb.pointsKarla > lb.pointsJavier;
          const javierLeading = lb.pointsJavier > lb.pointsKarla;
          const totalPts = lb.pointsKarla + lb.pointsJavier;
          const karlaRatio = totalPts > 0 ? Math.max(12, Math.min(88, Math.round((lb.pointsKarla / totalPts) * 100))) : 50;
          const javierRatio = 100 - karlaRatio;

          return (
            <LinearGradient
              colors={isDark ? [colors.surface, colors.surfaceAlt] : [colors.primaryLight, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.lobbyScoreboard, { borderColor: colors.border }]}
            >
              <View style={styles.lobbyScoreTopRow}>
                {/* Karlita */}
                <TouchableOpacity
                  style={styles.lobbyPlayer}
                  onPress={() => handleOpenScoreBreakdown('Karla')}
                  activeOpacity={0.75}
                  accessibilityLabel={`Ver desglose de puntos de ${karlaName}`}
                >
                  <View style={styles.lobbyAvatarWrap}>
                    <View
                      style={[
                        styles.lobbyAvatarCircle,
                        {
                          backgroundColor: '#fdf2f8',
                          borderColor: karlaLeading ? '#ec4899' : '#f472b6',
                          borderWidth: karlaLeading ? 2.2 : 1.5,
                        },
                      ]}
                    >
                      {karlaAvatarUri ? (
                        <Image source={{ uri: karlaAvatarUri }} style={styles.lobbyAvatarImg} />
                      ) : (
                        <Text style={[styles.lobbyAvatarText, { color: '#be185d' }]}>
                          {karlaName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    {karlaLeading && (
                      <View style={styles.leaderCrownBadge}>
                        <Text style={styles.leaderCrownEmoji}>👑</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.lobbyPlayerName, { color: colors.text }]} numberOfLines={1}>
                      {karlaName}
                    </Text>
                    <View style={styles.lobbyScorePills}>
                      <Text style={[styles.lobbyPoints, { color: '#be185d' }]}>{lb.pointsKarla} pts</Text>
                      <Text style={[styles.lobbyStars, { color: colors.textMuted }]}>• {lb.trophiesKarla}★</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Árbitro Pochito + Pill Duelo de Pareja */}
                <TouchableOpacity
                  style={styles.lobbyCenterMascotBtn}
                  onPress={() => handleOpenScoreBreakdown('all')}
                  activeOpacity={0.75}
                  accessibilityLabel="Ver desglose comparativo de todos los juegos"
                >
                  <View style={styles.lobbyPochitoMiniWrap}>
                    <View style={{ transform: [{ scale: 0.78 }] }}>
                      <PochitoBear mood="feliz" size="sm" accessory={petMeta.accessory} />
                    </View>
                  </View>
                  <View style={[styles.lobbyVsPill, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}35` }]}>
                    <Text style={[styles.lobbyVsPillText, { color: colors.primary }]}>DUELO</Text>
                  </View>
                </TouchableOpacity>

                {/* Javier */}
                <TouchableOpacity
                  style={[styles.lobbyPlayer, { justifyContent: 'flex-end', flexDirection: 'row-reverse' }]}
                  onPress={() => handleOpenScoreBreakdown('Javier')}
                  activeOpacity={0.75}
                  accessibilityLabel={`Ver desglose de puntos de ${javierName}`}
                >
                  <View style={styles.lobbyAvatarWrap}>
                    <View
                      style={[
                        styles.lobbyAvatarCircle,
                        {
                          backgroundColor: '#f0f9ff',
                          borderColor: javierLeading ? '#0ea5e9' : '#7dd3fc',
                          borderWidth: javierLeading ? 2.2 : 1.5,
                        },
                      ]}
                    >
                      {javierAvatarUri ? (
                        <Image source={{ uri: javierAvatarUri }} style={styles.lobbyAvatarImg} />
                      ) : (
                        <Text style={[styles.lobbyAvatarText, { color: '#0369a1' }]}>
                          {javierName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    {javierLeading && (
                      <View style={styles.leaderCrownBadge}>
                        <Text style={styles.leaderCrownEmoji}>👑</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={[styles.lobbyPlayerName, { color: colors.text }]} numberOfLines={1}>
                      {javierName}
                    </Text>
                    <View style={styles.lobbyScorePills}>
                      <Text style={[styles.lobbyStars, { color: colors.textMuted }]}>{lb.trophiesJavier}★ •</Text>
                      <Text style={[styles.lobbyPoints, { color: '#0284c7' }]}>{lb.pointsJavier} pts</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Barra Visual del Duelo */}
              <View style={[styles.duelTrack, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                <LinearGradient
                  colors={['#f472b6', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.duelFillLeft, { flex: karlaRatio }]}
                />
                <View style={{ width: 2, backgroundColor: isDark ? colors.surface : '#ffffff' }} />
                <LinearGradient
                  colors={['#38bdf8', '#0284c7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.duelFillRight, { flex: javierRatio }]}
                />
              </View>
            </LinearGradient>
          );
        })()}

        {/* 2. Grid Bento 2x4 Zero-Scroll */}
        {(() => {
          // Ordenar juegos: donde es el turno del usuario van PRIMERO
          const sortedGames = [...ALL_GAMES].sort((a, b) => {
            const stA = getGameStatus(a.id);
            const stB = getGameStatus(b.id);
            if (stA.isMyTurn && !stB.isMyTurn) return -1;
            if (!stA.isMyTurn && stB.isMyTurn) return 1;
            return 0;
          });

          const renderCard = (g: typeof ALL_GAMES[0]) => {
            const status = getGameStatus(g.id);
            const color = g.iconColor;
            const isMyTurn = status.isMyTurn;

            let miniStats = '';
            if (g.id === 'tictactoe') {
              const winsK = gamesState.ticTacToe.scoreKarla || 0;
              const winsJ = gamesState.ticTacToe.scoreJavier || 0;
              miniStats = winsK > 0 || winsJ > 0 ? `${winsK} - ${winsJ}` : 'Nueva partida';
            } else if (g.id === 'chess') {
              const winsK = gamesState.chess?.winsKarla || 0;
              const winsJ = gamesState.chess?.winsJavier || 0;
              miniStats = winsK > 0 || winsJ > 0 ? `${winsK} - ${winsJ}` : chessHistory.length > 0 ? `${chessHistory.length} jugadas` : 'Nueva partida';
            } else if (g.id === 'battleship') {
              const winsK = gamesState.battleship?.winsKarla || 0;
              const winsJ = gamesState.battleship?.winsJavier || 0;
              miniStats = winsK > 0 || winsJ > 0 ? `${winsK} - ${winsJ}` : 'Nueva partida';
            } else if (g.id === 'sudoku') {
              const diffMap: Record<string, string> = { easy: 'fácil', medium: 'medio', hard: 'difícil' };
              miniStats = sudoku.completed ? 'Completado' : `Nivel ${diffMap[sudoku.difficulty] || sudoku.difficulty}`;
            } else if (g.id === 'hangman') {
              miniStats = `${6 - wrongGuessesCount} vidas`;
            } else if (g.id === 'drawguess') {
              const round = gamesState.drawGuess?.currentRound || 1;
              const phase = gamesState.drawGuess?.phase;
              miniStats = phase === 'game_over' ? 'Terminada' : `Ronda ${round}/6`;
            } else if (g.id === 'domino') {
              const winsK = gamesState.domino?.winsKarla || 0;
              const winsJ = gamesState.domino?.winsJavier || 0;
              miniStats = winsK > 0 || winsJ > 0 ? `${winsK} - ${winsJ}` : 'Nueva partida';
            } else if (g.id === 'uno') {
              const winsK = gamesState.uno?.winsKarla || 0;
              const winsJ = gamesState.uno?.winsJavier || 0;
              miniStats = winsK > 0 || winsJ > 0 ? `${winsK} - ${winsJ}` : 'Nueva partida';
            }

            const cardGradient: readonly [string, string] = isDark
              ? [`${color}2E`, colors.surface]
              : [`${color}1C`, '#ffffff'];

            return (
              <PressableScale
                key={g.id}
                onPress={() => setPendingGameToLaunch(g.id)}
                style={[
                  styles.lobbyCardOuter,
                  {
                    borderColor: isMyTurn ? color : (isDark ? `${color}80` : `${color}66`),
                    borderWidth: isMyTurn ? 2 : 1.5,
                    shadowColor: color,
                    shadowOpacity: isMyTurn ? 0.24 : 0.14,
                  },
                ]}
                scaleTo={0.96}
                accessibilityLabel={`Jugar ${g.label}`}
              >
                <LinearGradient
                  colors={cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lobbyCardCompact}
                >
                  {/* Ícono SVG ilustrado dentro de halo iluminado */}
                  <View
                    style={[
                      styles.lobbyCardIconCircle,
                      {
                        backgroundColor: isDark ? `${color}30` : g.bgTint,
                        borderColor: `${color}55`,
                        borderWidth: 1.2,
                        shadowColor: color,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 5,
                      },
                    ]}
                  >
                    <GameVectorIcon gameId={g.id} size={27} color={color} />
                  </View>

                  {/* Nombre del juego con tipografía editorial */}
                  <Text
                    style={[styles.lobbyCardTitle, { color: colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {g.label}
                  </Text>

                  {/* Fila compacta de estadística y badge de turno */}
                  <View style={styles.lobbyCardFooter}>
                    <Text style={[styles.lobbyCardMiniStats, { color: colors.textSecondary }]} numberOfLines={1}>
                      {miniStats}
                    </Text>
                    <View
                      style={[
                        styles.turnBadgePill,
                        isMyTurn
                          ? { backgroundColor: color, borderColor: color }
                          : { backgroundColor: `${color}15`, borderColor: `${color}35` },
                      ]}
                    >
                      {isMyTurn && (
                        <Ionicons name="sparkles" size={9.5} color="#ffffff" style={{ marginRight: 3 }} />
                      )}
                      <Text
                        style={[
                          styles.lobbyBadgeText,
                          { color: isMyTurn ? '#ffffff' : color },
                        ]}
                        numberOfLines={1}
                      >
                        {isMyTurn ? '¡Tu turno!' : status.text}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </PressableScale>
            );
          };

          // Emparejar en 4 filas de 2 columnas fijas (Zero-Scroll)
          const gameRows: Array<[typeof ALL_GAMES[0], typeof ALL_GAMES[0] | undefined]> = [];
          for (let i = 0; i < sortedGames.length; i += 2) {
            gameRows.push([sortedGames[i], sortedGames[i + 1]]);
          }

          return (
            <View style={styles.lobbyGamesGridArea}>
              {gameRows.map((row, idx) => (
                <View key={`lobby-row-${idx}`} style={styles.lobbyGridRow}>
                  <View style={styles.lobbyCol}>{renderCard(row[0])}</View>
                  <View style={styles.lobbyCol}>
                    {row[1] ? renderCard(row[1]) : <View style={{ flex: 1 }} />}
                  </View>
                </View>
              ))}
            </View>
          );
        })()}
      </View>

      {/* ================= MODAL DE CONFIRMACIÓN: INICIAR PARTIDA (BOTTOM SHEET) ================= */}
      <Modal
        visible={Boolean(pendingGameToLaunch)}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingGameToLaunch(null)}
      >
        <Pressable
          style={styles.launchModalOverlay}
          onPress={() => setPendingGameToLaunch(null)}
        >
          {pendingGameToLaunch && (() => {
            const gameInfo = ALL_GAMES.find((g) => g.id === pendingGameToLaunch);
            const status = getGameStatus(pendingGameToLaunch);
            const naturalStatus = getGameNaturalStatus(pendingGameToLaunch);
            if (!gameInfo) return null;

            return (
              <Pressable
                style={[
                  styles.launchModalCard,
                  { backgroundColor: colors.surface, borderColor: `${gameInfo.iconColor}40` },
                ]}
                onPress={(e: any) => e?.stopPropagation?.()}
              >
                {/* Tirador sutil superior del Bottom Sheet */}
                <View style={[styles.sheetHandle, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

                {/* Ícono Grande Ilustrado con Degradado Temático */}
                <View style={styles.launchModalIconWrap}>
                  <LinearGradient
                    colors={[gameInfo.iconColor, `${gameInfo.iconColor}cc`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.launchModalIconBox}
                  >
                    <GameVectorIcon gameId={gameInfo.id} size={38} color="#ffffff" />
                  </LinearGradient>
                </View>

                <Text style={[styles.launchModalTitle, { color: colors.text }]}>
                  {gameInfo.label}
                </Text>
                <Text style={[styles.launchModalSubtitle, { color: colors.textSecondary }]}>
                  {gameInfo.description}
                </Text>

                {/* Resumen del Marcador de la Pareja en este Juego con Fotos Reales */}
                {(() => {
                  const bdKey = pendingGameToLaunch as keyof GameScoreBreakdown;
                  const item = gamesState.leaderboard?.breakdown?.[bdKey];
                  const winsK = item?.winsKarla ?? 0;
                  const winsJ = item?.winsJavier ?? 0;
                  const ptsK = item?.pointsKarla ?? 0;
                  const ptsJ = item?.pointsJavier ?? 0;
                  const karlaAvatarUri = getAvatarUri('Karla');
                  const javierAvatarUri = getAvatarUri('Javier');
                  const karlaName = getDisplayName('Karla');
                  const javierName = getDisplayName('Javier');
                  const totalWins = winsK + winsJ;
                  const karlaWinRatio = totalWins > 0 ? Math.max(12, Math.min(88, Math.round((winsK / totalWins) * 100))) : 50;

                  return (
                    <LinearGradient
                      colors={isDark ? [colors.surfaceAlt, colors.surface] : [colors.primaryLight, '#f8fafc']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.launchModalScoreBox, { borderColor: colors.border }]}
                    >
                      <View style={styles.launchModalScoreTopRow}>
                        <View style={styles.launchModalPlayerScore}>
                          <View style={[styles.launchMiniAvatar, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
                            {karlaAvatarUri ? (
                              <Image source={{ uri: karlaAvatarUri }} style={styles.launchMiniAvatarImg} />
                            ) : (
                              <Text style={[styles.launchMiniAvatarText, { color: '#be185d' }]}>
                                {karlaName.charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.launchModalPlayerName, { color: colors.text }]} numberOfLines={1}>
                            {karlaName}
                          </Text>
                          <Text style={[styles.launchModalPlayerWins, { color: colors.textSecondary }]}>
                            {winsK === 1 ? '1 victoria' : `${winsK} victorias`}
                          </Text>
                          <Text style={styles.launchModalPlayerPts}>{ptsK} pts</Text>
                        </View>

                        <View style={styles.launchModalVsDivider}>
                          <View style={[styles.launchModalVsCircle, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                            <Text style={[styles.launchModalVsText, { color: colors.primary }]}>VS</Text>
                          </View>
                          <Ionicons name="trophy" size={13} color="#f59e0b" style={{ marginTop: 3 }} />
                        </View>

                        <View style={[styles.launchModalPlayerScore, { alignItems: 'flex-end' }]}>
                          <View style={[styles.launchMiniAvatar, { backgroundColor: '#f0f9ff', borderColor: '#38bdf8' }]}>
                            {javierAvatarUri ? (
                              <Image source={{ uri: javierAvatarUri }} style={styles.launchMiniAvatarImg} />
                            ) : (
                              <Text style={[styles.launchMiniAvatarText, { color: '#0369a1' }]}>
                                {javierName.charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.launchModalPlayerName, { color: colors.text }]} numberOfLines={1}>
                            {javierName}
                          </Text>
                          <Text style={[styles.launchModalPlayerWins, { color: colors.textSecondary }]}>
                            {winsJ === 1 ? '1 victoria' : `${winsJ} victorias`}
                          </Text>
                          <Text style={styles.launchModalPlayerPts}>{ptsJ} pts</Text>
                        </View>
                      </View>

                      <View style={[styles.duelTrack, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0', marginTop: 8 }]}>
                        <View style={[styles.duelFillLeft, { flex: karlaWinRatio, backgroundColor: '#ec4899' }]} />
                        <View style={{ width: 2, backgroundColor: colors.surface }} />
                        <View style={[styles.duelFillRight, { flex: 100 - karlaWinRatio, backgroundColor: '#0ea5e9' }]} />
                      </View>
                    </LinearGradient>
                  );
                })()}

                {/* Badge con Frase de Estado Natural */}
                <View
                  style={[
                    styles.launchModalStatusPill,
                    {
                      backgroundColor: status.isMyTurn ? `${gameInfo.iconColor}18` : colors.surfaceAlt,
                      borderColor: status.isMyTurn ? gameInfo.iconColor : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={status.isMyTurn ? 'sparkles' : 'time-outline'}
                    size={13}
                    color={status.isMyTurn ? gameInfo.iconColor : colors.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[
                      styles.launchModalStatusText,
                      { color: status.isMyTurn ? gameInfo.iconColor : colors.textSecondary },
                    ]}
                  >
                    {naturalStatus}
                  </Text>
                </View>

                {/* Botón Principal Iniciar Partida + Cancelar Sutil */}
                <View style={styles.launchActionsRow}>
                  <GameButton
                    label="Iniciar Partida"
                    icon="play"
                    variant="primary"
                    onPress={() => {
                      const toLaunch = pendingGameToLaunch;
                      setPendingGameToLaunch(null);
                      if (toLaunch === 'drawguess') {
                        const dg = gamesState.drawGuess;
                        if (!dg || !dg.phase || dg.phase === 'idle' || dg.phase === 'game_over') {
                          void handleResetDrawGuess();
                        }
                      } else if (toLaunch === 'domino') {
                        const dom = gamesState.domino;
                        if (!dom || !dom.phase || dom.phase === 'idle' || dom.phase === 'round_over') {
                          void handleResetDomino();
                        }
                      } else if (toLaunch === 'uno') {
                        const un = gamesState.uno;
                        if (!un || !un.phase || un.phase === 'idle' || un.phase === 'round_over') {
                          void handleResetUno();
                        }
                      }
                      setActiveGame(toLaunch);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.launchCancelBtn}
                    onPress={() => setPendingGameToLaunch(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.launchCancelText, { color: colors.textSecondary }]}>
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            );
          })()}
        </Pressable>
      </Modal>

      {/* ================= PANTALLA COMPLETA DEL JUEGO ACTIVO (HEADER MÍNIMO + BARRA INFERIOR OCULTA) ================= */}
      <Modal
        visible={Boolean(activeGame)}
        animationType="slide"
        onRequestClose={() => setActiveGame(null)}
      >
        <SafeAreaView style={[styles.gameFullScreenContainer, { backgroundColor: colors.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />

          {/* Header Unificado Premium del Juego */}
          {activeGame && (
            <GameHeader
              gameId={activeGame}
              title={ALL_GAMES.find((g) => g.id === activeGame)?.label || 'Juego'}
              icon={(ALL_GAMES.find((g) => g.id === activeGame)?.icon as any) || 'game-controller'}
              turnLabel={getGameTurnLabel(activeGame)}
              isMyTurn={getGameStatus(activeGame).isMyTurn}
              currentTurnPlayer={
                activeGame === 'tictactoe'
                  ? gamesState.ticTacToe.turn
                  : activeGame === 'chess'
                  ? gamesState.chess.turn
                  : activeGame === 'battleship'
                  ? bs.turn
                  : activeGame === 'drawguess'
                  ? (gamesState.drawGuess?.drawer || 'Karla')
                  : activeGame === 'domino'
                  ? gamesState.domino?.turn
                  : activeGame === 'uno'
                  ? gamesState.uno?.turn
                  : null
              }
              onBack={() => setActiveGame(null)}
              onReset={() => handleResetCurrentGame()}
              onPressScore={(p) => handleOpenScoreBreakdown(p || 'all')}
              primaryColor={primaryColor}
            />
          )}

          {/* Arena del Juego Montada con Scroll Adaptable que Centra Verticalmente */}
          {activeGame === 'drawguess' || activeGame === 'domino' || activeGame === 'uno' ? (
            <View style={{ flex: 1, width: '100%' }}>
              {renderActiveGameArena(true)}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              scrollEnabled={activeGame !== 'battleship' && !isDraggingShip}
              contentContainerStyle={styles.gameActiveScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeGame && renderActiveGameArena(true)}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ================= GRAN MODAL DE CELEBRACIÓN DE VICTORIA ALEGRE ================= */}
      <CelebrationOverlay
        visible={Boolean(victoryCelebration)}
        winnerName={victoryCelebration?.winnerName || ''}
        gameTitle={victoryCelebration?.gameTitle || ''}
        pointsEarned={victoryCelebration?.pointsEarned || 100}
        subtitle={victoryCelebration?.subtitle || ''}
        petName={petMeta.name}
        petAccessory={petMeta.accessory}
        onPlayAgain={() => {
          if (victoryCelebration) {
            const cb = victoryCelebration.onPlayAgain;
            setVictoryCelebration(null);
            cb();
          }
        }}
        onViewBoard={() => setVictoryCelebration(null)}
        onClose={() => {
          setVictoryCelebration(null);
          setActiveGame(null);
        }}
      />

      {/* Modal Retar a mi Pareja en el Ahorcado */}
      <Modal
        visible={isCustomWordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomWordModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Retar a mi Pareja</Text>
              <TouchableOpacity onPress={() => setIsCustomWordModalOpen(false)}>
                <Ionicons name="close" size={22} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.inputLabel}>Palabra Secreta</Text>
              <TextInput
                value={customWordInput}
                onChangeText={setCustomWordInput}
                placeholder="Ej. GUITARRA, DINOSAURIO, PIZZA..."
                placeholderTextColor="#adb5bd"
                autoCapitalize="characters"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Categoría</Text>
              <TextInput
                value={customCatInput}
                onChangeText={setCustomCatInput}
                placeholder="Ej. Películas, Comida, Objetos..."
                placeholderTextColor="#adb5bd"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Pista para que la adivine</Text>
              <TextInput
                value={customHintInput}
                onChangeText={setCustomHintInput}
                placeholder="Ej. Instrumento de seis cuerdas..."
                placeholderTextColor="#adb5bd"
                style={styles.modalInput}
              />

              <TouchableOpacity
                onPress={() => void handleSaveCustomHangman()}
                style={[styles.primaryGameBtn, { backgroundColor: primaryColor, marginTop: 16 }]}
              >
                <Ionicons name="send" size={16} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>Lanzar Reto (+100 pts)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MODAL DE DESGLOSE DE PUNTOS Y TORNEO SEMANAL ================= */}
      <GameScoreBreakdownModal
        visible={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        leaderboard={gamesState.leaderboard}
        initialPlayer={breakdownPlayer}
        primaryColor={primaryColor}
        petAccessory={petMeta.accessory}
      />
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  lobbyScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    gap: 16,
  },
  lobbyZeroScrollContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 10,
    gap: 6,
  },
  lobbyScrollArea: {
    flex: 1,
  },
  lobbyScrollContentArea: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: 6,
  },
  lobbyGridRowDynamic: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  lobbyGamesGridArea: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 6,
  },
  lobbyGridRowsContainer: {
    flex: 1,
    gap: 6,
  },
  lobbyGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  lobbyCol: {
    flex: 1,
  },
  lobbyColFull: {
    flex: 1,
  },
  lobbyBannerRow: {
    width: '100%',
  },
  lobbyBannerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    paddingRight: 40, // Margen derecho generoso para no ser tapado por herramientas o engranes flotantes
    borderWidth: 1.5,
    gap: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  lobbyBannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyBannerInfo: {
    flex: 1,
    gap: 2,
  },
  lobbyBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lobbyBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  lobbyBannerDesc: {
    fontSize: 11.5,
  },
  lobbyCardMiniStats: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  gameActiveScrollContent: {
    flexGrow: 1,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 24,
  },
  lobbyCardOuter: {
    flex: 1,
    width: '100%',
    borderRadius: 18,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  lobbyCardCompact: {
    flex: 1,
    width: '100%' as const,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    overflow: 'hidden' as const,
  },
  lobbyCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    textAlign: 'center',
  },
  lobbyCardFooter: {
    width: '100%',
    alignItems: 'center',
    gap: 3,
  },
  lobbyCardDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
    paddingHorizontal: 2,
  },
  turnBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  lobbyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  launchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  launchModalCard: {
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  launchModalIconWrap: {
    marginBottom: 12,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  launchModalIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  launchModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    marginBottom: 4,
    textAlign: 'center',
  },
  launchModalSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  launchModalScoreBox: {
    width: '100%' as const,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  launchModalScoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  launchModalPlayerScore: {
    flex: 1,
    gap: 1,
  },
  launchMiniAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
    overflow: 'hidden',
  },
  launchMiniAvatarImg: {
    width: '100%',
    height: '100%',
  },
  launchMiniAvatarText: {
    fontSize: 11,
    fontWeight: '900',
  },
  launchModalPlayerName: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  launchModalPlayerWins: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  launchModalPlayerPts: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  launchModalVsDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  launchModalVsCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchModalVsText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
  },
  launchModalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  launchModalStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  launchActionsRow: {
    width: '100%',
    gap: 6,
  },
  launchCancelBtn: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  lobbyScoreboard: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 2,
  },
  lobbyScoreTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  lobbyPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lobbyAvatarWrap: {
    position: 'relative',
  },
  lobbyAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lobbyAvatarImg: {
    width: '100%',
    height: '100%',
  },
  leaderCrownBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  leaderCrownEmoji: {
    fontSize: 9,
    lineHeight: 11,
  },
  lobbyAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  lobbyPlayerName: {
    fontSize: 12.5,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  lobbyScorePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  lobbyPoints: {
    fontSize: 11,
    fontWeight: '800',
  },
  lobbyStars: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  lobbyCenterMascotBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  lobbyPochitoMiniWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  lobbyVsPill: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  lobbyVsPillText: {
    fontSize: 8.5,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  duelTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 6,
  },
  duelFillLeft: {
    height: '100%' as const,
  },
  duelFillRight: {
    height: '100%' as const,
  },
  lobbyVsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 8,
  },
  lobbyVsText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unifiedTurnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 8,
    alignSelf: 'center',
  },
  unifiedTurnPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  lobbySection: {
    gap: 10,
  },
  lobbySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    letterSpacing: 0.2,
  },
  continueCard: {
    width: 170,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  continueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  continueIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueGameName: {
    fontSize: 14,
    fontWeight: '800',
  },
  continueGameSub: {
    fontSize: 11,
    marginTop: 2,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  turnBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gamesGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gameGridCard: {
    width: '48%',
    minHeight: 164,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-between',
  },
  gameGridIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gameGridCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  gameGridCardSub: {
    fontSize: 11,
  },
  gameFullScreenContainer: {
    flex: 1,
  },
  gameMinimalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gameMinimalTitle: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  gameMinimalTurn: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  resetGameBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameActiveArenaWrapper: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  globalScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    marginBottom: 6,
  },
  playerScoreInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  playerBadgeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeLetter: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: SERIF_FONT,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },
  pointsValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  vsBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  vsBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: c.textSecondary,
  },
  gamesSelectorGrid: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  gameTabCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: c.surface,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  gameTabTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: c.text,
  },
  arenaCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    justifyContent: 'space-between',
  },
  arenaCardFull: {
    padding: 18,
    borderRadius: 24,
  },
  arenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  arenaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  arenaSubtitle: {
    fontSize: 11,
    color: c.textSecondary,
  },
  fullScreenToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fullScreenToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gameBodyCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statusBanner: {
    width: '100%',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tttBoard: {
    borderRadius: 18,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  tttCell: {
    width: '31.5%',
    height: '31.5%',
    backgroundColor: c.surface,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttPiece: {
    fontWeight: '900',
  },
  primaryGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  primaryGameBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.primaryOn,
  },
  secondaryGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: c.surface,
  },
  secondaryGameBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  // Sudoku
  sudokuTopControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diffPillsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  diffChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  diffChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  sudokuToolsMiniRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniToolBtn: {
    width: 30,
    height: 28,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sudokuNumKey: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sudokuNumKeyText: {
    fontSize: 16,
    fontWeight: '800',
  },
  sudokuGridContainer: {
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: c.surface,
  },
  sudokuRow: {
    flexDirection: 'row',
  },
  sudokuCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sudokuValText: {
    fontSize: 14,
  },
  sudokuNotesText: {
    fontSize: 7,
    color: c.textSecondary,
    textAlign: 'center',
  },
  sudokuKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
  },
  sudokuKeyBtn: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
  },
  sudokuKeyDigit: {
    fontSize: 14,
    fontWeight: '900',
  },
  sudokuKeyLeft: {
    fontSize: 8,
    color: c.textMuted,
    fontWeight: '700',
  },
  // Ajedrez
  chessTopStatusRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chessTurnLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkWarningBadge: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  checkWarningText: {
    fontSize: 10,
    fontWeight: '900',
    color: c.primaryOn,
  },
  advantageTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chessBoardOuter: {
    borderWidth: 2,
    borderColor: '#1e293b',
    borderRadius: 8,
    overflow: 'hidden',
  },
  chessRow: {
    flexDirection: 'row',
  },
  chessSquare: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chessGlyph: {
    lineHeight: 28,
  },
  chessMoveIndicator: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.75)',
  },
  chessCaptureIndicator: {
    width: '86%',
    height: '86%',
    borderRadius: 6,
    backgroundColor: 'transparent',
    borderWidth: 2.5,
    borderColor: '#e11d48',
  },
  chessControlsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  // Ahorcado
  hangmanStageCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: 14,
    padding: 8,
    width: '100%',
    gap: 10,
  },
  gallowsBoxCompact: {
    width: 72,
    height: 78,
    position: 'relative',
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    width: 52,
    height: 3,
    backgroundColor: '#334155',
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 4,
    left: 16,
    width: 3,
    height: 68,
    backgroundColor: '#334155',
  },
  gallowsTop: {
    position: 'absolute',
    top: 6,
    left: 16,
    width: 34,
    height: 3,
    backgroundColor: '#334155',
  },
  gallowsRope: {
    position: 'absolute',
    top: 6,
    left: 47,
    width: 2,
    height: 11,
    backgroundColor: '#94a3b8',
  },
  hmHead: {
    position: 'absolute',
    top: 17,
    left: 40,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  hmBody: {
    position: 'absolute',
    top: 33,
    left: 47,
    width: 2.5,
    height: 20,
  },
  hmArmLeft: {
    position: 'absolute',
    top: 36,
    left: 39,
    width: 10,
    height: 2.5,
    transform: [{ rotate: '-30deg' }],
  },
  hmArmRight: {
    position: 'absolute',
    top: 36,
    left: 47,
    width: 10,
    height: 2.5,
    transform: [{ rotate: '30deg' }],
  },
  hmLegLeft: {
    position: 'absolute',
    top: 52,
    left: 40,
    width: 10,
    height: 2.5,
    transform: [{ rotate: '-45deg' }],
  },
  hmLegRight: {
    position: 'absolute',
    top: 52,
    left: 46,
    width: 10,
    height: 2.5,
    transform: [{ rotate: '45deg' }],
  },
  hangmanInfoRight: {
    flex: 1,
    gap: 2,
  },
  livesIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  livesCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#e11d48',
  },
  hangmanHintBox: {
    fontSize: 11,
    color: c.textSecondary,
    fontStyle: 'italic',
    lineHeight: 15,
  },
  wordSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  wordSlotBox: {
    width: 26,
    height: 30,
    borderBottomWidth: 2.5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordSlotChar: {
    fontSize: 15,
    fontWeight: '900',
  },
  azKeyboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
  },
  azKey: {
    width: 29,
    height: 29,
    borderRadius: 7,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  azKeyText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.text,
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  fullScreenTopBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  // Celebración Grande y Alegre
  victoryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  victoryCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: 32,
    padding: 26,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  victorySparklesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 4,
  },
  victoryTrophyCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryGameTag: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 6,
  },
  victoryWinnerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: c.text,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
    marginTop: 4,
  },
  victorySubtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  victoryRewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  victoryRewardText: {
    fontSize: 14,
    fontWeight: '900',
    color: c.primaryOn,
    letterSpacing: 0.6,
  },
  victoryButtonsRow: {
    width: '100%',
    marginTop: 20,
    gap: 10,
  },
  victoryPlayAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  victoryPlayAgainText: {
    fontSize: 15,
    fontWeight: '800',
    color: c.primaryOn,
  },
  victoryCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  victoryCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 370,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
  },
  // Modo Consola de Juego Profesional Independiente (Modo Zoom Pro)
  arenaCardProDark: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: '#090e1a',
    borderColor: '#1e293b',
    borderWidth: 1.5,
  },
  proLiveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proLiveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: c.primaryOn,
    letterSpacing: 1,
  },
  proConsoleModalContainer: {
    flex: 1,
    backgroundColor: '#050811',
  },
  proConsoleTopHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  proHudPlayerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proHudDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  proHudPlayerName: {
    fontSize: 10,
    fontWeight: '900',
    color: '#cbd5e1',
    letterSpacing: 0.8,
  },
  proHudPlayerScore: {
    fontSize: 13,
    fontWeight: '900',
  },
  proHudCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  proHudCenterText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fde047',
  },
  proConsoleTabsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  proGameTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 3,
  },
  proGameTabBtnActive: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
  },
  proGameTabBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: c.textSecondary,
    letterSpacing: 0.4,
  },
  // Battleship 10x10 Pro (Batalla Naval de Mesa Completa)
  bsInviteCard: {
    width: '100%',
    backgroundColor: c.surfaceAlt,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#bae6fd',
    gap: 10,
  },
  bsInviteCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#0369a1',
  },
  bsRadarCircleIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(2, 132, 199, 0.14)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bsInviteTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: c.text,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  bsInviteDesc: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  bsActionLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
  },
  bsActionLaunchText: {
    fontSize: 13,
    fontWeight: '900',
    color: c.primaryOn,
  },
  bsSetupTopBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  bsSetupInstruction: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: c.textSecondary,
  },
  bsRotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  bsRotateBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  bsShipsPickerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  bsShipPickerPill: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
  },
  bsShipPickerText: {
    fontSize: 9,
    fontWeight: '800',
    color: c.textSecondary,
  },
  bsTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  bsStatusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  bsStatusText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: c.text,
  },
  bsModeSwitch: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  bsModeBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bsModeBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: c.textSecondary,
  },
  bsFleetSilhouettesBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  bsSilhouetteChip: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 7,
    alignItems: 'center',
    borderWidth: 1,
  },
  bsSilhouetteAlive: {
    backgroundColor: '#0c4a6e',
    borderColor: '#0284c7',
  },
  bsSilhouetteSunk: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  bsSilhouetteName: {
    fontSize: 8,
    fontWeight: '800',
    color: '#e0f2fe',
    marginBottom: 2,
  },
  bsSilhouetteBlocks: {
    flexDirection: 'row',
    gap: 1.5,
  },
  bsSilhouetteMiniBlock: {
    width: 5,
    height: 4,
    borderRadius: 1,
  },
  bsGridOuter10x10: {
    borderWidth: 2,
    borderColor: '#38bdf8',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0284c7',
  },
  bsCoordHeaderCell: {
    backgroundColor: '#0369a1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  bsCoordText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#7dd3fc',
  },
  bsCell10x10: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: '#0284c7',
    position: 'relative',
  },
  shipHullSegment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipTurretCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    borderWidth: 1,
    borderColor: '#475569',
  },
  shipBridgeDeck: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  bsCellMiss: {
    backgroundColor: '#082f49',
  },
  bsCellHit: {
    backgroundColor: '#9a3412',
    borderColor: '#f97316',
  },
  bsWaterSplashDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7dd3fc',
    opacity: 0.75,
  },
});

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Dimensions,
  Animated,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/Kit';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { MoodMascot } from '../components/MoodMascot';
import {
  getGamesState,
  saveGamesState,
  DEFAULT_GAMES_STATE,
  GamesState,
  ChessPiece,
  createInitialChessBoard,
  createRandomBattleshipFleet,
  BattleshipShip,
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

type GameTab = 'tictactoe' | 'sudoku' | 'chess' | 'hangman' | 'battleship';

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
  { id: 'battleship', label: 'Battleship', icon: 'boat', description: 'Guerra naval en 10x10', bgTint: '#cffafe', iconColor: '#0891b2' },
  { id: 'hangman', label: 'Ahorcado', icon: 'extension-puzzle', description: 'Adivina la palabra oculta', bgTint: '#ffe4e6', iconColor: '#e11d48' },
];

const HANGMAN_DICTIONARY: Array<{ word: string; hint: string; category: string }> = [
  { word: 'MATRIX', hint: 'Ciencia ficción con Neo y las pastillas roja y azul', category: 'Cine' },
  { word: 'TITANIC', hint: 'Famoso barco transatlántico y un iceberg', category: 'Cine' },
  { word: 'AVATAR', hint: 'Seres de piel azul en el planeta Pandora', category: 'Cine' },
  { word: 'BATMAN', hint: 'El caballero de la noche protegiendo Gotham', category: 'Cine' },
  { word: 'SHREK', hint: 'Ogro verde carismático que vive en un pantano', category: 'Cine' },
  { word: 'INCEPTION', hint: 'Ladrones que se infiltran dentro de los sueños', category: 'Cine' },
  { word: 'SPIDERMAN', hint: 'Héroe con traje arácnido que trepa paredes', category: 'Cine' },
  { word: 'GLADIADOR', hint: 'Guerrero romano en busca de honor y venganza', category: 'Cine' },
  { word: 'STARWARS', hint: 'Guerra galáctica con sables de luz y caballeros Jedi', category: 'Cine' },
  { word: 'JURASSIC', hint: 'Parque con dinosaurios clonados que se escapan', category: 'Cine' },
  { word: 'ELEFANTE', hint: 'Mamífero terrestre gigante con colmillos y trompa', category: 'Animales' },
  { word: 'JIRAFA', hint: 'El animal más alto del mundo con cuello largo', category: 'Animales' },
  { word: 'DELFIN', hint: 'Mamífero marino muy sociable e inteligente', category: 'Animales' },
  { word: 'CANGURO', hint: 'Salta velozmente y lleva a su cría en una bolsa', category: 'Animales' },
  { word: 'PINGUINO', hint: 'Ave que no vuela pero nada en aguas congeladas', category: 'Animales' },
  { word: 'LEOPARDO', hint: 'Felino salvaje muy veloz con manchas oscuras', category: 'Animales' },
  { word: 'MARIPOSA', hint: 'Insecto con alas coloridas tras salir del capullo', category: 'Animales' },
  { word: 'JAPON', hint: 'País del sol naciente, sushi y templos', category: 'Geografía' },
  { word: 'ITALIA', hint: 'País con forma de bota, cuna de la pizza y el Coliseo', category: 'Geografía' },
  { word: 'FRANCIA', hint: 'País de la Torre Eiffel y los croissants', category: 'Geografía' },
  { word: 'CANADA', hint: 'País norteño con hoja de arce en su bandera', category: 'Geografía' },
  { word: 'BRASIL', hint: 'País más grande de Sudamérica famoso por su carnaval', category: 'Geografía' },
  { word: 'EGIPTO', hint: 'Tierra de pirámides milenarias y el río Nilo', category: 'Geografía' },
  { word: 'PIZZA', hint: 'Masa horneada con salsa de tomate y queso derretido', category: 'Comida' },
  { word: 'HAMBURGUESA', hint: 'Carne en pan con queso, lechuga y papas fritas', category: 'Comida' },
  { word: 'CHOCOLATE', hint: 'Dulce delicioso elaborado a partir del cacao', category: 'Comida' },
  { word: 'ESPAGUETI', hint: 'Pasta larga italiana con salsa boloñesa', category: 'Comida' },
  { word: 'SUSHI', hint: 'Rollo japonés de arroz con pescado fresco o aguacate', category: 'Comida' },
  { word: 'HELADO', hint: 'Postre cremoso servido muy frío en cono o copa', category: 'Comida' },
  { word: 'TACOS', hint: 'Tortilla con carne asada, cilantro y cebolla', category: 'Comida' },
  { word: 'GUITARRA', hint: 'Instrumento musical de seis cuerdas y caja sonora', category: 'Objetos' },
  { word: 'TELESCOPIO', hint: 'Instrumento óptico para ver planetas y estrellas', category: 'Tecnología' },
  { word: 'COMPUTADORA', hint: 'Máquina electrónica para procesar datos y navegar', category: 'Tecnología' },
  { word: 'AUDIFONOS', hint: 'Dispositivo para escuchar música en privado', category: 'Objetos' },
  { word: 'BICICLETA', hint: 'Vehículo de dos ruedas impulsado por pedales', category: 'Objetos' },
  { word: 'COHETE', hint: 'Vehículo que viaja a gran velocidad al espacio exterior', category: 'Tecnología' },
  { word: 'VOLCAN', hint: 'Montaña con cráter que expulsa lava y humo', category: 'Naturaleza' },
  { word: 'ARCOIRIS', hint: 'Banda de colores que surge cuando llueve con sol', category: 'Naturaleza' },
  { word: 'ASTRONAUTA', hint: 'Persona entrenada para viajar al espacio exterior', category: 'Ciencia' },
  { word: 'GALAXIA', hint: 'Enorme sistema de miles de millones de estrellas', category: 'Espacio' },
  { word: 'DINOSAURIO', hint: 'Reptiles colosales que dominaron la Tierra', category: 'Historia' },
  { word: 'POKEMON', hint: 'Criaturas de bolsillo con entrenadores y batallas', category: 'Videojuegos' },
  { word: 'MINECRAFT', hint: 'Juego de construcción y supervivencia con cubos', category: 'Videojuegos' },
  { word: 'TETRIS', hint: 'Clásico juego de acomodar piezas geométricas que caen', category: 'Videojuegos' },
  { word: 'AJEDREZ', hint: 'Juego de estrategia con tablero de 64 casillas', category: 'Juegos' },
];

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

interface SavedSudokuSession {
  difficulty: 'easy' | 'medium' | 'hard';
  board: number[][];
  fixed: boolean[][];
  solution: number[][];
  notes: Record<string, number[]>;
  score: number;
  mistakes: number;
  completed: boolean;
}

const SUDOKU_STORAGE_KEY = '@kmrg_saved_sudoku_session_v1';

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
    difficulty,
    board,
    fixed,
    solution,
    notes: {},
    score: 0,
    mistakes: 0,
    completed: false,
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
  const [gamesState, setGamesState] = useState<GamesState>(DEFAULT_GAMES_STATE);
  const [isFullScreenGame, setIsFullScreenGame] = useState<boolean>(false);

  // Estado de Celebración Grande y Alegre al Ganar
  const [victoryCelebration, setVictoryCelebration] = useState<VictoryCelebration | null>(null);
  const victoryScale = useRef(new Animated.Value(0.5)).current;

  // --- Estado de Sudoku (3 Vidas + Teclado Numérico Nativo) ---
  const MAX_SUDOKU_MISTAKES = 3;
  const [sudoku, setSudoku] = useState<SavedSudokuSession>(() => createSudokuSession('easy'));
  const [selectedSudokuCell, setSelectedSudokuCell] = useState<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const sudokuInputRef = useRef<TextInput>(null);

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

  const loadAll = useCallback(async () => {
    const loaded = await getGamesState();
    setGamesState({
      ...DEFAULT_GAMES_STATE,
      ...loaded,
      leaderboard: { ...DEFAULT_GAMES_STATE.leaderboard, ...(loaded.leaderboard || {}) },
      ticTacToe: { ...DEFAULT_GAMES_STATE.ticTacToe, ...(loaded.ticTacToe || {}) },
      sudoku: { ...DEFAULT_GAMES_STATE.sudoku, ...(loaded.sudoku || {}) },
      hangman: { ...DEFAULT_GAMES_STATE.hangman, ...(loaded.hangman || {}) },
      chess: { ...DEFAULT_GAMES_STATE.chess, ...(loaded.chess || {}) },
      battleship: { ...DEFAULT_GAMES_STATE.battleship, ...(loaded.battleship || {}) },
    });

    try {
      const savedSudoku = await AsyncStorage.getItem(SUDOKU_STORAGE_KEY);
      if (savedSudoku) {
        setSudoku(JSON.parse(savedSudoku));
      }
    } catch {
      // Ignorar
    }
  }, []);

  useEffect(() => {
    void loadAll();

    const channel = supabase
      .channel('kmrg-games-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload.new?.type === 'sync_games_state' && payload.new?.payload) {
            setGamesState((prev) => ({
              ...prev,
              ...payload.new.payload,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const persistSudoku = async (nextSudoku: SavedSudokuSession) => {
    setSudoku(nextSudoku);
    try {
      await AsyncStorage.setItem(SUDOKU_STORAGE_KEY, JSON.stringify(nextSudoku));
    } catch {
      // Ignorar
    }
  };

  const updateAndSyncGames = async (next: GamesState) => {
    setGamesState(next);
    await saveGamesState(currentProfile, next);
  };

  const addLeaderboardReward = (
    baseState: GamesState,
    winner: 'Karla' | 'Javier',
    points: number,
    trophy = 1
  ): GamesState['leaderboard'] => {
    const lb = baseState.leaderboard || DEFAULT_GAMES_STATE.leaderboard;
    return {
      pointsKarla: winner === 'Karla' ? lb.pointsKarla + points : lb.pointsKarla,
      pointsJavier: winner === 'Javier' ? lb.pointsJavier + points : lb.pointsJavier,
      trophiesKarla: winner === 'Karla' ? lb.trophiesKarla + trophy : lb.trophiesKarla,
      trophiesJavier: winner === 'Javier' ? lb.trophiesJavier + trophy : lb.trophiesJavier,
    };
  };

  // =========================================================================
  // 1. TRES EN RAYA
  // =========================================================================
  const handleNewTicTacToeRound = async () => {
    const ttt = gamesState.ticTacToe;
    await updateAndSyncGames({
      ...gamesState,
      ticTacToe: {
        ...ttt,
        board: Array(9).fill(null),
        winningLine: null,
        winner: null,
        turn: ttt.round % 2 === 0 ? 'Karla' : 'Javier',
        round: (ttt.round || 1) + 1,
      },
    });
  };

  const handleTicTacToePress = async (index: number) => {
    const ttt = gamesState.ticTacToe;
    if (ttt.board[index] || ttt.winner) return;

    const newBoard = [...ttt.board];
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

    let nextLeaderboard = gamesState.leaderboard;
    if (winner === 'Karla' || winner === 'Javier') {
      nextLeaderboard = addLeaderboardReward(gamesState, winner, 150, 1);
    } else if (winner === 'Empate') {
      nextLeaderboard = {
        ...gamesState.leaderboard,
        pointsKarla: gamesState.leaderboard.pointsKarla + 40,
        pointsJavier: gamesState.leaderboard.pointsJavier + 40,
      };
    }

    await updateAndSyncGames({
      ...gamesState,
      leaderboard: nextLeaderboard,
      ticTacToe: {
        ...ttt,
        board: newBoard,
        winningLine,
        turn: nextTurn,
        winner,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
      },
    });

    if (winner === 'Karla' || winner === 'Javier') {
      triggerVictoryCelebration({
        winnerName: winner === 'Karla' ? 'Karlita' : 'Javier',
        gameTitle: 'Tres en Raya',
        pointsEarned: 150,
        subtitle: 'Tres en línea impecables. ¡Qué gran jugada!',
        color: winner === 'Karla' ? '#9333ea' : '#0284c7',
        onPlayAgain: () => void handleNewTicTacToeRound(),
      });
    }
  };

  // =========================================================================
  // 2. SUDOKU
  // =========================================================================
  const handleNewSudokuGame = async (diff: 'easy' | 'medium' | 'hard') => {
    const fresh = createSudokuSession(diff);
    setSelectedSudokuCell(null);
    await persistSudoku(fresh);
  };

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
    if (!selectedSudokuCell || sudoku.completed || sudoku.mistakes >= MAX_SUDOKU_MISTAKES) return;
    const [r, c] = selectedSudokuCell;
    if (sudoku.fixed[r][c]) return;

    const cellKey = `${r}-${c}`;

    if (num === 0) {
      const nextBoard = sudoku.board.map((row) => [...row]);
      nextBoard[r][c] = 0;
      const nextNotes = { ...sudoku.notes };
      delete nextNotes[cellKey];
      await persistSudoku({ ...sudoku, board: nextBoard, notes: nextNotes });
      return;
    }

    if (isNoteMode && sudoku.board[r][c] === 0) {
      const currentNotes = sudoku.notes[cellKey] || [];
      const nextCellNotes = currentNotes.includes(num)
        ? currentNotes.filter((n) => n !== num)
        : [...currentNotes, num].sort();
      await persistSudoku({
        ...sudoku,
        notes: { ...sudoku.notes, [cellKey]: nextCellNotes },
      });
      return;
    }

    const correctVal = sudoku.solution[r][c];
    const nextBoard = sudoku.board.map((row) => [...row]);
    const wasAlreadyCorrect = sudoku.board[r][c] === correctVal;
    nextBoard[r][c] = num;

    let nextScore = sudoku.score;
    let nextMistakes = sudoku.mistakes;
    const mult = sudoku.difficulty === 'easy' ? 1 : sudoku.difficulty === 'medium' ? 1.5 : 2;

    if (num === correctVal && !wasAlreadyCorrect) {
      nextScore += Math.round(50 * mult);
    } else if (num !== correctVal) {
      nextMistakes += 1;
      nextScore = Math.max(0, nextScore - 20);
      if (nextMistakes >= MAX_SUDOKU_MISTAKES) {
        sudokuInputRef.current?.blur();
      }
    }

    const isComplete = nextBoard.every((row, ri) =>
      row.every((cell, ci) => cell === sudoku.solution[ri][ci])
    );

    if (isComplete) {
      sudokuInputRef.current?.blur();
      const bonus = Math.round(500 * mult);
      const finalScore = nextScore + bonus;
      await persistSudoku({
        ...sudoku,
        board: nextBoard,
        score: finalScore,
        mistakes: nextMistakes,
        completed: true,
      });

      const bestK =
        currentProfile === 'Karla'
          ? Math.max(gamesState.sudoku.bestScoreKarla, finalScore)
          : gamesState.sudoku.bestScoreKarla;
      const bestJ =
        currentProfile === 'Javier'
          ? Math.max(gamesState.sudoku.bestScoreJavier, finalScore)
          : gamesState.sudoku.bestScoreJavier;

      const nextLb = addLeaderboardReward(gamesState, currentProfile, finalScore, 1);

      await updateAndSyncGames({
        ...gamesState,
        leaderboard: nextLb,
        sudoku: {
          bestScoreKarla: bestK,
          bestScoreJavier: bestJ,
          completedCount: (gamesState.sudoku.completedCount || 0) + 1,
        },
      });

      triggerVictoryCelebration({
        winnerName: getDisplayName(currentProfile),
        gameTitle: 'Sudoku Completado',
        pointsEarned: finalScore,
        subtitle: 'Resolviste el tablero completo con maestría absoluta.',
        color: primaryColor,
        onPlayAgain: () => void handleNewSudokuGame(sudoku.difficulty),
      });
      return;
    }

    await persistSudoku({
      ...sudoku,
      board: nextBoard,
      score: nextScore,
      mistakes: nextMistakes,
    });
  };

  const handleSudokuHint = async () => {
    if (!selectedSudokuCell || sudoku.completed) {
      Alert.alert('Selecciona una casilla', 'Toca una casilla vacía del tablero para revelar su número.');
      return;
    }
    const [r, c] = selectedSudokuCell;
    if (sudoku.fixed[r][c] || sudoku.board[r][c] === sudoku.solution[r][c]) return;

    const nextBoard = sudoku.board.map((row) => [...row]);
    nextBoard[r][c] = sudoku.solution[r][c];
    await persistSudoku({
      ...sudoku,
      board: nextBoard,
      score: Math.max(0, sudoku.score - 15),
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

  const handleResetChess = async () => {
    setSelectedChessPos(null);
    setChessHistory([]);
    await updateAndSyncGames({
      ...gamesState,
      chess: {
        ...gamesState.chess,
        board: createInitialChessBoard(),
        turn: 'w',
        capturedByW: [],
        capturedByB: [],
        lastMove: null,
        winner: null,
      },
    });
  };

  const handleChessCellPress = async (r: number, c: number) => {
    const chess = gamesState.chess;
    if (chess.winner) return;

    const clickedPiece = chess.board[r][c];

    if (selectedChessPos) {
      const isValidTarget = validChessTargets.some(([tr, tc]) => tr === r && tc === c);
      if (isValidTarget) {
        const [sr, sc] = selectedChessPos;
        const movingPiece = chess.board[sr][sc];
        if (!movingPiece) return;

        setChessHistory((prev) => [...prev.slice(-10), chess]);

        const nextBoard = chess.board.map((row) => [...row]);
        const targetPiece = nextBoard[r][c];

        const promotedPiece: ChessPiece =
          movingPiece.type === 'p' && (r === 0 || r === 7)
            ? { type: 'q', color: movingPiece.color }
            : movingPiece;

        nextBoard[r][c] = promotedPiece;
        nextBoard[sr][sc] = null;

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

        let nextLb = gamesState.leaderboard;
        if (nextWinner === 'w') {
          nextLb = addLeaderboardReward(gamesState, 'Karla', 600, 1);
        } else if (nextWinner === 'b') {
          nextLb = addLeaderboardReward(gamesState, 'Javier', 600, 1);
        }

        setSelectedChessPos(null);
        await updateAndSyncGames({
          ...gamesState,
          leaderboard: nextLb,
          chess: {
            board: nextBoard,
            turn: chess.turn === 'w' ? 'b' : 'w',
            capturedByW: nextCapturedW,
            capturedByB: nextCapturedB,
            lastMove: { from: [sr, sc], to: [r, c] },
            winner: nextWinner,
            winsKarla: nextWinsKarla,
            winsJavier: nextWinsJavier,
          },
        });

        if (nextWinner === 'w' || nextWinner === 'b') {
          triggerVictoryCelebration({
            winnerName: nextWinner === 'w' ? 'Karlita' : 'Javier',
            gameTitle: '¡Jaque Mate en Ajedrez!',
            pointsEarned: 600,
            subtitle: 'Victoria magistral en el tablero real.',
            color: nextWinner === 'w' ? '#9333ea' : '#0284c7',
            onPlayAgain: () => void handleResetChess(),
          });
        }
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
    await updateAndSyncGames({
      ...gamesState,
      chess: prevChess,
    });
  };

  // =========================================================================
  // 4. EL AHORCADO
  // =========================================================================
  const hangman = gamesState.hangman;
  const wrongGuessesCount = hangman.guessed.filter((l) => !hangman.word.includes(l)).length;
  const maxWrong = 6;

  const handleRandomHangmanWord = async () => {
    const available = HANGMAN_DICTIONARY.filter((d) => d.word !== hangman.word);
    const pick = available[Math.floor(Math.random() * available.length)] || HANGMAN_DICTIONARY[0];
    await updateAndSyncGames({
      ...gamesState,
      hangman: {
        ...hangman,
        word: pick.word.toUpperCase(),
        hint: pick.hint,
        category: pick.category,
        author: 'Diccionario',
        isPartnerChallenge: false,
        guessed: [],
        status: 'playing',
      },
    });
  };

  const handleGuessLetter = async (letter: string) => {
    if (hangman.status !== 'playing' || hangman.guessed.includes(letter)) return;

    const nextGuessed = [...hangman.guessed, letter];
    const isHit = hangman.word.includes(letter);
    const nextWrong = nextGuessed.filter((l) => !hangman.word.includes(l)).length;

    const allRevealed = hangman.word
      .split('')
      .every((ch) => ch === ' ' || nextGuessed.includes(ch));

    let nextStatus: 'playing' | 'won' | 'lost' = 'playing';
    let nextScoreKarla = hangman.scoreKarla || 0;
    let nextScoreJavier = hangman.scoreJavier || 0;
    let nextStreak = hangman.streak || 0;
    let nextLb = gamesState.leaderboard;

    if (isHit) {
      nextLb = addLeaderboardReward(gamesState, currentProfile, 30, 0);
    }

    const winBonus = hangman.isPartnerChallenge ? 400 : 250;

    if (allRevealed) {
      nextStatus = 'won';
      nextStreak += 1;
      if (currentProfile === 'Karla') nextScoreKarla += 1;
      else nextScoreJavier += 1;
      nextLb = addLeaderboardReward(
        { ...gamesState, leaderboard: nextLb },
        currentProfile,
        winBonus,
        1
      );
    } else if (nextWrong >= maxWrong) {
      nextStatus = 'lost';
      nextStreak = 0;
    }

    await updateAndSyncGames({
      ...gamesState,
      leaderboard: nextLb,
      hangman: {
        ...hangman,
        guessed: nextGuessed,
        status: nextStatus,
        scoreKarla: nextScoreKarla,
        scoreJavier: nextScoreJavier,
        streak: nextStreak,
      },
    });

    if (nextStatus === 'won') {
      triggerVictoryCelebration({
        winnerName: currentProfile === 'Karla' ? 'Karlita' : 'Javier',
        gameTitle: '¡Palabra Descifrada!',
        pointsEarned: winBonus,
        subtitle: `Adivinaste "${hangman.word}" y sumaste racha de ${nextStreak}.`,
        color: primaryColor,
        onPlayAgain: () => void handleRandomHangmanWord(),
      });
    }
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

    await updateAndSyncGames({
      ...gamesState,
      hangman: {
        ...hangman,
        word: cleaned,
        hint: customHintInput.trim() || 'Reto especial de tu pareja',
        category: customCatInput.trim() || 'Reto de Pareja',
        author: currentProfile === 'Karla' ? 'Karlita' : 'Javier',
        isPartnerChallenge: true,
        guessed: [],
        status: 'playing',
      },
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
    setBattleshipRadarMode('fleet');
    const freshK = createRandomBattleshipFleet();
    const freshJ = createRandomBattleshipFleet();
    setLocalSetupFleet(currentProfile === 'Karla' ? freshK : freshJ);
    await updateAndSyncGames({
      ...gamesState,
      battleship: {
        ...bs,
        phase: 'invited',
        invitedBy: currentProfile,
        readyKarla: false,
        readyJavier: false,
        fleetKarla: freshK,
        fleetJavier: freshJ,
        shotsByKarla: [],
        shotsByJavier: [],
        turn: currentProfile,
        lastShot: null,
        winner: null,
      },
    });
  };

  // 2) Aceptar la invitación e ir a la fase de acomodar barcos en 10x10
  const handleAcceptBattleshipInvite = async () => {
    setBattleshipRadarMode('fleet');
    setLocalSetupFleet(currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier);
    await updateAndSyncGames({
      ...gamesState,
      battleship: {
        ...bs,
        phase: 'setup',
        readyKarla: false,
        readyJavier: false,
        shotsByKarla: [],
        shotsByJavier: [],
        lastShot: null,
        winner: null,
      },
    });
  };

  // 4) Reacomodar mi flota al azar durante el despliegue
  const handleShuffleMyFleet = () => {
    if (amIReady) return;
    const randomFleet = createRandomBattleshipFleet();
    setLocalSetupFleet(randomFleet);
  };

  // 5) Confirmar "¡Flota Lista!" (sincronizando la posición arrastrada) y pasar a batalla
  const handleConfirmFleetReady = async (forceStartBoth = false) => {
    const isK = currentProfile === 'Karla';
    const nextReadyK = forceStartBoth ? true : isK ? !bs.readyKarla : bs.readyKarla;
    const nextReadyJ = forceStartBoth ? true : !isK ? !bs.readyJavier : bs.readyJavier;
    const bothReady = nextReadyK && nextReadyJ;
    const finalMyFleet = localSetupFleet || syncedMyFleet;

    if (bothReady) {
      setBattleshipRadarMode('attack');
    }

    await updateAndSyncGames({
      ...gamesState,
      battleship: {
        ...bs,
        phase: bothReady ? 'battle' : 'setup',
        readyKarla: nextReadyK,
        readyJavier: nextReadyJ,
        fleetKarla: isK ? finalMyFleet : bs.fleetKarla,
        fleetJavier: !isK ? finalMyFleet : bs.fleetJavier,
      },
    });
  };

  // 6) Reiniciar a nueva sala de preparación 10x10
  const handleResetBattleship = async () => {
    setBattleshipRadarMode('fleet');
    const freshK = createRandomBattleshipFleet();
    const freshJ = createRandomBattleshipFleet();
    setLocalSetupFleet(currentProfile === 'Karla' ? freshK : freshJ);
    await updateAndSyncGames({
      ...gamesState,
      battleship: {
        ...bs,
        phase: 'setup',
        invitedBy: currentProfile,
        readyKarla: false,
        readyJavier: false,
        fleetKarla: freshK,
        fleetJavier: freshJ,
        shotsByKarla: [],
        shotsByJavier: [],
        turn: bs.turn === 'Karla' ? 'Javier' : 'Karla',
        lastShot: null,
        winner: null,
      },
    });
  };

  // 7) Disparar proyectil animado (bala/torpedo) en cuadrícula 10x10
  const handleBattleshipFire = async (cellIdx: number) => {
    if (bs.winner || bs.phase !== 'battle' || firingBullet) return;

    if (bs.turn !== currentProfile) {
      Alert.alert(
        `Turno de ${getDisplayName(bs.turn)}`,
        `Espera a que ${getDisplayName(bs.turn)} realice su disparo naval.`
      );
      return;
    }

    const shooter = currentProfile;
    const isShooterKarla = shooter === 'Karla';
    const currentShots = isShooterKarla ? bs.shotsByKarla : bs.shotsByJavier;
    const targetFleet = isShooterKarla ? bs.fleetJavier : bs.fleetKarla;

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

    const nextShots = [...currentShots, cellIdx];
    const justSunk = hitShip ? hitShip.cells.every((c) => nextShots.includes(c)) : false;

    if (isHit) {
      hitBannerScale.setValue(1.22);
      Animated.spring(hitBannerScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }

    const allEnemySunk = targetFleet.every((s) => s.cells.every((c) => nextShots.includes(c)));
    const nextWinner: 'Karla' | 'Javier' | null = allEnemySunk ? shooter : null;

    const nextTurn: 'Karla' | 'Javier' = isHit
      ? shooter
      : shooter === 'Karla'
      ? 'Javier'
      : 'Karla';

    let nextLb = gamesState.leaderboard;
    if (isHit) {
      nextLb = addLeaderboardReward(gamesState, shooter, justSunk ? 100 : 35, 0);
    }
    if (nextWinner) {
      nextLb = addLeaderboardReward(
        { ...gamesState, leaderboard: nextLb },
        nextWinner,
        650,
        1
      );
    }

    await updateAndSyncGames({
      ...gamesState,
      leaderboard: nextLb,
      battleship: {
        ...bs,
        phase: nextWinner ? 'finished' : 'battle',
        shotsByKarla: isShooterKarla ? nextShots : bs.shotsByKarla,
        shotsByJavier: !isShooterKarla ? nextShots : bs.shotsByJavier,
        turn: nextTurn,
        lastShot: {
          shooter,
          cell: cellIdx,
          hit: isHit,
          sunkShipName: justSunk && hitShip ? hitShip.name : undefined,
        },
        winner: nextWinner,
        winsKarla: nextWinner === 'Karla' ? (bs.winsKarla || 0) + 1 : bs.winsKarla || 0,
        winsJavier: nextWinner === 'Javier' ? (bs.winsJavier || 0) + 1 : bs.winsJavier || 0,
      },
    });

    if (nextWinner) {
      triggerVictoryCelebration({
        winnerName: getDisplayName(nextWinner),
        gameTitle: '¡Flota Enemiga Hundida!',
        pointsEarned: 650,
        subtitle: 'Destruiste los 5 buques de guerra en el radar 10x10.',
        color: nextWinner === 'Karla' ? '#9333ea' : '#0284c7',
        onPlayAgain: () => void handleResetBattleship(),
      });
    }
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

  // Renderizador adaptable del juego activo (En Pantalla Completa se transforma en Consola Pro Independiente)
  const renderActiveGameArena = (isFull: boolean) => {
    const proMaxBoard = Math.min(SCREEN_W - 36, Math.floor(SCREEN_H * 0.45), 344);
    const boardPx = isFull ? proMaxBoard : COMPACT_BOARD_SIZE;
    const chessCellPx = Math.floor((boardPx - 18) / 8);
    const sudokuCellPx = Math.floor((boardPx - 6) / 9);
    const bsCoordHeaderPx = isFull ? 16 : 12;
    const battleshipCellPx = Math.floor((boardPx - bsCoordHeaderPx - 4) / 10);

    return (
      <View
        style={[
          styles.arenaCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >

        {/* ================= 1. TRES EN RAYA (TABLERO BLANCO, TONOS PASTEL, SIN NEGRO) ================= */}
        {activeGame === 'tictactoe' && (
          <View style={styles.gameBodyCentered}>
            {/* Pill único de turno arriba */}
            <View
              style={[
                styles.unifiedTurnPill,
                gamesState.ticTacToe.winner
                  ? { backgroundColor: '#d1fae5', borderColor: '#34d399' }
                  : gamesState.ticTacToe.turn === 'Karla'
                  ? { backgroundColor: '#f3e8ff', borderColor: '#c084fc' }
                  : { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
              ]}
            >
              <View
                style={[
                  styles.turnDot,
                  {
                    backgroundColor: gamesState.ticTacToe.winner
                      ? '#059669'
                      : gamesState.ticTacToe.turn === 'Karla'
                      ? '#9333ea'
                      : '#0284c7',
                  },
                ]}
              />
              <Text
                style={[
                  styles.unifiedTurnPillText,
                  {
                    color: gamesState.ticTacToe.winner
                      ? '#059669'
                      : gamesState.ticTacToe.turn === 'Karla'
                      ? '#9333ea'
                      : '#0284c7',
                  },
                ]}
              >
                {gamesState.ticTacToe.winner
                  ? gamesState.ticTacToe.winner === 'Empate'
                    ? '¡EMPATE! (+40 PTS)'
                    : `¡VICTORIA DE ${gamesState.ticTacToe.winner === 'Karla' ? 'KARLITA' : 'JAVIER'}! (+150 PTS)`
                  : `TURNO: ${gamesState.ticTacToe.turn === 'Karla' ? 'KARLITA (✕)' : 'JAVIER (○)'}`}
              </Text>
            </View>

            <View
              style={[
                styles.tttBoard,
                {
                  width: boardPx,
                  height: boardPx,
                  backgroundColor: '#ede9fe',
                  borderRadius: 22,
                  padding: 10,
                  borderWidth: 1.5,
                  borderColor: '#ddd6fe',
                  gap: 8,
                },
              ]}
            >
              {gamesState.ticTacToe.board.map((cell, idx) => {
                const isWinningCell = gamesState.ticTacToe.winningLine?.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => void handleTicTacToePress(idx)}
                    style={[
                      styles.tttCell,
                      {
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        shadowColor: '#7c3aed',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 4,
                        elevation: 2,
                      },
                      isWinningCell && {
                        backgroundColor: '#fef08a',
                        borderColor: '#eab308',
                        borderWidth: 3,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {cell === 'Karla' && (
                      <Text
                        style={[
                          styles.tttPiece,
                          {
                            fontSize: isFull ? 54 : 36,
                            color: '#9333ea',
                            fontWeight: '900',
                          },
                        ]}
                      >
                        ✕
                      </Text>
                    )}
                    {cell === 'Javier' && (
                      <Text
                        style={[
                          styles.tttPiece,
                          {
                            fontSize: isFull ? 54 : 36,
                            color: '#0284c7',
                            fontWeight: '900',
                          },
                        ]}
                      >
                        ○
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => void handleNewTicTacToeRound()}
              style={[
                styles.primaryGameBtn,
                {
                  backgroundColor: primaryColor,
                  width: '100%',
                },
              ]}
            >
              <Ionicons name="play-forward" size={16} color="#ffffff" />
              <Text style={styles.primaryGameBtnText}>
                {gamesState.ticTacToe.winner ? 'Jugar Siguiente Ronda' : 'Reiniciar Ronda'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= 2. SUDOKU (TABLERO BLANCO, LÍNEAS AZULES, HIGHLIGHTS PASTEL) ================= */}
        {activeGame === 'sudoku' && (() => {
          const digitCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
          sudoku.board.forEach((r) => {
            r.forEach((v) => {
              if (v >= 1 && v <= 9) digitCounts[v] = (digitCounts[v] || 0) + 1;
            });
          });
          return (
          <View style={styles.gameBodyCentered}>
            {/* Input oculto conectado al Teclado Numérico Nativo del Teléfono */}
            <TextInput
              ref={sudokuInputRef}
              value=""
              keyboardType="number-pad"
              caretHidden
              maxLength={1}
              onChangeText={(txt) => {
                const digit = parseInt(txt.slice(-1), 10);
                if (digit >= 1 && digit <= 9) {
                  void handleSudokuNumberPress(digit);
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace') {
                  void handleSudokuNumberPress(0);
                }
              }}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />

            <View style={styles.sudokuTopControls}>
              <View style={styles.diffPillsRow}>
                {[
                  { key: 'easy', label: 'Fácil' },
                  { key: 'medium', label: 'Medio' },
                  { key: 'hard', label: 'Difícil' },
                ].map((d) => {
                  const active = sudoku.difficulty === d.key;
                  return (
                    <TouchableOpacity
                      key={d.key}
                      onPress={() => void handleNewSudokuGame(d.key as any)}
                      style={[
                        styles.diffChip,
                        isFull && { backgroundColor: '#1e293b', borderColor: '#334155' },
                        active && {
                          backgroundColor: isFull ? '#0284c7' : primaryColor,
                          borderColor: isFull ? '#38bdf8' : primaryColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffChipText,
                          isFull && { color: '#cbd5e1' },
                          active && { color: '#ffffff' },
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Indicador de 3 Vidas de Sudoku */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                {[0, 1, 2].map((lifeIdx) => {
                  const alive = lifeIdx < MAX_SUDOKU_MISTAKES - sudoku.mistakes;
                  return (
                    <Ionicons
                      key={lifeIdx}
                      name={alive ? 'heart' : 'heart-dislike-outline'}
                      size={15}
                      color={alive ? '#e11d48' : '#94a3b8'}
                    />
                  );
                })}
              </View>

              <View style={styles.sudokuToolsMiniRow}>
                <TouchableOpacity
                  onPress={() => setIsNoteMode((n) => !n)}
                  style={[
                    styles.miniToolBtn,
                    isFull && { backgroundColor: '#1e293b' },
                    isNoteMode && { backgroundColor: isFull ? '#0284c7' : primaryColor },
                  ]}
                >
                  <Ionicons
                    name="pencil"
                    size={13}
                    color={isNoteMode ? '#ffffff' : isFull ? '#cbd5e1' : '#475569'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleSudokuNumberPress(0)}
                  style={[styles.miniToolBtn, isFull && { backgroundColor: '#1e293b' }]}
                >
                  <Ionicons
                    name="backspace-outline"
                    size={14}
                    color={isFull ? '#cbd5e1' : '#475569'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleSudokuHint()}
                  style={[
                    styles.miniToolBtn,
                    { backgroundColor: isFull ? '#1e293b' : `${primaryColor}18` },
                  ]}
                >
                  <Ionicons name="bulb" size={14} color={isFull ? '#fde047' : primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.sudokuGridContainer,
                { borderColor: '#2563eb', backgroundColor: '#ffffff', borderWidth: 2, borderRadius: 12, overflow: 'hidden' },
                isSudokuGameOver && { opacity: 0.45 },
              ]}
            >
              {sudoku.board.map((row, r) => (
                <View key={r} style={styles.sudokuRow}>
                  {row.map((val, c) => {
                    const selR = selectedSudokuCell?.[0];
                    const selC = selectedSudokuCell?.[1];
                    const isSelected = selR === r && selC === c;
                    const isSameCross =
                      selR !== undefined &&
                      selC !== undefined &&
                      (selR === r ||
                        selC === c ||
                        (Math.floor(selR / 3) === Math.floor(r / 3) &&
                          Math.floor(selC / 3) === Math.floor(c / 3)));

                    const selectedVal =
                      selR !== undefined && selC !== undefined ? sudoku.board[selR][selC] : 0;
                    const isSameNumber = val !== 0 && val === selectedVal;

                    const isFixed = sudoku.fixed[r][c];
                    const isWrong = val !== 0 && val !== sudoku.solution[r][c];
                    const cellNotes = sudoku.notes[`${r}-${c}`] || [];

                    const rightBorder = (c + 1) % 3 === 0 && c < 8 ? 2 : 0.5;
                    const bottomBorder = (r + 1) % 3 === 0 && r < 8 ? 2 : 0.5;

                    return (
                      <TouchableOpacity
                        key={`${r}-${c}`}
                        onPress={() => handleSelectSudokuCell(r, c)}
                        style={[
                          styles.sudokuCell,
                          {
                            width: sudokuCellPx,
                            height: sudokuCellPx,
                            borderRightWidth: rightBorder,
                            borderBottomWidth: bottomBorder,
                            borderRightColor: rightBorder === 2 ? '#2563eb' : '#e2e8f0',
                            borderBottomColor: bottomBorder === 2 ? '#2563eb' : '#e2e8f0',
                            backgroundColor: isSelected
                              ? '#bfdbfe'
                              : isSameNumber
                              ? '#fef3c7'
                              : isSameCross
                              ? '#eff6ff'
                              : '#ffffff',
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        {val !== 0 ? (
                          <Text
                            style={[
                              styles.sudokuValText,
                              { fontSize: isFull ? 18 : 14 },
                              isFixed
                                ? {
                                    color: '#0f172a',
                                    fontWeight: '900',
                                  }
                                : {
                                    color: currentProfile === 'Karla' ? '#9333ea' : '#0284c7',
                                    fontWeight: '800',
                                  },
                              isWrong && { color: '#ef4444', fontWeight: '900' },
                            ]}
                          >
                            {val}
                          </Text>
                        ) : cellNotes.length > 0 ? (
                          <Text
                            style={[
                              styles.sudokuNotesText,
                              isFull && { color: '#94a3b8' },
                            ]}
                          >
                            {cellNotes.join('')}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Teclado numérico físico propio (1-9) siempre visible y anclado abajo */}
            {isSudokuGameOver ? (
              <TouchableOpacity
                onPress={() => void handleNewSudokuGame(sudoku.difficulty)}
                style={[
                  styles.primaryGameBtn,
                  { backgroundColor: '#e11d48', width: '100%' },
                ]}
              >
                <Ionicons name="refresh-circle" size={18} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>
                  ¡Perdiste tus 3 vidas! Jugar Nuevo Sudoku
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: '100%', gap: 6, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                    const count = digitCounts[num] || 0;
                    const remaining = Math.max(0, 9 - count);
                    const isDone = remaining === 0;
                    return (
                      <TouchableOpacity
                        key={num}
                        disabled={isDone}
                        onPress={() => void handleSudokuNumberPress(num)}
                        style={[
                          styles.sudokuNumKey,
                          {
                            backgroundColor: isDone ? colors.surfaceAlt : colors.surface,
                            borderColor: isDone ? colors.border : '#93c5fd',
                            opacity: isDone ? 0.35 : 1,
                            paddingVertical: 5,
                            alignItems: 'center',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.sudokuNumKeyText, { color: isDone ? colors.textMuted : '#0f172a', fontWeight: '800' }]}>
                          {num}
                        </Text>
                        <Text style={{ fontSize: 9, fontWeight: '700', color: isDone ? colors.textMuted : '#2563eb' }}>
                          {isDone ? '✓' : remaining}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
          );
        })()}

        {/* ================= 3. AJEDREZ (CASILLAS CREMA Y ÁMBAR, PIEZAS LEGIBLES) ================= */}
        {activeGame === 'chess' && (
          <View style={styles.gameBodyCentered}>
            {/* Pill único de turno */}
            <View
              style={[
                styles.unifiedTurnPill,
                gamesState.chess.winner
                  ? { backgroundColor: '#d1fae5', borderColor: '#34d399' }
                  : gamesState.chess.turn === 'w'
                  ? { backgroundColor: '#f3e8ff', borderColor: '#c084fc' }
                  : { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
              ]}
            >
              <View
                style={[
                  styles.turnDot,
                  {
                    backgroundColor: gamesState.chess.winner
                      ? '#059669'
                      : gamesState.chess.turn === 'w'
                      ? '#9333ea'
                      : '#0284c7',
                  },
                ]}
              />
              <Text
                style={[
                  styles.unifiedTurnPillText,
                  {
                    color: gamesState.chess.winner
                      ? '#059669'
                      : gamesState.chess.turn === 'w'
                      ? '#9333ea'
                      : '#0284c7',
                  },
                ]}
              >
                {gamesState.chess.winner
                  ? `¡VICTORIA DE ${gamesState.chess.winner === 'w' ? 'KARLITA' : 'JAVIER'}!`
                  : `TURNO: ${gamesState.chess.turn === 'w' ? 'KARLITA (BLANCAS) 💜' : 'JAVIER (NEGRAS) 💙'}`}
              </Text>
              {isKingInCheck && !gamesState.chess.winner && (
                <View style={[styles.checkWarningBadge, { marginLeft: 6 }]}>
                  <Text style={styles.checkWarningText}>¡JAQUE!</Text>
                </View>
              )}
            </View>

            <View
              style={[
                styles.chessBoardOuter,
                {
                  borderColor: '#b45309',
                  borderWidth: 3,
                  borderRadius: 16,
                  backgroundColor: '#b45309',
                  overflow: 'hidden',
                },
              ]}
            >
              {gamesState.chess.board.map((row, r) => (
                <View key={r} style={styles.chessRow}>
                  {row.map((piece, c) => {
                    const isDarkSquare = (r + c) % 2 === 1;
                    const isSelected =
                      selectedChessPos?.[0] === r && selectedChessPos?.[1] === c;
                    const isLastMove =
                      (gamesState.chess.lastMove?.from[0] === r &&
                        gamesState.chess.lastMove?.from[1] === c) ||
                      (gamesState.chess.lastMove?.to[0] === r &&
                        gamesState.chess.lastMove?.to[1] === c);
                    const isTarget = validChessTargets.some(
                      ([tr, tc]) => tr === r && tc === c
                    );
                    const isKingCheckSquare =
                      isKingInCheck &&
                      piece &&
                      piece.type === 'k' &&
                      piece.color === gamesState.chess.turn;

                    return (
                      <TouchableOpacity
                        key={`${r}-${c}`}
                        onPress={() => void handleChessCellPress(r, c)}
                        style={[
                          styles.chessSquare,
                          {
                            width: chessCellPx,
                            height: chessCellPx,
                            backgroundColor: isKingCheckSquare
                              ? '#ef4444'
                              : isSelected
                              ? '#38bdf8'
                              : isLastMove
                              ? '#fde68a'
                              : isDarkSquare
                              ? '#d97706'
                              : '#fefae0',
                          },
                        ]}
                        activeOpacity={0.85}
                      >
                        {piece && (
                          <Text
                            style={[
                              styles.chessGlyph,
                              {
                                fontSize: isFull ? 30 : 23,
                                color: piece.color === 'w' ? '#ffffff' : '#1e293b',
                                textShadowColor: piece.color === 'w' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 3,
                              },
                            ]}
                          >
                            {CHESS_SYMBOLS[`${piece.color}-${piece.type}`]}
                          </Text>
                        )}
                        {isTarget && (
                          <View
                            style={[
                              styles.chessMoveIndicator,
                              { backgroundColor: '#0284c7aa' },
                              piece && styles.chessCaptureIndicator,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.chessControlsRow}>
              <TouchableOpacity
                onPress={() => void handleUndoChessMove()}
                disabled={chessHistory.length === 0}
                style={[
                  styles.secondaryGameBtn,
                  isFull
                    ? { backgroundColor: '#1e293b', borderColor: '#38bdf8' }
                    : { borderColor: primaryColor },
                  chessHistory.length === 0 && { opacity: 0.4 },
                ]}
              >
                <Ionicons
                  name="arrow-undo"
                  size={14}
                  color={isFull ? '#38bdf8' : primaryColor}
                />
                <Text
                  style={[
                    styles.secondaryGameBtnText,
                    { color: isFull ? '#38bdf8' : primaryColor },
                  ]}
                >
                  Deshacer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleResetChess()}
                style={[
                  styles.primaryGameBtn,
                  {
                    flex: 1,
                    marginTop: 0,
                    backgroundColor: isFull ? '#0284c7' : primaryColor,
                  },
                ]}
              >
                <Ionicons name="refresh" size={15} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>Nueva Partida</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ================= 4. EL AHORCADO (TARJETA ROSA PASTEL, AHORCADO GRIS, TECLADO 3 FILAS) ================= */}
        {activeGame === 'hangman' && (() => {
          const QWERTY_ROWS = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
          ];

          return (
          <View style={styles.gameBodyCentered}>
            {/* Tarjeta de Pistas Rosa Pastel */}
            <View
              style={[
                styles.hangmanStageCompact,
                { backgroundColor: '#fdf2f8', borderWidth: 1.5, borderColor: '#f472b6', borderRadius: 16 },
              ]}
            >
              <View style={styles.gallowsBoxCompact}>
                <View style={[styles.gallowsBase, { backgroundColor: '#475569' }]} />
                <View style={[styles.gallowsPole, { backgroundColor: '#475569' }]} />
                <View style={[styles.gallowsTop, { backgroundColor: '#475569' }]} />
                <View style={[styles.gallowsRope, { backgroundColor: '#94a3b8' }]} />
                {wrongGuessesCount >= 1 && (
                  <View style={[styles.hmHead, { borderColor: '#f43f5e', borderWidth: 3.5 }]} />
                )}
                {wrongGuessesCount >= 2 && (
                  <View style={[styles.hmBody, { backgroundColor: '#f43f5e', width: 3.5 }]} />
                )}
                {wrongGuessesCount >= 3 && (
                  <View style={[styles.hmArmLeft, { backgroundColor: '#f43f5e', height: 3.5 }]} />
                )}
                {wrongGuessesCount >= 4 && (
                  <View style={[styles.hmArmRight, { backgroundColor: '#f43f5e', height: 3.5 }]} />
                )}
                {wrongGuessesCount >= 5 && (
                  <View style={[styles.hmLegLeft, { backgroundColor: '#f43f5e', height: 3.5 }]} />
                )}
                {wrongGuessesCount >= 6 && (
                  <View style={[styles.hmLegRight, { backgroundColor: '#f43f5e', height: 3.5 }]} />
                )}
              </View>

              <View style={styles.hangmanInfoRight}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 4 }}>
                  {Array.from({ length: maxWrong }).map((_, i) => {
                    const isAlive = i < maxWrong - wrongGuessesCount;
                    return (
                      <Ionicons
                        key={i}
                        name={isAlive ? 'heart' : 'heart-dislike-outline'}
                        size={14}
                        color={isAlive ? '#e11d48' : '#cbd5e1'}
                      />
                    );
                  })}
                </View>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#db2777', textTransform: 'uppercase' }}>
                  {hangman.category || 'Palabra Oculta'}
                </Text>
                <Text style={[styles.hangmanHintBox, { color: '#334155' }]} numberOfLines={2}>
                  “{hangman.hint}”
                </Text>
              </View>
            </View>

            {/* Letras de la palabra centradas */}
            <View style={styles.wordSlotsWrap}>
              {hangman.word.split('').map((ch, idx) => {
                if (ch === ' ') return <View key={idx} style={{ width: 8 }} />;
                const revealed =
                  hangman.guessed.includes(ch) || hangman.status !== 'playing';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.wordSlotBox,
                      {
                        backgroundColor: '#ffffff',
                        borderColor: revealed ? '#f472b6' : '#cbd5e1',
                        borderWidth: 1.5,
                        borderRadius: 8,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.wordSlotChar,
                        { color: '#0f172a', fontWeight: '900' },
                      ]}
                    >
                      {revealed ? ch : ''}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Teclado QWERTY en 3 Filas con Teclas Blancas y Estados Verde/Rojo */}
            <View style={{ width: '100%', gap: 5, marginTop: 4 }}>
              {QWERTY_ROWS.map((rowLetters, rIdx) => (
                <View key={rIdx} style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
                  {rowLetters.map((letter) => {
                    const used = hangman.guessed.includes(letter);
                    const hit = used && hangman.word.includes(letter);
                    return (
                      <TouchableOpacity
                        key={letter}
                        disabled={used || hangman.status !== 'playing'}
                        onPress={() => void handleGuessLetter(letter)}
                        style={[
                          styles.azKey,
                          {
                            width: rIdx === 2 ? 38 : 31,
                            height: 36,
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1,
                          },
                          used && {
                            backgroundColor: hit ? '#dcfce7' : '#fee2e2',
                            borderColor: hit ? '#86efac' : '#fca5a5',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.azKeyText,
                            { color: '#1e293b', fontWeight: '800' },
                            used && {
                              color: hit ? '#16a34a' : '#dc2626',
                              textDecorationLine: hit ? 'none' : 'line-through',
                            },
                          ]}
                        >
                          {letter}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            <View style={styles.chessControlsRow}>
              <TouchableOpacity
                onPress={() => void handleRandomHangmanWord()}
                style={[
                  styles.secondaryGameBtn,
                  isFull
                    ? { backgroundColor: '#1e293b', borderColor: '#38bdf8' }
                    : { borderColor: primaryColor },
                ]}
              >
                <Ionicons
                  name="shuffle"
                  size={14}
                  color={isFull ? '#38bdf8' : primaryColor}
                />
                <Text
                  style={[
                    styles.secondaryGameBtnText,
                    { color: isFull ? '#38bdf8' : primaryColor },
                  ]}
                >
                  Otra Palabra
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsCustomWordModalOpen(true)}
                style={[
                  styles.primaryGameBtn,
                  {
                    flex: 1,
                    marginTop: 0,
                    backgroundColor: primaryColor,
                  },
                ]}
              >
                <Ionicons name="flame" size={14} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>Retar Pareja (+400)</Text>
              </TouchableOpacity>
            </View>
          </View>
          );
        })()}

        {/* ================= 5. BATTLESHIP 10x10 (INVITACIÓN, ACOMODAR BARCOS Y COMBATE NAVAL) ================= */}
        {activeGame === 'battleship' && (
          <View style={styles.gameBodyCentered}>
            {/* FASE 1: SALA DE INVITACIÓN DE PARTIDA EN VIVO */}
            {(bs.phase === 'idle' || bs.phase === 'invited') && (
              <View style={[styles.bsInviteCard, isFull && styles.bsInviteCardDark]}>
                <Animated.View
                  style={[
                    styles.bsRadarCircleIcon,
                    {
                      transform: [
                        {
                          scale: radarPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.95, 1.08],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Ionicons name="boat" size={36} color="#38bdf8" />
                </Animated.View>

                <Text style={[styles.bsInviteTitle, isFull && { color: '#f8fafc' }]}>
                  {bs.phase === 'invited'
                    ? bs.invitedBy === currentProfile
                      ? `Invitación enviada a ${currentProfile === 'Karla' ? 'Javier' : 'Karlita'}`
                      : `¡${bs.invitedBy === 'Karla' ? 'Karlita' : 'Javier'} te desafía a Battleship 10x10!`
                    : 'Battleship: Batalla Naval 10x10'}
                </Text>

                <Text style={[styles.bsInviteDesc, isFull && { color: '#94a3b8' }]}>
                  {bs.phase === 'invited'
                    ? bs.invitedBy === currentProfile
                      ? 'Esperando a que tu pareja acepte para que cada uno acomode sus 5 barcos en secreto...'
                      : 'Acepta el reto para entrar al astillero, colocar tus 5 barcos en el tablero 10x10 y comenzar el combate.'
                    : 'Manda una invitación de partida para que ambos acomoden su flota secreta de 5 barcos (Portaaviones, Acorazado, Crucero, Submarino y Destructor).'}
                </Text>

                {bs.phase === 'idle' ? (
                  <TouchableOpacity
                    onPress={() => void handleSendBattleshipInvite()}
                    style={[styles.bsActionLaunchBtn, { backgroundColor: '#0284c7' }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="radio" size={18} color="#ffffff" />
                    <Text style={styles.bsActionLaunchText}>
                      Mandar Invitación de Partida
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: '100%', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => void handleAcceptBattleshipInvite()}
                      style={[styles.bsActionLaunchBtn, { backgroundColor: '#10b981' }]}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.bsActionLaunchText}>
                        {bs.invitedBy === currentProfile
                          ? 'Ir a Acomodar Mis Barcos'
                          : '¡Aceptar Partida y Acomodar Flota!'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* FASE 2: ACOMODAR MIS BARCOS EN EL TABLERO 10x10 (ARRASTRAR Y TOCAR PARA ROTAR AHÍ MISMO) */}
            {bs.phase === 'setup' && (
              <>
                <View style={styles.bsSetupTopBar}>
                  <Text
                    style={[
                      styles.bsSetupInstruction,
                      isFull && { color: '#38bdf8' },
                    ]}
                    numberOfLines={1}
                  >
                    Arrastra un barco o tócalo para rotarlo
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRotateSelectedShipInPlace()}
                    style={[
                      styles.bsRotateBtn,
                      { backgroundColor: isFull ? '#1e293b' : '#e0f2fe' },
                    ]}
                  >
                    <Ionicons name="sync" size={13} color="#0284c7" />
                    <Text style={styles.bsRotateBtnText}>Rotar Barco</Text>
                  </TouchableOpacity>
                </View>

                {/* Selector de los 5 Barcos (Toca para seleccionar o volver a tocar para rotar en su lugar) */}
                <View style={styles.bsShipsPickerRow}>
                  {myFleet.map((ship) => {
                    const selected = selectedSetupShipId === ship.id;
                    return (
                      <TouchableOpacity
                        key={ship.id}
                        onPress={() => {
                          if (selected) {
                            handleRotateSelectedShipInPlace(ship.id);
                          } else {
                            setSelectedSetupShipId(ship.id);
                            setSetupOrientation(ship.orientation || 'H');
                          }
                        }}
                        style={[
                          styles.bsShipPickerPill,
                          isFull && { backgroundColor: '#1e293b', borderColor: '#334155' },
                          selected && {
                            backgroundColor: '#0284c7',
                            borderColor: '#38bdf8',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bsShipPickerText,
                            isFull && { color: '#cbd5e1' },
                            selected && { color: '#ffffff' },
                          ]}
                          numberOfLines={1}
                        >
                          {ship.name.slice(0, 6)}. ({ship.size})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Tablero 10x10 de Despliegue con Soporte de Arrastrar (Drag) y Tocar para Rotar */}
                <View style={styles.bsGridOuter10x10}>
                  {/* Encabezado de Columnas 1..10 */}
                  <View style={styles.chessRow}>
                    <View
                      style={{
                        width: bsCoordHeaderPx,
                        height: bsCoordHeaderPx,
                        backgroundColor: '#0369a1',
                      }}
                    />
                    {COL_NUMBERS.map((colLbl) => (
                      <View
                        key={colLbl}
                        style={[
                          styles.bsCoordHeaderCell,
                          { width: battleshipCellPx, height: bsCoordHeaderPx },
                        ]}
                      >
                        <Text style={styles.bsCoordText}>{colLbl}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={{ flexDirection: 'row' }}>
                    {/* Columna izquierda de letras A..J */}
                    <View>
                      {ROW_LETTERS.map((rowLbl) => (
                        <View
                          key={rowLbl}
                          style={[
                            styles.bsCoordHeaderCell,
                            { width: bsCoordHeaderPx, height: battleshipCellPx },
                          ]}
                        >
                          <Text style={styles.bsCoordText}>{rowLbl}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Lienzo 10x10 Interactivo (Arrastrar Barcos Fluido + Tocar Barco para Rotar en su sitio) */}
                    <View
                      pointerEvents="box-only"
                      style={{
                        width: battleshipCellPx * 10,
                        height: battleshipCellPx * 10,
                      }}
                      onStartShouldSetResponder={() => !amIReady}
                      onMoveShouldSetResponder={() => !amIReady}
                      onResponderGrant={(evt) => {
                        if (amIReady) return;
                        const col = Math.max(
                          0,
                          Math.min(9, Math.floor(evt.nativeEvent.locationX / battleshipCellPx))
                        );
                        const row = Math.max(
                          0,
                          Math.min(9, Math.floor(evt.nativeEvent.locationY / battleshipCellPx))
                        );
                        const cellIdx = row * 10 + col;
                        const touchedShip = myFleet.find((s) => s.cells.includes(cellIdx));

                        if (touchedShip) {
                          setSelectedSetupShipId(touchedShip.id);
                          setSetupOrientation(touchedShip.orientation || 'H');
                          dragSessionRef.current = {
                            shipId: touchedShip.id,
                            startCell: cellIdx,
                            lastCell: cellIdx,
                            didDragMove: false,
                            startedOnSelectedShip: true,
                          };
                        } else {
                          dragSessionRef.current = {
                            shipId: selectedSetupShipId,
                            startCell: cellIdx,
                            lastCell: cellIdx,
                            didDragMove: true,
                            startedOnSelectedShip: false,
                          };
                          moveOrRotateShipLocally(selectedSetupShipId, cellIdx);
                        }
                      }}
                      onResponderMove={(evt) => {
                        if (amIReady || !dragSessionRef.current) return;
                        const col = Math.max(
                          0,
                          Math.min(9, Math.floor(evt.nativeEvent.locationX / battleshipCellPx))
                        );
                        const row = Math.max(
                          0,
                          Math.min(9, Math.floor(evt.nativeEvent.locationY / battleshipCellPx))
                        );
                        const cellIdx = row * 10 + col;
                        if (cellIdx !== dragSessionRef.current.lastCell) {
                          dragSessionRef.current.lastCell = cellIdx;
                          dragSessionRef.current.didDragMove = true;
                          moveOrRotateShipLocally(dragSessionRef.current.shipId, cellIdx);
                        }
                      }}
                      onResponderRelease={() => {
                        const session = dragSessionRef.current;
                        dragSessionRef.current = null;
                        if (session && !session.didDragMove && session.startedOnSelectedShip) {
                          // Tocar un barco sin arrastrarlo lo rota ahí mismo (Horizontal <-> Vertical)
                          handleRotateSelectedShipInPlace(session.shipId);
                        }
                      }}
                    >
                      {ROW_LETTERS.map((rowLbl, r) => (
                        <View key={rowLbl} style={styles.chessRow}>
                          {Array.from({ length: 10 }).map((__, c) => {
                            const idx = r * 10 + c;
                            const shipHere = myFleet.find((s) => s.cells.includes(idx));
                            const isSelectedShip = shipHere?.id === selectedSetupShipId;

                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.bsCell10x10,
                                  {
                                    width: battleshipCellPx,
                                    height: battleshipCellPx,
                                  },
                                ]}
                              >
                                {shipHere &&
                                  renderConnectedShipSegment(
                                    shipHere,
                                    idx,
                                    battleshipCellPx,
                                    false,
                                    false,
                                    Boolean(isSelectedShip)
                                  )}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Barra de Confirmación de Flota Lista */}
                <View style={styles.chessControlsRow}>
                  <TouchableOpacity
                    onPress={() => void handleShuffleMyFleet()}
                    style={[
                      styles.secondaryGameBtn,
                      {
                        borderColor: '#0284c7',
                        backgroundColor: isFull ? '#1e293b' : '#ffffff',
                      },
                    ]}
                  >
                    <Ionicons name="shuffle" size={14} color="#38bdf8" />
                    <Text style={[styles.secondaryGameBtnText, { color: '#0284c7' }]}>
                      Azar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => void handleConfirmFleetReady(false)}
                    style={[
                      styles.primaryGameBtn,
                      {
                        flex: 1,
                        marginTop: 0,
                        backgroundColor: amIReady ? '#10b981' : '#0284c7',
                      },
                    ]}
                  >
                    <Ionicons
                      name={amIReady ? 'checkmark-done' : 'shield-checkmark'}
                      size={15}
                      color="#ffffff"
                    />
                    <Text style={styles.primaryGameBtnText}>
                      {amIReady
                        ? isPartnerReady
                          ? '¡Iniciando!'
                          : 'Listo (Esperando pareja)'
                        : '¡Flota Lista!'}
                    </Text>
                  </TouchableOpacity>

                  {amIReady && !isPartnerReady && (
                    <TouchableOpacity
                      onPress={() => void handleConfirmFleetReady(true)}
                      style={[
                        styles.secondaryGameBtn,
                        { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
                      ]}
                    >
                      <Text style={[styles.secondaryGameBtnText, { color: '#059669' }]}>
                        Iniciar Ya
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* FASE 3: COMBATE NAVAL 10x10 (NIEBLA DE GUERRA REAL + BARCOS COMPLETOS) */}
            {(bs.phase === 'battle' || bs.phase === 'finished') && (
              <>
                <Animated.View
                  style={[
                    styles.bsTopRow,
                    { transform: [{ scale: hitBannerScale }] },
                  ]}
                >
                  <View
                    style={[
                      styles.bsStatusPill,
                      isFull && { backgroundColor: '#0f172a', borderColor: '#1e293b' },
                      bs.lastShot?.hit && {
                        backgroundColor: isFull ? '#450a0a' : '#fef2f2',
                        borderColor: '#ef4444',
                      },
                    ]}
                  >
                    <Ionicons
                      name={bs.lastShot?.hit ? 'flame' : 'locate'}
                      size={14}
                      color={bs.lastShot?.hit ? '#ef4444' : '#38bdf8'}
                    />
                    <Text
                      style={[
                        styles.bsStatusText,
                        isFull && { color: '#f8fafc' },
                      ]}
                      numberOfLines={1}
                    >
                      {bs.winner
                        ? `¡VICTORIA NAVAL DE ${bs.winner === 'Karla' ? 'KARLITA' : 'JAVIER'}!`
                        : bs.lastShot?.sunkShipName
                        ? `¡HUNDIDO: ${bs.lastShot.sunkShipName.toUpperCase()}! Dispara ${
                            bs.turn === 'Karla' ? 'Karlita' : 'Javier'
                          }`
                        : bs.lastShot?.hit
                        ? `¡IMPACTO EN ${
                            ROW_LETTERS[Math.floor(bs.lastShot.cell / 10)]
                          }${(bs.lastShot.cell % 10) + 1}! Repite ${
                            bs.turn === 'Karla' ? 'Karlita' : 'Javier'
                          }`
                        : `Turno de fuego: ${bs.turn === 'Karla' ? 'Karlita' : 'Javier'}`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.bsModeSwitch,
                      isFull && { backgroundColor: '#1e293b' },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => setBattleshipRadarMode('attack')}
                      style={[
                        styles.bsModeBtn,
                        battleshipRadarMode === 'attack' && {
                          backgroundColor: '#e11d48',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bsModeBtnText,
                          isFull && { color: '#cbd5e1' },
                          battleshipRadarMode === 'attack' && { color: '#ffffff' },
                        ]}
                      >
                        Radar Ataque
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setBattleshipRadarMode('fleet')}
                      style={[
                        styles.bsModeBtn,
                        battleshipRadarMode === 'fleet' && {
                          backgroundColor: '#0284c7',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.bsModeBtnText,
                          isFull && { color: '#cbd5e1' },
                          battleshipRadarMode === 'fleet' && { color: '#ffffff' },
                        ]}
                      >
                        Mis Barcos ({currentProfile === 'Karla' ? remainingShipsKarla : remainingShipsJavier}/5)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {/* Monitor de Siluetas de los 5 Barcos (Muestra cuáles siguen a flote y cuáles se hundieron) */}
                <View style={styles.bsFleetSilhouettesBar}>
                  {(battleshipRadarMode === 'attack' ? enemyFleet : myFleet).map((ship) => {
                    const shotsRef =
                      battleshipRadarMode === 'attack' ? myShots : enemyShotsAtMe;
                    const sunk = isShipSunk(ship, shotsRef);
                    return (
                      <View
                        key={ship.id}
                        style={[
                          styles.bsSilhouetteChip,
                          sunk ? styles.bsSilhouetteSunk : styles.bsSilhouetteAlive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.bsSilhouetteName,
                            sunk && { textDecorationLine: 'line-through', color: '#fca5a5' },
                          ]}
                        >
                          {ship.name.slice(0, 5)}
                        </Text>
                        <View style={styles.bsSilhouetteBlocks}>
                          {Array.from({ length: ship.size }).map((_, bIdx) => (
                            <View
                              key={bIdx}
                              style={[
                                styles.bsSilhouetteMiniBlock,
                                {
                                  backgroundColor: sunk ? '#ef4444' : '#38bdf8',
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Tablero Táctico 10x10 con Coordenadas A-J y 1-10 */}
                <View style={styles.bsGridOuter10x10}>
                  <View style={styles.chessRow}>
                    <View
                      style={{
                        width: bsCoordHeaderPx,
                        height: bsCoordHeaderPx,
                        backgroundColor: '#082f49',
                      }}
                    />
                    {COL_NUMBERS.map((colLbl) => (
                      <View
                        key={colLbl}
                        style={[
                          styles.bsCoordHeaderCell,
                          { width: battleshipCellPx, height: bsCoordHeaderPx },
                        ]}
                      >
                        <Text style={styles.bsCoordText}>{colLbl}</Text>
                      </View>
                    ))}
                  </View>

                  {ROW_LETTERS.map((rowLbl, r) => (
                    <View key={rowLbl} style={styles.chessRow}>
                      <View
                        style={[
                          styles.bsCoordHeaderCell,
                          { width: bsCoordHeaderPx, height: battleshipCellPx },
                        ]}
                      >
                        <Text style={styles.bsCoordText}>{rowLbl}</Text>
                      </View>

                      {Array.from({ length: 10 }).map((__, c) => {
                        const idx = r * 10 + c;
                        const isAttackView = battleshipRadarMode === 'attack';

                        // PRIVACIDAD ESTRICTA:
                        // - En "Mis Barcos": ves SOLO tu propia flota (`myFleet`) y los impactos que te ha dado tu pareja (`enemyShotsAtMe`).
                        // - En "Radar Ataque": disparas al mar enemigo (`enemyFleet`), pero SOLO se revelan los barcos enemigos que YA HUNDISTE por completo (`isSunk`).
                        const targetFleet = isAttackView ? enemyFleet : myFleet;
                        const activeShots = isAttackView ? myShots : enemyShotsAtMe;

                        const isShot = activeShots.includes(idx);
                        const shipHere = targetFleet.find((s) => s.cells.includes(idx));
                        const isHit = isShot && Boolean(shipHere);
                        const isSunk =
                          Boolean(shipHere) &&
                          shipHere!.cells.every((cell) => activeShots.includes(cell));

                        // Solo dibujamos el casco completo si estamos viendo NUESTRA propia flota, o si el barco enemigo YA FUE HUNDIDO
                        const showConnectedShip =
                          (!isAttackView && Boolean(shipHere)) ||
                          Boolean(isSunk && shipHere) ||
                          Boolean(bs.winner && shipHere);

                        return (
                          <TouchableOpacity
                            key={idx}
                            disabled={!isAttackView || isShot || Boolean(bs.winner)}
                            onPress={() => void handleBattleshipFire(idx)}
                            style={[
                              styles.bsCell10x10,
                              {
                                width: battleshipCellPx,
                                height: battleshipCellPx,
                              },
                              isShot && !isHit && styles.bsCellMiss,
                              isHit && !showConnectedShip && styles.bsCellHit,
                            ]}
                            activeOpacity={0.75}
                          >
                            {showConnectedShip && shipHere ? (
                              renderConnectedShipSegment(
                                shipHere,
                                idx,
                                battleshipCellPx,
                                isHit,
                                isSunk,
                                false
                              )
                            ) : isHit ? (
                              <Ionicons
                                name="flame"
                                size={Math.max(12, battleshipCellPx * 0.6)}
                                color="#fde047"
                              />
                            ) : isShot ? (
                              <View style={styles.bsWaterSplashDot} />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                  {/* Proyectil / Bala Animada que vuela desde el cañón hasta la casilla objetivo */}
                  {firingBullet &&
                    (() => {
                      const targetR = Math.floor(firingBullet.cellIdx / 10);
                      const targetC = firingBullet.cellIdx % 10;
                      const startX = bsCoordHeaderPx + battleshipCellPx * 5 - 8;
                      const startY = bsCoordHeaderPx + battleshipCellPx * 10 - 8;
                      const endX =
                        bsCoordHeaderPx + targetC * battleshipCellPx + battleshipCellPx / 2 - 8;
                      const endY =
                        bsCoordHeaderPx + targetR * battleshipCellPx + battleshipCellPx / 2 - 8;

                      const translateX = bulletProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [startX, endX],
                      });
                      const translateY = bulletProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [startY, endY],
                      });
                      const bulletScale = bulletProgress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.35, 1],
                      });

                      return (
                        <View
                          pointerEvents="none"
                          style={StyleSheet.absoluteFill}
                        >
                          {/* Bala / Misil en vuelo */}
                          <Animated.View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: '#facc15',
                              borderWidth: 2,
                              borderColor: '#ef4444',
                              shadowColor: '#f97316',
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.95,
                              shadowRadius: 8,
                              elevation: 8,
                              transform: [
                                { translateX },
                                { translateY },
                                { scale: bulletScale },
                              ],
                            }}
                          />

                          {/* Onda expansiva de impacto en la coordenada objetivo */}
                          <Animated.View
                            style={{
                              position: 'absolute',
                              top: endY - 8,
                              left: endX - 8,
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              borderWidth: 3,
                              borderColor: firingBullet.isHit ? '#ef4444' : '#38bdf8',
                              backgroundColor: firingBullet.isHit
                                ? 'rgba(239, 68, 68, 0.35)'
                                : 'rgba(56, 189, 248, 0.3)',
                              opacity: explosionScale,
                              transform: [
                                {
                                  scale: explosionScale.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.2, 1.6],
                                  }),
                                },
                              ],
                            }}
                          />
                        </View>
                      );
                    })()}
                </View>

                {/* Controles Inferiores del Combate */}
                <View style={styles.chessControlsRow}>
                  <TouchableOpacity
                    onPress={() =>
                      setBattleshipRadarMode((m) => (m === 'attack' ? 'fleet' : 'attack'))
                    }
                    style={[
                      styles.secondaryGameBtn,
                      {
                        borderColor: '#0284c7',
                        backgroundColor: isFull ? '#1e293b' : '#ffffff',
                      },
                    ]}
                  >
                    <Ionicons
                      name={battleshipRadarMode === 'attack' ? 'shield' : 'locate'}
                      size={14}
                      color="#38bdf8"
                    />
                    <Text style={[styles.secondaryGameBtnText, { color: '#0284c7' }]}>
                      {battleshipRadarMode === 'attack'
                        ? 'Ver Mis Barcos'
                        : 'Volver al Radar'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => void handleSendBattleshipInvite()}
                    style={[
                      styles.primaryGameBtn,
                      {
                        flex: 1,
                        marginTop: 0,
                        backgroundColor: isFull ? '#0284c7' : primaryColor,
                      },
                    ]}
                  >
                    <Ionicons name="radio" size={15} color="#ffffff" />
                    <Text style={styles.primaryGameBtnText}>Nueva Partida 10x10</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
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
      const isWhite = currentProfile === 'Javier';
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

    return list;
  }, [gamesState, currentProfile, sudoku, getDisplayName]);

  const getGameStatus = useCallback(
    (id: GameTab) => {
      switch (id) {
        case 'tictactoe': {
          if (gamesState.ticTacToe.winner) return { text: 'Terminado', isMyTurn: false };
          const isMyTurn = gamesState.ticTacToe.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.ticTacToe.turn)}`,
            isMyTurn,
          };
        }
        case 'battleship': {
          if (gamesState.battleship.winner) return { text: 'Terminado', isMyTurn: false };
          if (gamesState.battleship.phase === 'setup')
            return { text: 'Acomodar', isMyTurn: true };
          const isMyTurn = gamesState.battleship.turn === currentProfile;
          return {
            text: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.battleship.turn)}`,
            isMyTurn,
          };
        }
        case 'chess': {
          if (gamesState.chess.winner) return { text: 'Jaque Mate', isMyTurn: false };
          const isWhite = currentProfile === 'Karla';
          const isMyTurn =
            (gamesState.chess.turn === 'w' && isWhite) || (gamesState.chess.turn === 'b' && !isWhite);
          return { text: isMyTurn ? 'Tu turno' : `Turno de ${getDisplayName(gamesState.chess.turn === 'w' ? 'Karla' : 'Javier')}`, isMyTurn };
        }
        case 'sudoku': {
          if (sudoku.completed) return { text: 'Completado', isMyTurn: false };
          return { text: 'Jugar ahora', isMyTurn: true };
        }
        case 'hangman': {
          if (gamesState.hangman.status !== 'playing')
            return {
              text: gamesState.hangman.status === 'won' ? '¡Ganado!' : 'Terminado',
              isMyTurn: false,
            };
          return { text: 'Adivinar palabra', isMyTurn: true };
        }
      }
    },
    [gamesState, currentProfile, sudoku, getDisplayName]
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
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      {/* ================= VISTA LOBBY ZERO-SCROLL: MARCADOR + GRID 2x2 + 1 FULL WIDTH ================= */}
      <View style={styles.lobbyZeroScrollContainer}>
        {/* 1. Marcador Compacto Karlita vs Javier */}
        <View style={[styles.lobbyScoreboard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.lobbyPlayer}>
            <View style={[styles.lobbyAvatarCircle, { backgroundColor: '#f3e8ff', borderColor: '#c084fc' }]}>
              <Text style={[styles.lobbyAvatarText, { color: '#9333ea' }]}>
                {getDisplayName('Karla').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.lobbyPlayerName, { color: colors.text }]} numberOfLines={1}>
                {getDisplayName('Karla')}
              </Text>
              <View style={styles.lobbyScorePills}>
                <Text style={[styles.lobbyPoints, { color: '#9333ea' }]}>{lb.pointsKarla} pts</Text>
                <Text style={[styles.lobbyStars, { color: colors.textMuted }]}>• {lb.trophiesKarla} ★</Text>
              </View>
            </View>
          </View>

          <View style={[styles.lobbyVsBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.lobbyVsText, { color: colors.primary }]}>VS</Text>
          </View>

          <View style={[styles.lobbyPlayer, { justifyContent: 'flex-end', flexDirection: 'row-reverse' }]}>
            <View style={[styles.lobbyAvatarCircle, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
              <Text style={[styles.lobbyAvatarText, { color: '#0284c7' }]}>
                {getDisplayName('Javier').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.lobbyPlayerName, { color: colors.text }]} numberOfLines={1}>
                {getDisplayName('Javier')}
              </Text>
              <View style={styles.lobbyScorePills}>
                <Text style={[styles.lobbyStars, { color: colors.textMuted }]}>{lb.trophiesJavier} ★ •</Text>
                <Text style={[styles.lobbyPoints, { color: '#0284c7' }]}>{lb.pointsJavier} pts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Grid de 5 Juegos: 2 Columnas x 2 Filas + 5to Juego en Fila Completa */}
        {(() => {
          // Ordenar juegos: donde es el turno del usuario van PRIMERO
          const sortedGames = [...ALL_GAMES].sort((a, b) => {
            const stA = getGameStatus(a.id);
            const stB = getGameStatus(b.id);
            if (stA.isMyTurn && !stB.isMyTurn) return -1;
            if (!stA.isMyTurn && stB.isMyTurn) return 1;
            return 0;
          });

          const gridGames = sortedGames.slice(0, 4);
          const fullWidthGame = sortedGames[4];

          return (
            <View style={styles.lobbyGamesGridArea}>
              {/* Filas 1 y 2: 4 juegos distribuidos en filas explícitas de 2 columnas (ancho amplio garantizado) */}
              <View style={styles.lobbyGridRowsContainer}>
                {/* Fila 1 */}
                <View style={styles.lobbyGridRow}>
                  {[gridGames[0], gridGames[1]].filter(Boolean).map((g) => {
                    const status = getGameStatus(g.id);
                    return (
                      <View key={g.id} style={styles.lobbyCol}>
                        <PressableScale
                          onPress={() => setPendingGameToLaunch(g.id)}
                          style={[
                            styles.lobbyCardCompact,
                            {
                              backgroundColor: colors.surface,
                              borderColor: status.isMyTurn ? colors.primary : colors.border,
                              borderWidth: status.isMyTurn ? 2 : 1,
                            },
                          ]}
                          scaleTo={0.96}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <View style={[styles.lobbyCardIconBox, { backgroundColor: g.bgTint }]}>
                              <Ionicons name={g.icon as any} size={22} color={g.iconColor} />
                            </View>
                            <View
                              style={[
                                styles.turnBadgeMini,
                                {
                                  backgroundColor: status.isMyTurn ? `${colors.primary}18` : colors.surfaceAlt,
                                  borderColor: status.isMyTurn ? colors.primary : colors.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.turnDot,
                                  { backgroundColor: status.isMyTurn ? colors.primary : colors.textMuted },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.turnBadgeMiniText,
                                  { color: status.isMyTurn ? colors.primary : colors.textMuted },
                                ]}
                                numberOfLines={1}
                              >
                                {status.text}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.lobbyCardTitle, { color: colors.text }]} numberOfLines={1}>
                            {g.label}
                          </Text>
                          <Text style={[styles.lobbyCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                            {g.description}
                          </Text>
                        </PressableScale>
                      </View>
                    );
                  })}
                </View>

                {/* Fila 2 */}
                <View style={styles.lobbyGridRow}>
                  {[gridGames[2], gridGames[3]].filter(Boolean).map((g) => {
                    const status = getGameStatus(g.id);
                    return (
                      <View key={g.id} style={styles.lobbyCol}>
                        <PressableScale
                          onPress={() => setPendingGameToLaunch(g.id)}
                          style={[
                            styles.lobbyCardCompact,
                            {
                              backgroundColor: colors.surface,
                              borderColor: status.isMyTurn ? colors.primary : colors.border,
                              borderWidth: status.isMyTurn ? 2 : 1,
                            },
                          ]}
                          scaleTo={0.96}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <View style={[styles.lobbyCardIconBox, { backgroundColor: g.bgTint }]}>
                              <Ionicons name={g.icon as any} size={22} color={g.iconColor} />
                            </View>
                            <View
                              style={[
                                styles.turnBadgeMini,
                                {
                                  backgroundColor: status.isMyTurn ? `${colors.primary}18` : colors.surfaceAlt,
                                  borderColor: status.isMyTurn ? colors.primary : colors.border,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.turnDot,
                                  { backgroundColor: status.isMyTurn ? colors.primary : colors.textMuted },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.turnBadgeMiniText,
                                  { color: status.isMyTurn ? colors.primary : colors.textMuted },
                                ]}
                                numberOfLines={1}
                              >
                                {status.text}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.lobbyCardTitle, { color: colors.text }]} numberOfLines={1}>
                            {g.label}
                          </Text>
                          <Text style={[styles.lobbyCardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                            {g.description}
                          </Text>
                        </PressableScale>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Fila 3: 5to juego en ancho completo horizontal */}
              {fullWidthGame && (() => {
                const status = getGameStatus(fullWidthGame.id);
                return (
                  <View style={styles.lobbyFullRow}>
                    <PressableScale
                      onPress={() => setPendingGameToLaunch(fullWidthGame.id)}
                      style={[
                        styles.lobbyCardFullWidth,
                        {
                          backgroundColor: colors.surface,
                          borderColor: status.isMyTurn ? colors.primary : colors.border,
                          borderWidth: status.isMyTurn ? 2 : 1,
                        },
                      ]}
                      scaleTo={0.97}
                    >
                      <View style={[styles.lobbyCardIconBox, { backgroundColor: fullWidthGame.bgTint }]}>
                        <Ionicons name={fullWidthGame.icon as any} size={24} color={fullWidthGame.iconColor} />
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <Text style={[styles.lobbyCardTitle, { color: colors.text }]} numberOfLines={1}>
                          {fullWidthGame.label}
                        </Text>
                        <Text style={[styles.lobbyCardDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {fullWidthGame.description}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.turnBadgeMini,
                          {
                            backgroundColor: status.isMyTurn ? `${colors.primary}18` : colors.surfaceAlt,
                            borderColor: status.isMyTurn ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.turnDot,
                            { backgroundColor: status.isMyTurn ? colors.primary : colors.textMuted },
                          ]}
                        />
                        <Text
                          style={[
                            styles.turnBadgeMiniText,
                            { color: status.isMyTurn ? colors.primary : colors.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {status.text}
                        </Text>
                      </View>
                    </PressableScale>
                  </View>
                );
              })()}
            </View>
          );
        })()}
      </View>

      {/* ================= MODAL DE CONFIRMACIÓN: INICIAR PARTIDA ================= */}
      <Modal
        visible={Boolean(pendingGameToLaunch)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingGameToLaunch(null)}
      >
        <View style={styles.launchModalOverlay}>
          {pendingGameToLaunch && (() => {
            const gameInfo = ALL_GAMES.find((g) => g.id === pendingGameToLaunch);
            const status = getGameStatus(pendingGameToLaunch);
            if (!gameInfo) return null;

            return (
              <View style={[styles.launchModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.launchModalIconBox, { backgroundColor: gameInfo.bgTint }]}>
                  <Ionicons name={gameInfo.icon as any} size={38} color={gameInfo.iconColor} />
                </View>

                <Text style={[styles.launchModalTitle, { color: colors.text }]}>
                  {gameInfo.label}
                </Text>
                <Text style={[styles.launchModalSubtitle, { color: colors.textMuted }]}>
                  {gameInfo.description}
                </Text>

                <View
                  style={[
                    styles.launchModalStatusPill,
                    {
                      backgroundColor: status.isMyTurn ? `${colors.primary}18` : colors.surfaceAlt,
                      borderColor: status.isMyTurn ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.turnDot,
                      { backgroundColor: status.isMyTurn ? colors.primary : colors.textMuted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.launchModalStatusText,
                      { color: status.isMyTurn ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    Estado: {status.text}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    const toLaunch = pendingGameToLaunch;
                    setPendingGameToLaunch(null);
                    setActiveGame(toLaunch);
                  }}
                  style={[styles.launchPrimaryBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.88}
                >
                  <Ionicons name="play" size={18} color="#ffffff" />
                  <Text style={styles.launchPrimaryBtnText}>Iniciar Partida</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPendingGameToLaunch(null)}
                  style={styles.launchCancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.launchCancelBtnText, { color: colors.textSecondary }]}>
                    Volver al Lobby
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* ================= PANTALLA COMPLETA DEL JUEGO ACTIVO (HEADER MÍNIMO + BARRA INFERIOR OCULTA) ================= */}
      <Modal
        visible={Boolean(activeGame)}
        animationType="slide"
        onRequestClose={() => setActiveGame(null)}
      >
        <SafeAreaView style={[styles.gameFullScreenContainer, { backgroundColor: colors.background }]}>
          <StatusBar style={isDark ? 'light' : 'dark'} />

          {/* Header Mínimo del Juego */}
          <View style={[styles.gameMinimalHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <PressableScale
              onPress={() => setActiveGame(null)}
              style={styles.backBtn}
              scaleTo={0.92}
              accessibilityLabel="Volver al lobby"
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={[styles.backBtnText, { color: colors.text }]}>Lobby</Text>
            </PressableScale>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.gameMinimalTitle, { color: colors.text }]}>
                {ALL_GAMES.find((g) => g.id === activeGame)?.label}
              </Text>
              <Text style={[styles.gameMinimalTurn, { color: colors.primary }]}>
                {activeGame ? getGameTurnLabel(activeGame) : ''}
              </Text>
            </View>

            <PressableScale
              onPress={() => handleResetCurrentGame()}
              style={[styles.resetGameBtn, { backgroundColor: colors.surfaceAlt }]}
              scaleTo={0.92}
              accessibilityLabel="Reiniciar partida"
            >
              <Ionicons name="reload" size={16} color={colors.text} />
            </PressableScale>
          </View>

          {/* Arena del Juego Montada Únicamente Cuando Está Activa */}
          <View style={styles.gameActiveArenaWrapper}>
            {activeGame && renderActiveGameArena(true)}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ================= GRAN MODAL DE CELEBRACIÓN DE VICTORIA ALEGRE ================= */}
      <Modal
        visible={Boolean(victoryCelebration)}
        transparent
        animationType="fade"
        onRequestClose={() => setVictoryCelebration(null)}
      >
        <View style={styles.victoryOverlay}>
          {victoryCelebration && (
            <Animated.View
              style={[
                styles.victoryCard,
                {
                  borderColor: victoryCelebration.color,
                  transform: [{ scale: victoryScale }],
                },
              ]}
            >
              {/* Estrellas y Trofeo Grande */}
              <View style={styles.victorySparklesRow}>
                <Ionicons name="sparkles" size={28} color="#f59e0b" />
                <View
                  style={[
                    styles.victoryTrophyCircle,
                    { backgroundColor: `${victoryCelebration.color}18` },
                  ]}
                >
                  <Ionicons name="trophy" size={54} color="#f59e0b" />
                </View>
                <Ionicons name="sparkles" size={28} color="#f59e0b" />
              </View>

              {/* Monito Celebrando */}
              <View style={{ marginVertical: 6 }}>
                <MoodMascot
                  feeling="enamorado"
                  size="lg"
                  accentColor={victoryCelebration.color}
                />
              </View>

              <Text style={[styles.victoryGameTag, { color: victoryCelebration.color }]}>
                {victoryCelebration.gameTitle.toUpperCase()}
              </Text>

              <Text style={styles.victoryWinnerTitle}>
                ¡GANÓ {victoryCelebration.winnerName.toUpperCase()}!
              </Text>

              <Text style={styles.victorySubtitle}>{victoryCelebration.subtitle}</Text>

              <View
                style={[
                  styles.victoryRewardPill,
                  { backgroundColor: victoryCelebration.color },
                ]}
              >
                <Ionicons name="star" size={18} color="#fde047" />
                <Text style={styles.victoryRewardText}>
                  +{victoryCelebration.pointsEarned} PUNTOS Y +1 TROFEO
                </Text>
              </View>

              <View style={styles.victoryButtonsRow}>
                <TouchableOpacity
                  onPress={() => {
                    const cb = victoryCelebration.onPlayAgain;
                    setVictoryCelebration(null);
                    cb();
                  }}
                  style={[
                    styles.victoryPlayAgainBtn,
                    { backgroundColor: victoryCelebration.color },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={18} color="#ffffff" />
                  <Text style={styles.victoryPlayAgainText}>Jugar Otra Partida</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setVictoryCelebration(null)}
                  style={styles.victoryCloseBtn}
                >
                  <Text style={styles.victoryCloseText}>Seguir Viendo</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>

      {/* Modal Retar a mi Pareja en el Ahorcado */}
      <Modal
        visible={isCustomWordModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomWordModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Retar a mi Pareja</Text>
              <TouchableOpacity onPress={() => setIsCustomWordModalOpen(false)}>
                <Ionicons name="close" size={22} color="#6c757d" />
              </TouchableOpacity>
            </View>

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
              <Text style={styles.primaryGameBtnText}>Lanzar Reto (+400 pts)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 10,
  },
  lobbyGamesGridArea: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  lobbyGridRowsContainer: {
    flex: 1,
    gap: 10,
  },
  lobbyGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  lobbyCol: {
    flex: 1,
  },
  lobbyFullRow: {
    height: 76,
  },
  lobbyCardCompact: {
    flex: 1,
    width: '100%',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  launchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  launchModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  launchModalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  launchModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    marginBottom: 4,
    textAlign: 'center',
  },
  launchModalSubtitle: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  launchModalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  launchModalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  launchPrimaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  launchPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  launchCancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  launchCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  lobbyCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  turnBadgeMiniText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  lobbyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  lobbyCardDesc: {
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 1,
  },
  lobbyCardFullWidth: {
    width: '100%',
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  lobbyScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 6,
  },
  lobbyPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  lobbyAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbyAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  lobbyPlayerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  lobbyScorePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lobbyPoints: {
    fontSize: 11,
    fontWeight: '800',
  },
  lobbyStars: {
    fontSize: 11,
    fontWeight: '600',
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

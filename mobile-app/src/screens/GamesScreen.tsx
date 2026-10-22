import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import {
  getGamesState,
  saveGamesState,
  DEFAULT_GAMES_STATE,
  GamesState,
  ChessPiece,
  createInitialChessBoard,
} from '../services/CoupleSyncService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const { width } = Dimensions.get('window');
const BOARD_SIZE = Math.min(width - 36, 360);
const CHESS_CELL = Math.floor((BOARD_SIZE - 22) / 8);
const SUDOKU_CELL = Math.floor((BOARD_SIZE - 8) / 9);

type GameTab = 'tictactoe' | 'sudoku' | 'chess' | 'hangman';

const HANGMAN_DICTIONARY: Array<{ word: string; hint: string; category: string }> = [
  // Cine y Series
  { word: 'MATRIX', hint: 'Ciencia ficción con Neo y las pastillas roja y azul 🕶️', category: 'Cine' },
  { word: 'TITANIC', hint: 'Famoso barco transatlántico y un iceberg 🚢', category: 'Cine' },
  { word: 'AVATAR', hint: 'Seres de piel azul en el planeta Pandora 🌿', category: 'Cine' },
  { word: 'BATMAN', hint: 'El caballero de la noche protegiendo Gotham 🦇', category: 'Cine' },
  { word: 'SHREK', hint: 'Ogro verde carismático que vive en un pantano 🧅', category: 'Cine' },
  { word: 'INCEPTION', hint: 'Ladrones que se infiltran dentro de los sueños 🌀', category: 'Cine' },
  { word: 'SPIDERMAN', hint: 'Héroe con traje arácnido que trepa paredes 🕷️', category: 'Cine' },
  { word: 'GLADIADOR', hint: 'Guerrero romano en busca de honor y venganza ⚔️', category: 'Cine' },
  { word: 'JOKER', hint: 'El villano payaso más famoso de los cómics 🃏', category: 'Cine' },
  { word: 'STARWARS', hint: 'Guerra galáctica con sables de luz y caballeros Jedi 🌌', category: 'Cine' },
  { word: 'COCO', hint: 'Película animada sobre el Día de Muertos 🎸', category: 'Cine' },
  { word: 'JURASSIC', hint: 'Parque con dinosaurios clonados que se escapan 🦖', category: 'Cine' },

  // Animales
  { word: 'ELEFANTE', hint: 'Mamífero terrestre gigante con colmillos y trompa 🐘', category: 'Animales' },
  { word: 'JIRAFA', hint: 'El animal más alto del mundo con cuello largo 🦒', category: 'Animales' },
  { word: 'DELFIN', hint: 'Mamífero marino muy sociable e inteligente 🐬', category: 'Animales' },
  { word: 'CANGURO', hint: 'Salta velozmente y lleva a su cría en una bolsa 🦘', category: 'Animales' },
  { word: 'PINGUINO', hint: 'Ave que no vuela pero nada en aguas congeladas 🐧', category: 'Animales' },
  { word: 'COCODRILO', hint: 'Gran reptil con piel dura y mandíbula poderosa 🐊', category: 'Animales' },
  { word: 'LEOPARDO', hint: 'Felino salvaje muy veloz con manchas oscuras 🐆', category: 'Animales' },
  { word: 'TIBURON', hint: 'Depredador de los mares con aleta dorsal 🦈', category: 'Animales' },
  { word: 'MARIPOSA', hint: 'Insecto con alas coloridas tras salir del capullo 🦋', category: 'Animales' },
  { word: 'KOALA', hint: 'Come hojas de eucalipto y duerme en los árboles 🐨', category: 'Animales' },
  { word: 'CAMELLO', hint: 'Animal del desierto con jorobas que resiste el calor 🐪', category: 'Animales' },
  { word: 'FLAMENCO', hint: 'Ave de plumas rosas que se posa en una sola pata 🦩', category: 'Animales' },

  // Geografía y Países
  { word: 'JAPON', hint: 'País del sol naciente, sushi y templos ⛩️', category: 'Geografía' },
  { word: 'ITALIA', hint: 'País con forma de bota, cuna de la pizza y el Coliseo 🍕', category: 'Geografía' },
  { word: 'FRANCIA', hint: 'País de la Torre Eiffel y los croissants 🥐', category: 'Geografía' },
  { word: 'CANADA', hint: 'País norteño con hoja de arce en su bandera 🍁', category: 'Geografía' },
  { word: 'AUSTRALIA', hint: 'Continente e isla hogar de koalas y desiertos 🦘', category: 'Geografía' },
  { word: 'BRASIL', hint: 'País más grande de Sudamérica famoso por su carnaval 🇧🇷', category: 'Geografía' },
  { word: 'ALEMANIA', hint: 'País europeo famoso por sus castillos e ingeniería 🏰', category: 'Geografía' },
  { word: 'EGIPTO', hint: 'Tierra de pirámides milenarias y el río Nilo 🐫', category: 'Geografía' },
  { word: 'MADRID', hint: 'Capital de España con la Puerta del Sol 🇪🇸', category: 'Geografía' },
  { word: 'LONDRES', hint: 'Ciudad del Big Ben y las cabinas telefónicas rojas 🇬🇧', category: 'Geografía' },
  { word: 'TOKIO', hint: 'La metrópolis más poblada del mundo 🗼', category: 'Geografía' },

  // Comida y Bebida
  { word: 'PIZZA', hint: 'Masa horneada con salsa de tomate y queso derretido 🍕', category: 'Comida' },
  { word: 'HAMBURGUESA', hint: 'Carne en pan con queso, lechuga y papas fritas 🍔', category: 'Comida' },
  { word: 'CHOCOLATE', hint: 'Dulce delicioso elaborado a partir del cacao 🍫', category: 'Comida' },
  { word: 'ESPAGUETI', hint: 'Pasta larga italiana con salsa boloñesa 🍝', category: 'Comida' },
  { word: 'SUSHI', hint: 'Rollo japonés de arroz con pescado fresco o aguacate 🍣', category: 'Comida' },
  { word: 'HELADO', hint: 'Postre cremoso servido muy frío en cono o copa 🍦', category: 'Comida' },
  { word: 'TACOS', hint: 'Tortilla doblada con carne asada, cilantro y cebolla 🌮', category: 'Comida' },
  { word: 'HOTDOG', hint: 'Salchicha caliente en pan alargado con mostaza 🌭', category: 'Comida' },
  { word: 'PALOMITAS', hint: 'Maíz inflado infaltable en el cine 🍿', category: 'Comida' },
  { word: 'LASAGNA', hint: 'Capas de pasta rellenas de carne, salsa y queso horneado 🥘', category: 'Comida' },

  // Objetos y Tecnología
  { word: 'GUITARRA', hint: 'Instrumento musical de seis cuerdas y caja sonora 🎸', category: 'Objetos' },
  { word: 'TELESCOPIO', hint: 'Instrumento óptico para ver planetas y estrellas 🔭', category: 'Tecnología' },
  { word: 'COMPUTADORA', hint: 'Máquina electrónica para procesar datos y navegar 💻', category: 'Tecnología' },
  { word: 'AUDIFONOS', hint: 'Dispositivo para escuchar música en privado 🎧', category: 'Objetos' },
  { word: 'BICICLETA', hint: 'Vehículo de dos ruedas impulsado por pedales 🚲', category: 'Objetos' },
  { word: 'BRUJULA', hint: 'Herramienta de navegación con aguja magnética hacia el norte 🧭', category: 'Objetos' },
  { word: 'MICROFONO', hint: 'Aparato que amplifica o graba la voz 🎙️', category: 'Tecnología' },
  { word: 'COHETE', hint: 'Vehículo que viaja a gran velocidad al espacio exterior 🚀', category: 'Tecnología' },
  { word: 'CAMARA', hint: 'Dispositivo para capturar fotos y recuerdos 📷', category: 'Tecnología' },
  { word: 'RELOJ', hint: 'Instrumento que marca las horas y segundos ⏰', category: 'Objetos' },

  // Naturaleza y Ciencia
  { word: 'VOLCAN', hint: 'Montaña con cráter que expulsa lava y humo 🌋', category: 'Naturaleza' },
  { word: 'ARCOIRIS', hint: 'Banda de colores que surge cuando llueve con sol 🌈', category: 'Naturaleza' },
  { word: 'ASTRONAUTA', hint: 'Persona entrenada para viajar al espacio exterior 🧑‍🚀', category: 'Ciencia' },
  { word: 'GALAXIA', hint: 'Enorme sistema de miles de millones de estrellas 🌌', category: 'Espacio' },
  { word: 'DINOSAURIO', hint: 'Reptiles colosales que dominaron la Tierra 🦕', category: 'Historia' },
  { word: 'RELAMPAGO', hint: 'Destello luminoso potente en el cielo durante tormentas ⚡', category: 'Naturaleza' },
  { word: 'SUBMARINO', hint: 'Nave capaz de sumergirse a grandes profundidades ⚓', category: 'Ciencia' },

  // Videojuegos y Pasatiempos
  { word: 'POKEMON', hint: 'Monstruos de bolsillo con entrenadores y batallas ⚡', category: 'Videojuegos' },
  { word: 'MINECRAFT', hint: 'Juego de construcción y supervivencia con cubos ⛏️', category: 'Videojuegos' },
  { word: 'TETRIS', hint: 'Clásico juego de acomodar piezas geométricas que caen 🧱', category: 'Videojuegos' },
  { word: 'MARIO', hint: 'Fontanero con bigote que recolecta monedas y hongos 🍄', category: 'Videojuegos' },
  { word: 'AJEDREZ', hint: 'Juego de estrategia con tablero de 64 casillas ♟️', category: 'Juegos' },
  { word: 'DOMINO', hint: 'Juego de fichas rectangulares con puntos divididos 🎲', category: 'Juegos' },
  { word: 'LABERINTO', hint: 'Espacio lleno de caminos engañosos para hallar la salida 🧩', category: 'Juegos' },
];

// --- Base y Generador de Sudoku ---
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

// --- Símbolos y Valores de Ajedrez ---
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
  const { profile } = useProfile();
  const { primaryColor, openThemeModal } = useTheme();
  const currentProfile = profile || 'Karla';

  const [activeGame, setActiveGame] = useState<GameTab>('tictactoe');
  const [gamesState, setGamesState] = useState<GamesState>(DEFAULT_GAMES_STATE);

  // --- Estado de Sudoku ---
  const [sudoku, setSudoku] = useState<SavedSudokuSession>(() => createSudokuSession('easy'));
  const [selectedSudokuCell, setSelectedSudokuCell] = useState<[number, number] | null>(null);
  const [isNoteMode, setIsNoteMode] = useState(false);

  // --- Estado de Ajedrez ---
  const [selectedChessPos, setSelectedChessPos] = useState<[number, number] | null>(null);
  const [chessHistory, setChessHistory] = useState<Array<GamesState['chess']>>([]);

  // --- Estado de Ahorcado ---
  const [isCustomWordModalOpen, setIsCustomWordModalOpen] = useState(false);
  const [customWordInput, setCustomWordInput] = useState('');
  const [customHintInput, setCustomHintInput] = useState('');
  const [customCatInput, setCustomCatInput] = useState('Secreto de Pareja 💌');

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
  // 1. TRES EN RAYA PRO
  // =========================================================================
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
  };

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

  // =========================================================================
  // 2. SUDOKU MASTER
  // =========================================================================
  const handleNewSudokuGame = async (diff: 'easy' | 'medium' | 'hard') => {
    const fresh = createSudokuSession(diff);
    setSelectedSudokuCell(null);
    await persistSudoku(fresh);
  };

  const handleSudokuNumberPress = async (num: number) => {
    if (!selectedSudokuCell || sudoku.completed) return;
    const [r, c] = selectedSudokuCell;
    if (sudoku.fixed[r][c]) return;

    const cellKey = `${r}-${c}`;

    // Borrar
    if (num === 0) {
      const nextBoard = sudoku.board.map((row) => [...row]);
      nextBoard[r][c] = 0;
      const nextNotes = { ...sudoku.notes };
      delete nextNotes[cellKey];
      await persistSudoku({ ...sudoku, board: nextBoard, notes: nextNotes });
      return;
    }

    // Modo Notas (Lápiz)
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
    }

    const isComplete = nextBoard.every((row, ri) =>
      row.every((cell, ci) => cell === sudoku.solution[ri][ci])
    );

    if (isComplete) {
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

      Alert.alert(
        '🏆 ¡Sudoku Completado!',
        `¡Increíble! Ganaste +${finalScore} puntos y 1 Trofeo para tu marcador.`
      );
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

  // Contador de cuántos números faltan de cada dígito 1-9
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
  // 3. AJEDREZ REAL PRO
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

  // Detectar si un Rey está en Jaque
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

  // Calcular ventaja de material
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

        // Guardar historial para poder deshacer
        setChessHistory((prev) => [...prev.slice(-10), chess]);

        const nextBoard = chess.board.map((row) => [...row]);
        const targetPiece = nextBoard[r][c];

        // Coronación automática a Reina
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

  // =========================================================================
  // 4. EL AHORCADO VISUAL
  // =========================================================================
  const hangman = gamesState.hangman;
  const wrongGuessesCount = hangman.guessed.filter((l) => !hangman.word.includes(l)).length;
  const maxWrong = 6;

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

    if (allRevealed) {
      nextStatus = 'won';
      nextStreak += 1;
      const winBonus = hangman.isPartnerChallenge ? 400 : 250;
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
  };

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
        author: 'Diccionario ✨',
        isPartnerChallenge: false,
        guessed: [],
        status: 'playing',
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

    await updateAndSyncGames({
      ...gamesState,
      hangman: {
        ...hangman,
        word: cleaned,
        hint: customHintInput.trim() || 'Reto especial de tu pareja 💌',
        category: customCatInput.trim() || 'Reto de Pareja',
        author: currentProfile === 'Karla' ? 'Karlita 💜' : 'Javier 💙',
        isPartnerChallenge: true,
        guessed: [],
        status: 'playing',
      },
    });

    setCustomWordInput('');
    setCustomHintInput('');
    setIsCustomWordModalOpen(false);
  };

  const ALPHABET = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  const lb = gamesState.leaderboard || DEFAULT_GAMES_STATE.leaderboard;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      {/* Encabezado del Arcade */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.screenTitle}>Juegos en Pareja</Text>
            <Text style={styles.screenSubtitle}>
              Compitan, ganen puntos y superen sus récords
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= MARCADOR GLOBAL DE PUNTOS Y TROFEOS ================= */}
        <View style={[styles.globalScoreCard, { borderColor: `${primaryColor}30` }]}>
          <View style={styles.playerScoreBox}>
            <View style={styles.playerAvatarRow}>
              <View style={[styles.playerBadgeCircle, { backgroundColor: '#f3e8ff', borderColor: '#c084fc' }]}>
                <Text style={[styles.playerBadgeLetter, { color: '#9333ea' }]}>K</Text>
              </View>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.playerName}>Karlita</Text>
                  {lb.pointsKarla >= lb.pointsJavier && lb.pointsKarla > 0 && (
                    <Ionicons name="trophy" size={13} color="#f59e0b" />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="trophy-outline" size={11} color="#d97706" />
                  <Text style={styles.trophyCount}>{lb.trophiesKarla} trofeos</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.pointsValue, { color: '#9333ea' }]}>
              {lb.pointsKarla} <Text style={styles.ptsUnit}>pts</Text>
            </Text>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsBadgeText}>VS</Text>
          </View>

          <View style={[styles.playerScoreBox, { alignItems: 'flex-end' }]}>
            <View style={styles.playerAvatarRow}>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {lb.pointsJavier > lb.pointsKarla && (
                    <Ionicons name="trophy" size={13} color="#f59e0b" />
                  )}
                  <Text style={styles.playerName}>Javier</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="trophy-outline" size={11} color="#d97706" />
                  <Text style={styles.trophyCount}>{lb.trophiesJavier} trofeos</Text>
                </View>
              </View>
              <View style={[styles.playerBadgeCircle, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
                <Text style={[styles.playerBadgeLetter, { color: '#0284c7' }]}>J</Text>
              </View>
            </View>
            <Text style={[styles.pointsValue, { color: '#0284c7' }]}>
              {lb.pointsJavier} <Text style={styles.ptsUnit}>pts</Text>
            </Text>
          </View>
        </View>

        {/* ================= SELECTOR DE LOS 4 JUEGOS ================= */}
        <View style={styles.gamesSelectorGrid}>
          {[
            { id: 'tictactoe', label: 'Tres en Raya', icon: 'grid', reward: '+150 pts' },
            { id: 'sudoku', label: 'Sudoku', icon: 'apps', reward: '+500 pts' },
            { id: 'chess', label: 'Ajedrez', icon: 'trophy', reward: '+600 pts' },
            { id: 'hangman', label: 'Ahorcado', icon: 'extension-puzzle', reward: '+400 pts' },
          ].map((g) => {
            const active = activeGame === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                onPress={() => setActiveGame(g.id as GameTab)}
                style={[
                  styles.gameTabCard,
                  active && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={g.icon as any}
                  size={18}
                  color={active ? '#ffffff' : primaryColor}
                />
                <Text style={[styles.gameTabTitle, active && { color: '#ffffff' }]}>
                  {g.label}
                </Text>
                <Text
                  style={[
                    styles.gameTabReward,
                    active ? { color: 'rgba(255,255,255,0.85)' } : { color: '#8d99ae' },
                  ]}
                >
                  {g.reward}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ===================================================================== */}
        {/* 1. TRES EN RAYA PRO                                                   */}
        {/* ===================================================================== */}
        {activeGame === 'tictactoe' && (
          <View style={styles.arenaCard}>
            <View style={styles.arenaHeader}>
              <View>
                <Text style={styles.arenaTitle}>Tres en Raya</Text>
                <Text style={styles.arenaSubtitle}>
                  Ronda #{gamesState.ticTacToe.round || 1} • Victoria: +150 pts
                </Text>
              </View>
              <View style={[styles.miniScorePill, { backgroundColor: `${primaryColor}15` }]}>
                <Text style={[styles.miniScoreText, { color: primaryColor }]}>
                  Karlita: {gamesState.ticTacToe.scoreKarla} | Javier: {gamesState.ticTacToe.scoreJavier}
                </Text>
              </View>
            </View>

            {/* Banner de Turno o Victoria */}
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: gamesState.ticTacToe.winner
                    ? '#d1fae5'
                    : `${primaryColor}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  {
                    color: gamesState.ticTacToe.winner ? '#059669' : primaryColor,
                  },
                ]}
              >
                {gamesState.ticTacToe.winner
                  ? gamesState.ticTacToe.winner === 'Empate'
                    ? '¡Empate! (+40 pts para ambos)'
                    : `¡Ganó ${
                        gamesState.ticTacToe.winner === 'Karla' ? 'Karlita' : 'Javier'
                      }! (+150 pts)`
                  : `Turno actual: ${
                      gamesState.ticTacToe.turn === 'Karla' ? 'Karlita (✕)' : 'Javier (○)'
                    }`}
              </Text>
            </View>

            {/* Tablero 3x3 con línea ganadora iluminada */}
            <View style={[styles.tttBoard, { backgroundColor: `${primaryColor}18` }]}>
              {gamesState.ticTacToe.board.map((cell, idx) => {
                const isWinningCell = gamesState.ticTacToe.winningLine?.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleTicTacToePress(idx)}
                    style={[
                      styles.tttCell,
                      isWinningCell && {
                        backgroundColor: '#fef08a',
                        borderColor: '#eab308',
                        borderWidth: 2.5,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {cell === 'Karla' && (
                      <Text style={[styles.tttPiece, { color: '#9333ea', fontWeight: '900' }]}>✕</Text>
                    )}
                    {cell === 'Javier' && (
                      <Text style={[styles.tttPiece, { color: '#0284c7', fontWeight: '900' }]}>○</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleNewTicTacToeRound}
              style={[styles.primaryGameBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="play-forward" size={18} color="#ffffff" />
              <Text style={styles.primaryGameBtnText}>
                {gamesState.ticTacToe.winner ? 'Siguiente Ronda' : 'Reiniciar Ronda'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===================================================================== */}
        {/* 2. SUDOKU                                                             */}
        {/* ===================================================================== */}
        {activeGame === 'sudoku' && (
          <View style={styles.arenaCard}>
            <View style={styles.arenaHeader}>
              <View>
                <Text style={styles.arenaTitle}>Sudoku</Text>
                <Text style={styles.arenaSubtitle}>
                  Récord Karlita: {gamesState.sudoku.bestScoreKarla} | Javier:{' '}
                  {gamesState.sudoku.bestScoreJavier}
                </Text>
              </View>
              <View style={[styles.miniScorePill, { backgroundColor: `${primaryColor}18` }]}>
                <Text style={[styles.miniScoreText, { color: primaryColor }]}>
                  {sudoku.score} pts
                </Text>
              </View>
            </View>

            {/* Selector de Nivel y Errores */}
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
                      onPress={() => handleNewSudokuGame(d.key as any)}
                      style={[
                        styles.diffChip,
                        active && { backgroundColor: primaryColor, borderColor: primaryColor },
                      ]}
                    >
                      <Text style={[styles.diffChipText, active && { color: '#ffffff' }]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.mistakesPill}>
                <Text style={styles.mistakesPillText}>❌ {sudoku.mistakes}</Text>
              </View>
            </View>

            {/* Tablero 9x9 con resaltado inteligente */}
            <View style={styles.sudokuGridContainer}>
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
                        onPress={() => setSelectedSudokuCell([r, c])}
                        style={[
                          styles.sudokuCell,
                          {
                            width: SUDOKU_CELL,
                            height: SUDOKU_CELL,
                            borderRightWidth: rightBorder,
                            borderBottomWidth: bottomBorder,
                            borderRightColor: rightBorder === 2 ? '#1e293b' : '#cbd5e1',
                            borderBottomColor: bottomBorder === 2 ? '#1e293b' : '#cbd5e1',
                          },
                          isSameCross && { backgroundColor: `${primaryColor}10` },
                          isSameNumber && { backgroundColor: `${primaryColor}28` },
                          isSelected && { backgroundColor: `${primaryColor}45` },
                        ]}
                        activeOpacity={0.75}
                      >
                        {val !== 0 ? (
                          <Text
                            style={[
                              styles.sudokuValText,
                              isFixed
                                ? { color: '#0f172a', fontWeight: '800' }
                                : { color: primaryColor, fontWeight: '700' },
                              isWrong && { color: '#e11d48' },
                            ]}
                          >
                            {val}
                          </Text>
                        ) : cellNotes.length > 0 ? (
                          <Text style={styles.sudokuNotesText}>{cellNotes.join('')}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Herramientas de Sudoku */}
            <View style={styles.sudokuToolsBar}>
              <TouchableOpacity
                onPress={() => setIsNoteMode((n) => !n)}
                style={[
                  styles.sudokuToolBtn,
                  isNoteMode && { backgroundColor: primaryColor },
                ]}
              >
                <Ionicons
                  name="pencil"
                  size={16}
                  color={isNoteMode ? '#ffffff' : '#495057'}
                />
                <Text
                  style={[
                    styles.sudokuToolText,
                    isNoteMode && { color: '#ffffff' },
                  ]}
                >
                  Notas {isNoteMode ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSudokuNumberPress(0)}
                style={styles.sudokuToolBtn}
              >
                <Ionicons name="backspace-outline" size={16} color="#495057" />
                <Text style={styles.sudokuToolText}>Borrar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSudokuHint}
                style={[styles.sudokuToolBtn, { backgroundColor: `${primaryColor}18` }]}
              >
                <Ionicons name="bulb" size={16} color={primaryColor} />
                <Text style={[styles.sudokuToolText, { color: primaryColor }]}>Pista</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleNewSudokuGame(sudoku.difficulty)}
                style={styles.sudokuToolBtn}
              >
                <Ionicons name="refresh" size={16} color="#495057" />
                <Text style={styles.sudokuToolText}>Nuevo</Text>
              </TouchableOpacity>
            </View>

            {/* Teclado 1-9 con contador de restantes */}
            <View style={styles.sudokuKeypadRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                const left = remainingDigitsCount[n];
                const done = left === 0;
                return (
                  <TouchableOpacity
                    key={n}
                    disabled={done}
                    onPress={() => handleSudokuNumberPress(n)}
                    style={[
                      styles.sudokuKeyBtn,
                      { borderColor: `${primaryColor}45` },
                      done && { opacity: 0.35, backgroundColor: '#e9ecef' },
                    ]}
                  >
                    <Text style={[styles.sudokuKeyDigit, { color: primaryColor }]}>{n}</Text>
                    <Text style={styles.sudokuKeyLeft}>{left}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ===================================================================== */}
        {/* 3. AJEDREZ                                                            */}
        {/* ===================================================================== */}
        {activeGame === 'chess' && (
          <View style={styles.arenaCard}>
            <View style={styles.arenaHeader}>
              <View>
                <Text style={styles.arenaTitle}>Ajedrez</Text>
                <Text style={styles.arenaSubtitle}>
                  Victoria: +600 pts • Karlita {gamesState.chess.winsKarla || 0} -{' '}
                  {gamesState.chess.winsJavier || 0} Javier
                </Text>
              </View>
              {isKingInCheck && !gamesState.chess.winner && (
                <View style={styles.checkWarningBadge}>
                  <Text style={styles.checkWarningText}>¡JAQUE!</Text>
                </View>
              )}
            </View>

            {/* Estado de Turno */}
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: gamesState.chess.winner
                    ? '#d1fae5'
                    : `${primaryColor}15`,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBannerText,
                  { color: gamesState.chess.winner ? '#059669' : primaryColor },
                ]}
              >
                {gamesState.chess.winner
                  ? `¡Jaque Mate! Ganó ${
                      gamesState.chess.winner === 'w' ? 'Karlita' : 'Javier'
                    } (+600 pts)`
                  : `Juegan: ${
                      gamesState.chess.turn === 'w'
                        ? 'Blancas (Karlita)'
                        : 'Negras (Javier)'
                    }`}
              </Text>
            </View>

            {/* Bandeja Superior: Javier (Negras) */}
            <View style={styles.chessPlayerBar}>
              <View style={styles.chessPlayerLeft}>
                <View style={[styles.colorDot, { backgroundColor: '#0284c7' }]} />
                <Text style={styles.chessPlayerLabel}>Javier 💙 (Negras)</Text>
                {materialAdvantage < 0 && (
                  <Text style={styles.advantageTag}>+{Math.abs(materialAdvantage)}</Text>
                )}
              </View>
              <Text style={styles.capturedRowText} numberOfLines={1}>
                {gamesState.chess.capturedByB.join('')}
              </Text>
            </View>

            {/* Tablero 8x8 con coordenadas */}
            <View style={styles.chessBoardOuter}>
              {gamesState.chess.board.map((row, r) => (
                <View key={r} style={styles.chessRow}>
                  <View style={styles.rankCoordBox}>
                    <Text style={styles.coordLabel}>{8 - r}</Text>
                  </View>
                  {row.map((piece, c) => {
                    const isDark = (r + c) % 2 === 1;
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

                    return (
                      <TouchableOpacity
                        key={`${r}-${c}`}
                        onPress={() => handleChessCellPress(r, c)}
                        style={[
                          styles.chessSquare,
                          {
                            width: CHESS_CELL,
                            height: CHESS_CELL,
                            backgroundColor: isSelected
                              ? '#fde047'
                              : isLastMove
                              ? '#fef08a'
                              : isDark
                              ? `${primaryColor}42`
                              : '#ffffff',
                          },
                        ]}
                        activeOpacity={0.85}
                      >
                        {piece && (
                          <Text
                            style={[
                              styles.chessGlyph,
                              {
                                color: piece.color === 'w' ? '#6b21a8' : '#0f172a',
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
                              piece && styles.chessCaptureIndicator,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={styles.fileCoordsRow}>
                <View style={{ width: 16 }} />
                {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((f) => (
                  <Text
                    key={f}
                    style={[styles.coordLabel, { width: CHESS_CELL, textAlign: 'center' }]}
                  >
                    {f}
                  </Text>
                ))}
              </View>
            </View>

            {/* Bandeja Inferior: Karlita (Blancas) */}
            <View style={styles.chessPlayerBar}>
              <View style={styles.chessPlayerLeft}>
                <View style={[styles.colorDot, { backgroundColor: '#9333ea' }]} />
                <Text style={styles.chessPlayerLabel}>Karlita 💜 (Blancas)</Text>
                {materialAdvantage > 0 && (
                  <Text style={styles.advantageTag}>+{materialAdvantage}</Text>
                )}
              </View>
              <Text style={styles.capturedRowText} numberOfLines={1}>
                {gamesState.chess.capturedByW.join('')}
              </Text>
            </View>

            {/* Controles de Ajedrez */}
            <View style={styles.chessControlsRow}>
              <TouchableOpacity
                onPress={handleUndoChessMove}
                disabled={chessHistory.length === 0}
                style={[
                  styles.secondaryGameBtn,
                  { borderColor: primaryColor },
                  chessHistory.length === 0 && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="arrow-undo" size={16} color={primaryColor} />
                <Text style={[styles.secondaryGameBtnText, { color: primaryColor }]}>
                  Deshacer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResetChess}
                style={[styles.primaryGameBtn, { flex: 1, marginTop: 0, backgroundColor: primaryColor }]}
              >
                <Ionicons name="refresh" size={16} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>Nueva Partida</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ===================================================================== */}
        {/* 4. EL AHORCADO                                                        */}
        {/* ===================================================================== */}
        {activeGame === 'hangman' && (
          <View style={styles.arenaCard}>
            <View style={styles.arenaHeader}>
              <View>
                <Text style={styles.arenaTitle}>El Ahorcado</Text>
                <Text style={styles.arenaSubtitle}>
                  Racha: {hangman.streak || 0} • Karlita {hangman.scoreKarla} - {hangman.scoreJavier} Javier
                </Text>
              </View>
              <View style={[styles.miniScorePill, { backgroundColor: `${primaryColor}18` }]}>
                <Text style={[styles.miniScoreText, { color: primaryColor }]}>
                  {hangman.category || 'General'}
                </Text>
              </View>
            </View>

            {/* Escenario Visual del Ahorcado + Vidas */}
            <View style={styles.hangmanStage}>
              {/* Horca dibujada geométricamente */}
              <View style={styles.gallowsBox}>
                <View style={styles.gallowsBase} />
                <View style={styles.gallowsPole} />
                <View style={styles.gallowsTop} />
                <View style={styles.gallowsRope} />

                {/* Partes del cuerpo según errores (1 a 6) */}
                {wrongGuessesCount >= 1 && (
                  <View style={[styles.hmHead, { borderColor: primaryColor }]} />
                )}
                {wrongGuessesCount >= 2 && (
                  <View style={[styles.hmBody, { backgroundColor: primaryColor }]} />
                )}
                {wrongGuessesCount >= 3 && (
                  <View style={[styles.hmArmLeft, { backgroundColor: primaryColor }]} />
                )}
                {wrongGuessesCount >= 4 && (
                  <View style={[styles.hmArmRight, { backgroundColor: primaryColor }]} />
                )}
                {wrongGuessesCount >= 5 && (
                  <View style={[styles.hmLegLeft, { backgroundColor: primaryColor }]} />
                )}
                {wrongGuessesCount >= 6 && (
                  <View style={[styles.hmLegRight, { backgroundColor: primaryColor }]} />
                )}
              </View>

              {/* Información de la pista */}
              <View style={styles.hangmanInfoRight}>
                <View style={styles.livesIndicatorRow}>
                  <Ionicons name="heart" size={14} color="#e11d48" />
                  <Text style={styles.livesCountText}>
                    Vidas: {Math.max(0, maxWrong - wrongGuessesCount)} / {maxWrong}
                  </Text>
                </View>
                <Text style={styles.hangmanAuthorTag}>Por: {hangman.author}</Text>
                <Text style={styles.hangmanHintBox}>“{hangman.hint}”</Text>
              </View>
            </View>

            {/* Casillas de la palabra */}
            <View style={styles.wordSlotsWrap}>
              {hangman.word.split('').map((ch, idx) => {
                if (ch === ' ') return <View key={idx} style={{ width: 12 }} />;
                const revealed =
                  hangman.guessed.includes(ch) || hangman.status !== 'playing';
                return (
                  <View
                    key={idx}
                    style={[
                      styles.wordSlotBox,
                      { borderColor: revealed ? primaryColor : '#cbd5e1' },
                      revealed && { backgroundColor: `${primaryColor}12` },
                    ]}
                  >
                    <Text style={[styles.wordSlotChar, { color: '#0f172a' }]}>
                      {revealed ? ch : ''}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Mensaje de Victoria o Derrota */}
            {hangman.status !== 'playing' && (
              <View
                style={[
                  styles.statusBanner,
                  {
                    backgroundColor:
                      hangman.status === 'won' ? '#d1fae5' : '#ffe4e6',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBannerText,
                    { color: hangman.status === 'won' ? '#059669' : '#e11d48' },
                  ]}
                >
                  {hangman.status === 'won'
                    ? `¡Palabra completada! (+${
                        hangman.isPartnerChallenge ? 400 : 250
                      } pts)`
                    : `Era "${hangman.word}". ¡Intenta la siguiente!`}
                </Text>
              </View>
            )}

            {/* Teclado A-Z */}
            <View style={styles.azKeyboard}>
              {ALPHABET.map((letter) => {
                const used = hangman.guessed.includes(letter);
                const hit = used && hangman.word.includes(letter);
                return (
                  <TouchableOpacity
                    key={letter}
                    disabled={used || hangman.status !== 'playing'}
                    onPress={() => handleGuessLetter(letter)}
                    style={[
                      styles.azKey,
                      used && {
                        backgroundColor: hit ? primaryColor : '#e2e8f0',
                        borderColor: hit ? primaryColor : '#e2e8f0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.azKeyText,
                        used && { color: hit ? '#ffffff' : '#94a3b8' },
                      ]}
                    >
                      {letter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botones de Acción del Ahorcado */}
            <View style={styles.chessControlsRow}>
              <TouchableOpacity
                onPress={handleRandomHangmanWord}
                style={[styles.secondaryGameBtn, { borderColor: primaryColor }]}
              >
                <Ionicons name="shuffle" size={16} color={primaryColor} />
                <Text style={[styles.secondaryGameBtnText, { color: primaryColor }]}>
                  Nueva Palabra
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsCustomWordModalOpen(true)}
                style={[
                  styles.primaryGameBtn,
                  { flex: 1, marginTop: 0, backgroundColor: primaryColor },
                ]}
              >
                <Ionicons name="flame" size={16} color="#ffffff" />
                <Text style={styles.primaryGameBtnText}>Retar a mi Pareja (+400)</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

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
              placeholder="Ej. Películas, Comida, Objetos, Animales..."
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
              onPress={handleSaveCustomHangman}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2b2d42',
    fontFamily: SERIF_FONT,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 40,
  },
  globalScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  playerScoreBox: {
    flex: 1,
  },
  playerAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  playerBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBadgeLetter: {
    fontSize: 13,
    fontWeight: '900',
  },
  playerEmoji: {
    fontSize: 24,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2b2d42',
  },
  trophyCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  ptsUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8d99ae',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vsBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6c757d',
  },
  gamesSelectorGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  gameTabCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  gameTabTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2b2d42',
    marginTop: 4,
    textAlign: 'center',
  },
  gameTabReward: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  arenaCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  arenaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  arenaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2b2d42',
    fontFamily: SERIF_FONT,
  },
  arenaSubtitle: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 2,
  },
  miniScorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  miniScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusBanner: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tttBoard: {
    width: 264,
    height: 264,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 20,
    padding: 8,
    gap: 8,
    marginBottom: 16,
  },
  tttCell: {
    width: 77,
    height: 77,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tttPiece: {
    fontSize: 40,
  },
  primaryGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  primaryGameBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  secondaryGameBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sudokuTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  diffPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  diffChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  diffChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  mistakesPill: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mistakesPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e11d48',
  },
  sudokuGridContainer: {
    borderWidth: 2.5,
    borderColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sudokuRow: {
    flexDirection: 'row',
  },
  sudokuCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  sudokuValText: {
    fontSize: 17,
  },
  sudokuNotesText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  sudokuToolsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 6,
    marginBottom: 12,
  },
  sudokuToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  sudokuToolText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sudokuKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  sudokuKeyBtn: {
    width: Math.floor((BOARD_SIZE - 40) / 9),
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sudokuKeyDigit: {
    fontSize: 17,
    fontWeight: '800',
  },
  sudokuKeyLeft: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
  },
  checkWarningBadge: {
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f43f5e',
  },
  checkWarningText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#e11d48',
  },
  chessPlayerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginVertical: 6,
  },
  chessPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chessPlayerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  advantageTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  capturedRowText: {
    fontSize: 15,
    maxWidth: '48%',
  },
  chessBoardOuter: {
    borderWidth: 2,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 2,
    backgroundColor: '#f1f5f9',
  },
  chessRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCoordBox: {
    width: 16,
    alignItems: 'center',
  },
  fileCoordsRow: {
    flexDirection: 'row',
    paddingTop: 2,
  },
  coordLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  chessSquare: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chessGlyph: {
    fontSize: 27,
  },
  chessMoveIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.8)',
  },
  chessCaptureIndicator: {
    width: CHESS_CELL - 4,
    height: CHESS_CELL - 4,
    borderRadius: (CHESS_CELL - 4) / 2,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: 'rgba(244, 63, 94, 0.85)',
  },
  chessControlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 10,
  },
  hangmanStage: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    gap: 14,
  },
  gallowsBox: {
    width: 100,
    height: 120,
    position: 'relative',
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    width: 80,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 6,
    left: 24,
    width: 4,
    height: 104,
    backgroundColor: '#334155',
  },
  gallowsTop: {
    position: 'absolute',
    top: 10,
    left: 24,
    width: 48,
    height: 4,
    backgroundColor: '#334155',
  },
  gallowsRope: {
    position: 'absolute',
    top: 10,
    left: 68,
    width: 2,
    height: 16,
    backgroundColor: '#94a3b8',
  },
  hmHead: {
    position: 'absolute',
    top: 26,
    left: 58,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
  },
  hmBody: {
    position: 'absolute',
    top: 48,
    left: 67.5,
    width: 3,
    height: 30,
  },
  hmArmLeft: {
    position: 'absolute',
    top: 52,
    left: 56,
    width: 14,
    height: 3,
    transform: [{ rotate: '-30deg' }],
  },
  hmArmRight: {
    position: 'absolute',
    top: 52,
    left: 68,
    width: 14,
    height: 3,
    transform: [{ rotate: '30deg' }],
  },
  hmLegLeft: {
    position: 'absolute',
    top: 82,
    left: 57,
    width: 15,
    height: 3,
    transform: [{ rotate: '-45deg' }],
  },
  hmLegRight: {
    position: 'absolute',
    top: 82,
    left: 66,
    width: 15,
    height: 3,
    transform: [{ rotate: '45deg' }],
  },
  hangmanInfoRight: {
    flex: 1,
  },
  livesIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  livesCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  heartsLives: {
    fontSize: 15,
    letterSpacing: 2,
    marginBottom: 4,
  },
  hangmanAuthorTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  hangmanHintBox: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  wordSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  wordSlotBox: {
    width: 30,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  wordSlotChar: {
    fontSize: 18,
    fontWeight: '900',
  },
  azKeyboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 8,
  },
  azKey: {
    width: 34,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  azKeyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2b2d42',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#495057',
    marginTop: 10,
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2b2d42',
  },
});

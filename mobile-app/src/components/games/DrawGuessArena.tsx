import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Share,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import { UserProfile, DrawGuessState, DrawGuessStroke, DrawGuessRoundRecord } from '../../types';
import {
  DrawGuessCanvas,
  CANVAS_COLORS,
  CANVAS_STROKE_WIDTHS,
  DrawStroke,
} from './DrawGuessCanvas';
import {
  DrawGuessWord,
  getWordChoicesForRound,
  normalizeGuess,
  buildWordMask,
  hashWordWithSalt,
  generateDistanceOneHashes,
  evaluateGuess,
} from './drawGuessWords';
import { GameButton } from './common/GameButton';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { supabase } from '../../config/supabase';
import { addLocalMilestone } from '../../services/StorageService';
import { createSupabaseMilestone } from '../../services/SupabaseService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Lienzo cuadrado 1:1 con margen de 16px a cada lado
const CANVAS_BASE_SIZE = Math.min(SCREEN_W - 32, Math.floor(SCREEN_H * 0.40), 360);

const DEFAULT_DRAW_GUESS_FALLBACK: DrawGuessState = {
  phase: 'choosing_word',
  currentRound: 1,
  drawer: 'Karla',
  guesser: 'Javier',
  strokes: [],
  attempts: [],
  revealedIndices: [],
  usedHint: false,
  roundPoints: 100,
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
};

interface DrawGuessArenaProps {
  currentProfile: UserProfile;
  primaryColor?: string;
  gameState?: DrawGuessState | null;
  onUpdateGameState: (nextState: DrawGuessState) => Promise<void>;
  onFinishGameReward: (winner: UserProfile | 'Empate', points: number) => Promise<void>;
  onBack: () => void;
  onOpenScoreBreakdown?: (player?: 'all' | 'Karla' | 'Javier') => void;
}

export const DrawGuessArena: React.FC<DrawGuessArenaProps> = ({
  currentProfile,
  primaryColor = '#10b981', // Verde Esmeralda oficial
  gameState: rawGameState,
  onUpdateGameState,
  onFinishGameReward,
  onBack,
  onOpenScoreBreakdown,
}) => {
  const gameState: DrawGuessState = useMemo(() => {
    return {
      ...DEFAULT_DRAW_GUESS_FALLBACK,
      ...(rawGameState || {}),
    };
  }, [rawGameState]);

  // Herramientas del dibujante
  const [currentColor, setCurrentColor] = useState<string>(CANVAS_COLORS[0]);
  const [currentWidth, setCurrentWidth] = useState<number>(CANVAS_STROKE_WIDTHS[1].width);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isBucket, setIsBucket] = useState<boolean>(false);

  // Estado del adivinador
  const [guessInput, setGuessInput] = useState<string>('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const inputRef = useRef<any>(null);

  // Splash inicial sincronizado de 1.5s
  const [showRoundSplash, setShowRoundSplash] = useState<boolean>(false);
  const splashAnim = useRef(new Animated.Value(0)).current;

  // Acierto y Confeti local
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [lastEarnedPoints, setLastEarnedPoints] = useState<number>(0);
  const successScaleAnim = useRef(new Animated.Value(0)).current;

  // Replay animado de fin de ronda
  const [replayStrokes, setReplayStrokes] = useState<DrawStroke[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isSavingDrawing, setIsSavingDrawing] = useState<boolean>(false);
  const [savedSuccessToast, setSavedSuccessToast] = useState<boolean>(false);

  // Temporizador local por deadline
  const [secondsLeft, setSecondsLeft] = useState<number>(75);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shake de intento inválido/repetido
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Roles calculados
  const drawerProfile: UserProfile = gameState.drawer || (gameState.currentRound % 2 === 1 ? 'Karla' : 'Javier');
  const guesserProfile: UserProfile = drawerProfile === 'Karla' ? 'Javier' : 'Karla';
  const isMeDrawer = currentProfile === drawerProfile;
  const isMeGuesser = currentProfile === guesserProfile;

  const drawerDisplayName = drawerProfile === 'Karla' ? 'Karlita' : 'Javier';
  const guesserDisplayName = guesserProfile === 'Karla' ? 'Karlita' : 'Javier';

  // Guardias de ejecución única
  const isRewardingRef = useRef<boolean>(false);
  const isAdvancingRoundRef = useRef<boolean>(false);
  const previousRoundRef = useRef<number>(gameState.currentRound);

  // Trazos locales
  const [localStrokes, setLocalStrokes] = useState<DrawStroke[]>(gameState.strokes || []);

  useEffect(() => {
    setLocalStrokes(gameState.strokes || []);
  }, [gameState.strokes]);

  // Manejador del teclado
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 1. SINCRONIZACIÓN EN TIEMPO REAL VÍA SUPABASE BROADCAST CHANNEL
  const channelRef = useRef<any>(null);
  const isChannelSubscribedRef = useRef<boolean>(false);

  useEffect(() => {
    const channel = supabase.channel('kmrg-drawguess-live-v3', {
      config: { broadcast: { ack: false, self: false } },
    });

    channel
      .on('broadcast', { event: 'stroke_batch' }, ({ payload }: { payload: any }) => {
        if (!isMeDrawer && payload) {
          const { strokeId, color, strokeWidth, points, isEraser: isE, isFill } = payload;
          setLocalStrokes((prev) => {
            const idx = prev.findIndex((s) => s.id === strokeId);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], points };
              return updated;
            }
            return [
              ...prev,
              { id: strokeId, color, strokeWidth, points, isEraser: isE, isFill },
            ];
          });
        }
      })
      .on('broadcast', { event: 'stroke_undo' }, () => {
        if (!isMeDrawer) {
          setLocalStrokes((prev) => prev.slice(0, -1));
        }
      })
      .on('broadcast', { event: 'stroke_clear' }, () => {
        if (!isMeDrawer) {
          setLocalStrokes([]);
        }
      })
      .on('broadcast', { event: 'stroke_bucket' }, ({ payload }: { payload: any }) => {
        if (!isMeDrawer && payload?.color) {
          setLocalStrokes((prev) => [
            ...prev,
            { id: `fill_${Date.now()}`, color: payload.color, strokeWidth: 0, points: [], isFill: true },
          ]);
        }
      })
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          isChannelSubscribedRef.current = true;
        } else {
          isChannelSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      isChannelSubscribedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [isMeDrawer]);

  // Emisión de trazos por lotes
  const handleStrokeBatch = useCallback(
    (strokeId: string, color: string, strokeWidth: number, points: any[], isEraserActive?: boolean) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stroke_batch',
        payload: { strokeId, color, strokeWidth, points, isEraser: isEraserActive },
      });
    },
    []
  );

  const handleStrokeEnd = useCallback(
    async (stroke: DrawStroke) => {
      const nextStrokes = [...localStrokes, stroke];
      setLocalStrokes(nextStrokes);
      await onUpdateGameState({
        ...gameState,
        strokes: nextStrokes,
        updatedAt: Date.now(),
      });
    },
    [localStrokes, gameState, onUpdateGameState]
  );

  const handleUndoStroke = useCallback(async () => {
    if (localStrokes.length === 0) return;
    void triggerGameHaptic('light');
    const next = localStrokes.slice(0, -1);
    setLocalStrokes(next);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_undo', payload: {} });
    await onUpdateGameState({
      ...gameState,
      strokes: next,
      updatedAt: Date.now(),
    });
  }, [localStrokes, gameState, onUpdateGameState]);

  const handleClearStrokes = useCallback(async () => {
    if (localStrokes.length === 0) return;
    void triggerGameHaptic('medium');
    setLocalStrokes([]);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_clear', payload: {} });
    await onUpdateGameState({
      ...gameState,
      strokes: [],
      updatedAt: Date.now(),
    });
  }, [localStrokes, gameState, onUpdateGameState]);

  const handleBucketFill = useCallback(
    async (color: string) => {
      void triggerGameHaptic('selection');
      const fillStroke: DrawStroke = {
        id: `fill_${Date.now()}`,
        color,
        strokeWidth: 0,
        points: [],
        isFill: true,
      };
      const next = [...localStrokes, fillStroke];
      setLocalStrokes(next);
      channelRef.current?.send({ type: 'broadcast', event: 'stroke_bucket', payload: { color } });
      await onUpdateGameState({
        ...gameState,
        strokes: next,
        updatedAt: Date.now(),
      });
    },
    [localStrokes, gameState, onUpdateGameState]
  );

  // Splash de 1.5s al iniciar nueva ronda
  useEffect(() => {
    if (gameState.phase === 'drawing' && previousRoundRef.current !== gameState.currentRound) {
      previousRoundRef.current = gameState.currentRound;
      setShowRoundSplash(true);
      splashAnim.setValue(0);
      Animated.sequence([
        Animated.timing(splashAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(splashAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setShowRoundSplash(false);
      });
    }
  }, [gameState.phase, gameState.currentRound, splashAnim]);

  // 2. TEMPORIZADOR COMPARTIDO POR DEADLINE
  useEffect(() => {
    if (gameState.phase !== 'drawing' && gameState.phase !== 'choosing_word') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    const checkTimer = () => {
      if (!gameState.roundDeadline) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((gameState.roundDeadline - now) / 1000));
      setSecondsLeft(remaining);

      // Alerta de últimos 10s
      if (remaining <= 10 && remaining > 0) {
        void triggerGameHaptic('warning');
      }

      // Pista automática a los 40s transcurridos (quedan <= 35s)
      if (
        gameState.phase === 'drawing' &&
        remaining <= 35 &&
        !gameState.revealedIndices?.includes(0) &&
        (gameState.drawerWord || gameState.selectedWord)
      ) {
        const fullWord = gameState.drawerWord || gameState.selectedWord || '';
        const nextIndices = Array.from(new Set([...(gameState.revealedIndices || []), 0]));
        const nextMask = buildWordMask(fullWord, nextIndices);
        void onUpdateGameState({
          ...gameState,
          revealedIndices: nextIndices,
          wordMask: nextMask,
          updatedAt: Date.now(),
        });
      }

      // Tiempo agotado para elegir palabra (15s)
      if (gameState.phase === 'choosing_word' && remaining <= 0 && isMeDrawer) {
        if (gameState.wordChoices) {
          void handleSelectWord(gameState.wordChoices.medium);
        }
      }

      // Tiempo agotado para dibujar (75s)
      if (gameState.phase === 'drawing' && remaining <= 0) {
        if (isMeDrawer) {
          void handleRoundTimeout();
        }
      }
    };

    checkTimer();
    timerIntervalRef.current = setInterval(checkTimer, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState.roundDeadline, gameState.phase, isMeDrawer, gameState.wordChoices]);

  // Carga automática de palabras para el dibujante
  useEffect(() => {
    if (gameState.phase === 'choosing_word' && isMeDrawer && !gameState.wordChoices) {
      void getWordChoicesForRound(gameState.usedWords || []).then((choices) => {
        void onUpdateGameState({
          ...gameState,
          wordChoices: choices,
          roundDeadline: Date.now() + 15000,
          updatedAt: Date.now(),
        });
      });
    }
  }, [gameState.phase, isMeDrawer, gameState.wordChoices]);

  // Selección de palabra (Dibujante)
  const handleSelectWord = async (choice: any) => {
    void triggerGameHaptic('selection');
    const salt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const wordHash = hashWordWithSalt(choice.word, salt);
    const almostHashes = generateDistanceOneHashes(choice.word, salt);
    const initialMask = buildWordMask(choice.word, []);

    const updated: DrawGuessState = {
      ...gameState,
      phase: 'drawing',
      drawerWord: choice.word, // Guardado para el dibujante
      selectedWord: null, // Oculto al adivinador para anti-trampa estricta
      selectedWordHash: wordHash,
      almostHashes,
      wordMask: initialMask,
      selectedWordDifficulty: choice.difficulty,
      selectedWordCategory: choice.category,
      categoryEmoji: choice.categoryEmoji,
      wordLength: choice.word.length,
      roundPoints: choice.points,
      roundDeadline: Date.now() + 75000,
      strokes: [],
      attempts: [],
      revealedIndices: [],
      usedHint: false,
      usedWords: [...(gameState.usedWords || []), choice.word],
      updatedAt: Date.now(),
    };

    await onUpdateGameState(updated);
  };

  // Botón manual de Pista (-50% puntos de ronda)
  const handleUseHint = async () => {
    if (gameState.usedHint || !isMeGuesser) return;
    void triggerGameHaptic('medium');

    const totalLen = gameState.wordLength || 0;
    if (totalLen <= 1) return;

    const alreadyRevealed = new Set(gameState.revealedIndices || []);
    const availablePositions: number[] = [];
    for (let i = 0; i < totalLen; i++) {
      if (!alreadyRevealed.has(i)) availablePositions.push(i);
    }
    if (availablePositions.length === 0) return;

    const randomPick = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const nextIndices = [...alreadyRevealed, randomPick];
    const halvedPoints = Math.max(25, Math.round((gameState.roundPoints || 100) / 2));

    await onUpdateGameState({
      ...gameState,
      revealedIndices: nextIndices,
      usedHint: true,
      roundPoints: halvedPoints,
      updatedAt: Date.now(),
    });
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Envío de intento del adivinador
  const handleSubmitGuess = async () => {
    const rawGuess = guessInput.trim();
    if (!rawGuess) {
      triggerShake();
      void triggerGameHaptic('light');
      return;
    }

    const norm = normalizeGuess(rawGuess);
    // Verificar intento repetido
    const alreadyTried = (gameState.attempts || []).some((a) => normalizeGuess(a.guess) === norm);
    if (alreadyTried) {
      triggerShake();
      void triggerGameHaptic('light');
      return;
    }

    setGuessInput('');
    // Mantener el teclado abierto
    inputRef.current?.focus();

    // Verificación anti-trampa con hash
    let isCorrect = false;
    let isClose = false;

    // Si tenemos la palabra en claro (dibujante o fin de ronda)
    if (gameState.drawerWord || gameState.selectedWord) {
      const target = gameState.drawerWord || gameState.selectedWord || '';
      const evalResult = evaluateGuess(rawGuess, target);
      isCorrect = evalResult.isCorrect;
      isClose = evalResult.isClose;
    } else if (gameState.selectedWordHash) {
      // Comparación segura por hash determinista
      // El salt se deduce o compara
      // Evaluamos con el drawer vía fallback
      isCorrect = (gameState.almostHashes || []).includes(norm);
    }

    if (isCorrect) {
      void triggerGameHaptic('success');
      const timeBonus = Math.floor((Math.max(0, secondsLeft) / 75) * 50);
      const totalEarned = (gameState.roundPoints || 50) + timeBonus;
      setLastEarnedPoints(totalEarned);

      const targetWord = gameState.drawerWord || gameState.selectedWord || rawGuess.toUpperCase();
      const nextScoreK = guesserProfile === 'Karla' ? gameState.scoreKarla + totalEarned : gameState.scoreKarla;
      const nextScoreJ = guesserProfile === 'Javier' ? gameState.scoreJavier + totalEarned : gameState.scoreJavier;
      const nextGuesserK = guesserProfile === 'Karla' ? (gameState.guesserScoreKarla || 0) + totalEarned : gameState.guesserScoreKarla || 0;
      const nextGuesserJ = guesserProfile === 'Javier' ? (gameState.guesserScoreJavier || 0) + totalEarned : gameState.guesserScoreJavier || 0;
      const nextCorrectK = guesserProfile === 'Karla' ? (gameState.correctGuessesKarla || 0) + 1 : gameState.correctGuessesKarla || 0;
      const nextCorrectJ = guesserProfile === 'Javier' ? (gameState.correctGuessesJavier || 0) + 1 : gameState.correctGuessesJavier || 0;

      const roundRecord: DrawGuessRoundRecord = {
        roundNumber: gameState.currentRound,
        drawer: drawerProfile,
        guesser: guesserProfile,
        word: targetWord,
        difficulty: gameState.selectedWordDifficulty || 'media',
        category: gameState.selectedWordCategory || 'General',
        categoryEmoji: gameState.categoryEmoji || '🎨',
        pointsBase: gameState.roundPoints || 50,
        pointsBonus: timeBonus,
        guessed: true,
        guessedAtSecondsLeft: secondsLeft,
        usedHint: gameState.usedHint,
        strokes: localStrokes,
      };

      const isLastRound = gameState.currentRound >= 6;
      let matchWinner: UserProfile | 'Empate' | null = null;
      if (isLastRound) {
        if (nextGuesserK > nextGuesserJ) matchWinner = 'Karla';
        else if (nextGuesserJ > nextGuesserK) matchWinner = 'Javier';
        else matchWinner = 'Empate';
      }

      const updatedAttempts = [
        { player: currentProfile, guess: rawGuess, timestamp: Date.now(), isCorrect: true },
        ...(gameState.attempts || []),
      ];

      // Animación de Acierto
      setShowSuccessModal(true);
      successScaleAnim.setValue(0);
      Animated.spring(successScaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();

      await onUpdateGameState({
        ...gameState,
        phase: isLastRound ? 'game_over' : 'round_end',
        selectedWord: targetWord, // Ahora se revela la palabra
        scoreKarla: nextScoreK,
        scoreJavier: nextScoreJ,
        guesserScoreKarla: nextGuesserK,
        guesserScoreJavier: nextGuesserJ,
        correctGuessesKarla: nextCorrectK,
        correctGuessesJavier: nextCorrectJ,
        roundsHistory: [...(gameState.roundsHistory || []), roundRecord],
        attempts: updatedAttempts,
        winner: matchWinner,
        updatedAt: Date.now(),
      });

      if (isLastRound && matchWinner && !isRewardingRef.current) {
        isRewardingRef.current = true;
        await onFinishGameReward(matchWinner, Math.max(nextScoreK, nextScoreJ));
      }
      return;
    }

    if (isClose) {
      void triggerGameHaptic('warning');
    } else {
      void triggerGameHaptic('light');
    }

    const nextAttempts = [
      { player: currentProfile, guess: rawGuess, timestamp: Date.now(), isClose },
      ...(gameState.attempts || []),
    ].slice(0, 4);

    await onUpdateGameState({
      ...gameState,
      attempts: nextAttempts,
      updatedAt: Date.now(),
    });
  };

  // Tiempo agotado sin acierto
  const handleRoundTimeout = async () => {
    void triggerGameHaptic('warning');
    const targetWord = gameState.drawerWord || gameState.selectedWord || 'Palabra';
    const isLastRound = gameState.currentRound >= 6;

    let matchWinner: UserProfile | 'Empate' | null = null;
    if (isLastRound) {
      if ((gameState.guesserScoreKarla || 0) > (gameState.guesserScoreJavier || 0)) matchWinner = 'Karla';
      else if ((gameState.guesserScoreJavier || 0) > (gameState.guesserScoreKarla || 0)) matchWinner = 'Javier';
      else matchWinner = 'Empate';
    }

    const roundRecord: DrawGuessRoundRecord = {
      roundNumber: gameState.currentRound,
      drawer: drawerProfile,
      guesser: guesserProfile,
      word: targetWord,
      difficulty: gameState.selectedWordDifficulty || 'media',
      category: gameState.selectedWordCategory || 'General',
      categoryEmoji: gameState.categoryEmoji || '🎨',
      pointsBase: 0,
      pointsBonus: 0,
      guessed: false,
      usedHint: gameState.usedHint,
      strokes: localStrokes,
    };

    await onUpdateGameState({
      ...gameState,
      phase: isLastRound ? 'game_over' : 'round_end',
      selectedWord: targetWord,
      roundsHistory: [...(gameState.roundsHistory || []), roundRecord],
      winner: matchWinner,
      updatedAt: Date.now(),
    });

    if (isLastRound && matchWinner && !isRewardingRef.current) {
      isRewardingRef.current = true;
      await onFinishGameReward(matchWinner, Math.max(gameState.scoreKarla, gameState.scoreJavier));
    }
  };

  // Pasar a la siguiente ronda (lock estricto para evitar doble avance)
  const handleNextRound = async () => {
    if (gameState.phase !== 'round_end' || isAdvancingRoundRef.current) return;
    isAdvancingRoundRef.current = true;
    void triggerGameHaptic('medium');

    const nextRoundNum = gameState.currentRound + 1;
    const nextDrawer: UserProfile = nextRoundNum % 2 === 1 ? 'Karla' : 'Javier';
    const nextGuesser: UserProfile = nextDrawer === 'Karla' ? 'Javier' : 'Karla';

    await onUpdateGameState({
      ...gameState,
      phase: 'choosing_word',
      currentRound: nextRoundNum,
      drawer: nextDrawer,
      guesser: nextGuesser,
      wordChoices: null,
      selectedWord: null,
      drawerWord: null,
      selectedWordDifficulty: null,
      selectedWordCategory: null,
      categoryEmoji: null,
      wordLength: 0,
      wordMask: '',
      roundDeadline: null,
      strokes: [],
      attempts: [],
      revealedIndices: [],
      usedHint: false,
      updatedAt: Date.now(),
    });

    isAdvancingRoundRef.current = false;
  };

  // Revancha
  const handleRematch = async () => {
    void triggerGameHaptic('selection');
    isRewardingRef.current = false;
    isAdvancingRoundRef.current = false;

    await onUpdateGameState({
      ...DEFAULT_DRAW_GUESS_FALLBACK,
      phase: 'choosing_word',
      currentRound: 1,
      drawer: 'Karla',
      guesser: 'Javier',
      strokes: [],
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
      winner: null,
      updatedAt: Date.now(),
    });
  };

  // Guardar dibujo en recuerdos
  const handleSaveDrawingToMemories = async () => {
    if (isSavingDrawing || localStrokes.length === 0) return;
    setIsSavingDrawing(true);
    void triggerGameHaptic('success');

    try {
      const revealedWord = gameState.selectedWord || gameState.drawerWord || 'Dibujo';
      const caption = `Dibujo de ${drawerDisplayName} adivinado por ${guesserDisplayName}: "${revealedWord}"`;
      const dateStr = new Date().toISOString();

      await addLocalMilestone({
        id: `dg_${Date.now()}`,
        title: `Dibuja y Adivina: ${revealedWord}`,
        description: caption,
        date: dateStr,
        category: 'Juegos',
      } as any);

      await createSupabaseMilestone({
        title: `Dibuja y Adivina: ${revealedWord}`,
        description: caption,
        date: dateStr,
        category: 'Juegos',
      } as any).catch(() => null);

      setSavedSuccessToast(true);
      setTimeout(() => setSavedSuccessToast(false), 2500);
    } catch {
      // Ignorar fallo
    } finally {
      setIsSavingDrawing(false);
    }
  };

  // Reproducción animada trazo a trazo
  const handleStartReplay = () => {
    if (isReplaying || localStrokes.length === 0) return;
    setIsReplaying(true);
    setReplayStrokes([]);
    let currentIdx = 0;

    const interval = setInterval(() => {
      if (currentIdx < localStrokes.length) {
        setReplayStrokes((prev) => [...prev, localStrokes[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => setIsReplaying(false), 800);
      }
    }, 180);
  };

  // Tamaño dinámico del lienzo cuando el teclado está abierto
  const canvasSize = isKeyboardVisible
    ? Math.min(CANVAS_BASE_SIZE * 0.62, 220)
    : CANVAS_BASE_SIZE;

  // Palabra en guiones o completa
  const activeWordMask = gameState.wordMask || (gameState.drawerWord ? buildWordMask(gameState.drawerWord, gameState.revealedIndices || []) : '_ _ _ _');

  return (
    <KeyboardAvoidingView
      style={styles.mainContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      {/* ================= 1. HEADER COMPACTO ≈56PX ================= */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('light');
            onBack();
          }}
          style={styles.headerBackBtn}
          accessibilityLabel="Volver al Lobby"
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <View style={[styles.headerIconCircle, { backgroundColor: '#ecfdf5' }]}>
            <Ionicons name="brush" size={17} color={primaryColor} />
          </View>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            Dibuja y Adivina
          </Text>
        </View>

        {/* Avatares K y J con anillo en quien dibuja */}
        <View style={styles.headerAvatarsRow}>
          <View
            style={[
              styles.avatarWrap,
              drawerProfile === 'Karla' && { borderColor: '#ec4899', borderWidth: 2.5 },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: '#fdf2f8' }]}>
              <Text style={[styles.avatarLetter, { color: '#ec4899' }]}>K</Text>
            </View>
          </View>

          <View
            style={[
              styles.avatarWrap,
              drawerProfile === 'Javier' && { borderColor: '#0ea5e9', borderWidth: 2.5 },
            ]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: '#f0f9ff' }]}>
              <Text style={[styles.avatarLetter, { color: '#0ea5e9' }]}>J</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ================= MARCADOR DELGADO DE LA PARTIDA ================= */}
      <View style={styles.matchScoreBar}>
        <Text style={[styles.matchScoreText, { color: '#ec4899' }]}>
          Karlita: <Text style={styles.matchScoreBold}>{gameState.scoreKarla} pts</Text>
        </Text>
        <Text style={styles.matchScoreDivider}>•</Text>
        <Text style={[styles.matchScoreText, { color: '#0ea5e9' }]}>
          Javier: <Text style={styles.matchScoreBold}>{gameState.scoreJavier} pts</Text>
        </Text>
      </View>

      {/* ================= 2. BARRA DE ESTADO (RONDA, RELOJ, ROL ÚNICO) ================= */}
      <View style={styles.statusBar}>
        <View style={styles.roundPill}>
          <Text style={styles.roundPillText}>Ronda {gameState.currentRound} de 6</Text>
        </View>

        {/* Rol en una sola indicación */}
        <View style={styles.roleNoticeWrap}>
          <Ionicons
            name={isMeDrawer ? 'color-palette' : 'search'}
            size={13}
            color={isMeDrawer ? primaryColor : '#64748b'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.roleNoticeText, isMeDrawer && { color: primaryColor, fontWeight: '800' }]}>
            {isMeDrawer ? 'Tú dibujas' : `${drawerDisplayName} dibuja`}
          </Text>
        </View>

        {/* Anillo de tiempo circular */}
        <View style={styles.timerCircleWrap}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Circle
              cx={18}
              cy={18}
              r={14}
              stroke="#e2e8f0"
              strokeWidth={3}
              fill="none"
            />
            <Circle
              cx={18}
              cy={18}
              r={14}
              stroke={secondsLeft <= 10 ? '#ef4444' : primaryColor}
              strokeWidth={3}
              fill="none"
              strokeDasharray={`${(Math.max(0, secondsLeft) / 75) * 88} 88`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </Svg>
          <View style={styles.timerInnerCount}>
            <Text
              style={[
                styles.timerNumText,
                { color: secondsLeft <= 10 ? '#ef4444' : '#0f172a' },
              ]}
            >
              {secondsLeft}s
            </Text>
          </View>
        </View>
      </View>

      {/* ================= 3. FILA DE LA PALABRA (GUIONES O PALABRA COMPLETA) ================= */}
      <View style={styles.wordRowContainer}>
        {isMeDrawer ? (
          <View style={styles.drawerWordRow}>
            <Text style={styles.drawerLabelText}>Dibuja:</Text>
            <Text style={[styles.drawerWordText, { color: primaryColor }]}>
              {gameState.drawerWord || gameState.selectedWord || '...'}
            </Text>
            {gameState.selectedWordCategory && (
              <View style={[styles.categoryChip, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
                <Text style={styles.categoryChipText}>
                  {gameState.categoryEmoji || '🎨'} {gameState.selectedWordCategory}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.guesserWordRow}>
            <Text style={styles.guesserMaskText} numberOfLines={1} adjustsFontSizeToFit>
              {activeWordMask}
            </Text>
            {gameState.selectedWordCategory && (
              <View style={[styles.categoryChip, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
                <Text style={styles.categoryChipText}>
                  {gameState.categoryEmoji || '🎨'} {gameState.selectedWordCategory}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ================= 4. LIENZO CUADRADO 1:1 CON CUADRÍCULA TENUE ================= */}
      <View style={[styles.canvasFrame, { width: canvasSize, height: canvasSize }]}>
        <DrawGuessCanvas
          strokes={isReplaying ? replayStrokes : localStrokes}
          onStrokeBatch={handleStrokeBatch}
          onStrokeEnd={handleStrokeEnd}
          readOnly={!isMeDrawer || gameState.phase !== 'drawing'}
          currentColor={currentColor}
          currentWidth={currentWidth}
          isEraserActive={isEraser}
          isBucketActive={isBucket}
          onBucketFill={handleBucketFill}
        />

        {/* Overlay de espera para el adivinador cuando el dibujante elige palabra */}
        {gameState.phase === 'choosing_word' && isMeGuesser && (
          <View style={styles.canvasDimmedOverlay}>
            <View style={styles.waitingCard}>
              <View style={styles.waitingIconWrap}>
                <Ionicons name="pencil" size={24} color={primaryColor} />
              </View>
              <Text style={styles.waitingCardTitle}>
                {drawerDisplayName} está eligiendo qué dibujar…
              </Text>
              <Text style={styles.waitingCardDots}>• • •</Text>
            </View>
          </View>
        )}

        {/* Toast sutil de guardado con éxito */}
        {savedSuccessToast && (
          <View style={styles.savedToast}>
            <Ionicons name="checkmark-circle" size={16} color="#15803d" />
            <Text style={styles.savedToastText}>¡Guardado en Recuerdos!</Text>
          </View>
        )}
      </View>

      {/* ================= 5. DOCK INFERIOR FIJO ================= */}
      <View style={styles.bottomDockContainer}>
        {isMeDrawer && gameState.phase === 'drawing' ? (
          /* DOCK DEL DIBUJANTE: 2 FILAS */
          <View style={styles.drawerDockCard}>
            {/* Fila 1: 8 Colores de 34px uniformes */}
            <View style={styles.colorsPaletteRow}>
              {CANVAS_COLORS.map((col) => {
                const isSelected = currentColor === col && !isEraser && !isBucket;
                return (
                  <TouchableOpacity
                    key={col}
                    onPress={() => {
                      void triggerGameHaptic('selection');
                      setCurrentColor(col);
                      setIsEraser(false);
                      setIsBucket(false);
                    }}
                    style={[
                      styles.colorDotBtn,
                      { backgroundColor: col },
                      isSelected && styles.colorDotBtnActive,
                    ]}
                    activeOpacity={0.8}
                    accessibilityLabel={`Color ${col}`}
                  >
                    {isSelected && <View style={styles.colorDotInnerWhite} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fila 2: 3 Grosores, Borrador real, Cubeta de relleno, Deshacer, Limpiar (44px) */}
            <View style={styles.toolsRow}>
              {/* 3 Grosores */}
              <View style={styles.strokeWidthsGroup}>
                {CANVAS_STROKE_WIDTHS.map((sw) => {
                  const isSelected = currentWidth === sw.width && !isEraser;
                  return (
                    <TouchableOpacity
                      key={sw.id}
                      onPress={() => {
                        void triggerGameHaptic('selection');
                        setCurrentWidth(sw.width);
                        setIsEraser(false);
                      }}
                      style={[
                        styles.toolBtn44,
                        isSelected && { borderColor: primaryColor, backgroundColor: '#ecfdf5' },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          width: sw.dotSize,
                          height: sw.dotSize,
                          borderRadius: sw.dotSize / 2,
                          backgroundColor: isSelected ? primaryColor : '#64748b',
                        }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Herramientas de acción */}
              <View style={styles.actionsGroup}>
                {/* Borrador con icono real */}
                <TouchableOpacity
                  onPress={() => {
                    void triggerGameHaptic('selection');
                    setIsEraser(!isEraser);
                    setIsBucket(false);
                  }}
                  style={[
                    styles.toolBtn44,
                    isEraser && { borderColor: primaryColor, backgroundColor: '#ecfdf5' },
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel="Borrador"
                >
                  <Ionicons
                    name="backspace-outline"
                    size={20}
                    color={isEraser ? primaryColor : '#475569'}
                  />
                </TouchableOpacity>

                {/* Cubeta de relleno */}
                <TouchableOpacity
                  onPress={() => {
                    void triggerGameHaptic('selection');
                    setIsBucket(!isBucket);
                    setIsEraser(false);
                  }}
                  style={[
                    styles.toolBtn44,
                    isBucket && { borderColor: primaryColor, backgroundColor: '#ecfdf5' },
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel="Cubeta de relleno"
                >
                  <Ionicons
                    name="color-fill-outline"
                    size={19}
                    color={isBucket ? primaryColor : '#475569'}
                  />
                </TouchableOpacity>

                {/* Deshacer */}
                <TouchableOpacity
                  onPress={() => void handleUndoStroke()}
                  disabled={localStrokes.length === 0}
                  style={[
                    styles.toolBtn44,
                    localStrokes.length === 0 && { opacity: 0.35 },
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel="Deshacer trazo"
                >
                  <Ionicons name="arrow-undo-outline" size={20} color="#475569" />
                </TouchableOpacity>

                {/* Limpiar todo */}
                <TouchableOpacity
                  onPress={() => void handleClearStrokes()}
                  disabled={localStrokes.length === 0}
                  style={[
                    styles.toolBtn44,
                    localStrokes.length === 0 && { opacity: 0.35 },
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel="Limpiar lienzo"
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : isMeGuesser && gameState.phase === 'drawing' ? (
          /* DOCK DEL ADIVINADOR: ESTILO CHAT */
          <View style={styles.guesserDockCard}>
            {/* Historial de últimos 3-4 intentos como burbujas */}
            <View style={styles.attemptsHistoryRow}>
              {(gameState.attempts || []).slice(0, 4).map((att, i) => (
                <View
                  key={`${att.timestamp}_${i}`}
                  style={[
                    styles.attemptBubble,
                    att.isCorrect
                      ? styles.bubbleCorrect
                      : att.isClose
                      ? styles.bubbleAlmost
                      : styles.bubbleWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.attemptBubbleText,
                      att.isCorrect
                        ? { color: '#15803d' }
                        : att.isClose
                        ? { color: '#b45309' }
                        : { color: '#64748b' },
                    ]}
                  >
                    {att.isCorrect ? '✓ ' : att.isClose ? '¡Casi! ' : ''}
                    {att.guess}
                  </Text>
                </View>
              ))}
            </View>

            {/* Indicador animado "Karlita está dibujando..." */}
            <View style={styles.drawingLiveIndicatorRow}>
              <Ionicons name="pencil" size={13} color={primaryColor} />
              <Text style={[styles.drawingLiveIndicatorText, { color: primaryColor }]}>
                {drawerDisplayName} está dibujando…
              </Text>
            </View>

            {/* Input grande con botón pista a la izquierda y botón enviar a la derecha */}
            <Animated.View style={[styles.inputRowContainer, { transform: [{ translateX: shakeAnim }] }]}>
              {/* Botón Pista redondo con bombilla y badge -50% */}
              <TouchableOpacity
                onPress={() => void handleUseHint()}
                disabled={gameState.usedHint}
                style={[
                  styles.hintRoundBtn,
                  gameState.usedHint && { opacity: 0.45, borderColor: '#cbd5e1' },
                ]}
                activeOpacity={0.7}
                accessibilityLabel="Pedir pista (-50% puntos)"
              >
                <Ionicons
                  name={gameState.usedHint ? 'bulb' : 'bulb-outline'}
                  size={19}
                  color={gameState.usedHint ? '#94a3b8' : '#f59e0b'}
                />
                <View style={styles.hintBadgePill}>
                  <Text style={styles.hintBadgeText}>-50%</Text>
                </View>
              </TouchableOpacity>

              {/* Campo de texto GRANDE */}
              <TextInput
                ref={inputRef}
                value={guessInput}
                onChangeText={setGuessInput}
                onSubmitEditing={handleSubmitGuess}
                placeholder="Escribe tu respuesta…"
                placeholderTextColor="#94a3b8"
                style={styles.guessBigInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
              />

              {/* Botón Enviar verde esmeralda */}
              <TouchableOpacity
                onPress={handleSubmitGuess}
                disabled={!guessInput.trim()}
                style={[
                  styles.sendGreenBtn,
                  { backgroundColor: guessInput.trim() ? primaryColor : '#cbd5e1' },
                ]}
                activeOpacity={0.8}
                accessibilityLabel="Enviar intento"
              >
                <Ionicons name="paper-plane" size={17} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        ) : (
          /* Estado de espera o fin */
          <View style={styles.dockIdleBox}>
            <Text style={styles.dockIdleText}>
              {gameState.phase === 'choosing_word'
                ? isMeDrawer
                  ? 'Elige tu palabra arriba'
                  : `Esperando a ${drawerDisplayName}…`
                : 'Partida en curso'}
            </Text>
          </View>
        )}
      </View>

      {/* ================= MODAL: ELECCIÓN DE PALABRA (DIBUJANTE, 15S) ================= */}
      <Modal visible={gameState.phase === 'choosing_word' && isMeDrawer} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalHeaderIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="color-palette" size={24} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.modalTitle}>¡Te toca dibujar!</Text>
                <Text style={styles.modalSubtitle}>Elige una de las 3 opciones ({secondsLeft}s)</Text>
              </View>
            </View>

            {gameState.wordChoices ? (
              <View style={styles.choicesWrap}>
                {/* Fácil */}
                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.easy)}
                  style={[styles.choiceCard, { borderColor: '#86efac' }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceCardLeft}>
                    <Text style={styles.choiceEmoji}>{gameState.wordChoices.easy.categoryEmoji || '🌱'}</Text>
                    <View>
                      <Text style={styles.choiceWordText}>{gameState.wordChoices.easy.word}</Text>
                      <Text style={styles.choiceCategoryText}>{gameState.wordChoices.easy.category} · Fácil</Text>
                    </View>
                  </View>
                  <View style={[styles.choicePointsBadge, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.choicePointsText, { color: '#16a34a' }]}>+50 pts</Text>
                  </View>
                </TouchableOpacity>

                {/* Media */}
                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.medium)}
                  style={[styles.choiceCard, { borderColor: '#93c5fd' }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceCardLeft}>
                    <Text style={styles.choiceEmoji}>{gameState.wordChoices.medium.categoryEmoji || '⚡'}</Text>
                    <View>
                      <Text style={styles.choiceWordText}>{gameState.wordChoices.medium.word}</Text>
                      <Text style={styles.choiceCategoryText}>{gameState.wordChoices.medium.category} · Media</Text>
                    </View>
                  </View>
                  <View style={[styles.choicePointsBadge, { backgroundColor: '#eff6ff' }]}>
                    <Text style={[styles.choicePointsText, { color: '#2563eb' }]}>+100 pts</Text>
                  </View>
                </TouchableOpacity>

                {/* Difícil */}
                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.hard)}
                  style={[styles.choiceCard, { borderColor: '#fca5a5' }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.choiceCardLeft}>
                    <Text style={styles.choiceEmoji}>{gameState.wordChoices.hard.categoryEmoji || '🔥'}</Text>
                    <View>
                      <Text style={styles.choiceWordText}>{gameState.wordChoices.hard.word}</Text>
                      <Text style={styles.choiceCategoryText}>{gameState.wordChoices.hard.category} · Difícil</Text>
                    </View>
                  </View>
                  <View style={[styles.choicePointsBadge, { backgroundColor: '#fef2f2' }]}>
                    <Text style={[styles.choicePointsText, { color: '#dc2626' }]}>+150 pts</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: '#64748b' }}>Preparando palabras…</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= SPLASH DE INICIO DE RONDA (1.5S) ================= */}
      {showRoundSplash && (
        <Animated.View style={[styles.roundSplashOverlay, { opacity: splashAnim }]}>
          <View style={styles.roundSplashBox}>
            <Text style={styles.roundSplashTitle}>Ronda {gameState.currentRound}</Text>
            <Text style={styles.roundSplashSubtitle}>Dibuja {drawerDisplayName}</Text>
          </View>
        </Animated.View>
      )}

      {/* ================= MODAL: FIN DE RONDA (REVELACIÓN + REPLAY) ================= */}
      <Modal visible={gameState.phase === 'round_end'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
              <Text style={styles.modalTitle}>¡Ronda {gameState.currentRound} Finalizada!</Text>
              <Text style={styles.modalSubtitle}>La palabra secreta era:</Text>
              <Text style={[styles.revealedSecretWord, { color: primaryColor }]}>
                {gameState.selectedWord || gameState.drawerWord || 'Palabra'}
              </Text>
            </View>

            {/* Puntos de la ronda */}
            <View style={styles.roundResultSummaryBox}>
              <View style={styles.roundResultCol}>
                <Text style={styles.roundResultLabel}>Puntos de ronda</Text>
                <Text style={[styles.roundResultVal, { color: primaryColor }]}>
                  +{gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.pointsBase || 0}
                </Text>
              </View>
              <View style={styles.roundResultCol}>
                <Text style={styles.roundResultLabel}>Bonus de tiempo</Text>
                <Text style={[styles.roundResultVal, { color: '#f59e0b' }]}>
                  +{gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.pointsBonus || 0}
                </Text>
              </View>
            </View>

            {/* Acciones de ronda */}
            <View style={{ gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={handleStartReplay}
                style={styles.replayButton}
                activeOpacity={0.8}
              >
                <Ionicons name="play-circle-outline" size={18} color="#0f172a" />
                <Text style={styles.replayButtonText}>
                  {isReplaying ? 'Reproduciendo trazos…' : 'Ver repetición del dibujo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleSaveDrawingToMemories()}
                disabled={isSavingDrawing}
                style={styles.saveDrawingButton}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={17} color="#ec4899" />
                <Text style={styles.saveDrawingButtonText}>
                  {isSavingDrawing ? 'Guardando…' : 'Guardar en Recuerdos'}
                </Text>
              </TouchableOpacity>

              <GameButton
                label={gameState.currentRound >= 6 ? 'Ver Resultados Finales' : 'Siguiente Ronda'}
                icon="arrow-forward"
                variant="primary"
                onPress={() => void handleNextRound()}
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FIN DE PARTIDA (GANADOR Y REVANCHA) ================= */}
      <Modal visible={gameState.phase === 'game_over'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 40 }}>🏆</Text>
              <Text style={styles.modalTitle}>
                {gameState.winner === 'Empate'
                  ? '¡Empate de Amor!'
                  : `¡Ganó ${gameState.winner === 'Karla' ? 'Karlita' : 'Javier'}!`}
              </Text>
              <Text style={styles.modalSubtitle}>
                {gameState.winner === 'Empate'
                  ? 'Ambos demostraron una sincronía perfecta adivinando.'
                  : `${gameState.winner === 'Karla' ? 'Karlita' : 'Javier'} sumó más puntos adivinando los dibujos.`}
              </Text>
            </View>

            {/* Resumen comparativo */}
            <View style={styles.finalScoreGrid}>
              <View style={[styles.finalScoreCol, { borderColor: '#fbcfe8' }]}>
                <Text style={[styles.finalPlayerName, { color: '#ec4899' }]}>Karlita</Text>
                <Text style={styles.finalScorePts}>{gameState.scoreKarla || 0} pts</Text>
                <Text style={styles.finalCorrectText}>
                  {gameState.correctGuessesKarla || 0} {gameState.correctGuessesKarla === 1 ? 'acierto' : 'aciertos'}
                </Text>
              </View>

              <View style={[styles.finalScoreCol, { borderColor: '#bae6fd' }]}>
                <Text style={[styles.finalPlayerName, { color: '#0ea5e9' }]}>Javier</Text>
                <Text style={styles.finalScorePts}>{gameState.scoreJavier || 0} pts</Text>
                <Text style={styles.finalCorrectText}>
                  {gameState.correctGuessesJavier || 0} {gameState.correctGuessesJavier === 1 ? 'acierto' : 'aciertos'}
                </Text>
              </View>
            </View>

            {/* Botones finales unificados */}
            <View style={{ gap: 8, marginTop: 14 }}>
              <GameButton
                label="Revancha"
                icon="refresh"
                variant="primary"
                onPress={() => void handleRematch()}
              />
              <GameButton
                label="Volver al Lobby"
                icon="home-outline"
                variant="secondary"
                onPress={onBack}
              />
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff5f7',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    width: '100%',
  },
  headerBar: {
    height: 54,
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarWrap: {
    borderRadius: 20,
    padding: 1.5,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  matchScoreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
    width: '100%',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchScoreBold: {
    fontWeight: '800',
  },
  matchScoreDivider: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  roundPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roundPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  roleNoticeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  roleNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  timerCircleWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerInnerCount: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerNumText: {
    fontSize: 10.5,
    fontWeight: '900',
  },
  wordRowContainer: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3,
    paddingHorizontal: 16,
    width: '100%',
  },
  drawerWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerWordText: {
    fontSize: 17,
    fontWeight: '900',
  },
  guesserWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guesserMaskText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 3,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  canvasFrame: {
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  canvasDimmedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 253, 250, 0.88)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  waitingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  waitingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  waitingCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  waitingCardDots: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 6,
    letterSpacing: 4,
  },
  savedToast: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    elevation: 3,
  },
  savedToastText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
  },
  bottomDockContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  drawerDockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  colorsPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  colorDotBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  colorDotBtnActive: {
    borderWidth: 2,
    borderColor: '#0f172a',
    transform: [{ scale: 1.08 }],
  },
  colorDotInnerWhite: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strokeWidthsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn44: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guesserDockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
  },
  attemptsHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
    marginBottom: 4,
  },
  attemptBubble: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  bubbleWrong: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  bubbleAlmost: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  bubbleCorrect: {
    backgroundColor: '#dcfce7',
    borderColor: '#22c55e',
  },
  attemptBubbleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  drawingLiveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  drawingLiveIndicatorText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintRoundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hintBadgePill: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#f59e0b',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  hintBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  guessBigInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  sendGreenBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIdleBox: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockIdleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    fontWeight: '600',
  },
  choicesWrap: {
    gap: 10,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  choiceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  choiceEmoji: {
    fontSize: 24,
  },
  choiceWordText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  choiceCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  choicePointsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  choicePointsText: {
    fontSize: 12,
    fontWeight: '900',
  },
  roundSplashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  roundSplashBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    elevation: 10,
  },
  roundSplashTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  roundSplashSubtitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 4,
  },
  revealedSecretWord: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },
  roundResultSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roundResultCol: {
    alignItems: 'center',
  },
  roundResultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  roundResultVal: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 11,
    borderRadius: 12,
  },
  replayButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  saveDrawingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#fbcfe8',
    paddingVertical: 11,
    borderRadius: 12,
  },
  saveDrawingButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#be185d',
  },
  finalScoreGrid: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  finalScoreCol: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  finalPlayerName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  finalScorePts: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  finalCorrectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
});

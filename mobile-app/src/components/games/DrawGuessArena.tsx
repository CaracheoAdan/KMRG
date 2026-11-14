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
  Image,
  ScrollView,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../ui/Icon';
import { UserProfile, DrawGuessState, DrawGuessStroke, DrawGuessRoundRecord } from '../../types';
import { useProfile } from '../../contexts/ProfileContext';
import {
  DrawGuessCanvas,
  CANVAS_COLORS,
  CANVAS_STROKE_WIDTHS,
  DrawStroke,
} from './DrawGuessCanvas';
import {
  ColorSpectrumPickerModal,
  isLightHexColor,
} from './ColorSpectrumPickerModal';
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
    const raw: Partial<DrawGuessState> = rawGameState || {};
    const phase = (!raw.phase || raw.phase === 'idle') ? 'choosing_word' : raw.phase;
    const drawer: UserProfile = raw.drawer || 'Karla';
    const guesser: UserProfile = drawer === 'Karla' ? 'Javier' : 'Karla';
    return {
      ...DEFAULT_DRAW_GUESS_FALLBACK,
      ...raw,
      phase,
      drawer,
      guesser,
    };
  }, [rawGameState]);

  // Si la partida está en idle o no inicializada, promover inmediatamente a choosing_word
  useEffect(() => {
    if (!rawGameState?.phase || rawGameState.phase === 'idle') {
      void onUpdateGameState({
        ...gameState,
        phase: 'choosing_word',
        currentRound: gameState.currentRound || 1,
        drawer: gameState.drawer || 'Karla',
        guesser: (gameState.drawer || 'Karla') === 'Karla' ? 'Javier' : 'Karla',
        updatedAt: Date.now(),
      });
    }
  }, [rawGameState?.phase]);

  // Herramientas del dibujante
  const [currentColor, setCurrentColor] = useState<string>(CANVAS_COLORS[0]);
  const [customColors, setCustomColors] = useState<string[]>([]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [currentWidth, setCurrentWidth] = useState<number>(CANVAS_STROKE_WIDTHS[1].width);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isBucket, setIsBucket] = useState<boolean>(false);

  const paletteColors = useMemo(() => {
    const merged: string[] = [];
    for (const col of [...customColors, ...CANVAS_COLORS]) {
      const lower = col.toLowerCase();
      if (!merged.some((existing) => existing.toLowerCase() === lower)) {
        merged.push(col);
      }
    }
    return merged;
  }, [customColors]);

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

  // Reacciones rápidas en vivo sobre el lienzo
  const QUICK_REACTIONS = ['😂', '😍', '🤔', '🔥', '👏'] as const;
  const [floatingReactions, setFloatingReactions] = useState<
    Array<{ id: string; emoji: string; leftPct: number; anim: Animated.Value }>
  >([]);

  const spawnFloatingReaction = useCallback((emoji: string) => {
    const id = `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const anim = new Animated.Value(0);
    const leftPct = 16 + Math.floor(Math.random() * 64);
    setFloatingReactions((prev) => [...prev.slice(-6), { id, emoji, leftPct, anim }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 1350,
      useNativeDriver: true,
    }).start(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
    });
  }, []);

  const handleSendReaction = useCallback(
    (emoji: string) => {
      void triggerGameHaptic('light');
      spawnFloatingReaction(emoji);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji, sender: currentProfile },
      });
    },
    [currentProfile, spawnFloatingReaction]
  );

  // Perfiles reales (foto y apodo actualizado)
  const { getDisplayName, getAvatarUri } = useProfile();
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');
  const karlaAvatar = getAvatarUri('Karla');
  const javierAvatar = getAvatarUri('Javier');

  // Roles calculados
  const drawerProfile: UserProfile = gameState.drawer || (gameState.currentRound % 2 === 1 ? 'Karla' : 'Javier');
  const guesserProfile: UserProfile = drawerProfile === 'Karla' ? 'Javier' : 'Karla';
  const isMeDrawer = currentProfile === drawerProfile;
  const isMeGuesser = currentProfile === guesserProfile;

  const drawerDisplayName = getDisplayName(drawerProfile);
  const guesserDisplayName = getDisplayName(guesserProfile);

  // Guardias de ejecución única
  const isRewardingRef = useRef<boolean>(false);
  const isAdvancingRoundRef = useRef<boolean>(false);
  const previousRoundRef = useRef<number>(gameState.currentRound);

  // Trazos locales (el dibujante conserva su lienzo vivo sin que intentos del adivinador lo regresen atrás)
  const [localStrokes, setLocalStrokes] = useState<DrawStroke[]>(gameState.strokes || []);
  const localStrokesRef = useRef<DrawStroke[]>(localStrokes);
  localStrokesRef.current = localStrokes;
  const strokeSessionKeyRef = useRef<string>(`${gameState.currentRound}_${gameState.phase}`);
  const drawerLastEditAtRef = useRef<number>(0);

  useEffect(() => {
    const nextSessionKey = `${gameState.currentRound}_${gameState.phase}`;
    const sessionChanged = nextSessionKey !== strokeSessionKeyRef.current;
    strokeSessionKeyRef.current = nextSessionKey;

    if (sessionChanged) {
      drawerLastEditAtRef.current = 0;
      setLocalStrokes(gameState.strokes || []);
      return;
    }

    // Si soy quien está dibujando en vivo, NO dejar que un eco viejo o un intento del adivinador pise mis trazos
    if (isMeDrawer && gameState.phase === 'drawing') {
      if (localStrokesRef.current.length === 0 && (gameState.strokes?.length || 0) > 0 && drawerLastEditAtRef.current === 0) {
        setLocalStrokes(gameState.strokes || []);
      }
      return;
    }

    // Para quien observa/adivina o en fin de ronda: fusionar sin perder trazos recibidos en vivo
    if (gameState.phase === 'drawing' && (gameState.strokes?.length || 0) > 0) {
      setLocalStrokes((prev) => {
        const dbStrokes = gameState.strokes || [];
        if (prev.length === 0) return dbStrokes;
        const seen = new Set(dbStrokes.map((s) => s.id));
        const liveOnly = prev.filter((s) => !seen.has(s.id));
        return liveOnly.length > 0 ? [...dbStrokes, ...liveOnly] : dbStrokes;
      });
    } else if (gameState.phase !== 'drawing') {
      setLocalStrokes(gameState.strokes || []);
    }
  }, [gameState.strokes, gameState.currentRound, gameState.phase, isMeDrawer]);

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
  const strokeSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestGameStateRef = useRef<DrawGuessState>(gameState);
  latestGameStateRef.current = gameState;

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
      .on('broadcast', { event: 'reaction' }, ({ payload }: { payload: any }) => {
        if (payload?.emoji) {
          spawnFloatingReaction(payload.emoji);
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
      if (strokeSyncTimerRef.current) {
        clearTimeout(strokeSyncTimerRef.current);
        strokeSyncTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [isMeDrawer, spawnFloatingReaction]);

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

  // Respaldo agrupado (debounced) en DB leyendo siempre localStrokesRef.current
  const scheduleStrokesDbPersist = useCallback(() => {
    if (strokeSyncTimerRef.current) {
      clearTimeout(strokeSyncTimerRef.current);
    }
    strokeSyncTimerRef.current = setTimeout(() => {
      strokeSyncTimerRef.current = null;
      const now = Date.now();
      drawerLastEditAtRef.current = now;
      void onUpdateGameState({
        ...latestGameStateRef.current,
        strokes: localStrokesRef.current,
        strokesUpdatedAt: now,
        updatedAt: now,
      });
    }, 900);
  }, [onUpdateGameState]);

  const handleStrokeEnd = useCallback(
    async (stroke: DrawStroke) => {
      const now = Date.now();
      drawerLastEditAtRef.current = now;
      const nextStrokes = [...localStrokesRef.current, stroke];
      localStrokesRef.current = nextStrokes;
      setLocalStrokes(nextStrokes);
      // Enviar el trazo final en vivo por Broadcast
      channelRef.current?.send({
        type: 'broadcast',
        event: 'stroke_batch',
        payload: {
          strokeId: stroke.id,
          color: stroke.color,
          strokeWidth: stroke.strokeWidth,
          points: stroke.points,
          isEraser: stroke.isEraser,
          isFill: stroke.isFill,
        },
      });
      scheduleStrokesDbPersist();
    },
    [scheduleStrokesDbPersist]
  );

  const handleUndoStroke = useCallback(async () => {
    if (localStrokesRef.current.length === 0) return;
    void triggerGameHaptic('light');
    drawerLastEditAtRef.current = Date.now();
    const next = localStrokesRef.current.slice(0, -1);
    localStrokesRef.current = next;
    setLocalStrokes(next);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_undo', payload: {} });
    scheduleStrokesDbPersist();
  }, [scheduleStrokesDbPersist]);

  const handleClearStrokes = useCallback(async () => {
    if (localStrokesRef.current.length === 0) return;
    void triggerGameHaptic('medium');
    if (strokeSyncTimerRef.current) {
      clearTimeout(strokeSyncTimerRef.current);
      strokeSyncTimerRef.current = null;
    }
    const now = Date.now();
    drawerLastEditAtRef.current = now;
    localStrokesRef.current = [];
    setLocalStrokes([]);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_clear', payload: {} });
    await onUpdateGameState({
      ...latestGameStateRef.current,
      strokes: [],
      strokesUpdatedAt: now,
      updatedAt: now,
    });
  }, [onUpdateGameState]);

  const handleBucketFill = useCallback(
    async (color: string) => {
      void triggerGameHaptic('selection');
      drawerLastEditAtRef.current = Date.now();
      const fillStroke: DrawStroke = {
        id: `fill_${Date.now()}`,
        color,
        strokeWidth: 0,
        points: [],
        isFill: true,
      };
      const next = [...localStrokesRef.current, fillStroke];
      localStrokesRef.current = next;
      setLocalStrokes(next);
      channelRef.current?.send({ type: 'broadcast', event: 'stroke_bucket', payload: { color } });
      scheduleStrokesDbPersist();
    },
    [scheduleStrokesDbPersist]
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
      wordSalt: salt,
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
    } else if (gameState.selectedWordHash && gameState.wordSalt) {
      const guessHash = hashWordWithSalt(rawGuess, gameState.wordSalt);
      isCorrect = guessHash === gameState.selectedWordHash;
      isClose = !isCorrect && (gameState.almostHashes || []).includes(guessHash);
    } else if (gameState.selectedWordHash) {
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

      if (strokeSyncTimerRef.current) {
        clearTimeout(strokeSyncTimerRef.current);
        strokeSyncTimerRef.current = null;
      }

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
        strokes: [],
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

      const freshGs = latestGameStateRef.current;
      await onUpdateGameState({
        ...freshGs,
        phase: isLastRound ? 'game_over' : 'round_end',
        selectedWord: targetWord, // Ahora se revela la palabra
        strokes: isLastRound ? [] : localStrokesRef.current,
        strokesUpdatedAt: Date.now(),
        scoreKarla: nextScoreK,
        scoreJavier: nextScoreJ,
        guesserScoreKarla: nextGuesserK,
        guesserScoreJavier: nextGuesserJ,
        correctGuessesKarla: nextCorrectK,
        correctGuessesJavier: nextCorrectJ,
        roundsHistory: [...(freshGs.roundsHistory || []).map((r) => ({ ...r, strokes: [] })), roundRecord],
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

    const freshGs = latestGameStateRef.current;
    const nextAttempts = [
      { player: currentProfile, guess: rawGuess, timestamp: Date.now(), isClose },
      ...(freshGs.attempts || []),
    ].slice(0, 4);

    await onUpdateGameState({
      ...freshGs,
      attempts: nextAttempts,
      updatedAt: Date.now(),
    });
  };

  // Tiempo agotado sin acierto
  const handleRoundTimeout = async () => {
    void triggerGameHaptic('warning');
    if (strokeSyncTimerRef.current) {
      clearTimeout(strokeSyncTimerRef.current);
      strokeSyncTimerRef.current = null;
    }
    const freshGs = latestGameStateRef.current;
    const targetWord = freshGs.drawerWord || freshGs.selectedWord || 'Palabra';
    const isLastRound = freshGs.currentRound >= 6;

    let matchWinner: UserProfile | 'Empate' | null = null;
    if (isLastRound) {
      if ((freshGs.guesserScoreKarla || 0) > (freshGs.guesserScoreJavier || 0)) matchWinner = 'Karla';
      else if ((freshGs.guesserScoreJavier || 0) > (freshGs.guesserScoreKarla || 0)) matchWinner = 'Javier';
      else matchWinner = 'Empate';
    }

    const roundRecord: DrawGuessRoundRecord = {
      roundNumber: freshGs.currentRound,
      drawer: drawerProfile,
      guesser: guesserProfile,
      word: targetWord,
      difficulty: freshGs.selectedWordDifficulty || 'media',
      category: freshGs.selectedWordCategory || 'General',
      categoryEmoji: freshGs.categoryEmoji || '🎨',
      pointsBase: 0,
      pointsBonus: 0,
      guessed: false,
      usedHint: freshGs.usedHint,
      strokes: [],
    };

    await onUpdateGameState({
      ...freshGs,
      phase: isLastRound ? 'game_over' : 'round_end',
      selectedWord: targetWord,
      strokes: isLastRound ? [] : localStrokesRef.current,
      strokesUpdatedAt: Date.now(),
      roundsHistory: [...(freshGs.roundsHistory || []).map((r) => ({ ...r, strokes: [] })), roundRecord],
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 20}
    >
      {/* ================= 1. MARCADOR COMPACTO UNIFICADO (K vs J + RONDA) ================= */}
      <View style={[styles.compactScoreCard, GAMES_THEME.shadows.card]}>
        {/* Jugador Karlita */}
        <View style={styles.scorePlayerCol}>
          <View style={[styles.miniAvatarCircle, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
            {karlaAvatar ? (
              <Image source={{ uri: karlaAvatar }} style={styles.miniAvatarImg} />
            ) : (
              <Text style={styles.miniAvatarTextKarla}>{karlaName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View>
            <Text style={styles.scorePlayerName}>{karlaName}</Text>
            <Text style={styles.scorePlayerPoints}>{gameState.scoreKarla || 0} pts</Text>
          </View>
        </View>

        {/* Medallón Central: Ronda X de 6 */}
        <View style={styles.roundCenterBadge}>
          <Ionicons name="trophy" size={13} color="#f59e0b" />
          <Text style={styles.roundCenterText}>Ronda {gameState.currentRound || 1} de 6</Text>
        </View>

        {/* Jugador Javier */}
        <View style={[styles.scorePlayerCol, { flexDirection: 'row-reverse' }]}>
          <View style={[styles.miniAvatarCircle, { backgroundColor: '#f0f9ff', borderColor: '#38bdf8' }]}>
            {javierAvatar ? (
              <Image source={{ uri: javierAvatar }} style={styles.miniAvatarImg} />
            ) : (
              <Text style={styles.miniAvatarTextJavier}>{javierName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.scorePlayerName}>{javierName}</Text>
            <Text style={styles.scorePlayerPoints}>{gameState.scoreJavier || 0} pts</Text>
          </View>
        </View>
      </View>

      {/* ================= 2. FILA DE PALABRA / GUIONES + TEMPORIZADOR INTEGRADO ================= */}
      <View style={styles.wordTimerRow}>
        <View style={styles.wordSection}>
          {gameState.phase === 'choosing_word' ? (
            isMeDrawer ? (
              <View style={styles.drawerWordGroup}>
                <Ionicons
                  name="color-palette"
                  size={16}
                  color={primaryColor}
                />
                <Text style={[styles.drawerWordLabel, { color: primaryColor, fontWeight: '800' }]}>
                  ¡ELIGE TU PALABRA!
                </Text>
              </View>
            ) : null
          ) : isMeDrawer ? (
            <View style={styles.drawerWordGroup}>
              <Text style={styles.drawerWordLabel}>DIBUJA:</Text>
              <Text style={[styles.drawerWordHighlight, { color: primaryColor }]} numberOfLines={1}>
                {gameState.drawerWord || gameState.selectedWord || '...'}
              </Text>
            </View>
          ) : (
            <View style={styles.guesserWordGroup}>
              <Text style={styles.guesserDashesText} numberOfLines={1} adjustsFontSizeToFit>
                {activeWordMask}
              </Text>
              {(gameState.wordLength || 0) > 0 && (
                <View style={styles.categoryBadgePill}>
                  <Text style={styles.categoryBadgeText}>
                    {(gameState.wordMask ? gameState.wordMask.replace(/\s+/g, '').length : 0) || gameState.wordLength} letras
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Temporizador integrado: rojo en últimos 10s */}
        <View
          style={[
            styles.integratedTimerPill,
            gameState.phase === 'drawing' && secondsLeft <= 10 && styles.integratedTimerPillWarning,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={gameState.phase === 'drawing' && secondsLeft <= 10 ? '#ef4444' : '#64748b'}
          />
          <Text
            style={[
              styles.integratedTimerText,
              gameState.phase === 'drawing' && secondsLeft <= 10 && styles.integratedTimerTextWarning,
            ]}
          >
            {gameState.phase === 'drawing'
              ? `${secondsLeft}s`
              : isMeDrawer && gameState.phase === 'choosing_word'
              ? `${secondsLeft}s`
              : '--'}
          </Text>
        </View>
      </View>

      {/* ================= 4. LIENZO CUADRADO 1:1 CON CUADRÍCULA TENUE ================= */}
      <View style={styles.canvasAreaWrap}>
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

          {/* Reacciones flotantes en vivo */}
          {floatingReactions.map((item) => (
            <Animated.View
              key={item.id}
              pointerEvents="none"
              style={[
                styles.floatingReactionItem,
                {
                  left: `${item.leftPct}%`,
                  opacity: item.anim.interpolate({
                    inputRange: [0, 0.2, 0.85, 1],
                    outputRange: [0, 1, 1, 0],
                  }),
                  transform: [
                    {
                      translateY: item.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -140],
                      }),
                    },
                    {
                      scale: item.anim.interpolate({
                        inputRange: [0, 0.2, 0.8, 1],
                        outputRange: [0.6, 1.25, 1.05, 0.85],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.floatingReactionText}>{item.emoji}</Text>
            </Animated.View>
          ))}

          {/* Toast sutil de guardado con éxito */}
          {savedSuccessToast && (
            <View style={styles.savedToast}>
              <Ionicons name="checkmark-circle" size={16} color="#15803d" />
              <Text style={styles.savedToastText}>¡Guardado en Recuerdos!</Text>
            </View>
          )}
        </View>
      </View>

      {/* ================= 5. DOCK INFERIOR FIJO ================= */}
      <View style={styles.bottomDockContainer}>
        {isMeDrawer && gameState.phase === 'drawing' ? (
          /* DOCK DEL DIBUJANTE: 2 FILAS */
          <View style={styles.drawerDockCard}>
            {/* Fila 1: Botón Paleta Infinita + tira deslizable de 36+ colores */}
            <View style={styles.colorsPaletteRow}>
              <TouchableOpacity
                onPress={() => {
                  void triggerGameHaptic('selection');
                  setIsColorPickerOpen(true);
                }}
                activeOpacity={0.85}
                style={styles.spectrumTriggerWrap}
                accessibilityLabel="Abrir todos los colores"
              >
                <LinearGradient
                  colors={['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#3b82f6', '#ec4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.spectrumRing}
                >
                  <View
                    style={[
                      styles.spectrumInner,
                      { backgroundColor: currentColor },
                      isLightHexColor(currentColor) && { borderColor: '#cbd5e1', borderWidth: 1 },
                    ]}
                  >
                    <Ionicons
                      name="color-palette"
                      size={13}
                      color={isLightHexColor(currentColor) ? '#0f172a' : '#ffffff'}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorsScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {paletteColors.map((col) => {
                  const isSelected =
                    currentColor.toLowerCase() === col.toLowerCase() && !isEraser && !isBucket;
                  const lightColor = isLightHexColor(col);
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
                        lightColor && styles.colorDotBtnLight,
                        isSelected && styles.colorDotBtnActive,
                      ]}
                      activeOpacity={0.8}
                      accessibilityLabel={`Color ${col}`}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.colorDotInnerWhite,
                            lightColor && { backgroundColor: '#0f172a' },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
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
            {/* Historial de últimos 3 intentos como burbujas */}
            <View style={styles.attemptsHistoryRow}>
              {(gameState.attempts || []).slice(0, 3).map((att, i) => (
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

            {/* Indicador + barra de reacciones rápidas en vivo */}
            <View style={styles.drawingLiveIndicatorRow}>
              <View style={styles.drawingLiveLeft}>
                <Ionicons name="pencil" size={13} color={primaryColor} />
                <Text style={[styles.drawingLiveIndicatorText, { color: primaryColor }]} numberOfLines={1}>
                  {drawerDisplayName} dibuja…
                </Text>
              </View>
              <View style={styles.reactionRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleSendReaction(emoji)}
                    style={styles.reactionChipBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reactionChipText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Input limpio de adivinanza (sin pistas ni spoilers) */}
            <Animated.View style={[styles.inputRowContainer, { transform: [{ translateX: shakeAnim }] }]}>
              <TextInput
                ref={inputRef}
                value={guessInput}
                onChangeText={setGuessInput}
                onSubmitEditing={handleSubmitGuess}
                placeholder="Escribe lo que está dibujando…"
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
        ) : gameState.phase === 'choosing_word' && !isMeDrawer ? (
          /* En fase de elección, el adivinador ve el dock estructurado con input deshabilitado (sin saltos) */
          <View style={styles.guesserDockCard}>
            <View style={styles.drawingLiveIndicatorRow}>
              <View style={styles.drawingLiveLeft}>
                <Ionicons name="time-outline" size={13} color="#94a3b8" />
                <Text style={[styles.drawingLiveIndicatorText, { color: '#64748b' }]} numberOfLines={1}>
                  {drawerDisplayName} está eligiendo…
                </Text>
              </View>
            </View>

            <View style={styles.inputRowContainer}>
              <TextInput
                editable={false}
                placeholder="Esperando palabra…"
                placeholderTextColor="#94a3b8"
                style={[styles.guessBigInput, { backgroundColor: '#f8fafc', color: '#94a3b8' }]}
              />

              <View style={[styles.sendGreenBtn, { backgroundColor: '#cbd5e1' }]}>
                <Ionicons name="lock-closed" size={15} color="#ffffff" />
              </View>
            </View>
          </View>
        ) : (
          /* Estado de espera o fin */
          <View style={styles.dockIdleBox}>
            <View
              style={[
                styles.dockNoticePill,
                {
                  backgroundColor: isMeDrawer ? '#ecfdf5' : '#f0f9ff',
                  borderColor: isMeDrawer ? '#a7f3d0' : '#bae6fd',
                },
              ]}
            >
              <Ionicons
                name={isMeDrawer ? 'brush' : 'search'}
                size={15}
                color={isMeDrawer ? primaryColor : '#0284c7'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dockIdleText,
                  { color: isMeDrawer ? '#065f46' : '#0369a1' },
                ]}
              >
                {gameState.phase === 'choosing_word'
                  ? 'Te toca dibujar · Elige una de las 3 palabras'
                  : gameState.phase === 'round_end'
                  ? `Fin de la ronda ${gameState.currentRound}`
                  : gameState.phase === 'game_over'
                  ? '¡Partida finalizada!'
                  : isMeDrawer
                  ? 'Te toca dibujar'
                  : `Te toca adivinar el dibujo de ${drawerDisplayName}`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ================= OVERLAY: ELECCIÓN DE PALABRA (DIBUJANTE, 15S) ================= */}
      {gameState.phase === 'choosing_word' && isMeDrawer && (
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
      )}

      {/* ================= SPLASH DE INICIO DE RONDA (1.5S) ================= */}
      {showRoundSplash && (
        <Animated.View style={[styles.roundSplashOverlay, { opacity: splashAnim }]}>
          <View style={styles.roundSplashBox}>
            <Text style={styles.roundSplashTitle}>Ronda {gameState.currentRound}</Text>
            <Text style={styles.roundSplashSubtitle}>Dibuja {drawerDisplayName}</Text>
          </View>
        </Animated.View>
      )}

      {/* ================= OVERLAY: FIN DE RONDA (REVELACIÓN + REPLAY) ================= */}
      {gameState.phase === 'round_end' && (
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
              <GameButton
                label={isReplaying ? 'Reproduciendo trazos…' : 'Ver repetición del dibujo'}
                icon="play-circle-outline"
                variant="secondary"
                onPress={handleStartReplay}
              />

              <GameButton
                label={isSavingDrawing ? 'Guardando…' : 'Guardar en Recuerdos'}
                icon="heart"
                variant="secondary"
                disabled={isSavingDrawing}
                onPress={() => void handleSaveDrawingToMemories()}
              />

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
      )}

      {/* ================= OVERLAY: FIN DE PARTIDA (GANADOR Y REVANCHA) ================= */}
      {gameState.phase === 'game_over' && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 40 }}>🏆</Text>
              <Text style={styles.modalTitle}>
                {gameState.winner === 'Empate'
                  ? '¡Empate de Amor!'
                  : `¡Ganó ${gameState.winner === 'Karla' ? karlaName : javierName}!`}
              </Text>
              <Text style={styles.modalSubtitle}>
                {gameState.winner === 'Empate'
                  ? 'Ambos demostraron una sincronía perfecta adivinando.'
                  : `${gameState.winner === 'Karla' ? karlaName : javierName} sumó más puntos adivinando los dibujos.`}
              </Text>
            </View>

            {/* Resumen comparativo */}
            <View style={styles.finalScoreGrid}>
              <View style={[styles.finalScoreCol, { borderColor: '#fbcfe8' }]}>
                <Text style={[styles.finalPlayerName, { color: '#ec4899' }]}>{karlaName}</Text>
                <Text style={styles.finalScorePts}>{gameState.scoreKarla || 0} pts</Text>
                <Text style={styles.finalCorrectText}>
                  {gameState.correctGuessesKarla || 0} {gameState.correctGuessesKarla === 1 ? 'acierto' : 'aciertos'}
                </Text>
              </View>

              <View style={[styles.finalScoreCol, { borderColor: '#bae6fd' }]}>
                <Text style={[styles.finalPlayerName, { color: '#0ea5e9' }]}>{javierName}</Text>
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
      )}
      <ColorSpectrumPickerModal
        visible={isColorPickerOpen}
        initialColor={currentColor}
        recentColors={customColors}
        primaryColor={primaryColor}
        onSelectColor={(hex) => {
          setCurrentColor(hex);
          setIsEraser(false);
          setIsBucket(false);
          if (!CANVAS_COLORS.some((c) => c.toLowerCase() === hex.toLowerCase())) {
            setCustomColors((prev) =>
              [hex, ...prev.filter((p) => p.toLowerCase() !== hex.toLowerCase())].slice(0, 12)
            );
          }
        }}
        onClose={() => setIsColorPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff5f7',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    width: '100%',
  },
  // 1. Tarjeta de Marcador Compacta (ScoreBoard unificada K vs J)
  compactScoreCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scorePlayerCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  miniAvatarImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  miniAvatarTextKarla: {
    fontSize: 13,
    fontWeight: '900',
    color: '#be185d',
  },
  miniAvatarTextJavier: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0369a1',
  },
  scorePlayerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  scorePlayerPoints: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  roundCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  roundCenterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },

  // 2. Fila Integrada de Palabra / Guiones + Temporizador
  wordTimerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    minHeight: 34,
  },
  wordSection: {
    flex: 1,
    justifyContent: 'center',
  },
  drawerWordGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerWordLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  drawerWordHighlight: {
    fontSize: 16,
    fontWeight: '900',
    maxWidth: 160,
  },
  guesserWordGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guesserDashesText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 2.5,
  },
  categoryBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },

  // Temporizador Integrado
  integratedTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  integratedTimerPillWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  integratedTimerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  integratedTimerTextWarning: {
    color: '#ef4444',
  },

  canvasAreaWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  canvasFrame: {
    alignSelf: 'center',
    position: 'relative',
    marginVertical: 2,
    borderRadius: 16,
    overflow: 'hidden',
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
    flexShrink: 0,
    marginTop: 4,
  },
  drawerDockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.card,
  },
  colorsPaletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  spectrumTriggerWrap: {
    flexShrink: 0,
  },
  spectrumRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  spectrumInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  colorsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2,
    paddingRight: 6,
  },
  colorDotBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    ...GAMES_THEME.shadows.soft,
  },
  colorDotBtnLight: {
    borderColor: '#cbd5e1',
  },
  colorDotBtnActive: {
    borderWidth: 2.5,
    borderColor: '#0f172a',
  },
  colorDotInnerWhite: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.card,
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
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  drawingLiveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionChipBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionChipText: {
    fontSize: 13,
  },
  floatingReactionItem: {
    position: 'absolute',
    bottom: 18,
    zIndex: 30,
  },
  floatingReactionText: {
    fontSize: 28,
    textShadowColor: 'rgba(0,0,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  dockNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 9999,
    elevation: 20,
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

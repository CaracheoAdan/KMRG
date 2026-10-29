import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { UserProfile } from '../../types';
import {
  DrawGuessState,
  DrawGuessStroke,
  DrawGuessRoundRecord,
} from '../../types';
import {
  DrawGuessCanvas,
  CANVAS_COLORS,
  CANVAS_STROKE_WIDTHS,
} from './DrawGuessCanvas';
import {
  DrawGuessWord,
  getWordChoicesForRound,
  evaluateGuess,
  normalizeGuess,
} from './drawGuessWords';
import { GameButton } from './common/GameButton';
import { GameHeader } from './common/GameHeader';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { supabase } from '../../config/supabase';
import { SupabaseMediaService } from '../../services/SupabaseMediaService';
import { addLocalMilestone } from '../../services/StorageService';
import { createSupabaseMilestone } from '../../services/SupabaseService';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Dimensión del lienzo para que quepa en cualquier teléfono sin scroll
const CANVAS_SIZE = Math.min(SCREEN_W - 32, Math.floor(SCREEN_H * 0.38), 340);

interface DrawGuessArenaProps {
  currentProfile: UserProfile;
  primaryColor?: string;
  gameState: DrawGuessState;
  onUpdateGameState: (nextState: DrawGuessState) => Promise<void>;
  onFinishGameReward: (winner: UserProfile | 'Empate', points: number) => Promise<void>;
  onBack: () => void;
  onOpenScoreBreakdown?: (player?: 'all' | 'Karla' | 'Javier') => void;
}

export const DrawGuessArena: React.FC<DrawGuessArenaProps> = ({
  currentProfile,
  primaryColor = '#10b981', // Verde Esmeralda oficial
  gameState,
  onUpdateGameState,
  onFinishGameReward,
  onBack,
  onOpenScoreBreakdown,
}) => {
  // Configuración de herramientas del dibujante
  const [currentColor, setCurrentColor] = useState<string>(CANVAS_COLORS[0]);
  const [currentWidth, setCurrentWidth] = useState<number>(CANVAS_STROKE_WIDTHS[1].width);
  const [isEraser, setIsEraser] = useState<boolean>(false);

  // Estado local para el adivinador
  const [guessInput, setGuessInput] = useState<string>('');
  const [almostAlert, setAlmostAlert] = useState<string | null>(null);

  // Replay animado de fin de ronda
  const [replayStrokes, setReplayStrokes] = useState<DrawGuessStroke[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [isSavingDrawing, setIsSavingDrawing] = useState<boolean>(false);

  // Temporizador local sincronizado con gameState.roundDeadline
  const [secondsLeft, setSecondsLeft] = useState<number>(75);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animaciones
  const almostAnim = useRef(new Animated.Value(0)).current;
  const wordRevealAnim = useRef(new Animated.Value(0)).current;

  // Roles de la ronda actual
  const drawerProfile: UserProfile = gameState.drawer || (gameState.currentRound % 2 === 1 ? 'Karla' : 'Javier');
  const guesserProfile: UserProfile = drawerProfile === 'Karla' ? 'Javier' : 'Karla';
  const isMeDrawer = currentProfile === drawerProfile;
  const isMeGuesser = currentProfile === guesserProfile;

  const drawerDisplayName = drawerProfile === 'Karla' ? 'Karlita' : 'Javier';
  const guesserDisplayName = guesserProfile === 'Karla' ? 'Karlita' : 'Javier';

  // 1. SINCRONIZACIÓN EN TIEMPO REAL VÍA SUPABASE BROADCAST CHANNEL
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('kmrg-drawguess-live', {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'stroke_batch' }, ({ payload }: { payload: any }) => {
        if (!isMeDrawer && payload) {
          // El que adivina recibe los trazos en vivo
          const { strokeId, color, strokeWidth, points, isEraser: isE } = payload;
          setLocalStrokes((prev) => {
            const existingIdx = prev.findIndex((s) => s.id === strokeId);
            if (existingIdx >= 0) {
              const updated = [...prev];
              updated[existingIdx] = {
                ...updated[existingIdx],
                points,
              };
              return updated;
            }
            return [
              ...prev,
              {
                id: strokeId,
                color,
                strokeWidth,
                points,
                isEraser: isE,
              },
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isMeDrawer]);

  // Trazos locales combinados (para sincronizar entre batch y estado guardado)
  const [localStrokes, setLocalStrokes] = useState<DrawGuessStroke[]>(gameState.strokes || []);

  useEffect(() => {
    setLocalStrokes(gameState.strokes || []);
  }, [gameState.strokes]);

  // 2. TEMPORIZADOR Y DESCONEXIÓN (PARTE 3)
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

      // En los últimos 10 segundos: vibración suave de urgencia
      if (remaining <= 10 && remaining > 0) {
        void triggerGameHaptic('warning');
      }

      // Auto-revelar primera letra a los 40s de juego (cuando quedan <= 35s)
      if (
        gameState.phase === 'drawing' &&
        remaining <= 35 &&
        !gameState.revealedIndices?.includes(0) &&
        gameState.selectedWord
      ) {
        const nextIndices = Array.from(new Set([...(gameState.revealedIndices || []), 0]));
        void onUpdateGameState({
          ...gameState,
          revealedIndices: nextIndices,
        });
      }

      // Tiempo agotado en selección de palabra (15s)
      if (gameState.phase === 'choosing_word' && remaining <= 0 && isMeDrawer) {
        if (gameState.wordChoices) {
          void handleSelectWord(gameState.wordChoices.medium);
        }
      }

      // Tiempo agotado en dibujo (75s): Ronda finalizada sin acierto
      if (gameState.phase === 'drawing' && remaining <= 0) {
        void handleRoundTimeExpired();
      }
    };

    checkTimer();
    timerIntervalRef.current = setInterval(checkTimer, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState.roundDeadline, gameState.phase, isMeDrawer, gameState.wordChoices]);

  // 3. DETECCIÓN DE PAUSA / SEGUNDO PLANO (>10 segundos)
  useEffect(() => {
    let backgroundTime: number | null = null;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        backgroundTime = Date.now();
      } else if (nextAppState === 'active' && backgroundTime) {
        const elapsed = (Date.now() - backgroundTime) / 1000;
        if (elapsed >= 10 && (gameState.phase === 'drawing' || gameState.phase === 'choosing_word')) {
          // Reanudar con tiempo compensado
          if (gameState.roundDeadline) {
            setSecondsLeft(Math.max(0, Math.ceil((gameState.roundDeadline - Date.now()) / 1000)));
          }
        }
        backgroundTime = null;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [gameState.roundDeadline, gameState.phase]);

  // Iniciar selección de palabra cuando arranca una ronda en 'choosing_word'
  useEffect(() => {
    if (gameState.phase === 'choosing_word' && isMeDrawer && !gameState.wordChoices) {
      void getWordChoicesForRound(gameState.usedWords || []).then((choices) => {
        void onUpdateGameState({
          ...gameState,
          wordChoices: choices,
          roundDeadline: Date.now() + 15 * 1000,
        });
      });
    }
  }, [gameState.phase, isMeDrawer, gameState.wordChoices]);

  // Acción: Dibujante selecciona una palabra
  const handleSelectWord = async (choice: { word: string; difficulty: any; category: string; points: number }) => {
    void triggerGameHaptic('medium');
    const deadline = Date.now() + 75 * 1000;

    await onUpdateGameState({
      ...gameState,
      phase: 'drawing',
      selectedWord: choice.word,
      selectedWordDifficulty: choice.difficulty,
      selectedWordCategory: choice.category,
      wordLength: choice.word.length,
      roundDeadline: deadline,
      strokes: [],
      attempts: [],
      revealedIndices: [],
      usedHint: false,
      roundPoints: choice.points,
      usedWords: [...(gameState.usedWords || []), choice.word],
    });
    setLocalStrokes([]);
  };

  // Emisión de trazos locales en tiempo real
  const handleStrokeBatch = (
    strokeId: string,
    color: string,
    strokeWidth: number,
    points: any[],
    isEraserActive?: boolean
  ) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'stroke_batch',
      payload: { strokeId, color, strokeWidth, points, isEraser: isEraserActive },
    });
  };

  const handleStrokeEnd = async (stroke: DrawGuessStroke) => {
    const nextStrokes = [...localStrokes, stroke];
    setLocalStrokes(nextStrokes);
    await onUpdateGameState({
      ...gameState,
      strokes: nextStrokes,
    });
  };

  const handleUndoStroke = async () => {
    if (localStrokes.length === 0) return;
    void triggerGameHaptic('light');
    const next = localStrokes.slice(0, -1);
    setLocalStrokes(next);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_undo', payload: {} });
    await onUpdateGameState({
      ...gameState,
      strokes: next,
    });
  };

  const handleClearStrokes = async () => {
    if (localStrokes.length === 0) return;
    void triggerGameHaptic('warning');
    setLocalStrokes([]);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_clear', payload: {} });
    await onUpdateGameState({
      ...gameState,
      strokes: [],
    });
  };

  // Acción: Adivinador presiona "Pista"
  const handleUseHint = async () => {
    if (!gameState.selectedWord || gameState.usedHint) return;
    void triggerGameHaptic('light');

    const cleanWord = gameState.selectedWord;
    const currentRevealed = new Set(gameState.revealedIndices || []);
    const unrevealedIndices: number[] = [];

    for (let i = 0; i < cleanWord.length; i++) {
      if (cleanWord[i] !== ' ' && !currentRevealed.has(i)) {
        unrevealedIndices.push(i);
      }
    }

    if (unrevealedIndices.length === 0) return;
    const randomPick = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    const nextRevealed = Array.from(new Set([...(gameState.revealedIndices || []), randomPick]));

    // Reduce puntos de la ronda a la mitad
    const halvedPoints = Math.max(25, Math.round(gameState.roundPoints / 2));

    await onUpdateGameState({
      ...gameState,
      revealedIndices: nextRevealed,
      usedHint: true,
      roundPoints: halvedPoints,
    });
  };

  // Acción: Adivinador envía un intento de respuesta
  const handleSubmitGuess = async () => {
    const rawGuess = guessInput.trim();
    if (!rawGuess || !gameState.selectedWord) return;
    setGuessInput('');

    const target = gameState.selectedWord;
    const evaluation = evaluateGuess(rawGuess, target);

    if (evaluation.isCorrect) {
      // ¡ACIERTO! Puntos cooperativos con bonus de tiempo
      void triggerGameHaptic('success');
      const timeBonus = Math.floor((Math.max(0, secondsLeft) / 75) * 50);
      const totalRoundEarned = (gameState.roundPoints || 50) + timeBonus;

      const guessDuration = Math.max(1, 75 - secondsLeft);

      const roundRecord: DrawGuessRoundRecord = {
        roundNumber: gameState.currentRound,
        drawer: drawerProfile,
        guesser: guesserProfile,
        word: target,
        difficulty: gameState.selectedWordDifficulty || 'media',
        category: gameState.selectedWordCategory || 'General',
        pointsBase: gameState.roundPoints || 50,
        pointsBonus: timeBonus,
        guessed: true,
        guessedAtSecondsLeft: secondsLeft,
        usedHint: gameState.usedHint,
        strokes: localStrokes,
      };

      const isKarlitaGuesser = guesserProfile === 'Karla';
      const nextScoreK = isKarlitaGuesser ? (gameState.scoreKarla || 0) + totalRoundEarned : gameState.scoreKarla || 0;
      const nextScoreJ = !isKarlitaGuesser ? (gameState.scoreJavier || 0) + totalRoundEarned : gameState.scoreJavier || 0;

      const nextGuesserScoreK = isKarlitaGuesser ? (gameState.guesserScoreKarla || 0) + totalRoundEarned : gameState.guesserScoreKarla || 0;
      const nextGuesserScoreJ = !isKarlitaGuesser ? (gameState.guesserScoreJavier || 0) + totalRoundEarned : gameState.guesserScoreJavier || 0;

      const nextCorrectK = isKarlitaGuesser ? (gameState.correctGuessesKarla || 0) + 1 : gameState.correctGuessesKarla || 0;
      const nextCorrectJ = !isKarlitaGuesser ? (gameState.correctGuessesJavier || 0) + 1 : gameState.correctGuessesJavier || 0;

      const nextTimeK = isKarlitaGuesser ? (gameState.totalGuessTimeKarla || 0) + guessDuration : gameState.totalGuessTimeKarla || 0;
      const nextTimeJ = !isKarlitaGuesser ? (gameState.totalGuessTimeJavier || 0) + guessDuration : gameState.totalGuessTimeJavier || 0;

      const isLastRound = gameState.currentRound >= 6;
      let matchWinner: UserProfile | 'Empate' | null = null;
      if (isLastRound) {
        if (nextGuesserScoreK > nextGuesserScoreJ) matchWinner = 'Karla';
        else if (nextGuesserScoreJ > nextGuesserScoreK) matchWinner = 'Javier';
        else matchWinner = 'Empate';
      }

      const nextState: DrawGuessState = {
        ...gameState,
        phase: isLastRound ? 'game_over' : 'round_end',
        scoreKarla: nextScoreK,
        scoreJavier: nextScoreJ,
        guesserScoreKarla: nextGuesserScoreK,
        guesserScoreJavier: nextGuesserScoreJ,
        correctGuessesKarla: nextCorrectK,
        correctGuessesJavier: nextCorrectJ,
        totalGuessTimeKarla: nextTimeK,
        totalGuessTimeJavier: nextTimeJ,
        roundsHistory: [...(gameState.roundsHistory || []), roundRecord],
        winner: matchWinner,
        winsKarla: matchWinner === 'Karla' ? (gameState.winsKarla || 0) + 1 : gameState.winsKarla || 0,
        winsJavier: matchWinner === 'Javier' ? (gameState.winsJavier || 0) + 1 : gameState.winsJavier || 0,
      };

      await onUpdateGameState(nextState);

      if (isLastRound && matchWinner) {
        await onFinishGameReward(matchWinner, Math.max(nextScoreK, nextScoreJ));
      }
      return;
    }

    if (evaluation.isClose) {
      void triggerGameHaptic('warning');
      setAlmostAlert('¡Casi!');
      almostAnim.setValue(0);
      Animated.sequence([
        Animated.spring(almostAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(almostAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setAlmostAlert(null));
    } else {
      void triggerGameHaptic('light');
    }

    // Agregar intento fallido a la lista de chips
    const nextAttempts = [
      { player: currentProfile, guess: rawGuess, timestamp: Date.now() },
      ...(gameState.attempts || []).slice(0, 4),
    ];

    await onUpdateGameState({
      ...gameState,
      attempts: nextAttempts,
    });
  };

  // Ronda finalizada sin acierto al expirar el tiempo
  const handleRoundTimeExpired = async () => {
    void triggerGameHaptic('warning');
    const target = gameState.selectedWord || 'Palabra';

    const roundRecord: DrawGuessRoundRecord = {
      roundNumber: gameState.currentRound,
      drawer: drawerProfile,
      guesser: guesserProfile,
      word: target,
      difficulty: gameState.selectedWordDifficulty || 'media',
      category: gameState.selectedWordCategory || 'General',
      pointsBase: 0,
      pointsBonus: 0,
      guessed: false,
      strokes: localStrokes,
    };

    const isLastRound = gameState.currentRound >= 6;
    let matchWinner: UserProfile | 'Empate' | null = null;
    if (isLastRound) {
      if ((gameState.guesserScoreKarla || 0) > (gameState.guesserScoreJavier || 0)) matchWinner = 'Karla';
      else if ((gameState.guesserScoreJavier || 0) > (gameState.guesserScoreKarla || 0)) matchWinner = 'Javier';
      else matchWinner = 'Empate';
    }

    const nextState: DrawGuessState = {
      ...gameState,
      phase: isLastRound ? 'game_over' : 'round_end',
      roundsHistory: [...(gameState.roundsHistory || []), roundRecord],
      winner: matchWinner,
      winsKarla: matchWinner === 'Karla' ? (gameState.winsKarla || 0) + 1 : gameState.winsKarla || 0,
      winsJavier: matchWinner === 'Javier' ? (gameState.winsJavier || 0) + 1 : gameState.winsJavier || 0,
    };

    await onUpdateGameState(nextState);

    if (isLastRound && matchWinner) {
      await onFinishGameReward(matchWinner, Math.max(gameState.scoreKarla, gameState.scoreJavier));
    }
  };

  // Avanzar a la siguiente ronda
  const handleNextRound = async () => {
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
      selectedWordDifficulty: null,
      selectedWordCategory: null,
      wordLength: 0,
      roundDeadline: null,
      strokes: [],
      attempts: [],
      revealedIndices: [],
      usedHint: false,
    });
    setLocalStrokes([]);
  };

  // Reanudar partida desde cero (Revancha)
  const handleRematch = async () => {
    void triggerGameHaptic('medium');
    await onUpdateGameState({
      ...gameState,
      phase: 'choosing_word',
      currentRound: 1,
      drawer: 'Karla',
      guesser: 'Javier',
      wordChoices: null,
      selectedWord: null,
      selectedWordDifficulty: null,
      selectedWordCategory: null,
      wordLength: 0,
      roundDeadline: null,
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
      totalGuessTimeKarla: 0,
      totalGuessTimeJavier: 0,
      roundsHistory: [],
      winner: null,
    });
    setLocalStrokes([]);
  };

  // Reproducción animada de trazos en fin de ronda
  const handleStartReplay = () => {
    const currentRoundStrokes = gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.strokes || localStrokes;
    if (currentRoundStrokes.length === 0) return;

    setIsReplaying(true);
    setReplayStrokes([]);

    currentRoundStrokes.forEach((st, idx) => {
      setTimeout(() => {
        setReplayStrokes((prev) => [...prev, st]);
        if (idx === currentRoundStrokes.length - 1) {
          setIsReplaying(false);
        }
      }, (idx + 1) * 320);
    });
  };

  // Guardar dibujo en Álbum de Recuerdos
  const handleSaveDrawingToAlbum = async () => {
    if (isSavingDrawing) return;
    setIsSavingDrawing(true);
    try {
      const lastRound = gameState.roundsHistory?.[gameState.roundsHistory.length - 1];
      const wordTitle = lastRound?.word || gameState.selectedWord || 'Dibujo';
      const drawerName = lastRound?.drawer === 'Karla' ? 'Karlita' : 'Javier';
      const memoryTitle = `Dibujo de ${drawerName}: ${wordTitle}`;

      // Generar snapshot SVG simple en base64 para guardarlo en la galería de recuerdos
      const dummySvgDataUri = `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800`;

      const res = await createSupabaseMilestone({
        author: currentProfile,
        title: memoryTitle,
        date: new Date().toISOString().split('T')[0],
        image_url: dummySvgDataUri,
      });

      if (!res.success) {
        await addLocalMilestone({
          author: currentProfile,
          title: memoryTitle,
          date: new Date().toISOString().split('T')[0],
          image_url: dummySvgDataUri,
        });
      }

      void triggerGameHaptic('success');
      Alert.alert('¡Dibujo guardado!', `"${memoryTitle}" quedó guardado en vuestro Álbum de Recuerdos.`);
    } catch {
      Alert.alert('Aviso', 'No se pudo guardar el dibujo en este momento.');
    } finally {
      setIsSavingDrawing(false);
    }
  };

  // Renderizador de las casillas de letras del adivinador
  const renderWordSlots = () => {
    if (!gameState.selectedWord) return null;
    const word = gameState.selectedWord;
    const revealedSet = new Set(gameState.revealedIndices || []);

    return (
      <View style={styles.slotsRow}>
        {word.split('').map((char, idx) => {
          if (char === ' ') {
            return <View key={idx} style={styles.spaceSlot} />;
          }
          const isRevealed = revealedSet.has(idx);
          return (
            <View
              key={idx}
              style={[
                styles.letterSlot,
                { borderColor: isRevealed ? primaryColor : '#cbd5e1', backgroundColor: isRevealed ? '#ecfdf5' : '#ffffff' },
              ]}
            >
              <Text style={[styles.letterSlotText, { color: isRevealed ? primaryColor : '#0f172a' }]}>
                {isRevealed ? char.toUpperCase() : ''}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. HEADER COMPARTIDO */}
      <GameHeader
        title="Dibuja y Adivina"
        icon="brush"
        turnLabel={
          gameState.phase === 'choosing_word'
            ? `${drawerDisplayName} elige palabra`
            : gameState.phase === 'drawing'
            ? isMeDrawer
              ? `Te toca dibujar (${drawerDisplayName})`
              : `Adivina la palabra (${guesserDisplayName})`
            : `Ronda ${gameState.currentRound} de 6`
        }
        isMyTurn={isMeDrawer && gameState.phase === 'drawing'}
        currentTurnPlayer={drawerProfile}
        onBack={onBack}
        onReset={() => void handleRematch()}
        onPressScore={onOpenScoreBreakdown}
        primaryColor={primaryColor}
      />

      {/* 2. BARRA DE ESTADO DE RONDA Y RELOJ */}
      <View style={styles.roundInfoBar}>
        <View style={styles.roundPill}>
          <Text style={styles.roundPillText}>Ronda {gameState.currentRound} de 6</Text>
        </View>

        {gameState.selectedWordCategory && (
          <View style={[styles.catPill, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <Text style={[styles.catPillText, { color: primaryColor }]}>{gameState.selectedWordCategory}</Text>
          </View>
        )}

        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: secondsLeft <= 10 ? '#fee2e2' : '#f1f5f9',
              borderColor: secondsLeft <= 10 ? '#ef4444' : '#cbd5e1',
            },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={secondsLeft <= 10 ? '#ef4444' : '#475569'}
          />
          <Text
            style={[
              styles.timerText,
              { color: secondsLeft <= 10 ? '#ef4444' : '#1e293b' },
            ]}
          >
            {secondsLeft}s
          </Text>
        </View>
      </View>

      {/* Indicación de Rol Única */}
      <View style={styles.roleNoticeWrap}>
        <Text style={styles.roleNoticeText}>
          {isMeDrawer
            ? `🎨 Tú dibujas • ${guesserDisplayName} adivina`
            : `🔍 ${drawerDisplayName} dibuja • Tú adivinas`}
        </Text>
      </View>

      {/* 3. ZONA CENTRAL: LIENZO DE DIBUJO CON ASPECT RATIO FIJO */}
      <View style={[styles.canvasWrapper, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}>
        <DrawGuessCanvas
          strokes={isReplaying ? replayStrokes : localStrokes}
          onStrokeBatch={handleStrokeBatch}
          onStrokeEnd={handleStrokeEnd}
          readOnly={!isMeDrawer || gameState.phase !== 'drawing'}
          currentColor={currentColor}
          currentWidth={currentWidth}
          isEraserActive={isEraser}
        />

        {/* Notificación "¡Casi!" flotante sobre el lienzo */}
        {almostAlert && (
          <Animated.View style={[styles.almostToast, { opacity: almostAnim, transform: [{ scale: almostAnim }] }]}>
            <Text style={styles.almostToastText}>¡Casi! Estás a 1 letra 🤏</Text>
          </Animated.View>
        )}
      </View>

      {/* Chips de intentos recientes del adivinador */}
      {gameState.attempts && gameState.attempts.length > 0 && (
        <View style={styles.attemptsRow}>
          {gameState.attempts.slice(0, 3).map((att, i) => (
            <View key={i} style={styles.attemptChip}>
              <Text style={styles.attemptChipText}>❌ {att.guess}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 4. DOCK INFERIOR ANCLADO (DIBUJANTE VS ADIVINADOR) */}
      <View style={styles.dockContainer}>
        {isMeDrawer && gameState.phase === 'drawing' ? (
          // DOCK DEL DIBUJANTE: Paleta de 8 colores, 3 grosores, borrador, deshacer y limpiar
          <View style={styles.drawerDock}>
            <View style={styles.wordToDrawBadge}>
              <Text style={styles.wordToDrawLabel}>DIBUJA:</Text>
              <Text style={styles.wordToDrawText}>{gameState.selectedWord}</Text>
            </View>

            {/* Paleta de colores */}
            <View style={styles.colorsPaletteRow}>
              {CANVAS_COLORS.map((c) => {
                const isSelected = currentColor === c && !isEraser;
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setCurrentColor(c);
                      setIsEraser(false);
                      void triggerGameHaptic('light');
                    }}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      isSelected && styles.colorDotSelected,
                    ]}
                  />
                );
              })}
            </View>

            {/* Herramientas de grosor, borrador, deshacer y limpiar */}
            <View style={styles.toolsRow}>
              <View style={styles.strokeWidthsGroup}>
                {CANVAS_STROKE_WIDTHS.map((sw) => {
                  const isSelected = currentWidth === sw.width && !isEraser;
                  return (
                    <TouchableOpacity
                      key={sw.id}
                      onPress={() => {
                        setCurrentWidth(sw.width);
                        setIsEraser(false);
                        void triggerGameHaptic('light');
                      }}
                      style={[
                        styles.toolBtn,
                        isSelected && { borderColor: primaryColor, backgroundColor: '#ecfdf5' },
                      ]}
                    >
                      <View
                        style={{
                          width: sw.width * 1.3,
                          height: sw.width * 1.3,
                          borderRadius: 999,
                          backgroundColor: currentColor,
                        }}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionsGroup}>
                <TouchableOpacity
                  onPress={() => {
                    setIsEraser(!isEraser);
                    void triggerGameHaptic('light');
                  }}
                  style={[
                    styles.toolBtn,
                    isEraser && { borderColor: '#ef4444', backgroundColor: '#fee2e2' },
                  ]}
                >
                  <Ionicons name="cut-outline" size={16} color={isEraser ? '#ef4444' : '#475569'} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleUndoStroke} style={styles.toolBtn}>
                  <Ionicons name="arrow-undo-outline" size={16} color="#475569" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleClearStrokes} style={styles.toolBtn}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : isMeGuesser && gameState.phase === 'drawing' ? (
          // DOCK DEL ADIVINADOR: Casillas de letras, pista y campo de texto con teclado protegido
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.guesserDock}>
              {/* Casillas de letras */}
              {renderWordSlots()}

              <View style={styles.inputSendRow}>
                <TouchableOpacity
                  onPress={handleUseHint}
                  disabled={gameState.usedHint}
                  style={[
                    styles.hintBtn,
                    gameState.usedHint && { opacity: 0.5, borderColor: '#cbd5e1' },
                  ]}
                >
                  <Ionicons name="bulb-outline" size={16} color={gameState.usedHint ? '#94a3b8' : '#f59e0b'} />
                  <Text style={[styles.hintBtnText, { color: gameState.usedHint ? '#94a3b8' : '#b45309' }]}>
                    {gameState.usedHint ? 'Pista usada' : 'Pista (-50%)'}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  value={guessInput}
                  onChangeText={setGuessInput}
                  onSubmitEditing={handleSubmitGuess}
                  placeholder="¿Qué crees que es?..."
                  placeholderTextColor="#94a3b8"
                  style={styles.guessTextInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                />

                <TouchableOpacity
                  onPress={handleSubmitGuess}
                  disabled={!guessInput.trim()}
                  style={[styles.sendBtn, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="paper-plane" size={15} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : (
          <View style={styles.statusWaitBox}>
            <Text style={styles.statusWaitText}>
              {gameState.phase === 'choosing_word'
                ? isMeDrawer
                  ? 'Elige una de las 3 palabras arriba...'
                  : `${drawerDisplayName} está eligiendo qué dibujar...`
                : 'Partida en pausa o cambiando de ronda'}
            </Text>
          </View>
        )}
      </View>

      {/* ================= MODAL: ELECCIÓN DE PALABRAS (SOLO DIBUJANTE) ================= */}
      <Modal visible={gameState.phase === 'choosing_word' && isMeDrawer} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="color-palette" size={24} color={primaryColor} />
              <Text style={styles.modalTitle}>¡Te toca dibujar!</Text>
            </View>
            <Text style={styles.modalSubtitle}>Elige una palabra para esta ronda ({secondsLeft}s):</Text>

            {gameState.wordChoices ? (
              <View style={styles.choicesList}>
                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.easy)}
                  style={[styles.choiceCard, { borderColor: '#10b981' }]}
                >
                  <View style={styles.choiceLeft}>
                    <Text style={styles.choiceWord}>{gameState.wordChoices.easy.word}</Text>
                    <Text style={styles.choiceCat}>{gameState.wordChoices.easy.category}</Text>
                  </View>
                  <View style={[styles.choiceBadge, { backgroundColor: '#ecfdf5' }]}>
                    <Text style={[styles.choiceBadgeText, { color: '#059669' }]}>Fácil • 50 pts</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.medium)}
                  style={[styles.choiceCard, { borderColor: '#0284c7' }]}
                >
                  <View style={styles.choiceLeft}>
                    <Text style={styles.choiceWord}>{gameState.wordChoices.medium.word}</Text>
                    <Text style={styles.choiceCat}>{gameState.wordChoices.medium.category}</Text>
                  </View>
                  <View style={[styles.choiceBadge, { backgroundColor: '#f0f9ff' }]}>
                    <Text style={[styles.choiceBadgeText, { color: '#0284c7' }]}>Media • 100 pts</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleSelectWord(gameState.wordChoices!.hard)}
                  style={[styles.choiceCard, { borderColor: '#8b5cf6' }]}
                >
                  <View style={styles.choiceLeft}>
                    <Text style={styles.choiceWord}>{gameState.wordChoices.hard.word}</Text>
                    <Text style={styles.choiceCat}>{gameState.wordChoices.hard.category}</Text>
                  </View>
                  <View style={[styles.choiceBadge, { backgroundColor: '#faf5ff' }]}>
                    <Text style={[styles.choiceBadgeText, { color: '#7c3aed' }]}>Difícil • 150 pts</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>
                Cargando banco de palabras...
              </Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FIN DE RONDA (REVELA PALABRA + REPLAY + GUARDAR DIBUJO) ================= */}
      <Modal visible={gameState.phase === 'round_end'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
              <Text style={styles.modalTitle}>¡Ronda {gameState.currentRound} Finalizada!</Text>
              <Text style={styles.modalSubtitle}>La palabra secreta era:</Text>
              <View style={[styles.revealedWordBadge, { backgroundColor: `${primaryColor}18`, borderColor: primaryColor }]}>
                <Text style={[styles.revealedWordText, { color: primaryColor }]}>
                  {gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.word || gameState.selectedWord}
                </Text>
              </View>
            </View>

            <View style={styles.roundStatsSummary}>
              <View style={styles.roundStatBox}>
                <Text style={styles.roundStatLabel}>Puntos de ronda</Text>
                <Text style={[styles.roundStatVal, { color: primaryColor }]}>
                  +{gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.pointsBase || 0}
                </Text>
              </View>
              <View style={styles.roundStatBox}>
                <Text style={styles.roundStatLabel}>Bonus de tiempo</Text>
                <Text style={[styles.roundStatVal, { color: '#f59e0b' }]}>
                  +{gameState.roundsHistory?.[gameState.roundsHistory.length - 1]?.pointsBonus || 0}
                </Text>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={handleStartReplay}
                disabled={isReplaying}
                style={[styles.secondaryActionBtn, { borderColor: '#cbd5e1' }]}
              >
                <Ionicons name="play-outline" size={15} color="#475569" />
                <Text style={styles.secondaryActionText}>{isReplaying ? 'Reproduciendo...' : 'Repetir trazos'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveDrawingToAlbum}
                disabled={isSavingDrawing}
                style={[styles.secondaryActionBtn, { borderColor: '#f472b6', backgroundColor: '#fdf2f8' }]}
              >
                <Ionicons name="heart" size={15} color="#ec4899" />
                <Text style={[styles.secondaryActionText, { color: '#be185d' }]}>Guardar dibujo</Text>
              </TouchableOpacity>
            </View>

            <GameButton
              label={gameState.currentRound >= 6 ? 'Ver Resultados Finales' : 'Siguiente Ronda'}
              icon="arrow-forward"
              variant="primary"
              size="lg"
              onPress={() => void handleNextRound()}
              style={{ marginTop: 12, width: '100%' }}
            />
          </View>
        </View>
      </Modal>

      {/* ================= MODAL: FIN DE PARTIDA (GANADOR, RESUMEN Y REVANCHA) ================= */}
      <Modal visible={gameState.phase === 'game_over'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 44 }}>🏆</Text>
              <Text style={styles.gameOverTitle}>
                {gameState.winner === 'Empate'
                  ? '¡Empate de Amor!'
                  : `¡Ganó ${gameState.winner === 'Karla' ? 'Karlita' : 'Javier'}!`}
              </Text>
              <Text style={styles.gameOverSubtitle}>
                {gameState.winner === 'Empate'
                  ? 'Ambos demostraron una conexión increíble adivinando.'
                  : `Se corona como el mejor adivinador de la partida.`}
              </Text>
            </View>

            {/* Marcador final */}
            <View style={styles.scoreCompareBox}>
              <View style={styles.playerScoreCol}>
                <Text style={styles.playerScoreName}>Karlita</Text>
                <Text style={[styles.playerScoreNum, { color: '#ec4899' }]}>{gameState.scoreKarla || 0}</Text>
                <Text style={styles.playerAciertosText}>
                  {gameState.correctGuessesKarla || 0} {gameState.correctGuessesKarla === 1 ? 'acierto' : 'aciertos'}
                </Text>
              </View>

              <View style={styles.vsSeparator}>
                <Text style={styles.vsSeparatorText}>VS</Text>
              </View>

              <View style={styles.playerScoreCol}>
                <Text style={styles.playerScoreName}>Javier</Text>
                <Text style={[styles.playerScoreNum, { color: '#0ea5e9' }]}>{gameState.scoreJavier || 0}</Text>
                <Text style={styles.playerAciertosText}>
                  {gameState.correctGuessesJavier || 0} {gameState.correctGuessesJavier === 1 ? 'acierto' : 'aciertos'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 16 }}>
              <GameButton
                label="Revancha"
                icon="refresh"
                variant="primary"
                onPress={() => void handleRematch()}
                style={{ flex: 1 }}
              />
              <GameButton
                label="Volver al Lobby"
                icon="arrow-back"
                variant="secondary"
                onPress={onBack}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff5f7',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  roundInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
  },
  roundPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roundPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  roleNoticeWrap: {
    marginBottom: 6,
  },
  roleNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  canvasWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  almostToast: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#f59e0b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    elevation: 4,
  },
  almostToastText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#b45309',
  },
  attemptsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 16,
  },
  attemptChip: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  attemptChipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748b',
  },
  dockContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  drawerDock: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
  },
  wordToDrawBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  wordToDrawLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  wordToDrawText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  colorsPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 1,
  },
  colorDotSelected: {
    borderColor: '#0f172a',
    transform: [{ scale: 1.25 }],
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strokeWidthsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guesserDock: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
  },
  slotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 10,
  },
  letterSlot: {
    width: 26,
    height: 32,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterSlotText: {
    fontSize: 15,
    fontWeight: '900',
  },
  spaceSlot: {
    width: 10,
  },
  inputSendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 10,
  },
  hintBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  guessTextInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusWaitBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statusWaitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  choicesList: {
    gap: 10,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  choiceLeft: {
    flex: 1,
  },
  choiceWord: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  choiceCat: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  choiceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  choiceBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  revealedWordBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 6,
  },
  revealedWordText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roundStatsSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roundStatBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roundStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  roundStatVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  gameOverTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 6,
  },
  gameOverSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  scoreCompareBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  playerScoreCol: {
    flex: 1,
    alignItems: 'center',
  },
  playerScoreName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },
  playerScoreNum: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  playerAciertosText: {
    fontSize: 11,
    color: '#64748b',
  },
  vsSeparator: {
    paddingHorizontal: 8,
  },
  vsSeparatorText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
  },
});

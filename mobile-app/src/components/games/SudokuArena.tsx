import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { UserProfile } from '../../types';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';

export interface SavedSudokuSession {
  difficulty: 'easy' | 'medium' | 'hard';
  board: number[][];
  solution: number[][];
  fixed: boolean[][];
  notes: Record<string, number[]>;
  mistakes: number;
  completed: boolean;
}

interface Props {
  sudoku: SavedSudokuSession;
  isFull: boolean;
  sudokuCellPx: number;
  primaryColor: string;
  currentProfile: UserProfile;
  isNoteMode: boolean;
  setIsNoteMode: (fn: (prev: boolean) => boolean) => void;
  selectedSudokuCell: [number, number] | null;
  onSelectCell: (r: number, c: number) => void;
  onNumberPress: (num: number) => void;
  onHint: () => void;
  onNewGame: (diff: 'easy' | 'medium' | 'hard') => void;
  isSudokuGameOver: boolean;
}

const { width: SCREEN_W } = Dimensions.get('window');
const MAX_SUDOKU_MISTAKES = 3;

export const SudokuArena: React.FC<Props> = ({
  sudoku,
  currentProfile,
  isNoteMode,
  setIsNoteMode,
  selectedSudokuCell,
  onSelectCell,
  onNumberPress,
  onHint,
  onNewGame,
  isSudokuGameOver,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Temporizador de partida en vivo
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (sudoku.completed || isSudokuGameOver) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sudoku.completed, isSudokuGameOver]);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cálculo de celda exacto para que las líneas 3x3 lleguen 100% al borde
  const availableWidth = Math.min(SCREEN_W - 24, 370);
  const cellSize = Math.floor((availableWidth - 4) / 9);
  const exactGridSize = cellSize * 9 + 4;
  // Números ~25% más pequeños y semibold
  const digitFontSize = Math.floor(cellSize * 0.52);

  // Teclado numérico: ancho explícito por tecla (9 teclas + 8 gaps de 4px)
  const numKeyWidth = Math.floor((exactGridSize - (8 * 4)) / 9);

  // Celdas completadas (X/81)
  const filledCellsCount = useMemo(() => {
    let count = 0;
    sudoku.board.forEach((r) => {
      r.forEach((v) => {
        if (v >= 1 && v <= 9) count++;
      });
    });
    return count;
  }, [sudoku.board]);

  // Contador de dígitos restantes
  const digitCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };
  sudoku.board.forEach((r) => {
    r.forEach((v) => {
      if (v >= 1 && v <= 9) digitCounts[v] = (digitCounts[v] || 0) + 1;
    });
  });

  // Animación shake en error
  useEffect(() => {
    if (sudoku.mistakes > 0) {
      void triggerGameHaptic('error');
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [sudoku.mistakes, shakeAnim]);

  const handleCellSelect = (r: number, c: number) => {
    void triggerGameHaptic('selection');
    onSelectCell(r, c);
  };

  const handleNumClick = (digit: number) => {
    void triggerGameHaptic('light');
    onNumberPress(digit);
  };

  return (
    <View style={styles.container}>
      {/* 1. Barra Superior: Selector de Dificultad + Vidas */}
      <View style={[styles.topBar, { width: exactGridSize }]}>
        <View style={styles.segmentedControl}>
          {[
            { key: 'easy', label: 'Fácil' },
            { key: 'medium', label: 'Medio' },
            { key: 'hard', label: 'Difícil' },
          ].map((d) => {
            const active = sudoku.difficulty === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                onPress={() => {
                  void triggerGameHaptic('selection');
                  onNewGame(d.key as any);
                }}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                accessibilityLabel={`Dificultad ${d.label}`}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vidas Restantes */}
        <View style={styles.mistakesBox}>
          <Text style={styles.mistakesLabel}>Errores:</Text>
          <View style={styles.heartsRow}>
            {Array.from({ length: MAX_SUDOKU_MISTAKES }).map((_, i) => {
              const isLost = i < sudoku.mistakes;
              return (
                <Ionicons
                  key={i}
                  name={isLost ? 'heart-dislike' : 'heart'}
                  size={15}
                  color={isLost ? '#cbd5e1' : '#f43f5e'}
                />
              );
            })}
          </View>
        </View>
      </View>

      {/* 2. Cuadrícula 9x9 con Ajuste Exacto y Líneas 3x3 de Caja Completas */}
      <Animated.View
        style={[
          styles.gridContainer,
          {
            width: exactGridSize,
            height: exactGridSize,
            transform: [{ translateX: shakeAnim }],
          },
          isSudokuGameOver && { opacity: 0.45 },
          GAMES_THEME.shadows.boardDepth,
        ]}
      >
        {sudoku.board.map((row, r) => (
          <View key={r} style={styles.gridRow}>
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
                selR !== undefined && selC !== undefined
                  ? sudoku.board[selR][selC]
                  : 0;
              const isSameNumber = val !== 0 && val === selectedVal;
              const isFixed = sudoku.fixed[r][c];
              const isWrong = val !== 0 && val !== sudoku.solution[r][c];
              const cellNotes = sudoku.notes[`${r}-${c}`] || [];

              const rightThick = (c === 2 || c === 5);
              const bottomThick = (r === 2 || r === 5);

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => handleCellSelect(r, c)}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      borderRightWidth: rightThick ? 2.5 : c === 8 ? 0 : 0.5,
                      borderBottomWidth: bottomThick ? 2.5 : r === 8 ? 0 : 0.5,
                      borderRightColor: rightThick ? '#0284c7' : '#cbd5e1',
                      borderBottomColor: bottomThick ? '#0284c7' : '#cbd5e1',
                      backgroundColor: isSelected
                        ? '#bfdbfe'
                        : isSameNumber
                        ? '#fef08a'
                        : isSameCross
                        ? '#f0f9ff'
                        : '#ffffff',
                    },
                    isSelected && styles.cellSelectedBorder,
                  ]}
                  activeOpacity={0.75}
                >
                  {val !== 0 ? (
                    <Text
                      style={[
                        styles.valText,
                        { fontSize: digitFontSize },
                        isFixed
                          ? styles.fixedDigit
                          : currentProfile === 'Karla'
                          ? styles.karlaDigit
                          : styles.javierDigit,
                        isWrong && styles.wrongDigit,
                      ]}
                    >
                      {val}
                    </Text>
                  ) : cellNotes.length > 0 ? (
                    <Text style={styles.notesText} numberOfLines={2}>
                      {cellNotes.join(' ')}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* 3. Dock Inferior: Herramientas, Teclado 1–9, Progreso y Leyenda */}
      <View style={[styles.bottomDock, { width: exactGridSize }]}>
        {/* Fila de Herramientas */}
        <View style={styles.dockToolsRow}>
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('selection');
              setIsNoteMode((prev) => !prev);
            }}
            style={[
              styles.dockToolBtn,
              isNoteMode && styles.dockToolBtnActive,
            ]}
            accessibilityLabel="Activar notas"
          >
            <Ionicons
              name="pencil"
              size={14}
              color={isNoteMode ? '#ffffff' : '#6366f1'}
            />
            <Text style={[styles.dockToolBtnText, isNoteMode && { color: '#ffffff' }]}>
              {isNoteMode ? 'Notas: ON' : 'Notas'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onNumberPress(0);
            }}
            style={styles.dockToolBtn}
            accessibilityLabel="Borrar celda"
          >
            <Ionicons name="trash-outline" size={14} color="#475569" />
            <Text style={styles.dockToolBtnText}>Borrar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('medium');
              onHint();
            }}
            style={[styles.dockToolBtn, { backgroundColor: '#fef3c7', borderColor: '#fde047' }]}
            accessibilityLabel="Obtener pista mágica"
          >
            <Ionicons name="bulb" size={14} color="#d97706" />
            <Text style={[styles.dockToolBtnText, { color: '#b45309' }]}>Pista (+50)</Text>
          </TouchableOpacity>
        </View>

        {/* Teclado Numérico 1–9 Fijo */}
        {isSudokuGameOver ? (
          <GameButton
            label="¡Perdiste las 3 vidas! Jugar Nuevo Sudoku"
            icon="reload"
            variant="destructive"
            onPress={() => onNewGame(sudoku.difficulty)}
          />
        ) : (
          <View style={styles.numpadContainer}>
            <View style={styles.numpadRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const count = digitCounts[num] || 0;
                const remaining = Math.max(0, 9 - count);
                const isDone = remaining === 0;

                return (
                  <TouchableOpacity
                    key={num}
                    disabled={isDone}
                    onPress={() => handleNumClick(num)}
                    style={[
                      styles.numKey,
                      { width: numKeyWidth },
                      isDone && styles.numKeyDone,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.numKeyDigit, isDone && styles.numKeyDigitDone]}>
                      {num}
                    </Text>
                    <Text style={[styles.remainingCountText, isDone && { color: '#cbd5e1' }]}>
                      {isDone ? '✓' : remaining}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Barra de Progreso (X/81 celdas) y Temporizador */}
        <View style={styles.sudokuProgressCard}>
          <View style={styles.sudokuProgressRow}>
            <View style={styles.timerChip}>
              <Ionicons name="time-outline" size={13} color="#475569" />
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
            </View>

            <View style={styles.cellCountChip}>
              <Ionicons name="grid-outline" size={13} color="#0284c7" />
              <Text style={styles.cellCountText}>{filledCellsCount}/81 celdas</Text>
            </View>
          </View>

          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, (filledCellsCount / 81) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Leyenda Explicativa de Colores */}
        <View style={styles.colorLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1e293b' }]} />
            <Text style={styles.legendText}>Original</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9333ea' }]} />
            <Text style={[styles.legendText, { color: '#9333ea' }]}>Karlita</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#0284c7' }]} />
            <Text style={[styles.legendText, { color: '#0284c7' }]}>Javier</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 2,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    ...GAMES_THEME.shadows.soft,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  mistakesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  mistakesLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#be123c',
  },
  heartsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  gridContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0284c7',
    overflow: 'hidden',
    alignSelf: 'center',
    padding: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelectedBorder: {
    borderWidth: 2,
    borderColor: '#2563eb',
    zIndex: 5,
  },
  valText: {
    fontWeight: '600',
    includeFontPadding: false,
    textAlign: 'center',
  },
  fixedDigit: {
    color: '#1e293b',
  },
  karlaDigit: {
    color: '#9333ea',
  },
  javierDigit: {
    color: '#0284c7',
  },
  wrongDigit: {
    color: '#ef4444',
  },
  notesText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  bottomDock: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  dockToolsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  dockToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.soft,
  },
  dockToolBtnActive: {
    backgroundColor: '#6366f1',
    borderColor: '#4f46e5',
  },
  dockToolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  numpadContainer: {
    width: '100%',
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  numKey: {
    height: 44,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderBottomWidth: 3,
    borderBottomColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  numKeyDone: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderBottomWidth: 1,
    opacity: 0.45,
  },
  numKeyDigit: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 20,
  },
  numKeyDigitDone: {
    color: '#94a3b8',
  },
  remainingCountText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
  },
  sudokuProgressCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
    ...GAMES_THEME.shadows.soft,
  },
  sudokuProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  cellCountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cellCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 2,
  },
  colorLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingTop: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
});

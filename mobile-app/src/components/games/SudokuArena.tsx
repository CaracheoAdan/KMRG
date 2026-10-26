import React, { useRef, useEffect } from 'react';
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

  // Tablero grande aprovechando el ancho disponible
  const availableWidth = Math.min(SCREEN_W - 20, 380);
  const boardSize = availableWidth;
  const cellPx = Math.floor((boardSize - 10) / 9);
  const digitFontSize = Math.floor(cellPx * 0.72); // ~28px de altura nítida

  // Teclado numérico: ancho explícito por tecla (9 teclas + 8 gaps de 4px)
  const numKeyWidth = Math.floor((availableWidth - (8 * 4)) / 9);

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
      {/* 1. Barra Superior: Selector de Dificultad + Vidas + Herramientas */}
      <View style={styles.topBar}>
        {/* Selector Segmented */}
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
                style={[
                  styles.segmentBtn,
                  active && styles.segmentBtnActive,
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentBtnText, active && styles.segmentBtnTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3 Corazones de Vidas */}
        <View style={styles.livesWrapper}>
          {[0, 1, 2].map((lifeIdx) => {
            const alive = lifeIdx < MAX_SUDOKU_MISTAKES - sudoku.mistakes;
            return (
              <Ionicons
                key={lifeIdx}
                name={alive ? 'heart' : 'heart-dislike'}
                size={18}
                color={alive ? '#e11d48' : '#cbd5e1'}
              />
            );
          })}
        </View>

        {/* Herramientas: Lápiz, Borrar, Pista */}
        <View style={styles.toolsRow}>
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('selection');
              setIsNoteMode((prev) => !prev);
            }}
            style={[
              styles.toolBtn,
              isNoteMode && styles.toolBtnActive,
            ]}
            accessibilityLabel="Activar notas"
          >
            <Ionicons
              name="pencil"
              size={17}
              color={isNoteMode ? '#ffffff' : '#475569'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onNumberPress(0);
            }}
            style={styles.toolBtn}
            accessibilityLabel="Borrar celda"
          >
            <Ionicons name="trash-outline" size={17} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('medium');
              onHint();
            }}
            style={[styles.toolBtn, { backgroundColor: '#fef3c7', borderColor: '#fde047' }]}
            accessibilityLabel="Obtener pista mágica"
          >
            <Ionicons name="bulb" size={17} color="#d97706" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Cuadrícula 9x9 con Números Grandes y Nítidos */}
      <Animated.View
        style={[
          styles.gridContainer,
          {
            width: boardSize,
            height: boardSize,
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

              const rightThick = (c + 1) % 3 === 0 && c < 8;
              const bottomThick = (r + 1) % 3 === 0 && r < 8;

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => handleCellSelect(r, c)}
                  style={[
                    styles.cell,
                    {
                      width: cellPx,
                      height: cellPx,
                      borderRightWidth: rightThick ? 2.5 : 0.5,
                      borderBottomWidth: bottomThick ? 2.5 : 0.5,
                      borderRightColor: rightThick ? '#0284c7' : '#e2e8f0',
                      borderBottomColor: bottomThick ? '#0284c7' : '#e2e8f0',
                      backgroundColor: isSelected
                        ? '#bae6fd'
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

      {/* 3. Leyenda de Colores */}
      <View style={styles.colorLegendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#0f172a' }]} />
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

      {/* 4. Teclado Numérico 1–9 Fijo con Botones Robustos (Ancho Explícito, Nunca se Colapsan) */}
      {isSudokuGameOver ? (
        <TouchableOpacity
          onPress={() => onNewGame(sudoku.difficulty)}
          style={styles.gameOverBtn}
        >
          <Ionicons name="refresh-circle" size={20} color="#ffffff" />
          <Text style={styles.gameOverBtnText}>
            ¡Perdiste las 3 vidas! Jugar Nuevo Sudoku
          </Text>
        </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm,
    width: '100%',
    paddingHorizontal: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: GAMES_THEME.radius.sm,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    ...GAMES_THEME.shadows.soft,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#0284c7',
  },
  livesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GAMES_THEME.radius.pill,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  toolBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  gridContainer: {
    backgroundColor: '#ffffff',
    borderRadius: GAMES_THEME.radius.md,
    borderWidth: 2.5,
    borderColor: '#0284c7',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelectedBorder: {
    borderWidth: 2.5,
    borderColor: '#0284c7',
  },
  valText: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },
  fixedDigit: {
    color: '#0f172a',
    fontWeight: '900',
  },
  karlaDigit: {
    color: '#9333ea',
    fontWeight: '900',
  },
  javierDigit: {
    color: '#0284c7',
    fontWeight: '900',
  },
  wrongDigit: {
    color: '#ef4444',
    fontWeight: '900',
  },
  notesText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 11,
  },
  colorLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  numpadContainer: {
    width: '100%',
    marginTop: 4,
    alignItems: 'center',
  },
  numpadRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  numKey: {
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  numKeyDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    opacity: 0.45,
  },
  numKeyDigit: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    includeFontPadding: false,
  },
  numKeyDigitDone: {
    color: '#94a3b8',
  },
  remainingCountText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284c7',
    marginTop: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  gameOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e11d48',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 16,
    width: '100%',
    ...GAMES_THEME.shadows.glowCoral,
  },
  gameOverBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});

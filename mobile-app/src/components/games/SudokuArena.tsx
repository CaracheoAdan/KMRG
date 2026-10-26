import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { UserProfile } from '../../types';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { MatchInfoFooter } from './common/MatchInfoFooter';

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

const MAX_SUDOKU_MISTAKES = 3;

export const SudokuArena: React.FC<Props> = ({
  sudoku,
  isFull,
  sudokuCellPx,
  primaryColor,
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
  const sudokuInputRef = useRef<any>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
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
      {/* Input invisible para teclados de hardware / accesibilidad */}
      <TextInput
        ref={sudokuInputRef}
        value=""
        keyboardType="number-pad"
        caretHidden
        maxLength={1}
        onChangeText={(txt) => {
          const digit = parseInt(txt.slice(-1), 10);
          if (digit >= 1 && digit <= 9) onNumberPress(digit);
        }}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') onNumberPress(0);
        }}
        style={styles.hiddenInput}
      />

      {/* Barra Superior: Selector Segmented de Dificultad + Vidas + Herramientas */}
      <View style={styles.topControls}>
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
                size={16}
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
              setIsNoteMode((n) => !n);
            }}
            style={[styles.toolBtn, isNoteMode && styles.toolBtnActive]}
            accessibilityLabel="Modo Notas / Lápiz"
          >
            <Ionicons
              name="pencil"
              size={14}
              color={isNoteMode ? '#ffffff' : '#475569'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onNumberPress(0);
            }}
            style={styles.toolBtn}
            accessibilityLabel="Borrar número"
          >
            <Ionicons name="backspace-outline" size={15} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('medium');
              onHint();
            }}
            style={[styles.toolBtn, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}
            accessibilityLabel="Pista mágica"
          >
            <Ionicons name="bulb" size={15} color="#d97706" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cuadrícula Nítida 9x9 con Separadores de Caja 3x3 */}
      <Animated.View
        style={[
          styles.gridOuter,
          isSudokuGameOver && { opacity: 0.45 },
          { transform: [{ translateX: shakeAnim }] },
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
                selR !== undefined && selC !== undefined ? sudoku.board[selR][selC] : 0;
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
                      width: sudokuCellPx,
                      height: sudokuCellPx,
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
                        { fontSize: isFull ? 19 : 14 },
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

      {/* Teclado Numérico Táctil con Contador Restante */}
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
                    isDone && styles.numKeyDone,
                  ]}
                  activeOpacity={0.75}
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

      {/* Footer con Racha y Tips de Pareja */}
      {isFull && (
        <MatchInfoFooter
          streakCount={sudoku.difficulty === 'hard' ? 5 : 3}
          gameStatsText={`Sudoku ${sudoku.difficulty.toUpperCase()} • Modo Colaborativo`}
          coupleBanter="Ambos pueden colocar números juntos en tiempo real para resolver el reto ❤️"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
  },
  segmentBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
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
    color: '#0f172a',
    fontWeight: '800',
  },
  livesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: GAMES_THEME.colors.purple,
    borderColor: GAMES_THEME.colors.purple,
  },
  gridOuter: {
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: '#0284c7',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    ...GAMES_THEME.shadows.card,
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
    borderColor: '#0284c7',
    zIndex: 2,
  },
  valText: {
    fontWeight: '800',
  },
  fixedDigit: {
    color: '#0f172a',
    fontWeight: '900',
  },
  karlaDigit: {
    color: GAMES_THEME.colors.karla.text,
  },
  javierDigit: {
    color: GAMES_THEME.colors.javier.text,
  },
  wrongDigit: {
    color: '#ef4444',
    fontWeight: '900',
  },
  notesText: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 9,
  },
  numpadContainer: {
    width: '100%',
    marginTop: 4,
  },
  numpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  numKey: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.soft,
  },
  numKeyDone: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    opacity: 0.45,
  },
  numKeyDigit: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  numKeyDigitDone: {
    color: '#94a3b8',
  },
  remainingCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284c7',
    marginTop: 1,
  },
  gameOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e11d48',
    paddingVertical: 12,
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

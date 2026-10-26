import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { UserProfile } from '../../types';

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

  const digitCounts: Record<number, number> = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
  };
  sudoku.board.forEach((r) => {
    r.forEach((v) => {
      if (v >= 1 && v <= 9) digitCounts[v] = (digitCounts[v] || 0) + 1;
    });
  });

  return (
    <View style={styles.container}>
      {/* Invisible Input for Native Numpad */}
      <TextInput
        ref={sudokuInputRef}
        value=""
        keyboardType="number-pad"
        caretHidden
        maxLength={1}
        onChangeText={(txt) => {
          const digit = parseInt(txt.slice(-1), 10);
          if (digit >= 1 && digit <= 9) {
            onNumberPress(digit);
          }
        }}
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace') {
            onNumberPress(0);
          }
        }}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
        }}
      />

      <View style={styles.topControls}>
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
                onPress={() => onNewGame(d.key as any)}
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

        {/* 3 Lives Indicator */}
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

        <View style={styles.toolsRow}>
          <TouchableOpacity
            onPress={() => setIsNoteMode((n) => !n)}
            style={[
              styles.toolBtn,
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
            onPress={() => onNumberPress(0)}
            style={[styles.toolBtn, isFull && { backgroundColor: '#1e293b' }]}
          >
            <Ionicons
              name="backspace-outline"
              size={14}
              color={isFull ? '#cbd5e1' : '#475569'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onHint}
            style={[
              styles.toolBtn,
              { backgroundColor: isFull ? '#1e293b' : `${primaryColor}18` },
            ]}
          >
            <Ionicons name="bulb" size={14} color={isFull ? '#fde047' : primaryColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid */}
      <View
        style={[
          styles.gridContainer,
          isSudokuGameOver && { opacity: 0.45 },
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

              const rightBorder = (c + 1) % 3 === 0 && c < 8 ? 2 : 0.5;
              const bottomBorder = (r + 1) % 3 === 0 && r < 8 ? 2 : 0.5;

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => onSelectCell(r, c)}
                  style={[
                    styles.cell,
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
                        styles.valText,
                        { fontSize: isFull ? 18 : 14 },
                        isFixed
                          ? { color: '#0f172a', fontWeight: '900' }
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
                        styles.notesText,
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

      {/* Number Pad */}
      {isSudokuGameOver ? (
        <TouchableOpacity
          onPress={() => onNewGame(sudoku.difficulty)}
          style={[styles.gameOverBtn, { backgroundColor: '#e11d48' }]}
        >
          <Ionicons name="refresh-circle" size={18} color="#ffffff" />
          <Text style={styles.gameOverBtnText}>
            ¡Perdiste tus 3 vidas! Jugar Nuevo Sudoku
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
                  onPress={() => onNumberPress(num)}
                  style={[
                    styles.numKey,
                    isDone && { opacity: 0.35, backgroundColor: '#f1f5f9' },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.numKeyDigit, isDone && { color: '#94a3b8' }]}>
                    {num}
                  </Text>
                  <Text style={[styles.numKeyRem, isDone && { color: '#94a3b8' }]}>
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
    gap: 10,
    width: '100%',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  diffPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  diffChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  diffChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  toolBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  gridContainer: {
    borderColor: '#2563eb',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  valText: {},
  notesText: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '600',
  },
  gameOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
  },
  gameOverBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  numpadContainer: {
    width: '100%',
    gap: 6,
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
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  numKeyDigit: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  numKeyRem: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563eb',
  },
});

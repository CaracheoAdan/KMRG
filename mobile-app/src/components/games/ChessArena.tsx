import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';

interface Props {
  chess: GamesState['chess'];
  isFull: boolean;
  chessCellPx: number;
  primaryColor: string;
  isKingInCheck: boolean;
  selectedChessPos: [number, number] | null;
  validChessTargets: [number, number][];
  chessHistoryLength: number;
  onCellPress: (r: number, c: number) => void;
  onUndo: () => void;
  onReset: () => void;
}

const CHESS_SYMBOLS: Record<string, string> = {
  'w-k': '♚',
  'w-q': '♛',
  'w-r': '♜',
  'w-b': '♝',
  'w-n': '♞',
  'w-p': '♟',
  'b-k': '♚',
  'b-q': '♛',
  'b-r': '♜',
  'b-b': '♝',
  'b-n': '♞',
  'b-p': '♟',
};

export const ChessArena: React.FC<Props> = ({
  chess,
  isFull,
  chessCellPx,
  primaryColor,
  isKingInCheck,
  selectedChessPos,
  validChessTargets,
  chessHistoryLength,
  onCellPress,
  onUndo,
  onReset,
}) => {
  const isWinner = !!chess.winner;
  const isWhite = chess.turn === 'w';

  const statusBg = isWinner
    ? '#d1fae5'
    : isWhite
    ? '#f3e8ff'
    : '#e0f2fe';

  const statusBorder = isWinner
    ? '#34d399'
    : isWhite
    ? '#c084fc'
    : '#7dd3fc';

  const statusColor = isWinner
    ? '#059669'
    : isWhite
    ? '#9333ea'
    : '#0284c7';

  return (
    <View style={styles.container}>
      {/* Turn Pill */}
      <View
        style={[
          styles.turnPill,
          { backgroundColor: statusBg, borderColor: statusBorder },
        ]}
      >
        <View style={[styles.turnDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.turnText, { color: statusColor }]}>
          {isWinner
            ? `¡VICTORIA DE ${chess.winner === 'w' ? 'KARLITA' : 'JAVIER'}!`
            : `TURNO: ${isWhite ? 'KARLITA (BLANCAS) 💜' : 'JAVIER (NEGRAS) 💙'}`}
        </Text>
        {isKingInCheck && !isWinner && (
          <View style={styles.checkWarningBadge}>
            <Text style={styles.checkWarningText}>¡JAQUE!</Text>
          </View>
        )}
      </View>

      {/* Chess Board */}
      <View style={styles.boardOuter}>
        {chess.board.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((piece, c) => {
              const isDarkSquare = (r + c) % 2 === 1;
              const isSelected =
                selectedChessPos?.[0] === r && selectedChessPos?.[1] === c;
              const isLastMove =
                (chess.lastMove?.from[0] === r &&
                  chess.lastMove?.from[1] === c) ||
                (chess.lastMove?.to[0] === r &&
                  chess.lastMove?.to[1] === c);
              const isTarget = validChessTargets.some(
                ([tr, tc]) => tr === r && tc === c
              );
              const isKingCheckSquare =
                isKingInCheck &&
                piece &&
                piece.type === 'k' &&
                piece.color === chess.turn;

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => onCellPress(r, c)}
                  style={[
                    styles.square,
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
                        styles.glyph,
                        {
                          fontSize: isFull ? 30 : 23,
                          color: piece.color === 'w' ? '#ffffff' : '#1e293b',
                          textShadowColor:
                            piece.color === 'w'
                              ? 'rgba(0,0,0,0.85)'
                              : 'rgba(255,255,255,0.95)',
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
                        styles.moveIndicator,
                        piece && styles.captureIndicator,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          onPress={onUndo}
          disabled={chessHistoryLength === 0}
          style={[
            styles.secBtn,
            { borderColor: primaryColor },
            chessHistoryLength === 0 && { opacity: 0.4 },
          ]}
        >
          <Ionicons name="arrow-undo" size={14} color={primaryColor} />
          <Text style={[styles.secBtnText, { color: primaryColor }]}>Deshacer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onReset}
          style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
        >
          <Ionicons name="refresh" size={14} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkWarningBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  checkWarningText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  boardOuter: {
    borderColor: '#b45309',
    borderWidth: 3,
    borderRadius: 16,
    backgroundColor: '#b45309',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    lineHeight: 34,
  },
  moveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0284c7aa',
    position: 'absolute',
  },
  captureIndicator: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#ef4444aa',
    backgroundColor: 'transparent',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  secBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

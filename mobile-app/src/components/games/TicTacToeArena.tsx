import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  ticTacToeState: GamesState['ticTacToe'];
  onCellPress: (index: number) => void;
  onNewRound: () => void;
}

export const TicTacToeArena: React.FC<Props> = ({
  boardPx,
  isFull,
  primaryColor,
  ticTacToeState,
  onCellPress,
  onNewRound,
}) => {
  const isWinner = !!ticTacToeState.winner;
  const isDraw = ticTacToeState.winner === 'Empate';
  const isKarla = ticTacToeState.turn === 'Karla';

  const statusBg = isWinner
    ? '#d1fae5'
    : isKarla
    ? '#f3e8ff'
    : '#e0f2fe';

  const statusBorder = isWinner
    ? '#34d399'
    : isKarla
    ? '#c084fc'
    : '#7dd3fc';

  const statusColor = isWinner
    ? '#059669'
    : isKarla
    ? '#9333ea'
    : '#0284c7';

  return (
    <View style={styles.container}>
      {/* Turn Status Pill */}
      <View
        style={[
          styles.turnPill,
          { backgroundColor: statusBg, borderColor: statusBorder },
        ]}
      >
        <View style={[styles.turnDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.turnText, { color: statusColor }]}>
          {isWinner
            ? isDraw
              ? '¡EMPATE! (+40 PTS)'
              : `¡VICTORIA DE ${ticTacToeState.winner === 'Karla' ? 'KARLITA' : 'JAVIER'}! (+150 PTS)`
            : `TURNO: ${isKarla ? 'KARLITA (✕)' : 'JAVIER (○)'}`}
        </Text>
      </View>

      {/* Game Board */}
      <View
        style={[
          styles.board,
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
        {ticTacToeState.board.map((cell, idx) => {
          const isWinningCell = ticTacToeState.winningLine?.includes(idx);
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => onCellPress(idx)}
              style={[
                styles.cell,
                isWinningCell && styles.cellWinning,
              ]}
              activeOpacity={0.8}
            >
              {cell === 'Karla' && (
                <Text
                  style={[
                    styles.piece,
                    {
                      fontSize: isFull ? 54 : 36,
                      color: '#9333ea',
                    },
                  ]}
                >
                  ✕
                </Text>
              )}
              {cell === 'Javier' && (
                <Text
                  style={[
                    styles.piece,
                    {
                      fontSize: isFull ? 54 : 36,
                      color: '#0284c7',
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
        onPress={onNewRound}
        style={[
          styles.actionBtn,
          { backgroundColor: primaryColor },
        ]}
      >
        <Ionicons name="play-forward" size={16} color="#ffffff" />
        <Text style={styles.actionBtnText}>
          {ticTacToeState.winner ? 'Jugar Siguiente Ronda' : 'Reiniciar Ronda'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 14,
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
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  cell: {
    width: '30.5%',
    height: '30.5%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cellWinning: {
    backgroundColor: '#fef08a',
    borderColor: '#eab308',
    borderWidth: 3,
  },
  piece: {
    fontWeight: '900',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    width: '100%',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

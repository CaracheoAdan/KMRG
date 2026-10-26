import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  ticTacToeState: GamesState['ticTacToe'];
  onCellPress: (index: number) => void;
  onNewRound: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const TicTacToeArena: React.FC<Props> = ({
  onCellPress,
  onNewRound,
  ticTacToeState,
}) => {
  const isWinner = !!ticTacToeState.winner;
  const isDraw = ticTacToeState.winner === 'Empate';
  const isKarlaTurn = ticTacToeState.turn === 'Karla';

  // Tablero grande aprovechando el ancho útil con 16px a cada lado
  const boardSize = Math.min(SCREEN_W - 32, 340);

  // Animación de pulso para las celdas ganadoras
  const winPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isWinner && !isDraw) {
      void triggerGameHaptic('success');
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(winPulseAnim, {
            toValue: 1.08,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(winPulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      winPulseAnim.setValue(1);
    }
  }, [isWinner, isDraw, winPulseAnim]);

  const handleCellPress = (idx: number) => {
    if (ticTacToeState.board[idx] || ticTacToeState.winner) return;
    void triggerGameHaptic('selection');
    onCellPress(idx);
  };

  const statusBg = isWinner
    ? '#ecfdf5'
    : isKarlaTurn
    ? '#fdf2f8'
    : '#f0f9ff';

  const statusBorder = isWinner
    ? '#a7f3d0'
    : isKarlaTurn
    ? '#fbcfe8'
    : '#bae6fd';

  const statusColor = isWinner
    ? '#059669'
    : isKarlaTurn
    ? '#be185d'
    : '#0369a1';

  const statusText = isWinner
    ? isDraw
      ? '¡EMPATE DE AMOR! (+40 PTS)'
      : `¡VICTORIA DE ${ticTacToeState.winner === 'Karla' ? 'KARLITA' : 'JAVIER'}! (+150 PTS)`
    : `TURNO: ${isKarlaTurn ? 'KARLITA (✕)' : 'JAVIER (○)'}`;

  return (
    <View style={styles.container}>
      {/* 1. Marcador de Rondas de Pareja con Avatares */}
      <View style={[styles.roundScoreboard, GAMES_THEME.shadows.soft]}>
        <View style={styles.playerScore}>
          <View style={[styles.avatarCircle, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
            <Text style={styles.avatarTxtKarla}>K</Text>
          </View>
          <View>
            <Text style={styles.playerName}>Karlita (✕)</Text>
            <Text style={styles.playerVictories}>
              {ticTacToeState.scoreKarla ?? 0} victorias
            </Text>
          </View>
        </View>

        <View style={styles.roundVsBadge}>
          <Text style={styles.roundVsText}>DUELO</Text>
        </View>

        <View style={[styles.playerScore, { flexDirection: 'row-reverse' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: '#f0f9ff', borderColor: '#38bdf8' }]}>
            <Text style={styles.avatarTxtJavier}>J</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.playerName}>Javier (○)</Text>
            <Text style={styles.playerVictories}>
              {ticTacToeState.scoreJavier ?? 0} victorias
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Pill de Estado de Turno */}
      <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
        <Ionicons
          name={isWinner ? (isDraw ? 'heart-half' : 'trophy') : 'sparkles'}
          size={14}
          color={statusColor}
        />
        <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText}</Text>
      </View>

      {/* 3. Tablero Neón Opción A: Panel Morado Profundo + Vidrio Oscuro + Glow Neón */}
      <LinearGradient
        colors={['#1e1b4b', '#2e1065', '#0f172a']}
        style={[
          styles.boardWrapper,
          {
            width: boardSize,
            height: boardSize,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.boardGrid}>
          {ticTacToeState.board.map((cell, idx) => {
            const isWinningCell = ticTacToeState.winningLine?.includes(idx);

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCellPress(idx)}
                activeOpacity={cell || isWinner ? 1 : 0.7}
                style={[
                  styles.darkGlassCell,
                  isWinningCell && styles.winningGlassCell,
                ]}
              >
                {cell === 'Karla' && (
                  <Animated.View
                    style={[
                      styles.symbolWrap,
                      isWinningCell && { transform: [{ scale: winPulseAnim }] },
                    ]}
                  >
                    <Text style={styles.symbolKarla}>✕</Text>
                  </Animated.View>
                )}

                {cell === 'Javier' && (
                  <Animated.View
                    style={[
                      styles.symbolWrap,
                      isWinningCell && { transform: [{ scale: winPulseAnim }] },
                    ]}
                  >
                    <Text style={styles.symbolJavier}>○</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* 4. Barra de Progreso y Meta de Rondas (Al mejor de 3) */}
      <View style={[styles.roundProgressCard, { width: boardSize }]}>
        <View style={styles.roundProgressHeader}>
          <Text style={styles.roundProgressTitle}>Meta: 3 Victorias para la Copa 🏆</Text>
          <Text style={styles.roundCountLabel}>Ronda {ticTacToeState.round || 1}</Text>
        </View>

        <View style={styles.progressBarTrack}>
          {/* Segmentos de Karla (máx 3) */}
          <View
            style={[
              styles.progressSegmentKarla,
              { width: `${Math.min(100, ((ticTacToeState.scoreKarla || 0) / 3) * 50)}%` },
            ]}
          />
          {/* Segmentos de Javier (máx 3) */}
          <View
            style={[
              styles.progressSegmentJavier,
              { width: `${Math.min(100, ((ticTacToeState.scoreJavier || 0) / 3) * 50)}%` },
            ]}
          />
        </View>

        <View style={styles.historyChipsRow}>
          <View style={styles.historyChip}>
            <View style={[styles.historyDot, { backgroundColor: '#f43f5e' }]} />
            <Text style={styles.historyText}>Karla: {ticTacToeState.scoreKarla || 0}/3</Text>
          </View>
          <View style={styles.historyChip}>
            <View style={[styles.historyDot, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.historyText}>Javier: {ticTacToeState.scoreJavier || 0}/3</Text>
          </View>
        </View>
      </View>

      {/* 5. Dock Inferior: Botón de Acción Principal (Reiniciar Ronda / Siguiente) */}
      <View style={[styles.bottomDock, { width: boardSize }]}>
        <GameButton
          label={isWinner ? 'Jugar Siguiente Ronda' : 'Reiniciar Ronda'}
          icon={isWinner ? 'play-forward' : 'reload'}
          variant={isWinner ? 'primary' : 'secondary'}
          onPress={onNewRound}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm + 2,
    width: '100%',
    paddingHorizontal: GAMES_THEME.spacing.lg,
  },
  roundScoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: GAMES_THEME.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.18)',
  },
  playerScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxtKarla: {
    fontSize: 13,
    fontWeight: '900',
    color: '#db2777',
  },
  avatarTxtJavier: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0284c7',
  },
  playerName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  playerVictories: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  roundVsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  roundVsText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#8b5cf6',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  boardWrapper: {
    borderRadius: GAMES_THEME.radius.xl,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  boardGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  // Casillas de vidrio oscuro (Opción A recomendada: rgba blanco 9%, borde tenue luminoso)
  darkGlassCell: {
    width: '31%',
    height: '31%',
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(192, 132, 252, 0.28)',
  },
  winningGlassCell: {
    backgroundColor: 'rgba(251, 191, 36, 0.22)',
    borderColor: '#f59e0b',
    borderWidth: 2.5,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 6,
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolKarla: {
    fontSize: 52,
    fontWeight: '900',
    color: '#f43f5e',
    textShadowColor: '#f43f5e',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  symbolJavier: {
    fontSize: 52,
    fontWeight: '900',
    color: '#38bdf8',
    textShadowColor: '#38bdf8',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  roundProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
    gap: 8,
    ...GAMES_THEME.shadows.soft,
  },
  roundProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundProgressTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  roundCountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  progressSegmentKarla: {
    height: '100%',
    backgroundColor: '#f43f5e',
    borderRadius: 4,
  },
  progressSegmentJavier: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  historyChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  bottomDock: {
    width: '100%',
    marginTop: 2,
  },
});

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
import { MatchInfoFooter } from './common/MatchInfoFooter';

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

      {/* 3. Tablero Neón Elegante: Marco Púrpura Profundo con Celdas Blancas Elevadas */}
      <LinearGradient
        colors={GAMES_THEME.gradients.tictactoeNeon}
        style={[
          styles.boardWrapper,
          {
            width: boardSize,
            height: boardSize,
          },
          GAMES_THEME.shadows.boardDepth,
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
                activeOpacity={cell || isWinner ? 1 : 0.75}
                style={[
                  styles.cleanElevatedCell,
                  isWinningCell && styles.winningElevatedCell,
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

      {/* 4. Botón de Acción Principal (Reiniciar Ronda / Siguiente) */}
      <View style={{ width: '100%', maxWidth: boardSize, marginTop: 4 }}>
        <GameButton
          label={isWinner ? 'Jugar Siguiente Ronda' : 'Reiniciar Ronda'}
          icon={isWinner ? 'play-forward' : 'reload'}
          variant={isWinner ? 'primary' : 'secondary'}
          onPress={onNewRound}
        />
      </View>

      {/* 5. Footer con Racha y Tips */}
      <MatchInfoFooter
        scoreKarla={ticTacToeState.scoreKarla}
        scoreJavier={ticTacToeState.scoreJavier}
        streakCount={5}
        gameTip="¡El clásico duelo de 3 en raya! El que gane 3 rondas elige qué cenar hoy."
      />
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
    borderWidth: 2.5,
    borderColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
  },
  // Casillas elevadas limpias, SIN cuadrados oscuros ni puntos vacíos
  cleanElevatedCell: {
    width: '31%',
    height: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    ...GAMES_THEME.shadows.card,
  },
  winningElevatedCell: {
    backgroundColor: '#fef08a',
    borderColor: '#f59e0b',
    borderWidth: 3,
    ...GAMES_THEME.shadows.glowCoral,
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolKarla: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f43f5e',
    textShadowColor: 'rgba(244, 63, 94, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  symbolJavier: {
    fontSize: 48,
    fontWeight: '900',
    color: '#0ea5e9',
    textShadowColor: 'rgba(14, 165, 233, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});

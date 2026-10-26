import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
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
    : isKarla
    ? '#fdf2f8'
    : '#f0f9ff';

  const statusBorder = isWinner
    ? '#a7f3d0'
    : isKarla
    ? '#fbcfe8'
    : '#bae6fd';

  const statusColor = isWinner
    ? '#059669'
    : isKarla
    ? GAMES_THEME.colors.karla.text
    : GAMES_THEME.colors.javier.text;

  const statusText = isWinner
    ? isDraw
      ? '¡EMPATE AMOROSO! (+40 PTS)'
      : `¡VICTORIA DE ${ticTacToeState.winner === 'Karla' ? 'KARLITA' : 'JAVIER'}! (+150 PTS)`
    : `TURNO: ${isKarla ? 'KARLITA (✕)' : 'JAVIER (○)'}`;

  return (
    <View style={styles.container}>
      {/* Pill de Estado con Gradiente y Micro-indicador */}
      <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
        <Ionicons
          name={isWinner ? (isDraw ? 'heart-half' : 'trophy') : 'sparkles'}
          size={14}
          color={statusColor}
        />
        <Text style={[styles.statusPillText, { color: statusColor }]}>{statusText}</Text>
      </View>

      {/* Tablero Neón Elevado con Sombra Suave y Glassmorphism */}
      <LinearGradient
        colors={isFull ? ['#1e1b4b', '#0f172a'] : ['#f8fafc', '#f1f5f9']}
        style={[
          styles.boardWrapper,
          {
            width: boardPx,
            height: boardPx,
            borderColor: isFull ? 'rgba(139, 92, 246, 0.4)' : '#e2e8f0',
          },
          isFull ? GAMES_THEME.shadows.glowPurple : GAMES_THEME.shadows.card,
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
                  styles.cellTouch,
                  isFull && styles.cellTouchDark,
                  isWinningCell && (isFull ? styles.winningCellDark : styles.winningCellLight),
                ]}
              >
                {cell === 'Karla' && (
                  <Animated.View
                    style={[
                      styles.symbolWrap,
                      isWinningCell && { transform: [{ scale: winPulseAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.symbolKarla,
                        { fontSize: isFull ? 48 : 34 },
                      ]}
                    >
                      ✕
                    </Text>
                  </Animated.View>
                )}

                {cell === 'Javier' && (
                  <Animated.View
                    style={[
                      styles.symbolWrap,
                      isWinningCell && { transform: [{ scale: winPulseAnim }] },
                    ]}
                  >
                    <Text
                      style={[
                        styles.symbolJavier,
                        { fontSize: isFull ? 48 : 34 },
                      ]}
                    >
                      ○
                    </Text>
                  </Animated.View>
                )}

                {/* Sutil brillo al estar vacía en turno */}
                {!cell && !isWinner && (
                  <View style={styles.emptyGhostIndicator} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* Botón de Acción Principal */}
      <View style={{ width: '100%', maxWidth: boardPx }}>
        <GameButton
          label={isWinner ? 'Jugar Siguiente Ronda' : 'Reiniciar Ronda'}
          icon={isWinner ? 'play-forward' : 'reload'}
          variant={isWinner ? 'primary' : 'secondary'}
          onPress={onNewRound}
        />
      </View>

      {/* Espacio Inferior Aprovechado: Marcador, Racha y Tips de Pareja */}
      {isFull && (
        <View style={{ width: '100%', maxWidth: boardPx }}>
          <MatchInfoFooter
            scoreKarla={ticTacToeState.scoreKarla}
            scoreJavier={ticTacToeState.scoreJavier}
            streakCount={4}
            gameStatsText="El clásico duelo de rapidez mental y amor 💖"
            coupleBanter="¡El que pierda este juego debe darle un masaje de 5 minutos al ganador! 💆"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  boardWrapper: {
    borderRadius: 28,
    padding: 10,
    borderWidth: 2,
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
  cellTouch: {
    width: '31%',
    height: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cellTouchDark: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.25,
  },
  winningCellLight: {
    backgroundColor: '#fef08a',
    borderColor: '#eab308',
    borderWidth: 3,
  },
  winningCellDark: {
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
    borderColor: '#facc15',
    borderWidth: 3,
    shadowColor: '#facc15',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 6,
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolKarla: {
    fontWeight: '900',
    color: GAMES_THEME.colors.karla.primary,
    textShadowColor: 'rgba(236, 72, 153, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  symbolJavier: {
    fontWeight: '900',
    color: GAMES_THEME.colors.javier.primary,
    textShadowColor: 'rgba(14, 165, 233, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  emptyGhostIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.25)',
  },
});

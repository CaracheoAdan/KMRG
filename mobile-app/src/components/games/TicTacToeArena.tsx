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
import Svg, { Line } from 'react-native-svg';
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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const TicTacToeArena: React.FC<Props> = ({
  onCellPress,
  onNewRound,
  ticTacToeState,
}) => {
  const isWinner = !!ticTacToeState.winner;
  const isDraw = ticTacToeState.winner === 'Empate';

  // Calibración multi-pantalla responsiva (360x640, 390x844 y 412x915)
  // Cálculo exacto con descuento de padding y gaps para que nunca se desborde ni se envuelva en 2 columnas
  const maxBoardH = Math.floor(SCREEN_H * 0.44);
  const maxBoardW = Math.min(SCREEN_W - 28, 360);
  const boardSize = Math.min(maxBoardW, maxBoardH);
  const boardPadding = 10;
  const cellGap = 8;
  const innerAvailable = boardSize - (boardPadding * 2) - (cellGap * 2);
  const cellSize = Math.floor(innerAvailable / 3);
  const exactBoardPx = (cellSize * 3) + (cellGap * 2) + (boardPadding * 2);

  // Animación de pulso para las celdas ganadoras
  const winPulseAnim = useRef(new Animated.Value(1)).current;
  const lineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWinner && !isDraw) {
      void triggerGameHaptic('success');
      Animated.timing(lineAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(winPulseAnim, {
            toValue: 1.1,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(winPulseAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      winPulseAnim.setValue(1);
      lineAnim.setValue(0);
    }
  }, [isWinner, isDraw, winPulseAnim, lineAnim]);

  const handleCellPress = (idx: number) => {
    if (ticTacToeState.board[idx] || ticTacToeState.winner) return;
    void triggerGameHaptic('selection');
    onCellPress(idx);
  };

  const scoreK = ticTacToeState.scoreKarla || 0;
  const scoreJ = ticTacToeState.scoreJavier || 0;

  // Coordenadas milimétricas para la línea ganadora animada
  const getLineCoordinates = () => {
    const line = ticTacToeState.winningLine;
    if (!line || line.length < 3) return null;

    const cellCenters = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => {
      const r = Math.floor(idx / 3);
      const c = idx % 3;
      return {
        x: boardPadding + c * (cellSize + cellGap) + cellSize / 2,
        y: boardPadding + r * (cellSize + cellGap) + cellSize / 2,
      };
    });

    const start = cellCenters[line[0]];
    const end = cellCenters[line[2]];
    return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
  };

  const winLineCoords = getLineCoordinates();

  return (
    <View style={styles.container}>
      {/* 1. Tarjeta ÚNICA Unificada: Marcador de Pareja + Meta de 3 Victorias + Barra de Progreso */}
      <View style={[styles.unifiedScoreCard, { width: boardSize }, GAMES_THEME.shadows.card]}>
        <View style={styles.scoreRow}>
          {/* Jugador Karlita */}
          <View style={styles.playerInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
              <Text style={styles.avatarTxtKarla}>K</Text>
            </View>
            <View>
              <Text style={styles.playerName}>Karlita (✕)</Text>
              <Text style={styles.playerVictories}>
                {scoreK === 1 ? '1 victoria' : `${scoreK} victorias`}
              </Text>
            </View>
          </View>

          {/* Medallón central de Ronda y Copa */}
          <View style={styles.centerMatchBadge}>
            <Ionicons name="trophy" size={14} color="#f59e0b" />
            <Text style={styles.centerMatchText}>Ronda {ticTacToeState.round || 1}</Text>
          </View>

          {/* Jugador Javier */}
          <View style={[styles.playerInfo, { flexDirection: 'row-reverse' }]}>
            <View style={[styles.avatarCircle, { backgroundColor: '#f0f9ff', borderColor: '#38bdf8' }]}>
              <Text style={styles.avatarTxtJavier}>J</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.playerName}>Javier (○)</Text>
              <Text style={styles.playerVictories}>
                {scoreJ === 1 ? '1 victoria' : `${scoreJ} victorias`}
              </Text>
            </View>
          </View>
        </View>

        {/* Carrera Hacia la Meta: 2 Barras Independientes de 3 Bloques */}
        <View style={styles.raceProgressContainer}>
          <View style={styles.raceProgressRow}>
            {/* Karlita: 3 Bloques a la Izquierda */}
            <View style={styles.playerProgressGroup}>
              <View style={styles.playerProgressLabelRow}>
                <Text style={[styles.playerProgressName, { color: '#be185d' }]}>Karlita</Text>
                <Text style={styles.playerProgressScore}>{scoreK}/3</Text>
              </View>
              <View style={styles.blocksTrack}>
                {[0, 1, 2].map((idx) => {
                  const isWon = idx < scoreK;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.raceBlock,
                        isWon ? styles.raceBlockKarlaWon : styles.raceBlockEmpty,
                      ]}
                    />
                  );
                })}
              </View>
            </View>

            {/* Divisor Central: Meta 3 */}
            <View style={styles.raceMetaBadge}>
              <Ionicons name="trophy" size={13} color="#f59e0b" />
              <Text style={styles.raceMetaBadgeText}>Meta: 3</Text>
            </View>

            {/* Javier: 3 Bloques a la Derecha */}
            <View style={[styles.playerProgressGroup, { alignItems: 'flex-end' }]}>
              <View style={styles.playerProgressLabelRow}>
                <Text style={styles.playerProgressScore}>{scoreJ}/3</Text>
                <Text style={[styles.playerProgressName, { color: '#0369a1' }]}>Javier</Text>
              </View>
              <View style={[styles.blocksTrack, { justifyContent: 'flex-end' }]}>
                {[2, 1, 0].map((idx) => {
                  const isWon = idx < scoreJ;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.raceBlock,
                        isWon ? styles.raceBlockJavierWon : styles.raceBlockEmpty,
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Banner de Resultado de Victoria / Empate (Solo al finalizar) */}
      {isWinner && (
        <View
          style={[
            styles.victoryBanner,
            { width: boardSize },
            isDraw ? styles.drawBannerBg : styles.winBannerBg,
          ]}
        >
          <Ionicons
            name={isDraw ? 'heart-half' : 'sparkles'}
            size={16}
            color={isDraw ? '#64748b' : '#059669'}
          />
          <Text
            style={[
              styles.victoryBannerText,
              { color: isDraw ? '#334155' : '#065f46' },
            ]}
          >
            {isDraw
              ? '¡Empate con amor! Ambos juegan increíble (+40 pts)'
              : `¡Victoria de ${ticTacToeState.winner === 'Karla' ? 'Karlita' : 'Javier'}! (+150 pts)`}
          </Text>
        </View>
      )}

      {/* 3. Tablero Neón: Vidrio Oscuro + 3 Filas Explícitas (Sin wrap de 2 columnas) */}
      <View style={styles.boardCenterHolder}>
        <LinearGradient
          colors={['#1e1b4b', '#2e1065', '#0f172a']}
          style={[
            styles.boardWrapper,
            {
              width: exactBoardPx,
              height: exactBoardPx,
              padding: boardPadding,
            },
            GAMES_THEME.shadows.boardDepth,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.boardGrid, { gap: cellGap }]}>
            {[0, 1, 2].map((r) => (
              <View key={r} style={[styles.gridRow, { gap: cellGap }]}>
                {[0, 1, 2].map((c) => {
                  const idx = r * 3 + c;
                  const cell = ticTacToeState.board[idx];
                  const isWinningCell = ticTacToeState.winningLine?.includes(idx);

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleCellPress(idx)}
                      activeOpacity={cell || isWinner ? 1 : 0.75}
                      style={[
                        styles.darkGlassCell,
                        { width: cellSize, height: cellSize },
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
                          <Text style={[styles.symbolKarla, { fontSize: Math.floor(cellSize * 0.54) }]}>✕</Text>
                        </Animated.View>
                      )}

                      {cell === 'Javier' && (
                        <Animated.View
                          style={[
                            styles.symbolWrap,
                            isWinningCell && { transform: [{ scale: winPulseAnim }] },
                          ]}
                        >
                          <Text style={[styles.symbolJavier, { fontSize: Math.floor(cellSize * 0.56) }]}>○</Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Línea Ganadora Animada */}
          {winLineCoords && (
            <Svg
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            >
              <Line
                x1={winLineCoords.x1}
                y1={winLineCoords.y1}
                x2={winLineCoords.x2}
                y2={winLineCoords.y2}
                stroke="#facc15"
                strokeWidth={5}
                strokeLinecap="round"
              />
            </Svg>
          )}
        </LinearGradient>
      </View>

      {/* 4. Dock Inferior: Botón de Acción Principal Unificado */}
      <View style={[styles.bottomDock, { width: exactBoardPx }]}>
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
    gap: 12,
    width: '100%',
    paddingHorizontal: 12,
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  unifiedScoreCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
    fontSize: 14,
    fontWeight: '900',
    color: '#be185d',
  },
  avatarTxtJavier: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  playerVictories: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
  },
  centerMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  centerMatchText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#92400e',
  },
  raceProgressContainer: {
    width: '100%',
    paddingTop: 4,
  },
  raceProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  playerProgressGroup: {
    flex: 1,
    gap: 3,
  },
  playerProgressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerProgressName: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  playerProgressScore: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  blocksTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  raceBlock: {
    flex: 1,
    height: 7,
    borderRadius: 3.5,
  },
  raceBlockEmpty: {
    backgroundColor: '#f1f5f9',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  raceBlockKarlaWon: {
    backgroundColor: '#ec4899',
  },
  raceBlockJavierWon: {
    backgroundColor: '#0ea5e9',
  },
  raceMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  raceMetaBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#92400e',
  },
  victoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  winBannerBg: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  drawBannerBg: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  victoryBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  boardCenterHolder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  boardWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(216, 180, 254, 0.3)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  boardGrid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkGlassCell: {
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winningGlassCell: {
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
    borderColor: '#facc15',
    borderWidth: 2,
  },
  symbolWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolKarla: {
    fontSize: 48,
    fontWeight: '900',
    color: '#f43f5e',
    textShadowColor: 'rgba(244, 63, 94, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  symbolJavier: {
    fontSize: 48,
    fontWeight: '900',
    color: '#06b6d4',
    textShadowColor: 'rgba(6, 182, 212, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  bottomDock: {
    paddingTop: 2,
  },
});

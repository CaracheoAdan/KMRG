import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';
import { useProfile } from '../../contexts/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  ticTacToeState: GamesState['ticTacToe'];
  onCellPress: (index: number) => void;
  onNewRound: () => void;
  onToggleInfiniteMode?: () => void;
}

/**
 * Ficha vectorial animada (Neón X/O o Amor Corazón/Estrella) con entrada elástica.
 */
const TicTacToeMarkSvg: React.FC<{
  owner: 'Karla' | 'Javier';
  themeMode: 'neon' | 'love';
  size: number;
  isWinning?: boolean;
  isVanishing?: boolean;
  winPulseAnim: Animated.Value;
}> = ({ owner, themeMode, size, isWinning, isVanishing, winPulseAnim }) => {
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entryAnim.setValue(0);
    Animated.spring(entryAnim, {
      toValue: 1,
      friction: 6,
      tension: 110,
      useNativeDriver: true,
    }).start();
  }, [owner, themeMode, entryAnim]);

  const svgSize = Math.floor(size * 0.58);
  const scaleTransform = isWinning
    ? Animated.multiply(entryAnim, winPulseAnim)
    : entryAnim;

  return (
    <Animated.View
      style={[
        styles.symbolWrap,
        {
          opacity: isVanishing ? 0.52 : entryAnim,
          transform: [{ scale: scaleTransform }],
        },
      ]}
    >
      <Svg width={svgSize} height={svgSize} viewBox="0 0 64 64">
        {themeMode === 'neon' ? (
          owner === 'Karla' ? (
            <>
              <Line
                x1="14"
                y1="14"
                x2="50"
                y2="50"
                stroke="rgba(244, 63, 94, 0.35)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <Line
                x1="50"
                y1="14"
                x2="14"
                y2="50"
                stroke="rgba(244, 63, 94, 0.35)"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <Line
                x1="14"
                y1="14"
                x2="50"
                y2="50"
                stroke="#fb7185"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <Line
                x1="50"
                y1="14"
                x2="14"
                y2="50"
                stroke="#fb7185"
                strokeWidth="7"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
              <Circle
                cx="32"
                cy="32"
                r="20"
                fill="none"
                stroke="rgba(6, 182, 212, 0.32)"
                strokeWidth="12"
              />
              <Circle
                cx="32"
                cy="32"
                r="20"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="7"
              />
            </>
          )
        ) : owner === 'Karla' ? (
          <>
            <Path
              d="M32 54 C18 44 8 34 8 22 C8 13.5 14.8 8 22 8 C26.6 8 30.2 10.4 32 14 C33.8 10.4 37.4 8 42 8 C49.2 8 56 13.5 56 22 C56 34 46 44 32 54 Z"
              fill="#f43f5e"
              stroke="#fda4af"
              strokeWidth="2.5"
            />
            <Path
              d="M17 17 C15 19.5 14.5 23 16 26"
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <Path
              d="M32 6 L39.5 22.5 L57.5 24.8 L44.2 37.2 L47.8 55 L32 46.2 L16.2 55 L19.8 37.2 L6.5 24.8 L24.5 22.5 Z"
              fill="#38bdf8"
              stroke="#bae6fd"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <Circle cx="28" cy="24" r="3" fill="rgba(255,255,255,0.6)" />
          </>
        )}
      </Svg>
    </Animated.View>
  );
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export const TicTacToeArena: React.FC<Props> = ({
  onCellPress,
  onNewRound,
  onToggleInfiniteMode,
  ticTacToeState,
}) => {
  const { getDisplayName, getAvatarUri } = useProfile();
  const { colors, isDark } = useTheme();
  const karlaAvatarUri = getAvatarUri('Karla');
  const javierAvatarUri = getAvatarUri('Javier');
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');
  const isWinner = !!ticTacToeState.winner;
  const isDraw = ticTacToeState.winner === 'Empate';
  const isInfinite = !!ticTacToeState.infiniteMode;
  const [symbolTheme, setSymbolTheme] = useState<'neon' | 'love'>('neon');

  const activeTurnOrder = (ticTacToeState.moveOrder || []).filter(
    (pos) => ticTacToeState.board[pos] === ticTacToeState.turn
  );
  const aboutToVanishIdx =
    isInfinite && !isWinner && activeTurnOrder.length >= 3 ? activeTurnOrder[0] : -1;

  // Calibración multi-pantalla responsiva (360x640, 390x844 y 412x915)
  // Cálculo exacto con descuento de padding y gaps para que nunca se desborde ni se envuelva en 2 columnas
  const maxBoardH = Math.floor(SCREEN_H * 0.40);
  const maxBoardW = Math.min(SCREEN_W - 28, 350);
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
      {/* 1. Tarjeta Bento Unificada: Marcador de Pareja con Fotos Reales + Meta de 3 Victorias */}
      <LinearGradient
        colors={isDark ? [colors.surface, colors.surfaceAlt] : [colors.primaryLight, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.unifiedScoreCard, { width: boardSize, borderColor: colors.border }, GAMES_THEME.shadows.card]}
      >
        <View style={styles.scoreRow}>
          {/* Jugador Karlita */}
          <View style={styles.playerInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
              {karlaAvatarUri ? (
                <Image source={{ uri: karlaAvatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarTxtKarla}>{karlaName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                {karlaName} (✕)
              </Text>
              <Text style={[styles.playerVictories, { color: colors.textSecondary }]}>
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
              {javierAvatarUri ? (
                <Image source={{ uri: javierAvatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarTxtJavier}>{javierName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
                {javierName} (○)
              </Text>
              <Text style={[styles.playerVictories, { color: colors.textSecondary }]}>
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
                <Text style={[styles.playerProgressName, { color: '#be185d' }]} numberOfLines={1}>
                  {karlaName}
                </Text>
                <Text style={[styles.playerProgressScore, { color: colors.textSecondary }]}>{scoreK}/3</Text>
              </View>
              <View style={styles.blocksTrack}>
                {[0, 1, 2].map((idx) => {
                  const isWon = idx < scoreK;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.raceBlock,
                        isWon ? styles.raceBlockKarlaWon : [styles.raceBlockEmpty, isDark && { backgroundColor: colors.surfaceAlt, borderColor: colors.border }],
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
                <Text style={[styles.playerProgressScore, { color: colors.textSecondary }]}>{scoreJ}/3</Text>
                <Text style={[styles.playerProgressName, { color: '#0369a1' }]} numberOfLines={1}>
                  {javierName}
                </Text>
              </View>
              <View style={[styles.blocksTrack, { justifyContent: 'flex-end' }]}>
                {[2, 1, 0].map((idx) => {
                  const isWon = idx < scoreJ;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.raceBlock,
                        isWon ? styles.raceBlockJavierWon : [styles.raceBlockEmpty, isDark && { backgroundColor: colors.surfaceAlt, borderColor: colors.border }],
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Selector de Modo (Clásico vs Sin Empates) y Estilo de Fichas */}
      <View style={[styles.controlsBar, { width: exactBoardPx }]}>
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('selection');
            onToggleInfiniteMode?.();
          }}
          style={[
            styles.modeToggleChip,
            isDark && { backgroundColor: colors.surface, borderColor: colors.border },
            isInfinite && styles.modeToggleChipInfinite,
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isInfinite ? 'infinite' : 'grid-outline'}
            size={13}
            color={isInfinite ? '#b45309' : colors.textSecondary}
          />
          <Text
            style={[
              styles.modeToggleText,
              { color: isInfinite ? '#92400e' : colors.textSecondary },
            ]}
          >
            {isInfinite ? '⚡ Sin Empates (Máx 3)' : 'Modo Clásico'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('selection');
            setSymbolTheme((prev) => (prev === 'neon' ? 'love' : 'neon'));
          }}
          style={[
            styles.modeToggleChip,
            isDark && { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          activeOpacity={0.8}
        >
          <Text style={styles.themeEmojiPreview}>
            {symbolTheme === 'neon' ? '✕ ○' : '💖 ⭐'}
          </Text>
          <Text style={[styles.modeToggleText, { color: colors.textSecondary }]}>
            {symbolTheme === 'neon' ? 'Neón' : 'Amor'}
          </Text>
        </TouchableOpacity>
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
              : `¡Victoria de ${ticTacToeState.winner === 'Karla' ? karlaName : javierName}! (+150 pts)`}
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
                  const isVanishing = idx === aboutToVanishIdx;

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleCellPress(idx)}
                      activeOpacity={cell || isWinner ? 1 : 0.75}
                      style={[
                        styles.darkGlassCell,
                        { width: cellSize, height: cellSize },
                        isWinningCell && styles.winningGlassCell,
                        isVanishing && styles.vanishingGlassCell,
                      ]}
                    >
                      {cell && (
                        <TicTacToeMarkSvg
                          owner={cell}
                          themeMode={symbolTheme}
                          size={cellSize}
                          isWinning={isWinningCell}
                          isVanishing={isVanishing}
                          winPulseAnim={winPulseAnim}
                        />
                      )}
                      {isVanishing && (
                        <View style={styles.vanishTag}>
                          <Text style={styles.vanishTagText}>Próx.</Text>
                        </View>
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
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
    position: 'relative',
  },
  winningGlassCell: {
    backgroundColor: 'rgba(250, 204, 21, 0.22)',
    borderColor: '#facc15',
    borderWidth: 2,
  },
  vanishingGlassCell: {
    borderColor: '#f59e0b',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
  },
  vanishTag: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.92)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  vanishTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#ffffff',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeToggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modeToggleChipInfinite: {
    backgroundColor: '#fef3c7',
    borderColor: '#fbbf24',
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  themeEmojiPreview: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
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

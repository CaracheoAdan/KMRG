import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';

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

const { width: SCREEN_W } = Dimensions.get('window');

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

const PIECE_VALUES: Record<string, number> = {
  p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
  '♟': 1, '♞': 3, '♝': 3, '♜': 5, '♛': 9, '♚': 0,
  '♙': 1, '♘': 3, '♗': 3, '♖': 5, '♕': 9, '♔': 0,
};

const COLS_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROWS_NUMBERS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const getCapturedPieceGlyph = (item: string, pieceColor: 'w' | 'b'): string => {
  if (['♟', '♞', '♝', '♜', '♛', '♚', '♙', '♘', '♗', '♖', '♕', '♔'].includes(item)) {
    return item;
  }
  return CHESS_SYMBOLS[`${pieceColor}-${item}`] || item;
};

const calculateMaterial = (capturedList: string[]): number => {
  return (capturedList || []).reduce((acc, p) => acc + (PIECE_VALUES[p] || 0), 0);
};

export const ChessArena: React.FC<Props> = ({
  chess,
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

  // Dimensionamiento simétrico sin recorte en columna 'h'
  const maxAvailable = Math.min(SCREEN_W - 32, 360);
  const coordSize = 16;
  const innerGridAvailable = maxAvailable - (coordSize * 2) - 8;
  const cellSize = Math.floor(innerGridAvailable / 8);
  const gridWidth = cellSize * 8;
  const frameWidth = gridWidth + (coordSize * 2) + 8;

  // Animación de pulso para Jaque
  const checkPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isKingInCheck && !isWinner) {
      void triggerGameHaptic('warning');
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(checkPulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(checkPulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      checkPulseAnim.setValue(1);
    }
  }, [isKingInCheck, isWinner, checkPulseAnim]);

  const handleCellPress = (r: number, c: number) => {
    void triggerGameHaptic('selection');
    onCellPress(r, c);
  };

  // Piezas capturadas y cálculo de ventaja material
  const capturedByKarla = chess.capturedByW || [];
  const capturedByJavier = chess.capturedByB || [];
  const materialKarla = calculateMaterial(capturedByKarla);
  const materialJavier = calculateMaterial(capturedByJavier);
  const diffKarla = materialKarla - materialJavier;
  const diffJavier = materialJavier - materialKarla;

  // Notación de la última jugada si existe
  let lastMoveNotation = '';
  if (chess.lastMove) {
    const fromCol = COLS_LETTERS[chess.lastMove.from[1]];
    const fromRow = ROWS_NUMBERS[chess.lastMove.from[0]];
    const toCol = COLS_LETTERS[chess.lastMove.to[1]];
    const toRow = ROWS_NUMBERS[chess.lastMove.to[0]];
    lastMoveNotation = `${fromCol}${fromRow}→${toCol}${toRow}`;
  }

  return (
    <View style={styles.container}>
      {/* 1. Alerta de Jaque (Solo visible cuando hay jaque, sin redundancia de turno) */}
      {isKingInCheck && !isWinner && (
        <Animated.View
          style={[
            styles.checkWarningBadge,
            { transform: [{ scale: checkPulseAnim }] },
          ]}
        >
          <Ionicons name="alert-circle" size={13} color="#ffffff" />
          <Text style={styles.checkWarningText}>¡REY EN JAQUE!</Text>
        </Animated.View>
      )}

      {/* 2. Barra Superior: Javier (Negras) con Avatar, Nombre, Ventaja Material y Capturas */}
      <View
        style={[
          styles.playerBar,
          !isWhite && !isWinner && styles.playerBarActiveJavier,
          { width: frameWidth },
        ]}
      >
        <View style={styles.playerInfoRow}>
          <View style={[styles.playerAvatar, { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' }]}>
            <Text style={[styles.playerAvatarText, { color: '#0369a1' }]}>J</Text>
          </View>
          <View style={styles.playerNameColumn}>
            <Text style={styles.playerName}>Javier</Text>
            <Text style={styles.playerRole}>Negras ⚔️</Text>
          </View>
          {diffJavier > 0 && (
            <View style={styles.materialAdvantageBadgeJavier}>
              <Text style={styles.materialAdvantageText}>+{diffJavier}</Text>
            </View>
          )}
        </View>

        <View style={styles.capturedTray}>
          {capturedByJavier.length === 0 ? (
            <Text style={styles.emptyCapturedText}>Sin capturas</Text>
          ) : (
            capturedByJavier.map((p, idx) => (
              <Text key={idx} style={styles.capturedPieceWhite}>
                {getCapturedPieceGlyph(p, 'w')}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* 3. Tablero de Madera Noble (Nogal / Arce) con Marco Biselado y Coordenadas Simétricas */}
      <View
        style={[
          styles.woodOuterBevel,
          { width: frameWidth },
          GAMES_THEME.shadows.boardDepth,
        ]}
      >
        <View style={styles.woodInnerGlow}>
          {/* Fila Superior de Coordenadas (a - h) */}
          <View style={styles.coordsRow}>
            <View style={{ width: coordSize }} />
            {COLS_LETTERS.map((col) => (
              <View key={col} style={{ width: cellSize, alignItems: 'center' }}>
                <Text style={styles.coordLetterText}>{col}</Text>
              </View>
            ))}
            <View style={{ width: coordSize }} />
          </View>

          {/* 8 Filas del Tablero (8 a 1) */}
          <View style={{ flexDirection: 'column' }}>
            {chess.board.map((row, r) => (
              <View key={r} style={{ flexDirection: 'row' }}>
                {/* Coordenada Numérica Izquierda */}
                <View style={[styles.coordNumberCell, { height: cellSize, width: coordSize }]}>
                  <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                </View>

                {/* 8 Casillas de la Fila */}
                {row.map((piece, c) => {
                  const isDarkSquare = (r + c) % 2 === 1;
                  const isSelected =
                    selectedChessPos &&
                    selectedChessPos[0] === r &&
                    selectedChessPos[1] === c;
                  const isTarget = validChessTargets.some(([tr, tc]) => tr === r && tc === c);
                  const isCheckKing =
                    isKingInCheck &&
                    piece &&
                    piece.type === 'k' &&
                    piece.color === chess.turn;

                  const isLastMoveFrom =
                    chess.lastMove &&
                    chess.lastMove.from[0] === r &&
                    chess.lastMove.from[1] === c;
                  const isLastMoveTo =
                    chess.lastMove &&
                    chess.lastMove.to[0] === r &&
                    chess.lastMove.to[1] === c;
                  const isLastMove = isLastMoveFrom || isLastMoveTo;

                  const pieceColor = piece ? piece.color : null;
                  const symbolKey = piece ? `${piece.color}-${piece.type}` : '';
                  const glyph = piece ? CHESS_SYMBOLS[symbolKey] || '♟' : '';

                  let squareBg = isDarkSquare ? '#78350f' : '#fef3c7';
                  if (isSelected) {
                    squareBg = '#fde047';
                  } else if (isCheckKing) {
                    squareBg = '#ef4444';
                  } else if (isLastMove) {
                    squareBg = isDarkSquare ? '#9a5b13' : '#fef08a';
                  }

                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => handleCellPress(r, c)}
                      activeOpacity={0.8}
                      style={[
                        styles.chessSquare,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: squareBg,
                        },
                        isSelected && styles.squareSelectedRing,
                        isCheckKing && styles.squareInCheckAlert,
                      ]}
                    >
                      {/* Indicador de Movimiento Legal */}
                      {isTarget && (
                        <View
                          style={
                            piece
                              ? styles.targetCaptureRing
                              : styles.targetMoveDot
                          }
                        />
                      )}

                      {/* Glifo de la Pieza con Volumen y Sombra Realista (Negras en carbón profundo con halo claro) */}
                      {piece && (
                        <Text
                          style={[
                            styles.pieceGlyph,
                            {
                              fontSize: Math.floor(cellSize * 0.72),
                              color: pieceColor === 'w' ? '#ffffff' : '#18181b',
                              textShadowColor:
                                pieceColor === 'w'
                                  ? 'rgba(0, 0, 0, 0.7)'
                                  : 'rgba(255, 255, 255, 0.7)',
                              textShadowOffset:
                                pieceColor === 'w'
                                  ? { width: 0, height: 2 }
                                  : { width: 0, height: 1 },
                              textShadowRadius: pieceColor === 'w' ? 3.5 : 2.5,
                            },
                          ]}
                        >
                          {glyph}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* Coordenada Numérica Derecha Simétrica (Previene recorte) */}
                <View style={[styles.coordNumberCell, { height: cellSize, width: coordSize }]}>
                  <Text style={[styles.coordNumberText, { opacity: 0.5 }]}>
                    {ROWS_NUMBERS[r]}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Fila Inferior de Coordenadas Simétrica */}
          <View style={styles.coordsRow}>
            <View style={{ width: coordSize }} />
            {COLS_LETTERS.map((col) => (
              <View key={col} style={{ width: cellSize, alignItems: 'center' }}>
                <Text style={[styles.coordLetterText, { opacity: 0.5 }]}>{col}</Text>
              </View>
            ))}
            <View style={{ width: coordSize }} />
          </View>
        </View>
      </View>

      {/* 4. Barra Inferior: Karlita (Blancas) con Avatar, Nombre, Ventaja Material y Capturas */}
      <View
        style={[
          styles.playerBar,
          isWhite && !isWinner && styles.playerBarActiveKarla,
          { width: frameWidth },
        ]}
      >
        <View style={styles.playerInfoRow}>
          <View style={[styles.playerAvatar, { backgroundColor: '#fdf2f8', borderColor: '#f472b6' }]}>
            <Text style={[styles.playerAvatarText, { color: '#be185d' }]}>K</Text>
          </View>
          <View style={styles.playerNameColumn}>
            <Text style={styles.playerName}>Karlita</Text>
            <Text style={styles.playerRole}>Blancas 👑</Text>
          </View>
          {diffKarla > 0 && (
            <View style={styles.materialAdvantageBadgeKarla}>
              <Text style={styles.materialAdvantageText}>+{diffKarla}</Text>
            </View>
          )}
        </View>

        <View style={styles.capturedTray}>
          {capturedByKarla.length === 0 ? (
            <Text style={styles.emptyCapturedText}>Sin capturas</Text>
          ) : (
            capturedByKarla.map((p, idx) => (
              <Text key={idx} style={styles.capturedPieceBlack}>
                {getCapturedPieceGlyph(p, 'b')}
              </Text>
            ))
          )}
        </View>
      </View>

      {/* 5. Historial de Jugadas en Notación con Chips Horizontales */}
      <View style={[styles.movesHistoryCard, { width: frameWidth }]}>
        <View style={styles.movesHistoryHeader}>
          <Ionicons name="time-outline" size={13} color="#64748b" />
          <Text style={styles.movesHistoryTitle}>
            Historial de Jugadas ({chessHistoryLength} turnos)
          </Text>
          {lastMoveNotation !== '' && (
            <View style={styles.lastMoveNotationChip}>
              <Ionicons name="sparkles" size={10} color="#b45309" />
              <Text style={styles.lastMoveNotationText}>{lastMoveNotation}</Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.movesScrollRow}
        >
          {chessHistoryLength === 0 ? (
            <Text style={styles.noMovesText}>Partida lista • Blancas abren el juego</Text>
          ) : (
            Array.from({ length: Math.ceil(chessHistoryLength / 2) }).map((_, i) => {
              const isCurrentRound = i === Math.ceil(chessHistoryLength / 2) - 1;
              return (
                <View
                  key={i}
                  style={[
                    styles.movePill,
                    isCurrentRound && styles.movePillActive,
                  ]}
                >
                  <Text style={styles.moveNumberText}>{i + 1}.</Text>
                  <Text style={styles.moveWhiteText}>
                    {isCurrentRound && lastMoveNotation && !isWhite
                      ? lastMoveNotation
                      : 'K'}
                  </Text>
                  {i * 2 + 1 < chessHistoryLength && (
                    <Text style={styles.moveBlackText}>
                      {isCurrentRound && lastMoveNotation && isWhite
                        ? lastMoveNotation
                        : 'J'}
                    </Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* 6. Dock Inferior: Deshacer y Reiniciar con Botones Unificados */}
      <View style={[styles.dockContainer, { width: frameWidth }]}>
        <View style={{ flex: 1 }}>
          <GameButton
            label={`Deshacer (${chessHistoryLength})`}
            icon="arrow-undo"
            variant="secondary"
            disabled={chessHistoryLength === 0}
            onPress={onUndo}
          />
        </View>

        <View style={{ flex: 1 }}>
          <GameButton
            label="Reiniciar"
            icon="reload"
            variant="destructive"
            onPress={onReset}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
  },
  checkWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    ...GAMES_THEME.shadows.soft,
  },
  checkWarningText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.soft,
  },
  playerBarActiveKarla: {
    borderColor: '#f472b6',
    backgroundColor: '#fdf2f8',
  },
  playerBarActiveJavier: {
    borderColor: '#38bdf8',
    backgroundColor: '#f0f9ff',
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  playerAvatarText: {
    fontSize: 13,
    fontWeight: '900',
  },
  playerNameColumn: {
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
  },
  playerRole: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  materialAdvantageBadgeKarla: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  materialAdvantageBadgeJavier: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  materialAdvantageText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  capturedTray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '50%',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  emptyCapturedText: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  capturedPieceWhite: {
    fontSize: 16,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  capturedPieceBlack: {
    fontSize: 16,
    color: '#18181b',
    textShadowColor: 'rgba(255, 255, 255, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },
  woodOuterBevel: {
    backgroundColor: '#451a03',
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#78350f',
    padding: 3,
    alignSelf: 'center',
  },
  woodInnerGlow: {
    backgroundColor: '#582407',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b45309',
    paddingVertical: 2,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
  },
  coordLetterText: {
    color: '#fef3c7',
    fontSize: 9.5,
    fontWeight: '800',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordNumberText: {
    color: '#fef3c7',
    fontSize: 9.5,
    fontWeight: '800',
  },
  chessSquare: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  squareSelectedRing: {
    borderWidth: 2,
    borderColor: '#ca8a04',
  },
  squareInCheckAlert: {
    backgroundColor: '#ef4444',
  },
  targetMoveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    position: 'absolute',
    zIndex: 2,
  },
  targetCaptureRing: {
    width: '84%',
    height: '84%',
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#ef4444',
    position: 'absolute',
    zIndex: 2,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pieceGlyph: {
    fontWeight: '700',
  },
  movesHistoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
    ...GAMES_THEME.shadows.soft,
  },
  movesHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  movesHistoryTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    flex: 1,
    marginLeft: 4,
  },
  lastMoveNotationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef3c7',
    borderColor: '#fde047',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  lastMoveNotationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400e',
  },
  movesScrollRow: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingVertical: 2,
  },
  noMovesText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  movePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  movePillActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  moveNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  moveWhiteText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9333ea',
  },
  moveBlackText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  dockContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
});

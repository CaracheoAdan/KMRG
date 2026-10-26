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

const COLS_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROWS_NUMBERS = ['8', '7', '6', '5', '4', '3', '2', '1'];

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

  // Tablero grande aprovechando el ancho útil con 16px a cada lado
  const boardSize = Math.min(SCREEN_W - 32, 350);
  const coordMargin = 16;
  const innerBoardPx = boardSize - coordMargin;
  const cellSize = Math.floor(innerBoardPx / 8);

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

  const statusBg = isWinner ? '#ecfdf5' : isWhite ? '#fdf2f8' : '#f0f9ff';
  const statusBorder = isWinner ? '#a7f3d0' : isWhite ? '#fbcfe8' : '#bae6fd';
  const statusColor = isWinner
    ? '#059669'
    : isWhite
    ? GAMES_THEME.colors.karla.text
    : GAMES_THEME.colors.javier.text;

  // Piezas capturadas
  const capturedByKarla = chess.capturedByW || [];
  const capturedByJavier = chess.capturedByB || [];

  return (
    <View style={styles.container}>
      {/* 1. Pill de Turno y Alerta de Jaque */}
      <View style={[styles.turnPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
        <Ionicons
          name={isWinner ? 'trophy' : isKingInCheck ? 'alert-circle' : 'shield-checkmark'}
          size={14}
          color={statusColor}
        />
        <Text style={[styles.turnText, { color: statusColor }]}>
          {isWinner
            ? `¡VICTORIA DE ${chess.winner === 'w' ? 'KARLITA' : 'JAVIER'}!`
            : `TURNO: ${isWhite ? 'KARLITA (BLANCAS) 👑' : 'JAVIER (NEGRAS) ⚔️'}`}
        </Text>
        {isKingInCheck && !isWinner && (
          <Animated.View
            style={[
              styles.checkWarningBadge,
              { transform: [{ scale: checkPulseAnim }] },
            ]}
          >
            <Text style={styles.checkWarningText}>¡JAQUE!</Text>
          </Animated.View>
        )}
      </View>

      {/* 2. Bandejas de Piezas Capturadas por Jugador */}
      <View style={styles.capturedBothTraysRow}>
        {/* Karlita */}
        <View style={styles.capturedSingleBox}>
          <Text style={styles.capturedSingleLabel}>Karlita:</Text>
          <View style={styles.capturedGlyphsRow}>
            {capturedByKarla.length === 0 ? (
              <Text style={styles.noCapturedText}>-</Text>
            ) : (
              capturedByKarla.slice(0, 7).map((p, idx) => (
                <Text key={idx} style={styles.capturedGlyphDark}>
                  {CHESS_SYMBOLS[`b-${p}`] || '♟'}
                </Text>
              ))
            )}
          </View>
        </View>

        {/* Javier */}
        <View style={[styles.capturedSingleBox, { alignItems: 'flex-end' }]}>
          <Text style={styles.capturedSingleLabel}>Javier:</Text>
          <View style={[styles.capturedGlyphsRow, { justifyContent: 'flex-end' }]}>
            {capturedByJavier.length === 0 ? (
              <Text style={styles.noCapturedText}>-</Text>
            ) : (
              capturedByJavier.slice(0, 7).map((p, idx) => (
                <Text key={idx} style={styles.capturedGlyphLight}>
                  {CHESS_SYMBOLS[`w-${p}`] || '♙'}
                </Text>
              ))
            )}
          </View>
        </View>
      </View>

      {/* 3. Tablero de Madera Noble con Marco Biselado y Coordenadas */}
      <View
        style={[
          styles.woodFrame,
          { width: boardSize },
          GAMES_THEME.shadows.boardDepth,
        ]}
      >
        {/* Coordenadas Superiores a-h */}
        <View style={styles.coordsHeaderRow}>
          <View style={{ width: coordMargin }} />
          {COLS_LETTERS.map((col) => (
            <View key={col} style={{ width: cellSize, alignItems: 'center' }}>
              <Text style={styles.coordLetterText}>{col}</Text>
            </View>
          ))}
        </View>

        {/* Filas 8-1 */}
        <View style={{ flexDirection: 'column' }}>
          {chess.board.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row' }}>
              {/* Coordenada Numérica 8-1 */}
              <View style={[styles.coordNumberCell, { height: cellSize, width: coordMargin }]}>
                <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
              </View>

              {/* Casillas del Tablero */}
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

                const pieceColor = piece ? piece.color : null;
                const symbolKey = piece ? `${piece.color}-${piece.type}` : '';
                const glyph = piece ? CHESS_SYMBOLS[symbolKey] || '♟' : '';

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
                        backgroundColor: isSelected
                          ? '#fde047'
                          : isDarkSquare
                          ? '#b45309'
                          : '#fef3c7',
                      },
                      isSelected && styles.squareSelectedRing,
                      isCheckKing && styles.squareInCheckAlert,
                    ]}
                  >
                    {/* Indicador de Movimiento Legal (Punto concéntrico verde o Anillo rojo si captura) */}
                    {isTarget && (
                      <View
                        style={
                          piece
                            ? styles.targetCaptureRing
                            : styles.targetMoveDot
                        }
                      />
                    )}

                    {/* Glifo de la Pieza con Volumen y Sombra Realista */}
                    {piece && (
                      <Text
                        style={[
                          styles.pieceGlyph,
                          {
                            fontSize: Math.floor(cellSize * 0.72),
                            color: pieceColor === 'w' ? '#ffffff' : '#1e1b4b',
                            textShadowColor:
                              pieceColor === 'w'
                                ? 'rgba(0, 0, 0, 0.55)'
                                : 'rgba(255, 255, 255, 0.4)',
                            textShadowOffset: { width: 0, height: 1.5 },
                            textShadowRadius: 3,
                          },
                        ]}
                      >
                        {glyph}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* 4. Lista de Movimientos en Notación con Scroll Horizontal */}
      <View style={styles.movesHistoryCard}>
        <View style={styles.movesHistoryHeader}>
          <Ionicons name="time-outline" size={13} color="#64748b" />
          <Text style={styles.movesHistoryTitle}>
            Historial de Jugadas ({chessHistoryLength} turnos):
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.movesScrollRow}
        >
          {chessHistoryLength === 0 ? (
            <Text style={styles.noMovesText}>Inicio de la partida • Ningún movimiento aún</Text>
          ) : (
            Array.from({ length: Math.ceil(chessHistoryLength / 2) }).map((_, i) => (
              <View key={i} style={styles.movePill}>
                <Text style={styles.moveNumberText}>{i + 1}.</Text>
                <Text style={styles.moveWhiteText}>Jugada K</Text>
                {i * 2 + 1 < chessHistoryLength && (
                  <Text style={styles.moveBlackText}>Jugada J</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* 5. Controles Inferiores: Deshacer y Reiniciar Partida */}
      <View style={styles.chessActionsRow}>
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onUndo();
          }}
          disabled={chessHistoryLength === 0}
          style={[
            styles.undoBtn,
            chessHistoryLength === 0 && { opacity: 0.4 },
          ]}
          accessibilityLabel="Deshacer última jugada"
        >
          <Ionicons name="arrow-undo" size={15} color="#334155" />
          <Text style={styles.undoBtnText}>Deshacer ({chessHistoryLength})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onReset();
          }}
          style={styles.resetBtn}
          accessibilityLabel="Reiniciar tablero de ajedrez"
        >
          <Ionicons name="reload" size={15} color="#78350f" />
          <Text style={styles.resetBtnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm,
    width: '100%',
    paddingHorizontal: GAMES_THEME.spacing.lg,
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  turnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  checkWarningBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 4,
  },
  checkWarningText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  capturedBothTraysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.soft,
  },
  capturedSingleBox: {
    flex: 1,
  },
  capturedSingleLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  capturedGlyphsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  noCapturedText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  capturedGlyphDark: {
    fontSize: 15,
    color: '#1e1b4b',
  },
  capturedGlyphLight: {
    fontSize: 15,
    color: '#9333ea',
  },
  woodFrame: {
    backgroundColor: '#78350f',
    borderRadius: GAMES_THEME.radius.lg,
    borderWidth: 3,
    borderColor: '#451a03',
    padding: 3,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  coordsHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 2,
  },
  coordLetterText: {
    color: '#fef3c7',
    fontSize: 10,
    fontWeight: '800',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
  },
  coordNumberText: {
    color: '#fef3c7',
    fontSize: 10,
    fontWeight: '800',
  },
  chessSquare: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  squareSelectedRing: {
    borderWidth: 2,
    borderColor: '#eab308',
  },
  squareInCheckAlert: {
    backgroundColor: '#ef4444',
  },
  targetMoveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
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
  },
  pieceGlyph: {
    fontWeight: '700',
  },
  movesHistoryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    ...GAMES_THEME.shadows.soft,
  },
  movesHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  movesHistoryTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  movesScrollRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  noMovesText: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  movePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  moveNumberText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748b',
  },
  moveWhiteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9333ea',
  },
  moveBlackText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  chessActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  undoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  undoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  resetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#fde047',
    ...GAMES_THEME.shadows.soft,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78350f',
  },
});

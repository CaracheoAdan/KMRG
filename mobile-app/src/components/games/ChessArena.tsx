import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';
import { MatchInfoFooter } from './common/MatchInfoFooter';

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

const COLS_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROWS_NUMBERS = ['8', '7', '6', '5', '4', '3', '2', '1'];

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

  return (
    <View style={styles.container}>
      {/* Turn Pill & Estado de Jaque */}
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

      {/* Bandeja de Piezas Capturadas por Karlita */}
      {chess.capturedByW && chess.capturedByW.length > 0 && (
        <View style={styles.capturedTray}>
          <Text style={styles.capturedLabel}>Karlita capturó:</Text>
          <View style={styles.capturedPiecesRow}>
            {chess.capturedByW.slice(0, 8).map((p, idx) => (
              <Text key={idx} style={styles.capturedGlyphDark}>
                {CHESS_SYMBOLS[`b-${p}`] || '♟'}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Tablero de Madera Elegante con Borde Biselado y Coordenadas */}
      <View style={[styles.woodFrame, GAMES_THEME.shadows.card]}>
        {/* Coordenadas Superiores (a-h) */}
        <View style={styles.coordsHeaderRow}>
          <View style={{ width: 14 }} />
          {COLS_LETTERS.map((col) => (
            <View key={col} style={{ width: chessCellPx, alignItems: 'center' }}>
              <Text style={styles.coordText}>{col}</Text>
            </View>
          ))}
        </View>

        {chess.board.map((row, r) => (
          <View key={r} style={styles.row}>
            {/* Coordenada Lateral Izquierda (1-8) */}
            <View style={styles.coordSideCell}>
              <Text style={styles.coordText}>{ROWS_NUMBERS[r]}</Text>
            </View>

            {row.map((piece, c) => {
              const isDarkSquare = (r + c) % 2 === 1;
              const isSelected = selectedChessPos?.[0] === r && selectedChessPos?.[1] === c;
              const isLastMove =
                (chess.lastMove?.from[0] === r && chess.lastMove?.from[1] === c) ||
                (chess.lastMove?.to[0] === r && chess.lastMove?.to[1] === c);
              const isTarget = validChessTargets.some(([tr, tc]) => tr === r && tc === c);
              const isKingCheckSquare =
                isKingInCheck && piece && piece.type === 'k' && piece.color === chess.turn;

              return (
                <TouchableOpacity
                  key={`${r}-${c}`}
                  onPress={() => handleCellPress(r, c)}
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
                        ? '#fde047'
                        : isDarkSquare
                        ? '#b45309'
                        : '#fef3c7',
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  {piece && (
                    <Text
                      style={[
                        styles.glyph,
                        {
                          fontSize: isFull ? 28 : 22,
                          color: piece.color === 'w' ? '#ffffff' : '#1e293b',
                          textShadowColor:
                            piece.color === 'w'
                              ? 'rgba(0,0,0,0.85)'
                              : 'rgba(255,255,255,0.95)',
                          textShadowOffset: { width: 0, height: 1.5 },
                          textShadowRadius: 3,
                        },
                      ]}
                    >
                      {CHESS_SYMBOLS[`${piece.color}-${piece.type}`]}
                    </Text>
                  )}

                  {/* Indicador de Movimiento Válido o Captura */}
                  {isTarget && (
                    <View
                      style={[
                        styles.moveIndicator,
                        piece ? styles.captureIndicator : styles.emptyMoveIndicator,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Bandeja de Piezas Capturadas por Javier */}
      {chess.capturedByB && chess.capturedByB.length > 0 && (
        <View style={styles.capturedTray}>
          <Text style={styles.capturedLabel}>Javier capturó:</Text>
          <View style={styles.capturedPiecesRow}>
            {chess.capturedByB.slice(0, 8).map((p, idx) => (
              <Text key={idx} style={styles.capturedGlyphLight}>
                {CHESS_SYMBOLS[`w-${p}`] || '♟'}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Controles de Partida */}
      <View style={styles.controlsRow}>
        <View style={{ flex: 1 }}>
          <GameButton
            label="Deshacer"
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
            variant="primary"
            onPress={onReset}
          />
        </View>
      </View>

      {/* Espacio Inferior Aprovechado: Racha y Tips */}
      {isFull && (
        <MatchInfoFooter
          streakCount={chessHistoryLength > 10 ? 6 : 2}
          gameStatsText={`Movimientos realizados: ${chessHistoryLength}`}
          coupleBanter="El ajedrez es como el amor: paciencia, estrategia y proteger al rey y la reina ♟️"
        />
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
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  turnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  checkWarningBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  checkWarningText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  capturedTray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(254, 243, 199, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  capturedLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#92400e',
  },
  capturedPiecesRow: {
    flexDirection: 'row',
    gap: 2,
  },
  capturedGlyphDark: {
    fontSize: 14,
    color: '#1e293b',
  },
  capturedGlyphLight: {
    fontSize: 14,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  woodFrame: {
    borderColor: '#78350f',
    borderWidth: 5,
    borderRadius: 20,
    backgroundColor: '#78350f',
    overflow: 'hidden',
    paddingBottom: 2,
  },
  coordsHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#78350f',
    paddingVertical: 1,
  },
  coordSideCell: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#78350f',
  },
  coordText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fef3c7',
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: '900',
    lineHeight: 32,
  },
  moveIndicator: {
    position: 'absolute',
  },
  emptyMoveIndicator: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: 'rgba(2, 132, 199, 0.65)',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  captureIndicator: {
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});

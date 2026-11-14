import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';
import { useProfile } from '../../contexts/ProfileContext';
import { useTheme } from '../../contexts/ThemeContext';

type ChessPieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

const ChessPieceSvg: React.FC<{
  type: ChessPieceType;
  color: 'w' | 'b';
  size: number;
}> = ({ type, color, size }) => {
  const fill = color === 'w' ? '#ffffff' : '#1e293b';
  const stroke = color === 'w' ? '#334155' : '#e2e8f0';
  const detailStroke = color === 'w' ? '#64748b' : '#94a3b8';

  return (
    <Svg width={size} height={size} viewBox="0 0 45 45">
      {type === 'p' && (
        <>
          <Circle cx="22.5" cy="13" r="5.5" fill={fill} stroke={stroke} strokeWidth="2.2" />
          <Path
            d="M 16.5 21 Q 22.5 18 28.5 21 L 26.5 28 Q 22.5 30 18.5 28 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Path
            d="M 13.5 37 C 14.5 31 18 28 22.5 28 C 27 28 30.5 31 31.5 37 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Rect x="11" y="36.5" width="23" height="3.8" rx="1.8" fill={fill} stroke={stroke} strokeWidth="2" />
        </>
      )}

      {type === 'r' && (
        <>
          <Path
            d="M 12 9 H 16.5 V 13 H 20 V 9 H 25 V 13 H 28.5 V 9 H 33 V 17 L 29.5 20 H 15.5 L 12 17 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <Path
            d="M 16 20 H 29 L 30.5 34 H 14.5 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <Rect x="11" y="34" width="23" height="5.5" rx="1.5" fill={fill} stroke={stroke} strokeWidth="2.1" />
        </>
      )}

      {type === 'b' && (
        <>
          <Circle cx="22.5" cy="8.5" r="2.6" fill={fill} stroke={stroke} strokeWidth="2" />
          <Path
            d="M 22.5 11.2 C 15.5 16.2 14 23 16.5 29 H 28.5 C 31 23 29.5 16.2 22.5 11.2 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Line x1="19.5" y1="18.5" x2="25.5" y2="24" stroke={detailStroke} strokeWidth="2" strokeLinecap="round" />
          <Rect x="14.5" y="29" width="16" height="4" rx="1.4" fill={fill} stroke={stroke} strokeWidth="2" />
          <Path d="M 11 35 H 34 L 31.5 39.8 H 13.5 Z" fill={fill} stroke={stroke} strokeWidth="2.1" strokeLinejoin="round" />
        </>
      )}

      {type === 'n' && (
        <>
          <Path
            d="M 14.5 36.5 C 14.5 27.5 16.5 21.5 20.5 18.5 L 16 19.5 C 13 18.5 12.5 15 15.5 12.5 C 18.5 10 21 9 23.5 9 L 25 6 L 27.8 9.5 C 32 11 34 16 33 22 C 32 27 30 31 31.5 36.5 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Circle cx="19" cy="13.8" r="1.5" fill={stroke} />
          <Rect x="11.5" y="36.2" width="22.5" height="4" rx="1.6" fill={fill} stroke={stroke} strokeWidth="2" />
        </>
      )}

      {type === 'q' && (
        <>
          <Path
            d="M 9 15 L 14 26 L 17.5 12 L 22.5 25 L 27.5 12 L 31 26 L 36 15 L 32 33 H 13 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.1"
            strokeLinejoin="round"
          />
          <Circle cx="9" cy="13.5" r="2" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <Circle cx="17.5" cy="10.8" r="2" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <Circle cx="22.5" cy="9.8" r="2.2" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <Circle cx="27.5" cy="10.8" r="2" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <Circle cx="36" cy="13.5" r="2" fill={fill} stroke={stroke} strokeWidth="1.6" />
          <Rect x="11" y="33" width="23" height="6.2" rx="1.8" fill={fill} stroke={stroke} strokeWidth="2.1" />
        </>
      )}

      {type === 'k' && (
        <>
          <Line x1="22.5" y1="6" x2="22.5" y2="14" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
          <Line x1="18.8" y1="9.5" x2="26.2" y2="9.5" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" />
          <Path
            d="M 22.5 14 C 15 13 10.5 19 12.5 26 C 14 30 17 32 22.5 32 C 28 32 31 30 32.5 26 C 34.5 19 30 13 22.5 14 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <Line x1="22.5" y1="15" x2="22.5" y2="31" stroke={detailStroke} strokeWidth="1.8" />
          <Rect x="11" y="32.2" width="23" height="7" rx="1.8" fill={fill} stroke={stroke} strokeWidth="2.1" />
        </>
      )}
    </Svg>
  );
};

interface Props {
  chess: GamesState['chess'];
  isFull: boolean;
  chessCellPx: number;
  primaryColor: string;
  isKingInCheck: boolean;
  selectedChessPos: [number, number] | null;
  validChessTargets: [number, number][];
  chessHistoryLength: number;
  onCellPress: (r: number, c: number, promoteTo?: 'q' | 'r' | 'b' | 'n') => void;
  onUndo: () => void;
  onReset: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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
  const { getDisplayName, getAvatarUri } = useProfile();
  const { colors, isDark } = useTheme();
  const karlaAvatarUri = getAvatarUri('Karla');
  const javierAvatarUri = getAvatarUri('Javier');
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');
  const isWinner = !!chess.winner;
  const isWhite = chess.turn === 'w';

  // Dimensionamiento simétrico que aprovecha el ancho completo con margen de 16px
  const maxH = Math.floor(SCREEN_H * 0.48);
  const maxAvailable = Math.min(SCREEN_W - 32, maxH, 360);
  const coordSize = 14;
  const innerGridAvailable = maxAvailable - (coordSize * 2) - 10;
  const cellSize = Math.floor(innerGridAvailable / 8);
  const gridWidth = cellSize * 8;
  const frameWidth = gridWidth + (coordSize * 2) + 10;

  // Animación de pulso para Jaque
  const checkPulseAnim = useRef(new Animated.Value(1)).current;
  const [pendingPromoMove, setPendingPromoMove] = useState<{
    r: number;
    c: number;
    color: 'w' | 'b';
  } | null>(null);

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
    if (selectedChessPos && !chess.winner) {
      const isTarget = validChessTargets.some(([tr, tc]) => tr === r && tc === c);
      const [sr, sc] = selectedChessPos;
      const movingPiece = chess.board[sr]?.[sc];
      if (isTarget && movingPiece?.type === 'p' && (r === 0 || r === 7)) {
        setPendingPromoMove({ r, c, color: movingPiece.color });
        return;
      }
    }
    onCellPress(r, c);
  };

  const handleSelectPromotion = (promoType: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromoMove) return;
    const { r, c } = pendingPromoMove;
    setPendingPromoMove(null);
    void triggerGameHaptic('success');
    onCellPress(r, c, promoType);
  };

  // Piezas capturadas y cálculo de ventaja material
  const capturedByKarla = chess.capturedByW || [];
  const capturedByJavier = chess.capturedByB || [];
  const materialKarla = calculateMaterial(capturedByKarla);
  const materialJavier = calculateMaterial(capturedByJavier);
  const diffKarla = materialKarla - materialJavier;
  const diffJavier = materialJavier - materialKarla;

  const moveHistory = chess.moveHistory || [];
  // Notación de la última jugada si existe
  let lastMoveNotation = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : '';
  if (!lastMoveNotation && chess.lastMove) {
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

      {/* 2. Barra Superior: Javier (Negras) con Avatar Real, Nombre, Ventaja Material y Capturas */}
      <View
        style={[
          styles.playerBar,
          { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
          !isWhite && !isWinner && (isDark ? { borderWidth: 2, borderColor: '#38bdf8', backgroundColor: '#0c4a6e33' } : styles.playerBarActiveJavier),
          { width: frameWidth },
        ]}
      >
        <View style={styles.playerInfoRow}>
          <View style={[styles.playerAvatar, { backgroundColor: '#e0f2fe', borderColor: !isWhite && !isWinner ? '#0284c7' : '#38bdf8' }]}>
            {javierAvatarUri ? (
              <Image source={{ uri: javierAvatarUri }} style={styles.playerAvatarImg} />
            ) : (
              <Text style={[styles.playerAvatarText, { color: '#0369a1' }]}>
                {javierName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.playerNameColumn}>
            <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
              {javierName}
            </Text>
            <Text style={[styles.playerRole, { color: colors.textSecondary }]}>Negras ⚔️</Text>
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

                  // Textura de madera cálida, brillo y relieve
                  let squareBg = isDarkSquare ? '#854d0e' : '#fef3c7';
                  if (isSelected) {
                    squareBg = '#facc15';
                  } else if (isCheckKing) {
                    squareBg = '#f87171';
                  } else if (isLastMove) {
                    squareBg = isDarkSquare ? '#a16207' : '#fef08a';
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

                      {/* Pieza SVG estilizada consistente entre iOS y Android */}
                      {piece && (
                        <ChessPieceSvg
                          type={piece.type}
                          color={piece.color}
                          size={Math.floor(cellSize * 0.84)}
                        />
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

      {/* 4. Barra Inferior: Karlita (Blancas) con Avatar Real, Nombre, Ventaja Material y Capturas */}
      <View
        style={[
          styles.playerBar,
          { backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
          isWhite && !isWinner && (isDark ? { borderWidth: 2, borderColor: '#ec4899', backgroundColor: '#83184333' } : styles.playerBarActiveKarla),
          { width: frameWidth },
        ]}
      >
        <View style={styles.playerInfoRow}>
          <View style={[styles.playerAvatar, { backgroundColor: '#fdf2f8', borderColor: isWhite && !isWinner ? '#ec4899' : '#f472b6' }]}>
            {karlaAvatarUri ? (
              <Image source={{ uri: karlaAvatarUri }} style={styles.playerAvatarImg} />
            ) : (
              <Text style={[styles.playerAvatarText, { color: '#be185d' }]}>
                {karlaName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.playerNameColumn}>
            <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1}>
              {karlaName}
            </Text>
            <Text style={[styles.playerRole, { color: colors.textSecondary }]}>Blancas 👑</Text>
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
      <View
        style={[
          styles.movesHistoryCard,
          { width: frameWidth, backgroundColor: isDark ? colors.surface : '#ffffff', borderColor: colors.border },
        ]}
      >
        <View style={styles.movesHistoryHeader}>
          <Ionicons name="time-outline" size={13} color="#64748b" />
          <Text style={styles.movesHistoryTitle}>
            Historial de Jugadas ({moveHistory.length || chessHistoryLength} turnos)
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
          {moveHistory.length === 0 && chessHistoryLength === 0 ? (
            <Text style={styles.noMovesText}>Partida lista • Blancas abren el juego</Text>
          ) : moveHistory.length > 0 ? (
            Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => {
              const isCurrentRound = i === Math.ceil(moveHistory.length / 2) - 1;
              const moveWhite = moveHistory[i * 2];
              const moveBlack = moveHistory[i * 2 + 1];

              return (
                <View
                  key={i}
                  style={[
                    styles.movePill,
                    isCurrentRound && styles.movePillActive,
                  ]}
                >
                  <Text style={[styles.moveNumberText, isCurrentRound && styles.moveNumberTextActive]}>
                    {i + 1}.
                  </Text>
                  <Text style={[styles.moveWhiteText, isCurrentRound && styles.moveWhiteTextActive]}>
                    {moveWhite}
                  </Text>
                  {moveBlack && (
                    <Text style={[styles.moveBlackText, isCurrentRound && styles.moveBlackTextActive]}>
                      {moveBlack}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <View style={[styles.movePill, styles.movePillActive]}>
              <Text style={styles.moveWhiteText}>{lastMoveNotation || 'Jugada'}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* 6. Dock Inferior: Acciones de la partida (Deshacer y Reiniciar) */}
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
            variant="secondary"
            onPress={onReset}
          />
        </View>
      </View>

      {/* Modal de Coronación de Peón */}
      <Modal
        visible={!!pendingPromoMove}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPromoMove(null)}
      >
        <View style={styles.promoBackdrop}>
          <View style={[styles.promoCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promoTitle, { color: colors.text }]}>¡Coronación de Peón!</Text>
            <Text style={[styles.promoSubtitle, { color: colors.textSecondary }]}>
              Elige la pieza en la que quieres transformar tu peón
            </Text>
            <View style={styles.promoChoicesRow}>
              {(
                [
                  { type: 'q', label: 'Dama' },
                  { type: 'n', label: 'Caballo' },
                  { type: 'r', label: 'Torre' },
                  { type: 'b', label: 'Alfil' },
                ] as const
              ).map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  onPress={() => handleSelectPromotion(opt.type)}
                  style={[styles.promoOptionBtn, isDark && { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <ChessPieceSvg
                    type={opt.type}
                    color={pendingPromoMove?.color || 'w'}
                    size={40}
                  />
                  <Text style={[styles.promoOptionLabel, { color: colors.text }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 8,
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
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.soft,
  },
  playerBarActiveKarla: {
    borderWidth: 2,
    borderColor: '#ec4899',
    backgroundColor: '#fdf2f8',
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  playerBarActiveJavier: {
    borderWidth: 2,
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  activeTurnChipKarla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fce7f3',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbcfe8',
    marginLeft: 4,
  },
  activeTurnChipTextKarla: {
    fontSize: 10,
    fontWeight: '800',
    color: '#be185d',
  },
  activeTurnChipJavier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginLeft: 4,
  },
  activeTurnChipTextJavier: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369a1',
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  playerAvatarImg: {
    width: '100%',
    height: '100%',
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
    paddingVertical: 3,
    paddingHorizontal: 5,
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
    paddingHorizontal: 2,
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
    borderRadius: 16,
    padding: 9,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  movePillActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
  },
  moveNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  moveNumberTextActive: {
    color: '#b45309',
  },
  moveWhiteText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#9333ea',
  },
  moveWhiteTextActive: {
    color: '#7e22ce',
    fontWeight: '800',
  },
  moveBlackText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  moveBlackTextActive: {
    color: '#0369a1',
    fontWeight: '800',
  },
  dockContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  promoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  promoCard: {
    width: '100%' as const,
    maxWidth: 330,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.card,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  promoChoicesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%' as const,
  },
  promoOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  promoOptionLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
});

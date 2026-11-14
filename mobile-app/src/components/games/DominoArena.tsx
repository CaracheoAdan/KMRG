import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { DominoPlacedTile, DominoTile } from '../../types';
import { Ionicons } from '../ui/Icon';
import { triggerGameHaptic } from '../../theme/gamesTheme';
import { canPlayTile, calculateHandPips, getPlayableTiles, DOMINO_TARGET_SCORE } from './domino/dominoLogic';
import { useProfile } from '../../contexts/ProfileContext';

export interface DominoArenaProps {
  myHand: DominoTile[];
  partnerTileCount: number;
  boneyardCount: number;
  board: DominoPlacedTile[];
  openLeft: number | null;
  openRight: number | null;
  openingTileId?: string | null;
  myScore?: number;
  partnerScore?: number;
  partnerName: string;
  isMyTurn: boolean;
  isPlaying: boolean;
  lastAction?: string | null;
  primaryColor?: string;
  onPlayTile: (tile: DominoTile, side: 'left' | 'right') => void;
  onDrawBoneyard: () => void;
  onPassTurn: () => void;
  onNewRound: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

// =========================================================================
// PIPS REALES DE DOMINÓ (GEOMETRÍA ESTÁNDAR 1-6)
// =========================================================================
export const DominoPips: React.FC<{ count: number; size?: number; dotColor?: string }> = ({
  count,
  size = 24,
  dotColor = '#0f172a',
}) => {
  const dotSize = Math.max(3.5, Math.floor(size * 0.22));

  const renderDot = (key: string) => (
    <View
      key={key}
      style={{
        width: dotSize,
        height: dotSize,
        borderRadius: dotSize / 2,
        backgroundColor: dotColor,
      }}
    />
  );

  const renderEmpty = (key: string) => (
    <View key={key} style={{ width: dotSize, height: dotSize }} />
  );

  let grid: boolean[][] = [
    [false, false, false],
    [false, false, false],
    [false, false, false],
  ];

  if (count === 1) {
    grid[1][1] = true;
  } else if (count === 2) {
    grid[0][0] = true;
    grid[2][2] = true;
  } else if (count === 3) {
    grid[0][0] = true;
    grid[1][1] = true;
    grid[2][2] = true;
  } else if (count === 4) {
    grid[0][0] = true;
    grid[0][2] = true;
    grid[2][0] = true;
    grid[2][2] = true;
  } else if (count === 5) {
    grid[0][0] = true;
    grid[0][2] = true;
    grid[1][1] = true;
    grid[2][0] = true;
    grid[2][2] = true;
  } else if (count === 6) {
    grid[0][0] = true;
    grid[0][2] = true;
    grid[1][0] = true;
    grid[1][2] = true;
    grid[2][0] = true;
    grid[2][2] = true;
  }

  return (
    <View style={[styles.pipsContainer, { width: size, height: size }]}>
      {grid.map((row, rIdx) => (
        <View key={`pip-row-${rIdx}`} style={styles.pipsRow}>
          {row.map((active, cIdx) =>
            active ? renderDot(`dot-${rIdx}-${cIdx}`) : renderEmpty(`emp-${rIdx}-${cIdx}`)
          )}
        </View>
      ))}
    </View>
  );
};

// =========================================================================
// FICHA DE DOMINÓ (MARFIL, REMACHE METÁLICO Y ORIENTACIÓN)
// =========================================================================
export const DominoTileView: React.FC<{
  leftValue: number;
  rightValue: number;
  orientation?: 'vertical' | 'horizontal';
  isPlayable?: boolean;
  isMyTurn?: boolean;
  onPress?: () => void;
  scale?: number;
}> = ({
  leftValue,
  rightValue,
  orientation = 'vertical',
  isPlayable = false,
  isMyTurn = false,
  onPress,
  scale = 1,
}) => {
  const isHoriz = orientation === 'horizontal';
  const pipSize = Math.round(19 * scale);
  const width = isHoriz ? Math.round(62 * scale) : Math.round(34 * scale);
  const height = isHoriz ? Math.round(34 * scale) : Math.round(62 * scale);

  const isElevated = isPlayable && isMyTurn;
  const tileOpacity = isMyTurn ? (isPlayable ? 1 : 0.5) : 1;

  const TileContent = (
    <View
      style={[
        styles.tileSurface,
        {
          width,
          height,
          flexDirection: isHoriz ? 'row' : 'column',
          borderColor: isElevated ? '#6366f1' : '#cbd5e1',
          borderWidth: isElevated ? 2 : 1,
          transform: isElevated ? [{ translateY: -5 }] : [],
          opacity: onPress ? tileOpacity : 1,
        },
        isElevated && styles.playableTileGlow,
      ]}
    >
      {/* Primera mitad */}
      <View style={styles.tileHalf}>
        <DominoPips count={leftValue} size={pipSize} />
      </View>

      {/* Ranura divisoria con remache metálico central */}
      <View style={isHoriz ? styles.dividerVert : styles.dividerHoriz}>
        <View style={styles.metallicPin} />
      </View>

      {/* Segunda mitad */}
      <View style={styles.tileHalf}>
        <DominoPips count={rightValue} size={pipSize} />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={() => {
          triggerGameHaptic('selection');
          onPress();
        }}
        activeOpacity={0.8}
        disabled={!isPlayable}
        style={styles.touchableTile}
      >
        {TileContent}
      </TouchableOpacity>
    );
  }

  return TileContent;
};

// =========================================================================
// ARENA PRINCIPAL DOMINÓ
// =========================================================================
export const DominoArena: React.FC<DominoArenaProps> = ({
  myHand,
  partnerTileCount,
  boneyardCount,
  board,
  openLeft,
  openRight,
  openingTileId,
  myScore = 0,
  partnerScore = 0,
  partnerName,
  isMyTurn,
  isPlaying,
  lastAction,
  primaryColor = '#6366f1',
  onPlayTile,
  onDrawBoneyard,
  onPassTurn,
  onNewRound,
}) => {
  const { getDisplayName, getAvatarUri } = useProfile();
  const partnerProfile =
    /karl/i.test(partnerName) || partnerName === getDisplayName('Karla') ? 'Karla' : 'Javier';
  const partnerDisplayName = getDisplayName(partnerProfile);
  const partnerAvatarUri = getAvatarUri(partnerProfile);

  const boardScrollRef = useRef<any>(null);
  const [sideChoiceTile, setSideChoiceTile] = useState<DominoTile | null>(null);
  const [selectedTile, setSelectedTile] = useState<DominoTile | null>(null);
  const [isHandSorted, setIsHandSorted] = useState<boolean>(false);

  const prevBoardIdsRef = useRef<Set<string>>(new Set(board.map((b) => b.tile.id)));
  const [lastPlayedTileId, setLastPlayedTileId] = useState<string | null>(
    openingTileId || (board.length > 0 ? board[board.length - 1].tile.id : null)
  );

  useEffect(() => {
    const prevIds = prevBoardIdsRef.current;
    const newlyPlaced = board.find((b) => !prevIds.has(b.tile.id));
    if (newlyPlaced) {
      setLastPlayedTileId(newlyPlaced.tile.id);
    } else if (board.length === 0) {
      setLastPlayedTileId(null);
    }
    prevBoardIdsRef.current = new Set(board.map((b) => b.tile.id));
  }, [board]);

  const displayedHand = useMemo(() => {
    if (!isHandSorted) return myHand;
    return [...myHand].sort((a, b) => {
      const aDouble = a.left === a.right ? 1 : 0;
      const bDouble = b.left === b.right ? 1 : 0;
      if (aDouble !== bDouble) return bDouble - aDouble;
      return b.left + b.right - (a.left + a.right);
    });
  }, [myHand, isHandSorted]);

  const playableTiles = getPlayableTiles(myHand, openLeft, openRight);
  const canPlayAny = playableTiles.length > 0;
  const myPips = calculateHandPips(myHand);

  const canDraw = isMyTurn && isPlaying && !canPlayAny && boneyardCount > 0;
  const canPass = isMyTurn && isPlaying && !canPlayAny && boneyardCount === 0;

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedTile(null);
      setSideChoiceTile(null);
    }
  }, [isMyTurn]);

  // Auto-scroll del tablero cuando se coloca una nueva ficha
  useEffect(() => {
    if (board.length > 0) {
      setTimeout(() => {
        boardScrollRef.current?.scrollToEnd({ animated: true });
      }, 250);
    }
  }, [board.length]);

  const handleTilePress = (tile: DominoTile) => {
    if (!isMyTurn || !isPlaying) return;

    const playOptions = canPlayTile(tile, openLeft, openRight);

    if (playOptions.canPlayLeft && playOptions.canPlayRight) {
      // Si ambos extremos son iguales o tablero vacío, jugar directo
      if (openLeft === openRight || board.length === 0) {
        setSelectedTile(null);
        onPlayTile(tile, 'right');
      } else {
        // Encaja en ambos y son diferentes: seleccionar ficha y permitir tocar el extremo o modal
        setSelectedTile(tile);
        setSideChoiceTile(tile);
      }
    } else if (playOptions.canPlayLeft) {
      setSelectedTile(null);
      onPlayTile(tile, 'left');
    } else if (playOptions.canPlayRight) {
      setSelectedTile(null);
      onPlayTile(tile, 'right');
    }
  };

  const handleDottedEndPress = (side: 'left' | 'right') => {
    if (!isMyTurn || !isPlaying) return;
    const candidate =
      selectedTile &&
      (side === 'left'
        ? canPlayTile(selectedTile, openLeft, openRight).canPlayLeft
        : canPlayTile(selectedTile, openLeft, openRight).canPlayRight)
        ? selectedTile
        : playableTiles.find((t) =>
            side === 'left'
              ? canPlayTile(t, openLeft, openRight).canPlayLeft
              : canPlayTile(t, openLeft, openRight).canPlayRight
          );

    if (candidate) {
      triggerGameHaptic('medium');
      setSelectedTile(null);
      setSideChoiceTile(null);
      onPlayTile(candidate, side);
    }
  };

  // Cálculo dinámico del ancho de ficha para que las 7 de la mano quepan limpiamente
  const availableHandWidth = SCREEN_W - 44;
  const targetHandTileWidth = Math.min(38, Math.floor((availableHandWidth - 36) / 7));
  const handTileScale = Math.max(0.76, Math.min(1.02, targetHandTileWidth / 34));

  // Escala dinámica del tablero equilibrada para caber sin recorte en mesa
  const dynamicBoardScale =
    board.length <= 2 ? 0.98 : board.length <= 4 ? 0.86 : 0.74;

  // Dividir en filas de máx 5 fichas para formar la serpiente (boustrophedon) al llegar al borde
  const MAX_TILES_PER_ROW = 5;
  const snakeRows: DominoPlacedTile[][] = [];
  for (let i = 0; i < board.length; i += MAX_TILES_PER_ROW) {
    snakeRows.push(board.slice(i, i + MAX_TILES_PER_ROW));
  }

  return (
    <View style={styles.mainContainer}>
      {/* 1. SECCIÓN RIVAL + BARRA DE CARRERA A LA META */}
      <View style={styles.topHeaderGroup}>
        <View style={styles.rivalBar}>
          <View style={styles.rivalProfile}>
            <View style={[styles.avatarCircle, { backgroundColor: '#e2e8f0' }]}>
              {partnerAvatarUri ? (
                <Image
                  source={{ uri: partnerAvatarUri }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarLetter}>{partnerDisplayName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.rivalName} numberOfLines={1}>
              {partnerDisplayName}
            </Text>
          </View>

          {/* Fichas volteadas lisas de madera y badge del pozo */}
          <View style={styles.rivalTilesCluster}>
            <View style={styles.rivalTilesFan}>
              {Array.from({ length: Math.min(partnerTileCount, 7) }).map((_, idx) => (
                <View
                  key={`rival-tile-${idx}`}
                  style={[
                    styles.miniBackTile,
                    { marginLeft: idx === 0 ? 0 : -6 },
                  ]}
                />
              ))}
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{partnerTileCount}</Text>
            </View>

            <View style={styles.pozoBadge}>
              <Ionicons name="apps" size={13} color="#475569" />
              <Text style={styles.pozoBadgeText}>Pozo: {boneyardCount}</Text>
            </View>
          </View>
        </View>

        {/* Barra de Progreso Dual hacia DOMINO_TARGET_SCORE */}
        <View style={styles.scoreRaceStrip}>
          <Text style={styles.scoreRaceText}>Tú: {myScore}</Text>
          <View style={styles.scoreRaceTracks}>
            <View style={styles.scoreRaceTrackBg}>
              <View
                style={[
                  styles.scoreRaceFillMe,
                  { width: `${Math.min(100, (myScore / DOMINO_TARGET_SCORE) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreRaceMeta}>Meta {DOMINO_TARGET_SCORE}</Text>
            <View style={styles.scoreRaceTrackBg}>
              <View
                style={[
                  styles.scoreRaceFillPartner,
                  { width: `${Math.min(100, (partnerScore / DOMINO_TARGET_SCORE) * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text style={styles.scoreRaceText}>{partnerDisplayName}: {partnerScore}</Text>
        </View>
      </View>

      {/* 2. MESA DE FIELTRO VERDE CON BORDE DE MADERA */}
      <View style={styles.woodFrameTable}>
        <View style={styles.feltSurface}>
          {/* Indicadores de extremos abiertos */}
          {board.length > 0 && openLeft !== null && openRight !== null && (
            <View style={styles.openEndsBar}>
              <View style={styles.openEndChip}>
                <Ionicons name="chevron-back" size={12} color="#86efac" />
                <Text style={styles.openEndText}>Extremo Izq: {openLeft}</Text>
              </View>
              <View style={styles.openEndChip}>
                <Text style={styles.openEndText}>Extremo Der: {openRight}</Text>
                <Ionicons name="chevron-forward" size={12} color="#86efac" />
              </View>
            </View>
          )}

          {/* Lienzo central de la cadena con giro en serpiente (boustrophedon) */}
          <ScrollView
            ref={boardScrollRef}
            horizontal={snakeRows.length <= 1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              snakeRows.length <= 1 ? styles.chainScrollContent : styles.snakeScrollContent
            }
          >
            {board.length === 0 ? (
              <View style={styles.emptyTablePlaceholder}>
                <Ionicons name="apps" size={42} color="#15803d" />
                <Text style={styles.emptyTableTitle}>Mesa de Dominó</Text>
                <Text style={styles.emptyTableSubtitle}>
                  {isMyTurn
                    ? 'Toca cualquier ficha de tu mano para abrir la salida'
                    : `Esperando la salida de ${partnerDisplayName}...`}
                </Text>
              </View>
            ) : snakeRows.length <= 1 ? (
              <>
                {/* Zona de destino punteada izquierda interactiva */}
                {openLeft !== null && (
                  <TouchableOpacity
                    style={styles.targetDottedEnd}
                    onPress={() => handleDottedEndPress('left')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="chevron-back" size={13} color="#86efac" />
                    <Text style={styles.targetDottedText}>{openLeft}</Text>
                  </TouchableOpacity>
                )}

                {/* Cadena de fichas inicial (1 fila) */}
                {board.map((item, idx) => {
                  const isDouble = item.tile.left === item.tile.right;
                  const orientation = isDouble ? 'vertical' : 'horizontal';
                  const isLastPlayed = item.tile.id === lastPlayedTileId;

                  return (
                    <View
                      key={`placed-${idx}-${item.tile.id}`}
                      style={[
                        styles.placedTileSlot,
                        {
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginHorizontal: isDouble ? 3 : 2,
                        },
                        isLastPlayed && styles.lastPlayedTileHighlight,
                      ]}
                    >
                      <DominoTileView
                        leftValue={item.placedLeft}
                        rightValue={item.placedRight}
                        orientation={orientation}
                        scale={dynamicBoardScale}
                      />
                    </View>
                  );
                })}

                {/* Zona de destino punteada derecha interactiva */}
                {openRight !== null && (
                  <TouchableOpacity
                    style={styles.targetDottedEnd}
                    onPress={() => handleDottedEndPress('right')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.targetDottedText}>{openRight}</Text>
                    <Ionicons name="chevron-forward" size={13} color="#86efac" />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* Modo Serpiente Multi-fila cuando la cadena dobla al llegar al borde */
              <View style={styles.snakeContainer}>
                {snakeRows.map((rowTiles, rIdx) => {
                  const isReversed = rIdx % 2 === 1;
                  const isFirstRow = rIdx === 0;
                  const isLastRow = rIdx === snakeRows.length - 1;

                  return (
                    <View key={`snake-row-${rIdx}`} style={styles.snakeRowWrapper}>
                      <View
                        style={[
                          styles.snakeRow,
                          { flexDirection: isReversed ? 'row-reverse' : 'row' },
                        ]}
                      >
                        {isFirstRow && openLeft !== null && (
                          <TouchableOpacity
                            style={styles.targetDottedEnd}
                            onPress={() => handleDottedEndPress('left')}
                            activeOpacity={0.75}
                          >
                            <Ionicons name="chevron-back" size={12} color="#86efac" />
                            <Text style={styles.targetDottedText}>{openLeft}</Text>
                          </TouchableOpacity>
                        )}

                        {rowTiles.map((item, cIdx) => {
                          const isDouble = item.tile.left === item.tile.right;
                          const orientation = isDouble ? 'vertical' : 'horizontal';
                          const isLastPlayed = item.tile.id === lastPlayedTileId;
                          // En fila invertida se invierte visualmente izq/der para mantener la continuidad de conectores
                          const dispLeft = isReversed ? item.placedRight : item.placedLeft;
                          const dispRight = isReversed ? item.placedLeft : item.placedRight;

                          return (
                            <View
                              key={`snake-tile-${rIdx}-${cIdx}-${item.tile.id}`}
                              style={[
                                styles.placedTileSlot,
                                { marginHorizontal: isDouble ? 2 : 1.5 },
                                isLastPlayed && styles.lastPlayedTileHighlight,
                              ]}
                            >
                              <DominoTileView
                                leftValue={dispLeft}
                                rightValue={dispRight}
                                orientation={orientation}
                                scale={dynamicBoardScale}
                              />
                            </View>
                          );
                        })}

                        {isLastRow && openRight !== null && (
                          <TouchableOpacity
                            style={styles.targetDottedEnd}
                            onPress={() => handleDottedEndPress('right')}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.targetDottedText}>{openRight}</Text>
                            <Ionicons
                              name={isReversed ? 'chevron-back' : 'chevron-forward'}
                              size={12}
                              color="#86efac"
                            />
                          </TouchableOpacity>
                        )}
                      </View>

                      {!isLastRow && (
                        <View
                          style={[
                            styles.snakeTurnCorner,
                            isReversed ? { alignSelf: 'flex-start', marginLeft: 18 } : { alignSelf: 'flex-end', marginRight: 18 },
                          ]}
                        >
                          <Ionicons name="return-down-back" size={13} color="#86efac" />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Registro de la última jugada debajo de la mesa */}
          {lastAction ? (
            <View style={styles.lastActionBar}>
              <Ionicons name="sparkles" size={12} color="#fef08a" />
              <Text style={styles.lastActionText} numberOfLines={1}>
                {lastAction}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 3. DOCK INFERIOR: MANO DEL JUGADOR LOCAL */}
      <View style={styles.playerDock}>
        <View style={styles.dockHeader}>
          <View style={styles.dockTitleGroup}>
            <Text style={styles.dockTitle} numberOfLines={1}>
              Fichas ({myHand.length})
            </Text>
            <Text style={styles.dockPips} numberOfLines={1}>
              {myPips} pts
            </Text>
          </View>

          {/* Acciones de turno unificadas */}
          <View style={styles.dockActions}>
            {/* Botón Ordenar mano */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                { backgroundColor: isHandSorted ? '#4f46e5' : '#475569' },
              ]}
              onPress={() => {
                void triggerGameHaptic('selection');
                setIsHandSorted((prev) => !prev);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical-outline" size={14} color="#ffffff" />
              <Text style={styles.dockBtnText}>{isHandSorted ? 'Ordenado' : 'Ordenar'}</Text>
            </TouchableOpacity>

            {/* Botón Robar */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                { backgroundColor: canDraw ? '#6366f1' : '#cbd5e1' },
              ]}
              disabled={!canDraw}
              onPress={() => {
                triggerGameHaptic('medium');
                onDrawBoneyard();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="apps-outline" size={14} color="#ffffff" />
              <Text style={styles.dockBtnText}>Robar ({boneyardCount})</Text>
            </TouchableOpacity>

            {/* Botón Pasar */}
            <TouchableOpacity
              style={[
                styles.dockBtn,
                { backgroundColor: canPass ? '#e11d48' : '#cbd5e1' },
              ]}
              disabled={!canPass}
              onPress={() => {
                triggerGameHaptic('warning');
                onPassTurn();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-undo-outline" size={14} color="#ffffff" />
              <Text style={styles.dockBtnText}>Pasar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rack de fichas del jugador */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.handScrollView}
          contentContainerStyle={styles.handTilesRow}
        >
          {displayedHand.map((tile) => {
            const playCheck = canPlayTile(tile, openLeft, openRight);
            const isPlayable = isMyTurn && isPlaying && playCheck.canPlayAny;

            return (
              <View key={`my-tile-${tile.id}`} style={styles.handTileBox}>
                <DominoTileView
                  leftValue={tile.left}
                  rightValue={tile.right}
                  orientation="vertical"
                  isPlayable={isPlayable}
                  isMyTurn={isMyTurn}
                  scale={handTileScale}
                  onPress={isPlayable ? () => handleTilePress(tile) : undefined}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. MODAL PARA ELEGIR EXTREMO SI ENCAJA EN AMBOS */}
      <Modal
        visible={Boolean(sideChoiceTile)}
        transparent
        animationType="fade"
        onRequestClose={() => setSideChoiceTile(null)}
      >
        <View style={styles.choiceBackdrop}>
          <View style={styles.choiceCard}>
            <Text style={styles.choiceTitle}>¿En qué extremo colocarás la ficha?</Text>
            <Text style={styles.choiceSubtitle}>
              Tu ficha {sideChoiceTile?.left}-{sideChoiceTile?.right} coincide en ambos lados:
            </Text>

            <View style={styles.choiceBtnsRow}>
              <TouchableOpacity
                style={[styles.sideChoiceBtn, { backgroundColor: '#3b82f6' }]}
                onPress={() => {
                  if (sideChoiceTile) {
                    onPlayTile(sideChoiceTile, 'left');
                    setSideChoiceTile(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chevron-back" size={18} color="#ffffff" />
                <Text style={styles.sideChoiceBtnText}>Extremo Izq ({openLeft})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sideChoiceBtn, { backgroundColor: '#10b981' }]}
                onPress={() => {
                  if (sideChoiceTile) {
                    onPlayTile(sideChoiceTile, 'right');
                    setSideChoiceTile(null);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.sideChoiceBtnText}>Extremo Der ({openRight})</Text>
                <Ionicons name="chevron-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelChoiceBtn}
              onPress={() => setSideChoiceTile(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelChoiceText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%' as const,
    maxWidth: '100%' as const,
    overflow: 'hidden' as const,
    backgroundColor: '#fff5f7',
    justifyContent: 'space-between',
  },
  // 1. Barra Rival
  rivalBar: {
    minHeight: 40,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    gap: 8,
  },
  rivalProfile: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  topHeaderGroup: {
    alignSelf: 'stretch' as const,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
    gap: 5,
  },
  scoreRaceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scoreRaceText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
  },
  scoreRaceTracks: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreRaceTrackBg: {
    flex: 1,
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreRaceFillMe: {
    height: '100%' as const,
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  scoreRaceFillPartner: {
    height: '100%' as const,
    backgroundColor: '#f43f5e',
    borderRadius: 3,
  },
  scoreRaceMeta: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
  },
  lastPlayedTileHighlight: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#facc15',
    padding: 1,
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLetter: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  rivalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flexShrink: 1,
  },
  rivalTileCountLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  rivalTilesCluster: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rivalTilesFan: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBackTile: {
    width: 14,
    height: 24,
    backgroundColor: '#5c2b09',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#3d1a03',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  pozoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pozoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // 2. Mesa con Marco de Madera y Fieltro Verde
  woodFrameTable: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#78350f', // Marco de madera cálida
    borderRadius: 24,
    padding: 6,
    borderWidth: 2,
    borderColor: '#451a03',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  feltSurface: {
    flex: 1,
    backgroundColor: '#166534', // Fieltro verde de mesa
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#14532d',
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  openEndsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openEndChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e40',
  },
  openEndText: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '700',
  },
  chainScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: '100%',
    justifyContent: 'center',
  },
  snakeScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: '100%',
  },
  snakeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  snakeRowWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  snakeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snakeTurnCorner: {
    paddingVertical: 1,
  },
  emptyTablePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 4,
  },
  emptyTableTitle: {
    color: '#bbf7d0',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptyTableSubtitle: {
    color: '#86efac',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },
  placedTileSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetDottedEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#86efac',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  targetDottedText: {
    color: '#bbf7d0',
    fontSize: 14,
    fontWeight: '800',
  },
  lastActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    alignSelf: 'center',
    maxWidth: '92%',
  },
  lastActionText: {
    color: '#fef08a',
    fontSize: 11.5,
    fontWeight: '600',
  },

  // 3. Dock Inferior
  playerDock: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handScrollView: {
    height: 76,
    flexGrow: 0,
  },
  dockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  dockTitleGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dockPips: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  dockActions: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dockBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  handTilesRow: {
    minWidth: '100%' as const,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 5,
    paddingHorizontal: 4,
    gap: 6,
    justifyContent: 'center',
  },
  handTileBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchableTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ficha de Dominó Individual
  tileSurface: {
    backgroundColor: '#fffdfa', // Marfil
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  playableTileGlow: {
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  tileHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerHoriz: {
    width: '84%',
    height: 1.5,
    backgroundColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dividerVert: {
    height: '84%',
    width: 1.5,
    backgroundColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  metallicPin: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ca8a04',
    borderWidth: 0.5,
    borderColor: '#a16207',
    position: 'absolute',
  },

  // Matriz de Puntos
  pipsContainer: {
    justifyContent: 'space-between',
    padding: 2,
  },
  pipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Modal Selección Extremo
  choiceBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  choiceCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  choiceTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  choiceSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
  },
  choiceBtnsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sideChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sideChoiceBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  cancelChoiceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelChoiceText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});

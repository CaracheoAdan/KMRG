import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import Svg, { Rect, Circle, Ellipse, Text as SvgText, G, Path } from 'react-native-svg';
import { UnoCard, UnoColor, UserProfile } from '../../types';
import { Ionicons } from '../ui/Icon';
import { triggerGameHaptic } from '../../theme/gamesTheme';
import { canPlayUnoCard, getPlayableUnoCards, UNO_TARGET_SCORE } from './uno/unoLogic';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '../../contexts/ProfileContext';

export interface UnoArenaProps {
  myHand: UnoCard[];
  partnerCardCount: number;
  deckCount: number;
  currentCard: UnoCard;
  currentColor: 'red' | 'yellow' | 'green' | 'blue';
  partnerName: string;
  isMyTurn: boolean;
  isPlaying: boolean;
  hasDrawnThisTurn?: boolean;
  myScore?: number;
  partnerScore?: number;
  calledUnoPartner: boolean;
  calledUnoSelf: boolean;
  lastAction?: string | null;
  primaryColor?: string;
  onPlayCard: (card: UnoCard, chosenColor?: 'red' | 'yellow' | 'green' | 'blue') => void;
  onDrawCard: () => void;
  onPassTurn?: () => void;
  onCallUno: () => void;
  onCatchUnoMiss: () => void;
  onNewRound: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export const COLOR_MAP: Record<'red' | 'yellow' | 'green' | 'blue' | 'wild', string> = {
  red: '#ef4444',
  yellow: '#eab308',
  green: '#10b981',
  blue: '#3b82f6',
  wild: '#1e1b4b',
};

const COLOR_NAMES_ES: Record<'red' | 'yellow' | 'green' | 'blue', string> = {
  red: 'Rojo',
  yellow: 'Amarillo',
  green: 'Verde',
  blue: 'Azul',
};

// =========================================================================
// COMPONENTE DE CARTA UNO (VECTORIAL / ESTILO OFICIAL)
// =========================================================================
export const UnoCardView: React.FC<{
  card: UnoCard;
  isPlayable?: boolean;
  isMyTurn?: boolean;
  onPress?: () => void;
  scale?: number;
  faceDown?: boolean;
}> = ({ card, isPlayable = false, isMyTurn = false, onPress, scale = 1, faceDown = false }) => {
  const cardW = Math.round(58 * scale);
  const cardH = Math.round(86 * scale);
  const baseColor = faceDown ? '#b91c1c' : COLOR_MAP[card.color];

  const isElevated = isPlayable && isMyTurn;
  const cardOpacity = faceDown
    ? 1
    : isMyTurn
    ? isPlayable
      ? 1
      : 0.52
    : 0.95;

  const renderCardSymbol = (fontSize: number, isCenter: boolean = false) => {
    switch (card.value) {
      case 'skip':
        return <Text style={[styles.cardSymbolText, { fontSize, color: isCenter ? baseColor : '#ffffff' }]}>⊘</Text>;
      case 'reverse':
        return <Text style={[styles.cardSymbolText, { fontSize, color: isCenter ? baseColor : '#ffffff' }]}>🔁</Text>;
      case 'draw2':
        return <Text style={[styles.cardSymbolText, { fontSize: fontSize * 0.9, fontWeight: '900', color: isCenter ? baseColor : '#ffffff' }]}>+2</Text>;
      case 'wild_draw4':
        return <Text style={[styles.cardSymbolText, { fontSize: fontSize * 0.85, fontWeight: '900', color: isCenter ? '#ffffff' : '#ffffff' }]}>+4</Text>;
      case 'wild':
        return isCenter ? (
          <View style={styles.wildCenterQuad}>
            <View style={[styles.quadPiece, { backgroundColor: COLOR_MAP.red }]} />
            <View style={[styles.quadPiece, { backgroundColor: COLOR_MAP.blue }]} />
            <View style={[styles.quadPiece, { backgroundColor: COLOR_MAP.yellow }]} />
            <View style={[styles.quadPiece, { backgroundColor: COLOR_MAP.green }]} />
          </View>
        ) : (
          <Text style={[styles.cardSymbolText, { fontSize: fontSize * 0.8, color: '#ffffff' }]}>🌈</Text>
        );
      default:
        return (
          <Text
            style={[
              styles.cardCenterNum,
              {
                fontSize,
                color: card.color === 'wild' ? '#ffffff' : isCenter ? baseColor : '#ffffff',
              },
            ]}
          >
            {card.value}
          </Text>
        );
    }
  };

  const CardGraphic = (
    <View
      style={[
        styles.unoCardContainer,
        {
          width: cardW,
          height: cardH,
          backgroundColor: baseColor,
          opacity: cardOpacity,
          transform: isElevated ? [{ translateY: -12 }] : [],
          borderColor: isElevated ? '#f59e0b' : '#ffffff',
          borderWidth: isElevated ? 3 : 2,
        },
        isElevated && styles.playableCardGlow,
      ]}
    >
      {faceDown ? (
        <View style={styles.cardBackBody}>
          <View style={styles.cardBackOval}>
            <Text style={styles.cardBackUnoText}>UNO</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Índice superior izquierdo */}
          <View style={styles.cornerTopLeft}>
            {renderCardSymbol(Math.round(11 * scale), false)}
          </View>

          {/* Óvalo central inclinado */}
          <View style={styles.ovalCenterWrap}>
            <View
              style={[
                styles.ovalCenter,
                {
                  width: Math.round(cardW * 0.76),
                  height: Math.round(cardH * 0.58),
                  backgroundColor: card.color === 'wild' ? '#1e1b4b' : '#ffffff',
                },
              ]}
            >
              {renderCardSymbol(Math.round(card.value.length > 2 ? 14 * scale : 24 * scale), true)}
            </View>
          </View>

          {/* Índice inferior derecho invertido */}
          <View style={styles.cornerBottomRight}>
            {renderCardSymbol(Math.round(11 * scale), false)}
          </View>
        </>
      )}
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
        style={styles.touchableCard}
      >
        {CardGraphic}
      </TouchableOpacity>
    );
  }

  return CardGraphic;
};

// =========================================================================
// ARENA PRINCIPAL UNO
// =========================================================================
export const UnoArena: React.FC<UnoArenaProps> = ({
  myHand,
  partnerCardCount,
  deckCount,
  currentCard,
  currentColor,
  partnerName,
  isMyTurn,
  isPlaying,
  hasDrawnThisTurn: propHasDrawn = false,
  myScore = 0,
  partnerScore = 0,
  calledUnoPartner,
  calledUnoSelf,
  lastAction,
  primaryColor = '#ef4444',
  onPlayCard,
  onDrawCard,
  onPassTurn,
  onCallUno,
  onCatchUnoMiss,
  onNewRound,
}) => {
  const insets = useSafeAreaInsets();
  const { getDisplayName, getAvatarUri } = useProfile();
  const partnerProfile: UserProfile =
    /karl/i.test(partnerName) || partnerName === getDisplayName('Karla') ? 'Karla' : 'Javier';
  const partnerDisplayName = getDisplayName(partnerProfile);
  const partnerAvatarUri = getAvatarUri(partnerProfile);

  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);
  const [localHasDrawn, setLocalHasDrawn] = useState<boolean>(false);
  const [isHandSorted, setIsHandSorted] = useState<boolean>(false);
  const hasDrawnThisTurn = propHasDrawn || localHasDrawn;

  const COLOR_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
  const VALUE_ORDER: Record<string, number> = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    skip: 10, reverse: 11, draw2: 12, wild: 13, wild_draw4: 14,
  };
  const ACTION_BANNER_MAP: Record<string, { label: string; bg: string }> = {
    draw2: { label: '+2 ¡Roba Dos!', bg: '#dc2626' },
    wild_draw4: { label: '+4 ¡Comodín +4!', bg: '#7c3aed' },
    skip: { label: '⊘ ¡Salta Turno!', bg: '#ea580c' },
    reverse: { label: '🔁 ¡Reversa!', bg: '#0284c7' },
    wild: { label: '🌈 ¡Comodín!', bg: '#4f46e5' },
  };
  const actionBanner = ACTION_BANNER_MAP[currentCard.value] || null;

  const displayedHand = useMemo(() => {
    if (!isHandSorted) return myHand;
    return [...myHand].sort((a, b) => {
      const colDiff = (COLOR_ORDER[a.color] ?? 9) - (COLOR_ORDER[b.color] ?? 9);
      if (colDiff !== 0) return colDiff;
      return (VALUE_ORDER[a.value] ?? 99) - (VALUE_ORDER[b.value] ?? 99);
    });
  }, [myHand, isHandSorted]);

  // Animación continua para la flecha de giro y rebote al jugar carta
  const arrowSpinAnim = useRef(new Animated.Value(0)).current;
  const discardPopAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowSpinAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(arrowSpinAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [arrowSpinAnim]);

  useEffect(() => {
    discardPopAnim.setValue(0.84);
    Animated.spring(discardPopAnim, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [currentCard.id, discardPopAnim]);

  useEffect(() => {
    if (!isMyTurn) {
      setLocalHasDrawn(false);
    }
  }, [isMyTurn]);

  const playableCards = getPlayableUnoCards(myHand, currentCard, currentColor);
  const canPlayAny = playableCards.length > 0;
  const partnerHasUno = partnerCardCount === 1;
  // Permite pescar falta en cualquier momento mientras al rival le quede 1 carta y no haya cantado UNO
  const canCatchPartner = partnerHasUno && !calledUnoPartner && isPlaying;
  const canShoutUno = myHand.length <= 2 && isPlaying;
  const canDraw = isMyTurn && isPlaying && !hasDrawnThisTurn;
  const canPassAfterDraw = isMyTurn && isPlaying && hasDrawnThisTurn && Boolean(onPassTurn);

  const arrowTranslateX = arrowSpinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [-3, 3, -3],
  });
  const arrowScale = arrowSpinAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.95, 1.12, 0.95],
  });

  const handleCardPress = (card: UnoCard) => {
    if (!isMyTurn || !isPlaying) return;

    if (card.color === 'wild') {
      setPendingWildCard(card);
    } else {
      onPlayCard(card);
    }
  };

  const handleChooseColor = (color: 'red' | 'yellow' | 'green' | 'blue') => {
    if (pendingWildCard) {
      onPlayCard(pendingWildCard, color);
      setPendingWildCard(null);
    }
  };

  const currentColorHex = COLOR_MAP[currentColor];

  return (
    <View style={styles.mainContainer}>
      {/* 1. SECCIÓN RIVAL (Arriba: sin texto de cartas duplicado) */}
      {/* 1. SECCIÓN RIVAL + BARRA DE CARRERA A LA META */}
      <View style={styles.topHeaderGroup}>
        <View style={styles.rivalBar}>
          <View style={styles.rivalProfile}>
            <View style={[styles.avatarCircle, { backgroundColor: '#e2e8f0' }]}>
              {partnerAvatarUri ? (
                <Image source={{ uri: partnerAvatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{partnerDisplayName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <Text style={styles.rivalName} numberOfLines={1}>
              {partnerDisplayName}
            </Text>
          </View>

          {/* Abanico de cartas boca abajo del rival (máx 7 visibles) con insignia numérica */}
          <View style={styles.rivalCardsCluster}>
            <View style={styles.fanRow}>
              {Array.from({ length: Math.min(partnerCardCount, 7) }).map((_, idx) => (
                <View
                  key={`rival-card-${idx}`}
                  style={[
                    styles.miniFaceDownCard,
                    {
                      marginLeft: idx === 0 ? 0 : -10,
                      transform: [{ rotate: `${(idx - 3) * 4}deg` }],
                    },
                  ]}
                >
                  <View style={styles.miniCardInnerOval} />
                </View>
              ))}
            </View>

            {/* Badge con el conteo exacto */}
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{partnerCardCount}</Text>
            </View>

            {/* Badge ámbar si le queda 1 carta */}
            {partnerHasUno && (
              <View style={styles.amberUnoBadge}>
                <Ionicons name="sparkles" size={12} color="#ffffff" />
                <Text style={styles.amberUnoText}>¡UNO!</Text>
              </View>
            )}

            {/* Botón para pescar falta al rival si no cantó UNO */}
            {canCatchPartner && (
              <TouchableOpacity
                style={styles.catchPenaltyBtn}
                onPress={() => {
                  triggerGameHaptic('warning');
                  onCatchUnoMiss();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={12} color="#ffffff" />
                <Text style={styles.catchPenaltyText}>¡Pescar Falta! (+2)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Barra de Carrera a UNO_TARGET_SCORE */}
        <View style={styles.scoreRaceStrip}>
          <Text style={styles.scoreRaceText}>Tú: {myScore}</Text>
          <View style={styles.scoreRaceTracks}>
            <View style={styles.scoreRaceTrackBg}>
              <View
                style={[
                  styles.scoreRaceFillMe,
                  { width: `${Math.min(100, (myScore / UNO_TARGET_SCORE) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.scoreRaceMeta}>Meta {UNO_TARGET_SCORE}</Text>
            <View style={styles.scoreRaceTrackBg}>
              <View
                style={[
                  styles.scoreRaceFillPartner,
                  { width: `${Math.min(100, (partnerScore / UNO_TARGET_SCORE) * 100)}%` },
                ]}
              />
            </View>
          </View>
          <Text style={styles.scoreRaceText}>{partnerDisplayName}: {partnerScore}</Text>
        </View>
      </View>

      {/* 2. MESA DE FIELTRO VERDE PROFUNDO (Área de juego flex: 1, space-evenly) */}
      <View style={styles.feltTable}>
        <View style={styles.tableInnerBorder}>
          {/* Chip de Color Activo + Banner animado para Cartas de Acción/Comodín */}
          <View style={styles.activeColorBar}>
            <View style={[styles.colorChip, { borderColor: currentColorHex }]}>
              <View style={[styles.colorBubble, { backgroundColor: currentColorHex }]} />
              <Text style={styles.colorChipText}>Color: {COLOR_NAMES_ES[currentColor]}</Text>
            </View>
            {actionBanner && (
              <Animated.View
                style={[
                  styles.actionBannerPill,
                  { backgroundColor: actionBanner.bg, transform: [{ scale: discardPopAnim }] },
                ]}
              >
                <Text style={styles.actionBannerText}>{actionBanner.label}</Text>
              </Animated.View>
            )}
          </View>

          {/* Mazo de Robo y Descarte lado a lado (~1.5x agrandados) */}
          <View style={styles.tableCenterPlay}>
            {/* MAZO DE ROBO */}
            <TouchableOpacity
              style={styles.deckPileWrap}
              onPress={() => {
                if (canDraw) {
                  triggerGameHaptic('medium');
                  setLocalHasDrawn(true);
                  onDrawCard();
                }
              }}
              disabled={!canDraw}
              activeOpacity={0.8}
            >
              {/* Apilamiento 3D */}
              <View style={[styles.deckShadowCard, { top: 4, left: 4 }]} />
              <View style={[styles.deckShadowCard, { top: 2, left: 2 }]} />
              <View style={styles.deckTopCard}>
                <View style={styles.deckOval}>
                  <Text style={styles.deckLogo}>UNO</Text>
                </View>
                <View style={styles.deckBadge}>
                  <Text style={styles.deckBadgeText}>{deckCount}</Text>
                </View>
              </View>
              <Text style={styles.deckHintText}>
                {canDraw ? 'Robar carta' : 'Mazo'}
              </Text>
            </TouchableOpacity>

            {/* Flecha de Dirección / Giro Animada */}
            <Animated.View
              style={[
                styles.directionArrowWrap,
                { transform: [{ translateX: arrowTranslateX }, { scale: arrowScale }] },
              ]}
            >
              <Ionicons name="swap-horizontal" size={24} color="#86efac" />
              <Text style={styles.directionArrowText}>Giro</Text>
            </Animated.View>

            {/* PILA DE DESCARTE (~1.5x) CON ANIMACIÓN DE ESCALA */}
            <Animated.View
              style={[
                styles.discardPileWrap,
                { transform: [{ scale: discardPopAnim }] },
              ]}
            >
              <View
                style={[
                  styles.glowingDiscardHalo,
                  { borderColor: currentColorHex, shadowColor: currentColorHex },
                ]}
              >
                <UnoCardView card={currentCard} scale={1.48} />
              </View>
              <Text style={styles.discardHintText}>En juego</Text>
            </Animated.View>
          </View>

          {/* 3. REGISTRO DE ÚLTIMA JUGADA: Una sola línea limpia */}
          {lastAction ? (
            <View style={styles.lastActionBar}>
              <Ionicons name="sparkles" size={13} color="#fef08a" />
              <Text style={styles.lastActionText} numberOfLines={1}>
                {lastAction}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* 4. DOCK INFERIOR: MANO DEL JUGADOR LOCAL */}
      <View style={[styles.playerDock, { paddingBottom: Math.max(insets.bottom, 0) + 12 }]}>
        <View style={styles.dockHeader}>
          <View style={styles.dockTitleWrap}>
            <Text style={styles.dockTitle}>
              Tus Cartas ({myHand.length})
            </Text>
            {(myScore > 0 || partnerScore > 0) && (
              <Text style={styles.dockScoreText}>
                Meta: {myScore} / {UNO_TARGET_SCORE} pts
              </Text>
            )}
          </View>

          <View style={styles.dockRightControls}>
            {/* Botón Ordenar mano por color */}
            <TouchableOpacity
              style={[
                styles.dockActionBtn,
                { backgroundColor: isHandSorted ? '#4f46e5' : '#475569' },
              ]}
              onPress={() => {
                void triggerGameHaptic('selection');
                setIsHandSorted((prev) => !prev);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical-outline" size={14} color="#ffffff" />
              <Text style={styles.dockActionBtnText}>Ordenar</Text>
            </TouchableOpacity>

            {/* Botón Robar o Pasar tras robar */}
            {canPassAfterDraw ? (
              <TouchableOpacity
                style={[styles.dockActionBtn, { backgroundColor: '#e11d48' }]}
                onPress={() => {
                  triggerGameHaptic('warning');
                  setLocalHasDrawn(false);
                  onPassTurn?.();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-undo-outline" size={15} color="#ffffff" />
                <Text style={styles.dockActionBtnText}>Pasar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.dockActionBtn,
                  { backgroundColor: canDraw ? '#6366f1' : '#cbd5e1' },
                ]}
                disabled={!canDraw}
                onPress={() => {
                  triggerGameHaptic('medium');
                  setLocalHasDrawn(true);
                  onDrawCard();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="albums-outline" size={15} color="#ffffff" />
                <Text style={styles.dockActionBtnText}>Robar</Text>
              </TouchableOpacity>
            )}

            {/* Botón Gritar ¡UNO! (Primary, se activa con 2 cartas o menos) */}
            <TouchableOpacity
              style={[
                styles.dockActionBtn,
                calledUnoSelf
                  ? { backgroundColor: '#10b981' }
                  : canShoutUno
                  ? { backgroundColor: '#f59e0b' }
                  : { backgroundColor: '#e2e8f0' },
              ]}
              disabled={!canShoutUno || calledUnoSelf}
              onPress={() => {
                triggerGameHaptic('heavy');
                onCallUno();
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={calledUnoSelf ? 'checkmark-circle' : 'sparkles'}
                size={14}
                color={canShoutUno || calledUnoSelf ? '#ffffff' : '#94a3b8'}
              />
              <Text
                style={[
                  styles.dockActionBtnText,
                  { color: canShoutUno || calledUnoSelf ? '#ffffff' : '#94a3b8' },
                ]}
              >
                {calledUnoSelf ? '¡UNO!' : '¡UNO!'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scroll horizontal con solapamiento limpio de cartas */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.handScrollView}
          contentContainerStyle={[
            styles.handScrollRow,
            myHand.length > 7 && { paddingRight: 24 },
          ]}
        >
          {displayedHand.map((card, idx) => {
            const isPlayable =
              isMyTurn &&
              isPlaying &&
              canPlayUnoCard(card, currentCard, currentColor, myHand);

            return (
              <View
                key={`uno-card-${card.id}-${idx}`}
                style={[
                  styles.handCardSlot,
                  { marginLeft: idx === 0 ? 4 : -14 },
                ]}
              >
                <UnoCardView
                  card={card}
                  isPlayable={isPlayable}
                  isMyTurn={isMyTurn}
                  scale={1.05}
                  onPress={isPlayable ? () => handleCardPress(card) : undefined}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 5. MODAL DE SELECCIÓN DE COLOR PARA COMODINES */}
      <Modal
        visible={Boolean(pendingWildCard)}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingWildCard(null)}
      >
        <View style={styles.wildModalBackdrop}>
          <View style={styles.wildModalCard}>
            <Text style={styles.wildModalTitle}>🌈 ¡Elige el color a jugar!</Text>
            <Text style={styles.wildModalSubtitle}>
              Selecciona el color que debe coincidir en la mesa:
            </Text>

            <View style={styles.wildColorsGrid}>
              <TouchableOpacity
                style={[styles.wildColorBtn, { backgroundColor: COLOR_MAP.red }]}
                onPress={() => handleChooseColor('red')}
                activeOpacity={0.8}
              >
                <Text style={styles.wildColorBtnText}>❤️ Rojo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wildColorBtn, { backgroundColor: COLOR_MAP.yellow }]}
                onPress={() => handleChooseColor('yellow')}
                activeOpacity={0.8}
              >
                <Text style={[styles.wildColorBtnText, { color: '#000000' }]}>💛 Amarillo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wildColorBtn, { backgroundColor: COLOR_MAP.green }]}
                onPress={() => handleChooseColor('green')}
                activeOpacity={0.8}
              >
                <Text style={styles.wildColorBtnText}>💚 Verde</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.wildColorBtn, { backgroundColor: COLOR_MAP.blue }]}
                onPress={() => handleChooseColor('blue')}
                activeOpacity={0.8}
              >
                <Text style={styles.wildColorBtnText}>💙 Azul</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.wildCancelBtn}
              onPress={() => setPendingWildCard(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.wildCancelText}>Cancelar</Text>
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
    height: 56,
    minHeight: 56,
    maxHeight: 60,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rivalProfile: {
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
    width: '100%' as const,
    flexShrink: 0,
  },
  scoreRaceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
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
    backgroundColor: '#ef4444',
    borderRadius: 3,
  },
  scoreRaceFillPartner: {
    height: '100%' as const,
    backgroundColor: '#ec4899',
    borderRadius: 3,
  },
  scoreRaceMeta: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
  },
  actionBannerPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  actionBannerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
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
  },
  rivalCardCountLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  rivalCardsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fanRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniFaceDownCard: {
    width: 22,
    height: 32,
    backgroundColor: '#b91c1c',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  miniCardInnerOval: {
    width: 12,
    height: 18,
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    transform: [{ rotate: '-20deg' }],
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
  amberUnoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amberUnoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  catchPenaltyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  catchPenaltyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // 2. Mesa de Fieltro
  feltTable: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 4,
    backgroundColor: '#14412c', // Fieltro verde profundo
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#0b2619',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  tableInnerBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#22593d',
    borderRadius: 20,
    margin: 4,
    justifyContent: 'space-evenly',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  activeColorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  colorBubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  colorChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tableCenterPlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  directionArrowWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  directionArrowText: {
    color: '#86efac',
    fontSize: 10.5,
    fontWeight: '700',
  },
  deckPileWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  deckShadowCard: {
    position: 'absolute',
    width: 86,
    height: 126,
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ffffff40',
  },
  deckTopCard: {
    width: 86,
    height: 126,
    backgroundColor: '#b91c1c',
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  deckOval: {
    width: 62,
    height: 86,
    backgroundColor: '#1e1b4b',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-20deg' }],
  },
  deckLogo: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  deckBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  deckBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  deckHintText: {
    marginTop: 8,
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '600',
  },
  discardPileWrap: {
    alignItems: 'center',
  },
  glowingDiscardHalo: {
    borderRadius: 12,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  discardHintText: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
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

  // 3. Dock Inferior de la Mano
  playerDock: {
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  handScrollView: {
    height: 112,
    flexGrow: 0,
  },
  dockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dockTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  dockScoreText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#6366f1',
  },
  dockRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dockActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  dockActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  shoutUnoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  shoutUnoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  dockDrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366f1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  dockDrawText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  handScrollRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 14,
    paddingBottom: 6,
    paddingHorizontal: 6,
  },
  handCardSlot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  touchableCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Carta UNO Individual
  unoCardContainer: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  playableCardGlow: {
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 3,
    left: 4,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 3,
    right: 4,
    transform: [{ rotate: '180deg' }],
  },
  ovalCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-22deg' }],
  },
  ovalCenter: {
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenterNum: {
    fontWeight: '900',
  },
  cardSymbolText: {
    fontWeight: '900',
  },
  wildCenterQuad: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  quadPiece: {
    width: '50%',
    height: '50%',
  },
  cardBackBody: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackOval: {
    width: '82%',
    height: '62%',
    backgroundColor: '#1e1b4b',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-22deg' }],
  },
  cardBackUnoText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },

  // Modal Comodín
  wildModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  wildModalCard: {
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
  wildModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  wildModalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 18,
  },
  wildColorsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  wildColorBtn: {
    width: '48%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  wildColorBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  wildCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  wildCancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});

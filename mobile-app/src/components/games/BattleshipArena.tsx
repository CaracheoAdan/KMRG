import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import {
  GamesState,
  BattleshipShip,
  createRandomBattleshipFleet,
} from '../../services/CoupleSyncService';
import { UserProfile } from '../../types';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  currentProfile: UserProfile;
  battleshipState: GamesState['battleship'];
  onSendInvite: () => void;
  onAcceptInvite: () => void;
  onReadyFleet: (fleet: BattleshipShip[]) => void;
  onFire: (idx: number) => void;
  onReset: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

const COLS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROWS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SHIP_CONFIG: Record<
  string,
  { name: string; size: number; bg: string; icon: string; desc: string }
> = {
  carrier: {
    name: 'Portaaviones',
    size: 5,
    bg: '#f43f5e',
    icon: 'airplane',
    desc: 'Cubierta naval para cazas',
  },
  battleship: {
    name: 'Acorazado',
    size: 4,
    bg: '#f59e0b',
    icon: 'shield',
    desc: 'Torretas blindadas de artillería',
  },
  cruiser: {
    name: 'Crucero',
    size: 3,
    bg: '#8b5cf6',
    icon: 'boat',
    desc: 'Chimeneas navales gemelas',
  },
  submarine: {
    name: 'Submarino',
    size: 3,
    bg: '#10b981',
    icon: 'locate',
    desc: 'Periscopio y sigilo acústico',
  },
  destroyer: {
    name: 'Destructor',
    size: 2,
    bg: '#ec4899',
    icon: 'flame',
    desc: 'Lanzatorpedos de ataque rápido',
  },
};

export const BattleshipArena: React.FC<Props> = ({
  currentProfile,
  battleshipState: bs,
  onSendInvite,
  onAcceptInvite,
  onReadyFleet,
  onFire,
  onReset,
}) => {
  const [radarMode, setRadarMode] = useState<'attack' | 'fleet'>('attack');
  const [localSetupFleet, setLocalSetupFleet] = useState<BattleshipShip[] | null>(null);
  const [selectedSetupShipId, setSelectedSetupShipId] = useState<string>('carrier');

  const radarPulseAnim = useRef(new Animated.Value(0)).current;
  const shipGlowPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(radarPulseAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [radarPulseAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shipGlowPulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shipGlowPulseAnim, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shipGlowPulseAnim]);

  // Dimensionamiento simétrico riguroso para eliminar el recorte de la columna J
  const availableWidth = Math.min(SCREEN_W - 24, 360);
  const coordsHeaderPx = 18;
  const framePadding = 4;
  const frameBorder = 2;
  const totalGutter = coordsHeaderPx + (framePadding * 2) + (frameBorder * 2);
  const cellSize = Math.floor((availableWidth - totalGutter) / 10);
  const gridWidth = cellSize * 10;
  const exactFrameWidth = gridWidth + totalGutter;

  const myFleet: BattleshipShip[] = useMemo(() => {
    if (localSetupFleet) return localSetupFleet;
    const fromState = currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier;
    if (fromState && fromState.length > 0) return fromState;
    return createRandomBattleshipFleet();
  }, [localSetupFleet, currentProfile, bs.fleetKarla, bs.fleetJavier]);

  const enemyFleet: BattleshipShip[] = currentProfile === 'Karla' ? bs.fleetJavier || [] : bs.fleetKarla || [];
  const myShots: number[] = currentProfile === 'Karla' ? bs.shotsByKarla || [] : bs.shotsByJavier || [];
  const enemyShots: number[] = currentProfile === 'Karla' ? bs.shotsByJavier || [] : bs.shotsByKarla || [];

  const amIReady = currentProfile === 'Karla' ? bs.readyKarla : bs.readyJavier;
  const isPartnerReady = currentProfile === 'Karla' ? bs.readyJavier : bs.readyKarla;
  const isMyTurn = bs.phase === 'battle' && bs.turn === currentProfile;

  const isShipSunk = (ship: BattleshipShip, shots: number[]) =>
    ship.cells.every((c) => shots.includes(c));

  const remainingShipsKarla = useMemo(
    () => (bs.fleetKarla || []).filter((s) => !isShipSunk(s, bs.shotsByJavier || [])).length,
    [bs.fleetKarla, bs.shotsByJavier]
  );
  const remainingShipsJavier = useMemo(
    () => (bs.fleetJavier || []).filter((s) => !isShipSunk(s, bs.shotsByKarla || [])).length,
    [bs.fleetJavier, bs.shotsByKarla]
  );

  // Rotación segura con validación de límites estricta
  const handleRotateShip = (shipId: string) => {
    const ship = myFleet.find((s) => s.id === shipId);
    if (!ship) return;

    const newOrient: 'H' | 'V' = (ship.orientation || 'H') === 'H' ? 'V' : 'H';
    const originCell = ship.cells[0];
    const r = Math.floor(originCell / 10);
    const c = originCell % 10;

    const maxR = newOrient === 'V' ? 10 - ship.size : 9;
    const maxC = newOrient === 'H' ? 10 - ship.size : 9;
    const safeR = Math.max(0, Math.min(r, maxR));
    const safeC = Math.max(0, Math.min(c, maxC));

    const newCells: number[] = [];
    for (let i = 0; i < ship.size; i++) {
      const nr = newOrient === 'H' ? safeR : safeR + i;
      const nc = newOrient === 'H' ? safeC + i : safeC;
      if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) return;
      newCells.push(nr * 10 + nc);
    }

    const otherShips = myFleet.filter((s) => s.id !== shipId);
    const hasOverlap = otherShips.some((s) => s.cells.some((cell) => newCells.includes(cell)));
    if (hasOverlap) {
      void triggerGameHaptic('error');
      return;
    }

    const updated: BattleshipShip[] = myFleet.map((s) =>
      s.id === shipId ? { ...s, orientation: newOrient, cells: newCells } : s
    );
    setLocalSetupFleet(updated);
    void triggerGameHaptic('selection');
  };

  // Movimiento seguro del barco tocando una celda vacía
  const handleMoveShipTo = (shipId: string, originIdx: number) => {
    const ship = myFleet.find((s) => s.id === shipId);
    if (!ship) return;
    const isHoriz = (ship.orientation || 'H') === 'H';
    const r = Math.floor(originIdx / 10);
    const c = originIdx % 10;
    if (isHoriz && c + ship.size > 10) {
      void triggerGameHaptic('error');
      return;
    }
    if (!isHoriz && r + ship.size > 10) {
      void triggerGameHaptic('error');
      return;
    }

    const newCells: number[] = [];
    for (let i = 0; i < ship.size; i++) {
      const nr = isHoriz ? r : r + i;
      const nc = isHoriz ? c + i : c;
      if (nr < 0 || nr >= 10 || nc < 0 || nc >= 10) return;
      newCells.push(nr * 10 + nc);
    }

    const otherShips = myFleet.filter((s) => s.id !== shipId);
    const hasOverlap = otherShips.some((s) => s.cells.some((cell) => newCells.includes(cell)));
    if (hasOverlap) {
      void triggerGameHaptic('error');
      return;
    }

    const updated: BattleshipShip[] = myFleet.map((s) =>
      s.id === shipId ? { ...s, cells: newCells } : s
    );
    setLocalSetupFleet(updated);
    void triggerGameHaptic('selection');
  };

  const handleRandomizeFleet = () => {
    const randomized = createRandomBattleshipFleet();
    setLocalSetupFleet(randomized);
    void triggerGameHaptic('medium');
  };

  const handleConfirmReady = () => {
    if (myFleet) {
      void triggerGameHaptic('success');
      onReadyFleet(myFleet);
      setRadarMode('attack');
    }
  };

  const handleFireAtCell = (idx: number) => {
    void triggerGameHaptic('heavy');
    onFire(idx);
  };

  // Renderizador SVG de Silueta Naval Continua (Proa puntiaguda, Popa recta, Color original conservado)
  const renderContinuousNavalShip = (ship: BattleshipShip, isSetup: boolean) => {
    const isHoriz =
      (ship.orientation ||
        (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';
    const minR = Math.min(...ship.cells.map((c) => Math.floor(c / 10)));
    const minC = Math.min(...ship.cells.map((c) => c % 10));

    const shipW = isHoriz ? ship.size * cellSize : cellSize;
    const shipH = isHoriz ? cellSize : ship.size * cellSize;
    const shipLeft = minC * cellSize + coordsHeaderPx;
    const shipTop = minR * cellSize;

    const isSel = isSetup && ship.id === selectedSetupShipId;
    const shipMeta = SHIP_CONFIG[ship.id] || { bg: '#0284c7', icon: 'boat', name: ship.id };
    const isSunk = isShipSunk(ship, enemyShots);
    // Conserva SIEMPRE su color vibrante temático
    const baseColor = isSunk ? '#ef4444' : shipMeta.bg;

    return (
      <Animated.View
        key={ship.id}
        pointerEvents={isSetup ? 'box-none' : 'none'}
        style={[
          styles.continuousShipWrapper,
          {
            left: shipLeft,
            top: shipTop,
            width: shipW,
            height: shipH,
          },
          isSel && {
            transform: [
              {
                scale: shipGlowPulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.025],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={shipW} height={shipH}>
          {isHoriz ? (
            <Path
              d={`M ${shipW - 3} 3 L 14 3 C 4 3 1.5 ${shipH / 2} 1.5 ${shipH / 2} C 1.5 ${shipH / 2} 4 ${shipH - 3} 14 ${shipH - 3} L ${shipW - 3} ${shipH - 3} Q ${shipW - 1} ${shipH - 3} ${shipW - 1} ${shipH - 5} L ${shipW - 1} 5 Q ${shipW - 1} 3 ${shipW - 3} 3 Z`}
              fill={baseColor}
              stroke={isSel ? '#facc15' : 'rgba(255, 255, 255, 0.75)'}
              strokeWidth={isSel ? 2.5 : 1.2}
            />
          ) : (
            <Path
              d={`M 3 ${shipH - 3} L 3 14 C 3 4 ${shipW / 2} 1.5 ${shipW / 2} 1.5 C ${shipW / 2} 1.5 ${shipW - 3} 4 ${shipW - 3} 14 L ${shipW - 3} ${shipH - 3} Q ${shipW - 3} ${shipH - 1} ${shipW - 5} ${shipH - 1} L 5 ${shipH - 1} Q 3 ${shipH - 1} 3 ${shipH - 3} Z`}
              fill={baseColor}
              stroke={isSel ? '#facc15' : 'rgba(255, 255, 255, 0.75)'}
              strokeWidth={isSel ? 2.5 : 1.2}
            />
          )}
        </Svg>

        {/* Ícono de identificación naval centrado */}
        <View style={styles.shipIconBadge}>
          <Ionicons
            name={shipMeta.icon as any}
            size={Math.max(11, cellSize * 0.42)}
            color="#ffffff"
          />
        </View>

        {/* En combate: marcadores de impactos recibidos */}
        {!isSetup &&
          ship.cells.map((cellIdx) => {
            const hasShot = enemyShots.includes(cellIdx);
            if (!hasShot) return null;
            const rOffset = Math.floor(cellIdx / 10) - minR;
            const cOffset = (cellIdx % 10) - minC;

            return (
              <View
                key={cellIdx}
                style={[
                  styles.hitMarkerOverlay,
                  {
                    left: cOffset * cellSize,
                    top: rOffset * cellSize,
                    width: cellSize,
                    height: cellSize,
                  },
                ]}
              >
                {isSunk ? (
                  <Ionicons name="skull" size={Math.max(10, cellSize * 0.5)} color="#ffffff" />
                ) : (
                  <Ionicons name="flame" size={Math.max(11, cellSize * 0.52)} color="#fef08a" />
                )}
              </View>
            );
          })}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ================= FASE 1: INVITACIÓN / SALA DE ESPERA ================= */}
      {(bs.phase === 'idle' || bs.phase === 'invited') && (
        <View style={[styles.cardContainer, GAMES_THEME.shadows.card]}>
          <LinearGradient
            colors={GAMES_THEME.colors.oceanDeep}
            style={[styles.oceanCard as any, GAMES_THEME.shadows.glowCyan]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.View
              style={[
                styles.radarEmblem,
                {
                  transform: [
                    {
                      scale: radarPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="boat" size={38} color="#38bdf8" />
            </Animated.View>

            <Text style={styles.oceanCardTitle}>Battleship Naval en Pareja</Text>
            <Text style={styles.oceanCardSubtitle}>
              {bs.phase === 'invited'
                ? `${bs.invitedBy === 'Karla' ? 'Karlita' : 'Javier'} te desafió a un combate naval.`
                : 'Invita a tu pareja a un combate táctico en el océano de 10x10.'}
            </Text>

            {bs.phase === 'invited' && bs.invitedBy !== currentProfile ? (
              <GameButton
                label="Aceptar Desafío Naval"
                icon="checkmark-done"
                variant="primary"
                onPress={onAcceptInvite}
              />
            ) : (
              <GameButton
                label={bs.phase === 'invited' ? 'Esperando Respuesta...' : 'Desafiar a mi Pareja'}
                icon="radio"
                variant="primary"
                onPress={onSendInvite}
                disabled={bs.phase === 'invited'}
              />
            )}
          </LinearGradient>
        </View>
      )}

      {/* ================= FASE 2: PREPARACIÓN DE FLOTA (SETUP) ================= */}
      {bs.phase === 'setup' && (
        <View style={styles.setupWrap}>
          {/* Barra Superior con Controles (Un solo ícono en Rotar) */}
          <View style={[styles.setupToolsBar, { width: exactFrameWidth }]}>
            <View style={styles.setupInfoTextGroup}>
              <Text style={styles.setupHeaderTitle}>Acomoda tu Flota</Text>
              <Text style={styles.setupHeaderSub}>Toca un barco para seleccionarlo o rotarlo</Text>
            </View>

            <View style={styles.setupActionsRow}>
              <TouchableOpacity
                onPress={handleRandomizeFleet}
                style={styles.actionChip}
                accessibilityLabel="Posición aleatoria de barcos"
              >
                <Ionicons name="shuffle" size={14} color="#0284c7" />
                <Text style={styles.actionChipText}>Aleatorio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleRotateShip(selectedSetupShipId)}
                style={[styles.actionChip, styles.actionChipRotate]}
                accessibilityLabel="Rotar barco seleccionado"
              >
                <Ionicons name="sync" size={14} color="#ffffff" />
                <Text style={[styles.actionChipText, { color: '#ffffff' }]}>Rotar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tablero Océano 10x10 con Coordenadas Exactas */}
          <LinearGradient
            colors={['#03182b', '#082f49', '#0c4a6e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.boardOceanFrame,
              { width: exactFrameWidth, padding: framePadding, borderWidth: frameBorder },
              GAMES_THEME.shadows.boardDepth,
            ]}
          >
            {/* Encabezado A-J */}
            <View style={styles.coordsLettersRow}>
              <View style={{ width: coordsHeaderPx }} />
              {COLS_LETTERS.map((l) => (
                <View key={l} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={styles.coordLetterText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Filas 1-10 */}
            <View style={{ flexDirection: 'column', position: 'relative' }}>
              {Array.from({ length: 10 }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  <View style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}>
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;
                    const shipAtCell = myFleet.find((s) => s.cells.includes(idx));

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (shipAtCell) {
                            if (shipAtCell.id === selectedSetupShipId) {
                              handleRotateShip(shipAtCell.id);
                            } else {
                              void triggerGameHaptic('selection');
                              setSelectedSetupShipId(shipAtCell.id);
                            }
                          } else {
                            handleMoveShipTo(selectedSetupShipId, idx);
                          }
                        }}
                        style={[
                          styles.oceanCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: 'rgba(8, 47, 73, 0.88)',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}

              {/* Barcos continuos SVG colocados en el tablero */}
              {myFleet.map((s) => renderContinuousNavalShip(s, true))}
            </View>
          </LinearGradient>

          {/* Panel de Flota: Tarjetas con mini-silueta, nombre, tamaño y estado */}
          <View style={[styles.fleetRosterCard, { width: exactFrameWidth }]}>
            <Text style={styles.fleetRosterTitle}>Flota Disponible (Toca para seleccionar o rotar):</Text>
            <View style={styles.fleetCardsGrid}>
              {myFleet.map((s) => {
                const conf = SHIP_CONFIG[s.id] || { name: s.id, size: s.size, bg: '#0284c7' };
                const isSel = s.id === selectedSetupShipId;

                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      void triggerGameHaptic('selection');
                      if (isSel) {
                        handleRotateShip(s.id);
                      } else {
                        setSelectedSetupShipId(s.id);
                      }
                    }}
                    style={[
                      styles.fleetMiniCard,
                      isSel && styles.fleetMiniCardSelected,
                    ]}
                    activeOpacity={0.8}
                    accessibilityLabel={`Barco ${conf.name}, tamaño ${conf.size}`}
                  >
                    <View style={styles.fleetMiniCardTopRow}>
                      <View style={styles.miniShipSilhouette}>
                        {Array.from({ length: conf.size }).map((_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.miniShipSegment,
                              { backgroundColor: conf.bg },
                              i === 0 && { borderTopLeftRadius: 3, borderBottomLeftRadius: 3 },
                              i === conf.size - 1 && { borderTopRightRadius: 2, borderBottomRightRadius: 2 },
                            ]}
                          />
                        ))}
                      </View>
                      <View style={styles.placedStatusBadge}>
                        <Ionicons name="checkmark-circle" size={11} color="#15803d" />
                        <Text style={styles.placedStatusText}>Colocado</Text>
                      </View>
                    </View>

                    <View style={styles.fleetMiniCardBottomRow}>
                      <Text style={[styles.fleetMiniCardName, isSel && { color: '#0284c7' }]}>
                        {conf.name}
                      </Text>
                      <Text style={styles.fleetMiniCardSize}>{conf.size} casillas</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Dock Inferior: Confirmar Flota (Botón Primario Unificado) */}
          <View style={[styles.setupDockContainer, { width: exactFrameWidth }]}>
            {!amIReady ? (
              <GameButton
                label="Confirmar Flota y Entrar a Combate"
                icon="checkmark-circle"
                variant="primary"
                onPress={handleConfirmReady}
              />
            ) : (
              <View style={styles.waitingPartnerBadge}>
                <Ionicons name="time-outline" size={16} color="#0284c7" />
                <Text style={styles.waitingPartnerText}>
                  {isPartnerReady
                    ? '¡Ambos listos! Iniciando radar naval...'
                    : 'Esperando a que tu pareja confirme su flota...'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ================= FASE 3: COMBATE NAVAL EN VIVO ================= */}
      {bs.phase === 'battle' && (
        <View style={styles.battleWrap}>
          {/* Toggle de Modos: Radar Ataque vs Mis Barcos */}
          <View style={[styles.radarToggleContainer, { width: exactFrameWidth }]}>
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('selection');
                setRadarMode('attack');
              }}
              style={[
                styles.radarModeTab,
                radarMode === 'attack' && styles.radarModeTabActive,
              ]}
            >
              <Ionicons
                name="locate"
                size={14}
                color={radarMode === 'attack' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.radarModeTabText,
                  radarMode === 'attack' && { color: '#ffffff', fontWeight: '800' },
                ]}
              >
                Radar de Ataque
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('selection');
                setRadarMode('fleet');
              }}
              style={[
                styles.radarModeTab,
                radarMode === 'fleet' && styles.radarModeTabActive,
              ]}
            >
              <Ionicons
                name="shield"
                size={14}
                color={radarMode === 'fleet' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.radarModeTabText,
                  radarMode === 'fleet' && { color: '#ffffff', fontWeight: '800' },
                ]}
              >
                Mis Barcos ({currentProfile === 'Karla' ? remainingShipsKarla : remainingShipsJavier}/5)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tablero de Combate */}
          <LinearGradient
            colors={['#03182b', '#082f49', '#0c4a6e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.boardOceanFrame,
              { width: exactFrameWidth, padding: framePadding, borderWidth: frameBorder },
              GAMES_THEME.shadows.boardDepth,
            ]}
          >
            {/* Encabezado A-J */}
            <View style={styles.coordsLettersRow}>
              <View style={{ width: coordsHeaderPx }} />
              {COLS_LETTERS.map((l) => (
                <View key={l} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={styles.coordLetterText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Filas 1-10 */}
            <View style={{ flexDirection: 'column', position: 'relative' }}>
              {Array.from({ length: 10 }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  <View style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}>
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;

                    if (radarMode === 'attack') {
                      const hasShot = myShots.includes(idx);
                      const hitShip = hasShot && enemyFleet.find((s) => s.cells.includes(idx));
                      const isSunk = Boolean(hitShip && isShipSunk(hitShip, myShots));

                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={!isMyTurn || hasShot}
                          onPress={() => handleFireAtCell(idx)}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: isSunk
                                ? 'rgba(239, 68, 68, 0.45)'
                                : hitShip
                                ? 'rgba(249, 115, 22, 0.45)'
                                : hasShot
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(8, 47, 73, 0.92)',
                            },
                          ]}
                          activeOpacity={0.65}
                        >
                          {isSunk ? (
                            <View style={styles.sunkCellOverlay}>
                              <Ionicons name="skull" size={Math.max(10, cellSize * 0.5)} color="#fca5a5" />
                            </View>
                          ) : hitShip ? (
                            <Ionicons name="flame" size={Math.max(11, cellSize * 0.52)} color="#fde047" />
                          ) : hasShot ? (
                            <Ionicons name="water" size={Math.max(10, cellSize * 0.45)} color="#38bdf8" />
                          ) : isMyTurn ? (
                            <View style={styles.crosshairDot} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    } else {
                      const hasShot = enemyShots.includes(idx);
                      const ship = myFleet.find((s) => s.cells.includes(idx));
                      const isMiss = !ship && hasShot;

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: 'rgba(8, 47, 73, 0.92)',
                            },
                          ]}
                        >
                          {isMiss && (
                            <Ionicons name="water" size={Math.max(10, cellSize * 0.45)} color="#38bdf8" />
                          )}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}

              {/* Si estamos en vista 'Mis Barcos', renderizar siluetas continuas de mi flota */}
              {radarMode === 'fleet' && myFleet.map((s) => renderContinuousNavalShip(s, false))}
            </View>
          </LinearGradient>

          {/* Dock Inferior de Combate */}
          <View style={[styles.battleDockContainer, { width: exactFrameWidth }]}>
            <GameButton
              label="Reiniciar Partida Naval"
              icon="reload"
              variant="destructive"
              onPress={onReset}
            />
          </View>
        </View>
      )}
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
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: GAMES_THEME.radius.xl,
    overflow: 'hidden',
  },
  oceanCard: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  radarEmblem: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oceanCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  oceanCardSubtitle: {
    fontSize: 12.5,
    color: '#bae6fd',
    textAlign: 'center',
    lineHeight: 18,
  },
  setupWrap: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  setupToolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  setupInfoTextGroup: {
    flex: 1,
  },
  setupHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  setupHeaderSub: {
    fontSize: 10.5,
    color: '#64748b',
  },
  setupActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  actionChipRotate: {
    backgroundColor: '#0284c7',
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  boardOceanFrame: {
    backgroundColor: '#082f49',
    borderRadius: GAMES_THEME.radius.lg,
    borderColor: '#0284c7',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  coordsLettersRow: {
    flexDirection: 'row',
    paddingBottom: 2,
  },
  coordLetterText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
  },
  coordNumberText: {
    color: '#38bdf8',
    fontSize: 9.5,
    fontWeight: '800',
  },
  oceanCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.18)',
  },
  continuousShipWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  shipIconBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitMarkerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  crosshairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.5)',
  },
  sunkCellOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetRosterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    ...GAMES_THEME.shadows.soft,
  },
  fleetRosterTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  fleetCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'space-between',
  },
  fleetMiniCard: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 3,
  },
  fleetMiniCardSelected: {
    borderColor: '#0284c7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  fleetMiniCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniShipSilhouette: {
    flexDirection: 'row',
    gap: 1.5,
    alignItems: 'center',
  },
  miniShipSegment: {
    width: 6,
    height: 9,
  },
  placedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
  },
  placedStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
  },
  fleetMiniCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fleetMiniCardName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1e293b',
  },
  fleetMiniCardSize: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
  },
  setupDockContainer: {
    paddingTop: 2,
  },
  waitingPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#e0f2fe',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  waitingPartnerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0369a1',
  },
  battleWrap: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  radarToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  radarModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 9,
  },
  radarModeTabActive: {
    backgroundColor: '#0284c7',
  },
  radarModeTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  battleDockContainer: {
    paddingTop: 4,
  },
});

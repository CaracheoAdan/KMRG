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

  // Dimensiones calibradas del tablero con 16px de margen
  const boardSize = Math.min(SCREEN_W - 32, 350);
  const coordsHeaderPx = 18;
  const actualBoardPx = boardSize - coordsHeaderPx;
  const cellSize = Math.floor(actualBoardPx / 10);

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

  // Conteo de barcos no hundidos
  const remainingShipsKarla = useMemo(
    () => (bs.fleetKarla || []).filter((s) => !isShipSunk(s, bs.shotsByJavier || [])).length,
    [bs.fleetKarla, bs.shotsByJavier]
  );
  const remainingShipsJavier = useMemo(
    () => (bs.fleetJavier || []).filter((s) => !isShipSunk(s, bs.shotsByKarla || [])).length,
    [bs.fleetJavier, bs.shotsByKarla]
  );

  const handleRotateShip = (shipId: string) => {
    const ship = myFleet.find((s) => s.id === shipId);
    if (!ship) return;

    const newOrient: 'H' | 'V' = (ship.orientation || 'H') === 'H' ? 'V' : 'H';
    const originCell = ship.cells[0];
    const r = Math.floor(originCell / 10);
    const c = originCell % 10;

    const newCells: number[] = [];
    const maxR = newOrient === 'V' ? 10 - ship.size : 9;
    const maxC = newOrient === 'H' ? 10 - ship.size : 9;
    const safeR = Math.min(r, maxR);
    const safeC = Math.min(c, maxC);

    for (let i = 0; i < ship.size; i++) {
      newCells.push(newOrient === 'H' ? safeR * 10 + (safeC + i) : (safeR + i) * 10 + safeC);
    }

    const updated: BattleshipShip[] = myFleet.map((s) =>
      s.id === shipId ? { ...s, orientation: newOrient, cells: newCells } : s
    );
    setLocalSetupFleet(updated);
    void triggerGameHaptic('selection');
  };

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
      newCells.push(isHoriz ? r * 10 + (c + i) : (r + i) * 10 + c);
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

  // Renderizador de un segmento naval REALISTA (Proa angular, Cubierta especializada, Popa cuadrada)
  const renderNavalSegment = (
    ship: BattleshipShip,
    cellIdx: number,
    isHit: boolean,
    isSunk: boolean,
    isSelected: boolean
  ) => {
    const segIdx = ship.cells.indexOf(cellIdx);
    const isBow = segIdx === 0;
    const isStern = segIdx === ship.cells.length - 1;
    const isHoriz =
      (ship.orientation ||
        (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';

    const shipMeta = SHIP_CONFIG[ship.id] || { bg: '#0284c7' };
    const hullBg = isSunk ? '#ef4444' : isSelected ? '#38bdf8' : shipMeta.bg;

    // Proa puntiaguda naval, popa recortada continua
    const bowRadius = isHoriz
      ? { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 }
      : { borderTopLeftRadius: 14, borderTopRightRadius: 14 };
    const sternRadius = isHoriz
      ? { borderTopRightRadius: 4, borderBottomRightRadius: 4 }
      : { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 };

    // Bordes continuos sin divisiones entre celdas del mismo barco
    const seamlessBorder = isHoriz
      ? {
          borderTopWidth: 1.5,
          borderBottomWidth: 1.5,
          borderLeftWidth: isBow ? 2 : 0,
          borderRightWidth: isStern ? 2 : 0,
        }
      : {
          borderLeftWidth: 1.5,
          borderRightWidth: 1.5,
          borderTopWidth: isBow ? 2 : 0,
          borderBottomWidth: isStern ? 2 : 0,
        };

    return (
      <View
        pointerEvents="none"
        style={[
          styles.navalHull,
          {
            backgroundColor: hullBg,
            width: isHoriz ? '100%' : '84%',
            height: isHoriz ? '84%' : '100%',
            borderColor: 'rgba(255, 255, 255, 0.65)',
            ...seamlessBorder,
          },
          isBow && bowRadius,
          isStern && sternRadius,
        ]}
      >
        {isSunk ? (
          <Ionicons name="skull" size={Math.max(10, cellSize * 0.48)} color="#ffffff" />
        ) : isHit ? (
          <Ionicons name="flame" size={Math.max(11, cellSize * 0.52)} color="#fef08a" />
        ) : isBow ? (
          // Proa: Ancla y torreta frontal
          <View style={styles.bowTurretAnchor} />
        ) : isStern ? (
          // Popa: Timón y propulsión
          <View style={styles.sternPropellerDetail} />
        ) : (
          // Sección central según tipo de nave (sin puntos de dominó)
          <View style={styles.midSuperstructure}>
            {ship.id === 'carrier' ? (
              <View style={styles.carrierRunwayLine} />
            ) : ship.id === 'battleship' ? (
              <View style={styles.twinCannonTurret} />
            ) : ship.id === 'cruiser' ? (
              <View style={styles.smokestackDuo} />
            ) : ship.id === 'submarine' ? (
              <View style={styles.periscopeSail} />
            ) : (
              <View style={styles.destroyerBridge} />
            )}
          </View>
        )}
      </View>
    );
  };

  // Cálculo del contorno único alrededor del barco seleccionado en setup
  const selectedShip = myFleet.find((s) => s.id === selectedSetupShipId);
  let selectedShipOverlay: { left: number; top: number; width: number; height: number } | null = null;
  if (selectedShip && selectedShip.cells.length > 0) {
    const isHoriz =
      (selectedShip.orientation ||
        (selectedShip.cells.length > 1 && selectedShip.cells[1] - selectedShip.cells[0] === 1 ? 'H' : 'V')) === 'H';
    const r0 = Math.floor(selectedShip.cells[0] / 10);
    const c0 = selectedShip.cells[0] % 10;
    const rLast = Math.floor(selectedShip.cells[selectedShip.cells.length - 1] / 10);
    const cLast = selectedShip.cells[selectedShip.cells.length - 1] % 10;

    const minR = Math.min(r0, rLast);
    const minC = Math.min(c0, cLast);

    selectedShipOverlay = {
      left: minC * cellSize + coordsHeaderPx,
      top: minR * cellSize,
      width: isHoriz ? selectedShip.size * cellSize : cellSize,
      height: isHoriz ? cellSize : selectedShip.size * cellSize,
    };
  }

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
                variant="cyan"
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
          {/* Barra Superior con Botones de Organización */}
          <View style={styles.setupToolsBar}>
            <View style={styles.setupInfoTextGroup}>
              <Text style={styles.setupHeaderTitle}>Acomoda tu Flota</Text>
              <Text style={styles.setupHeaderSub}>Toca un barco para seleccionarlo y rotarlo</Text>
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

          {/* Tablero Océano 10x10 con Coordenadas y Océano Profundo */}
          <LinearGradient
            colors={['#03182b', '#082f49', '#0c4a6e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.boardOceanFrame, { width: boardSize }, GAMES_THEME.shadows.boardDepth]}
          >
            {/* Encabezado de Columnas A-J */}
            <View style={styles.coordsLettersRow}>
              <View style={{ width: coordsHeaderPx }} />
              {COLS_LETTERS.map((l) => (
                <View key={l} style={{ width: cellSize, alignItems: 'center' }}>
                  <Text style={styles.coordLetterText}>{l}</Text>
                </View>
              ))}
            </View>

            {/* Filas 1-10 con Contorno Continuo del Barco Seleccionado */}
            <View style={{ flexDirection: 'column', position: 'relative' }}>
              {/* Contorno ÚNICO alrededor de TODO el barco seleccionado con glow y pulso */}
              {selectedShipOverlay && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.selectedShipContinuousOutline,
                    {
                      left: selectedShipOverlay.left,
                      top: selectedShipOverlay.top,
                      width: selectedShipOverlay.width,
                      height: selectedShipOverlay.height,
                      opacity: shipGlowPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.75, 1],
                      }),
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
                />
              )}

              {Array.from({ length: 10 }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  <View style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}>
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;
                    const shipAtCell = myFleet.find((s) => s.cells.includes(idx));
                    const isSelected = shipAtCell && shipAtCell.id === selectedSetupShipId;

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.75}
                        onPress={() => {
                          if (shipAtCell) {
                            if (shipAtCell.id === selectedSetupShipId) {
                              handleRotateShip(shipAtCell.id);
                            } else {
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
                            backgroundColor: shipAtCell
                              ? 'rgba(14, 165, 233, 0.22)'
                              : 'rgba(8, 47, 73, 0.88)',
                          },
                        ]}
                      >
                        {shipAtCell && renderNavalSegment(shipAtCell, idx, false, false, Boolean(isSelected))}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Panel de Flota: Tarjetas con mini-silueta, nombre, tamaño y estado */}
          <View style={styles.fleetRosterCard}>
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
                      {/* Mini silueta del barco */}
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

          {/* Dock Inferior: Confirmar Flota */}
          <View style={styles.setupDockContainer}>
            {!amIReady ? (
              <GameButton
                label="Confirmar Flota y Entrar a Combate"
                icon="checkmark-circle"
                variant="cyan"
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
          <View style={styles.radarToggleContainer}>
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

          {/* Turno Actual con Micro-indicador */}
          <View
            style={[
              styles.turnStatusBanner,
              isMyTurn ? styles.turnStatusBannerActive : styles.turnStatusBannerWaiting,
            ]}
          >
            <Ionicons
              name={isMyTurn ? 'sparkles' : 'time-outline'}
              size={14}
              color={isMyTurn ? '#065f46' : '#92400e'}
            />
            <Text
              style={[
                styles.turnStatusText,
                { color: isMyTurn ? '#065f46' : '#92400e' },
              ]}
            >
              {isMyTurn ? '¡Tu Turno! Toca una coordenada para disparar torpedo' : 'Turno de tu pareja... esperando disparo'}
            </Text>
          </View>

          {/* Tablero de Combate */}
          <View style={[styles.boardOceanFrame, { width: boardSize }, GAMES_THEME.shadows.boardDepth]}>
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
            <View style={{ flexDirection: 'column' }}>
              {Array.from({ length: 10 }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                  <View style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}>
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;

                    if (radarMode === 'attack') {
                      // Vista Radar Enemigo
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
                              <Ionicons name="skull" size={Math.max(10, cellSize * 0.52)} color="#fca5a5" />
                            </View>
                          ) : hitShip ? (
                            <Ionicons name="flame" size={Math.max(12, cellSize * 0.54)} color="#fde047" />
                          ) : hasShot ? (
                            <Ionicons name="water" size={Math.max(10, cellSize * 0.46)} color="#38bdf8" />
                          ) : isMyTurn ? (
                            <View style={styles.crosshairDot} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    } else {
                      // Vista Mi Flota
                      const ship = myFleet.find((s) => s.cells.includes(idx));
                      const hasShot = enemyShots.includes(idx);
                      const isHit = Boolean(ship && hasShot);
                      const isSunk = Boolean(ship && isShipSunk(ship, enemyShots));
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
                          {ship && renderNavalSegment(ship, idx, isHit, isSunk, false)}
                          {isMiss && (
                            <Ionicons name="water" size={Math.max(10, cellSize * 0.46)} color="#38bdf8" />
                          )}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}
            </View>
          </View>

          {/* Panel de Flota Restante de la Pareja */}
          <View style={styles.fleetStatusCard}>
            <Text style={styles.fleetStatusTitle}>
              {radarMode === 'attack' ? 'Flota Enemiga por Hundir:' : 'Estado de Mi Flota:'}
            </Text>
            <View style={styles.fleetIconsRow}>
              {(radarMode === 'attack' ? enemyFleet : myFleet).map((s) => {
                const conf = SHIP_CONFIG[s.id] || { name: s.id, size: s.size, bg: '#0284c7' };
                const isSunk = isShipSunk(s, radarMode === 'attack' ? myShots : enemyShots);

                return (
                  <View
                    key={s.id}
                    style={[
                      styles.fleetMiniBadge,
                      isSunk && styles.fleetMiniBadgeSunk,
                    ]}
                  >
                    <Ionicons
                      name={isSunk ? 'skull' : (conf.icon as any) || 'boat'}
                      size={14}
                      color={isSunk ? '#ef4444' : conf.bg}
                    />
                    <Text
                      style={[
                        styles.fleetMiniName,
                        isSunk && { textDecorationLine: 'line-through', color: '#94a3b8' },
                      ]}
                    >
                      {conf.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
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
  cardContainer: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  oceanCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 12,
  },
  radarEmblem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  oceanCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: GAMES_THEME.fonts.display,
  },
  oceanCardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  setupWrap: {
    width: '100%',
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm,
  },
  setupToolsBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  setupInfoTextGroup: {
    flex: 1,
  },
  setupHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  setupHeaderSub: {
    fontSize: 11,
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
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  actionChipRotate: {
    backgroundColor: '#0284c7',
  },
  actionChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
  },
  boardOceanFrame: {
    backgroundColor: '#082f49',
    borderRadius: GAMES_THEME.radius.lg,
    borderWidth: 2,
    borderColor: '#0284c7',
    padding: 4,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  coordsLettersRow: {
    flexDirection: 'row',
    paddingBottom: 2,
  },
  coordLetterText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 2,
  },
  coordNumberText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
  },
  oceanCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  navalHull: {
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  bowTurretAnchor: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  sternPropellerDetail: {
    width: 8,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 2,
  },
  midSuperstructure: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierRunwayLine: {
    width: 2,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  twinCannonTurret: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#78350f',
  },
  smokestackDuo: {
    width: 7,
    height: 5,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  periscopeSail: {
    width: 5,
    height: 9,
    backgroundColor: '#ffffff',
    borderRadius: 2.5,
  },
  destroyerBridge: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ffffff',
  },
  selectedShipContinuousOutline: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: '#facc15',
    backgroundColor: 'rgba(250, 204, 21, 0.16)',
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 10,
  },
  setupDockContainer: {
    width: '100%',
    paddingTop: 4,
  },
  fleetRosterCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    ...GAMES_THEME.shadows.soft,
  },
  fleetRosterTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  fleetCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  fleetMiniCard: {
    width: '48.5%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 7,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 4,
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
    height: 10,
  },
  placedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  placedStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803d',
  },
  fleetMiniCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fleetMiniCardName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
  },
  fleetMiniCardSize: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748b',
  },
  waitingPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#e0f2fe',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  waitingPartnerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  battleWrap: {
    width: '100%',
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm,
  },
  radarToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    width: '100%',
    gap: 4,
  },
  radarModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 10,
  },
  radarModeTabActive: {
    backgroundColor: '#0284c7',
    ...GAMES_THEME.shadows.soft,
  },
  radarModeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  turnStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  turnStatusBannerActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  turnStatusBannerWaiting: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  turnStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  crosshairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.45)',
  },
  sunkCellOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fleetStatusCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    ...GAMES_THEME.shadows.soft,
  },
  fleetStatusTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  fleetIconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fleetMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fleetMiniBadgeSunk: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  fleetMiniName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
});

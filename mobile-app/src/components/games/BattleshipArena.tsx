import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
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
import { MatchInfoFooter } from './common/MatchInfoFooter';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  currentProfile: UserProfile;
  battleshipState: GamesState['battleship'];
  onSendInvite: () => void;
  onAcceptInvite: () => void;
  onReadyFleet: (fleet: BattleshipShip[]) => void;
  onFire: (cellIdx: number) => void;
  onReset: () => void;
}

const COLS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROWS_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const SHIP_COLORS: Record<string, { bg: string; name: string; size: number }> = {
  carrier: { bg: '#f43f5e', name: 'Portaaviones', size: 5 },
  battleship: { bg: '#f59e0b', name: 'Acorazado', size: 4 },
  cruiser: { bg: '#8b5cf6', name: 'Crucero', size: 3 },
  submarine: { bg: '#10b981', name: 'Submarino', size: 3 },
  destroyer: { bg: '#ec4899', name: 'Destructor', size: 2 },
};

export const BattleshipArena: React.FC<Props> = ({
  boardPx,
  isFull,
  primaryColor,
  currentProfile,
  battleshipState: bs,
  onSendInvite,
  onAcceptInvite,
  onReadyFleet,
  onFire,
  onReset,
}) => {
  const [radarMode, setRadarMode] = useState<'attack' | 'fleet'>('attack');
  const [selectedSetupShipId, setSelectedSetupShipId] = useState<string>('carrier');
  const [localSetupFleet, setLocalSetupFleet] = useState<BattleshipShip[] | null>(null);

  const radarPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(radarPulseAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [radarPulseAnim]);

  const isShipSunk = (ship: BattleshipShip, shots: number[]): boolean =>
    ship.cells.every((c) => shots.includes(c));

  const remainingShipsKarla = useMemo(
    () => bs.fleetKarla.filter((s) => !isShipSunk(s, bs.shotsByJavier)).length,
    [bs.fleetKarla, bs.shotsByJavier]
  );

  const remainingShipsJavier = useMemo(
    () => bs.fleetJavier.filter((s) => !isShipSunk(s, bs.shotsByKarla)).length,
    [bs.fleetJavier, bs.shotsByKarla]
  );

  const syncedMyFleet = currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier;
  const myFleet = bs.phase === 'setup' && localSetupFleet ? localSetupFleet : syncedMyFleet;
  const enemyFleet = currentProfile === 'Karla' ? bs.fleetJavier : bs.fleetKarla;
  const myShots = currentProfile === 'Karla' ? bs.shotsByKarla : bs.shotsByJavier;
  const enemyShotsAtMe = currentProfile === 'Karla' ? bs.shotsByJavier : bs.shotsByKarla;
  const amIReady = currentProfile === 'Karla' ? bs.readyKarla : bs.readyJavier;
  const isPartnerReady = currentProfile === 'Karla' ? bs.readyJavier : bs.readyKarla;

  useEffect(() => {
    if (bs.phase === 'setup') {
      setLocalSetupFleet(currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier);
    } else {
      setLocalSetupFleet(null);
    }
  }, [bs.phase, currentProfile, bs.fleetKarla, bs.fleetJavier]);

  // Rotar barco en fase de preparación
  const handleRotateShip = (targetId?: string) => {
    const shipId = targetId || selectedSetupShipId;
    if (!myFleet) return;
    const ship = myFleet.find((s) => s.id === shipId);
    if (!ship) return;

    const newOrient: 'H' | 'V' = ship.orientation === 'H' ? 'V' : 'H';
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

    const updated = myFleet.map((s) =>
      s.id === shipId ? { ...s, orientation: newOrient, cells: newCells } : s
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

  // Dimensiones calibradas del tablero con margen para coordenadas (A-J / 1-10)
  const coordsHeaderPx = 16;
  const actualBoardPx = boardPx - coordsHeaderPx;
  const cellSize = Math.floor(actualBoardPx / 10);

  // Renderizador de un segmento naval realista (Proa curva, Torretas y Popa)
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

    const shipMeta = SHIP_COLORS[ship.id] || { bg: '#0284c7', name: 'Barco' };
    const hullBg = isSunk ? '#ef4444' : isSelected ? '#38bdf8' : shipMeta.bg;

    return (
      <View
        pointerEvents="none"
        style={[
          styles.navalHull,
          {
            backgroundColor: hullBg,
            width: isHoriz ? '95%' : '80%',
            height: isHoriz ? '80%' : '95%',
            borderTopLeftRadius: isBow ? 8 : 2,
            borderBottomLeftRadius: isHoriz ? (isBow ? 8 : 2) : isStern ? 8 : 2,
            borderTopRightRadius: isHoriz ? (isStern ? 8 : 2) : isBow ? 8 : 2,
            borderBottomRightRadius: isStern ? 8 : 2,
            borderColor: isSelected ? '#fef08a' : 'rgba(255, 255, 255, 0.45)',
            borderWidth: isSelected ? 1.8 : 1,
          },
        ]}
      >
        {isSunk ? (
          <Ionicons name="skull" size={Math.max(10, cellSize * 0.48)} color="#ffffff" />
        ) : isHit ? (
          <Ionicons name="flame" size={Math.max(11, cellSize * 0.52)} color="#fef08a" />
        ) : isBow || isStern ? (
          <View style={styles.turretPoint} />
        ) : (
          <View style={styles.deckPlate} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ================= FASE 1: INVITACIÓN / SALA DE ESPERA ================= */}
      {(bs.phase === 'idle' || bs.phase === 'invited') && (
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
            <Ionicons name="boat" size={36} color="#38bdf8" />
          </Animated.View>

          <Text style={styles.oceanCardTitle}>Battleship Naval en Pareja</Text>
          <Text style={styles.oceanCardSubtitle}>
            {bs.phase === 'invited'
              ? `${bs.invitedBy === 'Karla' ? 'Karlita' : 'Javier'} te desafió a un combate naval.`
              : 'Invita a tu pareja a un duelo táctico en el océano.'}
          </Text>

          {bs.phase === 'invited' && bs.invitedBy !== currentProfile ? (
            <GameButton
              label="Aceptar Desafío Naval"
              icon="checkmark-done"
              variant="cyan"
              onPress={onAcceptInvite}
            />
          ) : bs.phase === 'invited' && bs.invitedBy === currentProfile ? (
            <View style={styles.waitingInviteBadge}>
              <Ionicons name="time" size={16} color="#38bdf8" />
              <Text style={styles.waitingInviteText}>
                Esperando a que tu pareja acepte el combate...
              </Text>
            </View>
          ) : (
            <GameButton
              label="Desafiar a mi Pareja"
              icon="paper-plane"
              variant="primary"
              onPress={onSendInvite}
            />
          )}
        </LinearGradient>
      )}

      {/* ================= FASE 2: PREPARACIÓN Y ACOMODO DE FLOTA ================= */}
      {bs.phase === 'setup' && (
        <View style={styles.setupWrap}>
          {/* Cabecera de Setup */}
          <View style={styles.setupTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.setupHeading}>
                {amIReady ? '¡Flota lista! Esperando pareja...' : 'Acomoda tus 5 barcos'}
              </Text>
              <Text style={styles.setupSub}>
                Toca un barco para seleccionarlo o rotarlo
              </Text>
            </View>

            <View style={styles.setupToolsRow}>
              <TouchableOpacity
                onPress={handleRandomizeFleet}
                style={styles.toolChip}
                accessibilityLabel="Flota aleatoria"
              >
                <Ionicons name="shuffle" size={14} color="#0284c7" />
                <Text style={styles.toolChipText}>Aleatorio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleRotateShip()}
                style={[styles.toolChip, { backgroundColor: '#e0f2fe' }]}
                accessibilityLabel="Rotar barco"
              >
                <Ionicons name="sync" size={14} color="#0284c7" />
                <Text style={styles.toolChipText}>Rotar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tablero Océano 10x10 con Coordenadas */}
          <View style={styles.boardOuterOcean}>
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
                          }
                        }}
                        style={[
                          styles.oceanCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: isSelected
                              ? 'rgba(14, 165, 233, 0.45)'
                              : shipAtCell
                              ? 'rgba(14, 165, 233, 0.25)'
                              : 'rgba(8, 47, 73, 0.85)',
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
          </View>

          {/* Botón de confirmación */}
          <View style={{ width: '100%', marginTop: 8 }}>
            {!amIReady ? (
              <GameButton
                label="Confirmar Flota y Entrar a Combate"
                icon="checkmark-circle"
                variant="cyan"
                onPress={handleConfirmReady}
              />
            ) : (
              <View style={styles.waitingPartnerBadge}>
                <Ionicons name="time" size={16} color="#0284c7" />
                <Text style={styles.waitingPartnerText}>
                  {isPartnerReady
                    ? 'Iniciando radar naval...'
                    : 'Tu pareja está acomodando sus barcos...'}
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
              bs.turn === currentProfile
                ? styles.turnBannerMyTurn
                : styles.turnBannerPartner,
            ]}
          >
            <Ionicons
              name={bs.turn === currentProfile ? 'locate' : 'time-outline'}
              size={14}
              color={bs.turn === currentProfile ? '#065f46' : '#92400e'}
            />
            <Text
              style={[
                styles.turnStatusBannerText,
                { color: bs.turn === currentProfile ? '#065f46' : '#92400e' },
              ]}
            >
              {bs.turn === currentProfile
                ? '¡Tu turno de disparar al radar enemigo!'
                : `Esperando disparo de ${currentProfile === 'Karla' ? 'Javier' : 'Karlita'}...`}
            </Text>
          </View>

          {/* Tablero Océano 10x10 de Combate */}
          <View style={styles.boardOuterOcean}>
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
                      const hasShot = myShots.includes(idx);
                      const hitShip = hasShot && enemyFleet.find((s) => s.cells.includes(idx));
                      const isSunk = hitShip && isShipSunk(hitShip, myShots);

                      return (
                        <TouchableOpacity
                          key={idx}
                          disabled={hasShot || bs.turn !== currentProfile}
                          activeOpacity={0.7}
                          onPress={() => handleFireAtCell(idx)}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: isSunk
                                ? 'rgba(239, 68, 68, 0.85)'
                                : hitShip
                                ? 'rgba(249, 115, 22, 0.85)'
                                : hasShot
                                ? 'rgba(15, 23, 42, 0.95)'
                                : 'rgba(8, 47, 73, 0.85)',
                            },
                          ]}
                        >
                          {isSunk ? (
                            <Ionicons name="flame" size={cellSize * 0.58} color="#ffffff" />
                          ) : hitShip ? (
                            <Ionicons name="close" size={cellSize * 0.62} color="#ffffff" />
                          ) : hasShot ? (
                            <View style={styles.splashWaterMiss} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    } else {
                      // Modo Flota Propia
                      const shipAtCell = myFleet.find((s) => s.cells.includes(idx));
                      const wasHit = enemyShotsAtMe.includes(idx);
                      const isSunk = shipAtCell && isShipSunk(shipAtCell, enemyShotsAtMe);

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: wasHit && shipAtCell
                                ? 'rgba(239, 68, 68, 0.85)'
                                : wasHit
                                ? 'rgba(15, 23, 42, 0.95)'
                                : 'rgba(8, 47, 73, 0.85)',
                            },
                          ]}
                        >
                          {shipAtCell && renderNavalSegment(shipAtCell, idx, wasHit, Boolean(isSunk), false)}
                          {wasHit && !shipAtCell && <View style={styles.splashWaterMiss} />}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* ================= FASE 4: PARTIDA TERMINADA ================= */}
      {bs.phase === 'finished' && (
        <View style={styles.finishedCard}>
          <Ionicons
            name={bs.winner === currentProfile ? 'trophy' : 'heart'}
            size={42}
            color={bs.winner === currentProfile ? '#f59e0b' : '#ec4899'}
          />
          <Text style={styles.finishedTitle}>
            {bs.winner === currentProfile ? '¡Victoria Naval!' : '¡Batalla Terminada!'}
          </Text>
          <Text style={styles.finishedSub}>
            {bs.winner === currentProfile
              ? 'Hundiste toda la flota enemiga. ¡Excelente estratega!'
              : 'Tu pareja logró hundir tus barcos en esta ronda.'}
          </Text>

          <View style={{ width: '100%', marginTop: 8 }}>
            <GameButton
              label="Iniciar Nueva Batalla Naval"
              icon="refresh"
              variant="cyan"
              onPress={onReset}
            />
          </View>
        </View>
      )}

      {/* Footer con Racha y Consejos de Pareja */}
      {isFull && (
        <MatchInfoFooter
          scoreKarla={remainingShipsKarla}
          scoreJavier={remainingShipsJavier}
          streakCount={4}
          gameStatsText="Batalla Naval Estratégica 10x10"
          coupleBanter="¡El que hunda el Portaaviones primero tiene derecho a elegir qué película ver! 🎬"
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
  oceanCard: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 10,
  },
  radarEmblem: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(14, 165, 233, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
  },
  oceanCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: GAMES_THEME.fonts.display,
  },
  oceanCardSubtitle: {
    fontSize: 12.5,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  waitingInviteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  waitingInviteText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  setupWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  setupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
  },
  setupHeading: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  setupSub: {
    fontSize: 10.5,
    color: '#64748b',
  },
  setupToolsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toolChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  boardOuterOcean: {
    borderRadius: 20,
    backgroundColor: '#075985',
    borderWidth: 3,
    borderColor: '#0284c7',
    overflow: 'hidden',
    padding: 3,
    ...GAMES_THEME.shadows.card,
  },
  coordsLettersRow: {
    flexDirection: 'row',
    backgroundColor: '#075985',
    paddingVertical: 2,
  },
  coordLetterText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#38bdf8',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075985',
  },
  coordNumberText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#38bdf8',
  },
  oceanCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  navalHull: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  turretPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  deckPlate: {
    width: '60%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  splashWaterMiss: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#38bdf8',
    opacity: 0.85,
  },
  battleWrap: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  radarToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    width: '100%',
  },
  radarModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 11,
  },
  radarModeTabActive: {
    backgroundColor: '#0284c7',
    ...GAMES_THEME.shadows.soft,
  },
  radarModeTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
  },
  turnStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  turnBannerMyTurn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  turnBannerPartner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  turnStatusBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  waitingPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e0f2fe',
    paddingVertical: 12,
    borderRadius: 14,
  },
  waitingPartnerText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '700',
  },
  finishedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    ...GAMES_THEME.shadows.card,
  },
  finishedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: GAMES_THEME.fonts.display,
  },
  finishedSub: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});

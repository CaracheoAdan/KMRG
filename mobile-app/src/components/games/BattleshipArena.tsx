import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState, BattleshipShip, createRandomBattleshipFleet } from '../../services/CoupleSyncService';
import { UserProfile } from '../../types';

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
  const [selectedSetupShipId, setSelectedSetupShipId] = useState<string>('ship-carrier');
  const [setupOrientation, setSetupOrientation] = useState<'H' | 'V'>('H');
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

  // Rotar barco seleccionado en fase de setup
  const handleRotateShip = (shipIdTarget?: string) => {
    const targetId = shipIdTarget || selectedSetupShipId;
    if (!myFleet) return;
    const ship = myFleet.find((s) => s.id === targetId);
    if (!ship) return;

    const newOrient: 'H' | 'V' = ship.orientation === 'H' ? 'V' : 'H';
    const originCell = ship.cells[0];
    const r = Math.floor(originCell / 10);
    const c = originCell % 10;

    // Calcular nuevas celdas
    const newCells: number[] = [];
    const maxR = newOrient === 'V' ? 10 - ship.size : 9;
    const maxC = newOrient === 'H' ? 10 - ship.size : 9;
    const safeR = Math.min(r, maxR);
    const safeC = Math.min(c, maxC);

    for (let i = 0; i < ship.size; i++) {
      newCells.push(newOrient === 'H' ? safeR * 10 + (safeC + i) : (safeR + i) * 10 + safeC);
    }

    const updated = myFleet.map((s) =>
      s.id === targetId ? { ...s, orientation: newOrient, cells: newCells } : s
    );
    setLocalSetupFleet(updated);
    setSetupOrientation(newOrient);
    if (Platform.OS !== 'web') Vibration.vibrate(20);
  };

  const handleRandomizeFleet = () => {
    const randomized = createRandomBattleshipFleet();
    setLocalSetupFleet(randomized);
    if (Platform.OS !== 'web') Vibration.vibrate(30);
  };

  const handleConfirmReady = () => {
    if (myFleet) {
      onReadyFleet(myFleet);
      setRadarMode('attack');
    }
  };

  const cellSize = Math.floor(boardPx / 10);

  return (
    <View style={styles.container}>
      {/* FASE 1: SALA DE INVITACIÓN */}
      {(bs.phase === 'idle' || bs.phase === 'invited') && (
        <View style={[styles.inviteCard, isFull && styles.inviteCardDark]}>
          <Animated.View
            style={[
              styles.radarCircleIcon,
              {
                transform: [
                  {
                    scale: radarPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1.08],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons name="boat" size={36} color="#38bdf8" />
          </Animated.View>

          <Text style={[styles.inviteTitle, isFull && { color: '#f8fafc' }]}>
            {bs.phase === 'invited'
              ? bs.invitedBy === currentProfile
                ? `Esperando a ${currentProfile === 'Karla' ? 'Javier' : 'Karlita'}`
                : `¡${bs.invitedBy === 'Karla' ? 'Karlita' : 'Javier'} te desafía a Battleship!`
              : 'Battleship 10x10'}
          </Text>

          <Text style={[styles.inviteDesc, isFull && { color: '#94a3b8' }]}>
            {bs.phase === 'invited'
              ? 'Acomoda tus 5 barcos en secreto para comenzar la batalla naval.'
              : 'Desafía a tu pareja a un combate en cuadrícula 10x10 con radar en vivo.'}
          </Text>

          {bs.phase === 'idle' ? (
            <TouchableOpacity
              onPress={onSendInvite}
              style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
              activeOpacity={0.85}
            >
              <Ionicons name="radio" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Mandar Invitación de Partida</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={onAcceptInvite}
              style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>
                {bs.invitedBy === currentProfile ? 'Acomodar Mis Barcos' : '¡Aceptar Reto y Jugar!'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* FASE 2: PREPARACIÓN DE FLOTA (SETUP) */}
      {bs.phase === 'setup' && (
        <View style={styles.setupContainer}>
          <View style={styles.setupHeader}>
            <Text style={[styles.setupTitle, isFull && { color: '#38bdf8' }]}>
              {amIReady ? '¡Flota lista! Esperando a tu pareja...' : 'Ubica tus 5 barcos en el tablero'}
            </Text>
            <View style={styles.setupActionRow}>
              <TouchableOpacity
                onPress={handleRandomizeFleet}
                style={[styles.smallBtn, { backgroundColor: '#f1f5f9' }]}
              >
                <Ionicons name="shuffle" size={14} color="#0f172a" />
                <Text style={styles.smallBtnText}>Aleatorio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRotateShip()}
                style={[styles.smallBtn, { backgroundColor: '#e0f2fe' }]}
              >
                <Ionicons name="sync" size={14} color="#0284c7" />
                <Text style={[styles.smallBtnText, { color: '#0284c7' }]}>Rotar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tablero 10x10 de Setup */}
          <View style={[styles.boardContainer, { width: boardPx, height: boardPx }]}>
            {Array.from({ length: 100 }).map((_, idx) => {
              const shipAtCell = myFleet.find((s) => s.cells.includes(idx));
              const isSelected = shipAtCell && shipAtCell.id === selectedSetupShipId;

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (shipAtCell) {
                      if (shipAtCell.id === selectedSetupShipId) {
                        handleRotateShip(shipAtCell.id);
                      } else {
                        setSelectedSetupShipId(shipAtCell.id);
                        setSetupOrientation(shipAtCell.orientation || 'H');
                      }
                    }
                  }}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: isSelected
                        ? '#0284c7'
                        : shipAtCell
                        ? '#38bdf8'
                        : isFull
                        ? '#0f172a'
                        : '#f8fafc',
                      borderColor: isFull ? '#1e293b' : '#e2e8f0',
                    },
                  ]}
                >
                  {shipAtCell && (
                    <Ionicons
                      name="shield"
                      size={Math.max(10, cellSize - 10)}
                      color={isSelected ? '#ffffff' : '#0369a1'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Botón de confirmar flota */}
          {!amIReady ? (
            <TouchableOpacity
              onPress={handleConfirmReady}
              style={[styles.actionBtn, { backgroundColor: '#10b981', marginTop: 12 }]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.actionBtnText}>Confirmar y Entrar a Combate</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.readyBadge}>
              <Ionicons name="time" size={16} color="#0284c7" />
              <Text style={styles.readyBadgeText}>
                {isPartnerReady ? 'Iniciando radar naval...' : 'Tu pareja está acomodando sus barcos...'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* FASE 3: COMBATE NAVAL EN VIVO */}
      {bs.phase === 'battle' && (
        <View style={styles.battleContainer}>
          {/* Barra de modos: Radar Ataque vs Mis Barcos */}
          <View style={styles.radarToggleRow}>
            <TouchableOpacity
              onPress={() => setRadarMode('attack')}
              style={[
                styles.radarModeBtn,
                radarMode === 'attack' && { backgroundColor: '#0284c7' },
              ]}
            >
              <Ionicons
                name="locate"
                size={14}
                color={radarMode === 'attack' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.radarModeBtnText,
                  radarMode === 'attack' && { color: '#ffffff' },
                ]}
              >
                Radar Ataque
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRadarMode('fleet')}
              style={[
                styles.radarModeBtn,
                radarMode === 'fleet' && { backgroundColor: '#0284c7' },
              ]}
            >
              <Ionicons
                name="shield"
                size={14}
                color={radarMode === 'fleet' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.radarModeBtnText,
                  radarMode === 'fleet' && { color: '#ffffff' },
                ]}
              >
                Mis Barcos ({currentProfile === 'Karla' ? remainingShipsKarla : remainingShipsJavier}/5)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Turno actual */}
          <View style={styles.turnRow}>
            <View
              style={[
                styles.turnDot,
                {
                  backgroundColor: bs.turn === currentProfile ? '#10b981' : '#f59e0b',
                },
              ]}
            />
            <Text style={[styles.turnText, isFull && { color: '#f8fafc' }]}>
              {bs.turn === currentProfile
                ? '¡Tu turno de disparar!'
                : `Esperando disparo de ${currentProfile === 'Karla' ? 'Javier' : 'Karlita'}...`}
            </Text>
          </View>

          {/* Tablero 10x10 de Combate */}
          <View style={[styles.boardContainer, { width: boardPx, height: boardPx }]}>
            {Array.from({ length: 100 }).map((_, idx) => {
              if (radarMode === 'attack') {
                const hasShot = myShots.includes(idx);
                const hitShip = hasShot && enemyFleet.find((s) => s.cells.includes(idx));
                const isSunk = hitShip && isShipSunk(hitShip, myShots);

                return (
                  <TouchableOpacity
                    key={idx}
                    disabled={hasShot || bs.turn !== currentProfile}
                    activeOpacity={0.65}
                    onPress={() => onFire(idx)}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isSunk
                          ? '#ef4444'
                          : hitShip
                          ? '#f97316'
                          : hasShot
                          ? '#64748b'
                          : isFull
                          ? '#0f172a'
                          : '#f0fdf4',
                        borderColor: isFull ? '#1e293b' : '#cbd5e1',
                      },
                    ]}
                  >
                    {isSunk && <Ionicons name="flame" size={cellSize - 8} color="#ffffff" />}
                    {!isSunk && hitShip && <Ionicons name="close" size={cellSize - 8} color="#ffffff" />}
                    {hasShot && !hitShip && (
                      <View style={styles.waterMissDot} />
                    )}
                  </TouchableOpacity>
                );
              } else {
                // Modo Flota Propia
                const shipAtCell = myFleet.find((s) => s.cells.includes(idx));
                const wasHit = enemyShotsAtMe.includes(idx);

                return (
                  <View
                    key={idx}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: wasHit && shipAtCell
                          ? '#ef4444'
                          : wasHit
                          ? '#64748b'
                          : shipAtCell
                          ? '#38bdf8'
                          : isFull
                          ? '#0f172a'
                          : '#f8fafc',
                        borderColor: isFull ? '#1e293b' : '#e2e8f0',
                      },
                    ]}
                  >
                    {wasHit && shipAtCell && (
                      <Ionicons name="flame" size={cellSize - 8} color="#ffffff" />
                    )}
                  </View>
                );
              }
            })}
          </View>
        </View>
      )}

      {/* FASE 4: PARTIDA TERMINADA */}
      {bs.phase === 'finished' && (
        <View style={styles.endedCard}>
          <Ionicons
            name={bs.winner === currentProfile ? 'trophy' : 'heart'}
            size={48}
            color={bs.winner === currentProfile ? '#f59e0b' : '#ec4899'}
          />
          <Text style={styles.endedTitle}>
            {bs.winner === currentProfile ? '¡Victoria Naval!' : '¡Batalla Terminada!'}
          </Text>
          <Text style={styles.endedSubtitle}>
            {bs.winner === currentProfile
              ? `Hundiste toda la flota enemiga.`
              : `${bs.winner} ganó esta batalla naval.`}
          </Text>
          <TouchableOpacity
            onPress={onReset}
            style={[styles.actionBtn, { backgroundColor: '#0284c7', marginTop: 14 }]}
          >
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={styles.actionBtnText}>Jugar Otra Batalla Naval</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  inviteCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  inviteCardDark: {
    backgroundColor: '#0f172a',
  },
  radarCircleIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  inviteTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  inviteDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    width: '100%',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  setupContainer: {
    alignItems: 'center',
    width: '100%',
  },
  setupHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  setupActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  boardContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0284c7',
    borderWidth: 2,
    borderColor: '#0284c7',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  readyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  battleContainer: {
    alignItems: 'center',
    width: '100%',
  },
  radarToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    width: '100%',
    gap: 4,
  },
  radarModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 6,
  },
  radarModeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  turnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  turnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  waterMissDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  endedCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
  },
  endedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 10,
  },
  endedSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
});

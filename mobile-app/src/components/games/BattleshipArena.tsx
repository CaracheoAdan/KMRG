import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Rect,
  Circle,
  Line,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import {
  GamesState,
  BattleshipShip,
  createRandomBattleshipFleet,
} from '../../services/CoupleSyncService';
import { UserProfile } from '../../types';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';
import { useProfile } from '../../contexts/ProfileContext';

interface Props {
  boardPx: number;
  isFull: boolean;
  primaryColor: string;
  currentProfile: UserProfile;
  battleshipState: GamesState['battleship'];
  onSendInvite: () => void;
  onAcceptInvite: () => void;
  onReadyFleet: (fleet: BattleshipShip[], ready?: boolean) => void;
  onFire: (idx: number) => void;
  onReset: () => void;
  onDragStateChange?: (isDragging: boolean) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

const COLS_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const ROWS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const SHIP_CONFIG: Record<
  string,
  {
    name: string;
    size: number;
    bg: string;
    darkBg: string;
    lightBg: string;
    icon: string;
    desc: string;
  }
> = {
  carrier: {
    name: 'Portaaviones',
    size: 5,
    bg: '#475569',
    darkBg: '#1e293b',
    lightBg: '#94a3b8',
    icon: 'airplane',
    desc: 'Cubierta angular con catapultas y cazas',
  },
  battleship: {
    name: 'Acorazado',
    size: 4,
    bg: '#334155',
    darkBg: '#0f172a',
    lightBg: '#94a3b8',
    icon: 'shield',
    desc: 'Cubierta blindada con torretas triples',
  },
  cruiser: {
    name: 'Crucero',
    size: 3,
    bg: '#0369a1',
    darkBg: '#0c4a6e',
    lightBg: '#38bdf8',
    icon: 'boat',
    desc: 'Lanzadores VLS y helipuerto de popa',
  },
  submarine: {
    name: 'Submarino',
    size: 3,
    bg: '#115e59',
    darkBg: '#042f2e',
    lightBg: '#2dd4bf',
    icon: 'locate',
    desc: 'Casco sigiloso con hidroplanos y periscopio',
  },
  destroyer: {
    name: 'Destructor',
    size: 2,
    bg: '#64748b',
    darkBg: '#334155',
    lightBg: '#cbd5e1',
    icon: 'flame',
    desc: 'Interceptor furtivo de proa afilada',
  },
};

// ============================================================================
// COMPONENTE VISUAL: SILUETA NAVAL REALISTA DESDE ARRIBA (react-native-svg)
// ============================================================================
const getShipIsHoriz = (ship: BattleshipShip): boolean =>
  (ship.orientation ||
    (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';

const computeShipDragPlacement = (
  ship: BattleshipShip,
  allFleet: BattleshipShip[],
  dR: number,
  dC: number
) => {
  const isHoriz = getShipIsHoriz(ship);
  const minR = Math.min(...ship.cells.map((c) => Math.floor(c / 10)));
  const minC = Math.min(...ship.cells.map((c) => c % 10));
  const maxR = isHoriz ? 9 : 10 - ship.size;
  const maxC = isHoriz ? 10 - ship.size : 9;
  const targetR = Math.max(0, Math.min(minR + dR, maxR));
  const targetC = Math.max(0, Math.min(minC + dC, maxC));

  const occupiedByOthers = new Set<number>();
  for (const other of allFleet) {
    if (other.id === ship.id) continue;
    for (const c of other.cells) occupiedByOthers.add(c);
  }

  const tryCellsAt = (r: number, c: number): number[] | null => {
    if (r < 0 || r > maxR || c < 0 || c > maxC) return null;
    const candidate: number[] = [];
    for (let i = 0; i < ship.size; i++) {
      const nr = isHoriz ? r : r + i;
      const nc = isHoriz ? c + i : c;
      const idx = nr * 10 + nc;
      if (occupiedByOthers.has(idx)) return null;
      candidate.push(idx);
    }
    return candidate;
  };

  const rawCells: number[] = [];
  for (let i = 0; i < ship.size; i++) {
    const nr = isHoriz ? targetR : targetR + i;
    const nc = isHoriz ? targetC + i : targetC;
    rawCells.push(nr * 10 + nc);
  }

  return {
    isHoriz,
    targetR,
    targetC,
    rawCells,
    directCells: tryCellsAt(targetR, targetC),
    tryCellsAt,
  };
};

interface NavalShipSpriteProps {
  shipId: string;
  size: number;
  orientation: 'H' | 'V';
  cellSize: number;
  isSelected?: boolean;
  isGhost?: boolean;
  isValidGhost?: boolean;
  isSunk?: boolean;
  isMini?: boolean;
  miniW?: number;
  miniH?: number;
}

const NavalShipSprite = React.memo<NavalShipSpriteProps>(({
  shipId,
  size,
  orientation,
  cellSize,
  isSelected = false,
  isGhost = false,
  isValidGhost = true,
  isSunk = false,
  isMini = false,
  miniW,
  miniH,
}) => {
  const meta = SHIP_CONFIG[shipId] || {
    bg: '#475569',
    darkBg: '#1e293b',
    lightBg: '#94a3b8',
  };

  const W = isMini ? (miniW || size * 14) : size * cellSize;
  const H = isMini ? (miniH || 14) : cellSize;
  const isHoriz = orientation === 'H';

  const svgWidth = isMini ? W : isHoriz ? W : H;
  const svgHeight = isMini ? H : isHoriz ? H : W;

  const gradId = `navalGrad_${shipId}_${isGhost ? (isValidGhost ? 'valid' : 'invalid') : isSunk ? 'sunk' : 'normal'}_${isMini ? 'mini' : 'board'}`;

  const fillStart = isGhost
    ? isValidGhost
      ? 'rgba(34, 197, 94, 0.45)'
      : 'rgba(239, 68, 68, 0.45)'
    : isSunk
    ? '#7f1d1d'
    : meta.lightBg;

  const fillMid = isGhost
    ? isValidGhost
      ? 'rgba(22, 163, 74, 0.55)'
      : 'rgba(220, 38, 38, 0.55)'
    : isSunk
    ? '#450a0a'
    : meta.bg;

  const fillEnd = isGhost
    ? isValidGhost
      ? 'rgba(21, 128, 61, 0.65)'
      : 'rgba(185, 28, 28, 0.65)'
    : isSunk
    ? '#1f0707'
    : meta.darkBg;

  const strokeColor = isGhost
    ? isValidGhost
      ? '#22c55e'
      : '#ef4444'
    : isSelected
    ? '#facc15'
    : isSunk
    ? '#f87171'
    : 'rgba(226, 232, 240, 0.78)';

  const strokeWidth = isGhost ? 2 : isSelected ? 2.4 : isMini ? 0.75 : 1.15;

  // Geometría proporcional compatible tanto en radar (cellSize 26-34) como en badges mini (miniH 11-14)
  const padY = isMini ? Math.max(1.2, H * 0.14) : Math.max(2.6, H * 0.11);
  const yTop = padY;
  const yBot = H - padY;
  const midY = H / 2;
  const beamH = yBot - yTop;
  const bowX = isMini ? 1.4 : 2.8;
  const sternX = W - (isMini ? 1.4 : 2.8);

  const isCarrier = shipId === 'carrier';
  const isSub = shipId === 'submarine';
  const isDestroyer = shipId === 'destroyer';

  const bowLen = isSub
    ? Math.min(W * 0.24, H * 0.65)
    : isDestroyer
    ? Math.min(W * 0.30, H * 0.85)
    : Math.min(W * 0.22, H * 0.72);
  const sternBevel = isSub ? Math.min(W * 0.22, H * 0.55) : Math.min(W * 0.08, 4.5);

  const hullPath = isCarrier
    ? (() => {
        const deckTop = Math.max(1, yTop - (isMini ? 0.3 : 1.0));
        const deckBot = Math.min(H - 1, yBot + (isMini ? 0.3 : 0.8));
        return `M ${bowX} ${yTop + beamH * 0.14} L ${bowX + W * 0.08} ${yTop} L ${W * 0.26} ${deckTop} L ${W * 0.76} ${deckTop} L ${sternX - 2} ${yTop + 0.6} L ${sternX} ${yTop + 2} L ${sternX} ${yBot - 2} L ${sternX - 2} ${deckBot - 0.8} L ${W * 0.14} ${deckBot} L ${bowX + W * 0.05} ${yBot - beamH * 0.12} Z`;
      })()
    : isSub
    ? `M ${bowX + bowLen} ${yTop} L ${W * 0.58} ${yTop} Q ${W * 0.84} ${yTop + beamH * 0.08} ${sternX} ${midY - beamH * 0.22} L ${sternX} ${midY + beamH * 0.22} Q ${W * 0.84} ${yBot - beamH * 0.08} ${W * 0.58} ${yBot} L ${bowX + bowLen} ${yBot} Q ${bowX} ${yBot} ${bowX} ${midY} Q ${bowX} ${yTop} ${bowX + bowLen} ${yTop} Z`
    : `M ${bowX} ${midY} Q ${bowX + bowLen * 0.45} ${yTop} ${bowX + bowLen} ${yTop} L ${sternX - sternBevel} ${yTop} Q ${sternX} ${yTop + 1} ${sternX} ${yTop + beamH * 0.22} L ${sternX} ${yBot - beamH * 0.22} Q ${sternX} ${yBot - 1} ${sternX - sternBevel} ${yBot} L ${bowX + bowLen} ${yBot} Q ${bowX + bowLen * 0.45} ${yBot} ${bowX} ${midY} Z`;

  const innerDeckPath = isCarrier
    ? `M ${bowX + W * 0.1} ${yTop + 2} L ${W * 0.75} ${yTop + 1} L ${sternX - 2.5} ${yTop + 2.5} L ${sternX - 2.5} ${yBot - 2} L ${W * 0.16} ${yBot - 1} Z`
    : isSub
    ? `M ${bowX + bowLen + 2} ${midY - beamH * 0.14} L ${W * 0.72} ${midY - beamH * 0.12} L ${W * 0.72} ${midY + beamH * 0.12} L ${bowX + bowLen + 2} ${midY + beamH * 0.14} Z`
    : `M ${bowX + bowLen * 0.55} ${midY} L ${bowX + bowLen + 1} ${yTop + 2} L ${sternX - sternBevel - 1} ${yTop + 2} L ${sternX - sternBevel - 1} ${yBot - 2} L ${bowX + bowLen + 1} ${yBot - 2} Z`;

  // Contenido detallado horizontal
  const renderHorizontalShipInterior = () => (
    <G opacity={isSunk ? 0.72 : 1}>
      {/* Sombra de casco proyectada sobre el océano */}
      {!isMini && !isGhost && (
        <Path
          d={hullPath}
          transform="translate(1.5, 2.2)"
          fill="rgba(2, 6, 23, 0.55)"
        />
      )}

      {/* Hidroplanos de proa y timones de popa del submarino */}
      {!isGhost && isSub && (
        <G>
          <Rect
            x={W * 0.22}
            y={Math.max(0.8, yTop - (isMini ? 1 : 2.2))}
            width={isMini ? W * 0.08 : 5}
            height={isMini ? 1.3 : 2.6}
            rx={0.6}
            fill="#0d9488"
            stroke="rgba(204, 251, 241, 0.65)"
            strokeWidth={0.5}
          />
          <Rect
            x={W * 0.22}
            y={Math.min(H - 2, yBot - (isMini ? 0.3 : 0.4))}
            width={isMini ? W * 0.08 : 5}
            height={isMini ? 1.3 : 2.6}
            rx={0.6}
            fill="#0d9488"
            stroke="rgba(204, 251, 241, 0.65)"
            strokeWidth={0.5}
          />
          {!isMini && (
            <G>
              <Line
                x1={sternX - 1.5}
                y1={midY - beamH * 0.34}
                x2={sternX - 1.5}
                y2={midY + beamH * 0.34}
                stroke="#5eead4"
                strokeWidth={1.6}
              />
              <Line
                x1={sternX}
                y1={midY - 2.6}
                x2={sternX + 1}
                y2={midY + 2.6}
                stroke="#fbbf24"
                strokeWidth={1.4}
              />
            </G>
          )}
        </G>
      )}

      {/* Estela de espuma blanca en popa */}
      {!isMini && !isGhost && !isSunk && (
        <G opacity={0.45}>
          <Path
            d={`M ${sternX - 2} ${midY - beamH * 0.26} Q ${sternX} ${midY} ${sternX - 2} ${midY + beamH * 0.26}`}
            stroke="#e0f2fe"
            strokeWidth={1.2}
            fill="none"
          />
        </G>
      )}

      {/* Casco principal con acabado metálico */}
      <Path
        d={hullPath}
        fill={`url(#${gradId})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Cubierta interior y bisel de armadura */}
      {!isGhost && (
        <Path
          d={innerDeckPath}
          fill={isSub ? 'rgba(20, 184, 166, 0.16)' : 'rgba(15, 23, 42, 0.36)'}
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth={0.55}
        />
      )}

      {/* 1. PORTAAVIONES: Cubierta angular, catapultas, cables de frenado, torre y cazas delta */}
      {!isGhost && isCarrier && (
        <G>
          {/* Pista angular pintada en grafito oscuro */}
          <Path
            d={`M ${W * 0.18} ${midY - beamH * 0.30} L ${sternX - 3} ${midY + beamH * 0.02} L ${sternX - 3} ${midY + beamH * 0.34} L ${W * 0.18} ${midY + beamH * 0.04} Z`}
            fill="rgba(15, 23, 42, 0.55)"
          />
          {/* Borde táctico amarillo/rojo de pista */}
          <Line
            x1={W * 0.18}
            y1={midY - beamH * 0.30}
            x2={sternX - 3}
            y2={midY + beamH * 0.02}
            stroke="#facc15"
            strokeWidth={isMini ? 0.6 : 1.0}
          />
          {/* Eje central discontinuo de aterrizaje */}
          <Line
            x1={W * 0.20}
            y1={midY - beamH * 0.13}
            x2={sternX - 4}
            y2={midY + beamH * 0.17}
            stroke="#f8fafc"
            strokeWidth={isMini ? 0.75 : 1.3}
            strokeDasharray={isMini ? '2.5,2' : '5,3.5'}
          />
          {/* Rieles de catapultas de proa */}
          {!isMini && (
            <G>
              <Line
                x1={bowX + 5}
                y1={midY - beamH * 0.18}
                x2={W * 0.28}
                y2={midY - beamH * 0.18}
                stroke="#38bdf8"
                strokeWidth={1.1}
              />
              <Line
                x1={bowX + 5}
                y1={midY + beamH * 0.16}
                x2={W * 0.24}
                y2={midY + beamH * 0.16}
                stroke="#38bdf8"
                strokeWidth={1.1}
              />
              {/* 3 cables de detención en cubierta de aterrizaje */}
              <Line
                x1={W * 0.78}
                y1={midY - beamH * 0.08}
                x2={W * 0.78}
                y2={midY + beamH * 0.25}
                stroke="rgba(226, 232, 240, 0.65)"
                strokeWidth={0.9}
              />
              <Line
                x1={W * 0.84}
                y1={midY - beamH * 0.06}
                x2={W * 0.84}
                y2={midY + beamH * 0.27}
                stroke="rgba(226, 232, 240, 0.65)"
                strokeWidth={0.9}
              />
            </G>
          )}
          {/* Isla / Torre de control en estribor */}
          <Rect
            x={W * 0.48}
            y={yBot - beamH * 0.30}
            width={W * 0.16}
            height={beamH * 0.24}
            rx={1.5}
            fill="#0f172a"
            stroke="#cbd5e1"
            strokeWidth={0.65}
          />
          {!isMini && (
            <Rect
              x={W * 0.51}
              y={yBot - beamH * 0.24}
              width={W * 0.09}
              height={beamH * 0.10}
              rx={0.8}
              fill="#38bdf8"
            />
          )}
          {/* 3 Cazas navales de ala delta en cubierta */}
          {!isMini && (
            <G>
              {/* Caza 1 en catapulta proa */}
              <Path
                d={`M ${W * 0.16} ${midY - beamH * 0.18} L ${W * 0.22} ${midY - beamH * 0.30} L ${W * 0.22} ${midY - beamH * 0.06} Z`}
                fill="#e2e8f0"
                stroke="#0f172a"
                strokeWidth={0.5}
              />
              {/* Caza 2 en zona de estacionamiento */}
              <Path
                d={`M ${W * 0.37} ${yBot - beamH * 0.22} L ${W * 0.43} ${yBot - beamH * 0.34} L ${W * 0.43} ${yBot - beamH * 0.10} Z`}
                fill="#cbd5e1"
                stroke="#0f172a"
                strokeWidth={0.5}
              />
              {/* Caza 3 en popa estribor */}
              <Path
                d={`M ${W * 0.69} ${yBot - beamH * 0.20} L ${W * 0.75} ${yBot - beamH * 0.32} L ${W * 0.75} ${yBot - beamH * 0.08} Z`}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth={0.45}
              />
            </G>
          )}
        </G>
      )}

      {/* 2. ACORAZADO: Cubierta de madera teca, 3 torretas triples y ciudadela */}
      {!isGhost && shipId === 'battleship' && (
        <G>
          {/* Cubierta central de teca clásica */}
          <Rect
            x={bowX + bowLen + 1}
            y={midY - beamH * 0.28}
            width={Math.max(4, sternX - bowX - bowLen - sternBevel - 2)}
            height={beamH * 0.56}
            rx={2}
            fill="rgba(180, 83, 9, 0.48)"
            stroke="rgba(253, 230, 138, 0.25)"
            strokeWidth={0.5}
          />
          {!isMini && (
            <Line
              x1={bowX + bowLen + 3}
              y1={midY}
              x2={sternX - sternBevel - 3}
              y2={midY}
              stroke="rgba(254, 243, 199, 0.2)"
              strokeWidth={0.7}
            />
          )}

          {/* Torre 1 Proa (3 cañones) */}
          <Circle
            cx={W * 0.25}
            cy={midY}
            r={isMini ? Math.max(1.8, H * 0.17) : Math.max(3.6, H * 0.16)}
            fill="#475569"
            stroke="#e2e8f0"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.25}
            y1={midY - (isMini ? 0.8 : 1.5)}
            x2={W * 0.25 - (isMini ? 3.5 : 8.5)}
            y2={midY - (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.25}
            y1={midY}
            x2={W * 0.25 - (isMini ? 3.5 : 8.5)}
            y2={midY}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.25}
            y1={midY + (isMini ? 0.8 : 1.5)}
            x2={W * 0.25 - (isMini ? 3.5 : 8.5)}
            y2={midY + (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />

          {/* Torre 2 Superfiring (3 cañones) */}
          <Circle
            cx={W * 0.41}
            cy={midY}
            r={isMini ? Math.max(1.8, H * 0.17) : Math.max(3.6, H * 0.16)}
            fill="#64748b"
            stroke="#e2e8f0"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.41}
            y1={midY - (isMini ? 0.8 : 1.5)}
            x2={W * 0.41 - (isMini ? 3.5 : 8.5)}
            y2={midY - (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.41}
            y1={midY}
            x2={W * 0.41 - (isMini ? 3.5 : 8.5)}
            y2={midY}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.41}
            y1={midY + (isMini ? 0.8 : 1.5)}
            x2={W * 0.41 - (isMini ? 3.5 : 8.5)}
            y2={midY + (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />

          {/* Ciudadela central blindada */}
          <Rect
            x={W * 0.52}
            y={midY - beamH * 0.28}
            width={W * 0.17}
            height={beamH * 0.56}
            rx={2}
            fill="#1e293b"
            stroke="#cbd5e1"
            strokeWidth={0.75}
          />
          <Rect
            x={W * 0.55}
            y={midY - beamH * 0.14}
            width={W * 0.08}
            height={beamH * 0.28}
            rx={1}
            fill="#f59e0b"
          />

          {/* Torre 3 Popa (3 cañones) */}
          <Circle
            cx={W * 0.80}
            cy={midY}
            r={isMini ? Math.max(1.8, H * 0.17) : Math.max(3.6, H * 0.16)}
            fill="#475569"
            stroke="#e2e8f0"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.80}
            y1={midY - (isMini ? 0.8 : 1.5)}
            x2={W * 0.80 + (isMini ? 3.5 : 8.5)}
            y2={midY - (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.80}
            y1={midY}
            x2={W * 0.80 + (isMini ? 3.5 : 8.5)}
            y2={midY}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
          <Line
            x1={W * 0.80}
            y1={midY + (isMini ? 0.8 : 1.5)}
            x2={W * 0.80 + (isMini ? 3.5 : 8.5)}
            y2={midY + (isMini ? 0.8 : 1.5)}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.7 : 1.3}
          />
        </G>
      )}

      {/* 3. CRUCERO: Cañón proa, módulo VLS, chimeneas y helipuerto trasero */}
      {!isGhost && shipId === 'cruiser' && (
        <G>
          {/* Cañón automático proa */}
          <Circle
            cx={W * 0.22}
            cy={midY}
            r={isMini ? 1.7 : 3.2}
            fill="#e0f2fe"
            stroke="#0f172a"
            strokeWidth={0.65}
          />
          <Line
            x1={W * 0.22}
            y1={midY}
            x2={W * 0.22 - (isMini ? 3.2 : 7.5)}
            y2={midY}
            stroke="#082f49"
            strokeWidth={isMini ? 0.8 : 1.4}
          />

          {/* Matriz de lanzadores verticales de misiles VLS */}
          {!isMini && (
            <Rect
              x={W * 0.30}
              y={midY - beamH * 0.19}
              width={W * 0.10}
              height={beamH * 0.38}
              rx={1}
              fill="#082f49"
              stroke="#7dd3fc"
              strokeWidth={0.7}
            />
          )}

          {/* Puente de mando y chimeneas dobles */}
          <Rect
            x={W * 0.44}
            y={midY - beamH * 0.24}
            width={W * 0.22}
            height={beamH * 0.48}
            rx={1.5}
            fill="#0c4a6e"
            stroke="#bae6fd"
            strokeWidth={0.7}
          />
          <Circle
            cx={W * 0.51}
            cy={midY}
            r={isMini ? 1 : 1.8}
            fill="#020617"
            stroke="#7dd3fc"
            strokeWidth={0.5}
          />
          <Circle
            cx={W * 0.60}
            cy={midY}
            r={isMini ? 1 : 1.8}
            fill="#020617"
            stroke="#7dd3fc"
            strokeWidth={0.5}
          />

          {/* Helipuerto en cubierta de popa con marca "H" */}
          <Circle
            cx={W * 0.81}
            cy={midY}
            r={isMini ? Math.max(1.8, H * 0.20) : Math.max(4, H * 0.22)}
            fill="rgba(15, 23, 42, 0.55)"
            stroke="#fbbf24"
            strokeWidth={isMini ? 0.65 : 1}
          />
          {!isMini && (
            <Path
              d={`M ${W * 0.81 - 2} ${midY - 2.2} L ${W * 0.81 - 2} ${midY + 2.2} M ${W * 0.81 + 2} ${midY - 2.2} L ${W * 0.81 + 2} ${midY + 2.2} M ${W * 0.81 - 2} ${midY} L ${W * 0.81 + 2} ${midY}`}
              stroke="#f8fafc"
              strokeWidth={1.1}
            />
          )}
        </G>
      )}

      {/* 4. SUBMARINO: Vela hidrodinámica, periscopio óptico y ranuras de lastre */}
      {!isGhost && isSub && (
        <G>
          {/* Línea dorsal continua */}
          {!isMini && (
            <Line
              x1={bowX + bowLen}
              y1={midY}
              x2={sternX - 4}
              y2={midY}
              stroke="rgba(153, 246, 228, 0.25)"
              strokeWidth={0.9}
              strokeDasharray="3,2"
            />
          )}
          {/* Vela de mando */}
          <Rect
            x={W * 0.39}
            y={midY - beamH * 0.22}
            width={W * 0.20}
            height={beamH * 0.44}
            rx={isMini ? 1.8 : 3.5}
            fill="#042f2e"
            stroke="#5eead4"
            strokeWidth={0.75}
          />
          {/* Lente de periscopio / radar */}
          <Circle
            cx={W * 0.48}
            cy={midY}
            r={isMini ? 1.1 : 2}
            fill="#38bdf8"
            stroke="#ffffff"
            strokeWidth={0.55}
          />
          {!isMini && (
            <G opacity={0.45}>
              <Line x1={W * 0.21} y1={yTop + 2} x2={W * 0.34} y2={yTop + 2} stroke="#99f6e4" strokeWidth={0.9} />
              <Line x1={W * 0.21} y1={yBot - 2} x2={W * 0.34} y2={yBot - 2} stroke="#99f6e4" strokeWidth={0.9} />
              <Line x1={W * 0.64} y1={yTop + 2.5} x2={W * 0.76} y2={yTop + 3.2} stroke="#99f6e4" strokeWidth={0.9} />
              <Line x1={W * 0.64} y1={yBot - 2.5} x2={W * 0.76} y2={yBot - 3.2} stroke="#99f6e4" strokeWidth={0.9} />
            </G>
          )}
        </G>
      )}

      {/* 5. DESTRUCTOR: Interceptor furtivo con chevrón de proa, torreta y lanzamisiles */}
      {!isGhost && isDestroyer && (
        <G>
          {/* Chevrón de velocidad en proa */}
          {!isMini && (
            <Path
              d={`M ${bowX + W * 0.22} ${midY - beamH * 0.20} L ${bowX + W * 0.11} ${midY} L ${bowX + W * 0.22} ${midY + beamH * 0.20}`}
              stroke="#38bdf8"
              strokeWidth={1.1}
              fill="none"
            />
          )}
          {/* Torreta furtiva de tiro rápido */}
          <Circle
            cx={W * 0.34}
            cy={midY}
            r={isMini ? 1.7 : 3.2}
            fill="#1e293b"
            stroke="#f8fafc"
            strokeWidth={0.65}
          />
          <Line
            x1={W * 0.34}
            y1={midY}
            x2={W * 0.34 - (isMini ? 3 : 7)}
            y2={midY}
            stroke="#0f172a"
            strokeWidth={isMini ? 0.8 : 1.4}
          />
          {/* Puente angular + barra radar */}
          <Rect
            x={W * 0.50}
            y={midY - beamH * 0.23}
            width={W * 0.20}
            height={beamH * 0.46}
            rx={1.5}
            fill="#0f172a"
            stroke="#cbd5e1"
            strokeWidth={0.65}
          />
          <Line
            x1={W * 0.60}
            y1={midY - beamH * 0.16}
            x2={W * 0.60}
            y2={midY + beamH * 0.16}
            stroke="#38bdf8"
            strokeWidth={isMini ? 0.75 : 1.2}
          />
          {/* Celdas lanzamisiles en popa */}
          {!isMini && (
            <G>
              <Rect
                x={W * 0.76}
                y={midY - beamH * 0.20}
                width={W * 0.10}
                height={beamH * 0.16}
                rx={0.8}
                fill="#ef4444"
              />
              <Rect
                x={W * 0.76}
                y={midY + beamH * 0.04}
                width={W * 0.10}
                height={beamH * 0.16}
                rx={0.8}
                fill="#ef4444"
              />
            </G>
          )}
        </G>
      )}
    </G>
  );

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      pointerEvents="none"
    >
      <Defs>
        <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={fillStart} />
          <Stop offset="50%" stopColor={fillMid} />
          <Stop offset="100%" stopColor={fillEnd} />
        </SvgLinearGradient>
      </Defs>

      {/* Si es vertical, aplicar rotación exacta de 90 grados horaria sin duplicar código */}
      {isHoriz || isMini ? (
        renderHorizontalShipInterior()
      ) : (
        <G transform={`rotate(90) translate(0, -${H})`}>
          {renderHorizontalShipInterior()}
        </G>
      )}
    </Svg>
  );
});

const OceanSonarOverlay = React.memo<{ gridWidth: number; coordsHeaderPx: number }>(({
  gridWidth,
  coordsHeaderPx,
}) => {
  const half = gridWidth / 2;
  return (
    <Svg
      style={[StyleSheet.absoluteFill, { left: coordsHeaderPx }]}
      pointerEvents="none"
      width={gridWidth}
      height={gridWidth}
    >
      {/* Anillos concéntricos de radar naval */}
      <Circle
        cx={half}
        cy={half}
        r={gridWidth * 0.18}
        stroke="rgba(56, 189, 248, 0.14)"
        strokeWidth={0.9}
        strokeDasharray="4,4"
        fill="none"
      />
      <Circle
        cx={half}
        cy={half}
        r={gridWidth * 0.34}
        stroke="rgba(56, 189, 248, 0.12)"
        strokeWidth={0.9}
        strokeDasharray="5,5"
        fill="none"
      />
      <Circle
        cx={half}
        cy={half}
        r={gridWidth * 0.48}
        stroke="rgba(56, 189, 248, 0.11)"
        strokeWidth={1}
        fill="none"
      />
      {/* Ejes de retícula de sonar */}
      <Line
        x1={half}
        y1={0}
        x2={half}
        y2={gridWidth}
        stroke="rgba(56, 189, 248, 0.10)"
        strokeWidth={0.8}
      />
      <Line
        x1={0}
        y1={half}
        x2={gridWidth}
        y2={half}
        stroke="rgba(56, 189, 248, 0.10)"
        strokeWidth={0.8}
      />
      {/* Ondas oceánicas sutiles */}
      <Path
        d={`M 0 ${gridWidth * 0.25} Q ${gridWidth * 0.25} ${gridWidth * 0.22} ${half} ${gridWidth * 0.25} T ${gridWidth} ${gridWidth * 0.25}`}
        stroke="rgba(125, 211, 252, 0.11)"
        strokeWidth={1.1}
        fill="none"
      />
      <Path
        d={`M 0 ${gridWidth * 0.56} Q ${gridWidth * 0.3} ${gridWidth * 0.59} ${gridWidth * 0.6} ${gridWidth * 0.54} T ${gridWidth} ${gridWidth * 0.56}`}
        stroke="rgba(125, 211, 252, 0.09)"
        strokeWidth={1.1}
        fill="none"
      />
      <Path
        d={`M 0 ${gridWidth * 0.84} Q ${gridWidth * 0.2} ${gridWidth * 0.81} ${half} ${gridWidth * 0.85} T ${gridWidth} ${gridWidth * 0.84}`}
        stroke="rgba(125, 211, 252, 0.10)"
        strokeWidth={1.1}
        fill="none"
      />
    </Svg>
  );
});

// ============================================================================
// COMPONENTE PRINCIPAL: BATTLESHIP ARENA
// ============================================================================
export const BattleshipArena: React.FC<Props> = ({
  currentProfile,
  battleshipState: bs,
  onSendInvite,
  onAcceptInvite,
  onReadyFleet,
  onFire,
  onReset,
  onDragStateChange: _onDragStateChange,
}) => {
  const { getDisplayName, getAvatarUri } = useProfile();
  const partnerProfile: UserProfile = currentProfile === 'Karla' ? 'Javier' : 'Karla';
  const myDisplayName = getDisplayName(currentProfile);
  const partnerDisplayName = getDisplayName(partnerProfile);
  const myAvatarUri = getAvatarUri(currentProfile);
  const partnerAvatarUri = getAvatarUri(partnerProfile);
  const formatShotCoord = (cell: number) =>
    `${COLS_LETTERS[cell % 10]}${Math.floor(cell / 10) + 1}`;

  const [radarMode, setRadarMode] = useState<'attack' | 'fleet'>('attack');
  const [localSetupFleet, setLocalSetupFleet] = useState<BattleshipShip[] | null>(null);
  const [selectedSetupShipId, setSelectedSetupShipId] = useState<string>('carrier');

  // Estado del arrastre (Drag & Drop)
  const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
  const [ghostPlacement, setGhostPlacement] = useState<{
    shipId: string;
    orientation: 'H' | 'V';
    cells: number[];
    isValid: boolean;
  } | null>(null);

  // Aviso interactivo dinámico ("No cabe aquí", etc.)
  const [helpBanner, setHelpBanner] = useState<{ text: string; isError: boolean } | null>(null);
  const helpBannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animaciones
  const radarPulseAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dragPan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Detección de doble toque y toques rápidos
  const lastTapRef = useRef<{ time: number; shipId: string }>({ time: 0, shipId: '' });

  // Dimensionamiento simétrico riguroso para eliminar el recorte de la columna J
  const availableWidth = Math.min(SCREEN_W - 24, 360);
  const coordsHeaderPx = 18;
  const framePadding = 4;
  const frameBorder = 2;
  const totalGutter = coordsHeaderPx + framePadding * 2 + frameBorder * 2;
  const cellSize = Math.floor((availableWidth - totalGutter) / 10);
  const gridWidth = cellSize * 10;
  const exactFrameWidth = gridWidth + totalGutter;

  // Pulso de radar
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

  // Limpiar timer de aviso
  useEffect(() => {
    return () => {
      if (helpBannerTimeoutRef.current) clearTimeout(helpBannerTimeoutRef.current);
    };
  }, []);

  const showBanner = (text: string, isError = false) => {
    if (helpBannerTimeoutRef.current) clearTimeout(helpBannerTimeoutRef.current);
    setHelpBanner({ text, isError });
    helpBannerTimeoutRef.current = setTimeout(() => {
      setHelpBanner(null);
    }, 2500);
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -8, duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  // Flota propia sincronizada
  const myFleet: BattleshipShip[] = useMemo(() => {
    if (bs.phase === 'setup' && localSetupFleet && localSetupFleet.length === 5) {
      return localSetupFleet;
    }
    const fromState = currentProfile === 'Karla' ? bs.fleetKarla : bs.fleetJavier;
    if (fromState && fromState.length === 5) return fromState;
    if (localSetupFleet && localSetupFleet.length === 5) return localSetupFleet;
    return createRandomBattleshipFleet();
  }, [localSetupFleet, currentProfile, bs.fleetKarla, bs.fleetJavier, bs.phase]);

  useEffect(() => {
    if (bs.phase === 'battle') {
      setLocalSetupFleet(null);
    } else if (bs.phase === 'finished') {
      setLocalSetupFleet(null);
      setRadarMode('attack');
    }
  }, [bs.phase]);

  const isMyTurn = bs.phase === 'battle' && bs.turn === currentProfile;
  const enemyFleet: BattleshipShip[] =
    currentProfile === 'Karla' ? bs.fleetJavier || [] : bs.fleetKarla || [];
  const myShots: number[] =
    currentProfile === 'Karla' ? bs.shotsByKarla || [] : bs.shotsByJavier || [];
  const enemyShots: number[] =
    currentProfile === 'Karla' ? bs.shotsByJavier || [] : bs.shotsByKarla || [];

  const amIReady = currentProfile === 'Karla' ? bs.readyKarla : bs.readyJavier;
  const isPartnerReady = currentProfile === 'Karla' ? bs.readyJavier : bs.readyKarla;

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

  // Validación rigurosa de flota para habilitar "Confirmar Flota"
  const isFleetValid = useMemo(() => {
    if (!myFleet || myFleet.length !== 5) return false;
    const allCells = new Set<number>();
    for (const ship of myFleet) {
      const conf = SHIP_CONFIG[ship.id];
      if (!conf || ship.cells.length !== conf.size) return false;
      for (const c of ship.cells) {
        if (c < 0 || c >= 100) return false;
        if (allCells.has(c)) return false;
        allCells.add(c);
      }
    }
    return allCells.size === 17;
  }, [myFleet]);

  // ============================================================================
  // ROTACIÓN INTELIGENTE (Proa, Inward-push, Búsqueda radio 2, Shake y Banner)
  // ============================================================================
  const handleSmartRotate = useCallback(
    (shipId: string) => {
      const ship = myFleet.find((s) => s.id === shipId);
      if (!ship) return;

      const isHoriz =
        (ship.orientation ||
          (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';
      const newOrient: 'H' | 'V' = isHoriz ? 'V' : 'H';
      const size = ship.size;

      // Casilla de proa (origen)
      const originCell = ship.cells[0];
      const r0 = Math.floor(originCell / 10);
      const c0 = originCell % 10;

      // Empujar hacia adentro si al rotar se saldría del tablero
      const maxR = newOrient === 'V' ? 10 - size : 9;
      const maxC = newOrient === 'H' ? 10 - size : 9;
      const baseR = Math.max(0, Math.min(r0, maxR));
      const baseC = Math.max(0, Math.min(c0, maxC));

      const otherShips = myFleet.filter((s) => s.id !== shipId);
      const occupiedByOthers = new Set<number>();
      for (const s of otherShips) {
        for (const cell of s.cells) {
          occupiedByOthers.add(cell);
        }
      }

      const checkPlacement = (r: number, c: number): number[] | null => {
        if (newOrient === 'V' && (r < 0 || r + size > 10 || c < 0 || c > 9)) return null;
        if (newOrient === 'H' && (r < 0 || r > 9 || c < 0 || c + size > 10)) return null;

        const cells: number[] = [];
        for (let i = 0; i < size; i++) {
          const nr = newOrient === 'H' ? r : r + i;
          const nc = newOrient === 'H' ? c + i : c;
          const cellIdx = nr * 10 + nc;
          if (occupiedByOthers.has(cellIdx)) return null;
          cells.push(cellIdx);
        }
        return cells;
      };

      // 1. Probar posición base empujada
      let validCells = checkPlacement(baseR, baseC);

      // 2. Si choca, buscar en un radio de 2 casillas ordenadas por cercanía
      if (!validCells) {
        const offsets: Array<{ dr: number; dc: number; distSq: number }> = [];
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (dr === 0 && dc === 0) continue;
            offsets.push({ dr, dc, distSq: dr * dr + dc * dc });
          }
        }
        offsets.sort((a, b) => a.distSq - b.distSq);

        for (const off of offsets) {
          const testR = baseR + off.dr;
          const testC = baseC + off.dc;
          const candidate = checkPlacement(testR, testC);
          if (candidate) {
            validCells = candidate;
            break;
          }
        }
      }

      // 3. Si no cabe en ninguna, no rota: shake + vibración error + aviso
      if (!validCells) {
        void triggerGameHaptic('error');
        triggerShake();
        showBanner('No cabe aquí', true);
        return;
      }

      // Rotación exitosa
      const updated: BattleshipShip[] = myFleet.map((s) =>
        s.id === shipId ? { ...s, orientation: newOrient, cells: validCells! } : s
      );
      setLocalSetupFleet(updated);
      if (amIReady) {
        onReadyFleet(updated, false);
      }
      void triggerGameHaptic('selection');
    },
    [myFleet, amIReady, onReadyFleet]
  );

  // ============================================================================
  // MOVER TOCANDO CASILLA VACÍA
  // ============================================================================
  const handleMoveShipToCell = useCallback(
    (shipId: string, targetCellIdx: number) => {
      const ship = myFleet.find((s) => s.id === shipId);
      if (!ship) return;

      const isHoriz =
        (ship.orientation ||
          (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1 ? 'H' : 'V')) === 'H';
      const size = ship.size;

      const r = Math.floor(targetCellIdx / 10);
      const c = targetCellIdx % 10;

      // Clamping para que el barco quepa adentro del tablero
      const maxR = isHoriz ? 9 : 10 - size;
      const maxC = isHoriz ? 10 - size : 9;
      const safeR = Math.max(0, Math.min(r, maxR));
      const safeC = Math.max(0, Math.min(c, maxC));

      const otherShips = myFleet.filter((s) => s.id !== shipId);
      const occupiedByOthers = new Set<number>();
      for (const s of otherShips) {
        for (const cell of s.cells) {
          occupiedByOthers.add(cell);
        }
      }

      const checkAt = (rPos: number, cPos: number): number[] | null => {
        if (isHoriz && (rPos < 0 || rPos > 9 || cPos < 0 || cPos + size > 10)) return null;
        if (!isHoriz && (rPos < 0 || rPos + size > 10 || cPos < 0 || cPos > 9)) return null;
        const cells: number[] = [];
        for (let i = 0; i < size; i++) {
          const nr = isHoriz ? rPos : rPos + i;
          const nc = isHoriz ? cPos + i : cPos;
          const cellIdx = nr * 10 + nc;
          if (occupiedByOthers.has(cellIdx)) return null;
          cells.push(cellIdx);
        }
        return cells;
      };

      let placed = checkAt(safeR, safeC);

      // Si choca, intentar alrededor en radio 1
      if (!placed) {
        const offsets = [
          { dr: -1, dc: 0 },
          { dr: 1, dc: 0 },
          { dr: 0, dc: -1 },
          { dr: 0, dc: 1 },
        ];
        for (const off of offsets) {
          const cand = checkAt(safeR + off.dr, safeC + off.dc);
          if (cand) {
            placed = cand;
            break;
          }
        }
      }

      if (!placed) {
        void triggerGameHaptic('error');
        triggerShake();
        showBanner('No cabe aquí', true);
        return;
      }

      const updated: BattleshipShip[] = myFleet.map((s) =>
        s.id === shipId ? { ...s, cells: placed! } : s
      );
      setLocalSetupFleet(updated);
      if (amIReady) {
        onReadyFleet(updated, false);
      }
      void triggerGameHaptic('selection');
    },
    [myFleet, amIReady, onReadyFleet]
  );

  // ============================================================================
  // REVOLVER ALEATORIAMENTE (Sin desbordes ni choques)
  // ============================================================================
  const handleRandomizeFleet = () => {
    const randomized = createRandomBattleshipFleet();
    setLocalSetupFleet(randomized);
    if (amIReady) {
      onReadyFleet(randomized, false);
    }
    void triggerGameHaptic('medium');
    showBanner('Flota redistribuida al azar');
  };

  const handleConfirmReady = () => {
    if (myFleet && isFleetValid) {
      void triggerGameHaptic('success');
      onReadyFleet(myFleet, true);
      setRadarMode('attack');
    }
  };

  const handleUnlockFleet = () => {
    void triggerGameHaptic('light');
    onReadyFleet(myFleet, false);
  };

  const handleFireAtCell = (idx: number) => {
    void triggerGameHaptic('heavy');
    onFire(idx);
  };

  // Ref con estado actual para PanResponders y handlers
  const stateRef = useRef({
    myFleet,
    selectedSetupShipId,
    draggedShipId,
    cellSize,
    coordsHeaderPx,
    amIReady,
    handleSmartRotate,
    onReadyFleet,
    showBanner,
    triggerShake,
  });
  useEffect(() => {
    stateRef.current = {
      myFleet,
      selectedSetupShipId,
      draggedShipId,
      cellSize,
      coordsHeaderPx,
      amIReady,
      handleSmartRotate,
      onReadyFleet,
      showBanner,
      triggerShake,
    };
  });

  // Ref para reducir re-renders durante el arrastre (throttling de celda objetivo)
  const lastGhostKeyRef = useRef<string>('');

  // ============================================================================
  // PANRESPONDERS ESTABLES PARA ARRASTRE Y ROTACIÓN DE BARCOS
  // Se mantienen idénticos entre renders para que React Native nunca aborte el gesto
  // ============================================================================
  const panRespondersRef = useRef<Record<string, ReturnType<typeof PanResponder.create>>>({});

  const getShipPanResponder = useCallback(
    (shipId: string) => {
      if (!panRespondersRef.current[shipId]) {
        panRespondersRef.current[shipId] = PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onStartShouldSetPanResponderCapture: () => false,
          onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
          onMoveShouldSetPanResponderCapture: (_, gesture) =>
            Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
          onPanResponderTerminationRequest: () => false,

          onPanResponderGrant: () => {
            const {
              myFleet: currentFleet,
              selectedSetupShipId: currentSelected,
              amIReady: ready,
              onReadyFleet: syncReady,
            } = stateRef.current;

            if (ready) {
              syncReady(currentFleet, false);
            }

            const currentShip = currentFleet.find((s) => s.id === shipId);
            if (!currentShip) return;

            setDraggedShipId(shipId);
            if (currentSelected !== shipId) {
              setSelectedSetupShipId(shipId);
            }
            lastGhostKeyRef.current = '';
            dragPan.setValue({ x: 0, y: 0 });
            void triggerGameHaptic('selection');
          },

          onPanResponderMove: (_, gesture) => {
            dragPan.setValue({ x: gesture.dx, y: gesture.dy });

            const { myFleet: currentFleet, cellSize: cSize } = stateRef.current;
            const currentShip = currentFleet.find((s) => s.id === shipId);
            if (!currentShip) return;

            const dR = Math.round(gesture.dy / cSize);
            const dC = Math.round(gesture.dx / cSize);
            const { isHoriz, targetR, targetC, rawCells, directCells } = computeShipDragPlacement(
              currentShip,
              currentFleet,
              dR,
              dC
            );

            const isValidPlacement = Boolean(directCells);
            const stateKey = `${currentShip.id}_${targetR}_${targetC}_${isValidPlacement}`;

            if (stateKey !== lastGhostKeyRef.current) {
              lastGhostKeyRef.current = stateKey;
              setGhostPlacement({
                shipId: currentShip.id,
                orientation: isHoriz ? 'H' : 'V',
                cells: rawCells,
                isValid: isValidPlacement,
              });
            }
          },

          onPanResponderRelease: (_, gesture) => {
            const {
              myFleet: currentFleet,
              cellSize: cSize,
              selectedSetupShipId: currentSelected,
              handleSmartRotate: rotateShip,
              showBanner: banner,
              triggerShake: shake,
            } = stateRef.current;

            const currentShip = currentFleet.find((s) => s.id === shipId);
            if (!currentShip) {
              setDraggedShipId(null);
              setGhostPlacement(null);
              dragPan.setValue({ x: 0, y: 0 });
              return;
            }

            const wasTap = Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6;

            if (wasTap) {
              dragPan.setValue({ x: 0, y: 0 });
              setGhostPlacement(null);
              setDraggedShipId(null);

              const now = Date.now();
              const lastTap = lastTapRef.current;
              const isDoubleTap = lastTap.shipId === shipId && now - lastTap.time < 350;
              lastTapRef.current = { time: now, shipId };

              if (currentSelected === shipId || isDoubleTap) {
                rotateShip(shipId);
              } else {
                setSelectedSetupShipId(shipId);
                void triggerGameHaptic('selection');
              }
              return;
            }

            // Arrastre terminado: usar posición sujeta al tablero + snap cercano de 1 casilla
            const dR = Math.round(gesture.dy / cSize);
            const dC = Math.round(gesture.dx / cSize);
            const { targetR, targetC, directCells, tryCellsAt } = computeShipDragPlacement(
              currentShip,
              currentFleet,
              dR,
              dC
            );

            let placedCells: number[] | null = directCells;
            if (!placedCells) {
              const nearbyOffsets = [
                { dr: -1, dc: 0 },
                { dr: 1, dc: 0 },
                { dr: 0, dc: -1 },
                { dr: 0, dc: 1 },
                { dr: -1, dc: -1 },
                { dr: -1, dc: 1 },
                { dr: 1, dc: -1 },
                { dr: 1, dc: 1 },
              ];
              for (const off of nearbyOffsets) {
                const candidate = tryCellsAt(targetR + off.dr, targetC + off.dc);
                if (candidate) {
                  placedCells = candidate;
                  break;
                }
              }
            }

            dragPan.setValue({ x: 0, y: 0 });
            setGhostPlacement(null);
            setDraggedShipId(null);

            if (placedCells) {
              const updated = currentFleet.map((s) =>
                s.id === currentShip.id ? { ...s, cells: placedCells! } : s
              );
              setLocalSetupFleet(updated);
              void triggerGameHaptic('selection');
            } else {
              void triggerGameHaptic('error');
              shake();
              banner('No cabe aquí', true);
            }
          },

          onPanResponderTerminate: () => {
            dragPan.setValue({ x: 0, y: 0 });
            setDraggedShipId(null);
            setGhostPlacement(null);
          },
        });
      }
      return panRespondersRef.current[shipId];
    },
    [dragPan]
  );

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
              {bs.phase === 'invited' && bs.invitedBy && getAvatarUri(bs.invitedBy) ? (
                <Image
                  source={{ uri: getAvatarUri(bs.invitedBy)! }}
                  style={styles.inviteAvatarImg}
                />
              ) : (
                <Ionicons name="boat" size={38} color="#38bdf8" />
              )}
            </Animated.View>

            <Text style={styles.oceanCardTitle}>Battleship Naval en Pareja</Text>
            <Text style={styles.oceanCardSubtitle}>
              {bs.phase === 'invited'
                ? `${bs.invitedBy ? getDisplayName(bs.invitedBy) : partnerDisplayName} te desafió a un combate naval.`
                : `Invita a ${partnerDisplayName} a un combate táctico en el océano de 10x10.`}
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
        <Animated.View
          style={[styles.setupWrap, { transform: [{ translateX: shakeAnim }] }]}
        >
          {/* Barra Superior con Controles */}
          <View style={[styles.setupToolsBar, { width: exactFrameWidth }]}>
            <View style={styles.setupInfoTextGroup}>
              <Text style={styles.setupHeaderTitle}>Acomoda tu Flota</Text>
              {/* Línea de ayuda interactiva dinámica */}
              <View
                style={[
                  styles.helpBannerPill,
                  helpBanner?.isError && styles.helpBannerPillError,
                ]}
              >
                <Ionicons
                  name={
                    helpBanner?.isError
                      ? 'alert-circle'
                      : selectedSetupShipId
                      ? 'move'
                      : 'information-circle'
                  }
                  size={12}
                  color={helpBanner?.isError ? '#ef4444' : '#64748b'}
                />
                <Text
                  style={[
                    styles.helpBannerText,
                    helpBanner?.isError && styles.helpBannerTextError,
                  ]}
                  numberOfLines={1}
                >
                  {helpBanner?.text ||
                    (selectedSetupShipId
                      ? 'Arrástralo o toca Rotar'
                      : 'Toca un barco para seleccionarlo')}
                </Text>
              </View>
            </View>

            <View style={styles.setupActionsRow}>
              <TouchableOpacity
                onPress={handleRandomizeFleet}
                style={styles.actionChip}
                accessibilityLabel="Posición aleatoria de barcos"
                activeOpacity={0.7}
              >
                <Ionicons name="shuffle" size={14} color="#0284c7" />
                <Text style={styles.actionChipText}>Aleatorio</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSmartRotate(selectedSetupShipId)}
                style={[styles.actionChip, styles.actionChipRotate]}
                accessibilityLabel="Rotar barco seleccionado"
                activeOpacity={0.7}
              >
                <Ionicons name="sync" size={14} color="#ffffff" />
                <Text style={[styles.actionChipText, { color: '#ffffff' }]}>Rotar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tablero Océano 10x10 con Coordenadas Exactas */}
          <LinearGradient
            colors={['#020617', '#06243b', '#0a3a5c']}
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
                  <View
                    style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}
                  >
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;
                    const isAlternate = (r + c) % 2 === 0;

                    return (
                      <TouchableOpacity
                        key={idx}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (selectedSetupShipId) {
                            handleMoveShipToCell(selectedSetupShipId, idx);
                          }
                        }}
                        style={[
                          styles.oceanCell,
                          {
                            width: cellSize,
                            height: cellSize,
                            backgroundColor: isAlternate
                              ? 'rgba(15, 45, 72, 0.52)'
                              : 'rgba(6, 28, 49, 0.72)',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}

              {/* Radar de sonar concéntrico y ondas oceánicas */}
              <OceanSonarOverlay gridWidth={gridWidth} coordsHeaderPx={coordsHeaderPx} />

              {/* Sombra Fantasma ligera (View sin SVG) mientras se arrastra */}
              {ghostPlacement && ghostPlacement.cells.length > 0 && (() => {
                const ghostMinR = Math.min(...ghostPlacement.cells.map((c) => Math.floor(c / 10)));
                const ghostMinC = Math.min(...ghostPlacement.cells.map((c) => c % 10));
                const gLeft = ghostMinC * cellSize + coordsHeaderPx;
                const gTop = ghostMinR * cellSize;
                const ghostW =
                  ghostPlacement.orientation === 'H'
                    ? ghostPlacement.cells.length * cellSize
                    : cellSize;
                const ghostH =
                  ghostPlacement.orientation === 'H'
                    ? cellSize
                    : ghostPlacement.cells.length * cellSize;

                return (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.ghostShipContainer,
                      {
                        left: gLeft + 2,
                        top: gTop + 2,
                        width: ghostW - 4,
                        height: ghostH - 4,
                        zIndex: 40,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: ghostPlacement.isValid ? '#22c55e' : '#ef4444',
                        backgroundColor: ghostPlacement.isValid
                          ? 'rgba(34, 197, 94, 0.28)'
                          : 'rgba(239, 68, 68, 0.28)',
                      },
                    ]}
                  />
                );
              })()}

              {/* Capa de Barcos Interactivos con PanResponder */}
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {myFleet.map((ship) => {
                  const isHoriz =
                    (ship.orientation ||
                      (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1
                        ? 'H'
                        : 'V')) === 'H';

                  const minR = Math.min(...ship.cells.map((c) => Math.floor(c / 10)));
                  const minC = Math.min(...ship.cells.map((c) => c % 10));

                  const visualW = isHoriz ? ship.size * cellSize : cellSize;
                  const visualH = isHoriz ? cellSize : ship.size * cellSize;
                  const visualLeft = minC * cellSize + coordsHeaderPx;
                  const visualTop = minR * cellSize;

                  const isSelected = ship.id === selectedSetupShipId;
                  const isBeingDragged = ship.id === draggedShipId;

                  const panResponder = getShipPanResponder(ship.id);

                  // Atenuar barcos no seleccionados cuando hay uno activo
                  const shipOpacity = isBeingDragged ? 0.92 : selectedSetupShipId ? (isSelected ? 1 : 0.65) : 1;

                  return (
                    <Animated.View
                      key={ship.id}
                      {...panResponder.panHandlers}
                      style={[
                        styles.touchableShipBox,
                        {
                          left: visualLeft,
                          top: visualTop,
                          width: visualW,
                          height: visualH,
                          zIndex: isBeingDragged ? 50 : isSelected ? 20 : 10,
                          opacity: shipOpacity,
                        },
                        isSelected && styles.shipSpriteSelectedGlow,
                        isBeingDragged && {
                          transform: [
                            { translateX: dragPan.x },
                            { translateY: dragPan.y },
                            { scale: 1.05 },
                          ],
                        },
                      ]}
                    >
                      <NavalShipSprite
                        shipId={ship.id}
                        size={ship.size}
                        orientation={isHoriz ? 'H' : 'V'}
                        cellSize={cellSize}
                        isSelected={isSelected}
                      />
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          </LinearGradient>

          {/* Panel de Flota: Tarjetas con ancho uniforme, nombre arriba, mini silueta y casillas abajo */}
          <View style={[styles.fleetRosterCard, { width: exactFrameWidth }]}>
            <Text style={styles.fleetRosterTitle}>
              Flota ({myFleet.length} buques):
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fleetCardsScrollContent}
            >
              {myFleet.map((s) => {
                const conf = SHIP_CONFIG[s.id] || { name: s.id, size: s.size, bg: '#0284c7' };
                const isSel = s.id === selectedSetupShipId;
                const fleetCardWidth = Math.max(92, Math.round((exactFrameWidth - 36) / 3.35));

                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => {
                      void triggerGameHaptic('selection');
                      if (amIReady) {
                        handleUnlockFleet();
                      }
                      if (isSel) {
                        handleSmartRotate(s.id);
                      } else {
                        setSelectedSetupShipId(s.id);
                      }
                    }}
                    style={[
                      styles.fleetUniformCard,
                      { width: fleetCardWidth },
                      isSel && styles.fleetMiniCardSelected,
                    ]}
                    activeOpacity={0.8}
                    accessibilityLabel={`Barco ${conf.name}, tamaño ${conf.size}`}
                  >
                    {/* Nombre arriba + ícono ✓ pequeño */}
                    <View style={styles.fleetCardHeaderRow}>
                      <Text
                        style={[styles.fleetCardNameText, isSel && { color: '#0284c7' }]}
                        numberOfLines={1}
                      >
                        {conf.name}
                      </Text>
                      <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                    </View>

                    {/* Mini silueta legible que ocupa el ancho completo de la tarjeta */}
                    <View style={styles.miniShipSpriteWrap}>
                      <NavalShipSprite
                        shipId={s.id}
                        size={s.size}
                        orientation="H"
                        cellSize={14}
                        isMini={true}
                        miniW={s.size * 14}
                        miniH={14}
                      />
                    </View>

                    {/* "X casillas" abajo */}
                    <Text style={styles.fleetCardSizeText}>{conf.size} casillas</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Dock Inferior: Confirmar Flota o Modificar Flota */}
          <View style={[styles.setupDockContainer, { width: exactFrameWidth }]}>
            {!amIReady ? (
              <GameButton
                label="Confirmar Flota"
                icon="shield-checkmark"
                variant="primary"
                disabled={!isFleetValid}
                onPress={handleConfirmReady}
              />
            ) : (
              <View style={{ width: '100%', gap: 8 }}>
                <View style={styles.waitingPartnerBadge}>
                  <Ionicons name="time-outline" size={16} color="#0284c7" />
                  <Text style={styles.waitingPartnerText}>
                    {isPartnerReady
                      ? '¡Ambos listos! Iniciando radar naval...'
                      : 'Esperando a que tu pareja confirme su flota...'}
                  </Text>
                </View>
                <GameButton
                  label="Modificar Flota"
                  icon="create-outline"
                  variant="secondary"
                  onPress={handleUnlockFleet}
                />
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ================= FASE 3: COMBATE NAVAL EN VIVO ================= */}
      {(bs.phase === 'battle' || bs.phase === 'finished') && (
        <View style={styles.battleWrap}>
          {/* HUD Superior de Almirantes + Feedback de Último Disparo */}
          <View style={[styles.battleHudCard, { width: exactFrameWidth }, GAMES_THEME.shadows.soft]}>
            <View style={[styles.hudPlayerChip, isMyTurn && styles.hudPlayerChipActive]}>
              <View style={styles.hudAvatarCircle}>
                {myAvatarUri ? (
                  <Image source={{ uri: myAvatarUri }} style={styles.hudAvatarImg} />
                ) : (
                  <Text style={styles.hudAvatarInitial}>{myDisplayName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.hudPlayerName} numberOfLines={1}>{myDisplayName}</Text>
                <Text style={styles.hudPlayerFleetText}>
                  {currentProfile === 'Karla' ? remainingShipsKarla : remainingShipsJavier}/5 barcos
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.lastShotBanner,
                bs.lastShot?.sunkShipName
                  ? styles.lastShotSunk
                  : bs.lastShot?.hit
                  ? styles.lastShotHit
                  : styles.lastShotWater,
              ]}
            >
              <Text
                style={[
                  styles.lastShotText,
                  bs.lastShot?.hit ? { color: '#991b1b' } : { color: '#0369a1' },
                ]}
                numberOfLines={2}
              >
                {bs.lastShot
                  ? `${formatShotCoord(bs.lastShot.cell)} · ${
                      bs.lastShot.sunkShipName
                        ? `💥 ${bs.lastShot.sunkShipName}`
                        : bs.lastShot.hit
                        ? '🔥 Impacto'
                        : '💧 Agua'
                    }`
                  : '⚓ Sin disparos aún'}
              </Text>
            </View>

            <View style={[styles.hudPlayerChip, !isMyTurn && bs.phase === 'battle' && styles.hudPlayerChipActive, { flexDirection: 'row-reverse' }]}>
              <View style={styles.hudAvatarCircle}>
                {partnerAvatarUri ? (
                  <Image source={{ uri: partnerAvatarUri }} style={styles.hudAvatarImg} />
                ) : (
                  <Text style={styles.hudAvatarInitial}>{partnerDisplayName.charAt(0).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                <Text style={styles.hudPlayerName} numberOfLines={1}>{partnerDisplayName}</Text>
                <Text style={styles.hudPlayerFleetText}>
                  {currentProfile === 'Karla' ? remainingShipsJavier : remainingShipsKarla}/5 barcos
                </Text>
              </View>
            </View>
          </View>

          {/* Tracker Visual de Flota Enemiga (5 siluetas con estado flotando/hundido) */}
          <View style={[styles.enemyFleetTrackerCard, { width: exactFrameWidth }]}>
            <Text style={styles.enemyFleetLabel}>Flota de {partnerDisplayName}:</Text>
            <View style={styles.enemyFleetShipsRow}>
              {enemyFleet.map((ship) => {
                const sunk = isShipSunk(ship, myShots);
                return (
                  <View
                    key={ship.id}
                    style={[
                      styles.enemyShipTrackerPill,
                      sunk && styles.enemyShipTrackerPillSunk,
                    ]}
                  >
                    <View style={{ opacity: sunk ? 0.35 : 1 }}>
                      <NavalShipSprite
                        shipId={ship.id}
                        size={ship.size}
                        orientation="H"
                        cellSize={9}
                        isMini
                        miniW={ship.size * 9}
                        miniH={11}
                      />
                    </View>
                    {sunk && <Text style={styles.sunkSkullText}>💀</Text>}
                  </View>
                );
              })}
            </View>
          </View>

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
                {bs.phase === 'finished' ? 'Tablero del Otro' : `Radar Ataque (${currentProfile === 'Karla' ? remainingShipsJavier : remainingShipsKarla}/5)`}
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
            colors={['#020617', '#06243b', '#0a3a5c']}
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
                  <View
                    style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}
                  >
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;
                    const isAlternate = (r + c) % 2 === 0;

                    if (radarMode === 'attack') {
                      const hasShot = myShots.includes(idx);
                      const hitShip = hasShot && enemyFleet.find((s) => s.cells.includes(idx));
                      const isSunk = Boolean(hitShip && isShipSunk(hitShip, myShots));
                      const isLastShotCell =
                        bs.lastShot?.shooter === currentProfile && bs.lastShot?.cell === idx;

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
                                ? 'rgba(185, 28, 28, 0.36)'
                                : hitShip
                                ? 'rgba(234, 88, 12, 0.34)'
                                : hasShot
                                ? 'rgba(14, 116, 144, 0.25)'
                                : isAlternate
                                ? 'rgba(15, 45, 72, 0.56)'
                                : 'rgba(6, 28, 49, 0.76)',
                            },
                            isLastShotCell && {
                              borderColor: hitShip ? '#fde047' : '#38bdf8',
                              borderWidth: 1.5,
                            },
                          ]}
                          activeOpacity={0.65}
                        >
                          {isSunk ? (
                            <View style={styles.sunkCellOverlay}>
                              <Ionicons
                                name="skull"
                                size={Math.max(10, cellSize * 0.48)}
                                color="#fecaca"
                              />
                            </View>
                          ) : hitShip ? (
                            <View style={styles.hitBlastRing}>
                              <Ionicons
                                name="flame"
                                size={Math.max(10, cellSize * 0.48)}
                                color="#fef08a"
                              />
                            </View>
                          ) : hasShot ? (
                            <View style={styles.waterSplashOuter}>
                              <View style={styles.waterSplashInner} />
                            </View>
                          ) : isMyTurn ? (
                            <View style={styles.crosshairDot} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    } else {
                      const hasShot = enemyShots.includes(idx);
                      const ship = myFleet.find((s) => s.cells.includes(idx));
                      const isHitOnMe = Boolean(ship && hasShot);
                      const isSunkOnMe = Boolean(ship && isHitOnMe && isShipSunk(ship, enemyShots));
                      const isMiss = !ship && hasShot;
                      const isLastShotCell =
                        bs.lastShot?.shooter !== currentProfile && bs.lastShot?.cell === idx;

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: isSunkOnMe
                                ? 'rgba(185, 28, 28, 0.40)'
                                : isHitOnMe
                                ? 'rgba(234, 88, 12, 0.36)'
                                : isMiss
                                ? 'rgba(14, 116, 144, 0.25)'
                                : isAlternate
                                ? 'rgba(15, 45, 72, 0.56)'
                                : 'rgba(6, 28, 49, 0.76)',
                            },
                            isLastShotCell && {
                              borderColor: isHitOnMe ? '#fde047' : '#38bdf8',
                              borderWidth: 1.5,
                            },
                          ]}
                        >
                          {isSunkOnMe ? (
                            <View style={styles.sunkCellOverlay}>
                              <Ionicons
                                name="skull"
                                size={Math.max(10, cellSize * 0.48)}
                                color="#fecaca"
                              />
                            </View>
                          ) : isHitOnMe ? (
                            <View style={styles.hitBlastRing}>
                              <Ionicons
                                name="flame"
                                size={Math.max(10, cellSize * 0.48)}
                                color="#fef08a"
                              />
                            </View>
                          ) : isMiss ? (
                            <View style={styles.waterSplashOuter}>
                              <View style={styles.waterSplashInner} />
                            </View>
                          ) : null}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}

              {/* Overlay táctico de sonar sobre el tablero de combate */}
              <OceanSonarOverlay gridWidth={gridWidth} coordsHeaderPx={coordsHeaderPx} />

              {/* En 'Mis Barcos' muestra toda tu flota; en ataque revela barcos enemigos hundidos en vivo (y todos al terminar) */}
              {(radarMode === 'fleet'
                ? myFleet
                : bs.phase === 'finished'
                ? enemyFleet
                : enemyFleet.filter((s) => isShipSunk(s, myShots))
              ).map(
                (ship) => {
                  const relevantShots = radarMode === 'fleet' ? enemyShots : myShots;
                  const isHoriz =
                    (ship.orientation ||
                      (ship.cells.length > 1 && ship.cells[1] - ship.cells[0] === 1
                        ? 'H'
                        : 'V')) === 'H';

                  const minR = Math.min(...ship.cells.map((c) => Math.floor(c / 10)));
                  const minC = Math.min(...ship.cells.map((c) => c % 10));

                  const visualW = isHoriz ? ship.size * cellSize : cellSize;
                  const visualH = isHoriz ? cellSize : ship.size * cellSize;
                  const visualLeft = minC * cellSize + coordsHeaderPx;
                  const visualTop = minR * cellSize;

                  const isSunk = isShipSunk(ship, relevantShots);

                  return (
                    <View
                      key={ship.id}
                      pointerEvents="none"
                      style={[
                        styles.shipSpriteWrapper,
                        {
                          left: visualLeft,
                          top: visualTop,
                          width: visualW,
                          height: visualH,
                          zIndex: 10,
                        },
                      ]}
                    >
                      <NavalShipSprite
                        shipId={ship.id}
                        size={ship.size}
                        orientation={isHoriz ? 'H' : 'V'}
                        cellSize={cellSize}
                        isSunk={isSunk}
                      />

                      {/* Marcadores de impacto en combate */}
                      {ship.cells.map((cellIdx) => {
                        const hasShot = relevantShots.includes(cellIdx);
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
                              <Ionicons
                                name="skull"
                                size={Math.max(10, cellSize * 0.5)}
                                color="#ffffff"
                              />
                            ) : (
                              <Ionicons
                                name="flame"
                                size={Math.max(11, cellSize * 0.52)}
                                color="#fef08a"
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  );
                })}
            </View>
          </LinearGradient>

          {/* Dock Inferior de Combate */}
          <View style={[styles.battleDockContainer, { width: exactFrameWidth }]}>
            <GameButton
              label={bs.phase === 'finished' ? 'Jugar de Nuevo' : 'Rendirse / Reiniciar'}
              icon={bs.phase === 'finished' ? 'refresh' : 'flag-outline'}
              variant={bs.phase === 'finished' ? 'primary' : 'destructive'}
              onPress={onReset}
            />
          </View>
        </View>
      )}
    </View>
  );
};

// ============================================================================
// ESTILOS
// ============================================================================
const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    flex: 1,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    overflow: 'hidden',
  },
  oceanCard: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  radarEmblem: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(8, 47, 73, 0.9)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  inviteAvatarImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  oceanCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  oceanCardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },

  // Setup
  setupWrap: {
    width: '100%',
    alignItems: 'center',
  },
  setupToolsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setupInfoTextGroup: {
    flex: 1,
    marginRight: 8,
  },
  setupHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  helpBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  helpBannerPillError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  helpBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  helpBannerTextError: {
    color: '#dc2626',
  },
  setupActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderColor: '#bae6fd',
  },
  actionChipRotate: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  actionChipText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0284c7',
  },

  // Tablero Océano
  boardOceanFrame: {
    borderRadius: 16,
    borderColor: 'rgba(56, 189, 248, 0.55)',
    overflow: 'hidden',
  },
  coordsLettersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    marginBottom: 2,
  },
  coordLetterText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#bae6fd',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bae6fd',
  },
  oceanCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.22)',
  },

  // Barcos interactivos
  touchableShipBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shipSpriteWrapper: {
    position: 'absolute',
  },
  shipSpriteSelectedGlow: {
    shadowColor: '#facc15',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 5,
  },
  ghostShipContainer: {
    position: 'absolute',
  },

  // Flota disponible (Cards)
  fleetRosterCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
  },
  fleetRosterTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  fleetCardsScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  fleetUniformCard: {
    width: 104,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 4,
  },
  fleetMiniCardSelected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#0284c7',
    borderWidth: 1.6,
  },
  fleetCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  fleetCardNameText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#1e293b',
    flex: 1,
    marginRight: 2,
  },
  miniShipSpriteWrap: {
    height: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  fleetCardSizeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748b',
    alignSelf: 'flex-start',
  },
  fleetMiniCardName: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  fleetMiniCardSize: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },

  // Docks
  setupDockContainer: {
    marginTop: 12,
  },
  waitingPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#bae6fd',
  },
  waitingPartnerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    textAlign: 'center',
  },

  // Combate
  battleWrap: {
    width: '100%',
    alignItems: 'center',
  },
  radarToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  radarModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  radarModeTabActive: {
    backgroundColor: '#0284c7',
  },
  radarModeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  battleDockContainer: {
    marginTop: 12,
  },
  hitMarkerOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sunkCellOverlay: {
    width: '100%' as const,
    height: '100%' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127, 29, 29, 0.55)',
  },
  waterSplashOuter: {
    width: '66%' as const,
    height: '66%' as const,
    borderRadius: 99,
    borderWidth: 1.4,
    borderColor: 'rgba(56, 189, 248, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 116, 144, 0.22)',
  },
  waterSplashInner: {
    width: '44%' as const,
    height: '44%' as const,
    borderRadius: 99,
    backgroundColor: 'rgba(125, 211, 252, 0.85)',
  },
  hitBlastRing: {
    width: '78%' as const,
    height: '78%' as const,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: 'rgba(253, 224, 71, 0.85)',
    backgroundColor: 'rgba(234, 88, 12, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(56, 189, 248, 0.42)',
  },
  battleHudCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  hudPlayerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    maxWidth: 112,
  },
  hudPlayerChipActive: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  hudAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hudAvatarImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  hudAvatarInitial: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0369a1',
  },
  hudPlayerName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  hudPlayerFleetText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
  },
  lastShotBanner: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastShotWater: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  lastShotHit: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  lastShotSunk: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  lastShotText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  enemyFleetTrackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#082f49',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.28)',
  },
  enemyFleetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#bae6fd',
  },
  enemyFleetShipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  enemyShipTrackerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 6,
  },
  enemyShipTrackerPillSunk: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.6)',
  },
  sunkSkullText: {
    fontSize: 9,
  },
});

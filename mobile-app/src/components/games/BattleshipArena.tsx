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
    bg: '#ef4444',
    darkBg: '#b91c1c',
    lightBg: '#fca5a5',
    icon: 'airplane',
    desc: 'Cubierta con pista y cazas',
  },
  battleship: {
    name: 'Acorazado',
    size: 4,
    bg: '#f97316',
    darkBg: '#c2410c',
    lightBg: '#fed7aa',
    icon: 'shield',
    desc: 'Torretas de artillería pesada',
  },
  cruiser: {
    name: 'Crucero',
    size: 3,
    bg: '#8b5cf6',
    darkBg: '#6d28d9',
    lightBg: '#c4b5fd',
    icon: 'boat',
    desc: 'Cañones dobles y chimenea',
  },
  submarine: {
    name: 'Submarino',
    size: 3,
    bg: '#10b981',
    darkBg: '#047857',
    lightBg: '#6ee7b7',
    icon: 'locate',
    desc: 'Casco hidrodinámico y periscopio',
  },
  destroyer: {
    name: 'Destructor',
    size: 2,
    bg: '#ec4899',
    darkBg: '#be185d',
    lightBg: '#f472b6',
    icon: 'flame',
    desc: 'Proa afilada y antena radar',
  },
};

// ============================================================================
// COMPONENTE VISUAL: SILUETA NAVAL REALISTA DESDE ARRIBA (react-native-svg)
// ============================================================================
interface NavalShipSpriteProps {
  shipId: string;
  size: number;
  orientation: 'H' | 'V';
  cellSize: number;
  isSelected?: boolean;
  isGhost?: boolean;
  isValidGhost?: boolean;
  isMini?: boolean;
  miniW?: number;
  miniH?: number;
}

const NavalShipSprite: React.FC<NavalShipSpriteProps> = ({
  shipId,
  size,
  orientation,
  cellSize,
  isSelected = false,
  isGhost = false,
  isValidGhost = true,
  isMini = false,
  miniW,
  miniH,
}) => {
  const meta = SHIP_CONFIG[shipId] || {
    bg: '#0284c7',
    darkBg: '#0369a1',
    lightBg: '#7dd3fc',
  };

  const W = isMini ? (miniW || size * 14) : size * cellSize;
  const H = isMini ? (miniH || 14) : cellSize;
  const isHoriz = orientation === 'H';

  const svgWidth = isMini ? W : isHoriz ? W : H;
  const svgHeight = isMini ? H : isHoriz ? H : W;

  // Colores dinámicos
  const gradId = `navalGrad_${shipId}_${isGhost ? (isValidGhost ? 'valid' : 'invalid') : 'normal'}_${isMini ? 'mini' : 'board'}`;

  const fillStart = isGhost
    ? isValidGhost
      ? 'rgba(34, 197, 94, 0.45)'
      : 'rgba(239, 68, 68, 0.45)'
    : meta.lightBg;

  const fillMid = isGhost
    ? isValidGhost
      ? 'rgba(22, 163, 74, 0.55)'
      : 'rgba(220, 38, 38, 0.55)'
    : meta.bg;

  const fillEnd = isGhost
    ? isValidGhost
      ? 'rgba(21, 128, 61, 0.65)'
      : 'rgba(185, 28, 28, 0.65)'
    : meta.darkBg;

  const strokeColor = isGhost
    ? isValidGhost
      ? '#22c55e'
      : '#ef4444'
    : isSelected
    ? '#facc15'
    : 'rgba(255, 255, 255, 0.75)';

  const strokeWidth = isGhost ? 2 : isSelected ? 2.6 : isMini ? 0.8 : 1.2;

  // Trayectoria continua de casco horizontal
  const isSub = shipId === 'submarine';
  const proaCurve = isSub ? 12 : 15;
  const popaRound = isSub ? 12 : 5;

  const hullPath = isSub
    ? `M ${proaCurve} 3.5 L ${W - popaRound} 3.5 Q ${W - 2} 3.5 ${W - 2} ${H / 2} Q ${W - 2} ${H - 3.5} ${W - popaRound} ${H - 3.5} L ${proaCurve} ${H - 3.5} Q 2 ${H - 3.5} 2 ${H / 2} Q 2 3.5 ${proaCurve} 3.5 Z`
    : `M 3.5 ${H / 2} Q 8 3.5 ${proaCurve} 3.5 L ${W - popaRound} 3.5 Q ${W - 2} 3.5 ${W - 2} 6 L ${W - 2} ${H - 6} Q ${W - 2} ${H - 3.5} ${W - popaRound} ${H - 3.5} L ${proaCurve} ${H - 3.5} Q 8 ${H - 3.5} 3.5 ${H / 2} Z`;

  // Cubierta interior sutil
  const innerDeckPath = isSub
    ? `M ${proaCurve + 2} 5.5 L ${W - popaRound - 2} 5.5 Q ${W - 4} 5.5 ${W - 4} ${H / 2} Q ${W - 4} ${H - 5.5} ${W - popaRound - 2} ${H - 5.5} L ${proaCurve + 2} ${H - 5.5} Q 4 ${H - 5.5} 4 ${H / 2} Q 4 5.5 ${proaCurve + 2} 5.5 Z`
    : `M 6.5 ${H / 2} Q 10 5.5 ${proaCurve + 1} 5.5 L ${W - popaRound - 1} 5.5 L ${W - popaRound - 1} ${H - 5.5} L ${proaCurve + 1} ${H - 5.5} Q 10 ${H - 5.5} 6.5 ${H / 2} Z`;

  // Contenido detallado horizontal
  const renderHorizontalShipInterior = () => (
    <G>
      {/* Sombra suave de casco sobre el agua */}
      {!isMini && !isGhost && (
        <Path
          d={hullPath}
          transform="translate(1.5, 2)"
          fill="rgba(0, 8, 20, 0.35)"
        />
      )}

      {/* Espuma suave en popa contenida estrictamente dentro de la silueta (sin salirse a la columna J) */}
      {!isMini && !isGhost && (
        <Path
          d={`M ${W - 4} ${H * 0.35} Q ${W - 1.5} ${H * 0.5} ${W - 4} ${H * 0.65}`}
          stroke="rgba(255, 255, 255, 0.45)"
          strokeWidth={1.2}
          fill="none"
        />
      )}

      {/* Casco principal con degradado temático */}
      <Path
        d={hullPath}
        fill={`url(#${gradId})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Cubierta interior más clara */}
      {!isGhost && (
        <Path
          d={innerDeckPath}
          fill="rgba(255, 255, 255, 0.16)"
          stroke="rgba(0, 0, 0, 0.12)"
          strokeWidth={0.6}
        />
      )}

      {/* Detalles específicos por tipo de buque */}
      {!isGhost && shipId === 'carrier' && (
        <G>
          {/* Pista de despegue con línea discontinua */}
          <Line
            x1={18}
            y1={H / 2}
            x2={W - 8}
            y2={H / 2}
            stroke="#ffffff"
            strokeWidth={isMini ? 0.9 : 1.5}
            strokeDasharray={isMini ? '3,2' : '6,4'}
          />
          {/* Torre de mando isla en la borda superior */}
          <Rect
            x={W * 0.44}
            y={isMini ? 2 : 4}
            width={isMini ? W * 0.14 : W * 0.16}
            height={isMini ? 3 : 5}
            rx={1}
            fill="#881337"
            stroke="#ffffff"
            strokeWidth={0.6}
          />
          {/* 2 Aviones navales en cubierta */}
          {!isMini && (
            <G>
              {/* Avión 1 (Proa derecha) */}
              <Path
                d={`M ${W * 0.28 - 4} ${H / 2 + 5} L ${W * 0.28 + 4} ${H / 2 + 5} M ${W * 0.28} ${H / 2 + 1.5} L ${W * 0.28} ${H / 2 + 8.5} M ${W * 0.28 + 3} ${H / 2 + 3} L ${W * 0.28 + 3} ${H / 2 + 7}`}
                stroke="#ffffff"
                strokeWidth={1.2}
                fill="none"
              />
              {/* Avión 2 (Popa izquierda) */}
              <Path
                d={`M ${W * 0.72 - 4} ${H / 2 - 5} L ${W * 0.72 + 4} ${H / 2 - 5} M ${W * 0.72} ${H / 2 - 8.5} L ${W * 0.72} ${H / 2 - 1.5} M ${W * 0.72 + 3} ${H / 2 - 7} L ${W * 0.72 + 3} ${H / 2 - 3}`}
                stroke="#ffffff"
                strokeWidth={1.2}
                fill="none"
              />
            </G>
          )}
        </G>
      )}

      {!isGhost && shipId === 'battleship' && (
        <G>
          {/* 3 Torretas con cañones largos (2 adelante, 1 atrás) */}
          {/* Torre 1 proa */}
          <Circle
            cx={W * 0.22}
            cy={H / 2}
            r={isMini ? 2.5 : 4.4}
            fill="#78350f"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.22 - (isMini ? 2 : 3)}
            y1={H / 2 - (isMini ? 0.8 : 1.5)}
            x2={W * 0.22 - (isMini ? 6 : 10)}
            y2={H / 2 - (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />
          <Line
            x1={W * 0.22 - (isMini ? 2 : 3)}
            y1={H / 2 + (isMini ? 0.8 : 1.5)}
            x2={W * 0.22 - (isMini ? 6 : 10)}
            y2={H / 2 + (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />

          {/* Torre 2 intermedia */}
          <Circle
            cx={W * 0.39}
            cy={H / 2}
            r={isMini ? 2.5 : 4.4}
            fill="#78350f"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.39 - (isMini ? 2 : 3)}
            y1={H / 2 - (isMini ? 0.8 : 1.5)}
            x2={W * 0.39 - (isMini ? 6 : 10)}
            y2={H / 2 - (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />
          <Line
            x1={W * 0.39 - (isMini ? 2 : 3)}
            y1={H / 2 + (isMini ? 0.8 : 1.5)}
            x2={W * 0.39 - (isMini ? 6 : 10)}
            y2={H / 2 + (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />

          {/* Puente central acorazado */}
          <Rect
            x={W * 0.53}
            y={H / 2 - (isMini ? 2.5 : 4.5)}
            width={isMini ? W * 0.12 : W * 0.15}
            height={isMini ? 5 : 9}
            rx={1.5}
            fill="#92400e"
            stroke="#ffffff"
            strokeWidth={0.7}
          />

          {/* Torre 3 popa */}
          <Circle
            cx={W * 0.79}
            cy={H / 2}
            r={isMini ? 2.5 : 4.4}
            fill="#78350f"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.79 + (isMini ? 2 : 3)}
            y1={H / 2 - (isMini ? 0.8 : 1.5)}
            x2={W * 0.79 + (isMini ? 6 : 10)}
            y2={H / 2 - (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />
          <Line
            x1={W * 0.79 + (isMini ? 2 : 3)}
            y1={H / 2 + (isMini ? 0.8 : 1.5)}
            x2={W * 0.79 + (isMini ? 6 : 10)}
            y2={H / 2 + (isMini ? 0.8 : 1.5)}
            stroke="#451a03"
            strokeWidth={isMini ? 0.9 : 1.6}
          />
        </G>
      )}

      {!isGhost && shipId === 'cruiser' && (
        <G>
          {/* Torre 1 proa */}
          <Circle
            cx={W * 0.25}
            cy={H / 2}
            r={isMini ? 2.2 : 3.8}
            fill="#581c87"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.25 - (isMini ? 2 : 3)}
            y1={H / 2}
            x2={W * 0.25 - (isMini ? 5 : 9)}
            y2={H / 2}
            stroke="#3b0764"
            strokeWidth={isMini ? 0.9 : 1.5}
          />

          {/* Puente y chimeneas centrales */}
          <Rect
            x={W * 0.43}
            y={H / 2 - (isMini ? 2.2 : 4)}
            width={isMini ? W * 0.16 : W * 0.2}
            height={isMini ? 4.4 : 8}
            rx={1.5}
            fill="#6b21a8"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Circle
            cx={W * 0.49}
            cy={H / 2}
            r={isMini ? 1.2 : 2}
            fill="#3b0764"
            stroke="#ffffff"
            strokeWidth={0.5}
          />
          <Circle
            cx={W * 0.58}
            cy={H / 2}
            r={isMini ? 1.2 : 2}
            fill="#3b0764"
            stroke="#ffffff"
            strokeWidth={0.5}
          />

          {/* Torre 2 popa */}
          <Circle
            cx={W * 0.77}
            cy={H / 2}
            r={isMini ? 2.2 : 3.8}
            fill="#581c87"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.77 + (isMini ? 2 : 3)}
            y1={H / 2}
            x2={W * 0.77 + (isMini ? 5 : 9)}
            y2={H / 2}
            stroke="#3b0764"
            strokeWidth={isMini ? 0.9 : 1.5}
          />
        </G>
      )}

      {!isGhost && shipId === 'submarine' && (
        <G>
          {/* Vela de mando y periscopio (sin cañones) */}
          <Rect
            x={W * 0.4}
            y={H / 2 - (isMini ? 2.5 : 4.4)}
            width={isMini ? W * 0.16 : W * 0.2}
            height={isMini ? 5 : 8.8}
            rx={isMini ? 2 : 3.5}
            fill="#064e3b"
            stroke="#ffffff"
            strokeWidth={0.8}
          />
          <Circle
            cx={W * 0.48}
            cy={H / 2}
            r={isMini ? 1.2 : 2}
            fill="#34d399"
            stroke="#ffffff"
            strokeWidth={0.6}
          />
          {/* Ranuras acústicas / lastre */}
          {!isMini && (
            <G opacity={0.4}>
              <Line x1={W * 0.22} y1={6} x2={W * 0.34} y2={6} stroke="#ffffff" strokeWidth={1} />
              <Line
                x1={W * 0.22}
                y1={H - 6}
                x2={W * 0.34}
                y2={H - 6}
                stroke="#ffffff"
                strokeWidth={1}
              />
              <Line x1={W * 0.66} y1={6} x2={W * 0.78} y2={6} stroke="#ffffff" strokeWidth={1} />
              <Line
                x1={W * 0.66}
                y1={H - 6}
                x2={W * 0.78}
                y2={H - 6}
                stroke="#ffffff"
                strokeWidth={1}
              />
            </G>
          )}
        </G>
      )}

      {!isGhost && shipId === 'destroyer' && (
        <G>
          {/* Proa afilada, 1 cañón y antena radar */}
          <Circle
            cx={W * 0.33}
            cy={H / 2}
            r={isMini ? 2 : 3.6}
            fill="#831843"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.33 - (isMini ? 2 : 3)}
            y1={H / 2}
            x2={W * 0.33 - (isMini ? 5 : 9)}
            y2={H / 2}
            stroke="#500724"
            strokeWidth={isMini ? 0.9 : 1.5}
          />
          {/* Puente y antena */}
          <Rect
            x={W * 0.58}
            y={H / 2 - (isMini ? 2.2 : 3.8)}
            width={isMini ? W * 0.18 : W * 0.22}
            height={isMini ? 4.4 : 7.6}
            rx={1.5}
            fill="#9d174d"
            stroke="#ffffff"
            strokeWidth={0.7}
          />
          <Line
            x1={W * 0.69}
            y1={H / 2 - (isMini ? 1.5 : 2.5)}
            x2={W * 0.69}
            y2={H / 2 + (isMini ? 1.5 : 2.5)}
            stroke="#ffffff"
            strokeWidth={isMini ? 0.8 : 1.2}
          />
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
};

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
  onDragStateChange,
}) => {
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
  const shipGlowPulseAnim = useRef(new Animated.Value(0)).current;
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

  // Pulso de glow en barco seleccionado
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shipGlowPulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(shipGlowPulseAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shipGlowPulseAnim]);

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

      if (amIReady) {
        handleConfirmReady();
      }

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
      void triggerGameHaptic('selection');
    },
    [myFleet]
  );

  // ============================================================================
  // MOVER TOCANDO CASILLA VACÍA
  // ============================================================================
  const handleMoveShipToCell = useCallback(
    (shipId: string, targetCellIdx: number) => {
      const ship = myFleet.find((s) => s.id === shipId);
      if (!ship) return;

      if (amIReady) {
        handleConfirmReady();
      }

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
      void triggerGameHaptic('selection');
    },
    [myFleet]
  );

  // ============================================================================
  // REVOLVER ALEATORIAMENTE (Sin desbordes ni choques)
  // ============================================================================
  const handleRandomizeFleet = () => {
    if (amIReady) {
      handleConfirmReady();
    }
    const randomized = createRandomBattleshipFleet();
    setLocalSetupFleet(randomized);
    void triggerGameHaptic('medium');
    showBanner('Flota redistribuida al azar');
  };

  const handleConfirmReady = () => {
    if (myFleet && isFleetValid) {
      void triggerGameHaptic('success');
      onReadyFleet(myFleet);
      setRadarMode('attack');
    }
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
    handleConfirmReady,
    onDragStateChange,
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
      handleConfirmReady,
      onDragStateChange,
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

          onPanResponderGrant: () => {
            const {
              myFleet: currentFleet,
              amIReady: ready,
              handleConfirmReady: unlockFleet,
              onDragStateChange: notifyDrag,
            } = stateRef.current;

            if (ready) {
              unlockFleet();
            }

            const currentShip = currentFleet.find((s) => s.id === shipId);
            if (!currentShip) return;

            setDraggedShipId(shipId);
            setSelectedSetupShipId(shipId);
            lastGhostKeyRef.current = '';
            dragPan.setValue({ x: 0, y: 0 });
            notifyDrag?.(true);
            void triggerGameHaptic('selection');
          },

          onPanResponderMove: (_, gesture) => {
            dragPan.setValue({ x: gesture.dx, y: gesture.dy });

            const { myFleet: currentFleet, cellSize: cSize } = stateRef.current;
            const currentShip = currentFleet.find((s) => s.id === shipId);
            if (!currentShip) return;

            const isHoriz =
              (currentShip.orientation ||
                (currentShip.cells.length > 1 &&
                currentShip.cells[1] - currentShip.cells[0] === 1
                  ? 'H'
                  : 'V')) === 'H';

            const minR = Math.min(...currentShip.cells.map((c) => Math.floor(c / 10)));
            const minC = Math.min(...currentShip.cells.map((c) => c % 10));

            const dR = Math.round(gesture.dy / cSize);
            const dC = Math.round(gesture.dx / cSize);

            const targetR = minR + dR;
            const targetC = minC + dC;

            const maxR = isHoriz ? 9 : 10 - currentShip.size;
            const maxC = isHoriz ? 10 - currentShip.size : 9;

            const inBounds = targetR >= 0 && targetR <= maxR && targetC >= 0 && targetC <= maxC;

            const targetCells: number[] = [];
            for (let i = 0; i < currentShip.size; i++) {
              const nr = isHoriz ? targetR : targetR + i;
              const nc = isHoriz ? targetC + i : targetC;
              targetCells.push(nr * 10 + nc);
            }

            const otherShips = currentFleet.filter((s) => s.id !== currentShip.id);
            const hasCollision = otherShips.some((s) =>
              s.cells.some((c) => targetCells.includes(c))
            );

            const isValidPlacement = inBounds && !hasCollision;
            const stateKey = `${currentShip.id}_${targetR}_${targetC}_${isValidPlacement}`;

            if (stateKey !== lastGhostKeyRef.current) {
              lastGhostKeyRef.current = stateKey;
              setGhostPlacement({
                shipId: currentShip.id,
                orientation: isHoriz ? 'H' : 'V',
                cells: targetCells,
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
              onDragStateChange: notifyDrag,
              showBanner: banner,
              triggerShake: shake,
            } = stateRef.current;

            notifyDrag?.(false);

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

            // Arrastre terminado:
            const isHoriz =
              (currentShip.orientation ||
                (currentShip.cells.length > 1 &&
                currentShip.cells[1] - currentShip.cells[0] === 1
                  ? 'H'
                  : 'V')) === 'H';

            const minR = Math.min(...currentShip.cells.map((c) => Math.floor(c / 10)));
            const minC = Math.min(...currentShip.cells.map((c) => c % 10));

            const dR = Math.round(gesture.dy / cSize);
            const dC = Math.round(gesture.dx / cSize);

            const targetR = minR + dR;
            const targetC = minC + dC;

            const maxR = isHoriz ? 9 : 10 - currentShip.size;
            const maxC = isHoriz ? 10 - currentShip.size : 9;

            const inBounds = targetR >= 0 && targetR <= maxR && targetC >= 0 && targetC <= maxC;

            const targetCells: number[] = [];
            for (let i = 0; i < currentShip.size; i++) {
              const nr = isHoriz ? targetR : targetR + i;
              const nc = isHoriz ? targetC + i : targetC;
              targetCells.push(nr * 10 + nc);
            }

            const otherShips = currentFleet.filter((s) => s.id !== currentShip.id);
            const hasCollision = otherShips.some((s) =>
              s.cells.some((c) => targetCells.includes(c))
            );

            const isValidPlacement = inBounds && !hasCollision;

            if (isValidPlacement) {
              const updated = currentFleet.map((s) =>
                s.id === currentShip.id ? { ...s, cells: targetCells } : s
              );
              setLocalSetupFleet(updated);
              dragPan.setValue({ x: 0, y: 0 });
              setGhostPlacement(null);
              setDraggedShipId(null);
              void triggerGameHaptic('selection');
            } else {
              void triggerGameHaptic('error');
              shake();
              banner('No cabe aquí', true);
              Animated.spring(dragPan, {
                toValue: { x: 0, y: 0 },
                friction: 6,
                tension: 50,
                useNativeDriver: false,
              }).start(() => {
                setDraggedShipId(null);
                setGhostPlacement(null);
              });
            }
          },

          onPanResponderTerminate: () => {
            const { onDragStateChange: notifyDrag } = stateRef.current;
            notifyDrag?.(false);
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
                  <View
                    style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}
                  >
                    <Text style={styles.coordNumberText}>{ROWS_NUMBERS[r]}</Text>
                  </View>

                  {Array.from({ length: 10 }).map((_, c) => {
                    const idx = r * 10 + c;

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
                            backgroundColor: 'rgba(8, 47, 73, 0.88)',
                          },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}

              {/* Textura de ondas continua y sutil en TODO el tablero */}
              <Svg
                style={[StyleSheet.absoluteFill, { left: coordsHeaderPx }]}
                pointerEvents="none"
                width={gridWidth}
                height={gridWidth}
              >
                <Path
                  d={`M 0 ${gridWidth * 0.25} Q ${gridWidth * 0.25} ${gridWidth * 0.22} ${gridWidth * 0.5} ${gridWidth * 0.25} T ${gridWidth} ${gridWidth * 0.25}`}
                  stroke="rgba(56, 189, 248, 0.12)"
                  strokeWidth={1.2}
                  fill="none"
                />
                <Path
                  d={`M 0 ${gridWidth * 0.55} Q ${gridWidth * 0.3} ${gridWidth * 0.58} ${gridWidth * 0.6} ${gridWidth * 0.54} T ${gridWidth} ${gridWidth * 0.55}`}
                  stroke="rgba(56, 189, 248, 0.10)"
                  strokeWidth={1.2}
                  fill="none"
                />
                <Path
                  d={`M 0 ${gridWidth * 0.85} Q ${gridWidth * 0.2} ${gridWidth * 0.82} ${gridWidth * 0.5} ${gridWidth * 0.86} T ${gridWidth} ${gridWidth * 0.85}`}
                  stroke="rgba(56, 189, 248, 0.11)"
                  strokeWidth={1.2}
                  fill="none"
                />
              </Svg>

              {/* Sombra Fantasma (Ghost Preview) mientras se arrastra */}
              {ghostPlacement && ghostPlacement.cells.length > 0 && (() => {
                const ghostMinR = Math.min(...ghostPlacement.cells.map((c) => Math.floor(c / 10)));
                const ghostMinC = Math.min(...ghostPlacement.cells.map((c) => c % 10));
                const gLeft = ghostMinC * cellSize + coordsHeaderPx;
                const gTop = ghostMinR * cellSize;

                return (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.ghostShipContainer,
                      {
                        left: gLeft,
                        top: gTop,
                        zIndex: 40,
                      },
                    ]}
                  >
                    <NavalShipSprite
                      shipId={ghostPlacement.shipId}
                      size={ghostPlacement.cells.length}
                      orientation={ghostPlacement.orientation}
                      cellSize={cellSize}
                      isGhost={true}
                      isValidGhost={ghostPlacement.isValid}
                    />
                  </View>
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
                        isSelected &&
                          !isBeingDragged && {
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
                        handleConfirmReady();
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
                  onPress={handleConfirmReady}
                />
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ================= FASE 3: COMBATE NAVAL EN VIVO ================= */}
      {(bs.phase === 'battle' || bs.phase === 'finished') && (
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
                  <View
                    style={[styles.coordNumberCell, { height: cellSize, width: coordsHeaderPx }]}
                  >
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
                              <Ionicons
                                name="skull"
                                size={Math.max(10, cellSize * 0.5)}
                                color="#fca5a5"
                              />
                            </View>
                          ) : hitShip ? (
                            <Ionicons
                              name="flame"
                              size={Math.max(11, cellSize * 0.52)}
                              color="#fde047"
                            />
                          ) : hasShot ? (
                            <Ionicons
                              name="water"
                              size={Math.max(10, cellSize * 0.45)}
                              color="#38bdf8"
                            />
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

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.oceanCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              backgroundColor: isSunkOnMe
                                ? 'rgba(239, 68, 68, 0.55)'
                                : isHitOnMe
                                ? 'rgba(249, 115, 22, 0.55)'
                                : isMiss
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'rgba(8, 47, 73, 0.92)',
                            },
                          ]}
                        >
                          {isSunkOnMe ? (
                            <Ionicons
                              name="skull"
                              size={Math.max(10, cellSize * 0.5)}
                              color="#fca5a5"
                            />
                          ) : isHitOnMe ? (
                            <Ionicons
                              name="flame"
                              size={Math.max(11, cellSize * 0.52)}
                              color="#fde047"
                            />
                          ) : isMiss ? (
                            <Ionicons
                              name="water"
                              size={Math.max(10, cellSize * 0.45)}
                              color="#38bdf8"
                            />
                          ) : null}
                        </View>
                      );
                    }
                  })}
                </View>
              ))}

              {/* Renderizar barcos: en 'Mis Barcos' siempre, y en 'Tablero del Otro' al terminar para ver dónde estaban sus barcos */}
              {(radarMode === 'fleet' ? myFleet : bs.phase === 'finished' ? enemyFleet : []).map(
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
    borderColor: 'rgba(56, 189, 248, 0.4)',
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
    color: '#7dd3fc',
    textAlign: 'center',
  },
  coordNumberCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7dd3fc',
  },
  oceanCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(56, 189, 248, 0.16)',
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
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(153, 27, 27, 0.4)',
  },
  crosshairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.4)',
  },
});

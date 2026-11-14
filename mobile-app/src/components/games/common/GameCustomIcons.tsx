import React from 'react';
import Svg, {
  Rect,
  Circle,
  Line,
  Ellipse,
  Path,
  Polygon,
  Text as SvgText,
  G,
} from 'react-native-svg';

export type GameIconId =
  | 'tictactoe'
  | 'sudoku'
  | 'chess'
  | 'battleship'
  | 'hangman'
  | 'drawguess'
  | 'domino'
  | 'uno'
  | string;

interface CustomIconProps {
  size?: number;
  color?: string;
}

/**
 * Ícono ilustrado multicapa de 3 en Raya: tablero violeta neón con X coral, O cielo y línea dorada
 */
export const TicTacToeCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Base del tablero */}
      <Rect x="2.5" y="2.5" width="31" height="31" rx="8" fill="#4c1d95" stroke="#c4b5fd" strokeWidth="1.8" />
      <Rect x="5" y="5" width="26" height="26" rx="5.5" fill="#2e1065" />

      {/* Rejilla 3x3 luminosa */}
      <Line x1="13.8" y1="6.5" x2="13.8" y2="29.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
      <Line x1="22.2" y1="6.5" x2="22.2" y2="29.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
      <Line x1="6.5" y1="13.8" x2="29.5" y2="13.8" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />
      <Line x1="6.5" y1="22.2" x2="29.5" y2="22.2" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity={0.85} />

      {/* X arriba izquierda */}
      <Line x1="7.8" y1="7.8" x2="11.8" y2="11.8" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />
      <Line x1="11.8" y1="7.8" x2="7.8" y2="11.8" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />

      {/* X centro */}
      <Line x1="16" y1="16" x2="20" y2="20" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />
      <Line x1="20" y1="16" x2="16" y2="20" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />

      {/* X abajo derecha */}
      <Line x1="24.2" y1="24.2" x2="28.2" y2="28.2" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />
      <Line x1="28.2" y1="24.2" x2="24.2" y2="28.2" stroke="#fb7185" strokeWidth="2.3" strokeLinecap="round" />

      {/* O arriba derecha */}
      <Circle cx="26.2" cy="9.8" r="2.5" stroke="#38bdf8" strokeWidth="2.2" fill="none" />
      {/* O abajo izquierda */}
      <Circle cx="9.8" cy="26.2" r="2.5" stroke="#38bdf8" strokeWidth="2.2" fill="none" />

      {/* Línea ganadora dorada */}
      <Line x1="7" y1="7" x2="29" y2="29" stroke="#facc15" strokeWidth="1.6" strokeLinecap="round" opacity={0.85} />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Sudoku: cuadrícula 3x3 cielo con casillas de colores y números vectoriales
 */
export const SudokuCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Marco azul brillante */}
      <Rect x="3" y="3" width="30" height="30" rx="7.5" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.7" />
      {/* Fondo claro interior */}
      <Rect x="5.5" y="5.5" width="25" height="25" rx="5" fill="#f0f9ff" />

      {/* Casillas destacadas de color */}
      <Rect x="6" y="6" width="8" height="8" rx="1.5" fill="#dbeafe" />
      <Rect x="14" y="14" width="8" height="8" fill="#fef08a" />
      <Rect x="22" y="22" width="8" height="8" rx="1.5" fill="#fbcfe8" />

      {/* Líneas divisorias 3x3 */}
      <Line x1="14" y1="5.8" x2="14" y2="30.2" stroke="#0369a1" strokeWidth="1.5" />
      <Line x1="22" y1="5.8" x2="22" y2="30.2" stroke="#0369a1" strokeWidth="1.5" />
      <Line x1="5.8" y1="14" x2="30.2" y2="14" stroke="#0369a1" strokeWidth="1.5" />
      <Line x1="5.8" y1="22" x2="30.2" y2="22" stroke="#0369a1" strokeWidth="1.5" />

      {/* Número 7 vectorial arriba izquierda */}
      <Path d="M8 8.3H11.8L9.6 12.1" stroke="#1e293b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      {/* Número 3 dorado/coral centro */}
      <Path
        d="M16.2 16.1C16.2 15.6 19.6 15.4 19.6 16.9C19.6 17.7 18.7 18.1 17.7 18.1C18.9 18.1 19.8 18.6 19.8 19.5C19.8 20.8 16.3 20.9 16.1 20.1"
        stroke="#b45309"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Número 5 rosa abajo derecha */}
      <Path
        d="M27.8 24.1H24.7V26C25.3 25.8 28 25.8 28 27.2C28 28.5 25 28.6 24.5 28"
        stroke="#be185d"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lápiz mini en la esquina inferior izquierda */}
      <Circle cx="10" cy="26" r="1.5" fill="#0ea5e9" />
      <Circle cx="26" cy="10" r="1.5" fill="#9333ea" />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Ajedrez: base de madera y Reina dorada con joyas
 */
export const ChessCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Mini base de tablero de madera */}
      <Rect x="4" y="25" width="28" height="8" rx="3" fill="#78350f" stroke="#fde68a" strokeWidth="1.3" />
      <Rect x="6" y="26.5" width="6" height="5" rx="1" fill="#fef3c7" />
      <Rect x="18" y="26.5" width="6" height="5" rx="1" fill="#fef3c7" />
      <Rect x="12" y="26.5" width="6" height="5" rx="1" fill="#92400e" />
      <Rect x="24" y="26.5" width="6" height="5" rx="1" fill="#92400e" />

      {/* Joyas de la corona */}
      <Circle cx="7.5" cy="10" r="2.2" fill="#f43f5e" stroke="#78350f" strokeWidth="1.2" />
      <Circle cx="18" cy="5.8" r="2.6" fill="#38bdf8" stroke="#78350f" strokeWidth="1.2" />
      <Circle cx="28.5" cy="10" r="2.2" fill="#10b981" stroke="#78350f" strokeWidth="1.2" />

      {/* Cuerpo dorado de la Reina */}
      <Path
        d="M8.8 12.2L13.5 17.5L18 8.8L22.5 17.5L27.2 12.2L24.5 23.2H11.5L8.8 12.2Z"
        fill="#fbbf24"
        stroke="#78350f"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* Brillo interior */}
      <Path d="M13 21.2L15.2 15.8" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />

      {/* Collar y pedestal */}
      <Rect x="10.2" y="23" width="15.6" height="3" rx="1.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.3" />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Battleship: radar oceánico, barco y mira de impacto
 */
export const BattleshipCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Disco del sonar oceánico */}
      <Circle cx="18" cy="18" r="14.5" fill="#0c4a6e" stroke="#67e8f9" strokeWidth="1.8" />
      <Circle cx="18" cy="18" r="9.5" stroke="#22d3ee" strokeWidth="1.2" opacity={0.65} />
      <Circle cx="18" cy="18" r="4.8" stroke="#22d3ee" strokeWidth="1" opacity={0.45} />

      {/* Ejes del sonar */}
      <Line x1="18" y1="4.5" x2="18" y2="31.5" stroke="#38bdf8" strokeWidth="1.1" opacity={0.5} />
      <Line x1="4.5" y1="18" x2="31.5" y2="18" stroke="#38bdf8" strokeWidth="1.1" opacity={0.5} />

      {/* Silueta de buque sobre el agua */}
      <Polygon
        points="8,21 28,21 25.5,25.5 10.5,25.5"
        fill="#e2e8f0"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Rect x="13" y="16.8" width="9" height="4.2" rx="1.2" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.1" />
      <Rect x="15.8" y="13.8" width="3.4" height="3" rx="0.8" fill="#94a3b8" stroke="#0f172a" strokeWidth="1" />

      {/* Mira y destello de impacto */}
      <Circle cx="24.5" cy="11.5" r="3.4" fill="#f43f5e" stroke="#fef08a" strokeWidth="1.4" />
      <Circle cx="24.5" cy="11.5" r="1.2" fill="#ffffff" />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Ahorcado: escena nocturna, luna dorada, madera y globo corazón
 */
export const HangmanCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Cielo nocturno igual que la arena */}
      <Rect x="2.8" y="2.8" width="30.4" height="30.4" rx="8" fill="#1e1b4b" stroke="#fda4af" strokeWidth="1.7" />
      <Circle cx="27.2" cy="8.8" r="2.8" fill="#fef08a" />
      <Circle cx="14.5" cy="7.5" r="1" fill="#ffffff" opacity={0.85} />
      <Circle cx="30" cy="15.5" r="0.9" fill="#ffffff" opacity={0.75} />

      {/* Estructura cálida de madera */}
      <Line x1="7.5" y1="29.5" x2="18.5" y2="29.5" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <Line x1="10.5" y1="29.5" x2="10.5" y2="8.5" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" />
      <Line x1="10.5" y1="8.5" x2="22.5" y2="8.5" stroke="#fef3c7" strokeWidth="2.4" strokeLinecap="round" />
      <Line x1="10.5" y1="13" x2="15" y2="8.5" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
      {/* Cuerda dorada */}
      <Line x1="22.5" y1="8.5" x2="22.5" y2="14" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />

      {/* Corazón / personaje brillante suspendido */}
      <Path
        d="M22.5 25.5C22.5 25.5 16.5 21.6 16.5 17.6C16.5 15.6 18 14.2 19.8 14.2C21 14.2 22 14.9 22.5 15.8C23 14.9 24 14.2 25.2 14.2C27 14.2 28.5 15.6 28.5 17.6C28.5 21.6 22.5 25.5 22.5 25.5Z"
        fill="#f43f5e"
        stroke="#ffe4e6"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <Circle cx="19.2" cy="17.2" r="1" fill="#ffffff" opacity={0.85} />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Dibuja y Adivina: paleta de madera, manchas vivas y pincel
 */
export const DrawGuessCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Tarjeta de lienzo trasera */}
      <Rect
        x="4"
        y="3.5"
        width="24"
        height="20"
        rx="4"
        fill="#ffffff"
        stroke="#10b981"
        strokeWidth="1.6"
        transform="rotate(-8 16 13.5)"
      />
      {/* Trazo arcoíris en el lienzo */}
      <Path d="M8.5 13C11 9.5 14 14.5 17 10.5C19 8 21.5 10.5 23.5 9" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" />

      {/* Paleta artística de madera cálida */}
      <Path
        d="M18.2 10.5C11.4 10.5 6 15.4 6 21.8C6 28.3 11.4 33 17.8 33C20.2 33 21.8 31.6 21.8 29.8C21.8 28.7 21.2 28 21.2 27.1C21.2 26 22.3 25.2 23.8 25.2H26C28.8 25.2 30.8 23.2 30.8 20.4C30.8 14.7 25.1 10.5 18.2 10.5Z"
        fill="#fde68a"
        stroke="#92400e"
        strokeWidth="1.6"
      />
      {/* Gotitas de colores */}
      <Circle cx="12.2" cy="18" r="2.2" fill="#f43f5e" />
      <Circle cx="18.2" cy="15.2" r="2.2" fill="#3b82f6" />
      <Circle cx="24.5" cy="17.8" r="2.2" fill="#a855f7" />
      <Circle cx="10.8" cy="24" r="2.2" fill="#10b981" />

      {/* Orificio del pulgar */}
      <Circle cx="16.2" cy="28.2" r="2.3" fill="#ffffff" stroke="#92400e" strokeWidth="1.2" />

      {/* Pincel diagonal */}
      <Path
        d="M23.2 31.2L31.4 23L33.4 25L25.2 33.2L23.2 31.2Z"
        fill="#059669"
        stroke="#064e3b"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <Circle cx="22.8" cy="31.8" r="2.1" fill="#f43f5e" />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Dominó: par de fichas en capas con remache dorado
 */
export const DominoCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Ficha trasera inclinada índigo */}
      <Rect
        x="12"
        y="3.5"
        width="17"
        height="25"
        rx="4"
        fill="#4f46e5"
        stroke="#c7d2fe"
        strokeWidth="1.4"
        transform="rotate(14 20.5 16)"
      />

      {/* Ficha frontal marfil */}
      <Rect
        x="5.5"
        y="4.5"
        width="19.5"
        height="28"
        rx="4.5"
        fill="#fffef8"
        stroke="#312e81"
        strokeWidth="1.9"
      />
      <Line x1="6.8" y1="18.5" x2="23.7" y2="18.5" stroke="#4338ca" strokeWidth="1.5" />
      <Circle cx="15.2" cy="18.5" r="1.5" fill="#eab308" stroke="#ca8a04" strokeWidth="0.6" />

      {/* Puntos superiores (3 en diagonal) */}
      <Circle cx="10.2" cy="9.2" r="1.6" fill="#4f46e5" />
      <Circle cx="15.2" cy="12" r="1.6" fill="#f43f5e" />
      <Circle cx="20.2" cy="14.8" r="1.6" fill="#4f46e5" />

      {/* Puntos inferiores (4 esquinas) */}
      <Circle cx="10.2" cy="22.8" r="1.6" fill="#312e81" />
      <Circle cx="20.2" cy="22.8" r="1.6" fill="#312e81" />
      <Circle cx="10.2" cy="28.4" r="1.6" fill="#312e81" />
      <Circle cx="20.2" cy="28.4" r="1.6" fill="#312e81" />
    </Svg>
  );
};

/**
 * Ícono ilustrado multicapa de Carta UNO: abanico de cartas azul, verde y roja con óvalo central
 */
export const UnoCustomIcon: React.FC<CustomIconProps> = ({ size = 24 }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Carta azul trasera izquierda */}
      <Rect
        x="3.5"
        y="5"
        width="17"
        height="24"
        rx="3.8"
        fill="#2563eb"
        stroke="#ffffff"
        strokeWidth="1.2"
        transform="rotate(-14 12 17)"
      />
      {/* Carta verde trasera derecha */}
      <Rect
        x="14.5"
        y="4.5"
        width="17"
        height="24"
        rx="3.8"
        fill="#10b981"
        stroke="#ffffff"
        strokeWidth="1.2"
        transform="rotate(14 23 16.5)"
      />

      {/* Carta frontal principal roja */}
      <Rect
        x="8"
        y="5.5"
        width="20"
        height="27"
        rx="4"
        fill="#ef4444"
        stroke="#ffffff"
        strokeWidth="1.7"
      />

      {/* Óvalo blanco inclinado en el centro */}
      <G transform="rotate(-24 18 19)">
        <Ellipse cx="18" cy="19" rx="8.4" ry="4.5" fill="#ffffff" />
        <SvgText
          x="18"
          y="21"
          fill="#1e1b4b"
          fontSize="5.8"
          fontWeight="900"
          textAnchor="middle"
        >
          UNO
        </SvgText>
      </G>

      {/* Destellos de color */}
      <Circle cx="11.5" cy="9.5" r="1.4" fill="#facc15" />
      <Circle cx="24.5" cy="28.5" r="1.4" fill="#fde047" />
    </Svg>
  );
};

/**
 * Renderizador unificado de íconos ilustrados SVG para los 8 juegos de KMRG.
 */
export const GameVectorIcon: React.FC<{
  gameId: GameIconId;
  size?: number;
  color?: string;
}> = ({ gameId, size = 24, color }) => {
  switch (gameId) {
    case 'tictactoe':
      return <TicTacToeCustomIcon size={size} color={color} />;
    case 'sudoku':
      return <SudokuCustomIcon size={size} color={color} />;
    case 'chess':
      return <ChessCustomIcon size={size} color={color} />;
    case 'battleship':
      return <BattleshipCustomIcon size={size} color={color} />;
    case 'hangman':
      return <HangmanCustomIcon size={size} color={color} />;
    case 'drawguess':
      return <DrawGuessCustomIcon size={size} color={color} />;
    case 'domino':
      return <DominoCustomIcon size={size} color={color} />;
    case 'uno':
      return <UnoCustomIcon size={size} color={color} />;
    default:
      return <TicTacToeCustomIcon size={size} color={color} />;
  }
};

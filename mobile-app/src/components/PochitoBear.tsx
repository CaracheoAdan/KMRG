import React, { useEffect, useId, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { PetAccessoryType } from '../types';

export interface PochitoBearProps {
  mood?: 'feliz' | 'seria' | 'triste';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  accessory?: PetAccessoryType;
  isAnimated?: boolean;
  isTickled?: boolean;
}

/**
 * Pochito ("Panzón"): Mascota de pareja ilustrada en SVG con cuerpo completo
 * regordete, pancita crema, patitas con huellitas y accesorios hechos a medida
 * que se adaptan anatómicamente a su cabeza, orejas, ojos y cuello.
 */
export const PochitoBear: React.FC<PochitoBearProps> = ({
  mood = 'feliz',
  size = 'md',
  accessory = 'none',
  isAnimated = false,
  isTickled = false,
}) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '') || 'pochito';
  const animBreath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAnimated) {
      animBreath.stopAnimation(() => {
        animBreath.setValue(1);
      });
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animBreath, {
          toValue: 1.035,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(animBreath, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [isAnimated, animBreath]);

  const widthMap = {
    sm: 48,
    md: 78,
    lg: 112,
    hero: 162,
  } as const;

  const width = widthMap[size];
  const height = Math.round(width * (155 / 140));

  const palette =
    mood === 'feliz'
      ? {
          furTop: '#fef08a',
          furMid: '#fde047',
          furShadow: '#f59e0b',
          stroke: '#b45309',
          innerEar: '#fda4af',
          bellyTop: '#fffef9',
          bellyBottom: '#fef3c7',
          blush: '#fb7185',
        }
      : mood === 'seria'
      ? {
          furTop: '#ffedd5',
          furMid: '#fed7aa',
          furShadow: '#fb923c',
          stroke: '#c2410c',
          innerEar: '#fecdd3',
          bellyTop: '#fffdf9',
          bellyBottom: '#ffedd5',
          blush: '#fb7185',
        }
      : {
          furTop: '#f1f5f9',
          furMid: '#e2e8f0',
          furShadow: '#94a3b8',
          stroke: '#475569',
          innerEar: '#cbd5e1',
          bellyTop: '#ffffff',
          bellyBottom: '#e2e8f0',
          blush: '#93c5fd',
        };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          height,
          transform: [{ scale: animBreath }],
        },
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 140 155">
        <Defs>
          <RadialGradient id={`furBody-${uid}`} cx="45%" cy="35%" r="65%">
            <Stop offset="0%" stopColor={palette.furTop} />
            <Stop offset="62%" stopColor={palette.furMid} />
            <Stop offset="100%" stopColor={palette.furShadow} />
          </RadialGradient>

          <RadialGradient id={`furHead-${uid}`} cx="46%" cy="32%" r="65%">
            <Stop offset="0%" stopColor={palette.furTop} />
            <Stop offset="65%" stopColor={palette.furMid} />
            <Stop offset="100%" stopColor={palette.furShadow} />
          </RadialGradient>

          <LinearGradient id={`belly-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={palette.bellyTop} />
            <Stop offset="100%" stopColor={palette.bellyBottom} />
          </LinearGradient>

          <LinearGradient id={`gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fef08a" />
            <Stop offset="45%" stopColor="#facc15" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>

          <LinearGradient id={`lens-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#334155" />
            <Stop offset="55%" stopColor="#0f172a" />
            <Stop offset="100%" stopColor="#020617" />
          </LinearGradient>

          <LinearGradient id={`scarf-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fb7185" />
            <Stop offset="55%" stopColor="#f43f5e" />
            <Stop offset="100%" stopColor="#be123c" />
          </LinearGradient>

          <LinearGradient id={`wizard-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#6366f1" />
            <Stop offset="55%" stopColor="#4338ca" />
            <Stop offset="100%" stopColor="#312e81" />
          </LinearGradient>

          <LinearGradient id={`heart-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#fb7185" />
            <Stop offset="100%" stopColor="#e11d48" />
          </LinearGradient>

          <LinearGradient id={`loincloth-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#fbbf24" />
            <Stop offset="55%" stopColor="#f59e0b" />
            <Stop offset="100%" stopColor="#d97706" />
          </LinearGradient>
        </Defs>

        {/* Sombra suave en el piso */}
        <Ellipse cx="70" cy="145" rx="45" ry="7" fill="rgba(15, 23, 42, 0.11)" />

        {/* === OREJITAS REDONDAS === */}
        <G>
          <Circle
            cx="37"
            cy="43"
            r="14.5"
            fill={`url(#furHead-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.4"
          />
          <Circle cx="37.5" cy="43.5" r="8" fill={palette.innerEar} />

          <Circle
            cx="103"
            cy="43"
            r="14.5"
            fill={`url(#furHead-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.4"
          />
          <Circle cx="102.5" cy="43.5" r="8" fill={palette.innerEar} />
        </G>

        {/* === CUERPO REGORDETE ("PANZÓN") === */}
        <G>
          {/* Silueta redonda y rechoncha del cuerpo */}
          <Path
            d="M 41 83 C 23 93, 18 119, 30 135 C 40 146, 100 146, 110 135 C 122 119, 117 93, 99 83 Z"
            fill={`url(#furBody-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />

          {/* Pancita grande color crema */}
          <Ellipse
            cx="70"
            cy="115"
            rx="30"
            ry="23.5"
            fill={`url(#belly-${uid})`}
            stroke={palette.furShadow}
            strokeWidth="1.2"
          />

          {/* Ombliguito tierno en la panza */}
          <Path
            d="M 67.5 127 Q 70 129.8 72.5 127"
            fill="none"
            stroke={palette.stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.45"
          />

          {/* === VESTIMENTA: TAPARRABOS CLÁSICO (CORDÓN FINO + PAÑO ANGOSTO AL CENTRO) === */}
          <G key={`loincloth-${accessory === 'loincloth' ? 'on' : 'off'}`}>
            {accessory === 'loincloth' ? (
              <G>
                {/* Cordón delgado alrededor de la cintura baja (deja los costados libres) */}
                <Path
                  d="M 26.5 122.5 Q 70 132.5 113.5 122.5"
                  fill="none"
                  stroke="#451a03"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <Path
                  d="M 27 122.5 Q 70 132.5 113 122.5"
                  fill="none"
                  stroke="#b45309"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
                {/* Paño angosto central cubriendo únicamente la zona íntima inferior */}
                <Path
                  d="M 61.5 127 Q 70 129 78.5 127 L 81.5 142.5 L 75.5 140.5 L 70 146 L 64.5 140.5 L 58.5 142.5 Z"
                  fill={`url(#loincloth-${uid})`}
                  stroke="#78350f"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                {/* Pliegue suave y manchitas sobre el taparrabos angosto */}
                <Path
                  d="M 70 128.5 L 70 136"
                  stroke="#b45309"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  opacity="0.45"
                />
                <Circle cx="65.5" cy="134.5" r="1.7" fill="#78350f" opacity="0.72" />
                <Circle cx="74" cy="135.5" r="1.6" fill="#78350f" opacity="0.72" />
                <Circle cx="70" cy="140.5" r="1.4" fill="#78350f" opacity="0.68" />
                {/* Nudito del cordón + hojita pequeña arriba del taparrabos */}
                <Path
                  d="M 75 127 C 80 123, 85 124.5, 84 128.5 C 81.5 130.5, 77.5 129.5, 75 127 Z"
                  fill="#22c55e"
                  stroke="#15803d"
                  strokeWidth="1.1"
                />
                <Circle cx="70" cy="127.5" r="2.6" fill="#92400e" stroke="#451a03" strokeWidth="1.3" />
              </G>
            ) : null}
          </G>

          {/* Patita trasera izquierda con huellitas */}
          <G transform="rotate(-14 38 136)">
            <Ellipse
              cx="38"
              cy="136"
              rx="14"
              ry="10"
              fill={`url(#furBody-${uid})`}
              stroke={palette.stroke}
              strokeWidth="2.2"
            />
            <Ellipse cx="38" cy="137.5" rx="6.5" ry="4.5" fill="#fda4af" />
            <Circle cx="33" cy="131.5" r="2" fill="#fda4af" />
            <Circle cx="38" cy="130" r="2.1" fill="#fda4af" />
            <Circle cx="43" cy="131.5" r="2" fill="#fda4af" />
          </G>

          {/* Patita trasera derecha con huellitas */}
          <G transform="rotate(14 102 136)">
            <Ellipse
              cx="102"
              cy="136"
              rx="14"
              ry="10"
              fill={`url(#furBody-${uid})`}
              stroke={palette.stroke}
              strokeWidth="2.2"
            />
            <Ellipse cx="102" cy="137.5" rx="6.5" ry="4.5" fill="#fda4af" />
            <Circle cx="97" cy="131.5" r="2" fill="#fda4af" />
            <Circle cx="102" cy="130" r="2.1" fill="#fda4af" />
            <Circle cx="107" cy="131.5" r="2" fill="#fda4af" />
          </G>
        </G>

        {/* === BRACITOS REGORDETES SOBRE LA PANCITA === */}
        <G>
          {/* Bracito izquierdo */}
          <Path
            d="M 30 93 C 23 102, 32 117, 48 114 C 54 113, 56 104, 48 98 C 43 94, 35 90, 30 93 Z"
            fill={`url(#furBody-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Bracito derecho */}
          <Path
            d="M 110 93 C 117 102, 108 117, 92 114 C 86 113, 84 104, 92 98 C 97 94, 105 90, 110 93 Z"
            fill={`url(#furBody-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />

          {/* Corazoncito abrazado sobre la panza cuando está feliz */}
          <G key={`belly-heart-${mood}`}>
            {mood === 'feliz' ? (
              <G>
                <Path
                  d="M 70 119 C 69 118, 57 110, 57 103.5 C 57 99.5, 60.5 96.8, 64.3 96.8 C 67 96.8, 69 98.5, 70 100.3 C 71 98.5, 73 96.8, 75.7 96.8 C 79.5 96.8, 83 99.5, 83 103.5 C 83 110, 71 118, 70 119 Z"
                  fill={`url(#heart-${uid})`}
                  stroke="#be123c"
                  strokeWidth="1.5"
                />
                <Ellipse
                  cx="63"
                  cy="102"
                  rx="2.3"
                  ry="1.3"
                  fill="#ffffff"
                  opacity="0.7"
                  transform="rotate(-28 63 102)"
                />
              </G>
            ) : null}
          </G>
        </G>

        {/* === BUFANDITA TEJIDA RODEANDO EL CUELLO (ENTRE CUERPO Y CABEZA) === */}
        <G key={`scarf-${accessory === 'scarf' ? 'on' : 'off'}`}>
          {accessory === 'scarf' ? (
            <G>
              {/* Caídas de la bufanda sobre la pancita */}
              <Path
                d="M 77 90 L 91 91 L 96 117 L 82 118 Z"
                fill={`url(#scarf-${uid})`}
                stroke="#9f1239"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <Path d="M 81 104 L 93 104" stroke="#fecdd3" strokeWidth="2.4" strokeLinecap="round" />
              <Path d="M 83 118 L 83 122 M 88 118 L 88 122 M 93 117.5 L 93 121.5" stroke="#fecdd3" strokeWidth="1.8" strokeLinecap="round" />

              <Path
                d="M 55 90 L 69 91 L 66 113 L 52 111 Z"
                fill="#e11d48"
                stroke="#9f1239"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <Path d="M 54 102 L 66 103" stroke="#fecdd3" strokeWidth="2.2" strokeLinecap="round" />
              <Path d="M 53 111.5 L 52.5 115.5 M 58 112.2 L 57.5 116 M 63 112.8 L 62.5 116.5" stroke="#fecdd3" strokeWidth="1.8" strokeLinecap="round" />

              {/* Collarín tejido que abraza todo el cuello */}
              <Path
                d="M 38 82 Q 70 95 102 82 C 107 85, 107 95, 100 96 Q 70 106 40 96 C 33 95, 33 85, 38 82 Z"
                fill={`url(#scarf-${uid})`}
                stroke="#9f1239"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Nudo acolchado lateral de la bufanda */}
              <Rect
                x="72"
                y="88"
                width="17"
                height="11"
                rx="5.5"
                fill="#fb7185"
                stroke="#9f1239"
                strokeWidth="1.8"
              />
              {/* Líneas de tejido */}
              <Path d="M 46 89 L 45 96 M 55 92 L 54.5 98.5 M 64 93.5 L 64 99.5" stroke="#9f1239" strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
            </G>
          ) : null}
        </G>

        {/* === CABEZA MOCHI CACHETONA === */}
        <G>
          <Path
            d="M 70 34 C 95 34, 113 47, 113 65 C 113 82, 96 92, 70 92 C 44 92, 27 82, 27 65 C 27 47, 45 34, 70 34 Z"
            fill={`url(#furHead-${uid})`}
            stroke={palette.stroke}
            strokeWidth="2.4"
          />

          {/* Brillo suave en la frente */}
          <Ellipse
            cx="57"
            cy="43"
            rx="16"
            ry="5"
            fill="#ffffff"
            opacity="0.32"
            transform="rotate(-12 57 43)"
          />

          {/* Expresión y rasgos faciales agrupados por clave estable para evitar mutación de índices en RNSVGGroup */}
          <G key={`face-${mood}-${accessory}-${isTickled ? 't' : 'n'}`}>
            {/* Mechoncito tierno en la coronilla (visible cuando no tiene sombrero cerrado) */}
            {accessory !== 'wizard' && accessory !== 'beret' && accessory !== 'party_hat' ? (
              <Path
                d="M 66 34.5 Q 69 27 72 34.2 Q 75 29 76 34.5"
                fill={palette.furTop}
                stroke={palette.stroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* Mejillas sonrojadas */}
            <Ellipse
              cx="39"
              cy="69"
              rx={isTickled ? 8.8 : 7.5}
              ry={isTickled ? 5 : 4.2}
              fill={isTickled ? '#fb7185' : palette.blush}
              opacity={isTickled ? 0.72 : 0.48}
            />
            <Ellipse
              cx="101"
              cy="69"
              rx={isTickled ? 8.8 : 7.5}
              ry={isTickled ? 5 : 4.2}
              fill={isTickled ? '#fb7185' : palette.blush}
              opacity={isTickled ? 0.72 : 0.48}
            />
            <Circle cx="37" cy="67.8" r="1.1" fill="#ffffff" opacity="0.6" />
            <Circle cx="99" cy="67.8" r="1.1" fill="#ffffff" opacity="0.6" />

            {/* === OJOS EXPRESIVOS === */}
            {isTickled ? (
              <G>
                {/* Ojitos arqueados de risa por cosquillas / alegría */}
                <Path
                  d="M 46.5 62.5 Q 53 53.5 59.5 62.5"
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <Path
                  d="M 80.5 62.5 Q 87 53.5 93.5 62.5"
                  fill="none"
                  stroke="#1c1917"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </G>
            ) : (
              <G>
                {mood === 'feliz' && (
                  <G>
                    {/* Ojo izquierdo */}
                    <Ellipse cx="53" cy="60.5" rx="5.4" ry="6.4" fill="#1c1917" />
                    <Circle cx="51.2" cy="58" r="2.1" fill="#ffffff" />
                    <Circle cx="54.8" cy="63" r="1" fill="#ffffff" />
                    {/* Ojo derecho */}
                    <Ellipse cx="87" cy="60.5" rx="5.4" ry="6.4" fill="#1c1917" />
                    <Circle cx="85.2" cy="58" r="2.1" fill="#ffffff" />
                    <Circle cx="88.8" cy="63" r="1" fill="#ffffff" />
                  </G>
                )}

                {mood === 'seria' && (
                  <G>
                    <Path d="M 48 52.5 L 57 53.5" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
                    <Path d="M 92 52.5 L 83 53.5" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
                    <Circle cx="53" cy="61" r="4.6" fill="#1c1917" />
                    <Circle cx="51.5" cy="59.3" r="1.5" fill="#ffffff" />
                    <Circle cx="87" cy="61" r="4.6" fill="#1c1917" />
                    <Circle cx="85.5" cy="59.3" r="1.5" fill="#ffffff" />
                  </G>
                )}

                {mood === 'triste' && (
                  <G>
                    <Path d="M 47 54 Q 52 52 57 49.5" fill="none" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
                    <Path d="M 93 54 Q 88 52 83 49.5" fill="none" stroke={palette.stroke} strokeWidth="2" strokeLinecap="round" />
                    <Ellipse cx="53" cy="61" rx="5" ry="5.8" fill="#1c1917" />
                    <Circle cx="51.3" cy="58.7" r="1.9" fill="#ffffff" />
                    <Ellipse cx="87" cy="61" rx="5" ry="5.8" fill="#1c1917" />
                    <Circle cx="85.3" cy="58.7" r="1.9" fill="#ffffff" />
                    {/* Lagrimita tierna */}
                    <Path
                      d="M 47 64 C 45 67.5, 43.5 70.5, 46.5 72.5 C 49.5 74, 51 70.5, 49.5 67.5 Z"
                      fill="#38bdf8"
                      stroke="#0284c7"
                      strokeWidth="1"
                    />
                    <Circle cx="46.5" cy="69.5" r="0.9" fill="#ffffff" />
                  </G>
                )}
              </G>
            )}

            {/* === HOCIQUITO CREMA + NARIZ + BOQUITA === */}
            <G>
              <Ellipse
                cx="70"
                cy="73.5"
                rx="17"
                ry="12"
                fill="#fffdf5"
                stroke="#fed7aa"
                strokeWidth="1.3"
              />
              {/* Naricita chocolate en forma de corazón/triángulo redondeado */}
              <Path
                d="M 65 68.5 C 65 66.5, 75 66.5, 75 68.5 C 75 70.6, 71.5 73.2, 70 73.5 C 68.5 73.2, 65 70.6, 65 68.5 Z"
                fill="#78350f"
              />
              <Ellipse cx="68.5" cy="68.2" rx="1.8" ry="0.9" fill="#ffffff" opacity="0.55" />

              {(mood === 'feliz' || isTickled) && (
                <G>
                  <Path
                    d="M 63.5 76 Q 66.8 80 70 76 Q 73.2 80 76.5 76"
                    fill="none"
                    stroke="#78350f"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d={isTickled ? 'M 66.5 77.8 Q 70 84.5 73.5 77.8 Z' : 'M 67.8 78.2 Q 70 82.5 72.2 78.2 Z'}
                    fill="#fb7185"
                  />
                </G>
              )}

              {mood === 'seria' && !isTickled && (
                <G>
                  <Path
                    d="M 65.5 77.5 Q 70 78.5 74.5 77.5"
                    fill="none"
                    stroke="#78350f"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </G>
              )}

              {mood === 'triste' && !isTickled && (
                <G>
                  <Path
                    d="M 64.5 79.5 Q 70 74.8 75.5 79.5"
                    fill="none"
                    stroke="#78350f"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </G>
              )}
            </G>
          </G>
        </G>

        {/* Corazoncitos, destellos y accesorios en un grupo estable para RNSVG */}
        <G key={`extras-${accessory}-${isTickled ? 't' : 'n'}`}>
          {/* Corazoncitos y destellos flotantes al hacerle cosquillas */}
          {isTickled && (
            <G>
              <Path
                d="M 16 82 C 15.4 81.2, 10 77.2, 10 74 C 10 72, 11.7 70.8, 13.5 70.8 C 14.8 70.8, 15.6 71.6, 16 72.4 C 16.4 71.6, 17.2 70.8, 18.5 70.8 C 20.3 70.8, 22 72, 22 74 C 22 77.2, 16.6 81.2, 16 82 Z"
                fill="#f43f5e"
              />
              <Path
                d="M 124 76 C 123.5 75.3, 119 71.8, 119 69 C 119 67.2, 120.5 66, 122 66 C 123 66, 123.7 66.7, 124 67.4 C 124.3 66.7, 125 66, 126 66 C 127.5 66, 129 67.2, 129 69 C 129 71.8, 124.5 75.3, 124 76 Z"
                fill="#fb7185"
              />
              <Path d="M 18 28 L 19.5 31 L 22.5 32.5 L 19.5 34 L 18 37 L 16.5 34 L 13.5 32.5 L 16.5 31 Z" fill="#facc15" />
              <Path d="M 122 26 L 123.5 29 L 126.5 30.5 L 123.5 32 L 122 35 L 120.5 32 L 117.5 30.5 L 120.5 29 Z" fill="#facc15" />
            </G>
          )}

        {/* === ACCESORIOS ADAPTADOS AL CUERPO DE POCHITO === */}

        {/* Gafas de sol: patillas a los lados y lentes justo sobre los ojos */}
        {accessory === 'sunglasses' && (
          <G>
            {/* Patillas laterales */}
            <Path d="M 27 56.5 L 39 56.5" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            <Path d="M 101 56.5 L 113 56.5" stroke="#1e293b" strokeWidth="2.8" strokeLinecap="round" />
            {/* Puente sobre el hociquito */}
            <Path d="M 63.5 57.5 Q 70 55.2 76.5 57.5" fill="none" stroke="#1e293b" strokeWidth="3.2" strokeLinecap="round" />
            {/* Marco + lente izquierdo */}
            <Rect
              x="39"
              y="52"
              width="26"
              height="17"
              rx="6.5"
              fill={`url(#lens-${uid})`}
              stroke="#0f172a"
              strokeWidth="2.4"
            />
            <Path d="M 44 55.5 L 49 65.5 M 49.5 55.5 L 52.5 61.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
            {/* Marco + lente derecho */}
            <Rect
              x="75"
              y="52"
              width="26"
              height="17"
              rx="6.5"
              fill={`url(#lens-${uid})`}
              stroke="#0f172a"
              strokeWidth="2.4"
            />
            <Path d="M 80 55.5 L 85 65.5 M 85.5 55.5 L 88.5 61.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
            {/* Remaches dorados del marco */}
            <Circle cx="41.5" cy="54.8" r="1.1" fill="#facc15" />
            <Circle cx="98.5" cy="54.8" r="1.1" fill="#facc15" />
          </G>
        )}

        {/* Corona Real adaptada a la curva de su cabecita */}
        {accessory === 'crown' && (
          <G>
            <Path
              d="M 50 36 L 47 18 L 60 26 L 70 13 L 80 26 L 93 18 L 90 36 Q 70 39 50 36 Z"
              fill={`url(#gold-${uid})`}
              stroke="#92400e"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Banda carmesí inferior ajustada a la cabeza */}
            <Path
              d="M 50 33.5 Q 70 36.5 90 33.5 L 90 36.5 Q 70 39.5 50 36.5 Z"
              fill="#e11d48"
              stroke="#92400e"
              strokeWidth="1.2"
            />
            {/* Perlas doradas en las puntas */}
            <Circle cx="47" cy="17.5" r="2.6" fill="#fef08a" stroke="#92400e" strokeWidth="1.4" />
            <Circle cx="70" cy="12.5" r="3" fill="#fef08a" stroke="#92400e" strokeWidth="1.4" />
            <Circle cx="93" cy="17.5" r="2.6" fill="#fef08a" stroke="#92400e" strokeWidth="1.4" />
            {/* Joyas centrales */}
            <Circle cx="70" cy="27.5" r="3" fill="#f43f5e" stroke="#fff1f2" strokeWidth="1" />
            <Circle cx="58.5" cy="29.5" r="2" fill="#38bdf8" />
            <Circle cx="81.5" cy="29.5" r="2" fill="#34d399" />
          </G>
        )}

        {/* Moñito coqueto prendido sobre su orejita izquierda */}
        {accessory === 'bow' && (
          <G transform="rotate(-18 39 39)">
            {/* Listones colgantes */}
            <Path d="M 36 41 L 29 52 L 36 49 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" strokeLinejoin="round" />
            <Path d="M 42 41 L 49 52 L 42 49 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Lazos izquierdo y derecho */}
            <Path
              d="M 38 38 C 28 29, 20 33, 21 40 C 22 47, 30 47, 38 40 Z"
              fill="#fb7185"
              stroke="#9f1239"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <Path
              d="M 40 38 C 50 29, 58 33, 57 40 C 56 47, 48 47, 40 40 Z"
              fill="#fb7185"
              stroke="#9f1239"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Pliegues internos */}
            <Path d="M 27 38.5 L 34 39" stroke="#ffe4e6" strokeWidth="1.4" strokeLinecap="round" />
            <Path d="M 51 38.5 L 44 39" stroke="#ffe4e6" strokeWidth="1.4" strokeLinecap="round" />
            {/* Nudo central */}
            <Circle cx="39" cy="39" r="4.8" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.8" />
            <Circle cx="37.8" cy="37.5" r="1.4" fill="#ffe4e6" />
          </G>
        )}

        {/* Florecita Sakura real prendida en su orejita derecha */}
        {accessory === 'flower' && (
          <G>
            {/* Hojitas verdes */}
            <Ellipse
              cx="92"
              cy="43"
              rx="6.5"
              ry="3.4"
              fill="#34d399"
              stroke="#047857"
              strokeWidth="1.4"
              transform="rotate(-25 92 43)"
            />
            <Ellipse
              cx="111"
              cy="45"
              rx="6.5"
              ry="3.4"
              fill="#34d399"
              stroke="#047857"
              strokeWidth="1.4"
              transform="rotate(28 111 45)"
            />
            {/* 5 pétalos de cerezo */}
            <Circle cx="102" cy="30" r="6" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.5" />
            <Circle cx="110.5" cy="36" r="6" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.5" />
            <Circle cx="107" cy="45.5" r="6" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.5" />
            <Circle cx="97" cy="45.5" r="6" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.5" />
            <Circle cx="93.5" cy="36" r="6" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.5" />
            {/* Centro dorado de la flor */}
            <Circle cx="102" cy="38.5" r="5" fill="#fde047" stroke="#ca8a04" strokeWidth="1.4" />
            <Circle cx="100.8" cy="37.3" r="1.3" fill="#ffffff" opacity="0.8" />
          </G>
        )}

        {/* Gorrito de Fiesta cono colorido sobre su cabeza */}
        {accessory === 'party_hat' && (
          <G transform="rotate(6 70 34)">
            <Path
              d="M 55 36 L 70 10 L 85 36 Q 70 39 55 36 Z"
              fill="#ec4899"
              stroke="#831843"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Franjas diagonales alegres */}
            <Path d="M 60 28 L 78 24" stroke="#fde047" strokeWidth="3.5" strokeLinecap="round" />
            <Path d="M 64 20 L 74 17.5" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
            <Circle cx="65" cy="32" r="2" fill="#a7f3d0" />
            <Circle cx="76" cy="31" r="2" fill="#fde047" />
            {/* Borde esponjoso del cono */}
            <Circle cx="56" cy="36" r="3" fill="#fef08a" stroke="#831843" strokeWidth="1.2" />
            <Circle cx="63" cy="37" r="3" fill="#ffffff" stroke="#831843" strokeWidth="1.2" />
            <Circle cx="70" cy="37.5" r="3.2" fill="#fef08a" stroke="#831843" strokeWidth="1.2" />
            <Circle cx="77" cy="37" r="3" fill="#ffffff" stroke="#831843" strokeWidth="1.2" />
            <Circle cx="84" cy="36" r="3" fill="#fef08a" stroke="#831843" strokeWidth="1.2" />
            {/* Pompón superior */}
            <Circle cx="70" cy="9" r="5" fill="#fde047" stroke="#831843" strokeWidth="1.6" />
            <Circle cx="68.5" cy="7.5" r="1.5" fill="#ffffff" opacity="0.7" />
          </G>
        )}

        {/* Boina Francesa inclinada abrazando su cabeza */}
        {accessory === 'beret' && (
          <G transform="rotate(-14 63 34)">
            {/* Rabito superior */}
            <Path d="M 62 21 L 64 17" stroke="#881337" strokeWidth="2.5" strokeLinecap="round" />
            {/* Copa abombada de la boina */}
            <Path
              d="M 38 35 C 36 22, 52 19, 66 20 C 82 21, 90 27, 87 35 Q 62 39 38 35 Z"
              fill="#be123c"
              stroke="#881337"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Brillo de tela */}
            <Path d="M 48 25 Q 62 22 76 25" fill="none" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            {/* Banda ajustada a la frente */}
            <Path
              d="M 40 34.5 Q 63 38.5 85 34.5"
              fill="none"
              stroke="#4c0519"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </G>
        )}

        {/* Audífonos con diadema arqueada y almohadillas sobre las orejas */}
        {accessory === 'headphones' && (
          <G>
            {/* Diadema acolchada arqueando la cabeza */}
            <Path
              d="M 24 54 C 24 22, 116 22, 116 54"
              fill="none"
              stroke="#334155"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <Path
              d="M 44 28 Q 70 21 96 28"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="6.5"
              strokeLinecap="round"
            />
            {/* Auricular izquierdo sobre oreja/lado */}
            <Rect
              x="18"
              y="44"
              width="12"
              height="24"
              rx="6"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
            <Rect x="27" y="46" width="5" height="20" rx="2.5" fill="#1e293b" />
            <Circle cx="23.5" cy="56" r="3" fill="#e0f2fe" />
            {/* Auricular derecho sobre oreja/lado */}
            <Rect
              x="110"
              y="44"
              width="12"
              height="24"
              rx="6"
              fill="#38bdf8"
              stroke="#0f172a"
              strokeWidth="2"
            />
            <Rect x="108" y="46" width="5" height="20" rx="2.5" fill="#1e293b" />
            <Circle cx="116.5" cy="56" r="3" fill="#e0f2fe" />
            {/* Notita musical sutil */}
            <Path
              d="M 118 28 L 118 19 L 124 17.5 L 124 26"
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <Circle cx="116.5" cy="28.5" r="2" fill="#0284c7" />
            <Circle cx="122.5" cy="26.5" r="2" fill="#0284c7" />
          </G>
        )}

        {/* Auréola celestial brillante flotando sobre su cabeza */}
        {accessory === 'halo' && (
          <G>
            {/* Resplandor exterior */}
            <Ellipse
              cx="70"
              cy="19"
              rx="22"
              ry="7"
              fill="none"
              stroke="#fef08a"
              strokeWidth="6.5"
              opacity="0.45"
            />
            {/* Anillo dorado */}
            <Ellipse
              cx="70"
              cy="19"
              rx="20"
              ry="5.5"
              fill="none"
              stroke={`url(#gold-${uid})`}
              strokeWidth="3.6"
            />
            {/* Destellos */}
            <Path d="M 42 15 L 43.5 18 L 46.5 19.5 L 43.5 21 L 42 24 L 40.5 21 L 37.5 19.5 L 40.5 18 Z" fill="#fde047" />
            <Path d="M 98 13 L 99 15.5 L 101.5 16.5 L 99 17.5 L 98 20 L 97 17.5 L 94.5 16.5 L 97 15.5 Z" fill="#fde047" />
          </G>
        )}

        {/* Sombrero de Maguito con ala curva sobre su cabeza y estrellitas */}
        {accessory === 'wizard' && (
          <G>
            {/* Ala ancha curva que descansa sobre su cabeza */}
            <Path
              d="M 36 37 Q 70 43 104 37 Q 95 31 70 31 Q 45 31 36 37 Z"
              fill={`url(#wizard-${uid})`}
              stroke="#1e1b4b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cono mágico inclinado */}
            <Path
              d="M 51 34 L 65 8 Q 71 4 79 11 L 75 14 L 89 34 Q 70 37 51 34 Z"
              fill={`url(#wizard-${uid})`}
              stroke="#1e1b4b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* Cinturón dorado con hebilla */}
            <Path
              d="M 52.5 31 Q 70 34 87.5 31 L 89 34 Q 70 37 51 34 Z"
              fill="#facc15"
              stroke="#92400e"
              strokeWidth="1.1"
            />
            <Rect x="67" y="30.5" width="6" height="5" rx="1" fill="none" stroke="#92400e" strokeWidth="1.4" />
            {/* Estrellitas y lunita mágica */}
            <Circle cx="65" cy="21" r="1.6" fill="#fef08a" />
            <Path d="M 74 19 L 75 21.5 L 77.5 22.5 L 75 23.5 L 74 26 L 73 23.5 L 70.5 22.5 L 73 21.5 Z" fill="#fef08a" />
          </G>
        )}
        </G>
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

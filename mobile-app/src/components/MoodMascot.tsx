import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { PetAccessoryType } from '../types';

export type MoodFeelingType =
  | 'enamorado'
  | 'mimitos'
  | 'feliz'
  | 'emocionado'
  | 'tranquilo'
  | 'divertido'
  | 'agradecido'
  | 'antojo'
  | 'sueno'
  | 'cansado'
  | 'estresado'
  | 'triste'
  | 'enojado';

interface MoodMascotProps {
  feeling?: string;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg';
  accentColor?: string;
  accessory?: PetAccessoryType;
}

/**
 * Retorna la etiqueta con el género correcto según el perfil ('Karla' -> 'Enamorada', 'Javier' -> 'Enamorado')
 */
export function getFeelingLabel(
  feeling: MoodFeelingType | string,
  profile?: string | null
): string {
  const isFemale = profile === 'Karla';
  switch (feeling) {
    case 'enamorado':
      return isFemale ? 'Enamorada' : 'Enamorado';
    case 'mimitos':
      return isFemale ? 'Consentida' : 'Consentido';
    case 'feliz':
      return 'Feliz';
    case 'emocionado':
      return isFemale ? 'Emocionada' : 'Emocionado';
    case 'tranquilo':
      return isFemale ? 'Tranquila' : 'Tranquilo';
    case 'divertido':
      return isFemale ? 'Juguetona' : 'Juguetón';
    case 'agradecido':
      return isFemale ? 'Agradecida' : 'Agradecido';
    case 'antojo':
      return 'Con Antojo';
    case 'sueno':
      return 'Con sueño';
    case 'cansado':
      return isFemale ? 'Cansada' : 'Cansado';
    case 'estresado':
      return isFemale ? 'Abrumada' : 'Abrumado';
    case 'triste':
      return 'Triste';
    case 'enojado':
      return isFemale ? 'Enojada' : 'Enojado';
    default:
      return String(feeling);
  }
}

export const PRESET_FEELINGS: Array<{
  id: MoodFeelingType;
  label: string;
  emoji: string;
  icon: string;
  description: string;
  auraColor: string;
  battery: { icon: string; label: string };
}> = [
  {
    id: 'enamorado',
    label: 'Enamorado/a',
    emoji: '🥰',
    icon: 'heart',
    description: 'Pensando en ti con ojitos de amor',
    auraColor: '#f43f5e',
    battery: { icon: 'heart', label: 'Amor: 100%' },
  },
  {
    id: 'mimitos',
    label: 'Consentido/a',
    emoji: '🥺',
    icon: 'heart-half',
    description: 'Con ganas de abrazos y mimos',
    auraColor: '#ec4899',
    battery: { icon: 'heart-half', label: 'Mimos: 100%' },
  },
  {
    id: 'feliz',
    label: 'Feliz',
    emoji: '😊',
    icon: 'happy',
    description: '¡Radiante y con una sonrisota!',
    auraColor: '#eab308',
    battery: { icon: 'sunny', label: 'Energía: 95%' },
  },
  {
    id: 'emocionado',
    label: 'Emocionado/a',
    emoji: '🤩',
    icon: 'sparkles',
    description: '¡Con toda la emoción y brillo!',
    auraColor: '#f59e0b',
    battery: { icon: 'sparkles', label: 'Energía: 100%' },
  },
  {
    id: 'tranquilo',
    label: 'Tranquilo/a',
    emoji: '😌',
    icon: 'flower-outline',
    description: 'En paz, sereno/a y relajado/a',
    auraColor: '#10b981',
    battery: { icon: 'flower-outline', label: 'Zen: 90%' },
  },
  {
    id: 'divertido',
    label: 'Juguetón/a',
    emoji: '😜',
    icon: 'game-controller',
    description: 'Con ganas de reír y bromear',
    auraColor: '#8b5cf6',
    battery: { icon: 'sparkles', label: 'Pila: 90%' },
  },
  {
    id: 'agradecido',
    label: 'Agradecido/a',
    emoji: '🙏',
    icon: 'star',
    description: 'Agradeciendo por nosotros',
    auraColor: '#06b6d4',
    battery: { icon: 'star', label: 'Plenitud: 95%' },
  },
  {
    id: 'antojo',
    label: 'Con Antojo',
    emoji: '😋',
    icon: 'cake',
    description: 'Pensando en algo rico para comer',
    auraColor: '#f97316',
    battery: { icon: 'cake', label: 'Antojo: 85%' },
  },
  {
    id: 'sueno',
    label: 'Con sueño',
    emoji: '🥱',
    icon: 'moon',
    description: 'Listo/a para mimir y soñar contigo',
    auraColor: '#6366f1',
    battery: { icon: 'moon', label: 'Sueño: 95%' },
  },
  {
    id: 'cansado',
    label: 'Cansado/a',
    emoji: '😴',
    icon: 'hourglass-outline',
    description: 'Con sueñito y sin mucha pila',
    auraColor: '#64748b',
    battery: { icon: 'time-outline', label: 'Batería: 20%' },
  },
  {
    id: 'estresado',
    label: 'Abrumado/a',
    emoji: '😵‍💫',
    icon: 'pulse',
    description: 'Día pesado, necesito un respiro',
    auraColor: '#ea580c',
    battery: { icon: 'pulse', label: 'Pila: 30%' },
  },
  {
    id: 'triste',
    label: 'Triste',
    emoji: '😢',
    icon: 'heart-dislike-outline',
    description: 'Sensible y necesitando contención',
    auraColor: '#0284c7',
    battery: { icon: 'heart-dislike-outline', label: 'Amor: 25%' },
  },
  {
    id: 'enojado',
    label: 'Enojado/a',
    emoji: '😤',
    icon: 'flame',
    description: 'Un poquito molesto/a o frustrado/a',
    auraColor: '#dc2626',
    battery: { icon: 'flame', label: 'Pila: 40%' },
  },
];

const VALID_FEELING_TYPES: ReadonlySet<MoodFeelingType> = new Set<MoodFeelingType>([
  'enamorado',
  'mimitos',
  'feliz',
  'emocionado',
  'tranquilo',
  'divertido',
  'agradecido',
  'antojo',
  'sueno',
  'cansado',
  'estresado',
  'triste',
  'enojado',
]);

function matchFeelingFromText(raw: string): MoodFeelingType | null {
  const normalized = raw.toLowerCase();
  if (!normalized.trim()) return null;

  if (
    normalized.includes('mimo') ||
    normalized.includes('chiquead') ||
    normalized.includes('consentid') ||
    normalized.includes('apapacho')
  ) {
    return 'mimitos';
  }
  if (
    normalized.includes('emocionad') ||
    normalized.includes('🤩') ||
    normalized.includes('increible') ||
    normalized.includes('genial')
  ) {
    return 'emocionado';
  }
  if (
    normalized.includes('agradecid') ||
    normalized.includes('bendecid') ||
    normalized.includes('🙏') ||
    normalized.includes('gracias')
  ) {
    return 'agradecido';
  }
  if (
    normalized.includes('antoj') ||
    normalized.includes('hambre') ||
    normalized.includes('😋') ||
    normalized.includes('comer') ||
    normalized.includes('pizza') ||
    normalized.includes('postre')
  ) {
    return 'antojo';
  }
  if (
    normalized.includes('sueño') ||
    normalized.includes('sueno') ||
    normalized.includes('🥱') ||
    normalized.includes('mimir') ||
    normalized.includes('dormir') ||
    normalized.includes('sueñito')
  ) {
    return 'sueno';
  }
  if (
    normalized.includes('estres') ||
    normalized.includes('abrumad') ||
    normalized.includes('pesad') ||
    normalized.includes('😵‍💫') ||
    normalized.includes('agobiad')
  ) {
    return 'estresado';
  }
  if (
    normalized.includes('triste') ||
    normalized.includes('🥺') ||
    normalized.includes('😢') ||
    normalized.includes('😭')
  ) {
    return 'triste';
  }
  if (
    normalized.includes('cansad') ||
    normalized.includes('😴') ||
    normalized.includes('flojera') ||
    normalized.includes('agotad')
  ) {
    return 'cansado';
  }
  if (
    normalized.includes('enamorad') ||
    normalized.includes('🥰') ||
    normalized.includes('😍') ||
    normalized.includes('❤️') ||
    normalized.includes('amor')
  ) {
    return 'enamorado';
  }
  if (
    normalized.includes('enojado') ||
    normalized.includes('enojada') ||
    normalized.includes('molest') ||
    normalized.includes('😤') ||
    normalized.includes('😡') ||
    normalized.includes('😠') ||
    normalized.includes('coraje')
  ) {
    return 'enojado';
  }
  if (
    normalized.includes('divertido') ||
    normalized.includes('divertida') ||
    normalized.includes('juguet') ||
    normalized.includes('😜') ||
    normalized.includes('🤪') ||
    normalized.includes('😎') ||
    normalized.includes('broma')
  ) {
    return 'divertido';
  }
  if (
    normalized.includes('tranquil') ||
    normalized.includes('paz') ||
    normalized.includes('😌') ||
    normalized.includes('🌸') ||
    normalized.includes('relajad')
  ) {
    return 'tranquilo';
  }
  if (normalized.includes('feliz') || normalized.includes('😊') || normalized.includes('radiante')) {
    return 'feliz';
  }
  return null;
}

/**
 * Infiere el tipo de sentimiento a partir del ID explícito o texto/emoji previo
 */
export function resolveFeelingType(feeling?: string, emoji?: string, status?: string): MoodFeelingType {
  const cleanFeeling = (feeling || '').trim().toLowerCase() as MoodFeelingType;
  if (VALID_FEELING_TYPES.has(cleanFeeling)) {
    return cleanFeeling;
  }

  return (
    matchFeelingFromText(`${feeling || ''} ${emoji || ''}`) ||
    matchFeelingFromText(status || '') ||
    'feliz'
  );
}

const THEME_MAP: Record<
  MoodFeelingType,
  { bg: string; border: string; earInner: string; snoutBg: string; cheek: string }
> = {
  enamorado: { bg: '#fff1f2', border: '#fb7185', earInner: '#fecdd3', snoutBg: '#ffffff', cheek: '#fda4af' },
  mimitos: { bg: '#fdf2f8', border: '#f472b6', earInner: '#fbcfe8', snoutBg: '#ffffff', cheek: '#f9a8d4' },
  feliz: { bg: '#fefce8', border: '#eab308', earInner: '#fef08a', snoutBg: '#ffffff', cheek: '#fca5a5' },
  emocionado: { bg: '#fffbeb', border: '#f59e0b', earInner: '#fde68a', snoutBg: '#ffffff', cheek: '#fdba74' },
  tranquilo: { bg: '#f0fdf4', border: '#34d399', earInner: '#bbf7d0', snoutBg: '#ffffff', cheek: '#fca5a5' },
  divertido: { bg: '#faf5ff', border: '#a855f7', earInner: '#e9d5ff', snoutBg: '#ffffff', cheek: '#f9a8d4' },
  agradecido: { bg: '#ecfeff', border: '#22d3ee', earInner: '#cffafe', snoutBg: '#ffffff', cheek: '#fda4af' },
  antojo: { bg: '#fff7ed', border: '#fb923c', earInner: '#fed7aa', snoutBg: '#ffffff', cheek: '#fda4af' },
  sueno: { bg: '#eef2ff', border: '#818cf8', earInner: '#c7d2fe', snoutBg: '#ffffff', cheek: '#c4b5fd' },
  cansado: { bg: '#f8fafc', border: '#94a3b8', earInner: '#e2e8f0', snoutBg: '#ffffff', cheek: '#cbd5e1' },
  estresado: { bg: '#fff7ed', border: '#ea580c', earInner: '#fed7aa', snoutBg: '#ffffff', cheek: '#fdba74' },
  triste: { bg: '#f0f9ff', border: '#38bdf8', earInner: '#bae6fd', snoutBg: '#ffffff', cheek: '#93c5fd' },
  enojado: { bg: '#fef2f2', border: '#ef4444', earInner: '#fecaca', snoutBg: '#ffffff', cheek: '#f87171' },
};

/**
 * Componente MoodMascot 100% vectorial en SVG (Osito Mochi Kawaii)
 * con expresiones nítidas sin emojis del sistema ni desalineaciones.
 */
export const MoodMascot: React.FC<MoodMascotProps> = ({
  feeling,
  emoji,
  size = 'md',
  accessory,
}) => {
  const feelingType = resolveFeelingType(feeling, emoji);
  const theme = THEME_MAP[feelingType] || THEME_MAP.feliz;

  const boxSize = size === 'sm' ? 46 : size === 'lg' ? 88 : 58;
  const noseColor =
    feelingType === 'enamorado' || feelingType === 'mimitos'
      ? '#e11d48'
      : feelingType === 'triste'
      ? '#475569'
      : '#573623';

  return (
    <View style={[styles.container, { width: boxSize, height: boxSize }]}>
      <Svg width={boxSize} height={boxSize} viewBox="0 -10 80 84">
        {/* Sombra suave bajo la carita */}
        <Ellipse cx="40" cy="65" rx="21" ry="4" fill="#0f172a" opacity="0.07" />

        {/* Orejitas redondas */}
        <Circle cx="19" cy="17" r="9.5" fill={theme.bg} stroke={theme.border} strokeWidth="2.2" />
        <Circle cx="19" cy="17" r="5" fill={theme.earInner} />
        <Circle cx="61" cy="17" r="9.5" fill={theme.bg} stroke={theme.border} strokeWidth="2.2" />
        <Circle cx="61" cy="17" r="5" fill={theme.earInner} />

        {/* Cabeza redondeada */}
        <Ellipse cx="40" cy="37" rx="28" ry="25" fill={theme.bg} stroke={theme.border} strokeWidth="2.4" />
        {/* Brillo sutil superior */}
        <Ellipse cx="34" cy="19" rx="12" ry="3.5" fill="#ffffff" opacity="0.55" />

        {/* Mejillas sonrojadas */}
        <Ellipse cx="20" cy="41.5" rx="5.2" ry="3" fill={theme.cheek} opacity="0.55" />
        <Ellipse cx="60" cy="41.5" rx="5.2" ry="3" fill={theme.cheek} opacity="0.55" />

        {/* Hociquito */}
        <Ellipse cx="40" cy="45" rx="11.5" ry="8.5" fill={theme.snoutBg} stroke="#e2e8f0" strokeWidth="1.2" />
        {/* Naricita */}
        <Ellipse cx="40" cy="41.2" rx="3.4" ry="2.2" fill={noseColor} />

        {/* ==================== OJOS VECTORIALES ==================== */}
        {feelingType === 'enamorado' && (
          <G>
            {/* Corazón ojo izquierdo */}
            <Path
              d="M 28 34.5 C 28 34.5 22.5 31 22.5 27.5 C 22.5 25.5 24.2 24.3 25.9 24.3 C 27.1 24.3 27.8 25.1 28 25.8 C 28.2 25.1 28.9 24.3 30.1 24.3 C 31.8 24.3 33.5 25.5 33.5 27.5 C 33.5 31 28 34.5 28 34.5 Z"
              fill="#f43f5e"
            />
            <Circle cx="25.5" cy="27" r="1.1" fill="#ffffff" opacity="0.85" />
            {/* Corazón ojo derecho */}
            <Path
              d="M 52 34.5 C 52 34.5 46.5 31 46.5 27.5 C 46.5 25.5 48.2 24.3 49.9 24.3 C 51.1 24.3 51.8 25.1 52 25.8 C 52.2 25.1 52.9 24.3 54.1 24.3 C 55.8 24.3 57.5 25.5 57.5 27.5 C 57.5 31 52 34.5 52 34.5 Z"
              fill="#f43f5e"
            />
            <Circle cx="49.5" cy="27" r="1.1" fill="#ffffff" opacity="0.85" />
          </G>
        )}

        {feelingType === 'mimitos' && (
          <G>
            {/* Ojitos suplicantes grandes con doble brillo */}
            <Circle cx="28" cy="30" r="5.2" fill="#0f172a" />
            <Circle cx="26.2" cy="28.2" r="2" fill="#ffffff" />
            <Circle cx="29.8" cy="32" r="1" fill="#ffffff" opacity="0.85" />
            <Circle cx="52" cy="30" r="5.2" fill="#0f172a" />
            <Circle cx="50.2" cy="28.2" r="2" fill="#ffffff" />
            <Circle cx="53.8" cy="32" r="1" fill="#ffffff" opacity="0.85" />
            {/* Cejas tiernas levantadas */}
            <Path d="M 23 23.5 Q 27 21.5 31 23" stroke="#9f1239" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <Path d="M 49 23 Q 53 21.5 57 23.5" stroke="#9f1239" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </G>
        )}

        {(feelingType === 'feliz' || feelingType === 'agradecido') && (
          <G>
            <Path
              d="M 23.5 31.5 Q 28 25.5 32.5 31.5"
              stroke={feelingType === 'agradecido' ? '#0284c7' : '#1e293b'}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 47.5 31.5 Q 52 25.5 56.5 31.5"
              stroke={feelingType === 'agradecido' ? '#0284c7' : '#1e293b'}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}

        {feelingType === 'emocionado' && (
          <G>
            {/* Ojos estrella 4 puntas dorados */}
            <Path
              d="M 28 23.5 L 29.7 28.3 L 34.5 30 L 29.7 31.7 L 28 36.5 L 26.3 31.7 L 21.5 30 L 26.3 28.3 Z"
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <Circle cx="28" cy="30" r="1.3" fill="#ffffff" />
            <Path
              d="M 52 23.5 L 53.7 28.3 L 58.5 30 L 53.7 31.7 L 52 36.5 L 50.3 31.7 L 45.5 30 L 50.3 28.3 Z"
              fill="#f59e0b"
              stroke="#b45309"
              strokeWidth="0.9"
              strokeLinejoin="round"
            />
            <Circle cx="52" cy="30" r="1.3" fill="#ffffff" />
          </G>
        )}

        {(feelingType === 'tranquilo' || feelingType === 'sueno') && (
          <G>
            <Path
              d="M 23.5 29.5 Q 28 34 32.5 29.5"
              stroke={feelingType === 'sueno' ? '#4f46e5' : '#059669'}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
            <Path
              d="M 47.5 29.5 Q 52 34 56.5 29.5"
              stroke={feelingType === 'sueno' ? '#4f46e5' : '#059669'}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
          </G>
        )}

        {feelingType === 'divertido' && (
          <G>
            {/* Guiño vectorial izquierdo */}
            <Path d="M 24 27 L 31.5 30 L 24 33" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Ojo redondo derecho */}
            <Circle cx="52" cy="30" r="4.2" fill="#1e293b" />
            <Circle cx="50.7" cy="28.6" r="1.5" fill="#ffffff" />
          </G>
        )}

        {feelingType === 'antojo' && (
          <G>
            <Path d="M 23.5 31.5 Q 28 26 32.5 31.5" stroke="#c2410c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <Circle cx="52" cy="30" r="4" fill="#1e293b" />
            <Circle cx="50.8" cy="28.7" r="1.4" fill="#ffffff" />
          </G>
        )}

        {feelingType === 'cansado' && (
          <G>
            <Line x1="23.5" y1="30.5" x2="32.5" y2="30.5" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
            <Line x1="47.5" y1="30.5" x2="56.5" y2="30.5" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
            <Path d="M 23 26.5 L 31.5 25" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            <Path d="M 57 26.5 L 48.5 25" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
          </G>
        )}

        {feelingType === 'estresado' && (
          <G>
            {/* Espirales / ojos mareados */}
            <Circle cx="28" cy="30" r="4.8" fill="none" stroke="#c2410c" strokeWidth="1.6" />
            <Circle cx="28" cy="30" r="2" fill="#c2410c" />
            <Circle cx="52" cy="30" r="4.8" fill="none" stroke="#c2410c" strokeWidth="1.6" />
            <Circle cx="52" cy="30" r="2" fill="#c2410c" />
          </G>
        )}

        {feelingType === 'triste' && (
          <G>
            <Circle cx="28" cy="30.5" r="4.4" fill="#0f172a" />
            <Circle cx="26.7" cy="29" r="1.6" fill="#ffffff" />
            <Circle cx="52" cy="30.5" r="4.4" fill="#0f172a" />
            <Circle cx="50.7" cy="29" r="1.6" fill="#ffffff" />
            {/* Cejas caídas */}
            <Path d="M 22.5 25.5 L 31.5 23.5" stroke="#0369a1" strokeWidth="1.7" strokeLinecap="round" />
            <Path d="M 57.5 25.5 L 48.5 23.5" stroke="#0369a1" strokeWidth="1.7" strokeLinecap="round" />
            {/* Lagrimita cristalina */}
            <Path
              d="M 23 34 C 21 37 21 39.5 23 39.5 C 25 39.5 25 37 23 34 Z"
              fill="#38bdf8"
              stroke="#0284c7"
              strokeWidth="0.9"
            />
          </G>
        )}

        {feelingType === 'enojado' && (
          <G>
            <Circle cx="28" cy="31" r="4" fill="#1e293b" />
            <Circle cx="27" cy="29.8" r="1.2" fill="#ffffff" />
            <Circle cx="52" cy="31" r="4" fill="#1e293b" />
            <Circle cx="51" cy="29.8" r="1.2" fill="#ffffff" />
            {/* Cejas fruncidas */}
            <Path d="M 22.5 24 L 33 27.5" stroke="#b91c1c" strokeWidth="2.3" strokeLinecap="round" />
            <Path d="M 57.5 24 L 47 27.5" stroke="#b91c1c" strokeWidth="2.3" strokeLinecap="round" />
          </G>
        )}

        {/* ==================== BOQUITAS VECTORIALES ==================== */}
        {feelingType === 'feliz' && (
          <G>
            <Path d="M 34.5 45.5 Q 40 52 45.5 45.5 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
            <Ellipse cx="40" cy="48.5" rx="3" ry="1.6" fill="#fb7185" />
          </G>
        )}

        {(feelingType === 'enamorado' || feelingType === 'tranquilo' || feelingType === 'agradecido') && (
          <Path d="M 35.5 46 Q 40 49.5 44.5 46" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}

        {feelingType === 'mimitos' && (
          <Path d="M 36.5 47.5 Q 40 45 43.5 47.5" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}

        {feelingType === 'emocionado' && (
          <G>
            <Path d="M 33.5 45 Q 40 53 46.5 45 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
            <Ellipse cx="40" cy="48.8" rx="3.4" ry="1.7" fill="#fda4af" />
          </G>
        )}

        {(feelingType === 'divertido' || feelingType === 'antojo') && (
          <G>
            <Path d="M 35.5 45.5 Q 40 49 44.5 45.5" stroke="#1e293b" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <Path
              d="M 40.5 46.8 L 40.5 50.2 C 40.5 51.8 44 51.8 44 50.2 L 44 46.4 Z"
              fill="#f43f5e"
              stroke="#be1239"
              strokeWidth="0.9"
            />
          </G>
        )}

        {feelingType === 'sueno' && (
          <Ellipse cx="40" cy="47.5" rx="3" ry="3.4" fill="#fda4af" stroke="#4f46e5" strokeWidth="1.3" />
        )}

        {feelingType === 'cansado' && (
          <Line x1="36.5" y1="47" x2="43.5" y2="47" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" />
        )}

        {feelingType === 'estresado' && (
          <Path d="M 34.5 47 Q 37.2 45 40 47 Q 42.8 49 45.5 47" stroke="#9a3412" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}

        {feelingType === 'triste' && (
          <Path d="M 35.5 48.5 Q 40 44.5 44.5 48.5" stroke="#1e293b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}

        {feelingType === 'enojado' && (
          <Path d="M 35.5 48 Q 40 45 44.5 48" stroke="#991b1b" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* ==================== DETALLES VECTORIALES POR EMOCIÓN ==================== */}
        {feelingType === 'enamorado' && (
          <Path
            d="M 70 15 C 70 15 65.5 11.8 65.5 9 C 65.5 7.4 66.8 6.4 68.2 6.4 C 69.2 6.4 69.8 7 70 7.6 C 70.2 7 70.8 6.4 71.8 6.4 C 73.2 6.4 74.5 7.4 74.5 9 C 74.5 11.8 70 15 70 15 Z"
            fill="#f43f5e"
            stroke="#ffffff"
            strokeWidth="1"
          />
        )}

        {feelingType === 'emocionado' && (
          <Path
            d="M 70 4 L 71.3 7.7 L 75 9 L 71.3 10.3 L 70 14 L 68.7 10.3 L 65 9 L 68.7 7.7 Z"
            fill="#facc15"
            stroke="#d97706"
            strokeWidth="0.8"
          />
        )}

        {(feelingType === 'sueno' || feelingType === 'cansado') && (
          <G>
            <SvgText
              x="64"
              y="12"
              fill={feelingType === 'sueno' ? '#4f46e5' : '#64748b'}
              fontSize="9"
              fontWeight="900"
            >
              zZ
            </SvgText>
          </G>
        )}

        {feelingType === 'estresado' && (
          <Path
            d="M 70 8 C 67.5 12 67.5 15 70 15 C 72.5 15 72.5 12 70 8 Z"
            fill="#38bdf8"
            stroke="#0284c7"
            strokeWidth="0.9"
          />
        )}

        {feelingType === 'enojado' && (
          <G stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" fill="none">
            <Path d="M 65 8 Q 68 8 68 5" />
            <Path d="M 73 8 Q 70 8 70 5" />
            <Path d="M 65 13 Q 68 13 68 16" />
            <Path d="M 73 13 Q 70 13 70 16" />
          </G>
        )}

        {/* ==================== ACCESORIOS VECTORIALES ==================== */}
        {accessory === 'crown' && (
          <G>
            <Path
              d="M 27 9 L 25 -2 L 34 3 L 40 -5 L 46 3 L 55 -2 L 53 9 Q 40 11.5 27 9 Z"
              fill="#facc15"
              stroke="#92400e"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <Path d="M 27.5 7.5 Q 40 9.5 52.5 7.5" stroke="#e11d48" strokeWidth="2.2" fill="none" />
            <Circle cx="40" cy="4" r="2" fill="#f43f5e" />
            <Circle cx="25" cy="-2" r="1.8" fill="#fef08a" stroke="#92400e" strokeWidth="1" />
            <Circle cx="40" cy="-5" r="2" fill="#fef08a" stroke="#92400e" strokeWidth="1" />
            <Circle cx="55" cy="-2" r="1.8" fill="#fef08a" stroke="#92400e" strokeWidth="1" />
          </G>
        )}

        {accessory === 'party_hat' && (
          <G transform="rotate(6 40 8)">
            <Path
              d="M 31 9 L 40 -8 L 49 9 Q 40 11 31 9 Z"
              fill="#ec4899"
              stroke="#831843"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <Path d="M 34 4 L 45 1.5" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
            <Path d="M 36.5 -1 L 43 -2.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
            <Circle cx="40" cy="-8.5" r="3" fill="#fde047" stroke="#831843" strokeWidth="1.2" />
          </G>
        )}

        {accessory === 'flower' && (
          <G>
            <Ellipse cx="57" cy="11" rx="4.2" ry="2.2" fill="#34d399" stroke="#047857" strokeWidth="1" transform="rotate(-20 57 11)" />
            <Circle cx="62" cy="3" r="3.8" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
            <Circle cx="67.5" cy="7" r="3.8" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.1" />
            <Circle cx="65.5" cy="13" r="3.8" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
            <Circle cx="58.5" cy="13" r="3.8" fill="#fbcfe8" stroke="#be185d" strokeWidth="1.1" />
            <Circle cx="56.5" cy="7" r="3.8" fill="#f9a8d4" stroke="#be185d" strokeWidth="1.1" />
            <Circle cx="62" cy="8.5" r="3.2" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
          </G>
        )}

        {accessory === 'sunglasses' && (
          <G>
            <Path d="M 10 27 L 18 27" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <Path d="M 62 27 L 70 27" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
            <Path d="M 35 28 Q 40 26.5 45 28" stroke="#1e293b" strokeWidth="2.2" fill="none" />
            <Rect x="17.5" y="23.5" width="18" height="11.5" rx="4.5" fill="#0f172a" stroke="#1e293b" strokeWidth="1.8" />
            <Path d="M 21 26 L 24.5 32.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
            <Rect x="44.5" y="23.5" width="18" height="11.5" rx="4.5" fill="#0f172a" stroke="#1e293b" strokeWidth="1.8" />
            <Path d="M 48 26 L 51.5 32.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
          </G>
        )}

        {accessory === 'bow' && (
          <G transform="rotate(-16 18 9)">
            <Path d="M 18 9 C 11 3, 7 6, 8 10 C 9 14, 13 14, 18 10 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.3" />
            <Path d="M 19 9 C 26 3, 30 6, 29 10 C 28 14, 24 14, 19 10 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.3" />
            <Circle cx="18.5" cy="9.5" r="3" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.3" />
          </G>
        )}

        {accessory === 'beret' && (
          <G transform="rotate(-12 36 8)">
            <Path d="M 21 9 C 20 1, 31 -1, 41 0 C 50 1, 54 5, 52 9 Q 36 12 21 9 Z" fill="#be123c" stroke="#881337" strokeWidth="1.5" />
            <Path d="M 23 9 Q 37 11.5 50 9" stroke="#4c0519" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </G>
        )}

        {accessory === 'headphones' && (
          <G>
            <Path d="M 6 28 C 6 4, 74 4, 74 28" fill="none" stroke="#334155" strokeWidth="3.5" strokeLinecap="round" />
            <Rect x="2" y="22" width="8" height="16" rx="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
            <Rect x="70" y="22" width="8" height="16" rx="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
          </G>
        )}

        {accessory === 'halo' && (
          <G>
            <Ellipse cx="40" cy="-2" rx="14" ry="4" fill="none" stroke="#fef08a" strokeWidth="4.5" opacity="0.45" />
            <Ellipse cx="40" cy="-2" rx="13" ry="3.5" fill="none" stroke="#facc15" strokeWidth="2.4" />
          </G>
        )}

        {accessory === 'wizard' && (
          <G>
            <Path d="M 18 10 Q 40 14 62 10 Q 54 6 40 6 Q 26 6 18 10 Z" fill="#4338ca" stroke="#1e1b4b" strokeWidth="1.5" />
            <Path d="M 28 8 L 38 -8 Q 42 -10 46 -5 L 44 -3 L 52 8 Q 40 10 28 8 Z" fill="#4338ca" stroke="#1e1b4b" strokeWidth="1.5" />
            <Path d="M 29 6.5 Q 40 8.5 51 6.5" stroke="#facc15" strokeWidth="2.2" fill="none" />
          </G>
        )}

        {accessory === 'scarf' && (
          <G>
            <Path d="M 46 61 L 54 61 L 56 72 L 47 72 Z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.3" />
            <Path d="M 18 57 Q 40 65 62 57 C 65 59, 65 65, 60 66 Q 40 72 20 66 C 15 65, 15 59, 18 57 Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.4" />
          </G>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});

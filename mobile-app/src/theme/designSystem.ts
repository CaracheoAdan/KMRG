import { Platform, TextStyle, ViewStyle } from 'react-native';

export const FONTS = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'Georgia, serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const COLORS = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSubtle: '#f1f5f9',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  danger: '#e11d48',
  dangerLight: '#fff1f2',
  success: '#059669',
  successLight: '#d1fae5',
  warning: '#d97706',
  warningLight: '#fef3c7',
  karlaAccent: '#9333ea',
  karlaLight: '#f3e8ff',
  javierAccent: '#0284c7',
  javierLight: '#e0f2fe',
};

// ================= SISTEMA DE DISEÑO KMRG =================
// Espaciado base de 8px
export const SPACING = { xs: 8, sm: 16, md: 24, lg: 32 } as const;

// Radios de borde consistentes
export const RADII = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

// Escala tipográfica fija: serif solo para títulos, sans para texto y UI
export const TYPE_SCALE = {
  title: { fontSize: 24, lineHeight: 30, fontFamily: FONTS.serif, fontWeight: '800' as const },
  subtitle: { fontSize: 16, lineHeight: 22, fontFamily: FONTS.serif, fontWeight: '700' as const },
  body: { fontSize: 14, lineHeight: 20, fontFamily: FONTS.sans, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: FONTS.sans, fontWeight: '600' as const },
} as const;

// Área táctil mínima recomendada
export const MIN_TOUCH = 44;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hexA: string, hexB: string, t: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export interface ThemePalette {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryOn: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  paper: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  danger: string;
  warning: string;
  success: string;
  shadow: string;
  isDark: boolean;
}

/**
 * Construye todos los tokens del tema a partir del color primario elegido por el usuario.
 * Ningún color de marca se hardcodea: todo se deriva de la paleta seleccionada.
 */
export function buildPalette(primary: string, isDark: boolean): ThemePalette {
  const dark = isDark;
  return {
    primary,
    primaryLight: dark ? mix('#111111', primary, 0.28) : mix('#ffffff', primary, 0.12),
    primaryDark: mix(primary, '#000000', 0.25),
    primaryOn: '#ffffff',
    background: dark ? mix('#0b0b0f', primary, 0.06) : mix('#fffaf7', primary, 0.04),
    surface: dark ? mix('#16161c', primary, 0.07) : '#ffffff',
    surfaceAlt: dark ? mix('#1f1f27', primary, 0.1) : mix('#ffffff', primary, 0.06),
    paper: dark ? mix('#23201d', primary, 0.08) : '#fffdf6',
    border: dark ? mix('#2a2a33', primary, 0.12) : mix('#ffffff', primary, 0.14),
    text: dark ? '#f5f3f0' : mix('#1c1917', primary, 0.12),
    textSecondary: dark ? '#c9c4be' : '#57534e',
    textMuted: dark ? '#8b867f' : '#8d867f',
    danger: dark ? '#fb7185' : '#e11d48',
    warning: dark ? '#fbbf24' : '#d97706',
    success: dark ? '#34d399' : '#059669',
    shadow: dark ? '#000000' : mix('#1c1917', primary, 0.4),
    isDark: dark,
  };
}

export const SHADOWS: Record<'sm' | 'md' | 'lg', ViewStyle> = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
};

export const TYPOGRAPHY: Record<string, TextStyle> = {
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    letterSpacing: 2.5,
    color: COLORS.textPrimary,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    color: COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    color: COLORS.textPrimary,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
};

/**
 * Sanitiza entradas de texto de usuario para prevenir inyección de caracteres
 * de control y limitar longitudes excesivas en cargas útiles de red.
 */
export function sanitizeInput(text: string, maxLength = 500): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

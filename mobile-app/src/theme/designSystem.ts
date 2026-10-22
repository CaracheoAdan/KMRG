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

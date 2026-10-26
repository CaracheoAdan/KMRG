import { Platform, Vibration } from 'react-native';

let ExpoHaptics: typeof import('expo-haptics') | null = null;
try {
  ExpoHaptics = require('expo-haptics');
} catch {
  ExpoHaptics = null;
}

export const GAMES_THEME = {
  colors: {
    // Fondo de pantalla consistente para todos los juegos (Romántico Suave)
    screenLightBg: '#fff5f7',
    screenGradient: ['#fff1f2', '#fdf2f8', '#faf5ff'] as const,
    cardBg: '#ffffff',
    subtleBorder: 'rgba(244, 63, 94, 0.18)',
    textPrimary: '#0f172a',
    textSecondary: '#64748b',

    // Acentos de Pareja
    karla: {
      primary: '#ec4899',
      secondary: '#9333ea',
      bg: '#fdf2f8',
      border: '#f472b6',
      text: '#be185d',
      glow: 'rgba(236, 72, 153, 0.35)',
      gradient: ['#f472b6', '#db2777'] as const,
    },
    javier: {
      primary: '#0ea5e9',
      secondary: '#2563eb',
      bg: '#f0f9ff',
      border: '#38bdf8',
      text: '#0369a1',
      glow: 'rgba(14, 165, 233, 0.35)',
      gradient: ['#38bdf8', '#0284c7'] as const,
    },

    // Acentos Globales
    coral: '#f43f5e',
    rose: '#fb7185',
    purple: '#8b5cf6',
    violet: '#a855f7',
    ocean: '#0ea5e9',
    deepNavy: '#0f172a',
    emerald: '#10b981',
    amber: '#f59e0b',
    gold: '#fbbf24',

    // Fondos & Glassmorphism
    darkSurface: '#0f172a',
    darkSurfaceAlt: '#1e293b',
    darkBorder: 'rgba(255, 255, 255, 0.12)',
    lightSurface: '#ffffff',
    lightSurfaceAlt: '#f8fafc',
    lightBorder: '#e2e8f0',

    // Tableros Temáticos (Contenidos como piezas de arte)
    oceanDeep: ['#082f49', '#0c4a6e', '#075985'] as const,
    woodDark: ['#451a03', '#78350f', '#92400e'] as const,
    woodLightSquare: '#fef3c7',
    woodDarkSquare: '#b45309',
    neonCard: ['#1e1b4b', '#312e81', '#1e1b4b'] as const,
  },

  // Escala Estricta de Espaciado (4, 8, 12, 16, 24, 32)
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  gradients: {
    primaryBtn: ['#f43f5e', '#e11d48'] as const,
    secondaryBtn: ['#8b5cf6', '#6d28d9'] as const,
    cyanBtn: ['#06b6d4', '#0284c7'] as const,
    goldBtn: ['#fbbf24', '#f59e0b'] as const,
    cardGlassLight: ['rgba(255, 255, 255, 0.98)', 'rgba(253, 242, 248, 0.92)'] as const,
    cardGlassDark: ['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.92)'] as const,
    tictactoeNeon: ['#1e1b4b', '#2e1065'] as const,
    headerGlow: ['rgba(244, 63, 94, 0.12)', 'rgba(139, 92, 246, 0.05)'] as const,
  },

  shadows: {
    soft: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
    boardDepth: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
      elevation: 8,
    },
    glowCoral: {
      shadowColor: '#f43f5e',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    glowPurple: {
      shadowColor: '#8b5cf6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
    glowCyan: {
      shadowColor: '#06b6d4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
      elevation: 6,
    },
  },

  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    pill: 999,
  },

  fonts: {
    display: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
    ui: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'sans-serif',
    }),
  },
};

/**
 * Disparador de respuesta háptica protegida (100% segura en Web, Expo Go y Nativos)
 */
export const triggerGameHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
) => {
  try {
    if (ExpoHaptics) {
      switch (type) {
        case 'light':
          await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'selection':
          await ExpoHaptics.selectionAsync();
          break;
        case 'success':
          await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error);
          break;
      }
    } else if (Platform.OS !== 'web') {
      Vibration.vibrate(type === 'error' ? 80 : 30);
    }
  } catch {
    // Silently continue if hardware haptics unavailable
  }
};

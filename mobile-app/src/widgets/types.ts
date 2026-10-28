export interface KmrgWidgetData {
  daysTogether: number;
  anniversaryDate?: string;
  noteText: string;
  noteSender: string;
  hasNewHeart: boolean;
  heartSender?: string;
  heartTimestamp?: number;
  nextEventTitle?: string;
  nextEventDate?: string;
  accentColor?: string;
  streakActive?: boolean;
}

export const DEFAULT_WIDGET_DATA: KmrgWidgetData = {
  daysTogether: 0,
  anniversaryDate: '2024-02-14',
  noteText: '',
  noteSender: '',
  hasNewHeart: false,
  heartSender: '',
  heartTimestamp: 0,
  nextEventTitle: '',
  nextEventDate: '',
  accentColor: '#9333ea', // Morado Karlita por defecto
  streakActive: false,
};

export function computeTimeTogether(anniversaryDate?: string, fallbackDays = 0) {
  let totalDays = fallbackDays;
  let years = 0;
  let months = 0;
  let days = 0;

  if (anniversaryDate && anniversaryDate.trim()) {
    try {
      const parts = anniversaryDate.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - start.getTime());
        totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        years = now.getFullYear() - start.getFullYear();
        months = now.getMonth() - start.getMonth();
        days = now.getDate() - start.getDate();

        if (days < 0) {
          const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
          days += prevMonthLastDay;
          months -= 1;
        }

        if (months < 0) {
          months += 12;
          years -= 1;
        }
        years = Math.max(0, years);
        months = Math.max(0, months);
        days = Math.max(0, days);
      }
    } catch {
      totalDays = fallbackDays;
    }
  }

  if (years === 0 && months === 0 && days === 0 && totalDays > 0) {
    years = Math.floor(totalDays / 365);
    months = Math.floor((totalDays % 365) / 30);
    days = (totalDays % 365) % 30;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);

  const breakdown = parts.slice(0, 2).join(' · ');

  return { totalDays, breakdown };
}

export function formatNextEvent(eventTitle?: string, eventDate?: string): { text: string; hasEvent: boolean } {
  if (!eventDate || !eventDate.trim()) {
    return { text: 'Sin citas programadas', hasEvent: false };
  }
  const parts = eventDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { text: 'Sin citas programadas', hasEvent: false };
  }
  const target = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  if (isNaN(target.getTime())) {
    return { text: 'Sin citas programadas', hasEvent: false };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dateStr = `${parts[2]} ${monthNames[parts[1] - 1] || ''}`.trim();

  const title = eventTitle?.trim() || 'Cita especial';
  if (diffDays === 0) {
    return { text: `¡Hoy! ${title}`, hasEvent: true };
  } else if (diffDays === 1) {
    return { text: `Mañana: ${title}`, hasEvent: true };
  } else if (diffDays > 1) {
    return { text: `${dateStr} · ${title}`, hasEvent: true };
  } else {
    return { text: 'Sin citas programadas', hasEvent: false };
  }
}

/**
 * Hitos de racha / días juntos: 50, 100, 150, 200, 365 y cada 100 después.
 */
export function isMilestone(totalDays: number): boolean {
  if (totalDays <= 0) return false;
  if ([50, 100, 150, 200, 365].includes(totalDays)) return true;
  if (totalDays > 365 && totalDays % 100 === 0) return true;
  return false;
}

export interface WidgetPalette {
  accentHex: `#${string}`;
  bgDark: `#${string}`;
  beamFrom: `#${string}`;
  beamTo: `#${string}`;
  accentLight: `#${string}`;
  cardBg: `rgba(${number}, ${number}, ${number}, ${number})`;
  cardBorder: `rgba(${number}, ${number}, ${number}, ${number})`;
  chipBg: `rgba(${number}, ${number}, ${number}, ${number})`;
  chipBorder: `rgba(${number}, ${number}, ${number}, ${number})`;
  textPrimary: '#ffffff';
  textSecondary: `rgba(${number}, ${number}, ${number}, ${number})`;
  flameActive: '#f59e0b';
  flameInactive: '#6b5b7b';
}

function parseHex(raw?: string): { r: number; g: number; b: number; hex: `#${string}` } {
  // Morado Karlita oficial por defecto (#9333ea)
  const fallback = { r: 147, g: 51, b: 234, hex: '#9333ea' as `#${string}` };
  if (!raw || typeof raw !== 'string') return fallback;
  const clean = raw.replace('#', '').trim();
  if (clean.length !== 3 && clean.length !== 6) return fallback;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return fallback;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
    hex: `#${full.toLowerCase()}` as `#${string}`,
  };
}

function toHex(r: number, g: number, b: number): `#${string}` {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const h = (n: number) => clamp(n).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Deriva la paleta para widgets estilo racha Duolingo partiendo del color de acento activo.
 */
export function getWidgetPalette(accentColor?: string): WidgetPalette {
  const { r, g, b, hex } = parseHex(accentColor);

  // Fondo base muy oscuro (estilo noche Duolingo enriquecido con el matiz del acento)
  const bgDark = toHex(r * 0.16 + 8, g * 0.16 + 8, b * 0.16 + 8);

  // Haz de luz cónico desde arriba (versión luminosa del acento)
  const beamFrom = toHex(r * 0.48 + 36, g * 0.48 + 36, b * 0.48 + 36);
  const beamTo = bgDark;

  // Versión muy clara para chips y textos secundarios
  const accentLight = toHex(r + (255 - r) * 0.7, g + (255 - g) * 0.7, b + (255 - b) * 0.7);

  return {
    accentHex: hex,
    bgDark,
    beamFrom,
    beamTo,
    accentLight,
    cardBg: 'rgba(255, 255, 255, 0.12)',
    cardBorder: 'rgba(255, 255, 255, 0.18)',
    chipBg: 'rgba(255, 255, 255, 0.16)',
    chipBorder: 'rgba(255, 255, 255, 0.28)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.70)',
    flameActive: '#f59e0b',
    flameInactive: '#6b5b7b',
  };
}

/**
 * Icono de llama vectorial Duolingo:
 * Encendida en ámbar brillante (#f59e0b / #fef08a) si hay racha hoy; apagada en gris violáceo si no.
 */
export function getFlameSvg(active: boolean, size = 24): string {
  if (active) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">
      <path d="M12 2C10.5 4.5 10 6.5 10.5 8C8.5 8.5 7 10.5 7 13C7 16.87 10.13 20 14 20C17.87 20 21 16.87 21 13C21 9.5 18 6.5 15.5 5C15.5 6.5 14.5 7.5 13.5 7.5C13.5 5.5 12.8 3.5 12 2Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M13.5 11C12.5 12.5 12 14 13 15C13 16.66 14.34 18 16 18C17.66 18 19 16.66 19 15C19 13.5 17.5 12 16.5 11.5C16.5 12.2 16 12.8 15.2 12.8C15.2 12 14.5 11.5 13.5 11Z" fill="#FEF08A"/>
    </svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24">
    <path d="M12 2C10.5 4.5 10 6.5 10.5 8C8.5 8.5 7 10.5 7 13C7 16.87 10.13 20 14 20C17.87 20 21 16.87 21 13C21 9.5 18 6.5 15.5 5C15.5 6.5 14.5 7.5 13.5 7.5C13.5 5.5 12.8 3.5 12 2Z" fill="#4B3D52" stroke="#372C3D" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M13.5 11C12.5 12.5 12 14 13 15C13 16.66 14.34 18 16 18C17.66 18 19 16.66 19 15C19 13.5 17.5 12 16.5 11.5C16.5 12.2 16 12.8 15.2 12.8C15.2 12 14.5 11.5 13.5 11Z" fill="#6B5B7B"/>
  </svg>`;
}

/**
 * Pochito (mascota original de KMRG) asomándose desde el borde inferior:
 * Solo la mitad superior visible, ojos expresivos brillantes, mejillas sonrojadas,
 * corazoncito en la cabeza en color de acento, y destellos (rombos en celeste, amarillo y magenta suave).
 */
export function getPochitoPeekingSvg(
  accentHex: string,
  isCelebration: boolean,
  width = 120,
  height = 42
): string {
  const extraSparkles = isCelebration
    ? `
      <polygon points="12,16 15,20 12,24 9,20" fill="#FDE047" />
      <polygon points="60,3 62.5,6 60,9 57.5,6" fill="#F472B6" />
      <polygon points="108,16 111,20 108,24 105,20" fill="#FDE047" />
      <polygon points="78,5 80.5,8 78,11 75.5,8" fill="#38BDF8" />
    `
    : '';

  return `<svg width="${width}" height="${height}" viewBox="0 0 120 42">
    <!-- Destellos rombo: celeste (#38bdf8), amarillo (#fde047), magenta suave (#f472b6) -->
    <polygon points="20,24 23.5,28 20,32 16.5,28" fill="#38BDF8" />
    <polygon points="28,12 31,16 28,20 25,16" fill="#FDE047" />
    <polygon points="92,13 95,17 92,21 89,17" fill="#F472B6" />
    <polygon points="100,26 103,30 100,34 97,30" fill="#38BDF8" />
    ${extraSparkles}

    <!-- Cabeza suave de Pochito asomándose -->
    <path d="M 32 42 Q 32 13 60 13 Q 88 13 88 42 Z" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.5" />

    <!-- Accesorio de corazoncito en la coronita en el color de acento activo -->
    <path d="M 60 12 C 59 10 57 8 55 8 C 53 8 52 9.5 52 11 C 52 13 54 15 60 18 C 66 15 68 13 68 11 C 68 9.5 67 8 65 8 C 63 8 61 10 60 12 Z" fill="${accentHex}" />

    <!-- Ojo izquierdo expresivo -->
    <ellipse cx="50" cy="27" rx="5.5" ry="7" fill="#FFFFFF" stroke="#D97706" stroke-width="0.8" />
    <ellipse cx="51" cy="26" rx="3.8" ry="4.5" fill="#1E293B" />
    <circle cx="52.2" cy="24.5" r="1.5" fill="#FFFFFF" />

    <!-- Ojo derecho expresivo -->
    <ellipse cx="70" cy="27" rx="5.5" ry="7" fill="#FFFFFF" stroke="#D97706" stroke-width="0.8" />
    <ellipse cx="69" cy="26" rx="3.8" ry="4.5" fill="#1E293B" />
    <circle cx="70.2" cy="24.5" r="1.5" fill="#FFFFFF" />

    <!-- Mejillas sonrojadas -->
    <ellipse cx="42" cy="34" rx="4" ry="2.2" fill="#F472B6" opacity="0.8" />
    <ellipse cx="78" cy="34" rx="4" ry="2.2" fill="#F472B6" opacity="0.8" />

    <!-- Sonrisita tierna -->
    <path d="M 57 33 Q 60 36 63 33" stroke="#D97706" stroke-width="1.2" stroke-linecap="round" fill="none" />
  </svg>`;
}

export const ENVELOPE_WHITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
export const HEART_WHITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;

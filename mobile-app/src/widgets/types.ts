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
  isDoodleNote?: boolean;
  doodleTitle?: string;
  petAccessory?: string;
  petName?: string;
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
  isDoodleNote: false,
  doodleTitle: '',
  petAccessory: 'none',
  petName: 'Pochito',
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
 * Pochito ("Panzón") asomándose desde el borde inferior del widget:
 * Orejitas de oso, hociquito crema, patitas agarrando el borde y el accesorio real equipado.
 */
export function getPochitoPeekingSvg(
  accentHex: string,
  isCelebration: boolean,
  width = 120,
  height = 42,
  accessory = 'none'
): string {
  const extraSparkles = isCelebration
    ? `
      <polygon points="10,22 13,26 10,30 7,26" fill="#FDE047" />
      <polygon points="110,22 113,26 110,30 107,26" fill="#FDE047" />
      <polygon points="22,8 24.5,11 22,14 19.5,11" fill="#F472B6" />
      <polygon points="98,8 100.5,11 98,14 95.5,11" fill="#38BDF8" />
    `
    : '';

  let accessorySvg = '';
  switch (accessory) {
    case 'crown':
      accessorySvg = `
        <path d="M 48 19 L 46 8 L 54 13 L 60 5 L 66 13 L 74 8 L 72 19 Q 60 21 48 19 Z" fill="#FACC15" stroke="#92400E" stroke-width="1.3" stroke-linejoin="round" />
        <path d="M 48.5 18 Q 60 20 71.5 18" stroke="#E11D48" stroke-width="2" fill="none" />
        <circle cx="60" cy="14.5" r="1.8" fill="#F43F5E" />
        <circle cx="60" cy="4.8" r="1.7" fill="#FEF08A" stroke="#92400E" stroke-width="0.9" />
      `;
      break;
    case 'bow':
      accessorySvg = `
        <g transform="rotate(-16 42 20)">
          <path d="M 42 20 C 35 14, 30 17, 31 21 C 32 25, 37 25, 42 21 Z" fill="#FB7185" stroke="#9F1239" stroke-width="1.2" />
          <path d="M 42 20 C 49 14, 54 17, 53 21 C 52 25, 47 25, 42 21 Z" fill="#FB7185" stroke="#9F1239" stroke-width="1.2" />
          <circle cx="42" cy="20.5" r="3" fill="#F43F5E" stroke="#9F1239" stroke-width="1.2" />
        </g>
      `;
      break;
    case 'flower':
      accessorySvg = `
        <g>
          <ellipse cx="73" cy="24" rx="4" ry="2.2" fill="#34D399" stroke="#047857" stroke-width="1" />
          <circle cx="79" cy="14" r="3.6" fill="#F9A8D4" stroke="#BE185D" stroke-width="1" />
          <circle cx="84" cy="18" r="3.6" fill="#FBCFE8" stroke="#BE185D" stroke-width="1" />
          <circle cx="82" cy="24" r="3.6" fill="#F9A8D4" stroke="#BE185D" stroke-width="1" />
          <circle cx="76" cy="24" r="3.6" fill="#FBCFE8" stroke="#BE185D" stroke-width="1" />
          <circle cx="74" cy="18" r="3.6" fill="#F9A8D4" stroke="#BE185D" stroke-width="1" />
          <circle cx="79" cy="19.5" r="3" fill="#FDE047" stroke="#CA8A04" stroke-width="1" />
        </g>
      `;
      break;
    case 'sunglasses':
      accessorySvg = `
        <g>
          <path d="M 33 31 L 41 31" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round" />
          <path d="M 79 31 L 87 31" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round" />
          <path d="M 56.5 31.5 Q 60 30 63.5 31.5" stroke="#1E293B" stroke-width="2" fill="none" />
          <rect x="41" y="28" width="15.5" height="10.5" rx="4" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" />
          <path d="M 44 30.5 L 47 36" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" opacity="0.6" />
          <rect x="63.5" y="28" width="15.5" height="10.5" rx="4" fill="#0F172A" stroke="#1E293B" stroke-width="1.5" />
          <path d="M 66.5 30.5 L 69.5 36" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" opacity="0.6" />
        </g>
      `;
      break;
    case 'party_hat':
      accessorySvg = `
        <g transform="rotate(6 60 18)">
          <path d="M 51 19 L 60 3 L 69 19 Q 60 21 51 19 Z" fill="#EC4899" stroke="#831843" stroke-width="1.3" stroke-linejoin="round" />
          <path d="M 54 14 L 65 11.5" stroke="#FDE047" stroke-width="2.2" stroke-linecap="round" />
          <path d="M 56.5 9.5 L 63 8" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" />
          <circle cx="60" cy="3" r="3" fill="#FDE047" stroke="#831843" stroke-width="1" />
        </g>
      `;
      break;
    case 'beret':
      accessorySvg = `
        <g transform="rotate(-12 56 18)">
          <path d="M 41 19 C 40 11, 51 9, 60 10 C 70 11, 74 15, 72 19 Q 56 21 41 19 Z" fill="#BE123C" stroke="#881337" stroke-width="1.3" />
          <path d="M 43 19 Q 57 21 70 19" stroke="#4C0519" stroke-width="2.2" fill="none" stroke-linecap="round" />
        </g>
      `;
      break;
    case 'headphones':
      accessorySvg = `
        <g>
          <path d="M 30 31 C 30 10, 90 10, 90 31" fill="none" stroke="#334155" stroke-width="3.2" stroke-linecap="round" />
          <rect x="27" y="25" width="7" height="14" rx="3.5" fill="#38BDF8" stroke="#0F172A" stroke-width="1.3" />
          <rect x="86" y="25" width="7" height="14" rx="3.5" fill="#38BDF8" stroke="#0F172A" stroke-width="1.3" />
        </g>
      `;
      break;
    case 'scarf':
      accessorySvg = `
        <g>
          <path d="M 39 46 Q 60 51 81 46 L 80 50 Q 60 53 40 50 Z" fill="#F43F5E" stroke="#9F1239" stroke-width="1.2" />
        </g>
      `;
      break;
    case 'halo':
      accessorySvg = `
        <g>
          <ellipse cx="60" cy="9.5" rx="13" ry="3.5" fill="none" stroke="#FEF08A" stroke-width="4" opacity="0.5" />
          <ellipse cx="60" cy="9.5" rx="12" ry="3" fill="none" stroke="#FACC15" stroke-width="2.2" />
        </g>
      `;
      break;
    case 'wizard':
      accessorySvg = `
        <g>
          <path d="M 39 20 Q 60 23.5 81 20 Q 74 16.5 60 16.5 Q 46 16.5 39 20 Z" fill="#4338CA" stroke="#1E1B4B" stroke-width="1.3" />
          <path d="M 48 18 L 57 3 Q 61 1 66 5 L 64 7 L 72 18 Q 60 20 48 18 Z" fill="#4338CA" stroke="#1E1B4B" stroke-width="1.3" />
          <path d="M 49 16.5 Q 60 18.5 71 16.5" stroke="#FACC15" stroke-width="2" fill="none" />
        </g>
      `;
      break;
    case 'loincloth':
      accessorySvg = `
        <g>
          <path d="M 73 16 C 78 12, 83 14, 82 18 C 79 20, 75 19, 73 16 Z" fill="#22C55E" stroke="#15803D" stroke-width="1.2" />
          <path d="M 38 46 Q 60 51 82 46 L 80 50 Q 60 53 40 50 Z" fill="#F59E0B" stroke="#78350F" stroke-width="1.2" />
        </g>
      `;
      break;
    default:
      accessorySvg = `
        <path d="M 60 14.5 C 59 12.5 57.5 11 55.8 11 C 54 11 53 12.3 53 13.8 C 53 15.8 55 17.5 60 20 C 65 17.5 67 15.8 67 13.8 C 67 12.3 66 11 64.2 11 C 62.5 11 61 12.5 60 14.5 Z" fill="${accentHex}" />
      `;
      break;
  }

  return `<svg width="${width}" height="${height}" viewBox="0 0 120 50">
    <!-- Destellos rombo -->
    <polygon points="18,30 21,33.5 18,37 15,33.5" fill="#38BDF8" />
    <polygon points="24,18 26.5,21 24,24 21.5,21" fill="#FDE047" />
    <polygon points="96,18 98.5,21 96,24 93.5,21" fill="#F472B6" />
    <polygon points="102,30 105,33.5 102,37 99,33.5" fill="#38BDF8" />
    ${extraSparkles}

    <!-- Orejitas redondas de osito -->
    <circle cx="40" cy="24" r="8.5" fill="#FDE047" stroke="#B45309" stroke-width="1.5" />
    <circle cx="40.3" cy="24.2" r="4.6" fill="#FDA4AF" />
    <circle cx="80" cy="24" r="8.5" fill="#FDE047" stroke="#B45309" stroke-width="1.5" />
    <circle cx="79.7" cy="24.2" r="4.6" fill="#FDA4AF" />

    <!-- Cabecita mochi de Pochito asomándose -->
    <path d="M 33 50 C 33 27, 43 18, 60 18 C 77 18, 87 27, 87 50 Z" fill="#FDE047" stroke="#B45309" stroke-width="1.5" />

    <!-- Ojos expresivos -->
    <ellipse cx="49.5" cy="33" rx="3.2" ry="3.8" fill="#1C1917" />
    <circle cx="48.5" cy="31.5" r="1.2" fill="#FFFFFF" />
    <ellipse cx="70.5" cy="33" rx="3.2" ry="3.8" fill="#1C1917" />
    <circle cx="69.5" cy="31.5" r="1.2" fill="#FFFFFF" />

    <!-- Mejillas sonrojadas -->
    <ellipse cx="41.5" cy="38.5" rx="4.2" ry="2.2" fill="#FB7185" opacity="0.55" />
    <ellipse cx="78.5" cy="38.5" rx="4.2" ry="2.2" fill="#FB7185" opacity="0.55" />

    <!-- Hociquito crema + naricita + boquita -->
    <ellipse cx="60" cy="41.5" rx="10" ry="6.8" fill="#FFFDF5" stroke="#FED7AA" stroke-width="1" />
    <path d="M 57 38.5 C 57 37.3 63 37.3 63 38.5 C 63 39.8 61 41.3 60 41.5 C 59 41.3 57 39.8 57 38.5 Z" fill="#78350F" />
    <path d="M 56.5 42.8 Q 58.3 44.8 60 42.8 Q 61.7 44.8 63.5 42.8" stroke="#78350F" stroke-width="1.2" stroke-linecap="round" fill="none" />

    <!-- Patitas agarrando el borde inferior -->
    <ellipse cx="43" cy="49" rx="5.5" ry="3.2" fill="#FEF08A" stroke="#B45309" stroke-width="1.3" />
    <ellipse cx="77" cy="49" rx="5.5" ry="3.2" fill="#FEF08A" stroke="#B45309" stroke-width="1.3" />

    <!-- Accesorio equipado -->
    ${accessorySvg}
  </svg>`;
}

export const ENVELOPE_WHITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
export const HEART_WHITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`;
export const BRUSH_WHITE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>`;

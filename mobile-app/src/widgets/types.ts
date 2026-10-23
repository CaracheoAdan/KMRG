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
};

export function computeTimeTogether(anniversaryDate?: string, fallbackDays = 0) {
  let totalDays = fallbackDays;
  if (anniversaryDate && anniversaryDate.trim()) {
    try {
      const parts = anniversaryDate.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        const start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
        const now = new Date();
        const diffMs = Math.max(0, now.getTime() - start.getTime());
        totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
    } catch {
      totalDays = fallbackDays;
    }
  }

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days = (totalDays % 365) % 30;

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

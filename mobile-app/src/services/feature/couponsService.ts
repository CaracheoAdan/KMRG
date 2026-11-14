import { UserProfile } from '../../types';
import { sanitizeInput } from '../../theme/designSystem';
import { sendPartnerPushNotification } from '../NotificationService';
import { getPartnerPushToken } from './pushTokenService';
import {
  deleteRow,
  fetchAll,
  generateId,
  readCache,
  subscribeTable,
  upsertRow,
} from './featureStore';

export type LoveCoupon = {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  issued_by: UserProfile;
  recipient: UserProfile;
  is_redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
};

export interface CouponTemplate {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

const TABLE = 'love_coupons';

export const COUPON_TEMPLATES: CouponTemplate[] = [
  {
    id: 'tpl-1',
    title: 'Vale por un masaje relajante 💆',
    description: '20 minutos de masaje en espalda, cuello o pies sin quejas y con música suave.',
    emoji: '💆',
  },
  {
    id: 'tpl-2',
    title: 'Vale por elegir la cena sin discutir 🍕',
    description: 'Hoy tú decides qué cenamos o pedimos a domicilio, ¡yo invito con gusto!',
    emoji: '🍕',
  },
  {
    id: 'tpl-3',
    title: 'Vale por una cita sorpresa ✨',
    description: 'Yo planeo todo de principio a fin. Solo tienes que ponerte aún más hermosa/o.',
    emoji: '✨',
  },
  {
    id: 'tpl-4',
    title: 'Vale por desayuno en la cama 🥞',
    description: 'Despierta con tu desayuno favorito recién preparado y cafecito caliente.',
    emoji: '🥞',
  },
  {
    id: 'tpl-5',
    title: 'Vale por perdón instantáneo 🕊️',
    description: 'Borrón, abrazo fuerte y sonrisa inmediata para terminar cualquier malentendido.',
    emoji: '🕊️',
  },
  {
    id: 'tpl-6',
    title: 'Vale por tarde de películas con tus snacks 🍿',
    description: 'Tú eliges las películas y yo me encargo de tus dulces, palomitas y bebidas favoritas.',
    emoji: '🍿',
  },
  {
    id: 'tpl-7',
    title: 'Vale por una escapada de fin de semana 🚗',
    description: 'Un paseo juntos a un pueblito o rincón bonito para desconectarnos del mundo.',
    emoji: '🚗',
  },
  {
    id: 'tpl-8',
    title: 'Vale por mil besos y abrazos infinitos 💋',
    description: 'Canjeable en cualquier momento del día por una lluvia de mimos y apapachos.',
    emoji: '💋',
  },
  {
    id: 'tpl-9',
    title: 'Vale por ser el DJ en el carro todo el día 🎶',
    description: 'Control total de la playlist en nuestro próximo viaje en auto, ¡a cantar a todo pulmón!',
    emoji: '🎶',
  },
  {
    id: 'tpl-10',
    title: 'Vale por un postre o antojito a medianoche 🍰',
    description: 'Sea la hora que sea, vamos o consigo ese postre o antojo que tanto quieres.',
    emoji: '🍰',
  },
];

export const COUPON_EMOJIS = ['🎟️', '💆', '🍕', '✨', '🥞', '🕊️', '🍿', '🚗', '💋', '🎶', '🍰', '🌹', '🍷', '🎁'];

function getPartnerOf(profile: UserProfile): UserProfile {
  return profile === 'Javier' ? 'Karla' : 'Javier';
}

function getPartnerLabel(profile: UserProfile): string {
  return profile === 'Karla' ? 'Karlita' : 'Javier';
}

export async function getAllCoupons(): Promise<LoveCoupon[]> {
  const rows = await fetchAll<LoveCoupon>(TABLE, {
    orderBy: 'created_at',
    ascending: false,
    limit: 300,
  });
  return [...rows].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function getCachedCoupons(): Promise<LoveCoupon[]> {
  const rows = await readCache<LoveCoupon>(TABLE);
  return [...rows].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function createCoupon(input: {
  title: string;
  description?: string | null;
  emoji?: string;
  issued_by: UserProfile;
  recipient?: UserProfile;
}): Promise<LoveCoupon> {
  const cleanTitle = sanitizeInput(input.title, 160);
  if (!cleanTitle) {
    throw new Error('Escribe un título para el vale de amor.');
  }

  const cleanDesc = input.description ? sanitizeInput(input.description, 500) || null : null;
  const cleanEmoji = sanitizeInput(input.emoji || '🎟️', 16) || '🎟️';
  const recipient = input.recipient || getPartnerOf(input.issued_by);
  const nowIso = new Date().toISOString();

  const row: LoveCoupon = {
    id: generateId(),
    title: cleanTitle,
    description: cleanDesc,
    emoji: cleanEmoji,
    issued_by: input.issued_by,
    recipient,
    is_redeemed: false,
    redeemed_at: null,
    created_at: nowIso,
  };

  const saved = await upsertRow<LoveCoupon>(TABLE, row);

  try {
    const token = await getPartnerPushToken(recipient);
    if (token) {
      const senderName = getPartnerLabel(input.issued_by);
      await sendPartnerPushNotification(
        token,
        `🎟️ ¡Nuevo vale de ${senderName}!`,
        `${senderName} te regaló: "${cleanTitle}". ¡Entra a tu cuponera para verlo!`,
        { type: 'LOVE_COUPON_CREATED', couponId: saved.id }
      );
    }
  } catch {
    // Ignorar error de push
  }

  return saved;
}

export async function redeemCoupon(
  couponId: string,
  redeemerProfile: UserProfile
): Promise<LoveCoupon | null> {
  const cached = await readCache<LoveCoupon>(TABLE);
  let target = cached.find((c) => c.id === couponId);
  if (!target) {
    const all = await getAllCoupons();
    target = all.find((c) => c.id === couponId);
  }
  if (!target) return null;

  const nowIso = new Date().toISOString();
  const updated: LoveCoupon = {
    ...target,
    is_redeemed: true,
    redeemed_at: nowIso,
  };

  const saved = await upsertRow<LoveCoupon>(TABLE, updated);

  try {
    const partner = getPartnerOf(redeemerProfile);
    const redeemerName = getPartnerLabel(redeemerProfile);
    const token = await getPartnerPushToken(partner);
    if (token) {
      await sendPartnerPushNotification(
        token,
        `🎟️ ¡${redeemerName} canjeó un vale!`,
        `${redeemerName} acaba de canjear: "${saved.title}". ¡Es hora de cumplirlo! 💖`,
        { type: 'LOVE_COUPON_REDEEMED', couponId: saved.id }
      );
    }
  } catch {
    // Ignorar error de push
  }

  return saved;
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteRow(TABLE, id);
}

export function subscribeCoupons(onChange: () => void): () => void {
  return subscribeTable(TABLE, onChange);
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';

export const statsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).optional().default(90),
});

interface RawMessageRow {
  id: string;
  sender?: string;
  recipient?: string;
  scheduled_date: Date | string;
  is_read: boolean;
}

interface RawInteractionRow {
  id: string;
  sender?: string;
  type: string;
  payload: unknown;
  created_at: Date | string;
}

function toDateOnlyString(val: Date | string): string {
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val);
  return str.includes('T') ? str.split('T')[0] : str.slice(0, 10);
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split('T')[0];
}

function getLocalTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export const getAdminStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedQuery = statsQuerySchema.safeParse(req.query);
    const days = parsedQuery.success ? parsedQuery.data.days : 90;

    const todayStr = getLocalTodayIso();
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
    const cutoffIso = cutoffDate.toISOString();

    let messages: RawMessageRow[] = [];
    let milestonesTotal = 0;
    let interactions: RawInteractionRow[] = [];
    let usedSupabase = false;

    if (supabase) {
      try {
        const [msgRes, mileRes, intRes] = await Promise.all([
          supabase
            .from('messages')
            .select('id, sender, recipient, scheduled_date, is_read')
            .order('scheduled_date', { ascending: true }),
          supabase.from('milestones').select('id', { count: 'exact', head: true }),
          supabase
            .from('interactions')
            .select('id, sender, type, payload, created_at')
            .gte('created_at', cutoffIso)
            .order('created_at', { ascending: false })
            .limit(2000),
        ]);

        if (!msgRes.error && Array.isArray(msgRes.data)) {
          messages = msgRes.data as RawMessageRow[];
          milestonesTotal = mileRes.count ?? 0;
          interactions = (intRes.data ?? []) as RawInteractionRow[];
          usedSupabase = true;
        }
      } catch (err) {
        logger.warn({ err }, 'Fallo consultando estadísticas en Supabase, usando fallback Prisma');
      }
    }

    if (!usedSupabase) {
      const [prismaMessages, prismaMilestonesCount, prismaInteractions] = await Promise.all([
        prisma.message.findMany({
          select: {
            id: true,
            sender: true,
            recipient: true,
            scheduled_date: true,
            is_read: true,
          },
          orderBy: { scheduled_date: 'asc' },
          take: 5000,
        }),
        prisma.milestone.count(),
        prisma.interaction.findMany({
          where: {
            created_at: { gte: cutoffDate },
          },
          select: {
            id: true,
            sender: true,
            type: true,
            payload: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
          take: 2000,
        }),
      ]);

      messages = prismaMessages;
      milestonesTotal = prismaMilestonesCount;
      interactions = prismaInteractions;
    }

    // 1. Resumen de mensajes
    let read = 0;
    let unread = 0;
    let future = 0;
    const bySender: Record<string, number> = {};
    const byRecipient: Record<string, number> = {};
    const weekMap = new Map<string, number>();

    for (const m of messages) {
      const dateStr = toDateOnlyString(m.scheduled_date);
      if (m.is_read) {
        read += 1;
      } else {
        unread += 1;
      }
      if (dateStr > todayStr) {
        future += 1;
      }

      const sender = (m.sender || 'Javier').trim();
      const recipient = (m.recipient || 'Karla').trim();
      bySender[sender] = (bySender[sender] || 0) + 1;
      byRecipient[recipient] = (byRecipient[recipient] || 0) + 1;

      const weekKey = getMondayOfWeek(dateStr);
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }

    const perWeek = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, count]) => ({ week, count }));

    // 2. Resumen de interacciones y racha
    const byType: Record<string, number> = {};
    const dayInteractionsMap = new Map<
      string,
      { thinking_of_you: number; heartbeat: number; reaction: number }
    >();

    // Inicializar los últimos 14 días para la gráfica diaria
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dStr = d.toISOString().split('T')[0];
      dayInteractionsMap.set(dStr, { thinking_of_you: 0, heartbeat: 0, reaction: 0 });
    }

    let streakCount = 0;
    const latestMoods: Record<
      string,
      { emoji?: string; label?: string; text?: string; updatedAt?: string }
    > = {};

    const activeInteractionDays = new Set<string>();

    for (const item of interactions) {
      const type = item.type || 'thinking_of_you';
      byType[type] = (byType[type] || 0) + 1;

      const dateStr = toDateOnlyString(item.created_at);
      activeInteractionDays.add(dateStr);

      if (dayInteractionsMap.has(dateStr)) {
        const entry = dayInteractionsMap.get(dateStr)!;
        if (type === 'thinking_of_you') entry.thinking_of_you += 1;
        else if (type === 'heartbeat') entry.heartbeat += 1;
        else if (type === 'reaction') entry.reaction += 1;
      }

      const payloadObj =
        item.payload && typeof item.payload === 'object'
          ? (item.payload as Record<string, unknown>)
          : {};

      if (type === 'sync_streak' && typeof payloadObj.count === 'number' && streakCount === 0) {
        streakCount = payloadObj.count;
      }

      if (type === 'mood_checkin' || type === 'sync_home_state') {
        const sender = (item.sender || 'Javier').trim();
        if (!latestMoods[sender] && (payloadObj.emoji || payloadObj.mood || payloadObj.label)) {
          latestMoods[sender] = {
            emoji: String(payloadObj.emoji || '💖'),
            label: String(payloadObj.label || payloadObj.mood || 'Enamorado/a'),
            text: payloadObj.text ? String(payloadObj.text) : undefined,
            updatedAt:
              item.created_at instanceof Date
                ? item.created_at.toISOString()
                : String(item.created_at),
          };
        }
      }
    }

    // Si no hay sync_streak explícito, calcular racha consecutiva de días con interacciones o cartas leídas
    if (streakCount === 0) {
      for (const m of messages) {
        if (m.is_read) {
          activeInteractionDays.add(toDateOnlyString(m.scheduled_date));
        }
      }
      let cursor = new Date();
      for (let i = 0; i < 365; i++) {
        const dStr = cursor.toISOString().split('T')[0];
        if (activeInteractionDays.has(dStr)) {
          streakCount += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else if (i === 0) {
          // Permitir que hoy aún no tenga check-in si ayer sí hubo
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    const perDay = Array.from(dayInteractionsMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
      }));

    res.json({
      success: true,
      data: {
        messages: {
          total: messages.length,
          read,
          unread,
          future,
          bySender,
          byRecipient,
          perWeek,
        },
        milestones: {
          total: milestonesTotal,
        },
        interactions: {
          total: interactions.length,
          byType,
          perDay,
        },
        streakCount,
        latestMoods,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en getAdminStats');
    res.status(500).json({ success: false, message: 'Error al calcular estadísticas' });
  }
};

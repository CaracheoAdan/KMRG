import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';

// ── Mobile: Registrar una interacción (ej. "Pensando en ti") ──
export const createInteraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sender, type, payload } = req.body;
    const cleanSender = sender?.trim() || 'Javier';

    const interaction = await prisma.interaction.create({
      data: {
        sender: cleanSender,
        type,
        payload: payload ?? {},
      },
    });

    if (supabase) {
      try {
        await supabase.from('interactions').insert([
          {
            id: interaction.id,
            sender: cleanSender,
            type,
            payload: payload ?? {},
          },
        ]);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar interacción a Supabase');
      }
    }

    res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    logger.error({ err: error }, 'Error en createInteraction');
    res.status(500).json({ success: false, message: 'Error al registrar interacción' });
  }
};

// ── Admin: Consultar el historial de interacciones ──
export const listInteractions = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          return void res.json({ success: true, data });
        }
      } catch {
        // Fallback a Prisma
      }
    }

    const interactions = await prisma.interaction.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: interactions });
  } catch (error) {
    logger.error({ err: error }, 'Error en listInteractions');
    res.status(500).json({ success: false, message: 'Error al obtener interacciones' });
  }
};

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

// ── Admin: Enviar señal remota de desbloqueo / recuperación a la app móvil ──
export const emergencyResetAppState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { mode } = req.body || {};
    const isFull = mode === 'full';

    const cleanHome = isFull
      ? {
          nextEventTitle: '',
          nextEventDate: '',
          nextEventTime: '',
          stickyNote: { author: 'Javier', text: '', updatedAt: new Date().toISOString() },
        }
      : {
          nextEventTitle: '',
          nextEventDate: '',
          nextEventTime: '',
        };

    const payload = {
      mode: isFull ? 'full' : 'cita',
      timestamp: new Date().toISOString(),
      cleanHome,
    };

    // 1. Guardar en Prisma si está disponible
    try {
      await prisma.interaction.create({
        data: {
          sender: 'Admin',
          type: 'remote_emergency_reset',
          payload,
        },
      });
    } catch (err) {
      logger.warn({ err }, 'Prisma interacción no se pudo crear en emergencyResetAppState');
    }

    // 2. Transmitir en tiempo real y persistir en Supabase para que la app lo reciba de inmediato
    if (supabase) {
      try {
        await supabase.from('interactions').insert([
          {
            sender: 'Admin',
            type: 'remote_emergency_reset',
            payload,
          },
          {
            sender: 'Admin',
            type: 'sync_home_state',
            payload: cleanHome,
          },
        ]);
      } catch (err) {
        logger.warn({ err }, 'Supabase no pudo registrar remote_emergency_reset');
      }
    }

    res.json({
      success: true,
      message: isFull
        ? 'Se ha enviado la señal para restablecer el estado completo de la app.'
        : 'Se ha enviado la señal para destrabar la app y limpiar la cita.',
      payload,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en emergencyResetAppState');
    res.status(500).json({ success: false, message: 'Error al enviar comando de recuperación' });
  }
};

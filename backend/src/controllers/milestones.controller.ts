import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';
import { handlePrismaError } from '../utils/prismaErrors';

// ── Admin y Mobile: Listar hitos ordenados por fecha ascendente ──
export const listMilestones = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .order('date', { ascending: true });

        if (!error && Array.isArray(data)) {
          return void res.json({ success: true, data });
        }
      } catch {
        // Fallback a Prisma
      }
    }

    const milestones = await prisma.milestone.findMany({
      select: { id: true, author: true, title: true, date: true, image_url: true, created_at: true },
      orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
      take: 1000,
    });
    res.json({ success: true, data: milestones });
  } catch (error) {
    logger.error({ err: error }, 'Error en listMilestones');
    res.status(500).json({ success: false, message: 'Error al obtener hitos' });
  }
};

// ── Admin: Obtener un único hito por ID ──
export const getMilestoneById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return void res.json({ success: true, data });
        }
      } catch {
        // Fallback a Prisma
      }
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      res.status(404).json({ success: false, message: 'Hito no encontrado' });
      return;
    }

    res.json({ success: true, data: milestone });
  } catch (error) {
    logger.error({ err: error }, 'Error en getMilestoneById');
    res.status(500).json({ success: false, message: 'Error al obtener el hito' });
  }
};

// ── Admin: Crear un nuevo hito ──
export const createMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { author, title, date, image_url } = req.body as {
      author?: string;
      title: string;
      date: string;
      image_url: string;
    };

    const cleanAuthor = author?.trim() || 'Javier';

    const milestone = await prisma.milestone.create({
      data: {
        author: cleanAuthor,
        title: title.trim(),
        date: new Date(date),
        image_url: image_url.trim(),
      },
    });

    if (supabase) {
      try {
        await supabase.from('milestones').insert([
          {
            id: milestone.id,
            author: cleanAuthor,
            title: title.trim(),
            date,
            image_url: image_url.trim(),
          },
        ]);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar hito a Supabase');
      }
    }

    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    logger.error({ err: error }, 'Error en createMilestone');
    res.status(500).json({ success: false, message: 'Error al crear hito' });
  }
};

// ── Admin: Actualizar un hito existente ──
export const updateMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { author, title, date, image_url } = req.body as {
      author?: string;
      title?: string;
      date?: string;
      image_url?: string;
    };

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(author !== undefined && { author }),
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(image_url !== undefined && { image_url }),
      },
    });

    if (supabase) {
      try {
        const patch: Record<string, unknown> = {};
        if (author !== undefined) patch.author = author;
        if (title !== undefined) patch.title = title;
        if (date !== undefined) patch.date = date;
        if (image_url !== undefined) patch.image_url = image_url;

        await supabase.from('milestones').update(patch).eq('id', id);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar actualización de hito a Supabase');
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handlePrismaError(
      res,
      error,
      'updateMilestone',
      'Hito no encontrado',
      'Error al actualizar hito',
    );
  }
};

// ── Admin: Eliminar un hito ──
export const deleteMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.milestone.delete({ where: { id } });

    if (supabase) {
      try {
        await supabase.from('milestones').delete().eq('id', id);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar eliminación de hito a Supabase');
      }
    }

    res.json({ success: true, message: 'Hito eliminado' });
  } catch (error) {
    handlePrismaError(
      res,
      error,
      'deleteMilestone',
      'Hito no encontrado',
      'Error al eliminar hito',
    );
  }
};

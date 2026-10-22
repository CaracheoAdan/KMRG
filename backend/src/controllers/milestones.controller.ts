import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { handlePrismaError } from '../utils/prismaErrors';

// ── Admin y Mobile: Listar hitos ordenados por fecha ascendente ──
export const listMilestones = async (_req: Request, res: Response): Promise<void> => {
  try {
    const milestones = await prisma.milestone.findMany({
      select: { id: true, title: true, date: true, image_url: true, created_at: true },
      orderBy: [{ date: 'asc' }, { created_at: 'asc' }],
      take: 1000,
    });
    res.json({ success: true, data: milestones });
  } catch (error) {
    logger.error({ err: error }, 'Error en listMilestones');
    res.status(500).json({ success: false, message: 'Error al obtener hitos' });
  }
};

// ── Admin: Crear un nuevo hito ──
export const createMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, date, image_url } = req.body as {
      title: string;
      date: string;
      image_url: string;
    };

    const milestone = await prisma.milestone.create({
      data: {
        title,
        date: new Date(date),
        image_url,
      },
    });

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
    const { title, date, image_url } = req.body as {
      title?: string;
      date?: string;
      image_url?: string;
    };

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(image_url !== undefined && { image_url }),
      },
    });

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


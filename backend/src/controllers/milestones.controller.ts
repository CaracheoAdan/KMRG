import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ── Admin: Listar hitos ordenados por fecha ──
export const listMilestones = async (_req: Request, res: Response): Promise<void> => {
  try {
    const milestones = await prisma.milestone.findMany({
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: milestones });
  } catch (error) {
    console.error('Error en listMilestones:', error);
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
    console.error('Error en createMilestone:', error);
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

    const exists = await prisma.milestone.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ success: false, message: 'Hito no encontrado' });
      return;
    }

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
    console.error('Error en updateMilestone:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar hito' });
  }
};

// ── Admin: Eliminar un hito ──
export const deleteMilestone = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const exists = await prisma.milestone.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ success: false, message: 'Hito no encontrado' });
      return;
    }

    await prisma.milestone.delete({ where: { id } });
    res.json({ success: true, message: 'Hito eliminado' });
  } catch (error) {
    console.error('Error en deleteMilestone:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar hito' });
  }
};

import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ── Mobile: Registrar una interacción (ej. "Pensando en ti") ──
export const createInteraction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, payload } = req.body;

    const interaction = await prisma.interaction.create({
      data: {
        type,
        payload: payload ?? {},
      },
    });

    res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    console.error('Error en createInteraction:', error);
    res.status(500).json({ success: false, message: 'Error al registrar interacción' });
  }
};

// ── Admin: Consultar el historial de interacciones ──
export const listInteractions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const interactions = await prisma.interaction.findMany({
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: interactions });
  } catch (error) {
    console.error('Error en listInteractions:', error);
    res.status(500).json({ success: false, message: 'Error al obtener interacciones' });
  }
};

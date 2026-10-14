import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

// ── Admin: Listar todos los mensajes ordenados por fecha ──
export const listMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: { scheduled_date: 'asc' },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error en listMessages:', error);
    res.status(500).json({ success: false, message: 'Error al obtener mensajes' });
  }
};

// ── Admin: Crear un nuevo mensaje ──
export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, scheduled_date, theme_color, is_read } = req.body as {
      content: string;
      scheduled_date: string;
      theme_color: string;
      is_read?: boolean;
    };

    const message = await prisma.message.create({
      data: {
        content,
        scheduled_date: new Date(scheduled_date),
        theme_color,
        is_read: is_read ?? false,
      },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Error en createMessage:', error);
    res.status(500).json({ success: false, message: 'Error al crear mensaje' });
  }
};

// ── Admin: Actualizar un mensaje existente ──
export const updateMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { content, scheduled_date, theme_color, is_read } = req.body as {
      content?: string;
      scheduled_date?: string;
      theme_color?: string;
      is_read?: boolean;
    };

    const exists = await prisma.message.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
      return;
    }

    const updated = await prisma.message.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(scheduled_date !== undefined && { scheduled_date: new Date(scheduled_date) }),
        ...(theme_color !== undefined && { theme_color }),
        ...(is_read !== undefined && { is_read }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error en updateMessage:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar mensaje' });
  }
};

// ── Admin: Eliminar un mensaje ──
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const exists = await prisma.message.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
      return;
    }

    await prisma.message.delete({ where: { id } });
    res.json({ success: true, message: 'Mensaje eliminado' });
  } catch (error) {
    console.error('Error en deleteMessage:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar mensaje' });
  }
};

// ── Mobile: Sincronizar mensajes futuros (scheduled_date >= HOY) ──
export const syncMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messages = await prisma.message.findMany({
      where: {
        scheduled_date: { gte: today },
      },
      orderBy: { scheduled_date: 'asc' },
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error en syncMessages:', error);
    res.status(500).json({ success: false, message: 'Error al sincronizar mensajes' });
  }
};

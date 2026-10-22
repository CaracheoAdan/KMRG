import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { handlePrismaError } from '../utils/prismaErrors';

// ── Admin: Listar todos los mensajes ordenados por fecha ──
export const listMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await prisma.message.findMany({
      orderBy: [{ scheduled_date: 'asc' }, { created_at: 'asc' }],
      take: 2000,
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error({ err: error }, 'Error en listMessages');
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
    logger.error({ err: error }, 'Error en createMessage');
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
    handlePrismaError(
      res,
      error,
      'updateMessage',
      'Mensaje no encontrado',
      'Error al actualizar mensaje',
    );
  }
};

// ── Admin: Eliminar un mensaje ──
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.message.delete({ where: { id } });
    res.json({ success: true, message: 'Mensaje eliminado' });
  } catch (error) {
    handlePrismaError(
      res,
      error,
      'deleteMessage',
      'Mensaje no encontrado',
      'Error al eliminar mensaje',
    );
  }
};

// ── Mobile: Sincronización completa de mensajes ──
// Se devuelven todos los mensajes (pasados y futuros) para que la app pueda:
//  - Mostrar la línea de tiempo "Nosotros" incluso tras una instalación nueva.
//  - Reflejar ediciones y eliminaciones hechas desde el panel (la app reemplaza su caché).
//  - Programar notificaciones locales de mensajes futuros (prefetching).
export const syncMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await prisma.message.findMany({
      select: { id: true, content: true, scheduled_date: true, theme_color: true, is_read: true, created_at: true },
      orderBy: [{ scheduled_date: 'asc' }, { created_at: 'asc' }],
      take: 2000,
    });

    res.json({ success: true, data: messages });
  } catch (error) {
    logger.error({ err: error }, 'Error en syncMessages');
    res.status(500).json({ success: false, message: 'Error al sincronizar mensajes' });
  }
};

// ── Mobile: Confirmar lectura de un mensaje ──
export const markMessageAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.message.update({
      where: { id },
      data: { is_read: true },
    });

    res.json({ success: true, message: 'Mensaje marcado como leído' });
  } catch (error) {
    handlePrismaError(
      res,
      error,
      'markMessageAsRead',
      'Mensaje no encontrado',
      'Error al marcar mensaje como leído',
    );
  }
};


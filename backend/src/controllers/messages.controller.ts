import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { supabase } from '../config/supabase';
import { handlePrismaError } from '../utils/prismaErrors';

// ── Admin: Listar todos los mensajes ordenados por fecha ──
export const listMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          return void res.json({ success: true, data });
        }
        if (error) {
          logger.warn({ err: error.message }, 'Fallo al listar mensajes de Supabase, usando fallback Prisma');
        }
      } catch (err) {
        logger.warn({ err }, 'Excepción consultando Supabase, usando fallback Prisma');
      }
    }

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

// ── Admin: Obtener un único mensaje por ID ──
export const getMessageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
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

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      res.status(404).json({ success: false, message: 'Mensaje no encontrado' });
      return;
    }

    res.json({ success: true, data: message });
  } catch (error) {
    logger.error({ err: error }, 'Error en getMessageById');
    res.status(500).json({ success: false, message: 'Error al obtener el mensaje' });
  }
};

// ── Admin: Crear un nuevo mensaje ──
export const createMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sender, recipient, content, scheduled_date, theme_color, is_read } = req.body as {
      sender?: string;
      recipient?: string;
      content: string;
      scheduled_date: string;
      theme_color: string;
      is_read?: boolean;
    };

    const cleanSender = sender?.trim() || 'Javier';
    const cleanRecipient = recipient?.trim() || 'Karla';

    // 1. Guardar en Prisma local
    const message = await prisma.message.create({
      data: {
        sender: cleanSender,
        recipient: cleanRecipient,
        content: content.trim(),
        scheduled_date: new Date(scheduled_date),
        theme_color,
        is_read: is_read ?? false,
      },
    });

    // 2. Sincronizar de forma transparente con Supabase Cloud
    if (supabase) {
      try {
        const { error } = await supabase.from('messages').insert([
          {
            id: message.id,
            sender: cleanSender,
            recipient: cleanRecipient,
            content: content.trim(),
            scheduled_date,
            theme_color,
            is_read: is_read ?? false,
          },
        ]);
        if (error) {
          logger.warn({ err: error.message }, 'No se pudo sincronizar mensaje creado a Supabase');
        } else {
          logger.info({ id: message.id }, 'Mensaje sincronizado exitosamente con Supabase');
        }
      } catch (err) {
        logger.warn({ err }, 'Error de red sincronizando mensaje creado con Supabase');
      }
    }

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
    const { sender, recipient, content, scheduled_date, theme_color, is_read } = req.body as {
      sender?: string;
      recipient?: string;
      content?: string;
      scheduled_date?: string;
      theme_color?: string;
      is_read?: boolean;
    };

    const updated = await prisma.message.update({
      where: { id },
      data: {
        ...(sender !== undefined && { sender }),
        ...(recipient !== undefined && { recipient }),
        ...(content !== undefined && { content }),
        ...(scheduled_date !== undefined && { scheduled_date: new Date(scheduled_date) }),
        ...(theme_color !== undefined && { theme_color }),
        ...(is_read !== undefined && { is_read }),
      },
    });

    if (supabase) {
      try {
        const patch: Record<string, unknown> = {};
        if (sender !== undefined) patch.sender = sender;
        if (recipient !== undefined) patch.recipient = recipient;
        if (content !== undefined) patch.content = content.trim();
        if (scheduled_date !== undefined) patch.scheduled_date = scheduled_date;
        if (theme_color !== undefined) patch.theme_color = theme_color;
        if (is_read !== undefined) patch.is_read = is_read;

        await supabase.from('messages').update(patch).eq('id', id);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar actualización de mensaje a Supabase');
      }
    }

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

    if (supabase) {
      try {
        await supabase.from('messages').delete().eq('id', id);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar eliminación de mensaje a Supabase');
      }
    }

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
export const syncMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('scheduled_date', { ascending: true })
          .order('created_at', { ascending: true });

        if (!error && Array.isArray(data)) {
          return void res.json({ success: true, data });
        }
      } catch {
        // Fallback a Prisma
      }
    }

    const messages = await prisma.message.findMany({
      select: {
        id: true,
        sender: true,
        recipient: true,
        content: true,
        scheduled_date: true,
        theme_color: true,
        is_read: true,
        created_at: true,
      },
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

    if (supabase) {
      try {
        await supabase.from('messages').update({ is_read: true }).eq('id', id);
      } catch (err) {
        logger.warn({ err }, 'No se pudo sincronizar marca de lectura a Supabase');
      }
    }

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

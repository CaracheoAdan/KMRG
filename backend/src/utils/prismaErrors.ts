import { Response } from 'express';
import { logger } from '../config/logger';

/** Devuelve true si el error es un "registro no encontrado" de Prisma (P2025). */
export const isNotFoundError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: unknown }).code === 'P2025';

/**
 * Manejo común de errores en controladores: P2025 → 404, resto → 500 (registrado en el log).
 */
export const handlePrismaError = (
  res: Response,
  error: unknown,
  context: string,
  notFoundMessage: string,
  serverErrorMessage: string,
): void => {
  if (isNotFoundError(error)) {
    res.status(404).json({ success: false, message: notFoundMessage });
    return;
  }
  logger.error({ err: error }, `Error en ${context}`);
  res.status(500).json({ success: false, message: serverErrorMessage });
};

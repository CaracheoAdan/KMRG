import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Comparación en tiempo constante para evitar ataques de temporización.
 * Se comparan hashes SHA-256 para que ambas entradas tengan la misma longitud.
 */
const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

export const requireMobileApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'];

  if (typeof apiKey !== 'string' || !safeEqual(apiKey, env.MOBILE_API_KEY)) {
    res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: API Key móvil inválida o ausente',
    });
    return;
  }

  next();
};

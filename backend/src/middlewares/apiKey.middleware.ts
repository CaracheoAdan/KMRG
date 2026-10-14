import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const requireMobileApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.MOBILE_API_KEY) {
    res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: API Key móvil inválida o ausente',
    });
    return;
  }

  next();
};

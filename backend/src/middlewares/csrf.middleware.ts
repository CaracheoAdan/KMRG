import { Request, Response, NextFunction } from 'express';

export const CSRF_HEADER = 'x-requested-with';
export const CSRF_HEADER_VALUE = 'kmrg-admin';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa CSRF complementaria a SameSite=Strict: exige una cabecera personalizada que un
 * formulario HTML de otro origen no puede enviar (y que fuerza un preflight CORS).
 */
export const requireCsrfHeader = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    res.status(403).json({ success: false, message: 'Falta la cabecera anti-CSRF requerida' });
    return;
  }
  next();
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AdminPayload;
}

export const JWT_ISSUER = 'kmrg-backend';
export const JWT_AUDIENCE = 'kmrg-admin';
export const SESSION_COOKIE_NAME = 'kmrg_session';

export const requireAdminAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (typeof token !== 'string' || !token) {
    res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Sesión requerida',
    });
    return;
  }

  try {
    // Fijar algoritmo, emisor y audiencia evita ataques de confusión de algoritmo/token.
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof decoded.userId !== 'string' ||
      typeof decoded.email !== 'string'
    ) {
      throw new Error('Payload JWT inválido');
    }

    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Sesión inválida o expirada',
    });
  }
};


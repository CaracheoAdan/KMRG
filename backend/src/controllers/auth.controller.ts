import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  AuthenticatedRequest,
  JWT_AUDIENCE,
  JWT_ISSUER,
  SESSION_COOKIE_NAME,
} from '../middlewares/auth.middleware';

const BCRYPT_COST = 12;

// Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe
// (evita enumeración de correos por temporización).
const DUMMY_HASH = bcrypt.hashSync('kmrg-dummy-password-for-timing', BCRYPT_COST);

const parseDurationMs = (spec: string): number => {
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(spec.trim());
  if (!match) return 12 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = (match[2] ?? 's').toLowerCase();
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 12 * 60 * 60 * 1000;
  }
};

const sessionCookieBaseOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.body.email).toLowerCase().trim();
    const { password } = req.body as { password: string };

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    const isMatch = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !isMatch) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      subject: user.id,
    });

    res.cookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieBaseOptions,
      maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
    });

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: { id: user.id, email: user.email },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en loginAdmin');
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export const logoutAdmin = (_req: Request, res: Response): void => {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieBaseOptions);
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente',
  });
};

export const getCurrentAdmin = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado' });
    return;
  }

  res.json({
    success: true,
    data: {
      user: { id: req.user.userId, email: req.user.email },
    },
  });
};

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!env.ALLOW_ADMIN_REGISTRATION) {
      res.status(403).json({ success: false, message: 'El registro de administradores está deshabilitado' });
      return;
    }

    const email = String(req.body.email).toLowerCase().trim();
    const { password } = req.body as { password: string };

    // Verificar si ya existe el usuario
    const existingUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ success: false, message: 'El usuario ya existe' });
      return;
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_COST);

    const newUser = await prisma.adminUser.create({
      data: {
        email,
        password_hash,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Administrador registrado con éxito',
      data: newUser,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en registerAdmin');
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};


import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (error) {
    console.error('Error en loginAdmin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Verificar si ya existe el usuario
    const existingUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ success: false, message: 'El usuario ya existe' });
      return;
    }

    // Hash con factor de costo 10
    const password_hash = await bcrypt.hash(password, 10);

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
    console.error('Error en registerAdmin:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

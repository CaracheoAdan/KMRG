import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

const mockPrisma = vi.hoisted(() => ({
  adminUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  milestone: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  interaction: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../src/config/prisma', () => ({
  prisma: mockPrisma,
}));

import app from '../src/app';
import { env } from '../src/config/env';
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  SESSION_COOKIE_NAME,
} from '../src/middlewares/auth.middleware';
import { CSRF_HEADER, CSRF_HEADER_VALUE } from '../src/middlewares/csrf.middleware';

const buildAdminCookie = (
  payload = { userId: '11111111-1111-4111-8111-111111111111', email: 'admin@kmrg.app' },
): string => {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    subject: payload.userId,
  });
  return `${SESSION_COOKIE_NAME}=${token}`;
};

describe('KMRG Backend API Security & Contract Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Auth & Session Cookie', () => {
    it('rechaza POST /api/auth/register sin autenticación (401/403)', async () => {
      const resNoCsrf = await request(app)
        .post('/api/auth/register')
        .send({ email: 'nuevo@kmrg.app', password: 'PasswordValida123' });
      expect([401, 403]).toContain(resNoCsrf.status);

      const resNoCookie = await request(app)
        .post('/api/auth/register')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({ email: 'nuevo@kmrg.app', password: 'PasswordValida123' });
      expect(resNoCookie.status).toBe(401);
    });

    it('rechaza POST /api/auth/login con credenciales inválidas (401)', async () => {
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@kmrg.app', password: 'WrongPassword123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('POST /api/auth/login válido setea cookie httpOnly kmrg_session y no expone el token en el body', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123', 10);
      mockPrisma.adminUser.findUnique.mockResolvedValueOnce({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@kmrg.app',
        password_hash: passwordHash,
        created_at: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@kmrg.app', password: 'CorrectPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'admin@kmrg.app',
      });
      expect(res.body.data.token).toBeUndefined();

      const setCookie = res.headers['set-cookie'];
      expect(setCookie).toBeDefined();
      const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
      expect(cookieHeader).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(cookieHeader).toMatch(/HttpOnly/i);
      expect(cookieHeader).toMatch(/SameSite=Lax/i);
    });

    it('GET /api/auth/me devuelve el usuario cuando la cookie es válida y 401 sin cookie', async () => {
      const unauth = await request(app).get('/api/auth/me');
      expect(unauth.status).toBe(401);

      const auth = await request(app)
        .get('/api/auth/me')
        .set('Cookie', buildAdminCookie());
      expect(auth.status).toBe(200);
      expect(auth.body.data.user.email).toBe('admin@kmrg.app');
    });
  });

  describe('Admin Auth, CSRF, Validation & Prisma P2025', () => {
    it('rechaza acceso a /api/admin/* sin cookie de sesión (401)', async () => {
      const res = await request(app).get('/api/admin/messages');
      expect(res.status).toBe(401);
    });

    it('rechaza peticiones no-GET a /api/admin/* sin cabecera CSRF (403)', async () => {
      const res = await request(app)
        .post('/api/admin/messages')
        .set('Cookie', buildAdminCookie())
        .send({
          content: 'Hola',
          scheduled_date: '2026-10-21',
          theme_color: '#ff0055',
        });

      expect(res.status).toBe(403);
    });

    it('valida formato de color (#RRGGBB) y fecha calendario (YYYY-MM-DD) devolviendo 400', async () => {
      const badColor = await request(app)
        .post('/api/admin/messages')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          content: 'Mensaje con color inválido',
          scheduled_date: '2026-10-21',
          theme_color: 'rojo-bonito',
        });
      expect(badColor.status).toBe(400);

      const badDate = await request(app)
        .post('/api/admin/messages')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          content: 'Mensaje con fecha inexistente',
          scheduled_date: '2026-02-30',
          theme_color: '#ff0055',
        });
      expect(badDate.status).toBe(400);
    });

    it('convierte error Prisma P2025 en 404 al actualizar un recurso inexistente', async () => {
      mockPrisma.message.update.mockRejectedValueOnce({ code: 'P2025' });

      const res = await request(app)
        .put('/api/admin/messages/22222222-2222-4222-8222-222222222222')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({ is_read: true });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Mobile Endpoints & Security', () => {
    it('rechaza acceso a /api/mobile/* sin x-api-key válida (401)', async () => {
      const res = await request(app).get('/api/mobile/messages/sync');
      expect(res.status).toBe(401);
    });

    it('rechaza POST /api/mobile/interact con type fuera de la lista blanca (400)', async () => {
      const res = await request(app)
        .post('/api/mobile/interact')
        .set('x-api-key', env.MOBILE_API_KEY)
        .send({ type: 'hacked_event', payload: {} });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/mobile/milestones devuelve hitos ordenados y POST /api/mobile/messages/:id/read maneja éxito y 404', async () => {
      mockPrisma.milestone.findMany.mockResolvedValueOnce([
        {
          id: '33333333-3333-4333-8333-333333333333',
          title: 'Primer viaje',
          date: new Date('2024-06-20'),
          image_url: 'https://placehold.co/600x400',
          created_at: new Date(),
        },
      ]);

      const milestonesRes = await request(app)
        .get('/api/mobile/milestones')
        .set('x-api-key', env.MOBILE_API_KEY);
      expect(milestonesRes.status).toBe(200);
      expect(milestonesRes.body.success).toBe(true);
      expect(milestonesRes.body.data).toHaveLength(1);

      mockPrisma.message.update.mockResolvedValueOnce({
        id: '44444444-4444-4444-8444-444444444444',
        is_read: true,
      });

      const readOk = await request(app)
        .post('/api/mobile/messages/44444444-4444-4444-8444-444444444444/read')
        .set('x-api-key', env.MOBILE_API_KEY);
      expect(readOk.status).toBe(200);
      expect(readOk.body.success).toBe(true);

      mockPrisma.message.update.mockRejectedValueOnce({ code: 'P2025' });
      const readNotFound = await request(app)
        .post('/api/mobile/messages/44444444-4444-4444-8444-444444444444/read')
        .set('x-api-key', env.MOBILE_API_KEY);
      expect(readNotFound.status).toBe(404);
    });
  });
});

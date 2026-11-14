import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';

const mockPrisma = vi.hoisted(() => ({
  adminUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  message: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  milestone: {
    findMany: vi.fn(),
    count: vi.fn(),
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

vi.mock('../src/config/supabase', () => ({
  supabase: null,
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

describe('KMRG Admin Bulk Messages & Stats Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/messages/bulk', () => {
    it('rechaza peticiones sin autenticación o sin cabecera CSRF', async () => {
      const noCsrf = await request(app)
        .post('/api/admin/messages/bulk')
        .set('Cookie', buildAdminCookie())
        .send({ messages: [] });
      expect(noCsrf.status).toBe(403);

      const noAuth = await request(app)
        .post('/api/admin/messages/bulk')
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({ messages: [] });
      expect(noAuth.status).toBe(401);
    });

    it('devuelve 400 cuando el arreglo messages está vacío o tiene datos inválidos', async () => {
      const emptyRes = await request(app)
        .post('/api/admin/messages/bulk')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({ messages: [] });
      expect(emptyRes.status).toBe(400);

      const invalidDateRes = await request(app)
        .post('/api/admin/messages/bulk')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          messages: [
            {
              sender: 'Javier',
              recipient: 'Karla',
              content: 'Te amo mucho',
              scheduled_date: '2026-02-30',
              theme_color: '#e63946',
            },
          ],
        });
      expect(invalidDateRes.status).toBe(400);
    });

    it('crea múltiples mensajes en lote y devuelve 201 con la cantidad creada', async () => {
      mockPrisma.message.createMany.mockResolvedValueOnce({ count: 2 });

      const res = await request(app)
        .post('/api/admin/messages/bulk')
        .set('Cookie', buildAdminCookie())
        .set(CSRF_HEADER, CSRF_HEADER_VALUE)
        .send({
          messages: [
            {
              sender: 'Javier',
              recipient: 'Karla',
              content: 'Carta día 1: Eres mi lugar favorito',
              scheduled_date: '2026-11-10',
              theme_color: '#e63946',
            },
            {
              sender: 'Javier',
              recipient: 'Karla',
              content: 'Carta día 2: Gracias por existir',
              scheduled_date: '2026-11-11',
              theme_color: '#9333ea',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.created).toBe(2);
      expect(mockPrisma.message.createMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('rechaza acceso sin sesión de administrador (401)', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });

    it('calcula y retorna métricas completas de cartas, hitos, interacciones y racha (200)', async () => {
      const todayIso = new Date().toISOString().split('T')[0];
      mockPrisma.message.findMany.mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          sender: 'Javier',
          recipient: 'Karla',
          scheduled_date: new Date(`${todayIso}T00:00:00.000Z`),
          is_read: true,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          sender: 'Karla',
          recipient: 'Javier',
          scheduled_date: new Date('2099-12-31T00:00:00.000Z'),
          is_read: false,
        },
      ]);
      mockPrisma.milestone.count.mockResolvedValueOnce(5);
      mockPrisma.interaction.findMany.mockResolvedValueOnce([
        {
          id: '33333333-3333-4333-8333-333333333333',
          sender: 'Karla',
          type: 'thinking_of_you',
          payload: {},
          created_at: new Date(),
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          sender: 'Javier',
          type: 'sync_streak',
          payload: { count: 14 },
          created_at: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/admin/stats?days=30')
        .set('Cookie', buildAdminCookie());

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages.total).toBe(2);
      expect(res.body.data.messages.read).toBe(1);
      expect(res.body.data.messages.unread).toBe(1);
      expect(res.body.data.messages.future).toBe(1);
      expect(res.body.data.milestones.total).toBe(5);
      expect(res.body.data.interactions.total).toBe(2);
      expect(res.body.data.streakCount).toBe(14);
      expect(Array.isArray(res.body.data.interactions.perDay)).toBe(true);
    });
  });
});

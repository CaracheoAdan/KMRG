-- ==========================================================
-- SCRIPT DE MIGRACIÓN SUPABASE - SISTEMA KMRG ETERNO
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/pnkhsdoprjssiimwlijc/sql
-- ==========================================================

-- 1. Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Mensajes (Cartas diarias entre los dos)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender VARCHAR(50) NOT NULL DEFAULT 'Javier',       -- 'Javier' o 'Ella'
    recipient VARCHAR(50) NOT NULL DEFAULT 'Ella',     -- 'Javier' o 'Ella'
    content TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    theme_color VARCHAR(50) NOT NULL DEFAULT '#e63946',
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla de Recuerdos (Hitos con fotos de la historia juntos)
CREATE TABLE IF NOT EXISTS milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author VARCHAR(50) NOT NULL DEFAULT 'Javier',
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla de Interacciones ("Pensando en ti" / Latidos en tiempo real)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender VARCHAR(50) NOT NULL DEFAULT 'Javier',
    type VARCHAR(100) NOT NULL DEFAULT 'thinking_of_you',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Habilitar Row Level Security (RLS) con políticas públicas anónimas
-- Esto permite que la app móvil funcione con la clave anon sin necesidad de login complejo
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura universales para la pareja
CREATE POLICY "Permitir todo en messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo en interactions" ON interactions FOR ALL USING (true) WITH CHECK (true);

-- 6. Activar replicación en Tiempo Real para notificaciones instantáneas
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;

-- 7. Datos de bienvenida iniciales para estrenar la app
INSERT INTO messages (sender, recipient, content, scheduled_date, theme_color) VALUES 
('Javier', 'Ella', '¡Hola mi amor! Esta aplicación ahora vive en nuestros teléfonos para siempre, guardando cada uno de nuestros momentos.', CURRENT_DATE, '#e63946')
ON CONFLICT DO NOTHING;

INSERT INTO milestones (author, title, date, image_url) VALUES 
('Javier', 'Nuestro primer recuerdo en la app', CURRENT_DATE, 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800')
ON CONFLICT DO NOTHING;

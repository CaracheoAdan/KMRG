-- ==========================================================
-- SCRIPT DE MIGRACIÓN SUPABASE - SISTEMA KMRG ETERNO
-- Ejecuta este script en el SQL Editor de tu panel de Supabase:
-- https://supabase.com/dashboard/project/your-project-id/sql
-- ==========================================================

-- 1. Habilitar extensión UUID si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tabla de Mensajes (Cartas diarias entre los dos)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender VARCHAR(50) NOT NULL DEFAULT 'Javier',       -- 'Javier' o 'Ella' / 'Karla'
    recipient VARCHAR(50) NOT NULL DEFAULT 'Karla',    -- 'Javier' o 'Karla'
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
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

-- 4. Tabla de Interacciones ("Pensando en ti" / Latidos en tiempo real / Estados de sincronización)
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender VARCHAR(50) NOT NULL DEFAULT 'Javier',
    type VARCHAR(100) NOT NULL DEFAULT 'thinking_of_you',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alto rendimiento para búsquedas instantáneas
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON messages (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient);
CREATE INDEX IF NOT EXISTS idx_interactions_type_created ON interactions (type, created_at DESC);

-- 5. Habilitar Row Level Security (RLS) con políticas públicas anónimas
-- Esto permite que la app móvil funcione con la clave anon sin necesidad de login complejo
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura universales para la pareja (idempotentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Permitir todo en messages') THEN
        CREATE POLICY "Permitir todo en messages" ON messages FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'milestones' AND policyname = 'Permitir todo en milestones') THEN
        CREATE POLICY "Permitir todo en milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interactions' AND policyname = 'Permitir todo en interactions') THEN
        CREATE POLICY "Permitir todo en interactions" ON interactions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 6. Activar replicación en Tiempo Real para notificaciones instantáneas (idempotente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'milestones'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'interactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
    END IF;
END $$;

-- 7. Configuración de Supabase Storage para Multimedia (Fotos y Notas de Voz)
-- Crear bucket público 'kmrg-media' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kmrg-media',
    'kmrg-media',
    true,
    52428800, -- 50 MB límite por archivo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/aac'];

-- Políticas de Storage para acceso público de la pareja
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir lectura publica kmrg-media') THEN
        CREATE POLICY "Permitir lectura publica kmrg-media" ON storage.objects
        FOR SELECT USING (bucket_id = 'kmrg-media');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir subida publica kmrg-media') THEN
        CREATE POLICY "Permitir subida publica kmrg-media" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'kmrg-media');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir actualizacion publica kmrg-media') THEN
        CREATE POLICY "Permitir actualizacion publica kmrg-media" ON storage.objects
        FOR UPDATE USING (bucket_id = 'kmrg-media');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Permitir eliminacion publica kmrg-media') THEN
        CREATE POLICY "Permitir eliminacion publica kmrg-media" ON storage.objects
        FOR DELETE USING (bucket_id = 'kmrg-media');
    END IF;
END $$;

-- 8. Función de mantenimiento y poda para optimizar rendimiento
CREATE OR REPLACE FUNCTION prune_kmrg_interactions()
RETURNS void AS $$
BEGIN
    -- Eliminar latidos efímeros de más de 3 días
    DELETE FROM interactions
    WHERE type = 'thinking_of_you'
      AND created_at < NOW() - INTERVAL '3 days';

    -- Podar estados antiguos conservando solo las 5 versiones más recientes por tipo
    DELETE FROM interactions
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at DESC) as rn
            FROM interactions
            WHERE type IN ('sync_home_state', 'sync_movies_state', 'sync_games_state', 'sync_places_state')
        ) ranked
        WHERE rn > 5
    );
END;
$$ LANGUAGE plpgsql;

-- 9. Datos de bienvenida iniciales para estrenar la app
INSERT INTO messages (sender, recipient, content, scheduled_date, theme_color) VALUES 
('Javier', 'Ella', '¡Hola mi amor! Esta aplicación ahora vive en nuestros teléfonos para siempre, guardando cada uno de nuestros momentos.', CURRENT_DATE, '#e63946')
ON CONFLICT DO NOTHING;

INSERT INTO milestones (author, title, date, image_url) VALUES 
('Javier', 'Nuestro primer recuerdo en la app', CURRENT_DATE, 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800')
ON CONFLICT DO NOTHING;

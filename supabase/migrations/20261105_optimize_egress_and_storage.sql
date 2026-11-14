-- ============================================================================
-- KMRG · OPTIMIZACIÓN DE EGRESS, PODA DE INTERACCIONES Y BUCKET MULTIMEDIA
-- Ejecuta este script en el SQL Editor de tu panel de Supabase
-- ============================================================================

-- 1. Crear el bucket público 'kmrg-media' en Supabase Storage (usa tu 1 GB gratis de Storage
--    en lugar de guardar imágenes/audios en Base64 dentro de las tablas PostgreSQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kmrg-media',
  'kmrg-media',
  true,
  10485760, -- 10 MB máximo por archivo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'audio/m4a', 'audio/mp4', 'audio/mpeg', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas RLS para permitir lectura y subida al bucket 'kmrg-media'
DROP POLICY IF EXISTS "KMRG lectura publica multimedia" ON storage.objects;
CREATE POLICY "KMRG lectura publica multimedia"
ON storage.objects FOR SELECT
USING (bucket_id = 'kmrg-media');

DROP POLICY IF EXISTS "KMRG subida multimedia pareja" ON storage.objects;
CREATE POLICY "KMRG subida multimedia pareja"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kmrg-media');

DROP POLICY IF EXISTS "KMRG actualizacion multimedia pareja" ON storage.objects;
CREATE POLICY "KMRG actualizacion multimedia pareja"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kmrg-media');

-- 2. Índices compuestos para consultas incrementales ultra-rápidas sin escaneo completo
CREATE INDEX IF NOT EXISTS idx_interactions_type_created_desc
  ON interactions (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactions_sender_created_desc
  ON interactions (sender, created_at DESC);

-- 3. Permitir poda (DELETE) en interactions y convertir prune_kmrg_interactions() en SECURITY DEFINER
DROP POLICY IF EXISTS "KMRG poda interacciones antiguas" ON interactions;
CREATE POLICY "KMRG poda interacciones antiguas"
  ON interactions FOR DELETE
  USING (sender IN ('Javier', 'Karla'));

CREATE OR REPLACE FUNCTION prune_kmrg_interactions()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Eliminar latidos efímeros de más de 24 horas
    DELETE FROM interactions
    WHERE type = 'thinking_of_you'
      AND created_at < NOW() - INTERVAL '24 hours';

    -- Podar estados antiguos conservando únicamente las 2 versiones más recientes por tipo
    DELETE FROM interactions
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at DESC) as rn
            FROM interactions
            WHERE type IN ('sync_home_state', 'sync_movies_state', 'sync_games_state', 'sync_places_state')
        ) ranked
        WHERE rn > 2
    );

    -- Eliminar cualquier otra interacción transitoria antigua (> 7 días)
    DELETE FROM interactions
    WHERE type NOT IN ('sync_home_state', 'sync_movies_state', 'sync_games_state', 'sync_places_state')
      AND created_at < NOW() - INTERVAL '7 days';

    -- Limpiar bitácora de push_log de más de 14 días
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_log') THEN
        DELETE FROM push_log
        WHERE created_at < NOW() - INTERVAL '14 days';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Ejecutar limpieza inmediata para liberar los ~94 MB acumulados en la base de datos
SELECT prune_kmrg_interactions();

-- ============================================================================
-- MIGRACIÓN: LOG DE NOTIFICACIONES PUSH Y PROGRAMACIÓN PG_CRON (7 AM MÉXICO)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Tabla de idempotencia para evitar notificaciones duplicadas el mismo día
CREATE TABLE IF NOT EXISTS push_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dedup_key VARCHAR(255) NOT NULL UNIQUE,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_log_created_at ON push_log (created_at DESC);

ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;

-- Solo el service_role (Edge Functions / Backend) necesita escribir en push_log
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'push_log' AND policyname = 'Lectura push_log autenticada'
    ) THEN
        CREATE POLICY "Lectura push_log autenticada" ON push_log
        FOR SELECT USING (true);
    END IF;
END $$;

-- 2. Limpieza automática de registros push_log mayores a 60 días en prune_kmrg_interactions()
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

    -- Limpiar bitácora de push_log de más de 60 días
    DELETE FROM push_log
    WHERE created_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql;

-- 3. Programar poda diaria de interacciones a las 09:00 UTC (03:00 AM Ciudad de México)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kmrg-prune-interactions') THEN
        PERFORM cron.unschedule('kmrg-prune-interactions');
    END IF;

    PERFORM cron.schedule(
        'kmrg-prune-interactions',
        '0 9 * * *',
        $job$SELECT prune_kmrg_interactions();$job$
    );
END $$;

-- 4. Programar disparo de la Edge Function `daily-push` a las 13:00 UTC (07:00 AM Ciudad de México)
-- Nota: Configura en Supabase Vault o parámetros de base de datos `app.settings.supabase_url`
-- y `app.settings.service_role_key` antes de habilitar en producción.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kmrg-daily-push-7am') THEN
        PERFORM cron.unschedule('kmrg-daily-push-7am');
    END IF;

    PERFORM cron.schedule(
        'kmrg-daily-push-7am',
        '0 13 * * *',
        $job$
        SELECT net.http_post(
            url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://your-project-id.supabase.co') || '/functions/v1/daily-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.service_role_key', true), '')
            ),
            body := '{}'::jsonb
        );
        $job$
    );
END $$;

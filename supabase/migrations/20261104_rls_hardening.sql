-- ==========================================================
-- KMRG · Migración de Endurecimiento de RLS y Validación de Payloads (2026-11-04)
-- Reemplaza políticas abiertas `USING (true) WITH CHECK (true)` por
-- validaciones estrictas de remitente, autor y tipos de sincronización.
-- ==========================================================

-- 1. Endurecer tabla `interactions` (usada para sincronización de juegos y estados)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interactions') THEN
        ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Permitir lectura de interacciones" ON interactions;
        DROP POLICY IF EXISTS "Permitir inserción de interacciones" ON interactions;
        DROP POLICY IF EXISTS "Permitir todo en interactions" ON interactions;
        DROP POLICY IF EXISTS "KMRG lectura interacciones validas" ON interactions;
        DROP POLICY IF EXISTS "KMRG insercion interacciones validas" ON interactions;

        CREATE POLICY "KMRG lectura interacciones validas"
            ON interactions FOR SELECT
            USING (sender IN ('Javier', 'Karla', 'Admin'));

        CREATE POLICY "KMRG insercion interacciones validas"
            ON interactions FOR INSERT
            WITH CHECK (
                sender IN ('Javier', 'Karla', 'Admin')
                AND char_length(type) BETWEEN 1 AND 64
                AND jsonb_typeof(payload) = 'object'
            );
    END IF;
END $$;

-- 1b. Endurecer tablas base `messages` y `milestones`
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Permitir todo en messages" ON messages;
        DROP POLICY IF EXISTS "KMRG acceso validado en messages" ON messages;
        CREATE POLICY "KMRG acceso validado en messages"
            ON messages FOR ALL
            USING (sender IN ('Javier', 'Karla', 'Ella'))
            WITH CHECK (
                sender IN ('Javier', 'Karla', 'Ella')
                AND recipient IN ('Javier', 'Karla', 'Ella')
                AND char_length(content) BETWEEN 1 AND 500000
            );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'milestones') THEN
        ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Permitir todo en milestones" ON milestones;
        DROP POLICY IF EXISTS "KMRG acceso validado en milestones" ON milestones;
        CREATE POLICY "KMRG acceso validado en milestones"
            ON milestones FOR ALL
            USING (author IN ('Javier', 'Karla', 'Ella'))
            WITH CHECK (
                author IN ('Javier', 'Karla', 'Ella')
                AND char_length(title) BETWEEN 1 AND 255
            );
    END IF;
END $$;

-- 2. Reemplazar políticas permisivas en tablas de funcionalidades de pareja
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'daily_answers', 'quiz_questions', 'quiz_attempts', 'gratitude_entries',
        'couple_events', 'important_dates', 'savings_goals', 'savings_contributions',
        'push_tokens', 'love_coupons', 'first_times', 'shared_doodles'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Permitir todo en ' || t, t);
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'KMRG acceso validado en ' || t, t);
        END IF;
    END LOOP;
END $$;

CREATE POLICY "KMRG acceso validado en daily_answers"
    ON daily_answers FOR ALL
    USING (profile IN ('Javier', 'Karla'))
    WITH CHECK (profile IN ('Javier', 'Karla') AND char_length(answer) BETWEEN 1 AND 1000);

CREATE POLICY "KMRG acceso validado en quiz_questions"
    ON quiz_questions FOR ALL
    USING (author IN ('Javier', 'Karla'))
    WITH CHECK (author IN ('Javier', 'Karla') AND jsonb_typeof(options) = 'array');

CREATE POLICY "KMRG acceso validado en quiz_attempts"
    ON quiz_attempts FOR ALL
    USING (profile IN ('Javier', 'Karla'))
    WITH CHECK (profile IN ('Javier', 'Karla') AND chosen_index BETWEEN 0 AND 3);

CREATE POLICY "KMRG acceso validado en gratitude_entries"
    ON gratitude_entries FOR ALL
    USING (profile IN ('Javier', 'Karla'))
    WITH CHECK (profile IN ('Javier', 'Karla') AND char_length(text) BETWEEN 1 AND 1000);

CREATE POLICY "KMRG acceso validado en couple_events"
    ON couple_events FOR ALL
    USING (created_by IN ('Javier', 'Karla'))
    WITH CHECK (created_by IN ('Javier', 'Karla') AND char_length(title) BETWEEN 1 AND 160);

CREATE POLICY "KMRG acceso validado en important_dates"
    ON important_dates FOR ALL
    USING (created_by IN ('Javier', 'Karla'))
    WITH CHECK (created_by IN ('Javier', 'Karla') AND char_length(title) BETWEEN 1 AND 160);

CREATE POLICY "KMRG acceso validado en savings_goals"
    ON savings_goals FOR ALL
    USING (created_by IN ('Javier', 'Karla'))
    WITH CHECK (created_by IN ('Javier', 'Karla') AND target_amount > 0);

CREATE POLICY "KMRG acceso validado en savings_contributions"
    ON savings_contributions FOR ALL
    USING (profile IN ('Javier', 'Karla'))
    WITH CHECK (profile IN ('Javier', 'Karla') AND amount <> 0);

CREATE POLICY "KMRG acceso validado en push_tokens"
    ON push_tokens FOR ALL
    USING (profile IN ('Javier', 'Karla'))
    WITH CHECK (profile IN ('Javier', 'Karla') AND char_length(token) > 0);

CREATE POLICY "KMRG acceso validado en love_coupons"
    ON love_coupons FOR ALL
    USING (issued_by IN ('Javier', 'Karla') AND recipient IN ('Javier', 'Karla'))
    WITH CHECK (issued_by IN ('Javier', 'Karla') AND recipient IN ('Javier', 'Karla'));

CREATE POLICY "KMRG acceso validado en first_times"
    ON first_times FOR ALL
    USING (created_by IN ('Javier', 'Karla'))
    WITH CHECK (created_by IN ('Javier', 'Karla') AND char_length(title) BETWEEN 1 AND 160);

CREATE POLICY "KMRG acceso validado en shared_doodles"
    ON shared_doodles FOR ALL
    USING (author IN ('Javier', 'Karla'))
    WITH CHECK (author IN ('Javier', 'Karla') AND jsonb_typeof(strokes) = 'array');

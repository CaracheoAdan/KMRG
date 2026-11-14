-- ==========================================================
-- KMRG · Migración Features v2 (2026-11-02)
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de supabase_setup.sql.
-- Script idempotente: puede ejecutarse varias veces sin romper nada.
--
-- Tablas nuevas (relacionales, en lugar de blobs JSON en `interactions`):
--   daily_answers, quiz_questions, quiz_attempts, gratitude_entries,
--   couple_events, important_dates, savings_goals, savings_contributions,
--   push_tokens
--
-- NOTA DE SEGURIDAD: igual que las tablas existentes, se usan políticas RLS
-- permisivas porque la app móvil opera con la clave anon sin login. La
-- "ocultación" de respuestas de la pareja (pregunta del día) es a nivel de
-- cliente. Ver ARCHITECTURE_AND_SECURITY.md.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Pregunta del día ──
CREATE TABLE IF NOT EXISTS daily_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_date DATE NOT NULL,
    question_id VARCHAR(64) NOT NULL,
    profile VARCHAR(50) NOT NULL CHECK (profile IN ('Javier', 'Karla')),
    answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (question_date, profile)
);
CREATE INDEX IF NOT EXISTS idx_daily_answers_date ON daily_answers (question_date DESC);

-- ── Quiz "¿Qué tanto me conoces?" ──
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author VARCHAR(50) NOT NULL CHECK (author IN ('Javier', 'Karla')),
    question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
    options JSONB NOT NULL,                     -- array de 2..4 strings
    correct_index SMALLINT NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_author ON quiz_questions (author, created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    profile VARCHAR(50) NOT NULL CHECK (profile IN ('Javier', 'Karla')),
    chosen_index SMALLINT NOT NULL CHECK (chosen_index BETWEEN 0 AND 3),
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (question_id, profile)
);

-- ── Diario de gratitud ──
CREATE TABLE IF NOT EXISTS gratitude_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL,
    profile VARCHAR(50) NOT NULL CHECK (profile IN ('Javier', 'Karla')),
    text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entry_date, profile)
);
CREATE INDEX IF NOT EXISTS idx_gratitude_date ON gratitude_entries (entry_date DESC);

-- ── Agenda compartida de citas ──
CREATE TABLE IF NOT EXISTS couple_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(160) NOT NULL,
    event_date DATE NOT NULL,
    event_time VARCHAR(5),                      -- 'HH:mm' opcional
    location VARCHAR(255),
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    remind_minutes_before INTEGER NOT NULL DEFAULT 60 CHECK (remind_minutes_before BETWEEN 0 AND 10080),
    created_by VARCHAR(50) NOT NULL CHECK (created_by IN ('Javier', 'Karla')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_couple_events_date ON couple_events (event_date);

-- ── Fechas importantes (cumpleaños, mesiversarios, personalizadas) ──
CREATE TABLE IF NOT EXISTS important_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(160) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'custom'
        CHECK (kind IN ('birthday', 'anniversary', 'monthiversary', 'custom')),
    date DATE NOT NULL,
    recurring_yearly BOOLEAN NOT NULL DEFAULT true,
    owner VARCHAR(50) CHECK (owner IS NULL OR owner IN ('Javier', 'Karla')),
    created_by VARCHAR(50) NOT NULL CHECK (created_by IN ('Javier', 'Karla')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_important_dates_date ON important_dates (date);

-- ── Alcancía / metas de ahorro ──
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(160) NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    deadline DATE,
    linked_bucket_item_id VARCHAR(64),          -- id de BucketItem (lista de planes) opcional
    emoji VARCHAR(16),
    created_by VARCHAR(50) NOT NULL CHECK (created_by IN ('Javier', 'Karla')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
    profile VARCHAR(50) NOT NULL CHECK (profile IN ('Javier', 'Karla')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount <> 0),   -- negativo = retiro
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_savings_contrib_goal ON savings_contributions (goal_id, created_at DESC);

-- ── Push tokens (reemplaza homeState.pushTokens como fuente de verdad) ──
CREATE TABLE IF NOT EXISTS push_tokens (
    profile VARCHAR(50) PRIMARY KEY CHECK (profile IN ('Javier', 'Karla')),
    token TEXT NOT NULL,
    platform VARCHAR(20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cuponera de Amor Canjeable ("Vales de Pareja") ──
CREATE TABLE IF NOT EXISTS love_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(160) NOT NULL,
    description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
    emoji VARCHAR(16) NOT NULL DEFAULT '🎟️',
    issued_by VARCHAR(50) NOT NULL CHECK (issued_by IN ('Javier', 'Karla')),
    recipient VARCHAR(50) NOT NULL CHECK (recipient IN ('Javier', 'Karla')),
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_love_coupons_recipient ON love_coupons (recipient, is_redeemed, created_at DESC);

-- ── Contador de "Primeras Veces" ──
CREATE TABLE IF NOT EXISTS first_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(160) NOT NULL,
    category VARCHAR(60) NOT NULL DEFAULT 'Especial',
    event_date DATE NOT NULL,
    notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
    photo_url TEXT,
    created_by VARCHAR(50) NOT NULL CHECK (created_by IN ('Javier', 'Karla')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_first_times_date ON first_times (event_date DESC);

-- ── Pizarra de Dibujo en Servilleta ("Notita Dibujada") ──
CREATE TABLE IF NOT EXISTS shared_doodles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author VARCHAR(50) NOT NULL CHECK (author IN ('Javier', 'Karla')),
    title VARCHAR(160) NOT NULL DEFAULT 'Dibujito para ti',
    strokes JSONB NOT NULL DEFAULT '[]'::jsonb,
    background_color VARCHAR(20) NOT NULL DEFAULT '#fffdf6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shared_doodles_created ON shared_doodles (created_at DESC);

-- ── RLS + políticas permisivas (mismo modelo que supabase_setup.sql) ──
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
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Permitir todo en ' || t
        ) THEN
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true)',
                'Permitir todo en ' || t, t
            );
        END IF;
    END LOOP;
END $$;

-- ── Realtime para sincronización instantánea entre los dos teléfonos ──
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'daily_answers', 'quiz_questions', 'quiz_attempts', 'gratitude_entries',
        'couple_events', 'important_dates', 'savings_goals', 'savings_contributions',
        'love_coupons', 'first_times', 'shared_doodles'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
        END IF;
    END LOOP;
END $$;

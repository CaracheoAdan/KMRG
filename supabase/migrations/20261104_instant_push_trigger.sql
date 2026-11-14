-- ============================================================================
-- MIGRACIÓN: DISPARADOR DE NOTIFICACIONES PUSH INMEDIATAS DESDE POSTGRES (pg_net)
-- ============================================================================
-- Garantiza que cuando cualquier dispositivo inserte un latido ('thinking_of_you'),
-- una carta ('messages'), un recuerdo ('milestones') o un dibujito ('shared_doodles'),
-- PostgreSQL envíe también el Push inmediatamente a Expo Push API usando `pg_net`,
-- despertando el teléfono de la pareja en 1-2 segundos incluso si su app está cerrada
-- o si el remitente cerró la app justo después de tocar el botón.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_partner_instant_push()
RETURNS TRIGGER AS $$
DECLARE
    sender_profile TEXT;
    recipient_profile TEXT;
    sender_label TEXT;
    target_token TEXT;
    notif_title TEXT;
    notif_body TEXT;
    notif_type TEXT;
BEGIN
    IF TG_TABLE_NAME = 'interactions' THEN
        sender_profile := NEW.sender;
        IF NEW.type = 'thinking_of_you' THEN
            recipient_profile := CASE WHEN sender_profile = 'Karla' THEN 'Javier' ELSE 'Karla' END;
            sender_label := CASE WHEN sender_profile = 'Karla' THEN 'Karlita' ELSE 'Javier' END;
            notif_title := '❤️ Latido de ' || sender_label;
            notif_body := '¡' || sender_label || ' está pensando en ti en este momento!';
            notif_type := 'HEARTBEAT';
        ELSE
            RETURN NEW;
        END IF;
    ELSIF TG_TABLE_NAME = 'messages' THEN
        IF NEW.scheduled_date > (NOW() AT TIME ZONE 'America/Mexico_City')::date THEN
            RETURN NEW;
        END IF;
        sender_profile := NEW.sender;
        recipient_profile := CASE WHEN sender_profile = 'Karla' THEN 'Javier' ELSE 'Karla' END;
        sender_label := CASE WHEN sender_profile = 'Karla' THEN 'Karlita' ELSE 'Javier' END;
        notif_title := '💌 Nueva carta de ' || sender_label;
        notif_body := '¡' || sender_label || ' te ha escrito una carta especial!';
        notif_type := 'SEALED_LETTER';
    ELSIF TG_TABLE_NAME = 'shared_doodles' THEN
        sender_profile := NEW.author;
        recipient_profile := CASE WHEN sender_profile = 'Karla' THEN 'Javier' ELSE 'Karla' END;
        sender_label := CASE WHEN sender_profile = 'Karla' THEN 'Karlita' ELSE 'Javier' END;
        notif_title := '🎨 ¡Notita dibujada de ' || sender_label || '!';
        notif_body := 'Te dedicó un dibujo: "' || COALESCE(NEW.title, 'Dibujito para ti') || '"';
        notif_type := 'SHARED_DOODLE_ADDED';
    ELSE
        RETURN NEW;
    END IF;

    -- Buscar token push del destinatario en la tabla dedicada `push_tokens`
    SELECT token INTO target_token
    FROM push_tokens
    WHERE profile = recipient_profile
    LIMIT 1;

    IF target_token IS NOT NULL AND char_length(target_token) > 10 THEN
        PERFORM net.http_post(
            url := 'https://exp.host/--/api/v2/push/send',
            headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
            body := jsonb_build_object(
                'to', target_token,
                'title', notif_title,
                'body', notif_body,
                'sound', 'default',
                'priority', 'high',
                'ttl', 86400,
                'channelId', 'partner-activity',
                'data', jsonb_build_object('type', notif_type, 'sender', sender_profile)
            )
        );
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Nunca bloquear el INSERT principal si pg_net no está activo o falla la red
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interactions') THEN
        DROP TRIGGER IF EXISTS trg_instant_push_interactions ON interactions;
        CREATE TRIGGER trg_instant_push_interactions
            AFTER INSERT ON interactions
            FOR EACH ROW
            WHEN (NEW.type = 'thinking_of_you')
            EXECUTE FUNCTION notify_partner_instant_push();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        DROP TRIGGER IF EXISTS trg_instant_push_messages ON messages;
        CREATE TRIGGER trg_instant_push_messages
            AFTER INSERT ON messages
            FOR EACH ROW
            EXECUTE FUNCTION notify_partner_instant_push();
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shared_doodles') THEN
        DROP TRIGGER IF EXISTS trg_instant_push_doodles ON shared_doodles;
        CREATE TRIGGER trg_instant_push_doodles
            AFTER INSERT ON shared_doodles
            FOR EACH ROW
            EXECUTE FUNCTION notify_partner_instant_push();
    END IF;
END $$;

// ============================================================================
// SUPABASE EDGE FUNCTION: daily-push
// Ejecutada diariamente por pg_cron a las 07:00 AM (America/Mexico_City).
// Busca:
//   1. Cartas desbloqueadas hoy (scheduled_date = HOY) aún no leídas.
//   2. Fechas importantes (important_dates) cuyo mes/día coincida con hoy.
//   3. Eventos del calendario compartido (couple_events) programados para hoy.
// Envía notificaciones remotas vía Expo Push API garantizando idempotencia
// mediante la tabla `push_log`.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushTokenRow {
  profile: string;
  token: string;
}

interface MessageRow {
  id: string;
  sender: string;
  recipient: string;
  scheduled_date: string;
}

interface ImportantDateRow {
  id: string;
  title: string;
  kind?: string;
  emoji?: string;
  date: string;
  recurring_yearly: boolean;
}

interface CoupleEventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
}

function getMexicoCityToday(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // YYYY-MM-DD
}

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Verificación opcional de secreto de cron o Authorization Bearer (service_role desde pg_cron)
    const cronSecret = Deno.env.get('CRON_SECRET');
    if (cronSecret) {
      const provided = req.headers.get('x-cron-secret');
      const authHeader = req.headers.get('authorization') ?? '';
      const hasValidServiceRole = authHeader === `Bearer ${serviceRoleKey}`;
      if (provided !== cronSecret && !hasValidServiceRole) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const todayStr = getMexicoCityToday();
    const todayMonthDay = todayStr.slice(5); // MM-DD

    // 1. Obtener tokens push activos por perfil
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('profile, token');

    const tokensByProfile = new Map<string, string[]>();
    for (const row of (tokenRows ?? []) as PushTokenRow[]) {
      if (!row.token) continue;
      const list = tokensByProfile.get(row.profile) ?? [];
      list.push(row.token);
      tokensByProfile.set(row.profile, list);
    }

    const allTokens = Array.from(new Set((tokenRows ?? []).map((r: PushTokenRow) => r.token)));

    const notificationsToSend: Array<{
      dedupKey: string;
      to: string[];
      title: string;
      body: string;
      data: Record<string, unknown>;
    }> = [];

    // 2. Cartas programadas para hoy no leídas
    const { data: todayMessages } = await supabase
      .from('messages')
      .select('id, sender, recipient, scheduled_date')
      .eq('scheduled_date', todayStr)
      .eq('is_read', false);

    for (const msg of (todayMessages ?? []) as MessageRow[]) {
      const recipient = msg.recipient === 'Ella' ? 'Karla' : msg.recipient || 'Karla';
      const senderDisplay = msg.sender === 'Karla' ? 'Karlita' : msg.sender || 'Javier';
      const targetTokens = tokensByProfile.get(recipient) ?? [];

      if (targetTokens.length > 0) {
        notificationsToSend.push({
          dedupKey: `daily_letter:${msg.id}:${todayStr}`,
          to: targetTokens,
          title: '💌 ¡Tienes una carta nueva hoy!',
          body: `${senderDisplay} dejó una sorpresa especial lista para abrir hoy ❤️`,
          data: { type: 'daily_letter', messageId: msg.id, scheduledDate: todayStr },
        });
      }
    }

    // 3. Fechas importantes (aniversarios, cumpleaños, etc.)
    const { data: importantDates } = await supabase
      .from('important_dates')
      .select('id, title, kind, date, recurring_yearly');

    for (const item of (importantDates ?? []) as ImportantDateRow[]) {
      const matchesToday = item.recurring_yearly
        ? String(item.date).slice(5) === todayMonthDay
        : String(item.date) === todayStr;

      if (matchesToday && allTokens.length > 0) {
        const icon =
          item.emoji ||
          (item.kind === 'birthday' ? '🎂' : item.kind === 'anniversary' ? '💍' : '🎉');
        notificationsToSend.push({
          dedupKey: `important_date:${item.id}:${todayStr}`,
          to: allTokens,
          title: `${icon} ¡Hoy es un día especial!`,
          body: `Hoy celebramos: ${item.title} 💖`,
          data: { type: 'important_date', importantDateId: item.id, date: todayStr },
        });
      }
    }

    // 4. Eventos del calendario compartido para hoy
    const { data: coupleEvents } = await supabase
      .from('couple_events')
      .select('id, title, event_date, event_time')
      .eq('event_date', todayStr);

    for (const ev of (coupleEvents ?? []) as CoupleEventRow[]) {
      if (allTokens.length > 0) {
        const timePart = ev.event_time ? ` a las ${ev.event_time}` : '';
        notificationsToSend.push({
          dedupKey: `couple_event:${ev.id}:${todayStr}`,
          to: allTokens,
          title: '📅 Cita en nuestro calendario hoy',
          body: `${ev.title}${timePart} ✨`,
          data: { type: 'couple_event', eventId: ev.id, date: todayStr },
        });
      }
    }

    let sentCount = 0;
    let skippedCount = 0;

    for (const item of notificationsToSend) {
      // Verificar idempotencia antes de enviar para permitir reintentos si Expo Push API falla
      const { data: existingLog } = await supabase
        .from('push_log')
        .select('id')
        .eq('dedup_key', item.dedupKey)
        .maybeSingle();

      if (existingLog) {
        skippedCount += 1;
        continue;
      }

      const expoPayloads = item.to.map((token) => ({
        to: token,
        sound: 'default',
        title: item.title,
        body: item.body,
        data: item.data,
        priority: 'high',
      }));

      const expoRes = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expoPayloads),
      });

      if (expoRes.ok) {
        sentCount += expoPayloads.length;
        await supabase.from('push_log').upsert(
          [
            {
              dedup_key: item.dedupKey,
              payload: { title: item.title, body: item.body, data: item.data },
            },
          ],
          { onConflict: 'dedup_key', ignoreDuplicates: true },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: todayStr,
        sent: sentCount,
        skipped: skippedCount,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : 'Error interno en daily-push',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});

# Guía de Despliegue, Notificaciones 7 AM y Respaldos (KMRG)

Este documento describe cómo poner en producción las migraciones de Supabase, la Edge Function de notificaciones matutinas (`daily-push`), el cron automático (`pg_cron`) y los flujos de respaldo en GitHub Actions.

---

## 1. Migraciones de Base de Datos en Supabase

Ejecuta los scripts SQL en el **SQL Editor** de tu proyecto de Supabase en el siguiente orden:

1. `supabase_setup.sql` (estructura base de `messages`, `milestones`, `interactions` y bucket `kmrg-media`).
2. `supabase/migrations/20261102_features_v2.sql` (tablas relacionales V2 de pareja, RLS y Realtime).
3. `supabase/migrations/20261102_push_cron.sql` (tabla de idempotencia `push_log`, función `prune_kmrg_interactions()` y tareas `pg_cron`).
4. `supabase/migrations/20261104_instant_push_trigger.sql` (triggers de notificaciones push inmediatas con `pg_net`).
5. `supabase/migrations/20261104_rls_hardening.sql` (endurecimiento de políticas RLS y validación de payloads).
6. `supabase/migrations/20261105_optimize_egress_and_storage.sql` (índices compuestos, límites de almacenamiento y poda optimizada).

---

## 2. Despliegue de la Edge Function `daily-push`

La función `supabase/functions/daily-push/index.ts` envía notificaciones push a través de Expo a las **7:00 AM (hora de Ciudad de México)** cuando:
- Hay una carta programada para hoy (`scheduled_date = HOY`) aún no leída.
- Hoy coincide con una fecha especial registrada en `important_dates`.
- Hay una cita programada para hoy en `couple_events`.

### Comandos manuales con Supabase CLI

```bash
supabase login
supabase link --project-ref <TU_PROJECT_REF>
supabase functions deploy daily-push
```

### Variables requeridas en Supabase
`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son inyectadas automáticamente por Supabase en las Edge Functions. Opcionalmente puedes definir `CRON_SECRET`:

```bash
supabase secrets set CRON_SECRET="tu-secreto-seguro"
```

---

## 3. Configuración de `pg_cron` en Supabase

En el SQL Editor de Supabase, guarda la URL de tu proyecto y tu `service_role_key` como parámetros de base de datos para que `pg_cron` pueda invocar la Edge Function a las 7:00 AM CDMX (13:00 UTC):

```sql
ALTER DATABASE postgres SET "app.settings.supabase_url" = 'https://<TU_PROJECT_REF>.supabase.co';
ALTER DATABASE postgres SET "app.settings.service_role_key" = '<TU_SUPABASE_SERVICE_ROLE_KEY>';
```

Para verificar que los jobs quedaron activos:

```sql
SELECT jobid, jobname, schedule, active FROM cron.job;
```

---

## 4. Secretos para GitHub Actions

Configura los siguientes **Repository Secrets** en GitHub (`Settings → Secrets and variables → Actions`):

| Secreto | Uso |
| :--- | :--- |
| `BACKUP_DATABASE_URL` | Cadena de conexión PostgreSQL (`postgresql://...`) usada por `.github/workflows/db-backup.yml` para generar respaldos semanales comprimidos. |
| `SUPABASE_ACCESS_TOKEN` | Token personal de Supabase CLI para desplegar `daily-push` automáticamente en `.github/workflows/supabase-functions.yml`. |
| `SUPABASE_PROJECT_ID` | ID de referencia del proyecto de Supabase. |
| `EXPO_TOKEN` | Token de cuenta Expo para compilaciones y actualizaciones OTA en `.github/workflows/eas-build.yml`. |
| `EXPO_PUBLIC_SUPABASE_URL` | URL pública de Supabase para builds móviles. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase para builds móviles. |
| `EXPO_PUBLIC_API_URL` | URL del backend en producción. |
| `EXPO_PUBLIC_MOBILE_API_KEY` | Clave de API móvil compartida con el backend. |

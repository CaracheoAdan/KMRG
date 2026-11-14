import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';

/**
 * Almacén genérico "offline-first" para las tablas relacionales de Features v2
 * (ver supabase/migrations/20261102_features_v2.sql).
 *
 * - Lectura: devuelve la caché local inmediatamente si se pide, y refresca desde Supabase.
 * - Escritura: aplica el cambio en la caché local primero y luego lo envía a Supabase.
 *   Si no hay red, la operación queda en una cola persistente y se reintenta en el
 *   siguiente `flushPendingOps()` (se llama automáticamente en cada `fetchAll`).
 * - Realtime: `subscribeTable` notifica cualquier INSERT/UPDATE/DELETE de la pareja.
 */

type Row = { id?: string } & Record<string, unknown>;

type PendingOp =
  | { kind: 'upsert'; table: string; row: Row; onConflict?: string }
  | { kind: 'delete'; table: string; match: Record<string, unknown> };

const CACHE_PREFIX = '@kmrg_v2_cache_';
const PENDING_KEY = '@kmrg_v2_pending_ops';

const cacheKey = (table: string) => `${CACHE_PREFIX}${table}`;

export const generateId = (): string =>
  // UUIDv4 compatible con la columna UUID de Postgres, sin dependencias nativas
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export async function readCache<T>(table: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(table));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function writeCache<T>(table: string, rows: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(table), JSON.stringify(rows));
  } catch {
    // Ignorar error de escritura local
  }
}

async function readPending(): Promise<PendingOp[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePending(ops: PendingOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(ops.slice(-300)));
  } catch {
    // Ignorar
  }
}

async function runOp(op: PendingOp): Promise<boolean> {
  try {
    if (op.kind === 'upsert') {
      const { error } = await supabase
        .from(op.table)
        .upsert([op.row], op.onConflict ? { onConflict: op.onConflict } : undefined);
      return !error;
    }
    let q = supabase.from(op.table).delete();
    for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
    const { error } = await q;
    return !error;
  } catch {
    return false;
  }
}

let flushing = false;
/** Reintenta las operaciones encoladas cuando no había conexión. */
export async function flushPendingOps(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const ops = await readPending();
    if (ops.length === 0) return;
    const remaining: PendingOp[] = [];
    for (const op of ops) {
      const ok = await runOp(op);
      if (!ok) remaining.push(op);
    }
    await writePending(remaining);
  } finally {
    flushing = false;
  }
}

async function enqueue(op: PendingOp): Promise<void> {
  const ok = await runOp(op);
  if (!ok) {
    const ops = await readPending();
    ops.push(op);
    await writePending(ops);
  }
}

export interface FetchOptions {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  /** Filtros de igualdad simples, p.ej. { question_date: '2026-11-02' } */
  eq?: Record<string, string | number | boolean>;
  /** Si es true, ignora el cooldown de 30 segundos y consulta Supabase de inmediato */
  force?: boolean;
}

const lastTableFetchMs = new Map<string, number>();
const inFlightTableFetches = new Map<string, Promise<any>>();
const TABLE_FETCH_COOLDOWN_MS = 30_000;

/**
 * Descarga la tabla completa (o filtrada) y actualiza la caché local.
 * Si falla la red o está dentro del cooldown de 30s, devuelve la caché local.
 */
export async function fetchAll<T extends Row>(table: string, opts: FetchOptions = {}): Promise<T[]> {
  void flushPendingOps();

  const queryKey = `${table}:${JSON.stringify(opts)}`;
  if (!opts.force) {
    const inFlight = inFlightTableFetches.get(queryKey);
    if (inFlight) {
      return inFlight as Promise<T[]>;
    }
  }

  const runQuery = async (): Promise<T[]> => {
    const cached = await readCache<T>(table);
    const lastMs = lastTableFetchMs.get(queryKey) || 0;
    if (!opts.force && cached.length > 0 && Date.now() - lastMs < TABLE_FETCH_COOLDOWN_MS) {
      if (!opts.eq) return cached;
      return cached.filter((r) => Object.entries(opts.eq!).every(([k, v]) => r[k] === v));
    }

    try {
      let q = supabase.from(table).select('*');
      if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
      if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? true });
      q = q.limit(opts.limit || 100);
      const { data, error } = await q;
      if (!error && Array.isArray(data)) {
        lastTableFetchMs.set(queryKey, Date.now());
        if (!opts.eq) {
          await writeCache(table, data);
        } else {
          // Fusionar resultados filtrados con la caché existente
          const map = new Map<string, T>();
          cached.forEach((r) => r.id && map.set(String(r.id), r));
          (data as T[]).forEach((r) => r.id && map.set(String(r.id), r));
          await writeCache(table, Array.from(map.values()));
        }
        return data as T[];
      }
      if (error) {
        console.warn(`[featureStore] Error consultando tabla '${table}':`, error.message);
      }
    } catch (e: any) {
      console.warn(`[featureStore] Excepción de red en '${table}':`, e?.message || e);
    }
    if (!opts.eq) return cached;
    return cached.filter((r) => Object.entries(opts.eq!).every(([k, v]) => r[k] === v));
  };

  const promise = runQuery().finally(() => {
    inFlightTableFetches.delete(queryKey);
  });
  inFlightTableFetches.set(queryKey, promise);
  return promise;
}

function invalidateTableCooldown(table: string): void {
  for (const key of Array.from(lastTableFetchMs.keys())) {
    if (key.startsWith(`${table}:`)) {
      lastTableFetchMs.delete(key);
    }
  }
}

/**
 * Inserta o actualiza una fila. Se aplica en caché inmediatamente (optimista).
 * `matchKeys` permite reemplazar en caché por claves naturales (p.ej. fecha+perfil).
 */
export async function upsertRow<T extends Row>(
  table: string,
  row: T,
  options: { onConflict?: string; matchKeys?: string[] } = {}
): Promise<T> {
  invalidateTableCooldown(table);
  const finalRow = { ...row, id: row.id || generateId() } as T;
  const cached = await readCache<T>(table);
  const keys = options.matchKeys && options.matchKeys.length > 0 ? options.matchKeys : ['id'];
  const idx = cached.findIndex((r) => keys.every((k) => r[k] === finalRow[k]));
  if (idx >= 0) {
    // Conservar el id original si el conflicto es por clave natural
    cached[idx] = { ...cached[idx], ...finalRow, id: cached[idx].id ?? finalRow.id };
  } else {
    cached.push(finalRow);
  }
  await writeCache(table, cached);
  const rowToSend = idx >= 0 ? cached[idx] : finalRow;
  await enqueue({ kind: 'upsert', table, row: rowToSend, onConflict: options.onConflict });
  return rowToSend;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  invalidateTableCooldown(table);
  const cached = await readCache<Row>(table);
  await writeCache(
    table,
    cached.filter((r) => r.id !== id)
  );
  await enqueue({ kind: 'delete', table, match: { id } });
}

/**
 * Suscripción Realtime a cambios de la tabla. Devuelve la función para cancelar.
 */
export function subscribeTable(table: string, onChange: () => void): () => void {
  let channel: any = null;
  try {
    channel = supabase
      .channel(`kmrg-v2-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        invalidateTableCooldown(table);
        onChange();
      })
      .subscribe();
  } catch {
    channel = null;
  }
  return () => {
    if (channel) {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // Ignorar
      }
    }
  };
}

/** Exporta todas las cachés v2 (usado por el servicio de respaldo). */
export const FEATURE_V2_TABLES = [
  'daily_answers',
  'quiz_questions',
  'quiz_attempts',
  'gratitude_entries',
  'couple_events',
  'important_dates',
  'savings_goals',
  'savings_contributions',
  'love_coupons',
  'first_times',
  'shared_doodles',
] as const;

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { UserProfile } from '../../types';
import { toLocalDateString } from '../StorageService';
import { APP_LOCK_ENABLED_KEY } from './appLockService';
import { FEATURE_V2_TABLES } from './featureStore';

let FileSystemLegacy: any = null;
try {
  FileSystemLegacy = require('expo-file-system/legacy');
} catch {
  FileSystemLegacy = null;
}

export const LAST_BACKUP_AT_KEY = '@kmrg_last_backup_at';

export interface KmrgBackupPayload {
  app: 'KMRG';
  version: number;
  exportedAt: string;
  profile: UserProfile | null;
  entries: Record<string, string>;
}

export interface BackupPreviewSummary {
  fileName: string;
  exportedAt: string;
  profile: UserProfile | null;
  version: number;
  totalKeys: number;
  messagesCount: number;
  milestonesCount: number;
  v2RecordsCount: number;
  payload: KmrgBackupPayload;
}

export function isBackupableKmrgKey(key: string): boolean {
  if (!key || key === APP_LOCK_ENABLED_KEY) return false;
  return key.startsWith('@kmrg') || key.startsWith('kmrg');
}

export async function getLastBackupAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_AT_KEY);
  } catch {
    return null;
  }
}

export async function getLocalStorageStats(): Promise<{
  totalKeys: number;
  messagesCount: number;
  milestonesCount: number;
  v2RecordsCount: number;
}> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const kmrgKeys = allKeys.filter(isBackupableKmrgKey);
    const pairs = await AsyncStorage.multiGet(kmrgKeys);
    const map: Record<string, string> = {};
    for (const [k, v] of pairs) {
      if (k && typeof v === 'string') {
        map[k] = v;
      }
    }
    return computeCountsFromEntries(map);
  } catch {
    return { totalKeys: 0, messagesCount: 0, milestonesCount: 0, v2RecordsCount: 0 };
  }
}

function safeArrayLength(raw?: string): number {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function computeCountsFromEntries(entries: Record<string, string>): {
  totalKeys: number;
  messagesCount: number;
  milestonesCount: number;
  v2RecordsCount: number;
} {
  const keys = Object.keys(entries).filter(isBackupableKmrgKey);
  const messagesCount = safeArrayLength(entries['@kmrg_messages_cache']);
  const milestonesCount = safeArrayLength(entries['@kmrg_milestones_cache']);
  let v2RecordsCount = 0;
  for (const table of FEATURE_V2_TABLES) {
    v2RecordsCount += safeArrayLength(entries[`@kmrg_v2_cache_${table}`]);
  }
  return {
    totalKeys: keys.length,
    messagesCount,
    milestonesCount,
    v2RecordsCount,
  };
}

export async function buildBackupPayload(profile: UserProfile | null): Promise<KmrgBackupPayload> {
  const allKeys = await AsyncStorage.getAllKeys();
  const targetKeys = allKeys.filter(isBackupableKmrgKey);
  const pairs = await AsyncStorage.multiGet(targetKeys);

  const entries: Record<string, string> = {};
  for (const [k, v] of pairs) {
    if (k && isBackupableKmrgKey(k) && typeof v === 'string') {
      entries[k] = v;
    }
  }

  const exportedAt = new Date().toISOString();
  return {
    app: 'KMRG',
    version: 1,
    exportedAt,
    profile,
    entries,
  };
}

export async function exportBackupFile(
  profile: UserProfile | null
): Promise<{ fileName: string; exportedAt: string; totalKeys: number }> {
  const payload = await buildBackupPayload(profile);
  const dateStr = toLocalDateString(new Date());
  const fileName = `kmrg-respaldo-${dateStr}.json`;
  const jsonContent = JSON.stringify(payload, null, 2);

  if (Platform.OS === 'web' || !FileSystemLegacy) {
    // Fallback web descarga directa si aplica
    if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } else {
    const baseDir: string =
      FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory || '';
    const fileUri = `${baseDir}${fileName}`;
    await FileSystemLegacy.writeAsStringAsync(fileUri, jsonContent, {
      encoding: FileSystemLegacy.EncodingType?.UTF8 || 'utf8',
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar respaldo de KMRG',
        UTI: 'public.json',
      });
    }
  }

  await AsyncStorage.setItem(LAST_BACKUP_AT_KEY, payload.exportedAt);
  return {
    fileName,
    exportedAt: payload.exportedAt,
    totalKeys: Object.keys(payload.entries).length,
  };
}

export function parseAndValidateBackupJson(
  rawJson: string,
  fileName = 'respaldo.json'
): BackupPreviewSummary {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('El archivo seleccionado no es un JSON válido.');
  }

  if (!parsed || typeof parsed !== 'object' || parsed.app !== 'KMRG') {
    throw new Error('El archivo no corresponde a un respaldo válido de KMRG.');
  }

  const rawEntries =
    parsed.entries && typeof parsed.entries === 'object'
      ? parsed.entries
      : parsed.data && typeof parsed.data === 'object'
        ? parsed.data
        : null;

  if (!rawEntries) {
    throw new Error('El respaldo no contiene datos para restaurar.');
  }

  const sanitizedEntries: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawEntries)) {
    if (isBackupableKmrgKey(k) && v !== null && v !== undefined) {
      sanitizedEntries[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }

  const exportedAt =
    typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString();
  const profile: UserProfile | null =
    parsed.profile === 'Javier' || parsed.profile === 'Karla' ? parsed.profile : null;
  const version = typeof parsed.version === 'number' ? parsed.version : 1;

  const payload: KmrgBackupPayload = {
    app: 'KMRG',
    version,
    exportedAt,
    profile,
    entries: sanitizedEntries,
  };

  const counts = computeCountsFromEntries(sanitizedEntries);
  return {
    fileName,
    exportedAt,
    profile,
    version,
    ...counts,
    payload,
  };
}

export async function pickBackupFileForRestore(): Promise<BackupPreviewSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/json', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  let rawJson = '';

  if (Platform.OS === 'web' && (asset as any).file) {
    rawJson = await (asset as any).file.text();
  } else if (FileSystemLegacy && asset.uri) {
    rawJson = await FileSystemLegacy.readAsStringAsync(asset.uri, {
      encoding: FileSystemLegacy.EncodingType?.UTF8 || 'utf8',
    });
  } else if (asset.uri) {
    const resp = await fetch(asset.uri);
    rawJson = await resp.text();
  }

  if (!rawJson) {
    throw new Error('No se pudo leer el contenido del archivo.');
  }

  return parseAndValidateBackupJson(rawJson, asset.name || 'kmrg-respaldo.json');
}

export async function applyBackupRestore(
  payload: KmrgBackupPayload
): Promise<{ restoredKeys: number; backupAt: string }> {
  if (!payload || payload.app !== 'KMRG' || !payload.entries) {
    throw new Error('Estructura de respaldo inválida.');
  }

  const pairs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(payload.entries)) {
    if (isBackupableKmrgKey(k) && typeof v === 'string') {
      pairs.push([k, v]);
    }
  }

  if (pairs.length > 0) {
    await AsyncStorage.multiSet(pairs);
  }

  const nowIso = new Date().toISOString();
  await AsyncStorage.setItem(LAST_BACKUP_AT_KEY, nowIso);

  return {
    restoredKeys: pairs.length,
    backupAt: nowIso,
  };
}

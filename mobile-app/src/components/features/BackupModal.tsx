import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatDisplayDate } from '../../services/StorageService';
import {
  FeatureButton,
  FeatureCard,
  FeatureModalProps,
  FeatureModalShell,
} from './FeatureModalShell';
import {
  applyBackupRestore,
  BackupPreviewSummary,
  exportBackupFile,
  getLastBackupAt,
  getLocalStorageStats,
  pickBackupFileForRestore,
} from '../../services/feature/backupService';

export const BackupModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor } = useTheme();
  const { profile } = useProfile();

  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalKeys: 0,
    messagesCount: 0,
    milestonesCount: 0,
    v2RecordsCount: 0,
  });
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<BackupPreviewSummary | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null
  );

  const loadInfo = useCallback(async () => {
    const [last, currentStats] = await Promise.all([
      getLastBackupAt(),
      getLocalStorageStats(),
    ]);
    setLastBackupAt(last);
    setStats(currentStats);
  }, []);

  useEffect(() => {
    if (visible) {
      setPreview(null);
      setFeedback(null);
      void loadInfo();
    }
  }, [visible, loadInfo]);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await exportBackupFile(profile);
      setLastBackupAt(res.exportedAt);
      await loadInfo();
      setFeedback({
        kind: 'success',
        text: `Respaldo generado (${res.fileName}) con ${res.totalKeys} registros guardados.`,
      });
    } catch (err: any) {
      setFeedback({
        kind: 'error',
        text: err?.message || 'No se pudo exportar el respaldo.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePickRestoreFile = async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const summary = await pickBackupFileForRestore();
      if (summary) {
        setPreview(summary);
      }
    } catch (err: any) {
      setPreview(null);
      setFeedback({
        kind: 'error',
        text: err?.message || 'No se pudo leer el archivo seleccionado.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await applyBackupRestore(preview.payload);
      setLastBackupAt(res.backupAt);
      setPreview(null);
      await loadInfo();
      setFeedback({
        kind: 'success',
        text: `¡Restauración completada! Se restauraron ${res.restoredKeys} elementos en este dispositivo.`,
      });
    } catch (err: any) {
      setFeedback({
        kind: 'error',
        text: err?.message || 'Ocurrió un error al restaurar los datos.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Respaldo y Restauración"
      subtitle="Guarda una copia segura de sus cartas, recuerdos y metas"
      icon="cloud-download-outline"
    >
      {/* Resumen del estado actual */}
      <FeatureCard>
        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name="archive-outline" size={22} color={primaryColor} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Datos guardados en este teléfono
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              {lastBackupAt
                ? `Último respaldo: ${formatDisplayDate(lastBackupAt)}`
                : 'Aún no has exportado un respaldo local'}
            </Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: primaryColor }]}>{stats.messagesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cartas</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: primaryColor }]}>{stats.milestonesCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Recuerdos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: primaryColor }]}>{stats.v2RecordsCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actividades</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: primaryColor }]}>{stats.totalKeys}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Claves KMRG</Text>
          </View>
        </View>
      </FeatureCard>

      {/* Mensaje de estado */}
      {feedback ? (
        <FeatureCard
          style={{
            borderColor: feedback.kind === 'success' ? colors.success : colors.danger,
          }}
        >
          <View style={styles.feedbackRow}>
            <Ionicons
              name={
                feedback.kind === 'success' ? 'checkmark-circle' : 'alert-circle'
              }
              size={20}
              color={feedback.kind === 'success' ? colors.success : colors.danger}
            />
            <Text style={[styles.feedbackText, { color: colors.text }]}>{feedback.text}</Text>
          </View>
        </FeatureCard>
      ) : null}

      {/* Exportar */}
      <FeatureCard>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Exportar copia de seguridad</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
          Genera un archivo JSON con todas las claves de KMRG almacenadas en tu dispositivo
          (excepto tu ajuste de bloqueo biométrico) para guardarlo en tus archivos o enviarlo.
        </Text>
        <FeatureButton
          label={busy ? 'Procesando...' : 'Exportar respaldo JSON'}
          icon="share-outline"
          onPress={() => void handleExport()}
          disabled={busy}
        />
      </FeatureCard>

      {/* Restaurar */}
      <FeatureCard>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Restaurar desde un archivo</Text>
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
          Selecciona un archivo <Text style={styles.mono}>kmrg-respaldo-YYYY-MM-DD.json</Text>{' '}
          previamente exportado. Verás un resumen antes de aplicar cualquier cambio.
        </Text>

        {!preview ? (
          <FeatureButton
            label="Seleccionar archivo JSON"
            icon="folder-open-outline"
            variant="ghost"
            onPress={() => void handlePickRestoreFile()}
            disabled={busy}
          />
        ) : (
          <View
            style={[
              styles.previewBox,
              { backgroundColor: colors.surfaceAlt, borderColor: primaryColor },
            ]}
          >
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              Confirmar restauración
            </Text>
            <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
              • Archivo: <Text style={styles.bold}>{preview.fileName}</Text>
            </Text>
            <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
              • Fecha del respaldo:{' '}
              <Text style={styles.bold}>{formatDisplayDate(preview.exportedAt)}</Text>
            </Text>
            {preview.profile ? (
              <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
                • Perfil original: <Text style={styles.bold}>{preview.profile}</Text>
              </Text>
            ) : null}
            <Text style={[styles.previewItem, { color: colors.textSecondary }]}>
              • Contenido: <Text style={styles.bold}>{preview.totalKeys}</Text> claves (
              {preview.messagesCount} cartas, {preview.milestonesCount} recuerdos,{' '}
              {preview.v2RecordsCount} registros v2)
            </Text>

            <View style={styles.previewActions}>
              <FeatureButton
                label="Cancelar"
                variant="ghost"
                onPress={() => setPreview(null)}
                disabled={busy}
                style={styles.flexBtn}
              />
              <FeatureButton
                label="Restaurar ahora"
                icon="checkmark-circle-outline"
                onPress={() => void handleConfirmRestore()}
                disabled={busy}
                style={styles.flexBtn}
              />
            </View>
          </View>
        )}
      </FeatureCard>
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  mono: {
    fontWeight: '700',
  },
  previewBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  previewItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  flexBtn: {
    flex: 1,
  },
});

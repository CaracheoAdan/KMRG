import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Message } from '../types';
import { getPastMessages } from '../services/StorageService';
import { syncMessages } from '../services/SyncService';

export const MemoriesScreen: React.FC = () => {
  const [memories, setMemories] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMemories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    await syncMessages();
    const past = await getPastMessages();
    setMemories(past);

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const renderTimelineItem = ({ item, index }: { item: Message; index: number }) => {
    const isLast = index === memories.length - 1;
    const formattedDate = new Date(item.scheduled_date).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const themeColor = item.theme_color || '#e63946';

    return (
      <View style={styles.timelineRow}>
        {/* Columna de la línea de tiempo vertical */}
        <View style={styles.timelineTrack}>
          <View style={[styles.timelineNode, { borderColor: themeColor }]}>
            <View style={[styles.timelineNodeInner, { backgroundColor: themeColor }]} />
          </View>
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Tarjeta de Recuerdo */}
        <View style={styles.memoryCardWrapper}>
          <View style={styles.memoryHeader}>
            <Text style={[styles.dateBadge, { color: themeColor, backgroundColor: `${themeColor}15` }]}>
              {formattedDate}
            </Text>
            {item.is_read && <Text style={styles.readCheck}>Leído ✓</Text>}
          </View>

          <View style={[styles.memoryCard, { borderLeftColor: themeColor }]}>
            <Text style={styles.memoryContent}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Nuestra Historia</Text>
        <Text style={styles.screenSubtitle}>Cada recuerdo, cada palabra guardada para siempre</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e63946" />
          <Text style={styles.loadingText}>Cargando recuerdos...</Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          renderItem={renderTimelineItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadMemories(true)}
              tintColor="#e63946"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>Nuestra historia apenas comienza</Text>
              <Text style={styles.emptySubtitle}>
                Los mensajes que vayas leyendo día tras día se guardarán aquí para construir nuestra
                cápsula del tiempo.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2b2d42',
    fontFamily: 'serif',
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8d99ae',
    fontStyle: 'italic',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineTrack: {
    width: 28,
    alignItems: 'center',
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    zIndex: 1,
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    marginTop: 4,
    marginBottom: -4,
  },
  memoryCardWrapper: {
    flex: 1,
    marginLeft: 12,
    marginBottom: 20,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'capitalize',
  },
  readCheck: {
    fontSize: 11,
    color: '#adb5bd',
  },
  memoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memoryContent: {
    fontSize: 15,
    lineHeight: 24,
    color: '#343a40',
    fontFamily: 'serif',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2b2d42',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: '#6c757d',
    textAlign: 'center',
  },
});

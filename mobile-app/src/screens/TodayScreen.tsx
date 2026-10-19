import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Message } from '../types';
import { getTodayMessage, markMessageAsRead } from '../services/StorageService';
import { syncMessages, sendInteraction } from '../services/SyncService';

export const TodayScreen: React.FC = () => {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingInteraction, setSendingInteraction] = useState(false);
  const [interactionFeedback, setInteractionFeedback] = useState<string | null>(null);

  // Animaciones para el botón de corazón
  const heartScale = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    // Intentar sincronizar en segundo plano
    await syncMessages();

    // Cargar mensaje de hoy desde el almacenamiento local
    const todayMsg = await getTodayMessage();
    setMessage(todayMsg);

    if (todayMsg && !todayMsg.is_read) {
      await markMessageAsRead(todayMsg.id);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejador del botón "Pensando en ti" con animación de latido
  const handleHeartPress = async () => {
    if (sendingInteraction) return;
    setSendingInteraction(true);

    // Animación de latido (pulsación)
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Envío silencioso al backend
    const res = await sendInteraction('thinking_of_you');

    const feedbackText = res.success
      ? '¡Mensaje recibido con amor! ❤️'
      : 'Siempre pensando en ti ✨';

    setInteractionFeedback(feedbackText);

    // Fade in feedback
    Animated.timing(feedbackOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Fade out feedback tras 3 segundos
    setTimeout(() => {
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setInteractionFeedback(null);
        setSendingInteraction(false);
      });
    }, 2800);
  };

  const backgroundColor = message?.theme_color
    ? `${message.theme_color}18` // 10% opacidad para mantener la estética suave y romántica
    : '#fff0f3';

  const accentColor = message?.theme_color || '#e63946';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={accentColor}
          />
        }
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Abriendo tu carta de hoy...</Text>
          </View>
        ) : message ? (
          <View style={styles.cardContainer}>
            <View style={styles.headerBadgeContainer}>
              <View style={[styles.headerBadge, { backgroundColor: `${accentColor}25` }]}>
                <Text style={[styles.headerBadgeText, { color: accentColor }]}>
                  ✨ Para ti hoy
                </Text>
              </View>
              <Text style={styles.dateText}>
                {new Date(message.scheduled_date).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
            </View>

            {/* Carta Romántica */}
            <View style={styles.messageCard}>
              <Text style={[styles.quoteMark, { color: `${accentColor}30` }]}>“</Text>
              <Text style={styles.messageContent}>{message.content}</Text>
              <Text style={[styles.quoteMarkClose, { color: `${accentColor}30` }]}>”</Text>
            </View>

            {/* Botón de Interacción: Pensando en ti */}
            <View style={styles.interactionSection}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <TouchableOpacity
                  onPress={handleHeartPress}
                  activeOpacity={0.85}
                  style={[styles.heartButton, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.heartButtonLabel}>Pensando en ti</Text>

              {/* Mensaje de feedback animado */}
              {interactionFeedback && (
                <Animated.View style={[styles.feedbackContainer, { opacity: feedbackOpacity }]}>
                  <Text style={[styles.feedbackText, { color: accentColor }]}>
                    {interactionFeedback}
                  </Text>
                </Animated.View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHeartIcon}>💌</Text>
            <Text style={styles.emptyTitle}>Todo está listo</Text>
            <Text style={styles.emptySubtitle}>
              Hoy no hay un mensaje programado nuevo, pero recuerda que cada instante a tu lado es
              especial.
            </Text>
            <View style={styles.interactionSection}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <TouchableOpacity
                  onPress={handleHeartPress}
                  activeOpacity={0.85}
                  style={[styles.heartButton, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.heartIcon}>❤️</Text>
                </TouchableOpacity>
              </Animated.View>
              <Text style={styles.heartButtonLabel}>Enviar un latido</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8d99ae',
    fontStyle: 'italic',
  },
  cardContainer: {
    alignItems: 'center',
  },
  headerBadgeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 15,
    color: '#6c757d',
    textTransform: 'capitalize',
  },
  messageCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    position: 'relative',
  },
  quoteMark: {
    fontSize: 64,
    lineHeight: 64,
    fontFamily: 'serif',
    position: 'absolute',
    top: 12,
    left: 18,
  },
  quoteMarkClose: {
    fontSize: 64,
    lineHeight: 64,
    fontFamily: 'serif',
    alignSelf: 'flex-end',
    marginBottom: -24,
    marginRight: 6,
  },
  messageContent: {
    fontSize: 20,
    lineHeight: 34,
    color: '#2b2d42',
    textAlign: 'center',
    fontFamily: 'serif',
    paddingVertical: 12,
  },
  interactionSection: {
    alignItems: 'center',
    marginTop: 36,
  },
  heartButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  heartIcon: {
    fontSize: 28,
  },
  heartButtonLabel: {
    marginTop: 10,
    fontSize: 13,
    color: '#495057',
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyHeartIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2b2d42',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 24,
    color: '#6c757d',
    textAlign: 'center',
    maxWidth: 320,
  },
});

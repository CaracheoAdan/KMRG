import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../ui/Icon';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';

interface CelebrationProps {
  visible: boolean;
  winnerName: string;
  gameTitle: string;
  pointsEarned: number;
  subtitle: string;
  onPlayAgain: () => void;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Generar partículas de confeti con trayectorias animadas
const CONFETTI_PARTICLES = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  startX: Math.random() * SCREEN_W,
  color: ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4', '#fbbf24', '#10b981'][i % 6],
  size: 6 + Math.random() * 8,
  shape: i % 3 === 0 ? 'heart' : i % 2 === 0 ? 'circle' : 'rect',
  delay: Math.random() * 400,
  speed: 1600 + Math.random() * 1200,
}));

export const CelebrationOverlay: React.FC<CelebrationProps> = ({
  visible,
  winnerName,
  gameTitle,
  pointsEarned,
  subtitle,
  onPlayAgain,
  onClose,
}) => {
  const cardScale = useRef(new Animated.Value(0.75)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const particlesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      void triggerGameHaptic('success');
      particlesAnim.setValue(0);

      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(particlesAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      cardScale.setValue(0.75);
      cardOpacity.setValue(0);
    }
  }, [visible, cardScale, cardOpacity, particlesAnim]);

  if (!visible) return null;

  const isDraw = winnerName === 'Empate';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Lluvia de Confeti y Corazones Animados */}
        {CONFETTI_PARTICLES.map((p) => {
          const translateY = particlesAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-30, SCREEN_H + 50],
          });
          const rotate = particlesAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${360 + (p.id * 45)}deg`],
          });

          return (
            <Animated.View
              key={p.id}
              style={[
                styles.particle,
                {
                  left: p.startX,
                  transform: [{ translateY }, { rotate }],
                },
              ]}
            >
              {p.shape === 'heart' ? (
                <Ionicons name="heart" size={p.size + 4} color={p.color} />
              ) : (
                <View
                  style={{
                    width: p.size,
                    height: p.shape === 'circle' ? p.size : p.size * 1.5,
                    borderRadius: p.shape === 'circle' ? p.size / 2 : 2,
                    backgroundColor: p.color,
                  }}
                />
              )}
            </Animated.View>
          );
        })}

        {/* Tarjeta de Celebración */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Halo Trofeo */}
          <View style={styles.trophyHalo}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.trophyCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={isDraw ? 'heart-half' : 'trophy'}
                size={38}
                color="#ffffff"
              />
            </LinearGradient>
          </View>

          {/* Badge del Juego */}
          <View style={styles.gameBadge}>
            <Ionicons name="sparkles" size={12} color="#f59e0b" />
            <Text style={styles.gameBadgeText}>{gameTitle.toUpperCase()}</Text>
          </View>

          {/* Título de Victoria */}
          <Text style={styles.titleText}>
            {isDraw ? '¡Gran Empate!' : `¡Victoria de ${winnerName}!`}
          </Text>

          <Text style={styles.subtitleText}>{subtitle}</Text>

          {/* Puntos Ganados */}
          {pointsEarned > 0 && (
            <View style={styles.pointsPill}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <Text style={styles.pointsText}>+{pointsEarned} PUNTOS DE PAREJA</Text>
            </View>
          )}

          {/* Botones de Acción */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('medium');
                onPlayAgain();
              }}
              style={styles.playAgainBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GAMES_THEME.gradients.primaryBtn}
                style={styles.playAgainGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="refresh" size={18} color="#ffffff" />
                <Text style={styles.playAgainText}>Revancha</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                onClose();
              }}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>Volver al Lobby</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  particle: {
    position: 'absolute',
    top: -40,
    zIndex: 1,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 2,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    ...GAMES_THEME.shadows.card,
  },
  trophyHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  trophyCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  gameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  gameBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    fontFamily: GAMES_THEME.fonts.display,
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  pointsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#b45309',
    letterSpacing: 0.5,
  },
  buttonsRow: {
    width: '100%',
    gap: 8,
  },
  playAgainBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...GAMES_THEME.shadows.soft,
  },
  playAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '800',
  },
  closeBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
});

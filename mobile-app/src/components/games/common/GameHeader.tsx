import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '../../ui/Icon';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';
import { UserProfile } from '../../../types';

interface GameHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  turnLabel: string;
  isMyTurn?: boolean;
  currentTurnPlayer?: UserProfile | 'w' | 'b' | 'Empate' | null;
  onBack: () => void;
  onReset: () => void;
  onPressScore?: (player?: 'all' | 'Karla' | 'Javier') => void;
  primaryColor?: string;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  title,
  icon,
  turnLabel,
  isMyTurn = false,
  currentTurnPlayer,
  onBack,
  onReset,
  onPressScore,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const isKarlaTurn =
    currentTurnPlayer === 'Karla' || currentTurnPlayer === 'w';
  const isJavierTurn =
    currentTurnPlayer === 'Javier' || currentTurnPlayer === 'b';

  return (
    <View style={styles.headerContainer}>
      {/* Botón Volver al Lobby */}
      <TouchableOpacity
        onPress={() => {
          void triggerGameHaptic('light');
          onBack();
        }}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Volver al lobby de juegos"
      >
        <Ionicons name="chevron-back" size={20} color="#334155" />
        <Text style={styles.backBtnText}>Lobby</Text>
      </TouchableOpacity>

      {/* Centro: Título del Juego + Pill de Turno */}
      <View style={styles.centerSection}>
        <View style={styles.titleRow}>
          <View style={styles.iconHalo}>
            <Ionicons name={icon} size={15} color={GAMES_THEME.colors.coral} />
          </View>
          <Text style={styles.gameTitleText} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View
          style={[
            styles.turnPill,
            isMyTurn ? styles.turnPillMyTurn : styles.turnPillPartner,
          ]}
        >
          <Animated.View
            style={[
              styles.turnDot,
              {
                backgroundColor: isMyTurn ? '#10b981' : '#f59e0b',
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <Text
            style={[
              styles.turnLabelText,
              { color: isMyTurn ? '#065f46' : '#92400e' },
            ]}
            numberOfLines={1}
          >
            {turnLabel}
          </Text>
        </View>
      </View>

      {/* Derecha: Avatares SEPARADOS (K y J con borde blanco y halo de turno) + Botón Reiniciar */}
      <View style={styles.rightSection}>
        <View style={styles.avatarsRow}>
          {/* Avatar Karla */}
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onPressScore?.('Karla');
            }}
            activeOpacity={0.75}
            accessibilityLabel="Ver desglose de Karlita"
          >
            <Animated.View
              style={[
                styles.miniAvatar,
                { backgroundColor: '#fdf2f8', borderColor: isKarlaTurn ? '#ec4899' : '#ffffff' },
                isKarlaTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCoral,
                },
              ]}
            >
              <Text style={[styles.avatarLetterKarla, isKarlaTurn && { fontWeight: '900' }]}>K</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Avatar Javier (Separado, sin superponerse) */}
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onPressScore?.('Javier');
            }}
            activeOpacity={0.75}
            accessibilityLabel="Ver desglose de Javier"
          >
            <Animated.View
              style={[
                styles.miniAvatar,
                { backgroundColor: '#f0f9ff', borderColor: isJavierTurn ? '#0ea5e9' : '#ffffff' },
                isJavierTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCyan,
                },
              ]}
            >
              <Text style={[styles.avatarLetterJavier, isJavierTurn && { fontWeight: '900' }]}>J</Text>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Botón Reiniciar Partida */}
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onReset();
          }}
          style={styles.circleBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Reiniciar partida"
        >
          <Ionicons name="reload" size={16} color="#475569" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GAMES_THEME.spacing.lg,
    paddingVertical: GAMES_THEME.spacing.sm + 2,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 63, 94, 0.15)',
    ...GAMES_THEME.shadows.soft,
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: GAMES_THEME.radius.sm,
    backgroundColor: '#f8fafc',
    gap: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  centerSection: {
    alignItems: 'center',
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconHalo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.2,
    fontFamily: GAMES_THEME.fonts.display,
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
    borderRadius: GAMES_THEME.radius.pill,
    borderWidth: 1,
  },
  turnPillMyTurn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  turnPillPartner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  turnLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Separados limpiamente sin montarse
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterKarla: {
    fontSize: 12,
    fontWeight: '800',
    color: '#db2777',
  },
  avatarLetterJavier: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});

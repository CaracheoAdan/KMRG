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
      {/* Botón Salir / Volver */}
      <TouchableOpacity
        onPress={() => {
          void triggerGameHaptic('light');
          onBack();
        }}
        style={styles.circleBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Volver al lobby"
      >
        <Ionicons name="chevron-back" size={20} color="#1e293b" />
      </TouchableOpacity>

      {/* Centro: Título del Juego + Pill de Turno */}
      <View style={styles.centerSection}>
        <View style={styles.titleRow}>
          <View style={styles.gameIconHalo}>
            <Ionicons name={icon} size={16} color={GAMES_THEME.colors.coral} />
          </View>
          <Text style={styles.gameTitleText} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View
          style={[
            styles.turnPill,
            isMyTurn
              ? styles.turnPillMyTurn
              : styles.turnPillPartner,
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

      {/* Derecha: Mini Avatares de Pareja con Turno + Botón Reiniciar */}
      <View style={styles.rightSection}>
        <View style={styles.avatarsRow}>
          <View
            style={[
              styles.miniAvatar,
              { backgroundColor: '#f3e8ff' },
              isKarlaTurn && styles.activeAvatarRingKarla,
            ]}
          >
            <Text style={styles.avatarLetterKarla}>K</Text>
          </View>
          <View
            style={[
              styles.miniAvatar,
              { backgroundColor: '#e0f2fe', marginLeft: -6 },
              isJavierTurn && styles.activeAvatarRingJavier,
            ]}
          >
            <Text style={styles.avatarLetterJavier}>J</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onReset();
          }}
          style={styles.circleBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Reiniciar partida"
        >
          <Ionicons name="reload" size={17} color="#475569" />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
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
  gameIconHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: GAMES_THEME.fonts.display,
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  turnPillMyTurn: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  turnPillPartner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  turnLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  activeAvatarRingKarla: {
    borderColor: GAMES_THEME.colors.karla.primary,
    borderWidth: 2,
    transform: [{ scale: 1.12 }],
  },
  activeAvatarRingJavier: {
    borderColor: GAMES_THEME.colors.javier.primary,
    borderWidth: 2,
    transform: [{ scale: 1.12 }],
  },
  avatarLetterKarla: {
    fontSize: 10,
    fontWeight: '900',
    color: GAMES_THEME.colors.karla.text,
  },
  avatarLetterJavier: {
    fontSize: 10,
    fontWeight: '900',
    color: GAMES_THEME.colors.javier.text,
  },
});

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
  simplifiedHeader?: boolean;
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
  simplifiedHeader = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
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

  if (simplifiedHeader) {
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

        {/* Centro: Título Centrado con Ícono */}
        <View style={styles.centerSectionSimple}>
          <View style={styles.titleRow}>
            <View style={styles.iconHalo}>
              <Ionicons name={icon} size={16} color={GAMES_THEME.colors.coral} />
            </View>
            <Text style={styles.gameTitleTextSimple} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

        {/* Derecha: Botón de Reiniciar con Icono y Confirmación */}
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onReset();
          }}
          style={styles.headerResetPill}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Reiniciar partida"
        >
          <Ionicons name="reload" size={14} color="#e11d48" />
          <Text style={styles.headerResetPillText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      {/* Derecha: Avatares K y J de 40px con Nombre Debajo + Botón Reiniciar */}
      <View style={styles.rightSection}>
        <View style={styles.avatarsRow}>
          {/* Avatar Karlita */}
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onPressScore?.('Karla');
            }}
            activeOpacity={0.75}
            style={styles.avatarUnit}
            accessibilityLabel="Ver desglose de Karlita"
          >
            <Animated.View
              style={[
                styles.avatarCircle40,
                {
                  backgroundColor: '#fdf2f8',
                  borderColor: isKarlaTurn ? '#ec4899' : '#ffffff',
                },
                isKarlaTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCoral,
                },
              ]}
            >
              <Text style={styles.avatarLetterKarla}>K</Text>
            </Animated.View>
            <Text style={[styles.avatarSubName, isKarlaTurn && styles.avatarSubNameActive]}>
              Karlita
            </Text>
          </TouchableOpacity>

          {/* Avatar Javier */}
          <TouchableOpacity
            onPress={() => {
              void triggerGameHaptic('light');
              onPressScore?.('Javier');
            }}
            activeOpacity={0.75}
            style={styles.avatarUnit}
            accessibilityLabel="Ver desglose de Javier"
          >
            <Animated.View
              style={[
                styles.avatarCircle40,
                {
                  backgroundColor: '#f0f9ff',
                  borderColor: isJavierTurn ? '#0ea5e9' : '#ffffff',
                },
                isJavierTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCyan,
                },
              ]}
            >
              <Text style={styles.avatarLetterJavier}>J</Text>
            </Animated.View>
            <Text style={[styles.avatarSubName, isJavierTurn && styles.avatarSubNameActive]}>
              Javier
            </Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12.5,
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
    gap: 5,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  turnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  turnPillMyTurn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  turnPillPartner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  turnDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  turnLabelText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  avatarUnit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle40: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  avatarLetterKarla: {
    fontSize: 15,
    fontWeight: '900',
    color: '#be185d',
  },
  avatarLetterJavier: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0369a1',
  },
  avatarSubName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  avatarSubNameActive: {
    fontWeight: '900',
    color: '#0f172a',
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSectionSimple: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleTextSimple: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerResetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  headerResetPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#e11d48',
  },
});

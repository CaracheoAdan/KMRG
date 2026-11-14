import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../ui/Icon';
import { GameIconId, GameVectorIcon } from './GameCustomIcons';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';
import { UserProfile } from '../../../types';
import { useProfile } from '../../../contexts/ProfileContext';
import { useTheme } from '../../../contexts/ThemeContext';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

interface GameHeaderProps {
  gameId?: GameIconId;
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

const resolveGameId = (gameId: GameIconId | undefined, title: string): GameIconId => {
  if (gameId) return gameId;
  const normalized = title.toLowerCase();
  if (normalized.includes('raya')) return 'tictactoe';
  if (normalized.includes('sudoku')) return 'sudoku';
  if (normalized.includes('ajedrez')) return 'chess';
  if (normalized.includes('battle')) return 'battleship';
  if (normalized.includes('ahorcado')) return 'hangman';
  if (normalized.includes('dibuja')) return 'drawguess';
  if (normalized.includes('domin')) return 'domino';
  if (normalized.includes('uno')) return 'uno';
  return 'tictactoe';
};

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameId,
  title,
  turnLabel,
  isMyTurn = false,
  currentTurnPlayer,
  onBack,
  onReset,
  onPressScore,
  primaryColor,
  simplifiedHeader = false,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { getDisplayName, getAvatarUri } = useProfile();
  const { colors, isDark } = useTheme();

  const resolvedGameId = resolveGameId(gameId, title);
  const accentColor = primaryColor || colors.primary || GAMES_THEME.colors.coral;
  const karlaAvatarUri = getAvatarUri('Karla');
  const javierAvatarUri = getAvatarUri('Javier');
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

  const headerGradientColors: readonly [string, string] = isDark
    ? [colors.surface, colors.background]
    : [colors.surface, `${colors.primaryLight}`];

  if (simplifiedHeader) {
    return (
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { borderBottomColor: colors.border }]}
      >
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('light');
            onBack();
          }}
          style={[styles.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Volver al lobby de juegos"
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
          <Text style={[styles.backBtnText, { color: colors.text }]}>Lobby</Text>
        </TouchableOpacity>

        <View style={styles.centerSectionSimple}>
          <View style={styles.titleRow}>
            <View style={[styles.iconHalo, { backgroundColor: `${accentColor}1c` }]}>
              <GameVectorIcon gameId={resolvedGameId} size={16} color={accentColor} />
            </View>
            <Text style={[styles.gameTitleTextSimple, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>

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
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={headerGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerContainer, { borderBottomColor: colors.border }]}
    >
      {/* Botón Volver al Lobby */}
      <TouchableOpacity
        onPress={() => {
          void triggerGameHaptic('light');
          onBack();
        }}
        style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Volver al lobby de juegos"
      >
        <Ionicons name="chevron-back" size={18} color={colors.text} />
        <Text style={[styles.backBtnText, { color: colors.text }]}>Lobby</Text>
      </TouchableOpacity>

      {/* Centro: Título Editorial del Juego + Pill de Turno */}
      <View style={styles.centerSection}>
        <View style={styles.titleRow}>
          <View style={[styles.iconHalo, { backgroundColor: `${accentColor}1c` }]}>
            <GameVectorIcon gameId={resolvedGameId} size={15} color={accentColor} />
          </View>
          <Text style={[styles.gameTitleText, { color: colors.text }]} numberOfLines={1}>
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
              { color: isMyTurn ? (isDark ? '#6ee7b7' : '#065f46') : (isDark ? '#fcd34d' : '#92400e') },
            ]}
            numberOfLines={1}
          >
            {turnLabel}
          </Text>
        </View>
      </View>

      {/* Derecha: Avatares Reales K y J con Nombre + Botón Reiniciar */}
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
            accessibilityLabel={`Ver desglose de ${karlaName}`}
          >
            <Animated.View
              style={[
                styles.avatarCircle40,
                {
                  backgroundColor: '#fdf2f8',
                  borderColor: isKarlaTurn ? '#ec4899' : colors.surface,
                },
                isKarlaTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCoral,
                },
              ]}
            >
              {karlaAvatarUri ? (
                <Image source={{ uri: karlaAvatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetterKarla}>
                  {karlaName.charAt(0).toUpperCase()}
                </Text>
              )}
            </Animated.View>
            <Text
              style={[
                styles.avatarSubName,
                { color: isKarlaTurn ? colors.text : colors.textSecondary },
                isKarlaTurn && styles.avatarSubNameActive,
              ]}
              numberOfLines={1}
            >
              {karlaName}
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
            accessibilityLabel={`Ver desglose de ${javierName}`}
          >
            <Animated.View
              style={[
                styles.avatarCircle40,
                {
                  backgroundColor: '#f0f9ff',
                  borderColor: isJavierTurn ? '#0ea5e9' : colors.surface,
                },
                isJavierTurn && {
                  borderWidth: 2.5,
                  transform: [{ scale: pulseAnim }],
                  ...GAMES_THEME.shadows.glowCyan,
                },
              ]}
            >
              {javierAvatarUri ? (
                <Image source={{ uri: javierAvatarUri }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetterJavier}>
                  {javierName.charAt(0).toUpperCase()}
                </Text>
              )}
            </Animated.View>
            <Text
              style={[
                styles.avatarSubName,
                { color: isJavierTurn ? colors.text : colors.textSecondary },
                isJavierTurn && styles.avatarSubNameActive,
              ]}
              numberOfLines={1}
            >
              {javierName}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Botón Reiniciar Partida */}
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onReset();
          }}
          style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Reiniciar partida"
        >
          <Ionicons name="reload" size={15} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    ...GAMES_THEME.shadows.soft,
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 12,
    gap: 2,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  centerSection: {
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconHalo: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  turnPillPartner: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
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
    gap: 7,
  },
  avatarsRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'flex-start',
  },
  avatarUnit: {
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 46,
  },
  avatarCircle40: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...GAMES_THEME.shadows.soft,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLetterKarla: {
    fontSize: 14,
    fontWeight: '900',
    color: '#be185d',
  },
  avatarLetterJavier: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
  },
  avatarSubName: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  avatarSubNameActive: {
    fontWeight: '900',
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
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
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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

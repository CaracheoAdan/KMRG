import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../ui/Icon';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';

interface ButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'primary' | 'secondary' | 'cyan' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const GameButton: React.FC<ButtonProps> = ({
  label,
  icon,
  onPress,
  disabled = false,
  style,
  variant = 'primary',
  size = 'md',
}) => {
  const handlePress = () => {
    if (disabled) return;
    void triggerGameHaptic('medium');
    onPress();
  };

  const getGradient = () => {
    switch (variant) {
      case 'cyan':
        return GAMES_THEME.gradients.cyanBtn;
      case 'gold':
        return GAMES_THEME.gradients.goldBtn;
      case 'secondary':
        return GAMES_THEME.gradients.secondaryBtn;
      case 'danger':
        return ['#ef4444', '#b91c1c'] as const;
      default:
        return GAMES_THEME.gradients.primaryBtn;
    }
  };

  const padV = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const padH = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13.5;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.secondaryBase,
          {
            paddingVertical: padV,
            paddingHorizontal: padH,
            opacity: disabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={iconSize}
            color={GAMES_THEME.colors.purple}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.secondaryText, { fontSize }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        styles.primaryWrapper,
        GAMES_THEME.shadows.soft,
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <LinearGradient
        colors={getGradient() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradientInner,
          {
            paddingVertical: padV,
            paddingHorizontal: padH,
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={iconSize}
            color="#ffffff"
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.primaryText, { fontSize }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primaryWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  secondaryBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  secondaryText: {
    color: GAMES_THEME.colors.purple,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

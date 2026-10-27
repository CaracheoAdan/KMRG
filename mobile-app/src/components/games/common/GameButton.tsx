import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
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
  variant?: 'primary' | 'secondary' | 'destructive' | 'danger' | 'cyan' | 'gold';
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
    void triggerGameHaptic(variant === 'destructive' || variant === 'danger' ? 'warning' : 'medium');
    onPress();
  };

  const padV = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const padH = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 13.5;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  // 1. Variante Secondary: Fondo blanco con borde lila suave
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
            color="#6b21a8"
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.secondaryText, { fontSize }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // 2. Variante Destructive / Reiniciar: Outline rosa
  if (variant === 'destructive' || variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[
          styles.destructiveBase,
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
            color="#e11d48"
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={[styles.destructiveText, { fontSize }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // 3. Variante Primary: Degradado rosa -> coral, texto blanco y sombra
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
        colors={['#ec4899', '#f43f5e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
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
    borderColor: 'rgba(255, 255, 255, 0.35)',
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
    borderColor: '#e9d5ff',
    backgroundColor: '#ffffff',
    ...GAMES_THEME.shadows.soft,
  },
  secondaryText: {
    color: '#6b21a8',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  destructiveBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#f43f5e',
    backgroundColor: '#fff1f2',
    ...GAMES_THEME.shadows.soft,
  },
  destructiveText: {
    color: '#e11d48',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

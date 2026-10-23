import React, { useCallback, useRef, useEffect } from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  Platform,
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from './Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { MIN_TOUCH, RADII, SPACING, TYPE_SCALE } from '../../theme/designSystem';

/** Tarjeta/botón con feedback suave al tocar (escala elástica con native driver). */
export const PressableScale: React.FC<{
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  scaleTo?: number;
  hitSlop?: number;
}> = ({
  onPress,
  onLongPress,
  disabled,
  style,
  children,
  accessibilityLabel,
  scaleTo = 0.96,
  hitSlop,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      friction: 8,
      tension: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const flatStyle = StyleSheet.flatten(style) || {};
  const pressableLayout: Record<string, any> = {};
  if (flatStyle.flex !== undefined) pressableLayout.flex = flatStyle.flex;
  if (flatStyle.flexGrow !== undefined) pressableLayout.flexGrow = flatStyle.flexGrow;
  if (flatStyle.flexShrink !== undefined) pressableLayout.flexShrink = flatStyle.flexShrink;
  if (flatStyle.flexBasis !== undefined) pressableLayout.flexBasis = flatStyle.flexBasis;
  if (flatStyle.width !== undefined) pressableLayout.width = flatStyle.width;
  if (flatStyle.maxWidth !== undefined) pressableLayout.maxWidth = flatStyle.maxWidth;
  if (flatStyle.minWidth !== undefined) pressableLayout.minWidth = flatStyle.minWidth;
  if (flatStyle.alignSelf !== undefined) pressableLayout.alignSelf = flatStyle.alignSelf;
  if (flatStyle.margin !== undefined) pressableLayout.margin = flatStyle.margin;
  if (flatStyle.marginHorizontal !== undefined) pressableLayout.marginHorizontal = flatStyle.marginHorizontal;
  if (flatStyle.marginVertical !== undefined) pressableLayout.marginVertical = flatStyle.marginVertical;
  if (flatStyle.marginTop !== undefined) pressableLayout.marginTop = flatStyle.marginTop;
  if (flatStyle.marginBottom !== undefined) pressableLayout.marginBottom = flatStyle.marginBottom;
  if (flatStyle.marginLeft !== undefined) pressableLayout.marginLeft = flatStyle.marginLeft;
  if (flatStyle.marginRight !== undefined) pressableLayout.marginRight = flatStyle.marginRight;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={Object.keys(pressableLayout).length > 0 ? pressableLayout : undefined}
    >
      <Animated.View style={[{ width: '100%' }, style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

/** Entrada suave de secciones con animación paralela de opacidad y desplazamiento. */
export const FadeSection: React.FC<{
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ index = 0, style, children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }, index * 45);

    return () => clearTimeout(timer);
  }, [index, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

/** Corazón con latido continuo y efecto de onda expansiva al tocar. */
export const HeartbeatButton: React.FC<{
  onPress: () => void;
  size?: number;
  label?: string;
  disabled?: boolean;
}> = ({ onPress, size = 64, label = 'Latido', disabled }) => {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 420,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 280,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1.05,
          duration: 260,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const handlePress = useCallback(() => {
    ringScale.setValue(1);
    ringOpacity.setValue(0.45);
    Animated.parallel([
      Animated.timing(ringScale, {
        toValue: 1.85,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(ringOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPress();
  }, [ringScale, ringOpacity, onPress]);

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primary,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }}
        />
        <Pressable
          onPress={handlePress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Enviar latido"
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
        >
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 14,
                elevation: 8,
              }}
            >
              <Ionicons name="heart" size={size * 0.46} color={colors.primaryOn} />
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
      <Text style={[TYPE_SCALE.caption, { color: colors.primary, fontWeight: '800' }]}>{label}</Text>
    </View>
  );
};

/** Estado vacío ilustrado con ícono grande y texto amable. */
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  message: string;
  compact?: boolean;
}> = ({ icon, title, message, compact }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 380,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[es.wrap, { opacity }, compact && { paddingVertical: SPACING.sm }]}>
      <LinearGradient
        colors={[colors.primaryLight, colors.surfaceAlt]}
        style={[es.circle, compact && { width: 72, height: 72, borderRadius: 36 }]}
      >
        <Ionicons name={icon} size={compact ? 30 : 40} color={colors.primary} />
      </LinearGradient>
      <Text style={[TYPE_SCALE.subtitle, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      <Text style={[TYPE_SCALE.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}>
        {message}
      </Text>
    </Animated.View>
  );
};

const es = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});

export { RADII };

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  Platform,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from './Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { MIN_TOUCH, RADII, SPACING, TYPE_SCALE } from '../../theme/designSystem';

/** Tarjeta/botón con feedback suave al tocar (escala con resorte). */
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
  // En Web, usamos transición CSS directa para evitar dependencias de worklets Reanimated
  if (Platform.OS === 'web') {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          style,
          pressed && !disabled ? { transform: [{ scale: scaleTo }], opacity: 0.95 } : null,
          { transition: 'transform 120ms ease, opacity 120ms ease' } as any,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <NativePressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      style={style}
      accessibilityLabel={accessibilityLabel}
      scaleTo={scaleTo}
      hitSlop={hitSlop}
    >
      {children}
    </NativePressableScale>
  );
};

const NativePressableScale: React.FC<{
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
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(
    () => ({ transform: [{ scale: scale.value }] }),
    [scale]
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 240 });
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
};

/** Entrada suave de secciones (transición al abrir pestañas). */
export const FadeSection: React.FC<{
  index?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ index = 0, style, children }) => {
  if (Platform.OS === 'web') {
    return <View style={style}>{children}</View>;
  }
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(380)} style={style}>
      {children}
    </Animated.View>
  );
};

/** Corazón con pulso continuo y latido fuerte al tocar. */
export const HeartbeatButton: React.FC<{
  onPress: () => void;
  size?: number;
  label?: string;
  disabled?: boolean;
}> = (props) => {
  if (Platform.OS === 'web') {
    return <WebHeartbeatButton {...props} />;
  }
  return <NativeHeartbeatButton {...props} />;
};

const WebHeartbeatButton: React.FC<{
  onPress: () => void;
  size?: number;
  label?: string;
  disabled?: boolean;
}> = ({ onPress, size = 64, label = 'Latido', disabled }) => {
  const { colors } = useTheme();
  const [pressed, setPressed] = React.useState(false);

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={onPress}
          onPressIn={() => setPressed(true)}
          onPressOut={() => setPressed(false)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Enviar latido"
          style={[
            { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH },
            pressed && { transform: [{ scale: 0.94 }] },
            { transition: 'transform 120ms ease' } as any,
          ]}
        >
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
        </Pressable>
      </View>
      <Text style={[TYPE_SCALE.caption, { color: colors.primary, fontWeight: '800' }]}>{label}</Text>
    </View>
  );
};

const NativeHeartbeatButton: React.FC<{
  onPress: () => void;
  size?: number;
  label?: string;
  disabled?: boolean;
}> = ({ onPress, size = 64, label = 'Latido', disabled }) => {
  const { colors } = useTheme();
  const pulse = useSharedValue(1);
  const burst = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 420, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 280 }),
        withTiming(1.05, { duration: 260 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      false
    );
  }, [pulse]);

  const animated = useAnimatedStyle(
    () => ({ transform: [{ scale: pulse.value }] }),
    [pulse]
  );
  const ring = useAnimatedStyle(
    () => ({
      opacity: 0.45 * (1 - burst.value),
      transform: [{ scale: 1 + burst.value * 0.9 }],
    }),
    [burst]
  );

  const handle = useCallback(() => {
    burst.value = 0;
    burst.value = withTiming(1, { duration: 650 });
    onPress();
  }, [burst, onPress]);

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: size + 16, height: size + 16, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.primary,
            },
            ring,
          ]}
        />
        <Pressable
          onPress={handle}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Enviar latido"
          style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
        >
          <Animated.View style={animated}>
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

/** Estado vacío amable con ícono grande. */
export const EmptyState: React.FC<{
  icon: string;
  title: string;
  message: string;
  compact?: boolean;
}> = ({ icon, title, message, compact }) => {
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';
  const Wrapper = isWeb ? View : Animated.View;

  return (
    <Wrapper
      {...(!isWeb ? { entering: FadeIn.duration(400) } : {})}
      style={[es.wrap, compact && { paddingVertical: SPACING.sm }]}
    >
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
    </Wrapper>
  );
};

const es = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: SPACING.xs, paddingVertical: SPACING.md },
  circle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});

export { RADII };

import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '../components/ui/Icon';
import { RootTabParamList } from '../types';
import { TodayScreen } from '../screens/TodayScreen';
import { MoviesScreen } from '../screens/MoviesScreen';
import { WriteScreen } from '../screens/WriteScreen';
import { GamesScreen } from '../screens/GamesScreen';
import { MemoriesScreen } from '../screens/MemoriesScreen';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator<RootTabParamList>();

const createAccessibleTabButton = (label: string, hint: string) => {
  return (props: BottomTabBarButtonProps) => (
    <TouchableOpacity
      onPress={(e) => props.onPress?.(e as any)}
      onLongPress={(e) => props.onLongPress?.(e as any)}
      style={props.style as any}
      activeOpacity={0.8}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={props.accessibilityState}
    >
      {props.children}
    </TouchableOpacity>
  );
};

export const TabNavigator: React.FC = () => {
  const { primaryColor, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            shadowColor: colors.shadow,
            height: 64 + insets.bottom,
            paddingBottom: 8 + insets.bottom,
          },
        ],
        animation: 'fade',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Hoy"
        component={TodayScreen as any}
        options={{
          tabBarLabel: 'Hoy',
          tabBarButton: createAccessibleTabButton('Hoy', 'Nuestro rincón de hoy') as any,
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [styles.activeIconContainer, { backgroundColor: `${primaryColor}16` }],
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Cine"
        component={MoviesScreen as any}
        options={{
          tabBarLabel: 'Cine',
          tabBarButton: createAccessibleTabButton('Cine y Planes', 'Películas y lista de sueños') as any,
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [styles.activeIconContainer, { backgroundColor: `${primaryColor}16` }],
              ]}
            >
              <Ionicons
                name={focused ? 'film' : 'film-outline'}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Escribir"
        component={WriteScreen as any}
        options={{
          tabBarLabel: 'Escribir',
          tabBarButton: createAccessibleTabButton('Escribir', 'Redactar una carta para tu pareja') as any,
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.writeIconHalo,
                focused && { borderColor: `${primaryColor}45`, borderWidth: 2 },
              ]}
            >
              <View
                style={[
                  styles.writeIconCircle,
                  { backgroundColor: primaryColor, shadowColor: primaryColor },
                  focused && { transform: [{ scale: 1.06 }] },
                ]}
              >
                <Ionicons name="pencil" size={17} color="#ffffff" />
              </View>
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Juegos"
        component={GamesScreen as any}
        options={{
          tabBarLabel: 'Juegos',
          tabBarButton: createAccessibleTabButton('Juegos', 'Minijuegos de pareja') as any,
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [styles.activeIconContainer, { backgroundColor: `${primaryColor}16` }],
              ]}
            >
              <Ionicons
                name={focused ? 'game-controller' : 'game-controller-outline'}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="Nosotros"
        component={MemoriesScreen as any}
        options={{
          tabBarLabel: 'Nosotros',
          tabBarButton: createAccessibleTabButton('Nosotros', 'Álbum de fotos y calendario') as any,
          tabBarIcon: ({ focused, color }) => (
            <View
              style={[
                styles.iconContainer,
                focused && [styles.activeIconContainer, { backgroundColor: `${primaryColor}16` }],
              ]}
            >
              <Ionicons
                name={focused ? 'heart' : 'heart-outline'}
                size={20}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeIconContainer: {
    transform: [{ scale: 1.04 }],
  },
  writeIconHalo: {
    padding: 2.5,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  writeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
});

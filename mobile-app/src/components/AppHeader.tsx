import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { CoupleWrappedModal } from './CoupleWrappedModal';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

interface AppHeaderProps {
  streakCount?: number;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  streakCount = 1,
  rightAction,
}) => {
  const { profile, logout } = useProfile();
  const { primaryColor, openThemeModal } = useTheme();
  const currentProfile = profile || 'Karla';

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  const handleProfilePress = () => {
    Alert.alert(
      'Perfil Activo',
      `Estás usando la app como ${currentProfile === 'Karla' ? 'Karlita' : 'Javier'}.\n\n¿Quieres cambiar de perfil?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: `Cambiar a ${currentProfile === 'Karla' ? 'Javier' : 'Karlita'}`,
          onPress: () => void logout(),
        },
      ]
    );
  };

  return (
    <View style={[styles.headerContainer, { borderBottomColor: `${primaryColor}25` }]}>
      <View style={styles.topRow}>
        {/* Izquierda: Paleta, Estadísticas (Wrapped) y Racha */}
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={openThemeModal}
            style={[
              styles.iconButton,
              { backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30` },
            ]}
            activeOpacity={0.75}
            accessibilityLabel="Cambiar tema de color"
          >
            <Ionicons name="color-palette-outline" size={16} color={primaryColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsWrappedOpen(true)}
            style={[
              styles.iconButton,
              { backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30` },
            ]}
            activeOpacity={0.75}
            accessibilityLabel="Ver estadísticas de pareja"
          >
            <Ionicons name="stats-chart-outline" size={15} color={primaryColor} />
          </TouchableOpacity>

          <View style={[styles.streakBadge, { backgroundColor: `${primaryColor}12` }]}>
            <Ionicons name="flame" size={12} color="#f97316" />
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        </View>

        {/* Centro: Nombre de la Aplicación KMRG */}
        <TouchableOpacity
          onPress={() => setIsWrappedOpen(true)}
          activeOpacity={0.85}
          style={styles.brandCenter}
        >
          <View style={styles.titleWithEmblem}>
            <Text style={[styles.brandTitle, { color: primaryColor }]}>KMRG</Text>
            <Ionicons name="heart" size={11} color={primaryColor} style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.brandSubtitle}>Karlita & Javier</Text>
        </TouchableOpacity>

        {/* Derecha: Perfil Activo */}
        <View style={styles.rightActions}>
          {rightAction ? (
            rightAction
          ) : (
            <TouchableOpacity
              onPress={handleProfilePress}
              onLongPress={handleProfilePress}
              style={[
                styles.profilePill,
                {
                  borderColor: currentProfile === 'Karla' ? '#c084fc' : '#7dd3fc',
                  backgroundColor: currentProfile === 'Karla' ? '#f3e8ff' : '#e0f2fe',
                },
              ]}
              activeOpacity={0.75}
              accessibilityLabel={`Perfil activo: ${currentProfile}`}
            >
              <View
                style={[
                  styles.profileDot,
                  { backgroundColor: currentProfile === 'Karla' ? '#9333ea' : '#0284c7' },
                ]}
              />
              <Text style={styles.profileText}>
                {currentProfile === 'Karla' ? 'Karlita' : 'Javier'}
              </Text>
              <Ionicons name="swap-horizontal" size={12} color="#64748b" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal Global: Estadísticas Wrapped */}
      <CoupleWrappedModal
        visible={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        primaryColor={primaryColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1.2,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.3,
  },
  titleWithEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    letterSpacing: 2.2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: -1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1.2,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  profileDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
  profileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
});

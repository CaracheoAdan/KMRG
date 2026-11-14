import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '../ui/Icon';
import { PressableScale } from '../ui/Kit';
import { useTheme } from '../../contexts/ThemeContext';
import { useCoupleFeatures } from '../../contexts/CoupleFeaturesContext';

export const CoupleFeaturesHub: React.FC = () => {
  const { colors } = useTheme();
  const { openSidebar } = useCoupleFeatures();

  return (
    <PressableScale
      onPress={openSidebar}
      style={[
        styles.dsCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      accessibilityLabel="Abrir barra lateral de Nuestro Rincón"
    >
      <View style={styles.dsCardHeader}>
        <View style={[styles.dsIconCircle, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
        </View>
        <Text
          style={[styles.dsCardLabel, { color: colors.textMuted }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          NUESTRO RINCÓN
        </Text>
      </View>

      <Text
        style={[styles.dsMainTitle, { color: colors.text }]}
        numberOfLines={2}
        maxFontSizeMultiplier={1.2}
      >
        Vales, Ruleta, Notitas y Más
      </Text>

      <View style={styles.bottomRow}>
        <View style={[styles.actionChip, { backgroundColor: colors.primaryLight }]}>
          <Text
            style={[styles.actionChipText, { color: colors.primary }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            Abrir menú lateral
          </Text>
          <Ionicons name="chevron-forward" size={12} color={colors.primary} />
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  dsCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    justifyContent: 'space-between',
  },
  dsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dsIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dsCardLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  dsMainTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 17.5,
    marginVertical: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  actionChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
});

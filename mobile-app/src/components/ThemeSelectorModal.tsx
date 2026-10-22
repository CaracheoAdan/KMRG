import React from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { useTheme, THEME_COLOR_PRESETS } from '../contexts/ThemeContext';
import { FONTS, COLORS } from '../theme/designSystem';

export const ThemeSelectorModal: React.FC = () => {
  const { colors: themeColors } = useTheme();
  const styles = React.useMemo(() => makeStyles(themeColors), [themeColors]);
  const { isThemeModalOpen, closeThemeModal, currentTheme, setThemeById, primaryColor } = useTheme();

  return (
    <Modal
      visible={isThemeModalOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={closeThemeModal}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.paletteIcon, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="color-palette-outline" size={22} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.title}>Personalizar Tema</Text>
                <Text style={styles.subtitle}>Elige el tono principal de la aplicación</Text>
              </View>
            </View>
            <TouchableOpacity onPress={closeThemeModal} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          {/* Tarjeta de previsualización */}
          <View
            style={[
              styles.previewBox,
              { borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}0d` },
            ]}
          >
            <View style={styles.previewLeft}>
              <View style={[styles.previewSwatch, { backgroundColor: primaryColor }]} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.previewName, { color: primaryColor }]}>
                  {currentTheme.name}
                </Text>
                <Text style={styles.previewHint}>Paleta activa en toda la aplicación</Text>
              </View>
            </View>
            <View style={[styles.previewBadge, { backgroundColor: primaryColor }]}>
              <Text style={styles.previewBadgeText}>Activo</Text>
            </View>
          </View>

          {/* Lista de colores disponibles */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            <View style={styles.presetsGrid}>
              {THEME_COLOR_PRESETS.map((preset) => {
                const isSelected = preset.id === currentTheme.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    onPress={() => void setThemeById(preset.id)}
                    style={[
                      styles.colorItem,
                      isSelected && [styles.colorItemSelected, { borderColor: preset.hex }],
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorCircle, { backgroundColor: preset.hex }]}>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={16} color="#ffffff" />
                      ) : (
                        <View style={styles.innerDot} />
                      )}
                    </View>
                    <View style={styles.colorInfo}>
                      <Text
                        style={[
                          styles.colorName,
                          isSelected && { color: preset.hex, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {preset.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Botón cerrar */}
          <TouchableOpacity
            onPress={closeThemeModal}
            style={[styles.doneBtn, { backgroundColor: primaryColor }]}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.doneBtnText}>Aplicar Tema</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '85%',
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paletteIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.serif,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: FONTS.sans,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  previewHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: FONTS.sans,
  },
  previewBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewBadgeText: {
    fontSize: 11,
    color: c.primaryOn,
    fontWeight: '700',
    fontFamily: FONTS.sans,
  },
  scrollList: {
    marginBottom: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  colorItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    gap: 10,
  },
  colorItemSelected: {
    backgroundColor: c.surface,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  colorInfo: {
    flex: 1,
  },
  colorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    fontFamily: FONTS.sans,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primaryOn,
    fontFamily: FONTS.sans,
  },
});

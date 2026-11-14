import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../ui/Icon';
import { triggerGameHaptic } from '../../theme/gamesTheme';

interface ColorSpectrumPickerModalProps {
  visible: boolean;
  initialColor: string;
  recentColors?: string[];
  primaryColor?: string;
  onSelectColor: (hex: string) => void;
  onClose: () => void;
}

const SPECTRUM_RAINBOW = [
  '#ff0000',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#0000ff',
  '#ff00ff',
  '#ff0000',
] as const;

const EXTENDED_SWATCH_GROUPS: Array<{ title: string; colors: string[] }> = [
  {
    title: 'Básicos y Piel',
    colors: [
      '#000000', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#ffffff',
      '#fef3c7', '#fde6d2', '#f7cba4', '#e0a97b', '#c68642', '#8d5524',
    ],
  },
  {
    title: 'Cálidos y Neón',
    colors: [
      '#7f1d1d', '#dc2626', '#ef4444', '#fb7185', '#ff007f', '#ff5e3a',
      '#ea580c', '#f97316', '#fb923c', '#f59e0b', '#facc15', '#fef08a',
    ],
  },
  {
    title: 'Naturaleza y Océano',
    colors: [
      '#bef264', '#84cc16', '#22c55e', '#10b981', '#14532d', '#6ee7b7',
      '#14b8a6', '#06b6d4', '#22d3ee', '#38bdf8', '#0284c7', '#1e3a8a',
    ],
  },
  {
    title: 'Mágicos y Pastel',
    colors: [
      '#3b82f6', '#4f46e5', '#6366f1', '#7c3aed', '#9333ea', '#581c87',
      '#c084fc', '#e879f9', '#d946ef', '#ec4899', '#f472b6', '#fbcfe8',
    ],
  },
];

export function isLightHexColor(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.78;
}

function hsvToHex(h: number, s: number, v: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const val = Math.max(0, Math.min(1, v));

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hue < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (hue < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (hue < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (hue < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (hue < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else {
    r1 = c; g1 = 0; b1 = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return { h: 0, s: 1, v: 1 };
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return { h: 0, s: 1, v: 1 };
  }

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

export const ColorSpectrumPickerModal: React.FC<ColorSpectrumPickerModalProps> = ({
  visible,
  initialColor,
  recentColors = [],
  primaryColor = '#10b981',
  onSelectColor,
  onClose,
}) => {
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() =>
    hexToHsv(initialColor)
  );

  useEffect(() => {
    if (visible) {
      setHsv(hexToHsv(initialColor));
    }
  }, [visible, initialColor]);

  const svBoxRef = useRef<any>(null);
  const svRectRef = useRef<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 260,
    height: 150,
  });

  const hueBarRef = useRef<any>(null);
  const hueRectRef = useRef<{ left: number; width: number }>({
    left: 0,
    width: 260,
  });

  const updateSvFromTouch = (pageX: number, pageY: number, locX: number, locY: number) => {
    const rect = svRectRef.current;
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const relX = rect.left > 0 ? pageX - rect.left : locX;
    const relY = rect.top > 0 ? pageY - rect.top : locY;
    const s = Math.max(0, Math.min(1, relX / w));
    const v = Math.max(0, Math.min(1, 1 - relY / h));
    setHsv((prev) => ({ ...prev, s, v }));
  };

  const updateHueFromTouch = (pageX: number, locX: number) => {
    const rect = hueRectRef.current;
    const w = Math.max(1, rect.width);
    const relX = rect.left > 0 ? pageX - rect.left : locX;
    const h = Math.max(0, Math.min(359.9, (relX / w) * 360));
    setHsv((prev) => ({ ...prev, h }));
  };

  const svPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        svBoxRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (width > 0 && height > 0) {
            svRectRef.current = { left: x, top: y, width, height };
          }
          updateSvFromTouch(pageX, pageY, locationX, locationY);
        });
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY, locationX, locationY } = evt.nativeEvent;
        updateSvFromTouch(pageX, pageY, locationX, locationY);
      },
    })
  ).current;

  const huePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const { pageX, locationX } = evt.nativeEvent;
        hueBarRef.current?.measureInWindow((x: number, _y: number, width: number) => {
          if (width > 0) {
            hueRectRef.current = { left: x, width };
          }
          updateHueFromTouch(pageX, locationX);
        });
      },
      onPanResponderMove: (evt) => {
        const { pageX, locationX } = evt.nativeEvent;
        updateHueFromTouch(pageX, locationX);
      },
    })
  ).current;

  const selectedHex = hsvToHex(hsv.h, hsv.s, hsv.v);
  const pureHueHex = hsvToHex(hsv.h, 1, 1);

  const handleConfirm = () => {
    void triggerGameHaptic('selection');
    onSelectColor(selectedHex);
    onClose();
  };

  const handleQuickSwatch = (hex: string) => {
    void triggerGameHaptic('selection');
    onSelectColor(hex);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.previewCircle, { backgroundColor: selectedHex }]} />
              <View>
                <Text style={styles.title}>Paleta Infinita de Colores</Text>
                <Text style={styles.hexLabel}>{selectedHex.toUpperCase()}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Cuadro 2D Saturación × Brillo */}
          <View
            ref={svBoxRef}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              svRectRef.current.width = width;
              svRectRef.current.height = height;
            }}
            style={styles.svBox}
            {...svPanResponder.panHandlers}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['#ffffff', pureHueHex]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0)', '#000000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Cursor selector */}
            <View
              pointerEvents="none"
              style={[
                styles.svThumb,
                {
                  left: `${Math.max(0, Math.min(100, hsv.s * 100))}%`,
                  top: `${Math.max(0, Math.min(100, (1 - hsv.v) * 100))}%`,
                  backgroundColor: selectedHex,
                },
              ]}
            />
          </View>

          {/* Barra Arcoíris de Tono (Hue) */}
          <View
            ref={hueBarRef}
            onLayout={(e) => {
              hueRectRef.current.width = e.nativeEvent.layout.width;
            }}
            style={styles.hueBarWrap}
            {...huePanResponder.panHandlers}
          >
            <LinearGradient
              pointerEvents="none"
              colors={[...SPECTRUM_RAINBOW]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.hueGradient}
            />
            <View
              pointerEvents="none"
              style={[
                styles.hueThumb,
                {
                  left: `${Math.max(0, Math.min(100, (hsv.h / 360) * 100))}%`,
                  backgroundColor: pureHueHex,
                },
              ]}
            />
          </View>

          {/* Colores recientes o paleta completa */}
          <ScrollView
            style={styles.swatchesScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
          >
            {recentColors.length > 0 && (
              <View>
                <Text style={styles.groupTitle}>Recientes</Text>
                <View style={styles.swatchGrid}>
                  {recentColors.map((hex) => (
                    <TouchableOpacity
                      key={`rec-${hex}`}
                      onPress={() => handleQuickSwatch(hex)}
                      style={[
                        styles.swatchBtn,
                        { backgroundColor: hex },
                        isLightHexColor(hex) && styles.lightBorder,
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {EXTENDED_SWATCH_GROUPS.map((grp) => (
              <View key={grp.title}>
                <Text style={styles.groupTitle}>{grp.title}</Text>
                <View style={styles.swatchGrid}>
                  {grp.colors.map((hex) => (
                    <TouchableOpacity
                      key={`${grp.title}-${hex}`}
                      onPress={() => handleQuickSwatch(hex)}
                      style={[
                        styles.swatchBtn,
                        { backgroundColor: hex },
                        isLightHexColor(hex) && styles.lightBorder,
                        selectedHex.toLowerCase() === hex.toLowerCase() && styles.swatchActive,
                      ]}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Botón confirmar color del espectro */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmBtn, { backgroundColor: primaryColor }]}
            activeOpacity={0.85}
          >
            <View style={[styles.confirmSwatch, { backgroundColor: selectedHex }]} />
            <Text style={styles.confirmBtnText}>Usar este color</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  hexLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svBox: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    position: 'relative',
    marginBottom: 12,
  },
  svThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    marginLeft: -11,
    marginTop: -11,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  hueBarWrap: {
    width: '100%',
    height: 26,
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 12,
  },
  hueGradient: {
    width: '100%' as const,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  hueThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: '#ffffff',
    marginLeft: -12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  swatchesScroll: {
    maxHeight: 195,
    marginBottom: 12,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatchBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  lightBorder: {
    borderColor: '#cbd5e1',
  },
  swatchActive: {
    borderColor: '#0f172a',
    borderWidth: 2.5,
    transform: [{ scale: 1.12 }],
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  confirmSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});

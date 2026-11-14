import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PanResponder,
  GestureResponderEvent,
  Modal,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatDisplayDate } from '../../services/StorageService';
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  SharedDoodle,
  DoodleStroke,
  DoodlePoint,
  pointsToSvgPath,
  getDoodleBoundingBox,
  getAllDoodles,
  saveDoodle,
  deleteDoodle,
  subscribeDoodles,
  DOODLE_COLORS,
  DOODLE_BRUSH_WIDTHS,
  NAPKIN_BACKGROUNDS,
} from '../../services/feature/napkinDoodleService';
import { UserProfile } from '../../types';

type DoodleTab = 'received' | 'draw' | 'mine';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const NapkinDoodleModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor, primaryLight } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';
  const partnerProfile: UserProfile = activeProfile === 'Javier' ? 'Karla' : 'Javier';

  const myDisplayName = getDisplayName(activeProfile);
  const partnerDisplayName = getDisplayName(partnerProfile);

  const [activeTab, setActiveTab] = useState<DoodleTab>('received');
  const [doodles, setDoodles] = useState<SharedDoodle[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDoodle, setSelectedDoodle] = useState<SharedDoodle | null>(null);

  // Estado del lienzo
  const [strokes, setStrokes] = useState<DoodleStroke[]>([]);
  const [currentColor, setCurrentColor] = useState<string>(DOODLE_COLORS[0]);
  const [currentWidth, setCurrentWidth] = useState<number>(DOODLE_BRUSH_WIDTHS[1].value);
  const [currentBg, setCurrentBg] = useState<string>(NAPKIN_BACKGROUNDS[0].value);
  const [title, setTitle] = useState('');
  const [activeStroke, setActiveStroke] = useState<DoodleStroke | null>(null);

  // Referencias para el PanResponder
  const activeStrokeRef = useRef<DoodleStroke | null>(null);
  const strokesRef = useRef<DoodleStroke[]>([]);
  strokesRef.current = strokes;

  const currentColorRef = useRef(currentColor);
  currentColorRef.current = currentColor;

  const currentWidthRef = useRef(currentWidth);
  currentWidthRef.current = currentWidth;

  const hasInitializedTab = useRef(false);

  const loadData = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const rows = await getAllDoodles(force);
        setDoodles(rows);

        // Si es la primera carga tras abrir el modal, elegimos la pestaña más útil
        if (!hasInitializedTab.current) {
          const hasPartner = rows.some((d) => d.author === partnerProfile);
          if (hasPartner) {
            setActiveTab('received');
          } else if (rows.some((d) => d.author === activeProfile)) {
            setActiveTab('mine');
          } else {
            setActiveTab('draw');
          }
          hasInitializedTab.current = true;
        }
      } catch {
        // Ignorar error de red
      } finally {
        setLoading(false);
      }
    },
    [partnerProfile, activeProfile]
  );

  useEffect(() => {
    if (visible) {
      void loadData(true);
      const unsub = subscribeDoodles(() => {
        void loadData(true);
      });
      return unsub;
    } else {
      hasInitializedTab.current = false;
      setSelectedDoodle(null);
    }
  }, [visible, loadData]);

  // Filtros de dibujos recibidos y enviados
  const partnerDoodles = useMemo(
    () => doodles.filter((d) => d.author === partnerProfile),
    [doodles, partnerProfile]
  );

  const myDoodles = useMemo(
    () => doodles.filter((d) => d.author === activeProfile),
    [doodles, activeProfile]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { locationX, locationY } = evt.nativeEvent;
        const newStroke: DoodleStroke = {
          color: currentColorRef.current,
          width: currentWidthRef.current,
          points: [{ x: Math.round(locationX * 10) / 10, y: Math.round(locationY * 10) / 10 }],
        };
        activeStrokeRef.current = newStroke;
        setActiveStroke(newStroke);
      },

      onPanResponderMove: (evt: GestureResponderEvent) => {
        const current = activeStrokeRef.current;
        if (!current) return;
        const { locationX, locationY } = evt.nativeEvent;
        const nextPt = { x: Math.round(locationX * 10) / 10, y: Math.round(locationY * 10) / 10 };
        const lastPt = current.points[current.points.length - 1];
        if (lastPt) {
          const dx = nextPt.x - lastPt.x;
          const dy = nextPt.y - lastPt.y;
          if (dx * dx + dy * dy < 9) return;
        }
        const updatedPoints: DoodlePoint[] = [...current.points, nextPt];
        const updatedStroke: DoodleStroke = {
          ...current,
          points: updatedPoints,
        };
        activeStrokeRef.current = updatedStroke;
        setActiveStroke(updatedStroke);
      },

      onPanResponderRelease: () => {
        const finishedStroke = activeStrokeRef.current;
        activeStrokeRef.current = null;
        setActiveStroke(null);
        if (
          finishedStroke &&
          Array.isArray(finishedStroke.points) &&
          finishedStroke.points.length > 0
        ) {
          setStrokes((prev) => [
            ...prev.filter(
              (s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0)
            ),
            finishedStroke,
          ]);
        }
      },

      onPanResponderTerminate: () => {
        const finishedStroke = activeStrokeRef.current;
        activeStrokeRef.current = null;
        setActiveStroke(null);
        if (
          finishedStroke &&
          Array.isArray(finishedStroke.points) &&
          finishedStroke.points.length > 0
        ) {
          setStrokes((prev) => [
            ...prev.filter(
              (s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0)
            ),
            finishedStroke,
          ]);
        }
      },
    })
  ).current;

  const handleUndo = () => {
    setStrokes((prev) =>
      prev
        .filter((s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0))
        .slice(0, -1)
    );
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    Alert.alert('¿Limpiar lienzo?', 'Se borrarán todos los trazos actuales.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: () => setStrokes([]) },
    ]);
  };

  const handleSave = async () => {
    const validStrokes = strokes.filter(
      (s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0)
    );
    if (validStrokes.length === 0) {
      Alert.alert('Lienzo vacío', 'Dibuja algo bonito antes de dedicar la notita.');
      return;
    }
    setSaving(true);
    try {
      await saveDoodle({
        author: activeProfile,
        title: title.trim() || 'Dibujito para ti ❤️',
        strokes: validStrokes,
        background_color: currentBg,
      });
      setStrokes([]);
      setTitle('');
      Alert.alert('¡Notita enviada! 💌', `Tu dibujito ha sido dedicado a ${partnerDisplayName}.`);
      setActiveTab('mine');
      await loadData(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la notita.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('¿Eliminar notita?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoodle(id);
            setDoodles((prev) => prev.filter((d) => d.id !== id));
            if (selectedDoodle?.id === id) {
              setSelectedDoodle(null);
            }
          } catch {
            Alert.alert('Error', 'No se pudo eliminar la notita.');
          }
        },
      },
    ]);
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Notita Dibujada"
      subtitle="Mensajes y garabatos de amor hechos a mano"
      icon="brush"
      scroll={false}
      headerRight={
        <TouchableOpacity
          onPress={() => void loadData(true)}
          disabled={loading}
          style={[styles.headerRefreshBtn, { backgroundColor: colors.surfaceAlt }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Actualizar dibujos"
        >
          {loading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : (
            <Ionicons name="refresh" size={18} color={primaryColor} />
          )}
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Selector de 3 pestañas intuitivas */}
        <View style={[styles.tabsRow, { borderBottomColor: colors.border }]}>
          {/* Pestaña 1: Recibidos de la pareja */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'received' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab('received')}
          >
            <Ionicons
              name="heart"
              size={17}
              color={activeTab === 'received' ? primaryColor : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'received' ? primaryColor : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              De {partnerDisplayName}
            </Text>
            {partnerDoodles.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: primaryColor }]}>
                <Text style={styles.tabBadgeText}>{partnerDoodles.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Pestaña 2: Lienzo para dibujar */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'draw' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab('draw')}
          >
            <Ionicons
              name="brush"
              size={17}
              color={activeTab === 'draw' ? primaryColor : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'draw' ? primaryColor : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              Dibujar
            </Text>
          </TouchableOpacity>

          {/* Pestaña 3: Mis creaciones enviadas */}
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'mine' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab('mine')}
          >
            <Ionicons
              name="folder-outline"
              size={17}
              color={activeTab === 'mine' ? primaryColor : colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'mine' ? primaryColor : colors.textMuted },
              ]}
              numberOfLines={1}
            >
              Mis Dibujos ({myDoodles.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= CONTENIDO DE CADA PESTAÑA ================= */}
        {activeTab === 'received' ? (
          <ScrollView
            style={styles.galleryScroll}
            contentContainerStyle={styles.galleryContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && doodles.length === 0 ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={primaryColor} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Buscando notitas de {partnerDisplayName}...
                </Text>
              </View>
            ) : partnerDoodles.length === 0 ? (
              <View style={styles.centerContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="mail-open-outline" size={44} color={primaryColor} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Aún no hay notitas de {partnerDisplayName}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  En cuanto {partnerDisplayName} te dibuje algo en su servilleta aparecerá aquí para ti.
                </Text>
                <TouchableOpacity
                  style={[styles.actionCtaBtn, { backgroundColor: primaryColor }]}
                  onPress={() => setActiveTab('draw')}
                >
                  <Ionicons name="brush" size={16} color="#ffffff" />
                  <Text style={styles.actionCtaBtnText}>
                    ¡Dedícale un dibujo primero!
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.receivedBanner, { backgroundColor: primaryLight, borderColor: primaryColor }]}>
                  <Ionicons name="sparkles" size={18} color={primaryColor} />
                  <Text style={[styles.receivedBannerText, { color: primaryColor }]}>
                    {partnerDoodles.length === 1
                      ? `¡Tienes 1 dibujo de ${partnerDisplayName}!`
                      : `¡Tienes ${partnerDoodles.length} dibujos hermosos de ${partnerDisplayName}!`}
                  </Text>
                </View>

                {partnerDoodles.map((item) => {
                  const bbox = getDoodleBoundingBox(item.strokes);
                  return (
                    <FeatureCard key={item.id} style={styles.doodleCard}>
                      <View style={styles.doodleCardHeader}>
                        <View style={styles.doodleCardInfo}>
                          <View style={styles.doodleTitleRow}>
                            <Ionicons name="heart" size={16} color={primaryColor} />
                            <Text style={[styles.doodleCardTitle, { color: colors.text }]}>
                              {item.title}
                            </Text>
                          </View>
                          <Text style={[styles.doodleCardMeta, { color: colors.textMuted }]}>
                            Dedicado por {partnerDisplayName} • {formatDisplayDate(item.created_at)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setSelectedDoodle(item)}
                          style={[styles.expandChip, { backgroundColor: colors.surfaceAlt }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="expand" size={14} color={primaryColor} />
                          <Text style={[styles.expandChipText, { color: primaryColor }]}>Ampliar</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Lienzo servilleta con escalado viewBox y toque para ampliar */}
                      <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={() => setSelectedDoodle(item)}
                        style={[
                          styles.doodlePreviewCanvas,
                          { backgroundColor: item.background_color, borderColor: colors.border },
                        ]}
                      >
                        <Svg
                          width="100%"
                          height="100%"
                          viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
                          preserveAspectRatio="xMidYMid meet"
                          style={StyleSheet.absoluteFill}
                        >
                          {(item.strokes || [])
                            .filter((s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0))
                            .map((stroke, sIdx) => (
                              <Path
                                key={`s-${item.id}-${sIdx}`}
                                d={pointsToSvgPath(stroke.points)}
                                stroke={stroke.color}
                                strokeWidth={stroke.width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            ))}
                        </Svg>

                        <View style={styles.canvasTapHint}>
                          <Ionicons name="search" size={12} color="#ffffff" />
                          <Text style={styles.canvasTapHintText}>Toca para ver en grande</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Botón rápido para responder */}
                      <View style={styles.cardBottomRow}>
                        <TouchableOpacity
                          style={[styles.replyBtn, { backgroundColor: primaryLight, borderColor: primaryColor }]}
                          onPress={() => {
                            setTitle(`Para ${partnerDisplayName} ❤️`);
                            setActiveTab('draw');
                          }}
                        >
                          <Ionicons name="brush" size={14} color={primaryColor} />
                          <Text style={[styles.replyBtnText, { color: primaryColor }]}>
                            Responder con un dibujito
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </FeatureCard>
                  );
                })}
              </>
            )}
          </ScrollView>
        ) : activeTab === 'mine' ? (
          <ScrollView
            style={styles.galleryScroll}
            contentContainerStyle={styles.galleryContent}
            showsVerticalScrollIndicator={false}
          >
            {myDoodles.length === 0 ? (
              <View style={styles.centerContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="brush-outline" size={44} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Aún no has dibujado nada
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Crea tu primera notita en servilleta para {partnerDisplayName}.
                </Text>
                <TouchableOpacity
                  style={[styles.actionCtaBtn, { backgroundColor: primaryColor }]}
                  onPress={() => setActiveTab('draw')}
                >
                  <Ionicons name="brush" size={16} color="#ffffff" />
                  <Text style={styles.actionCtaBtnText}>
                    Ir al Lienzo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              myDoodles.map((item) => {
                const bbox = getDoodleBoundingBox(item.strokes);
                return (
                  <FeatureCard key={item.id} style={styles.doodleCard}>
                    <View style={styles.doodleCardHeader}>
                      <View style={styles.doodleCardInfo}>
                        <Text style={[styles.doodleCardTitle, { color: colors.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.doodleCardMeta, { color: colors.textMuted }]}>
                          Dedicado a {partnerDisplayName} • {formatDisplayDate(item.created_at)}
                        </Text>
                      </View>
                      <View style={styles.cardActionIcons}>
                        <TouchableOpacity
                          onPress={() => setSelectedDoodle(item)}
                          style={[styles.expandChip, { backgroundColor: colors.surfaceAlt }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="expand" size={14} color={primaryColor} />
                          <Text style={[styles.expandChipText, { color: primaryColor }]}>Ampliar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          style={styles.deleteDoodleBtn}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.92}
                      onPress={() => setSelectedDoodle(item)}
                      style={[
                        styles.doodlePreviewCanvas,
                        { backgroundColor: item.background_color, borderColor: colors.border },
                      ]}
                    >
                      <Svg
                        width="100%"
                        height="100%"
                        viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
                        preserveAspectRatio="xMidYMid meet"
                        style={StyleSheet.absoluteFill}
                      >
                        {(item.strokes || [])
                          .filter((s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0))
                          .map((stroke, sIdx) => (
                            <Path
                              key={`s-${item.id}-${sIdx}`}
                              d={pointsToSvgPath(stroke.points)}
                              stroke={stroke.color}
                              strokeWidth={stroke.width}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          ))}
                      </Svg>
                    </TouchableOpacity>
                  </FeatureCard>
                );
              })
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.drawScroll}
            contentContainerStyle={styles.drawContent}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!activeStroke}
            showsVerticalScrollIndicator={false}
          >
            {/* Título de la notita */}
            <View style={[styles.titleInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="heart" size={18} color={primaryColor} />
              <TextInput
                style={[styles.titleInput, { color: colors.text }]}
                placeholder={`Dedicatoria para ${partnerDisplayName}...`}
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Lienzo táctil */}
            <View
              style={[
                styles.canvasContainer,
                { backgroundColor: currentBg, borderColor: colors.border },
              ]}
              {...panResponder.panHandlers}
            >
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                {strokes
                  .filter((s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0))
                  .map((stroke, index) => (
                    <Path
                      key={`stroke-${index}`}
                      d={pointsToSvgPath(stroke.points)}
                      stroke={stroke.color}
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                {activeStroke && Array.isArray(activeStroke.points) && activeStroke.points.length > 0 && (
                  <Path
                    d={pointsToSvgPath(activeStroke.points)}
                    stroke={activeStroke.color}
                    strokeWidth={activeStroke.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                )}
              </Svg>

              {strokes.length === 0 && !activeStroke && (
                <View style={styles.canvasPlaceholder} pointerEvents="none">
                  <Ionicons name="brush" size={32} color="rgba(0,0,0,0.2)" />
                  <Text style={styles.canvasPlaceholderText}>
                    Dibuja con tu dedo aquí...
                  </Text>
                </View>
              )}
            </View>

            {/* Acciones de lienzo: Deshacer, Limpiar */}
            <View style={styles.canvasActionsRow}>
              <TouchableOpacity
                style={[
                  styles.smallToolBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  strokes.length === 0 && styles.toolBtnDisabled,
                ]}
                onPress={handleUndo}
                disabled={strokes.length === 0}
              >
                <Ionicons
                  name="arrow-undo"
                  size={16}
                  color={strokes.length > 0 ? colors.text : colors.textMuted}
                />
                <Text
                  style={[
                    styles.smallToolText,
                    { color: strokes.length > 0 ? colors.text : colors.textMuted },
                  ]}
                >
                  Deshacer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.smallToolBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  strokes.length === 0 && styles.toolBtnDisabled,
                ]}
                onPress={handleClear}
                disabled={strokes.length === 0}
              >
                <Ionicons
                  name="trash"
                  size={16}
                  color={strokes.length > 0 ? '#ef4444' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.smallToolText,
                    { color: strokes.length > 0 ? '#ef4444' : colors.textMuted },
                  ]}
                >
                  Limpiar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Paleta de colores */}
            <View style={styles.paletteSection}>
              <Text style={[styles.paletteLabel, { color: colors.textMuted }]}>Color del trazo:</Text>
              <View style={styles.colorRow}>
                {DOODLE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrentColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      currentColor === c && styles.colorDotSelected,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Grosor de pincel */}
            <View style={styles.paletteSection}>
              <Text style={[styles.paletteLabel, { color: colors.textMuted }]}>Grosor:</Text>
              <View style={styles.brushRow}>
                {DOODLE_BRUSH_WIDTHS.map((b) => (
                  <TouchableOpacity
                    key={b.value}
                    onPress={() => setCurrentWidth(b.value)}
                    style={[
                      styles.brushBtn,
                      {
                        backgroundColor: currentWidth === b.value ? primaryLight : colors.surface,
                        borderColor: currentWidth === b.value ? primaryColor : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.brushSample,
                        {
                          width: b.value * 2,
                          height: b.value * 2,
                          borderRadius: b.value,
                          backgroundColor: currentColor,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.brushBtnText,
                        {
                          color: currentWidth === b.value ? primaryColor : colors.text,
                          fontWeight: currentWidth === b.value ? '700' : '500',
                        },
                      ]}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fondo de servilleta */}
            <View style={styles.paletteSection}>
              <Text style={[styles.paletteLabel, { color: colors.textMuted }]}>Papel / Servilleta:</Text>
              <View style={styles.bgRow}>
                {NAPKIN_BACKGROUNDS.map((bg) => (
                  <TouchableOpacity
                    key={bg.value}
                    onPress={() => setCurrentBg(bg.value)}
                    style={[
                      styles.bgBtn,
                      {
                        backgroundColor: bg.value,
                        borderColor: currentBg === bg.value ? primaryColor : colors.border,
                        borderWidth: currentBg === bg.value ? 2.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bgBtnText,
                        {
                          color: currentBg === bg.value ? primaryColor : '#475569',
                          fontWeight: currentBg === bg.value ? '700' : '500',
                        },
                      ]}
                    >
                      {bg.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Botón de Enviar */}
            <FeatureButton
              label={saving ? 'Dedicando notita...' : `💌 Dedicar Notita a ${partnerDisplayName}`}
              onPress={handleSave}
              disabled={strokes.length === 0 || saving}
            />
          </ScrollView>
        )}

        {/* ================= MODAL DE ZOOM / PANTALLA COMPLETA ================= */}
        {selectedDoodle && (
          <Modal
            visible={Boolean(selectedDoodle)}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedDoodle(null)}
          >
            <View style={styles.fullModalOverlay}>
              <View
                style={[
                  styles.fullModalCard,
                  { backgroundColor: selectedDoodle.background_color || '#fffdf6' },
                ]}
              >
                <View style={styles.fullModalHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.fullModalTitle} numberOfLines={2}>
                      {selectedDoodle.title}
                    </Text>
                    <Text style={styles.fullModalAuthor}>
                      {selectedDoodle.author === partnerProfile
                        ? `Dedicado por ${partnerDisplayName} ❤️`
                        : `Por ti para ${partnerDisplayName}`}
                      {' • '}
                      {formatDisplayDate(selectedDoodle.created_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDoodle(null)}
                    style={styles.fullModalCloseBtn}
                  >
                    <Ionicons name="close" size={22} color="#1e293b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.fullModalCanvasWrap}>
                  {(() => {
                    const bbox = getDoodleBoundingBox(selectedDoodle.strokes);
                    return (
                      <Svg
                        width="100%"
                        height="100%"
                        viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
                        preserveAspectRatio="xMidYMid meet"
                        style={StyleSheet.absoluteFill}
                      >
                        {(selectedDoodle.strokes || [])
                          .filter((s): s is DoodleStroke => Boolean(s && Array.isArray(s.points) && s.points.length > 0))
                          .map((stroke, sIdx) => (
                            <Path
                              key={`full-s-${selectedDoodle.id}-${sIdx}`}
                              d={pointsToSvgPath(stroke.points)}
                              stroke={stroke.color}
                              strokeWidth={stroke.width}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                          ))}
                      </Svg>
                    );
                  })()}
                </View>

                <View style={styles.fullModalFooter}>
                  <TouchableOpacity
                    style={[styles.fullModalCloseAction, { backgroundColor: primaryColor }]}
                    onPress={() => setSelectedDoodle(null)}
                  >
                    <Text style={styles.fullModalCloseActionText}>Cerrar vista</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  drawScroll: {
    flex: 1,
  },
  drawContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  titleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  titleInput: {
    flex: 1,
    fontSize: 15,
  },
  canvasContainer: {
    height: 310,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  canvasPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  canvasPlaceholderText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.3)',
    fontWeight: '500',
  },
  canvasActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  smallToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolBtnDisabled: {
    opacity: 0.4,
  },
  smallToolText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paletteSection: {
    gap: 6,
  },
  paletteLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: {
    borderColor: '#000000',
    transform: [{ scale: 1.15 }],
  },
  brushRow: {
    flexDirection: 'row',
    gap: 8,
  },
  brushBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  brushSample: {},
  brushBtnText: {
    fontSize: 12,
  },
  bgRow: {
    flexDirection: 'row',
    gap: 6,
  },
  bgBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgBtnText: {
    fontSize: 11,
  },
  galleryScroll: {
    flex: 1,
  },
  galleryContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  actionCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  actionCtaBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  receivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  receivedBannerText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  doodleCard: {
    padding: 14,
    gap: 12,
  },
  doodleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  doodleCardInfo: {
    flex: 1,
    gap: 4,
  },
  doodleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doodleCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  doodleCardMeta: {
    fontSize: 12,
  },
  cardActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteDoodleBtn: {
    padding: 4,
  },
  doodlePreviewCanvas: {
    height: 250,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  canvasTapHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  canvasTapHintText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  replyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fullModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fullModalCard: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  fullModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  fullModalAuthor: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  fullModalCloseBtn: {
    padding: 4,
  },
  fullModalCanvasWrap: {
    height: Math.min(SCREEN_WIDTH * 1.05, 420),
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  fullModalFooter: {
    alignItems: 'center',
    marginTop: 4,
  },
  fullModalCloseAction: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  fullModalCloseActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

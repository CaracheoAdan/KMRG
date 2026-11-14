import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useCoupleFeatures, CoupleFeatureKey } from '../../contexts/CoupleFeaturesContext';
import { calculateTimeTogether, toLocalDateString } from '../../services/StorageService';
import { getCachedDoodles } from '../../services/feature/napkinDoodleService';
import { fetchDailyAnswers } from '../../services/feature/dailyQuestionService';
import { getCachedCoupons } from '../../services/feature/couponsService';
import { CoupleEvent, getCachedEvents, splitAndSortEvents } from '../../services/feature/eventsService';
import { FONTS } from '../../theme/designSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 350);

interface SidebarItemConfig {
  key: CoupleFeatureKey;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  badge?: string;
}

interface SidebarCategory {
  title: string;
  items: SidebarItemConfig[];
}

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: 'MOMENTOS DIARIOS & CONEXIÓN',
    items: [
      {
        key: 'daily_question',
        title: 'Pregunta del Día',
        subtitle: 'Descubrir qué responderemos hoy',
        icon: 'help-circle',
        color: '#ec4899',
      },
      {
        key: 'napkin_doodle',
        title: 'Notita Dibujada',
        subtitle: 'Garabatos y mensajes en servilleta',
        icon: 'brush',
        color: '#f59e0b',
      },
      {
        key: 'today_song',
        title: 'Canción del Día',
        subtitle: 'Nuestra melodía especial y dedicatoria',
        icon: 'musical-notes',
        color: '#10b981',
      },
      {
        key: 'voice_notes',
        title: 'Notas de Voz',
        subtitle: 'Mensajitos de audio con amor',
        icon: 'mic',
        color: '#3b82f6',
      },
      {
        key: 'gratitude',
        title: 'Diario de Gratitud',
        subtitle: 'Hoy agradezco por ti...',
        icon: 'journal',
        color: '#f97316',
      },
    ],
  },
  {
    title: 'CITAS, JUEGOS & SORPRESAS',
    items: [
      {
        key: 'coupons',
        title: 'Vales de Amor',
        subtitle: 'Cuponera canjeable de pareja',
        icon: 'ticket',
        color: '#f43f5e',
      },
      {
        key: 'date_roulette',
        title: 'Ruleta de Citas',
        subtitle: '30 ideas románticas para no dudar',
        icon: 'disc',
        color: '#8b5cf6',
      },
      {
        key: 'events',
        title: 'Agenda de Citas',
        subtitle: 'Planes, salidas y recordatorios',
        icon: 'calendar-clock',
        color: '#0284c7',
      },
      {
        key: 'quiz',
        title: 'Quiz de Pareja',
        subtitle: '¿Qué tanto me conoces de verdad?',
        icon: 'brain',
        color: '#d946ef',
      },
    ],
  },
  {
    title: 'METAS & RECUERDOS',
    items: [
      {
        key: 'first_times',
        title: 'Primeras Veces',
        subtitle: 'Cronología de momentos inolvidables',
        icon: 'ribbon',
        color: '#06b6d4',
      },
      {
        key: 'savings',
        title: 'Alcancía Juntos',
        subtitle: 'Metas de ahorro compartidas',
        icon: 'piggy-bank',
        color: '#059669',
      },
      {
        key: 'important_dates',
        title: 'Fechas Especiales',
        subtitle: 'Cumpleaños y aniversarios',
        icon: 'cake',
        color: '#e11d48',
      },
    ],
  },
  {
    title: 'SEGURIDAD & AJUSTES',
    items: [
      {
        key: 'security',
        title: 'Bloqueo Biométrico',
        subtitle: 'Protección con Huella o Face ID',
        icon: 'finger-print-outline',
        color: '#6366f1',
      },
      {
        key: 'backup',
        title: 'Respaldo y Datos',
        subtitle: 'Copia de seguridad en la nube',
        icon: 'cloud-upload-outline',
        color: '#14b8a6',
      },
    ],
  },
];

export const CoupleSidebarDrawer: React.FC = () => {
  const { colors, primaryColor } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const insets = useSafeAreaInsets();
  const { isSidebarOpen, closeSidebar, openFeature, homeState, markFeatureAsSeen } =
    useCoupleFeatures();

  const animSlide = useRef(new Animated.Value(0)).current; // 0 = cerrado, 1 = abierto

  const currentProfile = profile || 'Karla';
  const myName = getDisplayName(currentProfile);
  const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';
  const partnerName = getDisplayName(partnerRole);
  const timeTogether = calculateTimeTogether(homeState.anniversaryDate);
  const streak = homeState.streakCount || 1;

  const [partnerDoodleCount, setPartnerDoodleCount] = React.useState(0);
  const [hasPendingDailyQuestion, setHasPendingDailyQuestion] = React.useState(false);
  const [pendingCouponsCount, setPendingCouponsCount] = React.useState(0);
  const [upcomingEvents, setUpcomingEvents] = React.useState<CoupleEvent[]>([]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const todayStr = toLocalDateString(new Date());

    void getCachedDoodles().then((rows) => {
      const count = rows.filter((d) => d.author === partnerRole).length;
      setPartnerDoodleCount(count);
    });

    void fetchDailyAnswers(false)
      .then((rows) => {
        const answered = rows.some(
          (r) =>
            toLocalDateString(r.question_date) === todayStr &&
            r.profile === currentProfile &&
            Boolean(r.answer)
        );
        setHasPendingDailyQuestion(!answered);
      })
      .catch(() => {});

    void getCachedCoupons()
      .then((rows) => {
        const count = rows.filter((c) => c.recipient === currentProfile && !c.is_redeemed).length;
        setPendingCouponsCount(count);
      })
      .catch(() => {});

    void getCachedEvents()
      .then((rows) => {
        setUpcomingEvents(splitAndSortEvents(rows, new Date()).upcoming);
      })
      .catch(() => {});
  }, [isSidebarOpen, partnerRole, currentProfile]);

  useEffect(() => {
    if (isSidebarOpen) {
      Animated.spring(animSlide, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 2,
        speed: 14,
      }).start();
    } else {
      Animated.timing(animSlide, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isSidebarOpen, animSlide]);

  const handleClose = () => {
    Animated.timing(animSlide, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      closeSidebar();
    });
  };

  const handleSelectFeature = (key: CoupleFeatureKey) => {
    void markFeatureAsSeen(key);
    Animated.timing(animSlide, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      openFeature(key);
    });
  };

  if (!isSidebarOpen) return null;

  const translateX = animSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <Modal
      visible={isSidebarOpen}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlayRoot}>
        {/* Fondo oscuro con toque para cerrar */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Panel lateral deslizante */}
        <Animated.View
          style={[
            styles.drawerContainer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.surface,
              transform: [{ translateX }],
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {/* Encabezado del cajón */}
          <View style={[styles.headerSection, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTopRow}>
              {/* Círculos entrelazados de la pareja */}
              <View style={styles.coupleAvatarsBadge}>
                <View style={[styles.avatarCircle, { backgroundColor: primaryColor }]}>
                  <Text style={[styles.avatarInitial, { color: '#ffffff' }]}>
                    {myName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.avatarCircleOverlap, { backgroundColor: '#f43f5e' }]}>
                  <Text style={[styles.avatarInitial, { color: '#ffffff' }]}>
                    {partnerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.heartMiniBadge}>
                  <Ionicons name="heart" size={10} color="#e11d48" />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Cerrar barra lateral"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerTitles}>
              <Text style={[styles.mainDrawerTitle, { color: colors.text }]}>
                Nuestro Rincón
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {timeTogether.totalDays} días juntos • Racha de {streak} 🔥
              </Text>
            </View>
          </View>

          {/* Lista scrollable de todas las herramientas */}
          <ScrollView
            style={styles.drawerScroll}
            contentContainerStyle={styles.drawerScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {SIDEBAR_CATEGORIES.map((cat, cIdx) => (
              <View key={`cat-${cIdx}`} style={styles.categoryBlock}>
                <Text style={[styles.categoryHeader, { color: colors.textMuted }]}>
                  {cat.title}
                </Text>

                <View style={[styles.categoryCard, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  {cat.items.map((item, iIdx) => {
                    const isLast = iIdx === cat.items.length - 1;

                    // Badge dinámico según estado real de cada apartado
                    let dynamicBadge: { text: string; bg: string } | null = null;
                    if (item.key === 'daily_question') {
                      dynamicBadge = hasPendingDailyQuestion
                        ? { text: 'Pendiente', bg: '#ec4899' }
                        : { text: 'Lista ✓', bg: '#10b981' };
                    } else if (item.key === 'napkin_doodle' && partnerDoodleCount > 0) {
                      dynamicBadge = {
                        text: partnerDoodleCount === 1 ? `De ${partnerName}` : `${partnerDoodleCount} notitas`,
                        bg: '#f59e0b',
                      };
                    } else if (item.key === 'coupons' && pendingCouponsCount > 0) {
                      dynamicBadge = {
                        text: `${pendingCouponsCount} por usar`,
                        bg: '#f43f5e',
                      };
                    } else if (item.key === 'events' && upcomingEvents.length > 0) {
                      dynamicBadge = {
                        text: upcomingEvents.length === 1 ? '1 próxima' : `${upcomingEvents.length} próx.`,
                        bg: '#0284c7',
                      };
                    }

                    // Subtítulo dinámico cuando hay información viva relevante
                    let dynamicSubtitle = item.subtitle;
                    if (item.key === 'napkin_doodle' && partnerDoodleCount > 0) {
                      dynamicSubtitle =
                        partnerDoodleCount === 1
                          ? `1 notita dibujada de ${partnerName}`
                          : `${partnerDoodleCount} notitas dibujadas de ${partnerName}`;
                    } else if (item.key === 'today_song' && homeState.todaySong?.title) {
                      dynamicSubtitle = `♪ ${homeState.todaySong.title}${
                        homeState.todaySong.artist ? ` — ${homeState.todaySong.artist}` : ''
                      }`;
                    } else if (item.key === 'events' && upcomingEvents.length > 0) {
                      dynamicSubtitle = `Próxima: ${upcomingEvents[0].title}`;
                    }

                    return (
                      <React.Fragment key={item.key}>
                        <TouchableOpacity
                          style={styles.itemRow}
                          onPress={() => handleSelectFeature(item.key)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.itemIconWrap,
                              { backgroundColor: `${item.color}18` },
                            ]}
                          >
                            <Ionicons name={item.icon} size={18} color={item.color} />
                          </View>

                          <View style={styles.itemTextCol}>
                            <View style={styles.itemTitleRow}>
                              <Text style={[styles.itemTitle, { color: colors.text }]}>
                                {item.title}
                              </Text>
                              {dynamicBadge ? (
                                <View
                                  style={[
                                    styles.itemBadge,
                                    { backgroundColor: dynamicBadge.bg },
                                  ]}
                                >
                                  <Text style={styles.itemBadgeText}>{dynamicBadge.text}</Text>
                                </View>
                              ) : item.badge ? (
                                <View
                                  style={[
                                    styles.itemBadge,
                                    { backgroundColor: primaryColor },
                                  ]}
                                >
                                  <Text style={styles.itemBadgeText}>{item.badge}</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text
                              style={[styles.itemSubtitle, { color: colors.textMuted }]}
                              numberOfLines={1}
                            >
                              {dynamicSubtitle}
                            </Text>
                          </View>

                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>

                        {!isLast && (
                          <View
                            style={[
                              styles.itemDivider,
                              { backgroundColor: colors.border },
                            ]}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Pie de dedicatoria */}
            <View style={styles.footerNote}>
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                KMRG • Hecho con amor para Karla y Javier ❤️
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  drawerContainer: {
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 16,
  },
  headerSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coupleAvatarsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: 60,
    height: 36,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 1,
  },
  avatarCircleOverlap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'absolute',
    left: 20,
    zIndex: 2,
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: '800',
  },
  heartMiniBadge: {
    position: 'absolute',
    bottom: -2,
    left: 17,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 2,
    zIndex: 3,
    elevation: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    gap: 3,
  },
  mainDrawerTitle: {
    fontSize: 21,
    fontWeight: '800',
    fontFamily: FONTS.serif,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 30,
    gap: 18,
  },
  categoryBlock: {
    gap: 8,
  },
  categoryHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  categoryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 12,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextCol: {
    flex: 1,
    gap: 2,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11.5,
  },
  itemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  itemBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  footerNote: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Share,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { Milestone, Message, UserProfile, TodaySongData, SpecialPlace } from '../types';
import { MoodMascot } from './MoodMascot';

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
  currentProfile: UserProfile;
  daysTogether: number;
  streakCount: number;
  milestones: Milestone[];
  messages: Message[];
  todaySong?: TodaySongData;
  places?: SpecialPlace[];
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

export const LoveBookModal: React.FC<Props> = ({
  visible,
  onClose,
  primaryColor,
  currentProfile,
  daysTogether,
  streakCount,
  milestones,
  messages,
  todaySong,
  places = [],
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isStoryCardOpen, setIsStoryCardOpen] = useState<boolean>(false);
  const totalPages = 4;

  const monthsTogether = Math.max(1, Math.floor(daysTogether / 30.4375));
  const remainingDays = Math.floor(daysTogether % 30.4375);
  const timeTogetherLabel = `${monthsTogether} ${monthsTogether === 1 ? 'Mes' : 'Meses'} y ${remainingDays} ${remainingDays === 1 ? 'Día' : 'Días'}`;

  const handleShareSummary = async () => {
    try {
      if (Platform.OS !== 'web') Vibration.vibrate(30);
      await Share.share({
        message: `💖 El Libro de Nuestro Amor (Karlita & Javier)\n\n✨ Llevamos ${daysTogether} días juntos con una racha de amor de ${streakCount} días.\n📸 ${milestones.length} recuerdos inolvidables guardados en nuestro corazón.\n\n"Te amo hoy más que ayer y menos que mañana."`,
        title: 'El Libro de Nuestro Amor',
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      if (Platform.OS !== 'web') Vibration.vibrate(15);
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      if (Platform.OS !== 'web') Vibration.vibrate(15);
      setCurrentPage((p) => p - 1);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bookContainer}>
          {/* Header del Libro */}
          <View style={styles.bookHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setIsStoryCardOpen(true)}
                style={styles.storyHeaderBtn}
                accessibilityLabel="Historia de Instagram"
              >
                <Ionicons name="logo-instagram" size={18} color="#ffffff" />
                <Text style={styles.storyHeaderBtnText}>Historia</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareSummary} style={styles.shareBtn}>
                <Ionicons name="share-outline" size={20} color="#f59e0b" />
              </TouchableOpacity>
            </View>

            <View style={styles.pageIndicatorContainer}>
              <Text style={styles.pageIndicatorText}>
                {currentPage === 0
                  ? 'Portada'
                  : `Página ${currentPage} de ${totalPages - 1}`}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Páginas del Libro */}
          <View style={styles.pageViewport}>
            {/* PÁGINA 0: PORTADA EDITORIAL */}
            {currentPage === 0 && (
              <ScrollView
                style={styles.pageScroll}
                contentContainerStyle={styles.coverPageContent}
              >
                <View style={styles.goldBorderOuter}>
                  <View style={styles.goldBorderInner}>
                    <Ionicons name="sparkles" size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                    <Text style={styles.coverTitle}>EL LIBRO DE NUESTRO AMOR</Text>
                    <View style={styles.titleDivider} />
                    <Text style={styles.coverCouple}>Karlita & Javier</Text>

                    <View style={styles.mascotHolder}>
                      <MoodMascot feeling="enamorado" size="md" accentColor={primaryColor} accessory="crown" />
                    </View>

                    <View style={styles.statsBadgeRow}>
                      <View style={styles.statsBadge}>
                        <Ionicons name="flame" size={16} color="#f59e0b" />
                        <Text style={styles.statsBadgeNum}>{daysTogether}</Text>
                        <Text style={styles.statsBadgeLabel}>Días Juntos</Text>
                      </View>
                      <View style={styles.statsBadge}>
                        <Ionicons name="images" size={16} color="#38bdf8" />
                        <Text style={styles.statsBadgeNum}>{milestones.length}</Text>
                        <Text style={styles.statsBadgeLabel}>Recuerdos</Text>
                      </View>
                    </View>

                    <Text style={styles.coverQuote}>
                      "Una historia de amor escrita día con día, sonrisa con sonrisa."
                    </Text>

                    <TouchableOpacity
                      onPress={() => setIsStoryCardOpen(true)}
                      style={styles.storyCoverBtn}
                    >
                      <Ionicons name="logo-instagram" size={17} color="#ffffff" />
                      <Text style={styles.storyCoverBtnText}>Tarjeta para Historia de Instagram</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* PÁGINA 1: NUESTRAS ESTADÍSTICAS & CRONOLOGÍA */}
            {currentPage === 1 && (
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.innerPageContent}>
                <Text style={styles.pageHeaderLabel}>CAPÍTULO I</Text>
                <Text style={styles.pageHeaderTitle}>Nuestra Historia en Números</Text>
                <View style={styles.chapterDivider} />

                <View style={styles.statGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="heart" size={24} color="#ec4899" />
                    <Text style={styles.statBigNumber}>{daysTogether}</Text>
                    <Text style={styles.statCardTitle}>Días Compartidos</Text>
                    <Text style={styles.statCardDesc}>Llenos de risas y momentos inolvidables</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="flame" size={24} color="#f59e0b" />
                    <Text style={styles.statBigNumber}>{streakCount}</Text>
                    <Text style={styles.statCardTitle}>Días de Racha Activa</Text>
                    <Text style={styles.statCardDesc}>Conexión diaria sin parar</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="mail" size={24} color="#8b5cf6" />
                    <Text style={styles.statBigNumber}>{messages.length}</Text>
                    <Text style={styles.statCardTitle}>Cartas de Amor</Text>
                    <Text style={styles.statCardDesc}>Palabras sinceras selladas en el tiempo</Text>
                  </View>

                  <View style={styles.statCard}>
                    <Ionicons name="location" size={24} color="#10b981" />
                    <Text style={styles.statBigNumber}>{places.length}</Text>
                    <Text style={styles.statCardTitle}>Lugares Especiales</Text>
                    <Text style={styles.statCardDesc}>Rincones mágicos de nuestra historia</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* PÁGINA 2: ÁLBUM FOTOGRÁFICO DE RECUERDOS */}
            {currentPage === 2 && (
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.innerPageContent}>
                <Text style={styles.pageHeaderLabel}>CAPÍTULO II</Text>
                <Text style={styles.pageHeaderTitle}>Momentos Inolvidables</Text>
                <View style={styles.chapterDivider} />

                {milestones.length === 0 ? (
                  <View style={styles.emptyBookPage}>
                    <Ionicons name="images-outline" size={48} color="#64748b" />
                    <Text style={styles.emptyBookText}>Aún no hay fotos en su álbum</Text>
                  </View>
                ) : (
                  milestones.slice(0, 6).map((item, idx) => (
                    <View key={item.id || idx} style={styles.milestoneEditorialCard}>
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.milestoneEditorialImage}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={styles.milestoneEditorialMeta}>
                        <Text style={styles.milestoneEditorialTitle}>{item.title}</Text>
                        <Text style={styles.milestoneEditorialDate}>{item.date}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* PÁGINA 3: CARTAS DE AMOR & NUESTRA MÚSICA */}
            {currentPage === 3 && (
              <ScrollView style={styles.pageScroll} contentContainerStyle={styles.innerPageContent}>
                <Text style={styles.pageHeaderLabel}>CAPÍTULO III</Text>
                <Text style={styles.pageHeaderTitle}>Nuestras Cartas y Melodías</Text>
                <View style={styles.chapterDivider} />

                {todaySong && (
                  <View style={styles.songFeatureBox}>
                    <Ionicons name="musical-notes" size={24} color="#f59e0b" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.songFeatureTitle}>{todaySong.title}</Text>
                      <Text style={styles.songFeatureArtist}>{todaySong.artist}</Text>
                      <Text style={styles.songFeatureDedication}>
                        "{todaySong.dedication || 'Nuestra melodía especial'}"
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={styles.subSectionTitle}>Cartas Guardadas en el Corazón</Text>
                {messages.length === 0 ? (
                  <Text style={styles.emptyBookText}>Aún no han redactado cartas selladas.</Text>
                ) : (
                  messages.slice(0, 3).map((m) => (
                    <View key={m.id} style={styles.letterExcerptCard}>
                      <Ionicons name="quote" size={16} color="#94a3b8" style={{ marginBottom: 4 }} />
                      <Text style={styles.letterExcerptContent} numberOfLines={4}>
                        {m.content}
                      </Text>
                      <Text style={styles.letterExcerptAuthor}>
                        De: {m.sender || 'Karlita'} · {m.scheduled_date}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>

          {/* Footer del Libro con Navegación de Páginas */}
          <View style={styles.bookFooter}>
            <TouchableOpacity
              onPress={handlePrevPage}
              disabled={currentPage === 0}
              style={[styles.navBtn, currentPage === 0 && styles.navBtnDisabled]}
            >
              <Ionicons name="arrow-back" size={18} color={currentPage === 0 ? '#475569' : '#ffffff'} />
              <Text style={[styles.navBtnText, currentPage === 0 && { color: '#475569' }]}>
                Anterior
              </Text>
            </TouchableOpacity>

            <View style={styles.dotsRow}>
              {Array.from({ length: totalPages }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    currentPage === i && { backgroundColor: '#f59e0b', width: 16 },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleNextPage}
              disabled={currentPage === totalPages - 1}
              style={[styles.navBtn, currentPage === totalPages - 1 && styles.navBtnDisabled]}
            >
              <Text style={[styles.navBtnText, currentPage === totalPages - 1 && { color: '#475569' }]}>
                Siguiente
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color={currentPage === totalPages - 1 ? '#475569' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ================= MODAL TARJETA DE HISTORIA PARA INSTAGRAM (9:16) ================= */}
      <Modal visible={isStoryCardOpen} animationType="fade" transparent onRequestClose={() => setIsStoryCardOpen(false)}>
        <View style={styles.storyOverlay}>
          <View style={styles.storyCardContainer}>
            {/* Cabecera de la Historia */}
            <View style={styles.storyTopBar}>
              <TouchableOpacity onPress={() => setIsStoryCardOpen(false)} style={styles.storyCloseBtn}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.storyBadge}>✨ INSTAGRAM STORY (9:16) ✨</Text>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') Vibration.vibrate(30);
                  void Share.share({
                    message: `💖 ¡Celebrando nuestro Mesiversario! (${timeTogetherLabel})\n\n✨ Llevamos ${daysTogether} días juntos llenos de amor y momentos mágicos.\nKarlita & Javier 💕\n\n"Te amo hoy más que ayer y menos que mañana."`,
                    title: 'Historia de Nuestro Mesiversario',
                  });
                }}
                style={styles.storyShareBtn}
              >
                <Ionicons name="paper-plane" size={18} color="#f59e0b" />
              </TouchableOpacity>
            </View>

            {/* Tarjeta Visual 9:16 para Screenshot o Compartir */}
            <View style={styles.storyCanvas}>
              <View style={styles.storyGoldBorder}>
                <Ionicons name="sparkles" size={24} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 4 }} />
                <Text style={styles.storyAnniversaryTitle}>¡FELIZ MESIVERSARIO!</Text>
                <Text style={styles.storyTimeBadge}>{timeTogetherLabel.toUpperCase()}</Text>

                <View style={styles.storyDivider} />

                <Text style={styles.storyCoupleName}>Karlita & Javier</Text>
                <Text style={styles.storyDaysCount}>{daysTogether} Días de Puro Amor</Text>

                {/* Pochito con Corona */}
                <View style={styles.storyMascotHolder}>
                  <MoodMascot feeling="enamorado" size="lg" accentColor={primaryColor} accessory="crown" />
                </View>

                {/* Foto destacada si existe */}
                {milestones.length > 0 && milestones[0].image_url ? (
                  <View style={styles.storyPhotoFrame}>
                    <Image source={{ uri: milestones[0].image_url }} style={styles.storyPhoto} resizeMode="cover" />
                    <Text style={styles.storyPhotoCaption} numberOfLines={1}>{milestones[0].title}</Text>
                  </View>
                ) : null}

                <Text style={styles.storyLoveQuote}>
                  "Un mes más eligiéndonos con el corazón y llenando cada día de risas y complicidad."
                </Text>

                <View style={styles.storyFooter}>
                  <Text style={styles.storyWatermark}>KMRG · NUESTRA HISTORIA</Text>
                  <Text style={styles.storyAnnivDate}>Desde el 18 de Junio de 2026</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS !== 'web') Vibration.vibrate(30);
                void Share.share({
                  message: `💖 ¡Celebrando nuestro Mesiversario! (${timeTogetherLabel})\n\n✨ Llevamos ${daysTogether} días juntos.\nKarlita & Javier 💕`,
                  title: 'Mi Historia de Pareja',
                });
              }}
              style={styles.storyActionShareBtn}
            >
              <Ionicons name="share-social" size={18} color="#ffffff" />
              <Text style={styles.storyActionShareText}>Compartir en Historias</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  bookContainer: {
    width: '100%',
    height: '95%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  shareBtn: {
    padding: 6,
  },
  storyHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1306c',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  storyHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  storyCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1306c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 18,
    shadowColor: '#e1306c',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  storyCoverBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  storyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  storyCardContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  storyTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  storyCloseBtn: {
    padding: 6,
  },
  storyBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  storyShareBtn: {
    padding: 6,
  },
  storyCanvas: {
    width: '100%',
    aspectRatio: 9 / 16,
    maxHeight: 560,
    backgroundColor: '#180e29',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f59e0b',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  storyGoldBorder: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyAnniversaryTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 2,
    textAlign: 'center',
  },
  storyTimeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  storyDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#f59e0b',
    marginVertical: 6,
  },
  storyCoupleName: {
    fontSize: 24,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: '#ffffff',
    textAlign: 'center',
  },
  storyDaysCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginTop: 2,
  },
  storyMascotHolder: {
    marginVertical: 4,
  },
  storyPhotoFrame: {
    width: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 6,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  storyPhoto: {
    width: '100%',
    height: 100,
    borderRadius: 6,
  },
  storyPhotoCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
    textAlign: 'center',
  },
  storyLoveQuote: {
    fontSize: 11,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 6,
  },
  storyFooter: {
    alignItems: 'center',
  },
  storyWatermark: {
    fontSize: 9,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 1,
  },
  storyAnnivDate: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
  },
  storyActionShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1306c',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
    marginTop: 14,
    shadowColor: '#e1306c',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  storyActionShareText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  pageIndicatorContainer: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pageIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  closeBtn: {
    padding: 6,
  },
  pageViewport: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  pageScroll: {
    flex: 1,
  },
  coverPageContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    backgroundColor: '#1a102f', // Morado noche profundo editorial
  },
  goldBorderOuter: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 16,
    padding: 6,
  },
  goldBorderInner: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 10,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#f59e0b',
    textAlign: 'center',
  },
  titleDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#f59e0b',
    marginVertical: 10,
  },
  coverCouple: {
    fontSize: 26,
    fontFamily: SERIF_FONT,
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  mascotHolder: {
    marginVertical: 12,
  },
  statsBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  statsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  statsBadgeNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  statsBadgeLabel: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  coverQuote: {
    fontSize: 13,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  innerPageContent: {
    padding: 24,
    backgroundColor: '#fdfbf7', // Textura de papel fino marfil
    minHeight: '100%',
  },
  pageHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#b45309',
    textAlign: 'center',
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontFamily: SERIF_FONT,
    color: '#0f172a',
    textAlign: 'center',
    marginTop: 4,
  },
  chapterDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#f59e0b',
    alignSelf: 'center',
    marginVertical: 14,
  },
  statGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  statCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  statCardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  emptyBookPage: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyBookText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 10,
  },
  milestoneEditorialCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  milestoneEditorialImage: {
    width: '100%',
    height: 180,
  },
  milestoneEditorialMeta: {
    padding: 14,
  },
  milestoneEditorialTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  milestoneEditorialDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  songFeatureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
    marginBottom: 20,
  },
  songFeatureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  songFeatureArtist: {
    fontSize: 13,
    color: '#64748b',
  },
  songFeatureDedication: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#b45309',
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },
  letterExcerptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  letterExcerptContent: {
    fontSize: 13,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 18,
  },
  letterExcerptAuthor: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'right',
  },
  bookFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#0f172a',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
  },
});

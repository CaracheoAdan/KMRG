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
  petName?: string;
}

const { width: SCREEN_W } = Dimensions.get('window');

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
  petName = 'Pochito',
}) => {
  const [isStoryCardOpen, setIsStoryCardOpen] = useState<boolean>(false);

  const monthsTogether = Math.max(1, Math.floor(daysTogether / 30.4375));
  const remainingDays = Math.floor(daysTogether % 30.4375);
  const timeTogetherLabel = `${monthsTogether} ${monthsTogether === 1 ? 'Mes' : 'Meses'} y ${remainingDays} ${remainingDays === 1 ? 'Día' : 'Días'}`;

  const handleShareSummary = async () => {
    try {
      if (Platform.OS !== 'web') Vibration.vibrate(30);
      await Share.share({
        message: `💖 Collage Semanal de Nuestro Amor (Karlita & Javier)\n\n✨ Llevamos ${daysTogether} días juntos (${timeTogetherLabel}).\n🔥 Racha de conexión: ${streakCount} días.\n🐾 Mascota: ${petName}\n📸 ${milestones.length} momentos inolvidables en nuestro álbum.\n\n"Te amo hoy más que ayer y menos que mañana."`,
        title: 'Collage de Nuestro Amor',
      });
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.bookContainer}>
          {/* Header del Collage */}
          <View style={styles.bookHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={() => setIsStoryCardOpen(true)}
                style={styles.storyHeaderBtn}
                accessibilityLabel="Historia de Instagram"
              >
                <Ionicons name="logo-instagram" size={17} color="#ffffff" />
                <Text style={styles.storyHeaderBtnText}>Historia 9:16</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShareSummary} style={styles.shareBtn}>
                <Ionicons name="share-outline" size={20} color="#f59e0b" />
              </TouchableOpacity>
            </View>

            <View style={styles.pageIndicatorContainer}>
              <Text style={styles.pageIndicatorText}>Collage de Amor</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Contenido: Collage Visual Continuo de Nuestro Amor */}
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={styles.collageScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. PORTADA EDITORIAL DEL COLLAGE */}
            <View style={styles.goldBorderOuter}>
              <View style={styles.goldBorderInner}>
                <Ionicons name="sparkles" size={26} color="#f59e0b" style={{ marginBottom: 6 }} />
                <Text style={styles.coverTitle}>COLLAGE DE NUESTRO AMOR</Text>
                <View style={styles.titleDivider} />
                <Text style={styles.coverCouple}>Karlita & Javier</Text>

                <View style={styles.mascotHolder}>
                  <MoodMascot feeling="enamorado" size="md" accentColor={primaryColor} accessory="crown" />
                  <Text style={styles.mascotNameBadge}>🐾 {petName}</Text>
                </View>

                {/* Métricas destacadas */}
                <View style={styles.statsBadgeRow}>
                  <View style={styles.statsBadge}>
                    <Ionicons name="flame" size={16} color="#f59e0b" />
                    <Text style={styles.statsBadgeNum}>{daysTogether}</Text>
                    <Text style={styles.statsBadgeLabel}>Días Juntos</Text>
                  </View>
                  <View style={styles.statsBadge}>
                    <Ionicons name="calendar" size={16} color="#ec4899" />
                    <Text style={styles.statsBadgeNum}>{monthsTogether}m {remainingDays}d</Text>
                    <Text style={styles.statsBadgeLabel}>Mesiversario</Text>
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
                  <Text style={styles.storyCoverBtnText}>Crear Historia para Instagram</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. MOSAICO / COLLAGE DE FOTOGRAFÍAS */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderLabel}>NUESTROS MOMENTOS</Text>
              <Text style={styles.sectionHeaderTitle}>Mosaico de Recuerdos</Text>
              <View style={styles.chapterDivider} />
            </View>

            {milestones.length === 0 ? (
              <View style={styles.emptyCollageBox}>
                <Ionicons name="images-outline" size={44} color="#64748b" />
                <Text style={styles.emptyCollageText}>Aún no han agregado fotos en Recuerdos</Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {milestones.map((item, idx) => (
                  <View key={item.id || idx} style={styles.polaroidCard}>
                    {item.image_url ? (
                      <Image
                        source={{ uri: item.image_url }}
                        style={styles.polaroidImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={styles.polaroidFooter}>
                      <Text style={styles.polaroidTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.polaroidDate}>{item.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 3. EXTRACTOS DE CARTAS DE AMOR */}
            {messages.length > 0 && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                  <Text style={styles.sectionHeaderLabel}>PALABRAS DEL CORAZÓN</Text>
                  <Text style={styles.sectionHeaderTitle}>Cartas que nos Dedicamos</Text>
                  <View style={styles.chapterDivider} />
                </View>

                {messages.slice(0, 3).map((m) => (
                  <View key={m.id} style={styles.letterExcerptCard}>
                    <Ionicons name="quote" size={16} color="#f59e0b" style={{ marginBottom: 4 }} />
                    <Text style={styles.letterExcerptContent} numberOfLines={4}>
                      {m.content}
                    </Text>
                    <Text style={styles.letterExcerptAuthor}>
                      De: {m.sender || 'Karlita'} · {m.scheduled_date}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* 4. BOTÓN DESCARGAR / COMPARTIR RESUMEN */}
            <TouchableOpacity
              onPress={handleShareSummary}
              style={[styles.downloadCollageBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="share-social" size={18} color="#ffffff" />
              <Text style={styles.downloadCollageText}>Descargar / Compartir Collage</Text>
            </TouchableOpacity>

            <Text style={styles.onDemandDisclaimer}>
              ✨ Este collage se genera en tiempo real cuando lo solicitas, sin ocupar espacio adicional en la base de datos.
            </Text>
          </ScrollView>
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
                    message: `💖 ¡Celebrando nuestro Mesiversario! (${timeTogetherLabel})\n\n✨ Llevamos ${daysTogether} días juntos con ${petName}.\nKarlita & Javier 💕\n\n"Te amo hoy más que ayer y menos que mañana."`,
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

                {/* Mascota personalizada */}
                <View style={styles.storyMascotHolder}>
                  <MoodMascot feeling="enamorado" size="lg" accentColor={primaryColor} accessory="crown" />
                  <Text style={styles.storyMascotName}>🐾 {petName}</Text>
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
    paddingVertical: 24,
    paddingHorizontal: 14,
  },
  bookContainer: {
    width: '100%',
    height: '96%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  bookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  shareBtn: {
    padding: 6,
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
  pageScroll: {
    flex: 1,
    backgroundColor: '#130c24',
  },
  collageScrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  coverTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#f59e0b',
    textAlign: 'center',
  },
  titleDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#f59e0b',
    marginVertical: 8,
  },
  coverCouple: {
    fontSize: 24,
    fontFamily: SERIF_FONT,
    color: '#ffffff',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  mascotHolder: {
    alignItems: 'center',
    marginVertical: 8,
  },
  mascotNameBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statsBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
  },
  statsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flex: 1,
  },
  statsBadgeNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  statsBadgeLabel: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  coverQuote: {
    fontSize: 12,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  storyCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e1306c',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 14,
  },
  storyCoverBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  sectionHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#f59e0b',
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontFamily: SERIF_FONT,
    color: '#ffffff',
    marginTop: 2,
  },
  chapterDivider: {
    width: 36,
    height: 2,
    backgroundColor: '#f59e0b',
    marginTop: 6,
  },
  emptyCollageBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyCollageText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  polaroidCard: {
    width: (SCREEN_W - 56) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 6,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  polaroidImage: {
    width: '100%',
    height: 120,
    borderRadius: 6,
  },
  polaroidFooter: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  polaroidTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  polaroidDate: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  letterExcerptCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  letterExcerptContent: {
    fontSize: 13,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: '#f1f5f9',
    lineHeight: 18,
  },
  letterExcerptAuthor: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 8,
    textAlign: 'right',
  },
  downloadCollageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 24,
  },
  downloadCollageText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  onDemandDisclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
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
    alignItems: 'center',
  },
  storyMascotName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f59e0b',
    marginTop: 2,
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
});

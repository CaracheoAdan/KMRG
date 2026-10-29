import React, { useState, useMemo, useRef } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { Milestone, Message, UserProfile, TodaySongData, SpecialPlace } from '../types';
import { MoodMascot } from './MoodMascot';
import { calculateTimeTogether, formatDisplayDate } from '../services/StorageService';

let PrintModule: any = null;
let SharingModule: any = null;
let FileSystemModule: any = null;
let captureRef: any = null;

try {
  PrintModule = require('expo-print');
} catch {
  PrintModule = null;
}

try {
  SharingModule = require('expo-sharing');
} catch {
  SharingModule = null;
}

try {
  FileSystemModule = require('expo-file-system/legacy');
} catch {
  try {
    FileSystemModule = require('expo-file-system');
  } catch {
    FileSystemModule = null;
  }
}

try {
  captureRef = require('react-native-view-shot').captureRef;
} catch {
  captureRef = null;
}

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
  anniversaryDate?: string;
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
  primaryColor = '#ec4899',
  currentProfile,
  daysTogether,
  streakCount,
  milestones,
  messages,
  petName = 'Pochito',
  anniversaryDate,
}) => {
  const [isStoryCardOpen, setIsStoryCardOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const collageRef = useRef<any>(null);

  const timeBreakdown = useMemo(
    () => (anniversaryDate ? calculateTimeTogether(anniversaryDate) : null),
    [anniversaryDate]
  );
  const effectiveDaysTogether = timeBreakdown ? timeBreakdown.totalDays : daysTogether;
  const totalMonths = timeBreakdown
    ? timeBreakdown.years * 12 + timeBreakdown.months
    : Math.floor(daysTogether / 30.4375);
  const monthsTogether = Math.max(0, totalMonths);
  const remainingDays = timeBreakdown ? timeBreakdown.days : Math.floor(daysTogether % 30.4375);

  const timeParts: string[] = [];
  if (timeBreakdown && timeBreakdown.years > 0) {
    timeParts.push(`${timeBreakdown.years} ${timeBreakdown.years === 1 ? 'Año' : 'Años'}`);
  }
  if (monthsTogether > 0 || timeParts.length === 0) {
    const displayMonths =
      timeBreakdown && timeBreakdown.years > 0 ? timeBreakdown.months : monthsTogether;
    timeParts.push(`${displayMonths} ${displayMonths === 1 ? 'Mes' : 'Meses'}`);
  }
  if (remainingDays > 0) {
    timeParts.push(`${remainingDays} ${remainingDays === 1 ? 'Día' : 'Días'}`);
  }
  const timeTogetherLabel = timeParts.join(' y ') || `${effectiveDaysTogether} Días`;

  // Todas las fotos reales subidas para el collage
  const allPhotos = useMemo(() => {
    const valid = milestones.filter(
      (m) => m && typeof m.image_url === 'string' && m.image_url.trim().length > 0
    );
    if (valid.length > 0) return valid;
    // Si aún no han agregado fotos, usar momentos de muestra hermosos
    return [
      { id: 'sample-1', image_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800', title: 'Nuestro Amor', date: '2026-06-14' },
      { id: 'sample-2', image_url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800', title: 'Momentos Mágicos', date: '2026-07-20' },
      { id: 'sample-3', image_url: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800', title: 'Siempre Juntos', date: '2026-08-15' },
      { id: 'sample-4', image_url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800', title: 'Nuestra Historia', date: '2026-09-10' },
    ];
  }, [milestones]);

  const photoCount = allPhotos.length;
  const mosaicCols = photoCount === 1 ? 1 : photoCount <= 4 ? 2 : photoCount <= 9 ? 3 : 4;
  const mosaicRows = Math.ceil(photoCount / mosaicCols);
  const windowHeight = Dimensions.get('window').height;
  const fullMosaicTileHeight = Math.max(80, Math.floor(windowHeight / Math.max(mosaicRows, 2)));

  const generateCollageHtml = () => {
    const tilesHtml = allPhotos
      .map(
        (p) =>
          `<div class="tile"><img src="${p.image_url}" alt="${p.title || 'Foto'}" /></div>`
      )
      .join('');

    const annivFormatted = anniversaryDate
      ? formatDisplayDate(anniversaryDate, { day: 'numeric', month: 'long', year: 'numeric' })
      : '14 de Junio de 2026';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Collage de Nuestro Amor - Karlita & Javier</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1080px;
      height: 1920px;
      background: #fafafa;
      font-family: 'Plus Jakarta Sans', sans-serif;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .mosaic-grid {
      position: absolute;
      top: 0; left: 0; width: 1080px; height: 1920px;
      display: grid;
      grid-template-columns: repeat(${mosaicCols}, 1fr);
      grid-auto-rows: ${Math.floor(1920 / Math.max(mosaicRows, 2))}px;
      gap: 5px;
      padding: 5px;
      background: #f8fafc;
    }
    .tile {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 8px;
    }
    .tile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: saturate(1.08) brightness(0.96);
    }
    .overlay-vignette {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at center, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.65) 100%);
      z-index: 5;
    }
    .center-card {
      position: relative;
      z-index: 10;
      background: rgba(255, 255, 255, 0.95);
      border: 4px solid #a855f7;
      border-radius: 36px;
      padding: 38px 56px;
      text-align: center;
      max-width: 760px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 0 0 45px rgba(168, 85, 247, 0.35);
      backdrop-filter: blur(20px);
    }
    .purple-heart {
      font-size: 58px;
      line-height: 1;
      margin-bottom: 14px;
    }
    .time-primary {
      font-size: 46px;
      font-weight: 900;
      color: #7e22ce;
      letter-spacing: 2px;
      margin-bottom: 16px;
    }
    .days-pill {
      display: inline-block;
      background: rgba(168, 85, 247, 0.12);
      border: 2.5px solid #a855f7;
      color: #9333ea;
      font-size: 26px;
      font-weight: 800;
      padding: 12px 32px;
      border-radius: 999px;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="mosaic-grid">${tilesHtml}</div>
  <div class="overlay-vignette"></div>
  <div class="center-card">
    <div class="purple-heart">💜</div>
    <div class="time-primary">${timeTogetherLabel.toUpperCase()}</div>
    <div>
      <span class="days-pill">${effectiveDaysTogether} DÍAS JUNTOS</span>
    </div>
  </div>
</body>
</html>`;
  };

  const handleImportCollage = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      if (Platform.OS !== 'web') Vibration.vibrate(30);

      // 1. En Native: intentar captura directa de la vista como imagen PNG
      if (Platform.OS !== 'web' && captureRef && collageRef.current) {
        try {
          const uri = await captureRef(collageRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });

          let shareUri = uri;
          if (FileSystemModule?.cacheDirectory) {
            const dest = `${FileSystemModule.cacheDirectory}Collage_Nuestro_Amor_${Date.now()}.png`;
            try {
              await FileSystemModule.copyAsync({ from: uri, to: dest });
              shareUri = dest;
            } catch {}
          }

          if (SharingModule?.shareAsync) {
            try {
              const isShareAvailable = await SharingModule.isAvailableAsync().catch(() => false);
              if (isShareAvailable) {
                await SharingModule.shareAsync(shareUri, {
                  mimeType: 'image/png',
                  dialogTitle: 'Guardar Collage de Fotos',
                  UTI: 'public.png',
                });
                return;
              }
            } catch (shareErr) {
              console.warn('Fallo shareAsync en collage, usando Share fallback:', shareErr);
            }
          }

          await Share.share({
            url: shareUri,
            title: 'Collage de Nuestro Amor',
            message: `💖 Nuestro Collage de Amor (${timeTogetherLabel}).`,
          });
          return;
        } catch (captureErr) {
          console.warn('Error en captureRef, usando generador Canvas:', captureErr);
        }
      }

      // 2. En Web o fallback: Generación de imagen PNG mediante Canvas HTML5
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fondo
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, 1080, 1920);

          // Cargar y dibujar fotos en cuadrícula
          const tileW = Math.floor(1080 / mosaicCols);
          const tileH = Math.floor(1920 / Math.max(mosaicRows, 2));

          const loadImg = (url: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new window.Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = () => reject();
              img.src = url;
            });

          const loadedImages = await Promise.allSettled(allPhotos.map((p) => loadImg(p.image_url)));

          loadedImages.forEach((res, i) => {
            const col = i % mosaicCols;
            const row = Math.floor(i / mosaicCols);
            const x = col * tileW;
            const y = row * tileH;
            if (res.status === 'fulfilled') {
              ctx.drawImage(res.value, x + 4, y + 4, tileW - 8, tileH - 8);
            } else {
              ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(x + 4, y + 4, tileW - 8, tileH - 8);
            }
          });

          // Viñeta suave
          const grad = ctx.createRadialGradient(540, 960, 200, 540, 960, 960);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.65)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 1080, 1920);

          // Medallón Central 3D
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
          ctx.shadowBlur = 45;
          ctx.shadowOffsetY = 20;

          const cardW = 760;
          const cardH = 370;
          const cardX = (1080 - cardW) / 2;
          const cardY = (1920 - cardH) / 2;

          ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
          ctx.beginPath();
          ctx.roundRect(cardX, cardY, cardW, cardH, 36);
          ctx.fill();

          ctx.shadowColor = 'transparent';
          ctx.lineWidth = 5;
          ctx.strokeStyle = primaryColor;
          ctx.stroke();

          // Corazón morado con halo suave
          ctx.font = '72px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💜', 540, cardY + 105);

          // Tiempo juntos en primaryColor
          ctx.fillStyle = primaryColor;
          ctx.font = 'bold 44px sans-serif';
          ctx.fillText(timeTogetherLabel.toUpperCase(), 540, cardY + 185);

          // Píldora de días en primaryColor
          const pillW = 440;
          const pillH = 68;
          const pillX = (1080 - pillW) / 2;
          const pillY = cardY + 235;

          ctx.fillStyle = primaryColor + '18';
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 34);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = primaryColor;
          ctx.stroke();

          ctx.fillStyle = primaryColor;
          ctx.font = 'bold 26px sans-serif';
          ctx.fillText(`${effectiveDaysTogether} DÍAS JUNTOS`, 540, pillY + 44);
          ctx.restore();

          // Descarga directa formato imagen PNG
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = 'Collage-Nuestro-Amor.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          Alert.alert('¡Imagen Descargada! 💕', 'Se ha guardado tu collage en formato PNG.');
          return;
        }
      }

      // 3. Fallback
      Alert.alert(
        'Modo Pantalla Completa',
        'Puedes tocar la pantalla para ocultar los controles y tomar una captura limpia de tu collage.'
      );
    } catch (err: any) {
      console.warn('Error al exportar imagen:', err);
      Alert.alert(
        'Aviso',
        'Puedes tocar la pantalla para ocultar los controles y tomar una captura directamente en pantalla completa.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareSummary = async () => {
    try {
      if (Platform.OS !== 'web') Vibration.vibrate(30);
      await Share.share({
        message: `💖 Collage Semanal de Nuestro Amor (Karlita & Javier)\n\n✨ Llevamos ${effectiveDaysTogether} días juntos (${timeTogetherLabel}).\n🔥 Racha de conexión: ${streakCount} días.\n📸 ${milestones.length} momentos inolvidables en nuestro álbum.\n\n"Te amo hoy más que ayer y menos que mañana."`,
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
                accessibilityLabel="Importar Collage"
              >
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.storyHeaderBtnText}>Importar Collage</Text>
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
                    <Text style={styles.statsBadgeNum}>{effectiveDaysTogether}</Text>
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
                  <Ionicons name="sparkles" size={18} color="#ffffff" />
                  <Text style={styles.storyCoverBtnText}>Importar Collage</Text>
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

      {/* ================= MODAL COLLAGE PANTALLA COMPLETA (FOTOS + CORAZÓN MORADO + TIEMPO) ================= */}
      <Modal
        visible={isStoryCardOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setIsStoryCardOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowControls((prev) => !prev)}
          style={styles.fullScreenWrapper}
        >
          {/* Lienzo del collage completo (para captura y descarga de imagen) */}
          <View
            ref={collageRef}
            collapsable={false}
            style={styles.fullScreenCollageCanvas}
          >
            {/* Cuadrícula / mosaico de todas las fotos de borde a borde */}
            <View style={styles.mosaicGridFull}>
              {allPhotos.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.mosaicTileFull,
                    {
                      width: `${100 / mosaicCols}%`,
                      height: fullMosaicTileHeight,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.mosaicImageFull}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>

            {/* Viñeta cinematográfica suave que da profundidad 3D */}
            <View style={styles.mosaicVignetteFull} pointerEvents="none" />

            {/* Medallón 3D de lujo flotante en el centro exacto */}
            <View style={styles.centerBadgeContainerFull} pointerEvents="none">
              <View
                style={[
                  styles.centerBadgeInner3D,
                  {
                    borderColor: primaryColor,
                    shadowColor: primaryColor,
                  },
                ]}
              >
                {/* Corazón morado con halo suave (SOLO el corazón va morado) */}
                <View style={styles.purpleHeartGlowContainer}>
                  <Ionicons name="heart" size={38} color="#a855f7" />
                </View>

                {/* TIEMPO QUE LLEVAMOS (MESES O DÍAS) - En el color configurado de la app */}
                <Text style={[styles.centerTimeLabelFull, { color: primaryColor }]}>
                  {timeTogetherLabel.toUpperCase()}
                </Text>

                {/* Píldora de días juntos - En el color configurado de la app */}
                <View
                  style={[
                    styles.centerDaysPillFull,
                    {
                      backgroundColor: primaryColor + '18',
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  <Text style={[styles.centerDaysPillTextFull, { color: primaryColor }]}>
                    {effectiveDaysTogether} DÍAS JUNTOS
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Controles flotantes interactivos (se ocultan con un toque para captura limpia) */}
          {showControls && (
            <View style={styles.floatingControlsOverlay} pointerEvents="box-none">
              {/* Barra superior flotante */}
              <View style={styles.floatingTopBar}>
                <TouchableOpacity
                  onPress={() => setIsStoryCardOpen(false)}
                  style={styles.floatingCloseBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>

                <View style={[styles.floatingBadgePill, { borderColor: primaryColor }]}>
                  <Ionicons name="sparkles" size={14} color={primaryColor} />
                  <Text style={[styles.floatingBadgeText, { color: primaryColor }]}>
                    COLLAGE DE NUESTRO AMOR
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => void handleImportCollage()}
                  style={[styles.floatingIconActionBtn, { backgroundColor: primaryColor }]}
                  disabled={isExporting}
                  activeOpacity={0.8}
                >
                  <Ionicons name="download-outline" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Barra inferior flotante */}
              <View style={styles.floatingBottomBar}>
                <TouchableOpacity
                  onPress={() => setShowControls(false)}
                  style={styles.hideControlsHelpBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.hideControlsHelpText}>Toca para captura limpia</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handleImportCollage()}
                  style={[
                    styles.downloadImageBtn,
                    { backgroundColor: primaryColor, shadowColor: primaryColor },
                  ]}
                  disabled={isExporting}
                  activeOpacity={0.85}
                >
                  {isExporting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="image-outline" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.downloadImageBtnText}>
                    {isExporting ? 'Guardando Imagen...' : 'Descargar Imagen'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    width: '100%',
    height: '100%',
  },
  fullScreenCollageCanvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mosaicGridFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#f1f5f9',
  },
  mosaicTileFull: {
    padding: 2.5,
  },
  mosaicImageFull: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mosaicVignetteFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  centerBadgeContainerFull: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 20,
  },
  centerBadgeInner3D: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    borderWidth: 2.5,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 16,
  },
  purpleHeartGlowContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  centerTimeLabelFull: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 10,
  },
  centerDaysPillFull: {
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  centerDaysPillTextFull: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  floatingControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 18,
    zIndex: 30,
  },
  floatingTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  floatingCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  floatingIconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingBottomBar: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  hideControlsHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  hideControlsHelpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  downloadImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 320,
    paddingVertical: 14,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  downloadImageBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

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
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#ec4899',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  mosaicGrid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#ffffff',
  },
  mosaicTile: {
    padding: 1.5,
  },
  mosaicImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  mosaicVignette: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  centerBadgeContainer: {
    width: '88%',
    alignItems: 'center',
    zIndex: 10,
  },
  centerBadgeInner: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: '#a855f7',
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  centerHeartRow: {
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  centerCoupleName: {
    fontSize: 22,
    fontFamily: SERIF_FONT,
    color: '#1e293b',
    fontStyle: 'italic',
    fontWeight: '800',
    textAlign: 'center',
  },
  centerThemeDivider: {
    width: 44,
    height: 2.5,
    backgroundColor: '#ec4899',
    marginVertical: 6,
    borderRadius: 1,
  },
  centerTimeLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: '#7e22ce',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  centerDaysPill: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1.5,
    borderColor: '#a855f7',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  centerDaysPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9333ea',
    letterSpacing: 0.5,
  },
  centerQuoteText: {
    fontSize: 11,
    fontFamily: SERIF_FONT,
    fontStyle: 'italic',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 8,
  },
  centerFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerMascotText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#f59e0b',
  },
  centerDotSep: {
    fontSize: 10,
    color: '#64748b',
  },
  centerAnnivText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontWeight: '600',
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

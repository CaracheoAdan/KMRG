import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import {
  getHomeState,
  getMoviesState,
  getGamesState,
  getSpecialPlacesState,
  DEFAULT_HOME_STATE,
  DEFAULT_MOVIES_STATE,
  DEFAULT_GAMES_STATE,
  DEFAULT_PLACES_STATE,
} from '../services/CoupleSyncService';
import { getCachedMilestones, calculateTimeTogether } from '../services/StorageService';
import { FONTS } from '../theme/designSystem';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
  daysTogether?: number;
  streakCount?: number;
  anniversaryDate?: string;
}

export const CoupleWrappedModal: React.FC<Props> = ({
  visible,
  onClose,
  primaryColor,
  daysTogether = 0,
  streakCount = 1,
  anniversaryDate,
}) => {
  const { colors } = useTheme();
  const [totalDays, setTotalDays] = useState(daysTogether);
  const [streak, setStreak] = useState(streakCount);
  const [watchedMovies, setWatchedMovies] = useState(0);
  const [pendingMovies, setPendingMovies] = useState(0);
  const [avgMovieScore, setAvgMovieScore] = useState('5.0');
  const [placesCount, setPlacesCount] = useState(0);
  const [photosCount, setPhotosCount] = useState(0);
  const [pointsKarla, setPointsKarla] = useState(0);
  const [pointsJavier, setPointsJavier] = useState(0);
  const [trophiesTotal, setTrophiesTotal] = useState(0);

  useEffect(() => {
    if (!visible) return;

    // Sincronizar inmediatamente con los props iniciales disponibles
    if (daysTogether > 0) setTotalDays(daysTogether);
    if (streakCount > 0) setStreak(streakCount);

    Promise.allSettled([
      getHomeState(),
      getMoviesState(),
      getGamesState(),
      getSpecialPlacesState(),
      getCachedMilestones(),
    ])
      .then(([homeRes, moviesRes, gamesRes, placesRes, milestonesRes]) => {
        const h = homeRes.status === 'fulfilled' ? homeRes.value : null;
        const m = moviesRes.status === 'fulfilled' ? moviesRes.value : DEFAULT_MOVIES_STATE;
        const g = gamesRes.status === 'fulfilled' ? gamesRes.value : DEFAULT_GAMES_STATE;
        const placesSt = placesRes.status === 'fulfilled' ? placesRes.value : DEFAULT_PLACES_STATE;
        const milestones = milestonesRes.status === 'fulfilled' ? milestonesRes.value : [];

        // Calcular días juntos reales con precisión de calendario
        const activeAnniv = anniversaryDate || h?.anniversaryDate;
        const calculated = calculateTimeTogether(activeAnniv);
        const finalDays = daysTogether > 0 ? daysTogether : calculated.totalDays;
        if (finalDays > 0) {
          setTotalDays(finalDays);
        }

        const finalStreak = h?.streakCount || streakCount || 1;
        if (finalStreak > 0) {
          setStreak(finalStreak);
        }

        const watched = m.movies.filter((item) => item.watched);
        const pending = m.movies.filter((item) => !item.watched);
        setWatchedMovies(watched.length);
        setPendingMovies(pending.length);

        if (watched.length > 0) {
          const sum = watched.reduce((acc, cur) => {
            const rJ = cur.ratingJavier || 5;
            const rK = cur.ratingKarla || 5;
            return acc + (rJ + rK) / 2;
          }, 0);
          setAvgMovieScore((sum / watched.length).toFixed(1));
        }

        setPlacesCount(placesSt.places?.length || 0);
        setPhotosCount(milestones.length);
        setPointsKarla(g.leaderboard?.pointsKarla || 0);
        setPointsJavier(g.leaderboard?.pointsJavier || 0);
        setTrophiesTotal(
          (g.leaderboard?.trophiesKarla || 0) + (g.leaderboard?.trophiesJavier || 0)
        );
      })
      .catch((err) => {
        console.warn('[CoupleWrappedModal] Error cargando métricas:', err);
      });
  }, [visible, daysTogether, streakCount, anniversaryDate]);

  const calcFromAnniv = useMemo(
    () => (anniversaryDate ? calculateTimeTogether(anniversaryDate) : null),
    [anniversaryDate]
  );
  const effectiveDays =
    totalDays > 0
      ? totalDays
      : daysTogether > 0
      ? daysTogether
      : calcFromAnniv?.totalDays || 0;
  const effectiveStreak = streak > 0 ? streak : streakCount > 0 ? streakCount : 1;
  const totalHours = effectiveDays * 24;
  const gameLeader =
    pointsKarla > pointsJavier
      ? 'Karlita lidera la temporada'
      : pointsJavier > pointsKarla
      ? 'Javier lidera la temporada'
      : 'Empate técnico en juegos';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Encabezado */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.badgeIcon, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="stats-chart" size={18} color={primaryColor} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Nuestro Resumen KMRG</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Estadísticas en vivo de nuestra historia</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Card */}
            <View style={[styles.heroBanner, { backgroundColor: primaryColor }]}>
              <Text style={styles.heroOverline}>TIEMPO COMPARTIDO</Text>
              <Text style={styles.heroBigValue}>{effectiveDays} Días Juntos</Text>
              <Text style={styles.heroSubValue}>
                Equivalente a {totalHours.toLocaleString()} horas construyendo nuestra historia • Racha activa de {effectiveStreak} días
              </Text>
            </View>

            {/* Grid de Métricas */}
            <View style={styles.metricsGrid}>
              <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="film-outline" size={20} color={primaryColor} />
                <Text style={[styles.metricNumber, { color: colors.text }]}>{watchedMovies}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Películas Vistas</Text>
                <Text style={styles.metricSub}>{pendingMovies} en lista por ver</Text>
              </View>

              <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="star-outline" size={20} color={primaryColor} />
                <Text style={[styles.metricNumber, { color: colors.text }]}>{avgMovieScore}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Promedio Cine</Text>
                <Text style={styles.metricSub}>Calificación de pareja</Text>
              </View>

              <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="map-outline" size={20} color={primaryColor} />
                <Text style={[styles.metricNumber, { color: colors.text }]}>{placesCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Lugares en Mapa</Text>
                <Text style={styles.metricSub}>Pines de citas y viajes</Text>
              </View>

              <View style={[styles.metricBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="images-outline" size={20} color={primaryColor} />
                <Text style={[styles.metricNumber, { color: colors.text }]}>{photosCount}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Recuerdos</Text>
                <Text style={styles.metricSub}>Guardados en álbum</Text>
              </View>
            </View>

            {/* Resumen de Arcade */}
            <View style={[styles.arcadeSummaryBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <View style={styles.arcadeTopRow}>
                <Ionicons name="trophy-outline" size={18} color={primaryColor} />
                <Text style={[styles.arcadeTitle, { color: colors.text }]}>Temporada de Juegos</Text>
              </View>
              <Text style={[styles.arcadeLeaderText, { color: primaryColor }]}>
                {gameLeader}
              </Text>
              <View style={styles.arcadeScoreRow}>
                <Text style={styles.arcadePlayerScore}>
                  Karlita: <Text style={{ fontWeight: '800' }}>{pointsKarla} pts</Text>
                </Text>
                <Text style={styles.arcadePlayerScore}>
                  Javier: <Text style={{ fontWeight: '800' }}>{pointsJavier} pts</Text>
                </Text>
                <Text style={styles.arcadePlayerScore}>
                  Trofeos: <Text style={{ fontWeight: '800' }}>{trophiesTotal}</Text>
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.doneBtn, { backgroundColor: primaryColor }]}
          >
            <Text style={styles.doneBtnText}>Cerrar Resumen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  badgeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.serif,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroBigValue: {
    fontSize: 28,
    fontFamily: FONTS.serif,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroSubValue: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricNumber: {
    fontSize: 20,
    fontFamily: FONTS.serif,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  arcadeSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  arcadeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  arcadeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  arcadeLeaderText: {
    fontSize: 13,
    fontFamily: FONTS.serif,
    fontWeight: '800',
    marginBottom: 8,
  },
  arcadeScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  arcadePlayerScore: {
    fontSize: 11,
    color: '#475569',
  },
  doneBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default CoupleWrappedModal;

import React, { useEffect, useState } from 'react';
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
} from '../services/CoupleSyncService';
import { getCachedMilestones } from '../services/StorageService';
import { FONTS } from '../theme/designSystem';

interface Props {
  visible: boolean;
  onClose: () => void;
  primaryColor: string;
}

export const CoupleWrappedModal: React.FC<Props> = ({
  visible,
  onClose,
  primaryColor,
}) => {
  const [totalDays, setTotalDays] = useState(0);
  const [streak, setStreak] = useState(1);
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

    Promise.all([
      getHomeState(),
      getMoviesState(),
      getGamesState(),
      getSpecialPlacesState(),
      getCachedMilestones(),
    ])
      .then(([home, moviesSt, gamesSt, placesSt, milestones]) => {
        const h = home || DEFAULT_HOME_STATE;
        const m = moviesSt || DEFAULT_MOVIES_STATE;
        const g = gamesSt || DEFAULT_GAMES_STATE;

        const start = new Date(`${h.anniversaryDate}T00:00:00`);
        const days = Math.max(
          1,
          Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))
        );
        setTotalDays(days);
        setStreak(h.streakCount || 1);

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

        setPlacesCount(placesSt.places.length);
        setPhotosCount(milestones.length);
        setPointsKarla(g.leaderboard.pointsKarla || 0);
        setPointsJavier(g.leaderboard.pointsJavier || 0);
        setTrophiesTotal(
          (g.leaderboard.trophiesKarla || 0) + (g.leaderboard.trophiesJavier || 0)
        );
      })
      .catch(() => {});
  }, [visible]);

  const totalHours = totalDays * 24;
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
        <View style={styles.card}>
          {/* Encabezado */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.badgeIcon, { backgroundColor: `${primaryColor}18` }]}>
                <Ionicons name="stats-chart" size={18} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.title}>Nuestro Resumen KMRG</Text>
                <Text style={styles.subtitle}>Estadísticas en vivo de nuestra historia</Text>
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
              <Text style={styles.heroBigValue}>{totalDays} Días Juntos</Text>
              <Text style={styles.heroSubValue}>
                Equivalente a {totalHours.toLocaleString()} horas construyendo nuestra historia • Racha activa de {streak} días
              </Text>
            </View>

            {/* Grid de Métricas */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Ionicons name="film-outline" size={20} color={primaryColor} />
                <Text style={styles.metricNumber}>{watchedMovies}</Text>
                <Text style={styles.metricLabel}>Películas Vistas</Text>
                <Text style={styles.metricSub}>{pendingMovies} en lista por ver</Text>
              </View>

              <View style={styles.metricBox}>
                <Ionicons name="star-outline" size={20} color={primaryColor} />
                <Text style={styles.metricNumber}>{avgMovieScore}</Text>
                <Text style={styles.metricLabel}>Promedio Cine</Text>
                <Text style={styles.metricSub}>Calificación de pareja</Text>
              </View>

              <View style={styles.metricBox}>
                <Ionicons name="map-outline" size={20} color={primaryColor} />
                <Text style={styles.metricNumber}>{placesCount}</Text>
                <Text style={styles.metricLabel}>Lugares en Mapa</Text>
                <Text style={styles.metricSub}>Pines de citas y viajes</Text>
              </View>

              <View style={styles.metricBox}>
                <Ionicons name="images-outline" size={20} color={primaryColor} />
                <Text style={styles.metricNumber}>{photosCount}</Text>
                <Text style={styles.metricLabel}>Recuerdos</Text>
                <Text style={styles.metricSub}>Guardados en álbum</Text>
              </View>
            </View>

            {/* Resumen de Arcade */}
            <View style={styles.arcadeSummaryBox}>
              <View style={styles.arcadeTopRow}>
                <Ionicons name="trophy-outline" size={18} color={primaryColor} />
                <Text style={styles.arcadeTitle}>Temporada de Juegos</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 26,
    padding: 20,
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
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: FONTS.sans,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  heroOverline: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1.2,
  },
  heroBigValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: FONTS.serif,
    marginTop: 4,
  },
  heroSubValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  metricSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  arcadeSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  arcadeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arcadeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  arcadeLeaderText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  arcadeScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  arcadePlayerScore: {
    fontSize: 12,
    color: '#475569',
  },
  doneBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

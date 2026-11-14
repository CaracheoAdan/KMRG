import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../components/ui/Icon';
import { PressableScale, EmptyState } from '../components/ui/Kit';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { PochitoBear } from '../components/PochitoBear';
import { MovieItem, BucketItem, MoviesAndPlansState, PetAccessoryType } from '../types';
import {
  getMoviesState,
  saveMoviesState,
  DEFAULT_MOVIES_STATE,
  mergeMoviesStates,
  getHomeState,
  subscribeHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { toLocalDateString, formatDisplayDate } from '../services/StorageService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

type SubTab = 'pending' | 'watched' | 'bucket' | 'roulette';
type MovieSortMode = 'recent' | 'oldest' | 'rating' | 'alpha';

const BUCKET_IDEAS = [
  'Viaje a la playa juntos',
  'Picnic al atardecer',
  'Acampar bajo las estrellas',
  'Cocinar una cena especial',
  'Ir a un concierto juntos',
  'Maratón de pelis con palomitas',
];

function getMovieCreatedTs(movie: MovieItem, originalIndex: number, total: number): number {
  if (movie.id && movie.id.startsWith('mov-')) {
    const parsed = Number(movie.id.slice(4));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return total - originalIndex;
}

function getMovieWatchedDateKey(movie: MovieItem): string {
  return movie.watchedDate ? toLocalDateString(movie.watchedDate) : '';
}

function getMovieNumericAvg(movie: MovieItem): number {
  if (movie.ratingJavier && movie.ratingKarla) {
    return (movie.ratingJavier + movie.ratingKarla) / 2;
  }
  return movie.ratingJavier || movie.ratingKarla || 0;
}

function getDreamVisual(title: string): { icon: string; accent: string; label: string } {
  const t = title.toLowerCase();
  if (/(viaj|playa|mar|par[ií]s|jap[oó]n|europa|avi[oó]n|vuelo|conocer|ciudad|pueblo|caba[ñn]a|bosque|monta[ñn]a|hotel|ruta|carretera)/.test(t)) {
    return { icon: 'airplane', accent: '#0ea5e9', label: 'Viaje' };
  }
  if (/(cen|comer|cocinar|picnic|caf[eé]|vino|restaurante|postre|tacos|sushi|brunch|desayuno)/.test(t)) {
    return { icon: 'restaurant', accent: '#f97316', label: 'Antojo' };
  }
  if (/(casa|depto|departamento|hogar|vivir|mascota|perr|gat|boda|casar|anillo|familia|cuarto)/.test(t)) {
    return { icon: 'home', accent: '#ec4899', label: 'Hogar' };
  }
  if (/(concierto|festival|cine|acampar|estrella|nieve|tatuaje|foto|bailar|museo|parque|show|marat[oó]n)/.test(t)) {
    return { icon: 'sparkles', accent: '#8b5cf6', label: 'Aventura' };
  }
  return { icon: 'heart', accent: '#f43f5e', label: 'Sueño' };
}

// Optimiza en tiempo real las URLs de pósters (IMDb, TMDB, TVMaze) para que pesen ~12KB en vez de ~3MB
// sin borrar ni alterar ninguna película guardada
function optimizePosterUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // IMDb / Amazon Media CDN: redimensionar a 180px de ancho con calidad óptima
  if (trimmed.includes('media-amazon.com/images/') || trimmed.includes('media-imdb.com/images/')) {
    return trimmed.replace(/\._V1_.*?\.(jpg|jpeg|png)$/i, '._V1_QL75_UX180_.jpg');
  }

  // TMDB CDN: usar w185 para miniaturas de lista
  if (trimmed.includes('image.tmdb.org/t/p/')) {
    return trimmed.replace(/\/t\/p\/(w500|w780|original)\//, '/t/p/w185/');
  }

  // TVMaze CDN: usar medium_portrait en lugar de original_untouched
  if (trimmed.includes('static.tvmaze.com/uploads/images/original_untouched/')) {
    return trimmed.replace('/original_untouched/', '/medium_portrait/');
  }

  return trimmed;
}

interface MovieCardItemProps {
  movie: MovieItem;
  orderNumber?: number;
  colors: ThemePalette;
  isDark: boolean;
  styles: any;
  getDisplayName: (person: 'Javier' | 'Karla') => string;
  getAvatarUri: (person: 'Javier' | 'Karla') => string | null;
  onPressMovie: (movie: MovieItem) => void;
  onRemoveReview: (movie: MovieItem) => void;
  onDeleteMovie: (movie: MovieItem) => void;
}

const MiniAvatar: React.FC<{
  uri?: string | null;
  name: string;
  size?: number;
  bgColor: string;
  textColor: string;
}> = ({ uri, name, size = 16, bgColor, textColor }) => {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: Math.max(8, Math.round(size * 0.54)), fontWeight: '800', color: textColor }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
};

const MovieCardItem = React.memo<MovieCardItemProps>(
  ({ movie, orderNumber, colors, isDark, styles, getDisplayName, getAvatarUri, onPressMovie, onRemoveReview, onDeleteMovie }) => {
    const avg =
      movie.ratingJavier && movie.ratingKarla
        ? ((movie.ratingJavier + movie.ratingKarla) / 2).toFixed(1)
        : movie.ratingJavier
          ? movie.ratingJavier.toFixed(1)
          : movie.ratingKarla
            ? movie.ratingKarla.toFixed(1)
            : null;
    const thumbUri = optimizePosterUrl(movie.posterUrl);
    const proposerName = getDisplayName(movie.addedBy);
    const proposerAvatar = getAvatarUri(movie.addedBy);
    const karlaName = getDisplayName('Karla');
    const javierName = getDisplayName('Javier');
    const karlaAvatar = getAvatarUri('Karla');
    const javierAvatar = getAvatarUri('Javier');

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPressMovie(movie)}
        style={[
          styles.movieCard,
          {
            backgroundColor: colors.surface,
            borderColor: movie.watched && avg
              ? (isDark ? 'rgba(245, 158, 11, 0.32)' : '#fde68a')
              : colors.border,
          },
        ]}
      >
        <View style={styles.movieCardTop}>
          <View style={styles.posterFrame}>
            {thumbUri ? (
              <Image
                source={{ uri: thumbUri }}
                style={styles.movieCardPoster}
                resizeMode="cover"
                resizeMethod="resize"
                fadeDuration={0}
              />
            ) : (
              <LinearGradient
                colors={[colors.primaryLight, colors.surfaceAlt]}
                style={styles.moviePosterPlaceholder}
              >
                <Ionicons name="film" size={24} color={colors.primary} />
                <Text
                  style={[styles.posterPlaceholderTitle, { color: colors.primary }]}
                  numberOfLines={2}
                >
                  {movie.title}
                </Text>
              </LinearGradient>
            )}
            {movie.year ? (
              <View style={styles.posterYearPill}>
                <Text style={styles.posterYearText}>{movie.year}</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, paddingRight: 4, justifyContent: 'space-between' }}>
            <View>
              <View style={styles.genreRow}>
                {orderNumber !== undefined && (
                  <View style={[styles.orderNumPill, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.orderNumText, { color: colors.primaryOn }]}>
                      #{orderNumber}
                    </Text>
                  </View>
                )}
                <View style={[styles.genreBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text
                    style={[styles.genreBadgeText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {movie.genre}
                  </Text>
                </View>

                <View style={[styles.proposerChip, { backgroundColor: colors.surfaceAlt }]}>
                  <MiniAvatar
                    uri={proposerAvatar}
                    name={proposerName}
                    size={15}
                    bgColor={colors.primaryLight}
                    textColor={colors.primary}
                  />
                  <Text style={[styles.addedByText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {proposerName}
                  </Text>
                </View>
              </View>

              <Text style={[styles.movieTitle, { color: colors.text }]} numberOfLines={2}>
                {movie.title}
              </Text>

              {movie.director ? (
                <Text style={[styles.movieDirectorText, { color: colors.textMuted }]} numberOfLines={1}>
                  Dir. {movie.director}
                </Text>
              ) : null}

              {movie.synopsis ? (
                <Text style={[styles.movieSynopsisPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                  {movie.synopsis}
                </Text>
              ) : null}
            </View>

            {movie.watched && movie.watchedDate ? (
              <View style={styles.watchedDateRow}>
                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                <Text style={[styles.watchedDateText, { color: colors.textMuted }]}>
                  Vista el {formatDisplayDate(movie.watchedDate)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.cardRightActions}>
            {movie.watched && avg ? (
              <View
                style={[
                  styles.avgBadge,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                    borderColor: isDark ? 'rgba(245, 158, 11, 0.45)' : '#fcd34d',
                  },
                ]}
              >
                <Ionicons name="star" size={13} color="#f59e0b" />
                <Text style={[styles.avgBadgeText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                  {avg}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => onPressMovie(movie)}
                style={[
                  styles.markWatchedBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primaryLight,
                  },
                ]}
              >
                <Ionicons name="star" size={12} color={colors.primary} />
                <Text style={[styles.markWatchedText, { color: colors.primary }]}>
                  {movie.watched ? 'Editar' : 'Calificar'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {movie.watched && (
                <TouchableOpacity
                  onPress={() => onRemoveReview(movie)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={[
                    styles.cardIconActionBtn,
                    { backgroundColor: isDark ? 'rgba(225, 29, 72, 0.16)' : '#fff1f2' },
                  ]}
                >
                  <Ionicons name="arrow-undo-outline" size={14} color="#e11d48" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => onDeleteMovie(movie)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.cardIconActionBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {(movie.watched || movie.notes) && (
          <View style={[styles.watchedReviewSection, { borderTopColor: colors.border }]}>
            {movie.watched && (movie.ratingKarla || movie.ratingJavier) ? (
              <View style={styles.movieRatingPillsRow}>
                {movie.ratingKarla ? (
                  <View
                    style={[
                      styles.miniRatingPill,
                      { backgroundColor: isDark ? 'rgba(219, 39, 119, 0.16)' : '#fdf2f8' },
                    ]}
                  >
                    <MiniAvatar
                      uri={karlaAvatar}
                      name={karlaName}
                      size={16}
                      bgColor={isDark ? 'rgba(244, 114, 182, 0.25)' : '#fbcfe8'}
                      textColor={isDark ? '#f472b6' : '#be185d'}
                    />
                    <Text style={[styles.miniRatingText, { color: isDark ? '#f472b6' : '#be185d' }]}>
                      {karlaName}: ★ {movie.ratingKarla}
                    </Text>
                  </View>
                ) : null}
                {movie.ratingJavier ? (
                  <View
                    style={[
                      styles.miniRatingPill,
                      { backgroundColor: isDark ? 'rgba(2, 132, 199, 0.16)' : '#f0f9ff' },
                    ]}
                  >
                    <MiniAvatar
                      uri={javierAvatar}
                      name={javierName}
                      size={16}
                      bgColor={isDark ? 'rgba(56, 189, 248, 0.25)' : '#bae6fd'}
                      textColor={isDark ? '#38bdf8' : '#0369a1'}
                    />
                    <Text style={[styles.miniRatingText, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                      {javierName}: ★ {movie.ratingJavier}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {movie.notes ? (
              <View
                style={[
                  styles.movieNotesQuoteBox,
                  { backgroundColor: colors.surfaceAlt, borderLeftColor: colors.primary },
                ]}
              >
                <Text style={[styles.movieNotesInline, { color: colors.textSecondary }]}>
                  “{movie.notes}”
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

export const MoviesScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { profile, getDisplayName, getAvatarUri } = useProfile();
  const currentProfile = profile || 'Karla';

  const [state, setState] = useState<MoviesAndPlansState>(DEFAULT_MOVIES_STATE);
  const [subTab, setSubTab] = useState<SubTab>('pending');
  const [movieSort, setMovieSort] = useState<MovieSortMode>('recent');
  const [bucketFilter, setBucketFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [rouletteMovie, setRouletteMovie] = useState<MovieItem | null>(null);

  // Paginación para evitar el scroll vertical
  const [moviePage, setMoviePage] = useState(0);
  const [bucketPage, setBucketPage] = useState(0);
  const tabsScrollRef = useRef<any>(null);
  const rouletteScrollRef = useRef<any>(null);
  const rateMovieScrollRef = useRef<any>(null);

  useEffect(() => {
    tabsScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, []);

  // Entrada Rápida de Película con autocompletado en vivo mientras escribes
  const [quickTitle, setQuickTitle] = useState('');
  const [catalogResults, setCatalogResults] = useState<
    Array<{
      title: string;
      year: string;
      director: string;
      genre: string;
      posterUrl: string;
      synopsis: string;
    }>
  >([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);

  // Modal calificar / ver detalle de película
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [tempRatingJavier, setTempRatingJavier] = useState<number>(5);
  const [tempRatingKarla, setTempRatingKarla] = useState<number>(5);
  const [tempNotes, setTempNotes] = useState('');

  // Nuevo sueño en Bucket List
  const [newBucketTitle, setNewBucketTitle] = useState('');

  // Ruleta de comida / cita
  const [newFoodOption, setNewFoodOption] = useState('');
  const [selectedFoodResult, setSelectedFoodResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [petMeta, setPetMeta] = useState<{ name: string; accessory: PetAccessoryType }>({
    name: DEFAULT_HOME_STATE.couplePet?.name || 'Pochito',
    accessory: DEFAULT_HOME_STATE.couplePet?.accessory || 'none',
  });

  const loadData = useCallback(async () => {
    const loaded = await getMoviesState();
    setState(loaded);
  }, []);

  useEffect(() => {
    void loadData();
    void getHomeState().then((home) => {
      if (home?.couplePet) {
        setPetMeta({
          name: home.couplePet.name || 'Pochito',
          accessory: home.couplePet.accessory || 'none',
        });
      }
    });
    const unsubHome = subscribeHomeState((home) => {
      if (home?.couplePet) {
        setPetMeta({
          name: home.couplePet.name || 'Pochito',
          accessory: home.couplePet.accessory || 'none',
        });
      }
    });

    const channel = supabase
      .channel('kmrg-movies-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (
            payload.new?.type === 'sync_movies_state' &&
            payload.new?.payload &&
            payload.new?.sender !== currentProfile
          ) {
            setState((prev) => mergeMoviesStates(prev, payload.new.payload as MoviesAndPlansState));
          }
        }
      )
      .subscribe();

    return () => {
      unsubHome();
      void supabase.removeChannel(channel);
    };
  }, [loadData, currentProfile]);

  const updateAndSync = async (nextState: MoviesAndPlansState) => {
    setState(nextState);
    await saveMoviesState(currentProfile, nextState);
  };

interface CatalogMovieResult {
  title: string;
  year: string;
  director: string;
  genre: string;
  posterUrl: string;
  synopsis: string;
}

// Búsqueda inteligente multi-fuente: TMDB -> IMDb Oficial -> TVMaze
async function searchMovieCatalog(
  query: string,
  preferredGenre?: string | null
): Promise<CatalogMovieResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // 1. Si hay clave de TMDB configurada en el entorno, intentarla primero
  const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (tmdbKey) {
    try {
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&language=es-MX`
      );
      const tmdbData = await tmdbRes.json();
      if (Array.isArray(tmdbData?.results) && tmdbData.results.length > 0) {
        return tmdbData.results.slice(0, 8).map((r: any) => ({
          title: r.title || r.name || q,
          year: r.release_date || r.first_air_date ? String(r.release_date || r.first_air_date).slice(0, 4) : '',
          director: '',
          genre: preferredGenre || (r.media_type === 'tv' ? 'Serie' : 'Película'),
          posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : '',
          synopsis: r.overview || '',
        }));
      }
    } catch {
      // Continuar con IMDb si falla
    }
  }

  // 2. Búsqueda oficial global con IMDb Suggestion API (gratuita, sin API key, pósters oficiales en HD)
  try {
    const clean = q
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    if (clean) {
      const firstChar = clean[0];
      const imdbRes = await fetch(`https://v3.sg.media-imdb.com/suggestion/${firstChar}/${clean}.json`);
      const imdbData = await imdbRes.json();

      if (Array.isArray(imdbData?.d)) {
        const titles = imdbData.d.filter((item: any) => item.id && String(item.id).startsWith('tt'));
        if (titles.length > 0) {
          return titles.slice(0, 8).map((item: any) => ({
            title: item.l || q,
            year: item.y ? String(item.y) : '',
            director: item.s || '',
            genre:
              preferredGenre ||
              (item.q === 'TV series' || item.q === 'tvMiniSeries' ? 'Serie' : 'Película'),
            posterUrl: optimizePosterUrl(item.i?.imageUrl) || '',
            synopsis: item.s ? `Reparto: ${item.s}` : '',
          }));
        }
      }
    }
  } catch {
    // Continuar con TVMaze si falla
  }

  // 3. Fallback adicional con TVMaze (ideal para series y programas de TV)
  try {
    const tvRes = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`);
    const tvData = await tvRes.json();
    if (Array.isArray(tvData) && tvData.length > 0) {
      return tvData.slice(0, 6).map((item: any) => {
        const show = item.show || {};
        const year = show.premiered ? String(show.premiered).slice(0, 4) : '';
        const cleanSummary = show.summary ? String(show.summary).replace(/<[^>]*>/g, '').trim() : '';
        return {
          title: show.name || q,
          year,
          director: '',
          genre: preferredGenre || (show.genres && show.genres[0]) || 'Serie',
          posterUrl: show.image?.medium || show.image?.original || '',
          synopsis: cleanSummary,
        };
      });
    }
  } catch {
    // Sin resultados
  }

  return [];
}

  // --- Autocompletado en vivo mientras escribes el nombre de la película ---
  useEffect(() => {
    const q = quickTitle.trim();
    if (q.length < 2) {
      setCatalogResults([]);
      setIsSearchingCatalog(false);
      return;
    }

    let cancelled = false;
    setIsSearchingCatalog(true);

    const timer = setTimeout(async () => {
      try {
        const mapped = await searchMovieCatalog(q);
        if (!cancelled) {
          setCatalogResults(mapped);
        }
      } catch {
        if (!cancelled) setCatalogResults([]);
      } finally {
        if (!cancelled) setIsSearchingCatalog(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quickTitle]);

  const handleSelectCatalogMovie = async (found: {
    title: string;
    year: string;
    director: string;
    genre: string;
    posterUrl: string;
    synopsis: string;
  }) => {
    const item: MovieItem = {
      id: `mov-${Date.now()}`,
      title: found.title,
      genre: found.genre || 'Película',
      addedBy: currentProfile,
      watched: false,
      posterUrl: found.posterUrl,
      year: found.year,
      director: found.director,
      synopsis: found.synopsis,
    };

    const nextState: MoviesAndPlansState = {
      ...state,
      movies: [item, ...state.movies],
    };

    await updateAndSync(nextState);
    setQuickTitle('');
    setCatalogResults([]);
    setMoviePage(0);
    setSubTab('pending');
  };

  const handleQuickAddMovie = async () => {
    const rawTitle = quickTitle.trim();
    if (!rawTitle) {
      Alert.alert('Título requerido', 'Escribe el nombre de la película o serie.');
      return;
    }

    let posterUrl: string | undefined;
    let year: string | undefined;
    let director: string | undefined;
    let synopsis: string | undefined;

    if (catalogResults.length > 0) {
      const top = catalogResults[0];
      posterUrl = top.posterUrl;
      year = top.year;
      director = top.director;
      synopsis = top.synopsis;
    } else {
      try {
        const results = await searchMovieCatalog(rawTitle);
        if (results.length > 0) {
          const top = results[0];
          posterUrl = top.posterUrl;
          year = top.year;
          director = top.director;
          synopsis = top.synopsis;
        }
      } catch {
        // Fallback gracefully without throwing
      }
    }

    const item: MovieItem = {
      id: `mov-${Date.now()}`,
      title: rawTitle,
      genre: 'Película',
      addedBy: currentProfile,
      watched: false,
      posterUrl,
      year,
      director,
      synopsis,
    };

    const nextState: MoviesAndPlansState = {
      ...state,
      movies: [item, ...state.movies],
    };

    await updateAndSync(nextState);
    setQuickTitle('');
    setCatalogResults([]);
    setMoviePage(0);
    setSubTab('pending');
  };

  const openRateModal = (movie: MovieItem) => {
    setSelectedMovie(movie);
    setTempRatingJavier(movie.ratingJavier || 5);
    setTempRatingKarla(movie.ratingKarla || 5);
    setTempNotes(movie.notes || '');

    // Auto-recuperar póster si no lo tenía previamente
    if (!movie.posterUrl) {
      void (async () => {
        try {
          const results = await searchMovieCatalog(movie.title, movie.genre);
          if (results.length > 0 && results[0].posterUrl) {
            const found = results[0];
            setSelectedMovie((prev) =>
              prev && prev.id === movie.id
                ? {
                    ...prev,
                    posterUrl: found.posterUrl,
                    year: prev.year || found.year,
                    director: prev.director || found.director,
                    synopsis: prev.synopsis || found.synopsis,
                  }
                : prev
            );
            const nextMovies = state.movies.map((m) =>
              m.id === movie.id
                ? {
                    ...m,
                    posterUrl: found.posterUrl,
                    year: m.year || found.year,
                    director: m.director || found.director,
                    synopsis: m.synopsis || found.synopsis,
                  }
                : m
            );
            void updateAndSync({ ...state, movies: nextMovies });
          }
        } catch {
          // Ignorar
        }
      })();
    }
  };

  const handleSaveMovieRating = async () => {
    if (!selectedMovie) return;

    const updatedMovies = state.movies.map((m) =>
      m.id === selectedMovie.id
        ? {
            ...m,
            watched: true,
            watchedDate: m.watchedDate || toLocalDateString(new Date()),
            ratingJavier: tempRatingJavier,
            ratingKarla: tempRatingKarla,
            notes: tempNotes.trim(),
          }
        : m
    );

    await updateAndSync({ ...state, movies: updatedMovies });
    setSelectedMovie(null);
    setMoviePage(0);
    setSubTab('watched');
  };

  const handleRemoveMovieReview = (movie: MovieItem) => {
    Alert.alert(
      '¿Borrar reseña?',
      `¿Deseas quitar la calificación y notas de "${movie.title}"? Volverá a "Por Ver".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar Reseña',
          style: 'destructive',
          onPress: async () => {
            const updatedMovies = state.movies.map((m) =>
              m.id === movie.id
                ? {
                    ...m,
                    watched: false,
                    watchedDate: undefined,
                    ratingJavier: undefined,
                    ratingKarla: undefined,
                    notes: undefined,
                  }
                : m
            );
            await updateAndSync({ ...state, movies: updatedMovies });
            setSelectedMovie(null);
            setMoviePage(0);
            setSubTab('pending');
          },
        },
      ]
    );
  };

  const handleDeleteMovie = (movie: MovieItem) => {
    Alert.alert(
      '¿Eliminar película?',
      `¿Seguro que quieres borrar "${movie.title}" de la lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const updated = state.movies.filter((m) => m.id !== movie.id);
            await updateAndSync({ ...state, movies: updated });
            setSelectedMovie(null);
          },
        },
      ]
    );
  };

  const handleSpinMovieRoulette = () => {
    const pending = state.movies.filter((m) => !m.watched);
    if (pending.length === 0) {
      Alert.alert(
        'Cartelera vacía',
        'Agreguen películas a su lista de "Por Ver" para elegir una al azar.'
      );
      return;
    }
    const pool =
      rouletteMovie && pending.length > 1
        ? pending.filter((m) => m.id !== rouletteMovie.id)
        : pending;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setRouletteMovie(picked);
  };

  // --- Funciones para Bucket List ---
  const handleAddBucketItem = async (presetTitle?: string) => {
    const candidate = (typeof presetTitle === 'string' ? presetTitle : newBucketTitle).trim();
    if (!candidate) return;
    if (state.bucketList.some((b) => b.title.toLowerCase() === candidate.toLowerCase())) {
      if (typeof presetTitle !== 'string') setNewBucketTitle('');
      return;
    }
    const item: BucketItem = {
      id: `b-${Date.now()}`,
      title: candidate,
      completed: false,
      addedBy: currentProfile,
    };
    await updateAndSync({
      ...state,
      bucketList: [item, ...state.bucketList],
    });
    if (typeof presetTitle !== 'string') setNewBucketTitle('');
    setBucketPage(0);
  };

  const handleToggleBucketItem = async (id: string) => {
    const updated = state.bucketList.map((b) =>
      b.id === id
        ? {
            ...b,
            completed: !b.completed,
            completedDate: !b.completed ? toLocalDateString(new Date()) : undefined,
          }
        : b
    );
    await updateAndSync({ ...state, bucketList: updated });
  };

  const handleDeleteBucketItem = async (id: string) => {
    await updateAndSync({
      ...state,
      bucketList: state.bucketList.filter((b) => b.id !== id),
    });
  };

  // --- Funciones para Ruleta de Comida ---
  const handleSpinFoodWheel = () => {
    if (state.foodOptions.length === 0 || isSpinning) return;
    setIsSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      const rand = state.foodOptions[Math.floor(Math.random() * state.foodOptions.length)];
      setSelectedFoodResult(rand);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        setIsSpinning(false);
      }
    }, 90);
  };

  const handleAddFoodOption = async (preset?: unknown) => {
    const candidate = (typeof preset === 'string' ? preset : newFoodOption).trim();
    if (!candidate) return;
    const alreadyExists = state.foodOptions.some(
      (o) => o.toLowerCase() === candidate.toLowerCase()
    );
    if (alreadyExists) {
      if (typeof preset !== 'string') setNewFoodOption('');
      return;
    }
    await updateAndSync({
      ...state,
      foodOptions: [...state.foodOptions, candidate],
    });
    if (typeof preset !== 'string') setNewFoodOption('');
  };

  const handleRemoveFoodOption = async (opt: string) => {
    await updateAndSync({
      ...state,
      foodOptions: state.foodOptions.filter((o) => o !== opt),
    });
  };

  const indexedMovies = useMemo(
    () =>
      state.movies.map((m, idx) => ({
        movie: m,
        createdTs: getMovieCreatedTs(m, idx, state.movies.length),
      })),
    [state.movies]
  );

  const pendingMovies = useMemo(
    () => indexedMovies.filter((x) => !x.movie.watched).map((x) => x.movie),
    [indexedMovies]
  );
  const watchedMovies = useMemo(
    () => indexedMovies.filter((x) => x.movie.watched).map((x) => x.movie),
    [indexedMovies]
  );

  // Mapa ordinal cronológico de vistas (#1 = primera película vista/agregada)
  const watchedOrderMap = useMemo(() => {
    const watchedEntries = indexedMovies.filter((x) => x.movie.watched);
    const chronological = [...watchedEntries].sort((a, b) => {
      const da = getMovieWatchedDateKey(a.movie);
      const db = getMovieWatchedDateKey(b.movie);
      if (da && db && da !== db) return da.localeCompare(db);
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a.createdTs - b.createdTs;
    });
    const map = new Map<string, number>();
    chronological.forEach((entry, i) => map.set(entry.movie.id, i + 1));
    return map;
  }, [indexedMovies]);

  const effectiveMovieSort: MovieSortMode =
    subTab !== 'watched' && movieSort === 'rating' ? 'recent' : movieSort;

  const activeMovieList = useMemo(() => {
    const targetWatched = subTab === 'watched';
    const entries = indexedMovies.filter((x) => Boolean(x.movie.watched) === targetWatched);
    const sorted = [...entries].sort((a, b) => {
      if (effectiveMovieSort === 'oldest') {
        if (targetWatched) {
          const ordA = watchedOrderMap.get(a.movie.id) ?? 0;
          const ordB = watchedOrderMap.get(b.movie.id) ?? 0;
          return ordA - ordB;
        }
        return a.createdTs - b.createdTs;
      }
      if (effectiveMovieSort === 'rating' && targetWatched) {
        const diff = getMovieNumericAvg(b.movie) - getMovieNumericAvg(a.movie);
        if (diff !== 0) return diff;
      }
      if (effectiveMovieSort === 'alpha') {
        return a.movie.title.localeCompare(b.movie.title, 'es');
      }
      // 'recent': más recientes primero (por fecha vista en Vistas, luego creación)
      if (targetWatched) {
        const ordA = watchedOrderMap.get(a.movie.id) ?? 0;
        const ordB = watchedOrderMap.get(b.movie.id) ?? 0;
        return ordB - ordA;
      }
      return b.createdTs - a.createdTs;
    });
    return sorted.map((x) => x.movie);
  }, [indexedMovies, subTab, effectiveMovieSort, watchedOrderMap]);

  const completedBucketCount = state.bucketList.filter((b) => b.completed).length;
  const bucketProgressPercent =
    state.bucketList.length > 0
      ? Math.round((completedBucketCount / state.bucketList.length) * 100)
      : 0;

  const filteredBucketList = state.bucketList.filter((b) => {
    if (bucketFilter === 'pending') return !b.completed;
    if (bucketFilter === 'completed') return b.completed;
    return true;
  });

  const availableBucketIdeas = BUCKET_IDEAS.filter(
    (idea) => !state.bucketList.some((b) => b.title.toLowerCase() === idea.toLowerCase())
  );

  const ratedMoviesScores = watchedMovies
    .map((m) => {
      if (m.ratingJavier && m.ratingKarla) return (m.ratingJavier + m.ratingKarla) / 2;
      return m.ratingJavier || m.ratingKarla || null;
    })
    .filter((s): s is number => s !== null);

  const coupleAvgScore =
    ratedMoviesScores.length > 0
      ? (ratedMoviesScores.reduce((acc, s) => acc + s, 0) / ratedMoviesScores.length).toFixed(1)
      : '—';

  const availableFoodSuggestions = [
    'Sushi',
    'Tacos',
    'Ramen',
    'Alitas',
    'Pizza',
    'Hamburguesas',
    'Pasta',
    'Postre',
  ].filter(
    (s) => !state.foodOptions.some((o) => o.toLowerCase() === s.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      {/* Contenedor Fijo con soporte de teclado */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.fixedViewport}
      >
        {/* Selector Editorial de 4 Sub-Pestañas */}
        <View style={styles.tabsWrapper}>
          <View style={[styles.equalTabsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { id: 'pending', label: 'Por Ver', icon: 'film-outline', activeIcon: 'film', count: pendingMovies.length },
              { id: 'watched', label: 'Vistas', icon: 'star-outline', activeIcon: 'star', count: watchedMovies.length },
              {
                id: 'bucket',
                label: 'Sueños',
                icon: 'sparkles-outline',
                activeIcon: 'sparkles',
                count: state.bucketList.length,
              },
              {
                id: 'roulette',
                label: 'Comida',
                icon: 'restaurant-outline',
                activeIcon: 'restaurant-outline',
                count: state.foodOptions.length,
              },
            ].map((t) => {
              const active = subTab === t.id;
              return (
                <PressableScale
                  key={t.id}
                  onPress={() => {
                    setMoviePage(0);
                    setBucketPage(0);
                    setSubTab(t.id as SubTab);
                  }}
                  style={[
                    styles.equalTabBtn,
                    { flex: 1 },
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surfaceAlt, borderColor: 'transparent' },
                  ]}
                  scaleTo={0.95}
                >
                  <Ionicons
                    name={(active ? t.activeIcon : t.icon) as any}
                    size={15}
                    color={active ? colors.primaryOn : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.equalTabBtnText,
                      active
                        ? { color: colors.primaryOn, fontWeight: '800' }
                        : { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                  {t.count > 0 && (
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: active ? 'rgba(255,255,255,0.24)' : colors.surface,
                          borderColor: active ? 'rgba(255,255,255,0.38)' : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabBadgeText,
                          { color: active ? colors.primaryOn : colors.textSecondary },
                        ]}
                      >
                        {t.count}
                      </Text>
                    </View>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </View>

        {/* ================= VISTAS 1 Y 2: PELÍCULAS POR VER / YA VISTAS ================= */}
        {(subTab === 'pending' || subTab === 'watched') && (
          <View style={styles.contentArea}>
            {/* Banner Hero Editorial de Cartelera */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.06)', colors.surface]
                  : [colors.primaryLight, colors.surface]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.cinemaHeroBanner, { borderColor: colors.border }]}
            >
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.cinemaHeroEyebrow, { color: colors.primary }]}>
                  {subTab === 'pending' ? 'PRÓXIMAS FUNCIONES' : 'ARCHIVO DE CINE'}
                </Text>
                <Text style={[styles.cinemaHeroTitle, { color: colors.text }]} numberOfLines={1}>
                  {subTab === 'pending'
                    ? pendingMovies.length === 1
                      ? '1 peli en cartelera'
                      : `${pendingMovies.length} pelis por ver`
                    : watchedMovies.length === 1
                      ? '1 historia vista juntos'
                      : `${watchedMovies.length} vistas en pareja`}
                </Text>
                <View style={styles.cinemaStatsRow}>
                  <View style={[styles.cinemaStatPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text style={[styles.cinemaStatText, { color: colors.textSecondary }]}>
                      Prom. {coupleAvgScore}
                    </Text>
                  </View>
                  <View style={[styles.cinemaStatPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="film-outline" size={11} color={colors.primary} />
                    <Text style={[styles.cinemaStatText, { color: colors.textSecondary }]}>
                      {state.movies.length} totales
                    </Text>
                  </View>
                </View>
              </View>

              {subTab === 'pending' ? (
                <PressableScale
                  onPress={handleSpinMovieRoulette}
                  style={[styles.heroRouletteBtn, { backgroundColor: colors.primary }]}
                  scaleTo={0.94}
                  accessibilityLabel="Elegir película al azar"
                >
                  <Ionicons name="shuffle" size={17} color={colors.primaryOn} />
                  <Text style={[styles.heroRouletteBtnText, { color: colors.primaryOn }]}>
                    Al Azar
                  </Text>
                </PressableScale>
              ) : (
                <View
                  style={[
                    styles.heroScoreCard,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#fcd34d',
                    },
                  ]}
                >
                  <Ionicons name="star" size={16} color="#f59e0b" />
                  <Text style={[styles.heroScoreValue, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    {coupleAvgScore}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Barra de Búsqueda + Catálogo en Vivo */}
            <View style={[styles.quickAddCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.quickAddInputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                <TextInput
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  placeholder="Buscar o agregar peli o serie…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.quickAddInput, { color: colors.text }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleQuickAddMovie()}
                />
                {quickTitle.length > 0 && !isSearchingCatalog && (
                  <TouchableOpacity
                    onPress={() => {
                      setQuickTitle('');
                      setCatalogResults([]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ justifyContent: 'center', paddingHorizontal: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
                {isSearchingCatalog && (
                  <View style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
                <PressableScale
                  onPress={() => void handleQuickAddMovie()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: colors.primary }]}
                  scaleTo={0.92}
                  accessibilityLabel="Agregar película"
                >
                  <Ionicons name="add" size={20} color={colors.primaryOn} />
                </PressableScale>
              </View>

              {/* Selector rápido de orden (Recientes, 1.ª → Última, Mejor nota, A–Z) */}
              {catalogResults.length === 0 && (
                <View style={styles.sortBarRow}>
                  <View style={styles.sortBarLabelWrap}>
                    <Ionicons name="swap-vertical-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.sortBarLabel, { color: colors.textMuted }]}>Orden:</Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.sortChipsScroll}
                  >
                    {(
                      [
                        { id: 'recent', label: 'Recientes' },
                        { id: 'oldest', label: '1.ª → Última' },
                        ...(subTab === 'watched' ? [{ id: 'rating', label: 'Mejor nota' }] : []),
                        { id: 'alpha', label: 'A – Z' },
                      ] as Array<{ id: MovieSortMode; label: string }>
                    ).map((opt) => {
                      const active = effectiveMovieSort === opt.id;
                      return (
                        <PressableScale
                          key={opt.id}
                          onPress={() => setMovieSort(opt.id)}
                          style={[
                            styles.sortChip,
                            active
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                          ]}
                          scaleTo={0.95}
                        >
                          <Text
                            style={[
                              styles.sortChipText,
                              { color: active ? colors.primaryOn : colors.textSecondary },
                              active && { fontWeight: '800' },
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </PressableScale>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Tira Flotante de Resultados en Vivo Mientras Escribes */}
              {catalogResults.length > 0 && (
                <View style={[styles.liveCatalogOverlay, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={styles.liveCatalogHeader}>
                    <Text style={[styles.liveCatalogTitle, { color: colors.primary }]}>
                      Sugerencias del catálogo (toca para agregar):
                    </Text>
                    <TouchableOpacity onPress={() => setCatalogResults([])}>
                      <Text style={[styles.liveCatalogClose, { color: colors.textMuted }]}>Cerrar</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {catalogResults.map((item, idx) => (
                      <PressableScale
                        key={`${item.title}-${idx}`}
                        onPress={() => void handleSelectCatalogMovie(item)}
                        style={[styles.posterResultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        scaleTo={0.95}
                      >
                        <View style={styles.posterResultImgWrap}>
                          {item.posterUrl ? (
                            <Image
                              source={{ uri: optimizePosterUrl(item.posterUrl) }}
                              style={styles.posterResultImg}
                              resizeMode="cover"
                              resizeMethod="resize"
                              fadeDuration={0}
                            />
                          ) : (
                            <View
                              style={[
                                styles.posterResultImg,
                                {
                                  backgroundColor: colors.primaryLight,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                },
                              ]}
                            >
                              <Ionicons name="film-outline" size={24} color={colors.primary} />
                            </View>
                          )}
                          {item.year ? (
                            <View style={styles.posterResultYearPill}>
                              <Text style={styles.posterResultYearText}>{item.year}</Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.posterResultInfo}>
                          <Text style={[styles.posterResultName, { color: colors.text }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.posterResultMeta, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.genre}
                          </Text>
                        </View>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Lista Virtualizada de Películas */}
            <FlatList
              style={{ flex: 1 }}
              data={activeMovieList}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              contentContainerStyle={[
                styles.cardsScrollContent,
                activeMovieList.length === 0 && {
                  flexGrow: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              ListEmptyComponent={
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    paddingVertical: 20,
                  }}
                >
                  <EmptyState
                    icon={subTab === 'pending' ? 'film-outline' : 'sparkles-outline'}
                    title={
                      subTab === 'pending'
                        ? 'Cartelera por ver vacía'
                        : 'Aún no han calificado'
                    }
                    message={
                      subTab === 'pending'
                        ? 'Busca arriba el título para agregar su próxima peli con póster oficial.'
                        : 'Cuando terminen de ver una película, toquen "Calificar" para guardarla.'
                    }
                  />
                </View>
              }
              renderItem={({ item: movie }) => (
                <MovieCardItem
                  movie={movie}
                  orderNumber={subTab === 'watched' ? watchedOrderMap.get(movie.id) : undefined}
                  colors={colors}
                  isDark={isDark}
                  styles={styles}
                  getDisplayName={getDisplayName}
                  getAvatarUri={getAvatarUri}
                  onPressMovie={openRateModal}
                  onRemoveReview={handleRemoveMovieReview}
                  onDeleteMovie={handleDeleteMovie}
                />
              )}
            />
          </View>
        )}

        {/* ================= VISTA 3: LISTA DE SUEÑOS JUNTOS ================= */}
        {subTab === 'bucket' && (
          <View style={styles.contentArea}>
            {/* Hero Editorial de Progreso de Sueños */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.07)', colors.surface]
                  : [colors.primaryLight, colors.surface]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bucketHeroCard, { borderColor: colors.border }]}
            >
              <View style={styles.bucketHeroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cinemaHeroEyebrow, { color: colors.primary }]}>
                    METAS & AVENTURAS EN PAREJA
                  </Text>
                  <Text style={[styles.bucketHeroTitleSerif, { color: colors.text }]} numberOfLines={1}>
                    Nuestros Sueños
                  </Text>
                  <Text style={[styles.bucketHeroSub, { color: colors.textSecondary }]} numberOfLines={1}>
                    {state.bucketList.length === 0
                      ? 'Empiecen a escribir lo que quieren vivir'
                      : state.bucketList.length === completedBucketCount
                        ? `¡Cumplieron sus ${state.bucketList.length} sueños juntos!`
                        : `${completedBucketCount} cumplidos • ${
                            state.bucketList.length - completedBucketCount
                          } por vivir`}
                  </Text>
                </View>

                <View
                  style={[
                    styles.bucketPercentBadge,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                    },
                  ]}
                >
                  <Ionicons
                    name={bucketProgressPercent === 100 && state.bucketList.length > 0 ? 'trophy' : 'sparkles'}
                    size={13}
                    color={colors.primaryOn}
                  />
                  <Text style={[styles.bucketPercentText, { color: colors.primaryOn }]}>
                    {bucketProgressPercent}%
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.bucketProgressTrack,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' },
                ]}
              >
                <View
                  style={[
                    styles.bucketProgressFill,
                    {
                      width: `${bucketProgressPercent}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.bucketSegmentedWrap,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.72)',
                    borderColor: colors.border,
                  },
                ]}
              >
                {[
                  { id: 'all', label: `Todos (${state.bucketList.length})` },
                  { id: 'pending', label: `Por cumplir (${state.bucketList.length - completedBucketCount})` },
                  { id: 'completed', label: `Cumplidos (${completedBucketCount})` },
                ].map((f) => {
                  const active = bucketFilter === f.id;
                  return (
                    <PressableScale
                      key={f.id}
                      onPress={() => setBucketFilter(f.id as 'all' | 'pending' | 'completed')}
                      style={[
                        styles.bucketFilterPill,
                        active
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: 'transparent', borderColor: 'transparent' },
                      ]}
                      scaleTo={0.96}
                    >
                      <Text
                        style={[
                          styles.bucketFilterText,
                          active
                            ? { color: colors.primaryOn, fontWeight: '800' }
                            : { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {f.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </LinearGradient>

            {/* Input para Nuevo Sueño + Ideas rápidas */}
            <View style={[styles.quickAddCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.quickAddInputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="sparkles-outline" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                <TextInput
                  value={newBucketTitle}
                  onChangeText={setNewBucketTitle}
                  placeholder="Agregar nuevo plan o sueño juntos..."
                  placeholderTextColor={colors.textMuted}
                  style={[styles.quickAddInput, { color: colors.text }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddBucketItem()}
                />
                <PressableScale
                  onPress={() => void handleAddBucketItem()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: colors.primary }]}
                  scaleTo={0.92}
                >
                  <Ionicons name="add" size={20} color={colors.primaryOn} />
                </PressableScale>
              </View>

              {availableBucketIdeas.length > 0 && (
                <View style={styles.bucketIdeasRow}>
                  <Text style={[styles.sortBarLabel, { color: colors.textMuted }]}>Ideas:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {availableBucketIdeas.map((idea) => (
                      <PressableScale
                        key={idea}
                        onPress={() => void handleAddBucketItem(idea)}
                        style={[
                          styles.bucketIdeaChip,
                          {
                            backgroundColor: colors.primaryLight,
                            borderColor: `${colors.primary}30`,
                          },
                        ]}
                        scaleTo={0.95}
                      >
                        <Text style={[styles.bucketIdeaChipText, { color: colors.primary }]}>
                          + {idea}
                        </Text>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {filteredBucketList.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <EmptyState
                  icon="sparkles-outline"
                  title={
                    state.bucketList.length === 0
                      ? 'Sin sueños todavía'
                      : bucketFilter === 'completed'
                        ? 'Aún no marcan cumplidos'
                        : '¡Todo cumplido!'
                  }
                  message={
                    state.bucketList.length === 0
                      ? 'Escriban sus viajes, metas y planes por cumplir juntos.'
                      : 'Cambia el filtro o agreguen un nuevo plan arriba.'
                  }
                />
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 28, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredBucketList.map((item) => {
                  const creatorName = getDisplayName(item.addedBy);
                  const creatorAvatar = getAvatarUri(item.addedBy);
                  const visual = getDreamVisual(item.title);
                  const accent = item.completed ? colors.primary : visual.accent;

                  return (
                    <PressableScale
                      key={item.id}
                      onPress={() => void handleToggleBucketItem(item.id)}
                      style={[
                        styles.bucketItem,
                        {
                          backgroundColor: colors.surface,
                          borderColor: item.completed ? `${colors.primary}55` : colors.border,
                        },
                        item.completed && {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : `${colors.primaryLight}`,
                        },
                      ]}
                      scaleTo={0.985}
                    >
                      {/* Ícono temático del sueño */}
                      <View
                        style={[
                          styles.dreamIconBox,
                          {
                            backgroundColor: item.completed
                              ? colors.primary
                              : `${accent}16`,
                            borderColor: item.completed
                              ? colors.primary
                              : `${accent}35`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={(item.completed ? 'trophy' : visual.icon) as any}
                          size={19}
                          color={item.completed ? colors.primaryOn : accent}
                        />
                      </View>

                      <View style={{ flex: 1, marginHorizontal: 11 }}>
                        <View style={styles.dreamTagRow}>
                          <View
                            style={[
                              styles.dreamCategoryTag,
                              { backgroundColor: `${accent}15` },
                            ]}
                          >
                            <Text style={[styles.dreamCategoryTagText, { color: accent }]}>
                              {visual.label.toUpperCase()}
                            </Text>
                          </View>

                          {item.completed ? (
                            <View
                              style={[
                                styles.bucketDoneBadge,
                                { backgroundColor: isDark ? 'rgba(16,185,129,0.18)' : '#ecfdf5' },
                              ]}
                            >
                              <Ionicons name="checkmark-circle" size={11} color="#10b981" />
                              <Text style={[styles.bucketDoneBadgeText, { color: '#10b981' }]}>
                                {item.completedDate
                                  ? `Cumplido · ${formatDisplayDate(item.completedDate, {
                                      day: 'numeric',
                                      month: 'short',
                                    })}`
                                  : '¡Cumplido!'}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.bucketTitle,
                            { color: colors.text },
                            item.completed && { opacity: 0.78 },
                          ]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>

                        <View style={styles.bucketMetaRow}>
                          <MiniAvatar
                            uri={creatorAvatar}
                            name={creatorName}
                            size={15}
                            bgColor={colors.primaryLight}
                            textColor={colors.primary}
                          />
                          <Text style={[styles.bucketMeta, { color: colors.textMuted }]}>
                            Propuesto por {creatorName}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.dreamRightActions}>
                        <View
                          style={[
                            styles.checkboxCircle,
                            {
                              borderColor: item.completed ? colors.primary : `${accent}60`,
                              backgroundColor: item.completed ? colors.primary : colors.surfaceAlt,
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color={item.completed ? colors.primaryOn : colors.textMuted}
                          />
                        </View>
                        <TouchableOpacity
                          onPress={(e: any) => {
                            e?.stopPropagation?.();
                            void handleDeleteBucketItem(item.id);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={[styles.cardIconActionBtn, { backgroundColor: colors.surfaceAlt }]}
                          accessibilityLabel="Eliminar sueño"
                        >
                          <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* ================= VISTA 4: RULETA DE COMIDA ================= */}
        {subTab === 'roulette' && (
          <ScrollView
            ref={rouletteScrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.foodWheelCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.06)', colors.surface]
                    : [colors.primaryLight, colors.surface]
                }
                style={styles.foodStageHeader}
              >
                <View style={[styles.pochitoStageHalo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <PochitoBear
                    mood="feliz"
                    size="md"
                    accessory={petMeta.accessory}
                    isAnimated={true}
                    isTickled={Boolean(selectedFoodResult) && !isSpinning}
                  />
                </View>
                <Text style={[styles.foodWheelTitle, { color: colors.text }]}>
                  ¿Qué Comemos Hoy?
                </Text>
                <Text style={[styles.foodWheelSub, { color: colors.textSecondary }]}>
                  {selectedFoodResult && !isSpinning
                    ? `¡${petMeta.name} eligió su platillo ganador! 😋`
                    : `${petMeta.name} gira la ruleta gastronómica por ustedes`}
                </Text>
              </LinearGradient>

              <View
                style={[
                  styles.foodResultBox,
                  {
                    borderColor: selectedFoodResult ? colors.primary : colors.border,
                    backgroundColor: selectedFoodResult ? colors.primaryLight : colors.surfaceAlt,
                  },
                ]}
              >
                <Text style={[styles.foodResultLabel, { color: colors.textMuted }]}>
                  {selectedFoodResult ? 'ANTOJO GANADOR DE HOY' : 'LISTO PARA DECIDIR'}
                </Text>
                <Text
                  style={[
                    styles.foodResultValue,
                    { color: selectedFoodResult ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {selectedFoodResult || 'Presiona girar abajo'}
                </Text>
              </View>

              <PressableScale
                onPress={handleSpinFoodWheel}
                disabled={isSpinning || state.foodOptions.length === 0}
                style={[
                  styles.spinWheelBtn,
                  {
                    backgroundColor: state.foodOptions.length === 0 ? colors.border : colors.primary,
                  },
                ]}
                scaleTo={0.96}
              >
                <Ionicons name="sync" size={18} color={colors.primaryOn} />
                <Text style={[styles.spinWheelBtnText, { color: colors.primaryOn }]}>
                  {isSpinning ? 'Eligiendo antojo...' : 'Girar Ruleta de Comida'}
                </Text>
              </PressableScale>
            </View>

            {/* Panel de Antojos en Cuadrícula */}
            <View style={[styles.foodMenuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.foodMenuHeader}>
                <Text style={[styles.foodMenuTitle, { color: colors.text }]}>
                  Opciones en la Ruleta ({state.foodOptions.length})
                </Text>
                <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
              </View>

              <View style={[styles.quickAddInputRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <Ionicons name="add-circle-outline" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                <TextInput
                  value={newFoodOption}
                  onChangeText={setNewFoodOption}
                  onFocus={() => setTimeout(() => rouletteScrollRef.current?.scrollToEnd({ animated: true }), 180)}
                  placeholder="Agregar antojo (ej. Ramen, Crepas...)"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.quickAddInput, { color: colors.text }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddFoodOption()}
                />
                <PressableScale
                  onPress={() => void handleAddFoodOption()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: colors.primary }]}
                  scaleTo={0.92}
                >
                  <Ionicons name="add" size={20} color={colors.primaryOn} />
                </PressableScale>
              </View>

              {availableFoodSuggestions.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, marginTop: 10 }}
                >
                  {availableFoodSuggestions.map((sug) => (
                    <PressableScale
                      key={sug}
                      onPress={() => void handleAddFoodOption(sug)}
                      style={[
                        styles.foodPresetChip,
                        { backgroundColor: colors.primaryLight, borderColor: colors.border },
                      ]}
                      scaleTo={0.94}
                    >
                      <Text style={[styles.foodPresetText, { color: colors.primary }]}>+ {sug}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              )}

              <View style={styles.foodOptionsWrapGrid}>
                {state.foodOptions.map((opt) => {
                  const isWinner = selectedFoodResult === opt && !isSpinning;
                  return (
                    <View
                      key={opt}
                      style={[
                        styles.foodChip,
                        {
                          backgroundColor: isWinner ? colors.primaryLight : colors.surfaceAlt,
                          borderColor: isWinner ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.foodChipText,
                          { color: isWinner ? colors.primary : colors.text },
                          isWinner && { fontWeight: '800' },
                        ]}
                      >
                        {opt}
                      </Text>
                      <TouchableOpacity
                        onPress={() => void handleRemoveFoodOption(opt)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close-circle" size={15} color={isWinner ? colors.primary : colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* ================= MODAL: RULETA SPOTLIGHT DE PELÍCULA ================= */}
      <Modal
        visible={Boolean(rouletteMovie)}
        transparent
        animationType="fade"
        onRequestClose={() => setRouletteMovie(null)}
      >
        <View style={styles.modalOverlay}>
          {rouletteMovie && (
            <View style={[styles.rouletteModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.rouletteModalTopBar}>
                <View style={[styles.rouletteEyebrowPill, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="shuffle" size={13} color={colors.primary} />
                  <Text style={[styles.rouletteEyebrowText, { color: colors.primary }]}>
                    FUNCIÓN ELEGIDA AL AZAR
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRouletteMovie(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginTop: 8 }}>
                {rouletteMovie.posterUrl ? (
                  <Image
                    source={{ uri: optimizePosterUrl(rouletteMovie.posterUrl) }}
                    style={styles.roulettePosterLarge}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={[colors.primaryLight, colors.surfaceAlt]}
                    style={styles.roulettePosterLarge}
                  >
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                      <Ionicons name="film" size={42} color={colors.primary} />
                    </View>
                  </LinearGradient>
                )}

                <Text style={[styles.rouletteMovieTitle, { color: colors.text }]} numberOfLines={2}>
                  {rouletteMovie.title}
                </Text>

                <View style={styles.rouletteMetaRow}>
                  <View style={[styles.genreBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.genreBadgeText, { color: colors.primary }]}>
                      {rouletteMovie.genre}
                    </Text>
                  </View>
                  {rouletteMovie.year ? (
                    <Text style={[styles.rouletteMetaText, { color: colors.textSecondary }]}>
                      {rouletteMovie.year}
                    </Text>
                  ) : null}
                  <Text style={[styles.rouletteMetaText, { color: colors.textMuted }]}>
                    • De {getDisplayName(rouletteMovie.addedBy)}
                  </Text>
                </View>

                {rouletteMovie.synopsis ? (
                  <View style={[styles.synopsisBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, marginTop: 12, width: '100%' }]}>
                    <Text style={[styles.synopsisText, { color: colors.textSecondary }]} numberOfLines={4}>
                      {rouletteMovie.synopsis}
                    </Text>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => {
                  const chosen = rouletteMovie;
                  setRouletteMovie(null);
                  openRateModal(chosen);
                }}
                style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              >
                <Ionicons name="star" size={17} color={colors.primaryOn} />
                <Text style={[styles.modalPrimaryBtnText, { color: colors.primaryOn }]}>
                  ¡Ver y Calificar!
                </Text>
              </TouchableOpacity>

              <View style={styles.rouletteSecondaryRow}>
                {pendingMovies.length > 1 && (
                  <TouchableOpacity
                    onPress={handleSpinMovieRoulette}
                    style={[styles.modalSecondaryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, flex: 1 }]}
                  >
                    <Ionicons name="shuffle" size={16} color={colors.text} />
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.text }]}>
                      Girar otra vez
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setRouletteMovie(null)}
                  style={[styles.modalSecondaryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                >
                  <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* ================= MODAL: DETALLE Y CALIFICACIÓN DE PELÍCULA ================= */}
      <Modal
        visible={Boolean(selectedMovie)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMovie(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: '90%' }]}>
            {selectedMovie && (
              <ScrollView
                ref={rateMovieScrollRef}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  {selectedMovie.posterUrl ? (
                    <Image
                      source={{ uri: optimizePosterUrl(selectedMovie.posterUrl) }}
                      style={styles.modalPosterThumb}
                      resizeMode="cover"
                      resizeMethod="resize"
                    />
                  ) : (
                    <LinearGradient
                      colors={[colors.primaryLight, colors.surfaceAlt]}
                      style={[styles.modalPosterThumb, { alignItems: 'center', justifyContent: 'center' }]}
                    >
                      <Ionicons name="film" size={26} color={colors.primary} />
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.modalMetaBadgesRow}>
                      <View style={[styles.genreBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.genreBadgeText, { color: colors.primary }]}>
                          {selectedMovie.genre}
                        </Text>
                      </View>
                      {selectedMovie.year ? (
                        <Text style={[styles.modalYearTag, { color: colors.textMuted }]}>
                          {selectedMovie.year}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                      {selectedMovie.title}
                    </Text>
                    {selectedMovie.director ? (
                      <Text style={[styles.modalDirectorText, { color: colors.textMuted }]} numberOfLines={1}>
                        Dir. {selectedMovie.director}
                      </Text>
                    ) : null}
                    <View style={[styles.modalProposerRow]}>
                      <MiniAvatar
                        uri={getAvatarUri(selectedMovie.addedBy)}
                        name={getDisplayName(selectedMovie.addedBy)}
                        size={16}
                        bgColor={colors.primaryLight}
                        textColor={colors.primary}
                      />
                      <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                        Propuesta por {getDisplayName(selectedMovie.addedBy)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedMovie(null)}
                    style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceAlt }]}
                  >
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {selectedMovie.synopsis ? (
                  <View style={[styles.synopsisBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                    <Text style={[styles.synopsisLabel, { color: colors.textMuted }]}>SINOPSIS</Text>
                    <Text style={[styles.synopsisText, { color: colors.textSecondary }]}>
                      {selectedMovie.synopsis}
                    </Text>
                  </View>
                ) : null}

                {selectedMovie.watchedDate ? (
                  <View style={styles.modalWatchedDateBanner}>
                    <Ionicons name="calendar-outline" size={13} color={colors.primary} />
                    <Text style={[styles.modalWatchedDateText, { color: colors.textSecondary }]}>
                      Vista juntos el {formatDisplayDate(selectedMovie.watchedDate)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalRatingsContainer}>
                  <View
                    style={[
                      styles.partnerRatingCard,
                      {
                        backgroundColor: isDark ? 'rgba(219, 39, 119, 0.12)' : '#fdf2f8',
                        borderColor: isDark ? 'rgba(244, 114, 182, 0.25)' : '#fbcfe8',
                      },
                    ]}
                  >
                    <View style={styles.partnerRatingHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MiniAvatar
                          uri={getAvatarUri('Karla')}
                          name={getDisplayName('Karla')}
                          size={24}
                          bgColor="#fbcfe8"
                          textColor="#be185d"
                        />
                        <Text style={[styles.partnerRatingName, { color: colors.text }]}>
                          {getDisplayName('Karla')}
                        </Text>
                      </View>
                      <Text style={[styles.partnerRatingValue, { color: isDark ? '#f472b6' : '#be185d' }]}>
                        {tempRatingKarla}/5 ★
                      </Text>
                    </View>
                    <View style={styles.starsPickerRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setTempRatingKarla(star)}>
                          <Ionicons
                            name={star <= tempRatingKarla ? 'star' : 'star-outline'}
                            size={28}
                            color={isDark ? '#f472b6' : '#db2777'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.partnerRatingCard,
                      {
                        backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : '#f0f9ff',
                        borderColor: isDark ? 'rgba(56, 189, 248, 0.25)' : '#bae6fd',
                      },
                    ]}
                  >
                    <View style={styles.partnerRatingHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MiniAvatar
                          uri={getAvatarUri('Javier')}
                          name={getDisplayName('Javier')}
                          size={24}
                          bgColor="#bae6fd"
                          textColor="#0369a1"
                        />
                        <Text style={[styles.partnerRatingName, { color: colors.text }]}>
                          {getDisplayName('Javier')}
                        </Text>
                      </View>
                      <Text style={[styles.partnerRatingValue, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                        {tempRatingJavier}/5 ★
                      </Text>
                    </View>
                    <View style={styles.starsPickerRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity key={star} onPress={() => setTempRatingJavier(star)}>
                          <Ionicons
                            name={star <= tempRatingJavier ? 'star' : 'star-outline'}
                            size={28}
                            color={isDark ? '#38bdf8' : '#0284c7'}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.modalLiveAvgBanner,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#fcd34d',
                    },
                  ]}
                >
                  <Ionicons name="star" size={15} color="#f59e0b" />
                  <Text style={[styles.modalLiveAvgText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    Calificación de pareja: {((tempRatingKarla + tempRatingJavier) / 2).toFixed(1)} ★
                  </Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Nuestra reseña o momento favorito
                </Text>
                <TextInput
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  onFocus={() => setTimeout(() => rateMovieScrollRef.current?.scrollToEnd({ animated: true }), 180)}
                  placeholder="¿Qué les pareció o cómo la pasaron viéndola?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />

                <TouchableOpacity
                  onPress={() => void handleSaveMovieRating()}
                  style={[styles.modalPrimaryBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.primaryOn} />
                  <Text style={[styles.modalPrimaryBtnText, { color: colors.primaryOn }]}>
                    Guardar Reseña
                  </Text>
                </TouchableOpacity>

                <View style={styles.modalFooterActions}>
                  {selectedMovie.watched && (
                    <TouchableOpacity
                      onPress={() => handleRemoveMovieReview(selectedMovie)}
                      style={[
                        styles.modalSecondaryBtn,
                        {
                          backgroundColor: isDark ? 'rgba(225, 29, 72, 0.14)' : '#fff1f2',
                          borderColor: isDark ? 'rgba(225, 29, 72, 0.3)' : '#fecdd3',
                          flex: 1,
                        },
                      ]}
                    >
                      <Ionicons name="arrow-undo-outline" size={15} color="#e11d48" />
                      <Text style={[styles.modalSecondaryBtnText, { color: '#e11d48' }]}>
                        Volver a Por Ver
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleDeleteMovie(selectedMovie)}
                    style={[
                      styles.modalSecondaryBtn,
                      {
                        backgroundColor: colors.surfaceAlt,
                        borderColor: colors.border,
                        flex: selectedMovie.watched ? 0 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.textSecondary }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  tabsWrapper: {
    marginBottom: 8,
  },
  equalTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    gap: 4,
  },
  equalTabBtn: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 1,
  },
  tabBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  equalTabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: c.textSecondary,
  },
  contentArea: {
    flex: 1,
  },
  cinemaHeroBanner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cinemaHeroEyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  cinemaHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  cinemaStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cinemaStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
    borderWidth: 1,
  },
  cinemaStatText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  heroRouletteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 2,
  },
  heroRouletteBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 13,
    borderWidth: 1,
  },
  heroScoreValue: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: SERIF_FONT,
  },
  quickAddCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
    zIndex: 30,
  },
  quickAddInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  quickAddInput: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 13.5,
    color: c.text,
  },
  quickAddSubmitBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveCatalogOverlay: {
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  liveCatalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveCatalogTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  liveCatalogClose: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  posterResultCard: {
    width: 104,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterResultImgWrap: {
    position: 'relative',
    width: '100%',
    height: 122,
  },
  posterResultImg: {
    width: '100%',
    height: '100%',
  },
  posterResultYearPill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  posterResultYearText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  posterResultInfo: {
    padding: 6,
  },
  posterResultName: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text,
  },
  posterResultMeta: {
    fontSize: 9.5,
    color: c.textSecondary,
    marginTop: 2,
  },
  cardsScrollContent: {
    gap: 10,
    paddingBottom: 120,
    paddingTop: 2,
    paddingHorizontal: 1,
  },
  watchedReviewSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  movieRatingPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  miniRatingText: {
    fontSize: 11,
    fontWeight: '800',
  },
  movieNotesQuoteBox: {
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  movieCard: {
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  movieCardTop: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  posterFrame: {
    position: 'relative',
    width: 68,
    height: 100,
    marginRight: 12,
  },
  movieCardPoster: {
    width: 68,
    height: 100,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  moviePosterPlaceholder: {
    width: 68,
    height: 100,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  posterPlaceholderTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  posterYearPill: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  posterYearText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  genreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  genreBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  proposerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addedByText: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: '700',
  },
  movieTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
    lineHeight: 20,
  },
  movieDirectorText: {
    fontSize: 11,
    color: c.textMuted,
    marginTop: 2,
  },
  movieSynopsisPreview: {
    fontSize: 11.5,
    lineHeight: 15.5,
    marginTop: 4,
  },
  watchedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  watchedDateText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  movieNotesInline: {
    fontSize: 11.5,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  cardRightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 6,
  },
  cardIconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  avgBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  markWatchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  markWatchedText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderNumPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderNumText: {
    fontSize: 10,
    fontWeight: '900',
  },
  sortBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sortBarLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortChipsScroll: {
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bucketHeroCard: {
    borderRadius: 22,
    padding: 15,
    borderWidth: 1,
    marginBottom: 8,
    gap: 11,
  },
  bucketHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bucketHeroTitleSerif: {
    fontSize: 21,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  bucketHeroSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  bucketPercentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  bucketPercentText: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  bucketProgressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
  },
  bucketProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  bucketSegmentedWrap: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  bucketFilterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  bucketFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bucketIdeasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  bucketIdeaChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  bucketIdeaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dreamIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  dreamCategoryTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dreamCategoryTagText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dreamRightActions: {
    alignItems: 'center',
    gap: 8,
  },
  checkboxCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.8,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketTitle: {
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: c.text,
  },
  bucketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  bucketMeta: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
  },
  bucketDoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
  },
  bucketDoneBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  foodWheelCard: {
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  foodStageHeader: {
    width: '100%' as const,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pochitoStageHalo: {
    padding: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 4,
  },
  foodWheelTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
    marginTop: 6,
  },
  foodWheelSub: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 3,
    textAlign: 'center',
  },
  foodResultBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  foodResultLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: c.textSecondary,
    letterSpacing: 1,
  },
  foodResultValue: {
    fontSize: 21,
    fontWeight: '900',
    fontFamily: SERIF_FONT,
    marginTop: 4,
    textAlign: 'center',
  },
  spinWheelBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  spinWheelBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.primaryOn,
  },
  foodMenuCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
  },
  foodMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  foodMenuTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  foodPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  foodPresetText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  foodOptionsWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: c.border,
  },
  foodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  rouletteModalCard: {
    width: '100%',
    maxWidth: 370,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  rouletteModalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rouletteEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rouletteEyebrowText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  roulettePosterLarge: {
    width: 140,
    height: 204,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  rouletteMovieTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    textAlign: 'center',
  },
  rouletteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rouletteMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rouletteSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  modalPosterThumb: {
    width: 72,
    height: 106,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
  },
  modalMetaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  modalYearTag: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  modalDirectorText: {
    fontSize: 11.5,
    color: c.textMuted,
    marginTop: 2,
  },
  modalProposerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: c.textSecondary,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  synopsisBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
    marginBottom: 10,
  },
  synopsisLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  synopsisText: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalWatchedDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  modalWatchedDateText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  modalRatingsContainer: {
    gap: 8,
    marginBottom: 10,
  },
  partnerRatingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 11,
  },
  partnerRatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  partnerRatingName: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  partnerRatingValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  starsPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  modalLiveAvgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  modalLiveAvgText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    minHeight: 74,
    color: c.text,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.primaryOn,
  },
  modalFooterActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
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
import { MovieItem, BucketItem, MoviesAndPlansState } from '../types';
import {
  getMoviesState,
  saveMoviesState,
  DEFAULT_MOVIES_STATE,
} from '../services/CoupleSyncService';
import { toLocalDateString, formatDisplayDate } from '../services/StorageService';
import { supabase } from '../config/supabase';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

const GENRES = [
  'Romance',
  'Comedia',
  'Terror',
  'Animación',
  'Serie',
  'Acción',
  'Drama',
  'Ciencia Ficción',
];

type SubTab = 'pending' | 'watched' | 'bucket' | 'roulette';

export const MoviesScreen: React.FC = () => {
  const { colors, isDark, primaryColor } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { profile } = useProfile();
  const currentProfile = profile || 'Karla';

  const [state, setState] = useState<MoviesAndPlansState>(DEFAULT_MOVIES_STATE);
  const [subTab, setSubTab] = useState<SubTab>('pending');

  // Paginación para evitar el scroll vertical
  const [moviePage, setMoviePage] = useState(0);
  const [bucketPage, setBucketPage] = useState(0);
  const tabsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    tabsScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, []);

  // Entrada Rápida de Película con autocompletado en vivo mientras escribes
  const [quickTitle, setQuickTitle] = useState('');
  const [quickGenre, setQuickGenre] = useState<string | null>(null);
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

  const loadData = useCallback(async () => {
    const loaded = await getMoviesState();
    setState(loaded);
  }, []);

  useEffect(() => {
    void loadData();

    const channel = supabase
      .channel('kmrg-movies-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload.new?.type === 'sync_movies_state' && payload.new?.payload) {
            setState((prev) => ({ ...prev, ...payload.new.payload }));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  const updateAndSync = async (nextState: MoviesAndPlansState) => {
    setState(nextState);
    await saveMoviesState(currentProfile, nextState);
  };

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
        const tmdbKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
        let mapped: any[] = [];

        if (tmdbKey) {
          try {
            const tmdbRes = await fetch(
              `https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(q)}&language=es-MX`
            );
            const tmdbData = await tmdbRes.json();
            if (Array.isArray(tmdbData?.results) && tmdbData.results.length > 0) {
              mapped = tmdbData.results.slice(0, 6).map((r: any) => ({
                title: r.title || r.name || q,
                year: r.release_date || r.first_air_date ? String(r.release_date || r.first_air_date).slice(0, 4) : '',
                director: '',
                genre: quickGenre || (r.media_type === 'tv' ? 'Serie' : 'Película'),
                posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '',
                synopsis: r.overview || '',
              }));
            }
          } catch {
            // fallback a iTunes si falla TMDB
          }
        }

        if (mapped.length === 0) {
          const response = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=6&country=mx`
          );
          const data = await response.json();
          if (Array.isArray(data?.results)) {
            mapped = data.results.map((r: any) => ({
              title: r.trackName || q,
              year: r.releaseDate ? String(r.releaseDate).slice(0, 4) : '',
              director: r.artistName || '',
              genre: quickGenre || r.primaryGenreName || 'Película',
              posterUrl: r.artworkUrl100
                ? String(r.artworkUrl100).replace('100x100bb', '600x900bb')
                : '',
              synopsis: r.longDescription || r.shortDescription || '',
            }));
          }
        }

        if (!cancelled) {
          setCatalogResults(mapped);
        }
      } catch {
        if (!cancelled) setCatalogResults([]);
      } finally {
        if (!cancelled) setIsSearchingCatalog(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quickTitle, quickGenre]);

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
      genre: quickGenre || found.genre || 'Película',
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
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(rawTitle)}&media=movie&entity=movie&limit=1&country=mx`
        );
        const data = await response.json();
        if (Array.isArray(data?.results) && data.results.length > 0) {
          const r = data.results[0];
          posterUrl = r.artworkUrl100
            ? String(r.artworkUrl100).replace('100x100bb', '600x900bb')
            : undefined;
          year = r.releaseDate ? String(r.releaseDate).slice(0, 4) : undefined;
          director = r.artistName || undefined;
          synopsis = r.longDescription || r.shortDescription || undefined;
        }
      } catch {
        // Fallback gracefully without throwing
      }
    }

    const item: MovieItem = {
      id: `mov-${Date.now()}`,
      title: rawTitle,
      genre: quickGenre || 'Película',
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
        'No hay películas pendientes',
        'Agreguen películas a su lista de "Por Ver" para elegir una al azar.'
      );
      return;
    }
    const picked = pending[Math.floor(Math.random() * pending.length)];
    Alert.alert(
      'Película Elegida al Azar',
      `Hoy toca ver: "${picked.title}" (${picked.genre})`,
      [
        { text: 'Cerrar', style: 'cancel' },
        { text: 'Calificar ahora', onPress: () => openRateModal(picked) },
      ]
    );
  };

  // --- Funciones para Bucket List ---
  const handleAddBucketItem = async () => {
    if (!newBucketTitle.trim()) return;
    const item: BucketItem = {
      id: `b-${Date.now()}`,
      title: newBucketTitle.trim(),
      completed: false,
      addedBy: currentProfile,
    };
    await updateAndSync({
      ...state,
      bucketList: [item, ...state.bucketList],
    });
    setNewBucketTitle('');
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

  const handleAddFoodOption = async () => {
    if (!newFoodOption.trim()) return;
    await updateAndSync({
      ...state,
      foodOptions: [...state.foodOptions, newFoodOption.trim()],
    });
    setNewFoodOption('');
  };

  const handleRemoveFoodOption = async (opt: string) => {
    await updateAndSync({
      ...state,
      foodOptions: state.foodOptions.filter((o) => o !== opt),
    });
  };

  const pendingMovies = state.movies.filter((m) => !m.watched);
  const watchedMovies = state.movies.filter((m) => m.watched);
  const completedBucketCount = state.bucketList.filter((b) => b.completed).length;

  const activeMovieList = subTab === 'watched' ? watchedMovies : pendingMovies;
  const MOVIES_PER_PAGE = 3;
  const totalMoviePages = Math.max(1, Math.ceil(activeMovieList.length / MOVIES_PER_PAGE));
  const safeMoviePage = Math.min(moviePage, totalMoviePages - 1);
  const visibleMovies = activeMovieList.slice(
    safeMoviePage * MOVIES_PER_PAGE,
    (safeMoviePage + 1) * MOVIES_PER_PAGE
  );

  const BUCKET_PER_PAGE = 4;
  const totalBucketPages = Math.max(1, Math.ceil(state.bucketList.length / BUCKET_PER_PAGE));
  const safeBucketPage = Math.min(bucketPage, totalBucketPages - 1);
  const visibleBuckets = state.bucketList.slice(
    safeBucketPage * BUCKET_PER_PAGE,
    (safeBucketPage + 1) * BUCKET_PER_PAGE
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppHeader />

      {/* Contenedor Fijo SIN Scroll Vertical */}
      <View style={styles.fixedViewport}>
        {/* Selector de 4 Sub-Pestañas Segmentadas */}
        <View style={styles.tabsWrapper}>
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {[
              { id: 'pending', label: `Por Ver (${pendingMovies.length})`, icon: 'film-outline' },
              { id: 'watched', label: `Vistas (${watchedMovies.length})`, icon: 'star-outline' },
              {
                id: 'bucket',
                label: `Sueños (${completedBucketCount}/${state.bucketList.length})`,
                icon: 'sparkles-outline',
              },
              { id: 'roulette', label: 'Comida', icon: 'restaurant-outline' },
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
                    styles.tabBtn,
                    active
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                  scaleTo={0.96}
                >
                  <Ionicons
                    name={t.icon as any}
                    size={13}
                    color={active ? colors.primaryOn : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.tabBtnText,
                      active
                        ? { color: colors.primaryOn, fontWeight: '800' }
                        : { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {t.label}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>

        {/* ================= VISTAS 1 Y 2: PELÍCULAS POR VER / YA VISTAS ================= */}
        {(subTab === 'pending' || subTab === 'watched') && (
          <View style={styles.contentArea}>
            {/* Barra Superior Rápida con Autocompletado Mientras Escribes */}
            <View style={[styles.quickAddCard, { borderColor: colors.border }]}>
              <View style={styles.quickAddInputRow}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
                <TextInput
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  placeholder="Buscar película o serie…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.quickAddInput, { color: colors.text }]}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleQuickAddMovie()}
                />
                {isSearchingCatalog && (
                  <View style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
                <PressableScale
                  onPress={handleSpinMovieRoulette}
                  style={[
                    styles.quickAddSubmitBtn,
                    { backgroundColor: colors.primaryLight },
                  ]}
                  scaleTo={0.92}
                  accessibilityLabel="Elegir película al azar"
                >
                  <Ionicons name="shuffle" size={18} color={colors.primary} />
                </PressableScale>
                <PressableScale
                  onPress={() => void handleQuickAddMovie()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: colors.primary }]}
                  scaleTo={0.92}
                  accessibilityLabel="Agregar película"
                >
                  <Ionicons name="add" size={20} color={colors.primaryOn} />
                </PressableScale>
              </View>

              {/* Chips Horizontales de Género */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genresScroll}
              >
                {GENRES.map((g) => {
                  const active = quickGenre === g;
                  return (
                    <PressableScale
                      key={g}
                      onPress={() => setQuickGenre((prev) => (prev === g ? null : g))}
                      style={[
                        styles.quickGenreChip,
                        active
                          ? {
                              backgroundColor: colors.primaryLight,
                              borderColor: colors.primary,
                            }
                          : {
                              backgroundColor: colors.surfaceAlt,
                              borderColor: colors.border,
                            },
                      ]}
                      scaleTo={0.95}
                    >
                      <Text
                        style={[
                          styles.quickGenreText,
                          active
                            ? { color: colors.primary, fontWeight: '800' }
                            : { color: colors.textSecondary },
                        ]}
                      >
                        {g}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>

              {/* Tira Flotante de Resultados en Vivo Mientras Escribes */}
              {catalogResults.length > 0 && (
                <View style={styles.liveCatalogOverlay}>
                  <View style={styles.liveCatalogHeader}>
                    <Text style={[styles.liveCatalogTitle, { color: colors.primary }]}>
                      Resultados en vivo (toca uno para agregar):
                    </Text>
                    <TouchableOpacity onPress={() => setCatalogResults([])}>
                      <Text style={styles.liveCatalogClose}>Cerrar</Text>
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
                        style={styles.posterResultCard}
                        scaleTo={0.95}
                      >
                        {item.posterUrl ? (
                          <Image
                            source={{ uri: item.posterUrl }}
                            style={styles.posterResultImg}
                            resizeMode="cover"
                          />
                        ) : null}
                        <Text style={styles.posterResultName} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.posterResultMeta} numberOfLines={1}>
                          {item.year} • {item.genre}
                        </Text>
                      </PressableScale>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Lista Desplazable de Películas (Tarjetas Completas Sin Cortes) */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.cardsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {activeMovieList.length === 0 ? (
                <EmptyState
                  icon={subTab === 'pending' ? 'film-outline' : 'sparkles-outline'}
                  title={subTab === 'pending' ? 'Sin películas pendientes' : 'Aún no han calificado'}
                  message={
                    subTab === 'pending'
                      ? 'Escribe arriba el título para agregar su próxima peli juntos con póster oficial.'
                      : 'Cuando terminen de ver una película, toquen "Calificar" para guardarla.'
                  }
                />
              ) : (
                activeMovieList.map((movie) => {
                  const avg =
                    movie.ratingJavier && movie.ratingKarla
                      ? ((movie.ratingJavier + movie.ratingKarla) / 2).toFixed(1)
                      : null;

                  return (
                    <PressableScale
                      key={movie.id}
                      onPress={() => openRateModal(movie)}
                      style={[styles.movieCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      scaleTo={0.98}
                    >
                      <View style={styles.movieCardTop}>
                        {movie.posterUrl ? (
                          <Image
                            source={{ uri: movie.posterUrl }}
                            style={styles.movieCardPoster}
                            resizeMode="cover"
                          />
                        ) : (
                          <LinearGradient
                            colors={[colors.primaryLight, colors.surfaceAlt]}
                            style={styles.moviePosterPlaceholder}
                          >
                            <Ionicons name="film" size={22} color={colors.primary} />
                            <Text
                              style={[styles.posterPlaceholderTitle, { color: colors.primary }]}
                              numberOfLines={2}
                            >
                              {movie.title}
                            </Text>
                          </LinearGradient>
                        )}

                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <View style={styles.genreRow}>
                            <View
                              style={[
                                styles.genreBadge,
                                { backgroundColor: colors.primaryLight },
                              ]}
                            >
                              <Text
                                style={[styles.genreBadgeText, { color: colors.primary }]}
                                numberOfLines={1}
                              >
                                {movie.genre}
                              </Text>
                            </View>
                            <Text style={styles.addedByText} numberOfLines={1}>
                              {movie.year ? `${movie.year} • ` : ''}Por{' '}
                              {movie.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                            </Text>
                          </View>
                          <Text style={[styles.movieTitle, { color: colors.text }]} numberOfLines={2}>
                            {movie.title}
                          </Text>
                          {movie.watched && (movie.ratingKarla || movie.ratingJavier) ? (
                            <View style={styles.movieRatingPillsRow}>
                              {movie.ratingKarla && (
                                <View style={[styles.miniRatingPill, { backgroundColor: '#f3e8ff' }]}>
                                  <Text style={[styles.miniRatingText, { color: '#9333ea' }]}>
                                    Karlita: ★ {movie.ratingKarla}
                                  </Text>
                                </View>
                              )}
                              {movie.ratingJavier && (
                                <View style={[styles.miniRatingPill, { backgroundColor: '#e0f2fe' }]}>
                                  <Text style={[styles.miniRatingText, { color: '#0284c7' }]}>
                                    Javier: ★ {movie.ratingJavier}
                                  </Text>
                                </View>
                              )}
                            </View>
                          ) : movie.notes ? (
                            <Text style={[styles.movieNotesInline, { color: colors.textSecondary }]} numberOfLines={2}>
                              “{movie.notes}”
                            </Text>
                          ) : movie.director ? (
                            <Text style={[styles.movieDirectorText, { color: colors.textMuted }]} numberOfLines={1}>
                              Dir. {movie.director}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.cardRightActions}>
                          {movie.watched && avg ? (
                            <View style={[styles.avgBadge, { backgroundColor: colors.primary }]}>
                              <Ionicons name="star" size={13} color={colors.primaryOn} />
                              <Text style={[styles.avgBadgeText, { color: colors.primaryOn }]}>
                                {avg}
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => openRateModal(movie)}
                              style={[
                                styles.markWatchedBtn,
                                {
                                  borderColor: colors.primary,
                                  backgroundColor: colors.primaryLight,
                                },
                              ]}
                            >
                              <Ionicons name="star" size={13} color={colors.primary} />
                              <Text style={[styles.markWatchedText, { color: colors.primary }]}>
                                Calificar
                              </Text>
                            </TouchableOpacity>
                          )}

                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                            {movie.watched && (
                              <TouchableOpacity
                                onPress={() => handleRemoveMovieReview(movie)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Ionicons name="arrow-undo-outline" size={16} color="#e11d48" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleDeleteMovie(movie)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </PressableScale>
                  );
                })
              )}
            </ScrollView>
          </View>
        )}

        {/* ================= VISTA 3: LISTA DE SUEÑOS SIN SCROLL ================= */}
        {subTab === 'bucket' && (
          <View style={styles.contentArea}>
            <View style={styles.quickAddCard}>
              <View style={styles.quickAddInputRow}>
                <TextInput
                  value={newBucketTitle}
                  onChangeText={setNewBucketTitle}
                  placeholder="Agregar nuevo plan o sueño juntos..."
                  placeholderTextColor="#94a3b8"
                  style={styles.quickAddInput}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddBucketItem()}
                />
                <TouchableOpacity
                  onPress={() => void handleAddBucketItem()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardsDeck}>
              {visibleBuckets.length === 0 ? (
                <EmptyState
                  icon="sparkles-outline"
                  title="Sin sueños todavía"
                  message="Escriban sus viajes, metas y planes por cumplir juntos."
                />
              ) : (
                visibleBuckets.map((item) => (
                  <PressableScale
                    key={item.id}
                    onPress={() => void handleToggleBucketItem(item.id)}
                    style={[styles.bucketItem, item.completed && styles.bucketItemCompleted]}
                    scaleTo={0.98}
                  >
                    <View
                      style={[
                        styles.checkboxCircle,
                        item.completed && {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      {item.completed && <Ionicons name="checkmark" size={14} color={colors.primaryOn} />}
                    </View>
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text
                        style={[
                          styles.bucketTitle,
                          item.completed && styles.bucketTitleCompleted,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.bucketMeta}>
                        Por {item.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                        {item.completedDate ? ' • Cumplido' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => void handleDeleteBucketItem(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </PressableScale>
                ))
              )}
            </View>

            {totalBucketPages > 1 && (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  disabled={safeBucketPage === 0}
                  onPress={() => setBucketPage((p) => Math.max(0, p - 1))}
                  style={[styles.pageBtn, safeBucketPage === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={15} color="#1e293b" />
                  <Text style={styles.pageBtnText}>Anterior</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Página {safeBucketPage + 1} de {totalBucketPages}
                </Text>
                <TouchableOpacity
                  disabled={safeBucketPage >= totalBucketPages - 1}
                  onPress={() => setBucketPage((p) => Math.min(totalBucketPages - 1, p + 1))}
                  style={[
                    styles.pageBtn,
                    safeBucketPage >= totalBucketPages - 1 && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.pageBtnText}>Siguiente</Text>
                  <Ionicons name="chevron-forward" size={15} color="#1e293b" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ================= VISTA 4: RULETA DE COMIDA SIN SCROLL ================= */}
        {subTab === 'roulette' && (
          <View style={styles.foodWheelCard}>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="restaurant" size={32} color={colors.primary} />
              <Text style={styles.foodWheelTitle}>¿Qué Comemos o Cenamos Hoy?</Text>
              <Text style={styles.foodWheelSub}>
                Gira la ruleta para decidir sin discutir
              </Text>
            </View>

            <View
              style={[
                styles.foodResultBox,
                { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
            >
              <Text style={[styles.foodResultLabel, { color: colors.textMuted }]}>
                {selectedFoodResult ? 'HOY TOCA DISFRUTAR:' : 'LISTO PARA GIRAR'}
              </Text>
              <Text style={[styles.foodResultValue, { color: colors.primary }]}>
                {selectedFoodResult || 'Toca el botón de abajo'}
              </Text>
            </View>

            <PressableScale
              onPress={handleSpinFoodWheel}
              disabled={isSpinning}
              style={[styles.spinWheelBtn, { backgroundColor: colors.primary }]}
              scaleTo={0.96}
            >
              <Ionicons name="sync" size={18} color={colors.primaryOn} />
              <Text style={[styles.spinWheelBtnText, { color: colors.primaryOn }]}>
                {isSpinning ? 'Eligiendo...' : 'Girar Ruleta de Comida'}
              </Text>
            </PressableScale>

            <View style={{ width: '100%' }}>
              <View style={styles.quickAddInputRow}>
                <TextInput
                  value={newFoodOption}
                  onChangeText={setNewFoodOption}
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingTop: 6 }}
              >
                {state.foodOptions.map((opt) => (
                  <View key={opt} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>{opt}</Text>
                    <TouchableOpacity
                      onPress={() => void handleRemoveFoodOption(opt)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="close-circle" size={15} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* ================= MODAL: CALIFICAR PELÍCULA ================= */}
      <Modal
        visible={Boolean(selectedMovie)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMovie(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {selectedMovie && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedMovie.title}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedMovie.genre} • Propuesta por{' '}
                      {selectedMovie.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedMovie(null)}>
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Calificación de Karlita</Text>
                <View style={styles.starsPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setTempRatingKarla(star)}>
                      <Ionicons
                        name={star <= tempRatingKarla ? 'star' : 'star-outline'}
                        size={28}
                        color="#9333ea"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Calificación de Javier</Text>
                <View style={styles.starsPickerRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setTempRatingJavier(star)}>
                      <Ionicons
                        name={star <= tempRatingJavier ? 'star' : 'star-outline'}
                        size={28}
                        color="#0284c7"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Nuestra reseña o comentario</Text>
                <TextInput
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  placeholder="¿Qué nos pareció la película?"
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                />

                <TouchableOpacity
                  onPress={() => void handleSaveMovieRating()}
                  style={[styles.modalPrimaryBtn, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.modalPrimaryBtnText}>Guardar Calificación</Text>
                </TouchableOpacity>
              </>
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
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  tabsWrapper: {
    marginBottom: 8,
  },
  tabsScroll: {
    gap: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
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
  },
  quickAddInput: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: c.text,
  },
  quickAddSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genresScroll: {
    gap: 6,
    paddingTop: 8,
  },
  quickGenreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  quickGenreText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
  },
  liveCatalogOverlay: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  liveCatalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    width: 96,
    backgroundColor: c.surfaceAlt,
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: c.border,
  },
  posterResultImg: {
    width: '100%',
    height: 110,
    borderRadius: 7,
    marginBottom: 4,
  },
  posterResultName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: c.text,
  },
  posterResultMeta: {
    fontSize: 9.5,
    color: c.textSecondary,
  },
  cardsDeck: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
  },
  cardsScrollContent: {
    gap: 10,
    paddingBottom: 24,
    paddingTop: 2,
  },
  movieRatingPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  miniRatingPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniRatingText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  emptyBox: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  movieCard: {
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  movieCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieCardPoster: {
    width: 56,
    height: 80,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: c.surfaceAlt,
  },
  moviePosterPlaceholder: {
    width: 48,
    height: 68,
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  posterPlaceholderTitle: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  genreBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genreBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addedByText: {
    fontSize: 10,
    color: c.textMuted,
    fontWeight: '600',
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  movieDirectorText: {
    fontSize: 10.5,
    color: c.textSecondary,
    marginTop: 1,
  },
  movieNotesInline: {
    fontSize: 10.5,
    color: c.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardRightActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
    marginLeft: 8,
  },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avgBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: c.primaryOn,
  },
  markWatchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  markWatchedText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.text,
  },
  pageIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
  },
  bucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  bucketItemCompleted: {
    opacity: 0.75,
    backgroundColor: c.surfaceAlt,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: c.text,
  },
  bucketTitleCompleted: {
    textDecorationLine: 'line-through',
    color: c.textMuted,
  },
  bucketMeta: {
    fontSize: 10.5,
    color: c.textMuted,
    marginTop: 2,
  },
  foodWheelCard: {
    flex: 1,
    backgroundColor: c.surface,
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
  },
  foodWheelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
    marginTop: 6,
  },
  foodWheelSub: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  foodResultBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  foodResultLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: c.textSecondary,
    letterSpacing: 1,
  },
  foodResultValue: {
    fontSize: 20,
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
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  foodChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: c.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.text,
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 11,
    color: c.textSecondary,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
  },
  starsPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.primaryOn,
  },
});

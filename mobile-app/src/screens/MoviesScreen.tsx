import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
  KeyboardAvoidingView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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

type SubTab = 'movies' | 'bucket' | 'roulette';
type MovieFilter = 'pending' | 'watched';

export const MoviesScreen: React.FC = () => {
  const { profile } = useProfile();
  const { primaryColor } = useTheme();
  const currentProfile = profile || 'Karla';

  const [state, setState] = useState<MoviesAndPlansState>(DEFAULT_MOVIES_STATE);
  const [subTab, setSubTab] = useState<SubTab>('movies');
  const [movieFilter, setMovieFilter] = useState<MovieFilter>('pending');
  const [refreshing, setRefreshing] = useState(false);

  // Entrada Rápida de Película en pantalla
  const [quickTitle, setQuickTitle] = useState('');
  const [quickGenre, setQuickGenre] = useState(GENRES[0]);
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

  // Modal agregar película detallado
  const [isAddMovieOpen, setIsAddMovieOpen] = useState(false);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newMovieGenre, setNewMovieGenre] = useState(GENRES[0]);

  // Modal calificar / ver detalle de película
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [tempRatingJavier, setTempRatingJavier] = useState<number>(5);
  const [tempRatingKarla, setTempRatingKarla] = useState<number>(5);
  const [tempNotes, setTempNotes] = useState('');

  // Ruleta de película aleatoria
  const [pickedRandomMovie, setPickedRandomMovie] = useState<MovieItem | null>(null);

  // Nuevo sueño en Bucket List
  const [newBucketTitle, setNewBucketTitle] = useState('');

  // Ruleta de comida / cita
  const [newFoodOption, setNewFoodOption] = useState('');
  const [selectedFoodResult, setSelectedFoodResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const loaded = await getMoviesState();
    setState(loaded);
    if (isRefresh) setRefreshing(false);
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
    const q = (isAddMovieOpen ? newMovieTitle : quickTitle).trim();
    if (q.length < 2) {
      setCatalogResults([]);
      setIsSearchingCatalog(false);
      return;
    }

    let cancelled = false;
    setIsSearchingCatalog(true);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=movie&entity=movie&limit=6&country=mx`
        );
        const data = await response.json();
        if (!cancelled && Array.isArray(data?.results)) {
          const mapped = data.results.map((r: any) => ({
            title: r.trackName || q,
            year: r.releaseDate ? String(r.releaseDate).slice(0, 4) : '',
            director: r.artistName || '',
            genre: r.primaryGenreName || quickGenre,
            posterUrl: r.artworkUrl100
              ? String(r.artworkUrl100).replace('100x100bb', '600x900bb')
              : '',
            synopsis: r.longDescription || r.shortDescription || '',
          }));
          setCatalogResults(mapped);
        }
      } catch {
        if (!cancelled) setCatalogResults([]);
      } finally {
        if (!cancelled) setIsSearchingCatalog(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [quickTitle, newMovieTitle, isAddMovieOpen, quickGenre]);

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
      genre: found.genre || quickGenre,
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
    setNewMovieTitle('');
    setCatalogResults([]);
    setIsAddMovieOpen(false);
    setMovieFilter('pending');
  };

  // --- Funciones para Agregar Película ---
  const handleQuickAddMovie = async () => {
    if (!quickTitle.trim()) {
      Alert.alert('Título requerido', 'Por favor escribe el nombre de la película o serie.');
      return;
    }

    const item: MovieItem = {
      id: `mov-${Date.now()}`,
      title: quickTitle.trim(),
      genre: quickGenre,
      addedBy: currentProfile,
      watched: false,
    };

    const nextState: MoviesAndPlansState = {
      ...state,
      movies: [item, ...state.movies],
    };

    await updateAndSync(nextState);
    setQuickTitle('');
    setMovieFilter('pending');
    Alert.alert('Película agregada', `"${item.title}" quedó anotada en su lista por ver.`);
  };

  const handleModalAddMovie = async () => {
    if (!newMovieTitle.trim()) {
      Alert.alert('Título requerido', 'Por favor escribe el nombre de la película o serie.');
      return;
    }

    const item: MovieItem = {
      id: `mov-${Date.now()}`,
      title: newMovieTitle.trim(),
      genre: newMovieGenre,
      addedBy: currentProfile,
      watched: false,
    };

    const nextState: MoviesAndPlansState = {
      ...state,
      movies: [item, ...state.movies],
    };

    await updateAndSync(nextState);
    setNewMovieTitle('');
    setIsAddMovieOpen(false);
    setMovieFilter('pending');
    Alert.alert('Película agregada', `"${item.title}" quedó guardada en su lista por ver.`);
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
    setMovieFilter('watched');
  };

  const handleRemoveMovieReview = (movie: MovieItem) => {
    Alert.alert(
      '¿Borrar reseña?',
      `¿Deseas quitar la calificación y notas de "${movie.title}"? La película volverá a su lista de "Por Ver".`,
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
            setMovieFilter('pending');
            Alert.alert('Reseña eliminada', `"${movie.title}" volvió a la lista de "Por Ver".`);
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
        '¡No hay películas pendientes!',
        'Agreguen películas a su lista de "Por Ver" para girar la ruleta.'
      );
      return;
    }
    const randomIndex = Math.floor(Math.random() * pending.length);
    setPickedRandomMovie(pending[randomIndex]);
  };

  // --- Funciones de Planes / Bucket List ---
  const handleAddBucketItem = async () => {
    if (!newBucketTitle.trim()) return;
    const newItem: BucketItem = {
      id: `b-${Date.now()}`,
      title: newBucketTitle.trim(),
      completed: false,
      addedBy: currentProfile,
    };
    await updateAndSync({
      ...state,
      bucketList: [newItem, ...state.bucketList],
    });
    setNewBucketTitle('');
  };

  const handleToggleBucketItem = async (id: string) => {
    const updated = state.bucketList.map((item) =>
      item.id === id
        ? {
            ...item,
            completed: !item.completed,
            completedDate: !item.completed ? toLocalDateString(new Date()) : undefined,
          }
        : item
    );
    await updateAndSync({ ...state, bucketList: updated });
  };

  const handleDeleteBucketItem = async (id: string) => {
    const updated = state.bucketList.filter((item) => item.id !== id);
    await updateAndSync({ ...state, bucketList: updated });
  };

  // --- Funciones de Ruleta de Comida / Citas ---
  const handleSpinFoodWheel = () => {
    if (state.foodOptions.length === 0) return;
    setIsSpinning(true);
    setSelectedFoodResult(null);
    setTimeout(() => {
      const idx = Math.floor(Math.random() * state.foodOptions.length);
      setSelectedFoodResult(state.foodOptions[idx]);
      setIsSpinning(false);
    }, 600);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Encabezado Superior con Branding KMRG */}
      <AppHeader />

      {/* Título de la Sección */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.screenTitle}>Cine y Planes</Text>
          <Text style={styles.screenSubtitle}>
            Películas por ver, ya vistas y planes juntos
          </Text>
        </View>
        {subTab === 'movies' && (
          <TouchableOpacity
            onPress={() => setIsAddMovieOpen(true)}
            style={[styles.addMovieHeaderBtn, { backgroundColor: primaryColor }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addMovieHeaderBtnText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selector de Sub-pestañas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => setSubTab('movies')}
          style={[
            styles.tabBtn,
            subTab === 'movies' && { backgroundColor: `${primaryColor}18` },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="film"
            size={16}
            color={subTab === 'movies' ? primaryColor : '#64748b'}
          />
          <Text
            style={[
              styles.tabBtnText,
              subTab === 'movies' && { color: primaryColor, fontWeight: '800' },
            ]}
          >
            Películas ({state.movies.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSubTab('bucket')}
          style={[
            styles.tabBtn,
            subTab === 'bucket' && { backgroundColor: `${primaryColor}18` },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={subTab === 'bucket' ? primaryColor : '#64748b'}
          />
          <Text
            style={[
              styles.tabBtnText,
              subTab === 'bucket' && { color: primaryColor, fontWeight: '800' },
            ]}
          >
            Sueños ({completedBucketCount}/{state.bucketList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSubTab('roulette')}
          style={[
            styles.tabBtn,
            subTab === 'roulette' && { backgroundColor: `${primaryColor}18` },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons
            name="restaurant"
            size={16}
            color={subTab === 'roulette' ? primaryColor : '#64748b'}
          />
          <Text
            style={[
              styles.tabBtnText,
              subTab === 'roulette' && { color: primaryColor, fontWeight: '800' },
            ]}
          >
            ¿Qué comemos?
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={primaryColor}
          />
        }
      >
        {/* ================= VISTA 1: NUESTRO CINE ================= */}
        {subTab === 'movies' && (
          <View>
            {/* TARJETA DIRECTA PARA AGREGAR PELÍCULA POR VER */}
            <View style={[styles.quickAddCard, { borderColor: `${primaryColor}30` }]}>
              <View style={styles.quickAddTitleRow}>
                <Ionicons name="add-circle" size={18} color={primaryColor} />
                <Text style={styles.quickAddHeading}>Agregar película o serie por ver</Text>
              </View>

              <View style={styles.quickAddInputRow}>
                <TextInput
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  placeholder="Escribe el nombre de la película..."
                  placeholderTextColor="#94a3b8"
                  style={styles.quickAddInput}
                  returnKeyType="done"
                  onSubmitEditing={handleQuickAddMovie}
                />
                {isSearchingCatalog && (
                  <View style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                    <ActivityIndicator size="small" color={primaryColor} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={handleQuickAddMovie}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: primaryColor }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Sugerencias Automáticas en Vivo Mientras Escribes */}
              {catalogResults.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor }}>
                      Sugerencias en vivo (toca una para agregar con póster):
                    </Text>
                    <TouchableOpacity onPress={() => setCatalogResults([])}>
                      <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Ocultar</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {catalogResults.map((item, idx) => (
                      <TouchableOpacity
                        key={`${item.title}-${idx}`}
                        onPress={() => void handleSelectCatalogMovie(item)}
                        style={{
                          width: 110,
                          backgroundColor: '#f8fafc',
                          borderRadius: 12,
                          padding: 6,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                        }}
                        activeOpacity={0.85}
                      >
                        {item.posterUrl ? (
                          <Image
                            source={{ uri: item.posterUrl }}
                            style={{ width: '100%', height: 135, borderRadius: 8, marginBottom: 5 }}
                            resizeMode="cover"
                          />
                        ) : null}
                        <Text
                          style={{ fontSize: 11, fontWeight: '700', color: '#1e293b' }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#64748b' }} numberOfLines={1}>
                          {item.year} • {item.genre}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selector de Género en Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.genresScroll}
              >
                {GENRES.map((g) => {
                  const active = quickGenre === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setQuickGenre(g)}
                      style={[
                        styles.quickGenreChip,
                        active && {
                          backgroundColor: `${primaryColor}20`,
                          borderColor: primaryColor,
                        },
                      ]}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.quickGenreText,
                          active && { color: primaryColor, fontWeight: '800' },
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Ruleta de Películas */}
            <TouchableOpacity
              onPress={handleSpinMovieRoulette}
              style={[styles.rouletteBanner, { backgroundColor: primaryColor }]}
              activeOpacity={0.88}
            >
              <View style={styles.rouletteBannerLeft}>
                <View style={styles.rouletteIconCircle}>
                  <Ionicons name="shuffle" size={20} color={primaryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rouletteBannerTitle}>¿No saben qué ver hoy?</Text>
                  <Text style={styles.rouletteBannerSub}>
                    Elegir una película al azar de su lista ({pendingMovies.length} pendientes)
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Resultado de la ruleta de películas */}
            {pickedRandomMovie && (
              <View style={[styles.randomPickCard, { borderColor: primaryColor }]}>
                <View style={styles.randomPickHeader}>
                  <Text style={[styles.randomPickBadge, { color: primaryColor }]}>
                    PELÍCULA SELECCIONADA
                  </Text>
                  <TouchableOpacity onPress={() => setPickedRandomMovie(null)}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.randomPickTitle}>{pickedRandomMovie.title}</Text>
                <Text style={styles.randomPickMeta}>
                  {pickedRandomMovie.genre} • Agregada por{' '}
                  {pickedRandomMovie.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const m = pickedRandomMovie;
                    setPickedRandomMovie(null);
                    openRateModal(m);
                  }}
                  style={[styles.randomPickBtn, { backgroundColor: `${primaryColor}18` }]}
                >
                  <Text style={[styles.randomPickBtnText, { color: primaryColor }]}>
                    Calificar película
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filtros: Por Ver vs Ya Vistas */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                onPress={() => setMovieFilter('pending')}
                style={[
                  styles.filterPill,
                  movieFilter === 'pending' && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    movieFilter === 'pending' && { color: '#ffffff' },
                  ]}
                >
                  Por Ver ({pendingMovies.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMovieFilter('watched')}
                style={[
                  styles.filterPill,
                  movieFilter === 'watched' && {
                    backgroundColor: primaryColor,
                    borderColor: primaryColor,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    movieFilter === 'watched' && { color: '#ffffff' },
                  ]}
                >
                  Ya Vistas ({watchedMovies.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Lista de Películas */}
            {(movieFilter === 'pending' ? pendingMovies : watchedMovies).length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="film-outline" size={44} color={primaryColor} />
                <Text style={styles.emptyTitle}>
                  {movieFilter === 'pending'
                    ? 'No hay películas en espera'
                    : 'Aún no han calificado películas'}
                </Text>
                <Text style={styles.emptySub}>
                  {movieFilter === 'pending'
                    ? 'Usa el cuadro de arriba para anotar su próxima película o serie juntos.'
                    : 'Cuando vean una película de la lista, márquenla con sus estrellitas.'}
                </Text>
                {movieFilter === 'pending' && (
                  <TouchableOpacity
                    onPress={() => setIsAddMovieOpen(true)}
                    style={[styles.emptyActionBtn, { backgroundColor: primaryColor }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={18} color="#ffffff" />
                    <Text style={styles.emptyActionBtnText}>Agregar Película</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              (movieFilter === 'pending' ? pendingMovies : watchedMovies).map((movie) => {
                const avg =
                  movie.ratingJavier && movie.ratingKarla
                    ? ((movie.ratingJavier + movie.ratingKarla) / 2).toFixed(1)
                    : null;

                return (
                  <TouchableOpacity
                    key={movie.id}
                    onPress={() => openRateModal(movie)}
                    style={styles.movieCard}
                    activeOpacity={0.85}
                  >
                    <View style={styles.movieCardTop}>
                      {movie.posterUrl ? (
                        <Image
                          source={{ uri: movie.posterUrl }}
                          style={{
                            width: 54,
                            height: 78,
                            borderRadius: 10,
                            marginRight: 12,
                            backgroundColor: '#f1f5f9',
                          }}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <View style={styles.genreRow}>
                          <Text
                            style={[
                              styles.genreBadge,
                              { backgroundColor: `${primaryColor}14`, color: primaryColor },
                            ]}
                          >
                            {movie.genre}
                          </Text>
                          <Text style={styles.addedByText}>
                            {movie.year ? `${movie.year} • ` : ''}Por{' '}
                            {movie.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                          </Text>
                        </View>
                        <Text style={styles.movieTitle}>{movie.title}</Text>
                        {movie.director ? (
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Dir. {movie.director}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.cardRightActions}>
                        {movie.watched && avg ? (
                          <View style={[styles.avgBadge, { backgroundColor: primaryColor }]}>
                            <Ionicons name="star" size={13} color="#ffffff" />
                            <Text style={styles.avgBadgeText}>{avg}</Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.markWatchedBtn,
                              { borderColor: primaryColor, backgroundColor: `${primaryColor}10` },
                            ]}
                          >
                            <Ionicons name="star-outline" size={13} color={primaryColor} />
                            <Text style={[styles.markWatchedText, { color: primaryColor }]}>
                              Calificar
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeleteMovie(movie)}
                          style={styles.cardTrashBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel="Eliminar película"
                        >
                          <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {movie.watched && (
                      <View style={styles.ratingsFooter}>
                        <View style={styles.dualRatingRow}>
                          <Text style={styles.personRating}>
                            Karlita: {movie.ratingKarla ? `${movie.ratingKarla} ★` : '—'}
                          </Text>
                          <Text style={styles.personRating}>
                            Javier: {movie.ratingJavier ? `${movie.ratingJavier} ★` : '—'}
                          </Text>
                        </View>
                        {movie.notes ? (
                          <Text style={styles.movieNotes}>"{movie.notes}"</Text>
                        ) : null}
                        <View style={styles.watchedCardMetaRow}>
                          {movie.watchedDate ? (
                            <Text style={styles.watchedDateText}>
                              Vista el {formatDisplayDate(movie.watchedDate)}
                            </Text>
                          ) : <View />}
                          <TouchableOpacity
                            onPress={() => handleRemoveMovieReview(movie)}
                            style={styles.removeReviewPill}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Ionicons name="arrow-undo-outline" size={12} color="#e11d48" />
                            <Text style={styles.removeReviewPillText}>Borrar reseña</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ================= VISTA 2: LISTA DE SUEÑOS ================= */}
        {subTab === 'bucket' && (
          <View>
            <View style={styles.bucketInputCard}>
              <Text style={styles.sectionHeading}>Agregar nuevo plan o sueño</Text>
              <View style={styles.inlineInputRow}>
                <TextInput
                  value={newBucketTitle}
                  onChangeText={setNewBucketTitle}
                  placeholder="Ej. Viajar juntos a la playa, Ir a un concierto..."
                  placeholderTextColor="#94a3b8"
                  style={styles.inlineInput}
                  returnKeyType="done"
                  onSubmitEditing={handleAddBucketItem}
                />
                <TouchableOpacity
                  onPress={handleAddBucketItem}
                  style={[styles.inlineAddBtn, { backgroundColor: primaryColor }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {state.bucketList.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleToggleBucketItem(item.id)}
                style={[styles.bucketItem, item.completed && styles.bucketItemCompleted]}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxCircle,
                    item.completed && {
                      backgroundColor: primaryColor,
                      borderColor: primaryColor,
                    },
                  ]}
                >
                  {item.completed && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text
                    style={[
                      styles.bucketTitle,
                      item.completed && styles.bucketTitleCompleted,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.bucketMeta}>
                    Propuesto por {item.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                    {item.completedDate ? ' • Cumplido' : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteBucketItem(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={17} color="#cbd5e1" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================= VISTA 3: RULETA ¿QUÉ COMEMOS HOY? ================= */}
        {subTab === 'roulette' && (
          <View>
            <View style={styles.foodWheelCard}>
              <Ionicons name="restaurant" size={38} color={primaryColor} />
              <Text style={styles.foodWheelTitle}>Opciones para Comer o Cenar</Text>
              <Text style={styles.foodWheelSub}>
                Cuando no sepan qué elegir para comer hoy:
              </Text>

              {selectedFoodResult && (
                <View
                  style={[
                    styles.foodWinnerBox,
                    { backgroundColor: `${primaryColor}15`, borderColor: primaryColor },
                  ]}
                >
                  <Text style={[styles.foodWinnerLabel, { color: primaryColor }]}>
                    OPCIÓN SELECCIONADA
                  </Text>
                  <Text style={styles.foodWinnerText}>{selectedFoodResult}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSpinFoodWheel}
                style={[styles.spinBtn, { backgroundColor: primaryColor }]}
                disabled={isSpinning}
                activeOpacity={0.88}
              >
                <Ionicons name="shuffle" size={18} color="#ffffff" />
                <Text style={styles.spinBtnText}>
                  {isSpinning ? 'Eligiendo opción...' : 'Elegir opción al azar'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bucketInputCard}>
              <Text style={styles.sectionHeading}>Agregar comida o lugar favorito</Text>
              <View style={styles.inlineInputRow}>
                <TextInput
                  value={newFoodOption}
                  onChangeText={setNewFoodOption}
                  placeholder="Ej. Crepas, Tacos, Ramen, Hamburguesas..."
                  placeholderTextColor="#94a3b8"
                  style={styles.inlineInput}
                  returnKeyType="done"
                  onSubmitEditing={handleAddFoodOption}
                />
                <TouchableOpacity
                  onPress={handleAddFoodOption}
                  style={[styles.inlineAddBtn, { backgroundColor: primaryColor }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View style={styles.foodChipsWrap}>
                {state.foodOptions.map((opt) => (
                  <View key={opt} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>{opt}</Text>
                    <TouchableOpacity onPress={() => handleRemoveFoodOption(opt)}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ================= MODAL: AGREGAR PELÍCULA ================= */}
      <Modal
        visible={isAddMovieOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddMovieOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Película o Serie</Text>
              <TouchableOpacity onPress={() => setIsAddMovieOpen(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Título</Text>
            <TextInput
              value={newMovieTitle}
              onChangeText={setNewMovieTitle}
              placeholder="Ej. Cuestión de Tiempo, Shrek 2..."
              placeholderTextColor="#94a3b8"
              style={styles.modalInput}
              returnKeyType="done"
              onSubmitEditing={handleModalAddMovie}
              autoFocus
            />

            {catalogResults.length > 0 && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: primaryColor, marginBottom: 6 }}>
                  Resultados en vivo (toca uno para elegir):
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ gap: 10 }}
                >
                  {catalogResults.map((item, idx) => (
                    <TouchableOpacity
                      key={`modal-${item.title}-${idx}`}
                      onPress={() => void handleSelectCatalogMovie(item)}
                      style={{
                        width: 104,
                        backgroundColor: '#f8fafc',
                        borderRadius: 12,
                        padding: 6,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                      }}
                      activeOpacity={0.85}
                    >
                      {item.posterUrl ? (
                        <Image
                          source={{ uri: item.posterUrl }}
                          style={{ width: '100%', height: 125, borderRadius: 8, marginBottom: 4 }}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text
                        style={{ fontSize: 11, fontWeight: '700', color: '#1e293b' }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748b' }} numberOfLines={1}>
                        {item.year} • {item.genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.inputLabel}>Categoría / Género</Text>
            <View style={styles.genresWrap}>
              {GENRES.map((g) => {
                const active = newMovieGenre === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setNewMovieGenre(g)}
                    style={[
                      styles.genreOption,
                      active && { backgroundColor: primaryColor, borderColor: primaryColor },
                    ]}
                  >
                    <Text style={[styles.genreOptionText, active && { color: '#ffffff' }]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleModalAddMovie}
              style={[styles.modalPrimaryBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.88}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.modalPrimaryBtnText}>Agregar a Nuestra Lista</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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

                {/* Calificación de Karlita */}
                <Text style={styles.inputLabel}>Calificación de Karlita</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setTempRatingKarla(star)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={star <= tempRatingKarla ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= tempRatingKarla ? '#f59e0b' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Calificación de Javier */}
                <Text style={styles.inputLabel}>Calificación de Javier</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setTempRatingJavier(star)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={star <= tempRatingJavier ? 'star' : 'star-outline'}
                        size={28}
                        color={star <= tempRatingJavier ? '#f59e0b' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.notesLabelRow}>
                  <Text style={styles.inputLabel}>Nota o recuerdo de la película</Text>
                  {tempNotes.trim().length > 0 && (
                    <TouchableOpacity
                      onPress={() => setTempNotes('')}
                      style={styles.clearNotesBtn}
                    >
                      <Ionicons name="close-circle" size={13} color="#e11d48" />
                      <Text style={styles.clearNotesText}>Borrar nota</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  value={tempNotes}
                  onChangeText={setTempNotes}
                  placeholder="Ej. Comimos palomitas y nos encantó el final..."
                  placeholderTextColor="#94a3b8"
                  style={styles.modalInput}
                />

                {selectedMovie.watched && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMovieReview(selectedMovie)}
                    style={styles.revertReviewBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-undo-outline" size={16} color="#e11d48" />
                    <Text style={styles.revertReviewText}>
                      Borrar reseña y volver a lista 'Por Ver'
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.modalFooterBtns}>
                  <TouchableOpacity
                    onPress={() => handleDeleteMovie(selectedMovie)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#e11d48" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveMovieRating}
                    style={[
                      styles.modalPrimaryBtn,
                      { flex: 1, marginTop: 0, backgroundColor: primaryColor },
                    ]}
                  >
                    <Ionicons name="heart" size={18} color="#ffffff" />
                    <Text style={styles.modalPrimaryBtnText}>Guardar Calificación</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addMovieHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  addMovieHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 18,
    marginVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 36,
  },
  quickAddCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickAddTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  quickAddHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  quickAddInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickAddInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  quickAddSubmitBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genresScroll: {
    gap: 6,
  },
  quickGenreChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickGenreText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  rouletteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    marginBottom: 14,
  },
  rouletteBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rouletteIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rouletteBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  rouletteBannerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 2,
  },
  randomPickCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    marginBottom: 14,
  },
  randomPickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  randomPickBadge: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  randomPickTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
  },
  randomPickMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  randomPickBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  randomPickBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTrashBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  watchedCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
  },
  removeReviewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
  },
  removeReviewPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
  },
  notesLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  clearNotesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearNotesText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
  },
  revertReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginTop: 12,
  },
  revertReviewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },
  movieCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  movieCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  genreBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addedByText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  movieTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  avgBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  markWatchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  markWatchedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ratingsFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dualRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  personRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  movieNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2,
  },
  watchedDateText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  bucketInputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
  },
  inlineInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inlineInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1e293b',
  },
  inlineAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  bucketItemCompleted: {
    backgroundColor: '#f8fafc',
    opacity: 0.8,
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  bucketTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  bucketMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  foodWheelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
  },
  foodWheelTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
    marginTop: 8,
  },
  foodWheelSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  foodWinnerBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 14,
  },
  foodWinnerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  foodWinnerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 2,
  },
  spinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  spinBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  foodChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  foodChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    color: '#1e293b',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
  },
  genresWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  genreOption: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  genreOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  modalFooterBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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

type SubTab = 'pending' | 'watched' | 'bucket' | 'roulette';

export const MoviesScreen: React.FC = () => {
  const { profile } = useProfile();
  const { primaryColor } = useTheme();
  const currentProfile = profile || 'Karla';

  const [state, setState] = useState<MoviesAndPlansState>(DEFAULT_MOVIES_STATE);
  const [subTab, setSubTab] = useState<SubTab>('pending');

  // Paginación para evitar el scroll vertical
  const [moviePage, setMoviePage] = useState(0);
  const [bucketPage, setBucketPage] = useState(0);

  // Entrada Rápida de Película con autocompletado en vivo mientras escribes
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
    setCatalogResults([]);
    setMoviePage(0);
    setSubTab('pending');
  };

  const handleQuickAddMovie = async () => {
    if (!quickTitle.trim()) {
      Alert.alert('Título requerido', 'Escribe el nombre de la película o serie.');
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <AppHeader />

      {/* Contenedor Fijo SIN Scroll Vertical */}
      <View style={styles.fixedViewport}>
        {/* Selector de 4 Sub-Pestañas Compactas */}
        <View style={styles.tabsContainer}>
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
              <TouchableOpacity
                key={t.id}
                onPress={() => {
                  setMoviePage(0);
                  setBucketPage(0);
                  setSubTab(t.id as SubTab);
                }}
                style={[
                  styles.tabBtn,
                  active && { backgroundColor: primaryColor },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={13}
                  color={active ? '#ffffff' : '#64748b'}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    active && { color: '#ffffff', fontWeight: '800' },
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= VISTAS 1 Y 2: PELÍCULAS POR VER / YA VISTAS ================= */}
        {(subTab === 'pending' || subTab === 'watched') && (
          <View style={styles.contentArea}>
            {/* Barra Superior Rápida con Autocompletado Mientras Escribes */}
            <View style={[styles.quickAddCard, { borderColor: `${primaryColor}30` }]}>
              <View style={styles.quickAddInputRow}>
                <TextInput
                  value={quickTitle}
                  onChangeText={setQuickTitle}
                  placeholder="Escribe una película (resultados en vivo)..."
                  placeholderTextColor="#94a3b8"
                  style={styles.quickAddInput}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleQuickAddMovie()}
                />
                {isSearchingCatalog && (
                  <View style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                    <ActivityIndicator size="small" color={primaryColor} />
                  </View>
                )}
                <TouchableOpacity
                  onPress={handleSpinMovieRoulette}
                  style={[
                    styles.quickAddSubmitBtn,
                    { backgroundColor: `${primaryColor}18` },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="shuffle" size={18} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleQuickAddMovie()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: primaryColor }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
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

              {/* Tira Flotante de Resultados en Vivo Mientras Escribes */}
              {catalogResults.length > 0 && (
                <View style={styles.liveCatalogOverlay}>
                  <View style={styles.liveCatalogHeader}>
                    <Text style={[styles.liveCatalogTitle, { color: primaryColor }]}>
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
                      <TouchableOpacity
                        key={`${item.title}-${idx}`}
                        onPress={() => void handleSelectCatalogMovie(item)}
                        style={styles.posterResultCard}
                        activeOpacity={0.85}
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
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Tarjetas de Películas Paginadas (Cero Scroll) */}
            <View style={styles.cardsDeck}>
              {visibleMovies.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="film-outline" size={38} color={primaryColor} />
                  <Text style={styles.emptyTitle}>
                    {subTab === 'pending'
                      ? 'No hay películas en espera'
                      : 'Aún no han calificado películas'}
                  </Text>
                  <Text style={styles.emptySub}>
                    Escribe arriba el nombre de cualquier película y agrégala con su póster oficial.
                  </Text>
                </View>
              ) : (
                visibleMovies.map((movie) => {
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
                            style={styles.movieCardPoster}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.moviePosterPlaceholder,
                              { backgroundColor: `${primaryColor}14` },
                            ]}
                          >
                            <Ionicons name="film" size={20} color={primaryColor} />
                          </View>
                        )}

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
                          <Text style={styles.movieTitle} numberOfLines={1}>
                            {movie.title}
                          </Text>
                          {movie.notes ? (
                            <Text style={styles.movieNotesInline} numberOfLines={1}>
                              “{movie.notes}”
                            </Text>
                          ) : movie.director ? (
                            <Text style={styles.movieDirectorText} numberOfLines={1}>
                              Dir. {movie.director}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.cardRightActions}>
                          {movie.watched && avg ? (
                            <View style={[styles.avgBadge, { backgroundColor: primaryColor }]}>
                              <Ionicons name="star" size={12} color="#ffffff" />
                              <Text style={styles.avgBadgeText}>{avg}</Text>
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.markWatchedBtn,
                                { borderColor: primaryColor, backgroundColor: `${primaryColor}10` },
                              ]}
                            >
                              <Ionicons name="star-outline" size={12} color={primaryColor} />
                              <Text style={[styles.markWatchedText, { color: primaryColor }]}>
                                Calificar
                              </Text>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {movie.watched && (
                              <TouchableOpacity
                                onPress={() => handleRemoveMovieReview(movie)}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              >
                                <Ionicons name="arrow-undo-outline" size={15} color="#e11d48" />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleDeleteMovie(movie)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="trash-outline" size={15} color="#94a3b8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Controles de Página para Cero Scroll */}
            {totalMoviePages > 1 && (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  disabled={safeMoviePage === 0}
                  onPress={() => setMoviePage((p) => Math.max(0, p - 1))}
                  style={[styles.pageBtn, safeMoviePage === 0 && { opacity: 0.4 }]}
                >
                  <Ionicons name="chevron-back" size={15} color="#1e293b" />
                  <Text style={styles.pageBtnText}>Anterior</Text>
                </TouchableOpacity>
                <Text style={styles.pageIndicator}>
                  Página {safeMoviePage + 1} de {totalMoviePages}
                </Text>
                <TouchableOpacity
                  disabled={safeMoviePage >= totalMoviePages - 1}
                  onPress={() => setMoviePage((p) => Math.min(totalMoviePages - 1, p + 1))}
                  style={[
                    styles.pageBtn,
                    safeMoviePage >= totalMoviePages - 1 && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.pageBtnText}>Siguiente</Text>
                  <Ionicons name="chevron-forward" size={15} color="#1e293b" />
                </TouchableOpacity>
              </View>
            )}
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
              {visibleBuckets.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => void handleToggleBucketItem(item.id)}
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
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text
                      style={[
                        styles.bucketTitle,
                        item.completed && styles.bucketTitleCompleted,
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.bucketMeta}>
                      Por {item.addedBy === 'Karla' ? 'Karlita' : 'Javier'}
                      {item.completedDate ? ' • Cumplido' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => void handleDeleteBucketItem(item.id)}>
                    <Ionicons name="trash-outline" size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
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
              <Ionicons name="restaurant" size={32} color={primaryColor} />
              <Text style={styles.foodWheelTitle}>¿Qué Comemos o Cenamos Hoy?</Text>
              <Text style={styles.foodWheelSub}>
                Gira la ruleta para decidir sin discutir
              </Text>
            </View>

            <View
              style={[
                styles.foodResultBox,
                { borderColor: primaryColor, backgroundColor: `${primaryColor}10` },
              ]}
            >
              <Text style={styles.foodResultLabel}>
                {selectedFoodResult ? 'HOY TOCA DISFRUTAR:' : 'LISTO PARA GIRAR'}
              </Text>
              <Text style={[styles.foodResultValue, { color: primaryColor }]}>
                {selectedFoodResult || 'Toca el botón de abajo'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSpinFoodWheel}
              disabled={isSpinning}
              style={[styles.spinWheelBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.85}
            >
              <Ionicons name="sync" size={18} color="#ffffff" />
              <Text style={styles.spinWheelBtnText}>
                {isSpinning ? 'Eligiendo...' : 'Girar Ruleta de Comida'}
              </Text>
            </TouchableOpacity>

            <View style={{ width: '100%' }}>
              <View style={styles.quickAddInputRow}>
                <TextInput
                  value={newFoodOption}
                  onChangeText={setNewFoodOption}
                  placeholder="Agregar antojo (ej. Ramen, Crepas...)"
                  placeholderTextColor="#94a3b8"
                  style={styles.quickAddInput}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleAddFoodOption()}
                />
                <TouchableOpacity
                  onPress={() => void handleAddFoodOption()}
                  style={[styles.quickAddSubmitBtn, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingTop: 6 }}
              >
                {state.foodOptions.map((opt) => (
                  <View key={opt} style={styles.foodChip}>
                    <Text style={styles.foodChipText}>{opt}</Text>
                    <TouchableOpacity onPress={() => void handleRemoveFoodOption(opt)}>
                      <Ionicons name="close-circle" size={15} color="#94a3b8" />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#faf9f9',
  },
  fixedViewport: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  contentArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  quickAddCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
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
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickGenreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  liveCatalogOverlay: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    color: '#64748b',
  },
  posterResultCard: {
    width: 96,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    color: '#1e293b',
  },
  posterResultMeta: {
    fontSize: 9.5,
    color: '#64748b',
  },
  cardsDeck: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 8,
  },
  emptyBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: SERIF_FONT,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  movieCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  movieCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movieCardPoster: {
    width: 44,
    height: 62,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f1f5f9',
  },
  moviePosterPlaceholder: {
    width: 44,
    height: 62,
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  genreBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addedByText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  movieTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
  },
  movieDirectorText: {
    fontSize: 10.5,
    color: '#64748b',
    marginTop: 1,
  },
  movieNotesInline: {
    fontSize: 10.5,
    color: '#475569',
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
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  pageIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  bucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bucketItemCompleted: {
    opacity: 0.75,
    backgroundColor: '#f8fafc',
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
    fontSize: 10.5,
    color: '#94a3b8',
    marginTop: 2,
  },
  foodWheelCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  foodWheelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
    marginTop: 6,
  },
  foodWheelSub: {
    fontSize: 12,
    color: '#64748b',
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
    color: '#64748b',
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
    color: '#ffffff',
  },
  foodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  foodChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#334155',
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
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
    fontFamily: SERIF_FONT,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
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
    color: '#ffffff',
  },
});

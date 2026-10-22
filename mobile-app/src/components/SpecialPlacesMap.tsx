import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { ThemePalette } from '../theme/designSystem';
import { useTheme as useThemeTokens } from '../contexts/ThemeContext';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
  Linking,
  Animated,
  Dimensions,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  PanResponder,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import * as ImagePicker from 'expo-image-picker';
import { SpecialPlace, PlaceCategory, UserProfile } from '../types';
import {
  getSpecialPlacesState,
  saveSpecialPlacesState,
  DEFAULT_SPECIAL_PLACES,
} from '../services/CoupleSyncService';
import { formatDisplayDate, toLocalDateString } from '../services/StorageService';
import { DatePickerModal } from './DatePickerModal';
import { FONTS } from '../theme/designSystem';
import { supabase } from '../config/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INLINE_MAP_WIDTH = SCREEN_WIDTH - 36;
const INLINE_MAP_HEIGHT = Math.min(320, Math.max(260, Math.floor(SCREEN_HEIGHT * 0.38)));
const TILE_SIZE = 256;

const CATEGORIES: Array<{
  id: PlaceCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = [
  { id: 'Primera Vez', label: 'Primera Vez', icon: 'sparkles', color: '#e63946' },
  { id: 'Restaurante', label: 'Restaurante', icon: 'restaurant', color: '#f4a261' },
  { id: 'Cafetería', label: 'Cafetería', icon: 'cafe', color: '#b08968' },
  { id: 'Cita Especial', label: 'Cita Especial', icon: 'heart', color: '#9333ea' },
  { id: 'Mirador', label: 'Mirador', icon: 'eye', color: '#0284c7' },
  { id: 'Viaje', label: 'Viaje', icon: 'airplane', color: '#2a9d8f' },
];

// ================= MATEMÁTICA WEB MERCATOR REAL (COMO LEAFLET / GOOGLE MAPS) =================
function latLonToWorldPixel(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lon + 180) / 360) * scale;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldPixelToLatLon(x: number, y: number, zoom: number): { lat: number; lon: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return {
    lat: Math.max(-85, Math.min(85, lat)),
    lon: ((((lon + 180) % 360) + 360) % 360) - 180,
  };
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface GeoSuggestion {
  displayName: string;
  shortName: string;
  lat: number;
  lon: number;
}

interface Props {
  currentProfile: UserProfile;
  primaryColor: string;
}

export const SpecialPlacesMap: React.FC<Props> = ({ currentProfile, primaryColor }) => {
  const { colors, isDark } = useThemeTokens();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [places, setPlaces] = useState<SpecialPlace[]>(DEFAULT_SPECIAL_PLACES);
  const [selectedPlace, setSelectedPlace] = useState<SpecialPlace | null>(
    DEFAULT_SPECIAL_PLACES[0] || null
  );
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | 'Todos'>('Todos');
  const [mapStyle, setMapStyle] = useState<'voyager' | 'dark'>('voyager');
  const [showRouteLines, setShowRouteLines] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [mapLayout, setMapLayout] = useState({
    width: INLINE_MAP_WIDTH,
    height: INLINE_MAP_HEIGHT,
  });
  const [tileError, setTileError] = useState(false);

  // Modo interactivo para pinear tocando cualquier calle del mapa real
  const [isPinDropMode, setIsPinDropMode] = useState<boolean>(false);
  const isPinDropModeRef = useRef<boolean>(false);
  useEffect(() => {
    isPinDropModeRef.current = isPinDropMode;
  }, [isPinDropMode]);

  const [draftPinCoords, setDraftPinCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Estado de la cámara del mapa real (Centro GPS + Nivel de Zoom 3..18)
  const [centerLat, setCenterLat] = useState<number>(19.4194);
  const [centerLon, setCenterLon] = useState<number>(-99.1625);
  const [zoom, setZoom] = useState<number>(12);

  // Buscador de lugares reales en vivo sobre el mapa
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState<GeoSuggestion[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // Modal para guardar el lugar pineado
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<PlaceCategory>('Cita Especial');
  const [newAddress, setNewAddress] = useState('');
  const [newDate, setNewDate] = useState(() => toLocalDateString(new Date()));
  const [newNotes, setNewNotes] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [newLat, setNewLat] = useState(19.4194);
  const [newLon, setNewLon] = useState(-99.1625);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Modal de detalle de un lugar existente
  const [detailModalPlace, setDetailModalPlace] = useState<SpecialPlace | null>(null);

  // Animación del pin seleccionado
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isNative = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: isNative,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: isNative,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const loadPlaces = useCallback(async () => {
    const state = await getSpecialPlacesState();
    setPlaces(state.places);
    if (state.places.length > 0) {
      const first = state.places[0];
      setSelectedPlace((prev) => prev || first);
      setCenterLat(first.latitude);
      setCenterLon(first.longitude);
    }
  }, []);

  useEffect(() => {
    void loadPlaces();

    const channel = supabase
      .channel('kmrg-places-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload.new?.type === 'sync_places_state' && payload.new?.payload?.places) {
            setPlaces(payload.new.payload.places);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPlaces]);

  // Autocompletado en vivo mientras escribes una calle, restaurante o ciudad en el buscador del mapa
  useEffect(() => {
    const q = mapSearchQuery.trim();
    if (q.length < 2) {
      setMapSearchSuggestions([]);
      setIsSearchingMap(false);
      return;
    }

    let cancelled = false;
    setIsSearchingMap(true);

    const timer = setTimeout(async () => {
      try {
        // Primero intentamos Photon (OSM rápido y sin bloqueos de CORS/User-Agent) y fallback a Nominatim
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.features) && data.features.length > 0) {
          setMapSearchSuggestions(
            data.features.map((f: any) => {
              const props = f.properties || {};
              const coords = f.geometry?.coordinates || [-99.1625, 19.4194];
              const nameParts = [
                props.name,
                props.street,
                props.district || props.city || props.town,
                props.state,
                props.country,
              ].filter(Boolean);
              return {
                shortName: props.name || props.street || q,
                displayName: nameParts.slice(0, 3).join(', ') || q,
                lon: Number(coords[0]),
                lat: Number(coords[1]),
              };
            })
          );
          setIsSearchingMap(false);
          return;
        }

        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=es&q=${encodeURIComponent(
            q
          )}`
        );
        const nomData = await nomRes.json();
        if (!cancelled && Array.isArray(nomData)) {
          setMapSearchSuggestions(
            nomData.map((item: any) => {
              const parts = String(item.display_name || '').split(',');
              return {
                displayName: parts.slice(0, 3).join(',').trim(),
                shortName: parts[0]?.trim() || q,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
              };
            })
          );
        }
      } catch {
        if (!cancelled) setMapSearchSuggestions([]);
      } finally {
        if (!cancelled) setIsSearchingMap(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mapSearchQuery]);

  const syncPlaces = async (nextPlaces: SpecialPlace[]) => {
    setPlaces(nextPlaces);
    await saveSpecialPlacesState(currentProfile, { places: nextPlaces });
  };

  // Filtrar lugares ordenados cronológicamente
  const filteredPlaces = useMemo(() => {
    const list =
      activeCategory === 'Todos'
        ? places
        : places.filter((p) => p.category === activeCategory);
    return [...list].sort((a, b) => a.date.localeCompare(b.date));
  }, [places, activeCategory]);

  // Kilómetros totales de su historia
  const totalRouteKm = useMemo(() => {
    if (filteredPlaces.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < filteredPlaces.length - 1; i++) {
      total += calculateDistanceKm(
        filteredPlaces[i].latitude,
        filteredPlaces[i].longitude,
        filteredPlaces[i + 1].latitude,
        filteredPlaces[i + 1].longitude
      );
    }
    return Math.round(total * 10) / 10;
  }, [filteredPlaces]);

  // Referencias para el arrastre (Pan) y toque (Tap-to-Pin) sobre el lienzo del mapa
  const centerRef = useRef({ lat: centerLat, lon: centerLon, zoom });
  useEffect(() => {
    centerRef.current = { lat: centerLat, lon: centerLon, zoom };
  }, [centerLat, centerLon, zoom]);

  const dragStartWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Al confirmar un punto del mapa para abrir el formulario de Nuevo Pin
  const openAddPlaceModalAtCoordinates = useCallback(
    async (lat: number, lon: number, prefilledAddress?: string, prefilledTitle?: string) => {
      setDraftPinCoords({ lat, lon });
      setNewLat(lat);
      setNewLon(lon);
      setCenterLat(lat);
      setCenterLon(lon);
      if (prefilledTitle) {
        setNewTitle(prefilledTitle);
      }
      if (prefilledAddress) {
        setNewAddress(prefilledAddress);
        setIsAddModalOpen(true);
        return;
      }

      setNewAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      setIsAddModalOpen(true);

      // Geocodificación inversa en segundo plano para autocompletar la calle/colonia real
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=es&lat=${lat}&lon=${lon}&zoom=18`
        );
        const data = await res.json();
        if (data?.display_name) {
          const shortAddr = String(data.display_name)
            .split(',')
            .slice(0, 3)
            .join(',')
            .trim();
          setNewAddress(shortAddr);
          if (data?.name) {
            setNewTitle((prev) => prev.trim() || String(data.name));
          }
        }
      } catch {
        // Mantiene las coordenadas formateadas si no hay red
      }
    },
    []
  );

  const openModalRef = useRef(openAddPlaceModalAtCoordinates);
  useEffect(() => {
    openModalRef.current = openAddPlaceModalAtCoordinates;
  }, [openAddPlaceModalAtCoordinates]);

  // Creador de gestos exclusivo para el lienzo de teselas (con pointerEvents="box-only" para coordenadas 100% exactas y sin bloquear botones)
  const createCanvasPanResponder = (viewportW: number, viewportH: number) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.hypot(g.dx, g.dy) > 2,
      onPanResponderGrant: () => {
        const { lat, lon, zoom: z } = centerRef.current;
        dragStartWorldRef.current = latLonToWorldPixel(lat, lon, z);
      },
      onPanResponderMove: (_, gestureState) => {
        const { zoom: z } = centerRef.current;
        const nextWorldX = dragStartWorldRef.current.x - gestureState.dx;
        const nextWorldY = dragStartWorldRef.current.y - gestureState.dy;
        const nextCoords = worldPixelToLatLon(nextWorldX, nextWorldY, z);
        setCenterLat(nextCoords.lat);
        setCenterLon(nextCoords.lon);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const movedDist = Math.hypot(gestureState.dx, gestureState.dy);
        if (movedDist < 8) {
          const { locationX, locationY } = evt.nativeEvent;
          if (typeof locationX === 'number' && typeof locationY === 'number') {
            const { lat, lon, zoom: z } = centerRef.current;
            const centerWorld = latLonToWorldPixel(lat, lon, z);
            const tapWorldX = centerWorld.x - viewportW / 2 + locationX;
            const tapWorldY = centerWorld.y - viewportH / 2 + locationY;
            const tappedCoords = worldPixelToLatLon(tapWorldX, tapWorldY, z);

            if (isPinDropModeRef.current) {
              setIsPinDropMode(false);
              void openModalRef.current(tappedCoords.lat, tappedCoords.lon);
            } else {
              setDraftPinCoords(tappedCoords);
            }
          }
        }
      },
    });

  const inlinePanResponder = useMemo(
    () => createCanvasPanResponder(INLINE_MAP_WIDTH, INLINE_MAP_HEIGHT),
    []
  );

  const fullScreenMapHeight = SCREEN_HEIGHT - 170;
  const fullScreenPanResponder = useMemo(
    () => createCanvasPanResponder(SCREEN_WIDTH, fullScreenMapHeight),
    [fullScreenMapHeight]
  );

  const focusPlaceOnMap = (place: SpecialPlace) => {
    setSelectedPlace(place);
    setDraftPinCoords(null);
    setCenterLat(place.latitude);
    setCenterLon(place.longitude);
    if (zoom < 13) setZoom(14);
  };

  const handleSelectSearchSuggestion = (sug: GeoSuggestion) => {
    setCenterLat(sug.lat);
    setCenterLon(sug.lon);
    setZoom(16);
    setDraftPinCoords({ lat: sug.lat, lon: sug.lon });
    setMapSearchQuery('');
    setMapSearchSuggestions([]);
    void openAddPlaceModalAtCoordinates(sug.lat, sug.lon, sug.displayName, sug.shortName);
  };

  const handlePickPlacePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso requerido', 'Activa el permiso de galería para adjuntar una foto.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 10],
        quality: 0.5,
        base64: true,
      });
      if (!res.canceled && res.assets?.length) {
        const asset = res.assets[0];
        setNewImageUri(
          asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri
        );
      }
    } catch {
      // Ignorar
    }
  };

  const handleAddPlace = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Nombre requerido', 'Escribe el nombre de este lugar especial.');
      return;
    }

    const item: SpecialPlace = {
      id: `place-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      address: newAddress.trim() || `${newLat.toFixed(4)}, ${newLon.toFixed(4)}`,
      date: newDate,
      notes: newNotes.trim() || 'Un recuerdo inolvidable juntos.',
      rating: newRating,
      latitude: newLat,
      longitude: newLon,
      mapX: 50,
      mapY: 50,
      imageUri: newImageUri || undefined,
      addedBy: currentProfile,
      favorite: true,
    };

    const next = [...places, item];
    await syncPlaces(next);
    setSelectedPlace(item);
    setCenterLat(item.latitude);
    setCenterLon(item.longitude);
    setDraftPinCoords(null);
    setNewTitle('');
    setNewAddress('');
    setNewNotes('');
    setNewImageUri(null);
    setIsAddModalOpen(false);
  };

  const handleDeletePlace = (place: SpecialPlace) => {
    Alert.alert(
      '¿Eliminar lugar del mapa?',
      `¿Seguro que deseas borrar "${place.title}" de su mapa de recuerdos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const next = places.filter((p) => p.id !== place.id);
            await syncPlaces(next);
            setDetailModalPlace(null);
            setSelectedPlace(next[0] || null);
          },
        },
      ]
    );
  };

  const handleOpenExternalMaps = (place: SpecialPlace) => {
    const query = encodeURIComponent(`${place.title} ${place.address}`);
    const url = Platform.select({
      ios: `http://maps.apple.com/?q=${query}&ll=${place.latitude},${place.longitude}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    if (url) {
      void Linking.openURL(url);
    }
  };

  // Renderizador del Motor de Teselas Cartográficas Reales (OpenStreetMap / CartoDB)
  const renderRealTileMap = (
    viewportW: number,
    viewportH: number,
    panHandlers: any
  ) => {
    const centerWorld = latLonToWorldPixel(centerLat, centerLon, zoom);
    const maxTileIndex = Math.pow(2, zoom);

    const minTileX = Math.floor((centerWorld.x - viewportW / 2) / TILE_SIZE);
    const maxTileX = Math.floor((centerWorld.x + viewportW / 2) / TILE_SIZE);
    const minTileY = Math.max(0, Math.floor((centerWorld.y - viewportH / 2) / TILE_SIZE));
    const maxTileY = Math.min(
      maxTileIndex - 1,
      Math.floor((centerWorld.y + viewportH / 2) / TILE_SIZE)
    );

    const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedTx = ((tx % maxTileIndex) + maxTileIndex) % maxTileIndex;
        const left = Math.round(viewportW / 2 + (tx * TILE_SIZE - centerWorld.x));
        const top = Math.round(viewportH / 2 + (ty * TILE_SIZE - centerWorld.y));
        const sub = ['a', 'b', 'c'][(Math.abs(tx + ty)) % 3];
        const url =
          mapStyle === 'dark'
            ? `https://${sub}.basemaps.cartocdn.com/dark_all/${zoom}/${wrappedTx}/${ty}.png`
            : `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrappedTx}/${ty}.png`;

        tiles.push({
          key: `${zoom}-${tx}-${ty}-${mapStyle}`,
          url,
          left,
          top,
        });
      }
    }

    // Proyectar cada lugar guardado a su coordenada exacta en pantalla
    const projectedPlaces = filteredPlaces.map((place, index) => {
      const worldPt = latLonToWorldPixel(place.latitude, place.longitude, zoom);
      const sx = viewportW / 2 + (worldPt.x - centerWorld.x);
      const sy = viewportH / 2 + (worldPt.y - centerWorld.y);
      return { place, index, sx, sy };
    });

    // Proyectar pin temporal si el usuario tocó una calle del mapa
    const draftScreenPt = draftPinCoords
      ? (() => {
          const wPt = latLonToWorldPixel(draftPinCoords.lat, draftPinCoords.lon, zoom);
          return {
            sx: viewportW / 2 + (wPt.x - centerWorld.x),
            sy: viewportH / 2 + (wPt.y - centerWorld.y),
          };
        })()
      : null;

    return (
      <View
        style={[
          styles.realMapViewport,
          {
            width: viewportW,
            height: viewportH,
            backgroundColor: mapStyle === 'dark' ? '#0f172a' : '#e2e8f0',
          },
        ]}
      >
        {/* 1. LIENZO TÁCTIL DE TESELAS (pointerEvents="box-only" evita que las imágenes o botones rompan las coordenadas) */}
        <View
          pointerEvents="box-only"
          style={StyleSheet.absoluteFill}
          {...panHandlers}
        >
          {tiles.map((t) => (
            <Image
              key={t.key}
              source={{ uri: t.url, headers: { 'User-Agent': 'KMRG-App/1.0' } }}
              onError={() => setTileError(true)}
              style={{
                position: 'absolute',
                left: t.left,
                top: t.top,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
              resizeMode="cover"
            />
          ))}

          {/* 2. Líneas de Ruta Conectada entre sus Lugares */}
          {showRouteLines &&
            projectedPlaces.map((item, idx) => {
              if (idx === projectedPlaces.length - 1) return null;
              const next = projectedPlaces[idx + 1];
              const dx = next.sx - item.sx;
              const dy = next.sy - item.sy;
              const length = Math.sqrt(dx * dx + dy * dy);
              if (length > viewportW * 2) return null;
              const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
              const midX = (item.sx + next.sx) / 2;
              const midY = (item.sy + next.sy) / 2;

              return (
                <View
                  key={`route-${item.place.id}-${next.place.id}`}
                  style={[
                    styles.routeSegment,
                    {
                      width: length,
                      left: midX - length / 2,
                      top: midY - 1.5,
                      backgroundColor: primaryColor,
                      transform: [{ rotate: `${angleDeg}deg` }],
                    },
                  ]}
                />
              );
            })}

          {/* Mira central sutil */}
          <View style={styles.centerCrosshair}>
            <Ionicons
              name="add"
              size={16}
              color={mapStyle === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.35)'}
            />
          </View>
        </View>

        {/* 3. Pin Temporal al tocar cualquier calle (Fuera del PanResponder para que el botón siempre responda al toque) */}
        {draftScreenPt &&
          draftScreenPt.sx >= -30 &&
          draftScreenPt.sx <= viewportW + 30 &&
          draftScreenPt.sy >= -30 &&
          draftScreenPt.sy <= viewportH + 30 && (
            <View
              pointerEvents="box-none"
              style={[
                styles.draftPinAnchor,
                { left: draftScreenPt.sx, top: draftScreenPt.sy },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  if (draftPinCoords) {
                    void openAddPlaceModalAtCoordinates(draftPinCoords.lat, draftPinCoords.lon);
                  }
                }}
                style={[styles.draftPinActionBubble, { backgroundColor: primaryColor }]}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={15} color="#ffffff" />
                <Text style={styles.draftPinActionText}>Guardar Pin Aquí</Text>
              </TouchableOpacity>
              <View style={[styles.draftPinDot, { borderColor: primaryColor }]} />
            </View>
          )}

        {/* 4. Pines Reales de sus Lugares Especiales (Fuera del PanResponder para que puedan tocarse libremente) */}
        {projectedPlaces.map(({ place, index, sx, sy }) => {
          if (sx < -50 || sx > viewportW + 50 || sy < -50 || sy > viewportH + 50) {
            return null;
          }
          const isSelected = selectedPlace?.id === place.id;
          const catMeta =
            CATEGORIES.find((c) => c.id === place.category) || CATEGORIES[0];

          return (
            <View
              key={place.id}
              pointerEvents="box-none"
              style={[
                styles.pinAnchor,
                {
                  left: sx,
                  top: sy,
                  zIndex: isSelected ? 40 : 20,
                },
              ]}
            >
              {isSelected && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pinPulseHalo,
                    {
                      backgroundColor: `${primaryColor}35`,
                      borderColor: primaryColor,
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                />
              )}

              <TouchableOpacity
                onPress={() => {
                  if (isSelected) {
                    setDetailModalPlace(place);
                  } else {
                    setSelectedPlace(place);
                  }
                }}
                onLongPress={() => setDetailModalPlace(place)}
                activeOpacity={0.88}
                style={[
                  styles.pinBubble,
                  {
                    backgroundColor: isSelected ? primaryColor : catMeta.color,
                    borderColor: '#ffffff',
                    transform: [{ scale: isSelected ? 1.18 : 1 }],
                  },
                ]}
              >
                <Ionicons name={catMeta.icon} size={14} color="#ffffff" />
                <View style={styles.pinOrderBadge}>
                  <Text style={styles.pinOrderText}>{index + 1}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDetailModalPlace(place)}
                activeOpacity={0.85}
                style={[
                  styles.pinLabelTag,
                  {
                    backgroundColor: isSelected ? primaryColor : colors.surface,
                    borderColor: isSelected ? primaryColor : colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pinLabelText,
                    { color: isSelected ? '#ffffff' : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {place.title}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Banner de Modo Pinear Activo */}
        {isPinDropMode && (
          <View style={[styles.pinDropBanner, { backgroundColor: primaryColor }]}>
            <Ionicons name="finger-print-outline" size={16} color="#ffffff" />
            <Text style={styles.pinDropBannerText}>
              Toca cualquier calle o punto del mapa para colocar tu pin
            </Text>
            <TouchableOpacity onPress={() => setIsPinDropMode(false)}>
              <Ionicons name="close-circle" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}



        {/* Controles Flotantes Derechos (Zoom, Estilo, Ruta, Pantalla Completa) */}
        <View pointerEvents="box-none" style={styles.mapRightControls}>
          <TouchableOpacity
            onPress={() => setIsFullScreen(!isFullScreen)}
            style={styles.mapControlBtn}
          >
            <Ionicons
              name={isFullScreen ? 'contract-outline' : 'expand-outline'}
              size={17}
              color="#1e293b"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMapStyle((s) => (s === 'voyager' ? 'dark' : 'voyager'))}
            style={styles.mapControlBtn}
          >
            <Ionicons
              name={mapStyle === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={17}
              color="#1e293b"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowRouteLines((prev) => !prev)}
            style={[
              styles.mapControlBtn,
              showRouteLines && { backgroundColor: primaryColor },
            ]}
          >
            <Ionicons
              name="analytics-outline"
              size={16}
              color={showRouteLines ? '#ffffff' : '#1e293b'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setZoom((z) => Math.min(18, z + 1))}
            style={styles.mapControlBtn}
          >
            <Ionicons name="add" size={19} color="#1e293b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setZoom((z) => Math.max(4, z - 1))}
            style={styles.mapControlBtn}
          >
            <Ionicons name="remove" size={19} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {tileError && (
          <View pointerEvents="box-none" style={styles.tileErrorBanner}>
            <View style={[styles.tileErrorCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="cloud-offline-outline" size={15} color={primaryColor} />
              <Text style={[styles.tileErrorText, { color: colors.textSecondary }]}>
                Mapa sin conexión
              </Text>
              <TouchableOpacity
                onPress={() => setTileError(false)}
                style={[styles.tileRetryBtn, { backgroundColor: primaryColor }]}
              >
                <Text style={styles.tileRetryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const currentPlaceIndex = useMemo(() => {
    if (!selectedPlace) return 0;
    const idx = filteredPlaces.findIndex((p) => p.id === selectedPlace.id);
    return idx >= 0 ? idx : 0;
  }, [filteredPlaces, selectedPlace]);

  const stepPlace = (delta: number) => {
    if (filteredPlaces.length === 0) return;
    const nextIdx = (currentPlaceIndex + delta + filteredPlaces.length) % filteredPlaces.length;
    focusPlaceOnMap(filteredPlaces[nextIdx]);
  };

  return (
    <View style={styles.container}>
      {/* ================= BARRA SUPERIOR COMPACTA: STATS + NUEVO PIN + PANTALLA COMPLETA ================= */}
      <View style={styles.statsBanner}>
        <View style={styles.statRowLeft}>
          <View style={[styles.statPill, { backgroundColor: `${primaryColor}14` }]}>
            <Ionicons name="location" size={12} color={primaryColor} />
            <Text style={[styles.statPillText, { color: primaryColor }]}>
              {places.length} Pines · {totalRouteKm} km
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={() => void openAddPlaceModalAtCoordinates(centerLat, centerLon)}
            style={[styles.newPinBannerBtn, { backgroundColor: primaryColor }]}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={13} color="#ffffff" />
            <Text style={styles.newPinBannerBtnText}>Nuevo Pin</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsFullScreen(true)}
            style={[styles.newPinBannerBtn, { backgroundColor: primaryColor }]}
            activeOpacity={0.85}
          >
            <Ionicons name="expand-outline" size={13} color="#ffffff" />
            <Text style={styles.newPinBannerBtnText}>Mapa Completo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= BUSCADOR EN VIVO DE CALLES, RESTAURANTES Y CIUDADES ================= */}
      <View style={styles.searchBoxWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={primaryColor} />
          <TextInput
            value={mapSearchQuery}
            onChangeText={setMapSearchQuery}
            placeholder="Busca calle, restaurante o ciudad para pinear..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
          {isSearchingMap && <ActivityIndicator size="small" color={primaryColor} />}
          {mapSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setMapSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {mapSearchSuggestions.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            {mapSearchSuggestions.slice(0, 4).map((sug, i) => (
              <TouchableOpacity
                key={`${sug.lat}-${sug.lon}-${i}`}
                onPress={() => handleSelectSearchSuggestion(sug)}
                style={styles.suggestionRow}
              >
                <Ionicons name="location-outline" size={15} color={primaryColor} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {sug.shortName}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {sug.displayName}
                  </Text>
                </View>
                <Text style={[styles.suggestionAction, { color: primaryColor }]}>
                  Ir y Pinear
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ================= FILTRO DE CATEGORÍAS ================= */}
      <View style={{ height: 34, marginBottom: 6 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          <TouchableOpacity
            onPress={() => setActiveCategory('Todos')}
            style={[
              styles.categoryChip,
              activeCategory === 'Todos' && {
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              },
            ]}
          >
            <Ionicons
              name="compass"
              size={12}
              color={activeCategory === 'Todos' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.categoryChipText,
                activeCategory === 'Todos' && { color: '#ffffff', fontWeight: '700' },
              ]}
            >
              Todos ({places.length})
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  isSelected && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={12}
                  color={isSelected ? '#ffffff' : cat.color}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && { color: '#ffffff', fontWeight: '700' },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ================= MAPA REAL INTERACTIVO (ARRASTRAR, ZOOM Y TOCAR PARA PINEAR) ================= */}
      <View
        style={styles.mapFrame}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 60 && height > 60) {
            setMapLayout((prev) =>
              Math.abs(prev.width - width) > 2 || Math.abs(prev.height - height) > 2
                ? { width: Math.round(width), height: Math.round(height) }
                : prev
            );
          }
        }}
      >
        {renderRealTileMap(mapLayout.width, mapLayout.height, inlinePanResponder.panHandlers)}
      </View>

      {/* ================= TARJETA COMPACTA DEL LUGAR SELECCIONADO CON NAVEGACIÓN DE PINES ================= */}
      {selectedPlace && (
        <View
          style={[
            styles.selectedPlaceCard,
            { borderLeftColor: primaryColor, borderLeftWidth: 4 },
          ]}
        >
          <TouchableOpacity
            onPress={() => stepPlace(-1)}
            style={styles.stepPinBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={16} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectedPlaceMainTouch}
            onPress={() => setDetailModalPlace(selectedPlace)}
            activeOpacity={0.88}
          >
            <View style={styles.selectedTopRow}>
              <Text style={[styles.selectedCategoryTag, { color: primaryColor }]}>
                #{currentPlaceIndex + 1}/{filteredPlaces.length} · {selectedPlace.category.toUpperCase()}
              </Text>
              <Text style={styles.selectedDateText}>
                {formatDisplayDate(selectedPlace.date, {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
            <Text style={styles.selectedPlaceTitle} numberOfLines={1}>
              {selectedPlace.title}
            </Text>
            <Text style={styles.selectedPlaceAddress} numberOfLines={1}>
              {selectedPlace.address}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenExternalMaps(selectedPlace)}
            style={[styles.gpsMiniBtn, { backgroundColor: `${primaryColor}15` }]}
          >
            <Ionicons name="navigate" size={14} color={primaryColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => stepPlace(1)}
            style={styles.stepPinBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-forward" size={16} color="#475569" />
          </TouchableOpacity>
        </View>
      )}

      {/* ================= MODAL DE MAPA EN PANTALLA COMPLETA ================= */}
      <Modal
        visible={isFullScreen}
        animationType="slide"
        onRequestClose={() => setIsFullScreen(false)}
      >
        <View style={styles.fullScreenContainer}>
          <View style={styles.fullScreenHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullScreenTitle}>Nuestro Mapa en Vivo</Text>
              <Text style={styles.fullScreenSub}>
                Arrastra el mapa, busca una dirección o toca cualquier calle para pinear
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFullScreen(false)}
              style={styles.closeIconBtn}
            >
              <Ionicons name="close" size={22} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {/* Buscador dentro del Mapa de Pantalla Completa */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 8, zIndex: 80 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={16} color={primaryColor} />
              <TextInput
                value={mapSearchQuery}
                onChangeText={setMapSearchQuery}
                placeholder="Buscar restaurante, calle o ciudad..."
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
              {isSearchingMap && <ActivityIndicator size="small" color={primaryColor} />}
              {mapSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMapSearchQuery('')}>
                  <Ionicons name="close-circle" size={17} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            {mapSearchSuggestions.length > 0 && (
              <View style={[styles.suggestionsDropdown, { top: 46, left: 16, right: 16 }]}>
                {mapSearchSuggestions.slice(0, 4).map((sug, i) => (
                  <TouchableOpacity
                    key={`fs-${sug.lat}-${sug.lon}-${i}`}
                    onPress={() => handleSelectSearchSuggestion(sug)}
                    style={styles.suggestionRow}
                  >
                    <Ionicons name="location-outline" size={15} color={primaryColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionTitle} numberOfLines={1}>
                        {sug.shortName}
                      </Text>
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {sug.displayName}
                      </Text>
                    </View>
                    <Text style={[styles.suggestionAction, { color: primaryColor }]}>
                      Ir y Pinear
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {renderRealTileMap(
            SCREEN_WIDTH,
            fullScreenMapHeight,
            fullScreenPanResponder.panHandlers
          )}
        </View>
      </Modal>

      {/* ================= MODAL DE DETALLE COMPLETO DEL LUGAR ================= */}
      <Modal
        visible={Boolean(detailModalPlace)}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalPlace(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailCard}>
            {detailModalPlace && (
              <>
                <View style={styles.detailHeaderBar}>
                  <View style={[styles.detailBadge, { backgroundColor: `${primaryColor}18` }]}>
                    <Ionicons name="location" size={14} color={primaryColor} />
                    <Text style={[styles.detailBadgeText, { color: primaryColor }]}>
                      {detailModalPlace.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDetailModalPlace(null)}
                    style={styles.closeIconBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {detailModalPlace.imageUri && (
                  <Image
                    source={{ uri: detailModalPlace.imageUri }}
                    style={styles.detailHeroImage}
                  />
                )}

                <Text style={styles.detailTitle}>{detailModalPlace.title}</Text>
                <Text style={styles.detailAddress}>{detailModalPlace.address}</Text>
                <Text style={styles.detailNotes}>“{detailModalPlace.notes}”</Text>

                <View style={styles.detailFooterRow}>
                  <TouchableOpacity
                    onPress={() => handleOpenExternalMaps(detailModalPlace)}
                    style={[styles.detailPrimaryBtn, { backgroundColor: primaryColor }]}
                  >
                    <Ionicons name="navigate" size={16} color="#ffffff" />
                    <Text style={styles.detailPrimaryBtnText}>Cómo llegar (GPS)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeletePlace(detailModalPlace)}
                    style={styles.detailDeleteBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ================= MODAL PARA GUARDAR EL LUGAR PINEADO ================= */}
      <Modal
        visible={isAddModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.addModalCard}>
            <View style={styles.detailHeaderBar}>
              <View>
                <Text style={styles.addModalTitle}>Guardar Pin en el Mapa</Text>
                <Text style={styles.addModalSub}>
                  Coordenadas: {newLat.toFixed(4)}, {newLon.toFixed(4)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAddModalOpen(false)}
                style={styles.closeIconBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Nombre de este lugar especial</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="Ej. Restaurante de nuestro aniversario"
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>Dirección detectada</Text>
              <TextInput
                value={newAddress}
                onChangeText={setNewAddress}
                placeholder="Calle, colonia o ciudad..."
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>Categoría</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 12 }}
              >
                {CATEGORIES.map((cat) => {
                  const selected = newCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setNewCategory(cat.id)}
                      style={[
                        styles.categoryChip,
                        selected && { backgroundColor: cat.color, borderColor: cat.color },
                      ]}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={13}
                        color={selected ? '#ffffff' : cat.color}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && { color: '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Fecha del momento</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                <Ionicons name="calendar-outline" size={18} color={primaryColor} />
                <Text style={styles.dateButtonText}>
                  {formatDisplayDate(newDate, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Recuerdo o nota especial</Text>
              <TextInput
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="¿Qué pasó aquí que nunca quieren olvidar?"
                placeholderTextColor="#94a3b8"
                multiline
                style={[styles.textInput, { minHeight: 68, textAlignVertical: 'top' }]}
              />

              <TouchableOpacity onPress={handlePickPlacePhoto} style={styles.photoPickerBtn}>
                <Ionicons name="camera-outline" size={18} color={primaryColor} />
                <Text style={[styles.photoPickerBtnText, { color: primaryColor }]}>
                  {newImageUri
                    ? 'Fotografía seleccionada (Cambiar)'
                    : 'Adjuntar foto del lugar (Opcional)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleAddPlace()}
                style={[styles.savePlaceBtn, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="location" size={18} color="#ffffff" />
                <Text style={styles.savePlaceBtnText}>Guardar Pin en Nuestro Mapa</Text>
              </TouchableOpacity>
            </ScrollView>

            <DatePickerModal
              visible={showDatePicker}
              value={newDate}
              onSelect={(d) => setNewDate(d)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de nuestra visita"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const makeStyles = (c: ThemePalette) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  statsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: FONTS.sans,
  },
  newPinBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newPinBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.primaryOn,
    fontFamily: FONTS.sans,
  },
  searchBoxWrapper: {
    marginBottom: 6,
    zIndex: 50,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: c.border,
    gap: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: c.text,
    fontFamily: FONTS.sans,
    paddingVertical: 0,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    backgroundColor: c.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 99,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  suggestionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.text,
  },
  suggestionSub: {
    fontSize: 10.5,
    color: c.textSecondary,
  },
  suggestionAction: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  categoriesScroll: {
    gap: 6,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textSecondary,
    fontFamily: FONTS.sans,
  },
  mapFrame: {
    width: '100%',
    flex: 1,
    minHeight: 200,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  realMapViewport: {
    position: 'relative',
    overflow: 'hidden',
  },
  tileErrorBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 50,
  },
  tileErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tileErrorText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tileRetryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tileRetryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  routeSegment: {
    position: 'absolute',
    height: 3.5,
    borderRadius: 2,
    opacity: 0.82,
    zIndex: 12,
  },
  draftPinAnchor: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -62 }, { translateY: -44 }],
    zIndex: 45,
  },
  draftPinActionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  draftPinActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.primaryOn,
  },
  draftPinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.surface,
    borderWidth: 3.5,
    marginTop: 3,
  },
  pinAnchor: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -18 }, { translateY: -18 }],
  },
  pinPulseHalo: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    top: -6,
  },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  pinOrderBadge: {
    position: 'absolute',
    top: -5,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinOrderText: {
    fontSize: 8,
    fontWeight: '800',
    color: c.primaryOn,
  },
  pinLabelTag: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    maxWidth: 120,
  },
  pinLabelText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: c.primaryOn,
    fontFamily: FONTS.sans,
  },
  centerCrosshair: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: [{ translateX: -8 }, { translateY: -8 }],
    zIndex: 5,
  },
  pinDropBanner: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    zIndex: 50,
  },
  pinDropBannerText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: c.primaryOn,
  },
  bottomMapBar: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 40,
  },
  pinHereBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  pinHereBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.primaryOn,
  },
  pinCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  pinCenterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.text,
  },
  mapRightControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    zIndex: 45,
  },
  mapControlBtn: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 3,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: c.surface,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  fullScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
    fontFamily: FONTS.serif,
  },
  fullScreenSub: {
    fontSize: 12,
    color: c.textSecondary,
  },
  selectedPlaceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 6,
    borderWidth: 1,
    borderColor: c.border,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  stepPinBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  selectedPlaceMainTouch: {
    flex: 1,
  },
  gpsMiniBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 1,
  },
  selectedCategoryTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: FONTS.sans,
  },
  selectedDateText: {
    fontSize: 10,
    color: c.textMuted,
    fontFamily: FONTS.sans,
  },
  selectedPlaceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.text,
    fontFamily: FONTS.serif,
  },
  selectedPlaceAddress: {
    fontSize: 11,
    color: c.textSecondary,
    fontFamily: FONTS.sans,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
  },
  detailHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeroImage: {
    width: '100%',
    height: 170,
    borderRadius: 16,
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    fontFamily: FONTS.serif,
  },
  detailAddress: {
    fontSize: 13,
    color: c.textSecondary,
    marginTop: 3,
  },
  detailNotes: {
    fontSize: 14,
    color: c.textSecondary,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 20,
  },
  detailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  detailPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  detailPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.primaryOn,
  },
  detailDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: c.surface,
    borderRadius: 24,
    padding: 20,
  },
  addModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: c.text,
    fontFamily: FONTS.serif,
  },
  addModalSub: {
    fontSize: 12,
    color: c.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: c.text,
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.text,
    textTransform: 'capitalize',
  },
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
    marginTop: 8,
  },
  photoPickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  savePlaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
  },
  savePlaceBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.primaryOn,
  },
});

import React from 'react';
import { View } from 'react-native';
import {
  Plus, PlusCircle, BarChart3, Undo2, Delete, Ship, BookOpen, Lightbulb, Calendar, Camera,
  Check, CheckCircle2, CheckCheck, ChevronLeft, ChevronRight, X, XCircle, Palette, Compass,
  Pencil, Maximize2, Minimize2, Film, Fingerprint, Flame, Heart, HeartCrack, Hourglass, Home,
  Image as ImageIcon, Images, Infinity as InfinityIcon, Gamepad2, Keyboard, MapPin, Lock, LockOpen,
  MailOpen, Mail, Map as MapIcon, Mic, Navigation, UserCircle, SkipForward, Radio, RefreshCw,
  RotateCw, Minus, Utensils, Search, Send, ShieldCheck, Shield, Shuffle, Skull, Sparkles, Star,
  ArrowLeftRight, Clock, Download, Trash2, Trophy, Pause, Play, Square, Sun, Moon, Eye, Plane, Coffee,
  LayoutGrid, Grid3x3, Puzzle, Crosshair, Circle, Info, Bell, Settings,
  Gift, Tv, PenLine, Quote,
} from 'lucide-react-native';

type LucideComp = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

// Un solo set de íconos (Lucide) con el mismo grosor en toda la app.
export const ICON_STROKE = 2;

const ICON_MAP: Record<string, LucideComp> = {
  add: Plus,
  'add-circle': PlusCircle,
  'add-circle-outline': PlusCircle,
  'analytics-outline': BarChart3,
  'stats-chart': BarChart3,
  'stats-chart-outline': BarChart3,
  'arrow-undo': Undo2,
  'arrow-undo-outline': Undo2,
  'backspace-outline': Delete,
  boat: Ship,
  'book-outline': BookOpen,
  bulb: Lightbulb,
  calendar: Calendar,
  'calendar-outline': Calendar,
  camera: Camera,
  'camera-outline': Camera,
  checkmark: Check,
  'checkmark-circle': CheckCircle2,
  'checkmark-circle-outline': CheckCircle2,
  'checkmark-done': CheckCheck,
  'chevron-back': ChevronLeft,
  'chevron-forward': ChevronRight,
  close: X,
  'close-circle': XCircle,
  'color-palette-outline': Palette,
  compass: Compass,
  'contract-outline': Minimize2,
  'download': Download,
  'download-outline': Download,
  'eye-outline': Eye,
  'archive': BookOpen,
  'share-outline': Send,
  'share-social': Send,
  'create-outline': Pencil,
  'expand-outline': Maximize2,
  film: Film,
  'film-outline': Film,
  'finger-print-outline': Fingerprint,
  flame: Flame,
  heart: Heart,
  'heart-outline': Heart,
  'heart-dislike-outline': HeartCrack,
  hourglass: Hourglass,
  'hourglass-outline': Hourglass,
  home: Home,
  'home-outline': Home,
  'image-outline': ImageIcon,
  images: Images,
  'images-outline': Images,
  infinite: InfinityIcon,
  'game-controller': Gamepad2,
  'game-controller-outline': Gamepad2,
  'keypad-outline': Keyboard,
  location: MapPin,
  'location-outline': MapPin,
  locate: Crosshair,
  'lock-closed': Lock,
  'lock-closed-outline': Lock,
  'lock-open': LockOpen,
  'mail-open-outline': MailOpen,
  'mail-outline': Mail,
  map: MapIcon,
  'map-outline': MapIcon,
  mic: Mic,
  'mic-outline': Mic,
  navigate: Navigation,
  pencil: Pencil,
  'person-circle-outline': UserCircle,
  'play-forward': SkipForward,
  radio: Radio,
  remove: Minus,
  // Búsqueda
  search: Search,
  'search-outline': Search,
  // Restaurante / Comida
  restaurant: Utensils,
  'restaurant-outline': Utensils,
  'fast-food': Utensils,
  'fast-food-outline': Utensils,
  // Correo / Cartas
  mail: Mail,
  'mail-open': MailOpen,
  // Recarga / Reset
  reload: RefreshCw,
  'reload-outline': RefreshCw,
  refresh: RefreshCw,
  'refresh-outline': RefreshCw,
  'refresh-circle': RefreshCw,
  sync: RotateCw,
  send: Send,
  'shield-checkmark': ShieldCheck,
  'shield-checkmark-outline': ShieldCheck,
  shield: Shield,
  shuffle: Shuffle,
  skull: Skull,
  sparkles: Sparkles,
  'sparkles-outline': Sparkles,
  star: Star,
  'star-outline': Star,
  'swap-horizontal': ArrowLeftRight,
  'time-outline': Clock,
  'trash-outline': Trash2,
  trophy: Trophy,
  'trophy-outline': Trophy,
  pause: Pause,
  play: Play,
  stop: Square,
  'sunny-outline': Sun,
  'moon-outline': Moon,
  eye: Eye,
  airplane: Plane,
  cafe: Coffee,
  grid: Grid3x3,
  apps: LayoutGrid,
  'extension-puzzle': Puzzle,
  settings: Settings,
  'settings-outline': Settings,
  notifications: Bell,
  'notifications-outline': Bell,
  gift: Gift,
  tv: Tv,
  quote: Quote,
  edit: PenLine,
  info: Info,
  'info-circle': Info,
};

// Íconos que se muestran "rellenos" cuando representan un estado activo/lleno
const FILLED_NAMES = new Set(['heart', 'star', 'flame', 'play', 'pause', 'stop']);

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
  fill?: string;
  strokeWidth?: number;
}

const warnedIcons = new Set<string>();

const IconBase: React.FC<IconProps> = ({ name, size = 20, color = '#000', style, fill, strokeWidth }) => {
  const Cmp = ICON_MAP[name];

  if (!Cmp) {
    if (__DEV__ && !warnedIcons.has(name)) {
      warnedIcons.add(name);
      console.warn(`[KMRG Icon] Ícono no registrado en ICON_MAP: "${name}". Agrega su mapeo en src/components/ui/Icon.tsx`);
    }
    const Fallback = Info;
    const node = (
      <Fallback
        size={size}
        color={color}
        strokeWidth={strokeWidth ?? ICON_STROKE}
      />
    );
    return style ? <View style={style}>{node}</View> : node;
  }

  const shouldFill = fill ?? (FILLED_NAMES.has(name) && !name.endsWith('outline') ? color : undefined);
  const node = (
    <Cmp
      size={size}
      color={color}
      strokeWidth={strokeWidth ?? ICON_STROKE}
      fill={shouldFill ?? 'none'}
    />
  );
  return style ? <View style={style}>{node}</View> : node;
};

// Compatibilidad: mismo nombre y API que Ionicons, pero renderiza Lucide.
export const Ionicons = Object.assign(IconBase, {
  glyphMap: ICON_MAP as Record<string, unknown>,
});

export const Icon = IconBase;

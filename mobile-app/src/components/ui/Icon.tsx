import React from 'react';
import { View } from 'react-native';
import {
  Plus, PlusCircle, BarChart3, Undo2, Delete, Ship, BookOpen, Lightbulb, Calendar, Camera,
  Check, CheckCircle2, CheckCheck, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, XCircle, Palette, Compass,
  Pencil, Maximize2, Minimize2, Film, Fingerprint, Flame, Heart, HeartCrack, HeartHandshake, Hourglass, Home,
  Image as ImageIcon, Images, Infinity as InfinityIcon, Gamepad2, Keyboard, MapPin, Lock, LockOpen,
  MailOpen, Mail, Map as MapIcon, Mic, Navigation, UserCircle, SkipForward, Radio, RefreshCw,
  RotateCw, Minus, Utensils, Search, Send, ShieldCheck, Shield, Shuffle, Skull, Sparkles, Star,
  ArrowLeftRight, ArrowLeft, ArrowRight, Clock, Download, Trash2, Trophy, Pause, Play, PlayCircle, Square, Sun, Moon, Eye, Plane, Coffee,
  LayoutGrid, Grid3x3, Puzzle, Crosshair, Circle, Info, Bell, Settings,
  Gift, Tv, PenLine, Quote, Menu,
  // Features v2
  HelpCircle, Brain, PiggyBank, Cake, NotebookPen, Upload, Music, Link, Wallet, CalendarHeart,
  CalendarClock, Smile, ExternalLink, FileJson, CalendarDays, Ticket, Brush, Award, Disc,
  LogOut, User,
  // Iconos adicionales completados pre-APK
  Activity, AlertCircle, Archive, Bookmark, CloudOff, CornerDownLeft, Flower2, Folder, FolderOpen,
  KeyRound, Layers, LifeBuoy, MessageCircle, Move, PaintBucket, Scale,
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
  'bulb-outline': Lightbulb,
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
  'color-palette': Palette,
  'color-palette-outline': Palette,
  compass: Compass,
  'contract-outline': Minimize2,
  'download': Download,
  'download-outline': Download,
  'eye-outline': Eye,
  'archive': BookOpen,
  'alert-circle-outline': Info,
  'chevron-down': ChevronDown,
  'paper-plane': Send,
  'checkmark-done-circle': CheckCheck,
  'bar-chart-outline': BarChart3,
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
  'heart-dislike': HeartCrack,
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
  menu: Menu,
  'menu-outline': Menu,
  navigate: Navigation,
  pencil: Pencil,
  person: User,
  'person-outline': User,
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
  'swap-vertical-outline': ArrowLeftRight,
  'time-outline': Clock,
  'trash-outline': Trash2,
  trophy: Trophy,
  'trophy-outline': Trophy,
  pause: Pause,
  play: Play,
  stop: Square,
  sunny: Sun,
  'sunny-outline': Sun,
  moon: Moon,
  'moon-outline': Moon,
  'log-out-outline': LogOut,
  eye: Eye,
  airplane: Plane,
  cafe: Coffee,
  grid: Grid3x3,
  apps: LayoutGrid,
  'apps-outline': LayoutGrid,
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
  // ── Features v2 ──
  'help-circle': HelpCircle,
  'help-circle-outline': HelpCircle,
  brain: Brain,
  'piggy-bank': PiggyBank,
  cake: Cake,
  'cake-outline': Cake,
  journal: NotebookPen,
  'journal-outline': NotebookPen,
  'cloud-upload': Upload,
  'cloud-upload-outline': Upload,
  'musical-notes': Music,
  'musical-notes-outline': Music,
  link: Link,
  wallet: Wallet,
  'wallet-outline': Wallet,
  'calendar-heart': CalendarHeart,
  'calendar-clock': CalendarClock,
  'calendar-days': CalendarDays,
  happy: Smile,
  'happy-outline': Smile,
  'open-outline': ExternalLink,
  'document-text-outline': FileJson,
  ticket: Ticket,
  'ticket-outline': Ticket,
  brush: Brush,
  'brush-outline': Brush,
  ribbon: Award,
  'ribbon-outline': Award,
  disc: Disc,
  'disc-outline': Disc,
  image: ImageIcon,
  'chevron-up': ChevronUp,
  'finger-print': Fingerprint,
  'archive-outline': Archive,
  'alert-circle': AlertCircle,
  'cloud-download-outline': Download,
  'cloud-offline-outline': CloudOff,
  'folder-outline': Folder,
  'folder-open-outline': FolderOpen,
  expand: Maximize2,
  trash: Trash2,
  'information-circle': Info,
  'information-circle-outline': Info,
  'radio-button-on': CheckCircle2,
  'radio-button-off': Circle,
  'logo-youtube': PlayCircle,
  'musical-note': Music,
  'link-outline': Link,
  move: Move,
  'heart-half': HeartHandshake,
  'scale-outline': Scale,
  'refresh-circle-outline': RefreshCw,
  'grid-outline': Grid3x3,
  'extension-puzzle-outline': Puzzle,
  'shield-half-outline': Shield,
  'boat-outline': Ship,
  'return-down-back': CornerDownLeft,
  'color-fill-outline': PaintBucket,
  'play-circle-outline': PlayCircle,
  'arrow-forward': ArrowRight,
  'arrow-back': ArrowLeft,
  'albums-outline': Layers,
  pulse: Activity,
  key: KeyRound,
  bookmark: Bookmark,
  time: Clock,
  'cafe-outline': Coffee,
  'chatbubbles-outline': MessageCircle,
  'flower-outline': Flower2,
  'help-buoy-outline': LifeBuoy,
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

export interface Message {
  id: string;
  sender?: string;
  recipient?: string;
  content: string;
  scheduled_date: string;
  theme_color: string;
  is_read: boolean;
  created_at: string;
}

export interface Milestone {
  id: string;
  author?: string;
  title: string;
  date: string;
  image_url: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  sender?: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export type UserProfile = 'Javier' | 'Karla';

export interface PartnerProfileInfo {
  id: UserProfile;
  displayName: string;
  avatarUri?: string | null;
}

export interface CouplePetState {
  name: string;
  happiness: number; // 0..100
  xp: number; // 0..100
  level: number;
  heartsFedTotal: number;
  lastFedAt: string; // ISO string
  lastFedBy?: UserProfile;
  accessory?: 'none' | 'crown' | 'party_hat' | 'flower' | 'sunglasses';
  unlockedAccessories?: string[];
}

export type RootTabParamList = {
  Hoy: undefined;
  Cine: undefined;
  Escribir: undefined;
  Juegos: undefined;
  Nosotros: undefined;
};

export interface UserMood {
  emoji: string;
  status: string;
  feeling?: string;
  song?: string;
  updatedAt: string;
}

export interface LoveReason {
  id: string;
  author: UserProfile;
  text: string;
}

export interface VoiceNoteData {
  id: string;
  sender: UserProfile;
  title: string;
  durationSeconds: number;
  waveform: number[];
  audioUri?: string;
  transcript?: string;
  createdAt: string;
}

export interface TimeCapsuleItem {
  id: string;
  sender: UserProfile;
  recipient: UserProfile;
  title: string;
  occasion: string;
  content: string;
  unlockDate: string; // YYYY-MM-DD
  themeColor: string;
  createdAt: string;
  openedAt?: string;
  photoUrl?: string;
  audioUri?: string;
}

export type PlaceCategory =
  | 'Restaurante'
  | 'Viaje'
  | 'Primera Vez'
  | 'Cita Especial'
  | 'Mirador'
  | 'Cafetería';

export interface SpecialPlace {
  id: string;
  title: string;
  category: PlaceCategory;
  address: string;
  date: string;
  notes: string;
  rating: number;
  latitude: number;
  longitude: number;
  mapX: number; // 10..90 % en el lienzo cartográfico
  mapY: number; // 12..88 % en el lienzo cartográfico
  imageUri?: string;
  addedBy: UserProfile;
  favorite?: boolean;
}

export interface QuickNoteMessage {
  id: string;
  sender: UserProfile;
  text?: string;
  sticker?: string;
  audioUri?: string;
  audioDurationSeconds?: number;
  photoUrl?: string;
  createdAt: string;
}

export interface TodaySongData {
  title: string;
  artist: string;
  dedication?: string;
  addedBy: UserProfile;
  url?: string;
  updatedAt: string;
}

export interface HomeState {
  anniversaryDate: string; // YYYY-MM-DD
  nextEventTitle: string;
  nextEventDate: string; // YYYY-MM-DD
  streakCount: number;
  lastInteractionDate: string;
  moods: {
    Javier: UserMood;
    Karla: UserMood;
  };
  stickyNote: {
    author: UserProfile;
    text: string;
    updatedAt: string;
  };
  loveReasons: LoveReason[];
  voiceNotes?: VoiceNoteData[];
  timeCapsules?: TimeCapsuleItem[];
  couplePet?: CouplePetState;
  partnerProfiles?: {
    Karla: PartnerProfileInfo;
    Javier: PartnerProfileInfo;
  };
  pushTokens?: {
    Karla?: string;
    Javier?: string;
  };
  quickNotes?: QuickNoteMessage[];
  todaySong?: TodaySongData;
}

export interface MovieItem {
  id: string;
  title: string;
  genre: string;
  addedBy: UserProfile;
  watched: boolean;
  watchedDate?: string;
  ratingJavier?: number;
  ratingKarla?: number;
  notes?: string;
  posterUrl?: string;
  year?: string;
  director?: string;
  synopsis?: string;
}

export interface BucketItem {
  id: string;
  title: string;
  completed: boolean;
  completedDate?: string;
  addedBy: UserProfile;
}

export interface MoviesAndPlansState {
  movies: MovieItem[];
  bucketList: BucketItem[];
  foodOptions: string[];
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from './ProfileContext';
import { useTheme } from './ThemeContext';
import {
  getHomeState,
  saveHomeState,
  subscribeHomeState,
  DEFAULT_HOME_STATE,
} from '../services/CoupleSyncService';
import { toLocalDateString } from '../services/StorageService';
import { fetchDailyAnswers, subscribeDailyAnswers } from '../services/feature/dailyQuestionService';
import { getCachedCoupons, subscribeCoupons } from '../services/feature/couponsService';
import {
  HomeState,
  TodaySongData,
  VoiceNoteData,
  UserProfile,
} from '../types';

import { FeatureModalShell } from '../components/features/FeatureModalShell';
import { DailyQuestionModal } from '../components/features/DailyQuestionModal';
import { QuizModal } from '../components/features/QuizModal';
import { GratitudeModal } from '../components/features/GratitudeModal';
import { CoupleEventsModal } from '../components/features/CoupleEventsModal';
import { ImportantDatesModal } from '../components/features/ImportantDatesModal';
import { SavingsModal } from '../components/features/SavingsModal';
import { SecuritySettingsModal } from '../components/features/SecuritySettingsModal';
import { BackupModal } from '../components/features/BackupModal';
import { CouponsModal } from '../components/features/CouponsModal';
import { DateRouletteModal } from '../components/features/DateRouletteModal';
import { FirstTimesModal } from '../components/features/FirstTimesModal';
import { NapkinDoodleModal } from '../components/features/NapkinDoodleModal';

import { TodaySongWidget } from '../components/TodaySongWidget';
import { VoiceNoteWidget } from '../components/VoiceNoteWidget';
import { CoupleSidebarDrawer } from '../components/features/CoupleSidebarDrawer';

export type CoupleFeatureKey =
  | 'daily_question'
  | 'coupons'
  | 'date_roulette'
  | 'napkin_doodle'
  | 'first_times'
  | 'today_song'
  | 'voice_notes'
  | 'quiz'
  | 'gratitude'
  | 'events'
  | 'important_dates'
  | 'savings'
  | 'security'
  | 'backup';

export interface CoupleFeaturesContextType {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  activeFeature: CoupleFeatureKey | null;
  openFeature: (key: CoupleFeatureKey) => void;
  closeFeature: () => void;
  homeState: HomeState;
  refreshHomeState: () => Promise<void>;
  saveSong: (song: TodaySongData) => Promise<void>;
  saveVoiceNote: (note: VoiceNoteData) => Promise<void>;
  deleteVoiceNote: (id: string) => Promise<void>;
  hasPendingSidebarNotice: boolean;
  seenFeatures: string[];
  markFeatureAsSeen: (key: string) => Promise<void>;
  isFeatureNew: (key: string, defaultBadge?: string) => boolean;
}

const CoupleFeaturesContext = createContext<CoupleFeaturesContextType>({
  isSidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
  toggleSidebar: () => {},
  activeFeature: null,
  openFeature: () => {},
  closeFeature: () => {},
  homeState: DEFAULT_HOME_STATE,
  refreshHomeState: async () => {},
  saveSong: async () => {},
  saveVoiceNote: async () => {},
  deleteVoiceNote: async () => {},
  hasPendingSidebarNotice: false,
  seenFeatures: [],
  markFeatureAsSeen: async () => {},
  isFeatureNew: () => false,
});

export const useCoupleFeatures = () => useContext(CoupleFeaturesContext);

export const CoupleFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  const { primaryColor } = useTheme();
  const activeProfile: UserProfile = profile || 'Karla';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasPendingSidebarNotice, setHasPendingSidebarNotice] = useState(false);

  useEffect(() => {
    let active = true;
    const checkSidebarPending = async () => {
      try {
        const todayStr = toLocalDateString(new Date());
        const [answers, coupons] = await Promise.all([
          fetchDailyAnswers(false),
          getCachedCoupons(),
        ]);
        if (!active) return;
        const answeredToday = answers.some(
          (r) =>
            toLocalDateString(r.question_date) === todayStr &&
            r.profile === activeProfile &&
            Boolean(r.answer)
        );
        const hasUnusedCoupon = coupons.some(
          (c) => c.recipient === activeProfile && !c.is_redeemed
        );
        setHasPendingSidebarNotice(!answeredToday || hasUnusedCoupon);
      } catch {
        // Ignorar errores de caché
      }
    };

    void checkSidebarPending();
    const unsubAnswers = subscribeDailyAnswers(() => void checkSidebarPending());
    const unsubCoupons = subscribeCoupons(() => void checkSidebarPending());
    return () => {
      active = false;
      unsubAnswers();
      unsubCoupons();
    };
  }, [activeProfile]);
  const [activeFeature, setActiveFeature] = useState<CoupleFeatureKey | null>(null);
  const [homeState, setHomeState] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [seenFeatures, setSeenFeatures] = useState<string[]>([]);

  const SEEN_FEATURES_STORAGE_KEY = `@kmrg_seen_sidebar_features_${activeProfile}`;

  useEffect(() => {
    let isMounted = true;
    void AsyncStorage.getItem(SEEN_FEATURES_STORAGE_KEY).then((stored) => {
      if (stored && isMounted) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSeenFeatures(parsed);
          }
        } catch {}
      }
    });
    return () => {
      isMounted = false;
    };
  }, [SEEN_FEATURES_STORAGE_KEY]);

  const markFeatureAsSeen = useCallback(async (key: string) => {
    setSeenFeatures((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      void AsyncStorage.setItem(SEEN_FEATURES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [SEEN_FEATURES_STORAGE_KEY]);

  const isFeatureNew = useCallback(
    (key: string, defaultBadge?: string) => {
      if (defaultBadge !== 'Nuevo') return false;
      return !seenFeatures.includes(key);
    },
    [seenFeatures]
  );

  const refreshHomeState = useCallback(async () => {
    try {
      const data = await getHomeState();
      if (data) {
        setHomeState(data);
      }
    } catch {
      // Ignorar error de carga local
    }
  }, []);

  useEffect(() => {
    void refreshHomeState();
    const unsub = subscribeHomeState((s) => {
      setHomeState(s);
    });
    return () => {
      unsub();
    };
  }, [refreshHomeState]);

  const openSidebar = useCallback(() => {
    void refreshHomeState();
    setIsSidebarOpen(true);
  }, [refreshHomeState]);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const openFeature = useCallback((key: CoupleFeatureKey) => {
    void markFeatureAsSeen(key);
    setIsSidebarOpen(false);
    // Leve delay para permitir que la animación de la barra lateral se cierre suavemente
    setTimeout(() => {
      setActiveFeature(key);
    }, 180);
  }, [markFeatureAsSeen]);

  const closeFeature = useCallback(() => {
    setActiveFeature(null);
  }, []);

  const saveSong = async (newSong: TodaySongData) => {
    const nextHome: HomeState = {
      ...homeState,
      todaySong: newSong,
    };
    setHomeState(nextHome);
    await saveHomeState(activeProfile, nextHome);
  };

  const saveVoiceNote = async (newNote: VoiceNoteData) => {
    const nextHome: HomeState = {
      ...homeState,
      voiceNotes: [newNote, ...(homeState.voiceNotes || [])],
    };
    setHomeState(nextHome);
    await saveHomeState(activeProfile, nextHome);
  };

  const deleteVoiceNote = async (id: string) => {
    const nextHome: HomeState = {
      ...homeState,
      voiceNotes: (homeState.voiceNotes || []).filter((vn) => vn.id !== id),
      deletedIds: Array.from(new Set([...(homeState.deletedIds || []), id])).slice(-200),
    };
    setHomeState(nextHome);
    await saveHomeState(activeProfile, nextHome);
  };

  return (
    <CoupleFeaturesContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        activeFeature,
        openFeature,
        closeFeature,
        homeState,
        refreshHomeState,
        saveSong,
        saveVoiceNote,
        deleteVoiceNote,
        hasPendingSidebarNotice,
        seenFeatures,
        markFeatureAsSeen,
        isFeatureNew,
      }}
    >
      {children}

      {/* Cajón / Barra Lateral Deslizable de Nuestro Rincón */}
      <CoupleSidebarDrawer />

      {/* Modales globales montados perezosamente solo cuando están activos */}
      {activeFeature === 'daily_question' && (
        <DailyQuestionModal visible onClose={closeFeature} />
      )}
      {activeFeature === 'coupons' && (
        <CouponsModal visible onClose={closeFeature} />
      )}
      {activeFeature === 'date_roulette' && (
        <DateRouletteModal visible onClose={closeFeature} />
      )}
      {activeFeature === 'napkin_doodle' && (
        <NapkinDoodleModal visible onClose={closeFeature} />
      )}
      {activeFeature === 'first_times' && (
        <FirstTimesModal visible onClose={closeFeature} />
      )}

      {/* Modal de Canción del Día */}
      {activeFeature === 'today_song' && (
        <FeatureModalShell
          visible
          onClose={closeFeature}
          title="Canción del Día"
          subtitle="Nuestra melodía especial y dedicatoria"
          icon="musical-notes"
        >
          <View style={styles.widgetModalContent}>
            <TodaySongWidget
              song={homeState.todaySong}
              currentProfile={activeProfile}
              primaryColor={primaryColor}
              onSaveSong={saveSong}
            />
          </View>
        </FeatureModalShell>
      )}

      {/* Modal de Notas de Voz */}
      {activeFeature === 'voice_notes' && (
        <FeatureModalShell
          visible
          onClose={closeFeature}
          title="Notas de Voz"
          subtitle="Mensajitos y audios de amor guardados"
          icon="mic"
        >
          <View style={styles.widgetModalContent}>
            <VoiceNoteWidget
              voiceNotes={homeState.voiceNotes || []}
              currentProfile={activeProfile}
              primaryColor={primaryColor}
              onSaveVoiceNote={saveVoiceNote}
              onDeleteVoiceNote={deleteVoiceNote}
            />
          </View>
        </FeatureModalShell>
      )}

      {activeFeature === 'quiz' && <QuizModal visible onClose={closeFeature} />}
      {activeFeature === 'gratitude' && <GratitudeModal visible onClose={closeFeature} />}
      {activeFeature === 'events' && <CoupleEventsModal visible onClose={closeFeature} />}
      {activeFeature === 'important_dates' && <ImportantDatesModal visible onClose={closeFeature} />}
      {activeFeature === 'savings' && <SavingsModal visible onClose={closeFeature} />}
      {activeFeature === 'security' && <SecuritySettingsModal visible onClose={closeFeature} />}
      {activeFeature === 'backup' && <BackupModal visible onClose={closeFeature} />}
    </CoupleFeaturesContext.Provider>
  );
};

const styles = StyleSheet.create({
  widgetModalContent: {
    paddingBottom: 24,
  },
});

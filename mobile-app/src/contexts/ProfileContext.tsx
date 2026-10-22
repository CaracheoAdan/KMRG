import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PartnerProfileInfo, UserProfile } from '../types';
import {
  getCurrentProfile,
  setCurrentProfile as persistProfile,
  resetCurrentProfile as clearProfile,
} from '../services/StorageService';
import { getHomeState, saveHomeState } from '../services/CoupleSyncService';
import { supabase } from '../config/supabase';

const PARTNER_PROFILES_STORAGE_KEY = '@kmrg_partner_profiles_v1';

export type PartnerProfilesMap = {
  Karla: PartnerProfileInfo;
  Javier: PartnerProfileInfo;
};

const DEFAULT_PARTNER_PROFILES: PartnerProfilesMap = {
  Karla: { id: 'Karla', displayName: 'Karlita', avatarUri: null },
  Javier: { id: 'Javier', displayName: 'Javier', avatarUri: null },
};

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  partnerProfiles: PartnerProfilesMap;
  setProfile: (p: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  getDisplayName: (role?: UserProfile | null) => string;
  getAvatarUri: (role?: UserProfile | null) => string | null;
  updatePartnerProfile: (
    role: UserProfile,
    updates: { displayName?: string; avatarUri?: string | null }
  ) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  isLoading: true,
  partnerProfiles: DEFAULT_PARTNER_PROFILES,
  setProfile: async () => {},
  logout: async () => {},
  getDisplayName: (role) => (role === 'Javier' ? 'Javier' : 'Karlita'),
  getAvatarUri: () => null,
  updatePartnerProfile: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [partnerProfiles, setPartnerProfiles] =
    useState<PartnerProfilesMap>(DEFAULT_PARTNER_PROFILES);

  const loadPartnerProfiles = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(PARTNER_PROFILES_STORAGE_KEY);
      let localMap = DEFAULT_PARTNER_PROFILES;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PartnerProfilesMap>;
        localMap = {
          Karla: {
            id: 'Karla',
            displayName: parsed.Karla?.displayName?.trim() || 'Karlita',
            avatarUri: parsed.Karla?.avatarUri || null,
          },
          Javier: {
            id: 'Javier',
            displayName: parsed.Javier?.displayName?.trim() || 'Javier',
            avatarUri: parsed.Javier?.avatarUri || null,
          },
        };
      }
      const home = await getHomeState();
      if (home.partnerProfiles) {
        localMap = {
          Karla: {
            id: 'Karla',
            displayName:
              home.partnerProfiles.Karla?.displayName?.trim() ||
              localMap.Karla.displayName ||
              'Karlita',
            avatarUri:
              home.partnerProfiles.Karla?.avatarUri ?? localMap.Karla.avatarUri ?? null,
          },
          Javier: {
            id: 'Javier',
            displayName:
              home.partnerProfiles.Javier?.displayName?.trim() ||
              localMap.Javier.displayName ||
              'Javier',
            avatarUri:
              home.partnerProfiles.Javier?.avatarUri ?? localMap.Javier.avatarUri ?? null,
          },
        };
      }
      setPartnerProfiles(localMap);
    } catch {
      // Fallback to defaults
    }
  }, []);

  useEffect(() => {
    Promise.all([getCurrentProfile(), loadPartnerProfiles()])
      .then(([savedProfile]) => {
        setProfileState(savedProfile);
      })
      .finally(() => setIsLoading(false));

    const channel = supabase
      .channel('kmrg-profile-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'interactions' },
        (payload: any) => {
          if (payload.new?.type === 'sync_home_state') {
            void loadPartnerProfiles();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadPartnerProfiles]);

  const setProfile = async (p: UserProfile) => {
    await persistProfile(p);
    setProfileState(p);
  };

  const logout = async () => {
    await clearProfile();
    setProfileState(null);
  };

  const getDisplayName = useCallback(
    (role?: UserProfile | null): string => {
      const target = role || profile || 'Karla';
      return (
        partnerProfiles[target]?.displayName?.trim() ||
        (target === 'Karla' ? 'Karlita' : 'Javier')
      );
    },
    [partnerProfiles, profile]
  );

  const getAvatarUri = useCallback(
    (role?: UserProfile | null): string | null => {
      const target = role || profile || 'Karla';
      return partnerProfiles[target]?.avatarUri || null;
    },
    [partnerProfiles, profile]
  );

  const updatePartnerProfile = useCallback(
    async (
      role: UserProfile,
      updates: { displayName?: string; avatarUri?: string | null }
    ) => {
      const fallbackName = role === 'Karla' ? 'Karlita' : 'Javier';
      const cleanedName =
        updates.displayName !== undefined
          ? updates.displayName.trim() || fallbackName
          : partnerProfiles[role].displayName;
      const nextAvatar =
        updates.avatarUri !== undefined ? updates.avatarUri : partnerProfiles[role].avatarUri;

      const nextMap: PartnerProfilesMap = {
        ...partnerProfiles,
        [role]: {
          id: role,
          displayName: cleanedName,
          avatarUri: nextAvatar ?? null,
        },
      };

      setPartnerProfiles(nextMap);
      await AsyncStorage.setItem(PARTNER_PROFILES_STORAGE_KEY, JSON.stringify(nextMap));

      try {
        const home = await getHomeState();
        await saveHomeState(role, {
          ...home,
          partnerProfiles: nextMap,
        });
      } catch {
        // Ignore sync error
      }
    },
    [partnerProfiles]
  );

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        partnerProfiles,
        setProfile,
        logout,
        getDisplayName,
        getAvatarUri,
        updatePartnerProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);

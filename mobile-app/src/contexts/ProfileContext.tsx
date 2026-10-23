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
  saveProfileSettings: (params: {
    myRole: UserProfile;
    myDisplayName: string;
    myAvatarUri?: string | null;
    partnerRole?: UserProfile;
    partnerDisplayName?: string;
  }) => Promise<void>;
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
  saveProfileSettings: async () => {},
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
              home.partnerProfiles.Karla?.avatarUri || localMap.Karla.avatarUri || null,
          },
          Javier: {
            id: 'Javier',
            displayName:
              home.partnerProfiles.Javier?.displayName?.trim() ||
              localMap.Javier.displayName ||
              'Javier',
            avatarUri:
              home.partnerProfiles.Javier?.avatarUri || localMap.Javier.avatarUri || null,
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

  const saveProfileSettings = useCallback(
    async (params: {
      myRole: UserProfile;
      myDisplayName: string;
      myAvatarUri?: string | null;
      partnerRole?: UserProfile;
      partnerDisplayName?: string;
    }) => {
      const { myRole, myDisplayName, myAvatarUri, partnerRole, partnerDisplayName } = params;

      let baseMap: PartnerProfilesMap = { ...partnerProfiles };
      try {
        const raw = await AsyncStorage.getItem(PARTNER_PROFILES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PartnerProfilesMap>;
          baseMap = {
            Karla: {
              id: 'Karla',
              displayName: parsed.Karla?.displayName?.trim() || baseMap.Karla.displayName || 'Karlita',
              avatarUri: parsed.Karla?.avatarUri || baseMap.Karla.avatarUri || null,
            },
            Javier: {
              id: 'Javier',
              displayName: parsed.Javier?.displayName?.trim() || baseMap.Javier.displayName || 'Javier',
              avatarUri: parsed.Javier?.avatarUri || baseMap.Javier.avatarUri || null,
            },
          };
        }
      } catch {}

      const myFallback = myRole === 'Karla' ? 'Karlita' : 'Javier';
      const finalAvatar =
        myAvatarUri !== undefined ? myAvatarUri : (baseMap[myRole]?.avatarUri ?? null);

      const updatedMap: PartnerProfilesMap = {
        ...baseMap,
        [myRole]: {
          id: myRole,
          displayName: myDisplayName.trim() || myFallback,
          avatarUri: finalAvatar,
        },
      };

      if (partnerRole && partnerDisplayName && partnerDisplayName.trim()) {
        const partnerFallback = partnerRole === 'Karla' ? 'Karlita' : 'Javier';
        updatedMap[partnerRole] = {
          ...updatedMap[partnerRole],
          id: partnerRole,
          displayName: partnerDisplayName.trim() || partnerFallback,
        };
      }

      setPartnerProfiles(updatedMap);
      await AsyncStorage.setItem(PARTNER_PROFILES_STORAGE_KEY, JSON.stringify(updatedMap));

      try {
        const home = await getHomeState();
        await saveHomeState(myRole, {
          ...home,
          partnerProfiles: updatedMap,
        });
      } catch (err) {
        console.warn('[ProfileContext] Error sincronizando con Supabase:', err);
      }
    },
    [partnerProfiles]
  );

  const updatePartnerProfile = useCallback(
    async (
      role: UserProfile,
      updates: { displayName?: string; avatarUri?: string | null }
    ) => {
      await saveProfileSettings({
        myRole: role,
        myDisplayName: updates.displayName ?? partnerProfiles[role]?.displayName ?? '',
        myAvatarUri: updates.avatarUri,
      });
    },
    [partnerProfiles, saveProfileSettings]
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
        saveProfileSettings,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);

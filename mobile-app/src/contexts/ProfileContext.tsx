import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getCurrentProfile, setCurrentProfile as persistProfile, resetCurrentProfile as clearProfile } from '../services/StorageService';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (p: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  isLoading: true,
  setProfile: async () => {},
  logout: async () => {},
});

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentProfile()
      .then(setProfileState)
      .finally(() => setIsLoading(false));
  }, []);

  const setProfile = async (p: UserProfile) => {
    await persistProfile(p);
    setProfileState(p);
  };

  const logout = async () => {
    await clearProfile();
    setProfileState(null);
  };

  return (
    <ProfileContext.Provider value={{ profile, isLoading, setProfile, logout }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);

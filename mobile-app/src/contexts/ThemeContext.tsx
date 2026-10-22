import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProfile } from './ProfileContext';
import { buildPalette, ThemePalette } from '../theme/designSystem';

export interface ThemeColorPreset {
  id: string;
  name: string;
  hex: string;
  lightHex: string;
  emoji: string;
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  { id: 'purple', name: 'Morado Karlita', hex: '#9333ea', lightHex: '#f3e8ff', emoji: '💜' },
  { id: 'pink', name: 'Rosa Pastel', hex: '#ec4899', lightHex: '#fce7f3', emoji: '🌸' },
  { id: 'brown', name: 'Café Moka', hex: '#78350f', lightHex: '#fef3c7', emoji: '☕' },
  { id: 'black', name: 'Negro Elegante', hex: '#18181b', lightHex: '#f4f4f5', emoji: '🖤' },
  { id: 'wine', name: 'Vino Tinto', hex: '#9f1239', lightHex: '#ffe4e6', emoji: '🍷' },
  { id: 'red', name: 'Rojo Pasión', hex: '#e63946', lightHex: '#fff0f3', emoji: '❤️' },
  { id: 'sage', name: 'Verde Salvia', hex: '#059669', lightHex: '#d1fae5', emoji: '🌿' },
  { id: 'blue', name: 'Azul Océano', hex: '#0284c7', lightHex: '#e0f2fe', emoji: '💙' },
  { id: 'lavender', name: 'Lavanda Suave', hex: '#a855f7', lightHex: '#faf5ff', emoji: '✨' },
  { id: 'gold', name: 'Ámbar Cálido', hex: '#d97706', lightHex: '#fef9c3', emoji: '🍯' },
];

interface ThemeContextType {
  currentTheme: ThemeColorPreset;
  setThemeById: (id: string) => Promise<void>;
  primaryColor: string;
  primaryLight: string;
  colors: ThemePalette;
  isDark: boolean;
  toggleDark: () => void;
  isThemeModalOpen: boolean;
  openThemeModal: () => void;
  closeThemeModal: () => void;
}

const STORAGE_KEY = '@kmrg_user_theme_color';
const DARK_KEY = '@kmrg_dark_mode';

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEME_COLOR_PRESETS[0],
  setThemeById: async () => {},
  primaryColor: THEME_COLOR_PRESETS[0].hex,
  primaryLight: THEME_COLOR_PRESETS[0].lightHex,
  colors: buildPalette(THEME_COLOR_PRESETS[0].hex, false),
  isDark: false,
  toggleDark: () => {},
  isThemeModalOpen: false,
  openThemeModal: () => {},
  closeThemeModal: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useProfile();
  // Si es Karla, por defecto Morado; si es Javier, por defecto Azul u otro
  const defaultTheme = profile === 'Karla'
    ? THEME_COLOR_PRESETS[0] // Morado
    : profile === 'Javier'
    ? THEME_COLOR_PRESETS[7] // Azul
    : THEME_COLOR_PRESETS[0];

  const [currentTheme, setCurrentTheme] = useState<ThemeColorPreset>(defaultTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DARK_KEY).then((v) => setIsDark(v === '1'));
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      void AsyncStorage.setItem(DARK_KEY, prev ? '0' : '1');
      return !prev;
    });
  };
  const colors = buildPalette(currentTheme.hex, isDark);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((savedId) => {
      if (savedId) {
        const found = THEME_COLOR_PRESETS.find((p) => p.id === savedId);
        if (found) setCurrentTheme(found);
      } else if (profile === 'Karla') {
        setCurrentTheme(THEME_COLOR_PRESETS[0]); // Morado por defecto para Karlita
      }
    });
  }, [profile]);

  const setThemeById = async (id: string) => {
    const found = THEME_COLOR_PRESETS.find((p) => p.id === id);
    if (found) {
      setCurrentTheme(found);
      await AsyncStorage.setItem(STORAGE_KEY, id);
    }
  };

  const openThemeModal = () => setIsThemeModalOpen(true);
  const closeThemeModal = () => setIsThemeModalOpen(false);

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setThemeById,
        primaryColor: currentTheme.hex,
        primaryLight: isDark ? colors.primaryLight : currentTheme.lightHex,
        colors,
        isDark,
        toggleDark,
        isThemeModalOpen,
        openThemeModal,
        closeThemeModal,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

import React, { useEffect } from 'react';
import { View, ActivityIndicator, LogBox, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';
import { WelcomeAuthScreen } from './src/screens/WelcomeAuthScreen';
import { ProfileProvider, useProfile } from './src/contexts/ProfileContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ThemeSelectorModal } from './src/components/ThemeSelectorModal';
import { CustomAlertProvider } from './src/components/CustomAlertModal';
import { syncSupabaseMessages, syncSupabaseMilestones } from './src/services/SupabaseService';
import { scheduleDailyMessage } from './src/services/NotificationService';
import {
  getHomeState,
  getMoviesState,
  getSpecialPlacesState,
  getGamesState,
} from './src/services/CoupleSyncService';

// Limitar escala de fuente a 1.2 para que ninguna pantalla rompa el diseño responsivo sin scroll
if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
(Text as any).defaultProps.maxFontSizeMultiplier = 1.2;

if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
(TextInput as any).defaultProps.maxFontSizeMultiplier = 1.2;

// Filtrar únicamente avisos informativos conocidos de librerías sin ocultar errores reales
LogBox.ignoreLogs(['Support for defaultProps will be removed']);

function MainNavigator() {
  const { profile, isLoading, setProfile } = useProfile();
  const { primaryColor } = useTheme();

  useEffect(() => {
    if (profile) {
      void Promise.all([
        syncSupabaseMessages(profile),
        syncSupabaseMilestones(),
        getHomeState(),
        getMoviesState(),
        getSpecialPlacesState(),
        getGamesState(),
      ]).then(() => {
        void scheduleDailyMessage();
      });
    }
  }, [profile]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (!profile) {
    return (
      <WelcomeAuthScreen
        onAuthenticated={async (chosenProfile) => {
          await setProfile(chosenProfile);
        }}
      />
    );
  }

  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <ThemeProvider>
          <CustomAlertProvider>
            <MainNavigator />
            <ThemeSelectorModal />
          </CustomAlertProvider>
        </ThemeProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

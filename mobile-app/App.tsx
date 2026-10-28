import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';
import { WelcomeAuthScreen } from './src/screens/WelcomeAuthScreen';
import { ProfileProvider, useProfile } from './src/contexts/ProfileContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ThemeSelectorModal } from './src/components/ThemeSelectorModal';
import { CustomAlertProvider } from './src/components/CustomAlertModal';
import { syncSupabaseMessages, syncSupabaseMilestones } from './src/services/SupabaseService';
import { registerDevicePushToken, scheduleDailyMessage } from './src/services/NotificationService';
import {
  getHomeState,
  saveHomeState,
  getMoviesState,
  getSpecialPlacesState,
  getGamesState,
} from './src/services/CoupleSyncService';

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
      ]).then(async ([_, __, homeState]) => {
        void scheduleDailyMessage();
        try {
          const pushToken = await registerDevicePushToken();
          if (pushToken && homeState.pushTokens?.[profile] !== pushToken) {
            const nextHome = {
              ...homeState,
              pushTokens: {
                ...(homeState.pushTokens || {}),
                [profile]: pushToken,
              },
            };
            void saveHomeState(profile, nextHome);
          }
        } catch (e) {
          console.warn('[App] Error registrando push token:', e);
        }
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


import { Text, TouchableOpacity } from 'react-native';

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[RootErrorBoundary] Error atrapado en raíz:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#ffffff' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 10, textAlign: 'center' }}>
            KMRG Amor
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 }}>
            La sesión se ha protegido. Toca el botón para reiniciar la pantalla.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#ec4899', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}
            activeOpacity={0.85}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <RootErrorBoundary>
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
    </RootErrorBoundary>
  );
}

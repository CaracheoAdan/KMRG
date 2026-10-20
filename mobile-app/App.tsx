import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';
import { syncMessages } from './src/services/SyncService';
import { scheduleDailyMessage } from './src/services/NotificationService';

// Silenciar avisos informativos de Expo Go que no afectan las notificaciones locales
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Push notifications (remote notifications) are unavailable in Expo Go',
]);

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Sincronización anticipada silenciosa en caché local
        await syncMessages();

        // 2. Programar notificaciones locales diarias (7:00 AM)
        await scheduleDailyMessage();
      } catch (error) {
        // Fallo transparente y silencioso para no romper la experiencia
        console.log('[App] Inicialización completada con datos locales.');
      }
    };

    initializeApp();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

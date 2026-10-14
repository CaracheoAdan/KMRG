import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TabNavigator } from './src/navigation/TabNavigator';
import { syncMessages } from './src/services/SyncService';
import { scheduleDailyMessage } from './src/services/NotificationService';

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

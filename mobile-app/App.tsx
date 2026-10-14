import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const handleInteraction = () => {
    console.log('Botón "Pensando en ti" presionado.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>KMRG Mobile</Text>
        <Text style={styles.subtitle}>
          Mensajes programados, hitos y notificaciones cariñosas.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleInteraction} activeOpacity={0.8}>
          <Text style={styles.buttonText}>❤️ Pensando en ti</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff0f3',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9e2a2b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#540b0e',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#e63946',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

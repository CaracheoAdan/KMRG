import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../types';
import { setCurrentProfile } from '../services/StorageService';
import { FONTS, COLORS } from '../theme/designSystem';

// PIN de acceso privado de pareja
const COUPLE_ACCESS_PIN = '2026';
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export const WelcomeAuthScreen: React.FC<{ onAuthenticated: (profile: UserProfile) => void }> = ({
  onAuthenticated,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleSelectRole = (role: UserProfile) => {
    setSelectedRole(role);
    setPin('');
    setPinError(false);
  };

  const handleConfirm = async () => {
    if (!selectedRole) return;

    if (lockoutRemaining > 0) {
      Alert.alert(
        'Acceso bloqueado temporalmente',
        `Demasiados intentos fallidos. Intenta de nuevo en ${lockoutRemaining} segundos.`
      );
      return;
    }

    if (pin.trim() !== COUPLE_ACCESS_PIN) {
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      setPinError(true);

      if (nextAttempts >= MAX_PIN_ATTEMPTS) {
        setLockoutRemaining(LOCKOUT_SECONDS);
        Alert.alert(
          'Seguridad Activada',
          `Se alcanzó el límite de intentos. Espera ${LOCKOUT_SECONDS} segundos para volver a intentarlo.`
        );
      } else {
        Alert.alert(
          'Código incorrecto',
          `Verifica tu código privado de pareja (${MAX_PIN_ATTEMPTS - nextAttempts} intentos restantes).`
        );
      }
      return;
    }

    setFailedAttempts(0);
    await setCurrentProfile(selectedRole);
    onAuthenticated(selectedRole);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Encabezado */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#e63946" />
              <Text style={styles.logoText}>KMRG</Text>
            </View>
            <Text style={styles.title}>Nuestra Historia</Text>
            <Text style={styles.subtitle}>
              Un espacio privado e íntimo para nosotros dos. Selecciona tu perfil para vincular este dispositivo.
            </Text>
          </View>

          {/* Selector de Perfil */}
          <View style={styles.heartsRow}>
            {/* Perfil: Javier */}
            <TouchableOpacity
              onPress={() => handleSelectRole('Javier')}
              style={[
                styles.heartCard,
                selectedRole === 'Javier' && styles.heartCardActiveBlue,
              ]}
              activeOpacity={0.85}
            >
              <View style={[styles.heartCircle, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons
                  name="heart"
                  size={48}
                  color={selectedRole === 'Javier' ? '#0284c7' : '#38bdf8'}
                />
              </View>
              <Text style={[styles.roleName, selectedRole === 'Javier' && styles.roleNameActiveBlue]}>
                Javier
              </Text>
              <Text style={styles.roleSubtext}>Perfil de Él</Text>
            </TouchableOpacity>

            {/* Perfil: Karla */}
            <TouchableOpacity
              onPress={() => handleSelectRole('Karla')}
              style={[
                styles.heartCard,
                selectedRole === 'Karla' && styles.heartCardActivePurple,
              ]}
              activeOpacity={0.85}
            >
              <View style={[styles.heartCircle, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons
                  name="heart"
                  size={48}
                  color={selectedRole === 'Karla' ? '#9333ea' : '#c084fc'}
                />
              </View>
              <Text
                style={[
                  styles.roleName,
                  selectedRole === 'Karla' && styles.roleNameActivePurple,
                ]}
              >
                Karlita
              </Text>
              <Text style={styles.roleSubtext}>Perfil de Ella</Text>
            </TouchableOpacity>
          </View>

          {/* Formulario de PIN de Pareja */}
          {selectedRole && (
            <View style={styles.pinCard}>
              <View style={styles.pinHeader}>
                <Ionicons name="lock-closed" size={18} color="#2b2d42" />
                <Text style={styles.pinTitle}>
                  {selectedRole === 'Karla' ? 'Bienvenida, Karlita' : 'Bienvenido, Javier'}
                </Text>
              </View>
              <Text style={styles.pinSubtitle}>
                Ingresa el código privado de pareja para autorizar este teléfono:
              </Text>

              <TextInput
                value={pin}
                onChangeText={(val) => {
                  setPin(val.replace(/[^0-9]/g, ''));
                  setPinError(false);
                }}
                placeholder="••••"
                placeholderTextColor="#adb5bd"
                secureTextEntry
                keyboardType="numeric"
                maxLength={8}
                editable={lockoutRemaining === 0}
                style={[styles.pinInput, pinError && styles.pinInputError]}
                autoFocus
              />

              <TouchableOpacity
                onPress={() => void handleConfirm()}
                disabled={lockoutRemaining > 0}
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor:
                      lockoutRemaining > 0
                        ? '#adb5bd'
                        : selectedRole === 'Karla'
                        ? '#9333ea'
                        : '#0284c7',
                  },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={lockoutRemaining > 0 ? 'time-outline' : 'checkmark-circle'}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.confirmButtonText}>
                  {lockoutRemaining > 0
                    ? `Bloqueado (${lockoutRemaining}s)`
                    : 'Entrar a Nuestro Espacio'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pie informativo */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              Conexión protegida. Una vez vinculado, este teléfono conservará tu sesión activa.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff0f3',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#e63946',
    letterSpacing: 2,
    fontFamily: FONTS.sans,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.serif,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: FONTS.sans,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 290,
    lineHeight: 22,
  },
  heartsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 24,
  },
  heartCard: {
    flex: 1,
    maxWidth: 155,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f1f3f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heartCardActiveBlue: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
    transform: [{ scale: 1.03 }],
  },
  heartCardActivePurple: {
    borderColor: '#9333ea',
    backgroundColor: '#faf5ff',
    transform: [{ scale: 1.03 }],
  },
  heartCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.serif,
  },
  roleNameActiveBlue: {
    color: '#0284c7',
  },
  roleNameActivePurple: {
    color: '#9333ea',
  },
  roleSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: FONTS.sans,
    marginTop: 3,
    fontWeight: '600',
  },
  pinCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 8,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pinTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.sans,
  },
  pinSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: FONTS.sans,
    marginBottom: 14,
    lineHeight: 18,
  },
  pinInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.textPrimary,
    fontFamily: FONTS.sans,
    textAlign: 'center',
    letterSpacing: 6,
    fontWeight: '700',
    marginBottom: 14,
  },
  pinInputError: {
    borderColor: '#e63946',
    backgroundColor: '#fff0f3',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: FONTS.sans,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: FONTS.sans,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 16,
  },
});

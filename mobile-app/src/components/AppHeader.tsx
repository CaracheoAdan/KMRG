import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { CoupleWrappedModal } from './CoupleWrappedModal';

const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia, serif',
});

interface AppHeaderProps {
  streakCount?: number;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  streakCount = 1,
  rightAction,
}) => {
  const {
    profile,
    setProfile,
    logout,
    getDisplayName,
    getAvatarUri,
    updatePartnerProfile,
  } = useProfile();
  const { primaryColor, openThemeModal } = useTheme();
  const currentProfile = profile || 'Karla';
  const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myNameInput, setMyNameInput] = useState(getDisplayName(currentProfile));
  const [partnerNameInput, setPartnerNameInput] = useState(getDisplayName(partnerRole));
  const [myAvatarDraft, setMyAvatarDraft] = useState<string | null>(
    getAvatarUri(currentProfile)
  );

  useEffect(() => {
    if (isProfileModalOpen) {
      setMyNameInput(getDisplayName(currentProfile));
      setPartnerNameInput(getDisplayName(partnerRole));
      setMyAvatarDraft(getAvatarUri(currentProfile));
    }
  }, [isProfileModalOpen, currentProfile, partnerRole, getDisplayName, getAvatarUri]);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permiso necesario',
        'Necesitamos acceso a tu galería para elegir tu foto de perfil.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uriToSave = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setMyAvatarDraft(uriToSave);
    }
  };

  const handleSaveProfileChanges = async () => {
    await updatePartnerProfile(currentProfile, {
      displayName: myNameInput.trim() || (currentProfile === 'Karla' ? 'Karlita' : 'Javier'),
      avatarUri: myAvatarDraft,
    });
    if (partnerNameInput.trim()) {
      await updatePartnerProfile(partnerRole, {
        displayName: partnerNameInput.trim(),
      });
    }
    setIsProfileModalOpen(false);
  };

  const handleSwitchProfileRole = async () => {
    setIsProfileModalOpen(false);
    await setProfile(partnerRole);
  };

  const myDisplayName = getDisplayName(currentProfile);
  const myAvatarUri = getAvatarUri(currentProfile);
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');

  return (
    <View style={[styles.headerContainer, { borderBottomColor: `${primaryColor}25` }]}>
      <View style={styles.topRow}>
        {/* Izquierda: Paleta, Estadísticas (Wrapped) y Racha */}
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={openThemeModal}
            style={[
              styles.iconButton,
              { backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30` },
            ]}
            activeOpacity={0.75}
            accessibilityLabel="Cambiar tema de color"
          >
            <Ionicons name="color-palette-outline" size={16} color={primaryColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsWrappedOpen(true)}
            style={[
              styles.iconButton,
              { backgroundColor: `${primaryColor}14`, borderColor: `${primaryColor}30` },
            ]}
            activeOpacity={0.75}
            accessibilityLabel="Ver estadísticas de pareja"
          >
            <Ionicons name="stats-chart-outline" size={15} color={primaryColor} />
          </TouchableOpacity>

          <View style={[styles.streakBadge, { backgroundColor: `${primaryColor}12` }]}>
            <Ionicons name="flame" size={12} color="#f97316" />
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        </View>

        {/* Centro: Nombre de la Aplicación KMRG */}
        <TouchableOpacity
          onPress={() => setIsWrappedOpen(true)}
          activeOpacity={0.85}
          style={styles.brandCenter}
        >
          <View style={styles.titleWithEmblem}>
            <Text style={[styles.brandTitle, { color: primaryColor }]}>KMRG</Text>
            <Ionicons name="heart" size={11} color={primaryColor} style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.brandSubtitle} numberOfLines={1}>
            {karlaName} & {javierName}
          </Text>
        </TouchableOpacity>

        {/* Derecha: Perfil Activo con Avatar Personalizable */}
        <View style={styles.rightActions}>
          {rightAction ? (
            rightAction
          ) : (
            <TouchableOpacity
              onPress={() => setIsProfileModalOpen(true)}
              onLongPress={() => setIsProfileModalOpen(true)}
              style={[
                styles.profilePill,
                {
                  borderColor: currentProfile === 'Karla' ? '#c084fc' : '#7dd3fc',
                  backgroundColor: currentProfile === 'Karla' ? '#f3e8ff' : '#e0f2fe',
                },
              ]}
              activeOpacity={0.75}
              accessibilityLabel={`Perfil activo: ${myDisplayName}`}
            >
              {myAvatarUri ? (
                <Image source={{ uri: myAvatarUri }} style={styles.profileAvatarMini} />
              ) : (
                <View
                  style={[
                    styles.profileDot,
                    { backgroundColor: currentProfile === 'Karla' ? '#9333ea' : '#0284c7' },
                  ]}
                />
              )}
              <Text style={styles.profileText} numberOfLines={1}>
                {myDisplayName}
              </Text>
              <Ionicons name="person-circle-outline" size={13} color="#64748b" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal Global: Estadísticas Wrapped */}
      <CoupleWrappedModal
        visible={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        primaryColor={primaryColor}
      />

      {/* Modal Global: Personalizar Perfil de Pareja (Nombre + Foto + Cambio de Rol) */}
      <Modal
        visible={isProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Perfil de Pareja</Text>
              <TouchableOpacity
                onPress={() => setIsProfileModalOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Avatar + Selector de Foto */}
            <View style={styles.avatarEditorSection}>
              <TouchableOpacity
                onPress={() => void handlePickAvatar()}
                activeOpacity={0.85}
                style={[
                  styles.avatarCircleLarge,
                  {
                    borderColor: currentProfile === 'Karla' ? '#9333ea' : '#0284c7',
                    backgroundColor: currentProfile === 'Karla' ? '#f3e8ff' : '#e0f2fe',
                  },
                ]}
              >
                {myAvatarDraft ? (
                  <Image source={{ uri: myAvatarDraft }} style={styles.avatarImageLarge} />
                ) : (
                  <Text
                    style={[
                      styles.avatarInitialText,
                      { color: currentProfile === 'Karla' ? '#9333ea' : '#0284c7' },
                    ]}
                  >
                    {(myNameInput || 'K').charAt(0).toUpperCase()}
                  </Text>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: primaryColor }]}>
                  <Ionicons name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.avatarHelperTitle}>Foto de Perfil</Text>
                <Text style={styles.avatarHelperSub}>
                  Toca el círculo para elegir tu foto o personalizar cómo apareces en toda la app.
                </Text>
                {myAvatarDraft && (
                  <TouchableOpacity
                    onPress={() => setMyAvatarDraft(null)}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>
                      Quitar foto actual
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Mi Nombre / Apodo */}
            <Text style={styles.inputLabel}>Tu Nombre o Apodo</Text>
            <TextInput
              value={myNameInput}
              onChangeText={setMyNameInput}
              placeholder={currentProfile === 'Karla' ? 'Karlita' : 'Javier'}
              placeholderTextColor="#94a3b8"
              maxLength={22}
              style={styles.nameInput}
            />

            {/* Nombre de tu Pareja */}
            <Text style={styles.inputLabel}>Nombre de tu Pareja</Text>
            <TextInput
              value={partnerNameInput}
              onChangeText={setPartnerNameInput}
              placeholder={partnerRole === 'Karla' ? 'Karlita' : 'Javier'}
              placeholderTextColor="#94a3b8"
              maxLength={22}
              style={styles.nameInput}
            />

            <TouchableOpacity
              onPress={() => void handleSaveProfileChanges()}
              style={[styles.saveBtn, { backgroundColor: primaryColor }]}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Guardar Perfil</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Acciones de cambio de cuenta */}
            <View style={styles.bottomProfileActions}>
              <TouchableOpacity
                onPress={() => void handleSwitchProfileRole()}
                style={styles.switchRoleBtn}
              >
                <Ionicons name="swap-horizontal" size={15} color="#334155" />
                <Text style={styles.switchRoleText}>
                  Cambiar a {getDisplayName(partnerRole)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsProfileModalOpen(false);
                  void logout();
                }}
                style={styles.logoutBtn}
              >
                <Ionicons name="lock-closed-outline" size={14} color="#ef4444" />
                <Text style={styles.logoutText}>Bloquear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1.2,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1.3,
  },
  titleWithEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
    letterSpacing: 2.2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.8,
    marginTop: -1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    flex: 1.2,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: 118,
  },
  profileAvatarMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 5,
  },
  profileDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 4,
  },
  profileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    flexShrink: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: SERIF_FONT,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarImageLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarInitialText: {
    fontSize: 24,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHelperTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  avatarHelperSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  nameInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 2,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 14,
  },
  bottomProfileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRoleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  switchRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
});

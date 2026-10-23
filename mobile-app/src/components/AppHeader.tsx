import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from './ui/Icon';
import { PressableScale } from './ui/Kit';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { useStreak } from '../hooks/useHomeState';
import { CoupleWrappedModal } from './CoupleWrappedModal';
import { FONTS, MIN_TOUCH, RADII, SPACING, TYPE_SCALE } from '../theme/designSystem';

interface AppHeaderProps {
  /** Se mantiene por compatibilidad; la racha ahora sale de una única fuente de datos. */
  streakCount?: number;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ rightAction }) => {
  const { profile, setProfile, logout, getDisplayName, getAvatarUri, saveProfileSettings } =
    useProfile();
  const { colors, isDark, toggleDark, openThemeModal } = useTheme();
  const streak = useStreak();
  const currentProfile = profile || 'Karla';
  const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myNameInput, setMyNameInput] = useState(getDisplayName(currentProfile));
  const [partnerNameInput, setPartnerNameInput] = useState(getDisplayName(partnerRole));
  const [myAvatarDraft, setMyAvatarDraft] = useState<string | null>(getAvatarUri(currentProfile));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isProfileModalOpen) {
      setMyNameInput(getDisplayName(currentProfile));
      setPartnerNameInput(getDisplayName(partnerRole));
      setMyAvatarDraft(getAvatarUri(currentProfile));
    }
  }, [isProfileModalOpen, currentProfile, partnerRole, getDisplayName, getAvatarUri]);

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted && permission.status !== 'granted') {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para elegir tu foto de perfil.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setMyAvatarDraft(uri);
      }
    } catch (err) {
      console.warn('Error al seleccionar avatar:', err);
      Alert.alert('Error', 'No se pudo abrir la galería de fotos.');
    }
  };

  const handleSaveProfileChanges = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await saveProfileSettings({
        myRole: currentProfile,
        myDisplayName: myNameInput,
        myAvatarUri: myAvatarDraft,
        partnerRole: partnerRole,
        partnerDisplayName: partnerNameInput,
      });
      setIsProfileModalOpen(false);
      Alert.alert('¡Perfil Guardado! ❤️', 'Tu foto y datos se actualizaron y sincronizaron con éxito.');
    } catch (err) {
      console.warn('Error guardando perfil:', err);
      Alert.alert('Aviso', 'Se guardó tu perfil localmente.');
      setIsProfileModalOpen(false);
    } finally {
      setIsSaving(false);
    }
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
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
          shadowColor: colors.shadow,
          paddingTop: SPACING.xs,
        },
      ]}
    >
      <View style={styles.topRow}>
        {/* Marca KMRG compacta */}
        <View style={styles.brand}>
          <View style={styles.titleWithEmblem}>
            <Text style={[styles.brandTitle, { color: colors.primary }]}>KMRG</Text>
            <Ionicons name="heart" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {karlaName} & {javierName}
          </Text>
        </View>

        <View style={styles.rightActions}>
          {/* Racha: única fuente de datos */}
          <View style={[styles.streakBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="flame" size={14} color={colors.warning} />
            <Text style={[styles.streakText, { color: colors.text }]}>{streak}</Text>
          </View>

          {rightAction ? (
            rightAction
          ) : (
            <PressableScale
              onPress={() => setIsProfileModalOpen(true)}
              onLongPress={() => setIsProfileModalOpen(true)}
              accessibilityLabel={`Perfil activo: ${myDisplayName}`}
              style={[
                styles.profilePill,
                { backgroundColor: colors.primaryLight, borderColor: colors.border },
              ]}
            >
              {myAvatarUri ? (
                <Image source={{ uri: myAvatarUri }} style={styles.profileAvatarMini} />
              ) : (
                <View style={[styles.profileInitial, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.profileInitialText, { color: colors.primaryOn }]}>
                    {myDisplayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={[styles.profileText, { color: colors.text }]} numberOfLines={1}>
                {myDisplayName}
              </Text>
            </PressableScale>
          )}
        </View>
      </View>

      <CoupleWrappedModal
        visible={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        primaryColor={colors.primary}
      />

      {/* Menú de perfil y ajustes: paleta, estadísticas, modo oscuro, nombre y foto */}
      <Modal
        visible={isProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[TYPE_SCALE.title, { color: colors.text, fontSize: 20 }]}>Perfil y ajustes</Text>
              <TouchableOpacity
                onPress={() => setIsProfileModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.avatarEditorSection,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => void handlePickAvatar()}
                activeOpacity={0.85}
                style={[
                  styles.avatarCircleLarge,
                  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
              >
                {myAvatarDraft ? (
                  <Image source={{ uri: myAvatarDraft }} style={styles.avatarImageLarge} />
                ) : (
                  <Text style={[styles.avatarInitialText, { color: colors.primary }]}>
                    {(myNameInput || 'K').charAt(0).toUpperCase()}
                  </Text>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                  <Ionicons name="camera" size={12} color={colors.primaryOn} />
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={[TYPE_SCALE.body, { color: colors.text, fontWeight: '800' }]}>Foto de perfil</Text>
                <Text style={[TYPE_SCALE.caption, { color: colors.textSecondary, fontWeight: '500' }]}>
                  Toca el círculo para elegir tu foto.
                </Text>
                {myAvatarDraft && (
                  <TouchableOpacity onPress={() => setMyAvatarDraft(null)} style={{ paddingVertical: 4 }}>
                    <Text style={[TYPE_SCALE.caption, { color: colors.danger }]}>Quitar foto actual</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tu nombre o apodo</Text>
            <TextInput
              value={myNameInput}
              onChangeText={setMyNameInput}
              placeholder={currentProfile === 'Karla' ? 'Karlita' : 'Javier'}
              placeholderTextColor={colors.textMuted}
              maxLength={22}
              style={[styles.nameInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre de tu pareja</Text>
            <TextInput
              value={partnerNameInput}
              onChangeText={setPartnerNameInput}
              placeholder={partnerRole === 'Karla' ? 'Karlita' : 'Javier'}
              placeholderTextColor={colors.textMuted}
              maxLength={22}
              style={[styles.nameInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.text }]}
            />

            {/* Accesos movidos desde el header: paleta y estadísticas (ambos de ancho igual) */}
            <View style={[styles.menuRow, { width: '100%' }]}>
              <PressableScale
                onPress={() => {
                  setIsProfileModalOpen(false);
                  setTimeout(openThemeModal, 250);
                }}
                style={[styles.menuTile, { flex: 1, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuTileText, { color: colors.text }]}>Paleta de colores</Text>
              </PressableScale>
              <PressableScale
                onPress={() => {
                  setIsProfileModalOpen(false);
                  setTimeout(() => setIsWrappedOpen(true), 250);
                }}
                style={[styles.menuTile, { flex: 1, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
                <Text style={[styles.menuTileText, { color: colors.text }]}>Estadísticas</Text>
              </PressableScale>
            </View>

            <View style={[styles.darkRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.primary} />
              <Text style={[styles.menuTileText, { color: colors.text, flex: 1 }]}>Modo oscuro</Text>
              <Switch
                value={isDark}
                onValueChange={toggleDark}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>

            <PressableScale
              onPress={() => void handleSaveProfileChanges()}
              disabled={isSaving}
              style={[styles.saveBtn, { backgroundColor: colors.primary, width: '100%', opacity: isSaving ? 0.7 : 1 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primaryOn} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primaryOn} />
                  <Text style={[styles.saveBtnText, { color: colors.primaryOn }]}>Guardar perfil</Text>
                </>
              )}
            </PressableScale>

            <View style={styles.bottomProfileActions}>
              <TouchableOpacity
                onPress={() => void handleSwitchProfileRole()}
                style={[styles.switchRoleBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="swap-horizontal" size={15} color={colors.textSecondary} />
                <Text style={[styles.switchRoleText, { color: colors.text }]} numberOfLines={1}>
                  Cambiar a {getDisplayName(partnerRole)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsProfileModalOpen(false);
                  void logout();
                }}
                style={[styles.logoutBtn, { backgroundColor: colors.surfaceAlt }]}
              >
                <Ionicons name="lock-closed-outline" size={14} color={colors.danger} />
                <Text style={[styles.logoutText, { color: colors.danger }]}>Bloquear</Text>
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
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MIN_TOUCH,
  },
  brand: { flexShrink: 1 },
  titleWithEmblem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    letterSpacing: 2,
  },
  brandSubtitle: { ...TYPE_SCALE.caption, marginTop: -2 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: RADII.pill,
  },
  streakText: { ...TYPE_SCALE.body, fontWeight: '800' },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 12,
    height: 40,
    borderRadius: RADII.pill,
    borderWidth: 1,
    maxWidth: 140,
  },
  profileAvatarMini: { width: 32, height: 32, borderRadius: 16 },
  profileInitial: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileInitialText: { fontSize: 14, fontWeight: '800' },
  profileText: { ...TYPE_SCALE.body, fontWeight: '700', flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 20, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADII.lg,
    padding: SPACING.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  closeBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.xs + 4,
    borderRadius: RADII.md,
    marginBottom: SPACING.xs,
    borderWidth: 1,
  },
  avatarCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImageLarge: { width: 60, height: 60, borderRadius: 30 },
  avatarInitialText: { fontSize: 24, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  inputLabel: { ...TYPE_SCALE.caption, marginBottom: 4, marginTop: 4 },
  nameInput: {
    borderWidth: 1,
    borderRadius: RADII.sm,
    paddingHorizontal: SPACING.sm,
    height: MIN_TOUCH,
    ...TYPE_SCALE.body,
    fontWeight: '700',
  },
  menuRow: { flexDirection: 'row', gap: SPACING.xs, marginTop: SPACING.xs },
  menuTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  menuTileText: { ...TYPE_SCALE.caption, fontWeight: '700', flexShrink: 1 },
  darkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 12,
    borderRadius: RADII.sm,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: MIN_TOUCH + 4,
    borderRadius: RADII.md,
    marginTop: SPACING.sm,
  },
  saveBtnText: { ...TYPE_SCALE.body, fontWeight: '800' },
  bottomProfileActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: SPACING.xs },
  switchRoleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    borderRadius: RADII.sm,
  },
  switchRoleText: { ...TYPE_SCALE.caption, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    minHeight: MIN_TOUCH,
    borderRadius: RADII.sm,
  },
  logoutText: { ...TYPE_SCALE.caption, fontWeight: '700' },
});

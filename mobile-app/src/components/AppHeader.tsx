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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from './ui/Icon';
import { PressableScale } from './ui/Kit';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { calculateTimeTogether } from '../services/StorageService';
import { CoupleWrappedModal } from './CoupleWrappedModal';
import { useCoupleFeatures } from '../contexts/CoupleFeaturesContext';
import { FONTS, MIN_TOUCH, RADII, SPACING, TYPE_SCALE } from '../theme/designSystem';

interface AvatarCircleProps {
  size: number;
  uri?: string | null;
  name: string;
  bgColor: string;
  textColor: string;
  borderColor?: string;
  borderWidth?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
}

const AvatarCircle: React.FC<AvatarCircleProps> = ({
  size,
  uri,
  name,
  bgColor,
  textColor,
  borderColor,
  borderWidth = 0,
  fontSize,
  style,
}) => {
  const radius = size / 2;
  const innerSize = Math.max(0, size - borderWidth * 2);
  const innerRadius = innerSize / 2;
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bgColor,
          borderColor: borderColor || 'transparent',
          borderWidth,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: innerSize, height: innerSize, borderRadius: innerRadius }}
        />
      ) : (
        <Text
          style={{
            color: textColor,
            fontSize: fontSize ?? Math.round(size * 0.42),
            fontWeight: '800',
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
};

interface AppHeaderProps {
  /** Se mantiene por compatibilidad; la racha ahora sale de una única fuente de datos. */
  streakCount?: number;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ rightAction }) => {
  const { profile, setProfile, logout, getDisplayName, getAvatarUri, saveProfileSettings } =
    useProfile();
  const { colors, isDark, toggleDark, openThemeModal } = useTheme();
  const { openSidebar, homeState: home, hasPendingSidebarNotice } = useCoupleFeatures();
  const streak = home.streakCount || 1;
  const timeTogether = calculateTimeTogether(home.anniversaryDate);
  const currentProfile = profile || 'Karla';
  const partnerRole = currentProfile === 'Karla' ? 'Javier' : 'Karla';

  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myNameInput, setMyNameInput] = useState(getDisplayName(currentProfile));
  const [partnerNameInput, setPartnerNameInput] = useState(getDisplayName(partnerRole));
  const [myAvatarDraft, setMyAvatarDraft] = useState<string | null>(getAvatarUri(currentProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [isEditingMyName, setIsEditingMyName] = useState(false);
  const [isEditingPartnerName, setIsEditingPartnerName] = useState(false);

  useEffect(() => {
    if (isProfileModalOpen) {
      setMyNameInput(getDisplayName(currentProfile));
      setPartnerNameInput(getDisplayName(partnerRole));
      setMyAvatarDraft(getAvatarUri(currentProfile));
      setIsEditingMyName(false);
      setIsEditingPartnerName(false);
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



  const myDisplayName = getDisplayName(currentProfile);
  const myAvatarUri = getAvatarUri(currentProfile);
  const partnerDisplayName = getDisplayName(partnerRole);
  const partnerAvatarUri = getAvatarUri(partnerRole);
  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');
  const partnerFallbackBg =
    partnerRole === 'Karla'
      ? isDark
        ? 'rgba(236, 72, 153, 0.22)'
        : '#fdf2f8'
      : isDark
        ? 'rgba(56, 189, 248, 0.22)'
        : '#f0f9ff';
  const partnerFallbackBorder = partnerRole === 'Karla' ? '#f472b6' : '#38bdf8';
  const partnerFallbackText =
    partnerRole === 'Karla'
      ? isDark
        ? '#f9a8d4'
        : '#be185d'
      : isDark
        ? '#7dd3fc'
        : '#0369a1';
  const karlaDraftName =
    currentProfile === 'Karla'
      ? myNameInput.trim() || karlaName
      : partnerNameInput.trim() || karlaName;
  const javierDraftName =
    currentProfile === 'Javier'
      ? myNameInput.trim() || javierName
      : partnerNameInput.trim() || javierName;
  const karlaHeroAvatar = currentProfile === 'Karla' ? myAvatarDraft : partnerAvatarUri;
  const javierHeroAvatar = currentProfile === 'Javier' ? myAvatarDraft : partnerAvatarUri;

  return (
    <LinearGradient
      colors={[
        colors.surface,
        isDark ? `${colors.primary}18` : `${colors.primary}0D`,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.headerContainer,
        {
          borderBottomColor: colors.border,
          shadowColor: colors.shadow,
          paddingTop: SPACING.xs,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.brandGroup}>
          <TouchableOpacity
            onPress={openSidebar}
            activeOpacity={0.7}
            style={[
              styles.sidebarBtn,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir barra lateral de Nuestro Rincón"
          >
            <Ionicons name="menu" size={19} color={colors.primary} />
            {hasPendingSidebarNotice && (
              <View
                style={[styles.sidebarUnreadDot, { borderColor: colors.surface }]}
              />
            )}
          </TouchableOpacity>

          {/* Marca KMRG + nombres y días juntos */}
          <View style={styles.brand}>
            <View style={styles.titleWithEmblem}>
              <Text style={[styles.brandTitle, { color: colors.primary }]}>KMRG</Text>
              <View style={[styles.brandHeartBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="heart" size={10} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {karlaName} & {javierName} • {timeTogether.totalDays}d
            </Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          {/* Racha interactiva: abre Nuestro Resumen KMRG */}
          <PressableScale
            onPress={() => setIsWrappedOpen(true)}
            accessibilityLabel={`Racha activa de ${streak} días. Toca para abrir Nuestro Resumen`}
            style={[
              styles.streakBadge,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.36)' : '#fde68a',
              },
            ]}
            scaleTo={0.94}
          >
            <Ionicons name="flame" size={14} color={colors.warning} />
            <Text
              style={[
                styles.streakText,
                { color: isDark ? '#fbbf24' : '#b45309' },
              ]}
            >
              {streak}d
            </Text>
          </PressableScale>

          {rightAction ? (
            rightAction
          ) : (
            <PressableScale
              onPress={() => setIsProfileModalOpen(true)}
              onLongPress={() => setIsProfileModalOpen(true)}
              accessibilityLabel={`Perfil activo: ${myDisplayName}. Toca para abrir perfil y ajustes`}
              style={[
                styles.profilePill,
                {
                  backgroundColor: isDark ? colors.surfaceAlt : colors.surface,
                  borderColor: `${colors.primary}38`,
                },
              ]}
              scaleTo={0.96}
            >
              <View style={styles.coupleAvatarStack}>
                <AvatarCircle
                  size={24}
                  uri={partnerAvatarUri}
                  name={partnerDisplayName}
                  bgColor={partnerFallbackBg}
                  textColor={partnerFallbackText}
                  borderColor={colors.surface}
                  borderWidth={1.5}
                  fontSize={10}
                />
                <AvatarCircle
                  size={30}
                  uri={myAvatarUri}
                  name={myDisplayName}
                  bgColor={colors.primary}
                  textColor={colors.primaryOn}
                  borderColor={colors.primary}
                  borderWidth={1.5}
                  fontSize={12}
                  style={styles.activeStackedAvatar}
                />
              </View>
              <Text style={[styles.profileText, { color: colors.text }]} numberOfLines={1}>
                {myDisplayName}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
            </PressableScale>
          )}
        </View>
      </View>

      <CoupleWrappedModal
        visible={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        primaryColor={colors.primary}
        daysTogether={timeTogether.totalDays}
        streakCount={streak}
        anniversaryDate={home.anniversaryDate}
      />

      {/* ================= MODAL DE PERFIL Y AJUSTES (DISEÑO 3 TARJETAS PREMIUM) ================= */}
      <Modal
        visible={isProfileModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? colors.surface : colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Header del Modal */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                  NUESTRO ESPACIO
                </Text>
                <Text style={[TYPE_SCALE.title, { color: colors.text, fontSize: 20, fontFamily: FONTS.serif }]}>
                  Perfil y Ajustes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsProfileModalOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              {/* ================= HERO DE PAREJA ================= */}
              <LinearGradient
                colors={[
                  isDark ? `${colors.primary}28` : `${colors.primary}18`,
                  isDark ? colors.surfaceAlt : colors.surface,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.coupleHeroBanner, { borderColor: `${colors.primary}30` }]}
              >
                <View style={styles.coupleHeroAvatars}>
                  <AvatarCircle
                    size={50}
                    uri={karlaHeroAvatar}
                    name={karlaDraftName}
                    bgColor={isDark ? 'rgba(236, 72, 153, 0.22)' : '#fdf2f8'}
                    textColor={isDark ? '#f9a8d4' : '#be185d'}
                    borderColor={colors.primary}
                    borderWidth={2}
                  />
                  <View
                    style={[
                      styles.coupleHeartConnector,
                      { backgroundColor: colors.primary, borderColor: colors.surface },
                    ]}
                  >
                    <Ionicons name="heart" size={12} color={colors.primaryOn} />
                  </View>
                  <AvatarCircle
                    size={50}
                    uri={javierHeroAvatar}
                    name={javierDraftName}
                    bgColor={isDark ? 'rgba(56, 189, 248, 0.22)' : '#f0f9ff'}
                    textColor={isDark ? '#7dd3fc' : '#0369a1'}
                    borderColor={colors.primary}
                    borderWidth={2}
                  />
                </View>

                <Text style={[styles.coupleHeroNames, { color: colors.text }]} numberOfLines={1}>
                  {karlaDraftName} & {javierDraftName}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    setIsProfileModalOpen(false);
                    setTimeout(() => setIsWrappedOpen(true), 250);
                  }}
                  activeOpacity={0.75}
                  style={styles.coupleHeroStatsRow}
                >
                  <View
                    style={[
                      styles.coupleHeroStatChip,
                      {
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fffbeb',
                        borderColor: isDark ? 'rgba(245, 158, 11, 0.36)' : '#fde68a',
                      },
                    ]}
                  >
                    <Ionicons name="flame" size={12} color={colors.warning} />
                    <Text
                      style={[
                        styles.coupleHeroStatText,
                        { color: isDark ? '#fbbf24' : '#b45309' },
                      ]}
                    >
                      {streak} días de racha
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.coupleHeroStatChip,
                      {
                        backgroundColor: `${colors.primary}15`,
                        borderColor: `${colors.primary}32`,
                      },
                    ]}
                  >
                    <Ionicons name="heart" size={11} color={colors.primary} />
                    <Text style={[styles.coupleHeroStatText, { color: colors.primary }]}>
                      {timeTogether.totalDays} días juntos
                    </Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>

              {/* ================= TARJETA 1: TÚ (PUNTO FOCAL CENTRADO) ================= */}
              <View
                style={[
                  styles.profileCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setIsPhotoSheetOpen(true)}
                  activeOpacity={0.85}
                  style={styles.avatarTapWrapper}
                  accessibilityLabel="Opciones de foto de perfil"
                >
                  <AvatarCircle
                    size={76}
                    uri={myAvatarDraft}
                    name={myNameInput || currentProfile}
                    bgColor={colors.primaryLight}
                    textColor={colors.primary}
                    borderColor={colors.primary}
                    borderWidth={2.5}
                    fontSize={28}
                  />
                  <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                    <Ionicons name="camera" size={13} color={colors.primaryOn} />
                  </View>
                </TouchableOpacity>

                {/* Nombre editable con lapicito */}
                {isEditingMyName ? (
                  <View style={styles.inlineEditRow}>
                    <TextInput
                      value={myNameInput}
                      onChangeText={setMyNameInput}
                      placeholder={currentProfile === 'Karla' ? 'Karlita' : 'Javier'}
                      placeholderTextColor={colors.textMuted}
                      maxLength={22}
                      autoFocus
                      style={[styles.inlineInput, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary, color: colors.text }]}
                    />
                    <TouchableOpacity
                      onPress={() => setIsEditingMyName(false)}
                      style={[styles.inlineConfirmBtn, { backgroundColor: colors.primary }]}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.primaryOn} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.nameDisplayRow}>
                    <Text style={[styles.centeredProfileName, { color: colors.text }]}>
                      {myNameInput || getDisplayName(currentProfile)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsEditingMyName(true)}
                      style={[styles.inlinePencilBtn, { backgroundColor: colors.surfaceAlt }]}
                      accessibilityLabel="Editar nombre"
                    >
                      <Ionicons name="pencil" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Badge de Rol activo */}
                <View style={[styles.roleBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="person" size={11} color={colors.primary} />
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    {currentProfile === 'Karla' ? 'Karlita • Tu perfil activo' : 'Javier • Tu perfil activo'}
                  </Text>
                </View>
              </View>

              {/* ================= TARJETA 2: TU PAREJA (VÍNCULO CONECTADO) ================= */}
              <View
                style={[
                  styles.partnerCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.partnerCardLeft}>
                  <AvatarCircle
                    size={42}
                    uri={partnerAvatarUri}
                    name={partnerNameInput || partnerRole}
                    bgColor={partnerFallbackBg}
                    textColor={partnerFallbackText}
                    borderColor={partnerFallbackBorder}
                    borderWidth={1.5}
                    fontSize={16}
                  />

                  <View style={{ flex: 1 }}>
                    <View style={styles.partnerHeaderRow}>
                      <Text style={[styles.partnerSubtitle, { color: colors.textSecondary }]}>
                        Tu pareja conectada
                      </Text>
                      <View style={styles.connectedDot} />
                    </View>

                    {isEditingPartnerName ? (
                      <View style={styles.inlineEditRowSmall}>
                        <TextInput
                          value={partnerNameInput}
                          onChangeText={setPartnerNameInput}
                          placeholder={partnerRole === 'Karla' ? 'Karlita' : 'Javier'}
                          placeholderTextColor={colors.textMuted}
                          maxLength={22}
                          autoFocus
                          style={[styles.inlineInputSmall, { backgroundColor: colors.surfaceAlt, borderColor: colors.primary, color: colors.text }]}
                        />
                        <TouchableOpacity
                          onPress={() => setIsEditingPartnerName(false)}
                          style={[styles.inlineConfirmBtnSmall, { backgroundColor: colors.primary }]}
                        >
                          <Ionicons name="checkmark" size={14} color={colors.primaryOn} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.partnerNameText, { color: colors.text }]} numberOfLines={1}>
                        {partnerNameInput || getDisplayName(partnerRole)}
                      </Text>
                    )}
                  </View>
                </View>

                {!isEditingPartnerName && (
                  <TouchableOpacity
                    onPress={() => setIsEditingPartnerName(true)}
                    style={[styles.inlinePencilBtn, { backgroundColor: colors.surfaceAlt }]}
                    accessibilityLabel="Editar apodo de tu pareja"
                  >
                    <Ionicons name="pencil" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* ================= TARJETA 3: AJUSTES DE LA APP (FORMATO LISTA) ================= */}
              <View
                style={[
                  styles.settingsCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {/* Opción 1: Paleta de Colores */}
                <TouchableOpacity
                  onPress={() => {
                    setIsProfileModalOpen(false);
                    setTimeout(openThemeModal, 250);
                  }}
                  style={styles.settingItemRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.settingIconBox, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name="color-palette" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Paleta de colores</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                      Temas de color y acentos de pareja
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

                {/* Opción 2: Estadísticas de Amor (Nuestro Resumen) */}
                <TouchableOpacity
                  onPress={() => {
                    setIsProfileModalOpen(false);
                    setTimeout(() => setIsWrappedOpen(true), 250);
                  }}
                  style={styles.settingItemRow}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.settingIconBox,
                      { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe' },
                    ]}
                  >
                    <Ionicons
                      name="stats-chart"
                      size={18}
                      color={isDark ? '#c4b5fd' : '#7c3aed'}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Nuestro Resumen KMRG</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                      Métricas, racha activa y días juntos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />

                {/* Opción 3: Modo Oscuro con Switch de Alto Contraste */}
                <View style={styles.settingItemRow}>
                  <View
                    style={[
                      styles.settingIconBox,
                      { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.18)' : '#fef3c7' },
                    ]}
                  >
                    <Ionicons
                      name={isDark ? 'moon' : 'sunny'}
                      size={18}
                      color={isDark ? '#38bdf8' : '#d97706'}
                    />
                  </View>
                  <View style={styles.settingTextGroup}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Modo oscuro</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                      {isDark ? 'Tema oscuro activo' : 'Tema claro activo'}
                    </Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={toggleDark}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>

              {/* Botón Guardar Cambios (Compacto y Elegante) */}
              <PressableScale
                onPress={() => void handleSaveProfileChanges()}
                disabled={isSaving}
                style={[
                  styles.saveBtnCompact,
                  { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 },
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.primaryOn} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color={colors.primaryOn} />
                    <Text style={[styles.saveBtnText, { color: colors.primaryOn }]}>
                      Guardar cambios
                    </Text>
                  </>
                )}
              </PressableScale>

              {/* Cerrar Sesión / Bloquear Discreto en Texto Rojo */}
              <TouchableOpacity
                onPress={() => {
                  setIsProfileModalOpen(false);
                  void logout();
                }}
                style={styles.logoutTextBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={16} color={colors.danger} />
                <Text style={[styles.logoutTextPlain, { color: colors.danger }]}>
                  Cerrar sesión / Bloquear
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ================= MINI BOTTOM SHEET: FOTO DE PERFIL ================= */}
      <Modal
        visible={isPhotoSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPhotoSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setIsPhotoSheetOpen(false)}
        >
          <View
            style={[
              styles.photoSheetCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.photoSheetTitle, { color: colors.text }]}>Foto de perfil</Text>

            <TouchableOpacity
              style={styles.sheetOptionBtn}
              onPress={() => {
                setIsPhotoSheetOpen(false);
                void handlePickAvatar();
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="camera" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetOptionText, { color: colors.text }]}>Cambiar foto</Text>
                <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                  Elegir desde tu galería de fotos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {myAvatarDraft && (
              <TouchableOpacity
                style={styles.sheetOptionBtn}
                onPress={() => {
                  setIsPhotoSheetOpen(false);
                  setMyAvatarDraft(null);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.sheetIconCircle,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2' },
                  ]}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionText, { color: colors.danger }]}>Eliminar foto actual</Text>
                  <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                    Volver a la inicial de tu nombre
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.sheetCancelBtn, { backgroundColor: colors.surfaceAlt }]}
              onPress={() => setIsPhotoSheetOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sheetCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
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
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  sidebarBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sidebarUnreadDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: '#ec4899',
  },
  brand: { flexShrink: 1 },
  titleWithEmblem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    letterSpacing: 2.2,
  },
  brandHeartBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSubtitle: { ...TYPE_SCALE.caption, fontSize: 11, fontWeight: '600', marginTop: -1 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    height: 36,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  streakText: { fontSize: 12.5, fontWeight: '800' },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 10,
    height: 38,
    borderRadius: RADII.pill,
    borderWidth: 1,
    maxWidth: 158,
  },
  coupleAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStackedAvatar: {
    marginLeft: -9,
  },
  profileText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },

  // Modal de Perfil & Ajustes
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 20, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    maxHeight: '92%',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
    marginBottom: 12,
  },
  modalEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero de pareja en Modal
  coupleHeroBanner: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  coupleHeroAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  coupleHeartConnector: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -7,
    zIndex: 2,
  },
  coupleHeroNames: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: FONTS.serif,
    marginBottom: 8,
  },
  coupleHeroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  coupleHeroStatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  coupleHeroStatText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Tarjeta 1: Tú
  profileCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarTapWrapper: {
    marginBottom: 8,
    position: 'relative',
  },
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
  nameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  centeredProfileName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  inlinePencilBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
    maxWidth: 220,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineConfirmBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Tarjeta 2: Tu Pareja
  partnerCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  partnerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  partnerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  partnerSubtitle: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  partnerNameText: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  inlineEditRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    maxWidth: 180,
  },
  inlineInputSmall: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineConfirmBtnSmall: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tarjeta 3: Ajustes Lista
  settingsCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  settingDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },

  // Botones Inferiores
  saveBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 14,
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  logoutTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
  },
  logoutTextPlain: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Bottom Sheet de Foto
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  photoSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  photoSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  sheetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  sheetCancelBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

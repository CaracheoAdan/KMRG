import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { TimeCapsuleItem, UserProfile } from '../types';
import { DatePickerModal } from './DatePickerModal';
import * as ImagePicker from 'expo-image-picker';
import { SupabaseMediaService } from '../services/SupabaseMediaService';
import { toLocalDateString } from '../services/StorageService';

interface Props {
  visible: boolean;
  onClose: () => void;
  capsules: TimeCapsuleItem[];
  currentProfile: UserProfile;
  primaryColor: string;
  onSaveCapsule: (capsule: TimeCapsuleItem) => void;
  onOpenCapsule: (capsuleId: string) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

function getRemainingTime(targetDateStr: string) {
  const target = new Date(`${targetDateStr}T00:00:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { isReady: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { isReady: false, days, hours, minutes, seconds };
}

export const TimeCapsuleModal: React.FC<Props> = ({
  visible,
  onClose,
  capsules,
  currentProfile,
  primaryColor,
  onSaveCapsule,
  onOpenCapsule,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsuleItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return toLocalDateString(d);
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ticker for live countdown
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [visible]);

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Se necesita acceso a la galería.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setPhotoUri(uri);
      }
    } catch (e) {
      console.warn('Error al seleccionar imagen:', e);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Título requerido', 'Escribe un título para la cápsula.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Mensaje requerido', 'Escribe el mensaje o promesa de amor.');
      return;
    }

    setIsSaving(true);
    try {
      let finalPhotoUrl = '';
      if (photoUri) {
        finalPhotoUrl = await SupabaseMediaService.uploadPhoto(photoUri, 'capsules');
      }

      const newCapsule: TimeCapsuleItem = {
        id: `capsule-${Date.now()}`,
        sender: currentProfile,
        recipient: currentProfile === 'Karla' ? 'Javier' : 'Karla',
        title: title.trim(),
        occasion: occasion.trim() || 'Nuestro Amor',
        content: content.trim(),
        unlockDate,
        themeColor: primaryColor,
        createdAt: new Date().toISOString(),
        photoUrl: finalPhotoUrl || undefined,
      };

      onSaveCapsule(newCapsule);
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 50, 100, 50]);
      }
      Alert.alert(
        '⏳ ¡Cápsula Sellada!',
        `Tu cápsula ha sido sellada con amor. Permanecerá cerrada bajo candado hasta el ${unlockDate}.`
      );
      setTitle('');
      setOccasion('');
      setContent('');
      setPhotoUri(null);
      setActiveTab('list');
    } catch (e) {
      Alert.alert('Error', 'No se pudo sellar la cápsula.');
    } finally {
      setIsSaving(false);
    }
  };

  const partnerName = currentProfile === 'Karla' ? 'Javier' : 'Karlita';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: `${primaryColor}20` }]}>
                <Ionicons name="hourglass" size={20} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Cápsulas del Tiempo</Text>
                <Text style={styles.headerSubtitle}>Recuerdos sellados para el futuro</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Selector de pestañas */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => {
                setActiveTab('list');
                setSelectedCapsule(null);
              }}
              style={[styles.tabBtn, activeTab === 'list' && { backgroundColor: primaryColor }]}
            >
              <Ionicons
                name="archive"
                size={14}
                color={activeTab === 'list' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'list' && { color: '#ffffff', fontWeight: '700' },
                ]}
              >
                Cápsulas ({capsules.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setActiveTab('create');
                setSelectedCapsule(null);
              }}
              style={[styles.tabBtn, activeTab === 'create' && { backgroundColor: primaryColor }]}
            >
              <Ionicons
                name="add-circle"
                size={14}
                color={activeTab === 'create' ? '#ffffff' : '#64748b'}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'create' && { color: '#ffffff', fontWeight: '700' },
                ]}
              >
                Sellar Nueva
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contenido: Detalle de Cápsula Abierta */}
          {selectedCapsule ? (
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
              <View style={styles.openedCard}>
                <View style={styles.openedBadge}>
                  <Ionicons name="sparkles" size={14} color="#f59e0b" />
                  <Text style={styles.openedBadgeText}>CÁPSULA DESBLOQUEADA</Text>
                </View>

                <Text style={styles.openedTitle}>{selectedCapsule.title}</Text>
                <Text style={styles.openedMeta}>
                  De {selectedCapsule.sender} · {selectedCapsule.occasion}
                </Text>

                {selectedCapsule.photoUrl ? (
                  <Image
                    source={{ uri: selectedCapsule.photoUrl }}
                    style={styles.openedPhoto}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.openedTextBox}>
                  <Ionicons name="quote" size={18} color="#cbd5e1" style={{ marginBottom: 6 }} />
                  <Text style={styles.openedContentText}>{selectedCapsule.content}</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setSelectedCapsule(null)}
                  style={[styles.backToListBtn, { backgroundColor: primaryColor }]}
                >
                  <Ionicons name="arrow-back" size={16} color="#ffffff" />
                  <Text style={styles.backToListText}>Volver a las Cápsulas</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : activeTab === 'list' ? (
            /* Lista de Cápsulas */
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
              {capsules.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="hourglass-outline" size={54} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>Aún no hay cápsulas selladas</Text>
                  <Text style={styles.emptySubtitle}>
                    Sorprende a {partnerName} creando una cápsula con fotos y promesas que se abrirá
                    en una fecha especial.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setActiveTab('create')}
                    style={[styles.emptyActionBtn, { backgroundColor: primaryColor }]}
                  >
                    <Ionicons name="lock-closed" size={16} color="#ffffff" />
                    <Text style={styles.emptyActionBtnText}>Sellar Nuestra Primera Cápsula</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                capsules.map((cap) => {
                  const rem = getRemainingTime(cap.unlockDate);
                  const isOpened = !!cap.openedAt;

                  return (
                    <View key={cap.id} style={styles.capsuleCard}>
                      <View style={styles.capsuleTopRow}>
                        <View style={styles.capsuleIconBox}>
                          <Ionicons
                            name={isOpened ? 'gift' : rem.isReady ? 'key' : 'lock-closed'}
                            size={22}
                            color={isOpened ? '#10b981' : rem.isReady ? '#f59e0b' : primaryColor}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.capsuleItemTitle} numberOfLines={1}>
                            {cap.title}
                          </Text>
                          <Text style={styles.capsuleItemOccasion}>
                            {cap.occasion} · Para abrir: {cap.unlockDate}
                          </Text>
                        </View>
                      </View>

                      {/* Contador en Vivo o Botón de Apertura */}
                      {isOpened ? (
                        <TouchableOpacity
                          onPress={() => setSelectedCapsule(cap)}
                          style={[styles.openActionBtn, { backgroundColor: '#10b981' }]}
                        >
                          <Ionicons name="eye" size={15} color="#ffffff" />
                          <Text style={styles.openActionBtnText}>Leer Cápsula Abierta</Text>
                        </TouchableOpacity>
                      ) : rem.isReady ? (
                        <TouchableOpacity
                          onPress={() => {
                            if (Platform.OS !== 'web') Vibration.vibrate([0, 100, 50, 100]);
                            onOpenCapsule(cap.id);
                            setSelectedCapsule({ ...cap, openedAt: new Date().toISOString() });
                          }}
                          style={[styles.openActionBtn, { backgroundColor: '#f59e0b' }]}
                        >
                          <Ionicons name="sparkles" size={16} color="#ffffff" />
                          <Text style={styles.openActionBtnText}>¡FECHA LLEGADA! TOCAR PARA ABRIR</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.countdownContainer}>
                          <View style={styles.countdownUnit}>
                            <Text style={styles.countdownValue}>{rem.days}</Text>
                            <Text style={styles.countdownLabel}>DÍAS</Text>
                          </View>
                          <Text style={styles.countdownSep}>:</Text>
                          <View style={styles.countdownUnit}>
                            <Text style={styles.countdownValue}>{rem.hours}</Text>
                            <Text style={styles.countdownLabel}>HORAS</Text>
                          </View>
                          <Text style={styles.countdownSep}>:</Text>
                          <View style={styles.countdownUnit}>
                            <Text style={styles.countdownValue}>{rem.minutes}</Text>
                            <Text style={styles.countdownLabel}>MIN</Text>
                          </View>
                          <Text style={styles.countdownSep}>:</Text>
                          <View style={styles.countdownUnit}>
                            <Text style={styles.countdownValue}>{rem.seconds}</Text>
                            <Text style={styles.countdownLabel}>SEG</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : (
            /* Formulario de Creación */
            <ScrollView style={styles.contentScroll} contentContainerStyle={styles.scrollInner}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Título de la Cápsula</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Para nuestro aniversario de 1 año..."
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Ocasión o Motivo</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej: Viaje a la playa, Cumpleaños, Promesa..."
                  placeholderTextColor="#94a3b8"
                  value={occasion}
                  onChangeText={setOccasion}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Fecha de Desbloqueo</Text>
                <TouchableOpacity
                  onPress={() => setIsDatePickerOpen(true)}
                  style={styles.datePickerBtn}
                >
                  <Ionicons name="calendar" size={18} color={primaryColor} />
                  <Text style={styles.datePickerBtnText}>{unlockDate}</Text>
                  <Ionicons name="chevron-down" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Mensaje Secreto o Promesa</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Escribe lo que sientes hoy para que lo lea tu pareja en el futuro..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  value={content}
                  onChangeText={setContent}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Fotografía Adjunta (Opcional)</Text>
                {photoUri ? (
                  <View style={styles.photoPreviewBox}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <TouchableOpacity
                      onPress={() => setPhotoUri(null)}
                      style={styles.removePhotoBtn}
                    >
                      <Ionicons name="trash" size={14} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handlePickPhoto} style={styles.addPhotoBtn}>
                    <Ionicons name="camera" size={20} color={primaryColor} />
                    <Text style={[styles.addPhotoText, { color: primaryColor }]}>
                      Agregar Foto para el Futuro
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={handleCreate}
                disabled={isSaving}
                style={[styles.sealActionBtn, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="lock-closed" size={18} color="#ffffff" />
                <Text style={styles.sealActionBtnText}>
                  {isSaving ? 'Sellando Cápsula...' : 'Sellar Cápsula del Tiempo'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={isDatePickerOpen}
            value={unlockDate}
            onSelect={(date: string) => {
              setUnlockDate(date);
              setIsDatePickerOpen(false);
            }}
            onClose={() => setIsDatePickerOpen(false)}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '88%',
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    padding: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    marginHorizontal: 20,
    padding: 4,
    gap: 6,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  contentScroll: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  capsuleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  capsuleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  capsuleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  capsuleItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  capsuleItemOccasion: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  countdownUnit: {
    alignItems: 'center',
    minWidth: 42,
  },
  countdownValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#38bdf8',
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 1,
  },
  countdownSep: {
    fontSize: 16,
    fontWeight: '800',
    color: '#64748b',
  },
  openActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  openActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  formGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  datePickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginLeft: 10,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  photoPreviewBox: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 14,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 10,
  },
  sealActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  openedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  openedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  openedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
  },
  openedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  openedMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  openedPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 14,
  },
  openedTextBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  openedContentText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  backToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  backToListText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

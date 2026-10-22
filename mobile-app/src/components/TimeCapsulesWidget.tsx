import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimeCapsuleItem, UserProfile } from '../types';
import { formatDisplayDate, toLocalDateString } from '../services/StorageService';
import { DatePickerModal } from './DatePickerModal';
import { FONTS } from '../theme/designSystem';

interface Props {
  capsules: TimeCapsuleItem[];
  currentProfile: UserProfile;
  primaryColor: string;
  onSaveCapsule: (capsule: TimeCapsuleItem) => void;
  onDeleteCapsule: (id: string) => void;
}

const OCCASIONS = [
  'Aniversario',
  'Léelo cuando me extrañes',
  'Cumpleaños',
  'Día Especial',
  'Sorpresa Futura',
];

export const TimeCapsulesWidget: React.FC<Props> = ({
  capsules,
  currentProfile,
  primaryColor,
  onSaveCapsule,
  onDeleteCapsule,
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState(() =>
    toLocalDateString(new Date(Date.now() + 7 * 86400000))
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openedCapsule, setOpenedCapsule] = useState<TimeCapsuleItem | null>(null);

  const todayStr = toLocalDateString(new Date());

  const handlePressCapsule = (cap: TimeCapsuleItem) => {
    const isUnlocked = cap.unlockDate <= todayStr;
    if (!isUnlocked) {
      const target = new Date(`${cap.unlockDate}T00:00:00`);
      const diffMs = Math.max(0, target.getTime() - Date.now());
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      Alert.alert(
        'Cápsula Sellada con Candado',
        `Esta cápsula fue programada por ${
          cap.sender === 'Karla' ? 'Karlita' : 'Javier'
        } para abrirse el ${formatDisplayDate(cap.unlockDate)}.\n\nFaltan ${days} ${
          days === 1 ? 'día' : 'días'
        } para desbloquear su contenido.`
      );
      return;
    }
    setOpenedCapsule(cap);
  };

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Campos incompletos', 'Escribe un título y el mensaje secreto de la cápsula.');
      return;
    }

    const item: TimeCapsuleItem = {
      id: `tc-${Date.now()}`,
      sender: currentProfile,
      recipient: currentProfile === 'Karla' ? 'Javier' : 'Karla',
      title: title.trim(),
      occasion,
      content: content.trim(),
      unlockDate,
      themeColor: primaryColor,
      createdAt: new Date().toISOString(),
    };

    onSaveCapsule(item);
    setTitle('');
    setContent('');
    setIsAddOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="hourglass-outline" size={18} color={primaryColor} />
          <Text style={styles.sectionTitle}>Cápsulas del Tiempo</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsAddOpen(true)}
          style={[styles.newBtn, { backgroundColor: `${primaryColor}15` }]}
        >
          <Ionicons name="lock-closed" size={13} color={primaryColor} />
          <Text style={[styles.newBtnText, { color: primaryColor }]}>Sellar Cápsula</Text>
        </TouchableOpacity>
      </View>

      {capsules.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Crea una carta sellada que solo podrá abrirse cuando llegue su fecha especial.
          </Text>
        </View>
      ) : (
        capsules.map((cap) => {
          const isUnlocked = cap.unlockDate <= todayStr;
          const target = new Date(`${cap.unlockDate}T00:00:00`);
          const daysLeft = Math.max(
            0,
            Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          );

          return (
            <TouchableOpacity
              key={cap.id}
              onPress={() => handlePressCapsule(cap)}
              activeOpacity={0.85}
              style={[
                styles.capsuleCard,
                {
                  borderLeftColor: isUnlocked ? '#10b981' : primaryColor,
                  borderLeftWidth: 4,
                },
              ]}
            >
              <View
                style={[
                  styles.lockCircle,
                  {
                    backgroundColor: isUnlocked ? '#d1fae5' : `${primaryColor}15`,
                  },
                ]}
              >
                <Ionicons
                  name={isUnlocked ? 'lock-open' : 'lock-closed'}
                  size={18}
                  color={isUnlocked ? '#059669' : primaryColor}
                />
              </View>

              <View style={styles.capsuleCenter}>
                <View style={styles.capsuleTopRow}>
                  <Text style={[styles.occasionTag, { color: primaryColor }]}>
                    {cap.occasion.toUpperCase()}
                  </Text>
                  <View
                    style={[
                      styles.countdownPill,
                      {
                        backgroundColor: isUnlocked ? '#d1fae5' : `${primaryColor}15`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countdownText,
                        { color: isUnlocked ? '#059669' : primaryColor },
                      ]}
                    >
                      {isUnlocked ? 'Lista para abrir' : `Faltan ${daysLeft} días`}
                    </Text>
                  </View>
                </View>

                <Text style={styles.capsuleTitle} numberOfLines={1}>
                  {cap.title}
                </Text>
                <Text style={styles.capsuleMeta}>
                  De {cap.sender === 'Karla' ? 'Karlita' : 'Javier'} • Apertura:{' '}
                  {formatDisplayDate(cap.unlockDate)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => onDeleteCapsule(cap.id)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={15} color="#94a3b8" />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      )}

      {/* Modal para leer cápsula desbloqueada */}
      <Modal
        visible={Boolean(openedCapsule)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenedCapsule(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {openedCapsule && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{openedCapsule.title}</Text>
                  <TouchableOpacity
                    onPress={() => setOpenedCapsule(null)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.occasionTag, { color: primaryColor, marginBottom: 8 }]}>
                  {openedCapsule.occasion.toUpperCase()} • DE{' '}
                  {openedCapsule.sender === 'Karla' ? 'KARLITA' : 'JAVIER'}
                </Text>
                <View style={[styles.letterBox, { borderColor: `${primaryColor}30` }]}>
                  <Text style={styles.letterContent}>“{openedCapsule.content}”</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setOpenedCapsule(null)}
                  style={[styles.saveBtn, { backgroundColor: primaryColor }]}
                >
                  <Text style={styles.saveBtnText}>Guardar en el Corazón</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para crear nueva cápsula */}
      <Modal
        visible={isAddOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sellar Cápsula del Tiempo</Text>
              <TouchableOpacity
                onPress={() => setIsAddOpen(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título de la cápsula</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ej. Para cuando cumplamos otro año juntos"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />

              <Text style={styles.label}>Ocasión</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 10 }}
              >
                {OCCASIONS.map((occ) => {
                  const active = occasion === occ;
                  return (
                    <TouchableOpacity
                      key={occ}
                      onPress={() => setOccasion(occ)}
                      style={[
                        styles.occChip,
                        active && { backgroundColor: primaryColor, borderColor: primaryColor },
                      ]}
                    >
                      <Text
                        style={[
                          styles.occChipText,
                          active && { color: '#ffffff', fontWeight: '700' },
                        ]}
                      >
                        {occ}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Fecha de Apertura</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateSelectorBtn}
              >
                <Ionicons name="calendar-outline" size={18} color={primaryColor} />
                <Text style={styles.dateSelectorText}>
                  {formatDisplayDate(unlockDate, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Mensaje secreto en el interior</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Escribe lo que quieres que lea cuando llegue ese día..."
                placeholderTextColor="#94a3b8"
                multiline
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
              />

              <TouchableOpacity
                onPress={handleCreate}
                style={[styles.saveBtn, { backgroundColor: primaryColor }]}
              >
                <Ionicons name="lock-closed" size={16} color="#ffffff" />
                <Text style={styles.saveBtnText}>Sellar con Candado</Text>
              </TouchableOpacity>
            </ScrollView>

            <DatePickerModal
              visible={showDatePicker}
              value={unlockDate}
              onSelect={(d) => setUnlockDate(d)}
              onClose={() => setShowDatePicker(false)}
              title="Fecha de desbloqueo de la cápsula"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  capsuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  lockCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleCenter: {
    flex: 1,
  },
  capsuleTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  occasionTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
  },
  capsuleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  capsuleMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
    flex: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginVertical: 10,
  },
  letterContent: {
    fontSize: 15,
    color: '#1e293b',
    fontFamily: FONTS.serif,
    lineHeight: 23,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1e293b',
  },
  occChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  occChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { toLocalDateString } from '../../services/StorageService';
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  DateCategory,
  ConcreteDateCategory,
  DateIdea,
  DATE_CATEGORIES,
  getAllDateIdeas,
  addCustomDateIdea,
  deleteCustomDateIdea,
} from '../../services/feature/dateRouletteService';
import { saveCoupleEvent, syncNextEventSummaryToHome } from '../../services/feature/eventsService';
import { UserProfile } from '../../types';

const CONCRETE_CATEGORIES: ConcreteDateCategory[] = [
  'En Casa',
  'Al Aire Libre',
  'Romántica',
  'Sorpresa',
  'Bajo Presupuesto',
];

const IDEA_EMOJIS = ['✨', '🍕', '🧺', '🍷', '🎬', '🍦', '🌌', '🎲', '🚗', '🥞'];

export const DateRouletteModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor, primaryLight } = useTheme();
  const { profile } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';

  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DateCategory>('Todas');
  const [spinning, setSpinning] = useState(false);
  const [previewIdea, setPreviewIdea] = useState<DateIdea | null>(null);
  const [winnerIdea, setWinnerIdea] = useState<DateIdea | null>(null);
  const [scheduleWhen, setScheduleWhen] = useState<'today' | 'tomorrow'>('today');
  const [scheduling, setScheduling] = useState(false);
  const [scheduledBanner, setScheduledBanner] = useState<string | null>(null);

  // Formulario para agregar idea propia
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<ConcreteDateCategory>('Romántica');
  const [newEmoji, setNewEmoji] = useState('✨');

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadIdeas = useCallback(async () => {
    const all = await getAllDateIdeas();
    setIdeas(all);
  }, []);

  useEffect(() => {
    if (!visible) {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      setSpinning(false);
      return;
    }
    void loadIdeas();
  }, [visible, loadIdeas]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const filteredPool = useMemo(
    () =>
      selectedCategory === 'Todas'
        ? ideas
        : ideas.filter((i) => i.category === selectedCategory),
    [ideas, selectedCategory]
  );

  const handleSpin = () => {
    if (spinning || filteredPool.length === 0) return;
    setSpinning(true);
    setWinnerIdea(null);
    setScheduledBanner(null);

    const totalSteps = 18;
    const finalWinner =
      filteredPool[Math.floor(Math.random() * filteredPool.length)] || filteredPool[0];

    let step = 0;
    const runStep = () => {
      step += 1;
      if (step < totalSteps) {
        const randomItem =
          filteredPool[Math.floor(Math.random() * filteredPool.length)] || finalWinner;
        setPreviewIdea(randomItem);

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.04,
            duration: 45,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 45,
            useNativeDriver: true,
          }),
        ]).start();

        const delay = 55 + Math.floor(step * 12);
        spinTimerRef.current = setTimeout(runStep, delay);
      } else {
        setPreviewIdea(finalWinner);
        setWinnerIdea(finalWinner);
        setSpinning(false);

        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1.07,
            useNativeDriver: true,
            speed: 20,
            bounciness: 12,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 16,
          }),
        ]).start();
      }
    };

    runStep();
  };

  const handleScheduleWinner = async () => {
    if (!winnerIdea || scheduling) return;
    setScheduling(true);
    try {
      const target = new Date();
      if (scheduleWhen === 'tomorrow') {
        target.setDate(target.getDate() + 1);
      }
      const dateStr = toLocalDateString(target);

      await saveCoupleEvent({
        title: `${winnerIdea.emoji} ${winnerIdea.title}`,
        event_date: dateStr,
        event_time: '20:00',
        location: winnerIdea.category,
        notes: winnerIdea.description,
        remind_minutes_before: 60,
        created_by: activeProfile,
      });
      void syncNextEventSummaryToHome(activeProfile);

      const dayWord = scheduleWhen === 'today' ? 'hoy' : 'mañana';
      setScheduledBanner(
        `¡Cita "${winnerIdea.title}" agendada para ${dayWord} en su Agenda y en Hoy! 📅`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo agendar la cita.');
    } finally {
      setScheduling(false);
    }
  };

  const handleAddCustom = async () => {
    const clean = newTitle.trim();
    if (!clean) {
      Alert.alert('Falta el título', 'Escribe el nombre de tu idea de cita.');
      return;
    }
    try {
      const created = await addCustomDateIdea({
        title: clean,
        description: newDesc.trim() || undefined,
        category: newCategory,
        emoji: newEmoji,
      });
      setNewTitle('');
      setNewDesc('');
      setShowAddForm(false);
      await loadIdeas();
      setWinnerIdea(created);
      setPreviewIdea(created);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar la idea.');
    }
  };

  const handleDeleteCustom = async (idea: DateIdea) => {
    await deleteCustomDateIdea(idea.id);
    if (winnerIdea?.id === idea.id) setWinnerIdea(null);
    if (previewIdea?.id === idea.id) setPreviewIdea(null);
    await loadIdeas();
  };

  const displayedIdea = winnerIdea || previewIdea;

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="¿Qué hacemos hoy?"
      subtitle="Ruleta de citas para elegir su próximo plan juntos"
      icon="disc"
    >
      {/* Categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
      >
        {DATE_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                setSelectedCategory(cat);
                setScheduledBanner(null);
              }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active ? primaryColor : colors.surfaceAlt,
                  borderColor: active ? primaryColor : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: active ? '#ffffff' : colors.textSecondary },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Escenario de la Ruleta */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <FeatureCard
          style={[
            styles.rouletteStageCard,
            {
              borderColor: winnerIdea ? primaryColor : colors.border,
              borderWidth: winnerIdea ? 2 : 1,
            },
          ]}
        >
          {winnerIdea ? (
            <View style={[styles.confettiRibbon, { backgroundColor: primaryLight }]}>
              <Text style={[styles.confettiText, { color: primaryColor }]}>
                🎉 ✨ ¡CITA GANADORA ELEGIDA AL AZAR! ✨ 🎉
              </Text>
            </View>
          ) : (
            <View style={styles.stageHeaderRow}>
              <Ionicons name="disc" size={18} color={primaryColor} />
              <Text style={[styles.stageHint, { color: colors.textSecondary }]}>
                {spinning
                  ? 'Girando la ruleta del amor...'
                  : `${filteredPool.length} opciones listas en "${selectedCategory}"`}
              </Text>
            </View>
          )}

          {displayedIdea ? (
            <View style={styles.winnerBox}>
              <View style={[styles.bigEmojiCircle, { backgroundColor: primaryLight }]}>
                <Text style={styles.bigEmoji}>{displayedIdea.emoji}</Text>
              </View>
              <View
                style={[
                  styles.catPill,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.catPillText, { color: primaryColor }]}>
                  {displayedIdea.category}
                </Text>
              </View>
              <Text style={[styles.winnerTitle, { color: colors.text }]}>
                {displayedIdea.title}
              </Text>
              <Text style={[styles.winnerDesc, { color: colors.textSecondary }]}>
                {displayedIdea.description}
              </Text>
            </View>
          ) : (
            <View style={styles.placeholderBox}>
              <Text style={styles.placeholderEmoji}>🎡</Text>
              <Text style={[styles.placeholderTitle, { color: colors.text }]}>
                ¿Indecisos sobre qué hacer hoy?
              </Text>
              <Text style={[styles.placeholderSub, { color: colors.textMuted }]}>
                Toca el botón para girar la ruleta y dejar que el destino elija su cita ideal.
              </Text>
            </View>
          )}

          <FeatureButton
            label={
              spinning
                ? 'Girando ruleta...'
                : winnerIdea
                ? '¡Girar Ruleta de Citas otra vez!'
                : '¡Girar Ruleta de Citas!'
            }
            icon="shuffle"
            onPress={handleSpin}
            disabled={spinning || filteredPool.length === 0}
          />

          {/* Sección de agendar cita cuando hay ganadora */}
          {winnerIdea && !spinning ? (
            <View style={[styles.scheduleSection, { borderTopColor: colors.border }]}>
              <View style={styles.whenSelectorRow}>
                <Text style={[styles.whenLabel, { color: colors.textSecondary }]}>
                  ¿Para cuándo?
                </Text>
                <View style={styles.whenPills}>
                  <TouchableOpacity
                    onPress={() => setScheduleWhen('today')}
                    style={[
                      styles.whenBtn,
                      {
                        backgroundColor:
                          scheduleWhen === 'today' ? primaryColor : colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.whenBtnText,
                        { color: scheduleWhen === 'today' ? '#ffffff' : colors.text },
                      ]}
                    >
                      Para Hoy
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setScheduleWhen('tomorrow')}
                    style={[
                      styles.whenBtn,
                      {
                        backgroundColor:
                          scheduleWhen === 'tomorrow' ? primaryColor : colors.surfaceAlt,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.whenBtnText,
                        { color: scheduleWhen === 'tomorrow' ? '#ffffff' : colors.text },
                      ]}
                    >
                      Para Mañana
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <FeatureButton
                label={scheduling ? 'Agendando...' : 'Agendar esta cita'}
                icon="calendar-outline"
                variant="ghost"
                onPress={handleScheduleWinner}
                disabled={scheduling}
                style={{ borderWidth: 1, borderColor: primaryColor }}
              />

              {scheduledBanner ? (
                <View
                  style={[
                    styles.scheduledSuccess,
                    { backgroundColor: primaryLight, borderColor: primaryColor },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color={primaryColor} />
                  <Text style={[styles.scheduledSuccessText, { color: colors.text }]}>
                    {scheduledBanner}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </FeatureCard>
      </Animated.View>

      {/* Agregar idea personalizada */}
      <View style={styles.listHeaderRow}>
        <View style={styles.listTitleWrap}>
          <Ionicons name="sparkles" size={16} color={primaryColor} />
          <Text style={[styles.listTitle, { color: colors.text }]}>
            Ideas en esta categoría ({filteredPool.length})
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddForm((prev) => !prev)}
          style={[styles.addIdeaBtn, { backgroundColor: primaryLight }]}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={15} color={primaryColor} />
          <Text style={[styles.addIdeaBtnText, { color: primaryColor }]}>
            {showAddForm ? 'Cerrar' : 'Nueva idea'}
          </Text>
        </TouchableOpacity>
      </View>

      {showAddForm ? (
        <FeatureCard style={{ borderColor: primaryColor, borderWidth: 1 }}>
          <Text style={[styles.formSectionTitle, { color: colors.text }]}>
            Agregar idea personalizada a la ruleta
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiPickRow}
          >
            {IDEA_EMOJIS.map((em) => (
              <TouchableOpacity
                key={em}
                onPress={() => setNewEmoji(em)}
                style={[
                  styles.emojiCell,
                  {
                    backgroundColor: newEmoji === em ? primaryLight : colors.surfaceAlt,
                    borderColor: newEmoji === em ? primaryColor : colors.border,
                  },
                ]}
              >
                <Text style={styles.emojiCellText}>{em}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="Título de la cita (ej. Ir por churros y chocolate)"
            placeholderTextColor={colors.textMuted}
            maxLength={120}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          <TextInput
            value={newDesc}
            onChangeText={setNewDesc}
            placeholder="Descripción breve (opcional)"
            placeholderTextColor={colors.textMuted}
            maxLength={260}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {CONCRETE_CATEGORIES.map((cat) => {
              const selected = newCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? primaryColor : colors.surfaceAlt,
                      borderColor: selected ? primaryColor : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: selected ? '#ffffff' : colors.textSecondary },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FeatureButton
            label="Guardar idea en la ruleta"
            icon="checkmark-circle"
            onPress={handleAddCustom}
            disabled={!newTitle.trim()}
            style={{ marginTop: 8 }}
          />
        </FeatureCard>
      ) : null}

      {/* Lista continua de ideas */}
      {filteredPool.map((idea) => {
        const isCurrentWinner = winnerIdea?.id === idea.id;
        return (
          <TouchableOpacity
            key={idea.id}
            activeOpacity={0.85}
            onPress={() => {
              setWinnerIdea(idea);
              setPreviewIdea(idea);
              setScheduledBanner(null);
            }}
          >
            <FeatureCard
              style={[
                styles.ideaRowCard,
                isCurrentWinner && { borderColor: primaryColor, borderWidth: 1.5 },
              ]}
            >
              <View style={[styles.ideaEmojiBox, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={styles.ideaEmojiText}>{idea.emoji}</Text>
              </View>
              <View style={styles.ideaBody}>
                <View style={styles.ideaHeaderLine}>
                  <Text style={[styles.ideaCategoryTag, { color: primaryColor }]}>
                    {idea.category}
                    {idea.isCustom ? ' · Personalizada' : ''}
                  </Text>
                </View>
                <Text style={[styles.ideaTitle, { color: colors.text }]}>{idea.title}</Text>
                <Text style={[styles.ideaDesc, { color: colors.textSecondary }]}>
                  {idea.description}
                </Text>
              </View>
              {idea.isCustom ? (
                <TouchableOpacity
                  onPress={() => handleDeleteCustom(idea)}
                  style={[styles.deleteCustomBtn, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="Eliminar idea personalizada"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              ) : null}
            </FeatureCard>
          </TouchableOpacity>
        );
      })}
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rouletteStageCard: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
  },
  confettiRibbon: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  confettiText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  winnerBox: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  bigEmojiCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bigEmoji: {
    fontSize: 38,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  winnerTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 25,
  },
  winnerDesc: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  placeholderBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  scheduleSection: {
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 10,
  },
  whenSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  whenLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  whenPills: {
    flexDirection: 'row',
    gap: 8,
  },
  whenBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  whenBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scheduledSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scheduledSuccessText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  listTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  addIdeaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addIdeaBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  emojiPickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  emojiCell: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiCellText: {
    fontSize: 18,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  ideaRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  ideaEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaEmojiText: {
    fontSize: 22,
  },
  ideaBody: {
    flex: 1,
    gap: 2,
  },
  ideaHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ideaCategoryTag: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ideaTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  ideaDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  deleteCustomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

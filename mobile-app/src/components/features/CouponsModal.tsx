import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '../ui/Icon';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfile } from '../../contexts/ProfileContext';
import { formatDisplayDate } from '../../services/StorageService';
import {
  FeatureModalShell,
  FeatureCard,
  FeatureButton,
  FeatureModalProps,
} from './FeatureModalShell';
import {
  LoveCoupon,
  CouponTemplate,
  COUPON_TEMPLATES,
  COUPON_EMOJIS,
  getAllCoupons,
  createCoupon,
  redeemCoupon,
  deleteCoupon,
  subscribeCoupons,
} from '../../services/feature/couponsService';
import { UserProfile } from '../../types';

type CouponTab = 'mine' | 'gifted' | 'create';

export const CouponsModal: React.FC<FeatureModalProps> = ({ visible, onClose }) => {
  const { colors, primaryColor, primaryLight } = useTheme();
  const { profile, getDisplayName } = useProfile();
  const activeProfile: UserProfile = profile || 'Karla';
  const partnerProfile: UserProfile = activeProfile === 'Javier' ? 'Karla' : 'Javier';

  const [activeTab, setActiveTab] = useState<CouponTab>('mine');
  const [coupons, setCoupons] = useState<LoveCoupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario de creación
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🎟️');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllCoupons();
      setCoupons(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void loadData();
    const unsub = subscribeCoupons(() => {
      void loadData();
    });
    return unsub;
  }, [visible, loadData]);

  const myCoupons = useMemo(
    () =>
      coupons
        .filter((c) => c.recipient === activeProfile)
        .sort((a, b) => {
          if (a.is_redeemed !== b.is_redeemed) return a.is_redeemed ? 1 : -1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        }),
    [coupons, activeProfile]
  );

  const giftedCoupons = useMemo(
    () =>
      coupons
        .filter((c) => c.issued_by === activeProfile)
        .sort((a, b) => {
          if (a.is_redeemed !== b.is_redeemed) return a.is_redeemed ? 1 : -1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        }),
    [coupons, activeProfile]
  );

  const availableMyCount = useMemo(
    () => myCoupons.filter((c) => !c.is_redeemed).length,
    [myCoupons]
  );

  const handleSelectTemplate = (tpl: CouponTemplate) => {
    setTitle(tpl.title);
    setDescription(tpl.description);
    setEmoji(tpl.emoji);
    setFeedbackMsg(null);
  };

  const handleCreateCoupon = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Falta el título', 'Escribe o elige una plantilla para tu vale de amor.');
      return;
    }
    setSaving(true);
    setFeedbackMsg(null);
    try {
      await createCoupon({
        title: cleanTitle,
        description: description.trim() || null,
        emoji,
        issued_by: activeProfile,
        recipient: partnerProfile,
      });
      setTitle('');
      setDescription('');
      setEmoji('🎟️');
      setFeedbackMsg(`¡Vale enviado con amor a ${getDisplayName(partnerProfile)}! ✨`);
      await loadData();
      setActiveTab('gifted');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo crear el vale.');
    } finally {
      setSaving(false);
    }
  };

  const handleRedeem = async (coupon: LoveCoupon) => {
    if (coupon.is_redeemed) return;
    setRedeemingId(coupon.id);
    try {
      await redeemCoupon(coupon.id, activeProfile);
      await loadData();
      Alert.alert(
        '🎉 ¡Cupón Canjeado!',
        `Has canjeado "${coupon.title}". Se envió una notificación a ${getDisplayName(coupon.issued_by)} para que te lo cumpla.`
      );
    } finally {
      setRedeemingId(null);
    }
  };

  const handleDelete = (coupon: LoveCoupon) => {
    Alert.alert(
      'Eliminar vale',
      `¿Seguro que deseas eliminar "${coupon.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteCoupon(coupon.id);
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <FeatureModalShell
      visible={visible}
      onClose={onClose}
      title="Vales de Pareja"
      subtitle="Cuponera de amor canjeable en cualquier momento"
      icon="ticket"
    >
      {/* Resumen superior */}
      <View
        style={[
          styles.summaryBanner,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryItem}>
          <Ionicons name="ticket" size={18} color={primaryColor} />
          <Text style={[styles.summaryNum, { color: colors.text }]}>{availableMyCount}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {availableMyCount === 1 ? 'disponible para mí' : 'disponibles para mí'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="gift" size={16} color={primaryColor} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {giftedCoupons.length} {giftedCoupons.length === 1 ? 'regalado' : 'regalados'}
          </Text>
        </View>
      </View>

      {/* Pestañas */}
      <View
        style={[
          styles.tabsBar,
          { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('mine')}
          style={[
            styles.tabBtn,
            activeTab === 'mine' && { backgroundColor: primaryColor },
          ]}
        >
          <Ionicons
            name="ticket"
            size={15}
            color={activeTab === 'mine' ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'mine' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Para mí ({myCoupons.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('gifted')}
          style={[
            styles.tabBtn,
            activeTab === 'gifted' && { backgroundColor: primaryColor },
          ]}
        >
          <Ionicons
            name="gift"
            size={15}
            color={activeTab === 'gifted' ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'gifted' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Regalados ({giftedCoupons.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('create')}
          style={[
            styles.tabBtn,
            activeTab === 'create' && { backgroundColor: primaryColor },
          ]}
        >
          <Ionicons
            name="add"
            size={16}
            color={activeTab === 'create' ? '#ffffff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              { color: activeTab === 'create' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Crear vale
          </Text>
        </TouchableOpacity>
      </View>

      {feedbackMsg ? (
        <View
          style={[
            styles.feedbackBox,
            { backgroundColor: primaryLight, borderColor: primaryColor },
          ]}
        >
          <Ionicons name="sparkles" size={16} color={primaryColor} />
          <Text style={[styles.feedbackText, { color: colors.text }]}>{feedbackMsg}</Text>
        </View>
      ) : null}

      {loading && coupons.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={primaryColor} />
        </View>
      ) : null}

      {/* TAB 1: PARA MÍ */}
      {activeTab === 'mine' ? (
        myCoupons.length === 0 ? (
          <FeatureCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Aún no tienes vales en tu cuponera
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Cuando {getDisplayName(partnerProfile)} te regale un vale de amor aparecerá aquí listo para canjear. ¡También puedes regalarle uno primero!
            </Text>
            <FeatureButton
              label={`Regalar un vale a ${getDisplayName(partnerProfile)}`}
              icon="gift"
              onPress={() => setActiveTab('create')}
            />
          </FeatureCard>
        ) : (
          myCoupons.map((coupon) => (
            <FeatureCard
              key={coupon.id}
              style={[
                styles.couponCard,
                {
                  borderColor: coupon.is_redeemed ? colors.border : primaryColor,
                  opacity: coupon.is_redeemed ? 0.78 : 1,
                },
              ]}
            >
              <View style={styles.couponTopRow}>
                <View
                  style={[
                    styles.emojiBadge,
                    { backgroundColor: coupon.is_redeemed ? colors.surfaceAlt : primaryLight },
                  ]}
                >
                  <Text style={styles.emojiText}>{coupon.emoji || '🎟️'}</Text>
                </View>
                <View style={styles.couponTextCol}>
                  <View style={styles.issuerRow}>
                    <Text style={[styles.issuerTag, { color: primaryColor }]}>
                      De {getDisplayName(coupon.issued_by)} para ti
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: coupon.is_redeemed
                            ? colors.surfaceAlt
                            : `${primaryColor}20`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: coupon.is_redeemed ? colors.textMuted : primaryColor,
                          },
                        ]}
                      >
                        {coupon.is_redeemed ? 'Canjeado ✓' : 'Disponible'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.couponTitle, { color: colors.text }]}>
                    {coupon.title}
                  </Text>
                  {coupon.description ? (
                    <Text style={[styles.couponDesc, { color: colors.textSecondary }]}>
                      {coupon.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.perforatedDivider, { borderColor: colors.border }]} />

              <View style={styles.couponFooter}>
                <Text style={[styles.couponDateText, { color: colors.textMuted }]}>
                  {coupon.is_redeemed && coupon.redeemed_at
                    ? `Canjeado el ${formatDisplayDate(coupon.redeemed_at, {
                        day: 'numeric',
                        month: 'short',
                      })}`
                    : `Recibido el ${formatDisplayDate(coupon.created_at, {
                        day: 'numeric',
                        month: 'short',
                      })}`}
                </Text>

                {!coupon.is_redeemed ? (
                  <FeatureButton
                    label={
                      redeemingId === coupon.id ? 'Canjeando...' : 'Canjear cupón'
                    }
                    icon="checkmark-circle"
                    onPress={() => handleRedeem(coupon)}
                    disabled={redeemingId === coupon.id}
                    style={styles.redeemButton}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={() => handleDelete(coupon)}
                    style={[styles.iconDeleteBtn, { backgroundColor: colors.surfaceAlt }]}
                    accessibilityLabel="Eliminar cupón"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </FeatureCard>
          ))
        )
      ) : null}

      {/* TAB 2: REGALADOS */}
      {activeTab === 'gifted' ? (
        giftedCoupons.length === 0 ? (
          <FeatureCard style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎁</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Aún no has regalado vales
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Sorprende a {getDisplayName(partnerProfile)} con un vale por un masaje, su cena favorita o una cita sorpresa.
            </Text>
            <FeatureButton
              label="Crear primer vale de amor"
              icon="add"
              onPress={() => setActiveTab('create')}
            />
          </FeatureCard>
        ) : (
          giftedCoupons.map((coupon) => (
            <FeatureCard
              key={coupon.id}
              style={[
                styles.couponCard,
                {
                  borderColor: coupon.is_redeemed ? colors.success : colors.border,
                },
              ]}
            >
              <View style={styles.couponTopRow}>
                <View
                  style={[
                    styles.emojiBadge,
                    { backgroundColor: colors.surfaceAlt },
                  ]}
                >
                  <Text style={styles.emojiText}>{coupon.emoji || '🎟️'}</Text>
                </View>
                <View style={styles.couponTextCol}>
                  <View style={styles.issuerRow}>
                    <Text style={[styles.issuerTag, { color: colors.textSecondary }]}>
                      Para {getDisplayName(coupon.recipient)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: coupon.is_redeemed
                            ? `${colors.success}22`
                            : `${primaryColor}18`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: coupon.is_redeemed ? colors.success : primaryColor,
                          },
                        ]}
                      >
                        {coupon.is_redeemed ? '¡Ya lo canjeó! 🎉' : 'Por canjear'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.couponTitle, { color: colors.text }]}>
                    {coupon.title}
                  </Text>
                  {coupon.description ? (
                    <Text style={[styles.couponDesc, { color: colors.textSecondary }]}>
                      {coupon.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.perforatedDivider, { borderColor: colors.border }]} />

              <View style={styles.couponFooter}>
                <Text style={[styles.couponDateText, { color: colors.textMuted }]}>
                  {coupon.is_redeemed && coupon.redeemed_at
                    ? `Canjeado el ${formatDisplayDate(coupon.redeemed_at, {
                        day: 'numeric',
                        month: 'short',
                      })}`
                    : `Regalado el ${formatDisplayDate(coupon.created_at, {
                        day: 'numeric',
                        month: 'short',
                      })}`}
                </Text>

                <TouchableOpacity
                  onPress={() => handleDelete(coupon)}
                  style={[styles.iconDeleteBtn, { backgroundColor: colors.surfaceAlt }]}
                  accessibilityLabel="Eliminar vale"
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </FeatureCard>
          ))
        )
      ) : null}

      {/* TAB 3: CREAR VALE */}
      {activeTab === 'create' ? (
        <>
          <FeatureCard style={{ borderColor: primaryColor, borderWidth: 1 }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="create-outline" size={17} color={primaryColor} />
              <Text style={[styles.sectionHeaderTitle, { color: colors.text }]}>
                Personaliza tu vale para {getDisplayName(partnerProfile)}
              </Text>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Ícono del vale
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiSelectorRow}
            >
              {COUPON_EMOJIS.map((em) => {
                const selected = emoji === em;
                return (
                  <TouchableOpacity
                    key={em}
                    onPress={() => setEmoji(em)}
                    style={[
                      styles.emojiOption,
                      {
                        backgroundColor: selected ? primaryLight : colors.surfaceAlt,
                        borderColor: selected ? primaryColor : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.emojiOptionText}>{em}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Título del vale *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Vale por un masaje relajante 💆"
              placeholderTextColor={colors.textMuted}
              maxLength={160}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Descripción o condiciones cariñosas (opcional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ej. Válido cualquier día con muchos besos incluidos..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surfaceAlt,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <FeatureButton
              label={
                saving
                  ? 'Enviando vale...'
                  : `Regalar vale a ${getDisplayName(partnerProfile)}`
              }
              icon="gift"
              onPress={handleCreateCoupon}
              disabled={saving || !title.trim()}
            />
          </FeatureCard>

          <View style={styles.templatesHeader}>
            <Ionicons name="sparkles" size={16} color={primaryColor} />
            <Text style={[styles.templatesTitle, { color: colors.text }]}>
              10 ideas románticas (toca una para usarla)
            </Text>
          </View>

          {COUPON_TEMPLATES.map((tpl) => {
            const isSelected = title === tpl.title;
            return (
              <TouchableOpacity
                key={tpl.id}
                activeOpacity={0.82}
                onPress={() => handleSelectTemplate(tpl)}
              >
                <FeatureCard
                  style={[
                    styles.templateCard,
                    isSelected && { borderColor: primaryColor, borderWidth: 1.5 },
                  ]}
                >
                  <View style={[styles.templateEmojiWrap, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={styles.templateEmoji}>{tpl.emoji}</Text>
                  </View>
                  <View style={styles.templateContent}>
                    <Text style={[styles.templateItemTitle, { color: colors.text }]}>
                      {tpl.title}
                    </Text>
                    <Text style={[styles.templateItemDesc, { color: colors.textSecondary }]}>
                      {tpl.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={20}
                    color={isSelected ? primaryColor : colors.textMuted}
                  />
                </FeatureCard>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}
    </FeatureModalShell>
  );
};

const styles = StyleSheet.create({
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 38,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
  couponCard: {
    borderWidth: 1,
    gap: 12,
  },
  couponTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  emojiBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 26,
  },
  couponTextCol: {
    flex: 1,
    gap: 4,
  },
  issuerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  issuerTag: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  couponDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  perforatedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  couponFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  couponDateText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  redeemButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  iconDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  emojiSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  emojiOption: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionText: {
    fontSize: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  textArea: {
    minHeight: 74,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  templatesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  templateEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateEmoji: {
    fontSize: 22,
  },
  templateContent: {
    flex: 1,
    gap: 2,
  },
  templateItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  templateItemDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
});

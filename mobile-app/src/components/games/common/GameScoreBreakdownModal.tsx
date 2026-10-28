import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../ui/Icon';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';
import {
  GamesLeaderboard,
  GameScoreBreakdown,
  getDaysRemainingInWeek,
  UNIFIED_GAME_REWARDS,
} from '../../../services/CoupleSyncService';
import { useProfile } from '../../../contexts/ProfileContext';

interface GameScoreBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  leaderboard: GamesLeaderboard;
  initialPlayer?: 'all' | 'Karla' | 'Javier';
  primaryColor?: string;
}

interface GameCardMeta {
  key: keyof GameScoreBreakdown;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgSoft: string;
}

const GAME_CARDS: GameCardMeta[] = [
  {
    key: 'tictactoe',
    title: 'Tres en Raya',
    subtitle: 'Duelo clásico por rondas',
    icon: 'grid-outline',
    color: '#8b5cf6',
    bgSoft: '#f5f3ff',
  },
  {
    key: 'sudoku',
    title: 'Sudoku Colaborativo',
    subtitle: 'Puzzles resueltos en equipo',
    icon: 'extension-puzzle-outline',
    color: '#06b6d4',
    bgSoft: '#ecfeff',
  },
  {
    key: 'chess',
    title: 'Ajedrez',
    subtitle: 'Blancas (Karla) vs Negras (Javier)',
    icon: 'shield-half-outline',
    color: '#d97706',
    bgSoft: '#fffbeb',
  },
  {
    key: 'hangman',
    title: 'Ahorcado',
    subtitle: 'Palabras y retos de pareja',
    icon: 'chatbubbles-outline',
    color: '#ec4899',
    bgSoft: '#fdf2f8',
  },
  {
    key: 'battleship',
    title: 'Batalla Naval',
    subtitle: 'Estrategia oceánica 10x10',
    icon: 'boat-outline',
    color: '#0284c7',
    bgSoft: '#f0f9ff',
  },
];

const { height: SCREEN_H } = Dimensions.get('window');

export const GameScoreBreakdownModal: React.FC<GameScoreBreakdownModalProps> = ({
  visible,
  onClose,
  leaderboard,
  initialPlayer = 'all',
}) => {
  const { getDisplayName } = useProfile();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Karla' | 'Javier'>(initialPlayer);

  // Sincronizar el filtro cuando se abre con un jugador específico
  React.useEffect(() => {
    if (visible) {
      setSelectedFilter(initialPlayer);
    }
  }, [visible, initialPlayer]);

  if (!visible) return null;

  const daysRemaining = getDaysRemainingInWeek();
  const weekLabel = leaderboard?.weekKey ? `Semana ${leaderboard.weekKey.replace(/^.*-W0?/, '')}` : 'Semana Actual';

  const ptsK = leaderboard?.pointsKarla || 0;
  const ptsJ = leaderboard?.pointsJavier || 0;
  const trofK = leaderboard?.trophiesKarla || 0;
  const trofJ = leaderboard?.trophiesJavier || 0;

  const isKarlaLeading = ptsK > ptsJ;
  const isJavierLeading = ptsJ > ptsK;
  const isTied = ptsK === ptsJ;

  const breakdown = leaderboard?.breakdown;
  const lastWeek = leaderboard?.lastWeekSummary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header con Título y Botón Cerrar */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="trophy" size={20} color={GAMES_THEME.colors.coral} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Desglose de Juegos</Text>
                <Text style={styles.headerSubtitle}>
                  {weekLabel} • {daysRemaining === 0 ? '¡Hoy reinicia!' : `Termina en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                onClose();
              }}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Cerrar desglose"
            >
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Marcador Global Semanal */}
          <LinearGradient
            colors={['#fff1f2', '#fdf4ff', '#f0f9ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            {/* Jugador Karla */}
            <View style={[styles.playerSummaryCol, isKarlaLeading && styles.playerSummaryColLeader]}>
              <View style={[styles.summaryAvatarCircle, { backgroundColor: '#f3e8ff', borderColor: '#c084fc' }]}>
                <Text style={[styles.summaryAvatarLetter, { color: '#9333ea' }]}>
                  {getDisplayName('Karla').charAt(0).toUpperCase()}
                </Text>
                {isKarlaLeading && (
                  <View style={styles.crownBadge}>
                    <Ionicons name="sparkles" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.summaryPlayerName} numberOfLines={1}>
                {getDisplayName('Karla')}
              </Text>
              <Text style={[styles.summaryPlayerPoints, { color: '#9333ea' }]}>
                {ptsK} <Text style={styles.summaryPtsUnit}>pts</Text>
              </Text>
              <View style={styles.summaryTrophyRow}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.summaryTrophyText}>{trofK} trofeo{trofK === 1 ? '' : 's'}</Text>
              </View>
            </View>

            {/* Divisor VS */}
            <View style={styles.vsContainer}>
              <View style={styles.vsCircle}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <Text style={styles.statusLabelText}>
                {isTied ? 'Empate 💕' : isKarlaLeading ? `${getDisplayName('Karla')} va ganando` : `${getDisplayName('Javier')} va ganando`}
              </Text>
            </View>

            {/* Jugador Javier */}
            <View style={[styles.playerSummaryCol, isJavierLeading && styles.playerSummaryColLeader]}>
              <View style={[styles.summaryAvatarCircle, { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' }]}>
                <Text style={[styles.summaryAvatarLetter, { color: '#0284c7' }]}>
                  {getDisplayName('Javier').charAt(0).toUpperCase()}
                </Text>
                {isJavierLeading && (
                  <View style={styles.crownBadge}>
                    <Ionicons name="sparkles" size={10} color="#ffffff" />
                  </View>
                )}
              </View>
              <Text style={styles.summaryPlayerName} numberOfLines={1}>
                {getDisplayName('Javier')}
              </Text>
              <Text style={[styles.summaryPlayerPoints, { color: '#0284c7' }]}>
                {ptsJ} <Text style={styles.summaryPtsUnit}>pts</Text>
              </Text>
              <View style={styles.summaryTrophyRow}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.summaryTrophyText}>{trofJ} trofeo{trofJ === 1 ? '' : 's'}</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Resumen de la semana anterior si existe */}
          {Boolean(lastWeek) && (
            <View style={styles.lastWeekBadge}>
              <Ionicons name="ribbon-outline" size={14} color="#b45309" />
              <Text style={styles.lastWeekText}>
                Semana anterior: Ganó {lastWeek?.winner === 'Empate' ? 'Empate amistoso' : getDisplayName(lastWeek?.winner as any)} ({Math.max(lastWeek?.pointsKarla || 0, lastWeek?.pointsJavier || 0)} pts)
              </Text>
            </View>
          )}

          {/* Selector de Pestañas (Filtro) */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('all');
              }}
              style={[styles.tabButton, selectedFilter === 'all' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, selectedFilter === 'all' && styles.tabButtonTextActive]}>
                Comparativa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('Karla');
              }}
              style={[styles.tabButton, selectedFilter === 'Karla' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, selectedFilter === 'Karla' && styles.tabButtonTextActive]}>
                {getDisplayName('Karla')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('Javier');
              }}
              style={[styles.tabButton, selectedFilter === 'Javier' && styles.tabButtonActive]}
            >
              <Text style={[styles.tabButtonText, selectedFilter === 'Javier' && styles.tabButtonTextActive]}>
                {getDisplayName('Javier')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Desglose de Cada Juego */}
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollListContent}
            showsVerticalScrollIndicator={false}
          >
            {GAME_CARDS.map((game) => {
              const item = breakdown ? breakdown[game.key] : null;
              const wK = item?.winsKarla || 0;
              const wJ = item?.winsJavier || 0;
              const pK = item?.pointsKarla || 0;
              const pJ = item?.pointsJavier || 0;
              const tK = item?.trophiesKarla || 0;
              const tJ = item?.trophiesJavier || 0;

              return (
                <View key={game.key} style={styles.gameCard}>
                  {/* Encabezado del Juego */}
                  <View style={styles.gameCardHeader}>
                    <View style={[styles.gameCardIconWrap, { backgroundColor: game.bgSoft }]}>
                      <Ionicons name={game.icon} size={18} color={game.color} />
                    </View>
                    <View style={styles.gameCardHeaderTextWrap}>
                      <Text style={styles.gameCardTitle}>{game.title}</Text>
                      <Text style={styles.gameCardSubtitle}>{game.subtitle}</Text>
                    </View>
                    <View style={styles.rewardChip}>
                      <Text style={styles.rewardChipText}>+{UNIFIED_GAME_REWARDS.POINTS_PER_WIN} pts</Text>
                    </View>
                  </View>

                  {/* Vista Comparativa (ambos) */}
                  {selectedFilter === 'all' && (
                    <View style={styles.compareRow}>
                      {/* Lado Karla */}
                      <View style={[styles.compareCol, { borderRightWidth: 1, borderColor: '#f1f5f9' }]}>
                        <Text style={[styles.comparePlayerLabel, { color: '#9333ea' }]}>
                          {getDisplayName('Karla')}
                        </Text>
                        <Text style={styles.compareWins}>
                          {wK} <Text style={styles.compareWinsUnit}>{game.key === 'sudoku' ? 'resueltos' : 'victorias'}</Text>
                        </Text>
                        <View style={styles.compareMetaRow}>
                          <Text style={[styles.compareMetaPts, { color: '#9333ea' }]}>{pK} pts</Text>
                          <Text style={styles.compareMetaDot}>•</Text>
                          <Text style={styles.compareMetaTroph}>{tK} ★</Text>
                        </View>
                      </View>

                      {/* Lado Javier */}
                      <View style={styles.compareCol}>
                        <Text style={[styles.comparePlayerLabel, { color: '#0284c7' }]}>
                          {getDisplayName('Javier')}
                        </Text>
                        <Text style={styles.compareWins}>
                          {wJ} <Text style={styles.compareWinsUnit}>{game.key === 'sudoku' ? 'resueltos' : 'victorias'}</Text>
                        </Text>
                        <View style={styles.compareMetaRow}>
                          <Text style={[styles.compareMetaPts, { color: '#0284c7' }]}>{pJ} pts</Text>
                          <Text style={styles.compareMetaDot}>•</Text>
                          <Text style={styles.compareMetaTroph}>{tJ} ★</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Vista Individual Karla */}
                  {selectedFilter === 'Karla' && (
                    <View style={styles.singlePlayerRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.singleWinsText}>
                          {wK} {game.key === 'sudoku' ? 'partidas completadas' : 'victorias conseguidas'}
                        </Text>
                        <Text style={styles.singleSubText} numberOfLines={2}>
                          Aportó {pK} puntos y {tK} trofeo{tK === 1 ? '' : 's'} esta semana
                        </Text>
                      </View>
                      <View style={[styles.singleScoreBadge, { backgroundColor: '#f3e8ff', flexShrink: 0 }]}>
                        <Text style={[styles.singleScoreBadgeText, { color: '#9333ea' }]}>{pK} pts</Text>
                      </View>
                    </View>
                  )}

                  {/* Vista Individual Javier */}
                  {selectedFilter === 'Javier' && (
                    <View style={styles.singlePlayerRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.singleWinsText}>
                          {wJ} {game.key === 'sudoku' ? 'partidas completadas' : 'victorias conseguidas'}
                        </Text>
                        <Text style={styles.singleSubText} numberOfLines={2}>
                          Aportó {pJ} puntos y {tJ} trofeo{tJ === 1 ? '' : 's'} esta semana
                        </Text>
                      </View>
                      <View style={[styles.singleScoreBadge, { backgroundColor: '#e0f2fe', flexShrink: 0 }]}>
                        <Text style={[styles.singleScoreBadgeText, { color: '#0284c7' }]}>{pJ} pts</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Nota de Reglas y Reinicio Semanal */}
            <View style={styles.rulesCard}>
              <View style={styles.ruleItem}>
                <Ionicons name="scale-outline" size={16} color="#6366f1" style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>
                  <Text style={styles.ruleHighlight}>Puntuación Igualitaria:</Text> Todos los juegos otorgan exactamente {UNIFIED_GAME_REWARDS.POINTS_PER_WIN} pts y {UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN} trofeo por victoria (y {UNIFIED_GAME_REWARDS.POINTS_PER_TIE} pts en empate).
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="refresh-circle-outline" size={16} color="#059669" style={{ marginTop: 2 }} />
                <Text style={styles.ruleText}>
                  <Text style={styles.ruleHighlight}>Reinicio Semanal:</Text> Cada lunes el torneo de juegos se reinicia automáticamente para comenzar una nueva semana de competencia sana.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer delimitado con sutil borde superior */}
          <View style={styles.modalFooterDivider}>
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                onClose();
              }}
              style={styles.actionBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: SCREEN_H * 0.88,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 18,
    ...GAMES_THEME.shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.2)',
    marginBottom: 10,
  },
  playerSummaryCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  playerSummaryColLeader: {
    transform: [{ scale: 1.02 }],
  },
  summaryAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  crownBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  summaryAvatarLetter: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryPlayerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  summaryPlayerPoints: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryPtsUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  summaryTrophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  summaryTrophyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vsCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  vsText: {
    fontSize: 10,
    fontWeight: '900',
    color: GAMES_THEME.colors.coral,
  },
  statusLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  lastWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  lastWeekText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    ...GAMES_THEME.shadows.soft,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  tabButtonTextActive: {
    color: '#0f172a',
  },
  scrollList: {
    flexShrink: 1,
  },
  scrollListContent: {
    paddingBottom: 10,
    gap: 10,
  },
  gameCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  gameCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardHeaderTextWrap: {
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
  },
  gameCardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  rewardChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rewardChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  compareRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 8,
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  comparePlayerLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  compareWins: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1e293b',
    marginTop: 2,
  },
  compareWinsUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  compareMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  compareMetaPts: {
    fontSize: 11,
    fontWeight: '800',
  },
  compareMetaDot: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  compareMetaTroph: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  singlePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  singleWinsText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  singleSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  singleScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  singleScoreBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  rulesCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginTop: 4,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: '#475569',
  },
  ruleHighlight: {
    fontWeight: '800',
    color: '#1e293b',
  },
  modalFooterDivider: {
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  actionBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
});

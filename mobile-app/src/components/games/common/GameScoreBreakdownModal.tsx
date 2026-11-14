import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../../ui/Icon';
import { GameVectorIcon } from './GameCustomIcons';
import { GAMES_THEME, triggerGameHaptic } from '../../../theme/gamesTheme';
import {
  GamesLeaderboard,
  GameScoreBreakdown,
  getDaysRemainingInWeek,
  UNIFIED_GAME_REWARDS,
} from '../../../services/CoupleSyncService';
import { useProfile } from '../../../contexts/ProfileContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { PochitoBear } from '../../PochitoBear';
import { PetAccessoryType } from '../../../types';

const SERIF_FONT = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

interface GameScoreBreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  leaderboard: GamesLeaderboard;
  initialPlayer?: 'all' | 'Karla' | 'Javier';
  primaryColor?: string;
  petAccessory?: PetAccessoryType;
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
    subtitle: 'Blancas vs Negras',
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
  {
    key: 'drawguess',
    title: 'Dibuja y Adivina',
    subtitle: 'Pictionary en tiempo real',
    icon: 'brush-outline',
    color: '#10b981',
    bgSoft: '#ecfdf5',
  },
  {
    key: 'domino',
    title: 'Dominó Clásico',
    subtitle: 'Mesa de 28 fichas',
    icon: 'apps',
    color: '#6366f1',
    bgSoft: '#eef2ff',
  },
  {
    key: 'uno',
    title: 'UNO Cartas',
    subtitle: 'Duelo rápido de colores y acción',
    icon: 'flame',
    color: '#ef4444',
    bgSoft: '#fef2f2',
  },
];

const { height: SCREEN_H } = Dimensions.get('window');

export const GameScoreBreakdownModal: React.FC<GameScoreBreakdownModalProps> = ({
  visible,
  onClose,
  leaderboard,
  initialPlayer = 'all',
  petAccessory = 'none',
}) => {
  const { getDisplayName, getAvatarUri } = useProfile();
  const { colors, isDark } = useTheme();
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

  const karlaName = getDisplayName('Karla');
  const javierName = getDisplayName('Javier');
  const karlaAvatarUri = getAvatarUri('Karla');
  const javierAvatarUri = getAvatarUri('Javier');

  const ptsK = leaderboard?.pointsKarla || 0;
  const ptsJ = leaderboard?.pointsJavier || 0;
  const trofK = leaderboard?.trophiesKarla || 0;
  const trofJ = leaderboard?.trophiesJavier || 0;

  const isKarlaLeading = ptsK > ptsJ;
  const isJavierLeading = ptsJ > ptsK;
  const isTied = ptsK === ptsJ;

  const totalPts = ptsK + ptsJ;
  const karlaRatio = totalPts > 0 ? Math.max(12, Math.min(88, Math.round((ptsK / totalPts) * 100))) : 50;
  const javierRatio = 100 - karlaRatio;

  const breakdown = leaderboard?.breakdown;
  const lastWeek = leaderboard?.lastWeekSummary;

  const renderMiniAvatar = (role: 'Karla' | 'Javier', size = 18) => {
    const uri = role === 'Karla' ? karlaAvatarUri : javierAvatarUri;
    const name = role === 'Karla' ? karlaName : javierName;
    const bg = role === 'Karla' ? (isDark ? '#4a1d48' : '#fce7f3') : (isDark ? '#0c4a6e' : '#e0f2fe');
    const border = role === 'Karla' ? '#ec4899' : '#0ea5e9';
    const textCol = role === 'Karla' ? (isDark ? '#f472b6' : '#be185d') : (isDark ? '#38bdf8' : '#0369a1');
    const radius = size / 2;

    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bg,
          borderWidth: 1.2,
          borderColor: border,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: Math.max(9, Math.round(size * 0.52)), fontWeight: '800', color: textCol }}>
            {name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          {/* Header con Título y Botón Cerrar */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBadge,
                  {
                    backgroundColor: isDark ? `${colors.primary}26` : colors.primaryLight,
                    borderColor: `${colors.primary}45`,
                  },
                ]}
              >
                <Ionicons name="trophy" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.text, fontFamily: SERIF_FONT }]}>
                  Desglose de Juegos
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {weekLabel} • {daysRemaining === 0 ? '¡Hoy reinicia!' : `Termina en ${daysRemaining} día${daysRemaining > 1 ? 's' : ''}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                onClose();
              }}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Cerrar desglose"
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Marcador Global Semanal Bento con Pochito y Barra de Duelo */}
          <LinearGradient
            colors={isDark ? [colors.surfaceAlt, colors.surface] : [colors.primaryLight, '#fdf4ff', '#f0f9ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: colors.border }]}
          >
            <View style={styles.summaryTopRow}>
              {/* Jugador Karla */}
              <View style={[styles.playerSummaryCol, isKarlaLeading && styles.playerSummaryColLeader]}>
                <View style={styles.summaryAvatarWrap}>
                  <View
                    style={[
                      styles.summaryAvatarCircle,
                      {
                        backgroundColor: isDark ? '#4a1d48' : '#fdf2f8',
                        borderColor: isKarlaLeading ? '#ec4899' : '#f472b6',
                        borderWidth: isKarlaLeading ? 2.4 : 1.8,
                      },
                    ]}
                  >
                    {karlaAvatarUri ? (
                      <Image source={{ uri: karlaAvatarUri }} style={styles.summaryAvatarImg} resizeMode="cover" />
                    ) : (
                      <Text style={[styles.summaryAvatarLetter, { color: isDark ? '#f472b6' : '#be185d' }]}>
                        {karlaName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  {isKarlaLeading && (
                    <View style={[styles.summaryLeaderBadge, { borderColor: colors.surface }]}>
                      <Text style={styles.summaryLeaderEmoji}>👑</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.summaryPlayerName, { color: colors.text, fontFamily: SERIF_FONT }]} numberOfLines={1}>
                  {karlaName}
                </Text>
                <Text style={[styles.summaryPlayerPoints, { color: isDark ? '#f472b6' : '#be185d' }]}>
                  {ptsK} <Text style={[styles.summaryPtsUnit, { color: colors.textSecondary }]}>pts</Text>
                </Text>
                <View style={styles.summaryTrophyRow}>
                  <Ionicons name="star" size={11} color="#f59e0b" />
                  <Text style={[styles.summaryTrophyText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    {trofK} trofeo{trofK === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {/* Centro: Pochito "Panzón" + Estado del Duelo */}
              <View style={styles.vsContainer}>
                <View style={styles.pochitoCenterWrap}>
                  <View style={{ transform: [{ scale: 0.84 }] }}>
                    <PochitoBear mood="feliz" size="sm" accessory={petAccessory} />
                  </View>
                </View>
                <View
                  style={[
                    styles.statusPillBadge,
                    {
                      backgroundColor: isDark ? `${colors.primary}25` : '#ffffff',
                      borderColor: `${colors.primary}45`,
                    },
                  ]}
                >
                  <Text style={[styles.statusLabelText, { color: colors.primary }]} numberOfLines={1}>
                    {isTied ? 'Empate 💕' : isKarlaLeading ? `${karlaName} lidera` : `${javierName} lidera`}
                  </Text>
                </View>
              </View>

              {/* Jugador Javier */}
              <View style={[styles.playerSummaryCol, isJavierLeading && styles.playerSummaryColLeader]}>
                <View style={styles.summaryAvatarWrap}>
                  <View
                    style={[
                      styles.summaryAvatarCircle,
                      {
                        backgroundColor: isDark ? '#0c4a6e' : '#f0f9ff',
                        borderColor: isJavierLeading ? '#0ea5e9' : '#7dd3fc',
                        borderWidth: isJavierLeading ? 2.4 : 1.8,
                      },
                    ]}
                  >
                    {javierAvatarUri ? (
                      <Image source={{ uri: javierAvatarUri }} style={styles.summaryAvatarImg} resizeMode="cover" />
                    ) : (
                      <Text style={[styles.summaryAvatarLetter, { color: isDark ? '#38bdf8' : '#0369a1' }]}>
                        {javierName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  {isJavierLeading && (
                    <View style={[styles.summaryLeaderBadge, { borderColor: colors.surface }]}>
                      <Text style={styles.summaryLeaderEmoji}>👑</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.summaryPlayerName, { color: colors.text, fontFamily: SERIF_FONT }]} numberOfLines={1}>
                  {javierName}
                </Text>
                <Text style={[styles.summaryPlayerPoints, { color: isDark ? '#38bdf8' : '#0284c7' }]}>
                  {ptsJ} <Text style={[styles.summaryPtsUnit, { color: colors.textSecondary }]}>pts</Text>
                </Text>
                <View style={styles.summaryTrophyRow}>
                  <Ionicons name="star" size={11} color="#f59e0b" />
                  <Text style={[styles.summaryTrophyText, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                    {trofJ} trofeo{trofJ === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Barra de duelo bicolor */}
            <View style={[styles.summaryProgressTrack, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
              <LinearGradient
                colors={['#f472b6', '#ec4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.duelFillLeft, { flex: karlaRatio }]}
              />
              <View style={{ width: 2, backgroundColor: isDark ? colors.surface : '#ffffff' }} />
              <LinearGradient
                colors={['#38bdf8', '#0284c7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.duelFillRight, { flex: javierRatio }]}
              />
            </View>
          </LinearGradient>

          {/* Resumen de la semana anterior si existe */}
          {Boolean(lastWeek) && (
            <View
              style={[
                styles.lastWeekBadge,
                {
                  backgroundColor: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fef3c7',
                  borderColor: isDark ? 'rgba(251, 191, 36, 0.35)' : '#fde68a',
                },
              ]}
            >
              <Ionicons name="ribbon-outline" size={14} color={isDark ? '#fbbf24' : '#b45309'} />
              <Text style={[styles.lastWeekText, { color: isDark ? '#fde68a' : '#92400e' }]}>
                Semana anterior: Ganó {lastWeek?.winner === 'Empate' ? 'Empate amistoso' : getDisplayName(lastWeek?.winner as any)} ({Math.max(lastWeek?.pointsKarla || 0, lastWeek?.pointsJavier || 0)} pts)
              </Text>
            </View>
          )}

          {/* Selector de Pestañas (Filtro) con mini avatares */}
          <View
            style={[
              styles.tabsRow,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('all');
              }}
              style={[
                styles.tabButton,
                selectedFilter === 'all' && [
                  styles.tabButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: selectedFilter === 'all' ? colors.text : colors.textSecondary },
                ]}
              >
                Comparativa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('Karla');
              }}
              style={[
                styles.tabButton,
                selectedFilter === 'Karla' && [
                  styles.tabButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              {renderMiniAvatar('Karla', 18)}
              <Text
                style={[
                  styles.tabButtonText,
                  { color: selectedFilter === 'Karla' ? colors.text : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {karlaName}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                setSelectedFilter('Javier');
              }}
              style={[
                styles.tabButton,
                selectedFilter === 'Javier' && [
                  styles.tabButtonActive,
                  { backgroundColor: colors.surface },
                ],
              ]}
            >
              {renderMiniAvatar('Javier', 18)}
              <Text
                style={[
                  styles.tabButtonText,
                  { color: selectedFilter === 'Javier' ? colors.text : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {javierName}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Desglose Iluminado de Cada Juego */}
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

              const totalWins = wK + wJ;
              const winRatioK = totalWins > 0 ? Math.max(10, Math.min(90, Math.round((wK / totalWins) * 100))) : 50;
              const winRatioJ = 100 - winRatioK;
              const cardSubtitle =
                game.key === 'chess'
                  ? `Blancas (${karlaName}) vs Negras (${javierName})`
                  : game.subtitle;

              return (
                <LinearGradient
                  key={game.key}
                  colors={isDark ? [`${game.color}26`, colors.surface] : [`${game.color}16`, '#ffffff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.gameCard,
                    {
                      borderColor: isDark ? `${game.color}70` : `${game.color}55`,
                      shadowColor: game.color,
                    },
                  ]}
                >
                  {/* Encabezado Iluminado del Juego */}
                  <View style={styles.gameCardHeader}>
                    <View
                      style={[
                        styles.gameCardIconWrap,
                        {
                          backgroundColor: isDark ? `${game.color}30` : `${game.color}1E`,
                          borderColor: `${game.color}55`,
                          shadowColor: game.color,
                        },
                      ]}
                    >
                      <GameVectorIcon gameId={game.key} size={24} color={game.color} />
                    </View>
                    <View style={styles.gameCardHeaderTextWrap}>
                      <Text style={[styles.gameCardTitle, { color: colors.text, fontFamily: SERIF_FONT }]}>
                        {game.title}
                      </Text>
                      <Text style={[styles.gameCardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {cardSubtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.rewardChip,
                        {
                          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                          borderColor: isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(5, 150, 105, 0.25)',
                        },
                      ]}
                    >
                      <Text style={[styles.rewardChipText, { color: isDark ? '#34d399' : '#059669' }]}>
                        +{UNIFIED_GAME_REWARDS.POINTS_PER_WIN} pts
                      </Text>
                    </View>
                  </View>

                  {/* Vista Comparativa (ambos) */}
                  {selectedFilter === 'all' && (
                    <View
                      style={[
                        styles.compareBox,
                        {
                          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.78)',
                          borderColor: isDark ? `${game.color}30` : 'rgba(226, 232, 240, 0.9)',
                        },
                      ]}
                    >
                      <View style={styles.compareRow}>
                        {/* Lado Karla */}
                        <View
                          style={[
                            styles.compareCol,
                            { borderRightWidth: 1, borderColor: isDark ? 'rgba(148, 163, 184, 0.18)' : '#e2e8f0' },
                          ]}
                        >
                          <View style={styles.comparePlayerHeader}>
                            {renderMiniAvatar('Karla', 16)}
                            <Text style={[styles.comparePlayerLabel, { color: isDark ? '#f472b6' : '#be185d' }]} numberOfLines={1}>
                              {karlaName}
                            </Text>
                          </View>
                          <Text style={[styles.compareWins, { color: colors.text }]}>
                            {wK}{' '}
                            <Text style={[styles.compareWinsUnit, { color: colors.textSecondary }]}>
                              {game.key === 'sudoku' ? 'resueltos' : 'victorias'}
                            </Text>
                          </Text>
                          <View style={styles.compareMetaRow}>
                            <Text style={[styles.compareMetaPts, { color: isDark ? '#f472b6' : '#9333ea' }]}>{pK} pts</Text>
                            <Text style={[styles.compareMetaDot, { color: colors.textMuted }]}>•</Text>
                            <Text style={[styles.compareMetaTroph, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                              {tK} 🏆
                            </Text>
                          </View>
                        </View>

                        {/* Lado Javier */}
                        <View style={styles.compareCol}>
                          <View style={styles.comparePlayerHeader}>
                            {renderMiniAvatar('Javier', 16)}
                            <Text style={[styles.comparePlayerLabel, { color: isDark ? '#38bdf8' : '#0284c7' }]} numberOfLines={1}>
                              {javierName}
                            </Text>
                          </View>
                          <Text style={[styles.compareWins, { color: colors.text }]}>
                            {wJ}{' '}
                            <Text style={[styles.compareWinsUnit, { color: colors.textSecondary }]}>
                              {game.key === 'sudoku' ? 'resueltos' : 'victorias'}
                            </Text>
                          </Text>
                          <View style={styles.compareMetaRow}>
                            <Text style={[styles.compareMetaPts, { color: isDark ? '#38bdf8' : '#0284c7' }]}>{pJ} pts</Text>
                            <Text style={[styles.compareMetaDot, { color: colors.textMuted }]}>•</Text>
                            <Text style={[styles.compareMetaTroph, { color: isDark ? '#fbbf24' : '#b45309' }]}>
                              {tJ} 🏆
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Mini barra de enfrentamiento directo */}
                      <View
                        style={[
                          styles.duelMiniBarTrack,
                          {
                            backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                            opacity: totalWins > 0 ? 1 : 0.45,
                          },
                        ]}
                      >
                        <LinearGradient
                          colors={['#f472b6', '#ec4899']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.duelFillLeft, { flex: winRatioK }]}
                        />
                        <View style={{ width: 2, backgroundColor: isDark ? colors.surface : '#ffffff' }} />
                        <LinearGradient
                          colors={['#38bdf8', '#0284c7']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.duelFillRight, { flex: winRatioJ }]}
                        />
                      </View>
                    </View>
                  )}

                  {/* Vista Individual Karla */}
                  {selectedFilter === 'Karla' && (
                    <View
                      style={[
                        styles.singlePlayerRow,
                        {
                          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.78)',
                          borderColor: isDark ? `${game.color}30` : 'rgba(226, 232, 240, 0.9)',
                        },
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.singleWinsText, { color: colors.text }]}>
                          {wK} {game.key === 'sudoku' ? 'partidas completadas' : 'victorias conseguidas'}
                        </Text>
                        <Text style={[styles.singleSubText, { color: colors.textSecondary }]} numberOfLines={2}>
                          Aportó {pK} puntos y {tK} trofeo{tK === 1 ? '' : 's'} esta semana
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.singleScoreBadge,
                          { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.18)' : '#fce7f3', flexShrink: 0 },
                        ]}
                      >
                        <Text style={[styles.singleScoreBadgeText, { color: isDark ? '#f472b6' : '#be185d' }]}>
                          {pK} pts
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Vista Individual Javier */}
                  {selectedFilter === 'Javier' && (
                    <View
                      style={[
                        styles.singlePlayerRow,
                        {
                          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.78)',
                          borderColor: isDark ? `${game.color}30` : 'rgba(226, 232, 240, 0.9)',
                        },
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.singleWinsText, { color: colors.text }]}>
                          {wJ} {game.key === 'sudoku' ? 'partidas completadas' : 'victorias conseguidas'}
                        </Text>
                        <Text style={[styles.singleSubText, { color: colors.textSecondary }]} numberOfLines={2}>
                          Aportó {pJ} puntos y {tJ} trofeo{tJ === 1 ? '' : 's'} esta semana
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.singleScoreBadge,
                          { backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : '#e0f2fe', flexShrink: 0 },
                        ]}
                      >
                        <Text style={[styles.singleScoreBadgeText, { color: isDark ? '#38bdf8' : '#0284c7' }]}>
                          {pJ} pts
                        </Text>
                      </View>
                    </View>
                  )}
                </LinearGradient>
              );
            })}

            {/* Nota de Reglas y Reinicio Semanal */}
            <View
              style={[
                styles.rulesCard,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.ruleItem}>
                <Ionicons name="scale-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                  <Text style={[styles.ruleHighlight, { color: colors.text }]}>Puntuación Igualitaria:</Text> Todos los juegos otorgan exactamente {UNIFIED_GAME_REWARDS.POINTS_PER_WIN} pts y {UNIFIED_GAME_REWARDS.TROPHIES_PER_WIN} trofeo por victoria (y {UNIFIED_GAME_REWARDS.POINTS_PER_TIE} pts en empate).
                </Text>
              </View>

              <View style={styles.ruleItem}>
                <Ionicons name="refresh-circle-outline" size={16} color="#10b981" style={{ marginTop: 2 }} />
                <Text style={[styles.ruleText, { color: colors.textSecondary }]}>
                  <Text style={[styles.ruleHighlight, { color: colors.text }]}>Reinicio Semanal:</Text> Cada lunes el torneo de juegos se reinicia automáticamente para comenzar una nueva semana de competencia sana.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer delimitado con sutil borde superior */}
          <View
            style={[
              styles.modalFooterDivider,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                void triggerGameHaptic('light');
                onClose();
              }}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={styles.actionBtnText}>Cerrar desglose</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: SCREEN_H * 0.89,
    backgroundColor: '#ffffff',
    borderRadius: 26,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 16,
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
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    paddingTop: 12,
    paddingBottom: 11,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerSummaryCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  playerSummaryColLeader: {
    transform: [{ scale: 1.03 }],
  },
  summaryAvatarWrap: {
    position: 'relative',
    marginBottom: 5,
  },
  summaryAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  summaryAvatarImg: {
    width: '100%' as const,
    height: '100%' as const,
  },
  summaryLeaderBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLeaderEmoji: {
    fontSize: 10,
  },
  summaryAvatarLetter: {
    fontSize: 18,
    fontWeight: '900',
  },
  summaryPlayerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryPlayerPoints: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 1,
  },
  summaryPtsUnit: {
    fontSize: 11,
    fontWeight: '600',
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
  },
  vsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    minWidth: 88,
  },
  pochitoCenterWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 105,
  },
  statusLabelText: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryProgressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  duelFillLeft: {
    height: '100%' as const,
  },
  duelFillRight: {
    height: '100%' as const,
  },
  lastWeekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  lastWeekText: {
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
  },
  tabButtonActive: {
    ...GAMES_THEME.shadows.soft,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  scrollList: {
    flexShrink: 1,
  },
  scrollListContent: {
    paddingBottom: 10,
    gap: 10,
  },
  gameCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  gameCardIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  gameCardHeaderTextWrap: {
    flex: 1,
  },
  gameCardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  gameCardSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  rewardChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 9,
  },
  rewardChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  compareBox: {
    borderRadius: 13,
    borderWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 6,
    gap: 8,
  },
  compareRow: {
    flexDirection: 'row',
  },
  compareCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  comparePlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  comparePlayerLabel: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 1,
  },
  compareWins: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  compareWinsUnit: {
    fontSize: 10,
    fontWeight: '600',
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
  },
  compareMetaTroph: {
    fontSize: 11,
    fontWeight: '700',
  },
  duelMiniBarTrack: {
    width: '92%',
    alignSelf: 'center',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  singlePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
  },
  singleWinsText: {
    fontSize: 13,
    fontWeight: '800',
  },
  singleSubText: {
    fontSize: 11,
    fontWeight: '500',
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
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
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
  },
  ruleHighlight: {
    fontWeight: '800',
  },
  modalFooterDivider: {
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});

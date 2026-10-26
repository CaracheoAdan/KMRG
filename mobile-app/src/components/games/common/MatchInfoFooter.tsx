import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '../../ui/Icon';
import { GAMES_THEME } from '../../../theme/gamesTheme';

interface MatchInfoFooterProps {
  gameTip?: string;
  scoreKarla?: number;
  scoreJavier?: number;
  streakCount?: number;
  coupleBanter?: string;
  gameStatsText?: string;
  dark?: boolean;
}

const FUN_COUPLE_TIPS = [
  'El que pierda este duelo prepara el postre o la cena hoy 🍰',
  'Cada victoria suma puntos para desbloquear accesorios de Pochito ✨',
  'Jugar en pareja fortalece la complicidad y el trabajo en equipo ❤️',
  'El perdedor debe darle un masaje de 5 minutos al ganador 💆‍♀️',
  '¡Un empate significa que ambos deben darse un abrazo de 10 segundos! 🫂',
];

export const MatchInfoFooter: React.FC<MatchInfoFooterProps> = ({
  gameTip,
  scoreKarla,
  scoreJavier,
  streakCount = 3,
  coupleBanter,
  gameStatsText,
  dark = false,
}) => {
  const randomTip =
    gameTip ||
    FUN_COUPLE_TIPS[Math.floor(Math.random() * FUN_COUPLE_TIPS.length)];

  return (
    <View
      style={[
        styles.container,
        dark
          ? { backgroundColor: 'rgba(30, 41, 59, 0.75)', borderColor: 'rgba(255, 255, 255, 0.1)' }
          : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' },
      ]}
    >
      {/* Marcador Rápido de Pareja */}
      {(scoreKarla !== undefined || scoreJavier !== undefined) && (
        <View style={styles.scoreRow}>
          <View style={styles.playerScoreBlock}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: GAMES_THEME.colors.karla.bg, borderColor: GAMES_THEME.colors.karla.border },
              ]}
            >
              <Text style={styles.avatarTxtKarla}>K</Text>
            </View>
            <View>
              <Text style={[styles.playerName, dark && { color: '#f8fafc' }]}>Karlita</Text>
              <Text style={[styles.playerPts, { color: GAMES_THEME.colors.karla.text }]}>
                {scoreKarla ?? 0} victorias
              </Text>
            </View>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={[styles.playerScoreBlock, { justifyContent: 'flex-end', flexDirection: 'row-reverse' }]}>
            <View
              style={[
                styles.avatarCircle,
                { backgroundColor: GAMES_THEME.colors.javier.bg, borderColor: GAMES_THEME.colors.javier.border },
              ]}
            >
              <Text style={styles.avatarTxtJavier}>J</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.playerName, dark && { color: '#f8fafc' }]}>Javier</Text>
              <Text style={[styles.playerPts, { color: GAMES_THEME.colors.javier.text }]}>
                {scoreJavier ?? 0} victorias
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Racha o Estadística del Juego */}
      {gameStatsText ? (
        <View style={styles.statsPill}>
          <Ionicons name="stats-chart" size={13} color={GAMES_THEME.colors.purple} />
          <Text style={styles.statsText}>{gameStatsText}</Text>
        </View>
      ) : (
        <View style={styles.statsPill}>
          <Ionicons name="flame" size={14} color="#f59e0b" />
          <Text style={styles.statsText}>Racha de amor: {streakCount} días jugando juntos 🔥</Text>
        </View>
      )}

      {/* Tip Romántico / Regla de Apuesta */}
      <View style={styles.tipCard}>
        <Ionicons name="heart" size={13} color={GAMES_THEME.colors.coral} style={{ marginTop: 2 }} />
        <Text style={[styles.tipText, dark && { color: '#94a3b8' }]}>
          {coupleBanter || randomTip}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
  },
  playerScoreBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxtKarla: {
    fontSize: 11,
    fontWeight: '900',
    color: GAMES_THEME.colors.karla.text,
  },
  avatarTxtJavier: {
    fontSize: 11,
    fontWeight: '900',
    color: GAMES_THEME.colors.javier.text,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  playerPts: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  vsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  vsText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'center',
  },
  statsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
  },
  tipText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#475569',
    fontStyle: 'italic',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';
import { MatchInfoFooter } from './common/MatchInfoFooter';

interface Props {
  hangman: GamesState['hangman'];
  isFull: boolean;
  primaryColor: string;
  wrongGuessesCount: number;
  maxWrong: number;
  onGuessLetter: (letter: string) => void;
  onRandomWord: () => void;
  onChallengePartner: () => void;
}

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const HangmanArena: React.FC<Props> = ({
  hangman,
  isFull,
  primaryColor,
  wrongGuessesCount,
  maxWrong,
  onGuessLetter,
  onRandomWord,
  onChallengePartner,
}) => {
  const heartBeatAnim = useRef(new Animated.Value(1)).current;

  // Animación de latido para las vidas restantes
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartBeatAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(heartBeatAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [heartBeatAnim]);

  const handleKeyPress = (letter: string) => {
    const isHit = hangman.word.toUpperCase().includes(letter);
    if (isHit) {
      void triggerGameHaptic('success');
    } else {
      void triggerGameHaptic('error');
    }
    onGuessLetter(letter);
  };

  const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
    switch (cat?.toLowerCase()) {
      case 'cine':
        return 'film';
      case 'animales':
        return 'paw';
      case 'geografía':
      case 'geografia':
        return 'earth';
      default:
        return 'bulb';
    }
  };

  const isWon = hangman.status === 'won';
  const isLost = hangman.status === 'lost';

  return (
    <View style={styles.container}>
      {/* Tarjeta de Pista y Cadalso Expresivo */}
      <View style={styles.stageCard}>
        {/* Cadalso Expresivo con Figura Animada */}
        <View style={styles.gallowsBox}>
          {/* Estructura de Madera */}
          <View style={styles.gallowsBase} />
          <View style={styles.gallowsPole} />
          <View style={styles.gallowsTop} />
          <View style={styles.gallowsRope} />

          {/* Muñequito de Pareja Trazo a Trazo */}
          {wrongGuessesCount >= 1 && (
            <View style={[styles.hmHead, isLost && styles.hmHeadLost]}>
              <View style={styles.hmEyesRow}>
                <View style={styles.hmEye} />
                <View style={styles.hmEye} />
              </View>
              <View style={isLost ? styles.hmMouthLost : styles.hmMouth} />
            </View>
          )}

          {wrongGuessesCount >= 2 && <View style={styles.hmBody} />}
          {wrongGuessesCount >= 3 && <View style={styles.hmArmLeft} />}
          {wrongGuessesCount >= 4 && <View style={styles.hmArmRight} />}
          {wrongGuessesCount >= 5 && <View style={styles.hmLegLeft} />}
          {wrongGuessesCount >= 6 && <View style={styles.hmLegRight} />}
        </View>

        {/* Tarjeta de Pista Decorativa con Categoría */}
        <View style={styles.stageInfo}>
          {/* Fila de Vidas de Corazones */}
          <Animated.View style={[styles.livesRow, { transform: [{ scale: heartBeatAnim }] }]}>
            {Array.from({ length: maxWrong }).map((_, i) => {
              const isAlive = i < maxWrong - wrongGuessesCount;
              return (
                <Ionicons
                  key={i}
                  name={isAlive ? 'heart' : 'heart-dislike'}
                  size={16}
                  color={isAlive ? '#f43f5e' : '#cbd5e1'}
                />
              );
            })}
          </Animated.View>

          {/* Badge de Categoría */}
          <View style={styles.categoryBadge}>
            <Ionicons name={getCategoryIcon(hangman.category)} size={12} color="#9333ea" />
            <Text style={styles.categoryText}>{hangman.category || 'Palabra Oculta'}</Text>
          </View>

          {/* Pista Romántica o de Trivia */}
          <Text style={styles.hintText} numberOfLines={2}>
            “{hangman.hint}”
          </Text>
        </View>
      </View>

      {/* Casillas de Letras con Relieve y Revelado */}
      <View style={styles.wordSlotsWrap}>
        {hangman.word.split('').map((ch, idx) => {
          if (ch === ' ') return <View key={idx} style={{ width: 8 }} />;
          const revealed = hangman.guessed.includes(ch) || hangman.status !== 'playing';

          return (
            <View
              key={idx}
              style={[
                styles.slotBox,
                revealed && styles.slotBoxRevealed,
                isWon && styles.slotBoxWon,
                isLost && !hangman.guessed.includes(ch) && styles.slotBoxMissed,
              ]}
            >
              <Text
                style={[
                  styles.slotChar,
                  revealed && { color: '#0f172a' },
                  isWon && { color: '#16a34a' },
                  isLost && !hangman.guessed.includes(ch) && { color: '#ef4444' },
                ]}
              >
                {revealed ? ch : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Teclado Táctil 3D con Colores de Acierto / Fallo */}
      <View style={styles.keyboardContainer}>
        {QWERTY_ROWS.map((rowLetters, rIdx) => (
          <View key={rIdx} style={styles.keyboardRow}>
            {rowLetters.map((letter) => {
              const used = hangman.guessed.includes(letter);
              const hit = used && hangman.word.toUpperCase().includes(letter);

              return (
                <TouchableOpacity
                  key={letter}
                  disabled={used || hangman.status !== 'playing'}
                  onPress={() => handleKeyPress(letter)}
                  activeOpacity={0.75}
                  style={[
                    styles.key3D,
                    { width: rIdx === 2 ? 37 : 30 },
                    used && (hit ? styles.keyHit : styles.keyMiss),
                  ]}
                >
                  <Text
                    style={[
                      styles.keyText,
                      used && (hit ? styles.keyTextHit : styles.keyTextMiss),
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Botones de Acción: Otra Palabra & Retar Pareja (+400 PTS) */}
      <View style={styles.actionsRow}>
        <View style={{ flex: 1 }}>
          <GameButton
            label="Otra Palabra"
            icon="shuffle"
            variant="secondary"
            onPress={onRandomWord}
          />
        </View>

        <View style={{ flex: 1 }}>
          <GameButton
            label="Retar Pareja +400"
            icon="flame"
            variant="gold"
            onPress={onChallengePartner}
          />
        </View>
      </View>

      {/* Footer con Racha y Apuesta de Pareja */}
      {isFull && (
        <MatchInfoFooter
          streakCount={wrongGuessesCount === 0 ? 5 : 2}
          gameStatsText={`Adivina sin cometer ${maxWrong} errores`}
          coupleBanter="¡Crea una palabra personalizada con tu propia pista secreta tocando 'Retar Pareja'! 💌"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    width: '100%',
    ...GAMES_THEME.shadows.soft,
  },
  gallowsBox: {
    width: 90,
    height: 100,
    position: 'relative',
    marginRight: 10,
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 60,
    height: 4,
    backgroundColor: '#78350f',
    borderRadius: 2,
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 4,
    left: 20,
    width: 4,
    height: 85,
    backgroundColor: '#78350f',
    borderRadius: 2,
  },
  gallowsTop: {
    position: 'absolute',
    top: 11,
    left: 20,
    width: 48,
    height: 4,
    backgroundColor: '#78350f',
    borderRadius: 2,
  },
  gallowsRope: {
    position: 'absolute',
    top: 15,
    left: 64,
    width: 2,
    height: 14,
    backgroundColor: '#d97706',
  },
  hmHead: {
    position: 'absolute',
    top: 29,
    left: 54,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#0f172a',
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hmHeadLost: {
    backgroundColor: '#fca5a5',
    borderColor: '#dc2626',
  },
  hmEyesRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: -2,
  },
  hmEye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#0f172a',
  },
  hmMouth: {
    width: 6,
    height: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    marginTop: 2,
  },
  hmMouthLost: {
    width: 5,
    height: 1.5,
    backgroundColor: '#0f172a',
    marginTop: 2,
  },
  hmBody: {
    position: 'absolute',
    top: 51,
    left: 63.5,
    width: 3,
    height: 25,
    backgroundColor: '#0f172a',
    borderRadius: 1.5,
  },
  hmArmLeft: {
    position: 'absolute',
    top: 56,
    left: 51,
    width: 14,
    height: 3,
    backgroundColor: '#0f172a',
    transform: [{ rotate: '-30deg' }],
    borderRadius: 1.5,
  },
  hmArmRight: {
    position: 'absolute',
    top: 56,
    left: 65,
    width: 14,
    height: 3,
    backgroundColor: '#0f172a',
    transform: [{ rotate: '30deg' }],
    borderRadius: 1.5,
  },
  hmLegLeft: {
    position: 'absolute',
    top: 75,
    left: 54,
    width: 13,
    height: 3,
    backgroundColor: '#0f172a',
    transform: [{ rotate: '-45deg' }],
    borderRadius: 1.5,
  },
  hmLegRight: {
    position: 'absolute',
    top: 75,
    left: 63,
    width: 13,
    height: 3,
    backgroundColor: '#0f172a',
    transform: [{ rotate: '45deg' }],
    borderRadius: 1.5,
  },
  stageInfo: {
    flex: 1,
    gap: 4,
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9333ea',
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  wordSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  slotBox: {
    width: 30,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  slotBoxRevealed: {
    backgroundColor: '#ffffff',
    borderColor: '#38bdf8',
  },
  slotBoxWon: {
    backgroundColor: '#ecfdf5',
    borderColor: '#22c55e',
  },
  slotBoxMissed: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  slotChar: {
    fontSize: 18,
    fontWeight: '900',
  },
  keyboardContainer: {
    width: '100%',
    gap: 5,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  key3D: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyHit: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
    borderBottomColor: '#22c55e',
  },
  keyMiss: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
    borderBottomColor: '#e2e8f0',
    opacity: 0.4,
  },
  keyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  keyTextHit: {
    color: '#15803d',
    fontWeight: '900',
  },
  keyTextMiss: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
});

import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
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

const { width: SCREEN_W } = Dimensions.get('window');

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const HangmanArena: React.FC<Props> = ({
  hangman,
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

  const isWon = hangman.status === 'won';
  const isLost = hangman.status === 'lost';

  // Letras falladas por el jugador
  const failedLetters = hangman.guessed.filter(
    (l) => !hangman.word.toUpperCase().includes(l)
  );

  // Cálculo dinámico del ancho de casilla para que NUNCA queden letras huérfanas
  const wordChars = hangman.word.split('');
  const letterCount = wordChars.filter((c) => c !== ' ').length;
  const availableWidth = SCREEN_W - 48;
  const calcSlotWidth = Math.min(
    38,
    Math.max(22, Math.floor((availableWidth - letterCount * 6) / letterCount))
  );
  const slotHeight = Math.floor(calcSlotWidth * 1.25);

  return (
    <View style={styles.container}>
      {/* 1. Tarjeta Principal: Cadalso Ilustrado Grande + Pista y Vidas */}
      <View style={[styles.stageCard, GAMES_THEME.shadows.card]}>
        {/* Barra superior de la tarjeta: Vidas y Categoría */}
        <View style={styles.stageHeader}>
          {/* Badge de Categoría */}
          <View style={styles.categoryBadge}>
            <Ionicons name="bulb" size={13} color="#9333ea" />
            <Text style={styles.categoryText}>{hangman.category || 'Palabra Oculta'}</Text>
          </View>

          {/* Vidas de Corazones Palpitantes */}
          <Animated.View style={[styles.livesRow, { transform: [{ scale: heartBeatAnim }] }]}>
            {Array.from({ length: maxWrong }).map((_, i) => {
              const isAlive = i < maxWrong - wrongGuessesCount;
              return (
                <Ionicons
                  key={i}
                  name={isAlive ? 'heart' : 'heart-dislike'}
                  size={17}
                  color={isAlive ? '#f43f5e' : '#cbd5e1'}
                />
              );
            })}
          </Animated.View>
        </View>

        {/* Cadalso Ilustrado Espacioso (150px de alto, bien proporcionado) */}
        <View style={styles.gallowsContainer}>
          <View style={styles.gallowsBox}>
            {/* Horca de Madera */}
            <View style={styles.gallowsBase} />
            <View style={styles.gallowsPole} />
            <View style={styles.gallowsTop} />
            <View style={styles.gallowsBrace} />
            <View style={styles.gallowsRope} />

            {/* Muñequito de Pareja Construido Trazo a Trazo */}
            {wrongGuessesCount >= 1 && (
              <View style={[styles.hmHead, isLost && styles.hmHeadLost]}>
                {/* Lazo / Moño romántico o gorra */}
                <View style={styles.hmAccessory} />
                <View style={styles.hmEyesRow}>
                  <Text style={styles.hmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                  <Text style={styles.hmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                </View>
                <View style={isLost ? styles.hmMouthLost : styles.hmMouthSmile} />
              </View>
            )}

            {wrongGuessesCount >= 2 && <View style={styles.hmBody} />}
            {wrongGuessesCount >= 3 && <View style={styles.hmArmLeft} />}
            {wrongGuessesCount >= 4 && <View style={styles.hmArmRight} />}
            {wrongGuessesCount >= 5 && <View style={styles.hmLegLeft} />}
            {wrongGuessesCount >= 6 && <View style={styles.hmLegRight} />}
          </View>

          {/* Pista o Estado de Partida */}
          <View style={styles.hintWrap}>
            <Text style={styles.hintQuoteText} numberOfLines={3}>
              “{hangman.hint}”
            </Text>
            {isWon && (
              <View style={styles.statusPillWon}>
                <Ionicons name="sparkles" size={12} color="#059669" />
                <Text style={styles.statusTextWon}>¡Adivinaron la palabra!</Text>
              </View>
            )}
            {isLost && (
              <View style={styles.statusPillLost}>
                <Ionicons name="skull" size={12} color="#dc2626" />
                <Text style={styles.statusTextLost}>¡Oh no! Era: {hangman.word}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 2. Casillas de Letras: Escaladas para caber SIEMPRE en 1 sola fila balanceada */}
      <View style={styles.wordSlotsRow}>
        {wordChars.map((ch, idx) => {
          if (ch === ' ') {
            return <View key={idx} style={{ width: 8 }} />;
          }
          const revealed = hangman.guessed.includes(ch) || hangman.status !== 'playing';

          return (
            <View
              key={idx}
              style={[
                styles.letterSlot,
                {
                  width: calcSlotWidth,
                  height: slotHeight,
                },
                revealed && styles.letterSlotRevealed,
                isLost && !hangman.guessed.includes(ch) && styles.letterSlotMissedWord,
              ]}
            >
              <Text
                style={[
                  styles.slotLetterText,
                  { fontSize: Math.floor(calcSlotWidth * 0.6) },
                  revealed && styles.slotLetterTextRevealed,
                  isLost && !hangman.guessed.includes(ch) && { color: '#ef4444' },
                ]}
              >
                {revealed ? ch : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 3. Bandeja de Letras Falladas */}
      <View style={styles.failedLettersBar}>
        <Text style={styles.failedLettersLabel}>Letras falladas:</Text>
        {failedLetters.length === 0 ? (
          <Text style={styles.noFailsText}>Ninguna aún ✨</Text>
        ) : (
          <View style={styles.failedLettersChips}>
            {failedLetters.map((l) => (
              <View key={l} style={styles.failedChip}>
                <Text style={styles.failedChipText}>{l}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 4. Teclado QWERTY 3D Táctil */}
      <View style={styles.keyboardContainer}>
        {QWERTY_ROWS.map((row, rIdx) => (
          <View key={rIdx} style={styles.keyboardRow}>
            {row.map((letter) => {
              const isGuessed = hangman.guessed.includes(letter);
              const isHit = isGuessed && hangman.word.toUpperCase().includes(letter);
              const isMiss = isGuessed && !hangman.word.toUpperCase().includes(letter);
              const isDisabled = isGuessed || hangman.status !== 'playing';

              return (
                <TouchableOpacity
                  key={letter}
                  disabled={isDisabled}
                  onPress={() => handleKeyPress(letter)}
                  style={[
                    styles.keyButton,
                    isHit && styles.keyHit,
                    isMiss && styles.keyMiss,
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel={`Letra ${letter}`}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isHit && styles.keyTextHit,
                      isMiss && styles.keyTextMiss,
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

      {/* 5. Acciones: Retar Pareja (+400 pts) y Otra Palabra */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onRandomWord();
          }}
          style={styles.randomWordBtn}
          accessibilityLabel="Generar otra palabra aleatoria"
        >
          <Ionicons name="shuffle" size={15} color="#475569" />
          <Text style={styles.randomWordBtnText}>Otra Palabra</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void triggerGameHaptic('medium');
            onChallengePartner();
          }}
          style={styles.challengePartnerBtn}
          accessibilityLabel="Retar a mi pareja con palabra secreta"
        >
          <Ionicons name="sparkles" size={15} color="#ffffff" />
          <Text style={styles.challengePartnerBtnText}>+400 Retar Pareja</Text>
        </TouchableOpacity>
      </View>

      {/* 6. Footer con Racha y Tips */}
      <MatchInfoFooter
        gameTip="Adivina la palabra secreta antes de agotar los 6 corazones de amor."
        streakCount={5}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: GAMES_THEME.spacing.sm + 2,
    width: '100%',
    paddingHorizontal: GAMES_THEME.spacing.lg,
  },
  stageCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: GAMES_THEME.radius.xl,
    padding: GAMES_THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(244, 63, 94, 0.18)',
    gap: 8,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 10,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  categoryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#9333ea',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gallowsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  gallowsBox: {
    width: 110,
    height: 120,
    position: 'relative',
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 50,
    height: 6,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 8,
    left: 18,
    width: 6,
    height: 104,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsTop: {
    position: 'absolute',
    top: 8,
    left: 18,
    width: 68,
    height: 6,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsBrace: {
    position: 'absolute',
    top: 14,
    left: 28,
    width: 20,
    height: 4,
    backgroundColor: '#92400e',
    transform: [{ rotate: '-45deg' }],
  },
  gallowsRope: {
    position: 'absolute',
    top: 14,
    left: 78,
    width: 3,
    height: 20,
    backgroundColor: '#d97706',
    borderRadius: 1.5,
  },
  hmHead: {
    position: 'absolute',
    top: 32,
    left: 65,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#db2777',
    backgroundColor: '#fdf2f8',
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  hmHeadLost: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  hmAccessory: {
    position: 'absolute',
    top: -5,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#f43f5e',
  },
  hmEyesRow: {
    flexDirection: 'row',
    gap: 5,
  },
  hmEyeEmoji: {
    fontSize: 9,
    fontWeight: '900',
    color: '#db2777',
    lineHeight: 10,
  },
  hmMouthSmile: {
    width: 8,
    height: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#db2777',
    borderRadius: 2,
    marginTop: 1,
  },
  hmMouthLost: {
    width: 8,
    height: 3,
    borderTopWidth: 1.5,
    borderTopColor: '#ef4444',
    borderRadius: 2,
    marginTop: 1,
  },
  hmBody: {
    position: 'absolute',
    top: 60,
    left: 77.5,
    width: 3.5,
    height: 30,
    backgroundColor: '#db2777',
    borderRadius: 2,
  },
  hmArmLeft: {
    position: 'absolute',
    top: 66,
    left: 63,
    width: 18,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-30deg' }],
  },
  hmArmRight: {
    position: 'absolute',
    top: 66,
    left: 77,
    width: 18,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '30deg' }],
  },
  hmLegLeft: {
    position: 'absolute',
    top: 88,
    left: 67,
    width: 16,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  hmLegRight: {
    position: 'absolute',
    top: 88,
    left: 75,
    width: 16,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  hintWrap: {
    flex: 1,
    gap: 6,
  },
  hintQuoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 17,
  },
  statusPillWon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTextWon: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  statusPillLost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTextLost: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },
  wordSlotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    width: '100%',
    paddingVertical: 4,
  },
  letterSlot: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  letterSlotRevealed: {
    borderColor: '#9333ea',
    backgroundColor: '#faf5ff',
  },
  letterSlotMissedWord: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  slotLetterText: {
    fontWeight: '900',
    color: '#1e293b',
  },
  slotLetterTextRevealed: {
    color: '#7c3aed',
  },
  failedLettersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    paddingHorizontal: 4,
  },
  failedLettersLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  noFailsText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  failedLettersChips: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  failedChip: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  failedChipText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ef4444',
    textDecorationLine: 'line-through',
  },
  keyboardContainer: {
    width: '100%',
    gap: 5,
    marginTop: 2,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  keyButton: {
    flex: 1,
    maxWidth: 34,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  keyHit: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  keyMiss: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    opacity: 0.45,
  },
  keyText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1e293b',
  },
  keyTextHit: {
    color: '#ffffff',
  },
  keyTextMiss: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    marginTop: 2,
  },
  randomWordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  randomWordBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  challengePartnerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#9333ea',
    ...GAMES_THEME.shadows.glowPurple,
  },
  challengePartnerBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});

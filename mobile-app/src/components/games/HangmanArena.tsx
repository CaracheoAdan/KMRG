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

  // Palabras y casillas GRANDES y legibles
  const wordChars = hangman.word.split('');
  const isLongWord = wordChars.length > 7;

  // Dimensiones amplias para que las letras se vean GRANDES (26px a 32px)
  const slotWidth = isLongWord
    ? Math.max(34, Math.floor((SCREEN_W - 64) / Math.min(wordChars.length, 6)))
    : Math.min(48, Math.max(38, Math.floor((SCREEN_W - 56) / wordChars.length)));
  const slotHeight = Math.floor(slotWidth * 1.25);
  const letterFontSize = Math.floor(slotWidth * 0.72);

  return (
    <View style={styles.container}>
      {/* 1. Tarjeta de Cadalso Expresivo + Vidas y Pista */}
      <View style={[styles.stageCard, GAMES_THEME.shadows.card]}>
        {/* Barra superior de la tarjeta: Vidas y Categoría */}
        <View style={styles.stageHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons name="bulb" size={14} color="#9333ea" />
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
                  size={18}
                  color={isAlive ? '#f43f5e' : '#cbd5e1'}
                />
              );
            })}
          </Animated.View>
        </View>

        {/* Cadalso Ilustrado */}
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

          {/* Pista y Estado */}
          <View style={styles.hintWrap}>
            <Text style={styles.hintQuoteText} numberOfLines={3}>
              “{hangman.hint}”
            </Text>
            {isWon && (
              <View style={styles.statusPillWon}>
                <Ionicons name="sparkles" size={13} color="#059669" />
                <Text style={styles.statusTextWon}>¡Adivinaron la palabra!</Text>
              </View>
            )}
            {isLost && (
              <View style={styles.statusPillLost}>
                <Ionicons name="skull" size={13} color="#dc2626" />
                <Text style={styles.statusTextLost}>Era: {hangman.word}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 2. Casillas de Letras: GRANDES Y ULTRA LEGIBLES (26-34px) */}
      <View style={[styles.wordSlotsContainer, isLongWord && styles.wordSlotsWrapped]}>
        {wordChars.map((ch, idx) => {
          if (ch === ' ') {
            return <View key={idx} style={{ width: 12 }} />;
          }
          const revealed = hangman.guessed.includes(ch) || hangman.status !== 'playing';

          return (
            <View
              key={idx}
              style={[
                styles.letterSlot,
                {
                  width: slotWidth,
                  height: slotHeight,
                },
                revealed && styles.letterSlotRevealed,
                isLost && !hangman.guessed.includes(ch) && styles.letterSlotMissedWord,
              ]}
            >
              <Text
                style={[
                  styles.slotLetterText,
                  { fontSize: letterFontSize },
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

      {/* 4. Teclado QWERTY Táctil con Letras Grandes (18px) */}
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
          <Ionicons name="shuffle" size={16} color="#475569" />
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
          <Ionicons name="sparkles" size={16} color="#ffffff" />
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
    paddingHorizontal: 12,
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
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  categoryText: {
    fontSize: 12.5,
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
    width: 100,
    height: 115,
    position: 'relative',
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 48,
    height: 6,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    width: 6,
    height: 100,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsTop: {
    position: 'absolute',
    top: 6,
    left: 16,
    width: 64,
    height: 6,
    backgroundColor: '#78350f',
    borderRadius: 3,
  },
  gallowsBrace: {
    position: 'absolute',
    top: 12,
    left: 24,
    width: 18,
    height: 4,
    backgroundColor: '#92400e',
    transform: [{ rotate: '-45deg' }],
  },
  gallowsRope: {
    position: 'absolute',
    top: 12,
    left: 72,
    width: 3,
    height: 18,
    backgroundColor: '#d97706',
    borderRadius: 1.5,
  },
  hmHead: {
    position: 'absolute',
    top: 28,
    left: 59.5,
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
    top: 54,
    left: 72,
    width: 3.5,
    height: 28,
    backgroundColor: '#db2777',
    borderRadius: 2,
  },
  hmArmLeft: {
    position: 'absolute',
    top: 60,
    left: 58,
    width: 17,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-30deg' }],
  },
  hmArmRight: {
    position: 'absolute',
    top: 60,
    left: 71,
    width: 17,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '30deg' }],
  },
  hmLegLeft: {
    position: 'absolute',
    top: 80,
    left: 62,
    width: 15,
    height: 3,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  hmLegRight: {
    position: 'absolute',
    top: 80,
    left: 69,
    width: 15,
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
    fontSize: 13,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 18,
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
    fontSize: 11.5,
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
    fontSize: 11.5,
    fontWeight: '800',
    color: '#dc2626',
  },
  wordSlotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 4,
  },
  wordSlotsWrapped: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  letterSlot: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
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
    color: '#0f172a',
    textAlign: 'center',
  },
  slotLetterTextRevealed: {
    color: '#7c3aed',
  },
  failedLettersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 4,
  },
  failedLettersLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  noFailsText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  failedLettersChips: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  failedChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  failedChipText: {
    fontSize: 13,
    fontWeight: '900',
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
    maxWidth: 36,
    height: 48, // 48px de alto táctil
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
    fontSize: 18, // 18px grande y claro
    fontWeight: '900',
    color: '#0f172a',
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
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    ...GAMES_THEME.shadows.soft,
  },
  randomWordBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  challengePartnerBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#9333ea',
    ...GAMES_THEME.shadows.glowPurple,
  },
  challengePartnerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

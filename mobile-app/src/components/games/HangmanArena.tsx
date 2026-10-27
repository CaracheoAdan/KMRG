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
import { LinearGradient } from 'expo-linear-gradient';
import { GamesState } from '../../services/CoupleSyncService';
import { GAMES_THEME, triggerGameHaptic } from '../../theme/gamesTheme';
import { GameButton } from './common/GameButton';

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

  // Limpieza y partición de la palabra en grupos reales de palabras
  const cleanWord = (hangman.word || '').trim().toUpperCase();
  const words = cleanWord.split(' ').filter(Boolean);
  const totalLettersNoSpaces = cleanWord.replace(/\s+/g, '').length;

  // Ancho del contenedor disponible
  const containerWidth = Math.min(SCREEN_W - 20, 390);

  // Dimensiones del teclado QWERTY
  const keyWidth = Math.floor((containerWidth - (9 * 4)) / 10);
  const keyHeight = 44;

  // Tamaño dinámico de casillas según longitud de la palabra
  let dynamicSlotWidth = 38;
  if (totalLettersNoSpaces <= 5) {
    dynamicSlotWidth = 44;
  } else if (totalLettersNoSpaces <= 8) {
    dynamicSlotWidth = 36;
  } else if (totalLettersNoSpaces <= 12) {
    dynamicSlotWidth = 30;
  } else {
    dynamicSlotWidth = 26;
  }
  const dynamicSlotHeight = Math.floor(dynamicSlotWidth * 1.25);
  const dynamicFontSize = Math.floor(dynamicSlotWidth * 0.7);

  return (
    <View style={styles.container}>
      {/* 1. Tarjeta Escénica: Ilustración Grande Centrada + Vidas y Pista */}
      <View style={[styles.stageCard, GAMES_THEME.shadows.card]}>
        {/* Barra superior de la tarjeta: Vidas y Categoría (Sin ícono duplicado) */}
        <View style={styles.stageHeader}>
          <View style={styles.categoryBadge}>
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

        {/* Escenario Ilustrado Grande Centrado (~45% del alto de la tarjeta) */}
        {/* Patíbulo en Madera Clara / Crema con Brillo, Cuerda, Suelo y Luna */}
        <LinearGradient
          colors={['#1e1b4b', '#312e81', '#1e1b4b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gallowsSceneStage}
        >
          {/* Luna brillante */}
          <View style={styles.sceneMoon}>
            <Ionicons name="moon" size={24} color="#fde047" />
          </View>
          <View style={[styles.sceneStar, { top: 12, left: 24 }]} />
          <View style={[styles.sceneStar, { top: 28, left: 60, width: 2, height: 2 }]} />
          <View style={[styles.sceneStar, { top: 16, right: 64, width: 2, height: 2 }]} />
          <View style={[styles.sceneStar, { top: 38, right: 38 }]} />

          {/* Suelo / Plataforma del patíbulo */}
          <View style={styles.groundBeam} />

          {/* Ilustración Grande y Centrada del Patíbulo en Madera Crema Noble */}
          <View style={styles.grandGallowsBox}>
            <View style={styles.grandGallowsBase} />
            <View style={styles.grandGallowsPole} />
            <View style={styles.grandGallowsTop} />
            <View style={styles.grandGallowsBrace} />
            <View style={styles.grandGallowsRope} />

            {/* Muñequito de Pareja Dibujado Trazo a Trazo */}
            {wrongGuessesCount >= 1 && (
              <View style={[styles.grandHmHead, isLost && styles.hmHeadLost]}>
                <View style={styles.grandHmBow} />
                <View style={styles.hmEyesRow}>
                  <Text style={styles.grandHmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                  <Text style={styles.grandHmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                </View>
                <View style={isLost ? styles.hmMouthLost : styles.hmMouthSmile} />
              </View>
            )}

            {wrongGuessesCount >= 2 && (
              <View style={styles.grandHmBody}>
                <Ionicons name="heart" size={8} color="#ffffff" style={{ opacity: 0.9 }} />
              </View>
            )}
            {wrongGuessesCount >= 3 && <View style={styles.grandHmArmLeft} />}
            {wrongGuessesCount >= 4 && <View style={styles.grandHmArmRight} />}
            {wrongGuessesCount >= 5 && <View style={styles.grandHmLegLeft} />}
            {wrongGuessesCount >= 6 && <View style={styles.grandHmLegRight} />}
          </View>
        </LinearGradient>

        {/* Pista y Estado DEBAJO de la ilustración con ÚNICO ícono de información */}
        <View style={styles.hintWrapUnderGallows}>
          <View style={styles.hintQuoteRow}>
            <Ionicons name="bulb" size={15} color="#9333ea" />
            <Text style={styles.hintQuoteText} numberOfLines={3}>
              “{hangman.hint}”
            </Text>
          </View>

          {isWon && (
            <View style={styles.statusPillWon}>
              <Ionicons name="sparkles" size={13} color="#059669" />
              <Text style={styles.statusTextWon}>¡Adivinaron la palabra! (+400)</Text>
            </View>
          )}
          {isLost && (
            <View style={styles.statusPillLost}>
              <Ionicons name="skull" size={13} color="#dc2626" />
              <Text style={styles.statusTextLost}>Palabra secreta: {hangman.word}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 2. Casillas de Letras: Dinámicamente agrupadas por palabras con espaciado real */}
      <View style={styles.wordGroupsContainer}>
        {words.map((word, wIdx) => (
          <View key={wIdx} style={styles.singleWordRow}>
            {word.split('').map((ch, cIdx) => {
              const revealed = hangman.guessed.includes(ch) || hangman.status !== 'playing';

              return (
                <View
                  key={cIdx}
                  style={[
                    styles.letterSlot,
                    {
                      width: dynamicSlotWidth,
                      height: dynamicSlotHeight,
                    },
                    revealed && styles.letterSlotRevealed,
                    isLost && !hangman.guessed.includes(ch) && styles.letterSlotMissedWord,
                  ]}
                >
                  <Text
                    style={[
                      styles.slotLetterText,
                      { fontSize: dynamicFontSize },
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
        ))}
      </View>

      {/* 3. Bandeja de Letras Falladas: Chips Rojos Compactos */}
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

      {/* 4. Teclado QWERTY 3D con Estados Visuales Precisos (Verde, Rojo Tachado, Blanco 3D) */}
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
                    { width: keyWidth, height: keyHeight },
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

      {/* 5. Dock Inferior: Botones Unificados (Primary + Secondary) */}
      <View style={styles.dockActionsRow}>
        <View style={{ flex: 1 }}>
          <GameButton
            label="Otra Palabra"
            icon="shuffle"
            variant="secondary"
            onPress={onRandomWord}
          />
        </View>

        <View style={{ flex: 1.3 }}>
          <GameButton
            label="+400 Retar Pareja"
            icon="sparkles"
            variant="primary"
            onPress={onChallengePartner}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: 'center',
  },
  stageCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: GAMES_THEME.radius.xl,
    padding: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9333ea',
  },
  livesRow: {
    flexDirection: 'row',
    gap: 4,
  },

  // Escenario Nocturno Monumental Centrado (~45% del alto de la tarjeta)
  gallowsSceneStage: {
    width: '100%' as const,
    height: 165,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sceneMoon: {
    position: 'absolute',
    top: 10,
    right: 14,
  },
  sceneStar: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ffffff',
    opacity: 0.8,
  },
  groundBeam: {
    position: 'absolute',
    bottom: 8,
    left: '10%',
    right: '10%',
    height: 4,
    backgroundColor: '#fde68a',
    borderRadius: 2,
    opacity: 0.8,
  },

  // Patíbulo Grande en Madera Crema / Clara con Borde Cálido y Glow
  grandGallowsBox: {
    width: 150,
    height: 145,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grandGallowsBase: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    width: 72,
    height: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 4,
    shadowColor: '#fde047',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  grandGallowsPole: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    width: 8,
    height: 120,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 4,
    shadowColor: '#fde047',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  grandGallowsTop: {
    position: 'absolute',
    top: 8,
    left: 28,
    width: 86,
    height: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1.5,
    borderColor: '#d97706',
    borderRadius: 4,
    shadowColor: '#fde047',
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  grandGallowsBrace: {
    position: 'absolute',
    top: 15,
    left: 38,
    width: 22,
    height: 5,
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#b45309',
    transform: [{ rotate: '-45deg' }],
  },
  grandGallowsRope: {
    position: 'absolute',
    top: 15,
    left: 104,
    width: 3.5,
    height: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
  },

  // Muñequito de Pareja Detallado
  grandHmHead: {
    position: 'absolute',
    top: 34,
    left: 88,
    width: 35,
    height: 35,
    borderRadius: 17.5,
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
  grandHmBow: {
    position: 'absolute',
    top: -5,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
  },
  hmEyesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  grandHmEyeEmoji: {
    fontSize: 10,
    fontWeight: '900',
    color: '#db2777',
    lineHeight: 11,
  },
  hmMouthSmile: {
    width: 9,
    height: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: '#db2777',
    borderRadius: 2,
    marginTop: 1,
  },
  hmMouthLost: {
    width: 9,
    height: 3,
    borderTopWidth: 1.5,
    borderTopColor: '#ef4444',
    borderRadius: 2,
    marginTop: 1,
  },
  grandHmBody: {
    position: 'absolute',
    top: 68,
    left: 103.5,
    width: 4.5,
    height: 34,
    backgroundColor: '#db2777',
    borderRadius: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grandHmArmLeft: {
    position: 'absolute',
    top: 76,
    left: 86,
    width: 20,
    height: 3.5,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-30deg' }],
  },
  grandHmArmRight: {
    position: 'absolute',
    top: 76,
    left: 105,
    width: 20,
    height: 3.5,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '30deg' }],
  },
  grandHmLegLeft: {
    position: 'absolute',
    top: 100,
    left: 90,
    width: 18,
    height: 3.5,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '-40deg' }],
  },
  grandHmLegRight: {
    position: 'absolute',
    top: 100,
    left: 103,
    width: 18,
    height: 3.5,
    backgroundColor: '#db2777',
    borderRadius: 2,
    transform: [{ rotate: '40deg' }],
  },

  // Pista debajo de la ilustración con ÚNICO ícono
  hintWrapUnderGallows: {
    width: '100%',
    backgroundColor: '#fdf4ff',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.4)',
    alignItems: 'center',
    gap: 3,
  },
  hintQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hintQuoteText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#334155',
    lineHeight: 17,
    textAlign: 'center',
  },
  statusPillWon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
  },
  statusTextLost: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626',
  },

  // Casillas de letras agrupadas por palabras
  wordGroupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    paddingVertical: 3,
  },
  singleWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  letterSlot: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.8,
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
    includeFontPadding: false,
  },
  slotLetterTextRevealed: {
    color: '#7c3aed',
  },

  // Bandeja de Letras Falladas: Chips Rojos Compactos
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
    fontSize: 11,
    fontWeight: '900',
    color: '#dc2626',
    textDecorationLine: 'line-through',
  },

  // Teclado QWERTY 3D Táctil
  keyboardContainer: {
    width: '100%',
    gap: 5,
    marginTop: 2,
    alignItems: 'center',
  },
  keyboardRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  keyButton: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderBottomWidth: 3.5,
    borderBottomColor: '#94a3b8',
    ...GAMES_THEME.shadows.soft,
  },
  keyHit: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
  },
  keyMiss: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderBottomWidth: 2,
    borderBottomColor: '#f87171',
  },
  keyText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    includeFontPadding: false,
  },
  keyTextHit: {
    color: '#ffffff',
  },
  keyTextMiss: {
    color: '#ef4444',
    textDecorationLine: 'line-through',
  },

  // Dock Inferior
  dockActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 2,
  },
});

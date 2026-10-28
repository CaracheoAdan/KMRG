import React, { useEffect, useRef, useMemo } from 'react';
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

  // Animación al revelar parte del cuerpo por cada error
  const partAppearAnim = useRef(new Animated.Value(1)).current;
  const lastWrongRef = useRef(wrongGuessesCount);

  useEffect(() => {
    if (wrongGuessesCount > lastWrongRef.current) {
      partAppearAnim.setValue(0);
      Animated.spring(partAppearAnim, {
        toValue: 1,
        friction: 4,
        tension: 65,
        useNativeDriver: true,
      }).start();
    }
    lastWrongRef.current = wrongGuessesCount;
  }, [wrongGuessesCount, partAppearAnim]);

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
  const keyHeight = 46;

  // Partición balanceada de casillas: si totalLettersNoSpaces > 8, divide en dos filas balanceadas (ej. 6+5)
  const letterRows: Array<Array<{ word: string }>> = useMemo(() => {
    if (words.length === 1) {
      const w = words[0];
      if (w.length > 8) {
        const mid = Math.ceil(w.length / 2);
        return [
          [{ word: w.slice(0, mid) }],
          [{ word: w.slice(mid) }],
        ];
      }
      return [[{ word: w }]];
    }

    if (totalLettersNoSpaces > 8) {
      const row1: Array<{ word: string }> = [];
      const row2: Array<{ word: string }> = [];
      let c1 = 0;
      let c2 = 0;
      for (const w of words) {
        if (c1 === 0 || (c1 + w.length <= 8 && c1 <= c2)) {
          row1.push({ word: w });
          c1 += w.length;
        } else {
          row2.push({ word: w });
          c2 += w.length;
        }
      }
      return [row1, row2];
    }

    return [words.map((w) => ({ word: w }))];
  }, [words, totalLettersNoSpaces]);

  // Cálculo de ancho adaptado con margen lateral de 16px
  const maxLettersInAnyRow = useMemo(() => {
    return Math.max(
      1,
      ...letterRows.map((r: Array<{ word: string }>) =>
        r.reduce((acc: number, it: { word: string }) => acc + it.word.length, 0)
      )
    );
  }, [letterRows]);

  const availableWidthForSlots = containerWidth - 32; // 16px de margen lateral
  const dynamicSlotWidth = Math.max(
    24,
    Math.min(
      33,
      Math.floor((availableWidthForSlots - (maxLettersInAnyRow - 1) * 6) / maxLettersInAnyRow)
    )
  );
  const dynamicSlotHeight = Math.floor(dynamicSlotWidth * 1.15);
  const dynamicFontSize = Math.floor(dynamicSlotWidth * 0.72);

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
        {/* Patíbulo en Madera Clara con Base sobre el Suelo, Luna Llena y Brillo */}
        <LinearGradient
          colors={['#1e1b4b', '#312e81', '#1e1b4b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gallowsSceneStage}
        >
          {/* Luna brillante con halo de luz */}
          <View style={styles.sceneMoon}>
            <Ionicons name="moon" size={28} color="#fef08a" />
          </View>
          <View style={[styles.sceneStar, { top: 12, left: 24 }]} />
          <View style={[styles.sceneStar, { top: 28, left: 60, width: 2, height: 2 }]} />
          <View style={[styles.sceneStar, { top: 16, right: 70, width: 2, height: 2 }]} />
          <View style={[styles.sceneStar, { top: 38, right: 44 }]} />

          {/* Suelo / Plataforma del patíbulo */}
          <View style={styles.groundBeam} />

          {/* Ilustración Grande y Centrada del Patíbulo en Madera Noble */}
          <View style={styles.grandGallowsBox}>
            <View style={styles.grandGallowsBase} />
            <View style={styles.grandGallowsPole} />
            <View style={styles.grandGallowsTop} />
            <View style={styles.grandGallowsBrace} />
            <View style={styles.grandGallowsRope} />

            {/* Muñequito de Pareja Dibujado Trazo a Trazo con Animación en Cada Error */}
            {wrongGuessesCount >= 1 && (
              <Animated.View
                style={[
                  styles.grandHmHead,
                  isLost && styles.hmHeadLost,
                  wrongGuessesCount === 1 && { transform: [{ scale: partAppearAnim }] },
                ]}
              >
                <View style={styles.grandHmBow} />
                <View style={styles.hmEyesRow}>
                  <Text style={styles.grandHmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                  <Text style={styles.grandHmEyeEmoji}>{isLost ? '×' : isWon ? '^' : '•'}</Text>
                </View>
                <View style={isLost ? styles.hmMouthLost : styles.hmMouthSmile} />
              </Animated.View>
            )}

            {wrongGuessesCount >= 2 && (
              <Animated.View
                style={[
                  styles.grandHmBody,
                  wrongGuessesCount === 2 && { transform: [{ scale: partAppearAnim }] },
                ]}
              >
                <Ionicons name="heart" size={8} color="#ffffff" style={{ opacity: 0.9 }} />
              </Animated.View>
            )}
            {wrongGuessesCount >= 3 && (
              <Animated.View
                style={[
                  styles.grandHmArmLeft,
                  wrongGuessesCount === 3 && { transform: [{ scale: partAppearAnim }] },
                ]}
              />
            )}
            {wrongGuessesCount >= 4 && (
              <Animated.View
                style={[
                  styles.grandHmArmRight,
                  wrongGuessesCount === 4 && { transform: [{ scale: partAppearAnim }] },
                ]}
              />
            )}
            {wrongGuessesCount >= 5 && (
              <Animated.View
                style={[
                  styles.grandHmLegLeft,
                  wrongGuessesCount === 5 && { transform: [{ scale: partAppearAnim }] },
                ]}
              />
            )}
            {wrongGuessesCount >= 6 && (
              <Animated.View
                style={[
                  styles.grandHmLegRight,
                  wrongGuessesCount === 6 && { transform: [{ scale: partAppearAnim }] },
                ]}
              />
            )}
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

      {/* 2. Casillas de Letras: Divididas en dos filas balanceadas si > 8 letras, con margen de 16px */}
      <View style={styles.wordGroupsContainer}>
        {letterRows.map((row, rIdx) => (
          <View key={rIdx} style={styles.balancedSlotRow}>
            {row.map((group, gIdx) => (
              <View key={gIdx} style={styles.singleWordRow}>
                {group.word.split('').map((ch, cIdx) => {
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
        ))}
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
    justifyContent: 'space-between',
    paddingVertical: 8,
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
    height: 180,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sceneMoon: {
    position: 'absolute',
    top: 10,
    right: 14,
    shadowColor: '#fef08a',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 4,
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
    left: 12,
    right: 12,
    height: 7,
    backgroundColor: '#b45309',
    borderRadius: 3.5,
    borderWidth: 1.5,
    borderColor: '#d97706',
    shadowColor: '#d97706',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },

  // Patíbulo Grande en Madera Crema / Clara con Borde Cálido que Apoya en el Suelo
  grandGallowsBox: {
    width: 170,
    height: 160,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grandGallowsBase: {
    position: 'absolute',
    bottom: 15, // Apoya directamente sobre el suelo (groundBeam)
    left: 12,
    width: 80,
    height: 9,
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
    bottom: 22,
    left: 32,
    width: 9,
    height: 128,
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
    left: 32,
    width: 96,
    height: 9,
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
    top: 16,
    left: 42,
    width: 24,
    height: 6,
    backgroundColor: '#fde68a',
    borderWidth: 1,
    borderColor: '#b45309',
    borderRadius: 3,
    transform: [{ rotate: '-45deg' }],
  },
  grandGallowsRope: {
    position: 'absolute',
    top: 16,
    left: 108,
    width: 3.5,
    height: 24,
    backgroundColor: '#f59e0b',
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#92400e',
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

  // Casillas de letras agrupadas en filas balanceadas si > 8 letras
  wordGroupsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  balancedSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  singleWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  letterSlot: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: '#e2e8f0',
    borderBottomColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    ...GAMES_THEME.shadows.soft,
  },
  letterSlotRevealed: {
    borderBottomColor: '#9333ea',
    borderColor: '#d8b4fe',
    backgroundColor: '#faf5ff',
  },
  letterSlotMissedWord: {
    borderBottomColor: '#ef4444',
    borderColor: '#fca5a5',
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
    minHeight: 46,
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

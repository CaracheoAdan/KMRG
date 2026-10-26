import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '../ui/Icon';
import { GamesState } from '../../services/CoupleSyncService';

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
  return (
    <View style={styles.container}>
      {/* Clue and Gallows Stage */}
      <View style={styles.stage}>
        <View style={styles.gallowsBox}>
          <View style={styles.gallowsBase} />
          <View style={styles.gallowsPole} />
          <View style={styles.gallowsTop} />
          <View style={styles.gallowsRope} />
          {wrongGuessesCount >= 1 && <View style={styles.hmHead} />}
          {wrongGuessesCount >= 2 && <View style={styles.hmBody} />}
          {wrongGuessesCount >= 3 && <View style={styles.hmArmLeft} />}
          {wrongGuessesCount >= 4 && <View style={styles.hmArmRight} />}
          {wrongGuessesCount >= 5 && <View style={styles.hmLegLeft} />}
          {wrongGuessesCount >= 6 && <View style={styles.hmLegRight} />}
        </View>

        <View style={styles.stageInfo}>
          <View style={styles.livesRow}>
            {Array.from({ length: maxWrong }).map((_, i) => {
              const isAlive = i < maxWrong - wrongGuessesCount;
              return (
                <Ionicons
                  key={i}
                  name={isAlive ? 'heart' : 'heart-dislike-outline'}
                  size={14}
                  color={isAlive ? '#e11d48' : '#cbd5e1'}
                />
              );
            })}
          </View>
          <Text style={styles.categoryText}>
            {hangman.category || 'Palabra Oculta'}
          </Text>
          <Text style={styles.hintText} numberOfLines={2}>
            “{hangman.hint}”
          </Text>
        </View>
      </View>

      {/* Word Slots */}
      <View style={styles.wordSlotsWrap}>
        {hangman.word.split('').map((ch, idx) => {
          if (ch === ' ') return <View key={idx} style={{ width: 8 }} />;
          const revealed =
            hangman.guessed.includes(ch) || hangman.status !== 'playing';
          return (
            <View
              key={idx}
              style={[
                styles.slotBox,
                revealed && { borderColor: '#f472b6' },
              ]}
            >
              <Text style={styles.slotChar}>
                {revealed ? ch : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {/* QWERTY Keyboard */}
      <View style={styles.keyboardContainer}>
        {QWERTY_ROWS.map((rowLetters, rIdx) => (
          <View key={rIdx} style={styles.keyboardRow}>
            {rowLetters.map((letter) => {
              const used = hangman.guessed.includes(letter);
              const hit = used && hangman.word.includes(letter);
              return (
                <TouchableOpacity
                  key={letter}
                  disabled={used || hangman.status !== 'playing'}
                  onPress={() => onGuessLetter(letter)}
                  style={[
                    styles.key,
                    { width: rIdx === 2 ? 38 : 31 },
                    used && {
                      backgroundColor: hit ? '#dcfce7' : '#fee2e2',
                      borderColor: hit ? '#86efac' : '#fca5a5',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.keyText,
                      used && {
                        color: hit ? '#16a34a' : '#dc2626',
                        textDecorationLine: hit ? 'none' : 'line-through',
                      },
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

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={onRandomWord}
          style={[styles.secBtn, { borderColor: primaryColor }]}
        >
          <Ionicons name="shuffle" size={14} color={primaryColor} />
          <Text style={[styles.secBtnText, { color: primaryColor }]}>
            Otra Palabra
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onChallengePartner}
          style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
        >
          <Ionicons name="flame" size={14} color="#ffffff" />
          <Text style={styles.primaryBtnText}>Retar Pareja (+400)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    borderWidth: 1.5,
    borderColor: '#f472b6',
    borderRadius: 16,
    padding: 12,
    width: '100%',
    gap: 12,
  },
  gallowsBox: {
    width: 65,
    height: 70,
    position: 'relative',
  },
  gallowsBase: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    width: 45,
    height: 3,
    backgroundColor: '#475569',
  },
  gallowsPole: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    width: 3,
    height: 70,
    backgroundColor: '#475569',
  },
  gallowsTop: {
    position: 'absolute',
    top: 0,
    left: 14,
    width: 38,
    height: 3,
    backgroundColor: '#475569',
  },
  gallowsRope: {
    position: 'absolute',
    top: 3,
    right: 14,
    width: 2,
    height: 12,
    backgroundColor: '#94a3b8',
  },
  hmHead: {
    position: 'absolute',
    top: 14,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#f43f5e',
  },
  hmBody: {
    position: 'absolute',
    top: 32,
    right: 14,
    width: 3,
    height: 20,
    backgroundColor: '#f43f5e',
  },
  hmArmLeft: {
    position: 'absolute',
    top: 36,
    right: 16,
    width: 12,
    height: 3,
    backgroundColor: '#f43f5e',
    transform: [{ rotate: '-30deg' }],
  },
  hmArmRight: {
    position: 'absolute',
    top: 36,
    right: 3,
    width: 12,
    height: 3,
    backgroundColor: '#f43f5e',
    transform: [{ rotate: '30deg' }],
  },
  hmLegLeft: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 12,
    height: 3,
    backgroundColor: '#f43f5e',
    transform: [{ rotate: '-45deg' }],
  },
  hmLegRight: {
    position: 'absolute',
    top: 50,
    right: 3,
    width: 12,
    height: 3,
    backgroundColor: '#f43f5e',
    transform: [{ rotate: '45deg' }],
  },
  stageInfo: {
    flex: 1,
  },
  livesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#db2777',
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginTop: 2,
  },
  wordSlotsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 4,
  },
  slotBox: {
    width: 28,
    height: 36,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChar: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
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
  key: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  keyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e293b',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  secBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#ffffff',
  },
  secBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});

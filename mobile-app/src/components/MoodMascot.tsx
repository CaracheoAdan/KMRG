import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

export type MoodFeelingType =
  | 'feliz'
  | 'triste'
  | 'enamorado'
  | 'cansado'
  | 'enojado'
  | 'divertido'
  | 'tranquilo';

interface MoodMascotProps {
  feeling?: string;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg';
  accentColor?: string;
  accessory?: 'none' | 'crown' | 'party_hat' | 'flower' | 'sunglasses';
}

export const PRESET_FEELINGS: Array<{
  id: MoodFeelingType;
  label: string;
  emoji: string;
  description: string;
}> = [
  { id: 'feliz', label: 'Feliz', emoji: '😊', description: '¡Radiante y con una sonrisota!' },
  { id: 'enamorado', label: 'Enamorado/a', emoji: '🥰', description: 'Pensando en ti con ojitos de amor' },
  { id: 'tranquilo', label: 'Tranquilo/a', emoji: '😌', description: 'En paz y relajado/a' },
  { id: 'divertido', label: 'Juguetón/a', emoji: '😜', description: 'Con ganas de reír y bromear' },
  { id: 'cansado', label: 'Cansado/a', emoji: '😴', description: 'Con sueñito y sin mucha pila' },
  { id: 'triste', label: 'Triste', emoji: '🥺', description: 'Sensible y necesitando un abrazo' },
  { id: 'enojado', label: 'Enojado/a', emoji: '😤', description: 'Un poquito molesto/a o frustrado/a' },
];

/**
 * Infiere el tipo de sentimiento a partir de texto o emoji previo
 */
export function resolveFeelingType(feeling?: string, emoji?: string, status?: string): MoodFeelingType {
  const normalized = `${feeling || ''} ${emoji || ''} ${status || ''}`.toLowerCase();

  if (normalized.includes('triste') || normalized.includes('🥺') || normalized.includes('😢') || normalized.includes('😭')) {
    return 'triste';
  }
  if (normalized.includes('enamorado') || normalized.includes('🥰') || normalized.includes('😍') || normalized.includes('❤️')) {
    return 'enamorado';
  }
  if (normalized.includes('cansado') || normalized.includes('sueño') || normalized.includes('😴') || normalized.includes('🥱')) {
    return 'cansado';
  }
  if (normalized.includes('enojado') || normalized.includes('molest') || normalized.includes('😤') || normalized.includes('😡') || normalized.includes('😠')) {
    return 'enojado';
  }
  if (normalized.includes('divertido') || normalized.includes('juguet') || normalized.includes('😜') || normalized.includes('🤪') || normalized.includes('😎')) {
    return 'divertido';
  }
  if (normalized.includes('tranquil') || normalized.includes('paz') || normalized.includes('😌') || normalized.includes('🌸')) {
    return 'tranquilo';
  }
  return 'feliz';
}

export const MoodMascot: React.FC<MoodMascotProps> = ({
  feeling,
  emoji,
  size = 'md',
  accentColor = '#e11d48',
  accessory,
}) => {
  const feelingType = resolveFeelingType(feeling, emoji);

  // Escalas de tamaño
  const scale = size === 'sm' ? 0.65 : size === 'lg' ? 1.35 : 1.0;
  const baseWidth = 72 * scale;
  const baseHeight = 72 * scale;

  return (
    <View style={[styles.container, { width: baseWidth + 12 * scale, height: baseHeight + 14 * scale }]}>
      {/* Accesorios de Pochito 2.0 */}
      {accessory === 'crown' && (
        <View style={[styles.floatingBadgeTop, { top: -10 * scale, left: baseWidth / 2 - 6 * scale, zIndex: 12 }]}>
          <Text style={{ fontSize: 16 * scale }}>👑</Text>
        </View>
      )}
      {accessory === 'party_hat' && (
        <View style={[styles.floatingBadgeTop, { top: -10 * scale, left: baseWidth / 2 - 6 * scale, zIndex: 12 }]}>
          <Text style={{ fontSize: 16 * scale }}>🥳</Text>
        </View>
      )}
      {accessory === 'flower' && (
        <View style={[styles.floatingBadgeTop, { top: 0, right: -4 * scale, zIndex: 12 }]}>
          <Text style={{ fontSize: 15 * scale }}>🌸</Text>
        </View>
      )}
      {accessory === 'sunglasses' && (
        <View style={[styles.floatingBadgeTop, { top: 18 * scale, left: baseWidth / 2 - 10 * scale, zIndex: 12 }]}>
          <Text style={{ fontSize: 15 * scale }}>🕶️</Text>
        </View>
      )}
      {/* Aura o accesorio flotante superior según el estado */}
      {feelingType === 'enamorado' && (
        <View style={[styles.floatingBadgeTop, { top: -2 * scale }]}>
          <Text style={{ fontSize: 13 * scale }}>💖</Text>
        </View>
      )}
      {feelingType === 'cansado' && (
        <View style={[styles.floatingBadgeTop, { top: -4 * scale, right: 0 }]}>
          <Text style={{ fontSize: 11 * scale, fontWeight: '800', color: '#64748b' }}>z Z Z</Text>
        </View>
      )}
      {feelingType === 'enojado' && (
        <View style={[styles.floatingBadgeTop, { top: -4 * scale, right: 2 }]}>
          <Text style={{ fontSize: 12 * scale }}>💢</Text>
        </View>
      )}
      {feelingType === 'tranquilo' && (
        <View style={[styles.floatingBadgeTop, { top: -3 * scale, right: 4 }]}>
          <Text style={{ fontSize: 11 * scale }}>✨</Text>
        </View>
      )}

      {/* Orejitas del monito */}
      <View style={[styles.earsRow, { width: baseWidth }]}>
        <View style={[styles.ear, { width: 14 * scale, height: 14 * scale, borderRadius: 7 * scale }]} />
        <View style={[styles.ear, { width: 14 * scale, height: 14 * scale, borderRadius: 7 * scale }]} />
      </View>

      {/* Cuerpo principal redondeado del Monito */}
      <View
        style={[
          styles.mascotBody,
          {
            width: baseWidth,
            height: baseHeight,
            borderRadius: baseWidth / 2,
            backgroundColor:
              feelingType === 'enojado'
                ? '#fff1f2'
                : feelingType === 'triste'
                ? '#f0f9ff'
                : feelingType === 'enamorado'
                ? '#fff0f6'
                : feelingType === 'cansado'
                ? '#f8fafc'
                : '#ffffff',
            borderColor:
              feelingType === 'enojado'
                ? '#fda4af'
                : feelingType === 'triste'
                ? '#bae6fd'
                : feelingType === 'enamorado'
                ? '#fbcfe8'
                : '#e2e8f0',
          },
        ]}
      >
        {/* Brazos / Manitas según el sentimiento */}
        {feelingType === 'feliz' && (
          <>
            <View style={[styles.armRaisedLeft, { width: 10 * scale, height: 6 * scale }]} />
            <View style={[styles.armRaisedRight, { width: 10 * scale, height: 6 * scale }]} />
          </>
        )}
        {feelingType === 'divertido' && (
          <View style={[styles.armWaveRight, { width: 10 * scale, height: 6 * scale }]} />
        )}

        {/* ================= OJOS ================= */}
        <View style={[styles.eyesRow, { gap: 14 * scale }]}>
          {/* Ojo Izquierdo */}
          {feelingType === 'feliz' && (
            <Text style={[styles.eyeCurved, { fontSize: 14 * scale, color: '#1e293b' }]}>^</Text>
          )}
          {feelingType === 'enamorado' && (
            <Text style={{ fontSize: 13 * scale, color: accentColor }}>❤️</Text>
          )}
          {feelingType === 'triste' && (
            <View style={[styles.eyeSadPupil, { width: 9 * scale, height: 9 * scale, borderRadius: 5 * scale }]}>
              <View style={[styles.eyeSadGleam, { width: 3 * scale, height: 3 * scale }]} />
            </View>
          )}
          {feelingType === 'cansado' && (
            <Text style={[styles.eyeSleepy, { fontSize: 13 * scale, color: '#475569' }]}>-</Text>
          )}
          {feelingType === 'enojado' && (
            <Text style={[styles.eyeAngryLeft, { fontSize: 13 * scale, color: '#be123c' }]}>ˋ</Text>
          )}
          {feelingType === 'divertido' && (
            <Text style={[styles.eyeCurved, { fontSize: 13 * scale, color: '#1e293b' }]}>&gt;</Text>
          )}
          {feelingType === 'tranquilo' && (
            <Text style={[styles.eyeCurved, { fontSize: 13 * scale, color: '#334155' }]}>˘</Text>
          )}

          {/* Ojo Derecho */}
          {feelingType === 'feliz' && (
            <Text style={[styles.eyeCurved, { fontSize: 14 * scale, color: '#1e293b' }]}>^</Text>
          )}
          {feelingType === 'enamorado' && (
            <Text style={{ fontSize: 13 * scale, color: accentColor }}>❤️</Text>
          )}
          {feelingType === 'triste' && (
            <View style={[styles.eyeSadPupil, { width: 9 * scale, height: 9 * scale, borderRadius: 5 * scale }]}>
              <View style={[styles.eyeSadGleam, { width: 3 * scale, height: 3 * scale }]} />
            </View>
          )}
          {feelingType === 'cansado' && (
            <Text style={[styles.eyeSleepy, { fontSize: 13 * scale, color: '#475569' }]}>-</Text>
          )}
          {feelingType === 'enojado' && (
            <Text style={[styles.eyeAngryRight, { fontSize: 13 * scale, color: '#be123c' }]}>ˊ</Text>
          )}
          {feelingType === 'divertido' && (
            <View style={[styles.eyeSadPupil, { width: 8 * scale, height: 8 * scale, borderRadius: 4 * scale }]} />
          )}
          {feelingType === 'tranquilo' && (
            <Text style={[styles.eyeCurved, { fontSize: 13 * scale, color: '#334155' }]}>˘</Text>
          )}
        </View>

        {/* Mejillas sonrojadas */}
        <View style={[styles.cheeksRow, { width: baseWidth * 0.72 }]}>
          <View
            style={[
              styles.blushCircle,
              {
                width: 9 * scale,
                height: 5 * scale,
                borderRadius: 3 * scale,
                backgroundColor: feelingType === 'enojado' ? '#f43f5e55' : '#fb718555',
              },
            ]}
          />
          <View
            style={[
              styles.blushCircle,
              {
                width: 9 * scale,
                height: 5 * scale,
                borderRadius: 3 * scale,
                backgroundColor: feelingType === 'enojado' ? '#f43f5e55' : '#fb718555',
              },
            ]}
          />
        </View>

        {/* Lágrima si está triste */}
        {feelingType === 'triste' && (
          <View style={[styles.teardrop, { left: baseWidth * 0.22, top: baseHeight * 0.52 }]}>
            <Text style={{ fontSize: 9 * scale }}>💧</Text>
          </View>
        )}

        {/* ================= BOCA ================= */}
        <View style={styles.mouthContainer}>
          {feelingType === 'feliz' && (
            <View
              style={[
                styles.mouthOpenHappy,
                { width: 14 * scale, height: 8 * scale, borderBottomLeftRadius: 7 * scale, borderBottomRightRadius: 7 * scale },
              ]}
            >
              <View
                style={[
                  styles.tongue,
                  { width: 8 * scale, height: 4 * scale, borderTopLeftRadius: 4 * scale, borderTopRightRadius: 4 * scale },
                ]}
              />
            </View>
          )}
          {feelingType === 'enamorado' && (
            <View
              style={[
                styles.mouthSmile,
                { width: 13 * scale, height: 6 * scale, borderBottomLeftRadius: 6 * scale, borderBottomRightRadius: 6 * scale },
              ]}
            />
          )}
          {feelingType === 'triste' && (
            <View
              style={[
                styles.mouthFrown,
                { width: 11 * scale, height: 5 * scale, borderTopLeftRadius: 5 * scale, borderTopRightRadius: 5 * scale },
              ]}
            />
          )}
          {feelingType === 'cansado' && (
            <View
              style={[
                styles.mouthSnooze,
                { width: 6 * scale, height: 6 * scale, borderRadius: 3 * scale },
              ]}
            />
          )}
          {feelingType === 'enojado' && (
            <View
              style={[
                styles.mouthAngryPout,
                { width: 10 * scale, height: 3 * scale, borderRadius: 2 * scale },
              ]}
            />
          )}
          {feelingType === 'divertido' && (
            <View style={{ alignItems: 'center' }}>
              <View
                style={[
                  styles.mouthOpenHappy,
                  { width: 12 * scale, height: 6 * scale, borderBottomLeftRadius: 6 * scale, borderBottomRightRadius: 6 * scale },
                ]}
              />
              <View
                style={[
                  styles.playfulTongue,
                  { width: 6 * scale, height: 5 * scale, borderRadius: 3 * scale },
                ]}
              />
            </View>
          )}
          {feelingType === 'tranquilo' && (
            <View
              style={[
                styles.mouthCalm,
                { width: 9 * scale, height: 4 * scale, borderBottomLeftRadius: 4 * scale, borderBottomRightRadius: 4 * scale },
              ]}
            />
          )}
        </View>

        {/* Manitas que sostienen corazón si está enamorado */}
        {feelingType === 'enamorado' && (
          <View style={[styles.holdingHeartBox, { bottom: -1 * scale }]}>
            <Text style={{ fontSize: 10 * scale }}>💝</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingBadgeTop: {
    position: 'absolute',
    zIndex: 10,
  },
  earsRow: {
    position: 'absolute',
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    zIndex: 1,
  },
  ear: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  mascotBody: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  armRaisedLeft: {
    position: 'absolute',
    left: -4,
    top: '36%',
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    transform: [{ rotate: '-40deg' }],
  },
  armRaisedRight: {
    position: 'absolute',
    right: -4,
    top: '36%',
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    transform: [{ rotate: '40deg' }],
  },
  armWaveRight: {
    position: 'absolute',
    right: -4,
    top: '32%',
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    transform: [{ rotate: '50deg' }],
  },
  eyesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  eyeCurved: {
    fontWeight: '900',
  },
  eyeSleepy: {
    fontWeight: '900',
  },
  eyeAngryLeft: {
    fontWeight: '900',
    transform: [{ rotate: '15deg' }],
  },
  eyeAngryRight: {
    fontWeight: '900',
    transform: [{ rotate: '-15deg' }],
  },
  eyeSadPupil: {
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  eyeSadGleam: {
    backgroundColor: '#ffffff',
    borderRadius: 2,
    position: 'absolute',
    top: 1,
    left: 1,
  },
  cheeksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -2,
  },
  blushCircle: {},
  teardrop: {
    position: 'absolute',
    zIndex: 5,
  },
  mouthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  mouthOpenHappy: {
    backgroundColor: '#be123c',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tongue: {
    backgroundColor: '#fb7185',
  },
  mouthSmile: {
    borderBottomWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  mouthFrown: {
    borderTopWidth: 2,
    borderColor: '#334155',
    backgroundColor: 'transparent',
  },
  mouthSnooze: {
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: '#f1f5f9',
  },
  mouthAngryPout: {
    backgroundColor: '#be123c',
  },
  playfulTongue: {
    backgroundColor: '#f43f5e',
    marginTop: -1,
  },
  mouthCalm: {
    borderBottomWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  holdingHeartBox: {
    position: 'absolute',
    zIndex: 6,
  },
});

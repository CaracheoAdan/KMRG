import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from './ui/Icon';
import { FONTS } from '../theme/designSystem';

interface Props {
  streakCount: number;
  lastInteractionDate: string;
  primaryColor: string;
}

export const HeartbeatHeatmap: React.FC<Props> = ({
  streakCount,
  lastInteractionDate,
  primaryColor,
}) => {
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Current day of week (0 is Sunday in JS, convert to Monday=0 .. Sunday=6)
  const now = new Date();
  const currentDayIndex = (now.getDay() + 6) % 7;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Ionicons name="pulse" size={18} color={primaryColor} />
          <Text style={styles.sectionTitle}>Conexión Semanal</Text>
        </View>
        <View style={[styles.streakBadge, { backgroundColor: `${primaryColor}15` }]}>
          <Ionicons name="flame" size={12} color="#f59e0b" />
          <Text style={[styles.streakText, { color: primaryColor }]}>
            {streakCount} {streakCount === 1 ? 'día' : 'días'} de racha
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.daysRow}>
          {daysOfWeek.map((day, idx) => {
            const isToday = idx === currentDayIndex;
            const isPast = idx < currentDayIndex;
            const isConnected = isPast || (isToday && streakCount > 0);

            return (
              <View key={day} style={styles.dayCol}>
                <Text
                  style={[
                    styles.dayName,
                    isToday && { color: primaryColor, fontWeight: '700' },
                  ]}
                >
                  {day}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    isConnected
                      ? { backgroundColor: primaryColor, elevation: isToday ? 3 : 1 }
                      : { backgroundColor: '#f1f5f9' },
                    isToday && { borderColor: primaryColor, borderWidth: 2 },
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={11}
                    color={isConnected ? '#ffffff' : '#cbd5e1'}
                  />
                </View>
                {isToday && (
                  <View style={[styles.todayIndicator, { backgroundColor: primaryColor }]} />
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footerNote}>
          {streakCount > 0
            ? '¡Sigan latiendo juntos cada día para mantener la llama encendida!'
            : 'Mándale un latido hoy a tu pareja para reavivar la conexión.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: FONTS.serif,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayName: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: -2,
  },
  footerNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

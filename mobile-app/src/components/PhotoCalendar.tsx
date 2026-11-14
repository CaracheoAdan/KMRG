import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from './ui/Icon';
import { useTheme } from '../contexts/ThemeContext';
import { toLocalDateString } from '../services/StorageService';

interface PhotoCalendarProps {
  selectedDate: string; // 'YYYY-MM-DD'
  markedDates: Record<string, { marked?: boolean; dotColor?: string }>;
  onSelectDate: (dateString: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const PhotoCalendar: React.FC<PhotoCalendarProps> = ({
  selectedDate,
  markedDates,
  onSelectDate,
}) => {
  const { colors, isDark, primaryColor } = useTheme();
  const todayStr = toLocalDateString(new Date());

  // Inicializar en el mes de la fecha seleccionada de forma exacta sin desfase horario
  const initialParts = selectedDate ? selectedDate.substring(0, 10).split('-').map(Number) : [];
  const initialYear = initialParts.length === 3 && !isNaN(initialParts[0]) ? initialParts[0] : new Date().getFullYear();
  const initialMonth = initialParts.length === 3 && !isNaN(initialParts[1]) ? initialParts[1] - 1 : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth); // 0-11

  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.substring(0, 10).split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        setCurrentYear(parts[0]);
        setCurrentMonth(parts[1] - 1);
      }
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    onSelectDate(todayStr);
  };

  // Generar cuadrícula de días para el mes actual
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: Array<{ dayNum: number | null; dateString: string | null }> = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ dayNum: null, dateString: null });
  }

  let monthMemoriesDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    if (markedDates[dateStr]?.marked) monthMemoriesDays++;
    days.push({ dayNum: d, dateString: dateStr });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Encabezado: Mes, Año, acceso rápido a Hoy y flechas */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.navButton, { backgroundColor: `${primaryColor}18` }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={20} color={primaryColor} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Text>
          <View style={styles.headerMetaRow}>
            {monthMemoriesDays > 0 && (
              <View style={[styles.monthStatPill, { backgroundColor: `${primaryColor}16` }]}>
                <Text style={[styles.monthStatText, { color: primaryColor }]}>
                  {monthMemoriesDays} {monthMemoriesDays === 1 ? 'día con foto' : 'días con foto'}
                </Text>
              </View>
            )}
            {selectedDate !== todayStr && (
              <TouchableOpacity
                onPress={handleJumpToday}
                style={[
                  styles.todayPill,
                  {
                    backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight,
                    borderColor: `${primaryColor}35`,
                  },
                ]}
                activeOpacity={0.75}
              >
                <Text style={[styles.todayPillText, { color: primaryColor }]}>Hoy</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.navButton, { backgroundColor: `${primaryColor}18` }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={20} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Días de la semana */}
      <View style={styles.weekDaysRow}>
        {WEEK_DAYS.map((wd, index) => (
          <Text key={index} style={[styles.weekDayText, { color: colors.textMuted }]}>
            {wd}
          </Text>
        ))}
      </View>

      {/* Cuadrícula de días */}
      <View style={styles.daysGrid}>
        {days.map((item, index) => {
          if (!item.dayNum || !item.dateString) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const isSelected = item.dateString === selectedDate;
          const isToday = item.dateString === todayStr;
          const hasMemory = Boolean(markedDates[item.dateString]?.marked);

          return (
            <TouchableOpacity
              key={item.dateString}
              onPress={() => item.dateString && onSelectDate(item.dateString)}
              style={[
                styles.dayCell,
                isToday && !isSelected && { backgroundColor: `${primaryColor}14` },
                isSelected && { backgroundColor: primaryColor },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: colors.text },
                  isToday && !isSelected && [styles.dayTextToday, { color: primaryColor }],
                  isSelected && styles.dayTextSelected,
                ]}
              >
                {item.dayNum}
              </Text>

              {/* Indicador de foto/recuerdo (punto del color temático) */}
              {hasMemory && (
                <View
                  style={[
                    styles.memoryDot,
                    { backgroundColor: primaryColor },
                    isSelected && styles.memoryDotSelected,
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 3,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  monthStatPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  monthStatText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  todayPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  todayPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 1,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayTextToday: {
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  memoryDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  memoryDotSelected: {
    backgroundColor: '#ffffff',
  },
});

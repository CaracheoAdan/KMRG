import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

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
  const { primaryColor } = useTheme();

  // Inicializar en el mes de la fecha seleccionada o la fecha actual
  const initialDate = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

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

  // Generar cuadrícula de días para el mes actual
  // Primer día de la semana para el 1 del mes (0 = Domingo)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // Total de días en el mes actual
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: Array<{ dayNum: number | null; dateString: string | null }> = [];

  // Días vacíos de relleno antes del 1
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ dayNum: null, dateString: null });
  }

  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    days.push({ dayNum: d, dateString: dateStr });
  }

  const todayStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  return (
    <View style={styles.container}>
      {/* Encabezado: Mes, Año y Controles de navegación */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.navButton, { backgroundColor: `${primaryColor}18` }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={primaryColor} />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {MONTH_NAMES[currentMonth]} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.navButton, { backgroundColor: `${primaryColor}18` }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={22} color={primaryColor} />
        </TouchableOpacity>
      </View>

      {/* Días de la semana */}
      <View style={styles.weekDaysRow}>
        {WEEK_DAYS.map((wd, index) => (
          <Text key={index} style={styles.weekDayText}>
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
                isSelected && [styles.dayCellSelected, { backgroundColor: primaryColor }],
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && !isSelected && [styles.dayTextToday, { color: primaryColor }],
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
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#8d99ae',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 2,
    borderRadius: 22,
  },
  dayCellSelected: {
    backgroundColor: '#e63946',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2b2d42',
  },
  dayTextToday: {
    color: '#e63946',
    fontWeight: '700',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  memoryDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#e63946',
  },
  memoryDotSelected: {
    backgroundColor: '#ffffff',
  },
});

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { formatDisplayDate } from '../services/StorageService';
import { useTheme } from '../contexts/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  value: string; // 'YYYY-MM-DD'
  onSelect: (dateString: string) => void;
  onClose: () => void;
  title?: string;
  minDate?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  onSelect,
  onClose,
  title = 'Elige una fecha',
  minDate,
}) => {
  const { primaryColor } = useTheme();

  // Inicializar en el mes de la fecha actual
  const effectiveVal = (minDate && value && value < minDate) ? minDate : value;
  const initialDate = effectiveVal ? new Date(effectiveVal + 'T12:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11
  const [tempDate, setTempDate] = useState(effectiveVal);

  // Sincronizar cuando cambia el valor recibido
  React.useEffect(() => {
    const val = (minDate && value && value < minDate) ? minDate : value;
    if (val) {
      setTempDate(val);
      const d = new Date(val + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value, visible, minDate]);

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

  // Accesos rápidos: Hoy y Ayer
  const setQuickDate = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    const str = `${y}-${m}-${d}`;
    setTempDate(str);
    setCurrentYear(y);
    setCurrentMonth(target.getMonth());
  };

  // Cuadrícula de días
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const days: Array<{ dayNum: number | null; dateString: string | null }> = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ dayNum: null, dateString: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    days.push({ dayNum: d, dateString: dateStr });
  }

  const handleConfirm = () => {
    onSelect(tempDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Cabecera */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={[styles.headerSubtitle, { color: primaryColor }]}>
                {formatDisplayDate(tempDate, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6c757d" />
            </TouchableOpacity>
          </View>

          {/* Accesos rápidos */}
          <View style={styles.quickButtonsRow}>
            {minDate ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    const t = new Date(); t.setDate(t.getDate() + 1);
                    const s = t.toISOString().slice(0, 10);
                    setTempDate(s); setCurrentYear(t.getFullYear()); setCurrentMonth(t.getMonth());
                  }}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>Mañana</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const t = new Date(); t.setDate(t.getDate() + 7);
                    const s = t.toISOString().slice(0, 10);
                    setTempDate(s); setCurrentYear(t.getFullYear()); setCurrentMonth(t.getMonth());
                  }}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>En 1 sem</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const t = new Date(); t.setDate(t.getDate() + 30);
                    const s = t.toISOString().slice(0, 10);
                    setTempDate(s); setCurrentYear(t.getFullYear()); setCurrentMonth(t.getMonth());
                  }}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>En 1 mes</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setQuickDate(0)}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickDate(1)}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>Ayer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickDate(7)}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickBtnText}>Hace 1 sem</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Controles de mes y año */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={[styles.navArrow, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="chevron-back" size={20} color={primaryColor} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={[styles.navArrow, { backgroundColor: `${primaryColor}18` }]}>
              <Ionicons name="chevron-forward" size={20} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {/* Días de la semana */}
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((wd, i) => (
              <Text key={i} style={styles.weekText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Días del mes */}
          <View style={styles.daysGrid}>
            {days.map((item, index) => {
              if (!item.dayNum || !item.dateString) {
                return <View key={`p-${index}`} style={styles.dayCell} />;
              }

              const isSelected = item.dateString === tempDate;

              const isPastDisabled = Boolean(minDate && item.dateString < minDate);
              return (
                <TouchableOpacity
                  key={item.dateString}
                  disabled={isPastDisabled}
                  onPress={() => item.dateString && setTempDate(item.dateString)}
                  style={[
                    styles.dayCell,
                    isSelected && [styles.dayCellSelected, { backgroundColor: primaryColor }],
                    isPastDisabled && { opacity: 0.25 },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: primaryColor }]}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Confirmar Fecha</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b2d42',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e63946',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickBtnText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff0f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2b2d42',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#8d99ae',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#e63946',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2b2d42',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e63946',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

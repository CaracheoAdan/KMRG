import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from './ui/Icon';
import { formatDisplayDate, toLocalDateString } from '../services/StorageService';
import { useTheme } from '../contexts/ThemeContext';

interface DatePickerModalProps {
  visible: boolean;
  value: string; // 'YYYY-MM-DD'
  onSelect: (dateString: string) => void;
  onClose: () => void;
  title?: string;
  minDate?: string;
  showQuickSelect?: boolean;
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
  showQuickSelect = true,
}) => {
  const { primaryColor } = useTheme();

  // Inicializar en el mes de la fecha actual (extrayendo año y mes de forma exacta sin desfase UTC)
  const effectiveVal = (minDate && value && value < minDate) ? minDate : value;
  const initialParts = effectiveVal ? effectiveVal.split('-').map(Number) : [];
  const initialYear = initialParts.length === 3 && !isNaN(initialParts[0]) ? initialParts[0] : new Date().getFullYear();
  const initialMonth = initialParts.length === 3 && !isNaN(initialParts[1]) ? initialParts[1] - 1 : new Date().getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth); // 0-11
  const [tempDate, setTempDate] = useState(effectiveVal);
  const [pickerMode, setPickerMode] = useState<'calendar' | 'month' | 'year'>('calendar');
  const availableYears = React.useMemo(() => {
    const maxYear = new Date().getFullYear() + 2;
    const yearsList: number[] = [];
    for (let y = maxYear; y >= 1995; y--) {
      yearsList.push(y);
    }
    return yearsList;
  }, []);

  const handleSelectYear = (yr: number) => {
    setCurrentYear(yr);
    setPickerMode('calendar');
    if (tempDate) {
      const parts = tempDate.split('-').map(Number);
      const day = Math.min(parts[2] || 1, new Date(yr, currentMonth + 1, 0).getDate());
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      setTempDate(`${yr}-${mStr}-${dStr}`);
    }
  };

  const handleSelectMonth = (mIdx: number) => {
    setCurrentMonth(mIdx);
    setPickerMode('calendar');
    if (tempDate) {
      const parts = tempDate.split('-').map(Number);
      const day = Math.min(parts[2] || 1, new Date(currentYear, mIdx + 1, 0).getDate());
      const mStr = String(mIdx + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      setTempDate(`${currentYear}-${mStr}-${dStr}`);
    }
  };

  // Sincronizar cuando cambia el valor recibido
  React.useEffect(() => {
    const val = (minDate && value && value < minDate) ? minDate : value;
    if (val) {
      setTempDate(val);
      const parts = val.split('-').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        setCurrentYear(parts[0]);
        setCurrentMonth(parts[1] - 1);
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

  // Accesos rápidos: Hoy y Ayer (en zona horaria local)
  const setQuickDate = (daysAgo: number) => {
    const target = new Date();
    target.setDate(target.getDate() - daysAgo);
    const str = toLocalDateString(target);
    setTempDate(str);
    const parts = str.split('-').map(Number);
    setCurrentYear(parts[0]);
    setCurrentMonth(parts[1] - 1);
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

          {/* Accesos rápidos O Selector de Año/Mes para Aniversario */}
          {showQuickSelect ? (
            <View style={styles.quickButtonsRow}>
              {minDate ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 1);
                      const s = toLocalDateString(t);
                      setTempDate(s);
                      const parts = s.split('-').map(Number);
                      setCurrentYear(parts[0]);
                      setCurrentMonth(parts[1] - 1);
                    }}
                    style={styles.quickBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickBtnText}>Mañana</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 7);
                      const s = toLocalDateString(t);
                      setTempDate(s);
                      const parts = s.split('-').map(Number);
                      setCurrentYear(parts[0]);
                      setCurrentMonth(parts[1] - 1);
                    }}
                    style={styles.quickBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickBtnText}>En 1 sem</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const t = new Date();
                      t.setDate(t.getDate() + 30);
                      const s = toLocalDateString(t);
                      setTempDate(s);
                      const parts = s.split('-').map(Number);
                      setCurrentYear(parts[0]);
                      setCurrentMonth(parts[1] - 1);
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
          ) : (
            <View style={styles.quickYearMonthRow}>
              <TouchableOpacity
                onPress={() => setPickerMode(pickerMode === 'month' ? 'calendar' : 'month')}
                style={[
                  styles.quickSelectorChip,
                  pickerMode === 'month' && { backgroundColor: primaryColor, borderColor: primaryColor },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={pickerMode === 'month' ? '#ffffff' : primaryColor}
                />
                <Text
                  style={[
                    styles.quickSelectorChipText,
                    { color: pickerMode === 'month' ? '#ffffff' : primaryColor },
                  ]}
                >
                  {MONTH_NAMES[currentMonth]}
                </Text>
                <Ionicons
                  name={pickerMode === 'month' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={pickerMode === 'month' ? '#ffffff' : primaryColor}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPickerMode(pickerMode === 'year' ? 'calendar' : 'year')}
                style={[
                  styles.quickSelectorChip,
                  pickerMode === 'year' && { backgroundColor: primaryColor, borderColor: primaryColor },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={pickerMode === 'year' ? '#ffffff' : primaryColor}
                />
                <Text
                  style={[
                    styles.quickSelectorChipText,
                    { color: pickerMode === 'year' ? '#ffffff' : primaryColor },
                  ]}
                >
                  Año {currentYear}
                </Text>
                <Ionicons
                  name={pickerMode === 'year' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={pickerMode === 'year' ? '#ffffff' : primaryColor}
                />
              </TouchableOpacity>
            </View>
          )}

          {pickerMode === 'month' ? (
            <View style={styles.pickerGridContainer}>
              <Text style={styles.pickerGridTitle}>Selecciona el mes</Text>
              <View style={styles.monthsGrid}>
                {MONTH_NAMES.map((mName, mIdx) => {
                  const isSelected = mIdx === currentMonth;
                  return (
                    <TouchableOpacity
                      key={mName}
                      onPress={() => handleSelectMonth(mIdx)}
                      style={[
                        styles.monthPickBtn,
                        isSelected && { backgroundColor: primaryColor, borderColor: primaryColor },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.monthPickText,
                          isSelected && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {mName.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : pickerMode === 'year' ? (
            <View style={styles.pickerGridContainer}>
              <Text style={styles.pickerGridTitle}>Selecciona el año</Text>
              <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                <View style={styles.yearsGrid}>
                  {availableYears.map((yr) => {
                    const isSelected = yr === currentYear;
                    return (
                      <TouchableOpacity
                        key={yr}
                        onPress={() => handleSelectYear(yr)}
                        style={[
                          styles.yearPickBtn,
                          isSelected && { backgroundColor: primaryColor, borderColor: primaryColor },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.yearPickText,
                            isSelected && { color: '#ffffff', fontWeight: '800' },
                          ]}
                        >
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : (
            <>
              {/* Controles de mes y año */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={handlePrevMonth} style={[styles.navArrow, { backgroundColor: `${primaryColor}18` }]}>
                  <Ionicons name="chevron-back" size={20} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPickerMode('month')}
                  activeOpacity={0.7}
                  style={styles.monthLabelTouch}
                >
                  <Text style={styles.monthLabel}>
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Text>
                  <Ionicons name="chevron-down" size={13} color="#6c757d" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
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
            </>
          )}

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
  quickYearMonthRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickSelectorChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickSelectorChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  monthLabelTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pickerGridContainer: {
    paddingVertical: 8,
    minHeight: 210,
    justifyContent: 'center',
  },
  pickerGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8d99ae',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  monthPickBtn: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  monthPickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b2d42',
  },
  yearsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  yearPickBtn: {
    width: '22%',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  yearPickText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2b2d42',
  },
});

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrderFilters } from '@/contexts/OrderFiltersContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';

const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

export default function OrderFiltersCustomScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const {
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    lastOrdersCount,
    setLastOrdersCount,
    setPeriodPreset,
  } = useOrderFilters();

  const [mode, setMode] = useState<'personalizado' | 'ultimos_pedidos'>('personalizado');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = () => {
    setPeriodPreset(mode === 'personalizado' ? 'personalizado' : 'ultimos_pedidos');
    router.dismiss(2);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalizado</Text>
        <View style={{ width: 24 }} />
      </View>

      <TouchableOpacity style={styles.optionBlock} onPress={() => setMode('personalizado')}>
        <View style={styles.radioRow}>
          <Ionicons
            name={mode === 'personalizado' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={themeColors.primary.dark}
          />
          <Text style={styles.optionTitle}>Período Personalizado</Text>
        </View>

        {mode === 'personalizado' && (
          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowStartPicker(true)}>
              <Text style={styles.dateFieldLabel}>Data de Início</Text>
              <Text style={styles.dateFieldValue}>
                {format(customStartDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>
            {showStartPicker && DateTimePicker && (
              <DateTimePicker
                value={customStartDate}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onChange={(_: any, date?: Date) => {
                  setShowStartPicker(false);
                  if (date) setCustomStartDate(date);
                }}
              />
            )}

            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowEndPicker(true)}>
              <Text style={styles.dateFieldLabel}>Data de Término</Text>
              <Text style={styles.dateFieldValue}>
                {format(customEndDate, 'dd/MM/yyyy')}
              </Text>
            </TouchableOpacity>
            {showEndPicker && DateTimePicker && (
              <DateTimePicker
                value={customEndDate}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onChange={(_: any, date?: Date) => {
                  setShowEndPicker(false);
                  if (date) setCustomEndDate(date);
                }}
              />
            )}
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.optionBlock} onPress={() => setMode('ultimos_pedidos')}>
        <View style={styles.radioRow}>
          <Ionicons
            name={mode === 'ultimos_pedidos' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={themeColors.primary.dark}
          />
          <Text style={styles.optionTitle}>Últimos Pedidos</Text>
        </View>

        {mode === 'ultimos_pedidos' && (
          <>
            <View style={styles.hintBox}>
              <Ionicons name="help-circle-outline" size={16} color={themeColors.text.secondary} />
              <Text style={styles.hintText}>Últimos pedidos em qualquer data</Text>
            </View>
            <View style={styles.countRow}>
              {[5, 10, 20, 30].map(n => (
                <TouchableOpacity
                  key={n}
                  style={styles.countOption}
                  onPress={() => setLastOrdersCount(n)}>
                  <Ionicons
                    name={lastOrdersCount === n ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={themeColors.primary.dark}
                  />
                  <Text style={styles.countLabel}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
    },
    optionBlock: {
      marginHorizontal: 20,
      marginTop: 16,
      padding: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    dateField: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dateFieldLabel: {
      fontSize: 12,
      color: colors.text.secondary,
    },
    dateFieldValue: {
      fontSize: 15,
      color: colors.text.primary,
      marginTop: 2,
    },
    hintBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    hintText: {
      fontSize: 11,
      color: colors.text.secondary,
      flex: 1,
    },
    countRow: {
      flexDirection: 'row',
      gap: 20,
      marginTop: 12,
    },
    countOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    countLabel: {
      fontSize: 14,
      color: colors.text.primary,
    },
    saveButton: {
      margin: 20,
      paddingVertical: 16,
      borderRadius: 8,
      backgroundColor: colors.primary.dark,
      alignItems: 'center',
    },
    saveButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
    },
  });

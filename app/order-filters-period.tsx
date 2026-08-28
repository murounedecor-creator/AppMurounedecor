import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrderFilters, PeriodPreset } from '@/contexts/OrderFiltersContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { subDays } from 'date-fns';

const PRESETS: { id: PeriodPreset; label: string; pro?: boolean }[] = [
  { id: 'todos', label: 'Todos', pro: true },
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: 'recentes', label: 'Recentes' },
  { id: 'esta_semana', label: 'Esta Semana' },
  { id: 'semana_passada', label: 'Semana Passada' },
  { id: 'este_mes', label: 'Este Mês' },
  { id: 'mes_passado', label: 'Mês Passado' },
  { id: '30dias', label: 'Últimos 30 dias' },
  { id: '60dias', label: 'Últimos 60 dias' },
  { id: 'futuros', label: 'Futuros' },
];

export default function OrderFiltersPeriodScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const { periodPreset, setPeriodPreset } = useOrderFilters();

  const rangeLabelFor = (id: PeriodPreset): string => {
    const today = new Date();
    const fmt = (d: Date) => format(d, 'dd/MM/yyyy');
    switch (id) {
      case 'todos': return 'Qualquer data';
      case 'hoje': return fmt(today);
      case 'ontem': return fmt(subDays(today, 1));
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Período</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.hintBox}>
        <Ionicons name="help-circle-outline" size={18} color={themeColors.text.secondary} />
        <Text style={styles.hintText}>Selecione o período ou toque em Personalizado</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => router.push('/order-filters-custom')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>Personalizado</Text>
            <Text style={styles.optionSubtitle}>
              {periodPreset === 'personalizado' || periodPreset === 'ultimos_pedidos'
                ? 'Definido'
                : 'Nenhum'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.text.light} />
        </TouchableOpacity>

        {PRESETS.map(preset => (
          <TouchableOpacity
            key={preset.id}
            style={styles.optionRow}
            onPress={() => {
              setPeriodPreset(preset.id);
              router.back();
            }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionTitle}>{preset.label}</Text>
              <Text style={styles.optionSubtitle}>{rangeLabelFor(preset.id)}</Text>
            </View>
            {preset.pro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    hintBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    hintText: {
      flex: 1,
      fontSize: 12,
      color: colors.text.secondary,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    optionTitle: {
      fontSize: 15,
      color: colors.text.primary,
    },
    optionSubtitle: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
    },
    proBadge: {
      borderWidth: 1,
      borderColor: colors.text.light,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    proBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.text.secondary,
    },
  });

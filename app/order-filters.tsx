import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useOrderFilters, STATUS_OPTIONS } from '@/contexts/OrderFiltersContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OrderFiltersScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const { getPeriodLabel, getDateRange, selectedStatuses, toggleStatus } =
    useOrderFilters();

  const range = getDateRange();
  const rangeText =
    range && range.start && range.end
      ? `${format(range.start, 'dd/MM/yyyy')} - ${format(range.end, 'dd/MM/yyyy')}`
      : range && range.start && !range.end
      ? `A partir de ${format(range.start, 'dd/MM/yyyy')}`
      : 'Qualquer data';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filtro</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={themeColors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.row} onPress={() => {}}>
          <Ionicons name="options-outline" size={20} color={themeColors.text.secondary} />
          <Text style={styles.rowLabel}>Personalizar Filtros</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.text.light} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Período</Text>
        <TouchableOpacity
          style={styles.periodRow}
          onPress={() => router.push('/order-filters-period')}>
          <View style={{ flex: 1 }}>
            <Text style={styles.periodTitle}>{getPeriodLabel()}</Text>
            <Text style={styles.periodSubtitle}>{rangeText}</Text>
          </View>
          <Ionicons name="calendar-outline" size={22} color={themeColors.primary.dark} />
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Status</Text>
        <View style={styles.statusWrap}>
          {STATUS_OPTIONS.map(status => {
            const active = selectedStatuses.includes(status.id);
            return (
              <TouchableOpacity
                key={status.id}
                style={[styles.statusPill, active && styles.statusPillActive]}
                onPress={() => toggleStatus(status.id)}>
                <Text
                  style={[styles.statusPillText, active && styles.statusPillTextActive]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => router.back()}>
        <Text style={styles.applyButtonText}>Aplicar Filtro</Text>
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
      fontFamily: 'Fraunces-Bold',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.text.primary,
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
      fontFamily: 'WorkSans-Bold',
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text.primary,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 4,
      fontFamily: 'WorkSans-Bold',
    },
    periodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginTop: 8,
      padding: 14,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
      fontFamily: 'WorkSans-SemiBold',
    },
    periodSubtitle: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 2,
      fontFamily: 'WorkSans-Regular',
    },
    statusWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingHorizontal: 20,
      marginTop: 8,
    },
    statusPill: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    statusPillActive: {
      backgroundColor: colors.primary.main,
      borderColor: colors.primary.dark,
    },
    statusPillText: {
      fontSize: 13,
      color: colors.text.primary,
    },
    statusPillTextActive: {
      color: colors.white,
      fontWeight: '600',
      fontFamily: 'WorkSans-SemiBold',
    },
    applyButton: {
      margin: 20,
      paddingVertical: 16,
      borderRadius: 8,
      backgroundColor: colors.primary.dark,
      alignItems: 'center',
    },
    applyButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
      fontFamily: 'WorkSans-Bold',
    },
  });

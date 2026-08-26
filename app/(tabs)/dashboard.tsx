import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Transaction } from '@/lib/supabase';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function Dashboard() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [customers, setCustomers] = useState<number>(0);
  const [products, setProducts] = useState<number>(0);
  const [services, setServices] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<{ status: string }[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [hideTotal, setHideTotal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [customerRes, productRes, serviceRes, transRes, ordersRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('services').select('id', { count: 'exact' }),
        supabase.from('transactions').select('*').gte('date', format(startOfMonth(currentDate), 'yyyy-MM-dd')).lte('date', format(endOfMonth(currentDate), 'yyyy-MM-dd')),
        supabase.from('orders').select('status'),
      ]);

      setCustomers(customerRes.count || 0);
      setProducts(productRes.count || 0);
      setServices(serviceRes.count || 0);
      setTransactions(transRes.data || []);
      setOrders(ordersRes.data || []);

      const total = (transRes.data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
      setMonthlyTotal(total);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, [currentDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const days = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    });
    const firstDayOfWeek = startOfMonth(currentDate).getDay(); // 0=Sun, 1=Mon...
    return { days, firstDayOfWeek };
  };

  const { days, firstDayOfWeek } = getDaysInMonth();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return themeColors.status.pending;
      case 'waiting_payment':
        return themeColors.status.waiting;
      case 'in_progress':
        return themeColors.status.inProgress;
      case 'completed':
        return themeColors.status.completed;
      case 'cancelled':
        return themeColors.status.cancelled;
      default:
        return themeColors.text.secondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'waiting_payment':
        return 'Aguardando Pagamento';
      case 'in_progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Muroune Decor</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </View>

      {/* Counter Cards */}
      <View style={styles.countersContainer}>
        <TouchableOpacity
          style={[styles.counterCard, styles.cardCustomers]}
          onPress={() => router.push('/(tabs)/customers')}>
          <Text style={styles.counterLabel}>Clientes</Text>
          <Text style={styles.counterValue}>{customers}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.counterCard, styles.cardServices]}
          onPress={() => router.push('/(tabs)/products')}>
          <Text style={styles.counterLabel}>Produtos</Text>
          <Text style={styles.counterValue}>{products}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.counterCard, styles.cardProducts]}
          onPress={() => router.push('/new-order')}>
          <Text style={styles.counterLabel}>Serviços</Text>
          <Text style={styles.counterValue}>{services}</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth}>
            <Text style={styles.navButton}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthYear}>
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </Text>
          <TouchableOpacity onPress={handleNextMonth}>
            <Text style={styles.navButton}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(day => (
            <Text key={day} style={styles.weekdayHeader}>
              {day}
            </Text>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}
          {days.map(day => (
            <View
              key={day.toString()}
              style={[
                styles.dayCell,
                !isSameMonth(day, currentDate) && styles.dayOutOfMonth,
              ]}>
              <Text style={styles.dayNumber}>{format(day, 'd')}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Monthly Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Resumo Financeiro do Mês</Text>
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>Total do Mês</Text>
            <TouchableOpacity onPress={() => setHideTotal(!hideTotal)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {hideTotal ? (
                <EyeOff size={20} color={themeColors.white} />
              ) : (
                <Eye size={20} color={themeColors.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.totalValue}>
            {hideTotal ? 'R$ ••••' : `R$ ${monthlyTotal.toFixed(2).replace('.', ',')}`}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <Text style={styles.actionsTitle}>Ações Rápidas</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/new-order')}>
            <Text style={styles.actionText}>Novo Pedido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/customers')}>
            <Text style={styles.actionText}>Clientes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/financials')}>
            <Text style={styles.actionText}>Financeiro</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/agenda')}>
            <Text style={styles.actionText}>Agenda</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>

    {/* FAB */}
    <TouchableOpacity
      style={[styles.fab, { bottom: 80 + insets.bottom }]}
      onPress={() => router.push('/new-order')}>
      <Ionicons name="add" size={28} color={themeColors.white} />
    </TouchableOpacity>
      <Text style={styles.buildLabel}>Build 2026-08-15-A</Text>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.primary.main,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    marginTop: 4,
    opacity: 0.9,
  },
  countersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  counterCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCustomers: {
    backgroundColor: '#FFF3E0',
  },
  cardServices: {
    backgroundColor: '#E3F2FD',
  },
  cardProducts: {
    backgroundColor: '#F3E5F5',
  },
  counterLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.dark,
    marginTop: 4,
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textTransform: 'capitalize',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  weekdayHeader: {
    width: 40,
    height: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
    lineHeight: 32,
  },
  dayCell: {
    width: 40,
    height: 40,
    minWidth: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary.main,
    margin: 2,
    marginBottom: 4,
    overflow: 'visible',
  },
  dayOutOfMonth: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    minWidth: 24,
  },
  summaryContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  totalCard: {
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginTop: 4,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    flex: 1,
  },
  statusCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  actionsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  buildLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.text.disabled,
    paddingVertical: 4,
    paddingBottom: 12,
  },
});

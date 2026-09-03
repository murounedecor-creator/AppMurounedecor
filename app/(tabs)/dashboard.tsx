import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { lightColors, withOpacity } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Transaction } from '@/lib/supabase';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MetallicButton from '@/components/MetallicButton';

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
      <LinearGradient
        colors={[themeColors.primary.main, themeColors.primary.light, themeColors.primary.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Muroune Decor</Text>
        <Text style={styles.subtitle}>Dashboard</Text>
      </LinearGradient>

      {/* Counter Cards */}
      <View style={styles.countersContainer}>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/customers')}>
          <LinearGradient
            colors={['#FFF3E0', '#FFE0B2', '#FFCC80']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.counterCard, styles.cardCustomers]}>
            <Text style={styles.counterLabel}>Clientes</Text>
            <Text style={styles.counterValue}>{customers}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/products')}>
          <LinearGradient
            colors={['#E3F2FD', '#BBDEFB', '#90CAF9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.counterCard, styles.cardServices]}>
            <Text style={styles.counterLabel}>Produtos</Text>
            <Text style={styles.counterValue}>{products}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/new-order')}>
          <LinearGradient
            colors={['#F3E5F5', '#E1BEE7', '#CE93D8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.counterCard, styles.cardProducts]}>
            <Text style={styles.counterLabel}>Serviços</Text>
            <Text style={styles.counterValue}>{services}</Text>
          </LinearGradient>
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
            <View key={`empty-${i}`} style={styles.dayCellEmpty} />
          ))}
          {days.map(day => (
            <View
              key={day.toString()}
              style={[
                styles.dayCell,
                !isSameMonth(day, currentDate) && styles.dayOutOfMonth,
              ]}>
              <View style={styles.dayCellShine} />
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
    <MetallicButton
      circular
      icon={<Ionicons name="add" size={28} color={themeColors.white} />}
      onPress={() => router.push('/new-order')}
      style={[styles.fab, { bottom: 80 + insets.bottom }]}
    />
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
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    marginTop: 4,
    opacity: 0.9,
    fontFamily: 'WorkSans-Medium',
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
    borderWidth: 1,
    borderColor: withOpacity(lightColors.primary.light, 0.5),
    overflow: 'hidden',
  },
  cardCustomers: {},
  cardServices: {},
  cardProducts: {},
  counterLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    fontFamily: 'WorkSans-SemiBold',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary.dark,
    marginTop: 4,
    fontFamily: 'Fraunces-Bold',
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
    fontFamily: 'Fraunces-SemiBold',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  weekdayHeader: {
    width: '14.28%',
    height: 32,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
    lineHeight: 32,
    fontFamily: 'WorkSans-SemiBold',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.primary.main,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withOpacity(lightColors.primary.light, 0.5),
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 40,
    marginBottom: 4,
  },
  dayOutOfMonth: {
    opacity: 0.3,
  },
  dayCellShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: withOpacity(lightColors.primary.light, 0.6),
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
    minWidth: 24,
    fontFamily: 'WorkSans-SemiBold',
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
    fontFamily: 'Fraunces-Bold',
  },
  totalCard: {
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: withOpacity(lightColors.primary.light, 0.5),
    overflow: 'hidden',
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
    fontFamily: 'WorkSans-SemiBold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    marginTop: 4,
    fontFamily: 'Fraunces-Bold',
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
    fontFamily: 'WorkSans-SemiBold',
  },
  statusCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Fraunces-Bold',
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
    fontFamily: 'Fraunces-Bold',
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
    borderWidth: 1,
    borderColor: withOpacity(lightColors.primary.light, 0.5),
    overflow: 'hidden',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    fontFamily: 'WorkSans-Bold',
  },
  buildLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: colors.text.disabled,
    paddingVertical: 4,
    paddingBottom: 12,
  },
});

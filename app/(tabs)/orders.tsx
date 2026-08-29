import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrderFilters } from '@/contexts/OrderFiltersContext';

type Order = {
  id: string;
  number: string;
  customer_id: string;
  status: string;
  order_date: string;
  total: number;
  customer: { name: string } | null;
};

export default function OrdersScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const { periodPreset, getDateRange, selectedStatuses, lastOrdersCount, toggleStatus } =
    useOrderFilters();

  useEffect(() => {
    if (params.filtroStatus) {
      toggleStatus(params.filtroStatus as string);
    }
  }, [params.filtroStatus]);

  useEffect(() => {
    applyFilters();
  }, [searchText, orders, periodPreset, selectedStatuses, lastOrdersCount]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          number,
          customer_id,
          status,
          order_date,
          total,
          customer:customers(name)
        `)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as Order[]) || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const applyFilters = () => {
    let result = orders;

    // Filtro de busca
    if (searchText) {
      result = result.filter(
        o =>
          o.number.toLowerCase().includes(searchText.toLowerCase()) ||
          o.customer?.name?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtro de status (multi-seleção — vazio significa "todos")
    if (selectedStatuses.length > 0) {
      result = result.filter(o => selectedStatuses.includes(o.status));
    }

    // Filtro de período
    if (periodPreset === 'ultimos_pedidos') {
      result = result.slice(0, lastOrdersCount);
    } else {
      const range = getDateRange();
      if (range) {
        result = result.filter(o => {
          const orderDate = parseISO(o.order_date);
          if (range.start && range.end) {
            return isWithinInterval(orderDate, {
              start: startOfDay(range.start),
              end: endOfDay(range.end),
            });
          }
          if (range.start && !range.end) {
            return orderDate >= startOfDay(range.start);
          }
          return true;
        });
      }
    }

    setFiltered(result);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return themeColors.status.pending;
      case 'awaiting_payment':
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
      case 'awaiting_payment':
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
      <LinearGradient
        colors={[themeColors.primary.light, themeColors.primary.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Pedidos</Text>
      </LinearGradient>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={themeColors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número ou cliente..."
          placeholderTextColor={themeColors.text.disabled}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Botão único de Filtro */}
      <TouchableOpacity
        style={styles.filterTriggerButton}
        onPress={() => router.push('/order-filters')}>
        <Ionicons name="filter" size={18} color={themeColors.primary.dark} />
        <Text style={styles.filterTriggerText}>Filtro</Text>
        {selectedStatuses.length > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{selectedStatuses.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Lista de Pedidos */}
      <FlatList
        style={{ flex: 1 }}
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => router.push(`/order/${item.id}`)}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>Pedido {item.number}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) },
                ]}>
                <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>

            <Text style={styles.customerName}>{item.customer?.name || 'Cliente removido'}</Text>

            <View style={styles.orderDetails}>
              <Text style={styles.detailText}>
                {format(parseISO(item.order_date), 'dd/MM/yyyy', { locale: ptBR })}
              </Text>
              <Text style={styles.totalText}>
                R$ {item.total?.toFixed(2).replace('.', ',') || '0,00'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {loading ? 'Carregando...' : 'Nenhum pedido encontrado'}
          </Text>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Novo Pedido */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/new-order')}>
        <LinearGradient
          colors={[themeColors.primary.main, themeColors.primary.dark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={themeColors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'WorkSans-Regular',
  },
  filterWrapper: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statusFilterWrapper: {
    height: 48,
    overflow: 'hidden',
  },
  statusFilterContainer: {
    paddingHorizontal: 20,
  },
  statusFilterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterContainer: {
    paddingHorizontal: 20,
  },
  filterScroll: {
    gap: 8,
    alignItems: 'center',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'WorkSans-SemiBold',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  filterTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  filterTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'WorkSans-SemiBold',
  },
  filterBadge: {
    backgroundColor: colors.primary.dark,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'WorkSans-Bold',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'Fraunces-Bold',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'WorkSans-SemiBold',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
    fontFamily: 'WorkSans-SemiBold',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'WorkSans-Regular',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.dark,
    fontFamily: 'Fraunces-Bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: colors.text.disabled,
    fontFamily: 'WorkSans-Regular',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
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
});

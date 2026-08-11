import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { deleteOrderCascade } from '@/lib/orders';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'last', label: 'Últimos' },
    { id: '30days', label: '30 dias' },
    { id: '60days', label: '60 dias' },
    { id: 'completed', label: 'Concluídos' },
  ];

  useEffect(() => {
    if (params.filtroStatus) {
      setActiveFilter(params.filtroStatus as string);
    }
  }, [params.filtroStatus]);

  useEffect(() => {
    applyFilters();
  }, [searchText, activeFilter, orders]);

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

    // Filtro de período
    const today = new Date();
    switch (activeFilter) {
      case 'last':
        result = result.slice(0, 10);
        break;
      case '30days':
        result = result.filter(
          o =>
            parseISO(o.order_date) >= subDays(today, 30)
        );
        break;
      case '60days':
        result = result.filter(
          o =>
            parseISO(o.order_date) >= subDays(today, 60)
        );
        break;
      case 'completed':
        result = result.filter(o => o.status === 'completed');
        break;
    }

    setFiltered(result);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.status.pending;
      case 'awaiting_payment':
      case 'waiting_payment':
        return colors.status.waiting;
      case 'in_progress':
        return colors.status.inProgress;
      case 'completed':
        return colors.status.completed;
      case 'cancelled':
        return colors.status.cancelled;
      default:
        return colors.text.secondary;
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

  const handleDeleteOrder = (orderId: string) => {
    Alert.alert(
      'Excluir Pedido',
      'Tem certeza que deseja excluir este pedido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOrderCascade(orderId);
              setOrders(prev => prev.filter(o => o.id !== orderId));
              Alert.alert('Sucesso', 'Pedido excluído com sucesso!');
            } catch (error) {
              console.error('Erro ao excluir pedido:', error);
              Alert.alert('Erro', 'Não foi possível excluir o pedido.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Pedidos</Text>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por número ou cliente..."
          placeholderTextColor={colors.text.disabled}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={styles.filterContainer}>
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              activeFilter === filter.id && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(filter.id)}>
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === filter.id && styles.filterButtonTextActive,
              ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de Pedidos */}
      <FlatList
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

            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/new-order?pedidoId=${item.id}&modo=edicao`)}>
                <Ionicons name="pencil-outline" size={16} color="#C9A96E" />
                <Text style={styles.actionBtnEditText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteOrder(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#FF4444" />
                <Text style={styles.actionBtnDeleteText}>Excluir</Text>
              </TouchableOpacity>
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
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.primary.main,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
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
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  filterScroll: {
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 100,
    paddingRight: 76,
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
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnEditText: {
    color: '#C9A96E',
    fontSize: 14,
    fontWeight: '600',
  },
  actionBtnDeleteText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: colors.text.disabled,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
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
});

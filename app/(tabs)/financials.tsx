import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Transaction, Customer } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isBefore,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SubTab = 'payments' | 'cashflow' | 'profit';
type PaymentFilter = 'overdue' | 'pending' | 'received';
type CashflowFilter = 'all' | 'revenue' | 'expense';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  waiting_payment: 'Aguardando',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};
const STATUS_COLOR: Record<string, string> = {
  pending: lightColors.status.pending,
  waiting_payment: lightColors.status.waiting,
  in_progress: lightColors.status.inProgress,
  completed: lightColors.status.completed,
  cancelled: lightColors.status.cancelled,
};

export default function FinancialsScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<SubTab>('payments');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('overdue');
  const [cashflowFilter, setCashflowFilter] = useState<CashflowFilter>('all');
  const [detailVisible, setDetailVisible] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [profitHidden, setProfitHidden] = useState(true);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profitSettings, setProfitSettings] = useState({
    includeProductCost: true,
    includeExpenses: true,
  });
  const [productCostTotal, setProductCostTotal] = useState(0);
  const [operationalExpenses, setOperationalExpenses] = useState(0);

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('id, name, phone, email, cpf_cnpj, address, city, state, zipcode, notes, created_at, updated_at');
    if (data) setCustomers(data as Customer[]);
  };

  const loadTransactions = useCallback(async () => {
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .or(`and(date.gte.${monthStart},date.lte.${monthEnd}),and(due_date.gte.${monthStart},due_date.lte.${monthEnd})`)
      .order('date', { ascending: false });
    if (data) setTransactions(data as Transaction[]);
  }, [currentMonth]);

  const loadProfitData = useCallback(async () => {
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    // Busca TODAS as transações de receita vinculadas a pedidos (não só do mês)
    // para determinar qual foi a PRIMEIRA parcela de cada pedido
    const { data: allRevenueTx } = await supabase
      .from('transactions')
      .select('order_id, date, due_date')
      .eq('category', 'order_revenue')
      .not('order_id', 'is', null);

    // Agrupa por order_id e encontra a data mais antiga de cada pedido
    const earliestByOrder: Record<string, string> = {};
    for (const t of (allRevenueTx || [])) {
      const d = t.due_date || t.date;
      if (!earliestByOrder[t.order_id] || d < earliestByOrder[t.order_id]) {
        earliestByOrder[t.order_id] = d;
      }
    }

    // Só conta o custo de pedidos cuja PRIMEIRA parcela cai no mês selecionado
    const orderIds = Object.entries(earliestByOrder)
      .filter(([, earliestDate]) => earliestDate >= monthStart && earliestDate <= monthEnd)
      .map(([orderId]) => orderId);

    let prodCost = 0;
    let opExpenses = 0;

    if (orderIds.length > 0) {
      const { data: products } = await supabase
        .from('order_items_products')
        .select('valor_custo, quantity')
        .in('order_id', orderIds);
      prodCost = (products || []).reduce(
        (sum, p) => sum + (Number(p.valor_custo || 0) * Number(p.quantity || 0)),
        0
      );

      const { data: expenses } = await supabase
        .from('order_expenses')
        .select('value')
        .in('order_id', orderIds);
      opExpenses = (expenses || []).reduce(
        (sum, e) => sum + Number(e.value || 0),
        0
      );
    }

    setProductCostTotal(prodCost);
    setOperationalExpenses(opExpenses);
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
      loadProfitData();
    }, [loadTransactions, loadProfitData])
  );

  useEffect(() => {
    AsyncStorage.getItem('@muroune:profit_settings').then(saved => {
      if (saved) {
        try {
          setProfitSettings(JSON.parse(saved));
        } catch {}
      }
    });
  }, []);

  const today = new Date();

  const customerName = (id: string) =>
    customers.find(c => c.id === id)?.name || '-';

  const fmt = (v: number) =>
    `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;

  // ─── PAYMENTS ───────────────────────────────────────────────────────────────
  const revenues = transactions.filter(t => t.type === 'revenue');
  const overdue = revenues.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled' &&
      t.due_date && isBefore(parseISO(t.due_date), today)
  );
  const toReceive = revenues.filter(
    t => t.status !== 'completed' && t.status !== 'cancelled' &&
      (!t.due_date || !isBefore(parseISO(t.due_date), today))
  );
  const received = revenues.filter(t => t.status === 'completed');

  const paymentList = paymentFilter === 'overdue' ? overdue
    : paymentFilter === 'pending' ? toReceive
    : received;

  const markReceived = async (t: Transaction) => {
    Alert.alert('Confirmar', 'Marcar como recebido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Receber',
        onPress: async () => {
          await supabase.from('transactions')
            .update({ status: 'completed', amount_received: t.amount })
            .eq('id', t.id);
          setDetailVisible(false);
          setSelected(null);
          loadTransactions();
        },
      },
    ]);
  };

  // ─── CASHFLOW ────────────────────────────────────────────────────────────────
  const totalRevenue = revenues
    .filter(t => t.status === 'completed')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const cashflowList = transactions
    .filter(t =>
      cashflowFilter === 'revenue' ? t.type === 'revenue'
      : cashflowFilter === 'expense' ? t.type === 'expense'
      : true
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ─── PROFIT ──────────────────────────────────────────────────────────────────
  const netProfit =
    totalRevenue
    - (profitSettings.includeProductCost ? productCostTotal : 0)
    - (profitSettings.includeExpenses ? operationalExpenses : 0);

  const barTotal = Math.max(totalRevenue + (productCostTotal + operationalExpenses), 1);
  const revenueBarPct = Math.max(Math.min((totalRevenue / barTotal) * 100, 100), 0);
  const expenseBarPct = Math.max(Math.min(((productCostTotal + operationalExpenses) / barTotal) * 100, 100), 0);

  // ─── RENDER HELPERS ──────────────────────────────────────────────────────────
  const renderPaymentCard = (t: Transaction) => {
    const pending = Number(t.amount || 0) - Number(t.amount_received || 0);
    return (
      <TouchableOpacity
        key={t.id}
        style={styles.card}
        onPress={() => { setSelected(t); setDetailVisible(true); }}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardDate}>{format(new Date(t.date), 'dd/MM')}</Text>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[t.status] || themeColors.text.disabled }]} />
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.cardCondition}>{t.payment_condition || 'À vista'}</Text>
          <Text style={styles.cardCustomer}>{customerName(t.customer_id)}</Text>
          {t.due_date ? (
            <Text style={styles.cardDue}>Venc: {format(new Date(t.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</Text>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.pendingAmount}>{fmt(pending)}</Text>
          {Number(t.amount_received || 0) > 0 && (
            <Text style={styles.receivedAmount}>Rec: {fmt(Number(t.amount_received))}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCashflowCard = (t: Transaction) => (
    <View key={t.id} style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardDate}>{format(new Date(t.date), 'dd/MM')}</Text>
        <Ionicons
          name={t.type === 'revenue' ? 'trending-up' : 'trending-down'}
          size={14}
          color={t.type === 'revenue' ? themeColors.revenue : themeColors.expense}
        />
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardCondition}>{t.payment_condition || t.description || '-'}</Text>
        <Text style={styles.cardCustomer}>{customerName(t.customer_id)}</Text>
        {t.order_id ? <Text style={styles.cardTag}>Pedido vinculado</Text> : null}
        {t.category ? <Text style={styles.cardTag}>{t.category.replace(/_/g, ' ')}</Text> : null}
      </View>
      <Text style={[styles.cashflowAmt, { color: t.type === 'revenue' ? themeColors.revenue : themeColors.expense }]}>
        {t.type === 'revenue' ? '+' : '-'}{fmt(Number(t.amount))}
      </Text>
    </View>
  );

  // ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
  const renderDetail = () => {
    if (!selected) return null;
    const pending = Number(selected.amount || 0) - Number(selected.amount_received || 0);
    return (
      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Detalhes do Pagamento</Text>
              <TouchableOpacity onPress={() => { setDetailVisible(false); setSelected(null); }}>
                <Ionicons name="close" size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            {[
              ['Status', <View style={[styles.badge, { backgroundColor: STATUS_COLOR[selected.status] }]}><Text style={styles.badgeText}>{STATUS_LABEL[selected.status]}</Text></View>],
              ['Cliente', customerName(selected.customer_id)],
              ['Condição', selected.payment_condition || 'À vista'],
              ['Data', format(new Date(selected.date), 'dd/MM/yyyy')],
              selected.due_date ? ['Vencimento', format(new Date(selected.due_date + 'T00:00:00'), 'dd/MM/yyyy')] : null,
              ['Valor Total', fmt(Number(selected.amount))],
              ['Valor Recebido', fmt(Number(selected.amount_received || 0))],
              ['Valor Pendente', fmt(pending)],
              selected.description ? ['Descrição', selected.description] : null,
            ].filter(Boolean).map((row, i) => {
              const [label, value] = row as [string, any];
              return (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{label}</Text>
                  {typeof value === 'string' ? (
                    <Text style={styles.detailValue}>{value}</Text>
                  ) : value}
                </View>
              );
            })}

            {selected.status !== 'completed' && selected.status !== 'cancelled' && (
              <TouchableOpacity style={styles.receiveBtn} onPress={() => markReceived(selected)}>
                <Ionicons name="checkmark-circle" size={20} color={themeColors.white} />
                <Text style={styles.receiveBtnText}>Marcar como Recebido</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ─── PROFIT SETTINGS MODAL ───────────────────────────────────────────────────
  const renderProfitSettings = () => (
    <Modal visible={settingsVisible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Definições de Lucro</Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.settingsDesc}>Selecione o que entra no cálculo do Lucro Real</Text>
          {[
            { key: 'includeProductCost' as const, label: 'Descontar Custo de Produtos' },
            { key: 'includeExpenses' as const, label: 'Descontar Despesas Operacionais' },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.settingsRow}
              onPress={() => setProfitSettings(s => ({ ...s, [item.key]: !s[item.key] }))}>
              <Ionicons
                name={profitSettings[item.key] ? 'checkbox' : 'square-outline'}
                size={22}
                color={themeColors.primary.dark}
              />
              <Text style={styles.settingsLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={() => {
            AsyncStorage.setItem('@muroune:profit_settings', JSON.stringify(profitSettings));
            setSettingsVisible(false);
          }}>
            <Text style={styles.saveBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ─── TABS ────────────────────────────────────────────────────────────────────
  const renderPaymentsTab = () => (
    <>
      <View style={styles.subTabBar}>
        {([
          { key: 'overdue' as PaymentFilter, label: `Atraso (${overdue.length})` },
          { key: 'pending' as PaymentFilter, label: `A receber (${toReceive.length})` },
          { key: 'received' as PaymentFilter, label: `Recebido (${received.length})` },
        ] as { key: PaymentFilter; label: string }[]).map(st => (
          <TouchableOpacity
            key={st.key}
            style={[styles.subTab, paymentFilter === st.key && styles.subTabActive]}
            onPress={() => setPaymentFilter(st.key)}>
            <Text style={[styles.subTabText, paymentFilter === st.key && styles.subTabTextActive]}>
              {st.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {paymentList.length === 0
          ? <Text style={styles.emptyText}>Nenhum registro</Text>
          : paymentList.map(renderPaymentCard)}
        <View style={{ height: 30 }} />
      </ScrollView>
    </>
  );

  const renderCashflowTab = () => (
    <>
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, { borderLeftColor: themeColors.revenue }]}>
          <Ionicons name="trending-up" size={18} color={themeColors.revenue} />
          <Text style={styles.summaryLabel}>Receitas</Text>
          <Text style={[styles.summaryValue, { color: themeColors.revenue }]}>{fmt(totalRevenue)}</Text>
        </View>
        <View style={[styles.summaryCard, { borderLeftColor: themeColors.expense }]}>
          <Ionicons name="trending-down" size={18} color={themeColors.expense} />
          <Text style={styles.summaryLabel}>Despesas</Text>
          <Text style={[styles.summaryValue, { color: themeColors.expense }]}>{fmt(totalExpense)}</Text>
        </View>
      </View>
      <View style={styles.filterRow}>
        {([
          { key: 'all' as CashflowFilter, label: 'Todos' },
          { key: 'revenue' as CashflowFilter, label: 'Receitas' },
          { key: 'expense' as CashflowFilter, label: 'Despesas' },
        ] as { key: CashflowFilter; label: string }[]).map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, cashflowFilter === f.key && styles.filterChipActive]}
            onPress={() => setCashflowFilter(f.key)}>
            <Text style={[styles.filterChipText, cashflowFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {cashflowList.length === 0
          ? <Text style={styles.emptyText}>Nenhum lançamento</Text>
          : cashflowList.map(renderCashflowCard)}
        <View style={{ height: 30 }} />
      </ScrollView>
    </>
  );

  const renderProfitTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Net Profit Card */}
      <View style={styles.profitCard}>
        <View style={styles.profitCardTop}>
          <Text style={styles.profitCardLabel}>Lucro Líquido</Text>
          <TouchableOpacity onPress={() => setProfitHidden(!profitHidden)}>
            <Ionicons
              name={profitHidden ? 'eye-off' : 'eye'}
              size={22}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.profitValue, { color: netProfit >= 0 ? themeColors.revenue : themeColors.expense }]}>
          {profitHidden ? 'R$ •••••' : fmt(netProfit)}
        </Text>

        {/* Bar */}
        <View style={styles.profitBar}>
          <View style={[styles.profitBarGreen, { width: `${revenueBarPct}%` }]} />
          <View style={[styles.profitBarRed, { width: `${expenseBarPct}%` }]} />
        </View>
        <View style={styles.barLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: themeColors.revenue }]} />
            <Text style={styles.legendText}>Receitas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: themeColors.expense }]} />
            <Text style={styles.legendText}>Custos/Despesas</Text>
          </View>
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Detalhamento do Mês</Text>

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <Ionicons name="trending-up" size={16} color={themeColors.revenue} />
            <Text style={styles.breakdownLabel}>Receitas</Text>
          </View>
          <Text style={[styles.breakdownAmt, { color: themeColors.revenue }]}>{fmt(totalRevenue)}</Text>
        </View>

        {profitSettings.includeProductCost && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Ionicons name="cube" size={16} color={themeColors.expense} />
              <Text style={styles.breakdownLabel}>Custo de Produtos</Text>
            </View>
            <Text style={[styles.breakdownAmt, { color: themeColors.expense }]}>-{fmt(productCostTotal)}</Text>
          </View>
        )}

        {profitSettings.includeExpenses && (
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLeft}>
              <Ionicons name="trending-down" size={16} color={themeColors.expense} />
              <Text style={styles.breakdownLabel}>Despesas Operacionais</Text>
            </View>
            <Text style={[styles.breakdownAmt, { color: themeColors.expense }]}>-{fmt(operationalExpenses)}</Text>
          </View>
        )}

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownRow}>
          <View style={styles.breakdownLeft}>
            <Ionicons name="calculator" size={16} color={netProfit >= 0 ? themeColors.revenue : themeColors.expense} />
            <Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>Lucro Real</Text>
          </View>
          <Text style={[
            styles.breakdownAmt,
            { fontWeight: '700', color: netProfit >= 0 ? themeColors.revenue : themeColors.expense },
          ]}>
            {profitHidden ? '•••••' : fmt(netProfit)}
          </Text>
        </View>
      </View>

      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsVisible(true)}>
        <Ionicons name="settings-outline" size={18} color={themeColors.primary.dark} />
        <Text style={styles.settingsBtnText}>Definições de Lucro</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[themeColors.primary.light, themeColors.primary.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Financeiro</Text>
      </LinearGradient>

      {/* Main Tabs */}
      <View style={styles.mainTabBar}>
        {([
          { key: 'payments' as SubTab, label: 'Pagamentos' },
          { key: 'cashflow' as SubTab, label: 'Fluxo de Caixa' },
          { key: 'profit' as SubTab, label: 'Lucro' },
        ] as { key: SubTab; label: string }[]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.mainTab, subTab === tab.key && styles.mainTabActive]}
            onPress={() => setSubTab(tab.key)}>
            <Text style={[styles.mainTabText, subTab === tab.key && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={themeColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </Text>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={themeColors.text.primary} />
        </TouchableOpacity>
      </View>

      {subTab === 'payments' && renderPaymentsTab()}
      {subTab === 'cashflow' && renderCashflowTab()}
      {subTab === 'profit' && renderProfitTab()}

      {renderDetail()}
      {renderProfitSettings()}
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.white, fontFamily: 'Fraunces-Bold' },

  // Main tab bar
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mainTab: {
    flex: 1,
    flexShrink: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabActive: { borderBottomColor: colors.primary.dark },
  mainTabText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, flexShrink: 1, flexWrap: 'wrap', textAlign: 'center', fontFamily: 'WorkSans-SemiBold' },
  mainTabTextActive: { color: colors.primary.dark, fontFamily: 'WorkSans-Bold' },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 16,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'capitalize',
    minWidth: 160,
    textAlign: 'center',
    fontFamily: 'Fraunces-SemiBold',
  },

  tabContent: { flex: 1, paddingHorizontal: 16 },

  // Sub-tabs (Payments)
  subTabBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  subTab: {
    flex: 1,
    flexShrink: 1,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  subTabActive: { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark },
  subTabText: { fontSize: 11, fontWeight: '600', color: colors.text.secondary, flexShrink: 1, flexWrap: 'wrap', textAlign: 'center', fontFamily: 'WorkSans-SemiBold' },
  subTabTextActive: { color: colors.white, fontFamily: 'WorkSans-Bold' },

  // Cards
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginTop: 8,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cardLeft: { width: 48, alignItems: 'center', gap: 4 },
  cardDate: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, fontFamily: 'WorkSans-SemiBold' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardCenter: { flex: 1, marginHorizontal: 8 },
  cardCondition: { fontSize: 13, fontWeight: '600', color: colors.text.primary, fontFamily: 'WorkSans-SemiBold' },
  cardCustomer: { fontSize: 12, color: colors.text.secondary, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  cardDue: { fontSize: 11, color: colors.warning, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  cardTag: { fontSize: 10, color: colors.text.light, marginTop: 2, textTransform: 'capitalize', fontFamily: 'WorkSans-Regular' },
  cardRight: { alignItems: 'flex-end' },
  pendingAmount: { fontSize: 14, fontWeight: '700', color: colors.text.primary, fontFamily: 'WorkSans-Bold' },
  receivedAmount: { fontSize: 11, color: colors.revenue, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  cashflowAmt: { fontSize: 14, fontWeight: '700', fontFamily: 'WorkSans-Bold' },

  // Cashflow summary
  summaryCards: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    gap: 4,
  },
  summaryLabel: { fontSize: 11, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
  summaryValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Fraunces-Bold' },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, flexShrink: 1, flexWrap: 'wrap', fontFamily: 'WorkSans-SemiBold' },
  filterChipTextActive: { color: colors.white, fontFamily: 'WorkSans-Bold' },

  // Profit
  profitCard: {
    backgroundColor: colors.white,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profitCardLabel: { fontSize: 14, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
  profitValue: { fontSize: 32, fontWeight: '700', marginTop: 8, fontFamily: 'Fraunces-Bold' },
  profitBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    marginTop: 16,
  },
  profitBarGreen: { backgroundColor: colors.revenue },
  profitBarRed: { backgroundColor: colors.expense },
  barLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },

  breakdownCard: {
    backgroundColor: colors.white,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: colors.text.primary, marginBottom: 12, fontFamily: 'Fraunces-Bold' },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  breakdownLabel: { fontSize: 14, color: colors.text.primary, fontFamily: 'WorkSans-Regular' },
  breakdownAmt: { fontSize: 14, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
  breakdownDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary.dark, fontFamily: 'WorkSans-SemiBold' },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Fraunces-Bold' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 13, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
  detailValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary, maxWidth: '60%', textAlign: 'right', fontFamily: 'WorkSans-SemiBold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600', color: colors.white, fontFamily: 'WorkSans-SemiBold' },
  receiveBtn: {
    flexDirection: 'row',
    backgroundColor: colors.revenue,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  receiveBtnText: { color: colors.white, fontSize: 15, fontWeight: '700', fontFamily: 'WorkSans-Bold' },

  settingsDesc: { fontSize: 13, color: colors.text.secondary, marginBottom: 16, fontFamily: 'WorkSans-Regular' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingsLabel: { fontSize: 15, color: colors.text.primary, fontFamily: 'WorkSans-Regular' },
  saveBtn: {
    backgroundColor: colors.primary.dark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', fontFamily: 'WorkSans-Bold' },

  emptyText: { textAlign: 'center', color: colors.text.disabled, marginTop: 30, fontFamily: 'WorkSans-Regular' },
});

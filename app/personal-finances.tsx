import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EXPENSE_CATEGORIES = [
  'Moradia',
  'Mercado',
  'Transporte',
  'Saúde',
  'Lazer',
  'Educação',
  'Contas/Assinaturas',
  'Outros',
];

const INCOME_CATEGORIES = ['Salário', 'Renda Extra', 'Outros'];

interface PersonalTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
  transaction_date: string;
}

export default function PersonalFinancesScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('personal_transactions')
        .select('*')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd)
        .order('transaction_date', { ascending: false });
      if (error) throw error;
      setTransactions((data || []) as PersonalTransaction[]);
    } catch (e: any) {
      console.error('Erro ao carregar finanças pessoais:', e);
      Alert.alert('Erro', `Não foi possível carregar os lançamentos: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [loadTransactions])
  );

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const formatMoney = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

  const openNewModal = (type: 'income' | 'expense') => {
    setForm({
      type,
      category: type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0],
      description: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    const amountValue = parseFloat(String(form.amount || '0').replace(',', '.'));
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('personal_transactions').insert([
        {
          type: form.type,
          category: form.category,
          description: form.description || null,
          amount: amountValue,
          transaction_date: form.date,
        },
      ]);
      if (error) throw error;
      setModalVisible(false);
      loadTransactions();
    } catch (e: any) {
      console.error('Erro ao salvar lançamento pessoal:', e);
      Alert.alert('Erro', `Não foi possível salvar: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Excluir lançamento', 'Deseja excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('personal_transactions').delete().eq('id', id);
            if (error) throw error;
            loadTransactions();
          } catch (e: any) {
            console.error('Erro ao excluir lançamento pessoal:', e);
            Alert.alert('Erro', `Não foi possível excluir: ${e?.message || 'erro desconhecido'}`);
          }
        },
      },
    ]);
  };

  const categories = form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[themeColors.primary.light, themeColors.primary.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={themeColors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Finanças Pessoais</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <Ionicons name="chevron-back" size={22} color={themeColors.primary.dark} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <Ionicons name="chevron-forward" size={22} color={themeColors.primary.dark} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={themeColors.primary.main} style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.summaryLabel}>Receitas</Text>
                <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>
                  {formatMoney(totalIncome)}
                </Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={[styles.summaryValue, { color: '#C62828' }]}>
                  {formatMoney(totalExpense)}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.balanceCard,
                { backgroundColor: balance >= 0 ? '#E8F5E9' : '#FFEBEE' },
              ]}>
              <Text style={styles.summaryLabel}>Saldo do mês</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: balance >= 0 ? '#2E7D32' : '#C62828' },
                ]}>
                {formatMoney(balance)}
              </Text>
            </View>

            {sortedCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Gastos por categoria</Text>
                {sortedCategories.map(([category, total]) => (
                  <View key={category} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{category}</Text>
                    <Text style={styles.categoryValue}>{formatMoney(total)}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lançamentos do mês</Text>
              {transactions.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum lançamento neste mês</Text>
              ) : (
                transactions.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.transactionCard}
                    onLongPress={() => handleDelete(t.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transactionCategory}>{t.category}</Text>
                      {t.description ? (
                        <Text style={styles.transactionDescription}>{t.description}</Text>
                      ) : null}
                      <Text style={styles.transactionDate}>
                        {format(new Date(t.transaction_date + 'T00:00:00'), "dd 'de' MMMM", {
                          locale: ptBR,
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: t.type === 'income' ? '#2E7D32' : '#C62828' },
                      ]}>
                      {t.type === 'income' ? '+' : '-'} {formatMoney(Number(t.amount))}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
              {transactions.length > 0 && (
                <Text style={styles.hintText}>Toque e segure num lançamento para excluir</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: '#2E7D32' }]}
          onPress={() => openNewModal('income')}>
          <Ionicons name="add" size={18} color={themeColors.white} />
          <Text style={styles.fabButtonText}>Receita</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabButton, { backgroundColor: '#C62828' }]}
          onPress={() => openNewModal('expense')}>
          <Ionicons name="add" size={18} color={themeColors.white} />
          <Text style={styles.fabButtonText}>Despesa</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Nova {form.type === 'income' ? 'Receita' : 'Despesa'}
            </Text>

            <Text style={styles.fieldLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    form.category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setForm({ ...form, category: cat })}>
                  <Text
                    style={[
                      styles.categoryChipText,
                      form.category === cat && styles.categoryChipTextActive,
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={themeColors.text.secondary}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={text => setForm({ ...form, amount: text })}
            />

            <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Supermercado do mês"
              placeholderTextColor={themeColors.text.secondary}
              value={form.description}
              onChangeText={text => setForm({ ...form, description: text })}
            />

            <Text style={styles.fieldLabel}>Data</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={themeColors.text.secondary}
              value={form.date}
              onChangeText={text => setForm({ ...form, date: text })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: 'Fraunces-Bold' },
    monthNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      marginTop: 16,
    },
    monthLabel: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Fraunces-Bold',
      textTransform: 'capitalize',
      minWidth: 160,
      textAlign: 'center',
    },
    summaryRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginTop: 16 },
    summaryCard: { flex: 1, borderRadius: 12, padding: 14 },
    summaryLabel: { fontSize: 13, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
    summaryValue: { fontSize: 18, fontWeight: '700', marginTop: 4, fontFamily: 'WorkSans-Bold' },
    balanceCard: { marginHorizontal: 20, marginTop: 12, borderRadius: 12, padding: 16 },
    balanceValue: { fontSize: 24, fontWeight: '700', marginTop: 4, fontFamily: 'Fraunces-Bold' },
    section: { marginHorizontal: 20, marginTop: 24 },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 10,
      fontFamily: 'Fraunces-Bold',
    },
    categoryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryName: { fontSize: 14, color: colors.text.primary, fontFamily: 'WorkSans-Regular' },
    categoryValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontFamily: 'WorkSans-SemiBold' },
    emptyText: { fontSize: 14, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
    hintText: {
      fontSize: 11,
      color: colors.text.secondary,
      fontFamily: 'WorkSans-Regular',
      marginTop: 6,
      textAlign: 'center',
    },
    transactionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 8,
    },
    transactionCategory: { fontSize: 14, fontWeight: '700', color: colors.text.primary, fontFamily: 'WorkSans-Bold' },
    transactionDescription: { fontSize: 12, color: colors.text.secondary, marginTop: 2, fontFamily: 'WorkSans-Regular' },
    transactionDate: { fontSize: 11, color: colors.text.secondary, marginTop: 2, fontFamily: 'WorkSans-Regular' },
    transactionAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'WorkSans-Bold' },
    fabRow: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      flexDirection: 'row',
      gap: 12,
    },
    fabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
    },
    fabButtonText: { color: colors.white, fontWeight: '700', fontFamily: 'WorkSans-SemiBold' },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 32,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 16,
      fontFamily: 'Fraunces-Bold',
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 6,
      fontFamily: 'WorkSans-SemiBold',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text.primary,
      marginBottom: 14,
      fontFamily: 'WorkSans-Regular',
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    categoryChipActive: { backgroundColor: colors.primary.main, borderColor: colors.primary.main },
    categoryChipText: { fontSize: 13, color: colors.text.primary, fontFamily: 'WorkSans-Regular' },
    categoryChipTextActive: { color: colors.white, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    cancelButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    cancelButtonText: { color: colors.text.primary, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
    saveButton: { backgroundColor: colors.primary.dark },
    saveButtonText: { color: colors.white, fontWeight: '700', fontFamily: 'WorkSans-SemiBold' },
  });

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, addDays, addBusinessDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface Order {
  id: string;
  number: string;
  customer_id: string;
  total: number;
  order_date: string;
  customer: { name: string } | null;
}

interface PaymentSchedule {
  date: string;
  value: number;
  description: string;
}

export default function GenerateReceiptsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [hasEntrance, setHasEntrance] = useState(false);
  const [paymentType, setPaymentType] = useState('à_vista');
  const [schedulePayments, setSchedulePayments] = useState(false);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingScheduleIndex, setEditingScheduleIndex] = useState<number>(-1);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data as Order);
      calculatePaymentSchedule('à_vista', false);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Erro', 'Falha ao carregar pedido');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentSchedule = (type: string, entrance: boolean) => {
    if (!order) return;

    const schedules: PaymentSchedule[] = [];
    const today = new Date();

    if (entrance) {
      // Entrada de 50%
      schedules.push({
        date: format(today, 'yyyy-MM-dd'),
        value: order.total * 0.5,
        description: 'Entrada (50%)',
      });

      if (type === 'a_prazo') {
        // 50% restante em 20 dias úteis
        const dueDate = addBusinessDays(today, 20);
        schedules.push({
          date: format(dueDate, 'yyyy-MM-dd'),
          value: order.total * 0.5,
          description: 'Saldo (50%) - Vencimento em 20 dias úteis',
        });
      } else if (type === 'parcelado') {
        // 25% após 20 dias úteis
        const firstInstallment = addBusinessDays(today, 20);
        schedules.push({
          date: format(firstInstallment, 'yyyy-MM-dd'),
          value: order.total * 0.25,
          description: '1ª Parcela (25%) - Vencimento em 20 dias úteis',
        });

        // 25% após 40 dias úteis
        const secondInstallment = addBusinessDays(today, 40);
        schedules.push({
          date: format(secondInstallment, 'yyyy-MM-dd'),
          value: order.total * 0.25,
          description: '2ª Parcela (25%) - Vencimento em 40 dias úteis',
        });
      }
    } else {
      if (type === 'à_vista') {
        // Valor total imediato
        schedules.push({
          date: format(today, 'yyyy-MM-dd'),
          value: order.total,
          description: 'Pagamento à Vista',
        });
      } else if (type === 'a_prazo') {
        // 100% em 20 dias úteis
        const dueDate = addBusinessDays(today, 20);
        schedules.push({
          date: format(dueDate, 'yyyy-MM-dd'),
          value: order.total,
          description: 'Pagamento - Vencimento em 20 dias úteis',
        });
      } else if (type === 'parcelado') {
        // 50% no ato + 25% após 20 dias + 25% após 40 dias
        schedules.push({
          date: format(today, 'yyyy-MM-dd'),
          value: order.total * 0.5,
          description: '1ª Parcela (50%)',
        });

        const firstInstallment = addBusinessDays(today, 20);
        schedules.push({
          date: format(firstInstallment, 'yyyy-MM-dd'),
          value: order.total * 0.25,
          description: '2ª Parcela (25%) - Vencimento em 20 dias úteis',
        });

        const secondInstallment = addBusinessDays(today, 40);
        schedules.push({
          date: format(secondInstallment, 'yyyy-MM-dd'),
          value: order.total * 0.25,
          description: '3ª Parcela (25%) - Vencimento em 40 dias úteis',
        });
      }
    }

    setPaymentSchedules(schedules);
  };

  const handleEntranceToggle = (value: boolean) => {
    setHasEntrance(value);
    if (value) {
      setPaymentType('a_prazo');
      calculatePaymentSchedule('a_prazo', true);
    } else {
      setPaymentType('à_vista');
      calculatePaymentSchedule('à_vista', false);
    }
  };

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    calculatePaymentSchedule(type, hasEntrance);
  };

  const handleScheduleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate && editingScheduleIndex >= 0) {
      const newDate = format(selectedDate, 'yyyy-MM-dd');
      setPaymentSchedules(prev =>
        prev.map((s, i) => i === editingScheduleIndex ? { ...s, date: newDate } : s)
      );
    }
    if (Platform.OS === 'android') {
      setEditingScheduleIndex(-1);
    }
  };

  const openDatePicker = (index: number) => {
    setEditingScheduleIndex(index);
    setShowDatePicker(true);
  };

  const handleSchedulePayments = async () => {
    if (!order || paymentSchedules.length === 0) {
      Alert.alert('Erro', 'Nenhum pagamento para agendar');
      return;
    }

    setSaving(true);
    try {
      const conditionLabel =
        paymentType === 'à_vista' ? 'À vista' :
        paymentType === 'a_prazo' ? 'A prazo (20d)' : 'Parcelado 3x';

      const { data: existing } = await supabase
        .from('transactions')
        .select('id, description, due_date')
        .eq('order_id', order.id)
        .eq('category', 'order_revenue');

      const existingKeys = new Set((existing || []).map(t => `${t.description}|${t.due_date}`));
      const newSchedules = paymentSchedules.filter(schedule =>
        !existingKeys.has(`${order.number} - ${schedule.description}|${schedule.date}`)
      );

      if (newSchedules.length === 0) {
        Alert.alert('Aviso', 'Todos os pagamentos já foram agendados para este pedido.');
        return;
      }

      const transactions = newSchedules.map(schedule => ({
        customer_id: order.customer_id,
        description: `${order.number} - ${schedule.description}`,
        amount: schedule.value,
        amount_received: 0,
        status: 'pending',
        type: 'revenue',
        date: schedule.date,
        due_date: schedule.date,
        payment_condition: conditionLabel,
        order_id: order.id,
        category: 'order_revenue',
      }));

      const { error } = await supabase
        .from('transactions')
        .insert(transactions);

      if (error) throw error;

      Alert.alert('Sucesso', `${newSchedules.length} pagamento(s) agendado(s) no módulo Financeiro`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error scheduling payments:', error);
      Alert.alert('Erro', 'Falha ao agendar pagamentos');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.dark} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Pedido não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary.light, colors.primary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Gerar Recebimentos</Text>
          <View />
        </LinearGradient>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pedido</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Número</Text>
              <Text style={styles.value}>{order.number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{order.customer?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Valor Total</Text>
              <Text style={styles.valueHighlight}>
                R$ {order.total.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>
        </View>

        {/* Entrance Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.sectionTitle}>Entrada</Text>
              <Text style={styles.toggleDescription}>
                Ativa automaticamente 50% de entrada
              </Text>
            </View>
            <Switch
              value={hasEntrance}
              onValueChange={handleEntranceToggle}
              trackColor={{ false: colors.border, true: colors.primary.light }}
              thumbColor={hasEntrance ? colors.primary.dark : colors.text.secondary}
              style={styles.switch}
            />
          </View>
        </View>

        {/* Payment Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de Pagamento</Text>
          <View style={styles.paymentTypeButtons}>
            <TouchableOpacity
              style={[
                styles.paymentTypeButton,
                paymentType === 'à_vista' && styles.paymentTypeButtonActive,
              ]}
              disabled={hasEntrance}
              onPress={() => handlePaymentTypeChange('à_vista')}>
              <Text
                style={[
                  styles.paymentTypeButtonText,
                  paymentType === 'à_vista' && styles.paymentTypeButtonTextActive,
                  hasEntrance && { opacity: 0.5 },
                ]}>
                À Vista
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentTypeButton,
                paymentType === 'a_prazo' && styles.paymentTypeButtonActive,
              ]}
              onPress={() => handlePaymentTypeChange('a_prazo')}>
              <Text
                style={[
                  styles.paymentTypeButtonText,
                  paymentType === 'a_prazo' && styles.paymentTypeButtonTextActive,
                ]}>
                À Prazo (20d)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentTypeButton,
                paymentType === 'parcelado' && styles.paymentTypeButtonActive,
              ]}
              onPress={() => handlePaymentTypeChange('parcelado')}>
              <Text
                style={[
                  styles.paymentTypeButtonText,
                  paymentType === 'parcelado' && styles.paymentTypeButtonTextActive,
                ]}>
                Parcelado 3x
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Schedule Payments */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.sectionTitle}>Agendar Pagamentos</Text>
              <Text style={styles.toggleDescription}>
                Lança automaticamente no Financeiro
              </Text>
            </View>
            <Switch
              value={schedulePayments}
              onValueChange={setSchedulePayments}
              trackColor={{ false: colors.border, true: colors.primary.light }}
              thumbColor={schedulePayments ? colors.primary.dark : colors.text.secondary}
              style={styles.switch}
            />
          </View>
        </View>

        {/* Payment Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cronograma de Pagamentos</Text>
          {paymentSchedules.map((schedule, index) => (
            <View key={index} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <TouchableOpacity onPress={() => openDatePicker(index)}>
                  <View style={styles.scheduleDateContainer}>
                    <Text style={styles.scheduleDate}>
                      {format(new Date(schedule.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </Text>
                    <Ionicons name="calendar" size={16} color={colors.primary.dark} style={{ marginLeft: 6 }} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.scheduleValue}>
                  R$ {schedule.value.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <Text style={styles.scheduleDescription}>{schedule.description}</Text>
            </View>
          ))}
          {showDatePicker && editingScheduleIndex >= 0 && (
            <DateTimePicker
              value={new Date(paymentSchedules[editingScheduleIndex].date + 'T00:00:00')}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleScheduleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Total */}
        <View style={styles.section}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total a Receber</Text>
            <Text style={styles.totalValue}>
              R$ {paymentSchedules.reduce((sum, s) => sum + s.value, 0).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          {schedulePayments && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSchedule, saving && styles.buttonDisabled]}
              onPress={handleSchedulePayments}
              disabled={saving}>
              <Ionicons name="checkmark" size={20} color={colors.white} />
              <Text style={styles.buttonText}>
                {saving ? 'Agendando...' : 'Agendar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 10,
    fontFamily: 'Fraunces-Bold',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    fontFamily: 'WorkSans-SemiBold',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'WorkSans-SemiBold',
  },
  valueHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.dark,
    fontFamily: 'Fraunces-Bold',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    fontFamily: 'WorkSans-Regular',
  },
  switch: {
    marginLeft: 10,
  },
  paymentTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentTypeButton: {
    flex: 1,
    flexShrink: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTypeButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  paymentTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'WorkSans-SemiBold',
  },
  paymentTypeButtonTextActive: {
    color: colors.white,
  },
  scheduleCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleDate: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'WorkSans-Bold',
  },
  scheduleDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.dark,
    fontFamily: 'Fraunces-Bold',
  },
  scheduleDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'WorkSans-Regular',
  },
  totalCard: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'WorkSans-SemiBold',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonCancel: {
    backgroundColor: colors.border,
  },
  buttonSchedule: {
    backgroundColor: colors.status.completed,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'WorkSans-Bold',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.disabled,
    fontFamily: 'WorkSans-Regular',
  },
});

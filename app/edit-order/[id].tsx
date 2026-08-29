import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Order {
  id: string;
  number: string;
  customer_id: string;
  status: string;
  order_date: string;
  service_subtotal: number;
  product_subtotal: number;
  expenses_total: number;
  freight: number;
  discount_type: string;
  discount_value: number;
  total: number;
  payment_method: string;
  payment_condition: string;
  observations: string;
}

export default function EditOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [status, setStatus] = useState('pending');
  const [paymentMethod, setPaymentMethod] = useState('Cartão de Crédito');
  const [paymentCondition, setPaymentCondition] = useState('À vista');
  const [observations, setObservations] = useState('');
  const [freight, setFreight] = useState('0');
  const [discountValue, setDiscountValue] = useState('0');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

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
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setOrder(data as Order);
      setStatus(data.status);
      setPaymentMethod(data.payment_method || 'Cartão de Crédito');
      setPaymentCondition(data.payment_condition || 'À vista');
      setObservations(data.observations || '');
      setFreight(data.freight?.toString() || '0');
      setDiscountValue(data.discount_value?.toString() || '0');
      setDiscountType((data.discount_type as 'percentage' | 'fixed') || 'percentage');
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Erro', 'Falha ao carregar pedido');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          payment_method: paymentMethod,
          payment_condition: paymentCondition,
          observations,
          freight: parseFloat(freight) || 0,
          discount_value: parseFloat(discountValue) || 0,
          discount_type: discountType,
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Sucesso', 'Pedido atualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error saving order:', error);
      Alert.alert('Erro', 'Falha ao atualizar pedido');
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
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}>
        {/* Header */}
        <LinearGradient
          colors={[colors.primary.light, colors.primary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Pedido {order.number}</Text>
          <View />
        </LinearGradient>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusButtonGroup}>
            {['pending', 'in_progress', 'completed', 'cancelled'].map(st => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusButton,
                  status === st && styles.statusButtonActive,
                ]}
                onPress={() => setStatus(st)}>
                <Text
                  style={[
                    styles.statusButtonText,
                    status === st && styles.statusButtonTextActive,
                  ]}>
                  {st === 'pending'
                    ? 'Pendente'
                    : st === 'in_progress'
                      ? 'Em Andamento'
                      : st === 'completed'
                        ? 'Concluído'
                        : 'Cancelado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Freight */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frete</Text>
          <TextInput
            style={styles.input}
            placeholder="Valor do frete"
            placeholderTextColor={colors.text.disabled}
            value={freight}
            onChangeText={setFreight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Discount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desconto</Text>
          <View style={styles.discountTypeButtons}>
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'percentage' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('percentage')}>
              <Text
                style={[
                  styles.discountTypeButtonText,
                  discountType === 'percentage' && styles.discountTypeButtonTextActive,
                ]}>
                %
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'fixed' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('fixed')}>
              <Text
                style={[
                  styles.discountTypeButtonText,
                  discountType === 'fixed' && styles.discountTypeButtonTextActive,
                ]}>
                R$
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder={`Desconto ${discountType === 'percentage' ? '(%)' : '(R$)'}`}
            placeholderTextColor={colors.text.disabled}
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <Text style={styles.labelSmall}>Forma de Pagamento</Text>
          <View style={styles.paymentTypeGrid}>
            {[
              { id: 'Dinheiro', label: 'Dinheiro' },
              { id: 'Pix', label: 'Pix' },
              { id: 'Cartão Débito', label: 'Cartão Débito' },
              { id: 'Cartão Crédito', label: 'Cartão Crédito' },
              { id: 'Boleto', label: 'Boleto' },
              { id: 'Transferência', label: 'Transferência' },
            ].map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.paymentTypeBtn,
                  paymentMethod === type.id && styles.paymentTypeBtnActive,
                ]}
                onPress={() => setPaymentMethod(type.id)}>
                <Text
                  style={[
                    styles.paymentTypeBtnText,
                    paymentMethod === type.id && styles.paymentTypeBtnTextActive,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.labelSmall}>Condição de Pagamento</Text>
          <View style={styles.conditionGrid}>
            {[
              { id: 'avista', label: 'À Vista' },
              { id: 'metade50', label: '50% Entrada + 50% Entrega' },
              { id: 'entrada2x', label: '50% Entrada + 2x' },
            ].map(cond => (
              <TouchableOpacity
                key={cond.id}
                style={[
                  styles.conditionBtn,
                  paymentCondition === cond.label && styles.conditionBtnActive,
                ]}
                onPress={() => setPaymentCondition(cond.label)}>
                <Text
                  style={[
                    styles.conditionBtnText,
                    paymentCondition === cond.label && styles.conditionBtnTextActive,
                  ]}>
                  {cond.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Observações do pedido"
            placeholderTextColor={colors.text.disabled}
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonCancel]}
            onPress={() => router.back()}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonSave, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.buttonText}>
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
  statusButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexShrink: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
    fontFamily: 'WorkSans-SemiBold',
  },
  statusButtonTextActive: {
    color: colors.white,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'WorkSans-Regular',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  discountTypeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountTypeButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  discountTypeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.secondary,
    fontFamily: 'WorkSans-Bold',
  },
  discountTypeButtonTextActive: {
    color: colors.white,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: colors.border,
  },
  buttonSave: {
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
  labelSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
    fontFamily: 'WorkSans-SemiBold',
  },
  paymentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  paymentTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  paymentTypeBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  paymentTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'WorkSans-SemiBold',
  },
  paymentTypeBtnTextActive: {
    color: colors.white,
  },
  conditionGrid: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  conditionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexShrink: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    alignItems: 'center',
  },
  conditionBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  conditionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.dark,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'WorkSans-SemiBold',
  },
  conditionBtnTextActive: {
    color: colors.white,
  },
});

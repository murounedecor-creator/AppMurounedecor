import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { colors } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { deleteOrderCascade } from '@/lib/orders';
import { scheduleOrderReminder, cancelOrderReminder } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

const Print = Platform.OS !== 'web' ? require('expo-print') : null;
const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;

interface OrderFurniture {
  id: string;
  furniture_type: string;
  quantity_pieces: number;
  width_m: number;
  depth_m: number;
  height_m: number;
  calculated_meters: number;
  photo_base64: string | null;
  observations: string;
  seat_cushions: number | null;
  backrest_cushions: number | null;
  retractable: boolean | null;
  places: number | null;
}

interface OrderService {
  id: string;
  service_name: string;
  value: number;
  quantity?: number;
  unit?: string;
}

interface OrderProduct {
  id: string;
  product_name: string;
  meters: number;
  price_per_meter: number;
  valor_custo?: number;
  subtotal: number;
  quantity?: number;
  unit?: string;
}

interface OrderExpense {
  id: string;
  name: string;
  value: number;
  category: string;
  is_paid: boolean;
  is_chargeable: boolean;
}

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
  prazo_entrega: string | null;
  lembrete_dias_antes: number;
  notification_id: string | null;
  customer: { name: string; phone?: string; email?: string; address?: string } | null;
}

const EXPENSE_CATEGORY_NAMES: Record<string, string> = {
  helpers: 'Ajudantes',
  food: 'Alimentação',
  fuel: 'Combustível',
  tools: 'Ferramentas',
  accommodation: 'Hospedagem',
  taxes: 'Impostos',
  leisure: 'Lazer',
  materials: 'Materiais',
  accounts: 'Contas',
  transport: 'Transporte',
  shipping: 'Frete',
  other: 'Outros',
};

export default function OrderViewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [furnitures, setFurnitures] = useState<OrderFurniture[]>([]);
  const [services, setServices] = useState<OrderService[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [loading, setLoading] = useState(false);

  const chargeableExpensesTotal = expenses
    .filter(e => e.is_chargeable)
    .reduce((sum, e) => sum + Number(e.value || 0), 0);
  const [statusModal, setStatusModal] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrderData();
    }
  }, [id]);

  const loadOrderData = async () => {
    setLoading(true);
    try {
      const [orderRes, furnRes, servRes, prodRes, expRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, customer:customers(name, phone, email, address)')
          .eq('id', id)
          .single(),
        supabase.from('order_items_furniture').select('*').eq('order_id', id),
        supabase.from('order_items_services').select('*').eq('order_id', id),
        supabase.from('order_items_products').select('*').eq('order_id', id),
        supabase.from('order_expenses').select('*').eq('order_id', id),
      ]);

      if (orderRes.error) throw orderRes.error;

      setOrder(orderRes.data as Order);
      setFurnitures(furnRes.data || []);
      setServices(servRes.data || []);
      setProducts(prodRes.data || []);
      setExpenses(expRes.data || []);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Erro', 'Falha ao carregar pedido');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.status.pending;
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

  const handleStatusChange = async (newStatus: string) => {
    setStatusModal(false);
    try {
      const previousStatus = order?.status;
      const previousNotificationId = order?.notification_id ?? null;
      const prazoEntrega = order?.prazo_entrega ?? null;
      const lembreteDiasAntes = order?.lembrete_dias_antes ?? 1;
      const clienteNome = order?.customer?.name ?? '';

      let novoNotificationId: string | null = null;

      const wasInProgress = previousStatus === 'in_progress';
      const willBeInProgress = newStatus === 'in_progress';

      if (wasInProgress && previousNotificationId) {
        await cancelOrderReminder(previousNotificationId);
      }

      if (willBeInProgress && prazoEntrega) {
        novoNotificationId = await scheduleOrderReminder(
          String(id),
          clienteNome,
          prazoEntrega,
          lembreteDiasAntes
        );
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          notification_id: novoNotificationId,
        })
        .eq('id', id);

      if (error) throw error;

      setOrder(prev => (prev ? { ...prev, status: newStatus, notification_id: novoNotificationId } : null));
      Alert.alert('Sucesso', 'Status atualizado');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      Alert.alert('Erro', 'Falha ao atualizar status');
    }
  };

  const handleDuplicateOrder = async () => {
    Alert.alert('Duplicar', 'Deseja duplicar este pedido?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Duplicar',
        onPress: async () => {
          try {
            // Generate new order number
            const lastOrder = await supabase
              .from('orders')
              .select('number')
              .order('created_at', { ascending: false })
              .limit(1);

            let nextNumber = '0001';
            if (lastOrder.data && lastOrder.data.length > 0) {
              const lastNumber = parseInt(lastOrder.data[0].number.split('-')[0]);
              nextNumber = (lastNumber + 1).toString().padStart(4, '0');
            }

            const year = format(new Date(), 'yy');
            const orderNumber = `${nextNumber}-${year}`;

            // Create new order
            const { data: newOrder, error: orderError } = await supabase
              .from('orders')
              .insert([
                {
                  number: orderNumber,
                  customer_id: order?.customer_id,
                  status: 'pending',
                  order_date: format(new Date(), 'yyyy-MM-dd'),
                  service_subtotal: order?.service_subtotal || 0,
                  product_subtotal: order?.product_subtotal || 0,
                  expenses_total: order?.expenses_total || 0,
                  freight: order?.freight || 0,
                  discount_type: order?.discount_type,
                  discount_value: order?.discount_value || 0,
                  total: order?.total || 0,
                  payment_method: order?.payment_method,
                  payment_condition: order?.payment_condition,
                  observations: order?.observations,
                },
              ])
              .select()
              .single();

            if (orderError) throw orderError;

            // Duplicate furniture items
            if (furnitures.length > 0) {
              await supabase.from('order_items_furniture').insert(
                furnitures.map(f => ({
                  order_id: newOrder.id,
                  furniture_type: f.furniture_type,
                  quantity_pieces: f.quantity_pieces,
                  width_m: f.width_m,
                  depth_m: f.depth_m,
                  height_m: f.height_m,
                  calculated_meters: f.calculated_meters,
                  photo_base64: f.photo_base64,
                  observations: f.observations,
                  seat_cushions: f.seat_cushions,
                  backrest_cushions: f.backrest_cushions,
                  retractable: f.retractable,
                  places: f.places,
                }))
              );
            }

            // Duplicate services
            if (services.length > 0) {
              await supabase.from('order_items_services').insert(
                services.map(s => ({
                  order_id: newOrder.id,
                  service_name: s.service_name,
                  value: s.value,
                }))
              );
            }

            // Duplicate products
            if (products.length > 0) {
              await supabase.from('order_items_products').insert(
                products.map(p => ({
                  order_id: newOrder.id,
                  product_name: p.product_name,
                  meters: p.meters,
                  price_per_meter: p.price_per_meter,
                  subtotal: p.subtotal,
                }))
              );
            }

            // Duplicate expenses
            if (expenses.length > 0) {
              await supabase.from('order_expenses').insert(
                expenses.map(e => ({
                  order_id: newOrder.id,
                  name: e.name,
                  value: e.value,
                  category: e.category,
                  is_paid: e.is_paid,
                  is_chargeable: true,
                  expense_date: format(new Date(), 'yyyy-MM-dd'),
                }))
              );
            }

            Alert.alert('Sucesso', `Pedido ${orderNumber} criado!`, [
              {
                text: 'Abrir',
                onPress: () => router.push(`/order/${newOrder.id}`),
              },
              { text: 'OK' },
            ]);
          } catch (error) {
            console.error('Error duplicating order:', error);
            Alert.alert('Erro', 'Falha ao duplicar pedido');
          }
        },
      },
    ]);
  };

  const handleDeleteOrder = () => {
    Alert.alert('Excluir', 'Deseja excluir este pedido? Esta ação é irreversível!', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrderCascade(String(id));
            Alert.alert('Sucesso', 'Pedido excluído', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('Erro ao excluir pedido:', error);
            Alert.alert('Erro', 'Falha ao excluir pedido');
          }
        },
      },
    ]);
  };

  const generateBudgetPDF = async () => {
    if (!order) return;

    setPdfLoading(true);
    try {
      const html = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; }
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                opacity: 0.06;
                font-size: 72px;
                font-weight: bold;
                color: rgb(201, 169, 110);
                text-align: center;
                z-index: -1;
                width: 100%;
                white-space: nowrap;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #C9A96E;
                padding-bottom: 10px;
              }
              .header-title {
                text-align: center;
                flex: 1;
              }
              .header-title h1 { color: #8B6914; font-size: 24px; margin-bottom: 5px; }
              .header-title p { color: #666; font-size: 12px; }
              .order-number {
                font-size: 14px;
                font-weight: bold;
                color: #8B6914;
              }
              .section {
                margin-top: 15px;
                page-break-inside: avoid;
              }
              .section-title {
                background-color: #C9A96E;
                color: white;
                padding: 8px;
                font-weight: bold;
                margin-bottom: 10px;
                border-radius: 4px;
              }
              .customer-info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                font-size: 12px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #eee;
              }
              .info-label { font-weight: bold; color: #666; }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
              }
              th {
                background-color: #F5F0EB;
                padding: 8px;
                text-align: left;
                border-bottom: 2px solid #C9A96E;
              }
              td {
                padding: 8px;
                border-bottom: 1px solid #eee;
              }
              .totals {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
              }
              .totals-table {
                width: 300px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 10px;
                border-bottom: 1px solid #eee;
              }
              .total-final {
                background-color: #C9A96E;
                color: white;
                font-weight: bold;
                padding: 10px !important;
                font-size: 14px !important;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #999;
                border-top: 1px solid #eee;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="watermark">MUROUNE DECOR</div>

            <div class="header">
              <div></div>
              <div class="header-title">
                <h1>MUROUNE DECOR</h1>
                <p>Excelência que transforma ambientes</p>
              </div>
              <div></div>
            </div>

            <div class="order-number">ORÇAMENTO Nº ${order.number}</div>
            <div style="font-size: 11px; color: #666; margin-bottom: 15px;">
              Emitido em: ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}
            </div>

            <div class="section">
              <div class="section-title">DADOS DO CLIENTE</div>
              <div class="customer-info">
                <div><strong>Nome:</strong> ${order.customer?.name || 'N/A'}</div>
                <div><strong>Tel.:</strong> ${order.customer?.phone || 'N/A'}</div>
                <div><strong>Endereço:</strong> ${order.customer?.address || 'N/A'}</div>
                <div><strong>Data:</strong> ${format(parseISO(order.order_date), 'dd/MM/yyyy', { locale: ptBR })}</div>
              </div>
            </div>

            ${
              furnitures.length > 0
                ? `
            <div class="section">
              <div class="section-title">MÓVEIS/PROJETO</div>
              ${furnitures.map(f => {
                let details = '<div style="margin-bottom:12px;padding:10px;background:#F5F0EB;border-left:3px solid #C9A96E;border-radius:4px;">';
                details += '<strong style="color:#5C3D1E;font-size:13px;">' + f.furniture_type + '</strong><br>';
                if (f.places && f.places > 0) {
                  details += '<span style="font-size:11px;">Lugares: ' + f.places + '</span> | ';
                }
                if (f.retractable !== null) {
                  details += '<span style="font-size:11px;">Retrátil: ' + (f.retractable ? 'Sim' : 'Não') + '</span><br>';
                }
                details += '<span style="font-size:11px;">Medidas: ' + f.width_m + 'm × ' + f.depth_m + 'm × ' + f.height_m + 'm</span><br>';
                if (f.seat_cushions && f.seat_cushions > 0) {
                  details += '<span style="font-size:11px;">Almofadas no Assento: ' + f.seat_cushions + ' unidades</span><br>';
                }
                if (f.backrest_cushions && f.backrest_cushions > 0) {
                  details += '<span style="font-size:11px;">Almofadas no Encosto: ' + f.backrest_cushions + ' unidades</span><br>';
                }
                if (f.observations) {
                  details += '<span style="font-size:11px;">Outros: ' + f.observations + '</span><br>';
                }
                details += '</div>';
                return details;
              }).join('')}
            </div>
            `
                : ''
            }

            ${
              services.length > 0
                ? `
            <div class="section">
              <div class="section-title">SERVIÇOS</div>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Qtd</th>
                    <th>Unidade</th>
                    <th>Vlr Unit.</th>
                    <th>Vlr Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${services
                    .map(
                      s => `
                    <tr>
                      <td>${s.service_name}</td>
                      <td>${s.quantity || 1}</td>
                      <td>${s.unit || 'Unitário'}</td>
                      <td>R$ ${(s.value / (s.quantity || 1)).toFixed(2).replace('.', ',')}</td>
                      <td>R$ ${s.value.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <div style="text-align:right;margin-top:8px;font-weight:bold;color:#8B6914;">
                Total Serviços: R$ ${order.service_subtotal.toFixed(2).replace('.', ',')}
              </div>
            </div>
            `
                : ''
            }

            ${
              products.length > 0
                ? `
            <div class="section">
              <div class="section-title">PRODUTOS</div>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Qtd</th>
                    <th>Unidade</th>
                    <th>Vlr Unit.</th>
                    <th>Vlr Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${products
                    .map(
                      p => `
                    <tr>
                      <td>${p.product_name}</td>
                      <td>${p.quantity || 1}</td>
                      <td>${p.unit || 'Unitário'}</td>
                      <td>R$ ${p.price_per_meter.toFixed(2).replace('.', ',')}</td>
                      <td>R$ ${p.subtotal.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <div style="text-align:right;margin-top:8px;font-weight:bold;color:#8B6914;">
                Total Produtos: R$ ${order.product_subtotal.toFixed(2).replace('.', ',')}
              </div>
            </div>
            `
                : ''
            }

            ${
              expenses.length > 0
                ? `
            <div class="section">
              <div class="section-title">DESPESAS</div>
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${expenses
                    .map(
                      e => `
                    <tr>
                      <td>${e.name}</td>
                      <td>${EXPENSE_CATEGORY_NAMES[e.category] || e.category}</td>
                      <td>R$ ${e.value.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
              <div style="text-align:right;margin-top:8px;font-weight:bold;color:#8B6914;">
                Total Despesas: R$ ${chargeableExpensesTotal.toFixed(2).replace('.', ',')}
              </div>
            </div>
            `
                : ''
            }

            <div class="section">
              <div class="section-title">TOTAL</div>
              <div class="totals">
                <div class="totals-table">
                  <div class="total-row">
                    <span>Frete:</span>
                    <span>R$ ${order.freight.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="total-row">
                    <span>Subtotal:</span>
                    <span>R$ ${(order.service_subtotal + order.product_subtotal + chargeableExpensesTotal).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="total-row">
                    <span>Desconto:</span>
                    <span>-R$ ${order.discount_value.toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div class="total-final">
                    <div style="display: flex; justify-content: space-between;">
                      <span>TOTAL ORÇAMENTO:</span>
                      <span>R$ ${order.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">PAGAMENTO</div>
              <div class="info-row">
                <span><strong>Forma:</strong> ${order.payment_method || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span><strong>Condição:</strong> ${order.payment_condition || 'N/A'}</span>
              </div>
            </div>

            ${
              order.observations
                ? `
            <div class="section">
              <div class="section-title">OBSERVAÇÕES</div>
              <p style="font-size: 12px; line-height: 1.6;">${order.observations}</p>
            </div>
            `
                : ''
            }

            <div class="footer">
              MUROUNE DECOR | murounedecor@gmail.com<br>
              Orçamento válido por 30 dias | Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web' || !Print || !Sharing) {
        Alert.alert('Aviso', 'Geração de PDF não disponível na web');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Erro', 'Falha ao gerar PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const generateReceiptPDF = async () => {
    if (!order) return;

    const { data: paymentRows } = await supabase
      .from('transactions')
      .select('description, amount, due_date, status')
      .eq('order_id', order.id)
      .eq('category', 'order_revenue')
      .order('due_date', { ascending: true });

    setPdfLoading(true);
    try {
      const cronogramaHtml = paymentRows && paymentRows.length > 0
        ? `
          <div class="section">
            <div class="section-title">CRONOGRAMA DE PAGAMENTOS</div>
            ${paymentRows.map(p => `
              <div class="info-row">
                <span class="label">${p.description} — ${format(parseISO(p.due_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                <span>R$ ${Number(p.amount).toFixed(2).replace('.', ',')} ${p.status === 'completed' ? '(Pago)' : '(Pendente)'}</span>
              </div>
            `).join('')}
          </div>
        `
        : '';

      const html = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; }
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                opacity: 0.06;
                font-size: 72px;
                font-weight: bold;
                color: rgb(201, 169, 110);
                text-align: center;
                z-index: -1;
                width: 100%;
                white-space: nowrap;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #C9A96E;
                padding-bottom: 10px;
              }
              .header h1 { color: #8B6914; font-size: 24px; margin-bottom: 5px; }
              .header p { color: #666; font-size: 12px; }
              .receipt-number {
                font-size: 14px;
                font-weight: bold;
                color: #8B6914;
                text-align: center;
              }
              .section {
                margin-top: 15px;
              }
              .section-title {
                background-color: #C9A96E;
                color: white;
                padding: 8px;
                font-weight: bold;
                margin-bottom: 10px;
              }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
                border-bottom: 1px solid #eee;
                font-size: 12px;
              }
              .label { font-weight: bold; color: #666; }
              .totals {
                margin-top: 20px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                padding: 8px 10px;
                border-bottom: 1px solid #eee;
              }
              .total-final {
                background-color: #C9A96E;
                color: white;
                font-weight: bold;
                padding: 10px;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #999;
                border-top: 1px solid #eee;
                padding-top: 10px;
              }
            </style>
          </head>
          <body>
            <div class="watermark">MUROUNE DECOR</div>

            <div class="header">
              <h1>MUROUNE DECOR</h1>
              <p>Excelência que transforma ambientes</p>
            </div>

            <div class="receipt-number">RECIBO Nº ${order.number}</div>
            <div style="text-align: center; font-size: 11px; color: #666; margin-bottom: 15px;">
              Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>

            <div class="section">
              <div class="section-title">CLIENTE</div>
              <div class="info-row">
                <span class="label">Nome:</span>
                <span>${order.customer?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Telefone:</span>
                <span>${order.customer?.phone || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">E-mail:</span>
                <span>${order.customer?.email || 'N/A'}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">INFORMAÇÕES DO PEDIDO</div>
              <div class="info-row">
                <span class="label">Data:</span>
                <span>${format(parseISO(order.order_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span>${getStatusLabel(order.status)}</span>
              </div>
            </div>

            <div class="section totals">
              <div class="section-title">TOTAIS</div>
              <div class="total-row">
                <span>Subtotal Serviço:</span>
                <span>R$ ${order.service_subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="total-row">
                <span>Subtotal Produto:</span>
                <span>R$ ${order.product_subtotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="total-row">
                <span>Despesas Cobráveis:</span>
                <span>R$ ${chargeableExpensesTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="total-row">
                <span>Frete:</span>
                <span>R$ ${order.freight.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="total-row">
                <span>Desconto:</span>
                <span>-R$ ${order.discount_value.toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="total-final">
                <div style="display: flex; justify-content: space-between;">
                  <span>TOTAL:</span>
                  <span>R$ ${order.total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">PAGAMENTO</div>
              <div class="info-row">
                <span class="label">Forma:</span>
                <span>${order.payment_method || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="label">Condição:</span>
                <span>${order.payment_condition || 'N/A'}</span>
              </div>
            </div>

            ${cronogramaHtml}
            <div class="footer">
              MUROUNE DECOR | murounedecor@gmail.com<br>
              Obrigado por escolher a Muroune Decor!<br>
              Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web' || !Print || !Sharing) {
        Alert.alert('Aviso', 'Geração de PDF não disponível na web');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error generating receipt:', error);
      Alert.alert('Erro', 'Falha ao gerar recibo');
    } finally {
      setPdfLoading(false);
    }
  };

  const generateMaterialsList = async () => {
    if (!order) return;

    setPdfLoading(true);
    try {
      const html = `
        <html>
          <head>
            <style>
              * { margin: 0; padding: 0; }
              body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                opacity: 0.06;
                font-size: 72px;
                font-weight: bold;
                color: rgb(201, 169, 110);
                text-align: center;
                z-index: -1;
                width: 100%;
                white-space: nowrap;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #C9A96E;
                padding-bottom: 10px;
              }
              .header h1 { color: #8B6914; font-size: 24px; margin-bottom: 5px; }
              .section-title {
                background-color: #C9A96E;
                color: white;
                padding: 8px;
                font-weight: bold;
                margin-bottom: 10px;
                margin-top: 15px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
              }
              th {
                background-color: #F5F0EB;
                padding: 8px;
                text-align: left;
                border-bottom: 2px solid #C9A96E;
              }
              td {
                padding: 8px;
                border-bottom: 1px solid #eee;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #999;
              }
            </style>
          </head>
          <body>
            <div class="watermark">MUROUNE DECOR</div>

            <div class="header">
              <h1>MUROUNE DECOR</h1>
              <p>Lista de Materiais - Pedido ${order.number}</p>
            </div>

            ${
              products.length > 0
                ? `
            <div class="section-title">PRODUTOS</div>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Unidade</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${products
                  .map(
                    p => `
                  <tr>
                    <td>${p.product_name}</td>
                    <td>${p.quantity || 1}</td>
                    <td>${p.unit || 'Unitário'}</td>
                    <td>R$ ${p.subtotal.toFixed(2).replace('.', ',')}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            `
                : '<p style="color: #666;">Nenhum produto neste pedido</p>'
            }

            ${
              furnitures.length > 0
                ? `
            <div class="section-title">MÓVEIS</div>
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Medidas</th>
                </tr>
              </thead>
              <tbody>
                ${furnitures
                  .map(
                    f => `
                  <tr>
                    <td>${f.furniture_type}</td>
                    <td>${f.quantity_pieces}</td>
                    <td>${f.width_m}m × ${f.depth_m}m × ${f.height_m}m</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
            `
                : ''
            }

            <div class="footer">
              MUROUNE DECOR | murounedecor@gmail.com<br>
              Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web' || !Print || !Sharing) {
        Alert.alert('Aviso', 'Geração de PDF não disponível na web');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error('Error generating materials list:', error);
      Alert.alert('Erro', 'Falha ao gerar lista de materiais');
    } finally {
      setPdfLoading(false);
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
          <View style={styles.headerCenter}>
            <Text style={styles.orderNumberLarge}>Pedido {order.number}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleDuplicateOrder} style={styles.headerActionBtn}>
              <Ionicons name="copy" size={20} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/new-order?pedidoId=${order.id}&modo=edicao`)} style={styles.headerActionBtn}>
              <Ionicons name="pencil" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Status Bar */}
        <View style={styles.statusBar}>
          <TouchableOpacity
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) },
            ]}
            onPress={() => setStatusModal(true)}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteOrder} style={styles.deleteBtn}>
            <Ionicons name="trash" size={18} color={colors.error} />
            <Text style={styles.deleteBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Nome</Text>
              <Text style={styles.value}>{order.customer?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Telefone</Text>
              <Text style={styles.value}>{order.customer?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.value}>{order.customer?.email || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Endereço</Text>
              <Text style={styles.value}>{order.customer?.address || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.value}>
                {format(parseISO(order.order_date), 'dd/MM/yyyy', { locale: ptBR })}
              </Text>
            </View>
          </View>
        </View>

        {/* Furniture */}
        {furnitures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Móveis</Text>
            {furnitures.map(f => (
              <View key={f.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{f.furniture_type}</Text>
                <Text style={styles.itemDetail}>Quantidade: {f.quantity_pieces} peça(s)</Text>
                <Text style={styles.itemDetail}>
                  Medidas: {f.width_m}m × {f.depth_m}m × {f.height_m}m
                </Text>
                <Text style={styles.itemDetail}>Metragem: {Number(f.calculated_meters || 0).toFixed(2)}m²</Text>
                {f.observations && (
                  <Text style={styles.itemDetail}>Observação: {f.observations}</Text>
                )}
                {f.photo_base64 && (
                  <Image
                    source={{ uri: f.photo_base64 }}
                    style={styles.thumbnail}
                  />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Products */}
        {products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            {products.map(p => (
              <View key={p.id} style={styles.itemCard}>
                <Text style={styles.itemTitle}>{p.product_name}</Text>
                <Text style={styles.itemDetail}>{Number(p.quantity || 0).toFixed(2).replace('.', ',')} {p.unit || 'un'} × R$ {p.price_per_meter.toFixed(2).replace('.', ',')}</Text>
                <Text style={styles.itemDetail}>Subtotal: R$ {p.subtotal.toFixed(2).replace('.', ',')}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Services */}
        {services.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            {services.map(s => (
              <View key={s.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, { flex: 1, marginRight: 8 }]}>{s.service_name}</Text>
                  <Text style={[styles.itemTitle, { flexShrink: 0 }]}>R$ {s.value.toFixed(2).replace('.', ',')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Expenses */}
        {expenses.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Despesas</Text>
            {expenses.map(e => (
              <View key={e.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View>
                    <Text style={styles.itemTitle}>{e.name}</Text>
                    <Text style={styles.itemDetail}>{EXPENSE_CATEGORY_NAMES[e.category]}</Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemTitle}>R$ {e.value.toFixed(2).replace('.', ',')}</Text>
                    <Text style={[styles.itemDetail, { textAlign: 'right' }]}>
                      {e.is_paid ? 'Pago' : 'Pendente'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <Text style={styles.sectionTitle}>Totais</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal Serviço</Text>
            <Text style={styles.totalValue}>R$ {order.service_subtotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal Produto</Text>
            <Text style={styles.totalValue}>R$ {order.product_subtotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Despesas Cobráveis</Text>
            <Text style={styles.totalValue}>R$ {chargeableExpensesTotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frete</Text>
            <Text style={styles.totalValue}>R$ {order.freight.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Desconto</Text>
            <Text style={styles.totalValue}>-R$ {order.discount_value.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowHighlight]}>
            <Text style={styles.totalLabelHighlight}>TOTAL</Text>
            <Text style={styles.totalValueHighlight}>R$ {order.total.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Forma</Text>
              <Text style={styles.value}>{order.payment_method}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Condição</Text>
              <Text style={styles.value}>{order.payment_condition}</Text>
            </View>
          </View>
        </View>

        {/* Observations */}
        {order.observations && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.observationsCard}>
              <Text style={styles.observationsText}>{order.observations}</Text>
            </View>
          </View>
        )}

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          <View style={styles.docButtonsContainer}>
            <TouchableOpacity
              style={styles.docButton}
              onPress={generateBudgetPDF}
              disabled={pdfLoading}>
              <Ionicons name="document" size={20} color={colors.white} />
              <Text style={styles.docButtonText}>Orçamento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.docButton}
              onPress={generateMaterialsList}
              disabled={pdfLoading}>
              <Ionicons name="list" size={20} color={colors.white} />
              <Text style={styles.docButtonText}>Materiais</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.docButton}
              onPress={generateReceiptPDF}
              disabled={pdfLoading}>
              <Ionicons name="receipt" size={20} color={colors.white} />
              <Text style={styles.docButtonText}>Recibo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payments */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.buttonPayments}
            onPress={() => router.push(`/generate-receipts/${order.id}`)}>
            <Ionicons name="cash" size={20} color={colors.white} />
            <Text style={styles.buttonPaymentsText}>Gerar Recebimentos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal visible={statusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.statusModal}>
            <Text style={styles.modalTitle}>Alterar Status</Text>
            {['pending', 'in_progress', 'completed', 'cancelled'].map(status => (
              <TouchableOpacity
                key={status}
                style={styles.statusOption}
                onPress={() => handleStatusChange(status)}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(status) },
                  ]}
                />
                <Text style={styles.statusOptionText}>{getStatusLabel(status)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setStatusModal(false)}>
              <Text style={styles.modalCloseBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  orderNumberLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerActionBtn: {
    padding: 8,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'WorkSans-SemiBold',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
    fontFamily: 'WorkSans-SemiBold',
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
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    fontFamily: 'WorkSans-Bold',
  },
  itemDetail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
    fontFamily: 'WorkSans-Regular',
  },
  thumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    marginTop: 8,
  },
  totalsSection: {
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRowHighlight: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginHorizontal: -12,
    marginVertical: 4,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'WorkSans-SemiBold',
  },
  totalLabelHighlight: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'WorkSans-Bold',
  },
  totalValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary.dark,
    fontFamily: 'Fraunces-Bold',
  },
  totalValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'Fraunces-Bold',
  },
  observationsCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  observationsText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 20,
    fontFamily: 'WorkSans-Regular',
  },
  docButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  docButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: colors.primary.main,
    borderRadius: 6,
    gap: 6,
  },
  docButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
    fontFamily: 'WorkSans-SemiBold',
  },
  buttonPayments: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.status.completed,
    borderRadius: 8,
    gap: 8,
    marginBottom: 40,
  },
  buttonPaymentsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    fontFamily: 'WorkSans-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
    fontFamily: 'Fraunces-Bold',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'WorkSans-SemiBold',
  },
  modalCloseBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.border,
    borderRadius: 6,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'WorkSans-SemiBold',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.disabled,
    fontFamily: 'WorkSans-Regular',
  },
});

import { supabase } from '@/lib/supabase';
import { cancelOrderReminder } from '@/lib/notifications';

export async function deleteOrderCascade(orderId: string): Promise<void> {
  const { data: orderData } = await supabase
    .from('orders')
    .select('notification_id')
    .eq('id', orderId)
    .maybeSingle();
  if (orderData?.notification_id) {
    await cancelOrderReminder(orderData.notification_id);
  }

  await supabase.from('order_expenses').delete().eq('order_id', orderId);
  await supabase.from('order_items_products').delete().eq('order_id', orderId);
  await supabase.from('order_items_services').delete().eq('order_id', orderId);
  await supabase.from('order_items_furniture').delete().eq('order_id', orderId);
  await supabase.from('transactions').delete().eq('order_id', orderId);

  const { data, error } = await supabase
    .from('orders')
    .delete()
    .eq('id', orderId)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Nenhuma linha foi excluída em orders — verifique RLS ou se o pedido já foi removido.');
  }
}

export async function duplicateOrder(orderId: string): Promise<{ id: string; number: string }> {
  const { data: original, error: origError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (origError || !original) throw new Error('Pedido original não encontrado');

  const [furnRes, servRes, prodRes, expRes] = await Promise.all([
    supabase.from('order_items_furniture').select('*').eq('order_id', orderId),
    supabase.from('order_items_services').select('*').eq('order_id', orderId),
    supabase.from('order_items_products').select('*').eq('order_id', orderId),
    supabase.from('order_expenses').select('*').eq('order_id', orderId),
  ]);

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
  const year = new Date().toISOString().slice(2, 4);
  const orderNumber = `${nextNumber}-${year}`;

  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert([{
      number: orderNumber,
      customer_id: original.customer_id,
      status: 'pending',
      order_date: new Date().toISOString().slice(0, 10),
      service_subtotal: original.service_subtotal || 0,
      product_subtotal: original.product_subtotal || 0,
      expenses_total: original.expenses_total || 0,
      freight: original.freight || 0,
      discount_type: original.discount_type,
      discount_value: original.discount_value || 0,
      total: original.total || 0,
      payment_method: original.payment_method,
      payment_condition: original.payment_condition,
      observations: original.observations,
    }])
    .select()
    .single();
  if (orderError) throw orderError;

  const furnitures = furnRes.data || [];
  if (furnitures.length > 0) {
    const { error } = await supabase.from('order_items_furniture').insert(
      furnitures.map((f, index) => ({
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
        ordem: index,
      }))
    );
    if (error) throw new Error('Falha ao duplicar móveis: ' + error.message);
  }

  const services = servRes.data || [];
  if (services.length > 0) {
    const { error } = await supabase.from('order_items_services').insert(
      services.map((s, index) => ({
        order_id: newOrder.id,
        service_name: s.service_name,
        value: s.value,
        is_chargeable: s.is_chargeable,
        quantity: s.quantity,
        unit: s.unit,
        ordem: index,
      }))
    );
    if (error) throw new Error('Falha ao duplicar serviços: ' + error.message);
  }

  const products = prodRes.data || [];
  if (products.length > 0) {
    const { error } = await supabase.from('order_items_products').insert(
      products.map((p, index) => ({
        order_id: newOrder.id,
        product_id: p.product_id,
        product_name: p.product_name,
        meters: p.meters,
        price_per_meter: p.price_per_meter,
        valor_custo: p.valor_custo,
        subtotal: p.subtotal,
        quantity: p.quantity,
        unit: p.unit,
        ordem: index,
      }))
    );
    if (error) throw new Error('Falha ao duplicar produtos: ' + error.message);
  }

  const expenses = expRes.data || [];
  if (expenses.length > 0) {
    const { error } = await supabase.from('order_expenses').insert(
      expenses.map(e => ({
        order_id: newOrder.id,
        name: e.name,
        value: e.value,
        category: e.category,
        is_paid: e.is_paid,
        is_chargeable: true,
        expense_date: new Date().toISOString().slice(0, 10),
      }))
    );
    if (error) throw new Error('Falha ao duplicar despesas: ' + error.message);
  }

  return { id: newOrder.id, number: orderNumber };
}

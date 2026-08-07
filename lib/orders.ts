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

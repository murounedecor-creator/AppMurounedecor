import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials not configured');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  cpf_cnpj: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  notes: string;
  created_at: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  name: string;
  code: string;
  sale_price_per_unit: number;
  cost_price_per_unit: number;
  unit_type: string;
  images: string[];
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  default_value: number;
  unit_type: string;
  description: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  customer_id: string;
  description: string;
  amount: number;
  amount_received: number;
  status: 'pending' | 'waiting_payment' | 'in_progress' | 'completed' | 'cancelled';
  type: 'revenue' | 'expense';
  date: string;
  due_date: string;
  payment_condition: string;
  order_id: string;
  category: string;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  customer_id: string;
  date: string;
  time: string;
  description: string;
  color: string;
  created_at: string;
};

export type Order = {
  id: string;
  number: string;
  customer_id: string;
  status: string;
  order_date: string;
  total: number;
  prazo_entrega: string | null;
  lembrete_dias_antes: number;
  notification_id: string | null;
  customer?: { name: string } | null;
};

export type OrderItemProduct = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  meters: number;
  price_per_meter: number;
  valor_custo: number;
  subtotal: number;
  quantity: number;
  unit: string;
  comprado: boolean;
  created_at: string;
};

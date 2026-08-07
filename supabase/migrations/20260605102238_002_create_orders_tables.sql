-- Criar tabela de pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  service_subtotal DECIMAL(10, 2) DEFAULT 0,
  product_subtotal DECIMAL(10, 2) DEFAULT 0,
  expenses_total DECIMAL(10, 2) DEFAULT 0,
  freight DECIMAL(10, 2) DEFAULT 0,
  discount_type TEXT,
  discount_value DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  payment_method TEXT,
  payment_condition TEXT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de móveis no pedido
CREATE TABLE order_items_furniture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  furniture_type TEXT NOT NULL,
  quantity_pieces INT DEFAULT 1,
  width_m DECIMAL(5, 2),
  depth_m DECIMAL(5, 2),
  height_m DECIMAL(5, 2),
  calculated_meters DECIMAL(10, 2),
  photo_base64 TEXT,
  retractable BOOLEAN,
  places INT,
  seat_cushions INT,
  backrest_cushions INT,
  decorative INT,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de serviços no pedido
CREATE TABLE order_items_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  is_chargeable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de produtos no pedido
CREATE TABLE order_items_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  meters DECIMAL(10, 2) NOT NULL,
  price_per_meter DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de despesas no pedido
CREATE TABLE order_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  is_chargeable BOOLEAN DEFAULT false,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_number ON orders(number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_items_furniture_order_id ON order_items_furniture(order_id);
CREATE INDEX idx_order_items_services_order_id ON order_items_services(order_id);
CREATE INDEX idx_order_items_products_order_id ON order_items_products(order_id);
CREATE INDEX idx_order_expenses_order_id ON order_expenses(order_id);

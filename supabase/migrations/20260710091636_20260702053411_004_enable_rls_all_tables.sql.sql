/*
# Enable RLS on all tables and create policies

1. Security Changes
- Enable Row Level Security on ALL public tables:
  - customers, products, services, transactions, orders
  - order_items_furniture, order_items_services, order_items_products, order_expenses
  - calendar_events

2. RLS Policies
- This is a no-auth single-tenant app. All data is intentionally shared/public.
- Each table gets 4 policies (SELECT, INSERT, UPDATE, DELETE) scoped to `TO anon, authenticated`.
- `USING (true)` / `WITH CHECK (true)` is correct here because the data is intentionally public (no sign-in screen).

3. Notes
- The app uses the anon key for all operations (no sign-in screen).
- Without `anon` in the policy roles, the app would see empty tables.
*/

-- Enable RLS on all public tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items_furniture ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- customers
DROP POLICY IF EXISTS "select_customers" ON customers;
CREATE POLICY "select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_customers" ON customers;
CREATE POLICY "insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_customers" ON customers;
CREATE POLICY "update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_customers" ON customers;
CREATE POLICY "delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- products
DROP POLICY IF EXISTS "select_products" ON products;
CREATE POLICY "select_products" ON products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_products" ON products;
CREATE POLICY "insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_products" ON products;
CREATE POLICY "update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_products" ON products;
CREATE POLICY "delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- services
DROP POLICY IF EXISTS "select_services" ON services;
CREATE POLICY "select_services" ON services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_services" ON services;
CREATE POLICY "insert_services" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_services" ON services;
CREATE POLICY "update_services" ON services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_services" ON services;
CREATE POLICY "delete_services" ON services FOR DELETE TO anon, authenticated USING (true);

-- transactions
DROP POLICY IF EXISTS "select_transactions" ON transactions;
CREATE POLICY "select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_transactions" ON transactions;
CREATE POLICY "insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_transactions" ON transactions;
CREATE POLICY "update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_transactions" ON transactions;
CREATE POLICY "delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

-- orders
DROP POLICY IF EXISTS "select_orders" ON orders;
CREATE POLICY "select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_orders" ON orders;
CREATE POLICY "insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_orders" ON orders;
CREATE POLICY "update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_orders" ON orders;
CREATE POLICY "delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- order_items_furniture
DROP POLICY IF EXISTS "select_order_items_furniture" ON order_items_furniture;
CREATE POLICY "select_order_items_furniture" ON order_items_furniture FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_order_items_furniture" ON order_items_furniture;
CREATE POLICY "insert_order_items_furniture" ON order_items_furniture FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_order_items_furniture" ON order_items_furniture;
CREATE POLICY "update_order_items_furniture" ON order_items_furniture FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_order_items_furniture" ON order_items_furniture;
CREATE POLICY "delete_order_items_furniture" ON order_items_furniture FOR DELETE TO anon, authenticated USING (true);

-- order_items_services
DROP POLICY IF EXISTS "select_order_items_services" ON order_items_services;
CREATE POLICY "select_order_items_services" ON order_items_services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_order_items_services" ON order_items_services;
CREATE POLICY "insert_order_items_services" ON order_items_services FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_order_items_services" ON order_items_services;
CREATE POLICY "update_order_items_services" ON order_items_services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_order_items_services" ON order_items_services;
CREATE POLICY "delete_order_items_services" ON order_items_services FOR DELETE TO anon, authenticated USING (true);

-- order_items_products
DROP POLICY IF EXISTS "select_order_items_products" ON order_items_products;
CREATE POLICY "select_order_items_products" ON order_items_products FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_order_items_products" ON order_items_products;
CREATE POLICY "insert_order_items_products" ON order_items_products FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_order_items_products" ON order_items_products;
CREATE POLICY "update_order_items_products" ON order_items_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_order_items_products" ON order_items_products;
CREATE POLICY "delete_order_items_products" ON order_items_products FOR DELETE TO anon, authenticated USING (true);

-- order_expenses
DROP POLICY IF EXISTS "select_order_expenses" ON order_expenses;
CREATE POLICY "select_order_expenses" ON order_expenses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_order_expenses" ON order_expenses;
CREATE POLICY "insert_order_expenses" ON order_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_order_expenses" ON order_expenses;
CREATE POLICY "update_order_expenses" ON order_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_order_expenses" ON order_expenses;
CREATE POLICY "delete_order_expenses" ON order_expenses FOR DELETE TO anon, authenticated USING (true);

-- calendar_events
DROP POLICY IF EXISTS "select_calendar_events" ON calendar_events;
CREATE POLICY "select_calendar_events" ON calendar_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_calendar_events" ON calendar_events;
CREATE POLICY "insert_calendar_events" ON calendar_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_calendar_events" ON calendar_events;
CREATE POLICY "update_calendar_events" ON calendar_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_calendar_events" ON calendar_events;
CREATE POLICY "delete_calendar_events" ON calendar_events FOR DELETE TO anon, authenticated USING (true);

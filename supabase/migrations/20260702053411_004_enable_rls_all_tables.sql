-- Enable RLS on all public tables (no-auth app: allow anon + authenticated)

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
CREATE POLICY "select_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_customers" ON customers FOR DELETE TO anon, authenticated USING (true);

-- products
CREATE POLICY "select_products" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- services
CREATE POLICY "select_services" ON services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_services" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_services" ON services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_services" ON services FOR DELETE TO anon, authenticated USING (true);

-- transactions
CREATE POLICY "select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

-- orders
CREATE POLICY "select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);

-- order_items_furniture
CREATE POLICY "select_order_items_furniture" ON order_items_furniture FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_order_items_furniture" ON order_items_furniture FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_order_items_furniture" ON order_items_furniture FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_order_items_furniture" ON order_items_furniture FOR DELETE TO anon, authenticated USING (true);

-- order_items_services
CREATE POLICY "select_order_items_services" ON order_items_services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_order_items_services" ON order_items_services FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_order_items_services" ON order_items_services FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_order_items_services" ON order_items_services FOR DELETE TO anon, authenticated USING (true);

-- order_items_products
CREATE POLICY "select_order_items_products" ON order_items_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_order_items_products" ON order_items_products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_order_items_products" ON order_items_products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_order_items_products" ON order_items_products FOR DELETE TO anon, authenticated USING (true);

-- order_expenses
CREATE POLICY "select_order_expenses" ON order_expenses FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_order_expenses" ON order_expenses FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_order_expenses" ON order_expenses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_order_expenses" ON order_expenses FOR DELETE TO anon, authenticated USING (true);

-- calendar_events
CREATE POLICY "select_calendar_events" ON calendar_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_calendar_events" ON calendar_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_calendar_events" ON calendar_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_calendar_events" ON calendar_events FOR DELETE TO anon, authenticated USING (true);

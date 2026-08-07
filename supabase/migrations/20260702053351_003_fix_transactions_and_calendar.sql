-- Add missing columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS amount_received DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'revenue',
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_condition TEXT,
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);

-- Ensure calendar_events table is correct (already exists, adding missing indexes)
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);

/*
# Fix transactions columns and create calendar_events table

1. Modified Tables
- `transactions`: Added missing columns:
  - `amount_received` (decimal, default 0) — partial payment tracking
  - `type` (text, default 'revenue') — revenue or expense
  - `due_date` (date) — payment due date
  - `payment_condition` (text) — payment terms
  - `order_id` (uuid, FK to orders) — link transaction to an order
  - `category` (text) — transaction category

2. New Tables
- `calendar_events`
  - `id` (uuid, primary key)
  - `title` (text, not null)
  - `customer_id` (uuid, FK to customers, nullable)
  - `date` (date, not null)
  - `time` (text, default '09:00')
  - `description` (text)
  - `color` (text, default '#C9A96E')
  - `created_at` (timestamptz, default now())

3. Indexes
- `idx_transactions_order_id` on transactions(order_id)
- `idx_transactions_type` on transactions(type)
- `idx_transactions_due_date` on transactions(due_date)
- `idx_calendar_events_date` on calendar_events(date)
- `idx_calendar_events_customer_id` on calendar_events(customer_id)

4. Security
- No RLS changes in this migration (applied in migration 004)

5. Notes
- This is a no-auth single-tenant app. RLS policies will be added in the next migration.
- calendar_events was referenced in the app code but never created; this fixes that.
*/

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

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  time TEXT DEFAULT '09:00',
  description TEXT,
  color TEXT DEFAULT '#C9A96E',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_customer_id ON calendar_events(customer_id);

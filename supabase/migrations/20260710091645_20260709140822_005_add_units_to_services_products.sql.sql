/*
# Add unit and quantity columns to order items tables

1. Modified Tables
- `order_items_services`: Added columns:
  - `quantity` (integer, default 1) — number of service units
  - `unit` (text, default 'Unitário') — unit type label

- `order_items_products`: Added columns:
  - `quantity` (integer, default 1) — number of product units
  - `unit` (text, default 'Unitário') — unit type label
  - `valor_custo` (decimal, default 0) — cost price for the product item

2. Security
- No RLS changes (policies already cover these tables)

3. Notes
- These columns support per-item quantity and unit labeling in orders.
*/

ALTER TABLE order_items_services 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Unitário';

ALTER TABLE order_items_products
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Unitário',
ADD COLUMN IF NOT EXISTS valor_custo DECIMAL(10,2) DEFAULT 0;

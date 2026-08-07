-- Add unit and quantity columns to order_items_services
ALTER TABLE order_items_services 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Unitário';

-- Add unit, quantity, and valor_custo columns to order_items_products
ALTER TABLE order_items_products
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Unitário',
ADD COLUMN IF NOT EXISTS valor_custo DECIMAL(10,2) DEFAULT 0;
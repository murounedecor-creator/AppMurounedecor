/*
# Ordem dos itens do pedido

1. Coluna `ordem` (integer, not null, default 0) em order_items_products,
   order_items_services e order_items_furniture.
2. Backfill pela ordem de gravação (created_at), para pedidos já existentes.
3. Sem mudança de RLS (tabelas já liberadas para anon + authenticated).
*/

ALTER TABLE order_items_products ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;
ALTER TABLE order_items_services ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;
ALTER TABLE order_items_furniture ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

UPDATE order_items_products p SET ordem = s.rn
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id) - 1 AS rn
      FROM order_items_products) s
WHERE p.id = s.id;

UPDATE order_items_services p SET ordem = s.rn
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id) - 1 AS rn
      FROM order_items_services) s
WHERE p.id = s.id;

UPDATE order_items_furniture p SET ordem = s.rn
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at, id) - 1 AS rn
      FROM order_items_furniture) s
WHERE p.id = s.id;

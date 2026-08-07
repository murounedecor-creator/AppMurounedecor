/*
# Campos de prazo de entrega, lembrete e compra

1. Contexto
- Esta migration prepara o banco para a feature de Entregas + Compras no
  Calendário (Parte 1 de 3). Ela adiciona colunas necessárias para:
  (a) registrar o prazo de entrega de um pedido e um lembrete automático
  X dias antes da entrega, com notificação local agendada no dispositivo;
  (b) marcar itens de produto de um pedido como "comprado" para a aba de
  Compras no calendário.
2. Novas colunas
- `orders.prazo_entrega` (date, nullable): data de entrega prometida ao
  cliente. Opcional — pedidos sem prazo não aparecem na aba Entregas.
- `orders.lembrete_dias_antes` (integer, not null, default 1): quantos
  dias antes de `prazo_entrega` o app deve disparar a notificação local
  de lembrete. Default 1 (na véspera).
- `orders.notification_id` (text, nullable): identificador da
  notificação local agendada via expo-notifications. Guardado para
  permitir cancelamento quando o pedido é editado, excluído ou muda de
  status. Null quando não há notificação agendada.
- `order_items_products.comprado` (boolean, not null, default false):
  marca se o item da lista de compras já foi comprado. Usado pela aba
  Compras no calendário para agrupar itens pendentes de pedidos em
  andamento.
3. Tabelas modificadas
- `orders`: 3 novas colunas (acima).
- `order_items_products`: 1 nova coluna (acima).
4. Segurança
- Sem mudanças em RLS. As políticas DELETE/INSERT/UPDATE/SELECT já
  existem para `anon, authenticated` em ambas as tabelas (migration
  004), e as novas colunas herdam essas políticas automaticamente.
5. Notas
- `IF NOT EXISTS` em todos os ADD COLUMN para idempotência.
- Nenhum dado existente é alterado: `prazo_entrega` e `notification_id`
  ficam null; `lembrete_dias_antes` fica 1; `comprado` fica false.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS prazo_entrega date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lembrete_dias_antes integer NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notification_id text;

ALTER TABLE order_items_products ADD COLUMN IF NOT EXISTS comprado boolean NOT NULL DEFAULT false;

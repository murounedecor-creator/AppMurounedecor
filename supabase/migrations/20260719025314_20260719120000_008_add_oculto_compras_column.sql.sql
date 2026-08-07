/*
# Adiciona coluna oculto_compras em order_items_products

1. Alterações
- `order_items_products.oculto_compras` (boolean, not null, default false):
  marca se o item foi removido da lista de compras na aba Compras da Agenda.
  Quando true, o item não aparece mais na lista de compras, mas continua existindo
  no pedido normalmente — não é exclusão, apenas ocultação visual (regra 2 do
  projeto: ocultar != excluir).

2. Segurança
- Sem mudanças em RLS. A tabela order_items_products já tem RLS habilitado
  pela migration 004_enable_rls_all_tables. A nova coluna herda as políticas
  existentes (anon + authenticated CRUD, single-tenant sem auth).

3. Notas
- Operação puramente aditiva (ADD COLUMN IF NOT EXISTS). Segura para re-executar.
- O default false garante que todos os itens existentes continuem aparecendo na
  lista de compras até serem explicitamente removidos pelo usuário.
*/

ALTER TABLE order_items_products ADD COLUMN IF NOT EXISTS oculto_compras boolean NOT NULL DEFAULT false;
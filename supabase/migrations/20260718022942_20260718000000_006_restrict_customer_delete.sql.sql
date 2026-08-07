/*
# Restringir exclusão de cliente com pedidos vinculados

1. Contexto
- Antes: `orders.customer_id REFERENCES customers(id) ON DELETE CASCADE`.
- Problema: ao excluir um cliente que possui pedidos, o Postgres apagava
  silenciosamente todos os pedidos relacionados (e seus itens, via cascade
  interno). O frontend esperava capturar o erro de FK 23503 para mostrar
  a mensagem "Este cliente possui pedidos vinculados", mas o cascade
  impedia esse erro — a exclusão sempre "succeedia" e o usuário perdia
  pedidos inteiros sem aviso.
2. Mudança
- Substituir a FK existente em `orders.customer_id` por uma nova com
  `ON DELETE RESTRICT`, que é o comportamento desejado: tentar excluir
  um cliente com pedidos lança o erro 23503 (foreign_key_violation),
  permitindo ao frontend exibir a mensagem específica.
- `transactions.customer_id` continua CASCADE (transações são
  independentes de pedidos; ao excluir um cliente sem pedidos, suas
  transações financeiras históricas também são removidas, mantendo
  o comportamento atual).
- `calendar_events.customer_id` continua SET NULL (eventos órfãos
  permanecem no calendário sem cliente).
3. Segurança
- Sem mudanças em RLS — todas as políticas DELETE já existem para
  anon + authenticated em todas as tabelas relevantes.
4. Notas
- A operação é segura: dropar e recriar a constraint não afeta dados
  existentes, apenas muda o comportamento de futuras tentativas de
  exclusão.
- Idempotente: usa `IF EXISTS` no DROP e nomes fixos de constraint.
*/

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

ALTER TABLE orders
  ADD CONSTRAINT orders_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id)
  ON DELETE RESTRICT;

## Parte 3: PDV com Mesas

Sistema de Ponto de Venda integrado ao painel Admin para atendimento presencial (balcão + mesas), reaproveitando produtos, categorias, cashback e impressão já existentes.

### Banco de dados

Nova migration com:

- **`tables`** — mesas físicas da loja (`store_id`, `number`, `label`, `seats`, `status`: `free|occupied|reserved`, `sort_order`).
- **`pdv_sessions`** — comanda aberta (mesa ou balcão). Campos: `store_id`, `table_id` (nullable → balcão), `opened_by` (user_id do atendente), `customer_name`, `customer_phone`, `status`: `open|closed|canceled`, `subtotal`, `discount`, `total`, `payment_method`, `opened_at`, `closed_at`.
- **`pdv_session_items`** — itens da comanda. Campos: `session_id`, `product_id`, `name`, `unit_price`, `quantity`, `modifiers` (jsonb), `note`, `sent_to_kitchen_at`.
- RLS: apenas `owner` + `store_members` com role `manager` ou `attendant` operam PDV; `kitchen` apenas lê itens enviados.
- Realtime habilitado em `tables`, `pdv_sessions`, `pdv_session_items` (KDS + atualização de mapa de mesas).
- Função `close_pdv_session(session_id, payment_method)` — fecha comanda, cria um registro em `orders` (origem `pdv`), aplica cashback via `process_order_cashback`, libera a mesa.

### Frontend

Nova aba **"PDV"** no `Admin.tsx` (visível para owner/manager/attendant).

**Layout mobile-first, 3 telas:**

1. **Mapa de mesas** — grid de cards coloridos (verde = livre, laranja = ocupada, azul = reservada) + botão "Balcão / Viagem" no topo. Toque na mesa livre abre nova comanda; toque em ocupada abre a comanda existente.
2. **Comanda aberta** — busca de produto (mesma lista do catálogo), lista de itens adicionados, subtotal ao vivo, botões: `+ Item`, `Enviar p/ cozinha` (imprime cupom da cozinha via `printReceipt.ts`), `Fechar conta`.
3. **Fechamento** — resumo, seleção de forma de pagamento (Dinheiro / Cartão / PIX), aplicação opcional de cashback do cliente (reaproveita `get_cashback_balance` por telefone), botão "Finalizar & Imprimir" que chama a RPC `close_pdv_session`, imprime cupom do cliente e volta ao mapa.

**Arquivos novos:**

- `src/components/pdv/PdvTab.tsx` — container + roteamento interno das 3 telas.
- `src/components/pdv/TablesMap.tsx` — grid de mesas + botão balcão.
- `src/components/pdv/SessionEditor.tsx` — edição da comanda (busca produto, lista, envio p/ cozinha).
- `src/components/pdv/SessionCheckout.tsx` — tela de fechamento com pagamento + cashback.
- `src/components/pdv/TableManagerDialog.tsx` — CRUD de mesas (owner/manager) acessível a partir do mapa.
- `src/lib/pdv.ts` — helpers de RPC/subscription realtime.

**Arquivos alterados:**

- `src/pages/Admin.tsx` — nova aba "PDV" com ícone, condicionada ao papel do usuário.
- `src/lib/printReceipt.ts` — extensão para imprimir cupom de cozinha (só itens + mesa) e cupom cliente (com total + pagamento).

### Fora de escopo (fica pra próxima)

- Divisão de conta por pessoa.
- Impressora térmica dedicada por rede (usaremos o mesmo `window.print` já implementado).
- Fluxo de caixa/abertura de turno.

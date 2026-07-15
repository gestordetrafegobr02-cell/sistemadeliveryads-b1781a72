## Objetivo
Deixar a DeliveryPro com a mesma proposta e estrutura do PedidosZapp, mantendo a identidade laranja/preta, e adicionar dois recursos que faltam: multi-usuários com permissões e PDV com controle de mesas.

---

## Parte 1 — Redesign da Landing Page (`src/pages/Index.tsx`)

Replicar as seções na mesma ordem e proporção do PedidosZapp:

### 1.1 Header simples
- Logo DeliveryPro à esquerda
- Menu: **Preços · Cadastro · Entrar** (botão laranja)
- Sem hero pesado de 3D — versão mais leve e comercial

### 1.2 Hero
- Título grande: "Cardápio digital e gestor de pedidos por **R$ 49,90/mês**" (mantém preço atual)
- Subtítulo: "7 dias grátis sem compromisso"
- Dois CTAs: **"Chamar no WhatsApp"** (outline) e **"Cadastrar"** (laranja sólido)
- Mockup celular + painel admin lado direito (reaproveitar `PhoneMockup` + screenshot painel)

### 1.3 Seção "Como funciona?"
4 passos com ícones coloridos em quadrado arredondado:
1. Seu negócio online (loja) 
2. Endereço de entrega (pin)
3. Forma de pagamento (carteira)
4. E por fim, Delivery (caminhão)

Badge inferior: "Processo 100% automatizado"

### 1.4 Grid "Nossos recursos" (8 cards)
Cards uniformes com ícone gradient + título + descrição:
1. Cardápio personalizável
2. PDV, retirada, delivery e mesas
3. Painel para gestão completa
4. Sem limites de produtos e pedidos
5. Impressão automática
6. Controle via celular
7. Usuários e permissões
8. Relatórios de vendas e clientes

### 1.5 Mockup grande do painel admin + impressora térmica

### 1.6 Pricing (manter atual R$ 49,90 com destaque)

### 1.7 FAQ + Footer (manter os componentes existentes)

**Remover:** `Floating3DScene`, `Tilt3DCard` e mockups exagerados 3D — landing fica mais "SaaS comercial", menos "produto premium abstrato".

---

## Parte 2 — Usuários e Permissões (multi-operadores por loja)

### 2.1 Banco de dados
- Enum `store_role`: `owner`, `manager`, `attendant`, `kitchen`
- Tabela `store_members(store_id, user_id, role, created_at)` com GRANT + RLS
- Função `has_store_role(store_id, user_id, role)` security definer
- Policies em `orders`, `products`, `categories` etc. estendidas para aceitar membros da loja (não só `owner_id`)

### 2.2 UI (Admin panel — nova sub-aba "Equipe")
- Listar membros atuais com role
- Convidar por email (edge function `invite-store-member`: cria user via service_role se não existe, envia senha temporária, insere em `store_members`)
- Alterar role (dropdown)
- Remover membro
- Apenas `owner` pode gerenciar equipe

### 2.3 Filtragem por permissão
- `attendant`: só vê Pedidos
- `kitchen`: só vê Pedidos com botão imprimir
- `manager`: tudo exceto Equipe/Financeiro
- `owner`: tudo

---

## Parte 3 — PDV com Mesas (atendimento presencial)

### 3.1 Banco de dados
- Tabela `store_tables(id, store_id, number, name, status, current_order_id)` — status: `livre`, `ocupada`, `aguardando_pagamento`
- Coluna `orders.table_id` + `orders.channel` (`delivery` | `pickup` | `table`)

### 3.2 UI (nova aba "PDV" no Admin)
- Grid visual de mesas (cards coloridos por status)
- Clicar em mesa → abre modal PDV:
  - Buscador de produtos (mesmo componente do cardápio interno)
  - Carrinho da comanda
  - Botões: **Enviar para cozinha** (cria order status=`preparing`), **Adicionar itens**, **Fechar conta** (marca `aguardando_pagamento`), **Pagar** (finaliza)
- Impressão automática de comanda para cozinha ao enviar

### 3.3 Cadastro de mesas
- Aba "Loja" ganha seção "Mesas": adicionar/remover/renomear mesas

---

## Ordem de entrega
1. **Parte 1** (landing) — visual imediato, 1 mensagem
2. **Parte 2** (usuários/permissões) — infra + UI, 1 mensagem
3. **Parte 3** (PDV mesas) — mais complexo, 1 mensagem

## Detalhes técnicos
- Migration única por parte
- Reutilizar `PrintCashbackSettings`, `printOrderReceipt`, componentes shadcn existentes
- Nenhuma quebra do fluxo WhatsApp atual (delivery continua igual)
- Cores: manter tokens `--primary` (laranja) e `--background` (preto) já definidos em `index.css`

Confirmando: começo pela **Parte 1 (landing)** assim que aprovar?

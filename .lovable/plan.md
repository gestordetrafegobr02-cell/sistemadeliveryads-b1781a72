# Plano de Implementação - Modificadores Inclusos (Padrão)

O usuário deseja que no painel administrativo de produtos seja possível definir quais itens de um grupo de modificadores já vêm inclusos no produto (selecionados por padrão), sendo o restante considerado adicional pago.

## Alterações Propostas

### 1. Banco de Dados (Supabase)
- A coluna `is_default` já existe na tabela `product_modifiers` e `modifier_library`.
- Garantir que a lógica de aplicação da biblioteca para o produto (`apply_library_group_to_product`) respeite essa coluna.

### 2. Painel Administrativo (`src/components/ProductModifiersEditor.tsx`)
- Adicionar um `Switch` na listagem de modificadores de um produto específico para marcar/desmarcar o item como "Incluso por padrão" (`is_default`).
- Adicionar o campo no formulário de criação de novo modificador.

### 3. Biblioteca de Modificadores (`src/components/ModifierLibraryTab.tsx`)
- O campo "Já vem incluso" já existe no diálogo de edição (`is_default`), mas precisamos garantir que a interface reflita bem essa distinção.
- Adicionar um indicativo visual (badge) na listagem da biblioteca para itens inclusos.

### 4. Menu Público (`src/components/ProductModifierSelect.tsx`)
- A lógica de pré-seleção baseada em `is_default` já existe (Linha 70).
- Vou revisar se a exibição de preço para itens inclusos (R$ 0,00 quando selecionados, ou preço original se forem extras) está clara.

## Verificação
- Criar um produto.
- Adicionar modificadores e marcar alguns como "Incluso".
- Abrir o cardápio e verificar se os itens marcados já iniciam selecionados e se o preço total reflete corretamente (itens inclusos geralmente não somam ao preço base se o preço base já contempla o produto completo).

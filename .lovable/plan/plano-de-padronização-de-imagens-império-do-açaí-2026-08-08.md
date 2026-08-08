# Plano de Padronização de Imagens - Império do Açaí

Este plano detalha a geração e atualização de imagens para os produtos da loja "Império do Açaí" (`imperio-do-acai-cnn`), garantindo que todos os itens sigam o padrão visual de alta qualidade já estabelecido na loja.

## Análise de Status
- **Loja:** Império do Açaí (ID: `6c6bb9ea-6976-4fcc-9f0c-7f1f8328d62b`)
- **Padrão Visual:** Imagens de estúdio, iluminação premium, fundo limpo ou contextualizado com foco no produto (ex: `/acai-morango.jpg`, `/acai-1litro.jpg`).
- **Produtos Faltantes:** 15 itens identificados sem imagem (principalmente complementos, adicionais e cremes).

## Ações

### 1. Geração de Imagens via IA
Gerar imagens realistas no estilo "food photography" para os seguintes grupos:
- **Complementos Crocantes:** Granola, Paçoca, Chocobool, Gotas de Chocolate, M&M's.
- **Caldas e Líquidos:** Leite Condensado, Calda de Chocolate, Leite em Pó.
- **Frutas e Adicionais:** Morango, Frutas picadas, Nutella, Bolacha Negresco.
- **Cremes e Especiais:** Creme de Ninho, Cupuaçu, Mousse de Maracujá.

### 2. Atualização do Banco de Dados
Vincular as novas URLs geradas aos IDs correspondentes na tabela `public.products`.

### 3. Sincronização com Banco de Imagens
Adicionar as novas imagens à tabela `public.menu_image_bank` para uso futuro em outras lojas com o mesmo padrão.

## Verificação
- Validar se todos os 15 produtos agora possuem `image_url` válida.
- Visualizar os cards de produtos no preview para garantir a consistência visual.

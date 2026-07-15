# Plano de melhorias

Três frentes em paralelo. Foco em resultado visível: landing mais premium, admin mais leve, e banco de imagens que já vem cheio pras lojas novas.

## 1. Landing page — 3D real + fundo animado

**Ícones 3D realistas**
- Gerar 6 novos ícones 3D premium (glass/clay style, sombras profundas, iluminação studio) via `imagegen`:
  - Smartphone com cardápio, sacola de delivery, moto/entrega, gráfico de crescimento, balão WhatsApp, cartão de fidelidade.
- Substituir os ícones lucide simples em `Floating3DScene.tsx` e nos cards de features por esses PNGs 3D usando o componente `Icon3D` já existente (com float + tilt).
- Trocar os ícones da seção "Como funciona" e do "Ecossistema" pelos novos assets.

**Fundo animado global (leve)**
- Novo componente `AnimatedBackground.tsx` fixo atrás do conteúdo da landing:
  - Grid de pontos em SVG com deslocamento sutil (CSS/Framer),
  - 2–3 blobs de gradiente (orange/emerald) com `filter: blur` fazendo drift lento em loop infinito,
  - Camada de "noise" bem sutil pra dar textura.
- Performance: `will-change: transform`, `prefers-reduced-motion` respeitado, `pointer-events: none`.

## 2. Painel Admin — limpeza e navegação

- Auditar `Admin.tsx` e componentes:
  - Remover badge de versão `v1.1.x-clean` e `DemoModeBanner` se não estiver ativo.
  - Consolidar abas duplicadas/pouco usadas (agrupar "Impressão", "Cashback", "Upsell" em uma única aba **Configurações da Loja** com sub-seções).
  - Ordem final das abas: **Dashboard · Pedidos · PDV · Produtos · Categorias · Loja · Equipe**.
- Header do Admin: reduzir altura, mover link da loja + copiar pra um botão único com dropdown, manter só ThemeToggle + Sair visíveis.
- Sidebar/tabs mobile: usar scroll horizontal com snap em vez de wrap quebrando linhas.
- Remover imports/variáveis mortos que a limpeza revelar.

## 3. Banco de imagens compartilhado — extrair fotos reais das lojas

**Coleta**
- Query em `products` de todas as lojas ativas com `image_url` não nulo.
- Agrupar por categoria (Hambúrgueres, Pizzas, Açaí, Bebidas, Sobremesas, Acompanhamentos, Sorvetes, Milkshakes).
- Deduplicar por URL.

**Publicação**
- Nova tabela `public.menu_image_bank`:
  - `id uuid pk`, `category text`, `name text`, `url text`, `sort_order int`, `created_at timestamptz`.
  - RLS: SELECT liberado pra `authenticated`, INSERT/UPDATE/DELETE só `master_admin`.
  - GRANTs explícitos.
- Seed inicial via migration: inserir todas as URLs coletadas (com nome inferido do produto).
- Refatorar `src/utils/menuAssets.ts` + `MenuImagePicker.tsx` pra ler do banco (hook `useMenuImageBank`) em vez do array hard-coded, mantendo fallback pro array atual se a query falhar.

**Uso**
- No editor de produto, o picker agora mostra dezenas de opções reais organizadas por categoria — loja nova cria produto e já tem foto profissional disponível sem upload.

## Detalhes técnicos

- Assets 3D: salvos em `src/assets/landing/` como PNG com transparência, importados como ES6 modules.
- Fundo animado: puro CSS + Framer, sem canvas/webgl (mantém FPS no mobile).
- Migration única pra criar `menu_image_bank` + seed + GRANTs + RLS.
- Nenhuma mudança em auth, checkout ou WhatsApp flow.

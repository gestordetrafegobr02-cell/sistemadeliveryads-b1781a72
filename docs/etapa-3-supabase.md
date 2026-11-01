# Etapa 3 — provisionamento do Supabase

## Projeto de destino

- Projeto: `sistema-delivery-ads-novo`
- Project ref: `ribszysudwmzbzgnymrz`
- Região: `sa-east-1`
- API URL: `https://ribszysudwmzbzgnymrz.supabase.co`
- A branch de trabalho e o `supabase/config.toml` foram apontados para este projeto.
- A chave publishable é pública e foi configurada no `.env` da branch. Nenhuma chave service-role foi colocada no frontend ou no Git.

## Banco de dados

- 21 tabelas no schema `public`; RLS habilitado em todas.
- Bucket `store-assets` existente.
- Migrações do repositório aplicadas em sequência, com adaptações registradas abaixo.
- Tipos TypeScript regenerados a partir do banco novo.
- Índices criados para as oito chaves estrangeiras apontadas pelo advisor de performance.
- Dados iniciais preservados somente para catálogos de templates/configurações e banco de imagens: 5 templates, 3 configurações globais e 38 imagens.
- Nenhuma loja, conta, pedido ou produto real foi importado. O banco original não está acessível pela conexão Supabase atual.

## Adaptações durante a aplicação

1. A migração de lojas demonstrativas dependia de um UUID de administrador inexistente no projeto novo. Foi aplicada a alteração de schema, mas não foram criadas lojas/produtos demonstrativos nem um usuário fictício.
2. Uma migração tenta alterar `realtime.messages`, tabela gerenciada pelo Supabase. A plataforma recusou a alteração por falta de propriedade da tabela. As alterações seguras em `global_settings` e `stores` foram aplicadas; o bloco de Realtime e as políticas Storage dessa migração não foram executados.
3. Duas migrações de grants citavam `create_store_manual(...)`, função ausente no conjunto de migrações. Os grants foram aplicados condicionalmente às funções existentes, sem criar uma função fictícia.
4. O acesso a configurações globais foi restringido: chaves públicas continuam disponíveis e demais chaves exigem master admin. RPCs de alteração de grupos de adicionais deixaram de aceitar chamadas anônimas; a função de trigger não é executável diretamente por clientes.

## Edge Functions

Ativas no projeto:
- `admin-change-email`
- `og-preview`
- `ai-import-menu`
- `notify-lead`
- `push-subscribe`
- `send-order-push`

Não implantadas:
- `admin-reset-password`
- `invite-store-member`

A implantação dessas duas funções foi bloqueada pela camada de segurança da ferramenta. Não foram substituídas por stubs.

## Configurações externas pendentes

As funções de IA e Web Push exigem configurações secretas que não foram transferidas do projeto antigo:
- `LOVABLE_API_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_JWK`
- `VAPID_SUBJECT`

Não há ferramenta de gerenciamento de secrets disponível nesta conexão; portanto, não foram inventadas chaves nem incluídas no repositório.

## Validação

- GitHub Actions: testes de horário, lint dos arquivos TypeScript alterados e build de produção passaram no commit de código mais recente.
- Advisors Supabase: RLS está ativo em todas as tabelas públicas; permanecem avisos de grants SECURITY DEFINER que são usados por fluxos públicos/autenticados, políticas permissivas sobrepostas e otimizações de RLS. Esses avisos exigem revisão funcional antes de um endurecimento mais amplo.
- PR #1 permanece em rascunho, sem merge. `main` não foi alterada.
- Nenhum deploy de produção foi realizado.

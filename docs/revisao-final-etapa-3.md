# Revisão final — autenticação e integração Supabase

Data da revisão: 2026-11-01
Branch: `correcao-completa-sistema`
Projeto Supabase de validação: `ribszysudwmzbzgnymrz`

## Resultado da revisão

O preview Vercel foi aberto pelo usuário e apresentou a tela de login. Isso confirma que a aplicação está sendo servida e que a tela inicial carrega; não comprova autenticação funcional nem fluxos internos.

Consultas somente de leitura ao novo projeto retornaram:
- `auth.users`: 0 registros.
- `public.profiles`: 0 registros.
- Trigger `on_auth_user_created` presente, chamando `public.handle_new_user()`.
- `handle_new_user()` cria o perfil com `id` e `email` do novo usuário.

Portanto, não existe conta de acesso no projeto novo e não foi possível realizar um login real. Nenhuma conta foi criada nesta revisão.

## Pontos de atenção encontrados no código

### `invite-store-member`
- Valida JWT e confirma que o solicitante é o proprietário da loja.
- Cria uma conta com senha temporária para e-mail ainda não cadastrado e preserva credenciais de contas existentes.
- A resposta contém a senha temporária em texto claro para o chamador; o fluxo de entrega e troca obrigatória dessa senha precisa ser validado antes de habilitar convites em ambiente real.
- A autorização atual é restrita ao proprietário, embora o tipo de papel aceite manager, attendant e kitchen.

### `admin-reset-password`
- A autorização de administrador está baseada em comparação com um e-mail fixo no código, em vez de uma atribuição de papel/claim administrável e auditável.
- O endpoint aceita `userId` e senha enviados no corpo, sem validação de método HTTP, tamanho máximo do corpo, política robusta de senha ou limitação de tentativas.
- Retorna erros genéricos com status 400 e usa CORS aberto.
- Recomendação: não publicar/ativar esta função até substituir a autorização fixa por uma verificação de papel privilegiado mantida no servidor, validar o alvo e a política de senha, restringir métodos/origens e registrar auditoria sem expor segredos.

## Configuração e implantação

- O projeto novo contém as tabelas reconstruídas e RLS está habilitado nas 21 tabelas públicas.
- Não há usuários, perfis, membros, lojas ou pedidos reais migrados para este projeto.
- Seis Edge Functions estavam implantadas na verificação anterior. `admin-reset-password` e `invite-store-member` permanecem pendentes de implantação.
- A conexão de ferramentas disponível não expõe uma operação segura para configurar/verificar secrets do Supabase. Não foram solicitados nem inseridos segredos no chat.
- Dependências de secrets ainda identificadas no projeto: `LOVABLE_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK` e `VAPID_SUBJECT`.
- O endpoint de notificações e os fluxos de convite/importação precisam de teste autenticado após existir uma conta autorizada e as secrets necessárias estarem configuradas.

## Decisão da revisão

**Status: revisão técnica parcial concluída; sistema ainda não liberado para operação real.**

Não realizar cadastro de lojas reais, importação de dados, envio de convites, redefinição de senhas, merge do PR ou deploy de produção até:
1. Configurar secrets pelo painel seguro do Supabase.
2. Criar/confirmar a primeira conta administrativa por um procedimento controlado.
3. Corrigir e revisar `admin-reset-password`.
4. Validar o fluxo de convite e a entrega/troca de senha temporária.
5. Executar testes autenticados de login, sessão, permissões, PDV, checkout e notificações.

A branch `main` permanece intacta e o PR #1 permanece em rascunho, sem merge.

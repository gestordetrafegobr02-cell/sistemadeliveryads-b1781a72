# Ações necessárias para finalizar o ambiente novo

## Estado confirmado em 2026-11-01
- Projeto Supabase sistema-delivery-ads-novo está ativo.
- O preview Vercel abre e mostra a tela de login.
- O workflow GitHub Actions do commit ead342fb2deac83625961818994d95babc350980 concluiu com sucesso.
- auth.users, profiles e user_roles estão vazias (0 registros).
- O enum app_role oferece admin, moderator e user.
- O trigger de criação de perfil existe e insere o perfil quando um usuário é criado no Auth.
- Não há migração de dados de lojas/clientes para o projeto novo.
- Não houve deploy em produção nem merge em main.

## Ações que dependem do titular

### 1. Configurar secrets no Supabase Dashboard
A integração atual permite consultar e implantar Edge Functions, mas não disponibiliza gestão de secrets. Abra o projeto sistema-delivery-ads-novo no Supabase Dashboard e acesse Edge Functions → Secrets.

Cadastrar:
- LOVABLE_API_KEY: chave do Lovable AI Gateway usada pela importação de cardápio com IA. Sem ela, esse recurso não funciona.
- VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK e VAPID_SUBJECT: configuração Web Push. As chaves devem formar um par VAPID válido; subject deve ser um contato aceito pelo padrão, normalmente mailto:... .

Nunca cole chaves privadas, service-role ou outros segredos no chat. Insira diretamente no painel seguro.

### 2. Criar o primeiro usuário administrativo
O banco novo não tem nenhum usuário. No Supabase Dashboard, acesse Authentication → Users → Add user e crie a conta do administrador titular com senha definida pelo próprio titular. Confirme o e-mail somente se controlar aquele endereço.

O trigger criará o perfil automaticamente. O papel admin existe em public.user_roles e deve ser associado ao UUID do usuário recém-criado por procedimento administrativo seguro no SQL Editor. Não atribua papel admin a usuários de clientes.

O endereço de e-mail fixo presente em is_master_admin() e em admin-reset-password deve ser confirmado pelo titular. A função de redefinição de senha não deve ser implantada antes de refatorar e auditar sua autorização.

## O que não precisa ser conectado novamente
- GitHub: já conectado e com branch/PR acessíveis.
- Vercel: já autorizado; preview configurado com variáveis do projeto novo.
- Supabase: projeto novo já acessível pela integração. Não é necessário conectar outra conta para os passos de leitura e auditoria.

## Pendências técnicas do código
- Corrigir admin-reset-password para usar papel privilegiado verificado no servidor, com validações de método, payload e política de senha.
- Revisar invite-store-member e a entrega/troca de senha temporária antes de ativar convites reais.
- Testar autenticação, permissões e operações com a primeira conta administrativa e uma loja de teste.
- Revisar os avisos do Supabase Advisor. Auditoria reporta 12 funções SECURITY DEFINER executáveis por anon e 47 por authenticated, além de políticas permissivas sobrepostas. Não revogar em lote: parte das RPCs é necessária para checkout e consulta pública.
- Confirmar secrets exigidas pelas funções e testar Web Push/importação de IA após configuração.

## Sequência
1. Titular cadastra as secrets no painel seguro.
2. Titular cria a primeira conta administrativa e associa o papel admin pelo procedimento seguro.
3. Equipe técnica corrige e revisa as duas Edge Functions pendentes e faz deploy no projeto de validação.
4. Executar testes autenticados e de checkout/PDV/convites/notificações.
5. Reavaliar advisors, atualizar documentação e apresentar aprovação final.
6. Só então discutir merge do PR e publicação em produção, em aprovação separada.
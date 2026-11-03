# Inicialização do primeiro administrador master

O banco novo não possui usuários reais. O primeiro acesso master deve ser concedido somente depois que o proprietário criar a própria conta, nunca automaticamente ao primeiro visitante.

## Procedimento seguro inicial
1. No endereço de preview, use **Criar Conta** com o e-mail que será o proprietário da plataforma e confirme o endereço.
2. No Supabase do projeto `ribszysudwmzbzgnymrz`, abra SQL Editor e execute a consulta abaixo substituindo o e-mail pelo mesmo e-mail confirmado:
```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where lower(email) = lower('SEU_EMAIL_CONFIRMADO')
on conflict do nothing;
```
3. Faça login novamente. A autorização master é verificada no banco pela função `is_master_admin()`, sem e-mail fixo no frontend.
4. A partir do painel master, crie lojas para usuários que já tenham criado suas contas.

> Não compartilhe service_role, tokens ou senhas. Não execute este SQL para contas de terceiros.

## Configurações externas ainda necessárias
- `LOVABLE_API_KEY`: necessária para importação de cardápio por IA.
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_JWK`, `VAPID_SUBJECT`: necessárias para Web Push.
Configure os valores diretamente em Supabase > Edge Functions > Secrets. Não os coloque no GitHub ou no chat.

## Limitações operacionais
- A integração disponível não oferece ação de exclusão definitiva de projeto Supabase. O projeto antigo visível na organização está INACTIVE; o projeto novo permanece ACTIVE_HEALTHY. A exclusão definitiva deve ser confirmada no painel Supabase após conferir o identificador. O projeto antigo não foi alterado.
- A criação e teste de login real dependem da confirmação de e-mail e da concessão inicial da role acima.

# Ações necessárias para finalizar o ambiente novo

## Estado confirmado em 2026-11-01
- Projeto Supabase `sistema-delivery-ads-novo` (ref `ribszysudwmzbzgnymrz`) está ativo.
- O preview Vercel já foi aberto e mostrou a tela de login.
- A conta titular `igormoises.ads@gmail.com` foi criada e confirmada.
- A role `admin` foi associada à conta titular; o usuário confirmou que conseguiu entrar no painel Admin Master.
- O primeiro acesso master está concluído e validado.
- A função Edge `ai-import-menu` está implantada no projeto novo, com JWT obrigatório, usando Gemini 2.5 Flash. A chamada real ainda não foi testada porque `GEMINI_API_KEY` não está cadastrada.
- O trigger de Web Push aponta para o projeto novo e valida um segredo interno guardado no banco.
- As demais correções de checkout, horários overnight, PWA/push, convites, PDV e validação de destinos foram aplicadas na branch de correção.
- GitHub Actions `Validate application` concluiu com sucesso no commit atual `88d79b69edafbc33af63b73d8d14ad8faedd850c`.
- PR #1 permanece aberto como draft, base `main`, sem merge. Nenhuma publicação em produção foi feita.

## Ações externas ainda necessárias

### 1. Configurar Gemini
No Supabase Dashboard, acesse Edge Functions → Secrets e cadastre:
- `GEMINI_API_KEY`: chave criada no Google AI Studio para Gemini 2.5 Flash.

A chave não deve ser enviada pelo chat, colocada no GitHub ou incluída em arquivos do projeto. A integração atual permite consultar e implantar Edge Functions, mas não disponibiliza gestão de secrets. A chamada real à função só poderá ser validada depois que a secret estiver cadastrada.

A cota gratuita depende do modelo, projeto e limites vigentes. Antes de enviar dados reais de lojas, o titular deve verificar e aceitar as condições de privacidade e uso de dados do plano escolhido.

### 2. Configurar Web Push (VAPID)
É necessário gerar um novo par VAPID correspondente. O par privado compartilhado anteriormente deve ser considerado comprometido e não pode ser reutilizado.

Cadastrar no Supabase Edge Function Secrets:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_JWK`
- `VAPID_SUBJECT` (valor no formato `mailto:...`, usando um contato controlado pelo titular).

A chave pública também precisa substituir o valor atualmente embutido em `src/hooks/usePushNotifications.ts` na branch `correcao-completa-sistema`. O valor do frontend e o secret público do Supabase precisam ser exatamente a mesma chave do novo par. A chave privada deve permanecer somente no Supabase Secrets e nunca ser enviada pelo chat ou commitada no repositório.

### 3. Testes finais dependentes das secrets
Após cadastrar os secrets:
- Testar importação de cardápio com Gemini usando imagem e texto de teste, sem dados reais sensíveis.
- Testar inscrição e envio de notificação push em navegador compatível.
- Validar checkout, criação/consulta de pedido, PDV, convites e permissões com uma loja de teste.
- Verificar logs de Edge Functions e confirmar ausência de erros de configuração.

## Revisão de segurança pendente
O Supabase Advisor apresenta alertas sobre funções `SECURITY DEFINER` executáveis por `anon` e `authenticated`, além de políticas permissivas sobrepostas. Algumas RPCs fazem parte deliberada do checkout público e de funcionalidades autenticadas. Não revogar permissões em lote: cada função/política precisa ser revisada individualmente, com testes de regressão para evitar quebrar checkout, consulta de pedidos ou operações de loja.

O alerta de RLS habilitado sem políticas na tabela `internal_function_secrets` é esperado para uma tabela interna que não deve ser acessível pelos clientes; manter sem políticas públicas e validar que apenas o caminho privilegiado interno consegue usá-la.

## Projeto antigo
O projeto antigo está INACTIVE na organização. Não foi apagado; a integração atual não disponibiliza exclusão definitiva. Não afirmar exclusão.

## Segurança e publicação
- Não colocar segredos no GitHub, no código frontend, em prints ou no chat.
- Não reutilizar o par VAPID anteriormente exposto.
- Não fazer merge em `main`, não promover preview a produção e não alterar produção sem autorização específica do titular.
- O PR #1 deve permanecer como draft até concluir os testes e a revisão final.

## Ordem recomendada
1. Cadastrar `GEMINI_API_KEY` e o novo par VAPID no Supabase Secrets.
2. Atualizar a chave pública VAPID no frontend da branch de correção.
3. Confirmar CI verde após a atualização do código.
4. Executar os testes funcionais com credenciais válidas e dados de teste.
5. Revisar os alertas de segurança individualmente e atualizar este documento.
6. Apresentar o checklist final para validação do titular. Merge e publicação ficam para uma aprovação separada.

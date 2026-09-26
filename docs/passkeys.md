# Acesso rápido por passkeys

## Estado da implantação

O fluxo está implementado, mas permanece desligado por padrão. Em 26/09/2026,
`POST /auth/v1/passkeys/authentication/options` no projeto
`pjqykkpewhrbljuaeztt` respondeu `passkey_disabled`.
O painel Lovable Cloud desse aplicativo não expôs configuração de passkeys.
A conta Supabase disponível não conseguiu abrir esse projeto.
Não ativar o rollout antes de liberar e validar o serviço de autenticação.

## Configuração necessária no serviço hospedado

Seguir https://supabase.com/docs/guides/auth/passkeys (recurso experimental).
No projeto correto, configurar Authentication → Passkeys, ou solicitar ao
administrador do Lovable Cloud a configuração equivalente:

- `passkey_enabled`: `true`
- `webauthn_rp_display_name`: `AxisPay`
- `webauthn_rp_id`: `axispay.henriqueanalista-ads.workers.dev`
- `webauthn_rp_origins`: `["https://axispay.henriqueanalista-ads.workers.dev"]`

Essas opções pertencem ao servidor Auth. Uma migração SQL, uma chave pública
ou alterar apenas o frontend não habilita o recurso.
Não mover usuários nem criar outro banco para contornar essa configuração.
O domínio da passkey deve ser estável: localhost e previews Lovable não são
intercambiáveis com o domínio de produção.

Após validar o servidor, definir a variável de repositório GitHub
`VITE_PASSKEYS_ENABLED=true` e executar uma nova build/deploy. Para um ambiente
de desenvolvimento com Auth próprio e RP localhost, usar a mesma variável no
ambiente da build. Ausente ou falsa mantém o fluxo existente de e-mail/senha.

## Fluxo do usuário

1. Entrar com e-mail e senha, com o e-mail confirmado.
2. Escolher **Ativar acesso rápido** no convite ou na página de perfil.
3. Criar a chave no diálogo nativo do aparelho (ação feita pelo usuário).
4. Ao retornar ao app, tocar em **Acessar conta** e confirmar com o método
   disponível no aparelho: Face ID, digital ou desbloqueio por PIN/senha.
5. E-mail e senha permanecem disponíveis para recuperação ou outro aparelho.

O aplicativo não recebe nem armazena dados biométricos. O servidor verifica
cada autenticação antes de fornecer a sessão. O marcador local só evita
repetir o convite; não autoriza acesso. Tokens não persistem entre aberturas.

## Validação

`npm test` cobre desbloqueio verificado, cancelamento, retorno do prompt
nativo, abandono da página, respostas atrasadas, cadastro e rollout desligado.
`npm run typecheck` e `npm run build` validam a aplicação.

Antes da liberação completa, testar em iPhone/Safari e Android/Chrome com uma
conta de teste: cadastrar chave, fechar/reabrir, autenticar, cancelar, usar a
alternativa por senha e sair durante o prompt. Os testes automatizados não
substituem essa validação real do sistema operacional.

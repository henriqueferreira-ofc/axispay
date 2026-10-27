# Publicação da biometria

## Lovable Cloud (backend deste projeto)

Quando o servidor do site não possui `SUPABASE_SERVICE_ROLE_KEY`, as quatro operações WebAuthn são encaminhadas à Edge Function `passkey`. A chave privada permanece no backend gerenciado; não é necessário copiá-la para localhost, GitHub ou Cloudflare. O encaminhamento envia a origem original validada da requisição e o Bearer da sessão nas operações de cadastro.

Publicar `supabase/functions/passkey/` no backend Lovable do projeto e publicar o frontend atualizado. A configuração `[functions.passkey] verify_jwt = false` permite iniciar o login sem sessão: as duas operações de cadastro verificam explicitamente o token com `auth.getUser`, e o login só emite uma sessão após verificar a assinatura WebAuthn. As tabelas continuam restritas ao servidor.

Se a função ainda não foi publicada, o aplicativo informa que o serviço precisa ser publicado no backend. Para validar: cadastrar uma chave, sair, entrar com a chave e verificar que cancelar, repetir uma resposta ou usar outro domínio não libera acesso.

## Servidor com Supabase próprio (alternativa)

O cadastro exige o token Bearer da sessão Supabase nas duas chamadas de registro.
O servidor verifica a assinatura WebAuthn, a origem, o RP e o desafio de uso único.

Antes de testar em produção:

1. Aplicar as migrations do Supabase, incluindo `20261026120000_passkey_tables.sql`. Ela cria as tabelas de credenciais e desafios se ainda não existirem e restringe o acesso ao servidor.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` como secret do Worker AxisPay. Usar `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` em um terminal autenticado. Nunca colocar essa chave em uma variável `VITE_`, no Git ou no navegador. URL e chave pública usam a configuração pública do build como alternativa às variáveis do servidor.
3. Publicar o build atualizado.

No deploy pelo GitHub Actions, cadastrar `SUPABASE_SERVICE_ROLE_KEY` em Settings → Secrets and variables → Actions do repositório. O workflow envia esse secret ao Worker durante a publicação. Se não houver secret no GitHub, preserva a configuração já existente no Worker. Os secrets do Lovable não são transferidos automaticamente para o Cloudflare ou o computador local.

Para localhost, criar `.env.local` (ignorado pelo Git) com `SUPABASE_SERVICE_ROLE_KEY=<chave privada do mesmo projeto Supabase>` e reiniciar `npm run dev`. O Vite carrega esse valor somente no servidor local; nunca usar o prefixo `VITE_` para essa chave. Para testar `vite preview` com o Worker, configurar o secret em `.dev.vars`.

Cada domínio tem seu próprio cadastro WebAuthn. Uma chave criada no domínio do Lovable não habilita automaticamente localhost ou outro domínio. No celular, usar o endereço HTTPS publicado; o IP local do computador via HTTP não oferece um contexto seguro para WebAuthn.

No iPhone, entrar com e-mail e senha, tocar em Ativar agora e confirmar a criação da chave de acesso. Depois, ao reabrir ou retornar ao app, tocar em Acessar conta e confirmar com Face ID, Touch ID ou o código do aparelho, conforme a opção oferecida pelo iOS. Cancelar não deve liberar o acesso; entrar com senha continua disponível.

A confirmação é exigida ao restaurar uma sessão e, com uma chave cadastrada, após o app ficar em segundo plano. A sessão Supabase continua sujeita à validação e às políticas do servidor.

Verificação local: `node --test tests/passkey.test.cjs` e `npm run build`.

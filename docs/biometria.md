# Publicação da biometria

O cadastro exige o token Bearer da sessão Supabase nas duas chamadas de registro.
O servidor verifica a assinatura WebAuthn, a origem, o RP e o desafio de uso único.

Antes de testar em produção:

1. Aplicar as migrations do Supabase, incluindo `20261026120000_passkey_tables.sql`. Ela cria as tabelas de credenciais e desafios se ainda não existirem e restringe o acesso ao servidor.
2. Configurar `SUPABASE_SERVICE_ROLE_KEY` como secret do Worker AxisPay. Usar `npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` em um terminal autenticado. Nunca colocar essa chave em uma variável `VITE_`, no Git ou no navegador. URL e chave pública usam a configuração pública do build como alternativa às variáveis do servidor.
3. Publicar o build atualizado.

No iPhone, entrar com e-mail e senha, tocar em Ativar agora e confirmar a criação da chave de acesso. Depois, ao reabrir ou retornar ao app, tocar em Acessar conta e confirmar com Face ID, Touch ID ou o código do aparelho, conforme a opção oferecida pelo iOS. Cancelar não deve liberar o acesso; entrar com senha continua disponível.

A confirmação é exigida ao restaurar uma sessão e, com uma chave cadastrada, após o app ficar em segundo plano. A sessão Supabase continua sujeita à validação e às políticas do servidor.

Verificação local: `node --test tests/passkey.test.cjs` e `npm run build`.

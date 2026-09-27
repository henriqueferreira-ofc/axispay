# Diagnóstico do acesso por biometria

Verificação do código em 27/09/2026, sobre o commit `ac9fbc2`.

## Estado atual

- O ajuste visual da tela de acesso está no commit `ac9fbc2`.
- O botão **Acessar conta** abre o formulário de e-mail e senha.
- `src/auth/AuthProvider.tsx` autentica usando `supabase.auth.signInWithPassword`.
- A versão atual não contém o fluxo de cadastro ou autenticação por passkeys.
- Publicar essa versão não ativa digital, Touch ID ou Face ID.

## Causa encontrada no histórico

O merge `e4df9b0` (mensagem “Ativou login biometria seguro”) removeu, em relação
à sua primeira referência pai, `src/auth/passkeys.ts`, `src/auth/passkeyConfig.ts`,
`src/components/PasskeySetup.tsx`, `docs/passkeys.md` e os testes de autenticação.
Também removeu a integração de passkeys do provedor de autenticação e do perfil.

A documentação anterior registrava que o fluxo estava implementado, mas desligado
por padrão, e que em 26/09/2026 o servidor retornou `passkey_disabled`.
Esse é um registro histórico; a configuração atual do servidor não foi verificada
nesta revisão. Restaurar apenas os arquivos não comprova o funcionamento em produção.

## Trabalho necessário para concluir

1. Revisar e recuperar a implementação anterior, preservando o layout atual.
2. Verificar o suporte e a habilitação de passkeys no projeto Auth utilizado pelo app.
3. Validar o domínio de produção e as origens autorizadas no servidor de autenticação.
4. Disponibilizar o cadastro inicial de uma passkey após autenticação da conta.
5. Conectar **Acessar conta** à autenticação por passkey, com alternativa por senha
   e tratamento de cancelamento, indisponibilidade e dispositivo incompatível.
6. Validar a criação da sessão pelo servidor, saída da conta e recuperação de acesso.
7. Testar em computador e celular reais antes de declarar a biometria funcionando.

O método de confirmação disponível depende do dispositivo e do sistema operacional.
Nenhum marcador local deve conceder acesso sem autenticação validada pelo servidor.

## Critério de conclusão

Uma conta com passkey cadastrada deve conseguir entrar pelo botão **Acessar conta**,
confirmando no diálogo nativo do dispositivo e recebendo uma sessão válida. O fluxo
por senha deve continuar disponível quando a passkey não puder ser usada.

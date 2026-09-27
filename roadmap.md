# Roadmap atual

- [x] Padronizar a tela de entrada em celular, iPad e computador.
- [x] Corrigir corte do widget “Próximas 4 semanas” no celular.
- [x] Adaptar importação, histórico e conciliação de extratos para telas estreitas.
- [x] Corrigir e validar o workflow de publicação pelo GitHub.
- [x] Validar build, console e visual nos três formatos.
- [ ] Adicionar acesso rápido por passkey para contas já reconhecidas, usando digital, Face ID ou código do dispositivo.

## Diagnóstico de autenticação

- [x] Identificar por que o botão de acesso não aciona biometria: a integração foi removida no merge `e4df9b0`.
- [ ] Recuperar e validar o fluxo de passkeys e a configuração do servidor antes de habilitar em produção.

Detalhes e critérios de conclusão: [diagnóstico de biometria](docs/diagnostico-biometria.md).

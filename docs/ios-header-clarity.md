# Nitidez do topo no iPhone

A captura do usuário mostra desfoque no topo da abertura e do dashboard, inclusive no avatar. O cabeçalho interno não tinha `filter` ou `backdrop-filter` no código. Portanto, a existência de uma camada CSS sobre o avatar não foi confirmada.

Foi encontrada a opção global `apple-mobile-web-app-status-bar-style=black-translucent`. A documentação da Apple descreve esse modo como conteúdo desenhado atrás da barra de status. Em comentário de junho de 2026, um engenheiro do WebKit informa que esse modo foi descontinuado e recomenda remover a configuração. Isso é uma causa possível do efeito observado no aparelho, não uma reprodução confirmada do defeito.

A comparação do histórico também confirmou que o commit `728cd28` (4 de novembro de 2026) adicionou globalmente `viewport-fit=cover`, `color-scheme=dark`, `theme-color=#0d0d0d` e o modo `black-translucent`. Na versão anterior, o viewport era apenas `width=device-width, initial-scale=1`. A regressão deve ser investigada como mudança do projeto, sem atribuí-la automaticamente ao aparelho.

Alterações:

- Removida a opção `black-translucent` do shell HTML, válida tanto na abertura quanto nas páginas internas.
- Restaurado o viewport global anterior (`width=device-width, initial-scale=1`) e removidos os metadados globais de esquema escuro e cor preta. O `viewport-fit=cover` e o tema preto do splash agora pertencem exclusivamente à rota de autenticação.
- Removido o fundo preto inline do documento; o canvas passa a seguir o tema, preservando as regras específicas da foto e do splash.
- Somente abaixo de 768 px, o cabeçalho interno usa `sticky`, fundo opaco e isolamento de pintura, sem filtros, backdrop-filter ou sombra. Em tablet e computador, mantém a posição `relative` original.
- Avatar, dados da conta e fluxos de autenticação não foram modificados.

Validação:

- Build e TypeScript passaram; os 24 testes existentes passaram.
- Chromium em 430×932, 768×1024 e 1440×900, com sessão e dados simulados: avatar carregado com opacidade 1 e filtro `none`; cabeçalho sem blur, backdrop-filter ou sombra; navegação lateral e menu de idioma funcionando; posição preservada após rolagem; sem transbordamento horizontal e sem erros de JavaScript.
- Confirmada uma única meta de viewport na abertura com `viewport-fit=cover` e uma única meta no dashboard com o viewport original, após navegação sem recarregar a página.
- Resultado em `artifacts/responsive/ios-header-checks.json`. Capturas de teste usam `/logo.png` como avatar fictício; não são a foto real do usuário.
- A renderização nativa da barra de status do iPhone instalado não pode ser comprovada nesses testes. É necessário reabrir e conferir no aparelho. O iOS pode conservar opções de apresentação definidas quando o atalho foi instalado.
- Com a barra de status padrão, a fotografia continua preenchendo o viewport da página; a área do relógio/sinal é administrada pelo iOS e pode ficar fora dele.

Referências primárias:

- [Apple: Supported Meta Tags](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
- [WebKit 317153, comentário 2](https://bugs.webkit.org/show_bug.cgi?id=317153#c2)
- [WebKit 316008: geometria e configuração de instalação de web apps](https://bugs.webkit.org/show_bug.cgi?id=316008)

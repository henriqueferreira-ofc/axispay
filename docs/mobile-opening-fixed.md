# Abertura móvel fixa e inicialização do atalho

## Problemas observados

Nas capturas do usuário, a fotografia permanece no mesmo lugar enquanto o box e a marca mudam de posição. A tela usava `min-height: 100dvh`, conteúdo alinhado por `margin-top: auto` e um documento com `min-height: 100lvh`. Isso permitia rolagem e mudanças de altura, embora a fotografia fosse fixa.

A faixa preta continuava no aplicativo aberto pelo ícone da Tela de Início. O manifesto iniciava em `/`, cujo HTML usa viewport normal e barra de status padrão, antes de a aplicação redirecionar para `/auth`. A configuração de foto até a área do relógio existe somente em `/auth`. Além disso, o iOS pode guardar configurações de apresentação quando instala o atalho; sua renderização nativa não é reproduzida pelo teste de navegador.

## Alterações

- Somente a tela de boas-vindas abaixo de 768 px usa um palco fixo de `100svh`, sem rolagem ou efeito elástico do documento.
- A marca conserva a animação de entrada e fica ancorada após ela; o box é ancorado ao rodapé com margem segura.
- Posições centralizadas em `--auth-brand-top` e `--auth-panel-bottom`, na regra móvel de `.auth-page[data-auth-view="welcome"]`. Essas variáveis permitem ajustar depois o local desejado sem alterar a lógica dos componentes.
- A rolagem normal é liberada ao abrir login, cadastro ou recuperação, para não prender campos atrás do teclado. Ao retornar à tela de boas-vindas, as âncoras são retomadas.
- O manifesto passa a iniciar diretamente em `/auth`, cujo HTML já contém `viewport-fit=cover` e `black-translucent`. A aplicação já exige a confirmação de acesso ao iniciar; não foram alterados handlers, permissões ou definições de rota.
- Nenhuma página interna, imagem, cor de botão ou layout de tablet/computador foi alterado nesta correção.

## Validação

- Chromium e WebKit com viewport móvel, toque e larguras 375, 390 e 430 px.
- Marca e painel apresentaram coordenadas idênticas antes/depois das tentativas de rolagem e após abrir/fechar formulário. Documento permaneceu em `scrollY=0`.
- Animação normal de entrada testada em 430×932; transformação final estabiliza em identidade.
- Cadastro, login por senha e Acessar conta abriram os formulários esperados. Formulário libera a rolagem e campos continuam focáveis em altura reduzida.
- Confirmados manifesto com `start_url=/auth`, metadados da abertura e retorno à configuração padrão no dashboard, com sessão e dados simulados.
- Build, TypeScript e os 24 testes existentes passaram.
- Evidências em `artifacts/responsive/fixed-opening-{chromium,webkit}-checks.json` e capturas `fixed-opening-*.png`.

O WebKit automatizado não inclui a barra de status de um PWA instalado em iPhone. Portanto, a ausência final da faixa precisa ser conferida no aparelho. Após atualizar o site, o atalho antigo pode precisar ser removido e adicionado novamente a partir da abertura no Safari, para atualizar a configuração de instalação; isso pode pedir login novamente.

Referências primárias:

- [Apple: configuração de status bar em web apps](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html)
- [WebKit: configurações de instalação e geometria de viewport](https://bugs.webkit.org/show_bug.cgi?id=316008)

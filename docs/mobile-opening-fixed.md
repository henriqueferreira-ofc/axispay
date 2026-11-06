# Abertura móvel — diagnóstico medido no iPhone

## Situação no aparelho

O usuário informou iOS 27.2 e confirmou que abre pelo ícone da Tela de Início. Após reinstalar, a fotografia passou a aparecer atrás da barra de status, mas permaneceu uma faixa preta inferior. A tentativa de dimensionar o conteúdo por `screen.height` fez o último botão ultrapassar a área visível. Essa tentativa foi descartada.

O problema da faixa física **não está resolvido**. A medição enviada pelo usuário confirmou tela de 430×932 px e viewport de 430×873 px, com `offsetTop: 0` e escala 1. A diferença é de 59 px, igual à área segura superior. Página, fundo e foto terminam juntos em 872,98 px: a foto cobre todo o viewport disponível. Essa geometria é compatível com o relato WebKit 313800; a medição não comprova, por si só, a causa interna do sistema. Testes de navegador não reproduzem o contêiner nativo de um PWA instalado.

## Correção atual

- Palco da tela de boas-vindas abaixo de 768 px dimensionado por `100dvh`, correspondente ao viewport disponível, sem usar `screen.height`.
- Fundo, foto e canvas do documento usam `100lvh`; apenas o palco dos controles usa `100dvh`. A regra móvel que zerava a altura mínima do documento foi retirada, mantendo o bloqueio de rolagem. O fundo do documento usa attachment normal para evitar depender de background fixo no Safari. A foto não recebe o aumento anterior de 105%.
- Box e marca ancorados; rolagem e arraste bloqueados na tela de boas-vindas. Formulários continuam com rolagem normal.
- Não foram alterados manifesto, metadados da barra de status, páginas internas, dados ou autenticação nesta correção.

## Medição no iPhone real

Foi acrescentada uma ferramenta temporária e somente de leitura, oculta atrás de cinco toques consecutivos na marca AxisPay da abertura. O diálogo “Informações da tela” contém um botão para copiar:

- Dimensões de `screen`, `innerHeight`, `visualViewport` e altura do documento.
- Medidas reais de `vh`, `svh`, `lvh`, `dvh`, elemento fixo e áreas seguras.
- Limites da página, foto, marca, painel e último botão.
- Configuração da barra de status e versão do navegador.

Não lê nome, e-mail, sessão, senha, biometria, saldos ou registros financeiros. Não transmite os dados pela rede. O usuário escolhe copiar e compartilhar o texto. O comportamento normal da marca continua igual; o diálogo só abre após a sequência de cinco toques.

Medição recebida do aplicativo instalado: `fixedInset: 873`, `vh: 932`, `svh/dvh: 872,98`, `lvh: 932`, áreas seguras superior/inferior de 59/34 px e barra `black-translucent`. O painel ocupa de 590,39 a 838,98 px e o último botão termina em 825,98 px, dentro do viewport. Não há rolagem (`scrollY: 0`). Não repetir a tentativa de usar a altura física para posicionar os controles: ela já causou recorte. Remover a ferramenta temporária quando a investigação terminar.

## Verificação

- Chromium e WebKit com viewport móvel de 430×873 e tela simulada de 430×932: todos os botões dentro do viewport; diálogo oculto nos quatro primeiros toques; abre no quinto; cópia correta; não inclui dados de conta; fechar o diálogo não move o painel; Criar conta funciona.
- Outras verificações em 430×932 e viewport reduzido confirmaram contenção da foto e controles na área disponível.
- Build, TypeScript e lint dos componentes atualizados passaram.
- O diagnóstico real confirmou a diferença de 59 px; a eliminação da faixa externa permanece pendente. Foi aplicada uma correção restrita à abertura móvel: restaurar o canvas/foto em `100lvh`, mantendo os controles em `100dvh`. A confirmação da faixa física exige o aparelho; não declarar resolução com base em simulações.

## Opções para continuidade

Manter o PWA preserva a instalação atual e o aplicativo interno aprovado, mas não há correção comprovada para essa faixa nesta investigação. Pintar o fundo de uma cor semelhante seria apenas um disfarce, sem ampliar a área disponível para a foto.

Uma versão iOS com contêiner nativo permitiria investigar o controle direto da janela e das barras do sistema. É uma mudança de arquitetura e distribuição, não uma correção CSS: exige Xcode, assinatura e testes em aparelho, incluindo autenticação e biometria. Proposta de escopo: manter o serviço web e as páginas internas, configurar a abertura nativa nas bordas e validar as áreas seguras internas antes de distribuir. Não foram adicionadas dependências nativas nem alterados fluxos ou configurações globais. Essa opção requer uma decisão específica do usuário e não é uma garantia de resultado sem validação em aparelho.

Referências primárias:

- [WebKit 313800: faixa inferior fora do viewport em aplicativo web instalado](https://bugs.webkit.org/show_bug.cgi?id=313800)
- [WebKit 301994: regressão de tela cheia em Home Screen web apps](https://bugs.webkit.org/show_bug.cgi?id=301994)

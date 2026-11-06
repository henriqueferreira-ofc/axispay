# Abertura móvel — estado atual e diagnóstico pendente

## Situação no aparelho

O usuário informou iOS 27.2 e confirmou que abre pelo ícone da Tela de Início. Após reinstalar, a fotografia passou a aparecer atrás da barra de status, mas permaneceu uma faixa preta inferior. A tentativa de dimensionar o conteúdo por `screen.height` fez o último botão ultrapassar a área visível. Essa tentativa foi descartada.

O problema da faixa física **ainda não está confirmado como resolvido**. Há um relato compatível no WebKit (313800), descrevendo uma região inferior fora do viewport acessível ao documento. Isso precisa ser distinguido, no aparelho real, de um recorte criado por CSS. Testes de navegador não reproduzem o contêiner nativo de um PWA instalado.

## Correção atual

- Palco da tela de boas-vindas abaixo de 768 px dimensionado por `100dvh`, correspondente ao viewport disponível, sem usar `screen.height`.
- Fundo e foto usam essa mesma área. A imagem não recebe o aumento anterior de 105% no modo de boas-vindas do celular.
- Box e marca ancorados; rolagem e arraste bloqueados na tela de boas-vindas. Formulários continuam com rolagem normal.
- Não foram alterados manifesto, metadados da barra de status, páginas internas, dados ou autenticação nesta correção.

## Medição no iPhone real

Foi acrescentada uma ferramenta temporária e somente de leitura, oculta atrás de cinco toques consecutivos na marca AxisPay da abertura. O diálogo “Informações da tela” contém um botão para copiar:

- Dimensões de `screen`, `innerHeight`, `visualViewport` e altura do documento.
- Medidas reais de `vh`, `svh`, `lvh`, `dvh`, elemento fixo e áreas seguras.
- Limites da página, foto, marca, painel e último botão.
- Configuração da barra de status e versão do navegador.

Não lê nome, e-mail, sessão, senha, biometria, saldos ou registros financeiros. Não transmite os dados pela rede. O usuário escolhe copiar e compartilhar o texto. O comportamento normal da marca continua igual; o diálogo só abre após a sequência de cinco toques.

Após publicar a atualização, solicitar ao usuário: abrir o ícone instalado, tocar cinco vezes na marca, tocar em **Copiar informações** e colar o texto na conversa. Remover a ferramenta temporária quando a investigação terminar.

## Verificação

- Chromium e WebKit com viewport móvel de 430×873 e tela simulada de 430×932: todos os botões dentro do viewport; diálogo oculto nos quatro primeiros toques; abre no quinto; cópia correta; não inclui dados de conta; fechar o diálogo não move o painel; Criar conta funciona.
- Outras verificações em 430×932 e viewport reduzido confirmaram contenção da foto e controles na área disponível.
- Build, TypeScript e lint dos componentes atualizados passaram.
- A faixa externa continua dependendo da medição no iPhone real; não foi validada por estas simulações.

Referências primárias:

- [WebKit 313800: faixa inferior fora do viewport em aplicativo web instalado](https://bugs.webkit.org/show_bug.cgi?id=313800)
- [WebKit 301994: regressão de tela cheia em Home Screen web apps](https://bugs.webkit.org/show_bug.cgi?id=301994)

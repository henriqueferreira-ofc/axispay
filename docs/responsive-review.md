# Revisão responsiva AxisPay — 5 de novembro de 2026

## Implementação

As alterações de estilo começam em **768 px**. Os estilos de telefone, textos, fluxos, permissões, rotas, integrações e autenticação foram preservados. Nenhuma imagem foi substituída. A seleção aleatória da fotografia continua após a hidratação.

- **Tablet em retrato (768–1023 px):** marca e painel em fluxo vertical, painel limitado a 440 px, fotografia com enquadramento central, botões de 52 px e formulário com campos de 42 px.
- **Computador (a partir de 1024 px) e tablet baixo (a partir de 768 px, altura até 700 px):** fotografia ocupa a região esquerda; marca e painel formam uma coluna à direita com largura fluida entre 380 e 480 px. Entre 1024 e 1279 px, um gradiente conecta a foto ao fundo escuro. A partir de 1280 px, aplica-se o refinamento descrito abaixo. Conteúdo permanece em fluxo, permitindo rolagem em alturas reduzidas.
- **Área interna:** grades respeitam o espaço restante após o menu lateral. KPIs distribuem-se conforme a largura disponível e usam consultas de contêiner para posicionar o ícone acima do valor em cartões estreitos. Valores financeiros deixam de usar reticências em tablet/computador. Filtros, contas e inteligência adiam colunas densas para telas maiores. Modais compartilhados têm altura limitada ao viewport e rolagem própria em tablet/computador. Tabelas mantêm seus contêineres locais de rolagem; extratos mantêm cartões abaixo de md.

## Arquivos alterados

| Arquivo | Mudança |
| --- | --- |
| `src/styles.css` | Composições por faixa de tela, enquadramento, formulários e consultas de contêiner dos KPIs. |
| `src/routes/auth.tsx` | Classes de identificação visual, sem alterar handlers ou fluxos. |
| `src/components/AuthHeroBackground.tsx` | Classes de identificação da foto e do gradiente. |
| `src/components/KpiCard.tsx` | Classes para adaptar a composição ao espaço de cada cartão. |
| `src/components/ui/dialog.tsx` | Altura e rolagem em tablet/computador. |
| `src/components/ui/alert-dialog.tsx` | Altura e rolagem em tablet/computador. |
| `src/routes/_app.index.tsx` | Grade fluida de indicadores e cabeçalho de tablet. |
| `src/routes/_app.contas.tsx` | Coluna de totais lateral somente a partir de xl. |
| `src/routes/_app.inteligencia.tsx` | Composição de três colunas somente a partir de xl. |
| `src/routes/_app.registros.tsx` | Filtros empilhados até xl. |
| `src/routes/_app.receitas.tsx` | Indicadores em duas colunas em tablet. |
| `src/routes/_app.despesas.tsx` | Indicadores em duas colunas em tablet. |
| `src/routes/_app.relatorios.tsx` | Indicadores e cabeçalho adaptados a tablet. |

## Verificação

- `npm run build`: passou.
- `npx tsc --noEmit`: passou.
- `node --test tests/*.test.cjs`: 24 testes passaram.
- `npm run lint`: 2.011 ocorrências (1.991 erros e 20 avisos). A execução em uma cópia limpa do HEAD anterior às alterações produziu exatamente a mesma contagem. A dívida existente não foi reformulada neste trabalho visual.
- `git diff --check`: passou.
- Chromium: abertura e formulários em 375×812, 768×1024, 1024×768, 1440×900, 1920×1080, 768×600, 1024×600 e 1440×650. Sem rolagem horizontal do documento. Acessar conta, Criar conta e Entrar com e-mail e senha abriram os formulários esperados para visitante sem credencial local. Não foram enviados cadastros ou formulários com credenciais reais.
- Comparação com servidor separado do HEAD original: abertura em 375×812 com imagem e preferência de movimento controladas apresentou **pixels e geometria idênticos**.
- Páginas internas: dashboard, registros, inteligência, categorias, orçamentos, metas, recorrentes, importar, importar extrato, relatórios, perfil, contas, receitas e despesas nas cinco larguras pedidas. Navegação pelos links reais do menu quando disponíveis; páginas complementares abertas pelo roteador. Sessão e respostas do Supabase simuladas exclusivamente no navegador de teste, sem chamadas ou gravações no serviço real. Sem erros de JavaScript e sem transbordamento horizontal da área principal em tablet/computador.
- Modal de registro e abre/fecha do menu: 768×600, 1024×600, 960×600 e 720×450. Os dois últimos representam áreas CSS equivalentes a uma janela de 1440×900 com zoom de 150% e 200%. **O controle nativo de zoom do navegador não foi exercitado**. Rodapé do modal alcançável por rolagem.

## Limites e pendências

A validação não substitui uma sessão real autenticada, biometria em dispositivo físico, importação real de extrato ou conferência em Safari/iPad. Os cenários internos usaram registros representativos e estados vazios, sem cobrir todas as combinações de dados e estados de negócio.

Foi identificado um problema **preexistente no celular** em Categorias: nomes longos, como “Alimentação e supermercado”, podem empurrar os botões além da largura útil. Foi mantido para respeitar a instrução de preservar integralmente a versão móvel. Em tablet/computador, a regra de encolhimento das grades evita esse transbordamento. Essa página merece uma revisão móvel separada.

## Evidências

Capturas e resultados estão em `artifacts/responsive/`:

- `auth-375x812.png`, `auth-768x1024.png`, `auth-1440x900.png`: capturas principais, com a mesma fotografia para comparação.
- `checks.json`: abertura, geometria e botões.
- `internal-checks.json`: páginas e larguras, com indicação do uso de dados simulados.
- `mobile-regression.json`: comparação com HEAD original.
- `modal-zoom-checks.json`: modais e áreas equivalentes a zoom.


## Fotos próprias por formato de tela

As fotos fornecidas pelo usuário substituem os arquivos antigos da abertura. As pastas originais e os PNGs foram mantidos sem renomear, editar ou comprimir:

| Faixa de tela | Pasta em `public` | Dimensões |
| --- | --- | --- |
| Abaixo de 768 px | `iphone-vertical` | 1080×2340 |
| 768–1279 px em retrato | `Tablete-vertical` | 1536×2048 |
| 768–1279 px em paisagem | `tablete-horizontal` | 2048×1536 |
| A partir de 1280 px | `Computador-horizontal` | 2560×1440 |

Cada pasta contém `1.png` a `5.png`. O componente `AuthHeroBackground` usa `<picture>` para que o navegador selecione a fonte adequada e a atualize ao redimensionar ou girar a tela. O número da variante é sorteado somente após a hidratação, uma vez por montagem. O sorteio permanece estável ao mudar de formato. Os números das pastas não precisam representar a mesma pessoa.

A mesma seleção por largura e orientação também alimenta o canvas do documento, usado pelo Safari nas áreas de status e overscroll. As referências aos arquivos antigos removidos foram eliminadas do componente. Nenhuma lógica de autenticação foi alterada.

As fotos horizontais agora ocupam toda a largura disponível, sem redução para 82%, máscara lateral, fundo colorido ou segunda camada de retrato. A imagem não é distorcida: `object-fit: cover` faz apenas o recorte necessário para a proporção da janela. Foram mantidas as dimensões dos controles e dos painéis.

### Validação desta integração

- Cinco variantes × seis viewports: 375×812, 768×1024, 1024×768, 1180×820, 1440×900 e 1920×1080 (30 capturas).
- Confirmados `currentSrc`, dimensões naturais, carregamento completo e imagem do canvas correspondente em todos os casos.
- Nenhum PNG ausente, erro de JavaScript ou transbordamento horizontal do documento.
- Criar conta, Entrar com e-mail e senha e Acessar conta abriram os formulários esperados nas cinco variantes.
- Build, TypeScript e os 24 testes existentes passaram. ESLint do componente atualizado passou.
- Sessão real, biometria e Safari em dispositivo físico não foram exercitados nesta integração.

Capturas atuais: `artifacts/responsive/new-photo-{largura}x{altura}-{variante}.png`. Resultados: `artifacts/responsive/new-photos-checks.json`. As capturas antigas documentam revisões anteriores.

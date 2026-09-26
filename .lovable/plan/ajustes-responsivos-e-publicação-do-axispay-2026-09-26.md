# Ajustes responsivos e publicação do AxisPay

## Objetivo
Garantir que a nova entrada mantenha o mesmo padrão visual no celular, iPad e computador, eliminar cortes nas informações financeiras no celular e deixar o fluxo de publicação pelo GitHub confiável.

## Implementação
1. **Tela de entrada responsiva**
   - Manter a experiência atual do celular como referência.
   - Corrigir o enquadramento das imagens em celular e ajustar iPad/computador sem áreas vazias.
   - Posicionar seletor de idioma e formulário com dimensões estáveis, sem cobrir o conteúdo principal.
   - Respeitar telas baixas com rolagem segura.

2. **Informações financeiras no celular**
   - Corrigir o widget “Próximas 4 semanas” mostrado na captura para impedir que valores sejam cortados.
   - Fazer descrição, data/categoria e valor ocuparem colunas responsivas, permitindo quebra controlada quando necessário.
   - Adaptar prévia, histórico e conciliação de extratos para cards no celular e tabelas no iPad/computador.
   - Garantir que abas e ações continuem acessíveis em telas estreitas.

3. **GitHub e publicação**
   - Corrigir o workflow para usar a versão atual do Node e o nome correto da chave pública do backend.
   - Verificar a consistência das dependências usadas pelo GitHub.
   - Confirmar que todas as alterações do projeto estão sincronizadas com o repositório conectado.
   - Validar o endereço publicado após o workflow concluir.

4. **Validação final**
   - Conferir entrada e páginas financeiras em celular, iPad e computador.
   - Verificar erros visuais, carregamento, console e compilação.
   - Manter intactos cálculos, entradas, saídas, recorrências e deduplicação.

## Observação técnica
O domínio externo em `workers.dev` é atualizado pelo workflow do GitHub, não pelo botão Publicar do Lovable. A entrega inclui o ajuste desse workflow; a execução depende de o repositório GitHub estar conectado e possuir as credenciais de publicação configuradas.

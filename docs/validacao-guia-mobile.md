# Verificação de telas pequenas — Guia da Equipe e PR 25

Instância local com dados fictícios, em 08/11/2026. Escopo: páginas novas do Guia da Equipe e da Central de Ajuda revisada, mais as páginas públicas de autoridades trazidas pelo PR 25. Não é uma revisão geral do site.

| Tela | Problema reproduzido | Correção nesta branch | Verificação local |
| --- | --- | --- | --- |
| Central de Ajuda → artigo de tarefa | Referências de campos e telas apareciam sobrepostas nas listas numeradas. | O número ocupa uma posição fixa ao lado do item; texto e referências permanecem no mesmo fluxo e quebram linha. | Cinco artigos × seis idiomas sem erro; captura de preparo em português e inglês; itens legíveis. |
| Central de Ajuda → artigo em 390 px | O cabeçalho com entrada deslogada excedia a largura em 20 px quando combinado com a navegação ampliada do PR 25. | Em até 420 px, a entrada mantém um botão de 44 px com ícone e nome acessível. | Página alemã em 390 px com largura igual à janela. |
| Administração → Conteúdo → Ajuda e FAQ em 320 px | Datas do cartão editorial tinham linha rígida e alargavam a página para 356 px. | Metadados do cartão quebram linha dentro da coluna disponível. | Largura final de 320 px. |
| Administração → Conteúdo em 768 px | A nova aba **Guia da equipe** aumentou a barra de abas para 893 px e alargou a página para 909 px. | A barra ocupa a largura disponível e rola internamente nessa faixa de tela. | Largura final de 768 px; os botões excedentes permanecem na barra rolável. |
| Mapa completo de autoridades do PR 25 em 320/390 px | Painel cobria os controles; botão de ocultar o cabeçalho ultrapassava a borda, gerando rolagem horizontal. | Painel limitado à metade inferior; zoom, legenda, compartilhamento e bússola acima dele; créditos entre controles e painel; botão de ocultar cabeçalho removido em telas estreitas, mantendo o cabeçalho visível. | Largura de 320/390 px; zoom recebe toque; legenda abre e fecha; painel contrai e expande; nenhum erro de navegador. |

As páginas `/autoridades`, `/autoridades/explorar`, `/guia-equipe` e o artigo inicial do guia, nos tamanhos 320, 390 e 768 px, não apresentaram rolagem horizontal na primeira auditoria. [Captura consolidada do mapa em 390 px](guia-equipe/imagens/mapa-mobile-validado.png); as demais capturas de trabalho estão em `tmp/guia-equipe-local/`.

# Refinamentos da interface — 24/09/2026

## Implementado

- Idioma detectado na entrada a partir da preferência do navegador, com seleção persistida em cookie e armazenamento local. O menu com globo fica no rodapé e oferece uma sugestão opcional quando a escolha diverge do idioma do dispositivo.
- Formulário sem seletor próprio; revisão somente com pendências e erros, agrupados por etapa e seção; contadores nas abas e explicação dentro do botão de envio bloqueado.
- Guia do link público destacado abaixo do aviso. Contraste como botão com ícone e atalhos 1 a 5 reorganizados.
- Barra lateral compacta por padrão, com expansão sobre o conteúdo ao passar o mouse ou focar pelo teclado; logo liga ao site público.
- Rodapé com seletor discreto à esquerda, logo da biblioteca centralizado e arte geométrica restaurada. Dica de idioma pode ser dispensada durante a sessão.
- Aviso de cookies essenciais como faixa inferior não bloqueante. "OK", "Saiba mais" ou navegar para outra página o dispensam.
- Metadados e imagem de compartilhamento traduzidos nas páginas públicas principais; editor da Central de ajuda permite traduzir título, resumo e conteúdo.

## Verificação

- `npm run verify`: 120 testes, tipos, lint e build aprovados. O lint mantém um aviso anterior em catalogação assistida.
- `public-stabilization.spec.ts`: 39 testes de navegador aprovados em desktop claro, desktop escuro e celular. O teste define `pt-BR` explicitamente; atalhos duplicados da Barra Brasil são removidos quando ela carrega.
- Prévia local sem banco: conferidos contadores, revisão, bloqueio de envio, troca de idioma, rodapé e aviso de cookies. Capturas em `evidencia-refinos-interface.png` e `evidencia-rodape-final.png`.

## Trabalho restante

- A tradução integral de todas as páginas públicas e internas ainda não foi implementada. A preferência já chega ao formulário e a partes compartilhadas, mas outros textos permanecem em português. A interface inteira não deve ser anunciada como multilíngue até concluir os catálogos de tradução por tela.
- A migração de traduções e imagens da base de conhecimento ainda não foi aplicada ao banco remoto; exige confirmação explícita antes da execução.
- Sem sessão autenticada disponível na prévia, o comportamento da barra lateral no painel não teve verificação visual com navegação real. O layout foi checado por tipos e build.

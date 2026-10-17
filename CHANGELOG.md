# Histórico de mudanças

Este arquivo registra a evolução funcional do **Pronto!** desde o início do projeto, com base nas entregas e decisões documentadas. As datas abaixo se referem ao desenvolvimento; **não indicam publicação em produção**. O histórico do repositório atual começa na migração de outubro de 2026, mas o trabalho no sistema começou antes dela.

A partir de agora, cada pull request deve acrescentar uma nota datada à seção **Em preparação**, descrevendo mudanças para estudantes, equipe ou operação. Ao publicar uma versão, essas notas serão agrupadas sob o número e a data da versão.

## Em preparação — 0.1.0

### 17 de outubro de 2026

- O link padrão de recuperação de senha do Supabase também abre a definição de senha.

### 16 de outubro de 2026

- A administração mantém os dados dos programas visíveis após salvar e permite configurar vários sem recarregar a página. O calendário ganha fechamento excepcional, rolagem até o formulário e distinção clara entre fechamento e aviso; a navegação recolhe as subseções da Administração, e a visão de estudante passa a ter uma única ação de concessão. A ativação do novo tipo de fechamento depende das migrações do banco hospedado.
- Registrada a publicação do PR3 no domínio público, a aplicação das 11 migrações pendentes e a configuração do worker de e-mails no Supabase. O envio real e o aceite assistido continuam pendentes de verificação operacional. As instruções dos agentes foram condensadas sem alterar suas exigências para respeitar o limite de contexto do CI.
- A recuperação de senha por e-mail voltou a funcionar após corrigir a autenticação SMTP do Supabase Auth; o link foi recebido na conta administrativa. A entrega da fila transacional ainda precisa de teste separado.

### 15 de outubro de 2026

- Estudantes e integrantes da equipe que optarem pelo avatar padrão recebem um monograma azul com a inicial do nome e detalhes do pictograma; o cabeçalho público mantém o contraste do avatar ao mostrar a saudação.
- Tooltips permanecem próximas dos respectivos controles em áreas animadas. Os botões flutuantes de acessibilidade e VLibras compartilham opacidade discreta e recuperam contraste ao receber foco ou passar o cursor.
- A recuperação de senha usa confirmação explícita do link, e os modelos de resposta podem ser criados e associados aos campos de metadados.

### 14 de outubro de 2026

- A barra lateral mantém o pictograma à vista durante a rolagem e aproxima os ícones dele sem perder o alinhamento horizontal; a equipe alterna para uma demonstração da navegação estudantil por uma chave no cabeçalho. O painel mostra páginas de livro ao carregar.
- A busca interna da equipe sugere, durante a digitação, protocolos, classificações, pessoas e configurações conforme o acesso concedido; na visão geral, a barra recebe o foco ao entrar. A gestão de permissões aceita início e fim independentes como dia todo.
- Os controles de acessibilidade foram reunidos em um botão flutuante, mantendo o VLibras, e o seletor de tema passou ao rodapé junto do idioma. As telas administrativas receberam cabeçalhos, cartões e textos mais consistentes; “Pendências” passou a “Modelos de resposta”.
- Os ícones da barra lateral compacta do painel ficam centralizados verticalmente na área visível da janela.
- A troca entre abas administrativas deixou de antecipar a aba antes da chegada dos dados; o conteúdo novo aparece com uma transição discreta, sem apagar a tela.
- A transição dos índices administrativos troca o conteúdo como um conjunto; apenas o cartão escolhido avança discretamente na direção da seta.
- Os índices da Administração ganharam botões de voltar e transição lateral ao entrar em uma área ou aba; os títulos dos submenus laterais agora apenas expandem ou recolhem. Corrigida a abertura da página de avaliações quando a campanha ainda não possui datas definidas.
- O catálogo de permissões passou a incluir as ações administrativas, inclusive gestão de contas, provisionamento, expurgo e ativação ou exportação da pesquisa. A navegação e as operações no banco passam a respeitar essas concessões; a gestão das próprias permissões continua exclusiva de administradores ativos.
- A página inicial ganhou mais respiro no cabeçalho e mantém a animação de “fichas catalográficas” nas seis línguas. A administração separa permissões individuais da aba Contas, com busca, resumo, filtros, áreas e cartões recolhidos ao abrir. Operação, Conteúdo e Controle ganharam páginas de índice acessíveis pela barra lateral e pelos breadcrumbs.
- A marca do Pronto! foi atualizada em cabeçalhos, painel, compartilhamento e e-mail; favicon e ícone de instalação usam seus quadrados sem fundo. O logo da biblioteca foi refeito para os temas claro e escuro e ganhou no rodapé uma animação do lema “Arquitetura, Urbanismo e muito +”. O crédito de *vibe coding* voltou a ligar ao Codex.
- O servidor de desenvolvimento verifica se está no repositório público correto antes de iniciar, prevenindo a abertura acidental de uma cópia antiga.
- Ampliado o tempo da verificação de acessibilidade da página inicial no CI para acomodar sua renderização e análise completas.
- A concessão ou o bloqueio de acesso mais recente agora prevalece de forma consistente, mesmo quando duas alterações ocorrem na mesma transação.
- Corrigida a validação de permissões nas mudanças de status de ficha, Nada Consta e solicitação, preservando os fluxos existentes e a proteção por perfil.
- O servidor local usa Webpack para evitar reinicializações repetidas durante a edição e aceita os endereços `localhost` e `127.0.0.1` em desenvolvimento.
- A autoria do projeto no README e os créditos do rodapé foram ajustados sem citar ferramentas específicas.

### 13 de outubro de 2026

- As quatro etapas de “Como funciona” avançam automaticamente enquanto estão na tela, com pausa durante a interação e para quem prefere movimento reduzido; seus detalhes agora trocam por fade, sem deslocamento vertical e com altura estável. O título de vantagens recebe um caminho tracejado em L, afastado do texto e percorrido por uma bolinha, e o de dúvidas frequentes anima a passagem de pergunta a resposta.
- Na seção “Como funciona”, os efeitos do título começam quando pelo menos metade da seção está visível: “repetição” ganha ecos breves, “Menos repetição” recebe um sublinhado permanente e “Mais clareza”, desfocado desde o início, torna-se nítido com um reflexo breve após uma pausa.
- O fundo geométrico da hero se estende por trás do logotipo e da navegação pública; no título principal, códigos CDU se transformam em “Fichas Catalográficas” e um marcador de texto destaca a expressão nos temas claro e escuro, respeitando a preferência por movimento reduzido.
- O favicon passa a usar o mesmo pictograma de quadrados do menu lateral; o cabeçalho público alinha visualmente o logotipo, ganha mais espaço vertical e perde a linha inferior.
- A janela de ciência da política no primeiro acesso exige rolar o texto até o fim antes de habilitar o botão; a orientação fica no próprio botão e a janela recebe o visual do painel, com ícone, rolagem e degradês.
- Corrigido o link de alteração de senha para abrir em outro navegador ou dispositivo; novos e-mails usam verificação direta do link.
- O rascunho estudantil e os preenchimentos provisórios da análise passam a ser salvos automaticamente no banco, com acesso restrito às contas correspondentes. A catalogação restaura prioritariamente a versão do banco.
- A barra lateral do painel de todos os perfis passa a expandir ao passar o mouse, com nomes animados, pictograma compacto de quadrados sem fundo, itens centralizados, destaque arredondado e submenus animados sem divisórias. O pictograma é identificado como “Pronto!”, o fundo acompanha a área de conteúdo, a sombra aparece apenas quando há sobreposição, as barras superiores se alinham ao conteúdo até a borda direita, e o rodapé cobre a barra. A barra de acessibilidade ganha respiro; o avatar da saudação recebe uma borda fina; fila, notificações e mensagens exibem o mesmo contador vermelho redondo.
- Preparado um controle individual de acessos da equipe, com concessões, bloqueios, herança da visão de estudante para demonstração, validade programada ou indeterminada, revogação e auditoria. Operações como alterar o fechamento diário, assumir ou reatribuir atendimentos, homologar fichas e validar o Nada Consta passam a respeitar essas decisões também no banco local; a publicação depende da migração correspondente.
- Corrigido o aviso de funcionamento para indicar biblioteca fechada fora do expediente de segunda a sexta, das 8h às 21h, com atualização automática ao abrir e fechar; as solicitações continuam disponíveis e os prazos seguem em dias úteis.
- Nos cabeçalhos, o aviso aberto passa a mostrar o fechamento previsto sem caixa de detalhes; no estado fechado, a caixa mostra data, hora local e horário da biblioteca e permanece aberta ao mover o mouse pelo espaço até ela. No aviso principal da página inicial, data e hora atuais substituem o título do topo, o funcionamento ocupa o canto oposto e a orientação aparece maior em uma linha. A Administração poderá ajustar o fechamento de uma data específica no calendário, após a migração do banco.
- Eliminada a troca visível da saudação ao recarregar o painel; a escolha de avatar da equipe ocupa uma grade compacta, sem cartão de destaque nem biografias.
- Substituído o catálogo por dez símbolos nomeados de livros e arquitetura, com o nome sob cada opção e ao lado de “Seu avatar”; o avatar no botão Meu painel usa o raio do design system. No detalhe do aviso fechado, o horário passa a ter ícone e o texto “Funcionamento”.
- Corrigida a leitura e a confirmação do CRB nas contas da equipe; erros de salvamento na Administração passam a aparecer em uma única notificação.

### 12 de outubro de 2026

- Esclarecidos no README os créditos pela condução do projeto e pela escrita do código.
- Preparada a publicação do código-fonte sob a licença GNU AGPL-3.0, com o texto integral da licença e a decisão registrada na documentação do projeto.
- Esclarecida a separação entre a licença do código e os direitos sobre identidade institucional e imagens de terceiros.
- Disponibilizados 18 avatares geométricos neutros, preservando as escolhas já salvas pela equipe.
- Consolidado o código do Pronto! no repositório atual, com a documentação e as regras de operação preservadas.
- Preparados o processamento hospedado da fila de e-mails institucionais e a pesquisa de avaliação do serviço; a ativação em produção ainda depende da sincronização do banco e de configuração controlada.
- Removidas telas e funções usadas apenas nos ensaios locais; ajustados ícones dos menus e elementos da página pública.
- Criados este README e o changelog para manter visível a evolução do projeto a cada pull request.
- Ajustado o limite de tempo do CI para concluir os testes públicos de navegador no runner hospedado.

## Histórico de desenvolvimento

### Outubro de 2026

- **10 a 12 de outubro:** refinados os fluxos de solicitação, análise, catalogação, entrega da ficha e comunicação. A página pública, os painéis e os modelos de orientação receberam ajustes de navegação e conteúdo.
- **5 a 7 de outubro:** consolidada a identidade visual do Pronto! e revisados o cadastro com CPF, os controles de integridade do trabalho, as etapas da análise e a prévia da ficha.

### Setembro de 2026

- **21 a 29 de setembro:** ampliadas acessibilidade, idiomas, ajuda contextual, privacidade, textos de e-mail, segurança operacional e elementos do painel. Foram incorporados comunicados, saudações e citações diárias.
- **3 a 14 de setembro:** aprimorados o fluxo de solicitação, avisos, perguntas frequentes, calendário operacional, metadados para busca e orientações de catalogação.

### Agosto de 2026

- **26 a 31 de agosto:** refinados os modelos institucionais da ficha, a catalogação assistida, a navegação e a gestão de contas da equipe.
- **23 a 25 de agosto:** construído o ciclo principal do MVP: solicitação do estudante, fila e atendimento, pendências, catalogação, homologação da ficha, validação do Nada Consta, mesclagem local do PDF, guia de autodepósito, encerramento, acompanhamento da coordenação e administração. Também foram registrados ensaios iniciais e ajustes de interface.
- **22 e 23 de agosto:** estruturado o desenvolvimento local com Supabase, testes de autorização e alteração de e-mail institucional.
- **6 de agosto:** criada a base da aplicação com interface inicial, esquema de dados, clientes Supabase e testes; iniciada a documentação das regras do serviço.

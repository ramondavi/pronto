# Histórico de mudanças

Este arquivo registra a evolução funcional do **Pronto!** desde o início do projeto, com base nas entregas e decisões documentadas. As datas abaixo se referem ao desenvolvimento; **não indicam publicação em produção**. O histórico do repositório atual começa na migração de outubro de 2026, mas o trabalho no sistema começou antes dela.

A partir de agora, cada pull request deve acrescentar uma nota datada à seção **Em preparação**, descrevendo mudanças para estudantes, equipe ou operação. Ao publicar uma versão, essas notas serão agrupadas sob o número e a data da versão.

## Em preparação — 0.1.0

### 18 de outubro de 2026

- Estudantes com protocolo concluído podem usar a mesma conta para solicitar ficha de outro curso ou grau com nova matrícula; o formulário avisa quando a matrícula já foi usada, e o banco impede a duplicação. A ajuda esclarece essa regra.
- O cancelamento mostra o motivo e os dados do protocolo no mesmo bloco, sem sugerir que o estudante saia da tela; a Central de ajuda ganha um artigo sobre a ficha catalográfica e corrige respostas sobre novas solicitações.
- A tela real e a demonstração deixam de oferecer outro pedido após a conclusão; um protocolo cancelado permite recomeçar. A Visão geral acompanha o último protocolo, e uma regra no banco impede nova solicitação quando já existe protocolo ativo ou concluído.
- Corrigida a falha de compilação que impedia a atualização da prévia após os ajustes do painel estudantil.
- Em telas pequenas, os títulos preservam letras inteiras, a linha do tempo aceita arraste livre com uma indicação visível e a confirmação de saída ganha ícones e espaçamentos do painel.
- A solicitação do estudante destaca primeiro a etapa pendente ou a ficha liberada; Nada Consta aprovado e correções resolvidas ficam recolhidos como concluídos. A Visão geral da demonstração leva diretamente à correção pendente.
- No celular, as etapas da linha do tempo ficam menores e avançam devagar após uma pausa, sem mover a divisória e exibindo a última etapa antes de voltar. Quando o Nada Consta já foi aprovado, as correções solicitadas aparecem antes dele na solicitação do estudante.
- O selo do protocolo enviado mostra seu nome uma vez; as linhas do tempo horizontais percorrem as etapas com texto legível em telas pequenas.
- Na prévia móvel, o aviso de funcionamento quebra o texto dentro da própria caixa sem alargar as telas do estudante; o menu da demonstração mantém a mesma altura da Visão geral.
- Corrigida a regra móvel que anulava a centralização do menu de demonstração; ele passa a seguir a largura da tela estudantil aberta e recalcula a posição ao navegar.
- As setas das guias administrativas permanecem no lugar ao alcançar a primeira ou a última guia, ficando discretamente inativas sem alterar a largura da lista.
- O letreiro dos títulos longos do painel móvel começa a percorrer o texto assim que a tela abre, com velocidade mais adequada e sem pausa inicial.
- A barra lateral aproveita todo o espaço acima da visão estudantil para mostrar os últimos itens; na versão contraída, o fundo dos ícones mantém os quatro cantos arredondados.
- O menu flutuante da demonstração estudantil fica centralizado na área real do painel em todas as telas, inclusive Minhas solicitações, mesmo quando a janela é mais larga que o conteúdo.
- No fim das páginas, a navegação lateral preserva distância do botão de visão estudantil e rola dentro do espaço disponível em telas largas e baixas.
- Na prévia móvel, as telas da demonstração respeitam a largura disponível, o aviso de funcionamento cabe em sua caixa e o letreiro dos títulos anima apenas o texto, preservando os ícones.
- Em janelas largas e baixas, a barra lateral ajusta a posição dos itens após a rolagem para preservar o espaço acima do controle de visão estudantil, aberta ou contraída.
- As setas das guias administrativas no celular cobrem as laterais sem deixar o texto das guias aparecer por trás das bordas.
- Na prévia móvel, os controles da visão estudantil deixam espaço nas demais telas, o cabeçalho alinha avatar e aviso ao menu, o menu fecha ao tocar fora e títulos longos percorrem uma linha.
- Em telas pequenas, o painel mantém um espaço intermediário e uniforme entre o cabeçalho, os breadcrumbs e o conteúdo.
- No celular, a barra de guias administrativas centraliza a guia selecionada, inclusive após recarregar a página, e exibe setas quando há mais guias nas laterais.
- O avatar da equipe no cabeçalho móvel usa o mesmo formato retangular arredondado do avatar estudantil.
- Os contadores de notificações e mensagens ficam parcialmente fora dos botões em telas maiores. No celular, o menu da equipe rola até os últimos itens e as telas administrativas se ajustam à largura disponível.
- No celular, o cabeçalho da equipe reúne menu, notificações, mensagens, pictograma e avatar na mesma linha; os contadores acompanham seus botões e o avatar abre as ações da conta.
- A chave de visão estudantil, o ícone da fila e os rótulos dos submenus aparecem corretamente no menu móvel da equipe; Minha conta mantém o mesmo espaçamento dos demais itens. Os controles da demonstração cabem em telas estreitas. Os links sociais do rodapé ganham áreas de toque maiores. O compartilhamento usa o logo em fundo claro com quadrados da marca e mantém a descrição institucional completa.
- O menu móvel da conta mostra saudação e perfil na mesma linha, sem repetir o nome, e usa o vermelho padrão na saída.
- No celular, o cabeçalho do estudante e sua visão de demonstração posicionam o avatar à direita; ele abre e fecha um menu com saudação, perfil, Minha conta e saída. A identificação do estudante no cabeçalho usa o mesmo componente nas duas visões.

### 17 de outubro de 2026

- A página de Acessibilidade passa a descrever os controles do botão flutuante e evita largura excedente no celular; redes sociais vão ao rodapé móvel, e o cabeçalho estudantil reúne menu, pictograma e aviso da biblioteca na mesma linha.
- Os breadcrumbs do painel também percorrem suavemente os caminhos longos em telas pequenas, mantendo tudo em uma linha.
- A identificação da biblioteca no hero fica em uma linha no celular; o crédito do rodapé centraliza a frase inicial sem criar rolagem horizontal.
- Corrigidos o tamanho do texto do critério de senha, o alinhamento dos breadcrumbs públicos, os espaços do rodapé e a distância entre cabeçalho e hero no celular.
- O cadastro avisa sobre domínio de e-mail inválido durante o preenchimento sem completar o endereço; em celulares, requisitos de senha, breadcrumbs e rodapé ganham layout mais adequado.
- O logo da página inicial ganha mais destaque no cabeçalho do celular sem ampliar a largura total do cabeçalho.
- A página inicial organiza botões, cartões de funcionamento, texto principal e logo para leitura e alinhamento em telas pequenas.
- Em telas pequenas, o acesso ao painel no cabeçalho público mostra apenas o avatar, mantendo o destino e o menu da conta.
- O botão flutuante de acessibilidade cresce 1 px em cada dimensão; no celular, a ajuda flutuante acompanha seu tamanho e sua margem lateral.
- A busca de ajuda no celular usa áreas de toque completas e leva às respostas; os logos isolados ficam centrados pela arte visível, as datas dos artigos ganham leitura melhor e o rótulo de funcionamento fecha ao segundo toque.
- O envio do código de acesso para estudantes também mostra uma contagem de 90 segundos no botão de reenvio, preservada ao recarregar a tela.
- A recuperação pública de senha mostra no próprio botão a contagem de 90 segundos antes de permitir novo envio, como em Meus dados pessoais.
- Os formulários de acesso, cadastro e recuperação ficam mais claros e consistentes no celular e no computador; o reenvio de código ganha espaço próprio e a entrada por código oferece retorno direto ao login com senha.
- A entrada de estudantes e equipe passa a usar uma única página com seleção de perfil sem recarregar; estudantes podem usar senha ou código por e-mail, e a equipe usa senha. O código fica disponível na prévia após a configuração do modelo de e-mail.
- A prévia alinha a ajuda contextual aos controles de acessibilidade e anima sua abertura e fechamento. A busca móvel abre FAQs, respostas e artigos; logos e datas de ajuda ficam ajustados no celular, e o estado normal da biblioteca revela seus detalhes ao tocar ou focar o rótulo.
- A recuperação de senha funciona quando o e-mail é aberto em outro navegador, inclusive na prévia com o modelo padrão do Supabase.
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

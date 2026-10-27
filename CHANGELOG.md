# Histórico de mudanças

Este arquivo registra a evolução funcional do **Pronto!** desde o início do projeto, com base nas entregas e decisões documentadas. As datas abaixo se referem ao desenvolvimento; **não indicam publicação em produção**. O histórico do repositório atual começa na migração de outubro de 2026, mas o trabalho no sistema começou antes dela.

A partir de agora, cada pull request deve acrescentar uma nota datada à seção **Em preparação**, descrevendo mudanças para estudantes, equipe ou operação. Ao publicar uma versão, essas notas serão agrupadas sob o número e a data da versão.

## Em preparação — 0.1.0

### 27 de outubro de 2026

- Padroniza a grade e os controles CDU na Administração e na análise bibliotecária. Inclui resposta rápida didática na ajuda, restrita à equipe, com campos, auxiliares, relações e exemplos de composição.

- Amplia a composição CDU com extensão consecutiva, grupos aninhados, especificações alfabéticas, códigos externos com fonte, síntese interna de auxiliares e intercalação. A divisão paralela exige instrução declarada e hierarquia registrada; preserva a ordem escolhida e a conferência profissional. A revisão considerou o material didático fornecido, sem importar tabelas.

- Reúne os caminhos de inclusão no catálogo administrativo em “Adicionar CDU”, com escolha explicada entre cadastrar um código e montar uma notação. A análise mantém o compositor junto ao preenchimento manual.

- Acrescenta compositor CDU por escolhas explícitas no catálogo e na análise bibliotecária, com relações, auxiliares, aplicação por assunto/conjunto, conferência da edição e confirmação antes de usar. Registra a composição como pendente, preservando o preenchimento manual e as fichas anteriores.

- Esclarece a organização dos códigos CDU com perguntas e ajuda junto a cada campo. A classe de aplicação aparece somente para auxiliares especiais; os campos seguem uma coluna contínua, sem lacunas.

- Padroniza as abas Assuntos e Catálogo CDU com campos e ações identificados por ícones, formulários responsivos e dropdowns de altura e alinhamento uniformes no design system.

- Seleção da edição CDU com padrão IBICT 2007 e edição IBICT 1997 no grupo de edição defasada. Prepara repertório próprio com hierarquia, tipos de tabelas, âmbito de auxiliares especiais, relações navegáveis e proteção contra ciclos. Registros antigos preservam a proveniência conhecida. As migrações de mesclagem e estrutura hierárquica foram aplicadas somente à prévia autorizada; produção preservada.


### 26 de outubro de 2026

- Permite cadastrar assuntos pela Administração e mesclar assuntos ou CDU duplicados, mantendo fichas e vínculos históricos, com conferência, auditoria e proteção de atendimentos abertos. Substitui o ícone de acessibilidade pelo símbolo de pessoa em círculo. A ativação das funções depende da nova migração, sem aplicação remota automática.

### 24 de outubro de 2026

- Prepara checksum de transporte nos envios ao bucket com retenção, mantendo a conferência SHA-256 após o download. Acrescenta progresso e diagnóstico por códigos fixos na cópia real, sem publicar dados do banco, nomes de arquivos, mensagens do provedor ou credenciais. As proteções de consistência e a agenda desativada permanecem.

- Ajusta a conferência das regras de ciclo de vida ao formato dividido retornado pelo Backblaze, preservando os prazos aprovados. Prepara a permissão restrita de leitura dessa configuração e diagnósticos estáticos por operação, sem revelar segredos, conceder exclusão ou ativar backups.

- Corrige a verificação de acesso ao banco para iniciar uma transação explicitamente somente de leitura, mantendo a conferência dessa proteção mesmo quando o pooler não preserva as opções iniciais da conexão. Não consulta fichas, não gera cópias e não ativa a agenda.

### 23 de outubro de 2026

- Prepara pacote portátil para backup manual criptografado em pasta privada ou disco externo, com ferramentas incluídas e sem depender de GitHub, Backblaze ou Healthchecks durante a geração. Reutiliza a consistência e a cobertura da rotina automática, verifica a cópia local e emite recibo com vencimento de 90 dias. Também melhora o diagnóstico sanitizado da conexão ao banco; acessos reais e primeiro ensaio ainda pendentes.

- Prepara verificação manual e somente de leitura dos acessos do backup, antes da primeira cópia: conexão segura ao banco, proteção dos buckets e parte pública de recuperação. Não consulta fichas ou PDFs, não envia cópias e não ativa o agendamento. A primeira cópia para ensaio terá acionamento manual explícito separado, sem ligar a agenda diária.

- Prepara cadastro protegido do monitor externo do backup, sem disparar sinais de sucesso durante a configuração. Horário e tolerância de alerta registrados; ativação e testes reais permanecem pendentes.

- Prepara entrega local da chave de recuperação ao responsável, com teste criptográfico sintético e cadastro somente da parte pública no GitHub após confirmação de guarda. A chave privada fica fora do executor; backup continua desativado até o ensaio.

- Backup preparado para a chave de servidor atual do Supabase na leitura dos documentos privados, com cadastro local protegido e compatibilidade com credenciais legadas existentes. Ativação e validação de acesso continuam pendentes.

- Prepara cadastro local protegido do acesso ao banco para o backup, com envio direto aos segredos do GitHub e conferência do projeto e da conexão de sessão. A rotina continua desativada até completar a configuração e o ensaio.

- Corrige a confirmação do formulário local de cadastro de backup, que bloqueava o envio legítimo do navegador. A validação de origem e a proteção contra envios externos permanecem ativas.

- Integração de backup com Backblaze B2 preparada para verificar mudanças diariamente, exportar e criptografar somente quando necessário, renovar cópias antes da expiração e alertar falhas. Permanece desativada até configuração segura e primeiro ensaio; sem alteração no banco remoto.

- A operação passa a ter protocolo de backup e recuperação com cópias independentes, alertas, ensaios e conciliação de expurgos. A implantação e o primeiro teste continuam pendentes, sem promessa de proteção já ativa.
- Recuperação de senha usa sessão temporária separada do acesso ao painel. Abrir e abandonar o link não conecta a conta ao Pronto!; após trocar a senha, a autorização de recuperação é encerrada e a pessoa deve entrar normalmente.

### 22 de outubro de 2026

- Cadastro passa a informar no início do formulário o atendimento exclusivo a estudantes concluintes dos cursos da FAUFBA. Formulários administrativos passam a distinguir dados salvos, alterações pendentes, salvamento e falha de confirmação, com destaque nos campos alterados e botão “Salvo” quando não há mudanças.

- Recuperação de senha aguarda a inicialização da autenticação para preservar a sessão após confirmar o link, aceita o endereço usado por modelos anteriores e distingue indisponibilidade de link inválido.

- Corrige os links do e-mail de recuperação para abrir a confirmação da nova senha, inclusive em outro navegador. Modelo de produção sincronizado sem enviar mensagens de teste.

- Testes de navegação no CI executam sem concorrência entre navegadores e aguardam a compilação inicial da interface, preservando todas as verificações.

- Corrige os rótulos de acompanhamento dos retrospectivos: respeita a dispensa de Nada Consta e identifica as correções como responsabilidade da secretaria.

- A varredura de acessibilidade da Central de ajuda usa o mesmo prazo da página inicial, mantendo todas as verificações.

- Testes públicos aguardam explicitamente a interface pronta, sem depender do carregamento completo dos widgets externos.

- Migrações e modelos Auth sincronizados em produção, com evidências de validação do lançamento e atualização da prévia.

- Consolida o MVP para lançamento: fluxo do RI e acervo retrospectivo, ajustes de atendimento e e-mails, tutorial de PDF/A como link discreto e verificações completas de aplicação e banco.

- E-mails de atendimento concluído sem publicação registrada passam a oferecer acesso à página pública do trabalho no Pronto!, em lugar do painel.

- Unifica os e-mails finais como Atendimento concluído, mantendo o endereço permanente quando houver publicação verificada no RI.

- URLs alternativas dos e-mails com fonte uniforme, destaques preservados e avisos de conclusão da ficha sem referência a guia ou RI para solicitante e coordenação.

- Ajustes dos modelos de e-mail conforme parecer: links alternativos após cada botão, rodapé comum, caixas para respostas e declarações e textos específicos por ocasião dos lembretes. Catálogo renovado para conferência; conclusão sem RI permanece pendente de decisão.

- Catálogo de revisão dos 23 modelos e variantes de e-mail, com prévias visuais, conteúdo completo e espaço para parecer individual, sem alterar os envios.

- Aviso de PDF/A na etapa de arquivo, com acesso ao tutorial oficial do RI; orientação sobre escolha de licenças na etapa de licença.

### 21 de outubro de 2026

- Coleção e tipo de documento confirmados ficam nas etapas 1 e 2 do guia. Campos com botão de copiar bloqueiam seleção e cópia manual, incluindo nomes e datas; a cópia continua pelos botões próprios.

- Dados para copiar e conferir passam a integrar a etapa 3 do roteiro do RI; a confirmação de envio fica na etapa 8, mantendo a sequência do guia.

- Guia sem atalho redundante de abertura do RI, com oito etapas conectadas na ordem de execução. A retomada respeita o início registrado e a preparação válida, evitando reiniciar automaticamente em Antes de começar.

- Guia do RI revisado para continuar a preparação sem repetir verificações de conta, liberação e destino. Envios já registrados direcionam ao acompanhamento no RI em vez de nova submissão. Textos atualizados em todos os idiomas.

- Removida a confirmação redundante de login no rodapé: após conferir o destino na janela da etapa 0, a pessoa pode iniciar diretamente o guia.

- O Passo 1 do acesso ao RI exige confirmação de login por checkbox antes de mostrar o início do guia; ícones ampliados e alinhados à esquerda nas duas fases.

- Orientação final do preparo do RI volta à coluna esquerda do botão, com quebra de linha e alinhamento vertical centralizado.

- Na preparação com conta e liberação corretas, uma única ação pulsante abre o login do RI e depois se transforma no botão de iniciar o guia.

- Ações finais do preparo do autodepósito mais compactas, com destaque do guia somente após clicar no login. Traduções completas das novas orientações, respostas, modais, lembretes e confirmação de envio para os cinco idiomas adicionais do Pronto!.

- O acesso destacado ao RI acompanha a resposta inicial: aparece como cadastro ou login no cabeçalho, ou como primeiro passo ao lado do início do guia quando a liberação já está correta.

- Desativar o guia de um programa oculta o fluxo de autodepósito também para o acervo retrospectivo, bloqueando acesso direto e operações no banco. O guia passa a registrar a declaração de submissão para aguardar validação da Biblioteca. A ficha mostra até três autores na responsabilidade, separados por vírgula; com mais de três, primeiro autor e ... [et al.].

- Etapas que aguardam confirmação da conta ou liberação/correção do RI usam quadrado azul com relógio, distinguindo a espera da conclusão com check verde.

- Grupos de três opções do preparo do RI passam a três colunas iguais em telas amplas, mantendo uma coluna em telas pequenas.

- Etapas concluídas do preparo do RI mostram quadrado verde com check, como na geração da ficha. O número reaparece quando uma alteração desfaz a confirmação; etapas puladas mantêm sua indicação própria.

- O contato durante a espera por confirmação do RI recebe campo de e-mail proporcional, cópia alinhada e orientação separada; removido o botão Escrever ao RI/UFBA.

- As orientações de cadastro removem o botão duplicado de abrir o RI e apresentam o tutorial como link discreto, sem borda, com ícone proporcional.

- A etapa 0 remove a opção redundante de liberação em outro destino; essa situação continua identificada pelo modal de conferência e encaminhada ao pedido de correção.

- A divisória do cabeçalho Antes de começar passa abaixo do título e do botão do RI em toda a largura; o botão orienta voltar ao Pronto! e alternar entre as abas durante as verificações.

- Orientações de cadastro no RI passam a três passos visuais com ícones, títulos curtos e ações de abrir o repositório e consultar o tutorial junto ao primeiro passo.

- O cabeçalho do Antes de começar oferece login destacado no RI com orientação para as verificações. Os blocos de contato incluem botão discreto de copiar o e-mail do repositório.

- Textos do Antes de começar especificam liberação para depositar e destino do depósito nos rótulos, respostas, orientações e modais, sem acrescentar blocos de explicação.

- O endereço repositorio@ufba.br aparece em destaque antes das orientações de espera e da preparação de mensagens de liberação ou correção do RI.

- Informar destino incorreto no modal da etapa 0 seleciona automaticamente a resposta de liberação em outro destino e abre a correção. O roteiro dos modais começa pelo login no RI/UFBA e pelo botão Iniciar um novo depósito.

- O cadastro no RI aguarda 120 segundos e então pergunta se a conta foi confirmada, sem avanço automático. Respostas de espera exibem contato e lembrete opcional com data e hora; pedidos de liberação/correção seguem a mesma confirmação explícita, sem temporizador. Orientações e modais recebem passos numerados, e o retorno redundante foi removido.

- Etapas dispensadas do preparo do RI indicam que foram puladas conforme a resposta da etapa 0, com justificativa; etapas ainda bloqueadas apontam a confirmação realmente necessária, evitando retornos desnecessários.

- QR vetorial reposicionado no canto inferior esquerdo, com margens iguais e tamanho ajustado à referência. Degradês do feed acompanham interação e cartões cortados, desaparecendo no topo e no fim respectivos.

- O preparo do RI remove o aviso de respostas salvas e permite optar por um lembrete por e-mail no segundo dia útil durante a espera de cadastro, liberação ou correção. A pessoa pode cancelar antes do envio; avançar no fluxo cancela lembretes pendentes.

- QR vetorial reduzido e alinhado à margem da ficha; frases de carregamento a cada 1,6 segundo. O preparo do RI usa perguntas e respostas com expansão suave, modal contextual com orientação dos campos do RI e barra interna durante a espera; a prévia do e-mail permite cópia apenas pelos botões.

- A ficha final recebe QR maior e sem transparência, alinhado à indicação de emissão revisada, com Pronto! em itálico. O preparo do RI confere coleção e tipo de documento em modal padrão antes de registrar a decisão.

- A preparação do RI concentra o destino nas decisões de conferência, registra respostas em primeira pessoa e mantém as decisões encadeadas em área estável. A confirmação após as instruções de cadastro tem contagem de 120 segundos; a liberação direta destaca o botão do guia.

- O preparo do autodepósito recebe cartões e decisões mais compactos, ícones visíveis, cabeçalhos alinhados e ação final organizada; confirmar acesso na etapa 0 leva suavemente ao botão do guia.

- A conferência de acesso ao RI mostra a coleção pelo caminho completo e o tipo de documento separadamente, acompanhando os campos vistos pelo estudante no repositório.

- A preparação do autodepósito passa a conduzir decisões condicionais sobre cadastro, pedido e liberação no destino correto, com pedido de correção quando houver divergência e retomada por trabalho na conta. As mensagens de carregamento alternam mais rapidamente.

- Acervo retrospectivo e Depósitos pendentes adotam os componentes de cabeçalhos, indicadores, cartões, guias e ações do painel. As quatro atribuições de depósitos passam a aparecer na gestão de permissões, com autorização no banco. O dropdown de ordenação volta ao estilo compartilhado do Pronto!.

- A submissão da secretaria retoma pela matrícula quando ela falta e mostra a RAU+E selecionada em campo inativo. Ajustados degradê inferior do feed, alinhamento do seletor de ordenação e frases de carregamento com transição suave.

- Depósitos pendentes passa para Administração → Controle, preservando filtros, ações e permissões.

### 20 de outubro de 2026

- A homologação usa orientação de confirmação adequada a qualquer largura e dispensa ajuda nesse checkbox; o menu móvel se alinha ao botão de abertura. A seleção de tipos de nota conforme AACR2 foi registrada como pendência futura.

- Cartões da fila, ordenação, títulos, ajudas e menus recebem ajustes para telas pequenas. A análise ganha revisão dos campos com atalhos e atualização automática das correções recebidas, preservando edições em outros campos.
- O acervo retrospectivo ganha orientações por etapa, identificação da secretaria como responsável pelo envio e RAU+E definida na submissão; o encerramento é apresentado como ação da Biblioteca.

- O TFG passa a admitir até três autores, com ordenação como na RAU+E. Na secretaria, a matrícula é identificada como a do primeiro autor, a representante não pode integrar a autoria e o protocolo enviado oferece novo pedido em destaque. O botão de envio preserva contraste ao passar o mouse.

- Em preparação: relação de depósitos posteriores ao encerramento, com confirmação histórica, lembretes individuais ou em lotes após habilitação do guia e registro da URL conferida pela biblioteca.
- Pessoas já autenticadas são encaminhadas ao painel ao abrir a entrada; o guia do trabalho é preservado como destino após o login.
- Título e descrição públicos passam a identificar fichas catalográficas e autodepósito, com metadados de busca e compartilhamento consistentes.

- O depósito dos pedidos retrospectivos da RAU+E permanece disponível mesmo quando o guia dos pedidos comuns está desativado.

- A secretaria da RAU+E recebe acesso provisório para várias fichas retrospectivas, com dispensa de Nada Consta, indicação individual das publicações no RI e inativação administrativa após concluir o lote.

### 19 de outubro de 2026

- A página pública inclui a tag de verificação para acompanhar sua indexação no Google Search Console.
- A imagem de compartilhamento mantém o logotipo completo na miniatura quadrada usada pelo WhatsApp.
- A documentação deixa de repetir o nome da ferramenta de desenvolvimento fora do crédito público aprovado.
- A prévia reúne as melhorias de navegação, responsividade, autenticação, solicitação, acompanhamento, autodepósito e ajuda para publicação no Pronto!; as telas públicas e do estudante, inclusive a demonstração, completam os textos nos seis idiomas disponíveis.
- A navegação entre abas administrativas preserva a transição sem alterar estado durante a renderização; os testes de geração de PDF e recuperação de senha acompanham os fluxos atuais.

### 18 de outubro de 2026

- A gestão de Ajuda e FAQ avisa quais conteúdos ainda precisam de tradução, lista os idiomas pendentes e abre cada item diretamente com rolagem suave.
- A Central de ajuda ganha um artigo persuasivo sobre o valor do autodepósito no RI/UFBA para a circulação, identificação e preservação dos trabalhos acadêmicos.
- O artigo sobre a ficha catalográfica explica seu papel na descoberta atual de trabalhos em catálogos, bases de dados, repositórios e buscas na internet.
- Após a conclusão do protocolo, o painel estudantil destaca o pedido com nova matrícula e mostra o protocolo encerrado de forma discreta; a demonstração da equipe acompanha o mesmo layout.
- Nas telas de avaliação do estudante e na demonstração, a biblioteca passa a ser identificada como BIB/FAUFBA.
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
- A marca do Pronto! foi atualizada em cabeçalhos, painel, compartilhamento e e-mail; favicon e ícone de instalação usam seus quadrados sem fundo. O logo da biblioteca foi refeito para os temas claro e escuro e ganhou no rodapé uma animação do lema “Arquitetura, Urbanismo e muito +”. O crédito de *vibe coding* no rodapé mantém o destino aprovado.
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

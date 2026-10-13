# Histórico de mudanças

Este arquivo registra a evolução funcional do **Pronto!** desde o início do projeto, com base nas entregas e decisões documentadas. As datas abaixo se referem ao desenvolvimento; **não indicam publicação em produção**. O histórico do repositório atual começa na migração de outubro de 2026, mas o trabalho no sistema começou antes dela.

A partir de agora, cada pull request deve acrescentar uma nota datada à seção **Em preparação**, descrevendo mudanças para estudantes, equipe ou operação. Ao publicar uma versão, essas notas serão agrupadas sob o número e a data da versão.

## Em preparação — 0.1.0

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

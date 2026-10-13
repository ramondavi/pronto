# Pronto!

**Assistente de Fichas Catalográficas e Autodepósito** da Biblioteca da Faculdade de Arquitetura (BIB/FA), vinculada ao Sistema Universitário de Bibliotecas da Universidade Federal da Bahia (SIBI/UFBA).

> **Situação:** MVP em preparação para piloto. A publicação da versão atual e a sincronização do banco de produção ainda dependem das etapas descritas em [Estado atual](docs/estado-atual.md). A presença de uma funcionalidade no repositório não significa que ela já esteja liberada no site público.

O Pronto! organiza o caminho entre a solicitação da ficha catalográfica e o autodepósito do trabalho acadêmico no Repositório Institucional da UFBA. O estudante acompanha um protocolo, enquanto a equipe da biblioteca revisa os metadados, homologa a ficha e orienta a etapa final. A decisão catalográfica permanece com o bibliotecário.

## Para quem é

| Público | O que encontra no sistema |
| --- | --- |
| Estudantes concluintes | Cadastro institucional, solicitação, acompanhamento de pendências, ficha homologada e guia de autodepósito. |
| Bibliotecários catalogadores | Fila de atendimento, análise de metadados, devolução por campo, revisão e homologação da ficha. |
| Administração da biblioteca | Gestão de equipe e programas, comunicados, prazos, conteúdo de ajuda, indicadores, retenção e auditoria. |
| Coordenações | Acompanhamento delimitado dos protocolos encerrados, sem acesso a CPF, documentos ou comentários internos. |

## Percurso do protocolo

1. O estudante confirma o e-mail institucional e abre a solicitação para um trabalho já defendido e aprovado.
2. Informa os metadados e um link público para o trabalho. O PDF completo não é enviado ao Pronto!.
3. A biblioteca analisa os dados, registra pendências quando necessário e homologa a ficha catalográfica.
4. O estudante recebe a ficha e pode mesclá-la ao PDF do trabalho no próprio navegador.
5. O guia auxilia o autodepósito no Repositório Institucional; a biblioteca confere a publicação e encerra o protocolo.

O PDF do **Nada Consta** é a exceção ao processamento local: fica em armazenamento privado e temporário, com expurgo programado para 60 dias após o encerramento. A página pública da ficha usa identificador aleatório e não expõe o protocolo interno.

## Recursos implementados

- Autenticação pelo Supabase Auth, confirmação de e-mail institucional e perfis Estudante, Catalogador e Administrador.
- Formulário com salvamento local, prevenção de protocolos simultâneos e acompanhamento de status e prazos.
- Fila bibliotecária com atribuição de atendimento, pendências por campo e histórico de comunicações.
- Catalogação assistida, geração e homologação da ficha, QR Code e página pública de consulta.
- Mesclagem da ficha ao trabalho no navegador, sem armazenamento do PDF completo no servidor.
- Guia de autodepósito no RI/UFBA e encerramento acompanhado pela biblioteca.
- Administração de programas, equipe, comunicados, ajuda, indicadores e auditoria.
- Interface responsiva com temas claro e escuro, recursos de acessibilidade e páginas públicas em seis idiomas.

O [Documento-Mestre](docs/documento-mestre.md) define o escopo e as regras aprovadas. [Decisões pendentes](docs/decisoes-pendentes.md) reúne o que ainda exige definição; possibilidades futuras não fazem parte do MVP por padrão.

## Arquitetura e cuidados com dados

| Camada | Tecnologia e responsabilidade |
| --- | --- |
| Aplicação | Next.js 16, React 19 e TypeScript; páginas públicas e painéis por perfil. |
| Dados e acesso | PostgreSQL/Supabase, migrações SQL versionadas e políticas RLS. |
| Arquivos | Supabase Storage privado apenas para documentos leves e temporários autorizados. |
| PDF | Geração e mesclagem no navegador sempre que possível. |
| Qualidade | Testes unitários, pgTAP, Playwright, checagem de tipos, lint e build no CI. |

Segredos pertencem aos cofres dos provedores e nunca a variáveis públicas ou ao Git. Contas bloqueadas ou inativas perdem acesso operacional. Migrações de produção exigem revisão de impacto e autorização específica.

## Desenvolvimento local

**Pré-requisitos:** Node.js 22 ou superior, npm, Docker e Supabase CLI para os fluxos de banco. Para iniciar somente a aplicação, configure as variáveis locais de acordo com [Configuração do Supabase](docs/configuracao-supabase.md).

```bash
cp .env.example .env.local
npm ci
npm run dev
```

No PowerShell, substitua o primeiro comando por `Copy-Item .env.example .env.local`. Abra `http://localhost:3000`. Nunca envie o conteúdo de `.env.local` para o repositório ou para conversas.

Para a verificação integrada, execute `npm run verify`. Os testes de navegador e de banco também rodam no CI; veja [Validação do MVP](docs/validacao-mvp.md) para o roteiro completo. Não aplique migrações no banco hospedado como parte da preparação local.

## Documentação

- [Estado atual e próximos passos](docs/estado-atual.md)
- [Regras do projeto](docs/documento-mestre.md)
- [Decisões pendentes](docs/decisoes-pendentes.md)
- [Mapa do código e da documentação](docs/mapa-projeto.md)
- [Operação do MVP](docs/operacao-mvp.md)
- [Validação do MVP](docs/validacao-mvp.md)
- [Histórico de mudanças](CHANGELOG.md)

## Manutenção e autoria

O desenvolvimento é conduzido por **Ramon Davi Santana**, bibliotecário da BIB/FAUFBA, com decisões de serviço documentadas para a equipe e a instituição. A descrição do projeto e seu histórico de funcionalidades não dependem do histórico de commits do repositório anterior.

O código do Pronto! está preparado para publicação sob a [GNU Affero General Public License, versão 3](LICENSE). A licença do código não concede uso das [marcas e imagens institucionais](ASSETS.md). Cada novo pull request deve acrescentar ao [changelog](CHANGELOG.md) uma nota datada que explique o que mudou para as pessoas usuárias ou para a operação. As condições de contribuição institucional seguem as decisões registradas no Documento-Mestre.

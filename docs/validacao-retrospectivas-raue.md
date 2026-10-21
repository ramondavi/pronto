# Acesso provisório da secretaria da RAU+E

Preparado em 20/10/2026, sobre a master `dbfe82c`, em área isolada. A decisão de dispensar Nada Consta e encerrar o acesso por confirmação administrativa foi aprovada nesta conversa.

## Escopo

- Conta institucional confirmada, dedicada ao lote e concedida por administrador.
- Vários protocolos simultâneos, exclusivamente da RAU+E, com autoria própria de cada trabalho e dispensa persistida de Nada Consta.
- Ficha homologada pela biblioteca; URL do RI informada pela secretaria e conferida pela biblioteca antes da conclusão.
- Encerramento administrativo após terminar as remessas, com pelo menos um protocolo concluído e nenhum aberto; inativação imediata por RLS e preservação do histórico.
- A conta real indicada pelo responsável ainda não foi provisionada nem ativada remotamente. Nenhum dado ou segredo de produção foi consultado.

## Evidências locais

- 123 testes da aplicação aprovados; verificação de tipos aprovada; lint sem erros, com 14 avisos preexistentes nos componentes existentes.
- Compilação de produção aprovada pelo método padrão. A raiz de resolução das dependências foi ajustada temporariamente para o teste da área isolada e restaurada ao terminar; a configuração versionada permanece preservada.
- Todas as migrações de esquema executadas em PostgreSQL em memória (PGlite). Serviços de Auth e Storage foram representados por estruturas locais; cron, rede, Vault e entrega real de e-mails não foram executados.
- Os 24 casos de `supabase/tests/database/retrospective_raue.test.sql` passaram nesse banco: concessão administrativa, isolamento de contas, dois pedidos ativos, ausência de nascimento fictício, restrição à RAU+E, limite preservado para estudantes comuns, entrega sem Nada Consta, URL do RI, conferência profissional e inativação.
- Prévia com respostas fictícias de autenticação e dados: lista de protocolos, abertura do formulário sem nascimento pessoal, envio de um terceiro pedido, rejeição de URL externa e aceitação de URL do RI; computador e celular sem excesso horizontal. Esta etapa não usa o Supabase hospedado.
- Captura consolidada: `tmp/retrospective-preview/consolidada.png`; capturas individuais na mesma pasta. O ambiente de desenvolvimento apresentou aviso de hidratação em comportamento já existente do cabeçalho.

## Ativação futura

A migração `202610210000_retrospective_raue.sql` deve ser revisada e aplicada antes do novo código. Ela cria as concessões e os relatos de publicação, marca os pedidos retrospectivos e adapta as funções de submissão, entrega e encerramento. O CPF continua obrigatório para perfis estudantis comuns; somente a representação administrativa dedicada admite sua ausência. Nenhuma conta recebe acesso apenas pelo endereço de e-mail.

A aplicação remota exige explicação de impacto e confirmação explícita. Depois dela, conferir a conta institucional confirmada, conceder o acesso na gestão de contas e testar a integração e as comunicações na hospedagem. Não foi aberto PR nesta etapa.

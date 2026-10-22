# Acesso provisório da secretaria da RAU+E

Preparado em 20/10/2026 sobre a master `dbfe82c`, em área isolada. A dispensa de Nada Consta e o encerramento administrativo do lote foram aprovados pelo responsável.

## Escopo e provisionamento

- Conta institucional confirmada e dedicada ao lote, concedida por administrador em Administração → Operação → Contas → Acesso provisório da secretaria da RAU+E.
- A conta deve existir no Supabase da prévia antes da concessão; o administrador informa seu nome e e-mail. O endereço sozinho não concede acesso.
- Vários protocolos simultâneos exclusivamente da RAU+E, com autoria própria de cada trabalho, dispensa persistida de Nada Consta e homologação bibliotecária.
- A secretaria informa a URL permanente do RI; a biblioteca confere antes de concluir. O depósito retrospectivo independe da ativação do guia dos pedidos comuns.
- O administrador encerra o lote após terminar as remessas, com ao menos um protocolo concluído e nenhum aberto. A conta fica inativa por RLS, preservando o histórico.
- Por orientação do responsável, não foi criada conta real, definida senha ou enviado convite à secretaria. O próprio responsável fará o provisionamento na prévia; a produção ficará para publicação posterior.

## Publicação e evidências

- Publicado na branch `codex/ajustes-administracao-remota`, associada ao endereço de prévia indicado pelo responsável. A Vercel confirmou a implantação como Preview.
- Conferido o endereço público de banco específico dessa branch: projeto Supabase Pronto! Prévia. O banco principal foi preservado.
- As migrações `202610210000_retrospective_raue.sql` e `202610210001_retrospective_repository_access.sql` foram aplicadas somente na prévia, no escopo autorizado pelo responsável. A segunda preserva a migração incorporada e corrige o bloqueio encontrado com o guia comum desativado.
- 123 testes da aplicação aprovados; verificação de tipos e lint aprovados, sem novos avisos. A compilação padrão da entrega inicial passou localmente e na Vercel; a correção complementar é acompanhada pela implantação da mesma branch.
- Os 24 casos de `supabase/tests/database/retrospective_raue.test.sql` passaram também no banco remoto de prévia, com pgTAP real, em transação revertida. Incluem isolamento, vários pedidos, nascimento, limitação dos estudantes comuns, entrega sem Nada Consta, depósito com guia comum desativado, conferência profissional e inativação.
- O executor pg_prove depende do Docker indisponível; o mesmo SQL de teste foi executado pela consulta oficial do banco, capturando cada resultado pgTAP e revertendo todos os dados fictícios. Resultado: 24 verificações, zero falhas.
- A prévia local com respostas fictícias de Auth e dados foi conferida em computador e celular: lista, formulário sem nascimento pessoal, terceiro pedido e rejeição/aceitação de URL. Captura: `tmp/retrospective-preview/consolidada.png`. Houve aviso preexistente de hidratação do cabeçalho no desenvolvimento.

## Limites

A confirmação de recebimento de e-mails, a entrada com a conta real da secretaria e a publicação em produção não foram executadas. Não houve envio de convite. Os testes não modificaram dados reais, segredos ou configuração dos pedidos comuns. Não foi aberto PR nesta etapa.

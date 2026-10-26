# Ensaio de Auth após restauração — 26/10/2026

## Resultado e alcance

Ensaio exclusivamente sintético concluído: 94 tabelas restauradas e conferidas, seis contas fictícias autenticadas pelo Auth v2.197.0. Senhas fictícias foram definidas antes da exportação; o login ocorreu depois da abertura da cópia criptografada e da restauração. Não foram usadas senhas reais nem alterada a produção.

Foram conferidos assinatura e identidade das sessões, consulta da própria conta, rejeição de senha errada, renovação, saída e rejeição do refresh após saída. As consultas com o papel authenticated e as declarações da sessão autenticada comprovaram isolamento dos dois estudantes, permissões distintas de catalogador/administrador e ausência de acesso operacional das contas bloqueada e inativa. Alterações de teste foram revertidas por transação.

Auth pode autenticar uma conta bloqueada; o bloqueio operacional é aplicado pelas políticas do banco. O teste verifica essa distinção. Não afirma que o provedor rejeita a senha da conta bloqueada.

## Isolamento

A origem continha somente as seis contas do teste de autorização do repositório, em banco descartável identificado por rótulo e publicado somente em loopback. O destino restaurado usou rede none, nenhuma porta publicada, dados em memória e sistema de arquivos somente leitura. O binário público oficial do Auth foi conferido por SHA-256 antes e depois da transferência para uma montagem separada; as montagens de dados permanecem noexec. O serviço recebeu configuração local explícita e não executou migrações, SMTP ou integrações externas. O destino foi removido após o teste.

## Reprodução técnica

Teste unitário: test_restore_auth.py. Integração optativa: test_restore_auth_integration.py, com BACKUP_AUTH_INTEGRATION_STATE apontando para metadados locais da origem descartável e BACKUP_AUTH_TEST_BINARY para o binário oficial previamente conferido. O estado informa project, container e ready; o executor exige rótulo pronto.auth.fixture correspondente, nome pronto-auth-drill seguido de dez caracteres hexadecimais e publicação exclusiva em 127.0.0.1:55442. Recusa usuários diferentes das seis identidades fictícias. Ferramentas PostgreSQL 17 e age devem estar disponíveis. Nunca apontar para produção ou para o banco local de uso normal.

## Pendências preservadas

Esta evidência complementa a restauração real de 24/10 (96 tabelas e nenhum PDF), mas não substitui um ensaio de Auth sobre aquela cópia real. O formulário de restauração real ainda informa auth_service_login_tested=false. Login pelo site, cookies/redirecionamentos, configurações externas de e-mail/domínio e expurgos não foram comprovados por este teste. O substituto autorizado ainda será definido. A agenda permanece desativada; o PR #20 permanece aberto, sem incorporação automática.

## Verificações de código

Integração Auth reproduzível: cinco testes passaram (quatro unitários e um roundtrip completo). Integração de restauração: 15 testes passaram, incluindo preservação de revogações e rejeição de políticas divergentes. Suíte de backup: 83 testes, oito integrações optativas ignoradas nessa execução; os dois grupos acima foram executados separadamente.

Validação geral: 138 testes da aplicação, tipos, lint e build passaram. Lint mantém 13 avisos preexistentes e nenhum erro. Origem descartável, pilha auxiliar e rede própria removidas; banco fictício da integração encerrado.

## Preparação adicional da cópia real

Etapa opcional integrada ao executor protegido. A revalidação sintética passou também na inserção posterior à conferência: contas fictícias recriadas somente no destino descartável, novo login/perfis conferidos e ambiente removido. Sete testes de Auth passaram, incluindo prevenção de conflitos e senha somente por entrada padrão. Suíte Python: 85 testes, oito optativos ignorados; integração Auth executada separadamente. Testes da aplicação: 138 passaram após compactar o resumo ao limite documental. Formulário vazio conferido visualmente; captura fora do Git. A execução sobre a cópia real aguarda preenchimento pessoal do formulário e não foi declarada concluída.

## Ensaio na cópia real concluído

Em 26/10/2026 às 19h55min03s de Brasília, o executor protegido concluiu a restauração da cópia real em 87,1 segundos. Conferiu 96 tabelas, nenhum documento e equivalência estrutural por referência isolada antes de inserir os registros fictícios. A cópia é a mesma já conferida em 24/10: SHA-256 f549437e68ebee82a696ee2174d47f4c1187040c3f51362f069aa61404778ab5, criada em 24/10 às 21h16min59s de Brasília.

Após a conferência de integridade, seis contas fictícias foram criadas somente no destino sem rede. Login, assinatura/identidade das sessões, rejeição de senha incorreta, refresh, saída/revogação e políticas de acesso dos perfis passaram, incluindo isolamento dos estudantes e bloqueio operacional de contas blocked/inactive. Nenhuma senha de conta real foi utilizada. O relatório registra auth_service_login_tested=true e auth_validation_scope=synthetic_accounts_in_verified_restored_copy.

Limpeza confirmada pelo executor: contêiner removido, credencial temporária B2 revogada e arquivos de trabalho removidos antes de registrar sucesso. Consulta posterior não encontrou contêineres com o rótulo do executor. Não houve alteração em produção, publicação de portas ou ativação da agenda. O relatório técnico sem dados pessoais foi guardado fora do Git.

Este resultado encerra a pendência de Auth/perfis na cópia real indicada nas seções anteriores. Não comprova recuperação da senha de uma conta real nem o fluxo do site (cookies, redirecionamentos e telas), que continuam explicitamente false no relatório. Atributos elevados dos papéis não foram importados; somente o papel limitado do Auth recebeu login local temporário. Alertas não foram repetidos neste ensaio: suas evidências anteriores permanecem separadas. Substituto ainda será definido.

Complemento posterior: fluxo do site conferido com dados fictícios em ambiente separado; evidência em validacao-site-recuperacao-2026-10-26.md. O campo website_login_tested=false no relatório da cópia real permanece correto: aquela cópia não foi exposta ao navegador.

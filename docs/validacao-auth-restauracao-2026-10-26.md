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

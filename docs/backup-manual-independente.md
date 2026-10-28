# Backup manual independente — Pronto!

Preparação autorizada em 23/10/2026. A alternativa usa a mesma cobertura, snapshot e formato criptografado da rotina automática, mas gera uma cópia nova por acionamento e a guarda em pasta privada ou disco externo. Não chama GitHub, Backblaze B2, Healthchecks ou Vercel durante a geração. Precisa do Supabase disponível e de internet; se a origem estiver indisponível, só se pode recorrer às cópias anteriores.

## Uso pelo responsável

1. Prepare antecipadamente o pacote portátil para Windows e guarde uma cópia fora do repositório, sob controle institucional apropriado. Extraia a pasta inteira; não execute somente arquivos de dentro do ZIP.
2. Guarde no gerenciador a conexão Session pooler de produção (porta 5432), a senha do banco e a chave de servidor do Supabase. O pacote contém somente o endereço público do projeto, o certificado CA e a parte pública de recuperação. Nenhuma senha, token, identidade privada ou credencial GitHub/B2 acompanha o pacote. Não é possível recuperar os valores de GitHub Secrets para gerar a cópia durante uma indisponibilidade.
3. Abra **Iniciar backup manual.cmd**. Uma página local temporária será aberta no navegador. Informe pessoalmente os três acessos e a pasta de destino privada, fora do Git. Não envie campos, capturas ou o arquivo de recuperação pelo chat.
4. Clique em **Gerar cópia criptografada nesta pasta** e aguarde a confirmação. O botão autoriza essa exportação local. Não modifica registros, não envia e-mails e não altera o agendamento automático.
5. Guarde juntos o arquivo `.tar.gz.age` e seu recibo `.json`. O recibo registra criação, tamanho, SHA-256, origem e vencimento de 90 dias, sem dados de fichas ou nomes dos documentos. O arquivo é lido novamente após a cópia e só recebe recibo válido depois da conferência. Arquivos `.partial`, recibos inválidos ou arquivos sem recibo não comprovam sucesso.
6. Guarde a identidade privada de recuperação separada, no mecanismo autorizado. Essa identidade é necessária para abrir a cópia, mas não para gerá-la. Reaplique expurgos/restrições e use ambiente isolado ao restaurar, conforme protocolo-backup-recuperacao.md. Nunca restaure sobre produção automaticamente.

## Segurança e limites

A página escuta só em 127.0.0.1, usa Host/Origin estritos e CSRF, recusa enquadramento e cache, não registra requisições e não carrega recursos externos. Credenciais são usadas em memória e no ambiente dos subprocessos oficiais, sem arquivo de configuração secreto ou argumento de comando. A conexão ao banco exige TLS verify-full, certificado CA e porta de sessão. Outros projetos e o pooler de transações são recusados.

Dados temporários em claro ficam em diretório exclusivo durante a operação. No Windows a ACL permite somente o usuário, SYSTEM e Administradores, sem permissões herdadas; falha na proteção interrompe a operação antes da exportação. Ao terminar ou falhar, os temporários são removidos. Remoção de arquivos não equivale a apagamento forense em SSD; manter o computador autorizado e armazenamento protegido. O destino final recebe somente a cópia criptografada e recibo mínimo.

A alternativa respeita a cobertura de public/auth/storage/supabase_migrations e os papéis sem senhas; a consistência dos PDFs depende da reconciliação antes/depois do inventário. Falha, exclusão concorrente, exportação filtrada ou arquivo incompleto interrompem a cópia. Ela não altera os limites e garantias dos provedores. Não há garantia de imutabilidade de um disco local: controle físico/de acesso e outra cópia independente continuam necessários. O tamanho máximo de um arquivo segue 2 GB nesta implementação.

O responsável precisa eliminar cada cópia manual ao fim de 90 dias, salvo preservação necessária documentada. O vencimento no recibo não apaga mídia desconectada. Não reduzir o prazo nem manter cópias indefinidas para contornar indisponibilidade. O registro automático no B2/monitor não recebe a execução manual; conferir o recibo local e registrar a ocorrência operacional sem dados pessoais.

Não há botão de restauração, leitura de senha ou aba administrativa nesta entrega. O pacote não substitui o primeiro ensaio real, o teste de alertas, a custódia institucional e o substituto. O ensaio foi comprovado em 24 e 26/10, mas BACKUP_ENABLED continua false até o aceite operacional e a definição dos responsáveis. Resumo vigente: [Operação dos backups](operacao-backups.md).

## Ferramentas e manutenção

O construtor scripts/backup/build_manual_package.py monta a pasta com Python embutido 3.14.9, psycopg 3.3.6, clientes PostgreSQL 17.11 e age 1.3.2. Dependências e ferramentas são incluídas previamente: a execução de contingência não instala nem baixa nada. Atualizações exigem reconstruir, verificar e testar o pacote antes de substituir a versão guardada. O inventário integridade-pacote.json registra hashes dos arquivos para detectar corrupção; não é assinatura independente contra alteração maliciosa.

Fontes oficiais consultadas em 23/10/2026: https://www.python.org/downloads/release/python-3149/, https://www.enterprisedb.com/download-postgresql-binaries e https://github.com/FiloSottile/age/releases/tag/v1.3.2. Python, pip e age tiveram os hashes publicados conferidos; o arquivo PostgreSQL foi baixado por HTTPS do fornecedor indicado na página oficial e seu hash foi registrado, sem presumir checksum independente publicado.

## Estado acompanhado

PR 15 incorporado com todas as checagens aprovadas. A primeira verificação remota somente de leitura foi autorizada e executada; interrompeu-se na etapa de conexão ao banco, sem fichas/PDFs consultados ou cópia criada. O diagnóstico anterior retornava somente access_check_failed; a melhoria desta entrega distingue códigos estáticos de autenticação, TLS, rede e projeto/pooler, sem mostrar a mensagem do provedor. Credenciais válidas para produção e primeiro ensaio real ainda precisam ser comprovados.

## Validação desta entrega

Em 23/10/2026, os 53 testes Python passaram, incluindo exportação, criptografia, abertura e restauração real de dados exclusivamente fictícios em PostgreSQL local isolado, com as ferramentas portáteis para Windows. A aplicação passou em 138 testes, tipos, lint e build; o lint manteve 13 avisos preexistentes em arquivos não alterados. O formulário local foi conferido no navegador com execução simulada, sem conexão com produção. Essas verificações não comprovam restauração dos dados reais.

Em 24/10/2026, após redefinição pessoal e recadastro protegido da senha, a conexão de produção deixou de apresentar recusa de credenciais. A verificação parou em readonly_connection_required, antes de SELECT 1 ou leitura de registros. A correção inicia BEGIN READ ONLY e continua exigindo transaction_read_only=on; não depende apenas de PGOPTIONS atravessar o pooler. Os 54 testes Python passaram com restauração sintética e um teste de conexão cuja sessão permite escrita por padrão. A nova execução remota continua pendente de incorporação; BACKUP_ENABLED permanece false.

## Retomada de 28/10/2026

Os ensaios de restauração/Auth/site e os avisos foram concluídos conforme as evidências de 24 e 26/10. A agenda continua desligada. O substituto foi designado, e uma nova cópia operacional foi concluída no run 40724106039 em 28/10. Entrega do pacote/acessos ao substituto, custódia no Proton Pass e aceite da operação permanecem pendentes; não reconstruir nem substituir um pacote comprovado por versão sem os ensaios exigidos. Nenhum novo ensaio ou pacote foi executado nesta retomada. Ver operacao-backups.md.

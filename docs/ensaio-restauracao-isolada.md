# Ensaio local de recuperação

Atualizado em 24/10/2026. Complementa a seção 5 de protocolo-backup-recuperacao.md. O responsável autorizou este computador para o ensaio temporário com dados reais; produção não pode ser sobrescrita.

## Situação comprovada

A primeira cópia real foi concluída e conferida no [run 40146034584](https://github.com/ramondavi/pronto/actions/runs/40146034584), em 24/10/2026 às 21h19 de Brasília. A agenda continua desativada. O responsável informou que ainda não existem PDFs de solicitações; o inventário real deve ser conferido pelo ensaio, sem presumir arquivos inexistentes.

O ensaio sintético restaurou três tabelas de banco/Auth/Storage, comparou contagens, hashes de todas as linhas e estrutura incluindo RLS, e removeu o banco descartável. Isso valida a ferramenta com dados fictícios; não comprova ainda a recuperação da cópia real.

## Procedimento protegido

1. Preparar as ferramentas oficiais de PostgreSQL 17 e age e carregar previamente a imagem Supabase PostgreSQL fixada no executor por digest. Não baixar software durante a abertura de dados privados.
2. Abrir `restore_server.py` em loopback. O responsável informa pessoalmente identificador/chave principal B2 e somente a linha nativa da identidade age do gerenciador de senhas. Nunca enviar pelo chat, salvar nos argumentos do processo ou inspecionar campos preenchidos.
3. O botão explica e autoriza uma credencial temporária com `listFiles`/`readFiles`, restrita ao bucket privado pronto-backups e prefixo pronto-production/, com duração máxima de uma hora. O executor revoga somente a credencial criada para este ensaio após baixar a cópia. A chave principal não é persistida. Falha de revogação impede registrar sucesso.
4. Selecionar o último marcador de cópia concluída, conferir tamanho e SHA-256 do arquivo criptografado, abrir com a identidade fornecida por entrada padrão e validar todos os arquivos contra o manifesto. Extração bloqueia travessia de pastas, links, caminhos Windows ambíguos, duplicações e excesso de tamanho.
5. Restaurar em um único contêiner identificado pela sessão, sem rede ou portas, sem pastas do computador montadas, sem logs do banco e com sistema de arquivos somente leitura. Dados do PostgreSQL ficam em tmpfs. Não iniciar Auth, API, SMTP, agendadores, webhooks ou integrações. Dados descriptografados de preparação ficam em pasta temporária com ACL privada, removida ao encerrar; não se promete apagamento físico seguro de SSD/swap.
6. Recriar apenas os nomes dos papéis como NOLOGIN e sem atributos elevados; não executar cegamente roles.sql. Restaurar estrutura, dados e permissões com falha imediata. Restabelecer o padrão USAGE de public após recriação limpa e e reaplicar a ACL de public selecionada do catálogo do próprio dump, preservando revogações explícitas; não ignorar divergências de permissões.
7. Comparar todas as tabelas do manifesto por contagem e hashes calculados no banco, a estrutura por SQL canônico e os bytes dos documentos por SHA-256. Remover somente o contêiner desta sessão, revalidando identificação e isolamento antes da remoção. Remover as cópias temporárias antes de registrar sucesso.
8. Guardar relatório apenas com horário, duração, hash da cópia, totais conferidos e confirmação de limpeza/revogação. Não incluir SQL, nomes de pessoas, tabelas, arquivos privados, credenciais ou conteúdo dos registros.

O formulário responde imediatamente e acompanha fases a cada três segundos. A sessão aceita um único ensaio; o servidor mantém o resultado por dez minutos e fecha após uma hora se ninguém iniciar. Falhas exibem somente códigos fixos. Em caso de interrupção forçada do processo ou queda do Docker, a limpeza precisa ser conferida antes de repetir; expiração da credencial limita acesso, mas não prova sua revogação.

## Limites e próximas verificações

Mesmo um resultado positivo deste executor comprova recuperação e integridade em nível de banco/arquivos, não o funcionamento completo do serviço. Atributos privilegiados/login dos papéis não são reaplicados automaticamente. Configurações externas de Auth/SMTP/domínio, login pelo site, isolamento entre perfis e bloqueio de contas, reaplicação dos expurgos e entrega dos alertas exigem verificações específicas em ambiente autorizado antes de declarar o protocolo operacional. Também permanece pendente definir o substituto autorizado.

Não ativar BACKUP_ENABLED com base apenas no resultado deste ensaio. A aba administrativa de backups continua entrega separada.

## Validação técnica

Testes unitários: `python -m unittest discover -s scripts/backup -p 'test_*.py'`. A integração adicional com Docker exige `BACKUP_DOCKER_INTEGRATION=1`, ferramentas oficiais disponíveis e PostgreSQL sintético em loopback na porta 55432. Ela cria e remove somente drill_source com credenciais fictícias. Nunca apontar o teste para produção.

Em divergência da estrutura, o executor registra apenas quantidades de linhas por categorias fixas (permissões, propriedade, configuração, comentários, definições e outros), sem SQL, nomes ou valores. O diagnóstico não transforma divergência em sucesso. Após falha, os arquivos e o banco temporário também são removidos; uma nova análise exige nova submissão pessoal das credenciais.

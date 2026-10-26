# Validação do fluxo do site — 26/10/2026

## Ambiente e alcance

Validação complementar à restauração real e ao Auth/perfis já conferidos. O site usa uma base exclusivamente fictícia com as migrações do repositório e seis contas de teste; não usa registros, senhas, sessões salvas ou arquivos de ambiente de produção. Supabase Auth, PostgREST e PostgreSQL funcionam de verdade, sem respostas simuladas. O banco real restaurado não foi aberto ao navegador.

A aplicação foi executada em modo de desenvolvimento, a partir de uma cópia dos arquivos versionados do mesmo commit do produto, sem .env e sem .auth. Recebeu apenas endereço local e chave pública anon da pilha fictícia, além de configurações fictícias. Todas as portas publicadas da pilha e do site ficaram em 127.0.0.1. O contexto do navegador dos testes bloqueia destinos externos. Cadastro e envio externo de e-mail não fazem parte do ensaio.

## Casos

A bateria verifica dois estudantes, catalogador e administrador: entrada pelo formulário, cookie de sessão, redirecionamento de usuário já autenticado, acesso à área adequada, recarga, saída, remoção do cookie e recusa de acesso posterior. Também verifica contas bloqueada/inativa, senha incorreta, uso do acesso de outro perfil e visitante anônimo.

Os títulos esperados dos testes antigos foram alinhados à interface atual: Visão geral, Fila de solicitações e Administração. Não houve alteração nas telas ou nas regras de negócio.

## Reprodução para manutenção

O arquivo tests/e2e/website-recovery-drill.spec.ts é optativo e não lê sessões privadas de .auth. A senha nele é pública e exclusivamente fictícia; nunca cadastrar essas contas em produção. A configuração playwright.website-drill.config.ts exige PRONTO_WEBSITE_DRILL=1, metadados locais e origem Docker identificada. Sem a configuração optativa, os testes ficam ignorados.

Preparar um projeto Supabase local descartável chamado pronto-auth-drill- seguido de dez caracteres hexadecimais, em pasta própria, com seeds reais desabilitados e todas as migrações. Não usar o projeto local de trabalho normal. Aplicar somente o bloco de dados fictícios anterior a set local role authenticated em supabase/tests/database/authorization_rls.test.sql. Preencher campos técnicos do Auth e identities como na integração test_restore_auth_integration.py, usando a senha fictícia do teste do site. Preparar os aceites fictícios da versão corrente do aviso de privacidade (origem authenticated_notice). O cenário simula contas já cadastradas; não representa aceite de pessoa real.

Auth deve permitir senha por e-mail, com novos cadastros desabilitados. Disponibilizar Auth e PostgREST por gateway de teste local nos caminhos /auth/v1 e /rest/v1. Preservar RLS. Limitar explicitamente todas as portas publicadas a 127.0.0.1 e conferir no Docker; não presumir que a rede configura o endereço das portas publicadas. Iniciar o site em cópia sem arquivos de ambiente reais, com URL local e somente chave pública anon da pilha fictícia.

Metadados em tmp/website-drill-state.json: project (nome exclusivo), container (ID completo da origem Docker com rótulo com.supabase.cli.project correspondente), website_url (http://127.0.0.1:porta), website_synthetic_only=true e ports_loopback_only=true. Não colocar credenciais nesse arquivo. O executor confere o rótulo e as portas efetivas do contêiner antes de testar. Executar Playwright com a configuração específica e PRONTO_WEBSITE_DRILL=1. Desktop e celular usam contextos novos; não há gravação de sessão, trace ou vídeo. Encerrar somente os processos, contêineres, volumes e rede identificados do ensaio ao final.

## Limites

O teste do site e o teste da cópia real são evidências complementares: o primeiro confere telas/cookies com dados fictícios, o segundo confere integridade e Auth/RLS na cópia real isolada. Não se afirma que o site inteiro foi executado sobre registros reais restaurados. SMTP institucional, recuperação de senha por e-mail, domínio/TLS público, PDFs reais ainda inexistentes e expurgos não são comprovados por estes casos. Agenda permanece desligada e substituto autorizado ainda será definido.

## Resultado

Passaram dez casos no desktop e dez no celular nas rodadas finais correspondentes. Os quatro perfis ativos mantiveram sessão após recarga e perderam acesso após saída. Contas bloqueada/inativa, senha incorreta, acesso pelo formulário de outro perfil e visitante anônimo não obtiveram sessão operacional. No celular, a saída foi feita pelo menu da conta com confirmação. A expectativa inicial dos testes antigos foi corrigida para os títulos atuais; o roteiro móvel foi ajustado para abrir o menu visível. Nenhuma regra do produto foi modificada.

Código do produto executado: a9e178b. Compilação inicial de desenvolvimento exigiu aquecimento; as rodadas finais usaram as páginas compiladas. Validação geral: 138 testes, tipos, lint e build passaram; lint manteve 13 avisos preexistentes. Os três arquivos de testes/configuração foram revalidados por análise estática após o ajuste móvel. Conferência visual adicional de login fictício no painel estudantil registrada fora do Git, sem dados reais.

Esta evidência encerra a pendência do fluxo local do site com contas fictícias. Ela não amplia o alcance da evidência da cópia real e não ativa a agenda. O responsável substituto continua a definir.

Limpeza concluída: sessão fictícia usada na conferência visual encerrada, processo e descendentes do site temporário parados após conferir comando/porta, pilha e volumes do projeto fictício removidos, rede exclusiva vazia removida e cópia temporária do site apagada. A junção de dependências foi removida antes da pasta, preservando node_modules do repositório. Relatório final apenas com contagens/flags fora do Git.

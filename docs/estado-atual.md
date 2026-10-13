# Estado atual — Pronto!

Atualizado em 12/10/2026. Regras: documento-mestre.md; decisões abertas: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Implementado

- Aplicação Next.js com Supabase: autenticação, perfis/RLS, solicitações, atendimento, catalogação, ficha, Nada Consta, PDF local, guia RI/UFBA, coordenação e administração.
- CI com testes unitários, pgTAP e E2E. Na revisão pré-PR: 122 testes unitários, typecheck, lint, build, 219 testes pgTAP em base isolada e 39 cenários públicos passaram.
- Entrega SMTP hospedada, pesquisa de lançamento, ajustes de ícones e remoção de interfaces e funções de ensaio local incorporados à branch principal. Regras aprovadas estão no mestre; detalhes em operacao-mvp.md.

## Produção e próximo passo

- Código aberto publicado em `ramondavi/pronto` sob AGPL-3.0, com marcas separadas em `ASSETS.md` e 18 avatares geométricos neutros. O repositório histórico permanece privado.
- Supabase Auth: Site URL e redirects confirmados; SMTP personalizado e três modelos de e-mail salvos. Vercel Production: `SMTP_PASSWORD`, `SUPABASE_SECRET_KEY` e `EMAIL_WORKER_SECRET` cadastrados como segredos, sem compartilhar valores.
- O Supabase hospedado ainda mostra `202608230010_stabilization_release` como última migração. As posteriores dependem de revisão de impacto e confirmação explícita para aplicação remota.
- O deployment do PR 54 está Ready / Production Staged; a atribuição automática de domínios está desativada. `prontobib.vercel.app` ainda apresenta a versão antiga, e o logo do e-mail retorna 404 nela. Não promover antes de sincronizar o banco.
- Após a sincronização do código e do banco: migração remota aprovada, dois segredos do worker no Vault, testes controlados de SMTP e dos três perfis, validação de PDFs anonimizados e aceite assistido de estudantes e bibliotecários.

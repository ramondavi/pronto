# Estado atual — Pronto!

Atualizado em 14/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Implementado

- Aplicação Next.js com Supabase: autenticação, perfis/RLS, solicitações, atendimento, catalogação, ficha, Nada Consta, PDF local, guia RI/UFBA, coordenação e administração.
- CI com testes unitários, pgTAP e E2E. Regras aprovadas estão no mestre; operação em operacao-mvp.md.

## Produção e próximo passo

- Em revisão para PR: permissões individuais da equipe, rascunhos no banco, recuperação de senha em outro navegador, barra lateral expansível e melhorias da página inicial. As migrações de 13/10 foram aplicadas apenas ao banco local.

- Código aberto em `ramondavi/pronto` sob AGPL-3.0, com marcas em `ASSETS.md`. A versão em preparação inclui dez avatares vetoriais. O histórico anterior permanece privado.
- Supabase Auth: Site URL, redirects, SMTP e modelos de e-mail configurados. Segredos de produção cadastrados na Vercel.
- O Supabase hospedado ainda mostra `202608230010_stabilization_release` como última migração. As posteriores dependem de revisão de impacto e confirmação explícita para aplicação remota.
- O deployment do PR 54 está em Production Staged, sem domínio automático. `prontobib.vercel.app` ainda apresenta versão antiga. Não promover antes de sincronizar o banco.
- Após sincronizar código e banco: migração remota aprovada, segredos no Vault, testes de SMTP e perfis, PDFs anonimizados e aceite assistido.

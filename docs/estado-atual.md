# Estado atual — Pronto!

Atualizado em 15/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Implementado

- Aplicação Next.js com Supabase: autenticação, perfis/RLS, solicitações, atendimento, catalogação, ficha, Nada Consta, PDF local, guia RI/UFBA, coordenação e administração.
- CI com testes unitários, pgTAP e E2E. Regras aprovadas estão no mestre; operação em operacao-mvp.md.

## Produção e próximo passo

- Em revisão para PR: permissões individuais da equipe, rascunhos no banco, recuperação de senha em outro navegador, barra lateral expansível e melhorias da página inicial. As migrações de 13/10 foram aplicadas apenas ao banco local.

- Código aberto em `ramondavi/pronto` sob AGPL-3.0, com marcas em `ASSETS.md`. A versão em preparação inclui nove avatares vetoriais para a equipe, além do avatar padrão. O histórico anterior permanece privado.
- Supabase Auth: Site URL, redirects, SMTP e modelos de e-mail configurados. Segredos de produção cadastrados na Vercel.
- A consulta somente leitura ao Supabase hospedado em 15/10 mostrou `202610120002` como última migração. Restam 11 migrações versionadas de 13 a 15/10, que exigem revisão de impacto e confirmação explícita antes da aplicação remota.
- `prontobib.vercel.app` responde pela Vercel, mas a página pública ainda não contém marcadores desta entrega. Confirmar o deployment aprovado e sua promoção após sincronizar o banco.
- Após sincronizar código e banco: migração remota aprovada, segredos no Vault, testes de SMTP e perfis, PDFs anonimizados e aceite assistido.

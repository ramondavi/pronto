# Estado atual — Pronto!

Atualizado em 16/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Implementado

- Aplicação Next.js com Supabase: autenticação, perfis/RLS, solicitações, atendimento, catalogação, ficha, Nada Consta, PDF local, guia RI/UFBA, coordenação e administração.
- CI com testes unitários, pgTAP e E2E. Regras aprovadas estão no mestre; operação em operacao-mvp.md.

## Produção e próximo passo

- PR3 publicado em `prontobib.vercel.app`, com entrada pública verificada: permissões individuais, rascunhos, recuperação de senha, barra lateral expansível e nova página inicial.

- Código aberto em `ramondavi/pronto` sob AGPL-3.0, com marcas em `ASSETS.md`. A versão em preparação inclui nove avatares vetoriais para a equipe, além do avatar padrão. O histórico anterior permanece privado.
- Supabase Auth: Site URL, redirects, SMTP e modelos de e-mail configurados. Segredos de produção cadastrados na Vercel.
- Após revisão de impacto e autorização explícita, as 11 migrações de 13 a 15/10 foram aplicadas ao Supabase hospedado. A verificação posterior não encontrou migrações pendentes nem erros no lint remoto.
- Os dois itens do worker de e-mails estão cadastrados no Supabase Vault. A tarefa de entrega está agendada a cada cinco minutos e teve execução registrada sem erro; isso não comprova o envio de uma mensagem real.
- O ambiente já contém a conta administrativa, duas contas reais de catalogadores, cinco programas e uma ocorrência de fechamento em 26/10. Esses registros devem ser preservados.
- Em 16/10, a recuperação de senha do administrador foi validada após correção do SMTP: e-mail recebido e senha alterada. Pendente: SMTP transacional, modelos Auth, perfis, PDFs anonimizados e aceite assistido.

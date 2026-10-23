# Estado atual — Pronto!

Atualizado em 23/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md. Histórico detalhado: historico-preparacao-outubro-2026.md.

## Entrega em consolidação

- MVP consolidado no PR #10: retrospectivo RAU+E, coautoria, administração, ficha/QR e guia RI traduzido.
- Prévia: pronto-git-codex-ajustes-administrac-c0c3a4-ramondavis-projects.vercel.app. Banco cfntochwiztdcawbaedx atualizado até 202610220003. Produção: prontobib.vercel.app, banco vsdkxmpzqwauzotnbdxo; preservar contas, programas, protocolos e configurações existentes.
- E-mails revisados conforme parecer de 22/10 em docs/revisao-emails/. São 26 variantes revisadas. Conclusão unificada; sem RI, botão abre registro público. Lembretes abrem preparação. Rodapé e URLs padronizados.
- Produção: 13 migrações aplicadas até 202610220003, lint sem erros e simulação sem pendências. Quatro modelos Auth atualizados. Site consolidado pela master após aprovação do CI do PR #10.
- PDF/A usa link no estilo do tutorial de cadastro. Sem capturas.

## Verificação e operação

- Aprovados: 133 testes, tipos, lint e build; 261 testes de banco; 39 cenários públicos (três repetidos por timeout local). Evidências/limites: validacao-mvp.md.
- PR #12 publicado em `fdfd7a7`. Em 22/10, o responsável confirmou acesso ao formulário de nova senha e recebimento do teste transacional (uma tentativa, sem erros). Detalhes e limites: operacao-mvp.md.
- Coordenações cadastradas pelo responsável. Aceite assistido após o teste do retrospectivo RAU+E.
- PR #13 publicado. Isolamento: verificacao-recuperacao-2026-10-23.md.
- Regras operacionais: operacao-mvp.md. Migrações aplicadas são imutáveis; nunca resetar banco remoto nem copiar seeds de testes para produção. Conta especial da secretaria não deve receber convite automático.

## Backup e preservação — 23/10/2026

- Protocolo aprovado documentado em protocolo-backup-recuperacao.md; regras sincronizadas com mestre, política e operação. Destino, executor/substituto, rotina, alertas e primeiro ensaio permanecem pendentes. Nenhum backup ou restauração de produção comprovado nesta entrega.

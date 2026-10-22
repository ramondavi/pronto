# Estado atual — Pronto!

Atualizado em 22/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md. Histórico detalhado: historico-preparacao-outubro-2026.md.

## Entrega em consolidação

- Branch codex/ajustes-modelos-emails: consolida o MVP no PR #10, com acervo retrospectivo RAU+E, TFG em coautoria, administração, depósitos pendentes, correções móveis, autenticação, ficha/QR e guia do RI traduzido.
- Prévia: pronto-git-codex-ajustes-administrac-c0c3a4-ramondavis-projects.vercel.app. Banco cfntochwiztdcawbaedx atualizado até 202610220003. Produção: prontobib.vercel.app, banco vsdkxmpzqwauzotnbdxo; preservar contas, programas, protocolos e configurações existentes.
- E-mails revisados conforme parecer de 22/10 em docs/revisao-emails/. São 26 variantes revisadas. Conclusão unificada; sem RI, botão abre registro público. Lembretes abrem preparação. Rodapé e URLs padronizados.
- Produção: 13 migrações aplicadas até 202610220003, lint sem erros e simulação sem pendências. Quatro modelos Auth atualizados. Site consolidado pela master após aprovação do CI do PR #10.
- PDF/A usa link no estilo do tutorial de cadastro. Sem capturas.

## Verificação e operação

- Aprovados: 133 testes, tipos, lint e build; 261 testes de banco; 39 cenários públicos (três repetidos por timeout local). Evidências/limites: validacao-mvp.md.
- SMTP do Auth já teve recuperação confirmada; entrega transacional real e aceite assistido não são comprovados pelo agendamento do worker. Não enviar mensagens a estudantes para testar.
- Regras operacionais: operacao-mvp.md. Migrações aplicadas são imutáveis; nunca resetar banco remoto nem copiar seeds de testes para produção. Conta especial da secretaria não deve receber convite automático.

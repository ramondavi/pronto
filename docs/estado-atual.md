# Estado atual — Pronto!

Atualizado em 22/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md. Histórico detalhado: historico-preparacao-outubro-2026.md.

## Entrega em consolidação

- Branch codex/ajustes-modelos-emails: reúne 44 commits posteriores à master, com acervo retrospectivo RAU+E, TFG em coautoria, administração, depósitos pendentes, correções móveis, autenticação, ficha/QR e guia do RI traduzido.
- Prévia: pronto-git-codex-ajustes-administrac-c0c3a4-ramondavis-projects.vercel.app. Banco cfntochwiztdcawbaedx com migrações até 202610210008 aplicadas. Produção: prontobib.vercel.app, banco vsdkxmpzqwauzotnbdxo; preservar contas, programas, protocolos e configurações existentes.
- E-mails revisados conforme parecer de 22/10 em docs/revisao-emails/. São 26 variantes revisadas. Conclusão unificada; sem RI, botão abre registro público. Lembretes abrem preparação. Rodapé e URLs padronizados.
- Migrações 202610220000–202610220003 preparadas localmente; autorização recebida para migrar e publicar em produção, abrir PR e executar todas as verificações. Não declarar publicação antes de confirmar implantação e histórico remoto.
- PDF/A usa link no estilo do tutorial de cadastro. Sem capturas.

## Verificação e operação

- Executar npm run verify, testes públicos e banco local; corrigir falhas antes de publicar. Registrar evidências e limitações em validacao-mvp.md.
- SMTP do Auth já teve recuperação confirmada; entrega transacional real e aceite assistido não são comprovados pelo agendamento do worker. Não enviar mensagens a estudantes para testar.
- Regras operacionais: operacao-mvp.md. Migrações aplicadas são imutáveis; nunca resetar banco remoto nem copiar seeds de testes para produção. Conta especial da secretaria não deve receber convite automático.

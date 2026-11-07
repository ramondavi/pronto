# Estado atual — Pronto!

Atualizado em 07/11/2026. Regras: `documento-mestre.md`; pendências: `decisoes-pendentes.md`; caminhos: `mapa-projeto.md`.

## Ambientes

- Produção: `prontobib.vercel.app`, banco `vsdkxmpzqwauzotnbdxo`. Última migração conhecida: `202610290002`. Não reproduzir dados fictícios da prévia.
- Prévia única: `pronto-git-codex-fundamentacao-termo-c879fe-ramondavis-projects.vercel.app`, banco `cfntochwiztdcawbaedx`. Migrações de autoridades aplicadas seletivamente até `202611070002`; `202610290002` (backup) e `202611050003` (busca interna) permanecem fora da aplicação seletiva.
- Em 05/11, seis autoridades locais fictícias `[TESTE]` foram criadas apenas na prévia: quatro publicadas com vínculo sintético elegível e duas não publicadas. Dois pontos aparecem no mapa. Não enviar esses registros à produção.

## Publicação em curso

- A branch da prévia ainda não está na `master`. Revisar PR, CI e migrações antes da produção; autorizações seletivas anteriores valem só para a prévia.
- Migrações incorporadas são imutáveis. Não executar reset remoto, seeds em produção nem reescrever fichas ou atendimentos.
- Backup: consulta automática e roteiros; acionamento auditado e download exclusivos de produção. Primeiro ciclo, custódia e treinamento do substituto: `operacao-backups.md`. Nenhum backup/restauração é disparado por testes.

## Referências

- Autoridades: `gestao-catalogos.md`, `importacao-autoridades.md` e seções pertinentes do documento-mestre.
- Evidências da entrega anterior em produção: `validacao-publicacao-2026-10-29.md`. Operação e aceite: `validacao-mvp.md`, `operacao-mvp.md`.

# Estado atual — Pronto!

Atualizado em 29/10/2026. Regras: documento-mestre.md; pendências: decisoes-pendentes.md; caminhos: mapa-projeto.md.

## Entrega

- Publicação do PR #24 autorizada em 29/10, condicionada ao CI e deploy READY. Evidências: validacao-publicacao-2026-10-29.md. PR #23 fechado sem merge.
- Produção: prontobib.vercel.app, banco vsdkxmpzqwauzotnbdxo até 202610290002. Contagens/fingerprints dos seis conjuntos protegidos preservados na migração. Sem reset, seed remoto ou reescrita de fichas.
- Prévia única: pronto-git-codex-fundamentacao-termo-c879fe-ramondavis-projects.vercel.app; banco cfntochwiztdcawbaedx com a migração seletiva 202611050001 aplicada em 05/11/2026: gestão de tipos MARC21, situação de publicação e vínculos revisados de lugares entre autoridades. A simulação e a aplicação incluíram somente essa migração, sem seeds, roles ou Vault. A migração 202610290002 do pacote de backup continua pendente na prévia; nenhum registro foi publicado automaticamente.
- Dados de ensaio da prévia, em 05/11/2026: seis autoridades locais fictícias identificadas por `[TESTE]`, inseridas somente no banco cfntochwiztdcawbaedx, sem migração. Quatro foram vinculadas ao único atendimento sintético com ficha homologada e publicadas (duas temáticas e duas geográficas, com coordenadas ilustrativas); outras duas permanecem sem publicação para ensaiar edição administrativa. Os termos e vínculos preexistentes não foram alterados. As funções públicas retornaram quatro autoridades e dois pontos no mapa. Não reproduzir esses dados em produção.
- Backup: consulta automática e roteiros; acionamento confirmado/auditado e download exclusivos de produção. Credencial cadastrada pelo formulário local; pacote revisado aguarda CI/publicação e envio ao bucket privado. Nenhum disparo de backup/restauração nos testes. Ver operacao-backups.md.
- Autoridades/CDU: gestao-catalogos.md, cdu-repertorio-local.md, importacao-autoridades.md. Fundamentação local em 202610280004; pedidos de backup em 202610290001; pacote em 202610290002.

## Operação

- Evidências e limites gerais: validacao-mvp.md. Aceite assistido após retrospectivo RAU+E; secretaria sem convite automático. E-mails/Auth: operacao-mvp.md.
- Migrações incorporadas imutáveis; nunca resetar remoto nem copiar seeds para produção.
- Backup: PR #20 incorporado, agenda ativada e chave confirmada no Proton Pass. Primeiro ciclo, custódia e treinamento do substituto: operacao-backups.md. Não declarar continuidade integral.

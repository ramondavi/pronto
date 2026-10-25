# Mapa de consulta

Leia somente o assunto da tarefa. Seções abaixo pertencem ao Documento-Mestre. Para negócio, inclua premissas (§2), escopo (§21–22) e cautelas (§23); amplie a leitura conforme dependências.

| Assunto | Caminhos iniciais | Mestre |
| --- | --- | --- |
| Acesso/conta | src/app/auth-actions.ts, src/lib/supabase/, src/domain/auth/, src/proxy.ts | 4–5, 19 |
| Solicitação/correções | src/components/student-request-form.tsx, src/components/student-correction-form.tsx, src/domain/student-requests/, src/domain/issues/ | 3, 7, 10 |
| Equipe | src/app/painel/, src/components/staff-queue.tsx, src/components/request-analysis-workspace.tsx | 10, 26 |
| Catalogação/PDF | src/domain/cataloging-card/, src/components/cataloging-card-review.tsx, src/components/assisted-cataloging-workspace.tsx, src/components/browser-pdf-delivery.tsx | 6, 8–9, 11 |
| Nada Consta | src/app/api/nada-consta/, src/components/nada-consta-*.tsx | 6, 19 |
| Autodepósito/coordenação | src/components/repository-deposit-guide.tsx, src/components/protocol-closure.tsx, src/app/coordenacao/ | 12–14, 25 |
| Administração/SLA/FAQ | src/components/admin-operations.tsx, src/lib/service-announcements.ts, src/app/painel/admin/ | 15–17, 20, 26 |
| Lacunas futuras de ajuda | docs/lacunas-ajuda.md, src/lib/knowledge-base.ts, src/app/ajuda/ | 20.1 |
| Interface/SEO | src/app/, src/components/, src/app/globals.css | 1, 20 |
| Banco | src/db/schema.ts, supabase/migrations/, supabase/tests/database/ | 18–19 e assunto |
| Verificação | package.json, tests/, tests/e2e/, .github/workflows/ci.yml | 27 |

Busque nomes/símbolos nesses caminhos; não leia todos os arquivos da linha. Consulte src/data/cutter-sanborn-table.json somente nas entradas necessárias.

Operação: operacao-mvp.md. Aceites: validacao-mvp.md. Segurança: revisao-seguranca-lgpd.md. Configuração/diagnóstico: configuracao-supabase.md.

Verificações resumidas: npm run verify. Operação desse executor e evidências de economia: economia-operacional.md (somente quando necessário). Redução de caracteres não equivale a percentual de tokens ou cota.

Backup, recuperação e preservação: protocolo-backup-recuperacao.md (metas, cobertura, ensaios e pendências de implantação).

Implantação do backup B2: configuracao-backup-b2.md; executor scripts/backup; workflows backup.yml e backup-checks.yml.

Contingência de backup manual: backup-manual-independente.md; scripts/backup/manual_backup.py, manual_server.py e build_manual_package.py.

Ensaio de recuperação isolada: ensaio-restauracao-isolada.md; scripts/backup/restore_drill.py e restore_server.py.

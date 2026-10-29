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

- Cadastro e mesclagem de assuntos/CDU: docs/gestao-catalogos.md; src/components/catalogue-merge-dialog.tsx; supabase/migrations/202610260001_catalogue_creation_and_merges.sql.

- Repertório próprio CDU, hierarquia, auxiliares e edições: docs/cdu-repertorio-local.md; src/lib/cdu-structure.ts.
- Lógica de composições CDU e revisão do material didático: docs/cdu-logica-composicoes.md; src/lib/cdu-symbols.ts; src/lib/cdu-notation.ts; src/components/cdu-symbol-editor.tsx.

- Avaliação das opções externas do RI (sem integração ativada): docs/interoperabilidade-ri-2026-10-27.md.
- Autoridades de assuntos: docs/importacao-autoridades.md; src/components/subject-authority-field.tsx e subject-authority-importer.tsx; supabase/migrations/202610280001_subject_authority_import.sql (aplicada somente à prévia em 28/10/2026).

Ensaio de recuperação isolada: ensaio-restauracao-isolada.md; evidência real: validacao-restauracao-2026-10-24.md; scripts/backup/restore_drill.py e restore_server.py.

Ensaio de ausência de execução e entrega do aviso: validacao-alerta-ausencia-2026-10-26.md.

Auth após restauração (ensaio fictício): validacao-auth-restauracao-2026-10-26.md; scripts/backup/restore_auth.py e test_restore_auth_integration.py.

Fluxo do site com contas fictícias: validacao-site-recuperacao-2026-10-26.md; tests/e2e/website-recovery-drill.spec.ts e playwright.website-drill.config.ts.

Tela administrativa de backup e restauro (prévia): src/components/backup-admin.tsx; consulta restrita de metadados públicos: src/app/api/admin/backups/route.ts. Sem execução ou custódia de credenciais no painel.

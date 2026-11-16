# Atribuições da equipe — conferência de 15/11/2026

Fonte: definições das migrações do banco, `src/lib/permission-locations.ts` e tela Administração > Operação > Acesso por pessoa. A tela carrega as definições do banco e oferece concessão ou bloqueio individual quando `delegable=true`.

| Área e tela na gestão | Atribuições |
| --- | --- |
| Painel · Visão geral | `staff.overview.view` |
| Painel · Visão de estudante | `student.preview` |
| Atendimentos · Fila | `staff.queue.view`, `staff.queue.assume`, `staff.queue.release`, `staff.queue.reassign`, `staff.queue.priority` |
| Atendimentos · Análise do atendimento | `staff.case.view` |
| Atendimentos · Ficha catalográfica | `staff.card.homologate` |
| Atendimentos · Nada Consta | `staff.nada_consta.validate` |
| Atendimentos · Conclusão | `staff.request.close` |
| Biblioteca · Calendário e mural | `library.calendar.view` |
| Biblioteca · Horário de funcionamento | `library.hours.change` |
| Administração · Operação · Calendário e mural | `library.calendar.manage` |
| Administração · Operação · Contas | `admin.accounts.view`, `admin.accounts.manage`, `admin.accounts.provision` |
| Administração · Operação · Permissões da equipe | `admin.permissions.manage` |
| Administração · Operação · Programas e SLA | `admin.programs.view`, `admin.programs.manage` |
| Administração · Conteúdo · Modelos de resposta | `admin.service.view`, `admin.service.manage` |
| Administração · Conteúdo · Ajuda e FAQ | `admin.faq.view`, `admin.faq.manage`, `admin.knowledge.view`, `admin.knowledge.manage` |
| Administração · Conteúdo · Guia da equipe | `admin.guide.manage` |
| Administração · Conteúdo · Assuntos e Temas por área | `admin.subjects.view`, `admin.subjects.manage` |
| Administração · Conteúdo · Catálogo CDU | `admin.cdu.view`, `admin.cdu.manage` |
| Administração · Controle · Indicadores | `admin.stats.view` |
| Administração · Controle · Depósitos pendentes | `admin.deposits.view`, `admin.deposits.send`, `admin.deposits.history`, `admin.deposits.publication` |
| Administração · Controle · Arquivos e retenção | `admin.retention.view`, `admin.retention.manage` |
| Administração · Controle · Backup e restauro | `admin.backups.view`, `admin.backups.execute` |
| Administração · Controle · Auditoria | `admin.audit.view` |
| Administração · Avaliações | `admin.feedback.view`, `admin.feedback.export`, `admin.feedback.activate` |
| Administração delegada · Catalogador | Herdar permissões padrão de administrador, exceto gerir permissões; concessão com prazo e revogação próprios, sem mudar o perfil da conta |

Há 43 atribuições definidas no banco (29 administrativas, 10 de atendimento, 3 da biblioteca e 1 de prévia estudantil), 1 consulta fixa apresentada na interface (`admin.backups.view`) e 1 ação separada de herança de administração para catalogadores. A tela de um catalogador mostra 45 ações: 41 permitem decisão individual, a herança pode ser concedida ou revogada separadamente e 3 são fixas. Para administradores, que não recebem a opção de herdar seu próprio perfil, aparecem 44 ações. `admin.permissions.manage` é exclusiva de administrador; `admin.backups.execute` exige administrador ativo e não admite delegação; `admin.backups.view` é uma consulta fixa de administrador ativo. Essas três aparecem para conferência, sem controle de alteração.

O único código sem localização própria na interface era `admin.guide.manage`; a localização foi acrescentada nesta revisão. A verificação estática confirma a cobertura dos códigos conhecidos pelas migrações. A disponibilidade efetiva de uma ação depende ainda do papel, do estado da conta e das regras do banco.

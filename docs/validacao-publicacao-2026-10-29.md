# Validação da entrega de autoridades, catálogos e backup — 29/10/2026

Publicação autorizada pelo responsável neste chat, incluindo testes e preparativos. PR: https://github.com/ramondavi/pronto/pull/24. Este registro não substitui o resultado dos checks e do deploy do SHA efetivamente incorporado.

## Verificações

- Aplicação: 191 testes passaram, incluindo política de acionamento fixo, confirmação, origem da requisição, restrição a produção e respostas incertas sem reenvio. Typecheck, lint sem erros e build passaram. Os avisos existentes foram registrados, sem supressão de regras.
- Cadastro da credencial: três testes Python com provedores e CLI simulados passaram. O formulário confirmou configuração somente em production; o agente não leu o valor. O provisionamento consultou o workflow via GET e não disparou execução para testar escrita.
- Banco: 23 asserções novas de backup e 17 de permissões passaram na base sintética local antes da interrupção do Docker. O CI do PR criou a base do zero e aprovou a suíte completa de migrações/pgTAP, além do ensaio sintético de recuperação. Os testes de navegador do CI continuam obrigatórios no SHA final.
- Interface com serviços simulados: computador claro e celular escuro passaram em consulta de autoridade, confirmação/cancelamento de desativação, retirada da validação CDU, bloqueio de mesclagem por atendimento aberto, datas, ausência de sobreposição, rolagem/cantos das janelas e registro de ações alto. A confirmação de backup não envia pedido antes do aceite; o único POST de cada cenário foi interceptado pelo provedor simulado. Conferidas atualização de 60/15 segundos e pausa na aba oculta. O ensaio encontrou e corrigiu uma consulta cancelada retida ao remontar a tela. Sem capturas, credenciais reais, dados reais ou rota de ensaio publicada; arquivos temporários da rota foram removidos.

## Preparação de produção

- 202610280004, 202610290001 e 202610290002 aplicadas em uma transação no projeto vsdkxmpzqwauzotnbdxo, partindo de 202610280003, com registro no histórico de migrações. Acrescentam fundamentação restrita, reserva/auditoria dos pedidos de backup e política de leitura do pacote privado.
- Contagens e fingerprints de profiles, controlled_terms, request_controlled_terms, subject_authorities, cataloging_card_homologations e cataloging_requests coincidiram antes/depois. Nenhum registro foi exportado como evidência.
- Pacote existente: 906 hashes do inventário conferidos, sem divergências ou arquivos adicionais. Configuração limitada a project_url, recipient e ca_certificate. Não contém exportações do banco ou identidade privada de recuperação.
- ZIP de 46.537.177 bytes hospedado em backup-tools/windows/f62fc8b4/Pronto-Backup-Manual.zip, bucket privado, limite de 50 MiB. Download técnico de conferência reproduziu SHA-256 f62fc8b46dba4ed5e04e6972d504793eb742d2f676695d38d7145d68eea79845. Não foi incluído no Git nem no pacote da Vercel.
- Segredo e habilitação do painel configurados somente em production na Vercel. A prévia recusa acionamento e download; não recebeu essa credencial.

## Critério de encerramento e limites

Somente incorporar o SHA com verificações exigidas aprovadas e confirmar deploy READY no domínio prontobib.vercel.app. A publicação não equivale a ensaio real de backup/restauração. Nenhum backup de produção, restauração ou mudança de agenda foi acionado pelos testes; nenhuma mensagem foi enviada a pessoas. O recebimento/acesso do substituto à custódia e o treinamento não foram comprovados por esta entrega. Não declarar continuidade ou segurança integral.

# Estado atual — Pronto!

Atualizado em 24/11/2026. Regras: [Documento-Mestre](documento-mestre.md); decisões: [Decisões pendentes](decisoes-pendentes.md); caminhos: [Mapa do projeto](mapa-projeto.md).

## Código e conteúdo

- A `master` contém os ajustes de recuperação de senha, mapa e autoridades. O modelo versionado de recuperação evita a borda externa e usa o endereço de confirmação da aplicação.
- O Guia da Equipe tem 61 capítulos em dez seções após o [PR #38](https://github.com/ramondavi/pronto/pull/38). Capturas reservadas seguem para preenchimento pela equipe. O responsável fará as traduções da Central de Ajuda.

## Produção e operação

- Produção: `prontobib.vercel.app`; Supabase `vsdkxmpzqwauzotnbdxo`. A migração `202611230001` do PR #38 foi aplicada. Confira deployment e banco antes de declarar mudanças publicadas.
- A falha agendada de backup de 09 a 15/11 (`unreviewed_storage_bucket`) foi corrigida. A [execução agendada de 23/11](https://github.com/ramondavi/pronto/actions/runs/45258614956) concluiu. Conferir recibo e ponto recuperável continua necessário; execução concluída não prova restauração. Ver [Backups](operacao-backups.md).
- Os ensaios de outubro não cobrem restauração de PDFs reais, domínio e SMTP. Custódia e treinamento do substituto continuam pendentes.
- O aceite assistido ainda depende de estudantes e bibliotecários participantes. Ver [Roteiro](validacao-mvp.md) e [Operação](operacao-mvp.md).

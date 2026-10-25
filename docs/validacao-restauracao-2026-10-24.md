# Ensaio real de recuperação — 24/10/2026

Concluído em 24/10/2026 às 22h19 de Brasília. Destino local temporário autorizado expressamente pelo responsável; nenhum retorno a produção foi realizado.

## Evidência

- Cópia criada em 24/10/2026 às 21h16min59s de Brasília; geração concluída no [run 40146034584](https://github.com/ramondavi/pronto/actions/runs/40146034584).
- Identificador técnico SHA-256 do arquivo criptografado: f549437e68ebee82a696ee2174d47f4c1187040c3f51362f069aa61404778ab5.
- Tempo do executor completo: 68,4 segundos, incluindo obtenção, abertura, verificação, restauração e limpeza. Não inclui preparação prévia das ferramentas ou recuperação humana dos acessos; não comprova sozinho a meta de recuperação completa do serviço.
- 96 tabelas conferidas por contagem e hashes das linhas; 0 documentos no inventário, compatível com a ausência de solicitações informada pelo responsável. Não houve PDF real para ensaiar nesta execução.
- Estrutura equivalente verificada recriando a exportação independente schema.sql num segundo banco vazio no mesmo ambiente isolado e comparando dumps da mesma versão. O texto original diferia em quatro linhas; não se declara igualdade textual nem causa específica sem evidência adicional. Permissões, donos, definições e políticas continuam incluídos na comparação.
- Contêiner sem rede, portas ou pastas do computador montadas. Banco em tmpfs e sem logs. Identificação e remoção do contêiner confirmadas pelo executor e por consulta posterior restrita ao rótulo dos ensaios.
- Credencial temporária de leitura revogada após o download. Arquivos de trabalho removidos antes da emissão do relatório; a identidade privada não foi persistida pelo executor.
- Produção não modificada. BACKUP_ENABLED=false confirmado após o ensaio.

O relatório técnico externo ao Git registra schema_equivalent=true, schema_comparison=isolated_reference, source_dump_text_identical=false, container_removed=true e temporary_reader_revoked=true. Não registra linhas, SQL, nomes privados, senhas ou chaves.

## Limites que permanecem

Esta execução comprova recuperação e integridade da cópia em nível de banco e inventário de arquivos. Papéis foram recriados sem login e sem privilégios elevados; seus atributos originais não foram automaticamente reaplicados. Login via serviço Auth, isolamento entre perfis pelo site e bloqueio operacional de contas, configurações externas, reaplicação dos expurgos e entrega dos alertas ainda exigem verificação. Também falta definir o substituto autorizado. Não declarar o protocolo integralmente operacional nem ativar a agenda somente com esta evidência.

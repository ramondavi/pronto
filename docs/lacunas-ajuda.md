# Lacunas da Central de Ajuda

Levantamento em 29/09/2026 para planejamento posterior. **São sugestões de conteúdo, não regras institucionais aprovadas nem autorização para publicação.** Conferir os procedimentos com a BIB/FA e o RI/UFBA antes de redigir instruções definitivas. A base atual permite FAQ, resposta rápida e artigo por público, inclusive ajuda contextual no painel.

## Prioridade alta — pontos que impedem avançar

| Público e superfície | Conteúdo proposto | Formato |
| --- | --- | --- |
| Estudante; Central pública e envio no painel | Emitir e enviar o Nada Consta; interpretar uma recusa e reenviar | Guia ilustrado e resposta rápida |
| Estudante; ficha liberada no painel | Inserir a ficha no PDF final, conferir sua posição e resolver falha na geração | Guia passo a passo e resposta rápida |
| Estudante; autodepósito no painel | Criar conta no RI/UFBA, obter acesso à coleção e agir se a opção de iniciar depósito não aparecer | Guia e resposta rápida, conforme o tutorial oficial aplicável |
| Estudante; acompanhamento no painel | Significado de cada status, próximo responsável e ação necessária | FAQ e ajuda contextual |
| Bibliotecário; análise no painel | Quando devolver, corrigir diretamente, validar metadados, homologar e liberar; efeitos visíveis ao estudante e registros | Guia operacional com fluxo de decisão |
| Bibliotecário; Nada Consta e encerramento | Critérios de conferência, justificativa de recusa e validação da URL permanente antes de encerrar | Checklist operacional |

## Prioridade seguinte

| Público e superfície | Conteúdo proposto | Formato |
| --- | --- | --- |
| Bibliotecário; catalogação no painel | Conferência profissional de formas de nome, autoria compartilhada, título equivalente, referência, CDU/Cutter e ano de nascimento autorizado | Guias técnicos ligados aos campos |
| Administrador; painel | Provisionar e bloquear contas; configurar programas, guia por curso, calendário e SLA; publicar ajuda; operar retenção e campanha de avaliação | Guias curtos por tela |
| Estudante; formulário e painel | Link que pede autorização; rascunho salvo neste dispositivo; campo bloqueado após análise; correção enviada; ficha homologada mas ainda indisponível | Respostas rápidas contextuais |
| Estudante; autodepósito | Localizar a coleção e a URL permanente; distinguir depósito enviado, validação pelo RI e encerramento no Pronto! | Respostas rápidas contextuais |
| Público; página inicial e Central | Elegibilidade por curso e guia eventualmente desativado; limite de protocolo ativo; responsabilidade pela licença e embargo; e-mail não recebido | FAQs |

## Pontos a confirmar antes da publicação

- Usar o [guia da BIB/FA para o Nada Consta](https://arquitetura.ufba.br/sites/arquitetura.ufba.br/files/guia-emissao-nada-consta-bibfaufba-2025.pdf) como referência, validando se as telas continuam atuais.
- Confrontar a redação de PDF/A do Pronto! com os [tutoriais oficiais do RI/UFBA por tipo de trabalho](https://www.repositorio.ufba.br/files/TUTORIAL_DISSERTACAO.PDF). O Pronto! não converte nem certifica PDF/A.
- Conferir o procedimento de cadastro e liberação de coleção no [tutorial de usuários do RI/UFBA](https://repositorio.ufba.br/files/TUTORIAL_CADASTRO_DE_USUARIOS.PDF) antes de orientar estudantes.
- Respeitar a decisão atual sobre o guia de autodepósito de TFG de graduação, inicialmente desativado. Não afirmar que o depósito está liberado sem confirmação institucional.

O conteúdo inicial está em `src/lib/knowledge-base.ts` e `supabase/migrations/202609220001_knowledge_base.sql`; a publicação efetiva pode ter sido editada no painel e deve ser conferida antes de evitar duplicações.

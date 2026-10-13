# Economia operacional — referência sob demanda

O agente assume verificações e correções técnicas. O usuário informa o resultado desejado; não precisa executar comandos, revisar código nem interpretar logs. Aceites institucionais e autorizações remotas permanecem humanos.

## Execução

- `npm run verify`: executa test, typecheck, lint e build sequencialmente, sem nova conversa entre etapas. Retorna código não zero se qualquer etapa falhar e continua as demais para reunir diagnóstico.
- `npm run verify -- --only lint typecheck`: revalida etapas afetadas por uma correção. Não substitui a verificação inicial completa antes do PR.
- Saída: estado de cada etapa, linhas que mencionam warning/warn, contagens de testes quando disponíveis e caminhos dos logs. O indicador textual pode incluir títulos de testes; não é uma contagem exata de problemas. Avisos não são descartados; o agente consulta seus trechos relevantes.
- Logs integrais e summary.json ficam em tmp/verification/run-*, ignorado pelo Git. Cada execução recebe diretório próprio. O CI preserva esses arquivos por sete dias e mantém E2E e pgTAP.
- O resumo registra bytes dos logs, não tokens. Logs são diagnóstico local: nunca imprimir ambiente ou segredos, nem copiar arquivos de ambiente para eles. Não publicar logs locais automaticamente.
- Não reutilizar resultados de outra versão como se fossem atuais. Após uma alteração, avaliar quais verificações perderam validade; após erro do ambiente, corrigir a causa e reexecutar o afetado.

## Pesquisa e manutenção

Agrupe descobertas independentes com retorno curto. Procure nomes e símbolos antes de ler trechos; amplie se faltar contexto. Para versões Git, use git grep no snapshot em vez de um processo por arquivo. Não imponha limite rígido de chamadas que impeça investigação suficiente.

AGENTS.md e estado-atual.md têm orçamento conjunto de 6.000 caracteres verificado nos testes, para detectar crescimento acidental. Não truncar regras para passar: mover detalhes para referências por assunto ou revisar justificadamente o orçamento. Documento-Mestre e regras de negócio não têm esse limite.

## Evidência e limites

O ensaio de 14/09/2026 (mesmo GPT-6 Astra/low e mesmo código) produziu 243.358 tokens antes e 284.681 depois da primeira redução documental: +17% no total, embora entrada sem cache tenha caído de 43.098 para 38.743. Portanto, instruções menores isoladamente não provaram economia por tarefa.

Esta etapa reduz diretamente o conteúdo de logs devolvido ao modelo e automatiza o ciclo de validação. Avaliar consumo total separadamente de cache e saída, com qualidade equivalente; bytes/caracteres não são tokens ou cota. Não repetir benchmarks em toda tarefa: isso também consome recursos. Não reduzir modelo/raciocínio, desinstalar ferramentas úteis ou alterar segurança global como atalho sem evidência.

Verificação local deste executor em 14/09/2026: 99 testes, tipos, lint e build aprovados. Os quatro logs somaram 9.516 bytes e 164 linhas não vazias; o executor emitiu 9 linhas de acompanhamento/resumo, além do cabeçalho padrão do npm. O aviso de acessibilidade preexistente permaneceu no log do lint e foi investigado. Isso comprova redução da saída apresentada, não redução percentual de tokens da tarefa inteira.

O executor e seu orçamento documental são implementações deste projeto, não ferramentas oficiais nem garantia de redução percentual da cota.

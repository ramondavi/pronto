export const feedbackRatings = [
  { key: "step_clarity", question: "Foi fácil entender o que fazer em cada etapa?", low: "Muito difícil", high: "Muito fácil" },
  { key: "findability", question: "Foi fácil encontrar informações, documentos e a próxima ação?", low: "Muito difícil", high: "Muito fácil" },
  { key: "language", question: "As instruções e mensagens do Pronto! foram claras?", low: "Nada claras", high: "Muito claras" },
  { key: "form_ease", question: "Como foi preencher e, se necessário, corrigir seus dados?", low: "Muito difícil", high: "Muito fácil" },
  { key: "reliability", question: "Como você avalia o funcionamento técnico do sistema?", low: "Muito ruim", high: "Muito bom" },
  { key: "guidance", question: "Como você avalia a clareza das orientações da biblioteca?", low: "Muito ruim", high: "Muito boa" },
  { key: "response_time", question: "Como você avalia o tempo de resposta da biblioteca?", low: "Muito ruim", high: "Muito bom" },
  { key: "deposit_guide", question: "O guia ajudou você a realizar o autodepósito no RI/UFBA?", low: "Não ajudou", high: "Ajudou muito" },
  { key: "overall", question: "Como você avalia sua experiência geral com o Pronto!?", low: "Muito ruim", high: "Muito boa" },
] as const;

export const feedbackDifficulties = [
  ["initial", "Solicitação inicial"], ["corrections", "Correção de dados"],
  ["nada_consta", "Nada Consta"], ["cataloging_card", "Ficha catalográfica"],
  ["pdf", "Geração do PDF"], ["deposit_guide", "Guia de autodepósito"],
  ["none", "Nenhuma"], ["other", "Outra etapa"],
] as const;

export const feedbackComparisons = [
  ["much_worse", "Muito pior"], ["worse", "Um pouco pior"],
  ["same", "Sem diferença relevante"], ["better", "Um pouco melhor"],
  ["much_better", "Muito melhor"],
] as const;

export const feedbackAgeBands = [
  ["up_to_24", "Até 24 anos"], ["25_34", "25 a 34 anos"],
  ["35_44", "35 a 44 anos"], ["45_plus", "45 anos ou mais"],
  ["prefer_not", "Prefiro não informar"],
] as const;

export const feedbackResidences = [
  ["metro_salvador", "Salvador ou região metropolitana"],
  ["other_bahia", "Outra cidade da Bahia"],
  ["other_state", "Outro estado"],
  ["prefer_not", "Prefiro não informar"],
] as const;

export const feedbackDigitalFamiliarity = [
  ["rarely", "Raramente uso"], ["sometimes", "Uso às vezes"],
  ["frequently", "Uso com frequência"], ["prefer_not", "Prefiro não informar"],
] as const;

export const feedbackDigitalAutonomy = [
  ["need_help", "Geralmente preciso de ajuda"],
  ["some_help", "Às vezes preciso de ajuda"],
  ["independent", "Geralmente consigo sem ajuda"],
  ["prefer_not", "Prefiro não informar"],
] as const;

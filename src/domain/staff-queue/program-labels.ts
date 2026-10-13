const programLabels: Record<string, string> = {
  "architecture-urbanism-undergraduate": "Bacharelado",
  "athdc-specialization": "RAU+E",
  "mp-cecre-master": "MP-CECRE",
  "ppgau-academic-master": "PPG-AU",
  "ppgau-doctorate": "PPG-AU",
};

const monographLabels: Record<string, string> = {
  undergraduate_thesis: "TFG",
  specialization_thesis: "TCC de Especialização",
  dissertation: "Dissertação",
  thesis: "Tese",
};

export function programDisplayName(program: { code: string; name: string } | null) {
  return program ? programLabels[program.code] ?? program.name : "Programa não identificado";
}

export function monographDisplayName(program: { code: string; work_type: string } | null) {
  return program?.code === "mp-cecre-master" ? "TCC de Especialização" : monographLabels[program?.work_type ?? ""] ?? "Não informado";
}

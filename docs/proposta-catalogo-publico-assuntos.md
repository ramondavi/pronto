# Possível catálogo público de assuntos — proposta

Consulta do responsável em 28/10/2026; publicação e implementação não autorizadas nesta etapa. A base continua restrita à equipe pelas políticas existentes.

É tecnicamente viável oferecer busca pública por termos e variantes, página por conceito com URI estável, notas e relações aprovadas para divulgação e referências à origem. Para interoperabilidade: SKOS em JSON-LD para dados ligados e MARC21 de autoridades para catálogos bibliográficos; exportações precisam mapear os campos reconhecidos sem inventar identificadores, traduções, relações ou códigos MARC ausentes. Uma API de leitura pode acrescentar paginação e atualização incremental.

Antes de publicar, definir curadoria, quais registros/campos podem ser públicos, condições de reutilização de cada fonte e atribuição. O Getty distribui os vocabulários sob ODC-By 1.0; isso não autoriza presumir a mesma condição para BN ou Pergamum. Termos locais e importados precisam manter identidade e proveniência distintas. Separar a publicação do repertório das fichas, estudantes, protocolos, logs internos e PDFs; o catálogo público não deve abrir as tabelas operacionais.

Fontes primárias consultadas:
- W3C, SKOS: https://www.w3.org/TR/skos-reference/
- Library of Congress, MARC21 de autoridades: https://www.loc.gov/marc/authority/
- Getty, vocabulários e condições de reutilização: https://www.getty.edu/research-conservation/tools-databases/vocabularies/about/

## Três alternativas apresentadas em 28/10/2026

1. Catálogo de consulta: busca por cabeçalhos/variantes, filtros por origem e página pública por autoridade. Menor escopo; sem API inicialmente.
2. Portal de autoridades (recomendado): acrescenta estrutura/subdivisões, notas e relações aprovadas, referências de origem e exportação MARC21/SKOS dos campos reconhecidos. Pode crescer a partir da alternativa 1.
3. Portal e serviço de dados ligados: acrescenta URIs estáveis, SKOS/JSON-LD, API paginada e política de atualização/versionamento. Maior compromisso de manutenção, disponibilidade e governança.

As três se limitam a autoridades de assuntos e distinguem termos locais validados de registros derivados de fontes externas. Propostas inativas não são publicadas. Não abrir autoridades pessoais originadas de atendimentos, registros brutos, citações/notas internas ou identificadores de operadores. Somente campos e registros aprovados para divulgação e reutilização conforme a fonte. O responsável solicitou alternativas; ainda não escolheu nem autorizou publicação ou abertura de RLS. A arquitetura pública deverá usar projeção própria, sem consultas anônimas às tabelas operacionais.

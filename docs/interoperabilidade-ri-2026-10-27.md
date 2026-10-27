# Opções de interoperabilidade com o RI — 27/10/2026

O responsável pediu avaliação das opções mostradas nos prints, sem implementar uma integração neste momento. O acesso automático à instalação da UFBA encontrou verificação humana; não foi possível verificar a configuração de importação por arquivo. Nenhuma submissão, upload ou mensagem externa foi enviado.

## Opções dos prints

- DOI, Crossref, DataCite: aproveitáveis se o trabalho já possui identificador/registro na fonte consultada. Não geram registro nessas fontes nem recebem diretamente um protocolo Pronto!.
- OpenAlex por título ou DOI e OpenAIRE por título/autor: podem recuperar trabalhos já indexados. Busca por autor exige conferir qual trabalho será importado. Opções de pessoas, revistas, instituições, editoras e financiadores não substituem metadados do trabalho.
- VuFind: depende do catálogo que o conector do RI consulta e de o registro já existir nele; o nome no menu não prova conexão com o Pergamum/UFBA nem com o Pronto!.
- arXiv, CiNii, NASA/ADS, EPO, PubMed/Europe, SciELO, Scopus e Web of Science: só ajudam quando o documento está na fonte correspondente. EPO é voltado a patentes; não é caminho geral para trabalhos acadêmicos da biblioteca.

Para um trabalho novo, antes de sua primeira publicação no RI, nenhuma dessas opções constitui uma conexão direta com o Pronto!. Não se deve criar um DOI ou publicar em outra fonte apenas para contornar o formulário.

## Caminhos possíveis, ainda não implementados

A documentação oficial do DSpace prevê iniciar submissão por arquivo de metadados, exemplificando BibTeX e PubMed XML, com um registro por arquivo e dependência de um parser habilitado. Exportação BibTeX pelo Pronto! é candidata a evitar redigitação; é necessário confirmar a configuração efetiva da UFBA e testar com metadados fictícios antes de orientar estudantes. Não supor que a tela “Importar de fonte externa” também importe arquivos, ou que RIS/MARC/CSV estejam habilitados.

Um conector nativo “Pronto!” requer configuração e mapeamento pela equipe do RI. Integração autenticada pela API também depende de acordo técnico, permissão e revisão dos campos, da coleção e da política de submissão. Os prints não comprovam nenhuma dessas condições. O guia atual não foi reescrito com etapas não verificadas.

## Fontes

- Prints fornecidos pelo responsável da instalação UFBA: https://repositorio.ufba.br/import-external?entity=none
- Contrato REST oficial, importação ao criar submissão: https://github.com/DSpace/RestContract/blob/main/workspaceitems.md
- Provedores externos oficiais e tipos de entidade: https://github.com/DSpace/DSpace/blob/main/dspace/config/spring/api/external-services.xml

# Política interna de segurança e operação — Pronto!

**Versão 1.0 — 21 de setembro de 2026**

Esta política orienta a operação do Pronto! pela BIB/FAUFBA. Ela complementa a política de privacidade pública e não substitui normas da UFBA, orientação da Ouvidoria ou resposta institucional a incidentes.

**Responsável operacional pelo Pronto!:** Ramon Davi Santana. A função abrange o acompanhamento da operação, dos alertas e falhas do serviço e o encaminhamento de incidentes às áreas competentes. Não substitui a controladora nem a pessoa encarregada de dados da UFBA.

## 1. Acesso mínimo necessário

- Estudante acessa exclusivamente a própria conta, solicitação e arquivos permitidos pelo seu estágio de atendimento.
- Catalogador acessa somente atendimentos sob sua responsabilidade; pode consultar a fila e assumir atendimentos conforme as regras de posse.
- Administrador herda a operação do catalogador e administra contas, programas, parâmetros e auditoria.
- Coordenação acessa apenas o resumo da solicitação pelo Magic Link ativo: identificação básica do trabalho, status, SLA e timeline. O acesso não mostra CPF, documentos, Nada Consta ou observações internas.
- Contas bloqueadas ou inativas não mantêm acesso operacional. Perfis internos são provisionados exclusivamente por administrador ativo.

## 2. Dados, arquivos e limites aplicados

- O trabalho acadêmico completo não é enviado ao Pronto!; a ficha é mesclada localmente no navegador.
- O Nada Consta é o único arquivo recebido pelo serviço. Aceita somente PDF, com extensão, MIME e assinatura validados, e limite máximo de **5 MB**.
- O Nada Consta fica em bucket privado, acessível somente pela pessoa estudante proprietária e pela equipe autorizada. É removido 60 dias após o encerramento; preservam-se somente o registro textual de validação e a auditoria necessária.
- CPF não pode constar em URL, e-mail ou log técnico. Segredos, tokens, senhas, documentos e o conteúdo do trabalho não são incluídos em logs.

## 3. Auditoria e retenção

O sistema registra data/hora, responsável, ação e entidade atingida nas ações operacionais e administrativas relevantes, sem copiar conteúdo sensível desnecessário. Incluem-se:

- provisionamento, perfil, bloqueio, inativação e reativação de contas;
- assunção, devolução e reatribuição de atendimentos;
- correções solicitadas, correções recebidas, homologação da ficha e validação/devolução do Nada Consta;
- início e confirmação do autodepósito, publicação verificada, encerramento e expurgo;
- alterações de programas, SLA, calendário, mural, templates, FAQ, coordenação e Magic Link;
- emissão, invalidação e entrega das comunicações transacionais.

Auditorias operacionais e administrativas ficam guardadas por 5 anos. Logs brutos de acesso, sessão, aplicação, rede, banco e erro técnico ficam por 6 meses. Dossiês de incidente ficam por 5 anos após o encerramento. Backups rotativos ficam por 90 dias, salvo preservação necessária. A revisão anual confirma que os registros não passaram a duplicar conteúdo sensível.

## 4. Operação segura

- Nunca compartilhar senha, token, URL de Magic Link, CPF, chave de serviço ou arquivo do estudante por e-mail, chat ou captura de tela.
- A equipe usa somente contas institucionais individuais. Não são permitidas contas compartilhadas.
- Uma alteração crítica exige a confirmação já prevista na interface; não deve ser contornada por pedido informal.
- Alterações de banco usam nova migração versionada, revisada e testada; nenhuma migração é aplicada ao Supabase remoto sem avaliação de impacto e confirmação explícita.
- A fila de e-mails usa idempotência. Falha de entrega é registrada sem o corpo da mensagem e não deve ser marcada manualmente como entregue.

## 5. Incidentes

Ao suspeitar de acesso indevido, exposição de dados, conta comprometida, perda de arquivo ou indisponibilidade relevante:

1. interromper ou restringir o acesso afetado, sem apagar evidências;
2. registrar data/hora, escopo conhecido e medidas adotadas, sem reproduzir dados pessoais além do necessário;
3. comunicar imediatamente a coordenação operacional da BIB/FAUFBA;
4. encaminhar questões de direitos e privacidade a `privacidade@ufba.br`, canal indicado no Aviso de Privacidade da UFBA para posterior encaminhamento à Ouvidoria;
5. acionar suporte técnico para investigar, corrigir e verificar a restauração do serviço;
6. documentar o encerramento, as pessoas afetadas quando identificáveis e as medidas preventivas adotadas.

## 6. Ambiente de produção

Antes do lançamento ou de qualquer mudança de hospedagem, a pessoa técnica responsável confirma no Supabase e na Vercel:

- domínios e URLs de callback autorizados;
- limites e proteção contra abuso para cadastro, confirmação, login e recuperação de senha;
- SMTP com TLS, remetente institucional e limites compatíveis com o serviço;
- alertas de indisponibilidade e de erro direcionados a responsáveis institucionais;
- execução e verificação de backup/restauração; e
- ausência de segredos no cliente, nos logs e no repositório.

Essas são configurações de implantação, não autorizações para alterar dados ou aplicar migrações remotas sem a aprovação exigida.

## 7. Revisão

A BIB/FAUFBA revisa esta política uma vez por ano, após incidente relevante ou quando houver alteração de fornecedor, arquitetura, regras institucionais ou tratamento de dados.

## 8. Backup e preservação — complemento de 23/10/2026

Seguir docs/protocolo-backup-recuperacao.md para verificação diária e cópia independente quando houver mudanças, criptografia, expiração em 90 dias, alertas e ensaios trimestrais. Confirmar a cobertura de contas e copiar Storage separadamente. A restauração deve reaplicar eliminações devidas e preservar restrições de acesso. As metas são até 24 horas para proteger alterações e recuperação em até um dia útil, a comprovar. A rotina permanece pendente de implantação e primeiro ensaio; não declarar redundância ou recuperação garantidas sem evidência.

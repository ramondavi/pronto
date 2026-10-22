# Pronto! — modelos de e-mail para validação

Data: 22/10/2026. Revisão de 22/10/2026 após o parecer sobre a base 7e8e6ca. Alterações locais, sem publicação em produção.

**26 modelos e variantes: Redações consolidadas após parecer, esclarecimentos e autorização de publicação em 22/10/2026.**

Este catálogo apresenta o conteúdo implementado, com os ajustes solicitados no parecer. Não envia mensagens, não altera configurações e não comprova a configuração remota de produção. Os modelos de autenticação correspondem aos arquivos locais do Supabase; os demais são gerados pelas versões mais recentes das funções do banco e pelo formatador do Pronto!.

Os exemplos usam Pessoa Exemplo, Secretaria Exemplo, Coordenação Exemplo, matrícula 000000000 e protocolo FA2026-0001. Título, subtítulo, prazos, campos de correção, resposta da Biblioteca, endereço do trabalho, links e códigos são dados variáveis. Endereços example.invalid e identificadores EXEMPLO não dão acesso real. Os botões da prévia visual são ilustrativos.

Os e-mails de abertura à coordenação incluem Magic Link somente nas condições configuradas para programa e contato. A recuperação desse aviso é apresentada separadamente. Lembretes de avaliação têm textos próprios nos dias 3, 10, 17 e 24; lembretes de preparação têm três variantes.

**Para validar:** use os identificadores E01 a E23 e E19-10/E19-17/E19-24. Você pode informar, por exemplo, “E01 aprovado; no E08, substituir ... por ...”. E01–E04 foram aprovados explicitamente no parecer recebido; os demais não foram aprovados automaticamente. A versão visual permite guardar anotações neste navegador e exportá-las; essas marcações não alteram o Pronto!.

## Índice

- [E01 — Confirmação do cadastro](#e01)
- [E02 — Código de acesso do estudante](#e02)
- [E03 — Recuperação ou definição de senha](#e03)
- [E04 — Confirmação da alteração de e-mail](#e04)
- [E05 — Solicitação recebida](#e05)
- [E06 — Abertura para a coordenação](#e06)
- [E07 — Abertura para a coordenação — recuperação do envio](#e07)
- [E08 — Pedido de correções](#e08)
- [E09 — Resposta da Biblioteca à mensagem do solicitante](#e09)
- [E10 — Ficha comum liberada](#e10)
- [E11 — Ficha retrospectiva da RAU+E liberada](#e11)
- [E12 — Cancelamento por descumprimento de declarações](#e12)
- [E13 — Atendimento concluído — solicitante, com publicação no RI](#e13)
- [E14 — Atendimento concluído — retrospectivo, com publicação no RI](#e14)
- [E15 — Atendimento concluído — coordenação, com publicação no RI](#e15)
- [E16 — Atendimento concluído — solicitante, sem publicação registrada](#e16)
- [E17 — Atendimento concluído — coordenação, sem publicação registrada](#e17)
- [E18 — Conta interna aguardando provisionamento](#e18)
- [E19 — Lembrete para avaliar o serviço](#e19)
- [E20 — Lembrete de depósito após habilitar o guia](#e20)
- [E21 — Lembrete de preparação — confirmação da conta](#e21)
- [E22 — Lembrete de preparação — liberação para depositar](#e22)
- [E23 — Lembrete de preparação — correção da liberação](#e23)
- [E19-10 — Lembrete para avaliar o serviço — dia 10](#e19-10)
- [E19-17 — Lembrete para avaliar o serviço — dia 17](#e19-17)
- [E19-24 — Lembrete para avaliar o serviço — dia 24](#e19-24)

<a id="e01"></a>

## E01 — Confirmação do cadastro

**Situação:** Aprovado no parecer original; rodapé geral atualizado.

**Destinatário:** Pessoa que criou uma conta.

**Disparo:** Cadastro ou reenvio da confirmação.

**Assunto:** Pronto! | Confirme seu e-mail institucional

**Observação:** Links e código são ilustrativos. O modelo é o arquivo local do repositório; a configuração remota do Supabase não foi consultada.

**Conteúdo completo do exemplo:**

BIB/FAUFBA · Pronto!

Confirme seu e-mail institucional

Recebemos o cadastro da sua conta. Confirme seu endereço de e-mail para acessar o Pronto!.

Confirmar meu e-mail

Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/CONFIRMACAO-ILUSTRATIVA

Se você não fez esse cadastro, desconsidere esta mensagem.

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e02"></a>

## E02 — Código de acesso do estudante

**Situação:** Aprovado no parecer original; rodapé geral atualizado.

**Destinatário:** Estudante.

**Disparo:** Solicitação de acesso por código.

**Assunto:** Pronto! | Seu código de acesso

**Observação:** Links e código são ilustrativos. O modelo é o arquivo local do repositório; a configuração remota do Supabase não foi consultada.

**Conteúdo completo do exemplo:**

BIB/FAUFBA · Pronto!


Seu código de acesso


Use o código abaixo na tela de entrada do estudante. Ele é temporário e só pode ser usado uma vez.


123456


Se você não pediu esse código, desconsidere esta mensagem. Não compartilhe o código com ninguém.



Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e03"></a>

## E03 — Recuperação ou definição de senha

**Situação:** Aprovado no parecer original; rodapé geral atualizado.

**Destinatário:** Titular da conta.

**Disparo:** Solicitação de recuperação/definição de senha, inclusive pelo fluxo autorizado de ajuda da Biblioteca.

**Assunto:** Pronto! | Defina uma nova senha

**Observação:** Links e código são ilustrativos. O modelo é o arquivo local do repositório; a configuração remota do Supabase não foi consultada.

**Conteúdo completo do exemplo:**

BIB/FAUFBA · Pronto!

Defina uma nova senha

Recebemos uma solicitação para alterar a senha da sua conta. Abra o link abaixo para escolher uma nova senha.

Definir nova senha

Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/auth/recuperacao?token_hash=HASH-ILUSTRATIVO-SEM-ACESSO&type=recovery

Se você não pediu essa alteração, desconsidere esta mensagem. Sua senha atual permanecerá válida.

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e04"></a>

## E04 — Confirmação da alteração de e-mail

**Situação:** Aprovado no parecer original; rodapé geral atualizado.

**Destinatário:** Endereços envolvidos na alteração da conta.

**Disparo:** Solicitação de troca de e-mail; a configuração exige dupla confirmação.

**Assunto:** Pronto! | Confirme a alteração de e-mail

**Observação:** Links e código são ilustrativos. O modelo é o arquivo local do repositório; a configuração remota do Supabase não foi consultada.

**Conteúdo completo do exemplo:**

BIB/FAUFBA · Pronto!

Confirme a alteração de e-mail

Uma alteração do endereço institucional da sua conta foi solicitada. Confirme esta etapa para continuar.

Confirmar alteração

Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/CONFIRMACAO-ILUSTRATIVA

Se você não pediu essa alteração, entre em contato com a biblioteca pelo canal institucional.

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e05"></a>

## E05 — Solicitação recebida

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Criação de uma solicitação de ficha.

**Assunto:** Pronto! | Recebemos sua solicitação n.º FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Tudo certo! Recebemos sua solicitação de ficha catalográfica, identificada pelo protocolo n.º FA2026-0001.

Você pode acompanhar o andamento e as próximas etapas acessando o Pronto!.

O prazo de referência para o atendimento é de 3 dias úteis. Caso a biblioteca identifique alguma informação a corrigir, você receberá uma nova mensagem.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e06"></a>

## E06 — Abertura para a coordenação

**Situação:** Redação consolidada para publicação.

**Destinatário:** Contato ativo da coordenação.

**Disparo:** Abertura do protocolo, com Magic Link habilitado no programa e recebimento habilitado no contato.

**Assunto:** Pronto! | Nova solicitação n.º FA2026-0001

**Observação:** O acesso de acompanhamento é ilustrativo. Não é um convite para criar conta.

**Conteúdo completo do exemplo:**

Olá!

Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.

Trabalho: Trabalho de exemplo: Subtítulo de exemplo
Solicitante: Pessoa Exemplo
Matrícula: 000000000
Protocolo: FA2026-0001
Prazo de referência: 3 dias úteis
Previsão da análise: [Data prevista da análise]

Para acompanhar o andamento, use o acesso seguro abaixo: https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) discente concluinte.

Acompanhar solicitação
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e07"></a>

## E07 — Abertura para a coordenação — recuperação do envio

**Situação:** Redação consolidada para publicação.

**Destinatário:** Contato ativo da coordenação.

**Disparo:** Recuperação do aviso inicial quando ele ainda não existe; não é uma mensagem adicional em todos os protocolos.

**Assunto:** Pronto! | Nova solicitação n.º FA2026-0001

**Conteúdo completo do exemplo:**

Olá!

Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.

Trabalho: Trabalho de exemplo: Subtítulo de exemplo
Solicitante: Pessoa Exemplo
Matrícula: 000000000
Protocolo: FA2026-0001
Prazo de referência: 3 dias úteis
Previsão da análise: [Data prevista da análise]

Para acompanhar o andamento, use o acesso seguro abaixo: https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) discente concluinte.

Acompanhar solicitação
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e08"></a>

## E08 — Pedido de correções

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca devolve campos para correção.

**Assunto:** Pronto! | Correções necessárias na solicitação n.º FA2026-0001

**Observação:** A lista de campos, justificativas e observações é preenchida pela Biblioteca. Os trechos entre colchetes representam esse conteúdo variável.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

A Biblioteca analisou sua solicitação e identificou informações que precisam ser corrigidas antes do prosseguimento.

No Pronto!, estarão liberados somente os campos abaixo para sua correção:

• [Campo a corrigir]: [Orientação selecionada pela Biblioteca].
  Observação complementar: [Comentário complementar da Biblioteca, quando houver].

Acesse o sistema para revisar e reenviar as informações.

Se precisar de orientação sobre o atendimento, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.

Corrigir campos pendentes
Se o botão "Corrigir campos pendentes" não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/solicitacao/corrigir

Acessar o painel do Pronto!
Se o botão "Acessar o painel do Pronto!" não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e09"></a>

## E09 — Resposta da Biblioteca à mensagem do solicitante

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca conclui a análise com uma resposta ainda não enviada.

**Assunto:** Pronto! | Resposta sobre o protocolo FA2026-0001

**Observação:** A resposta livre é variável e pode conter parágrafos, listas, destaques e links permitidos.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

A biblioteca respondeu à mensagem que você enviou no protocolo FA2026-0001:

[Resposta redigida pela Biblioteca, com a formatação escolhida no atendimento.]

Acompanhe o andamento no Pronto!.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e10"></a>

## E10 — Ficha comum liberada

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Homologação da ficha e aprovação do Nada Consta.

**Assunto:** Pronto! | Sua ficha catalográfica está liberada!

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Sua ficha catalográfica foi homologada e o Nada Consta que você forneceu foi validado. A ficha já está disponível no Pronto!.

Acesse sua solicitação para gerar o PDF completo do seu trabalho com a ficha catalográfica já inserida (opção recomendada) ou baixá-la separadamente.

No painel do Pronto!, você também pode consultar as orientações para o autodepósito do seu trabalho no RI/UFBA.

Atenção! Antes de gerar o arquivo final do seu trabalho contendo a ficha, confira se o PDF selecionado por você no seu dispositivo é o mesmo trabalho final completo que você enviou durante o atendimento no Pronto!.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e11"></a>

## E11 — Ficha retrospectiva da RAU+E liberada

**Situação:** Redação consolidada para publicação.

**Destinatário:** Secretaria da RAU+E.

**Disparo:** Homologação da ficha retrospectiva, com dispensa de Nada Consta.

**Assunto:** Pronto! | Ficha retrospectiva n.º FA2026-0001 liberada

**Conteúdo completo do exemplo:**

Olá!

A ficha do protocolo FA2026-0001 foi homologada.

Acesse o Pronto! para gerar a ficha e consultar o guia de depósito do trabalho no RI/UFBA.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e12"></a>

## E12 — Cancelamento por descumprimento de declarações

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca cancela o protocolo por declarações não cumpridas.

**Assunto:** Pronto! | Protocolo FA2026-0001 cancelado

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Após a análise da biblioteca, o protocolo FA2026-0001 foi cancelado porque estas declarações não foram cumpridas: [Declarações não cumpridas, identificadas pela Biblioteca].

Este protocolo não pode ser reaberto. Consulte o Pronto! para acompanhar seu registro. Em caso de dúvida, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e13"></a>

## E13 — Atendimento concluído — solicitante, com publicação no RI

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca registra/verifica a publicação e encerra o protocolo.

**Assunto:** Pronto! | Atendimento concluído — FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Seu atendimento foi concluído. A publicação do trabalho no Repositório Institucional da UFBA foi verificada pela Biblioteca.

Endereço permanente da publicação: https://repositorio.ufba.br/handle/ri/EXEMPLO

Guarde este endereço para consulta e divulgação do seu trabalho. Ele é permanente e único.

O arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.

Consultar publicação
Se o botão "Consultar publicação" não funcionar, copie este endereço para o navegador:
https://repositorio.ufba.br/handle/ri/EXEMPLO

Acessar o painel do Pronto!
Se o botão "Acessar o painel do Pronto!" não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e14"></a>

## E14 — Atendimento concluído — retrospectivo, com publicação no RI

**Situação:** Redação consolidada para publicação.

**Destinatário:** Secretaria da RAU+E.

**Disparo:** Biblioteca verifica a publicação e encerra o pedido retrospectivo.

**Assunto:** Pronto! | Atendimento concluído — FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Secretaria.

Seu atendimento foi concluído. A publicação do trabalho no Repositório Institucional da UFBA foi verificada pela Biblioteca.

Endereço permanente da publicação: https://repositorio.ufba.br/handle/ri/EXEMPLO

Consultar publicação
Se o botão "Consultar publicação" não funcionar, copie este endereço para o navegador:
https://repositorio.ufba.br/handle/ri/EXEMPLO

Acessar o painel do Pronto!
Se o botão "Acessar o painel do Pronto!" não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e15"></a>

## E15 — Atendimento concluído — coordenação, com publicação no RI

**Situação:** Redação consolidada para publicação.

**Destinatário:** Contatos ativos da coordenação habilitados para receber conclusão.

**Disparo:** Encerramento com publicação verificada no RI.

**Assunto:** Pronto! | Atendimento concluído — FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Coordenação.

O atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.

Trabalho: Trabalho de exemplo
Solicitante: Pessoa Exemplo
Protocolo: FA2026-0001
Publicação no RI/UFBA: https://repositorio.ufba.br/handle/ri/EXEMPLO

A página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O botão e URL de acesso ao protocolo enviados anteriormente não são mais válidos.

Consultar publicação
Se o botão não funcionar, copie este endereço para o navegador:
https://repositorio.ufba.br/handle/ri/EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e16"></a>

## E16 — Atendimento concluído — solicitante, sem publicação registrada

**Situação:** Redação de conclusão consolidada para publicação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca conclui o atendimento comum com o guia do programa desabilitado.

**Assunto:** Pronto! | Atendimento concluído — FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Pessoa.

O atendimento da ficha catalográfica foi concluído.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Página pública do trabalho no Pronto!: https://pronto.example.invalid/f/IDENTIFICADOR-PUBLICO-EXEMPLO

Ver página pública do trabalho
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/f/IDENTIFICADOR-PUBLICO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e17"></a>

## E17 — Atendimento concluído — coordenação, sem publicação registrada

**Situação:** Redação de conclusão consolidada para publicação.

**Destinatário:** Contatos ativos da coordenação habilitados para receber conclusão.

**Disparo:** Conclusão do atendimento sem depósito pelo fluxo do guia.

**Assunto:** Pronto! | Atendimento concluído — FA2026-0001

**Conteúdo completo do exemplo:**

Olá!

O atendimento da ficha catalográfica foi concluído.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Página pública do trabalho no Pronto!: https://pronto.example.invalid/f/IDENTIFICADOR-PUBLICO-EXEMPLO

Ver página pública do trabalho
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/f/IDENTIFICADOR-PUBLICO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e18"></a>

## E18 — Conta interna aguardando provisionamento

**Situação:** Redação consolidada para publicação.

**Destinatário:** Administradores ativos.

**Disparo:** Conta institucional confirmada, ainda sem perfil provisionado.

**Assunto:** Pronto! | Conta interna aguardando provisionamento

**Conteúdo completo do exemplo:**

Olá.

A conta institucional equipe@example.invalid foi confirmada e está aguardando a definição de perfil no painel administrativo do Pronto!.

Acesse Administração → Operação → Contas para atribuir o perfil adequado.

Só faça o provisionamento após confirmar que a pessoa integra a equipe autorizada da Biblioteca.

Acessar o painel do Pronto!
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e19"></a>

## E19 — Lembrete para avaliar o serviço

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante com convite de avaliação e sem resposta registrada.

**Disparo:** Campanha ativada; lembretes nos dias 3, 10, 17 e 24 após o convite, conforme elegibilidade.

**Assunto:** Pronto! | Sua avaliação ajuda a melhorar a BIB/FAUFBA 💬

**Observação:** Variante do dia 3; os dias 10, 17 e 24 têm redações próprias, apresentadas a seguir.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você concluiu o protocolo FA2026-0001 e sua experiência pode ajudar a melhorar o Pronto! e os serviços da Biblioteca da Faculdade de Arquitetura da UFBA.

A avaliação leva cerca de 3 minutos. Acesse: https://pronto.example.invalid/painel/avaliacao

Se você já respondeu, desconsidere esta mensagem.

Avaliar o serviço
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/avaliacao

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e20"></a>

## E20 — Lembrete de depósito após habilitar o guia

**Situação:** Redação consolidada para publicação.

**Destinatário:** Pessoa cujo protocolo terminou quando o guia estava desabilitado.

**Disparo:** Biblioteca seleciona os protocolos e solicita envio individual ou em lote após habilitar o guia.

**Assunto:** Pronto! | Deposite seu trabalho no RI/UFBA

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Seu trabalho abaixo infelizmente não consta ainda no Repositório Institucional da UFBA (RI/UFBA).

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

E sabe o que é ruim nisso? Que ele poderia estar sendo visto pelo mundo todo se estivesse lá disponível. Por isso, considerando a adequada divulgação científica da produção do conhecimento da nossa Faculdade e da nossa UFBA, convidamos você a depositar seu trabalho no RI. Essa ação, mais que tudo, visa a ampliar a circulação e preservação do seu trabalho, da ciência que você ajudou a construir.

Acesse o guia com os dados homologados pela biblioteca, entrando na mesma conta usada na solicitação:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

O atendimento da ficha continua concluído. Este lembrete não altera a aprovação da ficha nem declara uma obrigação retroativa. Se o trabalho já estiver no RI/UFBA, informe o endereço permanente à biblioteca.

Continuar preparação para o autodepósito
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e21"></a>

## E21 — Lembrete de preparação — confirmação da conta

**Situação:** Redação consolidada para publicação.

**Destinatário:** E-mail da conta da pessoa no Pronto!.

**Disparo:** Adesão ao lembrete durante esta espera; um envio no segundo dia útil seguinte, se a espera continuar válida.

**Assunto:** Pronto! | Continue a preparação do autodepósito

**Observação:** O lembrete não afirma que o RI concluiu a pendência. Pode ser cancelado antes do início da entrega.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você pediu este lembrete para voltar ao Pronto! e conferir a criação e confirmação da sua conta no RI/UFBA.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.

Continue de onde parou: https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Continuar preparação para o autodepósito
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e22"></a>

## E22 — Lembrete de preparação — liberação para depositar

**Situação:** Redação consolidada para publicação.

**Destinatário:** E-mail da conta da pessoa no Pronto!.

**Disparo:** Adesão ao lembrete durante esta espera; um envio no segundo dia útil seguinte, se a espera continuar válida.

**Assunto:** Pronto! | Continue a preparação do autodepósito

**Observação:** O lembrete não afirma que o RI concluiu a pendência. Pode ser cancelado antes do início da entrega.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você pediu este lembrete para voltar ao Pronto! e conferir a liberação do seu autodepósito no RI/UFBA.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.

Continue de onde parou: https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Continuar preparação para o autodepósito
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e23"></a>

## E23 — Lembrete de preparação — correção da liberação

**Situação:** Redação consolidada para publicação.

**Destinatário:** E-mail da conta da pessoa no Pronto!.

**Disparo:** Adesão ao lembrete durante esta espera; um envio no segundo dia útil seguinte, se a espera continuar válida.

**Assunto:** Pronto! | Continue a preparação do autodepósito

**Observação:** O lembrete não afirma que o RI concluiu a pendência. Pode ser cancelado antes do início da entrega.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você pediu este lembrete para voltar ao Pronto! e conferir a correção da sua liberação para o autodepósito no RI/UFBA.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.

Continue de onde parou: https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Continuar preparação para o autodepósito
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e19-10"></a>

## E19-10 — Lembrete para avaliar o serviço — dia 10

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante elegível e sem resposta registrada.

**Disparo:** Dia 10 após o convite, mantendo as condições da campanha.

**Assunto:** Pronto! | Somente 3 minutos e você pode ajudar a melhorar nossos serviços ⏱️

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Há 10 dias, você usou nosso mais novo serviço, o Pronto!, e imaginamos que sua experiência tenha sido a melhor possível. Poderia compartilhar com a gente o que achou?

A avaliação leva cerca de 3 minutos. Acesse: https://pronto.example.invalid/painel/avaliacao

Se você já respondeu, desconsidere esta mensagem.

Avaliar o serviço
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/avaliacao

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e19-17"></a>

## E19-17 — Lembrete para avaliar o serviço — dia 17

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante elegível e sem resposta registrada.

**Disparo:** Dia 17 após o convite, mantendo as condições da campanha.

**Assunto:** Pronto! | Toc toc! Teria 3 minutinhos? 🚪

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Desculpa atrapalhar o silêncio da sua viagem... Mas você poderia compartilhar com a gente como foi sua experiência ao usar o Pronto!? Sua resposta certamente vai contribuir bastante com a melhoria do que oferecemos à comunidade FAUFBA.

A avaliação leva cerca de 3 minutos. Acesse: https://pronto.example.invalid/painel/avaliacao

Se você já respondeu, desconsidere esta mensagem.

Avaliar o serviço
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/avaliacao

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e19-24"></a>

## E19-24 — Lembrete para avaliar o serviço — dia 24

**Situação:** Redação consolidada para publicação.

**Destinatário:** Solicitante elegível e sem resposta registrada.

**Disparo:** Dia 24 após o convite, mantendo as condições da campanha.

**Assunto:** Pronto! | Última chamada! Rsrs 📣

**Conteúdo completo do exemplo:**

Olá, Pessoa.

A gente jura que será o último pedido! Valorizamos muito sua avaliação dos nossos serviços e, por isso, continuamos aguardando que compartilhe conosco como foi sua experiência usando o Pronto!.

Sério! Um pequeno tempo seu gasto pode contribuir bastante para um serviço melhor da Biblioteca para seus colegas e demais membros da FAUFBA.

A avaliação leva cerca de 3 minutos. Acesse: https://pronto.example.invalid/painel/avaliacao

Se você já respondeu, desconsidere esta mensagem.

Avaliar o serviço
Se o botão não funcionar, copie este endereço para o navegador:
https://pronto.example.invalid/painel/avaliacao

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.
Não responda a este e-mail.

Rodapé: Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. / Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

## Fontes dos modelos

| Modelo | Origem no código |
| --- | --- |
| E01 | supabase/templates/confirmation.html · assunto em supabase/config.toml |
| E02 | supabase/templates/magic_link.html · assunto em supabase/config.toml |
| E03 | supabase/templates/recovery.html · assunto em supabase/config.toml |
| E04 | supabase/templates/email_change.html · assunto em supabase/config.toml |
| E05 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_opening_email |
| E06 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_opening_email |
| E07 | supabase/migrations/202610220000_email_review_wording.sql · ensure_own_coordination_opening_email |
| E08 | supabase/migrations/202610080001_separate_correction_observations.sql · return_request_for_corrections |
| E09 | supabase/migrations/202610010006_initial_public_link_gate.sql · complete_request_analysis |
| E10 | supabase/migrations/202610220000_email_review_wording.sql · queue_request_release_notice |
| E11 | supabase/migrations/202610220000_email_review_wording.sql · queue_request_release_notice |
| E12 | supabase/migrations/202609300019_cancel_changed_public_file_through_completion.sql · cancel_request_for_failed_declaration |
| E13 | supabase/migrations/202610220002_unify_completion_email_subject.sql · close_cataloging_request |
| E14 | supabase/migrations/202610220002_unify_completion_email_subject.sql · close_cataloging_request |
| E15 | supabase/migrations/202610220002_unify_completion_email_subject.sql · close_cataloging_request |
| E16 | supabase/migrations/202610220003_completion_public_work_link.sql · complete_request_without_repository |
| E17 | supabase/migrations/202610220003_completion_public_work_link.sql · complete_request_without_repository |
| E18 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_pending_staff_account_notification |
| E19 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_due_feedback_reminders |
| E20 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_repository_deposit_reminders |
| E21 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_repository_preparation_reminders |
| E22 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_repository_preparation_reminders |
| E23 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_repository_preparation_reminders |
| E19-10 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_due_feedback_reminders |
| E19-17 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_due_feedback_reminders |
| E19-24 | supabase/migrations/202610220000_email_review_wording.sql · enqueue_due_feedback_reminders |

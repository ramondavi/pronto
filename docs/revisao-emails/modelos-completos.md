# Pronto! — modelos de e-mail para validação

Data: 22/10/2026. Base: código da prévia em 7e8e6ca.

**23 modelos e variantes — todos aguardando validação do responsável pelo projeto.**

Este catálogo apresenta o conteúdo implementado, sem revisão editorial silenciosa. Não envia mensagens, não altera configurações e não comprova a configuração remota de produção. Os modelos de autenticação correspondem aos arquivos locais do Supabase; os demais são gerados pelas versões mais recentes das funções do banco e pelo formatador do Pronto!.

Os exemplos usam Pessoa Exemplo, Secretaria Exemplo, Coordenação Exemplo, matrícula 000000000 e protocolo FA2026-0001. Título, subtítulo, prazos, campos de correção, resposta da Biblioteca, endereço do trabalho, links e códigos são dados variáveis. Endereços example.invalid e identificadores EXEMPLO não dão acesso real. Os botões da prévia visual são ilustrativos.

Os e-mails de abertura à coordenação incluem Magic Link somente nas condições configuradas para programa e contato. A recuperação desse aviso é apresentada separadamente. Lembretes de avaliação repetem o mesmo texto nas datas previstas; lembretes de preparação têm três variantes.

**Para validar:** use os identificadores E01 a E23. Você pode informar, por exemplo, “E01 aprovado; no E08, substituir ... por ...”. Nenhum modelo foi marcado como aprovado automaticamente. A versão visual permite guardar anotações neste navegador e exportá-las; essas marcações não alteram o Pronto!.

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
- [E13 — Encerramento com publicação no RI — pedido comum](#e13)
- [E14 — Encerramento com publicação no RI — retrospectivo](#e14)
- [E15 — Conclusão com publicação — coordenação](#e15)
- [E16 — Conclusão sem guia do RI — solicitante](#e16)
- [E17 — Conclusão sem guia do RI — coordenação](#e17)
- [E18 — Conta interna aguardando provisionamento](#e18)
- [E19 — Lembrete para avaliar o serviço](#e19)
- [E20 — Lembrete de depósito após habilitar o guia](#e20)
- [E21 — Lembrete de preparação — confirmação da conta](#e21)
- [E22 — Lembrete de preparação — liberação para depositar](#e22)
- [E23 — Lembrete de preparação — correção da liberação](#e23)

<a id="e01"></a>

## E01 — Confirmação do cadastro

**Situação:** aguardando sua validação.

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

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e02"></a>

## E02 — Código de acesso do estudante

**Situação:** aguardando sua validação.

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


Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e03"></a>

## E03 — Recuperação ou definição de senha

**Situação:** aguardando sua validação.

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

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e04"></a>

## E04 — Confirmação da alteração de e-mail

**Situação:** aguardando sua validação.

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

Mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA. Não responda a este e-mail.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e05"></a>

## E05 — Solicitação recebida

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Criação de uma solicitação de ficha.

**Assunto:** Pronto! | Recebemos sua solicitação n.º FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Tudo certo! Recebemos sua solicitação de ficha catalográfica, identificada pelo protocolo n.º FA2026-0001.

Você pode acompanhar o andamento e as próximas etapas acessando o Pronto!.

O prazo de referência para o atendimento é de 3 dias úteis. Caso a biblioteca identifique alguma informação a corrigir, você receberá uma nova mensagem.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e06"></a>

## E06 — Abertura para a coordenação

**Situação:** aguardando sua validação.

**Destinatário:** Contato ativo da coordenação.

**Disparo:** Abertura do protocolo, com Magic Link habilitado no programa e recebimento habilitado no contato.

**Assunto:** Pronto! | Nova solicitação n.º FA2026-0001

**Observação:** O acesso de acompanhamento é ilustrativo. Não é um convite para criar conta.

**Conteúdo completo do exemplo:**

Olá, Coordenação.

Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.

Trabalho: Trabalho de exemplo: Subtítulo de exemplo
Solicitante: Pessoa Exemplo
Matrícula: 000000000
Protocolo: FA2026-0001
Prazo de referência: 3 dias úteis
Previsão da análise: [Data prevista da análise]

Para acompanhar o andamento, use o acesso seguro abaixo: https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) estudante.

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e07"></a>

## E07 — Abertura para a coordenação — recuperação do envio

**Situação:** aguardando sua validação.

**Destinatário:** Contato ativo da coordenação.

**Disparo:** Recuperação do aviso inicial quando ele ainda não existe; não é uma mensagem adicional em todos os protocolos.

**Assunto:** Pronto! | Nova solicitação n.º FA2026-0001

**Conteúdo completo do exemplo:**

Olá, Coordenação.

Uma solicitação de ficha catalográfica foi aberta para o curso ou programa sob sua coordenação.

Trabalho: Trabalho de exemplo: Subtítulo de exemplo
Solicitante: Pessoa Exemplo
Matrícula: 000000000
Protocolo: FA2026-0001
Prazo de referência: 3 dias úteis
Previsão da análise: [Data prevista da análise]

Para acompanhar o andamento, use o acesso seguro abaixo: https://pronto.example.invalid/coordenacao/LINK-ILUSTRATIVO-SEM-ACESSO

Esse acesso é somente para acompanhamento da solicitação realizada pelo(a) referido(a) estudante.

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e08"></a>

## E08 — Pedido de correções

**Situação:** aguardando sua validação.

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

Acesse diretamente a tela de correção: https://pronto.example.invalid/painel/solicitacao/corrigir

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e09"></a>

## E09 — Resposta da Biblioteca à mensagem do solicitante

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca conclui a análise com uma resposta ainda não enviada.

**Assunto:** Pronto! | Resposta sobre o protocolo FA2026-0001

**Observação:** A resposta livre é variável e pode conter parágrafos, listas, destaques e links permitidos.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

A biblioteca respondeu à mensagem que você enviou no protocolo FA2026-0001:

[Resposta redigida pela Biblioteca, com a formatação escolhida no atendimento.]

Acompanhe o andamento no Pronto!.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e10"></a>

## E10 — Ficha comum liberada

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Homologação da ficha e aprovação do Nada Consta.

**Assunto:** Pronto! | Sua ficha catalográfica está liberada!

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Sua ficha catalográfica foi homologada e o Nada Consta que você forneceu foi validado. A ficha já está disponível no Pronto!.

Acesse sua solicitação para gerar o PDF completo do trabalho com a ficha catalográfica já inserida (opção recomendada), baixar a ficha catalográfica a parte e consultar as orientações para o autodepósito no RI/UFBA, quando aplicável.

Atenção! Antes de gerar o arquivo final do seu trabalho contendo a ficha, confira se o PDF selecionado por você no seu dispositivo é o mesmo trabalho final completo que foi analisado pela Biblioteca.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e11"></a>

## E11 — Ficha retrospectiva da RAU+E liberada

**Situação:** aguardando sua validação.

**Destinatário:** Secretaria da RAU+E.

**Disparo:** Homologação da ficha retrospectiva, com dispensa de Nada Consta.

**Assunto:** Pronto! | Ficha retrospectiva liberada

**Conteúdo completo do exemplo:**

Olá, Secretaria. A ficha do protocolo FA2026-0001 foi homologada. Este pedido retrospectivo da RAU+E tem dispensa de Nada Consta. Acesse o Pronto! para baixar a ficha e, após o depósito, informar a URL permanente do RI/UFBA para conferência pela biblioteca.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e12"></a>

## E12 — Cancelamento por descumprimento de declarações

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca cancela o protocolo por declarações não cumpridas.

**Assunto:** Pronto! | Protocolo FA2026-0001 cancelado

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Após a análise da biblioteca, o protocolo FA2026-0001 foi cancelado porque estas declarações não foram cumpridas: [Declarações não cumpridas, identificadas pela Biblioteca].

Este protocolo não pode ser reaberto. Consulte o Pronto! para acompanhar seu registro. Em caso de dúvida, entre em contato com a BIB/FAUFBA pelo e-mail bibarq@ufba.br.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e13"></a>

## E13 — Encerramento com publicação no RI — pedido comum

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca registra/verifica a publicação e encerra o protocolo.

**Assunto:** Pronto! | Protocolo n.º FA2026-0001 encerrado

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Seu protocolo foi encerrado após a verificação da publicação do trabalho no Repositório Institucional da UFBA.

Endereço permanente da publicação: https://repositorio.ufba.br/handle/ri/EXEMPLO

Guarde este endereço para consulta e divulgação do seu trabalho.

O arquivo Nada Consta enviado ao Pronto! será mantido somente pelo período operacional previsto e depois removido. O registro acadêmico pertinente permanece nos sistemas institucionais aplicáveis.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e14"></a>

## E14 — Encerramento com publicação no RI — retrospectivo

**Situação:** aguardando sua validação.

**Destinatário:** Secretaria da RAU+E.

**Disparo:** Biblioteca verifica a publicação e encerra o pedido retrospectivo.

**Assunto:** Pronto! | Protocolo n.º FA2026-0001 encerrado

**Conteúdo completo do exemplo:**

Olá, Secretaria.

Seu protocolo foi encerrado após a verificação da publicação do trabalho no Repositório Institucional da UFBA.

Endereço permanente da publicação: https://repositorio.ufba.br/handle/ri/EXEMPLO

Guarde este endereço para consulta e divulgação do seu trabalho.

Solicitação retrospectiva da RAU+E com dispensa de Nada Consta.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e15"></a>

## E15 — Conclusão com publicação — coordenação

**Situação:** aguardando sua validação.

**Destinatário:** Contatos ativos da coordenação habilitados para receber conclusão.

**Disparo:** Encerramento com publicação verificada no RI.

**Assunto:** Pronto! | Protocolo n.º FA2026-0001 concluído

**Conteúdo completo do exemplo:**

Olá, Coordenação.

O atendimento da solicitação abaixo foi concluído. Isso significa que o trabalho do(a) estudante teve sua ficha catalográfica feita pela Biblioteca e já se encontra disponível no Repositório Institucional da UFBA.

Trabalho: Trabalho de exemplo
Solicitante: Pessoa Exemplo
Protocolo: FA2026-0001
Publicação no RI/UFBA: https://repositorio.ufba.br/handle/ri/EXEMPLO

A página de acompanhamento desta solicitação foi fechada juntamente com o protocolo de atendimento. O Magic Link enviado anteriormente não é mais válido.

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e16"></a>

## E16 — Conclusão sem guia do RI — solicitante

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante.

**Disparo:** Biblioteca conclui o atendimento comum com o guia do programa desabilitado.

**Assunto:** Pronto! | Atendimento da ficha concluído

**Conteúdo completo do exemplo:**

Olá, Pessoa.

O atendimento da ficha catalográfica foi concluído. O guia de autodepósito do seu programa não está habilitado neste momento. A biblioteca poderá enviar posteriormente um lembrete com acesso ao guia, quando ele for disponibilizado.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e17"></a>

## E17 — Conclusão sem guia do RI — coordenação

**Situação:** aguardando sua validação.

**Destinatário:** Contatos ativos da coordenação habilitados para receber conclusão.

**Disparo:** Conclusão do atendimento sem depósito pelo fluxo do guia.

**Assunto:** Pronto! | Atendimento da ficha concluído

**Conteúdo completo do exemplo:**

O atendimento da ficha catalográfica foi concluído sem depósito no RI/UFBA, pois o guia do programa estava desativado.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e18"></a>

## E18 — Conta interna aguardando provisionamento

**Situação:** aguardando sua validação.

**Destinatário:** Administradores ativos.

**Disparo:** Conta institucional confirmada, ainda sem perfil provisionado.

**Assunto:** Pronto! | Conta interna aguardando provisionamento

**Conteúdo completo do exemplo:**

Olá.

A conta institucional equipe@example.invalid foi confirmada e está aguardando a definição de perfil no painel administrativo do Pronto!.

Acesse Administração → Equipe e acessos para atribuir o perfil adequado.

Só faça o provisionamento após confirmar que a pessoa integra a equipe autorizada da Biblioteca.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e19"></a>

## E19 — Lembrete para avaliar o serviço

**Situação:** aguardando sua validação.

**Destinatário:** Solicitante com convite de avaliação e sem resposta registrada.

**Disparo:** Campanha ativada; lembretes nos dias 3, 10, 17 e 24 após o convite, conforme elegibilidade.

**Assunto:** Pronto! | Sua avaliação ajuda a melhorar a BIB/FA

**Observação:** É o mesmo modelo nas quatro ocasiões; não há quatro redações diferentes.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você concluiu o protocolo FA2026-0001 e sua experiência pode ajudar a melhorar o Pronto! e os serviços da Biblioteca da Faculdade de Arquitetura da UFBA.

A avaliação leva cerca de 3 minutos. Acesse: https://pronto.example.invalid/painel/avaliacao

Se você já respondeu, desconsidere esta mensagem.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e20"></a>

## E20 — Lembrete de depósito após habilitar o guia

**Situação:** aguardando sua validação.

**Destinatário:** Pessoa cujo protocolo terminou quando o guia estava desabilitado.

**Disparo:** Biblioteca seleciona os protocolos e solicita envio individual ou em lote após habilitar o guia.

**Assunto:** Pronto! | Deposite seu trabalho no RI/UFBA

**Conteúdo completo do exemplo:**

Olá, Pessoa.

A ficha catalográfica do trabalho abaixo foi concluída quando o guia de autodepósito do seu programa ainda não estava habilitado no Pronto!. O guia agora está disponível.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Convidamos você a depositar seu trabalho no Repositório Institucional da UFBA, para ampliar sua circulação e preservação. Acesse o guia com os dados homologados pela biblioteca, entrando na mesma conta usada na solicitação:
https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

O atendimento da ficha continua concluído. Este lembrete não altera a aprovação da ficha nem declara uma obrigação retroativa. Se o trabalho já estiver no RI/UFBA, informe o endereço permanente à biblioteca.

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e21"></a>

## E21 — Lembrete de preparação — confirmação da conta

**Situação:** aguardando sua validação.

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

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e22"></a>

## E22 — Lembrete de preparação — liberação para depositar

**Situação:** aguardando sua validação.

**Destinatário:** E-mail da conta da pessoa no Pronto!.

**Disparo:** Adesão ao lembrete durante esta espera; um envio no segundo dia útil seguinte, se a espera continuar válida.

**Assunto:** Pronto! | Continue a preparação do autodepósito

**Observação:** O lembrete não afirma que o RI concluiu a pendência. Pode ser cancelado antes do início da entrega.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você pediu este lembrete para voltar ao Pronto! e conferir a liberação do seu acesso no RI/UFBA.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.

Continue de onde parou: https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

**Validação:** ☐ Aprovado ☐ Ajustar

**Ajustes solicitados:**

---

<a id="e23"></a>

## E23 — Lembrete de preparação — correção da liberação

**Situação:** aguardando sua validação.

**Destinatário:** E-mail da conta da pessoa no Pronto!.

**Disparo:** Adesão ao lembrete durante esta espera; um envio no segundo dia útil seguinte, se a espera continuar válida.

**Assunto:** Pronto! | Continue a preparação do autodepósito

**Observação:** O lembrete não afirma que o RI concluiu a pendência. Pode ser cancelado antes do início da entrega.

**Conteúdo completo do exemplo:**

Olá, Pessoa.

Você pediu este lembrete para voltar ao Pronto! e conferir a correção da liberação do seu acesso no RI/UFBA.

Trabalho: Trabalho de exemplo
Protocolo: FA2026-0001

Confira a resposta por e-mail ou entre na sua conta do RI/UFBA. Este lembrete não significa que a pendência foi resolvida nem informa um prazo de resposta do RI.

Continue de onde parou: https://pronto.example.invalid/painel/autodeposito?pedido=PEDIDO-EXEMPLO

Acesse o painel do Pronto!: https://pronto.example.invalid/painel

Rodapé visual: Não responda. Esta é uma mensagem automática do Pronto!, serviço da Biblioteca da Faculdade de Arquitetura da UFBA.

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
| E05 | supabase/migrations/202609300011_coordination_opening_details.sql · enqueue_opening_email |
| E06 | supabase/migrations/202609300011_coordination_opening_details.sql · enqueue_opening_email |
| E07 | supabase/migrations/202609300011_coordination_opening_details.sql · ensure_own_coordination_opening_email |
| E08 | supabase/migrations/202610080001_separate_correction_observations.sql · return_request_for_corrections |
| E09 | supabase/migrations/202610010006_initial_public_link_gate.sql · complete_request_analysis |
| E10 | supabase/migrations/202610210000_retrospective_raue.sql · queue_request_release_notice |
| E11 | supabase/migrations/202610210000_retrospective_raue.sql · queue_request_release_notice |
| E12 | supabase/migrations/202609300019_cancel_changed_public_file_through_completion.sql · cancel_request_for_failed_declaration |
| E13 | supabase/migrations/202610210000_retrospective_raue.sql · close_cataloging_request |
| E14 | supabase/migrations/202610210000_retrospective_raue.sql · close_cataloging_request |
| E15 | supabase/migrations/202610210000_retrospective_raue.sql · close_cataloging_request |
| E16 | supabase/migrations/202610210002_repository_deposit_followup.sql · complete_request_without_repository |
| E17 | supabase/migrations/202610210002_repository_deposit_followup.sql · complete_request_without_repository |
| E18 | supabase/migrations/202609300014_coordination_completion_notice.sql · enqueue_pending_staff_account_notification |
| E19 | supabase/migrations/202609290000_feedback_campaign.sql · enqueue_due_feedback_reminders |
| E20 | supabase/migrations/202610210004_repository_deposit_permissions.sql · enqueue_repository_deposit_reminders |
| E21 | supabase/migrations/202610210008_repository_availability_submission.sql · enqueue_repository_preparation_reminders |
| E22 | supabase/migrations/202610210008_repository_availability_submission.sql · enqueue_repository_preparation_reminders |
| E23 | supabase/migrations/202610210008_repository_availability_submission.sql · enqueue_repository_preparation_reminders |

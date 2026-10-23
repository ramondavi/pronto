# Isolamento da recuperação de senha — 23/10/2026

Após o teste em produção do PR #12, o responsável relatou que confirmou o link em janela anônima, abandonou o formulário sem trocar a senha e encontrou a conta conectada na página inicial. A verificação anterior comprovava a chegada ao formulário, mas não verificava o abandono do fluxo.

## Causa e correção

A confirmação do link criava a sessão no mesmo armazenamento usado pelo login normal. A recuperação passa a usar cookie próprio, HttpOnly, Secure em produção e com duração de 15 minutos. O painel e os clientes normais não leem esse cookie. O formulário e a ação de troca da senha exigem a sessão separada; uma sessão normal não basta. Ao concluir a alteração, a recuperação é encerrada e a pessoa é encaminhada à entrada normal. Os retornos legados também usam o armazenamento separado.

Não há migração de banco, mudança de RLS ou alteração de senha de conta real. Sessões normais já criadas antes desta correção não são encerradas retroativamente.

## Evidências locais

- 138 testes aprovados, tipos e build aprovados; lint sem erros, com 13 avisos preexistentes.
- Testes com o SDK real e respostas sintéticas: cookies normais e fragmentados, isolamento entre login e recuperação, preservação do login existente, retorno legado, alteração e encerramento da recuperação; código expirado não cria sessão.
- Aplicação compilada contra serviço Auth sintético: confirmação sem consumo por prévia, formulário acessível com recuperação, abandono sem acesso ao painel, atualização de senha fictícia, exclusão do cookie, ausência de cookie de login, rejeição de código reutilizado e de redefinição sem recuperação.
- Navegador local: confirmar link fictício → formulário de nova senha → voltar à página inicial → painel exige login. Capturas locais registradas, sem dados reais.

## Limite e próximo passo

A correção ainda depende da integração/publicação aprovada e da repetição do cenário em uma nova janela anônima em produção. Não é necessário trocar a senha real para verificar o abandono. O teste anterior de entrega do e-mail continua válido para o envio, não para esse isolamento.

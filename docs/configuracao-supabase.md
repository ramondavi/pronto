# Configuração do Supabase

Este guia operacional complementa o Documento-Mestre. Nunca cole senhas, chaves secretas ou *connection strings* no repositório, em issues, PRs ou conversas.

## Configuração validada

- Plano Free, organização `BIB/FAUFBA`, projeto `Pronto!` e região `South America (São Paulo)` (`sa-east-1`).
- Postgres padrão, Data API habilitada, exposição automática de tabelas desabilitada e RLS automático habilitado.
- Cadastro por e-mail habilitado, confirmação de e-mail obrigatória, login anônimo e vinculação manual desabilitados.

### Modelos de e-mail de autenticação

Os arquivos em `supabase/templates/` personalizam localmente as mensagens de confirmação de cadastro, recuperação de senha e alteração de e-mail. A configuração está em `supabase/config.toml`. No projeto hospedado, esses arquivos não são aplicados automaticamente: antes da publicação, configure os mesmos assuntos e conteúdos em **Authentication → Email Templates** no painel do Supabase. Mantenha o endereço público do site correto para que o logo carregue e os links de confirmação apontem para o ambiente esperado. Essa configuração remota exige a autorização aplicável.

A regra de senha exige 8 caracteres, letra maiúscula, número e caractere especial. No Supabase hospedado, configure o comprimento mínimo como 8 em **Authentication → Settings**. Deixe a composição nativa sem exigência adicional: sua opção com símbolo também obrigaria letra minúscula, que não faz parte da regra aprovada. O Pronto! valida a composição antes do envio ao Auth.
- Site URL local `http://localhost:3000` e redirecionamento local `http://localhost:3000/**`.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha os valores diretamente no ambiente local. A chave *publishable* é usada pelo aplicativo; senhas e a conexão do banco permanecem somente no ambiente seguro.

## Supabase local

O Supabase CLI está fixado como dependência de desenvolvimento do projeto, na versão `2.115.0`, e deve ser executado pela raiz do repositório com `npx`. O ambiente local usa o Docker Desktop e não depende de login ou vínculo com o projeto hospedado.

Fluxo local habitual:

```powershell
npx supabase start
npx supabase db reset --local
npx supabase db lint --local --level error
npx supabase test db --local
npx supabase stop
```

- `start` inicia os serviços locais e aplica as migrações versionadas.
- `db reset --local` apaga somente o banco local descartável, recria a estrutura e reaplica todas as migrações em ordem.
- `db lint --local --level error` verifica erros no esquema local.
- `test db --local` executa os testes pgTAP versionados em `supabase/tests/database`; cada arquivo usa transação e `rollback` explícitos para não conservar dados sintéticos.
- `stop` desliga os serviços e preserva os dados locais para a próxima execução.

Não executar `supabase login`, `supabase link`, `db pull`, `db push`, `db reset --linked` nem qualquer outro comando que acesse ou altere o Supabase remoto sem explicar previamente o impacto e obter confirmação explícita. O comando `stop --no-backup` também exige confirmação, pois remove os dados locais preservados.

Os testes pgTAP em `supabase/tests/database` cobrem as regras de autorização e provisionamento já consolidadas no Incremento 2. Eles usam somente identidades sintéticas, simulam o papel `authenticated` e a claim local do usuário e nunca dependem de JWT, credenciais ou dados reais.

## Estado operacional confirmado

- As 14 migrações versionadas são reproduzíveis no ambiente local.
- O histórico remoto contém as 14 migrações, da fundação ao Incremento 13.
- O esquema remoto está alinhado aos objetos versionados localmente e não há migrações pendentes.
- O lint do banco foi aprovado nos ambientes local e remoto.
- Os 209 testes pgTAP integrados são executados no CI contra o Supabase local.

## Migrações pelo SQL Editor

Em um projeto vazio, prefira `npx supabase db push --linked` após revisar o modo `--dry-run` e obter confirmação explícita. Se o SQL Editor for indispensável, execute uma única vez todas as migrações de `supabase/migrations`, em ordem lexicográfica, sem pular arquivos.

No Dashboard, abra **SQL Editor**, crie uma nova consulta, cole um arquivo completo e execute. Somente depois de sucesso prossiga para o arquivo seguinte. Não execute parcialmente, não altere o SQL durante a cópia e interrompa se houver erro.

## Primeira conta administrativa

Depois das migrações, o usuário interno é criado e confirmado em **Authentication → Users**, com senha guardada fora do repositório. Em seguida, o primeiro Administrador é associado transacionalmente a `profiles` e `staff_profiles` pelo SQL Editor; esse provisionamento inicial é a única exceção, porque ainda não existe um Administrador autenticado para autorizar a operação. O papel nunca é aceito dos metadados enviados pelo navegador. O primeiro Administrador foi provisionado com sucesso por esse procedimento.

As contas internas seguintes também devem ser previamente criadas e confirmadas em **Authentication → Users**, sempre com e-mail `@ufba.br`. Um Administrador ativo conclui a associação chamando a função versionada `public.provision_staff_account`, que aceita somente os papéis `cataloger` e `administrator`, cria os dois perfis na mesma transação e registra a ação em `audit_logs`. A função recusa chamadas de estudantes, Catalogadores e contas administrativas bloqueadas ou inativas. Uma interface administrativa para essa chamada pode ser adicionada em incremento próprio; até lá, não conceder papéis por edição de metadados do usuário.

## Verificação de segurança

Após aplicar as migrações em um novo ambiente, confirme no **Database → Tables** que RLS está habilitado em todas as tabelas do esquema `public`. A suíte pgTAP integrada verifica com identidades sintéticas que estudantes enxergam somente seus próprios perfis, equipe ativa acessa apenas os dados operacionais previstos e contas `blocked` ou `inactive` não obtêm autorização.

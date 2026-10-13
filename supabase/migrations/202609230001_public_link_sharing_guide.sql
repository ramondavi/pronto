insert into public.knowledge_base_entries (
  slug, kind, title, summary, body_html, category, audiences, active, position, published_at
) values (
  'compartilhar-link-publico',
  'article',
  'Como compartilhar o link público do trabalho',
  'Passo a passo para criar um link que permita à biblioteca abrir o PDF sem pedir acesso.',
  $article$
<h2>Antes de compartilhar</h2>
<p>Use o PDF final do trabalho e compartilhe somente esse arquivo, ou uma pasta criada apenas para ele. Um link público permite que qualquer pessoa que o receba abra o conteúdo; não compartilhe uma pasta com outros documentos.</p>
<p>Em todos os serviços, escolha acesso para qualquer pessoa com o link e permissão somente de visualização. Não use convite limitado ao seu e-mail ou à UFBA. Não configure senha nem prazo de expiração para o link. Se a organização bloquear o compartilhamento público, use outro serviço permitido.</p>
<h2>Google Drive</h2>
<ol><li><p>Selecione o PDF e clique em Compartilhar.</p></li><li><p>Em Acesso geral, abra a lista de permissões e escolha Qualquer pessoa com o link.</p></li><li><p>Defina o papel como Leitor (Viewer), sem permissão de edição.</p></li><li><p>Clique em Copiar link e depois em Concluído.</p></li></ol>
<p><a href="https://support.google.com/docs/answer/2494822?hl=pt-BR">Instruções oficiais do Google Drive</a></p>
<h2>Microsoft OneDrive</h2>
<ol><li><p>Selecione o PDF e clique em Compartilhar.</p></li><li><p>Abra as configurações do link (ícone de engrenagem) e escolha Qualquer pessoa.</p></li><li><p>Desative Permitir edição; mantenha somente visualização.</p></li><li><p>Clique em Aplicar e depois em Copiar link.</p></li></ol>
<p>Em contas institucionais, a opção Qualquer pessoa pode estar bloqueada pelo administrador. Se não aparecer, escolha outro serviço permitido.</p>
<p><a href="https://support.microsoft.com/en-us/onedrive/share-files-and-folders-in-onedrive">Instruções oficiais do OneDrive</a></p>
<h2>Dropbox</h2>
<ol><li><p>Passe o cursor sobre o PDF e clique em Compartilhar.</p></li><li><p>Clique em Copiar link e abra Gerenciar (Manage) nas opções do link.</p></li><li><p>Escolha Link para visualização (Link for viewing), sem edição.</p></li><li><p>Copie o link de visualização.</p></li></ol>
<p><a href="https://help.dropbox.com/share/create-and-share-link">Instruções oficiais do Dropbox</a></p>
<h2>iCloud Drive</h2>
<ol><li><p>No iCloud Drive, abra o menu do PDF e escolha Compartilhar.</p></li><li><p>Em quem pode acessar, escolha Qualquer pessoa com o link.</p></li><li><p>Em permissões, escolha Somente visualizar e baixar.</p></li><li><p>Crie o link e clique em Copiar link.</p></li></ol>
<p><a href="https://support.apple.com/guide/icloud/mm708256356b/icloud">Instruções oficiais do iCloud Drive</a></p>
<h2>Proton Drive</h2>
<ol><li><p>Selecione o PDF e clique no ícone Compartilhar.</p></li><li><p>Ative Criar link público (Create public link).</p></li><li><p>Escolha Visualizador (Viewer), não Editor.</p></li><li><p>Clique em Copiar link.</p></li></ol>
<p>Não ative senha ou data de expiração: a biblioteca precisa conseguir abrir o arquivo pelo link.</p>
<p><a href="https://proton.me/support/drive-shareable-link">Instruções oficiais do Proton Drive</a></p>
<h2>Nextcloud</h2>
<ol><li><p>Na lista de arquivos, selecione o PDF e abra Compartilhar.</p></li><li><p>Crie um link público (public link).</p></li><li><p>Escolha Somente leitura (read only), sem edição ou envio de arquivos.</p></li><li><p>Copie o link público.</p></li></ol>
<p>As opções variam conforme a configuração do servidor Nextcloud. Se o compartilhamento por link estiver desativado, contate o administrador ou use outro serviço permitido.</p>
<p><a href="https://docs.nextcloud.com/server/stable/user_manual/en/files/sharing.html">Manual oficial do Nextcloud sobre compartilhamento</a></p>
<h2>Teste o link antes de enviar</h2>
<ol><li><p>Abra uma janela anônima ou privada do navegador, sem entrar na conta do serviço.</p></li><li><p>Cole o link e confirme que o PDF abre sem pedir login, autorização, senha ou código enviado por e-mail.</p></li><li><p>Confira se o PDF exibido é a versão final e está completo.</p></li><li><p>Volte ao formulário, cole o endereço iniciado por https:// no campo Link público do trabalho completo e envie a solicitação.</p></li></ol>
<h2>Se o teste falhar</h2>
<p>Revise as permissões e gere um novo link. Não envie um endereço que abra somente para você, que peça autorização, ou que dependa de uma senha privada. O Pronto! recebe apenas o link; o PDF completo não é enviado nem armazenado pelo sistema.</p>
  $article$,
  'Solicitação', array['public','student','panel'], true, 1005, now()
) on conflict (slug) do nothing;

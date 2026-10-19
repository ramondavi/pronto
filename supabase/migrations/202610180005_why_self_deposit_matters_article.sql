insert into public.knowledge_base_entries
  (slug, kind, title, summary, body_html, category, audiences, active, position, published_at)
values (
  'por-que-fazer-autodeposito-ri-ufba',
  'article',
  'Por que fazer o autodepósito no RI/UFBA?',
  'Entenda como a publicação no repositório ajuda seu trabalho a circular, ser encontrado e integrar a memória da UFBA.',
  $article$
<h2>Seu trabalho merece continuar circulando</h2>
<p>Uma monografia, dissertação ou tese representa meses ou anos de perguntas, escolhas e descobertas. Depois da defesa, esse conhecimento pode continuar útil: outra pessoa pode aprofundar o tema, aplicar uma solução, questionar um resultado ou encontrar no seu trabalho a referência que faltava. O autodepósito no Repositório Institucional da UFBA (RI/UFBA) é uma etapa para levar a pesquisa além da banca e do arquivo pessoal.</p>
<h2>O que é o autodepósito?</h2>
<p>É o envio do trabalho pelo próprio autor ao RI/UFBA, quando essa etapa estiver disponível para seu curso ou programa. Você informa os dados da obra, confere a versão final, envia o arquivo e toma as decisões de acesso e licença no ambiente do repositório. O Pronto! ajuda a preparar e copiar informações já homologadas, mas não realiza o depósito por você. A publicação é conferida pela equipe responsável.</p>
<h2>Por que publicar no repositório faz diferença?</h2>
<ul>
  <li><strong>Mais caminhos para encontrar sua pesquisa.</strong> O registro reúne título, autoria, resumo e assuntos em um ambiente criado para organizar e divulgar a produção da universidade. Esses dados ajudam quem pesquisa a reconhecer a relevância do seu trabalho.</li>
  <li><strong>Um endereço para compartilhar.</strong> Depois da publicação, o registro recebe um endereço permanente que pode ser usado em currículo, perfil acadêmico, apresentação ou conversa profissional, de acordo com as regras de acesso aplicáveis.</li>
  <li><strong>Memória acadêmica.</strong> O trabalho passa a integrar o registro da produção da UFBA, em vez de ficar restrito a uma pasta, a um computador ou a uma troca de e-mails.</li>
  <li><strong>Conhecimento que pode gerar novas perguntas.</strong> Outras pessoas podem conhecer seus métodos, referências e resultados e construir pesquisas ou ações a partir deles.</li>
</ul>
<h2>Na internet, os detalhes contam</h2>
<p>Um arquivo isolado pode ser difícil de localizar e interpretar. No repositório, a descrição do trabalho oferece contexto: quem o produziu, sobre o que trata, quando foi concluído e a qual programa se vincula. Por isso, vale revisar título, nomes, resumo, assuntos e arquivo final com atenção. Dados consistentes entre a ficha catalográfica, o trabalho e o RI/UFBA tornam a obra mais fácil de identificar e citar corretamente.</p>
<p>O depósito não garante que o trabalho aparecerá em todos os buscadores ou bases de dados, nem que receberá citações. A forma de acesso ao arquivo depende das escolhas e regras aplicáveis no RI/UFBA, inclusive eventuais restrições ou embargo. Ainda assim, uma publicação correta cria uma referência institucional mais estável e amplia as possibilidades de descoberta e uso da pesquisa.</p>
<h2>Quando chegar a sua vez</h2>
<p>Confira no Pronto! se o guia do RI/UFBA está habilitado para seu curso ou programa. Se estiver, siga as orientações para obter acesso ao repositório e faça o depósito com a versão final do trabalho. Revise cada dado e decida, no próprio RI, as opções de licença e acesso. Após a publicação, informe à biblioteca o endereço permanente para que ela confira o registro e conclua o protocolo. Se o guia não estiver habilitado para seu programa, não interprete este artigo como autorização para depositar: siga as orientações da biblioteca e da coordenação.</p>
<p>O passo a passo operacional está no artigo “Como concluir o autodepósito”, disponível nesta Central de ajuda.</p>
<h2>Para saber mais</h2>
<p><a href="https://repositorio.ufba.br/">Conheça o Repositório Institucional da UFBA</a></p>
<p><a href="https://antigo.ibict.br/informacao-para-a-pesquisa/repositorios-digitais">IBICT: repositórios digitais e visibilidade da pesquisa</a></p>
  $article$,
  'Autodepósito', array['public','student','panel'], true, 1055, now()
)
on conflict (slug) do nothing;

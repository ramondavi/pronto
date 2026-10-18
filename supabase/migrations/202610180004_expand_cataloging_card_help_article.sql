update public.knowledge_base_entries
set summary = 'Entenda como a ficha identifica seu trabalho e por que uma descrição cuidadosa ajuda outras pessoas a descobri-lo em catálogos, bases de dados e na internet.',
    body_html = replace(
      body_html,
      $old$<h2>Por que isso importa para o seu trabalho?</h2>
<ul>
  <li>Identifica o trabalho e distingue obras com títulos ou autores parecidos.</li>
  <li>Organiza dados de autoria, título e assunto para facilitar a busca nos catálogos.</li>
  <li>Ajuda a biblioteca a incorporar e recuperar o trabalho no acervo.</li>
  <li>Preserva uma descrição bibliográfica consistente, útil para quem consulta o trabalho no futuro.</li>
</ul>$old$,
      $new$<h2>Por que isso importa para o seu trabalho?</h2>
<p>Seu trabalho não termina quando o arquivo é entregue. Ele pode servir de ponto de partida para novas pesquisas, projetos e decisões profissionais. Para isso, precisa ser encontrado e reconhecido pelas pessoas certas, mesmo anos depois da defesa. A ficha catalográfica contribui para essa trajetória: reúne uma descrição organizada da obra e dá consistência à forma como ela é identificada.</p>
<ul>
  <li>Reúne autoria, título, natureza do trabalho, programa e assuntos, ajudando a distinguir sua pesquisa de outras com nomes semelhantes.</li>
  <li>Facilita o registro e a recuperação do trabalho nos catálogos da biblioteca.</li>
  <li>Oferece uma referência bibliográfica consistente para quem consulta, divulga ou cita a obra.</li>
  <li>Ajuda a preservar a identidade do trabalho quando ele é consultado em diferentes momentos e contextos.</li>
</ul>
<h2>Uma ficha para a era das buscas digitais</h2>
<p>Hoje, muita gente começa uma pesquisa por uma busca na internet, em um catálogo de biblioteca, em um repositório ou em uma base de dados. Nesses ambientes, não basta que o PDF exista: informações claras sobre autoria, título e assunto ajudam as pessoas a reconhecer o que encontraram e a chegar ao trabalho relevante. Uma descrição bibliográfica bem cuidada torna sua pesquisa mais fácil de identificar, localizar e relacionar a outras obras.</p>
<p>Isso importa especialmente quando o tema do seu trabalho pode interessar a quem está fora do seu curso ou da UFBA. Um pesquisador, uma estudante, uma profissional ou uma instituição pode procurar exatamente o assunto que você investigou. Ao descrever a obra com precisão, você ajuda a construir um caminho para esse encontro e amplia as possibilidades de leitura e uso do conhecimento produzido.</p>
<p>A ficha não publica o trabalho por conta própria nem garante destaque em mecanismos de busca. A descoberta na internet também depende dos metadados informados no repositório, das regras de indexação e da disponibilidade do arquivo. Por isso, confira se os dados da ficha e os do autodepósito no RI/UFBA representam corretamente a versão final. Essa atenção evita desencontros e fortalece a presença digital da sua pesquisa.</p>$new$
    ),
    updated_at = now()
where slug = 'o-que-e-ficha-catalografica'
  and kind = 'article'
  and body_html like '%<h2>Por que isso importa para o seu trabalho?</h2>%'
  and body_html not like '%<h2>Uma ficha para a era das buscas digitais</h2>%';

export type LiteraryQuote = { text: string; author: string; work: string; source: string; year: number };

export function authorWikipediaUrl(author: string) {
  return `https://pt.wikipedia.org/wiki/${encodeURIComponent(author.replaceAll(" ", "_"))}`;
}

// Seleção de trechos curtos em português moderno, com fonte identificada.
export const DAILY_LITERARY_QUOTES: readonly LiteraryQuote[] = [
  { text: "De que cor eram os olhos de minha mãe?", author: "Conceição Evaristo", work: "Olhos d’água", year: 2014, source: "https://www.letras.ufmg.br/literafro/24-textos-das-autoras/929-conceicaoevaristo-olhos-d-agua" },
  { text: "Abri a mala sozinha, sob nossos olhos luminosos.", author: "Itamar Vieira Junior", work: "Torto Arado", year: 2019, source: "https://todavialivros.com.br/livros/torto-arado" },
  { text: "Somos mesmo uma humanidade?", author: "Ailton Krenak", work: "Ideias para adiar o fim do mundo", year: 2019, source: "https://www.companhiadasletras.com.br/trechos/14722.pdf" },
  { text: "A fome também é professora.", author: "Carolina Maria de Jesus", work: "Quarto de Despejo", year: 1960, source: "https://sites.unipampa.edu.br/lehl/2018/10/21/uma-analise-sobre-a-obra-quarto-de-despejo-de-carolina-maria-de-jesus-por-rafael-barbosa/" },
  { text: "Tudo no mundo começou com um sim.", author: "Clarice Lispector", work: "A Hora da Estrela", year: 1977, source: "https://prefeitura.sp.gov.br/web/cultura/w/bibliotecas/noticias/25259" },
  { text: "Viver é muito perigoso.", author: "João Guimarães Rosa", work: "Grande Sertão: Veredas", year: 1956, source: "https://acervodigital.secult.mg.gov.br/museu-casa-guimaraes-rosa-mcgr/185141-2/" },
  { text: "Não sei, só sei que foi assim.", author: "Ariano Suassuna", work: "Auto da Compadecida", year: 1955, source: "https://goias.gov.br/educacao/wp-content/uploads/sites/40/2024/10/REVISA-GOIAS-9o-ANO-LP-E-MAT_OUTUBRO-E-NOVEMBRO_ESTUDANTE.pdf" },
  { text: "É preciso conhecer a fome para saber descrevê-la.", author: "Carolina Maria de Jesus", work: "Quarto de Despejo", year: 1960, source: "https://sites.unipampa.edu.br/lehl/2018/10/21/uma-analise-sobre-a-obra-quarto-de-despejo-de-carolina-maria-de-jesus-por-rafael-barbosa/" },
  { text: "Uma molécula disse sim a outra molécula e nasceu a vida.", author: "Clarice Lispector", work: "A Hora da Estrela", year: 1977, source: "https://prefeitura.sp.gov.br/web/cultura/w/bibliotecas/noticias/25259" },
  { text: "O sertão é do tamanho do mundo.", author: "João Guimarães Rosa", work: "Grande Sertão: Veredas", year: 1956, source: "https://curriculo.sedu.es.gov.br/curriculo/wp-content/uploads/2024/05/lp3serie16semana1721jun24290524.pdf" },
  { text: "A poesia é a interpretação de sentimentos nossos.", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://www.gutenberg.org/ebooks/68541" },
  { text: "Que mais seria preciso para que as horas voassem na vida como num sonho?", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://www.gutenberg.org/ebooks/69229" },
  { text: "Não havia um meio; não havia um caminho.", author: "Lima Barreto", work: "Triste Fim de Policarpo Quaresma", year: 1915, source: "https://www.gutenberg.org/ebooks/67535" },
  { text: "O sol irradiava com força no cascalho branco do chão.", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://www.gutenberg.org/ebooks/69229" },
  { text: "Ter um livro para ler", author: "Fernando Pessoa", work: "Liberdade", year: 1937, source: "https://pt.wikisource.org/wiki/Liberdade" },
  { text: "Livros são papéis pintados com tinta.", author: "Fernando Pessoa", work: "Liberdade", year: 1937, source: "https://pt.wikisource.org/wiki/Liberdade" },
  { text: "Como tem tempo não tem pressa...", author: "Fernando Pessoa", work: "Liberdade", year: 1937, source: "https://pt.wikisource.org/wiki/Liberdade" },
  { text: "O poeta é um fingidor.", author: "Fernando Pessoa", work: "Autopsicografia", year: 1932, source: "https://pt.wikisource.org/wiki/Autopsicografia" },
  { text: "Finge tão completamente", author: "Fernando Pessoa", work: "Autopsicografia", year: 1932, source: "https://pt.wikisource.org/wiki/Autopsicografia" },
  { text: "Esse comboio de corda que se chama coração.", author: "Fernando Pessoa", work: "Autopsicografia", year: 1932, source: "https://pt.wikisource.org/wiki/Autopsicografia" },
  { text: "À parte isso, tenho em mim todos os sonhos do mundo.", author: "Fernando Pessoa", work: "Tabacaria", year: 1933, source: "https://pt.wikisource.org/wiki/Tabacaria" },
  { text: "Falhei em tudo.", author: "Fernando Pessoa", work: "Tabacaria", year: 1933, source: "https://pt.wikisource.org/wiki/Tabacaria" },
  { text: "O mundo é para quem nasce para o conquistar", author: "Fernando Pessoa", work: "Tabacaria", year: 1933, source: "https://pt.wikisource.org/wiki/Tabacaria" },
  { text: "Os seres existem e mais nada", author: "Fernando Pessoa", work: "Num meio-dia de fim de primavera", year: 1931, source: "https://pt.wikisource.org/wiki/Num_meio-dia_de_fim_de_Primavera" },
  { text: "E que o meu mínimo olhar me enche de sensação", author: "Fernando Pessoa", work: "Num meio-dia de fim de primavera", year: 1931, source: "https://pt.wikisource.org/wiki/Num_meio-dia_de_fim_de_Primavera" },
  { text: "E que tudo vale a pena.", author: "Fernando Pessoa", work: "Num meio-dia de fim de primavera", year: 1931, source: "https://pt.wikisource.org/wiki/Num_meio-dia_de_fim_de_Primavera" },
  { text: "Para ser grande, sê inteiro", author: "Fernando Pessoa", work: "Para ser grande, sê inteiro (Ricardo Reis)", year: 1933, source: "https://pt.wikisource.org/wiki/Para_ser_grande,_s%C3%AA_inteiro" },
  { text: "Sê todo em cada coisa.", author: "Fernando Pessoa", work: "Para ser grande, sê inteiro (Ricardo Reis)", year: 1933, source: "https://pt.wikisource.org/wiki/Para_ser_grande,_s%C3%AA_inteiro" },
  { text: "Põe quanto és no mínimo que fazes.", author: "Fernando Pessoa", work: "Para ser grande, sê inteiro (Ricardo Reis)", year: 1933, source: "https://pt.wikisource.org/wiki/Para_ser_grande,_s%C3%AA_inteiro" },
  { text: "Basta pensar em sentir", author: "Fernando Pessoa", work: "Basta pensar em sentir", year: 1955, source: "https://pt.wikisource.org/wiki/Basta_pensar_em_sentir" },
  { text: "Meu coração faz sorrir", author: "Fernando Pessoa", work: "Basta pensar em sentir", year: 1955, source: "https://pt.wikisource.org/wiki/Basta_pensar_em_sentir" },
  { text: "Viver é não conseguir.", author: "Fernando Pessoa", work: "Basta pensar em sentir", year: 1955, source: "https://pt.wikisource.org/wiki/Basta_pensar_em_sentir" },
  { text: "Vais encontrar o mundo", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/I" },
  { text: "Coragem para a luta", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/I" },
  { text: "Parecia-me estar vendo a legião dos amigos do estudo", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/I" },
  { text: "Para diante, na linha do dever, é o mesmo que para cima.", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/XII" },
  { text: "Não mentir é simples.", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/XII" },
  { text: "A agitação não me faz bem.", author: "Raul Pompeia", work: "O Ateneu", year: 1888, source: "https://pt.wikisource.org/wiki/O_Ateneu/XII" },
  { text: "O sol cobria com uma rede de ouro", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/VI" },
  { text: "Entendo-me tão bem com a música!", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/VI" },
  { text: "Queria estar calado para ver melhor.", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/VI" },
  { text: "Que imprevistas soluções tem a vida!", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/XXIV" },
  { text: "Tudo acabou, devo começar vida nova!", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/XXIV" },
  { text: "O sol entrava pela janela", author: "Júlia Lopes de Almeida", work: "A Falência", year: 1901, source: "https://pt.wikisource.org/wiki/A_Fal%C3%AAncia/XXIV" },
  { text: "O passeio era demorado e filosófico.", author: "Lima Barreto", work: "Triste Fim de Policarpo Quaresma", year: 1915, source: "https://pt.wikisource.org/wiki/Triste_Fim_de_Policarpo_Quaresma/I/II" },
  { text: "Que riqueza é a nossa poesia popular!", author: "Lima Barreto", work: "Triste Fim de Policarpo Quaresma", year: 1915, source: "https://pt.wikisource.org/wiki/Triste_Fim_de_Policarpo_Quaresma/I/II" },
  { text: "Há no nosso povo muita invenção, muita criação", author: "Lima Barreto", work: "Triste Fim de Policarpo Quaresma", year: 1915, source: "https://pt.wikisource.org/wiki/Triste_Fim_de_Policarpo_Quaresma/I/II" },
  { text: "A imaginação foi a companheira de toda a minha existência", author: "Machado de Assis", work: "Dom Casmurro", year: 1899, source: "https://pt.wikisource.org/wiki/Dom_Casmurro/XL" },
  { text: "Digamos o caso simplesmente.", author: "Machado de Assis", work: "Dom Casmurro", year: 1899, source: "https://pt.wikisource.org/wiki/Dom_Casmurro/XL" },
  { text: "Ficando só, refleti algum tempo", author: "Machado de Assis", work: "Dom Casmurro", year: 1899, source: "https://pt.wikisource.org/wiki/Dom_Casmurro/XL" },
];

export function quoteForDay(now: Date) {
  const dateParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => Number(dateParts.find((item) => item.type === type)?.value);
  const dayNumber = Math.floor(Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000);
  return DAILY_LITERARY_QUOTES[dayNumber % DAILY_LITERARY_QUOTES.length]!;
}

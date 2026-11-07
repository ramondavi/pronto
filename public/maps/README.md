Os contornos SVG usados na descoberta de autoridades foram simplificados para a interface.

- `brazil.svg`: [API de Malhas Geográficas do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=image/svg%2Bxml&qualidade=minima), contorno do Brasil, qualidade mínima.
- `world.svg`: [Natural Earth, 1:110m Land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/), dados de domínio público, convertidos de GeoJSON para SVG.
- `south-america.svg`: [Natural Earth, 1:110m Admin 0 Countries](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson), países da América do Sul convertidos em uma silhueta SVG.
- `northeast.svg`, `bahia.svg` e `salvador.svg`: [API de Malhas Geográficas do IBGE](https://servicodados.ibge.gov.br/api/v3/malhas/), contornos em qualidade mínima da região Nordeste, do estado da Bahia e do município de Salvador.

Esses arquivos desenham somente os contornos. Os pontos exibidos são revisados separadamente na gestão de autoridades.

`authority-scale-outlines.json` reúne os mesmos limites como linhas geográficas para o mapa completo. Gere novamente com `node scripts/generate-authority-scale-outlines.mjs` após atualizar algum dos SVGs. Os contornos são visuais; os filtros de pontos continuam usando os limites definidos na aplicação.

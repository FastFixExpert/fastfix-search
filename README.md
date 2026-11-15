# fastfix-search

Căutarea inteligentă pentru magazinul https://fastfix.md (Tilda).

- `ffx-search.js` – motorul de căutare din browser: greșeli de tipar, RO/RU, sinonime, SKU, sugestii sub bara de căutare.
- `build_index.py` – generează `ffx-search-index.json` din API-ul public al magazinului (doar produse în stoc).
- `.github/workflows/index.yml` – reface indexul de 3 ori pe zi.

Fișierele sunt servite prin GitHub Pages: https://fastfixexpert.github.io/fastfix-search/
Conține doar date publice de pe site (titlu, SKU, preț, poză, link).

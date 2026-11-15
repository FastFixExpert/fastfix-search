# Căutare inteligentă fastfix.md (LIVE din 2026-11-15 ~15:45 UTC)

## Ce face
- Caută în toate produsele în stoc (4.068 din 4.109 la 15 nov), după denumire, brand, tip și cod SKU (UL-233008, 233008, UL-2330…).
- Greșeli de tipar: „lenvo” → Lenovo, „monitr dell”, „mouse logitec”, „ryzn”.
- Rusă: „леново”, „ноутбук асус”, „видеокарта”, „блок питания”, „наушники” (transliterare + sinonime).
- Tastatură pe altă limbă: „дутщмщ” → lenovo.
- Sinonime RO/RU/EN: placă video = VGA = видеокарта, sursă = PSU = блок питания, căști = intraaurale = наушники etc. (lista SYN în ffx-search.js).
- Cuvinte parțiale: „rtx406”, „наушн”, „видеок”.
- Clasament: potrivire exactă > început de cuvânt > corectură; tipul produsului la începutul titlului contează mai mult; la egalitate, produsele cu poză și mai scumpe primele. Dacă nu se potrivesc toate cuvintele, arată „potriviri apropiate”.
- Sugestii sub bara de căutare pe măsură ce scrii (6 produse cu poză și preț + „Toate rezultatele (N)”), săgeți sus/jos + Enter.
- Pe orice pagină în afară de /catalog, bara de sus trimite la /catalog?q=… (căutare în tot magazinul, nu doar în categoria curentă).
- Viteză: indexul are ~1,2 MB (≈340 KB comprimat), se încarcă o singură dată, când vizitatorul dă click în bara de căutare; o căutare durează 0–2 ms.

## Fișiere
- `ffx-search.js` – motorul + sugestiile (sha1 dd491f7b…).
- `build_index.py` – generează `ffx-search-index.json` din API-ul public Tilda (secțiunea „toate” 170600784142, doar în stoc).
- `.github/workflows/index.yml` – rulează generatorul de 3 ori pe zi (04:30, 10:30, 16:30 UTC) și face commit doar dacă s-a schimbat ceva.
- `../pagina-magazin-noua/ffx-home-magazin-v2.html` – blocul /catalog folosește motorul (rezervă: căutarea Tilda filters[query]). Script sha1 8e8c4175b6bf…. Backup-uri: `.bak-cautare-api` (fix-ul din 12 nov), `.bak-inaintedecautare-api` (= live acum, 6dba95d2…).

## Găzduire (de făcut de ION)
Indexul și scriptul trebuie servite public. Propunere: repo GitHub **public** `FastFixExpert/fastfix-search` cu GitHub Pages pornit
(Settings → Pages → Deploy from branch → main / root). Adrese folosite în cod:
- https://fastfixexpert.github.io/fastfix-search/ffx-search.js
- https://fastfixexpert.github.io/fastfix-search/ffx-search-index.json
Conține doar date deja publice pe site (titlu, SKU, preț, poză, link), fără chei.

## Publicare în Tilda (după OK ION)
1. /catalog (pagina 362821403), record 5560232403 ← codul nou din ffx-home-magazin-v2.html, Publish.
2. Setări site → Mai mult → „HTML-код для вставки внутрь head”:
   `<script src="https://fastfixexpert.github.io/fastfix-search/ffx-search.js" data-index="https://fastfixexpert.github.io/fastfix-search/ffx-search-index.json" defer></script>`
   apoi republicarea tuturor paginilor (Tilda o cere pentru codul din head).
Revenire: șterg linia din head + pun înapoi codul din `.bak-inaintedecautare-api` pe 5560232403, republic.

## Testat (15 nov, Chrome, copie a paginii live /catalog în iframe, index construit din API-ul live)
lenvo 316 (corectat lenovo) · леново 316 · lenovo thinkpad 33 · rtx406 1 · placa video 78 · видеокарта 78 · monitr dell 43 · casti 389 · наушники 389 ·
ssd 1tb 42 · procesor ryzen 7 8 · UL-233008 1 · 233008 1 · дутщмщ → lenovo · блок питания 262 · mouse logitec 82 · ноутбук асус 94 · macbook air 39 ·
pc gaming rtx 3060 2 · monitor 27 144hz 8 · casti wireless 27. Sugestii: „наушн”, „видеок”, „UL-2330”, „lenovo thinkpad” (captura sugestii-proba.jpg).
Nu găsește: „iphone” (nu sunt telefoane în magazin).

## Stare live (2026-11-15)
- Repo public https://github.com/FastFixExpert/fastfix-search (Pages din main/root). Index generat de Actions: 4.068 produse. Commit-uri: a8ba9c1 (cod), cfd1ec4 (index), 4dae92f (bloc Tilda), 8f52659 + 682ff11 (sugestii pe telefon, font).
- /catalog: record 5560232403 = tilda/ffx-home-magazin-v2.html (sha1 50f5f799…), salvat și publicat ~15:35 UTC, verificat live: „lenvo” → 316 (corectat), „UL-233008” → 1, sugestii „видеок”.
- Head-ul site-ului (Setări → Вставка кода → HEAD) = linia cu ffx-search.js (era gol înainte).
- Republicate prin API (comm pagepublish) cele 43 de pagini din sitemap + 363484403 /ffx-produs-header + 363484703 /ffx-produs-footer. Toate cele 44 de URL-uri din sitemap conțin scriptul.
- Verificat live: /laptopuri (sugestii „монитор делл”, bara trimite la /catalog), /remontpk pe 390 px în meniul lateral (captura sugestii-telefon.png).
- Revenire: golesc HEAD în setări + republic paginile; pe 5560232403 pun .bak-inaintedecautare-api și public /catalog.

## 2026-11-15 ~16:20 UTC – filtre pe categorii + sortare (la cererea ION)
- Pagina de rezultate are butoane de categorie (max 12 + „Altele”, cu numărul de produse) și sortare: Cele mai potrivite / Preț crescător / Preț descrescător / Cu reducere. RU tradus. Pe telefon butoanele se derulează orizontal, sortarea pe toată lățimea.
- Categoria produsului: tipul din titlu (primele 2 cuvinte) → caracteristica „Tip” → „Categorie” → textul „Tip”. Indexul are acum și coloana tip (r[10]).
- Bloc /catalog sha1 b3302bf3… (repo ab96f2a), publicat și verificat live; ffx-search.js repo e91a9e2.

## 2026-11-15 ~16:30 UTC – filtre pe parametri + pagini (la cererea ION)
- Rezultate: preț de la/până la, butoane de parametri (cei care apar în rezultatele curente: Brand, Stare, Procesor, Memorie RAM, Stocare, Placă video, Diagonală, Rezoluție, Frecvență ecran…, max 8) cu liste de bife și numărul de produse, „Resetează filtrele”.
- Pagini 1/2/3 (30 produse pe pagină), numărul de pagini după rezultatele filtrate; titlul arată „pagina X/Y”.
- Indexul: r[11] = caracteristici {titlu: valoare} (fără Tip/Categorie), brand din „Producător” sau din lista de branduri a filtrului Tilda găsită în titlu (4.031/4.068 au brand).
- Bloc /catalog sha1 89cb35d5… (repo 54058d2), publicat, verificat live RO/RU.

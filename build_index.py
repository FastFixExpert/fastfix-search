"""Generează ffx-search-index.json pentru căutarea inteligentă de pe fastfix.md.

Citește API-ul public al magazinului Tilda (toate produsele din secțiunea „toate”),
păstrează doar produsele în stoc și scrie un index compact:
  {"v":1,"n":<nr>,"p":[[uid,titlu,sku,pret,pret_vechi,poza,url,eticheta,brand,extra,tip,{caracteristica:valoare}], ...]}
Rulare: python build_index.py [fișier_ieșire]
"""
import json, sys, time, urllib.request, urllib.parse

PART = "170600784142"      # secțiunea „toate produsele”
REC = "5513308803"         # blocul catalog de pe /catalog
API = "https://store.tildaapi.one/api/getproductslist/"
CDN = "https://static.tildacdn.com/"
SITE = "https://fastfix.md"
BRAND_KEYS = {"producător", "producator", "бренд", "brand", "производитель"}
EXTRA_KEYS = {"tip", "тип", "categorie", "категория"}


def page(n, size=500):
    q = urllib.parse.urlencode({"storepartuid": PART, "recid": REC, "getoptions": "false",
                                "slice": n, "size": size, "c": int(time.time())})
    req = urllib.request.Request(API + "?" + q, headers={"User-Agent": "ffx-search-index/1",
                                                          "Referer": SITE + "/catalog"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            if i == 3:
                raise
            time.sleep(5 * (i + 1))


BRANDS = []                # lista de branduri din filtrul „Brand” al catalogului (pentru produsele fără „Producător”)
SKIP_CH = {"tip", "categorie", "тип", "категория"}


def brands():
    q = urllib.parse.urlencode({"storepartuid": PART, "recid": REC})
    try:
        with urllib.request.urlopen(urllib.request.Request(API.replace("getproductslist", "getfilters") + "?" + q,
                                    headers={"User-Agent": "ffx-search-index/1", "Referer": SITE + "/catalog"}), timeout=60) as r:
            f = json.load(r)
        for x in f.get("filters") or []:
            if x.get("name") == "brand":
                return sorted({v["value"] for v in x.get("values") or [] if len(v.get("value", "")) > 1}, key=len, reverse=True)
    except Exception:
        pass
    return []


def brand_in_title(t):
    low = " " + t.lower() + " "
    for b in BRANDS:
        i = low.find(b.lower())
        if i > -1 and not low[i - 1].isalnum() and not low[i + len(b)].isalnum():
            return b
    return ""


def row(p):
    try:
        g = json.loads(p.get("gallery") or "[]")
    except ValueError:
        g = []
    img = g[0]["img"] if g and g[0].get("img") else ""
    if img.startswith(CDN):
        img = "~" + img[len(CDN):]
    url = p.get("url") or ""
    if url.startswith(SITE):
        url = url[len(SITE):]
    brand, extra, tip = "", [], ""
    ch = {}
    for c in p.get("characteristics") or []:
        k = (c.get("title") or "").strip().lower()
        v = (c.get("value") or "").strip()
        if not v:
            continue
        if k not in SKIP_CH and v != "-" and len(ch) < 12:
            ch[(c.get("title") or "").strip()[:30]] = v[:40]
        if k in BRAND_KEYS and not brand:
            brand = v
        elif k in EXTRA_KEYS:
            extra.append(v)
            if k in ("tip", "тип") and not tip:
                tip = v
    num = lambda x: round(float(x)) if x not in (None, "") else 0
    return [str(p["uid"]), p.get("title", "").strip(), p.get("sku") or "", num(p.get("price")),
            num(p.get("priceold")), img, url, (p.get("mark") or "").strip(), brand or brand_in_title(p.get("title", "")), " ".join(extra)[:80], tip[:60], ch]


def main(out):
    BRANDS[:] = brands()
    rows, seen, n, total = [], set(), 1, None
    while True:
        j = page(n)
        prods = j.get("products") or []
        total = int(j.get("total") or 0)
        for p in prods:
            q = p.get("quantity")
            if q not in ("", None) and str(q) == "0":
                continue                      # fără stoc
            if p["uid"] in seen:
                continue
            seen.add(p["uid"])
            rows.append(row(p))
        if not prods or n * 500 >= total:
            break
        n += 1
    if len(rows) < 100:                       # protecție: nu suprascriem indexul cu unul gol
        sys.exit("prea puține produse (%d) – indexul nu se scrie" % len(rows))
    rows.sort(key=lambda r: r[0])           # ordine stabilă -> diferențe mici în git
    line = lambda r: json.dumps(r, ensure_ascii=False, separators=(",", ":"))
    with open(out, "w", encoding="utf-8") as f:      # un produs pe rând, fără dată: commit doar la schimbări reale
        f.write('{"v":1,"n":%d,"p":[\n' % len(rows) + ",\n".join(line(r) for r in rows) + "\n]}\n")
    print("produse în catalog: %d, în index (în stoc): %d" % (total, len(rows)))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "ffx-search-index.json")

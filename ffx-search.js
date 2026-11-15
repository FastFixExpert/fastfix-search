/* FFX smart search v1 — fastfix.md
   Motor de căutare în browser: greșeli de tipar, RO/RU (transliterare + tastatură greșită),
   sinonime (placă video = видеокарта = vga), cuvinte parțiale, SKU, clasament după relevanță.
   Indexul (ffx-search-index.json) e generat zilnic de build_index.py.
   API: FFXSearch.load() -> Promise; FFXSearch.search(q, {limit}) -> {items, total, approx, fixes}
*/
(function () {
  if (window.FFXSearch) return;
  var S = document.currentScript;
  var INDEX_URL = (S && S.getAttribute('data-index')) || window.FFX_SEARCH_INDEX || '';
  var isRU = function () { return /^ru/i.test(document.documentElement.getAttribute('data-ffx-lang') || document.documentElement.lang || '') || /[?&]lang=ru/i.test(location.search); };

  /* ---------- normalizare ---------- */
  var CYR = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'iu','я':'ia','і':'i','ї':'i','є':'e' };
  // tastatură greșită: ce iese pe layout RU când scrii pe tastele EN
  var KB_EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.\x60", KB_RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
  function swapLayout(s) {
    var o = '', i, c, k;
    for (i = 0; i < s.length; i++) {
      c = s[i]; k = KB_RU.indexOf(c);
      if (k > -1) { o += KB_EN[k]; continue; }
      k = KB_EN.indexOf(c);
      o += k > -1 ? KB_RU[k] : c;
    }
    return o;
  }
  function translit(s) { return s.replace(/[а-яёіїє]/g, function (c) { return CYR[c]; }); }
  function base(s) {
    return translit(String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/([a-z])(?=\d)|(\d)(?=[a-z])/g, '$1$2 ')
      .replace(/\s+/g, ' ').trim();
  }
  var compact = function (s) { return base(s).replace(/ /g, ''); };

  /* ---------- sinonime (scrise normalizat: fără diacritice, rusă transliterată) ---------- */
  var SYN = {
    gpu: ['placa video', 'placi video', 'placa grafica', 'video card', 'videocard', 'graphics card', 'vga', 'videokarta', 'videokarty', 'videokart'],
    cpu: ['procesor', 'procesoare', 'processor', 'processory', 'cpu'],
    ram: ['memorie ram', 'memorie operativa', 'memorie', 'ram', 'operativnaia pamiat', 'operativka', 'ozu', 'pamiat'],
    psu: ['sursa de alimentare', 'sursa alimentare', 'surse alimentare', 'sursa', 'surse', 'psu', 'power supply', 'blok pitaniia', 'bloki pitaniia'],
    mb: ['placa de baza', 'placi de baza', 'placa baza', 'motherboard', 'mainboard', 'materinskaia plata', 'materinskie platy', 'materinka'],
    cas: ['carcasa', 'carcase', 'korpus', 'korpusa', 'pc case'],
    fan: ['cooler', 'coolere', 'racire', 'ventilator', 'ventilatoare', 'kuler', 'kulery', 'ventiliator', 'ohlazhdenie', 'fan'],
    ssd: ['ssd', 'nvme', 'solid state'],
    hdd: ['hdd', 'hard disk', 'harddisk', 'disc dur', 'zhestkii disk', 'vinchester'],
    mon: ['monitor', 'monitoare', 'monitory', 'display', 'displei', 'ekran'],
    lap: ['laptop', 'laptopuri', 'notebook', 'noutbuk', 'noutbuki', 'notbuk'],
    pc: ['calculator', 'calculatoare', 'computer', 'kompiuter', 'kompiutery', 'sistemnyi blok', 'sistemnik', 'pc', 'desktop'],
    mou: ['mouse', 'mausi', 'mysh', 'myshka', 'myshki'],
    kbd: ['tastatura', 'tastaturi', 'keyboard', 'klaviatura', 'klaviatury'],
    hph: ['casti', 'casca', 'intraaurale', 'circumaurale', 'supra aurale', 'earbuds', 'headset', 'headphones', 'naushniki', 'garnitura'],
    prn: ['imprimanta', 'imprimante', 'printer', 'printery', 'multifunctionala', 'mfu'],
    ups: ['ups', 'neintreruptibila', 'ibp', 'bespereboinik'],
    rtr: ['router', 'routere', 'ruter', 'marshrutizator'],
    tv: ['televizor', 'televizoare', 'televizor', 'tv'],
    cbl: ['cablu', 'cabluri', 'kabel', 'cable', 'shnur'],
    spk: ['boxe', 'difuzoare', 'speakers', 'kolonki', 'akustika'],
    cam: ['camera web', 'webcam', 'web camera', 'vebkamera', 'veb kamera'],
    pad: ['gamepad', 'joystick', 'controller', 'dzhoistik', 'geimpad'],
    mic: ['microfon', 'mikrofon', 'microphone'],
    tpa: ['pasta termoconductoare', 'pasta termica', 'termopasta', 'thermal paste'],
    gam: ['gaming', 'gamer', 'igrovoi', 'igrovye', 'igrovaia', 'pentru jocuri', 'dlia igr'],
    ofc: ['birou', 'office', 'ofisnyi', 'ofisnye', 'dlia ofisa'],
    sh: ['second hand', 'second', 'folosit', 'folosite', 'bu', 'used'],
    nou: ['nou', 'noi', 'noua', 'new', 'novyi', 'novye'],
    rtx: ['rtx', 'rth', 'rtks'], gtx: ['gtx', 'gth', 'gtks'],
    apl: ['apple', 'epl', 'eppl', 'macbook', 'makbuk'],
    xmi: ['xiaomi', 'ksiaomi', 'siaomi', 'ksiomi'],
    wls: ['wireless', 'fara fir', 'bezprovodnoi', 'besprovodnoi', 'besprovodnaia', 'besprovodnye', 'besprovodnyi', 'tws', 'bluetooth']
  };
  var PH = [];                // [variantă, cod] sortate după lungime (cele lungi primele)
  Object.keys(SYN).forEach(function (k) { SYN[k].forEach(function (v) { PH.push([v, k]); }); });
  PH.sort(function (a, b) { return b[0].length - a[0].length; });
  var SYNV = PH.filter(function (p) { return p[0].indexOf(' ') < 0; });   // variante dintr-un cuvânt, pentru prefix/greșeli
  // înlocuiește frazele cu codul sinonimului: "placa video rtx" -> ["§gpu","§rtx"] + restul
  function synTokens(txt) {
    var s = ' ' + txt + ' ', out = [];
    PH.forEach(function (p) {
      var v = ' ' + p[0] + ' ', i = s.indexOf(v);
      if (i > -1) { out.push({ c: '§' + p[1], pos: s.slice(0, i).split(' ').length - 1 }); s = s.split(v).join(' ~ '); }
    });
    return { syn: out, rest: s.replace(/~/g, ' ').replace(/\s+/g, ' ').trim() };
  }

  /* ---------- distanță Damerau-Levenshtein cu prag ---------- */
  function dist(a, b, max) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j, c, best;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur = [i]; best = i;
      for (j = 1; j <= lb; j++) {
        c = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[lb];
  }

  /* ---------- index ---------- */
  var P = [], INV = {}, VOCAB = [], loading = null;
  var CDN = 'https://static.tildacdn.com/';
  function add(tok, id, w) {
    var m = INV[tok] || (INV[tok] = {});
    if (!m[id] || m[id] < w) m[id] = w;
  }
  function build(data) {
    P = []; INV = {};
    (data.p || []).forEach(function (r, id) {
      var p = { uid: r[0], t: r[1], sku: r[2] || '', p: r[3] || 0, o: r[4] || 0, img: r[5] ? (r[5].charAt(0) === '~' ? CDN + r[5].slice(1) : r[5]) : '', u: r[6] && r[6].charAt(0) === '/' ? location.origin + r[6] : r[6], m: r[7] || '', b: r[8] || '', x: r[9] || '' };
      P.push(p);
      var n = base(p.t), st = synTokens(n);
      n.split(' ').forEach(function (tk, i) { if (tk) add(tk, id, i < 3 ? 3 : 2); });
      st.syn.forEach(function (s) { add(s.c, id, s.pos < 3 ? 3 : 1); });
      if (p.b) base(p.b).split(' ').forEach(function (tk) { if (tk) add(tk, id, 2); });
      if (p.x) {
        var nx = base(p.x);
        nx.split(' ').forEach(function (tk) { if (tk) add(tk, id, 1); });
        synTokens(nx).syn.forEach(function (s) { add(s.c, id, 1); });
      }
      p.k = compact(p.sku);
      base(p.sku).split(' ').forEach(function (tk) { if (tk) add(tk, id, 2); });
      if (/^(nou|new)/i.test(p.m)) add('§nou', id, 2); else if (p.m) add('§sh', id, 2);
    });
    VOCAB = Object.keys(INV).filter(function (k) { return k.charAt(0) !== '§'; }).sort();
  }
  function prefixed(q) {          // tokenii din vocabular care încep cu q
    var lo = 0, hi = VOCAB.length, out = [];
    while (lo < hi) { var mid = (lo + hi) >> 1; if (VOCAB[mid] < q) lo = mid + 1; else hi = mid; }
    for (var i = lo; i < VOCAB.length && VOCAB[i].lastIndexOf(q, 0) === 0 && out.length < 200; i++) out.push(VOCAB[i]);
    return out;
  }
  function fuzzy(q) {             // tokeni apropiați (greșeli de tipar), doar pentru cuvinte cu litere
    if (q.length < 4 || /\d/.test(q)) return [];
    var max = q.length >= 7 ? 2 : 1, out = [];
    for (var i = 0; i < VOCAB.length; i++) {
      var v = VOCAB[i];
      if (/\d/.test(v) || Math.abs(v.length - q.length) > max) continue;
      if (v[0] !== q[0] && v[1] !== q[1]) continue;
      var d = dist(q, v, max);
      if (d <= max) out.push([v, d]);
    }
    return out;
  }

  /* ---------- căutare ---------- */
  // scor pentru un termen din interogare: {id: scor}, plus cel mai bun „corectat”
  function termHits(term, last) {
    var hits = {}, fix = null;
    function put(tok, s) { var m = INV[tok]; if (!m) return; for (var id in m) { var v = s + m[id]; if (!hits[id] || hits[id] < v) hits[id] = v; } }
    if (term.charAt(0) === '§') { put(term, 9); return { hits: hits }; }
    put(term, 10);
    if (term.length >= 2 && (last || term.length >= 3 || /\d/.test(term))) prefixed(term).forEach(function (t) { if (t !== term) put(t, /\d/.test(term) ? 8 : 6); });
    if (term.length >= 3) SYNV.forEach(function (v) { if (v[0] !== term && v[0].lastIndexOf(term, 0) === 0) put('§' + v[1], 7); });
    var has = false; for (var k in hits) { has = true; break; }
    if (!has && term.length >= 4 && !/\d/.test(term)) SYNV.forEach(function (v) { var mx = term.length >= 7 ? 2 : 1; if (dist(term, v[0], mx) <= mx) { put('§' + v[1], 6); has = true; } });
    if (!has) {
      var f = fuzzy(term).sort(function (a, b) { return a[1] - b[1] || (Object.keys(INV[b[0]]).length - Object.keys(INV[a[0]]).length); });
      f.forEach(function (x) { put(x[0], x[1] === 1 ? 5 : 3); });
      if (f.length) fix = f[0][0];
    }
    return { hits: hits, fix: fix };
  }
  function run(q, limit) {
    var n = base(q), st = synTokens(n);
    var terms = st.syn.map(function (s) { return s.c; }).concat(st.rest ? st.rest.split(' ') : []);
    terms = terms.filter(function (t, i) { return t && terms.indexOf(t) === i && (t.length > 1 || /\d/.test(t)); });
    if (!terms.length) return { items: [], total: 0, fixes: {} };
    var kq = compact(q), sku = {};
    if (kq.length >= 4 && /\d/.test(kq)) P.forEach(function (p, id) { if (!p.k) return; if (p.k === kq) sku[id] = 200; else if (p.k.indexOf(kq) > -1) sku[id] = 60; });
    var lastRaw = st.rest.split(' ').pop();
    var H = [], fixes = {};
    terms.forEach(function (t) { var r = termHits(t, t === lastRaw); H.push(r.hits); if (r.fix) fixes[t] = r.fix; });
    var score = {}, cnt = {}, real = {};
    H.forEach(function (h, i) { var syn = terms[i].charAt(0) === '§'; for (var id in h) { score[id] = (score[id] || 0) + h[id]; cnt[id] = (cnt[id] || 0) + 1; if (!syn) real[id] = (real[id] || 0) + 1; } });
    var need = terms.length, ids = Object.keys(score).filter(function (id) { return cnt[id] === need; }), approx = false;
    if (!ids.length && need > 1) {
      var min = Math.max(1, need - 1);
      ids = Object.keys(score).filter(function (id) { return cnt[id] >= min; }); approx = ids.length > 0;
    }
    Object.keys(sku).forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); score[id] = (score[id] || 0) + sku[id]; });
    ids.sort(function (a, b) { return (approx ? (real[b] || 0) - (real[a] || 0) : 0) || score[b] - score[a] || (!!P[b].img - !!P[a].img) || P[b].p - P[a].p; });
    return { items: ids.slice(0, limit || 100).map(function (id) { return P[id]; }), total: ids.length, approx: approx, fixes: fixes };
  }
  function search(q, o) {
    q = String(q || '').trim(); o = o || {};
    if (!q) return { items: [], total: 0, fixes: {} };
    var r = run(q, o.limit);
    if (!r.total && /[a-z;'\[\],.\x60]/i.test(q) !== /[а-яё]/i.test(q)) {     // tastatură greșită
      var r2 = run(swapLayout(q.toLowerCase()), o.limit);
      if (r2.total) { r2.layout = swapLayout(q.toLowerCase()); return r2; }
    }
    return r;
  }

  /* ---------- încărcare ---------- */
  function load() {
    if (loading) return loading;
    if (window.FFX_SEARCH_DATA) { build(window.FFX_SEARCH_DATA); return (loading = Promise.resolve(true)); }
    if (!INDEX_URL) return Promise.resolve(false);
    loading = fetch(INDEX_URL).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { build(d); return true; })
      .catch(function () { loading = null; return false; });
    return loading;
  }

  /* ---------- sugestii sub câmpul de căutare din header ---------- */
  var TXT = { ru: { all: 'Все результаты', nf: 'Ничего не найдено', lei: 'лей' }, ro: { all: 'Toate rezultatele', nf: 'Nu am găsit produse', lei: 'lei' } };
  var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var TH = function (u, w) { var m = /^https:\/\/static\.tildacdn\.(\w+)\/([^\/]+)\/([^\/]+)$/.exec(u || ''); return m ? 'https://thb.tildacdn.' + m[1] + '/' + m[2] + '/-/resize/' + w + 'x/' + m[3] : u; };
  function css() {
    if (document.getElementById('ffxs-css')) return;
    var st = document.createElement('style'); st.id = 'ffxs-css';
    st.textContent = '.ffxs{position:fixed;z-index:100000;background:#fff;border:1px solid #ddd;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.14);font-family:inherit;font-size:14px;line-height:1.3;color:#111;max-height:70vh;overflow-y:auto}' +
      '.ffxs a{display:flex;gap:10px;align-items:center;padding:8px 12px;color:#111!important;text-decoration:none!important}.ffxs a:hover,.ffxs a.on{background:#f4f4f4}' +
      '.ffxs img{width:44px;height:44px;object-fit:contain;flex:none;border-radius:6px;background:#fff}.ffxs span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
      '.ffxs b{white-space:nowrap;font-weight:700}.ffxs .ffxs__all{justify-content:center;font-weight:700;border-top:1px solid #eee;color:#E5352B!important}.ffxs .ffxs__nf{padding:12px;color:#666}';
    document.head.appendChild(st);
  }
  function attach(inp) {
    if (inp.__ffxs) return; inp.__ffxs = 1;
    var box = document.createElement('div'), sel = -1, tm, form = inp.form;
    box.className = 'ffxs'; box.hidden = true; document.body.appendChild(box);
    function place() { var r = (form || inp).getBoundingClientRect(), iw = document.documentElement.clientWidth || innerWidth, w = Math.min(Math.max(r.width, 340), 440, iw - 16); box.style.width = w + 'px'; box.style.fontFamily = getComputedStyle(inp).fontFamily; box.style.left = Math.max(8, Math.min(r.left, iw - w - 8)) + 'px'; box.style.top = (r.bottom + 6) + 'px'; box.style.maxHeight = Math.max(200, innerHeight - r.bottom - 16) + 'px'; }
    function show() {
      var q = inp.value.trim(); sel = -1;
      if (q.length < 2) { box.hidden = true; return; }
      load().then(function (ok) {
        if (!ok || inp.value.trim() !== q) { if (!ok) box.hidden = true; return; }
        var RU = isRU(), TX = RU ? TXT.ru : TXT.ro, r = search(q, { limit: 6 }), url = '/catalog?q=' + encodeURIComponent(q) + (RU ? '&lang=ru' : '');
        box.innerHTML = r.items.length ? r.items.map(function (p) { return '<a href="' + esc(p.u) + '"><img src="' + esc(TH(p.img, 100)) + '" alt="" loading="lazy"><span>' + esc(p.t) + '</span><b>' + fmt(p.p) + ' ' + TX.lei + '</b></a>'; }).join('') +
          '<a class="ffxs__all" href="' + url + '">' + TX.all + ' (' + r.total + ') →</a>' : '<div class="ffxs__nf">' + TX.nf + '</div>';
        box.hidden = false; place();
      });
    }
    inp.addEventListener('focus', function () { load(); if (inp.value.trim().length > 1) show(); });
    inp.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(show, 120); });
    inp.addEventListener('keydown', function (e) {
      var a = box.querySelectorAll('a'); if (box.hidden || !a.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length; a.forEach(function (x, i) { x.classList.toggle('on', i === sel); }); }
      else if (e.key === 'Enter' && sel > -1) { e.preventDefault(); location.href = a[sel].href; }
      else if (e.key === 'Escape') box.hidden = true;
    });
    document.addEventListener('click', function (e) { if (e.target !== inp && !box.contains(e.target)) box.hidden = true; });
    addEventListener('resize', function () { if (!box.hidden) place(); });
    addEventListener('scroll', function () { if (!box.hidden) place(); }, { passive: true });
  }
  function scan() { css(); document.querySelectorAll('form.ffx-search input[name=q]').forEach(attach); }

  window.FFXSearch = { load: load, search: search, base: base, _build: build };
  // în afara /catalog, bara de sus caută mereu în tot magazinul (nu doar în categoria curentă)
  function global() { if (!/^\/catalog\/?$/.test(location.pathname)) window.ffxStoreSearch = function () { return false; }; }
  if (document.readyState !== 'loading') global(); else document.addEventListener('DOMContentLoaded', global);
  if (document.readyState !== 'loading') scan(); else document.addEventListener('DOMContentLoaded', scan);
  setTimeout(scan, 1500);
})();

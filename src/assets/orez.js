/* Ladění ořezu fotek přímo na webu (11/2026) – úvodní slider i fotky v záhlaví všech podstran.
   Zapíná se jen adresou s ?orez (např. /?orez, /pravidla/?orez), návštěvníci ho neuvidí.
   V režimu ladění se ?orez drží i při přechodu na další záložky, nastavení všech stránek se sbírá
   v tomto prohlížeči a „Zkopírovat nastavení“ dá jeden text pro Clauda se všemi změnami. */
(function () {
  var hero = document.querySelector(".hero");
  var zahlavi = !hero && document.querySelector(".podstrana-zahlavi.s-fotkou");
  var oblast = hero || zahlavi;
  if (!oblast) return;
  var KLIC = "hb-orez-na-webu-v2";
  var kod = ((document.body.className.match(/\bstr-([\w-]+)/) || [])[1]) || "uvod";
  if (hero) kod = "uvod";
  var jeEn = document.documentElement.lang === "en";

  /* cíle: na úvodu snímky slideru, na podstraně jedna fotka v záhlaví */
  var cile = hero
    ? Array.prototype.slice.call(hero.querySelectorAll(".snimek")).map(function (f) { return { nosic: f, img: f.querySelector("img") }; })
    : [{ nosic: zahlavi, img: zahlavi.querySelector(".pz-foto") }];

  function cti(el, prom) {
    var v = (el.style.getPropertyValue(prom) || "").trim();
    var m = v.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
    return m ? [Math.round(+m[1]), Math.round(+m[2])] : null;
  }
  var puvodniFotky = cile.map(function (c) {
    return { pc: cti(c.nosic, "--pozice") || [50, 50], mob: cti(c.nosic, "--pozice-mobil"), zoom: Math.round((parseFloat(c.nosic.style.getPropertyValue("--zoom")) || 1) * 100), soubor: (c.img.getAttribute("src") || "").split("/").pop() };
  });
  var PUV_VYSKA = { uvod: { minH: 560, maxH: 860, celaVyska: false, mobPct: 88 }, podstrany: { pc: 560, mob: 380 } };

  var vse;
  try { vse = JSON.parse(localStorage.getItem(KLIC)); } catch (e) {}
  if (!vse || !vse.stranky) vse = { stranky: {}, puvodni: {}, vyska: JSON.parse(JSON.stringify(PUV_VYSKA)) };
  vse.puvodni[kod] = puvodniFotky;
  if (!vse.stranky[kod] || vse.stranky[kod].length !== cile.length) vse.stranky[kod] = JSON.parse(JSON.stringify(puvodniFotky));
  vse.nazvy = vse.nazvy || {};
  vse.nazvy[kod] = (document.querySelector("h1") || {}).textContent ? (hero ? "Úvodní stránka" : document.querySelector(".podstrana-zahlavi h1").textContent.trim()) : kod;
  var fotky = vse.stranky[kod];
  var akt = 0;
  function mobil() { return window.innerWidth <= 760; }
  function uloz() { try { localStorage.setItem(KLIC, JSON.stringify(vse)); } catch (e) {} }
  uloz();

  /* ---------- styl ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".hero-orez .snimek img,.hero-orez .pz-foto{animation:none!important;transform:scale(var(--zoom,1))!important;transition:none!important}" +
    ".hero-orez{cursor:grab;touch-action:none}.hero-orez.tahne{cursor:grabbing}" +
    ".hero-orez .hero-text,.hero-orez .hero-ovladani,.hero-orez .pz-text{pointer-events:none}" +
    ".hero-orez .snimek{transition:none}" +
    "#orez-panel{position:fixed;right:16px;bottom:16px;z-index:9999;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#222;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 Lato,system-ui,sans-serif;padding:14px 16px}" +
    "#orez-panel h4{margin:0 0 6px;font-size:16px;color:#6E2B2D;display:flex;justify-content:space-between;align-items:center;gap:8px}" +
    "#orez-panel .r{margin:8px 0}#orez-panel label{font-weight:700}" +
    "#orez-panel input[type=range]{width:100%;accent-color:#6E2B2D}" +
    "#orez-panel .fotky{display:flex;gap:6px}#orez-panel .fotky button{flex:1;padding:6px 0;border:2px solid #ddd;border-radius:8px;background:#fff;font-weight:700;cursor:pointer}" +
    "#orez-panel .fotky button.a{border-color:#6E2B2D;background:#6E2B2D;color:#fff}" +
    "#orez-panel .fotky button.z::after{content:' •';color:#EEB500}" +
    "#orez-panel .tl{border:0;border-radius:999px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer;background:#eee;color:#222}" +
    "#orez-panel .tl.h{background:#6E2B2D;color:#fff}" +
    "#orez-panel .sede{color:#6b625e;font-size:12.5px}" +
    "#orez-panel .rezim{display:inline-block;padding:1px 8px;border-radius:999px;background:#5D613B;color:#fff;font-size:12px}" +
    "#orez-panel.mini>*:not(h4){display:none}#orez-panel.mini{width:auto}" +
    "#orez-panel hr{border:0;border-top:1px solid #eee;margin:10px 0}" +
    "#orez-panel ul{margin:4px 0 0;padding-left:18px}#orez-panel li{margin:1px 0}" +
    "@media (max-width:760px){#orez-panel{left:8px;right:8px;bottom:8px;width:auto;max-height:40vh;font-size:13px;padding:10px 12px}#orez-panel .r{margin:5px 0}}";
  document.head.appendChild(css);
  oblast.classList.add("hero-orez");

  /* ---------- panel ---------- */
  var p = document.createElement("div");
  p.id = "orez-panel";
  p.innerHTML =
    '<h4><span>Ořez fotek · <span data-v="nazev"></span></span><button class="tl" data-a="mini" title="Zmenšit / zvětšit panel">–</button></h4>' +
    '<div class="sede">Táhněte myší po fotce. Šipky = jemný posun (Shift = po 5). Na další stránky přejděte normálně menu, ladění zůstane zapnuté.</div>' +
    (hero ? '<div class="r fotky"></div>' : "") +
    '<div class="r">Upravujete ořez pro: <span class="rezim" data-v="rezim"></span> <span class="sede" data-v="sirka"></span></div>' +
    '<div class="r sede" data-v="mobInfo"></div>' +
    '<div class="r">Pozice: <b data-v="pozice"></b></div>' +
    '<div class="r"><label>Přiblížení <span data-v="zoomH"></span></label><input type="range" min="100" max="200" step="1" data-i="zoom"></div>' +
    '<div class="r" data-v="mobVlastni"><label><input type="checkbox" data-i="vlastniMob"> vlastní ořez pro mobil</label></div>' +
    '<hr>' +
    (hero
      ? '<div class="sede">Výška pásu s fotkami na úvodu (pro všechny 4 fotky):</div>' +
        '<div data-v="pcVyska"><div class="r"><label>Nejméně <span data-v="minHH"></span></label><input type="range" min="400" max="1100" step="10" data-i="minH"></div>' +
        '<div class="r"><label>Nejvíc <span data-v="maxHH"></span></label><input type="range" min="500" max="1300" step="10" data-i="maxH"></div>' +
        '<div class="r"><label><input type="checkbox" data-i="celaVyska"> vždy celá výška okna</label></div></div>' +
        '<div class="r" data-v="mobVyska"><label>Na mobilu <span data-v="mobPctH"></span> výšky obrazovky</label><input type="range" min="60" max="100" step="1" data-i="mobPct"></div>'
      : '<div class="sede">Výška záhlaví s fotkou (stejná pro všechny podstrany):</div>' +
        '<div class="r" data-v="pcVyska"><label>Počítač – nejméně <span data-v="pzPcH"></span></label><input type="range" min="300" max="900" step="10" data-i="pzPc"></div>' +
        '<div class="r" data-v="mobVyska"><label>Mobil – nejméně <span data-v="pzMobH"></span></label><input type="range" min="300" max="800" step="10" data-i="pzMob"></div>') +
    '<hr><div class="r" style="display:flex;gap:6px;flex-wrap:wrap">' +
    '<button class="tl h" data-a="kopie">Zkopírovat nastavení</button>' +
    '<button class="tl" data-a="vratit">Vrátit fotku</button><button class="tl" data-a="vratitVse">Vrátit vše</button></div>' +
    '<div class="sede" data-v="info">Pro mobil zužte okno prohlížeče pod 760 px (nebo F12 → ikona mobilu).</div>' +
    '<div class="r sede" data-v="souhrn"></div>';
  document.body.appendChild(p);
  var $ = function (s) { return p.querySelector(s); };
  $('[data-v="nazev"]').textContent = vse.nazvy[kod];

  var fotkyEl = $(".fotky");
  if (fotkyEl) cile.forEach(function (_, i) {
    var b = document.createElement("button");
    b.textContent = i + 1;
    b.onclick = function () { vyber(i); };
    fotkyEl.appendChild(b);
  });

  function vyber(i) {
    akt = i;
    if (hero) {
      if (window.HB_heroUkaz) window.HB_heroUkaz(i, false);
      else cile.forEach(function (c, j) { c.nosic.classList.toggle("aktivni", j === i); });
    }
    obnov();
  }
  if (hero) new MutationObserver(function () {
    var i = cile.findIndex(function (c) { return c.nosic.classList.contains("aktivni"); });
    if (i >= 0 && i !== akt) { akt = i; obnov(); }
  }).observe(hero.querySelector(".hero-snimky"), { subtree: true, attributes: true, attributeFilter: ["class"] });

  function zmenenaF(f, o) { return f.pc[0] !== o.pc[0] || f.pc[1] !== o.pc[1] || f.zoom !== o.zoom || JSON.stringify(f.mob) !== JSON.stringify(o.mob); }
  function zmenena(i) { return zmenenaF(fotky[i], puvodniFotky[i]); }
  function aktivniPozice(f) { return mobil() && f.mob ? f.mob : f.pc; }

  function pouzij() {
    cile.forEach(function (c, i) {
      var f = fotky[i];
      c.nosic.style.setProperty("--pozice", f.pc[0] + "% " + f.pc[1] + "%");
      if (f.mob) c.nosic.style.setProperty("--pozice-mobil", f.mob[0] + "% " + f.mob[1] + "%"); else c.nosic.style.removeProperty("--pozice-mobil");
      c.nosic.style.setProperty("--zoom", f.zoom / 100);
    });
    var v = vse.vyska;
    if (hero) {
      if (mobil()) { hero.style.minHeight = "520px"; hero.style.height = v.uvod.mobPct + "svh"; }
      else {
        hero.style.minHeight = v.uvod.minH + "px";
        hero.style.height = v.uvod.celaVyska ? "calc(100svh - var(--hlavicka))" : "min(calc(100svh - var(--hlavicka)), " + v.uvod.maxH + "px)";
      }
    } else {
      zahlavi.style.setProperty("--pz-vyska", v.podstrany.pc + "px");
      zahlavi.style.setProperty("--pz-vyska-mobil", v.podstrany.mob + "px");
    }
  }

  function obnov() {
    pouzij();
    var f = fotky[akt], m = mobil(), poz = aktivniPozice(f), v = vse.vyska;
    if (fotkyEl) fotkyEl.querySelectorAll("button").forEach(function (b, i) { b.className = (i === akt ? "a " : "") + (zmenena(i) ? "z" : ""); });
    $('[data-v="rezim"]').textContent = m ? "mobil" : "počítač";
    $('[data-v="sirka"]').textContent = "okno " + window.innerWidth + " × " + window.innerHeight + ", fotka " + oblast.clientWidth + " × " + oblast.clientHeight + " px";
    $('[data-v="mobInfo"]').textContent = m ? (f.mob ? "Fotka má vlastní ořez pro mobil." : "Mobil zatím používá ořez z počítače – posunutím vznikne vlastní.") : "";
    $('[data-v="pozice"]').textContent = poz[0] + " % zleva, " + poz[1] + " % shora";
    $('[data-i="zoom"]').value = f.zoom; $('[data-v="zoomH"]').textContent = f.zoom + " %";
    $('[data-v="mobVlastni"]').style.display = m ? "" : "none";
    $('[data-i="vlastniMob"]').checked = !!f.mob;
    $('[data-v="pcVyska"]').style.display = m ? "none" : "";
    $('[data-v="mobVyska"]').style.display = m ? "" : "none";
    if (hero) {
      $('[data-i="minH"]').value = v.uvod.minH; $('[data-v="minHH"]').textContent = v.uvod.minH + " px";
      $('[data-i="maxH"]').value = v.uvod.maxH; $('[data-v="maxHH"]').textContent = v.uvod.celaVyska ? "—" : v.uvod.maxH + " px";
      $('[data-i="maxH"]').disabled = v.uvod.celaVyska;
      $('[data-i="celaVyska"]').checked = v.uvod.celaVyska;
      $('[data-i="mobPct"]').value = v.uvod.mobPct; $('[data-v="mobPctH"]').textContent = v.uvod.mobPct + " %";
    } else {
      $('[data-i="pzPc"]').value = v.podstrany.pc; $('[data-v="pzPcH"]').textContent = v.podstrany.pc + " px";
      $('[data-i="pzMob"]').value = v.podstrany.mob; $('[data-v="pzMobH"]').textContent = v.podstrany.mob + " px";
    }
    var zm = seznamZmen();
    $('[data-v="souhrn"]').innerHTML = zm.length ? "<b>Upraveno zatím:</b><ul>" + zm.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" : "Zatím nic upraveno.";
  }

  function seznamZmen() {
    var t = [];
    Object.keys(vse.stranky).forEach(function (k) {
      var pu = vse.puvodni[k]; if (!pu) return;
      var n = vse.stranky[k].filter(function (f, i) { return zmenenaF(f, pu[i]); }).length;
      if (n) t.push(vse.nazvy[k] + (pu.length > 1 ? " (" + n + " z " + pu.length + " fotek)" : ""));
    });
    var v = vse.vyska;
    if (JSON.stringify(v.uvod) !== JSON.stringify(PUV_VYSKA.uvod)) t.push("výška úvodu");
    if (JSON.stringify(v.podstrany) !== JSON.stringify(PUV_VYSKA.podstrany)) t.push("výška záhlaví podstran");
    return t;
  }

  /* ---------- ovládání ---------- */
  p.addEventListener("input", function (e) {
    var k = e.target.dataset.i; if (!k) return;
    var f = fotky[akt], u = vse.vyska.uvod, ps = vse.vyska.podstrany, h = +e.target.value;
    if (k === "zoom") f.zoom = h;
    else if (k === "minH") { u.minH = h; if (u.maxH < h) u.maxH = h; }
    else if (k === "maxH") { u.maxH = h; if (u.minH > h) u.minH = h; }
    else if (k === "mobPct") u.mobPct = h;
    else if (k === "celaVyska") u.celaVyska = e.target.checked;
    else if (k === "pzPc") ps.pc = h;
    else if (k === "pzMob") ps.mob = h;
    else if (k === "vlastniMob") f.mob = e.target.checked ? f.pc.slice() : null;
    uloz(); obnov();
  });
  p.addEventListener("click", function (e) {
    var a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === "mini") { p.classList.toggle("mini"); e.target.textContent = p.classList.contains("mini") ? "+" : "–"; }
    if (a === "vratit") { fotky[akt] = JSON.parse(JSON.stringify(puvodniFotky[akt])); uloz(); obnov(); }
    if (a === "vratitVse") {
      if (confirm("Vrátit všechny fotky na všech stránkách i výšky na původní nastavení?")) {
        vse = { stranky: {}, puvodni: {}, nazvy: vse.nazvy, vyska: JSON.parse(JSON.stringify(PUV_VYSKA)) };
        vse.puvodni[kod] = puvodniFotky; vse.stranky[kod] = JSON.parse(JSON.stringify(puvodniFotky)); fotky = vse.stranky[kod];
        uloz(); obnov();
      }
    }
    if (a === "kopie") {
      var t = vystup(), info = $('[data-v="info"]');
      var ok = function () { info.textContent = "Zkopírováno – vložte to Claudovi do chatu."; };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, function () { rucne(t); ok(); });
      else { rucne(t); ok(); }
    }
  });
  function rucne(t) {
    var a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select();
    try { document.execCommand("copy"); } catch (e) {}
    a.remove();
  }

  /* odkazy na webu drží ?orez, v oblasti fotky se neklikají */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a"); if (!a) return;
    if (oblast.contains(a)) { e.preventDefault(); return; }
    if (a.origin === location.origin && !/[?&]orez\b/.test(a.search) && !/\.(pdf|gpx|jpg|png|zip)$/i.test(a.pathname)) {
      e.preventDefault();
      location.href = a.pathname + (a.search ? a.search + "&orez" : "?orez") + a.hash;
    }
  }, true);

  /* tažení: fotka jede s myší */
  var start = null;
  oblast.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var f = fotky[akt], m = mobil();
    if (m && !f.mob) f.mob = f.pc.slice();
    var img = cile[akt].img, W = oblast.clientWidth, H = oblast.clientHeight;
    var iw = img.naturalWidth || 3, ih = img.naturalHeight || 2, s = Math.max(W / iw, H / ih) * f.zoom / 100;
    start = { x: e.clientX, y: e.clientY, p: (m ? f.mob : f.pc).slice(), m: m, ox: iw * s - W, oy: ih * s - H };
    oblast.setPointerCapture(e.pointerId); oblast.classList.add("tahne"); e.preventDefault();
  });
  oblast.addEventListener("pointermove", function (e) {
    if (!start) return;
    var f = fotky[akt], c = start.m ? f.mob : f.pc;
    if (start.ox > 1) c[0] = omez(start.p[0] - (e.clientX - start.x) / start.ox * 100);
    if (start.oy > 1) c[1] = omez(start.p[1] - (e.clientY - start.y) / start.oy * 100);
    obnov();
  });
  function konec() { if (start) { start = null; oblast.classList.remove("tahne"); uloz(); obnov(); } }
  oblast.addEventListener("pointerup", konec);
  oblast.addEventListener("pointercancel", konec);

  document.addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
    var f = fotky[akt];
    if (mobil() && !f.mob) f.mob = f.pc.slice();
    var c = mobil() ? f.mob : f.pc, k = e.shiftKey ? 5 : 1;
    c[0] = omez(c[0] + d[0] * k); c[1] = omez(c[1] + d[1] * k);
    e.preventDefault(); uloz(); obnov();
  });
  function omez(x) { return Math.round(Math.max(0, Math.min(100, x))); }
  window.addEventListener("resize", obnov);

  /* ---------- výstup pro Clauda ---------- */
  function styl(f) {
    return "--pozice: " + f.pc[0] + "% " + f.pc[1] + "%" + (f.mob ? "; --pozice-mobil: " + f.mob[0] + "% " + f.mob[1] + "%" : "") + (f.zoom !== 100 ? "; --zoom: " + f.zoom / 100 : "");
  }
  function vystup() {
    var v = vse.vyska, t = ["OŘEZ FOTEK NA WEBU – nové nastavení (laděno na " + location.host + ", okno " + window.innerWidth + " × " + window.innerHeight + " px)", ""];
    t.push("Výška úvodu – počítač: nejméně " + v.uvod.minH + " px, " + (v.uvod.celaVyska ? "vždy celá výška okna" : "nejvíc " + v.uvod.maxH + " px") + "; mobil " + v.uvod.mobPct + " % obrazovky  (původně 560 / 860 px, 88 %)");
    t.push("Výška záhlaví podstran – počítač nejméně " + v.podstrany.pc + " px, mobil nejméně " + v.podstrany.mob + " px  (původně 560 / 380 px)");
    var nic = true;
    Object.keys(vse.stranky).forEach(function (k) {
      var pu = vse.puvodni[k]; if (!pu) return;
      vse.stranky[k].forEach(function (f, i) {
        if (!zmenenaF(f, pu[i])) return;
        if (nic) { t.push("", "Změněné fotky:"); nic = false; }
        t.push("- " + vse.nazvy[k] + " [" + k + "]" + (pu.length > 1 ? " fotka " + (i + 1) : "") + " (" + pu[i].soubor + "): " + styl(f) + "   (původně " + styl(pu[i]) + ")");
      });
    });
    if (nic) t.push("", "Žádná fotka změněná není.");
    t.push("", "Prošlé stránky: " + Object.keys(vse.stranky).map(function (k) { return vse.nazvy[k]; }).join(", "));
    return t.join("\n");
  }

  vyber(hero ? Math.max(0, cile.findIndex(function (c) { return c.nosic.classList.contains("aktivni"); })) : 0);
})();

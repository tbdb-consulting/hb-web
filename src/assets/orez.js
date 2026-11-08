/* Ladění ořezu úvodních fotek přímo na stránce (11/2026).
   Zapíná se jen adresou s ?orez (např. /?orez nebo /en/?orez), návštěvníci ho neuvidí.
   Fotku posunete myší přímo v úvodním pásu, přiblížení a výšku posuvníky v panelu.
   Nic se nikam neukládá kromě tohoto prohlížeče; výsledné nastavení se zkopíruje a pošle Claudovi. */
(function () {
  var hero = document.querySelector(".hero");
  if (!hero) return;
  var snimky = Array.prototype.slice.call(hero.querySelectorAll(".snimek"));
  var KLIC = "hb-orez-na-webu-v1";
  var cs = getComputedStyle(hero);

  function cti(fig, prom) {
    var v = (fig.style.getPropertyValue(prom) || "").trim();
    if (!v) return null;
    var m = v.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
    return m ? [Math.round(+m[1]), Math.round(+m[2])] : null;
  }
  var puvodni = {
    fotky: snimky.map(function (f) {
      var z = parseFloat(f.style.getPropertyValue("--zoom")) || 1;
      return { pc: cti(f, "--pozice") || [50, 50], mob: cti(f, "--pozice-mobil"), zoom: Math.round(z * 100), soubor: (f.querySelector("img").getAttribute("src") || "").split("/").pop() };
    }),
    minH: parseInt(cs.minHeight, 10) || 560, maxH: 860, celaVyska: false, mobPct: 88
  };
  if (window.innerWidth <= 760) { puvodni.minH = 560; }
  var stav = JSON.parse(JSON.stringify(puvodni));
  try {
    var u = JSON.parse(localStorage.getItem(KLIC));
    if (u && u.fotky && u.fotky.length === snimky.length) stav = u;
  } catch (e) {}

  var akt = 0;
  function mobil() { return window.innerWidth <= 760; }

  /* ---------- styl ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".hero-orez .snimek img{animation:none!important;transform:scale(var(--zoom,1))!important;transition:none!important}" +
    ".hero-orez{cursor:grab;touch-action:none}.hero-orez.tahne{cursor:grabbing}" +
    ".hero-orez .hero-text,.hero-orez .hero-ovladani{pointer-events:none}" +
    ".hero-orez .snimek{transition:none}" +
    "#orez-panel{position:fixed;right:16px;bottom:16px;z-index:9999;width:340px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;background:#fff;color:#222;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 Lato,system-ui,sans-serif;padding:14px 16px}" +
    "#orez-panel h4{margin:0 0 6px;font-size:16px;color:#6E2B2D;display:flex;justify-content:space-between;align-items:center}" +
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
    "@media (max-width:760px){#orez-panel{left:8px;right:8px;bottom:8px;width:auto;max-height:40vh;font-size:13px;padding:10px 12px}#orez-panel .r{margin:5px 0}}";
  document.head.appendChild(css);
  hero.classList.add("hero-orez");

  /* ---------- panel ---------- */
  var p = document.createElement("div");
  p.id = "orez-panel";
  p.innerHTML =
    '<h4><span>Ořez úvodních fotek</span><button class="tl" data-a="mini" title="Zmenšit / zvětšit panel">–</button></h4>' +
    '<div class="sede">Táhněte myší po fotce. Šipky = jemný posun (Shift = po 5).</div>' +
    '<div class="r fotky"></div>' +
    '<div class="r">Upravujete ořez pro: <span class="rezim" data-v="rezim"></span> <span class="sede" data-v="sirka"></span></div>' +
    '<div class="r sede" data-v="mobInfo"></div>' +
    '<div class="r">Pozice: <b data-v="pozice"></b></div>' +
    '<div class="r"><label>Přiblížení <span data-v="zoomH"></span></label><input type="range" min="100" max="200" step="1" data-i="zoom"></div>' +
    '<div class="r" data-v="mobVlastni"><label><input type="checkbox" data-i="vlastniMob"> vlastní ořez pro mobil</label></div>' +
    '<hr><div class="sede">Výška pásu s fotkami (pro všechny fotky):</div>' +
    '<div data-v="pcVyska"><div class="r"><label>Nejméně <span data-v="minHH"></span></label><input type="range" min="400" max="1100" step="10" data-i="minH"></div>' +
    '<div class="r"><label>Nejvíc <span data-v="maxHH"></span></label><input type="range" min="500" max="1300" step="10" data-i="maxH"></div>' +
    '<div class="r"><label><input type="checkbox" data-i="celaVyska"> vždy celá výška okna</label></div></div>' +
    '<div class="r" data-v="mobVyska"><label>Na mobilu <span data-v="mobPctH"></span> výšky obrazovky</label><input type="range" min="60" max="100" step="1" data-i="mobPct"></div>' +
    '<hr><div class="r" style="display:flex;gap:6px;flex-wrap:wrap">' +
    '<button class="tl h" data-a="kopie">Zkopírovat nastavení</button>' +
    '<button class="tl" data-a="vratit">Vrátit fotku</button><button class="tl" data-a="vratitVse">Vrátit vše</button></div>' +
    '<div class="sede" data-v="info">Pro mobil zužte okno prohlížeče pod 760 px (nebo F12 → ikona mobilu).</div>';
  document.body.appendChild(p);
  var $ = function (s) { return p.querySelector(s); };

  var fotkyEl = $(".fotky");
  snimky.forEach(function (_, i) {
    var b = document.createElement("button");
    b.textContent = i + 1;
    b.onclick = function () { vyber(i); };
    fotkyEl.appendChild(b);
  });

  function vyber(i) {
    akt = i;
    if (window.HB_heroUkaz) window.HB_heroUkaz(i, false);
    else snimky.forEach(function (s, j) { s.classList.toggle("aktivni", j === i); });
    obnov();
  }
  // když někdo klikne na tečku slideru, panel se přepne s ním
  new MutationObserver(function () {
    var i = snimky.findIndex(function (s) { return s.classList.contains("aktivni"); });
    if (i >= 0 && i !== akt) { akt = i; obnov(); }
  }).observe(hero.querySelector(".hero-snimky"), { subtree: true, attributes: true, attributeFilter: ["class"] });

  function zmenena(i) {
    var f = stav.fotky[i], o = puvodni.fotky[i];
    return f.pc[0] !== o.pc[0] || f.pc[1] !== o.pc[1] || f.zoom !== o.zoom || JSON.stringify(f.mob) !== JSON.stringify(o.mob);
  }
  function aktivniPozice(f) { return mobil() && f.mob ? f.mob : f.pc; }

  function pouzij() {
    snimky.forEach(function (fig, i) {
      var f = stav.fotky[i];
      fig.style.setProperty("--pozice", f.pc[0] + "% " + f.pc[1] + "%");
      if (f.mob) fig.style.setProperty("--pozice-mobil", f.mob[0] + "% " + f.mob[1] + "%"); else fig.style.removeProperty("--pozice-mobil");
      fig.style.setProperty("--zoom", f.zoom / 100);
    });
    if (mobil()) {
      hero.style.minHeight = "520px";
      hero.style.height = stav.mobPct + "svh";
    } else {
      hero.style.minHeight = stav.minH + "px";
      hero.style.height = stav.celaVyska ? "calc(100svh - var(--hlavicka))" : "min(calc(100svh - var(--hlavicka)), " + stav.maxH + "px)";
    }
  }

  function obnov() {
    pouzij();
    var f = stav.fotky[akt], m = mobil(), poz = aktivniPozice(f);
    fotkyEl.querySelectorAll("button").forEach(function (b, i) { b.className = (i === akt ? "a " : "") + (zmenena(i) ? "z" : ""); });
    $('[data-v="rezim"]').textContent = m ? "mobil" : "počítač";
    $('[data-v="sirka"]').textContent = "okno " + window.innerWidth + " × " + window.innerHeight + ", fotka " + hero.clientWidth + " × " + hero.clientHeight + " px";
    $('[data-v="mobInfo"]').textContent = m ? (f.mob ? "Fotka má vlastní ořez pro mobil." : "Mobil zatím používá ořez z počítače – posunutím vznikne vlastní.") : "";
    $('[data-v="pozice"]').textContent = poz[0] + " % zleva, " + poz[1] + " % shora";
    $('[data-i="zoom"]').value = f.zoom; $('[data-v="zoomH"]').textContent = f.zoom + " %";
    $('[data-v="mobVlastni"]').style.display = m ? "" : "none";
    $('[data-i="vlastniMob"]').checked = !!f.mob;
    $('[data-v="pcVyska"]').style.display = m ? "none" : "";
    $('[data-v="mobVyska"]').style.display = m ? "" : "none";
    $('[data-i="minH"]').value = stav.minH; $('[data-v="minHH"]').textContent = stav.minH + " px";
    $('[data-i="maxH"]').value = stav.maxH; $('[data-v="maxHH"]').textContent = stav.celaVyska ? "—" : stav.maxH + " px";
    $('[data-i="maxH"]').disabled = stav.celaVyska;
    $('[data-i="celaVyska"]').checked = stav.celaVyska;
    $('[data-i="mobPct"]').value = stav.mobPct; $('[data-v="mobPctH"]').textContent = stav.mobPct + " %";
  }
  function uloz() { try { localStorage.setItem(KLIC, JSON.stringify(stav)); } catch (e) {} }

  /* ---------- ovládání ---------- */
  p.addEventListener("input", function (e) {
    var k = e.target.dataset.i; if (!k) return;
    var f = stav.fotky[akt];
    if (k === "zoom") f.zoom = +e.target.value;
    else if (k === "minH") { stav.minH = +e.target.value; if (stav.maxH < stav.minH) stav.maxH = stav.minH; }
    else if (k === "maxH") { stav.maxH = +e.target.value; if (stav.minH > stav.maxH) stav.minH = stav.maxH; }
    else if (k === "mobPct") stav.mobPct = +e.target.value;
    else if (k === "celaVyska") stav.celaVyska = e.target.checked;
    else if (k === "vlastniMob") f.mob = e.target.checked ? f.pc.slice() : null;
    uloz(); obnov();
  });
  p.addEventListener("click", function (e) {
    var a = e.target.dataset && e.target.dataset.a; if (!a) return;
    if (a === "mini") { p.classList.toggle("mini"); e.target.textContent = p.classList.contains("mini") ? "+" : "–"; }
    if (a === "vratit") { stav.fotky[akt] = JSON.parse(JSON.stringify(puvodni.fotky[akt])); uloz(); obnov(); }
    if (a === "vratitVse") { if (confirm("Vrátit všechny fotky i výšku na původní nastavení?")) { stav = JSON.parse(JSON.stringify(puvodni)); uloz(); obnov(); } }
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

  /* tažení: fotka jede s myší */
  var start = null;
  hero.addEventListener("pointerdown", function (e) {
    if (e.button !== 0) return;
    var f = stav.fotky[akt], m = mobil();
    if (m && !f.mob) f.mob = f.pc.slice();
    var img = snimky[akt].querySelector("img"), W = hero.clientWidth, H = hero.clientHeight;
    var iw = img.naturalWidth || 3, ih = img.naturalHeight || 2, s = Math.max(W / iw, H / ih) * f.zoom / 100;
    start = { x: e.clientX, y: e.clientY, p: (m ? f.mob : f.pc).slice(), m: m, ox: iw * s - W, oy: ih * s - H };
    hero.setPointerCapture(e.pointerId); hero.classList.add("tahne"); e.preventDefault();
  });
  hero.addEventListener("pointermove", function (e) {
    if (!start) return;
    var f = stav.fotky[akt], c = start.m ? f.mob : f.pc;
    if (start.ox > 1) c[0] = omez(start.p[0] - (e.clientX - start.x) / start.ox * 100);
    if (start.oy > 1) c[1] = omez(start.p[1] - (e.clientY - start.y) / start.oy * 100);
    obnov();
  });
  function konec() { if (start) { start = null; hero.classList.remove("tahne"); uloz(); obnov(); } }
  hero.addEventListener("pointerup", konec);
  hero.addEventListener("pointercancel", konec);
  // odkazy v úvodním pásu při ladění neklikat
  hero.addEventListener("click", function (e) { if (e.target.closest("a")) e.preventDefault(); }, true);

  document.addEventListener("keydown", function (e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
    var f = stav.fotky[akt];
    if (mobil() && !f.mob) f.mob = f.pc.slice();
    var c = mobil() ? f.mob : f.pc, k = e.shiftKey ? 5 : 1;
    c[0] = omez(c[0] + d[0] * k); c[1] = omez(c[1] + d[1] * k);
    e.preventDefault(); uloz(); obnov();
  });
  function omez(x) { return Math.round(Math.max(0, Math.min(100, x))); }
  window.addEventListener("resize", obnov);

  /* ---------- výstup pro Clauda ---------- */
  function vystup() {
    var t = ["ÚVODNÍ FOTKY – nové nastavení ořezu (laděno přímo na webu, " + location.host + location.pathname + ")", ""];
    t.push("Výška na počítači: nejméně " + stav.minH + " px, " + (stav.celaVyska ? "vždy celá výška okna" : "nejvíc " + stav.maxH + " px") + "  (původně " + puvodni.minH + " / " + puvodni.maxH + " px)");
    t.push("Výška na mobilu: " + stav.mobPct + " % výšky obrazovky  (původně " + puvodni.mobPct + " %)");
    t.push("");
    stav.fotky.forEach(function (f, i) {
      t.push("Fotka " + (i + 1) + " (" + puvodni.fotky[i].soubor + "): počítač " + f.pc[0] + "% " + f.pc[1] + "%" +
        (f.mob ? ", mobil " + f.mob[0] + "% " + f.mob[1] + "%" : ", mobil stejně") + ", přiblížení " + f.zoom + " %" + (zmenena(i) ? "" : "  (beze změny)"));
    });
    t.push("", "CSS:");
    t.push(".hero { min-height: " + stav.minH + "px; height: " + (stav.celaVyska ? "calc(100svh - var(--hlavicka))" : "min(calc(100svh - var(--hlavicka)), " + stav.maxH + "px)") + "; }");
    t.push("@media (max-width: 760px) { .hero { height: " + stav.mobPct + "svh; min-height: 520px; } }");
    stav.fotky.forEach(function (f, i) {
      t.push("hero-" + (i + 1) + ': style="--pozice: ' + f.pc[0] + "% " + f.pc[1] + "%" + (f.mob ? "; --pozice-mobil: " + f.mob[0] + "% " + f.mob[1] + "%" : "") + (f.zoom !== 100 ? "; --zoom: " + f.zoom / 100 : "") + '"');
    });
    t.push("", "Ladil v okně " + window.innerWidth + " × " + window.innerHeight + " px.");
    return t.join("\n");
  }

  vyber(Math.max(0, snimky.findIndex(function (s) { return s.classList.contains("aktivni"); })));
})();

// Administrace – Fotky: nahrání náhledů 768 px do úložiště fotky-nahledy a spárování s katalogem fotky (Keksa 12. 10. 2026).
// Jméno náhledu určí databáze (web_admin_fotka_zaloz podle ročníku a jména souboru), prohlížeč fotku zmenší a nahraje.
(async function () {
  var j = await HBA.vyzadovat(); if (!j) return;
  var $ = function (id) { return document.getElementById(id); };
  var DELKA = 768, KVALITA = 0.82, SOUBEZNE = 3;
  var rokSel = $("fo-rok"), prehled = null;

  var letos = new Date().getFullYear() % 100 + 1;
  for (var r = letos; r >= 19; r--) {
    var o = document.createElement("option"); o.value = "HB" + r; o.textContent = "HB" + r + " (20" + r + ")"; rokSel.appendChild(o);
  }
  rokSel.value = "HB26";
  rokSel.addEventListener("change", nacti);

  async function nacti(zachovat) {
    $("fo-prehled").innerHTML = '<p class="adm-sub">Načítám…</p>';
    try {
      prehled = await HBA.rpc("web_admin_fotky_prehled", { p_rok: rokSel.value });
      var s = prehled.sekce || {};
      $("fo-prehled").innerHTML =
        "<p><b>" + prehled.celkem + "</b> fotek v katalogu, <b>" + prehled.s_nahledem + "</b> má náhled, chybí <b>" + prehled.chybi.length + "</b>.</p>" +
        "<p>Na webu: " + prehled.na_webu + " · Start " + (s.start || 0) + " · Trasa " + (s.trasa || 0) + " · Cíl " + (s["cil"] || 0) + " · nezařazeno " + (s.bez || 0) + "</p>" +
        "<p>Kampaň na sítě: feed " + ((prehled.kampan || {}).feed || 0) + " · story " + ((prehled.kampan || {}).story || 0) + " · Předávka na fotce: " + (prehled.predavka || 0) + "</p>" +
        (prehled.chybi.length ? '<p class="adm-sub">Chybí např.: ' + prehled.chybi.slice(0, 8).map(function (x) { return HBA.esc(x.soubor); }).join(", ") + (prehled.chybi.length > 8 ? " …" : "") + "</p>" : "");
    } catch (e) { $("fo-prehled").innerHTML = '<p class="adm-chyba">' + HBA.esc(e.message) + "</p>"; }
    if (zachovat !== true) { vybrana = null; vyber = {}; posledni = null; }
    kresliUvodni(); kresliMrizku();
  }


  // Mřížka náhledů ročníku (Keksa 18. 10. 2026) má tři režimy:
  // Úvodní fotka – klik vybere jednu fotku, tlačítko ji uloží (web_admin_fotka_uvodni).
  // Třídění – klik přidá fotku do výběru (Shift+klik vybere rozsah), tlačítka zařadí výběr do Start / Trasa / Cíl (web_admin_fotky_sekce).
  // Kampaň (19. 10. 2026) – stejný výběr, tlačítka přidají do feedu (4:5) nebo story (9:16) nebo odeberou z kampaně
  // (web_admin_fotky_kampan). Značka je jen v administraci, na webu se neukazuje.
  // Předávka (20. 10. 2026) – v Třídění tlačítka Předávka / Bez předávky (web_admin_fotky_predavka), filtr Předávka v obou režimech.
  // Označuje se jen ručně, anotace fotek se hromadně (ani AI) nedoplňují.
  // Náhled v galerii = [soubor, náhled, sekce, feed, story, výřez feed, výřez story, předávka].
  // Lupa na dlaždici otevře fotku ve velkém (prohlížeč níž), klik jinam na dlaždici fotku vybírá jako dřív.
  var NAHLEDY = HB.url + "/storage/v1/object/public/fotky-nahledy/", vybrana = null, filtr = "", filtrK = "", rezim = "uvodni", vyber = {}, posledni = null;
  var SEKCE = { start: "Start", trasa: "Trasa", cil: "Cíl" };
  var KAMPAN = { feed: "Přidat do feedu", story: "Přidat do story" };
  function sVyberem() { return rezim === "trideni" || rezim === "kampan"; }
  function jeVybrana(s) { return sVyberem() ? !!vyber[s] : !!(vybrana && vybrana[0] === s); }
  function zobrazene() {
    return ((prehled && prehled.galerie) || []).filter(function (x) {
      if (rezim === "kampan") return !filtrK || (filtrK === "feed" ? x[3] : filtrK === "story" ? x[4] : filtrK === "predavka" ? x[7] : !x[3] && !x[4]);
      return !filtr || (filtr === "-" ? !x[2] : filtr === "predavka" ? x[7] : x[2] === filtr);
    });
  }
  function kresliUvodni() {
    var h = "";
    if (rezim === "kampan") {
      var k = Object.keys(vyber).length;
      h += "<span>Vybráno <b>" + k + "</b></span>" +
        ["feed", "story"].map(function (a) { return '<button type="button" class="adm-tlacitko" data-kampan="' + a + '"' + (k ? "" : " disabled") + ">" + KAMPAN[a] + "</button>"; }).join(" ") +
        ' <button type="button" class="adm-tlacitko-male" data-kampan="odebrat"' + (k ? "" : " disabled") + ">Odebrat z kampaně</button>" +
        ' <button type="button" class="adm-tlacitko-male" id="fo-vse">Vybrat vše zobrazené</button>' +
        ' <button type="button" class="adm-tlacitko-male" id="fo-zrusit"' + (k ? "" : " disabled") + ">Zrušit výběr</button>";
    } else if (rezim === "trideni") {
      var n = Object.keys(vyber).length;
      h += "<span>Vybráno <b>" + n + "</b></span>" +
        ["start", "trasa", "cil"].map(function (s) { return '<button type="button" class="adm-tlacitko" data-zarad="' + s + '"' + (n ? "" : " disabled") + ">" + SEKCE[s] + "</button>"; }).join(" ") +
        ' <button type="button" class="adm-tlacitko-male" data-zarad=""' + (n ? "" : " disabled") + ">Nezařazeno</button>" +
        ' <button type="button" class="adm-tlacitko" data-predavka="1"' + (n ? "" : " disabled") + ">Předávka</button>" +
        ' <button type="button" class="adm-tlacitko-male" data-predavka="0"' + (n ? "" : " disabled") + ">Bez předávky</button>" +
        ' <button type="button" class="adm-tlacitko-male" id="fo-vse">Vybrat vše zobrazené</button>' +
        ' <button type="button" class="adm-tlacitko-male" id="fo-zrusit"' + (n ? "" : " disabled") + ">Zrušit výběr</button>";
    } else {
      var u = prehled && prehled.uvodni;
      if (u) h += '<img src="' + HBA.esc(NAHLEDY + u.nahled) + '" alt=""><span>Teď: <b>' + HBA.esc(u.soubor) + "</b></span>";
      else h += "<span>Úvodní fotka není nastavená – web bere fotku z první třetiny galerie.</span>";
      if (vybrana) h += '<span>Vybraná: <b>' + HBA.esc(vybrana[0]) + '</b></span><button type="button" class="adm-tlacitko" id="fo-nastavit">Nastavit jako úvodní</button>';
    }
    $("fo-uvodni").innerHTML = h;
  }
  function kresliMrizku() {
    var g = (prehled && prehled.galerie) || [];
    $("fo-filtr").hidden = !g.length || rezim === "kampan";
    $("fo-filtr-kampan").hidden = !g.length || rezim !== "kampan";
    var nf = g.filter(function (x) { return x[3]; }).length, ns = g.filter(function (x) { return x[4]; }).length;
    $("fo-kampan-pocet").textContent = "Ve feedu " + nf + " · ve story " + ns;
    $("fo-mrizka").innerHTML = zobrazene().map(function (x) {
      var zvolena = jeVybrana(x[0]);
      var zn = (x[7] && rezim !== "uvodni" ? "<span>předávka</span>" : "") +
        (rezim === "kampan" ? (x[3] ? "<span>feed" + (x[5] ? " ✂" : "") + "</span>" : "") + (x[4] ? "<span>story" + (x[6] ? " ✂" : "") + "</span>" : "") : "");
      var znacky = zn ? '<span class="fo-kampan">' + zn + "</span>" : "";
      return '<div class="fo-dlazdice"><button type="button" data-soubor="' + HBA.esc(x[0]) + '" aria-pressed="' + zvolena + '" title="' + HBA.esc(x[0]) + '">' +
        '<img loading="lazy" src="' + HBA.esc(NAHLEDY + x[1]) + '" alt="' + HBA.esc(x[0]) + '">' + znacky +
        '<span class="fo-stitek">' + (rezim === "kampan" ? HBA.esc(x[0]) : (SEKCE[x[2]] || "nezařazeno")) + "</span></button>" +
        '<button type="button" class="fo-lupa" data-lupa="' + HBA.esc(x[0]) + '" title="Zvětšit" aria-label="Zvětšit ' + HBA.esc(x[0]) + '">⤢</button></div>';
    }).join("") || (prehled ? '<p class="adm-sub">' + (g.length ? "Ve filtru nic není." : "Ročník zatím nemá na webu žádnou fotku s náhledem.") + "</p>" : "");
  }
  $("fo-rezim").addEventListener("change", function (e) {
    rezim = e.target.value; vybrana = null; vyber = {}; posledni = null;
    $("fo-napoveda").textContent = rezim === "kampan"
      ? "Klikáním vyber fotky (Shift+klik vybere rozsah), pak je přidej do feedu (výřez 4:5) nebo do story (výřez 9:16). Fotka může být v obou. Značka je jen tady v administraci, na webu se neukazuje."
      : rezim === "trideni"
      ? "Klikáním vyber fotky (Shift+klik vybere rozsah), pak je zařaď tlačítkem. Tlačítkem Předávka označíš fotky, na kterých se předává štafeta (jen v administraci). Na webu se změna sekce objeví po dalším sestavení webu."
      : "Klikni na fotku a potvrď. Na webu se změna objeví po dalším sestavení webu.";
    kresliUvodni(); kresliMrizku();
  });
  $("fo-mrizka").addEventListener("click", function (e) {
    var l = e.target.closest("button[data-lupa]"); if (l) { otevri(l.dataset.lupa); return; }
    var b = e.target.closest("button[data-soubor]"); if (!b) return;
    var s = b.dataset.soubor;
    if (sVyberem()) {
      var seznam = zobrazene().map(function (x) { return x[0]; });
      if (e.shiftKey && posledni !== null && seznam.indexOf(posledni) >= 0) {
        var a = seznam.indexOf(posledni), z = seznam.indexOf(s);
        seznam.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(function (x) { vyber[x] = 1; });
      } else if (vyber[s]) delete vyber[s]; else vyber[s] = 1;
      posledni = s;
      $("fo-mrizka").querySelectorAll("button[data-soubor]").forEach(function (x) { x.setAttribute("aria-pressed", !!vyber[x.dataset.soubor]); });
    } else {
      vybrana = ((prehled && prehled.galerie) || []).filter(function (x) { return x[0] === s; })[0] || null;
      $("fo-mrizka").querySelectorAll("button[aria-pressed=true]").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
      b.setAttribute("aria-pressed", "true");
    }
    kresliUvodni();
  });
  $("fo-filtr").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-s]"); if (!b) return;
    filtr = b.dataset.s;
    $("fo-filtr").querySelectorAll("button").forEach(function (x) { x.classList.toggle("fo-akt", x === b); });
    kresliMrizku();
  });
  $("fo-filtr-kampan").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]"); if (!b) return;
    filtrK = b.dataset.k;
    $("fo-filtr-kampan").querySelectorAll("button").forEach(function (x) { x.classList.toggle("fo-akt", x === b); });
    kresliMrizku();
  });
  $("fo-uvodni").addEventListener("click", async function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.kampan && rezim === "kampan") {
      var vybrane = Object.keys(vyber); if (!vybrane.length) return;
      t.disabled = true;
      try {
        await HBA.rpc("web_admin_fotky_kampan", { p_rok: rokSel.value, p_soubory: vybrane, p_akce: t.dataset.kampan });
        vyber = {}; posledni = null; await nacti();
      } catch (err) { t.disabled = false; $("fo-uvodni").insertAdjacentHTML("beforeend", '<span class="adm-chyba">' + HBA.esc(err.message) + "</span>"); }
      return;
    }
    if (t.dataset && t.dataset.predavka !== undefined && rezim === "trideni") {
      var oznac = Object.keys(vyber); if (!oznac.length) return;
      t.disabled = true;
      try {
        await HBA.rpc("web_admin_fotky_predavka", { p_rok: rokSel.value, p_soubory: oznac, p_predavka: t.dataset.predavka === "1" });
        vyber = {}; posledni = null; await nacti();
      } catch (err) { t.disabled = false; $("fo-uvodni").insertAdjacentHTML("beforeend", '<span class="adm-chyba">' + HBA.esc(err.message) + "</span>"); }
      return;
    }
    if (t.id === "fo-vse") { zobrazene().forEach(function (x) { vyber[x[0]] = 1; }); kresliUvodni(); kresliMrizku(); return; }
    if (t.id === "fo-zrusit") { vyber = {}; posledni = null; kresliUvodni(); kresliMrizku(); return; }
    if (t.dataset && t.dataset.zarad !== undefined && rezim === "trideni") {
      var soubory = Object.keys(vyber); if (!soubory.length) return;
      t.disabled = true;
      try {
        await HBA.rpc("web_admin_fotky_sekce", { p_rok: rokSel.value, p_soubory: soubory, p_sekce: t.dataset.zarad || null });
        vyber = {}; posledni = null; await nacti();
      } catch (err) { t.disabled = false; $("fo-uvodni").insertAdjacentHTML("beforeend", '<span class="adm-chyba">' + HBA.esc(err.message) + "</span>"); }
      return;
    }
    if (t.id !== "fo-nastavit" || !vybrana) return;
    t.disabled = true;
    try { await HBA.rpc("web_admin_fotka_uvodni", { p_rok: rokSel.value, p_soubor: vybrana[0] }); await nacti(); }
    catch (err) { t.disabled = false; $("fo-uvodni").insertAdjacentHTML("beforeend", '<span class="adm-chyba">' + HBA.esc(err.message) + "</span>"); }
  });

  // Prohlížeč (Keksa 19. 10. 2026): fotka ve velkém, šipky na předchozí a další ve filtru, výběr fotky.
  // V režimu Kampaň navíc přepínače feed / story a výřez 4:5 nebo 9:16 s třetinami a u story s pruhy, které zakryje Instagram.
  // Výřez se ukládá poměrně k fotce (0–1) přes web_admin_fotka_kampan_orez, takže platí i pro originál.
  var POMER = { feed: 4 / 5, story: 9 / 16 }, NAZEV = { feed: "feed 4:5", story: "story 9:16" };
  var dlg = $("fo-lb"), plocha = $("fo-lb-plocha"), lbImg = $("fo-lb-img"), ramec = $("fo-lb-ramec");
  var lb = { soubor: null, orez: null, r: null, chyba: "" }, lbZmena = false, tah = null;
  function polozka(s) { return ((prehled && prehled.galerie) || []).filter(function (x) { return x[0] === s; })[0]; }
  function otevri(s) { lb.soubor = s; lb.orez = null; lb.chyba = ""; kresliLb(); if (!dlg.open) dlg.showModal(); }
  function pomerFotky() { return lbImg.naturalWidth && lbImg.naturalHeight ? lbImg.naturalWidth / lbImg.naturalHeight : 3 / 2; }
  function naStred(f) {
    var a = pomerFotky(), A = POMER[f];
    return A < a ? { x: (1 - A / a) / 2, y: 0, w: A / a, h: 1 } : { x: 0, y: (1 - a / A) / 2, w: 1, h: a / A };
  }
  function kresliRamec() {
    ramec.hidden = !lb.orez; plocha.classList.toggle("fo-orezavam", !!lb.orez);
    if (!lb.orez) return;
    var r = lb.r;
    ramec.style.left = r.x * 100 + "%"; ramec.style.top = r.y * 100 + "%";
    ramec.style.width = r.w * 100 + "%"; ramec.style.height = r.h * 100 + "%";
    // fotka pod rámečkem je ztlumená, v rámečku se ukazuje v plném jasu (stejný náhled jako pozadí rámečku)
    ramec.style.backgroundImage = 'url("' + lbImg.src + '")';
    ramec.style.backgroundSize = 100 / r.w + "% " + 100 / r.h + "%";
    ramec.style.backgroundPosition = (r.w < 1 ? r.x / (1 - r.w) * 100 : 0) + "% " + (r.h < 1 ? r.y / (1 - r.h) * 100 : 0) + "%";
    ramec.classList.toggle("fo-story", lb.orez === "story");
    // varování, když výřez zabírá méně než 45 % šířky i výšky fotky
    var m = $("fo-lb-maly"); if (m) m.hidden = r.w >= 0.45 || r.h >= 0.45;
  }
  function kresliLb() {
    var x = polozka(lb.soubor); if (!x) { dlg.open && dlg.close(); return; }
    var sez = zobrazene().map(function (y) { return y[0]; }), i = sez.indexOf(lb.soubor);
    if (lbImg.dataset.s !== x[0]) { lbImg.dataset.s = x[0]; lbImg.src = NAHLEDY + x[1]; lbImg.alt = x[0]; }
    $("fo-lb-nazev").textContent = x[0] + " · " + (SEKCE[x[2]] || "nezařazeno") + (i >= 0 ? " · " + (i + 1) + " / " + sez.length : "");
    $("fo-lb-pred").disabled = !!lb.orez || i <= 0; $("fo-lb-dalsi").disabled = !!lb.orez || i < 0 || i >= sez.length - 1;
    var h = "", nap = "";
    if (lb.orez) {
      var k = lb.orez === "feed" ? 5 : 6;
      h = "<b>Výřez " + NAZEV[lb.orez] + '</b> <button type="button" class="adm-tlacitko" data-lb="ulozit">Uložit výřez</button>' +
        ' <button type="button" class="adm-tlacitko-male" data-lb="stred">Na střed</button>' +
        (x[k] ? ' <button type="button" class="adm-tlacitko-male" data-lb="smazat">Smazat výřez</button>' : "") +
        ' <button type="button" class="adm-tlacitko-male" data-lb="zpet">Zrušit</button>';
      nap = "Rámeček posuň tažením, roh ho zvětší nebo zmenší (poměr stran drží sám). Hlavní postavu, předávku nebo obličej dej na průsečík " +
        "bílých čar třetin, nech kus místa nad hlavou a ve směru běhu a neuřízni ruce ani nohy v kloubech." +
        (lb.orez === "story" ? " <b>Šrafované pruhy nahoře a dole</b> u story přibližně zakryje Instagram (jméno účtu, pole na odpověď) – obličeje ani logo do nich nedávej." : "") +
        ' <span id="fo-lb-maly" hidden><b>Výřez je hodně malý</b> – z originálu může vyjít neostrý.</span>';
    } else {
      var vyb = jeVybrana(x[0]);
      h = '<button type="button" class="' + (vyb ? "adm-tlacitko" : "adm-tlacitko-male") + '" data-lb="vyber">' +
        (rezim === "uvodni" ? (vyb ? "✓ Vybraná jako úvodní" : "Vybrat jako úvodní") : (vyb ? "✓ Ve výběru" : "Přidat do výběru")) + "</button>";
      if (sVyberem()) h += ' <button type="button" class="' + (x[7] ? "adm-tlacitko" : "adm-tlacitko-male") + '" data-lb="predavka">' + (x[7] ? "✓ Předávka" : "Označit předávku") + "</button>";
      if (rezim === "kampan") {
        ["feed", "story"].forEach(function (f, n) {
          var v = x[3 + n];
          h += ' <button type="button" class="' + (v ? "adm-tlacitko" : "adm-tlacitko-male") + '" data-lb="' + f + '">' + (v ? "✓ Ve " : "Přidat do ") + (f === "feed" ? "feedu" : "story") + "</button>";
        });
        h += ' <button type="button" class="adm-tlacitko-male" data-lb="orez-feed">Výřez feed 4:5' + (x[5] ? " ✓" : "") + "</button>" +
          ' <button type="button" class="adm-tlacitko-male" data-lb="orez-story">Výřez story 9:16' + (x[6] ? " ✓" : "") + "</button>";
        nap = "Šipky ← → přepínají fotky ve filtru, Esc zavře. Bez nastaveného výřezu se fotka ořízne na střed. Uložený výřez fotku zároveň zařadí do formátu. " +
          "Náhled má 768 px, hotový obrázek vznikne z originálu.";
      } else nap = "Šipky ← → přepínají fotky ve filtru, Esc zavře.";
    }
    if (lb.chyba) h += ' <span class="adm-chyba">' + HBA.esc(lb.chyba) + "</span>";
    $("fo-lb-ovladani").innerHTML = h; $("fo-lb-napoveda").innerHTML = nap;
    if (lb.orez && !lb.r) lb.r = x[lb.orez === "feed" ? 5 : 6] || naStred(lb.orez);
    kresliRamec();
  }
  lbImg.addEventListener("load", function () { if (lb.orez) { if (!polozka(lb.soubor)[lb.orez === "feed" ? 5 : 6]) lb.r = naStred(lb.orez); kresliRamec(); } });
  function posun(o) {
    var sez = zobrazene().map(function (y) { return y[0]; }), i = sez.indexOf(lb.soubor) + o;
    if (!lb.orez && i >= 0 && i < sez.length) { lb.soubor = sez[i]; lb.chyba = ""; kresliLb(); }
  }
  async function lbAkce(a) {
    var x = polozka(lb.soubor); lb.chyba = "";
    if (a === "zavrit") return dlg.close();
    if (a === "pred" || a === "dalsi") return posun(a === "pred" ? -1 : 1);
    if (a === "vyber") {
      if (sVyberem()) { if (vyber[x[0]]) delete vyber[x[0]]; else vyber[x[0]] = 1; posledni = x[0]; }
      else vybrana = jeVybrana(x[0]) ? null : x;
      kresliUvodni(); kresliMrizku(); return kresliLb();
    }
    if (a === "orez-feed" || a === "orez-story") { lb.orez = a.slice(5); lb.r = null; return kresliLb(); }
    if (a === "zpet") { lb.orez = null; lb.r = null; return kresliLb(); }
    if (a === "stred") { lb.r = naStred(lb.orez); return kresliRamec(); }
    try {
      if (a === "predavka") {
        await HBA.rpc("web_admin_fotky_predavka", { p_rok: rokSel.value, p_soubory: [x[0]], p_predavka: !x[7] });
        x[7] = !x[7];
      } else if (a === "feed" || a === "story") {
        var n = a === "feed" ? 3 : 4;
        await HBA.rpc("web_admin_fotky_kampan", { p_rok: rokSel.value, p_soubory: [x[0]], p_akce: x[n] ? "bez_" + a : a });
        x[n] = !x[n];
      } else if (a === "ulozit" || a === "smazat") {
        var r = await HBA.rpc("web_admin_fotka_kampan_orez", { p_rok: rokSel.value, p_soubor: x[0], p_format: lb.orez, p_orez: a === "ulozit" ? lb.r : null });
        x[lb.orez === "feed" ? 5 : 6] = r || null; if (r) x[lb.orez === "feed" ? 3 : 4] = true;
        lb.orez = null; lb.r = null;
      }
      lbZmena = true;
    } catch (err) { lb.chyba = err.message; }
    kresliMrizku(); kresliLb();
  }
  dlg.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lb]"); if (b && !b.disabled) lbAkce(b.dataset.lb);
    else if (e.target === dlg && !tah) {
      // klik na ztmavené pozadí mimo okno zavře, mezery uvnitř okna ne
      var o = dlg.getBoundingClientRect();
      if (e.clientX < o.left || e.clientX > o.right || e.clientY < o.top || e.clientY > o.bottom) dlg.close();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (dlg.open && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); posun(e.key === "ArrowLeft" ? -1 : 1); }
  });
  dlg.addEventListener("close", function () { lb.orez = null; lb.r = null; kresliRamec(); if (lbZmena) { lbZmena = false; nacti(true); } });
  // Tažení rámečku: posun celého rámečku, nebo roh s protilehlým rohem pevně. Vše v poměrných souřadnicích fotky.
  function bod(e) { var o = plocha.getBoundingClientRect(); return { x: (e.clientX - o.left) / o.width, y: (e.clientY - o.top) / o.height }; }
  ramec.addEventListener("pointerdown", function (e) {
    if (!lb.orez) return;
    e.preventDefault(); ramec.setPointerCapture(e.pointerId);
    var r = lb.r, roh = e.target.dataset && e.target.dataset.roh;
    tah = roh ? { kotva: { x: roh[1] === "l" ? r.x + r.w : r.x, y: roh[0] === "t" ? r.y + r.h : r.y } } : { start: bod(e), r0: { x: r.x, y: r.y, w: r.w, h: r.h } };
  });
  ramec.addEventListener("pointermove", function (e) {
    if (!tah) return;
    var p = bod(e), r = lb.r, a = pomerFotky(), A = POMER[lb.orez];
    if (tah.kotva) {
      var k = tah.kotva, vpravo = p.x >= k.x, dolu = p.y >= k.y;
      var w = Math.max(Math.abs(p.x - k.x), Math.abs(p.y - k.y) * A / a);
      w = Math.min(w, vpravo ? 1 - k.x : k.x, (dolu ? 1 - k.y : k.y) * A / a);
      w = Math.max(w, 0.08); var h = w * a / A;
      lb.r = { x: vpravo ? k.x : k.x - w, y: dolu ? k.y : k.y - h, w: w, h: h };
    } else {
      var s = tah.start, r0 = tah.r0;
      lb.r = { x: Math.min(Math.max(r0.x + p.x - s.x, 0), 1 - r.w), y: Math.min(Math.max(r0.y + p.y - s.y, 0), 1 - r.h), w: r.w, h: r.h };
    }
    kresliRamec();
  });
  ["pointerup", "pointercancel"].forEach(function (t) { ramec.addEventListener(t, function () { tah = null; }); });

  async function zmensi(soubor) {
    var bmp = await createImageBitmap(soubor, { imageOrientation: "from-image" });
    var k = Math.min(1, DELKA / Math.max(bmp.width, bmp.height));
    var c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    var g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return await new Promise(function (ok) { c.toBlob(ok, "image/jpeg", KVALITA); });
  }

  async function nahraj(soubor) {
    var z = await HBA.rpc("web_admin_fotka_zaloz", { p_rok: rokSel.value, p_soubor: soubor.name,
      p_fotograf: $("fo-fotograf").value || null, p_cas: soubor.lastModified ? new Date(soubor.lastModified).toISOString() : null });
    var blob = await zmensi(soubor);
    var t = await HBA.token();
    var r = await fetch(HB.url + "/storage/v1/object/fotky-nahledy/" + encodeURIComponent(z.nahled), {
      method: "POST", headers: { apikey: HB.klic, Authorization: "Bearer " + t, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "max-age=31536000" },
      body: blob
    });
    if (!r.ok) { var tx = await r.text(); throw new Error("úložiště " + r.status + " " + tx.slice(0, 120)); }
  }

  async function zpracuj(seznam) {
    var fotky = Array.prototype.filter.call(seznam, function (f) { return /\.(jpe?g|png|webp)$/i.test(f.name) && !/^\._/.test(f.name) && !/__MACOSX/.test(f.webkitRelativePath || ""); });
    if ($("fo-jen-chybejici").checked && prehled) {
      var maji = {}; (prehled.maji || []).forEach(function (x) { maji[x] = 1; });
      fotky = fotky.filter(function (f) { return !maji[f.name]; });
    }
    // stejné jméno ve dvou podsložkách nahraj jen jednou
    var videno = {}; fotky = fotky.filter(function (f) { if (videno[f.name]) return false; videno[f.name] = 1; return true; });
    $("fo-chyby").innerHTML = "";
    $("fo-prubeh").hidden = false;
    var hotovo = 0, chyb = 0, i = 0, n = fotky.length;
    $("fo-progress").max = Math.max(n, 1); $("fo-progress").value = 0;
    $("fo-stav").textContent = n ? "0 / " + n : "Žádná fotka k nahrání.";
    async function pracant() {
      while (i < n) {
        var f = fotky[i++];
        try { await nahraj(f); hotovo++; }
        catch (e) { chyb++; var li = document.createElement("li"); li.textContent = f.name + ": " + e.message; $("fo-chyby").appendChild(li); }
        $("fo-progress").value = hotovo + chyb;
        $("fo-stav").textContent = (hotovo + chyb) + " / " + n + (chyb ? " · chyby: " + chyb : "");
      }
    }
    await Promise.all(Array.from({ length: SOUBEZNE }, pracant));
    $("fo-stav").textContent = "Hotovo: nahráno " + hotovo + (chyb ? ", chyby: " + chyb : "") + ". Na webu se objeví po dalším sestavení webu.";
    nacti();
  }

  $("fo-slozka").addEventListener("change", function (e) { zpracuj(e.target.files); e.target.value = ""; });
  $("fo-soubory").addEventListener("change", function (e) { zpracuj(e.target.files); e.target.value = ""; });
  nacti();
})();

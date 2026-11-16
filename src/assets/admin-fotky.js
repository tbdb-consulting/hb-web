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
  // Volba „Všechny ročníky“ je jen v režimu Výběr podle hodnocení AI.
  var vseOpt = document.createElement("option"); vseOpt.value = ""; vseOpt.textContent = "Všechny ročníky";
  function nastavRoky() {
    if (rezim === "ai") { if (!vseOpt.parentNode) rokSel.insertBefore(vseOpt, rokSel.firstChild); }
    else if (vseOpt.parentNode) { if (rokSel.value === "") rokSel.value = "HB26"; rokSel.removeChild(vseOpt); }
  }

  async function nacti(zachovat) {
    $("fo-prehled").innerHTML = '<p class="adm-sub">Načítám…</p>';
    if (rezim === "ai") {
      try { ai = await HBA.rpc("web_admin_fotky_ai", { p_rok: rokSel.value || null }); }
      catch (e) { ai = []; $("fo-prehled").innerHTML = '<p class="adm-chyba">' + HBA.esc(e.message) + "</p>"; }
      if (!rokSel.value) {
        prehled = null;
        if (ai.length || !$("fo-prehled").querySelector(".adm-chyba")) $("fo-prehled").innerHTML = "<p><b>" + ai.length + "</b> fotek ze všech ročníků má hodnocení AI.</p>";
        if (zachovat !== true) { vybrana = null; vyber = {}; posledni = null; }
        kresliUvodni(); kresliMrizku(); return;
      }
    }
    try {
      prehled = await HBA.rpc("web_admin_fotky_prehled", { p_rok: rokSel.value });
      try { vitezove = await HBA.rpc("web_admin_vitezove", { p_rok: rokSel.value }); } catch (e) { vitezove = null; }
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
  var NAHLEDY = HB.url + "/storage/v1/object/public/fotky-nahledy/", vitezove = null, ai = [], vybrana = null, filtr = "", filtrK = "", rezim = "uvodni", vyber = {}, posledni = null;
  var SEKCE = { start: "Start", trasa: "Trasa", cil: "Cíl" };
  var KAMPAN = { feed: "Přidat do feedu", story: "Přidat do story" };
  function sVyberem() { return rezim === "trideni" || rezim === "kampan" || rezim === "ai"; }
  function jeVybrana(s) { return sVyberem() ? !!vyber[s] : !!(vybrana && vybrana[0] === s); }
  function klic(x) { return rezim === "ai" ? x.i : x[0]; }
  function zobrazene() {
    if (rezim === "ai") return zobrazeneAi();
    return ((prehled && prehled.galerie) || []).filter(function (x) {
      if (rezim === "kampan") return !filtrK || (filtrK === "feed" ? x[3] : filtrK === "story" ? x[4] : filtrK === "predavka" ? x[7] : !x[3] && !x[4]);
      return !filtr || (filtr === "-" ? !x[2] : filtr === "predavka" ? x[7] : x[2] === filtr);
    });
  }
  function kresliUvodni() {
    var h = "";
    if (rezim === "ai") {
      var na = Object.keys(vyber).length, dis = na ? "" : " disabled";
      h += "<span>Vybráno <b>" + na + "</b></span>" +
        '<button type="button" class="adm-tlacitko" data-ai="prevzit"' + dis + ">Převzít navržené formáty</button>" +
        ' <button type="button" class="adm-tlacitko" data-ai="potvrdit"' + dis + ">Potvrdit návrh AI</button>" +
        ' <button type="button" class="adm-tlacitko-male" data-ai="nepotvrdit"' + dis + ">Zrušit potvrzení</button>" +
        ' <button type="button" class="adm-tlacitko-male" id="fo-vse">Vybrat vše zobrazené</button>' +
        ' <button type="button" class="adm-tlacitko-male" id="fo-zrusit"' + dis + ">Zrušit výběr</button>";
    } else if (rezim === "kampan") {
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
    } else if (rezim === "vitezove") {
      // Fotka vítězů (8. 11. 2026): karta ročníku na stránce Výsledky ukazuje fotku vítězného týmu a fotku vítězek (kategorie Ženy).
      var v = vitezove || {}, fo = v.foto || {};
      [["celkem", "Vítězný tým", v.celkem], ["zeny", "Vítězky (Ženy)", v.zeny]].forEach(function (k) {
        if (!k[2]) { if (k[0] === "zeny") h += '<span class="adm-sub">Ročník nemá ženský tým, fotka vítězek se nezobrazí.</span>'; return; }
        var f = fo[k[0]];
        h += '<span class="fo-vitez">' + (f ? '<img src="' + HBA.esc(NAHLEDY + f.nahled) + '" alt="">' : "") +
          "<span>" + k[1] + ": <b>" + HBA.esc(k[2]) + "</b><br>" + (f ? "teď " + HBA.esc(f.soubor || f.nahled) : "fotka chybí") + "</span>" +
          (vybrana ? ' <button type="button" class="adm-tlacitko" data-vitez="' + k[0] + '">Nastavit vybranou</button>' : "") +
          (f ? ' <button type="button" class="adm-tlacitko-male" data-vitez-smazat="' + k[0] + '">Odebrat</button>' : "") + "</span>";
      });
      if (!vybrana) h += '<span class="adm-sub">Klikni na fotku v mřížce (filtr Cíl), pak ji nastav k vítězům nebo vítězkám.</span>';
      else h += '<span>Vybraná: <b>' + HBA.esc(vybrana[0]) + "</b></span>";
    } else {
      var u = prehled && prehled.uvodni;
      if (u) h += '<img src="' + HBA.esc(NAHLEDY + u.nahled) + '" alt=""><span>Teď: <b>' + HBA.esc(u.soubor) + "</b></span>";
      else h += "<span>Úvodní fotka není nastavená – web bere fotku z první třetiny galerie.</span>";
      if (vybrana) h += '<span>Vybraná: <b>' + HBA.esc(vybrana[0]) + '</b></span><button type="button" class="adm-tlacitko" id="fo-nastavit">Nastavit jako úvodní</button>';
    }
    $("fo-uvodni").innerHTML = h;
  }
  function kresliMrizku() {
    $("fo-filtr-ai").hidden = rezim !== "ai";
    if (rezim === "ai") { $("fo-filtr").hidden = $("fo-filtr-kampan").hidden = true; return kresliMrizkuAi(); }
    var g = (prehled && prehled.galerie) || [];
    $("fo-filtr").hidden = !g.length || rezim === "kampan" || rezim === "ai";
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
    var bylAi = rezim === "ai" || e.target.value === "ai";
    rezim = e.target.value; vybrana = null; vyber = {}; posledni = null;
    nastavRoky();
    $("fo-napoveda").textContent = rezim === "ai"
      ? "Návrh AI ke každé fotce: kategorie, skóre, vhodné formáty a kde už byla použitá. Filtruj kategoriemi (víc najednou) a skóre. Klikáním vyber fotky (Shift+klik vybere rozsah) a převezmi navržené formáty nebo potvrď návrh. Lupa ⤢ otevře fotku s podrobnostmi, úpravou hodnocení, výřezy a evidencí použití."
      : rezim === "kampan"
      ? "Klikáním vyber fotky (Shift+klik vybere rozsah), pak je přidej do feedu (výřez 4:5) nebo do story (výřez 9:16). Fotka může být v obou. Značka je jen tady v administraci, na webu se neukazuje."
      : rezim === "trideni"
      ? "Klikáním vyber fotky (Shift+klik vybere rozsah), pak je zařaď tlačítkem. Tlačítkem Předávka označíš fotky, na kterých se předává štafeta (jen v administraci). Na webu se změna sekce objeví po dalším sestavení webu."
      : rezim === "vitezove"
      ? "Klikni na fotku vítězů (Lupa ⤢ ji zvětší) a nastav ji tlačítkem u vítězného týmu nebo u vítězek. Na webu se změna objeví po dalším sestavení webu."
      : "Klikni na fotku a potvrď. Na webu se změna objeví po dalším sestavení webu.";
    if (rezim === "vitezove" && !filtr) { filtr = "cil"; $("fo-filtr").querySelectorAll("button").forEach(function (x) { x.classList.toggle("fo-akt", x.dataset.s === "cil"); }); }
    if (bylAi) return nacti();
    kresliUvodni(); kresliMrizku();
  });
  $("fo-mrizka").addEventListener("click", function (e) {
    var l = e.target.closest("button[data-lupa]"); if (l) { otevri(l.dataset.lupa); return; }
    var b = e.target.closest("button[data-soubor]"); if (!b) return;
    var s = b.dataset.soubor;
    if (sVyberem()) {
      var seznam = zobrazene().map(klic);
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
    if (t.dataset && t.dataset.ai && rezim === "ai") {
      var ids = Object.keys(vyber); if (!ids.length) return;
      t.disabled = true;
      try {
        if (t.dataset.ai === "prevzit") await prevzitFormaty(ids.map(aiPolozka).filter(Boolean));
        else await HBA.rpc("web_admin_fotky_ai_potvrdit", { p_fotky: ids, p_potvrzeno: t.dataset.ai === "potvrdit" });
        vyber = {}; posledni = null; await nacti(true);
      } catch (err) { t.disabled = false; $("fo-uvodni").insertAdjacentHTML("beforeend", '<span class="adm-chyba">' + HBA.esc(err.message) + "</span>"); }
      return;
    }
    if (t.id === "fo-vse") { zobrazene().forEach(function (x) { vyber[klic(x)] = 1; }); kresliUvodni(); kresliMrizku(); return; }
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
    if (t.dataset && (t.dataset.vitez || t.dataset.vitezSmazat) && rezim === "vitezove") {
      var kat = t.dataset.vitez || t.dataset.vitezSmazat;
      if (t.dataset.vitezSmazat && !confirm("Odebrat fotku z karty ročníku na webu? (fotka sama zůstane v galerii)")) return;
      t.disabled = true;
      try {
        await HBA.rpc("web_admin_fotka_vitezu", { p_rok: rokSel.value, p_soubor: t.dataset.vitez ? vybrana[0] : null, p_kategorie: kat });
        await nacti(true);
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
  var POMER = { feed: 4 / 5, story: 9 / 16, ctverec: 1, siroky: 1.91 }, NAZEV = { feed: "feed 4:5", story: "story 9:16", ctverec: "čtverec 1:1", siroky: "na šířku 1,91:1" };
  var dlg = $("fo-lb"), plocha = $("fo-lb-plocha"), lbImg = $("fo-lb-img"), ramec = $("fo-lb-ramec");
  var lb = { soubor: null, orez: null, r: null, chyba: "", uprava: null }, lbZmena = false, tah = null;
  function polozka(s) {
    if (rezim === "ai") return aiPolozka(s);
    return ((prehled && prehled.galerie) || []).filter(function (x) { return x[0] === s; })[0];
  }
  function ulozenyOrez(x, f) { return rezim === "ai" ? (x.ko || [])[FMT.indexOf(f)] || null : x[f === "feed" ? 5 : 6]; }
  function otevri(s) { lb.soubor = s; lb.orez = null; lb.chyba = ""; lb.uprava = null; kresliLb(); if (!dlg.open) dlg.showModal(); }
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
    var sez = zobrazene().map(klic), i = sez.indexOf(lb.soubor);
    var jmeno = rezim === "ai" ? x.s : x[0], nahled = rezim === "ai" ? x.n : x[1];
    dlg.classList.toggle("fo-lb-ai", rezim === "ai");
    $("fo-lb-panel").hidden = rezim !== "ai";
    if (lbImg.dataset.s !== nahled) { lbImg.dataset.s = nahled; lbImg.src = NAHLEDY + nahled; lbImg.alt = jmeno; }
    $("fo-lb-nazev").textContent = (rezim === "ai" ? x.r + " · " + x.s : x[0] + " · " + (SEKCE[x[2]] || "nezařazeno")) + (i >= 0 ? " · " + (i + 1) + " / " + sez.length : "");
    $("fo-lb-pred").disabled = !!lb.orez || i <= 0; $("fo-lb-dalsi").disabled = !!lb.orez || i < 0 || i >= sez.length - 1;
    var h = "", nap = "";
    if (lb.orez) {
      var ulozeny = ulozenyOrez(x, lb.orez);
      h = "<b>Výřez " + NAZEV[lb.orez] + '</b> <button type="button" class="adm-tlacitko" data-lb="ulozit">Uložit výřez</button>' +
        ' <button type="button" class="adm-tlacitko-male" data-lb="stred">Na střed</button>' +
        (rezim === "ai" && x.f && x.f[lb.orez] && x.f[lb.orez].x != null ? ' <button type="button" class="adm-tlacitko-male" data-lb="navrh">Podle návrhu AI</button>' : "") +
        (ulozeny ? ' <button type="button" class="adm-tlacitko-male" data-lb="smazat">Smazat výřez</button>' : "") +
        ' <button type="button" class="adm-tlacitko-male" data-lb="zpet">Zrušit</button>';
      nap = "Rámeček posuň tažením, roh ho zvětší nebo zmenší (poměr stran drží sám). Hlavní postavu, předávku nebo obličej dej na průsečík " +
        "bílých čar třetin, nech kus místa nad hlavou a ve směru běhu a neuřízni ruce ani nohy v kloubech." +
        (lb.orez === "story" ? " <b>Šrafované pruhy</b> (horních 14 % a spodních 20 %) u story zakryje rozhraní Instagramu a Facebooku (jméno účtu, pole na odpověď) – obličeje, logo ani text do nich nedávej." : "") +
        ' <span id="fo-lb-maly" hidden><b>Výřez je hodně malý</b> – z originálu může vyjít neostrý.</span>';
    } else if (rezim === "ai") {
      var va = jeVybrana(x.i);
      h = '<button type="button" class="' + (va ? "adm-tlacitko" : "adm-tlacitko-male") + '" data-lb="vyber">' + (va ? "✓ Ve výběru" : "Přidat do výběru") + "</button>";
      nap = "Šipky ← → přepínají fotky ve filtru, Esc zavře. Náhled má 768 px, hotový obrázek vznikne z originálu.";
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
    if (rezim === "ai") kresliPanel(x);
    if (lb.orez && !lb.r) lb.r = ulozenyOrez(x, lb.orez) || naStred(lb.orez);
    kresliRamec();
  }
  lbImg.addEventListener("load", function () { if (lb.orez) { if (!ulozenyOrez(polozka(lb.soubor), lb.orez)) lb.r = naStred(lb.orez); kresliRamec(); } });
  function posun(o) {
    var sez = zobrazene().map(klic), i = sez.indexOf(lb.soubor) + o;
    if (!lb.orez && !lb.uprava && i >= 0 && i < sez.length) { lb.soubor = sez[i]; lb.chyba = ""; kresliLb(); }
  }
  async function lbAkce(a) {
    var x = polozka(lb.soubor); lb.chyba = "";
    if (a === "zavrit") return dlg.close();
    if (a === "pred" || a === "dalsi") return posun(a === "pred" ? -1 : 1);
    if (a === "vyber") {
      var kx = klic(x);
      if (sVyberem()) { if (vyber[kx]) delete vyber[kx]; else vyber[kx] = 1; posledni = kx; }
      else vybrana = jeVybrana(x[0]) ? null : x;
      kresliUvodni(); kresliMrizku(); return kresliLb();
    }
    if (a.indexOf("orez-") === 0) { lb.orez = a.slice(5); lb.r = null; lb.uprava = null; return kresliLb(); }
    if (a === "zpet") { lb.orez = null; lb.r = null; return kresliLb(); }
    if (a === "stred") { lb.r = naStred(lb.orez); return kresliRamec(); }
    if (a === "navrh") { lb.r = navrhOrez(lb.orez, pomerFotky(), x.f[lb.orez].x); return kresliRamec(); }
    if (rezim === "ai" && await aiAkce(a, x)) return;
    try {
      if (a === "predavka") {
        await HBA.rpc("web_admin_fotky_predavka", { p_rok: rokSel.value, p_soubory: [x[0]], p_predavka: !x[7] });
        x[7] = !x[7];
      } else if (a === "feed" || a === "story") {
        var n = a === "feed" ? 3 : 4;
        await HBA.rpc("web_admin_fotky_kampan", { p_rok: rokSel.value, p_soubory: [x[0]], p_akce: x[n] ? "bez_" + a : a });
        x[n] = !x[n];
      } else if ((a === "ulozit" || a === "smazat") && rezim === "ai") {
        var ro = a === "ulozit" ? lb.r : null;
        await HBA.rpc("web_admin_fotky_formaty", { p: [{ fotka_id: x.i, format: lb.orez, zapnuto: ro ? true : null, orez: ro }] });
        var fi = FMT.indexOf(lb.orez); x.ko = x.ko || [null, null, null, null]; x.kv = x.kv || [false, false, false, false];
        x.ko[fi] = ro ? zaokrouhli(ro) : null; if (ro) x.kv[fi] = true;
        lb.orez = null; lb.r = null;
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
    if (e.target.closest && e.target.closest("input, select, textarea")) return;
    if (dlg.open && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); posun(e.key === "ArrowLeft" ? -1 : 1); }
  });
  dlg.addEventListener("close", function () { lb.orez = null; lb.r = null; lb.uprava = null; kresliRamec(); if (lbZmena) { lbZmena = false; if (rezim === "ai") kresliMrizku(); else nacti(true); } });
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

  // Výběr podle hodnocení AI (Keksa 15. 11. 2026, kritéria HB_znalosti_fotky_kriteria.md).
  // Data z web_admin_fotky_ai: i id, r ročník, s soubor, n náhled, k kategorie (první hlavní), h [H1..H5], sk skóre, d děti,
  // tb tabule, np nepoužitelné, lg logo jiné, dv datum vpálené, se série, z žádoucí, f návrh formátů {feed:{ok,x},…}, df důvod,
  // p popis, mz malý zdroj, ok potvrzeno, kv formáty v kampani [feed, story, čtverec, široký], ko výřezy, pu použití.
  // Použité fotky se jen označí, níž se neřadí (P3 neschváleno).
  var FMT = ["feed", "story", "ctverec", "siroky"], FMT_KRATKY = { feed: "4:5", story: "9:16", ctverec: "1:1", siroky: "1,91" };
  var KAT = { K1: "Předávka", K2: "Týmová chvíle v cíli", K3: "Běžec na trati", K4: "Portrét a emoce", K5: "Noc a čelovky",
    K6: "Krajina a trasa", K7: "Start a příprava", K8: "Fanoušci a podpora", K9: "Zákulisí", K10: "Týmová tabule" };
  var ZAD = { Z1: "interakce lidí", Z2: "čitelné číslo", Z3: "typické místo trasy", Z4: "noc nebo zvláštní světlo", Z5: "pestrost", Z6: "laskavý humor" };
  var HK = ["kvalita", "čitelnost", "týmovost", "emoce", "místo"];
  var KANALY = ["FB", "IG", "reklama", "web", "mail", "tisk"];
  var fa = { kat: {}, zobraz: "vhodne", min: 3.8, fmt: "", pouz: "", potv: "", rad: "skore" };
  function aiPolozka(id) { for (var n = 0; n < ai.length; n++) if (ai[n].i === id) return ai[n]; return null; }
  function vhodna(x) { return x.d === "ne" && !x.tb && !x.np && !x.lg && x.h[0] >= 4; }
  function zobrazeneAi() {
    var kat = Object.keys(fa.kat);
    var s = ai.filter(function (x) {
      if (fa.zobraz === "deti") { if (x.d !== "nejiste") return false; }
      else {
        if (fa.zobraz === "vhodne" && !vhodna(x)) return false;
        if (+x.sk < fa.min) return false;
      }
      if (kat.length && !(x.k || []).some(function (k) { return fa.kat[k]; })) return false;
      if (fa.fmt && !(x.f && x.f[fa.fmt] && x.f[fa.fmt].ok)) return false;
      if (fa.pouz && (fa.pouz === "ano") !== !!(x.pu && x.pu.length)) return false;
      if (fa.potv && (fa.potv === "ano") !== !!x.ok) return false;
      return true;
    });
    var zl = function (x) { return (x.z || []).length; };
    var abc = function (a, b) { return a.r < b.r ? -1 : a.r > b.r ? 1 : a.s < b.s ? -1 : a.s > b.s ? 1 : a.i < b.i ? -1 : a.i > b.i ? 1 : 0; };
    return s.sort(function (a, b) {
      if (fa.rad === "rok") return abc(a, b);
      if (fa.rad === "zadouci") return zl(b) - zl(a) || b.sk - a.sk || abc(a, b);
      return b.sk - a.sk || zl(b) - zl(a) || abc(a, b);
    });
  }
  function kresliMrizkuAi() {
    var z = zobrazeneAi();
    $("fo-ai-pocet").textContent = "Zobrazeno " + z.length + " z " + ai.length;
    $("fo-ai-kat").querySelectorAll("button[data-kat]").forEach(function (b) {
      var k = b.dataset.kat; b.classList.toggle("fo-akt", k ? !!fa.kat[k] : !Object.keys(fa.kat).length);
    });
    $("fo-mrizka").innerHTML = z.slice(0, zobrazitAi).map(function (x) {
      var zn = '<span class="fo-skore" title="Skóre (2×kvalita + čitelnost + 2×týmovost + 2×emoce + místo) / 8">' + (+x.sk).toFixed(1) + "</span>" +
        (x.ok ? '<span title="Hodnocení potvrzené">✓</span>' : "") +
        (x.d === "nejiste" ? '<span class="fo-varovani" title="Možná dítě – ručně zkontrolovat">děti?</span>' : x.d === "ano" ? '<span class="fo-varovani">dítě</span>' : "") +
        (x.pu && x.pu.length ? '<span class="fo-pouzito" title="' + HBA.esc(x.pu.map(popisPouziti).join("\n")) + '">použito ' + x.pu.length + "×</span>" : "") +
        FMT.map(function (f, n) { return x.kv && x.kv[n] ? "<span>" + FMT_KRATKY[f] + ((x.ko || [])[n] ? " ✂" : "") + "</span>" : ""; }).join("");
      var hl = (x.k || [])[0];
      return '<div class="fo-dlazdice"><button type="button" data-soubor="' + HBA.esc(x.i) + '" aria-pressed="' + !!vyber[x.i] + '" title="' + HBA.esc(x.r + " · " + x.s + (x.p ? " – " + x.p : "")) + '">' +
        '<img loading="lazy" src="' + HBA.esc(NAHLEDY + x.n) + '" alt="' + HBA.esc(x.s) + '">' +
        '<span class="fo-kampan">' + zn + "</span>" +
        '<span class="fo-stitek">' + HBA.esc(x.r) + (hl ? " · " + HBA.esc(KAT[hl] || hl) : "") + "</span></button>" +
        '<button type="button" class="fo-lupa" data-lupa="' + HBA.esc(x.i) + '" title="Zvětšit" aria-label="Zvětšit ' + HBA.esc(x.s) + '">⤢</button></div>';
    }).join("") + (z.length > zobrazitAi ? '<p class="fo-dalsi"><button type="button" class="adm-tlacitko-male" id="fo-ai-dalsi">Ukázat dalších ' + Math.min(200, z.length - zobrazitAi) + " (zbývá " + (z.length - zobrazitAi) + ")</button></p>" : "") ||
      '<p class="adm-sub">' + (ai.length ? "Ve filtru nic není." : "Ročník nemá žádné fotky s hodnocením AI.") + "</p>";
  }
  var zobrazitAi = 200;
  function popisPouziti(u) {
    return (u.d ? new Date(u.d).toLocaleDateString("cs-CZ") : "datum nezjištěno") + " · " + u.k + (u.p ? " · " + u.p : "") + (u.ok ? "" : " (nepotvrzeno)");
  }
  $("fo-mrizka").addEventListener("click", function (e) {
    if (e.target.id === "fo-ai-dalsi") { zobrazitAi += 200; kresliMrizkuAi(); }
  });
  $("fo-ai-kat").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-kat]"); if (!b) return;
    if (!b.dataset.kat) fa.kat = {}; else if (fa.kat[b.dataset.kat]) delete fa.kat[b.dataset.kat]; else fa.kat[b.dataset.kat] = 1;
    zobrazitAi = 200; kresliMrizkuAi();
  });
  $("fo-ai-volby").addEventListener("change", function (e) {
    var t = e.target; if (!t.dataset.fa) return;
    fa[t.dataset.fa] = t.dataset.fa === "min" ? (parseFloat(String(t.value).replace(",", ".")) || 0) : t.value;
    $("fo-ai-min").disabled = fa.zobraz === "deti";
    zobrazitAi = 200; kresliMrizkuAi();
  });

  // Návrh výřezu: celá výška (nebo šířka) fotky, vodorovný střed podle návrhu AI (x), bez x na střed.
  function navrhOrez(f, a, xc) {
    var A = POMER[f];
    if (A < a) {
      var w = A / a, x0 = xc == null ? (1 - w) / 2 : Math.min(Math.max(xc - w / 2, 0), 1 - w);
      return { x: x0, y: 0, w: w, h: 1 };
    }
    var h = a / A; return { x: 0, y: (1 - h) / 2, w: 1, h: h };
  }
  function zaokrouhli(r) { var o = {}; ["x", "y", "w", "h"].forEach(function (k) { o[k] = Math.round(r[k] * 10000) / 10000; }); return o; }
  function pomerNahledu(x) {
    return new Promise(function (ok) {
      var im = new Image();
      im.onload = function () { ok(im.naturalWidth / im.naturalHeight); };
      im.onerror = function () { ok(null); };
      im.src = NAHLEDY + x.n;
    });
  }
  // Převzetí návrhu: formáty, které AI označila jako vhodné, se zapnou. Výřez se doplní jen tam, kde ještě žádný není
  // (ruční výřez se nepřepíše) a kde AI navrhla střed; bez návrhu středu zůstane výřez na střed.
  async function prevzitFormaty(fotky) {
    var zmeny = [];
    var pomery = await Promise.all(fotky.map(pomerNahledu));
    fotky.forEach(function (x, n) {
      FMT.forEach(function (f, fi) {
        var nv = x.f && x.f[f]; if (!nv || !nv.ok) return;
        var z = { fotka_id: x.i, format: f, zapnuto: true };
        if (!(x.ko || [])[fi] && nv.x != null && pomery[n]) z.orez = zaokrouhli(navrhOrez(f, pomery[n], nv.x));
        zmeny.push(z);
      });
    });
    if (!zmeny.length) throw new Error("Vybrané fotky nemají žádný vhodný formát.");
    await HBA.rpc("web_admin_fotky_formaty", { p: zmeny });
    zmeny.forEach(function (z) {
      var x = aiPolozka(z.fotka_id), fi = FMT.indexOf(z.format);
      x.kv = x.kv || [false, false, false, false]; x.ko = x.ko || [null, null, null, null];
      x.kv[fi] = true; if (z.orez) x.ko[fi] = z.orez;
    });
  }

  function kresliPanel(x) {
    var p = $("fo-lb-panel"), h = "", u = lb.uprava;
    h += '<div class="fo-ai-blok"><div class="fo-ai-hlava"><b class="fo-ai-skore">' + (+x.sk).toFixed(1) + "</b> skóre " +
      (x.ok ? '<span class="fo-ai-stav fo-ai-ok">✓ potvrzeno</span>' : '<span class="fo-ai-stav">návrh AI</span>') + "</div>";
    if (u) {
      h += '<p class="fo-ai-pozn">Klikáním zvol 1 až 3 kategorie, první zvolená je hlavní.</p><div class="fo-ai-kat">' +
        Object.keys(KAT).map(function (k) {
          var i = u.k.indexOf(k);
          return '<button type="button" data-lb="kat-' + k + '" class="' + (i >= 0 ? "fo-akt" : "") + '">' + (i === 0 ? "★ " : "") + KAT[k] + "</button>";
        }).join("") + "</div>" +
        '<div class="fo-ai-h">' + HK.map(function (n, i) {
          return "<label>" + n + ' <select data-uprava="h' + (i + 1) + '">' + [1, 2, 3, 4, 5].map(function (v) { return "<option" + (u.h[i] === v ? " selected" : "") + ">" + v + "</option>"; }).join("") + "</select></label>";
        }).join("") + "</div>" +
        '<div class="fo-ai-h"><label>Děti <select data-uprava="deti">' + [["ne", "ne"], ["nejiste", "nejisté"], ["ano", "ano"]].map(function (o) { return '<option value="' + o[0] + '"' + (u.d === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" +
        [["tb", "tabule"], ["np", "nepoužitelná"], ["lg", "logo jiné akce"], ["dv", "vpálené datum"]].map(function (o) {
          return '<label><input type="checkbox" data-uprava="' + o[0] + '"' + (u[o[0]] ? " checked" : "") + "> " + o[1] + "</label>";
        }).join("") + "</div>" +
        '<p><button type="button" class="adm-tlacitko" data-lb="ai-ulozit">Uložit a potvrdit</button> <button type="button" class="adm-tlacitko-male" data-lb="ai-zrusit">Zrušit</button></p>';
    } else {
      h += '<p class="fo-ai-h-radek">' + HK.map(function (n, i) { return n + " <b>" + x.h[i] + "</b>"; }).join(" · ") + "</p>" +
        '<p class="fo-ai-kat">' + (x.k || []).map(function (k, i) { return '<span class="' + (i ? "" : "fo-hlavni") + '">' + HBA.esc(KAT[k] || k) + "</span>"; }).join("") + "</p>" +
        (x.p ? '<p class="fo-ai-popis">' + HBA.esc(x.p) + "</p>" : "") +
        ((x.z || []).length ? '<p class="fo-ai-pozn">Žádoucí: ' + x.z.map(function (z) { return HBA.esc(ZAD[z] || z); }).join(", ") + "</p>" : "");
      var var_ = [];
      if (x.d === "ano") var_.push("na fotce je dítě"); if (x.d === "nejiste") var_.push("možná dítě – zkontroluj");
      if (x.tb) var_.push("týmová tabule"); if (x.np) var_.push("technicky nepoužitelná"); if (x.lg) var_.push("logo jiné akce");
      if (x.dv) var_.push("vpálené datum"); if (x.mz) var_.push("malé rozlišení zdroje"); if (x.se) var_.push("série s " + x.se);
      if (var_.length) h += '<p class="fo-ai-var">' + HBA.esc(var_.join(" · ")) + "</p>";
      h += "<p>" + (x.ok ? '<button type="button" class="adm-tlacitko-male" data-lb="ai-nepotvrdit">Zrušit potvrzení</button>'
        : '<button type="button" class="adm-tlacitko" data-lb="ai-potvrdit">Potvrdit návrh</button>') +
        ' <button type="button" class="adm-tlacitko-male" data-lb="ai-upravit">Upravit hodnocení</button></p>';
    }
    h += "</div>";
    // formáty
    h += '<div class="fo-ai-blok"><h3>Formáty</h3><table class="fo-ai-fmt"><tr><th></th><th>návrh AI</th><th>v kampani</th><th>výřez</th></tr>' +
      FMT.map(function (f, n) {
        var nv = x.f && x.f[f], ok = nv && nv.ok, v = x.kv && x.kv[n];
        return "<tr><td>" + NAZEV[f] + "</td><td>" + (ok ? '<span class="fo-ano">vhodný</span>' : '<span class="fo-ne">ne</span>') + "</td>" +
          '<td><button type="button" class="' + (v ? "adm-tlacitko" : "adm-tlacitko-male") + '" data-lb="fmt-' + f + '">' + (v ? "✓ ano" : "přidat") + "</button></td>" +
          '<td><button type="button" class="adm-tlacitko-male" data-lb="orez-' + f + '">' + ((x.ko || [])[n] ? "✂ upravit" : "nastavit") + "</button></td></tr>";
      }).join("") + "</table>" +
      (x.df ? '<p class="fo-ai-pozn">Důvod: ' + HBA.esc(x.df) + "</p>" : "") +
      '<p><button type="button" class="adm-tlacitko" data-lb="prevzit">Převzít navržené formáty</button></p></div>';
    // použití
    h += '<div class="fo-ai-blok"><h3>Kde už byla použitá</h3>' +
      ((x.pu || []).length ? '<ul class="fo-ai-pu">' + x.pu.map(function (u) {
        return "<li>" + HBA.esc(popisPouziti(u)) + (u.o ? ' · <a href="' + HBA.esc(u.o) + '" target="_blank" rel="noopener">odkaz</a>' : "") +
          (u.ok ? "" : ' <button type="button" class="adm-tlacitko-male" data-lb="pu-potvrdit-' + u.id + '">Potvrdit</button>') +
          ' <button type="button" class="adm-tlacitko-male" data-lb="pu-smazat-' + u.id + '">Smazat</button></li>';
      }).join("") + "</ul>" : '<p class="fo-ai-pozn">Zatím nikde.</p>') +
      '<div class="fo-ai-pridat"><input type="date" id="fo-pu-datum" aria-label="Datum použití">' +
      '<select id="fo-pu-kanal" aria-label="Kanál"><option value="">kanál…</option>' + KANALY.map(function (k) { return "<option>" + k + "</option>"; }).join("") + "</select>" +
      '<input type="url" id="fo-pu-odkaz" placeholder="odkaz (nepovinný)" aria-label="Odkaz">' +
      '<input id="fo-pu-pozn" placeholder="poznámka (nepovinná)" aria-label="Poznámka">' +
      '<button type="button" class="adm-tlacitko" data-lb="pu-pridat">Přidat použití</button></div></div>';
    p.innerHTML = h;
  }
  $("fo-lb-panel").addEventListener("change", function (e) {
    var t = e.target, k = t.dataset.uprava; if (!k || !lb.uprava) return;
    if (k[0] === "h" && k.length === 2) lb.uprava.h[+k[1] - 1] = +t.value;
    else if (k === "deti") lb.uprava.d = t.value;
    else lb.uprava[k] = t.checked;
  });
  // Akce v panelu u fotky; vrací true, když akci obsloužila.
  async function aiAkce(a, x) {
    if (a === "ai-upravit") { lb.uprava = { k: (x.k || []).slice(), h: x.h.slice(), d: x.d, tb: !!x.tb, np: !!x.np, lg: !!x.lg, dv: !!x.dv }; kresliLb(); return true; }
    if (a === "ai-zrusit") { lb.uprava = null; kresliLb(); return true; }
    if (a.indexOf("kat-") === 0 && lb.uprava) {
      var k = a.slice(4), i = lb.uprava.k.indexOf(k);
      if (i >= 0) lb.uprava.k.splice(i, 1); else if (lb.uprava.k.length < 3) lb.uprava.k.push(k);
      kresliLb(); return true;
    }
    var hotovo = ["ai-ulozit", "ai-potvrdit", "ai-nepotvrdit", "prevzit", "pu-pridat"].indexOf(a) >= 0 || /^(fmt|pu-potvrdit|pu-smazat)-/.test(a);
    if (!hotovo) return false;
    try {
      if (a === "ai-ulozit") {
        var u = lb.uprava;
        if (!u.k.length) throw new Error("Zvol aspoň jednu kategorii.");
        var r = await HBA.rpc("web_admin_fotka_ai_upravit", { p_fotka: x.i, p: { kategorie: u.k, h1: u.h[0], h2: u.h[1], h3: u.h[2], h4: u.h[3], h5: u.h[4],
          deti: u.d, tabule: u.tb, nepouzitelne: u.np, logo_jine: u.lg, datum_vpalene: u.dv } });
        Object.keys(r).forEach(function (k) { x[k] = r[k]; }); lb.uprava = null;
      } else if (a === "ai-potvrdit" || a === "ai-nepotvrdit") {
        await HBA.rpc("web_admin_fotky_ai_potvrdit", { p_fotky: [x.i], p_potvrzeno: a === "ai-potvrdit" });
        x.ok = a === "ai-potvrdit";
      } else if (a === "prevzit") {
        await prevzitFormaty([x]);
      } else if (a.indexOf("fmt-") === 0) {
        var f = a.slice(4), fi = FMT.indexOf(f); x.kv = x.kv || [false, false, false, false];
        await HBA.rpc("web_admin_fotky_formaty", { p: [{ fotka_id: x.i, format: f, zapnuto: !x.kv[fi] }] });
        x.kv[fi] = !x.kv[fi];
      } else if (a === "pu-pridat") {
        x.pu = await HBA.rpc("web_admin_fotka_pouziti", { p_akce: "pridat", p: { fotka_id: x.i, datum: $("fo-pu-datum").value || null,
          kanal: $("fo-pu-kanal").value, odkaz: $("fo-pu-odkaz").value, poznamka: $("fo-pu-pozn").value } });
      } else {
        var m = /^pu-(potvrdit|smazat)-(\d+)$/.exec(a);
        if (m[1] === "smazat" && !confirm("Smazat tento záznam o použití fotky?")) return true;
        x.pu = await HBA.rpc("web_admin_fotka_pouziti", { p_akce: m[1], p: { id: +m[2] } });
      }
      lbZmena = true;
    } catch (err) { lb.chyba = err.message; }
    kresliMrizku(); kresliLb(); return true;
  }

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

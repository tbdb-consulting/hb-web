// Kapitánská sekce – přidání běžce, krok B „Údaje běžce“ (a úprava běžce ze soupisky).
// ?id=… úprava, ?z=historie vybraný člověk z minulých ročníků (předaný ze stránky Kdo poběží?), ?novy=1 nový běžec.
// Povinné je vše kromě poznámky; po uložení se jde zpět na soupisku (Keksa 4. 10. 2026).
(function () {
  var e = HBK.esc;
  var t = HBK.t, tf = HBK.tf;
  var P = null, KRAJE = [], VELIKOSTI = [], UPRAVUJI = null, ZDROJ = null;
  var param = new URLSearchParams(location.search);

  function vyber(id, moznosti, hodnota) {
    return '<select id="' + id + '"><option value="">' + t("— vyber —") + "</option>" + moznosti.map(function (m) {
      return '<option value="' + e(m[0]) + '"' + (m[0] === hodnota ? " selected" : "") + ">" + e(m[1]) + "</option>"; }).join("") + "</select>";
  }

  function formular(r) {
    var ja = r && r.jsem_to_ja && P.role === "bezec";
    r = r || {};
    return (ZDROJ ? '<p class="k-zdroj">' + e(tf("Vyplněno z ročníku {0}:", ZDROJ.rocnik)) + " <b>" + e(ZDROJ.jmeno) + "</b>. " +
        (ZDROJ.vykonnost_skutecna ? e(tf("Zkontroluj údaje, do času na 10 km jsme dali skutečnou výkonnost z {0}.", ZDROJ.skutecna_rocnik)) : t("Zkontroluj údaje.")) +
        (ZDROJ.roky && ZDROJ.roky.length ? '<span class="k-roky"><span class="k-roky-titulek">' + t("Výkonnost na 10 km v minulých ročnících:") + "</span>" +
          HBK.rokyVykonnosti(ZDROJ.roky).map(function (x) { return "<span>" + x + "</span>"; }).join("") + "</span>" : "") + "</p>" : "") +
      '<form class="k-karta" id="k-form" novalidate><div class="k-formular">' +
      '<label class="k-pole" for="f-jmeno">' + t("Jméno") + ' *<input id="f-jmeno" value="' + e(r.jmeno || "") + '" required></label>' +
      '<label class="k-pole" for="f-prijmeni">' + t("Příjmení") + ' *<input id="f-prijmeni" value="' + e(r.prijmeni || "") + '" required></label>' +
      '<label class="k-pole" for="f-email">' + t("E-mail") + ' *<input id="f-email" type="email" value="' + e(r.email || "") + '"' + (ja ? " disabled" : "") + " required>" +
        (ja ? "<small>" + t("E-mail změní kapitán.") + "</small>" : "<small>" + t("Na něj přijde běžci odkaz do sekce.") + "</small>") + "</label>" +
      '<label class="k-pole" for="f-telefon">' + t("Telefon") + ' *<input id="f-telefon" type="tel" value="' + e(r.telefon || "") + '" required><small>' + t("Např. 777 123 456.") + "</small></label>" +
      '<label class="k-pole" for="f-rok">' + t("Rok narození") + ' *<input id="f-rok" inputmode="numeric" maxlength="4" value="' + e(r.rok_narozeni || "") + '" required><small>' + t("Např. 1990.") + "</small></label>" +
      '<label class="k-pole" for="f-pohlavi">' + t("Pohlaví") + " *" + vyber("f-pohlavi", [["zena", t("žena")], ["muz", t("muž")], ["jine", t("jiné")]], r.pohlavi) + "</label>" +
      '<label class="k-pole" for="f-kraj">' + t("Kraj") + " *" + vyber("f-kraj", KRAJE.map(function (k) { return [k.kod, k.nazev]; }), r.kraj) + "</label>" +
      '<label class="k-pole" for="f-mesto">' + t("Město") + ' *<input id="f-mesto" value="' + e(r.mesto || "") + '" required></label>' +
      '<label class="k-pole" for="f-velikost">' + t("Velikost trička") + " *" + vyber("f-velikost", VELIKOSTI.map(function (v) { return [v.rada + "|" + v.kod, t(v.rada) + " " + v.kod]; }),
        r.velikost ? r.velikost_rada + "|" + r.velikost : "") + "</label>" +
      '<label class="k-pole" for="f-vykonnost">' + t("Čas na 10 km") + ' *<input id="f-vykonnost" value="' + e(HBK.vykonnost(r.vykonnost_10km)) + '" inputmode="decimal" required>' +
        "<small>" + t("Napiš 52:30 (minuty:sekundy), nebo 1:02:30, když ti 10 km trvá přes hodinu. Jde i 52.30. Čas na rovině v závodním tempu.") + "</small></label>" +
      '<details class="k-proc k-cela-sirka" id="k-proc" hidden><summary>' + t("Proč zadat čas na 10 km co nejpřesněji") + '</summary><div class="k-text" id="k-proc-text"></div></details>' +
      '<label class="k-pole" for="f-poznamka">' + t("Poznámka") + '<input id="f-poznamka" value="' + e(r.poznamka || "") + '"></label>' +
      "</div>" +
      '<p class="pocet">' + t("Pole s hvězdičkou jsou povinná. Rozepsané údaje si tenhle prohlížeč pamatuje, dokud běžce neuložíš.") + "</p>" +
      '<div class="k-akce k-akce-hlavni"><button type="submit" class="k-tlacitko k-tlacitko-s-napovedou">' +
        (UPRAVUJI ? t("Uložit změny") : t("Přidat na soupisku")) + "<small>" + t("Uloží běžce a vrátí tě na soupisku.") + "</small></button></div>" +
      '<p class="k-hlaska" id="k-hlaska" role="status"></p></form>';
  }

  async function nactiText() {
    try {
      var tx = await HBK.db("web_texty?select=web_texty_preklady(titulek,obsah,jazyk)&kod=eq.kapitan_vykonnost_proc");
      var pr = tx[0] && tx[0].web_texty_preklady || [];
      var jen = function (j) { return pr.filter(function (x) { return x.jazyk === j; })[0]; };
      var p = (HBK.en && jen("en")) || jen("cs");
      if (p) { document.getElementById("k-proc-text").innerHTML = p.obsah; document.getElementById("k-proc").hidden = false; }  // text z redakce webu
    } catch (err) {}
  }

  // Doplnění z minulých ročníků: rozdělí jméno, najde kraj a velikost v číselníku.
  function zHistorie(h) {
    var j = String(h.jmeno || "").trim(), mezera = j.lastIndexOf(" ");
    var kraj = KRAJE.filter(function (k) { return k.kod === h.kraj || k.nazev === h.kraj; })[0];
    var vel = VELIKOSTI.filter(function (v) { return (v.rada + " " + v.kod).toLowerCase() === String(h.velikost || "").toLowerCase(); })[0];
    return { jmeno: mezera > 0 ? j.slice(0, mezera) : j, prijmeni: mezera > 0 ? j.slice(mezera + 1) : "", email: h.email, telefon: h.telefon,
      rok_narozeni: h.rok_narozeni, pohlavi: h.pohlavi, kraj: kraj ? kraj.kod : "", mesto: h.mesto,
      velikost_rada: vel ? vel.rada : null, velikost: vel ? vel.kod : null, vykonnost_10km: h.vykonnost_skutecna || h.vykonnost_10km };
  }

  // čas na 10 km: tečka, čárka i mezera jako oddělovač, samotné číslo = celé minuty (52 → 52:00)
  function normCas(v) {
    v = String(v || "").trim().replace(/[.,\s]+/g, ":");
    return /^\d{1,3}$/.test(v) ? v + ":00" : v;
  }
  function hodnota(id) { var el = document.getElementById(id); return el && !el.disabled ? el.value.trim() : null; }
  var POVINNE = [["f-jmeno", t("Vyplň jméno.")], ["f-prijmeni", t("Vyplň příjmení.")], ["f-email", t("Vyplň e-mail.")], ["f-telefon", t("Vyplň telefon.")],
    ["f-rok", t("Vyplň rok narození.")], ["f-pohlavi", t("Vyber pohlaví.")], ["f-kraj", t("Vyber kraj.")], ["f-mesto", t("Vyplň město.")],
    ["f-velikost", t("Vyber velikost trička.")], ["f-vykonnost", t("Vyplň čas na 10 km.")]];
  function oznac(id, text) {
    var el = document.getElementById(id); if (!el) return;
    var lab = el.closest(".k-pole"), m = lab.querySelector(".k-chyba-pole");
    el.classList.toggle("k-chybi", !!text); el.setAttribute("aria-invalid", text ? "true" : "false");
    if (text) { if (!m) { m = document.createElement("small"); m.className = "k-chyba-pole"; lab.appendChild(m); } m.textContent = text; }
    else if (m) m.remove();
  }
  function zkontroluj(tise) {
    var chyby = [], rok = hodnota("f-rok"), v = hodnota("f-vykonnost"), em = hodnota("f-email"), letos = new Date().getFullYear();
    POVINNE.forEach(function (p) {
      var el = document.getElementById(p[0]), txt = el && !el.disabled && !el.value.trim() ? (tise ? t("Chybí, doplň.") : p[1]) : "";
      oznac(p[0], txt); if (txt) chyby.push(p[0]);
    });
    if (rok && !/^\d{4}$/.test(rok)) { oznac("f-rok", t("Rok narození napiš čtyřmi číslicemi, např. 1990.")); chyby.push("f-rok"); }
    else if (rok && (Number(rok) < 1930 || Number(rok) > letos - 10)) { oznac("f-rok", t("Zkontroluj rok, běžci musí být aspoň 10 let.")); chyby.push("f-rok"); }
    if (v && !/^(\d{1,2}:)?\d{1,3}:\d{2}$/.test(normCas(v))) { oznac("f-vykonnost", t("Napiš čas jako minuty:sekundy, např. 52:30.")); chyby.push("f-vykonnost"); }
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { oznac("f-email", t("E-mail napiš ve tvaru jmeno@domena.cz.")); chyby.push("f-email"); }
    if (chyby.length && !tise) { var prvni = document.getElementById(chyby[0]); prvni.focus(); prvni.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return !chyby.length;
  }
  function opravPole(ev) { var c = ev.target; if (c && c.classList && c.classList.contains("k-chybi") && String(c.value).trim()) oznac(c.id, ""); }
  document.addEventListener("input", opravPole);
  document.addEventListener("change", opravPole);

  // Rozepsané údaje: ukládají se průběžně do prohlížeče, po návratu se vrátí do formuláře (Keksa 5. 10. 2026).
  var POLE = ["f-jmeno", "f-prijmeni", "f-email", "f-telefon", "f-rok", "f-pohlavi", "f-kraj", "f-mesto", "f-velikost", "f-vykonnost", "f-poznamka"];
  var KLIC = null, VYCHOZI = "", ODESLANO = false;
  function hodnoty() { var o = {}; POLE.forEach(function (id) { var el = document.getElementById(id); if (el) o[id] = el.value; }); return o; }
  function rozepsano() { return !!document.getElementById("k-form") && !ODESLANO && JSON.stringify(hodnoty()) !== VYCHOZI; }
  function ulozKoncept() {
    if (!KLIC || ODESLANO) return;
    if (!rozepsano()) { HBK.konceptZahod(KLIC); return; }
    var h = hodnoty();
    HBK.konceptUloz(KLIC, { cas: Date.now(), id: UPRAVUJI, jmeno: (h["f-jmeno"] + " " + h["f-prijmeni"]).trim(), h: h, zdroj: ZDROJ });
  }
  function onZmena(ev) { if (ev.target && ev.target.closest && ev.target.closest("#k-form")) ulozKoncept(); }
  document.addEventListener("input", onZmena);
  document.addEventListener("change", onZmena);
  document.addEventListener("click", function (ev) {
    if (ev.target && ev.target.id === "k-koncept-zahodit") {
      HBK.konceptZahod(KLIC); ODESLANO = true;
      location.replace(location.pathname + (UPRAVUJI ? "?id=" + UPRAVUJI : "?novy=1"));
    }
  });
  // Odchod z rozepsaného formuláře (odkaz, krok, Zpět, Odhlásit): zeptá se; koncept zůstane uložený.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[href], #k-odhlasit");
    if (!a || a.target === "_blank" || ev.ctrlKey || ev.metaKey || ev.shiftKey || !rozepsano()) return;
    if (a.id !== "k-odhlasit" && (a.getAttribute("href") || "").charAt(0) === "#") return;
    ulozKoncept();
    if (!confirm(t("Běžec ještě není uložený na soupisce. Rozepsané údaje si tenhle prohlížeč zapamatuje a najdeš je tu, až se vrátíš. Odejít?"))) {
      ev.preventDefault(); ev.stopPropagation();
    }
  }, true);

  document.addEventListener("submit", async function (ev) {
    if (ev.target.id !== "k-form") return;
    ev.preventDefault();
    if (!zkontroluj()) { HBK.hlaska("k-hlaska", t("Doplň označená pole."), true); return; }
    var b = ev.target.querySelector("button[type=submit]"); b.disabled = true;
    var vel = hodnota("f-velikost") || "", rok = hodnota("f-rok");
    var data = {
      p_jmeno: hodnota("f-jmeno"), p_prijmeni: hodnota("f-prijmeni"), p_email: hodnota("f-email"), p_telefon: hodnota("f-telefon"),
      p_rok_narozeni: rok ? Number(rok) : null, p_pohlavi: hodnota("f-pohlavi"), p_kraj: hodnota("f-kraj"), p_mesto: hodnota("f-mesto"),
      p_velikost_rada: vel ? vel.split("|")[0] : "", p_velikost: vel ? vel.split("|")[1] : "",
      p_vykonnost: normCas(hodnota("f-vykonnost")), p_poznamka: hodnota("f-poznamka")
    };
    try {
      var id;
      if (UPRAVUJI) { data.p_soupiska = UPRAVUJI; await HBK.rpc("web_k_uprav_bezce", data); id = UPRAVUJI; HBK.hlaskaDal(tf("Uloženo: {0}", data.p_jmeno + " " + data.p_prijmeni), id); }
      else { var novy = await HBK.rpc("web_k_pridej_bezce", data); id = novy && novy.soupiska_id; HBK.hlaskaDal(tf("{0} je na soupisce.", data.p_jmeno + " " + data.p_prijmeni), id); }
      try { sessionStorage.removeItem("hb_k_vybrany"); } catch (err) {}
      ODESLANO = true; HBK.konceptZahod(KLIC);
      location.href = HB.zaklad + HBK.adresa("/kapitan/soupiska/");
    } catch (err) { HBK.hlaska("k-hlaska", err.message, true); b.disabled = false; }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    var obsah = document.getElementById("k-obsah");
    try {
      var v = await Promise.all([
        HBK.rpc("web_k_soupiska"),
        HBK.db("web_kraj?select=kod,nazev&aktivni=eq.true&order=poradi"),
        HBK.db("velikosti?select=rada,kod,poradi&aktivni=eq.true&order=rada,poradi")
      ]);
      KRAJE = v[1] || []; VELIKOSTI = v[2] || [];
      var r = null;
      if (param.get("id")) {
        UPRAVUJI = Number(param.get("id"));
        r = (v[0] || []).filter(function (x) { return x.soupiska_id === UPRAVUJI; })[0];
        if (!r) { obsah.innerHTML = '<p class="k-chyba">' + t("Tenhle běžec na soupisce tvého týmu není.") + "</p>"; return; }
        document.querySelector("h1").textContent = tf("Údaje běžce: {0}", r.jmeno + " " + r.prijmeni);
      } else if (param.get("z") === "historie") {
        try { ZDROJ = JSON.parse(sessionStorage.getItem("hb_k_vybrany") || "null"); } catch (err) { ZDROJ = null; }
        if (ZDROJ) r = zHistorie(ZDROJ);
      }
      KLIC = HBK.konceptKlic(P.tym_id, UPRAVUJI);
      var koncept = HBK.konceptNacti(KLIC);
      // u výběru z historie vrátit koncept jen ke stejnému člověku; jinak by přepsal právě vybraného
      if (koncept && param.get("z") === "historie" && String((koncept.zdroj || {}).email || "") !== String((ZDROJ || {}).email || "")) koncept = null;
      if (koncept && !UPRAVUJI && !ZDROJ && koncept.zdroj) ZDROJ = koncept.zdroj;
      HBK.navigace(P, UPRAVUJI ? { zpet: { n: t("Soupiska"), url: "/kapitan/soupiska/", hint: t("Bez uložení změn.") } }
                               : { zpet: { n: t("Kdo poběží?"), url: "/kapitan/bezec/", hint: t("Vybrat někoho jiného.") } });
      if (!P.soupiska_otevrena) { obsah.innerHTML = '<p class="k-pozn">' + t("Soupiska je uzavřená. Změny řeší pořadatel na info@horybory.cz.") + "</p>"; return; }
      obsah.innerHTML = formular(r);
      VYCHOZI = JSON.stringify(hodnoty());
      if (koncept) {
        POLE.forEach(function (id) { var el = document.getElementById(id); if (el && !el.disabled && koncept.h[id] != null) el.value = koncept.h[id]; });
        var pozn = document.createElement("p"); pozn.className = "k-koncept"; pozn.setAttribute("role", "status");
        pozn.innerHTML = e(tf("Vrátili jsme sem rozepsané údaje z {0}. Běžec zatím není uložený, dokonči to tlačítkem dole.", HBK.cas(new Date(koncept.cas).toISOString()))) + " " +
          '<button type="button" class="k-odkaz" id="k-koncept-zahodit">' + t("Zahodit rozepsané a začít znovu") + "</button>";
        obsah.insertBefore(pozn, obsah.firstChild);
      }
      if (r || koncept) zkontroluj(true);   // co v historii nebo u běžce chybí, je hned vidět
      nactiText();
    } catch (err) { obsah.innerHTML = '<p class="k-chyba">' + e(err.message) + "</p>"; }
  });
})();

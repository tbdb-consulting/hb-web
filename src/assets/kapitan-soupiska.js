// Kapitánská sekce – krok 2: soupiska. Jen tabulka běžců, tlačítko „Přidat běžce“ a upozornění na chybějící údaje.
// Přidání a úprava běžce mají vlastní stránky (Kdo poběží? → Údaje běžce), Keksa 4. 10. 2026.
(function () {
  var e = HBK.esc;
  var t = HBK.t, tf = HBK.tf;
  var P = null, RADKY = [], KRAJE = [];
  var POHLAVI = { zena: t("žena"), muz: t("muž"), jine: t("jiné") };

  function kraj(kod) { var k = KRAJE.filter(function (x) { return x.kod === kod; })[0]; return k ? k.nazev : (kod || ""); }
  function chybi(r) {
    return [[r.rok_narozeni, t("rok narození")], [r.pohlavi, t("pohlaví")], [r.kraj, t("kraj")], [r.mesto, t("město")], [r.velikost, t("tričko")], [r.vykonnost_10km, t("čas na 10 km")]]
      .filter(function (x) { return !x[0]; }).map(function (x) { return x[1]; });
  }
  function neuplny(r) { return !r.rok_narozeni || !r.pohlavi || !r.kraj || !r.mesto || !r.velikost || !r.vykonnost_10km; }

  function tabulka() {
    var vede = P.role !== "bezec", otevreno = P.soupiska_otevrena;
    if (!RADKY.length) return '<p class="prazdno">' + t("Na soupisce zatím nikdo není.") + "</p>";
    return '<div class="k-tabulka-obal"><table class="k-tabulka k-karty-mobil"><thead><tr>' +
      "<th>" + t("Číslo") + "</th><th>" + t("Jméno") + "</th>" + (vede ? "<th>" + t("Kontakt") + "</th>" : "") +
      "<th>" + t("Rok narození") + "</th><th>" + t("Pohlaví") + "</th><th>" + t("Kraj, město") + "</th><th>" + t("Velikost trička") + "</th><th>" + t("Čas na 10 km") + "</th><th>" + t("Etapy") + "</th><th></th></tr></thead><tbody>" +
      RADKY.map(function (r) {
        var akce = "";
        if (otevreno && r.muzu_upravit) akce += '<a class="k-vedlejsi' + (neuplny(r) ? " k-doplnit" : "") + '" href="' + HB.zaklad + HBK.adresa("/kapitan/bezec/udaje/?id=" + r.soupiska_id) + '">' + (neuplny(r) ? t("Doplnit") : t("Upravit")) + "</a>";
        if (otevreno && vede && !P.pocet_potvrzen) akce += '<button type="button" class="k-vedlejsi k-odebrat" data-odebrat="' + r.soupiska_id + '">' + t("Odebrat") + "</button>";
        return '<tr data-radek="' + r.soupiska_id + '"' + (neuplny(r) ? ' class="k-neuplny" title="' + t("Chybí povinné údaje, doplň je") + '"' : "") + '><td class="k-cislo" data-popis="' + t("Číslo") + '">' + e(r.startovni_cislo) + '</td><td class="k-jmeno-bunka">' +
          e(r.jmeno + " " + r.prijmeni) + (r.jsem_to_ja ? " <small>(" + t("ty") + ")</small>" : "") +
          (neuplny(r) ? '<small class="k-chybi-udaje">' + t("Chybí:") + " " + e(chybi(r).join(", ")) + "</small>" : "") + "</td>" +
          (vede ? '<td class="k-zalom" data-popis="' + t("Kontakt") + '">' + e(r.email || "") + (r.telefon ? '<br><span class="k-nezalom">' + e(r.telefon) + "</span>" : "") + "</td>" : "") +
          '<td data-popis="' + t("Rok narození") + '">' + e(r.rok_narozeni || "") + '</td><td data-popis="' + t("Pohlaví") + '">' + e(POHLAVI[r.pohlavi] || "") + "</td>" +
          '<td data-popis="' + t("Kraj, město") + '">' + e([kraj(r.kraj), r.mesto].filter(Boolean).join(", ")) + "</td>" +
          '<td data-popis="' + t("Tričko") + '">' + e(r.velikost ? t(r.velikost_rada) + " " + r.velikost : "") + "</td>" +
          '<td class="k-cislo" data-popis="' + t("Čas na 10 km") + '">' + e(HBK.vykonnost(r.vykonnost_10km)) + "</td>" +
          '<td data-popis="' + t("Etapy") + '">' + e((r.etapy || []).join(", ")) + '</td><td class="k-akce-bunka">' + akce + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function vykresli(hlaska, chyba) {
    var vede = P.role !== "bezec";
    var h = ['<p class="k-hlaska" id="k-stav" role="status"></p>'];
    h.push('<p class="pocet">' + e(tf("Na soupisce {0} z nejvýš {1} běžců.", RADKY.length, P.max_bezcu)) + " " +
      (P.soupiska_otevrena ? (P.soupiska_do ? e(tf("Změny jdou do {0}.", HBK.cas(P.soupiska_do))) : "")
                           : "<b>" + t("Soupiska je uzavřená.") + "</b> " + t("Změny řeší pořadatel na info@horybory.cz.")) + "</p>");
    var rozepsane = HBK.koncepty(P.tym_id);
    if (rozepsane.length) h.push('<p class="k-koncept">' + t("Rozepsané a neuložené údaje:") + " " + rozepsane.map(function (k) {
      return '<a href="' + HB.zaklad + HBK.adresa("/kapitan/bezec/udaje/?" + (k.id ? "id=" + k.id : "novy=1")) + '">' + e(k.jmeno || t("nový běžec")) + (k.id ? "" : " (" + t("nový") + ")") + "</a>";
    }).join(", ") + ". " + t("Dokonči je, ať se uloží na soupisku.") + "</p>");
    h.push(tabulka());
    if (vede && P.soupiska_otevrena) {
      if (P.pocet_potvrzen) h.push('<p class="k-pozn">' + t("Konečný počet máš potvrzený, takže běžce nepřidáš ani neodebereš. Změníš ho v kroku") + " " +
        '<a href="' + HB.zaklad + HBK.adresa("/kapitan/pocet/") + '">' + t("Konečný počet") + "</a>. " + t("Údaje běžců upravit můžeš.") + "</p>");
      else if (RADKY.length >= P.max_bezcu) h.push('<p class="k-pozn">' + e(tf("Soupiska je plná ({0} běžců).", P.max_bezcu)) + "</p>");
      else h.push('<div class="k-akce k-akce-hlavni"><a class="k-tlacitko k-tlacitko-s-napovedou" href="' + HB.zaklad + HBK.adresa("/kapitan/bezec/") + '">+ ' + t("Přidat běžce") +
        "<small>" + t("Vybereš někoho z minulých ročníků, nebo zadáš nového.") + "</small></a></div>");
    }
    var u = (P.upozorneni || []).filter(function (x) { return ["neuplne", "vykonnost_mimo", "kulate", "bez_vykonnosti", "zensky_tym"].indexOf(x.druh) >= 0; });
    if (u.length) h.push('<div class="k-karta"><h2>' + t("Zkontroluj") + '</h2><ul class="k-upozorneni">' + u.map(function (x) { return "<li>" + e(x.text) + "</li>"; }).join("") + "</ul></div>");
    document.getElementById("k-obsah").innerHTML = h.join("");
    if (hlaska) HBK.hlaska("k-stav", hlaska, chyba);
  }

  function zvyrazni(id, text) {
    var tr = id && document.querySelector('tr[data-radek="' + id + '"]');
    if (tr) { tr.classList.add("k-zmeneno"); tr.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(function () { tr.classList.remove("k-zmeneno"); }, 3000); }
    if (text) HBK.toast(text);
  }

  async function obnov(hlaska) {
    var v = await Promise.all([HBK.rpc("web_k_prehled"), HBK.rpc("web_k_soupiska")]);
    P = v[0]; RADKY = v[1] || [];
    vykresli(); HBK.kroky(P);
    if (hlaska) HBK.toast(hlaska);
  }

  document.addEventListener("click", async function (ev) {
    var cil = ev.target; if (!cil || !cil.dataset || !cil.dataset.odebrat) return;
    var r = RADKY.filter(function (x) { return x.soupiska_id === Number(cil.dataset.odebrat); })[0];
    if (!r || !confirm(tf("Odebrat {0} ze soupisky? Etapy tohoto běžce se uvolní.", r.jmeno + " " + r.prijmeni))) return;
    try {
      var v = await HBK.rpc("web_k_odeber_bezce", { p_soupiska: r.soupiska_id });
      await obnov(tf("{0} už na soupisce není.", r.jmeno + " " + r.prijmeni) + (v.uvolnene_etapy && v.uvolnene_etapy.length
        ? " " + tf("Uvolněné etapy: {0}.", v.uvolnene_etapy.join(", ")) : ""));
    } catch (err) { HBK.hlaska("k-stav", err.message, true); window.scrollTo(0, 0); }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    try {
      var v = await Promise.all([HBK.rpc("web_k_soupiska"), HBK.db("web_kraj?select=kod,nazev&aktivni=eq.true&order=poradi")]);
      RADKY = v[0] || []; KRAJE = v[1] || [];
    } catch (err) { document.getElementById("k-obsah").innerHTML = '<p class="k-chyba">' + e(err.message) + "</p>"; return; }
    vykresli();
    var x = HBK.prevezmiHlasku(); if (x) zvyrazni(x.id, x.text);
  });
})();

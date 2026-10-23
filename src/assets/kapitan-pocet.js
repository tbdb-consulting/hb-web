// Kapitánská sekce – krok 3: konečný počet běžců. Kapitán nebo zástupce potvrdí, že počet jmen na soupisce je konečný;
// pak nejde přidat ani odebrat běžce, dokud potvrzení nezruší. Údaje běžců upravit jde dál (Keksa 4. 10. 2026).
(function () {
  var t = HBK.t, tf = HBK.tf;
  var e = HBK.esc, P = null;
  function bezcu(n) {
    if (HBK.en) return n + " " + (n === 1 ? "runner" : "runners");
    return n + " " + (n === 1 ? "běžec" : n >= 2 && n <= 4 ? "běžci" : "běžců");
  }

  function vykresli() {
    var vede = P.role !== "bezec", n = Number(P.bezcu) || 0, h = [];
    var neuplni = (P.upozorneni || []).filter(function (x) { return x.druh === "neuplne"; })[0];
    var soupiska = ' <a href="' + HB.zaklad + HBK.adresa("/kapitan/soupiska/") + '">' + t("Soupiska") + "</a>.";
    h.push('<p class="k-hlaska" id="k-stav" role="status"></p>');
    if (P.pocet_potvrzen) {
      h.push('<div class="k-karta"><p class="k-velky"><span class="k-stitek k-stitek-ok">' + t("potvrzeno") + "</span> " + e(bezcu(Number(P.pocet_konecny))) + "</p>" +
        '<p class="pocet">' + e(tf("Potvrzeno {0}. Běžce teď nepřidáš ani neodebereš. Jméno a údaje upravit můžeš, třeba když za někoho nastupuje náhradník.", HBK.cas(P.pocet_potvrzen))) + "</p>" +
        (vede && P.soupiska_otevrena ? '<div class="k-akce"><button type="button" class="k-vedlejsi k-tlacitko-s-napovedou" id="k-zmenit-pocet">' + t("Změnit počet") +
          "<small>" + t("Zruší potvrzení, pak můžeš běžce přidat nebo odebrat.") + "</small></button></div>" : "") + "</div>");
    } else if (!vede) {
      h.push('<div class="k-karta"><p>' + t("Konečný počet běžců zatím není potvrzený.") + "</p></div>");
    } else if (!P.soupiska_otevrena) {
      h.push('<div class="k-karta"><p>' + t("Počet nebyl potvrzený a soupiska je uzavřená. Napiš nám na info@horybory.cz.") + "</p></div>");
    } else if (!n) {
      h.push('<div class="k-karta"><p>' + t("Na soupisce zatím nikdo není. Nejdřív přidej běžce v kroku") + soupiska + "</p></div>");
    } else {
      var naSoupisce = HBK.en ? "The team list has <b>" + e(bezcu(n)) + "</b>."
                              : "Na soupisce " + (n >= 2 && n <= 4 ? "jsou " : "je ") + "<b>" + e(bezcu(n)) + "</b>.";
      h.push('<div class="k-karta"><p class="k-velky">' + naSoupisce + "</p>" +
        "<p>" + (P.soupiska_do
          ? e(tf("Až budeš vědět, že tvůj tým poběží právě v tomhle složení, potvrď to. Pak už běžce nepřidáš ani neodebereš, dokud potvrzení nezrušíš; změnit počet jde do {0}.", HBK.cas(P.soupiska_do)))
          : t("Až budeš vědět, že tvůj tým poběží právě v tomhle složení, potvrď to. Pak už běžce nepřidáš ani neodebereš, dokud potvrzení nezrušíš.")) + "</p>" +
        (neuplni ? '<p class="k-chyba">' + t("Potvrdit půjde, až budou u všech běžců vyplněné povinné údaje. Doplň je v kroku") + soupiska + "</p>" : "") +
        '<div class="k-akce"><button type="button" class="k-tlacitko k-tlacitko-s-napovedou" id="k-potvrdit-pocet"' + (neuplni ? " disabled" : "") + ">" + e(tf("Potvrdit konečný počet: {0}", bezcu(n))) +
        "<small>" + t("Dáš nám vědět, kolik běžců tvůj tým bude mít.") + "</small></button></div></div>");
    }
    document.getElementById("k-obsah").innerHTML = h.join("");
  }

  async function obnov(text) { P = await HBK.rpc("web_k_prehled"); vykresli(); HBK.kroky(P); if (text) HBK.toast(text); }

  document.addEventListener("click", async function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("button"); if (!b) return;
    if (b.id === "k-potvrdit-pocet") {
      b.disabled = true;
      try { await HBK.rpc("web_k_potvrd_pocet"); await obnov(t("Konečný počet běžců je potvrzený.")); }
      catch (err) { HBK.hlaska("k-stav", err.message, true); b.disabled = false; }
    }
    if (b.id === "k-zmenit-pocet") {
      if (!confirm(t("Zrušit potvrzení konečného počtu? Pokud máš potvrzenou i soupisku a etapy, zruší se i to."))) return;
      b.disabled = true;
      try { await HBK.rpc("web_k_zrus_potvrzeni_poctu"); await obnov(t("Potvrzení počtu je zrušené. Teď můžeš běžce přidat nebo odebrat.")); }
      catch (err) { HBK.hlaska("k-stav", err.message, true); b.disabled = false; }
    }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    vykresli();
  });
})();

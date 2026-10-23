// Kapitánská sekce – Oprava času (Keksa 9. 10. 2026). Kapitán nebo zástupce požádá o opravu času na předávce:
// vybere předávku (vidí náš zapsaný čas), napíše, co se stalo, správný čas a popis. Žádost na čase nic nemění –
// rozhoduje administrátor s právem Časy a výsledky. Dokud žádost čeká, jde upravit; vyřízená už ne.
// Žádat jde od startu závodu do termínu v Nastavení ročníku (oprava_casu_do); zkušební tým kdykoli. Databáze: web_k_oprava_casu*.
(function () {
  var t = HBK.t, tf = HBK.tf;
  var e = HBK.esc, D = null, P = null, upravuji = null;
  var DRUH = { chybi: t("čas chybí"), spatne: t("čas je špatně"), jiny_tym: t("zapsali jiný tým"), jine: t("jiné") };
  var STAV = { ceka: [t("čeká"), ""], opraveno: [t("opraveno"), " k-stitek-ok"], zamitnuto: [t("zamítnuto"), " k-stitek-ne"] };
  var JAZYK = HBK.en ? "en-GB" : "cs-CZ";
  var F_HMS = new Intl.DateTimeFormat(JAZYK, { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  var F_DEN = new Intl.DateTimeFormat(JAZYK, { timeZone: "Europe/Prague", weekday: "short", day: "numeric", month: "numeric" });
  function hms(iso) { return iso ? F_HMS.format(new Date(iso)) : ""; }
  function denHms(iso) { return iso ? F_DEN.format(new Date(iso)) + " " + hms(iso) : ""; }
  function predavka(x) { return "P" + x.cislo + " " + (x.misto || ""); }

  function formular() {
    var z = upravuji, h = [];
    h.push('<form class="k-karta" id="k-oprava-form" novalidate><h2>' + (z ? t("Upravit žádost") : t("Nová žádost o opravu")) + "</h2>");
    h.push('<label class="k-pole" for="o-etapa">' + t("Předávka") + ' *<select id="o-etapa"' + (z ? " disabled" : "") + ' required><option value="">' + t("– vyber –") + "</option>" +
      D.predavky.map(function (p) {
        return '<option value="' + p.etapa + '"' + (z && z.etapa === p.etapa ? " selected" : "") + ">" + e(predavka(p)) + " – " +
          (p.dobeh ? e(tf("zapsáno {0}", hms(p.dobeh))) : t("čas chybí")) + "</option>";
      }).join("") + "</select><small>" + t("Předávka, na kterou běžec doběhl a kde je čas špatně nebo chybí.") + "</small></label>");
    h.push('<fieldset class="k-pole k-volby"><legend>' + t("Co se stalo") + " *</legend>" + Object.keys(DRUH).map(function (k) {
      return '<label><input type="radio" name="o-druh" value="' + k + '"' + (z && z.druh === k ? " checked" : "") + "> " + DRUH[k] + "</label>";
    }).join("") + "</fieldset>");
    h.push('<label class="k-pole" for="o-cas">' + t("Správný čas") + '<input id="o-cas" inputmode="numeric" autocomplete="off" placeholder="14:28" value="' + e(z ? z.cas_text || "" : "") + '">' +
      "<small>" + t("Kdy běžec doběhl, např. 14:28 nebo 14:28:10. Povinné, když čas chybí nebo je špatně.") + "</small></label>");
    h.push('<label class="k-pole" for="o-popis">' + t("Co víš") + ' *<textarea id="o-popis" rows="4" maxlength="1000" required>' + e(z ? z.popis : "") + "</textarea>" +
      "<small>" + t("Co se stalo a podle čeho víš správný čas – hodinky, fotka, aplikace.") + "</small></label>");
    h.push('<p class="k-hlaska" id="o-stav" role="status"></p><div class="k-akce"><button type="submit" class="k-tlacitko" id="o-odeslat">' +
      (z ? t("Uložit změny") : t("Odeslat žádost")) + "</button>" + (z ? ' <button type="button" class="k-vedlejsi" id="o-zrusit-upravy">' + t("Neupravovat") + "</button>" : "") + "</div></form>");
    return h.join("");
  }

  function zadosti() {
    if (!D.zadosti.length) return "";
    return '<div class="k-karta"><h2>' + t("Tvoje žádosti") + '</h2><ul class="k-zadosti">' + D.zadosti.map(function (z) {
      var s = STAV[z.stav] || [z.stav, ""];
      return '<li><div><b>P' + (z.etapa + 1) + " " + e(z.misto || "") + "</b> · " + e(DRUH[z.druh] || z.druh) +
        (z.cas ? " · " + e(tf("správný čas {0}", denHms(z.cas))) : "") + ' <span class="k-stitek' + s[1] + '">' + s[0] + "</span></div>" +
        '<div class="k-zadost-popis">' + e(z.popis) + "</div>" +
        (z.odpoved ? '<div class="k-zadost-odpoved"><b>' + t("Odpověď:") + "</b> " + e(z.odpoved) + "</div>" : "") +
        '<small class="k-zadost-kdy">' + e(tf("Podáno {0}", HBK.cas(z.vytvoreno))) + (z.vyrizeno ? " · " + e(tf("vyřízeno {0}", HBK.cas(z.vyrizeno))) : "") + "</small>" +
        (z.stav === "ceka" && D.muze && D.otevreno ? '<div class="k-akce"><button type="button" class="k-vedlejsi" data-upravit="' + z.id + '">' + t("Upravit") + "</button></div>" : "") +
        "</li>";
    }).join("") + "</ul></div>";
  }

  function vykresli() {
    var h = [];
    if (!D) { h.push('<div class="k-karta"><p>' + t("Tým jsme nenašli.") + "</p></div>"); }
    else {
      h.push('<p class="k-uvod">' + t("Když je čas na některé předávce špatně nebo chybí, napiš nám. Na zapsaném čase se tím nic nezmění – žádost posoudí pořadatel a výsledek uvidíš tady. Dokud žádost čeká, ve výsledcích je u týmu „čas se prověřuje“.") + "</p>");
      if (D.testovaci) h.push('<p class="k-chyba">' + t("Zkušební tým – žádat jde kdykoli, žádosti se týkají jen zkušebních časů.") + "</p>");
      if (!D.muze) h.push('<div class="k-karta"><p>' + t("O opravu času žádá kapitán nebo zástupce týmu.") + "</p></div>");
      else if (!D.otevreno) h.push('<div class="k-karta"><p>' + (D.od && Date.now() < Date.parse(D.od)
        ? e(tf("O opravu času půjde žádat od startu závodu {0}.", HBK.cas(D.od)))
        : (D.do ? e(tf("Žádosti o opravu času jsou uzavřené od {0}. Napiš nám na info@horybory.cz.", HBK.cas(D.do)))
                : t("Žádosti o opravu času jsou uzavřené. Napiš nám na info@horybory.cz."))) + "</p></div>");
      else h.push(formular());
      h.push(zadosti());
    }
    document.getElementById("k-obsah").innerHTML = h.join("");
  }

  async function obnov(text) { D = await HBK.rpc("web_k_oprava_casu"); upravuji = null; vykresli(); if (text) HBK.toast(text); }

  document.addEventListener("submit", async function (ev) {
    if (ev.target.id !== "k-oprava-form") return;
    ev.preventDefault();
    var etapa = upravuji ? upravuji.etapa : Number(document.getElementById("o-etapa").value) || null;
    var druh = (document.querySelector('input[name="o-druh"]:checked') || {}).value || null;
    var cas = document.getElementById("o-cas").value.trim(), popis = document.getElementById("o-popis").value.trim();
    var chyba = !etapa ? t("Vyber předávku.") : !druh ? t("Vyber, co se stalo.") : (!cas && (druh === "chybi" || druh === "spatne")) ? t("Napiš správný čas, např. 14:28.") :
      cas && !/^(\d{1,2}\.\s?\d{1,2}\.(\s?\d{4})?\s)?\d{1,2}:\d{2}(:\d{2})?$/.test(cas) ? t("Čas napiš jako 14:28 nebo 14:28:10.") : !popis ? t("Napiš, co se stalo.") : null;
    if (chyba) { HBK.hlaska("o-stav", chyba, true); return; }
    var b = document.getElementById("o-odeslat"); b.disabled = true;
    try {
      await HBK.rpc("web_k_oprava_casu_uloz", { p_etapa: etapa, p_druh: druh, p_cas: cas || null, p_popis: popis });
      await obnov(upravuji ? t("Žádost je upravená.") : t("Žádost je odeslaná. Výsledek uvidíš tady."));
      window.scrollTo(0, 0);
    } catch (err) { HBK.hlaska("o-stav", err.message, true); b.disabled = false; }
  });

  // stará chybová hláška zmizí, jakmile kapitán ve formuláři něco změní
  document.addEventListener("input", function (ev) { if (ev.target.closest && ev.target.closest("#k-oprava-form")) HBK.hlaska("o-stav", ""); });
  document.addEventListener("change", function (ev) { if (ev.target.closest && ev.target.closest("#k-oprava-form")) HBK.hlaska("o-stav", ""); });

  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("button"); if (!b) return;
    if (b.dataset.upravit) {
      upravuji = D.zadosti.filter(function (z) { return String(z.id) === b.dataset.upravit; })[0] || null;
      vykresli(); var f = document.getElementById("k-oprava-form"); if (f) f.scrollIntoView({ behavior: "smooth" });
    }
    if (b.id === "o-zrusit-upravy") { upravuji = null; vykresli(); }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    HBK.navigace(P, { zpet: { n: t("Přehled týmu"), url: "/kapitan/", hint: t("Zpět na přehled týmu.") } });
    try { D = await HBK.rpc("web_k_oprava_casu"); } catch (err) {
      document.getElementById("k-obsah").innerHTML = '<p class="k-chyba">' + e(err.message) + "</p>"; return;
    }
    vykresli();
  });
})();

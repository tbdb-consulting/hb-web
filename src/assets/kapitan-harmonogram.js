// Kapitánská sekce – Startovní čas a harmonogram (Keksa 11. 10. 2026). Vidí celý tým včetně běžců. Zobrazí se až od
// okamžiku „Startovní listina zveřejněná od“ v Nastavení ročníku (zkušební tým hned). Data z platné kalkulace startu:
// vlna, start, odhad doběhu a 30 etap s běžcem a odhadem příjezdu na předávku. Tlačítko Tisk / PDF.
// Databáze: web_k_harmonogram.
(function () {
  var e = HBK.esc, t = HBK.t, tf = HBK.tf, LOC = HBK.en ? "en-GB" : "cs-CZ";
  var F_CAS = new Intl.DateTimeFormat(LOC, { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" });
  var F_DEN = new Intl.DateTimeFormat(LOC, { timeZone: "Europe/Prague", weekday: "short", day: "numeric", month: HBK.en ? "short" : "numeric" });
  function cas(iso) { return iso ? F_CAS.format(new Date(iso)) : "–"; }
  function denCas(iso) { return iso ? F_DEN.format(new Date(iso)) + " " + cas(iso) : "–"; }
  function trvani(s) { if (s == null) return "–"; var m = Math.round(s / 60); return Math.floor(m / 60) ? Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") + " h" : m + " min"; }

  function vykresli(H) {
    var h = [];
    if (!H) h.push('<div class="k-karta"><p>' + t("Tým jsme nenašli.") + "</p></div>");
    else if (!H.zverejneno) h.push('<div class="k-karta"><p>' + t("Startovní čas a harmonogram tu uvidíš po zveřejnění startovní listiny") +
      (H.od ? " (" + e(HBK.cas(H.od)) + ")" : "") + ". " + t("Čas startu pošleme nejpozději týden před závodem.") + "</p></div>");
    else if (!H.spocitano) h.push('<div class="k-karta"><p>' + t("Startovní listina je zveřejněná, ale tvůj tým v ní zatím není. Napiš nám na") +
      ' <a href="mailto:info@horybory.cz">info@horybory.cz</a>.</p></div>');
    else {
      h.push('<div class="k-karta k-harm-hlava"><h2>' + e((H.cislo ? H.cislo + " · " : "") + H.tym) + '</h2><dl class="k-dl">' +
        "<dt>" + t("Start") + "</dt><dd>" + e(denCas(H.start)) + (H.vlna ? " · " + e(tf("{0}. vlna", H.vlna)) : "") + "</dd>" +
        "<dt>" + t("Odhad doběhu do cíle") + "</dt><dd>" + e(denCas(H.dobeh)) + "</dd>" +
        (H.odhad_s ? "<dt>" + t("Odhad času týmu") + "</dt><dd>" + e(trvani(H.odhad_s)) + "</dd>" : "") +
        '</dl><p class="k-pozn">' + t("Časy na předávkách jsou odhad z výkonností běžců.") + "</p>" +
        '<div class="k-akce k-netisk"><button type="button" class="k-vedlejsi" id="h-tisk">' + t("Tisk / uložit jako PDF") + "</button></div></div>");
      h.push('<div class="k-karta k-harm"><h2>' + t("Etapy") + '</h2><table class="k-harm-tab"><thead><tr><th>' + t("Et.") + "</th><th>" + t("Úsek") + "</th><th>" + t("Běžec") +
        "</th><th>" + t("Příjezd na předávku") + "</th></tr></thead><tbody>" +
        (H.etapy || []).map(function (x) {
          return "<tr><td>" + x.etapa + "</td><td>" + e(x.z || "") + " → " + e(x.do || "") +
            '<small>' + (x.delka_km ? e(HBK.en ? String(x.delka_km) : String(x.delka_km).replace(".", ",")) + " km" : "") + (x.prevyseni_m ? " · ↑ " + x.prevyseni_m + " m" : "") +
            (x.cas_s ? " · " + e(trvani(x.cas_s)) : "") + "</small></td><td>" + e(x.bezec || "–") + "</td><td><b>" + e(cas(x.prijezd)) + "</b> " +
            '<small>P' + x.predavka_do + "</small></td></tr>";
        }).join("") + "</tbody></table></div>");
    }
    document.getElementById("k-obsah").innerHTML = h.join("");
  }

  document.addEventListener("click", function (ev) { var tl = ev.target && ev.target.closest && ev.target.closest("#h-tisk"); if (tl) window.print(); });

  document.addEventListener("DOMContentLoaded", async function () {
    var P = await HBK.vyzadovat(); if (!P) return;
    HBK.navigace(P, { zpet: { n: t("Přehled týmu"), url: "/kapitan/", hint: t("Zpět na přehled týmu.") } });
    try { vykresli(await HBK.rpc("web_k_harmonogram")); } catch (err) {
      document.getElementById("k-obsah").innerHTML = '<p class="k-chyba">' + e(err.message) + "</p>";
    }
  });
})();

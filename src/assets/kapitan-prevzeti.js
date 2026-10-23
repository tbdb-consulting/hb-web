// Kapitánská sekce – Převzetí týmu odkazem z e-mailu (Keksa 11. 10. 2026). Kdo dostal odkaz, přihlásí se e-mailem,
// na který odkaz přišel, a potvrdí převzetí. Token se pamatuje v prohlížeči, aby přežil přihlášení odkazem z mailu.
// Databáze: web_prevzeti_info (jde i bez přihlášení), web_k_prevzit_tym.
(function () {
  var e = HBK.esc, t = HBK.t, tf = HBK.tf, KLIC = "hb_prevzeti_token";
  function token() {
    var tk = new URLSearchParams(location.search).get("t");
    try { if (tk) localStorage.setItem(KLIC, tk); else tk = localStorage.getItem(KLIC); } catch (err) {}
    return tk;
  }
  function zapomen() { try { localStorage.removeItem(KLIC); } catch (err) {} }
  function obsah(h) { document.getElementById("k-obsah").innerHTML = h; }

  async function nacti() {
    var tk = token();
    if (!tk) return obsah('<div class="k-karta"><p>' + t("Odkaz na převzetí chybí. Otevři ho prosím znovu z e-mailu.") + "</p></div>");
    var prihlasen = await HBK.platnyToken();
    var lista = document.getElementById("k-lista"); if (lista) { lista.hidden = !prihlasen; var tm = document.getElementById("k-tym"); if (tm) tm.textContent = ""; }
    if (prihlasen) { try { await HBK.rpc("web_prihlaseni_dokonci"); } catch (err) {} }
    var i = null;
    try { i = await HBK.rpc("web_prevzeti_info", { p_token: tk }); } catch (err) { return obsah('<p class="k-chyba">' + e(err.message) + "</p>"); }
    var STAV = { neznamy: t("Tenhle odkaz na převzetí neznáme."), zruseno: t("Kapitán předání zrušil."), vyprselo: t("Odkaz vypršel. Požádej kapitána, ať předání pošle znovu."),
                 prijato: t("Tým už je převzatý.") };
    if (i.stav !== "ceka") { zapomen(); return obsah('<div class="k-karta"><p>' + e(STAV[i.stav] || i.stav) + "</p>" +
      (i.stav === "prijato" ? '<div class="k-akce"><a class="k-tlacitko" href="' + HB.zaklad + HBK.adresa("/kapitan/") + '">' + t("Do kapitánské sekce") + "</a></div>" : "") + "</div>"); }
    var h = '<div class="k-karta"><h2>' + e((i.cislo ? i.cislo + " · " : "") + i.tym) + "</h2><p>" +
      tf("{0} ti předává vedení týmu. Jako kapitán budeš spravovat soupisku, rozdělení etap a platbu. Odkaz platí do {1}.", e(i.od || t("Kapitán")), e(HBK.cas(i.plati_do))) + "</p>";
    if (!prihlasen) {
      h += "<p>" + tf("Nejdřív se přihlas e-mailem, na který odkaz přišel ({0}).", e(i.email)) + '</p><div class="k-akce"><a class="k-tlacitko" href="' + HB.zaklad +
        HBK.adresa("/kapitan/prihlaseni/") + "?zpet=" + encodeURIComponent(HB.zaklad + HBK.adresa("/kapitan/prevzeti/")) + '">' + t("Přihlásit se") + "</a></div>";
    } else if (!i.ja) {
      h += '<p class="k-chyba">' + tf("Jsi přihlášený jiným e-mailem. Odkaz patří adrese {0}. Odhlas se a přihlas se jí.", e(i.email)) + "</p>" +
        '<div class="k-akce"><button type="button" class="k-vedlejsi" id="k-odhlasit">' + t("Odhlásit") + "</button></div>";
    } else {
      h += '<p class="k-hlaska" id="pr-stav" role="status"></p><div class="k-akce"><button type="button" class="k-tlacitko" id="pr-prevzit">' + t("Převzít tým") + "</button></div>";
    }
    obsah(h + "</div>");
  }

  document.addEventListener("click", async function (ev) {
    var tl = ev.target && ev.target.closest && ev.target.closest("button"); if (!tl || tl.id !== "pr-prevzit") return;
    tl.disabled = true;
    try {
      await HBK.rpc("web_k_prevzit_tym", { p_token: token() });
      zapomen();
      try { sessionStorage.setItem("hb_k_toast", t("Tým je tvůj. Jsi kapitán.")); } catch (err) {}
      location.href = HB.zaklad + HBK.adresa("/kapitan/");
    } catch (err) { HBK.hlaska("pr-stav", err.message, true); tl.disabled = false; }
  });

  document.addEventListener("DOMContentLoaded", nacti);
})();

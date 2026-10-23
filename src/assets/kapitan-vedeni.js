// Kapitánská sekce – Kapitán a zástupce (Keksa 11. 10. 2026). Měnit smí jen kapitán. Nový kapitán i zástupce může být
// ze soupisky, nebo i mimo ni (jméno a e-mail). Předání kapitána platí, až ho nový kapitán potvrdí odkazem z e-mailu;
// do té doby vede tým dosavadní kapitán. Zástupce se mění hned. Maily odcházejí rovnou.
// Databáze: web_k_vedeni, web_k_predat_kapitana, web_k_predani_zrusit, web_k_zmenit_zastupce.
(function () {
  var e = HBK.esc, t = HBK.t, tf = HBK.tf, D = null, P = null, otevreno = null; // otevreno: "kapitan" | "zastupce"

  function osoba(o) { return o ? e(o.jmeno || "–") + ' <span class="k-seda">' + e(o.email || "") + "</span>" : "–"; }

  function formular(co) {
    var kap = co === "kapitan", h = [];
    h.push('<form class="k-karta" id="k-vedeni-form" novalidate><h2>' + (kap ? t("Předat tým novému kapitánovi") : t("Nový zástupce")) + "</h2>");
    h.push('<p class="k-pozn">' + (kap
      ? t("Novému kapitánovi pošleme odkaz. Předání platí, až ho potvrdí – do té doby vedeš tým dál ty. Pokud jsi na soupisce, zůstaneš v týmu jako běžec.")
      : t("Změna platí hned. Novému zástupci pošleme e-mail, jak se přihlásí. Zástupce může upravovat soupisku a etapy, kapitána měnit nemůže.")) + "</p>");
    h.push('<fieldset class="k-pole k-volby"><legend>' + t("Kdo to bude") + " *</legend>" +
      D.soupiska.filter(function (s) { return !(D.zastupce && !kap && s.osoba_id === D.zastupce.osoba_id); }).map(function (s) {
        return '<label><input type="radio" name="v-kdo" value="' + s.osoba_id + '"> ' + e(s.jmeno || s.email) + ' <span class="k-seda">' + e(s.email) + "</span></label>";
      }).join("") +
      '<label><input type="radio" name="v-kdo" value="jiny"> ' + t("někdo mimo soupisku") + "</label></fieldset>");
    h.push('<div id="v-jiny" hidden><label class="k-pole" for="v-jmeno">' + t("Jméno") + ' *<input id="v-jmeno" autocomplete="off"></label>' +
      '<label class="k-pole" for="v-prijmeni">' + t("Příjmení") + ' *<input id="v-prijmeni" autocomplete="off"></label>' +
      '<label class="k-pole" for="v-email">E-mail *<input id="v-email" type="email" autocomplete="off"><small>' +
      (kap ? t("Na tenhle e-mail přijde odkaz na převzetí.") : t("Na tenhle e-mail se zástupce bude přihlašovat.")) + "</small></label></div>");
    h.push('<p class="k-hlaska" id="v-stav" role="status"></p><div class="k-akce"><button type="submit" class="k-tlacitko" id="v-odeslat">' +
      (kap ? t("Poslat odkaz na převzetí") : t("Změnit zástupce")) + '</button> <button type="button" class="k-vedlejsi" id="v-zpet">' + t("Zpět") + "</button></div></form>");
    return h.join("");
  }

  function vykresli() {
    var h = [];
    if (!D) { document.getElementById("k-obsah").innerHTML = '<div class="k-karta"><p>' + t("Tým jsme nenašli.") + "</p></div>"; return; }
    h.push('<div class="k-karta"><h2>' + t("Kdo tým vede") + '</h2><dl class="k-dl"><dt>' + t("Kapitán") + "</dt><dd>" + osoba(D.kapitan) + "</dd>" +
      "<dt>" + t("Zástupce") + "</dt><dd>" + (D.zastupce ? osoba(D.zastupce) : t("není určený")) + "</dd></dl>" +
      '<p class="k-pozn">' + t("Kapitán ani zástupce nemusí být na soupisce – stačí zadat jméno a e-mail. Zástupce může upravovat soupisku a rozdělení etap, kapitána a zástupce mění jen kapitán.") + "</p></div>");
    if (D.predani) {
      h.push('<div class="k-karta"><h2>' + t("Předání čeká na potvrzení") + "</h2><p>" + t("Odkaz na převzetí jsme poslali:") + " <b>" + e(D.predani.jmeno || "") + "</b> " +
        '<span class="k-seda">' + e(D.predani.email) + "</span>. " + tf("Platí do {0}. Do potvrzení vedeš tým ty.", e(HBK.cas(D.predani.plati_do))) + "</p>" +
        (D.muze ? '<div class="k-akce"><button type="button" class="k-vedlejsi" id="v-zrusit">' + t("Zrušit předání") + "</button></div>" : "") + "</div>");
    }
    if (!D.muze) h.push('<div class="k-karta"><p>' + t("Kapitána a zástupce mění kapitán týmu.") + "</p></div>");
    else if (otevreno) h.push(formular(otevreno));
    else h.push('<div class="k-akce"><button type="button" class="k-tlacitko" data-otevrit="kapitan">' + t("Předat tým jinému kapitánovi") + "</button> " +
      '<button type="button" class="k-vedlejsi" data-otevrit="zastupce">' + (D.zastupce ? t("Změnit zástupce") : t("Určit zástupce")) + "</button></div>");
    document.getElementById("k-obsah").innerHTML = h.join("");
  }

  async function obnov(text) { D = await HBK.rpc("web_k_vedeni"); otevreno = null; vykresli(); if (text) HBK.toast(text); window.scrollTo(0, 0); }

  document.addEventListener("change", function (ev) {
    if (ev.target.name === "v-kdo") { var j = document.getElementById("v-jiny"); if (j) j.hidden = ev.target.value !== "jiny"; }
    if (ev.target.closest && ev.target.closest("#k-vedeni-form")) HBK.hlaska("v-stav", "");
  });
  document.addEventListener("input", function (ev) { if (ev.target.closest && ev.target.closest("#k-vedeni-form")) HBK.hlaska("v-stav", ""); });

  document.addEventListener("submit", async function (ev) {
    if (ev.target.id !== "k-vedeni-form") return;
    ev.preventDefault();
    var kdo = (document.querySelector('input[name="v-kdo"]:checked') || {}).value || null;
    var a = { p_osoba: null, p_jmeno: null, p_prijmeni: null, p_email: null };
    if (!kdo) return HBK.hlaska("v-stav", t("Vyber, kdo to bude."), true);
    if (kdo === "jiny") {
      a.p_jmeno = document.getElementById("v-jmeno").value.trim(); a.p_prijmeni = document.getElementById("v-prijmeni").value.trim();
      a.p_email = document.getElementById("v-email").value.trim();
      if (!a.p_jmeno || !a.p_prijmeni) return HBK.hlaska("v-stav", t("Vyplň jméno a příjmení."), true);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.p_email)) return HBK.hlaska("v-stav", t("E-mail nemá správný tvar."), true);
    } else a.p_osoba = Number(kdo);
    var b = document.getElementById("v-odeslat"); b.disabled = true;
    try {
      var kap = otevreno === "kapitan";
      await HBK.rpc(kap ? "web_k_predat_kapitana" : "web_k_zmenit_zastupce", a);
      await obnov(kap ? t("Odkaz na převzetí je odeslaný.") : t("Zástupce je změněný."));
    } catch (err) { HBK.hlaska("v-stav", err.message, true); b.disabled = false; }
  });

  document.addEventListener("click", async function (ev) {
    var tl = ev.target && ev.target.closest && ev.target.closest("button"); if (!tl) return;
    if (tl.dataset.otevrit) { otevreno = tl.dataset.otevrit; vykresli(); return; }
    if (tl.id === "v-zpet") { otevreno = null; vykresli(); return; }
    if (tl.id === "v-zrusit") {
      tl.disabled = true;
      try { await HBK.rpc("web_k_predani_zrusit"); await obnov(t("Předání je zrušené.")); } catch (err) { HBK.toast(err.message); tl.disabled = false; }
    }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    HBK.navigace(P, { zpet: { n: t("Přehled týmu"), url: "/kapitan/", hint: t("Zpět na přehled týmu.") } });
    try { D = await HBK.rpc("web_k_vedeni"); } catch (err) {
      document.getElementById("k-obsah").innerHTML = '<p class="k-chyba">' + e(err.message) + "</p>"; return;
    }
    vykresli();
  });
})();

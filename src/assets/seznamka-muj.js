// Seznamka – správa vlastního inzerátu běžce odkazem z e-mailu (Keksa 11. 10. 2026): zveřejnit, upravit, stáhnout.
// Databáze: web_seznamka_muj, web_seznamka_muj_uloz (bez přihlášení, odkaz s tokenem).
// Angličtina (23. 10. 2026): na /en/team-finder/my-listing/ texty ze slovníku window.HB_T, hlášky databáze taky.
(function () {
  var el = document.getElementById("seznamka-muj"), tk = new URLSearchParams(location.search).get("t"), M = null, esc = HBS.esc;
  var EN = !!(window.HB && HB.jazyk === "en");
  function t(s) { var T = window.HB_T; return (EN && T && T[s]) || s; }
  // Hlášky z databáze jsou česky; ve slovníku jsou i s % na místě hodnot (stejně jako v kapitan.js).
  var vzory = null;
  function prelozHlasku(s) {
    s = String(s == null ? "" : s);
    var T = window.HB_T;
    if (!EN || !T) return s;
    if (T[s]) return T[s];
    if (!vzory) vzory = Object.keys(T).filter(function (k) { return k.indexOf("%") >= 0; }).map(function (k) {
      return { re: new RegExp("^" + k.split("%").map(function (c) { return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("(.+?)") + "$"), en: T[k] };
    });
    for (var i = 0; i < vzory.length; i++) {
      var m = s.match(vzory[i].re);
      if (m) { var n = 0; return vzory[i].en.replace(/%/g, function () { n++; return m[n] == null ? "" : m[n]; }); }
    }
    return s;
  }
  function obsah(h) { el.innerHTML = h; }
  function zpet() { return '<p><a href="' + HB.zaklad + (EN ? "/en/team-finder/" : "/seznamka/") + '">' + t("Zpět do seznamky") + "</a></p>"; }
  function hlaska(text, chyba) { var h = el.querySelector(".sz-hlaska"); if (h) { h.textContent = text; h.className = "sz-hlaska" + (text ? (chyba ? " chyba" : " ok") : ""); } }

  function vykresli(text) {
    if (!M) return obsah('<p class="sz-hlaska chyba">' + t("Odkaz na inzerát neznáme. Otevři ho prosím znovu z e-mailu.") + "</p>" + zpet());
    var STAV = { neovereno: t("čeká na zveřejnění"), zverejneno: t("zveřejněný"), stazeno: t("stažený") };
    var h = '<p class="sz-pozn">' + t("Inzerát:") + " <b>" + esc(M.jmeno) + " " + esc((M.prijmeni || "").slice(0, 1)) + ".</b> · " + esc(STAV[M.stav] || M.stav) + "</p>";
    if (text) h += '<p class="sz-hlaska ok">' + esc(text) + "</p>";
    if (!M.otevreno) return obsah(h + '<p class="sz-prazdno">' + t("Seznamka letos skončila.") + "</p>" + zpet());
    if (M.stav === "neovereno") h += "<p>" + t("Inzerát se ukáže v seznamce, až ho zveřejníš.") + '</p><p><button type="button" class="sz-tlacitko" id="m-zverejnit">' + t("Zveřejnit inzerát") + "</button></p>";
    h += '<form class="sz-form" id="m-form" novalidate><h2>' + t("Upravit") + "</h2>" +
      '<div class="sz-radek"><label>' + t("Kraj") + HBS.krajSelect("m-kraj", M.kraj) + "</label><label>" + t("Výkonnost na 10 km") + '<input name="vykonnost" value="' + esc(M.vykonnost || "") + '" placeholder="52:30"></label>' +
      "<label>" + t("Kolik etap zvládneš") + '<input name="etap" type="number" min="1" max="30" value="' + esc(M.etap || "") + '"></label></div>' +
      "<label>" + t("O mně *") + '<textarea name="text" rows="4" maxlength="1000">' + esc(M.text || "") + "</textarea></label>" +
      '<p class="sz-hlaska" role="status"></p><button type="submit" class="sz-tlacitko">' + (M.stav === "zverejneno" ? t("Uložit změny") : t("Uložit a zveřejnit")) + "</button></form>";
    if (M.stav !== "stazeno") h += '<p><button type="button" class="sz-vedlejsi" id="m-stahnout">' + t("Stáhnout inzerát – už tým mám") + "</button></p>";
    obsah(h + zpet());
  }

  async function nacti(text) { M = await HBS.rpc("web_seznamka_muj", { p_token: tk }); vykresli(text); }

  el.addEventListener("click", async function (ev) {
    var b = ev.target.closest("button"); if (!b || !b.id) return;
    var akce = { "m-zverejnit": "zverejnit", "m-stahnout": "stahnout" }[b.id]; if (!akce) return;
    b.disabled = true;
    try { await HBS.rpc("web_seznamka_muj_uloz", { p_token: tk, p_akce: akce }); await nacti(akce === "zverejnit" ? t("Inzerát je zveřejněný.") : t("Inzerát je stažený.")); }
    catch (e) { hlaska(prelozHlasku(e.message), true); b.disabled = false; }
  });
  el.addEventListener("input", function () { hlaska(""); });
  el.addEventListener("submit", async function (ev) {
    ev.preventDefault(); var f = ev.target, v = function (n) { return (f.elements[n].value || "").trim(); }, b = f.querySelector("button[type=submit]");
    if (v("vykonnost") && !/^\d{1,2}:\d{2}$/.test(v("vykonnost"))) return hlaska(t("Výkonnost napiš jako čas na 10 km, např. 52:30."), true);
    if (!v("text")) return hlaska(t("Napiš pár slov o sobě."), true);
    b.disabled = true;
    try { await HBS.rpc("web_seznamka_muj_uloz", { p_token: tk, p_akce: "ulozit", p_kraj: document.getElementById("m-kraj").value || null, p_vykonnost: v("vykonnost") || null,
        p_etap: v("etap") ? Number(v("etap")) : null, p_text: v("text") }); await nacti(t("Inzerát je uložený a zveřejněný.")); }
    catch (e) { hlaska(prelozHlasku(e.message), true); b.disabled = false; }
  });

  if (!tk) { vykresli(); return; }
  HBS.kraje().then(function () { return nacti(); }).catch(function (e) { obsah('<p class="sz-hlaska chyba">' + esc(prelozHlasku(e.message)) + "</p>"); });
})();

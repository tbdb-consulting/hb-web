// Odpočet do otevření registrace na všech stránkách kapitánské sekce (Keksa 13. 11. 2026).
// Termín čte z databáze stejně jako stránka Registrace (web_rocnik_webu + web_param_cas „registrace_od“),
// takže změna termínu v administraci platí hned. S otevřením registrace pruh sám zmizí.
(function () {
  "use strict";
  var C = window.HB || {};
  var EN = C.jazyk === "en";
  var pruh = document.getElementById("k-odpocet");
  if (!pruh || !C.url) return;
  function t(s) { var T = window.HB_T; return (EN && T && T[s]) || s; }
  function sklon(n, a, b, c) { return n === 1 ? a : (n >= 2 && n <= 4 ? b : c); }
  function rpc(fce, data) {
    return fetch(C.url + "/rest/v1/rpc/" + fce, {
      method: "POST",
      headers: { apikey: C.klic, Authorization: "Bearer " + C.klic, "Content-Type": "application/json" },
      body: JSON.stringify(data || {})
    }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function kdy(d) {
    if (EN) return d.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    var dny = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
    return dny[d.getDay()] + " " + d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear() +
      " v " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  var OD = null, casovac = null;
  function stav() {
    var s = Math.floor((OD - new Date()) / 1000);
    if (s <= 0) { pruh.hidden = true; clearInterval(casovac); return; }
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    document.getElementById("k-odpocet-cas").textContent =
      (d ? d + " " + (EN ? (d === 1 ? "day" : "days") : sklon(d, "den", "dny", "dní")) + " " : "") +
      String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(x).padStart(2, "0");
    pruh.hidden = false;
  }
  rpc("web_rocnik_webu").then(function (rok) {
    return rpc("web_param_cas", { p_klic: "registrace_od", p_rok: rok });
  }).then(function (od) {
    if (!od) return;
    OD = new Date(od);
    if (OD <= new Date()) return;
    document.getElementById("k-odpocet-od").textContent = kdy(OD);
    stav();
    casovac = setInterval(stav, 1000);
  }).catch(function () { /* bez termínu se pruh neukáže */ });
})();

// Kapitánská sekce – krok 5: kontrola a potvrzení. Seznam pravidel s fajfkou nebo křížkem a odkazem, kde to opravit,
// ostatní upozornění a tlačítko „Potvrdit soupisku a etapy“ (Keksa 4. 10. 2026).
// Texty upozornění přicházejí z databáze česky; na anglických stránkách je zkusí přeložit HBK.prelozHlasku (slovník se vzory).
(function () {
  var t = HBK.t, tf = HBK.tf;
  var e = HBK.esc, P = null, BEZCI = [];
  function text(x) { return e(HBK.prelozHlasku(x.text)); }

  function vykresli() {
    var u = P.upozorneni || [], vede = P.role !== "bezec";
    function ma(d) { return u.filter(function (x) { return d.indexOf(x.druh) >= 0; }); }
    var body = [
      { ok: P.bezcu > 0, n: e(t("Na soupisce je aspoň jeden běžec")), url: "/kapitan/soupiska/" },
      { ok: !ma(["neuplne"]).length, n: e(t("Všichni běžci mají vyplněné povinné údaje")), url: "/kapitan/soupiska/", detail: ma(["neuplne"]) },
      { ok: Number(P.obsazenych_etap) === 30 && !ma(["etapy_chybi"]).length, n: e(tf("Všech 30 etap má běžce ({0} z 30)", P.obsazenych_etap)), url: "/kapitan/etapy/", detail: ma(["etapy_chybi"]) },
      { ok: !ma(["tretiny", "bez_etapy"]).length, n: e(t("Každý běžec má etapu z každé třetiny trati (1–10, 11–20, 21–30)")), url: "/kapitan/etapy/", detail: ma(["tretiny", "bez_etapy"]) }
    ];
    var lzePotvrdit = body.every(function (b) { return b.ok; });
    var ostatni = u.filter(function (x) { return ["neuplne", "etapy_chybi", "tretiny", "bez_etapy"].indexOf(x.druh) < 0; });
    var h = ['<p class="k-hlaska" id="k-stav" role="status"></p>'];
    h.push('<div class="k-karta"><h2>' + t("Pravidla") + '</h2><ul class="k-kontrola">' + body.map(function (b) {
      return '<li class="' + (b.ok ? "k-ok-bod" : "k-chyba-bod") + '"><span aria-hidden="true">' + (b.ok ? "✓" : "✗") + "</span><div>" + b.n +
        (b.ok ? "" : ' · <a href="' + HB.zaklad + HBK.adresa(b.url) + '">' + t("opravit") + "</a>") +
        (b.detail && b.detail.length ? '<small>' + b.detail.map(text).join(" ") + "</small>" : "") + "</div></li>";
    }).join("") + "</ul></div>");
    if (ostatni.length) h.push('<div class="k-karta"><h2>' + t("Zkontroluj ještě") + '</h2><p class="pocet">' + t("Tohle potvrzení nebrání, ale podívej se na to.") + '</p><ul class="k-upozorneni">' +
      ostatni.map(function (x) { return "<li>" + text(x) + "</li>"; }).join("") + "</ul></div>");
    // co se potvrzuje: běžci a jejich etapy (UX revize 5. 10. 2026)
    if (BEZCI.length) h.push('<div class="k-karta"><h2>' + t("Co potvrzuješ") + '</h2><div class="k-tabulka-obal"><table class="k-tabulka"><thead><tr><th>' + t("Běžec") + "</th><th>" + t("Etapy") + "</th></tr></thead><tbody>" +
      BEZCI.map(function (b) { return "<tr><td>" + e(b.jmeno + " " + b.prijmeni) + "</td><td>" + e((b.etapy || []).join(", ") || "—") + "</td></tr>"; }).join("") +
      "</tbody></table></div></div>");
    if (P.soupiska_potvrzena) {
      h.push('<div class="k-karta"><p class="k-velky"><span class="k-stitek k-stitek-ok">' + t("potvrzeno") + "</span> " + e(HBK.cas(P.soupiska_potvrzena)) + "</p>" +
        '<p class="pocet">' + t("Soupisku i etapy máš potvrzené, díky. Každá další změna potvrzení zruší a bude potřeba potvrdit znovu.") + "</p></div>");
    } else if (vede && P.soupiska_otevrena) {
      h.push('<div class="k-akce k-akce-hlavni"><button type="button" class="k-tlacitko k-tlacitko-s-napovedou" id="k-potvrdit"' + (lzePotvrdit ? "" : " disabled") + ">" + t("Potvrdit soupisku a etapy") +
        "<small>" + (lzePotvrdit ? t("Dáš nám vědět, že máš soupisku i etapy hotové. Potvrdí se i konečný počet běžců.") : t("Půjde, až budou splněná všechna pravidla výš.")) + "</small></button></div>");
    } else if (!P.soupiska_otevrena) {
      h.push('<p class="k-pozn">' + t("Soupiska a etapy jsou uzavřené. Změny řeší pořadatel na info@horybory.cz.") + "</p>");
    }
    document.getElementById("k-obsah").innerHTML = h.join("");
  }

  document.addEventListener("click", async function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("#k-potvrdit"); if (!b) return;
    b.disabled = true;
    try {
      await HBK.rpc("web_k_potvrd_soupisku", {});
      P = await HBK.rpc("web_k_prehled"); vykresli(); HBK.kroky(P); HBK.toast(t("Potvrzeno, děkujeme."));
    } catch (err) { HBK.hlaska("k-stav", err.message, true); b.disabled = false; }
  });

  document.addEventListener("DOMContentLoaded", async function () {
    P = await HBK.vyzadovat(); if (!P) return;
    try { BEZCI = (await HBK.rpc("web_k_soupiska")) || []; } catch (err) { BEZCI = []; }
    vykresli();
  });
})();

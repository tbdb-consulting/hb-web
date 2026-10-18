// Administrace – Odkud týmy přišly (zadání z marketingu 18. 10. 2026). Vidí právo Týmy.
// Tabulky podle odpovědi v registraci, utm_source a utm_campaign; dole volné texty u „Jinak“. Databáze: web_admin_zdroje.
(function () {
  var esc = HBA.esc;

  function tabulka(nadpis, sloupec, radky, prvni) {
    var h = '<section class="hl-blok"><h2>' + esc(nadpis) + "</h2>";
    if (!radky.length) return h + '<p class="adm-sub">Zatím nic.</p></section>';
    h += '<table class="hl-tab"><thead><tr>' + (prvni ? "<th>utm_source</th>" : "") + "<th>" + esc(sloupec) +
      '</th><th class="hl-cislo">Týmů</th><th class="hl-cislo">Z toho zaplaceno</th></tr></thead><tbody>';
    radky.forEach(function (r) {
      h += "<tr>" + (prvni ? "<td>" + esc(r.source) + "</td>" : "") + "<td>" + esc(r.nazev || r.hodnota) +
        '</td><td class="hl-cislo">' + r.pocet + '</td><td class="hl-cislo">' + r.zaplaceno + "</td></tr>";
    });
    return h + "</tbody></table></section>";
  }

  async function nacti() {
    var el = document.getElementById("zd-obsah"), d;
    try { d = await HBA.rpc("web_admin_zdroje", {}); } catch (e) { el.innerHTML = '<p class="adm-chyba">' + esc(e.message) + "</p>"; return; }
    var h = '<p class="hl-souhrn">Ročník ' + esc(d.rok) + " · týmů " + d.celkem + " · z toho náhradníků " + d.nahradnici + " · zaplaceno " + d.zaplaceno + "</p>";
    h += tabulka("Podle odpovědi „Odkud znáš Hory Bory?“", "Odpověď", d.odpovedi);
    h += tabulka("Podle utm_source", "utm_source", d.utm_source);
    h += tabulka("Podle utm_campaign", "utm_campaign", d.utm_campaign, true);
    h += '<section class="hl-blok"><h2>Odpověď „Jinak“ – co kapitáni napsali</h2>' + (d.jinak.length
      ? "<ul>" + d.jinak.map(function (j) { return "<li><strong>" + esc(j.tym) + "</strong>: " + esc(j.text) + "</li>"; }).join("") + "</ul>"
      : '<p class="adm-sub">Zatím nic.</p>') + "</section>";
    el.innerHTML = h;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var j = await HBA.vyzadovat(); if (!j) return;
    await nacti();
  });
})();

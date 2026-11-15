/* Lišta souhlasu s cookies a měření návštěvnosti (Keksa 15. 11. 2026).
   Google Analytics 4 a Meta Pixel jsou stejné účty jako na starém webu (z kontejneru GTM-MR7FWSM).
   Nic se nenačte, dokud návštěvník nesouhlasí. Měří se jen na ostrém webu (www.horybory.cz),
   na zkušebních adresách se lišta ukáže, ale kódy se nenačtou.
   Kapitánská sekce se neměří (v adresách bývají přihlašovací odkazy). Volba se pamatuje 6 měsíců. */
(function () {
  var GA4 = "G-2N267L05R7";
  var PIXEL = "968694829989313";
  var KLIC = "hb-souhlas";
  var PLATNOST = 182 * 24 * 3600 * 1000;
  var OSTRY = /(^|\.)horybory\.cz$/.test(location.hostname) && location.hostname.indexOf("novy.") !== 0;
  var SOUKROMA = /^\/(kapitan|en\/captain)(\/|$)/.test(location.pathname);
  var EN = document.documentElement.lang === "en";

  var T = EN ? {
    nadpis: "Cookies",
    text: "We'd like to measure visits to the website and the reach of our ads on Facebook and Instagram. We only use these cookies with your consent.",
    vse: "Accept all", nutne: "Necessary only", nastaveni: "Settings", ulozit: "Save choice",
    analyticke: "Analytics (Google Analytics): how many people visit the website and where they come from",
    marketing: "Marketing (Meta Pixel): measuring and targeting ads on Facebook and Instagram",
    vice: "More in the privacy policy", odkaz: "/en/privacy/"
  } : {
    nadpis: "Cookies",
    text: "Rádi bychom měřili návštěvnost webu a dosah reklam na Facebooku a Instagramu. Tyto cookies použijeme jen s tvým souhlasem.",
    vse: "Povolit vše", nutne: "Jen nutné", nastaveni: "Nastavení", ulozit: "Uložit výběr",
    analyticke: "Analytické (Google Analytics): kolik lidí web navštíví a odkud přišli",
    marketing: "Marketingové (Meta Pixel): měření a cílení reklam na Facebooku a Instagramu",
    vice: "Víc v zásadách zpracování údajů", odkaz: "/gdpr/"
  };

  function nacti() {
    try {
      var s = JSON.parse(localStorage.getItem(KLIC) || "null");
      if (s && s.cas && Date.now() - s.cas < PLATNOST) return s;
    } catch (e) {}
    return null;
  }
  function uloz(analyticke, marketing) {
    var s = { analyticke: !!analyticke, marketing: !!marketing, cas: Date.now() };
    try { localStorage.setItem(KLIC, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  // adresa bez parametrů, kromě utm_* (aby se do měření nedostaly odkazy s tokeny)
  function cistaAdresa() {
    var q = location.search.replace(/^\?/, "").split("&").filter(function (p) { return /^utm_/.test(p); }).join("&");
    return location.origin + location.pathname + (q ? "?" + q : "");
  }
  function skript(src) {
    var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s);
  }
  var spusteno = { analyticke: false, marketing: false };
  function spust(s) {
    if (!OSTRY || SOUKROMA) return;
    if (s.analyticke && !spusteno.analyticke) {
      spusteno.analyticke = true;
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", GA4, { page_location: cistaAdresa() });
      skript("https://www.googletagmanager.com/gtag/js?id=" + GA4);
    }
    if (s.marketing && !spusteno.marketing) {
      spusteno.marketing = true;
      var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!window._fbq) window._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      skript("https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", PIXEL);
      window.fbq("track", "PageView");
    }
  }

  // Událost pro měření (např. odeslaná registrace) – zavolá se jen to, co návštěvník povolil.
  window.HB_udalost = function (google, meta, data) {
    if (window.gtag && spusteno.analyticke) window.gtag("event", google, data || {});
    if (window.fbq && spusteno.marketing) window.fbq("track", meta, data || {});
  };

  var lista;
  function zavri() { if (lista) { lista.remove(); lista = null; } }
  function ukaz(sNastavenim) {
    zavri();
    var s = nacti() || { analyticke: false, marketing: false };
    var zaklad = (window.HB_ZAKLAD || "");
    lista = document.createElement("div");
    lista.className = "souhlas";
    lista.setAttribute("role", "dialog");
    lista.setAttribute("aria-label", T.nadpis);
    lista.innerHTML =
      '<div class="souhlas-obal">' +
      '<p class="souhlas-text"><strong>' + T.nadpis + '.</strong> ' + T.text +
      ' <a href="' + zaklad + T.odkaz + '">' + T.vice + '</a></p>' +
      '<div class="souhlas-volby"' + (sNastavenim ? "" : " hidden") + '>' +
      '<label><input type="checkbox" checked disabled> ' + (EN ? "Necessary (login to the captain's section)" : "Nutné (přihlášení do kapitánské sekce)") + '</label>' +
      '<label><input type="checkbox" id="souhlas-a"' + (s.analyticke ? " checked" : "") + '> ' + T.analyticke + '</label>' +
      '<label><input type="checkbox" id="souhlas-m"' + (s.marketing ? " checked" : "") + '> ' + T.marketing + '</label>' +
      '</div>' +
      '<div class="souhlas-tlacitka">' +
      '<button type="button" class="tlacitko" data-v="vse">' + T.vse + '</button>' +
      '<button type="button" class="tlacitko tlacitko-obrys" data-v="nutne">' + T.nutne + '</button>' +
      '<button type="button" class="souhlas-odkaz" data-v="nastaveni">' + (sNastavenim ? T.ulozit : T.nastaveni) + '</button>' +
      '</div></div>';
    document.body.appendChild(lista);
    lista.addEventListener("click", function (e) {
      var v = e.target.getAttribute && e.target.getAttribute("data-v");
      if (!v) return;
      if (v === "nastaveni" && lista.querySelector(".souhlas-volby").hidden) {
        lista.querySelector(".souhlas-volby").hidden = false;
        e.target.textContent = T.ulozit;
        return;
      }
      var vysledek = v === "vse" ? uloz(true, true)
        : v === "nutne" ? uloz(false, false)
        : uloz(lista.querySelector("#souhlas-a").checked, lista.querySelector("#souhlas-m").checked);
      zavri();
      // odvolaný souhlas: už načtené kódy se zastaví až po obnovení stránky
      if ((spusteno.analyticke && !vysledek.analyticke) || (spusteno.marketing && !vysledek.marketing)) location.reload();
      else spust(vysledek);
    });
  }
  window.HB_nastaveniCookies = function () { ukaz(true); };

  var ulozeny = nacti();
  if (ulozeny) spust(ulozeny);
  else if (!SOUKROMA) ukaz(false);
})();

// Vyskakovací okno na úvodní stránce (Keksa 19. 10. 2026). Nastavení se čte při každém otevření stránky
// (funkce web_popup), takže změna v administraci platí hned, bez sestavení webu. Obsah: text, video (nahraný soubor),
// obrázek nebo karusel fotek. Návštěvník okno uvidí jednou; když ho zavře, zapamatuje se verze obsahu
// a znovu se ukáže až po změně obsahu v administraci. Administrace volá HBPopup.ukaz(data) pro náhled.
(function () {
  var K_ZAVRENO = "hb_popup_zavreno";
  function url(cesta) { return HB.url + "/storage/v1/object/public/" + String(cesta).split("/").map(encodeURIComponent).join("/"); }
  function el(tag, trida, text) { var e = document.createElement(tag); if (trida) e.className = trida; if (text) e.textContent = text; return e; }
  var klidne = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function video(p) {
    var obal = el("div", "pp-video");
    var v = document.createElement("video");
    v.src = url(p.video); v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto";
    v.loop = p.video_smycka !== false; v.muted = true; v.autoplay = true;
    obal.appendChild(v);
    if (p.video_zvuk) {
      // Prohlížeče nedovolí spustit video se zvukem samo – zkusí se se zvukem, jinak běží ztlumené s tlačítkem.
      var b = el("button", "pp-zvuk", "🔊 Zapnout zvuk"); b.type = "button";
      b.addEventListener("click", function () { v.muted = !v.muted; if (!v.muted) v.play().catch(function () {}); b.textContent = v.muted ? "🔊 Zapnout zvuk" : "🔇 Vypnout zvuk"; });
      obal.appendChild(b);
      v.muted = false;
      v.play().then(function () { b.textContent = "🔇 Vypnout zvuk"; }).catch(function () { v.muted = true; v.play().catch(function () {}); });
    } else {
      v.play().catch(function () {});
    }
    return obal;
  }

  function karusel(p) {
    var fotky = (p.karusel || []).map(url), i = 0, casovac = null;
    var obal = el("div", "pp-karusel"); obal.setAttribute("aria-roledescription", "karusel");
    var img = el("img"); img.alt = ""; img.src = fotky[0]; obal.appendChild(img);
    // další fotky se načtou dopředu, ať přechod nebliká
    fotky.slice(1).forEach(function (u) { var x = new Image(); x.src = u; });
    var tecky = el("div", "pp-tecky");
    fotky.forEach(function (_, k) { var t = el("button"); t.type = "button"; t.setAttribute("aria-label", "Fotka " + (k + 1)); t.addEventListener("click", function () { jdi(k); spust(); }); tecky.appendChild(t); });
    function jdi(k) { i = (k + fotky.length) % fotky.length; img.src = fotky[i]; [].forEach.call(tecky.children, function (t, n) { t.setAttribute("aria-current", n === i); }); }
    function spust() { clearInterval(casovac); if (!klidne && fotky.length > 1) casovac = setInterval(function () { jdi(i + 1); }, (p.karusel_sekund || 5) * 1000); }
    var pred = el("button", "pp-sipka pp-pred", "‹"), dal = el("button", "pp-sipka pp-dal", "›");
    pred.type = dal.type = "button"; pred.setAttribute("aria-label", "Předchozí fotka"); dal.setAttribute("aria-label", "Další fotka");
    pred.addEventListener("click", function () { jdi(i - 1); spust(); }); dal.addEventListener("click", function () { jdi(i + 1); spust(); });
    obal.addEventListener("mouseenter", function () { clearInterval(casovac); }); obal.addEventListener("mouseleave", spust);
    obal.appendChild(pred); obal.appendChild(dal); obal.appendChild(tecky);
    jdi(0); spust();
    obal._stop = function () { clearInterval(casovac); };
    return obal;
  }

  function ukaz(p, volby) {
    volby = volby || {};
    var stary = document.getElementById("pp-okno"); if (stary) stary.remove();
    var d = document.createElement("dialog"); d.id = "pp-okno"; d.className = "pp pp-" + (p.velikost || "stredni");
    if (p.nadpis) d.setAttribute("aria-label", p.nadpis);
    var zavrit = el("button", "pp-zavrit", "×"); zavrit.type = "button"; zavrit.setAttribute("aria-label", "Zavřít");
    d.appendChild(zavrit);
    var media = null;
    if (p.typ === "video" && p.video) media = video(p);
    else if (p.typ === "obrazek" && p.obrazek) { media = el("div", "pp-obrazek"); var im = el("img"); im.src = url(p.obrazek); im.alt = p.nadpis || ""; media.appendChild(im); }
    else if (p.typ === "karusel" && (p.karusel || []).length) media = karusel(p);
    if (media) d.appendChild(media);
    if (p.nadpis || p.text || p.tlacitko_text) {
      var t = el("div", "pp-text");
      if (p.nadpis) t.appendChild(el("h2", "", p.nadpis));
      if (p.text) String(p.text).split(/\n{2,}/).forEach(function (o) { var odst = el("p"); o.split("\n").forEach(function (r, n) { if (n) odst.appendChild(document.createElement("br")); odst.appendChild(document.createTextNode(r)); }); t.appendChild(odst); });
      if (p.tlacitko_text && p.tlacitko_url) { var a = el("a", "c-btn pp-tlacitko", p.tlacitko_text); a.href = /^\//.test(p.tlacitko_url) ? (HB.zaklad || "") + p.tlacitko_url : p.tlacitko_url; t.appendChild(a); }
      d.appendChild(t);
    }
    function konec() {
      var v = d.querySelector("video"); if (v) v.pause();
      if (media && media._stop) media._stop();
      if (!volby.nahled) { try { localStorage.setItem(K_ZAVRENO, String(p.verze)); } catch (e) {} }
      d.close(); d.remove();
    }
    zavrit.addEventListener("click", konec);
    d.addEventListener("cancel", function (e) { e.preventDefault(); konec(); });          // klávesa Esc
    d.addEventListener("click", function (e) { if (e.target === d) konec(); });           // klik vedle okna
    document.body.appendChild(d);
    d.showModal();
    zavrit.focus();
  }
  window.HBPopup = { ukaz: ukaz };

  // Úvodní stránka: načíst a ukázat, pokud ho návštěvník ještě nezavřel.
  if (!document.currentScript || document.currentScript.dataset.auto !== "ano") return;
  fetch(HB.url + "/rest/v1/rpc/web_popup", { method: "POST", headers: { apikey: HB.klic, Authorization: "Bearer " + HB.klic, "Content-Type": "application/json" }, body: "{}" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (p) {
      if (!p || typeof p !== "object") return;
      var zavreno = null; try { zavreno = localStorage.getItem(K_ZAVRENO); } catch (e) {}
      if (zavreno === String(p.verze)) return;
      ukaz(p);
    })
    .catch(function () {});
})();

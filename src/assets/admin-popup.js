// Administrace – vyskakovací okno na úvodní stránce (Keksa 19. 10. 2026). Čte a ukládá web_admin_popup / web_admin_popup_uloz,
// video a obrázky nahrává do veřejného úložiště web-popup, fotky z galerie bere z úložiště fotky-nahledy (cesta i se jménem úložiště).
(async function () {
  var j = await HBA.vyzadovat(); if (!j) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = HBA.esc, P = null, karusel = [];
  var verejne = function (cesta) { return HB.url + "/storage/v1/object/public/" + String(cesta).split("/").map(encodeURIComponent).join("/"); };

  function hlaska(t, druh) { var h = $("pa-hlaska"); h.textContent = t || ""; h.className = druh || ""; }
  // datetime-local pracuje v místním čase bez zóny
  function naMistni(iso) { if (!iso) return ""; var d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  function zMistni(v) { return v ? new Date(v).toISOString() : null; }

  function ukazCasti() {
    var typ = $("pa-typ").value;
    document.querySelectorAll(".pa-cast").forEach(function (f) { f.hidden = f.dataset.typ !== typ; });
    if (typ === "karusel" && !$("pa-galerie-obal").open) $("pa-galerie-obal").open = true;
  }
  function kresliKarusel() {
    $("pa-karusel").innerHTML = karusel.map(function (c, i) {
      return '<li><img src="' + esc(verejne(c)) + '" alt=""><div class="pa-ovl">' +
        '<button type="button" data-k="vlevo" data-i="' + i + '" aria-label="Posunout dopředu">←</button>' +
        '<button type="button" data-k="pryc" data-i="' + i + '" aria-label="Vyřadit">×</button>' +
        '<button type="button" data-k="vpravo" data-i="' + i + '" aria-label="Posunout dozadu">→</button></div></li>';
    }).join("") || '<li class="adm-sub">Karusel je zatím prázdný – přidej aspoň 2 fotky.</li>';
    if (typeof galerie !== "undefined" && galerie.length) kresliGalerii();
  }
  function vyplnObrazek() { $("pa-obrazek-nahled").innerHTML = P.obrazek ? '<img src="' + esc(verejne(P.obrazek)) + '" alt="">' : ""; }
  function vyplnVideo() { $("pa-video-info").textContent = P.video ? "Nahrané video: " + P.video.split("/").pop() : "Video zatím není nahrané."; }

  function vypln() {
    $("pa-aktivni").checked = !!P.aktivni;
    $("pa-od").value = naMistni(P.od); $("pa-do").value = naMistni(P["do"]);
    $("pa-velikost").value = P.velikost || "stredni"; $("pa-typ").value = P.typ || "text";
    $("pa-video-zvuk").checked = !!P.video_zvuk; $("pa-video-smycka").checked = P.video_smycka !== false;
    $("pa-sekund").value = P.karusel_sekund || 5;
    $("pa-nadpis").value = P.nadpis || ""; $("pa-text").value = P.text || "";
    $("pa-tl-text").value = P.tlacitko_text || ""; $("pa-tl-url").value = P.tlacitko_url || "";
    karusel = (P.karusel || []).slice();
    vyplnObrazek(); vyplnVideo(); kresliKarusel(); ukazCasti();
    var ted = new Date(), platne = P.aktivni && (!P.od || new Date(P.od) <= ted) && (!P["do"] || new Date(P["do"]) > ted);
    $("pa-stav").innerHTML = platne ? "<b>Okno se teď na webu ukazuje.</b> Verze obsahu " + P.verze + "."
      : (P.aktivni ? "Okno je zapnuté, ale teď je mimo nastavený termín." : "Okno je vypnuté, na webu se neukazuje.");
  }
  function sesbirej() {
    return {
      aktivni: $("pa-aktivni").checked, od: zMistni($("pa-od").value), "do": zMistni($("pa-do").value),
      velikost: $("pa-velikost").value, typ: $("pa-typ").value,
      video: P.video, video_zvuk: $("pa-video-zvuk").checked, video_smycka: $("pa-video-smycka").checked,
      obrazek: P.obrazek, karusel: karusel, karusel_sekund: Number($("pa-sekund").value) || 5,
      nadpis: $("pa-nadpis").value.trim(), text: $("pa-text").value.trim(),
      tlacitko_text: $("pa-tl-text").value.trim(), tlacitko_url: $("pa-tl-url").value.trim(), verze: P.verze
    };
  }

  // Nahrání do úložiště web-popup. Obrázky prohlížeč zmenší (delší strana nejvýš 1800 px), video jde, jak je.
  async function zmensi(soubor, delka) {
    var bmp = await createImageBitmap(soubor, { imageOrientation: "from-image" });
    var k = Math.min(1, delka / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    var g = c.getContext("2d"); g.imageSmoothingQuality = "high"; g.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(function (ok) { c.toBlob(ok, "image/jpeg", 0.85); });
  }
  async function nahraj(soubor, jeObrazek) {
    var jmeno = Date.now() + "-" + soubor.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").toLowerCase();
    var telo = soubor, typ = soubor.type;
    if (jeObrazek) { telo = await zmensi(soubor, 1800); typ = "image/jpeg"; jmeno = jmeno.replace(/\.[a-z0-9]+$/, "") + ".jpg"; }
    var r = await fetch(HB.url + "/storage/v1/object/web-popup/" + encodeURIComponent(jmeno), {
      method: "POST", headers: { apikey: HB.klic, Authorization: "Bearer " + (await HBA.token()), "Content-Type": typ, "x-upsert": "true", "cache-control": "max-age=31536000" }, body: telo });
    if (!r.ok) throw new Error("Nahrání se nepovedlo (" + r.status + "): " + (await r.text()).slice(0, 120));
    return "web-popup/" + jmeno;
  }

  $("pa-typ").addEventListener("change", ukazCasti);
  $("pa-video-soubor").addEventListener("change", async function (e) {
    var f = e.target.files[0]; if (!f) return;
    if (f.size > 100 * 1024 * 1024) { hlaska("Video je větší než 100 MB, zmenši ho prosím.", "chyba"); e.target.value = ""; return; }
    hlaska("Nahrávám video " + Math.round(f.size / 1048576) + " MB…");
    try { P.video = await nahraj(f, false); vyplnVideo(); hlaska("Video je nahrané. Nezapomeň uložit.", "ok"); }
    catch (err) { hlaska(err.message, "chyba"); }
    e.target.value = "";
  });
  $("pa-obrazek-soubor").addEventListener("change", async function (e) {
    var f = e.target.files[0]; if (!f) return;
    hlaska("Nahrávám obrázek…");
    try { P.obrazek = await nahraj(f, true); vyplnObrazek(); hlaska("Obrázek je nahraný. Nezapomeň uložit.", "ok"); }
    catch (err) { hlaska(err.message, "chyba"); }
    e.target.value = "";
  });
  $("pa-karusel-soubory").addEventListener("change", async function (e) {
    var fs = Array.prototype.slice.call(e.target.files); if (!fs.length) return;
    try {
      for (var i = 0; i < fs.length; i++) { hlaska("Nahrávám obrázek " + (i + 1) + " z " + fs.length + "…"); karusel.push(await nahraj(fs[i], true)); kresliKarusel(); }
      hlaska("Obrázky jsou v karuselu. Nezapomeň uložit.", "ok");
    } catch (err) { hlaska(err.message, "chyba"); }
    e.target.value = "";
  });
  $("pa-karusel").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]"); if (!b) return;
    var i = Number(b.dataset.i), k = b.dataset.k;
    if (k === "pryc") karusel.splice(i, 1);
    else { var z = k === "vlevo" ? i - 1 : i + 1; if (z < 0 || z >= karusel.length) return; var x = karusel[i]; karusel[i] = karusel[z]; karusel[z] = x; }
    kresliKarusel();
  });

  // Galerie ročníků pro karusel (19. 10. 2026): výběr jako u třídění fotek – klik označí, Shift+klik rozsah,
  // tlačítko přidá označené na konec karuselu. Fotky, které už v karuselu jsou, mají štítek.
  var letos = new Date().getFullYear() % 100 + 1, galerie = [], vyber = {}, posledni = null;
  for (var r = letos; r >= 19; r--) { var o = document.createElement("option"); o.value = "HB" + r; o.textContent = "HB" + r + " (20" + r + ")"; $("pa-galerie-rok").appendChild(o); }
  $("pa-galerie-rok").value = "HB26";
  async function nactiGalerii() {
    $("pa-galerie").innerHTML = '<p class="adm-sub">Načítám…</p>';
    vyber = {}; posledni = null; kresliVyber();
    try { galerie = (await HBA.rpc("web_admin_fotky_prehled", { p_rok: $("pa-galerie-rok").value })).galerie || []; } catch (err) { galerie = []; }
    kresliGalerii();
  }
  function zobrazene() {
    var s = $("pa-galerie-sekce").value;
    return galerie.filter(function (x) { return !s || x[2] === s; }).map(function (x) { return "fotky-nahledy/" + x[1]; });
  }
  function kresliGalerii() {
    $("pa-galerie").innerHTML = zobrazene().map(function (c) {
      var x = galerie.filter(function (g) { return "fotky-nahledy/" + g[1] === c; })[0];
      return '<button type="button" data-c="' + esc(c) + '" aria-pressed="' + !!vyber[c] + '" title="' + esc(x[0]) + '"><img loading="lazy" src="' + esc(verejne(c)) + '" alt="' + esc(x[0]) + '">' +
        (karusel.indexOf(c) >= 0 ? '<span class="pa-uz">v karuselu</span>' : "") + "</button>";
    }).join("") || '<p class="adm-sub">V ročníku nejsou žádné fotky.</p>';
  }
  function kresliVyber() {
    var n = Object.keys(vyber).length;
    $("pa-galerie-akce").innerHTML = '<span>Vybráno <b>' + n + "</b></span>" +
      '<button type="button" class="adm-tlacitko" id="pa-pridat"' + (n ? "" : " disabled") + ">Přidat vybrané do karuselu</button>" +
      '<button type="button" class="adm-tlacitko-male" id="pa-vse">Vybrat vše zobrazené</button>' +
      '<button type="button" class="adm-tlacitko-male" id="pa-zrusit"' + (n ? "" : " disabled") + ">Zrušit výběr</button>";
  }
  $("pa-galerie-obal").addEventListener("toggle", function () { if (this.open && !galerie.length) nactiGalerii(); });
  $("pa-galerie-rok").addEventListener("change", nactiGalerii);
  $("pa-galerie-sekce").addEventListener("change", function () { kresliGalerii(); });
  $("pa-galerie").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-c]"); if (!b) return;
    var c = b.dataset.c, seznam = zobrazene();
    if (e.shiftKey && posledni !== null && seznam.indexOf(posledni) >= 0) {
      var a = seznam.indexOf(posledni), z = seznam.indexOf(c);
      seznam.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(function (x) { vyber[x] = 1; });
    } else if (vyber[c]) delete vyber[c]; else vyber[c] = 1;
    posledni = c;
    $("pa-galerie").querySelectorAll("button[data-c]").forEach(function (x) { x.setAttribute("aria-pressed", !!vyber[x.dataset.c]); });
    kresliVyber();
  });
  $("pa-galerie-akce").addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "pa-vse") zobrazene().forEach(function (c) { vyber[c] = 1; });
    else if (t.id === "pa-zrusit") { vyber = {}; posledni = null; }
    else if (t.id === "pa-pridat") {
      // v pořadí galerie, bez fotek, které už v karuselu jsou
      var nove = zobrazene().concat(Object.keys(vyber)).filter(function (c, i, a) { return vyber[c] && a.indexOf(c) === i && karusel.indexOf(c) < 0; });
      karusel = karusel.concat(nove); vyber = {}; posledni = null; kresliKarusel();
      var fotek = function (n) { return n + (n === 1 ? " fotka" : n >= 2 && n <= 4 ? " fotky" : " fotek"); };
      hlaska((nove.length === 1 ? "Přidána " : nove.length >= 2 && nove.length <= 4 ? "Přidány " : "Přidáno ") + fotek(nove.length) +
        ", v karuselu " + (karusel.length >= 2 && karusel.length <= 4 ? "jsou" : "je") + " teď " + fotek(karusel.length) + ". Nezapomeň uložit.", "ok");
    } else return;
    kresliVyber(); kresliGalerii();
  });

  $("pa-nahled").addEventListener("click", function () {
    var p = sesbirej();
    if (p.typ === "karusel" && karusel.length < 1) { hlaska("Karusel je prázdný.", "chyba"); return; }
    window.HBPopup.ukaz(p, { nahled: true });
  });
  $("pa-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var b = $("pa-ulozit"); b.disabled = true; hlaska("Ukládám…");
    try {
      P = await HBA.rpc("web_admin_popup_uloz", { p: sesbirej() });
      vypln(); hlaska("Uloženo. " + (P.aktivni ? "Na webu platí hned." : "Okno je vypnuté."), "ok");
    } catch (err) { hlaska(err.message, "chyba"); }
    b.disabled = false;
  });

  try { P = await HBA.rpc("web_admin_popup"); $("pa-form").hidden = false; vypln(); }
  catch (err) { $("pa-stav").textContent = err.message; }
})();

// Kapitánská sekce – krok 1: přehled týmu a startovné (QR platba). Soupiska, počet, etapy a potvrzení
// mají vlastní kroky; tady je jen tým, platba a krátký stav, dál se jde tlačítkem „Dál“ (Keksa 4. 10. 2026).
(function () {
  var e = HBK.esc;
  var t = HBK.t, tf = HBK.tf;

  // Údaje k platbě: každý řádek jde zkopírovat jedním klepnutím (na telefonu QR naskenovat nejde). UX revize 5. 10. 2026.
  function radekKopie(nazev, hodnota, kopie) {
    return "<dt>" + nazev + '</dt><dd class="k-kopie"><span>' + e(hodnota || "–") + "</span>" +
      (hodnota ? '<button type="button" class="k-odkaz" data-kopie="' + e(kopie || hodnota) + '" aria-label="' + e(tf("Zkopírovat {0}", nazev.toLowerCase())) + '">' + t("Zkopírovat") + "</button>" : "") + "</dd>";
  }
  function platba(p) {
    return '<div class="k-platba"><dl class="k-dl k-dl-platba">' +
      radekKopie(t("Účet"), p.ucet) + radekKopie(t("Variabilní symbol"), p.vs) +
      radekKopie(t("Částka"), HBK.kc(p.castka_kc), String(p.castka_kc || "")) + "</dl>" +
      // Na telefonu je QR schovaný pod rozbalením – z vlastního displeje ho kapitán nenaskenuje (revize vzhledu 18. 10. 2026).
      (p.qr_spayd ? '<details class="k-qr-obal"' + (window.matchMedia && matchMedia("(max-width: 600px)").matches ? "" : " open") + "><summary>" + t("QR kód pro bankovní aplikaci") + "</summary>" +
        '<div class="k-qr"><div id="k-qr-obr" aria-label="' + t("QR kód pro platbu startovného") + '"></div><small>' + t("Naskenuj ho v bankovní aplikaci, třeba z počítače nebo z jiného telefonu.") + "</small></div></details>" : "") +
      "</div>";
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("[data-kopie]"); if (!b) return;
    var hotovo = function () { var puvodni = b.textContent; b.textContent = t("Zkopírováno"); setTimeout(function () { b.textContent = puvodni; }, 1500); };
    try { navigator.clipboard.writeText(b.dataset.kopie).then(hotovo, function () {}); } catch (err) {}
  });

  function vykresli(p) {
    var h = [];
    h.push('<div class="k-mrizka">');
    h.push('<div class="k-karta"><h2>' + t("Tým") + '</h2><dl class="k-dl">' +
      "<dt>" + t("Název") + "</dt><dd>" + e(p.nazev) + "</dd>" +
      "<dt>" + t("Číslo týmu") + "</dt><dd>" + (p.cislo ? e(p.cislo) : t("přidělíme později")) + "</dd>" +
      "<dt>" + t("Ročník") + "</dt><dd>" + e(p.rocnik) + "</dd>" +
      "<dt>" + t("Registrace") + "</dt><dd>" + (p.stav === "nahradnik" ? t("náhradník – startovné zatím neplať") : p.stav === "zruseno" ? t("zrušená") : t("přijatá")) + "</dd>" +
      "<dt>" + t("Start") + "</dt><dd>" + (p.start_cas ? HBK.cas(p.start_cas) : t("čas startu pošleme nejpozději týden před závodem")) + "</dd>" +
      (p.role !== "bezec" && p.zaplaceno ? "<dt>" + t("Startovné") + "</dt><dd>" + e(tf("zaplaceno {0}", HBK.datum(p.zaplaceno_dne))) + "</dd>" : "") +
      "<dt>" + t("Soupiska a etapy") + "</dt><dd>" + (p.soupiska_otevrena ? (p.soupiska_do ? e(tf("měnit jde do {0}", HBK.cas(p.soupiska_do))) : t("měnit jde do termínu, který ještě oznámíme"))
                                                         : "<b>" + t("uzavřené") + "</b>, " + t("změny řeší pořadatel na info@horybory.cz")) + "</dd>" +
      "</dl></div>");
    // Startovné: QR platba, údaje pro ruční zadání malým písmem pod ní. Jen dokud není zaplaceno a ne u běžce (Keksa 10. 10. 2026).
    if (!HBK.bezStartovneho(p)) h.push('<div class="k-karta"><h2>' + t("Startovné") + '</h2><dl class="k-dl">' +
      "<dt>" + t("Stav") + "</dt><dd>" + (p.zaplaceno ? '<span class="k-stitek k-stitek-ok">' + e(tf("zaplaceno {0}", HBK.datum(p.zaplaceno_dne))) + "</span>"
                                         : '<span class="k-stitek k-stitek-ne">' + t("zatím nezaplaceno") + "</span>") + "</dd>" +
      (p.zaplaceno ? "<dt>" + t("Částka") + "</dt><dd>" + e(HBK.kc(p.castka_kc)) + "</dd>" : "") +
      "</dl>" +
      (!p.zaplaceno ? platba(p) : "") +
      "</div>");
    h.push("</div>");
    document.getElementById("k-obsah").innerHTML = h.join("");
    if (!p.zaplaceno && p.qr_spayd) nakresliQr(p.qr_spayd);
  }

  // QR kód kreslí knihovna qrcode-generator (MIT), uložená na webu; načte se jen tady.
  function nakresliQr(text) {
    function kresli() {
      var cil = document.getElementById("k-qr-obr"); if (!cil || !window.qrcode) return;
      var q = window.qrcode(0, "M"); q.addData(text); q.make();
      cil.innerHTML = q.createImgTag(6, 0);
      var img = cil.querySelector("img"); if (img) img.alt = t("QR kód pro platbu startovného");
    }
    if (window.qrcode) return kresli();
    var s = document.createElement("script"); s.src = HB.zaklad + "/assets/qrcode.min.js"; s.onload = kresli; document.head.appendChild(s);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var p = await HBK.vyzadovat(); if (!p) return;
    vykresli(p);
    vedeni(p);
    harmonogram();
    oprava();
  });

  // Oprava času (9. 10. 2026): od startu závodu, nebo když už tým nějakou žádost má, odkaz na stránku Oprava času.
  async function oprava() {
    var o = null;
    try { o = await HBK.rpc("web_k_oprava_casu"); } catch (err) { return; }
    if (!o || (!o.otevreno && !(o.zadosti || []).length)) return;
    var ceka = o.zadosti.filter(function (z) { return z.stav === "ceka"; }).length, vyr = o.zadosti.length - ceka;
    var m = document.querySelector(".k-mrizka"); if (!m) return;
    m.insertAdjacentHTML("beforeend", '<div class="k-karta"><h2>' + t("Oprava času") + "</h2><p>" +
      (o.zadosti.length ? t("Žádosti:") + " " + (ceka ? tf("{0} čeká", ceka) : "") + (ceka && vyr ? ", " : "") + (vyr ? tf("{0} vyřízeno", vyr) : "") + "."
                        : t("Je některý čas na předávce špatně nebo chybí? Napiš nám.")) + "</p>" +
      '<div class="k-akce"><a class="k-tlacitko" href="' + HB.zaklad + HBK.adresa("/kapitan/oprava-casu/") + '">' + (o.zadosti.length ? t("Žádosti o opravu času") : t("Požádat o opravu času")) + "</a></div></div>");
  }
  // Kapitán a zástupce (11. 10. 2026): kapitán a zástupce vidí kartu s odkazem na stránku Kapitán a zástupce.
  function vedeni(p) {
    if (p.role === "bezec") return;
    var m = document.querySelector(".k-mrizka"); if (!m) return;
    m.insertAdjacentHTML("beforeend", '<div class="k-karta"><h2>' + t("Kapitán a zástupce") + "</h2><p>" +
      (p.role === "kapitan" ? t("Předat tým jinému kapitánovi nebo změnit zástupce.") : t("Kdo tým vede. Kapitána a zástupce mění kapitán.")) + "</p>" +
      '<div class="k-akce"><a class="k-tlacitko" href="' + HB.zaklad + HBK.adresa("/kapitan/kapitan-a-zastupce/") + '">' + t("Kapitán a zástupce") + "</a></div></div>");
    // Seznamka (11. 10. 2026): poptávka týmu „Hledáme běžce“
    m.insertAdjacentHTML("beforeend", '<div class="k-karta"><h2>' + t("Chybí ti běžci?") + "</h2><p>" + t("Dej poptávku do seznamky na webu.") + "</p>" +
      '<div class="k-akce"><a class="k-vedlejsi" href="' + HB.zaklad + HBK.adresa("/kapitan/seznamka/") + '">' + t("Hledáme běžce") + "</a></div></div>");
  }
  // Startovní čas (11. 10. 2026): po zveřejnění startovní listiny karta s časem startu a odkazem na harmonogram (celý tým).
  async function harmonogram() {
    var H = null;
    try { H = await HBK.rpc("web_k_harmonogram"); } catch (err) { return; }
    if (!H || !H.zverejneno || !H.spocitano) return;
    var F = new Intl.DateTimeFormat(HBK.en ? "en-GB" : "cs-CZ", { timeZone: "Europe/Prague", weekday: "short", day: "numeric", month: HBK.en ? "short" : "numeric", hour: "2-digit", minute: "2-digit" });
    var m = document.querySelector(".k-mrizka"); if (!m) return;
    m.insertAdjacentHTML("afterbegin", '<div class="k-karta"><h2>' + t("Startovní čas") + "</h2><p><b>" + HBK.esc(F.format(new Date(H.start))) + "</b>" +
      (H.vlna ? " · " + HBK.esc(tf("{0}. vlna", H.vlna)) : "") + "</p>" +
      '<div class="k-akce"><a class="k-tlacitko" href="' + HB.zaklad + HBK.adresa("/kapitan/startovni-cas/") + '">' + t("Harmonogram etap") + "</a></div></div>");
  }
})();

// Seznamka – Hledám tým / Hledáme běžce (Keksa 11. 10. 2026). Veřejný seznam inzerátů běžců bez týmu a poptávek týmů,
// kontakt přes formulář (e-mail autora se nikde neukáže), nový inzerát běžce se zveřejní až po potvrzení odkazem z e-mailu.
// Jména veřejně jen „Jméno I.“. Inzeráty zmizí po skončení závodu. Poptávku za tým zadává kapitán nebo zástupce v kapitánské sekci.
// Databáze: web_seznamka_seznam, web_seznamka_pridat, web_seznamka_napsat (bez přihlášení).
(function () {
  var C = window.HB, KRAJE = [];
  // Angličtina (20. 10. 2026): L("česky", "anglicky") podle jazyka stránky.
  var EN = C && C.jazyk === "en";
  function L(cs, en) { return EN ? en : cs; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  async function rpc(f, d) {
    var r = await fetch(C.url + "/rest/v1/rpc/" + f, { method: "POST", headers: { apikey: C.klic, Authorization: "Bearer " + C.klic, "Content-Type": "application/json" }, body: JSON.stringify(d || {}) });
    var j = await r.json().catch(function () { return null; });
    if (!r.ok) throw new Error((j && (j.message || j.hint)) || L("Chyba ", "Error ") + r.status);
    return j;
  }
  window.HBS = { rpc: rpc, esc: esc, kraje: async function () {
    if (KRAJE.length) return KRAJE;
    var r = await fetch(C.url + "/rest/v1/web_kraj?select=kod,nazev,zeme&aktivni=eq.true&order=poradi", { headers: { apikey: C.klic, Authorization: "Bearer " + C.klic } });
    KRAJE = r.ok ? await r.json() : []; return KRAJE;
  }, krajSelect: function (id, vybrany) {
    var Z = { CZ: L("Česko", "Czech Republic"), SK: L("Slovensko", "Slovakia"), PL: L("Polsko", "Poland") }, z = null, h = '<select id="' + id + '"><option value="">' + L("— neuvádím —", "— not stated —") + '</option>';
    KRAJE.forEach(function (k) { if (k.zeme !== z) { if (z) h += "</optgroup>"; z = k.zeme; h += '<optgroup label="' + esc(Z[z] || z) + '">'; }
      h += '<option value="' + esc(k.kod) + '"' + (k.kod === vybrany ? " selected" : "") + ">" + esc(k.nazev) + "</option>"; });
    return h + (z ? "</optgroup>" : "") + "</select>";
  } };

  var D = null, el = document.getElementById("seznamka"), F = new Intl.DateTimeFormat(EN ? "en-GB" : "cs-CZ", { day: "numeric", month: EN ? "short" : "numeric", year: "numeric" });
  if (!el) return;

  function inzerat(x) {
    var tym = x.druh === "tym";
    return '<article class="sz-inzerat" id="sz-' + x.id + '"><h3>' + esc(tym ? x.tym : x.jmeno) + "</h3>" +
      '<p class="sz-meta">' + [tym ? (EN ? "looking for " + x.pocet + (x.pocet === 1 ? " runner" : " runners") : "hledá " + x.pocet + (x.pocet < 5 ? " běžce" : " běžců"))
          : (x.etap ? (EN ? "can run " + x.etap + (x.etap === 1 ? " stage" : " stages") : "zvládne " + x.etap + (x.etap === 1 ? " etapu" : x.etap < 5 ? " etapy" : " etap")) : ""),
        x.kraj, x.vykonnost ? x.vykonnost + " min / 10 km" : "", L("přidáno ", "posted ") + F.format(new Date(x.vytvoreno))].filter(Boolean).map(esc).join(" · ") + "</p>" +
      '<p class="sz-text">' + esc(x.text) + "</p>" +
      '<div class="sz-napsat-misto"><button type="button" class="sz-vedlejsi" data-napsat="' + x.id + '">' + (tym ? L("Napsat týmu", "Write to the team") : L("Napsat běžci", "Write to the runner")) + "</button></div></article>";
  }

  function vykresli() {
    var tymy = D.inzeraty.filter(function (x) { return x.druh === "tym"; }), bezci = D.inzeraty.filter(function (x) { return x.druh === "bezec"; });
    var h = '<p class="sz-pozn">' + L("Hledáš tým, nebo běžce do týmu? Napiš inzerát. Na webu se ukáže jen křestní jméno a první písmeno příjmení, " +
      "e-mail nikde. Kdo ti chce napsat, použije formulář a zprávu ti pošleme e-mailem. Inzeráty zmizí po skončení závodu.",
      "Looking for a team, or for runners for your team? Post a listing. Only your first name and the initial of your surname appear on the website, " +
      "your e-mail never does. Anyone who wants to write to you uses the form and we send you the message by e-mail. Listings disappear after the race. Our e-mails are in Czech.") + "</p>";
    h += '<div class="sz-sloupce"><section><h2>' + L("Týmy hledají běžce", "Teams looking for runners") + '</h2>' + (tymy.length ? tymy.map(inzerat).join("") : '<p class="sz-prazdno">' + L("Zatím žádná poptávka.", "No requests yet.") + '</p>') +
      '<p class="sz-pozn">' + L('Kapitán nebo zástupce zadá poptávku za tým v <a href="' + C.zaklad + '/kapitan/seznamka/">kapitánské sekci</a>.',
        'The captain or deputy posts a request for their team in the <a href="' + C.zaklad + '/kapitan/seznamka/">captain\'s section</a> (in Czech).') + '</p></section>' +
      "<section><h2>" + L("Běžci hledají tým", "Runners looking for a team") + "</h2>" + (bezci.length ? bezci.map(inzerat).join("") : '<p class="sz-prazdno">' + L("Zatím žádný inzerát.", "No listings yet.") + '</p>') + "</section></div>";
    if (D.otevreno) h += '<div id="sz-pridat-misto"><button type="button" class="sz-tlacitko" id="sz-pridat">' + L("Přidat inzerát – hledám tým", "Post a listing – I'm looking for a team") + '</button></div>';
    else h += '<p class="sz-prazdno">' + L("Seznamka letos skončila.", "The team finder is closed for this year.") + '</p>';
    el.innerHTML = h;
  }

  function formNapsat(id) {
    return '<form class="sz-form" data-form-napsat="' + id + '" novalidate>' +
      '<div class="sz-radek"><label>' + L("Tvoje jméno *", "Your name *") + '<input name="jmeno" autocomplete="name"></label><label>' + L("Tvůj e-mail *", "Your e-mail *") + '<input name="email" type="email" autocomplete="email"><small>' + L("Na něj ti autor odpoví.", "The author will reply to this address.") + '</small></label></div>' +
      '<label>' + L("Zpráva *", "Message *") + '<textarea name="text" rows="4" maxlength="2000"></textarea></label><p class="sz-hlaska" role="status"></p>' +
      '<button type="submit" class="sz-tlacitko">' + L("Odeslat zprávu", "Send message") + '</button> <button type="button" class="sz-vedlejsi" data-zavrit>' + L("Zavřít", "Close") + '</button></form>';
  }

  function formPridat() {
    return '<form class="sz-form" id="sz-form-pridat" novalidate><h2>' + L("Hledám tým", "I'm looking for a team") + '</h2>' +
      '<div class="sz-radek"><label>' + L("Jméno *", "First name *") + '<input name="jmeno" autocomplete="given-name"></label><label>' + L("Příjmení *", "Surname *") + '<input name="prijmeni" autocomplete="family-name"><small>' + L("Na webu jen první písmeno.", "Only the initial appears on the website.") + '</small></label></div>' +
      '<label>E-mail *<input name="email" type="email" autocomplete="email"><small>' + L("Nikde se neukáže. Přijde na něj odkaz, kterým inzerát zveřejníš, upravíš nebo stáhneš.", "It is never shown. You'll receive a link to publish, edit or remove your listing (the e-mail is in Czech).") + '</small></label>' +
      '<div class="sz-radek"><label>' + L("Kraj", "Region") + HBS.krajSelect("sz-kraj") + '</label><label>' + L("Výkonnost na 10 km", "10 km time") + '<input name="vykonnost" inputmode="numeric" placeholder="52:30"></label>' +
      '<label>' + L("Kolik etap zvládneš", "How many stages can you run") + '<input name="etap" type="number" min="1" max="30" inputmode="numeric"></label></div>' +
      '<label>' + L("O mně *", "About me *") + '<textarea name="text" rows="4" maxlength="1000" placeholder="' + L("Jak běháš, odkud jsi, jestli máš auto…", "How you run, where you're from, whether you have a car…") + '"></textarea></label>' +
      '<p class="sz-hlaska" role="status"></p><button type="submit" class="sz-tlacitko">' + L("Odeslat inzerát", "Submit listing") + '</button> <button type="button" class="sz-vedlejsi" data-zavrit-pridat>' + L("Zavřít", "Close") + '</button></form>';
  }

  function hlaska(f, t, chyba) { var h = f.querySelector(".sz-hlaska"); h.textContent = t; h.className = "sz-hlaska" + (t ? (chyba ? " chyba" : " ok") : ""); }

  el.addEventListener("click", async function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.napsat) { b.parentNode.innerHTML = formNapsat(b.dataset.napsat); return; }
    if ("zavrit" in b.dataset) { var f = b.closest("form"); f.parentNode.innerHTML = '<button type="button" class="sz-vedlejsi" data-napsat="' + f.dataset.formNapsat + '">' + L("Napsat", "Write") + '</button>'; return; }
    if (b.id === "sz-pridat") { await HBS.kraje(); document.getElementById("sz-pridat-misto").innerHTML = formPridat(); return; }
    if ("zavritPridat" in b.dataset) { document.getElementById("sz-pridat-misto").innerHTML = '<button type="button" class="sz-tlacitko" id="sz-pridat">' + L("Přidat inzerát – hledám tým", "Post a listing – I'm looking for a team") + '</button>'; }
  });

  el.addEventListener("input", function (ev) { var f = ev.target.closest && ev.target.closest("form"); if (f && f.querySelector(".sz-hlaska")) hlaska(f, ""); });
  el.addEventListener("submit", async function (ev) {
    ev.preventDefault(); var f = ev.target, v = function (n) { return (f.elements[n] && f.elements[n].value || "").trim(); };
    var b = f.querySelector("button[type=submit]");
    if (f.dataset.formNapsat) {
      if (!v("jmeno")) return hlaska(f, L("Napiš své jméno.", "Please enter your name."), true);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) return hlaska(f, L("E-mail nemá správný tvar.", "The e-mail address isn't valid."), true);
      if (!v("text")) return hlaska(f, L("Napiš zprávu.", "Please write a message."), true);
      b.disabled = true;
      try { await rpc("web_seznamka_napsat", { p_id: Number(f.dataset.formNapsat), p_jmeno: v("jmeno"), p_email: v("email"), p_text: v("text") });
        f.parentNode.innerHTML = '<p class="sz-hlaska ok">' + L("Zpráva je odeslaná. Autor ti odpoví na tvůj e-mail.", "Your message has been sent. The author will reply to your e-mail.") + '</p>'; }
      catch (e) { hlaska(f, e.message, true); b.disabled = false; }
      return;
    }
    if (f.id === "sz-form-pridat") {
      if (!v("jmeno") || !v("prijmeni")) return hlaska(f, L("Vyplň jméno a příjmení.", "Please enter your first name and surname."), true);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) return hlaska(f, L("E-mail nemá správný tvar.", "The e-mail address isn't valid."), true);
      if (v("vykonnost") && !/^\d{1,2}:\d{2}$/.test(v("vykonnost"))) return hlaska(f, L("Výkonnost napiš jako čas na 10 km, např. 52:30.", "Enter your fitness as a 10 km time, e.g. 52:30."), true);
      if (!v("text")) return hlaska(f, L("Napiš pár slov o sobě.", "Please write a few words about yourself."), true);
      b.disabled = true;
      try { await rpc("web_seznamka_pridat", { p_jmeno: v("jmeno"), p_prijmeni: v("prijmeni"), p_email: v("email"), p_kraj: document.getElementById("sz-kraj").value || null,
          p_vykonnost: v("vykonnost") || null, p_etap: v("etap") ? Number(v("etap")) : null, p_text: v("text") });
        document.getElementById("sz-pridat-misto").innerHTML = '<p class="sz-pozn">' + L("<b>Skoro hotovo.</b> Poslali jsme ti e-mail s odkazem. Inzerát se zveřejní, až na odkaz klikneš.", "<b>Almost done.</b> We've sent you an e-mail (in Czech) with a link. Your listing will be published once you click it.") + '</p>'; }
      catch (e) { hlaska(f, e.message, true); b.disabled = false; }
    }
  });

  rpc("web_seznamka_seznam").then(function (d) { D = d; vykresli(); }).catch(function (e) { el.innerHTML = '<p class="sz-hlaska chyba">' + esc(e.message) + "</p>"; });
})();

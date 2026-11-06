// Nový vzhled webu: stahovací hlavička, menu, slider na úvodní stránce, obsah dlouhých stránek a hledání v otázkách.
(function () {
  // hlavička: po odscrollování se stáhne a místo velkého loga ukáže minimální
  var hlavicka = document.getElementById("hlavicka");
  function priScrollu() { hlavicka.classList.toggle("stazena", window.scrollY > 40); }
  priScrollu();
  window.addEventListener("scroll", priScrollu, { passive: true });

  // mobilní menu
  var tlacitko = document.querySelector(".menu-tlacitko");
  var menu = document.getElementById("menu");
  tlacitko.addEventListener("click", function () {
    var otevreno = menu.classList.toggle("otevrene");
    tlacitko.setAttribute("aria-expanded", otevreno ? "true" : "false");
    document.documentElement.style.setProperty("--hlavicka-aktualni", hlavicka.offsetHeight + "px");
  });

  // „Další“ v menu i na klávesnici / dotyk
  var vice = document.querySelector(".vice");
  var viceTl = document.querySelector(".vice-tlacitko");
  if (vice) viceTl.addEventListener("click", function () {
    var o = vice.classList.toggle("otevrene");
    viceTl.setAttribute("aria-expanded", o ? "true" : "false");
  });
  document.addEventListener("click", function (e) {
    if (vice && !vice.contains(e.target)) { vice.classList.remove("otevrene"); viceTl.setAttribute("aria-expanded", "false"); }
  });

  // slider
  var hero = document.querySelector(".hero");
  if (!hero) return;
  var snimky = hero.querySelectorAll(".snimek");
  var tecky = hero.querySelector(".tecky");
  var INTERVAL = 6000;
  var aktualni = 0, casovac = null;
  var klid = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  hero.style.setProperty("--interval", INTERVAL + "ms");

  snimky.forEach(function (_, i) {
    var b = document.createElement("button");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", (document.documentElement.lang === "en" ? "Photo " + (i + 1) + " of " : "Fotka " + (i + 1) + " z ") + snimky.length);
    b.addEventListener("click", function () { ukaz(i, true); });
    tecky.appendChild(b);
  });
  var tlTecky = tecky.querySelectorAll("button");

  function ukaz(i, rucne) {
    aktualni = (i + snimky.length) % snimky.length;
    snimky.forEach(function (s, j) {
      s.classList.toggle("aktivni", j === aktualni);
      var img = s.querySelector("img");
      if (j === aktualni) { img.loading = "eager"; img.style.animation = "none"; void img.offsetWidth; img.style.animation = ""; }
    });
    tlTecky.forEach(function (b, j) { b.setAttribute("aria-selected", j === aktualni ? "true" : "false"); });
    // restart animace průběhu u aktivní tečky
    var akt = tlTecky[aktualni];
    akt.style.display = "none"; void akt.offsetWidth; akt.style.display = "";
    if (rucne) spust();
  }
  function spust() {
    clearInterval(casovac);
    if (klid) return;
    casovac = setInterval(function () { ukaz(aktualni + 1); }, INTERVAL);
  }
  hero.querySelectorAll(".sipka").forEach(function (b) {
    b.addEventListener("click", function () { ukaz(aktualni + Number(b.dataset.smer), true); });
  });
  hero.addEventListener("mouseenter", function () { clearInterval(casovac); hero.classList.add("pauza"); });
  hero.addEventListener("mouseleave", function () { hero.classList.remove("pauza"); spust(); });
  // swipe na mobilu
  var x0 = null;
  hero.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) ukaz(aktualni + (dx < 0 ? 1 : -1), true);
    x0 = null;
  });

  ukaz(0);
  spust();
})();

(function () {
  var toc = document.querySelector(".obsah-stranky ol");
  if (toc) {
    var nadpisy = document.querySelectorAll(".prose h2");
    nadpisy.forEach(function (h, i) {
      if (!h.id) h.id = "cast-" + (i + 1);
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      toc.appendChild(li);
    });
    if (!nadpisy.length) toc.parentNode.remove();
    var odkazy = toc.querySelectorAll("a");
    window.addEventListener("scroll", function () {
      var akt = -1;
      nadpisy.forEach(function (h, i) { if (h.getBoundingClientRect().top < 160) akt = i; });
      odkazy.forEach(function (a, i) { a.classList.toggle("aktivni", i === akt); });
    }, { passive: true });
  }

  var hledat = document.getElementById("faq-hledat");
  if (hledat) {
    var otazky = document.querySelectorAll(".otazka");
    hledat.addEventListener("input", function () {
      var q = hledat.value.trim().toLowerCase();
      otazky.forEach(function (o) { o.hidden = !!q && o.textContent.toLowerCase().indexOf(q) < 0; });
    });
  }
})();

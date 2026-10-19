// Obsah webu se stahuje ze Supabase při buildu, ne v prohlížeči návštěvníka.
// Když databáze neodpoví, build spadne schválně — je lepší nevydat nic
// než vydat web s prázdnými stránkami.
import web from "./web.js";
import { readFile } from "node:fs/promises";

// Zkušební režim: když se nastaví OBSAH_ZE_SOUBORU, obsah se vezme z místního
// souboru misto/obsah-nanecisto.json místo z databáze. Slouží jen k vyzkoušení
// šablon tam, kde na Supabase není vidět. Při ostrém buildu se nepoužívá.
const zeSouboru = process.env.OBSAH_ZE_SOUBORU;

// Otázky FAQ se vypisují jako prostý text. Starý editor je ukládal jako HTML (<p>, &aacute;…),
// a pak se na webu zobrazovaly kódy místo písmen. Proto se tu značky odstraní a znakové
// entity převedou na písmena, ať se chyba nevrátí ani po další úpravě v editoru (4. 10. 2026).
const ENTITY = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", ndash: "–", mdash: "—",
  hellip: "…", bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’", bull: "•" };
const DIAKRITIKA = { acute: "\u0301", caron: "\u030C", ring: "\u030A", uml: "\u0308" };
function cistyText(s) {
  return String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z])(acute|caron|ring|uml);/g, (_, pismeno, znamenko) => (pismeno + DIAKRITIKA[znamenko]).normalize("NFC"))
    .replace(/&([a-zA-Z]+);/g, (cele, nazev) => ENTITY[nazev] ?? cele)
    .replace(/\s+/g, " ")
    .trim();
}

// Odkazy a obrázky v textech z databáze se píšou od kořene webu (/kapitan/prihlaseni/).
// Na testovací adrese běží web v podsložce /hb-web/, proto se jim tu začátek doplní (12. 10. 2026).
// Odkazy na jiné weby (https://…) a //adresy se nemění.
function sZakladem(html) {
  if (!html || !web.zaklad) return html;
  return String(html).replace(/(href|src)="\/(?!\/)/g, `$1="${web.zaklad}/`);
}

async function tabulka(cesta) {
  const url = `${web.supabaseUrl}/rest/v1/${cesta}`;
  const odpoved = await fetch(url, {
    headers: { apikey: web.supabaseKlic, Authorization: `Bearer ${web.supabaseKlic}` },
  });
  if (!odpoved.ok) {
    throw new Error(`Supabase nevrátil data pro ${cesta}: ${odpoved.status} ${await odpoved.text()}`);
  }
  return odpoved.json();
}

// Které textové bloky patří na kterou stránku. Pořadí je pořadí na stránce.
const blokyStranek = {
  "uvod": ["infoList", "whyContent"],
  "o-zavodu": ["proposition"],
  "trasa": ["route", "route-last"],
  "pravidla": ["rules", "outfit", "penalties"],
  "startovne": ["startingFee", "startingPayment", "registration"],
};

// Archiv výsledků minulých ročníků a karty „Vítězové ročníků“ na stránce Výsledky (Keksa 12. 10. 2026).
// Data jsou z výsledkových listin 2019–2026 (tabulka web_vysledky_archiv), fotky vítězů z katalogu fotek.
// Vítězky ženské kategorie = nejrychlejší tým s kategorií Z; kde kategorie Z není, řádek „Ženy“ se nezobrazí.
async function archivVysledku() {
  const [radky, fotky] = await Promise.all([
    tabulka("web_vysledky_archiv?select=rok,poradi,cislo,tym,kategorie,cas&order=rok.desc,poradi.asc"),
    tabulka("web_vitezove_foto?select=*"),
  ]);
  const foto = (rok, kat) => {
    const f = fotky.find((x) => x.rok === rok && x.kategorie === kat);
    return f ? `${web.supabaseUrl}/storage/v1/object/public/fotky-nahledy/${f.nahled}` : null;
  };
  const roky = [...new Set(radky.map((r) => r.rok))];
  return roky.map((rok) => {
    const tymy = radky.filter((r) => r.rok === rok).map((r) => ({ ...r, cas: String(r.cas).slice(0, 8) }));
    const zeny = tymy.filter((r) => r.kategorie === "Z");
    const letopocet = "20" + rok.slice(2);
    return {
      rok, letopocet, adresa: `/vysledky/${letopocet}/`,
      vitez: tymy[0], dalsi: tymy.slice(1, 3), zeny: zeny[0] || null,
      fotoCelkem: foto(rok, "celkem"), fotoZeny: foto(rok, "zeny"),
      sCisly: tymy.some((r) => r.cislo), sKategorii: zeny.length > 0,
      tymy,
    };
  });
}

// Galerie Fotky (Keksa 12. 10. 2026, rozhodnutí 20. 9.: galerie čte tabulku fotky). Funkce web_galerie vrátí
// ročníky s fotkami, které jsou na webu a mají náhled 768 px v úložišti fotky-nahledy. Náhled = [jméno, sekce, fotograf].
async function galerie() {
  const data = await tabulka("rpc/web_galerie");
  const zaklad = `${web.supabaseUrl}/storage/v1/object/public/fotky-nahledy/`;
  return (data || []).map((g) => {
    const fotky = g.fotky.map(([n, s, a]) => ({ u: zaklad + n, s: s || "", a: a || "" }));
    const sekce = ["start", "trasa", "cil"].filter((k) => fotky.some((f) => f.s === k));
    const letopocet = "20" + g.rok.slice(2);
    return { rok: g.rok, letopocet, adresa: `/fotky/${letopocet}/`, pocet: fotky.length, sekce,
             // úvodní fotka nastavená v administraci, jinak fotka v první třetině (Keksa 18. 10. 2026)
             obal: g.obal ? zaklad + g.obal : fotky[Math.floor(fotky.length / 3)].u, fotky };
  });
}

export default async function () {
  if (zeSouboru) {
    const o = JSON.parse(await readFile(zeSouboru, "utf8"));
    // zkušební data jsou jen česky
    o.stranky.forEach((s) => { s.jazyk = "cs"; s.alt = { cs: s.adresa }; });
    return { strankyEn: [], otazkyEn: [], adresy: {}, enNaWebu: false, ...o, vsechnyStranky: o.stranky };
  }
  const [stranky, preklady, texty, textyPreklady, faq, faqPreklady, jazyky] = await Promise.all([
    tabulka("web_stranky?select=*&order=poradi"),
    tabulka("web_stranky_preklady?select=*"),
    tabulka("web_texty?select=*&order=poradi"),
    tabulka("web_texty_preklady?select=*"),
    tabulka("web_faq?select=*&order=poradi"),
    tabulka("web_faq_preklady?select=*"),
    tabulka("web_jazyky?select=*&order=poradi"),
  ]);
  const [archiv, fotogalerie] = await Promise.all([archivVysledku(), galerie()]);

  // Dva jazyky (20. 10. 2026): čeština na /, angličtina na /en/. Anglická stránka vznikne jen tam, kde je překlad.
  // Angličtina se sestaví vždy (kvůli kontrole), ale dokud nemá v web_jazyky na_webu, nemá přepínač a neindexuje se.
  const predpona = { cs: "", en: "/en" };
  function strankyJazyka(jazyk) {
    const textPodleKodu = {};
    for (const t of texty) {
      const p = textyPreklady.find((x) => x.text_id === t.id && x.jazyk === jazyk);
      if (p) textPodleKodu[t.kod] = { titulek: p.titulek, obsah: sZakladem(p.obsah), popis: t.popis };
    }
    return stranky
      .filter((s) => s.aktivni && s.sekce === "verejna")
      .map((s) => {
        const p = preklady.find((x) => x.stranka_id === s.id && x.jazyk === jazyk);
        if (!p) return null;
        return {
          jazyk,
          kod: s.kod,
          stav: s.stav,
          upozorneni: jazyk === "cs" ? s.upozorneni : null,
          poradi: s.poradi,
          titulek: p.titulek,
          slug: p.slug,
          adresa: predpona[jazyk] + (p.slug === "" ? "/" : `/${p.slug}/`),
          text: sZakladem(p.text),
          metaPopis: p.meta_popis,
          bloky: (blokyStranek[s.kod] || []).map((kod) => textPodleKodu[kod]).filter(Boolean),
        };
      })
      .filter(Boolean);
  }
  function otazkyJazyka(jazyk) {
    return faq
      .filter((f) => f.aktivni)
      .map((f) => {
        const p = faqPreklady.find((x) => x.faq_id === f.id && x.jazyk === jazyk);
        return p ? { poradi: f.poradi, otazka: cistyText(p.otazka), odpoved: sZakladem(p.odpoved) } : null;
      })
      .filter(Boolean);
  }
  const seznamStranek = strankyJazyka("cs");
  const strankyEn = strankyJazyka("en");
  // adresy stránek podle kódu v obou jazycích – pro přepínač jazyka a odkazy v šablonách
  const adresy = {};
  for (const s of seznamStranek.concat(strankyEn)) (adresy[s.kod] = adresy[s.kod] || {})[s.jazyk] = s.adresa;
  for (const s of seznamStranek.concat(strankyEn)) s.alt = adresy[s.kod];

  return {
    stranky: seznamStranek,
    strankyEn,
    vsechnyStranky: seznamStranek.concat(strankyEn),
    adresy,
    otazky: otazkyJazyka("cs"),
    otazkyEn: otazkyJazyka("en"),
    jazyky: jazyky.filter((j) => j.aktivni),
    enNaWebu: !!(jazyky.find((j) => j.kod === "en") || {}).na_webu,
    archiv,
    galerie: fotogalerie,
    // stránky ročníků (archiv výsledků, galerie) v obou jazycích
    archivStranky: archiv.flatMap((r) => [
      { jazyk: "cs", r, adresa: r.adresa, altCs: r.adresa, altEn: `/en/results/${r.letopocet}/` },
      { jazyk: "en", r, adresa: `/en/results/${r.letopocet}/`, altCs: r.adresa, altEn: `/en/results/${r.letopocet}/` }]),
    galerieStranky: fotogalerie.flatMap((g) => [
      { jazyk: "cs", g, adresa: g.adresa, altCs: g.adresa, altEn: `/en/photos/${g.letopocet}/` },
      { jazyk: "en", g, adresa: `/en/photos/${g.letopocet}/`, altCs: g.adresa, altEn: `/en/photos/${g.letopocet}/` }]),
    staženo: new Date().toISOString(),
  };
}

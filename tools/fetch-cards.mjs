#!/usr/bin/env node
/**
 * Baik · card builder
 *
 * The one rule this exists to enforce: no Arabic is ever typed, pasted from a webpage,
 * or generated. Every character arrives from a verified machine-readable source, keyed,
 * and can be regenerated from that key. The English and Malay prose around a dua is ours
 * to write. The dua itself never is.
 *
 * Usage
 *   node tools/fetch-cards.mjs cards.input.json > cards.out.json
 *   node tools/fetch-cards.mjs cards.input.json --check      (validate, emit nothing)
 *
 * The Qur'an text comes from a local export you supply (see tools/README.md). Hadith text
 * comes from the sunnah.com API when SUNNAH_API_KEY is set. Anything the script cannot
 * verify is refused and listed; it is never filled in with a guess.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* fileURLToPath, not URL.pathname: a project path with spaces in it arrives
   percent-encoded otherwise, and every lookup silently misses. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'tools', 'data');

/* Where the Qur'an export may live. Any one of these is enough. Formats:
   - tanzil "quran-uthmani.txt": lines of "sura|aya|text"
   - QUL / quran.com JSON export: { "25:74": "…" } or [{surah,ayah,text}]                */
const QURAN_SOURCES = [
  { file: 'quran-uthmani.txt', edition: 'tanzil-uthmani-hafs', parse: parseTanzilTxt },
  { file: 'qpc-uthmani.json',  edition: 'qul-qpc-uthmani',     parse: parseJsonExport },
  { file: 'quran-uthmani.json', edition: 'tanzil-uthmani-hafs', parse: parseJsonExport },
];

const HELP_QURAN = `
  No Qur'an text export found in tools/data/.

  Drop ONE of these in, then run again:
    · quran-uthmani.txt    Tanzil "Uthmani" plain text  ·  https://tanzil.net/download/
    · qpc-uthmani.json     QUL export                   ·  https://qul.tarteel.ai/

  Nothing is downloaded automatically and no text is ever written by this script:
  the export is the source of truth, and it must be obtained deliberately so its
  licence and edition are known. Tanzil's terms require the text to stay verbatim.
`;

/* ---------- parsers: each returns Map("surah:ayah" -> text) ---------- */

function parseTanzilTxt(raw) {
  const map = new Map();
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;          // Tanzil files carry a licence header
    const parts = t.split('|');
    if (parts.length < 3) continue;
    const [sura, aya, ...rest] = parts;
    if (!/^\d+$/.test(sura) || !/^\d+$/.test(aya)) continue;
    map.set(`${+sura}:${+aya}`, rest.join('|').trim());
  }
  return map;
}

function parseJsonExport(raw) {
  const map = new Map();
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    for (const row of data) {
      const key = row.key || row.verse_key || (row.surah && row.ayah ? `${row.surah}:${row.ayah}` : null);
      const text = row.text || row.text_uthmani || row.ar;
      if (key && text) map.set(String(key), String(text).trim());
    }
  } else {
    for (const [key, val] of Object.entries(data)) {
      const text = typeof val === 'string' ? val : (val && (val.text || val.text_uthmani));
      if (text) map.set(String(key), String(text).trim());
    }
  }
  return map;
}

/* ---------- loading ---------- */

async function loadQuran() {
  for (const src of QURAN_SOURCES) {
    const file = path.join(DATA, src.file);
    if (!existsSync(file)) continue;
    const raw = await readFile(file, 'utf8');
    const map = src.parse(raw);
    if (map.size < 6000) {
      throw new Error(`${src.file} parsed to only ${map.size} ayat; the export looks incomplete.`);
    }
    return { map, edition: src.edition, file: src.file };
  }
  throw new Error(HELP_QURAN);
}

async function fetchHadith(collection, number) {
  const key = process.env.SUNNAH_API_KEY;
  if (!key) {
    return { error: 'SUNNAH_API_KEY is not set, so hadith text cannot be verified. See tools/README.md.' };
  }
  const url = `https://api.sunnah.com/v1/collections/${collection}/hadiths/${number}`;
  const res = await fetch(url, { headers: { 'x-api-key': key } });
  if (!res.ok) return { error: `sunnah.com returned ${res.status} for ${collection}:${number}` };
  const body = await res.json();
  const ar = (body.hadith || []).find(h => h.lang === 'ar');
  const en = (body.hadith || []).find(h => h.lang === 'en');
  if (!ar || !ar.body) return { error: `no Arabic body in sunnah.com response for ${collection}:${number}` };
  return {
    ar: stripTags(ar.body).trim(),
    enBody: en ? stripTags(en.body).trim() : '',
    grading: (en && en.grades && en.grades[0] && en.grades[0].grade) || '',
  };
}

const stripTags = s => String(s).replace(/<[^>]*>/g, '');

/* ---------- the build ---------- */

const REQUIRED = ['srcKind', 'srcKey', 'set', 'cats', 'ten', 'pen'];
/* how many consecutive ayat one card may carry. A dua that runs across two or three ayat is
   ordinary; anything longer is a passage, and belongs on its own card or not at all. */
const MAX_SPAN = 4;
/* a surah card carries a whole short surah, so it is held to its own, longer limit */
const MAX_SURAH_SPAN = 30;
/* end-of-ayah mark, then the ayah number in Arabic-Indic digits. A numeral, not scripture:
   the surah cards already in the deck separate their ayat this way. */
const AYA_MARK = n => ' ۝' + String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);

async function build(input, quran) {
  const cards = [];
  const refused = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const [i, row] of input.entries()) {
    const where = `row ${i + 1}${row.ten ? ` (${row.ten})` : ''}`;
    const missing = REQUIRED.filter(f => !row[f] || (Array.isArray(row[f]) && !row[f].length));
    if (missing.length) { refused.push(`${where}: missing ${missing.join(', ')}`); continue; }

    /* Arabic supplied by hand in the input is a hard error, not a convenience. */
    if (row.ar) { refused.push(`${where}: 'ar' was supplied by hand. Arabic comes from the source, never the input.`); continue; }

    const card = {
      set: row.set, cats: row.cats, kind: row.kind || 'dua',
      ten: row.ten, pen: row.pen, ken: row.ken || '', aen: row.aen || '',
      t: row.t || '', p: row.p || '', my: row.my || '', keg: row.keg || '', asb: row.asb || '',
      /* `src` is the Malay half of the citation, the one lv() reaches for in BM. It is a
         reference we write, not text we source, so it travels with the rest of the prose. */
      art: row.art || '', src: row.src || '',
      srcKind: row.srcKind, srcKey: String(row.srcKey), srcFetched: today, review: 'pending',
    };
    /* A zikir is said on a count, and the count is not ours to assume: thirty-three after
       the prayer, a hundred, seven, once. Guessing it would put a number in front of a
       reader on the authority of this script, so a zikir row states it or it is refused,
       exactly as a surah row must state its own number and place.

       But "no count is transmitted" is a real answer, not a missing one. The istirja' is
       said when the news reaches you; hasbunallah is what they said when they were warned.
       Neither comes with a number, and refusing them for lacking one would push the set
       toward inventing targets to get cards built — the exact failure this check exists to
       prevent. So a row may write `count: null`, and the card keeps a bare tally with no
       target instead of a place in a set.

       What stays refused is SILENCE. A row that omits the field has not been thought about,
       and the difference between "none is transmitted" and "I did not look" is the whole
       reason to ask. */
    if ((row.kind || 'dua') === 'zikir') {
      if (!('count' in row)) {
        refused.push(`${where}: a zikir row must state 'count' — a whole number from 1 to 1000, or null where no count is transmitted`); continue;
      }
      if (row.count === null) {
        card.count = null;
      } else {
        const n = Number(row.count);
        if (!Number.isInteger(n) || n < 1 || n > 1000) {
          refused.push(`${where}: 'count' must be a whole number from 1 to 1000, or null where no count is transmitted; got ${JSON.stringify(row.count)}`); continue;
        }
        card.count = n;
      }
    }
    /* a surah names itself: number, Arabic name, length and where it was revealed */
    if ((row.kind || 'dua') === 'surah') {
      for (const f of ['sno', 'sarab', 'ayat', 'place']) {
        if (row[f] == null || row[f] === '') { refused.push(`${where}: a surah card needs ${f}`); continue; }
        card[f] = row[f];
      }
    }

    if (row.srcKind === 'quran') {
      /* "2:201" is one ayah, "40:8-9" is a dua that runs across two. A range is still keyed
         and still assembled from the export in order — never a hand-joined quotation — and
         it may not run away: a dua is a few ayat, not a page. */
      const m = String(row.srcKey).match(/^(\d+):(\d+)(?:-(\d+))?$/);
      if (!m) { refused.push(`${where}: srcKey must be "surah:ayah" or "surah:ayah-ayah", got "${row.srcKey}"`); continue; }
      const [, sura, from, to] = m;
      const last = to ? +to : +from;
      if (last < +from) { refused.push(`${where}: "${row.srcKey}" runs backwards`); continue; }
      const isSurah = (row.kind || 'dua') === 'surah';
      const span = isSurah ? MAX_SURAH_SPAN : MAX_SPAN;
      if (last - +from >= span) { refused.push(`${where}: "${row.srcKey}" spans ${last - +from + 1} ayat; ${span} is the limit for a ${isSurah ? 'surah' : 'dua'} card`); continue; }
      const keys = [];
      for (let a = +from; a <= last; a++) keys.push(`${sura}:${a}`);
      /* The export prefixes the basmala to the first ayah of every surah but al-Fatihah and
         at-Tawbah, where it is not part of the ayah's own text. The card draws its own
         basmala above the Arabic, so carrying it here would print it twice. It is always the
         same four words, so it is dropped by matching them against al-Fatihah 1:1 rather than
         by a written-out string. */
      const BASMALA = (quran.map.get('1:1') || '').split(/\s+/).filter(Boolean);
      const dropBasmala = (text, key) => {
        const [sura, aya] = key.split(':').map(Number);
        if (aya !== 1 || sura === 1 || sura === 9) return text;
        const w = text.split(/\s+/).filter(Boolean);
        if (w.length <= BASMALA.length) return text;
        /* the opening word carries a different vowel mark in some surahs, so it is the three
           words after it that decide, and they must match exactly */
        const same = BASMALA.slice(1).every((b, n) => w[n + 1] === b);
        return same ? w.slice(BASMALA.length).join(' ') : text;
      };
      const parts = keys.map(k => { const t = quran.map.get(k); return t == null ? t : dropBasmala(t, k); });
      const gap = keys.filter((k, n) => !parts[n]);
      if (gap.length) { refused.push(`${where}: ${gap.join(', ')} not found in ${quran.file}`); continue; }
      card.ar = isSurah ? parts.map((t, n) => t + AYA_MARK(+from + n)).join(' ') : parts.join(' ');

      /* Many of these duas open partway into an ayah, behind a clause that reports who is
         speaking — "and among them is he who says", "those who say". A card that leads with
         the narration is not showing the dua. `fromWord` names where the dua starts, counting
         words from the first ayah, and the slice is taken from the export itself: still keyed,
         still regenerable, never a hand-cut quotation. The transliteration is sliced at the
         same index upstream, so if the two disagree on length the row is refused rather than
         shipped with Arabic and Latin that do not describe each other. */
      if (row.fromWord != null) {
        const n = Number(row.fromWord);
        const words = card.ar.split(/\s+/).filter(Boolean);
        if (!Number.isInteger(n) || n < 1 || n > words.length) {
          refused.push(`${where}: fromWord ${row.fromWord} is outside ${row.srcKey}, which has ${words.length} words`); continue;
        }
        card.ar = words.slice(n - 1).join(' ');
        card.srcWords = `${n}-${words.length}`;
        if (row.tr) {
          const trWords = String(row.tr).split(/\s+/).filter(Boolean).length;
          if (trWords !== words.length - n + 1) {
            refused.push(`${where}: sliced Arabic has ${words.length - n + 1} words but the transliteration has ${trWords}; they were not cut at the same place`); continue;
          }
        }
      }
      card.srcText = quran.edition;
      card.verified = `${quran.edition} via ${quran.file}`;
      /* the deck reads vkeys, not srcKey: it is what opens the ayah on Quran.com and what
         the recitation player asks the CDN for. qvk() renders a run of them as a range. */
      card.vkeys = keys;
      card.srcEn = row.srcEn || `Qur'an · ${row.srcKey}`;
    } else if (row.srcKind === 'hadith') {
      const [collection, number] = String(row.srcKey).split(':');
      if (!collection || !number) { refused.push(`${where}: srcKey must be "collection:number", got "${row.srcKey}"`); continue; }
      const got = await fetchHadith(collection, number);
      if (got.error) { refused.push(`${where}: ${got.error}`); continue; }
      card.ar = got.ar;
      card.srcText = 'sunnah.com';
      card.verified = `sunnah.com ${collection} ${number}`;
      card.grading = row.grading || got.grading;
      card.srcEn = row.srcEn || `${collection} ${number}`;
      if (!card.grading) refused.push(`${where}: no grading returned; a hadith ships with its grading or not at all`);
    } else {
      refused.push(`${where}: srcKind must be 'quran' or 'hadith'`); continue;
    }

    /* transliteration and translation are part of the sourced set, not ours to invent */
    if (row.tr) card.tr = row.tr; else refused.push(`${where}: no transliteration supplied from the source set`);
    if (row.en) card.en = row.en; else refused.push(`${where}: no translation supplied from the source set`);

    /* If the transliteration and meanings came from a different source than the Arabic, that
       source is named in `srcProse` and joins the card's own record of where it came from.
       A card that cannot say where its every line came from is not verified, only asserted. */
    if (row.srcProse) card.verified += `; ${row.srcProse}`;

    if (!card.ar || !card.srcKey || !card.verified) { refused.push(`${where}: incomplete after build, refused`); continue; }
    if (refused.some(r => r.startsWith(where))) continue;

    cards.push(card);
  }
  return { cards, refused };
}

/* ---------- entry ---------- */

async function main() {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  const checkOnly = args.includes('--check');

  if (!file) {
    console.error('usage: node tools/fetch-cards.mjs <input.json> [--check]');
    console.error('       see tools/README.md for the input shape');
    process.exit(2);
  }

  let quran;
  try { quran = await loadQuran(); }
  catch (err) { console.error(err.message); process.exit(1); }

  const input = JSON.parse(await readFile(path.resolve(file), 'utf8'));
  if (!Array.isArray(input)) { console.error('input must be a JSON array of card rows'); process.exit(2); }

  const { cards, refused } = await build(input, quran);

  console.error(`source: ${quran.file} (${quran.edition}, ${quran.map.size} ayat)`);
  console.error(`built:  ${cards.length} / ${input.length}`);
  if (refused.length) {
    console.error(`refused ${refused.length}:`);
    for (const r of refused) console.error('  · ' + r);
  }

  if (!checkOnly) process.stdout.write(JSON.stringify(cards, null, 1) + '\n');
  process.exit(refused.length ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });

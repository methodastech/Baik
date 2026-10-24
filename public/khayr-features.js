/* Baik · features added on top of Khayr.html (loaded after its main script).
   Round 1: display & accessibility (106–109, 115–119), learning (097–099),
   organisation (073, 075, 076, 077, 078). Everything reads the app's own globals
   (CARDS, S, LANG, lv, esc, store, load, isPremium, gate, toast, render, showSpot …)
   and wraps render / filtered / showSpot rather than editing them. */
(function () {
'use strict';
var bm = function () { return LANG === 'bm'; };
var L = function (en, ms) { return bm() ? ms : en; };
var $ = function (id) { return document.getElementById(id); };

/* ================= preferences ================= */
var PF = Object.assign({ theme: 'light', hc: false, calm: null, tx: 1, layout: 'full', ct: 'paper', auto: false, space: 'normal' }, load('baik.prefs', {}));
if (PF.calm === null) PF.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
var TX = [0.9, 1, 1.12, 1.26];
var LAYOUTS = [
  { k: 'full', en: 'Full card', bm: 'Kad penuh', free: 1 },
  { k: 'arabic', en: 'Arabic first', bm: 'Arab dahulu', free: 1 },
  { k: 'meaning', en: 'Meaning first', bm: 'Makna dahulu', free: 0 },
  { k: 'compact', en: 'Compact', bm: 'Padat', free: 0 },
];
/* card themes: three free, the rest Premium. z1/z2 = zones, f = frame, a = art ground, t = ink */
var THEMES = [
  { k: 'paper', en: 'Paper', bm: 'Kertas', free: 1, z1: '#FFFFFF', z2: '#F3F3F3', f: '#FFFFFF', a: '#F3F3F3', t: '#1E2124', l: '#DBDBDB' },
  { k: 'sand', en: 'Sand', bm: 'Pasir', free: 1, z1: '#FBF6EC', z2: '#F2E9D8', f: '#FBF6EC', a: '#EFE3CC', t: '#2A2418', l: '#E2D4B8' },
  { k: 'night', en: 'Night', bm: 'Malam', free: 1, z1: '#17191D', z2: '#1F2227', f: '#121418', a: '#1F2227', t: '#ECEDEF', l: '#2C3037' },
  { k: 'sage', en: 'Sage', bm: 'Sage', free: 0, z1: '#F4F8F4', z2: '#E4EEE6', f: '#F4F8F4', a: '#DCE9DF', t: '#1F2E25', l: '#CADBCE' },
  { k: 'rose', en: 'Rose', bm: 'Mawar', free: 0, z1: '#FCF5F5', z2: '#F4E5E5', f: '#FCF5F5', a: '#F0DADA', t: '#33201F', l: '#E6CDCC' },
  { k: 'indigo', en: 'Indigo', bm: 'Nila', free: 0, z1: '#F4F5FC', z2: '#E3E6F6', f: '#F4F5FC', a: '#DADFF3', t: '#1C2140', l: '#C9CFEA' },
  { k: 'ramadan', en: 'Ramadan', bm: 'Ramadan', free: 0, z1: '#10201C', z2: '#162B25', f: '#0C1916', a: '#162B25', t: '#F1E7C9', l: '#2A4038' },
];
function savePF() { store('baik.prefs', PF); applyPF(); queueSync(); }

function hijriMonth() {
  try { return +new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(new Date()); } catch (e) { return 0; }
}
/* 109: the card theme follows the day when Automatic is on */
function autoTheme() {
  if (hijriMonth() === 9) return 'ramadan';
  var h = new Date().getHours();
  return h >= 19 || h < 5 ? 'night' : h < 10 ? 'sand' : 'paper';
}
function themeKey() {
  var k = PF.auto && isPremium() ? autoTheme() : PF.ct;
  var t = THEMES.filter(function (x) { return x.k === k; })[0] || THEMES[0];
  if (!t.free && !isPremium()) t = THEMES[0];
  return t;
}
function applyPF() {
  var r = document.documentElement, t = themeKey();
  var dark = PF.theme === 'dark' || (PF.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  r.classList.toggle('pf-dark', dark);
  r.classList.toggle('pf-hc', !!PF.hc);
  r.classList.toggle('pf-calm', !!PF.calm);
  r.classList.toggle('pf-tight', PF.space === 'tight' && isPremium());
  r.classList.toggle('pf-airy', PF.space === 'airy' && isPremium());
  var lay = LAYOUTS.filter(function (x) { return x.k === PF.layout; })[0] || LAYOUTS[0];
  if (!lay.free && !isPremium()) lay = LAYOUTS[0];
  r.setAttribute('data-lay', lay.k);
  r.style.setProperty('--pf-k', TX[PF.tx] || 1);
  r.setAttribute('data-ct', t.k);
  r.style.setProperty('--ct-z1', t.z1); r.style.setProperty('--ct-z2', t.z2); r.style.setProperty('--ct-f', t.f);
  r.style.setProperty('--ct-a', t.a); r.style.setProperty('--ct-t', t.t); r.style.setProperty('--ct-l', t.l);
  var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? '#121416' : '#F3F3F3';
}

/* ================= styles ================= */
var css = `
/* 116 dark mode: invert the page, then turn pictures, the night sky and already-dark cards back */
html.pf-dark{filter:invert(1) hue-rotate(180deg);background:#fff}
html.pf-dark img,html.pf-dark video,html.pf-dark canvas,html.pf-dark .sky,html.pf-dark .kind-surah,
html.pf-dark .artimg,html.pf-dark [data-ct="night"] .card,html.pf-dark .bx-sw{filter:invert(1) hue-rotate(180deg)}
html.pf-dark .sky canvas,html.pf-dark .kind-surah img,html.pf-dark .kind-surah canvas,html.pf-dark .artimg img{filter:none}
/* 117 high contrast */
html.pf-hc{--dim:#2E3237;--mut:#2E3237;--zone-line:#5A6068;--frame-edge:#5A6068}
html.pf-hc body{color:#000}
html.pf-hc .card .flavor,html.pf-hc .card .qtr,html.pf-hc .card .uset{color:#000!important;opacity:1!important}
html.pf-hc :focus-visible{outline:3px solid #000!important;outline-offset:2px}
/* 118 reduce animation */
html.pf-calm *,html.pf-calm *::before,html.pf-calm *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important;scroll-behavior:auto!important}
/* 115 text size for the Latin lines */
.card .flavor{font-size:calc(var(--fflav,14.5px) * var(--pf-k,1))}
.card .qtr{font-size:calc(13px * var(--pf-k,1))}
.card .uset{font-size:calc(var(--ftype,13px) * var(--pf-k,1))}
/* 108 spacing */
html.pf-tight .card .textbox{padding-top:8px;padding-bottom:6px} html.pf-tight .card .qar{line-height:1.9}
html.pf-airy .card .flavor{line-height:1.75} html.pf-airy .card .qar{line-height:2.45}
/* 119 reading layouts */
html[data-lay="arabic"] .card .vw-fw .flavor,html[data-lay="arabic"] .card .vw-fw .flavdiv{display:none}
html[data-lay="arabic"] .card .qar{font-size:calc(var(--arSize,26px) * 1.12)}
html[data-lay="meaning"] .card:not(.kind-surah) .vw-fw{display:flex;flex-direction:column}
html[data-lay="meaning"] .card:not(.kind-surah) .vw-fw .flavor{order:-2;font-size:calc(var(--fflav,14.5px) * var(--pf-k,1) * 1.08);margin-bottom:6px}
html[data-lay="meaning"] .card:not(.kind-surah) .vw-fw .flavdiv{order:-1}
html[data-lay="compact"] .card .artwin{display:none}
html[data-lay="compact"] .card .qtr{display:none}
/* 106/107 card themes (surah stock keeps its own night) */
html[data-ct] .card:not(.kind-surah){--zone1:var(--ct-z1);--zone2:var(--ct-z2);--frame1:var(--ct-f);--frame2:var(--ct-z2);--frame3:var(--ct-z2);--art1:var(--ct-a);--art2:var(--ct-a);--txt:var(--ct-t);--strong:var(--ct-t);--zone-line:var(--ct-l);--frame-edge:var(--ct-l);color:var(--ct-t)}
html[data-ct="night"] .card:not(.kind-surah),html[data-ct="ramadan"] .card:not(.kind-surah){--dim:rgba(236,237,239,.62);--mut:rgba(236,237,239,.62);--glyph:rgba(236,237,239,.9);--bk-ink:#ECEDEF}
html[data-ct="night"] .card:not(.kind-surah) .flavor,html[data-ct="night"] .card:not(.kind-surah) .qtr,html[data-ct="night"] .card:not(.kind-surah) .uset,
html[data-ct="ramadan"] .card:not(.kind-surah) .flavor,html[data-ct="ramadan"] .card:not(.kind-surah) .qtr,html[data-ct="ramadan"] .card:not(.kind-surah) .uset{color:var(--ct-t)}
html[data-ct] .card:not(.kind-surah) .zone,html[data-ct] .card:not(.kind-surah) .face{background-color:var(--ct-z1)}
html[data-ct] .card:not(.kind-surah) .zone.artwin.artbrief{background-color:var(--ct-a)}
html.pf-dark[data-ct="night"] .card{filter:invert(1) hue-rotate(180deg)}

/* the Baik sheet (reuses the account sheet skin: .ac / .ac-in) */
.bx .ac-in{width:min(620px,100%)}
.bx-h{display:flex;align-items:baseline;gap:10px;margin:2px 0 14px}
.bx-h h3{font:700 22px 'Space Grotesk',sans-serif;letter-spacing:-.01em;margin:0}
.bx-sec{margin:18px 0 6px;font:500 11px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6E6E6E}
.bx-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #ECECEC}
.bx-row b{font-weight:600;font-size:14.5px}.bx-row small{display:block;color:#6E6E6E;font-size:12.5px;line-height:1.4}
.bx-seg{display:inline-flex;flex-wrap:wrap;gap:4px;background:#F3F3F3;border-radius:12px;padding:3px}
.bx-seg button{border:0;background:none;border-radius:9px;padding:6px 11px;font:600 13px Saira,sans-serif;color:#555;cursor:pointer;position:relative}
.bx-seg button[aria-pressed="true"]{background:#fff;color:#1E2124;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.bx-lock{font-size:10px;margin-left:4px;opacity:.7}
.bx-tog{width:44px;height:26px;border-radius:13px;border:0;background:#D5D7DA;position:relative;cursor:pointer;flex:none}
.bx-tog::after{content:'';position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s}
.bx-tog[aria-checked="true"]{background:#1E2124}.bx-tog[aria-checked="true"]::after{left:21px}
.bx-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(82px,1fr));gap:8px;margin-top:8px}
.bx-th{border:2px solid transparent;border-radius:12px;padding:6px;cursor:pointer;background:#F6F6F6;font:600 12px Saira,sans-serif;color:#333;text-align:center}
.bx-th[aria-pressed="true"]{border-color:#1E2124}
.bx-sw{display:block;height:38px;border-radius:8px;margin-bottom:5px;border:1px solid rgba(0,0,0,.08)}
.bx-btn{border:1px solid #DBDBDB;background:#fff;border-radius:10px;padding:8px 13px;font:600 13px Saira,sans-serif;cursor:pointer;color:#1E2124}
.bx-btn.pri{background:#1E2124;color:#fff;border-color:#1E2124}
.bx-note{font-size:12.5px;color:#6E6E6E;margin-top:8px;line-height:1.45}
.bx-list{display:flex;flex-direction:column;gap:6px;margin-top:6px}
.bx-it{display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid #ECECEC;border-radius:12px;cursor:pointer;background:#fff;text-align:left;font:14px Saira,sans-serif;color:#1E2124}
.bx-it:hover{border-color:#BDBDBD}
.bx-dot{width:12px;height:12px;border-radius:50%;flex:none}
.bx-bar{height:6px;border-radius:3px;background:#EEE;overflow:hidden;flex:1}.bx-bar i{display:block;height:100%;background:#1E2124}
.bx-empty{color:#6E6E6E;font-size:13.5px;padding:10px 0}
.bx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:6px 0 4px}
.bx-stat{background:#F6F6F6;border-radius:12px;padding:10px 12px}.bx-stat b{display:block;font:700 22px 'Space Grotesk',sans-serif}.bx-stat span{font-size:12px;color:#6E6E6E}

/* 097 memorisation mode in the reader */
#spotCard .card.mm .flavor,#spotCard .card.mm .flavdiv{filter:blur(6px);transition:filter .2s}
#spotCard .card.mm2 .qtr{filter:blur(5px)}
#spotCard .card.mm3 .qar{filter:blur(7px)}
#spotCard .card.mm.peek .flavor,#spotCard .card.mm.peek .qtr,#spotCard .card.mm.peek .qar{filter:none}
.mm-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;width:100%;margin-top:4px}
.mm-bar .mm-k{font:500 11px 'JetBrains Mono',monospace;letter-spacing:.1em;color:#9aa;text-transform:uppercase}
/* 098 flashcards */
.fc{border:1px solid #E2E2E2;border-radius:18px;padding:22px 20px;min-height:220px;display:flex;flex-direction:column;justify-content:center;gap:10px;background:#FBFBFB;margin-top:8px}
.fc-k{font:500 11px 'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#6E6E6E}
.fc-q{font-size:18px;line-height:1.45;font-weight:500}
.fc-ar{font-family:var(--arFont);font-size:26px;line-height:2;direction:rtl;text-align:right}
.fc-acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
/* 076 pinned shelf */
.pin-shelf{margin-bottom:8px}
.sec-h .pin-ico{display:inline-grid;place-items:center;width:28px;height:28px}
`;
var st = document.createElement('style'); st.id = 'baik-features-css'; st.textContent = css; document.head.appendChild(st);

/* ================= the sheet ================= */
var sheet = document.createElement('div');
sheet.className = 'ac bx'; sheet.id = 'bx';
sheet.innerHTML = '<div class="ac-in"><button class="pw-x" id="bxX" aria-label="Close">✕</button><div id="bxBody"></div></div>';
document.body.appendChild(sheet);
var bxTab = 'display';
function openBx(tab) { if (tab) bxTab = tab; sheet.classList.add('on'); renderBx(); }
function closeBx() { sheet.classList.remove('on'); }
$('bxX').addEventListener('click', closeBx);
sheet.addEventListener('click', function (e) { if (e.target === sheet) closeBx(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('on')) closeBx(); });
window.openBaikSheet = openBx;

function lock(free) { return free || isPremium() ? '' : '<span class="bx-lock" aria-label="Premium">🔒</span>'; }
function seg(name, opts, cur) {
  return '<div class="bx-seg" role="group">' + opts.map(function (o) {
    return '<button type="button" data-' + name + '="' + o.k + '" aria-pressed="' + (o.k === cur) + '">' + esc(L(o.en, o.bm)) + lock(o.free !== 0) + '</button>';
  }).join('') + '</div>';
}
function tog(id, on) { return '<button type="button" class="bx-tog" role="switch" id="' + id + '" aria-checked="' + !!on + '"></button>'; }
function tabs() {
  var T = [['display', L('Reading & display', 'Bacaan & paparan')], ['learn', L('Learn', 'Belajar')], ['library', L('My library', 'Pustaka saya')], ['tools', L('Reminders & privacy', 'Peringatan & privasi')]];
  return '<div class="ac-tabs" role="tablist">' + T.map(function (t) {
    return '<button class="ac-tab' + (bxTab === t[0] ? ' on' : '') + '" data-bt="' + t[0] + '" role="tab" aria-selected="' + (bxTab === t[0]) + '">' + t[1] + '</button>';
  }).join('') + '</div>';
}

function renderBx() {
  var el = $('bxBody'), h = '<div class="bx-h"><h3>Baik</h3><span class="bx-note" style="margin:0">' + esc(hijriToday()) + '</span></div>' + tabs();
  if (bxTab === 'display') h += displayHTML();
  else if (bxTab === 'learn') h += learnHTML();
  else if (bxTab === 'library') h += libraryHTML(); else h += toolsHTML();
  el.innerHTML = h;
  el.querySelectorAll('[data-bt]').forEach(function (b) { b.onclick = function () { bxTab = b.dataset.bt; fc = null; renderBx(); }; });
  if (bxTab === 'display') wireDisplay(el); else if (bxTab === 'learn') wireLearn(el); else if (bxTab === 'library') wireLibrary(el); else wireTools(el);
}

/* ---------- display tab ---------- */
function displayHTML() {
  var h = '<div class="bx-sec">' + L('Appearance', 'Rupa') + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Theme', 'Tema') + '</b><small>' + L('Dark is easier on the eyes at night.', 'Gelap lebih selesa pada waktu malam.') + '</small></div>'
    + seg('theme', [{ k: 'light', en: 'Light', bm: 'Cerah' }, { k: 'dark', en: 'Dark', bm: 'Gelap' }, { k: 'auto', en: 'Auto', bm: 'Auto' }], PF.theme) + '</div>';
  h += '<div class="bx-row"><div><b>' + L('High contrast', 'Kontras tinggi') + '</b><small>' + L('Darker text and lines for easier reading.', 'Teks dan garisan lebih gelap.') + '</small></div>' + tog('pfHc', PF.hc) + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Reduce animation', 'Kurangkan animasi') + '</b><small>' + L('Turns off movement and transitions.', 'Matikan pergerakan dan peralihan.') + '</small></div>' + tog('pfCalm', PF.calm) + '</div>';
  h += '<div class="bx-sec">' + L('Text', 'Teks') + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Translation size', 'Saiz terjemahan') + '</b><small>' + L('Arabic size stays on the A− / A+ buttons at the top.', 'Saiz Arab kekal pada butang A− / A+ di atas.') + '</small></div>'
    + seg('tx', [{ k: '0', en: 'S', bm: 'K' }, { k: '1', en: 'M', bm: 'S' }, { k: '2', en: 'L', bm: 'B' }, { k: '3', en: 'XL', bm: 'XB' }], String(PF.tx)) + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Line spacing', 'Jarak baris') + lock(0) + '</b><small>' + L('Part of custom card appearance.', 'Sebahagian rupa kad tersuai.') + '</small></div>'
    + seg('space', [{ k: 'tight', en: 'Tight', bm: 'Rapat', free: 0 }, { k: 'normal', en: 'Normal', bm: 'Biasa' }, { k: 'airy', en: 'Airy', bm: 'Lapang', free: 0 }], PF.space) + '</div>';
  h += '<div class="bx-sec">' + L('Reading layout', 'Susun atur bacaan') + '</div>';
  h += '<div class="bx-row" style="border:0">' + seg('lay', LAYOUTS, PF.layout) + '</div>';
  h += '<div class="bx-sec">' + L('Card theme', 'Tema kad') + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Automatic', 'Automatik') + lock(0) + '</b><small>' + L('Sand in the morning, Night after Maghrib, Ramadan in Ramadan.', 'Pasir pada pagi, Malam selepas Maghrib, Ramadan dalam bulan Ramadan.') + '</small></div>' + tog('pfAuto', PF.auto) + '</div>';
  h += '<div class="bx-themes">' + THEMES.map(function (t) {
    return '<button type="button" class="bx-th" data-ct="' + t.k + '" aria-pressed="' + (themeKey().k === t.k) + '"><span class="bx-sw" style="background:linear-gradient(135deg,' + t.z1 + ' 0 50%,' + t.a + ' 50%);"></span>' + esc(L(t.en, t.bm)) + lock(t.free) + '</button>';
  }).join('') + '</div>';
  h += '<p class="bx-note">' + L('Free: three themes and two layouts. Premium: every theme, every layout, line spacing and the automatic theme.', 'Percuma: tiga tema dan dua susun atur. Premium: semua tema, susun atur, jarak baris dan tema automatik.') + '</p>';
  return h;
}
function wireDisplay(el) {
  el.querySelectorAll('[data-theme]').forEach(function (b) { b.onclick = function () { PF.theme = b.dataset.theme; savePF(); renderBx(); }; });
  el.querySelectorAll('[data-tx]').forEach(function (b) { b.onclick = function () { PF.tx = +b.dataset.tx; savePF(); renderBx(); }; });
  el.querySelectorAll('[data-space]').forEach(function (b) { b.onclick = function () {
    if (b.dataset.space !== 'normal' && !gate('Custom card appearance', 'Rupa kad tersuai')) return; PF.space = b.dataset.space; savePF(); renderBx(); }; });
  el.querySelectorAll('[data-lay]').forEach(function (b) { b.onclick = function () {
    var o = LAYOUTS.filter(function (x) { return x.k === b.dataset.lay; })[0];
    if (!o.free && !gate('All reading layouts', 'Semua susun atur bacaan')) return; PF.layout = o.k; savePF(); renderBx(); }; });
  el.querySelectorAll('[data-ct]').forEach(function (b) { b.onclick = function () {
    var t = THEMES.filter(function (x) { return x.k === b.dataset.ct; })[0];
    if (!t.free && !gate('All card themes', 'Semua tema kad')) return; PF.ct = t.k; PF.auto = false; savePF(); renderBx(); }; });
  $('pfHc').onclick = function () { PF.hc = !PF.hc; savePF(); renderBx(); };
  $('pfCalm').onclick = function () { PF.calm = !PF.calm; savePF(); renderBx(); };
  $('pfAuto').onclick = function () { if (!PF.auto && !gate('Automatic theme', 'Tema automatik')) return; PF.auto = !PF.auto; savePF(); renderBx(); };
}

/* ================= learning: 097 memorisation, 098 flashcards, 099 progress ================= */
/* PROG[gi] = {box:1-5 (Leitner), seen, ok, last, mm:highest memorise level reached} */
var PROG = load('baik.prog', {});
function saveProg() { store('baik.prog', PROG); queueSync(); }
function prog(gi) { return PROG[gi] || (PROG[gi] = { box: 1, seen: 0, ok: 0, last: 0, mm: 0 }); }
function learnable(c) { return c && c.ar && kindOf(c) !== 'panduan'; }
function memorised(gi) { var p = PROG[gi]; return p && (p.box >= 5 || p.mm >= 3 && p.ok >= 3); }

var fc = null; // flashcard session {list:[gi], i, show, mode}
function fcDeck(src) {
  var pool = (src === 'saved' ? SAVED.slice() : CARDS.map(function (c, i) { return i; })).filter(function (gi) { return CARDS[gi] && !CARDS[gi].hidden && learnable(CARDS[gi]); });
  var now = Date.now(), DAY = 864e5, GAP = [0, 0, 1, 3, 7, 16];
  var due = pool.filter(function (gi) { var p = PROG[gi]; return !p || now - p.last >= GAP[p.box] * DAY; });
  due.sort(function (a, b) { return ((PROG[a] || {}).box || 0) - ((PROG[b] || {}).box || 0) || Math.random() - .5; });
  return (due.length ? due : pool).slice(0, 12);
}
function learnHTML() {
  var ids = Object.keys(PROG), mem = ids.filter(memorised).length, prac = ids.filter(function (k) { return PROG[k].seen; }).length;
  var h = '<div class="bx-stats"><div class="bx-stat"><b>' + prac + '</b><span>' + L('practised', 'dilatih') + '</span></div>'
    + '<div class="bx-stat"><b>' + mem + '</b><span>' + L('memorised', 'dihafal') + '</span></div>'
    + '<div class="bx-stat"><b>' + ids.reduce(function (n, k) { return n + (PROG[k].ok || 0); }, 0) + '</b><span>' + L('correct recalls', 'ingatan betul') + '</span></div></div>';
  if (!isPremium()) {
    return h + '<p class="bx-note">' + L('Memorisation mode, flashcards and progress tracking are part of Premium. Every dua stays free to read.', 'Mod hafalan, kad imbas dan kemajuan adalah sebahagian Premium. Setiap doa kekal percuma untuk dibaca.') + '</p>'
      + '<div class="fc-acts"><button class="bx-btn pri" id="lnUp">' + L('See Premium', 'Lihat Premium') + '</button></div>';
  }
  if (fc) return h + fcHTML();
  h += '<div class="bx-sec">' + L('Flashcards', 'Kad imbas') + '</div>'
    + '<p class="bx-note">' + L('Recognise a dua from its situation, its opening words or its meaning. Cards you know come back less often.', 'Kenal doa daripada situasi, permulaan atau maknanya. Kad yang anda ingat akan jarang diulang.') + '</p>'
    + '<div class="fc-acts"><button class="bx-btn pri" data-fc="all">' + L('Practise 12 cards', 'Latih 12 kad') + '</button>'
    + '<button class="bx-btn" data-fc="saved">' + L('Practise my saved cards', 'Latih kad simpanan') + ' (' + SAVED.length + ')</button></div>';
  h += '<div class="bx-sec">' + L('Memorisation mode', 'Mod hafalan') + '</div>'
    + '<p class="bx-note">' + L('Open any card large, then press Memorise: the translation, then the transliteration, then the Arabic are hidden in turn. Tap the card to peek.', 'Buka kad besar, tekan Hafal: terjemahan, kemudian transliterasi, kemudian teks Arab disembunyikan. Ketik kad untuk mengintai.') + '</p>';
  var list = ids.filter(function (k) { return PROG[k].seen && CARDS[k]; }).sort(function (a, b) { return PROG[b].last - PROG[a].last; }).slice(0, 12);
  h += '<div class="bx-sec">' + L('Progress', 'Kemajuan') + '</div>';
  h += list.length ? '<div class="bx-list">' + list.map(function (k) {
    var p = PROG[k];
    return '<button class="bx-it" data-open="' + k + '"><span style="flex:1.4">' + esc(lv(CARDS[k], 'ten')) + '</span><span class="bx-bar"><i style="width:' + (p.box * 20) + '%"></i></span><small style="width:70px;text-align:right">' + (memorised(k) ? L('memorised', 'dihafal') : L('box ', 'kotak ') + p.box + '/5') + '</small></button>';
  }).join('') + '</div>' : '<div class="bx-empty">' + L('Nothing practised yet.', 'Belum ada latihan.') + '</div>';
  return h;
}
function fcHTML() {
  if (fc.i >= fc.list.length) {
    return '<div class="fc"><div class="fc-k">' + L('Session done', 'Sesi selesai') + '</div><div class="fc-q">' + fc.right + ' / ' + fc.list.length + ' ' + L('recalled', 'diingat') + '</div>'
      + '<div class="fc-acts"><button class="bx-btn pri" id="fcAgain">' + L('Another round', 'Pusingan lagi') + '</button><button class="bx-btn" id="fcEnd">' + L('Back', 'Kembali') + '</button></div></div>';
  }
  var gi = fc.list[fc.i], c = CARDS[gi], mode = ['situation', 'opening', 'meaning'][(gi + fc.i) % 3];
  var words = String(c.ar).split(/\s+/);
  var q = mode === 'situation' ? '<div class="fc-q">' + esc(lv(c, 'pen')) + '</div>'
    : mode === 'opening' ? '<div class="fc-ar" lang="ar">' + esc(words.slice(0, Math.min(4, words.length)).join(' ')) + ' …</div>'
    : '<div class="fc-q">“' + esc(String(lv(c, 'en')).slice(0, 180)) + (String(lv(c, 'en')).length > 180 ? '…' : '') + '”</div>';
  var k = mode === 'situation' ? L('Which dua is for this?', 'Doa mana untuk ini?') : mode === 'opening' ? L('How does it continue?', 'Bagaimana sambungannya?') : L('Which dua says this?', 'Doa mana yang bermaksud ini?');
  var h = '<div class="fc"><div class="fc-k">' + (fc.i + 1) + ' / ' + fc.list.length + ' · ' + k + '</div>' + q;
  if (fc.show) {
    h += '<hr style="border:0;border-top:1px solid #E6E6E6;margin:6px 0"><div class="fc-k">' + esc(lv(c, 'ten')) + ' · ' + esc(lv(c, 'srcEn')) + '</div>'
      + '<div class="fc-ar" lang="ar">' + esc(c.ar) + '</div>'
      + '<div class="fc-acts"><button class="bx-btn pri" id="fcYes">' + L('I knew it', 'Saya ingat') + '</button><button class="bx-btn" id="fcNo">' + L('Not yet', 'Belum') + '</button><button class="bx-btn" data-open="' + gi + '">' + L('Open card', 'Buka kad') + '</button></div>';
  } else h += '<div class="fc-acts"><button class="bx-btn pri" id="fcShow">' + L('Show answer', 'Tunjuk jawapan') + '</button></div>';
  return h + '</div>';
}
function grade(gi, ok) {
  var p = prog(gi); p.seen++; p.last = Date.now();
  if (ok) { p.ok++; p.box = Math.min(5, p.box + 1); } else p.box = 1;
  saveProg();
}
function wireLearn(el) {
  if ($('lnUp')) $('lnUp').onclick = function () { closeBx(); openPremium(); };
  el.querySelectorAll('[data-fc]').forEach(function (b) { b.onclick = function () {
    var list = fcDeck(b.dataset.fc);
    if (!list.length) { toast(L('Save a few cards first.', 'Simpan beberapa kad dahulu.')); return; }
    fc = { list: list, i: 0, show: false, right: 0, src: b.dataset.fc }; renderBx(); }; });
  if ($('fcShow')) $('fcShow').onclick = function () { fc.show = true; renderBx(); };
  if ($('fcYes')) $('fcYes').onclick = function () { grade(fc.list[fc.i], true); fc.right++; fc.i++; fc.show = false; renderBx(); };
  if ($('fcNo')) $('fcNo').onclick = function () { grade(fc.list[fc.i], false); fc.i++; fc.show = false; renderBx(); };
  if ($('fcAgain')) $('fcAgain').onclick = function () { fc = { list: fcDeck(fc.src), i: 0, show: false, right: 0, src: fc.src }; renderBx(); };
  if ($('fcEnd')) $('fcEnd').onclick = function () { fc = null; renderBx(); };
  el.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { closeBx(); openSpot(+b.dataset.open); }; });
}

/* ================= organisation: 076 pins, 073 covers, 075 note search, 078 backup, 077 sync ================= */
var PINS = load('baik.pins', []);
function isPinned(gi) { return PINS.indexOf(gi) >= 0; }
function togglePin(gi) {
  if (!isPinned(gi) && !gate('Pin important cards', 'Pin kad penting')) return;
  var at = PINS.indexOf(gi); if (at >= 0) PINS.splice(at, 1); else PINS.unshift(gi);
  store('baik.pins', PINS); queueSync(); render();
  toast(at >= 0 ? L('Unpinned.', 'Pin dibuang.') : L('Pinned to the top of the deck.', 'Dipin di atas dek.'));
}
var COVERS = ['#1E2124', '#3E6B52', '#8A6A12', '#7A3B3B', '#3B4A7A', '#5B3B7A', '#2F6F73'];

function libraryHTML() {
  var h = '<div class="bx-sec">' + L('Pinned cards', 'Kad dipin') + lock(0) + '</div>';
  h += PINS.length ? '<div class="bx-list">' + PINS.filter(function (gi) { return CARDS[gi]; }).map(function (gi) {
    return '<button class="bx-it" data-open="' + gi + '">📌 <span style="flex:1">' + esc(lv(CARDS[gi], 'ten')) + '</span><small data-unpin="' + gi + '">' + L('unpin', 'buang') + '</small></button>';
  }).join('') + '</div>' : '<div class="bx-empty">' + L('Open a card large and press Pin to keep it at the top of the deck.', 'Buka kad besar dan tekan Pin untuk letak di atas dek.') + '</div>';

  h += '<div class="bx-sec">' + L('Collections', 'Koleksi') + lock(0) + '</div>';
  h += COLS.length ? '<div class="bx-list">' + COLS.map(function (c, i) {
    var cv = c.cover || {};
    return '<div class="bx-it" style="cursor:default;border-left:6px solid ' + (cv.color || '#1E2124') + '"><span style="font-size:20px">' + esc(cv.icon || '📁') + '</span>'
      + '<span style="flex:1"><b>' + esc(c.name) + '</b><small style="display:block;color:#6E6E6E">' + esc(cv.desc || (c.items.length + ' ' + L('cards', 'kad'))) + '</small></span>'
      + '<button class="bx-btn" data-colopen="' + i + '">' + L('Open', 'Buka') + '</button><button class="bx-btn" data-coledit="' + i + '">' + L('Cover', 'Kulit') + '</button></div>';
  }).join('') + '</div>' : '<div class="bx-empty">' + L('No collections yet. Make one in My account → Saved.', 'Belum ada koleksi. Buat dalam Akaun saya → Disimpan.') + '</div>';
  h += '<div id="covEd"></div>';

  h += '<div class="bx-sec">' + L('Backup & sync', 'Sandaran & segerak') + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Back up to a file', 'Sandar ke fail') + '</b><small>' + L('Saves, notes, collections, pins, progress and settings.', 'Simpanan, nota, koleksi, pin, kemajuan dan tetapan.') + '</small></div><button class="bx-btn" id="bkOut">' + L('Download', 'Muat turun') + '</button></div>';
  h += '<div class="bx-row"><div><b>' + L('Restore from a file', 'Pulih dari fail') + '</b><small>' + L('Adds the backup to what is on this device.', 'Gabung sandaran dengan data peranti ini.') + '</small></div><label class="bx-btn">' + L('Choose file', 'Pilih fail') + '<input type="file" id="bkIn" accept="application/json,.json" hidden></label></div>';
  h += '<div class="bx-row" style="border:0"><div><b>' + L('Cloud sync', 'Segerak awan') + lock(0) + '</b><small id="syncInfo">' + syncInfo() + '</small></div>' + tog('syncTog', SYNC.on) + '</div>';
  if (SYNC.on) h += '<div class="fc-acts"><button class="bx-btn" id="syncNow">' + L('Sync now', 'Segerak sekarang') + '</button></div>';
  return h;
}
function wireLibrary(el) {
  el.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function (e) {
    if (e.target.dataset.unpin) { togglePin(+e.target.dataset.unpin); renderBx(); return; }
    closeBx(); openSpot(+b.dataset.open); }; });
  el.querySelectorAll('[data-colopen]').forEach(function (b) { b.onclick = function () {
    var i = +b.dataset.colopen; if (!COLS[i].items.length) { toast(L('This collection is empty.', 'Koleksi ini kosong.')); return; }
    var cv = COLS[i].cover || {}; openSet(COLS[i].name, cv.icon || '\uD83D\uDCC1', COLS[i].items.filter(function (g) { return CARDS[g]; }), cv.desc); }; });
  el.querySelectorAll('[data-coledit]').forEach(function (b) { b.onclick = function () {
    if (!gate('Custom collection covers', 'Kulit koleksi tersuai')) return;
    var i = +b.dataset.coledit, c = COLS[i], cv = c.cover || {};
    $('covEd').innerHTML = '<div class="fc" style="min-height:0"><div class="fc-k">' + L('Cover for ', 'Kulit untuk ') + esc(c.name) + '</div>'
      + '<label class="bx-note">' + L('Title', 'Tajuk') + '<input id="cvName" class="ac-field" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px" maxlength="40" value="' + esc(c.name) + '"></label>'
      + '<label class="bx-note">' + L('Description', 'Penerangan') + '<input id="cvDesc" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px" maxlength="80" value="' + esc(cv.desc || '') + '"></label>'
      + '<label class="bx-note">' + L('Icon (one emoji)', 'Ikon (satu emoji)') + '<input id="cvIcon" style="width:80px;padding:8px;border:1px solid #ddd;border-radius:8px" maxlength="4" value="' + esc(cv.icon || '📁') + '"></label>'
      + '<div class="fc-acts">' + COVERS.map(function (col) { return '<button class="bx-dot" data-cv="' + col + '" style="width:26px;height:26px;border:2px solid ' + (cv.color === col ? '#000' : 'transparent') + ';background:' + col + ';cursor:pointer" aria-label="' + col + '"></button>'; }).join('') + '</div>'
      + '<div class="fc-acts"><button class="bx-btn pri" id="cvSave">' + L('Save cover', 'Simpan') + '</button></div></div>';
    var color = cv.color || COVERS[0];
    $('covEd').querySelectorAll('[data-cv]').forEach(function (d) { d.onclick = function () { color = d.dataset.cv; $('covEd').querySelectorAll('[data-cv]').forEach(function (x) { x.style.borderColor = x === d ? '#000' : 'transparent'; }); }; });
    $('cvSave').onclick = function () {
      c.name = ($('cvName').value.trim() || c.name).slice(0, 40);
      c.cover = { color: color, desc: $('cvDesc').value.trim().slice(0, 80), icon: Array.from($('cvIcon').value.trim()).slice(0, 2).join('') || '📁' };
      store('baik.cols', COLS); queueSync(); renderBx(); toast(L('Cover saved.', 'Kulit disimpan.'));
    };
  }; });
  $('bkOut').onclick = function () {
    var blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'baik-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  };
  $('bkIn').onchange = function () {
    var f = this.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t); if (!d || d.app !== 'baik') throw new Error('not a Baik backup');
      merge(d.data); toast(L('Backup restored.', 'Sandaran dipulihkan.')); location.reload();
    }).catch(function () { toast(L('That file is not a Baik backup.', 'Fail itu bukan sandaran Baik.')); });
  };
  $('syncTog').onclick = function () {
    if (!SYNC.on && !gate('Cloud sync', 'Segerak awan')) return;
    if (!SYNC.on && !(USER && USER.real)) { toast(L('Sign in with your Baik account to sync.', 'Log masuk akaun Baik untuk segerak.')); return; }
    SYNC.on = !SYNC.on; store('baik.sync', SYNC); if (SYNC.on) syncNow(true); renderBx();
  };
  if ($('syncNow')) $('syncNow').onclick = function () { syncNow(true); };
}

/* ---------- backup & sync payload ---------- */
var KEYS = ['baik.saved', 'baik.notes', 'baik.cols', 'baik.pins', 'baik.prog', 'baik.prefs', 'baik.journeys', 'baik.recent', 'baik.lang', 'baik.ar', 'baik.script', 'baik.tasbih'];
function snapshot() {
  var data = {}; KEYS.forEach(function (k) { var v = load(k, undefined); if (v !== undefined) data[k] = v; });
  return { app: 'baik', v: 1, at: new Date().toISOString(), data: data };
}
function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
/* merge rather than replace: lists are unioned, maps take the newer side, settings take the incoming */
function merge(d) {
  if (!d) return;
  Object.keys(d).forEach(function (k) {
    if (KEYS.indexOf(k) < 0) return;
    var cur = load(k, undefined), inc = d[k];
    if (Array.isArray(inc) && Array.isArray(cur) && k !== 'baik.cols') inc = uniq(cur.concat(inc));
    else if (k === 'baik.cols' && Array.isArray(cur)) {
      var by = {}; cur.concat(inc).forEach(function (c) { var o = by[c.name]; by[c.name] = o ? Object.assign({}, o, c, { items: uniq(o.items.concat(c.items)) }) : c; });
      inc = Object.keys(by).map(function (n) { return by[n]; });
    } else if (k === 'baik.prog' && cur) {
      var m = Object.assign({}, cur); Object.keys(inc).forEach(function (g) { if (!m[g] || (inc[g].last || 0) > (m[g].last || 0)) m[g] = inc[g]; }); inc = m;
    } else if (k === 'baik.notes' && cur) inc = Object.assign({}, cur, inc);
    store(k, inc);
  });
}
var SYNC = Object.assign({ on: false, at: 0, err: '' }, load('baik.sync', {}));
function syncInfo() {
  if (!SYNC.on) return L('Keep saves, notes and progress the same on every device you sign in on.', 'Simpanan, nota dan kemajuan sama pada setiap peranti.');
  if (SYNC.err) return L('Last sync failed: ', 'Segerak gagal: ') + esc(SYNC.err);
  return SYNC.at ? L('Synced ', 'Disegerak ') + new Date(SYNC.at).toLocaleString() : L('Not synced yet.', 'Belum disegerak.');
}
var syncT = null;
function queueSync() { if (!SYNC.on) return; clearTimeout(syncT); syncT = setTimeout(function () { syncNow(false); }, 2500); }
function syncNow(loud) {
  if (!SYNC.on || !(USER && USER.real)) return;
  fetch('/api/sync', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw new Error(r.status === 401 ? L('signed out', 'log keluar') : 'HTTP ' + r.status);
    return r.json();
  }).then(function (remote) {
    if (remote && remote.data) merge(remote.data);
    return fetch('/api/sync', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot()) });
  }).then(function (r) {
    if (!r.ok) return r.json().catch(function () { return {}; }).then(function (d) { throw new Error(d.error || 'HTTP ' + r.status); });
    SYNC.at = Date.now(); SYNC.err = ''; store('baik.sync', SYNC);
    SAVED = load('baik.saved', SAVED); NOTES = load('baik.notes', NOTES); COLS = load('baik.cols', COLS);
    PINS = load('baik.pins', PINS); PROG = load('baik.prog', PROG); render();
    if (loud) toast(L('Synced.', 'Disegerak.'));
    if (sheet.classList.contains('on') && bxTab === 'library') renderBx();
  }).catch(function (e) {
    SYNC.err = e.message; store('baik.sync', SYNC);
    if (loud) toast(L('Sync failed: ', 'Segerak gagal: ') + e.message);
  });
}

/* ================= round 2: search, related, suggestions, sharing, reminders, privacy ================= */
/* 104 Hijri date (the same calendar the prayer sheet uses) */
function hijriToday() {
  try { return new Intl.DateTimeFormat(bm() ? 'ms-MY-u-ca-islamic-umalqura' : 'en-GB-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; }
}

/* 042 natural-language search: everyday words, English and Malay, mapped to the needs */
var NL = {
  hati: 'anxious anxiety worry worried worries stress stressed overwhelmed overwhelm panic nervous fear afraid scared calm peace uneasy restless heart resah cemas risau takut gelisah tenang tekanan bimbang',
  duka: 'grief grieving sad sadness loss lost died death dying passed mourning cry crying heartbroken lonely alone duka sedih kehilangan meninggal kematian sunyi',
  keampunan: 'forgive forgiveness forgiven sin sins sinned repent repentance guilt guilty regret mercy taubat ampun ampunan dosa menyesal rahmat',
  rezeki: 'job jobs work working money debt debts rizq rezeki career business income salary interview poor bills hutang kerja duit wang niaga gaji',
  kesihatan: 'sick ill illness pain health heal healing hospital fever surgery cure sakit demam ubat penyakit sembuh pembedahan',
  perjalanan: 'travel travelling traveling trip journey flight flying plane car driving drive ride vehicle musafir perjalanan kereta kapal terbang pulang',
  perlindungan: 'protect protection protected evil harm danger dangerous safety safe jinn envy hasad lindung bahaya selamat',
  rumah: 'family home parents parent mother mum father dad children child kids house household keluarga ibu bapa anak rumah',
  nikah: 'marriage married marry spouse wife husband love wedding partner nikah kahwin jodoh pasangan suami isteri cinta',
  hikmah: 'exam exams study studying knowledge learn learning school test university memorise ilmu belajar peperiksaan ujian sekolah',
  pagi: 'morning evening sleep sleeping night wake waking bed insomnia pagi petang tidur malam bangun',
  syukur: 'grateful thankful gratitude thanks happy happiness joy praise blessing syukur bersyukur gembira nikmat',
  makan: 'eat eating food drink drinking meal hungry makan minum hidangan',
  waktu: 'pray prayer prayers salah salat solat subuh zohor asar maghrib isyak fajr dhuhr asr isha',
  berbuka: 'fast fasting puasa ramadan sahur suhoor iftar berbuka',
};
var NLIX = {}; Object.keys(NL).forEach(function (k) { NL[k].split(' ').forEach(function (w) { (NLIX[w] = NLIX[w] || []).push(k); }); });
var nlCats = [];
function nlMatch(q) {
  var hit = {};
  q.toLowerCase().replace(/[^\p{L}\s']/gu, ' ').split(/\s+/).forEach(function (w) {
    if (!w) return;
    (NLIX[w] || NLIX[w.replace(/(ing|ed|es|s)$/, '')] || []).forEach(function (k) { hit[k] = (hit[k] || 0) + 1; });
  });
  /* only needs that actually hold cards; family and daily-time words are context, so they rank below
     the need itself ("my mum is in hospital" is about health first) */
  var WEIGHT = { rumah: 0.6, pagi: 0.7, hati: 0.8 };
  return Object.keys(hit).filter(function (k) {
    return CATS[k] && CARDS.some(function (c) { return !c.hidden && (c.cats || []).indexOf(k) >= 0; });
  }).sort(function (a, b) { return hit[b] * (WEIGHT[b] || 1) - hit[a] * (WEIGHT[a] || 1); });
}
var STOP = ' a an the i im i\'m me my mine is am are was were be been it its in on at to of for and or with about from this that can cant can\'t dont don\'t not no so very really just please help need want what how why when saya aku awak kamu di ke dari yang dan atau untuk tentang ini itu ada tak tidak sangat nak mahu boleh macam mana bila kenapa ';
function strongHit(c, words) {
  var hay = (c.ten + ' ' + c.pen + ' ' + c.en + ' ' + c.ken + ' ' + c.aen + ' ' + c.srcEn + ' ' + c.tr + ' ' + (c.t || '') + ' ' + (c.p || '') + ' ' + (c.my || '')).toLowerCase();
  return words.every(function (w) { return hay.indexOf(w) >= 0; });
}

/* 018 advanced search: Arabic text, verse keys, surah numbers, source and kind */
function arNorm(s) {
  // strip harakat, Quranic marks, tatweel and the lone hamza (the mushaf writes "aatina" with a separate hamza)
  return String(s || '').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u0621]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627').replace(/\u0649/g, '\u064A').replace(/\u0629/g, '\u0647').replace(/\s+/g, ' ').trim();
}
function parseAdv(q) {
  var out = { ar: null, verse: null, surah: null, source: null, kind: null, rest: [] }, any = false;
  var ar = q.match(/[؀-ۿ][؀-ۿ\s]*/g);
  if (ar) { out.ar = arNorm(ar.join(' ')); any = true; q = q.replace(/[؀-ۿ]+/g, ' '); }
  q.split(/\s+/).filter(Boolean).forEach(function (t) {
    var m;
    if ((m = t.match(/^(\d{1,3}):(\d{1,3})$/))) { out.verse = [+m[1], +m[2]]; any = true; }
    else if ((m = t.match(/^(?:surah|s):(\d{1,3})$/i))) { out.surah = +m[1]; any = true; }
    else if ((m = t.match(/^(?:source|src):(quran|hadith)$/i))) { out.source = m[1].toLowerCase(); any = true; }
    else if ((m = t.match(/^kind:(dua|surah|panduan|zikir)$/i))) { out.kind = m[1].toLowerCase(); any = true; }
    else out.rest.push(t);
  });
  return any ? out : null;
}
/* "2:255" matches a card whose vkeys cover that ayah, e.g. "2:255" or "2:250-256" */
function coversVerse(c, v) {
  return (c.vkeys || []).some(function (k) {
    var m = String(k).match(/^(\d+):(\d+)(?:-(\d+))?$/); if (!m || +m[1] !== v[0]) return false;
    return v[1] >= +m[2] && v[1] <= +(m[3] || m[2]);
  }) || (c.sno === v[0] && !(c.vkeys || []).length);
}
function advTest(c, a) {
  if (a.ar && arNorm(c.ar).indexOf(a.ar) < 0) return false;
  if (a.verse && !coversVerse(c, a.verse)) return false;
  if (a.surah && !(c.sno === a.surah || (c.vkeys || []).some(function (k) { return +String(k).split(':')[0] === a.surah; }))) return false;
  var src = (c.srcEn || '') + ' ' + (c.src || '');
  if (a.source === 'quran' && !/qur'?an|QS\./i.test(src)) return false;
  if (a.source === 'hadith' && /qur'?an|QS\./i.test(src)) return false;
  if (a.kind && kindOf(c) !== a.kind) return false;
  if (a.rest.length) {
    var hay = (c.ten + ' ' + c.pen + ' ' + c.en + ' ' + c.ken + ' ' + c.srcEn + ' ' + c.tr + ' ' + (c.t || '') + ' ' + (c.my || '')).toLowerCase();
    if (!a.rest.every(function (w) { return hay.indexOf(w.toLowerCase()) >= 0; })) return false;
  }
  return true;
}
var advWarned = false;

/* 020 related duas: cards that share a need, most shared first */
function related(c, n) {
  var mine = c.cats || [], k = kindOf(c);
  return CARDS.map(function (x, i) { x._i = i; return x; }).filter(function (x) {
    return x !== c && !x.hidden && (kindOf(x) === 'panduan') === (k === 'panduan') && (x.cats || []).some(function (q) { return mine.indexOf(q) >= 0; });
  }).map(function (x) {
    return { c: x, s: (x.cats || []).filter(function (q) { return mine.indexOf(q) >= 0; }).length * 2 + ((x.cats || [])[0] === mine[0] ? 1 : 0) };
  }).sort(function (a, b) { return b.s - a.s; }).slice(0, n).map(function (r) { return r.c; });
}

/* 045 personalised suggestions: needs you return to, cards you have not opened yet */
function suggestions(n) {
  var seen = {}, score = {};
  RECENT.concat(SAVED, Object.keys(PROG).map(Number)).forEach(function (gi) {
    var c = CARDS[gi]; if (!c) return; seen[gi] = 1;
    (c.cats || []).forEach(function (k, j) { score[k] = (score[k] || 0) + (j ? 1 : 2); });
  });
  var top = Object.keys(score).sort(function (a, b) { return score[b] - score[a]; }).slice(0, 3);
  if (!top.length) return [];
  return CARDS.map(function (c, i) { c._i = i; return c; }).filter(function (c) {
    return !seen[c._i] && !c.hidden && kindOf(c) !== 'panduan' && (c.cats || []).some(function (k) { return top.indexOf(k) >= 0; });
  }).sort(function (a, b) { return top.indexOf(a.cats[0]) - top.indexOf(b.cats[0]); }).slice(0, n);
}

/* 113 / 114 share designs and the custom shared card */
var DESIGNS = [
  { k: 'paper', en: 'Paper', bm: 'Kertas', free: 1, bg: ['#F7F7F5', '#ECECE8'], ink: '#1E2124', soft: 'rgba(30,33,36,.62)', acc: '#6E6E6E' },
  { k: 'night', en: 'Night', bm: 'Malam', free: 1, bg: ['#15171B', '#08090B'], ink: '#FFFFFF', soft: 'rgba(255,255,255,.66)', acc: 'rgba(255,255,255,.5)' },
  { k: 'sand', en: 'Sand', bm: 'Pasir', free: 0, bg: ['#FBF4E4', '#EADBB9'], ink: '#2A2418', soft: 'rgba(42,36,24,.66)', acc: '#9A7A3A' },
  { k: 'sage', en: 'Sage', bm: 'Sage', free: 0, bg: ['#EEF5EF', '#CFE2D4'], ink: '#1F2E25', soft: 'rgba(31,46,37,.66)', acc: '#3E6B52' },
  { k: 'ramadan', en: 'Ramadan', bm: 'Ramadan', free: 0, bg: ['#123029', '#081814'], ink: '#F6EBCB', soft: 'rgba(246,235,203,.72)', acc: '#D8B86A' },
  { k: 'dusk', en: 'Dusk', bm: 'Senja', free: 0, bg: ['#3B2F5C', '#C76B5A'], ink: '#FFFFFF', soft: 'rgba(255,255,255,.75)', acc: 'rgba(255,255,255,.6)' },
];
var SH = Object.assign({ d: 'paper', ar: true, tr: true, en: true, head: '' }, load('baik.share', {}));
function wrapLines(x, text, maxW) {
  var words = String(text).split(/\s+/), lines = [], cur = '';
  words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur); return lines;
}
function drawShare(c, opt, cb) {
  var d = DESIGNS.filter(function (x) { return x.k === opt.d; })[0] || DESIGNS[0];
  var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; var x = cv.getContext('2d');
  var faces = ['600 66px "Scheherazade New"', '600 54px "Space Grotesk"', '400 30px Saira', 'italic 400 36px Saira', '500 22px "JetBrains Mono"'];
  Promise.all(faces.map(function (f) { return document.fonts ? document.fonts.load(f, f.indexOf('Scheh') >= 0 ? c.ar : 'Aa') : null; })).catch(function () {}).then(function () {
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, d.bg[0]); g.addColorStop(1, d.bg[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = d.acc; x.globalAlpha = .35; x.lineWidth = 2; x.strokeRect(40, 40, W - 80, H - 80); x.globalAlpha = 1;
    var y = 120, pad = 100, maxW = W - pad * 2;
    x.textAlign = 'center'; x.fillStyle = d.acc; x.font = faces[4];
    x.fillText(String(opt.head || lv(c, 'ten')).toUpperCase().slice(0, 48), W / 2, y); y += 70;
    var blocks = [];
    if (opt.ar) blocks.push({ f: faces[0], t: c.ar, col: d.ink, lh: 1.75, rtl: true, cap: 7 });
    if (opt.tr && c.tr) blocks.push({ f: faces[2], t: c.tr, col: d.soft, lh: 1.5, cap: 5 });
    if (opt.en) blocks.push({ f: faces[3], t: '“' + lv(c, 'en') + '”', col: d.ink, lh: 1.5, cap: 9 });
    /* shrink everything together until it fits between the heading and the source line */
    var k = 1, laid = [];
    for (var tries = 0; tries < 12; tries++) {
      var hh = 0;
      laid = blocks.map(function (b) {
        var size = Math.round(parseInt(b.f.match(/(\d+)px/)[1], 10) * k), f = b.f.replace(/\d+px/, size + 'px');
        x.font = f; x.direction = b.rtl ? 'rtl' : 'ltr';
        var lines = wrapLines(x, b.t, maxW); if (lines.length > b.cap) { lines = lines.slice(0, b.cap); lines[b.cap - 1] += ' …'; }
        var h = lines.length * size * b.lh; hh += h + 46; return { b: b, f: f, lines: lines, size: size, h: h };
      });
      if (hh < H - y - 200) break; k *= 0.92;
    }
    var total = laid.reduce(function (s, l) { return s + l.h + 46; }, 0), start = y + Math.max(0, (H - y - 200 - total) / 2);
    laid.forEach(function (l) {
      x.font = l.f; x.fillStyle = l.b.col; x.direction = l.b.rtl ? 'rtl' : 'ltr';
      l.lines.forEach(function (ln, i) { x.fillText(ln, W / 2, start + (i + 0.8) * l.size * l.b.lh); });
      start += l.h + 46;
    });
    x.direction = 'ltr'; x.font = faces[4]; x.fillStyle = d.soft;
    x.fillText(String(lv(c, 'srcEn')), W / 2, H - 120);   // 111: the source always travels with the card
    var dark = ['night', 'ramadan', 'dusk'].indexOf(d.k) >= 0, lg = new Image();
    lg.onload = lg.onerror = function () {
      if (lg.naturalWidth) { var lw = 130, lh = lw * 1872 / 4320; x.globalAlpha = .85; x.drawImage(lg, W / 2 - lw / 2, H - 72 - lh / 2, lw, lh); x.globalAlpha = 1; }
      else { x.fillStyle = d.acc; x.font = '700 30px "Space Grotesk"'; x.fillText('Baik', W / 2, H - 72); }
      cv.toBlob(function (b) { cb(b, cv); }, 'image/png');
    };
    lg.src = 'assets/logo/baik-logo_caps-' + (dark ? 'white' : 'black') + '.png';
  });
}
var shareSheet = null, shareCardRef = null;
function openShare(c) {
  shareCardRef = c;
  if (!shareSheet) {
    shareSheet = document.createElement('div'); shareSheet.className = 'ac bx'; shareSheet.id = 'bxShare';
    shareSheet.innerHTML = '<div class="ac-in"><button class="pw-x" aria-label="Close">✕</button><div id="shBody"></div></div>';
    document.body.appendChild(shareSheet);
    shareSheet.querySelector('.pw-x').onclick = function () { shareSheet.classList.remove('on'); };
    shareSheet.addEventListener('click', function (e) { if (e.target === shareSheet) shareSheet.classList.remove('on'); });
  }
  shareSheet.classList.add('on'); renderShare();
}
function renderShare() {
  var c = shareCardRef, prem = isPremium(), el = $('shBody');
  if (!DESIGNS.filter(function (d) { return d.k === SH.d; })[0].free && !prem) SH.d = 'paper';
  el.innerHTML = '<div class="bx-h"><h3>' + L('Share this card', 'Kongsi kad ini') + '</h3></div>'
    + '<div class="bx-themes">' + DESIGNS.map(function (d) {
      return '<button type="button" class="bx-th" data-d="' + d.k + '" aria-pressed="' + (SH.d === d.k) + '"><span class="bx-sw" style="background:linear-gradient(135deg,' + d.bg[0] + ',' + d.bg[1] + ')"></span>' + esc(L(d.en, d.bm)) + lock(d.free) + '</button>';
    }).join('') + '</div>'
    + '<div class="bx-sec">' + L('What to include', 'Apa yang dimasukkan') + lock(0) + '</div>'
    + [['ar', L('Arabic', 'Arab')], ['tr', L('Transliteration', 'Transliterasi')], ['en', L('Translation', 'Terjemahan')]].map(function (p) {
      return '<div class="bx-row"><b>' + p[1] + '</b>' + tog('sh-' + p[0], prem ? SH[p[0]] : true) + '</div>';
    }).join('')
    + '<div class="bx-row"><div><b>' + L('Source', 'Sumber') + '</b><small>' + L('Always included, so the card can be checked.', 'Sentiasa dimasukkan supaya kad boleh disemak.') + '</small></div><span class="bx-note" style="margin:0">' + esc(lv(c, 'srcEn')) + '</span></div>'
    + '<div class="bx-row"><div style="flex:1"><b>' + L('Your heading', 'Tajuk anda') + lock(0) + '</b><input id="shHead" maxlength="48" placeholder="' + esc(lv(c, 'ten')) + '" value="' + esc(prem ? SH.head || '' : '') + '" style="width:100%;margin-top:6px;padding:8px 10px;border:1px solid #DDD;border-radius:9px;font:14px Saira,sans-serif"' + (prem ? '' : ' disabled') + '></div></div>'
    + '<div style="margin-top:12px;text-align:center"><canvas id="shPrev" style="width:216px;height:270px;border-radius:12px;box-shadow:0 8px 24px -12px rgba(0,0,0,.4)"></canvas></div>'
    + '<div class="fc-acts" style="justify-content:center"><button class="bx-btn pri" id="shGo">' + L('Share image', 'Kongsi imej') + '</button><button class="bx-btn" id="shDl">' + L('Download', 'Muat turun') + '</button></div>';
  el.querySelectorAll('[data-d]').forEach(function (b) { b.onclick = function () {
    var d = DESIGNS.filter(function (x) { return x.k === b.dataset.d; })[0];
    if (!d.free && !gate('Premium share designs', 'Reka bentuk kongsi Premium')) return; SH.d = d.k; store('baik.share', SH); renderShare(); }; });
  ['ar', 'tr', 'en'].forEach(function (p) { $('sh-' + p).onclick = function () {
    if (!gate('Custom shared card', 'Kad kongsi tersuai')) return;
    SH[p] = !SH[p]; if (!SH.ar && !SH.en && !SH.tr) SH[p] = true; store('baik.share', SH); renderShare(); }; });
  $('shHead').oninput = function () { SH.head = this.value; store('baik.share', SH); clearTimeout(this._t); this._t = setTimeout(preview, 300); };
  function opts() { return prem ? SH : { d: SH.d, ar: true, tr: true, en: true, head: '' }; }
  function preview() { drawShare(c, opts(), function (b, cv) { var p = $('shPrev'); if (!p) return; p.width = 432; p.height = 540; p.getContext('2d').drawImage(cv, 0, 0, 432, 540); }); }
  preview();
  function out(share) {
    drawShare(c, opts(), function (blob) {
      var name = 'baik-' + String(lv(c, 'ten')).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png', file = null;
      try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
      if (share && file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: lv(c, 'srcEn') + ' · Baik' }).catch(function () {}); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      toast(L('Card image saved, with its source on it.', 'Imej kad disimpan, bersama sumbernya.'));
    });
  }
  $('shGo').onclick = function () { out(true); }; $('shDl').onclick = function () { out(false); };
}
window.openShareDesigner = function (gi) { openShare(CARDS[gi]); };

/* 103 prayer reminders (while Baik is open) and 105 privacy controls */
var RM = Object.assign({ on: false, before: 0, which: { Fajr: 1, Dhuhr: 1, Asr: 1, Maghrib: 1, Isha: 1 } }, load('baik.remind', {}));
var rmTimers = [];
function scheduleReminders() {
  rmTimers.forEach(clearTimeout); rmTimers = [];
  if (!RM.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  var rows = window.baikSky && window.baikSky.rows && window.baikSky.rows(); if (!rows) return;
  var prem = isPremium(), now = Date.now();
  rows.forEach(function (r) {
    if (!r[3] || r[2] == null) return;
    if (prem && !RM.which[r[0]]) return;
    var at = r[2] - (prem ? RM.before : 0) * 60000; if (at <= now || at - now > 864e5) return;
    rmTimers.push(setTimeout(function () {
      try { new Notification(bm() ? 'Waktu ' + r[1] : r[0] + (prem && RM.before ? ' in ' + RM.before + ' minutes' : ' time'), { body: L('A moment to pause and pray.', 'Masa untuk berhenti seketika dan solat.'), tag: 'baik-' + r[0] }); } catch (e) {}
    }, at - now));
  });
}
setInterval(scheduleReminders, 10 * 60 * 1000); setTimeout(scheduleReminders, 4000);

function toolsHTML() {
  var rows = window.baikSky && window.baikSky.rows && window.baikSky.rows();
  var h = '<div class="bx-sec">' + L('Prayer reminders', 'Peringatan solat') + '</div>';
  h += '<div class="bx-row"><div><b>' + L('Remind me at prayer times', 'Ingatkan saya pada waktu solat') + '</b><small>' + L('A notification while Baik is open in a tab. Off unless you turn it on.', 'Pemberitahuan ketika Baik dibuka. Tutup kecuali anda hidupkan.') + '</small></div>' + tog('rmOn', RM.on) + '</div>';
  if (!rows) h += '<p class="bx-note">' + L('Open Prayer times from the ⋯ menu once, so Baik knows your zone.', 'Buka Waktu solat dari menu ⋯ sekali supaya Baik tahu zon anda.') + '</p>';
  h += '<div class="bx-row"><div><b>' + L('Which prayers', 'Solat mana') + lock(0) + '</b></div><div class="bx-seg">' + ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(function (p) {
    return '<button type="button" data-rw="' + p + '" aria-pressed="' + (!!RM.which[p]) + '">' + p + '</button>'; }).join('') + '</div></div>';
  h += '<div class="bx-row"><div><b>' + L('How early', 'Berapa awal') + lock(0) + '</b></div>' + seg('rb', [0, 5, 10, 15].map(function (m) { return { k: String(m), en: m ? m + ' min' : 'On time', bm: m ? m + ' min' : 'Tepat', free: m ? 0 : 1 }; }), String(RM.before)) + '</div>';
  h += '<div class="bx-sec">' + L('Privacy', 'Privasi') + '</div>';
  h += '<p class="bx-note" style="margin-top:0">' + L('Baik asks for your location only when you open Qibla or Prayer times, and keeps it on this device. Notes, saves and the feelings you search for are never sold or shared. There are no ads.', 'Baik hanya meminta lokasi apabila anda membuka Kiblat atau Waktu solat, dan menyimpannya pada peranti ini. Nota, simpanan dan carian anda tidak dijual atau dikongsi. Tiada iklan.') + '</p>';
  h += '<div class="bx-row"><div><b>' + L('Saved location and zone', 'Lokasi dan zon tersimpan') + '</b><small>' + (load('baik.qibla', null) || load('baik.ptz', null) ? L('Stored on this device.', 'Disimpan pada peranti ini.') : L('Nothing stored.', 'Tiada yang disimpan.')) + '</small></div><button class="bx-btn" id="pvLoc">' + L('Forget', 'Lupakan') + '</button></div>';
  h += '<div class="bx-row"><div><b>' + L('Recently viewed', 'Baru dilihat') + '</b><small>' + RECENT.length + ' ' + L('cards', 'kad') + '</small></div><button class="bx-btn" id="pvRecent">' + L('Clear', 'Kosongkan') + '</button></div>';
  h += '<div class="bx-row"><div><b>' + L('Learning progress', 'Kemajuan belajar') + '</b><small>' + Object.keys(PROG).length + ' ' + L('cards', 'kad') + '</small></div><button class="bx-btn" id="pvProg">' + L('Clear', 'Kosongkan') + '</button></div>';
  return h;
}
function wireTools(el) {
  $('rmOn').onclick = function () {
    if (RM.on) { RM.on = false; store('baik.remind', RM); scheduleReminders(); renderBx(); return; }
    if (!('Notification' in window)) { toast(L('This browser cannot show notifications.', 'Pelayar ini tidak boleh memaparkan pemberitahuan.')); return; }
    Notification.requestPermission().then(function (p) {
      if (p !== 'granted') { toast(L('Notifications are blocked for this site.', 'Pemberitahuan disekat untuk laman ini.')); return; }
      RM.on = true; store('baik.remind', RM); scheduleReminders(); renderBx(); toast(L('Reminders on.', 'Peringatan dihidupkan.'));
    });
  };
  el.querySelectorAll('[data-rw]').forEach(function (b) { b.onclick = function () {
    if (!gate('Advanced prayer reminders', 'Peringatan solat lanjutan')) return;
    RM.which[b.dataset.rw] = RM.which[b.dataset.rw] ? 0 : 1; store('baik.remind', RM); scheduleReminders(); renderBx(); }; });
  el.querySelectorAll('[data-rb]').forEach(function (b) { b.onclick = function () {
    if (b.dataset.rb !== '0' && !gate('Advanced prayer reminders', 'Peringatan solat lanjutan')) return;
    RM.before = +b.dataset.rb; store('baik.remind', RM); scheduleReminders(); renderBx(); }; });
  $('pvLoc').onclick = function () {
    Object.keys(localStorage).filter(function (k) { return /^baik\.(qibla|qoff|ptz|ptzman|pt\.)/.test(k); }).forEach(function (k) { localStorage.removeItem(k); });
    toast(L('Location and zone forgotten.', 'Lokasi dan zon dilupakan.')); renderBx(); };
  $('pvRecent').onclick = function () { RECENT.length = 0; store('baik.recent', RECENT); renderChips(); toast(L('Cleared.', 'Dikosongkan.')); renderBx(); };
  $('pvProg').onclick = function () { if (!confirm(L('Clear all learning progress?', 'Kosongkan semua kemajuan belajar?'))) return; PROG = {}; saveProg(); toast(L('Cleared.', 'Dikosongkan.')); renderBx(); };
}

/* ================= round 3: collections (023–063) and journeys (064–070) =================
   Built only from cards already in the deck, each with its own source. Where the deck has no
   sourced dua for a need yet, the collection says so instead of borrowing an unrelated one
   (policy 043 / 124). Card numbers are CARDS indexes; new cards are always appended, so they hold. */
function puasaCards(keys) { return CARDS.map(function (c, i) { return !c.hidden && (c.cats || []).some(function (k) { return keys.indexOf(k) >= 0; }) ? i : -1; }).filter(function (i) { return i >= 0; }); }
var FORGIVE = [21, 22, 23, 49, 52, 53, 63, 3, 27];
var PROTECT = [25, 32, 33, 8, 9, 10, 15, 127];
var HEAL = [120, 121, 122, 123, 124, 125, 126];
var COLLECTIONS = [
  // feelings (023–040)
  { n: 23, g: 'f', i: '🌫', en: 'Anxiety, worry and unease', bm: 'Cemas, risau dan gelisah', items: [8, 19, 47, 60, 62, 66, 123, 126, 55] },
  { n: 24, g: 'f', i: '🌧', en: 'Sadness and grief', bm: 'Sedih dan duka', items: [4, 42, 64, 121, 128, 129, 58] },
  { n: 25, g: 'f', i: '🛡', en: 'Fear and insecurity', bm: 'Takut dan tidak selamat', items: [8, 62, 127, 25, 32, 33, 15] },
  { n: 26, g: 'f', i: '🌙', en: 'Loneliness and rejection', bm: 'Sunyi dan ditolak', items: [42, 128, 60], gap: 1 },
  { n: 27, g: 'f', i: '⛰', en: 'Stress and overwhelm', bm: 'Tekanan dan terbeban', items: [2, 5, 47, 66, 127, 28] },
  { n: 28, g: 'f', i: '🔥', en: 'Anger and frustration', bm: 'Marah dan kecewa', items: [23, 57, 47], gap: 1 },
  { n: 29, g: 'f', i: '👁', en: 'Jealousy and envy', bm: 'Cemburu dan dengki', items: [32, 23], gap: 1 },
  { n: 30, g: 'f', i: '💧', en: 'Guilt and regret', bm: 'Rasa bersalah dan menyesal', items: [21, 22, 49, 52, 53, 63, 3] },
  { n: 31, g: 'f', i: '🧭', en: 'Doubt and confusion', bm: 'Ragu dan keliru', items: [1, 11, 26, 29, 6, 7] },
  { n: 32, g: 'f', i: '⏳', en: 'Impatience and restlessness', bm: 'Tidak sabar dan resah', items: [47, 58, 5, 2] },
  { n: 33, g: 'f', i: '☀', en: 'Gratitude and happiness', bm: 'Syukur dan gembira', items: [37, 38, 64] },
  { n: 34, g: 'f', i: '🌱', en: 'Hope and motivation', bm: 'Harapan dan semangat', items: [5, 42, 54, 24, 2] },
  { n: 35, g: 'f', i: '🕊', en: 'Peace and contentment', bm: 'Tenang dan reda', items: [66, 123, 126, 42] },
  { n: 36, g: 'f', i: '🤲', en: 'Seeking forgiveness', bm: 'Memohon ampun', items: FORGIVE },
  { n: 37, g: 'f', i: '💡', en: 'Seeking guidance', bm: 'Memohon petunjuk', items: [1, 6, 7, 17, 11, 26, 30] },
  { n: 38, g: 'f', i: '🛡', en: 'Seeking protection', bm: 'Memohon perlindungan', items: PROTECT },
  { n: 39, g: 'f', i: '⚓', en: 'Seeking patience', bm: 'Memohon kesabaran', items: [47, 58, 2, 5] },
  { n: 40, g: 'f', i: '🤝', en: 'Strengthening tawakkul', bm: 'Menguatkan tawakal', items: [66, 127, 41, 57] },
  // life (046–063)
  { n: 46, g: 'l', i: '🗓', en: 'Daily routine', bm: 'Rutin harian', items: [30, 25, 31, 32, 33] },
  { n: 47, g: 'l', i: '🌅', en: 'Morning and evening', bm: 'Pagi dan petang', items: [31, 32, 33], gap: 1 },
  { n: 48, g: 'l', i: '✈', en: 'Travelling', bm: 'Bermusafir', items: [12, 20, 15, 17, 18, 19, 13, 14, 16, 41] },
  { n: 49, g: 'l', i: '🏠', en: 'Family problems', bm: 'Masalah keluarga', items: [57, 23, 60, 14, 45, 65] },
  { n: 50, g: 'l', i: '💍', en: 'Marriage', bm: 'Perkahwinan', items: [0, 65, 45] },
  { n: 51, g: 'l', i: '💔', en: 'Love and heartbreak', bm: 'Cinta dan patah hati', items: [0, 42, 4], gap: 1 },
  { n: 52, g: 'l', i: '👵', en: 'Parents', bm: 'Ibu bapa', items: [65, 61], gap: 1 },
  { n: 53, g: 'l', i: '🧒', en: 'Children and parenting', bm: 'Anak dan keibubapaan', items: [0, 45, 61, 67] },
  { n: 54, g: 'l', i: '🍼', en: 'Pregnancy and newborn', bm: 'Kehamilan dan bayi', items: [67], gap: 1 },
  { n: 55, g: 'l', i: '🩺', en: 'Health and healing', bm: 'Kesihatan dan penyembuhan', items: HEAL.concat([2, 4, 5]) },
  { n: 56, g: 'l', i: '🛡', en: 'Protection', bm: 'Perlindungan', items: PROTECT },
  { n: 57, g: 'l', i: '💼', en: 'Work and career', bm: 'Kerja dan kerjaya', items: [6, 24, 56, 41] },
  { n: 58, g: 'l', i: '🪙', en: 'Business, rizq and debt', bm: 'Perniagaan, rezeki dan hutang', items: [56, 41, 24], gap: 1 },
  { n: 59, g: 'l', i: '📚', en: 'Study and examinations', bm: 'Belajar dan peperiksaan', items: [6, 7, 17], gap: 1 },
  { n: 60, g: 'l', i: '🤲', en: 'Repentance and forgiveness', bm: 'Taubat dan keampunan', items: FORGIVE },
  { n: 61, g: 'l', i: '🕯', en: 'Grief, death and the hereafter', bm: 'Duka, kematian dan akhirat', items: [129, 128, 58, 27, 44, 48, 46] },
  { n: 62, g: 'l', i: '⛈', en: 'Weather and natural events', bm: 'Cuaca dan bencana alam', items: [], gap: 1 },
  { n: 63, g: 'l', i: '🌙', en: 'Ramadan essentials', bm: 'Asas Ramadan', items: function () { return [40].concat(puasaCards(['niat', 'berbuka', 'batal', 'uzur', 'ganti'])); } },
];
function colItems(c) { return (typeof c.items === 'function' ? c.items() : c.items).filter(function (i) { return CARDS[i]; }); }

/* journeys: an ordered path. Free shows the whole path as a list; Premium walks it one stage at a
   time and keeps progress. A stage with no card says which sourced duas it is waiting for. */
var JOURNEYS = [
  { n: 64, k: 'umrah', i: '🕋', en: 'Umrah companion', bm: 'Teman umrah', stages: [
    { en: 'Leaving home', bm: 'Keluar rumah', items: [12, 14] },
    { en: 'On the way', bm: 'Dalam perjalanan', items: [20, 15, 17, 18, 19] },
    { en: 'Ihram and talbiyah', bm: 'Ihram dan talbiah', items: [], wait: 'talbiyah' },
    { en: 'Tawaf', bm: 'Tawaf', items: [46], wait: 'the duas of tawaf' },
    { en: "Sa'i", bm: "Sa'i", items: [], wait: "the duas of sa'i" },
    { en: 'Completion', bm: 'Selesai', items: [24, 38] },
    { en: 'Returning home', bm: 'Pulang', items: [16, 13] } ] },
  { n: 65, k: 'hajj', i: '🕋', en: 'Hajj companion', bm: 'Teman haji', stages: [
    { en: 'Preparation and leaving', bm: 'Persediaan dan bertolak', items: [12, 14, 20] },
    { en: 'Ihram', bm: 'Ihram', items: [], wait: 'talbiyah' },
    { en: 'Mina', bm: 'Mina', items: [], wait: 'the remembrance of the days at Mina' },
    { en: 'Arafah', bm: 'Arafah', items: [21, 63, 46], wait: 'the dua of the day of Arafah' },
    { en: 'Muzdalifah', bm: 'Muzdalifah', items: [], wait: 'its sourced duas' },
    { en: 'Tawaf and sa\'i', bm: 'Tawaf dan sa\'i', items: [46] },
    { en: 'Completion and return', bm: 'Selesai dan pulang', items: [24, 38, 16] } ] },
  { n: 66, k: 'ramadan', i: '🌙', en: 'Ramadan journey', bm: 'Perjalanan Ramadan', stages: [
    { en: 'Before you fast', bm: 'Sebelum berpuasa', items: function () { return puasaCards(['niat']); } },
    { en: 'Sahur and iftar', bm: 'Sahur dan berbuka', items: function () { return puasaCards(['berbuka']); } },
    { en: 'What breaks the fast', bm: 'Yang membatalkan', items: function () { return puasaCards(['batal']); } },
    { en: 'Who is excused', bm: 'Yang diberi uzur', items: function () { return puasaCards(['uzur']); } },
    { en: 'The last ten nights', bm: 'Sepuluh malam terakhir', items: [40, 21, 63] },
    { en: 'Making up missed days', bm: 'Qada dan fidyah', items: function () { return puasaCards(['ganti']); } } ] },
  { n: 67, k: 'travel', i: '✈', en: 'Travel journey', bm: 'Perjalanan musafir', stages: [
    { en: 'Setting out', bm: 'Bertolak', items: [12, 14] },
    { en: 'Boarding', bm: 'Menaiki kenderaan', items: [20] },
    { en: 'On the road', bm: 'Dalam perjalanan', items: [15, 17, 18] },
    { en: 'If you feel uneasy', bm: 'Jika rasa gelisah', items: [19, 8] },
    { en: 'Arriving', bm: 'Tiba', items: [13] },
    { en: 'Coming home', bm: 'Pulang', items: [16] } ] },
  { n: 68, k: 'family', i: '🏠', en: 'Family reconciliation', bm: 'Damai dalam keluarga', stages: [
    { en: 'Name what hurts', bm: 'Akui apa yang menyakitkan', items: [60, 62] },
    { en: 'Clear the heart', bm: 'Bersihkan hati', items: [23] },
    { en: 'Hand it over', bm: 'Serahkan', items: [57, 66] },
    { en: 'Be patient', bm: 'Bersabar', items: [47] },
    { en: 'Pray for them', bm: 'Doakan mereka', items: [45, 65] } ] },
  { n: 69, k: 'marriage', i: '💍', en: 'Marriage preparation', bm: 'Persediaan perkahwinan', stages: [
    { en: 'Intention', bm: 'Niat', items: [0] },
    { en: 'A decision to make', bm: 'Membuat keputusan', items: [6, 7], wait: 'the istikharah dua' },
    { en: 'Family conversations', bm: 'Perbincangan keluarga', items: [23, 57] },
    { en: 'A household of faith', bm: 'Rumah tangga beriman', items: [45, 65, 61, 67] } ] },
  { n: 70, k: 'grief', i: '🕯', en: 'Grief and healing', bm: 'Duka dan penyembuhan', note: 1, stages: [
    { en: 'When the news comes', bm: 'Ketika berita sampai', items: [129] },
    { en: 'In the dark', bm: 'Dalam kegelapan', items: [128, 60] },
    { en: 'Holding on', bm: 'Bertahan', items: [58, 47, 121] },
    { en: 'Light returning', bm: 'Cahaya kembali', items: [42, 4] },
    { en: 'Gratitude after sorrow', bm: 'Syukur selepas duka', items: [64] } ] },
];
var JP = load('baik.journeys', {});   // {key: {stage, done:[stageIdx]}}
function stageItems(s) { return (typeof s.items === 'function' ? s.items() : s.items).filter(function (i) { return CARDS[i]; }); }

var vset = null;   // a virtual shelf on the grid: {name, icon, items, desc}
function openSet(name, icon, items, desc) {
  if (!items.length) { toast(L('No sourced duas for this yet.', 'Belum ada doa bersumber untuk ini.')); return; }
  vset = { name: name, icon: icon, items: items, desc: desc || '' };
  colSheet && colSheet.classList.remove('on'); closeBx();
  setView('grid'); render(); window.scrollTo({ top: Math.max(0, $('deck').offsetTop - 140), behavior: 'smooth' });
}

var colSheet = null, jOpen = null;
function openCollections(j) {
  if (!colSheet) {
    colSheet = document.createElement('div'); colSheet.className = 'ac bx'; colSheet.id = 'bxCol';
    colSheet.innerHTML = '<div class="ac-in" style="width:min(760px,100%)"><button class="pw-x" aria-label="Close">✕</button><div id="colBody"></div></div>';
    document.body.appendChild(colSheet);
    colSheet.querySelector('.pw-x').onclick = function () { colSheet.classList.remove('on'); };
    colSheet.addEventListener('click', function (e) { if (e.target === colSheet) colSheet.classList.remove('on'); });
  }
  jOpen = j || null; colSheet.classList.add('on'); renderCollections();
}
window.openBaikCollections = openCollections;
function colTile(c) {
  var items = colItems(c), gap = c.gap || !items.length;
  return '<button class="bx-it" data-set="' + c.n + '" style="flex-direction:column;align-items:flex-start;gap:2px;min-height:76px">'
    + '<span style="font-size:20px">' + c.i + '</span><b style="font-size:14px">' + esc(L(c.en, c.bm)) + '</b>'
    + '<small style="color:#6E6E6E">' + items.length + ' ' + L('cards', 'kad') + (gap ? ' · ' + L('more sourced duas to come', 'lebih banyak doa bersumber akan datang') : '') + '</small></button>';
}
function renderCollections() {
  var el = $('colBody'), h;
  if (jOpen) { el.innerHTML = journeyHTML(jOpen); wireJourney(el); return; }
  h = '<div class="bx-h"><h3>' + L('Collections & journeys', 'Koleksi & perjalanan') + '</h3></div>'
    + '<p class="bx-note" style="margin-top:-6px">' + L('Every collection is free. They gather cards already in Baik, each with its source.', 'Semua koleksi percuma. Ia menghimpun kad sedia ada dalam Baik, setiap satu dengan sumbernya.') + '</p>';
  h += '<div class="bx-sec">' + L('Guided journeys', 'Perjalanan berpandu') + '</div><div class="bx-themes" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">'
    + JOURNEYS.map(function (j) {
      var p = JP[j.k], done = p ? p.done.length : 0;
      return '<button class="bx-it" data-j="' + j.k + '" style="flex-direction:column;align-items:flex-start;gap:2px;min-height:76px"><span style="font-size:20px">' + j.i + '</span><b style="font-size:14px">' + esc(L(j.en, j.bm)) + '</b>'
        + '<small style="color:#6E6E6E">' + j.stages.length + ' ' + L('stages', 'peringkat') + (done ? ' · ' + done + ' ' + L('done', 'selesai') : '') + '</small></button>';
    }).join('') + '</div>';
  h += '<div class="bx-sec">' + L('How you feel', 'Perasaan anda') + '</div><div class="bx-themes" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">'
    + COLLECTIONS.filter(function (c) { return c.g === 'f'; }).map(colTile).join('') + '</div>';
  h += '<div class="bx-sec">' + L('Your life', 'Kehidupan anda') + '</div><div class="bx-themes" style="grid-template-columns:repeat(auto-fill,minmax(160px,1fr))">'
    + COLLECTIONS.filter(function (c) { return c.g === 'l'; }).map(colTile).join('') + '</div>';
  el.innerHTML = h;
  el.querySelectorAll('[data-set]').forEach(function (b) { b.onclick = function () {
    var c = COLLECTIONS.filter(function (x) { return x.n === +b.dataset.set; })[0];
    openSet(L(c.en, c.bm), c.i, colItems(c), c.gap ? L('More sourced duas for this are still being gathered.', 'Lebih banyak doa bersumber sedang dikumpul.') : ''); }; });
  el.querySelectorAll('[data-j]').forEach(function (b) { b.onclick = function () { jOpen = b.dataset.j; renderCollections(); }; });
}
function journeyHTML(k) {
  var j = JOURNEYS.filter(function (x) { return x.k === k; })[0], prem = isPremium(), p = JP[k] || { stage: 0, done: [] };
  var h = '<div class="bx-h"><button class="bx-btn" id="jBack">← ' + L('All', 'Semua') + '</button><h3>' + j.i + ' ' + esc(L(j.en, j.bm)) + '</h3></div>';
  if (j.note) h += '<p class="bx-note" style="background:#F3F3F3;padding:10px 12px;border-radius:10px">' + L('These duas are a companion, not a replacement for people. If grief feels too heavy, please talk to someone you trust or a counsellor. In Malaysia, Befrienders KL: 03-7627 2929.', 'Doa-doa ini teman, bukan pengganti manusia. Jika duka terasa terlalu berat, berbicaralah dengan orang yang dipercayai atau kaunselor. Di Malaysia, Befrienders KL: 03-7627 2929.') + '</p>';
  if (!prem) h += '<p class="bx-note">' + L('Free: the whole path as a list. Premium walks it with you one stage at a time and remembers where you are.', 'Percuma: seluruh laluan sebagai senarai. Premium membimbing anda satu peringkat demi satu dan mengingati kedudukan anda.') + ' <a href="#" id="jUp">' + L('See Premium', 'Lihat Premium') + '</a></p>';
  else h += '<div class="bx-row" style="border:0"><div class="bx-bar"><i style="width:' + Math.round(p.done.length / j.stages.length * 100) + '%"></i></div><small style="margin-left:10px">' + p.done.length + ' / ' + j.stages.length + '</small></div>';
  h += '<div class="bx-list">' + j.stages.map(function (s, i) {
    var items = stageItems(s), cur = prem && i === p.stage, done = p.done.indexOf(i) >= 0;
    var body = items.map(function (gi) { return '<button class="bx-btn" data-open="' + gi + '" style="margin:3px 4px 0 0">' + esc(lv(CARDS[gi], 'ten')) + '</button>'; }).join('')
      + (s.wait ? '<div class="bx-note" style="margin-top:4px">' + L('Waiting for sourced text: ', 'Menunggu teks bersumber: ') + esc(s.wait) + '.</div>' : '');
    return '<div class="bx-it" style="flex-direction:column;align-items:stretch;cursor:default;' + (cur ? 'border-color:#1E2124;' : '') + (prem && !cur && !done ? 'opacity:.75;' : '') + '">'
      + '<div style="display:flex;align-items:center;gap:8px"><span class="mm-k" style="color:#6E6E6E">' + (i + 1) + '</span><b style="flex:1">' + esc(L(s.en, s.bm)) + '</b>'
      + (prem ? '<button class="bx-btn' + (done ? ' pri' : '') + '" data-done="' + i + '">' + (done ? '✓ ' + L('Done', 'Selesai') : L('Mark done', 'Tanda selesai')) + '</button>' : '') + '</div>'
      + ((!prem || cur || done) ? '<div>' + body + '</div>' : '') + '</div>';
  }).join('') + '</div>';
  if (prem) h += '<div class="fc-acts"><button class="bx-btn pri" id="jAll">' + L('Show all cards on the grid', 'Tunjuk semua kad di grid') + '</button><button class="bx-btn" id="jReset">' + L('Start over', 'Mula semula') + '</button></div>';
  else h += '<div class="fc-acts"><button class="bx-btn pri" id="jAll">' + L('Show all cards on the grid', 'Tunjuk semua kad di grid') + '</button></div>';
  return h;
}
function wireJourney(el) {
  var j = JOURNEYS.filter(function (x) { return x.k === jOpen; })[0];
  $('jBack').onclick = function () { jOpen = null; renderCollections(); };
  if ($('jUp')) $('jUp').onclick = function (e) { e.preventDefault(); colSheet.classList.remove('on'); openPremium(); };
  el.querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { colSheet.classList.remove('on'); openSpot(+b.dataset.open); }; });
  el.querySelectorAll('[data-done]').forEach(function (b) { b.onclick = function () {
    var p = JP[j.k] || (JP[j.k] = { stage: 0, done: [] }), i = +b.dataset.done, at = p.done.indexOf(i);
    if (at >= 0) p.done.splice(at, 1); else { p.done.push(i); for (var n = 0; n < j.stages.length; n++) if (p.done.indexOf(n) < 0) { p.stage = n; break; } }
    store('baik.journeys', JP); queueSync(); renderCollections(); }; });
  $('jAll').onclick = function () {
    var all = []; j.stages.forEach(function (s) { stageItems(s).forEach(function (i) { if (all.indexOf(i) < 0) all.push(i); }); });
    openSet(L(j.en, j.bm), j.i, all, '');
  };
  if ($('jReset')) $('jReset').onclick = function () { delete JP[j.k]; store('baik.journeys', JP); queueSync(); renderCollections(); };
}

/* ================= hooks into the app ================= */
/* filtered(): open collections, 018 advanced search (Premium), 075 note search (Premium),
   042 plain-language fallback when the words do not appear on any card */
var _filtered = filtered;
filtered = function () {
  nlCats = [];
  var q = (S.q || '').trim(), adv = q ? parseAdv(q) : null, list;
  if (adv && isPremium()) {
    var keep = S.q; S.q = '';
    try { list = _filtered(); } finally { S.q = keep; }
    list = list.filter(function (c) { return advTest(c, adv); });
  } else {
    if (adv && !advWarned) { advWarned = true; toast(L('Arabic, verse and source search are part of Premium. Showing a basic search.', 'Carian Arab, ayat dan sumber adalah sebahagian Premium. Menunjukkan carian asas.')); }
    list = _filtered();
  }
  if (vset) {
    var items = vset.items;
    list = items.map(function (i) { var c = CARDS[i]; c._i = i; c._rank = 1; return c; })
      .filter(function (c) { return S.kind === 'all' || kindOf(c) === S.kind; });
  }
  if (q && !adv) {
    var have = {}; list.forEach(function (c) { have[c._i] = 1; });
    if (isPremium()) Object.keys(NOTES).forEach(function (gi) {
      if (!have[gi] && CARDS[gi] && String(NOTES[gi]).toLowerCase().indexOf(q.toLowerCase()) >= 0) { CARDS[gi]._i = +gi; CARDS[gi]._rank = 1; list.push(CARDS[gi]); have[gi] = 1; }
    });
    /* the shipped search keeps any card that shares one word, so "my mum is in hospital" matches
       everything through "my" and "is". When few cards hold all the words but the words name a need,
       show the cards of that need (plus the strong matches) instead of the noise. */
    var words = q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(' ' + w + ' ') < 0; });
    var strongC = words.length ? list.filter(function (c) { return strongHit(c, words); }) : [];
    var nl = nlMatch(q).slice(0, 2);
    if (nl.length && strongC.length < 3 && S.set === 'all') {
      nlCats = nl;
      /* a card ranks by the best need it shares with the words: health cards before family ones */
      var pos = function (c) { var best = 9; (c.cats || []).forEach(function (k) { var i = nl.indexOf(k); if (i >= 0 && i < best) best = i; }); return best; };
      var seen = {}; strongC.forEach(function (c) { seen[c._i] = 1; });
      var nlC = CARDS.map(function (c, i) { c._i = i; return c; }).filter(function (c) {
        return !seen[c._i] && !c.hidden && pos(c) < 9 && (S.kind === 'all' || kindOf(c) === S.kind);
      }).sort(function (x, y) { return pos(x) - pos(y) || (kindOf(x) === 'surah') - (kindOf(y) === 'surah'); });
      list = strongC.concat(nlC);
    } else if (strongC.length >= 3 && words.length < q.split(/\s+/).length) {
      list = strongC;   // filler words removed: keep only cards that hold every meaningful word
    }
  }
  return list;
};
/* wire() binds every '#deck .scene' it finds. The shelves below are added after the app has
   already wired the grid, so calling it again bound each existing card twice: one click flipped
   the card and the second flipped it back, and Save saved then unsaved. Wire each card once:
   scenes already wired are taken out of the selector for the duration of the call. */
var _wire = wire;
wire = function () {
  var done = [].filter.call(document.querySelectorAll('#deck .scene'), function (sc) { return sc._wired; });
  done.forEach(function (sc) { sc.classList.remove('scene'); });
  try { return _wire.apply(this, arguments); }
  finally {
    done.forEach(function (sc) { sc.classList.add('scene'); });
    document.querySelectorAll('#deck .scene').forEach(function (sc) { sc._wired = true; });
  }
};
/* render(): open-collection banner, plain-language note, pinned and For you shelves */
var _render = render;
render = function () {
  _render.apply(this, arguments);
  if (S.view && S.view !== 'grid') return;
  var deck = $('deck'); if (!deck) return;
  if (vset) {
    var bar = document.createElement('div'); bar.className = 'sec-h';
    bar.innerHTML = '<span class="sw" style="font-size:22px">' + esc(vset.icon || '') + '</span><h2>' + esc(vset.name) + '</h2><span class="n">' + vset.items.length + ' ' + L('CARDS', 'KAD') + '</span>'
      + '<button class="bx-btn" id="colClose" style="margin-left:auto">' + L('Show all cards', 'Tunjuk semua kad') + '</button>';
    deck.insertBefore(bar, deck.firstChild);
    if (vset.desc) { var d = document.createElement('p'); d.className = 'bx-note'; d.style.margin = '-4px 0 10px'; d.textContent = vset.desc; bar.after(d); }
    $('colClose').onclick = function () { vset = null; render(); };
    return;
  }
  if (nlCats.length) {
    var nb = document.createElement('p'); nb.className = 'bx-note'; nb.style.margin = '4px 0 10px';
    nb.textContent = L('Also showing duas for ', 'Juga menunjukkan doa untuk ') + nlCats.map(catName).join(L(' and ', ' dan ')) + L(', matched from your words.', ', dipadankan daripada perkataan anda.');
    deck.insertBefore(nb, deck.firstChild);
  }
  if ((S.q || '').trim() || S.set !== 'all' || S.kind !== 'all' || activeCats().length) return;
  var shelves = '';
  var pins = PINS.filter(function (gi) { return CARDS[gi]; });
  if (pins.length) shelves += '<div class="sec-h"><span class="sw pin-ico">📌</span><h2>' + L('Pinned', 'Dipin') + '</h2><span class="n">' + pins.length + ' ' + L('CARDS', 'KAD') + '</span></div>'
    + '<div class="grid">' + pins.map(function (gi) { var c = CARDS[gi]; c._i = gi; return cardHTML(c, gi); }).join('') + '</div>';
  var sug = suggestions(isPremium() ? 6 : 3);
  if (sug.length) shelves += '<div class="sec-h"><span class="sw pin-ico">✦</span><h2>' + L('For you', 'Untuk anda') + '</h2><span class="n">' + L('FROM WHAT YOU READ', 'DARIPADA BACAAN ANDA') + '</span></div>'
    + '<div class="grid">' + sug.map(function (c) { return cardHTML(c, c._i); }).join('') + '</div>';
  if (!shelves) return;
  var box = document.createElement('div'); box.className = 'pin-shelf'; box.innerHTML = shelves;
  deck.insertBefore(box, deck.firstChild);
  wire();
};
/* showSpot(): Pin, Memorise and Design in the reader bar, and 020 related duas under it */
var _showSpot = showSpot;
var mmLvl = 0;
showSpot = function () {
  _showSpot.apply(this, arguments);
  var list = spotList(), c = list[(spotIdx + list.length) % list.length]; if (!c) return;
  var gi = c._i, bar = $('spotBar'), hint = bar.querySelector('.spot-hint');
  function btn(label, fn) { var b = document.createElement('button'); b.textContent = label; b.onclick = fn; bar.insertBefore(b, hint); return b; }
  btn(isPinned(gi) ? L('📌 Pinned', '📌 Dipin') : L('📌 Pin', '📌 Pin'), function () { togglePin(gi); showSpot(); });
  btn(L('Design & share', 'Reka & kongsi'), function () { openShare(c); });
  if (learnable(c)) btn(mmLvl ? L('Memorise · level ', 'Hafal · tahap ') + mmLvl : L('Memorise', 'Hafal'), function () {
    if (!gate('Memorisation mode', 'Mod hafalan')) return; mmLvl = mmLvl >= 3 ? 0 : mmLvl + 1; showSpot(); });
  var rel = related(c, isPremium() ? 8 : 3);
  if (rel.length) {
    var row = document.createElement('div'); row.className = 'mm-bar';
    row.innerHTML = '<span class="mm-k">' + L('Related', 'Berkaitan') + '</span>' + rel.map(function (r) { return '<button data-rel="' + r._i + '">' + esc(lv(r, 'ten')) + '</button>'; }).join('')
      + (isPremium() ? '' : '<span class="mm-k">' + L('· more with Premium', '· lagi dengan Premium') + '</span>');
    bar.appendChild(row);
    row.querySelectorAll('[data-rel]').forEach(function (b) { b.onclick = function () { openSpot(+b.dataset.rel); }; });
  }
  var card = document.querySelector('#spotCard .card');
  if (mmLvl && card && learnable(c)) {
    card.classList.add('mm'); if (mmLvl >= 2) card.classList.add('mm2'); if (mmLvl >= 3) card.classList.add('mm3');
    card.addEventListener('pointerdown', function () { card.classList.add('peek'); });
    ['pointerup', 'pointerleave'].forEach(function (ev) { card.addEventListener(ev, function () { card.classList.remove('peek'); }); });
    var mrow = document.createElement('div'); mrow.className = 'mm-bar';
    mrow.innerHTML = '<span class="mm-k">' + [L('translation hidden', 'terjemahan disorok'), L('+ transliteration hidden', '+ transliterasi disorok'), L('+ Arabic hidden', '+ teks Arab disorok')][mmLvl - 1] + ' · ' + L('hold the card to peek', 'tekan lama kad untuk intai') + '</span>'
      + '<button id="mmOk">' + L('I said it', 'Saya ingat') + '</button><button id="mmNo">' + L('Not yet', 'Belum') + '</button>';
    bar.appendChild(mrow);
    $('mmOk').onclick = function () { var p = prog(gi); p.mm = Math.max(p.mm, mmLvl); grade(gi, true); toast(L('Recorded. ', 'Direkod. ') + (memorised(gi) ? L('Memorised.', 'Dihafal.') : '')); if (mmLvl < 3) { mmLvl++; showSpot(); } };
    $('mmNo').onclick = function () { grade(gi, false); toast(L('No problem. It will come back sooner.', 'Tak mengapa. Ia akan diulang lebih awal.')); };
  }
};
var _closeSpot = closeSpot;
closeSpot = function () { mmLvl = 0; return _closeSpot.apply(this, arguments); };

/* the overflow menu gets the new sheet */
(function () {
  var m = $('ovfMenu'); if (!m) return;
  var anchor = $('qibBtn');
  [['collections', L('Collections & journeys', 'Koleksi & perjalanan'), '<rect x="3" y="4" width="7" height="7" rx="1.5"/><rect x="14" y="4" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>'],
   ['display', L('Reading & display', 'Bacaan & paparan'), '<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>'],
   ['learn', L('Learn & memorise', 'Belajar & hafal'), '<path d="M3 8l9-4 9 4-9 4z"/><path d="M7 10v5c3 2 7 2 10 0v-5"/>'],
   ['library', L('My library', 'Pustaka saya'), '<path d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 4.5l3.8 1 -3.6 15-3.8-1z"/>']].forEach(function (x) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.dataset.bxOpen = x[0];
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + x[2] + '</svg>' + x[1];
    b.onclick = function () { m.hidden = true; $('ovfBtn').setAttribute('aria-expanded', 'false'); if (x[0] === 'collections') openCollections(); else openBx(x[0]); };
    m.insertBefore(b, anchor);
  });
})();

/* the focus trap in Khayr watches .ac.on, so the sheet is covered; apply prefs now */
applyPF();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPF);
setInterval(function () { if (PF.auto) applyPF(); }, 10 * 60 * 1000);
if (SYNC.on) setTimeout(function () { syncNow(false); }, 3000);
render();
window.BaikFeatures = { PF: PF, applyPF: applyPF, openBx: openBx, PINS: function () { return PINS; }, PROG: function () { return PROG; }, merge: merge, snapshot: snapshot };
})();

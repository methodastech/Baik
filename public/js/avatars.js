/* Baik · profile avatars. Flat cartoon busts in one style (thick outline, flat colour, soft blush),
   built from parts: skin, headwear (songkok, kopiah, serban, tudung, telekung), clothes (baju Melayu,
   jubah, shirt), beard and glasses. Named by what they wear or who they are (Atuk, Ustazah), never
   after the Prophet's family or companions. A few friends have no face at all: the cat, the moon,
   the lantern, the ketupat and the mosque. window.BAIK_AVATARS = [{ id, en, bm, svg }]. */
(function () {
  'use strict';
  var O = '#26282B', SW = 2.4;
  var SKIN = { a: ['#F6D2B4', '#E9B996'], b: ['#E7B58C', '#D29C72'], c: ['#C98E62', '#B07850'], d: ['#8E5B3C', '#774A30'] };
  function shade(hex, k) {             // darker (k < 0) or lighter (k > 0) version of a colour
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  var st = 'stroke="' + O + '" stroke-width="' + SW + '" stroke-linejoin="round" stroke-linecap="round"';
  function wrap(id, bg, body) {
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img">'
      + '<defs><clipPath id="av-' + id + '"><circle cx="60" cy="60" r="60"/></clipPath></defs>'
      + '<g clip-path="url(#av-' + id + ')"><rect width="120" height="120" fill="' + bg + '"/>' + body + '</g></svg>';
  }
  function face(o, opts) {               // eyes, brows, nose, smile, blush (and age lines)
    var y = opts && opts.y || 0, s = '';
    s += '<ellipse cx="51" cy="' + (62 + y) + '" rx="2.7" ry="3.3" fill="' + O + '"/><ellipse cx="69" cy="' + (62 + y) + '" rx="2.7" ry="3.3" fill="' + O + '"/>';
    s += '<circle cx="52" cy="' + (61 + y) + '" r=".9" fill="#fff"/><circle cx="70" cy="' + (61 + y) + '" r=".9" fill="#fff"/>';
    var bc = o.browCol || O;
    s += '<path d="M46.5 ' + (55 + y) + 'Q51 ' + (52.4 + y) + ' 55.5 ' + (54.6 + y) + 'M64.5 ' + (54.6 + y) + 'Q69 ' + (52.4 + y) + ' 73.5 ' + (55 + y) + '" fill="none" stroke="' + bc + '" stroke-width="2.2" stroke-linecap="round"/>';
    s += '<path d="M60.5 ' + (64 + y) + 'Q58.6 ' + (68.6 + y) + ' 61.4 ' + (69.4 + y) + '" fill="none" stroke="' + shade(o.skin[1], -0.25) + '" stroke-width="1.7" stroke-linecap="round"/>';
    s += '<ellipse cx="45.5" cy="' + (70 + y) + '" rx="4.2" ry="2.6" fill="#F07C7C" opacity=".32"/><ellipse cx="74.5" cy="' + (70 + y) + '" rx="4.2" ry="2.6" fill="#F07C7C" opacity=".32"/>';
    if (!o.noMouth) s += '<path d="M53 ' + (73.5 + y) + 'Q60 ' + (80 + y) + ' 67 ' + (73.5 + y) + 'Q60 ' + (76.5 + y) + ' 53 ' + (73.5 + y) + 'Z" fill="#fff" stroke="' + O + '" stroke-width="2" stroke-linejoin="round"/>';
    if (o.old) s += '<path d="M43 ' + (60 + y) + 'l-3 -1.4M43 ' + (63 + y) + 'l-3.2 .6M77 ' + (60 + y) + 'l3 -1.4M77 ' + (63 + y) + 'l3.2 .6" stroke="' + shade(o.skin[1], -0.3) + '" stroke-width="1.4" stroke-linecap="round"/>';
    if (o.glasses) s += '<g fill="rgba(255,255,255,.18)" stroke="' + O + '" stroke-width="2"><circle cx="51" cy="' + (62 + y) + '" r="6.3"/><circle cx="69" cy="' + (62 + y) + '" r="6.3"/></g><path d="M57.2 ' + (61 + y) + 'Q60 ' + (59 + y) + ' 62.8 ' + (61 + y) + '" fill="none" stroke="' + O + '" stroke-width="2"/>';
    return s;
  }
  function clothes(o) {
    var c = o.cloth, col = o.clothCol, s = '';
    s += '<path d="M10 126C12 103 31 92.5 60 92.5S108 103 110 126Z" fill="' + col + '" ' + st + '/>';
    if (c === 'baju') {                  // baju Melayu: the cekak musang collar and three gold buttons
      s += '<path d="M47 91.5Q60 97 73 91.5V98Q60 103.5 47 98Z" fill="' + shade(col, -0.18) + '" ' + st + '/>';
      s += '<g fill="#E9B949" stroke="' + O + '" stroke-width="1.3"><circle cx="60" cy="107" r="2"/><circle cx="60" cy="114.5" r="2"/></g>';
      s += '<path d="M30 112Q34 104 38 101M90 112Q86 104 82 101" fill="none" stroke="' + shade(col, -0.22) + '" stroke-width="2" stroke-linecap="round"/>';
    } else if (c === 'jubah') {
      s += '<path d="M50 93Q60 100 70 93" fill="none" ' + st + '/><path d="M60 98V126" stroke="' + shade(col, -0.15) + '" stroke-width="2.2"/>';
    } else {                             // shirt with a small collar
      s += '<path d="M50 92.5L60 102L70 92.5L66 91L60 96.5L54 91Z" fill="#fff" ' + st + '/>';
    }
    return s;
  }
  function neckEars(o) {
    return '<path d="M51.5 79V95Q60 99.5 68.5 95V79Z" fill="' + o.skin[1] + '" ' + st + '/>'
      + '<ellipse cx="38.5" cy="63" rx="4.4" ry="6.2" fill="' + o.skin[0] + '" ' + st + '/><ellipse cx="81.5" cy="63" rx="4.4" ry="6.2" fill="' + o.skin[0] + '" ' + st + '/>';
  }
  var HEAD = '<ellipse cx="60" cy="61" rx="22" ry="24.5" ';
  function beard(o) {
    var b = o.beard, c = o.beardCol || '#2E2A28';
    if (b === 'short') return '<path d="M38.5 62Q39 86 60 88.5Q81 86 81.5 62Q80 75 72 79Q60 83.5 48 79Q40 75 38.5 62Z" fill="' + c + '" ' + st + '/>';
    if (b === 'full') return '<path d="M38 60Q36 97 60 102Q84 97 82 60Q80 76 72 80.5Q60 85 48 80.5Q40 76 38 60Z" fill="' + c + '" ' + st + '/>';
    if (b === 'stache') return '';
    return '';
  }
  function stache(o) {
    var c = o.beardCol || '#2E2A28';
    return '<path d="M51.5 71.5Q55.5 67.6 60 70Q64.5 67.6 68.5 71.5Q64.5 73.6 60 72.4Q55.5 73.6 51.5 71.5Z" fill="' + c + '" stroke="' + O + '" stroke-width="1.6" stroke-linejoin="round"/>';
  }
  function hat(o) {
    var w = o.wear, c = o.wearCol;
    if (w === 'songkok') return '<path d="M38.5 48L40.5 28.5Q60 22.5 79.5 28.5L81.5 48Q60 43.5 38.5 48Z" fill="#1F2024" ' + st + '/>'
      + '<path d="M43 32Q60 27.5 77 32" fill="none" stroke="#4A4C52" stroke-width="2" stroke-linecap="round"/>';
    if (w === 'kopiah') return '<path d="M37.5 50Q37 29 60 28.5Q83 29 82.5 50Q60 45.5 37.5 50Z" fill="' + (c || '#FBFAF5') + '" ' + st + '/>'
      + '<path d="M40 45.5Q60 41.5 80 45.5" fill="none" stroke="' + (o.wearLine || '#C9A227') + '" stroke-width="1.8" stroke-dasharray="2.4 2.6" stroke-linecap="round"/>'
      + '<path d="M47 36Q60 32.5 73 36" fill="none" stroke="' + (o.wearLine || '#C9A227') + '" stroke-width="1.5" stroke-dasharray="1.6 3" stroke-linecap="round"/>';
    if (w === 'serban') return '<path d="M34 54Q30 26 60 23Q90 26 86 54Q60 44 34 54Z" fill="' + c + '" ' + st + '/>'
      + '<path d="M37 45Q60 33 84 46M40 36Q62 27 81 37M46 29Q62 25 74 30" fill="none" stroke="' + shade(c, -0.16) + '" stroke-width="2" stroke-linecap="round"/>';
    if (w === 'hair') return '<path d="M37.5 60Q35 33 60 32Q85 33 82.5 60Q80 45 68 42Q58 47 46 44.5Q40 49 37.5 60Z" fill="' + c + '" ' + st + '/>';
    return '';
  }
  function person(id, o) {
    var s = '', covered = o.wear === 'tudung' || o.wear === 'telekung';
    if (covered) {
      var c = o.wearCol, white = o.wear === 'telekung';
      // the drape behind and around the face, falling over the shoulders
      s += white
        ? '<path d="M60 25C29 25 23 50 25.5 72C27 90 17 104 6 126H114C103 104 93 90 94.5 72C97 50 91 25 60 25Z" fill="#FFFFFF" ' + st + '/>'
        : clothes(o) + '<path d="M60 29C33 29 29 52 31 70C32.5 85 28 95 17 104C15 110 14 116 14 126H106C106 116 105 110 103 104C92 95 87.5 85 89 70C91 52 87 29 60 29Z" fill="' + c + '" ' + st + '/>';
      // the face opening, a little smaller than a bare head
      s += '<ellipse cx="60" cy="63" rx="19.5" ry="22" fill="' + o.skin[0] + '" ' + st + '/>';
      s += white
        ? '<ellipse cx="60" cy="63" rx="23.5" ry="26" fill="none" stroke="#D9DCDF" stroke-width="2.2" stroke-dasharray="1 4.2" stroke-linecap="round"/>'
        : '<path d="M40.5 56Q43 39.5 60 39.5Q77 39.5 79.5 56" fill="none" stroke="' + shade(c, -0.2) + '" stroke-width="3" stroke-linecap="round"/>'
          + '<path d="M28 100Q42 94 49 85M92 100Q80 95 74 88" fill="none" stroke="' + shade(c, -0.18) + '" stroke-width="2.2" stroke-linecap="round"/>'
          + '<circle cx="75.5" cy="86" r="2.6" fill="#E9B949" stroke="' + O + '" stroke-width="1.4"/>';
      s += face(o, { y: 1 });
    } else {
      s += clothes(o) + neckEars(o);
      s += HEAD + 'fill="' + o.skin[0] + '" ' + st + '/>';
      if (o.beard === 'short' || o.beard === 'full') s += beard(o);
      if (o.wear !== 'hair') s += '<path d="M39 52Q39.5 46 42 43M81 52Q80.5 46 78 43" fill="none" stroke="' + (o.hairCol || '#2E2A28') + '" stroke-width="3.4" stroke-linecap="round"/>';
      s += face(o);
      if (o.beard) s += stache(o);
      s += hat(o);
    }
    return wrap(id, o.bg, s);
  }

  /* the friends: no faces of people, for anyone who would rather not use one */
  var FRIENDS = {
    cat: function () {
      return wrap('cat', '#FCE7C8',
        '<path d="M14 126C16 104 34 95 60 95S104 104 106 126Z" fill="#F4A64B" ' + st + '/>'
        + '<path d="M36 50L33 24L52 38ZM84 50L87 24L68 38Z" fill="#F4A64B" ' + st + '/><path d="M38 44L36.5 31L46 38ZM82 44L83.5 31L74 38Z" fill="#F7C9C0"/>'
        + '<ellipse cx="60" cy="62" rx="28" ry="25" fill="#F7B35E" ' + st + '/>'
        + '<path d="M60 38V46M51 39.5L53 46.5M69 39.5L67 46.5" stroke="#D9852E" stroke-width="2.6" stroke-linecap="round"/>'
        + '<ellipse cx="60" cy="71" rx="12" ry="9" fill="#FFF4E6" stroke="' + O + '" stroke-width="2"/>'
        + '<path d="M49 59Q52 55.5 55 59M65 59Q68 55.5 71 59" fill="none" stroke="' + O + '" stroke-width="2.4" stroke-linecap="round"/>'
        + '<path d="M57.5 66.5H62.5L60 69.5Z" fill="#E77A7A" stroke="' + O + '" stroke-width="1.5" stroke-linejoin="round"/>'
        + '<path d="M60 69.5V72.5M56 74Q60 76.5 64 74" fill="none" stroke="' + O + '" stroke-width="1.8" stroke-linecap="round"/>'
        + '<path d="M44 69H31M44 73L32 76M76 69H89M76 73L88 76" stroke="' + O + '" stroke-width="1.4" stroke-linecap="round"/>'
        + '<path d="M40.5 47Q41 32 60 31.5Q79 32 79.5 47Q60 42.5 40.5 47Z" fill="#FBFAF5" ' + st + '/><path d="M43 43.5Q60 40 77 43.5" fill="none" stroke="#2F8F6B" stroke-width="1.6" stroke-dasharray="2 2.6" stroke-linecap="round"/>');
    },
    moon: function () {
      return wrap('moon', '#1F2A44',
        '<circle cx="24" cy="26" r="1.6" fill="#FFE9A8"/><circle cx="96" cy="20" r="1.2" fill="#FFE9A8"/><circle cx="102" cy="84" r="1.5" fill="#FFE9A8"/><circle cx="18" cy="92" r="1.1" fill="#FFE9A8"/>'
        + '<path d="M70 20A40 40 0 1 0 98 82A32 32 0 1 1 70 20Z" fill="#FFD666" ' + st + '/>'
        + '<path d="M33 55Q36.5 51.5 40 55" fill="none" stroke="' + O + '" stroke-width="2.4" stroke-linecap="round"/>'
        + '<path d="M34 68Q39.5 73 45 68.5" fill="none" stroke="' + O + '" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="31" cy="62.5" rx="3.4" ry="2.1" fill="#F07C7C" opacity=".4"/>'
        + '<path d="M88 40L90.6 46.2L97 46.6L92 50.6L93.8 57L88 53.4L82.2 57L84 50.6L79 46.6L85.4 46.2Z" fill="#FFF3C4" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/>');
    },
    lantern: function () {
      return wrap('lantern', '#123B33',
        '<circle cx="60" cy="68" r="34" fill="#F5C451" opacity=".18"/>'
        + '<path d="M60 8V22" stroke="' + O + '" stroke-width="2.4"/><circle cx="60" cy="22" r="4" fill="none" stroke="#E9B949" stroke-width="2.4"/>'
        + '<path d="M44 34H76L71 26H49Z" fill="#E9B949" ' + st + '/>'
        + '<path d="M42 34H78L84 70L72 96H48L36 70Z" fill="#F6C453" ' + st + '/>'
        + '<path d="M50 34L46 70L52 96M70 34L74 70L68 96M60 34V96" fill="none" stroke="#B9852A" stroke-width="2"/>'
        + '<path d="M60 52C55 58 54 64 60 70C66 64 65 58 60 52Z" fill="#FFF6D8" stroke="#E07A2E" stroke-width="1.6"/>'
        + '<path d="M46 96H74L70 104H50Z" fill="#E9B949" ' + st + '/><path d="M60 104V112" stroke="' + O + '" stroke-width="2.4" stroke-linecap="round"/>');
    },
    ketupat: function () {               // the woven rice parcel of Hari Raya
      var weave = '';
      for (var k = -3; k <= 3; k++) weave += '<path d="M' + (60 + k * 8 - 26) + ' ' + (66 - k * 8 - 26) + 'L' + (60 + k * 8 + 26) + ' ' + (66 - k * 8 + 26) + '" stroke="#3E8A3A" stroke-width="2"/>';
      return wrap('ketupat', '#FFF2D2',
        '<path d="M58 28Q50 14 38 10M62 28Q72 16 86 14" fill="none" stroke="#5DA54E" stroke-width="5" stroke-linecap="round"/>'
        + '<path d="M58 28Q50 14 38 10M62 28Q72 16 86 14" fill="none" stroke="' + O + '" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>'
        + '<defs><clipPath id="kt-in"><path d="M60 26L100 66L60 106L20 66Z"/></clipPath></defs>'
        + '<path d="M60 26L100 66L60 106L20 66Z" fill="#8CCB6A"/>'
        + '<g clip-path="url(#kt-in)">' + weave + '<path d="M60 26L100 66L60 106" fill="#6BB04F" opacity=".35"/></g>'
        + '<path d="M60 26L100 66L60 106L20 66Z" fill="none" ' + st + '/>'
        + '<rect x="45" y="56" width="30" height="24" rx="11" fill="#FFF8E6" stroke="' + O + '" stroke-width="2"/>'
        + '<path d="M51.5 64Q54 61.5 56.5 64M63.5 64Q66 61.5 68.5 64" fill="none" stroke="' + O + '" stroke-width="2.2" stroke-linecap="round"/>'
        + '<path d="M55 70Q60 74.5 65 70" fill="none" stroke="' + O + '" stroke-width="2.1" stroke-linecap="round"/>'
        + '<ellipse cx="50" cy="69" rx="2.6" ry="1.7" fill="#F07C7C" opacity=".45"/><ellipse cx="70" cy="69" rx="2.6" ry="1.7" fill="#F07C7C" opacity=".45"/>');
    },
    mosque: function () {
      return wrap('mosque', '#DFF1EA',
        '<circle cx="86" cy="26" r="7" fill="#FFD666"/><circle cx="89" cy="23.5" r="6" fill="#DFF1EA"/>'
        + '<path d="M22 112V62H30V112M90 112V62H98V112" fill="#2F8F6B" ' + st + '/>'
        + '<path d="M20 62L26 48L32 62ZM88 62L94 48L100 62Z" fill="#E9B949" ' + st + '/>'
        + '<path d="M36 112V76H84V112Z" fill="#F7F4EC" ' + st + '/>'
        + '<path d="M38 76Q38 46 60 40Q82 46 82 76Z" fill="#2F8F6B" ' + st + '/>'
        + '<path d="M60 40V30" stroke="' + O + '" stroke-width="2.2"/><path d="M60 24A4 4 0 1 0 63 30A3.2 3.2 0 1 1 60 24Z" fill="#E9B949" stroke="' + O + '" stroke-width="1.4"/>'
        + '<path d="M52 112V96Q52 88 60 88Q68 88 68 96V112Z" fill="#2F8F6B" ' + st + '/>'
        + '<path d="M0 112H120V120H0Z" fill="#B9DCCB"/>');
    },
  };

  var SET = [
    { id: 'songkok-boy', en: 'Songkok boy', bm: 'Budak bersongkok', o: { bg: '#CFEDE6', skin: SKIN.b, wear: 'songkok', cloth: 'baju', clothCol: '#2BA79A' } },
    { id: 'tudung-pink', en: 'Pink tudung', bm: 'Tudung merah jambu', o: { bg: '#FBE1E6', skin: SKIN.a, wear: 'tudung', wearCol: '#F28DA8', cloth: 'shirt', clothCol: '#F28DA8' } },
    { id: 'ustaz', en: 'Ustaz', bm: 'Ustaz', o: { bg: '#E3E9F7', skin: SKIN.b, wear: 'kopiah', cloth: 'baju', clothCol: '#34497A', beard: 'short' } },
    { id: 'tudung-navy', en: 'Navy tudung', bm: 'Tudung biru gelap', o: { bg: '#DCE6F4', skin: SKIN.c, wear: 'tudung', wearCol: '#3B5486', cloth: 'shirt', clothCol: '#3B5486' } },
    { id: 'atuk', en: 'Atuk', bm: 'Atuk', o: { bg: '#EFE8D8', skin: SKIN.a, wear: 'kopiah', cloth: 'jubah', clothCol: '#F4F2EC', beard: 'full', beardCol: '#F2F2F0', hairCol: '#E6E6E3', browCol: '#B8B8B5', glasses: true, old: true } },
    { id: 'nenek', en: 'Nenek', bm: 'Nenek', o: { bg: '#E8E2F2', skin: SKIN.b, wear: 'telekung', glasses: true, old: true } },
    { id: 'serban-white', en: 'White serban', bm: 'Serban putih', o: { bg: '#E6EFE3', skin: SKIN.c, wear: 'serban', wearCol: '#FAFAF7', cloth: 'jubah', clothCol: '#D9DDE0', beard: 'short', beardCol: '#4A3426' } },
    { id: 'tudung-yellow', en: 'Yellow tudung', bm: 'Tudung kuning', o: { bg: '#FFF1C9', skin: SKIN.d, wear: 'tudung', wearCol: '#F5C04A', cloth: 'shirt', clothCol: '#F5C04A' } },
    { id: 'kopiah-boy', en: 'Kopiah boy', bm: 'Budak berkopiah', o: { bg: '#FFE6CF', skin: SKIN.a, wear: 'kopiah', wearLine: '#2F8F6B', cloth: 'shirt', clothCol: '#F08A3C' } },
    { id: 'ustazah', en: 'Ustazah', bm: 'Ustazah', o: { bg: '#D9F0E5', skin: SKIN.a, wear: 'tudung', wearCol: '#2F8F6B', cloth: 'shirt', clothCol: '#2F8F6B', glasses: true } },
    { id: 'songkok-man', en: 'Songkok man', bm: 'Lelaki bersongkok', o: { bg: '#F6DEDA', skin: SKIN.c, wear: 'songkok', cloth: 'baju', clothCol: '#9C2F45', beard: 'stache' } },
    { id: 'telekung-girl', en: 'Telekung', bm: 'Telekung', o: { bg: '#DDEFF8', skin: SKIN.a, wear: 'telekung' } },
    { id: 'serban-green', en: 'Green serban', bm: 'Serban hijau', o: { bg: '#E1EEDB', skin: SKIN.d, wear: 'serban', wearCol: '#3E9A63', cloth: 'jubah', clothCol: '#F4F2EC', beard: 'full', beardCol: '#1E1B19' } },
    { id: 'tudung-lilac', en: 'Lilac tudung', bm: 'Tudung ungu', o: { bg: '#EDE3F7', skin: SKIN.d, wear: 'tudung', wearCol: '#9A7AD1', cloth: 'shirt', clothCol: '#9A7AD1' } },
    { id: 'boy', en: 'Boy', bm: 'Budak lelaki', o: { bg: '#DDEBFA', skin: SKIN.b, wear: 'hair', wearCol: '#2E2A28', hairCol: '#2E2A28', cloth: 'baju', clothCol: '#4C8BD6' } },
  ];

  var out = SET.map(function (a) { return { id: a.id, en: a.en, bm: a.bm, svg: person(a.id, a.o) }; });
  [['cat', 'Cat', 'Kucing'], ['moon', 'Crescent', 'Bulan sabit'], ['lantern', 'Lantern', 'Pelita'], ['ketupat', 'Ketupat', 'Ketupat'], ['mosque', 'Mosque', 'Masjid']]
    .forEach(function (f) { out.push({ id: f[0], en: f[1], bm: f[2], svg: FRIENDS[f[0]](), friend: true }); });
  window.BAIK_AVATARS = out;
  window.baikAvatar = function (id) { for (var i = 0; i < out.length; i++) if (out[i].id === id) return out[i]; return null; };
})();

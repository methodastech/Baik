/* Baik · Tasbih. A string of beads drawn on a canvas: tap anywhere to move one bead across the gap
   and count; swipe right-to-left to take one back. Pick the dhikr and the bead in the panel below.
   Counts, the chosen dhikr and bead, and the sound setting are kept on this device. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var bm = function () { return LANG === 'bm'; };
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the dhikr. "after" walks SubhanAllah 33 · Alhamdulillah 33 · Allahu Akbar 34 by itself */
  var DHIKR = [
    { k: 'after', en: 'After prayer', bm: 'Selepas solat', steps: [
      { ar: 'سُبْحَانَ ٱللَّٰهِ', tr: 'SubhanAllah', en: 'Glory be to Allah', bm: 'Maha Suci Allah', n: 33 },
      { ar: 'ٱلْحَمْدُ لِلَّٰهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah', bm: 'Segala puji bagi Allah', n: 33 },
      { ar: 'ٱللَّٰهُ أَكْبَرُ', tr: 'Allahu Akbar', en: 'Allah is the Greatest', bm: 'Allah Maha Besar', n: 34 }] },
    { k: 'subhan', steps: [{ ar: 'سُبْحَانَ ٱللَّٰهِ', tr: 'SubhanAllah', en: 'Glory be to Allah', bm: 'Maha Suci Allah', n: 33 }] },
    { k: 'hamd', steps: [{ ar: 'ٱلْحَمْدُ لِلَّٰهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah', bm: 'Segala puji bagi Allah', n: 33 }] },
    { k: 'akbar', steps: [{ ar: 'ٱللَّٰهُ أَكْبَرُ', tr: 'Allahu Akbar', en: 'Allah is the Greatest', bm: 'Allah Maha Besar', n: 34 }] },
    { k: 'tahlil', steps: [{ ar: 'لَا إِلَٰهَ إِلَّا ٱللَّٰهُ', tr: 'La ilaha illallah', en: 'There is no god but Allah', bm: 'Tiada tuhan melainkan Allah', n: 100 }] },
    { k: 'istighfar', steps: [{ ar: 'أَسْتَغْفِرُ ٱللَّٰهَ', tr: 'Astaghfirullah', en: 'I seek Allah’s forgiveness', bm: 'Aku memohon ampun kepada Allah', n: 100 }] },
    { k: 'salawat', steps: [{ ar: 'ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ', tr: 'Allahumma salli ‘ala Muhammad', en: 'O Allah, send blessings upon Muhammad', bm: 'Ya Allah, berilah selawat ke atas Muhammad', n: 100 }] },
    { k: 'free', en: 'Free count', bm: 'Kiraan bebas', steps: [{ ar: '', tr: 'Free count', en: 'Count without a target', bm: 'Kira tanpa sasaran', n: 0 }] },
  ];
  /* bead finishes: base colour, shadow colour, highlight; "wood" adds grain */
  var BEADS = [
    { k: 'onyx', en: 'Onyx', bm: 'Oniks', c: ['#3A3D44', '#08090B'], hi: 'rgba(255,255,255,.75)' },
    { k: 'pearl', en: 'Pearl', bm: 'Mutiara', c: ['#FFFFFF', '#B9B6AE'], hi: 'rgba(255,255,255,1)' },
    { k: 'emerald', en: 'Emerald', bm: 'Zamrud', c: ['#3FE0A5', '#05583D'], hi: 'rgba(230,255,245,.9)' },
    { k: 'amber', en: 'Amber', bm: 'Ambar', c: ['#FFE07A', '#B9790A'], hi: 'rgba(255,255,235,.95)' },
    { k: 'wood', en: 'Wood', bm: 'Kayu', c: ['#D79A62', '#6B3A17'], hi: 'rgba(255,240,220,.7)', grain: true },
    { k: 'garnet', en: 'Garnet', bm: 'Delima', c: ['#F0606A', '#6E0F1A'], hi: 'rgba(255,230,232,.85)' },
  ];

  var ST = Object.assign({ d: 'after', bead: 'onyx', sound: true, snd: 'stone', counts: {}, step: {}, today: 0, day: '' }, load('baik.tasbih2', {}));
  if (!ST.sound && ST.snd !== 'none') ST.snd = 'none';
  var dayKey = new Date().toISOString().slice(0, 10);
  if (ST.day !== dayKey) { ST.day = dayKey; ST.today = 0; }
  function save() { store('baik.tasbih2', ST); }
  function D() { return DHIKR.filter(function (x) { return x.k === ST.d; })[0] || DHIKR[0]; }
  function step() { var d = D(); return d.steps[Math.min(ST.step[d.k] || 0, d.steps.length - 1)]; }
  function count() { return ST.counts[ST.d] || 0; }
  function name(d) { return d.en ? (bm() ? d.bm : d.en) : d.steps[0].tr; }

  /* ---------- sound: made in the browser, nothing downloaded ----------
     stone: two hard beads meeting (two clicks 7 ms apart, bright and short)
     wood:  a hollow knock (a resonant band of noise, a little lower)
     soft:  a quiet low tap for night or the masjid
     a round completed rings a soft two-note chime instead */
  var SOUNDS = [
    { k: 'stone', en: 'Stone', bm: 'Batu' }, { k: 'wood', en: 'Wood', bm: 'Kayu' },
    { k: 'soft', en: 'Soft', bm: 'Lembut' }, { k: 'none', en: 'None', bm: 'Senyap' },
  ];
  var ac = null, noise = null;
  function ctx() {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    if (!noise) { var n = ac.sampleRate * 0.25; noise = ac.createBuffer(1, n, ac.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; }
    return ac;
  }
  function burst(t, freq, q, vol, len) {          // a short band of noise: the body of a click
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.0015); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t, Math.random() * 0.2); s.stop(t + len + 0.02);
  }
  function tone(t, freq, vol, len, type) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + len + 0.02);
  }
  function tock(big, kind) {
    var k = kind || ST.snd; if (k === 'none') return;
    try {
      ctx(); var t = ac.currentTime + 0.005, v = 0.9 + Math.random() * 0.2;   // each click a little different, like real beads
      if (big) {                                       // a round finished: soft two-note chime
        tone(t, 880, 0.16, 1.2); tone(t, 1320, 0.07, 0.9); tone(t + 0.14, 1174.7, 0.12, 1.4); tone(t + 0.14, 1761, 0.05, 1);
        return;
      }
      if (k === 'stone') { burst(t, 3200 * v, 9, 0.55, 0.035); burst(t + 0.007, 2600 * v, 7, 0.3, 0.03); tone(t, 4200 * v, 0.05, 0.02, 'triangle'); }
      else if (k === 'wood') { burst(t, 950 * v, 12, 0.8, 0.07); tone(t, 520 * v, 0.12, 0.06, 'triangle'); }
      else if (k === 'soft') { tone(t, 210 * v, 0.28, 0.09); burst(t, 600, 2, 0.08, 0.04); }
    } catch (e) {}
  }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  /* ---------- the beads ---------- */
  var cv = $('tbCv'), x = cv.getContext('2d'), W = 0, H = 0, dpr = 1;
  var shift = count(), sprites = {};
  function resize() {
    var r = cv.getBoundingClientRect(); dpr = Math.min(3, window.devicePixelRatio || 1);
    W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); sprites = {};
  }
  function beadSize() { return Math.max(34, Math.min(78, W * 0.13)); }
  function sprite(b, R) {
    var key = b.k + R; if (sprites[key]) return sprites[key];
    var s = document.createElement('canvas'), P = Math.ceil(R * 2.6 * dpr); s.width = s.height = P; var g = s.getContext('2d');
    g.scale(dpr, dpr); var c = P / dpr / 2;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(c + R * .1, c + R * .9, R * .9, R * .28, 0, 0, Math.PI * 2); g.fill();   // contact shadow
    var gr = g.createRadialGradient(c - R * .35, c - R * .4, R * .1, c, c, R);
    gr.addColorStop(0, b.c[0]); gr.addColorStop(.75, b.c[1]); gr.addColorStop(1, b.c[1]);
    g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    if (b.grain) { g.save(); g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.clip(); g.strokeStyle = 'rgba(60,25,5,.25)'; g.lineWidth = 1.2;
      for (var i = -4; i <= 4; i++) { g.beginPath(); g.ellipse(c + i * R * .22, c, R * .18 + Math.abs(i) * 1.5, R * 1.1, .2, 0, Math.PI * 2); g.stroke(); } g.restore(); }
    var rim = g.createRadialGradient(c, c, R * .7, c, c, R); rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = rim; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    var hi = g.createRadialGradient(c - R * .38, c - R * .45, 0, c - R * .38, c - R * .45, R * .55);
    hi.addColorStop(0, b.hi); hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi; g.beginPath(); g.arc(c, c, R, 0, Math.PI * 2); g.fill();
    // the hole the string passes through, seen as a faint dimple at each side
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(c - R * .96, c, R * .1, 0, Math.PI * 2); g.arc(c + R * .96, c, R * .1, 0, Math.PI * 2); g.fill();
    return (sprites[key] = s);
  }
  // the string: a gentle curve across the screen, a little lower on the left
  function curve(t) {
    var x0 = -0.15 * W, x1 = 1.15 * W, y0 = H * 0.58, y1 = H * 0.47, sag = H * 0.06;
    var xx = x0 + (x1 - x0) * t, yy = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * -sag;
    return [xx, yy];
  }
  // bead k sits at u = k - shift: right of the gap when u >= 0, left of it when u <= -1, crossing between
  function tOf(u, sp) {
    var gl = 0.42, gr = 0.62;
    if (u >= 0) return gr + u * sp;
    if (u <= -1) return gl + (u + 1) * sp;
    var e = u + 1, k = e * e * (3 - 2 * e);          // the crossing eases in and out
    return gl + (gr - gl) * k;
  }
  function draw() {
    if (window.TB_GL) return;                        // the 3D string (tasbih3d.js) has taken over
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
    var R = beadSize() / 2, sp = (R * 2.12) / (1.3 * W), b = BEADS.filter(function (q) { return q.k === ST.bead; })[0] || BEADS[0], s = sprite(b, R);
    // the string, drawn in pieces so it runs through the beads
    x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 2; x.beginPath();
    for (var i = 0; i <= 80; i++) { var p = curve(i / 80); i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.stroke();
    var base = Math.floor(shift), sz = s.width / dpr;
    for (var k = base - 14; k <= base + 14; k++) {
      var u = k - shift, t = tOf(u, sp); if (t < -0.12 || t > 1.12) continue;
      var q = curve(t); x.drawImage(s, q[0] - sz / 2, q[1] - sz / 2, sz, sz);
    }
  }
  var target = count();
  /* what tasbih3d.js reads; it listens for tb:count, tb:jump and tb:bead */
  window.TB = { target: function () { return target; }, bead: function () { return ST.bead; }, reduced: REDUCED, redraw: function () { draw(); } };
  function emit(n, d) { document.dispatchEvent(new CustomEvent('tb:' + n, { detail: d })); }
  (function loop() {
    var d = target - shift;
    if (Math.abs(d) > 0.0005) { shift += REDUCED ? d : d * 0.22 + Math.sign(d) * 0.004; if (Math.abs(target - shift) < 0.004) shift = target; draw(); }
    requestAnimationFrame(loop);
  })();

  /* ---------- counting ---------- */
  function paint() {
    var d = D(), s = step(), n = count(), goal = s.n;
    $('tbN').textContent = String(n).padStart(2, '0');
    $('tbGoal').textContent = goal ? '/ ' + goal : '';
    $('tbAr').textContent = s.ar; $('tbAr').hidden = !s.ar;
    $('tbTr').textContent = s.tr + (s.ar ? ' · ' + (bm() ? s.bm : s.en) : '');
    var steps = d.steps.length > 1 ? d.steps.map(function (q, i) { var cur = (ST.step[d.k] || 0); return '<i class="' + (i < cur ? 'done' : i === cur ? 'now' : '') + '"></i>'; }).join('') : '';
    $('tbSteps').innerHTML = steps;
    $('tbCur').textContent = name(d) + ' · ' + (bm() ? 'hari ini ' : 'today ') + ST.today;
    var fill = goal ? Math.min(1, n / goal) : 0; $('tbBar').style.width = (fill * 100) + '%';
  }
  function add(delta) {
    var d = D(), s = step(), n = count() + delta;
    if (n < 0) return;
    ST.counts[ST.d] = n; if (delta > 0) ST.today++;
    target += delta; $('tbHint').classList.add('gone');
    var done = delta > 0 && s.n && n === s.n;
    if (done) {
      tock(true); buzz([18, 50, 18]);
      var i = ST.step[d.k] || 0;
      if (i < d.steps.length - 1) { ST.step[d.k] = i + 1; ST.counts[ST.d] = 0; toast(s.tr + ' ✓ · ' + d.steps[i + 1].tr); }
      else { toast(bm() ? 'Selesai. Semoga diterima.' : 'Complete. May it be accepted.'); ST.step[d.k] = 0; ST.counts[ST.d] = 0; }
    } else { tock(false); buzz(delta > 0 ? 9 : [6, 30, 6]); }
    save(); paint(); emit('count', { delta: delta, done: !!done });
  }
  var px = 0, py = 0, moved = false, pt = 0;
  var area = $('tbArea');
  area.addEventListener('pointerdown', function (e) { px = e.clientX; py = e.clientY; moved = false; pt = Date.now(); });
  area.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - px) > 12 || Math.abs(e.clientY - py) > 12) moved = true; });
  area.addEventListener('pointerup', function (e) {
    var dx = e.clientX - px, dy = e.clientY - py;
    if (dx < -45 && Math.abs(dx) > Math.abs(dy)) { add(-1); return; }      // right-to-left swipe takes one back
    if (!moved) add(1);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('button,select,input')) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); add(1); }
    else if (e.key === 'Backspace' || e.key === 'ArrowLeft') { e.preventDefault(); add(-1); }
  });

  /* ---------- header buttons ---------- */
  // reset asks in our own dialog, not the browser's: what is being cleared, then Cancel or Reset
  var dlg = $('tbAsk');
  $('tbReset').addEventListener('click', function () {
    if (!count() && !(ST.step[ST.d])) return;
    var d = D(), s = step();
    $('tbAskT').textContent = bm() ? 'Mula semula kiraan?' : 'Reset this count?';
    $('tbAskP').textContent = (d.steps.length > 1 ? name(d) + ' · ' : '') + s.tr + ' · ' + count() + (s.n ? ' / ' + s.n : '') + ' → 0';
    $('tbAskNo').textContent = bm() ? 'Batal' : 'Cancel';
    $('tbAskYes').textContent = bm() ? 'Mula semula' : 'Reset';
    dlg.showModal();                                   // the browser puts focus on Cancel, the first button
  });
  function closeAsk() { dlg.classList.add('out'); setTimeout(function () { dlg.classList.remove('out'); dlg.close(); }, REDUCED ? 0 : 160); }
  $('tbAskNo').addEventListener('click', closeAsk);
  $('tbAskYes').addEventListener('click', function () {
    target -= count(); ST.counts[ST.d] = 0; ST.step[ST.d] = 0; save(); paint(); emit('jump'); buzz(12); closeAsk();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeAsk(); });     // a tap outside the card cancels
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeAsk(); });        // so does Esc
  // taps and keys inside the dialog must not count beads
  dlg.addEventListener('pointerup', function (e) { e.stopPropagation(); });
  dlg.addEventListener('keydown', function (e) { e.stopPropagation(); });
  function soundIcon() { var on = ST.snd !== 'none'; $('tbSound').setAttribute('aria-pressed', on); $('tbSound').classList.toggle('off', !on); }
  $('tbSound').addEventListener('click', function () {
    if (ST.snd === 'none') ST.snd = ST.lastSnd || 'stone'; else { ST.lastSnd = ST.snd; ST.snd = 'none'; }
    ST.sound = ST.snd !== 'none'; save(); soundIcon(); renderPanel(); tock(false);
  });
  soundIcon();

  /* ---------- the panel: dhikr and beads ---------- */
  function renderPanel() {
    $('tbList').innerHTML = DHIKR.map(function (d) {
      var s = d.steps[0], goal = d.steps.map(function (q) { return q.n; }).filter(Boolean).join(' · ');
      return '<button type="button" class="tb-dz' + (d.k === ST.d ? ' on' : '') + '" data-d="' + d.k + '"><b>' + esc(name(d)) + '</b>'
        + (d.k === 'after' ? '<span>SubhanAllah · Alhamdulillah · Allahu Akbar</span>' : s.ar ? '<span class="ar" lang="ar">' + esc(s.ar) + '</span>' : '<span>' + (bm() ? 'Tiada sasaran' : 'No target') + '</span>')
        + (goal ? '<em>' + goal + '</em>' : '') + '</button>';
    }).join('');
    $('tbBeads').innerHTML = BEADS.map(function (b) {
      return '<button type="button" class="tb-bd' + (b.k === ST.bead ? ' on' : '') + '" data-b="' + b.k + '" aria-label="' + esc(bm() ? b.bm : b.en) + '" style="--b0:' + b.c[0] + ';--b1:' + b.c[1] + '"><i></i><span>' + esc(bm() ? b.bm : b.en) + '</span></button>';
    }).join('');
    $('tbList').querySelectorAll('[data-d]').forEach(function (el) { el.onclick = function () {
      ST.d = el.dataset.d; shift = target = count(); save(); renderPanel(); paint(); draw(); emit('jump'); setOpen(false); }; });
    $('tbSounds').innerHTML = SOUNDS.map(function (s) { return '<button type="button" class="tb-sd' + (s.k === ST.snd ? ' on' : '') + '" data-s="' + s.k + '">' + esc(bm() ? s.bm : s.en) + '</button>'; }).join('');
    $('tbSounds').querySelectorAll('[data-s]').forEach(function (el) { el.onclick = function () { ST.snd = el.dataset.s; ST.sound = ST.snd !== 'none'; save(); soundIcon(); renderPanel(); tock(false); }; });
    $('tbBeads').querySelectorAll('[data-b]').forEach(function (el) { el.onclick = function () { ST.bead = el.dataset.b; save(); renderPanel(); draw(); emit('bead'); }; });
  }
  var panel = $('tbPanel');
  function setOpen(o) { panel.classList.toggle('open', o); $('tbHandle').setAttribute('aria-expanded', o); }
  $('tbHandle').addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });
  $('tbAll').addEventListener('click', function () { setOpen(!panel.classList.contains('open')); });

  new ResizeObserver(function () { resize(); draw(); }).observe(cv);
  resize(); renderPanel(); paint(); draw();
})();

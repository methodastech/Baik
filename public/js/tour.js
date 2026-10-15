/* Baik · first tour, like a game tutorial. The screen dims except for one control, a hand taps
   at it, and only that control can be pressed: everything around it is covered. Pressing it does
   what it always does, and the tour moves on to the next. It plays on every visit to /khayr until
   "Don't show this again" is ticked (localStorage baik.tour = 'off'); Skip ends it for this visit
   only. "Show the tour" in the More menu plays it again at any time. Loaded after khayr-app.js. */
(function () {
  'use strict';
  var KEY = 'baik.tour', $ = function (id) { return document.getElementById(id); };
  var bm = function () { return typeof LANG !== 'undefined' && LANG === 'bm'; };
  var tx = function (p) { return p ? (bm() ? p[1] : p[0]) : ''; };
  function isOff() { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } }
  function setOff(v) { try { if (v) localStorage.setItem(KEY, 'off'); else localStorage.removeItem(KEY); } catch (e) {} }
  function shown(el) { if (!el || el.hidden) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }

  /* the steps. "tap" steps wait for the control to be pressed; "look" steps end with a button */
  var STEPS = [
    { k: 'hello', look: true, btn: ['Start', 'Mula'],
      t: ['Welcome to Baik', 'Selamat datang ke Baik'],
      b: ['A short tour of the deck. Tap what is lit up, and in a minute you will know your way around.',
          'Lawatan ringkas dek ini. Ketik bahagian yang menyala, dan dalam seminit anda akan tahu selok-beloknya.'] },
    { k: 'grid', el: function () { return $('vGrid'); }, skip: function () { var g = $('vGrid'); return !shown(g) || g.classList.contains('on'); },
      t: ['See every card', 'Lihat semua kad'],
      b: ['Tap Grid to lay the whole deck out, grouped by need.', 'Ketik Grid untuk membentangkan seluruh dek, mengikut keperluan.'] },
    { k: 'search', el: function () { return $('q'); }, after: function () { var q = $('q'); if (q) q.blur(); },
      t: ['Search anything', 'Cari apa sahaja'],
      b: ['A feeling, a situation, or a word from a dua. Tap the search box.', 'Perasaan, keadaan, atau perkataan daripada doa. Ketik kotak carian.'] },
    { k: 'feel', el: function () { return firstShown('#sitRow .chip'); },
      t: ['Or start from a feeling', 'Atau mula dari perasaan'],
      b: ['Tap a feeling and the deck shows the duas for it.', 'Ketik satu perasaan dan dek akan menunjukkan doa untuknya.'] },
    { k: 'card', el: function () { return firstShown('#deck .scene .card'); },
      t: ['Turn a card over', 'Terbalikkan kad'],
      b: ['Tap the card. Its meaning, and when to read it, are on the back.', 'Ketik kad itu. Maknanya, dan bila membacanya, ada di belakang.'] },
    { k: 'more', el: function () { return $('ovfBtn'); },
      t: ['Prayer, qibla and tasbih', 'Solat, kiblat dan tasbih'],
      b: ['Tap here for prayer times, the qibla and the tasbih.', 'Ketik di sini untuk waktu solat, kiblat dan tasbih.'] },
    { k: 'menu', look: true, last: true, el: function () { return $('ovfMenu'); }, btn: ['Finish', 'Selesai'],
      t: ['All in one place', 'Semua di satu tempat'],
      b: ['Come back to this menu whenever you need them. "Show the tour" here plays this again.',
          'Kembali ke menu ini bila-bila perlu. "Tunjuk lawatan" di sini memainkannya semula.'] },
  ];
  function firstShown(sel) { var a = document.querySelectorAll(sel); for (var i = 0; i < a.length; i++) if (shown(a[i])) return a[i]; return null; }

  var root = null, cur = null, busy = false, hole, ring, hand, tip, blk = [], cap, on = false, i = -1, el = null, plan = [], raf = 0, last = '', moveT = 0, wait = 0;

  function build() {
    root = document.createElement('div');
    root.className = 'tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'tourT');
    root.innerHTML = '<svg class="tour-dim" aria-hidden="true"><path fill-rule="evenodd"/></svg><div class="tour-ring"></div>'
      + '<div class="tour-blk"></div><div class="tour-blk"></div><div class="tour-blk"></div><div class="tour-blk"></div><div class="tour-blk tour-cap"></div>'
      + '<div class="tour-hand" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 9.5V4a2 2 0 0 0-4 0v10l-1.4-1.4a2 2 0 0 0-2.83 2.82l3.6 3.6C6.86 20.5 8.6 22 12 22h2a8 8 0 0 0 8-8v-3a2 2 0 0 0-4 0v-1a2 2 0 0 0-4 0V9a2 2 0 0 0-4 0z"/></svg></div>'
      + '<div class="tour-tip" role="document"><div class="tour-n" id="tourN"></div><h3 id="tourT"></h3><p id="tourB"></p>'
      + '<div class="tour-ft"><label class="tour-off"><input type="checkbox" id="tourOff"><span id="tourOffL"></span></label>'
      + '<span class="tour-sp"></span><button type="button" class="tour-skip" id="tourSkip"></button><button type="button" class="tour-go" id="tourGo" hidden></button></div></div>';
    document.body.appendChild(root);
    hole = root.querySelector('.tour-dim path'); ring = root.querySelector('.tour-ring'); hand = root.querySelector('.tour-hand'); tip = root.querySelector('.tour-tip');
    blk = [].slice.call(root.querySelectorAll('.tour-blk:not(.tour-cap)')); cap = root.querySelector('.tour-cap');
    // a press anywhere but the lit control: the ring pulses and the card shakes, nothing else happens
    [].slice.call(root.querySelectorAll('.tour-blk')).forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); nudge(); });
    });
    // presses inside the card stay with the tour: the app would read them as "outside" and shut its menu
    tip.addEventListener('click', function (e) { e.stopPropagation(); });
    $('tourOff').addEventListener('change', function () { setOff(this.checked); });
    $('tourSkip').addEventListener('click', function () { end(); });
    $('tourGo').addEventListener('click', function () { if (STEPS[plan[i]].last) end(); else go(i + 1); });
  }
  function nudge() {
    root.classList.remove('tour-shake'); void root.offsetWidth; root.classList.add('tour-shake');
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
  }

  function start(force) {
    if (on || (!force && isOff())) return;
    on = true; busy = false; build();
    document.documentElement.classList.add('touring');
    plan = []; STEPS.forEach(function (s, n) { if (!(s.skip && s.skip())) plan.push(n); });
    $('tourOff').checked = isOff();
    $('tourOffL').textContent = bm() ? 'Jangan tunjuk lagi' : 'Don’t show this again';
    $('tourSkip').textContent = bm() ? 'Langkau' : 'Skip';
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    addEventListener('resize', mark);
    requestAnimationFrame(function () { root.classList.add('in'); });
    go(0);
    loop();
  }
  function end() {
    if (!on) return;
    on = false; cancelAnimationFrame(raf); clearTimeout(wait);
    document.documentElement.classList.remove('touring');
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKey, true);
    removeEventListener('resize', mark);
    // leave the page as it was found: the menu shut, the deck unfiltered
    var m = $('ovfMenu'); if (m && !m.hidden && $('ovfBtn')) $('ovfBtn').click();
    var q = $('q'), qx = $('qx'); if (q && q.value && qx) qx.click();
    var r = root; root = null; r.classList.remove('in'); r.classList.add('out');
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 380);
  }

  /* move to a step: find its control (waiting a moment for the app to draw it), bring it into view */
  function go(n) {
    clearTimeout(wait);
    if (n >= plan.length) { end(); return; }
    i = n; var s = STEPS[plan[i]], tries = 0;
    (function find() {
      var found = s.el ? s.el() : null;
      if (s.el && !shown(found)) {
        if (++tries < 25) { wait = setTimeout(find, 100); return; }
        if (!s.look) { go(i + 1); return; }          // it never appeared: carry on without it
        found = null;
      }
      el = found; busy = false;
      if (el && el.scrollIntoView) { var r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      $('tourN').textContent = s.k === 'hello' ? '' : (i) + ' / ' + (plan.length - 1);
      $('tourT').textContent = tx(s.t); $('tourB').textContent = tx(s.b);
      $('tourGo').hidden = !s.look; $('tourGo').textContent = tx(s.btn);
      root.classList.toggle('look', !!s.look); root.classList.toggle('noel', !el);
      root.classList.add('moving'); clearTimeout(moveT); moveT = setTimeout(function () { if (root) root.classList.remove('moving'); }, 520);
      last = ''; mark();
      tip.classList.remove('show'); void tip.offsetWidth; tip.classList.add('show');
      setTimeout(function () { var f = s.look ? $('tourGo') : el; if (f && f.focus) try { f.focus({ preventScroll: true }); } catch (e) {} }, 60);
    })();
  }

  /* the lit control was pressed: let the app do its part, then the next step */
  function onClick(e) {
    if (!on) return;
    var s = STEPS[plan[i]];
    if (busy || s.look || !el || !el.contains(e.target)) return;
    // the light stays on what was pressed until the next control is found
    var done = s; busy = true;
    setTimeout(function () { if (done.after) done.after(); go(i + 1); }, 450);
  }
  /* the keyboard keeps to the lit control and the tour's own buttons */
  function onKey(e) {
    if (!on) return;
    var s = STEPS[plan[i]], ok = [].slice.call(tip.querySelectorAll('input,button:not([hidden])'));
    if (!s.look && el) ok.unshift(el);
    if (e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation();
      var at = ok.indexOf(document.activeElement), nx = (at + (e.shiftKey ? -1 : 1) + ok.length) % ok.length;
      ok[nx].focus();
      return;
    }
    var inside = ok.some(function (o) { return o === document.activeElement || (o.contains && o.contains(document.activeElement)); });
    if (!inside) { e.preventDefault(); e.stopPropagation(); }
  }

  /* keep the light on the control as the page scrolls or redraws */
  function loop() { if (!on) return; mark(); raf = requestAnimationFrame(loop); }
  /* the dim is one shape with a rounded cut-out; between steps the cut-out glides to the next control */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return 'M' + (x + r) + ',' + y + 'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (h - 2 * r)
      + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r + 'h' + (2 * r - w) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + (-r)
      + 'v' + (2 * r - h) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) + 'z';
  }
  function mark() {
    if (!root) return;
    var W = innerWidth, H = innerHeight, r, pad = 6;
    if (el && el.isConnected) { var b = el.getBoundingClientRect(); r = { x: b.left - pad, y: b.top - pad, w: b.width + pad * 2, h: b.height + pad * 2 }; }
    else r = { x: W / 2, y: H / 2, w: 0, h: 0 };
    r.r = r.h && r.h < 56 ? r.h / 2 : 14;
    var glide = root.classList.contains('moving') && cur && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (glide) ['x', 'y', 'w', 'h', 'r'].forEach(function (k) { cur[k] += (r[k] - cur[k]) * 0.2; });
    else cur = { x: r.x, y: r.y, w: r.w, h: r.h, r: r.r };
    var c = cur, key = [c.x, c.y, c.w, c.h, W, H].map(function (v) { return v.toFixed(1); }).join(',');
    if (key === last) return; last = key;
    var set = function (n, x, y, w, h) { n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = Math.max(0, w) + 'px'; n.style.height = Math.max(0, h) + 'px'; };
    hole.setAttribute('d', 'M0,0H' + W + 'V' + H + 'H0Z' + (c.w > 0.5 ? rr(c.x, c.y, c.w, c.h, c.r) : ''));
    set(ring, c.x, c.y, c.w, c.h); ring.style.borderRadius = c.r + 'px';
    // covers over everything but the control (they use where it ends up, not the glide)
    set(blk[0], 0, 0, W, r.y); set(blk[1], 0, r.y + r.h, W, H - r.y - r.h);
    set(blk[2], 0, r.y, r.x, r.h); set(blk[3], r.x + r.w, r.y, W - r.x - r.w, r.h);
    set(cap, r.x, r.y, r.w, r.h);
    // the hand taps at the control's centre, from below and to the right
    hand.style.transform = 'translate(' + (c.x + c.w / 2 - 9) + 'px,' + (c.y + c.h / 2 - 2) + 'px)';
    // the card sits below the control if it fits, otherwise above, otherwise in the middle
    var tw = Math.min(340, W - 24), th = tip.offsetHeight || 170, tx2, ty;
    if (!r.w) { tx2 = (W - tw) / 2; ty = (H - th) / 2; }
    else {
      tx2 = Math.max(12, Math.min(W - tw - 12, r.x + r.w / 2 - tw / 2));
      if (r.y + r.h + 64 + th < H) ty = r.y + r.h + 58;
      else if (r.y - th - 18 > 0) ty = r.y - th - 18;
      else ty = Math.max(12, H - th - 12);
    }
    tip.style.width = tw + 'px'; tip.style.transform = 'translate(' + Math.round(tx2) + 'px,' + Math.round(ty) + 'px)';
  }

  window.BaikTour = { start: function () { start(true); }, reset: function () { setOff(false); } };

  // "Show the tour" in the More menu
  var tb = $('tourBtn');
  if (tb && bm()) tb.lastChild.textContent = 'Tunjuk lawatan';
  if (tb) tb.addEventListener('click', function () { var m = $('ovfMenu'); if (m && !m.hidden && $('ovfBtn')) $('ovfBtn').click(); setTimeout(function () { start(true); }, 250); });

  // begin once the page is really on screen: the sign-in check done and the opening screen gone
  if (location.pathname.replace(/\/$/, '') !== '/khayr' || isOff()) return;
  var t0 = Date.now();
  (function ready() {
    var h = document.documentElement;
    if (h.classList.contains('authwait') || h.classList.contains('bk-intro') || !document.querySelector('#deck *')) {
      if (Date.now() - t0 < 20000) setTimeout(ready, 200);
      return;
    }
    setTimeout(function () { start(false); }, 700);
  })();
})();

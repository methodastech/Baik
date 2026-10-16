/* Baik · logo loading screens (internal lab, /loaders). Five ways for the wordmark to wait:
     trace   a fine line draws every letter, the letters fill, then a bead of light keeps running
             round the edges
     sheen   the mark rises into place; a soft band of light slides across it now and then
     orbit   the letters arrive one by one; the diamond lifts off the i, circles the word, settles
     mosaic  the mark assembles from hundreds of small diamonds (the i's own dot), a glint ripples
     focus   the letters drift in apart and out of focus, close up sharp; a halo breathes behind,
             a hairline underneath says it is still loading
   window.BaikLogoLoader.mount(host, kind, { onDone }) → Promise<{ ready, replay, stop }>, the same
   shape as the card loaders, so the lab page treats all of them alike. */
(function () {
  'use strict';
  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VB = '0 0 118.13 45.82', W = 118.13, H = 45.82, NS = 'http://www.w3.org/2000/svg';

  /* the wordmark, letter by letter; counters and notches are cut with a mask per letter */
  var L = [
    { k: 'B', parts: ['M0 4.16H9.05V45.2H0Z', 'M0 4.16H21.14A11.96 11.96 0 0 1 21.14 28.08H0Z', 'M0 20.68H22.14A12.26 12.26 0 0 1 22.14 45.2H0Z'],
      cuts: ['M9.05 12.16H19.44A4.26 4.26 0 0 1 19.44 20.68H9.05Z', 'M9.05 28.08H20.44A4.56 4.56 0 0 1 20.44 37.2H9.05Z'], cx: 17 },
    { k: 'a', parts: ['M38.35 31A15.43 14.79 0 1 0 69.21 31A15.43 14.79 0 1 0 38.35 31Z', 'M60.73 16.9H69.38V45.2H60.73Z'],
      cuts: ['M46.82 31.15A6.96 6.96 0 1 0 60.74 31.15A6.96 6.96 0 1 0 46.82 31.15Z'], notches: ['M60.73 16L56.23 16L60.73 19.7Z', 'M60.73 46.3L56.23 46.3L60.73 42.5Z'], cx: 54 },
    { k: 'i', parts: ['M75.13 20.26L84.18 16.9V45.2H75.13Z'], cuts: [], cx: 79.7 },
    { k: 'k', parts: ['M89.4 7.69L98.33 4.16V28.6L99.53 29.7V33L98.33 33.7V45.2H89.4Z', 'M98.33 28.46L107.15 16.9H118.13L106.3 30.6L117.97 45.2H108.02L98.33 33.85Z'], cuts: [], cx: 104 },
  ];
  var DOT = 'M79.66 0L85.96 6.3L79.66 12.6L73.36 6.3Z', HOME = { x: 79.66, y: 6.3 };
  var uid = 0;
  function markMask(id, inv) {          // the mark as a mask: white letters, counters cut (inv: the reverse)
    var on = inv ? '#000' : '#fff', off = inv ? '#fff' : '#000';
    return '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="160" height="90"><rect x="-20" y="-20" width="160" height="90" fill="' + off + '"/><g fill="' + on + '">'
      + L.map(function (l) { return l.parts.map(function (d) { return '<path d="' + d + '"/>'; }).join(''); }).join('') + '<path d="' + DOT + '"/></g><g fill="' + off + '">'
      + L.map(function (l) { return (l.cuts || []).concat(l.notches || []).map(function (d) { return '<path d="' + d + '"/>'; }).join(''); }).join('') + '</g></mask>';
  }
  function letterSVG(l, id) {
    var cut = (l.cuts || []).concat(l.notches || []);
    var mask = cut.length ? '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="-20" y="-20" width="160" height="90"><rect x="-20" y="-20" width="160" height="90" fill="#fff"/><g fill="#000">'
      + cut.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g></mask>' : '';
    return mask + '<g' + (cut.length ? ' mask="url(#' + id + ')"' : '') + '>' + l.parts.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</g>';
  }
  /* the solid mark, each letter in its own group so it can move without its counters slipping */
  function solid(u, cls) {
    return L.map(function (l, i) { return '<g class="' + (cls || 'll-l') + '" style="--i:' + i + ';--dx:' + (l.cx - 59).toFixed(1) + '">' + letterSVG(l, 'm' + u + l.k) + '</g>'; }).join('')
      + '<g class="ll-dot"><path d="' + DOT + '"/></g>';
  }

  var CSS = [
    '.ll{position:absolute;inset:0;overflow:hidden;opacity:0;transition:opacity .6s ease;}',
    '.ll.in{opacity:1;} .ll.out{opacity:0;transition:opacity .65s ease .15s;}',
    '.ll-mark{position:absolute;left:50%;top:50%;width:clamp(130px,44%,250px);transform:translate(-50%,-50%);color:#1E2124;transition:transform .8s cubic-bezier(.4,0,.2,1);}',
    '.ll.out .ll-mark{transform:translate(-50%,-50%) scale(1.05);}',
    '.ll-mark svg{display:block;width:100%;height:auto;overflow:visible;}',
    // trace
    '.ll-trace .ll-fill{opacity:0;animation:llFade .9s ease forwards 1.7s;}',
    '.ll-trace .ll-tr{stroke-dasharray:1 1;stroke-dashoffset:1;animation:llDraw 1.5s cubic-bezier(.65,0,.35,1) forwards;animation-delay:calc(var(--i) * .12s);}',
    '.ll-trace .ll-lines{animation:llFadeOut .8s ease forwards 2.5s;}',
    '.ll-trace .ll-run{stroke:#C9A227;stroke-dasharray:.06 .94;stroke-dashoffset:0;opacity:0;animation:llRun 3.6s linear infinite 2.8s,llFade .6s ease forwards 2.8s;}',
    '@keyframes llDraw{to{stroke-dashoffset:0;}}',
    '@keyframes llRun{to{stroke-dashoffset:-1;}}',
    '@keyframes llFade{to{opacity:1;}} @keyframes llFadeOut{to{opacity:0;}}',
    // sheen
    '.ll-sheen .ll-mark svg{opacity:0;transform:translateY(8px);animation:llRise 1.2s cubic-bezier(.16,1,.3,1) forwards .2s;}',
    '.ll-sheen .ll-band{animation:llBand 3.4s cubic-bezier(.45,0,.25,1) infinite 1.3s;transform:translateX(-50px);}',
    '.ll-floor{position:absolute;left:50%;top:calc(50% + clamp(34px,8%,58px));width:clamp(110px,36%,210px);height:14px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(30,33,36,.16),rgba(30,33,36,0));filter:blur(4px);opacity:0;animation:llFade 1.2s ease forwards .5s;}',
    '@keyframes llRise{to{opacity:1;transform:none;}}',
    '@keyframes llBand{0%{transform:translateX(-50px);}62%,100%{transform:translateX(175px);}}',
    // orbit
    '.ll-orbit .ll-l{opacity:0;transform:translateY(5px);animation:llRise .9s cubic-bezier(.16,1,.3,1) forwards;animation-delay:calc(.15s + var(--i) * .13s);}',
    '.ll-orbit .ll-ring{opacity:0;animation:llFade 1s ease forwards 1s;}',
    // focus
    '.ll-focus .ll-mark svg{filter:blur(10px);opacity:0;animation:llSharp 1.6s cubic-bezier(.16,1,.3,1) forwards .15s;}',
    '.ll-focus .ll-l,.ll-focus .ll-dot{transform:translateX(calc(var(--dx, 0) * .35px));animation:llClose 1.7s cubic-bezier(.16,1,.3,1) forwards .15s;}',
    '.ll-halo{position:absolute;left:50%;top:50%;width:clamp(220px,70%,460px);aspect-ratio:1;transform:translate(-50%,-50%) scale(.9);border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.95),rgba(255,255,255,0));opacity:0;animation:llFade 1.4s ease forwards .3s,llBreathe 4.2s ease-in-out infinite 1.6s;}',
    '.ll-hair{position:absolute;left:50%;top:calc(50% + clamp(36px,8.5%,62px));width:64px;height:1.5px;transform:translateX(-50%);background:rgba(30,33,36,.1);border-radius:1px;overflow:hidden;opacity:0;animation:llFade .8s ease forwards 1.4s;}',
    '.ll-hair i{position:absolute;inset:0;width:35%;background:#1E2124;opacity:.55;border-radius:1px;animation:llHair 1.8s cubic-bezier(.65,0,.35,1) infinite 1.4s;transform:translateX(-100%);}',
    '.ll.out .ll-hair i{animation:none;width:100%;transform:none;transition:width .4s ease;}',
    '@keyframes llSharp{to{filter:blur(0);opacity:1;}}',
    '@keyframes llClose{to{transform:none;}}',
    '@keyframes llBreathe{0%,100%{transform:translate(-50%,-50%) scale(.9);}50%{transform:translate(-50%,-50%) scale(1.04);}}',
    '@keyframes llHair{to{transform:translateX(290%);}}',
    // mosaic
    '.ll canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '@media(prefers-reduced-motion:reduce){.ll *{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important;}}',
  ].join('\n');
  function ensureCSS() { if (document.getElementById('ll-css')) return; var s = document.createElement('style'); s.id = 'll-css'; s.textContent = CSS; document.head.appendChild(s); }

  function shell(host, cls, inner) {
    ensureCSS();
    var w = document.createElement('div'); w.className = 'll cl-cv ' + cls; w.innerHTML = inner; host.appendChild(w);
    requestAnimationFrame(function () { requestAnimationFrame(function () { w.classList.add('in'); }); });
    return w;
  }
  function exitWith(w, opts, ms) { w.classList.add('out'); setTimeout(function () { if (opts.onDone) opts.onDone(); }, ms || 750); }

  /* ---------- 1. trace ---------- */
  function trace(host, opts) {
    var u = ++uid, paths = [];
    L.forEach(function (l, i) { l.parts.concat(l.cuts || []).forEach(function (d) { paths.push([d, i]); }); });
    paths.push([DOT, 4]);
    var solidMask = markMask('o' + u, true);
    var strokes = function (cls, extra) { return paths.map(function (p) { return '<path class="' + cls + '" pathLength="1" style="--i:' + p[1] + '" d="' + p[0] + '"' + (extra || '') + '/>'; }).join(''); };
    var w = shell(host, 'll-trace', '<div class="ll-mark"><svg viewBox="' + VB + '" aria-hidden="true"><defs>' + solidMask + '</defs>'
      + '<g class="ll-fill" fill="currentColor">' + solid(u) + '</g>'
      + '<g class="ll-lines" mask="url(#o' + u + ')" fill="none" stroke="currentColor" stroke-width=".9">' + strokes('ll-tr') + '</g>'
      + '<g mask="url(#o' + u + ')" fill="none" stroke-width="1.3" stroke-linecap="round">' + strokes('ll-run') + '</g>'
      + '</svg></div>');
    return { ready: function () { exitWith(w, opts); }, stop: function () { w.remove(); } };
  }

  /* ---------- 2. sheen ---------- */
  function sheen(host, opts) {
    var u = ++uid;
    var w = shell(host, 'll-sheen', '<div class="ll-floor"></div><div class="ll-mark"><svg viewBox="' + VB + '" aria-hidden="true"><defs>'
      + '<linearGradient id="g' + u + '" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".62"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
      + markMask('s' + u) + '</defs>'
      + '<g fill="currentColor">' + solid(u) + '</g>'
      + '<g mask="url(#s' + u + ')"><g transform="skewX(-20)"><rect class="ll-band" x="-30" y="-10" width="26" height="70" fill="url(#g' + u + ')"/></g></g>'
      + '</svg></div>');
    return { ready: function () { exitWith(w, opts); }, stop: function () { w.remove(); } };
  }

  /* ---------- 3. orbit ---------- */
  function orbit(host, opts) {
    var u = ++uid;
    var w = shell(host, 'll-orbit', '<div class="ll-mark"><svg viewBox="' + VB + '" aria-hidden="true">'
      + '<ellipse class="ll-ring" cx="59" cy="24" rx="74" ry="31" fill="none" stroke="currentColor" stroke-opacity=".12" stroke-width=".5" stroke-dasharray="1.2 2.2"/>'
      + '<g fill="currentColor">' + solid(u).replace('<g class="ll-dot">', '<g class="ll-dot" style="display:none">') + '</g>'
      + '<g class="ll-ghosts" fill="currentColor"></g>'
      + '<g class="ll-sat" fill="currentColor"><path d="M0 -6.3L6.3 0L0 6.3L-6.3 0Z"/></g>'
      + '</svg></div>');
    var sat = w.querySelector('.ll-sat'), ghosts = w.querySelector('.ll-ghosts'), raf = 0, t0 = performance.now(), leaving = null, trail = [];
    var ease = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
    var A0 = -Math.PI * 0.32, CX = 59, CY = 24, RX = 74, RY = 31;
    var onRing = function (a) { return { x: CX + Math.cos(a) * RX, y: CY + Math.sin(a) * RY }; };
    var entry = onRing(A0);
    for (var g = 0; g < 7; g++) ghosts.insertAdjacentHTML('beforeend', '<path d="M0 -6.3L6.3 0L0 6.3L-6.3 0Z" opacity="0"/>');
    function at(t) {                                  // where the diamond is, t seconds into the loop
      var CYC = 4.6, q = REDUCED ? 0 : ((t - 1.1) % CYC + CYC) % CYC / CYC;
      if (t < 1.1 || q > 0.86) return { x: HOME.x, y: HOME.y, r: 0, s: t < 1.1 ? Math.min(1, Math.max(0, (t - .55) / .5)) : 1 };
      if (q < 0.12) { var k = ease(q / 0.12); return { x: HOME.x + (entry.x - HOME.x) * k, y: HOME.y + (entry.y - HOME.y) * k - Math.sin(Math.PI * k) * 4, r: k * 45, s: 1 - k * .2 }; }
      if (q < 0.74) { var m = ease((q - 0.12) / 0.62), p = onRing(A0 + m * Math.PI * 2); return { x: p.x, y: p.y, r: 45 + m * 360, s: .8 + .1 * Math.sin(m * Math.PI) }; }
      var b = ease((q - 0.74) / 0.12); return { x: entry.x + (HOME.x - entry.x) * b, y: entry.y + (HOME.y - entry.y) * b - Math.sin(Math.PI * b) * 4, r: 405 - b * 45, s: .8 + b * .2 };
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var t = (now - t0) / 1000, p = at(t);
      if (leaving) { var k = Math.min(1, (now - leaving) / 500); p = { x: HOME.x, y: HOME.y, r: 0, s: 1 + Math.sin(Math.PI * k) * .25 }; }
      sat.setAttribute('transform', 'translate(' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ') rotate(' + p.r.toFixed(1) + ') scale(' + p.s.toFixed(3) + ')');
      trail.unshift(p); if (trail.length > 28) trail.pop();
      [].forEach.call(ghosts.children, function (gh, i) {
        var q = trail[(i + 1) * 4]; if (!q) return;
        var moving = Math.hypot(q.x - HOME.x, q.y - HOME.y) > 1;
        gh.setAttribute('transform', 'translate(' + q.x.toFixed(2) + ' ' + q.y.toFixed(2) + ') rotate(' + q.r.toFixed(1) + ') scale(' + (q.s * (1 - i * .1)).toFixed(3) + ')');
        gh.setAttribute('opacity', moving ? (.16 - i * .02).toFixed(3) : '0');
      });
    }
    raf = requestAnimationFrame(frame);
    return { ready: function () { leaving = performance.now(); setTimeout(function () { exitWith(w, opts, 650); }, 380); }, stop: function () { cancelAnimationFrame(raf); w.remove(); } };
  }

  /* ---------- 4. mosaic ---------- */
  function mosaic(host, opts) {
    var w = shell(host, 'll-mosaic', '<canvas></canvas>'), cv = w.querySelector('canvas'), x = cv.getContext('2d');
    // the mark rasterised once, then sampled into small diamonds
    var S = 5, off = document.createElement('canvas'); off.width = Math.ceil(W * S); off.height = Math.ceil(H * S);
    var o = off.getContext('2d'); o.scale(S, S); o.fillStyle = '#000';
    L.forEach(function (l) { l.parts.forEach(function (d) { o.fill(new Path2D(d)); }); }); o.fill(new Path2D(DOT));
    o.globalCompositeOperation = 'destination-out';
    L.forEach(function (l) { (l.cuts || []).concat(l.notches || []).forEach(function (d) { o.fill(new Path2D(d)); }); });
    var px = o.getImageData(0, 0, off.width, off.height).data, STEP = 1.32, tiles = [];
    for (var yy = STEP / 2; yy < H; yy += STEP) for (var xx = STEP / 2; xx < W; xx += STEP) {
      if (px[(Math.floor(yy * S) * off.width + Math.floor(xx * S)) * 4 + 3] > 120) {
        var a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 70;
        tiles.push({ x: xx, y: yy, sx: 59 + Math.cos(a) * r * 1.4, sy: 23 + Math.sin(a) * r * .6, d: xx / W * .9 + Math.random() * .3, sp: Math.random() });
      }
    }
    var raf = 0, t0 = performance.now(), leaving = null;
    var ease = function (k) { return 1 - Math.pow(1 - k, 3); };
    function frame(now) {
      raf = requestAnimationFrame(frame);
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!r.width) return;
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      var sc = Math.min(r.width * .46, 290) / W * dpr, ox = cv.width / 2 - W * sc / 2, oy = cv.height / 2 - H * sc / 2;
      var t = REDUCED ? 9 : (now - t0) / 1000, L2 = leaving ? (now - leaving) / 1000 : 0;
      x.clearRect(0, 0, cv.width, cv.height);
      var half = STEP * .36 * sc;
      for (var i = 0; i < tiles.length; i++) {
        var ti = tiles[i], k = ease(Math.min(1, Math.max(0, (t - ti.d) / 1.15)));
        var X = ti.sx + (ti.x - ti.sx) * k, Y = ti.sy + (ti.y - ti.sy) * k, al = k;
        if (leaving) { var lk = Math.min(1, Math.max(0, (L2 - ti.x / W * .35) / .7)); Y -= lk * lk * 14; al *= 1 - lk; }
        if (al <= 0.01) continue;
        // a glint that runs across the settled mark every few seconds
        var g = k >= 1 ? Math.pow(Math.max(0, Math.sin(ti.x * .05 - (t - 2.2) * 1.4)), 14) : 0;
        var s = half * (k < 1 ? .7 + .3 * k : 1 + g * .25);
        x.globalAlpha = al;
        x.fillStyle = g > .02 ? 'rgb(' + Math.round(30 + 171 * g) + ',' + Math.round(33 + 129 * g) + ',' + Math.round(36 + 3 * g) + ')' : '#1E2124';
        var cx = ox + X * sc, cy = oy + Y * sc;
        x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); x.fill();
      }
      x.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
    return { ready: function () { leaving = performance.now(); setTimeout(function () { exitWith(w, opts, 600); }, 600); }, stop: function () { cancelAnimationFrame(raf); w.remove(); } };
  }

  /* ---------- 5. focus ---------- */
  function focus(host, opts) {
    var u = ++uid;
    var w = shell(host, 'll-focus', '<div class="ll-halo"></div><div class="ll-mark"><svg viewBox="' + VB + '" aria-hidden="true"><g fill="currentColor">'
      + solid(u).replace('<g class="ll-dot">', '<g class="ll-dot" style="--dx:20.7">') + '</g></svg></div><div class="ll-hair"><i></i></div>');
    return { ready: function () { exitWith(w, opts, 900); }, stop: function () { w.remove(); } };
  }

  var K = { trace: trace, sheen: sheen, orbit: orbit, mosaic: mosaic, focus: focus };
  window.BaikLogoLoader = {
    kinds: Object.keys(K),
    mount: function (host, kind, opts) {
      opts = opts || {};
      var cur = K[kind](host, opts);
      return Promise.resolve({
        ready: function () { cur.ready(); },
        replay: function () { cur.stop(); cur = K[kind](host, opts); },
        stop: function () { cur.stop(); },
      });
    },
  };
})();

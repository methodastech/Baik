/* Baik particle scenes · shared by animation-demo.html and Site.html.
   Shapes are dotted 3D edges; each scene gathers from scattered particles, then keeps moving.
   Colours come from CSS on the canvas: --dot, --glow, --label.
   API: BaikParticles.mount(canvas, sceneId, opts) -> viewer; .SCENES, .HERO, .Viewer,
        .setDensity(n), .refreshTheme(). Reduced motion shows the finished shape, still. */
(function () {
'use strict';
const TAU = Math.PI * 2;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const easeOut = x => 1 - (1 - x) ** 3;
const easeIO = x => x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
function rng(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// Dot styles: d = spacing along an edge (world units), s = dot size, a = alpha
const ST = {
  hi: { d: .016, s: 1.75, a: 1 },
  md: { d: .021, s: 1.45, a: .82 },
  lo: { d: .029, s: 1.1, a: .55 },
  fa: { d: .044, s: .9, a: .3 },
  tx: { d: .015, s: .95, a: .45 },
};
let DENSITY = 1;

/* ---------- builder: turns edges into dots ---------- */
class Builder {
  constructor(sc, out, g, k, labels) { this.sc = sc; this.out = out; this.g = g; this.k = k; this.labels = labels; }
  pt(x, y, z, st, am = 1) { this.out.push(x, y, z, st.s, st.a * am, this.g); }
  poly(P, st, closed = false, am = 1) {
    const d = st.d * DENSITY / this.k, n = P.length, segs = closed ? n : n - 1;
    let carry = 0;
    for (let i = 0; i < segs; i++) {
      const a = P[i], b = P[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
      if (!L) continue;
      let s = carry;
      while (s <= L) { const f = s / L; this.pt(a[0] + dx * f, a[1] + dy * f, a[2] + dz * f, st, am); s += d; }
      carry = s - L;
    }
    if (!closed && d - carry > d * .4) { const b = P[n - 1]; this.pt(b[0], b[1], b[2], st, am); }
  }
  line(a, b, st, am) { this.poly([a, b], st, false, am); }
  dash(a, b, st, on = .08, off = .06, am = 1) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), dir = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L];
    for (let s = 0; s < L; s += on + off) this.line(add(a, dir, s), add(a, dir, Math.min(L, s + on)), st, am);
  }
  circle(c, r, st, axis = 'y', am = 1, a0 = 0, a1 = TAU) {
    const full = a1 - a0 >= TAU - 1e-6, n = Math.max(20, Math.ceil(72 * (a1 - a0) / TAU)), P = [];
    for (let i = 0; i < (full ? n : n + 1); i++) {
      const t = a0 + (a1 - a0) * i / n, co = Math.cos(t) * r, si = Math.sin(t) * r;
      P.push(axis === 'y' ? [c[0] + co, c[1], c[2] + si] : axis === 'z' ? [c[0] + co, c[1] + si, c[2]] : [c[0], c[1] + si, c[2] + co]);
    }
    this.poly(P, st, full, am);
  }
  circleN(c, r, n, st, am = 1) {
    n = norm(n); const u = norm(cross(n, Math.abs(n[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), v = cross(n, u), P = [];
    for (let i = 0; i < 40; i++) { const t = i / 40 * TAU; P.push(add(add(c, u, Math.cos(t) * r), v, Math.sin(t) * r)); }
    this.poly(P, st, true, am);
  }
  rectY(cx, y, cz, w, d, st, am) { this.poly([[cx - w / 2, y, cz - d / 2], [cx + w / 2, y, cz - d / 2], [cx + w / 2, y, cz + d / 2], [cx - w / 2, y, cz + d / 2]], st, true, am); }
  box(c, sz, st, am) {
    const [w, h, d] = sz.map(v => v / 2), V = [];
    for (const [x, y, z] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) V.push([c[0] + x * w, c[1] + y * h, c[2] + z * d]);
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) this.line(V[a], V[b], st, am);
  }
  ngon(n, y, r, rot = 0) { return Array.from({ length: n }, (_, i) => [Math.cos(rot + i / n * TAU) * r, y, Math.sin(rot + i / n * TAU) * r]); }
  disc(c, r, sp, st, am = 1) {
    sp = sp * DENSITY / this.k; let row = 0;
    for (let z = -r; z <= r; z += sp, row++) for (let x = -r + (row % 2) * sp / 2; x <= r; x += sp) if (x * x + z * z <= r * r) this.pt(c[0] + x, c[1], c[2] + z, st, am);
  }
  crescent(c, r, st, am) {
    this.circle(c, r, st, 'z', am, Math.PI / 2 + .9, Math.PI / 2 + TAU - .9);
    this.circle([c[0], c[1] + .38 * r, c[2]], .8 * r, st, 'z', am, 2.84, 6.58);
  }
  text(p, str, o = {}) { this.labels.push({ g: this.g, p, str, o }); }
  group(tf, warp, fn) {
    const gi = this.sc.groups.length;
    this.sc.groups.push({ s: tf.s || 1, ry: tf.ry || 0, t: tf.t || [0, 0, 0], warp: warp || null, parent: this.g });
    fn(new Builder(this.sc, this.out, gi, this.k * (tf.s || 1), this.labels));
  }
  dyn(fn) { this.sc.dyns.push({ fn, g: this.g, k: this.k }); }
}

// pointed (ogive) arch outline in 2D: [u, v] pairs
function ogive(u0, hw, base, col, h, n = 24) {
  const P = [[u0 - hw, base], [u0 - hw, base + col]];
  for (let i = 0; i <= n; i++) { const s = -1 + 2 * i / n; P.push([u0 + hw * s, base + col + h * (1 - Math.abs(s)) ** .55]); }
  P.push([u0 + hw, base]);
  return P;
}
function catmull(P, per = 6) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      out.push(p1.map((_, k) => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}

/* ---------- scenes ---------- */
function platform(b, r) {
  b.circle([0, 0, 0], r, ST.lo); b.circle([0, 0, 0], r * .93, ST.fa); b.circle([0, -.08, 0], r, ST.fa);
  for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; b.line([Math.cos(a) * r, -.08, Math.sin(a) * r], [Math.cos(a) * r, 0, Math.sin(a) * r], ST.fa); }
  b.disc([0, 0, 0], r * .9, .13, ST.fa, .5);
}

function kaaba(b, o = {}) {
  if (!o.mini) { platform(b, 2.15); b.circle([0, 0, 0], 1.3, ST.fa); b.circle([0, 0, 0], 1.65, ST.fa); }
  const w = 1, d = .86, h = 1.12;
  b.box([0, h / 2, 0], [w, h, d], ST.hi);
  for (const y of [.8, .92]) b.rectY(0, y, 0, w + .01, d + .01, ST.md);
  b.rectY(0, .86, 0, w + .01, d + .01, ST.tx);
  const zf = d / 2 + .006;
  b.poly([[.12, .22, zf], [.36, .22, zf], [.36, .64, zf], [.12, .64, zf]], ST.hi, true);
  b.poly([[.16, .26, zf], [.32, .26, zf], [.32, .6, zf], [.16, .6, zf]], ST.lo, true);
  const hij = y => { const P = []; for (let i = 0; i <= 30; i++) { const t = Math.PI / 2 + i / 30 * Math.PI; P.push([-w / 2 + Math.cos(t) * .62, y, Math.sin(t) * .38]); } return P; };
  b.poly(hij(0), ST.md); b.poly(hij(.15), ST.md);
  for (let i = 0; i <= 6; i++) { const t = Math.PI / 2 + i / 6 * Math.PI, x = -w / 2 + Math.cos(t) * .62, z = Math.sin(t) * .38; b.line([x, 0, z], [x, .15, z], ST.lo); }
  b.box([.3, .11, .95], [.12, .22, .12], ST.md); b.circle([.3, .25, .95], .05, ST.lo);
  const R = rng(11), N = o.mini ? 110 : 280, W = Array.from({ length: N }, () => ({ r: 1.18 + R() ** .7 * .78, p: R() * TAU, a: .5 + R() * .5, v: .85 + R() * .3 }));
  const WALK = { d: 1, s: 1.7, a: 1 };
  b.dyn((t, e) => {
    for (const k of W) {
      const th = k.p + t * .55 * k.v / k.r, x = k.r * Math.cos(th), z = -k.r * Math.sin(th);
      e.pt(x, .03, z, WALK, k.a); e.pt(x, .085, z, WALK, k.a * .55);
    }
  });
}

function minaretSmall(b, x, z) {
  const r = .08;
  for (const y of [0, .7]) b.circle([x, y, z], r, ST.md);
  b.circle([x, 1.3, z], r * 1.8, ST.md); b.circle([x, 1.36, z], r * 1.8, ST.lo); b.circle([x, 1.62, z], r * .85, ST.md);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + .4, cx = Math.cos(a), sz = Math.sin(a);
    b.line([x + cx * r, 0, z + sz * r], [x + cx * r, 1.3, z + sz * r], ST.md);
    b.line([x + cx * r * .85, 1.36, z + sz * r * .85], [x + cx * r * .85, 1.62, z + sz * r * .85], ST.lo);
    b.line([x + cx * r * .85, 1.62, z + sz * r * .85], [x, 1.95, z], ST.md);
  }
  b.crescent([x, 2.03, z], .045, ST.hi);
}

function mosque(b, o = {}) {
  if (!o.mini) platform(b, 2.05);
  const W = 1.5, H = .62;
  b.box([0, H / 2, 0], [W, H, W], ST.hi);
  b.rectY(0, H - .08, 0, W, W, ST.lo);
  for (const face of [0, 1, 2, 3]) for (let i = -1; i <= 1; i++) {
    const hw = i === 0 ? .15 : .11, P = ogive(i * .44, hw, 0, i === 0 ? .2 : .16, i === 0 ? .2 : .15), e = W / 2 + .006;
    b.poly(P.map(([u, v]) => face === 0 ? [u, v, e] : face === 1 ? [e, v, -u] : face === 2 ? [-u, v, -e] : [-e, v, u]), i === 0 ? ST.hi : ST.md);
  }
  const R0 = .46, y0 = H + .16;
  b.circle([0, H, 0], R0, ST.md); b.circle([0, y0, 0], R0, ST.md);
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; b.line([R0 * Math.cos(a), H, R0 * Math.sin(a)], [R0 * Math.cos(a), y0, R0 * Math.sin(a)], ST.fa); }
  const prof = catmull([[.46, 0], [.53, .12], [.54, .24], [.47, .4], [.33, .54], [.17, .66], [.05, .75], [0, .79]], 5);
  for (let k = 0; k < 24; k++) { const a = k / 24 * TAU; b.poly(prof.map(([r, y]) => [r * Math.cos(a), y0 + y, r * Math.sin(a)]), k % 2 ? ST.lo : ST.md); }
  for (const i of [3, 6, 9, 12, 15, 18, 21, 24, 27, 30]) b.circle([0, y0 + prof[i][1], 0], prof[i][0], ST.md);
  b.line([0, y0 + .79, 0], [0, y0 + .98, 0], ST.hi); b.crescent([0, y0 + 1.06, 0], .07, ST.hi);
  for (const [x, z] of [[.95, .95], [-.95, .95], [.95, -.95], [-.95, -.95]]) minaretSmall(b, x, z);
}

function adhan(b) {
  platform(b, 2.3);
  b.box([0, .25, 0], [.62, .5, .62], ST.hi);
  b.poly(ogive(0, .1, 0, .2, .12).map(([u, v]) => [u, v, .316]), ST.md);
  const oct = (y, r) => b.ngon(8, y, r, Math.PI / 8);
  const ring = (y, r, st) => b.poly(oct(y, r), st, true);
  const vert = (y0, y1, r, st) => { const A = oct(y0, r), B = oct(y1, r); A.forEach((p, i) => b.line(p, B[i], st)); };
  ring(.5, .24, ST.hi); ring(1.05, .24, ST.md); ring(1.44, .28, ST.lo); vert(.5, 1.44, .24, ST.md);
  ring(1.5, .38, ST.hi); ring(1.62, .38, ST.lo); vert(1.5, 1.62, .38, ST.lo);
  ring(1.62, .18, ST.md); vert(1.62, 2.2, .18, ST.md); ring(2.2, .28, ST.md); ring(2.28, .28, ST.lo); vert(2.2, 2.28, .28, ST.lo);
  ring(2.32, .2, ST.md); b.circle([0, 2.42, 0], .16, ST.lo);
  oct(2.32, .2).forEach(p => b.line(p, [0, 2.8, 0], ST.md));
  b.line([0, 2.8, 0], [0, 2.96, 0], ST.hi); b.crescent([0, 3.03, 0], .055, ST.hi);
  b.dyn((t, e) => {
    for (let k = 0; k < 4; k++) {
      const f = (t * .26 + k / 4) % 1, r = .45 + f * 1.9, al = (1 - f) ** 1.4;
      for (const [lat, am, dm] of [[0, 1, 1], [.28, .45, 1.8], [-.28, .45, 1.8]]) e.circle([0, 1.56 + Math.sin(lat) * r, 0], Math.cos(lat) * r, { d: (.05 + f * .05) * dm, s: 1.4, a: .95 * al * am });
    }
  });
}

function prayers(b, o = {}) {
  const R = 1.6;
  b.circle([0, 0, 0], 1.9, ST.lo); b.disc([0, 0, 0], 1.75, .13, ST.fa, .5);
  b.line([-2.05, 0, 0], [2.05, 0, 0], ST.md);
  const arc = (a0, a1, st) => { const P = []; for (let i = 0; i <= 60; i++) { const a = (a0 + (a1 - a0) * i / 60) * Math.PI / 180; P.push([-Math.cos(a) * R, Math.sin(a) * R, 0]); } b.poly(P, st); };
  arc(0, 180, ST.lo); arc(-22, 0, ST.fa); arc(180, 202, ST.fa);
  b.box([0, .1, 0], [.42, .2, .42], ST.md);
  const prof = catmull([[.17, 0], [.18, .08], [.12, .17], [0, .22]], 4);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; b.poly(prof.map(([r, y]) => [r * Math.cos(a), .2 + y, r * Math.sin(a)]), ST.lo); }
  const M = [['Subuh', -12], ['Zohor', 96], ['Asar', 138], ['Maghrib', 181], ['Isyak', 197]].map(([n, a]) => ({ n, a, p: [-Math.cos(a * Math.PI / 180) * R, Math.sin(a * Math.PI / 180) * R, 0] }));
  for (const m of M) {
    b.circle(m.p, .09, ST.hi, 'z'); b.line([m.p[0], 0, 0], m.p, ST.fa);
    if (!o.mini) b.text([m.p[0], m.p[1] + .26, 0], m.n);
  }
  b.dyn((t, e) => {
    const deg = -24 + (t * 11) % 250, a = deg * Math.PI / 180, p = [-Math.cos(a) * R, Math.sin(a) * R, 0];
    const lit = deg < -4 || deg > 184 ? .35 : 1;
    e.circle(p, .15, { d: .025, s: 1.9, a: lit }, 'z'); e.circle(p, .08, { d: .025, s: 1.6, a: lit * .7 }, 'z');
    for (let i = 0; i < 10; i++) { const r = i / 10 * TAU + t * .4; e.line([p[0] + Math.cos(r) * .21, p[1] + Math.sin(r) * .21, 0], [p[0] + Math.cos(r) * .31, p[1] + Math.sin(r) * .31, 0], { d: .03, s: 1.3, a: lit * .8 }); }
    for (const m of M) {
      const dd = deg - m.a;
      if (dd >= 0 && dd < 14) { const f = dd / 14; e.circle(m.p, .1 + f * .3, { d: .03, s: 1.4, a: 1 - f }, 'z'); }
    }
  });
}

function qibla(b, o = {}) {
  const R = 1.3, dir = a => [Math.sin(a), 0, -Math.cos(a)];
  b.circle([0, 0, 0], R, ST.hi); b.circle([0, 0, 0], R - .12, ST.md); b.circle([0, 0, 0], .45, ST.lo); b.circle([0, -.1, 0], R, ST.lo);
  for (let i = 0; i < 12; i++) { const d = dir(i / 12 * TAU); b.line([d[0] * R, -.1, d[2] * R], [d[0] * R, 0, d[2] * R], ST.fa); }
  for (let i = 0; i < 72; i++) {
    const d = dir(i / 72 * TAU), maj = i % 6 === 0;
    b.line([d[0] * (R - .12), 0, d[2] * (R - .12)], [d[0] * (R - (maj ? .01 : .06)), 0, d[2] * (R - (maj ? .01 : .06))], maj ? ST.md : ST.fa);
  }
  if (!o.mini) ['N', 'E', 'S', 'W'].forEach((l, i) => { const d = dir(i * Math.PI / 2); b.text([d[0] * (R + .22), 0, d[2] * (R + .22)], l); });
  const phi = 292.5 * Math.PI / 180, q = dir(phi), kp = [q[0] * (R + .5), .12, q[2] * (R + .5)];
  b.box(kp, [.22, .24, .2], ST.hi); b.rectY(kp[0], .19, kp[2], .225, .205, ST.md);
  b.dash([q[0] * .5, .01, q[2] * .5], [q[0] * (R + .3), .01, q[2] * (R + .3)], ST.lo);
  if (!o.mini) b.text([kp[0], .5, kp[2]], 'Qibla 292.5°');
  b.dyn((t, e) => {
    const tau = t % 7, a = phi + 1.5 * Math.exp(-tau * .7) * Math.cos(tau * 3.4), d = dir(a), n = [Math.cos(a), 0, Math.sin(a)], y = .07;
    const tip = [d[0] * 1.02, y, d[2] * 1.02], tail = [-d[0] * .55, y, -d[2] * .55], s1 = [n[0] * .09, y, n[2] * .09], s2 = [-n[0] * .09, y, -n[2] * .09];
    e.poly([tip, s1, s2], ST.hi, true); e.poly([s1, tail, s2], ST.lo, true); e.line(tip, [0, y, 0], ST.md);
    e.circle([0, y, 0], .06, ST.hi);
  });
}

function sajadah(b, o = {}) {
  const W = .62, L = 1.05;
  b.group({}, (v, t) => { v[1] += .035 * Math.sin(v[2] * 3.2 - t * 1.6) * (.4 + .6 * (v[2] + L) / (2 * L)); }, g => {
    g.rectY(0, 0, 0, 2 * W, 2 * L, ST.hi); g.rectY(0, 0, 0, 2 * W - .14, 2 * L - .14, ST.md); g.rectY(0, 0, 0, 2 * W - .26, 2 * L - .26, ST.lo);
    g.poly(ogive(0, .36, 0, 1.0, .5).map(([u, v]) => [u, 0, .75 - v]), ST.hi);
    g.poly(ogive(0, .28, .08, .86, .4).map(([u, v]) => [u, 0, .75 - v]), ST.lo);
    g.line([0, 0, -.63], [0, 0, -.5], ST.lo); g.poly([[0, 0, -.5], [.05, 0, -.44], [0, 0, -.38], [-.05, 0, -.44]], ST.md, true);
    for (let i = -2; i <= 2; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2 === 0) { const x = i * .1, z = .12 + j * .11; g.poly([[x, 0, z - .045], [x + .045, 0, z], [x, 0, z + .045], [x - .045, 0, z]], ST.fa, true); }
    for (let x = -W + .03; x < W; x += .05) for (const s of [1, -1]) g.line([x, 0, s * L], [x, 0, s * (L + .09)], { d: .02, s: .8, a: .4 });
  });
  b.dash([0, 0, -L - .12], [0, 0, -L - .55], ST.lo);
  b.line([0, 0, -L - .58], [-.08, 0, -L - .46], ST.md); b.line([0, 0, -L - .58], [.08, 0, -L - .46], ST.md);
  if (!o.mini) b.text([0, 0, -L - .75], 'QIBLA');
}

function wudu(b) {
  const oct = (y, r) => b.ngon(8, y, r, Math.PI / 8);
  const O0 = oct(0, 1.3), O1 = oct(.28, 1.3);
  b.poly(O0, ST.hi, true); b.poly(O1, ST.hi, true); O0.forEach((p, i) => b.line(p, O1[i], ST.md));
  b.poly(oct(.28, 1.16), ST.md, true); b.poly(oct(.08, 1.16), ST.lo, true);
  b.disc([0, .08, 0], 1.02, .11, ST.fa, .55);
  for (const y of [.08, .5, .95]) b.circle([0, y, 0], .14, ST.md);
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; b.line([.14 * Math.cos(a), .08, .14 * Math.sin(a)], [.14 * Math.cos(a), .95, .14 * Math.sin(a)], ST.lo); }
  const cap = catmull([[.2, 0], [.2, .05], [.12, .14], [0, .2]], 4);
  b.circle([0, .95, 0], .2, ST.md);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; b.poly(cap.map(([r, y]) => [r * Math.cos(a), .95 + y, r * Math.sin(a)]), ST.lo); }
  b.line([0, 1.15, 0], [0, 1.28, 0], ST.hi); b.crescent([0, 1.34, 0], .05, ST.hi);
  const taps = [];
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, c = Math.cos(a), s = Math.sin(a);
    b.poly([[.14 * c, .72, .14 * s], [.32 * c, .72, .32 * s], [.32 * c, .64, .32 * s]], ST.hi); taps.push([c, s]);
    const sa = a + Math.PI / 8, sx = 1.62 * Math.cos(sa), sz = 1.62 * Math.sin(sa);
    b.circle([sx, .26, sz], .1, ST.md); b.circle([sx, 0, sz], .07, ST.lo); b.line([sx, 0, sz], [sx, .26, sz], ST.lo);
  }
  const DROP = { d: 1, s: 1.45, a: .9 };
  b.dyn((t, e) => {
    taps.forEach(([c, s], k) => {
      for (let j = 0; j < 8; j++) {
        const f = (t * 1.3 + j / 8 + k * .13) % 1, r = .32 + f * .44, y = .64 - .56 * f * f;
        e.pt(r * c, y, r * s, DROP, .5 + .5 * (1 - f));
      }
      const f = (t * 1.3 + k * .13) % 1;
      e.circle([.76 * c, .08, .76 * s], .03 + f * .16, { d: .025, s: 1.1, a: .8 * (1 - f) });
    });
  });
}

function quran(b, o = {}) {
  if (!o.mini) platform(b, 1.5);
  const X = .62;
  for (const s of [1, -1]) {
    const p0 = [0, 0, -.52 * s], p1 = [0, 1.1, .52 * s], dir = norm([0, 1.1, 1.04 * s]), n = [0, dir[2] * s * .05, -dir[1] * s * .05];
    const C = [[-X, ...p0.slice(1)], [X, ...p0.slice(1)], [X, ...p1.slice(1)], [-X, ...p1.slice(1)]];
    b.poly(C, ST.hi, true); b.poly(C.map(p => add(p, n, -1)), ST.lo, true);
    C.forEach(p => b.line(p, add(p, n, -1), ST.lo));
    const L = Math.hypot(1.1, 1.04), cc = add(p0, dir, L * .22), u = [1, 0, 0];
    for (const [r, st] of [[.13, ST.md], [.08, ST.lo]]) { const P = []; for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; P.push(add(add(cc, u, Math.cos(a) * r), dir, Math.sin(a) * r)); } b.poly(P, st, true); }
  }
  const R = rng(7), spine = [0, .6, 0], L = .62, pages = [];
  for (const s of [1, -1]) {
    const dir = norm([0, 1.1, 1.04 * s]), inw = [0, dir[2] * s, -dir[1] * s];
    const P = (u, x, off = 0) => add(add(add(spine, [x, 0, 0]), dir, u * L), inw, .03 + .07 * Math.sin(Math.PI * u) * (1 - .3 * u) - off);
    pages.push(P);
    const edge = (x, off, st) => b.poly(Array.from({ length: 21 }, (_, i) => P(i / 20, x, off)), st);
    edge(-.5, 0, ST.hi); edge(.5, 0, ST.hi); edge(-.5, .04, ST.lo); edge(.5, .04, ST.lo);
    b.line(P(1, -.5), P(1, .5), ST.hi); b.line(P(1, -.5, .04), P(1, .5, .04), ST.lo); b.line(P(0, -.5), P(0, .5), ST.md);
    for (let i = 0; i < 8; i++) {
      const u = .14 + i * .1; let x = -.42;
      while (x < .42) { const w = .06 + R() * .16, x2 = Math.min(.42, x + w); b.line(P(u, x), P(u, x2), ST.tx); x = x2 + .04; }
    }
  }
  const SP = Array.from({ length: 70 }, () => ({ s: R() < .5 ? 0 : 1, u: .15 + R() * .7, x: -.4 + R() * .8, p: R(), v: .6 + R() * .6 }));
  b.dyn((t, e) => {
    for (const k of SP) {
      const f = (t * .22 * k.v + k.p) % 1, q = pages[k.s](k.u, k.x);
      e.pt(q[0] + Math.sin(f * 6 + k.p * 9) * .05, q[1] + f * 1.1, q[2] * (1 - f * .6), { d: 1, s: 1.6, a: 1 }, Math.sin(Math.PI * f) ** .8);
    }
  });
}

const SURAH = ['Al-Fatihah', 'Al-Baqarah', "Ali 'Imran", 'Yasin', 'Al-Kahf', 'Ar-Rahman', 'Al-Waqi’ah', 'Al-Mulk', 'Al-Ikhlas', 'An-Nas'];
function mushaf(b, o = {}) {
  const Z = .72, top = x => .02 + .1 * Math.min(1, Math.abs(x) / .25) ** .5;
  b.rectY(0, 0, 0, 2.16, 1.56, ST.md); b.rectY(0, -.03, 0, 2.16, 1.56, ST.fa);
  const R = rng(3);
  for (const s of [-1, 1]) {
    const curve = z => Array.from({ length: 25 }, (_, i) => { const x = s * i / 24 * 1.02; return [x, top(x), z]; });
    b.poly(curve(-Z), ST.hi); b.poly(curve(Z), ST.hi);
    b.line([s * 1.02, top(1), -Z], [s * 1.02, top(1), Z], ST.hi);
    for (const y of [.03, .06, .09]) b.line([s * 1.02, y, -Z], [s * 1.02, y, Z], ST.fa);
    b.line([s * 1.02, 0, -Z], [s * 1.02, top(1), -Z], ST.lo); b.line([s * 1.02, 0, Z], [s * 1.02, top(1), Z], ST.lo);
    for (let i = 0; i < 10; i++) {
      const z = -.5 + i * .12; let x = .16;
      while (x < .92) { const w = .05 + R() * .18, x2 = Math.min(.92, x + w); b.line([s * x, top(1), z], [s * x2, top(1), z], ST.tx); x = x2 + .035; }
    }
  }
  b.rectY(.54, top(1), -.6, .7, .1, ST.md);
  b.dyn((t, e) => {
    const T = 3.4, f = clamp((t % T) / 2.4), al = easeIO(f) * Math.PI;
    const pts = [[0, 0]]; let x = 0, y = 0;
    for (let i = 1; i <= 20; i++) { const u = i / 20, th = al - .55 * Math.sin(al) * u; x += -Math.cos(th) * 1.02 / 20; y += Math.sin(th) * 1.02 / 20; pts.push([x, y]); }
    const P = z => pts.map(([px, py]) => [px, .12 + py, z]);
    e.poly(P(-Z), ST.hi); e.poly(P(Z), ST.hi);
    const end = pts[20]; e.line([end[0], .12 + end[1], -Z], [end[0], .12 + end[1], Z], ST.hi);
    for (let i = 1; i < 6; i++) { const q = pts[4 + i * 3]; e.line([q[0], .12 + q[1], -.5], [q[0], .12 + q[1], .55], ST.tx); }
    if (!o.mini) { const i = Math.floor(t / T) % SURAH.length; e.text([0, 1.2, 0], `Surah ${SURAH[i]}`); }
  });
}

function rubElHizb(b, o = {}) {
  if (!o.mini) platform(b, 1.4);
  b.circle([0, 0, 0], .5, ST.lo);
  b.group({ t: [0, 1.3, 0] }, (v, t) => { const a = t * .45, c = Math.cos(a), s = Math.sin(a), x = v[0]; v[0] = x * c + v[2] * s; v[2] = -x * s + v[2] * c; }, g => {
    for (const z of [-.09, .09]) {
      for (const off of [0, Math.PI / 4]) g.poly(Array.from({ length: 4 }, (_, k) => [Math.cos(off + k * Math.PI / 2), Math.sin(off + k * Math.PI / 2), z]), z > 0 ? ST.hi : ST.md, true);
      g.circle([0, 0, z], .42, ST.md, 'z'); g.circle([0, 0, z], .14, ST.lo, 'z');
    }
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.line([Math.cos(a), Math.sin(a), -.09], [Math.cos(a), Math.sin(a), .09], ST.lo); }
    g.circle([0, 0, 0], 1.28, ST.fa, 'z');
    g.dyn((t, e) => { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * .6; e.circle([Math.cos(a) * 1.28, Math.sin(a) * 1.28, 0], .04, { d: .02, s: 1.5, a: 1 }, 'z'); } });
  });
}

function tasbih(b, o = {}) {
  const rx = 1.0, rz = .72, by = .08, gap = .55, beads = [];
  const at = th => [rx * Math.sin(th), by, rz * Math.cos(th)], tan = th => norm([rx * Math.cos(th), 0, -rz * Math.sin(th)]);
  const S = [];
  for (let i = 0; i <= 80; i++) S.push(at(gap / 2 + i / 80 * (TAU - gap)));
  b.poly(S, ST.fa);
  for (let k = 0; k < 35; k++) {
    const th = gap / 2 + k * (TAU - gap) / 34, p = at(th), n = tan(th);
    if (k === 11 || k === 23) { b.circleN(p, .09, n, ST.hi); b.circleN(p, .05, n, ST.lo); continue; }
    b.circleN(p, .065, n, ST.md); b.circle(p, .065, ST.md); b.circleN(p, .065, [p[0], 0, p[2]], ST.lo);
    beads.push({ p, n });
  }
  const ip = [0, by + .03, rz + .14];
  b.line(S[0], ip, ST.fa); b.line(S[80], ip, ST.fa);
  b.poly(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * TAU; return [ip[0] + Math.cos(a) * .065, ip[1] + Math.sin(a) * .11, ip[2]]; }), ST.hi, true);
  b.poly(Array.from({ length: 30 }, (_, i) => { const a = i / 30 * TAU; return [ip[0], ip[1] + Math.sin(a) * .11, ip[2] + Math.cos(a) * .065]; }), ST.md, true);
  b.circle([0, by, rz + .3], .045, ST.md);
  for (let i = 0; i < 9; i++) { const x = -.2 + i * .05; b.line([0, by - .02, rz + .34], [x, 0, rz + .85 + Math.abs(x) * -.3], ST.lo); }
  const PH = ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar'];
  b.dyn((t, e) => {
    const c = t * 2.4, i = Math.floor(c) % 33, cy = Math.floor(c / 33) % 3, f = c % 1, { p, n } = beads[i];
    e.circleN(p, .1, n, ST.hi); e.circle(p, .1, ST.hi);
    e.circle(p, .1 + f * .28, { d: .03, s: 1.3, a: 1 - f });
    if (!o.mini) e.text([0, .2, 0], `${PH[cy]} · ${i + 1}/33`);
  });
}

function lantern(b, o = {}) {
  const py = 2.45;
  if (!o.mini) { b.circle([0, 0, 0], .9, ST.lo); b.disc([0, 0, 0], .8, .11, ST.fa, .5); }
  b.group({}, (v, t) => {
    let a = .08 * Math.sin(t * 1.1), c = Math.cos(a), s = Math.sin(a), dx = v[0], dy = v[1] - py;
    v[0] = dx * c - dy * s; v[1] = py + dx * s + dy * c;
    a = .045 * Math.sin(t * .8 + 1); c = Math.cos(a); s = Math.sin(a); dy = v[1] - py; const dz = v[2];
    v[2] = dz * c - dy * s; v[1] = py + dz * s + dy * c;
  }, g => {
    const hex = (y, r) => g.ngon(6, y, r, Math.PI / 6);
    const H0 = hex(.62, .36), H1 = hex(1.3, .36), B = hex(.56, .38), T = hex(1.36, .42), T2 = hex(1.55, .2);
    [H0, H1].forEach(h => g.poly(h, ST.hi, true)); [B, T].forEach(h => g.poly(h, ST.md, true)); g.poly(T2, ST.md, true);
    H0.forEach((p, i) => g.line(p, H1[i], ST.hi));
    B.forEach(p => g.line(p, [0, .3, 0], ST.md)); g.poly(hex(.44, .2), ST.lo, true); g.circle([0, .26, 0], .04, ST.md, 'z');
    T.forEach((p, i) => g.line(p, T2[i], ST.md));
    const dome = catmull([[.2, 0], [.19, .1], [.12, .2], [0, .26]], 4);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + Math.PI / 6; g.poly(dome.map(([r, y]) => [r * Math.cos(a), 1.55 + y, r * Math.sin(a)]), ST.lo); }
    g.line([0, 1.81, 0], [0, 1.9, 0], ST.hi); g.circle([0, 1.98, 0], .08, ST.hi, 'z'); g.dash([0, 2.06, 0], [0, py, 0], ST.lo, .03, .03);
    for (let k = 0; k < 6; k++) {
      const a = H0[k], c = H0[(k + 1) % 6], fc = [(a[0] + c[0]) / 2, 0, (a[2] + c[2]) / 2], tn = norm([c[0] - a[0], 0, c[2] - a[2]]), out = norm(fc);
      g.poly(ogive(0, .1, .72, .24, .14).map(([u, v]) => [fc[0] + tn[0] * u + out[0] * .006, v, fc[2] + tn[2] * u + out[2] * .006]), ST.md);
    }
    const R = rng(5), F = Array.from({ length: 140 }, () => ({ x: (R() - .5) * 2, y: R(), z: (R() - .5) * 2, p: R() * TAU }));
    g.dyn((t, e) => {
      for (const k of F) {
        const fl = .55 + .45 * Math.sin(t * 9 + k.p), h = k.y * (.8 + .2 * Math.sin(t * 5 + k.p)), r = .09 * (1 - h) ** .8;
        e.pt(k.x * r, .74 + h * .26, k.z * r, { d: 1, s: 1.6, a: .95 }, fl);
      }
      for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; e.pt(Math.cos(a) * .22, .86 + Math.sin(a * 2 + t) * .03, Math.sin(a) * .22, { d: 1, s: 1.1, a: .25 }); }
    });
  });
}

function moon(b) {
  const c = [0, 1.3, 0], R = .95;
  b.circle([0, 0, 0], 1.2, ST.lo); b.disc([0, 0, 0], 1.1, .12, ST.fa, .5);
  b.circle(c, R * 1.02, ST.fa); b.circle(c, R * 1.02, ST.fa, 'z');
  const star = (cx, cy, r) => b.poly(Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, .2]; }), ST.hi, true);
  star(1.35, 2.2, .16); star(-1.25, 2.45, .09);
  const N = Math.round(2000 / DENSITY), F = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - (i + .5) / N * 2, r = Math.sqrt(1 - y * y), th = ga * i; F.push([Math.cos(th) * r, y, Math.sin(th) * r]); }
  b.dyn((t, e) => {
    const L = norm([Math.cos(t * .35), .15, Math.sin(t * .35)]);
    for (const n of F) {
      const d = n[0] * L[0] + n[1] * L[1] + n[2] * L[2], k = clamp((d + .05) / .3);
      e.pt(c[0] + n[0] * R, c[1] + n[1] * R, c[2] + n[2] * R, { d: 1, s: .9 + .8 * k, a: .08 + .92 * k });
    }
  });
}

function dua(b) {
  platform(b, 1.6);
  b.rectY(0, 0, 0, 1.6, .6, ST.md); b.rectY(0, .07, 0, 1.36, .44, ST.lo);
  for (const z of [.12, -.12]) {
    b.poly(ogive(0, .55, .07, 1.25, .75).map(([u, v]) => [u, v, z]), z > 0 ? ST.hi : ST.md);
    b.poly(ogive(0, .42, .07, 1.2, .58).map(([u, v]) => [u, v, z]), ST.lo);
  }
  for (const x of [-.55, .55]) for (const y of [.07, 1.32]) b.line([x, y, -.12], [x, y, .12], ST.lo);
  b.line([0, 2.07, -.12], [0, 2.07, .12], ST.lo);
  b.circle([0, 0, .95], .26, ST.md); b.circle([0, 0, .95], .13, ST.lo);
  const R = rng(9), P = Array.from({ length: 180 }, (_, i) => ({ x: (R() - .5) * .4, z: (R() - .5) * .3, p: i / 180, w: R() * TAU }));
  b.dyn((t, e) => {
    for (const k of P) {
      const f = (t * .16 + k.p) % 1, y = f * 3.1, g = clamp(f * 1.8);
      e.pt(k.x * (1 - g * .7) + Math.sin(f * 7 + k.w) * .06, y, .95 + k.z - (.95 + k.z) * easeOut(g), { d: 1, s: 1.5, a: 1 }, Math.sin(Math.PI * f) ** .7);
    }
  });
}

function plaza(b) {
  const R = 3.1;
  b.circle([0, 0, 0], R, ST.lo); b.circle([0, 0, 0], R * .95, ST.fa); b.circle([0, -.14, 0], R, ST.fa);
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; b.line([Math.cos(a) * R, -.14, Math.sin(a) * R], [Math.cos(a) * R, 0, Math.sin(a) * R], ST.fa); }
  b.disc([0, 0, 0], R * .93, .17, ST.fa, .5);
  b.circle([0, 0, 0], 1.25, ST.md); b.circle([0, -.06, 0], 1.25, ST.fa);
  b.group({ s: .72 }, null, g => kaaba(g, { mini: true }));
  const items = [
    [mosque, .36, 0], [quran, .5, 0], [tasbih, .46, 0], [lantern, .3, 0], [qibla, .4, 0],
  ];
  items.forEach(([fn, s], i) => {
    const a = -Math.PI / 2 + i / items.length * TAU + Math.PI / 5, cx = Math.cos(a) * 2.3, cz = Math.sin(a) * 2.3;
    b.rectY(cx, .02, cz, 1.05, 1.05, ST.md); b.rectY(cx, -.08, cz, 1.05, 1.05, ST.fa);
    const perp = [-Math.sin(a), 0, Math.cos(a)];
    for (const off of [-.07, .07]) b.line([Math.cos(a) * 1.28 + perp[0] * off, .01, Math.sin(a) * 1.28 + perp[2] * off], [Math.cos(a) * 1.72 + perp[0] * off, .01, Math.sin(a) * 1.72 + perp[2] * off], ST.lo);
    for (let r = 1.32; r < 1.72; r += .06) b.line([Math.cos(a) * r - perp[0] * .07, .01, Math.sin(a) * r - perp[2] * .07], [Math.cos(a) * r + perp[0] * .07, .01, Math.sin(a) * r + perp[2] * .07], ST.fa);
    b.group({ s, t: [cx, .03, cz] }, null, g => fn(g, { mini: true }));
  });
}

const SCENES = [
  { id: 'kaaba', title: 'Kaaba and tawaf', ar: 'الكعبة', tag: 'Places', build: kaaba, az: .6, el: .5, zoom: 1.08, desc: 'Pilgrims circle the House counter-clockwise, seven times round. The Hijr Ismail wall and the Maqam Ibrahim sit beside it.' },
  { id: 'masjid', title: 'Masjid', ar: 'المسجد', tag: 'Places', build: mosque, az: .7, el: .42, spin: .12, desc: 'An onion dome on its drum, pointed arches on every face and four minarets topped with crescents.' },
  { id: 'adhan', title: 'Minaret and adhan', ar: 'الأذان', tag: 'Prayer', build: adhan, az: .5, el: .3, zoom: 1.05, desc: 'The call to prayer spreads out from the balcony in widening rings.' },
  { id: 'solat', title: 'Five daily prayers', ar: 'الصلوات الخمس', tag: 'Prayer', build: prayers, az: .25, el: .28, sway: .25, zoom: .9, desc: 'The sun moves along its arc through Subuh, Zohor, Asar, Maghrib and Isyak, and each prayer time pulses as the sun passes it.' },
  { id: 'qibla', title: 'Qibla compass', ar: 'القبلة', tag: 'Prayer', build: qibla, az: 0, el: .85, sway: .3, zoom: .9, desc: 'The needle swings, then settles on 292.5°, the qibla bearing from Kuala Lumpur.' },
  { id: 'sajadah', title: 'Sajadah', ar: 'سجادة', tag: 'Prayer', build: sajadah, az: .7, el: .62, zoom: .95, desc: 'A prayer mat with a mihrab arch and a hanging lamp, rippling gently and pointed towards the qibla.' },
  { id: 'wudu', title: 'Wudu fountain', ar: 'وضوء', tag: 'Prayer', build: wudu, az: .4, el: .55, spin: .1, zoom: .92, desc: 'Water falls from eight taps into the octagonal basin, with a stool set at each tap for ablution.' },
  { id: 'rehal', title: 'Quran on a rehal', ar: 'القرآن', tag: 'Quran', build: quran, az: .9, el: .35, sway: .45, desc: 'The mushaf lies open on its folding stand, and points of light rise from the lines of recitation.' },
  { id: 'surah', title: 'Surah by surah', ar: 'سورة', tag: 'Quran', build: mushaf, az: .35, el: .75, sway: .25, zoom: .86, desc: 'Pages turn one at a time: Al-Fatihah, Al-Baqarah, Yasin, Al-Mulk and on to An-Nas.' },
  { id: 'hizb', title: 'Rub el Hizb', ar: '۞ ربع الحزب', tag: 'Quran', build: rubElHizb, az: .3, el: .2, sway: .2, desc: 'The eight-pointed star that marks each quarter hizb of the mushaf, turning on its own axis.' },
  { id: 'tasbih', title: 'Tasbih', ar: 'تسبيح', tag: 'Zikir', build: tasbih, az: .2, el: .8, sway: .3, desc: 'The count moves bead by bead, 33 each of SubhanAllah, Alhamdulillah and Allahu Akbar.' },
  { id: 'dua', title: 'Dua', ar: 'دعاء', tag: 'Zikir', build: dua, az: .55, el: .3, sway: .35, desc: 'From where one stands, supplications rise as light through the mihrab arch and upwards.' },
  { id: 'fanous', title: 'Fanous', ar: 'فانوس', tag: 'Ramadan', build: lantern, az: .5, el: .2, sway: .4, desc: 'A Ramadan lantern with arched windows swings on its chain while the flame flickers inside.' },
  { id: 'hilal', title: 'Hilal', ar: 'هلال', tag: 'Ramadan', build: moon, az: .3, el: .15, sway: .3, desc: 'The moon moves through its phases, from the thin hilal that opens Ramadan to the full moon.' },
];
const HERO = { id: 'plaza', build: plaza, dust: 420, az: .5, el: .5, spin: .05, zoom: 1.12 };

/* ---------- compile & render ---------- */
function compile(def) {
  const sc = { groups: [{ s: 1, ry: 0, t: [0, 0, 0], warp: null, parent: -1 }], dyns: [], labels: [] };
  const out = [];
  def.build(new Builder(sc, out, 0, 1, sc.labels), {});
  sc.groups.forEach(g => { let h = false; for (let p = g; p; p = p.parent >= 0 ? sc.groups[p.parent] : null) if (p.warp) h = true; g.hasWarp = h; });
  const n = out.length / 6, R = rng(def.id.length * 131 + 7);
  const P = new Float32Array(n * 3), W = new Float32Array(n * 3), S = new Float32Array(n), A = new Float32Array(n), G = new Uint16Array(n), tmp = [0, 0, 0];
  let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) {
    const j = .006;
    P[i * 3] = out[i * 6] + (R() - .5) * j; P[i * 3 + 1] = out[i * 6 + 1] + (R() - .5) * j; P[i * 3 + 2] = out[i * 6 + 2] + (R() - .5) * j;
    S[i] = out[i * 6 + 3] * (.85 + R() * .3); A[i] = out[i * 6 + 4]; G[i] = out[i * 6 + 5];
    xf(sc, G[i], P[i * 3], P[i * 3 + 1], P[i * 3 + 2], 0, tmp);
    for (let k = 0; k < 3; k++) { W[i * 3 + k] = tmp[k]; if (tmp[k] < mn[k]) mn[k] = tmp[k]; if (tmp[k] > mx[k]) mx[k] = tmp[k]; }
  }
  const C = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  let rad = 0;
  for (let i = 0; i < n; i++) rad = Math.max(rad, Math.hypot(W[i * 3] - C[0], W[i * 3 + 1] - C[1], W[i * 3 + 2] - C[2]));
  const SC = new Float32Array(n * 3), D = new Float32Array(n), hy = mx[1] - mn[1] || 1;
  for (let i = 0; i < n; i++) {
    const u = R() * 2 - 1, th = R() * TAU, q = Math.sqrt(1 - u * u), r = rad * (.5 + R() * 1.1);
    SC[i * 3] = C[0] + q * Math.cos(th) * r; SC[i * 3 + 1] = C[1] + u * r * .7; SC[i * 3 + 2] = C[2] + q * Math.sin(th) * r;
    D[i] = (W[i * 3 + 1] - mn[1]) / hy * .5 + R() * .35;
  }
  // ambient dust: loose particles drifting slowly upward through the scene
  const dn = Math.round((def.dust || 220) / DENSITY), DU = new Float32Array(dn * 6);
  for (let i = 0; i < dn; i++) {
    const u = R() * 2 - 1, th = R() * TAU, q = Math.sqrt(1 - u * u), r = rad * (.25 + R() ** .6 * .95);
    DU[i * 6] = C[0] + q * Math.cos(th) * r; DU[i * 6 + 1] = mn[1] + R() * (mx[1] - mn[1] + rad * .3); DU[i * 6 + 2] = C[2] + q * Math.sin(th) * r;
    DU[i * 6 + 3] = .5 + R() * .9; DU[i * 6 + 4] = R() * TAU; DU[i * 6 + 5] = .6 + R() * .8;
  }
  return Object.assign(sc, { n, P, W, S, A, G, C, R: rad, SC, D, groundY: mn[1], DU, dn, dustH: mx[1] - mn[1] + rad * .3 });
}
function xf(sc, gi, x, y, z, t, v) {
  v[0] = x; v[1] = y; v[2] = z;
  for (let g = sc.groups[gi]; g; g = g.parent >= 0 ? sc.groups[g.parent] : null) {
    if (g.warp) g.warp(v, t);
    let X = v[0] * g.s, Y = v[1] * g.s, Z = v[2] * g.s;
    if (g.ry) { const c = Math.cos(g.ry), s = Math.sin(g.ry), x2 = X * c + Z * s; Z = -X * s + Z * c; X = x2; }
    v[0] = X + g.t[0]; v[1] = Y + g.t[1]; v[2] = Z + g.t[2];
  }
}

const SPRITES = {};
function spriteFor(color) {
  if (SPRITES[color]) return SPRITES[color];
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.fillStyle = color; x.beginPath(); x.arc(16, 16, 14, 0, TAU); x.fill();
  return (SPRITES[color] = c);
}
class Viewer {
  constructor(canvas, def, opt = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.def = def; this.opt = opt;
    this.t = opt.t0 || 0; this.speed = 1; this.paused = false; this.asm = null;
    this.hx = 0; this.hxT = 0; this.dAz = 0; this.dEl = 0; this.visible = false;
    this.dynOut = []; this.dynText = []; this.tmp = [0, 0, 0];
    this.build();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  theme() {
    const cs = getComputedStyle(this.cv);
    this.dotC = (cs.getPropertyValue('--dot') || '').trim() || '#2E6BFF';
    this.glow = (cs.getPropertyValue('--glow') || '').trim() || 'rgba(46,107,255,.10)';
    this.label = (cs.getPropertyValue('--label') || '').trim() || '#5b6678';
    this.spr = spriteFor(this.dotC);
  }
  build() { this.theme(); this.sc = compile(this.def); this.db = new Builder(this.sc, this.dynOut, 0, 1, this.dynText); }
  replay() { this.asm = performance.now(); }
  resize() {
    const r = this.cv.getBoundingClientRect(); this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = Math.round(r.width * this.dpr); this.h = Math.round(r.height * this.dpr);
    if (this.w && this.h) { this.cv.width = this.w; this.cv.height = this.h; }
  }
  draw(now, dt) {
    if (!this.w || !this.h) return;
    if (this.asm === null) this.asm = now;
    if (!this.paused && !REDUCED) this.t += dt * this.speed;
    const ta = REDUCED ? 99 : (now - this.asm) / 1000, t = REDUCED ? 3.3 : this.t;
    const sc = this.sc, d = this.def, ctx = this.ctx, tmp = this.tmp;
    this.hx += (this.hxT - this.hx) * .06;
    const az = d.az + (REDUCED ? 0 : d.spin ? t * d.spin : Math.sin(t * .22) * (d.sway ?? .35)) + this.hx * .45 + this.dAz;
    const el = clamp(d.el + this.dEl, -.1, 1.4), ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el), se = Math.sin(el);
    const R = sc.R, C = sc.C, Dp = R * 4.2;
    const scale = Math.min(this.w, this.h * 1.2) * .49 / R * (d.zoom || 1);
    const cx = this.w / 2, cy = this.h / 2;
    const sizeK = this.dpr * clamp(Math.min(this.w, this.h) / this.dpr / 360, .75, 1.6);
    const proj = (x, y, z, out) => {
      x -= C[0]; y -= C[1]; z -= C[2];
      const x1 = x * ca - z * sa, z1 = x * sa + z * ca, y2 = y * ce - z1 * se, z2 = y * se + z1 * ce, p = Dp / (Dp - z2);
      out[0] = cx + x1 * scale * p; out[1] = cy - y2 * scale * p; out[2] = p; out[3] = z2;
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.w, this.h);
    const q = [0, 0, 0, 0];
    // ground glow
    proj(C[0], sc.groundY, C[2], q);
    const gr = R * scale * 1.05;
    ctx.save(); ctx.translate(q[0], q[1]); ctx.scale(1, Math.max(.18, Math.abs(se)));
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
    grad.addColorStop(0, this.glow); grad.addColorStop(.6, this.glow.replace(/[\d.]+\)$/, m => (parseFloat(m) * .45).toFixed(3) + ')')); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill(); ctx.restore();

    const spr = this.spr, asmDone = ta > 2.3;
    const dot = (x, y, z, s, a) => {
      proj(x, y, z, q);
      const fade = .42 + .58 * clamp((q[3] / R + 1) / 2), r = Math.max(.6 * this.dpr, s * .62 * sizeK * q[2] ** .8);
      const al = a * fade; if (al < .01) return;
      ctx.globalAlpha = al > 1 ? 1 : al; ctx.drawImage(spr, q[0] - r, q[1] - r, r * 2, r * 2);
    };
    const { n, P, W, S, A, G, SC, D } = sc;
    for (let i = 0; i < n; i++) {
      let x, y, z; const g = sc.groups[G[i]];
      if (g.hasWarp) { xf(sc, G[i], P[i * 3], P[i * 3 + 1], P[i * 3 + 2], t, tmp); x = tmp[0]; y = tmp[1]; z = tmp[2]; }
      else { x = W[i * 3]; y = W[i * 3 + 1]; z = W[i * 3 + 2]; }
      let a = A[i];
      if (!asmDone) {
        const e = easeOut(clamp((ta - D[i]) / 1.4)), k = 1 - e;
        x = x * e + SC[i * 3] * k; y = y * e + SC[i * 3 + 1] * k; z = z * e + SC[i * 3 + 2] * k; a *= .2 + .8 * e;
      }
      dot(x, y, z, S[i], a);
    }
    const df = clamp((ta - 1.3) / .9);
    if (df > 0) {
      const DU = sc.DU, H = sc.dustH, y0 = sc.groundY;
      for (let i = 0; i < sc.dn; i++) {
        const j = i * 6, ph = DU[j + 4], sp = DU[j + 5];
        const y = y0 + ((DU[j + 1] - y0 + t * .06 * sp) % H), f = (y - y0) / H;
        dot(DU[j] + Math.sin(t * .3 * sp + ph) * .06, y, DU[j + 2] + Math.cos(t * .25 * sp + ph) * .06, DU[j + 3],
          df * (.12 + .3 * (.5 + .5 * Math.sin(t * 1.3 * sp + ph))) * Math.sin(Math.PI * f));
      }
    }
    if (df > 0) {
      this.dynOut.length = 0; this.dynText.length = 0;
      for (const dy of sc.dyns) { this.db.g = dy.g; this.db.k = dy.k; dy.fn(t, this.db); }
      const o = this.dynOut;
      for (let i = 0; i < o.length; i += 6) { xf(sc, o[i + 5], o[i], o[i + 1], o[i + 2], t, tmp); dot(tmp[0], tmp[1], tmp[2], o[i + 3], o[i + 4] * df); }
    }
    const lf = clamp((ta - 1.6) / .8);
    if (lf > 0 && (sc.labels.length || this.dynText.length)) {
      ctx.globalAlpha = lf; ctx.fillStyle = this.label; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `500 ${Math.round(10.5 * sizeK)}px "JetBrains Mono", monospace`;
      for (const L of sc.labels.concat(df > 0 ? this.dynText : [])) { xf(sc, L.g, L.p[0], L.p[1], L.p[2], t, tmp); proj(tmp[0], tmp[1], tmp[2], q); ctx.fillText(L.str, q[0], q[1]); }
    }
    ctx.globalAlpha = 1;
  }
}


/* ---------- mount helper: one loop for every mounted canvas, only on-screen ones draw ---------- */
const mounted = new Set();
let looping = false, frame = 0;
const io = new IntersectionObserver(es => es.forEach(e => { const v = e.target.__pv; if (!v) return; v.visible = e.isIntersecting; if (e.isIntersecting && v.asm === null) v.replay(); }), { rootMargin: '120px' });
function loop(now) {
  frame++;
  mounted.forEach(v => {
    if (!v.visible) return;
    if (v.half && (frame + v.half) % 2) return;
    const dt = v.last ? Math.min(.1, (now - v.last) / 1000) : 0; v.last = now;
    v.draw(now, dt);
  });
  requestAnimationFrame(loop);
}
function byId(id) { return id === 'plaza' ? HERO : SCENES.find(s => s.id === id); }
function mount(canvas, id, opt = {}) {
  const def = byId(id); if (!def) throw new Error('unknown scene ' + id);
  if (canvas.__pv) { mounted.delete(canvas.__pv); io.unobserve(canvas); }
  const v = new Viewer(canvas, Object.assign({}, def, opt.zoom ? { zoom: (def.zoom || 1) * opt.zoom } : {}), opt);
  if (opt.half) v.half = opt.half;
  canvas.__pv = v; mounted.add(v); io.observe(canvas);
  if (opt.hover !== false) {
    const host = opt.hoverEl || canvas;
    host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); v.hxT = ((e.clientX - r.left) / r.width - .5) * 2; });
    host.addEventListener('pointerleave', () => { v.hxT = 0; });
  }
  if (!looping) { looping = true; requestAnimationFrame(loop); }
  return v;
}
window.BaikParticles = {
  SCENES, HERO, Viewer, mount,
  setDensity(n) { DENSITY = n; },
  refreshTheme() { mounted.forEach(v => v.theme()); },
  unmount(canvas) { if (canvas.__pv) { mounted.delete(canvas.__pv); io.unobserve(canvas); canvas.__pv = null; } },
};
})();

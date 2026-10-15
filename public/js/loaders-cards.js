/* Baik · card loading screens (internal lab, /loaders). The real Baik card, lit like a product shot:
   glossy dark back with the lattice and the mark, white stock at the edges, soft shadows on an unseen
   floor. Three ways to wait, all slow:
     draw  one card floating, turning a few degrees as the light slides over it
     fan   the deck opens into a hand of cards like a breath, holds, and closes
     cut   a squared deck seen from above, cut by hand: top half out, bottom half up, swap
   ready() lifts one card toward you and turns it over to show a dua, then calls onDone.
   window.BaikCardLoader.mount(host, kind, { onDone }) → Promise<{ ready, replay, stop }>. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DATA = window.BAIK_DECK || [];
const W = 768, H = 1152, TS = 1024 / 768;
const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const clamp01 = v => Math.max(0, Math.min(1, v));
const seg = (p, a, b) => ease(clamp01((p - a) / (b - a)));

/* ---------- the card, painted once on canvas (the same design as the landing page deck) ---------- */
const loadImg = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
function wrap(x, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function lattice(x, cx, cy, R, alpha, color) {
  x.save(); x.strokeStyle = color; x.globalAlpha = alpha; x.lineWidth = 1.4;
  for (let k = 1; k <= 7; k++) {
    const r = R * k / 7;
    for (const off of [0, Math.PI / 4]) { x.beginPath(); for (let j = 0; j < 4; j++) { const a = off + j * Math.PI / 2 + Math.PI / 4; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; j ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke(); }
    x.beginPath(); x.arc(cx, cy, r * 0.72, 0, Math.PI * 2); x.stroke();
  }
  x.restore();
}
function canvas() { const cv = document.createElement('canvas'); cv.width = W * TS; cv.height = H * TS; const x = cv.getContext('2d'); x.scale(TS, TS); x.imageSmoothingQuality = 'high'; return [cv, x]; }
function backCanvas(logo) {
  const [cv, x] = canvas();
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#26292E'); g.addColorStop(1, '#131518');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 2; rr(x, 30, 30, W - 60, H - 60, 24); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.10)'; rr(x, 46, 46, W - 92, H - 92, 18); x.stroke();
  lattice(x, W / 2, H / 2, 330, 0.5, '#FFFFFF');
  x.fillStyle = '#1B1D21'; x.beginPath(); x.arc(W / 2, H / 2, 118, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (logo) { const lw = 168, lh = lw * logo.height / logo.width; x.drawImage(logo, W / 2 - lw / 2, H / 2 - lh / 2, lw, lh); }
  else { x.fillStyle = '#FFFFFF'; x.font = '700 70px "Space Grotesk"'; x.fillText('Baik', W / 2, H / 2 + 4); }
  x.font = '500 20px "JetBrains Mono"'; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('A DECK OF AUTHENTIC DUAS', W / 2, H - 100);
  return cv;
}
async function faceCanvas(d) {
  const [cv, x] = canvas();
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#DBDBDB'; x.lineWidth = 3; rr(x, 22, 22, W - 44, H - 44, 26); x.stroke();
  x.fillStyle = '#1E2124'; x.textBaseline = 'middle'; x.font = '600 40px "Space Grotesk"';
  let title = d.t; while (x.measureText(title).width > W - 190 && title.length > 4) title = title.slice(0, -2) + '…';
  x.fillText(title, 56, 92); x.fillStyle = '#E6E6E6'; x.fillRect(40, 140, W - 80, 2);
  const AX = 40, AY = 150, AW = W - 80, AH = 360, img = await loadImg(d.art ? '/' + d.art.replace(/^\//, '') : null);
  x.save(); rr(x, AX, AY, AW, AH, 6); x.clip();
  if (img) { const s = Math.max(AW / img.width, AH / img.height); x.drawImage(img, AX + (AW - img.width * s) / 2, AY + (AH - img.height * s) / 2, img.width * s, img.height * s); }
  else { x.fillStyle = '#F3F3F1'; x.fillRect(AX, AY, AW, AH); lattice(x, AX + AW / 2, AY + AH / 2, AH * .62, .28, '#1E2124'); }
  x.restore();
  x.textBaseline = 'alphabetic'; let y = AY + AH + 50;
  x.fillStyle = '#6E6E6E'; x.font = '500 22px "JetBrains Mono"'; x.fillText('DUA · ' + String(d.need || '').toUpperCase(), 56, y); y += 30;
  let size = 60, lines; x.direction = 'rtl'; x.textAlign = 'center';
  for (; size > 30; size -= 3) { x.font = `600 ${size}px "Scheherazade New"`; lines = wrap(x, d.ar, W - 130); if (lines.length <= 4) break; }
  if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] += ' …'; }
  x.fillStyle = '#1E2124'; const lh = size * 1.7; y += size * 1.05;
  lines.forEach((l, k) => x.fillText(l, W / 2, y + k * lh)); y += (lines.length - 1) * lh + size * .75 + 34;
  x.direction = 'ltr'; x.textAlign = 'left'; x.font = 'italic 400 27px Saira'; x.fillStyle = '#4A4F57';
  let en = wrap(x, '“' + d.en + '”', W - 120); const room = Math.max(1, Math.floor((H - 132 - y) / 38));
  if (en.length > room) { en = en.slice(0, room); en[room - 1] = en[room - 1].replace(/\W*\S*$/, '') + ' …”'; }
  en.forEach((l, k) => x.fillText(l, 60, y + k * 38));
  x.fillStyle = '#E6E6E6'; x.fillRect(40, H - 112, W - 80, 2);
  x.fillStyle = '#6E6E6E'; x.font = '500 21px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText(String(d.src || '').toUpperCase(), 56, H - 70);
  return cv;
}
let paint = null;
function painted() {
  if (paint) return paint;
  paint = (async () => {
    const card = DATA.find(d => d.art) || DATA[0] || { t: 'Baik', ar: '', en: '', src: '', need: '' };
    await Promise.all([document.fonts.load('600 60px "Scheherazade New"', card.ar || 'ا'), document.fonts.load('600 40px "Space Grotesk"'),
      document.fonts.load('italic 400 27px Saira'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {});
    const logo = await loadImg('/assets/logo/baik-logo_caps-white.png');
    return { back: backCanvas(logo), face: await faceCanvas(card) };
  })();
  return paint;
}

/* ---------- a scene ---------- */
async function mount(host, kind, opts = {}) {
  const P = await painted();
  const cv = document.createElement('canvas'); cv.className = 'cl-cv';
  // fills its host whatever the page's styles say, so its size can never feed back into the host's
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  host.appendChild(cv);
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe6e3dc, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(2.6, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 10; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 }); scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff1d8, 0.55); rim.position.set(-5, 3, -4); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.13 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const backMat = new THREE.MeshPhysicalMaterial({ map: tex(P.back), roughness: 0.42, metalness: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.22 });
  const faceMat = new THREE.MeshBasicMaterial({ map: tex(P.face), toneMapped: false });   // the face reads exactly as printed
  const edge = new THREE.MeshStandardMaterial({ color: 0xf1f0ec, roughness: 0.65 });
  const CW = 1.32, CH = 1.98, TH = 0.024;
  const geo = new RoundedBoxGeometry(CW, CH, TH, 4, 0.07);
  const card = () => { const m = new THREE.Mesh(geo, [edge, edge, edge, edge, faceMat, backMat]); m.castShadow = true; m.receiveShadow = true; return m; };

  let update, hero, look = new THREE.Vector3(), camBase = new THREE.Vector3();
  if (kind === 'draw') {
    floor.position.y = -1.42;
    const g = new THREE.Group(); scene.add(g); const c = card(); c.rotation.y = Math.PI; g.add(c); hero = c;
    camBase.set(0, 0.42, 7.9); look.set(0, -0.04, 0);
    update = (t, inn) => {
      g.position.set(0, (1 - inn) * -0.35 + Math.sin(t * 0.8) * 0.045, (1 - inn) * -0.8);
      g.rotation.set(-0.07 + Math.sin(t * 0.33) * 0.05, (1 - inn) * 0.9 + Math.sin(t * 0.42) * 0.24, Math.sin(t * 0.27) * 0.025);
    };
  } else if (kind === 'fan') {
    floor.position.y = -1.5;
    const g = new THREE.Group(); g.rotation.y = Math.PI; scene.add(g);      // backs toward you
    const N = 7, piv = [];
    for (let i = 0; i < N; i++) {
      const p = new THREE.Group(); p.position.set(0, -0.92, -i * 0.014); g.add(p);
      const c = card(); c.position.y = CH / 2 - 0.16; p.add(c); piv.push({ p, c });
    }
    hero = piv[N - 1].c;
    camBase.set(0, 0.3, 8.6); look.set(0, 0.08, 0);
    update = (t, inn) => {
      // open (1.6 s), hold, close (1.4 s), rest: one slow breath every 5.4 s
      const q = REDUCED ? 0.5 : (t % 5.4) / 5.4;
      const f = (REDUCED ? 1 : seg(q, 0.04, 0.34) * (1 - seg(q, 0.62, 0.88))) * inn;
      piv.forEach(({ p, c }, i) => { const k = i - (N - 1) / 2; p.rotation.z = -k * 0.15 * f; c.rotation.y = k * 0.025 * f; c.position.x = k * 0.012 * f; });
      g.rotation.set(-0.08, Math.PI + Math.sin(t * 0.38) * 0.1, Math.sin(t * 0.3) * 0.02);
      g.position.y = (1 - inn) * -0.3 + Math.sin(t * 0.7) * 0.03;
    };
  } else {                                // cut
    floor.position.y = -0.02;
    const half = 6, packets = [new THREE.Group(), new THREE.Group()];
    packets.forEach(pk => scene.add(pk));
    for (let j = 0; j < half * 2; j++) {
      const c = card(); c.rotation.set(Math.PI / 2, 0, Math.PI + Math.sin(j * 7.3) * 0.012);   // face down, back up the right way round, squared by hand
      c.position.set(Math.sin(j * 3.1) * 0.008, (j % half) * TH * 1.06 + TH / 2, Math.cos(j * 2.7) * 0.008);
      packets[j < half ? 0 : 1].add(c);
    }
    const PH = half * TH * 1.06, CYC = 3.8;
    camBase.set(0, 5.6, 4.6); look.set(0, 0.05, 0.1);
    update = (t, inn) => {
      const n = REDUCED ? 0 : Math.floor(t / CYC), q = REDUCED ? 0 : (t % CYC) / CYC;
      const top = packets[(n + 1) % 2], bot = packets[n % 2];
      // the top half slides out to the right and lifts; the bottom half slides left; they meet again, swapped
      const a = seg(q, 0.06, 0.34), b = seg(q, 0.24, 0.48), c = seg(q, 0.56, 0.86);
      const out = CW * 0.66;
      top.position.set(out * a * (1 - c), PH * (1 - c) + Math.sin(Math.PI * clamp01((q - 0.06) / 0.8)) * 0.18, -0.05 * a * (1 - c));
      bot.position.set(-out * b * (1 - c), PH * c + Math.sin(Math.PI * c) * 0.12, 0.05 * b * (1 - c));
      top.rotation.y = -0.07 * a * (1 - c); bot.rotation.y = 0.06 * b * (1 - c);
      [top, bot].forEach(pk => { pk.position.y += (1 - inn) * 0.6; });
      hero = top.position.y > bot.position.y ? top.children[half - 1] : bot.children[half - 1];
    };
  }

  /* ---------- size, time, and the exit ---------- */
  function size() {
    const r = host.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const pull = Math.max(1, 0.95 / camera.aspect);                 // narrow frames step back so the cards still fit
    camera.position.copy(camBase).sub(look).multiplyScalar(pull).add(look); camera.lookAt(look);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(size); ro.observe(host); size();

  let t0 = performance.now(), exit = null, alive = true, seen = true, raf = 0;
  const io = new IntersectionObserver(es => { seen = es[0].isIntersecting; }); io.observe(host);
  const q1 = new THREE.Quaternion(), qBackCam = new THREE.Quaternion(), flip = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  function frame(now) {
    if (!alive) return; raf = requestAnimationFrame(frame);
    if (!seen || document.hidden) return;
    const t = REDUCED ? 4 : Math.max(0, (now - t0) / 1000), inn = REDUCED ? 1 : ease(clamp01(t / 1.5));
    if (!exit) update(t, inn);
    else {
      // the chosen card comes up toward you and turns over
      const k = clamp01((now - exit.t) / 1500), m = ease(clamp01(k / 0.75)), fl = ease(clamp01((k - 0.3) / 0.7));
      hero.position.lerpVectors(exit.p0, exit.p1, m); hero.position.y += Math.sin(Math.PI * m) * 0.25;
      q1.slerpQuaternions(exit.q0, qBackCam, m); flip.setFromAxisAngle(Y, Math.PI * fl); hero.quaternion.copy(q1).multiply(flip);
      if (k >= 1 && !exit.done) { exit.done = true; setTimeout(() => opts.onDone && opts.onDone(), 450); }
    }
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  return {
    replay() { exit = null; t0 = performance.now(); },
    ready() {
      if (exit || !hero) return;
      scene.attach(hero);                                            // keep where it is, in world space
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      qBackCam.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(Y, Math.PI));   // back toward you, upright
      exit = { t: performance.now(), p0: hero.position.clone(), q0: hero.quaternion.clone(), p1: camera.position.clone().addScaledVector(dir, 6.4), done: false };
    },
    stop() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.forceContextLoss(); cv.remove(); },
  };
}
window.BaikCardLoader = { mount, kinds: ['draw', 'fan', 'cut'] };
window.dispatchEvent(new Event('baik-card-loader'));

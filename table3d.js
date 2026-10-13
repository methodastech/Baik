/* Baik · "The table", WebGL (Three.js). Nine cubes, one per need, wait at the back of a quiet
   paper table. Tap a cube and it rolls forward onto the table; Baik deals the cards that fit every
   cube set down, best fit first, face up from the deck at the corner. Tap a dealt card to lift it
   and read it. Left alone, the table plays one example by itself until someone touches it.
   Falls back to the screenshot when WebGL or the module CDN is unavailable. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('t3');
const DATA = window.BAIK_TABLE || [];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const NEEDS = [
  ['rezeki', 'Rizq'], ['nikah', 'Marriage'], ['kesihatan', 'Health'], ['hati', 'Heart'], ['duka', 'Grief'],
  ['perjalanan', 'Travel'], ['hikmah', 'Study'], ['perlindungan', 'Protection'], ['keampunan', 'Forgiveness'],
];
const MAX_DEAL = 6;

function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (host && DATA.length && webglOK()) start();

async function start() {
  /* ---------- renderer ---------- */
  const canvas = document.createElement('canvas'); canvas.className = 't3-cv';
  canvas.setAttribute('aria-label', 'A table with nine cubes, one for each need. Choose cubes and Baik deals the duas that fit them.');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2.5, Math.max(2, (devicePixelRatio || 1) * 1.25)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const LOOK = new THREE.Vector3(0, 0, 0.1), CAM = new THREE.Vector3(0, 9.6, 8.4);
  camera.position.copy(CAM); camera.lookAt(LOOK);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe8e5de, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 10, 5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 8; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(key);

  /* the table: warm paper that fades into the page at its edges */
  const vg = document.createElement('canvas'); vg.width = vg.height = 512; const vx = vg.getContext('2d');
  const grd = vx.createRadialGradient(256, 256, 60, 256, 256, 256);
  grd.addColorStop(0, 'rgba(242,240,235,.75)'); grd.addColorStop(0.55, 'rgba(245,243,239,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  vx.fillStyle = grd; vx.fillRect(0, 0, 512, 512);
  const vt = new THREE.CanvasTexture(vg); vt.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 7.6), new THREE.MeshBasicMaterial({ map: vt, transparent: true, depthWrite: false }));
  paper.rotation.x = -Math.PI / 2; paper.position.set(0, -0.002, -0.2); scene.add(paper);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), new THREE.ShadowMaterial({ opacity: 0.09 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // a fine rule where the cubes wait
  const rule = new THREE.Mesh(new THREE.PlaneGeometry(9.8, 0.012), new THREE.MeshBasicMaterial({ color: 0x1e2124, transparent: true, opacity: 0.12 }));
  rule.rotation.x = -Math.PI / 2; rule.position.set(0, 0.001, -2.2); scene.add(rule);

  /* ---------- painting ---------- */
  await Promise.all(['600 60px "Scheherazade New"', '600 40px "Space Grotesk"', 'italic 400 26px Saira', '500 20px "JetBrains Mono"']
    .map(f => document.fonts.load(f, f.includes('Scheh') ? DATA.slice(0, 20).map(d => d.ar).join(' ') : 'Aa'))).catch(() => {});
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const loadImg = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
  function wrap(x, text, maxW) { const ws = String(text).split(/\s+/), out = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
  const NAME = Object.fromEntries(NEEDS);

  function cubeTexture(label, n, ink) {
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d');
    x.fillStyle = ink ? '#1E2124' : '#FFFFFF'; x.fillRect(0, 0, S, S);
    x.strokeStyle = ink ? 'rgba(255,255,255,.18)' : 'rgba(30,33,36,.12)'; x.lineWidth = 3; rr(x, 14, 14, S - 28, S - 28, 22); x.stroke();
    x.fillStyle = ink ? '#FFFFFF' : '#1E2124'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let fz = 50; x.font = `600 ${fz}px "Space Grotesk"`; while (x.measureText(label).width > S - 44 && fz > 26) { fz -= 2; x.font = `600 ${fz}px "Space Grotesk"`; }
    x.fillText(label, S / 2, S / 2 + 4);
    x.font = '500 18px "JetBrains Mono"'; x.fillStyle = ink ? 'rgba(255,255,255,.55)' : 'rgba(30,33,36,.45)';
    x.fillText(String(n).padStart(2, '0'), S / 2, 48);
    // the diamond that numbers every card
    x.save(); x.translate(S / 2, S - 50); x.rotate(Math.PI / 4); x.fillRect(-6, -6, 12, 12); x.restore();
    return tex(cv);
  }
  const W = 512, H = 768;
  const faceCache = {};
  async function faceTexture(d) {
    if (faceCache[d.i]) return faceCache[d.i];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#DBDBDB'; x.lineWidth = 2; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke();
    x.fillStyle = '#1E2124'; x.textBaseline = 'middle'; let tz = 28; x.font = `600 ${tz}px "Space Grotesk"`;
    while (x.measureText(d.t).width > W - 76 && tz > 19) { tz -= 1; x.font = `600 ${tz}px "Space Grotesk"`; }
    let t = d.t; while (x.measureText(t).width > W - 76 && t.length > 4) t = t.slice(0, -2) + '…';
    x.fillText(t, 38, 62); x.fillStyle = '#E6E6E6'; x.fillRect(26, 96, W - 52, 2);
    const AY = 104, AH = 220, img = await loadImg(d.art);
    x.save(); rr(x, 26, AY, W - 52, AH, 4); x.clip();
    if (img) { const s = Math.max((W - 52) / img.width, AH / img.height); x.drawImage(img, 26 + ((W - 52) - img.width * s) / 2, AY + (AH - img.height * s) / 2, img.width * s, img.height * s); }
    else { x.fillStyle = '#F3F3F1'; x.fillRect(26, AY, W - 52, AH); x.strokeStyle = 'rgba(30,33,36,.22)'; x.lineWidth = 1.2;
      for (let k = 1; k <= 6; k++) { const r = k * 15; x.save(); x.translate(W / 2, AY + AH / 2); for (const o of [0, Math.PI / 4]) { x.rotate(o); x.strokeRect(-r, -r, r * 2, r * 2); } x.restore(); } }
    x.restore();
    x.textBaseline = 'alphabetic'; let y = AY + AH + 40;
    x.fillStyle = '#6E6E6E'; x.font = '500 16px "JetBrains Mono"';
    x.fillText(d.cats.map(k => NAME[k]).join(' · ').toUpperCase(), 38, y); y += 22;
    let size = 40, lines; x.direction = 'rtl'; x.textAlign = 'center';
    for (; size > 22; size -= 2) { x.font = `600 ${size}px "Scheherazade New"`; lines = wrap(x, d.ar, W - 80); if (lines.length <= 4) break; }
    if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] += ' …'; }
    x.fillStyle = '#1E2124'; const lh = size * 1.7; y += size * 1.05;
    lines.forEach((l, k) => x.fillText(l, W / 2, y + k * lh)); y += (lines.length - 1) * lh + size * 0.75 + 24;
    x.direction = 'ltr'; x.textAlign = 'left'; x.font = 'italic 400 19px Saira'; x.fillStyle = '#4A4F57';
    let en = wrap(x, '“' + d.en + '”', W - 80); const room = Math.max(1, Math.floor((H - 92 - y) / 27));
    if (en.length > room) { en = en.slice(0, room); en[room - 1] = en[room - 1].replace(/\W*\S*$/, '') + ' …”'; }
    en.forEach((l, k) => x.fillText(l, 40, y + k * 27));
    x.fillStyle = '#E6E6E6'; x.fillRect(26, H - 76, W - 52, 2);
    x.fillStyle = '#6E6E6E'; x.font = '500 15px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText(d.src.toUpperCase(), 38, H - 46);
    return (faceCache[d.i] = tex(cv));
  }
  const LOGO = await loadImg('assets/logo/baik-logo_caps-white.png');
  const backTex = (() => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#25282D'); g.addColorStop(1, '#141619'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 2; rr(x, 22, 22, W - 44, H - 44, 16); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.2;
    for (let k = 1; k <= 7; k++) { const r = k * 24; x.save(); x.translate(W / 2, H / 2); for (const o of [0, Math.PI / 4]) { x.rotate(o); x.strokeRect(-r, -r, r * 2, r * 2); } x.restore(); }
    x.fillStyle = '#1B1D21'; x.beginPath(); x.arc(W / 2, H / 2, 74, 0, Math.PI * 2); x.fill();
    if (LOGO) { const lw = 110, lh = lw * LOGO.height / LOGO.width; x.drawImage(LOGO, W / 2 - lw / 2, H / 2 - lh / 2, lw, lh); }
    return tex(cv);
  })();

  /* ---------- cubes ---------- */
  const CS = 0.74, cubeGeo = new RoundedBoxGeometry(CS, CS, CS, 5, 0.09);
  const cubes = NEEDS.map(([k, label], i) => {
    const off = new THREE.MeshStandardMaterial({ map: cubeTexture(label, i + 1, false), roughness: 0.5 });
    const on = new THREE.MeshStandardMaterial({ map: cubeTexture(label, i + 1, true), roughness: 0.35, metalness: 0.1 });
    const m = new THREE.Mesh(cubeGeo, off); m.castShadow = true;
    const home = new THREE.Vector3((i - 4) * 1.08, CS / 2, -2.7), placed = new THREE.Vector3((i - 4) * 1.08, CS / 2, -1.45);
    m.position.copy(home); m.userData = { k, label, i, off, on, home, placed, active: false, p: 0, hover: 0 };
    scene.add(m); return m;
  });

  /* ---------- the deck and the dealt cards ---------- */
  const CW = 1.18, CH = 1.77, cardGeo = new RoundedBoxGeometry(CW, CH, 0.024, 4, 0.06);
  const edge = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.6 });
  const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.35, metalness: 0.12 });
  const blank = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const PILE = new THREE.Vector3(4.2, 0, 1.0);
  for (let k = 0; k < 8; k++) {                 // the deck itself, face down at the corner
    const c = new THREE.Mesh(cardGeo, [edge, edge, edge, edge, backMat, blank]);
    c.rotation.set(-Math.PI / 2, 0, 0.08 + Math.sin(k * 5.1) * 0.04);
    c.position.set(PILE.x + Math.sin(k * 2.3) * 0.02, 0.014 + k * 0.026, PILE.z + Math.cos(k * 1.7) * 0.02);
    c.castShadow = true; c.receiveShadow = true; scene.add(c);
  }
  const pileTop = new THREE.Vector3(PILE.x, 0.25, PILE.z);
  const SLOTS = [[-2.85, 0.35, -0.10], [-0.95, 0.15, 0.06], [0.95, 0.3, -0.05], [2.85, 0.1, 0.08], [-1.9, 2.35, 0.05], [0.0, 2.45, -0.07]];
  const dealt = [];   // {g (holder), mesh, d, t0, from, to, state:'in'|'out'|'rest', yaw}

  function score() {
    const act = cubes.filter(c => c.userData.active).map(c => c.userData.k);
    if (!act.length) return { act, list: [] };
    const list = DATA.map(d => ({ d, n: d.cats.filter(k => act.includes(k)).length })).filter(r => r.n)
      .sort((a, b) => b.n - a.n || (a.d.art ? -1 : 0) - (b.d.art ? -1 : 0) || a.d.i - b.d.i).slice(0, MAX_DEAL);
    return { act, list };
  }
  let dealToken = 0;
  async function redeal() {
    const token = ++dealToken, now = performance.now();
    dealt.forEach((c, j) => { if (c.state !== 'out') { c.state = 'out'; c.t0 = now + j * 60; c.from = c.g.position.clone(); c.fromYaw = c.g.rotation.y; } });
    lift(null);
    const { act, list } = score();
    status(act, list);
    const faces = await Promise.all(list.map(r => faceTexture(r.d)));
    if (token !== dealToken) return;
    const start = performance.now() + (dealt.some(c => c.state === 'out') ? 380 : 0);
    list.forEach((r, j) => {
      const g = new THREE.Group(), mesh = new THREE.Mesh(cardGeo, [edge, edge, edge, edge, new THREE.MeshBasicMaterial({ map: faces[j], toneMapped: false }), backMat]);
      mesh.castShadow = true; mesh.rotation.y = Math.PI; g.add(mesh);
      g.rotation.x = -Math.PI / 2; g.position.copy(pileTop); scene.add(g);
      const s = SLOTS[j], to = new THREE.Vector3(s[0], 0.02 + j * 0.002, s[1]);
      dealt.push({ g, mesh, d: r.d, n: r.n, t0: start + j * 140, from: pileTop.clone(), to, yaw: s[2], fromYaw: 0.18, state: 'in', lift: 0 });
    });
  }

  /* ---------- HTML around it ---------- */
  const hint = document.createElement('div'); hint.className = 't3-hint'; hint.textContent = 'Tap the cubes for what you are facing'; host.appendChild(hint);
  const bar = document.createElement('div'); bar.className = 't3-bar'; bar.setAttribute('aria-live', 'polite'); host.appendChild(bar);
  function status(act, list) {
    if (!act.length) { bar.innerHTML = '<span>Nothing on the table yet.</span>'; return; }
    const full = list.filter(r => r.n === act.length).length;
    bar.innerHTML = '<b>' + act.map(k => NAME[k]).join(' + ') + '</b><span>' + (act.length === 1 ? list.length + ' cards dealt'
      : full ? full + (full === 1 ? ' card holds' : ' cards hold') + ' all of them' : 'the closest cards') + '</span><button type="button">Clear the table</button>';
    bar.querySelector('button').onclick = () => { stopDemo(); cubes.forEach(c => c.userData.active = false); redeal(); };
  }
  status([], []);
  const peek = document.createElement('div'); peek.className = 't3-peek'; peek.hidden = true; host.appendChild(peek);

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), par = new THREE.Vector2();
  let hoverObj = null, lifted = null;
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(cubes.concat(dealt.filter(c => c.state === 'rest').map(c => c.mesh)), false)[0];
    return hit ? hit.object : null;
  }
  function lift(c) {
    if (lifted) lifted.lifting = false;
    lifted = c && c !== lifted ? c : null; if (lifted) lifted.lifting = true;
    if (lifted) { const d = lifted.d; peek.innerHTML = '<b>' + esc(d.t) + '</b><span>' + esc(d.src) + '</span><a href="Khayr.html">Open in Baik</a>'; peek.hidden = false; }
    else peek.hidden = true;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); par.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    hoverObj = pick(e); canvas.style.cursor = hoverObj ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerleave', () => { hoverObj = null; par.set(0, 0); });
  canvas.addEventListener('click', e => {
    stopDemo();
    const o = pick(e);
    if (!o) { lift(null); return; }
    if (o.userData && o.userData.k) { o.userData.active = !o.userData.active; redeal(); return; }
    const c = dealt.find(x => x.mesh === o); if (c) lift(c);
  });

  /* ---------- left alone, the table shows itself once ---------- */
  let demo = [], demoDone = false;
  function stopDemo() { demo.forEach(clearTimeout); demo = []; demoDone = true; hint.classList.add('gone'); }
  function runDemo() {
    if (demoDone || REDUCED) return; demoDone = true;
    const at = k => cubes.find(c => c.userData.k === k);
    demo.push(setTimeout(() => { at('hati').userData.active = true; redeal(); }, 1200));
    demo.push(setTimeout(() => { at('hikmah').userData.active = true; redeal(); }, 3600));
  }

  /* ---------- size, visibility ---------- */
  function resize() {
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.95 ? 44 : 30; camera.updateProjectionMatrix();
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(9.5, 5.15 / Math.tan(hf / 2) + 0.4);
    CAM.copy(LOOK).addScaledVector(new THREE.Vector3(0, 8.6, 8.4).normalize(), dist);
  }
  new ResizeObserver(resize).observe(host); resize(); camera.position.copy(CAM); camera.lookAt(LOOK);
  let onScreen = false;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (onScreen) runDemo(); }, { threshold: 0.35 }).observe(host);
  host.closest('.t3-wrap') && host.closest('.t3-wrap').classList.add('gl');

  /* ---------- loop ---------- */
  const clock = new THREE.Clock(), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, damp = (k, dt) => 1 - Math.exp(-k * dt);
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpO = new THREE.Object3D();
  window._t3 = { dealt, camera };   // for automated checks
  (function frame() {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime, now = performance.now();
    // cubes roll forward onto the table, and back
    cubes.forEach(c => {
      const u = c.userData, target = u.active ? 1 : 0;
      u.p += (target - u.p) * (REDUCED ? 1 : damp(6, dt)); if (Math.abs(target - u.p) < 0.002) u.p = target;
      u.hover += ((hoverObj === c ? 1 : 0) - u.hover) * damp(12, dt);
      c.position.lerpVectors(u.home, u.placed, u.p);
      c.position.y = CS / 2 + Math.sin(Math.PI * u.p) * 0.55 + u.hover * 0.08 + (u.active ? 0 : Math.sin(t * 1.3 + u.i) * 0.012);
      c.rotation.x = -Math.PI / 2 * u.p; c.rotation.y = (u.active ? 0.06 : 0) * Math.sin(u.i * 2.1);
      c.material = u.p > 0.5 ? u.on : u.off;
    });
    // cards: dealt from the deck turning over in flight, gathered back face down
    for (let j = dealt.length - 1; j >= 0; j--) {
      const c = dealt[j], D = REDUCED ? 1 : 620;
      if (c.state === 'in' || c.state === 'out') {
        const k = Math.max(0, Math.min(1, (now - c.t0) / D)), e = ease(k);
        const from = c.state === 'in' ? c.from : c.from, to = c.state === 'in' ? c.to : pileTop;
        c.g.position.lerpVectors(from, to, e); c.g.position.y += Math.sin(Math.PI * e) * 0.9;
        const yaw0 = c.state === 'in' ? c.fromYaw : c.fromYaw, yaw1 = c.state === 'in' ? c.yaw : 0.18;
        c.g.rotation.z = yaw0 + (yaw1 - yaw0) * e;
        c.mesh.rotation.y = c.state === 'in' ? Math.PI * (1 - e) : Math.PI * e;
        if (k >= 1) { if (c.state === 'in') c.state = 'rest'; else { scene.remove(c.g); dealt.splice(j, 1); continue; } }
      }
      if (c.state === 'rest') {
        c.lift += ((c.lifting ? 1 : hoverObj === c.mesh ? 0.18 : 0) - c.lift) * damp(9, dt);
        // lifted: rise toward the camera and tilt up to be read
        tmpV.copy(c.to); tmpV.y += 0.02;
        const up = new THREE.Vector3().copy(LOOK).lerp(camera.position, 0.42); up.y -= 0.6;
        c.g.position.lerpVectors(tmpV, up, c.lifting ? c.lift : 0); c.g.position.y += c.lifting ? 0 : c.lift * 0.35;
        c.g.rotation.x = -Math.PI / 2 + (c.lifting ? c.lift * 0.95 : 0); c.g.rotation.z = c.yaw * (1 - (c.lifting ? c.lift : 0));
        c.g.scale.setScalar(1 + (c.lifting ? c.lift * 0.55 : 0));
        c.g.renderOrder = c.lifting ? 10 : 0;
        c.mesh.castShadow = !c.lifting;   // a card held up to read throws no slab across the table
      }
    }
    camera.position.x += (CAM.x + par.x * 0.6 - camera.position.x) * damp(2.5, dt);
    camera.position.y += (CAM.y - par.y * 0.35 - camera.position.y) * damp(2.5, dt);
    camera.position.z += (CAM.z - camera.position.z) * damp(2.5, dt);
    camera.lookAt(LOOK);
    renderer.render(scene, camera);
  })();
}

/* Baik · "Draw a card", the hero's WebGL deck (Three.js).
   Sixteen real cards lie face down in a slow ring around a polished Rub el Hizb star.
   Drag to spin, hover to lift, tap a card (or a "what are you facing" chip) to draw it:
   it flies forward and turns over to show the dua with its source.
   If WebGL or the module CDN is unavailable the 2D card fan stays, untouched. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('d3');
const deckEl = document.getElementById('deck');
const DATA = window.BAIK_DECK || [], CHIPS = window.BAIK_DECK_CHIPS || [];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
if (host && deckEl && DATA.length && webglOK()) start();

async function start() {
  /* ---------- renderer, scene, camera ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'd3-cv';
  canvas.setAttribute('aria-label', 'A 3D deck of dua cards. Drag to spin it; choose a card to draw it.');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const PR_HI = Math.min(2.5, Math.max(2, (devicePixelRatio || 1) * 1.25));
  renderer.setPixelRatio(PR_HI);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffffff, 14, 23);   // far cards soften into the white page; the near ones stay crisp
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const CAM = new THREE.Vector3(0, 4.6, 14.4), LOOK = new THREE.Vector3(0, 0.9, 0);
  camera.position.copy(CAM); camera.lookAt(LOOK);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e6df, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(4.5, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 9;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xfff4e0, 0.6); rim.position.set(-6, 4, -6); scene.add(rim);

  /* the floor only shows the shadows, plus two fine rings like the particle scenes */
  const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.ShadowMaterial({ opacity: 0.06 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  [4.9, 5.4].forEach((r, i) => {
    const pts = []; for (let k = 0; k <= 128; k++) { const a = k / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.002, Math.sin(a) * r)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x1e2124, transparent: true, opacity: i ? 0.10 : 0.18, dashSize: 0.06, gapSize: 0.08 })).computeLineDistances());
  });

  /* ---------- card faces, painted on canvas ---------- */
  await Promise.all([
    document.fonts.load('600 60px "Scheherazade New"', DATA.map(d => d.ar).join(' ')),
    document.fonts.load('600 40px "Space Grotesk"'), document.fonts.load('italic 400 28px Saira'),
    document.fonts.load('500 20px "JetBrains Mono"'),
  ]).catch(() => {});
  const W = 768, H = 1152, TS = 1024 / 768, maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loadImg = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  function rr(x, c, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
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
  function texFrom(cv) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t; }

  async function frontTexture(d, n) {
    const cv = document.createElement('canvas'); cv.width = W * TS; cv.height = H * TS; const x = cv.getContext('2d'); x.scale(TS, TS); x.imageSmoothingQuality = 'high';
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#DBDBDB'; x.lineWidth = 3; rr(x, 0, 22, 22, W - 44, H - 44, 26); x.stroke();
    // title bar
    x.fillStyle = '#1E2124'; x.textBaseline = 'middle';
    let tz = 40; x.font = '600 40px "Space Grotesk"';
    while (x.measureText(d.t).width > W - 190 && tz > 28) { tz -= 2; x.font = '600 ' + tz + 'px "Space Grotesk"'; }
    let title = d.t; while (x.measureText(title).width > W - 190 && title.length > 4) title = title.slice(0, -2) + '…';
    x.fillText(title, 56, 92); x.textAlign = 'right'; x.font = '600 34px "JetBrains Mono"'; x.fillText(String(n + 1).padStart(2, '0'), W - 56, 92); x.textAlign = 'left';
    x.fillStyle = '#E6E6E6'; x.fillRect(40, 140, W - 80, 2);
    // art window: the card's photograph, or a patterned panel
    const AX = 40, AY = 150, AW = W - 80, AH = 360;
    const img = await loadImg(d.art);
    x.save(); rr(x, 0, AX, AY, AW, AH, 6); x.clip();
    if (img) {
      const s = Math.max(AW / img.width, AH / img.height), iw = img.width * s, ih = img.height * s;
      x.drawImage(img, AX + (AW - iw) / 2, AY + (AH - ih) / 2, iw, ih);
    } else {
      x.fillStyle = '#F3F3F1'; x.fillRect(AX, AY, AW, AH);
      lattice(x, AX + AW / 2, AY + AH / 2, AH * 0.62, 0.28, '#1E2124');
      x.fillStyle = '#1E2124'; x.font = '500 22px "JetBrains Mono"'; x.textAlign = 'center';
      x.fillText(d.need.toUpperCase(), AX + AW / 2, AY + AH - 34); x.textAlign = 'left';
    }
    x.restore();
    // need label, then the Arabic and the meaning, each placed below the last on its own baseline
    x.textBaseline = 'alphabetic';
    let y = AY + AH + 50;
    x.fillStyle = '#6E6E6E'; x.font = '500 22px "JetBrains Mono"'; x.fillText((d.kind === 'surah' ? 'SURAH · ' : 'DUA · ') + d.need.toUpperCase(), 56, y);
    y += 30;                                   // gap under the label
    // Arabic, shrunk until it fits four lines; harakat stand ~0.95 em above the baseline
    let size = 60, lines;
    x.direction = 'rtl'; x.textAlign = 'center';
    for (; size > 30; size -= 3) { x.font = `600 ${size}px "Scheherazade New"`; lines = wrap(x, d.ar, W - 130); if (lines.length <= 4) break; }
    if (lines.length > 4) { lines = lines.slice(0, 4); lines[3] += ' …'; }
    x.fillStyle = '#1E2124';
    const lh = size * 1.7;
    y += size * 1.05;                          // first Arabic baseline, clear of the label
    lines.forEach((l, k) => x.fillText(l, W / 2, y + k * lh));
    y += (lines.length - 1) * lh + size * 0.75 + 34;
    // meaning, as many lines as fit above the source rule
    x.direction = 'ltr'; x.textAlign = 'left'; x.font = 'italic 400 27px Saira'; x.fillStyle = '#4A4F57';
    let en = wrap(x, '“' + d.en + '”', W - 120); const room = Math.max(1, Math.floor((H - 132 - y) / 38));
    if (en.length > room) { en = en.slice(0, room); en[room - 1] = en[room - 1].replace(/\W*\S*$/, '') + ' …”'; }
    en.forEach((l, k) => x.fillText(l, 60, y + k * 38));
    // source, always on the card
    x.fillStyle = '#E6E6E6'; x.fillRect(40, H - 112, W - 80, 2);
    x.fillStyle = '#6E6E6E'; x.font = '500 21px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText(d.src.toUpperCase(), 56, H - 70);
    return texFrom(cv);
  }
  const LOGO_W = await loadImg('assets/logo/baik-logo_caps-white.png');
  function backTexture() {
    const cv = document.createElement('canvas'); cv.width = W * TS; cv.height = H * TS; const x = cv.getContext('2d'); x.scale(TS, TS); x.imageSmoothingQuality = 'high';
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#24272C'); g.addColorStop(1, '#141619');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 2; rr(x, 0, 30, 30, W - 60, H - 60, 24); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.10)'; rr(x, 0, 46, 46, W - 92, H - 92, 18); x.stroke();
    lattice(x, W / 2, H / 2, 330, 0.5, '#FFFFFF');
    x.fillStyle = '#1B1D21'; x.beginPath(); x.arc(W / 2, H / 2, 118, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (LOGO_W) { const lw = 168, lh = lw * LOGO_W.height / LOGO_W.width; x.drawImage(LOGO_W, W / 2 - lw / 2, H / 2 - lh / 2, lw, lh); }
    else { x.fillStyle = '#FFFFFF'; x.font = '700 70px "Space Grotesk"'; x.fillText('Baik', W / 2, H / 2 + 4); }
    x.font = '500 20px "JetBrains Mono"'; x.fillStyle = 'rgba(255,255,255,.55)';
    x.fillText('A DECK OF AUTHENTIC DUAS', W / 2, H - 100);
    return texFrom(cv);
  }

  /* ---------- the ring of cards ---------- */
  const N = DATA.length, R = 4.0, CW = 1.32, CH = 1.98;
  const geo = new RoundedBoxGeometry(CW, CH, 0.03, 6, 0.07);
  const edge = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 });
  const backMat = new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.35, metalness: 0.15 });
  const blank = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const ring = new THREE.Group(); ring.position.y = 0.02; scene.add(ring);
  /* the centre: what is left of the deck, face down, slightly squared up by hand */
  const pile = new THREE.Group();
  for (let k = 0; k < 9; k++) {
    const c = new THREE.Mesh(geo, [edge, edge, edge, edge, backMat, blank]);
    c.rotation.set(-Math.PI / 2, 0, (Math.sin(k * 7.3) * 0.06));
    c.position.set(Math.sin(k * 3.1) * 0.03, 0.02 + k * 0.034, Math.cos(k * 2.7) * 0.03);
    c.castShadow = true; c.receiveShadow = true; pile.add(c);
  }
  pile.rotation.y = 0.35; scene.add(pile);
  const cards = DATA.map((d, i) => {
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(geo, [edge, edge, edge, edge, blank, backMat]);
    mesh.castShadow = true; mesh.rotation.y = Math.PI;      // face down: the back looks outward
    holder.add(mesh);
    const a = i / N * Math.PI * 2;
    holder.userData = { i, a, d, mesh, lift: 0, state: 'deal', t0: performance.now() + 250 + i * 70 };
    holder.position.set(0, 0.05 + i * 0.03, 0); holder.rotation.set(-Math.PI / 2, 0, 0);   // starts as a stacked deck
    ring.add(holder);
    frontTexture(d, i).then(t => { mesh.material[4] = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); /* unlit: the face reads exactly as painted */ });
    return holder;
  });
  const slot = (h, out = new THREE.Object3D()) => {
    const a = h.userData.a; out.position.set(Math.sin(a) * R, CH / 2 + 0.06, Math.cos(a) * R); out.rotation.set(0, a, 0); out.updateMatrix(); return out;
  };

  /* ---------- interaction ---------- */
  let ringRot = 0, ringVel = REDUCED ? 0 : 0.0016, dragging = false, moved = 0, lastX = 0, idleT = 0;
  let hovered = null, drawn = null, aimRot = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), par = new THREE.Vector2();
  const meshes = cards.map(c => c.userData.mesh);
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(meshes, false)[0];
    return hit ? hit.object.parent : null;
  }
  canvas.addEventListener('pointerdown', e => { dragging = true; moved = 0; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); idleT = 0; });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    par.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    if (dragging) {
      const dx = e.clientX - lastX; lastX = e.clientX; moved += Math.abs(dx); ringVel = dx * 0.0042; idleT = 0;
      // a real drag cancels a draw that is still waiting for the ring to turn
      if (moved > 6 && aimRot !== null) { aimRot = null; if (drawn && drawn.userData.pending) putBack(); }
    }
    const h = pick(e); hovered = h && h !== drawn && h.userData.state === 'ring' ? h : null;
    canvas.style.cursor = dragging ? 'grabbing' : (pick(e) ? 'pointer' : 'grab');
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; par.set(0, 0); });
  const up = e => {
    if (!dragging) return; dragging = false;
    if (moved < 6) {
      const h = pick(e);
      if (drawn && (!h || h === drawn)) putBack();
      else if (h) draw(h);
    }
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', () => { dragging = false; });
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawn) putBack(); });

  /* draw: spin the ring so the card comes round to the front, lift it out, turn it over */
  function draw(h) {
    if (drawn && drawn !== h) putBack(true);
    const a = h.userData.a; let target = -a;
    target += Math.round((ringRot - target) / (Math.PI * 2)) * Math.PI * 2;   // shortest way round
    aimRot = target; ringVel = 0; h.userData.pending = true; drawn = h; idleT = 0;
    showCaption(h.userData.d);
  }
  function release(h) {
    h.userData.pending = false; h.userData.state = 'drawn'; h.userData.mesh.castShadow = false;
    scene.attach(h);
  }
  function putBack(quick) {
    const h = drawn; if (!h) return; drawn = null; h.userData.pending = false;
    h.userData.mesh.castShadow = true; hideCaption();
    /* a card still waiting for the ring to turn never left its slot: it simply stays. Only a card that
       was lifted out into the scene flies back, so its target is never mixed up with the ring's space. */
    h.userData.state = h.parent === ring ? 'ring' : 'returning';
    chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', 'false'));
  }

  /* ---------- HTML around the canvas: chips, caption, hint ---------- */
  const chips = document.createElement('div'); chips.className = 'd3-chips'; chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'What are you facing?');
  chips.innerHTML = '<span class="d3-k">What are you facing?</span>' + CHIPS.map(([label, gi]) => `<button type="button" data-gi="${gi}" aria-pressed="false">${label}</button>`).join('');
  host.appendChild(chips);
  chips.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const h = cards.find(c => c.userData.d.i === +b.dataset.gi); if (!h) return;
    chips.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (drawn === h) { putBack(); return; }
    draw(h);
  });
  const cap = document.createElement('div'); cap.className = 'd3-cap'; cap.hidden = true; cap.setAttribute('aria-live', 'polite');
  host.appendChild(cap);
  function showCaption(d) {
    cap.innerHTML = `<b>${esc(d.t)}</b><span>${esc(d.src)}</span><a href="Khayr.html">Open in Baik</a><button type="button">Put it back</button>`;
    cap.hidden = false; cap.querySelector('button').onclick = () => putBack();
  }
  function hideCaption() { cap.hidden = true; }
  const hint = document.createElement('div'); hint.className = 'd3-hint'; hint.textContent = 'Drag to spin · tap a card to draw it'; host.appendChild(hint);
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- size, visibility, loop ---------- */
  function resize() {
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.9 ? 40 : 30;     // a narrow phone needs a wider lens to fit the ring
    camera.updateProjectionMatrix();
    // distance at which the ring's widest point (radius + half a card + a margin) fits the width
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(13.5, (R + 0.85) / Math.tan(hf / 2) + 0.3);
    const dir = new THREE.Vector3(0, 4.6, 14.4).normalize();
    CAM.copy(LOOK).addScaledVector(dir, dist);
    scene.fog.near = dist - 1; scene.fog.far = dist + 9;
  }
  new ResizeObserver(resize).observe(host); resize(); camera.position.copy(CAM); camera.lookAt(LOOK);
  let onScreen = true;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(host);
  deckEl.classList.add('gl'); document.documentElement.classList.remove('d3-pending');

  const tmp = new THREE.Object3D(), FOCUS = new THREE.Vector3(), q = new THREE.Quaternion(), clock = new THREE.Clock();
  function damp(k, dt) { return 1 - Math.exp(-k * dt); }
  let fN = 0, fT0 = 0, tuned = false;
  function frame() {
    requestAnimationFrame(frame);
    if (!tuned && onScreen && !document.hidden) { const n = performance.now(); if (!fN) fT0 = n; if (++fN === 90) { tuned = true; if ((n - fT0) / 89 > 26) { renderer.setPixelRatio(1.5); resize(); } } }
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime, now = performance.now();
    idleT += dt;
    // ring: aim at a drawn card, else coast with drag momentum, else turn slowly on its own
    if (aimRot !== null) {
      ringRot += (aimRot - ringRot) * damp(5, dt);
      if (Math.abs(aimRot - ringRot) < 0.01) { ringRot = aimRot; aimRot = null; if (drawn && drawn.userData.pending) release(drawn); }
    } else if (!dragging) {
      ringRot += ringVel;
      const cruise = REDUCED || drawn ? 0 : 0.0016;
      ringVel += (cruise - ringVel) * damp(idleT > 1.5 ? 1.2 : 0.4, dt);
    } else ringRot += ringVel;
    ring.rotation.y = ringRot;
    // cards
    cards.forEach(h => {
      const u = h.userData, k = REDUCED ? 1 : damp(7, dt);
      if (u.state === 'deal') {
        if (now < u.t0 && !REDUCED) return;
        slot(h, tmp); h.position.lerp(tmp.position, REDUCED ? 1 : damp(4.5, dt));
        q.setFromEuler(tmp.rotation); h.quaternion.slerp(q, REDUCED ? 1 : damp(4.5, dt));
        if (h.position.distanceTo(tmp.position) < 0.01) u.state = 'ring';
        return;
      }
      if (u.state === 'ring') {
        slot(h, tmp);
        u.lift += ((h === hovered ? 1 : 0) - u.lift) * damp(10, dt);
        const out = 0.35 * u.lift;
        h.position.set(tmp.position.x + Math.sin(u.a) * out, tmp.position.y + 0.32 * u.lift + Math.sin(t * 1.1 + u.i) * 0.03, tmp.position.z + Math.cos(u.a) * out);
        h.rotation.set(-0.12 * u.lift, u.a, 0);
        u.mesh.rotation.y += (Math.PI - u.mesh.rotation.y) * k;
        return;
      }
      if (u.state === 'drawn') {
        // in front of the camera, a little below centre, turned to face it, front up
        FOCUS.set(0, 1.5, 0).lerp(camera.position, 0.56);
        h.position.lerp(FOCUS, k);
        tmp.position.copy(h.position); tmp.lookAt(camera.position); h.quaternion.slerp(tmp.quaternion, k);
        u.mesh.rotation.y += (0 + Math.sin(t * 0.8) * 0.05 - u.mesh.rotation.y) * damp(4, dt);
        h.scale.setScalar(h.scale.x + (1.32 - h.scale.x) * k);
        return;
      }
      if (u.state === 'returning') {
        if (h.parent !== scene) { u.state = 'ring'; h.scale.setScalar(1); return; }
        slot(h, tmp); ring.updateMatrixWorld(); tmp.applyMatrix4(ring.matrixWorld);
        h.position.lerp(tmp.position, k); h.quaternion.slerp(tmp.quaternion, k);
        h.scale.setScalar(h.scale.x + (1 - h.scale.x) * k);
        u.mesh.rotation.y += (Math.PI - u.mesh.rotation.y) * k;
        if (h.position.distanceTo(tmp.position) < 0.02) { ring.attach(h); h.scale.setScalar(1); u.state = 'ring'; }
      }
    });
    // centre piece and a camera that leans with the pointer
      camera.position.x += (CAM.x + par.x * 0.9 - camera.position.x) * damp(2.5, dt);
    camera.position.y += (CAM.y - par.y * 0.5 - camera.position.y) * damp(2.5, dt);
    camera.position.z += (CAM.z - camera.position.z) * damp(2.5, dt);
    camera.lookAt(LOOK);
    renderer.render(scene, camera);
  }
  frame();
}

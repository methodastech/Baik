/* Baik · "The open mushaf", WebGL (Three.js). A Qur'an lies open on a rehal. Its paper leaves turn
   with a soft curl, right to left the way a mushaf is read: drag a page across, use the arrows, or
   leave it and it turns by itself, slowly. Each spread is one short surah from the deck: the Arabic
   on the right-hand page, the meaning and the source on the left. Monochrome paper, nothing loud.
   Every couple of turns the right-hand page lifts off the book as a Baik card: it shrinks to a card,
   turns over to show the deck's back, turns again, and hangs a moment under "Open this card" before
   it settles back into the page. The page and the card are the same surah: that is the point. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('mf3');
const DATA = window.BAIK_MUSHAF || [];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (host && DATA.length && webglOK()) start();

async function start() {
  const canvas = document.createElement('canvas'); canvas.className = 'mf-cv';
  canvas.setAttribute('aria-label', 'An open mushaf. Drag a page, or use the arrows, to turn to the next surah.');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2.5, Math.max(2, (devicePixelRatio || 1) * 1.25)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  const LOOK = new THREE.Vector3(0, 0.55, 0.1), CAM = new THREE.Vector3(0, 6.4, 6.6);
  camera.position.copy(CAM); camera.lookAt(LOOK);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe7e3da, 0.75));
  const key = new THREE.DirectionalLight(0xfff8ee, 1.35); key.position.set(-3.5, 7, 4); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 7; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
  scene.add(key);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), new THREE.ShadowMaterial({ opacity: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.27; floor.receiveShadow = true; scene.add(floor);

  /* ---------- pages, painted ---------- */
  await Promise.all(['600 60px "Scheherazade New"', '600 40px "Space Grotesk"', 'italic 400 26px Saira', '400 26px Saira', '500 20px "JetBrains Mono"']
    .map(f => document.fonts.load(f, f.includes('Scheh') ? DATA.map(d => d.ar + d.sarab).join(' ') : 'Aa'))).catch(() => {});
  const PW = 1024, PH = 1440, aniso = renderer.capabilities.getMaxAnisotropy();
  const INK = '#22201C', SOFT = '#7A746A', PAPER = '#F7F3EA';
  function wrap(x, text, maxW) { const ws = String(text).split(/\s+/), out = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
  function paperBase(x, spineRight) {
    x.fillStyle = PAPER; x.fillRect(0, 0, PW, PH);
    // the gutter darkens toward the spine
    const gx = spineRight ? PW : 0, g = x.createLinearGradient(gx, 0, spineRight ? PW - 150 : 150, 0);
    g.addColorStop(0, 'rgba(60,48,30,.16)'); g.addColorStop(1, 'rgba(60,48,30,0)'); x.fillStyle = g; x.fillRect(0, 0, PW, PH);
    // fibre
    for (let k = 0; k < 2600; k++) { x.fillStyle = `rgba(90,80,60,${Math.random() * 0.035})`; x.fillRect(Math.random() * PW, Math.random() * PH, 1 + Math.random() * 2, 1); }
    // the frame: a double rule with a diamond at each corner
    const m = 70; x.strokeStyle = 'rgba(34,32,28,.55)'; x.lineWidth = 2.2; x.strokeRect(m, m, PW - 2 * m, PH - 2 * m);
    x.lineWidth = 1; x.strokeRect(m + 12, m + 12, PW - 2 * m - 24, PH - 2 * m - 24);
    x.fillStyle = 'rgba(34,32,28,.6)';
    [[m, m], [PW - m, m], [m, PH - m], [PW - m, PH - m]].forEach(([cx, cy]) => { x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); x.fillRect(-7, -7, 14, 14); x.restore(); });
  }
  function header(x, d, y) {
    // the surah's cartouche: its name in Arabic, its number and its ayat
    const w = PW - 300, h = 96, X = (PW - w) / 2;
    x.strokeStyle = 'rgba(34,32,28,.6)'; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(X + 40, y); x.lineTo(X + w - 40, y); x.lineTo(X + w, y + h / 2); x.lineTo(X + w - 40, y + h); x.lineTo(X + 40, y + h); x.lineTo(X, y + h / 2); x.closePath(); x.stroke();
    x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl';
    x.font = '600 50px "Scheherazade New"'; x.fillText('سُورَةُ ' + d.sarab, PW / 2, y + h / 2 + 4); x.direction = 'ltr';
    x.font = '500 18px "JetBrains Mono"'; x.fillStyle = SOFT;
    x.textAlign = 'left'; x.fillText(String(d.sno).padStart(3, '0'), X + 56, y + h / 2); x.textAlign = 'right'; x.fillText(d.ayat + ' AYAT', X + w - 56, y + h / 2);
  }
  const cache = {};
  function tex(cv) { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
  function arabicPage(i) {               // a right-hand page: spine on its left
    const k = 'ar' + i; if (cache[k]) return cache[k];
    const d = DATA[i], cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const x = cv.getContext('2d');
    paperBase(x, false); header(x, d, 150);
    const top = 290, bottom = PH - 190, maxW = PW - 260;
    x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillStyle = INK;
    const body = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';   // Al-Fatihah carries it as its first ayah
    let size = 64, lines, lh;
    const text = d.ar;
    for (; size > 30; size -= 2) { x.font = `500 ${size}px "Scheherazade New"`; lines = wrap(x, text, maxW); lh = size * 1.95; if (lines.length * lh + (d.sno === 1 ? 0 : size * 2.1) <= bottom - top) break; }
    let y = top + size * 1.2;
    if (d.sno !== 1) { x.font = `500 ${Math.round(size * 0.82)}px "Scheherazade New"`; x.fillStyle = SOFT; x.fillText(body, PW / 2, y); y += size * 2.0; x.fillStyle = INK; x.font = `500 ${size}px "Scheherazade New"`; }
    const block = lines.length * lh, room = bottom - y; y += Math.max(0, (room - block) / 2.4);
    lines.forEach((l, j) => x.fillText(l, PW / 2, y + j * lh));
    x.direction = 'ltr'; x.font = '500 18px "JetBrains Mono"'; x.fillStyle = SOFT; x.textAlign = 'center';
    x.fillText(String(d.place || '').toUpperCase(), PW / 2, PH - 118);
    return (cache[k] = tex(cv));
  }
  function meaningPage(i) {              // a left-hand page: spine on its right
    const k = 'en' + i; if (cache[k]) return cache[k];
    const d = DATA[i], cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const x = cv.getContext('2d');
    paperBase(x, true);
    const L = 170, maxW = PW - 340;
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.font = '500 18px "JetBrains Mono"'; x.fillStyle = SOFT; x.fillText(('SURAH ' + d.sno + ' · ' + d.ayat + ' AYAT').toUpperCase(), L, 220);
    let tz = 52; x.font = `600 ${tz}px "Space Grotesk"`; x.fillStyle = INK;
    const name = d.t.split(' · '); const title = name[0], sub = name[1] || '';
    while (x.measureText(title).width > maxW && tz > 34) { tz -= 2; x.font = `600 ${tz}px "Space Grotesk"`; }
    x.fillText(title, L, 290); x.font = '400 30px Saira'; x.fillStyle = SOFT; x.fillText(sub, L, 336);
    x.fillStyle = 'rgba(34,32,28,.25)'; x.fillRect(L, 380, 120, 2);
    let fz = 30, lines;
    for (; fz > 19; fz--) { x.font = `italic 400 ${fz}px Saira`; lines = wrap(x, '“' + d.en + '”', maxW); if (lines.length * fz * 1.6 < PH - 640) break; }
    x.fillStyle = '#3C3933'; lines.forEach((l, j) => x.fillText(l, L, 450 + j * fz * 1.6));
    x.font = '500 19px "JetBrains Mono"'; x.fillStyle = SOFT; x.fillText(String(d.src).toUpperCase(), L, PH - 196);
    x.fillStyle = 'rgba(34,32,28,.25)'; x.fillRect(L, PH - 236, PW - 340, 1.5);
    x.font = '500 16px "JetBrains Mono"'; x.fillText('BAIK · SURAH SET', L, PH - 160);
    return (cache[k] = tex(cv));
  }
  // painting is cheap per page but not free: warm the neighbours while the reader looks
  const warm = i => { [i - 1, i, i + 1].forEach(j => { if (DATA[j]) { arabicPage(j); meaningPage(j); } }); };

  /* ---------- geometry: a page is a strip bent along its width ---------- */
  const W = 2.05, D = 2.9, SEG = 48, LIFT = 0.13;   // page width, depth, segments, the open book's V
  function stripGeometry() {
    const g = new THREE.BufferGeometry(), n = (SEG + 1) * 2;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const uv = new Float32Array(n * 2), idx = [];
    for (let i = 0; i <= SEG; i++) { const u = i / SEG; uv.set([u, 1, u, 0], i * 4); if (i < SEG) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  // phi: the page's angle at the spine (0 = lying to the right, PI = to the left); bend curls it
  function shape(g, phi, bend, y0) {
    const p = g.attributes.position.array; let x = 0, y = 0;
    for (let i = 0; i <= SEG; i++) {
      if (i) { const s = (i - 0.5) / SEG, a = phi + bend * Math.pow(s, 1.4); x += Math.cos(a) * W / SEG; y += Math.sin(a) * W / SEG; }
      p.set([x, y0 + y, -D / 2, x, y0 + y, D / 2], i * 6);
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }
  const book = new THREE.Group(); book.rotation.x = 0; scene.add(book);
  const mk = (map, side) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, side });
  // the two resting pages
  const leftG = stripGeometry(), rightG = stripGeometry();
  shape(leftG, Math.PI - LIFT, 0, 0.06); shape(rightG, LIFT, 0, 0.06);
  const leftM = mk(null, THREE.DoubleSide), rightM = mk(null, THREE.DoubleSide);
  const leftP = new THREE.Mesh(leftG, leftM), rightP = new THREE.Mesh(rightG, rightM);
  leftP.receiveShadow = rightP.receiveShadow = true; leftP.castShadow = rightP.castShadow = true;
  book.add(leftP, rightP);
  // the blocks of pages beneath, and the cover
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xEDE7DA, roughness: 0.95 });
  const coverMat = new THREE.MeshPhysicalMaterial({ color: 0x1C1B1E, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.4 });
  [-1, 1].forEach(sd => {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(W * 0.985, 0.11, D * 0.985), edgeMat);
    blk.position.set(sd * W / 2 * Math.cos(LIFT), 0.0 + Math.sin(LIFT) * W / 2 - 0.005, 0); blk.rotation.z = sd > 0 ? LIFT : -LIFT; blk.castShadow = true; blk.receiveShadow = true; book.add(blk);
    const cov = new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.04, D + 0.12), coverMat);
    cov.position.set(sd * (W / 2 + 0.02) * Math.cos(LIFT), -0.075 + Math.sin(LIFT) * W / 2, 0); cov.rotation.z = sd > 0 ? LIFT : -LIFT; cov.castShadow = true; book.add(cov);
  });
  // the rehal: two dark boards crossing under the book
  const wood = new THREE.MeshStandardMaterial({ color: 0x2A2724, roughness: 0.7 });
  // an X seen from the front: each board runs from under one outer edge, crosses below the spine, and stands on the floor
  [-1, 1].forEach(sd => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.055, 2.3), wood);
    b.position.set(0, -0.6, sd * 0.02); b.rotation.z = sd * 0.31; b.castShadow = true; b.receiveShadow = true; scene.add(b);
  });
  // the turning leaf: front and back share one geometry
  const leafG = stripGeometry();
  const frontM = mk(null, THREE.FrontSide), backM = mk(null, THREE.BackSide);
  const leafF = new THREE.Mesh(leafG, frontM), leafB = new THREE.Mesh(leafG, backM);
  leafF.castShadow = true; leafB.castShadow = true; leafF.visible = leafB.visible = false;
  book.add(leafF, leafB);

  /* ---------- the page becomes a card ---------- */
  const CW = 1.46, CH = 2.19;                        // a deck card, 2 : 3
  const rounded = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 384; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 256, 384); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(0, 0, 256, 384, 18); x.fill();
    return new THREE.CanvasTexture(c); })();
  const logoW = await new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'assets/logo/baik-logo_caps-white.png'; });
  function cardLattice(x, cx, cy, R0, a, col) {
    x.save(); x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = 1.4;
    for (let k = 1; k <= 7; k++) { const r = R0 * k / 7;
      for (const off of [0, Math.PI / 4]) { x.beginPath(); for (let j = 0; j < 4; j++) { const an = off + j * Math.PI / 2 + Math.PI / 4; j ? x.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r) : x.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r); } x.closePath(); x.stroke(); }
      x.beginPath(); x.arc(cx, cy, r * .72, 0, Math.PI * 2); x.stroke(); }
    x.restore();
  }
  const CV = 768, CHH = 1152;
  function cardBack() {                              // the deck's back, as on every Baik card
    const c = document.createElement('canvas'); c.width = CV; c.height = CHH; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, CV, CHH); g.addColorStop(0, '#26292E'); g.addColorStop(1, '#131518'); x.fillStyle = g; x.fillRect(0, 0, CV, CHH);
    x.strokeStyle = 'rgba(255,255,255,.22)'; x.lineWidth = 2; x.beginPath(); x.roundRect(30, 30, CV - 60, CHH - 60, 24); x.stroke();
    cardLattice(x, CV / 2, CHH / 2, 330, .5, '#fff');
    x.fillStyle = '#1B1D21'; x.beginPath(); x.arc(CV / 2, CHH / 2, 118, 0, Math.PI * 2); x.fill(); x.strokeStyle = 'rgba(255,255,255,.35)'; x.stroke();
    if (logoW) { const lw = 168, lh = lw * logoW.height / logoW.width; x.drawImage(logoW, CV / 2 - lw / 2, CHH / 2 - lh / 2, lw, lh); }
    x.font = '500 20px "JetBrains Mono"'; x.fillStyle = 'rgba(255,255,255,.55)'; x.textAlign = 'center'; x.fillText('A DECK OF AUTHENTIC DUAS', CV / 2, CHH - 100);
    return tex(c);
  }
  const cardFaces = {};
  function cardFront(i) {                            // the surah card: near-black stock, gold rule, the mushaf's cartouche
    if (cardFaces[i]) return cardFaces[i];
    const d = DATA[i], c = document.createElement('canvas'); c.width = CV; c.height = CHH; const x = c.getContext('2d');
    x.fillStyle = '#16171A'; x.fillRect(0, 0, CV, CHH);
    x.strokeStyle = '#C9A227'; x.lineWidth = 2.4; x.beginPath(); x.roundRect(34, 34, CV - 68, CHH - 68, 22); x.stroke();
    x.strokeStyle = 'rgba(201,162,39,.45)'; x.lineWidth = 1.2; x.beginPath(); x.roundRect(48, 48, CV - 96, CHH - 96, 16); x.stroke();
    x.fillStyle = '#F4EFE2'; x.textBaseline = 'middle';
    x.font = '600 34px "Space Grotesk"'; x.textAlign = 'left'; x.fillText(d.t.split(' · ')[0], 84, 112);
    x.font = '600 30px "JetBrains Mono"'; x.textAlign = 'right'; x.fillStyle = '#C9A227'; x.fillText(String(d.sno).padStart(3, '0'), CV - 84, 112);
    const w = CV - 200, h = 84, X = 100, y = 170;      // the cartouche
    x.strokeStyle = 'rgba(201,162,39,.8)'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(X + 34, y); x.lineTo(X + w - 34, y); x.lineTo(X + w, y + h / 2); x.lineTo(X + w - 34, y + h); x.lineTo(X + 34, y + h); x.lineTo(X, y + h / 2); x.closePath(); x.stroke();
    x.fillStyle = '#F4EFE2'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '600 44px "Scheherazade New"'; x.fillText('سُورَةُ ' + d.sarab, CV / 2, y + h / 2 + 4);
    let size = 46, lines; const ar = d.ar.replace(/^بِسْمِ[^۝]*?ٱلرَّحِيمِ\s*/, '');
    for (; size > 26; size -= 2) { x.font = `600 ${size}px "Scheherazade New"`; lines = wrap(x, ar, CV - 170); if (lines.length * size * 1.85 < 610) break; }
    if (lines.length * size * 1.85 >= 610) { lines = lines.slice(0, Math.floor(610 / (size * 1.85))); lines[lines.length - 1] += ' …'; }
    const top = 300 + (610 - lines.length * size * 1.85) / 2 + size;
    lines.forEach((l, k) => x.fillText(l, CV / 2, top + k * size * 1.85));
    x.direction = 'ltr'; x.fillStyle = 'rgba(201,162,39,.5)'; x.fillRect(84, CHH - 150, CV - 168, 1.5);
    x.fillStyle = 'rgba(244,239,226,.7)'; x.font = '500 21px "JetBrains Mono"'; x.textAlign = 'left'; x.fillText(String(d.src).toUpperCase(), 84, CHH - 110);
    x.textAlign = 'right'; x.fillStyle = '#C9A227'; x.fillText('BAIK', CV - 84, CHH - 110);
    return (cardFaces[i] = tex(c));
  }
  const cardGeo = new THREE.PlaneGeometry(1, 1);
  const skinM = new THREE.MeshStandardMaterial({ roughness: .92, transparent: true, alphaMap: rounded, depthWrite: false });
  const faceM = new THREE.MeshBasicMaterial({ transparent: true, alphaMap: rounded, toneMapped: false, depthWrite: false });
  const backFM = new THREE.MeshBasicMaterial({ map: cardBack(), transparent: true, alphaMap: rounded, toneMapped: false });
  const card = new THREE.Group(), skin = new THREE.Mesh(cardGeo, skinM), face = new THREE.Mesh(cardGeo, faceM), backF = new THREE.Mesh(cardGeo, backFM);
  backF.rotation.y = Math.PI; skin.position.z = .002; face.position.z = .001;
  const shadowCard = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .01), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); shadowCard.castShadow = true;   // casts the shadow only; never hides the faces
  card.add(face, skin, backF, shadowCard); card.visible = false; book.add(card);
  // resting on the right-hand page, the page's size, facing up; and floating before the reader, card-sized
  const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), LIFT));
  const restP = new THREE.Vector3(Math.cos(LIFT) * W / 2, .075 + Math.sin(LIFT) * W / 2, 0);
  let promo = null, autoTurns = 0;
  const promoEl = document.createElement('div'); promoEl.className = 'mf-promo'; promoEl.setAttribute('aria-live', 'polite'); host.appendChild(promoEl);
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  function startPromo() {
    if (promo || turning || REDUCED) return;
    const d = DATA[cur]; faceM.map = cardFront(cur); skinM.map = arabicPage(cur); faceM.needsUpdate = skinM.needsUpdate = true;
    promoEl.innerHTML = '<span>Every page is a card · Surah ' + d.sno + '</span><b>' + d.t.split(' · ')[0] + '</b><a href="/khayr">Open this card ›</a>';
    promo = { t: 0 }; card.visible = true;
  }
  function endPromo() { promo = null; card.visible = false; promoEl.classList.remove('on'); }
  const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), qS = new THREE.Quaternion(), Yax = new THREE.Vector3(0, 1, 0), tmpP = new THREE.Vector3(), camQ = new THREE.Quaternion();
  function stepPromo(dt) {
    if (!promo) return;
    const T = promo.t += dt, END = 5.0;
    // up (0–0.9), over to the back (1.05–1.6), back to the face (2.0–2.55), hang, down (4.0–5.0)
    const up = ease(seg(T, 0, .9)) * (1 - ease(seg(T, 4.0, 5.0)));
    const turn = ease(seg(T, 1.05, 1.6)) * Math.PI + ease(seg(T, 2.0, 2.55)) * Math.PI;
    // where it floats: between the book and the camera, upright toward the reader, in book space
    book.updateMatrixWorld(); camQ.copy(camera.quaternion);
    const inv = new THREE.Quaternion().copy(book.getWorldQuaternion(new THREE.Quaternion())).invert();
    qB.copy(inv).multiply(camQ);
    tmpP.copy(camera.position).sub(LOOK).normalize().multiplyScalar(1.75).add(LOOK); book.worldToLocal(tmpP); tmpP.y -= .12;   // low enough that the label above it stays clear
    card.position.lerpVectors(restP, tmpP, up); card.position.y += Math.sin(Math.PI * up) * .35;
    qA.copy(restQ).slerp(qB, up); qS.setFromAxisAngle(Yax, turn + (up > .98 ? Math.sin(T * 1.3) * .06 : 0)); card.quaternion.copy(qA).multiply(qS);
    card.scale.set(W * .97 + (CW - W * .97) * up, D * .97 + (CH - D * .97) * up, 1);
    skinM.opacity = 1 - seg(up, .15, .7); faceM.opacity = seg(up, .15, .7);
    promoEl.classList.toggle('on', T > 2.25 && T < 4.15);
    if (T >= END) endPromo();
  }

  /* ---------- texture orientation: u runs from the spine outward ---------- */
  function onLeft(t) { const c = t.clone(); c.wrapS = THREE.RepeatWrapping; c.repeat.x = -1; c.offset.x = 1; c.needsUpdate = true; return c; }   // spine at the texture's right edge
  const flipped = new Map(); const L = t => { if (!flipped.has(t)) flipped.set(t, onLeft(t)); return flipped.get(t); };

  let cur = 0, turning = null, firstPromo = false, pendingPromo = false;
  function setRest(i) { leftM.map = L(meaningPage(i)); rightM.map = arabicPage(i); leftM.needsUpdate = rightM.needsUpdate = true; }
  setRest(0); warm(0);

  /* turning forward (to the next surah) lifts the LEFT leaf and lays it on the right, the mushaf's way */
  function begin(dir) {
    if (promo) endPromo();
    if (turning || !DATA[cur + dir]) return false;
    const nx = cur + dir; warm(nx);
    if (dir > 0) { backM.map = L(meaningPage(cur)); frontM.map = arabicPage(nx); leftM.map = L(meaningPage(nx)); }   // lying left, the leaf shows its back
    else { frontM.map = arabicPage(cur); backM.map = L(meaningPage(nx)); rightM.map = arabicPage(nx); }
    [frontM, backM, leftM, rightM].forEach(m => m.needsUpdate = true);
    turning = { dir, nx, t: 0, held: false, settle: null };
    leafF.visible = leafB.visible = true; update();
    return true;
  }
  function finish(done) {
    const tr = turning; turning = null; leafF.visible = leafB.visible = false;
    if (done && tr.auto && ++autoTurns % 2 === 0) pendingPromo = true;
    if (done) { cur = tr.nx; }
    setRest(cur); caption();
  }
  function update() {
    if (!turning) return;
    const t = turning.t, e = t, from = turning.dir > 0 ? Math.PI - LIFT : LIFT, to = turning.dir > 0 ? LIFT : Math.PI - LIFT;
    const phi = from + (to - from) * e, curl = Math.sin(Math.PI * e) * 0.95 * (turning.dir > 0 ? 1 : -1);
    shape(leafG, phi, curl, 0.07 + Math.sin(Math.PI * e) * 0.04);
  }

  /* ---------- the words beside it ---------- */
  const cap = document.createElement('div'); cap.className = 'mf-cap'; host.appendChild(cap);
  cap.innerHTML = '<button type="button" class="mf-prev" aria-label="Previous surah">‹</button><span class="mf-t"></span><button type="button" class="mf-next" aria-label="Next surah">›</button>';
  const hint = document.createElement('div'); hint.className = 'mf-hint'; hint.textContent = 'Drag a page to turn it'; host.appendChild(hint);
  function caption() { const d = DATA[cur]; cap.querySelector('.mf-t').innerHTML = '<b>' + d.t.split(' · ')[0] + '</b> · ' + (d.t.split(' · ')[1] || '') + ' <i>' + (cur + 1) + ' / ' + DATA.length + '</i>'; }
  caption();
  let idle = 0;
  const go = dir => { idle = 0; hint.classList.add('gone'); if (begin(dir)) turning.settle = 1; };
  // in a mushaf the next page is to the left: the left arrow moves on
  cap.querySelector('.mf-next').onclick = () => go(1);
  cap.querySelector('.mf-prev').onclick = () => go(-1);
  cap.querySelector('.mf-next').setAttribute('aria-label', 'Next surah');

  /* ---------- dragging a page ---------- */
  let drag = null;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), par = new THREE.Vector2();
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects([leftP, rightP], false)[0]; if (!hit || turning) return;
    const dir = hit.object === leftP ? 1 : -1;          // pull the left leaf over to go on, the right one back
    if (!begin(dir)) return;
    drag = { x0: e.clientX, w: r.width, dir }; turning.held = true; canvas.setPointerCapture(e.pointerId); idle = 0; hint.classList.add('gone');
  });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); par.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    if (drag && turning) { turning.t = Math.max(0, Math.min(1, (e.clientX - drag.x0) * drag.dir / (drag.w * 0.42))); update(); }
    else { ptr.set(par.x, -par.y); ray.setFromCamera(ptr, camera); canvas.style.cursor = ray.intersectObjects([leftP, rightP], false).length ? 'grab' : 'default'; }
  });
  const release = () => { if (!drag || !turning) return; turning.held = false; turning.settle = turning.t > 0.32 ? 1 : 0; drag = null; };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);

  /* ---------- size, loop ---------- */
  function resize() {
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.95 ? 40 : 28; camera.updateProjectionMatrix();
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect);
    const dist = Math.max(7.9, (W + 0.45) / Math.tan(hf / 2) + 1.1);
    CAM.copy(LOOK).addScaledVector(new THREE.Vector3(0, 6.4, 6.6).normalize(), dist);
  }
  new ResizeObserver(resize).observe(host); resize(); camera.position.copy(CAM); camera.lookAt(LOOK);
  let onScreen = false;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { threshold: 0.3 }).observe(host);
  host.closest('.mf-wrap') && host.closest('.mf-wrap').classList.add('gl');
  window._mf = { book, scene, leftP, rightP, promo: () => { idle = 0; startPromo(); }, state: () => promo && +promo.t.toFixed(2), card };   // for automated checks
  const clock = new THREE.Clock(), damp = (k, dt) => 1 - Math.exp(-k * dt);
  (function frame() {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    if (turning && !turning.held && turning.settle !== null) {
      const goal = turning.settle;
      turning.t += (goal - turning.t) * (REDUCED ? 1 : damp(3.2, dt)) + (goal > turning.t ? 0.0015 : -0.0015);
      if (Math.abs(goal - turning.t) < 0.004 || (goal === 1 && turning.t >= 1) || (goal === 0 && turning.t <= 0)) { turning.t = goal; update(); finish(goal === 1); }
      else update();
    }
    // left alone, it turns on by itself, and starts again from the first surah at the end
    if (!REDUCED && !turning && !drag && !promo) {
      idle += dt;
      if (!firstPromo && idle > 1.0) { firstPromo = true; idle = 0; startPromo(); }
      else if (pendingPromo && idle > .7) { pendingPromo = false; idle = 0; startPromo(); }
      else if (idle > 7) { idle = 0; if (cur + 1 < DATA.length) { if (begin(1)) { turning.settle = 1; turning.auto = true; } } else { cur = 0; setRest(0); caption(); } }
    }
    stepPromo(dt);
    book.position.y = REDUCED ? 0 : Math.sin(clock.elapsedTime * 0.6) * 0.012;
    camera.position.x += (CAM.x + par.x * 0.5 - camera.position.x) * damp(2.5, dt);
    camera.position.y += (CAM.y - par.y * 0.3 - camera.position.y) * damp(2.5, dt);
    camera.position.z += (CAM.z - camera.position.z) * damp(2.5, dt);
    camera.lookAt(LOOK);
    renderer.render(scene, camera);
  })();
}

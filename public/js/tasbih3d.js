/* Baik · Tasbih in 3D. The same string of beads as tasbih.js, drawn as objects resting on a dark
   table: lit by a soft room, casting shadows, each finish a real material. A bead lifts a little as
   it crosses the gap, knocks into its neighbours when it lands, and a finished round sends one slow
   light along the string. tasbih.js keeps the count; this only reads it (window.TB) and listens
   for its tb:* events. If WebGL is missing, nothing here runs and the flat canvas stays. */
import * as THREE from 'three';

const TB = window.TB, cv = document.getElementById('tbGl');
if (TB && cv) { try { start(); } catch (e) { window.TB_GL = false; document.body.classList.remove('tb-gl'); } }

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.03).texture;
  // what the beads reflect: a dark studio with one large softbox, a thin cool strip behind, a faint warm bounce
  function studio() {
    const soft = (() => {                          // a round light that fades to nothing at its edge
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, '#fff'); r.addColorStop(0.5, 'rgba(255,255,255,.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    const s = new THREE.Scene(), hdr = (r, g, b, round) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), side: THREE.DoubleSide, map: round ? soft : null, transparent: !!round });
    s.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ color: 0x040605, side: THREE.BackSide })));
    const panel = (w, h, m, x, y, z) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(x, y, z); p.lookAt(0, 0, 0); s.add(p); };
    panel(14, 14, hdr(5, 4.9, 4.6, true), -5, 11, 7);
    panel(1.2, 12, hdr(0.9, 1.6, 1.3), 10, 3, -8);
    panel(18, 3, hdr(0.12, 0.1, 0.08), 0, -8, 6);
    return s;
  }
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  /* ---------- the string: a soft S lying on the table, its ends falling away from you ---------- */
  const R = 0.5, PITCH = 1.04, GAP = 1.0;           // bead radius, centre to centre, and half the gap
  const pts = [];
  for (let x = -22; x <= 22; x += 1) pts.push(new THREE.Vector3(x, R, -0.045 * x * x + 0.3 * Math.sin(x * 0.3)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  curve.arcLengthDivisions = 1200;
  const L = curve.getLength();
  let s0 = L / 2;                                    // arc length at x = 0, where the gap sits
  { const lens = curve.getLengths(1200); for (let i = 1; i <= 1200; i++) if (curve.getPoint(i / 1200).x >= 0) { s0 = lens[i]; break; } }
  const at = s => Math.min(1, Math.max(0, (s0 + s) / L));

  const cord = new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.024, 8, false),
    new THREE.MeshStandardMaterial({ color: 0xc9b285, roughness: 0.5, metalness: 0.25 }));
  cord.castShadow = true; scene.add(cord);

  /* ---------- the table: only its shadow shows, and a faint pool of light under the gap ---------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.5 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x34d399, transparent: true, opacity: 0.07, depthWrite: false, toneMapped: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.002, 0.2); scene.add(pool);

  /* ---------- light: the room for reflections, one soft key that casts the shadows, a cool rim ---------- */
  const key = new THREE.DirectionalLight(0xfff6ea, 1.2);
  key.position.set(-5, 11, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  Object.assign(key.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10, near: 1, far: 30 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfeedd, 0.35); rim.position.set(3, 3, -9); scene.add(rim);
  const sweep = new THREE.PointLight(0xfff1d6, 0, 4.5, 2); scene.add(sweep);

  /* ---------- the beads ---------- */
  const wood = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#b07446'; g.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 140; i++) {                  // grain: long wavering lines, a few darker than the rest
      const y = Math.random() * 512, a = Math.random() * 0.22 + 0.04, w = Math.random() * 2.5 + 0.6, f = Math.random() * 0.012 + 0.004, ph = Math.random() * 6;
      g.strokeStyle = `rgba(${60 + Math.random() * 30},${28 + Math.random() * 14},10,${a})`; g.lineWidth = w; g.beginPath();
      for (let x = 0; x <= 1024; x += 8) { const yy = y + Math.sin(x * f + ph) * 14 + Math.sin(x * f * 3.1 + ph) * 4; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  })();
  // gems: a dark core with colour glowing at the rim, the way light sits inside real stone
  const gem = (core, glow, em) => new THREE.MeshPhysicalMaterial({ color: core, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.6, specularIntensity: 1,
    sheen: 1, sheenColor: glow, sheenRoughness: 0.45, emissive: em, emissiveIntensity: 0.35, envMapIntensity: 1.2 });
  const FINISH = {
    onyx: () => new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 }),
    pearl: () => new THREE.MeshPhysicalMaterial({ color: 0xe6dfd1, roughness: 0.32, sheen: 0.8, sheenColor: 0xfff4e6, sheenRoughness: 0.5,
      iridescence: 0.5, iridescenceIOR: 1.4, iridescenceThicknessRange: [300, 600], clearcoat: 0.7, clearcoatRoughness: 0.15, envMapIntensity: 1.4 }),
    emerald: () => gem(0x04382a, 0x35e0a4, 0x032a1d),
    amber: () => gem(0x6e3606, 0xffb240, 0x3a1600),
    wood: () => new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.28, envMapIntensity: 1.2 }),
    garnet: () => gem(0x3a040a, 0xe8323f, 0x220004),
  };
  const mats = {}, mat = k => mats[k] || (mats[k] = (FINISH[k] || FINISH.onyx)());
  const MAX = 48;
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 64, 40), mat(TB.bead()), MAX);
  beads.castShadow = true;                         // onto the table only: self-shadow cuts a hard line on matte pearl beads.frustumCulled = false;
  beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(beads);

  // every bead is a little different, like a real string: tone and the way its grain sits
  const hash = k => { const v = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  const X = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion(), qs = new THREE.Quaternion(), m = new THREE.Matrix4(),
    p = new THREE.Vector3(), tan = new THREE.Vector3(), sc = new THREE.Vector3(0.93, 1, 1), col = new THREE.Color();

  /* ---------- motion: a spring follows the count; landings knock the beads they meet ---------- */
  const reduced = TB.reduced;
  let target = TB.target(), shift = reduced ? target : target - 3, vel = 0;
  let knock = { t: -9, dir: 1 }, sweepT = -9, lastWhole = Math.floor(shift + 0.02);
  const smooth = e => e * e * (3 - 2 * e);
  function place(now) {
    const base = Math.floor(shift), dt = (now - knock.t) / 1000;
    const kAmp = reduced || dt > 1.2 ? 0 : Math.exp(-dt * 7) * Math.sin(dt * 34) * 0.07;
    let n = 0;
    for (let k = base - 24; k <= base + 24 && n < MAX; k++) {
      const u = k - shift; let s, lift = 0;
      if (u >= 0) s = GAP + u * PITCH;
      else if (u <= -1) s = -GAP + (u + 1) * PITCH;
      else { const e = u + 1; s = -GAP + 2 * GAP * smooth(e); lift = reduced ? 0 : Math.sin(Math.PI * e) * 0.2; }
      // the knock travels away from where the bead landed and fades with each neighbour
      if (kAmp) { if (knock.dir > 0 && u <= -1) s -= kAmp * Math.exp((u + 1) * 0.75); if (knock.dir < 0 && u >= 0) s += kAmp * Math.exp(-u * 0.75); }
      if (Math.abs(s) > L / 2 - 1) continue;
      const t = at(s); curve.getPointAt(t, p); curve.getTangentAt(t, tan);
      p.y += lift;
      q.setFromUnitVectors(X, tan); qs.setFromAxisAngle(X, hash(k) * 6.283 + s * 0.8); q.multiply(qs);
      m.compose(p, q, sc); beads.setMatrixAt(n, m);
      const h = hash(k + 7.1); col.setScalar(TB.bead() === 'wood' ? 0.8 + h * 0.3 : 0.94 + h * 0.08); beads.setColorAt(n, col);
      n++;
    }
    beads.count = n; beads.instanceMatrix.needsUpdate = true; if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
  }

  /* ---------- camera: keeps about the same number of beads in view on a phone or a wide screen ---------- */
  const look = new THREE.Vector3(0, R * 0.7, -0.1);
  let par = 0, parTo = 0, W = 0, H = 0;
  function frame() {
    const a = W / H, v = THREE.MathUtils.degToRad(camera.fov / 2);
    const want = THREE.MathUtils.clamp(a * 6.8, 7.2, 13);                // world width visible across the gap
    const d = want / 2 / (Math.tan(v) * a), el = THREE.MathUtils.degToRad(42);
    camera.aspect = a;
    camera.position.set(look.x + par * 0.6, look.y + Math.sin(el) * d, look.z + Math.cos(el) * d);
    camera.lookAt(look); camera.updateProjectionMatrix();
  }
  function resize() {
    const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); frame(); dirty = true;
  }

  /* ---------- the loop: renders only while something moves ---------- */
  let dirty = true, prev = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (document.hidden) return;
    let moving = false;
    if (reduced) { if (shift !== target) { shift = target; moving = true; } }
    else if (Math.abs(target - shift) > 1e-4 || Math.abs(vel) > 1e-4) {
      // critically damped: quick, no wobble past the gap
      const k = 210, c = 2 * Math.sqrt(k);
      vel += ((target - shift) * k - vel * c) * dt; shift += vel * dt; moving = true;
      if (Math.abs(target - shift) < 1e-4 && Math.abs(vel) < 1e-3) { shift = target; vel = 0; }
    }
    const whole = Math.floor(shift + 0.02);
    if (whole !== lastWhole) { knock = { t: now, dir: whole > lastWhole ? 1 : -1 }; lastWhole = whole; }
    if (now - knock.t < 1200) moving = true;
    const sw = (now - sweepT) / 1600;
    if (sw >= 0 && sw <= 1) {
      sweep.position.set(THREE.MathUtils.lerp(-9, 9, smooth(sw)), 1.7, 1.4); sweep.intensity = Math.sin(Math.PI * sw) * 9; moving = true;
    } else if (sweep.intensity) { sweep.intensity = 0; moving = true; }
    if (Math.abs(parTo - par) > 1e-3) { par += (parTo - par) * 0.08; frame(); moving = true; }
    if (!moving && !dirty) return;
    dirty = false; place(now); renderer.render(scene, camera);
    if (!window.TB_GL) { window.TB_GL = true; document.body.classList.add('tb-gl'); }
  }

  /* ---------- listening to the count ---------- */
  document.addEventListener('tb:count', e => {
    target = TB.target();
    if (e.detail && e.detail.done && !reduced) sweepT = performance.now() + 180;
  });
  document.addEventListener('tb:jump', () => { target = shift = TB.target(); vel = 0; lastWhole = Math.floor(shift + 0.02); dirty = true; });
  document.addEventListener('tb:bead', () => { beads.material = mat(TB.bead()); dirty = true; });
  // a mouse moving over the page turns the string very slightly; touch leaves it still
  document.getElementById('tbArea').addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || reduced) return; parTo = (e.clientX / innerWidth - 0.5) * 2;
  });
  cv.addEventListener('webglcontextlost', e => {
    e.preventDefault(); window.TB_GL = false; document.body.classList.remove('tb-gl'); if (TB.redraw) TB.redraw();
  });

  new ResizeObserver(resize).observe(cv);
  resize(); requestAnimationFrame(tick);
}

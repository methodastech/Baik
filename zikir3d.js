/* Baik · "A moment of zikir", WebGL (Three.js). One polished black tasbih bead that breathes.
   Tap it: a ripple runs across its surface from the exact point touched and the count moves on,
   33 each of SubhanAllah, Alhamdulillah and Allahu Akbar. Monochrome, quiet, tactile.
   The surface is displaced in the vertex shader (breathing + up to 8 ripples) and its normal is
   rebuilt from two neighbouring samples, so the reflections bend with the wave. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('zk3');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHRASES = [
  { ar: 'سُبْحَانَ ٱللَّٰهِ', tr: 'SubhanAllah', en: 'Glory be to Allah' },
  { ar: 'ٱلْحَمْدُ لِلَّٰهِ', tr: 'Alhamdulillah', en: 'All praise is for Allah' },
  { ar: 'ٱللَّٰهُ أَكْبَرُ', tr: 'Allahu Akbar', en: 'Allah is the Greatest' },
];
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
if (host && webglOK()) start();

function start() {
  const canvas = document.createElement('canvas'); canvas.className = 'zk-cv';
  canvas.setAttribute('role', 'button'); canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', 'Tasbih bead. Tap, or press Space, to count.');
  host.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2.5, Math.max(2, (devicePixelRatio || 1) * 1.25)));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.02).texture;
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const CAM = new THREE.Vector3(0, 0.6, 9.0), LOOK = new THREE.Vector3(0, -0.15, 0), BASE = 0.62;
  camera.position.copy(CAM); camera.lookAt(LOOK);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-3, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.8); rim.position.set(4, 1.5, -3); scene.add(rim);

  /* ---------- the bead ---------- */
  const N = 8;
  const uniforms = { uTime: { value: 0 }, uRip: { value: Array.from({ length: N }, () => new THREE.Vector4(0, 1, 0, -99)) }, uAmp: { value: Array.from({ length: N }, () => 0) } };
  const mat = new THREE.MeshPhysicalMaterial({ color: 0x141518, metalness: 0.25, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.15 });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      uniform float uTime; uniform vec4 uRip[${N}]; uniform float uAmp[${N}];
      float zkDisp(vec3 n){
        float d = 0.012 * sin(uTime * 1.1 + n.y * 2.6) + 0.008 * sin(uTime * 0.7 + n.x * 3.1 + n.z * 1.7);
        for (int i = 0; i < ${N}; i++) {
          float age = uTime - uRip[i].w;
          if (age > 0.0 && age < 3.5) {
            float ang = acos(clamp(dot(n, uRip[i].xyz), -1.0, 1.0));
            float front = age * 1.35;                                   // the ring travels outward
            float env = exp(-age * 1.25) * exp(-pow((ang - front) * 2.4, 2.0));
            d += uAmp[i] * env * sin((ang - front) * 15.0) + uAmp[i] * 0.9 * exp(-age * 6.0) * exp(-ang * ang * 30.0) * -1.0; // and a small press at the touch
          }
        }
        return d;
      }`);
    sh.vertexShader = sh.vertexShader.replace('#include <beginnormal_vertex>', `
      vec3 zn0 = normalize(position);
      vec3 zt = normalize(cross(zn0, abs(zn0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
      vec3 zb = cross(zn0, zt);
      float ze = 0.012;
      vec3 zp0 = zn0 * (1.0 + zkDisp(zn0));
      vec3 zq1 = normalize(zn0 + zt * ze); vec3 zp1 = zq1 * (1.0 + zkDisp(zq1));
      vec3 zq2 = normalize(zn0 + zb * ze); vec3 zp2 = zq2 * (1.0 + zkDisp(zq2));
      vec3 objectNormal = normalize(cross(zp1 - zp0, zp2 - zp0));
      if (dot(objectNormal, zn0) < 0.0) objectNormal = -objectNormal;
      #ifdef USE_TANGENT
        vec3 objectTangent = zt;
      #endif`);
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = zp0;');
  };
  const bead = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 72), mat);
  const holder = new THREE.Group(); holder.add(bead); scene.add(holder);
  // the cord through the bead, a hair of light above and below
  const cordMat = new THREE.MeshStandardMaterial({ color: 0x2a2b2f, roughness: 0.6 });
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.2, 12), cordMat); c.position.y = 1.5; holder.add(c); }   // the cord, from above only
  // a soft contact shadow under it
  const sc = document.createElement('canvas'); sc.width = sc.height = 256; const sx = sc.getContext('2d');
  const g = sx.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(20,22,26,.32)'); g.addColorStop(.5, 'rgba(20,22,26,.1)'); g.addColorStop(1, 'rgba(20,22,26,0)');
  sx.fillStyle = g; sx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = BASE - 1.42; scene.add(shadow);

  /* ---------- the words ---------- */
  const ui = document.createElement('div'); ui.className = 'zk-ui'; ui.setAttribute('aria-live', 'polite');
  ui.innerHTML = '<div class="zk-ar" lang="ar"></div><div class="zk-tr"></div><div class="zk-count"><span class="zk-dots"><i></i><i></i><i></i></span><b class="zk-n">0</b><span class="zk-of">/ 33</span></div>';
  host.appendChild(ui);
  const hint = document.createElement('div'); hint.className = 'zk-hint'; hint.textContent = 'Tap the bead to count'; host.appendChild(hint);
  const $ = s => ui.querySelector(s);
  let total = 0, shown = -1;
  function paint() {
    const done = total >= 99, k = done ? 2 : Math.floor(total / 33), n = done ? 33 : total % 33;
    if (k !== shown || done) {
      const p = PHRASES[k];
      ui.classList.add('swap');
      setTimeout(() => {
        $('.zk-ar').textContent = p.ar;
        $('.zk-tr').innerHTML = done ? 'May it be accepted <span>· 99 · tap to begin again</span>' : p.tr + ' <span>· ' + p.en + '</span>';
        ui.classList.remove('swap');
      }, shown < 0 ? 0 : 220);
      shown = k;
    }
    $('.zk-n').textContent = done ? 99 : n;
    $('.zk-of').textContent = done ? '' : '/ 33';
    ui.querySelectorAll('.zk-dots i').forEach((d, j) => d.className = j < k || done ? 'full' : j === k ? 'now' : '');
  }
  paint();

  /* ---------- touch ---------- */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), par = new THREE.Vector2();
  let ri = 0, press = 0, spin = 0;
  function ripple(dirLocal, amp) {
    uniforms.uRip.value[ri].set(dirLocal.x, dirLocal.y, dirLocal.z, uniforms.uTime.value);
    uniforms.uAmp.value[ri] = amp; ri = (ri + 1) % N;
  }
  function count(dirLocal) {
    if (total >= 99) { total = 0; shown = -1; }
    total++;
    const turn = total % 33 === 0;
    ripple(dirLocal, REDUCED ? 0 : turn ? 0.045 : 0.026);
    if (turn && !REDUCED) setTimeout(() => ripple(new THREE.Vector3(0, 1, 0), 0.03), 180);
    press = 1; spin += turn ? 0.9 : 0.12;
    hint.classList.add('gone');
    if (navigator.vibrate) try { navigator.vibrate(turn ? [12, 40, 12] : 8); } catch (e) {}
    paint();
  }
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObject(bead, false)[0];
    if (!hit) return;
    count(bead.worldToLocal(hit.point.clone()).normalize());
  });
  canvas.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); count(new THREE.Vector3(0, 0.3, 1).normalize()); } });
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect(); par.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    ptr.set(par.x, -par.y); ray.setFromCamera(ptr, camera);
    canvas.style.cursor = ray.intersectObject(bead, false).length ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerleave', () => par.set(0, 0));

  /* ---------- size, loop ---------- */
  function resize() {
    const r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height;
    camera.fov = camera.aspect < 0.7 ? 34 : 28; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host); resize();
  let onScreen = false;
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { rootMargin: '60px' }).observe(host);
  host.closest('.zk-wrap') && host.closest('.zk-wrap').classList.add('gl');
  const clock = new THREE.Clock(), damp = (k, dt) => 1 - Math.exp(-k * dt);
  let rot = 0;
  (function frame() {
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) { clock.getDelta(); return; }
    const dt = Math.min(0.05, clock.getDelta());
    uniforms.uTime.value += REDUCED ? 0 : dt;
    press += (0 - press) * damp(7, dt);
    const s = 1 - press * 0.035; holder.scale.set(1 + press * 0.015, s, 1 + press * 0.015);
    rot += (spin - rot) * damp(3, dt);
    holder.rotation.y = rot + (REDUCED ? 0 : uniforms.uTime.value * 0.08);
    holder.position.y = BASE + (REDUCED ? 0 : Math.sin(uniforms.uTime.value * 0.9) * 0.04);
    camera.position.x += (CAM.x + par.x * 0.45 - camera.position.x) * damp(2.5, dt);
    camera.position.y += (CAM.y - par.y * 0.3 - camera.position.y) * damp(2.5, dt);
    camera.lookAt(LOOK);
    renderer.render(scene, camera);
  })();
}

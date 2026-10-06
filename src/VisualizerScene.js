import * as THREE from 'three';
import { ptrColor } from './visualizerSteps';
const ST = { def: 0x5b6aa8, range: 0x4c8dff, active: 0xffd23f, pivot: 0xa66bff, done: 0x2ee88f, found: 0x2ee88f };
export function mountVisualizer(container, { onTip = () => {} } = {}) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NOOP = { setStep() {}, setMax() {}, celebrate() {}, destroy() {}, ok: false };
  let R;
  try { R = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch (e) { return NOOP; }
  if (!R.getContext()) return NOOP;

  // three r155+ uses physical light units; scale so the look matches older versions too
  const LS = parseInt(THREE.REVISION, 10) >= 155 ? Math.PI : 1;
  const SRGB = THREE.SRGBColorSpace;

  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  R.setClearColor(0x06051a, 1);
  if (SRGB && 'outputColorSpace' in R) R.outputColorSpace = SRGB;
  const el = container;
  el.prepend(R.domElement);

  const S = new THREE.Scene();
  S.fog = new THREE.FogExp2(0x06051a, 0.032);
  const C = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  /* ---------- textures ---------- */
  function canvasTex(w, h, draw, srgb) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4;
    if (srgb && SRGB) tx.colorSpace = SRGB;
    return keep(tx);
  }
  const TX = {};
  TX.glow = canvasTex(128, 128, (g, w, h) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  TX.circuit = canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.fillStyle = '#fff'; g.lineWidth = 2;
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 9; k++) {
      const x = 8 + rnd() * (w - 16); let y = h; g.beginPath(); g.moveTo(x, y); let cx = x;
      while (y > 10) { y -= 20 + rnd() * 40; if (rnd() > 0.6) cx += (rnd() > 0.5 ? 1 : -1) * 14; g.lineTo(cx, y); }
      g.stroke(); g.beginPath(); g.arc(cx, y, 3.5, 0, 7); g.fill();
    }
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 1.5);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(255,255,255,.55)'); grd.addColorStop(0.12, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  TX.rune = canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.translate(c, c);
    const circ = (r, lw, a) => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.lineWidth = lw; g.strokeStyle = `rgba(140,200,255,${a})`; g.stroke(); };
    circ(500, 3, 0.55); circ(470, 1.5, 0.35); circ(380, 2, 0.4); circ(300, 1, 0.25); circ(150, 1, 0.2);
    for (let k = 0; k < 120; k++) {
      const a = (k / 120) * Math.PI * 2, l = k % 10 === 0 ? 26 : k % 5 === 0 ? 16 : 8;
      g.beginPath(); g.moveTo(Math.cos(a) * 470, Math.sin(a) * 470); g.lineTo(Math.cos(a) * (470 - l), Math.sin(a) * (470 - l));
      g.lineWidth = k % 10 === 0 ? 2.5 : 1; g.strokeStyle = 'rgba(140,200,255,.5)'; g.stroke();
    }
    const glyphs = 'Σ λ ∂ ∞ ≤ ≠ ⊕ π Δ √ ∀ ∃ ⌬ ∴ ≡ ↻'.split(' ');
    g.font = 'bold 30px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(166,140,255,.65)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    glyphs.forEach((ch, k) => { g.save(); g.rotate((k / glyphs.length) * Math.PI * 2); g.fillText(ch, 0, -425); g.restore(); });
    g.font = '500 20px "JetBrains Mono", monospace'; g.fillStyle = 'rgba(62,230,255,.45)';
    ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n²)', 'O(2ⁿ)'].forEach((s, k) => { g.save(); g.rotate((k / 6) * Math.PI * 2 + 0.26); g.fillText(s, 0, -340); g.restore(); });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.cos(a) * 300, Math.sin(a) * 300); g.lineTo(Math.cos(a + (Math.PI * 2) / 3) * 300, Math.sin(a + (Math.PI * 2) / 3) * 300);
      g.lineWidth = 1; g.strokeStyle = 'rgba(166,107,255,.18)'; g.stroke();
    }
  });
  TX.hex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,110,220,.55)'; g.lineWidth = 1.5;
    const s = 32, hh = (Math.sqrt(3) * s) / 2;
    for (let row = -1; row < 6; row++) for (let col = -1; col < 6; col++) {
      const x = col * s * 1.5, y = row * hh * 2 + (col % 2 ? hh : 0);
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; const px = x + Math.cos(a) * s * 0.5, py = y + Math.sin(a) * s * 0.5; if (k) g.lineTo(px, py); else g.moveTo(px, py); }
      g.closePath(); g.stroke();
    }
  });
  TX.hex.wrapS = TX.hex.wrapT = THREE.RepeatWrapping; TX.hex.repeat.set(14, 14);

  function label(text, opt = {}) {
    const { color = '#e7e4f7', bg = null, size = 44, w = 192, h = 80, border = null, scale = 1 } = opt;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    const draw = (txt) => {
      g.clearRect(0, 0, w, h);
      if (bg) {
        g.fillStyle = bg; const r = 16; g.beginPath(); g.moveTo(r, 6);
        g.arcTo(w - 6, 6, w - 6, h - 6, r); g.arcTo(w - 6, h - 6, 6, h - 6, r); g.arcTo(6, h - 6, 6, 6, r); g.arcTo(6, 6, w - 6, 6, r); g.fill();
        if (border) { g.lineWidth = 4; g.strokeStyle = border; g.stroke(); }
      }
      g.font = `700 ${size}px "JetBrains Mono", ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color; g.shadowColor = color; g.shadowBlur = bg ? 0 : 12; g.fillText(txt, w / 2, h / 2 + 2);
    };
    draw(text);
    const tx = new THREE.CanvasTexture(c); if (SRGB) tx.colorSpace = SRGB;
    const m = new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(m); sp.scale.set((scale * w) / h * 0.55, scale * 0.55, 1);
    sp.userData.set = (txt) => { draw(txt); tx.needsUpdate = true; };
    sp.userData.dispose = () => { tx.dispose(); m.dispose(); };
    return sp;
  }

  /* ---------- static scene ---------- */
  const GEO = {
    pillar: keep(new THREE.CylinderGeometry(0.44, 0.5, 1, 6, 1)).translate(0, 0.5, 0),
    cap: keep(new THREE.OctahedronGeometry(0.2, 0)),
    cone: keep(new THREE.ConeGeometry(0.16, 0.36, 4)).rotateX(Math.PI),
    pad: keep(new THREE.RingGeometry(0.5, 0.62, 6)).rotateX(-Math.PI / 2),
  };
  S.add(new THREE.HemisphereLight(0x8fa8ff, 0x140a2a, 0.55 * LS));
  const l1 = new THREE.PointLight(0x3ee6ff, 1.4 * LS, 60, 0); l1.position.set(-10, 12, 10); S.add(l1);
  const l2 = new THREE.PointLight(0xa66bff, 1.3 * LS, 60, 0); l2.position.set(10, 8, -6); S.add(l2);
  const l3 = new THREE.DirectionalLight(0xffffff, 0.35 * LS); l3.position.set(0, 10, 12); S.add(l3);

  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(200, 200)), keep(new THREE.MeshBasicMaterial({ map: TX.hex, color: 0x5a62c8, transparent: true, opacity: 0.22, depthWrite: false })));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.05; S.add(floor);
  const platform = new THREE.Mesh(keep(new THREE.CircleGeometry(1, 72)), keep(new THREE.MeshStandardMaterial({ color: 0x07061a, roughness: 0.85, metalness: 0.3, emissive: 0x0d0a2c, emissiveIntensity: 0.4 })));
  platform.rotation.x = -Math.PI / 2; S.add(platform);
  const ring = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.MeshBasicMaterial({ map: TX.rune, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85 })));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; S.add(ring);
  const ring2 = new THREE.Mesh(keep(new THREE.TorusGeometry(1, 0.012, 8, 128)), keep(new THREE.MeshBasicMaterial({ color: 0x3ee6ff, transparent: true, opacity: 0.6 })));
  ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.05; S.add(ring2);

  const arcMat = keep(new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }));
  const arc = new THREE.Line(keep(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 32 }, () => new THREE.Vector3()))), arcMat);
  S.add(arc);

  const N = 900;
  const P = { n: N, pos: new Float32Array(N * 3), col: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N), base: new Float32Array(N * 3), next: 0 };
  for (let q = 0; q < N; q++) P.pos[q * 3 + 1] = -999;
  const pg = keep(new THREE.BufferGeometry());
  pg.setAttribute('position', new THREE.BufferAttribute(P.pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(P.col, 3));
  P.mesh = new THREE.Points(pg, keep(new THREE.PointsMaterial({ size: 0.32, map: TX.glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  P.mesh.frustumCulled = false; S.add(P.mesh);

  /* ---------- dynamic state ---------- */
  let order = [], nodes = [], slots = [];
  const ptrs = {};
  let maxV = 100, t = 0, last = performance.now(), raf = 0, burstFlash = 0;
  let theta = 0, phi = 0.26, rad = 16, tRad = 16, userTheta = 0, dragging = null, lastInteract = -99, hovered = null, zoom = 1;
  const gap = 1.35;
  const mouse = { x: 0, y: 0, in: false };
  const ray = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();
  const tgt = new THREE.Vector3(0, 3.3, 0);

  const hFor = (v) => 0.45 + (Math.max(0, v) / maxV) * 4.3;
  const xFor = (i, n) => (i - (n - 1) / 2) * gap;

  function fit() {
    const span = Math.max(order.length, 4) * gap + 2;
    const tn = Math.tan(THREE.MathUtils.degToRad(21));
    const byW = span / 2 / (tn * C.aspect), byH = 10.5 / 2 / tn;
    tRad = Math.max(byW * 1.08, byH * 1.12) + 2;
  }
  function resize() {
    const w = el.clientWidth || 600, h = el.clientHeight || 400;
    R.setSize(w, h, false); C.aspect = w / h; C.updateProjectionMatrix(); fit();
  }
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  function emit(x, y, z, color, count, speed = 4, up = 1) {
    const c = new THREE.Color(color);
    for (let q = 0; q < count; q++) {
      const k = P.next; P.next = (P.next + 1) % P.n;
      P.pos[k * 3] = x; P.pos[k * 3 + 1] = y; P.pos[k * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, e = Math.random() * 0.9 + 0.1, s = speed * (0.4 + Math.random() * 0.8);
      P.vel[k * 3] = Math.cos(a) * s * e * 0.8; P.vel[k * 3 + 1] = (Math.random() * 0.8 + 0.4) * s * up; P.vel[k * 3 + 2] = Math.sin(a) * s * e * 0.8;
      P.life[k] = P.max[k] = 0.6 + Math.random() * 0.9;
      P.base[k * 3] = c.r; P.base[k * 3 + 1] = c.g; P.base[k * 3 + 2] = c.b;
    }
  }

  function makeNode(v) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x151a38, emissive: ST.def, emissiveMap: TX.circuit, emissiveIntensity: 0.7, roughness: 0.32, metalness: 0.55, transparent: true, opacity: 1 });
    const pillar = new THREE.Mesh(GEO.pillar, mat);
    const capMat = new THREE.MeshBasicMaterial({ color: ST.def, transparent: true });
    const cap = new THREE.Mesh(GEO.cap, capMat);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: TX.glow, color: ST.def, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 }));
    const lab = label(String(v), { size: 40, scale: 0.95 });
    g.add(halo, pillar, cap, lab); S.add(g);
    const nd = { g, pillar, mat, cap, capMat, halo, lab, v, x: 0, vx: 0, tx: 0, h: hFor(v), th: hFor(v), pulse: 0, col: new THREE.Color(ST.def), tcol: new THREE.Color(ST.def), dim: 1, tdim: 1, lift: 0, tlift: 0, phase: Math.random() * 6.28, fade: 0, dead: false, moving: false, state: 'def', pos: 0 };
    pillar.userData.node = nd;
    nodes.push(nd);
    return nd;
  }
  function freeNode(nd) {
    S.remove(nd.g); nd.mat.dispose(); nd.capMat.dispose(); nd.halo.material.dispose(); nd.lab.userData.dispose();
  }
  function buildSlots(n) {
    slots.forEach((s) => { S.remove(s.pad); S.remove(s.lab); s.pad.material.dispose(); s.lab.userData.dispose(); });
    slots = [];
    for (let i = 0; i < n; i++) {
      const pad = new THREE.Mesh(GEO.pad, new THREE.MeshBasicMaterial({ color: 0x3a4290, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
      pad.position.set(xFor(i, n), 0.03, 0); S.add(pad);
      const lab = label(String(i), { size: 30, color: '#6c68a0', scale: 0.7 }); lab.position.set(xFor(i, n), 0.18, 1.05); S.add(lab);
      slots.push({ pad, lab });
    }
    const R0 = Math.max((n * gap) / 2 + 2.2, 6.5);
    platform.scale.setScalar(R0); ring.scale.setScalar(R0 * 1.08); ring2.scale.setScalar(R0 * 1.02);
  }

  // match the previous step's nodes to the new array so swaps animate as movement
  function assign(arr, step, jump) {
    const n = arr.length;
    if (order.length !== n) {
      order.forEach((nd) => { nd.dead = true; });
      order = [];
      buildSlots(n);
      arr.forEach((v, i) => { const nd = makeNode(v); nd.x = nd.tx = xFor(i, n); nd.fade = jump ? 1 : 0; nd.pos = i; nd.g.position.x = nd.x; order.push(nd); });
      fit();
      return;
    }
    let next = new Array(n).fill(null);
    const used = new Set();
    if (step.swap && step.swap.length === 2) {
      const [a, b] = step.swap; const tmp = order.slice(); [tmp[a], tmp[b]] = [tmp[b], tmp[a]];
      if (tmp.every((nd, i) => nd.v === arr[i])) next = tmp;
    }
    if (next[0] === null) {
      for (let i = 0; i < n; i++) {
        let best = -1, bd = 1e9;
        for (let q = 0; q < n; q++) { if (used.has(q)) continue; if (order[q].v === arr[i]) { const d = Math.abs(q - i); if (d < bd) { bd = d; best = q; } } }
        if (best >= 0) { used.add(best); next[i] = order[best]; }
      }
      const spare = order.filter((_, q) => !used.has(q));
      for (let i = 0; i < n; i++) if (!next[i]) { const nd = spare.shift(); nd.v = arr[i]; nd.th = hFor(arr[i]); nd.lab.userData.set(String(arr[i])); nd.pulse = 1; next[i] = nd; }
    }
    next.forEach((nd, i) => {
      const tx = xFor(i, n);
      if (Math.abs(nd.tx - tx) > 0.01) nd.moving = true;
      nd.tx = tx; nd.pos = i;
      if (jump) { nd.x = tx; nd.vx = 0; nd.moving = false; }
    });
    order = next;
  }

  function ptrObj(name) {
    const col = ptrColor(name);
    const g = new THREE.Group();
    const cone = new THREE.Mesh(GEO.cone, new THREE.MeshBasicMaterial({ color: col, transparent: true }));
    const lab = label(name, { size: 34, color: '#07060f', bg: col, w: Math.max(96, 40 + name.length * 22), h: 64, scale: 0.9 });
    lab.position.y = 0.62; g.add(cone, lab); S.add(g);
    return { g, cone, lab, x: 0, y: 6, tx: 0, ty: 6, vx: 0, vy: 0, vis: 0, tvis: 0, born: true };
  }

  function setStep(step, opts = {}) {
    if (!step) return;
    const arr = step.array, n = arr.length;
    assign(arr, step, !!opts.jump);
    const sorted = new Set(step.sorted), active = new Set(step.active);
    const hasRange = step.low !== null && step.high !== null;
    order.forEach((nd, i) => {
      let st = 'def';
      if (step.found === i) st = 'found';
      else if (sorted.has(i)) st = 'done';
      else if (step.pivot === i) st = 'pivot';
      else if (active.has(i)) st = 'active';
      else if (hasRange && i >= step.low && i <= step.high) st = 'range';
      const was = nd.state; nd.state = st;
      nd.tcol.setHex(ST[st]);
      nd.tdim = hasRange && (i < step.low || i > step.high) && st !== 'found' ? 0.28 : 1;
      nd.tlift = st === 'active' ? 0.38 : st === 'found' ? 0.6 : st === 'pivot' ? 0.2 : 0;
      if (st !== was && !opts.jump) {
        if (st === 'active' || st === 'pivot') nd.pulse = 1;
        if (st === 'done' || st === 'found') { nd.pulse = 1; emit(nd.tx, nd.th + 0.6, 0, ST[st], st === 'found' ? 60 : 14, st === 'found' ? 5 : 2.5); }
      }
    });
    const want = step.ptrs || {};
    Object.keys(ptrs).forEach((k) => { if (want[k] === undefined) ptrs[k].tvis = 0; });
    const stack = {};
    Object.entries(want).forEach(([name, idx]) => {
      const p = ptrs[name] || (ptrs[name] = ptrObj(name));
      const nd = order[idx]; const lvl = (stack[idx] = (stack[idx] || 0) + 1) - 1;
      p.tx = xFor(idx, n); p.ty = (nd ? nd.th + nd.tlift : 3) + 1.85 + lvl * 0.95; p.tvis = 1;
      if (p.born || opts.jump) { p.x = p.tx; p.y = p.ty + (opts.jump ? 0 : 1.5); p.born = false; }
    });
    arc.userData.pair = step.active.length === 2 ? step.active.slice() : null;
    arc.userData.col = step.kind === 'swap' ? 0x3ee6ff : 0xffd23f;
    if (step.kind === 'swap' && step.swap && !opts.jump) step.swap.forEach((q) => { const nd = order[q]; if (nd) emit(nd.tx, nd.th * 0.6, 0, 0x3ee6ff, 10, 2.2); });
  }
  const timers = [];
  function celebrate() {
    burstFlash = 1;
    order.forEach((nd, i) => timers.push(setTimeout(() => { nd.pulse = 1; emit(nd.x, nd.h + 0.5, 0, i % 2 ? 0x2ee88f : 0x3ee6ff, 26, 5.5); }, i * 45)));
    const r = platform.scale.x;
    for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2; emit(Math.cos(a) * r, 0.2, Math.sin(a) * r, 0xa66bff, 1, 3, 1.4); }
  }
  function setMax(m) { maxV = Math.max(1, m); order.forEach((nd) => { nd.th = hFor(nd.v); }); }

  /* ---------- input ---------- */
  const cv = R.domElement;
  const onDown = (e) => { dragging = { x: e.clientX, y: e.clientY, th: userTheta, ph: phi }; el.classList.add('dragging'); try { cv.setPointerCapture(e.pointerId); } catch (_) {} };
  const onMove = (e) => {
    const r = cv.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1; mouse.in = true;
    if (!dragging) return;
    userTheta = Math.max(-1.1, Math.min(1.1, dragging.th - (e.clientX - dragging.x) * 0.006));
    phi = Math.max(0.08, Math.min(0.95, dragging.ph + (e.clientY - dragging.y) * 0.004));
    lastInteract = t;
  };
  const onUp = () => { dragging = null; el.classList.remove('dragging'); };
  const onLeave = () => { mouse.in = false; onTip(null); };
  const onWheel = (e) => { e.preventDefault(); zoom = Math.max(0.55, Math.min(1.6, zoom * (1 + Math.sign(e.deltaY) * 0.08))); lastInteract = t; };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('pointerleave', onLeave); cv.addEventListener('wheel', onWheel, { passive: false });

  /* ---------- frame loop ---------- */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (document.hidden) return;
    t += dt;
    const drift = REDUCE ? 0 : t - lastInteract > 4 ? Math.sin(t * 0.12) * 0.22 : 0;
    theta += (userTheta + drift - theta) * Math.min(1, dt * 2.5);
    rad += (tRad * zoom - rad) * Math.min(1, dt * 3);
    C.position.set(tgt.x + Math.sin(theta) * Math.cos(phi) * rad, tgt.y + Math.sin(phi) * rad, tgt.z + Math.cos(theta) * Math.cos(phi) * rad);
    C.lookAt(tgt);
    ring.rotation.z += dt * 0.04;
    ring2.material.opacity = 0.45 + Math.sin(t * 2) * 0.15 + burstFlash * 0.5;
    burstFlash = Math.max(0, burstFlash - dt * 0.8);
    platform.material.emissiveIntensity = 0.4 + burstFlash * 1.5;

    const k = REDUCE ? 400 : 110, d = REDUCE ? 40 : 13;
    const alive = [];
    for (const nd of nodes) {
      if (nd.dead) { nd.fade -= dt * 3; if (nd.fade <= 0) { freeNode(nd); continue; } }
      else nd.fade = Math.min(1, nd.fade + dt * 2.5);
      alive.push(nd);
      const ax = (nd.tx - nd.x) * k - nd.vx * d; nd.vx += ax * dt; nd.x += nd.vx * dt;
      const dist = Math.abs(nd.tx - nd.x);
      if (nd.moving && dist < 0.03 && Math.abs(nd.vx) < 0.6) { nd.moving = false; nd.pulse = Math.max(nd.pulse, 0.8); emit(nd.tx, 0.15, 0, 0x3ee6ff, 8, 1.8, 0.6); }
      nd.h += (nd.th - nd.h) * Math.min(1, dt * 8);
      nd.lift += (nd.tlift - nd.lift) * Math.min(1, dt * 7);
      nd.dim += (nd.tdim - nd.dim) * Math.min(1, dt * 6);
      nd.col.lerp(nd.tcol, Math.min(1, dt * 8));
      nd.pulse = Math.max(0, nd.pulse - dt * 2.2);
      const arcY = nd.moving ? Math.min(1.4, dist * 0.75) : 0;
      const bob = REDUCE ? 0 : Math.sin(t * 1.7 + nd.phase) * (nd.state === 'active' ? 0.09 : 0.045);
      nd.g.position.set(nd.x, nd.lift + bob + arcY, 0);
      const s = 1 + nd.pulse * 0.22 * Math.sin(nd.pulse * Math.PI);
      nd.pillar.scale.set(s, nd.h * (1 + nd.pulse * 0.04), s);
      nd.mat.emissive.copy(nd.col);
      nd.mat.emissiveIntensity = (0.55 + nd.pulse * 1.4 + (nd.state === 'def' ? 0 : 0.35)) * nd.dim + (hovered === nd ? 0.6 : 0);
      nd.mat.opacity = nd.fade * (0.35 + 0.65 * nd.dim);
      nd.capMat.color.copy(nd.col); nd.capMat.opacity = nd.fade * (0.4 + 0.6 * nd.dim);
      nd.cap.position.y = nd.h + 0.42 + (REDUCE ? 0 : Math.sin(t * 2.3 + nd.phase) * 0.08);
      nd.cap.rotation.y += dt * (1.2 + nd.pulse * 8); nd.cap.scale.setScalar(1 + nd.pulse * 0.8);
      nd.halo.material.color.copy(nd.col);
      nd.halo.material.opacity = nd.fade * (0.14 * nd.dim + nd.pulse * 0.55 + (nd.state === 'def' ? 0 : 0.16 * nd.dim));
      nd.halo.position.y = nd.h * 0.5; nd.halo.scale.set(2.1 + nd.pulse, nd.h + 2.2, 1);
      nd.lab.position.y = nd.h + 1.05; nd.lab.material.opacity = nd.fade * (0.35 + 0.65 * nd.dim);
    }
    nodes = alive;
    for (const name in ptrs) {
      const p = ptrs[name];
      p.vx += ((p.tx - p.x) * k * 0.8 - p.vx * d) * dt; p.x += p.vx * dt;
      p.vy += ((p.ty - p.y) * k * 0.8 - p.vy * d) * dt; p.y += p.vy * dt;
      p.vis += (p.tvis - p.vis) * Math.min(1, dt * 8);
      p.g.position.set(p.x, p.y + (REDUCE ? 0 : Math.sin(t * 3 + p.x) * 0.06), 0.15);
      p.cone.material.opacity = p.vis; p.lab.material.opacity = p.vis; p.g.visible = p.vis > 0.02;
    }
    const pr = arc.userData.pair;
    if (pr && order[pr[0]] && order[pr[1]]) {
      const A = order[pr[0]], B = order[pr[1]];
      const ya = A.g.position.y + A.h + 0.42, yb = B.g.position.y + B.h + 0.42, top = Math.max(ya, yb) + 1.1 + Math.abs(A.x - B.x) * 0.15;
      const pos = arc.geometry.attributes.position;
      for (let q = 0; q < 32; q++) { const u = q / 31; const x = A.x + (B.x - A.x) * u; const y = (1 - u) * (1 - u) * ya + 2 * u * (1 - u) * top + u * u * yb; pos.setXYZ(q, x, y + Math.sin(u * 20 - t * 12) * 0.03, 0); }
      pos.needsUpdate = true; arcMat.color.setHex(arc.userData.col); arcMat.opacity += (0.9 - arcMat.opacity) * Math.min(1, dt * 10);
    } else arcMat.opacity += (0 - arcMat.opacity) * Math.min(1, dt * 10);
    for (let q = 0; q < P.n; q++) {
      if (P.life[q] <= 0) continue;
      P.life[q] -= dt; const f = Math.max(0, P.life[q] / P.max[q]);
      P.vel[q * 3 + 1] -= dt * 4.5;
      P.pos[q * 3] += P.vel[q * 3] * dt; P.pos[q * 3 + 1] += P.vel[q * 3 + 1] * dt; P.pos[q * 3 + 2] += P.vel[q * 3 + 2] * dt;
      if (P.pos[q * 3 + 1] < 0.05) { P.pos[q * 3 + 1] = 0.05; P.vel[q * 3 + 1] *= -0.35; }
      P.col[q * 3] = P.base[q * 3] * f; P.col[q * 3 + 1] = P.base[q * 3 + 1] * f; P.col[q * 3 + 2] = P.base[q * 3 + 2] * f;
      if (P.life[q] <= 0) P.pos[q * 3 + 1] = -999;
    }
    P.mesh.geometry.attributes.position.needsUpdate = true; P.mesh.geometry.attributes.color.needsUpdate = true;
    if (mouse.in && !dragging) {
      ray.setFromCamera(mouse, C);
      const hit = ray.intersectObjects(order.map((nd) => nd.pillar), false)[0];
      hovered = hit ? hit.object.userData.node : null;
      if (hovered) {
        tmpV.set(hovered.x, hovered.g.position.y + hovered.h + 1.5, 0).project(C);
        onTip({ x: ((tmpV.x + 1) / 2) * el.clientWidth, y: ((1 - tmpV.y) / 2) * el.clientHeight, i: hovered.pos, v: hovered.v, st: hovered.state });
      } else onTip(null);
    } else hovered = null;
    R.render(S, C);
  }
  raf = requestAnimationFrame(loop);

  function destroy() {
    cancelAnimationFrame(raf); timers.forEach(clearTimeout); ro.disconnect();
    cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp);
    cv.removeEventListener('pointerleave', onLeave); cv.removeEventListener('wheel', onWheel);
    nodes.forEach(freeNode); nodes = []; order = [];
    slots.forEach((s) => { s.pad.material.dispose(); s.lab.userData.dispose(); });
    Object.values(ptrs).forEach((p) => { p.cone.material.dispose(); p.lab.userData.dispose(); });
    disposables.forEach((x) => x.dispose && x.dispose());
    R.dispose(); if (R.forceContextLoss) R.forceContextLoss(); cv.remove();
  }

  return { setStep, setMax, celebrate, destroy, ok: true };
}

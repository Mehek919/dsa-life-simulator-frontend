import * as THREE from 'three';
import { makeAvatarKit, DEFAULT_LOOK } from './avatarKit';
const TAU = Math.PI * 2;
export default function mountWorldScene(container, opts) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;
  const SHADOW = !COARSE;
  const noop = { setLocked() {}, setGateColor() {}, walkTo() {}, destroy() {}, ok: false };

  let r;
  try { r = new THREE.WebGLRenderer({ antialias: !COARSE, powerPreference: 'high-performance' }); } catch (e) { return noop; }
  if (!r.getContext()) return noop;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));
  r.shadowMap.enabled = SHADOW; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.domElement.className = 'ws-canvas';
  container.appendChild(r.domElement);
  const layer = document.createElement('div'); layer.className = 'ws-labels'; container.appendChild(layer);

  const C = (h) => new THREE.Color(h);
  const sc = new THREE.Scene();
  sc.fog = new THREE.Fog(C('#141a33'), 55, 120);
  const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 500);

  // ── Materials: toon shading to match the avatars ──
  const RAMP = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.generateMipmaps = false; RAMP.needsUpdate = true;
  const mats = new Map();
  const toon = (c, o) => {
    const key = c + JSON.stringify(o || {});
    if (!o && mats.has(key)) return mats.get(key);
    const m = new THREE.MeshToonMaterial(Object.assign({ color: C(c), gradientMap: RAMP }, o || {}));
    if (!o) mats.set(key, m);
    return m;
  };
  const glowMat = (c, k = 1) => new THREE.MeshBasicMaterial({ color: C(c).multiplyScalar(k), toneMapped: false });
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const windowTex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128);
    for (let yy = 6; yy < 124; yy += 14) for (let xx = 6; xx < 60; xx += 14) {
      if (Math.random() < 0.6) { x.fillStyle = Math.random() < 0.7 ? '#ffd27a' : '#7fe7ff'; x.fillRect(xx, yy, 8, 8); }
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; return t;
  })();
  const windowMat = (c, rx = 1, ry = 1) => {
    const t = windowTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
    return new THREE.MeshToonMaterial({ color: C(c), gradientMap: RAMP, emissive: C('#ffffff'), emissiveMap: t, emissiveIntensity: 0.9 });
  };
  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = SHADOW; m.receiveShadow = SHADOW; parent.add(m); return m;
  };
  const anims = []; // per-frame callbacks (t, dt)

  // ── Sky, stars, light ──
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#05060f'); g.addColorStop(0.42, '#141a3a'); g.addColorStop(0.5, '#3b2a5c'); g.addColorStop(0.56, '#1d3a4a'); g.addColorStop(1, '#070b14');
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    sc.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })));
    const N = COARSE ? 500 : 1100, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const th = Math.random() * TAU, ph = Math.random() * Math.PI * 0.45;
      p[i * 3] = Math.cos(th) * Math.sin(ph) * 260; p[i * 3 + 1] = Math.cos(ph) * 260 - 20; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 260;
    }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(p, 3));
    sc.add(new THREE.Points(g2, new THREE.PointsMaterial({ color: 0xcfe2ff, size: 1.1, sizeAttenuation: true, fog: false, transparent: true, opacity: 0.9 })));
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C('#cfe0ff'), fog: false, depthWrite: false }));
    moon.position.set(-120, 110, -160); moon.scale.set(60, 60, 1); sc.add(moon);
  }
  sc.add(new THREE.HemisphereLight(0x9fc4ff, 0x2a1b30, 1.15));
  const moonLight = new THREE.DirectionalLight(0xd6e4ff, 1.9);
  moonLight.position.set(-18, 30, 14);
  if (SHADOW) {
    moonLight.castShadow = true; moonLight.shadow.mapSize.set(2048, 2048);
    Object.assign(moonLight.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, near: 1, far: 90 });
    moonLight.shadow.bias = -0.0008;
  }
  sc.add(moonLight);

  // ── The floating island ──
  const R = 34;
  const island = new THREE.Group(); sc.add(island);
  const ground = add(island, new THREE.CylinderGeometry(R, R - 2, 2.2, 56), toon('#1f4038'), 0, -1.1, 0);
  ground.castShadow = false;
  const rock = add(island, new THREE.ConeGeometry(R - 2, 22, 14, 3), toon('#2a2438', { flatShading: true }), 0, -13.2, 0);
  rock.rotation.x = Math.PI; rock.castShadow = false;
  const rim = add(island, new THREE.TorusGeometry(R - 0.3, 0.35, 6, 64), toon('#3c4b63'), 0, 0.05, 0); rim.rotation.x = Math.PI / 2;
  const plaza = add(island, new THREE.CylinderGeometry(8.5, 8.5, 0.12, 6), toon('#3a4760'), 0, 0.06, 0); plaza.castShadow = false;
  const plazaInner = add(island, new THREE.CylinderGeometry(6.2, 6.2, 0.14, 6), toon('#46546e'), 0, 0.08, 0); plazaInner.castShadow = false;
  // clouds drifting under the island
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C(i % 2 ? '#3a3f7a' : '#2b5a6a'), transparent: true, opacity: 0.55, depthWrite: false }));
    const a = (i / 14) * TAU; s.position.set(Math.cos(a) * (R + 6), -10 - Math.random() * 10, Math.sin(a) * (R + 6));
    const k = 22 + Math.random() * 18; s.scale.set(k, k * 0.45, 1); sc.add(s);
    anims.push((t) => { s.position.x += Math.sin(t * 0.1 + i) * 0.01; });
  }

  // ── Floating icon badges ──
  const badgeTex = (emoji, color) => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.beginPath(); x.arc(64, 64, 54, 0, TAU); x.fillStyle = 'rgba(8,12,22,.92)'; x.fill();
    x.lineWidth = 8; x.strokeStyle = color; x.stroke();
    x.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(emoji, 64, 70);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };

  // ── Building shapes (each builds at the origin facing +z, returns its footprint and height) ──
  const B = {
    colosseum(g, col) {
      add(g, new THREE.CylinderGeometry(3.6, 3.9, 0.5, 20), toon('#5a5f73'), 0, 0.25, 0);
      add(g, new THREE.CylinderGeometry(3, 3, 0.1, 20), toon('#c9a66b'), 0, 0.52, 0);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU; if (Math.abs(Math.sin(a / 2)) < 0.12) continue; // gap facing the door
        add(g, new THREE.BoxGeometry(0.45, 2.6, 0.45), toon('#d8d2c4'), Math.sin(a) * 3.2, 1.8, Math.cos(a) * 3.2).rotation.y = a;
      }
      const ring = add(g, new THREE.TorusGeometry(3.2, 0.28, 6, 24), toon('#e8e1d0'), 0, 3.15, 0); ring.rotation.x = Math.PI / 2;
      [-1, 1].forEach((s) => { const f = add(g, new THREE.PlaneGeometry(0.9, 1.4), toon(col, { side: THREE.DoubleSide }), s * 1.2, 4.1, 3.2); anims.push((t) => { f.rotation.y = Math.sin(t * 2 + s) * 0.3; }); add(g, new THREE.CylinderGeometry(0.05, 0.05, 2.4), toon('#ddd'), s * 1.65, 3.9, 3.2); });
      return { fp: 3.9, h: 4.6 };
    },
    trophy(g, col) {
      add(g, new THREE.BoxGeometry(3.4, 0.7, 3.4), toon('#3d4458'), 0, 0.35, 0);
      add(g, new THREE.BoxGeometry(2.6, 2.2, 2.6), toon('#4a5370'), 0, 1.8, 0);
      add(g, new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8), toon('#2b3142'), 0, 3.2, 0);
      const pts = []; for (let i = 0; i <= 10; i++) { const y = i / 10; pts.push(new THREE.Vector2(0.25 + Math.sin(y * Math.PI * 0.9) * 0.9 * (y > 0.3 ? 1 : 0.4), y * 2)); }
      const cup = add(g, new THREE.LatheGeometry(pts, 16), new THREE.MeshToonMaterial({ color: C('#f4b740'), gradientMap: RAMP, emissive: C('#7a4f00'), emissiveIntensity: 0.6 }), 0, 3.5, 0);
      anims.push((t) => { cup.rotation.y = t * 0.8; });
      return { fp: 2.4, h: 5.8 };
    },
    tower(g, col, h = 7) {
      add(g, new THREE.BoxGeometry(3.2, h, 3.2), windowMat('#2c3550', 2, h / 3), 0, h / 2, 0);
      add(g, new THREE.BoxGeometry(3.6, 0.4, 3.6), toon(col), 0, h + 0.2, 0);
      add(g, new THREE.BoxGeometry(2.2, 1.2, 2.2), windowMat('#323d5c', 1, 0.6), 0, h + 1, 0);
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 2.2), toon('#aab'), 0, h + 2.7, 0);
      const tip = add(g, new THREE.SphereGeometry(0.18, 8, 6), glowMat('#ff4d4d', 2), 0, h + 3.8, 0);
      anims.push((t) => { tip.visible = (t % 1.6) < 0.8; });
      add(g, new THREE.BoxGeometry(1.4, 1.6, 0.2), glowMat(col, 0.6), 0, 0.8, 1.65); // door glow
      return { fp: 2.3, h: h + 4 };
    },
    tent(g, col) {
      add(g, new THREE.CylinderGeometry(2.6, 2.6, 1.8, 10), toon('#e9dfc8'), 0, 0.9, 0);
      const roof = add(g, new THREE.ConeGeometry(3.3, 2.4, 10), toon(col, { flatShading: true }), 0, 3, 0);
      roof.rotation.y = Math.PI / 10;
      add(g, new THREE.CylinderGeometry(0.06, 0.06, 1.6), toon('#ddd'), 0, 4.8, 0);
      const flag = add(g, new THREE.PlaneGeometry(0.9, 0.5), toon('#f4b740', { side: THREE.DoubleSide }), 0.45, 5.3, 0);
      anims.push((t) => { flag.rotation.y = Math.sin(t * 3) * 0.4; });
      for (let i = -1; i <= 1; i++) add(g, new THREE.BoxGeometry(1, 0.7, 0.7), toon(['#ff8a5c', '#5aa9ff', '#a78bfa'][i + 1]), i * 1.3, 0.35, 3.1);
      return { fp: 3, h: 5.6 };
    },
    signpost(g, col) {
      add(g, new THREE.CylinderGeometry(1.8, 2.1, 0.5, 8), toon('#4a5570'), 0, 0.25, 0);
      add(g, new THREE.CylinderGeometry(0.22, 0.28, 5.4, 6), toon('#8a6a48'), 0, 3, 0);
      [['#39d98a', 0.6, 4.6], ['#5aa9ff', -1.1, 3.8], ['#f4b740', 2.2, 3]].forEach(([c, a, y]) => {
        const arm = new THREE.Group(); arm.position.y = y; arm.rotation.y = a; g.add(arm);
        add(arm, new THREE.BoxGeometry(2.2, 0.55, 0.14), toon(c), 1.1, 0, 0);
        const tipM = add(arm, new THREE.ConeGeometry(0.4, 0.6, 3), toon(c), 2.4, 0, 0); tipM.rotation.z = -Math.PI / 2;
      });
      const lamp = add(g, new THREE.SphereGeometry(0.35, 10, 8), glowMat('#ffd27a', 1.6), 0, 5.9, 0);
      anims.push((t) => { lamp.scale.setScalar(1 + Math.sin(t * 3) * 0.08); });
      return { fp: 2.1, h: 6.6 };
    },
    dome(g, col) {
      add(g, new THREE.CylinderGeometry(2.7, 2.9, 1.8, 16), toon('#4b5672'), 0, 0.9, 0);
      add(g, new THREE.SphereGeometry(2.5, 20, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: C(col), gradientMap: RAMP, transparent: true, opacity: 0.55, emissive: C(col), emissiveIntensity: 0.35 }), 0, 1.8, 0);
      const ring = add(g, new THREE.TorusGeometry(2.6, 0.12, 6, 32), toon('#cfd8e8'), 0, 2.4, 0); ring.rotation.x = Math.PI / 2;
      const scope = new THREE.Group(); scope.position.set(0, 3.2, 0); g.add(scope);
      add(scope, new THREE.CylinderGeometry(0.35, 0.5, 3, 10), toon('#d9dee8'), 0, 1, 0).rotation.z = 0.6;
      anims.push((t) => { scope.rotation.y = Math.sin(t * 0.4) * 0.8; });
      return { fp: 2.9, h: 5.4 };
    },
    workshop(g, col) {
      add(g, new THREE.BoxGeometry(3.6, 2.4, 3), toon('#46506a'), 0, 1.2, 0);
      const roof = add(g, new THREE.CylinderGeometry(2.1, 2.1, 3.8, 3), toon(col, { flatShading: true }), 0, 3.4, 0);
      roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 2; roof.scale.set(1, 1, 0.55);
      add(g, new THREE.BoxGeometry(0.5, 1.4, 0.5), toon('#555c70'), 1.1, 4.2, -0.6);
      add(g, new THREE.BoxGeometry(1.2, 1.6, 0.15), glowMat(col, 0.55), 0, 0.8, 1.52);
      const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C('#9aa4b8'), transparent: true, opacity: 0.4, depthWrite: false }));
      smoke.position.set(1.1, 5.2, -0.6); g.add(smoke);
      anims.push((t) => { const k = (t * 0.5) % 1; smoke.position.y = 5 + k * 2; smoke.material.opacity = 0.45 * (1 - k); smoke.scale.setScalar(0.6 + k * 1.4); });
      return { fp: 2.4, h: 5.4 };
    },
    server(g, col) {
      add(g, new THREE.BoxGeometry(3, 3.8, 2.6), toon('#20263a'), 0, 1.9, 0);
      for (let i = 0; i < 5; i++) add(g, new THREE.BoxGeometry(2.6, 0.1, 0.05), glowMat(i % 2 ? '#ff6b6b' : '#39d98a', 1.2), 0, 0.6 + i * 0.7, 1.33);
      add(g, new THREE.CylinderGeometry(0.5, 0.6, 0.5, 10), toon('#333'), 0, 4.05, 0);
      const beacon = add(g, new THREE.SphereGeometry(0.42, 12, 8), glowMat('#ff3b3b', 2.2), 0, 4.5, 0);
      const beam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C('#ff3b3b'), transparent: true, opacity: 0.8, depthWrite: false }));
      beam.position.set(0, 4.5, 0); beam.scale.set(3, 3, 1); g.add(beam);
      anims.push((t) => { const on = (Math.sin(t * 6) + 1) / 2; beam.material.opacity = 0.3 + on * 0.6; beacon.scale.setScalar(0.9 + on * 0.2); });
      return { fp: 2.2, h: 5.4 };
    },
    flask(g, col) {
      add(g, new THREE.CylinderGeometry(2.5, 2.7, 1.2, 12), toon('#4a5570'), 0, 0.6, 0);
      add(g, new THREE.SphereGeometry(1.9, 16, 12), new THREE.MeshToonMaterial({ color: C(col), gradientMap: RAMP, transparent: true, opacity: 0.6, emissive: C(col), emissiveIntensity: 0.5 }), 0, 2.9, 0);
      add(g, new THREE.CylinderGeometry(0.5, 0.6, 1.6, 10), new THREE.MeshToonMaterial({ color: C('#cfe'), gradientMap: RAMP, transparent: true, opacity: 0.6 }), 0, 5.2, 0);
      for (let i = 0; i < 6; i++) {
        const b = add(g, new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 8, 6), glowMat('#c8ffe4', 1.3), (Math.random() - 0.5) * 1.6, 2, (Math.random() - 0.5) * 1.6);
        const off = Math.random() * 3; anims.push((t) => { const k = ((t * 0.6 + off) % 1); b.position.y = 1.6 + k * 4.4; b.scale.setScalar(1 - k * 0.6); });
      }
      return { fp: 2.7, h: 6.2 };
    },
    office(g, col) {
      add(g, new THREE.BoxGeometry(4.6, 3, 3.4), windowMat('#33405f', 3, 1), 0, 1.5, 0);
      add(g, new THREE.BoxGeometry(3.4, 2.4, 2.6), windowMat('#3a4870', 2, 0.8), 0, 4.2, 0);
      add(g, new THREE.BoxGeometry(3.8, 0.3, 3), toon(col), 0, 5.55, 0);
      for (let i = -1; i <= 1; i += 2) add(g, new THREE.ConeGeometry(0.4, 1, 6), toon('#2f8f5a'), i * 1.2, 6.2, 0);
      return { fp: 2.8, h: 6.8 };
    },
    podium(g, col) {
      add(g, new THREE.CylinderGeometry(3.2, 3.4, 0.4, 16), toon('#3d4458'), 0, 0.2, 0);
      [[0, 2.4, '#f4b740'], [-1.6, 1.6, '#c9d2e0'], [1.6, 1.1, '#d38b52']].forEach(([x, h, c]) => {
        add(g, new THREE.BoxGeometry(1.5, h, 1.5), toon(c), x, 0.4 + h / 2, 0);
      });
      const star = add(g, new THREE.OctahedronGeometry(0.6), glowMat('#ffd76a', 1.5), 0, 4, 0);
      anims.push((t) => { star.rotation.y = t * 1.5; star.position.y = 4 + Math.sin(t * 2) * 0.2; });
      return { fp: 3.2, h: 5 };
    },
    library(g, col) {
      add(g, new THREE.BoxGeometry(4.6, 0.6, 3.6), toon('#c9c2b0'), 0, 0.3, 0);
      add(g, new THREE.BoxGeometry(3.8, 2.6, 2.6), toon('#8a7f6b'), 0, 1.9, -0.3);
      for (let i = 0; i < 4; i++) add(g, new THREE.CylinderGeometry(0.22, 0.22, 2.6, 8), toon('#ece5d4'), -1.5 + i, 1.9, 1.3);
      const ped = add(g, new THREE.CylinderGeometry(1.4, 1.4, 4.4, 3), toon(col, { flatShading: true }), 0, 3.6, 0.2);
      ped.rotation.z = Math.PI / 2; ped.rotation.x = Math.PI / 2; ped.scale.set(1, 1, 0.6);
      return { fp: 2.8, h: 5 };
    },
  };

  // ── Odyssey Gate (main quest) at the center ──
  const gate = new THREE.Group(); sc.add(gate);
  let gateColor = C(opts.gateColor || '#39d98a');
  add(gate, new THREE.CylinderGeometry(4.2, 4.6, 0.5, 6), toon('#2c3448'), 0, 0.25, 0);
  [-1, 1].forEach((s) => {
    add(gate, new THREE.BoxGeometry(1, 6, 1), toon('#59627c', { flatShading: true }), s * 3, 3, 0);
    add(gate, new THREE.OctahedronGeometry(0.55), glowMat('#ffffff', 1), s * 3, 6.6, 0);
  });
  const gateRingMat = new THREE.MeshBasicMaterial({ color: gateColor.clone().multiplyScalar(1.4), toneMapped: false });
  const gateRing = add(gate, new THREE.TorusGeometry(2.6, 0.3, 10, 48), gateRingMat, 0, 3.6, 0);
  const portalMat = new THREE.MeshBasicMaterial({ map: glowTex, color: gateColor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const portal = add(gate, new THREE.CircleGeometry(2.4, 40), portalMat, 0, 3.6, 0); portal.castShadow = false;
  const spiralTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.translate(128, 128); x.lineCap = 'round';
    for (let arm = 0; arm < 4; arm++) {
      x.rotate(Math.PI / 2); x.beginPath();
      for (let k = 0; k <= 60; k++) { const a = k / 60 * Math.PI * 1.6, rr = 8 + k * 1.9; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 9; x.stroke();
    }
    return new THREE.CanvasTexture(c);
  })();
  const swirlMat = new THREE.MeshBasicMaterial({ map: spiralTex, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const swirl = add(gate, new THREE.CircleGeometry(2.3, 40), swirlMat, 0, 3.6, 0.03); swirl.castShadow = false;
  const gateLight = new THREE.PointLight(gateColor, 30, 18, 2); gateLight.position.set(0, 3.6, 2); gate.add(gateLight);
  const motes = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: gateColor, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.userData = { a: Math.random() * TAU, r: 1 + Math.random() * 3, o: Math.random() * 4 }; m.scale.setScalar(0.35); gate.add(m); motes.push(m);
  }
  anims.push((t) => {
    gateRing.rotation.z = t * 0.5; swirl.rotation.z = -t * 1.2; portal.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
    motes.forEach((m) => { const k = ((t * 0.35 + m.userData.o) % 4) / 4; m.position.set(Math.cos(m.userData.a + t * 0.3) * m.userData.r, k * 7, Math.sin(m.userData.a + t * 0.3) * m.userData.r); m.material.opacity = 1 - k; });
  });
  const gateBadge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex('⭐', '#f4b740'), depthWrite: false })); gateBadge.position.set(0, 8.4, 0); gateBadge.scale.setScalar(1.9); gate.add(gateBadge);
  anims.push((t) => { gateBadge.position.y = 8.4 + Math.sin(t * 2) * 0.25; });

  // ── Zone buildings around the ring ──
  const RING = 24;
  const all = [{ id: 'odyssey', label: opts.gateLabel || 'Odyssey Gate', pos: new THREE.Vector3(0, 0, 0), fp: 4.4, h: 9.4, door: new THREE.Vector3(0, 0, 5.6), sub: 'Main quest' }];
  const n = opts.places.length;
  const start = -122, span = 244; // leave the south side open so the camera sees the city
  opts.places.forEach((p, i) => {
    const a = THREE.MathUtils.degToRad(start + (span / (n - 1)) * i);
    const x = Math.sin(a) * RING, z = -Math.cos(a) * RING;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); island.add(g);
    const info = (B[p.kind] || B.workshop)(g, p.color);
    const toCenter = new THREE.Vector3(-x, 0, -z).normalize();
    const door = new THREE.Vector3(x, 0, z).addScaledVector(toCenter, info.fp + 1.6);
    // path from the plaza to the door
    const len = door.length() - 8.2; const mid = toCenter.clone().multiplyScalar(-(8.2 + len / 2));
    const path = add(island, new THREE.BoxGeometry(2, 0.1, len), toon('#3a4760'), mid.x, 0.05, mid.z); path.rotation.y = Math.atan2(-x, -z); path.castShadow = false;
    // lantern beside the path
    const lp = door.clone().addScaledVector(toCenter, 1.5).add(new THREE.Vector3(toCenter.z, 0, -toCenter.x).multiplyScalar(1.6));
    add(island, new THREE.CylinderGeometry(0.07, 0.09, 2.2, 6), toon('#2b2f3a'), lp.x, 1.1, lp.z);
    add(island, new THREE.SphereGeometry(0.22, 8, 6), glowMat('#ffd27a', 1.5), lp.x, 2.3, lp.z);
    const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C('#ffb84d'), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    lg.position.set(lp.x, 2.3, lp.z); lg.scale.setScalar(1.8); island.add(lg);
    // floating badge
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(p.icon, p.color), depthWrite: false }));
    badge.position.set(0, info.h + 1.3, 0); badge.scale.setScalar(1.6); g.add(badge);
    const off = i * 0.7; anims.push((t) => { badge.position.y = info.h + 1.3 + Math.sin(t * 2 + off) * 0.2; });
    // lock force field, toggled by setLocked
    const field = new THREE.Group(); field.visible = false; g.add(field);
    const fm = new THREE.MeshBasicMaterial({ color: C('#f4b740'), transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    const fieldMesh = add(field, new THREE.SphereGeometry(info.fp + 1, 20, 12, 0, TAU, 0, Math.PI / 2), fm); fieldMesh.castShadow = false;
    const fw = add(field, new THREE.SphereGeometry(info.fp + 1.02, 14, 6, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: C('#f4b740'), wireframe: true, transparent: true, opacity: 0.25 })); fw.castShadow = false;
    anims.push((t) => { if (field.visible) { fm.opacity = 0.1 + Math.sin(t * 2 + off) * 0.04; fw.rotation.y = t * 0.2; } });
    all.push({ id: p.id, label: p.label, sub: p.sub, pos: new THREE.Vector3(x, 0, z), fp: info.fp, h: info.h, door, field, group: g, locked: false });
  });

  // ── Trees and rocks to fill the gaps ──
  {
    const treeMats = [toon('#2f8f6a', { flatShading: true }), toon('#3aa57a', { flatShading: true }), toon('#2a7a78', { flatShading: true })];
    const trunk = toon('#5a4030');
    let placed = 0, tries = 0;
    while (placed < (COARSE ? 34 : 60) && tries < 900) {
      tries += 1;
      const a = Math.random() * TAU, rr = 10 + Math.random() * (R - 12);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (z > 0 && Math.abs(x) < 17) continue; // keep the spawn side clear so the camera sees the city
      if (all.some((b) => Math.hypot(b.pos.x - x, b.pos.z - z) < b.fp + 2.6 || Math.hypot(b.door.x - x, b.door.z - z) < 3)) continue;
      // keep paths clear: distance from the ray center→building
      if (all.slice(1).some((b) => { const d = b.pos.clone().normalize(); const proj = x * d.x + z * d.z; return proj > 0 && Math.abs(x * d.z - z * d.x) < 2.2 && proj < b.pos.length(); })) continue;
      const tr = new THREE.Group(); tr.position.set(x, 0, z); island.add(tr);
      const s = 0.7 + Math.random() * 0.7;
      add(tr, new THREE.CylinderGeometry(0.15 * s, 0.22 * s, 1 * s, 5), trunk, 0, 0.5 * s, 0);
      add(tr, new THREE.ConeGeometry(1.1 * s, 2.2 * s, 6), treeMats[placed % 3], 0, 1.9 * s, 0);
      add(tr, new THREE.ConeGeometry(0.8 * s, 1.6 * s, 6), treeMats[(placed + 1) % 3], 0, 2.8 * s, 0);
      placed += 1;
    }
  }

  // ── Player and wandering players ──
  const kit = makeAvatarKit();
  const look = Object.assign({}, DEFAULT_LOOK, opts.look || {});
  const me = kit.build(look, look.acc);
  me.root.traverse((o) => { if (o.isMesh) o.castShadow = SHADOW; });
  me.root.position.set(0, 0, 11); me.root.rotation.y = Math.PI; sc.add(me.root);
  const ringMat = new THREE.MeshBasicMaterial({ color: C('#39d98a'), transparent: true, opacity: 0.8, depthWrite: false });
  const meRing = add(sc, new THREE.RingGeometry(0.55, 0.72, 32), ringMat, 0, 0.12, 11); meRing.rotation.x = -Math.PI / 2; meRing.castShadow = false;
  const marker = add(sc, new THREE.RingGeometry(0.3, 0.5, 24), new THREE.MeshBasicMaterial({ color: C('#ffffff'), transparent: true, opacity: 0, depthWrite: false }), 0, 0.13, 0);
  marker.rotation.x = -Math.PI / 2; marker.castShadow = false;

  const NPC_COLORS = [['#ff6b6b', '#2b1d14', '#e8b48c'], ['#5aa9ff', '#111111', '#c68a5a'], ['#a78bfa', '#6b3a1f', '#f0c8a0'], ['#f4b740', '#1c1c1c', '#8d5a3b'], ['#39d98a', '#d9b25a', '#f2c9a5'], ['#ff8ad8', '#3a2516', '#b97a52']];
  const npcs = NPC_COLORS.slice(0, COARSE ? 3 : 6).map(([top, hair, skin], i) => {
    const a = kit.build(Object.assign({}, DEFAULT_LOOK, { topColor: top, hairColor: hair, skin }), i % 3 === 0 ? 'headset' : 'none');
    a.root.traverse((o) => { if (o.isMesh) o.castShadow = SHADOW; });
    const ang = Math.random() * TAU; a.root.position.set(Math.cos(ang) * 7, 0, Math.sin(ang) * 7); sc.add(a.root);
    return { a, target: null, wait: Math.random() * 2, speed: 1.6 + Math.random() * 0.8, t0: Math.random() * 10 };
  });

  // ── Camera rig ──
  let yaw = 0, dist = COARSE ? 25 : 26, pitch = 0.58, portrait = false;
  const camTarget = new THREE.Vector3(0, 1.4, 7);
  const camPos = new THREE.Vector3();
  const placeCam = (snap) => {
    const want = new THREE.Vector3(
      me.root.position.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      me.root.position.y + 1.4 + Math.sin(pitch) * dist,
      me.root.position.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    const ahead = portrait ? 7 : 9; const focus = me.root.position.clone(); focus.y += portrait ? -3.5 : 1.4; focus.x -= Math.sin(yaw) * ahead; focus.z -= Math.cos(yaw) * ahead; // look a little ahead of the player
    if (snap || REDUCE) { camPos.copy(want); camTarget.copy(focus); }
    else { camPos.lerp(want, 0.08); camTarget.lerp(focus, 0.12); }
    cam.position.copy(camPos); cam.lookAt(camTarget);
  };
  placeCam(true);

  // ── HTML labels over buildings ──
  const labels = all.map((b) => {
    const el = document.createElement('button'); el.type = 'button'; el.className = `ws-label${b.id === 'odyssey' ? ' gate' : ''}`;
    el.innerHTML = `<b></b><small></small>`;
    el.querySelector('b').textContent = b.label; el.querySelector('small').textContent = b.sub || '';
    el.addEventListener('click', (e) => { e.stopPropagation(); walkTo(b.id); });
    layer.appendChild(el); return { b, el };
  });
  const tmp = new THREE.Vector3();
  const drawLabels = (w, h) => {
    labels.forEach(({ b, el }) => {
      tmp.copy(b.pos); tmp.y = b.h + (b.id === 'odyssey' ? 0.6 : 2.6);
      const d = tmp.distanceTo(cam.position);
      tmp.project(cam);
      const sy = ((1 - tmp.y) / 2) * h, sx = ((tmp.x + 1) / 2) * w;
      const show = tmp.z < 1 && d < 75 && sx > 50 && sx < w - 50 && sy > (portrait ? 128 : 84) && sy < h - 40;
      el.style.display = show ? '' : 'none';
      if (!show) return;
      el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      el.style.opacity = String(Math.max(0.35, Math.min(1, 1.4 - d / 50)));
      el.style.zIndex = String(1000 - Math.round(d));
      el.classList.toggle('locked', !!b.locked);
      el.classList.toggle('near', nearId === b.id);
    });
  };

  // ── Movement ──
  let target = null, pendingId = null, nearId = null;
  const keys = new Set();
  const SPEED = 6.5;
  const clampToIsland = (v) => {
    const l = Math.hypot(v.x, v.z); if (l > R - 2.5) { v.x *= (R - 2.5) / l; v.z *= (R - 2.5) / l; }
    all.forEach((b) => { // push out of buildings
      const dx = v.x - b.pos.x, dz = v.z - b.pos.z, dd = Math.hypot(dx, dz), min = b.fp + 0.4;
      if (dd < min && dd > 0.0001) { v.x = b.pos.x + (dx / dd) * min; v.z = b.pos.z + (dz / dd) * min; }
    });
    return v;
  };
  // Step from `pos` toward direction (dx, dz) by `step`, sliding around buildings when blocked head-on.
  const stepAround = (pos, dx, dz, step) => {
    const l = Math.hypot(dx, dz) || 1; const ux = dx / l, uz = dz / l;
    const tryDir = (a) => {
      const c = Math.cos(a), sn = Math.sin(a), vx = ux * c - uz * sn, vz = ux * sn + uz * c;
      const nx = clampToIsland(new THREE.Vector3(pos.x + vx * step, 0, pos.z + vz * step));
      const prog = (nx.x - pos.x) * ux + (nx.z - pos.z) * uz;
      return { nx, prog, vx, vz };
    };
    let best = tryDir(0);
    if (best.prog < step * 0.5) {
      // blocked: pick the turn that keeps us moving, favouring forward progress (sticky side avoids jitter)
      const score = (c) => c.prog + Math.hypot(c.nx.x - pos.x, c.nx.z - pos.z) * 0.6;
      const side = pos.userData_side || 1;
      let bestScore = score(best);
      [0.5, 0.9, 1.3, 1.57].forEach((a) => [side, -side].forEach((sg) => {
        const c = tryDir(a * sg), sc2 = score(c) - (sg !== side ? 0.02 : 0);
        if (sc2 > bestScore + 0.001) { best = c; bestScore = sc2; pos.userData_side = sg; }
      }));
    }
    return best;
  };
  function walkTo(id) {
    const b = all.find((x) => x.id === id); if (!b) return;
    target = b.door.clone(); pendingId = id; showMarker(target);
  }
  const showMarker = (p) => { marker.position.set(p.x, 0.13, p.z); marker.material.opacity = 0.9; marker.scale.setScalar(1); };

  const stepAvatar = (a, t, moving, speedK) => {
    if (moving) {
      const w = t * 10 * speedK;
      a.root.position.y = Math.abs(Math.sin(w)) * 0.09;
      a.armL.rotation.x = Math.sin(w) * 0.7; a.armR.rotation.x = -Math.sin(w) * 0.7;
      a.torso.rotation.y = Math.sin(w) * 0.06;
    } else {
      a.root.position.y *= 0.8; a.torso.rotation.y *= 0.8;
      if (!REDUCE) kit.idle(a, t);
    }
  };
  const turnToward = (a, dx, dz, k = 0.2) => {
    const want = Math.atan2(dx, dz); let d = want - a.root.rotation.y;
    d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; a.root.rotation.y += d * k;
  };

  // ── Input ──
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitboxes = all.map((b) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(b.fp + 0.3, b.fp + 0.3, b.h, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    m.position.set(b.pos.x, b.h / 2, b.pos.z); m.userData.id = b.id; sc.add(m); return m;
  });
  let down = null;
  const el = r.domElement;
  el.style.touchAction = 'none';
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId }; el.setPointerCapture && el.setPointerCapture(e.pointerId); };
  const onMove = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 6) down.moved = true;
    if (down.moved) {
      yaw -= dx * 0.006; pitch = Math.max(0.28, Math.min(1.15, pitch + dy * 0.004));
      down.x = e.clientX; down.y = e.clientY;
    }
  };
  const onUp = (e) => {
    const wasClick = down && !down.moved; down = null;
    if (!wasClick) return;
    const rect = el.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(hitboxes, false)[0];
    if (hit) { walkTo(hit.object.userData.id); return; }
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(groundPlane, p)) { target = clampToIsland(p); pendingId = null; showMarker(target); }
  };
  const onWheel = (e) => { e.preventDefault(); dist = Math.max(10, Math.min(42, dist + e.deltaY * 0.025)); };
  const KEYMAP = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r' };
  const typing = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA'; };
  const onKeyDown = (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k && !typing()) { keys.add(k); target = null; pendingId = null; if (e.key.startsWith('Arrow')) e.preventDefault(); } };
  const onKeyUp = (e) => { const k = KEYMAP[e.key.toLowerCase()]; if (k) keys.delete(k); };
  const onBlur = () => keys.clear();
  el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', () => { down = null; });
  el.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', onBlur);

  // ── Resize ──
  let W = 1, H = 1;
  const size = () => {
    W = container.clientWidth || 1; H = container.clientHeight || 1; r.setSize(W, H, false); cam.aspect = W / H;
    const was = portrait; portrait = cam.aspect < 0.85; cam.fov = portrait ? 66 : 48;
    if (portrait !== was) { dist = portrait ? 32 : 26; pitch = portrait ? 0.5 : 0.58; }
    cam.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(size); ro.observe(container); size(); placeCam(true);

  // ── Loop ──
  const clock = new THREE.Clock();
  let raf = 0, ready = false, alive = true;
  const frame = () => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;

    // player movement: keys first, then click target
    let mx = 0, mz = 0;
    if (keys.size) {
      const f = (keys.has('f') ? 1 : 0) - (keys.has('b') ? 1 : 0), s = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0);
      mx = -Math.sin(yaw) * f + Math.cos(yaw) * s; mz = -Math.cos(yaw) * f - Math.sin(yaw) * s;
    } else if (target) {
      mx = target.x - me.root.position.x; mz = target.z - me.root.position.z;
      if (Math.hypot(mx, mz) < 0.25) { target = null; mx = mz = 0; if (pendingId) { const b = all.find((x) => x.id === pendingId); if (b) turnToward(me, b.pos.x - me.root.position.x, b.pos.z - me.root.position.z, 1); if (opts.onArrive) opts.onArrive(pendingId); pendingId = null; } }
    }
    const ml = Math.hypot(mx, mz), moving = ml > 0.001;
    if (moving) {
      const step = Math.min(ml, SPEED * dt);
      const mv = stepAround(me.root.position, mx, mz, step);
      me.root.position.x = mv.nx.x; me.root.position.z = mv.nx.z;
      turnToward(me, mv.vx, mv.vz);
    }
    stepAvatar(me, t, moving, 1);
    meRing.position.set(me.root.position.x, 0.12, me.root.position.z);
    ringMat.opacity = 0.55 + Math.sin(t * 3) * 0.25;
    if (marker.material.opacity > 0) { marker.material.opacity = Math.max(0, marker.material.opacity - dt * 0.8); marker.scale.setScalar(marker.scale.x + dt * 0.8); }

    // which door is the player standing at?
    let near = null;
    all.forEach((b) => { if (Math.hypot(b.door.x - me.root.position.x, b.door.z - me.root.position.z) < 2.4) near = b.id; });
    if (near !== nearId) { nearId = near; if (opts.onNear) opts.onNear(nearId); }

    // wandering players
    npcs.forEach((n) => {
      const p = n.a.root.position;
      if (!n.target) {
        n.wait -= dt;
        if (n.wait <= 0) {
          const pick = Math.random() < 0.6 ? all[1 + Math.floor(Math.random() * (all.length - 1))].door.clone() : new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12 + 3);
          n.target = pick.add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
        }
        stepAvatar(n.a, t + n.t0, false, 1);
        return;
      }
      const dx = n.target.x - p.x, dz = n.target.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { n.target = null; n.wait = 1.5 + Math.random() * 4; return; }
      const step = Math.min(d, n.speed * dt), mv = stepAround(p, dx, dz, step);
      p.x = mv.nx.x; p.z = mv.nx.z; turnToward(n.a, mv.vx, mv.vz, 0.15);
      stepAvatar(n.a, t + n.t0, true, n.speed / SPEED * 1.6);
    });

    if (!REDUCE) anims.forEach((f) => f(t, dt));
    placeCam(false);
    r.render(sc, cam);
    drawLabels(W, H);
    if (!ready) { ready = true; if (opts.onReady) opts.onReady(); }
  };
  frame();

  return {
    ok: true,
    setLocked(set) {
      all.forEach((b) => { if (b.field) { b.locked = set.has(b.id); b.field.visible = b.locked; } });
    },
    setGateColor(hex) {
      gateColor = C(hex || '#39d98a');
      gateRingMat.color.copy(gateColor).multiplyScalar(1.4); portalMat.color.copy(gateColor); gateLight.color.copy(gateColor);
      motes.forEach((m) => m.material.color.copy(gateColor));
    },
    setGateLabel(text, sub) {
      const g = labels[0]; g.el.querySelector('b').textContent = text; g.el.querySelector('small').textContent = sub || '';
    },
    walkTo,
    destroy() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur);
      sc.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); if (m.emissiveMap) m.emissiveMap.dispose(); m.dispose(); });
      });
      kit.destroy(); glowTex.dispose(); windowTex.dispose(); RAMP.dispose();
      r.dispose(); r.domElement.remove(); layer.remove();
    },
  };
}

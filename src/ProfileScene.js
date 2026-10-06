// ProfileScene.js
// 3D banner for the Profile page: a stylized chibi avatar (cel shaded, ink outlines) on a
// tier-coloured pedestal, in front of a switchable banner scene.
// const scene = mountProfileScene(container, { look, acc, accent, banner });
// scene.setAvatar(look, acc) · scene.setAccent(hex) · scene.setBanner(id) · scene.destroy()
import * as THREE from 'three';
import { makeAvatarKit, TIER_COLORS } from './avatarKit';

export { TIER_COLORS };
const TAU = Math.PI * 2;

export default function mountProfileScene(container, init) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const noop = { setAvatar() {}, setAccent() {}, setBanner() {}, destroy() {} };

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return noop; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));
  renderer.setClearColor(0x050a10, 1);
  container.appendChild(renderer.domElement);
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 300);
  const C = (h) => new THREE.Color(h);

  sc.add(new THREE.HemisphereLight(0xdfeaff, 0x203040, 1.3));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.7); key.position.set(4, 8, 6); sc.add(key);
  const rim = new THREE.PointLight(0xffffff, 2.5, 14, 0); rim.position.set(-2.5, 2.6, -2.5); sc.add(rim);

  let dirty = true;
  const shade = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const disposeTree = (g) => g.traverse((o) => {
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.userData.keep) return; if (m.map) m.map.dispose(); m.dispose(); });
  });

  // ── Pedestal and aura ─────────────────────────────────────────────────────
  let accent = init.accent || TIER_COLORS[0];
  rim.color = C(accent);
  const ped = new THREE.Group(); sc.add(ped);
  ped.add(new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.2, 40), new THREE.MeshStandardMaterial({ color: C('#141c26'), roughness: 0.7 })));
  const pring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: C(accent) }));
  pring.rotation.x = Math.PI / 2; pring.position.y = 0.11; ped.add(pring);
  const pring2 = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: C(accent), transparent: true, opacity: 0.5 }));
  pring2.rotation.x = Math.PI / 2; pring2.position.y = 0.11; ped.add(pring2);
  const AP = 70, ap = new Float32Array(AP * 3), aseed = Array.from({ length: AP }, () => Math.random());
  const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(ap, 3));
  const aura = new THREE.Points(ag, new THREE.PointsMaterial({ color: C(accent), size: 0.07, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  sc.add(aura);

  // ── Avatar (shared kit) ───────────────────────────────────────────────────
  const kit = makeAvatarKit();
  let av = null, rig = {}, haloMesh = null, rotY = 0.35;
  function buildAvatar(L, acc) {
    if (av) { sc.remove(av); kit.disposeAvatar(av); }
    rig = kit.build(L, acc); haloMesh = rig.halo; av = rig.root;
    av.position.y = 0.1; av.rotation.y = rotY; av.scale.setScalar(0.95); sc.add(av); dirty = true;
  }

  // ── Banners ───────────────────────────────────────────────────────────────
  let bannerG = null, bannerUpdate = null;
  function grid(g, c1, c2) {
    const gr = new THREE.GridHelper(120, 60, C(c1), C(c2)); g.add(gr);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ color: C('#04070c') }));
    f.rotation.x = -Math.PI / 2; f.position.y = -0.02; g.add(f); return gr;
  }
  function stars(g, n, col, spread) {
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * spread; p[i * 3 + 1] = Math.random() * 22; p[i * 3 + 2] = -10 - Math.random() * 30; }
    const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(b, new THREE.PointsMaterial({ color: C(col), size: 0.09, transparent: true, opacity: 0.85, depthWrite: false })); g.add(pts); return pts;
  }
  function windowTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#071019'; x.fillRect(0, 0, 64, 128);
    let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let y = 4; y < 124; y += 8) for (let xx = 4; xx < 60; xx += 8) { const v = r(); if (v < 0.55) continue; x.fillStyle = v > 0.93 ? '#f4b740' : v > 0.8 ? '#5ff0ff' : '#1fe08a'; x.globalAlpha = 0.4 + r() * 0.6; x.fillRect(xx, y, 4, 3); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const BANNERS = {
    neon() {
      const g = new THREE.Group(); sc.fog = new THREE.Fog(C('#050b14'), 14, 55); renderer.setClearColor(0x050b14, 1);
      const gr = grid(g, '#1fe08a', '#0c3a2a');
      const N = 80, tw = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ map: windowTexture() }), N);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
      let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < N; i++) { const w = 2 + r() * 3.5, d = 2 + r() * 3, h = 4 + Math.pow(r(), 1.8) * 16; s.set(w, h, d); p.set((r() - 0.5) * 70, h / 2, -12 - r() * 28); m.compose(p, q, s); tw.setMatrixAt(i, m); }
      g.add(tw); const st = stars(g, 160, '#bff8ff', 90);
      return { g, update(t) { gr.position.z = (t * 1.6) % 2; st.rotation.y = t * 0.01; } };
    },
    grid() {
      const g = new THREE.Group(); sc.fog = new THREE.Fog(C('#12041f'), 16, 60); renderer.setClearColor(0x12041f, 1);
      const gr = grid(g, '#ff4fd8', '#5a1a6e');
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const grd = x.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#fff06a'); grd.addColorStop(0.5, '#ff7a3d'); grd.addColorStop(1, '#ff2b9a');
      x.fillStyle = grd; x.beginPath(); x.arc(128, 128, 120, 0, TAU); x.fill(); x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 6; i++) x.fillRect(0, 150 + i * 16, 256, 3 + i * 1.5);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const sun = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false })); sun.position.set(0, 10, -42); g.add(sun);
      for (let i = 0; i < 9; i++) { const mt = new THREE.Mesh(new THREE.ConeGeometry(5 + (i % 3) * 2, 8 + (i % 4) * 3, 4), new THREE.MeshBasicMaterial({ color: C('#1b0a33') })); mt.position.set(-36 + i * 9, 3, -38); g.add(mt); }
      return { g, update(tt) { gr.position.z = (tt * 2.4) % 2; } };
    },
    aurora() {
      const g = new THREE.Group(); sc.fog = new THREE.Fog(C('#030a10'), 20, 70); renderer.setClearColor(0x030a10, 1);
      const gr = grid(g, '#2fb4a0', '#0b3038'); const st = stars(g, 260, '#ffffff', 100);
      const rb = ['#39ff88', '#35c4e6', '#a78bfa'].map((c, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(80, 9, 60, 1), new THREE.MeshBasicMaterial({ color: C(c), transparent: true, opacity: 0.32, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        m.position.set(0, 11 + i * 2.2, -26 - i * 4); m.rotation.x = -0.12; m.userData.base = m.geometry.attributes.position.array.slice(); g.add(m); return m;
      });
      return { g, update(t) {
        rb.forEach((m, k) => { const a = m.geometry.attributes.position.array, b = m.userData.base; for (let i = 0; i < a.length; i += 3) { a[i + 1] = b[i + 1] + Math.sin(b[i] * 0.11 + t * 0.7 + k * 1.7) * 2.4; a[i + 2] = Math.cos(b[i] * 0.07 + t * 0.4 + k) * 2; } m.geometry.attributes.position.needsUpdate = true; });
        st.rotation.y = t * 0.008; gr.position.z = (t * 0.8) % 2;
      } };
    },
    gold() {
      const g = new THREE.Group(); sc.fog = new THREE.Fog(C('#140b02'), 14, 55); renderer.setClearColor(0x140b02, 1);
      const gr = grid(g, '#f4b740', '#5a3d0a');
      const rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(6 + i * 2.6, 0.06, 8, 80), new THREE.MeshBasicMaterial({ color: C('#f4b740'), transparent: true, opacity: 0.6 - i * 0.12 })); r.position.set(0, 6, -16 - i * 3); g.add(r); return r; });
      const N = 260, p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 40; p[i * 3 + 1] = Math.random() * 20; p[i * 3 + 2] = -4 - Math.random() * 24; }
      const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.BufferAttribute(p, 3));
      g.add(new THREE.Points(b, new THREE.PointsMaterial({ color: C('#ffd76a'), size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
      return { g, update(t, dt) {
        rings.forEach((r, i) => { r.rotation.x = t * 0.2 * (i + 1); r.rotation.y = t * 0.15; });
        const a = b.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] += dt * 1.2; if (a[i] > 20) a[i] = 0; } b.attributes.position.needsUpdate = true;
        gr.position.z = (t * 1.2) % 2;
      } };
    },
  };
  function setBanner(id) {
    if (bannerG) { sc.remove(bannerG); disposeTree(bannerG); }
    const b = (BANNERS[id] || BANNERS.neon)(); bannerG = b.g; bannerUpdate = b.update; sc.add(bannerG); dirty = true;
  }
  function setAccent(c) {
    accent = c; [pring.material, pring2.material, aura.material].forEach((m) => m.color.set(c)); rim.color.set(c); dirty = true;
  }

  // ── Framing and interaction ───────────────────────────────────────────────
  function resize() {
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, true); cam.aspect = w / h;
    const narrow = w < 640 || w / h < 1.2;
    cam.fov = narrow ? 44 : 32; cam.position.set(0, 1.9, narrow ? 7.6 : 6.6); cam.lookAt(0, 1.12, 0);
    if (narrow) cam.setViewOffset(w, h, 0, h * 0.2, w, h); else cam.setViewOffset(w, h, -w * 0.27, 0, w, h);
    cam.updateProjectionMatrix(); dirty = true;
  }
  const ro = new ResizeObserver(resize); ro.observe(container);

  let vel = 0, down = null, wave = 0, visible = true, px = 0, py = 0, lookX = 0, lookY = 0;
  const cv = renderer.domElement;
  const onDown = (e) => { down = { x: e.clientX, moved: false }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
  const onMove = (e) => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 3) down.moved = true; rotY += dx * 0.012; vel = dx * 0.012; down.x = e.clientX; dirty = true; };
  const onUp = () => { if (down && !down.moved) { wave = 1.6; dirty = true; } down = null; };
  const onCancel = () => { down = null; };
  const onLook = (e) => {
    const r = container.getBoundingClientRect(); const ax = r.left + r.width * (r.width < 640 ? 0.5 : 0.77), ay = r.top + r.height * 0.35;
    px = Math.max(-1, Math.min(1, (e.clientX - ax) / (r.width * 0.5))); py = Math.max(-1, Math.min(1, (e.clientY - ay) / (r.height * 0.8))); if (REDUCE) dirty = true;
  };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onCancel);
  window.addEventListener('pointermove', onLook);
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(container);

  setBanner(init.banner); buildAvatar(init.look, init.acc); setAccent(accent); resize();

  let raf = 0, last = performance.now(), t = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (REDUCE && !dirty) return; dirty = false;
    if (!down) { rotY += vel; vel *= 0.92; }
    if (av) {
      av.rotation.y = rotY + (REDUCE ? 0 : Math.sin(t * 0.5) * 0.12);
      if (!REDUCE) {
        rig.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.015; av.position.y = 0.1 + Math.abs(Math.sin(t * 1.1)) * 0.025;
        lookY += (px * 0.55 - lookY) * Math.min(1, dt * 4); lookX += (py * 0.25 - lookX) * Math.min(1, dt * 4);
        rig.head.rotation.y = lookY + Math.sin(t * 0.7) * 0.06; rig.head.rotation.x = lookX; rig.head.rotation.z = Math.sin(t * 0.9) * 0.04;
        const blink = (t % 3.6) < 0.12 ? 0.12 : 1; rig.eyes.forEach((e) => { e.scale.y = blink; });
        rig.armL.rotation.x = Math.sin(t * 1.6) * 0.06; if (wave <= 0) rig.armR.rotation.x = -Math.sin(t * 1.6) * 0.06;
        if (haloMesh) { haloMesh.position.y = 1.02 + Math.sin(t * 2) * 0.03; haloMesh.rotation.z = t; }
      }
      if (wave > 0) { wave -= dt; rig.armR.rotation.z = 2.5 + Math.sin(t * 14) * 0.35; }
      else rig.armR.rotation.z += (0.16 - rig.armR.rotation.z) * Math.min(1, dt * 8);
    }
    if (bannerUpdate && !REDUCE) bannerUpdate(t, dt);
    if (!REDUCE) {
      pring2.scale.setScalar(1 + Math.sin(t * 1.6) * 0.04);
      for (let i = 0; i < AP; i++) { const a = aseed[i] * TAU + t * (0.3 + aseed[i] * 0.4), r = 1.2 + aseed[i] * 1.2; ap[i * 3] = Math.cos(a) * r; ap[i * 3 + 1] = (t * (0.25 + aseed[i] * 0.4) + aseed[i] * 3) % 3.2; ap[i * 3 + 2] = Math.sin(a) * r; }
      ag.attributes.position.needsUpdate = true;
    }
    renderer.render(sc, cam);
  }
  raf = requestAnimationFrame(frame);

  return {
    setAvatar: buildAvatar, setAccent, setBanner,
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onLook);
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onCancel);
      if (av) kit.disposeAvatar(av); disposeTree(sc); kit.destroy(); renderer.dispose(); cv.remove();
    },
  };
}

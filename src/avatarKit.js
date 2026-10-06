import * as THREE from 'three';
export const TIER_COLORS = ['#39ff88', '#35c4e6', '#a78bfa', '#f4b740', '#ff4fd8'];
export const DEFAULT_LOOK = { hair: 'short', hairColor: '#2b1d14', top: 'hoodie', topColor: '#35c4e6', acc: 'headset', skin: '#f0b894', build: 'broad', face: 'plain', bottom: 'pants', bottomColor: '#2f3b55', banner: 'neon' };
const TAU = Math.PI * 2;

// The player's saved look: on the user doc if present, else the per-device copy the Profile page saves.
export function loadLook(uid, userData) {
  let saved = userData && userData.avatarLook;
  if (!saved) { try { saved = JSON.parse(window.localStorage.getItem(`evoprofile:${uid || 'anon'}`) || 'null'); } catch (e) { saved = null; } }
  return Object.assign({}, DEFAULT_LOOK, saved || {});
}

export function makeAvatarKit() {
  const C = (h) => new THREE.Color(h);
  const shade = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const RAMP = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
  RAMP.minFilter = RAMP.magFilter = THREE.NearestFilter; RAMP.generateMipmaps = false; RAMP.needsUpdate = true;
  const toon = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: C(c), gradientMap: RAMP }, o || {}));
  const INK = new THREE.ShaderMaterial({
    uniforms: { thick: { value: 0.016 }, col: { value: new THREE.Color(0x0b0f17) } }, side: THREE.BackSide,
    vertexShader: 'uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0);\n#include <colorspace_fragment>\n}',
  });
  INK.userData.keep = true;
  function capsuleGeo(r, len, seg) {
    const pts = [], n = 8;
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r), -len / 2 + Math.sin(a) * r)); }
    for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r), len / 2 + Math.sin(a) * r)); }
    return new THREE.LatheGeometry(pts, seg || 20);
  }
  const sph = (r, ws, hs, t0, tl) => new THREE.SphereGeometry(r, ws || 24, hs || 18, 0, TAU, t0 || 0, tl == null ? Math.PI : tl);
  function add(parent, geo, color, pos, o) {
    o = o || {};
    const m = new THREE.Mesh(geo, o.mat || toon(color, o.m)); if (pos) m.position.set(pos[0], pos[1], pos[2]);
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]); if (o.r) m.rotation.set(o.r[0] || 0, o.r[1] || 0, o.r[2] || 0);
    if (!o.noInk) m.add(new THREE.Mesh(geo, INK));
    parent.add(m); return m;
  }

  function build(L, acc) {
    L = Object.assign({}, DEFAULT_LOOK, L || {});
    const root = new THREE.Group(), skin = L.skin || '#f0b894', top = L.topColor, hc = L.hairColor, pants = L.bottomColor || '#2f3b55';
    const slim = L.build === 'slim', bottom = L.bottom || 'pants', sx = slim ? 0.29 : 0.31;
    const eyes = [];
    add(root, sph(0.26), pants, [0, 0.64, 0], { s: [slim ? 1.1 : 1.05, 0.55, 0.8] });
    if (bottom === 'skirt') add(root, new THREE.CylinderGeometry(0.25, 0.4, 0.34, 28, 1), pants, [0, 0.5, 0]);
    [-1, 1].forEach((sd) => {
      add(root, capsuleGeo(slim ? 0.085 : 0.095, 0.3), bottom === 'pants' ? pants : skin, [sd * 0.12, 0.42, 0]);
      if (bottom === 'shorts') add(root, capsuleGeo(0.105, 0.08), pants, [sd * 0.12, 0.54, 0]);
      add(root, sph(0.125), '#eef1f6', [sd * 0.12, 0.05, 0.05], { s: [0.95, 0.42, 1.35] });
      add(root, sph(0.12), top, [sd * 0.12, 0.11, 0.04], { s: [0.9, 0.55, 1.25] });
    });
    const torso = new THREE.Group(); torso.position.y = 0.95; root.add(torso);
    add(torso, capsuleGeo(0.27, 0.26, 24), top, [0, 0, 0], { s: [slim ? 0.9 : 1.05, 1, slim ? 0.78 : 0.82] });
    if (L.top === 'hoodie') {
      add(torso, new THREE.TorusGeometry(0.19, 0.075, 10, 24), top, [0, 0.36, -0.13], { r: [1.25, 0, 0] });
      add(torso, new THREE.BoxGeometry(0.3, 0.12, 0.04), shade(top, 0.82), [0, -0.16, 0.215], { noInk: true });
      [-0.05, 0.05].forEach((x) => add(torso, new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), '#ffffff', [x, 0.2, 0.235], { noInk: true }));
    }
    if (L.top === 'jacket') {
      add(torso, new THREE.BoxGeometry(0.15, 0.48, 0.03), '#f3e9d8', [0, 0.02, 0.215], { noInk: true });
      add(torso, new THREE.TorusGeometry(0.16, 0.045, 8, 24), top, [0, 0.36, 0], { r: [Math.PI / 2, 0, 0] });
      [-0.085, 0.085].forEach((x) => add(torso, new THREE.BoxGeometry(0.012, 0.46, 0.03), shade(top, 0.6), [x, 0.02, 0.222], { noInk: true }));
    }
    if (L.top === 'tee') add(torso, new THREE.TorusGeometry(0.12, 0.025, 8, 20), shade(top, 0.8), [0, 0.37, 0.02], { r: [Math.PI / 2, 0, 0], noInk: true });
    if (acc === 'cape') add(torso, new THREE.CylinderGeometry(0.33, 0.46, 0.9, 20, 1, true, Math.PI * 0.62, Math.PI * 0.76), TIER_COLORS[3], [0, -0.18, 0], { m: { side: THREE.DoubleSide } });
    const arm = (sd) => {
      const g = new THREE.Group(); g.position.set(sd * sx, 1.24, 0); g.rotation.z = sd * 0.16; root.add(g);
      if (L.top === 'tee') { add(g, capsuleGeo(0.098, 0.06), top, [0, -0.07, 0]); add(g, capsuleGeo(0.072, 0.26), skin, [0, -0.25, 0]); }
      else { add(g, capsuleGeo(0.085, 0.3), top, [0, -0.22, 0]); add(g, new THREE.TorusGeometry(0.075, 0.022, 6, 16), shade(top, 0.8), [0, -0.42, 0], { r: [Math.PI / 2, 0, 0], noInk: true }); }
      add(g, sph(0.085), skin, [0, -0.5, 0.01]);
      return g;
    };
    const armL = arm(-1), armR = arm(1);
    const head = new THREE.Group(); head.position.y = 1.34; root.add(head);
    add(head, sph(0.42, 32, 24), skin, [0, 0.4, 0], { s: [1, 0.95, 0.95] });
    [-1, 1].forEach((sd) => add(head, sph(0.075, 12, 10), skin, [sd * 0.41, 0.38, -0.02]));
    const eyeMat = new THREE.MeshBasicMaterial({ color: C('#121521') }), shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-1, 1].forEach((sd) => {
      const e = new THREE.Group(); e.position.set(sd * 0.15, 0.41, 0.37); head.add(e);
      const ball = new THREE.Mesh(sph(0.07, 16, 12), eyeMat); ball.scale.set(0.85, 1.15, 0.45); e.add(ball);
      const hl = new THREE.Mesh(sph(0.022, 8, 6), shine); hl.position.set(0.022, 0.03, 0.028); e.add(hl);
      const hl2 = new THREE.Mesh(sph(0.01, 6, 4), shine); hl2.position.set(-0.02, -0.03, 0.03); e.add(hl2);
      eyes.push(e);
      if (L.face === 'lashes') [0, 1].forEach((n) => { const lash = new THREE.Mesh(capsuleGeo(0.009, 0.045, 6), eyeMat); lash.position.set(sd * (0.065 + n * 0.012), 0.08 - n * 0.025, 0.01); lash.rotation.z = sd * (-0.9 - n * 0.35); e.add(lash); });
      add(head, capsuleGeo(0.014, 0.08, 8), hc === '#e8d27a' ? '#9a7a3a' : hc, [sd * 0.15, 0.55, 0.355], { r: [0, 0, Math.PI / 2 + sd * 0.15], noInk: true });
      const blush = new THREE.Mesh(sph(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: C('#ff8a8a'), transparent: true, opacity: 0.45, depthWrite: false }));
      blush.position.set(sd * 0.25, 0.31, 0.33); blush.scale.set(1, 0.55, 0.3); head.add(blush);
    });
    add(head, new THREE.TorusGeometry(0.045, 0.012, 6, 14, Math.PI), L.face === 'lashes' ? '#b23a4a' : '#8a2f2f', [0, 0.27, 0.392], { r: [0, 0, Math.PI], noInk: true });
    if (L.face === 'freckles') [-1, 1].forEach((sd) => [[0.2, 0.33], [0.25, 0.3], [0.23, 0.36], [0.28, 0.34]].forEach(([x, y]) => add(head, sph(0.017, 6, 4), shade(skin, 0.5), [sd * x, y, Math.sqrt(Math.max(0, 0.162 - x * x - (y - 0.4) * (y - 0.4))) + 0.005], { noInk: true })));
    add(head, sph(0.025, 10, 8), shade(skin, 0.85), [0, 0.35, 0.405], { noInk: true });
    if (L.hair !== 'none') {
      add(head, sph(0.45, 32, 20, 0, 1.3), hc, [0, 0.41, -0.02], { r: [-0.32, 0, 0] });
      [[-0.17, 0.66, 0.29, 0.4], [0, 0.71, 0.32, 0], [0.17, 0.66, 0.29, -0.4]].forEach(([x, y, z, rz]) => add(head, sph(0.13, 14, 10), hc, [x, y, z], { s: [1.15, 0.62, 0.6], r: [0.5, 0, rz] }));
      [-1, 1].forEach((sd) => add(head, sph(0.12, 12, 10), hc, [sd * 0.36, 0.5, 0.06], { s: [0.55, 1.1, 0.8] }));
    }
    if (L.hair === 'spiky') for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; add(head, new THREE.ConeGeometry(0.075, 0.24, 8), hc, [Math.sin(a) * 0.3, 0.82 + Math.cos(a * 1.4) * 0.05, -0.06 + Math.cos(a) * 0.08], { r: [-0.25, 0, -a * 0.9] }); }
    if (L.hair === 'bun') add(head, sph(0.15, 16, 12), hc, [0, 0.86, -0.22]);
    if (L.hair === 'long') {
      add(head, sph(0.44, 24, 18), hc, [0, 0.2, -0.17], { s: [1.04, 1.28, 0.62] });
      [-1, 1].forEach((sd) => add(head, capsuleGeo(0.085, 0.36, 12), hc, [sd * 0.36, 0.16, 0.1], { r: [0, 0, sd * 0.06] }));
    }
    if (L.hair === 'ponytail') {
      add(head, sph(0.07, 12, 10), shade(TIER_COLORS[0], 0.9), [0, 0.64, -0.4], { noInk: true });
      add(head, capsuleGeo(0.1, 0.36, 14), hc, [0, 0.4, -0.5], { r: [0.35, 0, 0] });
    }
    if (L.hair === 'pigtails') [-1, 1].forEach((sd) => {
      add(head, sph(0.06, 10, 8), shade(TIER_COLORS[1], 0.9), [sd * 0.44, 0.5, -0.06], { noInk: true });
      add(head, capsuleGeo(0.095, 0.3, 14), hc, [sd * 0.5, 0.3, -0.06], { r: [0, 0, sd * 0.25] });
    });
    if (L.hair === 'bob') {
      add(head, sph(0.43, 24, 18), hc, [0, 0.33, -0.12], { s: [1.08, 0.98, 0.72] });
      [-1, 1].forEach((sd) => add(head, sph(0.16, 14, 12), hc, [sd * 0.37, 0.3, 0.05], { s: [0.62, 1.4, 0.95] }));
    }
    if (L.hair === 'curly') for (let i = 0; i < 11; i++) {
      const a = i / 11 * TAU, rr = 0.36;
      add(head, sph(0.13, 12, 10), hc, [Math.cos(a) * rr, 0.62 + Math.sin(a * 2) * 0.04, -0.06 + Math.sin(a) * rr * 0.85]);
    }
    let haloMesh = null;
    if (acc === 'headset') {
      add(head, new THREE.TorusGeometry(0.47, 0.03, 8, 36, Math.PI), '#232a36', [0, 0.42, 0]);
      [-1, 1].forEach((sd) => add(head, new THREE.CylinderGeometry(0.11, 0.11, 0.09, 20), TIER_COLORS[0], [sd * 0.45, 0.4, 0], { r: [0, 0, Math.PI / 2], m: { emissive: C(TIER_COLORS[0]), emissiveIntensity: 0.35 } }));
      add(head, capsuleGeo(0.013, 0.26, 6), '#232a36', [0.36, 0.28, 0.2], { r: [1.25, 0.6, 0], noInk: true });
      add(head, sph(0.03, 10, 8), '#232a36', [0.22, 0.25, 0.35], { noInk: true });
    }
    if (acc === 'glasses') {
      const frame = toon('#1b1f2a');
      [-1, 1].forEach((sd) => {
        add(head, new THREE.TorusGeometry(0.095, 0.016, 8, 24), null, [sd * 0.15, 0.41, 0.415], { mat: frame, noInk: true });
        add(head, new THREE.CircleGeometry(0.09, 20), null, [sd * 0.15, 0.41, 0.418], { mat: new THREE.MeshBasicMaterial({ color: C('#9fe6f5'), transparent: true, opacity: 0.25 }), noInk: true });
        add(head, new THREE.BoxGeometry(0.02, 0.018, 0.3), null, [sd * 0.29, 0.44, 0.27], { mat: frame, noInk: true });
      });
      add(head, new THREE.BoxGeometry(0.07, 0.016, 0.016), null, [0, 0.43, 0.42], { mat: frame, noInk: true });
    }
    if (acc === 'cap') {
      add(head, sph(0.46, 32, 16, 0, 1.2), TIER_COLORS[1], [0, 0.43, -0.01], { r: [-0.18, 0, 0] });
      add(head, new THREE.CylinderGeometry(0.3, 0.3, 0.035, 28), TIER_COLORS[1], [0, 0.66, 0.34], { s: [1, 1, 0.9], r: [0.22, 0, 0] });
      add(head, sph(0.04, 10, 8), shade(TIER_COLORS[1], 0.7), [0, 0.88, -0.02], { noInk: true });
    }
    if (acc === 'halo') {
      haloMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 40), new THREE.MeshBasicMaterial({ color: C(TIER_COLORS[2]) }));
      haloMesh.rotation.x = Math.PI / 2; haloMesh.position.y = 1.02; head.add(haloMesh);
    }
    if (acc === 'crown') {
      const gold = toon('#f2c14e', { emissive: C('#6a4a08'), emissiveIntensity: 0.4 });
      add(head, new THREE.CylinderGeometry(0.24, 0.22, 0.1, 24, 1, true), null, [0, 0.86, -0.02], { mat: gold });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU;
        add(head, new THREE.ConeGeometry(0.05, 0.15, 8), null, [Math.cos(a) * 0.22, 0.98, -0.02 + Math.sin(a) * 0.22], { mat: gold });
        add(head, sph(0.025, 8, 6), '#ff4fd8', [Math.cos(a) * 0.235, 0.86, -0.02 + Math.sin(a) * 0.235], { noInk: true, m: { emissive: C('#ff4fd8'), emissiveIntensity: 0.5 } });
      }
    }
    return { root, torso, head, armL, armR, eyes, halo: haloMesh };
  }


  function disposeAvatar(root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (!m.userData.keep) m.dispose(); });
    });
  }
  // gentle idle: breathing, head sway, blinking, arm swing
  function idle(a, t, opts) {
    a.torso.scale.y = 1 + Math.sin(t * 2.2) * 0.015;
    if (!opts || !opts.noHead) { a.head.rotation.y = Math.sin(t * 0.7) * 0.2; a.head.rotation.z = Math.sin(t * 0.9) * 0.04; }
    const blink = (t % 3.6) < 0.12 ? 0.12 : 1; a.eyes.forEach((e) => { e.scale.y = blink; });
    a.armL.rotation.x = Math.sin(t * 1.6) * 0.06; if (!opts || !opts.noRightArm) a.armR.rotation.x = -Math.sin(t * 1.6) * 0.06;
    if (a.halo) { a.halo.position.y = 1.02 + Math.sin(t * 2) * 0.03; a.halo.rotation.z = t; }
  }
  return { build, disposeAvatar, idle, destroy() { INK.dispose(); RAMP.dispose(); } };
}

// Small animated head-and-shoulders portrait (used in banners). Returns a cleanup function.
export function mountAvatarBust(container, look, accent) {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return () => {}; }
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  cam.position.set(0, 1.62, 3.4); cam.lookAt(0, 1.45, 0);
  sc.add(new THREE.HemisphereLight(0xdfeaff, 0x203040, 1.3));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.7); key.position.set(3, 5, 4); sc.add(key);
  const rim = new THREE.PointLight(accent || TIER_COLORS[0], 3, 8, 0); rim.position.set(-1.5, 2, -1.5); sc.add(rim);
  const kit = makeAvatarKit(), a = kit.build(look, look.acc); a.root.rotation.y = 0.25; sc.add(a.root);
  const size = () => { const w = container.clientWidth, h = container.clientHeight; if (w && h) { r.setSize(w, h, true); cam.aspect = w / h; cam.updateProjectionMatrix(); } };
  const ro = new ResizeObserver(size); ro.observe(container); size();
  let raf = 0, t = 0, last = performance.now();
  const loop = (now) => { raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; } t += Math.min((now - last) / 1000, 0.05); last = now; if (!REDUCE) kit.idle(a, t); r.render(sc, cam); };
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); ro.disconnect(); kit.disposeAvatar(a.root); kit.destroy(); r.dispose(); r.domElement.remove(); };
}

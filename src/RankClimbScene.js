
import * as THREE from 'three';
const TIERS = [
  { name: 'Bronze', color: '#c98a52', elo: 1000 }, { name: 'Silver', color: '#b8c4d6', elo: 1100 },
  { name: 'Gold', color: '#f2c14e', elo: 1250 }, { name: 'Platinum', color: '#5fd3c6', elo: 1400 },
  { name: 'Diamond', color: '#6aa8ff', elo: 1600 }, { name: 'Legend', color: '#c084fc', elo: 1850 },
];
const LINES = ['Next!', 'Walk me through your approach.', 'Hmm. Interesting.', 'Can you optimize that?', 'Any edge cases?', "Fine. You're hired."];
const STEP = { dx: 1.45, dy: 1.0, dz: -0.7, w: 2.2, d: 2.2, h: 0.5 };
const HOP = 0.85, REST = 0.45, CELEBRATE = 1.8;

function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function slab(w, d, h, r) {
  const bev = 0.08, x = -w / 2 + bev, y = -d / 2 + bev, W = w - 2 * bev, D = d - 2 * bev, R = r - bev;
  const s = new THREE.Shape();
  s.moveTo(x + R, y); s.lineTo(x + W - R, y); s.quadraticCurveTo(x + W, y, x + W, y + R); s.lineTo(x + W, y + D - R);
  s.quadraticCurveTo(x + W, y + D, x + W - R, y + D); s.lineTo(x + R, y + D); s.quadraticCurveTo(x, y + D, x, y + D - R);
  s.lineTo(x, y + R); s.quadraticCurveTo(x, y, x + R, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.translate(0, -(h - 2 * bev) / 2, 0); g.computeVertexNormals();
  return g;
}

function glyphTexture(text, col) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#141b2e'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = col; x.lineWidth = 10; x.strokeRect(12, 12, 232, 232);
  x.fillStyle = col; x.font = '700 92px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 136);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export default function mountRankClimb(container) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = window.matchMedia('(pointer: coarse)').matches;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return () => {}; } // no WebGL: the page still works without the scene

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !COARSE; renderer.shadowMap.type = THREE.PCFShadowMap;
  const view = el('div', 'rc-view', container); view.appendChild(renderer.domElement);
  const overlay = el('div', 'rc-overlay', container); overlay.setAttribute('aria-hidden', 'true');
  const rank = el('div', 'rc-rank', container); rank.setAttribute('aria-hidden', 'true');
  rank.innerHTML = '<small>Your ELO</small><b>1000</b><span>Bronze</span>';
  const eloEl = rank.querySelector('b'), tierEl = rank.querySelector('span');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);

  // Soft studio environment for glossy reflections, generated in code.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = (function () {
    const envScene = new THREE.Scene();
    const g = new THREE.SphereGeometry(50, 32, 16), cols = [], pos = g.attributes.position;
    const c = new THREE.Color(), a = new THREE.Color('#0b0f1a'), b = new THREE.Color('#3b3480'), top = new THREE.Color('#9fe6f5');
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) / 50 + 1) / 2;
      c.copy(a).lerp(b, Math.min(1, t * 1.4)).lerp(top, Math.max(0, t - 0.75) * 2.5); cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    [[8, 16, 4, '#ffffff', 3], [-14, 6, 10, '#7fdcf0', 1.6], [10, 2, -14, '#c084fc', 1.4]].forEach(([x, y, z, col, s]) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(10 * s, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(s), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    });
    const rt = pmrem.fromScene(envScene, 0.04);
    envScene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    return rt;
  })();
  scene.environment = envTarget.texture;

  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(4, 10, 6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 }); key.shadow.bias = -0.0005;
  scene.add(key, new THREE.AmbientLight(0x6670a8, 0.7));

  // Rank steps
  const slabGeo = slab(STEP.w, STEP.d, STEP.h, 0.35), glowGeo = slab(STEP.w * 0.92, STEP.d * 0.92, 0.06, 0.32);
  const steps = TIERS.map((t, k) => {
    const g = new THREE.Group();
    const top = new THREE.Mesh(slabGeo, new THREE.MeshStandardMaterial({ color: t.color, metalness: 0.35, roughness: 0.28, envMapIntensity: 1.2 }));
    top.castShadow = true; top.receiveShadow = true;
    const under = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.55 }));
    under.position.y = -STEP.h / 2 - 0.08;
    g.add(top, under);
    g.position.set((k - 2.5) * STEP.dx, k * STEP.dy, (k - 2.5) * STEP.dz);
    scene.add(g);
    return { g, base: g.position.clone(), k };
  });
  const OFF = new THREE.Vector3(-0.35, 0, 0.35);
  const stepTop = (k) => steps[k].base.clone().add(new THREE.Vector3(0, STEP.h / 2, 0)).add(OFF);

  // Player token with a crown for the top
  const token = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), new THREE.MeshStandardMaterial({ color: '#e9fbff', emissive: '#35c4e6', emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.15 }));
  orb.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 12, 48), new THREE.MeshBasicMaterial({ color: '#9ff3ff' }));
  ring.rotation.x = Math.PI / 2;
  const gold = new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.8, roughness: 0.25 });
  const crown = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const ang = i / 5 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 4), gold);
    sp.position.set(Math.cos(ang) * 0.2, 0.13, Math.sin(ang) * 0.2); crown.add(sp);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 24), gold); band.rotation.x = Math.PI / 2; crown.add(band);
  crown.position.y = 0.42; crown.scale.setScalar(0.001);
  token.add(orb, ring, crown); scene.add(token);

  // The interviewer boss
  const boss = new THREE.Group();
  const bossHead = new THREE.Group();
  (function () {
    const M = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.6 : r, metalness: 0.05 });
    const B = (parent, w, h, d, c, x, y, z, o) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z);
      if (o && o.rx) m.rotation.x = o.rx; if (o && o.rz) m.rotation.z = o.rz; m.castShadow = true; parent.add(m); return m;
    };
    B(boss, 0.18, 0.6, 0.2, '#1f2a44', -0.12, 0.3, 0); B(boss, 0.18, 0.6, 0.2, '#1f2a44', 0.12, 0.3, 0);
    B(boss, 0.58, 0.64, 0.34, '#24345c', 0, 0.92, 0);
    B(boss, 0.16, 0.42, 0.02, '#f4f6fb', 0, 1.0, 0.18); B(boss, 0.08, 0.36, 0.025, '#e0453a', 0, 0.97, 0.19);
    B(boss, 0.15, 0.52, 0.17, '#24345c', -0.37, 0.92, 0, { rz: 0.08 });
    B(boss, 0.15, 0.5, 0.17, '#24345c', 0.37, 1.0, 0.12, { rx: -0.9 });
    B(boss, 0.34, 0.44, 0.03, '#8a5a32', 0.37, 1.08, 0.36, { rx: -0.25 }); B(boss, 0.28, 0.32, 0.01, '#ffffff', 0.37, 1.08, 0.38, { rx: -0.25 });
    bossHead.position.y = 1.5; boss.add(bossHead);
    B(bossHead, 0.46, 0.44, 0.42, '#e0ac82', 0, 0, 0); B(bossHead, 0.48, 0.12, 0.44, '#2b2f3a', 0, 0.26, 0); B(bossHead, 0.48, 0.18, 0.1, '#2b2f3a', 0, 0.16, -0.19);
    B(bossHead, 0.12, 0.03, 0.02, '#2b2f3a', -0.1, 0.12, 0.215); B(bossHead, 0.12, 0.03, 0.02, '#2b2f3a', 0.1, 0.07, 0.215);
    [-0.1, 0.1].forEach((x) => { const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 20), M('#111111', 0.3)); r.position.set(x, 0.02, 0.225); bossHead.add(r); });
    B(bossHead, 0.05, 0.015, 0.015, '#111111', 0, 0.03, 0.225); B(bossHead, 0.14, 0.02, 0.01, '#8a3b2e', 0, -0.12, 0.215);
  })();
  boss.scale.setScalar(1.6);
  boss.position.copy(steps[5].base).add(new THREE.Vector3(0.55, STEP.h / 2, -0.5)); boss.rotation.y = 0.25;
  scene.add(boss);

  // Floating code blocks and dust
  const blocks = [['{ }', '#35c4e6', -5.2, 4.6, -1.5], ['</>', '#c084fc', 6.2, 3.0, -0.6], ['O(n)', '#f2c14e', 4.8, 1.4, 1.2], ['dp', '#5fd3c6', -2.6, 6.2, -3.6]].map(([t, col, x, y, z], i) => {
    const tex = glyphTexture(t, col);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.2 }));
    m.position.set(x, y, z); m.rotation.set(0.4 + i, 0.6 * i, 0.2); m.castShadow = true; scene.add(m);
    return { m, y, s: 0.4 + i * 0.13 };
  });
  (function () {
    const N = 260, p = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * 22; p[i * 3 + 1] = Math.random() * 12 - 1; p[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#9fe6f5', size: 0.05, transparent: true, opacity: 0.7 })));
  })();

  // Overlays (crisp HTML): tier chips, speech bubble, score pops
  const chips = TIERS.map((t, k) => {
    const c = el('div', 'rc-tier', overlay); c.textContent = t.name; c.style.background = t.color;
    return { el: c, anchor: steps[k].base.clone().add(new THREE.Vector3(STEP.w / 2 + 0.1, -0.05, STEP.d / 2 + 0.1)) };
  });
  const bubble = el('div', 'rc-bubble', overlay);
  let talkT = 0;
  const say = (text) => { if (bubble.textContent !== text) { bubble.textContent = text; talkT = 0.8; } };
  const pops = [];
  const popAt = (pos, text, cls) => { const p = el('div', 'rc-pop' + (cls ? ' ' + cls : ''), overlay); p.textContent = text; pops.push({ el: p, pos: pos.clone().add(new THREE.Vector3(0, 0.9, 0)), t: 0 }); };
  const setRank = (k, elo) => { eloEl.textContent = elo == null ? TIERS[k].elo : elo; tierEl.textContent = TIERS[k].name; rank.style.setProperty('--tier', TIERS[k].color); };

  // Framing
  const LOOK = new THREE.Vector3(0, 2.6, 0), base = new THREE.Vector3();
  let mx = 0, my = 0;
  function resize() {
    const w = view.clientWidth, h = view.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, true); camera.aspect = w / h;
    const narrow = w / h < 1.05; camera.fov = narrow ? 42 : 34; camera.updateProjectionMatrix();
    const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    LOOK.y = narrow ? 3.7 : 2.6;
    const d = Math.max(16, (narrow ? 9.2 : 8.4) / Math.tan(half));
    base.set(0.2, 0.4, 0.9).normalize().multiplyScalar(d).add(LOOK);
  }
  const ro = new ResizeObserver(resize); ro.observe(view); resize();
  camera.position.copy(base);
  const onPointer = (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
  window.addEventListener('pointermove', onPointer);

  // Pause when the scene is off screen or the tab is hidden
  let visible = true;
  const io = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; });
  io.observe(container);

  // Story state
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  let k = 0, phase = 'rest', pt = 0, failed = false;
  setRank(0); say(LINES[0]);

  const proj = new THREE.Vector3();
  const place = (node, v, ox, oy, tx, ty) => {
    proj.copy(v).project(camera);
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    node.style.transform = 'translate3d(' + ((proj.x + 1) / 2 * W + (ox || 0)).toFixed(1) + 'px,' + ((1 - proj.y) / 2 * H + (oy || 0)).toFixed(1) + 'px,0) translate(' + (tx || '-50%') + ',' + (ty || '-50%') + ')';
  };

  let raf = 0, last = performance.now(), t = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    camera.position.lerp(base.clone().add(new THREE.Vector3(mx * 1.6, -my * 1.0, 0)), 1 - Math.exp(-3 * dt));
    camera.lookAt(LOOK);

    if (REDUCE) {
      k = TIERS.length - 1; token.position.copy(stepTop(k)).add(new THREE.Vector3(0, 0.34, 0)); crown.scale.setScalar(1); setRank(k); say(LINES[5]);
    } else {
      pt += dt;
      if (phase === 'rest') {
        token.position.copy(stepTop(k)).add(new THREE.Vector3(0, 0.34 + Math.abs(Math.sin(pt * 6)) * 0.04, 0));
        if (pt > (k === TIERS.length - 1 ? CELEBRATE : REST)) {
          if (k === TIERS.length - 1) { k = 0; crown.scale.setScalar(0.001); setRank(0); failed = false; say(LINES[0]); }
          phase = (k === 2 && !failed) ? 'fail' : 'hop'; pt = 0;
        }
      } else if (phase === 'fail') {
        const u = Math.min(1, pt / HOP), a = stepTop(k), b = stepTop(k + 1);
        const p = a.clone().lerp(b, Math.sin(u * Math.PI) * 0.5); p.y += Math.sin(u * Math.PI) * 0.8 + 0.34;
        token.position.copy(p);
        if (u >= 1) {
          failed = true; phase = 'rest'; pt = -0.5;
          popAt(stepTop(k), 'Wrong answer  -18 ELO', 'bad');
          setRank(k, TIERS[k].elo - 18); say('Wrong answer. Again.');
          rank.classList.add('hit'); later(() => rank.classList.remove('hit'), 900);
        }
      } else {
        const u = Math.min(1, pt / HOP), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const a = stepTop(k), b = stepTop(k + 1), p = a.clone().lerp(b, e); p.y += Math.sin(e * Math.PI) * 1.25 + 0.34;
        token.position.copy(p);
        if (u >= 1) {
          k++; phase = 'rest'; pt = 0; setRank(k); say(LINES[k]);
          popAt(stepTop(k), '+' + (TIERS[k].elo - TIERS[k - 1].elo) + ' ELO');
          steps[k].g.position.y = steps[k].base.y - 0.12;
          if (k === TIERS.length - 1) { crown.userData.grow = 1; later(() => popAt(boss.position.clone().add(new THREE.Vector3(-1.6, 1.6, 0.4)), 'Offer unlocked', 'gold'), 450); }
        }
      }
      if (crown.userData.grow) { const s = Math.min(1, crown.scale.x + dt * 3); crown.scale.setScalar(s); if (s >= 1) crown.userData.grow = 0; }
    }
    ring.rotation.z += dt * 1.8; orb.rotation.y += dt;
    steps.forEach((s) => { s.g.position.y += (s.base.y + Math.sin(t * 0.9 + s.k) * 0.05 - s.g.position.y) * Math.min(1, dt * 6); });
    boss.position.y = steps[5].g.position.y + STEP.h / 2;
    bossHead.rotation.z += ((talkT > 0 ? Math.sin(t * 9) * 0.08 : 0) - bossHead.rotation.z) * Math.min(1, dt * 8); talkT -= dt;
    blocks.forEach((b, i) => { b.m.rotation.y += dt * b.s; b.m.rotation.x += dt * b.s * 0.5; b.m.position.y = b.y + Math.sin(t * 0.8 + i) * 0.25; });

    renderer.render(scene, camera);
    chips.forEach((c) => place(c.el, c.anchor));
    place(bubble, boss.position.clone().add(new THREE.Vector3(0, 3.3, 0)), 30, 0, '-100%', '-100%');
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += dt; place(p.el, p.pos, 0, -p.t * 60); p.el.style.opacity = String(Math.max(0, 1 - p.t / 1.1));
      if (p.t > 1.1) { p.el.remove(); pops.splice(i, 1); }
    }
  }
  raf = requestAnimationFrame(frame);

  return function cleanup() {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout); timers.clear();
    ro.disconnect(); io.disconnect();
    window.removeEventListener('pointermove', onPointer);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    envTarget.dispose(); pmrem.dispose(); renderer.dispose();
    view.remove(); overlay.remove(); rank.remove();
  };
}
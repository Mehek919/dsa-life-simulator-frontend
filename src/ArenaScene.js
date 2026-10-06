// ArenaScene.js
// 3D pieces for the Arena lobby.
// const radar = mountRadar(container, color);  radar.setColor(hex) · radar.setMode('idle'|'search'|'found') · radar.destroy()
// const stop = mountEmblem(container, tierColor);  stop()
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountRadar(container, color) {
  const REDUCE = reduceMotion();
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { setColor() {}, setMode() {}, destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.prepend(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  cam.position.set(0, 9.4, 9.6); cam.lookAt(0, -0.6, 0);
  let col = new THREE.Color(color); const R = 4.2, tinted = [];
  const tint = (m) => { tinted.push(m); return m; };

  const dish = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshBasicMaterial({ color: '#0b0a12' })); dish.rotation.x = -Math.PI / 2; sc.add(dish);
  [0.25, 0.5, 0.75, 1].forEach((f) => { const ring = new THREE.Mesh(new THREE.RingGeometry(R * f - 0.012, R * f + 0.012, 96), tint(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: f === 1 ? 0.8 : 0.28 }))); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; sc.add(ring); });
  for (let k = 0; k < 4; k++) { const ln = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, 0.02), tint(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2 }))); ln.rotation.x = -Math.PI / 2; ln.rotation.z = k * Math.PI / 4; ln.position.y = 0.003; sc.add(ln); }

  const wedgeTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 4; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 256, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = g; x.fillRect(0, 0, 256, 4); return new THREE.CanvasTexture(c); })();
  const wedgeGeo = new THREE.CircleGeometry(R, 48, 0, 0.9), uv = wedgeGeo.attributes.uv, pos = wedgeGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const a = Math.atan2(pos.getY(i), pos.getX(i)); uv.setXY(i, Math.max(0, Math.min(1, a / 0.9)), 0.5); }
  const sweep = new THREE.Mesh(wedgeGeo, tint(new THREE.MeshBasicMaterial({ map: wedgeTex, color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  sweep.rotation.x = -Math.PI / 2; sweep.position.y = 0.01; sc.add(sweep);

  const WN = 256, wpos = new Float32Array((WN + 1) * 3), wgeo = new THREE.BufferGeometry(); wgeo.setAttribute('position', new THREE.BufferAttribute(wpos, 3));
  sc.add(new THREE.Line(wgeo, tint(new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95 }))));
  const wave2 = new THREE.Line(wgeo, tint(new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35 }))); wave2.scale.set(1.04, 1.6, 1.04); sc.add(wave2);
  const ringGeo = new THREE.RingGeometry(0.97, 1, 96);
  const pulses = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(ringGeo, tint(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }))); m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.userData.t = i / 5; sc.add(m); return m; });
  const blipGeo = new THREE.SphereGeometry(0.07, 8, 6);
  const blips = Array.from({ length: 34 }, () => { const a = Math.random() * Math.PI * 2, d = 0.6 + Math.random() * (R - 0.8); const m = new THREE.Mesh(blipGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); m.position.set(Math.cos(a) * d, 0.08, Math.sin(a) * d); m.userData.a = a; sc.add(m); return m; });
  const rival = blips[7];
  const rivalRing = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.27, 32), new THREE.MeshBasicMaterial({ color: '#39ff88', transparent: true, opacity: 0, side: THREE.DoubleSide }));
  rivalRing.rotation.x = -Math.PI / 2; rivalRing.position.copy(rival.position); sc.add(rivalRing);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), tint(new THREE.MeshBasicMaterial({ color: col }))); core.position.y = 0.4; sc.add(core);

  let mode = 'idle', sweepA = 0;
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.fov = w / h < 1 ? 50 : w / h > 1.7 ? 34 : 40; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let raf = 0, last = performance.now(), t = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    const speed = mode === 'search' ? 3.2 : mode === 'found' ? 0.6 : 1.2;
    if (!REDUCE) sweepA = (sweepA + dt * speed) % (Math.PI * 2);
    sweep.rotation.z = sweepA;
    const amp = mode === 'search' ? 0.55 : 0.28;
    for (let i = 0; i <= WN; i++) {
      const a = i / WN * Math.PI * 2, rel = ((sweepA + a) + Math.PI * 4) % (Math.PI * 2), near = Math.exp(-Math.pow(Math.min(rel, Math.PI * 2 - rel), 2) * 6);
      const h = REDUCE ? 0 : (Math.sin(a * 40 + t * 14) * 0.5 + Math.sin(a * 17 - t * 9) * 0.5) * amp * (near * 1.4 + (mode === 'search' ? 0.35 : 0.06));
      wpos[i * 3] = Math.cos(a) * (R + 0.08); wpos[i * 3 + 1] = 0.05 + Math.abs(h); wpos[i * 3 + 2] = Math.sin(a) * (R + 0.08);
    }
    wgeo.attributes.position.needsUpdate = true;
    pulses.forEach((p) => { if (!REDUCE) p.userData.t = (p.userData.t + dt * (mode === 'search' ? 0.55 : 0.18)) % 1; const s = Math.max(0.01, p.userData.t * R); p.scale.set(s, s, s); p.material.opacity = (1 - p.userData.t) * (mode === 'search' ? 0.8 : 0.4); });
    blips.forEach((b) => { const rel = ((sweepA + b.userData.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); const lit = rel < 0.5 ? 1 - rel / 0.5 : 0; b.material.opacity = Math.max(b.material.opacity - dt * 0.9, lit * (mode === 'search' ? 1 : 0.7)); });
    if (mode === 'found') { rival.material.color.set('#39ff88'); rival.material.opacity = 1; rival.scale.setScalar(1.8 + Math.sin(t * 8) * 0.3); rivalRing.material.opacity = 0.9; const s = 1 + (t * 2 % 1) * 1.5; rivalRing.scale.set(s, s, s); }
    else { rival.material.color.set(0xffffff); rival.scale.setScalar(1); rivalRing.material.opacity = 0; }
    core.rotation.y = t * 1.5; core.position.y = 0.4 + Math.sin(t * 3) * 0.05;
    r.render(sc, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    setColor(hex) { col = new THREE.Color(hex); tinted.forEach((m) => m.color.copy(col)); },
    setMode(m) { mode = m; },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect();
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      r.dispose(); r.domElement.remove();
    },
  };
}

export function mountEmblem(container, tierColor) {
  const REDUCE = reduceMotion();
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return () => {}; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); cam.position.set(0, 0, 7.5);
  const pm = new THREE.PMREMGenerator(r), env = pm.fromScene(new RoomEnvironment(), 0.04); sc.environment = env.texture;
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); sc.add(key);
  const rim = new THREE.PointLight(tierColor, 6, 20, 0); rim.position.set(-3, -2, 3); sc.add(rim);
  const sh = new THREE.Shape();
  sh.moveTo(0, 1.6); sh.bezierCurveTo(0.9, 1.35, 1.35, 1.35, 1.45, 1.2); sh.lineTo(1.4, 0.2); sh.bezierCurveTo(1.3, -0.9, 0.6, -1.5, 0, -1.85);
  sh.bezierCurveTo(-0.6, -1.5, -1.3, -0.9, -1.4, 0.2); sh.lineTo(-1.45, 1.2); sh.bezierCurveTo(-1.35, 1.35, -0.9, 1.35, 0, 1.6);
  const metal = new THREE.MeshStandardMaterial({ color: tierColor, metalness: 0.85, roughness: 0.25, emissive: tierColor, emissiveIntensity: 0.12 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 4, curveSegments: 24 }), metal); body.geometry.center(); g.add(body);
  const plateGeo = new THREE.ShapeGeometry(sh, 24); plateGeo.center();
  const plate = new THREE.Mesh(plateGeo, new THREE.MeshStandardMaterial({ color: '#1a1014', metalness: 0.3, roughness: 0.6 })); plate.scale.set(0.78, 0.78, 1); plate.position.z = 0.36; g.add(plate);
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, rr = i % 2 ? 0.32 : 0.75; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, -Math.sin(a) * rr); }
  const starM = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 }), metal); starM.position.set(0, 0.08, 0.32); g.add(starM);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gg = x.createRadialGradient(64, 64, 4, 64, 64, 64); gg.addColorStop(0, tierColor); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gg; x.fillRect(0, 0, 128, 128); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx; })();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(6, 6, 1); halo.position.z = -0.6;
  sc.add(halo, g);
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (w && h) { r.setSize(w, h, true); cam.aspect = w / h; cam.updateProjectionMatrix(); } };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let raf = 0, t = 0, last = performance.now();
  const loop = (now) => { raf = requestAnimationFrame(loop); if (document.hidden) { last = now; return; } t += Math.min((now - last) / 1000, 0.05); last = now;
    if (!REDUCE) { g.rotation.y = Math.sin(t * 0.8) * 0.55; g.position.y = Math.sin(t * 1.4) * 0.06; halo.material.opacity = 0.45 + Math.sin(t * 2) * 0.12; } r.render(sc, cam); };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    env.dispose(); pm.dispose(); r.dispose(); r.domElement.remove();
  };
}

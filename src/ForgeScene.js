import * as THREE from 'three';
export function mountForge(container) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { strike() {}, destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 4.2, 9); cam.lookAt(0, -0.6, 0);
  const EMB = new THREE.Color('#ff8a3d'), CY = new THREE.Color('#35e0ff'), WHITE = new THREE.Color(1, 1, 1);
  const grid = new THREE.GridHelper(30, 30, new THREE.Color('#3a1f12'), new THREE.Color('#1a100c')); grid.position.y = -2.4; sc.add(grid);
  const plat = new THREE.Group(); plat.position.y = -2.2; sc.add(plat);
  plat.add(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 0.3, 6), new THREE.MeshBasicMaterial({ color: '#160d0a' })));
  const rings = [3.5, 4.2, 5].map((rr, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(rr, i === 0 ? 0.05 : 0.02, 6, 6 + i * 30), new THREE.MeshBasicMaterial({ color: (i === 0 ? EMB : CY).clone(), transparent: true, opacity: i === 0 ? 0.95 : 0.35 }));
    m.rotation.x = Math.PI / 2; m.position.y = 0.17; plat.add(m); return m;
  });
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: EMB, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending })); glow.scale.set(12, 5, 1); glow.position.y = -1.6; sc.add(glow);
  const EN = 160, ep = new Float32Array(EN * 3), ev = [];
  for (let i = 0; i < EN; i++) { ep[i * 3] = (Math.random() - 0.5) * 8; ep[i * 3 + 1] = -2 + Math.random() * 6; ep[i * 3 + 2] = (Math.random() - 0.5) * 4; ev.push(0.3 + Math.random() * 0.5); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  sc.add(new THREE.Points(eg, new THREE.PointsMaterial({ color: EMB, size: 0.06, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));
  const SN = 140, sp = new Float32Array(SN * 3), sv = Array.from({ length: SN }, () => [0, 0, 0]), sl = new Float32Array(SN);
  for (let i = 0; i < SN; i++) sp[i * 3 + 1] = -99;
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sc.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffd08a', size: 0.11, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false })));

  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let heat = 0, raf = 0, last = performance.now(), t = 0, visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(container);
  const loop = (now) => {
    raf = requestAnimationFrame(loop); if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (!REDUCE) {
      plat.rotation.y = t * 0.15; rings[1].rotation.z = t * 0.4; rings[2].rotation.z = -t * 0.25;
      for (let i = 0; i < EN; i++) { ep[i * 3 + 1] += ev[i] * dt; ep[i * 3] += Math.sin(t + i) * dt * 0.1; if (ep[i * 3 + 1] > 4) ep[i * 3 + 1] = -2; }
      eg.attributes.position.needsUpdate = true;
    }
    for (let i = 0; i < SN; i++) {
      if (sl[i] <= 0) continue; sl[i] -= dt; sv[i][1] -= 9 * dt;
      sp[i * 3] += sv[i][0] * dt; sp[i * 3 + 1] += sv[i][1] * dt; sp[i * 3 + 2] += sv[i][2] * dt; if (sl[i] <= 0) sp[i * 3 + 1] = -99;
    }
    sg.attributes.position.needsUpdate = true;
    heat = Math.max(0, heat - dt * 1.5);
    glow.material.opacity = 0.35 + heat * 0.6 + Math.sin(t * 2) * 0.05;
    rings[0].material.color.copy(EMB).lerp(WHITE, heat * 0.6);
    r.render(sc, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    strike() {
      heat = 1; if (REDUCE) return;
      for (let i = 0; i < SN; i++) { const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5; sp[i * 3] = (Math.random() - 0.5) * 2; sp[i * 3 + 1] = -0.5; sp[i * 3 + 2] = 0.5; sv[i] = [Math.cos(a) * s, 3 + Math.random() * 5, Math.sin(a) * s * 0.4]; sl[i] = 0.6 + Math.random() * 0.6; }
    },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      glowTex.dispose(); r.dispose(); r.domElement.remove();
    },
  };
}

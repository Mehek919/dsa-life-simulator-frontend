// HubScene.js
// The holographic puzzle cube in the Hub's "Challenge of the Day" banner.
// const cube = mountCube(container);  cube.burst(correct) · cube.destroy()
import * as THREE from 'three';

export function mountCube(container) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { burst() {}, destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  cam.position.set(5.6, 4.2, 7.2); cam.lookAt(0, -0.2, 0);
  const cols = ['#a855f7', '#35e0ff', '#39ff88', '#f4b740'].map((c) => new THREE.Color(c));
  const VIOLET = cols[0], GREEN = cols[2], RED = new THREE.Color('#ff5b5b');
  const g = new THREE.Group(); sc.add(g); const cubes = [];
  const geo = new THREE.BoxGeometry(0.86, 0.86, 0.86), edges = new THREE.EdgesGeometry(geo);
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const c = cols[(x + y + z + 6) % 4];
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false }));
    m.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.9 })));
    m.position.set(x, y, z); m.userData.home = m.position.clone(); g.add(m); cubes.push(m);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.02, 6, 80), new THREE.MeshBasicMaterial({ color: VIOLET.clone(), transparent: true, opacity: 0.6 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -1.9; sc.add(ring);
  let layer = 0, layerT = 0, spread = 0, raf = 0, last = performance.now(), t = 0, resetT = null, visible = true;
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(container);
  const loop = (now) => {
    raf = requestAnimationFrame(loop); if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (!REDUCE) {
      g.rotation.y = t * 0.35; g.rotation.x = Math.sin(t * 0.4) * 0.25;
      layerT += dt; const yl = (layer % 3) - 1, ang = Math.min(1, layerT / 0.6) * Math.PI / 2;
      cubes.forEach((m) => {
        const h = m.userData.home;
        if (Math.round(h.y) === yl) { const c = Math.cos(ang), s = Math.sin(ang); m.position.set(h.x * c - h.z * s, h.y, h.x * s + h.z * c); m.rotation.y = ang; }
        else { m.position.copy(h); m.rotation.y = 0; }
        m.position.multiplyScalar(1 + spread * 0.6);
      });
      if (layerT > 1.6) {
        cubes.forEach((m) => { if (Math.round(m.userData.home.y) === yl) m.userData.home.copy(m.position.clone().divideScalar(1 + spread * 0.6)).round(); m.rotation.y = 0; });
        layer++; layerT = 0;
      }
      spread = Math.max(0, spread - dt * 1.2); ring.scale.setScalar(1 + Math.sin(t * 2) * 0.03);
    }
    r.render(sc, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    burst(ok) { spread = 1; ring.material.color.copy(ok ? GREEN : RED); clearTimeout(resetT); resetT = setTimeout(() => ring.material.color.copy(VIOLET), 900); },
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(resetT); ro.disconnect(); io.disconnect();
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      r.dispose(); r.domElement.remove();
    },
  };
}

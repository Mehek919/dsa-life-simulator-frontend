// HistoryScene.js
// 3D "skyline" of the activity year: one glowing bar per day, height by submissions, with hover tooltips.
// const sky = mountSkyline(container, days, onHover);  days: [{ w, r, n, label }], onHover(day|null, clientX, clientY)
import * as THREE from 'three';

const level = (n) => (n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);

export function mountSkyline(container, days, onHover) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  sc.add(new THREE.HemisphereLight(0xcfe9ff, 0x050a10, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(20, 40, 20); sc.add(key);
  const COLS = ['#16222a', '#0b6d47', '#11a565', '#22d97a', '#39ff88'].map((c) => new THREE.Color(c));
  const geo = new THREE.BoxGeometry(0.8, 1, 0.8); geo.translate(0, 0.5, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.1, emissive: new THREE.Color('#0a3020'), emissiveIntensity: 0.6 }), Math.max(1, days.length));
  const m4 = new THREE.Matrix4();
  days.forEach((d, i) => { m4.makeScale(1, 0.12 + d.n * 1.1, 1); m4.setPosition(d.w - 26, 0, d.r - 3); mesh.setMatrixAt(i, m4); mesh.setColorAt(i, COLS[level(d.n)]); });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  sc.add(mesh);
  const grid = new THREE.GridHelper(58, 58, new THREE.Color('#0f3a40'), new THREE.Color('#0a1a20')); grid.position.y = -0.01; sc.add(grid);

  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.position.set(10, 20, w / h < 1.2 ? 70 : 30); cam.lookAt(0, 1, 0); cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let hover = -1;
  const onMove = (e) => {
    const b = r.domElement.getBoundingClientRect(); mouse.x = ((e.clientX - b.left) / b.width) * 2 - 1; mouse.y = -((e.clientY - b.top) / b.height) * 2 + 1;
    ray.setFromCamera(mouse, cam); const hit = ray.intersectObject(mesh)[0];
    hover = hit ? hit.instanceId : -1; onHover(hit ? days[hover] : null, e.clientX, e.clientY);
  };
  const onLeave = () => { hover = -1; onHover(null); };
  r.domElement.addEventListener('pointermove', onMove); r.domElement.addEventListener('pointerleave', onLeave);
  let raf = 0, last = performance.now(), ang = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop); const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (document.hidden) return;
    if (!REDUCE && hover < 0) { ang += dt * 0.08; sc.rotation.y = Math.sin(ang) * 0.25; }
    r.render(sc, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); r.domElement.removeEventListener('pointermove', onMove); r.domElement.removeEventListener('pointerleave', onLeave);
      geo.dispose(); mesh.material.dispose(); grid.geometry.dispose(); grid.material.dispose(); r.dispose(); r.domElement.remove();
    },
  };
}

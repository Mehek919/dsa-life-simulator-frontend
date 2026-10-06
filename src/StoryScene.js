import * as THREE from 'three';
export function mountStoryWorld(container, mood) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { setMood() {}, destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  container.appendChild(r.domElement);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  cam.position.set(0, 9, 26); cam.lookAt(0, 2, 0);
  scene.fog = new THREE.FogExp2(0x05040b, 0.028);

  const geo = new THREE.PlaneGeometry(120, 120, 90, 90); geo.rotateX(-Math.PI / 2);
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshBasicMaterial({ color: mood.c, wireframe: true, transparent: true, opacity: 0.32 });
  scene.add(new THREE.Mesh(geo, mat));

  const N = 900, pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pts[i * 3] = (Math.random() - 0.5) * 90; pts[i * 3 + 1] = Math.random() * 30; pts[i * 3 + 2] = -70 + Math.random() * 78; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const pm = new THREE.PointsMaterial({ color: mood.c2, size: 0.22, transparent: true, opacity: 0.85 });
  const points = new THREE.Points(pg, pm); scene.add(points);

  const resize = () => { const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  window.addEventListener('resize', resize); resize();

  let cur = mood, t = 0, raf = 0, last = performance.now();
  const tc = new THREE.Color(mood.c), tc2 = new THREE.Color(mood.c2);
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (document.hidden) return;
    t += dt * (REDUCE ? 0 : cur.speed);
    mat.color.lerp(tc, 0.03); pm.color.lerp(tc2, 0.03);
    const a = geo.attributes.position.array, amp = 1.2 + cur.energy * 2.4;
    for (let i = 0; i < a.length; i += 3) { const x = base[i], z = base[i + 2]; a[i + 1] = Math.sin(x * 0.12 + t) * Math.cos(z * 0.1 + t * 0.7) * amp + Math.sin((x + z) * 0.05 - t * 0.5) * amp * 0.6; }
    geo.attributes.position.needsUpdate = true;
    points.rotation.y += dt * 0.02 * (1 + cur.energy * 2);
    cam.position.x = Math.sin(t * 0.15) * 4; cam.lookAt(0, 2, 0);
    r.render(scene, cam);
  };
  raf = requestAnimationFrame(loop);

  return {
    setMood(m) { cur = m; tc.set(m.c); tc2.set(m.c2); },
    destroy() {
      cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
      geo.dispose(); mat.dispose(); pg.dispose(); pm.dispose(); r.dispose(); r.domElement.remove();
    },
  };
}

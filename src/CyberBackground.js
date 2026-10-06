import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
export default function mountCyberBackground(container, districts) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 860;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { return () => {}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SMALL ? 1.25 : 1.5));
  renderer.setClearColor(0x02040a, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050a14, 0.018);
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 5, 16);
  const rnd = (() => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

  // Sky with a teal-violet horizon glow
  {
    const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#010208'); g.addColorStop(0.38, '#050a1c'); g.addColorStop(0.48, '#0f2a3a'); g.addColorStop(0.5, '#1d4a4e');
    g.addColorStop(0.53, '#120f2a'); g.addColorStop(1, '#02040a');
    x.fillStyle = g; x.fillRect(0, 0, 4, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false })));
  }

  // Grid floor (shader): crisp lines, major lines, distance fade, scanner ring
  const floorMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uLine: { value: new THREE.Color('#1fe08a') }, uMajor: { value: new THREE.Color('#5ff0ff') }, uRing: { value: new THREE.Color('#39ff88') } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: [
      'uniform float uTime; uniform vec3 uLine; uniform vec3 uMajor; uniform vec3 uRing; varying vec3 vW;',
      'float grid(vec2 p, float cell){ vec2 q = p / cell; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }',
      'void main(){',
      '  vec2 p = vW.xz + vec2(0.0, uTime * 3.0);',
      '  float minor = grid(p, 2.0), major = grid(p, 10.0);',
      '  float fade = exp(-length(vW.xz - vec2(0.0, 16.0)) * 0.022);',
      '  vec3 col = uLine * minor * 0.55 + uMajor * major * 1.2;',
      '  float r = mod(uTime * 14.0, 160.0);',
      '  col += uRing * smoothstep(2.5, 0.0, abs(length(vW.xz - vec2(0.0, -30.0)) - r)) * (1.0 - r / 160.0) * 0.9;',
      '  gl_FragColor = vec4(col * fade, 1.0);',
      '  #include <colorspace_fragment>',
      '}'].join('\n'),
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2; scene.add(floor);

  // Data city
  {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#060b14'; x.fillRect(0, 0, 64, 128);
    for (let yy = 4; yy < 124; yy += 8) for (let xx = 4; xx < 60; xx += 8) {
      const r = rnd(); if (r < 0.55) continue;
      x.fillStyle = r > 0.93 ? '#f4b740' : r > 0.8 ? '#5ff0ff' : '#1fe08a'; x.globalAlpha = 0.35 + rnd() * 0.65; x.fillRect(xx, yy, 4, 3);
    }
    x.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    const N = SMALL ? 160 : 300;
    const box = new THREE.BoxGeometry(1, 1, 1);
    const towers = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ map: tex }), N);
    const caps = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
    const tints = ['#ffffff', '#bff8ff', '#c9ffe0', '#e2d6ff'], capCols = ['#35c4e6', '#39ff88', '#a78bfa', '#ff7a66', '#f4b740'];
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1, back = i % 5 === 0;
      const xPos = back ? (rnd() - 0.5) * 200 : side * (20 + rnd() * 70);
      const zPos = back ? -110 - rnd() * 60 : -6 - rnd() * 150;
      const w = 2 + rnd() * 5, d = 2 + rnd() * 5, h = 4 + Math.pow(rnd(), 2.2) * (back ? 70 : 45);
      sc.set(w, h, d); pos.set(xPos, h / 2 - 2, zPos); m.compose(pos, q, sc); towers.setMatrixAt(i, m);
      towers.setColorAt(i, col.set(tints[i % tints.length]));
      sc.set(w * 1.02, 0.25, d * 1.02); pos.set(xPos, h - 2, zPos); m.compose(pos, q, sc); caps.setMatrixAt(i, m);
      caps.setColorAt(i, col.set(capCols[i % capCols.length]));
    }
    towers.instanceColor.needsUpdate = true; caps.instanceColor.needsUpdate = true;
    scene.add(towers, caps);
  }

  // Light trails
  const TRAILS = SMALL ? 30 : 60;
  const trails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.05, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), TRAILS);
  const trailData = [];
  {
    const cols = ['#35c4e6', '#39ff88', '#a78bfa', '#ff4fd8'], col = new THREE.Color(), m = new THREE.Matrix4();
    for (let i = 0; i < TRAILS; i++) {
      const d = { x: Math.round((rnd() - 0.5) * 14) * 2, z: -160 * rnd(), v: 18 + rnd() * 30 };
      trailData.push(d); trails.setColorAt(i, col.set(cols[i % cols.length]));
      m.makeTranslation(d.x, -1.9, d.z); trails.setMatrixAt(i, m);
    }
    trails.instanceColor.needsUpdate = true;
  }
  scene.add(trails);

  // Network core: one node per place, grouped by district
  const net = new THREE.Group(); net.position.set(0, 9, -45); net.scale.setScalar(1.25); scene.add(net);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshBasicMaterial({ color: 0x39ff88, wireframe: true }));
  net.add(core);
  const rings = [0x35c4e6, 0xa78bfa, 0x39ff88].map((c, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(4 + i * 1.4, 0.05, 6, 96), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8 }));
    r.rotation.set(Math.PI / 2 + i * 0.5, i * 0.7, 0); net.add(r); return r;
  });
  const links = [], nodes = [];
  (districts || []).forEach((d, di) => {
    const col = new THREE.Color(d.color), ang = di / 4 * Math.PI * 2 + 0.6;
    const hub = new THREE.Vector3(Math.cos(ang) * 9, Math.sin(ang) * 4.5, Math.sin(ang * 2) * 3);
    const hubMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshBasicMaterial({ color: col, wireframe: true }));
    hubMesh.position.copy(hub); net.add(hubMesh); nodes.push(hubMesh);
    links.push([new THREE.Vector3(), hub.clone(), col]);
    d.zones.forEach((z, pi) => {
      const a2 = ang + (pi - 1.5) * 0.45, p = new THREE.Vector3(Math.cos(a2) * 15, Math.sin(a2) * 7.5, Math.cos(a2 * 3) * 4);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: col }));
      mesh.position.copy(p); net.add(mesh); nodes.push(mesh);
      links.push([hub.clone(), p, col]);
    });
  });
  links.forEach(([a, b, col]) => net.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.45 }))));
  const packetGeo = new THREE.SphereGeometry(0.16, 8, 6), packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const packets = links.map((l, i) => { const m = new THREE.Mesh(packetGeo, packetMat); net.add(m); return { m, l, t: (i * 0.137) % 1, s: 0.15 + (i % 5) * 0.05 }; });

  // Particles
  const PN = SMALL ? 350 : 700, pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (rnd() - 0.5) * 120; pp[i * 3 + 1] = rnd() * 40 - 2; pp[i * 3 + 2] = 14 - rnd() * 140; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7fffd0, size: 0.12, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(particles);

  // Bloom (desktop only)
  let composer = null, bloom = null;
  if (!SMALL) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.5, 0.35);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, true); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); bloom.setSize(w, h); }
  }
  window.addEventListener('resize', resize); resize();
  let mx = 0, my = 0;
  const onPointer = (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
  window.addEventListener('pointermove', onPointer);

  const look = new THREE.Vector3(0, 4, -30), m4 = new THREE.Matrix4();
  let raf = 0, last = performance.now(), t = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!REDUCE) {
      t += dt;
      floorMat.uniforms.uTime.value = t;
      net.rotation.y += dt * 0.08; core.rotation.x += dt * 0.4; core.rotation.y += dt * 0.3;
      rings.forEach((r, i) => { r.rotation.z += dt * (0.2 + i * 0.15) * (i % 2 ? -1 : 1); });
      nodes.forEach((n, i) => { n.rotation.y += dt * (0.5 + (i % 3) * 0.2); });
      packets.forEach((p) => { p.t = (p.t + dt * p.s) % 1; p.m.position.lerpVectors(p.l[0], p.l[1], p.t); });
      trailData.forEach((d, i) => { d.z += d.v * dt; if (d.z > 22) d.z = -160; m4.makeTranslation(d.x, -1.9, d.z); trails.setMatrixAt(i, m4); });
      trails.instanceMatrix.needsUpdate = true;
      particles.position.y = (particles.position.y + dt * 0.6) % 20;
      camera.position.x += (mx * 4 - camera.position.x) * Math.min(1, dt * 2);
      camera.position.y += (5 - my * 2.5 - camera.position.y) * Math.min(1, dt * 2);
    }
    camera.lookAt(look);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  return function cleanup() {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', onPointer);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { if (mt.map) mt.map.dispose(); mt.dispose(); });
    });
    if (composer) composer.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

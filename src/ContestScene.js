import * as THREE from 'three';
export function mountGate(container) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return { setSeconds() {}, open() {}, destroy() {} }; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); container.appendChild(r.domElement);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const GOLD = new THREE.Color('#f4b740'), CY = new THREE.Color('#35e0ff'), GREEN = new THREE.Color('#39ff88');
  sc.add(new THREE.HemisphereLight(0xcfe6ff, 0x101018, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 6, 6); sc.add(key);

  const grid = new THREE.GridHelper(40, 40, new THREE.Color('#1c3a46'), new THREE.Color('#0e1a22')); grid.position.y = -1.4; sc.add(grid);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ map: glowTex, color: CY, transparent: true, opacity: 0.35, depthWrite: false })); pool.rotation.x = -Math.PI / 2; pool.position.y = -1.39; sc.add(pool);

  // holographic stadium
  const stadium = new THREE.Group(); stadium.position.set(0, -0.9, -4.5); sc.add(stadium);
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(1.4 + t * 2.4, t * t * 1.8)); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshBasicMaterial({ color: CY, wireframe: true, transparent: true, opacity: 0.35 })); stadium.add(bowl);
  const field = new THREE.Mesh(new THREE.CircleGeometry(1.4, 40), new THREE.MeshBasicMaterial({ color: '#0d3a2a', transparent: true, opacity: 0.8 })); field.rotation.x = -Math.PI / 2; field.position.y = 0.01; stadium.add(field);
  const beams = [0, 1, 2, 3].map((k) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.6, 4, 16, 1, true), new THREE.MeshBasicMaterial({ color: k % 2 ? CY : GOLD, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const a = k / 4 * Math.PI * 2; m.position.set(Math.cos(a) * 3.4, 2.6, Math.sin(a) * 3.4); stadium.add(m); return m;
  });

  // the gate
  const gateG = new THREE.Group(); gateG.position.y = 1.4; sc.add(gateG);
  const ringMat = new THREE.MeshStandardMaterial({ color: '#2a2010', emissive: GOLD.clone(), emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.3 });
  gateG.add(new THREE.Mesh(new THREE.TorusGeometry(3, 0.16, 16, 96), ringMat));
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.35, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: CY })); gateG.add(ring2);
  [-1, 1].forEach((sd) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), new THREE.MeshStandardMaterial({ color: '#141822', metalness: 0.5, roughness: 0.4 })); p.position.set(sd * 3.6, -0.7, 0); gateG.add(p);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.62), new THREE.MeshBasicMaterial({ color: GOLD })); strip.position.set(sd * 3.6, -0.7, 0); gateG.add(strip);
  });
  const OFF = new THREE.Color('#2a3640'), WHITE = new THREE.Color('#ffffff');
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = Math.PI / 2 - i / 60 * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, i % 5 === 0 ? 0.32 : 0.18, 0.05), new THREE.MeshBasicMaterial({ color: OFF.clone() }));
    m.position.set(Math.cos(a) * 3.62, Math.sin(a) * 3.62, 0); m.rotation.z = a - Math.PI / 2; gateG.add(m); return m;
  });
  const shieldMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uCol: { value: CY } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform float uTime; uniform float uOpen; uniform vec3 uCol; varying vec2 vUv;',
      'float hex(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.732))), p.x); }',
      'void main(){',
      '  vec2 p = (vUv - 0.5) * 2.0; float r = length(p);',
      '  vec2 q = p * 9.0; vec2 a = mod(q, vec2(1.0,1.732)) - vec2(0.5,0.866); vec2 b = mod(q - vec2(0.5,0.866), vec2(1.0,1.732)) - vec2(0.5,0.866);',
      '  vec2 g = dot(a,a) < dot(b,b) ? a : b; float h = smoothstep(0.42, 0.5, hex(g));',
      '  float scan = 0.5 + 0.5 * sin((p.y + uTime * 0.6) * 18.0);',
      '  float edge = smoothstep(0.75, 1.0, r);',
      '  float alpha = (0.10 + h * 0.45 + edge * 0.5 + scan * 0.06) * (1.0 - smoothstep(0.98, 1.0, r));',
      '  float hole = smoothstep(uOpen * 1.15 - 0.15, uOpen * 1.15, r);',
      '  gl_FragColor = vec4(uCol, alpha * hole * (1.0 - uOpen * 0.6));',
      '  #include <colorspace_fragment>',
      '}'].join('\n'),
  });
  gateG.add(new THREE.Mesh(new THREE.CircleGeometry(2.88, 64), shieldMat));
  const lock = new THREE.Group(), lm = new THREE.MeshBasicMaterial({ color: GOLD });
  lock.add(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.2), lm));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.08, 8, 20, Math.PI), lm); shackle.position.y = 0.42; lock.add(shackle);
  const kh = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({ color: '#1a1000' })); kh.position.z = 0.11; lock.add(kh);
  lock.position.z = 0.15; gateG.add(lock);
  const PN = 220, pp = new Float32Array(PN * 3);
  for (let i = 0; i < PN; i++) { pp[i * 3] = (Math.random() - 0.5) * 12; pp[i * 3 + 1] = Math.random() * 7 - 1.4; pp[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  sc.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: CY, size: 0.05, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));

  let openT = 0, opening = false, curSec = -1;
  const resize = () => { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.position.set(0, 1.6, w / h < 1 ? 14 : 11.6); cam.updateProjectionMatrix(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  let mx = 0; const onMove = (e) => { mx = e.clientX / window.innerWidth - 0.5; }; window.addEventListener('pointermove', onMove);
  let raf = 0, last = performance.now(), t = 0, visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(container);
  const loop = (now) => {
    raf = requestAnimationFrame(loop); if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (!REDUCE) {
      shieldMat.uniforms.uTime.value = t; ring2.rotation.z = t * 0.3; stadium.rotation.y = t * 0.15;
      beams.forEach((m, k) => { m.rotation.z = Math.sin(t * 0.7 + k) * 0.35; m.rotation.x = Math.cos(t * 0.6 + k) * 0.25; });
      const a = pg.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] += dt * 0.35; if (a[i] > 5.6) a[i] = -1.4; } pg.attributes.position.needsUpdate = true;
      lock.rotation.y = opening ? lock.rotation.y + dt * 8 : Math.sin(t * 1.2) * 0.25;
      cam.position.x += (mx * 1.6 - cam.position.x) * Math.min(1, dt * 2);
    }
    cam.lookAt(0, 1.4, 0);
    if (opening && openT < 1) {
      openT = Math.min(1, openT + dt * (REDUCE ? 10 : 0.6));
      shieldMat.uniforms.uOpen.value = openT; lock.position.y = openT * 5; lock.scale.setScalar(Math.max(0.01, 1 - openT * 0.6));
      ringMat.emissive.copy(GOLD).lerp(GREEN, openT); bowl.material.opacity = 0.35 + openT * 0.4;
    }
    ticks.forEach((m, i) => m.material.color.copy(opening ? GREEN : i < curSec ? CY : i === curSec ? WHITE : OFF));
    r.render(sc, cam);
  };
  raf = requestAnimationFrame(loop);
  return {
    setSeconds(s) { curSec = 59 - s; },
    open() { opening = true; },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove);
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      glowTex.dispose(); r.dispose(); r.domElement.remove();
    },
  };
}

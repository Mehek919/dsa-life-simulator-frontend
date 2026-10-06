// OdysseyScene.js
// 3D metro map for the Engineer's Odyssey: one glowing line through every chapter, lit where
// cleared, fog of war over locked districts, company tiles, and the player's avatar at their station.
// const map = mountOdysseyScene(container, { districts, chapters, look, currentId, onSelect });
// map.update(chapters, currentId) · map.select(id) · map.flyToDistrict(n) · map.travel(fromId, toId)
// map.liftFog(n) · map.zoom(factor) · map.destroy()
import * as THREE from 'three';
import { makeAvatarKit } from './avatarKit';

export default function mountOdysseyScene(container, opts) {
  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = window.matchMedia('(pointer: coarse)').matches;
  const noop = { update() {}, select() {}, flyToDistrict() {}, travel() {}, liftFog() {}, zoom() {}, destroy() {} };
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return noop; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE ? 1.5 : 2)); r.setClearColor(0x03060a, 1);
  const view = document.createElement('div'); view.className = 'od-view'; view.appendChild(r.domElement); container.appendChild(view);
  const layer = document.createElement('div'); layer.className = 'od-labels'; container.appendChild(layer);

  const C = (h) => new THREE.Color(h);
  const sc = new THREE.Scene(); sc.fog = new THREE.Fog(C('#03060a'), 40, 95);
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  sc.add(new THREE.HemisphereLight(0xcfe6ff, 0x0b1218, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(10, 20, 8); sc.add(sun);

  const districts = opts.districts;
  let chapters = opts.chapters;
  const byId = new Map(chapters.map((c, i) => [c.id, i]));
  const dIndex = new Map(districts.map((d, i) => [d.id, i]));

  // station positions: a snake through the districts with gaps between them
  const P = []; let z = 0;
  chapters.forEach((c, i) => { if (i > 0) z -= chapters[i - 1].district !== c.district ? 7 : 2.6; P.push(new THREE.Vector3(Math.sin(z * 0.075) * 9 + Math.sin(z * 0.021) * 4, 0.3, z)); });
  const N = P.length, curve = new THREE.CatmullRomCurve3(P, false, 'centripetal'), tAt = (i) => i / (N - 1);
  const minZ = P[N - 1].z, maxZ = P[0].z;

  const grid = new THREE.GridHelper(400, 200, C('#123528'), C('#0a1a14')); grid.position.set(0, 0, minZ / 2); sc.add(grid);
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();

  // district zones, obelisks, fog of war
  const zones = districts.map((d) => {
    const idx = chapters.map((c, i) => (c.district === d.id ? i : -1)).filter((i) => i >= 0);
    const pts = idx.map((i) => P[i]), xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, w = Math.max(...xs) - Math.min(...xs) + 12, h = Math.max(...zs) - Math.min(...zs) + 8;
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex, color: C(d.color), transparent: true, opacity: 0.22, depthWrite: false }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(cx, 0.02, cz); sc.add(zone);
    const ob = new THREE.Group(), first = pts[0];
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 4.2, 4), new THREE.MeshStandardMaterial({ color: C('#10181e'), roughness: 0.6, flatShading: true })); pillar.position.y = 2.1; pillar.rotation.y = Math.PI / 4; ob.add(pillar);
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.6), new THREE.MeshBasicMaterial({ color: C(d.color) })); cap.position.y = 4.9; ob.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: C(d.color) })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; ob.add(ring);
    ob.position.set(first.x + (first.x > 0 ? -7.5 : 7.5), 0, first.z + 1); sc.add(ob);
    const fog = new THREE.Group(), fogMat = new THREE.SpriteMaterial({ map: glowTex, color: C('#2a333b'), transparent: true, opacity: 0.85, depthWrite: false });
    for (let k = 0; k < 46; k++) { const s = new THREE.Sprite(fogMat); s.position.set(cx + (Math.random() - 0.5) * w * 0.8, 0.6 + Math.random() * 2.2, cz + (Math.random() - 0.5) * Math.max(2, h - 10)); const sz = 4 + Math.random() * 4; s.scale.set(sz, sz * 0.6, 1); s.userData.v = 0.2 + Math.random() * 0.4; fog.add(s); }
    sc.add(fog);
    const lock = new THREE.Group(), lm = new THREE.MeshBasicMaterial({ color: C('#c8d3cd') });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.35), lm); body.position.y = 3.4; lock.add(body);
    const sh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 8, 20, Math.PI), lm); sh.position.y = 3.95; lock.add(sh);
    lock.position.set(cx, 0, cz); sc.add(lock);
    return { d, cx, cz, zone, cap, fog, fogMat, lock, lifting: 0, anchor: new THREE.Vector3(ob.position.x, 5.9, ob.position.z) };
  });

  // company tiles at the first chapter of each company run
  function codeTex(code, col) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    x.fillStyle = '#0b141a'; x.fillRect(0, 0, 128, 128); x.strokeStyle = col; x.lineWidth = 8; x.strokeRect(8, 8, 112, 112);
    x.fillStyle = col; x.font = `800 ${code.length > 2 ? 40 : 54}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(code, 64, 68);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  chapters.forEach((c, i) => {
    if (i > 0 && chapters[i - 1].company === c.company && chapters[i - 1].district === c.district) return;
    const nxt = P[Math.min(i + 1, N - 1)], dir = new THREE.Vector3().subVectors(nxt, P[i]).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(P[i].x > 0 ? -2.6 : 2.6);
    const g = new THREE.Group(), top = new THREE.MeshBasicMaterial({ map: codeTex(c.code, c.color) }), sideM = new THREE.MeshStandardMaterial({ color: C('#0f1a20'), roughness: 0.7 });
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.45, 1.7), [sideM, sideM, top, sideM, sideM, sideM]); tile.position.y = 0.6; tile.rotation.y = Math.PI / 4; g.add(tile);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), new THREE.MeshBasicMaterial({ color: C(c.color), transparent: true, opacity: 0.7 })); beam.position.y = 2; g.add(beam);
    g.position.copy(P[i]).add(side); g.position.y = 0; sc.add(g);
  });

  // track segments and stations
  const segs = [];
  for (let i = 0; i < N - 1; i++) {
    const pts = []; for (let k = 0; k <= 8; k++) pts.push(curve.getPoint(tAt(i) + (tAt(i + 1) - tAt(i)) * k / 8));
    const sub = new THREE.CatmullRomCurve3(pts);
    const core = new THREE.Mesh(new THREE.TubeGeometry(sub, 16, 0.16, 6), new THREE.MeshBasicMaterial({ color: C('#26323a') }));
    const glow = new THREE.Mesh(new THREE.TubeGeometry(sub, 16, 0.42, 8), new THREE.MeshBasicMaterial({ color: C('#ffffff'), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.visible = false; sc.add(core, glow); segs.push({ core, glow, i });
  }
  const stations = chapters.map((c, i) => {
    const g = new THREE.Group(); g.position.copy(P[i]);
    const body = new THREE.Mesh(c.isBoss ? new THREE.CylinderGeometry(0.85, 0.95, 0.5, 6) : new THREE.CylinderGeometry(0.55, 0.6, 0.35, 24), new THREE.MeshStandardMaterial({ color: C('#2a3236'), roughness: 0.5 }));
    body.userData.idx = i; g.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(c.isBoss ? 1.15 : 0.82, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: C('#ffffff') })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
    let crown = null;
    if (c.isBoss) { crown = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 6), new THREE.MeshStandardMaterial({ color: C('#2a3236'), roughness: 0.5, flatShading: true })); crown.position.y = 0.6; g.add(crown); }
    sc.add(g); return { g, body, ring, crown };
  });
  const pickables = stations.map((s) => s.body);
  const pulses = Array.from({ length: 24 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.visible = false; sc.add(m); return { m, t: Math.random() }; });

  // the player
  const kit = makeAvatarKit(), me = kit.build(opts.look, opts.look && opts.look.acc); me.root.scale.setScalar(1.35); sc.add(me.root);
  let meAt = byId.has(opts.currentId) ? byId.get(opts.currentId) : 0, hop = null;
  const placeMe = (i) => { me.root.position.set(P[i].x, 0.42, P[i].z); };
  placeMe(meAt);

  const stateOf = (i) => chapters[i].state;
  const districtOpen = (d) => chapters.some((c) => c.district === d.id && c.state !== 'fog');
  function paint() {
    stations.forEach((s, i) => {
      const c = chapters[i], st = c.state, col = districts[dIndex.get(c.district)].color;
      const started = c.solved > 0 && st !== 'done';
      s.body.material.color.set(st === 'done' ? col : st === 'active' ? '#e8f4f0' : st === 'fog' ? '#151b20' : '#2a3236');
      s.body.material.emissive.set(st === 'done' ? col : st === 'active' ? '#5a8a80' : '#000000'); s.body.material.emissiveIntensity = st === 'done' ? 0.5 : st === 'active' ? 0.3 : 0;
      s.ring.visible = st === 'active' || st === 'done'; s.ring.material.color.set(st === 'done' || started ? col : '#ffffff');
      if (s.crown) s.crown.material.color.set(st === 'done' ? col : st === 'fog' ? '#151b20' : '#3a4448');
    });
    segs.forEach((sg) => {
      const c = chapters[sg.i], lit = c.state === 'done', col = districts[dIndex.get(c.district)].color, fogged = c.state === 'fog' || chapters[sg.i + 1].state === 'fog';
      sg.core.material.color.set(lit ? col : fogged ? '#12171b' : '#26323a'); sg.glow.visible = lit; sg.glow.material.color.set(col);
    });
    zones.forEach((zz) => {
      const open = districtOpen(zz.d); zz.zone.material.opacity = open ? 0.22 : 0.06; zz.cap.material.color.set(open ? zz.d.color : '#3b4448');
      if (!zz.lifting) { zz.fog.visible = !open; zz.lock.visible = !open; zz.fogMat.opacity = 0.85; }
    });
    renderLabels(true);
  }

  // camera rig
  const target = new THREE.Vector3(), goal = new THREE.Vector3(); let dist = 30, distGoal = 30, flying = false;
  function resize() { const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return; r.setSize(w, h, true); cam.aspect = w / h; cam.fov = w / h < 0.9 ? 52 : 40; cam.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const clampT = (v) => { v.z = Math.max(minZ - 4, Math.min(maxZ + 6, v.z)); v.x = Math.max(-20, Math.min(20, v.x)); return v; };
  function flyTo(p) { goal.copy(clampT(new THREE.Vector3(p.x * 0.6, 0, p.z - 4))); if (REDUCE) target.copy(goal); else flying = true; }
  target.set(P[meAt].x * 0.6, 0, P[meAt].z - 4); goal.copy(target);

  // input: drag to pan, wheel to zoom, tap a station
  const cv = r.domElement, ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let down = null, hover = null, selected = null;
  const pick = (e) => { const b = cv.getBoundingClientRect(); ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ptr, cam); const h = ray.intersectObjects(pickables, false)[0]; return h ? h.object.userData.idx : null; };
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, moved: 0 }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } };
  const onMove = (e) => {
    if (down) { const dx = e.clientX - down.x, dy = e.clientY - down.y; down.moved += Math.abs(dx) + Math.abs(dy); const k = dist / container.clientHeight * 1.4; goal.x -= dx * k; goal.z -= dy * k * 1.3; clampT(goal); flying = false; target.copy(goal); down.x = e.clientX; down.y = e.clientY; return; }
    hover = pick(e); cv.style.cursor = hover != null ? 'pointer' : 'grab';
  };
  const onUp = (e) => { if (down && down.moved < 6) { const i = pick(e); if (i != null && opts.onSelect) opts.onSelect(chapters[i].id); } down = null; };
  const onWheel = (e) => { e.preventDefault(); distGoal = Math.max(14, Math.min(60, distGoal * (e.deltaY > 0 ? 1.12 : 0.89))); };
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('wheel', onWheel, { passive: false });

  // HTML labels: district names always, stations when next up, hovered or selected
  const dls = zones.map((zz) => { const b = document.createElement('button'); b.className = 'od-dl'; b.addEventListener('click', () => api.flyToDistrict(zz.d.id)); layer.appendChild(b); return b; });
  const you = document.createElement('div'); you.className = 'od-you'; you.textContent = 'YOU'; layer.appendChild(you);
  const pool = [], v3 = new THREE.Vector3();
  const screen = (p) => { v3.copy(p).project(cam); return { x: (v3.x + 1) / 2 * container.clientWidth, y: (1 - v3.y) / 2 * container.clientHeight, on: v3.z < 1 && Math.abs(v3.x) < 1.15 && Math.abs(v3.y) < 1.15 }; };
  function renderLabels(force) {
    const W = container.clientWidth, placed = [];
    const hit = (r) => placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t);
    // the player's tag always wins
    const ys = screen(new THREE.Vector3(me.root.position.x, me.root.position.y + 3.2, me.root.position.z));
    you.style.display = ys.on ? '' : 'none'; you.style.transform = `translate3d(${ys.x.toFixed(1)}px,${ys.y.toFixed(1)}px,0) translate(-50%,-100%)`;
    if (ys.on) placed.push({ l: ys.x - 24, r: ys.x + 24, t: ys.y - 22, b: ys.y });
    // district names, nearest (lowest on screen) first; overlapping ones wait until you move closer
    const ds = zones.map((zz, i) => ({ zz, i, s: screen(zz.anchor) })).sort((a, b) => b.s.y - a.s.y);
    ds.forEach(({ zz, i, s }) => {
      const open = districtOpen(zz.d), b = dls[i];
      if (force) {
        const cs = chapters.filter((c) => c.district === zz.d.id), sol = cs.reduce((a, c) => a + c.solved, 0), tot = cs.reduce((a, c) => a + c.total, 0);
        b.className = 'od-dl' + (open ? '' : ' locked'); b.style.setProperty('--c', zz.d.color);
        b.innerHTML = `District ${zz.d.id}: ${open ? zz.d.name : 'Locked'}<small>${open ? `${zz.d.difficulty} · ${sol}/${tot}` : zz.d.lockHint}</small>`;
      }
      if (!s.on) { b.style.display = 'none'; return; }
      b.style.display = '';
      const bw = b.offsetWidth || 160, bh = b.offsetHeight || 40, x = Math.max(bw / 2 + 6, Math.min(W - bw / 2 - 6, s.x)), y = Math.max(bh + 6, s.y);
      const rect = { l: x - bw / 2 - 4, r: x + bw / 2 + 4, t: y - bh - 4, b: y + 4 };
      if (hit(rect)) { b.style.display = 'none'; return; }
      placed.push(rect); b.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-100%)`;
    });
    // station labels: open chapters plus the hovered/selected one, nearest to the view centre first
    const show = selected != null ? selected : hover, list = [];
    chapters.forEach((c, i) => { if ((c.state === 'active' && c.solved < c.total) || i === show) list.push(i); });
    const rank = (i) => (i === show ? 0 : i === meAt ? 1 : 2);
    list.sort((a, b) => rank(a) - rank(b) || P[a].distanceTo(target) - P[b].distanceTo(target));
    const shown = list.slice(0, 8);
    while (pool.length < shown.length) { const el = document.createElement('div'); el.className = 'od-nl'; layer.appendChild(el); pool.push(el); }
    pool.forEach((el, k) => {
      const i = shown[k]; if (i == null) { el.style.display = 'none'; return; }
      const c = chapters[i], s = screen(new THREE.Vector3(P[i].x, 1.6, P[i].z)), fog = c.state === 'fog';
      if (!s.on) { el.style.display = 'none'; return; }
      el.style.display = ''; el.classList.toggle('active', c.state === 'active'); el.style.setProperty('--c', fog ? '#5d6a70' : c.color);
      el.innerHTML = fog ? '<b>LOCKED</b><span>Hidden in the fog</span>' : `<b>CH.${c.id} · ${c.company.toUpperCase()}${c.state === 'active' ? ' · OPEN' : ''}</b><span>${c.title}</span>`;
      const ew = el.offsetWidth || 200, eh = el.offsetHeight || 36;
      if (i === meAt && !hop) {
        // your own station: label sits just below it so the avatar stays visible
        const g = screen(new THREE.Vector3(P[i].x, 0, P[i].z)), x = Math.max(6, Math.min(W - ew - 6, g.x - ew / 2)), y = g.y + 22;
        placed.push({ l: x - 2, r: x + ew + 2, t: y - 2, b: y + eh + 2 }); el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; return;
      }
      let x = s.x + 18; if (x + ew > W - 6) x = Math.max(6, s.x - 18 - ew);
      const rect = { l: x - 2, r: x + ew + 2, t: s.y - eh - 2, b: s.y + 2 };
      if (i !== show && hit(rect)) { el.style.display = 'none'; return; }
      placed.push(rect); el.style.transform = `translate3d(${x.toFixed(1)}px,${s.y.toFixed(1)}px,0) translate(0,-100%)`;
    });
  }

  // loop
  let raf = 0, last = performance.now(), t = 0, visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }); io.observe(container);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    if (flying) { target.lerp(goal, Math.min(1, dt * 3)); if (target.distanceTo(goal) < 0.05) flying = false; }
    dist += (distGoal - dist) * Math.min(1, dt * 6);
    cam.position.set(target.x, dist * 0.72, target.z + dist * 0.62); cam.lookAt(target.x, 0, target.z - 2);
    if (!REDUCE) {
      stations.forEach((s, i) => { if (stateOf(i) === 'active') { const k = 1 + Math.sin(t * 4) * 0.12; s.ring.scale.set(k, k, k); } else s.ring.scale.set(1, 1, 1); if (s.crown) s.crown.rotation.y = t * 0.6; });
      zones.forEach((zz) => {
        zz.cap.rotation.y = t; zz.cap.position.y = 4.9 + Math.sin(t * 1.5) * 0.15;
        zz.fog.children.forEach((s, k) => { s.position.x += Math.sin(t * 0.3 + k) * dt * s.userData.v; });
        if (zz.lifting) {
          zz.lifting -= dt * 0.5; zz.fogMat.opacity = Math.max(0, zz.lifting) * 0.85; zz.fog.position.y += dt * 2; zz.lock.position.y += dt * 3; zz.lock.scale.multiplyScalar(1 - dt * 0.5);
          if (zz.lifting <= 0) { zz.lifting = 0; zz.fog.visible = false; zz.lock.visible = false; zz.fog.position.y = 0; zz.lock.position.y = 0; zz.lock.scale.set(1, 1, 1); }
        }
      });
      let lastLit = -1; chapters.forEach((c, i) => { if (c.state === 'done') lastLit = i; });
      pulses.forEach((p) => {
        if (lastLit < 0) { p.m.visible = false; return; }
        p.t = (p.t + dt * 0.08) % 1; const tt = p.t * tAt(lastLit + 1), i = Math.min(N - 1, Math.floor(tt * (N - 1)));
        if (chapters[i].state !== 'done') { p.m.visible = false; return; }
        p.m.visible = true; p.m.position.copy(curve.getPoint(tt)); p.m.position.y += 0.2; p.m.material.color.set(chapters[i].color).multiplyScalar(1.6);
      });
    }
    if (hop) {
      hop.t += dt / hop.dur; const k = Math.min(1, hop.t), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const tt = tAt(hop.from) + (tAt(hop.to) - tAt(hop.from)) * e, p = curve.getPoint(tt), nx = curve.getPoint(Math.min(1, tt + 0.002));
      me.root.position.set(p.x, 0.42 + Math.abs(Math.sin(e * Math.PI * Math.max(1, Math.abs(hop.to - hop.from)))) * 0.9, p.z); me.root.rotation.y = Math.atan2(nx.x - p.x, nx.z - p.z);
      if (k >= 1) { meAt = hop.to; hop = null; placeMe(meAt); }
    } else {
      me.root.rotation.y += (0.4 - me.root.rotation.y) * Math.min(1, dt * 3);
      if (!REDUCE) me.root.position.y = 0.42 + Math.abs(Math.sin(t * 1.4)) * 0.06;
    }
    if (!REDUCE) kit.idle(me, t);
    r.render(sc, cam); renderLabels(false);
  }
  paint(); raf = requestAnimationFrame(frame);

  const api = {
    update(next, currentId) {
      chapters = next;
      if (!hop && byId.has(currentId) && byId.get(currentId) !== meAt) { meAt = byId.get(currentId); placeMe(meAt); }
      paint();
    },
    select(id) { selected = byId.has(id) ? byId.get(id) : null; if (selected != null) flyTo(P[selected]); renderLabels(false); },
    flyToDistrict(n) { const zz = zones[dIndex.get(n)]; if (!zz) return; flyTo(new THREE.Vector3(zz.cx / 0.6, 0, zz.cz + 4)); distGoal = 34; },
    travel(fromId, toId) {
      if (!byId.has(fromId) || !byId.has(toId)) return; const from = byId.get(fromId), to = byId.get(toId); if (from === to) return;
      flyTo(P[to]); if (REDUCE) { meAt = to; placeMe(to); return; }
      placeMe(from); hop = { from, to, t: 0, dur: Math.min(2.4, 0.6 + Math.abs(to - from) * 0.25) };
    },
    liftFog(n) { const zz = zones[dIndex.get(n)]; if (!zz) return; zz.fog.visible = true; zz.lock.visible = true; zz.lifting = REDUCE ? 0.001 : 1; },
    zoom(f) { distGoal = Math.max(14, Math.min(60, distGoal * f)); },
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('wheel', onWheel);
      kit.disposeAvatar(me.root);
      sc.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.userData && m.userData.keep) return; if (m.map) m.map.dispose(); m.dispose(); }); });
      glowTex.dispose(); kit.destroy(); r.dispose(); view.remove(); layer.remove();
    },
  };
  return api;
}

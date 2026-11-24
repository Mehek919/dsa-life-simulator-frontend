// ArrivalScenes.jsx
// Illustrated pieces for the arrival sequence: the sky, a building in the style of each company's
// campus, and an illustrated interviewer. Pure SVG + CSS, no images, no logos.
import React, { useMemo } from 'react';

const hash = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
// Seeded random so windows don't reshuffle on every render
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// ── Sky ─────────────────────────────────────────────────────────────────────
export function Sky({ sky = 'dusk', palette }) {
  const drops = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ l: (i * 37) % 100, d: (i % 10) * 0.13, t: 0.6 + (i % 5) * 0.12 })), []);
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({ l: (i * 53) % 100, t: (i * 29) % 55, d: (i % 7) * 0.4 })), []);
  return (
    <div className={`arr-sky sky-${sky}`} style={{ '--c1': palette[0], '--c2': palette[1] }} aria-hidden="true">
      {sky === 'sun' && <div className="arr-sun" />}
      {(sky === 'night' || sky === 'dusk') && stars.map((s, i) => <i key={i} className="arr-star" style={{ left: `${s.l}%`, top: `${s.t}%`, animationDelay: `${s.d}s` }} />)}
      {sky === 'rain' && drops.map((d, i) => <i key={i} className="arr-drop" style={{ left: `${d.l}%`, animationDelay: `${d.d}s`, animationDuration: `${d.t}s` }} />)}
      {sky === 'haze' && <div className="arr-haze" />}
      <div className="arr-glow" />
    </div>
  );
}

// ── Windows helper ──────────────────────────────────────────────────────────
function Windows({ x: x0, y: y0, cols, rows, w, h, gx = 4, gy = 5, color, seed = 1, lit = 0.55, off = '#0d1420' }) {
  const r = rng(seed);
  const x = Number(x0), y = Number(y0);
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const on = r() < lit;
    out.push(<rect key={`${i}-${j}`} className={on ? 'win on' : 'win'} x={x + i * (w + gx)} y={y + j * (h + gy)} width={w} height={h}
      fill={on ? color : off} style={on ? { animationDelay: `${(r() * 3).toFixed(2)}s` } : undefined} />);
  }
  return <g>{out}</g>;
}
const Tree = ({ x, y, s = 1, c = '#2f7d4f' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-2" y="-4" width="4" height="18" fill="#4a3424" /><circle cx="0" cy="-14" r="13" fill={c} /><circle cx="-8" cy="-6" r="9" fill={c} opacity=".9" /><circle cx="8" cy="-7" r="9" fill={c} opacity=".85" /></g>
);
const Bike = ({ x, y, c }) => (
  <g transform={`translate(${x} ${y})`} fill="none" stroke={c} strokeWidth="2"><circle cx="0" cy="0" r="7" /><circle cx="22" cy="0" r="7" /><path d="M0 0 L9 -11 L18 -11 L22 0 M9 -11 L13 0 L0 0 M18 -11 L19 -15" /></g>
);
const Palm = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}><path d="M0 0 Q3 -40 0 -70" stroke="#6b4f2e" strokeWidth="4" fill="none" />
    {[-60, -25, 15, 50, 85].map((a) => <path key={a} d="M0 -70 q20 -6 34 8" stroke="#3f8f4a" strokeWidth="5" fill="none" strokeLinecap="round" transform={`rotate(${a} 0 -70)`} />)}</g>
);

// ── Buildings (one per campus style) ────────────────────────────────────────
export function Building({ arch = 'office', palette, label, palms = false }) {
  const [c1, c2, c3, c4] = palette;
  const seed = hash(arch + c1);
  const ground = 300;
  let body;
  switch (arch) {
    case 'campus': // low colourful buildings, trees and bikes
      body = (<g>
        {[[60, 190, 170, 110, c1], [250, 170, 200, 130, c2], [470, 200, 160, 100, c3], [640, 185, 110, 115, c4]].map(([x, y, w, h, c], k) => (
          <g key={k}><rect x={x} y={y} width={w} height={h} fill="#16202e" /><rect x={x} y={y} width={w} height="8" fill={c} />
            <Windows x={x + 10} y={y + 20} cols={Math.floor((w - 20) / 22)} rows={Math.floor((h - 30) / 22)} w={18} h={14} color="#ffe9a8" seed={seed + k} lit={0.5} /></g>))}
        {[40, 235, 455, 630, 770].map((x, k) => <Tree key={x} x={x} y={ground - 10} s={1.1} c={['#2f7d4f', '#3a8f5a', '#2a6f45'][k % 3]} />)}
        {[300, 330, 360].map((x, k) => <Bike key={x} x={x} y={ground - 6} c={[c1, c2, c4][k]} />)}
      </g>);
      break;
    case 'spheres': // glass towers with three domes in front
      body = (<g>
        <rect x="90" y="40" width="130" height="260" fill="#142131" /><Windows x="100" y="52" cols={5} rows={15} w={18} h={10} gy={6} color="#ffd9a0" seed={seed} />
        <rect x="560" y="70" width="140" height="230" fill="#152435" /><Windows x="570" y="82" cols={5} rows={13} w={20} h={10} gy={6} color="#ffd9a0" seed={seed + 2} />
        {[[310, 250, 70], [420, 235, 85], [520, 262, 52]].map(([cx, cy, r], k) => (
          <g key={k}><circle cx={cx} cy={cy + 40} r={r} fill="url(#domeGlass)" stroke={c4} strokeOpacity=".7" />
            {Array.from({ length: 7 }).map((_, i) => <path key={i} d={`M${cx - r} ${cy + 40} Q${cx - r + (i + 1) * r / 4} ${cy + 40 - r * 1.25} ${cx + r} ${cy + 40}`} stroke={c4} strokeOpacity=".35" fill="none" />)}
            <Tree x={cx} y={cy + 30} s={0.9} c="#3f9a55" /></g>))}
      </g>);
      break;
    case 'roofgarden': // long building with a garden on the roof
      body = (<g>
        <rect x="70" y="190" width="660" height="110" fill="#152132" />
        {[c1, c2, c3, c4, c1, c2].map((c, k) => <rect key={k} x={90 + k * 105} y="215" width="80" height="70" fill={c} opacity=".75" rx="4" />)}
        <path d="M70 190 Q120 160 170 185 Q230 150 290 182 Q360 145 430 180 Q500 150 560 183 Q630 155 730 190 Z" fill="#2f8f4e" />
        {[130, 250, 380, 520, 650].map((x) => <Tree key={x} x={x} y={170} s={0.8} c="#3fae5c" />)}
      </g>);
      break;
    case 'glass': // mid-rise glass box with reflections
      body = (<g>
        <rect x="200" y="70" width="400" height="230" fill="url(#glassFill)" stroke={c1} strokeOpacity=".5" />
        {Array.from({ length: 10 }).map((_, i) => <line key={i} x1={200 + i * 40} y1="70" x2={200 + i * 40} y2="300" stroke="#9fd8ff" strokeOpacity=".18" />)}
        {Array.from({ length: 8 }).map((_, i) => <line key={i} x1="200" y1={70 + i * 29} x2="600" y2={70 + i * 29} stroke="#9fd8ff" strokeOpacity=".18" />)}
        <path d="M230 70 L330 70 L230 220 Z" fill="#fff" opacity=".07" /><path d="M420 70 L470 70 L330 300 L280 300 Z" fill="#fff" opacity=".05" />
        <Windows x="212" y="84" cols={9} rows={6} w={30} h={16} gx={10} gy={13} color={c3} seed={seed} lit={0.22} off="transparent" />
        <rect x="360" y="252" width="80" height="48" fill={c1} opacity=".9" /><rect x="372" y="262" width="56" height="38" fill="#0b1220" />
        <Tree x="160" y={ground - 8} c="#2d6a45" /><Tree x="640" y={ground - 8} c="#2d6a45" />
      </g>);
      break;
    case 'ring': // ring of curved glass around trees
      body = (<g>
        <ellipse cx="400" cy="250" rx="330" ry="70" fill="none" stroke="url(#ringGlass)" strokeWidth="34" />
        <ellipse cx="400" cy="250" rx="330" ry="70" fill="none" stroke="#e9eef6" strokeOpacity=".5" strokeWidth="2" />
        <ellipse cx="400" cy="250" rx="300" ry="54" fill="#21452f" opacity=".9" />
        {Array.from({ length: 14 }).map((_, i) => <Tree key={i} x={150 + i * 37} y={250 + ((i * 13) % 20) - 4} s={0.55} c={i % 2 ? '#3d8a52' : '#2f7444'} />)}
        {Array.from({ length: 24 }).map((_, i) => { const a = Math.PI + (i / 23) * Math.PI; return <line key={i} x1={400 + Math.cos(a) * 346} y1={250 + Math.sin(a) * 86} x2={400 + Math.cos(a) * 314} y2={250 + Math.sin(a) * 54} stroke="#fff" strokeOpacity=".25" />; })}
      </g>);
      break;
    case 'cylinders': // glass cylinders around a lagoon
      body = (<g>
        <ellipse cx="400" cy="300" rx="380" ry="26" fill="#21496a" opacity=".7" />
        {[[140, 90, 90], [280, 50, 100], [440, 70, 100], [600, 100, 90]].map(([x, y, w], k) => (
          <g key={k}><rect x={x} y={y} width={w} height={ground - y} fill="url(#cylFill)" /><ellipse cx={x + w / 2} cy={y} rx={w / 2} ry="10" fill="#2a3b4f" stroke={c2} strokeOpacity=".6" />
            {Array.from({ length: Math.floor((ground - y) / 14) }).map((_, i) => <line key={i} x1={x} y1={y + 10 + i * 14} x2={x + w} y2={y + 10 + i * 14} stroke="#a9c7e8" strokeOpacity=".22" />)}
            <rect x={x} y={ground + 2} width={w} height="18" fill="url(#cylFill)" opacity=".25" /></g>))}
      </g>);
      break;
    case 'tower': // tall tapered tower with a rounded crown
      body = (<g>
        <path d="M350 300 L362 40 Q400 6 438 40 L450 300 Z" fill="url(#towerFill)" stroke={c1} strokeOpacity=".5" />
        {Array.from({ length: 22 }).map((_, i) => <line key={i} x1={352 + i * 0.5} y1={60 + i * 11} x2={448 - i * 0.5} y2={60 + i * 11} stroke="#cfe9ff" strokeOpacity=".2" />)}
        <path d="M368 30 Q400 8 432 30" stroke={c3} strokeWidth="3" fill="none" className="arr-crown" />
        <rect x="120" y="200" width="90" height="100" fill="#16212f" /><Windows x="128" y="210" cols={4} rows={6} w={14} h={9} color="#ffe3a3" seed={seed} />
        <rect x="560" y="170" width="110" height="130" fill="#17222f" /><Windows x="568" y="180" cols={5} rows={8} w={14} h={9} color="#ffe3a3" seed={seed + 3} />
        <rect x="230" y="235" width="70" height="65" fill="#141e2b" /><rect x="490" y="225" width="60" height="75" fill="#141e2b" />
      </g>);
      break;
    case 'lowrise': // wide engineering building with labs
      body = (<g>
        <rect x="90" y="170" width="620" height="130" fill="#162131" /><rect x="90" y="166" width="620" height="6" fill={c1} />
        <Windows x="104" y="184" cols={16} rows={2} w={30} h={20} gx={8} gy={14} color="#cfe8ff" seed={seed} lit={0.6} />
        <rect x="370" y="250" width="60" height="50" fill={c1} opacity=".85" />
        {palms && [60, 750].map((x) => <Palm key={x} x={x} y={ground} />)}
      </g>);
      break;
    case 'canal': // narrow canal houses, water and bikes
      body = (<g>
        {Array.from({ length: 7 }).map((_, i) => { const x = 100 + i * 88, h = 150 + ((i * 37) % 50), c = ['#5a3a2e', '#2e3b4e', '#6b4b33', '#3b2f2f', '#24425a', '#5c4636', '#36453a'][i];
          return (<g key={i}><path d={`M${x} 300 L${x} ${300 - h} L${x + 20} ${300 - h} L${x + 20} ${290 - h} L${x + 40} ${270 - h} L${x + 60} ${290 - h} L${x + 60} ${300 - h} L${x + 80} ${300 - h} L${x + 80} 300 Z`} fill={c} />
            <Windows x={x + 10} y={318 - h} cols={3} rows={Math.floor(h / 34)} w={14} h={20} gx={9} gy={12} color="#ffe2a0" seed={seed + i} lit={0.5} /></g>); })}
        <rect x="0" y="300" width="800" height="40" fill="#1b3a52" />
        {Array.from({ length: 12 }).map((_, i) => <line key={i} x1={i * 70 + 10} y1={312 + (i % 3) * 8} x2={i * 70 + 45} y2={312 + (i % 3) * 8} stroke="#7fb3d9" strokeOpacity=".35" />)}
        {[140, 420, 600].map((x, k) => <Bike key={x} x={x} y={292} c={[c1, '#ddd', c3][k]} />)}
      </g>);
      break;
    case 'campusIn': // training campus: glass pyramid, low blocks, lawns
      body = (<g>
        <path d="M300 300 L400 150 L500 300 Z" fill="url(#glassFill)" stroke={c1} strokeOpacity=".7" />
        {Array.from({ length: 6 }).map((_, i) => <line key={i} x1={300 + i * 33} y1="300" x2="400" y2="150" stroke="#cfe9ff" strokeOpacity=".2" />)}
        <rect x="80" y="215" width="190" height="85" fill="#172333" /><Windows x="92" y="228" cols={7} rows={3} w={18} h={14} color="#ffe7a6" seed={seed} />
        <rect x="530" y="205" width="200" height="95" fill="#172333" /><Windows x="542" y="218" cols={7} rows={3} w={20} h={16} color="#ffe7a6" seed={seed + 1} />
        {[60, 285, 515, 750].map((x) => <Palm key={x} x={x} y={ground} />)}
      </g>);
      break;
    case 'factory': // very long flat factory with solar roof
      body = (<g>
        <rect x="30" y="190" width="740" height="110" fill="#d9dde3" /><rect x="30" y="182" width="740" height="10" fill="#9aa3ad" />
        {Array.from({ length: 18 }).map((_, i) => <rect key={i} x={40 + i * 41} y="172" width="34" height="10" fill="#1d3557" transform={`skewX(-20)`} />)}
        <rect x="30" y="240" width="740" height="10" fill={c1} />
        {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={60 + i * 80} y="262" width="46" height="38" fill="#3a4552" />)}
        <rect x="370" y="258" width="60" height="42" fill="#0e1622" />
      </g>);
      break;
    case 'triangles': // triangular roof with triangle skylights
      body = (<g>
        <path d="M90 300 L400 120 L710 300 Z" fill="#142012" stroke={c1} strokeOpacity=".7" />
        {Array.from({ length: 4 }).map((_, row) => Array.from({ length: row * 2 + 1 }).map((__, i) => {
          const y = 150 + row * 30, x = 400 - row * 52 + i * 52, up = i % 2 === 0;
          return <path key={`${row}-${i}`} className="tri" d={up ? `M${x - 22} ${y + 26} L${x} ${y} L${x + 22} ${y + 26} Z` : `M${x - 22} ${y} L${x + 22} ${y} L${x} ${y + 26} Z`} fill={c1} opacity={0.15 + ((row + i) % 3) * 0.12} style={{ animationDelay: `${(row + i) * 0.2}s` }} />;
        }))}
        <rect x="330" y="262" width="140" height="38" fill="#0b120a" stroke={c1} strokeOpacity=".5" />
      </g>);
      break;
    default: // generic office tower
      body = (<g>
        <rect x="300" y="60" width="200" height="240" fill="#151f2d" stroke={c1} strokeOpacity=".4" /><Windows x="312" y="74" cols={7} rows={14} w={20} h={10} gy={6} color={c4 || '#ffe3a3'} seed={seed} />
        <rect x="140" y="170" width="120" height="130" fill="#131c28" /><Windows x="150" y="182" cols={4} rows={7} w={20} h={9} color="#ffe3a3" seed={seed + 1} />
        <rect x="540" y="140" width="130" height="160" fill="#131c28" /><Windows x="550" y="152" cols={5} rows={9} w={18} h={9} color="#ffe3a3" seed={seed + 2} />
      </g>);
  }
  return (
    <svg className="arr-building" viewBox="0 0 800 340" role="img" aria-label={label}>
      <defs>
        <linearGradient id="glassFill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c1} stopOpacity=".35" /><stop offset="1" stopColor="#0b1422" stopOpacity=".95" /></linearGradient>
        <linearGradient id="domeGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c4} stopOpacity=".35" /><stop offset="1" stopColor="#0d1b26" stopOpacity=".9" /></linearGradient>
        <linearGradient id="ringGlass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#dfe6ef" /><stop offset=".5" stopColor="#8fa2b8" /><stop offset="1" stopColor="#e9eef5" /></linearGradient>
        <linearGradient id="cylFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1b2a3c" /><stop offset=".45" stopColor="#4f6b8a" /><stop offset="1" stopColor="#152131" /></linearGradient>
        <radialGradient id="groundFade" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#05080e" stopOpacity=".95" /><stop offset=".7" stopColor="#05080e" stopOpacity=".6" /><stop offset="1" stopColor="#05080e" stopOpacity="0" /></radialGradient>
        <linearGradient id="towerFill" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1e3550" /><stop offset=".5" stopColor="#5d86ad" /><stop offset="1" stopColor="#1a2c42" /></linearGradient>
      </defs>
      <ellipse cx="400" cy="306" rx="420" ry="30" fill="url(#groundFade)" />
      {body}
      <line x1="60" y1="300" x2="740" y2="300" stroke={c1} strokeOpacity=".3" />
    </svg>
  );
}

// ── Illustrated interviewer ─────────────────────────────────────────────────
const SKIN = ['#f1c7a5', '#e0a982', '#c68863', '#9a6646', '#6f4730'];
const HAIR = ['#1d1612', '#3b2618', '#6b4a2b', '#b07a3f', '#2b2b2b'];
export function Person({ name = '', color = '#7c6cff', size = 120, speaking = false }) {
  const h = hash(name);
  const skin = SKIN[h % SKIN.length], hair = HAIR[(h >> 3) % HAIR.length], style = (h >> 6) % 4;
  return (
    <svg className={`arr-person${speaking ? ' speaking' : ''}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={name}>
      <defs><linearGradient id={`bg-${h}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={color} stopOpacity=".55" /><stop offset="1" stopColor="#0b0f1a" /></linearGradient></defs>
      <circle cx="60" cy="60" r="58" fill={`url(#bg-${h})`} />
      <path d="M18 118 Q22 84 60 80 Q98 84 102 118 Z" fill={color} />
      <path d="M50 80 L60 92 L70 80" fill="#fff" opacity=".85" />
      <rect x="53" y="66" width="14" height="16" rx="6" fill={skin} />
      {style === 1 && <path d="M34 50 Q34 96 46 100 L46 52 Z M86 50 Q86 96 74 100 L74 52 Z" fill={hair} />}
      <ellipse cx="60" cy="50" rx="20" ry="23" fill={skin} />
      {style === 0 && <path d="M40 46 Q42 24 60 24 Q80 24 80 46 Q74 34 60 34 Q48 34 40 46 Z" fill={hair} />}
      {style === 1 && <path d="M38 50 Q38 22 60 22 Q82 22 82 50 Q76 32 60 32 Q44 32 38 50 Z" fill={hair} />}
      {style === 2 && <g fill={hair}><path d="M40 44 Q42 24 60 24 Q80 24 80 44 Q70 32 60 32 Q50 32 40 44 Z" /><circle cx="60" cy="20" r="9" /></g>}
      {style === 3 && <path d="M41 42 Q46 28 60 28 Q74 28 79 42 Q70 35 60 35 Q50 35 41 42 Z" fill={hair} opacity=".9" />}
      <circle cx="52" cy="52" r="2.2" fill="#1b1b1b" /><circle cx="68" cy="52" r="2.2" fill="#1b1b1b" />
      <path className="mouth" d="M53 62 Q60 67 67 62" stroke="#7a3b2e" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

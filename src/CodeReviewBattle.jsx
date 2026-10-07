import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
// ── Theme ─────────────────────────────────────────────────────────────────────
const DIFF_COLORS = { Easy: '#3ddc97', Medium: '#ffb020', Hard: '#ff4d5e' };
const SEV_COLORS  = { Critical: '#ff4d5e', High: '#f97316', Medium: '#ffb020', Low: '#8f9bae' };
const DISPLAY = "'Oxanium', sans-serif";
const BODY    = "'IBM Plex Sans', system-ui, sans-serif";
const MONO    = "'JetBrains Mono', 'Fira Code', ui-monospace, monospace";
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Oxanium:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap';
const STYLE = `
.crb-silver{background:linear-gradient(180deg,#ffffff 0%,#e3e8ef 42%,#8e98a8 52%,#d9dfe8 72%,#f4f6f9 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes crbBlink{0%,49%{opacity:1}50%,100%{opacity:.15}}
@keyframes crbMarquee{to{transform:translateX(-50%)}}
@keyframes crbGlow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes crbScan{0%{transform:translateY(-100%)}100%{transform:translateY(900%)}}
@keyframes crbSteam{0%{transform:translateY(2px);opacity:.3}50%{opacity:1}100%{transform:translateY(-4px);opacity:.3}}
@keyframes crbGrid{to{background-position:0 48px}}
@keyframes crbShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.crb-blink{animation:crbBlink 1s steps(1) infinite}
.crb-blink-slow{animation:crbBlink 1.6s steps(1) infinite}
.crb-marquee{animation:crbMarquee 38s linear infinite}
.crb-glow{animation:crbGlow 2.8s ease-in-out infinite}
.crb-scan{animation:crbScan 5s linear infinite}
.crb-steam{animation:crbSteam .9s ease-in-out infinite}
.crb-floor{animation:crbGrid 3s linear infinite}
.crb-skel{background:linear-gradient(90deg,#0d131d 0,#162030 50%,#0d131d 100%);background-size:800px 100%;animation:crbShimmer 1.4s linear infinite}
.crb-card{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease,border-color .3s ease}
.crb-card:hover{border-color:#3a4a63}
.crb-btn{transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,color .15s ease}
.crb-card:focus-visible,.crb-btn:focus-visible,.crb-ln:focus-visible{outline:2px solid #5ad8ff;outline-offset:2px}
.crb-row:hover{background:rgba(90,216,255,.05)}
.crb-ln{background:none;border:0;padding:0 14px 0 8px;width:100%;text-align:right;color:#4b5870;font:inherit;cursor:pointer;line-height:1.7}
.crb-ln:hover{color:#5ad8ff}
.crb-scroll{scrollbar-width:thin;scrollbar-color:#243045 transparent}
@media (max-width:900px){
  .crb-desk{transform:none !important}
  .crb-hide-sm{display:none !important}
  .crb-review-body{flex-direction:column !important;overflow-y:auto}
  .crb-review-side{width:100% !important;border-left:0 !important;border-top:1px solid #1c2636}
  .crb-review-code{min-height:55vh}
}
@media (prefers-reduced-motion:reduce){.crb-blink,.crb-blink-slow,.crb-marquee,.crb-glow,.crb-scan,.crb-steam,.crb-floor,.crb-skel{animation:none}}
`;

// ── Author personality ────────────────────────────────────────────────────────
const MOODS = [
  { label: 'Confident', color: '#3ddc97', glow: 'rgba(61,220,151,.35)' },
  { label: 'Skeptical', color: '#5ad8ff', glow: 'rgba(90,216,255,.35)' },
  { label: 'Defensive', color: '#ffb020', glow: 'rgba(255,176,32,.38)' },
  { label: 'Furious',   color: '#ff4d5e', glow: 'rgba(255,77,94,.45)'  },
];

// Backend can send scenario.author.quotes = [4 strings] to override these.
const DEFAULT_QUOTES = [
  'It works on my machine. Ship it?',
  'Are you sure that is actually a problem?',
  'We are out of time. Can we fix it after launch?',
  'Fine. Show me exactly where it breaks.',
];

const STANCES = [
  { label: 'Approve',         icon: 'M5 12l5 5 9-10' },
  { label: 'Ask a question',  icon: 'M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7V14 M12 18h.01' },
  { label: 'Request changes', icon: 'M4 20h4L19 9l-4-4L4 16z M13 7l4 4' },
  { label: 'Block merge',     icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M5.6 5.6l12.8 12.8' },
];

const BROWS = [
  ['M43 48 Q50 44 56 47', 'M64 47 Q70 44 77 48'],
  ['M43 48 L56 48',       'M64 46 Q70 40 77 44'],
  ['M44 46 L56 49',       'M64 49 L76 46'],
  ['M43 43 L57 50',       'M63 50 L77 43'],
];
const MOUTHS = [
  'M51 69 Q60 76 69 69',
  'M52 71 Q62 72 69 68',
  'M51 73 Q60 67 69 73',
  'M50 71 Q60 63 70 71 Q60 81 50 71 Z',
];
const HAIR_PATHS = {
  spiky: 'M32 52 C30 30 44 24 60 24 C76 24 90 30 88 52 L84 42 L78 47 L72 38 L64 45 L58 36 L50 45 L44 38 L38 47 Z',
  bob:   'M30 66 C26 34 44 24 60 24 C78 24 94 34 90 66 C86 58 86 48 80 42 C70 48 50 48 40 42 C34 48 34 58 30 66 Z',
  side:  'M33 50 C32 30 46 25 62 25 C78 25 89 32 88 50 C84 40 72 36 58 37 C48 37 39 41 33 50 Z',
  bun:   'M32 54 C30 32 44 25 60 25 C76 25 90 32 88 54 C84 44 72 38 60 38 C48 38 36 44 32 54 Z',
};
const HAIR_KEYS = ['spiky', 'bob', 'side', 'bun'];
const SKINS  = ['#f1c7a3', '#e2b089', '#d9a77c', '#c99272', '#a8714f', '#7d4f35'];
const HAIRS  = ['#1c120c', '#2b1d14', '#4a2f1d', '#2a2a35', '#6b3e22', '#3b2a20'];
const SHIRTS = ['#2f4b7c', '#6b3a7a', '#3c5a46', '#7a4a2a', '#2c5f6b', '#5a3a3a'];

function hash(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

function looksFor(author) {
  const h = hash(author?.name || 'author');
  return {
    skin:  SKINS[h % SKINS.length],
    hair:  HAIRS[(h >> 3) % HAIRS.length],
    shirt: SHIRTS[(h >> 6) % SHIRTS.length],
    style: HAIR_KEYS[(h >> 9) % HAIR_KEYS.length],
    glasses: ((h >> 12) & 1) === 1,
  };
}

function quoteFor(author, level) {
  const q = author?.quotes;
  return (Array.isArray(q) && q[level]) || DEFAULT_QUOTES[level];
}

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// Count how many concrete issues the player has raised: paragraphs or bullets that
// point at a line or name a problem. Drives the author's expression live.
function countIssues(text) {
  return text
    .split(/\n\s*\n|\n(?=\s*(?:[-*•]|\d+[.)]|line\s*\d+))/i)
    .map(s => s.trim())
    .filter(s => s.length >= 12 && /(line\s*\d+|L\d+|:\s|bug|leak|race|inject|missing|should|never|unsafe|slow|n\+1)/i.test(s))
    .length;
}
const issuesToLevel = n => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3);

// ── Small building blocks ─────────────────────────────────────────────────────
function Icon({ d, size = 16, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const I = {
  back:   'M15 18l-6-6 6-6',
  lens:   'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13z M15.5 15.5L21 21 M8 10.5h5 M10.5 8v5',
  pr:     'M6 3v12 M6 21a2 2 0 1 0 0-4a2 2 0 0 0 0 4z M18 9a2 2 0 1 0 0-4a2 2 0 0 0 0 4z M18 9c0 6-6 4-12 8',
  arrow:  'M5 12h14 M13 6l6 6-6 6',
  check:  'M5 12l5 5 9-10',
  cross:  'M6 6l12 12 M18 6L6 18',
  alert:  'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z',
  doc:    'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  pen:    'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',
  chart:  'M4 20V11 M10 20V5 M16 20v-6 M21 20H3',
};

function AuthorPortrait({ author, level = 0, size = 48, ringColor, glow }) {
  const lk  = looksFor(author);
  const lvl = Math.max(0, Math.min(3, level));
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img"
      aria-label={`${author?.name || 'Author'} looks ${MOODS[lvl].label.toLowerCase()}`}
      style={{ flexShrink: 0, borderRadius: '50%', boxShadow: `0 0 0 2px #0b1018, 0 0 0 ${size > 80 ? 5 : 3}px ${ringColor || MOODS[lvl].color}${glow ? `, 0 0 30px ${MOODS[lvl].glow}` : ''}` }}>
      <circle cx="60" cy="60" r="60" fill="#0f1726" />
      <path d="M18 120 C20 98 38 88 60 88 C82 88 100 98 102 120 Z" fill={lk.shirt} />
      <rect x="53" y="78" width="14" height="12" fill={lk.skin} />
      {lk.style === 'bun' && <circle cx="60" cy="22" r="9" fill={lk.hair} />}
      <circle cx="60" cy="56" r="28" fill={lk.skin} />
      <path d={HAIR_PATHS[lk.style]} fill={lk.hair} />
      <ellipse cx="46" cy="66" rx="6" ry="3.5" fill="#ff5a6a" opacity={[0, 0, 0.35, 0.8][lvl]} />
      <ellipse cx="74" cy="66" rx="6" ry="3.5" fill="#ff5a6a" opacity={[0, 0, 0.35, 0.8][lvl]} />
      <ellipse cx="50" cy="57" rx="3" ry={[3.2, 3, 2.6, 2][lvl]} fill="#121826" />
      <ellipse cx="70" cy="57" rx="3" ry={[3.2, 3, 2.6, 2][lvl]} fill="#121826" />
      {lk.glasses && (
        <g fill="none" stroke="#cfd6e0" strokeWidth="2">
          <circle cx="50" cy="57" r="7" /><circle cx="70" cy="57" r="7" /><path d="M57 57h6" />
        </g>
      )}
      <path d={BROWS[lvl][0]} stroke={lk.hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={BROWS[lvl][1]} stroke={lk.hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={MOUTHS[lvl]} stroke="#4a2420" strokeWidth="2.5" fill={lvl === 3 ? '#3a1414' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      {lvl >= 2 && <path d="M86 40 C90 46 90 50 86 52 C82 50 82 46 86 40 Z" fill="#7dd3fc" />}
      {lvl === 3 && (
        <g className="crb-steam" stroke="#ff5a6a" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M30 30 q-4 -6 0 -12" /><path d="M90 30 q4 -6 0 -12" /><path d="M24 40 q-4 -5 0 -10" />
        </g>
      )}
    </svg>
  );
}

function MoodMeter({ level }) {
  return (
    <div style={{ display: 'flex', gap: 4 }} aria-label={`Pushback ${level} of 3`}>
      {[0, 1, 2, 3].map(i => (
        <span key={i} style={{
          flex: 1, height: 6, borderRadius: 3,
          background: i <= level ? MOODS[level].color : '#1d2636',
          boxShadow: i <= level ? `0 0 8px ${MOODS[level].glow}` : 'none',
          transition: 'background .3s ease',
        }} />
      ))}
    </div>
  );
}

function SpeechBubble({ children }) {
  return (
    <div style={{ position: 'relative', padding: '14px 16px', borderRadius: 12, background: '#0b111a', border: '1px solid #1f2a3c' }}>
      <span style={{ position: 'absolute', left: 22, top: -7, width: 12, height: 12, transform: 'rotate(45deg)', background: '#0b111a', borderLeft: '1px solid #1f2a3c', borderTop: '1px solid #1f2a3c' }} />
      <AnimatePresence mode="wait">
        <motion.div key={String(children)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
          style={{ fontSize: 15, lineHeight: 1.5, color: '#e8edf4' }}>
          "{children}"
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Ticker({ items }) {
  if (!items.length) return null;
  const loop = items.concat(items);
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderTop: '1px solid #172131', borderBottom: '1px solid #172131', background: '#080c12', flexShrink: 0 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: '#ff4d5e', color: '#1a0306', fontFamily: DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '.18em' }}>
        <span className="crb-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a0306' }} />LIVE
      </div>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', maskImage: 'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)' }}>
        <div className="crb-marquee" style={{ display: 'flex', width: 'max-content', gap: 40, padding: '10px 0', fontFamily: MONO, fontSize: 13, whiteSpace: 'nowrap' }}>
          {loop.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: t.color }}>{t.sev}</span>
              <span style={{ color: '#c3ccd8' }}>{t.svc}</span>
              <span style={{ color: '#8794a8' }}>{t.msg}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function prNumber(s) {
  const m = String(s?.pr || '').match(/#\s*(\d+)/);
  return m ? `pr-${m[1]}` : (s?.id || 'svc');
}

// Backend may send scenario.ticker = [{ sev, svc, msg }]; otherwise derive lines.
function buildTicker(scenarios) {
  const out = [];
  scenarios.forEach(s => {
    if (Array.isArray(s.ticker)) { s.ticker.forEach(t => out.push({ color: t.sev?.includes('CRIT') ? '#ff4d5e' : '#ffb020', ...t })); return; }
    const hard = s.difficulty === 'Hard';
    out.push({ sev: hard ? '[CRIT]' : '[WARN]', svc: prNumber(s), msg: `${s.title} blocking release`, color: hard ? '#ff4d5e' : '#ffb020' });
  });
  out.push({ sev: '[INFO]', svc: 'release-train', msg: `freeze active, ${scenarios.length} PRs pending review`, color: '#5ad8ff' });
  return out;
}

function countdownStart(s) {
  if (s.launchSeconds) return s.launchSeconds;
  const h = hash(String(s.id));
  if (s.difficulty === 'Hard')   return 540 + (h % 12) * 60 + (h % 50);
  if (s.difficulty === 'Medium') return 1500 + (h % 24) * 60 + (h % 50);
  return 3000 + (h % 20) * 60;
}

function useTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

const shellStyle = {
  minHeight: '100vh', background: '#06080c', color: '#dfe5ee', fontFamily: BODY,
  position: 'relative', overflowX: 'hidden',
};

// ── Scenario Selector (Command Desk) ──────────────────────────────────────────
function ScenarioSelector({ onStart, loading, onBack, startError }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [fetching,  setFetching]  = useState(true);
  const [fetchErr,  setFetchErr]  = useState(false);
  const [stance,    setStance]    = useState(0);
  const tick = useTick();

  const load = () => {
    setFetching(true);
    setFetchErr(false);
    axios.get(`${API_BASE}/code-review/scenarios`)
      .then(r => { setScenarios(r.data.scenarios || []); setFetching(false); })
      .catch(() => { setFetchErr(true); setFetching(false); });
  };
  useEffect(load, []);

  const ticker = useMemo(() => buildTicker(scenarios), [scenarios]);
  const sel    = scenarios.find(s => s.id === selected) || null;
  const clock  = new Date().toISOString().slice(11, 19) + ' UTC';

  const pick = id => { setSelected(cur => (cur === id ? null : id)); setStance(0); };

  // Live infrastructure readings (cosmetic, drift every second)
  const j = (a, b) => a + Math.sin(tick / b) * a * 0.12;
  const err = j(3.2, 2), p99 = j(4.8, 3), heap = Math.min(96, 82 + (tick % 40) * 0.35);
  const metrics = [
    { label: 'Error rate',  value: `${err.toFixed(1)}%`, pct: Math.min(100, err * 18), color: '#ff4d5e' },
    { label: 'p99 latency', value: `${p99.toFixed(1)}s`, pct: Math.min(100, p99 * 15), color: '#ffb020' },
    { label: 'Heap usage',  value: `${heap.toFixed(0)}%`, pct: heap, color: heap > 90 ? '#ff4d5e' : '#5ad8ff' },
  ];

  return (
    <div style={shellStyle}>
      <div style={{ position: 'absolute', left: '50%', top: -260, width: 1400, height: 800, marginLeft: -700, background: 'radial-gradient(ellipse at 50% 40%, rgba(90,216,255,.10), rgba(255,77,94,.05) 45%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Alert strip */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px 18px', padding: '8px 16px', background: 'rgba(255,77,94,.08)', borderBottom: '1px solid rgba(255,77,94,.35)', fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '.22em', color: '#ff8c97' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="crb-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d5e', boxShadow: '0 0 10px #ff4d5e' }} />
          CHANGE FREEZE IN EFFECT
        </span>
        <span style={{ color: '#6f7b8e' }}>/</span>
        <span>{fetching ? 'SCANNING PULL REQUESTS' : `${scenarios.length} PULL REQUESTS BLOCKING RELEASE`}</span>
      </div>

      {/* Command bar */}
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 1320, margin: '0 auto', padding: '20px 24px 14px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button type="button" className="crb-btn" onClick={onBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #243045', background: '#0c1119', color: '#c9d1dc', fontSize: 14, cursor: 'pointer' }}>
            <Icon d={I.back} /> Back
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(90,216,255,.45)', background: '#0b1520', boxShadow: '0 0 18px rgba(90,216,255,.25)' }}>
              <Icon d={I.lens} size={22} color="#5ad8ff" />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <h1 className="crb-silver" style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(26px, 3.4vw, 40px)', letterSpacing: '.04em', lineHeight: 1 }}>CODE REVIEW BATTLE</h1>
              <span style={{ fontSize: 14, color: '#95a1b3' }}>Find the bugs before the code ships. The author will push back, so hold your ground.</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 14px', borderRadius: 10, border: '1px solid #1c2636', background: '#0b1018' }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8794a8' }}>OPS CLOCK</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: '#e8edf4' }}>{clock}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,176,32,.4)', background: '#0b1018' }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8794a8' }}>THREAT LEVEL</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: '#ffb020' }}>
              <span className="crb-blink-slow" style={{ width: 8, height: 8, borderRadius: 2, background: '#ffb020' }} />ELEVATED
            </span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 3 }}><Ticker items={ticker} /></div>

      {/* Main */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1320, margin: '0 auto', padding: '28px 24px 48px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

        {/* Desk */}
        <div style={{ flex: '999 1 620px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14, padding: '0 4px' }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em', fontSize: 13, color: '#95a1b3' }}>INCOMING PR DOSSIERS</span>
            <span style={{ fontSize: 13, color: '#8794a8' }}>Select one to open the briefing</span>
          </div>

          <div style={{ position: 'relative', borderRadius: 22, border: '1px solid #1a2433', background: 'linear-gradient(180deg, #0b1119, #070a0f)', padding: '26px 22px 34px', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 40px 80px rgba(0,0,0,.55)' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', perspective: 500, pointerEvents: 'none', overflow: 'hidden' }}>
              <div className="crb-floor" style={{ position: 'absolute', left: '-40%', right: '-40%', top: 0, bottom: -120, transform: 'rotateX(70deg)', transformOrigin: '50% 0', backgroundImage: 'linear-gradient(rgba(90,216,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(90,216,255,.14) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to bottom, transparent, #000 40%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 40%)' }} />
            </div>
            <div className="crb-scan" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 80, background: 'linear-gradient(180deg, transparent, rgba(90,216,255,.05), transparent)', pointerEvents: 'none' }} />

            {fetching && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 22, position: 'relative' }}>
                {[0, 1, 2, 3].map(i => <div key={i} className="crb-skel" style={{ height: 300, borderRadius: 16 }} />)}
              </div>
            )}

            {!fetching && fetchErr && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#ff8c97' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}><Icon d={I.alert} size={18} /> Could not reach the PR queue.</div>
                <div>
                  <button type="button" className="crb-btn" onClick={load}
                    style={{ marginTop: 14, height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(255,77,94,.5)', background: 'rgba(255,77,94,.12)', color: '#ff8c97', fontWeight: 600, cursor: 'pointer' }}>
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!fetching && !fetchErr && scenarios.length === 0 && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#95a1b3' }}>
                <div className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Desk is clear</div>
                No pull requests are waiting for review right now.
              </div>
            )}

            {!fetching && !fetchErr && scenarios.length > 0 && (
              <div style={{ perspective: 1600, position: 'relative' }}>
                <div className="crb-desk" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 22, transform: 'rotateX(10deg)', transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}>
                  {scenarios.map((s, idx) => (
                    <DossierCard key={s.id} s={s} index={idx} tick={tick}
                      isSel={selected === s.id} level={selected === s.id ? stance : 0}
                      onPick={() => pick(s.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Briefing */}
        <div style={{ flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Briefing sel={sel} stance={stance} setStance={setStance} tick={tick}
            loading={loading} startError={startError} onStart={() => sel && onStart(sel.id)} />

          <div style={{ borderRadius: 18, border: '1px solid #1a2433', background: '#0a0e15', padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em', fontSize: 12, color: '#95a1b3' }}>LIVE INFRASTRUCTURE</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ff8c97' }}>
                <span className="crb-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d5e' }} />{sel ? prNumber(sel) : 'all services'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {metrics.map(m => (
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#aab4c3' }}>{m.label}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, color: m.color }}>{m.value}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#151d2a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.pct}%`, borderRadius: 3, background: m.color, boxShadow: `0 0 10px ${m.color}`, transition: 'width .8s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DossierCard({ s, index, tick, isSel, level, onPick }) {
  const accent = DIFF_COLORS[s.difficulty] || '#8f9bae';
  const start  = countdownStart(s);
  const left   = start - (tick % start);
  const urgent = left < 900;
  const threat = s.difficulty === 'Hard' ? 5 : s.difficulty === 'Medium' ? 3 : 2;
  const mood   = MOODS[level];

  return (
    <motion.button
      type="button" aria-pressed={isSel} onClick={onPick} className="crb-card"
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, padding: 18, borderRadius: 16,
        cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 300,
        background: 'linear-gradient(180deg,#101724,#0a0f17)',
        border: `1px solid ${isSel ? accent : '#1d2838'}`,
        transform: isSel ? 'translateZ(46px) rotateX(-10deg)' : 'translateZ(0)',
        boxShadow: isSel
          ? `0 0 0 1px ${accent}55, 0 0 36px ${accent}55, 0 30px 50px rgba(0,0,0,.65)`
          : `0 0 22px ${accent}14, 0 18px 30px rgba(0,0,0,.5)`,
      }}
    >
      <span className="crb-glow" style={{ position: 'absolute', left: 16, right: 16, top: -1, height: 2, borderRadius: 2, background: accent, boxShadow: `0 0 14px ${accent}` }} />

      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1522', border: `1px solid ${accent}73` }}>
          <Icon d={I.pr} size={20} color={accent} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, lineHeight: 1.15 }}>{s.title}</span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: '#8f9bae' }}>{s.pr}</span>
        </span>
        <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${accent}73`, background: `${accent}1a`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 11, letterSpacing: '.12em', color: accent, textTransform: 'uppercase' }}>
          <span className="crb-blink-slow" style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />{s.difficulty}
        </span>
      </span>

      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderRadius: 12, background: '#070b11',
        border: `1px solid ${urgent ? 'rgba(255,77,94,.5)' : '#1c2636'}`,
        boxShadow: `inset 0 0 18px ${urgent ? 'rgba(255,77,94,.12)' : 'rgba(0,0,0,.4)'}`,
      }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8f9bae' }}>{s.clockLabel || (s.difficulty === 'Hard' ? 'PROD LAUNCH IN' : 'RELEASE WINDOW IN')}</span>
          <span style={{ fontSize: 12, color: '#aab4c3' }}>{prNumber(s)}</span>
        </span>
        <span className={urgent ? 'crb-blink-slow' : ''} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: '.04em', color: urgent ? '#ff6b78' : '#e8edf4', textShadow: `0 0 12px ${urgent ? 'rgba(255,77,94,.7)' : 'rgba(200,215,235,.25)'}` }}>
          {fmt(left)}
        </span>
      </span>

      <span style={{ fontSize: 14, lineHeight: 1.55, color: '#b9c3d1' }}>{s.description}</span>

      <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 4 }}>
        <AuthorPortrait author={s.author} level={level} size={48} ringColor={mood.color} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#e8edf4' }}>{s.author?.name}</span>
          <span style={{ fontSize: 12, color: '#8f9bae' }}>{s.author?.role} · <span style={{ color: mood.color }}>{mood.label}</span></span>
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, padding: '3px 8px', borderRadius: 6, border: `1px solid ${(s.color || '#2a3850')}66`, color: s.color || '#c3ccd8' }}>{s.language}</span>
          <span style={{ display: 'flex', gap: 3 }} aria-label={`Threat ${threat} of 5`}>
            {[1, 2, 3, 4, 5].map(i => <span key={i} style={{ width: 6, height: 14, borderRadius: 2, background: i <= threat ? accent : '#1d2636' }} />)}
          </span>
        </span>
      </span>
    </motion.button>
  );
}

function Briefing({ sel, stance, setStance, tick, loading, startError, onStart }) {
  if (!sel) {
    return (
      <div style={{ borderRadius: 20, border: '1px dashed #243045', background: '#0a0e15', padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #243045', background: '#0d131d' }}>
          <Icon d={I.doc} size={28} color="#5a6880" />
        </span>
        <span className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>AWAITING SELECTION</span>
        <span style={{ fontSize: 14, color: '#95a1b3', maxWidth: 280 }}>Pick a dossier from the desk to meet the author and open the review room.</span>
        <button type="button" disabled
          style={{ marginTop: 6, width: '100%', minHeight: 54, borderRadius: 12, border: '1px solid #1c2636', background: '#0c1119', color: '#5a6880', fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '.14em', cursor: 'not-allowed' }}>
          SELECT A PR TO REVIEW
        </button>
      </div>
    );
  }

  const accent = DIFF_COLORS[sel.difficulty] || '#8f9bae';
  const mood   = MOODS[stance];
  const start  = countdownStart(sel);
  const left   = start - (tick % start);
  const urgent = left < 900;

  return (
    <motion.div key={sel.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
      style={{ position: 'relative', borderRadius: 20, border: `1px solid ${accent}73`, background: 'linear-gradient(180deg, #0d131d, #080b11)', padding: 22, boxShadow: `0 0 0 1px rgba(0,0,0,.6), 0 0 40px ${accent}38`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em', fontSize: 12, color: '#95a1b3' }}>AUTHOR BRIEFING</span>
        <span style={{ fontFamily: MONO, fontSize: 12, color: '#8f9bae' }}>{sel.pr}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, marginTop: 16 }}>
        <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
          <div className="crb-glow" style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: `radial-gradient(circle, ${mood.glow}, transparent 68%)` }} />
          <div style={{ position: 'relative' }}><AuthorPortrait author={sel.author} level={stance} size={150} glow /></div>
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, lineHeight: 1.1 }}>{sel.author?.name}</span>
          <span style={{ fontSize: 13, color: '#95a1b3' }}>{sel.author?.role}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '.16em', color: mood.color }}>
            <span className="crb-blink-slow" style={{ width: 8, height: 8, borderRadius: '50%', background: mood.color }} />{mood.label.toUpperCase()}
          </span>
          <MoodMeter level={stance} />
        </div>
      </div>

      <div style={{ marginTop: 18 }}><SpeechBubble>{quoteFor(sel.author, stance)}</SpeechBubble></div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: '.18em', color: '#8794a8' }}>TEST YOUR STANCE</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {STANCES.map((st, i) => {
            const on = stance === i;
            const c  = MOODS[i].color;
            return (
              <button key={st.label} type="button" aria-pressed={on} className="crb-btn" onClick={() => setStance(i)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, padding: '0 10px', borderRadius: 10,
                  cursor: 'pointer', font: 'inherit', fontSize: 13, fontWeight: 600,
                  background: on ? `${c}1f` : '#0a0f17', color: on ? c : '#c3ccd8',
                  border: `1px solid ${on ? c : '#243045'}`, boxShadow: on ? `0 0 16px ${MOODS[i].glow}` : 'none',
                }}>
                <Icon d={st.icon} /> {st.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #1c2636', background: '#0a0f17' }}>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', color: '#8794a8' }}>LAUNCH IN</span>
          <span className={urgent ? 'crb-blink-slow' : ''} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: urgent ? '#ff6b78' : '#e8edf4' }}>{fmt(left)}</span>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #1c2636', background: '#0a0f17' }}>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', color: '#8794a8' }}>HIDDEN DEFECTS</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: '#e8edf4' }}>CLASSIFIED</span>
        </div>
      </div>

      {startError && (
        <div role="alert" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ff8c97' }}>
          <Icon d={I.alert} /> {startError}
        </div>
      )}

      <motion.button type="button" onClick={onStart} disabled={loading} className="crb-btn"
        whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.985 }}
        style={{
          marginTop: 18, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, borderRadius: 12, border: 0,
          background: 'linear-gradient(180deg, #e9edf3, #a9b3c2)', color: '#0a0d12', fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, letterSpacing: '.14em',
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          boxShadow: `0 0 0 1px rgba(255,255,255,.4) inset, 0 10px 30px rgba(0,0,0,.5), 0 0 28px ${accent}55`,
        }}>
        {loading ? 'OPENING PR...' : 'ENTER REVIEW ROOM'}
        {!loading && <Icon d={I.arrow} size={18} strokeWidth={2.5} />}
      </motion.button>
    </motion.div>
  );
}

// ── Code Panel ────────────────────────────────────────────────────────────────
function CodePanel({ code, language, color, onLineClick }) {
  const lines = (code || '').split('\n');
  return (
    <div className="crb-review-code" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#05080d', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #1c2636', background: '#0a0e15', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: MONO, background: `${color}1f`, border: `1px solid ${color}55`, borderRadius: 6, padding: '3px 8px', color, fontSize: 12, fontWeight: 700 }}>{language}</span>
        <span style={{ color: '#8f9bae', fontSize: 13 }}>Read carefully. Click a line number to cite it in your review.</span>
      </div>
      <div className="crb-scroll" style={{ flex: 1, overflow: 'auto', padding: '14px 0' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: MONO, fontSize: 13 }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="crb-row">
                <td style={{ width: 52, verticalAlign: 'top', userSelect: 'none' }}>
                  <button type="button" className="crb-ln" onClick={() => onLineClick(i + 1)} aria-label={`Cite line ${i + 1}`}>{i + 1}</button>
                </td>
                <td style={{ paddingRight: 20, color: '#cfe3f5', lineHeight: 1.7, whiteSpace: 'pre', verticalAlign: 'top' }}>{line || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Review Screen ─────────────────────────────────────────────────────────────
function ReviewScreen({ session, onSubmit, submitting, submitError }) {
  const scenario = session.scenario;
  const accent   = DIFF_COLORS[scenario.difficulty] || scenario.color || '#5ad8ff';
  const [review, setReview] = useState('');
  const [timer,  setTimer]  = useState(600); // 10 min
  const taRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const issues  = useMemo(() => countIssues(review), [review]);
  const level   = issuesToLevel(issues);
  const mood    = MOODS[level];
  const urgent  = timer < 120;
  const canSend = review.trim() && !submitting;
  const ticker  = useMemo(() => buildTicker([scenario]).concat([
    { sev: '[WARN]', svc: 'deploy-bot', msg: 'waiting on reviewer approval', color: '#ffb020' },
    { sev: '[INFO]', svc: prNumber(scenario), msg: `${scenario.author?.name || 'Author'} is watching this review`, color: '#5ad8ff' },
  ]), [scenario]);

  const citeLine = n => {
    const prefix = review && !review.endsWith('\n') ? '\n\n' : review ? '\n' : '';
    const next = `${review}${prefix}Line ${n}: `;
    setReview(next);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) { ta.focus(); ta.selectionStart = ta.selectionEnd = next.length; ta.scrollTop = ta.scrollHeight; }
    });
  };

  const submit = () => canSend && onSubmit(review);

  return (
    <div style={{ height: '100vh', background: '#06080c', color: '#dfe5ee', display: 'flex', flexDirection: 'column', fontFamily: BODY, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ minHeight: 64, background: '#0a0e15', borderBottom: `1px solid ${accent}55`, boxShadow: `0 0 24px ${accent}1f`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1522', border: `1px solid ${accent}73`, boxShadow: `0 0 14px ${accent}33` }}>
            <Icon d={I.pr} size={18} color={accent} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scenario.title}</div>
            <div style={{ fontFamily: MONO, color: '#8f9bae', fontSize: 12 }}>{scenario.pr}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 10, background: urgent ? 'rgba(255,77,94,.12)' : '#070b11', border: `1px solid ${urgent ? 'rgba(255,77,94,.55)' : '#1c2636'}` }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8f9bae' }}>LAUNCH IN</span>
            <span className={urgent ? 'crb-blink' : ''} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 20, color: urgent ? '#ff6b78' : '#e8edf4', textShadow: urgent ? '0 0 12px rgba(255,77,94,.7)' : 'none' }}>{fmt(timer)}</span>
          </div>
          <button type="button" onClick={submit} disabled={!canSend} className="crb-btn crb-hide-sm"
            style={{
              height: 44, padding: '0 18px', borderRadius: 10, border: 0, fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '.1em', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: canSend ? 'linear-gradient(180deg, #e9edf3, #a9b3c2)' : '#141b27',
              color: canSend ? '#0a0d12' : '#5a6880', cursor: canSend ? 'pointer' : 'not-allowed',
            }}>
            {submitting ? 'GRADING...' : 'SUBMIT REVIEW'} {!submitting && <Icon d={I.arrow} />}
          </button>
        </div>
      </div>

      <Ticker items={ticker} />

      {/* Body */}
      <div className="crb-review-body" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <CodePanel code={scenario.code} language={scenario.language} color={scenario.color || accent} onLineClick={citeLine} />

        <div className="crb-review-side" style={{ width: 380, borderLeft: '1px solid #1c2636', display: 'flex', flexDirection: 'column', flexShrink: 0, background: '#080b11', minHeight: 0 }}>
          {/* Author reacting live */}
          <div style={{ padding: 16, borderBottom: '1px solid #1c2636', background: 'linear-gradient(180deg,#0d131d,#090c12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <div className="crb-glow" style={{ position: 'absolute', inset: -6, borderRadius: '50%', background: `radial-gradient(circle, ${mood.glow}, transparent 68%)` }} />
                <div style={{ position: 'relative' }}><AuthorPortrait author={scenario.author} level={level} size={84} glow /></div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18 }}>{scenario.author?.name}</span>
                <span style={{ fontSize: 12, color: '#8f9bae' }}>{scenario.author?.role}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '.16em', color: mood.color }}>
                  <span className="crb-blink-slow" style={{ width: 7, height: 7, borderRadius: '50%', background: mood.color }} />{mood.label.toUpperCase()}
                </span>
                <MoodMeter level={level} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}><SpeechBubble>{quoteFor(scenario.author, level)}</SpeechBubble></div>
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, letterSpacing: '.14em', color: '#8794a8', minHeight: 24 }}>PR CONTEXT</summary>
              <p style={{ color: '#b9c3d1', fontSize: 13, lineHeight: 1.6, margin: '8px 0 0' }}>{scenario.description}</p>
            </details>
          </div>

          {/* Review */}
          <div style={{ flex: 1, minHeight: 260, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.18em', fontSize: 12, color: '#95a1b3' }}>
                <Icon d={I.pen} size={14} /> YOUR REVIEW
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, color: issues ? mood.color : '#5a6880' }}>{issues} issue{issues === 1 ? '' : 's'} raised</span>
            </div>
            <div style={{ color: '#8794a8', fontSize: 13, lineHeight: 1.55 }}>
              For each issue: what is wrong, which line, and why it matters. The author will push back, so be specific.
            </div>
            <label htmlFor="crb-review" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Your review</label>
            <textarea
              id="crb-review" ref={taRef} value={review} onChange={e => setReview(e.target.value)}
              placeholder={'Example:\n\nLine 6: SQL injection. The username is interpolated straight into the query, so an attacker can pass \' OR \'1\'=\'1 and bypass auth.\n\nLine 15: Plain text password comparison. Store and compare hashes with bcrypt or argon2.'}
              className="crb-scroll"
              style={{
                flex: 1, minHeight: 180, background: '#05080d', borderRadius: 12, padding: '12px 14px', color: '#e8edf4', fontSize: 14, fontFamily: BODY,
                lineHeight: 1.65, outline: 'none', resize: 'none',
                border: `1px solid ${review.trim() ? `${mood.color}88` : '#1c2636'}`,
                boxShadow: review.trim() ? `0 0 18px ${mood.glow}` : 'none',
                transition: 'border-color .2s ease, box-shadow .2s ease',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5a6880', fontSize: 12 }}>
              <span>{review.length} chars</span>
              <span>Blank line between issues</span>
            </div>
            {submitError && (
              <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ff8c97' }}><Icon d={I.alert} /> {submitError}</div>
            )}
            <button type="button" onClick={submit} disabled={!canSend} className="crb-btn"
              style={{
                minHeight: 50, borderRadius: 12, border: 0, fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '.12em', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: canSend ? 'linear-gradient(180deg, #e9edf3, #a9b3c2)' : '#141b27',
                color: canSend ? '#0a0d12' : '#5a6880', cursor: canSend ? 'pointer' : 'not-allowed',
                boxShadow: canSend ? `0 0 24px ${mood.glow}` : 'none',
              }}>
              {submitting ? 'GRADING...' : 'SUBMIT REVIEW'} {!submitting && <Icon d={I.arrow} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function BugRow({ b, caught }) {
  const c = caught ? '#3ddc97' : '#ff4d5e';
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      style={{ background: `${c}0d`, border: `1px solid ${c}33`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${c}1f`, flexShrink: 0 }}>
        <Icon d={caught ? I.check : I.cross} size={15} color={c} strokeWidth={2.5} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <span style={{ background: `${SEV_COLORS[b.severity] || '#8f9bae'}22`, color: SEV_COLORS[b.severity] || '#8f9bae', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: DISPLAY, letterSpacing: '.08em' }}>{b.severity}</span>
          <span style={{ fontFamily: MONO, color: '#8f9bae', fontSize: 12 }}>Line {b.line} · {b.type}</span>
        </div>
        <div style={{ color: '#c3ccd8', fontSize: 14, lineHeight: 1.55 }}>{b.description}</div>
      </div>
    </motion.div>
  );
}

function ResultScreen({ result, session, onRedo, onHome }) {
  const scenario   = session.scenario;
  const accent     = DIFF_COLORS[scenario.difficulty] || scenario.color || '#5ad8ff';
  const pct        = result.score || 0;
  const gradeColor = pct >= 80 ? '#3ddc97' : pct >= 60 ? '#a78bfa' : pct >= 40 ? '#ffb020' : '#ff4d5e';
  const grade      = pct >= 80 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'D';
  const verdict    = pct >= 80 ? 'LAUNCH SAVED' : pct >= 60 ? 'MOSTLY CONTAINED' : pct >= 40 ? 'BUGS SLIPPED THROUGH' : 'INCIDENT IN PRODUCTION';
  // Author reaction: the harder you hit, the more rattled they are
  const reaction   = pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 40 ? 1 : 0;
  const caught     = result.caughtBugs || [];
  const missed     = result.missedBugs || [];
  const [showAll, setShowAll] = useState(false);
  const xpEarned   = pct > 0 ? Math.round(pct * 0.2) : 0;

  return (
    <div style={{ ...shellStyle, padding: '40px 16px' }}>
      <div style={{ position: 'absolute', left: '50%', top: -200, width: 1100, height: 700, marginLeft: -550, background: `radial-gradient(ellipse at 50% 40%, ${gradeColor}22, transparent 65%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', maxWidth: 720, margin: '0 auto', background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${accent}55`, borderRadius: 22, padding: 'clamp(20px, 4vw, 34px)', boxShadow: `0 0 50px ${accent}22, 0 40px 80px rgba(0,0,0,.6)` }}>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, border: `1px solid ${gradeColor}66`, background: `${gradeColor}14`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '.2em', color: gradeColor }}>
            <span className="crb-blink-slow" style={{ width: 7, height: 7, borderRadius: '50%', background: gradeColor }} />{verdict}
          </div>
          <h2 className="crb-silver" style={{ margin: '12px 0 4px', fontFamily: DISPLAY, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '.04em' }}>REVIEW COMPLETE</h2>
          <p style={{ fontFamily: MONO, color: '#8f9bae', margin: 0, fontSize: 13 }}>{scenario.title} · {scenario.pr}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 24 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
            style={{ width: 104, height: 104, borderRadius: '50%', background: `${gradeColor}18`, border: `3px solid ${gradeColor}`, boxShadow: `0 0 30px ${gradeColor}55, inset 0 0 20px ${gradeColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ color: gradeColor, fontFamily: DISPLAY, fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{grade}</span>
            <span style={{ color: gradeColor, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{pct}%</span>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(88px, 1fr))', gap: 8 }}>
            {[
              { label: 'CAUGHT',    value: `${caught.length}/${caught.length + missed.length}`, color: '#3ddc97' },
              { label: 'MISSED',    value: missed.length,              color: '#ff4d5e' },
              { label: 'FALSE POS', value: result.falsePosCount || 0,  color: '#ffb020' },
            ].map(s => (
              <div key={s.label} style={{ background: '#070b11', border: '1px solid #1c2636', borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ color: s.color, fontFamily: MONO, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: '#8794a8', fontSize: 11, letterSpacing: '.12em', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {xpEarned > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 20, fontFamily: MONO, fontWeight: 700, fontSize: 15, color: '#c4b5fd' }}>+{xpEarned} XP</div>
        )}

        {result.summary && (
          <div style={{ background: '#0a0f17', border: '1px solid #1f2a3c', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#95a1b3', fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '.18em', marginBottom: 6 }}>
              <Icon d={I.chart} size={14} /> ASSESSMENT
            </div>
            <div style={{ color: '#d3dae4', fontSize: 14, lineHeight: 1.65 }}>{result.summary}</div>
          </div>
        )}

        {result.authorResponse && (
          <div style={{ background: `${MOODS[reaction].color}0a`, border: `1px solid ${MOODS[reaction].color}33`, borderRadius: 14, padding: 16, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <AuthorPortrait author={scenario.author} level={reaction} size={64} glow />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#e8edf4', fontSize: 14, fontWeight: 600 }}>{scenario.author?.name} responded</span>
                <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: MOODS[reaction].color }}>{MOODS[reaction].label.toUpperCase()}</span>
              </div>
              <div style={{ color: '#b9c3d1', fontSize: 14, lineHeight: 1.65, fontStyle: 'italic' }}>"{result.authorResponse}"</div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <span style={{ fontFamily: DISPLAY, color: '#95a1b3', fontSize: 12, fontWeight: 700, letterSpacing: '.18em' }}>BUG BREAKDOWN</span>
            {missed.length > 0 && (
              <button type="button" className="crb-btn" onClick={() => setShowAll(s => !s)}
                style={{ minHeight: 36, padding: '0 12px', borderRadius: 8, background: '#0a0f17', border: '1px solid #243045', color: '#c3ccd8', fontSize: 12, cursor: 'pointer' }}>
                {showAll ? 'Show caught only' : `Reveal ${missed.length} missed`}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {caught.map(b => <BugRow key={b.id} b={b} caught />)}
            {showAll && missed.map(b => <BugRow key={b.id} b={b} caught={false} />)}
            {caught.length === 0 && !showAll && (
              <div style={{ color: '#8794a8', fontSize: 14, padding: '10px 2px' }}>No bugs caught this time. Reveal the missed ones to see what slipped through.</div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="crb-btn" onClick={onRedo}
            style={{ flex: '1 1 200px', minHeight: 50, background: '#0c1119', border: '1px solid #243045', borderRadius: 12, color: '#c9d1dc', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Review another PR
          </button>
          <button type="button" className="crb-btn" onClick={onHome}
            style={{ flex: '1 1 200px', minHeight: 50, background: 'linear-gradient(180deg, #e9edf3, #a9b3c2)', border: 0, borderRadius: 12, color: '#0a0d12', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 14, fontWeight: 800, letterSpacing: '.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            BACK TO WORLD <Icon d={I.arrow} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CodeReviewBattle({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,       setPhase]       = useState('select');
  const [session,     setSession]     = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [startError,  setStartError]  = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Load fonts once
  useEffect(() => {
    if (document.querySelector('link[data-crb-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-crb-fonts', '1');
    document.head.appendChild(link);
  }, []);

  const startReview = async (scenarioId) => {
    setLoading(true);
    setStartError(null);
    try {
      const res = await axios.post(`${API_BASE}/code-review/start`, { userId: user?.uid, scenarioId });
      if (!res.data.success) throw new Error(res.data.error);
      setSession(res.data);
      setPhase('review');
    } catch (e) {
      console.error(e);
      setStartError('Could not open this PR. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (review) => {
    if (!session?.sessionId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await axios.post(`${API_BASE}/code-review/${session.sessionId}/submit`, { userId: user?.uid, review });
      if (res.data.success) {
        setResult(res.data);
        setPhase('result');
        if (setUserData && res.data.score > 0) {
          const xp = Math.round(res.data.score * 0.2);
          setUserData(prev => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + xp }));
        }
      } else {
        setSubmitError('Grading failed. Your review is still here, so try again.');
      }
    } catch (e) {
      console.error(e);
      setSubmitError('Grading failed. Your review is still here, so try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setPhase('select'); setSession(null); setResult(null); setSubmitError(null); };

  let screen;
  if (phase === 'select') {
    screen = <ScenarioSelector onStart={startReview} loading={loading} startError={startError} onBack={() => navigate('/world')} />;
  } else if (phase === 'review' && session) {
    screen = <ReviewScreen session={session} onSubmit={submitReview} submitting={submitting} submitError={submitError} />;
  } else if (phase === 'result' && result) {
    screen = <ResultScreen result={result} session={session} onRedo={reset} onHome={() => navigate('/world')} />;
  } else {
    screen = (
      <div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="crb-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em' }}>LOADING...</span>
      </div>
    );
  }

  return (
    <>
      <style>{STYLE}</style>
      {screen}
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Team member display data (mirrors backend ids) ────────────────────────────
// Backend can override any of strengths / weaknesses / stats per member later.
const TEAM_MEMBERS = {
  maya: {
    id: 'maya', name: 'Maya Chen', role: 'Tech Lead', cls: 'Strategist', color: '#b18cff',
    look: { skin: '#e2b089', hair: '#1c120c', shirt: '#4c3a7a', style: 'bun', glasses: false },
    strengths:  ['Breaks big problems into safe steps', 'Mentors without taking over'],
    weaknesses: ['Over-engineers when stakes are high', 'Slow to commit without data'],
    stats: [['Architecture', 9], ['Delivery', 6], ['Communication', 8]],
  },
  raj: {
    id: 'raj', name: 'Raj Patel', role: 'Senior Engineer', cls: 'Tank', color: '#5ab0ff',
    look: { skin: '#a8714f', hair: '#1c120c', shirt: '#2f4b7c', style: 'side', glasses: true },
    strengths:  ['Database tuning and query plans', 'Calm during incidents'],
    weaknesses: ['Resists rewrites and new tooling', 'Rarely documents his fixes'],
    stats: [['Architecture', 8], ['Delivery', 8], ['Communication', 5]],
  },
  alex: {
    id: 'alex', name: 'Alex Kim', role: 'Junior Dev', cls: 'Apprentice', color: '#3ddc97',
    look: { skin: '#f1c7a3', hair: '#2a2a35', shirt: '#2c5f6b', style: 'spiky', glasses: false },
    strengths:  ['Ships small features fast', 'Eager to learn and pair'],
    weaknesses: ['Skips tests under deadline', 'Too shy to flag blockers early'],
    stats: [['Architecture', 4], ['Delivery', 7], ['Communication', 6]],
  },
  jordan: {
    id: 'jordan', name: 'Jordan Mills', role: 'Product Manager', cls: 'Bard', color: '#ffb020',
    look: { skin: '#d9a77c', hair: '#4a2f1d', shirt: '#7a4a2a', style: 'bob', glasses: false },
    strengths:  ['Turns business goals into scope', 'Shields the team from stakeholders'],
    weaknesses: ['Commits to dates too early', 'Struggles to say no to clients'],
    stats: [['Architecture', 3], ['Delivery', 6], ['Communication', 9]],
  },
  priya: {
    id: 'priya', name: 'Priya Nair', role: 'SRE / DevOps', cls: 'Guardian', color: '#ff7a59',
    look: { skin: '#7d4f35', hair: '#1c120c', shirt: '#5a3a3a', style: 'side', glasses: false },
    strengths:  ['Observability and alerting', 'Capacity planning'],
    weaknesses: ['Blunt in code reviews', 'Running on fumes after on-call'],
    stats: [['Architecture', 6], ['Delivery', 7], ['Communication', 5]],
  },
};

// ── Theme ─────────────────────────────────────────────────────────────────────
const DIFF_COLORS = { Easy: '#3ddc97', Medium: '#ffb020', Hard: '#ff4d5e' };
const DISPLAY = "'Oxanium', sans-serif";
const BODY    = "'IBM Plex Sans', system-ui, sans-serif";
const MONO    = "'JetBrains Mono', ui-monospace, monospace";
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Oxanium:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap';

const STYLE = `
.ts-silver{background:linear-gradient(180deg,#ffffff 0%,#e3e8ef 42%,#8e98a8 52%,#d9dfe8 72%,#f4f6f9 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes tsBlink{0%,49%{opacity:1}50%,100%{opacity:.15}}
@keyframes tsAlert{0%,100%{box-shadow:0 0 0 1px rgba(255,77,94,.35),0 0 18px rgba(255,77,94,.18),0 18px 30px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 1px rgba(255,77,94,.75),0 0 34px rgba(255,77,94,.42),0 18px 30px rgba(0,0,0,.5)}}
@keyframes tsHazard{to{background-position:28px 0}}
@keyframes tsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes tsSpin{to{transform:rotateX(70deg) rotateZ(360deg)}}
@keyframes tsSweep{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
@keyframes tsShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.ts-blink{animation:tsBlink 1s steps(1) infinite}
.ts-blink-slow{animation:tsBlink 1.6s steps(1) infinite}
.ts-alert{animation:tsAlert 1.4s ease-in-out infinite}
.ts-hazard{animation:tsHazard 1.2s linear infinite}
.ts-float{animation:tsFloat 3.6s ease-in-out infinite}
.ts-ring{animation:tsSpin 14s linear infinite}
.ts-sweep{animation:tsSweep 3.4s ease-in-out infinite}
.ts-skel{background:linear-gradient(90deg,#0d131d 0,#162030 50%,#0d131d 100%);background-size:800px 100%;animation:tsShimmer 1.4s linear infinite}
.ts-card{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .3s ease}
.ts-btn{transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,color .15s ease}
.ts-card:focus-visible,.ts-btn:focus-visible{outline:2px solid #5ad8ff;outline-offset:3px}
.ts-dossier:hover{background:#0e1520}
.ts-scroll{scrollbar-width:thin;scrollbar-color:#243045 transparent}
@media (max-width:900px){
  .ts-desk{transform:none !important}
  .ts-hide-sm{display:none !important}
  .ts-sim-body{flex-direction:column !important;overflow-y:auto}
  .ts-sim-side{width:100% !important;border-right:0 !important;border-bottom:1px solid #172131;max-height:none !important}
  .ts-sim-chat{min-height:70vh}
}
@media (prefers-reduced-motion:reduce){.ts-blink,.ts-blink-slow,.ts-alert,.ts-hazard,.ts-float,.ts-ring,.ts-sweep,.ts-skel{animation:none}}
`;

const MOODS = [
  { color: '#3ddc97', glow: 'rgba(61,220,151,.35)' },
  { color: '#5ad8ff', glow: 'rgba(90,216,255,.35)' },
  { color: '#ffb020', glow: 'rgba(255,176,32,.38)' },
  { color: '#ff4d5e', glow: 'rgba(255,77,94,.45)'  },
];

const TIERS = {
  crisis:    { label: 'CRISIS',    color: '#ff4d5e', stakes: 1.4, base: { health: 40, debt: 55, budget: 68 },
               icon: 'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z' },
  blueprint: { label: 'BLUEPRINT', color: '#6cb6ff', stakes: 1.0, base: { health: 66, debt: 76, budget: 50 },
               icon: 'M3 3h18v18H3z M3 9h18 M9 9v12' },
  launch:    { label: 'LAUNCH',    color: '#b18cff', stakes: 1.1, base: { health: 78, debt: 34, budget: 30 },
               icon: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2 M9 12a13 13 0 0 1 11-9 13 13 0 0 1-9 11z M9 12l3 3 M15 9h.01' },
  training:  { label: 'TRAINING',  color: '#3ddc97', stakes: 0.5, base: { health: 84, debt: 46, budget: 22 },
               icon: 'M2 9l10-5 10 5-10 5z M6 11v5c3 2 9 2 12 0v-5' },
};

// Default emotional state per tier. Backend can send scenario.teamMoods = { id: { level, label, note } }.
const DEFAULT_MOODS = {
  crisis: {
    maya:   [2, 'Under pressure', 'Torn between a quick patch and a real fix. Needs you to make the call.'],
    raj:    [2, 'Under fire', 'Deep in slow query logs and short on patience.'],
    alex:   [2, 'Rattled', 'Wants to help but is afraid of breaking something worse.'],
    jordan: [3, 'Panicking', 'Has stakeholders asking for an ETA every ten minutes.'],
    priya:  [3, 'Exhausted', 'Paged all night. One more alert and morale breaks.'],
  },
  blueprint: {
    maya:   [1, 'Opinionated', 'Has a strong view and will challenge weak arguments.'],
    raj:    [2, 'Defensive', 'Built a lot of the current system. Criticism lands personally.'],
    alex:   [0, 'Curious', 'Wants to understand the trade-offs before picking a side.'],
    jordan: [1, 'Skeptical', 'Worried the roadmap stalls with nothing to demo.'],
    priya:  [1, 'Wary', 'Thinking about what this does to on-call and deploys.'],
  },
  launch: {
    maya:   [0, 'Energized', 'Sketching the design on every whiteboard in reach.'],
    raj:    [1, 'Cautious', 'Wants guardrails in place before day one.'],
    alex:   [0, 'Eager', 'Already has part of it prototyped.'],
    jordan: [0, 'Optimistic', 'Promised leadership a beta and believes in the team.'],
    priya:  [1, 'Watchful', 'Asking how this gets monitored before it ships.'],
  },
  training: {
    maya:   [0, 'Patient', 'Happy to explain anything twice. Watches how you ask.'],
    raj:    [0, 'Helpful', 'Will pair with you if you show your reasoning first.'],
    alex:   [0, 'Friendly', 'Remembers their own first week and wants yours to go better.'],
    jordan: [0, 'Welcoming', 'Wants you to understand why the work matters.'],
    priya:  [0, 'Relaxed', 'Nothing is on fire. A good week to learn the stack.'],
  },
};

const POSTURES = {
  cautious:   { label: 'Cautious',   health: 12, debt: -6, budget: 9,  morale: 6,   note: 'Slow down, add safeguards, protect the team. Costs more, breaks less.' },
  balanced:   { label: 'Balanced',   health: 6,  debt: 2,  budget: 4,  morale: 0,   note: 'Steady trade-offs. Fix what matters, defer what does not.' },
  aggressive: { label: 'Aggressive', health: -8, debt: 14, budget: -3, morale: -12, note: 'Ship fast, cut corners. Cheap today, expensive next quarter.' },
};

const TAG_COLORS = ['#ff5ea8', '#5ad8ff', '#ffb020', '#3ddc97', '#b18cff', '#ff7a59', '#7cf0e0'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function alpha(hex, a) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex || 'transparent';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function hashStr(s = '') {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const tagColor = label => TAG_COLORS[hashStr(label) % TAG_COLORS.length];
const initials = name => (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2);

function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function tierOf(s) {
  if (s?.tier && TIERS[s.tier]) return s.tier;
  const t = `${s?.title || ''} ${s?.subtitle || ''}`.toLowerCase();
  if (/crisis|crunch|outage|incident|deadline|fire|viral/.test(t)) return 'crisis';
  if (/onboard|first week|new joiner|first ticket/.test(t) || s?.difficulty === 'Easy') return 'training';
  if (/zero to|launch|new feature|greenfield|ship/.test(t)) return 'launch';
  if (/architect|refactor|legacy|monolith|microservice|design|debt/.test(t)) return 'blueprint';
  return 'launch';
}

function tagsOf(s) {
  if (Array.isArray(s?.tags)) return s.tags;
  return String(s?.subtitle || '').split(/[·|•,]/).map(x => x.trim()).filter(Boolean);
}

function moodFor(s, id) {
  const m = s?.teamMoods?.[id];
  if (m) return { level: Math.max(0, Math.min(3, m.level ?? 0)), label: m.label || 'Ready', note: m.note || '' };
  const d = DEFAULT_MOODS[tierOf(s)]?.[id] || [0, 'Ready', ''];
  return { level: d[0], label: d[1], note: d[2] };
}

function memberOf(idOrObj) {
  if (!idOrObj) return null;
  if (typeof idOrObj === 'string') return TEAM_MEMBERS[idOrObj] || null;
  return TEAM_MEMBERS[idOrObj.id] || { cls: 'Specialist', color: '#8f9bae', look: null, strengths: [], weaknesses: [], stats: [], ...idOrObj };
}

// ── Icons + portraits ─────────────────────────────────────────────────────────
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
  team:   'M9 11a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4z M17 12a2.6 2.6 0 1 0 0-5.2a2.6 2.6 0 0 0 0 5.2z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M15 14.5c3 0 6 2 6 5.5',
  clock:  'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M12 7v5l3 2',
  arrow:  'M5 12h14 M13 6l6 6-6 6',
  chev:   'M6 9l6 6 6-6',
  plus:   'M12 5v14 M5 12h14',
  minus:  'M5 12h14',
  alert:  'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z',
  target: 'M12 21a9 9 0 1 0 0-18a9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M12 12h.01',
  doc:    'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  bolt:   'M13 2L4 14h7l-1 8 9-12h-7z',
  send:   'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
  chart:  'M4 20V11 M10 20V5 M16 20v-6 M21 20H3',
  chat:   'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
};

const BROWS = [
  ['M43 48 Q50 44 56 47', 'M64 47 Q70 44 77 48'],
  ['M43 48 L56 48',       'M64 46 Q70 40 77 44'],
  ['M44 46 L56 49',       'M64 49 L76 46'],
  ['M43 43 L57 50',       'M63 50 L77 43'],
];
const MOUTHS = ['M51 69 Q60 76 69 69', 'M52 71 Q62 72 69 68', 'M51 73 Q60 67 69 73', 'M50 71 Q60 63 70 71 Q60 81 50 71 Z'];
const HAIR = {
  spiky: 'M32 52 C30 30 44 24 60 24 C76 24 90 30 88 52 L84 42 L78 47 L72 38 L64 45 L58 36 L50 45 L44 38 L38 47 Z',
  bob:   'M30 66 C26 34 44 24 60 24 C78 24 94 34 90 66 C86 58 86 48 80 42 C70 48 50 48 40 42 C34 48 34 58 30 66 Z',
  side:  'M33 50 C32 30 46 25 62 25 C78 25 89 32 88 50 C84 40 72 36 58 37 C48 37 39 41 33 50 Z',
  bun:   'M32 54 C30 32 44 25 60 25 C76 25 90 32 88 54 C84 44 72 38 60 38 C48 38 36 44 32 54 Z',
};

function Portrait({ member, level = 0, size = 48, ring = true, glow = false }) {
  const lk  = member?.look || { skin: '#d9a77c', hair: '#2b1d14', shirt: '#2f4b7c', style: 'side', glasses: false };
  const lvl = Math.max(0, Math.min(3, level));
  const c   = member?.color || '#8f9bae';
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={member?.name || 'Teammate'}
      style={{ flexShrink: 0, borderRadius: '50%', boxShadow: ring ? `0 0 0 2px #070a10, 0 0 0 ${size > 60 ? 4 : 3}px ${c}${glow ? `, 0 0 22px ${alpha(c, 0.45)}` : ''}` : 'none' }}>
      <circle cx="60" cy="60" r="60" fill="#0f1726" />
      <path d="M18 120 C20 98 38 88 60 88 C82 88 100 98 102 120 Z" fill={lk.shirt} />
      <rect x="53" y="78" width="14" height="12" fill={lk.skin} />
      {lk.style === 'bun' && <circle cx="60" cy="22" r="9" fill={lk.hair} />}
      <circle cx="60" cy="56" r="28" fill={lk.skin} />
      <path d={HAIR[lk.style] || HAIR.side} fill={lk.hair} />
      <ellipse cx="46" cy="66" rx="6" ry="3.5" fill="#ff5a6a" opacity={[0, 0, 0.35, 0.8][lvl]} />
      <ellipse cx="74" cy="66" rx="6" ry="3.5" fill="#ff5a6a" opacity={[0, 0, 0.35, 0.8][lvl]} />
      <ellipse cx="50" cy="57" rx="3" ry={[3.2, 3, 2.6, 2][lvl]} fill="#121826" />
      <ellipse cx="70" cy="57" rx="3" ry={[3.2, 3, 2.6, 2][lvl]} fill="#121826" />
      {lk.glasses && (
        <g fill="none" stroke="#cfd6e0" strokeWidth="2"><circle cx="50" cy="57" r="7" /><circle cx="70" cy="57" r="7" /><path d="M57 57h6" /></g>
      )}
      <path d={BROWS[lvl][0]} stroke={lk.hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={BROWS[lvl][1]} stroke={lk.hair} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d={MOUTHS[lvl]} stroke="#4a2420" strokeWidth="2.5" fill={lvl === 3 ? '#3a1414' : 'none'} strokeLinecap="round" strokeLinejoin="round" />
      {lvl >= 2 && <path d="M86 40 C90 46 90 50 86 52 C82 50 82 46 86 40 Z" fill="#7dd3fc" />}
    </svg>
  );
}

function ClassPill({ member }) {
  const c = member.color;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${c}`, background: alpha(c, 0.12), color: c, fontFamily: DISPLAY, fontWeight: 700, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', boxShadow: `0 0 10px ${alpha(c, 0.35)}`, whiteSpace: 'nowrap' }}>
      {member.cls}
    </span>
  );
}

function MoodChip({ mood }) {
  const c = MOODS[mood.level].color;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: c, whiteSpace: 'nowrap' }}>
      <span className={mood.level === 3 ? 'ts-blink' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{mood.label}
    </span>
  );
}

const shell = { minHeight: '100vh', background: '#05070b', color: '#dfe5ee', fontFamily: BODY, position: 'relative', overflowX: 'hidden' };
const sectionLabel = { fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em', fontSize: 12, color: '#95a1b3' };

// ── Scenario Selector (Command Center) ────────────────────────────────────────
function ScenarioSelector({ onStart, loading, error, onBack }) {
  const [scenarios,    setScenarios]    = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError,   setFetchError]   = useState(false);
  const [posture,      setPosture]      = useState('balanced');
  const [open,         setOpen]         = useState({});
  const [tick,         setTick]         = useState(0);

  const load = () => {
    setFetchLoading(true);
    setFetchError(false);
    axios.get(`${API_BASE}/team-sim/scenarios`)
      .then(r => {
        const list = r.data.scenarios || [];
        setScenarios(list);
        if (list[0]) {
          setSelected(cur => cur || list[0].id);
          const first = (list[0].teamComposition || [])[0];
          if (first) setOpen({ [first]: true });
        }
        setFetchLoading(false);
      })
      .catch(() => { setFetchError(true); setFetchLoading(false); });
  };
  useEffect(load, []);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1500);
    return () => clearInterval(id);
  }, []);

  const pick = s => {
    setSelected(s.id);
    const first = (s.teamComposition || [])[0];
    setOpen(first ? { [first]: true } : {});
  };

  const sel = scenarios.find(s => s.id === selected) || null;

  return (
    <div style={shell}>
      <div style={{ position: 'absolute', left: '50%', top: -280, width: 1500, height: 820, marginLeft: -750, background: 'radial-gradient(ellipse at 50% 40%, rgba(108,182,255,.11), rgba(177,140,255,.06) 45%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Command bar */}
      <div style={{ position: 'relative', zIndex: 3, borderBottom: '1px solid #141c29', background: 'rgba(8,11,17,.85)' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', padding: '18px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button type="button" className="ts-btn" onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #243045', background: '#0c1119', color: '#c9d1dc', fontSize: 14, cursor: 'pointer' }}>
              <Icon d={I.back} /> Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(177,140,255,.5)', background: '#100c1c', boxShadow: '0 0 20px rgba(177,140,255,.3)' }}>
                <Icon d={I.team} size={24} color="#b18cff" />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <h1 className="ts-silver" style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(26px, 3.4vw, 40px)', letterSpacing: '.05em', lineHeight: 1 }}>TEAM SIMULATION</h1>
                <span style={{ fontSize: 14, color: '#95a1b3' }}>Work with an AI-powered engineering team. Real decisions. Real dynamics. Real feedback.</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(61,220,151,.4)', background: '#0a1310' }}>
              <span className="ts-blink-slow" style={{ width: 8, height: 8, borderRadius: '50%', background: '#3ddc97', boxShadow: '0 0 10px #3ddc97' }} />
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '.14em', color: '#3ddc97' }}>SIM CORE ONLINE</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid #1c2636', background: '#0b1018' }}>
              <span style={{ fontSize: 12, letterSpacing: '.14em', color: '#8794a8' }}>AGENTS READY</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: '#e8edf4' }}>{Object.keys(TEAM_MEMBERS).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Split screen */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '28px 24px 56px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

        {/* Left: mission terminal */}
        <div style={{ flex: '999 1 600px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, padding: '0 4px' }}>
            <span style={{ ...sectionLabel, fontSize: 13 }}>SELECT MISSION</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#95a1b3' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="ts-blink" style={{ width: 8, height: 8, borderRadius: 2, background: '#ff4d5e' }} />Crisis</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, border: '1px dashed #6cb6ff' }} />Blueprint</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#b18cff' }} />Launch</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#3ddc97' }} />Training</span>
            </div>
          </div>

          <div style={{ position: 'relative', borderRadius: 22, border: '1px solid #172131', background: 'linear-gradient(180deg, #0a0f17, #06090e)', padding: '24px 20px 30px', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 40px 80px rgba(0,0,0,.55)' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', perspective: 500, pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: '-40%', right: '-40%', top: 0, bottom: -120, transform: 'rotateX(70deg)', transformOrigin: '50% 0', backgroundImage: 'linear-gradient(rgba(108,182,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(108,182,255,.12) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'linear-gradient(to bottom, transparent, #000 40%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 40%)' }} />
            </div>

            {fetchLoading && (
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
                {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="ts-skel" style={{ height: 300, borderRadius: 16 }} />)}
              </div>
            )}

            {!fetchLoading && fetchError && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#ff8c97' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}><Icon d={I.alert} size={18} /> Could not load missions.</div>
                <div>
                  <button type="button" className="ts-btn" onClick={load}
                    style={{ marginTop: 14, height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(255,77,94,.5)', background: 'rgba(255,77,94,.12)', color: '#ff8c97', fontWeight: 600, cursor: 'pointer' }}>
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!fetchLoading && !fetchError && scenarios.length === 0 && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#95a1b3' }}>
                <div className="ts-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, marginBottom: 6 }}>No missions available</div>
                Check back soon for new team scenarios.
              </div>
            )}

            {!fetchLoading && !fetchError && scenarios.length > 0 && (
              <div style={{ perspective: 1600, position: 'relative' }}>
                <div className="ts-desk" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, transform: 'rotateX(8deg)', transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}>
                  {scenarios.map((s, i) => (
                    <MissionCard key={s.id} s={s} index={i} isSel={selected === s.id} onPick={() => pick(s)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: command center */}
        <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sel ? (
            <CommandCenter s={sel} posture={posture} setPosture={setPosture} open={open} setOpen={setOpen} tick={tick}
              loading={loading} error={error} onStart={() => onStart(sel.id)} />
          ) : (
            <div style={{ borderRadius: 20, border: '1px dashed #243045', background: '#090d14', padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #243045', background: '#0d131d' }}>
                <Icon d={I.doc} size={28} color="#5a6880" />
              </span>
              <span className="ts-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 20 }}>AWAITING MISSION</span>
              <span style={{ fontSize: 14, color: '#95a1b3', maxWidth: 300 }}>Pick a scenario to brief your squad and preview its impact.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MissionCard({ s, index, isSel, onPick }) {
  const tierKey = tierOf(s);
  const t   = TIERS[tierKey];
  const dc  = DIFF_COLORS[s.difficulty] || '#8f9bae';
  const squad = (s.teamComposition || []).map(memberOf).filter(Boolean);

  const skins = {
    crisis:    { background: 'radial-gradient(120% 80% at 0% 0%,rgba(255,77,94,.16),transparent 55%),#110a0e', border: '1px solid rgba(255,77,94,.6)' },
    blueprint: { backgroundColor: '#08162a', backgroundImage: 'linear-gradient(rgba(108,182,255,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(108,182,255,.10) 1px,transparent 1px)', backgroundSize: '22px 22px', border: '1px dashed rgba(120,190,255,.6)' },
    launch:    { background: 'linear-gradient(160deg,#130f22,#0a0d16 60%)', border: '1px solid rgba(177,140,255,.5)' },
    training:  { background: 'linear-gradient(160deg,#0b1a15,#090f12 60%)', border: '1px solid rgba(61,220,151,.5)' },
  };

  return (
    <motion.button
      type="button" aria-pressed={isSel} onClick={onPick}
      className={`ts-card ${tierKey === 'crisis' && !isSel ? 'ts-alert' : ''}`}
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      style={{
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 16,
        cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left', minHeight: 300,
        ...skins[tierKey],
        transform: isSel ? 'translateZ(44px) rotateX(-8deg)' : 'translateZ(0)',
        boxShadow: isSel
          ? `0 0 0 2px ${t.color}, 0 0 40px ${alpha(t.color, 0.32)}, 0 30px 50px rgba(0,0,0,.65)`
          : tierKey === 'crisis' ? undefined : `0 0 22px ${alpha(t.color, 0.16)}, 0 18px 30px rgba(0,0,0,.5)`,
      }}
    >
      {tierKey === 'crisis' && (
        <span className="ts-hazard" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: 'repeating-linear-gradient(45deg, #ff4d5e 0 10px, #2a0a10 10px 20px)', backgroundSize: '28px 6px' }} />
      )}
      {tierKey === 'blueprint' && [
        { left: 8, top: 8, borderLeft: '2px solid #6cb6ff', borderTop: '2px solid #6cb6ff' },
        { right: 8, top: 8, borderRight: '2px solid #6cb6ff', borderTop: '2px solid #6cb6ff' },
        { left: 8, bottom: 8, borderLeft: '2px solid #6cb6ff', borderBottom: '2px solid #6cb6ff' },
        { right: 8, bottom: 8, borderRight: '2px solid #6cb6ff', borderBottom: '2px solid #6cb6ff' },
      ].map((pos, k) => <span key={k} style={{ position: 'absolute', width: 14, height: 14, ...pos }} />)}
      {tierKey === 'launch' && (
        <>
          <span style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 2, background: 'linear-gradient(90deg, transparent, #b18cff, #5ad8ff, transparent)' }} />
          <span className="ts-sweep" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '30%', background: 'linear-gradient(90deg, transparent, rgba(177,140,255,.08), transparent)', pointerEvents: 'none' }} />
        </>
      )}
      {tierKey === 'training' && (
        <span style={{ position: 'absolute', right: -34, top: 16, transform: 'rotate(40deg)', width: 130, textAlign: 'center', padding: '3px 0', background: '#3ddc97', color: '#04140d', fontFamily: DISPLAY, fontWeight: 800, fontSize: 10, letterSpacing: '.18em' }}>TUTORIAL</span>
      )}

      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
        <span className={tierKey === 'crisis' ? 'ts-blink' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontWeight: 800, fontSize: 11, letterSpacing: '.22em', color: t.color }}>
          <Icon d={t.icon} size={13} strokeWidth={2.4} />{t.label}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 11, color: '#8794a8' }}>SIM-{String(index + 1).padStart(2, '0')}</span>
      </span>

      <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,8,12,.7)', border: `1px solid ${alpha(t.color, 0.5)}`, boxShadow: `0 0 14px ${alpha(t.color, 0.18)}` }}>
          <Icon d={t.icon} size={22} color={t.color} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="ts-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, lineHeight: 1.15 }}>{s.title}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#95a1b3' }}>
            <span style={{ padding: '2px 9px', borderRadius: 999, border: `1px solid ${alpha(dc, 0.5)}`, background: alpha(dc, 0.12), fontFamily: DISPLAY, fontWeight: 700, fontSize: 11, letterSpacing: '.1em', color: dc, textTransform: 'uppercase' }}>{s.difficulty}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO }}><Icon d={I.clock} size={12} strokeWidth={2.2} />{s.duration} min</span>
          </span>
        </span>
      </span>

      <span style={{ fontSize: 14, lineHeight: 1.55, color: '#c2cad6', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.context}</span>

      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tagsOf(s).map(label => {
          const c = tagColor(label);
          return (
            <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${alpha(c, 0.55)}`, background: alpha(c, 0.12), color: c, fontSize: 12, fontWeight: 600, boxShadow: `0 0 12px ${alpha(c, 0.25)}` }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />{label}
            </span>
          );
        })}
      </span>

      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize: 12, letterSpacing: '.14em', color: '#8794a8' }}>SQUAD</span>
        <span style={{ display: 'flex' }}>
          {squad.map(m => (
            <span key={m.id} title={`${m.name} · ${m.role}`} style={{ width: 30, height: 30, marginLeft: -6, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1420', border: `2px solid ${m.color}`, boxShadow: `0 0 10px ${alpha(m.color, 0.4)}`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 11, color: '#f2f5f9' }}>
              {initials(m.name)}
            </span>
          ))}
        </span>
      </span>
    </motion.button>
  );
}

function CommandCenter({ s, posture, setPosture, open, setOpen, tick, loading, error, onStart }) {
  const tierKey = tierOf(s);
  const t = TIERS[tierKey];
  const squad = (s.teamComposition || []).map(memberOf).filter(Boolean).map(m => ({ ...m, mood: moodFor(s, m.id) }));

  // Forecast: scenario.forecast = { health, debt, budget } overrides tier defaults
  const base   = { ...t.base, ...(s.forecast || {}) };
  const pz     = POSTURES[posture];
  const clamp  = v => Math.max(0, Math.min(100, Math.round(v)));
  const avg    = squad.length ? squad.reduce((a, m) => a + m.mood.level, 0) / squad.length : 0;
  const jitter = Math.round(Math.sin(tick / 1.7) * 1.5);
  const rows = [
    { label: 'SYSTEM HEALTH', now: clamp(base.health + jitter), delta: pz.health, unit: '/100', up: true },
    { label: 'TECH DEBT',     now: base.debt,                   delta: pz.debt,   unit: '/100', up: false },
    { label: 'BUDGET USED',   now: base.budget,                 delta: pz.budget, unit: '%',    up: false },
    { label: 'TEAM MORALE',   now: clamp(100 - avg * 22),       delta: pz.morale, unit: '/100', up: true },
  ].map(r => {
    const fore = clamp(r.now + r.delta * t.stakes);
    const d    = fore - r.now;
    const good = r.up ? d >= 0 : d <= 0;
    const col  = d === 0 ? '#aab4c3' : good ? '#3ddc97' : '#ff6b78';
    const bar  = r.up ? (r.now < 50 ? '#ff6b78' : '#5ad8ff') : (r.now > 60 ? '#ffb020' : '#5ad8ff');
    return { ...r, fore, d, col, bar };
  });

  const toggle = id => setOpen(o => ({ ...o, [id]: !o[id] }));

  return (
    <>
      {/* Mission header + party stage */}
      <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
        style={{ position: 'relative', borderRadius: 20, border: `1px solid ${alpha(t.color, 0.5)}`, background: 'linear-gradient(180deg, #0c121c, #070a10)', overflow: 'hidden', boxShadow: `0 0 40px ${alpha(t.color, 0.18)}` }}>
        <div style={{ padding: '20px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span className={tierKey === 'crisis' ? 'ts-blink' : ''} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '.22em', color: t.color }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color, boxShadow: `0 0 10px ${t.color}` }} />{t.label} MISSION
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: '#8794a8' }}>{s.difficulty?.toUpperCase()} · {s.duration} MIN</span>
          </div>
          <h2 className="ts-silver" style={{ margin: '10px 0 6px', fontFamily: DISPLAY, fontWeight: 800, fontSize: 28, lineHeight: 1.1 }}>{s.title}</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#c2cad6' }}>{s.context}</p>
          {s.objective && (
            <div style={{ marginTop: 12, display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${alpha(t.color, 0.35)}`, background: alpha(t.color, 0.06) }}>
              <Icon d={I.target} size={16} color={t.color} style={{ marginTop: 2 }} />
              <span style={{ fontSize: 13, lineHeight: 1.55, color: '#d3dae4' }}><strong style={{ color: t.color, fontWeight: 600 }}>Objective: </strong>{s.objective}</span>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', height: 230, marginTop: 8, perspective: 700 }}>
          <div style={{ position: 'absolute', left: '6%', right: '6%', bottom: -30, height: 240, transform: 'rotateX(72deg)', borderRadius: '50%', background: `radial-gradient(ellipse, ${alpha(t.color, 0.3)}, transparent 68%)` }} />
          <div className="ts-ring" style={{ position: 'absolute', left: '50%', bottom: -60, width: 360, height: 360, marginLeft: -180, borderRadius: '50%', border: `1px dashed ${alpha(t.color, 0.5)}`, transform: 'rotateX(70deg)' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, padding: '0 12px' }}>
            {squad.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 88 }}>
                <div className="ts-float" style={{ animationDelay: `${(i * 0.5).toFixed(1)}s` }}>
                  <Portrait member={m} level={m.mood.level} size={74} glow />
                </div>
                <span style={{ width: 64, height: 12, borderRadius: '50%', background: `radial-gradient(ellipse, ${m.color}, transparent 70%)`, opacity: 0.8 }} />
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, color: '#f2f5f9', whiteSpace: 'nowrap' }}>{m.name.split(' ')[0]}</span>
                <span style={{ marginTop: -4, fontSize: 11, letterSpacing: '.12em', color: m.color, textTransform: 'uppercase' }}>{m.cls}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Impact forecast */}
      <div style={{ borderRadius: 18, border: '1px solid #172131', background: '#090d14', padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <span style={{ ...sectionLabel, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="ts-blink-slow" style={{ width: 6, height: 6, borderRadius: '50%', background: '#5ad8ff' }} />IMPACT FORECAST
          </span>
          <div role="group" aria-label="Leadership posture" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 10, border: '1px solid #1c2636', background: '#070a10' }}>
            {Object.keys(POSTURES).map(id => {
              const on = posture === id;
              return (
                <button key={id} type="button" aria-pressed={on} className="ts-btn" onClick={() => setPosture(id)}
                  style={{ minHeight: 36, padding: '0 12px', borderRadius: 7, cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600, background: on ? t.color : 'transparent', color: on ? '#06080c' : '#c3ccd8', border: `1px solid ${on ? t.color : 'transparent'}`, boxShadow: on ? `0 0 14px ${alpha(t.color, 0.35)}` : 'none' }}>
                  {POSTURES[id].label}
                </button>
              );
            })}
          </div>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: '#8f9bae' }}>{pz.note}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {rows.map(r => (
            <div key={r.label} style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #1a2433', background: '#0b1018', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 12, letterSpacing: '.12em', color: '#95a1b3' }}>{r.label}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: r.col }}>{r.d > 0 ? '+' : ''}{r.d}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: '#e8edf4' }}>{r.now}</span>
                <Icon d={I.arrow} size={14} color="#5a6880" strokeWidth={2.4} />
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 22, color: r.col, textShadow: `0 0 12px ${alpha(r.col, 0.5)}` }}>{r.fore}</span>
                <span style={{ fontSize: 12, color: '#8794a8' }}>{r.unit}</span>
              </div>
              <div style={{ position: 'relative', height: 8, borderRadius: 4, background: '#151d2a' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.now}%`, borderRadius: 4, background: r.bar, transition: 'width .6s ease' }} />
                <div style={{ position: 'absolute', top: -4, bottom: -4, width: 3, marginLeft: -1, left: `${r.fore}%`, borderRadius: 2, background: r.col, boxShadow: `0 0 8px ${r.col}`, transition: 'left .6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squad dossiers */}
      <div style={{ borderRadius: 18, border: '1px solid #172131', background: '#090d14', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 12px' }}>
          <span style={sectionLabel}>SQUAD DOSSIERS</span>
          <span style={{ fontSize: 12, color: '#8794a8' }}>Tap a member to expand</span>
        </div>
        {squad.map(m => {
          const isOpen = !!open[m.id];
          const mc = MOODS[m.mood.level].color;
          return (
            <div key={m.id} style={{ borderTop: '1px solid #141c29' }}>
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(m.id)} className="ts-btn ts-dossier"
                style={{ width: '100%', minHeight: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: 'transparent', border: 0, color: 'inherit', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                <Portrait member={m} level={m.mood.level} size={42} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: '#eef2f7' }}>{m.name}</span>
                    <ClassPill member={m} />
                  </span>
                  <span style={{ fontSize: 13, color: '#95a1b3' }}>{m.role}</span>
                </span>
                <MoodChip mood={m.mood} />
                <Icon d={I.chev} size={18} color="#8794a8" style={{ transition: 'transform .2s ease', transform: `rotate(${isOpen ? 180 : 0}deg)` }} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#3ddc97' }}>STRENGTHS</span>
                          {(m.strengths || []).map(x => (
                            <span key={x} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45, color: '#d3dae4' }}>
                              <Icon d={I.plus} size={14} color="#3ddc97" strokeWidth={2.6} style={{ marginTop: 2 }} />{x}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#ffb020' }}>WEAKNESSES</span>
                          {(m.weaknesses || []).map(x => (
                            <span key={x} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.45, color: '#d3dae4' }}>
                              <Icon d={I.minus} size={14} color="#ffb020" strokeWidth={2.6} style={{ marginTop: 2 }} />{x}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 12, border: `1px solid ${alpha(mc, 0.4)}`, background: alpha(mc, 0.07) }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#95a1b3' }}>EMOTIONAL STATE</span>
                          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '.14em', color: mc }}>{m.mood.label.toUpperCase()}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[0, 1, 2, 3].map(k => <span key={k} style={{ flex: 1, height: 6, borderRadius: 3, background: k <= m.mood.level ? mc : '#1d2636' }} />)}
                        </div>
                        {m.mood.note && <span style={{ fontSize: 13, lineHeight: 1.5, color: '#d3dae4' }}>{m.mood.note}</span>}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(m.stats || []).map(([label, value]) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 110, fontSize: 12, color: '#aab4c3' }}>{label}</span>
                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#151d2a', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${value * 10}%`, borderRadius: 3, background: m.color, boxShadow: `0 0 8px ${alpha(m.color, 0.4)}` }} />
                            </div>
                            <span style={{ width: 22, textAlign: 'right', fontFamily: MONO, fontSize: 12, color: '#e8edf4' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(255,77,94,.45)', background: 'rgba(255,77,94,.08)', color: '#ff8c97', fontSize: 13 }}>
          <Icon d={I.alert} /> {error}
        </div>
      )}

      <motion.button type="button" onClick={onStart} disabled={loading} className="ts-btn"
        whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.985 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, borderRadius: 14, border: 0,
          background: 'linear-gradient(180deg, #eef1f6, #a9b3c2)', color: '#0a0d12', fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, letterSpacing: '.14em',
          cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          boxShadow: `0 0 0 1px rgba(255,255,255,.4) inset, 0 12px 30px rgba(0,0,0,.5), 0 0 30px ${alpha(t.color, 0.25)}`,
        }}>
        {loading ? 'ASSEMBLING YOUR TEAM...' : 'DEPLOY SQUAD'}
        {!loading && <Icon d={I.arrow} size={18} strokeWidth={2.5} />}
      </motion.button>
    </>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isNew, mood }) {
  const isUser = msg.type === 'user';
  const member = !isUser && memberOf(msg.from);
  const c = member?.color || '#8f9bae';

  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', alignItems: 'flex-end', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}
    >
      {!isUser && member && <Portrait member={member} level={mood?.level ?? 0} size={36} />}

      <div style={{ maxWidth: 'min(72%, 620px)' }}>
        {!isUser && member && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, marginLeft: 2 }}>
            <span style={{ color: c, fontSize: 13, fontWeight: 600 }}>{member.name}</span>
            <span style={{ color: '#8794a8', fontSize: 12 }}>{member.role}</span>
          </div>
        )}
        <div style={{
          background: isUser ? 'linear-gradient(180deg, rgba(177,140,255,.18), rgba(177,140,255,.10))' : '#0e1520',
          border: `1px solid ${isUser ? 'rgba(177,140,255,.45)' : alpha(c, 0.3)}`,
          boxShadow: isUser ? '0 0 18px rgba(177,140,255,.12)' : `0 0 14px ${alpha(c, 0.08)}`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding: '10px 14px', color: '#e8edf4', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
      </div>

      {isUser && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: 'rgba(177,140,255,.14)', border: '2px solid #b18cff', boxShadow: '0 0 12px rgba(177,140,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontSize: 11, fontWeight: 800, color: '#d9c8ff' }}>
          YOU
        </div>
      )}
    </motion.div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ member, mood }) {
  if (!member) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <Portrait member={member} level={mood?.level ?? 0} size={32} />
      <div style={{ background: '#0e1520', border: `1px solid ${alpha(member.color, 0.3)}`, borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
            style={{ width: 6, height: 6, borderRadius: '50%', background: member.color }} />
        ))}
      </div>
      <span style={{ color: '#8794a8', fontSize: 12 }}>{member.name} is typing...</span>
    </motion.div>
  );
}

// ── Team Simulation Screen ────────────────────────────────────────────────────
function SimulationScreen({ session, user, onComplete, completing }) {
  const [messages,  setMessages]  = useState(session.messages || []);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [typingWho, setTypingWho] = useState(null);
  const [remaining, setRemaining] = useState((session.duration || session.scenario?.duration || 20) * 60);
  const [newMsgIds, setNewMsgIds] = useState(new Set());
  const chatEndRef  = useRef(null);
  const timerRef    = useRef(null);
  const inputRef    = useRef(null);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const scenario = session.scenario || {};
  const tierKey  = tierOf(scenario);
  const t        = TIERS[tierKey];
  const teamIds  = (session.team && session.team.length ? session.team : scenario.teamComposition || []);
  const team     = teamIds.map(memberOf).filter(Boolean);
  const moods    = useMemo(() => Object.fromEntries(team.map(m => [m.id, moodFor(scenario, m.id)])), [scenario.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastSpeaker = [...messages].reverse().find(m => m.type === 'teammate')?.from;
  const urgent = remaining < 300;

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); completeRef.current(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingWho]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const userMsg = { id: `opt-user-${Date.now()}`, from: 'user', type: 'user', text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setNewMsgIds(prev => new Set([...prev, userMsg.id]));

    const teamComp = scenario.teamComposition || teamIds.map(x => (typeof x === 'string' ? x : x.id));
    const typingMember = memberOf(teamComp[Math.floor(Math.random() * teamComp.length)]);
    setTypingWho(typingMember);

    try {
      const res = await axios.post(`${API_BASE}/team-sim/${session.sessionId}/message`, { userId: user?.uid, text });
      setTypingWho(null);

      if (res.data.messages) {
        const teammateResponses = res.data.messages.filter(m => m.type === 'teammate');
        const ids = new Set(teammateResponses.map(m => m.id));
        setNewMsgIds(prev => new Set([...prev, ...ids]));

        for (let i = 0; i < teammateResponses.length; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 300 : 700));
          setMessages(prev => [...prev, teammateResponses[i]]);
          if (i < teammateResponses.length - 1) {
            const nextMember = memberOf(teammateResponses[i + 1]?.from);
            if (nextMember) setTypingWho(nextMember);
            await new Promise(r => setTimeout(r, 500));
            setTypingWho(null);
          }
        }
      }
    } catch (e) {
      console.error('Send message error:', e);
      setTypingWho(null);
      const errMsg = { id: `err-${Date.now()}`, type: 'system', text: 'Message failed to send. Check your connection and try again.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, session.sessionId, user?.uid, scenario.teamComposition]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height: '100vh', background: '#05070b', color: '#dfe5ee', fontFamily: BODY, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ minHeight: 64, background: '#090d14', borderBottom: `1px solid ${alpha(t.color, 0.45)}`, boxShadow: `0 0 24px ${alpha(t.color, 0.12)}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 20px', flexShrink: 0, position: 'relative' }}>
        {tierKey === 'crisis' && (
          <span className="ts-hazard" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 4, background: 'repeating-linear-gradient(45deg, #ff4d5e 0 10px, #2a0a10 10px 20px)', backgroundSize: '28px 4px' }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1522', border: `1px solid ${alpha(t.color, 0.5)}`, boxShadow: `0 0 14px ${alpha(t.color, 0.2)}` }}>
            <Icon d={t.icon} size={18} color={t.color} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="ts-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scenario.title}</span>
              <span className={tierKey === 'crisis' ? 'ts-blink' : ''} style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 10, letterSpacing: '.2em', color: t.color }}>{t.label}</span>
            </div>
            <div style={{ color: '#8f9bae', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scenario.subtitle}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ts-hide-sm" style={{ display: 'flex' }}>
            {team.map(m => (
              <span key={m.id} title={`${m.name} · ${m.role}`} style={{ marginLeft: -6, borderRadius: '50%', outline: lastSpeaker === m.id ? `2px solid ${m.color}` : 'none', outlineOffset: 2 }}>
                <Portrait member={m} level={moods[m.id]?.level ?? 0} size={30} />
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: urgent ? 'rgba(255,77,94,.12)' : '#070b11', border: `1px solid ${urgent ? 'rgba(255,77,94,.55)' : '#1c2636'}` }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8f9bae' }}>SPRINT</span>
            <span className={urgent ? 'ts-blink' : ''} style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: urgent ? '#ff6b78' : '#e8edf4' }}>{formatTime(remaining)}</span>
          </div>
          <button type="button" onClick={onComplete} disabled={completing} className="ts-btn"
            style={{ height: 44, padding: '0 16px', borderRadius: 10, border: 0, background: 'linear-gradient(180deg, #eef1f6, #a9b3c2)', color: '#0a0d12', fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '.1em', cursor: completing ? 'wait' : 'pointer', opacity: completing ? 0.7 : 1 }}>
            {completing ? 'DEBRIEFING...' : 'END SPRINT'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="ts-sim-body" style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left panel */}
        <div className="ts-sim-side ts-scroll" style={{ width: 300, borderRight: '1px solid #172131', padding: '18px 16px', overflowY: 'auto', flexShrink: 0, background: '#080b11', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ ...sectionLabel, color: t.color, marginBottom: 8 }}>MISSION BRIEF</div>
            <p style={{ color: '#c2cad6', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{scenario.context}</p>
          </div>

          {scenario.objective && (
            <div style={{ background: alpha(t.color, 0.06), border: `1px solid ${alpha(t.color, 0.35)}`, borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.color, fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '.18em', marginBottom: 6 }}>
                <Icon d={I.target} size={13} /> YOUR OBJECTIVE
              </div>
              <p style={{ color: '#d3dae4', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{scenario.objective}</p>
            </div>
          )}

          <div>
            <div style={{ ...sectionLabel, marginBottom: 10 }}>YOUR SQUAD</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {team.map(m => {
                const speaking = typingWho?.id === m.id;
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: `1px solid ${speaking || lastSpeaker === m.id ? alpha(m.color, 0.5) : '#141c29'}`, background: speaking ? alpha(m.color, 0.08) : '#0a0e15', transition: 'all .2s ease' }}>
                    <Portrait member={m} level={moods[m.id]?.level ?? 0} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: '#eef2f7', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
                      </div>
                      <div style={{ color: m.color, fontSize: 12 }}>{m.role}</div>
                      {moods[m.id] && <MoodChip mood={moods[m.id]} />}
                    </div>
                    {speaking && <span className="ts-blink-slow" style={{ fontSize: 10, letterSpacing: '.14em', color: m.color, fontFamily: DISPLAY, fontWeight: 700 }}>LIVE</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: '#0a0e15', borderRadius: 12, border: '1px solid #172131' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#95a1b3', fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '.18em', marginBottom: 6 }}>
              <Icon d={I.bolt} size={13} color="#ffb020" /> FIELD TIP
            </div>
            <div style={{ color: '#aab4c3', fontSize: 13, lineHeight: 1.55 }}>Ask questions, push back on bad ideas, own decisions. Your team is watching how you lead.</div>
          </div>
        </div>

        {/* Chat */}
        <div className="ts-sim-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(ellipse at 50% 0%, ${alpha(t.color, 0.06)}, transparent 60%)`, pointerEvents: 'none' }} />
          <div className="ts-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {messages.map(msg => msg.type === 'system' ? (
              <div key={msg.id} role="alert" style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, margin: '6px 0 12px', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,77,94,.4)', background: 'rgba(255,77,94,.08)', color: '#ff8c97', fontSize: 12 }}>
                <Icon d={I.alert} size={13} /> {msg.text}
              </div>
            ) : (
              <MessageBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} mood={moods[msg.from]} />
            ))}
            <AnimatePresence>
              {typingWho && <TypingIndicator key="typing" member={typingWho} mood={moods[typingWho.id]} />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #172131', background: '#090d14', flexShrink: 0, position: 'relative' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <label htmlFor="ts-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Reply to your team</label>
              <textarea
                id="ts-input" ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Reply to your team..." rows={2}
                style={{
                  flex: 1, background: '#05080d', borderRadius: 12, padding: '12px 14px', color: '#e8edf4', fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.5, fontFamily: BODY,
                  border: `1px solid ${input.trim() ? alpha(t.color, 0.6) : '#1c2636'}`,
                  boxShadow: input.trim() ? `0 0 16px ${alpha(t.color, 0.15)}` : 'none',
                  transition: 'border-color .15s ease, box-shadow .15s ease',
                }}
              />
              <button type="button" onClick={sendMessage} disabled={!input.trim() || sending} aria-label="Send message" className="ts-btn"
                style={{
                  height: 58, padding: '0 20px', borderRadius: 12, border: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '.1em',
                  background: input.trim() && !sending ? 'linear-gradient(180deg, #eef1f6, #a9b3c2)' : '#141b27',
                  color: input.trim() && !sending ? '#0a0d12' : '#5a6880',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                }}>
                {sending ? '...' : <>SEND <Icon d={I.send} size={15} /></>}
              </button>
            </div>
            <div style={{ color: '#5a6880', fontSize: 12, marginTop: 6, textAlign: 'right' }}>Enter to send · Shift+Enter for new line</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ report, scenario, onRedo, onHome }) {
  const tierKey = tierOf(scenario);
  const t = TIERS[tierKey];
  const verdictColors = {
    'Exceptional Leader': '#3ddc97', 'Strong Collaborator': '#b18cff',
    'Good Team Player': '#5ab0ff',   'Needs Development': '#ffb020',
  };
  const score        = report?.overallScore;
  const hasScore     = typeof score === 'number';
  const verdictColor = verdictColors[report?.verdict] || t.color;
  // Team reaction: a strong sprint leaves the squad happy
  const reaction     = !hasScore ? 1 : score >= 80 ? 0 : score >= 60 ? 1 : score >= 40 ? 2 : 3;
  const xpEarned     = hasScore && score > 0 ? Math.round(score * 0.3) : 0;

  const scoreItems = [
    { label: 'Collaboration', value: report?.collaborationScore, color: '#b18cff' },
    { label: 'Leadership',    value: report?.leadershipScore,    color: '#ffb020' },
    { label: 'Technical',     value: report?.technicalScore,     color: '#5ab0ff' },
    { label: 'Communication', value: report?.communicationScore, color: '#3ddc97' },
  ].filter(s => typeof s.value === 'number');

  const teamComposition = scenario?.teamComposition || [];

  return (
    <div style={{ ...shell, padding: '40px 16px' }}>
      <div style={{ position: 'absolute', left: '50%', top: -200, width: 1100, height: 700, marginLeft: -550, background: `radial-gradient(ellipse at 50% 40%, ${alpha(verdictColor, 0.14)}, transparent 65%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', maxWidth: 760, margin: '0 auto', background: 'linear-gradient(180deg,#0c121c,#070a10)', border: `1px solid ${alpha(t.color, 0.45)}`, borderRadius: 22, padding: 'clamp(20px, 4vw, 36px)', boxShadow: `0 0 50px ${alpha(t.color, 0.15)}, 0 40px 80px rgba(0,0,0,.6)` }}>

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, border: `1px solid ${alpha(t.color, 0.5)}`, background: alpha(t.color, 0.08), fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '.2em', color: t.color }}>
            <Icon d={t.icon} size={13} /> {t.label} MISSION DEBRIEF
          </div>
          <h2 className="ts-silver" style={{ margin: '12px 0 4px', fontFamily: DISPLAY, fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '.04em' }}>SPRINT COMPLETE</h2>
          <p style={{ color: '#95a1b3', margin: 0, fontSize: 14 }}>{scenario?.title}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 26 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
            style={{ width: 110, height: 110, borderRadius: '50%', background: alpha(verdictColor, 0.1), border: `3px solid ${verdictColor}`, boxShadow: `0 0 30px ${alpha(verdictColor, 0.4)}, inset 0 0 20px ${alpha(verdictColor, 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ color: verdictColor, fontFamily: MONO, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{hasScore ? score : '--'}</span>
            <span style={{ color: verdictColor, fontSize: 10, fontWeight: 700, letterSpacing: '.16em', marginTop: 4 }}>OVERALL</span>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: DISPLAY, color: verdictColor, fontWeight: 800, fontSize: 22, letterSpacing: '.02em' }}>{report?.verdict}</span>
            <span style={{ color: '#95a1b3', fontSize: 13 }}>Team Simulation Rating</span>
            {xpEarned > 0 && <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: '#c4b5fd' }}>+{xpEarned} XP</span>}
          </div>
        </div>

        {scoreItems.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Icon d={I.chart} size={14} /> DIMENSION SCORES</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {scoreItems.map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 12, border: '1px solid #1a2433', background: '#0b1018' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#c3ccd8', fontSize: 13 }}>{s.label}</span>
                    <span style={{ color: s.color, fontFamily: MONO, fontSize: 13, fontWeight: 700 }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, background: '#151d2a', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.value || 0}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                      style={{ height: '100%', background: s.color, boxShadow: `0 0 10px ${alpha(s.color, 0.5)}`, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.summary && (
          <div style={{ background: '#0a0f17', border: '1px solid #1f2a3c', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>MANAGER'S TAKE</div>
            <div style={{ color: '#d3dae4', fontSize: 14, lineHeight: 1.7 }}>{report.summary}</div>
          </div>
        )}

        {report?.keyMoment && (
          <div style={{ background: alpha(t.color, 0.06), border: `1px solid ${alpha(t.color, 0.3)}`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ ...sectionLabel, color: t.color, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><Icon d={I.bolt} size={13} /> KEY MOMENT</div>
            <div style={{ color: '#d3dae4', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>"{report.keyMoment}"</div>
          </div>
        )}

        {((report?.strengths || []).length > 0 || (report?.improvements || []).length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'rgba(61,220,151,.05)', border: '1px solid rgba(61,220,151,.25)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ ...sectionLabel, color: '#3ddc97', marginBottom: 8 }}>STRENGTHS</div>
              {(report?.strengths || []).map((s, i) => (
                <div key={i} style={{ color: '#d3dae4', fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <Icon d={I.plus} size={14} color="#3ddc97" strokeWidth={2.6} style={{ marginTop: 2 }} />{s}
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,176,32,.05)', border: '1px solid rgba(255,176,32,.25)', borderRadius: 14, padding: '12px 14px' }}>
              <div style={{ ...sectionLabel, color: '#ffb020', marginBottom: 8 }}>IMPROVE</div>
              {(report?.improvements || []).map((s, i) => (
                <div key={i} style={{ color: '#d3dae4', fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <Icon d={I.arrow} size={14} color="#ffb020" strokeWidth={2.4} style={{ marginTop: 2 }} />{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {report?.teamFeedback && teamComposition.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ ...sectionLabel, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Icon d={I.chat} size={14} /> YOUR SQUAD'S FEEDBACK</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {teamComposition.map(id => {
                const member = memberOf(id);
                const fbText = report.teamFeedback?.[id];
                if (!member || !fbText) return null;
                return (
                  <div key={id} style={{ background: '#0b1018', border: `1px solid ${alpha(member.color, 0.3)}`, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 12 }}>
                    <Portrait member={member} level={reaction} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ color: '#eef2f7', fontSize: 14, fontWeight: 600 }}>{member.name}</span>
                        <ClassPill member={member} />
                      </div>
                      <div style={{ color: '#c3ccd8', fontSize: 13, lineHeight: 1.55 }}>{fbText}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="ts-btn" onClick={onRedo}
            style={{ flex: '1 1 200px', minHeight: 50, background: '#0c1119', border: '1px solid #243045', borderRadius: 12, color: '#c9d1dc', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Try another scenario
          </button>
          <button type="button" className="ts-btn" onClick={onHome}
            style={{ flex: '1 1 200px', minHeight: 50, background: 'linear-gradient(180deg, #eef1f6, #a9b3c2)', border: 0, borderRadius: 12, color: '#0a0d12', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 14, fontWeight: 800, letterSpacing: '.1em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            BACK TO WORLD <Icon d={I.arrow} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main TeamSimulation ───────────────────────────────────────────────────────
export default function TeamSimulation({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,      setPhase]      = useState('select'); // select | sim | result
  const [session,    setSession]    = useState(null);
  const [report,     setReport]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error,      setError]      = useState(null);
  const completingRef = useRef(false);

  useEffect(() => {
    if (document.querySelector('link[data-ts-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-ts-fonts', '1');
    document.head.appendChild(link);
  }, []);

  const startSim = async (scenarioId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/team-sim/start`, { userId: user?.uid, scenarioId });
      if (!res.data.success) throw new Error(res.data.error || 'Failed to start');
      setSession(res.data);
      setPhase('sim');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not start simulation');
    } finally {
      setLoading(false);
    }
  };

  const completeSim = async () => {
    if (!session?.sessionId || completingRef.current) return; // guard: timer + button can both fire
    completingRef.current = true;
    setCompleting(true);
    try {
      const res = await axios.post(`${API_BASE}/team-sim/${session.sessionId}/complete`, { userId: user?.uid });
      if (res.data.success) {
        setReport(res.data.report);
        setPhase('result');
        if (setUserData && res.data.report?.overallScore > 0) {
          const xp = Math.round(res.data.report.overallScore * 0.3);
          setUserData(prev => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + xp }));
        }
      } else {
        throw new Error(res.data.error || 'Report failed');
      }
    } catch (e) {
      console.error('Complete sim error:', e);
      // Still show the result screen, but without inventing a score
      setReport({ verdict: 'Report unavailable', overallScore: null, summary: 'Your sprint ended, but the debrief could not be generated. Your conversation was saved.', strengths: [], improvements: [], teamFeedback: {} });
      setPhase('result');
    } finally {
      setCompleting(false);
      completingRef.current = false;
    }
  };

  const reset = () => {
    setPhase('select');
    setSession(null);
    setReport(null);
    setError(null);
  };

  let screen;
  if (phase === 'select') {
    screen = <ScenarioSelector onStart={startSim} loading={loading} error={error} onBack={() => navigate('/world')} />;
  } else if (phase === 'sim' && session) {
    screen = <SimulationScreen session={session} user={user} onComplete={completeSim} completing={completing} />;
  } else if (phase === 'result' && report) {
    screen = <ResultScreen report={report} scenario={session?.scenario} onRedo={reset} onHome={() => navigate('/world')} />;
  } else {
    screen = (
      <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="ts-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em' }}>LOADING...</span>
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

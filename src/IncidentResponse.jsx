import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Theme ─────────────────────────────────────────────────────────────────────
const SEV_COLORS  = { P0: '#ff3355', P1: '#ff8a3d', P2: '#ffb020', P3: '#39ff88' };
const SEV_ORDER   = { P0: 0, P1: 1, P2: 2, P3: 3 };
const DIFF_COLORS = { Easy: '#39ff88', Medium: '#ffb020', Hard: '#ff6680' };
const GREEN = '#39ff88';
const WHITE = '#f2f7ff';
const DISPLAY = "'Share Tech Mono', ui-monospace, monospace";
const MONO    = "'JetBrains Mono', ui-monospace, monospace";
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=JetBrains+Mono:wght@400;500;700;800&display=swap';

const STYLE = `
@keyframes irBlink{0%,49%{opacity:1}50%,100%{opacity:.12}}
@keyframes irBeacon{to{transform:rotate(360deg)}}
@keyframes irPulse{0%,100%{opacity:.35}50%{opacity:.9}}
@keyframes irDistress{0%,100%{box-shadow:0 0 0 1px rgba(255,51,85,.55),0 0 26px rgba(255,51,85,.25),0 30px 50px rgba(0,0,0,.6)}50%{box-shadow:0 0 0 2px rgba(255,51,85,.95),0 0 60px rgba(255,51,85,.55),0 30px 50px rgba(0,0,0,.6)}}
@keyframes irScan{0%{transform:translateY(-100%)}100%{transform:translateY(700%)}}
@keyframes irBlip{0%{transform:scale(1);opacity:1}70%{transform:scale(2.4);opacity:0}100%{opacity:0}}
@keyframes irCaret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes irFlicker{0%,100%{opacity:1}92%{opacity:1}93%{opacity:.55}94%{opacity:1}97%{opacity:.7}}
@keyframes irShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.ir-blink{animation:irBlink .8s steps(1) infinite}
.ir-blink-slow{animation:irBlink 1.4s steps(1) infinite}
.ir-beacon{animation:irBeacon 2.6s linear infinite}
.ir-pulse{animation:irPulse 1.8s ease-in-out infinite}
.ir-distress{animation:irDistress 1.1s ease-in-out infinite}
.ir-scan{animation:irScan 4s linear infinite}
.ir-blip{animation:irBlip 1.2s ease-out infinite}
.ir-caret{animation:irCaret 1s steps(1) infinite}
.ir-flicker{animation:irFlicker 6s linear infinite}
.ir-skel{background:linear-gradient(90deg,#06100b 0,#0d1f15 50%,#06100b 100%);background-size:800px 100%;animation:irShimmer 1.4s linear infinite}
.ir-card{transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.ir-btn{transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,color .15s ease}
.ir-card:focus-visible,.ir-btn:focus-visible{outline:2px solid #39ff88;outline-offset:3px}
.ir-scroll{scrollbar-width:thin;scrollbar-color:#1d3a2a transparent}
.ir-input::placeholder{color:#5d8a72}
@media (max-width:900px){
  .ir-desk{transform:none !important}
  .ir-hide-sm{display:none !important}
  .ir-body{flex-direction:column !important;overflow-y:auto}
  .ir-side{width:100% !important;border-right:0 !important;border-bottom:1px solid #12261b}
  .ir-chat{min-height:70vh}
}
@media (prefers-reduced-motion:reduce){.ir-blink,.ir-blink-slow,.ir-beacon,.ir-pulse,.ir-distress,.ir-scan,.ir-blip,.ir-caret,.ir-flicker,.ir-skel{animation:none}}
`;

const STATUS = {
  O: { label: 'OK',       color: '#39ff88', bg: 'rgba(57,255,136,.08)', shadow: '#0b3a20' },
  W: { label: 'DEGRADED', color: '#ffb020', bg: 'rgba(255,176,32,.08)', shadow: '#4a3200' },
  D: { label: 'DEAD',     color: '#ff3355', bg: 'rgba(255,51,85,.12)',  shadow: '#4a0010' },
  H: { label: 'FLOODED',  color: '#ff4dff', bg: 'rgba(255,77,255,.10)', shadow: '#40104a' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function alpha(hex, a) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex || 'transparent';
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
const frac  = x => x - Math.floor(x);
const noise = n => frac(Math.sin(n * 12.9898) * 43758.5453);
const hashStr = (s = '') => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const initials = name => (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

function formatTime(s) {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function parseNum(v) {
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// "🚨 CRITICAL: API error rate 67% | DB connections ..." → ["API error rate 67%", ...]
function alertSegments(alert) {
  return String(alert || '')
    .replace(/^[^A-Za-z0-9$~]+/, '')
    .replace(/^(CRITICAL|HIGH|MEDIUM|LOW|P\d)\s*:\s*/i, '')
    .split(/\s*\|\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

function pagedSeconds(s) {
  const m = `${s?.alert || ''} ${s?.context || ''}`.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) * 60 : 120;
}

function revenuePerHour(s) {
  const m = String(s?.alert || '').match(/\$\s*([\d.,]+)\s*([KkMm])?\s*\/\s*h/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return n * (/k/i.test(m[2] || '') ? 1e3 : /m/i.test(m[2] || '') ? 1e6 : 1);
}

// Live impact figure for a card. Backend can send scenario.impact = { label, kind, base, ratePerSec }.
function impactOf(s) {
  if (s?.impact) return { label: s.impact.label, kind: s.impact.kind || 'count', base: s.impact.base || 0, rate: s.impact.ratePerSec || 0 };
  const paged = pagedSeconds(s);
  const rev = revenuePerHour(s);
  if (rev) return { label: 'REVENUE LOST', kind: 'money', base: (rev / 3600) * paged, rate: rev / 3600, sub: `burning ~$${Math.round(rev / 3600)} every second` };
  const users = String(s?.alert || '').match(/~?\s*([\d,]+)\s*users/i);
  if (users) return { label: 'USERS AFFECTED', kind: 'count', base: parseInt(users[1].replace(/,/g, ''), 10), rate: 3, sub: 'and climbing' };
  const segsPct = alertSegments(s?.alert).filter(x => /%/.test(x));
  const seg = segsPct.find(x => /error/i.test(x)) || segsPct[0];
  if (seg) {
    const m = seg.match(/[\d.]+\s*%/);
    const before = seg.slice(0, m.index).replace(/[:\s]+$/, '').trim();
    const after  = seg.slice(m.index + m[0].length).replace(/^\s*of\s+/i, '').trim();
    const label  = (before || after || 'IMPACT').toUpperCase().slice(0, 28);
    return { label, kind: 'pct', base: parseNum(m[0]), rate: 0, jitter: 2 };
  }
  return { label: 'TIME SINCE PAGE', kind: 'time', base: paged, rate: 1 };
}

function fmtImpact(imp, secs, frozen) {
  let v = imp.base + (frozen ? 0 : imp.rate * secs);
  if (imp.jitter && !frozen) v += Math.sin(secs / 1.3) * imp.jitter;
  if (imp.kind === 'money') return `$${Math.floor(v).toLocaleString('en-US')}`;
  if (imp.kind === 'count') return Math.floor(v).toLocaleString('en-US');
  if (imp.kind === 'time')  return formatTime(v);
  return `${v.toFixed(1)}%`;
}

// Node cluster derived from the alert text. Backend can send scenario.cluster = { label, cells: 'DWO...', dependency: { name, status, note } }.
function clusterOf(s) {
  const slug = String(s?.service || 'svc').split(/[\s/+]+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'svc';
  if (s?.cluster?.cells) {
    const dep = s.cluster.dependency;
    return { label: s.cluster.label || `${slug}-nodes`, prefix: slug, cells: s.cluster.cells.split(''), dep: dep ? { name: dep.name, s: dep.status || 'D', note: dep.note || '' } : null };
  }
  const text = `${s?.alert || ''} ${s?.context || ''}`;
  const ofN  = text.match(/(\d+)\s*of\s*(\d+)/i);
  const conn = text.match(/connections?\s*:?\s*(\d+)\s*\/\s*(\d+)/i);
  const mult = text.match(/(\d+)\s*x\b/i);
  if (ofN) {
    const dead = Math.min(parseInt(ofN[1], 10), 24), total = Math.min(parseInt(ofN[2], 10), 24);
    const cells = Array(total).fill('W');
    for (let i = 0; i < dead; i++) cells[Math.floor((i * total) / dead)] = 'D';
    return { label: `${slug}-pods`, prefix: 'pod', cells, dep: null };
  }
  if (conn) {
    return { label: `${slug}-pods`, prefix: slug, cells: 'DWDWWDOWDWWO'.split(''), dep: { name: 'database', s: 'D', note: `${conn[1]}/${conn[2]} CONNS` } };
  }
  if (mult) {
    return { label: 'edge-nodes', prefix: 'edge', cells: 'HHWHOHHWHHOWHHWH'.split(''), dep: { name: 'rate-limiter', s: 'W', note: 'SATURATED' } };
  }
  if (s?.severity === 'P0') {
    return { label: `${slug}-svc`, prefix: slug, cells: 'WWWWWW'.split(''), dep: { name: 'upstream', s: 'D', note: 'FAILING' } };
  }
  return { label: `${slug}-pods`, prefix: slug, cells: 'OWWDOWWO'.split(''), dep: null };
}

function cellValue(ch, s, tick) {
  if (ch === 'O') return 'OK';
  if (ch === 'H') return 'FLOOD';
  if (ch === 'D') return /oom|memory/i.test(`${s?.alert} ${s?.title}`) ? 'OOM' : 'DOWN';
  if (/memory/i.test(`${s?.alert} ${s?.title}`)) return `${87 + (Math.floor(tick / 20) % 12)}%`;
  if (/429|rate limit/i.test(s?.alert || '')) return '429';
  return '5xx';
}

// Terminal log lines: scenario.logs = [[ts, level, msg]] if provided, otherwise built from the alert + context.
function logsOf(s) {
  if (Array.isArray(s?.logs) && s.logs.length) return s.logs.map(l => (Array.isArray(l) ? l : [l.ts, l.level, l.msg]));
  const lvl = s?.severity === 'P0' ? 'CRIT' : 'ERROR';
  const out = alertSegments(s?.alert).map((seg, i) => [`T+${String(i).padStart(2, '0')}s`, i % 2 ? 'WARN' : lvl, seg]);
  String(s?.context || '').split(/(?<=\.)\s+/).slice(0, 4).forEach((line, i) => out.push([`T+${String(out.length + i).padStart(2, '0')}s`, 'INFO', line]));
  return out.length ? out : [['T+00s', 'INFO', 'waiting for signal']];
}

function seriesPts(value, tick, seed, opts = {}) {
  const v0 = Number.isFinite(value) ? value : 0;
  const amp = opts.flat ? 0 : Math.max(Math.abs(v0) * 0.08, 0.5);
  const lo = 0, hi = opts.hi ?? Math.max(Math.abs(v0) * 1.5, 1);
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const t = i + tick * 0.5;
    let v = v0 + amp * Math.sin((t + seed) / 5) + amp * (noise(Math.floor(t) + seed) - 0.5);
    if (i === 39) v = v0;
    v = Math.max(lo, Math.min(hi, v));
    pts.push(`${(i * 300 / 39).toFixed(1)},${(76 - ((v - lo) / (hi - lo)) * 70).toFixed(1)}`);
  }
  const p = pts.join(' ');
  return { pts: p, area: `M0,80 L${pts.join(' L')} L300,80 Z` };
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
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
  arrow:  'M5 12h14 M13 6l6 6-6 6',
  alert:  'M12 9v4 M12 17h.01 M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z',
  server: 'M4 4h16v6H4z M4 14h16v6H4z M8 7h.01 M8 17h.01',
  check:  'M5 12l5 5 9-10',
  cross:  'M6 6l12 12 M18 6L6 18',
  plus:   'M12 5v14 M5 12h14',
  speaker:'M11 5L6 9H2v6h4l5 4z',
  waveOn: 'M15.5 8.5a5 5 0 0 1 0 7 M19 5a10 10 0 0 1 0 14',
  waveOff:'M22 9l-6 6 M16 9l6 6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13z M15.5 15.5L21 21',
  doc:    'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  send:   'M22 2L11 13 M22 2l-7 20-4-9-9-4z',
};

function AudioToggle({ on, onToggle }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} className="ir-btn"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', font: 'inherit',
        background: on ? 'rgba(57,255,136,.12)' : '#050c08', color: on ? GREEN : '#b9f5d0',
        border: `1px solid ${on ? GREEN : '#1d3a2a'}`, boxShadow: on ? '0 0 16px rgba(57,255,136,.35)' : 'none',
      }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={I.speaker} /><path d={on ? I.waveOn : I.waveOff} />
      </svg>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        <span style={{ fontSize: 11, letterSpacing: '.16em', opacity: 0.8 }}>TACTICAL AUDIO</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 16 }}>{on ? 'ON' : 'OFF'}</span>
      </span>
    </button>
  );
}

function EmergencyLighting({ color = '#ff3355', calm = false }) {
  const c = calm ? GREEN : color;
  return (
    <>
      <div className={calm ? '' : 'ir-pulse'} style={{ position: 'absolute', left: '50%', top: -340, width: 1500, height: 900, marginLeft: -750, background: `radial-gradient(ellipse at 50% 40%, ${alpha(c, calm ? 0.12 : 0.3)}, ${alpha(c, 0.06)} 40%, transparent 68%)`, pointerEvents: 'none', transition: 'background 1s ease' }} />
      {!calm && (
        <div style={{ position: 'absolute', left: '50%', top: -500, width: 1000, height: 1000, marginLeft: -500, pointerEvents: 'none', overflow: 'hidden', borderRadius: '50%', opacity: 0.55 }}>
          <div className="ir-beacon" style={{ position: 'absolute', inset: 0, background: `conic-gradient(from 0deg, transparent 0deg, transparent 290deg, ${alpha(c, 0.35)} 340deg, transparent 360deg)`, filter: 'blur(30px)' }} />
        </div>
      )}
      {!calm && <div className="ir-pulse" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(120,0,20,.35) 100%)', pointerEvents: 'none', animationDelay: '.9s' }} />}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(57,255,136,.025) 0 1px, transparent 1px 3px)', pointerEvents: 'none' }} />
    </>
  );
}

function ClusterGrid({ cells, cols, scenario, tick, big = false, prefix = 'node' }) {
  if (!big) {
    return (
      <span style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, 8)}, 12px)`, gap: 4 }} aria-hidden="true">
        {cells.map((ch, i) => {
          const s = STATUS[ch] || STATUS.W;
          return (
            <span key={i} style={{ position: 'relative', width: 12, height: 12, borderRadius: 3, background: s.color, boxShadow: `0 0 6px ${alpha(s.color, 0.45)}` }}>
              {ch === 'D' && <span className="ir-blip" style={{ position: 'absolute', inset: 0, borderRadius: 3, border: '1px solid #ff3355' }} />}
            </span>
          );
        })}
      </span>
    );
  }
  return (
    <div style={{ perspective: 900 }}>
      <div className="ir-desk" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cols, 8)}, minmax(0, 1fr))`, gap: 8, transform: 'rotateX(24deg)', transformOrigin: '50% 100%', padding: '8px 4px 4px' }}>
        {cells.map((ch, i) => {
          const s = STATUS[ch] || STATUS.W;
          return (
            <div key={i} title={`${prefix}-${i + 1}: ${s.label}`} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52, borderRadius: 6, background: s.bg, border: `1px solid ${s.color}`, boxShadow: `0 6px 0 ${s.shadow}, 0 0 14px ${alpha(s.color, ch === 'O' ? 0.25 : 0.45)}`, transition: 'all .6s ease' }}>
              {ch === 'D' && (
                <>
                  <span className="ir-blip" style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, margin: '-8px 0 0 -8px', borderRadius: '50%', border: '2px solid #ff3355' }} />
                  <span className="ir-blink" style={{ position: 'absolute', right: 5, top: 5, width: 6, height: 6, borderRadius: '50%', background: '#ff3355', boxShadow: '0 0 8px #ff3355' }} />
                </>
              )}
              <span style={{ fontSize: 10, color: '#a9c4b4' }}>{prefix}-{i + 1}</span>
              <span style={{ fontFamily: DISPLAY, fontSize: 14, color: s.color }}>{cellValue(ch, scenario, tick)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: '#a9c4b4' }}>
      {['O', 'W', 'D', 'H'].map(k => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span className={k === 'D' ? 'ir-blink' : ''} style={{ width: 8, height: 8, borderRadius: 2, background: STATUS[k].color }} />{STATUS[k].label}
        </span>
      ))}
    </span>
  );
}

function LiveChart({ label, display, value, color, tick, seed, flat, height = 56 }) {
  const { pts, area } = seriesPts(value, tick, seed, { flat });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#a9c4b4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 18, color, textShadow: `0 0 10px ${alpha(color, 0.6)}`, whiteSpace: 'nowrap' }}>{display}</span>
      </div>
      <svg width="100%" height={height} viewBox="0 0 300 80" preserveAspectRatio="none" role="img" aria-label={`${label} trend`}
        style={{ display: 'block', borderRadius: 6, background: 'linear-gradient(180deg, #050a07, #020403)', border: '1px solid #0f1f16' }}>
        <path d="M0 20H300 M0 40H300 M0 60H300" stroke="rgba(57,255,136,.07)" strokeWidth="1" />
        <path d={area} fill={alpha(color, 0.12)} />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function TerminalLog({ lines, tick, title, sub }) {
  const LVL = { ERROR: '#ff3355', CRIT: '#ff4dff', WARN: '#ffb020', INFO: GREEN };
  const start = Math.floor(tick / 6) % lines.length;
  const view = Array.from({ length: Math.min(6, lines.length) }, (_, i) => lines[(start + i) % lines.length]);
  return (
    <div style={{ borderRadius: 16, border: '1px solid #12261b', background: '#020302', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 13, letterSpacing: '.22em', color: GREEN }}>{title}</span>
        <span style={{ fontSize: 11, color: '#6fa486', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, lineHeight: 1.5 }}>
        {view.map(([ts, lvl, msg], i) => (
          <div key={`${start}-${i}`} style={{ display: 'flex', gap: 10, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ color: '#4f7a62' }}>{ts}</span>
            <span style={{ color: LVL[lvl] || '#d6e6dc', fontWeight: 700 }}>{lvl}</span>
            <span style={{ color: '#d6e6dc', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg}</span>
          </div>
        ))}
        <span className="ir-caret" style={{ display: 'inline-block', width: 8, height: 14, background: GREEN }} />
      </div>
    </div>
  );
}

function SevPill({ sev, blink, size = 15 }) {
  const c = SEV_COLORS[sev] || '#ff8a3d';
  return (
    <span className={blink ? 'ir-blink' : ''} style={{ padding: '3px 10px', borderRadius: 6, background: c, color: '#140006', fontFamily: DISPLAY, fontSize: size, letterSpacing: '.1em', boxShadow: `0 0 16px ${alpha(c, 0.45)}`, whiteSpace: 'nowrap' }}>
      {sev}
    </span>
  );
}

const shell = { minHeight: '100vh', background: '#030504', color: '#e9f1ff', fontFamily: MONO, position: 'relative', overflowX: 'hidden' };
const label = { fontFamily: DISPLAY, fontSize: 13, letterSpacing: '.22em', color: GREEN };

// ── Scenario Selector (War Room) ──────────────────────────────────────────────
function ScenarioSelector({ onStart, loading, error, onBack, audioOn, onToggleAudio, setAlarm }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [fetching,  setFetching]  = useState(true);
  const [fetchErr,  setFetchErr]  = useState(false);
  const [tick,      setTick]      = useState(0);

  const load = () => {
    setFetching(true);
    setFetchErr(false);
    axios.get(`${API_BASE}/incident/scenarios`)
      .then(r => {
        const list = [...(r.data.scenarios || [])].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
        setScenarios(list);
        if (list[0]) setSelected(cur => cur || list[0].id);
        setFetching(false);
      })
      .catch(() => { setFetchErr(true); setFetching(false); });
  };
  useEffect(load, []);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  const sel  = scenarios.find(s => s.id === selected) || null;
  const secs = tick / 4;
  const p0Count = scenarios.filter(s => s.severity === 'P0').length;

  useEffect(() => { setAlarm({ sev: sel?.severity || 'P1', active: !!sel }); }, [sel?.severity, !!sel]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const clock = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

  return (
    <div style={shell}>
      <EmergencyLighting color={p0Count ? '#ff3355' : '#ff8a3d'} />

      {/* Distress strip */}
      <div style={{ position: 'relative', zIndex: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 22px', padding: '9px 16px', background: 'rgba(255,51,85,.12)', borderBottom: '1px solid rgba(255,51,85,.5)', fontFamily: DISPLAY, fontSize: 14, letterSpacing: '.2em', color: '#ff8fa3' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="ir-blink" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff3355', boxShadow: '0 0 14px #ff3355' }} />
          {p0Count ? 'SEV-0 ACTIVE' : 'INCIDENTS ACTIVE'}
        </span>
        <span style={{ color: '#6b2a36' }}>//</span>
        <span>PAGER FIRING</span>
        <span style={{ color: '#6b2a36' }}>//</span>
        <span>{fetching ? 'SCANNING' : `${scenarios.length} OPEN INCIDENTS`}</span>
      </div>

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 3, maxWidth: 1360, margin: '0 auto', padding: '22px 24px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="ir-btn" onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', borderRadius: 8, border: '1px solid #1d3a2a', background: '#06100b', color: '#b9f5d0', fontSize: 13, cursor: 'pointer', fontFamily: MONO }}>
              <Icon d={I.back} /> Back
            </button>
            <span style={{ fontSize: 13, color: GREEN }}>
              oncall@evoworld:~$ <span style={{ color: '#e9f1ff' }}>pager --status</span>
              <span className="ir-caret" style={{ display: 'inline-block', width: 8, height: 15, marginLeft: 4, verticalAlign: -2, background: GREEN }} />
            </span>
          </div>
          <h1 className="ir-flicker" style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(30px, 4.4vw, 56px)', letterSpacing: '.06em', lineHeight: 1, color: WHITE, textShadow: '0 0 18px rgba(233,241,255,.35), 0 0 2px #fff' }}>PRODUCTION INCIDENT RESPONSE</h1>
          <span style={{ fontSize: 14, color: '#a9c4b4' }}>You're on-call. The pager just fired. Lead your team to resolution.</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 14px', borderRadius: 8, border: '1px solid #1d3a2a', background: '#050c08' }}>
            <span style={{ fontSize: 11, letterSpacing: '.18em', color: '#6fa486' }}>UTC</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 20, color: GREEN, textShadow: '0 0 10px rgba(57,255,136,.6)' }}>{clock}</span>
          </div>
          {sel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,51,85,.5)', background: '#12050a' }}>
              <span style={{ fontSize: 11, letterSpacing: '.18em', color: '#c97a88' }}>TIME TO ACK</span>
              <span className="ir-blink-slow" style={{ fontFamily: DISPLAY, fontSize: 20, color: '#ff6680' }}>{formatTime(pagedSeconds(sel) + secs)}</span>
            </div>
          )}
          <AudioToggle on={audioOn} onToggle={onToggleAudio} />
        </div>
      </div>

      {/* Split */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1360, margin: '0 auto', padding: '16px 24px 56px', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>

        {/* Incident board */}
        <div style={{ flex: '999 1 600px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }}>
            <span style={{ ...label, fontSize: 14 }}>&gt; INCIDENT QUEUE</span>
            <span style={{ fontSize: 12, color: '#8fb3a0' }}>sorted by severity</span>
          </div>
          <div style={{ position: 'relative', borderRadius: 18, border: '1px solid #12261b', background: 'linear-gradient(180deg, #050b08, #020403)', padding: '22px 18px 28px', overflow: 'hidden', boxShadow: 'inset 0 1px 0 rgba(57,255,136,.06), 0 40px 80px rgba(0,0,0,.6)' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', perspective: 500, pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: '-40%', right: '-40%', top: 0, bottom: -120, transform: 'rotateX(70deg)', transformOrigin: '50% 0', backgroundImage: 'linear-gradient(rgba(57,255,136,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,136,.12) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'linear-gradient(to bottom, transparent, #000 40%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 40%)' }} />
            </div>

            {fetching && (
              <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
                <div className="ir-skel" style={{ height: 260, borderRadius: 14, gridColumn: '1 / -1' }} />
                {[0, 1, 2].map(i => <div key={i} className="ir-skel" style={{ height: 300, borderRadius: 14 }} />)}
              </div>
            )}

            {!fetching && fetchErr && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#ff8fa3' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}><Icon d={I.alert} size={18} /> pager feed unreachable</div>
                <div>
                  <button type="button" className="ir-btn" onClick={load}
                    style={{ marginTop: 14, height: 44, padding: '0 20px', borderRadius: 8, border: '1px solid rgba(255,51,85,.5)', background: 'rgba(255,51,85,.12)', color: '#ff8fa3', fontFamily: MONO, fontWeight: 700, cursor: 'pointer' }}>
                    RETRY
                  </button>
                </div>
              </div>
            )}

            {!fetching && !fetchErr && scenarios.length === 0 && (
              <div style={{ position: 'relative', textAlign: 'center', padding: 48, color: '#a9c4b4' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, color: GREEN, marginBottom: 6 }}>ALL SYSTEMS NOMINAL</div>
                No incidents in the queue right now.
              </div>
            )}

            {!fetching && !fetchErr && scenarios.length > 0 && (
              <div style={{ perspective: 1600, position: 'relative' }}>
                <div className="ir-desk" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18, transform: 'rotateX(7deg)', transformStyle: 'preserve-3d', transformOrigin: '50% 100%' }}>
                  {scenarios.map((s, i) => (
                    <IncidentCard key={s.id} s={s} index={i} tick={tick} isSel={selected === s.id} onPick={() => setSelected(s.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* War room panel */}
        <div style={{ flex: '1 1 440px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sel ? (
            <WarRoomPanel s={sel} tick={tick} loading={loading} error={error} onStart={() => onStart(sel.id)} />
          ) : (
            <div style={{ borderRadius: 16, border: '1px dashed #1d3a2a', background: '#040806', padding: 28, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Icon d={I.server} size={30} color="#4f7a62" />
              <span style={{ fontFamily: DISPLAY, fontSize: 20, color: GREEN }}>AWAITING TARGET</span>
              <span style={{ fontSize: 13, color: '#a9c4b4' }}>Select an incident to open the war room.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentCard({ s, index, tick, isSel, onPick }) {
  const isP0  = s.severity === 'P0';
  const sc    = SEV_COLORS[s.severity] || '#ff8a3d';
  const secs  = tick / 4;
  const imp   = impactOf(s);
  const cl    = clusterOf(s);
  const segs  = alertSegments(s.alert);
  const spark = seriesPts(parseNum(segs.find(x => /\d/.test(x))) ?? 50, tick, hashStr(s.id) % 50).pts;
  const money = imp.kind === 'money';

  return (
    <motion.button
      type="button" aria-pressed={isSel} onClick={onPick}
      className={`ir-card ${isP0 && !isSel ? 'ir-distress' : ''}`}
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      style={{
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: isP0 ? '20px 22px 22px' : 18, borderRadius: 14,
        cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left',
        gridColumn: isP0 ? '1 / -1' : undefined,
        background: isP0 ? 'radial-gradient(120% 90% at 0% 0%,rgba(255,51,85,.22),transparent 55%),#0d0306' : 'linear-gradient(180deg,#07100b,#030604)',
        border: `1px solid ${isP0 ? 'rgba(255,51,85,.7)' : alpha(sc, 0.45)}`,
        transform: isSel ? 'translateZ(40px) rotateX(-7deg)' : 'translateZ(0)',
        boxShadow: isSel ? `0 0 0 2px ${sc}, 0 0 44px ${alpha(sc, 0.45)}, 0 30px 50px rgba(0,0,0,.7)` : isP0 ? undefined : `0 0 20px ${alpha(sc, 0.12)}, 0 18px 30px rgba(0,0,0,.55)`,
      }}
    >
      {isP0 && (
        <>
          <span className="ir-scan" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: 'linear-gradient(180deg, transparent, rgba(255,51,85,.10), transparent)', pointerEvents: 'none' }} />
          <span style={{ position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '6px 0', background: '#ff3355', color: '#1a0006', fontFamily: DISPLAY, fontSize: 13, letterSpacing: '.3em' }}>
            <span className="ir-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a0006' }} />
            DISTRESS{money ? ' · REVENUE CRITICAL' : ''}
            <span className="ir-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a0006' }} />
          </span>
        </>
      )}

      <span style={isP0 ? { display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 30 } : { display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 300px', minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040806', border: `1px solid ${alpha(sc, 0.5)}`, boxShadow: `0 0 14px ${alpha(sc, 0.45)}` }}>
              <Icon d={I.server} size={22} color={sc} />
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: isP0 ? 26 : 19, lineHeight: 1.1, color: WHITE, textShadow: '0 0 10px rgba(233,241,255,.25)' }}>{s.title}</span>
              <span style={{ fontSize: 12, color: '#8fb3a0' }}>{s.service}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <SevPill sev={s.severity} blink={isP0} />
              <span style={{ fontSize: 11, letterSpacing: '.12em', color: DIFF_COLORS[s.difficulty] || '#a9c4b4', textTransform: 'uppercase' }}>{s.difficulty}</span>
            </span>
          </span>

          <span style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 8, background: '#070303', border: `1px solid ${alpha(sc, 0.5)}` }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="ir-blink-slow" style={{ fontFamily: DISPLAY, fontSize: 13, letterSpacing: '.22em', color: sc }}>ALERT</span>
              <span style={{ fontSize: 12, color: '#c9a0a8' }}>paged {formatTime(pagedSeconds(s) + secs)} ago</span>
            </span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {segs.map(seg => (
                <span key={seg} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,51,85,.10)', border: '1px solid rgba(255,51,85,.3)', color: '#ffd3da', fontSize: 12 }}>{seg}</span>
              ))}
            </span>
          </span>

          <span style={{ fontSize: 13, lineHeight: 1.6, color: '#c6d6cd', display: '-webkit-box', WebkitLineClamp: isP0 ? 3 : 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.context}</span>
        </span>

        <span style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 220px', minWidth: 0 }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderRadius: 8, background: '#040806', border: `1px solid ${money ? 'rgba(255,51,85,.55)' : '#12261b'}` }}>
            <span style={{ fontSize: 11, letterSpacing: '.18em', color: '#8fb3a0' }}>{imp.label}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: isP0 ? 44 : 24, lineHeight: 1.05, color: money ? '#ff3355' : WHITE, textShadow: `0 0 16px ${money ? 'rgba(255,51,85,.7)' : 'rgba(233,241,255,.3)'}` }}>
              {fmtImpact(imp, secs)}
            </span>
            {imp.sub && <span style={{ fontSize: 11, color: '#8fb3a0' }}>{imp.sub}</span>}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <ClusterGrid cells={cl.cells} cols={Math.min(cl.cells.length, 8)} scenario={s} tick={tick} />
            <svg width="110" height="34" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
              <polyline points={spark} fill="none" stroke={sc} strokeWidth="5" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </span>
    </motion.button>
  );
}

function WarRoomPanel({ s, tick, loading, error, onStart }) {
  const sc   = SEV_COLORS[s.severity] || '#ff8a3d';
  const secs = tick / 4;
  const imp  = impactOf(s);
  const cl   = clusterOf(s);
  const healthy = cl.cells.filter(c => c === 'O').length;
  const segs = alertSegments(s.alert).filter(x => /\d/.test(x)).slice(0, 3);
  const chartColors = [sc, '#ffb020', WHITE];
  const money = imp.kind === 'money';

  return (
    <>
      <motion.div key={s.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
        style={{ position: 'relative', borderRadius: 16, border: `1px solid ${alpha(sc, 0.5)}`, background: 'linear-gradient(180deg, #070c09, #030504)', padding: '18px 20px', overflow: 'hidden', boxShadow: `0 0 40px ${alpha(sc, 0.2)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <SevPill sev={s.severity} blink={s.severity === 'P0'} size={14} />
            <span style={label}>WAR ROOM</span>
          </span>
          <span style={{ fontSize: 12, color: '#8fb3a0' }}>paged {formatTime(pagedSeconds(s) + secs)} ago</span>
        </div>
        <h2 style={{ margin: '10px 0 2px', fontFamily: DISPLAY, fontWeight: 400, fontSize: 28, color: WHITE, textShadow: '0 0 14px rgba(233,241,255,.3)' }}>{s.title}</h2>
        <span style={{ fontSize: 13, color: '#8fb3a0' }}>{s.service}</span>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#040806', border: `1px solid ${money ? 'rgba(255,51,85,.55)' : '#12261b'}` }}>
            <span style={{ display: 'block', fontSize: 11, letterSpacing: '.18em', color: '#8fb3a0' }}>{imp.label}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 30, color: money ? '#ff3355' : WHITE, textShadow: `0 0 16px ${money ? 'rgba(255,51,85,.7)' : 'rgba(233,241,255,.3)'}` }}>{fmtImpact(imp, secs)}</span>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#040806', border: '1px solid #12261b' }}>
            <span style={{ display: 'block', fontSize: 11, letterSpacing: '.18em', color: '#8fb3a0' }}>CLUSTER</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 30, color: WHITE }}>{healthy}<span style={{ fontSize: 16, color: '#8fb3a0' }}> / {cl.cells.length} healthy</span></span>
          </div>
        </div>
      </motion.div>

      <div style={{ borderRadius: 16, border: '1px solid #12261b', background: '#040806', padding: '16px 18px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <span style={label}>&gt; NODE CLUSTER · {cl.label}</span>
          <Legend />
        </div>
        <ClusterGrid cells={cl.cells} cols={Math.min(cl.cells.length, 8)} scenario={s} tick={tick} big prefix={cl.prefix} />
        {cl.dep && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: STATUS[cl.dep.s].bg, border: `1px solid ${STATUS[cl.dep.s].color}` }}>
            <span className={cl.dep.s === 'D' ? 'ir-blink' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS[cl.dep.s].color, boxShadow: `0 0 10px ${STATUS[cl.dep.s].color}` }} />
            <span style={{ fontSize: 12, color: '#a9c4b4' }}>dependency</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 15, color: WHITE }}>{cl.dep.name}</span>
            <span style={{ marginLeft: 'auto', fontFamily: DISPLAY, fontSize: 14, color: STATUS[cl.dep.s].color }}>{cl.dep.note}</span>
          </div>
        )}
      </div>

      {segs.length > 0 && (
        <div style={{ borderRadius: 16, border: '1px solid #12261b', background: '#040806', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ ...label, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="ir-blink-slow" style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN }} />&gt; LIVE TELEMETRY
          </span>
          {segs.map((seg, i) => {
            const num = parseNum(seg);
            const unitMatch = seg.match(/[\d.,]+\s*(%|ms|s|x|K|\/\d+)/i);
            return (
              <LiveChart key={seg} label={seg.replace(/[$~]?[\d.,]+\s*(%|ms|x|K\/hour|K)?/i, '').replace(/\s+/g, ' ').trim() || seg}
                display={unitMatch ? unitMatch[0] : String(num)} value={num} color={chartColors[i % 3]}
                tick={tick} seed={i * 7 + (hashStr(s.id) % 13)} flat={num === 0 || /\/\s*\d+/.test(seg)} />
            );
          })}
        </div>
      )}

      <TerminalLog lines={logsOf(s)} tick={tick} title="> tail -f logs" sub={s.service} />

      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,51,85,.5)', background: 'rgba(255,51,85,.08)', color: '#ff8fa3', fontSize: 13 }}>
          <Icon d={I.alert} /> {error}
        </div>
      )}

      <motion.button type="button" onClick={onStart} disabled={loading} className="ir-btn"
        whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.985 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 58, borderRadius: 12, border: 0,
          background: sc, color: '#140006', fontFamily: DISPLAY, fontSize: 18, letterSpacing: '.16em', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
          boxShadow: `0 0 0 1px rgba(255,255,255,.25) inset, 0 12px 30px rgba(0,0,0,.6), 0 0 34px ${alpha(sc, 0.45)}`,
        }}>
        {loading ? 'TRIGGERING INCIDENT...' : 'ACK & JOIN THE BRIDGE'}
        {!loading && <Icon d={I.arrow} size={18} strokeWidth={2.5} />}
      </motion.button>
    </>
  );
}

// ── Metric Card (flashes on change, with live sparkline) ──────────────────────
function MetricCard({ label: name, value, prevValue, color, tick, seed, resolved }) {
  const changed = prevValue !== undefined && prevValue !== value;
  const num = parseNum(value);
  const c = resolved ? GREEN : changed ? color : '#e9f1ff';
  const { pts } = seriesPts(num ?? 0, tick, seed, { flat: num === null });
  return (
    <motion.div
      key={String(value)}
      animate={changed ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.35 }}
      style={{
        background: changed ? alpha(color, 0.1) : '#040806',
        border: `1px solid ${changed ? alpha(color, 0.55) : '#12261b'}`,
        borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'background .3s, border-color .3s',
      }}
    >
      <div style={{ color: c, fontFamily: DISPLAY, fontSize: 16, lineHeight: 1.2, textShadow: `0 0 10px ${alpha(c === '#e9f1ff' ? '#e9f1ff' : c, 0.4)}`, wordBreak: 'break-word' }}>{value}</div>
      <div style={{ color: '#8fb3a0', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{name}</div>
      {num !== null && (
        <svg width="100%" height="18" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={pts} fill="none" stroke={c} strokeWidth="6" strokeLinejoin="round" opacity=".8" />
        </svg>
      )}
    </motion.div>
  );
}

function Avatar({ name, color, size = 28, ring }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: alpha(color, 0.14), border: `2px solid ${color}`, boxShadow: ring ? `0 0 12px ${alpha(color, 0.5)}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontSize: Math.round(size * 0.38), color: WHITE }}>
      {initials(name)}
    </div>
  );
}

// ── Incident Response Screen ──────────────────────────────────────────────────
function IncidentScreen({ session, user, onComplete, completing, completeError, audioOn, onToggleAudio, setAlarm }) {
  const [messages,    setMessages]    = useState(session.messages || []);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [metrics,     setMetrics]     = useState(session.scenario.metrics || {});
  const [prevMetrics, setPrevMetrics] = useState({});
  const [elapsed,     setElapsed]     = useState(0);
  const [resolved,    setResolved]    = useState(false);
  const [typingWho,   setTypingWho]   = useState(null);
  const [newMsgIds,   setNewMsgIds]   = useState(new Set());
  const [tick,        setTick]        = useState(0);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  const scenario  = session.scenario;
  const sevColor  = SEV_COLORS[scenario.severity] || '#ff8a3d';
  const teammates = session.teammates || [];
  const cl        = useMemo(() => clusterOf(scenario), [scenario]);
  const cells     = resolved ? cl.cells.map(() => 'O') : cl.cells;
  const imp       = useMemo(() => impactOf(scenario), [scenario]);
  const resolvedAtRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    const t2 = setInterval(() => setTick(t => t + 1), 500);
    return () => { clearInterval(id); clearInterval(t2); };
  }, []);

  useEffect(() => { setAlarm({ sev: scenario.severity, active: !resolved }); }, [resolved, scenario.severity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingWho]);

  const sendAction = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const userMsg = { id: `msg-${Date.now()}-user`, from: 'user', text, timestamp: new Date().toISOString(), type: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setNewMsgIds(prev => new Set([...prev, userMsg.id]));

    const randomTeammate = teammates[Math.floor(Math.random() * teammates.length)];
    if (randomTeammate) setTypingWho(randomTeammate);

    try {
      const res = await axios.post(`${API_BASE}/incident/${session.sessionId}/action`, { userId: user?.uid, text });
      setTypingWho(null);

      if (res.data.messages) {
        const teammateResponses = res.data.messages.filter(m => m.type === 'teammate');
        const ids = new Set(teammateResponses.map(m => m.id));
        setNewMsgIds(prev => new Set([...prev, ...ids]));

        for (let i = 0; i < teammateResponses.length; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 400 : 700));
          setMessages(prev => [...prev, teammateResponses[i]]);
          if (i < teammateResponses.length - 1) {
            const next = teammates.find(t => t.id === teammateResponses[i + 1]?.from);
            if (next) setTypingWho(next);
            await new Promise(r => setTimeout(r, 500));
            setTypingWho(null);
          }
        }
      }

      if (res.data.metricsUpdate && Object.keys(res.data.metricsUpdate).length > 0) {
        setPrevMetrics(metrics);
        setMetrics(prev => ({ ...prev, ...res.data.metricsUpdate }));
      }

      if (res.data.resolved) {
        resolvedAtRef.current = elapsed;
        setResolved(true);
      }
    } catch (e) {
      console.error('Incident action error:', e);
      setTypingWho(null);
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, type: 'system', text: 'Action failed to send. Check your connection and retry.' }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, session.sessionId, user?.uid, teammates, metrics, elapsed]);

  const accent = resolved ? GREEN : sevColor;
  const impactSecs = resolved ? (resolvedAtRef.current ?? elapsed) : elapsed;

  return (
    <div style={{ height: '100vh', background: '#030504', color: '#e9f1ff', fontFamily: MONO, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      <EmergencyLighting color={sevColor} calm={resolved} />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 2, minHeight: 64, background: 'rgba(5,9,7,.92)', borderBottom: `2px solid ${alpha(accent, 0.55)}`, boxShadow: `0 0 24px ${alpha(accent, 0.2)}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span className={resolved ? '' : 'ir-blink'} style={{ width: 12, height: 12, borderRadius: '50%', background: accent, boxShadow: `0 0 14px ${accent}`, flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, color: WHITE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scenario.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <SevPill sev={scenario.severity} size={12} blink={!resolved && scenario.severity === 'P0'} />
              <span style={{ color: '#8fb3a0' }}>{scenario.service}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: '#050c08', border: '1px solid #1d3a2a' }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#6fa486' }}>T+</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 20, color: GREEN }}>{formatTime(elapsed)}</span>
          </div>
          {resolved && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(57,255,136,.12)', border: `1px solid ${GREEN}`, color: GREEN, fontFamily: DISPLAY, fontSize: 14, letterSpacing: '.12em' }}>
              <Icon d={I.check} size={14} strokeWidth={2.6} /> RESOLVED
            </span>
          )}
          <span className="ir-hide-sm"><AudioToggle on={audioOn} onToggle={onToggleAudio} /></span>
          <button type="button" onClick={onComplete} disabled={completing} className="ir-btn"
            style={{ minHeight: 44, padding: '0 16px', borderRadius: 8, border: 0, background: accent, color: '#06100a', fontFamily: DISPLAY, fontSize: 15, letterSpacing: '.12em', cursor: completing ? 'wait' : 'pointer', opacity: completing ? 0.7 : 1, boxShadow: `0 0 18px ${alpha(accent, 0.45)}` }}>
            {completing ? 'WRITING POSTMORTEM...' : resolved ? 'VIEW POSTMORTEM' : 'END INCIDENT'}
          </button>
        </div>
      </div>

      {/* Alert banner */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', background: alpha(accent, 0.08), borderBottom: `1px solid ${alpha(accent, 0.35)}`, padding: '8px 18px', flexShrink: 0 }}>
        <span className={resolved ? '' : 'ir-blink-slow'} style={{ fontFamily: DISPLAY, fontSize: 13, letterSpacing: '.22em', color: accent }}>{resolved ? 'RECOVERED' : 'ALERT'}</span>
        <span style={{ flex: '1 1 300px', fontSize: 12, color: resolved ? '#a9c4b4' : '#ffd3da', textDecoration: resolved ? 'line-through' : 'none' }}>{alertSegments(scenario.alert).join('  |  ')}</span>
        {imp.kind !== 'time' && (
          <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: '.16em', color: '#8fb3a0' }}>{imp.label}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 22, color: imp.kind === 'money' && !resolved ? '#ff3355' : WHITE, textShadow: imp.kind === 'money' && !resolved ? '0 0 14px rgba(255,51,85,.7)' : 'none' }}>
              {fmtImpact(imp, impactSecs, false)}
            </span>
          </span>
        )}
        {completeError && (
          <span role="alert" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ff8fa3' }}><Icon d={I.alert} size={13} /> {completeError}</span>
        )}
      </div>

      {/* Body */}
      <div className="ir-body" style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Left: status */}
        <div className="ir-side ir-scroll" style={{ width: 320, borderRight: '1px solid #12261b', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'rgba(4,8,6,.92)', overflowY: 'auto' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #12261b' }}>
            <div style={{ ...label, marginBottom: 10 }}>&gt; SYSTEM STATUS</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(metrics).map(([k, v], i) => (
                <MetricCard key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={v} prevValue={prevMetrics[k]} color={scenario.color || sevColor} tick={tick} seed={i * 11} resolved={resolved} />
              ))}
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderBottom: '1px solid #12261b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
              <span style={label}>&gt; {cl.label}</span>
              <span style={{ fontSize: 11, color: '#a9c4b4' }}>{cells.filter(c => c === 'O').length}/{cells.length} healthy</span>
            </div>
            <ClusterGrid cells={cells} cols={Math.min(cells.length, 4)} scenario={scenario} tick={tick} big prefix={cl.prefix} />
            {cl.dep && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: STATUS[resolved ? 'O' : cl.dep.s].bg, border: `1px solid ${STATUS[resolved ? 'O' : cl.dep.s].color}`, fontSize: 12 }}>
                <span className={!resolved && cl.dep.s === 'D' ? 'ir-blink' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS[resolved ? 'O' : cl.dep.s].color }} />
                <span style={{ fontFamily: DISPLAY, color: WHITE }}>{cl.dep.name}</span>
                <span style={{ marginLeft: 'auto', fontFamily: DISPLAY, color: STATUS[resolved ? 'O' : cl.dep.s].color }}>{resolved ? 'HEALTHY' : cl.dep.note}</span>
              </div>
            )}
          </div>

          <div style={{ padding: '14px 16px', borderBottom: '1px solid #12261b' }}>
            <div style={{ ...label, marginBottom: 10 }}>&gt; ON THE BRIDGE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name="I C" color="#b18cff" size={32} ring />
                <div>
                  <div style={{ color: WHITE, fontSize: 13, fontWeight: 700 }}>You</div>
                  <div style={{ color: GREEN, fontSize: 11 }}>● Incident Commander</div>
                </div>
              </div>
              {teammates.map(t => {
                const typing = typingWho?.id === t.id;
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={t.name} color={t.color || '#8fb3a0'} size={32} ring={typing} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: WHITE, fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                      <div style={{ color: typing ? (t.color || GREEN) : GREEN, fontSize: 11 }}>{typing ? '● typing...' : `● ${t.role || 'Online'}`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '14px 16px' }}>
            <div style={{ ...label, marginBottom: 8 }}>&gt; CONTEXT</div>
            <p style={{ color: '#c6d6cd', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{scenario.context}</p>
          </div>
        </div>

        {/* Right: incident channel */}
        <div className="ir-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'rgba(3,5,4,.75)' }}>
          <div style={{ padding: '10px 18px', borderBottom: '1px solid #12261b', background: 'rgba(5,9,7,.9)', flexShrink: 0, fontSize: 13, color: '#a9c4b4' }}>
            <span style={{ color: accent, fontWeight: 700 }}>#{scenario.id}-incident</span> · Type actions and decisions to coordinate the response
          </div>

          <div className="ir-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.map(msg => {
              if (msg.type === 'system') {
                return (
                  <div key={msg.id} role="alert" style={{ alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, margin: '6px 0 12px', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255,51,85,.4)', background: 'rgba(255,51,85,.08)', color: '#ff8fa3', fontSize: 12 }}>
                    <Icon d={I.alert} size={13} /> {msg.text}
                  </div>
                );
              }
              const isUser   = msg.type === 'user';
              const teammate = !isUser && teammates.find(t => t.id === msg.from);
              const tc       = teammate?.color || '#8fb3a0';
              const isNew    = newMsgIds.has(msg.id);
              return (
                <motion.div key={msg.id}
                  initial={isNew ? { opacity: 0, y: 8 } : { opacity: 1, y: 0 }}
                  animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'flex-end', gap: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 10 }}
                >
                  {!isUser && <Avatar name={teammate?.name || 'Bot'} color={tc} size={32} />}
                  <div style={{ maxWidth: 'min(74%, 640px)' }}>
                    {!isUser && (
                      <div style={{ color: tc, fontSize: 12, fontWeight: 700, marginBottom: 4, marginLeft: 2 }}>{teammate?.name || 'system'}</div>
                    )}
                    <div style={{
                      background: isUser ? 'rgba(57,255,136,.08)' : '#07100b',
                      border: `1px solid ${isUser ? 'rgba(57,255,136,.4)' : alpha(tc, 0.3)}`,
                      borderRadius: isUser ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
                      padding: '9px 13px', color: isUser ? '#d9ffe8' : '#e3ece7', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {isUser && <span style={{ color: GREEN, marginRight: 6 }}>&gt;</span>}{msg.text}
                    </div>
                  </div>
                  {isUser && (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(57,255,136,.12)', border: `2px solid ${GREEN}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontSize: 12, color: GREEN }}>IC</div>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {typingWho && (
                <motion.div key="typing" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar name={typingWho.name} color={typingWho.color || '#8fb3a0'} size={30} ring />
                  <div style={{ background: '#07100b', border: `1px solid ${alpha(typingWho.color || '#8fb3a0', 0.3)}`, borderRadius: '10px 10px 10px 3px', padding: '9px 14px', display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: typingWho.color || GREEN }} />
                    ))}
                  </div>
                  <span style={{ color: '#8fb3a0', fontSize: 12 }}>{typingWho.name} is typing...</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #12261b', background: 'rgba(5,9,7,.95)', flexShrink: 0 }}>
            {resolved && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(57,255,136,.08)', border: `1px solid ${alpha(GREEN, 0.4)}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: GREEN, fontSize: 13, fontWeight: 700 }}>
                <Icon d={I.check} size={14} strokeWidth={2.6} /> Incident resolved. Open the postmortem to see your assessment.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: DISPLAY, fontSize: 20, color: resolved ? '#4f7a62' : GREEN }} aria-hidden="true">&gt;</span>
              <label htmlFor="ir-input" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Your action or decision</label>
              <input id="ir-input" ref={inputRef} className="ir-input"
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAction(); } }}
                placeholder="check the deploy logs  |  roll back to v2.4.0  |  kill the cron job"
                disabled={resolved}
                style={{
                  flex: 1, minWidth: 0, height: 46, background: '#020403', borderRadius: 8, padding: '0 14px', color: '#e9f1ff', fontSize: 14, outline: 'none', fontFamily: MONO,
                  border: `1px solid ${input.trim() ? alpha(accent, 0.6) : '#1d3a2a'}`,
                  boxShadow: input.trim() ? `0 0 14px ${alpha(accent, 0.18)}` : 'none',
                  transition: 'border-color .15s ease, box-shadow .15s ease', opacity: resolved ? 0.4 : 1,
                }}
              />
              <button type="button" onClick={sendAction} disabled={!input.trim() || sending || resolved} aria-label="Send action" className="ir-btn"
                style={{
                  height: 46, padding: '0 18px', borderRadius: 8, border: 0, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontFamily: DISPLAY, fontSize: 15, letterSpacing: '.12em',
                  background: input.trim() && !sending && !resolved ? accent : '#0d1712',
                  color: input.trim() && !sending && !resolved ? '#06100a' : '#4f7a62',
                  cursor: input.trim() && !sending && !resolved ? 'pointer' : 'not-allowed',
                }}>
                {sending ? '...' : <>EXEC <Icon d={I.send} size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Postmortem Screen ─────────────────────────────────────────────────────────
function PostmortemScreen({ postmortem, session, durationMin, onRedo, onHome }) {
  const scenario = session.scenario;
  const sevColor = SEV_COLORS[scenario.severity] || '#ff8a3d';
  const verdictColors = { 'Exceptional IC': GREEN, 'Solid IC': '#b18cff', 'Needs Practice': '#ffb020', 'Escalate Next Time': '#ff3355' };
  const verdictColor = verdictColors[postmortem?.verdict] || sevColor;
  const score = postmortem?.overallScore;
  const xpEarned = score > 0 ? Math.round(score * 0.25) : 0;

  const scores = [
    { label: 'Command',       value: postmortem?.commandScore,       color: '#b18cff' },
    { label: 'Diagnosis',     value: postmortem?.diagnosisScore,     color: '#ff8a3d' },
    { label: 'Communication', value: postmortem?.communicationScore, color: '#5ab0ff' },
    { label: 'Speed',         value: postmortem?.speedScore,         color: GREEN },
  ].filter(s => typeof s.value === 'number');

  return (
    <div style={{ ...shell, padding: '40px 16px' }}>
      <EmergencyLighting calm />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', maxWidth: 760, margin: '0 auto', background: 'linear-gradient(180deg,#050b08,#020403)', border: '1px solid #1d3a2a', borderRadius: 18, padding: 'clamp(20px, 4vw, 34px)', boxShadow: '0 0 50px rgba(57,255,136,.08), 0 40px 80px rgba(0,0,0,.6)' }}>

        <div style={{ fontSize: 13, color: GREEN, marginBottom: 14 }}>
          oncall@evoworld:~$ <span style={{ color: '#e9f1ff' }}>postmortem --incident {scenario.id}</span>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 className="ir-flicker" style={{ margin: '0 0 8px', fontFamily: DISPLAY, fontWeight: 400, fontSize: 'clamp(26px, 4vw, 38px)', letterSpacing: '.06em', color: WHITE, textShadow: '0 0 16px rgba(233,241,255,.3)' }}>POST-INCIDENT REVIEW</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <SevPill sev={scenario.severity} size={13} />
            <span style={{ color: '#c6d6cd', fontSize: 13 }}>{scenario.title}</span>
            <span style={{ color: '#8fb3a0', fontSize: 12 }}>· {durationMin} min</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 24 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, delay: 0.2 }}
            style={{ width: 110, height: 110, borderRadius: '50%', background: alpha(verdictColor, 0.08), border: `3px solid ${verdictColor}`, boxShadow: `0 0 30px ${alpha(verdictColor, 0.4)}, inset 0 0 20px ${alpha(verdictColor, 0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ color: verdictColor, fontFamily: DISPLAY, fontSize: 40, lineHeight: 1 }}>{score ?? '--'}</span>
            <span style={{ color: verdictColor, fontSize: 10, letterSpacing: '.18em', marginTop: 4 }}>SCORE</span>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: DISPLAY, color: verdictColor, fontSize: 24 }}>{postmortem?.verdict}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: postmortem?.correctlyIdentified ? GREEN : '#ff3355', fontSize: 13 }}>
              <Icon d={postmortem?.correctlyIdentified ? I.check : I.cross} size={14} strokeWidth={2.6} />
              {postmortem?.correctlyIdentified ? 'Root cause identified' : 'Root cause missed'}
            </span>
            {postmortem?.ttr && <span style={{ color: '#a9c4b4', fontSize: 13 }}>TTR: <span style={{ fontFamily: DISPLAY, color: WHITE }}>{postmortem.ttr}</span></span>}
            {xpEarned > 0 && <span style={{ fontFamily: DISPLAY, fontSize: 16, color: '#c4b5fd' }}>+{xpEarned} XP</span>}
          </div>
        </div>

        {scores.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...label, marginBottom: 12 }}>&gt; PERFORMANCE BREAKDOWN</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
              {scores.map(s => (
                <div key={s.label} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #12261b', background: '#040806' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#c6d6cd', fontSize: 13 }}>{s.label}</span>
                    <span style={{ color: s.color, fontFamily: DISPLAY, fontSize: 15 }}>{s.value}</span>
                  </div>
                  <div style={{ height: 8, background: '#0d1712', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.value || 0}%` }} transition={{ duration: 0.8, delay: 0.3 }}
                      style={{ height: '100%', background: s.color, boxShadow: `0 0 10px ${alpha(s.color, 0.5)}`, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {postmortem?.summary && (
          <div style={{ background: '#040806', border: '1px solid #12261b', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ ...label, marginBottom: 6 }}>&gt; SUMMARY</div>
            <div style={{ color: '#d6e6dc', fontSize: 14, lineHeight: 1.7 }}>{postmortem.summary}</div>
          </div>
        )}

        {((postmortem?.whatWentWell || []).length > 0 || (postmortem?.whatToImprove || []).length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 14 }}>
            <div style={{ background: 'rgba(57,255,136,.05)', border: '1px solid rgba(57,255,136,.25)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ ...label, marginBottom: 8 }}>WENT WELL</div>
              {(postmortem?.whatWentWell || []).map((s, i) => (
                <div key={i} style={{ color: '#d6e6dc', fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <Icon d={I.plus} size={14} color={GREEN} strokeWidth={2.6} style={{ marginTop: 2 }} />{s}
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,176,32,.05)', border: '1px solid rgba(255,176,32,.25)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ ...label, color: '#ffb020', marginBottom: 8 }}>IMPROVE</div>
              {(postmortem?.whatToImprove || []).map((s, i) => (
                <div key={i} style={{ color: '#d6e6dc', fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, lineHeight: 1.5 }}>
                  <Icon d={I.arrow} size={14} color="#ffb020" strokeWidth={2.4} style={{ marginTop: 2 }} />{s}
                </div>
              ))}
            </div>
          </div>
        )}

        {postmortem?.rootCauseExplained && (
          <div style={{ background: alpha(sevColor, 0.06), border: `1px solid ${alpha(sevColor, 0.35)}`, borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ ...label, color: sevColor, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Icon d={I.search} size={14} /> ROOT CAUSE</div>
            <div style={{ color: '#e3ece7', fontSize: 14, lineHeight: 1.65 }}>{postmortem.rootCauseExplained}</div>
          </div>
        )}

        {postmortem?.correctSteps && (
          <div style={{ background: 'rgba(90,176,255,.06)', border: '1px solid rgba(90,176,255,.35)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <div style={{ ...label, color: '#5ab0ff', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><Icon d={I.doc} size={14} /> IDEAL RESOLUTION PATH</div>
            <div style={{ color: '#e3ece7', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{postmortem.correctSteps}</div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="ir-btn" onClick={onRedo}
            style={{ flex: '1 1 200px', minHeight: 50, background: '#050c08', border: '1px solid #1d3a2a', borderRadius: 10, color: '#b9f5d0', cursor: 'pointer', fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>
            Another incident
          </button>
          <button type="button" className="ir-btn" onClick={onHome}
            style={{ flex: '1 1 200px', minHeight: 50, background: GREEN, border: 0, borderRadius: 10, color: '#03140a', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 16, letterSpacing: '.12em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 24px rgba(57,255,136,.35)' }}>
            BACK TO WORLD <Icon d={I.arrow} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function IncidentResponse({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,         setPhase]         = useState('select');
  const [session,       setSession]       = useState(null);
  const [postmortem,    setPostmortem]    = useState(null);
  const [durationMin,   setDurationMin]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [startError,    setStartError]    = useState(null);
  const [completing,    setCompleting]    = useState(false);
  const [completeError, setCompleteError] = useState(null);
  const [audioOn,       setAudioOn]       = useState(false);
  const [alarm,         setAlarm]         = useState({ sev: 'P1', active: false });
  const audioCtxRef   = useRef(null);
  const completingRef = useRef(false);

  useEffect(() => {
    if (document.querySelector('link[data-ir-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-ir-fonts', '1');
    document.head.appendChild(link);
  }, []);

  // ── Tactical audio: created inside the click so browsers allow playback ──
  const toggleAudio = () => {
    if (!audioOn) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          audioCtxRef.current = audioCtxRef.current || new AC();
          audioCtxRef.current.resume?.();
        }
      } catch (_) {}
    }
    setAudioOn(on => !on);
  };

  useEffect(() => {
    if (!audioOn || !alarm.active || phase === 'postmortem') return undefined;
    const beep = () => {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      try {
        const t0 = ctx.currentTime;
        const tones = alarm.sev === 'P0' ? [988, 740] : [660, 520];
        tones.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0 + i * 0.16);
          g.gain.exponentialRampToValueAtTime(0.05, t0 + i * 0.16 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.16 + 0.13);
          o.connect(g); g.connect(ctx.destination);
          o.start(t0 + i * 0.16); o.stop(t0 + i * 0.16 + 0.15);
        });
      } catch (_) {}
    };
    beep();
    const id = setInterval(beep, alarm.sev === 'P0' ? 1500 : 2400);
    return () => clearInterval(id);
  }, [audioOn, alarm.sev, alarm.active, phase]);

  useEffect(() => () => { try { audioCtxRef.current?.close?.(); } catch (_) {} }, []);

  const startIncident = async (scenarioId) => {
    setLoading(true);
    setStartError(null);
    try {
      const res = await axios.post(`${API_BASE}/incident/start`, { userId: user?.uid, scenarioId });
      if (!res.data.success) throw new Error(res.data.error);
      setSession(res.data);
      setPhase('incident');
    } catch (e) {
      console.error(e);
      setStartError(e.response?.data?.error || e.message || 'Could not trigger this incident. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const completeIncident = async () => {
    if (!session?.sessionId || completingRef.current) return;
    completingRef.current = true;
    setCompleting(true);
    setCompleteError(null);
    try {
      const res = await axios.post(`${API_BASE}/incident/${session.sessionId}/complete`, { userId: user?.uid });
      if (res.data.success) {
        setPostmortem(res.data.postmortem);
        setDurationMin(res.data.durationMin);
        setPhase('postmortem');
        if (setUserData && res.data.postmortem?.overallScore > 0) {
          const xp = Math.round(res.data.postmortem.overallScore * 0.25);
          setUserData(prev => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + xp }));
        }
      } else {
        setCompleteError('Postmortem failed to generate. Try again.');
      }
    } catch (e) {
      console.error(e);
      setCompleteError('Postmortem failed to generate. Try again.');
    } finally {
      setCompleting(false);
      completingRef.current = false;
    }
  };

  const reset = () => { setPhase('select'); setSession(null); setPostmortem(null); setCompleteError(null); };

  let screen;
  if (phase === 'select') {
    screen = (
      <ScenarioSelector onStart={startIncident} loading={loading} error={startError} onBack={() => navigate('/world')}
        audioOn={audioOn} onToggleAudio={toggleAudio} setAlarm={setAlarm} />
    );
  } else if (phase === 'incident' && session) {
    screen = (
      <IncidentScreen session={session} user={user} onComplete={completeIncident} completing={completing} completeError={completeError}
        audioOn={audioOn} onToggleAudio={toggleAudio} setAlarm={setAlarm} />
    );
  } else if (phase === 'postmortem' && postmortem) {
    screen = <PostmortemScreen postmortem={postmortem} session={session} durationMin={durationMin} onRedo={reset} onHome={() => navigate('/world')} />;
  } else {
    screen = (
      <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 18, letterSpacing: '.2em', color: GREEN }}>LOADING<span className="ir-caret">_</span></span>
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

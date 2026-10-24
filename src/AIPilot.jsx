import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import API_BASE from './config';
import { auth } from './firebase';

// ── Theme (same language as Code Review Battle) ──────────────────────────────
const DISPLAY = "'Oxanium', sans-serif";
const BODY    = "'IBM Plex Sans', system-ui, sans-serif";
const MONO    = "'JetBrains Mono', 'Fira Code', ui-monospace, monospace";
const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Oxanium:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap';

const C = {
  bg: '#06080c', panel: '#0a0f17', panel2: '#0d131d', line: '#1c2636', line2: '#243045',
  text: '#dfe5ee', dim: '#8f9bae', faint: '#5d6a80',
  cyan: '#5ad8ff', green: '#3ddc97', amber: '#ffb020', red: '#ff4d5e', violet: '#a78bfa', pink: '#f472b6', orange: '#fb923c',
};
const TYPE_META = {
  review:        { label: 'REVIEW',        color: C.cyan,   hint: 'Find and fix what the AI got wrong' },
  hallucination: { label: 'HALLUCINATION', color: C.violet, hint: 'The AI invented an API that does not exist' },
  steer:         { label: 'STEER',         color: C.green,  hint: 'Guide the copilot to a correct, fast answer' },
  codebase:      { label: 'CODEBASE',      color: C.pink,   hint: 'Several files, one lying doc. Read before you fix' },
  'ai-product':  { label: 'AI PRODUCT',    color: C.orange, hint: 'Fix a product built on a language model' },
  boss:          { label: 'FINALE',        color: C.red,    hint: 'Everything at once, under pressure' },
};
const DIMENSIONS = [
  { key: 'correctness',  label: 'Correctness',  desc: 'Hidden and visible tests passing' },
  { key: 'diagnosis',    label: 'Diagnosis',    desc: 'Problems you named in your review notes' },
  { key: 'reasoning',    label: 'Reasoning',    desc: 'Case File and the copilot-off debrief' },
  { key: 'verification', label: 'Verification', desc: 'Testing AI output before trusting it' },
  { key: 'steering',     label: 'Steering',     desc: 'How well you briefed the copilot' },
  { key: 'efficiency',   label: 'Efficiency',   desc: 'AI calls and time against par' },
];
const WEIGHTS = { correctness: 35, diagnosis: 15, reasoning: 15, verification: 15, steering: 12, efficiency: 8 };
const WEIGHTS_DEEP = { correctness: 30, diagnosis: 10, reasoning: 25, verification: 15, steering: 12, efficiency: 8 };
const weightsFor = (type) => (type === 'codebase' || type === 'ai-product' ? WEIGHTS_DEEP : WEIGHTS);
const ACTIVE_KEY = 'aiPilot.activeSession';

const FALLBACK_CAST = {
  nova:   { name: 'NOVA', role: 'Your AI copilot', color: '#5ad8ff', initials: 'NV' },
  priya:  { name: 'Priya Raman', role: 'Squad lead', color: '#a78bfa', initials: 'PR' },
  kabir:  { name: 'Kabir Sethi', role: 'Veteran engineer', color: '#ffb020', initials: 'KS' },
  mei:    { name: 'Mei Tanaka', role: 'SRE', color: '#3ddc97', initials: 'MT' },
  marcus: { name: 'Marcus Hale', role: 'Director', color: '#ff6b7a', initials: 'MH' },
  oracle: { name: 'oracle-7', role: 'Unknown reviewer', color: '#8f9bae', initials: '07', log: true },
};

const STYLE = `
.aip-silver{background:linear-gradient(180deg,#ffffff 0%,#e3e8ef 42%,#8e98a8 52%,#d9dfe8 72%,#f4f6f9 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes aipBlink{0%,49%{opacity:1}50%,100%{opacity:.2}}
@keyframes aipShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes aipGrain{0%,100%{transform:translate(0,0)}25%{transform:translate(-2%,1%)}50%{transform:translate(1%,-2%)}75%{transform:translate(2%,2%)}}
@keyframes aipCaret{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes aipFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.aip-blink{animation:aipBlink 1.2s steps(1) infinite}
.aip-caret{display:inline-block;width:.55em;height:1em;background:currentColor;vertical-align:-2px;margin-left:2px;animation:aipCaret 1s steps(1) infinite}
.aip-skel{background:linear-gradient(90deg,#0d131d 0,#162030 50%,#0d131d 100%);background-size:800px 100%;animation:aipShimmer 1.4s linear infinite}
.aip-grain{position:absolute;inset:-10%;pointer-events:none;opacity:.06;background-image:repeating-radial-gradient(circle at 17% 32%,#fff 0 1px,transparent 1px 3px);animation:aipGrain .6s steps(2) infinite}
.aip-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px)}
.aip-float{animation:aipFloat 5s ease-in-out infinite}
.aip-btn{transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease}
.aip-btn:active{transform:translateY(1px)}
.aip-btn:focus-visible,.aip-card:focus-visible,.aip-tab:focus-visible,.aip-opt:focus-within{outline:2px solid #5ad8ff;outline-offset:2px}
.aip-btn:disabled{opacity:.45;cursor:not-allowed}
.aip-card{transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .2s ease,box-shadow .2s ease}
.aip-card:hover{transform:translateY(-3px);border-color:#3a4a63}
.aip-scroll{scrollbar-width:thin;scrollbar-color:#243045 transparent}
.aip-md p{margin:0 0 8px}
.aip-ws{display:grid;grid-template-columns:320px minmax(0,1fr) 360px;height:calc(100vh - 58px)}
.aip-pane{display:flex;min-width:0;min-height:0;overflow:hidden}
.aip-mtabs{display:none}
.aip-mobile-files{display:none}
.aip-rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,250px);gap:12px;overflow-x:auto;padding:4px 2px 14px;scroll-snap-type:x mandatory}
.aip-rail>*{scroll-snap-align:start}
@media (max-width:1100px){.aip-ws{grid-template-columns:280px minmax(0,1fr) 320px}}
@media (max-width:900px){
  .aip-ws{display:block;height:auto}
  .aip-pane{display:none;height:calc(100vh - 106px)}
  .aip-pane.aip-on{display:flex}
  .aip-mtabs{display:flex}
  .aip-hide-sm{display:none !important}
  .aip-explorer{display:none !important}
  .aip-mobile-files{display:block}
}
@media (prefers-reduced-motion:reduce){.aip-blink,.aip-skel,.aip-grain,.aip-caret,.aip-float{animation:none}.aip-card:hover{transform:none}}
`;

// ── Small helpers ────────────────────────────────────────────────────────────
function Icon({ d, size = 16, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
const I = {
  back:  'M15 18l-6-6 6-6',
  play:  'M7 4l13 8-13 8z',
  check: 'M5 12l5 5 9-10',
  cross: 'M6 6l12 12 M18 6L6 18',
  send:  'M4 12l16-8-6 16-2.5-6.5z',
  clock: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
  doc:   'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  lock:  'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z',
  copy:  'M9 9h11v11H9z M5 15V4h11',
  flag:  'M5 21V4 M5 4h11l-2 4 2 4H5',
  eye:   'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
  skip:  'M5 5l9 7-9 7z M18 5v14',
  folder:'M3 7h6l2 2h10v10H3z',
  case:  'M4 7h16v12H4z M9 7V5h6v2 M4 12h16',
};

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
const scoreColor = (n) => (n >= 80 ? C.green : n >= 60 ? C.cyan : n >= 40 ? C.amber : C.red);
const pick = (arr) => (arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : null);
const pad2 = (n) => String(n).padStart(2, '0');
const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const langFor = (name) => (/\.md$/.test(name) ? 'markdown' : /\.json$/.test(name) ? 'json' : 'javascript');
const baseName = (name) => String(name).split('/').pop();
const store = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del: (k) => { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  json: (k, fallback) => { try { const v = JSON.parse(window.localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } },
};

async function authHeaders() {
  const u = auth.currentUser;
  if (!u) return {};
  return { Authorization: 'Bearer ' + (await u.getIdToken()) };
}
async function api(method, path, data) {
  const headers = await authHeaders();
  const res = await axios({ method, url: API_BASE + '/ai-pilot' + path, data, headers });
  return res.data;
}
const errMsg = (e, fallback) => (e && e.response && e.response.data && e.response.data.error) || fallback;

/** Line diff (LCS). Files here are small, so O(n*m) is fine. */
function lineDiff(a, b) {
  const A = String(a).split('\n');
  const B = String(b).split('\n');
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ t: ' ', s: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', s: A[i] }); i++; }
    else { out.push({ t: '+', s: B[j] }); j++; }
  }
  while (i < n) out.push({ t: '-', s: A[i++] });
  while (j < m) out.push({ t: '+', s: B[j++] });
  return out;
}

function Chip({ color, children, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 999, border: `1px solid ${color}55`, background: `${color}14`, color, fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', whiteSpace: 'nowrap', ...style }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, disabled, kind = 'ghost', style, title, type = 'button' }) {
  const kinds = {
    ghost:   { background: '#0c1119', border: `1px solid ${C.line2}`, color: '#c9d1dc' },
    primary: { background: `linear-gradient(180deg,${C.cyan},#2bb3e0)`, border: '1px solid #8ee6ff', color: '#04121a', fontWeight: 700 },
    danger:  { background: `${C.red}18`, border: `1px solid ${C.red}66`, color: '#ff8c97', fontWeight: 600 },
    good:    { background: `${C.green}18`, border: `1px solid ${C.green}66`, color: C.green, fontWeight: 600 },
  };
  return (
    <button type={type} className="aip-btn" onClick={onClick} disabled={disabled} title={title}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 38, padding: '0 14px', borderRadius: 10, fontFamily: BODY, fontSize: 13, cursor: 'pointer', ...kinds[kind], ...style }}>
      {children}
    </button>
  );
}

function SectionLabel({ children, style }) {
  return <div style={{ fontFamily: DISPLAY, color: '#95a1b3', fontSize: 11, fontWeight: 700, letterSpacing: '.18em', ...style }}>{children}</div>;
}

// ── Story pieces ─────────────────────────────────────────────────────────────
function Avatar({ who, cast, size = 40, dim, glow }) {
  const c = (cast || FALLBACK_CAST)[who] || FALLBACK_CAST.priya;
  if (c.log) {
    return (
      <span aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#05080d', border: `1px solid ${c.color}66`, color: c.color, fontFamily: MONO, fontWeight: 700, fontSize: size * 0.32, opacity: dim ? 0.4 : 1 }}>
        {c.initials}
      </span>
    );
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 30%, ${c.color}55, ${c.color}18 60%, #0b1018)`, border: `2px solid ${c.color}`, color: '#fff', fontFamily: DISPLAY, fontWeight: 800, fontSize: size * 0.34, letterSpacing: '.02em', boxShadow: glow ? `0 0 24px ${c.color}66` : 'none', opacity: dim ? 0.35 : 1, filter: dim ? 'grayscale(1)' : 'none' }}>
      {c.initials}
    </span>
  );
}

/** One line of dialogue. oracle-7 lines render as a terminal log. */
function DialogueLine({ item, cast, text, typing, large }) {
  const c = (cast || FALLBACK_CAST)[item.who] || FALLBACK_CAST.priya;
  const shown = text == null ? item.line : text;
  if (c.log) {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar who={item.who} cast={cast} size={large ? 46 : 32} />
        <div style={{ fontFamily: MONO, fontSize: large ? 15 : 12.5, lineHeight: 1.6, color: '#aeb8c8', background: '#04070b', border: `1px solid ${C.line}`, borderRadius: 8, padding: large ? '10px 14px' : '6px 10px', minWidth: 0, wordBreak: 'break-word' }}>
          <span style={{ color: C.faint }}>[{c.name}]</span> {shown}{typing && <span className="aip-caret" />}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Avatar who={item.who} cast={cast} size={large ? 46 : 32} glow={large} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: large ? 15 : 12, color: c.color, letterSpacing: '.04em' }}>{c.name}</span>
          {large && <span style={{ fontSize: 11, color: C.faint }}>{c.role}</span>}
        </div>
        <div style={{ fontSize: large ? 'clamp(16px, 2.2vw, 21px)' : 13, lineHeight: 1.55, color: large ? '#f1f4f8' : '#cfd6e0', wordBreak: 'break-word' }}>
          {shown}{typing && <span className="aip-caret" style={{ color: c.color }} />}
        </div>
      </div>
    </div>
  );
}

/** Netflix / anime style cold open: title card, then typed dialogue. */
function ColdOpen({ mission, story, onDone }) {
  const ep = mission.episode;
  const cast = (story && story.cast) || FALLBACK_CAST;
  const series = (story && story.series) || { title: 'ROLLBACK', season: 1 };
  const lines = (ep && ep.coldOpen) || [];
  const [idx, setIdx] = useState(-1); // -1 = title card, lines.length = end card
  const [chars, setChars] = useState(0);
  const reduce = useMemo(reducedMotion, []);
  const current = idx >= 0 && idx < lines.length ? lines[idx] : null;
  const full = current ? current.line.length : 0;
  const typing = !!current && chars < full;

  useEffect(() => {
    if (idx !== -1) return undefined;
    const t = setTimeout(() => setIdx(0), reduce ? 400 : 2600);
    return () => clearTimeout(t);
  }, [idx, reduce]);

  useEffect(() => {
    if (!current) return undefined;
    if (reduce) { setChars(full); return undefined; }
    setChars(0);
    const t = setInterval(() => setChars((c) => { if (c >= full) { clearInterval(t); return c; } return c + 1; }), 20);
    return () => clearInterval(t);
  }, [idx, current, full, reduce]);

  const advance = useCallback(() => {
    if (idx === -1) { setIdx(0); return; }
    if (typing) { setChars(full); return; }
    if (idx < lines.length) setIdx(idx + 1);
  }, [idx, typing, full, lines.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDone();
      else if (idx < lines.length && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) { e.preventDefault(); advance(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, onDone, idx, lines.length]);

  const atEnd = idx >= lines.length;
  return (
    <div role="dialog" aria-modal="true" aria-label={`Episode ${ep ? ep.ep : ''} cold open`} onClick={atEnd ? undefined : advance}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: '#000', color: C.text, fontFamily: BODY, overflow: 'hidden', cursor: atEnd ? 'default' : 'pointer' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 45%, ${mission.color}2e, #04060a 62%)` }} />
      <div className="aip-grain" />
      <div className="aip-scan" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '9vh', background: '#000', zIndex: 2 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '9vh', background: '#000', zIndex: 2 }} />

      <button type="button" className="aip-btn" onClick={(e) => { e.stopPropagation(); onDone(); }}
        style={{ position: 'absolute', top: 'calc(9vh + 12px)', right: 16, zIndex: 3, display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px', borderRadius: 999, border: '1px solid #ffffff33', background: '#00000066', color: '#c9d1dc', fontSize: 12, cursor: 'pointer' }}>
        Skip <Icon d={I.skip} size={12} />
      </button>

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12vh 20px', boxSizing: 'border-box' }}>
        <AnimatePresence mode="wait">
          {idx === -1 && (
            <motion.div key="title" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}
              style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: DISPLAY, letterSpacing: '.5em', fontSize: 13, color: '#8fe3ff', marginBottom: 14 }}>{series.title} · SEASON {series.season}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(14px, 2vw, 18px)', color: mission.color, fontWeight: 700, letterSpacing: '.3em', marginBottom: 6 }}>EPISODE {pad2(ep ? ep.ep : 0)}</div>
              <h1 className="aip-silver" style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(30px, 6vw, 64px)', lineHeight: 1.05, letterSpacing: '.02em' }}>{ep ? ep.title : mission.title}</h1>
              <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 13, color: C.dim, letterSpacing: '.18em' }}>{ep ? `${ep.location.toUpperCase()} · ${ep.time}` : mission.company}</div>
            </motion.div>
          )}
          {current && (
            <motion.div key={'l' + idx} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
              style={{ width: '100%', maxWidth: 760 }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint, letterSpacing: '.2em', marginBottom: 18 }}>
                {ep ? `${ep.location.toUpperCase()} · ${ep.time}` : ''} · {idx + 1}/{lines.length}
              </div>
              <DialogueLine item={current} cast={cast} text={current.line.slice(0, chars)} typing={typing} large />
              <div style={{ marginTop: 26, fontSize: 12, color: C.faint }}>{typing ? 'Click to finish the line' : 'Click, Enter or → to continue'}</div>
            </motion.div>
          )}
          {atEnd && (
            <motion.div key="end" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: 620 }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 18 }}>
                {['priya', 'kabir', 'mei', 'nova'].map((w, i) => <span key={w} className="aip-float" style={{ animationDelay: `${i * 0.4}s` }}><Avatar who={w} cast={cast} size={50} glow /></span>)}
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(22px, 3.6vw, 34px)', fontWeight: 800, marginBottom: 8 }}>Your shift starts now.</div>
              <p style={{ color: C.dim, fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>NOVA can see your files but not the brief. The squad is listening. The clock is already running.</p>
              <Btn kind="primary" onClick={onDone} style={{ minHeight: 48, padding: '0 26px', fontFamily: DISPLAY, letterSpacing: '.16em', fontSize: 15 }}>
                <Icon d={I.play} size={14} /> START SHIFT
              </Btn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Renders copilot text with fenced code blocks ─────────────────────────────
function RichText({ text, onCopy }) {
  const parts = String(text || '').split(/```[a-zA-Z]*\n?/);
  return (
    <div className="aip-md" style={{ fontSize: 13, lineHeight: 1.6, color: '#cfd6e0', wordBreak: 'break-word' }}>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <div key={i} style={{ position: 'relative', margin: '6px 0 10px' }}>
            <pre className="aip-scroll" style={{ margin: 0, background: '#05080d', border: `1px solid ${C.line}`, borderRadius: 8, padding: '10px 12px', fontFamily: MONO, fontSize: 12, lineHeight: 1.55, color: '#d6e2f0', overflowX: 'auto' }}>{p.replace(/\n$/, '')}</pre>
            <button type="button" className="aip-btn" onClick={() => onCopy(p)} title="Copy code"
              style={{ position: 'absolute', top: 6, right: 6, display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 6, border: `1px solid ${C.line2}`, background: '#0c1119', color: C.dim, fontSize: 11, cursor: 'pointer' }}>
              <Icon d={I.copy} size={12} /> Copy
            </button>
          </div>
        ) : (
          p.split(/\n{2,}/).filter((x) => x.trim()).map((para, k) => <p key={i + '-' + k} style={{ whiteSpace: 'pre-wrap' }}>{para.trim()}</p>)
        )
      )}
    </div>
  );
}

// ── Episode browser ──────────────────────────────────────────────────────────
function EpisodeBrowser({ onStart, starting, startError, onBack, resume, onResume, preselect }) {
  const [missions, setMissions] = useState(null);
  const [story, setStory] = useState(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState(preselect || null);
  const [showScoring, setShowScoring] = useState(false);
  const heroRef = useRef(null);

  const load = useCallback(() => {
    setError(false);
    setMissions(null);
    api('get', '/missions')
      .then((d) => {
        const list = (d.missions || []).slice().sort((a, b) => a.order - b.order);
        setMissions(list);
        setStory(d.story || null);
        setPicked((p) => {
          if (p && list.some((m) => m.id === p)) return p;
          const next = list.find((m) => !(m.progress && m.progress.bestScore >= 60));
          return (next || list[0] || {}).id;
        });
      })
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const choose = (id) => {
    setPicked(id);
    if (heroRef.current && heroRef.current.getBoundingClientRect().top < 0) {
      heroRef.current.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }
  };

  const sel = (missions || []).find((m) => m.id === picked);
  const series = (story && story.series) || { title: 'ROLLBACK', season: 1, seasonTitle: 'The Reviewer', tagline: '' };
  const cast = (story && story.cast) || FALLBACK_CAST;
  const totalXp = (missions || []).reduce((a, m) => a + ((m.progress && m.progress.bestXp) || 0), 0);
  const cleared = (missions || []).filter((m) => m.progress && m.progress.bestScore >= 60).length;
  const t = sel ? TYPE_META[sel.type] || TYPE_META.review : null;
  const W = sel ? weightsFor(sel.type) : WEIGHTS;
  const nextUp = (missions || []).find((m) => !(m.progress && m.progress.bestScore >= 60));

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY, position: 'relative', overflowX: 'hidden' }}>
      {/* Hero */}
      <div ref={heroRef} style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 78% 30%, ${(sel && sel.color) || C.cyan}33, transparent 55%), linear-gradient(90deg, #06080c 25%, #06080cd9 55%, #06080c66)` }} />
        <div className="aip-scan" />
        {sel && sel.episode && (
          <div aria-hidden="true" className="aip-hide-sm" style={{ position: 'absolute', right: '3vw', top: '50%', transform: 'translateY(-50%)', fontFamily: DISPLAY, fontWeight: 800, fontSize: 'min(30vw, 360px)', lineHeight: 1, color: 'transparent', WebkitTextStroke: `2px ${sel.color}55`, userSelect: 'none' }}>
            {pad2(sel.episode.ep)}
          </div>
        )}
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '18px 16px 30px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Btn onClick={onBack}><Icon d={I.back} /> Back</Btn>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, letterSpacing: '.32em', fontSize: 15, color: '#e8f8ff' }}>
                {series.title} <span style={{ color: C.cyan }}>S{series.season}</span>
                <span className="aip-hide-sm" style={{ color: C.faint, letterSpacing: '.18em', fontSize: 12, marginLeft: 10 }}>{(series.seasonTitle || '').toUpperCase()}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: `${cleared}/${(missions || []).length || 8}`, l: 'CLEARED', c: C.green }, { v: totalXp, l: 'XP', c: C.violet }].map((s) => (
                <div key={s.l} style={{ background: '#0a0f17cc', border: `1px solid ${C.line}`, borderRadius: 12, padding: '6px 12px', textAlign: 'center', minWidth: 76 }}>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 9.5, letterSpacing: '.14em', color: C.dim }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {resume && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: `${C.cyan}12`, border: `1px solid ${C.cyan}44`, borderRadius: 14, padding: '10px 14px', marginBottom: 18, maxWidth: 720 }}>
              <span style={{ fontSize: 14, color: '#bdefff' }}>Unfinished: <strong>{resume.mission.episode ? resume.mission.episode.title : resume.mission.title}</strong>. The clock is still running.</span>
              <Btn kind="primary" onClick={onResume}><Icon d={I.play} size={12} /> Resume</Btn>
            </div>
          )}

          {!sel ? (
            error ? null : <div className="aip-skel" style={{ height: 260, borderRadius: 18, maxWidth: 720 }} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={sel.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 680 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: sel.color, fontWeight: 700, letterSpacing: '.12em' }}>S{series.season}:E{sel.episode ? sel.episode.ep : sel.order}</span>
                  <Chip color={t.color}>{t.label}</Chip>
                  {sel.progress && sel.progress.bestScore >= 60 && <Chip color={C.green}>CLEARED · {sel.progress.bestGrade}</Chip>}
                  {nextUp && nextUp.id === sel.id && <Chip color={C.amber}>UP NEXT</Chip>}
                </div>
                <h1 style={{ margin: '0 0 6px', fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(28px, 4.6vw, 52px)', lineHeight: 1.04, letterSpacing: '.01em', color: '#f6f8fb' }}>{sel.episode ? sel.episode.title : sel.title}</h1>
                <div style={{ fontFamily: MONO, fontSize: 12, color: C.dim, letterSpacing: '.14em', marginBottom: 14 }}>
                  {sel.badge} {sel.episode ? `${sel.episode.location.toUpperCase()} · ${sel.episode.time}` : sel.company.toUpperCase()}
                </div>
                <p style={{ color: '#c9d1dc', fontSize: 15, lineHeight: 1.65, margin: '0 0 16px' }}>{sel.brief}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontFamily: MONO, fontSize: 12, color: C.dim, marginBottom: 18 }}>
                  <span>{sel.difficulty.toUpperCase()}</span><span>{sel.timeLimitMin} MIN</span><span>{sel.xp} XP</span>
                  <span>{sel.fileCount} FILE{sel.fileCount === 1 ? '' : 'S'}</span><span>{sel.hiddenTestCount} HIDDEN TESTS</span>
                  {sel.hasTrace && <span style={{ color: C.pink }}>CASE FILE</span>}
                  <span style={{ color: C.violet }}>COPILOT-OFF DEBRIEF</span>
                </div>
                {startError && <div style={{ color: '#ff8c97', fontSize: 13, marginBottom: 10 }}>{startError}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <Btn kind="primary" onClick={() => onStart(sel.id)} disabled={starting} style={{ minHeight: 50, padding: '0 26px', fontFamily: DISPLAY, letterSpacing: '.16em', fontSize: 15 }}>
                    <Icon d={I.play} size={15} /> {starting ? 'LOADING...' : sel.progress ? 'REPLAY EPISODE' : 'PLAY EPISODE'}
                  </Btn>
                  <Btn onClick={() => setShowScoring((s) => !s)} style={{ minHeight: 50 }}>{showScoring ? 'Hide scoring' : 'How scoring works'}</Btn>
                  <div className="aip-hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}>
                    {['priya', 'kabir', 'mei', 'nova'].map((w) => <Avatar key={w} who={w} cast={cast} size={30} />)}
                    <span style={{ fontSize: 12, color: C.faint, marginLeft: 4 }}>and someone called oracle-7</span>
                  </div>
                </div>
                <AnimatePresence>
                  {showScoring && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ marginTop: 16, background: '#0a0f17e6', border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 12 }}>
                          {DIMENSIONS.map((d) => (
                            <div key={d.key} style={{ fontSize: 12.5 }}>
                              <span style={{ fontFamily: MONO, color: C.cyan }}>{W[d.key]}%</span> <span style={{ color: C.text }}>{d.label}</span>
                              <div style={{ color: C.dim, fontSize: 11.5 }}>{d.desc}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.6, color: '#e8cf9a' }}>
                          <strong>Proctored.</strong> The copilot is allowed and expected. Tab switches and pastes from outside the copilot are logged. At the end you lock in your code and answer questions with the copilot <strong>off</strong>.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Episode rail */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '22px 16px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <SectionLabel>SEASON {series.season} · {(series.seasonTitle || '').toUpperCase()}</SectionLabel>
          <span className="aip-hide-sm" style={{ fontSize: 12, color: C.faint }}>{series.tagline}</span>
        </div>
        {error && (
          <div style={{ background: C.panel, border: `1px solid ${C.red}55`, borderRadius: 14, padding: 18, color: '#ffb3ba' }}>
            Could not load episodes. <Btn onClick={load} style={{ marginLeft: 8 }}>Retry</Btn>
          </div>
        )}
        <div className="aip-rail aip-scroll" role="list">
          {!missions && !error && [0, 1, 2, 3, 4].map((k) => <div key={k} className="aip-skel" style={{ height: 190, borderRadius: 14 }} />)}
          {(missions || []).map((m) => {
            const tm = TYPE_META[m.type] || TYPE_META.review;
            const on = m.id === picked;
            const best = m.progress && m.progress.bestScore;
            return (
              <div key={m.id} role="listitem" style={{ display: 'flex' }}>
                <button type="button" className="aip-card" onClick={() => choose(m.id)} aria-pressed={on}
                  style={{ position: 'relative', overflow: 'hidden', width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 190, background: on ? `linear-gradient(160deg, ${m.color}26, ${C.panel} 60%)` : C.panel, border: `1px solid ${on ? m.color + 'aa' : C.line}`, borderRadius: 14, padding: 14, color: C.text, boxShadow: on ? `0 0 30px ${m.color}2a` : 'none', fontFamily: BODY, display: 'flex', flexDirection: 'column' }}>
                  <span aria-hidden="true" style={{ position: 'absolute', right: -6, bottom: -26, fontFamily: DISPLAY, fontWeight: 800, fontSize: 110, lineHeight: 1, color: 'transparent', WebkitTextStroke: `1.5px ${m.color}${on ? '66' : '33'}` }}>{pad2(m.episode ? m.episode.ep : m.order)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: m.color, fontWeight: 700 }}>E{pad2(m.episode ? m.episode.ep : m.order)} · {m.company.toUpperCase()}</span>
                    <Chip color={tm.color} style={{ fontSize: 9.5, padding: '2px 7px' }}>{tm.label}</Chip>
                  </div>
                  <div style={{ position: 'relative', fontFamily: DISPLAY, fontSize: 16.5, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>{m.episode ? m.episode.title : m.title}</div>
                  <div style={{ position: 'relative', fontFamily: MONO, fontSize: 10.5, color: C.dim }}>{m.difficulty.toUpperCase()} · {m.timeLimitMin} MIN · {m.xp} XP</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ position: 'relative', marginTop: 12, height: 3, borderRadius: 3, background: '#111a27', overflow: 'hidden' }}>
                    <div style={{ width: `${best || 0}%`, height: '100%', background: best ? scoreColor(best) : 'transparent' }} />
                  </div>
                  <div style={{ position: 'relative', marginTop: 6, fontSize: 10.5, color: best ? scoreColor(best) : nextUp && nextUp.id === m.id ? C.amber : C.faint, fontFamily: MONO }}>
                    {best ? `BEST ${best} · ${m.progress.bestGrade || ''}${m.progress.certificateEligible ? ' · CERT' : ''}` : nextUp && nextUp.id === m.id ? 'UP NEXT' : 'NOT WATCHED'}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Workspace pieces ─────────────────────────────────────────────────────────
function FileExplorer({ files, active, onPick }) {
  const groups = {};
  files.forEach((f) => {
    const parts = f.name.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    (groups[dir] = groups[dir] || []).push(f);
  });
  return (
    <nav aria-label="Project files" className="aip-explorer aip-scroll" style={{ width: 190, flexShrink: 0, borderRight: `1px solid ${C.line}`, background: '#070b11', overflowY: 'auto', padding: '8px 0' }}>
      <SectionLabel style={{ padding: '2px 12px 8px' }}>EXPLORER</SectionLabel>
      {Object.keys(groups).sort().map((dir) => (
        <div key={dir || 'root'} style={{ marginBottom: 6 }}>
          {dir && <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', color: C.dim, fontFamily: MONO, fontSize: 11.5 }}><Icon d={I.folder} size={12} />{dir}/</div>}
          {groups[dir].map((f) => {
            const on = f.name === active;
            return (
              <button key={f.name} type="button" className="aip-tab" onClick={() => onPick(f.name)} title={f.name}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: `4px 12px 4px ${dir ? 26 : 12}px`, border: 'none', borderLeft: `2px solid ${on ? C.cyan : 'transparent'}`, background: on ? '#111a27' : 'transparent', color: on ? C.text : f.readOnly ? C.faint : '#b8c2d0', fontFamily: MONO, fontSize: 12, cursor: 'pointer' }}>
                <Icon d={f.readOnly ? I.lock : I.doc} size={11} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{baseName(f.name)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function CaseFile({ trace, answers, onAnswer }) {
  if (!trace || !trace.length) return null;
  const done = trace.filter((t) => Number.isInteger(answers[t.id])).length;
  return (
    <div style={{ background: `${C.pink}0a`, border: `1px solid ${C.pink}33`, borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <SectionLabel style={{ color: C.pink, display: 'flex', alignItems: 'center', gap: 6 }}><Icon d={I.case} size={13} /> CASE FILE</SectionLabel>
        <span style={{ fontFamily: MONO, fontSize: 11, color: done === trace.length ? C.green : C.dim }}>{done}/{trace.length}</span>
      </div>
      <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 10, lineHeight: 1.5 }}>About the ORIGINAL code. Answer before you change things. Scored in Reasoning.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {trace.map((t, n) => (
          <fieldset key={t.id} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
            <legend style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 6, padding: 0 }}><span style={{ fontFamily: MONO, color: C.pink }}>Q{n + 1}.</span> {t.q}</legend>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {t.options.map((o, i) => {
                const on = answers[t.id] === i;
                return (
                  <label key={i} className="aip-opt" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 8, border: `1px solid ${on ? C.pink + '88' : C.line}`, background: on ? `${C.pink}14` : '#070b11', cursor: 'pointer', fontSize: 12.5, color: on ? '#fde4f1' : '#c3ccd8', lineHeight: 1.45 }}>
                    <input type="radio" name={'trace-' + t.id} checked={on} onChange={() => onAnswer(t.id, i)} style={{ marginTop: 2, accentColor: C.pink }} />
                    {o}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

function CommsFeed({ items, cast }) {
  const boxRef = useRef(null);
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [items.length]);
  return (
    <div>
      <SectionLabel style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="aip-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: C.green }} /> SQUAD COMMS
      </SectionLabel>
      <div ref={boxRef} className="aip-scroll" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }} aria-live="polite">
        {items.length === 0 && <div style={{ fontSize: 12, color: C.faint }}>Quiet. Too quiet.</div>}
        {items.map((it, i) => (
          <motion.div key={it.k || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
            <DialogueLine item={it} cast={cast} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────
function Workspace({ session, story, onDebrief, onExit }) {
  const mission = session.mission;
  const cast = useMemo(() => (story && story.cast) || FALLBACK_CAST, [story]);
  const comms = useMemo(() => (story && story.comms) || {}, [story]);
  const sid = session.sessionId;

  const initialFiles = useMemo(() => {
    const local = store.json('aiPilot.files.' + sid, null);
    const saved = local || session.files || [];
    return mission.files.map((f) => {
      const s = saved.find((x) => x.name === f.name);
      return { name: f.name, readOnly: f.readOnly, content: !f.readOnly && s ? s.content : f.content };
    });
  }, [mission, session.files, sid]);

  const [files, setFiles] = useState(initialFiles);
  const [active, setActive] = useState(() => {
    const doc = initialFiles.find((f) => /\.md$/.test(f.name));
    return (doc || initialFiles.find((f) => !f.readOnly) || initialFiles[0]).name;
  });
  const [chat, setChat] = useState(session.chat || []);
  const [mode, setMode] = useState('chat');
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState(null);
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showSubmit, setShowSubmit] = useState(false);
  const [notes, setNotes] = useState(() => store.get('aiPilot.notes.' + sid) || '');
  const [traceAnswers, setTraceAnswers] = useState(() => Object.assign({}, session.traceAnswers || {}, store.json('aiPilot.trace.' + sid, {})));
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState(null);
  const [mobilePane, setMobilePane] = useState('brief');
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({ tab: 0, ext: 0 });
  const [feed, setFeed] = useState([]);
  const [showCold, setShowCold] = useState(() => !store.get('aiPilot.seen.' + sid) && !!(mission.episode && mission.episode.coldOpen));

  const filesRef = useRef(files);
  filesRef.current = files;
  const aiTexts = useRef([]);
  const internalCopies = useRef([]);
  const eventQueue = useRef([]);
  const fired = useRef({});
  const chatEnd = useRef(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    (session.chat || []).forEach((c) => {
      aiTexts.current.push(norm(c.response));
      if (c.suggestion) aiTexts.current.push(norm(c.suggestion.content));
    });
  }, [session.chat]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => { chatEnd.current && chatEnd.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat, asking]);
  useEffect(() => { store.set('aiPilot.notes.' + sid, notes); }, [notes, sid]);
  useEffect(() => { store.set('aiPilot.trace.' + sid, JSON.stringify(traceAnswers)); }, [traceAnswers, sid]);
  useEffect(() => {
    const t = setTimeout(() => store.set('aiPilot.files.' + sid, JSON.stringify(files.filter((f) => !f.readOnly).map((f) => ({ name: f.name, content: f.content })))), 400);
    return () => clearTimeout(t);
  }, [files, sid]);

  const remaining = session.deadline - now;
  const totalMs = mission.timeLimitMin * 60000;
  const timeUp = remaining <= 0;
  const aiCalls = chat.length;

  const flash = useCallback((msg, color = C.amber, who) => {
    setToast({ msg, color, who });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), who ? 4800 : 2600);
  }, []);

  // A squad member speaks: the line goes into the comms feed and pops a toast.
  const say = useCallback((item) => {
    if (!item) return;
    setFeed((f) => [...f, { ...item, k: Date.now() + Math.random() }].slice(-30));
    flash(item.line, ((cast[item.who] || {}).color) || C.cyan, item.who);
  }, [cast, flash]);
  const sayFrom = useCallback((key, chance = 1) => {
    if (Math.random() > chance) return;
    say(pick(comms[key]));
  }, [comms, say]);
  // Listeners below read the latest version through a ref, so they subscribe once.
  const sayFromRef = useRef(sayFrom);
  sayFromRef.current = sayFrom;

  // Opening line once the cold open closes.
  useEffect(() => {
    if (showCold || fired.current.start) return undefined;
    fired.current.start = true;
    if (!(mission.episode && mission.episode.start)) return undefined;
    const t = setTimeout(() => say(mission.episode.start), 500);
    return () => clearTimeout(t);
  }, [showCold, mission.episode, say]);

  // Clock-driven beats.
  useEffect(() => {
    if (showCold) return;
    if (!fired.current.half && remaining < totalMs / 2 && remaining > 5 * 60000) { fired.current.half = true; sayFrom('half'); }
    if (!fired.current.five && remaining < 5 * 60000 && remaining > 0) { fired.current.five = true; sayFrom('lastFive'); }
  }, [remaining, totalMs, showCold, sayFrom]);

  useEffect(() => {
    if (!fired.current.overPar && aiCalls > mission.parAiCalls) { fired.current.overPar = true; sayFrom('overPar'); }
  }, [aiCalls, mission.parAiCalls, sayFrom]);

  // ── proctoring ──
  const queueEvent = useCallback((type, chars) => { eventQueue.current.push({ type, chars: chars || 0 }); }, []);
  const flushEvents = useCallback(async () => {
    if (!eventQueue.current.length) return;
    const batch = eventQueue.current.splice(0, 25);
    try { await api('post', `/${sid}/events`, { events: batch }); }
    catch (e) { eventQueue.current.unshift(...batch); }
  }, [sid]);

  useEffect(() => {
    const t = setInterval(flushEvents, 5000);
    const onVis = () => {
      if (document.hidden) { queueEvent('tab_switch'); setCounts((c) => ({ ...c, tab: c.tab + 1 })); }
      else sayFromRef.current('tabSwitch');
    };
    const onKey = (e) => {
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && /^[ijIJ]$/.test(e.key))) queueEvent('devtools');
    };
    const onCopy = () => {
      const sel = norm(window.getSelection && window.getSelection().toString());
      if (sel) internalCopies.current = [sel, ...internalCopies.current].slice(0, 20);
    };
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('keydown', onKey);
    document.addEventListener('copy', onCopy);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('copy', onCopy);
      flushEvents();
    };
  }, [flushEvents, queueEvent]);

  const classifyPaste = useCallback((text) => {
    const t = norm(text);
    if (t.length < 20) return;
    if (internalCopies.current.some((c) => c.indexOf(t) !== -1 || t.indexOf(c) !== -1)) return;
    if (filesRef.current.some((f) => norm(f.content).indexOf(t) !== -1)) return;
    if (aiTexts.current.some((a) => a.indexOf(t) !== -1)) { queueEvent('ai_paste', t.length); return; }
    queueEvent('external_paste', t.length);
    setCounts((c) => ({ ...c, ext: c.ext + 1 }));
    sayFromRef.current('externalPaste');
  }, [queueEvent]);

  const onEditorMount = (editor) => {
    editor.onDidPaste((e) => {
      const model = editor.getModel();
      if (model && e.range) classifyPaste(model.getValueInRange(e.range));
    });
    editor.onDidChangeCursorSelection(() => {
      const model = editor.getModel();
      const sel = editor.getSelection();
      if (model && sel && !sel.isEmpty()) {
        const txt = norm(model.getValueInRange(sel));
        if (txt) internalCopies.current = [txt, ...internalCopies.current.filter((x) => x !== txt)].slice(0, 20);
      }
    });
  };

  const editable = () => filesRef.current.filter((f) => !f.readOnly).map((f) => ({ name: f.name, content: f.content }));
  const setFileContent = (name, content) => setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, content } : f)));

  const copyText = async (text) => {
    aiTexts.current.push(norm(text));
    try { await navigator.clipboard.writeText(text); flash('Copied. Pasting copilot code is allowed.', C.green); }
    catch (e) { flash('Copy failed. Select the code manually.'); }
  };

  // ── copilot ──
  const activeFile = files.find((f) => f.name === active) || files[0];
  const ask = async () => {
    const message = input.trim();
    if (!message || asking || timeUp) return;
    if (mode === 'agent' && activeFile.readOnly) return;
    setAsking(true); setAskError(null);
    try {
      const d = await api('post', `/${sid}/ask`, { mode, message, fileName: active, files: editable() });
      aiTexts.current.push(norm(d.response));
      if (d.suggestion) aiTexts.current.push(norm(d.suggestion.content));
      const base = (filesRef.current.find((f) => d.suggestion && f.name === d.suggestion.fileName) || {}).content || '';
      setChat((c) => [...c, { id: d.id, mode: d.mode, prompt: message, response: d.response, suggestion: d.suggestion ? { ...d.suggestion, base, decision: null } : null, at: Date.now() }]);
      setInput('');
    } catch (e) {
      setAskError(errMsg(e, 'NOVA did not answer. Try again.'));
    } finally { setAsking(false); }
  };

  const decide = async (entry, decision) => {
    try {
      await api('post', `/${sid}/suggestions/${entry.suggestion.id}`, { decision });
      if (decision === 'accept') { setFileContent(entry.suggestion.fileName, entry.suggestion.content); setActive(entry.suggestion.fileName); }
      setChat((c) => c.map((x) => (x.id === entry.id ? { ...x, suggestion: { ...x.suggestion, decision } } : x)));
      sayFrom(decision === 'accept' ? 'agentAccept' : 'agentReject', 0.7);
    } catch (e) { flash(errMsg(e, 'Could not save that decision.')); }
  };

  // ── tests ──
  const runTests = async () => {
    if (running || timeUp) return;
    setRunning(true);
    try {
      const d = await api('post', `/${sid}/run`, { files: editable() });
      setRun(d);
      const key = d.allPass ? 'runPass' : 'runFail';
      if (!fired.current[key]) { fired.current[key] = true; sayFrom(key); } else sayFrom(key, 0.3);
    } catch (e) {
      setRun({ error: errMsg(e, 'Could not run tests. Try again.') });
    } finally { setRunning(false); }
  };

  const lockIn = async () => {
    setLocking(true); setLockError(null);
    try {
      await flushEvents();
      const d = await api('post', `/${sid}/debrief/start`, { files: editable(), notes, traceAnswers });
      store.del('aiPilot.files.' + sid);
      onDebrief({ questions: d.questions, intro: d.intro, startedAt: d.startedAt });
    } catch (e) {
      setLockError(errMsg(e, 'Could not lock in. Your work is saved, try again.'));
    } finally { setLocking(false); }
  };

  const closeCold = useCallback(() => { store.set('aiPilot.seen.' + sid, '1'); setShowCold(false); }, [sid]);
  const clockColor = remaining < 5 * 60000 ? C.red : remaining < 10 * 60000 ? C.amber : C.cyan;
  const t = TYPE_META[mission.type] || TYPE_META.review;
  const traceLeft = (mission.trace || []).filter((q) => !Number.isInteger(traceAnswers[q.id])).length;
  const multi = files.length > 3;

  // ── panes ──
  const briefPane = (
    <div className={'aip-pane aip-scroll' + (mobilePane === 'brief' ? ' aip-on' : '')} style={{ flexDirection: 'column', borderRight: `1px solid ${C.line}`, background: C.panel, overflowY: 'auto', padding: 16, gap: 16, boxSizing: 'border-box' }}>
      <div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: mission.color, fontWeight: 700 }}>E{pad2(mission.episode ? mission.episode.ep : mission.order)}</span>
          <span style={{ color: mission.color, fontFamily: DISPLAY, fontWeight: 700 }}>{mission.company}</span>
          <Chip color={t.color}>{t.label}</Chip>
        </div>
        <p style={{ color: '#c3ccd8', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{mission.brief}</p>
      </div>
      <CommsFeed items={feed} cast={cast} />
      <CaseFile trace={mission.trace} answers={traceAnswers} onAnswer={(id, v) => setTraceAnswers((a) => ({ ...a, [id]: v }))} />
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>REQUIREMENTS</SectionLabel>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mission.task.map((line, i) => <li key={i} style={{ color: '#d3dae4', fontSize: 13, lineHeight: 1.55 }}>{line}</li>)}
        </ol>
      </div>
      <div style={{ background: `${C.violet}0f`, border: `1px solid ${C.violet}33`, borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.6, color: '#cfc4fb' }}>
        <Icon d={I.eye} size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        NOVA can read your files but has not seen these requirements. Good prompts pass them on.
      </div>
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>SESSION</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { l: 'AI CALLS', v: `${aiCalls}/${mission.parAiCalls}`, c: aiCalls > mission.parAiCalls ? C.amber : C.text },
            { l: 'HIDDEN TESTS', v: mission.hiddenTestCount, c: C.text },
            { l: 'TAB SWITCHES', v: counts.tab, c: counts.tab ? C.amber : C.text },
            { l: 'EXT. PASTES', v: counts.ext, c: counts.ext ? C.amber : C.text },
          ].map((s) => (
            <div key={s.l} style={{ background: '#070b11', border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 10px' }}>
              <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, letterSpacing: '.12em', color: C.dim }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const codePane = (
    <div className={'aip-pane' + (mobilePane === 'code' ? ' aip-on' : '')} style={{ flexDirection: 'column', background: '#05070b' }}>
      <div role="tablist" className="aip-scroll" style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${C.line}`, background: C.panel, overflowX: 'auto', flexShrink: 0 }}>
        {(multi ? files.filter((f) => f.name === active) : files).map((f) => (
          <button key={f.name} type="button" role="tab" aria-selected={f.name === active} className="aip-tab" onClick={() => setActive(f.name)} title={f.name}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 38, border: 'none', borderRight: `1px solid ${C.line}`, borderTop: `2px solid ${f.name === active ? C.cyan : 'transparent'}`, background: f.name === active ? '#05070b' : 'transparent', color: f.name === active ? C.text : C.dim, fontFamily: MONO, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Icon d={f.readOnly ? I.lock : I.doc} size={12} />{f.name}{f.readOnly && <span style={{ color: C.faint, fontSize: 10 }}>read-only</span>}
          </button>
        ))}
        {multi && (
          <select aria-label="Open file" value={active} onChange={(e) => setActive(e.target.value)} className="aip-mobile-files"
            style={{ marginLeft: 'auto', alignSelf: 'center', marginRight: 8, background: '#0c1119', color: C.text, border: `1px solid ${C.line2}`, borderRadius: 8, height: 30, fontFamily: MONO, fontSize: 12, maxWidth: 170 }}>
            {files.map((f) => <option key={f.name} value={f.name}>{f.name}{f.readOnly ? ' (read-only)' : ''}</option>)}
          </select>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 240, display: 'flex' }}>
        {multi && <FileExplorer files={files} active={active} onPick={setActive} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editor
            height="100%"
            theme="vs-dark"
            language={langFor(activeFile.name)}
            path={activeFile.name}
            value={activeFile.content}
            onChange={(v) => { if (!activeFile.readOnly) setFileContent(activeFile.name, v || ''); }}
            onMount={onEditorMount}
            loading={<span style={{ fontFamily: DISPLAY, letterSpacing: '.2em', fontSize: 12, color: C.dim }}>LOADING EDITOR...</span>}
            options={{ readOnly: activeFile.readOnly || timeUp, minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, automaticLayout: true }}
          />
        </div>
      </div>
      <div className="aip-scroll" style={{ height: 200, flexShrink: 0, borderTop: `1px solid ${C.line}`, background: '#04060a', overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: '#04060a', borderBottom: `1px solid ${C.line}` }}>
          <SectionLabel>VISIBLE TESTS{run && run.tests ? ` · ${run.tests.filter((x) => x.pass).length}/${run.tests.length}` : ''}</SectionLabel>
          <Btn onClick={runTests} disabled={running || timeUp} style={{ minHeight: 32 }}><Icon d={I.play} size={12} /> {running ? 'Running...' : 'Run tests'}</Btn>
        </div>
        <div style={{ padding: '8px 12px', fontFamily: MONO, fontSize: 12 }}>
          {!run && <div style={{ color: C.faint }}>Run the visible tests any time. Hidden tests run when you submit.</div>}
          {run && run.error && <div style={{ color: C.red }}>{run.error}</div>}
          {run && run.tests && run.tests.map((tc, i) => (
            <div key={i} style={{ padding: '4px 0', borderBottom: `1px dashed ${C.line}` }}>
              <span style={{ color: tc.pass ? C.green : C.red, fontWeight: 700 }}>{tc.pass ? 'PASS' : 'FAIL'}</span>
              <span style={{ color: '#cfd6e0', marginLeft: 10 }}>{tc.name}</span>
              {!tc.pass && tc.error && <div style={{ color: '#ff9aa4', marginTop: 2, marginLeft: 46, whiteSpace: 'pre-wrap' }}>{tc.error}</div>}
            </div>
          ))}
          {run && run.stderr && <pre style={{ color: '#ff9aa4', whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{run.stderr}</pre>}
          {run && run.logs && <pre style={{ color: C.dim, whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{run.logs}</pre>}
        </div>
      </div>
    </div>
  );

  const copilotPane = (
    <div className={'aip-pane' + (mobilePane === 'ai' ? ' aip-on' : '')} style={{ flexDirection: 'column', borderLeft: `1px solid ${C.line}`, background: C.panel2 }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Avatar who="nova" cast={cast} size={28} glow />
          <span>
            <span style={{ display: 'block', fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.12em', fontSize: 13, color: C.cyan }}>NOVA</span>
            <span style={{ display: 'block', fontSize: 10.5, color: C.faint }}>copilot · can be wrong</span>
          </span>
        </span>
        <div role="tablist" style={{ display: 'flex', background: '#070b11', border: `1px solid ${C.line}`, borderRadius: 9, padding: 2 }}>
          {[{ id: 'chat', l: 'Chat' }, { id: 'agent', l: 'Agent' }].map((m) => (
            <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className="aip-tab" onClick={() => setMode(m.id)}
              style={{ height: 28, padding: '0 12px', borderRadius: 7, border: 'none', background: mode === m.id ? `${C.cyan}22` : 'transparent', color: mode === m.id ? C.cyan : C.dim, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {m.l}
            </button>
          ))}
        </div>
      </div>
      <div className="aip-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chat.length === 0 && (
          <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.65 }}>
            <DialogueLine item={{ who: 'nova', line: 'Hi! Tell me what we are fixing. I can see the files, not the brief. I am fast. I am not always right.' }} cast={cast} />
            <div style={{ marginTop: 12 }}>
              <strong style={{ color: C.text }}>Chat</strong> answers questions and shows code you can copy.<br />
              <strong style={{ color: C.text }}>Agent</strong> rewrites the open file. You review the diff, then accept or reject it.
            </div>
          </div>
        )}
        {chat.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <div style={{ alignSelf: 'flex-end', maxWidth: '92%', boxSizing: 'border-box', background: `${C.cyan}14`, border: `1px solid ${C.cyan}33`, borderRadius: '12px 12px 2px 12px', padding: '8px 11px', fontSize: 13, color: '#bdefff', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {c.mode === 'agent' && <span style={{ fontFamily: DISPLAY, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: C.cyan, marginRight: 6 }}>AGENT</span>}
              {c.prompt}
            </div>
            <div style={{ alignSelf: 'stretch', minWidth: 0, boxSizing: 'border-box', background: '#0a0f17', border: `1px solid ${C.line}`, borderRadius: '12px 12px 12px 2px', padding: '9px 11px' }}>
              <RichText text={c.response} onCopy={copyText} />
              {c.suggestion && <SuggestionCard entry={c} base={c.suggestion.base != null ? c.suggestion.base : (mission.files.find((f) => f.name === c.suggestion.fileName) || {}).content || ''} onDecide={decide} disabled={timeUp} />}
            </div>
          </div>
        ))}
        {asking && <div className="aip-skel" style={{ height: 54, borderRadius: 10 }} />}
        <div ref={chatEnd} />
      </div>
      {askError && <div style={{ padding: '6px 12px', color: '#ff8c97', fontSize: 12 }}>{askError}</div>}
      <div style={{ borderTop: `1px solid ${C.line}`, padding: 10 }}>
        {mode === 'agent' && <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>Agent will propose a rewrite of <span style={{ fontFamily: MONO }}>{activeFile.readOnly ? '(open an editable file)' : activeFile.name}</span>.</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} disabled={timeUp}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder={mode === 'agent' ? 'Describe exactly what to change and why...' : 'Ask about the code, a bug, an edge case...'}
            aria-label="Message NOVA"
            style={{ flex: 1, resize: 'none', background: '#05080d', border: `1px solid ${C.line2}`, borderRadius: 10, padding: '8px 10px', color: C.text, fontFamily: BODY, fontSize: 13, lineHeight: 1.5, outline: 'none' }} />
          <Btn kind="primary" onClick={ask} disabled={asking || !input.trim() || timeUp || (mode === 'agent' && activeFile.readOnly)} style={{ minHeight: 42, padding: '0 12px' }} title="Send">
            <Icon d={I.send} size={15} />
          </Btn>
        </div>
      </div>
    </div>
  );

  const toastCast = toast && toast.who ? cast[toast.who] : null;

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: BODY, minHeight: '100vh' }}>
      {showCold && <ColdOpen mission={mission} story={story} onDone={closeCold} />}

      <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 12px', borderBottom: `1px solid ${C.line}`, background: '#080c13' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Btn onClick={onExit} style={{ minHeight: 34, padding: '0 10px' }} title="Leave (progress is saved)"><Icon d={I.back} /></Btn>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mission.episode ? mission.episode.title : mission.title}</div>
            <div className="aip-hide-sm" style={{ fontSize: 11, color: C.dim, fontFamily: MONO }}>ROLLBACK S1:E{mission.episode ? mission.episode.ep : mission.order} · {mission.company.toUpperCase()} · {mission.difficulty.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontWeight: 700, fontSize: 15, color: clockColor, padding: '4px 10px', border: `1px solid ${clockColor}44`, borderRadius: 8, background: `${clockColor}10` }} aria-label="Time remaining">
            <Icon d={I.clock} size={14} />{timeUp ? 'TIME UP' : fmtClock(remaining)}
          </span>
          <Btn kind="primary" onClick={() => setShowSubmit(true)} style={{ fontFamily: DISPLAY, letterSpacing: '.1em', whiteSpace: 'nowrap', padding: '0 12px' }}><Icon d={I.flag} size={14} /> LOCK IN</Btn>
        </div>
      </div>

      <div className="aip-mtabs" role="tablist" style={{ height: 48, borderBottom: `1px solid ${C.line}`, background: C.panel }}>
        {[{ id: 'brief', l: 'Brief' }, { id: 'code', l: 'Code' }, { id: 'ai', l: `NOVA (${aiCalls})` }].map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={mobilePane === p.id} className="aip-tab" onClick={() => setMobilePane(p.id)}
            style={{ flex: 1, border: 'none', borderBottom: `2px solid ${mobilePane === p.id ? C.cyan : 'transparent'}`, background: 'transparent', color: mobilePane === p.id ? C.text : C.dim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {p.l}
          </button>
        ))}
      </div>

      {timeUp && (
        <div style={{ background: `${C.red}14`, borderBottom: `1px solid ${C.red}44`, color: '#ffb3ba', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
          Time is up. Editing, tests and NOVA are closed. Lock in your work now.
        </div>
      )}

      <div className="aip-ws">
        {briefPane}
        {codePane}
        {copilotPane}
      </div>

      <AnimatePresence>
        {toast && !showCold && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status"
            style={{ position: 'fixed', bottom: 20, left: 0, right: 0, margin: '0 auto', width: 'fit-content', zIndex: 60, display: 'flex', alignItems: 'center', gap: 10, background: '#0b1018f2', border: `1px solid ${toast.color}66`, color: toastCast ? '#e8edf4' : toast.color, borderRadius: 12, padding: '10px 14px', fontSize: 13, boxShadow: '0 12px 30px rgba(0,0,0,.5)', maxWidth: 'min(560px, calc(100vw - 32px))', lineHeight: 1.45, boxSizing: 'border-box' }}>
            {toastCast && <Avatar who={toast.who} cast={cast} size={30} />}
            <span>{toastCast && <strong style={{ color: toastCast.color, fontFamily: DISPLAY, marginRight: 6 }}>{toastCast.name}</strong>}{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(2,4,8,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget && !locking) setShowSubmit(false); }}>
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} role="dialog" aria-modal="true" aria-labelledby="aip-lock-title"
              className="aip-scroll" style={{ width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${C.cyan}44`, borderRadius: 18, padding: 22, boxSizing: 'border-box' }}>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: '.16em', marginBottom: 4 }}>STEP 1 OF 2 · LOCK IN</div>
              <h2 id="aip-lock-title" style={{ margin: '0 0 6px', fontFamily: DISPLAY, fontSize: 21, letterSpacing: '.03em' }}>What was wrong with the AI's code?</h2>
              <p style={{ margin: '0 0 12px', color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
                Name each problem you found and why it matters. Scored as <strong style={{ color: C.text }}>Diagnosis</strong>. After this, your code is locked, NOVA goes offline, and Priya asks you a few questions.
              </p>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={7} maxLength={6000} aria-label="Review notes"
                placeholder={'1. The cache key uses ... so ...\n2. ...'}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#05080d', border: `1px solid ${C.line2}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontFamily: BODY, fontSize: 14, lineHeight: 1.6, outline: 'none' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, fontSize: 12 }}>
                <span style={{ color: run && run.allPass ? C.green : C.amber }}>
                  {run ? (run.allPass ? '✓ Last test run: all visible tests passing.' : '⚠ Last test run still had failures.') : '⚠ You have not run the tests yet.'}
                </span>
                {traceLeft > 0 && <span style={{ color: C.amber }}>⚠ {traceLeft} Case File question{traceLeft === 1 ? '' : 's'} unanswered.</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
                <Btn onClick={() => setShowSubmit(false)} disabled={locking}>Keep working</Btn>
                <Btn kind="primary" onClick={lockIn} disabled={locking}><Icon d={I.lock} size={13} /> {locking ? 'Locking...' : 'Lock in and start debrief'}</Btn>
              </div>
              {lockError && <div style={{ color: '#ff8c97', fontSize: 13, marginTop: 10 }}>{lockError}</div>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SuggestionCard({ entry, base, onDecide, disabled }) {
  const s = entry.suggestion;
  const diff = useMemo(() => lineDiff(base, s.content), [base, s.content]);
  const added = diff.filter((d) => d.t === '+').length;
  const removed = diff.filter((d) => d.t === '-').length;
  const [open, setOpen] = useState(!s.decision);
  return (
    <div style={{ marginTop: 8, border: `1px solid ${C.line2}`, borderRadius: 10, overflow: 'hidden', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', background: '#070b11' }}>
        <button type="button" className="aip-tab" onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', color: C.text, fontFamily: MONO, fontSize: 12, cursor: 'pointer', padding: 0 }}>
          {open ? '▾' : '▸'} {baseName(s.fileName)} <span style={{ color: C.green }}>+{added}</span> <span style={{ color: C.red }}>-{removed}</span>
        </button>
        {s.decision ? (
          <Chip color={s.decision === 'accept' ? C.green : C.dim}>{s.decision === 'accept' ? 'ACCEPTED' : 'REJECTED'}</Chip>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn kind="danger" onClick={() => onDecide(entry, 'reject')} disabled={disabled} style={{ minHeight: 28, padding: '0 10px', fontSize: 12 }}><Icon d={I.cross} size={12} /> Reject</Btn>
            <Btn kind="good" onClick={() => onDecide(entry, 'accept')} disabled={disabled} style={{ minHeight: 28, padding: '0 10px', fontSize: 12 }}><Icon d={I.check} size={12} /> Accept</Btn>
          </div>
        )}
      </div>
      {open && (
        <pre className="aip-scroll" style={{ margin: 0, maxHeight: 280, maxWidth: '100%', overflow: 'auto', background: '#04060a', fontFamily: MONO, fontSize: 11.5, lineHeight: 1.55 }}>
          {diff.map((d, i) => (
            <div key={i} style={{ padding: '0 10px', whiteSpace: 'pre', width: 'max-content', minWidth: '100%', boxSizing: 'border-box', background: d.t === '+' ? 'rgba(61,220,151,.10)' : d.t === '-' ? 'rgba(255,77,94,.10)' : 'transparent', color: d.t === '+' ? '#9ff0c8' : d.t === '-' ? '#ffadb5' : '#8794a8' }}>
              {d.t} {d.s}
            </div>
          ))}
        </pre>
      )}
    </div>
  );
}

// ── Debrief (copilot offline) ────────────────────────────────────────────────
function Debrief({ session, story, data, onSubmitted }) {
  const cast = (story && story.cast) || FALLBACK_CAST;
  const sid = session.sessionId;
  const [answers, setAnswers] = useState(() => store.json('aiPilot.debrief.' + sid, {}));
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const queue = useRef([]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { store.set('aiPilot.debrief.' + sid, JSON.stringify(answers)); }, [answers, sid]);

  const flush = useCallback(async () => {
    if (!queue.current.length) return;
    const batch = queue.current.splice(0, 25);
    try { await api('post', `/${sid}/events`, { events: batch }); } catch (e) { /* best effort */ }
  }, [sid]);

  // Proctoring continues. NOVA is off, so any paste here came from somewhere else.
  useEffect(() => {
    const onVis = () => { if (document.hidden) queue.current.push({ type: 'tab_switch' }); };
    const t = setInterval(flush, 5000);
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); flush(); };
  }, [flush]);
  const onPaste = (e) => {
    const txt = (e.clipboardData && e.clipboardData.getData('text')) || '';
    if (norm(txt).length >= 20) queue.current.push({ type: 'external_paste', chars: norm(txt).length });
  };

  const questions = data.questions || [];
  const short = questions.filter((q) => norm(answers[q.id]).length < 20).length;
  const elapsed = now - (data.startedAt || now);

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      await flush();
      const d = await api('post', `/${sid}/submit`, { debriefAnswers: answers });
      ['debrief', 'notes', 'trace', 'files', 'seen'].forEach((k) => store.del('aiPilot.' + k + '.' + sid));
      onSubmitted(d.report);
    } catch (e) {
      setError(errMsg(e, 'Grading failed. Your answers are saved, try again.'));
    } finally { setSubmitting(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY, position: 'relative', overflowX: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% -10%, ${C.violet}22, transparent 55%)`, pointerEvents: 'none' }} />
      <div className="aip-scan" />
      <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', padding: '26px 16px 60px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.dim, letterSpacing: '.16em' }}>STEP 2 OF 2 · DEBRIEF</div>
            <h1 style={{ margin: '4px 0 0', fontFamily: DISPLAY, fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800 }}>Just you. No copilot.</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, border: `1px solid ${C.line2}`, background: '#0a0f17' }}>
              <Avatar who="nova" cast={cast} size={26} dim />
              <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: C.red }}>NOVA OFFLINE</span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.dim }} aria-label="Time in debrief">{fmtClock(elapsed)}</span>
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {(data.intro || []).map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.5 }}>
              <DialogueLine item={l} cast={cast} />
            </motion.div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {questions.map((q, i) => {
            const len = norm(answers[q.id]).length;
            return (
              <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.15 }}
                style={{ background: '#0a0f17', border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
                <label htmlFor={'dq-' + q.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <Avatar who="priya" cast={cast} size={30} />
                  <span style={{ fontSize: 15, lineHeight: 1.55, color: '#eef1f6' }}><span style={{ fontFamily: MONO, color: C.violet, marginRight: 6 }}>Q{i + 1}</span>{q.q}</span>
                </label>
                <textarea id={'dq-' + q.id} rows={5} maxLength={3000} value={answers[q.id] || ''} onPaste={onPaste}
                  onChange={(e) => { const v = e.target.value; setAnswers((a) => ({ ...a, [q.id]: v })); }}
                  placeholder="Explain in your own words. Three to six sentences is plenty."
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#05080d', border: `1px solid ${C.line2}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontFamily: BODY, fontSize: 14, lineHeight: 1.6, outline: 'none' }} />
                <div style={{ textAlign: 'right', fontFamily: MONO, fontSize: 11, color: len < 20 ? C.faint : C.green, marginTop: 4 }}>{len < 20 ? 'Too short to score' : `${len} chars`}</div>
              </motion.div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
          <span style={{ fontSize: 12, color: short ? C.amber : C.green }}>{short ? `${short} answer${short === 1 ? '' : 's'} still too short to score.` : 'All answered.'}</span>
          <Btn kind="primary" onClick={submit} disabled={submitting} style={{ minHeight: 46, padding: '0 22px', fontFamily: DISPLAY, letterSpacing: '.12em' }}>
            <Icon d={I.flag} size={14} /> {submitting ? 'GRADING...' : 'SUBMIT DEBRIEF'}
          </Btn>
        </div>
        {error && <div style={{ color: '#ff8c97', fontSize: 13, marginTop: 10 }}>{error}</div>}
      </div>
    </div>
  );
}

// ── Report + ending scene ────────────────────────────────────────────────────
function EndingScene({ report, story }) {
  const cast = (story && story.cast) || FALLBACK_CAST;
  const e = report.ending;
  if (!e) return null;
  const all = (e.lines || []).concat(e.stinger ? [e.stinger] : []);
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#04060a', border: `1px solid ${C.line}`, borderRadius: 16, padding: '16px 16px 18px', marginBottom: 18 }}>
      <div className="aip-scan" />
      <div style={{ position: 'relative' }}>
        <SectionLabel style={{ marginBottom: 12 }}>EPISODE {report.episode ? pad2(report.episode.ep) : ''} · ENDING</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {all.map((l, i) => {
            const isStinger = !!e.stinger && i === all.length - 1;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.9 }}
                style={isStinger ? { borderTop: `1px dashed ${C.line2}`, paddingTop: 12, marginTop: 4 } : undefined}>
                {isStinger && <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.faint, letterSpacing: '.2em', marginBottom: 8 }}>AFTER THE CREDITS</div>}
                <DialogueLine item={l} cast={cast} />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Report({ report, story, onRetry, onMissions, onNext }) {
  const color = scoreColor(report.total);
  const verdict = report.total >= 80 ? 'SHIPPED SAFELY' : report.total >= 60 ? 'SHIPPED WITH SCARS' : report.total >= 40 ? 'BUGS REACHED PROD' : 'ROLLED BACK';
  const d = report.dimensions;
  const R = d.reasoning || {};
  const [showMissed, setShowMissed] = useState(false);
  const nextAt = report.ending && report.ending.lines ? 0.4 + (report.ending.lines.length + 1) * 0.9 : 0.5;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY, padding: '32px 16px', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: -200, width: 1100, height: 700, marginLeft: -550, background: `radial-gradient(ellipse at 50% 40%, ${color}22, transparent 65%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', maxWidth: 840, margin: '0 auto', background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${color}55`, borderRadius: 22, padding: 'clamp(16px, 4vw, 30px)', boxShadow: `0 0 50px ${color}22, 0 40px 80px rgba(0,0,0,.6)` }}>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Chip color={color}><span className="aip-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{verdict}</Chip>
          <h2 className="aip-silver" style={{ margin: '12px 0 4px', fontFamily: DISPLAY, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, letterSpacing: '.03em' }}>{report.episode ? `S1:E${report.episode.ep} · ${report.episode.title}` : 'COPILOT REPORT'}</h2>
          <p style={{ fontFamily: MONO, color: C.dim, margin: 0, fontSize: 13 }}>ROLLBACK · {report.company}{report.episode && report.episode.title !== report.missionTitle ? ' · ' + report.missionTitle : ''}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, delay: 0.15 }}
            style={{ width: 112, height: 112, borderRadius: '50%', background: `${color}18`, border: `3px solid ${color}`, boxShadow: `0 0 30px ${color}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 800, color, lineHeight: 1 }}>{report.grade}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color }}>{report.total}/100</span>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(88px,1fr))', gap: 8 }}>
            {[
              { l: 'TESTS', v: `${d.correctness.passed}/${d.correctness.total}`, c: scoreColor(d.correctness.score) },
              { l: 'BUGS NAMED', v: `${d.diagnosis.found.length}/${d.diagnosis.found.length + d.diagnosis.missed.length}`, c: scoreColor(d.diagnosis.score) },
              { l: 'XP', v: `+${report.xpAwarded}`, c: C.violet },
            ].map((s) => (
              <div key={s.l} style={{ background: '#070b11', border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, letterSpacing: '.12em', color: C.dim, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        {report.xpAwarded === 0 && report.xpEarned > 0 && (
          <div style={{ textAlign: 'center', fontSize: 12, color: C.dim, marginTop: -10, marginBottom: 16 }}>No new XP this time. Beat your best score on this episode to earn more.</div>
        )}

        <EndingScene report={report} story={story} />

        {report.ending && report.ending.next && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: nextAt }}
            style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: `linear-gradient(90deg, ${C.cyan}14, transparent)`, border: `1px solid ${C.cyan}33`, borderRadius: 14, padding: '12px 14px', marginBottom: 18 }}>
            <span style={{ fontSize: 14, color: '#d6f5ff', fontStyle: 'italic' }}>{report.ending.next}</span>
            {report.nextMissionId ? (
              <Btn kind="primary" onClick={() => onNext(report.nextMissionId)}><Icon d={I.play} size={13} /> Next episode</Btn>
            ) : (
              <Chip color={C.violet}>SEASON COMPLETE</Chip>
            )}
          </motion.div>
        )}

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>SCORE BREAKDOWN</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DIMENSIONS.map((dim) => {
              const dd = d[dim.key];
              const v = dd ? dd.score : null;
              const none = v === null || v === undefined;
              return (
                <div key={dim.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 5 }}>
                    <span><span style={{ color: C.text, fontWeight: 600 }}>{dim.label}</span> <span style={{ color: C.faint, fontSize: 12 }}>· {report.weights[dim.key] || 0}% of total</span></span>
                    <span style={{ fontFamily: MONO, color: none ? C.faint : scoreColor(v) }}>{none ? 'not used' : v}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: '#111a27', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${v || 0}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: none ? 'transparent' : scoreColor(v) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {(R.trace || R.debrief) && (
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <SectionLabel style={{ marginBottom: 12 }}>REASONING</SectionLabel>
            {R.trace && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.pink, fontWeight: 600, marginBottom: 8 }}>Case File · {R.trace.correct}/{R.trace.total} correct</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {R.trace.items.map((it, i) => (
                    <div key={it.id} style={{ fontSize: 12.5, lineHeight: 1.5, padding: '8px 10px', borderRadius: 10, background: it.correct ? `${C.green}0a` : `${C.red}08`, border: `1px solid ${it.correct ? C.green + '33' : C.red + '33'}` }}>
                      <div style={{ color: '#d3dae4' }}><span style={{ fontFamily: MONO, color: C.dim }}>Q{i + 1}</span> {it.q}</div>
                      <div style={{ color: it.correct ? C.green : '#ffadb5', marginTop: 4 }}>
                        {it.correct ? '✓ ' : '✗ '}{it.chosen === null ? 'Not answered' : it.options[it.chosen]}
                        {!it.correct && <span style={{ color: C.green }}> · Correct: {it.options[it.answer]}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {R.debrief && (
              <div>
                <div style={{ fontSize: 13, color: C.violet, fontWeight: 600, marginBottom: 8 }}>Debrief with NOVA offline · {R.debrief.score}/100</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {R.debrief.items.map((it, i) => (
                    <div key={it.id} style={{ padding: '10px 12px', borderRadius: 10, background: '#070b11', border: `1px solid ${C.line}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: '#e3e8ef', marginBottom: 6 }}>
                        <span><span style={{ fontFamily: MONO, color: C.violet }}>Q{i + 1}</span> {it.q}</span>
                        <span style={{ fontFamily: MONO, color: scoreColor(it.score), flexShrink: 0 }}>{it.score}</span>
                      </div>
                      {it.points.map((p) => (
                        <div key={p.id} style={{ fontSize: 12.5, lineHeight: 1.5, color: p.credit >= 1 ? C.green : p.credit > 0 ? C.amber : '#ffadb5' }}>
                          {p.credit >= 1 ? '✓' : p.credit > 0 ? '◐' : '✗'} {p.text}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
            <SectionLabel style={{ marginBottom: 8 }}>VERIFICATION</SectionLabel>
            <div style={{ fontSize: 13, color: '#cfd6e0', lineHeight: 1.6 }}>
              {d.verification.runs} test run{d.verification.runs === 1 ? '' : 's'} · {d.verification.verifiedChanges}/{d.verification.aiChanges} AI changes tested
              {d.verification.notes.map((n, i) => <div key={i} style={{ color: C.dim, marginTop: 4 }}>{n}</div>)}
            </div>
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14 }}>
            <SectionLabel style={{ marginBottom: 8 }}>STEERING</SectionLabel>
            <div style={{ fontSize: 13, color: '#cfd6e0', lineHeight: 1.6 }}>
              {d.steering.strengths.map((s, i) => <div key={'s' + i} style={{ color: C.green }}>+ {s}</div>)}
              {d.steering.improvements.map((s, i) => <div key={'i' + i} style={{ color: C.amber }}>→ {s}</div>)}
              {!d.steering.strengths.length && !d.steering.improvements.length && <div style={{ color: C.dim }}>{d.efficiency.aiCalls} copilot calls (par {d.efficiency.par}).</div>}
            </div>
          </div>
          <div style={{ background: C.panel, border: `1px solid ${report.integrity.rating === 'Clean' ? C.line : C.amber + '55'}`, borderRadius: 14, padding: 14 }}>
            <SectionLabel style={{ marginBottom: 8 }}>INTEGRITY</SectionLabel>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ color: report.integrity.rating === 'Clean' ? C.green : report.integrity.rating === 'Review' ? C.amber : C.red, fontWeight: 700 }}>{report.integrity.rating}</div>
              <div style={{ color: C.dim }}>{report.integrity.tabSwitches} tab switches · {report.integrity.externalPastes} outside pastes ({report.integrity.externalPasteChars} chars)</div>
            </div>
          </div>
        </div>

        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <SectionLabel>WHAT THE AI GOT WRONG</SectionLabel>
            {d.diagnosis.missed.length > 0 && (
              <Btn onClick={() => setShowMissed((s) => !s)} style={{ minHeight: 30, fontSize: 12 }}>{showMissed ? 'Hide missed' : `Reveal ${d.diagnosis.missed.length} missed`}</Btn>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.diagnosis.found.map((iss) => <IssueRow key={iss.id} iss={iss} found />)}
            {showMissed && d.diagnosis.missed.map((iss) => <IssueRow key={iss.id} iss={iss} />)}
            {!d.diagnosis.found.length && !showMissed && <div style={{ color: C.dim, fontSize: 13 }}>None named in your notes. Reveal them to see what slipped through.</div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }} aria-label="Hidden test results">
          {report.tests.hidden.map((h) => (
            <span key={h.name} title={h.name} style={{ fontFamily: MONO, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${(h.pass ? C.green : C.red)}55`, color: h.pass ? C.green : C.red, background: `${h.pass ? C.green : C.red}10` }}>
              {h.pass ? '✓' : '✗'} {h.name.replace('Hidden test ', 'H')}
            </span>
          ))}
        </div>

        {report.certificateEligible ? (
          <div style={{ background: `${C.green}10`, border: `1px solid ${C.green}55`, borderRadius: 14, padding: '12px 14px', color: '#b6f3d6', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            <strong style={{ color: C.green }}>Certificate ready.</strong> 70+ overall, 80+ correctness, 50+ reasoning, real copilot use and integrity not flagged.
          </div>
        ) : (
          <div style={{ background: '#0a0f17', border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px', color: C.dim, fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            Certificate bar: 70+ overall, 80+ correctness, 50+ reasoning, at least one copilot call and integrity not flagged.
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <Btn onClick={onMissions}>All episodes</Btn>
          <Btn onClick={onRetry}><Icon d={I.play} size={13} /> Replay episode</Btn>
          {report.nextMissionId && <Btn kind="primary" onClick={() => onNext(report.nextMissionId)}><Icon d={I.play} size={13} /> Next episode</Btn>}
        </div>
      </motion.div>
    </div>
  );
}

function IssueRow({ iss, found }) {
  const sev = { Critical: C.red, High: '#f97316', Medium: C.amber, Low: C.dim }[iss.severity] || C.dim;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: found ? `${C.green}0a` : `${C.red}08`, border: `1px solid ${found ? C.green + '33' : C.red + '33'}` }}>
      <Icon d={found ? I.check : I.cross} size={15} color={found ? C.green : C.red} style={{ marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: sev, marginRight: 8 }}>{String(iss.severity).toUpperCase()}</span>
        <span style={{ fontSize: 13, color: '#d3dae4', lineHeight: 1.55 }}>{iss.title}</span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AIPilot({ user, setUserData, onPhaseChange }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('loading');
  const [session, setSession] = useState(null);
  const [story, setStory] = useState(null);
  const [debriefData, setDebriefData] = useState(null);
  const [report, setReport] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [preselect, setPreselect] = useState(null);

  useEffect(() => { if (onPhaseChange) onPhaseChange(phase); }, [phase, onPhaseChange]);

  useEffect(() => {
    if (document.querySelector('link[data-crb-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-crb-fonts', '1');
    document.head.appendChild(link);
  }, []);

  const openSession = useCallback((d) => {
    setSession(d);
    if (d.story) setStory(d.story);
    if (d.status === 'debrief' && d.debrief) {
      setDebriefData({ questions: d.debrief.questions, startedAt: d.debrief.startedAt, intro: (d.story && d.story.comms && d.story.comms.debriefIntro) || [] });
      setPhase('debrief');
    } else {
      setPhase('work');
    }
  }, []);

  // Resume an unfinished attempt after a refresh.
  useEffect(() => {
    if (!user) return;
    const id = store.get(ACTIVE_KEY);
    if (!id) { setPhase('select'); return; }
    api('get', `/session/${id}`)
      .then((d) => {
        if (d.status === 'active' || d.status === 'debrief' || d.status === 'grading') openSession(d);
        else { store.del(ACTIVE_KEY); setPhase('select'); }
      })
      .catch(() => { store.del(ACTIVE_KEY); setPhase('select'); });
  }, [user, openSession]);

  const start = async (missionId) => {
    setStarting(true); setStartError(null);
    try {
      const d = await api('post', '/start', { missionId });
      store.set(ACTIVE_KEY, d.sessionId);
      setStory(d.story || null);
      setSession({ sessionId: d.sessionId, startedAt: d.startedAt, deadline: d.deadline, mission: d.mission, files: null, chat: [], traceAnswers: {} });
      setReport(null);
      setDebriefData(null);
      setPhase('work');
    } catch (e) {
      setStartError(errMsg(e, 'Could not start the episode. Try again.'));
      setPreselect(missionId);
      setPhase('select');
    } finally { setStarting(false); }
  };

  const resumeFromServer = async () => {
    const id = store.get(ACTIVE_KEY);
    if (!id) return;
    try {
      const d = await api('get', `/session/${id}`);
      if (d.status === 'active' || d.status === 'debrief' || d.status === 'grading') openSession(d);
      else { store.del(ACTIVE_KEY); setSession(null); }
    } catch (e) { store.del(ACTIVE_KEY); setSession(null); }
  };

  const onSubmitted = (r) => {
    store.del(ACTIVE_KEY);
    setReport(r);
    setPhase('report');
    window.scrollTo(0, 0);
    if (setUserData && r.xpAwarded > 0) setUserData((prev) => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + r.xpAwarded }));
  };

  let screen;
  if (!user) {
    screen = <div style={{ minHeight: '100vh', background: C.bg, color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>Sign in to play Ship with Copilot.</div>;
  } else if (phase === 'loading') {
    screen = <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="aip-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em' }}>LOADING...</span></div>;
  } else if (phase === 'work' && session) {
    screen = <Workspace key={session.sessionId} session={session} story={story} onDebrief={(d) => { setDebriefData(d); setPhase('debrief'); window.scrollTo(0, 0); }} onExit={() => setPhase('select')} />;
  } else if (phase === 'debrief' && session && debriefData) {
    screen = <Debrief key={session.sessionId} session={session} story={story} data={debriefData} onSubmitted={onSubmitted} />;
  } else if (phase === 'report' && report) {
    screen = <Report report={report} story={story} onRetry={() => start(report.missionId)} onMissions={() => { setPreselect(report.nextMissionId || report.missionId); setPhase('select'); }} onNext={(id) => start(id)} />;
  } else {
    const resume = session && store.get(ACTIVE_KEY) === session.sessionId ? session : null;
    screen = <EpisodeBrowser key={preselect || 'browser'} onStart={start} starting={starting} startError={startError} onBack={() => navigate('/world')} resume={resume} onResume={resumeFromServer} preselect={preselect} />;
  }

  return (
    <>
      <style>{STYLE}</style>
      {screen}
    </>
  );
}

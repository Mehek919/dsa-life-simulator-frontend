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
  cyan: '#5ad8ff', green: '#3ddc97', amber: '#ffb020', red: '#ff4d5e', violet: '#a78bfa',
};
const TYPE_META = {
  review:        { label: 'REVIEW',        color: C.cyan,   hint: 'Find and fix what the AI got wrong' },
  hallucination: { label: 'HALLUCINATION', color: C.violet, hint: 'The AI invented an API that does not exist' },
  steer:         { label: 'STEER',         color: C.green,  hint: 'Guide the copilot to a correct, fast answer' },
  boss:          { label: 'BOSS',          color: C.red,    hint: 'Everything at once, under pressure' },
};
const DIMENSIONS = [
  { key: 'correctness',  label: 'Correctness',  desc: 'Hidden and visible tests passing' },
  { key: 'diagnosis',    label: 'Diagnosis',    desc: 'Problems you named in your review notes' },
  { key: 'verification', label: 'Verification', desc: 'Testing AI output before trusting it' },
  { key: 'steering',     label: 'Steering',     desc: 'How well you briefed the copilot' },
  { key: 'efficiency',   label: 'Efficiency',   desc: 'AI calls and time against par' },
];
const DEFAULT_WEIGHTS = { correctness: 40, diagnosis: 20, verification: 15, steering: 15, efficiency: 10 };
const ACTIVE_KEY = 'aiPilot.activeSession';

const STYLE = `
.aip-silver{background:linear-gradient(180deg,#ffffff 0%,#e3e8ef 42%,#8e98a8 52%,#d9dfe8 72%,#f4f6f9 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes aipBlink{0%,49%{opacity:1}50%,100%{opacity:.2}}
@keyframes aipShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
@keyframes aipPulse{0%,100%{box-shadow:0 0 0 0 rgba(90,216,255,.35)}50%{box-shadow:0 0 0 6px rgba(90,216,255,0)}}
.aip-blink{animation:aipBlink 1.2s steps(1) infinite}
.aip-skel{background:linear-gradient(90deg,#0d131d 0,#162030 50%,#0d131d 100%);background-size:800px 100%;animation:aipShimmer 1.4s linear infinite}
.aip-btn{transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease}
.aip-btn:focus-visible,.aip-card:focus-visible,.aip-tab:focus-visible{outline:2px solid #5ad8ff;outline-offset:2px}
.aip-btn:disabled{opacity:.45;cursor:not-allowed}
.aip-card{transition:transform .25s cubic-bezier(.2,.8,.2,1),border-color .2s ease,box-shadow .2s ease}
.aip-card:hover{transform:translateY(-2px);border-color:#3a4a63}
.aip-scroll{scrollbar-width:thin;scrollbar-color:#243045 transparent}
.aip-md p{margin:0 0 8px}
.aip-ws{display:grid;grid-template-columns:300px minmax(0,1fr) 360px;height:calc(100vh - 58px)}
.aip-pane{display:flex;min-width:0;min-height:0;overflow:hidden}
.aip-mtabs{display:none}
@media (max-width:1100px){.aip-ws{grid-template-columns:260px minmax(0,1fr) 320px}}
@media (max-width:900px){
  .aip-ws{display:block;height:auto}
  .aip-pane{display:none;height:calc(100vh - 106px)}
  .aip-pane.aip-on{display:flex}
  .aip-mtabs{display:flex}
  .aip-hide-sm{display:none !important}
}
@media (prefers-reduced-motion:reduce){.aip-blink,.aip-skel{animation:none}.aip-card:hover{transform:none}}
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
  bot:   'M12 3v3 M7 8h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z M9 13h.01 M15 13h.01 M9.5 17h5',
  send:  'M4 12l16-8-6 16-2.5-6.5z',
  clock: 'M12 7v5l3 2 M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z',
  doc:   'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  lock:  'M7 11V8a5 5 0 0 1 10 0v3 M5 11h14v10H5z',
  copy:  'M9 9h11v11H9z M5 15V4h11',
  flag:  'M5 21V4 M5 4h11l-2 4 2 4H5',
  eye:   'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z',
};

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
const scoreColor = (n) => (n >= 80 ? C.green : n >= 60 ? C.cyan : n >= 40 ? C.amber : C.red);
const store = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del: (k) => { try { window.localStorage.removeItem(k); } catch (e) { /* ignore */ } },
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

/** Renders copilot text with fenced code blocks. */
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

// ── Mission select ───────────────────────────────────────────────────────────
function MissionSelect({ onStart, starting, startError, onBack, resume, onResume }) {
  const [missions, setMissions] = useState(null);
  const [error, setError] = useState(false);
  const [picked, setPicked] = useState(null);
  const briefRef = useRef(null);
  const pick = (id) => {
    setPicked(id);
    if (window.innerWidth < 900 && briefRef.current) setTimeout(() => briefRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const load = useCallback(() => {
    setError(false);
    setMissions(null);
    api('get', '/missions')
      .then((d) => { setMissions(d.missions || []); setPicked((p) => p || (d.missions && d.missions[0] && d.missions[0].id)); })
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const sel = (missions || []).find((m) => m.id === picked);
  const totalXp = (missions || []).reduce((a, m) => a + ((m.progress && m.progress.bestXp) || 0), 0);
  const cleared = (missions || []).filter((m) => m.progress && m.progress.bestScore >= 60).length;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY, position: 'relative', overflowX: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: -260, width: 1400, height: 800, marginLeft: -700, background: 'radial-gradient(ellipse at 50% 40%, rgba(90,216,255,.10), rgba(167,139,250,.06) 45%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 18px', padding: '8px 16px', background: 'rgba(90,216,255,.06)', borderBottom: '1px solid rgba(90,216,255,.25)', fontFamily: DISPLAY, fontSize: 12, fontWeight: 700, letterSpacing: '.22em', color: '#8fe3ff' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="aip-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 10px ${C.cyan}` }} />
          AI TEAMMATE ONLINE
        </span>
        <span style={{ color: C.faint }}>/</span>
        <span>IT WRITES FAST. IT IS NOT ALWAYS RIGHT.</span>
      </div>

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1240, margin: '0 auto', padding: '20px 16px 48px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Btn onClick={onBack}><Icon d={I.back} /> Back</Btn>
            <div>
              <h1 className="aip-silver" style={{ margin: 0, fontFamily: DISPLAY, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '.06em' }}>SHIP WITH COPILOT</h1>
              <div style={{ color: C.dim, fontSize: 14 }}>Ship real code with an AI copilot. You are graded on how well you catch its mistakes.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: `${cleared}/${(missions || []).length || 6}`, l: 'CLEARED', c: C.green }, { v: totalXp, l: 'XP BANKED', c: C.violet }].map((s) => (
              <div key={s.l} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: '8px 14px', textAlign: 'center', minWidth: 96 }}>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, letterSpacing: '.14em', color: C.dim }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {resume && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: `${C.cyan}0d`, border: `1px solid ${C.cyan}44`, borderRadius: 14, padding: '12px 16px', marginBottom: 18 }}>
            <span style={{ fontSize: 14, color: '#bdefff' }}>Unfinished mission: <strong>{resume.mission.title}</strong>. The clock is still running.</span>
            <Btn kind="primary" onClick={onResume}><Icon d={I.play} size={12} /> Resume</Btn>
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
          {/* Mission list */}
          <div style={{ flex: '2 1 540px', minWidth: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {error && (
              <div style={{ gridColumn: '1/-1', background: C.panel, border: `1px solid ${C.red}55`, borderRadius: 14, padding: 18, color: '#ffb3ba' }}>
                Could not load missions. <Btn onClick={load} style={{ marginLeft: 8 }}>Retry</Btn>
              </div>
            )}
            {!missions && !error && [0, 1, 2, 3, 4, 5].map((k) => <div key={k} className="aip-skel" style={{ height: 150, borderRadius: 14 }} />)}
            {(missions || []).map((m) => {
              const t = TYPE_META[m.type] || TYPE_META.review;
              const on = m.id === picked;
              const best = m.progress && m.progress.bestScore;
              return (
                <button key={m.id} type="button" className="aip-card" onClick={() => pick(m.id)} aria-pressed={on}
                  style={{ textAlign: 'left', cursor: 'pointer', background: on ? `linear-gradient(180deg, ${m.color}14, ${C.panel})` : C.panel, border: `1px solid ${on ? m.color + '99' : C.line}`, borderRadius: 14, padding: 14, color: C.text, boxShadow: on ? `0 0 28px ${m.color}22` : 'none', fontFamily: BODY }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: m.color, fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '.06em' }}>
                      <span style={{ fontSize: 18 }} aria-hidden="true">{m.badge}</span>{m.company}
                    </span>
                    <Chip color={t.color}>{t.label}</Chip>
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, marginBottom: 8, lineHeight: 1.25 }}>{m.title}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontFamily: MONO, fontSize: 11, color: C.dim }}>
                    <span>{m.difficulty.toUpperCase()}</span><span>{m.timeLimitMin} MIN</span><span>{m.xp} XP</span>
                  </div>
                  <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: '#111a27', overflow: 'hidden' }}>
                    <div style={{ width: `${best || 0}%`, height: '100%', background: best ? scoreColor(best) : 'transparent' }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: best ? scoreColor(best) : C.faint, fontFamily: MONO }}>
                    {best ? `BEST ${best} · ${m.progress.bestGrade || ''}${m.progress.certificateEligible ? ' · CERT READY' : ''}` : 'NOT ATTEMPTED'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Briefing */}
          <div ref={briefRef} style={{ flex: '1 1 320px', minWidth: 0, scrollMarginTop: 12, position: 'sticky', top: 16, background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${sel ? sel.color + '55' : C.line}`, borderRadius: 18, padding: 20, minHeight: 300 }}>
            {!sel ? (
              <div style={{ color: C.dim }}>Pick a mission.</div>
            ) : (
              <>
                <SectionLabel>MISSION BRIEFING</SectionLabel>
                <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 800, margin: '8px 0 6px', color: '#f1f4f8' }}>{sel.title}</div>
                <div style={{ color: (TYPE_META[sel.type] || {}).color, fontSize: 13, marginBottom: 10 }}>{(TYPE_META[sel.type] || {}).hint}</div>
                <p style={{ color: '#c3ccd8', fontSize: 14, lineHeight: 1.65, margin: '0 0 14px' }}>{sel.brief}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {[{ v: sel.timeLimitMin + 'm', l: 'TIME' }, { v: sel.parAiCalls, l: 'AI PAR' }, { v: sel.hiddenTestCount, l: 'HIDDEN TESTS' }].map((s) => (
                    <div key={s.l} style={{ background: '#070b11', border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, color: C.text }}>{s.v}</div>
                      <div style={{ fontSize: 10, letterSpacing: '.12em', color: C.dim }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <SectionLabel style={{ marginBottom: 8 }}>HOW YOU ARE SCORED</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {DIMENSIONS.map((d) => (
                    <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ fontFamily: MONO, color: C.cyan, width: 34 }}>{DEFAULT_WEIGHTS[d.key]}%</span>
                      <span style={{ color: C.text, width: 92 }}>{d.label}</span>
                      <span style={{ color: C.dim, fontSize: 12 }}>{d.desc}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: `${C.amber}0d`, border: `1px solid ${C.amber}33`, borderRadius: 10, padding: '10px 12px', color: '#e8cf9a', fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                  <strong>Proctored.</strong> Using the copilot is allowed and expected. Tab switches and pastes from outside the copilot are logged in your report. Your copilot sees your files but <strong>not</strong> this brief, so tell it what matters.
                </div>
                {startError && <div style={{ color: '#ff8c97', fontSize: 13, marginBottom: 10 }}>{startError}</div>}
                <Btn kind="primary" onClick={() => onStart(sel.id)} disabled={starting} style={{ width: '100%', minHeight: 46, fontFamily: DISPLAY, letterSpacing: '.14em', fontSize: 14 }}>
                  <Icon d={I.play} size={14} /> {starting ? 'BOOTING WORKSPACE...' : 'START MISSION'}
                </Btn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workspace ────────────────────────────────────────────────────────────────
function Workspace({ session, onSubmitted, onExit }) {
  const mission = session.mission;
  const initialFiles = useMemo(() => {
    let local = null;
    try { local = JSON.parse(store.get('aiPilot.files.' + session.sessionId) || 'null'); } catch (e) { local = null; }
    const saved = local || session.files || [];
    return mission.files.map((f) => {
      const s = saved.find((x) => x.name === f.name);
      return { name: f.name, readOnly: f.readOnly, content: !f.readOnly && s ? s.content : f.content };
    });
  }, [mission, session.files, session.sessionId]);

  const [files, setFiles] = useState(initialFiles);
  const [active, setActive] = useState((initialFiles.find((f) => !f.readOnly) || initialFiles[0]).name);
  const [chat, setChat] = useState(session.chat || []);
  const [mode, setMode] = useState('chat');
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState(null);
  const [run, setRun] = useState(null);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showSubmit, setShowSubmit] = useState(false);
  const [notes, setNotes] = useState(() => store.get('aiPilot.notes.' + session.sessionId) || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [mobilePane, setMobilePane] = useState('code');
  const [toast, setToast] = useState(null);
  const [counts, setCounts] = useState({ tab: 0, ext: 0 });

  const filesRef = useRef(files);
  filesRef.current = files;
  const aiTexts = useRef([]);
  const internalCopies = useRef([]);
  const eventQueue = useRef([]);
  const chatEnd = useRef(null);
  const editorRef = useRef(null);

  // Seed AI text memory from resumed chat so pastes from it count as AI pastes.
  useEffect(() => {
    (session.chat || []).forEach((c) => {
      aiTexts.current.push(norm(c.response));
      if (c.suggestion) aiTexts.current.push(norm(c.suggestion.content));
    });
  }, [session.chat]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { chatEnd.current && chatEnd.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chat, asking]);
  useEffect(() => { store.set('aiPilot.notes.' + session.sessionId, notes); }, [notes, session.sessionId]);
  useEffect(() => {
    const t = setTimeout(() => store.set('aiPilot.files.' + session.sessionId, JSON.stringify(files.filter((f) => !f.readOnly).map((f) => ({ name: f.name, content: f.content })))), 400);
    return () => clearTimeout(t);
  }, [files, session.sessionId]);

  const remaining = session.deadline - now;
  const timeUp = remaining <= 0;
  const aiCalls = chat.length;

  const flash = (msg, color = C.amber) => { setToast({ msg, color }); setTimeout(() => setToast(null), 2600); };

  // ── proctoring ──
  const queueEvent = useCallback((type, chars) => { eventQueue.current.push({ type, chars: chars || 0 }); }, []);
  const flushEvents = useCallback(async () => {
    if (!eventQueue.current.length) return;
    const batch = eventQueue.current.splice(0, 25);
    try { await api('post', `/${session.sessionId}/events`, { events: batch }); }
    catch (e) { eventQueue.current.unshift(...batch); }
  }, [session.sessionId]);

  useEffect(() => {
    const t = setInterval(flushEvents, 5000);
    const onVis = () => {
      if (document.hidden) { queueEvent('tab_switch'); setCounts((c) => ({ ...c, tab: c.tab + 1 })); }
      else flash('Tab switch logged. It appears in your report.');
    };
    const onKey = (e) => {
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))) queueEvent('devtools');
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
    if (filesRef.current.some((f) => norm(f.content).indexOf(t) !== -1)) return; // moved within the project
    if (aiTexts.current.some((a) => a.indexOf(t) !== -1)) { queueEvent('ai_paste', t.length); return; }
    queueEvent('external_paste', t.length);
    setCounts((c) => ({ ...c, ext: c.ext + 1 }));
    flash('Paste from outside the copilot logged.');
  }, [queueEvent]);

  const onEditorMount = (editor) => {
    editorRef.current = editor;
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
    try { await navigator.clipboard.writeText(text); flash('Copied. Pasting AI code is allowed.', C.green); }
    catch (e) { flash('Copy failed. Select the code manually.'); }
  };

  // ── copilot ──
  const ask = async () => {
    const message = input.trim();
    if (!message || asking || timeUp) return;
    setAsking(true); setAskError(null);
    try {
      const d = await api('post', `/${session.sessionId}/ask`, { mode, message, fileName: active, files: editable() });
      aiTexts.current.push(norm(d.response));
      if (d.suggestion) aiTexts.current.push(norm(d.suggestion.content));
      const base = (filesRef.current.find((f) => d.suggestion && f.name === d.suggestion.fileName) || {}).content || '';
      setChat((c) => [...c, { id: d.id, mode: d.mode, prompt: message, response: d.response, suggestion: d.suggestion ? { ...d.suggestion, base, decision: null } : null, at: Date.now() }]);
      setInput('');
    } catch (e) {
      setAskError(errMsg(e, 'The copilot did not answer. Try again.'));
    } finally { setAsking(false); }
  };

  const decide = async (entry, decision) => {
    try {
      await api('post', `/${session.sessionId}/suggestions/${entry.suggestion.id}`, { decision });
      if (decision === 'accept') { setFileContent(entry.suggestion.fileName, entry.suggestion.content); setActive(entry.suggestion.fileName); }
      setChat((c) => c.map((x) => (x.id === entry.id ? { ...x, suggestion: { ...x.suggestion, decision } } : x)));
      flash(decision === 'accept' ? 'Change applied. Run the tests before you trust it.' : 'Change rejected.', decision === 'accept' ? C.cyan : C.dim);
    } catch (e) { flash(errMsg(e, 'Could not save that decision.')); }
  };

  // ── tests ──
  const runTests = async () => {
    if (running || timeUp) return;
    setRunning(true);
    try {
      const d = await api('post', `/${session.sessionId}/run`, { files: editable() });
      setRun(d);
      if (mobilePane !== 'code') setMobilePane('code');
    } catch (e) {
      setRun({ error: errMsg(e, 'Could not run tests. Try again.') });
    } finally { setRunning(false); }
  };

  const submit = async () => {
    setSubmitting(true); setSubmitError(null);
    try {
      await flushEvents();
      const d = await api('post', `/${session.sessionId}/submit`, { files: editable(), notes });
      store.del('aiPilot.notes.' + session.sessionId);
      store.del('aiPilot.files.' + session.sessionId);
      onSubmitted(d.report);
    } catch (e) {
      setSubmitError(errMsg(e, 'Grading failed. Your work is saved, so try again.'));
    } finally { setSubmitting(false); }
  };

  const activeFile = files.find((f) => f.name === active) || files[0];
  const clockColor = remaining < 5 * 60000 ? C.red : remaining < 10 * 60000 ? C.amber : C.cyan;
  const t = TYPE_META[mission.type] || TYPE_META.review;

  // ── panes ──
  const briefPane = (
    <div className={'aip-pane aip-scroll' + (mobilePane === 'brief' ? ' aip-on' : '')} style={{ flexDirection: 'column', borderRight: `1px solid ${C.line}`, background: C.panel, overflowY: 'auto', padding: 16, gap: 14, boxSizing: 'border-box' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">{mission.badge}</span>
          <span style={{ color: mission.color, fontFamily: DISPLAY, fontWeight: 700 }}>{mission.company}</span>
          <Chip color={t.color}>{t.label}</Chip>
        </div>
        <p style={{ color: '#c3ccd8', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{mission.brief}</p>
      </div>
      <div>
        <SectionLabel style={{ marginBottom: 8 }}>REQUIREMENTS</SectionLabel>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mission.task.map((line, i) => <li key={i} style={{ color: '#d3dae4', fontSize: 13, lineHeight: 1.55 }}>{line}</li>)}
        </ol>
      </div>
      <div style={{ background: `${C.violet}0f`, border: `1px solid ${C.violet}33`, borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.6, color: '#cfc4fb' }}>
        <Icon d={I.eye} size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
        Your copilot can read your files but has not seen these requirements. Good prompts pass them on.
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
      <div role="tablist" style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${C.line}`, background: C.panel, overflowX: 'auto' }} className="aip-scroll">
        {files.map((f) => (
          <button key={f.name} type="button" role="tab" aria-selected={f.name === active} className="aip-tab" onClick={() => setActive(f.name)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 38, border: 'none', borderRight: `1px solid ${C.line}`, borderTop: `2px solid ${f.name === active ? C.cyan : 'transparent'}`, background: f.name === active ? '#05070b' : 'transparent', color: f.name === active ? C.text : C.dim, fontFamily: MONO, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Icon d={f.readOnly ? I.lock : I.doc} size={12} />{f.name}{f.readOnly && <span style={{ color: C.faint, fontSize: 10 }}>read-only</span>}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 240 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          language="javascript"
          path={activeFile.name}
          value={activeFile.content}
          onChange={(v) => { if (!activeFile.readOnly) setFileContent(activeFile.name, v || ''); }}
          onMount={onEditorMount}
          loading={<span style={{ fontFamily: DISPLAY, letterSpacing: '.2em', fontSize: 12, color: C.dim }}>LOADING EDITOR...</span>}
          options={{ readOnly: activeFile.readOnly || timeUp, minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", scrollBeyondLastLine: false, wordWrap: 'on', tabSize: 2, automaticLayout: true }}
        />
      </div>
      <div className="aip-scroll" style={{ height: 210, borderTop: `1px solid ${C.line}`, background: '#04060a', overflowY: 'auto' }}>
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
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.12em', fontSize: 13, color: C.cyan }}>
          <Icon d={I.bot} size={16} /> COPILOT
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
            <strong style={{ color: C.text }}>Chat</strong> answers questions and shows code you can copy.<br />
            <strong style={{ color: C.text }}>Agent</strong> rewrites the open file. You review the diff and accept or reject it.<br /><br />
            The copilot is a fast model. It can be wrong, just like the teammate who wrote this PR.
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
        {mode === 'agent' && <div style={{ fontSize: 11, color: C.amber, marginBottom: 6 }}>Agent will propose a rewrite of <span style={{ fontFamily: MONO }}>{activeFile.readOnly ? '(pick an editable file)' : activeFile.name}</span>.</div>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} disabled={timeUp}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
            placeholder={mode === 'agent' ? 'Describe exactly what to change and why...' : 'Ask about the code, a bug, an edge case...'}
            aria-label="Message the copilot"
            style={{ flex: 1, resize: 'none', background: '#05080d', border: `1px solid ${C.line2}`, borderRadius: 10, padding: '8px 10px', color: C.text, fontFamily: BODY, fontSize: 13, lineHeight: 1.5, outline: 'none' }} />
          <Btn kind="primary" onClick={ask} disabled={asking || !input.trim() || timeUp || (mode === 'agent' && activeFile.readOnly)} style={{ minHeight: 42, padding: '0 12px' }} title="Send">
            <Icon d={I.send} size={15} />
          </Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: BODY, minHeight: '100vh' }}>
      {/* Top bar */}
      <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 12px', borderBottom: `1px solid ${C.line}`, background: '#080c13' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Btn onClick={onExit} style={{ minHeight: 34, padding: '0 10px' }} title="Leave (progress is saved)"><Icon d={I.back} /></Btn>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mission.title}</div>
            <div className="aip-hide-sm" style={{ fontSize: 11, color: C.dim, fontFamily: MONO }}>CODE REVIEW · COPILOT · {mission.company.toUpperCase()} · {mission.difficulty.toUpperCase()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontWeight: 700, fontSize: 15, color: clockColor, padding: '4px 10px', border: `1px solid ${clockColor}44`, borderRadius: 8, background: `${clockColor}10` }} aria-label="Time remaining">
            <Icon d={I.clock} size={14} />{timeUp ? 'TIME UP' : fmtClock(remaining)}
          </span>
          <Btn kind="primary" onClick={() => setShowSubmit(true)} style={{ fontFamily: DISPLAY, letterSpacing: '.1em' }}><Icon d={I.flag} size={14} /> SUBMIT</Btn>
        </div>
      </div>

      {/* Mobile pane switcher */}
      <div className="aip-mtabs" role="tablist" style={{ height: 48, borderBottom: `1px solid ${C.line}`, background: C.panel }}>
        {[{ id: 'brief', l: 'Brief' }, { id: 'code', l: 'Code' }, { id: 'ai', l: `Copilot (${aiCalls})` }].map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={mobilePane === p.id} className="aip-tab" onClick={() => setMobilePane(p.id)}
            style={{ flex: 1, border: 'none', borderBottom: `2px solid ${mobilePane === p.id ? C.cyan : 'transparent'}`, background: 'transparent', color: mobilePane === p.id ? C.text : C.dim, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {p.l}
          </button>
        ))}
      </div>

      {timeUp && (
        <div style={{ background: `${C.red}14`, borderBottom: `1px solid ${C.red}44`, color: '#ffb3ba', padding: '8px 16px', fontSize: 13, textAlign: 'center' }}>
          Time is up. Editing, tests and the copilot are closed. Submit your work now.
        </div>
      )}

      <div className="aip-ws">
        {briefPane}
        {codePane}
        {copilotPane}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status"
            style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#0b1018', border: `1px solid ${toast.color}66`, color: toast.color, borderRadius: 10, padding: '10px 16px', fontSize: 13, boxShadow: '0 12px 30px rgba(0,0,0,.5)', maxWidth: 'calc(100vw - 32px)' }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(2,4,8,.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget && !submitting) setShowSubmit(false); }}>
            <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 10 }} role="dialog" aria-modal="true" aria-labelledby="aip-submit-title"
              style={{ width: '100%', maxWidth: 620, background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${C.cyan}44`, borderRadius: 18, padding: 22 }}>
              <h2 id="aip-submit-title" style={{ margin: '0 0 6px', fontFamily: DISPLAY, fontSize: 20, letterSpacing: '.04em' }}>Your review of the AI's code</h2>
              <p style={{ margin: '0 0 12px', color: C.dim, fontSize: 13, lineHeight: 1.6 }}>
                Name each problem you found in the original AI code and why it matters. This is scored as <strong style={{ color: C.text }}>Diagnosis</strong>, so be specific: what breaks, for which input.
              </p>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} maxLength={6000} aria-label="Review notes"
                placeholder={'1. The cache key uses ... so ...\n2. ...'}
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#05080d', border: `1px solid ${C.line2}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontFamily: BODY, fontSize: 14, lineHeight: 1.6, outline: 'none' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <span style={{ fontSize: 12, color: run && run.allPass ? C.green : C.amber }}>
                  {run ? (run.allPass ? 'Last test run: all visible tests passing.' : 'Last test run still had failures.') : 'You have not run the tests yet.'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn onClick={() => setShowSubmit(false)} disabled={submitting}>Keep working</Btn>
                  <Btn kind="primary" onClick={submit} disabled={submitting}>{submitting ? 'Grading...' : 'Submit for grading'}</Btn>
                </div>
              </div>
              {submitError && <div style={{ color: '#ff8c97', fontSize: 13, marginTop: 10 }}>{submitError}</div>}
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
          {open ? '▾' : '▸'} {s.fileName} <span style={{ color: C.green }}>+{added}</span> <span style={{ color: C.red }}>-{removed}</span>
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

// ── Report ───────────────────────────────────────────────────────────────────
function Report({ report, onRetry, onMissions }) {
  const color = scoreColor(report.total);
  const verdict = report.total >= 80 ? 'SHIPPED SAFELY' : report.total >= 60 ? 'SHIPPED WITH SCARS' : report.total >= 40 ? 'BUGS REACHED PROD' : 'ROLLED BACK';
  const d = report.dimensions;
  const [showMissed, setShowMissed] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: BODY, padding: '36px 16px', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ position: 'absolute', left: '50%', top: -200, width: 1100, height: 700, marginLeft: -550, background: `radial-gradient(ellipse at 50% 40%, ${color}22, transparent 65%)`, pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        style={{ position: 'relative', maxWidth: 820, margin: '0 auto', background: 'linear-gradient(180deg,#0d131d,#080b11)', border: `1px solid ${color}55`, borderRadius: 22, padding: 'clamp(18px, 4vw, 32px)', boxShadow: `0 0 50px ${color}22, 0 40px 80px rgba(0,0,0,.6)` }}>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <Chip color={color}><span className="aip-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />{verdict}</Chip>
          <h2 className="aip-silver" style={{ margin: '12px 0 4px', fontFamily: DISPLAY, fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, letterSpacing: '.04em' }}>COPILOT REPORT</h2>
          <p style={{ fontFamily: MONO, color: C.dim, margin: 0, fontSize: 13 }}>{report.company} · {report.missionTitle}</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150, delay: 0.15 }}
            style={{ width: 112, height: 112, borderRadius: '50%', background: `${color}18`, border: `3px solid ${color}`, boxShadow: `0 0 30px ${color}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 46, fontWeight: 800, color, lineHeight: 1 }}>{report.grade}</span>
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color }}>{report.total}/100</span>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(96px,1fr))', gap: 8 }}>
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
          <div style={{ textAlign: 'center', fontSize: 12, color: C.dim, marginTop: -12, marginBottom: 18 }}>No new XP this time. Beat your best score on this mission to earn more.</div>
        )}

        {/* Dimension bars */}
        <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 12 }}>SCORE BREAKDOWN</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DIMENSIONS.map((dim) => {
              const v = d[dim.key].score;
              const w = report.weights[dim.key];
              return (
                <div key={dim.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, marginBottom: 5 }}>
                    <span><span style={{ color: C.text, fontWeight: 600 }}>{dim.label}</span> <span style={{ color: C.faint, fontSize: 12 }}>· {w}% of total</span></span>
                    <span style={{ fontFamily: MONO, color: v === null ? C.faint : scoreColor(v) }}>{v === null ? 'not used' : v}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 6, background: '#111a27', overflow: 'hidden' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${v || 0}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} style={{ height: '100%', background: v === null ? 'transparent' : scoreColor(v) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
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

        {/* Issues */}
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

        {/* Hidden tests */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }} aria-label="Hidden test results">
          {report.tests.hidden.map((h) => (
            <span key={h.name} title={h.name} style={{ fontFamily: MONO, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: `1px solid ${(h.pass ? C.green : C.red)}55`, color: h.pass ? C.green : C.red, background: `${h.pass ? C.green : C.red}10` }}>
              {h.pass ? '✓' : '✗'} {h.name.replace('Hidden test ', 'H')}
            </span>
          ))}
        </div>

        {report.certificateEligible ? (
          <div style={{ background: `${C.green}10`, border: `1px solid ${C.green}55`, borderRadius: 14, padding: '12px 14px', color: '#b6f3d6', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            <strong style={{ color: C.green }}>Certificate ready.</strong> This attempt meets the Copilot certificate bar: 70+ overall, 80+ correctness, real copilot use and a clean or reviewable integrity record.
          </div>
        ) : (
          <div style={{ background: '#0a0f17', border: `1px solid ${C.line}`, borderRadius: 14, padding: '12px 14px', color: C.dim, fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
            Certificate bar: 70+ overall, 80+ correctness, at least one copilot call and integrity not flagged.
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          <Btn onClick={onMissions}>All missions</Btn>
          <Btn kind="primary" onClick={onRetry}><Icon d={I.play} size={13} /> Try again</Btn>
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
  const [report, setReport] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  useEffect(() => { if (onPhaseChange) onPhaseChange(phase); }, [phase, onPhaseChange]);

  useEffect(() => {
    if (document.querySelector('link[data-crb-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-crb-fonts', '1');
    document.head.appendChild(link);
  }, []);

  // Resume an unfinished attempt after a refresh.
  useEffect(() => {
    if (!user) return;
    const id = store.get(ACTIVE_KEY);
    if (!id) { setPhase('select'); return; }
    api('get', `/session/${id}`)
      .then((d) => {
        if (d.status === 'active' || d.status === 'grading') { setSession(d); setPhase('work'); }
        else { store.del(ACTIVE_KEY); setPhase('select'); }
      })
      .catch(() => { store.del(ACTIVE_KEY); setPhase('select'); });
  }, [user]);

  const start = async (missionId) => {
    setStarting(true); setStartError(null);
    try {
      const d = await api('post', '/start', { missionId });
      store.set(ACTIVE_KEY, d.sessionId);
      setSession({ sessionId: d.sessionId, startedAt: d.startedAt, deadline: d.deadline, mission: d.mission, files: null, chat: [] });
      setReport(null);
      setPhase('work');
    } catch (e) {
      setStartError(errMsg(e, 'Could not start the mission. Try again.'));
    } finally { setStarting(false); }
  };

  const onSubmitted = (r) => {
    store.del(ACTIVE_KEY);
    setReport(r);
    setPhase('report');
    if (setUserData && r.xpAwarded > 0) setUserData((prev) => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + r.xpAwarded }));
  };

  const resumeFromServer = async () => {
    const id = store.get(ACTIVE_KEY);
    if (!id) return;
    try {
      const d = await api('get', `/session/${id}`);
      if (d.status === 'active' || d.status === 'grading') { setSession(d); setPhase('work'); }
      else { store.del(ACTIVE_KEY); setSession(null); }
    } catch (e) { store.del(ACTIVE_KEY); setSession(null); }
  };

  let screen;
  if (!user) {
    screen = <div style={{ minHeight: '100vh', background: C.bg, color: C.dim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BODY }}>Sign in to use Ship with Copilot.</div>;
  } else if (phase === 'loading') {
    screen = <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="aip-silver" style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.2em' }}>LOADING...</span></div>;
  } else if (phase === 'work' && session) {
    screen = <Workspace key={session.sessionId} session={session} onSubmitted={onSubmitted} onExit={() => setPhase('select')} />;
  } else if (phase === 'report' && report) {
    screen = <Report report={report} onRetry={() => start(report.missionId)} onMissions={() => setPhase('select')} />;
  } else {
    const resume = session && store.get(ACTIVE_KEY) === session.sessionId ? session : null;
    screen = <MissionSelect onStart={start} starting={starting} startError={startError} onBack={() => navigate('/world')} resume={resume} onResume={resumeFromServer} />;
  }

  return (
    <>
      <style>{STYLE}</style>
      {screen}
    </>
  );
}

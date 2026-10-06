import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import './LifeStory.css';
// ─── Helpers ──────────────────────────────────────────────────────────────────
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function getWeekLabel(weekId) {
  const m = String(weekId || '').match(/(\d{4})-W(\d{2})/);
  return m ? `Week ${parseInt(m[2], 10)}, ${m[1]}` : (weekId || 'This week');
}
function toDate(ts) {
  if (!ts) return null;
  const d = typeof ts?.toDate === 'function' ? ts.toDate() : ts?._seconds !== undefined ? new Date(ts._seconds * 1000)
    : ts?.seconds !== undefined ? new Date(ts.seconds * 1000) : new Date(ts);
  return isNaN(d?.getTime?.()) ? null : d;
}
const fmtDate = (ts) => { const d = toDate(ts); return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''; };

// Mood of the week (drives the 3D world and the page colours) from real solves
const MOODS = {
  calm:    { name: 'Calm before the storm', c: '#4c6fff', c2: '#35e0ff', speed: 0.25, energy: 0.3 },
  steady:  { name: 'Steady climb', c: '#20c997', c2: '#39ff88', speed: 0.45, energy: 0.5 },
  rising:  { name: 'Rising tide', c: '#7c5cff', c2: '#ff6bd6', speed: 0.6, energy: 0.7 },
  blazing: { name: 'Blazing run', c: '#ff7a45', c2: '#f4b740', speed: 0.9, energy: 1 },
};
const moodFor = (s = {}) => { const n = s.solves || 0; return n >= 12 ? 'blazing' : n >= 5 ? 'rising' : n >= 1 ? 'steady' : 'calm'; };

// Avatar evolves with total XP
const STAGES = [['Apprentice', 0], ['Adept', 400], ['Knight', 900], ['Archmage', 1600]];
const stageOf = (xp) => STAGES.reduce((s, [, need], i) => (xp >= need ? i : s), 0);
function avatarSvg(stage, c, c2, label = true) {
  const robe = stage === 0 ? '#5b5bd6' : c;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"${label ? ` role="img" aria-label="${STAGES[stage][0]} avatar"` : ''}>
    ${stage >= 3 ? `<circle cx="100" cy="92" r="84" fill="none" stroke="${c2}" stroke-width="2" stroke-dasharray="4 8" opacity=".8"/>` : ''}
    <ellipse cx="100" cy="186" rx="44" ry="7" fill="#000" opacity=".35"/>
    <path d="M62 180 Q66 120 100 112 Q134 120 138 180 Z" fill="${robe}"/>
    ${stage >= 2 ? `<path d="M70 132 L100 122 L130 132 L126 150 L74 150 Z" fill="#cfd6e6"/><circle cx="100" cy="138" r="5" fill="${c2}"/>` : ''}
    <circle cx="100" cy="86" r="34" fill="#f2d3b3"/><circle cx="88" cy="88" r="4" fill="#2a1f3d"/><circle cx="112" cy="88" r="4" fill="#2a1f3d"/>
    <path d="M90 100 Q100 106 110 100" stroke="#2a1f3d" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M64 80 Q70 44 100 46 Q132 44 136 80 Q118 64 100 66 Q82 64 64 80 Z" fill="#3a2a55"/>
    ${stage >= 1 ? `<path d="M66 60 L100 22 L134 60 Z" fill="${c}" stroke="${c2}" stroke-width="2"/><circle cx="100" cy="30" r="4" fill="${c2}"/>` : ''}
    ${stage >= 1 ? `<line x1="150" y1="70" x2="150" y2="180" stroke="#8b6b45" stroke-width="5" stroke-linecap="round"/><circle cx="150" cy="64" r="${stage >= 3 ? 13 : 9}" fill="${c2}"/>` : ''}
  </svg>`;
}
const KC = { place: '#f4b740', topic: '#35e0ff', stat: '#39ff88' };

// Split the chapter into plain text and keyword segments (first occurrence of each keyword)
function segmentsFor(content, keywords = []) {
  const hits = [];
  keywords.forEach((k) => {
    const i = content.indexOf(k.text);
    if (i >= 0 && !hits.some((h) => i < h.end && i + k.text.length > h.start)) hits.push({ start: i, end: i + k.text.length, k });
  });
  hits.sort((a, b) => a.start - b.start);
  const segs = []; let at = 0;
  hits.forEach((h) => { if (h.start > at) segs.push(content.slice(at, h.start)); segs.push(h.k); at = h.end; });
  if (at < content.length) segs.push(content.slice(at));
  return segs;
}

// ─── Typewriter chapter with hoverable keywords ───────────────────────────────
function Chapter({ content, keywords, onTip }) {
  const segs = useMemo(() => segmentsFor(content, keywords), [content, keywords]);
  const total = content.length;
  const [n, setN] = useState(reduceMotion() ? total : 0);
  useEffect(() => {
    if (reduceMotion()) { setN(total); return undefined; }
    setN(0);
    const id = setInterval(() => setN((v) => { if (v >= total) { clearInterval(id); return v; } return Math.min(total, v + 2); }), 28);
    return () => clearInterval(id);
  }, [content, total]);
  const done = n >= total;
  let left = n; const shown = [], rest = [];
  segs.forEach((s, i) => {
    const txt = typeof s === 'string' ? s : s.text, part = txt.slice(0, Math.max(0, left)), after = txt.slice(part.length); left -= part.length;
    if (part) shown.push(typeof s === 'string' ? <React.Fragment key={i}>{part}</React.Fragment>
      : <span key={i} className="kw" tabIndex={0} style={{ '--kc': KC[s.kind] }}
          onPointerEnter={(e) => onTip(e.currentTarget, s)} onPointerLeave={() => onTip(null)} onFocus={(e) => onTip(e.currentTarget, s)} onBlur={() => onTip(null)}>{part}</span>);
    if (after) rest.push(after);
  });
  return (
    <>
      <div className="prose" aria-label={done ? content : undefined}>
        <span aria-hidden={!done}>{shown}</span>{!done && <span className="caret" aria-hidden="true" />}
        {rest.length > 0 && <span className="unseen" aria-hidden="true">{rest.join('')}</span>}
      </div>
      {!done && <button type="button" className="skip" onClick={() => setN(total)}>Show the whole chapter</button>}
    </>
  );
}

// ─── Trading card ─────────────────────────────────────────────────────────────
const FINISHES = { holo: ['Holo', '#7c5cff', '#35e0ff'], gold: ['Gold', '#f4b740', '#b45309'], ruby: ['Ruby', '#ff4d6d', '#5b0b2a'], emerald: ['Emerald', '#20c997', '#064e3b'] };
const rarityOf = (xp) => (xp >= 1600 ? 'LEGENDARY' : xp >= 900 ? 'EPIC' : xp >= 400 ? 'RARE' : 'COMMON');
function renderCardPng({ name, xp, stage, level, solved, streak, weekLabel, finish }) {
  const [, r1, r2] = FINISHES[finish], W = 600, H = 840, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, r1); gr.addColorStop(1, r2); g.fillStyle = gr; rr(0, 0, W, H, 36); g.fill();
  g.fillStyle = 'rgba(8,6,20,.6)'; rr(28, 28, W - 56, H - 56, 24); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#fff'; g.font = '800 22px "JetBrains Mono", monospace'; g.fillText(rarityOf(xp), 56, 76); g.textAlign = 'right'; g.fillText(`LV ${level}`, W - 56, 76); g.textAlign = 'left';
  const art = g.createRadialGradient(W / 2, 300, 20, W / 2, 300, 260); art.addColorStop(0, '#ffffff'); art.addColorStop(0.25, r1); art.addColorStop(1, r2); g.fillStyle = art; rr(56, 100, W - 112, 400, 20); g.fill();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      g.drawImage(img, W / 2 - 170, 120, 340, 340);
      g.fillStyle = '#fff'; g.font = '800 40px Inter, sans-serif'; g.fillText(name.slice(0, 20), 56, 560);
      g.font = '600 22px Inter, sans-serif'; g.globalAlpha = 0.85; g.fillText(STAGES[stage][0], 56, 596); g.globalAlpha = 1;
      [['SOLVED', solved], ['XP', xp], ['STREAK', streak]].forEach(([l, v], i) => { const x = 56 + i * 170; g.fillStyle = 'rgba(255,255,255,.12)'; rr(x, 630, 150, 100, 14); g.fill(); g.fillStyle = '#fff'; g.font = '700 16px Inter, sans-serif'; g.fillText(l, x + 16, 662); g.font = '900 34px Inter, sans-serif'; g.fillText(String(v), x + 16, 708); });
      g.font = '700 16px "JetBrains Mono", monospace'; g.globalAlpha = 0.8; g.fillText(`EVOWORLD · ${weekLabel.toUpperCase()}`, 56, 780); g.globalAlpha = 1;
      c.toBlob((b) => resolve(b), 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(avatarSvg(stage, r1, '#ffffff', false));
  });
}
function TradingCard({ info, onClose }) {
  const [finish, setFinish] = useState('holo');
  const [png, setPng] = useState(null);
  const cardRef = useRef(null), firstRef = useRef(null);
  const [, r1, r2] = FINISHES[finish];
  useEffect(() => {
    const prev = document.activeElement; if (firstRef.current) firstRef.current.focus();
    const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k);
    return () => { document.removeEventListener('keydown', k); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  useEffect(() => () => { if (png) URL.revokeObjectURL(png.url); }, [png]);
  const tilt = (e) => { if (reduceMotion() || !cardRef.current) return; const r = cardRef.current.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; cardRef.current.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg)`; cardRef.current.style.setProperty('--hx', `${(x + 0.5) * 100}%`); };
  const make = async () => { const blob = await renderCardPng({ ...info, finish }); if (png) URL.revokeObjectURL(png.url); setPng({ blob, url: URL.createObjectURL(blob) }); };
  const share = async () => {
    const file = new File([png.blob], 'evoworld-card.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'My EvoWorld card' }); } catch (e) { /* cancelled */ } }
  };
  return (
    <div className="shade open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cardbox" role="dialog" aria-modal="true" aria-labelledby="ls-card">
        <div className="tc-stage" onPointerMove={tilt} onPointerLeave={() => { if (cardRef.current) cardRef.current.style.transform = ''; }}>
          <div className="tc" ref={cardRef} style={{ '--r1': r1, '--r2': r2 }}>
            <div className="frame">
              <div className="row1"><span>{rarityOf(info.xp)}</span><span>LV {info.level}</span></div>
              <div className="art" dangerouslySetInnerHTML={{ __html: avatarSvg(info.stage, r1, '#ffffff') }} />
              <h4>{info.name}</h4><div className="cls">{STAGES[info.stage][0]}</div>
              <div className="st"><div>SOLVED<b>{info.solved}</b></div><div>XP<b>{info.xp}</b></div><div>STREAK<b>{info.streak}</b></div></div>
              <div className="ft"><span>EVOWORLD · {info.weekLabel.toUpperCase()}</span></div>
            </div>
          </div>
        </div>
        <div className="opts">
          <h2 id="ls-card">Trading card</h2>
          <p>Your rarity comes from your real XP. Pick a finish, then save it as an image to share.</p>
          <div className="swatches" role="group" aria-label="Card finish">
            {Object.entries(FINISHES).map(([k, [l]], i) => <button type="button" key={k} ref={i === 0 ? firstRef : undefined} aria-pressed={finish === k} onClick={() => { setFinish(k); setPng(null); }}>{l}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="cta" onClick={make}>Generate image</button>
            <button type="button" className="ghost" onClick={onClose}>Close</button>
          </div>
          {png && (
            <div className="png">
              <img src={png.url} alt="Your trading card" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <a className="cta" href={png.url} download="evoworld-card.png" style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Download</a>
                {typeof navigator !== 'undefined' && navigator.canShare && <button type="button" className="ghost" onClick={share}>Share</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LifeStory({ user, userData }) {
  const navigate = useNavigate();
  const uid = user?.uid;
  const [story, setStory] = useState(null);
  const [archive, setArchive] = useState([]);
  const [stage, setStage] = useState('loading');   // loading | reveal | error
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [tip, setTip] = useState(null);
  const [toast, setToast] = useState('');

  const name = userData?.displayName || user?.displayName || (user?.email || '').split('@')[0] || 'Coder';
  const xp = userData?.xp ?? 0, level = userData?.level ?? 1, streak = userData?.streak ?? 0;
  const solvedTotal = Object.keys(userData?.solvedProblems || {}).length;
  const avStage = stageOf(xp), next = STAGES[avStage + 1];
  const stats = story?.stats || {};
  const mood = MOODS[moodFor(stats)];

  const generateStory = useCallback(async (force = false) => {
    if (!uid) return;
    setGenerating(true); setNotice('');
    if (!force) setStage('loading');
    try {
      const res = await axios.post(`${API_BASE}/story/generate`, { userId: uid, force });
      setStory(res.data?.story); setStage('reveal');
      if (force && typeof res.data?.regenerationsLeft === 'number') setNotice(`New chapter written. ${res.data.regenerationsLeft} rewrite${res.data.regenerationsLeft === 1 ? '' : 's'} left this week.`);
    } catch (err) {
      if (err.response?.status === 429) { setNotice(err.response.data?.message || 'No rewrites left this week.'); }
      else if (force) setNotice('Could not rewrite the chapter. Try again in a moment.');
      else { setError('Failed to generate your story.'); setStage('error'); }
    } finally { setGenerating(false); }
  }, [uid]);

  const fetchStory = useCallback(async () => {
    if (!uid) return;
    setStage('loading');
    try {
      const res = await axios.get(`${API_BASE}/story/${uid}`);
      if (res.data?.story) { setStory(res.data.story); setStage('reveal'); } else await generateStory(false);
    } catch (err) { setError('Failed to load your story.'); setStage('error'); }
  }, [uid, generateStory]);

  const fetchArchive = useCallback(async () => {
    if (!uid) return;
    try { const res = await axios.get(`${API_BASE}/story/${uid}/archive`); setArchive(res.data?.archive || []); } catch (e) { /* archive is optional */ }
  }, [uid]);

  useEffect(() => { fetchStory(); fetchArchive(); }, [fetchStory, fetchArchive]);
  useEffect(() => { if (story && !generating) fetchArchive(); }, [story, generating, fetchArchive]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { const h = () => setTip(null); window.addEventListener('scroll', h, { passive: true }); return () => window.removeEventListener('scroll', h); }, []);
  useEffect(() => {
    if (!showArchive) return undefined;
    const k = (e) => { if (e.key === 'Escape') setShowArchive(false); }; document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [showArchive]);

  // 3D world: loaded after the page shows, recoloured when the mood changes
  const worldHost = useRef(null), world = useRef(null), moodRef = useRef(mood);
  moodRef.current = mood;
  useEffect(() => {
    let dead = false;
    import('./StoryScene').then((m) => { if (!dead && worldHost.current) world.current = m.mountStoryWorld(worldHost.current, moodRef.current); }).catch(() => {});
    return () => { dead = true; if (world.current) world.current.destroy(); world.current = null; };
  }, []);
  useEffect(() => { if (world.current) world.current.setMood(mood); }, [mood]);

  const onTip = useCallback((el, k) => {
    if (!el) { setTip(null); return; }
    const r = el.getBoundingClientRect(); setTip({ x: r.left + r.width / 2, y: r.top, k });
  }, []);

  const weekLabel = getWeekLabel(story?.weekId);
  const content = story?.content || story?.story || '';
  const share = async () => {
    const text = `📖 My DSA Life Story — ${weekLabel}\n\n${story?.title ? story.title + '\n\n' : ''}${content}\n\n— ${name} (${STAGES[avStage][0]})\nDSA Life Simulator`;
    if (navigator.share) { try { await navigator.share({ title: 'My DSA Life Story', text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(text); setToast('Story copied. Paste it anywhere to share.'); } catch (e) { window.prompt('Copy your story:', text); }
  };

  const quests = [
    ['Solve 3 problems', Math.min(stats.solves || 0, 3), 3],
    ['Win an Arena battle', Math.min(stats.battlesWon || 0, 1), 1],
    ['Earn 200 XP', Math.min(stats.xpEarned || 0, 200), 200],
  ];
  const miles = [
    ['🌱', 'First solve', 'Solve any problem', solvedTotal >= 1],
    ['🔥', '7-day streak', `${Math.min(streak, 7)}/7 days`, streak >= 7],
    ['⚔️', '25 problems', `${Math.min(solvedTotal, 25)}/25 solved`, solvedTotal >= 25],
    ['🏰', '1,000 XP', `${Math.min(xp, 1000)}/1000 XP`, xp >= 1000],
    ['👑', '50 problems', `${Math.min(solvedTotal, 50)}/50 solved`, solvedTotal >= 50],
  ];
  const nextMile = miles.findIndex((m) => !m[3]);
  const currentIdx = archive.findIndex((c) => c.weekId === story?.weekId);
  const chapterNo = currentIdx >= 0 ? archive.length - currentIdx : archive.length + (story ? 1 : 0);
  const isThisWeek = archive.length === 0 || archive[0]?.weekId === story?.weekId;

  return (
    <div className="ls" style={{ '--mc': mood.c, '--mc2': mood.c2 }}>
      <div className="world" ref={worldHost} aria-hidden="true" />
      <div className="veil" aria-hidden="true" />
      <div className="page">
        <div className="top">
          <button type="button" className="ghost" onClick={() => navigate('/world')}>&larr; Back to World</button>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="ghost" onClick={() => setShowArchive(true)}>📚 Archive{archive.length > 0 ? ` (${archive.length})` : ''}</button>
            <button type="button" className="ghost" onClick={() => setShowCard(true)}>✦ Trading card</button>
          </div>
        </div>

        {stage === 'loading' && <div className="center"><div><div className="loader" aria-hidden="true" /><p role="status">Writing your story…</p></div></div>}
        {stage === 'error' && (
          <div className="center"><div><p style={{ fontSize: 18, color: '#ffc4c4' }}>{error}</p><p>Check your connection and try again.</p>
            <button type="button" className="cta" onClick={fetchStory}>Try again</button></div></div>
        )}

        {stage === 'reveal' && story && (
          <div className="grid">
            <aside>
              <section className="glass hero" aria-label="Your character">
                <div className="av"><div className="aura" /><div dangerouslySetInnerHTML={{ __html: avatarSvg(avStage, mood.c, mood.c2) }} /></div>
                <h2>{name}</h2>
                <div className="cls">{STAGES[avStage][0]} · {xp.toLocaleString()} XP</div>
                <div className="evo">
                  <span>{next ? `${next[1] - xp} XP until you evolve into ${/^[AEIOU]/.test(next[0]) ? 'an' : 'a'} ${next[0]}` : 'Fully evolved'}</span>
                  <div className="bar"><i style={{ width: next ? `${((xp - STAGES[avStage][1]) / (next[1] - STAGES[avStage][1])) * 100}%` : '100%' }} /></div>
                  <div className="stages">{STAGES.map((s, i) => <span key={s[0]} className={i <= avStage ? 'on' : ''}>{s[0]}</span>)}</div>
                </div>
              </section>
              <section className="glass path" aria-labelledby="ls-mh">
                <h3 id="ls-mh">MILESTONE PATH</h3>
                {miles.map(([ic, t, d, done], i) => (
                  <div key={t} className={`mile ${done ? 'done' : i === nextMile ? 'next' : ''}`}>
                    <span className="dot" aria-hidden="true">{done ? '✓' : ic}</span><span><b>{t}</b><small>{done ? 'Unlocked' : d}</small></span>
                  </div>
                ))}
              </section>
            </aside>

            <main>
              <article className="glass chapter" aria-labelledby="ls-title">
                <div className="chd"><span className="pill">CHAPTER {chapterNo} · {weekLabel.toUpperCase()}</span><span className="mood">Mood: {mood.name}</span></div>
                <h1 id="ls-title"><span>{story.title || weekLabel}</span></h1>
                <Chapter key={`${story.weekId}-${story.regenerations || 0}-${content.length}`} content={content} keywords={story.keywords || []} onTip={onTip} />
                <div className="quest" aria-labelledby="ls-qh">
                  <h3 id="ls-qh">⚔ QUEST LOG</h3>
                  {quests.map(([t, have, need]) => {
                    const done = have >= need;
                    return <div key={t} className={`obj ${done ? 'done' : ''}`}><span className="ck" aria-hidden="true">{done ? '✓' : ''}</span><span>{t}</span><small>{done ? 'DONE' : `${have}/${need}`}</small></div>;
                  })}
                </div>
                <div className="acts">
                  <button type="button" className="cta" onClick={share}>Share story</button>
                  {isThisWeek && <button type="button" className="ghost" onClick={() => generateStory(true)} disabled={generating}>{generating ? 'Writing…' : '↻ Regenerate'}</button>}
                  {!isThisWeek && <button type="button" className="ghost" onClick={fetchStory}>Back to this week</button>}
                </div>
                {notice && <div className="err" role="status" style={{ borderColor: 'rgba(255,255,255,.2)', background: 'rgba(255,255,255,.05)', color: '#e3dcff' }}>{notice}</div>}
                {fmtDate(story.generatedAt) && <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)' }}>Written {fmtDate(story.generatedAt)}</p>}
              </article>
            </main>
          </div>
        )}
      </div>

      {tip && <div className="ls-tip" role="status" style={{ left: tip.x, top: tip.y, '--kc': KC[tip.k.kind] }}><b>{tip.k.text}</b>{tip.k.tip}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}

      {showArchive && (
        <div className="arch" onClick={(e) => { if (e.target === e.currentTarget) setShowArchive(false); }}>
          <div className="archbox" role="dialog" aria-modal="true" aria-labelledby="ls-ah">
            <div className="archhd">
              <div><h2 id="ls-ah">Story archive</h2><p>{archive.length} chapter{archive.length === 1 ? '' : 's'} in your journey</p></div>
              <button type="button" className="ghost" autoFocus onClick={() => setShowArchive(false)}>Close</button>
            </div>
            {archive.length === 0 ? <p style={{ color: 'var(--muted)' }}>No chapters yet. They are saved each week after they're written.</p> : (
              <div className="chs">
                {archive.map((c, i) => (
                  <button type="button" key={c.weekId || i} className="ch" aria-current={c.weekId === story?.weekId}
                    onClick={() => { setStory(c); setStage('reveal'); setNotice(''); setShowArchive(false); }}>
                    <b>Chapter {archive.length - i}{c.title ? `: ${c.title}` : ''}</b><small>{getWeekLabel(c.weekId)} · {fmtDate(c.generatedAt)}</small>
                    <span>{String(c.content || c.story || '').slice(0, 120)}…</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showCard && <TradingCard info={{ name, xp, stage: avStage, level, solved: solvedTotal, streak, weekLabel }} onClose={() => setShowCard(false)} />}
    </div>
  );
}

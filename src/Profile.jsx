import useStreak          from './hooks/useStreak';
import useAchievements    from './hooks/useAchievements';
import AchievementToast   from './components/AchievementToast';
import AchievementsGrid   from './components/AchievementsGrid';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate }                              from 'react-router-dom';
import axios                                        from 'axios';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db }                                       from './firebase';
import API_BASE                                     from './config';
import usePushNotifications                         from './usePushNotifications';
import './Profile.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const XP_PER_LEVEL = 500;
// Tier titles: colour, what each unlocks, and the gear previewed when you tap it.
const TIERS = [
  { name: 'Junior', color: '#39ff88', unlock: 'Starter gear: headset, glasses. Banners: Neon City, Grid Run.', acc: 'headset' },
  { name: 'Mid',    color: '#35c4e6', unlock: 'Cap and the Aurora banner.', acc: 'cap' },
  { name: 'Senior', color: '#a78bfa', unlock: 'A glowing halo for your avatar.', acc: 'halo' },
  { name: 'Lead',   color: '#f4b740', unlock: 'A flowing cape.', acc: 'cape' },
  { name: 'Legend', color: '#ff4fd8', unlock: 'The crown and the Gold Rush banner.', acc: 'crown' },
];
const BANNERS = [{ id: 'neon', name: 'Neon City', tier: 0 }, { id: 'grid', name: 'Grid Run', tier: 0 }, { id: 'aurora', name: 'Aurora', tier: 1 }, { id: 'gold', name: 'Gold Rush', tier: 4 }];
const ACCS = [{ id: 'none', name: 'None', tier: 0 }, { id: 'headset', name: 'Headset', tier: 0 }, { id: 'glasses', name: 'Glasses', tier: 0 }, { id: 'cap', name: 'Cap', tier: 1 }, { id: 'halo', name: 'Halo', tier: 2 }, { id: 'cape', name: 'Cape', tier: 3 }, { id: 'crown', name: 'Crown', tier: 4 }];
const HAIR = [['short', 'Short'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['pigtails', 'Pigtails'], ['bob', 'Bob'], ['curly', 'Curly'], ['spiky', 'Spiky'], ['bun', 'Bun'], ['none', 'None']];
const BUILDS = [['broad', 'Broad'], ['slim', 'Slim']];
const FACES = [['plain', 'Plain'], ['lashes', 'Lashes'], ['freckles', 'Freckles']];
const BOTTOMS = [['pants', 'Trousers'], ['shorts', 'Shorts'], ['skirt', 'Skirt']];
const SKINS = ['#fbe0cc', '#f0b894', '#d99a6c', '#b87750', '#8a5434', '#5e3a24'];
const BOTTOM_COLORS = ['#2f3b55', '#3b3b44', '#6b4a35', '#7a5ac8'];
const TOPS = [['tee', 'T-shirt'], ['hoodie', 'Hoodie'], ['jacket', 'Jacket']];
const TOP_COLORS = ['#35c4e6', '#d9644a', '#4e9f5d', '#f2b53a', '#7a5ac8', '#eceff5'];
const HAIR_COLORS = ['#2b1d14', '#5a3a22', '#c98b3a', '#e8d27a', '#b5462e'];
const DEFAULT_LOOK = { banner: 'neon', hair: 'short', hairColor: '#2b1d14', top: 'hoodie', topColor: '#35c4e6', acc: 'headset', skin: '#f0b894', build: 'broad', face: 'plain', bottom: 'pants', bottomColor: '#2f3b55' };
// Same ELO bands as the Arena record
const ELO_TIERS = [['Bronze', 0], ['Gold', 1000], ['Diamond', 1200], ['Master', 1500], ['Grandmaster', 1800]];
const STREAK_GOALS = [[3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month']];
const ACTIVITY_LABELS = {
  challenge_solved: 'SOLVED', challenge_attempted: 'ATTEMPT', challenge_published: 'PUBLISHED', arena_win: 'ARENA WIN',
  arena_loss: 'ARENA', level_up: 'LEVEL UP', daily_completed: 'DAILY', story_generated: 'STORY',
};
const TAU = Math.PI * 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toDate(ts) {
  if (!ts) return null;
  let d;
  if (typeof ts?.toDate === 'function') d = ts.toDate();
  else if (ts?._seconds !== undefined) d = new Date(ts._seconds * 1000);
  else if (ts?.seconds !== undefined) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}
function formatDate(ts) { const d = toDate(ts); return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''; }
function getWeekLabel(weekId) {
  if (!weekId) return 'Unknown Week';
  const m = weekId.match(/(\d{4})-W(\d{2})/);
  return m ? `Week ${parseInt(m[2], 10)}, ${m[1]}` : weekId;
}
function xpProgress(xp) {
  const level = Math.min(5, Math.floor(xp / XP_PER_LEVEL) + 1);
  const base = (level - 1) * XP_PER_LEVEL;
  const progress = level < 5 ? ((xp - base) / XP_PER_LEVEL) * 100 : 100;
  return { level, progress: Math.min(100, Math.max(0, progress)) };
}
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Small pieces ─────────────────────────────────────────────────────────────
function CountUp({ value }) {
  const [n, setN] = useState(reduceMotion() ? value : 0);
  useEffect(() => {
    if (reduceMotion() || !value) { setN(value); return undefined; }
    let raf; const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 900); setN(Math.round(value * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n.toLocaleString()}</>;
}

function Card({ className = '', title, children }) {
  const ref = useRef(null);
  const tilt = !reduceMotion() && typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches;
  const onMove = (e) => {
    if (!tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(1200px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateZ(6px)`;
  };
  return (
    <section ref={ref} className={`pf-card ${className}`} onPointerMove={onMove} onPointerLeave={() => { if (ref.current) ref.current.style.transform = ''; }}>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

const ICONS = {
  overview: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect className="b b1" x="4" y="12" width="4" height="8" /><rect className="b b2" x="10" y="5" width="4" height="15" /><rect className="b b3" x="16" y="9" width="4" height="11" /></svg>,
  role: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><g className="mask"><path d="M5 5h14v7a7 7 0 0 1-14 0z" /><circle cx="9.5" cy="10" r="1" fill="currentColor" /><circle cx="14.5" cy="10" r="1" fill="currentColor" /><path d="M9 15c1.5 1.4 4.5 1.4 6 0" /></g></svg>,
  arena: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true"><g className="s1"><path d="M4 4l13 13M14 17l3-3M3 21l3-3" /></g><g className="s2"><path d="M20 4L7 17M10 17l-3-3M21 21l-3-3" /></g></svg>,
  achievements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><g className="medal"><circle cx="12" cy="9" r="5" /><path d="M9 13.5L7 22l5-3 5 3-2-8.5" /><path d="M12 6.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none" /></g></svg>,
  stories: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 5h7v14H4z" /><path className="page2" d="M13 5h7v14h-7z" /></svg>,
  activity: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true"><path className="beat" pathLength="100" d="M2 12h5l2-6 4 12 2-6h7" /></svg>,
  notifications: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><g className="bell"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></g></svg>,
};
const TABS = [
  { id: 'overview', label: 'Overview' }, { id: 'role', label: 'Life Role' }, { id: 'arena', label: 'Arena' }, { id: 'achievements', label: 'Badges' },
  { id: 'stories', label: 'Stories' }, { id: 'activity', label: 'Activity' }, { id: 'notifications', label: 'Alerts' },
];

const Flame = () => (
  <svg className="pf-flame" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="pf-fg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff5b2b" /><stop offset=".6" stopColor="#f4b740" /><stop offset="1" stopColor="#fff3a0" /></linearGradient></defs>
    <path d="M12 2c1.2 4.2-3.6 5.6-3.6 10a4.6 4.6 0 0 0 9.2 0c0-2.3-1.1-3.6-2.3-4.8.1 2.2-.9 3.4-2 3.8 1.2-3.5.4-6.8-1.3-9z" fill="url(#pf-fg)" />
    <path d="M12 22a3 3 0 0 0 3-3c0-1.6-1.4-2.5-1.8-3.8-1.5.8-1.2 2.2-2.2 2.8-.6-.5-.9-1.2-.8-2A3.6 3.6 0 0 0 9 19a3 3 0 0 0 3 3z" fill="#fff6c8" opacity=".9" />
  </svg>
);
const Check = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" /></svg>;

// ─── Milestone bar ────────────────────────────────────────────────────────────
function MilestoneBar({ streak, bestStreak, claimedToday }) {
  const s = streak || 0, now = new Date(), letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = new Date(now); d.setDate(now.getDate() - k);
    // If today isn't claimed yet, the streak ends yesterday and today is pending.
    const done = claimedToday ? k < s : k >= 1 && k <= s;
    days.push({ d, k, done, today: k === 0 });
  }
  const nextI = STREAK_GOALS.findIndex((g) => g[0] > s), next = STREAK_GOALS[nextI];
  let f = 0;
  for (let i = 0; i < STREAK_GOALS.length - 1; i++) {
    if (s >= STREAK_GOALS[i + 1][0]) f = i + 1;
    else if (s >= STREAK_GOALS[i][0]) { f = i + (s - STREAK_GOALS[i][0]) / (STREAK_GOALS[i + 1][0] - STREAK_GOALS[i][0]); break; }
  }
  const [fill, setFill] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setFill(f / 3 * 75)); return () => cancelAnimationFrame(id); }, [f]);
  const msg = claimedToday
    ? <>Today is locked in. Come back tomorrow for <b>day {s + 1}</b>.</>
    : s > 0 ? <>Keep it going! Play today to make it <b>{s + 1} days</b>.</> : <>Solve one problem today to <b>start your streak</b>.</>;
  return (
    <section className="pf-mile" aria-label="Streak and milestones">
      <div className="pf-cal" role="img" aria-label={`Last seven days, ${s} day streak`}>
        {days.map(({ d, k, done, today }) => (
          <div key={k} className={`pf-day${done ? ' done' : ''}${today ? (claimedToday ? ' today' : ' pending') : ''}`}>
            {letters[d.getDay()]}<b>{d.getDate()}</b>{today ? <Flame /> : done ? <Check /> : <span>&nbsp;</span>}
          </div>
        ))}
      </div>
      <div className="pf-msg">
        <h2>{s > 0 ? `${s} day streak` : 'No streak yet'}</h2>
        <p>{msg}{next ? <> {next[0] - s} more to reach <b>{next[1]}</b>.</> : null} Best: {bestStreak || s} days.</p>
      </div>
      <div className="pf-track">
        <div className="fill" style={{ width: `${fill}%` }} />
        {STREAK_GOALS.map((g, i) => (
          <div key={g[0]} className={`pf-node${s >= g[0] ? ' got' : i === nextI ? ' next' : ''}`}>
            <i>{s >= g[0] ? '✓' : g[0]}</i><div><b>Day {g[0]}</b><span>{g[1]}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Skill graph (solved problems grouped by topic) ───────────────────────────
function SkillGraph({ solvedProblems }) {
  const skills = useMemo(() => {
    const counts = {};
    Object.values(solvedProblems || {}).forEach((p) => {
      const topic = p && (p.topic || p.category || p.tag);
      if (topic) counts[topic] = (counts[topic] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [solvedProblems]);
  const [read, setRead] = useState('Hover or focus a point');
  if (skills.length < 3) {
    return <div className="pf-empty">Your skill graph appears once you have solved problems in at least 3 topics.<br />Every solve adds to it.</div>;
  }
  const max = Math.max(...skills.map((s) => s[1])), cx = 140, cy = 124, R = 84, n = skills.length;
  const pt = (i, r) => { const a = -Math.PI / 2 + TAU * i / n; return [+(cx + Math.cos(a) * r).toFixed(1), +(cy + Math.sin(a) * r).toFixed(1)]; };
  return (
    <>
      <svg className="pf-radar" viewBox="0 0 280 250" role="group" aria-label="Skill graph">
        {[1, 2, 3, 4, 5].map((ring) => <polygon key={ring} className="grid" points={skills.map((_, i) => pt(i, R * ring / 5).join(',')).join(' ')} />)}
        {skills.map((s, i) => { const [x, y] = pt(i, R), [lx, ly] = pt(i, R + 22); return (
          <g key={s[0]}><line className="axis" x1={cx} y1={cy} x2={x} y2={y} /><text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{s[0].length > 12 ? s[0].slice(0, 11) + '…' : s[0]}</text></g>
        ); })}
        <polygon className="area" points={skills.map((s, i) => pt(i, R * s[1] / max).join(',')).join(' ')} />
        {skills.map((s, i) => { const [x, y] = pt(i, R * s[1] / max); const label = `${s[0]}: ${s[1]} solved`; return (
          <circle key={s[0]} className="pt" tabIndex={0} r="6" cx={x} cy={y} aria-label={label} onPointerOver={() => setRead(label)} onFocus={() => setRead(label)} />
        ); })}
      </svg>
      <div className="pf-readout">{read}</div>
    </>
  );
}

// ─── Activity heatmap (streak days plus logged activity) ──────────────────────
function Heatmap({ activities, streak, claimedToday }) {
  const cells = useMemo(() => {
    const counts = {};
    activities.forEach((a) => { const d = toDate(a.createdAt); if (d) counts[dayKey(d)] = (counts[dayKey(d)] || 0) + 1; });
    const now = new Date(), out = [];
    for (let back = 26 * 7 - 1; back >= 0; back--) {
      const d = new Date(now); d.setDate(now.getDate() - back);
      const inStreak = claimedToday ? back < streak : back >= 1 && back <= streak;
      const c = (counts[dayKey(d)] || 0) + (inStreak ? 1 : 0);
      out.push({ key: back, lv: c >= 3 ? 3 : c, label: d.toDateString() });
    }
    return out;
  }, [activities, streak, claimedToday]);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth; }, []);
  return (
    <>
      <div className="pf-heat" ref={ref} role="img" aria-label="Activity over the last 26 weeks">
        {cells.map((c) => <i key={c.key} className={c.lv ? `l${c.lv}` : undefined} title={c.label} />)}
      </div>
      <div className="pf-legend">less <i style={{ background: 'rgba(255,255,255,.07)' }} /><i style={{ background: '#0e4a2c' }} /><i style={{ background: '#1f9d5c' }} /><i style={{ background: '#39ff88' }} /> more</div>
    </>
  );
}

// ─── Customize drawer ─────────────────────────────────────────────────────────
function CustomizeDrawer({ look, tierIdx, onChange, onLocked, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  const options = (list, k, objects) => (
    <div className="pf-opts">
      {list.map((it) => {
        const id = objects ? it.id : it[0], name = objects ? it.name : it[1], locked = objects && it.tier > tierIdx;
        return (
          <button key={id} className={`pf-opt${locked ? ' locked' : ''}`} aria-pressed={look[k] === id}
            onClick={() => (locked ? onLocked(it) : onChange(k, id))}>
            {name}{locked && <small>🔒 {TIERS[it.tier].name}</small>}
          </button>
        );
      })}
    </div>
  );
  const swatches = (list, k, label) => (
    <div className="pf-sw">{list.map((c) => <button key={c} style={{ background: c }} aria-label={`${label} ${c}`} aria-pressed={look[k] === c} onClick={() => onChange(k, c)} />)}</div>
  );
  return (
    <>
      <div className="pf-scrim" onClick={onClose} />
      <aside className="pf-drawer" role="dialog" aria-modal="true" aria-labelledby="pf-dtitle">
        <header><h2 id="pf-dtitle">customize.profile</h2><button className="pf-tbtn" ref={closeRef} onClick={onClose}>Close</button></header>
        <h4>Skin tone</h4>{swatches(SKINS, 'skin', 'Skin tone')}
        <h4>Build</h4>{options(BUILDS, 'build')}
        <h4>Face</h4>{options(FACES, 'face')}
        <h4>Banner</h4>{options(BANNERS, 'banner', true)}
        <h4>Gear</h4>{options(ACCS, 'acc', true)}
        <h4>Hair</h4>{options(HAIR, 'hair')}
        <h4>Hair color</h4>{swatches(HAIR_COLORS, 'hairColor', 'Hair')}
        <h4>Top</h4>{options(TOPS, 'top')}
        <h4>Top color</h4>{swatches(TOP_COLORS, 'topColor', 'Top')}
        <h4>Bottoms</h4>{options(BOTTOMS, 'bottom')}
        <h4>Bottoms color</h4>{swatches(BOTTOM_COLORS, 'bottomColor', 'Bottoms')}
        <p className="pf-note">Every style is open to everyone: mix any pieces you like. Locked items unlock as you climb the tier titles. Tap a tier on your banner to preview its gear.</p>
      </aside>
    </>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────
function LifeRolePanel({ userData, onFindRole }) {
  const role = userData?.lifeRole, skipped = userData?.onboardingSkipped || role?.source === 'skipped';
  if (!role || skipped) {
    return (
      <Card className="pf-full" title="life role">
        <div className="pf-rolename">{role?.primary || 'Explorer'}</div>
        <div className="pf-sub" style={{ maxWidth: 560 }}>You are still finding your style. Answer 5 honest questions and the AI assigns your Life Role, which shapes your journey.</div>
        <button className="pf-cta" onClick={onFindRole}>Reveal my Life Role: +200 XP, 50 credits</button>
      </Card>
    );
  }
  return (
    <Card className="pf-full" title="life role">
      <div className="pf-rolename">{role.primary}</div>
      {role.description && <div className="pf-sub" style={{ maxWidth: 640 }}>{role.description}</div>}
      {role.traits?.length > 0 && <><h3 style={{ marginTop: 18 }}>traits</h3><div className="pf-chips">{role.traits.map((t, i) => <span key={i}>{t}</span>)}</div></>}
      {role.strengths?.length > 0 && <><h3 style={{ marginTop: 18 }}>strengths</h3><ul className="pf-list">{role.strengths.map((s, i) => <li key={i}><b>▸</b>{s}</li>)}</ul></>}
      {role.assignedAt && <div className="pf-sub" style={{ textAlign: 'right' }}>Assigned {formatDate(role.assignedAt)}</div>}
    </Card>
  );
}

function ArenaPanel({ userData }) {
  const wins = userData?.arenaWins ?? 0, losses = userData?.arenaLosses ?? 0, total = wins + losses, winPct = total > 0 ? Math.round((wins / total) * 100) : 0;
  const elo = userData?.elo ?? 1000, ti = ELO_TIERS.reduce((a, t, i) => (elo >= t[1] ? i : a), 0);
  return (
    <div className="pf-bento">
      <Card className="c-third" title="elo"><div className="pf-big"><CountUp value={elo} /></div><div className="pf-sub">{ELO_TIERS[ti][0]}</div></Card>
      <Card className="c-third" title="battles"><div className="pf-big"><CountUp value={total} /></div><div className="pf-sub">{winPct}% win rate</div></Card>
      <Card className="c-third" title="record">
        <div className="pf-wl"><i style={{ width: `${total ? winPct : 0}%`, background: '#39ff88' }} /><i style={{ width: `${total ? 100 - winPct : 0}%`, background: '#ff5b5b' }} /></div>
        <div className="pf-wllab"><span style={{ color: '#39ff88' }}>{wins} wins</span><span style={{ color: '#ff5b5b' }}>{losses} losses</span></div>
      </Card>
      <Card className="pf-full" title="elo ladder">
        <div className="pf-ladder">{ELO_TIERS.map((t, i) => <i key={t[0]} className={`${i <= ti ? 'on ' : ''}${i === ti ? 'here' : ''}`} />)}</div>
        <div className="pf-ladlab">{ELO_TIERS.map((t) => <span key={t[0]}>{t[0]}</span>)}</div>
      </Card>
    </div>
  );
}

function NotificationsPanel({ user }) {
  const { isSubscribed, loading, subscribe, unsubscribe, permission } = usePushNotifications(user);
  return (
    <Card className="pf-full" title="daily challenge reminders">
      <div className="pf-sub" style={{ marginBottom: 6 }}>Get notified every day when your challenge resets.</div>
      {permission === 'denied'
        ? <div className="pf-sub" style={{ color: '#ff8a8a' }}>Notifications are blocked. Enable them in your browser settings.</div>
        : <button className="pf-cta" onClick={isSubscribed ? unsubscribe : subscribe} disabled={loading}>
            {loading ? 'Processing…' : isSubscribed ? 'Turn off reminders' : 'Turn on reminders'}
          </button>}
    </Card>
  );
}

function ChapterModal({ chapter, onClose }) {
  const text = chapter?.content || chapter?.story || '';
  const closeRef = useRef(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="pf-modal" onClick={onClose}>
      <div className="pf-dialog" role="dialog" aria-modal="true" aria-labelledby="pf-ch-title" onClick={(e) => e.stopPropagation()}>
        <header><div><strong id="pf-ch-title">{getWeekLabel(chapter?.weekId)}</strong><span>{formatDate(chapter?.generatedAt)}</span></div>
          <button className="pf-tbtn" ref={closeRef} onClick={onClose}>Close</button></header>
        <div className="body">{text}</div>
        <footer><button className="pf-tbtn" onClick={() => { navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {}); }}>{copied ? 'Copied' : 'Copy to clipboard'}</button></footer>
      </div>
    </div>
  );
}

// ─── Main Profile ─────────────────────────────────────────────────────────────
export default function Profile({ user, userData }) {
  const navigate = useNavigate();
  const { streak, bestStreak, claimedToday } = useStreak(user);
  const { unlocked, newBadges, clearNewBadges } = useAchievements(user, userData);
  const [archive, setArchive] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [previewTier, setPreviewTier] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState('');
  const uid = user?.uid;

  // ── Level and tier ──
  const xp = userData?.xp ?? 0;
  const xpInfo = xpProgress(xp);
  const level = userData?.level ?? xpInfo.level;
  const tierIdx = Math.min(Math.max(level, 1), 5) - 1;
  const tierNow = TIERS[tierIdx], nextName = LEVEL_NAMES[level + 1];
  const toNext = XP_PER_LEVEL - (xp % XP_PER_LEVEL);
  const shownTier = previewTier == null ? tierNow : TIERS[previewTier];

  // ── Avatar look: saved on the user doc if present, else per-device ──
  const lookKey = `evoprofile:${uid || 'anon'}`;
  const [look, setLook] = useState(() => {
    let saved = userData?.avatarLook || null;
    if (!saved) { try { saved = JSON.parse(localStorage.getItem(lookKey) || 'null'); } catch (e) { saved = null; } }
    const out = { ...DEFAULT_LOOK };
    if (saved) {
      const ok = (list, v) => { const it = list.find((x) => x.id === v); return it && it.tier <= tierIdx; };
      if (ok(BANNERS, saved.banner)) out.banner = saved.banner;
      if (ok(ACCS, saved.acc)) out.acc = saved.acc;
      if (HAIR.some((h) => h[0] === saved.hair)) out.hair = saved.hair;
      if (TOPS.some((t) => t[0] === saved.top)) out.top = saved.top;
      if (TOP_COLORS.includes(saved.topColor)) out.topColor = saved.topColor;
      if (HAIR_COLORS.includes(saved.hairColor)) out.hairColor = saved.hairColor;
      if (SKINS.includes(saved.skin)) out.skin = saved.skin;
      if (BUILDS.some((b) => b[0] === saved.build)) out.build = saved.build;
      if (FACES.some((f) => f[0] === saved.face)) out.face = saved.face;
      if (BOTTOMS.some((b) => b[0] === saved.bottom)) out.bottom = saved.bottom;
      if (BOTTOM_COLORS.includes(saved.bottomColor)) out.bottomColor = saved.bottomColor;
    }
    return out;
  });
  const changeLook = useCallback((k, v) => {
    setLook((prev) => { const next = { ...prev, [k]: v }; try { localStorage.setItem(lookKey, JSON.stringify(next)); } catch (e) { /* ignore */ } return next; });
  }, [lookKey]);
  const shownAcc = previewTier != null && TIERS[previewTier].acc ? TIERS[previewTier].acc : look.acc;

  const showToast = useCallback((m) => { setToast(m); }, []);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const closeChapter = useCallback(() => setSelectedChapter(null), []);
  const onLockedItem = useCallback((it) => showToast(`Reach ${TIERS[it.tier].name} to unlock ${it.name}`), [showToast]);
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 2200); return () => clearTimeout(id); }, [toast]);

  // ── Data ──
  const fetchArchive = useCallback(async () => {
    if (!uid) return;
    try { const res = await axios.get(`${API_BASE}/story/${uid}/archive`); setArchive(res.data?.archive || []); }
    catch (err) { console.error('[Profile] fetchArchive:', err); }
  }, [uid]);
  const fetchActivities = useCallback(async () => {
    if (!uid) return;
    try {
      const q = query(collection(db, 'activityFeed'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(20));
      const snap = await getDocs(q);
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error('[Profile] fetchActivities:', err); }
  }, [uid]);
  useEffect(() => {
    if (!uid) return;
    Promise.all([fetchArchive(), fetchActivities()]).finally(() => setPageLoading(false));
  }, [uid, fetchArchive, fetchActivities]);

  // ── 3D banner (loaded after first paint) ──
  const stageRef = useRef(null), sceneRef = useRef(null);
  const latest = useRef({ look, shownAcc, color: shownTier.color });
  latest.current = { look, shownAcc, color: shownTier.color };
  useEffect(() => {
    let dead = false;
    import('./ProfileScene')
      .then((m) => {
        if (dead || !stageRef.current) return;
        const L = latest.current;
        sceneRef.current = m.default(stageRef.current, { look: L.look, acc: L.shownAcc, accent: L.color, banner: L.look.banner });
      })
      .catch((e) => console.warn('3D banner unavailable:', e));
    return () => { dead = true; if (sceneRef.current) sceneRef.current.destroy(); sceneRef.current = null; };
  }, []);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setAvatar(look, shownAcc); }, [look, shownAcc]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setBanner(look.banner); }, [look.banner]);
  useEffect(() => { if (sceneRef.current) sceneRef.current.setAccent(shownTier.color); }, [shownTier.color]);

  // ── Tabs keyboard ──
  const tabRefs = useRef({});
  const onTabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === activeTab); let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % TABS.length; else if (e.key === 'ArrowLeft') n = (i + TABS.length - 1) % TABS.length;
    else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = TABS.length - 1; else return;
    e.preventDefault(); setActiveTab(TABS[n].id); const el = tabRefs.current[TABS[n].id]; if (el) el.focus();
  };

  const [xpBar, setXpBar] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setXpBar(xpInfo.progress)); return () => cancelAnimationFrame(id); }, [xpInfo.progress]);
  const ringC = 2 * Math.PI * 50;
  const elo = userData?.elo ?? 1000, eloIdx = ELO_TIERS.reduce((a, t, i) => (elo >= t[1] ? i : a), 0), eloNext = ELO_TIERS[eloIdx + 1];
  const unlockedCount = Array.isArray(unlocked) ? unlocked.length : Object.keys(unlocked || {}).length;
  const role = userData?.lifeRole, skipped = userData?.onboardingSkipped || role?.source === 'skipped';
  const name = user?.displayName || 'DSA Coder';
  const handle = (name.split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const joinDate = formatDate(userData?.createdAt);
  const findRole = () => navigate('/onboarding');

  const tierDetail = previewTier == null
    ? <><b>{tierNow.name}</b> is your tier. Tap another title to preview its gear on your avatar.</>
    : <><b>{shownTier.name}</b> · reach level {previewTier + 1}{previewTier === tierIdx + 1 ? ` (${toNext} XP to go)` : ''}. Unlocks: {shownTier.unlock} Previewing now.</>;

  return (
    <div className="pf" style={{ '--tier': shownTier.color }}>
      <div className="pf-crt" aria-hidden="true" />
      <div className="pf-page">
        <div className="pf-top">
          <button className="pf-back" onClick={() => navigate('/world')}>&larr; World</button>
          <div className="pf-path"><b>{handle}</b>@<i>evoworld</i>:~/profile$</div>
        </div>

        {/* ── 3D banner ── */}
        <section className="pf-hero" aria-label="Your profile banner">
          <div className="pf-stage" ref={stageRef} aria-hidden="true" />
          <div className="pf-shade" />
          <div className="pf-who">
            <h1>{name}</h1>
            <p>{user?.email}{joinDate ? ` · joined ${joinDate}` : ''}</p>
            <div className="pf-chip">{tierNow.name.toUpperCase()} · LEVEL {level}</div>
            <div className="pf-xpmini">
              <div><span>{xp.toLocaleString()} XP</span><span>{level < 5 && nextName ? `${toNext} XP to ${nextName}` : 'Max level'}</span></div>
              <div className="pf-bar"><i style={{ width: `${xpBar}%` }} /></div>
            </div>
          </div>
          <div className="pf-tools">
            <button className="pf-tbtn" onClick={() => setDrawer(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>Customize
            </button>
          </div>
          <div className="pf-hint">drag to rotate · click to wave</div>
          <div className="pf-tiers">
            <p className="pf-tierdetail" style={{ '--tc': shownTier.color }}>{tierDetail}</p>
            <div className="pf-tierrow" role="group" aria-label="Tier titles">
              {TIERS.map((t, i) => (
                <button key={t.name} className={`pf-tier${i === tierIdx ? ' current' : ''}`} style={{ '--tc': t.color }} aria-pressed={previewTier === i}
                  onClick={() => setPreviewTier(previewTier === i || i === tierIdx ? null : i)}>
                  {t.name}<small>{i === tierIdx ? 'CURRENT' : i < tierIdx ? 'EARNED' : `LEVEL ${i + 1}`}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tabs ── */}
        <div className="pf-tabs" role="tablist" aria-label="Profile sections" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} id={`pf-tab-${t.id}`} role="tab" className="pf-tab"
              aria-selected={activeTab === t.id} tabIndex={activeTab === t.id ? 0 : -1} onClick={() => setActiveTab(t.id)}>
              {ICONS[t.id]}{t.label}
            </button>
          ))}
        </div>

        <MilestoneBar streak={streak} bestStreak={bestStreak} claimedToday={claimedToday} />

        {/* ── Panels ── */}
        <main className="pf-panel" role="tabpanel" aria-labelledby={`pf-tab-${activeTab}`} tabIndex={0}>
          {activeTab === 'overview' && (
            <div className="pf-bento">
              <Card className="c-level" title="level progress">
                <div className="pf-ringwrap"><div className="pf-ring">
                  <svg viewBox="0 0 120 120"><circle className="tr" cx="60" cy="60" r="50" /><circle className="pg" cx="60" cy="60" r="50" style={{ strokeDasharray: `${ringC * xpBar / 100} ${ringC}` }} /></svg>
                  <div className="mid"><b>{Math.round(xpInfo.progress)}%</b><span>{level < 5 ? `${XP_PER_LEVEL - toNext} / ${XP_PER_LEVEL} XP` : 'max level'}</span></div>
                </div></div>
                <p className="pf-lvltext"><b>{tierNow.name}</b> · level {level}{level < 5 && nextName ? <><br />{toNext} XP to reach <b>{nextName}</b></> : null}</p>
                {tierIdx < 4 && <div className="pf-perks"><b>Next unlock:</b> {TIERS[tierIdx + 1].unlock}</div>}
              </Card>
              <Card className="c-skills" title="skill graph"><SkillGraph solvedProblems={userData?.solvedProblems} /></Card>
              <Card className="c-elo" title="arena elo">
                <div className="pf-big"><CountUp value={elo} /></div>
                <div className="pf-sub">{ELO_TIERS[eloIdx][0]}{eloNext ? ` · ${eloNext[1] - elo} to ${eloNext[0]}` : ' · top tier'}</div>
                <div className="pf-ladder">{ELO_TIERS.map((t, i) => <i key={t[0]} className={`${i <= eloIdx ? 'on ' : ''}${i === eloIdx ? 'here' : ''}`} />)}</div>
                <div className="pf-ladlab"><span>{ELO_TIERS[0][0]}</span><span>{ELO_TIERS[4][0]}</span></div>
              </Card>
              <Card className="c-role" title="life role">
                <div className="pf-rolename">{role?.primary || 'Explorer'}</div>
                {(!role || skipped)
                  ? <><div className="pf-sub">Find your real Life Role and earn a bonus.</div><button className="pf-cta" onClick={findRole}>Find my Life Role: +200 XP, 50 credits</button></>
                  : <div className="pf-sub">{role.description}</div>}
              </Card>
              <Card className="c-heat" title="activity, last 26 weeks"><Heatmap activities={activities} streak={streak || 0} claimedToday={claimedToday} /></Card>
              <Card className="c-badge" title="badges">
                <div className="pf-big"><CountUp value={unlockedCount} /></div><div className="pf-sub">badges unlocked</div>
                <button className="pf-cta" onClick={() => setActiveTab('achievements')}>See all badges</button>
              </Card>
              <Card className="c-tile" title="total xp"><div className="pf-big"><CountUp value={xp} /></div></Card>
              <Card className="c-tile" title="credits"><div className="pf-big"><CountUp value={userData?.credits ?? 0} /></div></Card>
              <Card className="c-tile" title="weekly xp"><div className="pf-big"><CountUp value={userData?.weeklyXp ?? 0} /></div></Card>
              <Card className="c-tile" title="challenges created">
                <div className="pf-big"><CountUp value={userData?.challengesCreated ?? 0} /></div>
                <div className="pf-sub">avg rating {userData?.avgChallengeRating ? `${userData.avgChallengeRating.toFixed(1)} / 5` : '—'}</div>
              </Card>
            </div>
          )}
          {activeTab === 'role' && <LifeRolePanel userData={userData} onFindRole={findRole} />}
          {activeTab === 'arena' && <ArenaPanel userData={userData} />}
          {activeTab === 'achievements' && <Card className="pf-full" title="badges"><AchievementsGrid unlocked={unlocked} /></Card>}
          {activeTab === 'stories' && (
            <Card className="pf-full" title="life stories">
              {pageLoading ? <div className="pf-empty">loading stories…</div>
                : archive.length === 0 ? <div className="pf-empty">No stories yet.<br />Stories are generated weekly from your activity.</div>
                : archive.map((ch, i) => (
                  <button key={ch.weekId || i} className="pf-story" onClick={() => setSelectedChapter(ch)}>
                    <b>{i + 1}</b>
                    <div><strong>{getWeekLabel(ch.weekId)}</strong><p>{(ch?.content || ch?.story || '').slice(0, 140)}…</p></div>
                    <time>{formatDate(ch.generatedAt)}</time>
                  </button>
                ))}
            </Card>
          )}
          {activeTab === 'activity' && (
            <Card className="pf-full" title="recent activity">
              {pageLoading ? <div className="pf-empty">loading activity…</div>
                : activities.length === 0 ? <div className="pf-empty">No recent activity.</div>
                : <ul className="pf-list">{activities.map((a, i) => (
                    <li key={a.id || i}><b>{ACTIVITY_LABELS[a.type] || 'EVENT'}</b>{a.message}{a.createdAt && <time>{formatDate(a.createdAt)}</time>}</li>
                  ))}</ul>}
            </Card>
          )}
          {activeTab === 'notifications' && <NotificationsPanel user={user} />}
        </main>
      </div>

      {drawer && (
        <CustomizeDrawer look={look} tierIdx={tierIdx} onClose={closeDrawer} onChange={changeLook} onLocked={onLockedItem} />
      )}
      {selectedChapter && <ChapterModal chapter={selectedChapter} onClose={closeChapter} />}
      {toast && <div className="pf-toast" role="status">{toast}</div>}
      <AchievementToast newBadges={newBadges} onDismiss={clearNewBadges} />
    </div>
  );
}

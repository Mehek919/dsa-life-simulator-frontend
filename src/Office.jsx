import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import DailyChallenge from './DailyChallenges';
import IndustryFeed from './IndustryFeed';
import './Office.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const LEVEL_COLORS = { 1: '#22d3ee', 2: '#a855f7', 3: '#f59e0b', 4: '#ef4444', 5: '#00ff88' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const toDate = (ts) => (!ts ? null : ts._seconds != null ? new Date(ts._seconds * 1000) : ts.seconds != null ? new Date(ts.seconds * 1000) : new Date(ts));
function timeAgo(ts) {
  const d = toDate(ts); if (!d || isNaN(d)) return '';
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const isToday = (ts) => { const d = toDate(ts); const n = new Date(); return !!d && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate(); };

// Icon + color per event type (a book for story, a sword for battle, …)
const EVENT_ICONS = {
  challenge_completed: ['✅', '#39ff88'], challenge_solved: ['✅', '#39ff88'], challenge_attempted: ['🎯', '#35e0ff'],
  arena_win: ['⚔️', '#ff6b6b'], arena_loss: ['🛡️', '#9aa9b4'], arena_draw: ['⚔️', '#f4b740'], level_up: ['🎉', '#f4b740'],
  challenge_created: ['🧪', '#b18cff'], challenge_published: ['🧪', '#b18cff'], credits_earned: ['💰', '#f4b740'], xp_earned: ['✨', '#b18cff'],
};
function eventStyle(act) {
  if (EVENT_ICONS[act.type]) return EVENT_ICONS[act.type];
  const s = `${act.type || ''} ${act.message || act.description || ''}`.toLowerCase();
  if (s.includes('story') || s.includes('chapter')) return ['📖', '#ff6bd6'];
  if (s.includes('contest')) return ['🏆', '#f4b740'];
  if (s.includes('interview')) return ['🎙️', '#35e0ff'];
  if (s.includes('certif')) return ['📜', '#39ff88'];
  if (s.includes('arena') || s.includes('battle')) return ['⚔️', '#ff6b6b'];
  if (s.includes('streak')) return ['🔥', '#ff9f43'];
  return ['📌', '#9aa9b4'];
}

// ── Quest board ────────────────────────────────────────────────────────────────
const RING_C = 2 * Math.PI * 24;
function Quest({ q }) {
  const pct = Math.min(1, q.progress / q.goal);
  return (
    <button className={`quest${q.done ? ' done' : ''}`} style={{ '--qc': q.color }} onClick={q.onClick}
      aria-label={`${q.label}: ${q.done ? 'complete' : `${q.progress} of ${q.goal}`}. ${q.desc}`}>
      <span className="qring" aria-hidden="true">
        <svg viewBox="0 0 60 60"><circle className="bg" cx="30" cy="30" r="24" /><circle className="pg" cx="30" cy="30" r="24" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - pct)} /></svg>
        <span className="ic">{q.done ? '✓' : q.icon}</span>
      </span>
      <span><b>{q.label}</b><small>{q.desc}</small>
        <span className="qstat">{q.done ? '★ REWARD BANKED' : q.goal > 1 ? `${q.progress}/${q.goal}` : q.cta}</span></span>
    </button>
  );
}

// ── Weekly XP chart with tooltips ──────────────────────────────────────────────
function WeeklyChart({ dailyXp, weeklyXp }) {
  const todayIdx = (new Date().getDay() + 6) % 7;
  const vals = DAYS.map((d) => Number(dailyXp?.[d]) || 0);
  const max = Math.max(10, ...vals);
  const W = 700, H = 150, top = 14, bottom = 26, x = (i) => 30 + i * ((W - 60) / 6), y = (v) => top + (1 - v / max) * (H - top - bottom);
  const past = vals.slice(0, todayIdx + 1);
  const line = past.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  const area = past.length > 1 ? `${line} L${x(past.length - 1)} ${H - bottom} L${x(0)} ${H - bottom} Z` : '';
  const [tip, setTip] = useState(null);
  const best = Math.max(...vals);
  return (
    <section className="panel" style={{ '--pc': '#b18cff' }} aria-labelledby="of-wk">
      <div className="phd"><h2 id="of-wk">WEEKLY XP</h2><span><b style={{ color: '#b18cff' }}>{weeklyXp} XP</b> this week{best > 0 ? ` · best ${best}` : ''}</span></div>
      <div className="chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="of-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b18cff" stopOpacity=".45" /><stop offset="1" stopColor="#b18cff" stopOpacity="0" /></linearGradient></defs>
          {[0, 0.5, 1].map((f) => <line key={f} className="gl" x1="20" x2={W - 20} y1={top + f * (H - top - bottom)} y2={top + f * (H - top - bottom)} />)}
          {area && <path className="area" d={area} />}
          {line && <path className="line" d={line} />}
          {past.map((v, i) => <circle key={i} className={`pt${i === todayIdx ? ' today' : ''}${tip === i ? ' on' : ''}`} cx={x(i)} cy={y(v)} r="5" />)}
          {DAYS.map((d, i) => <text key={d} className={`lab${i === todayIdx ? ' today' : ''}`} x={x(i)} y={H - 6}>{i === todayIdx ? 'Today' : d}</text>)}
        </svg>
        <div className="hits" role="group" aria-label="XP per day this week" onPointerLeave={() => setTip(null)}>
          {DAYS.map((d, i) => (
            <button key={d} disabled={i > todayIdx} aria-label={i > todayIdx ? `${d}: not yet` : `${d}: ${vals[i]} XP`}
              onPointerEnter={() => i <= todayIdx && setTip(i)} onFocus={() => setTip(i)} onBlur={() => setTip(null)} />
          ))}
        </div>
        {tip != null && <div className="ctip" style={{ left: `calc(14px + (100% - 28px) * ${(x(tip) / W).toFixed(4)})`, top: `${(y(vals[tip]) / H) * 170}px` }} role="status">
          <b>{tip === todayIdx ? 'Today' : DAYS[tip]}</b> · +{vals[tip]} XP</div>}
      </div>
    </section>
  );
}

// ── Live system ticker ─────────────────────────────────────────────────────────
function SystemTicker({ activities, loading }) {
  const seen = useRef(null), [fresh, setFresh] = useState(new Set());
  useEffect(() => {
    const ids = activities.map((a) => a.id);
    if (seen.current && seen.current.size) { const n = ids.filter((id) => !seen.current.has(id)); if (n.length) { setFresh(new Set(n)); setTimeout(() => setFresh(new Set()), 2200); } }
    seen.current = new Set(ids);
  }, [activities]);
  return (
    <section className="panel" style={{ '--pc': '#35e0ff' }} aria-labelledby="of-log">
      <div className="phd"><h2 id="of-log"><i className="dot" />LIVE SYSTEM LOG</h2><span>updates every minute</span></div>
      <div className="log" aria-live="polite">
        {loading && !activities.length ? [0, 1, 2].map((i) => <div key={i} className="skel" style={{ minHeight: 44, marginBottom: 6 }} />)
          : activities.length === 0 ? <div className="empty">No activity yet. Start solving challenges!</div>
          : activities.map((act) => {
            const [icon, color] = eventStyle(act), d = toDate(act.createdAt);
            return (
              <div key={act.id} className={`ev${fresh.has(act.id) ? ' fresh' : ''}`} style={{ '--ec': color }}>
                <time dateTime={d && !isNaN(d) ? d.toISOString() : undefined}>{d && !isNaN(d) ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--:--'}</time>
                <span className="ico" aria-hidden="true">{icon}</span>
                <div><p>{act.message || act.description || act.type}
                  {act.xp > 0 && <span className="gain xp">+{act.xp} XP</span>}{act.credits > 0 && <span className="gain cr">+{act.credits} cr</span>}</p>
                  <small>{timeAgo(act.createdAt)}</small></div>
              </div>
            );
          })}
      </div>
    </section>
  );
}

// ── Main Office ────────────────────────────────────────────────────────────────
export default function Office({ user, userData: propUserData }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadStats, setLoadStats] = useState(true);
  const [loadAct, setLoadAct] = useState(true);
  const [error, setError] = useState('');
  const [showChallenges, setShowChallenges] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;
    try { setLoadStats(true); const res = await axios.get(`${API_BASE}/office/stats/${user.uid}`); if (res.data?.success) { setStats(res.data.stats); setError(''); } }
    catch (err) { console.error(err); setError('Failed to load stats.'); }
    finally { setLoadStats(false); }
  }, [user?.uid]);
  const fetchActivity = useCallback(async () => {
    if (!user?.uid) return;
    try { const res = await axios.get(`${API_BASE}/office/activity/${user.uid}`, { params: { limit: 20 } }); if (res.data?.success) setActivities(res.data.activities || []); }
    catch (err) { console.error(err); }
    finally { setLoadAct(false); }
  }, [user?.uid]);
  useEffect(() => { fetchStats(); fetchActivity(); }, [fetchStats, fetchActivity]);
  // Live log: poll every minute while the tab is visible
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) fetchActivity(); }, 60000);
    return () => clearInterval(id);
  }, [fetchActivity]);

  const s = stats || {};
  const xp = s.xp ?? propUserData?.xp ?? 0;
  const credits = s.credits ?? propUserData?.credits ?? 0;
  const elo = s.elo ?? propUserData?.elo ?? 1000;
  const level = s.level ?? propUserData?.level ?? 1;
  const weeklyXp = s.weeklyXp ?? propUserData?.weeklyXp ?? 0;
  const completedToday = s.completedToday ?? 0;
  const lifeRole = s.lifeRole ?? propUserData?.lifeRole ?? null;
  const weeklyStats = s.weeklyStats ?? {};
  const lc = LEVEL_COLORS[level] || LEVEL_COLORS[1];
  const firstName = user?.displayName?.split(' ')[0] || 'Engineer';
  const xpForNext = level * 500, xpPct = Math.min(100, Math.round((xp / xpForNext) * 100));

  const handleRewardsEarned = useCallback(({ newXp, newCredits, newLevel }) => {
    setStats((prev) => ({ ...(prev || {}), xp: newXp ?? prev?.xp, credits: newCredits ?? prev?.credits, level: newLevel ?? prev?.level, completedToday: (prev?.completedToday ?? 0) + 1 }));
  }, []);

  // Today's quests: progress comes from real data (challenge count, and today's activity log)
  const quests = useMemo(() => {
    const today = activities.filter((a) => isToday(a.createdAt));
    const has = (types) => today.some((a) => types.includes(a.type));
    return [
      { id: 'challenges', label: 'Daily Challenges', desc: 'Solve 3 AI-generated DSA challenges', icon: '🏢', color: '#39ff88', progress: Math.min(completedToday, 3), goal: 3, onClick: () => setShowChallenges(true) },
      { id: 'arena', label: 'Arena Battle', desc: '1v1 real-time coding battle', icon: '⚔️', color: '#ff6b6b', progress: has(['arena_win', 'arena_loss', 'arena_draw']) ? 1 : 0, goal: 1, cta: 'GO', onClick: () => navigate('/arena') },
      { id: 'hub', label: 'Community Hub', desc: 'Attempt a challenge from another player', icon: '🏛️', color: '#35e0ff', progress: has(['challenge_solved', 'challenge_attempted']) ? 1 : 0, goal: 1, cta: 'BROWSE', onClick: () => navigate('/hub') },
      { id: 'lab', label: 'Create a Challenge', desc: 'Publish a challenge and earn Credits', icon: '🧪', color: '#b18cff', progress: has(['challenge_published', 'challenge_created']) ? 1 : 0, goal: 1, cta: 'BUILD', onClick: () => navigate('/lab') },
    ].map((q) => ({ ...q, done: q.progress >= q.goal }));
  }, [activities, completedToday, navigate]);
  const doneCount = quests.filter((q) => q.done).length;

  const primaryRole = lifeRole?.primary || (typeof lifeRole === 'string' ? lifeRole : null);

  return (
    <div className="of">
      <div className="crt" aria-hidden="true" />
      {showChallenges && (
        <div className="modal" onClick={() => { setShowChallenges(false); fetchStats(); }}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Daily challenges">
            <DailyChallenge user={user} userData={propUserData} onClose={() => { setShowChallenges(false); fetchStats(); fetchActivity(); }} onRewardsEarned={handleRewardsEarned} />
          </div>
        </div>
      )}

      <div className="page">
        <div className="top">
          <button className="btn" onClick={() => navigate('/world')}>&larr; World</button>
          <div className="path"><b>{firstName.toLowerCase()}</b>@<i>evoworld</i>:~/office$</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="lvl" style={{ '--lc': lc }}>{LEVEL_NAMES[level] || 'Legend'} · Lv {level}</span>
            <button className="btn" onClick={() => { fetchStats(); fetchActivity(); }}>↻ Refresh</button>
          </div>
        </div>
        <span className="kicker"><i className="dot" />THE OFFICE</span>
        <h1>Good to see you, <span>{firstName}</span></h1>
        <p className="lede">Your quests, your week, and what's moving in the industry.</p>
        {error && <div className="err" role="alert">{error}</div>}

        <div className="stats">
          {loadStats && !stats ? [0, 1, 2, 3].map((i) => <div key={i} className="skel" />) : [
            ['XP', xp.toLocaleString(), '#b18cff'], ['CREDITS', credits.toLocaleString(), '#f4b740'], ['ELO', elo, '#ff6b6b'], ['WEEKLY XP', weeklyXp, '#35e0ff'],
          ].map(([l, v, c]) => <div key={l} className="stat" style={{ '--c': c }}><small>{l}</small><b>{v}</b></div>)}
        </div>
        <div className="xpbar" style={{ '--lc': lc }}>
          <div className="hd"><b>Level {level} · {LEVEL_NAMES[level] || 'Legend'}</b><span>{xp} / {xpForNext} XP</span></div>
          <div className="t" role="img" aria-label={`${xpPct}% to the next level`}><i style={{ width: `${xpPct}%` }} /></div>
          <small>{Math.max(0, xpForNext - xp)} XP to next level</small>
        </div>

        <div className="grid2">
          <div className="col">
            <section className="panel" style={{ '--pc': '#39ff88' }} aria-labelledby="of-q">
              <div className="phd"><h2 id="of-q">TODAY'S QUESTS</h2><span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
              <div className="boardsum"><span>{doneCount}/{quests.length} done</span><span className="bar"><i style={{ width: `${(doneCount / quests.length) * 100}%` }} /></span></div>
              {doneCount === quests.length && <div className="allclear" role="status">★ All quests cleared today. Every reward is already in your balance.</div>}
              <div className="board"><div className="tiles">{quests.map((q) => <Quest key={q.id} q={q} />)}</div></div>
            </section>
            {primaryRole && (
              <section className="panel role" aria-label="Life role"><small>LIFE ROLE</small><b>{primaryRole}</b>
                {lifeRole?.secondary && <em>{lifeRole.secondary}</em>}{lifeRole?.trait && <span>{lifeRole.trait}</span>}</section>
            )}
          </div>
          <div className="col">
            <WeeklyChart dailyXp={weeklyStats.dailyXp} weeklyXp={weeklyXp} />
            <SystemTicker activities={activities} loading={loadAct} />
          </div>
        </div>

        <IndustryFeed />
      </div>
    </div>
  );
}

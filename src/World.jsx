import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';
import './World.css';

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const EVENT_META = {
  challenge_solved:    { color: '#34d399', label: 'solved a challenge' },
  challenge_published: { color: '#60a5fa', label: 'published a challenge' },
  level_up:            { color: '#fbbf24', label: 'leveled up' },
  arena_win:           { color: '#ff4060', label: 'won an arena battle' },
  challenge_attempted: { color: '#c084fc', label: 'attempted a challenge' },
  problem_solved:      { color: '#00d4ff', label: 'solved a problem' },
  default:             { color: '#9ca3af', label: 'was active' },
};

// threat: 1 calm, 2 active, 3 hot, 4 dangerous, 5 critical
const DISTRICTS = [
  { num: '01', name: 'core_gameplay', color: '#35c4e6', zones: [
    { id: 'game',           code: 'ODY', label: 'Odyssey',        path: '/game',           tag: 'MAIN QUEST',   threat: 2, badge: 'dailyChallenges', desc: 'Story missions through company districts' },
    { id: 'arena',          code: 'ARN', label: 'Arena',          path: '/arena',          tag: 'COMBAT ZONE',  threat: 5, desc: 'Live 1v1 coding battles' },
    { id: 'contest',        code: 'CON', label: 'Contest',        path: '/contest',        tag: 'GLORY',        threat: 3, desc: 'Weekly ranked contests' },
    { id: 'lab',            code: 'LAB', label: 'Lab',            path: '/lab',            tag: 'EXPERIMENTAL', threat: 2, desc: 'Try ideas and test code' },
  ] },
  { num: '02', name: 'community_tools', color: '#a78bfa', zones: [
    { id: 'hub',            code: 'HUB', label: 'Hub',            path: '/hub',            tag: 'COMMUNITY',    threat: 2, badge: 'hubChallenges', desc: 'Challenges made by players' },
    { id: 'roadmap',        code: 'MAP', label: 'Roadmap',        path: '/roadmap',        tag: 'YOUR PATH',    threat: 1, desc: 'A guided order of problems' },
    { id: 'mock-interview', code: 'MCK', label: 'Mock Interview', path: '/mock-interview', tag: 'AI POWERED',   threat: 2, desc: 'AI interviewers with company personas' },
    { id: 'submissions',    code: 'SUB', label: 'Submissions',    path: '/submissions',    tag: 'HISTORY',      threat: 1, desc: 'Every solution you have sent' },
  ] },
  { num: '03', name: 'career_zone', color: '#f4b740', zones: [
    { id: 'office',         code: 'OFC', label: 'Office',         path: '/office',         tag: 'COMMAND',      threat: 1, desc: 'Your career command center' },
    { id: 'story',          code: 'STY', label: 'Story',          path: '/story',          tag: 'NARRATIVE',    threat: 1, desc: 'Your developer life story' },
    { id: 'leaderboard',    code: 'RNK', label: 'Rankings',       path: '/leaderboard',    tag: 'HALL OF FAME', threat: 3, desc: 'The global leaderboard' },
    { id: 'team-sim',       code: 'TSM', label: 'Team Sim',       path: '/team-sim',       tag: 'MULTIPLAYER',  threat: 2, desc: 'Work with a simulated team' },
  ] },
  { num: '04', name: 'enterprise_ops', color: '#ff7a66', zones: [
    { id: 'company',        code: 'HRP', label: 'HR Portal',      path: '/company',        tag: 'RECRUIT',      threat: 1, desc: 'For recruiters and hiring teams' },
    { id: 'visualizer',     code: 'VIZ', label: 'Visualizer',     path: '/visualizer',     tag: 'ANALYZE',      threat: 2, desc: 'See algorithms run step by step' },
    { id: 'code-review',    code: 'CRV', label: 'Code Review',    path: '/code-review',    tag: 'WARNING',      threat: 3, desc: 'Find the bugs before they ship' },
    { id: 'incident',       code: 'INC', label: 'Incident',       path: '/incident',       tag: 'EMERGENCY',    threat: 5, desc: 'Production is down. Fix it.' },
  ] },
];
const ZONES = DISTRICTS.flatMap((d) => d.zones.map((z) => ({ ...z, district: d })));
const THREAT = { 3: ['HOT', 'hot'], 4: ['DANGER', 'hot'], 5: ['CRITICAL', 'crit'] };
const COMMANDS = [
  { name: 'help', desc: 'list every place' }, { name: 'feed', desc: 'open the full activity log' },
  { name: 'profile', desc: 'open your profile' }, { name: 'logout', desc: 'end this session' },
];

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');
const named = (e) => e.name && e.name !== 'Unknown';
function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ─── One district as a floating terminal pane ─────────────────────────────────
function DistrictPane({ district, badgeMap, onOpen, reduce }) {
  const [typed, setTyped] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const typeOut = (text) => {
    clearInterval(timer.current);
    if (reduce) { setTyped(text); return; }
    let i = 0;
    timer.current = setInterval(() => { i += 1; setTyped(text.slice(0, i)); if (i >= text.length) clearInterval(timer.current); }, 22);
  };
  return (
    <section className="wt-pane" style={{ '--c': district.color }} aria-labelledby={`wt-d${district.num}`}>
      <div className="wt-phead">
        <h2 id={`wt-d${district.num}`}>[{district.num}] {district.name}</h2>
        <span>{district.zones.length} online</span>
      </div>
      <ul className="wt-rows">
        {district.zones.map((z) => {
          const count = z.badge ? (badgeMap[z.badge] || 0) : 0;
          const threat = THREAT[z.threat];
          return (
            <li key={z.id}>
              <button className="wt-row" onClick={() => onOpen({ ...z, district })}
                onMouseEnter={() => typeOut(`open ${slug(z.label)}`)} onFocus={() => typeOut(`open ${slug(z.label)}`)}>
                <span className="wt-code">{z.code}</span>
                <span><b>{z.label}</b><small><em>{z.tag}</em>{z.desc}</small></span>
                <span className="wt-tags">
                  {count > 0 && <span className="wt-tag new">{count} NEW</span>}
                  {threat && <span className={`wt-tag ${threat[1]}`}>{threat[0]}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="wt-pfoot">$ <em>{typed}</em></div>
    </section>
  );
}

// ─── Logout confirmation ──────────────────────────────────────────────────────
function LogoutDialog({ onCancel, onConfirm }) {
  const stayRef = useRef(null), outRef = useRef(null);
  useEffect(() => { stayRef.current && stayRef.current.focus(); }, []);
  const onKey = (e) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === stayRef.current) { e.preventDefault(); outRef.current.focus(); }
      else if (!e.shiftKey && document.activeElement === outRef.current) { e.preventDefault(); stayRef.current.focus(); }
    }
  };
  return (
    <div className="wt-modal" role="dialog" aria-modal="true" aria-labelledby="wt-logout-title" onKeyDown={onKey}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="wt-dialog">
        <div className="wt-phead"><h2 id="wt-logout-title">session.exit</h2><span>confirm</span></div>
        <p>Are you sure you want to log out?</p>
        <p>Your progress is saved to your account.</p>
        <div className="wt-dbtns">
          <button className="stay" ref={stayRef} onClick={onCancel}>Stay</button>
          <button className="out" ref={outRef} onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}

// ─── Full activity log (slide-in panel) ───────────────────────────────────────
function FeedPanel({ events, readIds, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <>
      <div className="wt-scrim" onClick={onClose} />
      <aside className="wt-feed" role="dialog" aria-modal="true" aria-label="Activity log">
        <div className="wt-phead"><h2>activity.log</h2><button className="wt-link" onClick={onClose}>close</button></div>
        <ol>
          {events.filter(named).map((ev) => {
            const m = EVENT_META[ev.type] || EVENT_META.default;
            return (
              <li key={ev.id} className={readIds.has(ev.id) ? '' : 'unread'}>
                <strong style={{ color: '#fff' }}>{ev.name}</strong> <span style={{ color: m.color }}>{m.label}</span>
                <time>{timeAgo(ev.createdAt)} ago</time>
              </li>
            );
          })}
          {events.filter(named).length === 0 && <li>No activity yet.</li>}
        </ol>
      </aside>
    </>
  );
}

// ─── World ────────────────────────────────────────────────────────────────────
export default function World({ user, userData, onLogout }) {
  const navigate = useNavigate();
  const reduce = useMemo(prefersReducedMotion, []);
  const bgRef = useRef(null), stageRef = useRef(null), inputRef = useRef(null), launchTimer = useRef(null);

  const [dailyCount, setDailyCount] = useState(0);
  const [hubCount, setHubCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [showFeed, setShowFeed] = useState(false);
  const [seenBefore, setSeenBefore] = useState(new Set()); // what was read before the panel opened
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [launching, setLaunching] = useState(null);
  const [booting, setBooting] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const [cmd, setCmd] = useState('');
  const [sel, setSel] = useState(0);
  const [cmdOpen, setCmdOpen] = useState(false);

  const name = user?.displayName || 'Developer';
  const handle = (name.split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const xpLevel = userData?.level ?? 1;
  const xpCurrent = userData?.xp ?? 0;
  const xpTarget = xpLevel * 500;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const levelName = LEVEL_NAMES[Math.min(xpLevel, 5)] || 'Legend';
  const filled = Math.round(xpPct / 5);
  const badgeMap = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const unread = events.filter(named).slice(0, 6).filter((e) => !readIds.has(e.id)).length;

  // Data: badge counts, activity feed, read state (same sources as before)
  useEffect(() => {
    if (!user?.uid) return;
    axios.get(`${API_BASE}/daily-challenges/${user.uid}`)
      .then((r) => setDailyCount(Math.max(0, (r.data.challenges?.length ?? 0) - (r.data.completedCount ?? 0)))).catch(() => {});
    axios.get(`${API_BASE}/challenges`)
      .then((r) => setHubCount((r.data.challenges || []).filter((c) => !c.attemptedBy?.includes(user.uid)).length)).catch(() => {});
    try { const s = localStorage.getItem(`feed_read_${user.uid}`); if (s) setReadIds(new Set(JSON.parse(s))); } catch (e) { /* ignore */ }
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
  }, []);

  const openFeed = useCallback(() => {
    setSeenBefore(readIds);
    setShowFeed(true);
    const ids = new Set([...readIds, ...events.map((e) => e.id)]);
    setReadIds(ids);
    try { if (user?.uid) localStorage.setItem(`feed_read_${user.uid}`, JSON.stringify([...ids].slice(-200))); } catch (e) { /* ignore */ }
  }, [readIds, events, user?.uid]);

  // 3D background, loaded after first paint
  useEffect(() => {
    let cleanup = null, cancelled = false;
    import('./CyberBackground')
      .then((m) => { if (!cancelled && bgRef.current) cleanup = m.default(bgRef.current, DISTRICTS); })
      .catch((e) => console.warn('3D background unavailable:', e));
    return () => { cancelled = true; if (cleanup) cleanup(); };
  }, []);

  // Boot sequence, once per session
  useEffect(() => {
    if (reduce) return undefined;
    const key = `evo-booted-${user?.uid || 'anon'}`;
    try { if (sessionStorage.getItem(key)) return undefined; sessionStorage.setItem(key, '1'); } catch (e) { return undefined; }
    const h = new Date().getHours();
    const greet = h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening';
    const lines = ['EVOWORLD OS v2.6', `[ ok ] authenticating ${handle}`, '[ ok ] mounting 4 districts', '[ ok ] 16 places online', '[ ok ] loading your stats', `${greet}, ${handle}.`];
    setBooting(true); setBootLines([]);
    let i = 0;
    const tick = setInterval(() => { i += 1; setBootLines(lines.slice(0, i)); if (i >= lines.length) { clearInterval(tick); setTimeout(() => setBooting(false), 300); } }, 140);
    const skip = () => { clearInterval(tick); setBooting(false); };
    window.addEventListener('keydown', skip, { once: true });
    return () => { clearInterval(tick); window.removeEventListener('keydown', skip); };
  }, [reduce, user?.uid, handle]);

  // 3D tilt of the panes following the pointer (desktop)
  useEffect(() => {
    if (reduce) return undefined;
    const onMove = (e) => {
      const el = stageRef.current; if (!el || window.innerWidth < 860) return;
      const x = e.clientX / window.innerWidth - 0.5, y = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`); el.style.setProperty('--rx', `${(6 - y * 4).toFixed(2)}deg`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduce]);

  // Press / anywhere to focus the command line
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || confirmLogout || showFeed) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault(); inputRef.current && inputRef.current.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmLogout, showFeed]);

  useEffect(() => () => clearTimeout(launchTimer.current), []);

  const openZone = useCallback((z) => {
    if (reduce) { navigate(z.path); return; }
    setLaunching({ ...z, district: z.district || DISTRICTS.find((d) => d.zones.some((x) => x.id === z.id)) || DISTRICTS[0] });
    clearTimeout(launchTimer.current);
    launchTimer.current = setTimeout(() => navigate(z.path), 900);
  }, [navigate, reduce]);

  // Command line
  const matches = useMemo(() => {
    const q = cmd.trim().toLowerCase();
    if (!q) return [];
    if (q === 'help') return ZONES.map((z) => ({ name: z.label, desc: z.desc, zone: z }));
    return ZONES.filter((z) => z.label.toLowerCase().includes(q) || z.code.toLowerCase().startsWith(q) || z.id.includes(q))
      .map((z) => ({ name: z.label, desc: z.desc, zone: z }))
      .concat(COMMANDS.filter((c) => c.name.startsWith(q))).slice(0, 8);
  }, [cmd]);
  const run = (m) => {
    if (!m) return;
    setCmd(''); setCmdOpen(false);
    if (m.zone) openZone(m.zone);
    else if (m.name === 'logout') setConfirmLogout(true);
    else if (m.name === 'profile') navigate('/profile');
    else if (m.name === 'feed') openFeed();
  };
  const onCmdKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!matches.length) return;
      setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
    } else if (e.key === 'Enter') { e.preventDefault(); run(matches[sel]); }
    else if (e.key === 'Escape') { setCmd(''); e.currentTarget.blur(); }
  };

  const stats = [
    { l: 'STREAK',  v: `${userData?.currentStreak || 0}d` },
    { l: 'SOLVED',  v: userData?.problemsSolved || 0 },
    { l: 'WINS',    v: userData?.arenaWins || 0 },
    { l: 'ELO',     v: userData?.elo || 1000, c: '#f4b740' },
    { l: 'CREDITS', v: userData?.credits || 0, c: '#c4a6ff' },
    { l: 'RANK',    v: `#${userData?.rank || '?'}`, c: '#39ff88' },
  ];

  return (
    <div className="wt">
      <div className="wt-bg" ref={bgRef} aria-hidden="true" />
      <div className="wt-crt" aria-hidden="true" />

      <div className="wt-app">
        <header className="wt-bar">
          <div className="wt-who"><b>{handle}</b>@<i>evoworld</i>:~/world$<span className="wt-cursor" aria-hidden="true" /></div>
          <div className="wt-lvl">
            <b>LV {xpLevel} {levelName}</b>{' '}
            <span aria-hidden="true">[{'█'.repeat(filled)}{'░'.repeat(20 - filled)}]</span>{' '}
            {xpPct}% to LV {xpLevel + 1}
          </div>
          <div className="wt-actions">
            <NotificationBell user={user} variant="terminal" />
            <button className="wt-ibtn" onClick={openFeed} aria-label={`Activity log${unread ? `, ${unread} new` : ''}`} title="Activity log">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></svg>
              {unread > 0 && <span className="wt-count">{unread}</span>}
            </button>
            <button className="wt-ibtn" onClick={() => navigate('/profile')} aria-label="Your profile">
              {(name[0] || 'D').toUpperCase()} <small>profile</small>
            </button>
            <button className="wt-ibtn danger" onClick={() => setConfirmLogout(true)} aria-label="Log out" title="Log out">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></svg>
            </button>
          </div>
        </header>

        <section className="wt-stats" aria-label="Your stats">
          {stats.map((s) => (
            <div className="wt-stat" key={s.l}><small>{s.l}</small><b style={s.c ? { color: s.c } : undefined}>{s.v}</b></div>
          ))}
        </section>

        <div className="wt-cmd">
          <label htmlFor="wt-cmd-input">&gt;</label>
          <input id="wt-cmd-input" ref={inputRef} autoComplete="off" spellCheck={false} role="combobox"
            aria-expanded={cmdOpen && !!cmd.trim()} aria-controls="wt-sugg"
            placeholder={typeof window !== 'undefined' && window.innerWidth < 560 ? 'type a place, or help' : 'type a place or command, like arena or help   (press / anywhere)'}
            value={cmd} onChange={(e) => { setCmd(e.target.value); setSel(0); setCmdOpen(true); }}
            onKeyDown={onCmdKey} onFocus={() => setCmdOpen(true)} onBlur={() => setTimeout(() => setCmdOpen(false), 120)} />
          {cmdOpen && cmd.trim() && (
            <ul className="wt-sugg" id="wt-sugg" role="listbox">
              {matches.length ? matches.map((m, i) => (
                <li key={m.name} role="option" aria-selected={i === sel} onMouseDown={(e) => { e.preventDefault(); run(m); }}>
                  {m.name}<span>{m.desc}</span>
                </li>
              )) : <li aria-selected="false">command not found: {cmd.trim()}<span>try help</span></li>}
            </ul>
          )}
        </div>

        <main className="wt-world" aria-label="EvoWorld districts">
          <div className="wt-stage" ref={stageRef}>
            {DISTRICTS.map((d) => <DistrictPane key={d.num} district={d} badgeMap={badgeMap} onOpen={openZone} reduce={reduce} />)}
          </div>
        </main>

        <section className="wt-log" aria-label="Live activity">
          <div className="wt-phead"><h2>tail -f activity.log</h2><button className="wt-link" onClick={openFeed}>open full log</button></div>
          <ol>
            {events.filter(named).slice(0, 5).map((ev) => {
              const m = EVENT_META[ev.type] || EVENT_META.default;
              return <li key={ev.id}><time>[{timeAgo(ev.createdAt)}]</time><strong>{ev.name}</strong> <span style={{ color: m.color }}>{m.label}</span></li>;
            })}
            {events.filter(named).length === 0 && <li><time>[--]</time>waiting for activity…</li>}
          </ol>
        </section>
      </div>

      {booting && (
        <div className="wt-boot" aria-hidden="true" onClick={() => setBooting(false)}>
          {bootLines.map((l, i) => <p key={i}>{l.startsWith('[ ok ]') ? <><span className="dim">[ ok ]</span>{l.slice(6)}</> : l}</p>)}
        </div>
      )}

      {launching && (
        <div className="wt-launch" role="status" aria-live="assertive">
          <div>
            <pre>{`> open ${slug(launching.label)}\n> routing via ${launching.district.name} ...\n> handshake OK`}</pre>
            <h3>ACCESS GRANTED</h3>
          </div>
        </div>
      )}

      {showFeed && <FeedPanel events={events} readIds={seenBefore} onClose={() => setShowFeed(false)} />}
      {confirmLogout && <LogoutDialog onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout && onLogout(); }} />}
    </div>
  );
}

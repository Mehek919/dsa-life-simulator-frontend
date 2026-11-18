import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';
import { computeOdyssey } from './odysseyData';
import { loadLook } from './avatarKit';
import previewCity from './assets/layout-city-3d.jpg';
import previewLobby from './assets/layout-lobby-2d.jpg';
import './World.css';

// ─────────────────────────────────────────────────────────────────────────────
// World: the home screen, as a game lobby.
// Clarity first (one main quest, one path, grouped zones), game feel on top
// (player HUD, quest rewards, a real map trail, zones with unlocks).
// ─────────────────────────────────────────────────────────────────────────────

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const UNLOCK_AT = 3; // problems solved before the battle zones open
const XP_PER_PROBLEM = 100;
const RECRUITER_ROLES = ['recruiter', 'hiring-manager', 'admin'];

const EVENT_META = {
  challenge_solved:    { color: 'var(--ok)',     label: 'solved a challenge' },
  challenge_published: { color: 'var(--blue)',   label: 'published a challenge' },
  level_up:            { color: 'var(--gold)',   label: 'leveled up' },
  arena_win:           { color: 'var(--hot)',    label: 'won an arena battle' },
  challenge_attempted: { color: 'var(--violet)', label: 'attempted a challenge' },
  problem_solved:      { color: 'var(--accent)', label: 'solved a problem' },
  default:             { color: 'var(--muted)',  label: 'was active' },
};

// Every place, grouped by what the player wants to do. `gated` zones open after UNLOCK_AT solves.
const GROUPS = [
  { id: 'battle', title: 'Battle zones', hint: 'Fight the clock, other players and AI interviewers', color: 'var(--hot)', places: [
    { id: 'mock-interview', icon: 'mic',    label: 'Mock Interview', path: '/mock-interview', desc: 'AI interviewers that act like Google, Meta, Stripe', reward: '+XP' },
    { id: 'arena',          icon: 'swords', label: 'Arena',          path: '/arena',          desc: 'Live 1v1 coding battles', gated: true, reward: '+ELO' },
    { id: 'contest',        icon: 'trophy', label: 'Weekly Contest', path: '/contest',        desc: 'Ranked contest every week', gated: true, reward: 'Glory' },
    { id: 'hub',            icon: 'users',  label: 'Community Hub',  path: '/hub',            desc: 'Challenges made by other players', badge: 'hub', reward: '+Credits' },
  ] },
  { id: 'train', title: 'Training grounds', hint: 'Level up skills before the real fight', color: 'var(--blue)', places: [
    { id: 'roadmap',     icon: 'route',  label: 'Roadmap',     path: '/roadmap',     desc: 'A guided order of problems, topic by topic' },
    { id: 'visualizer',  icon: 'eye',    label: 'Visualizer',  path: '/visualizer',  desc: 'Watch algorithms run step by step' },
    { id: 'code-review', icon: 'bug',    label: 'Code Review', path: '/code-review', desc: 'Spot the bugs, or fix AI written code', gated: true },
    { id: 'incident',    icon: 'alert',  label: 'Incident',    path: '/incident',    desc: 'Production is down. Fix it under pressure', gated: true },
    { id: 'team-sim',    icon: 'team',   label: 'Team Sim',    path: '/team-sim',    desc: 'Ship a feature with a simulated team', gated: true },
    { id: 'lab',         icon: 'flask',  label: 'Lab',         path: '/lab',         desc: 'A sandbox to try ideas and run code' },
  ] },
  { id: 'records', title: 'Hall of records', hint: 'Your stats, history and story', color: 'var(--gold)', places: [
    { id: 'leaderboard', icon: 'chart', label: 'Rankings',    path: '/leaderboard', desc: 'Where you stand globally' },
    { id: 'submissions', icon: 'list',  label: 'Submissions', path: '/submissions', desc: 'Every solution you have sent' },
    { id: 'story',       icon: 'book',  label: 'Your Story',  path: '/story',       desc: 'Your developer journey, told as a story' },
    { id: 'office',      icon: 'brief', label: 'Office',      path: '/office',      desc: 'Your career command center' },
  ] },
];
const ALL_PLACES = GROUPS.flatMap((g) => g.places);
// How each zone looks in the 3D hub: badge emoji and building shape.
const SCENE_LOOK = {
  'mock-interview': ['🎙️', 'tower'], arena: ['⚔️', 'colosseum'], contest: ['🏆', 'trophy'], hub: ['👥', 'tent'],
  roadmap: ['🧭', 'signpost'], visualizer: ['🔭', 'dome'], 'code-review': ['🐞', 'workshop'], incident: ['🚨', 'server'],
  'team-sim': ['🤝', 'office'], lab: ['🧪', 'flask'],
  leaderboard: ['🏅', 'podium'], submissions: ['📜', 'workshop'], story: ['📖', 'library'], office: ['💼', 'tower'],
};
const GROUP_HEX = { battle: '#ff6b6b', train: '#5aa9ff', records: '#f4b740' };
const GROUP_NAME = { battle: 'Battle zone', train: 'Training ground', records: 'Hall of records' };
// Ring order around the island: training in the west, battles in the north, records in the east.
const SCENE_PLACES = ['train', 'battle', 'records'].flatMap((gid) => GROUPS.find((g) => g.id === gid).places.map((p) => ({
  id: p.id, label: p.label, sub: GROUP_NAME[gid], color: GROUP_HEX[gid], icon: SCENE_LOOK[p.id][0], kind: SCENE_LOOK[p.id][1],
})));
const groupOf = (id) => GROUPS.find((g) => g.places.some((p) => p.id === id));
const VIEW_KEY = 'evo-world-view';
const canWebGL = () => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; } };

const TOUR_3D = [
  { target: null, title: 'Welcome to DSA Life Simulator', body: 'This is your city. Every building is a place to train, fight or track your progress.' },
  { target: null, title: 'Walk anywhere', body: 'Click the ground or use WASD to walk. Drag to look around. Click a building to walk to its door.' },
  { target: 'quest3d', title: 'The Odyssey Gate', body: 'The glowing gate in the middle is your main quest. Walk in, or hit Play any time.' },
];
const TOUR = [
  { target: 'continue', title: 'Your main quest', body: 'This card always shows your next mission and what you will earn. Hit Play and you are solving.' },
  { target: 'path',     title: 'The Odyssey trail',  body: 'Each stop is a district of real companies. Clear half of one to unlock the next.' },
  { target: 'explore',  title: 'Zones to explore',   body: `Battles, training and records. Some zones unlock after you solve ${UNLOCK_AT} problems.` },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
const named = (e) => e.name && e.name !== 'Unknown';
function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
};
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Icons (inline, stroke uses currentColor) ─────────────────────────────────
const ICON_PATHS = {
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  swords: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5" /><path d="m13 19 6-6M16 16l4 4M19 21l2-2" /><path d="M9.5 6.5 14 2h3v3l-4.5 4.5" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>,
  route: <><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19H17a3.5 3.5 0 0 0 0-7H7a3.5 3.5 0 0 1 0-7h8.5" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  bug: <><rect x="7" y="8" width="10" height="12" rx="5" /><path d="M12 8V20M3 13h4M17 13h4M5 7l3 2M19 7l-3 2M5 19l2.5-2M19 19l-2.5-2M9 4l1.5 2M15 4l-1.5 2" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></>,
  team: <><circle cx="12" cy="7" r="3" /><circle cx="5" cy="10" r="2.2" /><circle cx="19" cy="10" r="2.2" /><path d="M7 20a5 5 0 0 1 10 0M1.5 19a3.5 3.5 0 0 1 5-3M22.5 19a3.5 3.5 0 0 0-5-3" /></>,
  flask: <><path d="M9 3h6M10 3v6L4.5 18.5A1.8 1.8 0 0 0 6 21h12a1.8 1.8 0 0 0 1.5-2.5L14 9V3" /><path d="M7 15h10" /></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></>,
  brief: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  play: <path d="M7 4v16l13-8L7 4Z" fill="currentColor" />,
  flame: <path d="M12 22c4.4 0 7-2.9 7-6.8 0-4.6-4-6.4-4.5-11.2-2.6 1.6-4 4-4 6.4-1.1-.6-1.8-1.7-2-3C6.5 9.3 5 11.7 5 15.2 5 19.1 7.6 22 12 22Z" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.8-2.5 2.2-2.5 1-2.5 2.3 1.1 2 2.5 2 2.5-.8 2.5-2" /></>,
  check: <path d="m5 12 5 5L20 7" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  skull: <><path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3Z" /><circle cx="9" cy="11" r="1.5" /><circle cx="15" cy="11" r="1.5" /><path d="M10 20v-2M14 20v-2" /></>,
  logout: <><path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 1 1-12.8 0" /></>,
  scroll: <><path d="M8 3h11a2 2 0 0 1 2 2v2h-4" /><path d="M17 7v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2h9v2a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12" /></>,
};
function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON_PATHS[name]}</svg>
  );
}

// ─── Player portrait: 3D bust of the user's own avatar, letter as fallback ────
function Portrait({ uid, userData, initial, level }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let cleanup = null, dead = false;
    import('./avatarKit').then((m) => {
      if (dead || !ref.current) return;
      cleanup = m.mountAvatarBust(ref.current, m.loadLook(uid, userData), '#39d98a');
      setOk(true);
    }).catch(() => {});
    return () => { dead = true; if (cleanup) cleanup(); };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="ew-portrait">
      <div className="ew-portrait-in" ref={ref}>{!ok && <span>{initial}</span>}</div>
      <span className="ew-lv-badge" aria-hidden="true">{level}</span>
    </div>
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
    <div className="ew-modal" role="dialog" aria-modal="true" aria-labelledby="ew-logout-title" onKeyDown={onKey}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="ew-dialog">
        <h2 id="ew-logout-title">Leave DSA Life Simulator?</h2>
        <p>Your progress is saved. Your streak keeps counting if you come back tomorrow.</p>
        <div className="ew-dbtns">
          <button className="ew-btn ghost" ref={stayRef} onClick={onCancel}>Keep playing</button>
          <button className="ew-btn danger" ref={outRef} onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </div>
  );
}

// ─── First visit tour ─────────────────────────────────────────────────────────
function Tour({ steps, step, onNext, onSkip }) {
  const s = steps[step];
  useEffect(() => {
    const el = s.target && document.querySelector(`[data-tour="${s.target}"]`);
    if (!el) return undefined;
    el.classList.add('ew-spot');
    el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    return () => el.classList.remove('ew-spot');
  }, [s.target]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onSkip(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);
  return (
    <>
      <div className="ew-tour-scrim" onClick={onSkip} />
      <div className="ew-tour" role="dialog" aria-live="polite" aria-labelledby="ew-tour-title">
        <div className="ew-tour-step">{steps.map((_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>
        <h3 id="ew-tour-title">{s.title}</h3>
        <p>{s.body}</p>
        <div className="ew-tour-btns">
          <button className="ew-link" onClick={onSkip}>Skip</button>
          <button className="ew-btn" onClick={onNext} autoFocus>{step === steps.length - 1 ? 'Let’s play' : 'Next'}</button>
        </div>
      </div>
    </>
  );
}

// ─── Layout picker: the player chooses how DSA Life Simulator looks ─────────────────────
const LAYOUTS = [
  { id: '3d', title: '3D City', img: previewCity, tag: 'Immersive',
    body: 'Walk your avatar around a living city. Every zone is a building you can enter.',
    points: ['Explore with click, tap or WASD', 'Other players walking around', 'Best on laptops and newer phones'] },
  { id: 'list', title: 'Classic Lobby', img: previewLobby, tag: 'Fast and light',
    body: 'Everything on one screen: your main quest, the Odyssey trail and every zone.',
    points: ['One click to any zone', 'Loads instantly', 'Great on older phones and slow internet'] },
];
function LayoutPicker({ current, onPick, onClose }) {
  const noGL = !canWebGL();
  const titleRef = useRef(null);
  useEffect(() => { titleRef.current && titleRef.current.focus(); }, []);
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="lp" role="dialog" aria-modal="true" aria-labelledby="lp-title">
      <div className="lp-in">
        {onClose && <button className="lp-close" onClick={onClose} aria-label="Close">✕</button>}
        <div className="lp-eyebrow">{current ? 'Change layout' : 'Before you start'}</div>
        <h1 id="lp-title" ref={titleRef} tabIndex={-1}>How do you want to explore DSA Life Simulator?</h1>
        <p className="lp-sub">Same quests, same progress. Just pick the look you enjoy. You can switch any time from the menu.</p>
        <div className="lp-cards">
          {LAYOUTS.map((l) => {
            const disabled = l.id === '3d' && noGL;
            return (
              <button key={l.id} className={`lp-card${current === l.id ? ' current' : ''}`}
                onClick={() => !disabled && onPick(l.id)} disabled={disabled} aria-describedby={`lp-${l.id}-body`}>
                <span className="lp-shot"><img src={l.img} alt="" loading="eager" /><span className="lp-tag">{l.tag}</span>
                  {current === l.id && <span className="lp-now">Current</span>}</span>
                <span className="lp-body">
                  <b>{l.title}</b>
                  <span id={`lp-${l.id}-body`}>{disabled ? 'Your browser or device can’t show 3D graphics, so this one isn’t available here.' : l.body}</span>
                  <ul>{l.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
                  <span className="lp-choose">{disabled ? 'Not available' : current === l.id ? 'Keep this one' : `Choose ${l.title}`}</span>
                </span>
              </button>
            );
          })}
        </div>
        {reduceMotion() && !noGL && <p className="lp-note">Reduced motion is on for your device. The 3D City still works, with animations turned down.</p>}
      </div>
    </div>
  );
}

// ─── World ────────────────────────────────────────────────────────────────────
export default function World({ user, userData, onLogout }) {
  const navigate = useNavigate();
  const uid = user?.uid;

  const [odyssey, setOdyssey] = useState(null);      // null while loading
  const [daily, setDaily] = useState({ total: 0, done: 0 });
  const [hubCount, setHubCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [tourStep, setTourStep] = useState(-1);
  const [view, setView] = useState(() => {
    let saved = null;
    try { saved = localStorage.getItem(VIEW_KEY); } catch (e) { saved = null; }
    if (saved === '3d' && !canWebGL()) return 'list';
    return saved === '3d' || saved === 'list' ? saved : 'choose';
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [nearId, setNearId] = useState(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [questMin, setQuestMin] = useState(false);
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const searchRef = useRef(null);
  const menuRef = useRef(null);
  const trailRef = useRef(null);

  // ── Identity and progress ──
  const name = user?.displayName || 'Developer';
  const firstName = name.split(' ')[0] || 'Player';
  const level = userData?.level ?? 1;
  const xp = userData?.xp ?? 0;
  const xpTarget = level * 500;
  const xpPct = Math.min(100, Math.round((xp / xpTarget) * 100));
  const levelName = LEVEL_NAMES[Math.min(level, 5)] || 'Legend';
  const streak = userData?.currentStreak || 0;
  const credits = userData?.credits || 0;
  const solvedCount = Math.max(userData?.problemsSolved || 0, odyssey?.totalSolved || 0);
  const unlocked = solvedCount >= UNLOCK_AT;
  const isNew = solvedCount === 0;
  const isRecruiter = RECRUITER_ROLES.includes(userData?.role);

  // The Classic Lobby uses a plain CSS background: no WebGL, so it stays fast on any device.

  // ── The walkable 3D hub ──
  const onArriveRef = useRef(null);
  useEffect(() => {
    if (view !== '3d') return undefined;
    let dead = false;
    setSceneReady(false);
    import('./WorldScene').then((m) => {
      if (dead || !stageRef.current) return;
      const world = m.default(stageRef.current, {
        places: SCENE_PLACES,
        look: loadLook(uid, userData),
        onNear: (id) => setNearId(id),
        onArrive: (id) => onArriveRef.current && onArriveRef.current(id),
        onReady: () => setSceneReady(true),
      });
      if (!world.ok) { setView('list'); return; }
      sceneRef.current = world;
    }).catch(() => { if (!dead) setView('list'); });
    return () => { dead = true; setNearId(null); if (sceneRef.current) sceneRef.current.destroy(); sceneRef.current = null; };
  }, [view, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (sceneRef.current && sceneRef.current.setPaused) sceneRef.current.setPaused(pickerOpen || confirmLogout);
  }, [pickerOpen, confirmLogout, sceneReady]);
  const switchView = (v) => { setView(v); setMenuOpen(false); setPickerOpen(false); try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* ignore */ } };
  const openPicker = () => { setMenuOpen(false); setPickerOpen(true); };

  // ── Data: Odyssey progress (drives the main quest and the trail) ──
  useEffect(() => {
    if (!uid) return undefined;
    let dead = false;
    Promise.all([
      axios.get(`${API_BASE}/problems`, { params: { limit: 1000 } }),
      axios.get(`${API_BASE}/problems/progress/${uid}`).catch(() => ({ data: { progress: {} } })),
    ]).then(([pr, pg]) => {
      if (dead) return;
      const problems = (pr.data?.problems || []).map((p) => ({ ...p, chapter: Number(p.chapter || 0), district: Number(p.district || 0) }))
        .filter((p) => p.chapter >= 1 && p.chapter <= 73 && p.district >= 1 && p.problemType !== 'roadmap' && p.source !== 'roadmap' && !p.isRoadmap && !p.roadmap && !p.excludeFromOdyssey);
      setOdyssey(computeOdyssey(problems, pg.data?.progress || {}));
    }).catch(() => { if (!dead) setOdyssey(computeOdyssey([], {})); });
    return () => { dead = true; };
  }, [uid]);

  // ── Data: daily quests and hub badge ──
  useEffect(() => {
    if (!uid) return;
    axios.get(`${API_BASE}/daily-challenges/${uid}`)
      .then((r) => setDaily({ total: r.data.challenges?.length ?? 0, done: r.data.completedCount ?? 0 })).catch(() => {});
    axios.get(`${API_BASE}/challenges`)
      .then((r) => setHubCount((r.data.challenges || []).filter((c) => !c.attemptedBy?.includes(uid)).length)).catch(() => {});
  }, [uid]);

  // ── Data: live activity ──
  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(8));
    return onSnapshot(q, (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
  }, []);

  // ── First visit tour, once per account ──
  useEffect(() => {
    if (!uid || !odyssey) return undefined;
    if (view === 'choose' || pickerOpen) return undefined;
    if (view === '3d' && !sceneReady) return undefined;
    if (store.get(`evo-world-tour-${view}-v1-${uid}`)) return undefined;
    const t = setTimeout(() => setTourStep(0), 700);
    return () => clearTimeout(t);
  }, [uid, odyssey, view, sceneReady, pickerOpen]);
  const tourSteps = view === '3d' ? TOUR_3D : TOUR;
  const endTour = useCallback(() => { setTourStep(-1); if (uid) store.set(`evo-world-tour-${view}-v1-${uid}`, '1'); }, [uid, view]);
  const nextTour = useCallback(() => { if (tourStep >= tourSteps.length - 1) endTour(); else setTourStep((s) => s + 1); }, [tourStep, tourSteps.length, endTour]);

  // ── Scroll the trail so the player's current stop is in view ──
  const current = odyssey?.current;
  useEffect(() => {
    const el = trailRef.current?.querySelector('.ew-stop.here');
    if (el && trailRef.current.scrollWidth > trailRef.current.clientWidth) {
      trailRef.current.scrollLeft = el.offsetLeft - trailRef.current.clientWidth / 2 + el.clientWidth / 2;
    }
  }, [odyssey]);

  // ── "/" focuses search, Escape closes the menu ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
      if (e.key !== '/' || confirmLogout || tourStep >= 0) return;
      const tag = document.activeElement?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault(); searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmLogout, tourStep]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 2800); return () => clearTimeout(t); }, [toast]);

  // ── Actions ──
  const play = () => navigate(current ? `/game?chapter=${current.id}` : '/game');
  const openPlace = (p) => {
    if (p.gated && !unlocked) {
      const left = UNLOCK_AT - solvedCount;
      setToast(`${p.label} is locked. Solve ${left} more problem${left === 1 ? '' : 's'} to unlock it.`);
      return;
    }
    navigate(p.path);
  };
  const openDistrict = (d) => {
    if (!d.open) { setToast(`${d.name} is covered in fog. Clear half of the previous district to reveal it.`); return; }
    const first = odyssey?.chapters.find((c) => c.district === d.id && (c.state === 'active' || c.state === 'done'));
    navigate(first ? `/game?chapter=${first.id}` : '/game');
  };

  // ── 3D: entering whatever door the player stands at ──
  const enterPlace = useCallback((id) => {
    if (!id) return;
    if (id === 'odyssey') { play(); return; }
    const p = ALL_PLACES.find((x) => x.id === id);
    if (p) openPlace(p);
  }, [current, unlocked, solvedCount]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (view !== '3d') return undefined;
    const onKey = (e) => {
      if (!nearId || tourStep >= 0 || confirmLogout) return;
      const tag = document.activeElement?.tagName || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Enter' || e.key.toLowerCase() === 'e') { e.preventDefault(); enterPlace(nearId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, nearId, tourStep, confirmLogout, enterPlace]);
  useEffect(() => {
    const w = sceneRef.current; if (!w || !sceneReady) return;
    w.setLocked(new Set(unlocked ? [] : ALL_PLACES.filter((p) => p.gated).map((p) => p.id)));
  }, [sceneReady, unlocked]);
  useEffect(() => {
    const w = sceneRef.current; if (!w || !sceneReady || !current) return;
    w.setGateColor(current.color);
    w.setGateLabel('Odyssey Gate', `Main quest · ${current.company}`);
  }, [sceneReady, current]);

  // ── Search filter across zones ──
  const q = search.trim().toLowerCase();
  const visibleGroups = useMemo(() => {
    if (!q) return GROUPS;
    return GROUPS.map((g) => ({ ...g, places: g.places.filter((p) => `${p.label} ${p.desc}`.toLowerCase().includes(q)) })).filter((g) => g.places.length);
  }, [q]);
  const onSearchKey = (e) => {
    if (e.key === 'Escape') { setSearch(''); e.currentTarget.blur(); }
    if (e.key === 'Enter') {
      const hit = ALL_PLACES.find((p) => `${p.label} ${p.desc}`.toLowerCase().includes(q));
      if (hit) openPlace(hit);
    }
  };

  const feed = events.filter(named).slice(0, 5);
  const curDistrict = current ? odyssey.districts.find((d) => d.id === current.district) : null;
  const left = current ? Math.max(0, current.total - current.solved) : 0;
  const pips = current ? Math.min(current.total, 20) : 0;
  const pipsOn = current && current.total ? Math.round((current.solved / current.total) * pips) : 0;
  const dailyDone = daily.total > 0 && daily.done >= daily.total;

  const quests = [
    { id: 'daily', icon: 'bolt', label: 'Clear daily challenges', progress: `${Math.min(daily.done, daily.total)}/${daily.total || 0}`,
      pct: daily.total ? (daily.done / daily.total) * 100 : 0, done: dailyDone, reward: '+50 XP', go: () => navigate('/game') },
    { id: 'streak', icon: 'flame', label: streak > 0 ? `Keep your ${streak} day streak` : 'Start a streak today', progress: 'Solve 1',
      pct: 0, done: false, reward: '+1 day', go: play },
    { id: 'mock', icon: 'mic', label: 'Survive a mock interview', progress: '15 min',
      pct: 0, done: false, reward: '+100 XP', go: () => navigate('/mock-interview') },
  ];

  const nearPlace = nearId && nearId !== 'odyssey' ? ALL_PLACES.find((p) => p.id === nearId) : null;
  const nearGroup = nearPlace ? groupOf(nearPlace.id) : null;
  const nearLocked = !!(nearPlace && nearPlace.gated && !unlocked);
  onArriveRef.current = () => {};

  if (view === 'choose') return <LayoutPicker onPick={switchView} />;
  const picker = pickerOpen && <LayoutPicker current={view} onPick={switchView} onClose={() => setPickerOpen(false)} />;

  if (view === '3d') {
    return (
      <div className={`ew ew3d${nearId ? ' has-prompt' : ''}`}>
        <div className="w3-stage" ref={stageRef} aria-label="DSA Life Simulator city. Click the ground to walk, drag to look around." />
        {!sceneReady && (
          <div className="w3-loading" role="status">
            <div className="w3-loading-logo">DSA Life Simulator</div>
            <div className="w3-loading-bar"><i /></div>
            <small>Building your city…</small>
          </div>
        )}
        {/* ── HUD ── */}
      <header className="ew-bar">
        <div className="ew-bar-in">
          <Portrait uid={uid} userData={userData} initial={(name[0] || 'D').toUpperCase()} level={level} />
          <div className="ew-player">
            <div className="ew-player-row">
              <b>{firstName}</b>
              <span className="ew-rank-title">{levelName}</span>
            </div>
            <div className="ew-xp" role="meter" aria-valuemin={0} aria-valuemax={xpTarget} aria-valuenow={xp}
              aria-label={`Level ${level}, ${xp} of ${xpTarget} XP`}>
              <i style={{ width: `${xpPct}%` }} />
              <span>{xp} / {xpTarget} XP</span>
            </div>
          </div>

          <div className="ew-bar-right">
            <div className={`ew-res flame${streak > 0 ? ' on' : ''}`} title={`${streak} day streak`}>
              <Icon name="flame" size={17} /><b>{streak}</b>
            </div>
            <div className="ew-res coin" title={`${credits} credits`}>
              <Icon name="coin" size={17} /><b>{credits}</b>
            </div>
            <NotificationBell user={user} variant="terminal" />
            <div className="ew-menu-wrap" ref={menuRef}>
              <button className="ew-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu">
                <span /><span /><span />
              </button>
              {menuOpen && (
                <div className="ew-menu" role="menu">
                  <div className="ew-menu-head"><b>{name}</b><span>Level {level} {levelName}{userData?.rank ? ` · Rank #${userData.rank}` : ''}</span></div>
                  <button role="menuitem" onClick={() => navigate('/profile')}>Profile and avatar</button>
                  <button role="menuitem" onClick={() => navigate('/skills')}>Skills profile</button>
                  <button role="menuitem" onClick={openPicker}>Change layout</button>
                  {isRecruiter && <button role="menuitem" onClick={() => navigate('/company')}>HR Portal</button>}
                  <button role="menuitem" className="danger" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}>
                    <Icon name="logout" size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

        {/* Quests button and drawer */}
        <div className="w3-side">
          <button className="w3-qbtn" onClick={() => setQuestsOpen((o) => !o)} aria-expanded={questsOpen}>
            <Icon name="scroll" size={18} /> Quests
            {quests.filter((q) => !q.done).length > 0 && <span>{quests.filter((q) => !q.done).length}</span>}
          </button>
          {questsOpen && (
            <aside className="ew-dailies w3-drawer" aria-label="Daily quests">
              <div className="ew-panel-head"><h2>Daily quests</h2><span>Resets at midnight</span></div>
              <ul>
                {quests.map((qt) => (
                  <li key={qt.id}>
                    <button className={`ew-dq${qt.done ? ' done' : ''}`} onClick={qt.go}>
                      <span className={`ew-dq-ic ${qt.id}`}>{qt.done ? <Icon name="check" size={18} /> : <Icon name={qt.icon} size={18} />}</span>
                      <span className="ew-dq-txt"><b>{qt.label}</b><span className="ew-dq-bar"><i style={{ width: `${qt.done ? 100 : qt.pct}%` }} /></span></span>
                      <span className="ew-dq-side"><span className="ew-chip xp small">{qt.reward}</span><small>{qt.done ? 'Done' : qt.progress}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="ew-statline">
                <div><small>Solved</small><b>{solvedCount}</b></div>
                <div><small>ELO</small><b>{userData?.elo || 1000}</b></div>
                <div><small>Rank</small><b>{userData?.rank ? `#${userData.rank}` : 'New'}</b></div>
              </div>
            </aside>
          )}
        </div>

        {/* Main quest, docked bottom left */}
        {current && (
          <article className={`w3-quest${questMin ? ' min' : ''}${current.isBoss ? ' boss' : ''}`} data-tour="quest3d" style={{ '--c': current.color }}>
            <button className="w3-quest-min" onClick={() => setQuestMin((m) => !m)} aria-label={questMin ? 'Expand main quest' : 'Collapse main quest'}>{questMin ? '▴' : '▾'}</button>
            <div className="ew-quest-ribbon"><Icon name={current.isBoss ? 'skull' : 'scroll'} size={13} />{current.isBoss ? 'Boss fight' : isNew ? 'First mission' : 'Main quest'}</div>
            <div className="w3-quest-row">
              <div className="w3-emblem" aria-hidden="true">{current.badge || '★'}</div>
              <div className="w3-quest-info">
                <small>{current.company} · Chapter {current.id}</small>
                <b>{current.title}</b>
                <div className="ew-pips">
                  {Array.from({ length: pips }, (_, i) => <i key={i} className={i < pipsOn ? 'on' : ''} />)}
                  <span>{current.solved}/{current.total}</span>
                </div>
              </div>
            </div>
            <div className="w3-quest-foot">
              <span className="ew-chip xp"><Icon name="star" size={13} />+{left * XP_PER_PROBLEM} XP</span>
              <button className="ew-play sm" onClick={play}><Icon name="play" size={16} />{isNew ? 'Start' : 'Play'}</button>
            </div>
          </article>
        )}

        {/* Door prompt */}
        {nearId && (
          <div className={`w3-prompt${nearLocked ? ' locked' : ''}`} role="status" style={{ '--g': nearId === 'odyssey' ? (current?.color || '#39d98a') : GROUP_HEX[nearGroup?.id] }}>
            <div className="w3-prompt-ic">{nearId === 'odyssey' ? '⭐' : nearLocked ? <Icon name="lock" size={22} /> : SCENE_LOOK[nearId][0]}</div>
            <div className="w3-prompt-txt">
              <small>{nearId === 'odyssey' ? 'Main quest' : nearGroup ? GROUP_NAME[nearGroup.id] : ''}</small>
              <b>{nearId === 'odyssey' ? current?.title || 'Odyssey Gate' : nearPlace?.label}</b>
              <span>{nearId === 'odyssey' ? `Chapter ${current?.id} · ${current?.company}` : nearLocked ? `Locked. Solve ${UNLOCK_AT - solvedCount} more problem${UNLOCK_AT - solvedCount === 1 ? '' : 's'} to open.` : nearPlace?.desc}</span>
            </div>
            <button className="w3-enter" onClick={() => enterPlace(nearId)} disabled={nearLocked}>
              {nearLocked ? 'Locked' : <>Enter <kbd>↵</kbd></>}
            </button>
          </div>
        )}

        {/* Controls hint */}
        <div className="w3-hint" aria-hidden="true">
          <span><kbd>Click</kbd> walk</span><span><kbd>Drag</kbd> look</span><span className="w3-hint-k"><kbd>WASD</kbd> move</span><span className="w3-hint-k"><kbd>Scroll</kbd> zoom</span>
        </div>
        <button className="w3-listbtn" onClick={openPicker}><Icon name="list" size={16} /> Layout</button>

        {picker}
        {toast && <div className="ew-toast" role="status"><Icon name="lock" size={16} />{toast}</div>}
        {tourStep >= 0 && <Tour steps={tourSteps} step={tourStep} onNext={nextTour} onSkip={endTour} />}
        {confirmLogout && <LogoutDialog onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout && onLogout(); }} />}
      </div>
    );
  }

  return (
    <div className="ew">
      <div className="ew-bg" aria-hidden="true" />
      <div className="ew-veil" aria-hidden="true" />

      {/* ── HUD ── */}
      <header className="ew-bar">
        <div className="ew-bar-in">
          <Portrait uid={uid} userData={userData} initial={(name[0] || 'D').toUpperCase()} level={level} />
          <div className="ew-player">
            <div className="ew-player-row">
              <b>{firstName}</b>
              <span className="ew-rank-title">{levelName}</span>
            </div>
            <div className="ew-xp" role="meter" aria-valuemin={0} aria-valuemax={xpTarget} aria-valuenow={xp}
              aria-label={`Level ${level}, ${xp} of ${xpTarget} XP`}>
              <i style={{ width: `${xpPct}%` }} />
              <span>{xp} / {xpTarget} XP</span>
            </div>
          </div>

          <div className="ew-bar-right">
            <div className={`ew-res flame${streak > 0 ? ' on' : ''}`} title={`${streak} day streak`}>
              <Icon name="flame" size={17} /><b>{streak}</b>
            </div>
            <div className="ew-res coin" title={`${credits} credits`}>
              <Icon name="coin" size={17} /><b>{credits}</b>
            </div>
            <NotificationBell user={user} variant="terminal" />
            <div className="ew-menu-wrap" ref={menuRef}>
              <button className="ew-menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="Account menu">
                <span /><span /><span />
              </button>
              {menuOpen && (
                <div className="ew-menu" role="menu">
                  <div className="ew-menu-head"><b>{name}</b><span>Level {level} {levelName}{userData?.rank ? ` · Rank #${userData.rank}` : ''}</span></div>
                  <button role="menuitem" onClick={() => navigate('/profile')}>Profile and avatar</button>
                  <button role="menuitem" onClick={() => navigate('/skills')}>Skills profile</button>
                  <button role="menuitem" onClick={openPicker}>Change layout</button>
                  {isRecruiter && <button role="menuitem" onClick={() => navigate('/company')}>HR Portal</button>}
                  <button role="menuitem" className="danger" onClick={() => { setMenuOpen(false); setConfirmLogout(true); }}>
                    <Icon name="logout" size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="ew-main">
        {/* ── 1. Main quest + daily quests ── */}
        <section className="ew-top">
          <article className={`ew-quest${current?.isBoss ? ' boss' : ''}`} data-tour="continue" style={{ '--c': current?.color || 'var(--accent)' }} aria-labelledby="ew-quest-title">
            {!odyssey ? (
              <div className="ew-skel" aria-label="Loading your next mission">
                <i style={{ width: '30%' }} /><i style={{ width: '70%', height: 34 }} /><i style={{ width: '55%' }} /><i style={{ width: 200, height: 56 }} />
              </div>
            ) : (
              <>
                <div className="ew-quest-ribbon">
                  <Icon name={current.isBoss ? 'skull' : 'scroll'} size={14} />
                  {current.isBoss ? 'Boss fight' : isNew ? 'Your first mission' : 'Main quest'}
                </div>
                <div className="ew-quest-body">
                  <div className="ew-quest-emblem" aria-hidden="true">
                    <span>{current.badge || '★'}</span>
                    <small>CH {current.id}</small>
                  </div>
                  <div className="ew-quest-info">
                    <div className="ew-quest-where">{current.company} · District {curDistrict?.id}: {curDistrict?.name}</div>
                    <h1 id="ew-quest-title">{current.title}</h1>
                    {isNew && <p className="ew-quest-sub">Real interview problems wrapped in a story. The first ones are easy. Earn XP for every solve.</p>}
                    <div className="ew-pips" aria-label={`${current.solved} of ${current.total} problems solved`}>
                      {Array.from({ length: pips }, (_, i) => <i key={i} className={i < pipsOn ? 'on' : ''} />)}
                      <span>{current.solved}/{current.total}</span>
                    </div>
                  </div>
                </div>
                <div className="ew-quest-foot">
                  <div className="ew-loot" aria-label="Rewards">
                    <span className="ew-loot-label">Loot</span>
                    <span className="ew-chip xp"><Icon name="star" size={13} />+{left * XP_PER_PROBLEM} XP</span>
                    <span className="ew-chip coin"><Icon name="coin" size={13} />+{left * 20}</span>
                    {current.isBoss && <span className="ew-chip boss"><Icon name="skull" size={13} />Boss badge</span>}
                  </div>
                  <div className="ew-quest-actions">
                    <button className="ew-link" onClick={() => navigate('/game')}>World map</button>
                    <button className="ew-play" onClick={play}>
                      <Icon name="play" size={18} />{isNew ? 'Start' : current.solved > 0 ? 'Continue' : 'Play'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </article>

          <aside className="ew-dailies" aria-labelledby="ew-dailies-title">
            <div className="ew-panel-head">
              <h2 id="ew-dailies-title">Daily quests</h2>
              <span>Resets at midnight</span>
            </div>
            <ul>
              {quests.map((qt) => (
                <li key={qt.id}>
                  <button className={`ew-dq${qt.done ? ' done' : ''}`} onClick={qt.go}>
                    <span className={`ew-dq-ic ${qt.id}`}>{qt.done ? <Icon name="check" size={18} /> : <Icon name={qt.icon} size={18} />}</span>
                    <span className="ew-dq-txt">
                      <b>{qt.label}</b>
                      <span className="ew-dq-bar"><i style={{ width: `${qt.done ? 100 : qt.pct}%` }} /></span>
                    </span>
                    <span className="ew-dq-side">
                      <span className="ew-chip xp small">{qt.reward}</span>
                      <small>{qt.done ? 'Done' : qt.progress}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="ew-statline">
              <div><small>Solved</small><b>{solvedCount}</b></div>
              <div><small>ELO</small><b>{userData?.elo || 1000}</b></div>
              <div><small>Rank</small><b>{userData?.rank ? `#${userData.rank}` : 'New'}</b></div>
            </div>
          </aside>
        </section>

        {/* ── 2. The Odyssey trail ── */}
        <section className="ew-section" data-tour="path" aria-labelledby="ew-path-title">
          <div className="ew-section-head">
            <div><h2 id="ew-path-title">The Odyssey trail</h2><p>Seven districts of real company interviews. Clear one to reveal the next.</p></div>
            <button className="ew-link" onClick={() => navigate('/game')}>Open world map</button>
          </div>
          <div className="ew-trail-wrap">
            <ol className="ew-trail" ref={trailRef}>
              {(odyssey?.districts || Array.from({ length: 7 }, (_, i) => ({ id: i + 1, loading: true }))).map((d, i, arr) => {
                if (d.loading) return <li key={d.id} className="ew-stop skel" aria-hidden="true"><span className="ew-node" /></li>;
                const pct = d.total ? Math.round((d.solved / d.total) * 100) : 0;
                const here = curDistrict?.id === d.id;
                const status = d.cleared ? 'Cleared' : here ? 'You are here' : d.open ? 'Open' : 'Locked';
                const nextOpen = arr[i + 1] && arr[i + 1].open;
                return (
                  <li key={d.id} className={`ew-stop${here ? ' here' : ''}${d.open ? '' : ' fog'}${d.cleared ? ' cleared' : ''}${d.open && nextOpen ? ' linked' : ''}`} style={{ '--c': d.color, '--p': `${pct}%` }}>
                    <button onClick={() => openDistrict(d)} aria-label={`District ${d.id}, ${d.name}, ${status}, ${pct}% complete`}>
                      <span className="ew-node">
                        <span className="ew-node-ring" />
                        <span className="ew-node-face">{d.open ? (d.emoji || d.id) : <Icon name="lock" size={20} />}</span>
                        {d.cleared && <span className="ew-node-star"><Icon name="star" size={12} /></span>}
                        {here && <span className="ew-you">YOU</span>}
                      </span>
                      <span className="ew-stop-num">District {d.id}</span>
                      <b>{d.name}</b>
                      <small>{d.open ? `${pct}% · ${d.solved}/${d.total}` : 'Fog of war'}</small>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── 3. Zones ── */}
        <section className="ew-section" data-tour="explore" aria-labelledby="ew-explore-title">
          <div className="ew-section-head">
            <div><h2 id="ew-explore-title">Zones</h2><p>Every place in DSA Life Simulator, grouped by what you want to do.</p></div>
            <label className="ew-search">
              <Icon name="search" size={16} />
              <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onSearchKey}
                placeholder="Find a zone" aria-label="Find a zone" autoComplete="off" spellCheck={false} />
              <kbd className="ew-hide-sm">/</kbd>
            </label>
          </div>

          {!unlocked && !q && (
            <div className="ew-unlock">
              <span className="ew-unlock-ic"><Icon name="lock" size={18} /></span>
              <span className="ew-unlock-txt"><b>Battle zones locked</b><small>Solve {UNLOCK_AT - solvedCount} more problem{UNLOCK_AT - solvedCount === 1 ? '' : 's'} to unlock Arena, Contests and the pressure simulators.</small></span>
              <span className="ew-unlock-pips">{Array.from({ length: UNLOCK_AT }, (_, i) => <i key={i} className={i < solvedCount ? 'on' : ''} />)}</span>
            </div>
          )}

          {visibleGroups.length === 0 && <p className="ew-empty">No zone matches “{search.trim()}”.</p>}
          {visibleGroups.map((g) => (
            <div className="ew-group" key={g.id} style={{ '--g': g.color }}>
              <div className="ew-group-head"><h3>{g.title}</h3><span>{g.hint}</span></div>
              <ul className="ew-grid">
                {g.places.map((p) => {
                  const locked = p.gated && !unlocked;
                  const count = p.badge === 'hub' ? hubCount : 0;
                  return (
                    <li key={p.id}>
                      <button className={`ew-zone${locked ? ' locked' : ''}`} onClick={() => openPlace(p)} aria-disabled={locked}
                        aria-label={`${p.label}. ${p.desc}${locked ? `. Locked until ${UNLOCK_AT} solved problems` : ''}`}>
                        <span className="ew-zone-ic"><Icon name={locked ? 'lock' : p.icon} size={22} /></span>
                        <span className="ew-zone-txt"><b>{p.label}</b><small>{p.desc}</small></span>
                        {locked && <span className="ew-zone-tag lock">Unlocks at {UNLOCK_AT} solves</span>}
                        {!locked && count > 0 && <span className="ew-zone-tag new">{count} new</span>}
                        {!locked && !count && p.reward && <span className="ew-zone-tag">{p.reward}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        {/* ── 4. Live activity ── */}
        <section className="ew-section ew-activity" aria-labelledby="ew-act-title">
          <div className="ew-section-head"><div><h2 id="ew-act-title"><span className="ew-live" aria-hidden="true" /> Live in DSA Life Simulator</h2></div></div>
          <ul>
            {feed.map((ev) => {
              const m = EVENT_META[ev.type] || EVENT_META.default;
              return (
                <li key={ev.id}>
                  <span className="ew-dot" style={{ background: m.color }} aria-hidden="true" />
                  <span><b>{ev.name}</b> <span style={{ color: m.color }}>{m.label}</span></span>
                  <time>{timeAgo(ev.createdAt)}</time>
                </li>
              );
            })}
            {feed.length === 0 && <li className="ew-empty">Quiet right now. Be the first to solve something today.</li>}
          </ul>
        </section>
      </main>

      <button className="w3-listbtn" onClick={openPicker}><Icon name="list" size={14} /> Layout</button>
      {picker}
        {toast && <div className="ew-toast" role="status"><Icon name="lock" size={16} />{toast}</div>}
      {tourStep >= 0 && <Tour steps={tourSteps} step={tourStep} onNext={nextTour} onSkip={endTour} />}
      {confirmLogout && <LogoutDialog onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); onLogout && onLogout(); }} />}
    </div>
  );
}

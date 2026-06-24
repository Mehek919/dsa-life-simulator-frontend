import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import {
  collection, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const EVENT_META = {
  challenge_solved:    { icon: '✅', color: 'text-green-400',  label: 'solved a challenge'   },
  challenge_published: { icon: '📢', color: 'text-blue-400',   label: 'published a challenge' },
  level_up:            { icon: '🚀', color: 'text-yellow-400', label: 'leveled up!'            },
  arena_win:           { icon: '⚔️', color: 'text-red-400',    label: 'won an arena battle'   },
  challenge_attempted: { icon: '🎯', color: 'text-purple-400', label: 'attempted a challenge' },
  problem_solved:      { icon: '💻', color: 'text-cyan-400',   label: 'solved a problem'      },
  default:             { icon: '📌', color: 'text-gray-400',   label: 'did something'         },
};
const ZONES = [
  // Row 1 — Core gameplay
  { id: 'game',          label: '🎮 Odyssey',      path: '/game',             desc: 'FAANG + Enterprise problems', color: 'from-cyan-600 to-blue-600',     glow: '#06b6d4', badge: null              },
  { id: 'arena',         label: '⚔️ Arena',          path: '/arena',            desc: '1v1 PvP battles',             color: 'from-red-600 to-orange-500',    glow: '#ef4444', badge: null              },
  { id: 'contest',       label: '🏆 Contest',        path: '/contest',          desc: 'Weekly competitions',         color: 'from-yellow-500 to-amber-500',  glow: '#f59e0b', badge: null              },
  { id: 'lab',           label: '🧪 Lab',            path: '/lab',              desc: 'Daily challenges',            color: 'from-blue-600 to-cyan-500',     glow: '#22d3ee', badge: 'dailyChallenges'  },
  // Row 2 — Community + Tools
  { id: 'hub',           label: '🏢 Hub',            path: '/hub',              desc: 'Community problems',          color: 'from-purple-600 to-pink-500',   glow: '#a855f7', badge: 'hubChallenges'   },
  { id: 'roadmap',       label: '🗺️ Roadmap',        path: '/roadmap',          desc: 'Learning paths',              color: 'from-emerald-600 to-teal-500',  glow: '#10b981', badge: null              },
  { id: 'mock-interview',label: '🎤 Mock Interview', path: '/mock-interview',   desc: 'AI interviews',               color: 'from-indigo-600 to-violet-500', glow: '#6366f1', badge: null              },
  { id: 'submissions',   label: '📋 Submissions',    path: '/submissions',      desc: 'Your history',                color: 'from-slate-600 to-slate-500',   glow: '#64748b', badge: null              },
  // Row 3 — Career
  { id: 'office',        label: '🏛️ Office',         path: '/office',           desc: 'Stats & schedule',            color: 'from-green-600 to-teal-500',    glow: '#10b981', badge: null              },
  { id: 'story',         label: '📖 Story',          path: '/story',            desc: 'Your AI life story',          color: 'from-yellow-500 to-amber-400',  glow: '#f59e0b', badge: null              },
  { id: 'leaderboard',   label: '📊 Rankings',       path: '/leaderboard',      desc: 'Global leaderboard',          color: 'from-pink-600 to-rose-500',     glow: '#ec4899', badge: null  },
  { id: 'team-sim',    label: '👥 Team Sim',     path: '/team-sim',    desc: 'Collaborate with AI', color: 'from-fuchsia-600 to-violet-500', glow: '#d946ef', badge: null },
  // Row 4 — Enterprise
  { id: 'company',       label: '🏢 HR Portal',      path: '/company',          desc: 'Hire developers',             color: 'from-blue-700 to-indigo-600',   glow: '#3b82f6', badge: null              },
  { id: 'visualizer',    label: '🔬 Visualizer',     path: '/visualizer',       desc: 'Algo animations',             color: 'from-violet-600 to-indigo-500', glow: '#8b5cf6', badge: null              },
];
function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function getMeta(type) { return EVENT_META[type] || EVENT_META.default; }
// ─── Animated Background ──────────────────────────────────────────────────────
function AnimatedBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[
        { color: '#06b6d4', left: '10%',  top: '20%',  size: 300, delay: 0 },
        { color: '#8b5cf6', left: '80%',  top: '60%',  size: 250, delay: 2 },
        { color: '#f59e0b', left: '50%',  top: '80%',  size: 180, delay: 4 },
        { color: '#10b981', left: '20%',  top: '70%',  size: 200, delay: 1 },
        { color: '#ef4444', left: '90%',  top: '10%',  size: 150, delay: 3 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
          style={{
            position: 'absolute', borderRadius: '50%',
            width: orb.size, height: orb.size, background: orb.color,
            left: orb.left, top: orb.top,
            transform: 'translate(-50%,-50%)',
            filter: 'blur(80px)',
          }}
        />
      ))}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
    </div>
  );
}
// ─── Activity Feed Panel ──────────────────────────────────────────────────────
function ActivityFeedPanel({ onClose, user }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds,  setNewIds]  = useState(new Set());
  const [readIds, setReadIds] = useState(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!user?.uid) return;
    const stored = localStorage.getItem(`feed_read_${user.uid}`);
    if (stored) {
      try { setReadIds(new Set(JSON.parse(stored))); } catch {}
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || events.length === 0) return;
    const currentIds     = new Set(events.map(ev => ev.id));
    const updatedReadIds = new Set([...readIds, ...currentIds]);
    if (updatedReadIds.size !== readIds.size) {
      setReadIds(updatedReadIds);
      localStorage.setItem(`feed_read_${user.uid}`, JSON.stringify([...updatedReadIds]));
    }
  }, [events, user?.uid, readIds]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!isFirstLoad.current) {
        const freshIds = new Set(snap.docChanges().filter(c => c.type === 'added').map(c => c.doc.id));
        if (freshIds.size > 0) {
          setNewIds(freshIds);
          setTimeout(() => setNewIds(new Set()), 3000);
        }
      }
      isFirstLoad.current = false;
      setEvents(incoming);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="fixed top-0 right-0 h-full w-full sm:w-80 bg-[#0d0d1f]/95
                 backdrop-blur-xl border-l border-white/10 z-40 flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h3 className="text-base font-bold text-cyan-400">📡 Live Feed</h3>
          <div className="flex items-center gap-1.5 text-xs text-green-400 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            Real-time updates
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-2 text-lg">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        )}
        {!loading && events.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-10">No activity yet 🌱</p>
        )}
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {events.map((ev) => {
              const meta     = getMeta(ev.type);
              const isNew    = newIds.has(ev.id);
              const isUnread = !readIds.has(ev.id);
              return (
                <motion.li
                  key={ev.id} layout
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs
                    ${isNew ? 'border-cyan-500/50 bg-cyan-900/20'
                    : isUnread ? 'border-yellow-500/30 bg-yellow-900/10'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10
                                  flex items-center justify-center overflow-hidden relative">
                    {ev.photoURL
                      ? <img src={ev.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                      : <span>{meta.icon}</span>}
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full
                                       bg-yellow-400 border border-gray-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">
                      <span className={`font-semibold ${isUnread ? 'text-yellow-200' : 'text-white'}`}>
                        {ev.name || 'Someone'}
                      </span>{' '}
                      <span className={meta.color}>{meta.label}</span>
                      {ev.message && <span className="text-gray-400"> — {ev.message}</span>}
                    </p>
                    <p className="text-gray-500 mt-0.5">
                      {timeAgo(ev.createdAt)}
                      {isNew    && <span className="ml-2 text-cyan-400 font-bold animate-pulse">● LIVE</span>}
                      {isUnread && !isNew && <span className="ml-2 text-yellow-400 text-[10px]">● NEW</span>}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>
    </motion.div>
  );
}
// ─── Zone Card ────────────────────────────────────────────────────────────────
function ZoneCard({ zone, badgeCount, onClick }) {
  const [hovered, setHovered] = useState(false);
  const emoji = zone.label.split(' ')[0];

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 group focus:outline-none w-full"
    >
      <div
        className={`relative rounded-2xl bg-gradient-to-br ${zone.color}
                    flex items-center justify-center
                    w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20
                    transition-all duration-300`}
        style={{
          boxShadow: hovered
            ? `0 0 32px ${zone.glow}99, 0 0 64px ${zone.glow}44`
            : `0 0 16px ${zone.glow}44`,
          transform: hovered ? 'translateY(-4px) scale(1.08)' : 'translateY(0) scale(1)',
        }}
      >
        <span className="text-2xl sm:text-3xl select-none leading-none">{emoji}</span>
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500
                           text-white text-[10px] font-bold flex items-center justify-center
                           border-2 border-[#060612] animate-bounce z-10">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
        <motion.span
          animate={{ opacity: hovered ? 0.3 : 0.1 }}
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${zone.color}`}
        />
      </div>
      <div className="text-center px-1 w-full">
        <p className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
          {zone.label}
        </p>
        <p className="text-[10px] text-gray-500 group-hover:text-gray-300
                      transition-colors mt-0.5 leading-tight truncate">
          {zone.desc}
        </p>
      </div>
    </motion.button>
  );
}
// ─── World ────────────────────────────────────────────────────────────────────
export default function World({ user, userData, onLogout }) {
  const navigate = useNavigate();

  const [showFeed,    setShowFeed]    = useState(false);
  const [dailyCount,  setDailyCount]  = useState(0);
  const [hubCount,    setHubCount]    = useState(0);
  const [feedPreview, setFeedPreview] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [readIds,     setReadIds]     = useState(new Set());

  useEffect(() => {
    if (!user?.uid) return;
    const stored = localStorage.getItem(`feed_read_${user.uid}`);
    if (stored) {
      try { setReadIds(new Set(JSON.parse(stored))); } catch {}
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    axios.get(`${API_BASE}/daily-challenges/${user.uid}`)
      .then((r) => {
        const total     = r.data.challenges?.length ?? 0;
        const completed = r.data.completedCount     ?? 0;
        setDailyCount(Math.max(0, total - completed));
      }).catch(() => setDailyCount(0));

    axios.get(`${API_BASE}/challenges`)
      .then((r) => {
        const list = r.data.challenges || [];
        setHubCount(list.filter((c) => !c.attemptedBy?.includes(user.uid)).length);
      }).catch(() => setHubCount(0));
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(4));
    const unsub = onSnapshot(q, (snap) => {
      setFeedPreview(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setFeedLoading(false);
    });
    return () => unsub();
  }, []);

  const badgeMap    = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel     = userData?.level ?? 1;
  const xpCurrent   = userData?.xp    ?? 0;
  const xpTarget    = xpLevel * 500;
  const xpPct       = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const unreadCount = feedPreview.filter(ev => !readIds.has(ev.id)).length;

  // Responsive grid — split zones into rows
  const topZones        = ZONES.slice(0,  4);   // Row 1: Odyssey, Arena, Contest, Lab
  const middleZones     = ZONES.slice(4,  8);   // Row 2: Hub, Roadmap, Mock Interview, Submissions
  const bottomZones     = ZONES.slice(8,  12);
  const enterpriseZones = ZONES.slice(12, 14);// Row 4: HR Portal, Visualizer

  return (
    <div className="relative min-h-screen bg-[#060612] text-white overflow-x-hidden font-mono select-none">

      <AnimatedBackground />

      {/* ── HUD Top Bar ── */}
      <div className="relative z-10 flex items-center justify-between px-3 sm:px-4 pt-3 pb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => navigate('/profile')}
            title="Profile"
            className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500
                       border border-white/20 hover:border-white/40 flex items-center justify-center
                       text-sm sm:text-base shadow-[0_0_12px_rgba(249,115,22,0.3)] transition-all"
          >
            👤
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg font-bold text-cyan-400 tracking-widest">
              DSA LIFE SIMULATOR
            </h1>
            <p className="text-[10px] text-gray-500 truncate">
              {user?.displayName || 'Developer'} · Lv.{xpLevel} {LEVEL_NAMES[xpLevel]} · {userData?.elo ?? 1000} ELO
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="bg-white/10 px-2 py-1 rounded-lg text-xs whitespace-nowrap">
            ⚡ {xpCurrent} XP
          </span>
          <span className="bg-white/10 px-2 py-1 rounded-lg text-xs whitespace-nowrap">
            💰 {userData?.credits ?? 0}
          </span>
          <NotificationBell user={user} />
          <button
            onClick={() => setShowFeed(p => !p)}
            className="relative bg-white/10 hover:bg-cyan-500/20 border border-white/10
                       hover:border-cyan-500/40 px-2 py-1.5 rounded-lg transition-all text-xs"
          >
            📡
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500
                               text-[9px] text-black font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={onLogout}
            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/30
                       text-red-400 px-2 py-1.5 rounded-lg transition-all text-xs"
          >
            🚪
          </button>
        </div>
      </div>

      {/* XP bar */}
      <div className="relative z-10 px-3 sm:px-4 pb-3">
        <div className="flex justify-between text-[9px] text-gray-500 mb-1">
          <span>Level {xpLevel}</span>
          <span>{xpPct}% → Level {xpLevel + 1}</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
          />
        </div>
      </div>

      {/* ── Zone Grid ── */}
      <div className="relative z-10 px-3 sm:px-6 pb-24">

        {/* Center globe */}
        <div className="flex justify-center mb-4">
          <motion.div
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full
                       bg-gradient-to-br from-cyan-900/60 to-purple-900/60
                       border border-cyan-500/30 flex items-center justify-center
                       shadow-[0_0_40px_rgba(34,211,238,0.2)]"
          >
            <span className="text-2xl sm:text-3xl">🌐</span>
          </motion.div>
        </div>

        {/* Row 1 — 4 zones */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {topZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
              onClick={() => navigate(zone.path)}
            />
          ))}
        </div>

        {/* Row 2 — 4 zones */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {middleZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
              onClick={() => navigate(zone.path)}
            />
          ))}
        </div>

        {/* Row 3 — 3 zones */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {bottomZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
              onClick={() => navigate(zone.path)}
            />
          ))}
        </div>

        {/* Row 4 — Enterprise */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {enterpriseZones.map(zone => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              badgeCount={0}
              onClick={() => navigate(zone.path)}
            />
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { icon: '🔥', label: 'Streak',   value: `${userData?.currentStreak || 0}d`  },
            { icon: '✅', label: 'Solved',    value: userData?.problemsSolved   || 0      },
            { icon: '⚔️', label: 'Arena W',   value: userData?.arenaWins        || 0      },
            { icon: '🏆', label: 'ELO',       value: userData?.elo              || 1000   },
            { icon: '💰', label: 'Credits',   value: userData?.credits          || 0      },
            { icon: '📊', label: 'Rank',      value: `#${userData?.rank         || '?'}` },
          ].map(s => (
            <div key={s.label} style={{
              background:   '#0d1117',
              border:       '1px solid #1e2a3a',
              borderRadius: 10,
              padding:      '8px',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: 14 }}>{s.icon}</div>
              <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: '#444', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feed ticker ── */}
      {!showFeed && !feedLoading && feedPreview.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-sm
                        border-t border-white/5 px-4 py-2 flex items-center gap-3 text-xs">
          <span className="text-cyan-400 font-bold flex-shrink-0">📡</span>
          <div className="overflow-hidden flex-1">
            <motion.div
              animate={{ x: [0, -600] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              className="flex gap-8 whitespace-nowrap"
            >
              {[...feedPreview, ...feedPreview].map((ev, i) => {
                const meta = getMeta(ev.type);
                return (
                  <span key={`${ev.id}-${i}`} className="text-gray-400">
                    {meta.icon}{' '}
                    <span className="text-white font-medium">{ev.name || 'Someone'}</span>{' '}
                    <span className={meta.color}>{meta.label}</span>
                  </span>
                );
              })}
            </motion.div>
          </div>
          <button onClick={() => setShowFeed(true)} className="text-cyan-400 flex-shrink-0">→</button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} onClick={() => setShowFeed(false)}
              className="fixed inset-0 bg-black/50 z-30" />
            <ActivityFeedPanel key="panel" onClose={() => setShowFeed(false)} user={user} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import {
  collection, query, orderBy, limit, onSnapshot,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import Particles from '@tsparticles/react';
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
  default:             { icon: '📌', color: 'text-gray-400',   label: 'did something'         },
};

const ZONES = [
  { id: 'lab',     label: '🧪 Lab',     path: '/lab',     desc: 'Daily challenges',   color: 'from-blue-600 to-cyan-500',    glow: '#22d3ee', badge: 'dailyChallenges' },
  { id: 'hub',     label: '🏢 Hub',     path: '/hub',     desc: 'Community',          color: 'from-purple-600 to-pink-500',  glow: '#a855f7', badge: 'hubChallenges'  },
  { id: 'arena',   label: '⚔️ Arena',   path: '/arena',   desc: 'PvP battles',        color: 'from-red-600 to-orange-500',   glow: '#ef4444', badge: null            },
  { id: 'office',  label: '🏛️ Office',  path: '/office',  desc: 'Stats & schedule',   color: 'from-green-600 to-teal-500',   glow: '#10b981', badge: null            },
  { id: 'story',   label: '📖 Story',   path: '/story',   desc: 'Your AI life story', color: 'from-yellow-500 to-amber-400', glow: '#f59e0b', badge: null            },
  { id: 'profile', label: '👤 Profile', path: '/profile', desc: 'Your stats & role',  color: 'from-orange-500 to-pink-500',  glow: '#f97316', badge: null            },
];

// Desktop-only absolute positions
const DESKTOP_POS = {
  lab:     'top-[12%] left-[18%]',
  hub:     'top-[12%] right-[18%]',
  arena:   'bottom-[22%] left-[12%]',
  office:  'bottom-[22%] right-[12%]',
  story:   'bottom-[8%] left-[44%]',
  profile: 'top-[50%] left-[3%] -translate-y-1/2',
};

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

const PARTICLES_OPTIONS = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  particles: {
    number:  { value: 50, density: { enable: true, area: 900 } },
    color:   { value: ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981'] },
    shape:   { type: 'circle' },
    opacity: { value: 0.2, random: true },
    size:    { value: { min: 1, max: 3 }, random: true },
    move:    { enable: true, speed: 0.5, random: true, outModes: { default: 'out' } },
    links:   { enable: true, distance: 120, color: '#ffffff', opacity: 0.06, width: 1 },
  },
  detectRetina: true,
};

// ─── ActivityFeedPanel ────────────────────────────────────────────────────────
function ActivityFeedPanel({ onClose }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds,  setNewIds]  = useState(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      const incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (!isFirstLoad.current) {
        const freshIds = new Set(
          snap.docChanges().filter((c) => c.type === 'added').map((c) => c.doc.id)
        );
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
              const meta  = getMeta(ev.type);
              const isNew = newIds.has(ev.id);
              return (
                <motion.li
                  key={ev.id} layout
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs
                    ${isNew
                      ? 'border-cyan-500/50 bg-cyan-900/20'
                      : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white/10
                                  flex items-center justify-center overflow-hidden">
                    {ev.photoURL
                      ? <img src={ev.photoURL} alt="" className="w-full h-full object-cover rounded-full" />
                      : <span>{meta.icon}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">
                      <span className="font-semibold text-white">{ev.name || 'Someone'}</span>{' '}
                      <span className={meta.color}>{meta.label}</span>
                      {ev.message && <span className="text-gray-400"> — {ev.message}</span>}
                    </p>
                    <p className="text-gray-500 mt-0.5">
                      {timeAgo(ev.createdAt)}
                      {isNew && <span className="ml-2 text-cyan-400 font-bold animate-pulse">● LIVE</span>}
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

// ─── ZoneOrb ─────────────────────────────────────────────────────────────────
function ZoneOrb({ zone, badgeCount, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className="flex flex-col items-center gap-2 group focus:outline-none"
    >
      <div
        className={`relative rounded-full bg-gradient-to-br ${zone.color}
                    flex items-center justify-center
                    w-16 h-16 sm:w-20 sm:h-20
                    transition-all duration-300 group-hover:scale-105`}
        style={{ boxShadow: `0 0 28px ${zone.glow}66` }}
      >
        <span className="text-2xl sm:text-3xl select-none leading-none">
          {zone.label.split(' ')[0]}
        </span>

        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500
                           text-white text-[10px] font-bold flex items-center justify-center
                           border-2 border-[#060612] animate-bounce z-10">
            {badgeCount}
          </span>
        )}
        <span
          className={`absolute inset-0 rounded-full bg-gradient-to-br ${zone.color}
                      opacity-20 animate-ping`}
        />
      </div>

      <div className="text-center px-1">
        <p className="text-xs sm:text-sm font-bold text-white leading-tight">
          {zone.label}
        </p>
        <p className="text-[10px] text-gray-400 group-hover:text-gray-200
                      transition-colors mt-0.5 leading-tight">
          {zone.desc}
        </p>
      </div>
    </motion.button>
  );
}

// ─── World ────────────────────────────────────────────────────────────────────
export default function World({ user, userData, handleLogout }) {  // 👈 added handleLogout
  const navigate = useNavigate();

  const [showFeed,    setShowFeed]    = useState(false);
  const [dailyCount,  setDailyCount]  = useState(0);
  const [hubCount,    setHubCount]    = useState(0);
  const [feedPreview, setFeedPreview] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const particlesInit = async () => {};

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

  const badgeMap = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel   = userData?.level ?? 1;
  const xpCurrent = userData?.xp    ?? 0;
  const xpTarget  = xpLevel * 500;
  const xpPct     = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));

  return (
    <div className="relative min-h-screen bg-[#060612] text-white overflow-x-hidden font-mono select-none">

      <Particles id="world-particles" init={particlesInit}
        options={PARTICLES_OPTIONS} className="absolute inset-0 pointer-events-none" />

      {/* ── HUD Top Bar ── */}
      <div className="relative z-10 flex items-center justify-between
                      px-4 pt-4 pb-2 gap-2 flex-wrap">
        {/* Left */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-xl font-bold text-cyan-400 tracking-widest">
            DSA WORLD
          </h1>
          <p className="text-[10px] text-gray-400 truncate">
            {user?.displayName || 'Developer'} · Lv.{xpLevel} {LEVEL_NAMES[xpLevel]}
          </p>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="bg-white/10 px-2 py-1 rounded-lg text-xs whitespace-nowrap">
            💰 {userData?.credits ?? 0}
          </span>
          <span className="hidden sm:inline bg-white/10 px-2 py-1 rounded-lg text-xs">
            🏆 {userData?.elo ?? 1000}
          </span>
          <NotificationBell user={user} />
          <button
            onClick={() => setShowFeed((p) => !p)}
            className="relative bg-white/10 hover:bg-cyan-500/20 border border-white/10
                       hover:border-cyan-500/40 px-2.5 py-1.5 rounded-lg transition-all text-xs
                       whitespace-nowrap"
          >
            📡 Feed
            {feedPreview.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-500
                               text-[9px] text-black font-bold flex items-center justify-center">
                {feedPreview.length}
              </span>
            )}
          </button>

          {/* 👇 LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/25 border border-red-500/30
                       hover:border-red-500/60 text-red-400 hover:text-red-300
                       px-2.5 py-1.5 rounded-lg transition-all text-xs whitespace-nowrap"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* XP bar */}
      <div className="relative z-10 px-4 pb-2">
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>⚡ XP {xpCurrent}</span><span>{xpPct}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ZONE MAP
          ══════════════════════════════════════════════ */}

      {/* ── MOBILE layout ── */}
      <div className="md:hidden relative z-10 flex flex-col items-center py-6 px-4 gap-5">

        {/* Globe */}
        <motion.div
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-900/60 to-purple-900/60
                     border border-cyan-500/30 flex items-center justify-center
                     shadow-[0_0_40px_rgba(34,211,238,0.2)]"
        >
          <span className="text-2xl">🌐</span>
        </motion.div>
        <p className="text-[9px] text-gray-500 tracking-widest uppercase -mt-3">World Map</p>

        {/* Top row: Lab · Hub · Profile */}
        <div className="flex justify-center gap-8 w-full">
          {['lab', 'hub', 'profile'].map((id) => {
            const zone = ZONES.find((z) => z.id === id);
            return (
              <ZoneOrb key={id} zone={zone}
                badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
                onClick={() => navigate(zone.path)} />
            );
          })}
        </div>

        {/* Middle row: Arena · Office */}
        <div className="flex justify-center gap-10 w-full">
          {['arena', 'office'].map((id) => {
            const zone = ZONES.find((z) => z.id === id);
            return (
              <ZoneOrb key={id} zone={zone} badgeCount={0}
                onClick={() => navigate(zone.path)} />
            );
          })}
        </div>

        {/* Bottom: Story */}
        <div className="flex justify-center w-full">
          {['story'].map((id) => {
            const zone = ZONES.find((z) => z.id === id);
            return (
              <ZoneOrb key={id} zone={zone} badgeCount={0}
                onClick={() => navigate(zone.path)} />
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP layout ── */}
      <div className="hidden md:block relative z-10 w-full"
           style={{ height: 'calc(100vh - 110px)' }}>
        {ZONES.map((zone) => (
          <motion.button
            key={zone.id}
            onClick={() => navigate(zone.path)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`absolute ${DESKTOP_POS[zone.id]}
                        flex flex-col items-center gap-2 group focus:outline-none`}
          >
            <div
              className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${zone.color}
                          flex items-center justify-center transition-all duration-300
                          group-hover:scale-110`}
              style={{ boxShadow: `0 0 30px ${zone.glow}66` }}
            >
              <span className="text-3xl select-none">{zone.label.split(' ')[0]}</span>
              {zone.badge && (badgeMap[zone.badge] ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500
                                 text-white text-[10px] font-bold flex items-center justify-center
                                 border-2 border-[#060612] animate-bounce z-10">
                  {badgeMap[zone.badge]}
                </span>
              )}
              <span className={`absolute inset-0 rounded-full bg-gradient-to-br ${zone.color}
                                opacity-20 animate-ping`} />
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-white drop-shadow">{zone.label}</p>
              <p className="text-[10px] text-gray-400 group-hover:text-gray-200">{zone.desc}</p>
            </div>
          </motion.button>
        ))}

        {/* Centre globe */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        text-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-900/50 to-purple-900/50
                       border border-cyan-500/20 flex items-center justify-center
                       shadow-[0_0_60px_rgba(34,211,238,0.15)]"
          >
            <span className="text-4xl">🌐</span>
          </motion.div>
          <p className="text-xs text-gray-500 mt-2 tracking-widest uppercase">World Map</p>
        </div>
      </div>

      {/* ── Feed ticker ── */}
      {!showFeed && !feedLoading && feedPreview.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/70 backdrop-blur-sm
                        border-t border-white/5 px-4 py-2 flex items-center gap-3 text-xs">
          <span className="text-cyan-400 font-bold flex-shrink-0">📡</span>
          <div className="overflow-hidden flex-1">
            <motion.div
              animate={{ x: [0, -500] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
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
          <button onClick={() => setShowFeed(true)}
            className="text-cyan-400 hover:text-cyan-300 flex-shrink-0">→</button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              exit={{ opacity: 0 }} onClick={() => setShowFeed(false)}
              className="fixed inset-0 bg-black/50 z-30" />
            <ActivityFeedPanel key="panel" onClose={() => setShowFeed(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}




import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

const EVENT_META = {
  challenge_solved:    { icon: '✅', color: '#34d399', label: 'solved a challenge'   },
  challenge_published: { icon: '📢', color: '#60a5fa', label: 'published a challenge' },
  level_up:            { icon: '🚀', color: '#fbbf24', label: 'leveled up!'           },
  arena_win:           { icon: '⚔️', color: '#f87171', label: 'won an arena battle'  },
  challenge_attempted: { icon: '🎯', color: '#c084fc', label: 'attempted a challenge' },
  problem_solved:      { icon: '💻', color: '#22d3ee', label: 'solved a problem'     },
  default:             { icon: '📌', color: '#9ca3af', label: 'did something'        },
};

// ─── District configuration ───────────────────────────────────────────────────
const DISTRICTS = [
  {
    id: 'district-1',
    label: 'DISTRICT 01',
    sublabel: 'Core Gameplay',
    color: '#06b6d4',
    zones: [
      { id: 'game',          label: 'Odyssey',        emoji: '🎮', path: '/game',           desc: 'FAANG + Enterprise',  color: 'from-cyan-600 to-blue-700',     glow: '#06b6d4', badge: null              },
      { id: 'arena',         label: 'Arena',          emoji: '⚔️', path: '/arena',          desc: '1v1 PvP battles',     color: 'from-red-600 to-rose-700',      glow: '#ef4444', badge: null              },
      { id: 'contest',       label: 'Contest',        emoji: '🏆', path: '/contest',        desc: 'Weekly competitions', color: 'from-yellow-500 to-amber-600',  glow: '#f59e0b', badge: null              },
      { id: 'lab',           label: 'Lab',            emoji: '🧪', path: '/lab',            desc: 'Daily challenges',    color: 'from-blue-600 to-cyan-600',     glow: '#22d3ee', badge: 'dailyChallenges'  },
    ],
  },
  {
    id: 'district-2',
    label: 'DISTRICT 02',
    sublabel: 'Community & Tools',
    color: '#a855f7',
    zones: [
      { id: 'hub',           label: 'Hub',            emoji: '🏢', path: '/hub',            desc: 'Community problems',  color: 'from-purple-600 to-pink-600',   glow: '#a855f7', badge: 'hubChallenges'   },
      { id: 'roadmap',       label: 'Roadmap',        emoji: '🗺️', path: '/roadmap',        desc: 'Learning paths',      color: 'from-emerald-600 to-teal-600',  glow: '#10b981', badge: null              },
      { id: 'mock-interview',label: 'Mock Interview', emoji: '🎤', path: '/mock-interview', desc: 'AI interviews',        color: 'from-indigo-600 to-violet-600', glow: '#6366f1', badge: null              },
      { id: 'submissions',   label: 'Submissions',    emoji: '📋', path: '/submissions',    desc: 'Your history',        color: 'from-slate-600 to-slate-700',   glow: '#64748b', badge: null              },
    ],
  },
  {
    id: 'district-3',
    label: 'DISTRICT 03',
    sublabel: 'Career Zone',
    color: '#10b981',
    zones: [
      { id: 'office',        label: 'Office',         emoji: '🏛️', path: '/office',         desc: 'Stats & schedule',    color: 'from-green-600 to-teal-600',    glow: '#10b981', badge: null },
      { id: 'story',         label: 'Story',          emoji: '📖', path: '/story',           desc: 'Your AI life story',  color: 'from-yellow-500 to-amber-500',  glow: '#f59e0b', badge: null },
      { id: 'leaderboard',   label: 'Rankings',       emoji: '📊', path: '/leaderboard',    desc: 'Global leaderboard',  color: 'from-pink-600 to-rose-600',     glow: '#ec4899', badge: null },
      { id: 'team-sim',      label: 'Team Sim',       emoji: '👥', path: '/team-sim',       desc: 'Collaborate with AI', color: 'from-fuchsia-600 to-violet-600',glow: '#d946ef', badge: null },
    ],
  },
  {
    id: 'district-4',
    label: 'DISTRICT 04',
    sublabel: 'Enterprise',
    color: '#3b82f6',
    zones: [
      { id: 'company',     label: 'HR Portal',    emoji: '🏢', path: '/company',      desc: 'Hire developers',          color: 'from-blue-700 to-indigo-700',   glow: '#3b82f6', badge: null },
      { id: 'visualizer',  label: 'Visualizer',   emoji: '🔬', path: '/visualizer',   desc: 'Algo animations',          color: 'from-violet-600 to-indigo-600', glow: '#8b5cf6', badge: null },
      { id: 'code-review', label: 'Code Review',  emoji: '🔍', path: '/code-review',  desc: 'Find bugs before ship',    color: 'from-red-600 to-rose-600',      glow: '#ff4d4d', badge: null },
      { id: 'incident',    label: 'Incident',     emoji: '🚨', path: '/incident',     desc: 'Production response',      color: 'from-orange-600 to-red-600',    glow: '#f97316', badge: null },
    ],
  },
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
        { color: '#06b6d4', left: '8%',   top: '15%', size: 320, delay: 0 },
        { color: '#8b5cf6', left: '82%',  top: '55%', size: 260, delay: 2 },
        { color: '#f59e0b', left: '48%',  top: '82%', size: 180, delay: 4 },
        { color: '#10b981', left: '18%',  top: '72%', size: 210, delay: 1 },
        { color: '#ef4444', left: '88%',  top: '8%',  size: 160, delay: 3 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.25, 1], opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
          style={{
            position: 'absolute', borderRadius: '50%',
            width: orb.size, height: orb.size, background: orb.color,
            left: orb.left, top: orb.top,
            transform: 'translate(-50%,-50%)',
            filter: 'blur(90px)',
          }}
        />
      ))}
      {/* Dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      }} />
    </div>
  );
}

// ─── District Divider ─────────────────────────────────────────────────────────
function DistrictHeader({ label, sublabel, color }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex-shrink-0">
        <p style={{ color, fontSize: 9, fontWeight: 800, letterSpacing: '0.15em', opacity: 0.9 }}>
          {label}
        </p>
        <p style={{ color: '#9ca3af', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginTop: 1 }}>
          {sublabel}
        </p>
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${color}60, transparent)` }} />
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

// ─── Zone Card ────────────────────────────────────────────────────────────────
function ZoneCard({ zone, badgeCount, onClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileTap={{ scale: 0.92 }}
      className="flex flex-col items-center gap-1.5 focus:outline-none w-full"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Icon tile */}
      <div
        className="relative"
        style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
          boxShadow: hovered
            ? `0 0 0 1px ${zone.glow}80, 0 0 24px ${zone.glow}60, 0 8px 32px ${zone.glow}30`
            : `0 0 0 1px ${zone.glow}30, 0 0 12px ${zone.glow}20`,
          transform: hovered ? 'translateY(-5px) scale(1.06)' : 'translateY(0) scale(1)',
          transition: 'all 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        className={`bg-gradient-to-br ${zone.color}`}
      >
        {/* Inner shimmer */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 18,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 60%)',
        }} />

        <span style={{ fontSize: 26, lineHeight: 1, position: 'relative', zIndex: 1 }}>
          {zone.emoji}
        </span>

        {/* Badge */}
        {badgeCount > 0 && (
          <motion.span
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              position: 'absolute', top: -6, right: -6,
              width: 20, height: 20, borderRadius: '50%',
              background: '#ef4444', border: '2px solid #060612',
              color: '#fff', fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10,
            }}
          >
            {badgeCount > 9 ? '9+' : badgeCount}
          </motion.span>
        )}

        {/* Hover ring */}
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              position: 'absolute', inset: -3, borderRadius: 21,
              border: `1px solid ${zone.glow}70`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Label */}
      <div style={{ textAlign: 'center', width: '100%' }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: hovered ? '#ffffff' : '#d1d5db',
          letterSpacing: '0.03em', lineHeight: 1.2,
          transition: 'color 0.2s',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: 2, paddingRight: 2,
        }}>
          {zone.label}
        </p>
        <p style={{
          fontSize: 9, color: hovered ? '#9ca3af' : '#4b5563',
          lineHeight: 1.2, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          paddingLeft: 2, paddingRight: 2,
          transition: 'color 0.2s',
        }}>
          {zone.desc}
        </p>
      </div>
    </motion.button>
  );
}

// ─── HUD Stat ─────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, color = '#9ca3af' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      padding: '7px 6px',
      textAlign: 'center',
      backdropFilter: 'blur(8px)',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 14, lineHeight: 1 }}>{icon}</div>
      <div style={{ color, fontSize: 12, fontWeight: 800, lineHeight: 1.2, marginTop: 3, letterSpacing: '0.02em' }}>
        {value}
      </div>
      <div style={{
        color: '#374151', fontSize: 8, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2,
      }}>
        {label}
      </div>
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
    if (stored) { try { setReadIds(new Set(JSON.parse(stored))); } catch {} }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || events.length === 0) return;
    const currentIds = new Set(events.map(ev => ev.id));
    const updated    = new Set([...readIds, ...currentIds]);
    if (updated.size !== readIds.size) {
      setReadIds(updated);
      localStorage.setItem(`feed_read_${user.uid}`, JSON.stringify([...updated]));
    }
  }, [events, user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, (snap) => {
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
  }, []);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100%',
        width: '100%', maxWidth: 320,
        background: 'rgba(6,6,18,0.97)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 40, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ color: '#22d3ee', fontWeight: 800, fontSize: 14, letterSpacing: '0.05em' }}>📡 LIVE FEED</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#34d399', fontSize: 10, fontWeight: 600 }}>Real-time</span>
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#6b7280', background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 6, borderRadius: 8 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && [...Array(5)].map((_, i) => (
          <div key={i} style={{ height: 56, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
        ))}
        {!loading && events.length === 0 && (
          <p style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', marginTop: 40 }}>No activity yet 🌱</p>
        )}
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const meta     = getMeta(ev.type);
            const isNew    = newIds.has(ev.id);
            const isUnread = !readIds.has(ev.id);
            return (
              <motion.div
                key={ev.id} layout
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.22 }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', borderRadius: 12, fontSize: 11,
                  border: `1px solid ${isNew ? 'rgba(34,211,238,0.3)' : isUnread ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  background: isNew ? 'rgba(34,211,238,0.07)' : isUnread ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.03)',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                  {ev.photoURL
                    ? <img src={ev.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span>{meta.icon}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ lineHeight: 1.4, color: '#d1d5db' }}>
                    <span style={{ fontWeight: 700, color: isUnread ? '#fde68a' : '#ffffff' }}>{ev.name || 'Someone'}</span>{' '}
                    <span style={{ color: meta.color }}>{meta.label}</span>
                  </p>
                  <p style={{ color: '#4b5563', marginTop: 3, fontSize: 10 }}>
                    {timeAgo(ev.createdAt)}
                    {isNew && <span style={{ marginLeft: 8, color: '#22d3ee', fontWeight: 700 }}>● LIVE</span>}
                    {isUnread && !isNew && <span style={{ marginLeft: 8, color: '#fbbf24', fontSize: 9 }}>● NEW</span>}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main World Component ─────────────────────────────────────────────────────
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
    if (stored) { try { setReadIds(new Set(JSON.parse(stored))); } catch {} }
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
    return onSnapshot(q, (snap) => {
      setFeedPreview(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setFeedLoading(false);
    });
  }, []);

  const badgeMap    = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel     = userData?.level    ?? 1;
  const xpCurrent   = userData?.xp       ?? 0;
  const xpTarget    = xpLevel * 500;
  const xpPct       = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const unreadCount = feedPreview.filter(ev => !readIds.has(ev.id)).length;
  const levelName   = LEVEL_NAMES[Math.min(xpLevel, 5)] || 'Legend';

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      background: '#060612', color: '#fff',
      overflowX: 'hidden', fontFamily: "'Space Mono', 'Courier New', monospace",
      userSelect: 'none',
    }}>
      <AnimatedBackground />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Avatar + level ring */}
          <button
            onClick={() => navigate('/profile')}
            style={{
              position: 'relative', flexShrink: 0,
              width: 42, height: 42, borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316, #ec4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid rgba(249,115,22,0.5)',
              boxShadow: '0 0 16px rgba(249,115,22,0.3)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18 }}>👤</span>
            {/* Level badge */}
            <span style={{
              position: 'absolute', bottom: -4, right: -4,
              background: '#1d4ed8', border: '1.5px solid #060612',
              borderRadius: 6, fontSize: 8, fontWeight: 800,
              color: '#93c5fd', padding: '1px 4px', lineHeight: 1.4,
            }}>
              {xpLevel}
            </span>
          </button>

          {/* Title block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontSize: 13, fontWeight: 800, color: '#22d3ee',
              letterSpacing: '0.12em', lineHeight: 1, margin: 0,
            }}>
              DSA LIFE SIMULATOR
            </h1>
            <p style={{ fontSize: 9, color: '#4b5563', marginTop: 3, letterSpacing: '0.06em' }}>
              {user?.displayName?.toUpperCase() || 'DEVELOPER'} · {levelName.toUpperCase()} · {userData?.elo ?? 1000} ELO
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: '#fbbf24',
              whiteSpace: 'nowrap',
            }}>
              ⚡ {xpCurrent}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '4px 8px', fontSize: 10, fontWeight: 700, color: '#a3e635',
              whiteSpace: 'nowrap',
            }}>
              💰 {userData?.credits ?? 0}
            </div>
            <NotificationBell user={user} />
            <button
              onClick={() => setShowFeed(p => !p)}
              style={{
                position: 'relative', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '5px 8px', fontSize: 13, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📡
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#f59e0b', color: '#000', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#f87171', borderRadius: 8, padding: '5px 8px',
                fontSize: 13, cursor: 'pointer',
              }}
            >
              🚪
            </button>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 8, color: '#374151', letterSpacing: '0.1em' }}>LEVEL {xpLevel}</span>
            <span style={{ fontSize: 8, color: '#374151', letterSpacing: '0.08em' }}>{xpPct}% → LV.{xpLevel + 1}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(to right, #06b6d4, #8b5cf6, #ec4899)',
                boxShadow: '0 0 8px rgba(139,92,246,0.6)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Zone Grid ──────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '16px 16px 100px' }}>

        {/* Globe */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(6,182,212,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(6,182,212,0.2), 0 0 60px rgba(139,92,246,0.1)',
            }}
          >
            <span style={{ fontSize: 24 }}>🌐</span>
          </motion.div>
        </div>

        {/* District rows */}
        {DISTRICTS.map((district, di) => (
          <motion.div
            key={district.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: di * 0.08, duration: 0.4 }}
            style={{ marginBottom: di < DISTRICTS.length - 1 ? 20 : 0 }}
          >
            <DistrictHeader
              label={district.label}
              sublabel={district.sublabel}
              color={district.color}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}>
              {district.zones.map(zone => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
                  onClick={() => navigate(zone.path)}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* ── Stats HUD ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ marginTop: 24 }}
        >
          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08))' }} />
            <span style={{ fontSize: 8, color: '#374151', letterSpacing: '0.15em', fontWeight: 700 }}>YOUR STATS</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.08))' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <StatPill icon="🔥" label="Streak"  value={`${userData?.currentStreak || 0}d`} color="#fb923c" />
            <StatPill icon="✅" label="Solved"   value={userData?.problemsSolved   || 0}    color="#34d399" />
            <StatPill icon="⚔️" label="Arena W"  value={userData?.arenaWins        || 0}    color="#f87171" />
            <StatPill icon="🏆" label="ELO"      value={userData?.elo              || 1000} color="#fbbf24" />
            <StatPill icon="💰" label="Credits"  value={userData?.credits          || 0}    color="#a3e635" />
            <StatPill icon="📊" label="Rank"     value={`#${userData?.rank         || '?'}`} color="#c084fc" />
          </div>
        </motion.div>
      </div>

      {/* ── Feed Ticker ────────────────────────────────────────────────────── */}
      {!showFeed && !feedLoading && feedPreview.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 60, left: 0, right: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ color: '#22d3ee', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>📡</span>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <motion.div
              animate={{ x: [0, -700] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex', gap: 40, whiteSpace: 'nowrap', fontSize: 11 }}
            >
              {[...feedPreview, ...feedPreview].map((ev, i) => {
                const meta = getMeta(ev.type);
                return (
                  <span key={`${ev.id}-${i}`} style={{ color: '#6b7280' }}>
                    {meta.icon}{' '}
                    <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{ev.name || 'Someone'}</span>{' '}
                    <span style={{ color: meta.color }}>{meta.label}</span>
                  </span>
                );
              })}
            </motion.div>
          </div>
          <button
            onClick={() => setShowFeed(true)}
            style={{ color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
          >
            →
          </button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFeed(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }}
            />
            <ActivityFeedPanel key="panel" onClose={() => setShowFeed(false)} user={user} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

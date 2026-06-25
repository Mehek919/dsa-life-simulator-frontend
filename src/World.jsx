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
  default:             { icon: '📌', color: '#9ca3af', label: 'was active'           },
};

const DISTRICTS = [
  {
    id: 'core', label: 'DISTRICT 01', sublabel: 'Core Gameplay',
    accent: '#06b6d4',
    zones: [
      { id: 'game',          label: 'Odyssey',       emoji: '🎮', path: '/game',           desc: 'FAANG + Enterprise',  glow: '#06b6d4', gradA: '#0e7490', gradB: '#1e3a5f', badge: 'dailyChallenges' },
      { id: 'arena',         label: 'Arena',         emoji: '⚔️', path: '/arena',          desc: '1v1 PvP battles',     glow: '#ef4444', gradA: '#991b1b', gradB: '#450a0a', badge: null },
      { id: 'contest',       label: 'Contest',       emoji: '🏆', path: '/contest',        desc: 'Weekly competitions', glow: '#f59e0b', gradA: '#92400e', gradB: '#3d1a00', badge: null },
      { id: 'lab',           label: 'Lab',           emoji: '🧪', path: '/lab',            desc: 'Daily challenges',    glow: '#22d3ee', gradA: '#155e75', gradB: '#0c2a3d', badge: null },
    ],
  },
  {
    id: 'community', label: 'DISTRICT 02', sublabel: 'Community & Tools',
    accent: '#a855f7',
    zones: [
      { id: 'hub',           label: 'Hub',           emoji: '🏢', path: '/hub',            desc: 'Community problems',  glow: '#a855f7', gradA: '#6b21a8', gradB: '#2e1065', badge: 'hubChallenges' },
      { id: 'roadmap',       label: 'Roadmap',       emoji: '🗺️', path: '/roadmap',        desc: 'Learning paths',      glow: '#10b981', gradA: '#065f46', gradB: '#022c22', badge: null },
      { id: 'mock-interview',label: 'Mock Interview',emoji: '🎤', path: '/mock-interview', desc: 'AI interviews',        glow: '#818cf8', gradA: '#3730a3', gradB: '#1e1b4b', badge: null },
      { id: 'submissions',   label: 'Submissions',   emoji: '📋', path: '/submissions',    desc: 'Your history',        glow: '#64748b', gradA: '#334155', gradB: '#0f172a', badge: null },
    ],
  },
  {
    id: 'career', label: 'DISTRICT 03', sublabel: 'Career Zone',
    accent: '#f59e0b',
    zones: [
      { id: 'office',      label: 'Office',      emoji: '🏛️', path: '/office',      desc: 'Stats & schedule',    glow: '#10b981', gradA: '#065f46', gradB: '#022c22', badge: null },
      { id: 'story',       label: 'Story',       emoji: '📖', path: '/story',        desc: 'Your AI life story',  glow: '#f59e0b', gradA: '#92400e', gradB: '#3d1a00', badge: null },
      { id: 'leaderboard', label: 'Rankings',    emoji: '📊', path: '/leaderboard',  desc: 'Global leaderboard',  glow: '#ec4899', gradA: '#9d174d', gradB: '#4a044e', badge: null },
      { id: 'team-sim',    label: 'Team Sim',    emoji: '👥', path: '/team-sim',     desc: 'Collaborate with AI', glow: '#d946ef', gradA: '#86198f', gradB: '#3b0764', badge: null },
    ],
  },
  {
    id: 'enterprise', label: 'DISTRICT 04', sublabel: 'Enterprise',
    accent: '#3b82f6',
    zones: [
      { id: 'company',     label: 'HR Portal',   emoji: '🏢', path: '/company',     desc: 'Hire developers',     glow: '#3b82f6', gradA: '#1e40af', gradB: '#172554', badge: null },
      { id: 'visualizer',  label: 'Visualizer',  emoji: '🔬', path: '/visualizer',  desc: 'Algo animations',     glow: '#8b5cf6', gradA: '#4c1d95', gradB: '#2e1065', badge: null },
      { id: 'code-review', label: 'Code Review', emoji: '🔍', path: '/code-review', desc: 'Find bugs first',     glow: '#f87171', gradA: '#991b1b', gradB: '#450a0a', badge: null },
      { id: 'incident',    label: 'Incident',    emoji: '🚨', path: '/incident',     desc: 'Production response', glow: '#f97316', gradA: '#9a3412', gradB: '#431407', badge: null },
    ],
  },
];

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Background ───────────────────────────────────────────────────────────────
function Background() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Orbs */}
      {[
        { c: '#06b6d4', x: '5%',  y: '10%', s: 280 },
        { c: '#8b5cf6', x: '85%', y: '45%', s: 220 },
        { c: '#f59e0b', x: '50%', y: '80%', s: 160 },
        { c: '#10b981', x: '15%', y: '70%', s: 190 },
        { c: '#ef4444', x: '90%', y: '5%',  s: 140 },
      ].map((o, i) => (
        <motion.div key={i}
          animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.09, 0.04] }}
          transition={{ duration: 7 + i, repeat: Infinity, delay: i * 1.3, ease: 'easeInOut' }}
          style={{
            position: 'absolute', borderRadius: '50%',
            width: o.s, height: o.s, background: o.c,
            left: o.x, top: o.y, transform: 'translate(-50%,-50%)',
            filter: 'blur(70px)',
          }}
        />
      ))}
      {/* Hex grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
        <defs>
          <pattern id="hexgrid" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
            <polygon points="28,2 52,14 52,34 28,46 4,34 4,14"
              fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexgrid)" />
      </svg>
      {/* Scan line */}
      <motion.div
        animate={{ y: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.15), transparent)',
        }}
      />
    </div>
  );
}

// ─── Zone Card (2-column, large) ──────────────────────────────────────────────
function ZoneCard({ zone, badgeCount, onClick, index }) {
  const [pressed, setPressed] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      style={{
        background: `linear-gradient(145deg, ${zone.gradA}cc, ${zone.gradB}ee)`,
        border: `1px solid ${zone.glow}40`,
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        padding: 0,
        position: 'relative',
        boxShadow: pressed
          ? `0 0 0 2px ${zone.glow}60`
          : `0 4px 24px ${zone.glow}20, inset 0 1px 0 rgba(255,255,255,0.08)`,
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Top glow line */}
      <div style={{
        height: 3,
        background: `linear-gradient(to right, ${zone.glow}, ${zone.glow}30, transparent)`,
      }} />

      {/* Card body */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Icon row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${zone.glow}20`,
            border: `1px solid ${zone.glow}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
            boxShadow: `0 0 16px ${zone.glow}30`,
          }}>
            {zone.emoji}
          </div>
          {badgeCount > 0 && (
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              style={{
                background: '#ef4444',
                border: '2px solid rgba(6,6,18,0.8)',
                color: '#fff', borderRadius: 99,
                fontSize: 10, fontWeight: 800,
                padding: '2px 7px', lineHeight: 1.4,
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount}
            </motion.span>
          )}
        </div>

        {/* Name */}
        <p style={{
          fontSize: 14, fontWeight: 800, color: '#ffffff',
          margin: '0 0 4px', letterSpacing: '0.02em', lineHeight: 1.2,
          fontFamily: "'Space Mono', monospace",
        }}>
          {zone.label}
        </p>

        {/* Desc */}
        <p style={{
          fontSize: 11, color: `${zone.glow}cc`,
          margin: 0, lineHeight: 1.4, fontWeight: 500,
        }}>
          {zone.desc}
        </p>

        {/* Bottom arrow */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginTop: 10,
        }}>
          <span style={{
            fontSize: 10, color: `${zone.glow}99`, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Enter →
          </span>
        </div>
      </div>

      {/* Corner shimmer */}
      <div style={{
        position: 'absolute', top: -20, right: -20, width: 80, height: 80,
        background: `radial-gradient(circle, ${zone.glow}18, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none',
      }} />
    </motion.button>
  );
}

// ─── District Section ─────────────────────────────────────────────────────────
function DistrictSection({ district, badgeMap, navigate, startIndex }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        marginBottom: 28,
        padding: '18px 16px',
        borderRadius: 20,
        background: `linear-gradient(135deg, ${district.accent}06, transparent)`,
        border: `1px solid ${district.accent}18`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background district number */}
      <div style={{
        position: 'absolute', right: 12, top: 8,
        fontSize: 72, fontWeight: 900, color: `${district.accent}08`,
        fontFamily: "'Space Mono', monospace",
        lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        letterSpacing: '-4px',
      }}>
        {district.label.split(' ')[1]}
      </div>

      {/* District header */}
      <div style={{ marginBottom: 16, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: district.accent,
            boxShadow: `0 0 8px ${district.accent}`,
          }} />
          <p style={{
            fontSize: 9, fontWeight: 800, color: district.accent,
            letterSpacing: '0.18em', margin: 0,
            fontFamily: "'Space Mono', monospace",
          }}>
            {district.label}
          </p>
        </div>
        <p style={{
          fontSize: 15, fontWeight: 700, color: '#e5e7eb',
          margin: '0 0 0 14px', letterSpacing: '0.01em',
        }}>
          {district.sublabel}
        </p>
      </div>

      {/* 2-column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {district.zones.map((zone, i) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            index={startIndex + i}
            badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
            onClick={() => navigate(zone.path)}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Activity Feed Panel ──────────────────────────────────────────────────────
function ActivityFeedPanel({ onClose, user }) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds,  setNewIds]  = useState(new Set());
  const [readIds, setReadIds] = useState(new Set());
  const isFirst = useRef(true);

  useEffect(() => {
    if (!user?.uid) return;
    const s = localStorage.getItem(`feed_read_${user.uid}`);
    if (s) { try { setReadIds(new Set(JSON.parse(s))); } catch {} }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !events.length) return;
    const all = new Set([...readIds, ...events.map(e => e.id)]);
    if (all.size !== readIds.size) {
      setReadIds(all);
      localStorage.setItem(`feed_read_${user.uid}`, JSON.stringify([...all]));
    }
  }, [events, user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isFirst.current) {
        const fresh = new Set(snap.docChanges().filter(c => c.type === 'added').map(c => c.doc.id));
        if (fresh.size) { setNewIds(fresh); setTimeout(() => setNewIds(new Set()), 3000); }
      }
      isFirst.current = false;
      setEvents(data);
      setLoading(false);
    });
  }, []);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100%',
        width: '100%', maxWidth: 320, zIndex: 50,
        background: 'rgba(4,4,16,0.97)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(6,182,212,0.2)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#22d3ee', letterSpacing: '0.1em', fontFamily: 'Space Mono, monospace' }}>LIVE FEED</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>Real-time updates</span>
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#6b7280', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && [...Array(5)].map((_, i) => <div key={i} style={{ height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />)}
        {!loading && events.length === 0 && <p style={{ color: '#4b5563', textAlign: 'center', marginTop: 40, fontSize: 13 }}>No activity yet 🌱</p>}
        <AnimatePresence>
          {events.map(ev => {
            const meta = EVENT_META[ev.type] || EVENT_META.default;
            const isNew = newIds.has(ev.id);
            const isUnread = !readIds.has(ev.id);
            return (
              <motion.div key={ev.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, fontSize: 12, border: `1px solid ${isNew ? 'rgba(34,211,238,0.3)' : isUnread ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)'}`, background: isNew ? 'rgba(34,211,238,0.06)' : 'rgba(255,255,255,0.03)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {ev.photoURL ? <img src={ev.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, color: '#d1d5db', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{ev.name || 'Developer'}</span>{' '}
                    <span style={{ color: meta.color }}>{meta.label}</span>
                  </p>
                  <p style={{ margin: '3px 0 0', color: '#374151', fontSize: 10 }}>
                    {timeAgo(ev.createdAt)} ago
                    {isNew && <span style={{ marginLeft: 6, color: '#22d3ee', fontWeight: 700 }}>● LIVE</span>}
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
    const s = localStorage.getItem(`feed_read_${user.uid}`);
    if (s) { try { setReadIds(new Set(JSON.parse(s))); } catch {} }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    axios.get(`${API_BASE}/daily-challenges/${user.uid}`)
      .then(r => setDailyCount(Math.max(0, (r.data.challenges?.length ?? 0) - (r.data.completedCount ?? 0))))
      .catch(() => {});
    axios.get(`${API_BASE}/challenges`)
      .then(r => setHubCount((r.data.challenges || []).filter(c => !c.attemptedBy?.includes(user.uid)).length))
      .catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(5));
    return onSnapshot(q, snap => {
      setFeedPreview(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFeedLoading(false);
    });
  }, []);

  const badgeMap    = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel     = userData?.level ?? 1;
  const xpCurrent   = userData?.xp    ?? 0;
  const xpTarget    = xpLevel * 500;
  const xpPct       = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const levelName   = LEVEL_NAMES[Math.min(xpLevel, 5)] || 'Legend';
  const unreadCount = feedPreview.filter(ev => !readIds.has(ev.id)).length;

  let zoneIndex = 0;

  return (
    <div style={{
      position: 'relative', minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 20%, #0a0f1e 0%, #060612 60%, #000008 100%)',
      color: '#fff', overflowX: 'hidden',
      fontFamily: "'Space Mono', 'Courier New', monospace",
      paddingBottom: 80,
    }}>
      <Background />

      {/* ── HERO HEADER ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* Top bar */}
        <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Avatar */}
          <button onClick={() => navigate('/profile')} style={{
            position: 'relative', flexShrink: 0,
            width: 46, height: 46, borderRadius: '50%',
            background: 'linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)',
            border: '2px solid rgba(249,115,22,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(249,115,22,0.4)',
            cursor: 'pointer', padding: 0,
          }}>
            <span style={{ fontSize: 22 }}>👤</span>
            {/* Level ring indicator */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: '#22d3ee',
                borderRightColor: '#8b5cf6',
              }}
            />
            <span style={{
              position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
              background: '#1d4ed8', border: '1.5px solid #060612',
              borderRadius: 6, fontSize: 8, fontWeight: 800, color: '#93c5fd',
              padding: '1px 5px', whiteSpace: 'nowrap', letterSpacing: '0.05em',
            }}>
              LV.{xpLevel}
            </span>
          </button>

          {/* Name + title */}
          <div style={{ flex: 1, minWidth: 0, paddingLeft: 4 }}>
            <h1 style={{
              margin: 0, fontSize: 14, fontWeight: 800,
              color: '#22d3ee', letterSpacing: '0.12em', lineHeight: 1,
            }}>
              DSA LIFE SIMULATOR
            </h1>
            <p style={{
              margin: '4px 0 0', fontSize: 9, color: '#374151',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {(user?.displayName || 'DEVELOPER').toUpperCase()} · {levelName.toUpperCase()} · {userData?.elo ?? 1000} ELO
            </p>
          </div>

          {/* Action icons */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {/* XP chip */}
            <div style={{
              background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 8, padding: '4px 8px',
              fontSize: 11, fontWeight: 800, color: '#fbbf24', whiteSpace: 'nowrap',
            }}>
              ⚡ {xpCurrent}
            </div>
            {/* Credits chip */}
            <div style={{
              background: 'rgba(163,230,53,0.08)', border: '1px solid rgba(163,230,53,0.2)',
              borderRadius: 8, padding: '4px 8px',
              fontSize: 11, fontWeight: 800, color: '#a3e635', whiteSpace: 'nowrap',
            }}>
              💰 {userData?.credits ?? 0}
            </div>
            <NotificationBell user={user} />
            {/* Feed */}
            <button onClick={() => setShowFeed(p => !p)} style={{
              position: 'relative', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
              padding: '6px 8px', fontSize: 14, cursor: 'pointer', color: '#fff',
            }}>
              📡
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5, width: 16, height: 16,
                  borderRadius: '50%', background: '#f59e0b',
                  color: '#000', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Logout */}
            <button onClick={onLogout} style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', borderRadius: 8, padding: '6px 8px',
              fontSize: 14, cursor: 'pointer',
            }}>
              🚪
            </button>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 8, color: '#1f2937', letterSpacing: '0.12em' }}>LEVEL {xpLevel}</span>
            <span style={{ fontSize: 8, color: '#1f2937', letterSpacing: '0.08em' }}>{xpPct}% → LEVEL {xpLevel + 1}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1.6, ease: [0.34, 1.56, 0.64, 1] }}
              style={{
                height: '100%', borderRadius: 99,
                background: 'linear-gradient(to right, #06b6d4, #8b5cf6, #ec4899)',
                boxShadow: '0 0 10px rgba(139,92,246,0.8)',
              }}
            />
            {/* Shine */}
            <motion.div
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 2, repeat: Infinity, delay: 2, ease: 'easeInOut' }}
              style={{
                position: 'absolute', top: 0, bottom: 0, width: '30%',
                background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent)',
              }}
            />
          </div>
        </div>

        {/* Stats HUD strip */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '10px 8px',
          }}>
            {[
              { icon: '🔥', val: `${userData?.currentStreak || 0}d`, col: '#f97316', label: 'STREAK' },
              { icon: '✅', val: userData?.problemsSolved || 0,       col: '#34d399', label: 'SOLVED' },
              { icon: '⚔️', val: userData?.arenaWins || 0,            col: '#f87171', label: 'WINS'   },
              { icon: '🏆', val: userData?.elo || 1000,               col: '#fbbf24', label: 'ELO'    },
              { icon: '💰', val: userData?.credits || 0,              col: '#a3e635', label: 'CREDS'  },
              { icon: '📊', val: `#${userData?.rank || '?'}`,         col: '#c084fc', label: 'RANK'   },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, lineHeight: 1 }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: s.col, lineHeight: 1.3, marginTop: 3 }}>{s.val}</div>
                <div style={{ fontSize: 7, color: '#1f2937', letterSpacing: '0.08em', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Globe ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 8px', position: 'relative', zIndex: 10 }}>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(6,182,212,0.08)',
            border: '1px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(6,182,212,0.25), 0 0 80px rgba(139,92,246,0.1)',
          }}
        >
          <span style={{ fontSize: 26 }}>🌐</span>
        </motion.div>
        {/* Orbit ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', width: 80, height: 80,
            border: '1px dashed rgba(6,182,212,0.2)',
            borderRadius: '50%',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            marginTop: 8,
          }}
        />
      </div>

      {/* ── Districts ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 10, padding: '8px 12px 0' }}>
        {DISTRICTS.map(district => {
          const si = zoneIndex;
          zoneIndex += district.zones.length;
          return (
            <DistrictSection
              key={district.id}
              district={district}
              badgeMap={badgeMap}
              navigate={navigate}
              startIndex={si}
            />
          );
        })}
      </div>

      {/* ── Feed ticker ────────────────────────────────────────────────────── */}
      {!showFeed && !feedLoading && feedPreview.filter(e => e.name && e.name !== 'Unknown').length > 0 && (
        <div style={{
          position: 'fixed', bottom: 60, left: 0, right: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(6,182,212,0.15)',
          borderBottom: '1px solid rgba(0,0,0,0.5)',
          padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 9, color: '#22d3ee', fontWeight: 800, letterSpacing: '0.1em' }}>LIVE</span>
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <motion.div
              animate={{ x: [0, -800] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'flex', gap: 48, whiteSpace: 'nowrap', fontSize: 11 }}
            >
              {[...feedPreview, ...feedPreview]
                .filter(e => e.name && e.name !== 'Unknown')
                .map((ev, i) => {
                  const meta = EVENT_META[ev.type] || EVENT_META.default;
                  return (
                    <span key={`${ev.id}-${i}`}>
                      <span style={{ color: '#9ca3af' }}>{meta.icon} </span>
                      <span style={{ color: '#e5e7eb', fontWeight: 700 }}>{ev.name}</span>
                      <span style={{ color: meta.color }}> {meta.label}</span>
                      <span style={{ color: '#374151' }}> · {timeAgo(ev.createdAt)}</span>
                    </span>
                  );
                })}
            </motion.div>
          </div>
          <button onClick={() => setShowFeed(true)} style={{ color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>→</button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFeed(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 40 }} />
            <ActivityFeedPanel key="feed" onClose={() => setShowFeed(false)} user={user} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

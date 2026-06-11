// src/Profile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence }                  from 'framer-motion';
import { useNavigate }                              from 'react-router-dom';
import axios                                        from 'axios';
import {
  collection, query, where,
  orderBy, limit, getDocs,
  doc, getDoc,
}                                                   from 'firebase/firestore';
import { db }                                       from './firebase';
import API_BASE                                     from './config';

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVEL_NAMES = { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };

const LEVEL_COLORS = {
  Junior: { gradient:'from-green-500 to-emerald-600',  ring:'ring-green-500/30',  bg:'bg-green-500/10',  text:'text-green-400'  },
  Mid:    { gradient:'from-blue-500  to-indigo-600',   ring:'ring-blue-500/30',   bg:'bg-blue-500/10',   text:'text-blue-400'   },
  Senior: { gradient:'from-purple-500 to-violet-600',  ring:'ring-purple-500/30', bg:'bg-purple-500/10', text:'text-purple-400' },
  Lead:   { gradient:'from-orange-500 to-amber-600',   ring:'ring-orange-500/30', bg:'bg-orange-500/10', text:'text-orange-400' },
  Legend: { gradient:'from-red-500   to-rose-600',     ring:'ring-red-500/30',    bg:'bg-red-500/10',    text:'text-red-400'    },
};

const LEVEL_ICONS  = { Junior:'🌱', Mid:'💻', Senior:'🔥', Lead:'👑', Legend:'⚡' };
const XP_PER_LEVEL = 500;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '';
  let date;
  if (typeof ts?.toDate === 'function') date = ts.toDate();
  else if (ts?._seconds  !== undefined) date = new Date(ts._seconds  * 1000);
  else if (ts?.seconds   !== undefined) date = new Date(ts.seconds   * 1000);
  else date = new Date(ts);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
}

function getWeekLabel(weekId) {
  if (!weekId) return 'Unknown Week';
  const match = weekId.match(/(\d{4})-W(\d{2})/);
  if (!match) return weekId;
  return `Week ${parseInt(match[2], 10)}, ${match[1]}`;
}

function xpProgress(xp) {
  const level    = Math.min(5, Math.floor(xp / XP_PER_LEVEL) + 1);
  const base     = (level - 1) * XP_PER_LEVEL;
  const progress = level < 5 ? ((xp - base) / XP_PER_LEVEL) * 100 : 100;
  return { level, progress: Math.min(100, Math.max(0, progress)) };
}

// ─── Reusable card wrapper ─────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/5 border border-white/10 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-lg">{icon}</span>
      <h2 className="text-white font-bold text-base tracking-wide">{title}</h2>
    </div>
  );
}

// ─── Profile Header ────────────────────────────────────────────────────────
function ProfileHeader({ user, userData }) {
  const level     = userData?.level ?? 1;
  const levelName = LEVEL_NAMES[level] || 'Junior';
  const colors    = LEVEL_COLORS[levelName] || LEVEL_COLORS.Junior;
  const icon      = LEVEL_ICONS[levelName]  || '🌱';
  const joinDate  = formatDate(userData?.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y:   0  }}
      className="relative overflow-hidden rounded-2xl border border-white/10"
    >
      {/* Banner gradient */}
      <div className={`h-28 w-full bg-gradient-to-br ${colors.gradient} opacity-30`} />

      {/* Blur overlay */}
      <div className="absolute inset-0 bg-[#060612]/60 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative -mt-14 px-6 pb-6">
        {/* Avatar */}
        <div className={`w-20 h-20 rounded-2xl ring-4 ${colors.ring}
                         overflow-hidden bg-white/10 shadow-2xl`}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar"
                   className="w-full h-full object-cover" />
            : <div className={`w-full h-full bg-gradient-to-br ${colors.gradient}
                               flex items-center justify-center text-3xl`}>
                {icon}
              </div>
          }
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-white text-xl font-black">
              {user?.displayName || 'DSA Coder'}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
            {joinDate && (
              <p className="text-gray-600 text-xs mt-1">📅 Joined {joinDate}</p>
            )}
          </div>

          {/* Level badge */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl
                           bg-gradient-to-r ${colors.gradient}
                           shadow-lg`}>
            <span className="text-xl">{icon}</span>
            <div>
              <p className="text-white font-black text-sm leading-none">
                {levelName}
              </p>
              <p className="text-white/70 text-xs">Level {level}</p>
            </div>
          </div>
        </div>

        {/* XP progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>XP Progress</span>
            <span>{userData?.xp ?? 0} XP</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress(userData?.xp ?? 0).progress}%` }}
              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full`}
            />
          </div>
          {level < 5 && (
            <p className="text-gray-600 text-xs mt-1 text-right">
              {XP_PER_LEVEL - ((userData?.xp ?? 0) % XP_PER_LEVEL)} XP to{' '}
              {LEVEL_NAMES[level + 1]}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stats Grid ────────────────────────────────────────────────────────────
function StatsGrid({ userData }) {
  const stats = [
    {
      icon:  '⭐',
      label: 'Total XP',
      value: (userData?.xp ?? 0).toLocaleString(),
      color: 'text-yellow-400',
      bg:    'bg-yellow-500/10',
    },
    {
      icon:  '💰',
      label: 'Credits',
      value: (userData?.credits ?? 0).toLocaleString(),
      color: 'text-cyan-400',
      bg:    'bg-cyan-500/10',
    },
    {
      icon:  '🏆',
      label: 'ELO Rating',
      value: (userData?.elo ?? 1000).toLocaleString(),
      color: 'text-orange-400',
      bg:    'bg-orange-500/10',
    },
    {
      icon:  '📊',
      label: 'Weekly XP',
      value: (userData?.weeklyXp ?? 0).toLocaleString(),
      color: 'text-purple-400',
      bg:    'bg-purple-500/10',
    },
    {
      icon:  '🧩',
      label: 'Challenges Created',
      value: (userData?.challengesCreated ?? 0).toLocaleString(),
      color: 'text-green-400',
      bg:    'bg-green-500/10',
    },
    {
      icon:  '⭐',
      label: 'Avg Challenge Rating',
      value: userData?.avgChallengeRating
        ? userData.avgChallengeRating.toFixed(1) + ' / 5'
        : '—',
      color: 'text-pink-400',
      bg:    'bg-pink-500/10',
    },
  ];

  return (
    <Card>
      <SectionTitle icon="📈" title="Stats" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1   }}
            transition={{ delay: i * 0.07 }}
            className={`${s.bg} rounded-xl p-3 border border-white/5`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">{s.icon}</span>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
            <p className={`${s.color} font-black text-lg leading-none`}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Life Role Card ────────────────────────────────────────────────────────
function LifeRoleCard({ userData }) {
  const role   = userData?.lifeRole;
  const level  = userData?.level ?? 1;
  const colors = LEVEL_COLORS[LEVEL_NAMES[level]] || LEVEL_COLORS.Junior;

  if (!role) {
    return (
      <Card>
        <SectionTitle icon="🎭" title="Life Role" />
        <div className="text-center py-8">
          <p className="text-4xl mb-3">🎭</p>
          <p className="text-gray-400 text-sm">No life role assigned yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Complete onboarding to discover your developer archetype.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle icon="🎭" title="Life Role" />

      {/* Role header */}
      <div className={`flex items-center gap-4 p-4 rounded-xl
                       bg-gradient-to-r ${colors.gradient} bg-opacity-10
                       border border-white/10 mb-4`}>
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient}
                         flex items-center justify-center text-2xl shadow-lg`}>
          {LEVEL_ICONS[LEVEL_NAMES[level]] || '🌱'}
        </div>
        <div>
          <p className="text-white font-black text-lg leading-none">
            {role.primary}
          </p>
          <p className="text-gray-300 text-xs mt-1 max-w-xs">
            {role.description}
          </p>
        </div>
      </div>

      {/* Traits */}
      {role.traits?.length > 0 && (
        <div className="mb-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
            Traits
          </p>
          <div className="flex flex-wrap gap-2">
            {role.traits.map((t, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1   }}
                transition={{ delay: i * 0.05 }}
                className={`${colors.bg} ${colors.text} border border-white/10
                            text-xs px-3 py-1 rounded-full font-medium`}
              >
                {t}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {role.strengths?.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">
            Strengths
          </p>
          <ul className="space-y-2">
            {role.strengths.map((s, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x:   0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-start gap-2 text-sm text-gray-300"
              >
                <span className={`mt-0.5 ${colors.text}`}>▸</span>
                {s}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {role.assignedAt && (
        <p className="text-gray-600 text-xs mt-4 text-right">
          Assigned {formatDate(role.assignedAt)}
        </p>
      )}
    </Card>
  );
}

// ─── Arena Record ──────────────────────────────────────────────────────────
function ArenaRecord({ userData }) {
  const wins   = userData?.arenaWins   ?? 0;
  const losses = userData?.arenaLosses ?? 0;
  const total  = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;
  const elo    = userData?.elo ?? 1000;

  // ELO tier
  const tier =
    elo >= 1800 ? { label:'Grandmaster', color:'text-red-400',    icon:'💎' } :
    elo >= 1500 ? { label:'Master',      color:'text-purple-400', icon:'👑' } :
    elo >= 1200 ? { label:'Diamond',     color:'text-cyan-400',   icon:'💠' } :
    elo >= 1000 ? { label:'Gold',        color:'text-yellow-400', icon:'🥇' } :
                  { label:'Bronze',      color:'text-orange-400', icon:'🥉' };

  return (
    <Card>
      <SectionTitle icon="⚔️" title="Arena Record" />

      {/* ELO + tier */}
      <div className="flex items-center gap-4 mb-5 p-4 rounded-xl bg-white/5
                      border border-white/10">
        <span className="text-4xl">{tier.icon}</span>
        <div>
          <p className={`${tier.color} font-black text-2xl leading-none`}>
            {elo}
          </p>
          <p className={`${tier.color} text-xs font-semibold mt-0.5`}>
            {tier.label}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-gray-400 text-xs">Total Battles</p>
          <p className="text-white font-bold text-lg">{total}</p>
        </div>
      </div>

      {/* Win / Loss bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-green-400 font-semibold">
            🏆 {wins} Wins
          </span>
          <span className="text-gray-400 font-bold">{winPct}% WR</span>
          <span className="text-red-400 font-semibold">
            {losses} Losses 💀
          </span>
        </div>
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden
                        flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${winPct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400
                       rounded-l-full"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${100 - winPct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-red-500 to-rose-400
                       rounded-r-full"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Wins',    value: wins,    color:'text-green-400' },
          { label:'Losses',  value: losses,  color:'text-red-400'   },
          { label:'Win Rate',value:`${winPct}%`, color:'text-cyan-400' },
        ].map((s) => (
          <div key={s.label}
               className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
            <p className={`${s.color} font-black text-xl`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Life Stories Archive ──────────────────────────────────────────────────
function StoriesSection({ archive, onReadChapter }) {
  return (
    <Card>
      <SectionTitle icon="📖" title="Life Stories" />

      {archive.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-gray-400 text-sm">No stories yet.</p>
          <p className="text-gray-600 text-xs mt-1">
            Stories are generated weekly from your activity.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {archive.map((chapter, i) => {
            const preview = (chapter?.content || chapter?.story || '').slice(0, 100);
            return (
              <motion.div
                key={chapter.weekId || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x:   0  }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => onReadChapter(chapter)}
                className="cursor-pointer flex items-start gap-4 p-4
                           bg-white/5 hover:bg-white/10 border border-white/5
                           hover:border-cyan-500/30 rounded-xl transition-all group"
              >
                {/* Chapter number */}
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20
                                border border-cyan-500/30 flex items-center
                                justify-center text-cyan-400 font-black text-sm
                                flex-shrink-0">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-semibold">
                      {getWeekLabel(chapter.weekId)}
                    </p>
                    <p className="text-gray-600 text-xs flex-shrink-0 ml-2">
                      {formatDate(chapter.generatedAt)}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                    {preview}…
                  </p>
                </div>

                <span className="text-gray-600 group-hover:text-cyan-400
                                 transition-colors text-sm flex-shrink-0 mt-1">
                  →
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Recent Activity ───────────────────────────────────────────────────────
const ACTIVITY_ICONS = {
  challenge_solved:    '✅',
  challenge_attempted: '🎯',
  challenge_published: '📤',
  arena_win:           '🏆',
  arena_loss:          '⚔️',
  level_up:            '🚀',
  daily_completed:     '📅',
  story_generated:     '📖',
};

function ActivityFeed({ activities }) {
  return (
    <Card>
      <SectionTitle icon="📡" title="Recent Activity" />

      {activities.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">🌑</p>
          <p className="text-gray-400 text-sm">No recent activity.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((a, i) => (
            <motion.div
              key={a.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y:  0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 bg-white/5 rounded-xl
                         border border-white/5"
            >
              <span className="text-lg flex-shrink-0 mt-0.5">
                {ACTIVITY_ICONS[a.type] || '📌'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-300 text-sm leading-snug">
                  {a.message}
                </p>
                {a.createdAt && (
                  <p className="text-gray-600 text-xs mt-0.5">
                    {formatDate(a.createdAt)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Chapter Reader Modal ──────────────────────────────────────────────────
function ChapterModal({ chapter, onClose }) {
  const text = chapter?.content || chapter?.story || '';
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center
                 p-4 bg-black/70 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1,    y:  0  }}
        exit={{   opacity: 0, scale: 0.93, y: 20  }}
        transition={{ type:'spring', damping:24, stiffness:280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0d0d1f] border border-white/10
                   rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-white/10">
          <div>
            <p className="text-white font-bold">
              📖 {getWeekLabel(chapter?.weekId)}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {formatDate(chapter?.generatedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20
                       flex items-center justify-center text-gray-400
                       hover:text-white transition-all"
          >✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
            {text}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => {
              navigator.clipboard.writeText(text);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300
                       transition-colors"
          >
            📋 Copy to clipboard
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Profile Component ────────────────────────────────────────────────
export default function Profile({ user, userData }) {
  const navigate = useNavigate();

  const [archive,        setArchive]        = useState([]);
  const [activities,     setActivities]     = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState('overview');

  const uid = user?.uid;

  // ── Fetch archive ────────────────────────────────────────────────────────
  const fetchArchive = useCallback(async () => {
    if (!uid) return;
    try {
      const res = await axios.get(`${API_BASE}/story/${uid}/archive`);
      setArchive(res.data?.archive || []);
    } catch (err) {
      console.error('[Profile] fetchArchive:', err);
    }
  }, [uid]);

  // ── Fetch activity feed ──────────────────────────────────────────────────
  const fetchActivities = useCallback(async () => {
    if (!uid) return;
    try {
      const q = query(
        collection(db, 'activityFeed'),
        where('uid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(20),
      );
      const snap = await getDocs(q);
      setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('[Profile] fetchActivities:', err);
    }
  }, [uid]);

  // ── On mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!uid) return;
    Promise.all([fetchArchive(), fetchActivities()])
      .finally(() => setLoading(false));
  }, [uid, fetchArchive, fetchActivities]);

  const TABS = [
    { id:'overview',  label:'Overview',   icon:'📊' },
    { id:'role',      label:'Life Role',  icon:'🎭' },
    { id:'arena',     label:'Arena',      icon:'⚔️' },
    { id:'stories',   label:'Stories',    icon:'📖' },
    { id:'activity',  label:'Activity',   icon:'📡' },
  ];

  return (
    <div className="min-h-screen bg-[#060612] text-white overflow-x-hidden">

      {/* ── Background glow ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2
                        w-[700px] h-[400px] rounded-full
                        bg-purple-600/8 blur-[130px]" />
      </div>

      {/* ── Nav ── */}
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y:   0  }}
        className="relative z-10 flex items-center justify-between
                   px-6 py-4 border-b border-white/5"
      >
        <motion.button
          whileHover={{ scale:1.04, x:-2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/world')}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← World
        </motion.button>

        <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">
          Profile
        </span>

        {/* placeholder right */}
        <div className="w-16" />
      </motion.nav>

      {loading ? (
        /* ── Loading ── */
        <div className="flex items-center justify-center min-h-[70vh]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration:1.5, repeat:Infinity, ease:'linear' }}
            className="w-10 h-10 rounded-full border-2 border-transparent
                       border-t-cyan-400 border-r-purple-500"
          />
        </div>
      ) : (
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <ProfileHeader user={user} userData={userData} />

          {/* ── Tabs ── */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((t) => (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl
                            text-xs font-semibold whitespace-nowrap transition-all
                            flex-shrink-0
                            ${activeTab === t.id
                              ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400'
                              : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                            }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </motion.button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">

            {activeTab === 'overview' && (
              <motion.div key="overview"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }} className="space-y-5">
                <StatsGrid userData={userData} />
              </motion.div>
            )}

            {activeTab === 'role' && (
              <motion.div key="role"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }}>
                <LifeRoleCard userData={userData} />
              </motion.div>
            )}

            {activeTab === 'arena' && (
              <motion.div key="arena"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }}>
                <ArenaRecord userData={userData} />
              </motion.div>
            )}

            {activeTab === 'stories' && (
              <motion.div key="stories"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }}>
                <StoriesSection
                  archive={archive}
                  onReadChapter={setSelectedChapter}
                />
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div key="activity"
                initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-10 }}>
                <ActivityFeed activities={activities} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}

      {/* ── Chapter modal ── */}
      <AnimatePresence>
        {selectedChapter && (
          <ChapterModal
            chapter={selectedChapter}
            onClose={() => setSelectedChapter(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

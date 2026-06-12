
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import DailyChallenge from './DailyChallenge';

// ── Constants ──────────────────────────────────────────────────────────────────
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const LEVEL_COLORS = {
  1: { color: '#22d3ee', glow: '#22d3ee33', border: '#22d3ee44' },
  2: { color: '#a855f7', glow: '#a855f733', border: '#a855f744' },
  3: { color: '#f59e0b', glow: '#f59e0b33', border: '#f59e0b44' },
  4: { color: '#ef4444', glow: '#ef444433', border: '#ef444444' },
  5: { color: '#00ff88', glow: '#00ff8833', border: '#00ff8844' },
};

const ACTIVITY_ICONS = {
  challenge_completed: '✅',
  arena_win:           '⚔️',
  arena_loss:          '🛡️',
  level_up:            '🎉',
  challenge_created:   '🧪',
  credits_earned:      '💰',
  xp_earned:           '✨',
  default:             '📌',
};

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, glow, border }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   '#0d1117',
        border:       `1px solid ${border || '#1e2a3a'}`,
        borderRadius: '14px',
        padding:      '16px 20px',
        boxShadow:    `0 0 20px ${glow || '#00000000'}`,
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.7,
      }} />
      <div style={{
        color: '#555', fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px',
      }}>
        {icon} {label}
      </div>
      <div style={{ color, fontSize: '26px', fontWeight: 800, lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: '#444', fontSize: '11px', marginTop: '4px' }}>{sub}</div>
      )}
    </motion.div>
  );
}

function XPBar({ xp, level }) {
  const xpForNext = level * 500;
  const pct       = Math.min(100, Math.round((xp / xpForNext) * 100));
  const lc        = LEVEL_COLORS[level] || LEVEL_COLORS[1];

  return (
    <div style={{
      background: '#0d1117', border: `1px solid ${lc.border}`,
      borderRadius: '14px', padding: '16px 20px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: '8px',
      }}>
        <span style={{ color: lc.color, fontSize: '12px', fontWeight: 700 }}>
          Level {level} — {LEVEL_NAMES[level] || 'Legend'}
        </span>
        <span style={{ color: '#555', fontSize: '11px' }}>
          {xp} / {xpForNext} XP
        </span>
      </div>
      <div style={{
        width: '100%', height: '6px', background: '#1e2a3a',
        borderRadius: '4px', overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            height: '100%', borderRadius: '4px',
            background: `linear-gradient(90deg, ${lc.color}88, ${lc.color})`,
            boxShadow:  `0 0 8px ${lc.glow}`,
          }}
        />
      </div>
      <div style={{
        color: '#333', fontSize: '10px', marginTop: '6px', textAlign: 'right',
      }}>
        {xpForNext - xp} XP to next level
      </div>
    </div>
  );
}

function LifeRoleCard({ lifeRole }) {
  if (!lifeRole) return null;
  const primary   = lifeRole?.primary   || lifeRole || 'Explorer';
  const secondary = lifeRole?.secondary || null;
  const trait     = lifeRole?.trait     || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   'linear-gradient(135deg, #0d1117, #130d1f)',
        border:       '1px solid #a855f744',
        borderRadius: '14px',
        padding:      '18px 20px',
        boxShadow:    '0 0 24px #a855f722',
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
      }} />
      <div style={{
        color: '#555', fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
      }}>
        🎭 Life Role
      </div>
      <div style={{ color: '#a855f7', fontSize: '22px', fontWeight: 800 }}>
        {primary}
      </div>
      {secondary && (
        <div style={{ color: '#7c3aed', fontSize: '13px', marginTop: '4px' }}>
          {secondary}
        </div>
      )}
      {trait && (
        <div style={{
          marginTop: '10px', display: 'inline-block',
          background: '#a855f711', border: '1px solid #a855f733',
          borderRadius: '20px', padding: '2px 10px',
          color: '#a855f7', fontSize: '11px',
        }}>
          {trait}
        </div>
      )}
    </motion.div>
  );
}

// ── Daily Schedule ─────────────────────────────────────────────────────────────
function DailySchedule({ completedToday, navigate, onOpenChallenges }) {
  const items = [
    {
      id:      'challenges',
      label:   'Daily Challenges',
      desc:    'Solve 3 AI-generated DSA challenges',
      icon:    '🏢',
      color:   '#00c896',
      done:    completedToday >= 3,
      badge:   `${Math.min(completedToday, 3)}/3`,
      // ✅ uses onOpenChallenges callback instead of route
      onClick: onOpenChallenges,
    },
    {
      id:      'arena',
      label:   'Arena Battle',
      desc:    '1v1 real-time coding battle',
      icon:    '⚔️',
      color:   '#ff6b6b',
      done:    false,
      badge:   'Go',
      onClick: () => navigate('/arena'),
    },
    {
      id:      'hub',
      label:   'Community Hub',
      desc:    'Attempt a challenge from another player',
      icon:    '🏛️',
      color:   '#00ff9f',
      done:    false,
      badge:   'Browse',
      onClick: () => navigate('/hub'),
    },
    {
      id:      'lab',
      label:   'Create a Challenge',
      desc:    'Publish a challenge and earn Credits',
      icon:    '🧪',
      color:   '#a855f7',
      done:    false,
      badge:   'Build',
      onClick: () => navigate('/lab'),
    },
  ];

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid #1e2a3a',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '14px' }}>
          📅 Today's Schedule
        </span>
        <span style={{ color: '#333', fontSize: '11px' }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', month: 'short', day: 'numeric',
          })}
        </span>
      </div>

      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          onClick={item.onClick}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          '14px',
            padding:      '14px 20px',
            borderBottom: i < items.length - 1 ? '1px solid #0f1923' : 'none',
            cursor:       'pointer',               // ✅ always pointer now
            transition:   'background 0.2s',
            background:   item.done ? '#00ff9f08' : 'transparent',
          }}
          whileHover={{ backgroundColor: '#ffffff05' }}
        >
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: item.done ? '#00ff9f15' : `${item.color}15`,
            border:     `1px solid ${item.done ? '#00ff9f33' : item.color + '33'}`,
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            fontSize:   '18px', flexShrink: 0,
          }}>
            {item.done ? '✅' : item.icon}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              color:          item.done ? '#555' : '#e8e8e8',
              fontSize:       '13px',
              fontWeight:     600,
              textDecoration: item.done ? 'line-through' : 'none',
            }}>
              {item.label}
            </div>
            <div style={{ color: '#444', fontSize: '11px', marginTop: '2px' }}>
              {item.desc}
            </div>
          </div>

          <div style={{
            background:   item.done ? '#00ff9f15' : `${item.color}15`,
            border:       `1px solid ${item.done ? '#00ff9f33' : item.color + '33'}`,
            borderRadius: '20px',
            padding:      '3px 10px',
            color:        item.done ? '#00ff9f' : item.color,
            fontSize:     '11px',
            fontWeight:   600,
          }}>
            {item.done ? 'Done' : item.badge}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Activity Feed ──────────────────────────────────────────────────────────────
function ActivityFeedPanel({ activities, loading }) {
  if (loading) {
    return (
      <div style={{
        background: '#0d1117', border: '1px solid #1e2a3a',
        borderRadius: '14px', padding: '20px',
        color: '#333', fontSize: '13px', textAlign: 'center',
      }}>
        Loading activity...
      </div>
    );
  }

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1e2a3a' }}>
        <span style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '14px' }}>
          ⚡ Recent Activity
        </span>
      </div>

      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {activities.length === 0 ? (
          <div style={{
            padding: '24px', color: '#333', fontSize: '13px', textAlign: 'center',
          }}>
            No activity yet. Start solving challenges!
          </div>
        ) : (
          activities.map((act, i) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '12px',
                padding:      '12px 20px',
                borderBottom: i < activities.length - 1 ? '1px solid #0f1923' : 'none',
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px',
                background: '#ffffff08', border: '1px solid #1e2a3a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', flexShrink: 0, marginTop: '1px',
              }}>
                {ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.default}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: '#c8c8c8', fontSize: '12px',
                  lineHeight: '1.4', wordBreak: 'break-word',
                }}>
                  {act.message || act.description || act.type}
                </div>
                {(act.xp || act.credits) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    {act.xp && (
                      <span style={{ color: '#a855f7', fontSize: '10px', fontWeight: 600 }}>
                        +{act.xp} XP
                      </span>
                    )}
                    {act.credits && (
                      <span style={{ color: '#f5c542', fontSize: '10px', fontWeight: 600 }}>
                        +{act.credits} Credits
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{
                color: '#333', fontSize: '10px', flexShrink: 0, marginTop: '2px',
              }}>
                {timeAgo(act.createdAt)}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Weekly Stats Bar ───────────────────────────────────────────────────────────
function WeeklyStatsBar({ weeklyStats, weeklyXp }) {
  const days     = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayXp    = weeklyStats?.dailyXp || {};
  const maxXp    = Math.max(...days.map(d => dayXp[d] || 0), 1);
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a',
      borderRadius: '14px', padding: '18px 20px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginBottom: '14px',
      }}>
        <span style={{ color: '#e8e8e8', fontWeight: 700, fontSize: '14px' }}>
          📈 Weekly XP
        </span>
        <span style={{ color: '#a855f7', fontSize: '13px', fontWeight: 700 }}>
          {weeklyXp} XP this week
        </span>
      </div>

      <div style={{
        display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px',
      }}>
        {days.map((day, i) => {
          const val     = dayXp[day] || 0;
          const pct     = val / maxXp;
          const isToday = i === todayIdx;
          return (
            <div
              key={day}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '4px',
                height: '100%', justifyContent: 'flex-end',
              }}
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct * 44, val > 0 ? 4 : 2)}px` }}
                transition={{ duration: 0.8, delay: i * 0.06, ease: 'easeOut' }}
                style={{
                  width:        '100%',
                  background:   isToday
                    ? 'linear-gradient(180deg, #a855f7, #6d28d9)'
                    : val > 0 ? '#a855f744' : '#1e2a3a',
                  borderRadius: '3px 3px 0 0',
                  boxShadow:    isToday ? '0 0 8px #a855f766' : 'none',
                  minHeight:    '2px',
                }}
              />
              <span style={{
                color:    isToday ? '#a855f7' : '#333',
                fontSize: '9px',
                fontWeight: isToday ? 700 : 400,
              }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily Challenges Modal ─────────────────────────────────────────────────────
function DailyChallengesModal({ user, userData, onClose, onRewardsEarned }) {
  return (
    <AnimatePresence>
      <motion.div
        key="dc-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position:        'fixed',
          inset:           0,
          background:      'rgba(0,0,0,0.75)',
          backdropFilter:  'blur(6px)',
          zIndex:          1000,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '20px',
        }}
      >
        <motion.div
          key="dc-panel"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          // ✅ stop click propagating to backdrop
          onClick={e => e.stopPropagation()}
          style={{
            width:        '100%',
            maxWidth:     '680px',
            maxHeight:    '90vh',
            overflowY:    'auto',
            borderRadius: '18px',
            background:   '#0a0a14',
            border:       '1px solid #1e2a3a',
            boxShadow:    '0 0 60px #00c89622',
          }}
        >
          <DailyChallenge
            user={user}
            userData={userData}
            onClose={onClose}
            onRewardsEarned={onRewardsEarned}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Office Component ──────────────────────────────────────────────────────
export default function Office({ user, userData: propUserData }) {
  const navigate = useNavigate();

  const [stats,          setStats]          = useState(null);
  const [activities,     setActivities]     = useState([]);
  const [loadStats,      setLoadStats]      = useState(true);
  const [loadAct,        setLoadAct]        = useState(true);
  const [error,          setError]          = useState('');
  // ✅ NEW — controls the Daily Challenges modal
  const [showChallenges, setShowChallenges] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoadStats(true);
      const res = await axios.get(`${API_BASE}/office/stats/${user.uid}`);
      if (res.data?.success) setStats(res.data.stats);
    } catch (err) {
      console.error(err);
      setError('Failed to load stats.');
    } finally {
      setLoadStats(false);
    }
  }, [user?.uid]);

  const fetchActivity = useCallback(async () => {
    if (!user?.uid) return;
    try {
      setLoadAct(true);
      const res = await axios.get(`${API_BASE}/office/activity/${user.uid}`, {
        params: { limit: 20 },
      });
      if (res.data?.success) setActivities(res.data.activities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadAct(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchStats();
    fetchActivity();
  }, [fetchStats, fetchActivity]);

  // ── Merge API stats with propUserData as fallback ──
  const s              = stats || {};
  const xp             = s.xp             ?? propUserData?.xp       ?? 0;
  const credits        = s.credits        ?? propUserData?.credits   ?? 0;
  const elo            = s.elo            ?? 1000;
  const level          = s.level          ?? propUserData?.level     ?? 1;
  const weeklyXp       = s.weeklyXp       ?? propUserData?.weeklyXp  ?? 0;
  const completedToday = s.completedToday ?? 0;
  const lifeRole       = s.lifeRole       ?? propUserData?.lifeRole  ?? null;
  const weeklyStats    = s.weeklyStats    ?? {};
  const lc             = LEVEL_COLORS[level] || LEVEL_COLORS[1];
  const firstName      = user?.displayName?.split(' ')[0] || 'Engineer';

  // ── Rewards handler — refresh stats after challenge completion ──
  const handleRewardsEarned = useCallback(({ newXp, newCredits, newLevel }) => {
    setStats(prev => ({
      ...(prev || {}),
      xp:             newXp      ?? prev?.xp,
      credits:        newCredits ?? prev?.credits,
      level:          newLevel   ?? prev?.level,
      completedToday: (prev?.completedToday ?? 0) + 1,
    }));
  }, []);

  return (
    <>
      {/* ── Daily Challenges Modal ── */}
      {showChallenges && (
        <DailyChallengesModal
          user={user}
          userData={propUserData}
          onClose={() => { setShowChallenges(false); fetchStats(); }}
          onRewardsEarned={handleRewardsEarned}
        />
      )}

      <div style={{
        minHeight:  '100vh',
        background: '#0a0a14',
        color:      '#e8e8e8',
        fontFamily: 'Arial, sans-serif',
        overflowY:  'auto',
      }}>
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {[
            { c: '#a855f7', l: '10%', t: '15%', s: 340 },
            { c: '#1a73e8', l: '80%', t: '60%', s: 260 },
            { c: '#00c896', l: '55%', t: '85%', s: 200 },
          ].map((o, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              width: o.s, height: o.s, background: o.c,
              left: o.l, top: o.t, transform: 'translate(-50%,-50%)',
              filter: 'blur(90px)', opacity: 0.06,
            }} />
          ))}
          <div style={{
            position:        'absolute',
            inset:           0,
            backgroundImage:
              'linear-gradient(#ffffff03 1px,transparent 1px),' +
              'linear-gradient(90deg,#ffffff03 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          maxWidth: '1100px', margin: '0 auto', padding: '28px 24px 48px',
        }}>

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              marginBottom:   '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => navigate('/world')}
                style={{
                  background:   '#0d1117',
                  border:       '1px solid #1e2a3a',
                  borderRadius: '10px',
                  color:        '#555',
                  cursor:       'pointer',
                  fontSize:     '13px',
                  padding:      '7px 14px',
                  fontWeight:   600,
                  transition:   'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#22d3ee55';
                  e.currentTarget.style.color       = '#22d3ee';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1e2a3a';
                  e.currentTarget.style.color       = '#555';
                }}
              >
                ← World
              </button>
              <div>
                <h1 style={{
                  margin: 0, fontSize: '24px', fontWeight: 800, color: '#e8e8e8',
                }}>
                  🏢 Office
                </h1>
                <p style={{ margin: 0, color: '#444', fontSize: '12px' }}>
                  Good to see you, {firstName}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background:   lc.glow,
                border:       `1px solid ${lc.border}`,
                borderRadius: '20px',
                padding:      '4px 14px',
                color:        lc.color,
                fontSize:     '12px',
                fontWeight:   700,
              }}>
                {LEVEL_NAMES[level] || 'Legend'} · Lv {level}
              </div>
              <button
                onClick={() => { fetchStats(); fetchActivity(); }}
                style={{
                  background:   '#0d1117',
                  border:       '1px solid #1e2a3a',
                  borderRadius: '10px',
                  color:        '#555',
                  cursor:       'pointer',
                  fontSize:     '13px',
                  padding:      '7px 14px',
                  fontWeight:   600,
                  transition:   'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#a855f755';
                  e.currentTarget.style.color       = '#a855f7';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1e2a3a';
                  e.currentTarget.style.color       = '#555';
                }}
              >
                ↻ Refresh
              </button>
            </div>
          </motion.div>

          {/* ── Error Banner ── */}
          {error && (
            <div style={{
              background:   '#ff000015',
              border:       '1px solid #ff000033',
              borderRadius: '10px',
              padding:      '10px 16px',
              color:        '#ff6b6b',
              fontSize:     '12px',
              marginBottom: '20px',
            }}>
              {error}
            </div>
          )}

          {/* ── Stat Cards Row ── */}
          {loadStats ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '14px', marginBottom: '24px',
            }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{
                  height: '88px', background: '#0d1117',
                  border: '1px solid #1e2a3a', borderRadius: '14px',
                  animation: 'pulse 1.5s infinite',
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '14px', marginBottom: '24px',
            }}>
              <StatCard
                label="XP"        value={xp.toLocaleString()}
                icon="✨"          color="#a855f7"
                glow="#a855f722"   border="#a855f733"
              />
              <StatCard
                label="Credits"   value={credits.toLocaleString()}
                icon="💰"          color="#f5c542"
                glow="#f5c54222"   border="#f5c54233"
              />
              <StatCard
                label="ELO"       value={elo}
                icon="⚔️"          color="#ff6b6b"
                glow="#ff6b6b22"   border="#ff6b6b33"
              />
              <StatCard
                label="Weekly XP" value={weeklyXp}
                icon="📈"          color="#22d3ee"
                glow="#22d3ee22"   border="#22d3ee33"
              />
            </div>
          )}

          {/* ── XP Progress Bar ── */}
          <div style={{ marginBottom: '24px' }}>
            <XPBar xp={xp} level={level} />
          </div>

          {/* ── Two Column Layout ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* ✅ onOpenChallenges wired here */}
              <DailySchedule
                completedToday={completedToday}
                navigate={navigate}
                onOpenChallenges={() => setShowChallenges(true)}
              />
              <LifeRoleCard lifeRole={lifeRole} />
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <WeeklyStatsBar weeklyStats={weeklyStats} weeklyXp={weeklyXp} />
              <ActivityFeedPanel activities={activities} loading={loadAct} />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

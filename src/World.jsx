import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import DailyChallenge from './DailyChallenges';
import ActivityFeed from './ActivityFeed';

// ── Constants ──────────────────────────────────────────────────────────────────
var LEVEL_NAMES = { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };

var LOCATIONS = [
  {
    id: 'home', label: 'Home', emoji: '🏠',
    description: 'Your personal profile, stats and life history.',
    color: '#1a73e8', glow: '#1a73e844',
    route: '/profile', locked: false, isOffice: false,
  },
  {
    id: 'office', label: 'Office', emoji: '🏢',
    description: 'Take on AI-generated daily DSA challenges and earn Credits.',
    color: '#00c896', glow: '#00c89644',
    route: null, locked: false, isOffice: true,
  },
  {
    id: 'arena', label: 'Arena', emoji: '⚔️',
    description: '1v1 Real-Time Battles. Challenge other engineers live.',
    color: '#ff6b6b', glow: '#ff6b6b44',
    route: '/arena', locked: false, isOffice: false,
  },
  {
    id: 'lab', label: 'Lab', emoji: '🧪',
    description: 'Create your own challenges and publish them for Credits.',
    color: '#a855f7', glow: '#a855f744',
    route: '/lab', locked: false, isOffice: false,
  },
  {
    id: 'hub', label: 'Community Hub', emoji: '🏛️',
    description: 'Browse & attempt challenges from other players.',
    color: '#00ff9f', glow: '#00ff9f44',
    route: '/hub', locked: false, isOffice: false,
  },
  {
    id: 'story', label: '📖 Life Story', emoji: '',
    description: 'Read your AI-written weekly chapter and full archive.',
    color: '#8b5cf6', glow: 'rgba(139,92,246,0.4)',
    route: '/story', locked: false, isOffice: false,
  },
];

var ORBS = [
  { color: '#a855f7', left: '10%', top: '20%', size: 400 },
  { color: '#1a73e8', left: '80%', top: '60%', size: 300 },
  { color: '#00c896', left: '50%', top: '80%', size: 220 },
  { color: '#ff4d4d', left: '70%', top: '10%', size: 180 },
];

// ── Animated Background ────────────────────────────────────────────────────────
function AnimatedBackground() {
  var navigate = useNavigate();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 0,
      background: '#0a0a14', overflow: 'hidden', pointerEvents: 'auto',
    }}>
      <button
        onClick={function () {
          console.log('🔥 ARENA TEST CLICKED!');
          navigate('/arena');
        }}
        style={{
          padding: '10px 20px',
          background: 'red',
          color: 'white',
          border: 'none',
          position: 'fixed',
          top: '10px',
          right: '10px',
          zIndex: 9999,
          pointerEvents: 'auto',
        }}
      >
        TEST ARENA
      </button>
      {ORBS.map(function (orb, i) {
        return (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            width: orb.size + 'px', height: orb.size + 'px',
            background: orb.color, left: orb.left, top: orb.top,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(100px)', opacity: 0.08,
            animation: 'orbpulse ' + (5 + i * 1.5) + 's ease-in-out infinite alternate',
          }} />
        );
      })}
      <style>{`
        @keyframes orbpulse {
          from { opacity: 0.05; transform: translate(-50%,-50%) scale(1); }
          to   { opacity: 0.13; transform: translate(-50%,-50%) scale(1.18); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, #1a73e822, transparent)',
        animation: 'scanline 8s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(#ffffff04 1px, transparent 1px),' +
          'linear-gradient(90deg, #ffffff04 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Location Card ──────────────────────────────────────────────────────────────
// ✅ Clean — no rank pill here, no navigate, no userData
function LocationCard(props) {
  var loc       = props.loc;
  var hovered   = props.hovered;
  var onHover   = props.onHover;
  var onClick   = props.onClick;
  if (!loc) return null;
  var isHovered = hovered === loc.id;

  return (
    <div
      onMouseEnter={function () { onHover(loc.id); }}
      onMouseLeave={function () { onHover(null); }}
      onClick={function () { onClick(loc); }}
      style={{
        position:       'relative',
        background:     isHovered
          ? 'linear-gradient(135deg, #0d1117ee, #111827ee)'
          : '#0d1117cc',
        border:         '1px solid ' + (isHovered ? loc.color + '88' : '#1e2a3a'),
        borderRadius:   '16px',
        padding:        '16px 18px',
        cursor:         loc.locked ? 'not-allowed' : 'pointer',
        overflow:       'hidden',
        transition:     'all 0.3s ease',
        boxShadow:      isHovered
          ? '0 0 24px ' + loc.glow + ', 0 8px 24px #00000066'
          : '0 4px 12px #00000044',
        backdropFilter: 'blur(12px)',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',
        transform:      isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
      }}
    >
      {/* Top glow bar */}
      <div style={{
        position:   'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, ' + loc.color + ', transparent)',
        opacity:    isHovered ? 1 : 0.3, transition: 'opacity 0.3s',
      }} />

      {/* Corner dot */}
      <div style={{
        position:     'absolute', top: '12px', right: '12px',
        width:        '7px', height: '7px', borderRadius: '50%',
        background:   loc.color, opacity: isHovered ? 1 : 0.3,
        boxShadow:    isHovered ? ('0 0 8px ' + loc.color) : 'none',
        transition:   'all 0.3s',
      }} />

      <div>
        {/* Icon + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '22px' }}>{loc.emoji}</span>
          <span style={{
            color:      isHovered ? loc.color : '#e8e8e8',
            fontSize:   '15px', fontWeight: 700, transition: 'color 0.3s',
          }}>
            {loc.label}
          </span>
        </div>

        {/* Description */}
        <p style={{ color: '#666', fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
          {loc.description}
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '10px' }}>
        {loc.locked ? (
          <span style={{ color: '#555', fontSize: '11px' }}>🔒 Coming Soon</span>
        ) : (
          <span style={{
            color:      loc.color, fontSize: '11px', fontWeight: 600,
            opacity:    isHovered ? 1 : 0, transition: 'opacity 0.3s',
          }}>
            Enter Location →
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main World Component ───────────────────────────────────────────────────────
export default function World(props) {
  var user            = props.user;
  var initialUserData = props.userData;
  var syncUserDataUp  = props.setUserData;
  var onLogout        = props.onLogout;
  var navigate        = useNavigate();

  var [userData,    setLocalData]   = useState(initialUserData);
  var [showOffice,  setShowOffice]  = useState(false);
  var [loggingOut,  setLoggingOut]  = useState(false);
  var [hoveredId,   setHoveredId]   = useState(null);
  var [lockedToast, setLockedToast] = useState(null);

  var credits   = userData?.credits           || 0;
  var xp        = userData?.xp                || 0;
  var level     = userData?.level             || 1;
  var topic     = userData?.topic             || 'Array';
  var lifeRole  = userData?.lifeRole?.primary || 'Explorer';
  var firstName = user?.displayName?.split(' ')[0] || 'Engineer';
  var levelName = LEVEL_NAMES[level] || 'Junior';
  var xpForNext = level * 500;
  var xpPct     = Math.min(100, Math.round((xp / xpForNext) * 100));

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleLogout() {
    setLoggingOut(true);
    await signOut(auth);
    if (onLogout) onLogout();
    navigate('/');
  }

  function handleLocationClick(loc) {
    if (!loc) return;
    if (loc.locked) {
      setLockedToast('🔒 This location is coming soon!');
      setTimeout(() => setLockedToast(null), 2500);
      return;
    }
    if (loc.isOffice) { setShowOffice(true); return; }
    if (loc.route)    { navigate(loc.route); }
  }

  function handleRewardsEarned(payload) {
    var updated = {
      ...userData,
      credits: payload.newCredits,
      xp:      payload.newXp,
      level:   payload.newLevel,
    };
    setLocalData(updated);
    if (syncUserDataUp) syncUserDataUp(updated);
  }

  var HEADER_H = '72px';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', overflow: 'hidden', fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <AnimatedBackground />

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ══ HEADER ═══════════════════════════════════════════════════════════ */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '0 28px',
          height:         HEADER_H,
          flexShrink:     0,
          borderBottom:   '1px solid #1e2a3a',
          background:     '#0a0a14cc',
          backdropFilter: 'blur(16px)',
        }}>

          {/* Left — avatar + name + badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <img
                src={user?.photoURL || ''}
                alt="avatar"
                referrerPolicy="no-referrer"
                style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  border: '2px solid #1a73e8', objectFit: 'cover',
                }}
              />
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#00ff88', border: '2px solid #0a0a14',
              }} />
            </div>

            <div>
              <div style={{ color: '#555', fontSize: '10px' }}>Welcome back,</div>
              <div style={{ color: '#e8e8e8', fontSize: '16px', fontWeight: 700, lineHeight: 1.2 }}>
                {firstName}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                <span style={{
                  background: '#1a73e822', border: '1px solid #1a73e844',
                  color: '#1a73e8', borderRadius: '20px',
                  padding: '1px 8px', fontSize: '10px', fontWeight: 600,
                }}>
                  {lifeRole}
                </span>
                <span style={{
                  background: '#00c89622', border: '1px solid #00c89644',
                  color: '#00c896', borderRadius: '20px',
                  padding: '1px 8px', fontSize: '10px', fontWeight: 600,
                }}>
                  {topic}
                </span>
              </div>
            </div>
          </div>

          {/* Right — Level + XP + Credits + Rank + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            {/* Level */}
            <div style={{
              background: '#1a1a2e', border: '1px solid #1a73e844',
              borderRadius: '10px', padding: '6px 14px',
              textAlign: 'center', minWidth: '80px',
            }}>
              <div style={{ color: '#1a73e8', fontSize: '9px', fontWeight: 700 }}>
                Level {level}
              </div>
              <div style={{ color: '#e8e8e8', fontSize: '14px', fontWeight: 700 }}>
                {levelName}
              </div>
            </div>

            {/* XP */}
            <div style={{
              background: '#1a1a2e', border: '1px solid #a855f744',
              borderRadius: '10px', padding: '6px 14px', minWidth: '72px',
            }}>
              <div style={{ color: '#a855f7', fontSize: '9px', fontWeight: 700 }}>XP</div>
              <div style={{ color: '#e8e8e8', fontSize: '14px', fontWeight: 700 }}>{xp}</div>
              <div style={{
                width: '100%', height: '3px', background: '#1e2a3a',
                borderRadius: '2px', marginTop: '3px', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: xpPct + '%',
                  background: 'linear-gradient(90deg,#a855f7,#1a73e8)',
                  borderRadius: '2px', transition: 'width 0.6s ease',
                }} />
              </div>
            </div>

            {/* Credits */}
            <div style={{
              background: '#1a1a2e', border: '1px solid #f5c54244',
              borderRadius: '10px', padding: '6px 14px',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ fontSize: '16px' }}>💰</span>
              <div>
                <div style={{ color: '#f5c542', fontSize: '14px', fontWeight: 700 }}>
                  {credits}
                </div>
                <div style={{ color: '#555', fontSize: '9px' }}>Credits</div>
              </div>
            </div>

            {/* ✅ RANK PILL — correctly placed in header, navigates to leaderboard */}
            <div
              onClick={() => navigate('/leaderboard')}
              style={{
                background:    '#1a1a2e',
                border:        '1px solid #f5c54244',
                borderRadius:  '10px',
                padding:       '6px 14px',
                textAlign:     'center',
                minWidth:      '72px',
                cursor:        'pointer',
                transition:    'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#f5c542aa'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#f5c54244'}
            >
              <div style={{ color: '#f5c542', fontSize: '9px', fontWeight: 700 }}>
                🌍 RANK
              </div>
              <div style={{ color: '#e8e8e8', fontSize: '14px', fontWeight: 700 }}>
                {userData?.rank ? `#${userData.rank}` : '—'}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              style={{
                background:   loggingOut ? '#1e2a3a' : '#ff4d4d22',
                border:       '1px solid #ff4d4d44',
                borderRadius: '10px',
                color:        '#ff4d4d',
                cursor:       loggingOut ? 'not-allowed' : 'pointer',
                fontSize:     '12px',
                fontWeight:   600,
                padding:      '7px 14px',
                transition:   'all 0.2s',
              }}
            >
              {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>

        {/* ══ BODY ═════════════════════════════════════════════════════════════ */}
        <div style={{
          flex:          1,
          overflow:      'hidden',
          display:       'flex',
          flexDirection: 'column',
          padding:       '16px 28px 12px',
          gap:           '12px',
        }}>

          {/* Title strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0  }}
            style={{ textAlign: 'center', flexShrink: 0 }}
          >
            <h1 style={{
              color: '#e8e8e8', fontSize: '26px',
              fontWeight: 800, margin: 0, letterSpacing: '-0.5px',
            }}>
              The Simulator World
            </h1>
            <p style={{ color: '#555', fontSize: '13px', margin: '4px 0 0' }}>
              Choose your destination. Every location is a new opportunity.
            </p>
          </motion.div>

          {/* XP Progress Bar */}
          <div style={{
            flexShrink: 0, maxWidth: '360px', margin: '0 auto', width: '100%',
            background: '#1a1a2e', borderRadius: '10px',
            padding: '8px 16px', border: '1px solid #1e2a3a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#666', fontSize: '10px' }}>{levelName} Progress</span>
              <span style={{ color: '#a855f7', fontSize: '10px', fontWeight: 700 }}>
                {xp} / {xpForNext} XP
              </span>
            </div>
            <div style={{
              width: '100%', height: '5px', background: '#1e2a3a',
              borderRadius: '3px', overflow: 'hidden',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: xpPct + '%' }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg,#a855f7,#1a73e8)',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>

          {/* Grid + Feed */}
          <div style={{
            flex: 1, overflow: 'hidden',
            display: 'flex', gap: '16px',
          }}>

            {/* Location grid — 3×2 */}
            <div style={{
              flex: 1,
              display:             'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows:    'repeat(2, 1fr)',
              gap:                 '12px',
            }}>
              {LOCATIONS.map(function (loc) {
                return (
                  <LocationCard
                    key={loc.id}
                    loc={loc}
                    hovered={hoveredId}
                    onHover={setHoveredId}
                    onClick={handleLocationClick}
                  />
                );
              })}
            </div>

            {/* Activity Feed */}
            <div style={{
              width:          '260px',
              flexShrink:     0,
              overflow:       'hidden',
              borderRadius:   '16px',
              border:         '1px solid #1e2a3a',
              background:     '#0d1117cc',
              backdropFilter: 'blur(12px)',
            }}>
              <ActivityFeed
                currentUser={user}
                followedUids={userData?.following || []}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══ OFFICE MODAL ═════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showOffice && (
          <motion.div
            key="office-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position:       'fixed', inset: 0, zIndex: 200,
              background:     '#000000bb', backdropFilter: 'blur(6px)',
              display:        'flex', alignItems: 'center', justifyContent: 'center',
              padding:        '20px',
            }}
          >
            <DailyChallenge
              user={user}
              userData={userData}
              onClose={function () { setShowOffice(false); }}
              onRewardsEarned={handleRewardsEarned}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ LOCKED TOAST ═════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lockedToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{ opacity: 0, y: 30   }}
            style={{
              position:     'fixed', bottom: '28px', left: '50%',
              transform:    'translateX(-50%)', zIndex: 999,
              background:   '#1a1a2e', border: '1px solid #f5c54244',
              color:        '#f5c542', padding: '10px 24px',
              borderRadius: '30px', fontSize: '13px', fontWeight: 600,
              boxShadow:    '0 4px 20px #00000066',
            }}
          >
            {lockedToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Particles from 'react-tsparticles';
import { loadFull } from 'tsparticles';
import axios from 'axios';
import { API_BASE } from './config';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_NAMES = {
  1: 'Junior',
  2: 'Mid',
  3: 'Senior',
  4: 'Lead',
  5: 'Legend'
};

const LEVEL_COLORS = {
  1: '#22c55e',
  2: '#3b82f6',
  3: '#a855f7',
  4: '#f97316',
  5: '#ef4444'
};

const XP_PER_LEVEL = 500;

// ─── Zone Definitions ─────────────────────────────────────────────────────────
// position: percent from top-left of the map container

const ZONES = [
  {
    id:          'lab',
    path:        '/lab',
    label:       '🧪 Lab',
    description: 'Create & publish challenges',
    position:    { top: '20%', left: '15%' },
    color:       '#a855f7',
    glow:        'rgba(168,85,247,0.6)',
    ring:        'rgba(168,85,247,0.2)',
    badgeKey:    null
  },
  {
    id:          'hub',
    path:        '/hub',
    label:       '🏘️ Hub',
    description: 'Community challenges',
    position:    { top: '15%', left: '55%' },
    color:       '#3b82f6',
    glow:        'rgba(59,130,246,0.6)',
    ring:        'rgba(59,130,246,0.2)',
    badgeKey:    'hubChallenges'
  },
  {
    id:          'arena',
    path:        '/arena',
    label:       '🏟️ Arena',
    description: '1v1 real-time battles',
    position:    { top: '55%', left: '70%' },
    color:       '#ef4444',
    glow:        'rgba(239,68,68,0.6)',
    ring:        'rgba(239,68,68,0.2)',
    badgeKey:    null
  },
  {
    id:          'office',
    path:        '/office',
    label:       '🏢 Office',
    description: 'Stats, role & activity',
    position:    { top: '60%', left: '25%' },
    color:       '#f97316',
    glow:        'rgba(249,115,22,0.6)',
    ring:        'rgba(249,115,22,0.2)',
    badgeKey:    'dailyChallenges'
  },
  {
    id:          'story',
    path:        '/story',
    label:       '📖 Story',
    description: 'Your AI life story',
    position:    { top: '38%', left: '42%' },
    color:       '#22c55e',
    glow:        'rgba(34,197,94,0.6)',
    ring:        'rgba(34,197,94,0.2)',
    badgeKey:    'newStory'
  }
];

// ─── Particles Config ─────────────────────────────────────────────────────────

const PARTICLES_CONFIG = {
  fullScreen:   { enable: false },
  background:   { color: { value: 'transparent' } },
  fpsLimit:     60,
  particles: {
    number:  { value: 80, density: { enable: true, area: 900 } },
    color:   { value: ['#a855f7', '#3b82f6', '#22c55e', '#ef4444', '#f97316'] },
    shape:   { type: 'circle' },
    opacity: {
      value:  0.5,
      random: true,
      animation: { enable: true, speed: 0.8, minimumValue: 0.1, sync: false }
    },
    size: {
      value:  { min: 1, max: 3 },
      random: true,
      animation: { enable: true, speed: 2, minimumValue: 0.5, sync: false }
    },
    links: {
      enable:   true,
      distance: 130,
      color:    '#a855f7',
      opacity:  0.15,
      width:    1
    },
    move: {
      enable:    true,
      speed:     0.6,
      direction: 'none',
      random:    true,
      straight:  false,
      outModes:  { default: 'bounce' }
    }
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'repulse' },
      onClick: { enable: true, mode: 'push'    }
    },
    modes: {
      repulse: { distance: 100, duration: 0.4 },
      push:    { quantity: 3 }
    }
  },
  detectRetina: true
};

// ─── Sub-components ───────────────────────────────────────────────────────────

// Floating animated orb for each zone
const ZoneOrb = ({ zone, badge, onClick, isHovered, onHover, onLeave }) => {
  const pulseVariants = {
    idle: {
      scale:     [1, 1.06, 1],
      boxShadow: [
        `0 0 20px ${zone.glow}`,
        `0 0 40px ${zone.glow}`,
        `0 0 20px ${zone.glow}`
      ],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
    },
    hover: {
      scale:     1.18,
      boxShadow: `0 0 60px ${zone.glow}, 0 0 120px ${zone.ring}`,
      transition: { duration: 0.25 }
    }
  };

  const floatVariants = {
    float: {
      y: [0, -10, 0],
      transition: {
        duration:   3 + Math.random() * 2,
        repeat:     Infinity,
        ease:       'easeInOut',
        delay:      Math.random() * 2
      }
    }
  };

  return (
    <motion.div
      variants={floatVariants}
      animate="float"
      style={{ position: 'absolute', ...zone.position, transform: 'translate(-50%, -50%)' }}
      className="z-10 flex flex-col items-center gap-2 cursor-pointer"
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Ring pulse */}
      <motion.div
        animate={{
          scale:   [1, 1.6, 1],
          opacity: [0.4, 0, 0.4]
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position:     'absolute',
          width:        80,
          height:       80,
          borderRadius: '50%',
          border:       `2px solid ${zone.color}`,
          pointerEvents:'none'
        }}
      />

      {/* Orb */}
      <motion.div
        variants={pulseVariants}
        animate={isHovered ? 'hover' : 'idle'}
        style={{
          width:        64,
          height:       64,
          borderRadius: '50%',
          background:   `radial-gradient(circle at 35% 35%,
                          ${zone.color}cc, ${zone.color}44)`,
          border:       `2px solid ${zone.color}`,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          fontSize:     26,
          position:     'relative'
        }}
      >
        {zone.label.split(' ')[0]}

        {/* Notification badge */}
        {badge > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position:        'absolute',
              top:             -6,
              right:           -6,
              background:      '#ef4444',
              color:           '#fff',
              borderRadius:    '50%',
              width:           22,
              height:          22,
              fontSize:        11,
              fontWeight:      700,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              border:          '2px solid #0a0a0f',
              boxShadow:       '0 0 8px rgba(239,68,68,0.8)'
            }}
          >
            {badge > 9 ? '9+' : badge}
          </motion.div>
        )}
      </motion.div>

      {/* Label */}
      <motion.div
        animate={{ opacity: isHovered ? 1 : 0.7 }}
        style={{
          color:      zone.color,
          fontWeight: 700,
          fontSize:   13,
          textShadow: `0 0 12px ${zone.glow}`,
          whiteSpace: 'nowrap',
          letterSpacing: 1
        }}
      >
        {zone.label.split(' ').slice(1).join(' ')}
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{   opacity: 0, y: 6, scale: 0.9 }}
            transition={{ duration: 0.18 }}
            style={{
              position:     'absolute',
              top:          '110%',
              background:   'rgba(10,10,15,0.95)',
              border:       `1px solid ${zone.color}66`,
              borderRadius: 10,
              padding:      '6px 12px',
              fontSize:     12,
              color:        '#d1d5db',
              whiteSpace:   'nowrap',
              pointerEvents:'none',
              boxShadow:    `0 4px 20px ${zone.glow}`
            }}
          >
            {zone.description}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Top HUD bar
const HUD = ({ user, userData, onLogout }) => {
  const level   = userData?.level || 1;
  const xp      = userData?.xp    || 0;
  const credits = userData?.credits|| 0;
  const elo     = userData?.elo    || 1000;

  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp    = level * XP_PER_LEVEL;
  const progress       = Math.min(
    ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
    100
  );

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="absolute top-0 left-0 right-0 z-20 flex items-center
                 justify-between px-6 py-3"
      style={{
        background:   'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)',
        backdropFilter: 'blur(4px)'
      }}
    >
      {/* Left: Avatar + Name */}
      <div className="flex items-center gap-3">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt="avatar"
            className="w-9 h-9 rounded-full border-2"
            style={{ borderColor: LEVEL_COLORS[level] }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center
                       text-white font-bold text-sm border-2"
            style={{
              background:   LEVEL_COLORS[level] + '44',
              borderColor:  LEVEL_COLORS[level]
            }}
          >
            {user?.displayName?.[0] || '?'}
          </div>
        )}
        <div>
          <p className="text-white text-sm font-bold leading-tight">
            {user?.displayName || 'Developer'}
          </p>
          <p className="text-xs font-semibold" style={{ color: LEVEL_COLORS[level] }}>
            {LEVEL_NAMES[level]} • Lv {level}
          </p>
        </div>
      </div>

      {/* Center: XP Bar */}
      <div className="hidden md:flex flex-col items-center gap-1 w-48">
        <div className="flex justify-between w-full text-xs text-gray-400">
          <span>{xp} XP</span>
          <span>{level < 5 ? `${nextLevelXp} XP` : 'MAX'}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${LEVEL_COLORS[level]}, ${LEVEL_COLORS[level]}aa)`
            }}
          />
        </div>
      </div>

      {/* Right: Stats + Logout */}
      <div className="flex items-center gap-3">
        {/* Credits */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        border border-gray-700 bg-gray-900/80">
          <span className="text-yellow-400 text-sm">💰</span>
          <span className="text-white text-sm font-bold">{credits}</span>
        </div>

        {/* ELO */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        border border-gray-700 bg-gray-900/80">
          <span className="text-red-400 text-sm">🏆</span>
          <span className="text-white text-sm font-bold">{elo}</span>
        </div>

        {/* Weekly XP */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl
                        border border-gray-700 bg-gray-900/80">
          <span className="text-purple-400 text-sm">⚡</span>
          <span className="text-white text-sm font-bold">
            {userData?.weeklyXp || 0}
          </span>
          <span className="text-gray-500 text-xs">wk</span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded-xl border border-gray-700 bg-gray-900/80
                     text-gray-400 hover:text-white hover:border-red-500
                     transition-all duration-200 text-sm"
        >
          ⏻
        </button>
      </div>
    </motion.div>
  );
};

// Cyberpunk grid overlay
const GridOverlay = () => (
  <div
    className="absolute inset-0 z-0 pointer-events-none"
    style={{
      backgroundImage: `
        linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)
      `,
      backgroundSize: '60px 60px'
    }}
  />
);

// Scanline effect
const Scanlines = () => (
  <div
    className="absolute inset-0 z-0 pointer-events-none opacity-30"
    style={{
      backgroundImage:
        'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
      backgroundSize: '100% 4px'
    }}
  />
);

// Connection lines between zones (SVG)
const ConnectionLines = () => (
  <svg
    className="absolute inset-0 w-full h-full z-0 pointer-events-none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#a855f7" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="lineGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#f97316" stopOpacity="0.3" />
      </linearGradient>
    </defs>

    {/* Lab → Story */}
    <line x1="15%" y1="20%" x2="42%" y2="38%"
          stroke="url(#lineGrad1)" strokeWidth="1" strokeDasharray="6,4" />
    {/* Story → Hub */}
    <line x1="42%" y1="38%" x2="55%" y2="15%"
          stroke="url(#lineGrad2)" strokeWidth="1" strokeDasharray="6,4" />
    {/* Hub → Arena */}
    <line x1="55%" y1="15%" x2="70%" y2="55%"
          stroke="url(#lineGrad2)" strokeWidth="1" strokeDasharray="6,4" />
    {/* Story → Office */}
    <line x1="42%" y1="38%" x2="25%" y2="60%"
          stroke="url(#lineGrad3)" strokeWidth="1" strokeDasharray="6,4" />
    {/* Office → Arena */}
    <line x1="25%" y1="60%" x2="70%" y2="55%"
          stroke="url(#lineGrad3)" strokeWidth="1" strokeDasharray="6,4" />
  </svg>
);

// Bottom info strip when a zone is hovered
const ZoneInfoStrip = ({ zone }) => (
  <AnimatePresence>
    {zone && (
      <motion.div
        key={zone.id}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{   y: 40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20
                   px-6 py-3 rounded-2xl flex items-center gap-3"
        style={{
          background:  'rgba(10,10,15,0.92)',
          border:      `1px solid ${zone.color}66`,
          boxShadow:   `0 4px 30px ${zone.glow}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        <span className="text-2xl">{zone.label.split(' ')[0]}</span>
        <div>
          <p className="text-white font-bold text-sm">{zone.label}</p>
          <p className="text-gray-400 text-xs">{zone.description}</p>
        </div>
        <span
          className="ml-4 text-xs font-bold px-3 py-1 rounded-full"
          style={{
            background: zone.color + '22',
            color:      zone.color,
            border:     `1px solid ${zone.color}44`
          }}
        >
          ENTER →
        </span>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const World = ({ user, userData, onLogout }) => {
  const navigate            = useNavigate();
  const particlesInit       = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  const [hoveredZone,   setHoveredZone]   = useState(null);
  const [badges,        setBadges]        = useState({});
  const [loadingBadges, setLoadingBadges] = useState(true);

  // ── Fetch badge counts ──
  const fetchBadges = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const today = new Date().toISOString().split('T')[0];

      const [challengesRes, dailyRes] = await Promise.all([
        axios.get(`${API_BASE}/challenges?limit=5`),
        axios.get(`${API_BASE}/daily-challenges/${user.uid}`)
      ]);

      // Count hub challenges user hasn't attempted
      const allChallenges   = challengesRes.data.challenges || [];
      const hubUnAttempted  = allChallenges.filter(
        c => !c.attemptedBy?.includes(user.uid) && c.createdBy !== user.uid
      ).length;

      // Count daily challenges not yet completed today
      const dailyData        = dailyRes.data;
      const completedToday   = dailyData.completedCount || 0;
      const totalDaily       = (dailyData.challenges || []).length;
      const dailyRemaining   = Math.max(0, totalDaily - completedToday);

      // Check if new story exists this week
      let newStory = 0;
      try {
        const storyRes = await axios.get(`${API_BASE}/story/${user.uid}`);
        newStory = storyRes.data.story ? 1 : 0;
      } catch (_) {}

      setBadges({
        hubChallenges:   hubUnAttempted,
        dailyChallenges: dailyRemaining,
        newStory
      });
    } catch (err) {
      console.error('❌ Badge fetch error:', err);
    } finally {
      setLoadingBadges(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const hoveredZoneObj = ZONES.find(z => z.id === hoveredZone) || null;

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 50%, #0f0a1e 0%, #0a0a0f 100%)' }}
    >

      {/* ── Particles ── */}
      <Particles
        id="world-particles"
        init={particlesInit}
        options={PARTICLES_CONFIG}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      />

      {/* ── Visual overlays ── */}
      <GridOverlay />
      <Scanlines />

      {/* ── SVG connection lines ── */}
      <ConnectionLines />

      {/* ── HUD ── */}
      <HUD user={user} userData={userData} onLogout={onLogout} />

      {/* ── Zone orbs ── */}
      {ZONES.map(zone => (
        <ZoneOrb
          key={zone.id}
          zone={zone}
          badge={zone.badgeKey ? (badges[zone.badgeKey] || 0) : 0}
          isHovered={hoveredZone === zone.id}
          onHover={() => setHoveredZone(zone.id)}
          onLeave={() => setHoveredZone(null)}
          onClick={() => navigate(zone.path)}
        />
      ))}

      {/* ── Zone info strip ── */}
      <ZoneInfoStrip zone={hoveredZoneObj} />

      {/* ── Center title ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
        className="absolute inset-0 flex flex-col items-center
                   justify-center pointer-events-none z-5"
        style={{ top: '5%' }}
      >
        <motion.h1
          animate={{
            textShadow: [
              '0 0 20px #a855f7',
              '0 0 50px #a855f7',
              '0 0 20px #a855f7'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-5xl md:text-7xl font-black tracking-widest uppercase"
          style={{
            color:      '#fff',
            fontFamily: 'monospace',
            letterSpacing: '0.15em'
          }}
        >
          DSA LIFE
        </motion.h1>
        <motion.p
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-purple-400 text-sm tracking-[0.4em] uppercase mt-2"
          style={{ fontFamily: 'monospace' }}
        >
          SIMULATOR
        </motion.p>
      </motion.div>

      {/* ── Loading badge overlay ── */}
      {loadingBadges && (
        <div className="absolute bottom-4 right-4 z-20">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent
                          rounded-full animate-spin" />
        </div>
      )}

    </div>
  );
};
export default World;
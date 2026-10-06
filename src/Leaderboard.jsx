import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence }                         from 'framer-motion';
import { useNavigate }                                     from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
// ── Constants ──────────────────────────────────────────────────────────────────
const API  = `${API_BASE}/leaderboard`;
const TABS = [
  { id: 'global',   label: 'Global',   sub: 'Top by XP',            caption: 'ALL-TIME XP',  icon: 'globe'  },
  { id: 'arena',    label: 'Arena',    sub: 'Top by ELO',           caption: 'ARENA ELO',    icon: 'swords' },
  { id: 'creators', label: 'Creators', sub: 'Top Challenge Makers', caption: 'TOP CREATORS', icon: 'flask'  },
  { id: 'weekly',   label: 'Weekly',   sub: 'Resets Monday',        caption: 'THIS WEEK',    icon: 'flame'  },
];
const TOPICS      = ['All', 'Array', 'LinkedList', 'Stack', 'Queue', 'Tree', 'Graph', 'DP'];
const LEVELS      = ['All', '1', '2', '3', '4', '5'];
const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

// XP required to reach each level. Keep in sync with the backend level curve.
const LEVEL_XP = { 1: 0, 2: 300, 3: 1000, 4: 2500, 5: 5000 };

// Which myRanks field belongs to which tab
const MY_RANK_KEY = { global: 'globalRank', arena: 'arenaRank', weekly: 'weeklyRank', creators: 'creatorRank' };

// Flag chips (flagcdn images render on every OS, unlike flag emoji on Windows)
const COUNTRIES = [
  { code: '',   name: 'Global'        },
  { code: 'IN', name: 'India'         },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'UK'            },
  { code: 'CA', name: 'Canada'        },
  { code: 'DE', name: 'Germany'       },
  { code: 'SG', name: 'Singapore'     },
  { code: 'NG', name: 'Nigeria'       },
  { code: 'BR', name: 'Brazil'        },
];

// Earned RPG titles. A backend `entry.title` always wins over these.
const TOPIC_TITLES = {
  Array:      'The Array Architect',
  HashMap:    'The Hashmap Herald',
  LinkedList: 'The Pointer Paladin',
  Stack:      'The Stack Sentinel',
  Queue:      'The Queue Keeper',
  Tree:       'The Tree Warden',
  Graph:      'The Graph Wanderer',
  DP:         'The Memo Mage',
};
const LEVEL_TITLES = {
  1: 'Code Squire',
  2: 'Logic Knight',
  3: 'Algorithm Adept',
  4: 'Systems Warlord',
  5: 'Legend of the Loop',
};

// Podium themes per place
const PODIUM = {
  1: {
    place: 'CHAMPION', frame: '#f5c451', faint: 'rgba(245,196,81,.45)', glow: 'rgba(245,196,81,.45)',
    auraA: '#f5c451', auraB: '#a78bfa',
    top: 'linear-gradient(180deg,#fff3c4,#e0a82e)', front: 'linear-gradient(180deg,#e0a82e,#a16207 65%,#713f12)',
    blockH: 210, rankSize: 88, charW: 180, stageH: 262, aura: 250, sparks: 8,
  },
  2: {
    place: 'SILVER', frame: '#cbd5e1', faint: 'rgba(203,213,225,.35)', glow: 'rgba(165,243,252,.35)',
    auraA: '#a5f3fc', auraB: '#e2e8f0',
    top: 'linear-gradient(180deg,#f1f5f9,#94a3b8)', front: 'linear-gradient(180deg,#94a3b8,#475569 70%,#334155)',
    blockH: 150, rankSize: 64, charW: 150, stageH: 214, aura: 200, sparks: 5,
  },
  3: {
    place: 'BRONZE', frame: '#e0915a', faint: 'rgba(224,145,90,.35)', glow: 'rgba(251,146,60,.32)',
    auraA: '#fb923c', auraB: '#f472b6',
    top: 'linear-gradient(180deg,#fed7aa,#c2703d)', front: 'linear-gradient(180deg,#c2703d,#8a4b25 70%,#5c3018)',
    blockH: 110, rankSize: 56, charW: 140, stageH: 194, aura: 180, sparks: 4,
  },
};

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap';

const DISPLAY = "'Chakra Petch', sans-serif";
const BODY    = "'IBM Plex Sans', system-ui, sans-serif";
const MONO    = "'JetBrains Mono', ui-monospace, monospace";

const STYLE = `
@keyframes hofSpin{to{transform:rotate(360deg)}}
@keyframes hofSpinRev{to{transform:rotate(-360deg)}}
@keyframes hofFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes hofRise{0%{transform:translateY(0);opacity:0}20%{opacity:1}100%{transform:translateY(-140px);opacity:0}}
@keyframes hofPulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes hofSweep{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
@keyframes hofGrid{to{background-position:0 64px}}
@keyframes hofShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
.hof-aura{animation:hofSpin 6s linear infinite}
.hof-aura-rev{animation:hofSpinRev 9s linear infinite}
.hof-float{animation:hofFloat 4s ease-in-out infinite}
.hof-spark{animation:hofRise 3.2s ease-out infinite}
.hof-pulse{animation:hofPulse 2.4s ease-in-out infinite}
.hof-sweep{animation:hofSweep 3.8s ease-in-out infinite}
.hof-floor{animation:hofGrid 2.5s linear infinite}
.hof-skel{background:linear-gradient(90deg,#0f1520 0,#18202e 50%,#0f1520 100%);background-size:800px 100%;animation:hofShimmer 1.4s linear infinite}
.hof-row{transition:transform .18s ease,border-color .18s ease}
.hof-row:hover{transform:translateX(6px);border-color:#3b4a66}
.hof-btn{transition:background .15s ease,border-color .15s ease,color .15s ease,box-shadow .15s ease}
.hof-btn:hover{border-color:#4b5b7a}
.hof-btn:focus-visible,.hof-row:focus-visible{outline:2px solid #7dd3fc;outline-offset:2px}
.hof-scroll{scrollbar-width:none}.hof-scroll::-webkit-scrollbar{display:none}
@media (max-width:760px){.hof-podium{zoom:.62}.hof-hide-sm{display:none !important}}
@media (max-width:420px){.hof-podium{zoom:.5}}
@media (prefers-reduced-motion:reduce){.hof-aura,.hof-aura-rev,.hof-float,.hof-spark,.hof-pulse,.hof-sweep,.hof-floor,.hof-skel{animation:none}}
`;

// ── Helpers ────────────────────────────────────────────────────────────────────
function hashHue(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

const SKINS = ['#f1c7a3', '#e2b089', '#d9a77c', '#c99272', '#a8714f', '#7d4f35'];
const HAIRS = ['#1c120c', '#2b1d14', '#4a2f1d', '#6b3e22', '#2a2a35', '#8a6a3b'];

function heroPalette(uid = '') {
  const hue = hashHue(uid);
  const idx = hue % SKINS.length;
  return {
    cloak:     `hsl(${hue} 55% 38%)`,
    cloakDark: `hsl(${hue} 55% 22%)`,
    skin:      SKINS[idx],
    hair:      HAIRS[(idx + 2) % HAIRS.length],
    chip:      `hsl(${hue} 60% 42%)`,
  };
}

function avatarSrc(entry) {
  return entry?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry?.uid || 'anon'}`;
}

function getTitle(entry, tab) {
  if (!entry) return '';
  if (entry.title) return entry.title;
  if (tab === 'creators') return (entry.challengesCreated || 0) >= 10 ? 'The Grand Architect' : 'The Challenge Smith';
  if (tab === 'arena')    return (entry.elo || 0) >= 1600 ? 'Arena Warlord' : 'Arena Gladiator';
  return TOPIC_TITLES[entry.topic] || LEVEL_TITLES[entry.level] || 'Code Squire';
}

// Number used for ranking maths + how to show it, per tab
function getScore(entry, tab) {
  if (!entry) return { num: 0, main: '', unit: '', sub: '', color: '#c4b5fd' };
  if (tab === 'arena') {
    const n = entry.elo || 0;
    return { num: n, main: n.toLocaleString(), unit: 'ELO', sub: `Lv${entry.level ?? 1}`, color: '#ff8a8a' };
  }
  if (tab === 'creators') {
    const n = entry.avgChallengeRating || 0;
    return { num: n, main: n.toFixed(1), unit: 'RATING', sub: `${entry.challengesCreated || 0} made`, color: '#c4b5fd', star: true };
  }
  if (tab === 'weekly') {
    const n = entry.weeklyXp || 0;
    return { num: n, main: n.toLocaleString(), unit: 'XP', sub: 'this week', color: '#f5c451' };
  }
  const n = entry.xp || 0;
  return { num: n, main: n.toLocaleString(), unit: 'XP', sub: `${entry.credits ?? 0}`, color: '#c4b5fd', coin: true };
}

function formatGap(gap, tab) {
  if (tab === 'creators') return `${gap.toFixed(1)} rating`;
  const unit = tab === 'arena' ? 'ELO' : 'XP';
  return `${Math.ceil(gap).toLocaleString()} ${unit}`;
}

function rowFrame(rank) {
  if (rank <= 3)  return PODIUM[rank].frame;
  if (rank <= 10) return '#7c5cff';
  return '#2a3550';
}

// ── Icons (inline SVG, no emoji) ───────────────────────────────────────────────
const ICONS = {
  globe:   <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  swords:  <><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6M16 16l4 4M19 21l2-2" /><path d="M14.5 6.5L18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2" /></>,
  flask:   <><path d="M9 3h6M10 3v6L4.5 18.5A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.5-2.5L14 9V3" /><path d="M7.5 14h9" /></>,
  flame:   <path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-2.5 1.5-3.5 4-3 6-1.5-1-2.5-2.5-2.5-4C6.5 9 5 12 5 15c0 4.3 3 7 7 7z" />,
  trophy:  <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></>,
  back:    <path d="M15 18l-6-6 6-6" />,
  filter:  <path d="M4 6h16M7 12h10M10 18h4" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  coin:    <><circle cx="12" cy="12" r="9" /><path d="M12 7v10" /></>,
  star:    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  target:  <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  alert:   <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
};

function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 2, style }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }} aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

// ── Full-body hero avatar (photo becomes the face when available) ──────────────
function HeroAvatar({ entry, theme, width, crowned }) {
  const p      = heroPalette(entry.uid);
  const clipId = `hof-face-${String(entry.uid || 'x').replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const height = Math.round(width * (180 / 140));

  return (
    <svg
      width={width} height={height} viewBox="0 0 140 180"
      style={{ position: 'relative', filter: 'drop-shadow(0 12px 18px rgba(0,0,0,.6))' }}
      role="img" aria-label={`${entry.name || 'Player'} avatar`}
    >
      <defs>
        <clipPath id={clipId}><circle cx="70" cy="74" r="27" /></clipPath>
      </defs>
      <ellipse cx="70" cy="174" rx="44" ry="6" fill="rgba(0,0,0,.45)" />
      {/* cloak + body */}
      <path d="M28 176 C26 128 44 104 70 104 C96 104 114 128 112 176 Z" fill={p.cloak} />
      <path d="M70 104 L52 176 L88 176 Z" fill={p.cloakDark} />
      <path d="M40 120 L70 134 L100 120" fill="none" stroke={theme.frame} strokeWidth="4" strokeLinecap="round" />
      <rect x="62" y="138" width="16" height="16" rx="3" transform="rotate(45 70 146)" fill={theme.frame} />
      {/* hood */}
      <path d="M34 72 C34 38 52 24 70 24 C88 24 106 38 106 72 L106 96 C106 104 98 110 90 110 L50 110 C42 110 34 104 34 96 Z" fill={p.cloakDark} />
      {/* face: real photo if they uploaded one, otherwise a visor hero */}
      {entry.photoURL ? (
        <>
          <image href={entry.photoURL} x="43" y="47" width="54" height="54" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
          <circle cx="70" cy="74" r="27" fill="none" stroke={theme.frame} strokeWidth="2.5" />
        </>
      ) : (
        <>
          <circle cx="70" cy="74" r="27" fill={p.skin} />
          <path d="M43 66 C46 46 58 40 70 40 C84 40 96 48 98 66 C88 58 78 56 70 56 C60 56 50 60 43 66 Z" fill={p.hair} />
          <rect x="50" y="70" width="40" height="11" rx="5.5" fill="#0b1020" />
          <rect x="54" y="73" width="12" height="5" rx="2.5" fill={theme.auraA} />
          <rect x="74" y="73" width="12" height="5" rx="2.5" fill={theme.auraA} />
          <path d="M62 90 Q70 95 78 90" fill="none" stroke="#5b3a2e" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
      {crowned && (
        <path d="M52 22 L60 6 L70 18 L80 6 L88 22 Z" fill="#f5c451" stroke="#6b4b0f" strokeWidth="1.5" strokeLinejoin="round" />
      )}
      {/* item aura orb */}
      <circle cx="118" cy="112" r="11" fill="none" stroke={theme.auraA} strokeWidth="3" />
      <path d="M112 112 L124 112 M118 106 L118 118" stroke={theme.auraA} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── One podium spot ────────────────────────────────────────────────────────────
function PodiumSpot({ entry, place, tab, isYou, index }) {
  const t     = PODIUM[place];
  const score = getScore(entry, tab);
  const conic = `conic-gradient(from 0deg,${t.auraA},${t.auraB},transparent 40%,${t.auraA} 60%,${t.auraB},transparent 90%,${t.auraA})`;
  const ring  = 'radial-gradient(circle, transparent 58%, #000 60%, #000 66%, transparent 70%)';
  const inner = Math.round(t.aura * 0.8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.12, type: 'spring', stiffness: 120, damping: 16 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 280, position: 'relative' }}
    >
      {/* Avatar stage */}
      <div className={entry ? 'hof-float' : ''} style={{ position: 'relative', width: 220, height: t.stageH, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {entry && (
          <>
            <div className="hof-aura" style={{
              position: 'absolute', left: '50%', bottom: 18, width: t.aura, height: t.aura, marginLeft: -t.aura / 2,
              borderRadius: '50%', background: conic, filter: 'blur(2px)', opacity: 0.9,
              maskImage: ring, WebkitMaskImage: ring,
            }} />
            <div className="hof-aura-rev" style={{
              position: 'absolute', left: '50%', bottom: 30, width: inner, height: inner, marginLeft: -inner / 2,
              borderRadius: '50%', border: `2px dashed ${t.auraA}`, opacity: 0.55,
            }} />
            <div className="hof-pulse" style={{
              position: 'absolute', left: '50%', bottom: 10, width: 220, height: 220, marginLeft: -110,
              borderRadius: '50%', background: `radial-gradient(circle, ${t.glow}, transparent 65%)`,
            }} />
            {Array.from({ length: t.sparks }).map((_, i) => (
              <span key={i} className="hof-spark" style={{
                position: 'absolute', bottom: 40, left: `${14 + i * (72 / t.sparks)}%`,
                width: 5, height: 5, borderRadius: '50%', background: t.auraA,
                boxShadow: `0 0 10px ${t.auraA}`, animationDelay: `${(i * 0.45).toFixed(2)}s`,
              }} />
            ))}
            <HeroAvatar entry={entry} theme={t} width={t.charW} crowned={place === 1} />
          </>
        )}
        {!entry && (
          <div style={{
            width: t.charW * 0.7, height: t.charW * 0.9, marginBottom: 12, borderRadius: '50% 50% 12px 12px',
            border: `2px dashed ${t.faint}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.frame, fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, opacity: 0.7,
          }}>?</div>
        )}
      </div>

      {/* Nameplate */}
      <div style={{
        position: 'relative', zIndex: 3, marginTop: -6, marginBottom: 14, padding: '10px 16px',
        minWidth: 210, maxWidth: 260, textAlign: 'center', borderRadius: 12,
        border: `2px solid ${t.frame}`, background: 'linear-gradient(180deg,#151c2a,#0b0f17)',
        boxShadow: `0 0 0 4px rgba(7,9,14,.9), 0 0 0 5px ${t.faint}, 0 0 28px ${t.glow}`, overflow: 'hidden',
      }}>
        <span className="hof-sweep" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.10), transparent)',
        }} />
        {entry ? (
          <>
            <div style={{
              position: 'relative', fontFamily: DISPLAY, fontWeight: 700, fontSize: 19,
              color: isYou ? '#7dd3fc' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {entry.name}{isYou && <span style={{ fontSize: 12, marginLeft: 6, color: '#7dd3fc' }}>(You)</span>}
            </div>
            <div style={{ position: 'relative', fontFamily: DISPLAY, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', color: t.frame, textTransform: 'uppercase' }}>
              {getTitle(entry, tab)}
            </div>
            <div style={{ position: 'relative', marginTop: 6, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 13 }}>
              <span style={{ color: score.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {score.star && <Icon name="star" size={13} color={score.color} />}
                {score.main} {score.unit !== 'RATING' && score.unit}
              </span>
              <span style={{ color: '#8a97ad' }}>Lv{entry.level ?? 1} {LEVEL_NAMES[entry.level] || ''}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ position: 'relative', fontFamily: DISPLAY, fontWeight: 700, fontSize: 17, color: '#e6edf6' }}>Unclaimed</div>
            <div style={{ position: 'relative', fontFamily: DISPLAY, fontSize: 12, letterSpacing: '.14em', color: t.frame }}>THIS SPOT COULD BE YOURS</div>
          </>
        )}
      </div>

      {/* 3D block */}
      <div style={{ position: 'relative', width: 250 }}>
        <div style={{
          height: 46, transform: 'perspective(520px) rotateX(58deg)', transformOrigin: '50% 100%',
          background: t.top, border: '1px solid rgba(255,255,255,.25)', borderRadius: 4,
          boxShadow: 'inset 0 0 30px rgba(255,255,255,.18)',
        }} />
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: t.blockH }}
          transition={{ delay: 0.1 + index * 0.12, duration: 0.6, ease: 'easeOut' }}
          style={{
            background: t.front, borderRadius: '0 0 6px 6px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 14,
            boxShadow: '0 30px 60px rgba(0,0,0,.6), inset 0 2px 0 rgba(255,255,255,.35), inset -14px 0 0 rgba(0,0,0,.18), inset 14px 0 0 rgba(255,255,255,.06)',
          }}
        >
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: t.rankSize, lineHeight: 1, color: 'rgba(255,255,255,.95)', textShadow: '0 3px 0 rgba(0,0,0,.35), 0 0 20px rgba(255,255,255,.35)' }}>
            {place}
          </span>
          <span style={{ marginTop: 6, fontFamily: DISPLAY, fontSize: 12, letterSpacing: '.3em', color: 'rgba(255,255,255,.8)' }}>
            {t.place}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Row for rank 4 and below ───────────────────────────────────────────────────
function LeaderRow({ entry, tab, currentUid, rank }) {
  const isYou = entry.uid === currentUid;
  const score = getScore(entry, tab);
  const frame = rowFrame(rank);

  return (
    <motion.div
      className="hof-row"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.5) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14,
        border: `1px solid ${isYou ? 'rgba(125,211,252,.5)' : '#1c2433'}`,
        background: isYou ? 'rgba(125,211,252,.07)' : '#0c111a',
      }}
    >
      <span style={{ width: 44, fontFamily: MONO, fontWeight: 700, fontSize: 17, color: rank <= 10 ? '#a78bfa' : '#6b788e' }}>
        #{rank}
      </span>

      <img
        src={avatarSrc(entry)} alt=""
        style={{
          width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
          background: heroPalette(entry.uid).chip, boxShadow: `0 0 0 2px #0c111a, 0 0 0 3px ${frame}`,
        }}
      />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: isYou ? '#7dd3fc' : '#e6edf6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.name}
          {isYou && <span style={{ fontSize: 11, marginLeft: 6, color: '#7dd3fc' }}>(You)</span>}
        </span>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: DISPLAY, fontSize: 11, fontWeight: 600, letterSpacing: '.1em', color: rank <= 10 ? '#a78bfa' : '#8a97ad', textTransform: 'uppercase' }}>
            {getTitle(entry, tab)}
          </span>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#12223f', color: '#93c5fd', whiteSpace: 'nowrap' }}>
            Lv{entry.level ?? 1} {LEVEL_NAMES[entry.level] || ''}
          </span>
          {entry.topic && (
            <span className="hof-hide-sm" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#0d2a24', color: '#5eead4', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.topic}
            </span>
          )}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 80 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: score.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {score.star && <Icon name="star" size={14} color={score.color} />}
          {score.main} {score.unit !== 'RATING' && score.unit}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 12, color: score.coin ? '#d4b45a' : '#6b788e' }}>
          {score.coin && <Icon name="coin" size={12} strokeWidth={2.5} />}
          {score.sub}
        </span>
      </div>
    </motion.div>
  );
}

// ── Collapsible filter console (Global tab) ────────────────────────────────────
const selectStyle = {
  height: 44, borderRadius: 10, border: '1px solid #263045', background: '#0f1520',
  color: '#e6edf6', padding: '0 12px', fontFamily: BODY, fontSize: 14, cursor: 'pointer', width: '100%',
};
const labelStyle = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#8a97ad', letterSpacing: '.08em' };

function FilterConsole({
  open, setOpen,
  filterTopic, setFilterTopic, filterLevel, setFilterLevel, filterCountry, setFilterCountry,
}) {
  const [customCode, setCustomCode] = useState('');
  const isPreset   = COUNTRIES.some(c => c.code === filterCountry);
  const countryLbl = COUNTRIES.find(c => c.code === filterCountry)?.name || filterCountry;
  const summary    = [
    filterTopic === 'All' ? 'All topics' : filterTopic,
    filterLevel === 'All' ? 'All levels' : `Lv${filterLevel} ${LEVEL_NAMES[filterLevel]}`,
    countryLbl || 'Global',
  ].join(' · ');

  const applyCustom = () => {
    const code = customCode.trim().toUpperCase().slice(0, 2);
    if (code.length === 2) setFilterCountry(code);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ borderRadius: 16, border: '1px solid #1f2838', background: '#0c111a', overflow: 'hidden' }}
    >
      <button
        type="button" className="hof-btn" aria-expanded={open} onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '0 20px', background: 'transparent', border: 0, color: '#e6edf6', cursor: 'pointer',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <Icon name="filter" size={18} color="#7dd3fc" />
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: '.12em', whiteSpace: 'nowrap' }}>FILTER CONSOLE</span>
          <span className="hof-hide-sm" style={{ fontSize: 13, color: '#8a97ad', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{summary}</span>
        </span>
        <Icon name="chevron" size={18} color="#8a97ad" style={{ transition: 'transform .2s ease', transform: `rotate(${open ? 180 : 0}deg)` }} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 18, borderTop: '1px solid #1a2231' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <label style={labelStyle}>TOPIC
                  <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={selectStyle}>
                    {TOPICS.map(t => <option key={t} value={t}>{t === 'All' ? 'All topics' : t}</option>)}
                  </select>
                </label>
                <label style={labelStyle}>LEVEL
                  <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} style={selectStyle}>
                    {LEVELS.map(l => <option key={l} value={l}>{l === 'All' ? 'All levels' : `Lv${l} ${LEVEL_NAMES[l]}`}</option>)}
                  </select>
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8a97ad', letterSpacing: '.08em' }}>REGION</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COUNTRIES.map(c => {
                    const on = filterCountry === c.code;
                    return (
                      <button
                        key={c.code || 'all'} type="button" className="hof-btn" aria-pressed={on}
                        onClick={() => setFilterCountry(c.code)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 14px',
                          borderRadius: 10, cursor: 'pointer', fontFamily: BODY, fontSize: 13,
                          background: on ? '#12223f' : '#0f1520', color: on ? '#e6edf6' : '#c9d4e5',
                          border: `1px solid ${on ? '#7dd3fc' : '#263045'}`,
                          boxShadow: on ? '0 0 14px rgba(125,211,252,.3)' : 'none',
                        }}
                      >
                        {c.code
                          ? <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} alt="" width="22" height="15" style={{ borderRadius: 3, objectFit: 'cover', boxShadow: '0 0 0 1px rgba(255,255,255,.2)' }} />
                          : <Icon name="globe" size={16} color="#7dd3fc" />}
                        {c.name}
                      </button>
                    );
                  })}

                  {/* Any other ISO code */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      value={customCode}
                      onChange={e => setCustomCode(e.target.value.toUpperCase())}
                      onKeyDown={e => { if (e.key === 'Enter') applyCustom(); }}
                      placeholder="Other (e.g. JP)" maxLength={2} aria-label="Other country code"
                      style={{ ...selectStyle, width: 130, cursor: 'text', borderColor: !isPreset && filterCountry ? '#7dd3fc' : '#263045' }}
                    />
                    <button
                      type="button" className="hof-btn" onClick={applyCustom}
                      style={{ height: 44, padding: '0 14px', borderRadius: 10, border: '1px solid #7dd3fc55', background: '#7dd3fc1a', color: '#7dd3fc', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Sticky bottom anchor: your row, tier progress, distance to next rank ───────
function YouAnchor({ user, userData, entries, myRanks, tab }) {
  const myIndex = entries.findIndex(e => e.uid === user?.uid);
  const me      = myIndex >= 0 ? entries[myIndex] : null;
  const rank    = me ? myIndex + 1 : myRanks?.[MY_RANK_KEY[tab]];
  const name    = me?.name || userData?.name || user?.displayName || 'You';
  const entry   = me || { uid: user?.uid, name, photoURL: user?.photoURL, level: userData?.level, xp: userData?.xp, topic: userData?.topic };
  const frame   = rank && rank <= 3 ? PODIUM[rank].frame : '#7dd3fc';

  // Tier progress (always XP based)
  const xp      = me?.xp ?? userData?.xp ?? 0;
  const level   = Math.min(Math.max(Number(me?.level ?? userData?.level ?? 1), 1), 5);
  const maxed   = level >= 5;
  const floor   = LEVEL_XP[level];
  const ceil    = maxed ? floor : LEVEL_XP[level + 1];
  const pct     = maxed ? 100 : Math.max(0, Math.min(100, ((xp - floor) / (ceil - floor)) * 100));

  // Distance to next rank (uses the active tab's metric)
  let headline = 'KEEP CLIMBING';
  let detail   = `Break into the top ${entries.length || 50} to appear here`;
  let good     = false;
  if (me && myIndex === 0) {
    headline = 'DEFENDING THE CROWN';
    if (entries[1]) {
      const lead = getScore(me, tab).num - getScore(entries[1], tab).num;
      detail = `+${formatGap(lead, tab)} lead over #2`;
    } else {
      detail = 'No challengers yet';
    }
    good = true;
  } else if (me && myIndex > 0) {
    const above = entries[myIndex - 1];
    const gap   = getScore(above, tab).num - getScore(me, tab).num;
    const need  = tab === 'creators' ? Math.max(gap, 0.1) : gap + 1;
    headline = `DISTANCE TO #${myIndex}`;
    detail   = `${formatGap(need, tab)} to pass ${above.name?.split(' ')[0] || 'them'}`;
  }

  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 40, padding: '0 12px 12px' }}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 140, damping: 18 }}
        style={{
          maxWidth: 1040, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
          padding: '12px 18px', borderRadius: 18, border: `1px solid ${frame}88`,
          background: 'rgba(13,17,23,.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          boxShadow: `0 -10px 40px rgba(0,0,0,.6), 0 0 30px ${frame}26`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: frame, textShadow: `0 0 14px ${frame}99`, minWidth: 44 }}>
            {rank ? `#${rank}` : '—'}
          </span>
          <img
            src={avatarSrc(entry)} alt=""
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', background: heroPalette(entry.uid).chip, boxShadow: `0 0 0 2px #0d1117, 0 0 0 4px ${frame}` }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name} <span style={{ fontSize: 12, color: '#7dd3fc' }}>(You)</span>
            </span>
            <span style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: '.14em', color: frame, textTransform: 'uppercase' }}>
              {getTitle(entry, tab)}
            </span>
          </div>
        </div>

        <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: '#9aa7bd' }}>
            <span>
              Lv{level} {LEVEL_NAMES[level]}
              {!maxed && <> → <span style={{ color: '#e6edf6' }}>Lv{level + 1} {LEVEL_NAMES[level + 1]}</span></>}
            </span>
            <span style={{ fontFamily: MONO }}>{maxed ? 'MAX TIER' : `${xp.toLocaleString()} / ${ceil.toLocaleString()} XP`}</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#1a2231', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ delay: 0.7, duration: 0.9, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#7c5cff,#f5c451)', boxShadow: '0 0 12px rgba(245,196,81,.6)' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={{ fontSize: 11, letterSpacing: '.14em', color: '#8a97ad', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="target" size={12} /> {headline}
          </span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: good ? '#4ade80' : '#f5c451' }}>{detail}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Leaderboard({ user, userData }) {
  const navigate = useNavigate();

  const [activeTab,     setActiveTab]     = useState('global');
  const [entries,       setEntries]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [myRanks,       setMyRanks]       = useState({});
  const [weekStart,     setWeekStart]     = useState(null);
  const [filterTopic,   setFilterTopic]   = useState('All');
  const [filterLevel,   setFilterLevel]   = useState('All');
  const [filterCountry, setFilterCountry] = useState('');
  const [filtersOpen,   setFiltersOpen]   = useState(false);

  // Load display fonts once
  useEffect(() => {
    if (document.querySelector('link[data-hof-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    link.setAttribute('data-hof-fonts', '1');
    document.head.appendChild(link);
  }, []);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab === 'global') {
        if (filterTopic   !== 'All') params.topic   = filterTopic;
        if (filterLevel   !== 'All') params.level   = filterLevel;
        if (filterCountry)           params.country = filterCountry;
      }
      const { data } = await axios.get(`${API}/${activeTab}`, { params });
      setEntries(data.leaderboard || []);
      if (data.weekStart) setWeekStart(data.weekStart);
    } catch (_) {
      setError('Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterTopic, filterLevel, filterCountry]);

  const fetchMyRanks = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const { data } = await axios.get(`${API}/me/${user.uid}`);
      setMyRanks(data);
    } catch (_) {}
  }, [user?.uid]);

  useEffect(() => { fetchBoard();   }, [fetchBoard]);
  useEffect(() => { fetchMyRanks(); }, [fetchMyRanks]);

  const tabMeta = TABS.find(t => t.id === activeTab);
  const top3    = useMemo(() => [entries[1] || null, entries[0] || null, entries[2] || null], [entries]); // display order 2,1,3
  const rest    = entries.slice(3);

  const rankPills = [
    { label: 'Global',  value: myRanks.globalRank,  color: '#22c55e' },
    { label: 'Arena',   value: myRanks.arenaRank,   color: '#f97316' },
    { label: 'Weekly',  value: myRanks.weeklyRank,  color: '#f5c451' },
    { label: 'Creator', value: myRanks.creatorRank, color: '#a78bfa' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#07090e', color: '#e6edf6', fontFamily: BODY, overflowX: 'hidden', position: 'relative' }}>
      <style>{STYLE}</style>

      {/* ── Top bar ── */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '20px 16px 0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            type="button" className="hof-btn" onClick={() => navigate('/world')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 16px', borderRadius: 10, border: '1px solid #263045', background: '#0f1520', color: '#c9d4e5', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            <Icon name="back" size={16} /> Back
          </button>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13, letterSpacing: '.32em', color: '#f5c451' }}>EVOWORLD</span>
            <span style={{ fontSize: 13, color: '#8a97ad' }}>Compete. Climb. Conquer.</span>
          </div>
        </div>
        <div className="hof-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', maxWidth: '100%' }}>
          {rankPills.map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, border: '1px solid #1f2838', background: '#0c111a', flexShrink: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 12, color: '#8a97ad' }}>{label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{value ? `#${value}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HERO: Hall of Fame stage ── */}
      <div style={{ position: 'relative', padding: '36px 16px 0' }}>
        <div style={{ position: 'absolute', left: '50%', top: -120, width: 1100, height: 900, marginLeft: -550, background: 'radial-gradient(ellipse at 50% 30%, rgba(245,196,81,.20), rgba(124,92,255,.10) 40%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: -40, height: 420, perspective: 600, pointerEvents: 'none', overflow: 'hidden' }}>
          <div className="hof-floor" style={{
            position: 'absolute', left: '-50%', right: '-50%', top: 0, bottom: -200,
            transform: 'rotateX(68deg)', transformOrigin: '50% 0',
            backgroundImage: 'linear-gradient(rgba(124,92,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,.35) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to bottom, transparent, #000 30%, #000 60%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 30%, #000 60%, transparent)',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(245,196,81,.45)', background: 'rgba(245,196,81,.08)', fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, letterSpacing: '.2em', color: '#f5c451' }}>
            <Icon name="trophy" size={14} /> SEASON 1 · {tabMeta.caption}
          </div>
          <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 700, fontSize: 'clamp(44px, 7vw, 92px)', lineHeight: 0.95, letterSpacing: '.04em', color: '#fff7dd', textShadow: '0 0 24px rgba(245,196,81,.55), 0 4px 0 #8a5a12, 0 8px 0 #4a2f08, 0 18px 40px rgba(0,0,0,.6)' }}>
            HALL OF FAME
          </h1>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 16, color: '#9aa7bd' }}>
            Only three names stand on the podium. Every solved problem is a step closer to yours.
          </p>

          {/* Tabs */}
          <div role="tablist" className="hof-scroll" style={{ marginTop: 18, display: 'flex', gap: 6, padding: 6, borderRadius: 14, border: '1px solid #1f2838', background: 'rgba(12,17,26,.85)', overflowX: 'auto', maxWidth: '100%' }}>
            {TABS.map(tab => {
              const on = activeTab === tab.id;
              return (
                <button
                  key={tab.id} type="button" role="tab" aria-selected={on} className="hof-btn"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 112, minHeight: 52,
                    padding: '8px 14px', borderRadius: 10, cursor: 'pointer', flexShrink: 0,
                    background: on ? '#f5c451' : 'transparent', color: on ? '#1a1205' : '#c9d4e5',
                    border: `1px solid ${on ? '#f5c451' : '#263045'}`, boxShadow: on ? '0 0 22px rgba(245,196,81,.45)' : 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: '.04em' }}>
                    <Icon name={tab.icon} size={15} /> {tab.label}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.75, whiteSpace: 'nowrap' }}>{tab.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Podium */}
        {!error && (
          <div className="hof-podium" style={{ position: 'relative', zIndex: 2, margin: '32px auto 0', maxWidth: 940, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16 }}>
            {loading ? (
              [214, 262, 194].map((h, i) => (
                <div key={i} style={{ width: 250, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="hof-skel" style={{ height: h, borderRadius: 16, opacity: 0.6 }} />
                  <div className="hof-skel" style={{ height: [150, 210, 110][i], borderRadius: 8 }} />
                </div>
              ))
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${filterTopic}-${filterLevel}-${filterCountry}`}
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16 }}
                  exit={{ opacity: 0 }}
                >
                  {top3.map((entry, i) => {
                    const place = [2, 1, 3][i];
                    return (
                      <PodiumSpot
                        key={place} entry={entry} place={place} tab={activeTab} index={i}
                        isYou={!!entry && entry.uid === user?.uid}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1040, margin: '0 auto', padding: '44px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <AnimatePresence>
          {activeTab === 'global' && (
            <FilterConsole
              open={filtersOpen} setOpen={setFiltersOpen}
              filterTopic={filterTopic}     setFilterTopic={setFilterTopic}
              filterLevel={filterLevel}     setFilterLevel={setFilterLevel}
              filterCountry={filterCountry} setFilterCountry={setFilterCountry}
            />
          )}
        </AnimatePresence>

        {activeTab === 'weekly' && weekStart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,196,81,.07)', border: '1px solid rgba(245,196,81,.3)', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#f5c451' }}>
            <Icon name="flame" size={16} />
            Week started {new Date(weekStart).toDateString()}. Resets Monday 00:00 UTC.
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: 40, borderRadius: 16, border: '1px solid #3a1f24', background: '#140b0e', color: '#ff8a8a' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="alert" size={18} /> {error}</div>
            <div>
              <button
                type="button" className="hof-btn" onClick={fetchBoard}
                style={{ marginTop: 14, height: 44, padding: '0 20px', background: '#ff6b6b1f', border: '1px solid #ff6b6b55', color: '#ff8a8a', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, borderRadius: 16, border: '1px dashed #263045', color: '#8a97ad' }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: '#e6edf6', marginBottom: 6 }}>The hall is empty</div>
            No players yet. Be the first name carved here.
          </div>
        )}

        {!loading && !error && rest.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '6px 4px 0' }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '.14em', fontSize: 14, color: '#8a97ad' }}>THE CONTENDERS</span>
              <span style={{ fontSize: 13, color: '#6b788e' }}>Ranks 4 to {entries.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rest.map((entry, i) => (
                <LeaderRow key={entry.uid} entry={entry} tab={activeTab} currentUid={user?.uid} rank={i + 4} />
              ))}
            </div>
          </>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <div key={i} className="hof-skel" style={{ height: 70, borderRadius: 14 }} />)}
          </div>
        )}

        <div style={{ textAlign: 'center', color: '#4b5568', fontSize: 12, marginTop: 6 }}>
          Rankings update in real time · Weekly board resets every Monday 00:00 UTC
        </div>
      </div>

      {user?.uid && (
        <YouAnchor user={user} userData={userData} entries={entries} myRanks={myRanks} tab={activeTab} />
      )}
    </div>
  );
}

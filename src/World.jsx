import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';

const LEVEL_NAMES = { 1:'Junior', 2:'Mid', 3:'Senior', 4:'Lead', 5:'Legend' };
const EVENT_META = {
  challenge_solved:    { icon:'✅', color:'#34d399', label:'solved a challenge'    },
  challenge_published: { icon:'📢', color:'#60a5fa', label:'published a challenge'  },
  level_up:            { icon:'🚀', color:'#fbbf24', label:'leveled up'             },
  arena_win:           { icon:'⚔️', color:'#f87171', label:'won an arena battle'   },
  challenge_attempted: { icon:'🎯', color:'#c084fc', label:'attempted a challenge'  },
  problem_solved:      { icon:'💻', color:'#22d3ee', label:'solved a problem'       },
  default:             { icon:'📌', color:'#9ca3af', label:'was active'             },
};

const DISTRICTS = [
  {
    id:'d1', num:'01', label:'CORE GAMEPLAY', accent:'#22d3ee', dim:'#0e7490',
    bg:'rgba(6,182,212,0.04)', border:'rgba(6,182,212,0.12)',
    zones:[
      { id:'game',          label:'Odyssey',       emoji:'🎮', path:'/game',           tag:'295 problems', glow:'#06b6d4', bg1:'#0c1a2e', bg2:'#071624', badge:'dailyChallenges' },
      { id:'arena',         label:'Arena',         emoji:'⚔️', path:'/arena',          tag:'1v1 PvP',      glow:'#ef4444', bg1:'#2a0a0a', bg2:'#1a0606', badge:null },
      { id:'contest',       label:'Contest',       emoji:'🏆', path:'/contest',        tag:'Weekly',       glow:'#f59e0b', bg1:'#271a04', bg2:'#1a1003', badge:null },
      { id:'lab',           label:'Lab',           emoji:'🧪', path:'/lab',            tag:'Daily',        glow:'#22d3ee', bg1:'#071a24', bg2:'#041018', badge:null },
    ],
  },
  {
    id:'d2', num:'02', label:'COMMUNITY & TOOLS', accent:'#a855f7', dim:'#7c3aed',
    bg:'rgba(168,85,247,0.04)', border:'rgba(168,85,247,0.12)',
    zones:[
      { id:'hub',           label:'Hub',           emoji:'🏢', path:'/hub',            tag:'Community',    glow:'#a855f7', bg1:'#1a0a2e', bg2:'#10061e', badge:'hubChallenges' },
      { id:'roadmap',       label:'Roadmap',       emoji:'🗺️', path:'/roadmap',        tag:'Learning',     glow:'#10b981', bg1:'#041a14', bg2:'#02100d', badge:null },
      { id:'mock-interview',label:'Mock Interview',emoji:'🎤', path:'/mock-interview', tag:'AI powered',   glow:'#818cf8', bg1:'#0c0e2e', bg2:'#07081e', badge:null },
      { id:'submissions',   label:'Submissions',   emoji:'📋', path:'/submissions',    tag:'History',      glow:'#475569', bg1:'#0d1117', bg2:'#0a0d13', badge:null },
    ],
  },
  {
    id:'d3', num:'03', label:'CAREER ZONE', accent:'#f59e0b', dim:'#d97706',
    bg:'rgba(245,158,11,0.04)', border:'rgba(245,158,11,0.12)',
    zones:[
      { id:'office',      label:'Office',     emoji:'🏛️', path:'/office',     tag:'Your stats',   glow:'#10b981', bg1:'#041a0e', bg2:'#02100a', badge:null },
      { id:'story',       label:'Story',      emoji:'📖', path:'/story',       tag:'AI narrative', glow:'#f59e0b', bg1:'#231604', bg2:'#160e02', badge:null },
      { id:'leaderboard', label:'Rankings',   emoji:'📊', path:'/leaderboard', tag:'Global',       glow:'#ec4899', bg1:'#280a1a', bg2:'#180612', badge:null },
      { id:'team-sim',    label:'Team Sim',   emoji:'👥', path:'/team-sim',    tag:'Multiplayer',  glow:'#d946ef', bg1:'#240a30', bg2:'#160620', badge:null },
    ],
  },
  {
    id:'d4', num:'04', label:'ENTERPRISE', accent:'#3b82f6', dim:'#1d4ed8',
    bg:'rgba(59,130,246,0.04)', border:'rgba(59,130,246,0.12)',
    zones:[
      { id:'company',    label:'HR Portal',  emoji:'🏢', path:'/company',    tag:'Hire devs',    glow:'#3b82f6', bg1:'#071428', bg2:'#040c1a', badge:null },
      { id:'visualizer', label:'Visualizer', emoji:'🔬', path:'/visualizer', tag:'Animations',   glow:'#8b5cf6', bg1:'#100c2e', bg2:'#09071e', badge:null },
      { id:'code-review',label:'Code Review',emoji:'🔍', path:'/code-review',tag:'Debug',        glow:'#f87171', bg1:'#240808', bg2:'#160404', badge:null },
      { id:'incident',   label:'Incident',   emoji:'🚨', path:'/incident',   tag:'Production',   glow:'#f97316', bg1:'#231008', bg2:'#160a04', badge:null },
    ],
  },
];

function timeAgo(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

// ─── Canvas Particle Background ──────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let W = c.width = window.innerWidth;
    let H = c.height = window.innerHeight * 2;
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random(),
      col: ['#22d3ee','#8b5cf6','#f59e0b','#10b981','#ef4444'][Math.floor(Math.random()*5)],
    }));
    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.a += 0.005;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        const alpha = (Math.sin(p.a) * 0.5 + 0.5) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.col + Math.floor(alpha * 255).toString(16).padStart(2,'0');
        ctx.fill();
      });
      pts.forEach((a, i) => {
        pts.slice(i + 1).forEach(b => {
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(100,120,200,${(1 - dist/120) * 0.06})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const resize = () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight * 2; };
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return (
    <canvas ref={ref} style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%', opacity: 0.6,
      pointerEvents: 'none',
    }} />
  );
}

// ─── Tilt Card ────────────────────────────────────────────────────────────────
function ZoneCard({ zone, badgeCount, onClick, i }) {
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const px = e.type === 'touchmove'
      ? e.touches[0].clientX : e.clientX;
    const py = e.type === 'touchmove'
      ? e.touches[0].clientY : e.clientY;
    setTilt({ x: ((py - cy) / r.height) * 8, y: ((px - cx) / r.width) * -8 });
  };

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: i * 0.05, duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
      whileTap={{ scale: 0.95 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMove}
      onClick={onClick}
      style={{
        background: `linear-gradient(145deg, ${zone.bg1}, ${zone.bg2})`,
        border: `1px solid ${hovered ? zone.glow + '70' : zone.glow + '25'}`,
        borderRadius: 20,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        position: 'relative',
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        boxShadow: hovered
          ? `0 20px 60px ${zone.glow}30, 0 0 0 1px ${zone.glow}50, inset 0 1px 0 rgba(255,255,255,0.1)`
          : `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Glow top accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${zone.glow}, ${zone.glow}60, transparent)`,
        opacity: hovered ? 1 : 0.6,
        transition: 'opacity 0.2s',
      }} />

      <div style={{ padding: '16px 16px 14px' }}>
        {/* Icon + badge row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <motion.div
            animate={hovered ? { scale: 1.1, rotate: [0, -5, 5, 0] } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              width: 52, height: 52, borderRadius: 16,
              background: `linear-gradient(135deg, ${zone.glow}25, ${zone.glow}10)`,
              border: `1px solid ${zone.glow}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
              boxShadow: hovered ? `0 0 20px ${zone.glow}50` : `0 0 8px ${zone.glow}20`,
              transition: 'box-shadow 0.3s',
            }}
          >
            {zone.emoji}
          </motion.div>
          {badgeCount > 0 && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                borderRadius: 20, padding: '3px 8px',
                fontSize: 10, fontWeight: 800, color: '#fff',
                boxShadow: '0 0 12px rgba(239,68,68,0.6)',
                border: '1.5px solid rgba(0,0,0,0.4)',
              }}
            >
              {badgeCount > 9 ? '9+' : badgeCount} NEW
            </motion.div>
          )}
        </div>

        {/* Name */}
        <p style={{
          margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#f1f5f9',
          letterSpacing: '0.02em', lineHeight: 1.1,
          fontFamily: "'Space Mono', monospace",
        }}>
          {zone.label}
        </p>

        {/* Tag pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: `${zone.glow}15`, border: `1px solid ${zone.glow}30`,
          borderRadius: 99, padding: '2px 8px',
        }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: zone.glow, boxShadow: `0 0 4px ${zone.glow}` }} />
          <span style={{ fontSize: 9, color: zone.glow, fontWeight: 700, letterSpacing: '0.08em' }}>
            {zone.tag.toUpperCase()}
          </span>
        </div>

        {/* Enter row */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <motion.span
            animate={hovered ? { x: 4 } : { x: 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 10, color: `${zone.glow}80`, fontWeight: 700, letterSpacing: '0.1em' }}
          >
            ENTER ›
          </motion.span>
        </div>
      </div>

      {/* Hover shimmer */}
      {hovered && (
        <motion.div
          initial={{ x: '-100%', opacity: 0 }}
          animate={{ x: '300%', opacity: [0, 0.4, 0] }}
          transition={{ duration: 0.8 }}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
            background: `linear-gradient(105deg, transparent, ${zone.glow}20, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Corner orb */}
      <div style={{
        position: 'absolute', bottom: -20, right: -20, width: 80, height: 80,
        borderRadius: '50%', background: zone.glow,
        opacity: hovered ? 0.08 : 0.04, filter: 'blur(20px)',
        pointerEvents: 'none', transition: 'opacity 0.3s',
      }} />
    </motion.button>
  );
}

// ─── District Block ───────────────────────────────────────────────────────────
function DistrictBlock({ district, badgeMap, navigate, startIndex }) {
  return (
    <div style={{ marginBottom: 24, position: 'relative' }}>
      {/* District header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, padding: '0 4px',
        }}
      >
        {/* Number badge */}
        <div style={{
          background: `linear-gradient(135deg, ${district.accent}30, ${district.accent}10)`,
          border: `1px solid ${district.accent}40`,
          borderRadius: 10, padding: '4px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 1, flexShrink: 0,
        }}>
          <span style={{ fontSize: 7, color: district.accent, fontWeight: 800, letterSpacing: '0.15em', lineHeight: 1 }}>DIST</span>
          <span style={{ fontSize: 16, fontWeight: 900, color: district.accent, lineHeight: 1, fontFamily: 'Space Mono, monospace' }}>{district.num}</span>
        </div>

        {/* Label + line */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: '#e2e8f0',
            letterSpacing: '0.08em', lineHeight: 1,
          }}>
            {district.label}
          </p>
          <div style={{ height: 1, background: `linear-gradient(to right, ${district.accent}60, transparent)` }} />
        </div>

        {/* Pulse dot */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ width: 6, height: 6, borderRadius: '50%', background: district.accent, boxShadow: `0 0 8px ${district.accent}`, flexShrink: 0 }}
        />
      </motion.div>

      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {district.zones.map((zone, i) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            i={startIndex + i}
            badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
            onClick={() => navigate(zone.path)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Feed Panel ───────────────────────────────────────────────────────────────
function FeedPanel({ onClose, user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(new Set());
  const isFirst = useRef(true);

  useEffect(() => {
    if (!user?.uid) return;
    const s = localStorage.getItem(`feed_read_${user.uid}`);
    if (s) { try { setReadIds(new Set(JSON.parse(s))); } catch {} }
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(20));
    return onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
      if (!isFirst.current) return;
      isFirst.current = false;
    });
  }, []);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 320,
        background: '#030309', borderLeft: '1px solid rgba(34,211,238,0.15)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
        boxShadow: '-30px 0 80px rgba(0,0,0,0.8)',
      }}
    >
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#22d3ee', letterSpacing: '0.16em', fontFamily: 'Space Mono,monospace' }}>📡 LIVE FEED</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <motion.span animate={{ opacity: [0.4,1,0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>Real-time</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && [...Array(4)].map((_,i) => <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.04)', borderRadius: 12 }} />)}
        {events.filter(e => e.name && e.name !== 'Unknown').map(ev => {
          const m = EVENT_META[ev.type] || EVENT_META.default;
          const unread = !readIds.has(ev.id);
          return (
            <motion.div key={ev.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: unread ? 'rgba(34,211,238,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${unread ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                {ev.photoURL ? <img src={ev.photoURL} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} /> : m.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: '#d1d5db', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{ev.name}</span>{' '}
                  <span style={{ color: m.color }}>{m.label}</span>
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 10, color: '#374151' }}>{timeAgo(ev.createdAt)} ago</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function World({ user, userData, onLogout }) {
  const navigate = useNavigate();
  const [showFeed,    setShowFeed]    = useState(false);
  const [dailyCount,  setDailyCount]  = useState(0);
  const [hubCount,    setHubCount]    = useState(0);
  const [feedPreview, setFeedPreview] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [readIds,     setReadIds]     = useState(new Set());
  const [greeting,    setGreeting]    = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    const s = localStorage.getItem(`feed_read_${user.uid}`);
    if (s) { try { setReadIds(new Set(JSON.parse(s))); } catch {} }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    axios.get(`${API_BASE}/daily-challenges/${user.uid}`)
      .then(r => setDailyCount(Math.max(0,(r.data.challenges?.length??0)-(r.data.completedCount??0))))
      .catch(()=>{});
    axios.get(`${API_BASE}/challenges`)
      .then(r => setHubCount((r.data.challenges||[]).filter(c=>!c.attemptedBy?.includes(user.uid)).length))
      .catch(()=>{});
  }, [user?.uid]);

  useEffect(() => {
    const q = query(collection(db,'activityFeed'), orderBy('createdAt','desc'), limit(6));
    return onSnapshot(q, snap => {
      setFeedPreview(snap.docs.map(d=>({id:d.id,...d.data()})));
      setFeedLoading(false);
    });
  }, []);

  const badgeMap    = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel     = userData?.level ?? 1;
  const xpCurrent   = userData?.xp    ?? 0;
  const xpTarget    = xpLevel * 500;
  const xpPct       = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const levelName   = LEVEL_NAMES[Math.min(xpLevel, 5)] || 'Legend';
  const displayName = user?.displayName || 'Developer';
  const unread      = feedPreview.filter(e => !readIds.has(e.id)).length;

  let idx = 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030309',
      color: '#fff',
      fontFamily: "'Space Mono','Courier New',monospace",
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: 90,
    }}>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <ParticleCanvas />
        {/* Ambient light pools */}
        <div style={{ position:'absolute', top:'5%',  left:'5%',  width:300, height:300, background:'#06b6d4', opacity:0.04, borderRadius:'50%', filter:'blur(80px)' }} />
        <div style={{ position:'absolute', top:'40%', right:'0%', width:280, height:280, background:'#8b5cf6', opacity:0.05, borderRadius:'50%', filter:'blur(80px)' }} />
        <div style={{ position:'absolute', bottom:'20%',left:'20%',width:240, height:240, background:'#f59e0b', opacity:0.04, borderRadius:'50%', filter:'blur(80px)' }} />
      </div>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', zIndex:10 }}>

        {/* Top nav bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 10px', gap: 10,
        }}>
          {/* Left: avatar + info */}
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
            <motion.button
              onClick={() => navigate('/profile')}
              whileTap={{ scale: 0.92 }}
              style={{
                position:'relative', flexShrink:0,
                width:44, height:44, borderRadius:'50%',
                background:'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)',
                border:'none', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:20, cursor:'pointer', padding:0,
              }}
            >
              👤
              {/* Spinning ring */}
              <motion.div
                animate={{ rotate:360 }}
                transition={{ duration:6, repeat:Infinity, ease:'linear' }}
                style={{
                  position:'absolute', inset:-3, borderRadius:'50%',
                  border:'1.5px solid transparent',
                  borderTopColor:'#22d3ee', borderRightColor:'#8b5cf6',
                }}
              />
              <span style={{
                position:'absolute', bottom:-7, left:'50%', transform:'translateX(-50%)',
                background:'#1e3a8a', borderRadius:5, fontSize:8, fontWeight:800,
                color:'#93c5fd', padding:'1px 5px', whiteSpace:'nowrap',
                border:'1px solid rgba(6,6,18,0.8)',
              }}>
                LV {xpLevel}
              </span>
            </motion.button>

            <div style={{ minWidth:0 }}>
              <p style={{ margin:0, fontSize:9, color:'#374151', letterSpacing:'0.12em', marginBottom:2 }}>
                {greeting.toUpperCase()},
              </p>
              <p style={{
                margin:0, fontSize:13, fontWeight:800, color:'#f1f5f9',
                letterSpacing:'0.04em', lineHeight:1.1,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>
                {displayName.toUpperCase()}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:8, color:'#4b5563', letterSpacing:'0.06em' }}>
                {levelName.toUpperCase()} · {userData?.elo ?? 1000} ELO
              </p>
            </div>
          </div>

          {/* Right: chips + icons */}
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, padding:'5px 8px', fontSize:10, fontWeight:800, color:'#fbbf24', whiteSpace:'nowrap' }}>
              ⚡ {xpCurrent}
            </div>
            <div style={{ background:'rgba(163,230,53,0.08)', border:'1px solid rgba(163,230,53,0.18)', borderRadius:8, padding:'5px 8px', fontSize:10, fontWeight:800, color:'#a3e635', whiteSpace:'nowrap' }}>
              💰 {userData?.credits ?? 0}
            </div>
            <NotificationBell user={user} />
            <button
              onClick={() => setShowFeed(p=>!p)}
              style={{ position:'relative', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:8, padding:'6px 8px', color:'#22d3ee', cursor:'pointer', fontSize:14 }}
            >
              📡
              {unread > 0 && (
                <span style={{ position:'absolute', top:-5, right:-5, width:16, height:16, borderRadius:'50%', background:'#f59e0b', color:'#000', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {unread}
                </span>
              )}
            </button>
            <button onClick={onLogout} style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)', color:'#f87171', borderRadius:8, padding:'6px 8px', cursor:'pointer', fontSize:14 }}>🚪</button>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ padding:'0 16px 10px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:8, color:'#1e293b', letterSpacing:'0.12em' }}>XP LEVEL {xpLevel}</span>
            <span style={{ fontSize:8, color:'#1e293b', letterSpacing:'0.08em' }}>{xpPct}% → LEVEL {xpLevel+1}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', position:'relative' }}>
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${xpPct}%` }}
              transition={{ duration:1.8, type:'spring', stiffness:60, damping:20 }}
              style={{
                height:'100%', borderRadius:99,
                background:'linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899)',
                boxShadow:'0 0 12px rgba(139,92,246,0.9)',
              }}
            />
            <motion.div
              animate={{ x:['0%','300%'] }}
              transition={{ duration:2.5, repeat:Infinity, repeatDelay:3, ease:'easeInOut' }}
              style={{ position:'absolute', top:0, bottom:0, width:'30%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
            />
          </div>
        </div>

        {/* Stats HUD */}
        <div style={{ margin:'0 16px 16px' }}>
          <div style={{
            display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6,
            background:'rgba(255,255,255,0.025)',
            border:'1px solid rgba(255,255,255,0.05)',
            borderRadius:16, padding:'12px 8px',
          }}>
            {[
              { e:'🔥', v:`${userData?.currentStreak||0}d`, c:'#fb923c', l:'STREAK' },
              { e:'✅', v: userData?.problemsSolved||0,      c:'#34d399', l:'SOLVED' },
              { e:'⚔️', v: userData?.arenaWins||0,           c:'#f87171', l:'WINS'   },
              { e:'🏆', v: userData?.elo||1000,              c:'#fbbf24', l:'ELO'    },
              { e:'💰', v: userData?.credits||0,             c:'#a3e635', l:'CREDS'  },
              { e:'📊', v:`#${userData?.rank||'?'}`,         c:'#c084fc', l:'RANK'   },
            ].map(s => (
              <div key={s.l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:13, lineHeight:1 }}>{s.e}</div>
                <div style={{ fontSize:12, fontWeight:800, color:s.c, lineHeight:1.3, marginTop:3 }}>{s.v}</div>
                <div style={{ fontSize:7, color:'#1e293b', letterSpacing:'0.08em', marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── World label ───────────────────────────────────────────────────── */}
      <div style={{ position:'relative', zIndex:10, padding:'0 16px 20px', display:'flex', alignItems:'center', gap:14 }}>
        <motion.div
          animate={{ rotate:[0,360] }}
          transition={{ duration:20, repeat:Infinity, ease:'linear' }}
          style={{
            width:38, height:38, borderRadius:'50%',
            background:'rgba(6,182,212,0.1)',
            border:'1px solid rgba(6,182,212,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, flexShrink:0,
            boxShadow:'0 0 24px rgba(6,182,212,0.2)',
          }}
        >
          🌐
        </motion.div>
        <div>
          <p style={{ margin:0, fontSize:9, color:'#374151', letterSpacing:'0.16em' }}>NAVIGATE TO</p>
          <p style={{ margin:0, fontSize:15, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.04em' }}>EVOWORLD</p>
        </div>
        <div style={{ flex:1, height:1, background:'linear-gradient(to right, rgba(6,182,212,0.3), transparent)' }} />
      </div>

      {/* ── Districts ─────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', zIndex:10, padding:'0 16px' }}>
        {DISTRICTS.map(d => {
          const si = idx;
          idx += d.zones.length;
          return (
            <DistrictBlock
              key={d.id}
              district={d}
              badgeMap={badgeMap}
              navigate={navigate}
              startIndex={si}
            />
          );
        })}
      </div>

      {/* ── Feed ticker ───────────────────────────────────────────────────── */}
      {!showFeed && !feedLoading && feedPreview.filter(e=>e.name&&e.name!=='Unknown').length > 0 && (
        <div style={{
          position:'fixed', bottom:60, left:0, right:0, zIndex:20,
          background:'rgba(3,3,9,0.9)', backdropFilter:'blur(20px)',
          borderTop:'1px solid rgba(34,211,238,0.12)',
          padding:'7px 16px', display:'flex', alignItems:'center', gap:10,
        }}>
          <motion.span
            animate={{ opacity:[0.5,1,0.5] }}
            transition={{ duration:1.5, repeat:Infinity }}
            style={{ width:6, height:6, borderRadius:'50%', background:'#34d399', flexShrink:0, display:'inline-block' }}
          />
          <div style={{ overflow:'hidden', flex:1 }}>
            <motion.div
              animate={{ x:[0,-900] }}
              transition={{ duration:28, repeat:Infinity, ease:'linear' }}
              style={{ display:'flex', gap:48, whiteSpace:'nowrap', fontSize:11 }}
            >
              {[...feedPreview,...feedPreview]
                .filter(e=>e.name&&e.name!=='Unknown')
                .map((ev,i) => {
                  const m = EVENT_META[ev.type]||EVENT_META.default;
                  return (
                    <span key={`${ev.id}-${i}`}>
                      <span style={{ color:'#6b7280' }}>{m.icon} </span>
                      <span style={{ color:'#e2e8f0', fontWeight:700 }}>{ev.name}</span>
                      <span style={{ color:m.color }}> {m.label}</span>
                      <span style={{ color:'#1e293b' }}> · {timeAgo(ev.createdAt)}</span>
                    </span>
                  );
                })}
            </motion.div>
          </div>
          <button onClick={()=>setShowFeed(true)} style={{ color:'#22d3ee', background:'none', border:'none', cursor:'pointer', flexShrink:0, fontSize:14 }}>→</button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div key="bd" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setShowFeed(false)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:40 }} />
            <FeedPanel key="fp" onClose={()=>setShowFeed(false)} user={user} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

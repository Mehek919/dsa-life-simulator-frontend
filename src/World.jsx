import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from './NotificationBell';
import axios from 'axios';
import API_BASE from './config';

const LEVEL_NAMES = { 1:'Junior',2:'Mid',3:'Senior',4:'Lead',5:'Legend' };
const EVENT_META = {
  challenge_solved:    { icon:'✅', color:'#34d399', label:'solved a challenge'   },
  challenge_published: { icon:'📢', color:'#60a5fa', label:'published a challenge' },
  level_up:            { icon:'🚀', color:'#fbbf24', label:'leveled up'            },
  arena_win:           { icon:'⚔️', color:'#ff4060', label:'won an arena battle'  },
  challenge_attempted: { icon:'🎯', color:'#c084fc', label:'attempted a challenge' },
  problem_solved:      { icon:'💻', color:'#00d4ff', label:'solved a problem'      },
  default:             { icon:'📌', color:'#9ca3af', label:'was active'            },
};

// ─── Color psychology + threat mapping ───────────────────────────────────────
// threat 1=calm, 2=active, 3=hot, 4=dangerous, 5=critical
const DISTRICTS = [
  { id:'d1', num:'01', name:'CORE GAMEPLAY', accent:'#00d4ff', shadow:'rgba(0,212,255,0.15)', zones:[
    { id:'game',           label:'Odyssey',        emoji:'🎮', path:'/game',           glow:'#00d4ff', iconBg:'#001828', cardBg:'#000d18', threat:2, tag:'MAIN QUEST',   badge:'dailyChallenges', shape:'hex'    },
    { id:'arena',          label:'Arena',          emoji:'⚔️', path:'/arena',          glow:'#ff1a3e', iconBg:'#2a0010', cardBg:'#180009', threat:5, tag:'COMBAT ZONE',  badge:null,              shape:'angular' },
    { id:'contest',        label:'Contest',        emoji:'🏆', path:'/contest',        glow:'#ffd700', iconBg:'#251800', cardBg:'#160e00', threat:3, tag:'GLORY',        badge:null,              shape:'round'  },
    { id:'lab',            label:'Lab',            emoji:'🧪', path:'/lab',            glow:'#00ff9f', iconBg:'#001a0e', cardBg:'#000d08', threat:2, tag:'EXPERIMENTAL', badge:null,              shape:'hex'    },
  ]},
  { id:'d2', num:'02', name:'COMMUNITY & TOOLS', accent:'#bf5fff', shadow:'rgba(168,85,247,0.15)', zones:[
    { id:'hub',            label:'Hub',            emoji:'🏢', path:'/hub',            glow:'#bf5fff', iconBg:'#160028', cardBg:'#0e0018', threat:2, tag:'COMMUNITY',    badge:'hubChallenges',   shape:'round'  },
    { id:'roadmap',        label:'Roadmap',        emoji:'🗺️', path:'/roadmap',        glow:'#00e5d4', iconBg:'#00181a', cardBg:'#000e10', threat:1, tag:'YOUR PATH',    badge:null,              shape:'hex'    },
    { id:'mock-interview', label:'Mock Interview', emoji:'🎤', path:'/mock-interview', glow:'#818cf8', iconBg:'#080e2a', cardBg:'#04071a', threat:2, tag:'AI POWERED',   badge:null,              shape:'round'  },
    { id:'submissions',    label:'Submissions',    emoji:'📋', path:'/submissions',    glow:'#64748b', iconBg:'#0d1117', cardBg:'#080c11', threat:1, tag:'HISTORY',      badge:null,              shape:'square' },
  ]},
  { id:'d3', num:'03', name:'CAREER ZONE', accent:'#ffd700', shadow:'rgba(255,215,0,0.12)', zones:[
    { id:'office',         label:'Office',         emoji:'🏛️', path:'/office',         glow:'#22c55e', iconBg:'#001a0a', cardBg:'#000d06', threat:1, tag:'COMMAND',      badge:null,              shape:'square' },
    { id:'story',          label:'Story',          emoji:'📖', path:'/story',           glow:'#f59e0b', iconBg:'#1e1200', cardBg:'#120b00', threat:1, tag:'NARRATIVE',    badge:null,              shape:'round'  },
    { id:'leaderboard',    label:'Rankings',       emoji:'📊', path:'/leaderboard',    glow:'#ff69b4', iconBg:'#200018', cardBg:'#14000f', threat:3, tag:'HALL OF FAME', badge:null,              shape:'round'  },
    { id:'team-sim',       label:'Team Sim',       emoji:'👥', path:'/team-sim',       glow:'#e879f9', iconBg:'#1e0028', cardBg:'#130019', threat:2, tag:'MULTIPLAYER',  badge:null,              shape:'round'  },
  ]},
  { id:'d4', num:'04', name:'ENTERPRISE OPS', accent:'#ff6b2b', shadow:'rgba(251,146,60,0.12)', zones:[
    { id:'company',        label:'HR Portal',      emoji:'🏢', path:'/company',        glow:'#60a5fa', iconBg:'#001428', cardBg:'#000c1a', threat:1, tag:'RECRUIT',      badge:null,              shape:'square' },
    { id:'visualizer',     label:'Visualizer',     emoji:'🔬', path:'/visualizer',     glow:'#a78bfa', iconBg:'#0e0020', cardBg:'#080016', threat:2, tag:'ANALYZE',      badge:null,              shape:'hex'    },
    { id:'code-review',    label:'Code Review',    emoji:'🔍', path:'/code-review',    glow:'#fb923c', iconBg:'#200a00', cardBg:'#150600', threat:3, tag:'WARNING',      badge:null,              shape:'angular' },
    { id:'incident',       label:'Incident',       emoji:'🚨', path:'/incident',       glow:'#ff0000', iconBg:'#2a0000', cardBg:'#1a0000', threat:5, tag:'EMERGENCY',    badge:null,              shape:'angular' },
  ]},
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

// ─── BGMI-quality radar + star canvas ────────────────────────────────────────
function TacticalCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    let W = c.width = c.offsetWidth;
    let H = c.height = c.offsetHeight;
    let angle = 0;
    let raf;

    // Stars
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.3 + 0.05,
      col: ['#00d4ff','#bf5fff','#ffd700','#00ff9f','#ff4060','#ffffff'][Math.floor(Math.random()*6)],
    }));

    // Grid nodes
    const nodes = [];
    const gapX = 70, gapY = 70;
    for (let x = 0; x < W; x += gapX) {
      for (let y = 0; y < H; y += gapY) {
        if (Math.random() > 0.55) {
          nodes.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            pulse: Math.random() * Math.PI * 2,
            col: ['#00d4ff','#bf5fff','#00ff9f','#ffd700','#ff4060'][Math.floor(Math.random()*5)],
          });
        }
      }
    }

    // Shooting stars
    const shooters = [];
    function spawnShooter() {
      shooters.push({
        x: Math.random() * W,
        y: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        len: Math.random() * 60 + 30,
        life: 1,
        col: ['#00d4ff','#bf5fff','#ffffff'][Math.floor(Math.random()*3)],
      });
    }
    setInterval(spawnShooter, 2000);

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Dark gradient base
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#000308');
      bg.addColorStop(0.5, '#000510');
      bg.addColorStop(1, '#000208');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Hex grid
      const hexR = 38;
      const hexW = hexR * Math.sqrt(3);
      const hexH = hexR * 2;
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 0.5;
      for (let row = -1; row < H / (hexH * 0.75) + 1; row++) {
        for (let col = -1; col < W / hexW + 1; col++) {
          const x = col * hexW + (row % 2) * hexW / 2;
          const y = row * hexH * 0.75;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = Math.PI / 180 * (60 * i - 30);
            const px = x + hexR * Math.cos(a);
            const py = y + hexR * Math.sin(a);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Grid connecting lines (faint)
      nodes.forEach((a, i) => {
        nodes.slice(i + 1, i + 4).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,212,255,${(1 - d / 130) * 0.06})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        });
      });

      // Stars
      stars.forEach(s => {
        s.a += s.speed * 0.01;
        const alpha = (Math.sin(s.a) * 0.5 + 0.5) * 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.col + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // Shooting stars
      for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        s.x += s.vx; s.y += s.vy; s.life -= 0.02;
        if (s.life <= 0 || s.y > H) { shooters.splice(i, 1); continue; }
        const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * s.len / s.vy, s.y - s.len);
        g.addColorStop(0, s.col + Math.floor(s.life * 200).toString(16).padStart(2,'0'));
        g.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * s.len / s.vy, s.y - s.len);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Radar sweep
      const cx = W * 0.85, cy = H * 0.15, rr = 80;
      angle += 0.015;

      // Radar circles
      [1, 0.67, 0.33].forEach((f, i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, rr * f, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,255,100,${0.06 - i * 0.015})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Radar crosshairs
      ctx.strokeStyle = 'rgba(0,255,100,0.06)';
      ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(cx - rr, cy); ctx.lineTo(cx + rr, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - rr); ctx.lineTo(cx, cy + rr); ctx.stroke();

      // Radar sweep fill
      const sweep = ctx.createConicalGradient ? null : null;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      const swg = ctx.createLinearGradient(0, 0, rr, 0);
      swg.addColorStop(0, 'rgba(0,255,100,0.25)');
      swg.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rr, -0.6, 0);
      ctx.closePath();
      ctx.fillStyle = swg;
      ctx.fill();
      // Sweep line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(rr, 0);
      ctx.strokeStyle = 'rgba(0,255,100,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Radar blips
      nodes.slice(0, 6).forEach((n, i) => {
        const bx = cx + Math.cos(i * 1.05) * rr * 0.4;
        const by = cy + Math.sin(i * 0.8) * rr * 0.3;
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,100,${0.4 + Math.sin(Date.now() * 0.003 + i) * 0.3})`;
        ctx.fill();
      });

      // Pulsing nodes
      nodes.forEach(n => {
        n.pulse += 0.04;
        const a = (Math.sin(n.pulse) * 0.5 + 0.5) * 0.8;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = n.col + Math.floor(a * 200).toString(16).padStart(2, '0');
        ctx.fill();
        // Outer ring
        if (a > 0.5) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, 4 + (1 - a) * 6, 0, Math.PI * 2);
          ctx.strokeStyle = n.col + '20';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });

      raf = requestAnimationFrame(draw);
    }
    draw();
    const onResize = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 0,
    }} />
  );
}

// ─── Zone Icon — unique shape + color per zone ─────────────────────────────────
function ZoneIcon({ zone, hovered, size = 56 }) {
  const threat = zone.threat;

  // Shape: angular=diamond clip, hex=hexagonal clip, round=circle, square=rounded square
  const borderRadius = {
    angular: '6px 18px 6px 18px',
    hex:     '10px 18px 10px 18px',
    round:   '50%',
    square:  '14px',
  }[zone.shape] || '14px';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Outer pulse ring — only for threat 4-5 */}
      {threat >= 4 && (
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: threat === 5 ? 1 : 1.8, repeat: Infinity }}
          style={{
            position: 'absolute', inset: -6, borderRadius,
            border: `1px solid ${zone.glow}`,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Mid ring */}
      {threat >= 3 && (
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          style={{
            position: 'absolute', inset: -3, borderRadius,
            border: `1px solid ${zone.glow}60`,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Icon body */}
      <motion.div
        animate={hovered ? { scale: 1.08 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: '100%', height: '100%', borderRadius,
          background: `linear-gradient(145deg, ${zone.iconBg}, ${zone.cardBg})`,
          border: `1.5px solid ${zone.glow}${hovered ? 'cc' : '50'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.48,
          boxShadow: hovered
            ? `0 0 0 1px ${zone.glow}40, 0 0 24px ${zone.glow}60, inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 0 12px ${zone.glow}30, inset 0 1px 0 rgba(255,255,255,0.05)`,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {zone.emoji}
        {/* Inner shimmer */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.07), transparent)',
          borderRadius: borderRadius,
          pointerEvents: 'none',
        }} />
      </motion.div>

      {/* Threat indicator dot */}
      {threat >= 3 && (
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: threat === 5 ? 0.6 : 1.5, repeat: Infinity }}
          style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 8, height: 8, borderRadius: '50%',
            background: threat === 5 ? '#ff0000' : threat === 4 ? '#ff6600' : '#ffd700',
            border: '1.5px solid #030309',
            boxShadow: `0 0 6px ${threat === 5 ? '#ff0000' : '#ffd700'}`,
          }}
        />
      )}
    </div>
  );
}

// ─── Zone Card ─────────────────────────────────────────────────────────────────
function ZoneCard({ zone, badgeCount, onClick, delay }) {
  const [hovered, setHovered] = useState(false);

  const threatLabel = {
    1: null,
    2: null,
    3: { text: 'HOT', color: '#ffd700', bg: 'rgba(255,215,0,0.15)' },
    4: { text: 'DANGER', color: '#ff6600', bg: 'rgba(255,102,0,0.15)' },
    5: { text: '⚠ CRITICAL', color: '#ff0000', bg: 'rgba(255,0,0,0.15)' },
  }[zone.threat];

  return (
    <motion.button
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, type: 'spring', stiffness: 180, damping: 22 }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.94 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: `linear-gradient(160deg, ${zone.cardBg}, #030309)`,
        border: `1px solid ${hovered ? zone.glow + '60' : zone.glow + '22'}`,
        borderRadius: 18,
        padding: 0, overflow: 'hidden',
        cursor: 'pointer', width: '100%', textAlign: 'left',
        position: 'relative',
        boxShadow: hovered
          ? `0 16px 48px ${zone.glow}25, 0 0 0 1px ${zone.glow}30`
          : `0 4px 16px rgba(0,0,0,0.5)`,
        transition: 'border-color 0.2s, box-shadow 0.25s',
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${zone.glow}, ${zone.glow}40, transparent)`,
        opacity: hovered ? 1 : 0.7,
        transition: 'opacity 0.2s',
      }} />

      <div style={{ padding: '14px 14px 12px' }}>
        {/* Icon + badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <ZoneIcon zone={zone} hovered={hovered} size={52} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            {badgeCount > 0 && (
              <motion.div
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  borderRadius: 20, padding: '3px 8px',
                  fontSize: 9, fontWeight: 800, color: '#fff',
                  boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                  border: '1px solid rgba(0,0,0,0.4)',
                  whiteSpace: 'nowrap',
                }}
              >
                {badgeCount} NEW
              </motion.div>
            )}
            {threatLabel && (
              <div style={{
                background: threatLabel.bg,
                border: `1px solid ${threatLabel.color}40`,
                borderRadius: 6, padding: '2px 6px',
                fontSize: 8, fontWeight: 800, color: threatLabel.color,
                letterSpacing: '0.1em',
              }}>
                {threatLabel.text}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <p style={{
          margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#f1f5f9',
          letterSpacing: '0.03em', lineHeight: 1.1,
          fontFamily: 'Space Mono, monospace',
        }}>
          {zone.label}
        </p>

        {/* Tag + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: `${zone.glow}12`,
            border: `1px solid ${zone.glow}30`,
            borderRadius: 99, padding: '3px 8px',
          }}>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 4, height: 4, borderRadius: '50%', background: zone.glow }}
            />
            <span style={{ fontSize: 8, color: zone.glow, fontWeight: 800, letterSpacing: '0.1em' }}>
              {zone.tag}
            </span>
          </div>
          <motion.span
            animate={hovered ? { x: 3, opacity: 1 } : { x: 0, opacity: 0.4 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 14, color: zone.glow }}
          >
            ›
          </motion.span>
        </div>
      </div>

      {/* Hover shimmer sweep */}
      {hovered && (
        <motion.div
          initial={{ x: '-100%' }} animate={{ x: '300%' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: '40%',
            background: `linear-gradient(105deg, transparent, ${zone.glow}18, transparent)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Bottom corner glow */}
      <div style={{
        position: 'absolute', bottom: -16, right: -16, width: 64, height: 64,
        borderRadius: '50%', background: zone.glow,
        opacity: hovered ? 0.1 : 0.04, filter: 'blur(16px)',
        pointerEvents: 'none', transition: 'opacity 0.3s',
      }} />
    </motion.button>
  );
}

// ─── District Block ────────────────────────────────────────────────────────────
function DistrictBlock({ district, badgeMap, navigate, baseDelay }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: baseDelay }}
      style={{ marginBottom: 28 }}
    >
      {/* District header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '0 2px' }}>
        {/* Number box */}
        <div style={{
          background: `linear-gradient(135deg, ${district.accent}20, ${district.accent}08)`,
          border: `1px solid ${district.accent}40`,
          borderRadius: 10, padding: '5px 10px',
          textAlign: 'center', flexShrink: 0,
        }}>
          <p style={{ margin: 0, fontSize: 6, color: district.accent, fontWeight: 800, letterSpacing: '0.2em', lineHeight: 1 }}>DIST</p>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: district.accent, lineHeight: 1.1, fontFamily: 'Space Mono,monospace' }}>{district.num}</p>
        </div>
        {/* Name + line */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.1em', lineHeight: 1 }}>
            {district.name}
          </p>
          <div style={{ height: 1, background: `linear-gradient(to right, ${district.accent}80, transparent)` }} />
        </div>
        {/* Pulse dot */}
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: district.accent, boxShadow: `0 0 8px ${district.accent}`, flexShrink: 0 }}
        />
      </div>

      {/* 2-col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {district.zones.map((zone, i) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            delay={baseDelay + i * 0.05}
            badgeCount={zone.badge ? (badgeMap[zone.badge] ?? 0) : 0}
            onClick={() => navigate(zone.path)}
          />
        ))}
      </div>
    </motion.div>
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
      isFirst.current = false;
    });
  }, []);

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: '100%', maxWidth: 320,
        background: 'rgba(3,3,9,0.98)', backdropFilter: 'blur(24px)',
        borderLeft: '1px solid rgba(0,212,255,0.15)',
        zIndex: 60, display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 80px rgba(0,0,0,0.8)',
      }}
    >
      <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#00d4ff', letterSpacing: '0.16em', fontFamily: 'Space Mono,monospace' }}>📡 LIVE INTEL</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff9f', display: 'inline-block' }} />
            <span style={{ fontSize: 9, color: '#00ff9f', fontWeight: 700, letterSpacing: '0.1em' }}>REAL-TIME</span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && [...Array(5)].map((_,i) => <div key={i} style={{ height: 60, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }} />)}
        {events.filter(e => e.name && e.name !== 'Unknown').map(ev => {
          const m = EVENT_META[ev.type] || EVENT_META.default;
          const unread = !readIds.has(ev.id);
          return (
            <motion.div key={ev.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: unread ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)', border: `1px solid ${unread ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }}>
                {ev.photoURL ? <img src={ev.photoURL} alt="" style={{ width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover' }} /> : m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
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

// ─── World ─────────────────────────────────────────────────────────────────────
export default function World({ user, userData, onLogout }) {
  const navigate = useNavigate();
  const [showFeed, setShowFeed]       = useState(false);
  const [dailyCount, setDailyCount]   = useState(0);
  const [hubCount, setHubCount]       = useState(0);
  const [feedPreview, setFeedPreview] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [readIds, setReadIds]         = useState(new Set());
  const [greeting, setGreeting]       = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'GOOD MORNING' : h < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING');
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
    const q = query(collection(db,'activityFeed'),orderBy('createdAt','desc'),limit(6));
    return onSnapshot(q, snap => {
      setFeedPreview(snap.docs.map(d=>({id:d.id,...d.data()})));
      setFeedLoading(false);
    });
  }, []);

  const badgeMap  = { dailyChallenges: dailyCount, hubChallenges: hubCount };
  const xpLevel   = userData?.level ?? 1;
  const xpCurrent = userData?.xp    ?? 0;
  const xpTarget  = xpLevel * 500;
  const xpPct     = Math.min(100, Math.round((xpCurrent / xpTarget) * 100));
  const levelName = LEVEL_NAMES[Math.min(xpLevel, 5)] || 'Legend';
  const name      = user?.displayName || 'Developer';
  const unread    = feedPreview.filter(e => !readIds.has(e.id)).length;

  return (
    <div style={{
      minHeight: '100vh', background: '#030309',
      color: '#fff', overflowX: 'hidden',
      fontFamily: "'Space Mono','Courier New',monospace",
      paddingBottom: 88, position: 'relative',
    }}>
      {/* CANVAS BG */}
      <TacticalCanvas />

      {/* CONTENT */}
      <div style={{ position: 'relative', zIndex: 10 }}>

        {/* ── NAV BAR ──────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px', gap:10 }}>
          {/* Avatar block */}
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
            <motion.button
              onClick={() => navigate('/profile')}
              whileTap={{ scale: 0.9 }}
              style={{
                position:'relative', flexShrink:0,
                width:46, height:46, borderRadius:'50%',
                background:'linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)',
                border:'none', padding:0, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:22, boxShadow:'0 0 20px rgba(249,115,22,0.35)',
              }}
            >
              👤
              <motion.div animate={{ rotate:360 }} transition={{ duration:5, repeat:Infinity, ease:'linear' }}
                style={{ position:'absolute', inset:-3, borderRadius:'50%', border:'1.5px solid transparent', borderTopColor:'#00d4ff', borderRightColor:'#bf5fff' }} />
              <span style={{ position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)', background:'#0f172a', border:'1px solid rgba(0,212,255,0.3)', borderRadius:6, fontSize:8, fontWeight:800, color:'#00d4ff', padding:'1px 5px', whiteSpace:'nowrap', letterSpacing:'0.06em' }}>
                LV {xpLevel}
              </span>
            </motion.button>

            <div style={{ minWidth:0 }}>
              <p style={{ margin:0, fontSize:8, color:'#1e3a5f', letterSpacing:'0.14em', marginBottom:1 }}>{greeting}</p>
              <p style={{ margin:0, fontSize:12, fontWeight:800, color:'#f1f5f9', letterSpacing:'0.05em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {name.toUpperCase()}
              </p>
              <p style={{ margin:'2px 0 0', fontSize:8, color:'#1e3a8a', letterSpacing:'0.08em' }}>
                {levelName.toUpperCase()} · {userData?.elo ?? 1000} ELO
              </p>
            </div>
          </div>

          {/* Right chips */}
          <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            <div style={{ background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:8, padding:'5px 8px', fontSize:10, fontWeight:800, color:'#00d4ff', whiteSpace:'nowrap' }}>⚡ {xpCurrent}</div>
            <div style={{ background:'rgba(255,215,0,0.08)', border:'1px solid rgba(255,215,0,0.2)', borderRadius:8, padding:'5px 8px', fontSize:10, fontWeight:800, color:'#ffd700', whiteSpace:'nowrap' }}>💰 {userData?.credits ?? 0}</div>
            <NotificationBell user={user} />
            <button onClick={() => setShowFeed(p=>!p)}
              style={{ position:'relative', background:'rgba(0,255,100,0.06)', border:'1px solid rgba(0,255,100,0.2)', borderRadius:8, padding:'6px 8px', color:'#00ff64', cursor:'pointer', fontSize:14 }}>
              📡
              {unread > 0 && <span style={{ position:'absolute', top:-5, right:-5, width:16, height:16, borderRadius:'50%', background:'#f59e0b', color:'#000', fontSize:9, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>{unread}</span>}
            </button>
            <button onClick={onLogout} style={{ background:'rgba(255,0,60,0.08)', border:'1px solid rgba(255,0,60,0.2)', color:'#ff1a3e', borderRadius:8, padding:'6px 8px', cursor:'pointer', fontSize:14 }}>🚪</button>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ padding:'0 16px 12px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:8, color:'#0f2744', letterSpacing:'0.14em' }}>XP LEVEL {xpLevel}</span>
            <span style={{ fontSize:8, color:'#0f2744', letterSpacing:'0.1em' }}>{xpPct}% → LEVEL {xpLevel+1}</span>
          </div>
          <div style={{ height:5, background:'rgba(255,255,255,0.04)', borderRadius:99, overflow:'hidden', position:'relative' }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${xpPct}%` }}
              transition={{ duration:2, type:'spring', stiffness:50, damping:18 }}
              style={{ height:'100%', borderRadius:99, background:'linear-gradient(90deg,#00d4ff,#bf5fff,#ff1a3e)', boxShadow:'0 0 16px rgba(191,95,255,0.9)' }} />
            <motion.div animate={{ x:['0%','400%'] }} transition={{ duration:3, repeat:Infinity, repeatDelay:2, ease:'easeInOut' }}
              style={{ position:'absolute', top:0, bottom:0, width:'25%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)' }} />
          </div>
        </div>

        {/* Stats HUD */}
        <div style={{ margin:'0 16px 18px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:16, padding:'12px 8px', backdropFilter:'blur(10px)' }}>
            {[
              { e:'🔥', v:`${userData?.currentStreak||0}d`, c:'#fb923c', l:'STREAK' },
              { e:'✅', v: userData?.problemsSolved||0,      c:'#00ff9f', l:'SOLVED' },
              { e:'⚔️', v: userData?.arenaWins||0,           c:'#ff1a3e', l:'WINS'   },
              { e:'🏆', v: userData?.elo||1000,              c:'#ffd700', l:'ELO'    },
              { e:'💰', v: userData?.credits||0,             c:'#bf5fff', l:'CREDS'  },
              { e:'📊', v:`#${userData?.rank||'?'}`,         c:'#ff69b4', l:'RANK'   },
            ].map(s => (
              <div key={s.l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:12, lineHeight:1 }}>{s.e}</div>
                <div style={{ fontSize:11, fontWeight:800, color:s.c, lineHeight:1.4, marginTop:3 }}>{s.v}</div>
                <div style={{ fontSize:7, color:'#0f2744', letterSpacing:'0.08em', marginTop:2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* World label row */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 16px 20px' }}>
          <motion.div animate={{ rotate:[0,360] }} transition={{ duration:30, repeat:Infinity, ease:'linear' }}
            style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 0 20px rgba(0,212,255,0.2)', flexShrink:0 }}>
            🌐
          </motion.div>
          <div>
            <p style={{ margin:0, fontSize:8, color:'#0f2744', letterSpacing:'0.18em' }}>NAVIGATE TO</p>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color:'#e2e8f0', letterSpacing:'0.08em' }}>EVOWORLD MAP</p>
          </div>
          <div style={{ flex:1, height:1, background:'linear-gradient(to right,rgba(0,212,255,0.4),transparent)' }} />
          <motion.div animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:2, repeat:Infinity }}
            style={{ fontSize:8, color:'#00d4ff', fontWeight:700, letterSpacing:'0.1em', flexShrink:0 }}>
            ● ONLINE
          </motion.div>
        </div>

        {/* Districts */}
        <div style={{ padding:'0 16px' }}>
          {DISTRICTS.map((d, di) => (
            <DistrictBlock
              key={d.id}
              district={d}
              badgeMap={badgeMap}
              navigate={navigate}
              baseDelay={di * 0.1}
            />
          ))}
        </div>
      </div>

      {/* Feed ticker */}
      {!showFeed && !feedLoading && feedPreview.filter(e=>e.name&&e.name!=='Unknown').length > 0 && (
        <div style={{ position:'fixed', bottom:60, left:0, right:0, zIndex:20, background:'rgba(3,3,9,0.92)', backdropFilter:'blur(20px)', borderTop:'1px solid rgba(0,255,100,0.1)', padding:'6px 16px', display:'flex', alignItems:'center', gap:10 }}>
          <motion.span animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1.2, repeat:Infinity }}
            style={{ width:6, height:6, borderRadius:'50%', background:'#00ff9f', flexShrink:0, display:'inline-block' }} />
          <div style={{ overflow:'hidden', flex:1 }}>
            <motion.div animate={{ x:[0,-1000] }} transition={{ duration:30, repeat:Infinity, ease:'linear' }}
              style={{ display:'flex', gap:52, whiteSpace:'nowrap', fontSize:11 }}>
              {[...feedPreview,...feedPreview].filter(e=>e.name&&e.name!=='Unknown').map((ev,i)=>{
                const m = EVENT_META[ev.type]||EVENT_META.default;
                return (
                  <span key={`${ev.id}-${i}`}>
                    <span style={{ color:'#4b5563' }}>{m.icon} </span>
                    <span style={{ color:'#e2e8f0', fontWeight:700 }}>{ev.name}</span>
                    <span style={{ color:m.color }}> {m.label}</span>
                    <span style={{ color:'#1e293b' }}> · {timeAgo(ev.createdAt)}</span>
                  </span>
                );
              })}
            </motion.div>
          </div>
          <button onClick={()=>setShowFeed(true)} style={{ color:'#00d4ff', background:'none', border:'none', cursor:'pointer', fontSize:14, flexShrink:0 }}>→</button>
        </div>
      )}

      <AnimatePresence>
        {showFeed && (
          <>
            <motion.div key="bd" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setShowFeed(false)}
              style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:50 }} />
            <FeedPanel key="fp" onClose={()=>setShowFeed(false)} user={user} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

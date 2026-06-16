import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
const SKILL_LEVELS = [
  { level: 0, name: 'Novice',       color: '#555',    badge: '🌱' },
  { level: 1, name: 'Beginner',     color: '#00c896', badge: '🔰' },
  { level: 2, name: 'Intermediate', color: '#1a73e8', badge: '⚡' },
  { level: 3, name: 'Advanced',     color: '#a855f7', badge: '🔥' },
  { level: 4, name: 'Expert',       color: '#f5c542', badge: '💎' },
  { level: 5, name: 'Master',       color: '#ff4d4d', badge: '👑' },
];
function RadarChart({ skills }) {
  const top8    = skills.slice(0, 8);
  const N       = top8.length;
  const cx      = 150, cy = 150, r = 110;
  const levels  = [20, 40, 60, 80, 100];

  const getPoint = (i, pct) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const dist  = (pct / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const labelPoint = (i) => {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const dist  = r + 22;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const dataPoints = top8.map((s, i) => getPoint(i, s.pct || 0));
  const pathD      = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300 }}>
      {/* Grid rings */}
      {levels.map(l => (
        <polygon key={l} fill="none" stroke="#1e2a3a" strokeWidth={1}
          points={top8.map((_, i) => { const p = getPoint(i, l); return `${p.x},${p.y}`; }).join(' ')}
        />
      ))}
      {/* Spokes */}
      {top8.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e2a3a" strokeWidth={1} />;
      })}
      {/* Data polygon */}
      <motion.path
        d={pathD} fill="#1a73e833" stroke="#1a73e8" strokeWidth={2}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
      />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r={4} fill={top8[i].color || '#1a73e8'}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }}
        />
      ))}
      {/* Labels */}
      {top8.map((s, i) => {
        const lp = labelPoint(i);
        return (
          <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
            fill={s.color || '#888'} fontSize={9} fontWeight={700} fontFamily="Arial"
          >
            {s.topic.length > 8 ? s.topic.slice(0, 8) + '..' : s.topic}
          </text>
        );
      })}
    </svg>
  );
}
function SkillBar({ skill, delay }) {
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      style={{ marginBottom: 12 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{skill.badge}</span>
          <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600 }}>{skill.topic}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: skill.color, fontSize: 11, fontWeight: 700 }}>{skill.name}</span>
          <span style={{ color: '#444', fontSize: 10 }}>{skill.solved}/{skill.total}</span>
        </div>
      </div>
      <div style={{ width: '100%', height: 6, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${skill.pct}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          style={{ height: '100%', background: `linear-gradient(90deg, ${skill.color}88, ${skill.color})`, borderRadius: 3 }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        {SKILL_LEVELS.map((l, i) => (
          <div key={i} style={{ width: `${100 / SKILL_LEVELS.length}%`, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: skill.level >= l.level ? skill.color : '#1e2a3a' }} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
export default function SkillsProfile({ user, userData }) {
  const navigate = useNavigate();
  const [skills,    setSkills]    = useState([]);
  const [topSkill,  setTopSkill]  = useState(null);
  const [weakSkill, setWeakSkill] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [view,      setView]      = useState('bars'); // bars | radar

  useEffect(() => {
    if (!user?.uid) return;
    axios.get(`${API_BASE}/skills/${user.uid}`)
      .then(res => {
        setSkills(res.data.skills || []);
        setTopSkill(res.data.topSkill);
        setWeakSkill(res.data.weakestSkill);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const solvedSkills = skills.filter(s => s.solved > 0);
  const avgLevel     = solvedSkills.length > 0
    ? Math.round(solvedSkills.reduce((a, s) => a + s.level, 0) / solvedSkills.length * 10) / 10
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {[{ c:'#1a73e8',l:'10%',t:'20%',s:300 },{ c:'#a855f7',l:'80%',t:'60%',s:250 },{ c:'#00c896',l:'50%',t:'80%',s:200 }].map((o,i)=>(
          <div key={i} style={{ position:'absolute',borderRadius:'50%',width:o.s,height:o.s,background:o.c,left:o.l,top:o.t,transform:'translate(-50%,-50%)',filter:'blur(100px)',opacity:0.05 }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '28px 24px 80px' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12, padding: '6px 14px', marginBottom: 16 }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 48 }}>🧬</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Skills Profile</h1>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>Your DSA mastery breakdown — know your strengths, attack your weaknesses.</p>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { icon: '⚡', label: 'Avg Level',   value: avgLevel.toFixed(1),              color: '#1a73e8' },
              { icon: '💎', label: 'Top Skill',   value: topSkill?.topic  || '—',          color: topSkill?.color  || '#555' },
              { icon: '🎯', label: 'Focus On',    value: weakSkill?.topic || '—',          color: weakSkill?.color || '#555' },
              { icon: '📊', label: 'Topics Hit',  value: `${solvedSkills.length}/24`,      color: '#a855f7' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d1117', border: `1px solid ${s.color}33`, borderRadius: 12, padding: '12px 16px', boxShadow: `0 0 12px ${s.color}11` }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ color: s.color, fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{s.value}</div>
                <div style={{ color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[{ k:'bars',l:'📊 Skill Bars' },{ k:'radar',l:'🕸️ Radar Chart' }].map(v => (
            <button key={v.k} onClick={() => setView(v.k)} style={{
              background: view===v.k ? '#1a73e822' : 'transparent',
              border: `1px solid ${view===v.k ? '#1a73e844' : '#1e2a3a'}`,
              borderRadius: 20, color: view===v.k ? '#1a73e8' : '#555',
              cursor: 'pointer', fontSize: 12, fontWeight: view===v.k ? 700 : 400, padding: '5px 16px',
            }}>{v.l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: 50, background: '#0d1117', borderRadius: 10, border: '1px solid #1e2a3a', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : view === 'radar' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
            <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16, padding: 20 }}>
              <RadarChart skills={solvedSkills.slice(0, 8)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {solvedSkills.slice(0, 8).map((s, i) => (
                <div key={s.topic} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d1117', border: `1px solid ${s.color}22`, borderRadius: 10, padding: '8px 14px' }}>
                  <span style={{ fontSize: 16 }}>{s.badge}</span>
                  <span style={{ flex: 1, color: '#e8e8e8', fontSize: 12 }}>{s.topic}</span>
                  <span style={{ color: s.color, fontSize: 11, fontWeight: 700 }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 16, padding: '20px 24px' }}>
            {skills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#333' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 15, color: '#444' }}>Start solving problems to build your skill profile!</div>
              </div>
            ) : (
              skills.map((skill, i) => <SkillBar key={skill.topic} skill={skill} delay={i * 0.04} />)
            )}
          </div>
        )}

        {/* Level legend */}
        <div style={{ marginTop: 20, background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Skill Level Guide</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SKILL_LEVELS.map(l => (
              <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 6, background: l.color + '11', border: `1px solid ${l.color}33`, borderRadius: 20, padding: '4px 12px' }}>
                <span>{l.badge}</span>
                <span style={{ color: l.color, fontSize: 11, fontWeight: 600 }}>{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
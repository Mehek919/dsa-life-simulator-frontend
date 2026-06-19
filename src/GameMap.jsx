import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';

// ─────────────────────────────────────────────────────────────────────────────
// DISTRICTS
// ─────────────────────────────────────────────────────────────────────────────
const DISTRICTS = {
  1: { name: 'The Valley',        subtitle: 'Origin Stories',          color: '#00c896', glow: '#00c89633', bg: '#00c89611', difficulty: 'Easy',       emoji: '🌱' },
  2: { name: 'The Arena',         subtitle: 'Corporate Wars',           color: '#1a73e8', glow: '#1a73e833', bg: '#1a73e811', difficulty: 'Medium',     emoji: '⚔️' },
  3: { name: 'The Fortress',      subtitle: 'Final Boss Gauntlet',      color: '#ff4d4d', glow: '#ff4d4d33', bg: '#ff4d4d11', difficulty: 'Hard',       emoji: '🔥' },
  4: { name: 'Enterprise Empire', subtitle: 'Microsoft · Oracle · Salesforce · Adobe · Broadcom', color: '#a855f7', glow: '#a855f733', bg: '#a855f711', difficulty: 'Enterprise', emoji: '🏢' },
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTERS — source of truth for titles, colors, problem counts
// ─────────────────────────────────────────────────────────────────────────────
const CHAPTERS = {
  // District 1 — FAANG Easy
  1:  { district: 1, company: 'Google',     title: 'The Search Engine War',              badge: '🔍', color: '#4285f4', problems: 5  },
  2:  { district: 1, company: 'Amazon',     title: 'The Fulfillment Crisis',             badge: '📦', color: '#ff9900', problems: 5  },
  3:  { district: 1, company: 'Apple',      title: 'The Launch Day Panic',               badge: '🍎', color: '#a2aaad', problems: 5  },
  // District 2 — FAANG Medium
  4:  { district: 2, company: 'Meta',       title: 'The Algorithm That Broke Democracy', badge: '🌐', color: '#0081fb', problems: 7  },
  5:  { district: 2, company: 'Google',     title: 'The City That Disappeared',          badge: '🗺️', color: '#4285f4', problems: 7  },
  6:  { district: 2, company: 'Amazon',     title: 'The Cloud That Crashed',             badge: '☁️', color: '#ff9900', problems: 7  },
  7:  { district: 2, company: 'Apple',      title: 'The Model Gone Rogue',               badge: '🤖', color: '#a2aaad', problems: 7  },
  8:  { district: 2, company: 'Microsoft',  title: 'The Billion Dollar Outage',          badge: '⚡', color: '#00a4ef', problems: 7  },
  // District 3 — FAANG Hard
  9:  { district: 3, company: 'Google',     title: 'DeepMind — The Intelligence Wars',   badge: '🧠', color: '#4285f4', problems: 7  },
  10: { district: 3, company: 'Meta',       title: 'The Metaverse Heist',                badge: '🕶️', color: '#0081fb', problems: 7  },
  11: { district: 3, company: 'Amazon',     title: 'Black Friday Apocalypse',            badge: '🛒', color: '#ff9900', problems: 7  },
  12: { district: 3, company: 'Apple',      title: 'The Hack That Shook the World',      badge: '🔐', color: '#a2aaad', problems: 7  },
  13: { district: 3, company: 'Microsoft',  title: 'The Bug in the Machine',             badge: '🐛', color: '#00a4ef', problems: 7  },
  // District 4 — Enterprise Empire
  14: { district: 4, company: 'Microsoft',  title: 'The Gates of Redmond',               badge: '🪟', color: '#00a4ef', problems: 15 },
  15: { district: 4, company: 'Microsoft',  title: 'The Azure Depths',                   badge: '☁️', color: '#00a4ef', problems: 15 },
  16: { district: 4, company: 'Microsoft',  title: 'The Redmond Boss Fight',             badge: '⚔️', color: '#00a4ef', problems: 5,  isBoss: true },
  17: { district: 4, company: 'Oracle',     title: 'The Oracle Database Labyrinth',      badge: '🗄️', color: '#f80000', problems: 10 },
  18: { district: 4, company: 'Oracle',     title: 'The Cloud SQL Catacombs',            badge: '☁️', color: '#f80000', problems: 10 },
  19: { district: 4, company: 'Oracle',     title: "Larry's Boss Chamber",               badge: '⚔️', color: '#f80000', problems: 5,  isBoss: true },
  20: { district: 4, company: 'Salesforce', title: 'The Salesforce Tower',               badge: '☁️', color: '#00a1e0', problems: 10 },
  21: { district: 4, company: 'Salesforce', title: 'The CRM Colosseum',                  badge: '🏟️', color: '#00a1e0', problems: 10 },
  22: { district: 4, company: 'Salesforce', title: "Marc's Boss Fight",                  badge: '⚔️', color: '#00a1e0', problems: 5,  isBoss: true },
  23: { district: 4, company: 'Adobe',      title: 'The Adobe Studio',                   badge: '🎨', color: '#ff0000', problems: 10 },
  24: { district: 4, company: 'Adobe',      title: 'The Creative Cloud',                 badge: '☁️', color: '#ff0000', problems: 10 },
  25: { district: 4, company: 'Adobe',      title: 'The Render Farm Boss',               badge: '⚔️', color: '#ff0000', problems: 5,  isBoss: true },
  26: { district: 4, company: 'Broadcom',   title: 'The Broadcom Chip Floor',            badge: '🔌', color: '#ef4444', problems: 10 },
  27: { district: 4, company: 'Broadcom',   title: 'Silicon Valley Signals',             badge: '📡', color: '#ef4444', problems: 10 },
  28: { district: 4, company: 'Broadcom',   title: 'The ASIC Boss Fight',                badge: '⚔️', color: '#ef4444', problems: 5,  isBoss: true },
};

const COMPANY_LOGOS = {
  Google: '🔍', Amazon: '📦', Apple: '🍎', Meta: '🌐',
  Microsoft: '🪟', Oracle: '🗄️', Salesforce: '☁️', Adobe: '🎨', Broadcom: '🔌',
};

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ count = 0, max = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize: 10, color: i < count ? '#f5c542' : '#333', filter: i < count ? 'drop-shadow(0 0 4px #f5c542)' : 'none' }}>★</span>
      ))}
    </div>
  );
}

function ProgressRing({ solved, total, color, size = 40 }) {
  const pct  = total > 0 ? solved / total : 0;
  const r    = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={3} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct) }}
        transition={{ duration: 1, ease: 'easeOut' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
        fill="#e8e8e8" fontSize={9} fontWeight={700} fontFamily="Arial">
        {solved}/{total}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER CARD
// ─────────────────────────────────────────────────────────────────────────────
function ChapterCard({ chapterId, chapter, progress, isLocked, onClick }) {
  const [hovered, setHovered] = useState(false);
  const solved     = progress?.solved || 0;
  const total      = progress?.total  || chapter.problems || 0;
  const stars      = progress?.stars  || 0;
  const pct        = total > 0 ? (solved / total) * 100 : 0;
  const isComplete = total > 0 && solved >= total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(chapterId * 0.03, 0.8) }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => !isLocked && onClick(chapterId)}
      style={{
        position: 'relative',
        background: isLocked ? '#0a0a14' : hovered ? `linear-gradient(135deg,#0d1117,${chapter.color}11)` : '#0d1117',
        border: `1px solid ${isLocked ? '#1e2a3a' : isComplete ? chapter.color+'88' : chapter.color+'44'}`,
        borderRadius: 14, padding: 16,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.45 : 1, transition: 'all 0.3s',
        boxShadow: hovered && !isLocked ? `0 0 20px ${chapter.color}33` : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Top gradient line */}
      {!isLocked && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${chapter.color},transparent)`, opacity: isComplete ? 1 : hovered ? 0.8 : 0.3 }} />
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:20 }}>{isLocked ? '🔒' : chapter.badge || COMPANY_LOGOS[chapter.company]}</span>
          <div>
            <div style={{ color: isLocked ? '#333' : chapter.color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Ch.{chapterId} · {chapter.company}
            </div>
            <div style={{ color: isLocked ? '#333' : '#e8e8e8', fontSize:12, fontWeight:700, marginTop:2, lineHeight:1.3 }}>
              {chapter.title}
            </div>
          </div>
        </div>
        {!isLocked && <ProgressRing solved={solved} total={total || chapter.problems} color={chapter.color} size={38} />}
      </div>

      {!isLocked && (
        <div style={{ marginBottom:8 }}>
          <div style={{ width:'100%', height:4, background:'#1e2a3a', borderRadius:2, overflow:'hidden' }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }}
              style={{ height:'100%', background:chapter.color, borderRadius:2 }} />
          </div>
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <Stars count={stars} max={3} />
        {isComplete
          ? <span style={{ color:chapter.color, fontSize:10, fontWeight:700 }}>✓ Complete</span>
          : isLocked
            ? <span style={{ color:'#333', fontSize:10 }}>Complete previous chapter</span>
            : <span style={{ color:chapter.color, fontSize:10, fontWeight:600, opacity: hovered ? 1 : 0, transition:'opacity 0.2s' }}>Enter →</span>
        }
      </div>

      {!isLocked && chapter.isBoss && (
        <div style={{ position:'absolute', top:8, right:8, background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:20, padding:'1px 6px', color:'#ff4d4d', fontSize:9, fontWeight:700 }}>
          BOSS ⚔️
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISTRICT SECTION
// ─────────────────────────────────────────────────────────────────────────────
function DistrictSection({ districtId, district, chapters, progress, unlockedChapters, onChapterClick }) {
  const [expanded, setExpanded] = useState(districtId === 1 || districtId === 4);

  const districtChapters = Object.entries(chapters)
    .filter(([, ch]) => ch.district === districtId)
    .sort(([a],[b]) => Number(a) - Number(b));

  const totalSolved = districtChapters.reduce((sum,[id]) => sum + (progress[id]?.solved || 0), 0);
  const totalProbs  = districtChapters.reduce((sum,[id, ch]) => sum + (progress[id]?.total || ch.problems || 0), 0);

  // District is unlocked if its first chapter is in the unlocked list
  const firstChapterId = Number(districtChapters[0]?.[0]);
  const isUnlocked = districtId === 1 || districtId === 4 || unlockedChapters.includes(firstChapterId);

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      style={{ background: isUnlocked ? district.bg : '#0a0a14', border:`1px solid ${isUnlocked ? district.color+'44' : '#1e2a3a'}`, borderRadius:18, overflow:'hidden', marginBottom:20, opacity: isUnlocked ? 1 : 0.5 }}>

      {/* Header */}
      <div onClick={() => isUnlocked && setExpanded(e => !e)}
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px', cursor: isUnlocked ? 'pointer' : 'not-allowed', background: isUnlocked ? `linear-gradient(90deg,${district.bg},transparent)` : 'transparent' }}>

        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background: isUnlocked ? `radial-gradient(circle,${district.color}44,${district.color}11)` : '#1e2a3a', border:`2px solid ${isUnlocked ? district.color+'66' : '#1e2a3a'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, boxShadow: isUnlocked ? `0 0 20px ${district.glow}` : 'none' }}>
            {isUnlocked ? district.emoji : '🔒'}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <h2 style={{ margin:0, color: isUnlocked ? district.color : '#333', fontSize:18, fontWeight:900 }}>
                District {districtId}: {district.name}
              </h2>
              <span style={{ background: isUnlocked ? district.color+'22' : '#1e2a3a', border:`1px solid ${isUnlocked ? district.color+'44' : '#1e2a3a'}`, borderRadius:20, padding:'2px 10px', color: isUnlocked ? district.color : '#333', fontSize:10, fontWeight:700 }}>
                {district.difficulty}
              </span>
            </div>
            <p style={{ margin:'4px 0 0', color: isUnlocked ? '#666' : '#333', fontSize:12 }}>
              {district.subtitle} · {totalSolved}/{totalProbs} problems solved
            </p>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {isUnlocked && <ProgressRing solved={totalSolved} total={totalProbs || 1} color={district.color} size={44} />}
          <motion.span animate={{ rotate: expanded ? 90 : 0 }} style={{ color: isUnlocked ? district.color : '#333', fontSize:16 }}>▶</motion.span>
        </div>
      </div>

      {/* Chapters grid */}
      <AnimatePresence>
        {expanded && isUnlocked && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.3 }}
            style={{ padding:'0 24px 24px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
            {districtChapters.map(([id, chapter]) => (
              <ChapterCard key={id} chapterId={Number(id)} chapter={chapter}
                progress={progress[id] || {}}
                isLocked={!unlockedChapters.includes(Number(id))}
                onClick={onChapterClick} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER PROBLEMS LIST
// ─────────────────────────────────────────────────────────────────────────────
function ChapterProblems({ chapterId, chapter, problems, userProgress, onBack }) {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,#0d1117,${chapter.color}11)`, border:`1px solid ${chapter.color}44`, borderRadius:18, padding:'24px 28px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${chapter.color},transparent)` }} />
        <button onClick={onBack} style={{ background:'transparent', border:`1px solid ${chapter.color}44`, borderRadius:8, color:chapter.color, cursor:'pointer', fontSize:12, padding:'5px 12px', marginBottom:16 }}>
          ← Back to Map
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:40 }}>{chapter.badge || COMPANY_LOGOS[chapter.company]}</div>
          <div>
            <div style={{ color:chapter.color, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Chapter {chapterId} · {chapter.company}
            </div>
            <h2 style={{ margin:'4px 0 0', color:'#e8e8e8', fontSize:22, fontWeight:900 }}>{chapter.title}</h2>
            <p style={{ margin:'6px 0 0', color:'#666', fontSize:12 }}>{problems.length} problems loaded</p>
          </div>
        </div>
      </div>

      {/* Problems */}
      {problems.length === 0 ? (
        <div style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:14, padding:32, textAlign:'center' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
          <div style={{ color:'#666', fontSize:14, marginBottom:8 }}>No problems found for Chapter {chapterId}</div>
          <div style={{ color:'#444', fontSize:12 }}>
            Make sure the seed script has been run and problems have <code style={{ color:'#a855f7' }}>chapter: {chapterId}</code> as a <strong>number</strong>.
          </div>
          <div style={{ marginTop:16, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <a href={`${API_BASE}/problems/debug`} target="_blank" rel="noreferrer"
              style={{ background:'#1e2a3a', border:'1px solid #a855f733', borderRadius:8, color:'#a855f7', padding:'6px 14px', fontSize:12, textDecoration:'none' }}>
              🔍 Check /problems/debug
            </a>
            <a href={`${API_BASE}/problems?chapter=${chapterId}`} target="_blank" rel="noreferrer"
              style={{ background:'#1e2a3a', border:'1px solid #22d3ee33', borderRadius:8, color:'#22d3ee', padding:'6px 14px', fontSize:12, textDecoration:'none' }}>
              📋 Check chapter {chapterId} raw
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {problems.map((problem, idx) => {
            const prog     = userProgress[problem.id] || {};
            const isSolved = prog.solved || false;
            const stars    = prog.stars  || 0;
            const isLocked = idx > 0 && !userProgress[problems[idx - 1]?.id]?.solved;
            const diffColor = { Easy:'#00c896', Medium:'#1a73e8', Hard:'#ff4d4d', Enterprise:'#a855f7' }[problem.difficulty] || '#888';

            return (
              <motion.div key={problem.id}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx * 0.04 }}
                onClick={() => !isLocked && navigate(`/solve/${problem.id}`)}
                whileHover={!isLocked ? { borderColor: chapter.color+'66', x:4 } : {}}
                style={{ display:'flex', alignItems:'center', gap:16, background: isSolved ? `${chapter.color}08` : '#0d1117', border:`1px solid ${isSolved ? chapter.color+'44' : '#1e2a3a'}`, borderRadius:12, padding:'14px 20px', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.4 : 1, transition:'all 0.2s' }}>

                <span style={{ color:'#444', fontSize:13, width:24, textAlign:'right', flexShrink:0 }}>{idx + 1}</span>
                <span style={{ fontSize:16, flexShrink:0 }}>{isLocked ? '🔒' : isSolved ? '✅' : (problem.isBoss || chapter.isBoss) ? '⚔️' : '○'}</span>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                    <span style={{ color: isSolved ? '#888' : '#e8e8e8', fontSize:14, fontWeight:700 }}>{problem.title}</span>
                    {(problem.isBoss || chapter.isBoss) && (
                      <span style={{ background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:20, padding:'1px 8px', color:'#ff4d4d', fontSize:9, fontWeight:700 }}>BOSS</span>
                    )}
                    {problem.enterpriseOnly && (
                      <span style={{ background:'#a855f722', border:'1px solid #a855f744', borderRadius:20, padding:'1px 8px', color:'#a855f7', fontSize:9, fontWeight:700 }}>ENTERPRISE</span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                    {problem.tags?.slice(0, 3).map(tag => (
                      <span key={tag} style={{ background:'#1e2a3a', borderRadius:20, padding:'1px 8px', color:'#555', fontSize:10 }}>{tag}</span>
                    ))}
                    {problem.pattern && <span style={{ color:'#444', fontSize:10 }}>{problem.pattern}</span>}
                  </div>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
                  {isSolved && <Stars count={stars} max={3} />}
                  <span style={{ background: diffColor+'22', border:`1px solid ${diffColor}44`, borderRadius:20, padding:'2px 10px', color:diffColor, fontSize:11, fontWeight:700 }}>
                    {problem.difficulty}
                  </span>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ color:'#a855f7', fontSize:11, fontWeight:700 }}>+{problem.xpReward || 100} XP</div>
                    <div style={{ color:'#f5c542', fontSize:10 }}>+{problem.creditReward || 10} CR</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAMEMAP
// ─────────────────────────────────────────────────────────────────────────────
export default function GameMap({ user, userData }) {
  const navigate = useNavigate();

  const [problems,        setProblems]        = useState([]);
  const [userProgress,    setUserProgress]     = useState({});
  const [loading,         setLoading]          = useState(true);
  const [error,           setError]            = useState('');
  const [selectedChapter, setSelectedChapter]  = useState(null);
  const [stats,           setStats]            = useState({ totalSolved:0, totalXp:0, currentStreak:0 });

  // ── Fetch problems + progress ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [probRes, progRes] = await Promise.all([
        axios.get(`${API_BASE}/problems`, {
          params: {
           limit: 500,
           source: 'odyssey'
          }
        }),
        axios.get(`${API_BASE}/problems/progress/${user.uid}`)
          .catch(() => ({ data: { progress: {} } })),
      ]);

      // Accept all problems that have a valid chapter (1-28)
      const all = (probRes.data?.problems || []).map(p => ({
        ...p,
        chapter:        Number(p.chapter        || 0),
        district:       Number(p.district       || 0),
        orderInChapter: Number(p.orderInChapter || 0),
        xpReward:       Number(p.xpReward       || 100),
        creditReward:   Number(p.creditReward   || 20),
      })).filter(p =>
        p.chapter >= 1 &&
        p.chapter <= 28 &&
        p.district >= 1 &&
        p.problemType !== 'roadmap' &&
        p.source !== 'roadmap' &&
        p.isRoadmap !== true &&
        p.roadmap !== true &&
        p.excludeFromOdyssey !== true
      );
      setProblems(all);
      setUserProgress(progRes.data?.progress || {});

      const prog    = progRes.data?.progress || {};
      const solved  = all.filter(p => prog[p.id]?.solved).length;
      const totalXp = Object.values(prog).reduce((s,p) => s + (p.xpEarned || 0), 0);
      setStats({ totalSolved: solved, totalXp, currentStreak: userData?.currentStreak || userData?.streak || 0 });
    } catch (err) {
      console.error('GameMap fetch error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userData?.currentStreak, userData?.streak]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Chapter progress ───────────────────────────────────────────────────────
  const getChapterProgress = useCallback((chapterId) => {
    const chProbs  = problems.filter(p => p.chapter === Number(chapterId));
    const solved   = chProbs.filter(p => userProgress[p.id]?.solved).length;
    const stars    = chProbs.reduce((s,p) => s + (userProgress[p.id]?.stars || 0), 0);
    return { solved, total: chProbs.length || CHAPTERS[chapterId]?.problems || 0, stars };
  }, [problems, userProgress]);

  // ── Unlock logic ───────────────────────────────────────────────────────────
  // Rules:
  //   Ch1  → always unlocked (FAANG start)
  //   Ch14 → always unlocked (Enterprise start — separate track)
  //   Same district next chapter → unlock only if prev chapter has ≥1 SOLVED problem
  //   Cross-district boundary (e.g. D1→D2, D2→D3) → unlock when FIRST chapter
  //     of THAT district is reached via the district order rule below
  //   IMPORTANT: if problems array is still empty, keep locked (don't auto-open everything)
  const getUnlockedChapters = useCallback(() => {
    const unlocked = [1, 14]; // always open — first chapter of each track

    // Only run unlock logic if we actually have problems loaded
    // This prevents all chapters unlocking while problems are still fetching
    if (problems.length === 0) return unlocked;

    const ids = Object.keys(CHAPTERS).map(Number).sort((a, b) => a - b);

    for (const id of ids) {
      if (unlocked.includes(id)) continue;

      const prevId      = id - 1;
      const prevChapter = CHAPTERS[prevId];
      const thisChapter = CHAPTERS[id];

      // ── Cross-district boundary within same track ──
      // District 1→2→3 are one track; District 4 is a separate track starting at 14.
      // If there's no adjacent prev chapter (gap like ch13→ch14 is handled by ch14 being always open),
      // or the prev chapter is in a different district:
      // → This chapter is the FIRST of a new district segment.
      // → Only unlock if ALL problems in the previous district are solved.
      if (!prevChapter) {
        // No prev chapter at all → it's an island, keep locked unless in unlocked list
        continue;
      }

      if (prevChapter.district !== thisChapter.district) {
        // First chapter of a new district (e.g. ch4 = first of D2, ch9 = first of D3)
        // Unlock if at least 50% of prev district problems are solved
        const prevDistrictProblems = problems.filter(p => p.district === prevChapter.district);
        if (prevDistrictProblems.length === 0) continue; // no data → keep locked
        const prevDistrictSolved = prevDistrictProblems.filter(p => userProgress[p.id]?.solved).length;
        const pct = prevDistrictSolved / prevDistrictProblems.length;
        if (pct >= 0.5) unlocked.push(id); // unlock when 50% of prev district done
        continue;
      }

      // ── Same district: unlock next chapter when prev chapter has ≥1 solved ──
      const prevProblems = problems.filter(p => p.chapter === prevId);
      if (prevProblems.length === 0) continue; // prev chapter has no problems → keep locked

      const anySolved = prevProblems.some(p => userProgress[p.id]?.solved);
      if (anySolved) unlocked.push(id);
    }

    return unlocked;
  }, [problems, userProgress]);

  const unlockedChapters   = getUnlockedChapters();
  const selectedChapterData = selectedChapter ? CHAPTERS[selectedChapter] : null;
  const selectedProblems    = selectedChapter
    ? problems.filter(p => p.chapter === Number(selectedChapter)).sort((a,b) => a.orderInChapter - b.orderInChapter)
    : [];

  const totalAvailable = problems.length || Object.values(CHAPTERS).reduce((s,ch) => s + ch.problems, 0);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:'Arial,sans-serif' }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}
          style={{ width:40, height:40, border:'3px solid #1e2a3a', borderTop:'3px solid #1a73e8', borderRadius:'50%' }} />
        <div style={{ color:'#555', fontSize:14 }}>Loading The Engineer&apos;s Odyssey...</div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:'Arial,sans-serif' }}>
        <div style={{ fontSize:32 }}>⚠️</div>
        <div style={{ color:'#ff6b6b', fontSize:15, maxWidth:400, textAlign:'center' }}>
          Backend error: {error}<br/>
          <span style={{ color:'#555', fontSize:12 }}>Make sure Render has deployed the latest backend and the /problems route is working.</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchData} style={{ background:'#1e2a3a', border:'1px solid #1a73e844', borderRadius:8, color:'#1a73e8', cursor:'pointer', padding:'8px 18px', fontSize:13 }}>
            🔄 Retry
          </button>
          <a href={`${API_BASE}/problems/debug`} target="_blank" rel="noreferrer"
            style={{ background:'#1e2a3a', border:'1px solid #a855f744', borderRadius:8, color:'#a855f7', cursor:'pointer', padding:'8px 18px', fontSize:13, textDecoration:'none' }}>
            🔍 Debug API
          </a>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', fontFamily:'Arial,sans-serif', color:'#e8e8e8' }}>
      {/* Ambient orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {[{c:'#00c896',l:'5%',t:'20%',s:300},{c:'#1a73e8',l:'85%',t:'50%',s:250},{c:'#ff4d4d',l:'50%',t:'80%',s:200},{c:'#a855f7',l:'70%',t:'20%',s:280}]
          .map((o,i) => (
            <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.s, height:o.s, background:o.c, left:o.l, top:o.t, transform:'translate(-50%,-50%)', filter:'blur(100px)', opacity:0.05 }} />
          ))}
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:1100, margin:'0 auto', padding:'28px 24px 60px' }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:32 }}>
          <button onClick={() => navigate('/world')}
            style={{ background:'transparent', border:'1px solid #1e2a3a', borderRadius:8, color:'#555', cursor:'pointer', fontSize:12, padding:'6px 14px', marginBottom:20, transition:'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#1a73e844'; e.currentTarget.style.color='#1a73e8'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a3a'; e.currentTarget.style.color='#555'; }}>
            ← World
          </button>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:32, fontWeight:900, letterSpacing:'-0.5px' }}>🎮 Engineer&apos;s Odyssey</h1>
              <p style={{ margin:'6px 0 0', color:'#555', fontSize:14 }}>
                FAANG + Enterprise problems. Google · Amazon · Apple · Meta · Microsoft · Oracle · Salesforce · Adobe · Broadcom
              </p>
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {[
                { label:'Problems Solved', value:stats.totalSolved,   color:'#00c896', icon:'✅' },
                { label:'XP Earned',       value:stats.totalXp,       color:'#a855f7', icon:'⚡' },
                { label:'Day Streak',      value:stats.currentStreak, color:'#f5c542', icon:'🔥' },
              ].map(s => (
                <div key={s.label} style={{ background:'#0d1117', border:`1px solid ${s.color}33`, borderRadius:12, padding:'10px 16px', textAlign:'center', boxShadow:`0 0 12px ${s.color}11` }}>
                  <div style={{ fontSize:18, marginBottom:2 }}>{s.icon}</div>
                  <div style={{ color:s.color, fontSize:18, fontWeight:900 }}>{s.value}</div>
                  <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#555', fontSize:11 }}>Overall Progress</span>
              <span style={{ color:'#1a73e8', fontSize:11, fontWeight:700 }}>{stats.totalSolved}/{totalAvailable} problems</span>
            </div>
            <div style={{ width:'100%', height:6, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }}
                animate={{ width:`${totalAvailable ? (stats.totalSolved / totalAvailable) * 100 : 0}%` }}
                transition={{ duration:1.2, ease:'easeOut' }}
                style={{ height:'100%', borderRadius:3, background:'linear-gradient(90deg,#00c896,#1a73e8,#ff4d4d,#a855f7)' }} />
            </div>
          </div>

          {/* Problems loaded counter */}
          <div style={{ marginTop:10, color:'#333', fontSize:11 }}>
            {problems.length} problems loaded from backend
            {problems.length === 0 && (
              <span style={{ color:'#ef4444', marginLeft:8 }}>
                ⚠️ Run the seed script and push the new problems.js backend
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Main content ── */}
        <AnimatePresence mode="wait">
          {selectedChapter ? (
            <ChapterProblems key="chapter" chapterId={selectedChapter} chapter={selectedChapterData}
              problems={selectedProblems} userProgress={userProgress} onBack={() => setSelectedChapter(null)} />
          ) : (
            <motion.div key="map" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
              {Object.entries(DISTRICTS).map(([districtId, district]) => (
                <DistrictSection
                  key={districtId}
                  districtId={Number(districtId)}
                  district={district}
                  chapters={CHAPTERS}
                  progress={Object.fromEntries(
                    Object.keys(CHAPTERS)
                      .filter(id => CHAPTERS[id].district === Number(districtId))
                      .map(id => [id, getChapterProgress(Number(id))])
                  )}
                  unlockedChapters={unlockedChapters}
                  onChapterClick={setSelectedChapter}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
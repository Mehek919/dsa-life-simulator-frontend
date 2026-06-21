import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

const CONFIGS = {
  google:    { company:'Google',    logo:'🔍', color:'#4285f4', duration:45, desc:'Optimal solutions + complexity analysis' },
  amazon:    { company:'Amazon',    logo:'📦', color:'#ff9900', duration:40, desc:'Clean code + edge cases + LP principles'  },
  meta:      { company:'Meta',      logo:'🌐', color:'#0081fb', duration:35, desc:'Speed + graphs + DP problems'             },
  microsoft: { company:'Microsoft', logo:'🪟', color:'#00a4ef', duration:45, desc:'Collaborative + communication focused'    },
  apple:     { company:'Apple',     logo:'🍎', color:'#a2aaad', duration:45, desc:'Elegant production-quality code'          },
  general:   { company:'General',   logo:'💻', color:'#a855f7', duration:60, desc:'Mixed difficulty fundamentals'            },
};

function formatTime(s) {
  const m = Math.floor(s/60), sec = s%60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Company Selector ──────────────────────────────────────────────────────────
function CompanySelector({ onStart }) {
  const [selected, setSelected] = useState('general');
  const [starting, setStarting] = useState(false);
  const config = CONFIGS[selected];

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Arial, sans-serif', position:'relative', overflow:'hidden' }}>
      {/* Ambient */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:400, height:400, background:config.color, left:'50%', top:'50%', transform:'translate(-50%,-50%)', filter:'blur(120px)', opacity:0.06, borderRadius:'50%', transition:'background 0.3s' }} />
      </div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ maxWidth:640, width:'100%', position:'relative', zIndex:1 }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
          <h1 style={{ margin:'0 0 8px', color:'#e8e8e8', fontSize:28, fontWeight:900 }}>Mock Interview</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>Simulate a real FAANG interview. Timer on. Camera optional. Game face on.</p>
        </div>

        {/* Company grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:24 }}>
          {Object.entries(CONFIGS).map(([key, c]) => (
            <motion.button key={key} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              onClick={() => setSelected(key)}
              style={{
                background:   selected===key ? c.color+'22' : '#0d1117',
                border:       `1px solid ${selected===key ? c.color+'66' : '#1e2a3a'}`,
                borderRadius: 14, padding:'16px 12px', cursor:'pointer',
                textAlign:'center', transition:'all 0.2s',
                boxShadow: selected===key ? `0 0 20px ${c.color}33` : 'none',
              }}
            >
              <div style={{ fontSize:28, marginBottom:6 }}>{c.logo}</div>
              <div style={{ color: selected===key ? c.color : '#e8e8e8', fontSize:13, fontWeight:700 }}>{c.company}</div>
              <div style={{ color:'#555', fontSize:10, marginTop:2 }}>{c.duration} min</div>
            </motion.button>
          ))}
        </div>

        {/* Selected config details */}
        <AnimatePresence mode="wait">
          <motion.div key={selected} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ background:'#0d1117', border:`1px solid ${config.color}44`, borderRadius:16, padding:'20px 24px', marginBottom:24, position:'relative', overflow:'hidden' }}
          >
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${config.color}, transparent)` }} />
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <span style={{ fontSize:32 }}>{config.logo}</span>
              <div>
                <h2 style={{ margin:0, color:config.color, fontSize:18, fontWeight:900 }}>{config.company} Interview</h2>
                <p style={{ margin:'3px 0 0', color:'#666', fontSize:12 }}>{config.desc}</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {[
                { icon:'⏱', label:'Duration', value:`${config.duration} min`           },
                { icon:'📝', label:'Problems', value:`${selected==='microsoft'?3:2} problems` },
                { icon:'🎯', label:'Focus',    value: selected==='general'?'Mixed':config.company },
              ].map(d => (
                <div key={d.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px', textAlign:'center' }}>
                  <div style={{ fontSize:18, marginBottom:4 }}>{d.icon}</div>
                  <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{d.value}</div>
                  <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', letterSpacing:'0.06em' }}>{d.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Tips */}
        <div style={{ background:`${config.color}11`, border:`1px solid ${config.color}22`, borderRadius:12, padding:'14px 18px', marginBottom:24 }}>
          <div style={{ color:config.color, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>💡 Interview Tips</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {['Think out loud — interviewers want to hear your process',
              'Start with brute force, then optimize',
              'Always discuss time & space complexity',
              'Ask clarifying questions before coding'].map(tip => (
              <div key={tip} style={{ color:'#888', fontSize:11, display:'flex', gap:6 }}>
                <span style={{ color:config.color, flexShrink:0 }}>•</span>{tip}
              </div>
            ))}
          </div>
        </div>

        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={async () => { setStarting(true); await onStart(selected); setStarting(false); }}
          disabled={starting}
          style={{ width:'100%', background:starting?'#1e2a3a':`linear-gradient(135deg, ${config.color}, ${config.color}88)`, border:'none', borderRadius:14, color:starting?'#444':'#fff', cursor:starting?'not-allowed':'pointer', fontSize:16, fontWeight:900, padding:'16px 0', boxShadow:starting?'none':`0 0 30px ${config.color}44` }}
        >
          {starting ? '⏳ Setting up interview...' : `🚀 Start ${config.company} Interview`}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Interview Result Screen ───────────────────────────────────────────────────
function InterviewResult({ result, company, onRedo, onHome }) {
  const config = CONFIGS[company] || CONFIGS.general;
  const grade  = result.pct >= 80 ? 'A' : result.pct >= 60 ? 'B' : result.pct >= 40 ? 'C' : 'D';
  const gradeColor = result.pct >= 80 ? '#00c896' : result.pct >= 60 ? '#f5c542' : result.pct >= 40 ? '#1a73e8' : '#ff4d4d';

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Arial, sans-serif' }}>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#0d1117', border:`1px solid ${config.color}44`, borderRadius:20, padding:'40px', maxWidth:500, width:'100%', textAlign:'center', boxShadow:`0 0 40px ${config.color}22` }}
      >
        <div style={{ fontSize:56, marginBottom:8 }}>{config.logo}</div>
        <h2 style={{ margin:'0 0 4px', color:'#e8e8e8', fontSize:24, fontWeight:900 }}>{config.company} Interview Complete</h2>
        <p style={{ color:'#555', margin:'0 0 28px', fontSize:14 }}>Here's how you performed</p>

        {/* Grade */}
        <div style={{ marginBottom:24, display:'inline-block' }}>
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:150, delay:0.2 }}
            style={{ width:100, height:100, borderRadius:'50%', background:gradeColor+'22', border:`3px solid ${gradeColor}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}
          >
            <span style={{ color:gradeColor, fontSize:42, fontWeight:900 }}>{grade}</span>
          </motion.div>
          <div style={{ color:gradeColor, fontSize:14, fontWeight:700 }}>{result.pct}% score</div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
          {[
            { label:'Solved',  value:`${result.solvedCount}/${result.totalProbs||2}`, color:'#00c896' },
            { label:'Score',   value:`${result.totalScore}/${result.maxScore}`,        color:'#a855f7' },
            { label:'Grade',   value:grade,                                            color:gradeColor },
          ].map(s => (
            <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 8px' }}>
              <div style={{ color:s.color, fontSize:20, fontWeight:900 }}>{s.value}</div>
              <div style={{ color:'#444', fontSize:9, marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Feedback */}
        {result.feedback && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'14px 16px', marginBottom:24, textAlign:'left' }}>
            <div style={{ color:'#1a73e8', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>🤖 AI Feedback</div>
            <div style={{ color:'#c8c8c8', fontSize:12, lineHeight:1.7 }}>{result.feedback}</div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRedo} style={{ flex:1, background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:10, color:'#888', cursor:'pointer', fontSize:13, fontWeight:600, padding:'10px 0' }}>Try Again</button>
          <button onClick={onHome} style={{ flex:1, background:`linear-gradient(135deg, ${config.color}, ${config.color}88)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 0' }}>Back to World →</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main MockInterview ────────────────────────────────────────────────────────
export default function MockInterview({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,     setPhase]     = useState('select');   // select | active | complete
  const [session,   setSession]   = useState(null);
  const [company,   setCompany]   = useState('general');
  const [probIdx,   setProbIdx]   = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [solved,    setSolved]    = useState([]);
  const [result,    setResult]    = useState(null);
  const timerRef = useRef(null);

  const config = CONFIGS[company] || CONFIGS.general;

  const startInterview = async (selectedCompany) => {
    setCompany(selectedCompany);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/start`, {
        userId:  user.uid,
        company: selectedCompany,
      });
      setSession(res.data);
      setRemaining(res.data.duration * 60);
      setPhase('active');
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  };

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;
    timerRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(timerRef.current); completeInterview(true); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const completeInterview = useCallback(async (autoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/complete`, { userId: user.uid });
      setResult({ ...res.data, totalProbs: session.problems?.length || 2 });
      setPhase('complete');
    } catch { setPhase('complete'); setResult({ pct:0, totalScore:0, maxScore:100, solvedCount:0, feedback:'Interview ended.', totalProbs:2 }); }
  }, [session, user.uid]);

  const handleSubmit = async (code, langId, testResults) => {
    const problem   = session?.problems?.[probIdx];
    if (!problem)   return { passed:false };
    const passed    = testResults.filter(r=>r.passed).length;
    const total     = testResults.length;
    const allPassed = passed===total && total>0;

    try {
      await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/submit`, {
        userId: user.uid, problemId: problem.id, code, language: langId,
        passed, total, allPassed,
      });
      if (allPassed) {
        setSolved(prev => [...new Set([...prev, problem.id])]);
        // Auto-advance
        const next = session.problems.findIndex((p,i) => i>probIdx && !solved.includes(p.id));
        if (next !== -1) setTimeout(() => setProbIdx(next), 800);
      }
      return { passed:allPassed, passedCount:passed, total, xp:0, credits:0 };
    } catch {
      return { passed:false, passedCount:passed, total };
    }
  };

  if (phase === 'select') return <CompanySelector onStart={startInterview} />;
  if (phase === 'complete') return (
    <InterviewResult result={result || {}} company={company}
      onRedo={() => { setPhase('select'); setSession(null); setSolved([]); setProbIdx(0); }}
      onHome={() => navigate('/world')}
    />
  );

  const problems       = session?.problems || [];
  const currentProblem = problems[probIdx];
  const pctDone        = (remaining / (config.duration * 60)) * 100;
  const timeColor      = remaining < 300 ? '#ff4d4d' : remaining < 900 ? '#f5c542' : '#00c896';

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0a0a14', fontFamily:'Arial, sans-serif', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0, gap:10, flexWrap:'wrap' }}>
        {/* Left — company + problems */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>{config.logo}</span>
          <div>
            <div style={{ color:config.color, fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{config.company} Mock Interview</div>
            <div style={{ display:'flex', gap:5, marginTop:3 }}>
              {problems.map((p,i) => {
                const isSolved = solved.includes(p.id);
                const isCurr   = i === probIdx;
                const dc       = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' }[p.difficulty]||'#888';
                return (
                  <button key={p.id} onClick={() => setProbIdx(i)}
                    style={{ background:isCurr?dc+'22':isSolved?'#00c89611':'transparent', border:`1px solid ${isCurr?dc:isSolved?'#00c89633':'#1e2a3a'}`, borderRadius:6, color:isCurr?dc:isSolved?'#00c896':'#555', cursor:'pointer', fontSize:11, fontWeight:700, padding:'3px 10px' }}
                  >
                    {isSolved?'✓':i+1} {p.difficulty}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — timer + progress + submit */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ background:'#0d1117', border:`1px solid ${timeColor}44`, borderRadius:10, padding:'6px 14px' }}>
            <div style={{ color:timeColor, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{formatTime(remaining)}</div>
            <div style={{ width:80, height:3, background:'#1e2a3a', borderRadius:2, marginTop:3, overflow:'hidden' }}>
              <div style={{ width:`${pctDone}%`, height:'100%', background:timeColor, borderRadius:2, transition:'width 1s linear' }} />
            </div>
          </div>
          <div style={{ background:'#a855f711', border:'1px solid #a855f733', borderRadius:8, padding:'6px 12px', textAlign:'center' }}>
            <div style={{ color:'#555', fontSize:9 }}>SOLVED</div>
            <div style={{ color:'#a855f7', fontSize:16, fontWeight:900 }}>{solved.length}/{problems.length}</div>
          </div>
          <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
            onClick={() => completeInterview(false)}
            style={{ background:`linear-gradient(135deg, ${config.color}, ${config.color}88)`, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 16px' }}
          >
            End Interview →
          </motion.button>
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex:1, overflow:'hidden' }}>
        {currentProblem && (
          <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage="python3" hideHints />
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const DIFF_COLORS  = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };
const SEV_COLORS   = { Critical:'#ff4d4d', High:'#f97316', Medium:'#f5c542', Low:'#888' };

// ── Scenario Selector ─────────────────────────────────────────────────────────
function ScenarioSelector({ onStart, loading }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [fetching,  setFetching]  = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/code-review/scenarios`)
      .then(r => { setScenarios(r.data.scenarios||[]); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 24px', overflowY:'auto' }}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10 }}>🔍</div>
          <h1 style={{ margin:'0 0 8px', fontSize:28, fontWeight:900 }}>Code Review Battle</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>Find the bugs before the code ships. The author will push back — hold your ground.</p>
        </div>

        {fetching ? (
          <div style={{ textAlign:'center', color:'#444', padding:40 }}>Loading PRs...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14, marginBottom:28 }}>
            {scenarios.map(s => (
              <motion.div key={s.id} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                onClick={() => setSelected(s.id === selected ? null : s.id)}
                style={{
                  background: selected===s.id ? `${s.color}15` : '#0d1117',
                  border: `1px solid ${selected===s.id ? s.color+'55' : '#1e2a3a'}`,
                  borderRadius:14, padding:'16px 18px', cursor:'pointer',
                  boxShadow: selected===s.id ? `0 0 20px ${s.color}22` : 'none',
                  transition:'all 0.15s', position:'relative', overflow:'hidden',
                }}
              >
                {selected===s.id && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />}

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:24 }}>{s.emoji}</span>
                    <div>
                      <div style={{ color: selected===s.id ? s.color : '#e8e8e8', fontWeight:800, fontSize:14 }}>{s.title}</div>
                      <div style={{ color:'#555', fontSize:10, marginTop:2 }}>{s.pr}</div>
                    </div>
                  </div>
                  <span style={{ background:(DIFF_COLORS[s.difficulty]||'#888')+'22', border:`1px solid ${(DIFF_COLORS[s.difficulty]||'#888')}44`, color:DIFF_COLORS[s.difficulty]||'#888', borderRadius:10, padding:'2px 8px', fontSize:9, fontWeight:700, flexShrink:0 }}>
                    {s.difficulty}
                  </span>
                </div>

                <p style={{ color:'#666', fontSize:11, lineHeight:1.6, margin:'0 0 10px' }}>{s.description}</p>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'#1e2a3a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                    {s.author?.emoji}
                  </div>
                  <div>
                    <div style={{ color:'#888', fontSize:10, fontWeight:700 }}>{s.author?.name}</div>
                    <div style={{ color:'#444', fontSize:9 }}>{s.author?.role}</div>
                  </div>
                  <div style={{ marginLeft:'auto', background:`${s.color}11`, border:`1px solid ${s.color}33`, borderRadius:6, padding:'2px 8px', color:s.color, fontSize:10 }}>
                    {s.language}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.button whileHover={{ scale: selected ? 1.02 : 1 }} whileTap={{ scale: selected ? 0.98 : 1 }}
          onClick={() => selected && onStart(selected)}
          disabled={!selected || loading}
          style={{
            width:'100%', fontSize:15, fontWeight:900, padding:'15px 0', borderRadius:13, border:'none',
            background: selected ? `linear-gradient(135deg, ${scenarios.find(s=>s.id===selected)?.color||'#ff4d4d'}, ${scenarios.find(s=>s.id===selected)?.color||'#ff4d4d'}88)` : '#0d1117',
            color: selected ? '#fff' : '#333',
            cursor: selected && !loading ? 'pointer' : 'not-allowed',
            transition:'all 0.2s',
          }}
        >
          {loading ? '⏳ Loading PR...' : selected ? '🔍 Start Review' : 'Select a PR to Review'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Code Panel ────────────────────────────────────────────────────────────────
function CodePanel({ code, language, color }) {
  const lines = (code||'').split('\n');
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#060910', overflow:'hidden' }}>
      <div style={{ padding:'8px 16px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
        <span style={{ background:`${color}22`, border:`1px solid ${color}44`, borderRadius:6, padding:'2px 8px', color, fontSize:10, fontWeight:700 }}>{language}</span>
        <span style={{ color:'#444', fontSize:10 }}>Read the code carefully — how many issues can you find?</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px 0' }}>
        <table style={{ borderCollapse:'collapse', width:'100%', fontFamily:'"Fira Code","Courier New",monospace', fontSize:12 }}>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} style={{ '&:hover':{ background:'#ffffff08' } }}>
                <td style={{ width:40, textAlign:'right', paddingRight:16, paddingLeft:8, color:'#333', userSelect:'none', verticalAlign:'top', lineHeight:1.7 }}>
                  {i+1}
                </td>
                <td style={{ paddingRight:20, color:'#c8e6ff', lineHeight:1.7, whiteSpace:'pre', verticalAlign:'top' }}>
                  {line || ' '}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Review Screen ─────────────────────────────────────────────────────────────
function ReviewScreen({ session, user, onSubmit, submitting }) {
  const [review,   setReview]   = useState('');
  const scenario = session.scenario;
  const timeLeft = useRef(600); // 10 min
  const [timer,  setTimer]    = useState(600);

  useEffect(() => {
    const id = setInterval(() => {
      setTimer(t => Math.max(0, t-1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formatTime = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div style={{ height:'100vh', background:'#0a0a14', display:'flex', flexDirection:'column', fontFamily:'Arial, sans-serif', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ height:52, background:'#0d1117', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:`${scenario.color}18`, border:`1px solid ${scenario.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
            {scenario.emoji}
          </div>
          <div>
            <div style={{ color:'#e8e8e8', fontSize:12, fontWeight:800 }}>{scenario.title}</div>
            <div style={{ color:'#555', fontSize:9 }}>{scenario.pr}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ background: timer<120?'#ff4d4d22':'#060910', border:`1px solid ${timer<120?'#ff4d4d55':'#1e2a3a'}`, borderRadius:8, padding:'5px 10px', color: timer<120?'#ff4d4d':'#e8e8e8', fontSize:12, fontWeight:900, fontFamily:'monospace' }}>
            ⏱ {formatTime(timer)}
          </div>
          <button onClick={() => review.trim() && onSubmit(review)} disabled={!review.trim()||submitting}
            style={{ background: review.trim()&&!submitting?`linear-gradient(135deg,${scenario.color},${scenario.color}88)`:'#1e2a3a', border:'none', borderRadius:8, color: review.trim()&&!submitting?'#fff':'#444', cursor: review.trim()&&!submitting?'pointer':'not-allowed', fontSize:12, fontWeight:700, padding:'7px 14px' }}>
            {submitting ? '⏳ Grading...' : 'Submit Review →'}
          </button>
        </div>
      </div>

      {/* Body: code left, review right */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <CodePanel code={scenario.code} language={scenario.language} color={scenario.color} />

        <div style={{ width:340, borderLeft:'1px solid #1e2a3a', display:'flex', flexDirection:'column', flexShrink:0 }}>
          {/* Author */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>📋 PR CONTEXT</div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'#1e2a3a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>{scenario.author?.emoji}</div>
              <div>
                <div style={{ color:'#e8e8e8', fontSize:11, fontWeight:700 }}>{scenario.author?.name}</div>
                <div style={{ color:'#555', fontSize:9 }}>{scenario.author?.role}</div>
              </div>
            </div>
            <p style={{ color:'#666', fontSize:11, lineHeight:1.6, margin:0 }}>{scenario.description}</p>
          </div>

          {/* Review textarea */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'12px 14px', gap:10 }}>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>✍️ YOUR REVIEW</div>
            <div style={{ color:'#2a3645', fontSize:10, lineHeight:1.6 }}>
              List every issue you find. Include: what's wrong, which line, and why it's a problem. The author will push back — be specific.
            </div>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder={`Example:\n\nLine 6: SQL injection vulnerability. The username variable is directly interpolated into the query string. An attacker could pass "' OR 1=1 --" to bypass auth.\n\nLine 15: Plain text password comparison. Passwords must be stored and compared as hashes using bcrypt or argon2...`}
              style={{
                flex:1, background:'#060910', border:`1px solid ${review.trim()?scenario.color+'44':'#1e2a3a'}`, borderRadius:10,
                padding:'10px 12px', color:'#e8e8e8', fontSize:11, fontFamily:'Arial, sans-serif',
                lineHeight:1.7, outline:'none', resize:'none', transition:'border-color 0.15s',
              }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', color:'#333', fontSize:9 }}>
              <span>{review.length} chars</span>
              <span>Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, session, onRedo, onHome }) {
  const scenario    = session.scenario;
  const color       = scenario.color;
  const pct         = result.score || 0;
  const gradeColor  = pct>=80?'#00c896':pct>=60?'#a855f7':pct>=40?'#f5c542':'#ff4d4d';
  const grade       = pct>=80?'A':pct>=60?'B':pct>=40?'C':'D';
  const [showAll, setShowAll] = useState(false);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 16px', overflowY:'auto' }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        style={{ maxWidth:680, margin:'0 auto', background:'#0d1117', border:`1px solid ${color}44`, borderRadius:20, padding:'32px', boxShadow:`0 0 40px ${color}22` }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:42, marginBottom:8 }}>{scenario.emoji}</div>
          <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:900 }}>Review Complete</h2>
          <p style={{ color:'#555', margin:0, fontSize:12 }}>{scenario.pr}</p>
        </div>

        {/* Score */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:24 }}>
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:150, delay:0.2 }}
            style={{ width:80, height:80, borderRadius:'50%', background:gradeColor+'22', border:`3px solid ${gradeColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
            <span style={{ color:gradeColor, fontSize:32, fontWeight:900, lineHeight:1 }}>{grade}</span>
            <span style={{ color:gradeColor, fontSize:10, fontWeight:700 }}>{pct}%</span>
          </motion.div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Caught', value:`${result.caughtBugs?.length||0}/${(result.caughtBugs?.length||0)+(result.missedBugs?.length||0)}`, color:'#00c896' },
              { label:'Missed', value:result.missedBugs?.length||0, color:'#ff4d4d' },
              { label:'False+', value:result.falsePosCount||0,       color:'#f5c542' },
            ].map(s => (
              <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                <div style={{ color:s.color, fontSize:16, fontWeight:900 }}>{s.value}</div>
                <div style={{ color:'#444', fontSize:9, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {result.summary && (
          <div style={{ background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:12, padding:'12px 14px', marginBottom:18 }}>
            <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:5 }}>📊 Assessment</div>
            <div style={{ color:'#c8c8c8', fontSize:12, lineHeight:1.65 }}>{result.summary}</div>
          </div>
        )}

        {/* Author response */}
        {result.authorResponse && (
          <div style={{ background:`${color}08`, border:`1px solid ${color}22`, borderRadius:12, padding:'12px 14px', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'#1e2a3a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{session.scenario.author?.emoji}</div>
              <div>
                <div style={{ color:color, fontSize:10, fontWeight:700 }}>{session.scenario.author?.name} responded:</div>
              </div>
            </div>
            <div style={{ color:'#aaa', fontSize:12, lineHeight:1.65, fontStyle:'italic' }}>"{result.authorResponse}"</div>
          </div>
        )}

        {/* Bug breakdown */}
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase' }}>🐛 Bug Breakdown</div>
            <button onClick={() => setShowAll(s=>!s)} style={{ background:'none', border:'none', color:'#555', fontSize:10, cursor:'pointer' }}>
              {showAll ? 'Show caught only ↑' : 'Show all bugs ↓'}
            </button>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {/* Caught */}
            {(result.caughtBugs||[]).map(b => (
              <div key={b.id} style={{ background:'#00c89608', border:'1px solid #00c89622', borderRadius:10, padding:'10px 12px', display:'flex', gap:10 }}>
                <span style={{ color:'#00c896', fontSize:16, flexShrink:0 }}>✓</span>
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:3 }}>
                    <span style={{ background:SEV_COLORS[b.severity]+'22', color:SEV_COLORS[b.severity], borderRadius:6, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{b.severity}</span>
                    <span style={{ color:'#555', fontSize:9 }}>Line {b.line} · {b.type}</span>
                  </div>
                  <div style={{ color:'#888', fontSize:11, lineHeight:1.5 }}>{b.description}</div>
                </div>
              </div>
            ))}

            {/* Missed */}
            {showAll && (result.missedBugs||[]).map(b => (
              <div key={b.id} style={{ background:'#ff4d4d08', border:'1px solid #ff4d4d22', borderRadius:10, padding:'10px 12px', display:'flex', gap:10 }}>
                <span style={{ color:'#ff4d4d', fontSize:16, flexShrink:0 }}>✗</span>
                <div>
                  <div style={{ display:'flex', gap:6, marginBottom:3 }}>
                    <span style={{ background:SEV_COLORS[b.severity]+'22', color:SEV_COLORS[b.severity], borderRadius:6, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{b.severity}</span>
                    <span style={{ color:'#555', fontSize:9 }}>Line {b.line} · {b.type}</span>
                  </div>
                  <div style={{ color:'#888', fontSize:11, lineHeight:1.5 }}>{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRedo} style={{ flex:1, background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:10, color:'#888', cursor:'pointer', fontSize:13, fontWeight:600, padding:'10px 0' }}>
            Review Another PR
          </button>
          <button onClick={onHome} style={{ flex:1, background:`linear-gradient(135deg,${color},${color}88)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 0' }}>
            Back to World →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CodeReviewBattle({ user, userData, setUserData }) {
  const navigate   = useNavigate();
  const [phase,    setPhase]    = useState('select');
  const [session,  setSession]  = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startReview = async (scenarioId) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/code-review/start`, { userId:user?.uid, scenarioId });
      if (!res.data.success) throw new Error(res.data.error);
      setSession(res.data);
      setPhase('review');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (review) => {
    if (!session?.sessionId) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/code-review/${session.sessionId}/submit`, { userId:user?.uid, review });
      if (res.data.success) {
        setResult(res.data);
        setPhase('result');
        if (setUserData && res.data.score > 0) {
          const xp = Math.round(res.data.score * 0.2);
          setUserData(prev => ({ ...(prev||{}), xp:((prev||{}).xp||0)+xp }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setPhase('select'); setSession(null); setResult(null); };

  if (phase==='select') return <ScenarioSelector onStart={startReview} loading={loading} />;
  if (phase==='review' && session) return <ReviewScreen session={session} user={user} onSubmit={submitReview} submitting={submitting} />;
  if (phase==='result' && result) return <ResultScreen result={result} session={session} onRedo={reset} onHome={() => navigate('/world')} />;
  return <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', color:'#e8e8e8' }}>Loading...</div>;
}
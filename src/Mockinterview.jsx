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

const TOPICS = ['Array','String','Linked List','Tree','Graph','DP','Hash Table','Stack','Heap','Binary Search','Sorting','Sliding Window','Matrix','DFS','BFS'];

function CompanySelector({ onStart, error }) {
  const [selected, setSelected] = useState('general');
  const [starting, setStarting] = useState(false);
  const [topics,   setTopics]   = useState([]);
  const [interviewType, setInterviewType] = useState('coding');
  const config = CONFIGS[selected];

  const toggleTopic = (t) => setTopics(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);

  const TYPES = [
    { id:'coding',              label:'💻 Coding',         desc:'DSA problems with live code editor'      },
    { id:'system-design',       label:'🏗️ System Design',  desc:'Architecture & scalability discussions'  },
    { id:'behavioral',          label:'🎙️ Behavioral',     desc:'STAR method • Leadership • Conflict'     },
    { id:'technical-screening', label:'📋 Tech Screening', desc:'CS fundamentals • Resume • Role fit'     },
    { id:'frontend',            label:'🖥️ Frontend',       desc:'UI coding • React • CSS • Architecture'  },
    { id:'ai-fluency',          label:'🤖 AI Fluency',     desc:'Prompting • AI-assisted dev • Workflows' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Arial, sans-serif', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:400, height:400, background:config.color, left:'50%', top:'50%', transform:'translate(-50%,-50%)', filter:'blur(120px)', opacity:0.06, borderRadius:'50%', transition:'background 0.3s' }} />
      </div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ maxWidth:640, width:'100%', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
          <h1 style={{ margin:'0 0 8px', color:'#e8e8e8', fontSize:28, fontWeight:900 }}>Mock Interview</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>Simulate a real FAANG interview. Timer on. Camera optional. Game face on.</p>
        </div>

        {/* Interview type selector */}
        <div style={{ display:'flex', gap:8, marginBottom:24, justifyContent:'center', flexWrap:'wrap' }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setInterviewType(t.id)}
              style={{
                background: interviewType===t.id ? config.color+'22' : '#0d1117',
                border: `1px solid ${interviewType===t.id ? config.color+'66' : '#1e2a3a'}`,
                borderRadius: 12, padding:'10px 14px', cursor:'pointer',
                color: interviewType===t.id ? config.color : '#666', fontSize:11, fontWeight:700,
                transition:'all 0.15s', textAlign:'center',
              }}
            >
              <div>{t.label}</div>
              <div style={{ fontSize:9, fontWeight:400, marginTop:2, opacity:0.7 }}>{t.desc}</div>
            </button>
          ))}
        </div>

        {/* Company grid — coding only */}
        {interviewType === 'coding' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:24 }}>
            {Object.entries(CONFIGS).map(([key, c]) => (
              <motion.button key={key} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                onClick={() => setSelected(key)}
                style={{ background:selected===key?c.color+'22':'#0d1117', border:`1px solid ${selected===key?c.color+'66':'#1e2a3a'}`, borderRadius:14, padding:'16px 12px', cursor:'pointer', textAlign:'center', transition:'all 0.2s', boxShadow:selected===key?`0 0 20px ${c.color}33`:'none' }}
              >
                <div style={{ fontSize:28, marginBottom:6 }}>{c.logo}</div>
                <div style={{ color:selected===key?c.color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{c.company}</div>
                <div style={{ color:'#555', fontSize:10, marginTop:2 }}>{c.duration} min</div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Topic filter — coding only */}
        {interviewType === 'coding' && (
          <div style={{ marginBottom:20 }}>
            <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>🎯 Focus Topics (optional)</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {TOPICS.map(t => {
                const active = topics.includes(t);
                return (
                  <button key={t} onClick={() => toggleTopic(t)}
                    style={{ background:active?config.color+'22':'#0d1117', border:`1px solid ${active?config.color+'66':'#1e2a3a'}`, borderRadius:20, padding:'4px 12px', cursor:'pointer', color:active?config.color:'#555', fontSize:11, fontWeight:600, transition:'all 0.15s' }}
                  >{t}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* System Design info */}
        {interviewType === 'system-design' && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#1a73e8', fontSize:15 }}>🏗️ System Design Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>You'll get 2 system design questions in 60 minutes. Discuss architecture, trade-offs, and scalability with the AI interviewer.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['API Design','Database','Caching','Load Balancing','Message Queues','CDN','Scalability'].map(t => (
                <span key={t} style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'2px 10px', color:'#1a73e8', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral info */}
        {interviewType === 'behavioral' && (
          <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#f59e0b', fontSize:15 }}>🎙️ Behavioral Interview (STAR Method)</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>4 behavioral questions in 30 minutes. The AI interviewer will probe for specifics using the STAR framework.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Leadership','Conflict Resolution','Ownership','Teamwork','Innovation','Time Management'].map(t => (
                <span key={t} style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:12, padding:'2px 10px', color:'#f59e0b', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Technical Screening info */}
        {interviewType === 'technical-screening' && (
          <div style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#10b981', fontSize:15 }}>📋 Technical Screening Round</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>30-minute recruiter-style screening. CS fundamentals, resume walkthrough, and role fit evaluation with an AI recruiter.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Background','Big O','Data Structures','Problem Solving','Behaviorals','Role Fit'].map(t => (
                <span key={t} style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:12, padding:'2px 10px', color:'#10b981', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Frontend info */}
        {interviewType === 'frontend' && (
          <div style={{ background:'#f472b611', border:'1px solid #f472b633', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#f472b6', fontSize:15 }}>🖥️ Frontend Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>45-minute frontend-specific coding round. UI implementation, JavaScript fundamentals, React patterns, and architecture trade-offs.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['JavaScript','React','CSS','DOM','Performance','Accessibility','Component Design'].map(t => (
                <span key={t} style={{ background:'#f472b611', border:'1px solid #f472b633', borderRadius:12, padding:'2px 10px', color:'#f472b6', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* AI Fluency info */}
        {interviewType === 'ai-fluency' && (
          <div style={{ background:'#a78bfa11', border:'1px solid #a78bfa33', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#a78bfa', fontSize:15 }}>🤖 AI Fluency Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>30-minute assessment of your AI collaboration skills — prompting strategies, AI-assisted workflows, tool selection, and limitations awareness.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Prompt Engineering','AI Tools','Copilot Usage','Limitations','Debugging with AI','Evaluation'].map(t => (
                <span key={t} style={{ background:'#a78bfa11', border:'1px solid #a78bfa33', borderRadius:12, padding:'2px 10px', color:'#a78bfa', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Selected config details — coding only */}
        {interviewType === 'coding' && (
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
                  { icon:'⏱', label:'Duration', value:`${config.duration} min` },
                  { icon:'📝', label:'Problems', value:`${selected==='microsoft'?3:2} problems` },
                  { icon:'🎯', label:'Focus',    value:selected==='general'?'Mixed':config.company },
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
        )}

        {/* Tips */}
        <div style={{ background:`${config.color}11`, border:`1px solid ${config.color}22`, borderRadius:12, padding:'14px 18px', marginBottom:24 }}>
          <div style={{ color:config.color, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
            💡 {interviewType==='behavioral'?'Behavioral Tips':interviewType==='system-design'?'System Design Tips':interviewType==='technical-screening'?'Screening Tips':interviewType==='frontend'?'Frontend Tips':interviewType==='ai-fluency'?'AI Fluency Tips':'Interview Tips'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {(interviewType === 'system-design'
              ? ['Start with requirements clarification','Draw the high-level architecture first','Discuss trade-offs for every decision','Address bottlenecks and failure modes']
              : interviewType === 'behavioral'
              ? ['Use the STAR method: Situation, Task, Action, Result','Be specific — use "I" not "we"','Quantify your impact whenever possible','Show self-awareness and growth']
              : interviewType === 'technical-screening'
              ? ['Walk through your resume confidently','Use STAR for behavioral questions','Name complexity even if not asked','Ask smart questions at the end']
              : interviewType === 'frontend'
              ? ['Start with semantic HTML before CSS','Explain browser rendering trade-offs','Show accessibility awareness','Discuss bundle size and performance']
              : interviewType === 'ai-fluency'
              ? ['Show you know AI tool limitations','Discuss when NOT to use AI','Give real examples from your workflow','Talk about prompt iteration process']
              : ['Think out loud — interviewers want to hear your process','Start with brute force, then optimize','Always discuss time & space complexity','Ask clarifying questions before coding']
            ).map(tip => (
              <div key={tip} style={{ color:'#888', fontSize:11, display:'flex', gap:6 }}>
                <span style={{ color:config.color, flexShrink:0 }}>•</span>{tip}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background:'#ff4d4d11', border:'1px solid #ff4d4d44', borderRadius:12, padding:'12px 16px', marginBottom:16, color:'#ff6b6b', fontSize:13, textAlign:'center' }}>
            ⚠ {error}
          </div>
        )}

        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={async () => {
           setStarting(true);
          const companyToSend = (interviewType === 'technical-screening' || interviewType === 'ai-fluency' || interviewType === 'frontend')
          ? interviewType
          : selected;
          await onStart(companyToSend, topics, interviewType);
          setStarting(false);
        }}
          disabled={starting}
          style={{ width:'100%', background:starting?'#1e2a3a':`linear-gradient(135deg, ${config.color}, ${config.color}88)`, border:'none', borderRadius:14, color:starting?'#444':'#fff', cursor:starting?'not-allowed':'pointer', fontSize:16, fontWeight:900, padding:'16px 0', boxShadow:starting?'none':`0 0 30px ${config.color}44` }}
        >
          {starting ? '⏳ Setting up interview...'
            : interviewType === 'system-design'      ? '🏗️ Start System Design Interview'
            : interviewType === 'behavioral'          ? '🎙️ Start Behavioral Interview'
            : interviewType === 'technical-screening' ? '📋 Start Technical Screening'
            : interviewType === 'frontend'            ? '🖥️ Start Frontend Interview'
            : interviewType === 'ai-fluency'          ? '🤖 Start AI Fluency Interview'
            : `🚀 Start ${config.company} Coding Interview`}
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
  const breakdown = result.problemBreakdown || [];
  const diffColors = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };
  const statusIcon = { solved:'✓', attempted:'✗', skipped:'⊘' };
  const statusColor = { solved:'#00c896', attempted:'#ff4d4d', skipped:'#555' };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', fontFamily:'Arial, sans-serif', overflowY:'auto' }}>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#0d1117', border:`1px solid ${config.color}44`, borderRadius:20, padding:'40px', maxWidth:700, width:'100%', boxShadow:`0 0 40px ${config.color}22` }}
      >
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:56, marginBottom:8 }}>{config.logo}</div>
          <h2 style={{ margin:'0 0 4px', color:'#e8e8e8', fontSize:24, fontWeight:900 }}>{config.company} Interview Complete</h2>
          <p style={{ color:'#555', margin:0, fontSize:14 }}>Here's how you performed</p>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24, marginBottom:28, flexWrap:'wrap' }}>
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:150, delay:0.2 }}
            style={{ width:90, height:90, borderRadius:'50%', background:gradeColor+'22', border:`3px solid ${gradeColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}
          >
            <span style={{ color:gradeColor, fontSize:36, fontWeight:900, lineHeight:1 }}>{grade}</span>
            <span style={{ color:gradeColor, fontSize:11, fontWeight:700 }}>{result.pct}%</span>
          </motion.div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {[
              { label:'Solved', value:`${result.solvedCount}/${result.totalProbs||2}`, color:'#00c896' },
              { label:'Score',  value:`${result.totalScore}/${result.maxScore}`,       color:'#a855f7' },
              { label:'Grade',  value:grade,                                           color:gradeColor },
            ].map(s => (
              <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                <div style={{ color:s.color, fontSize:18, fontWeight:900 }}>{s.value}</div>
                <div style={{ color:'#444', fontSize:9, marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {breakdown.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ color:config.color, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 Problem Breakdown</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {breakdown.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1*i }}
                  style={{ background:p.status==='solved'?'#00c89608':p.status==='attempted'?'#ff4d4d08':'#0d1117', border:`1px solid ${statusColor[p.status]}33`, borderRadius:12, padding:'14px 16px' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:statusColor[p.status], fontSize:16, fontWeight:900 }}>{statusIcon[p.status]}</span>
                      <span style={{ color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{p.title}</span>
                      <span style={{ background:diffColors[p.difficulty]+'22', border:`1px solid ${diffColors[p.difficulty]}44`, color:diffColors[p.difficulty], borderRadius:12, padding:'1px 8px', fontSize:10, fontWeight:700 }}>{p.difficulty}</span>
                    </div>
                    <span style={{ color:statusColor[p.status], fontSize:11, fontWeight:700, textTransform:'uppercase' }}>{p.status}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                    {[
                      { label:'Attempts', value:p.attempts,                        icon:'🔄' },
                      { label:'Tests',    value:`${p.testsPassed}/${p.testsTotal}`, icon:'🧪' },
                      { label:'Time',     value:`${p.timeSpentMin}m`,               icon:'⏱' },
                      { label:'Points',   value:p.score,                            icon:'⭐' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#060910', borderRadius:6, padding:'6px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:12, color:'#e8e8e8', fontWeight:700 }}>{s.icon} {s.value}</div>
                        <div style={{ color:'#444', fontSize:8, marginTop:1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {(p.plagiarismFlag || p.tabSwitches > 3 || p.pasteCount > 2) && (
                    <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                      {p.tabSwitches > 3 && <span style={{ background:'#f5c54222', border:'1px solid #f5c54244', borderRadius:6, padding:'2px 8px', color:'#f5c542', fontSize:10, fontWeight:600 }}>⚠ {p.tabSwitches} tab switches</span>}
                      {p.pasteCount > 2 && <span style={{ background:'#f5c54222', border:'1px solid #f5c54244', borderRadius:6, padding:'2px 8px', color:'#f5c542', fontSize:10, fontWeight:600 }}>📋 {p.pasteCount} paste events</span>}
                      {p.plagiarismFlag && <span style={{ background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:6, padding:'2px 8px', color:'#ff4d4d', fontSize:10, fontWeight:600 }}>🚩 Code similarity flagged</span>}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {result.feedback && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'14px 16px', marginBottom:24 }}>
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
  const [phase,     setPhase]     = useState('select');
  const [session,   setSession]   = useState(null);
  const [company,   setCompany]   = useState('general');
  const [probIdx,   setProbIdx]   = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [solved,    setSolved]    = useState([]);
  const [result,    setResult]    = useState(null);
  const [startError, setStartError] = useState(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteCount,  setPasteCount]  = useState(0);
  const timerRef = useRef(null);

  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const askInterviewer = useCallback(async (userMsg) => {
    if (!session?.sessionId) return;
    const problem = session.problems?.[probIdx];
    if (!problem) return;
    setChatLoading(true);
    const conversation = [...chatMsgs];
    if (userMsg) conversation.push({ role:'candidate', text:userMsg });
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-question`, {
        userId: user.uid, problemId: problem.id, code: '', language: 'python3', conversation,
      });
      if (res.data.question) {
        setChatMsgs([...conversation, { role:'interviewer', text:res.data.question }]);
      }
    } catch (e) { console.error('AI interviewer error:', e); }
    finally { setChatLoading(false); }
  }, [session, probIdx, chatMsgs, user.uid]);

  // Auto-ask opening question
  useEffect(() => {
    if (phase !== 'active' || !session?.sessionId) return;
    const problem = session.problems?.[probIdx];
    if (!problem) return;
    setChatMsgs([]);
    const timer = setTimeout(async () => {
      try {
        setChatLoading(true);
        const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-question`, {
          userId: user.uid, problemId: problem.id, code: '', language: 'python3', conversation: [],
        });
        if (res.data.question) {
          setChatMsgs([{ role:'interviewer', text:res.data.question }]);
          setChatOpen(true);
        }
      } catch (e) {
        console.error('AI auto-question failed:', e);
        setChatMsgs([{ role:'interviewer', text:'⚠ Interviewer unavailable — check GROQ_API_KEY on Render.' }]);
      } finally { setChatLoading(false); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, probIdx, session?.sessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [chatMsgs]);

  useEffect(() => {
    if (phase !== 'active') return;
    const onVisChange = () => { if (document.hidden) setTabSwitches(c => c+1); };
    const onPaste     = () => setPasteCount(c => c+1);
    document.addEventListener('visibilitychange', onVisChange);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      document.removeEventListener('paste', onPaste);
    };
  }, [phase]);

  const config = CONFIGS[company] || CONFIGS.general;

  const startInterview = async (selectedCompany, selectedTopics = [], selectedType = 'coding') => {
    setCompany(selectedCompany);
    setStartError(null);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/start`, {
        userId: user.uid, company: selectedCompany, topics: selectedTopics, interviewType: selectedType,
      });
      const data = res.data;
      if (!data || !Array.isArray(data.problems) || data.problems.length === 0) {
        setStartError('Could not load interview problems. Please try again in a moment.');
        return;
      }
      setSession(data);
      setRemaining((data.duration || 60) * 60);
      setPhase('active');
    } catch (err) {
      console.error('Failed to start interview:', err);
      setStartError('Failed to start interview. Please check your connection and try again.');
    }
  };

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
    } catch {
      setPhase('complete');
      setResult({ pct:0, totalScore:0, maxScore:100, solvedCount:0, feedback:'Interview ended.', totalProbs:2 });
    }
  }, [session, user.uid]);

  const handleSubmit = async (code, langId, testResults) => {
    const problem = session?.problems?.[probIdx];
    if (!problem) return { passed:false };
    const passed    = testResults.filter(r => r.passed).length;
    const total     = testResults.length;
    const allPassed = passed === total && total > 0;
    try {
      await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/submit`, {
        userId: user.uid, problemId: problem.id, code, language: langId,
        passed, total, allPassed, tabSwitches, pasteCount,
      });
      if (allPassed) {
        setSolved(prev => [...new Set([...prev, problem.id])]);
        const next = session.problems.findIndex((p,i) => i > probIdx && !solved.includes(p.id));
        if (next !== -1) setTimeout(() => setProbIdx(next), 800);
      }
      return { passed:allPassed, passedCount:passed, total, xp:0, credits:0 };
    } catch {
      return { passed:false, passedCount:passed, total };
    }
  };

  if (phase === 'select') return <CompanySelector onStart={startInterview} error={startError} />;
  if (phase === 'complete') return (
    <InterviewResult result={result || {}} company={company}
      onRedo={() => { setPhase('select'); setSession(null); setSolved([]); setProbIdx(0); }}
      onHome={() => navigate('/world')}
    />
  );

  const problems       = session?.problems || [];
  const currentProblem = problems[probIdx];
  const pctDone        = (remaining / ((session?.config?.duration || 60) * 60)) * 100;
  const timeColor      = remaining < 300 ? '#ff4d4d' : remaining < 900 ? '#f5c542' : '#00c896';

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0a0a14', fontFamily:'Arial, sans-serif', overflow:'hidden' }}>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} }`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0, gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>{config.logo}</span>
          <div>
            <div style={{ color:config.color, fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{config.company} Mock Interview</div>
            <div style={{ display:'flex', gap:5, marginTop:3 }}>
              {problems.map((p,i) => {
                const isSolved = solved.includes(p.id);
                const isCurr   = i === probIdx;
                const dc       = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' }[p.difficulty] || '#888';
                return (
                  <button key={p.id} onClick={() => setProbIdx(i)}
                    style={{ background:isCurr?dc+'22':isSolved?'#00c89611':'transparent', border:`1px solid ${isCurr?dc:isSolved?'#00c89633':'#1e2a3a'}`, borderRadius:6, color:isCurr?dc:isSolved?'#00c896':'#555', cursor:'pointer', fontSize:11, fontWeight:700, padding:'3px 10px' }}
                  >
                    {isSolved ? '✓' : i+1} {p.difficulty}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
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
          >End Interview →</motion.button>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ flex:1, overflow:'hidden' }}>

        {/* Coding */}
        {(!session?.interviewType || session.interviewType === 'coding') && currentProblem && (
          <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage="python3" hideHints />
        )}

        {/* Frontend */}
        {session?.interviewType === 'frontend' && currentProblem && (
          <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage="javascript" hideHints />
        )}

        {/* System Design */}
        {session?.interviewType === 'system-design' && currentProblem && (
          <div style={{ display:'flex', height:'100%', fontFamily:'Arial, sans-serif' }}>
            <div style={{ width:'50%', display:'flex', flexDirection:'column', borderRight:'1px solid #1e2a3a', overflow:'hidden' }}>
              <div style={{ padding:'20px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
                <h2 style={{ margin:'0 0 8px', color:'#e8e8e8', fontSize:17, fontWeight:800 }}>🏗️ {currentProblem.title}</h2>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                  {(currentProblem.topics||currentProblem.tags||[]).map(t => (
                    <span key={t} style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'2px 8px', color:'#1a73e8', fontSize:10 }}>{t}</span>
                  ))}
                </div>
                {currentProblem.requirements && (
                  <div>
                    <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>Requirements</div>
                    <ul style={{ margin:0, padding:'0 0 0 16px', color:'#999', fontSize:12, lineHeight:1.7 }}>
                      {currentProblem.requirements.map((r,i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              <div style={{ flex:1, padding:'16px', display:'flex', flexDirection:'column' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>📝 Your Architecture Notes</div>
                <textarea placeholder="Write your system design here..." style={{ flex:1, width:'100%', boxSizing:'border-box', background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px', color:'#e8e8e8', fontSize:13, fontFamily:'"Fira Code", monospace', lineHeight:1.7, outline:'none', resize:'none' }} />
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0d1117' }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:20 }}>🤖</span>
                <div>
                  <div style={{ color:'#1a73e8', fontSize:12, fontWeight:900 }}>System Design Interviewer</div>
                  <div style={{ color:'#444', fontSize:9 }}>Discusses architecture, trade-offs, and scalability</div>
                </div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {chatMsgs.map((m,i) => (
                  <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'85%', background:m.role==='candidate'?'#1a73e822':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#1a73e844':'#2a3645'}`, borderRadius:m.role==='candidate'?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'8px 12px', color:m.role==='candidate'?'#88bbff':'#c8c8c8', fontSize:12, lineHeight:1.6 }}>{m.text}</div>
                ))}
                {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🤖 Thinking...</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a3a', display:'flex', gap:6 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                  placeholder="Discuss your design..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 12px', color:'#e8e8e8', fontSize:12, outline:'none' }}
                />
                <button onClick={()=>{if(chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                  disabled={chatLoading||!chatInput.trim()} style={{ background:'#1a73e8', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
              </div>
            </div>
          </div>
        )}

        {/* Behavioral */}
        {session?.interviewType === 'behavioral' && currentProblem && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ background:'#f59e0b22', border:'1px solid #f59e0b44', borderRadius:12, padding:'2px 10px', color:'#f59e0b', fontSize:10, fontWeight:700 }}>{currentProblem.category || 'Behavioral'}</span>
              </div>
              <p style={{ margin:0, color:'#e8e8e8', fontSize:14, lineHeight:1.6 }}>{currentProblem.title || currentProblem.description}</p>
              {currentProblem.starGuide && <p style={{ margin:'8px 0 0', color:'#666', fontSize:11, lineHeight:1.5 }}>💡 <em>{currentProblem.starGuide}</em></p>}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'75%', background:m.role==='candidate'?'#f59e0b11':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#f59e0b44':'#2a3645'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#fde68a':'#c8c8c8', fontSize:13, lineHeight:1.7 }}>{m.text}</div>
              ))}
              {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🤖 Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'12px 24px', borderTop:'1px solid #1e2a3a', display:'flex', gap:8, flexShrink:0, background:'#0d1117' }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                placeholder="Share your experience using the STAR method..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }}
              />
              <button onClick={()=>{if(chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                disabled={chatLoading||!chatInput.trim()} style={{ background:'#f59e0b', border:'none', borderRadius:10, color:'#000', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 18px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
            </div>
          </div>
        )}

        {/* Technical Screening */}
        {session?.interviewType === 'technical-screening' && (
          <div style={{ display:'flex', height:'100%' }}>
            <div style={{ width:240, borderRight:'1px solid #1e2a3a', padding:'20px 16px', overflowY:'auto', flexShrink:0, background:'#0d1117' }}>
              <div style={{ color:'#10b981', fontSize:13, fontWeight:900, marginBottom:6 }}>📋 Screening Round</div>
              <div style={{ color:'#555', fontSize:11, lineHeight:1.7, marginBottom:16 }}>A recruiter-style conversation assessing your background, CS knowledge, and role fit.</div>
              {['Your background & experience','Big O + Data Structures','Problem-solving process','Behavioral (STAR)','Role fit & motivation'].map((item,i) => (
                <div key={i} style={{ color:'#444', fontSize:11, marginBottom:8, display:'flex', gap:6 }}>
                  <span style={{ color:'#10b981', flexShrink:0 }}>→</span>{item}
                </div>
              ))}
              <div style={{ marginTop:16, background:'#10b98111', border:'1px solid #10b98122', borderRadius:10, padding:10 }}>
                <div style={{ color:'#10b981', fontSize:10, fontWeight:700, marginBottom:6 }}>💡 Tips</div>
                {['Be concise and structured','Use "I" not "we"','Quantify your impact','Ask one smart question back'].map(t => (
                  <div key={t} style={{ color:'#555', fontSize:10, marginBottom:4 }}>• {t}</div>
                ))}
              </div>
            </div>
            <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
              <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {chatMsgs.length===0 && !chatLoading && <div style={{ color:'#333', fontSize:13, textAlign:'center', padding:40 }}>🤖 Connecting to your recruiter...</div>}
                {chatMsgs.map((m,i) => (
                  <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'72%', background:m.role==='candidate'?'#1a73e822':'#10b98118', border:`1px solid ${m.role==='candidate'?'#1a73e844':'#10b98133'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#88bbff':'#d8d8d8', fontSize:13, lineHeight:1.65 }}>
                    {m.role==='interviewer' && <div style={{ color:'#10b981', fontSize:10, fontWeight:700, marginBottom:4 }}>📋 RECRUITER</div>}
                    {m.text}
                  </div>
                ))}
                {chatLoading && <div style={{ color:'#444', fontSize:12, fontStyle:'italic' }}>📋 Recruiter is typing...</div>}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding:'12px 16px', borderTop:'1px solid #1e2a3a', display:'flex', gap:8, background:'#0d1117', flexShrink:0 }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                  placeholder="Type your answer..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }}
                />
                <button onClick={()=>{if(chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}} disabled={chatLoading||!chatInput.trim()}
                  style={{ background:'#10b981', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
              </div>
            </div>
          </div>
        )}

        {/* AI Fluency */}
        {session?.interviewType === 'ai-fluency' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:'#a78bfa22', border:'1px solid #a78bfa44', borderRadius:12, padding:'2px 10px', color:'#a78bfa', fontSize:10, fontWeight:700 }}>AI FLUENCY ROUND</span>
                <span style={{ color:'#555', fontSize:11 }}>Discuss your real experience with AI tools — there are no wrong answers, only shallow ones.</span>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
              {chatMsgs.length===0 && !chatLoading && <div style={{ color:'#333', fontSize:13, textAlign:'center', padding:40 }}>🤖 AI interviewer is ready...</div>}
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'75%', background:m.role==='candidate'?'#a78bfa11':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#a78bfa44':'#2a3645'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#c4b5fd':'#c8c8c8', fontSize:13, lineHeight:1.7 }}>
                  {m.role==='interviewer' && <div style={{ color:'#a78bfa', fontSize:10, fontWeight:700, marginBottom:4 }}>🤖 AI INTERVIEWER</div>}
                  {m.text}
                </div>
              ))}
              {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🤖 Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'12px 24px', borderTop:'1px solid #1e2a3a', display:'flex', gap:8, background:'#0d1117', flexShrink:0 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                placeholder="Share how you use AI in your workflow..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }}
              />
              <button onClick={()=>{if(chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(p=>[...p,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}} disabled={chatLoading||!chatInput.trim()}
                style={{ background:'#a78bfa', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
            </div>
          </div>
        )}

      </div>{/* end main content */}

      {/* Floating AI chat — coding + frontend only */}
      {(!session?.interviewType || session.interviewType === 'coding' || session.interviewType === 'frontend') && (
        <>
          <motion.button
            whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
            onClick={() => setChatOpen(o => !o)}
            style={{ position:'fixed', bottom:24, right:24, zIndex:9000, width:52, height:52, borderRadius:'50%', background:`linear-gradient(135deg, ${config.color}, ${config.color}88)`, border:'none', cursor:'pointer', fontSize:22, boxShadow:`0 4px 20px ${config.color}44`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}
          >
            {chatOpen ? '✕' : '🤖'}
            {!chatOpen && chatMsgs.length > 0 && (
              <span style={{ position:'absolute', top:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#ff4d4d', border:'2px solid #0a0a14', animation:'pulse 1.5s infinite' }} />
            )}
          </motion.button>

          <AnimatePresence>
            {chatOpen && (
              <motion.div
                initial={{ opacity:0, y:20, scale:0.95 }}
                animate={{ opacity:1, y:0, scale:1 }}
                exit={{ opacity:0, y:20, scale:0.95 }}
                style={{ position:'fixed', bottom:86, right:24, zIndex:9000, width:360, maxHeight:'55vh', background:'#0d1117', border:`1px solid ${config.color}44`, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:`0 8px 40px #00000088` }}
              >
                <div style={{ padding:'12px 16px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ fontSize:20 }}>🤖</span>
                  <div>
                    <div style={{ color:config.color, fontSize:12, fontWeight:900 }}>{config.company} Interviewer</div>
                    <div style={{ color:'#444', fontSize:9 }}>AI-powered • Asks follow-ups • Never gives answers</div>
                  </div>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                  {chatMsgs.length === 0 && !chatLoading && (
                    <div style={{ color:'#333', fontSize:12, textAlign:'center', padding:20 }}>The AI interviewer will ask you questions about your approach, just like a real interview.</div>
                  )}
                  {chatMsgs.map((m,i) => (
                    <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'85%', background:m.role==='candidate'?'#1a73e822':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#1a73e844':'#2a3645'}`, borderRadius:m.role==='candidate'?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'8px 12px', color:m.role==='candidate'?'#88bbff':'#c8c8c8', fontSize:12, lineHeight:1.6 }}>
                      {m.text}
                    </div>
                  ))}
                  {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🤖 Thinking...</div>}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a3a', display:'flex', gap:6, flexShrink:0 }}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(prev=>[...prev,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                    placeholder="Reply to the interviewer..."
                    style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 12px', color:'#e8e8e8', fontSize:12, outline:'none' }}
                  />
                  <button
                    onClick={()=>{if(chatInput.trim()&&!chatLoading){const msg=chatInput.trim();setChatMsgs(prev=>[...prev,{role:'candidate',text:msg}]);setChatInput('');askInterviewer(msg);}}}
                    disabled={chatLoading||!chatInput.trim()}
                    style={{ background:config.color, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}
                  >Send</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
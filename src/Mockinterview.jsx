import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';
import { LiveObserverPanel, IntegrityReport } from './InterviewObserver';
import { HiringReportPanel, downloadHiringReportPDF } from './HiringReport';
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

// ── Voice Interview Component ─────────────────────────────────────────────────
function VoiceInterview({ chatMsgs, chatLoading, chatEndRef, askInterviewer, setChatMsgs }) {
  const [listening,  setListening]  = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported,  setSupported]  = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const last = chatMsgs[chatMsgs.length - 1];
    if (!last || last.role !== 'interviewer') return;
    const utt = new window.SpeechSynthesisUtterance(last.text);
    utt.rate = 0.95; utt.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }, [chatMsgs]);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); recognitionRef.current?.stop(); };
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    window.speechSynthesis.cancel();
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let currentTranscript = '';
    recognition.onresult = (e) => {
      currentTranscript = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(currentTranscript);
    };
    recognition.onend = () => {
      setListening(false);
      if (currentTranscript.trim()) {
        const msg = currentTranscript.trim();
        setTranscript('');
        setChatMsgs(p => [...p, { role:'candidate', text:msg }]);
        askInterviewer(msg);
      }
    };
    recognition.onerror = () => { setListening(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
      <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:'#ec489922', border:'1px solid #ec489944', borderRadius:12, padding:'2px 10px', color:'#ec4899', fontSize:10, fontWeight:700 }}>🎤 VOICE INTERVIEW</span>
          <span style={{ color:'#555', fontSize:11 }}>Speak your answers — AI listens and responds aloud.</span>
          {!supported && <span style={{ color:'#ff4d4d', fontSize:11 }}>⚠ Not supported. Use Chrome.</span>}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
        {chatMsgs.length===0 && !chatLoading && (
          <div style={{ color:'#333', fontSize:13, textAlign:'center', padding:40 }}>
            🎤 Press the mic button below to start speaking.<br/>
            <span style={{ fontSize:11, color:'#2a3645' }}>The AI will ask questions and read them aloud.</span>
          </div>
        )}
        {chatMsgs.map((m,i) => (
          <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'75%', background:m.role==='candidate'?'#ec489911':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#ec489944':'#2a3645'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#fbcfe8':'#c8c8c8', fontSize:13, lineHeight:1.7 }}>
            {m.role==='interviewer' && <div style={{ color:'#ec4899', fontSize:10, fontWeight:700, marginBottom:4 }}>🔊 AI RECRUITER</div>}
            {m.text}
          </div>
        ))}
        {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🎤 AI is responding...</div>}
        <div ref={chatEndRef} />
      </div>
      {transcript && (
        <div style={{ padding:'8px 24px', background:'#ec489908', borderTop:'1px solid #ec489922' }}>
          <span style={{ color:'#ec4899', fontSize:11, fontStyle:'italic' }}>🎤 "{transcript}"</span>
        </div>
      )}
      <div style={{ padding:'20px 24px', borderTop:'1px solid #1e2a3a', background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center', gap:16, flexShrink:0 }}>
        <motion.button
          whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
          onClick={listening ? stopListening : startListening}
          disabled={chatLoading || !supported}
          style={{ width:72, height:72, borderRadius:'50%', background:listening?'#ff4d4d':'#ec4899', border:listening?'3px solid #ff8080':'3px solid #ec489966', cursor:'pointer', fontSize:28, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:listening?'0 0 30px #ff4d4d66':'0 0 20px #ec489944', opacity:chatLoading||!supported?0.4:1 }}
        >
          {listening ? '⏹' : '🎤'}
        </motion.button>
        <div style={{ color:'#555', fontSize:12 }}>
          {chatLoading ? 'AI is responding...' : listening ? 'Listening — tap to stop' : 'Tap to speak'}
        </div>
      </div>
    </div>
  );
}

// ── Company Selector ──────────────────────────────────────────────────────────
function CompanySelector({ onStart, error }) {
  const [selected,        setSelected]        = useState('general');
  const [starting,        setStarting]        = useState(false);
  const [topics,          setTopics]          = useState([]);
  const [interviewType,   setInterviewType]   = useState('coding');
  const [jdText,          setJdText]          = useState('');
  const [jdFile,          setJdFile]          = useState(null);
  const [jdLoading,       setJdLoading]       = useState(false);
  const [realWorld,       setRealWorld]       = useState(false);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);
  const config = CONFIGS[selected] || CONFIGS.general;

  const toggleTopic = (t) => setTopics(prev => prev.includes(t) ? prev.filter(x=>x!==t) : [...prev, t]);

  const TYPES = [
    { id:'coding',              label:'💻 Coding',         desc:'DSA problems with live code editor'      },
    { id:'system-design',       label:'🏗️ System Design',  desc:'Architecture & scalability discussions'  },
    { id:'behavioral',          label:'🎙️ Behavioral',     desc:'STAR method • Leadership • Conflict'     },
    { id:'technical-screening', label:'📋 Tech Screening', desc:'CS fundamentals • Resume • Role fit'     },
    { id:'frontend',            label:'🖥️ Frontend',       desc:'UI coding • React • CSS • Architecture'  },
    { id:'ai-fluency',          label:'🤖 AI Fluency',     desc:'Prompting • AI-assisted dev • Workflows' },
    { id:'personalized',        label:'📄 Personalized',   desc:'JD upload • Role-specific questions'     },
    { id:'voice',               label:'🎤 Voice',          desc:'Speak naturally • AI listens & responds' },
    { id:'autonomous', label:'🧠 Autonomous AI', desc:'Adaptive • Self-directing • Full report' },
  ];

  const typeColors = {
    coding:'#a855f7', 'system-design':'#1a73e8', behavioral:'#f59e0b',
    'technical-screening':'#10b981', frontend:'#f472b6', 'ai-fluency':'#a78bfa',
    personalized:'#f59e0b', voice:'#ec4899',
  };
  const activeColor = typeColors[interviewType] || config.color;

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:'Arial, sans-serif', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        <div style={{ position:'absolute', width:400, height:400, background:activeColor, left:'50%', top:'50%', transform:'translate(-50%,-50%)', filter:'blur(120px)', opacity:0.06, borderRadius:'50%', transition:'background 0.3s' }} />
      </div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} style={{ maxWidth:680, width:'100%', position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
          <h1 style={{ margin:'0 0 8px', color:'#e8e8e8', fontSize:28, fontWeight:900 }}>Mock Interview</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>Simulate a real FAANG interview. Timer on. Camera optional. Game face on.</p>
        </div>

        {/* Interview type selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:24 }}>
          {TYPES.map(t => {
            const tc = typeColors[t.id] || '#a855f7';
            return (
              <button key={t.id} onClick={() => setInterviewType(t.id)}
                style={{ background:interviewType===t.id?tc+'22':'#0d1117', border:`1px solid ${interviewType===t.id?tc+'66':'#1e2a3a'}`, borderRadius:12, padding:'10px 8px', cursor:'pointer', color:interviewType===t.id?tc:'#666', fontSize:11, fontWeight:700, transition:'all 0.15s', textAlign:'center' }}
              >
                <div>{t.label}</div>
                <div style={{ fontSize:8, fontWeight:400, marginTop:2, opacity:0.7 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Company grid — coding only */}
        {interviewType === 'coding' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
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

        {/* Real-world mode toggle — coding only */}
        {interviewType === 'coding' && (
          <div style={{ marginBottom:20 }}>
            <button onClick={() => setRealWorld(r => !r)}
              style={{ width:'100%', background:realWorld?'#f59e0b11':'#0d1117', border:`1px solid ${realWorld?'#f59e0b66':'#1e2a3a'}`, borderRadius:12, padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.2s' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>🌍</span>
                <div style={{ textAlign:'left' }}>
                  <div style={{ color:realWorld?'#f59e0b':'#e8e8e8', fontSize:13, fontWeight:700 }}>Real-World Mode</div>
                  <div style={{ color:'#555', fontSize:10, marginTop:2 }}>AI generates actual {CONFIGS[selected]?.company || 'company'} interview problems on-demand</div>
                </div>
              </div>
              <div style={{ width:40, height:22, background:realWorld?'#f59e0b':'#1e2a3a', borderRadius:11, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:realWorld?19:3, width:16, height:16, background:'#fff', borderRadius:'50%', transition:'left 0.2s' }} />
              </div>
            </button>
            {realWorld && (
              <div style={{ background:'#f59e0b08', border:'1px solid #f59e0b22', borderRadius:8, padding:'8px 12px', marginTop:6, color:'#888', fontSize:11 }}>
                ⚡ The AI will generate fresh {CONFIGS[selected]?.company || 'company'}-style problems each session. Generation takes ~5 seconds.
              </div>
            )}
          </div>
        )}

        {/* AI IDE toggle — all types */}
        <div style={{ marginBottom:20 }}>
          <button onClick={() => setAiAssistEnabled(a => !a)}
            style={{ width:'100%', background:aiAssistEnabled?'#1a73e811':'#0d1117', border:`1px solid ${aiAssistEnabled?'#1a73e866':'#1e2a3a'}`, borderRadius:12, padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.2s' }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:20 }}>✨</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ color:aiAssistEnabled?'#1a73e8':'#e8e8e8', fontSize:13, fontWeight:700 }}>AI-Assisted IDE</div>
                <div style={{ color:'#555', fontSize:10, marginTop:2 }}>Enable AI chat + inline completions • All usage tracked</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {aiAssistEnabled && <span style={{ background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:6, padding:'1px 6px', color:'#ff4d4d', fontSize:9, fontWeight:700 }}>TRACKED</span>}
              <div style={{ width:40, height:22, background:aiAssistEnabled?'#1a73e8':'#1e2a3a', borderRadius:11, position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:3, left:aiAssistEnabled?19:3, width:16, height:16, background:'#fff', borderRadius:'50%', transition:'left 0.2s' }} />
              </div>
            </div>
          </button>
          {aiAssistEnabled && (
            <div style={{ background:'#1a73e808', border:'1px solid #1a73e822', borderRadius:8, padding:'8px 12px', marginTop:6, color:'#888', fontSize:11 }}>
              ⚠ All AI prompts, responses, and accepted suggestions are logged and visible in the interview report.
            </div>
          )}
        </div>

        {/* Info panels */}
        {interviewType === 'system-design' && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#1a73e8', fontSize:15 }}>🏗️ System Design Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>2 system design questions in 60 minutes. Discuss architecture, trade-offs, and scalability with the AI interviewer.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['API Design','Database','Caching','Load Balancing','Message Queues','CDN','Scalability'].map(t => (
                <span key={t} style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'2px 10px', color:'#1a73e8', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'behavioral' && (
          <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#f59e0b', fontSize:15 }}>🎙️ Behavioral Interview (STAR Method)</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>4 behavioral questions in 30 minutes. The AI will probe using the STAR framework.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Leadership','Conflict Resolution','Ownership','Teamwork','Innovation','Time Management'].map(t => (
                <span key={t} style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:12, padding:'2px 10px', color:'#f59e0b', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'technical-screening' && (
          <div style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#10b981', fontSize:15 }}>📋 Technical Screening Round</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>30-minute recruiter-style screening. CS fundamentals, resume walkthrough, and role fit evaluation.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Background','Big O','Data Structures','Problem Solving','Behaviorals','Role Fit'].map(t => (
                <span key={t} style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:12, padding:'2px 10px', color:'#10b981', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'frontend' && (
          <div style={{ background:'#f472b611', border:'1px solid #f472b633', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#f472b6', fontSize:15 }}>🖥️ Frontend Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>45-minute frontend coding round. JavaScript, React patterns, CSS, and architecture trade-offs.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['JavaScript','React','CSS','DOM','Performance','Accessibility','Component Design'].map(t => (
                <span key={t} style={{ background:'#f472b611', border:'1px solid #f472b633', borderRadius:12, padding:'2px 10px', color:'#f472b6', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'ai-fluency' && (
          <div style={{ background:'#a78bfa11', border:'1px solid #a78bfa33', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#a78bfa', fontSize:15 }}>🤖 AI Fluency Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>30-minute assessment of AI collaboration skills — prompting strategies, tool usage, and limitations awareness.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['Prompt Engineering','AI Tools','Copilot Usage','Limitations','Debugging with AI','Evaluation'].map(t => (
                <span key={t} style={{ background:'#a78bfa11', border:'1px solid #a78bfa33', borderRadius:12, padding:'2px 10px', color:'#a78bfa', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'personalized' && (
          <div style={{ marginBottom:20 }}>
            <div style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:14, padding:'16px 20px', marginBottom:12 }}>
              <h3 style={{ margin:'0 0 6px', color:'#f59e0b', fontSize:15 }}>📄 Personalized Interview</h3>
              <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:0 }}>Paste a job description and the AI will generate 5 role-specific interview questions just for you.</p>
            </div>
            <div style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'16px' }}>
              <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>Paste Job Description</div>
              <textarea value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here — requirements, responsibilities, tech stack..."
                style={{ width:'100%', boxSizing:'border-box', height:140, background:'#060910', border:`1px solid ${jdText.length > 100 ? '#f59e0b44' : '#1e2a3a'}`, borderRadius:8, padding:'10px 12px', color:'#e8e8e8', fontSize:12, fontFamily:'Arial, sans-serif', lineHeight:1.6, outline:'none', resize:'vertical' }}
              />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
                <div style={{ flex:1, height:1, background:'#1e2a3a' }} />
                <span style={{ color:'#333', fontSize:11 }}>or</span>
                <div style={{ flex:1, height:1, background:'#1e2a3a' }} />
              </div>
              <label style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10, background:'#060910', border:`1px solid ${jdFile ? '#f59e0b44' : '#1e2a3a'}`, borderRadius:8, padding:'10px', cursor:'pointer', color:jdFile?'#f59e0b':'#555', fontSize:12, fontWeight:600, transition:'all 0.15s' }}>
                <input type="file" accept=".pdf,.txt,.doc,.docx" style={{ display:'none' }}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setJdFile(file);
                    setJdLoading(true);
                    try {
                      if (file.type === 'text/plain') {
                        const text = await file.text();
                        setJdText(text);
                      } else {
                        setJdText(`[File: ${file.name}] — PDF text extraction requires manual paste. Please also paste the JD text above.`);
                      }
                    } finally { setJdLoading(false); }
                  }}
                />
                {jdLoading ? '⏳ Reading file...' : jdFile ? `✓ ${jdFile.name}` : '📎 Upload PDF or TXT'}
              </label>
              {jdText.length > 0 && (
                <div style={{ marginTop:8, color:'#f59e0b', fontSize:10, textAlign:'right' }}>{jdText.length} characters — ready to generate questions</div>
              )}
            </div>
          </div>
        )}

        {interviewType === 'voice' && (
          <div style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#ec4899', fontSize:15 }}>🎤 Voice Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>Speak naturally with an AI recruiter. Your voice is transcribed in real time. The AI reads questions aloud.</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              {['Speech-to-Text','Text-to-Speech','Real-time','No Typing'].map(t => (
                <span key={t} style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:12, padding:'2px 10px', color:'#ec4899', fontSize:10 }}>{t}</span>
              ))}
            </div>
            <div style={{ background:'#ec489908', borderRadius:8, padding:'10px 12px', color:'#888', fontSize:11 }}>
              ⚠ Uses browser's built-in speech recognition. Works best in Chrome. Allow microphone access when prompted.
            </div>
          </div>
        )}
        {interviewType === 'autonomous' && (
          <div style={{ background:'#00c89611', border:'1px solid #00c89633', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#00c896', fontSize:15 }}>🧠 Autonomous AI Interviewer</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              A fully adaptive AI interviewer drives the entire session. No fixed questions — it responds to your answers, probes weak areas, and generates a comprehensive AI hiring report.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              {['Adaptive Questioning','Real-time Probing','Multi-domain','Behavioral + Technical','AI Hiring Report','PDF Export'].map(t => (
                <span key={t} style={{ background:'#00c89611', border:'1px solid #00c89633', borderRadius:12, padding:'2px 10px', color:'#00c896', fontSize:10 }}>{t}</span>
              ))}
            </div>
            <div style={{ background:'#00c89608', borderRadius:8, padding:'8px 12px', color:'#888', fontSize:11 }}>
              💡 The AI adjusts every question based on your previous answer. Stronger answers lead to harder follow-ups. Weaker answers trigger deeper probing.
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
        <div style={{ background:`${activeColor}11`, border:`1px solid ${activeColor}22`, borderRadius:12, padding:'14px 18px', marginBottom:24 }}>
          <div style={{ color:activeColor, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
            💡 {interviewType==='behavioral'?'Behavioral Tips':interviewType==='system-design'?'System Design Tips':interviewType==='technical-screening'?'Screening Tips':interviewType==='frontend'?'Frontend Tips':interviewType==='ai-fluency'?'AI Fluency Tips':interviewType==='personalized'?'Personalized Tips':interviewType==='voice'?'Voice Tips':'Interview Tips'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {(interviewType==='system-design'
              ? ['Start with requirements clarification','Draw the high-level architecture first','Discuss trade-offs for every decision','Address bottlenecks and failure modes']
              : interviewType==='behavioral'
              ? ['Use the STAR method: Situation, Task, Action, Result','Be specific — use "I" not "we"','Quantify your impact whenever possible','Show self-awareness and growth']
              : interviewType==='technical-screening'
              ? ['Walk through your resume confidently','Use STAR for behavioral questions','Name complexity even if not asked','Ask smart questions at the end']
              : interviewType==='frontend'
              ? ['Start with semantic HTML before CSS','Explain browser rendering trade-offs','Show accessibility awareness','Discuss bundle size and performance']
              : interviewType==='ai-fluency'
              ? ['Show you know AI tool limitations','Discuss when NOT to use AI','Give real examples from your workflow','Talk about prompt iteration process']
              : interviewType==='personalized'
              ? ['Review the JD before starting','Connect every answer to JD requirements','Show specific relevant experience','Prepare a smart question to ask back']
              : interviewType==='voice'
              ? ['Speak clearly and at a natural pace','Structure answers with STAR','Pause before answering — it\'s okay','Treat it like a real phone screen']
              : ['Think out loud — interviewers want to hear your process','Start with brute force, then optimize','Always discuss time & space complexity','Ask clarifying questions before coding']
              ? ['Think out loud — the AI is listening','Be specific with examples','It\'s okay to say "I\'m not sure" honestly','Ask clarifying questions freely']
              : interviewType==='autonomous'
            ).map(tip => (
              <div key={tip} style={{ color:'#888', fontSize:11, display:'flex', gap:6 }}>
                <span style={{ color:activeColor, flexShrink:0 }}>•</span>{tip}
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
            const companyToSend = ['technical-screening','ai-fluency','frontend','personalized','voice', 'autonomous'].includes(interviewType)
              ? interviewType : selected;
            await onStart(companyToSend, topics, interviewType, jdText, realWorld, aiAssistEnabled);
            setStarting(false);
          }}
          disabled={starting || (interviewType==='personalized' && jdText.length < 50)}
          style={{ width:'100%', background:starting?'#1e2a3a':`linear-gradient(135deg, ${activeColor}, ${activeColor}88)`, border:'none', borderRadius:14, color:starting?'#444':'#fff', cursor:(starting||(interviewType==='personalized'&&jdText.length<50))?'not-allowed':'pointer', fontSize:16, fontWeight:900, padding:'16px 0', boxShadow:starting?'none':`0 0 30px ${activeColor}44` }}
        >
          {starting ? '⏳ Setting up interview...'
            : interviewType==='system-design'      ? '🏗️ Start System Design Interview'
            : interviewType==='behavioral'          ? '🎙️ Start Behavioral Interview'
            : interviewType==='technical-screening' ? '📋 Start Technical Screening'
            : interviewType==='frontend'            ? '🖥️ Start Frontend Interview'
            : interviewType==='ai-fluency'          ? '🤖 Start AI Fluency Interview'
            : interviewType==='personalized'        ? (jdText.length<50 ? '📄 Paste a Job Description first' : '📄 Start Personalized Interview')
            : interviewType==='voice'               ? '🎤 Start Voice Interview'
            : interviewType==='autonomous'          ? '🧠 Start Autonomous Interview'
            : `🚀 Start ${config.company} Coding Interview`}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Interview Result Screen ───────────────────────────────────────────────────
function InterviewResult({ result, company, onRedo, onHome }) {
  const config     = CONFIGS[company] || CONFIGS.general;
  const [followUpOpen,    setFollowUpOpen]    = useState(false);
  const [followUpMsgs,    setFollowUpMsgs]    = useState([]);
  const [followUpInput,   setFollowUpInput]   = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const followUpEndRef = useRef(null);

  const sendFollowUp = async () => {
    if (!followUpInput.trim() || followUpLoading || !result.sessionId) return;
    const msg = followUpInput.trim();
    setFollowUpMsgs(prev => [...prev, { role:'user', text:msg }]);
    setFollowUpInput('');
    setFollowUpLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${result.sessionId}/followup`, {
        userId: result.userId, message: msg, conversation: followUpMsgs,
      });
      if (res.data.reply) setFollowUpMsgs(prev => [...prev, { role:'coach', text:res.data.reply }]);
    } catch (e) { console.error('Follow-up error:', e); }
    finally { setFollowUpLoading(false); }
  };

  useEffect(() => { followUpEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [followUpMsgs]);

  const grade      = result.pct >= 80 ? 'A' : result.pct >= 60 ? 'B' : result.pct >= 40 ? 'C' : 'D';
  const gradeColor = result.pct >= 80 ? '#00c896' : result.pct >= 60 ? '#f5c542' : result.pct >= 40 ? '#1a73e8' : '#ff4d4d';
  const breakdown  = result.problemBreakdown || [];
  const diffColors = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };
  const statusIcon  = { solved:'✓', attempted:'✗', skipped:'⊘' };
  const statusColor = { solved:'#00c896', attempted:'#ff4d4d', skipped:'#555' };
  const typeColors  = { 'technical-screening':'#10b981', frontend:'#f472b6', 'ai-fluency':'#a78bfa', personalized:'#f59e0b', voice:'#ec4899', 'system-design':'#1a73e8', behavioral:'#f59e0b' };
  const displayColor = typeColors[result.interviewType] || config.color;

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', fontFamily:'Arial, sans-serif', overflowY:'auto' }}>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
        style={{ background:'#0d1117', border:`1px solid ${displayColor}44`, borderRadius:20, padding:'40px', maxWidth:700, width:'100%', boxShadow:`0 0 40px ${displayColor}22` }}
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
            <div style={{ color:displayColor, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 Problem Breakdown</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {breakdown.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1*i }}
                  style={{ background:p.status==='solved'?'#00c89608':p.status==='attempted'?'#ff4d4d08':'#0d1117', border:`1px solid ${statusColor[p.status]}33`, borderRadius:12, padding:'14px 16px' }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:statusColor[p.status], fontSize:16, fontWeight:900 }}>{statusIcon[p.status]}</span>
                      <span style={{ color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{p.title}</span>
                      <span style={{ background:(diffColors[p.difficulty]||'#888')+'22', border:`1px solid ${(diffColors[p.difficulty]||'#888')}44`, color:diffColors[p.difficulty]||'#888', borderRadius:12, padding:'1px 8px', fontSize:10, fontWeight:700 }}>{p.difficulty}</span>
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
        {/* AI Hiring Report */}
        {result.hiringReport && (
          <>
            <HiringReportPanel
              report={result.hiringReport}
              company={company}
              interviewType={result.interviewType}
              sessionId={result.sessionId}
            />
            <div style={{ marginBottom:24 }}>
              <button
                onClick={() => downloadHiringReportPDF({ report:result.hiringReport, company, interviewType:result.interviewType, result })}
                style={{ width:'100%', background:'linear-gradient(135deg, #4285f4, #4285f488)', border:'none', borderRadius:12, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'12px 0', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}
              >
                <span>📄</span> Download Hiring Report PDF
              </button>
            </div>
          </>
        )}
        {/* AI Usage Report */}
        {result.aiUsageLog && result.aiUsageLog.length > 0 && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'14px 16px', marginBottom:24 }}>
            <div style={{ color:'#1a73e8', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>✨ AI Usage Report</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
              {[
                { label:'Total Requests', value:result.aiUsageLog.length,                                       color:'#1a73e8' },
                { label:'Accepted',       value:result.aiUsageLog.filter(l => l.accepted).length,               color:'#00c896' },
                { label:'Chat Questions', value:result.aiUsageLog.filter(l => l.type === 'chat').length,         color:'#a855f7' },
              ].map(s => (
                <div key={s.label} style={{ background:'#060910', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ color:s.color, fontSize:16, fontWeight:900 }}>{s.value}</div>
                  <div style={{ color:'#444', fontSize:9, marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {result.aiUsageLog.slice(0, 5).map((entry, i) => (
                <div key={i} style={{ background:'#060910', borderRadius:8, padding:'8px 10px', display:'flex', alignItems:'flex-start', gap:8 }}>
                  <span style={{ fontSize:12, flexShrink:0 }}>{entry.type==='completion'?'⚡':'💬'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color:'#666', fontSize:10, marginBottom:2 }}>{entry.type==='completion'?'Completion request':entry.prompt}</div>
                    <div style={{ color:'#444', fontSize:9 }}>{new Date(entry.timestamp).toLocaleTimeString()} {entry.accepted && <span style={{ color:'#00c896' }}>• Used</span>}</div>
                  </div>
                </div>
              ))}
              {result.aiUsageLog.length > 5 && <div style={{ color:'#444', fontSize:10, textAlign:'center' }}>+{result.aiUsageLog.length - 5} more interactions</div>}
            </div>
          </div>
        )}

        {/* AI Integrity Report */}
        <IntegrityReport sessionId={result.sessionId} displayColor={displayColor} />

        {/* Follow-up Chat */}
        <div style={{ marginBottom:24 }}>
          <button onClick={() => setFollowUpOpen(o => !o)}
            style={{ width:'100%', background:followUpOpen?`${displayColor}11`:'#060910', border:`1px solid ${followUpOpen?displayColor+'44':'#1e2a3a'}`, borderRadius:12, padding:'12px 16px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'all 0.2s' }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ color:followUpOpen?displayColor:'#e8e8e8', fontSize:13, fontWeight:700 }}>Follow-up Chat</div>
                <div style={{ color:'#555', fontSize:10, marginTop:1 }}>Ask the AI coach about your feedback or weak areas</div>
              </div>
            </div>
            <span style={{ color:'#555', fontSize:12 }}>{followUpOpen ? '▲' : '▼'}</span>
          </button>
          {followUpOpen && (
            <div style={{ border:`1px solid ${displayColor}33`, borderTop:'none', borderRadius:'0 0 12px 12px', background:'#060910', overflow:'hidden' }}>
              <div style={{ maxHeight:320, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {followUpMsgs.length === 0 && (
                  <div style={{ color:'#333', fontSize:12, textAlign:'center', padding:16 }}>
                    Ask anything about your performance — "Why did I fail test cases?", "What should I study?", "Walk me through the optimal solution"
                  </div>
                )}
                {followUpMsgs.map((m, i) => (
                  <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'85%', background:m.role==='user'?`${displayColor}18`:'#1e2a3a', border:`1px solid ${m.role==='user'?displayColor+'33':'#2a3645'}`, borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px', padding:'8px 12px', color:m.role==='user'?'#e8e8e8':'#c8c8c8', fontSize:12, lineHeight:1.6 }}>
                    {m.role==='coach' && <div style={{ color:displayColor, fontSize:9, fontWeight:700, marginBottom:3, textTransform:'uppercase' }}>🎓 AI Coach</div>}
                    {m.text}
                  </div>
                ))}
                {followUpLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🎓 Coach is thinking...</div>}
                <div ref={followUpEndRef} />
              </div>
              <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a3a', display:'flex', gap:6 }}>
                <input value={followUpInput} onChange={e => setFollowUpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendFollowUp(); }}
                  placeholder="Ask about your feedback, weak areas, or solutions..."
                  style={{ flex:1, background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 12px', color:'#e8e8e8', fontSize:12, outline:'none' }}
                />
                <button onClick={sendFollowUp} disabled={followUpLoading || !followUpInput.trim() || !result.sessionId}
                  style={{ background:displayColor, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', opacity:followUpLoading||!followUpInput.trim()?0.4:1 }}>Ask</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRedo} style={{ flex:1, background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:10, color:'#888', cursor:'pointer', fontSize:13, fontWeight:600, padding:'10px 0' }}>Try Again</button>
          <button onClick={onHome} style={{ flex:1, background:`linear-gradient(135deg, ${displayColor}, ${displayColor}88)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 0' }}>Back to World →</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main MockInterview ────────────────────────────────────────────────────────
export default function MockInterview({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,      setPhase]      = useState('select');
  const [session,    setSession]    = useState(null);
  const [company,    setCompany]    = useState('general');
  const [probIdx,    setProbIdx]    = useState(0);
  const [remaining,  setRemaining]  = useState(0);
  const [solved,     setSolved]     = useState([]);
  const [result,     setResult]     = useState(null);
  const [startError, setStartError] = useState(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteCount,  setPasteCount]  = useState(0);
  const timerRef = useRef(null);

  const [chatOpen,    setChatOpen]    = useState(false);
  const [chatMsgs,    setChatMsgs]    = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // ── Integrity monitoring ────────────────────────────────────────────────────
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const streamRef     = useRef(null);
  const keystrokesRef = useRef([]);
  const lastKeyRef    = useRef(null);
  const burstCountRef = useRef(0);
  const idleBurstRef  = useRef(0);
  const [webcamOn,    setWebcamOn]    = useState(false);
  const [observeOpen, setObserveOpen] = useState(false);

  const sendIntegrityEvent = useCallback(async (type, data) => {
    if (!session?.sessionId) return;
    try {
      await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/integrity-event`, { type, data });
    } catch (e) { /* non-blocking */ }
  }, [session?.sessionId]);

  // Start webcam
  useEffect(() => {
    if (phase !== 'active') return;
    let stopped = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width:160, height:120 }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        if (!stopped) setWebcamOn(true);
      } catch (e) { console.warn('Webcam unavailable:', e.message); }
    })();
    return () => {
      stopped = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      setWebcamOn(false);
    };
  }, [phase]);

  // Webcam snapshot every 30s
  useEffect(() => {
    if (phase !== 'active' || !webcamOn) return;
    const capture = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 160, 120);
      const img = canvasRef.current.toDataURL('image/jpeg', 0.4);
      const imgData = ctx.getImageData(40, 20, 80, 80);
      let skinPixels = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        const r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && r - b > 15) skinPixels++;
      }
      const faceDetected = skinPixels > 200;
      await sendIntegrityEvent('webcam_snapshot', { img, faceDetected });
    };
    capture();
    const timer = setInterval(capture, 30000);
    return () => clearInterval(timer);
  }, [phase, webcamOn, sendIntegrityEvent]);

  // Keystroke timing
  useEffect(() => {
    if (phase !== 'active') return;
    const onKey = () => {
      const now = Date.now();
      if (lastKeyRef.current) {
        const interval = now - lastKeyRef.current;
        keystrokesRef.current.push(interval);
        if (keystrokesRef.current.length > 100) keystrokesRef.current.shift();
        const recent = keystrokesRef.current.slice(-8);
        if (recent.length === 8 && recent.every(i => i < 80)) {
          burstCountRef.current += 1;
          const idleBeforeBurst = keystrokesRef.current.slice(-10, -8);
          if (idleBeforeBurst.some(i => i > 2000)) idleBurstRef.current += 1;
          sendIntegrityEvent('burst_event', { burstCount: burstCountRef.current });
        }
      }
      lastKeyRef.current = now;
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, sendIntegrityEvent]);

  // Keystroke summary every 60s
  useEffect(() => {
    if (phase !== 'active') return;
    const timer = setInterval(() => {
      const intervals = keystrokesRef.current;
      if (!intervals.length) return;
      const avg = Math.round(intervals.reduce((a,b)=>a+b,0) / intervals.length);
      sendIntegrityEvent('keystroke_stats', { avgInterval:avg, burstCount:burstCountRef.current, idleBursts:idleBurstRef.current, sampleSize:intervals.length });
    }, 60000);
    return () => clearInterval(timer);
  }, [phase, sendIntegrityEvent]);

  // Screen blur tracking
  useEffect(() => {
    if (phase !== 'active') return;
    let blurTs = null;
    const onBlur  = () => { blurTs = Date.now(); };
    const onFocus = () => {
      if (blurTs) {
        const duration = Math.round((Date.now() - blurTs) / 1000);
        if (duration > 2) sendIntegrityEvent('screen_blur', { duration });
        blurTs = null;
      }
    };
    window.addEventListener('blur',  onBlur);
    window.addEventListener('focus', onFocus);
    return () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
  }, [phase, sendIntegrityEvent]);

  // ── AI IDE state ────────────────────────────────────────────────────────────
  const [aiPanelOpen,   setAiPanelOpen]   = useState(false);
  const [aiPanelTab,    setAiPanelTab]    = useState('chat');
  const [aiChatMsgs,    setAiChatMsgs]    = useState([]);
  const [aiChatInput,   setAiChatInput]   = useState('');
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiCompletion,  setAiCompletion]  = useState('');
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const aiPanelEndRef = useRef(null);

  useEffect(() => { aiPanelEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [aiChatMsgs]);

  const requestAiAssist = async (type, question = '') => {
    if (!session?.sessionId || aiLoading) return;
    setAiLoading(true);
    const problem = session.problems?.[probIdx];
    const ts = new Date().toISOString();
    setLastTimestamp(ts);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-assist`, {
        userId: user.uid, type, code: '', language: 'python3', question,
        problemTitle: problem?.title || '', problemDescription: problem?.description || '',
      });
      if (type === 'chat') setAiChatMsgs(prev => [...prev, { role:'assistant', text:res.data.result }]);
      else setAiCompletion(res.data.result);
    } catch (e) { console.error('AI assist error:', e); }
    finally { setAiLoading(false); }
  };

  const acceptCompletion = async () => {
    if (!lastTimestamp || !session?.sessionId) return;
    try { await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-assist/accept`, { timestamp: lastTimestamp }); }
    catch (e) { /* non-blocking */ }
    setAiCompletion('');
  };

  // ── AI Interviewer ──────────────────────────────────────────────────────────
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
      if (res.data.question) setChatMsgs([...conversation, { role:'interviewer', text:res.data.question }]);
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
        if (res.data.question) { setChatMsgs([{ role:'interviewer', text:res.data.question }]); setChatOpen(true); }
      } catch (e) {
        console.error('AI auto-question failed:', e);
        setChatMsgs([{ role:'interviewer', text:'⚠ Interviewer unavailable — check GROQ_API_KEY on Render.' }]);
      } finally { setChatLoading(false); }
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, probIdx, session?.sessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chatMsgs]);

  // Tab switch + paste tracking
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

  const startInterview = async (selectedCompany, selectedTopics = [], selectedType = 'coding', jdText = '', realWorld = false, aiAssistEnabled = false) => {
    setCompany(selectedCompany);
    setStartError(null);
    try {
      const res = await axios.post(`${API_BASE}/mock-interview/start`, {
        userId: user.uid, company: selectedCompany, topics: selectedTopics,
        interviewType: selectedType, jdText, realWorld, aiAssistEnabled,
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
      setResult({ ...res.data, totalProbs: session.problems?.length || 2, interviewType: session.interviewType, sessionId: session.sessionId, userId: user.uid, aiUsageLog: res.data.aiUsageLog || [], hiringReport: res.data.hiringReport || null });
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
        const next = session.problems.findIndex((p, i) => i > probIdx && !solved.includes(p.id));
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

  const problems        = session?.problems || [];
  const currentProblem  = problems[probIdx];
  const sessionDuration = session?.config?.duration || session?.duration || 60;
  const pctDone         = (remaining / (sessionDuration * 60)) * 100;
  const timeColor       = remaining < 300 ? '#ff4d4d' : remaining < 900 ? '#f5c542' : '#00c896';
  const iType           = session?.interviewType || 'coding';
  const typeColors = { 'technical-screening':'#10b981', frontend:'#f472b6', 'ai-fluency':'#a78bfa', personalized:'#f59e0b', voice:'#ec4899', 'system-design':'#1a73e8', behavioral:'#f59e0b', autonomous:'#00c896' };
  const headerColor     = typeColors[iType] || config.color;

  const sendChatMsg = () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatMsgs(p => [...p, { role:'candidate', text:msg }]);
    setChatInput('');
    askInterviewer(msg);
  };

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0a0a14', fontFamily:'Arial, sans-serif', overflow:'hidden' }}>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.7} }`}</style>
      <video ref={videoRef} style={{ display:'none' }} muted playsInline />
      <canvas ref={canvasRef} width={160} height={120} style={{ display:'none' }} />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0, gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>{config.logo}</span>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ color:headerColor, fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{config.company} Mock Interview</div>
              {session?.realWorld && <span style={{ background:'#f59e0b22', border:'1px solid #f59e0b44', borderRadius:6, padding:'1px 6px', color:'#f59e0b', fontSize:9, fontWeight:700 }}>🌍 REAL-WORLD</span>}
              {session?.aiAssistEnabled && <span style={{ background:'#1a73e822', border:'1px solid #1a73e844', borderRadius:6, padding:'1px 6px', color:'#1a73e8', fontSize:9, fontWeight:700 }}>✨ AI IDE</span>}
            </div>
            <div style={{ display:'flex', gap:5, marginTop:3 }}>
              {problems.map((p, i) => {
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
            style={{ background:`linear-gradient(135deg, ${headerColor}, ${headerColor}88)`, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 16px' }}
          >End Interview →</motion.button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'hidden' }}>
        {(iType === 'coding' || !iType) && currentProblem && (
          <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage="python3" hideHints />
        )}
        {iType === 'frontend' && currentProblem && (
          <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage="javascript" hideHints />
        )}
        {iType === 'system-design' && currentProblem && (
          <div style={{ display:'flex', height:'100%' }}>
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
                <textarea placeholder="Write your system design here..." style={{ flex:1, width:'100%', boxSizing:'border-box', background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px', color:'#e8e8e8', fontSize:13, lineHeight:1.7, outline:'none', resize:'none' }} />
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
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Discuss your design..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 12px', color:'#e8e8e8', fontSize:12, outline:'none' }} />
                <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()} style={{ background:'#1a73e8', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
              </div>
            </div>
          </div>
        )}
        {iType === 'behavioral' && currentProblem && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'16px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ background:'#f59e0b22', border:'1px solid #f59e0b44', borderRadius:12, padding:'2px 10px', color:'#f59e0b', fontSize:10, fontWeight:700 }}>{currentProblem.category || 'Behavioral'}</span>
              </div>
              <p style={{ margin:0, color:'#e8e8e8', fontSize:14, lineHeight:1.6 }}>{currentProblem.title}</p>
              {currentProblem.starGuide && <p style={{ margin:'8px 0 0', color:'#666', fontSize:11 }}>💡 <em>{currentProblem.starGuide}</em></p>}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'75%', background:m.role==='candidate'?'#f59e0b11':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#f59e0b44':'#2a3645'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#fde68a':'#c8c8c8', fontSize:13, lineHeight:1.7 }}>{m.text}</div>
              ))}
              {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>🤖 Thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'12px 24px', borderTop:'1px solid #1e2a3a', display:'flex', gap:8, flexShrink:0, background:'#0d1117' }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Share your experience using the STAR method..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }} />
              <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()} style={{ background:'#f59e0b', border:'none', borderRadius:10, color:'#000', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 18px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
            </div>
          </div>
        )}
        {iType === 'technical-screening' && (
          <div style={{ display:'flex', height:'100%' }}>
            <div style={{ width:240, borderRight:'1px solid #1e2a3a', padding:'20px 16px', overflowY:'auto', flexShrink:0, background:'#0d1117' }}>
              <div style={{ color:'#10b981', fontSize:13, fontWeight:900, marginBottom:6 }}>📋 Screening Round</div>
              <div style={{ color:'#555', fontSize:11, lineHeight:1.7, marginBottom:16 }}>Recruiter-style conversation assessing your background, CS knowledge, and role fit.</div>
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
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Type your answer..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }} />
                <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()} style={{ background:'#10b981', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
              </div>
            </div>
          </div>
        )}
        {iType === 'ai-fluency' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:'#a78bfa22', border:'1px solid #a78bfa44', borderRadius:12, padding:'2px 10px', color:'#a78bfa', fontSize:10, fontWeight:700 }}>AI FLUENCY ROUND</span>
                <span style={{ color:'#555', fontSize:11 }}>Discuss your real experience with AI tools.</span>
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
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Share how you use AI in your workflow..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }} />
              <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()} style={{ background:'#a78bfa', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
            </div>
          </div>
        )}
        {/* Autonomous AI Interviewer */}
        {iType === 'autonomous' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:'#00c89622', border:'1px solid #00c89644', borderRadius:12, padding:'2px 10px', color:'#00c896', fontSize:10, fontWeight:700 }}>🧠 AUTONOMOUS AI INTERVIEWER</span>
                  <span style={{ color:'#555', fontSize:11 }}>Adaptive • Evidence-based • Real-time probing</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#444', fontSize:10 }}>Turn {Math.ceil(chatMsgs.length / 2) + 1}</span>
                  <div style={{ width:60, height:4, background:'#1e2a3a', borderRadius:2, overflow:'hidden' }}>
                    <div style={{ width:`${Math.min(100, (chatMsgs.length/22)*100)}%`, height:'100%', background:'#00c896', borderRadius:2, transition:'width 0.5s' }} />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 28px', display:'flex', flexDirection:'column', gap:12 }}>
              {chatMsgs.length===0 && !chatLoading && (
                <div style={{ textAlign:'center', padding:60 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🧠</div>
                  <div style={{ color:'#444', fontSize:14, fontWeight:700, marginBottom:6 }}>Your AI Interviewer is ready</div>
                  <div style={{ color:'#333', fontSize:12 }}>The interview will begin when you press Send or type your first message.</div>
                </div>
              )}
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'78%' }}>
                  {m.role === 'interviewer' && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:14 }}>🧠</span>
                      <span style={{ color:'#00c896', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>AI Interviewer</span>
                    </div>
                  )}
                  <div style={{ background:m.role==='candidate'?'#00c89611':'#0d1117', border:`1px solid ${m.role==='candidate'?'#00c89644':'#1e2a3a'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'12px 16px', color:m.role==='candidate'?'#a7f3d0':'#d8d8d8', fontSize:13, lineHeight:1.75 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0' }}>
                  <span style={{ fontSize:16 }}>🧠</span>
                  <div style={{ display:'flex', gap:4 }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#00c896', display:'inline-block', animation:`pulse 1.2s ${i*0.2}s infinite` }} />
                    ))}
                  </div>
                  <span style={{ color:'#444', fontSize:11, fontStyle:'italic' }}>Analyzing your response...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'14px 24px', borderTop:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', gap:8 }}>
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); } }}
                  placeholder="Type your answer... (Shift+Enter for new line)"
                  rows={2}
                  style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none', resize:'none', fontFamily:'Arial, sans-serif', lineHeight:1.5 }}
                />
                <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()}
                  style={{ background:chatLoading||!chatInput.trim()?'#1e2a3a':'linear-gradient(135deg, #00c896, #00c89688)', border:'none', borderRadius:10, color:chatLoading||!chatInput.trim()?'#444':'#fff', cursor:chatLoading||!chatInput.trim()?'not-allowed':'pointer', fontSize:13, fontWeight:700, padding:'0 20px', opacity:1, minWidth:80 }}>
                  {chatLoading ? '...' : 'Send →'}
                </button>
              </div>
              <div style={{ color:'#333', fontSize:10, marginTop:6 }}>
                The AI interviewer adapts every question to your answers. {chatMsgs.length > 0 ? `${Math.ceil(chatMsgs.length/2)} exchanges so far.` : 'Start whenever you\'re ready.'}
              </div>
            </div>
          </div>
        )}
        {iType === 'personalized' && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
            <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:'#f59e0b22', border:'1px solid #f59e0b44', borderRadius:12, padding:'2px 10px', color:'#f59e0b', fontSize:10, fontWeight:700 }}>PERSONALIZED INTERVIEW</span>
                <span style={{ color:'#555', fontSize:11 }}>Questions generated from your job description.</span>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
              {chatMsgs.length===0 && !chatLoading && <div style={{ color:'#333', fontSize:13, textAlign:'center', padding:40 }}>📄 Generating your personalized questions...</div>}
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ alignSelf:m.role==='candidate'?'flex-end':'flex-start', maxWidth:'75%', background:m.role==='candidate'?'#f59e0b11':'#1e2a3a', border:`1px solid ${m.role==='candidate'?'#f59e0b44':'#2a3645'}`, borderRadius:m.role==='candidate'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', color:m.role==='candidate'?'#fde68a':'#c8c8c8', fontSize:13, lineHeight:1.7 }}>
                  {m.role==='interviewer' && <div style={{ color:'#f59e0b', fontSize:10, fontWeight:700, marginBottom:4 }}>📄 INTERVIEWER</div>}
                  {m.text}
                </div>
              ))}
              {chatLoading && <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>📄 Interviewer is thinking...</div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding:'12px 24px', borderTop:'1px solid #1e2a3a', display:'flex', gap:8, background:'#0d1117', flexShrink:0 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Type your answer..." style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', color:'#e8e8e8', fontSize:13, outline:'none' }} />
              <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()} style={{ background:'#f59e0b', border:'none', borderRadius:10, color:'#000', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
            </div>
          </div>
        )}
        {iType === 'voice' && (
          <VoiceInterview chatMsgs={chatMsgs} chatLoading={chatLoading} chatEndRef={chatEndRef} askInterviewer={askInterviewer} setChatMsgs={setChatMsgs} />
        )}
      </div>

      {/* Webcam indicator */}
      {webcamOn && (
        <div style={{ position:'fixed', top:60, left:16, zIndex:8000, display:'flex', alignItems:'center', gap:6, background:'#0d111788', border:'1px solid #00c89633', borderRadius:20, padding:'4px 10px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00c896', display:'inline-block', animation:'pulse 1.5s infinite' }} />
          <span style={{ color:'#00c896', fontSize:9, fontWeight:700 }}>WEBCAM MONITORING</span>
        </div>
      )}

      {/* Floating chat — coding + frontend only */}
      {(iType === 'coding' || !iType || iType === 'frontend') && (
        <>
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
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
              <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:0.95 }}
                style={{ position:'fixed', bottom:86, right:24, zIndex:9000, width:360, maxHeight:'55vh', background:'#0d1117', border:`1px solid ${config.color}44`, borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 8px 40px #00000088' }}
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
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChatMsg();}} placeholder="Reply to the interviewer..."
                    style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 12px', color:'#e8e8e8', fontSize:12, outline:'none' }}
                  />
                  <button onClick={sendChatMsg} disabled={chatLoading||!chatInput.trim()}
                    style={{ background:config.color, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', opacity:chatLoading||!chatInput.trim()?0.4:1 }}>Send</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* AI IDE Panel */}
      {session?.aiAssistEnabled && (
        <>
          <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
            onClick={() => setAiPanelOpen(o => !o)}
            style={{ position:'fixed', bottom:24, right:(iType==='coding'||!iType||iType==='frontend')?86:24, zIndex:9000, width:52, height:52, borderRadius:'50%', background:aiPanelOpen?'#1a73e8':'linear-gradient(135deg, #1a73e8, #1a73e888)', border:'none', cursor:'pointer', fontSize:20, boxShadow:'0 4px 20px #1a73e844', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}
          >
            {aiPanelOpen ? '✕' : '✨'}
            {!aiPanelOpen && (aiChatMsgs.length > 0 || aiCompletion) && (
              <span style={{ position:'absolute', top:-2, right:-2, width:14, height:14, borderRadius:'50%', background:'#1a73e8', border:'2px solid #0a0a14', animation:'pulse 1.5s infinite' }} />
            )}
          </motion.button>
          <AnimatePresence>
            {aiPanelOpen && (
              <motion.div initial={{ opacity:0, y:20, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:20, scale:0.95 }}
                style={{ position:'fixed', bottom:86, right:(iType==='coding'||!iType||iType==='frontend')?86:24, zIndex:9000, width:380, maxHeight:'60vh', background:'#0d1117', border:'1px solid #1a73e844', borderRadius:16, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 8px 40px #00000088' }}
              >
                <div style={{ padding:'10px 14px', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:16 }}>✨</span>
                    <div>
                      <div style={{ color:'#1a73e8', fontSize:12, fontWeight:900 }}>AI Assistant</div>
                      <div style={{ color:'#444', fontSize:9 }}>All usage tracked • Never gives full solutions</div>
                    </div>
                  </div>
                  <span style={{ background:'#ff4d4d22', border:'1px solid #ff4d4d33', borderRadius:6, padding:'1px 6px', color:'#ff4d4d', fontSize:9, fontWeight:700 }}>LOGGED</span>
                </div>
                <div style={{ display:'flex', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
                  {[{ id:'chat', label:'💬 Chat' }, { id:'complete', label:'⚡ Complete' }].map(tab => (
                    <button key={tab.id} onClick={() => setAiPanelTab(tab.id)}
                      style={{ flex:1, padding:'8px 0', background:aiPanelTab===tab.id?'#1a73e811':'transparent', border:'none', borderBottom:aiPanelTab===tab.id?'2px solid #1a73e8':'2px solid transparent', color:aiPanelTab===tab.id?'#1a73e8':'#555', cursor:'pointer', fontSize:11, fontWeight:700, transition:'all 0.15s' }}
                    >{tab.label}</button>
                  ))}
                </div>
                {aiPanelTab === 'chat' && (
                  <>
                    <div style={{ flex:1, overflowY:'auto', padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                      {aiChatMsgs.length === 0 && <div style={{ color:'#333', fontSize:11, textAlign:'center', padding:16 }}>Ask about concepts, errors, or approach.<br/><span style={{ color:'#2a3645', fontSize:10 }}>Won't give the full solution.</span></div>}
                      {aiChatMsgs.map((m,i) => (
                        <div key={i} style={{ alignSelf:m.role==='user'?'flex-end':'flex-start', maxWidth:'88%', background:m.role==='user'?'#1a73e822':'#1e2a3a', border:`1px solid ${m.role==='user'?'#1a73e844':'#2a3645'}`, borderRadius:m.role==='user'?'12px 12px 4px 12px':'12px 12px 12px 4px', padding:'7px 10px', color:m.role==='user'?'#88bbff':'#c8c8c8', fontSize:11, lineHeight:1.6 }}>
                          {m.role==='assistant' && <div style={{ color:'#1a73e8', fontSize:9, fontWeight:700, marginBottom:3 }}>✨ AI ASSISTANT</div>}
                          {m.text}
                        </div>
                      ))}
                      {aiLoading && aiPanelTab==='chat' && <div style={{ color:'#555', fontSize:11, fontStyle:'italic' }}>✨ Thinking...</div>}
                      <div ref={aiPanelEndRef} />
                    </div>
                    <div style={{ padding:'8px 10px', borderTop:'1px solid #1e2a3a', display:'flex', gap:5, flexShrink:0 }}>
                      <input value={aiChatInput} onChange={e=>setAiChatInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Enter'&&aiChatInput.trim()&&!aiLoading){const msg=aiChatInput.trim();setAiChatMsgs(p=>[...p,{role:'user',text:msg}]);setAiChatInput('');requestAiAssist('chat',msg);}}}
                        placeholder="Ask about concepts, errors, approach..."
                        style={{ flex:1, background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'7px 10px', color:'#e8e8e8', fontSize:11, outline:'none' }}
                      />
                      <button onClick={()=>{if(aiChatInput.trim()&&!aiLoading){const msg=aiChatInput.trim();setAiChatMsgs(p=>[...p,{role:'user',text:msg}]);setAiChatInput('');requestAiAssist('chat',msg);}}}
                        disabled={aiLoading||!aiChatInput.trim()}
                        style={{ background:'#1a73e8', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, padding:'7px 12px', opacity:aiLoading||!aiChatInput.trim()?0.4:1 }}>Ask</button>
                    </div>
                  </>
                )}
                {aiPanelTab === 'complete' && (
                  <div style={{ flex:1, display:'flex', flexDirection:'column', padding:14, gap:10, overflowY:'auto' }}>
                    <div style={{ color:'#666', fontSize:11, lineHeight:1.6 }}>AI will suggest the next logical lines based on your current code.</div>
                    {aiCompletion ? (
                      <div style={{ flex:1 }}>
                        <div style={{ color:'#1a73e8', fontSize:10, fontWeight:700, marginBottom:6, textTransform:'uppercase' }}>✨ Suggestion</div>
                        <pre style={{ background:'#060910', border:'1px solid #1a73e833', borderRadius:8, padding:'10px 12px', color:'#88ffbb', fontSize:11, fontFamily:'"Fira Code", monospace', lineHeight:1.6, margin:0, overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{aiCompletion}</pre>
                        <div style={{ display:'flex', gap:6, marginTop:8 }}>
                          <button onClick={acceptCompletion} style={{ flex:1, background:'#00c89622', border:'1px solid #00c89644', borderRadius:8, color:'#00c896', cursor:'pointer', fontSize:11, fontWeight:700, padding:'7px 0' }}>✓ Used it</button>
                          <button onClick={()=>setAiCompletion('')} style={{ flex:1, background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:8, color:'#555', cursor:'pointer', fontSize:11, padding:'7px 0' }}>✕ Dismiss</button>
                        </div>
                      </div>
                    ) : (
                      <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                        onClick={() => requestAiAssist('completion')} disabled={aiLoading}
                        style={{ background:aiLoading?'#1e2a3a':'linear-gradient(135deg, #1a73e8, #1a73e888)', border:'none', borderRadius:10, color:aiLoading?'#444':'#fff', cursor:aiLoading?'not-allowed':'pointer', fontSize:13, fontWeight:700, padding:'14px 0', boxShadow:aiLoading?'none':'0 0 20px #1a73e844' }}
                      >
                        {aiLoading ? '⏳ Generating...' : '⚡ Get Completion'}
                      </motion.button>
                    )}
                    <div style={{ color:'#2a3645', fontSize:9, textAlign:'center' }}>This request will be logged in your interview report</div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Live Observer Panel */}
      <motion.button whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
        onClick={() => setObserveOpen(o => !o)}
        title="Observation Mode"
        style={{ position:'fixed', bottom:24, left:24, zIndex:9000, width:52, height:52, borderRadius:'50%', background:observeOpen?'#ff4d4d':'linear-gradient(135deg, #ff4d4d, #ff4d4d88)', border:'none', cursor:'pointer', fontSize:20, boxShadow:'0 4px 20px #ff4d4d44', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}
      >
        {observeOpen ? '✕' : '🔍'}
      </motion.button>
      <AnimatePresence>
        {observeOpen && session?.sessionId && (
          <motion.div initial={{ opacity:0, x:-20, scale:0.95 }} animate={{ opacity:1, x:0, scale:1 }} exit={{ opacity:0, x:-20, scale:0.95 }}
            style={{ position:'fixed', bottom:86, left:24, zIndex:9000, maxHeight:'80vh', overflowY:'auto' }}
          >
            <LiveObserverPanel sessionId={session.sessionId} config={session.config} onClose={() => setObserveOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
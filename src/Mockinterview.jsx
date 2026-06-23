import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';
import { LiveObserverPanel, IntegrityReport } from './InterviewObserver';
import { HiringReportPanel, downloadHiringReportPDF } from './HiringReport';
import AINativeIDE from './AINativeIDE';
import InterviewReplay from './InterviewReplay';
const CONFIGS = {
  google:    { company:'Google',    logo:'🔍', color:'#4285f4', duration:45, desc:'Optimal solutions + complexity analysis' },
  amazon:    { company:'Amazon',    logo:'📦', color:'#ff9900', duration:40, desc:'Clean code + edge cases + LP principles'  },
  meta:      { company:'Meta',      logo:'🌐', color:'#0081fb', duration:35, desc:'Speed + graphs + DP problems'             },
  microsoft: { company:'Microsoft', logo:'🪟', color:'#00a4ef', duration:45, desc:'Collaborative + communication focused'    },
  apple:     { company:'Apple',     logo:'🍎', color:'#a2aaad', duration:45, desc:'Elegant production-quality code'          },
  general:   { company:'General',   logo:'💻', color:'#a855f7', duration:60, desc:'Mixed difficulty fundamentals'            },
};
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
const TOPICS = [
  'Array',
  'String',
  'Linked List',
  'Tree',
  'Graph',
  'DP',
  'Hash Table',
  'Stack',
  'Heap',
  'Binary Search',
  'Sorting',
  'Sliding Window',
  'Matrix',
  'DFS',
  'BFS',
];
// ── Voice Interview Component ─────────────────────────────────────────────────
function VoiceInterview({ chatMsgs, chatLoading, chatEndRef, askInterviewer, setChatMsgs }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const last = chatMsgs[chatMsgs.length - 1];
    if (!last || last.role !== 'interviewer') return;

    const utt = new window.SpeechSynthesisUtterance(last.text);
    utt.rate = 0.95;
    utt.pitch = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }, [chatMsgs]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    window.speechSynthesis.cancel();

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let currentTranscript = '';

    recognition.onresult = (e) => {
      currentTranscript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
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

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0a0a14' }}>
      <div style={{ padding:'14px 24px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ background:'#ec489922', border:'1px solid #ec489944', borderRadius:12, padding:'2px 10px', color:'#ec4899', fontSize:10, fontWeight:700 }}>
            🎤 VOICE INTERVIEW
          </span>
          <span style={{ color:'#555', fontSize:11 }}>
            Speak your answers — AI listens and responds aloud.
          </span>
          {!supported && (
            <span style={{ color:'#ff4d4d', fontSize:11 }}>
              ⚠ Not supported. Use Chrome.
            </span>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
        {chatMsgs.length === 0 && !chatLoading && (
          <div style={{ color:'#333', fontSize:13, textAlign:'center', padding:40 }}>
            🎤 Press the mic button below to start speaking.
            <br />
            <span style={{ fontSize:11, color:'#2a3645' }}>
              The AI will ask questions and read them aloud.
            </span>
          </div>
        )}

        {chatMsgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf:m.role === 'candidate' ? 'flex-end' : 'flex-start',
              maxWidth:'75%',
              background:m.role === 'candidate' ? '#ec489911' : '#1e2a3a',
              border:`1px solid ${m.role === 'candidate' ? '#ec489944' : '#2a3645'}`,
              borderRadius:m.role === 'candidate' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding:'10px 14px',
              color:m.role === 'candidate' ? '#fbcfe8' : '#c8c8c8',
              fontSize:13,
              lineHeight:1.7,
            }}
          >
            {m.role === 'interviewer' && (
              <div style={{ color:'#ec4899', fontSize:10, fontWeight:700, marginBottom:4 }}>
                🔊 AI RECRUITER
              </div>
            )}
            {m.text}
          </div>
        ))}

        {chatLoading && (
          <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>
            🎤 AI is responding...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {transcript && (
        <div style={{ padding:'8px 24px', background:'#ec489908', borderTop:'1px solid #ec489922' }}>
          <span style={{ color:'#ec4899', fontSize:11, fontStyle:'italic' }}>
            🎤 "{transcript}"
          </span>
        </div>
      )}

      <div style={{
        padding:'20px 24px',
        borderTop:'1px solid #1e2a3a',
        background:'#0d1117',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        gap:16,
        flexShrink:0,
      }}>
        <motion.button
          whileHover={{ scale:1.05 }}
          whileTap={{ scale:0.95 }}
          onClick={listening ? stopListening : startListening}
          disabled={chatLoading || !supported}
          style={{
            width:72,
            height:72,
            borderRadius:'50%',
            background:listening ? '#ff4d4d' : '#ec4899',
            border:listening ? '3px solid #ff8080' : '3px solid #ec489966',
            cursor:'pointer',
            fontSize:28,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:listening ? '0 0 30px #ff4d4d66' : '0 0 20px #ec489944',
            opacity:chatLoading || !supported ? 0.4 : 1,
          }}
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
    { id:'ai-native', label:'⚡ AI-Native', desc:'Multi-file • Copilot • Agent mode' },
    { id:'db-debug',            label:'🗄️ DB Debug',       desc:'SQL · Schema · Transactions · Optimization' },
    { id:'api-integration',     label:'🔌 API Design',      desc:'REST · GraphQL · Auth · Rate Limiting'      },
    { id:'cloud-arch',          label:'☁️ Cloud Arch',       desc:'AWS/GCP · Serverless · K8s · Cost'          },
    { id:'distributed-systems', label:'🌐 Distributed Sys', desc:'CAP · Consensus · Sharding · Sagas'         },
  ];

  const typeColors = {
    coding:'#a855f7', 'system-design':'#1a73e8', behavioral:'#f59e0b',
    'technical-screening':'#10b981', frontend:'#f472b6', 'ai-fluency':'#a78bfa',
    personalized:'#f59e0b', voice:'#ec4899', 'ai-native':'#06b6d4',
    'db-debug':'#06b6d4',
    'api-integration':'#f97316',
    'cloud-arch':'#8b5cf6',
    'distributed-systems':'#ec4899'
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
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              2 system design questions in 60 minutes. Discuss architecture, trade-offs, and scalability with the AI interviewer.
            </p>
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
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              4 behavioral questions in 30 minutes. The AI will probe using the STAR framework.
            </p>
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
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              30-minute recruiter-style screening. CS fundamentals, resume walkthrough, and role fit evaluation.
            </p>
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
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              45-minute frontend coding round. JavaScript, React patterns, CSS, and architecture trade-offs.
            </p>
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
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              30-minute assessment of AI collaboration skills — prompting strategies, tool usage, and limitations awareness.
            </p>
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
              <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:0 }}>
                Paste a job description and the AI will generate 5 role-specific interview questions just for you.
              </p>
            </div>

            <div style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'16px' }}>
              <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>
                Paste Job Description
              </div>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here — requirements, responsibilities, tech stack..."
                style={{
                  width:'100%',
                  boxSizing:'border-box',
                  height:140,
                  background:'#060910',
                  border:`1px solid ${jdText.length > 100 ? '#f59e0b44' : '#1e2a3a'}`,
                  borderRadius:8,
                  padding:'10px 12px',
                  color:'#e8e8e8',
                  fontSize:12,
                  fontFamily:'Arial, sans-serif',
                  lineHeight:1.6,
                  outline:'none',
                  resize:'vertical',
                }}
              />
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:10 }}>
                <div style={{ flex:1, height:1, background:'#1e2a3a' }} />
                <span style={{ color:'#333', fontSize:11 }}>or</span>
                <div style={{ flex:1, height:1, background:'#1e2a3a' }} />
              </div>
              <label style={{
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:8,
                marginTop:10,
                background:'#060910',
                border:`1px solid ${jdFile ? '#f59e0b44' : '#1e2a3a'}`,
                borderRadius:8,
                padding:'10px',
                cursor:'pointer',
                color:jdFile ? '#f59e0b' : '#555',
                fontSize:12,
                fontWeight:600,
                transition:'all 0.15s',
              }}>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  style={{ display:'none' }}
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
                    } finally {
                      setJdLoading(false);
                    }
                  }}
                />
                {jdLoading ? '⏳ Reading file...' : jdFile ? `✓ ${jdFile.name}` : '📎 Upload PDF or TXT'}
              </label>
              {jdText.length > 0 && (
                <div style={{ marginTop:8, color:'#f59e0b', fontSize:10, textAlign:'right' }}>
                  {jdText.length} characters — ready to generate questions
                </div>
              )}
            </div>
          </div>
        )}

        {interviewType === 'voice' && (
          <div style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#ec4899', fontSize:15 }}>🎤 Voice Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              Speak naturally with an AI recruiter. Your voice is transcribed in real time. The AI reads questions aloud.
            </p>
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

        {interviewType === 'db-debug' && (
          <div style={{ background:'#06b6d411', border:'1px solid #06b6d433', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#06b6d4', fontSize:15 }}>🗄️ Database Debugging Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              2 real-world database problems in 45 minutes. Debug slow queries, deadlocks, N+1 issues, and schema design problems with a senior DB engineer.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['SQL Optimization','EXPLAIN Plans','Indexing','Transactions','Schema Design','Replication','Deadlocks'].map(t => (
                <span key={t} style={{ background:'#06b6d411', border:'1px solid #06b6d433', borderRadius:12, padding:'2px 10px', color:'#06b6d4', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'api-integration' && (
          <div style={{ background:'#f9731611', border:'1px solid #f9731633', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#f97316', fontSize:15 }}>🔌 API Integration Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              45-minute deep dive into API design and integration engineering. Webhooks, OAuth, GraphQL, rate limiting, circuit breakers, and versioning.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['REST Design','GraphQL','OAuth 2.0','Webhooks','Rate Limiting','Circuit Breaker','Versioning'].map(t => (
                <span key={t} style={{ background:'#f9731611', border:'1px solid #f9731633', borderRadius:12, padding:'2px 10px', color:'#f97316', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'cloud-arch' && (
          <div style={{ background:'#8b5cf611', border:'1px solid #8b5cf633', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#8b5cf6', fontSize:15 }}>☁️ Cloud Architecture Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              60-minute cloud architecture session. Design serverless pipelines, multi-region systems, Kubernetes deployments, observability stacks, and cost-optimized infrastructure.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['AWS/GCP/Azure','Serverless','Kubernetes','Multi-region','Cost Optimization','CI/CD','Observability'].map(t => (
                <span key={t} style={{ background:'#8b5cf611', border:'1px solid #8b5cf633', borderRadius:12, padding:'2px 10px', color:'#8b5cf6', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {interviewType === 'distributed-systems' && (
          <div style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
            <h3 style={{ margin:'0 0 8px', color:'#ec4899', fontSize:15 }}>🌐 Distributed Systems Interview</h3>
            <p style={{ color:'#888', fontSize:12, lineHeight:1.6, margin:'0 0 10px' }}>
              60-minute senior-level distributed systems deep dive. CAP theorem, Raft consensus, eventual consistency, distributed transactions, sharding, and clock synchronization.
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['CAP Theorem','Raft/Paxos','Eventual Consistency','Sagas','Consistent Hashing','Vector Clocks','CRDTs'].map(t => (
                <span key={t} style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:12, padding:'2px 10px', color:'#ec4899', fontSize:10 }}>{t}</span>
              ))}
            </div>
          </div>
        )}
                {/* Selected config details — coding only */}
        {interviewType === 'coding' && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected}
              initial={{ opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0 }}
              style={{
                background:'#0d1117',
                border:`1px solid ${config.color}44`,
                borderRadius:16,
                padding:'20px 24px',
                marginBottom:24,
                position:'relative',
                overflow:'hidden',
              }}
            >
              <div style={{
                position:'absolute',
                top:0,
                left:0,
                right:0,
                height:2,
                background:`linear-gradient(90deg, transparent, ${config.color}, transparent)`,
              }} />
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <span style={{ fontSize:32 }}>{config.logo}</span>
                <div>
                  <h2 style={{ margin:0, color:config.color, fontSize:18, fontWeight:900 }}>
                    {config.company} Interview
                  </h2>
                  <p style={{ margin:'3px 0 0', color:'#666', fontSize:12 }}>
                    {config.desc}
                  </p>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  { icon:'⏱', label:'Duration', value:`${config.duration} min` },
                  { icon:'📝', label:'Problems', value:`${selected === 'microsoft' ? 3 : 2} problems` },
                  { icon:'🎯', label:'Focus',    value:selected === 'general' ? 'Mixed' : config.company },
                ].map(d => (
                  <div
                    key={d.label}
                    style={{
                      background:'#060910',
                      border:'1px solid #1e2a3a',
                      borderRadius:10,
                      padding:'10px',
                      textAlign:'center',
                    }}
                  >
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
            💡 {
              interviewType === 'behavioral' ? 'Behavioral Tips'
              : interviewType === 'system-design' ? 'System Design Tips'
              : interviewType === 'technical-screening' ? 'Screening Tips'
              : interviewType === 'frontend' ? 'Frontend Tips'
              : interviewType === 'ai-fluency' ? 'AI Fluency Tips'
              : interviewType === 'personalized' ? 'Personalized Tips'
              : interviewType === 'voice' ? 'Voice Tips'
              : interviewType === 'autonomous' ? 'Autonomous Tips'
              : interviewType === 'ai-native' ? 'AI-Native Tips'
              : interviewType === 'db-debug' ? 'Database Debug Tips'
              : interviewType === 'api-integration' ? 'API Integration Tips'
              : interviewType === 'cloud-arch' ? 'Cloud Architecture Tips'
              : interviewType === 'distributed-systems' ? 'Distributed Systems Tips'
              : 'Interview Tips'
            }
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {(
              interviewType === 'system-design'
                ? ['Start with requirements clarification','Draw the high-level architecture first','Discuss trade-offs for every decision','Address bottlenecks and failure modes']
              : interviewType === 'behavioral'
                ? ['Use the STAR method: Situation, Task, Action, Result','Be specific — use "I" not "we"','Quantify your impact whenever possible','Show self-awareness and growth']
              : interviewType === 'technical-screening'
                ? ['Walk through your resume confidently','Use STAR for behavioral questions','Name complexity even if not asked','Ask smart questions at the end']
              : interviewType === 'frontend'
                ? ['Start with semantic HTML before CSS','Explain browser rendering trade-offs','Show accessibility awareness','Discuss bundle size and performance']
              : interviewType === 'ai-fluency'
                ? ['Show you know AI tool limitations','Discuss when NOT to use AI','Give real examples from your workflow','Talk about prompt iteration process']
              : interviewType === 'personalized'
                ? ['Review the JD before starting','Connect every answer to JD requirements','Show specific relevant experience','Prepare a smart question to ask back']
              : interviewType === 'voice'
                ? ['Speak clearly and at a natural pace','Structure answers with STAR','Pause before answering — it is okay','Treat it like a real phone screen']
              : interviewType === 'autonomous'
                ? ['Think out loud — the AI is listening','Be specific with examples','It is okay to say "I am not sure" honestly','Ask clarifying questions freely']
              : interviewType === 'ai-native'
                ? ['Read all files before writing','Run tests early and often','Use Agent mode for boilerplate','Copilot will not give the full answer']
              : interviewType === 'db-debug'
                ? ['Start with the symptom and root cause','Ask what EXPLAIN would show','Think indexes, joins, and lock order','Mention trade-offs before rewriting']
              : interviewType === 'api-integration'
                ? ['Design the contract first','Always think idempotency','Handle retries and duplicate events','Secure every boundary']
              : interviewType === 'cloud-arch'
                ? ['Start with SLA and constraints','Discuss cost at scale','Design for region failure','Prefer managed services when justified']
              : interviewType === 'distributed-systems'
                ? ['Be precise about consistency','Explain partition behavior step by step','Discuss failure modes first','Every design has trade-offs']
              : ['Think out loud — interviewers want to hear your process','Start with brute force, then optimize','Always discuss time & space complexity','Ask clarifying questions before coding']
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

        <motion.button
          whileHover={{ scale:1.02 }}
          whileTap={{ scale:0.98 }}
          onClick={async () => {
            setStarting(true);
            const companyToSend = [
              'technical-screening',
              'ai-fluency',
              'frontend',
              'personalized',
              'voice',
              'autonomous',
              'ai-native',
              'db-debug',
              'api-integration',
              'cloud-arch',
              'distributed-systems',
            ].includes(interviewType)
              ? interviewType
              : selected;

            await onStart(
              companyToSend,
              topics,
              interviewType,
              jdText,
              realWorld,
              aiAssistEnabled
            );

            setStarting(false);
          }}
          disabled={starting || (interviewType === 'personalized' && jdText.length < 50)}
          style={{
            width:'100%',
            background:starting ? '#1e2a3a' : `linear-gradient(135deg, ${activeColor}, ${activeColor}88)`,
            border:'none',
            borderRadius:14,
            color:starting ? '#444' : '#fff',
            cursor:(starting || (interviewType === 'personalized' && jdText.length < 50)) ? 'not-allowed' : 'pointer',
            fontSize:16,
            fontWeight:900,
            padding:'16px 0',
            boxShadow:starting ? 'none' : `0 0 30px ${activeColor}44`,
          }}
        >
          {starting ? '⏳ Setting up interview...'
            : interviewType === 'system-design'       ? '🏗️ Start System Design Interview'
            : interviewType === 'behavioral'           ? '🎙️ Start Behavioral Interview'
            : interviewType === 'technical-screening'  ? '📋 Start Technical Screening'
            : interviewType === 'frontend'             ? '🖥️ Start Frontend Interview'
            : interviewType === 'ai-fluency'           ? '🤖 Start AI Fluency Interview'
            : interviewType === 'personalized'         ? (jdText.length < 50 ? '📄 Paste a Job Description first' : '📄 Start Personalized Interview')
            : interviewType === 'voice'                ? '🎤 Start Voice Interview'
            : interviewType === 'autonomous'           ? '🧠 Start Autonomous Interview'
            : interviewType === 'ai-native'            ? '⚡ Start AI-Native Interview'
            : interviewType === 'db-debug'             ? '🗄️ Start Database Debug Interview'
            : interviewType === 'api-integration'      ? '🔌 Start API Integration Interview'
            : interviewType === 'cloud-arch'           ? '☁️ Start Cloud Architecture Interview'
            : interviewType === 'distributed-systems'  ? '🌐 Start Distributed Systems Interview'
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
  const typeColors  = { 'technical-screening':'#10b981', frontend:'#f472b6', 'ai-fluency':'#a78bfa', personalized:'#f59e0b', voice:'#ec4899', 'system-design':'#1a73e8', behavioral:'#f59e0b', autonomous:'#00c896', 'ai-native':'#06b6d4', 'db-debug':'#06b6d4', 'api-integration':'#f97316', 'cloud-arch':'#8b5cf6', 'distributed-systems':'#ec4899' };
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

        <IntegrityReport sessionId={result.sessionId} displayColor={displayColor} />
        <InterviewReplay sessionId={result.sessionId} displayColor={displayColor} />
                {/* Follow-up Chat */}
        <div style={{ marginBottom:24 }}>
          <button
            onClick={() => setFollowUpOpen(o => !o)}
            style={{
              width:'100%',
              background:followUpOpen ? `${displayColor}11` : '#060910',
              border:`1px solid ${followUpOpen ? displayColor + '44' : '#1e2a3a'}`,
              borderRadius:12,
              padding:'12px 16px',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'space-between',
              transition:'all 0.2s',
            }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ color:followUpOpen ? displayColor : '#e8e8e8', fontSize:13, fontWeight:700 }}>
                  Follow-up Chat
                </div>
                <div style={{ color:'#555', fontSize:10, marginTop:1 }}>
                  Ask the AI coach about your feedback or weak areas
                </div>
              </div>
            </div>
            <span style={{ color:'#555', fontSize:12 }}>{followUpOpen ? '▲' : '▼'}</span>
          </button>

          {followUpOpen && (
            <div style={{
              border:`1px solid ${displayColor}33`,
              borderTop:'none',
              borderRadius:'0 0 12px 12px',
              background:'#060910',
              overflow:'hidden',
            }}>
              <div style={{
                maxHeight:320,
                overflowY:'auto',
                padding:'12px 14px',
                display:'flex',
                flexDirection:'column',
                gap:8,
              }}>
                {followUpMsgs.length === 0 && (
                  <div style={{ color:'#333', fontSize:12, textAlign:'center', padding:16 }}>
                    Ask anything about your performance — "Why did I fail test cases?", "What should I study?", "Walk me through the optimal solution"
                  </div>
                )}

                {followUpMsgs.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf:m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth:'85%',
                      background:m.role === 'user' ? `${displayColor}18` : '#1e2a3a',
                      border:`1px solid ${m.role === 'user' ? displayColor + '33' : '#2a3645'}`,
                      borderRadius:m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding:'8px 12px',
                      color:m.role === 'user' ? '#e8e8e8' : '#c8c8c8',
                      fontSize:12,
                      lineHeight:1.6,
                    }}
                  >
                    {m.role === 'coach' && (
                      <div style={{
                        color:displayColor,
                        fontSize:9,
                        fontWeight:700,
                        marginBottom:3,
                        textTransform:'uppercase',
                      }}>
                        🎓 AI Coach
                      </div>
                    )}
                    {m.text}
                  </div>
                ))}

                {followUpLoading && (
                  <div style={{ color:'#555', fontSize:12, fontStyle:'italic' }}>
                    🎓 Coach is thinking...
                  </div>
                )}

                <div ref={followUpEndRef} />
              </div>

              <div style={{ padding:'8px 12px', borderTop:'1px solid #1e2a3a', display:'flex', gap:6 }}>
                <input
                  value={followUpInput}
                  onChange={e => setFollowUpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendFollowUp(); }}
                  placeholder="Ask about your feedback, weak areas, or solutions..."
                  style={{
                    flex:1,
                    background:'#0d1117',
                    border:'1px solid #1e2a3a',
                    borderRadius:8,
                    padding:'8px 12px',
                    color:'#e8e8e8',
                    fontSize:12,
                    outline:'none',
                  }}
                />
                <button
                  onClick={sendFollowUp}
                  disabled={followUpLoading || !followUpInput.trim() || !result.sessionId}
                  style={{
                    background:displayColor,
                    border:'none',
                    borderRadius:8,
                    color:'#fff',
                    cursor:'pointer',
                    fontSize:12,
                    fontWeight:700,
                    padding:'8px 14px',
                    opacity:followUpLoading || !followUpInput.trim() ? 0.4 : 1,
                  }}
                >
                  Ask
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={onRedo}
            style={{
              flex:1,
              background:'#1e2a3a',
              border:'1px solid #1e2a3a',
              borderRadius:10,
              color:'#888',
              cursor:'pointer',
              fontSize:13,
              fontWeight:600,
              padding:'10px 0',
            }}
          >
            Try Again
          </button>
          <button
            onClick={onHome}
            style={{
              flex:1,
              background:`linear-gradient(135deg, ${displayColor}, ${displayColor}88)`,
              border:'none',
              borderRadius:10,
              color:'#fff',
              cursor:'pointer',
              fontSize:13,
              fontWeight:700,
              padding:'10px 0',
            }}
          >
            Back to World →
          </button>
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
    } catch (e) {
      // non-blocking
    }
  }, [session?.sessionId]);
    useEffect(() => {
    if (!session?.sessionId || phase !== 'interview') return;

    const onVisibility = () => {
      if (document.hidden) {
        setTabSwitches(t => t + 1);
        sendIntegrityEvent('screen_blur', { duration: 0 });
      }
    };

    const onPaste = () => {
      setPasteCount(p => p + 1);
    };

    const onKeyDown = (e) => {
      const now = Date.now();
      const last = lastKeyRef.current;

      if (last && now - last < 80) {
        burstCountRef.current += 1;
      } else {
        idleBurstRef.current += 1;
      }

      lastKeyRef.current = now;

      keystrokesRef.current.push({
        key: e.key.length === 1 ? 'char' : e.key,
        ts: now,
      });

      if (keystrokesRef.current.length > 200) {
        keystrokesRef.current.shift();
      }

      if (burstCountRef.current >= 25) {
        sendIntegrityEvent('burst_event', {
          burstCount: burstCountRef.current,
          recentKeys: keystrokesRef.current.slice(-30),
        });
        burstCountRef.current = 0;
      }

      if (keystrokesRef.current.length % 50 === 0) {
        sendIntegrityEvent('keystroke_stats', {
          total: keystrokesRef.current.length,
          burstCount: burstCountRef.current,
          idleCount: idleBurstRef.current,
        });
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('paste', onPaste);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('paste', onPaste);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [session?.sessionId, phase, sendIntegrityEvent]);

  useEffect(() => {
    if (!webcamOn || !session?.sessionId || phase !== 'interview') return;

    let cancelled = false;
    let intervalId;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:false });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        intervalId = setInterval(() => {
          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas || !video.videoWidth) return;

            canvas.width = 180;
            canvas.height = 120;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const img = canvas.toDataURL('image/jpeg', 0.35);

            sendIntegrityEvent('webcam_snapshot', {
              img,
              faceDetected: true,
            });
          } catch (e) {
            // ignore
          }
        }, 30000);
      } catch (e) {
        setWebcamOn(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      streamRef.current?.getTracks()?.forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [webcamOn, session?.sessionId, phase, sendIntegrityEvent]);

  useEffect(() => {
    if (phase !== 'interview' || !session) return;

    setRemaining((session.duration || 45) * 60);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          completeInterview();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, session]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [chatMsgs]);

  const currentProblem = session?.problems?.[probIdx];
  const iType = session?.interviewType || 'coding';

  const askInterviewer = useCallback(async (answerText) => {
    if (!session?.sessionId || !currentProblem || chatLoading) return;

    setChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/ai-question`, {
        userId: user?.uid,
        problemId: currentProblem.id,
        code: '',
        language: 'javascript',
        conversation: chatMsgs,
        userAnswer: answerText,
      });

      if (res.data.question) {
        setChatMsgs(prev => [...prev, { role:'interviewer', text:res.data.question }]);
      }
    } catch (e) {
      console.error('AI question error:', e);
      setChatMsgs(prev => [...prev, {
        role:'interviewer',
        text:'I had trouble generating the next question. Please continue with your approach.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [session?.sessionId, currentProblem, chatLoading, user?.uid, chatMsgs]);

  const sendChatMsg = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const msg = chatInput.trim();
    setChatInput('');
    setChatMsgs(prev => [...prev, { role:'candidate', text:msg }]);
    await askInterviewer(msg);
  };

  const startInterview = async (
    selectedCompany,
    selectedTopics = [],
    interviewType = 'coding',
    jdText = '',
    realWorld = false,
    aiAssistEnabled = false
  ) => {
    setStartError(null);

    try {
      const res = await axios.post(`${API_BASE}/mock-interview/start`, {
        userId: user?.uid,
        company: selectedCompany,
        topics: selectedTopics,
        interviewType,
        jdText,
        realWorld,
        aiAssistEnabled,
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Failed to start interview');
      }

      setCompany(selectedCompany);
      setSession(res.data);
      setProbIdx(0);
      setSolved([]);
      setTabSwitches(0);
      setPasteCount(0);
      setChatMsgs([]);
      setChatInput('');
      setChatOpen(['technical-screening','ai-fluency','personalized','voice','autonomous','db-debug','api-integration','cloud-arch','distributed-systems'].includes(res.data.interviewType));
      setPhase('interview');

      if (['technical-screening','ai-fluency','personalized','voice','autonomous','db-debug','api-integration','cloud-arch','distributed-systems'].includes(res.data.interviewType)) {
        setTimeout(() => askOpeningQuestion(res.data), 300);
      }
    } catch (e) {
      console.error('Start interview failed:', e);
      setStartError(e.response?.data?.error || e.message || 'Could not start interview');
    }
  };

  const askOpeningQuestion = async (s) => {
    const firstProblem = s?.problems?.[0];
    if (!s?.sessionId || !firstProblem) return;

    setChatLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${s.sessionId}/ai-question`, {
        userId: user?.uid,
        problemId: firstProblem.id,
        code: '',
        language: 'javascript',
        conversation: [],
      });

      if (res.data.question) {
        setChatMsgs([{ role:'interviewer', text:res.data.question }]);
      }
    } catch (e) {
      console.error('Opening question failed:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSolved = async ({ code, language, passed, total, allPassed }) => {
    if (!session?.sessionId || !currentProblem) return;

    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/submit`, {
        userId: user?.uid,
        problemId: currentProblem.id,
        code,
        language,
        passed,
        total,
        allPassed,
        tabSwitches,
        pasteCount,
      });

      if (res.data.success && allPassed) {
        setSolved(prev => [...new Set([...prev, currentProblem.id])]);
      }
    } catch (e) {
      console.error('Submit failed:', e);
    }
  };

  const completeInterview = async () => {
    if (!session?.sessionId) return;

    try {
      const res = await axios.post(`${API_BASE}/mock-interview/${session.sessionId}/complete`, {
        userId: user?.uid,
      });

      if (res.data.success) {
        const finalResult = {
          ...res.data,
          sessionId: session.sessionId,
          userId: user?.uid,
          totalProbs: session.problems?.length || 0,
          interviewType: session.interviewType,
        };

        setResult(finalResult);
        setPhase('result');

        if (setUserData && res.data.totalScore > 0) {
          setUserData(prev => ({
            ...(prev || {}),
            xp: ((prev || {}).xp || 0) + Math.round(res.data.totalScore * 0.5),
            mockInterviews: ((prev || {}).mockInterviews || 0) + 1,
          }));
        }
      }
    } catch (e) {
      console.error('Complete interview failed:', e);
      setPhase('result');
      setResult({
        sessionId: session.sessionId,
        userId: user?.uid,
        totalScore: 0,
        maxScore: 0,
        pct: 0,
        solvedCount: solved.length,
        totalProbs: session.problems?.length || 0,
        feedback: 'Interview completed, but report generation failed.',
        interviewType: session.interviewType,
      });
    }
  };

  const nextProblem = () => {
    if (!session?.problems) return;

    if (probIdx < session.problems.length - 1) {
      setProbIdx(i => i + 1);
      setChatMsgs([]);
      setChatInput('');
      setTimeout(() => askOpeningQuestion({ ...session, problems:[session.problems[probIdx + 1]] }), 200);
    } else {
      completeInterview();
    }
  };

  const redoInterview = () => {
    setPhase('select');
    setSession(null);
    setResult(null);
    setProbIdx(0);
    setSolved([]);
    setChatMsgs([]);
    setChatInput('');
    setStartError(null);
  };
    const goHome = () => {
    navigate('/world');
  };

  if (phase === 'select') {
    return <CompanySelector onStart={startInterview} error={startError} />;
  }

  if (phase === 'result') {
    return (
      <InterviewResult
        result={result}
        company={company}
        onRedo={redoInterview}
        onHome={goHome}
      />
    );
  }

  if (!session || !currentProblem) {
    return (
      <div style={{
        minHeight:'100vh',
        background:'#0a0a14',
        color:'#e8e8e8',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        fontFamily:'Arial, sans-serif',
      }}>
        Loading interview...
      </div>
    );
  }

  const isChatType = [
    'technical-screening',
    'ai-fluency',
    'personalized',
    'voice',
    'autonomous',
    'db-debug',
    'api-integration',
    'cloud-arch',
    'distributed-systems',
  ].includes(iType);

  const isSpecialArchitectureType = [
    'db-debug',
    'api-integration',
    'cloud-arch',
    'distributed-systems',
  ].includes(iType);

  const displayConfig = CONFIGS[company] || CONFIGS.general;

  const typeColors = {
    'technical-screening':'#10b981',
    frontend:'#f472b6',
    'ai-fluency':'#a78bfa',
    personalized:'#f59e0b',
    voice:'#ec4899',
    'system-design':'#1a73e8',
    behavioral:'#f59e0b',
    autonomous:'#00c896',
    'ai-native':'#06b6d4',
    'db-debug':'#06b6d4',
    'api-integration':'#f97316',
    'cloud-arch':'#8b5cf6',
    'distributed-systems':'#ec4899',
  };

  const activeColor = typeColors[iType] || displayConfig.color;

  if (iType === 'ai-native') {
    return (
      <AINativeIDE
        user={user}
        session={session}
        currentProblem={currentProblem}
        remaining={remaining}
        onComplete={completeInterview}
        onNext={nextProblem}
        tabSwitches={tabSwitches}
        pasteCount={pasteCount}
        webcamOn={webcamOn}
        setWebcamOn={setWebcamOn}
        observeOpen={observeOpen}
        setObserveOpen={setObserveOpen}
      />
    );
  }

  return (
    <div style={{
      height:'100vh',
      background:'#0a0a14',
      color:'#e8e8e8',
      fontFamily:'Arial, sans-serif',
      display:'flex',
      flexDirection:'column',
      overflow:'hidden',
    }}>
      {/* Header */}
      <div style={{
        height:56,
        background:'#0d1117',
        borderBottom:'1px solid #1e2a3a',
        display:'flex',
        alignItems:'center',
        justifyContent:'space-between',
        padding:'0 20px',
        flexShrink:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button
            onClick={() => setPhase('select')}
            style={{
              background:'#060910',
              border:'1px solid #1e2a3a',
              borderRadius:8,
              color:'#888',
              cursor:'pointer',
              fontSize:12,
              padding:'6px 10px',
            }}
          >
            ← Exit
          </button>

          <div style={{
            width:34,
            height:34,
            borderRadius:10,
            background:`${activeColor}18`,
            border:`1px solid ${activeColor}44`,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            fontSize:18,
          }}>
            {iType === 'db-debug' ? '🗄️'
              : iType === 'api-integration' ? '🔌'
              : iType === 'cloud-arch' ? '☁️'
              : iType === 'distributed-systems' ? '🌐'
              : iType === 'system-design' ? '🏗️'
              : iType === 'behavioral' ? '🎙️'
              : iType === 'technical-screening' ? '📋'
              : iType === 'frontend' ? '🖥️'
              : iType === 'ai-fluency' ? '🤖'
              : iType === 'personalized' ? '📄'
              : iType === 'voice' ? '🎤'
              : iType === 'autonomous' ? '🧠'
              : displayConfig.logo}
          </div>

          <div>
            <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:800 }}>
              {session.config?.company || session.company || displayConfig.company} Interview
            </div>
            <div style={{ color:'#555', fontSize:10 }}>
              Problem {probIdx + 1}/{session.problems?.length || 1}
              {isChatType ? ' • Conversation mode' : ' • Coding mode'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            background:remaining < 300 ? '#ff4d4d22' : '#060910',
            border:`1px solid ${remaining < 300 ? '#ff4d4d55' : '#1e2a3a'}`,
            borderRadius:10,
            padding:'7px 12px',
            color:remaining < 300 ? '#ff4d4d' : '#e8e8e8',
            fontSize:13,
            fontWeight:900,
            fontFamily:'monospace',
          }}>
            ⏱ {formatTime(remaining)}
          </div>

          <button
            onClick={() => setObserveOpen(o => !o)}
            style={{
              background:observeOpen ? '#1a73e822' : '#060910',
              border:`1px solid ${observeOpen ? '#1a73e855' : '#1e2a3a'}`,
              borderRadius:8,
              color:observeOpen ? '#1a73e8' : '#666',
              cursor:'pointer',
              fontSize:12,
              padding:'7px 10px',
              fontWeight:700,
            }}
          >
            👁 Observer
          </button>

          <button
            onClick={() => setWebcamOn(w => !w)}
            style={{
              background:webcamOn ? '#00c89622' : '#060910',
              border:`1px solid ${webcamOn ? '#00c89655' : '#1e2a3a'}`,
              borderRadius:8,
              color:webcamOn ? '#00c896' : '#666',
              cursor:'pointer',
              fontSize:12,
              padding:'7px 10px',
              fontWeight:700,
            }}
          >
            📷 {webcamOn ? 'On' : 'Off'}
          </button>

          <button
            onClick={completeInterview}
            style={{
              background:`linear-gradient(135deg, ${activeColor}, ${activeColor}88)`,
              border:'none',
              borderRadius:8,
              color:'#fff',
              cursor:'pointer',
              fontSize:12,
              fontWeight:800,
              padding:'8px 14px',
            }}
          >
            Finish
          </button>
        </div>
      </div>

      {/* Hidden webcam/canvas */}
      <video ref={videoRef} style={{ display:'none' }} muted playsInline />
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Body */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        {observeOpen && (
          <LiveObserverPanel
            sessionId={session.sessionId}
            displayColor={activeColor}
            onClose={() => setObserveOpen(false)}
          />
        )}

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          {/* Voice UI */}
          {iType === 'voice' && (
            <VoiceInterview
              chatMsgs={chatMsgs}
              chatLoading={chatLoading}
              chatEndRef={chatEndRef}
              askInterviewer={askInterviewer}
              setChatMsgs={setChatMsgs}
            />
          )}

          {/* ── Database Debugging UI ── */}
          {iType === 'db-debug' && currentProblem && (
            <div style={{ display:'flex', height:'100%' }}>
              <div style={{ width:'45%', display:'flex', flexDirection:'column', borderRight:'1px solid #1e2a3a', overflow:'hidden' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ background:'#06b6d422', border:'1px solid #06b6d444', borderRadius:12, padding:'2px 10px', color:'#06b6d4', fontSize:10, fontWeight:700 }}>
                      🗄️ DB DEBUG
                    </span>
                    <span style={{
                      background:({Easy:'#00c89622', Medium:'#f5c54222', Hard:'#ff4d4d22'})[currentProblem.difficulty] || '#88888822',
                      border:`1px solid ${({Easy:'#00c89644', Medium:'#f5c54244', Hard:'#ff4d4d44'})[currentProblem.difficulty] || '#88888844'}`,
                      borderRadius:12,
                      padding:'2px 10px',
                      color:({Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d'})[currentProblem.difficulty] || '#888',
                      fontSize:10,
                      fontWeight:700,
                    }}>
                      {currentProblem.difficulty}
                    </span>
                  </div>

                  <h2 style={{ margin:'0 0 6px', color:'#e8e8e8', fontSize:15, fontWeight:800 }}>
                    {currentProblem.title}
                  </h2>

                  {currentProblem.scenario && (
                    <p style={{ margin:'0 0 8px', color:'#888', fontSize:12, lineHeight:1.6 }}>
                      {currentProblem.scenario}
                    </p>
                  )}

                  {currentProblem.objective && (
                    <div style={{ background:'#06b6d408', border:'1px solid #06b6d422', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ color:'#06b6d4', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>
                        OBJECTIVE
                      </div>
                      <div style={{ color:'#999', fontSize:11, lineHeight:1.6 }}>
                        {currentProblem.objective}
                      </div>
                    </div>
                  )}
                </div>

                {currentProblem.schema && (
                  <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                    <div style={{ padding:'8px 20px', borderBottom:'1px solid #1e2a3a', background:'#060910', flexShrink:0 }}>
                      <span style={{ color:'#444', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>
                        📋 Schema / Code
                      </span>
                    </div>
                    <pre style={{
                      flex:1,
                      margin:0,
                      padding:'14px 20px',
                      color:'#88d4ff',
                      fontSize:11,
                      fontFamily:'"Fira Code","Courier New",monospace',
                      lineHeight:1.7,
                      overflowY:'auto',
                      overflowX:'auto',
                      whiteSpace:'pre',
                      background:'#060910',
                    }}>
                      {currentProblem.schema}
                    </pre>
                  </div>
                )}
              </div>

              <ChatPanel
                color="#06b6d4"
                icon="🗄️"
                title="DB Engineer Interviewer"
                subtitle="Diagnose → EXPLAIN → Index → Rewrite"
                placeholder="What's your diagnosis? Start with your analysis..."
                chatMsgs={chatMsgs}
                chatLoading={chatLoading}
                chatEndRef={chatEndRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMsg={sendChatMsg}
              />
            </div>
          )}
                    {/* ── API Integration UI ── */}
          {iType === 'api-integration' && currentProblem && (
            <div style={{ display:'flex', height:'100%' }}>
              <SideRequirementPanel
                color="#f97316"
                icon="🔌"
                title={currentProblem.title}
                requirements={currentProblem.requirements}
                probeTitle="💡 PROBE AREAS"
                probes={['Idempotency','Error handling','Security','Scalability','Failure modes']}
              />

              <ChatPanel
                color="#f97316"
                icon="🔌"
                title="API Architect Interviewer"
                subtitle="Design → Failure cases → Security → Scale"
                placeholder="Walk through your design approach..."
                chatMsgs={chatMsgs}
                chatLoading={chatLoading}
                chatEndRef={chatEndRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMsg={sendChatMsg}
              />
            </div>
          )}

          {/* ── Cloud Architecture UI ── */}
          {iType === 'cloud-arch' && currentProblem && (
            <div style={{ display:'flex', height:'100%' }}>
              <SideRequirementPanel
                color="#8b5cf6"
                icon="☁️"
                title={currentProblem.title}
                requirements={currentProblem.requirements}
                probeTitle="💡 ALWAYS DISCUSS"
                probes={['Cost at scale','Failure recovery','Multi-region trade-offs','Managed vs self-hosted','Observability']}
              />

              <ChatPanel
                color="#8b5cf6"
                icon="☁️"
                title="Cloud Architect Interviewer"
                subtitle="SLA → Architecture → Cost → Failure recovery"
                placeholder="Start with your high-level cloud architecture..."
                chatMsgs={chatMsgs}
                chatLoading={chatLoading}
                chatEndRef={chatEndRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMsg={sendChatMsg}
              />
            </div>
          )}

          {/* ── Distributed Systems UI ── */}
          {iType === 'distributed-systems' && currentProblem && (
            <div style={{ display:'flex', height:'100%' }}>
              <div style={{ width:260, borderRight:'1px solid #1e2a3a', padding:'18px 16px', overflowY:'auto', flexShrink:0, background:'#0d1117' }}>
                <div style={{ color:'#ec4899', fontSize:12, fontWeight:900, marginBottom:6 }}>
                  🌐 {currentProblem.title}
                </div>

                {currentProblem.scenario && (
                  <div style={{ color:'#777', fontSize:11, lineHeight:1.6, marginTop:10 }}>
                    {currentProblem.scenario}
                  </div>
                )}

                <div style={{ marginTop:16, background:'#ec489908', border:'1px solid #ec489922', borderRadius:10, padding:10 }}>
                  <div style={{ color:'#ec4899', fontSize:9, fontWeight:700, marginBottom:6 }}>
                    💡 PROBE AREAS
                  </div>
                  {['Consistency model','Partition behavior','Failure recovery','Conflict resolution','Trade-offs'].map(t => (
                    <div key={t} style={{ color:'#555', fontSize:10, marginBottom:4 }}>
                      • {t}
                    </div>
                  ))}
                </div>
              </div>

              <ChatPanel
                color="#ec4899"
                icon="🌐"
                title="Distributed Systems Interviewer"
                subtitle="CAP → Consensus → Failure modes → Trade-offs"
                placeholder="Explain your first instinct about the system failure..."
                chatMsgs={chatMsgs}
                chatLoading={chatLoading}
                chatEndRef={chatEndRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMsg={sendChatMsg}
              />
            </div>
          )}

          {/* Generic chat-only UI */}
          {isChatType && !isSpecialArchitectureType && iType !== 'voice' && (
            <div style={{ display:'flex', height:'100%' }}>
              <ChatPanel
                color={activeColor}
                icon={
                  iType === 'technical-screening' ? '📋'
                  : iType === 'ai-fluency' ? '🤖'
                  : iType === 'personalized' ? '📄'
                  : iType === 'autonomous' ? '🧠'
                  : '🎙️'
                }
                title={
                  iType === 'technical-screening' ? 'Technical Screener'
                  : iType === 'ai-fluency' ? 'AI Fluency Interviewer'
                  : iType === 'personalized' ? 'Personalized Interviewer'
                  : iType === 'autonomous' ? 'Autonomous AI Interviewer'
                  : 'Behavioral Interviewer'
                }
                subtitle="Answer naturally. The interviewer will ask follow-ups."
                placeholder="Type your answer..."
                chatMsgs={chatMsgs}
                chatLoading={chatLoading}
                chatEndRef={chatEndRef}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChatMsg={sendChatMsg}
              />
            </div>
          )}

          {/* Coding / Frontend / System Design editor UI */}
          {!isChatType && (
            <div style={{ flex:1, display:'flex', minHeight:0 }}>
              <div style={{
                width:'36%',
                minWidth:320,
                background:'#0d1117',
                borderRight:'1px solid #1e2a3a',
                overflowY:'auto',
                padding:'20px',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <span style={{
                    background:`${activeColor}22`,
                    border:`1px solid ${activeColor}44`,
                    borderRadius:12,
                    padding:'2px 10px',
                    color:activeColor,
                    fontSize:10,
                    fontWeight:700,
                  }}>
                    {iType === 'frontend' ? '🖥️ FRONTEND' : iType === 'system-design' ? '🏗️ SYSTEM DESIGN' : '💻 CODING'}
                  </span>
                  {currentProblem.difficulty && (
                    <span style={{
                      background:({Easy:'#00c89622',Medium:'#f5c54222',Hard:'#ff4d4d22'})[currentProblem.difficulty] || '#88888822',
                      border:`1px solid ${({Easy:'#00c89644',Medium:'#f5c54244',Hard:'#ff4d4d44'})[currentProblem.difficulty] || '#88888844'}`,
                      borderRadius:12,
                      padding:'2px 10px',
                      color:({Easy:'#00c896',Medium:'#f5c542',Hard:'#ff4d4d'})[currentProblem.difficulty] || '#888',
                      fontSize:10,
                      fontWeight:700,
                    }}>
                      {currentProblem.difficulty}
                    </span>
                  )}
                </div>

                <h2 style={{ margin:'0 0 10px', fontSize:20, color:'#e8e8e8' }}>
                  {currentProblem.title}
                </h2>

                {currentProblem.description && (
                  <p style={{ color:'#aaa', fontSize:13, lineHeight:1.7 }}>
                    {currentProblem.description}
                  </p>
                )}

                {currentProblem.requirements?.length > 0 && (
                  <div style={{ marginTop:16 }}>
                    <div style={{ color:activeColor, fontSize:11, fontWeight:800, marginBottom:8 }}>
                      Requirements
                    </div>
                    {currentProblem.requirements.map((r, i) => (
                      <div key={i} style={{ color:'#888', fontSize:12, marginBottom:6, lineHeight:1.6 }}>
                        • {r}
                      </div>
                    ))}
                  </div>
                )}

                {currentProblem.examples?.length > 0 && (
                  <div style={{ marginTop:18 }}>
                    <div style={{ color:activeColor, fontSize:11, fontWeight:800, marginBottom:8 }}>
                      Examples
                    </div>
                    {currentProblem.examples.map((ex, i) => (
                      <div key={i} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:12, marginBottom:10 }}>
                        <div style={{ color:'#888', fontSize:12, marginBottom:4 }}>
                          <b>Input:</b> {ex.input}
                        </div>
                        <div style={{ color:'#888', fontSize:12, marginBottom:4 }}>
                          <b>Output:</b> {ex.output}
                        </div>
                        {ex.explanation && (
                          <div style={{ color:'#555', fontSize:11, lineHeight:1.5 }}>
                            {ex.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ flex:1, minWidth:0 }}>
                <CodeEditor
                  problem={currentProblem}
                  user={user}
                  onSolved={handleSolved}
                  tabSwitches={tabSwitches}
                  pasteCount={pasteCount}
                  mockInterview
                  aiAssistEnabled={session.aiAssistEnabled}
                  sessionId={session.sessionId}
                />
              </div>
            </div>
          )}
                    {/* Bottom navigation */}
          <div style={{
            height:54,
            background:'#0d1117',
            borderTop:'1px solid #1e2a3a',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            padding:'0 18px',
            flexShrink:0,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {session.problems?.map((p, i) => (
                <button
                  key={p.id || i}
                  onClick={() => {
                    setProbIdx(i);
                    setChatMsgs([]);
                    setChatInput('');
                    if (isChatType) {
                      setTimeout(() => askOpeningQuestion({ ...session, problems:[session.problems[i]] }), 200);
                    }
                  }}
                  style={{
                    width:30,
                    height:30,
                    borderRadius:'50%',
                    background:i === probIdx ? activeColor : solved.includes(p.id) ? '#00c896' : '#060910',
                    border:`1px solid ${i === probIdx ? activeColor : solved.includes(p.id) ? '#00c896' : '#1e2a3a'}`,
                    color:i === probIdx || solved.includes(p.id) ? '#fff' : '#555',
                    cursor:'pointer',
                    fontSize:12,
                    fontWeight:800,
                  }}
                >
                  {solved.includes(p.id) ? '✓' : i + 1}
                </button>
              ))}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button
                onClick={() => {
                  if (probIdx > 0) {
                    setProbIdx(i => i - 1);
                    setChatMsgs([]);
                    setChatInput('');
                  }
                }}
                disabled={probIdx === 0}
                style={{
                  background:'#060910',
                  border:'1px solid #1e2a3a',
                  borderRadius:8,
                  color:probIdx === 0 ? '#333' : '#888',
                  cursor:probIdx === 0 ? 'not-allowed' : 'pointer',
                  fontSize:12,
                  padding:'8px 12px',
                }}
              >
                ← Previous
              </button>

              <button
                onClick={nextProblem}
                style={{
                  background:`linear-gradient(135deg, ${activeColor}, ${activeColor}88)`,
                  border:'none',
                  borderRadius:8,
                  color:'#fff',
                  cursor:'pointer',
                  fontSize:12,
                  fontWeight:800,
                  padding:'8px 14px',
                }}
              >
                {probIdx < session.problems.length - 1 ? 'Next →' : 'Finish Interview'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared side panel for API / Cloud modes ───────────────────────────────────
function SideRequirementPanel({ color, icon, title, requirements = [], probeTitle, probes = [] }) {
  return (
    <div style={{
      width:240,
      borderRight:'1px solid #1e2a3a',
      padding:'18px 16px',
      overflowY:'auto',
      flexShrink:0,
      background:'#0d1117',
    }}>
      <div style={{ color, fontSize:12, fontWeight:900, marginBottom:6 }}>
        {icon} {title}
      </div>

      {requirements && requirements.length > 0 && (
        <div>
          <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:8, marginTop:12 }}>
            Requirements
          </div>
          {requirements.map((r, i) => (
            <div key={i} style={{ color:'#555', fontSize:11, marginBottom:7, display:'flex', gap:6, lineHeight:1.5 }}>
              <span style={{ color, flexShrink:0, marginTop:1 }}>→</span>
              {r}
            </div>
          ))}
        </div>
      )}

      {probes.length > 0 && (
        <div style={{ marginTop:14, background:`${color}08`, border:`1px solid ${color}22`, borderRadius:10, padding:10 }}>
          <div style={{ color, fontSize:9, fontWeight:700, marginBottom:6 }}>
            {probeTitle}
          </div>
          {probes.map(t => (
            <div key={t} style={{ color:'#555', fontSize:10, marginBottom:4 }}>
              • {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared chat panel ─────────────────────────────────────────────────────────
function ChatPanel({
  color,
  icon,
  title,
  subtitle,
  placeholder,
  chatMsgs,
  chatLoading,
  chatEndRef,
  chatInput,
  setChatInput,
  sendChatMsg,
}) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#0d1117' }}>
      <div style={{
        padding:'12px 16px',
        borderBottom:'1px solid #1e2a3a',
        display:'flex',
        alignItems:'center',
        gap:8,
        flexShrink:0,
      }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <div>
          <div style={{ color, fontSize:12, fontWeight:900 }}>{title}</div>
          <div style={{ color:'#444', fontSize:9 }}>{subtitle}</div>
        </div>
      </div>

      <div style={{
        flex:1,
        overflowY:'auto',
        padding:'12px 16px',
        display:'flex',
        flexDirection:'column',
        gap:8,
      }}>
        {chatMsgs.length === 0 && !chatLoading && (
          <div style={{ color:'#333', fontSize:12, textAlign:'center', padding:32 }}>
            {icon} Interviewer is ready. Start your answer.
          </div>
        )}

        {chatMsgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf:m.role === 'candidate' ? 'flex-end' : 'flex-start',
              maxWidth:'85%',
              background:m.role === 'candidate' ? `${color}22` : '#1e2a3a',
              border:`1px solid ${m.role === 'candidate' ? color + '44' : '#2a3645'}`,
              borderRadius:m.role === 'candidate' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              padding:'8px 12px',
              color:m.role === 'candidate' ? '#e8e8e8' : '#c8c8c8',
              fontSize:12,
              lineHeight:1.6,
            }}
          >
            {m.role === 'interviewer' && (
              <div style={{ color, fontSize:9, fontWeight:700, marginBottom:3 }}>
                {icon} INTERVIEWER
              </div>
            )}
            {m.text}
          </div>
        ))}

        {chatLoading && (
          <div style={{ color:'#444', fontSize:12, fontStyle:'italic' }}>
            {icon} Thinking...
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div style={{
        padding:'10px 14px',
        borderTop:'1px solid #1e2a3a',
        display:'flex',
        gap:6,
        background:'#0d1117',
        flexShrink:0,
      }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendChatMsg(); }}
          placeholder={placeholder}
          style={{
            flex:1,
            background:'#060910',
            border:'1px solid #1e2a3a',
            borderRadius:8,
            padding:'9px 12px',
            color:'#e8e8e8',
            fontSize:12,
            outline:'none',
          }}
        />
        <button
          onClick={sendChatMsg}
          disabled={chatLoading || !chatInput.trim()}
          style={{
            background:color,
            border:'none',
            borderRadius:8,
            color:'#fff',
            cursor:'pointer',
            fontSize:12,
            fontWeight:700,
            padding:'9px 16px',
            opacity:chatLoading || !chatInput.trim() ? 0.4 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
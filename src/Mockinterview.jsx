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
import ArrivalSequence from './ArrivalSequence';
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
function CompanySelector({ onStart, error }) {
  const [selected, setSelected] = useState('general');
  const [starting, setStarting] = useState(false);
  const [topics, setTopics] = useState([]);
  const [interviewType, setInterviewType] = useState('coding');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [realWorld, setRealWorld] = useState(false);
  const [aiAssistEnabled, setAiAssistEnabled] = useState(false);

  const config = CONFIGS[selected] || CONFIGS.general;

  const TYPES = [
    { id:'coding', icon:'💻', label:'Coding', desc:'DSA + live editor', tier:'Core' },
    { id:'system-design', icon:'🏗️', label:'System Design', desc:'Architecture round', tier:'Senior' },
    { id:'behavioral', icon:'🎙️', label:'Behavioral', desc:'STAR + HR pressure', tier:'HR' },
    { id:'technical-screening', icon:'📋', label:'Tech Screen', desc:'CS + resume scan', tier:'Fast' },
    { id:'frontend', icon:'🖥️', label:'Frontend', desc:'React + UI systems', tier:'UI' },
    { id:'ai-fluency', icon:'🤖', label:'AI Fluency', desc:'AI workflow skill', tier:'Future' },
    { id:'personalized', icon:'📄', label:'Personalized', desc:'JD-based questions', tier:'Custom' },
    { id:'voice', icon:'🎤', label:'Voice', desc:'Speak with AI', tier:'Live' },
    { id:'autonomous', icon:'🧠', label:'Autonomous AI', desc:'Adaptive full report', tier:'Elite' },
    { id:'ai-native', icon:'⚡', label:'AI-Native', desc:'Agent + multi-file', tier:'Elite' },
    { id:'db-debug', icon:'🗄️', label:'DB Debug', desc:'SQL + schema issues', tier:'Backend' },
    { id:'api-integration', icon:'🔌', label:'API Design', desc:'REST + auth + scale', tier:'Backend' },
    { id:'cloud-arch', icon:'☁️', label:'Cloud Arch', desc:'AWS/GCP/K8s', tier:'Cloud' },
    { id:'distributed-systems', icon:'🌐', label:'Distributed Sys', desc:'CAP + sharding', tier:'Staff' },
  ];

  const typeColors = {
    coding:'#a855f7',
    'system-design':'#38bdf8',
    behavioral:'#f59e0b',
    'technical-screening':'#10b981',
    frontend:'#f472b6',
    'ai-fluency':'#a78bfa',
    personalized:'#f59e0b',
    voice:'#ec4899',
    autonomous:'#00c896',
    'ai-native':'#06b6d4',
    'db-debug':'#06b6d4',
    'api-integration':'#f97316',
    'cloud-arch':'#8b5cf6',
    'distributed-systems':'#ec4899',
  };

  const activeColor = typeColors[interviewType] || config.color;
  const selectedType = TYPES.find(t => t.id === interviewType) || TYPES[0];

  const toggleTopic = (t) => {
    setTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const startInterview = async () => {
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
    ].includes(interviewType) ? interviewType : selected;

    await onStart(
      companyToSend,
      topics,
      interviewType,
      jdText,
      realWorld,
      aiAssistEnabled
    );

    setStarting(false);
  };

  const disabledStart = starting || (interviewType === 'personalized' && jdText.length < 50);

  return (
    <div className="mi-page" style={{ '--accent': activeColor }}>
      <style>{`
        .mi-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--accent) 25%, transparent), transparent 28%),
            radial-gradient(circle at 80% 0%, rgba(56,189,248,.16), transparent 32%),
            radial-gradient(circle at 50% 90%, rgba(168,85,247,.18), transparent 35%),
            linear-gradient(180deg, #050611 0%, #070816 45%, #03040a 100%);
          color: #eef2ff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 28px;
          overflow: hidden;
          position: relative;
        }

        .mi-page:before {
          content: "";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: radial-gradient(circle at center, black, transparent 78%);
          pointer-events: none;
        }

        .mi-shell {
          max-width: 1180px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .mi-hero {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .mi-glass {
          background: linear-gradient(180deg, rgba(15,23,42,.78), rgba(2,6,23,.72));
          border: 1px solid rgba(148,163,184,.16);
          box-shadow: 0 24px 80px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(22px);
          border-radius: 28px;
        }

        .mi-command {
          padding: 28px;
          min-height: 260px;
          position: relative;
          overflow: hidden;
        }

        .mi-command:after {
          content: "";
          position: absolute;
          width: 280px;
          height: 280px;
          right: -90px;
          top: -90px;
          background: var(--accent);
          filter: blur(85px);
          opacity: .24;
          border-radius: 999px;
        }

        .mi-badge {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          background: color-mix(in srgb, var(--accent) 16%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          color: color-mix(in srgb, var(--accent) 82%, white);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .mi-title {
          font-size: clamp(36px, 7vw, 76px);
          line-height: .9;
          letter-spacing: -0.08em;
          margin: 24px 0 14px;
          font-weight: 1000;
        }

        .mi-title span {
          background: linear-gradient(135deg, #fff, color-mix(in srgb, var(--accent) 70%, white));
          -webkit-background-clip: text;
          color: transparent;
        }

        .mi-sub {
          color: #94a3b8;
          max-width: 620px;
          font-size: 14px;
          line-height: 1.7;
          margin: 0;
        }

        .mi-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 22px;
        }

        .mi-stat {
          padding: 13px;
          border-radius: 18px;
          background: rgba(15,23,42,.72);
          border: 1px solid rgba(148,163,184,.14);
        }

        .mi-stat b {
          display: block;
          font-size: 18px;
          color: #fff;
        }

        .mi-stat small {
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .mi-holo {
          padding: 22px;
          position: relative;
          overflow: hidden;
        }

        .mi-orb {
          height: 180px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 35% 30%, white, color-mix(in srgb, var(--accent) 65%, white) 10%, var(--accent) 38%, transparent 68%);
          filter: drop-shadow(0 0 45px color-mix(in srgb, var(--accent) 55%, transparent));
          opacity: .92;
          animation: floatOrb 4s ease-in-out infinite;
        }

        @keyframes floatOrb {
          0%,100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.04); }
        }

        .mi-panel-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 22px 0 12px;
        }

        .mi-panel-title h2 {
          margin: 0;
          font-size: 15px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #cbd5e1;
        }

        .mi-panel-title span {
          color: var(--accent);
          font-size: 11px;
          font-weight: 900;
        }

        .mi-type-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        .mi-type-card, .mi-company-card, .mi-toggle, .mi-chip {
          transition: .22s ease;
        }

        .mi-type-card {
          min-height: 112px;
          border-radius: 22px;
          padding: 14px;
          background: rgba(15,23,42,.7);
          border: 1px solid rgba(148,163,184,.13);
          color: #94a3b8;
          cursor: pointer;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .mi-type-card.active {
          color: #fff;
          border-color: color-mix(in srgb, var(--accent) 58%, transparent);
          background:
            linear-gradient(180deg, color-mix(in srgb, var(--accent) 20%, transparent), rgba(15,23,42,.74));
          box-shadow: 0 0 42px color-mix(in srgb, var(--accent) 22%, transparent);
          transform: translateY(-3px);
        }

        .mi-type-card:hover, .mi-company-card:hover, .mi-toggle:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, var(--accent) 42%, transparent);
        }

        .mi-type-icon {
          font-size: 22px;
          margin-bottom: 10px;
        }

        .mi-type-label {
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 4px;
        }

        .mi-type-desc {
          font-size: 10px;
          color: #64748b;
          line-height: 1.4;
        }

        .mi-tier {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 8px;
          font-weight: 900;
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
          padding: 3px 6px;
          border-radius: 999px;
        }

        .mi-company-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .mi-company-card {
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(15,23,42,.72);
          color: #e2e8f0;
          border-radius: 24px;
          padding: 18px 12px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .mi-company-card.active {
          border-color: var(--company);
          box-shadow: 0 0 36px color-mix(in srgb, var(--company) 26%, transparent);
          background: linear-gradient(180deg, color-mix(in srgb, var(--company) 18%, transparent), rgba(15,23,42,.8));
        }

        .mi-company-logo {
          font-size: 30px;
          margin-bottom: 10px;
        }

        .mi-company-name {
          font-size: 13px;
          font-weight: 950;
        }

        .mi-company-time {
          font-size: 10px;
          color: #64748b;
          margin-top: 3px;
        }

        .mi-layout {
          display: grid;
          grid-template-columns: 1.4fr .75fr;
          gap: 18px;
          margin-top: 18px;
        }

        .mi-card {
          padding: 20px;
        }

        .mi-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mi-chip {
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(15,23,42,.72);
          color: #94a3b8;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .mi-chip.active {
          background: color-mix(in srgb, var(--accent) 16%, transparent);
          border-color: color-mix(in srgb, var(--accent) 48%, transparent);
          color: #fff;
          box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 18%, transparent);
        }

        .mi-toggle {
          width: 100%;
          border: 1px solid rgba(148,163,184,.14);
          background: rgba(15,23,42,.72);
          color: #e2e8f0;
          border-radius: 22px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          margin-bottom: 12px;
          text-align: left;
        }

        .mi-switch {
          width: 46px;
          height: 26px;
          background: #1e293b;
          border-radius: 999px;
          position: relative;
          flex-shrink: 0;
        }

        .mi-switch.on {
          background: var(--accent);
          box-shadow: 0 0 25px color-mix(in srgb, var(--accent) 36%, transparent);
        }

        .mi-switch i {
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 999px;
          top: 3px;
          left: 3px;
          transition: .22s ease;
        }

        .mi-switch.on i {
          left: 23px;
        }

        .mi-feature-box {
          border: 1px solid color-mix(in srgb, var(--accent) 32%, transparent);
          background: color-mix(in srgb, var(--accent) 9%, transparent);
          border-radius: 24px;
          padding: 18px;
          margin-bottom: 14px;
        }

        .mi-feature-box h3 {
          margin: 0 0 8px;
          color: color-mix(in srgb, var(--accent) 82%, white);
          font-size: 17px;
        }

        .mi-feature-box p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.7;
        }

        .mi-textarea {
          width: 100%;
          min-height: 160px;
          resize: vertical;
          box-sizing: border-box;
          border-radius: 18px;
          padding: 14px;
          background: rgba(2,6,23,.8);
          color: #e2e8f0;
          border: 1px solid rgba(148,163,184,.18);
          outline: none;
          font-size: 12px;
          line-height: 1.7;
        }

        .mi-start {
          width: 100%;
          border: none;
          border-radius: 24px;
          padding: 18px;
          cursor: pointer;
          color: white;
          font-size: 16px;
          font-weight: 1000;
          background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #ffffff));
          box-shadow: 0 0 42px color-mix(in srgb, var(--accent) 36%, transparent);
          margin-top: 14px;
        }

        .mi-start:disabled {
          opacity: .45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .mi-error {
          color: #fecaca;
          background: rgba(239,68,68,.12);
          border: 1px solid rgba(239,68,68,.35);
          padding: 12px 14px;
          border-radius: 18px;
          font-size: 12px;
          margin-top: 12px;
        }

        @media (max-width: 980px) {
          .mi-hero, .mi-layout { grid-template-columns: 1fr; }
          .mi-type-grid { grid-template-columns: repeat(2, 1fr); }
          .mi-company-grid { grid-template-columns: repeat(2, 1fr); }
          .mi-page { padding: 16px; }
        }
      `}</style>

      <div className="mi-shell">
        <div className="mi-hero">
          <motion.div
            className="mi-glass mi-command"
            initial={{ opacity:0, y:22 }}
            animate={{ opacity:1, y:0 }}
          >
            <div className="mi-badge">🎯 AI Interview Chamber</div>
            <h1 className="mi-title">
              Crack the <span>{selectedType.label}</span> round.
            </h1>
            <p className="mi-sub">
              A cinematic mock interview room with company-specific pressure, AI observation,
              real-world mode, tracked AI assistance, voice rounds, and hiring-report style feedback.
            </p>

            <div className="mi-stats">
              <div className="mi-stat">
                <b>{selectedType.icon} {selectedType.tier}</b>
                <small>Interview mode</small>
              </div>
              <div className="mi-stat">
                <b>{interviewType === 'coding' ? config.duration : interviewType.includes('cloud') || interviewType.includes('distributed') ? 60 : 45} min</b>
                <small>Pressure timer</small>
              </div>
              <div className="mi-stat">
                <b>{aiAssistEnabled ? 'Tracked' : 'Clean'}</b>
                <small>AI usage</small>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="mi-glass mi-holo"
            initial={{ opacity:0, y:22 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay:.08 }}
          >
            <div className="mi-badge">LIVE SIMULATION</div>
            <div className="mi-orb" />
            <div className="mi-feature-box" style={{ marginBottom:0 }}>
              <h3>{selectedType.icon} {selectedType.label} Round</h3>
              <p>{selectedType.desc}. Current theme is powered by {interviewType === 'coding' ? config.company : selectedType.label} mode.</p>
            </div>
          </motion.div>
        </div>

        <div className="mi-panel-title">
          <h2>Choose Interview Arena</h2>
          <span>{TYPES.length} modes unlocked</span>
        </div>

        <div className="mi-type-grid">
          {TYPES.map(t => (
            <button
              key={t.id}
              className={`mi-type-card ${interviewType === t.id ? 'active' : ''}`}
              onClick={() => setInterviewType(t.id)}
            >
              <span className="mi-tier">{t.tier}</span>
              <div className="mi-type-icon">{t.icon}</div>
              <div className="mi-type-label">{t.label}</div>
              <div className="mi-type-desc">{t.desc}</div>
            </button>
          ))}
        </div>

        {interviewType === 'coding' && (
          <>
            <div className="mi-panel-title">
              <h2>Select Company Battle</h2>
              <span>{config.company} selected</span>
            </div>

            <div className="mi-company-grid">
              {Object.entries(CONFIGS).map(([key, c]) => (
                <button
                  key={key}
                  className={`mi-company-card ${selected === key ? 'active' : ''}`}
                  style={{ '--company': c.color }}
                  onClick={() => setSelected(key)}
                >
                  <div className="mi-company-logo">{c.logo}</div>
                  <div className="mi-company-name" style={{ color:selected === key ? c.color : '#e2e8f0' }}>
                    {c.company}
                  </div>
                  <div className="mi-company-time">{c.duration} min • {key === 'microsoft' ? 3 : 2} problems</div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mi-layout">
          <div className="mi-glass mi-card">
            {interviewType === 'coding' && (
              <>
                <div className="mi-panel-title" style={{ marginTop:0 }}>
                  <h2>Focus Topics</h2>
                  <span>{topics.length || 'Optional'}</span>
                </div>

                <div className="mi-chips">
                  {TOPICS.map(t => (
                    <button
                      key={t}
                      className={`mi-chip ${topics.includes(t) ? 'active' : ''}`}
                      onClick={() => toggleTopic(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {interviewType === 'personalized' && (
              <>
                <div className="mi-feature-box">
                  <h3>📄 JD Scanner Mode</h3>
                  <p>Paste a job description. The AI will turn it into a role-specific interview with targeted questions.</p>
                </div>

                <textarea
                  className="mi-textarea"
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  placeholder="Paste full job description here..."
                />

                <label className="mi-toggle" style={{ marginTop:12 }}>
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
                          setJdText(`[File: ${file.name}] Please paste the JD text here for best results.`);
                        }
                      } finally {
                        setJdLoading(false);
                      }
                    }}
                  />
                  <div>
                    <b>{jdLoading ? 'Reading file...' : jdFile ? `✓ ${jdFile.name}` : '📎 Upload JD file'}</b>
                    <div style={{ color:'#64748b', fontSize:11, marginTop:3 }}>
                      TXT works directly. PDF/DOC should also be pasted.
                    </div>
                  </div>
                </label>
              </>
            )}

            {interviewType !== 'coding' && interviewType !== 'personalized' && (
              <div className="mi-feature-box">
                <h3>{selectedType.icon} {selectedType.label} Interview</h3>
                <p>
                  This mode creates a focused {selectedType.label.toLowerCase()} simulation with adaptive AI probing,
                  timed pressure, live notes, and a final hiring-style performance report.
                </p>
              </div>
            )}

            <div className="mi-panel-title">
              <h2>Interview Boosters</h2>
              <span>Optional</span>
            </div>

            {interviewType === 'coding' && (
              <button className="mi-toggle" onClick={() => setRealWorld(r => !r)}>
                <div>
                  <b>🌍 Real-World Mode</b>
                  <div style={{ color:'#64748b', fontSize:11, marginTop:3 }}>
                    Fresh company-style problems generated on demand.
                  </div>
                </div>
                <div className={`mi-switch ${realWorld ? 'on' : ''}`}><i /></div>
              </button>
            )}

            <button className="mi-toggle" onClick={() => setAiAssistEnabled(a => !a)}>
              <div>
                <b>✨ AI-Assisted IDE</b>
                <div style={{ color:'#64748b', fontSize:11, marginTop:3 }}>
                  AI usage gets tracked in the final report.
                </div>
              </div>
              <div className={`mi-switch ${aiAssistEnabled ? 'on' : ''}`}><i /></div>
            </button>

            {error && <div className="mi-error">⚠ {error}</div>}

            <button
              className="mi-start"
              disabled={disabledStart}
              onClick={startInterview}
            >
              {starting
                ? '⏳ Building interview room...'
                : interviewType === 'personalized' && jdText.length < 50
                  ? '📄 Paste job description first'
                  : `🚀 Start ${selectedType.label} Interview`}
            </button>
          </div>

          <div className="mi-glass mi-card">
            <div className="mi-panel-title" style={{ marginTop:0 }}>
              <h2>Session Preview</h2>
              <span>AI Ready</span>
            </div>

            {[
              ['Mode', `${selectedType.icon} ${selectedType.label}`],
              ['Company', interviewType === 'coding' ? config.company : 'Adaptive'],
              ['Timer', interviewType === 'coding' ? `${config.duration} min` : 'Adaptive'],
              ['Problems', interviewType === 'coding' ? `${selected === 'microsoft' ? 3 : 2}` : 'AI-generated'],
              ['Topics', topics.length ? topics.join(', ') : 'Mixed'],
              ['AI IDE', aiAssistEnabled ? 'Enabled + tracked' : 'Disabled'],
              ['Real World', realWorld ? 'Enabled' : 'Disabled'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display:'flex',
                  justifyContent:'space-between',
                  gap:14,
                  padding:'13px 0',
                  borderBottom:'1px solid rgba(148,163,184,.11)',
                  fontSize:12,
                }}
              >
                <span style={{ color:'#64748b', fontWeight:800 }}>{k}</span>
                <span style={{ color:'#e2e8f0', fontWeight:900, textAlign:'right' }}>{v}</span>
              </div>
            ))}
            <div className="mi-feature-box" style={{ marginTop:18, marginBottom:0 }}>
             <h3>🛡️ Interview Protocol</h3>
              <p>
              Your session will track timer, answers, AI usage, problem progress,
              and final hiring-readiness score.
            </p>
          </div>
          </div>
        </div>
      </div>
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
      setPhase('arrival')

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

if (phase === 'arrival') {
  return (
    <ArrivalSequence
      company={company}
      config={CONFIGS[company] || CONFIGS.general}
      interviewType={session?.interviewType}
      userName={userData?.displayName || user?.displayName || 'Candidate'}
      sessionId={session?.sessionId}
      onEnterInterview={() => setPhase('interview')}
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
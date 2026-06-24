import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Team member display data (mirrors backend) ────────────────────────────────
const TEAM_MEMBERS = {
  maya:   { id:'maya',   name:'Maya Chen',     role:'Tech Lead',        emoji:'👩‍💻', color:'#a855f7' },
  raj:    { id:'raj',    name:'Raj Patel',      role:'Senior Engineer',  emoji:'👨‍💻', color:'#1a73e8' },
  alex:   { id:'alex',   name:'Alex Kim',       role:'Junior Dev',       emoji:'🧑‍💻', color:'#00c896' },
  jordan: { id:'jordan', name:'Jordan Mills',   role:'Product Manager',  emoji:'📊',  color:'#f59e0b' },
  priya:  { id:'priya',  name:'Priya Nair',     role:'SRE / DevOps',     emoji:'⚙️',  color:'#f97316' },
};

const DIFF_COLORS = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };

function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
}

// ── Scenario Selector ─────────────────────────────────────────────────────────
function ScenarioSelector({ onStart, loading }) {
  const [scenarios,    setScenarios]    = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/team-sim/scenarios`)
      .then(r => { setScenarios(r.data.scenarios || []); setFetchLoading(false); })
      .catch(() => setFetchLoading(false));
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 24px', overflowY:'auto' }}>
      <div style={{ maxWidth:820, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>👥</div>
          <h1 style={{ margin:'0 0 8px', fontSize:30, fontWeight:900, color:'#e8e8e8' }}>Team Simulation</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>
            Work with an AI-powered engineering team. Real decisions. Real dynamics. Real feedback.
          </p>
        </div>

        {/* Scenario grid */}
        {fetchLoading ? (
          <div style={{ textAlign:'center', color:'#444', padding:40 }}>Loading scenarios...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:14, marginBottom:32 }}>
            {scenarios.map(s => (
              <motion.div
                key={s.id}
                whileHover={{ scale:1.02 }}
                whileTap={{ scale:0.98 }}
                onClick={() => setSelected(s.id === selected ? null : s.id)}
                style={{
                  background:selected===s.id ? `${s.color}18` : '#0d1117',
                  border:`1px solid ${selected===s.id ? s.color+'66' : '#1e2a3a'}`,
                  borderRadius:16,
                  padding:'18px 20px',
                  cursor:'pointer',
                  transition:'all 0.15s',
                  boxShadow:selected===s.id ? `0 0 24px ${s.color}22` : 'none',
                  position:'relative',
                  overflow:'hidden',
                }}
              >
                {selected===s.id && (
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
                )}

                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:26 }}>{s.emoji}</span>
                    <div>
                      <div style={{ color:selected===s.id ? s.color : '#e8e8e8', fontWeight:800, fontSize:14 }}>{s.title}</div>
                      <div style={{ color:'#444', fontSize:10, marginTop:2 }}>{s.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                    <span style={{
                      background:(DIFF_COLORS[s.difficulty]||'#888')+'22',
                      border:`1px solid ${(DIFF_COLORS[s.difficulty]||'#888')}44`,
                      color:DIFF_COLORS[s.difficulty]||'#888',
                      borderRadius:10, padding:'2px 8px', fontSize:9, fontWeight:700,
                    }}>{s.difficulty}</span>
                    <span style={{ color:'#444', fontSize:9 }}>⏱ {s.duration} min</span>
                  </div>
                </div>

                <p style={{ color:'#666', fontSize:11, lineHeight:1.6, margin:'0 0 12px' }}>
                  {s.context.slice(0, 130)}...
                </p>

                {/* Team avatars */}
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ color:'#444', fontSize:10 }}>Team:</span>
                  {(s.teamComposition || []).map(id => {
                    const m = TEAM_MEMBERS[id];
                    return m ? (
                      <div key={id} title={`${m.name} · ${m.role}`}
                        style={{ width:24, height:24, borderRadius:'50%', background:`${m.color}22`, border:`1px solid ${m.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>
                        {m.emoji}
                      </div>
                    ) : null;
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Start button */}
        <motion.button
          whileHover={{ scale:selected ? 1.02 : 1 }}
          whileTap={{ scale:selected ? 0.98 : 1 }}
          onClick={() => selected && onStart(selected)}
          disabled={!selected || loading}
          style={{
            width:'100%',
            background:selected ? `linear-gradient(135deg, ${scenarios.find(s=>s.id===selected)?.color || '#a855f7'}, ${scenarios.find(s=>s.id===selected)?.color || '#a855f7'}88)` : '#0d1117',
            border:`1px solid ${selected ? 'transparent' : '#1e2a3a'}`,
            borderRadius:14,
            color:selected ? '#fff' : '#333',
            cursor:selected && !loading ? 'pointer' : 'not-allowed',
            fontSize:16,
            fontWeight:900,
            padding:'16px 0',
            boxShadow:selected ? `0 0 30px ${scenarios.find(s=>s.id===selected)?.color || '#a855f7'}44` : 'none',
            transition:'all 0.2s',
          }}
        >
          {loading ? '⏳ Assembling your team...' : selected ? `👥 Join the Simulation` : 'Select a Scenario'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isNew }) {
  const isUser = msg.type === 'user';
  const member = !isUser && TEAM_MEMBERS[msg.from];

  return (
    <motion.div
      initial={isNew ? { opacity:0, y:10 } : { opacity:1, y:0 }}
      animate={{ opacity:1, y:0 }}
      transition={{ duration:0.2 }}
      style={{
        display:'flex',
        alignItems:'flex-end',
        gap:8,
        justifyContent:isUser ? 'flex-end' : 'flex-start',
        marginBottom:10,
      }}
    >
      {!isUser && member && (
        <div style={{
          width:32, height:32, borderRadius:'50%', flexShrink:0,
          background:`${member.color}22`, border:`1px solid ${member.color}55`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
        }}>
          {member.emoji}
        </div>
      )}

      <div style={{ maxWidth:'72%' }}>
        {!isUser && member && (
          <div style={{ color:member.color, fontSize:10, fontWeight:700, marginBottom:3, marginLeft:2 }}>
            {member.name} · {member.role}
          </div>
        )}
        <div style={{
          background:isUser ? '#a855f722' : '#1e2a3a',
          border:`1px solid ${isUser ? '#a855f744' : '#2a3645'}`,
          borderRadius:isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          padding:'9px 13px',
          color:isUser ? '#e8e8e8' : '#c8c8c8',
          fontSize:13,
          lineHeight:1.65,
        }}>
          {msg.text}
        </div>
      </div>

      {isUser && (
        <div style={{
          width:32, height:32, borderRadius:'50%', flexShrink:0,
          background:'#a855f722', border:'1px solid #a855f744',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#a855f7',
        }}>
          You
        </div>
      )}
    </motion.div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ member }) {
  if (!member) return null;
  return (
    <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
      style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
      <div style={{ width:28, height:28, borderRadius:'50%', background:`${member.color}22`, border:`1px solid ${member.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
        {member.emoji}
      </div>
      <div style={{ background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:'14px 14px 14px 4px', padding:'8px 14px', display:'flex', gap:4 }}>
        {[0,1,2].map(i => (
          <motion.div key={i}
            animate={{ y:[0,-4,0] }}
            transition={{ duration:0.6, delay:i*0.15, repeat:Infinity }}
            style={{ width:5, height:5, borderRadius:'50%', background:member.color, opacity:0.7 }}
          />
        ))}
      </div>
      <span style={{ color:'#444', fontSize:10 }}>{member.name} is typing...</span>
    </motion.div>
  );
}

// ── Team Simulation Screen ────────────────────────────────────────────────────
function SimulationScreen({ session, user, onComplete }) {
  const [messages,    setMessages]    = useState(session.messages || []);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [typingWho,   setTypingWho]   = useState(null);
  const [remaining,   setRemaining]   = useState((session.duration || 20) * 60);
  const [newMsgIds,   setNewMsgIds]   = useState(new Set());
  const chatEndRef = useRef(null);
  const timerRef   = useRef(null);
  const inputRef   = useRef(null);

  const scenario = session.scenario;
  const team     = (session.team || []).map(t => TEAM_MEMBERS[t.id] || TEAM_MEMBERS[t] || t);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); onComplete(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, typingWho]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Optimistically add user message
    const userMsg = {
      id: `opt-user-${Date.now()}`,
      from: 'user', type: 'user',
      text, timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setNewMsgIds(prev => new Set([...prev, userMsg.id]));

    // Pick a random teammate to show typing
    const teamComp = scenario.teamComposition || [];
    const typingMember = TEAM_MEMBERS[teamComp[Math.floor(Math.random() * teamComp.length)]];
    setTypingWho(typingMember);

    try {
      const res = await axios.post(`${API_BASE}/team-sim/${session.sessionId}/message`, {
        userId: user?.uid, text,
      });

      setTypingWho(null);

      if (res.data.messages) {
        // Filter out the user message (already shown) and add teammate responses
        const teammateResponses = res.data.messages.filter(m => m.type === 'teammate');
        const ids = new Set(teammateResponses.map(m => m.id));
        setNewMsgIds(prev => new Set([...prev, ...ids]));

        // Stagger teammate responses for realism
        for (let i = 0; i < teammateResponses.length; i++) {
          await new Promise(r => setTimeout(r, i === 0 ? 300 : 700));
          setMessages(prev => [...prev, teammateResponses[i]]);
          if (i < teammateResponses.length - 1) {
            const nextMember = TEAM_MEMBERS[teammateResponses[i + 1]?.from];
            if (nextMember) setTypingWho(nextMember);
            await new Promise(r => setTimeout(r, 500));
            setTypingWho(null);
          }
        }
      }
    } catch (e) {
      console.error('Send message error:', e);
      setTypingWho(null);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, session.sessionId, user?.uid, scenario.teamComposition]);

  return (
    <div style={{ height:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ height:56, background:'#0d1117', borderBottom:'1px solid #1e2a3a', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:`${scenario.color}18`, border:`1px solid ${scenario.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
            {scenario.emoji}
          </div>
          <div>
            <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:800 }}>{scenario.title}</div>
            <div style={{ color:'#555', fontSize:10 }}>{scenario.subtitle}</div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Team avatars in header */}
          <div style={{ display:'flex', gap:4 }}>
            {team.map(m => m ? (
              <div key={m.id} title={`${m.name} · ${m.role}`}
                style={{ width:28, height:28, borderRadius:'50%', background:`${m.color}22`, border:`1px solid ${m.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                {m.emoji}
              </div>
            ) : null)}
          </div>

          <div style={{
            background:remaining < 300 ? '#ff4d4d22' : '#060910',
            border:`1px solid ${remaining < 300 ? '#ff4d4d55' : '#1e2a3a'}`,
            borderRadius:10, padding:'7px 12px',
            color:remaining < 300 ? '#ff4d4d' : '#e8e8e8',
            fontSize:13, fontWeight:900, fontFamily:'monospace',
          }}>
            ⏱ {formatTime(remaining)}
          </div>

          <button onClick={onComplete}
            style={{ background:`linear-gradient(135deg, ${scenario.color}, ${scenario.color}88)`, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:12, fontWeight:800, padding:'8px 14px' }}>
            End Sprint
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>

        {/* Left panel — scenario + team */}
        <div style={{ width:260, borderRight:'1px solid #1e2a3a', padding:'18px 16px', overflowY:'auto', flexShrink:0, background:'#0d1117' }}>

          <div style={{ marginBottom:18 }}>
            <div style={{ color:scenario.color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>📋 SCENARIO</div>
            <p style={{ color:'#666', fontSize:11, lineHeight:1.7, margin:0 }}>{scenario.context}</p>
          </div>

          <div style={{ marginBottom:18, background:`${scenario.color}08`, border:`1px solid ${scenario.color}22`, borderRadius:10, padding:12 }}>
            <div style={{ color:scenario.color, fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>🎯 YOUR OBJECTIVE</div>
            <p style={{ color:'#888', fontSize:11, lineHeight:1.6, margin:0 }}>{scenario.objective}</p>
          </div>

          <div>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>👥 YOUR TEAM</div>
            {team.map(m => m ? (
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:`${m.color}22`, border:`1px solid ${m.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
                  {m.emoji}
                </div>
                <div>
                  <div style={{ color:'#e8e8e8', fontSize:11, fontWeight:700 }}>{m.name}</div>
                  <div style={{ color:m.color, fontSize:9 }}>{m.role}</div>
                </div>
              </div>
            ) : null)}
          </div>

          <div style={{ marginTop:16, padding:'10px 12px', background:'#060910', borderRadius:10, border:'1px solid #1e2a3a' }}>
            <div style={{ color:'#333', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>💡 TIP</div>
            <div style={{ color:'#3a4a5a', fontSize:10, lineHeight:1.6 }}>Ask questions, push back on bad ideas, own decisions. Your team is watching how you lead.</div>
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>

          <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:2 }}>
            {messages.map(msg => (
              <MessageBubble key={msg.id} msg={msg} isNew={newMsgIds.has(msg.id)} />
            ))}
            <AnimatePresence>
              {typingWho && <TypingIndicator key="typing" member={typingWho} />}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding:'12px 16px', borderTop:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Reply to your team... (Enter to send, Shift+Enter for new line)"
                rows={2}
                style={{
                  flex:1,
                  background:'#060910',
                  border:`1px solid ${input.trim() ? scenario.color + '44' : '#1e2a3a'}`,
                  borderRadius:10,
                  padding:'10px 13px',
                  color:'#e8e8e8',
                  fontSize:13,
                  outline:'none',
                  resize:'none',
                  lineHeight:1.5,
                  fontFamily:'Arial, sans-serif',
                  transition:'border-color 0.15s',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  background:input.trim() && !sending ? `linear-gradient(135deg, ${scenario.color}, ${scenario.color}88)` : '#1e2a3a',
                  border:'none',
                  borderRadius:10,
                  color:input.trim() && !sending ? '#fff' : '#333',
                  cursor:input.trim() && !sending ? 'pointer' : 'not-allowed',
                  fontSize:12,
                  fontWeight:700,
                  padding:'0 18px',
                  height:58,
                  transition:'all 0.15s',
                  flexShrink:0,
                }}
              >
                {sending ? '...' : 'Send →'}
              </button>
            </div>
            <div style={{ color:'#2a3645', fontSize:10, marginTop:6, textAlign:'right' }}>
              Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ report, scenario, session, onRedo, onHome }) {
  const color = scenario?.color || '#a855f7';
  const verdictColors = {
    'Exceptional Leader':'#00c896', 'Strong Collaborator':'#a855f7',
    'Good Team Player':'#1a73e8',   'Needs Development':'#f5c542',
  };
  const verdictColor = verdictColors[report?.verdict] || color;

  const scoreItems = [
    { label:'Collaboration', value:report?.collaborationScore, color:'#a855f7' },
    { label:'Leadership',    value:report?.leadershipScore,    color:'#f59e0b' },
    { label:'Technical',     value:report?.technicalScore,     color:'#1a73e8' },
    { label:'Communication', value:report?.communicationScore, color:'#00c896' },
  ];

  const teamComposition = scenario?.teamComposition || [];

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 16px', overflowY:'auto' }}>
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        style={{ maxWidth:680, margin:'0 auto', background:'#0d1117', border:`1px solid ${color}44`, borderRadius:20, padding:'36px', boxShadow:`0 0 40px ${color}22` }}>

        {/* Top */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>👥</div>
          <h2 style={{ margin:'0 0 4px', color:'#e8e8e8', fontSize:22, fontWeight:900 }}>Sprint Complete</h2>
          <p style={{ color:'#555', margin:0, fontSize:13 }}>{scenario?.title}</p>
        </div>

        {/* Verdict + overall score */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:28 }}>
          <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:150, delay:0.2 }}
            style={{ width:86, height:86, borderRadius:'50%', background:verdictColor+'22', border:`3px solid ${verdictColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
            <span style={{ color:verdictColor, fontSize:22, fontWeight:900 }}>{report?.overallScore}</span>
            <span style={{ color:verdictColor, fontSize:8, fontWeight:700, textTransform:'uppercase' }}>Overall</span>
          </motion.div>
          <div>
            <div style={{ color:verdictColor, fontWeight:900, fontSize:18 }}>{report?.verdict}</div>
            <div style={{ color:'#555', fontSize:12, marginTop:3 }}>Team Simulation Rating</div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ marginBottom:24 }}>
          <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 Dimension Scores</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {scoreItems.map(s => (
              <div key={s.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'#888', fontSize:11 }}>{s.label}</span>
                  <span style={{ color:s.color, fontSize:11, fontWeight:700 }}>{s.value}</span>
                </div>
                <div style={{ height:6, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
                  <motion.div
                    initial={{ width:0 }}
                    animate={{ width:`${s.value || 0}%` }}
                    transition={{ duration:0.8, delay:0.3 }}
                    style={{ height:'100%', background:`linear-gradient(90deg, ${s.color}88, ${s.color})`, borderRadius:3 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {report?.summary && (
          <div style={{ background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
            <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>🤖 Manager's Take</div>
            <div style={{ color:'#c8c8c8', fontSize:13, lineHeight:1.7 }}>{report.summary}</div>
          </div>
        )}

        {/* Key moment */}
        {report?.keyMoment && (
          <div style={{ background:`${color}08`, border:`1px solid ${color}22`, borderRadius:12, padding:'12px 16px', marginBottom:20 }}>
            <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>⚡ Key Moment</div>
            <div style={{ color:'#aaa', fontSize:12, lineHeight:1.6, fontStyle:'italic' }}>"{report.keyMoment}"</div>
          </div>
        )}

        {/* Strengths & improvements */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          <div style={{ background:'#00c89608', border:'1px solid #00c89622', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ color:'#00c896', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>✓ Strengths</div>
            {(report?.strengths || []).map((s, i) => (
              <div key={i} style={{ color:'#888', fontSize:11, marginBottom:6, display:'flex', gap:6, lineHeight:1.5 }}>
                <span style={{ color:'#00c896', flexShrink:0 }}>•</span>{s}
              </div>
            ))}
          </div>
          <div style={{ background:'#f5c54208', border:'1px solid #f5c54222', borderRadius:12, padding:'12px 14px' }}>
            <div style={{ color:'#f5c542', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>↑ Improve</div>
            {(report?.improvements || []).map((s, i) => (
              <div key={i} style={{ color:'#888', fontSize:11, marginBottom:6, display:'flex', gap:6, lineHeight:1.5 }}>
                <span style={{ color:'#f5c542', flexShrink:0 }}>•</span>{s}
              </div>
            ))}
          </div>
        </div>

        {/* Team feedback */}
        {report?.teamFeedback && teamComposition.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
              💬 Your Team's Feedback
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {teamComposition.map(id => {
                const member  = TEAM_MEMBERS[id];
                const fbText  = report.teamFeedback?.[id];
                if (!member || !fbText) return null;
                return (
                  <div key={id} style={{ background:'#0d1117', border:`1px solid ${member.color}22`, borderRadius:10, padding:'10px 12px', display:'flex', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:`${member.color}22`, border:`1px solid ${member.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                      {member.emoji}
                    </div>
                    <div>
                      <div style={{ color:member.color, fontSize:10, fontWeight:700, marginBottom:3 }}>{member.name} · {member.role}</div>
                      <div style={{ color:'#888', fontSize:11, lineHeight:1.5 }}>{fbText}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRedo}
            style={{ flex:1, background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:10, color:'#888', cursor:'pointer', fontSize:13, fontWeight:600, padding:'10px 0' }}>
            Try Another Scenario
          </button>
          <button onClick={onHome}
            style={{ flex:1, background:`linear-gradient(135deg, ${color}, ${color}88)`, border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 0' }}>
            Back to World →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main TeamSimulation ───────────────────────────────────────────────────────
export default function TeamSimulation({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [phase,   setPhase]   = useState('select');   // select | sim | result
  const [session, setSession] = useState(null);
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const startSim = async (scenarioId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/team-sim/start`, {
        userId: user?.uid,
        scenarioId,
      });
      if (!res.data.success) throw new Error(res.data.error || 'Failed to start');
      setSession(res.data);
      setPhase('sim');
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Could not start simulation');
    } finally {
      setLoading(false);
    }
  };

  const completeSim = async () => {
    if (!session?.sessionId) return;
    try {
      const res = await axios.post(`${API_BASE}/team-sim/${session.sessionId}/complete`, {
        userId: user?.uid,
      });
      if (res.data.success) {
        setReport(res.data.report);
        setPhase('result');

        // Update local XP
        if (setUserData && res.data.report?.overallScore > 0) {
          const xp = Math.round(res.data.report.overallScore * 0.3);
          setUserData(prev => ({ ...(prev || {}), xp: ((prev || {}).xp || 0) + xp }));
        }
      }
    } catch (e) {
      console.error('Complete sim error:', e);
      // Still show result screen even if report fails
      setReport({ verdict:'Good Team Player', overallScore:70, summary:'Simulation complete.', strengths:[], improvements:[], teamFeedback:{} });
      setPhase('result');
    }
  };

  const reset = () => {
    setPhase('select');
    setSession(null);
    setReport(null);
    setError(null);
  };

  if (phase === 'select') {
    return (
      <>
        {error && (
          <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#ff4d4d22', border:'1px solid #ff4d4d44', borderRadius:10, padding:'10px 20px', color:'#ff6b6b', fontSize:13, zIndex:999 }}>
            ⚠ {error}
          </div>
        )}
        <ScenarioSelector onStart={startSim} loading={loading} />
      </>
    );
  }

  if (phase === 'sim' && session) {
    return <SimulationScreen session={session} user={user} onComplete={completeSim} />;
  }

  if (phase === 'result' && report) {
    return (
      <ResultScreen
        report={report}
        scenario={session?.scenario}
        session={session}
        onRedo={reset}
        onHome={() => navigate('/world')}
      />
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', color:'#e8e8e8', fontFamily:'Arial, sans-serif' }}>
      Loading...
    </div>
  );
}
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const SEV_COLORS = { P0:'#ff4d4d', P1:'#f97316', P2:'#f5c542', P3:'#00c896' };
const DIFF_COLORS = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };

function formatTime(s) {
  const m = Math.floor(s/60);
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

// ── Scenario Selector ─────────────────────────────────────────────────────────
function ScenarioSelector({ onStart, loading }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [fetching,  setFetching]  = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/incident/scenarios`)
      .then(r => { setScenarios(r.data.scenarios||[]); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 24px', overflowY:'auto' }}>
      <div style={{ maxWidth:780, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10 }}>🚨</div>
          <h1 style={{ margin:'0 0 8px', fontSize:28, fontWeight:900 }}>Production Incident Response</h1>
          <p style={{ margin:0, color:'#555', fontSize:14 }}>You're on-call. The pager just fired. Lead your team to resolution.</p>
        </div>

        {fetching ? (
          <div style={{ textAlign:'center', color:'#444', padding:40 }}>Loading incidents...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:14, marginBottom:28 }}>
            {scenarios.map(s => {
              const sevColor = SEV_COLORS[s.severity] || '#f97316';
              return (
                <motion.div key={s.id} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
                  onClick={() => setSelected(s.id===selected?null:s.id)}
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
                      <span style={{ fontSize:22 }}>{s.emoji}</span>
                      <div>
                        <div style={{ color: selected===s.id ? s.color : '#e8e8e8', fontWeight:800, fontSize:14 }}>{s.title}</div>
                        <div style={{ color:'#555', fontSize:10, marginTop:2 }}>📡 {s.service}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                      <span style={{ background:sevColor+'22', border:`1px solid ${sevColor}44`, color:sevColor, borderRadius:8, padding:'2px 8px', fontSize:10, fontWeight:900 }}>{s.severity}</span>
                      <span style={{ background:(DIFF_COLORS[s.difficulty]||'#888')+'22', color:DIFF_COLORS[s.difficulty]||'#888', borderRadius:6, padding:'1px 6px', fontSize:9, fontWeight:700 }}>{s.difficulty}</span>
                    </div>
                  </div>

                  <div style={{ background:'#0a0a14', border:'1px solid #1e2a3a', borderRadius:8, padding:'8px 10px', marginBottom:10 }}>
                    <div style={{ color:sevColor, fontSize:10, fontWeight:700, marginBottom:3 }}>ALERT</div>
                    <div style={{ color:'#aaa', fontSize:10, lineHeight:1.5 }}>{s.alert}</div>
                  </div>

                  <p style={{ color:'#666', fontSize:11, lineHeight:1.6, margin:0 }}>{s.context.slice(0,110)}...</p>
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.button whileHover={{ scale: selected?1.02:1 }} whileTap={{ scale: selected?0.98:1 }}
          onClick={() => selected && onStart(selected)}
          disabled={!selected||loading}
          style={{
            width:'100%', fontSize:15, fontWeight:900, padding:'15px 0', borderRadius:13, border:'none',
            background: selected ? `linear-gradient(135deg, ${scenarios.find(s=>s.id===selected)?.color||'#ff4d4d'}, ${scenarios.find(s=>s.id===selected)?.color||'#ff4d4d'}88)` : '#0d1117',
            color: selected?'#fff':'#333',
            cursor: selected&&!loading?'pointer':'not-allowed', transition:'all 0.2s',
          }}
        >
          {loading ? '⏳ Triggering incident...' : selected ? '🚨 Respond to Incident' : 'Select an Incident'}
        </motion.button>
      </div>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, prevValue, color }) {
  const changed = prevValue && prevValue !== value;
  return (
    <motion.div
      animate={changed ? { scale:[1,1.05,1] } : {}}
      transition={{ duration:0.3 }}
      style={{
        background: changed?`${color}11`:'#060910',
        border:`1px solid ${changed?color+'44':'#1e2a3a'}`,
        borderRadius:8, padding:'8px 10px', textAlign:'center',
        transition:'background 0.3s, border-color 0.3s',
      }}
    >
      <div style={{ color: changed?color:'#e8e8e8', fontSize:12, fontWeight:700, lineHeight:1.3 }}>{value}</div>
      <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', marginTop:2 }}>{label}</div>
    </motion.div>
  );
}

// ── Incident Response Screen ──────────────────────────────────────────────────
function IncidentScreen({ session, user, onComplete }) {
  const [messages,    setMessages]    = useState(session.messages||[]);
  const [input,       setInput]       = useState('');
  const [sending,     setSending]     = useState(false);
  const [metrics,     setMetrics]     = useState(session.scenario.metrics||{});
  const [prevMetrics, setPrevMetrics] = useState({});
  const [elapsed,     setElapsed]     = useState(0);
  const [resolved,    setResolved]    = useState(false);
  const [typingWho,   setTypingWho]   = useState(null);
  const [newMsgIds,   setNewMsgIds]   = useState(new Set());
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  const scenario  = session.scenario;
  const sevColor  = SEV_COLORS[scenario.severity]||'#f97316';
  const teammates = session.teammates||[];

  useEffect(() => {
    const id = setInterval(() => setElapsed(e=>e+1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, typingWho]);

  const sendAction = useCallback(async () => {
    if (!input.trim()||sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const userMsg = { id:`msg-${Date.now()}-user`, from:'user', text, timestamp:new Date().toISOString(), type:'user' };
    setMessages(prev=>[...prev, userMsg]);
    setNewMsgIds(prev=>new Set([...prev, userMsg.id]));

    const randomTeammate = teammates[Math.floor(Math.random()*teammates.length)];
    if (randomTeammate) setTypingWho(randomTeammate);

    try {
      const res = await axios.post(`${API_BASE}/incident/${session.sessionId}/action`, { userId:user?.uid, text });
      setTypingWho(null);

      if (res.data.messages) {
        const teammateResponses = res.data.messages.filter(m=>m.type==='teammate');
        const ids = new Set(teammateResponses.map(m=>m.id));
        setNewMsgIds(prev=>new Set([...prev,...ids]));

        for (let i=0; i<teammateResponses.length; i++) {
          await new Promise(r=>setTimeout(r, i===0?400:700));
          setMessages(prev=>[...prev, teammateResponses[i]]);
          if (i<teammateResponses.length-1) {
            const next = teammates.find(t=>t.id===teammateResponses[i+1]?.from);
            if (next) setTypingWho(next);
            await new Promise(r=>setTimeout(r,500));
            setTypingWho(null);
          }
        }
      }

      if (res.data.metricsUpdate && Object.keys(res.data.metricsUpdate).length>0) {
        setPrevMetrics(metrics);
        setMetrics(prev=>({ ...prev, ...res.data.metricsUpdate }));
      }

      if (res.data.resolved) setResolved(true);

    } catch (e) {
      console.error('Incident action error:', e);
      setTypingWho(null);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, session.sessionId, user?.uid, teammates, metrics]);

  return (
    <div style={{ height:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ height:52, background:'#0d1117', borderBottom:`2px solid ${sevColor}44`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <motion.div animate={{ opacity:[1,0.4,1] }} transition={{ duration:1.5, repeat:resolved?0:Infinity }}
            style={{ width:10, height:10, borderRadius:'50%', background:resolved?'#00c896':sevColor, flexShrink:0 }} />
          <div>
            <div style={{ color:'#e8e8e8', fontSize:12, fontWeight:800 }}>{scenario.title}</div>
            <div style={{ color:sevColor, fontSize:9, fontWeight:700 }}>{scenario.severity} · {scenario.service}</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'5px 10px', color:'#e8e8e8', fontSize:12, fontWeight:900, fontFamily:'monospace' }}>
            🕐 {formatTime(elapsed)}
          </div>
          {resolved && (
            <div style={{ background:'#00c89622', border:'1px solid #00c89644', borderRadius:8, padding:'5px 10px', color:'#00c896', fontSize:11, fontWeight:700 }}>
              ✓ Resolved
            </div>
          )}
          <button onClick={onComplete}
            style={{ background:`linear-gradient(135deg,${scenario.color},${scenario.color}88)`, border:'none', borderRadius:8, color:'#fff', cursor:'pointer', fontSize:11, fontWeight:700, padding:'6px 12px' }}>
            {resolved?'View Postmortem →':'End Incident'}
          </button>
        </div>
      </div>

      {/* Alert banner */}
      <div style={{ background:`${sevColor}11`, borderBottom:`1px solid ${sevColor}33`, padding:'6px 18px', flexShrink:0 }}>
        <div style={{ color:sevColor, fontSize:10, fontWeight:700 }}>{scenario.alert}</div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>

        {/* Left: System Status */}
        <div style={{ width:260, borderRight:'1px solid #1e2a3a', display:'flex', flexDirection:'column', flexShrink:0, background:'#0d1117' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:10 }}>📊 SYSTEM STATUS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {Object.entries(metrics).map(([k,v]) => (
                <MetricCard key={k} label={k.replace(/([A-Z])/g,' $1').trim()} value={v} prevValue={prevMetrics[k]} color={scenario.color} />
              ))}
            </div>
          </div>

          <div style={{ padding:'12px 14px', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>👥 CHANNEL MEMBERS</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'#a855f722', border:'1px solid #a855f744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>You</div>
                <div>
                  <div style={{ color:'#e8e8e8', fontSize:11, fontWeight:700 }}>You</div>
                  <div style={{ color:'#00c896', fontSize:9 }}>● Incident Commander</div>
                </div>
              </div>
              {teammates.map(t=>(
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:`${t.color}22`, border:`1px solid ${t.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>{t.emoji}</div>
                  <div>
                    <div style={{ color:'#e8e8e8', fontSize:11, fontWeight:700 }}>{t.name}</div>
                    <div style={{ color:'#00c896', fontSize:9 }}>● Online</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'12px 14px', flex:1 }}>
            <div style={{ color:'#444', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:8 }}>🎯 CONTEXT</div>
            <p style={{ color:'#555', fontSize:10, lineHeight:1.6, margin:0 }}>{scenario.context}</p>
          </div>
        </div>

        {/* Right: Incident Slack Channel */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {/* Channel header */}
          <div style={{ padding:'8px 16px', borderBottom:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
            <div style={{ color:'#555', fontSize:11 }}>
              <span style={{ color:sevColor, fontWeight:700 }}>#{scenario.id}-incident</span> · Type actions and decisions to coordinate the response
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:2 }}>
            {messages.map(msg => {
              const isUser    = msg.type==='user';
              const teammate  = !isUser && teammates.find(t=>t.id===msg.from);
              const isNew     = newMsgIds.has(msg.id);
              return (
                <motion.div key={msg.id}
                  initial={isNew?{opacity:0,y:8}:{opacity:1,y:0}}
                  animate={{opacity:1,y:0}} transition={{duration:0.2}}
                  style={{ display:'flex', alignItems:'flex-end', gap:8, justifyContent:isUser?'flex-end':'flex-start', marginBottom:8 }}
                >
                  {!isUser && (
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:teammate?`${teammate.color}22`:'#1e2a3a', border:`1px solid ${teammate?teammate.color+'44':'#2a3645'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>
                      {teammate?.emoji||'⚙️'}
                    </div>
                  )}
                  <div style={{ maxWidth:'74%' }}>
                    {!isUser && teammate && (
                      <div style={{ color:teammate.color, fontSize:10, fontWeight:700, marginBottom:3, marginLeft:2 }}>{teammate.name}</div>
                    )}
                    <div style={{
                      background: isUser?'#a855f722':'#1e2a3a',
                      border:`1px solid ${isUser?'#a855f744':'#2a3645'}`,
                      borderRadius: isUser?'12px 12px 4px 12px':'12px 12px 12px 4px',
                      padding:'8px 12px', color:isUser?'#e8e8e8':'#c8c8c8',
                      fontSize:12, lineHeight:1.6,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                  {isUser && (
                    <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:'#a855f722', border:'1px solid #a855f744', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#a855f7' }}>IC</div>
                  )}
                </motion.div>
              );
            })}

            <AnimatePresence>
              {typingWho && (
                <motion.div key="typing" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:`${typingWho.color}22`, border:`1px solid ${typingWho.color}44`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{typingWho.emoji}</div>
                  <div style={{ background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:'12px 12px 12px 4px', padding:'8px 14px', display:'flex', gap:4 }}>
                    {[0,1,2].map(i=>(
                      <motion.div key={i} animate={{y:[0,-4,0]}} transition={{duration:0.6,delay:i*0.15,repeat:Infinity}}
                        style={{ width:5, height:5, borderRadius:'50%', background:typingWho.color, opacity:0.7 }} />
                    ))}
                  </div>
                  <span style={{ color:'#444', fontSize:10 }}>{typingWho.name}...</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding:'10px 14px', borderTop:'1px solid #1e2a3a', background:'#0d1117', flexShrink:0 }}>
            {resolved && (
              <div style={{ background:'#00c89611', border:'1px solid #00c89633', borderRadius:8, padding:'8px 12px', marginBottom:8, color:'#00c896', fontSize:11, fontWeight:700, textAlign:'center' }}>
                ✓ Incident resolved! Click "View Postmortem" to see your assessment.
              </div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <input ref={inputRef}
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendAction(); } }}
                placeholder="Type your action or decision... (e.g. 'Check the deploy logs', 'Roll back to v2.4.0', 'Kill the cron job')"
                disabled={resolved}
                style={{
                  flex:1, background:'#060910', border:`1px solid ${input.trim()?sevColor+'44':'#1e2a3a'}`,
                  borderRadius:8, padding:'9px 12px', color:'#e8e8e8', fontSize:12, outline:'none',
                  fontFamily:'Arial, sans-serif', transition:'border-color 0.15s',
                  opacity: resolved?0.4:1,
                }}
              />
              <button onClick={sendAction} disabled={!input.trim()||sending||resolved}
                style={{
                  background:input.trim()&&!sending&&!resolved?`linear-gradient(135deg,${sevColor},${sevColor}88)`:'#1e2a3a',
                  border:'none', borderRadius:8, color:input.trim()&&!sending&&!resolved?'#fff':'#333',
                  cursor:input.trim()&&!sending&&!resolved?'pointer':'not-allowed',
                  fontSize:12, fontWeight:700, padding:'0 16px', height:40, flexShrink:0,
                }}
              >
                {sending?'...':'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Postmortem Screen ─────────────────────────────────────────────────────────
function PostmortemScreen({ postmortem, session, durationMin, onRedo, onHome }) {
  const scenario = session.scenario;
  const color    = scenario.color;
  const sevColor = SEV_COLORS[scenario.severity]||'#f97316';
  const verdictColors = { 'Exceptional IC':'#00c896', 'Solid IC':'#a855f7', 'Needs Practice':'#f5c542', 'Escalate Next Time':'#ff4d4d' };
  const verdictColor = verdictColors[postmortem?.verdict]||color;

  const scores = [
    { label:'Command',       value:postmortem?.commandScore,       color:'#a855f7' },
    { label:'Diagnosis',     value:postmortem?.diagnosisScore,     color:'#f97316' },
    { label:'Communication', value:postmortem?.communicationScore, color:'#1a73e8' },
    { label:'Speed',         value:postmortem?.speedScore,         color:'#00c896' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif', padding:'40px 16px', overflowY:'auto' }}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        style={{ maxWidth:680, margin:'0 auto', background:'#0d1117', border:`1px solid ${color}44`, borderRadius:20, padding:'32px', boxShadow:`0 0 40px ${color}22` }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:42, marginBottom:8 }}>📋</div>
          <h2 style={{ margin:'0 0 4px', fontSize:20, fontWeight:900 }}>Post-Incident Review</h2>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:6 }}>
            <span style={{ background:sevColor+'22', border:`1px solid ${sevColor}44`, color:sevColor, borderRadius:8, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{scenario.severity}</span>
            <span style={{ color:'#555', fontSize:12 }}>{scenario.title}</span>
            <span style={{ color:'#444', fontSize:11 }}>· {durationMin} min</span>
          </div>
        </div>

        {/* Verdict + score */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, marginBottom:24 }}>
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring',stiffness:150,delay:0.2}}
            style={{ width:80, height:80, borderRadius:'50%', background:verdictColor+'22', border:`3px solid ${verdictColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
            <span style={{ color:verdictColor, fontSize:20, fontWeight:900 }}>{postmortem?.overallScore}</span>
            <span style={{ color:verdictColor, fontSize:8, fontWeight:700, textTransform:'uppercase' }}>Score</span>
          </motion.div>
          <div>
            <div style={{ color:verdictColor, fontWeight:900, fontSize:18 }}>{postmortem?.verdict}</div>
            <div style={{ color: postmortem?.correctlyIdentified?'#00c896':'#ff4d4d', fontSize:11, marginTop:3 }}>
              {postmortem?.correctlyIdentified ? '✓ Root cause identified' : '✗ Root cause missed'}
            </div>
            <div style={{ color:'#555', fontSize:10, marginTop:2 }}>TTR: {postmortem?.ttr}</div>
          </div>
        </div>

        {/* Score bars */}
        <div style={{ marginBottom:20 }}>
          <div style={{ color:color, fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:10 }}>📊 Performance Breakdown</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {scores.map(s=>(
              <div key={s.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ color:'#888', fontSize:11 }}>{s.label}</span>
                  <span style={{ color:s.color, fontSize:11, fontWeight:700 }}>{s.value}</span>
                </div>
                <div style={{ height:6, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
                  <motion.div initial={{width:0}} animate={{width:`${s.value||0}%`}} transition={{duration:0.8,delay:0.3}}
                    style={{ height:'100%', background:`linear-gradient(90deg,${s.color}88,${s.color})`, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {postmortem?.summary && (
          <div style={{ background:'#1e2a3a', border:'1px solid #2a3645', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
            <div style={{ color:'#888', fontSize:10, fontWeight:700, textTransform:'uppercase', marginBottom:5 }}>📝 Summary</div>
            <div style={{ color:'#c8c8c8', fontSize:12, lineHeight:1.65 }}>{postmortem.summary}</div>
          </div>
        )}

        {/* What went well / improve */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <div style={{ background:'#00c89608', border:'1px solid #00c89622', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ color:'#00c896', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:7 }}>✓ Went Well</div>
            {(postmortem?.whatWentWell||[]).map((s,i)=>(
              <div key={i} style={{ color:'#888', fontSize:10, marginBottom:5, display:'flex', gap:5, lineHeight:1.5 }}>
                <span style={{ color:'#00c896', flexShrink:0 }}>•</span>{s}
              </div>
            ))}
          </div>
          <div style={{ background:'#f5c54208', border:'1px solid #f5c54222', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ color:'#f5c542', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:7 }}>↑ Improve</div>
            {(postmortem?.whatToImprove||[]).map((s,i)=>(
              <div key={i} style={{ color:'#888', fontSize:10, marginBottom:5, display:'flex', gap:5, lineHeight:1.5 }}>
                <span style={{ color:'#f5c542', flexShrink:0 }}>•</span>{s}
              </div>
            ))}
          </div>
        </div>

        {/* Root cause reveal */}
        <div style={{ background:`${sevColor}08`, border:`1px solid ${sevColor}22`, borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
          <div style={{ color:sevColor, fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>🔍 Root Cause</div>
          <div style={{ color:'#aaa', fontSize:11, lineHeight:1.6 }}>{postmortem?.rootCauseExplained}</div>
        </div>

        {/* Correct resolution */}
        {postmortem?.correctSteps && (
          <div style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:12, padding:'12px 14px', marginBottom:20 }}>
            <div style={{ color:'#1a73e8', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>✅ Ideal Resolution Path</div>
            <div style={{ color:'#aaa', fontSize:11, lineHeight:1.6 }}>{postmortem.correctSteps}</div>
          </div>
        )}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onRedo} style={{ flex:1, background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:10, color:'#888', cursor:'pointer', fontSize:13, fontWeight:600, padding:'10px 0' }}>
            Another Incident
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
export default function IncidentResponse({ user, userData, setUserData }) {
  const navigate      = useNavigate();
  const [phase,       setPhase]       = useState('select');
  const [session,     setSession]     = useState(null);
  const [postmortem,  setPostmortem]  = useState(null);
  const [durationMin, setDurationMin] = useState(0);
  const [loading,     setLoading]     = useState(false);

  const startIncident = async (scenarioId) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/incident/start`, { userId:user?.uid, scenarioId });
      if (!res.data.success) throw new Error(res.data.error);
      setSession(res.data);
      setPhase('incident');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const completeIncident = async () => {
    if (!session?.sessionId) return;
    try {
      const res = await axios.post(`${API_BASE}/incident/${session.sessionId}/complete`, { userId:user?.uid });
      if (res.data.success) {
        setPostmortem(res.data.postmortem);
        setDurationMin(res.data.durationMin);
        setPhase('postmortem');
        if (setUserData && res.data.postmortem?.overallScore > 0) {
          const xp = Math.round(res.data.postmortem.overallScore * 0.25);
          setUserData(prev=>({ ...(prev||{}), xp:((prev||{}).xp||0)+xp }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reset = () => { setPhase('select'); setSession(null); setPostmortem(null); };

  if (phase==='select')    return <ScenarioSelector onStart={startIncident} loading={loading} />;
  if (phase==='incident' && session)   return <IncidentScreen session={session} user={user} onComplete={completeIncident} />;
  if (phase==='postmortem' && postmortem) return <PostmortemScreen postmortem={postmortem} session={session} durationMin={durationMin} onRedo={reset} onHome={()=>navigate('/world')} />;
  return <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', color:'#e8e8e8' }}>Loading...</div>;
}
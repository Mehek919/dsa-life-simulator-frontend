import PlagiarismReport from './PlagiarismReport';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || '';

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inp = {
  width:'100%', background:'#060910', border:'1px solid #1e2a3a',
  borderRadius:8, color:'#e8e8e8', fontSize:13, padding:'8px 12px',
  outline:'none', boxSizing:'border-box',
};
const lbl = {
  color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'.07em', display:'block', marginBottom:5,
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ on, onChange, color = '#1a73e8' }) {
  return (
    <div onClick={onChange} style={{
      width:40, height:22, borderRadius:11, flexShrink:0, cursor:'pointer',
      background: on ? color : '#1e2a3a', border:`1px solid ${on ? color : '#333'}`,
      position:'relative', transition:'background .2s',
    }}>
      <div style={{
        position:'absolute', top:2, left: on ? 19 : 2,
        width:16, height:16, borderRadius:'50%',
        background:'#fff', transition:'left .2s',
      }} />
    </div>
  );
}

// ─── Accordion Section ────────────────────────────────────────────────────────
function AccordionSection({ title, subtitle, color, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      border:`1px solid ${open ? color + '40' : '#1e2a3a'}`,
      borderLeft:`3px solid ${open ? color : '#1e2a3a'}`,
      borderRadius:10, overflow:'hidden', marginBottom:8,
      transition:'border-color .2s',
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width:'100%', background: open ? color + '08' : '#060910',
        border:'none', padding:'11px 14px', cursor:'pointer',
        display:'flex', alignItems:'center', gap:10, transition:'background .2s',
      }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <div style={{ flex:1, textAlign:'left' }}>
          <span style={{ color: open ? '#e8e8e8' : '#aaa', fontSize:13, fontWeight:700 }}>{title}</span>
          {subtitle && !open && <span style={{ color:'#444', fontSize:11, marginLeft:8 }}>{subtitle}</span>}
        </div>
        {badge && (
          <span style={{ background: color+'22', border:`1px solid ${color}40`, borderRadius:99, padding:'2px 8px', color, fontSize:9, fontWeight:800 }}>
            {badge}
          </span>
        )}
        <span style={{ color:'#555', fontSize:12, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▼</span>
      </button>
      {open && <div style={{ padding:'14px 16px', borderTop:`1px solid ${color}20` }}>{children}</div>}
    </div>
  );
}

// ─── Create Assessment Modal ──────────────────────────────────────────────────
function CreateAssessmentModal({ problems, onClose, onCreate }) {
  const TEMPLATES = [
    { id:'coding-challenge', label:'Coding Challenge', emoji:'💻', desc:'DSA problems, live editor, auto-graded' },
    { id:'system-design',    label:'System Design',   emoji:'🏗️', desc:'Architecture questions, chat-based'  },
    { id:'full-stack',       label:'Full-Stack',      emoji:'🔗', desc:'Mix of coding, design, behaviorals'  },
    { id:'custom',           label:'Custom',          emoji:'⚙️', desc:'Build from scratch'                  },
  ];

  const [form, setForm] = useState({
    title:'', description:'', companyName:'', companyLogo:'💼',
    targetRole:'', template:'coding-challenge',
    problemIds:[], durationMinutes:60,
    difficultyMix:{ easy:30, medium:50, hard:20 },
    skillTags:[],
    defaultLanguage:'python3',
    allowedLanguages:['python3','javascript','java','cpp17','c'],
    integrity:{
      proctored:true, webcam:false, browserLockdown:false,
      randomizeOrder:false, plagiarism:true, aiTracking:true,
      hideTimer:false,
    },
    scoring:{
      mode:'auto', passThreshold:70, partialCredit:true,
      codeQuality:false, aiHiringReport:true, showScoreToCandidate:false,
    },
    access:{
      type:'open', password:'', allowedDomain:'',
      maxCandidates:'', maxAttempts:1, cooldownHours:24,
      requireEmailVerification:true, allowLanguageSwitching:true, expiresAt:'',
    },
    invitedEmails:[], sendImmediately:true,
    branding:{ logoUrl:'', accentColor:'#1a73e8', welcomeMessage:'', completionMessage:'' },
    notifications:{ emailOnCompletion:true, slackWebhook:'', dailyDigest:false, integrityAlerts:true },
  });

  const [emailInput,  setEmailInput]  = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  const set = (path, val) => setForm(f => {
    const parts = path.split('.');
    if (parts.length === 1) return { ...f, [path]: val };
    return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
  });

  const toggleProblem = (id) => set('problemIds',
    form.problemIds.includes(id) ? form.problemIds.filter(p => p !== id) : [...form.problemIds, id]
  );

  const toggleTag = (tag) => set('skillTags',
    form.skillTags.includes(tag) ? form.skillTags.filter(t => t !== tag) : [...form.skillTags, tag]
  );

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !e.includes('@') || form.invitedEmails.includes(e)) return;
    set('invitedEmails', [...form.invitedEmails, e]);
    setEmailInput('');
  };

  const handleCreate = async () => {
    if (!form.title || !form.companyName) { setError('Title and company name are required.'); return; }
    if (form.problemIds.length === 0 && form.template !== 'system-design') {
      setError('Select at least one problem.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const payload = {
        ...form,
        expiresAt: form.access.expiresAt || undefined,
        proctored: form.integrity.proctored,
      };
      const res = await axios.post(`${API_BASE}/assessments`, payload, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment.');
    } finally { setSubmitting(false); }
  };

  const diffColor = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };
  const SKILL_TAGS = ['Arrays','DP','Graphs','Trees','Binary Search','SQL','React','APIs','Sorting','Concurrency','Bit Manipulation','String','Hash Table','Heap','Two Pointers'];
  const activeIntegrityCount = Object.values(form.integrity).filter(Boolean).length;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale:0.92, y:20 }} animate={{ scale:1, y:0 }}
        style={{ background:'#0d1117', border:'1px solid #1a73e840', borderRadius:20, padding:0, width:'100%', maxWidth:680, maxHeight:'92vh', overflowY:'auto', position:'relative' }}
      >
        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:10, background:'#0d1117', borderBottom:'1px solid #1e2a3a', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'20px 20px 0 0' }}>
          <div>
            <h2 style={{ margin:0, color:'#e8e8e8', fontSize:17, fontWeight:800 }}>📋 Create Assessment</h2>
            <p style={{ margin:'2px 0 0', color:'#555', fontSize:11 }}>
              {form.problemIds.length} problem{form.problemIds.length !== 1 ? 's' : ''} selected
              {form.invitedEmails.length > 0 ? ` · ${form.invitedEmails.length} candidate${form.invitedEmails.length !== 1 ? 's' : ''} to invite` : ''}
            </p>
          </div>
          <button onClick={onClose} style={{ background:'#1e2a3a', border:'none', color:'#888', cursor:'pointer', fontSize:16, width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        <div style={{ padding:'16px 20px 24px' }}>

          {/* ── TEMPLATE ── */}
          <AccordionSection title="Template & Basics" icon="🎯" color="#1a73e8" defaultOpen badge="required">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => set('template', t.id)}
                  style={{
                    background: form.template === t.id ? '#1a73e811' : '#060910',
                    border:`1px solid ${form.template === t.id ? '#1a73e880' : '#1e2a3a'}`,
                    borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left',
                    transition:'all .15s',
                  }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <span style={{ fontSize:16 }}>{t.emoji}</span>
                    <span style={{ color: form.template === t.id ? '#1a73e8' : '#aaa', fontSize:12, fontWeight:700 }}>{t.label}</span>
                  </div>
                  <div style={{ color:'#444', fontSize:10 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div><label style={lbl}>Company Name *</label><input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. Google, Stripe" style={inp}/></div>
              <div><label style={lbl}>Assessment Title *</label><input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Backend Engineer Round 1" style={inp}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Target Role</label>
                <select value={form.targetRole} onChange={e => set('targetRole', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Select role...</option>
                  {['Backend Engineer','Frontend Engineer','Full-Stack Engineer','Data Engineer','DevOps / SRE','ML Engineer','Engineering Manager'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Company Logo (emoji or URL)</label><input value={form.companyLogo} onChange={e => set('companyLogo', e.target.value)} placeholder="💼 or https://..." style={inp}/></div>
            </div>
            <div><label style={lbl}>Description / Instructions</label><textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Welcome to our technical assessment. Read each question carefully..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          </AccordionSection>

          {/* ── PROBLEMS & DIFFICULTY ── */}
          <AccordionSection title="Problems & Difficulty" icon="💻" color="#a855f7" defaultOpen badge={`${form.problemIds.length} selected`}>
            {/* Difficulty mix */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
              {[{k:'easy',label:'Easy',color:'#00c896'},{k:'medium',label:'Medium',color:'#f5c542'},{k:'hard',label:'Hard',color:'#ff4d4d'}].map(d => (
                <div key={d.k} style={{ background:'#060910', border:`1px solid ${d.color}30`, borderRadius:8, padding:'10px 10px 8px' }}>
                  <div style={{ fontSize:10, color:'#555', marginBottom:6 }}>{d.label}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:d.color, marginBottom:4 }}>{form.difficultyMix[d.k]}%</div>
                  <input type="range" min={0} max={100} step={5} value={form.difficultyMix[d.k]}
                    onChange={e => set('difficultyMix', { ...form.difficultyMix, [d.k]: Number(e.target.value) })}
                    style={{ width:'100%' }}/>
                </div>
              ))}
            </div>

            {/* Config row */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div><label style={lbl}>Duration (min)</label><input type="number" value={form.durationMinutes} onChange={e => set('durationMinutes', Number(e.target.value))} min={15} max={300} style={inp}/></div>
              <div>
                <label style={lbl}>Default Language</label>
                <select value={form.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {['python3','javascript','java','cpp17','c','csharp','go','rust'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Expires At</label><input type="datetime-local" value={form.access.expiresAt} onChange={e => set('access.expiresAt', e.target.value)} style={inp}/></div>
            </div>

            {/* Skill tags */}
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Skill Tags</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {SKILL_TAGS.map(t => {
                  const on = form.skillTags.includes(t);
                  return (
                    <button key={t} onClick={() => toggleTag(t)}
                      style={{ background: on ? '#a855f722' : '#060910', border:`1px solid ${on ? '#a855f760' : '#1e2a3a'}`, borderRadius:99, padding:'3px 10px', color: on ? '#a855f7' : '#555', fontSize:10, fontWeight:600, cursor:'pointer', transition:'all .15s' }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Problem list */}
            <div>
              <label style={lbl}>Select Problems * ({form.problemIds.length} selected)</label>
              <div style={{ border:'1px solid #1e2a3a', borderRadius:10, maxHeight:220, overflowY:'auto', background:'#060910' }}>
                {problems.length === 0 ? (
                  <div style={{ padding:20, color:'#333', fontSize:13, textAlign:'center' }}>No problems available. Seed the database first.</div>
                ) : problems.map((p, i) => {
                  const sel = form.problemIds.includes(p.id);
                  return (
                    <div key={p.id} onClick={() => toggleProblem(p.id)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 14px', borderBottom: i < problems.length - 1 ? '1px solid #0f1923' : 'none', cursor:'pointer', background: sel ? '#a855f708' : 'transparent', transition:'background .15s' }}>
                      <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${sel ? '#a855f7' : '#333'}`, background: sel ? '#a855f7' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, color:'#fff' }}>
                        {sel ? '✓' : ''}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600 }}>{p.title}</div>
                        <div style={{ color:'#555', fontSize:10 }}>{p.tags?.slice(0,2).join(' · ')}</div>
                      </div>
                      <span style={{ color:diffColor[p.difficulty]||'#888', fontSize:10, fontWeight:700, flexShrink:0 }}>{p.difficulty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionSection>

          {/* ── INTEGRITY ── */}
          <AccordionSection title="Integrity & Proctoring" icon="🛡️" color="#f97316" badge={`${activeIntegrityCount} active`}>
            {[
              { key:'proctored',      label:'Proctored session',        desc:'Log all tab switches, copy/paste, and suspicious activity', color:'#f97316' },
              { key:'webcam',         label:'Webcam monitoring',        desc:'Periodic snapshots for recruiter review. Requires permission', color:'#f97316' },
              { key:'browserLockdown',label:'Browser lockdown',         desc:'Prevent new tabs, DevTools, and external resources', color:'#ff4d4d' },
              { key:'randomizeOrder', label:'Randomize question order', desc:'Shuffle problems so each candidate sees a different order', color:'#f59e0b' },
              { key:'plagiarism',     label:'Plagiarism detection',     desc:'Flag code similarity against known solutions and other submissions', color:'#f97316' },
              { key:'aiTracking',     label:'AI usage tracking',        desc:'Detect and log Copilot, ChatGPT, and AI-assisted code patterns', color:'#f97316' },
              { key:'hideTimer',      label:'Hide timer from candidate',desc:'Candidate cannot see remaining time — increases realism', color:'#f59e0b' },
            ].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, paddingBottom:10, marginBottom:10, borderBottom:'1px solid #1e2a3a10' }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:2 }}>{s.label}</div>
                  <div style={{ color:'#444', fontSize:10 }}>{s.desc}</div>
                </div>
                <Toggle on={form.integrity[s.key]} onChange={() => set('integrity', { ...form.integrity, [s.key]: !form.integrity[s.key] })} color={s.color}/>
              </div>
            ))}
          </AccordionSection>

          {/* ── SCORING ── */}
          <AccordionSection title="Scoring & Evaluation" icon="📊" color="#10b981">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[{id:'auto',label:'Auto-grade',desc:'All test cases run automatically. Results instant',icon:'🤖'},
                {id:'manual',label:'Manual review',desc:'Reviewer grades manually. AI suggests a score',icon:'👤'}
              ].map(m => (
                <button key={m.id} onClick={() => set('scoring.mode', m.id)}
                  style={{ background: form.scoring.mode === m.id ? '#10b98111' : '#060910', border:`1px solid ${form.scoring.mode === m.id ? '#10b98160' : '#1e2a3a'}`, borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                    <span>{m.icon}</span>
                    <span style={{ color: form.scoring.mode === m.id ? '#10b981' : '#aaa', fontSize:12, fontWeight:700 }}>{m.label}</span>
                  </div>
                  <div style={{ color:'#444', fontSize:10 }}>{m.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Pass threshold (%)</label><input type="number" value={form.scoring.passThreshold} onChange={e => set('scoring.passThreshold', Number(e.target.value))} min={0} max={100} style={inp}/></div>
              <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                  <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600 }}>Partial credit</div><div style={{ color:'#444', fontSize:10 }}>Award points for partially passing solutions</div></div>
                  <Toggle on={form.scoring.partialCredit} onChange={() => set('scoring.partialCredit', !form.scoring.partialCredit)} color="#10b981"/>
                </div>
              </div>
            </div>
            {[
              { key:'codeQuality',          label:'Code quality score',          desc:'AI rates readability and naming in addition to correctness' },
              { key:'aiHiringReport',       label:'Generate AI hiring report',    desc:'Full PDF with dimension scores, recommendation, and evidence' },
              { key:'showScoreToCandidate', label:'Show score to candidate',      desc:'Candidates see their result immediately after submitting' },
            ].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#444', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.scoring[s.key]} onChange={() => set('scoring', { ...form.scoring, [s.key]: !form.scoring[s.key] })} color="#10b981"/>
              </div>
            ))}
          </AccordionSection>

          {/* ── ACCESS CONTROL ── */}
          <AccordionSection title="Access Control" icon="🔐" color="#06b6d4">
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Access type</label>
              <select value={form.access.type} onChange={e => set('access.type', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="open">Open — anyone with the link can attempt</option>
                <option value="invite-only">Invite only — only emailed candidates</option>
                <option value="password">Password protected — candidate needs a code</option>
                <option value="domain">Domain restricted — only @yourcompany.com emails</option>
              </select>
            </div>
            {form.access.type === 'password' && (
              <div style={{ marginBottom:12 }}><label style={lbl}>Access Code</label><input value={form.access.password} onChange={e => set('access.password', e.target.value)} placeholder="e.g. GOOGLE2024" style={inp}/></div>
            )}
            {form.access.type === 'domain' && (
              <div style={{ marginBottom:12 }}><label style={lbl}>Allowed Domain</label><input value={form.access.allowedDomain} onChange={e => set('access.allowedDomain', e.target.value)} placeholder="yourcompany.com" style={inp}/></div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Max candidates</label><input type="number" value={form.access.maxCandidates} onChange={e => set('access.maxCandidates', e.target.value)} placeholder="Unlimited" min={1} style={inp}/></div>
              <div>
                <label style={lbl}>Max attempts per candidate</label>
                <select value={form.access.maxAttempts} onChange={e => set('access.maxAttempts', Number(e.target.value))} style={{ ...inp, cursor:'pointer' }}>
                  {[1,2,3].map(n => <option key={n} value={n}>{n} {n===1?'(no retakes)':''}</option>)}
                </select>
              </div>
            </div>
            {[
              { key:'requireEmailVerification', label:'Require email verification', desc:'Candidate must verify email before starting' },
              { key:'allowLanguageSwitching',   label:'Allow language switching',   desc:'Candidates can change coding language mid-assessment' },
            ].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#444', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.access[s.key]} onChange={() => set('access', { ...form.access, [s.key]: !form.access[s.key] })} color="#06b6d4"/>
              </div>
            ))}
          </AccordionSection>

          {/* ── INVITE CANDIDATES ── */}
          <AccordionSection title="Invite Candidates" icon="📨" color="#ec4899" badge={form.invitedEmails.length > 0 ? `${form.invitedEmails.length} queued` : 'optional'}>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <input value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEmail()} placeholder="candidate@email.com" type="email" style={{ ...inp, flex:1 }}/>
              <button onClick={addEmail} style={{ background:'#ec489922', border:'1px solid #ec489944', borderRadius:8, color:'#ec4899', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', flexShrink:0 }}>
                + Add
              </button>
            </div>
            {form.invitedEmails.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                {form.invitedEmails.map(e => (
                  <span key={e} style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:99, padding:'3px 10px', color:'#ec4899', fontSize:10, display:'flex', alignItems:'center', gap:5 }}>
                    {e}
                    <button onClick={() => set('invitedEmails', form.invitedEmails.filter(x => x !== e))} style={{ background:'none', border:'none', color:'#ec489988', cursor:'pointer', padding:0, fontSize:12 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>Send invites immediately on create</div><div style={{ color:'#444', fontSize:10 }}>Email candidates as soon as the assessment is published</div></div>
              <Toggle on={form.sendImmediately} onChange={() => set('sendImmediately', !form.sendImmediately)} color="#ec4899"/>
            </div>
          </AccordionSection>

          {/* ── BRANDING ── */}
          <AccordionSection title="Branding & Messages" icon="🎨" color="#f59e0b">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl}>Company logo URL</label><input value={form.branding.logoUrl} onChange={e => set('branding.logoUrl', e.target.value)} placeholder="https://yourcompany.com/logo.png" style={inp}/></div>
              <div>
                <label style={lbl}>Brand accent color</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" value={form.branding.accentColor} onChange={e => set('branding.accentColor', e.target.value)} style={{ ...inp, width:60, padding:4, cursor:'pointer' }}/>
                  <input value={form.branding.accentColor} onChange={e => set('branding.accentColor', e.target.value)} style={{ ...inp, flex:1 }}/>
                </div>
              </div>
            </div>
            <div style={{ marginBottom:10 }}><label style={lbl}>Welcome message (shown before start)</label><textarea value={form.branding.welcomeMessage} onChange={e => set('branding.welcomeMessage', e.target.value)} placeholder="Welcome! This assessment tests your problem-solving skills..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
            <div><label style={lbl}>Completion message (shown after submit)</label><textarea value={form.branding.completionMessage} onChange={e => set('branding.completionMessage', e.target.value)} placeholder="Thank you for completing the assessment. We will be in touch within 5 business days..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          </AccordionSection>

          {/* ── NOTIFICATIONS ── */}
          <AccordionSection title="Notifications" icon="🔔" color="#8b5cf6">
            {[
              { key:'emailOnCompletion', label:'Email on completion',   desc:'Notify recruiters when a candidate submits', color:'#8b5cf6' },
              { key:'dailyDigest',       label:'Daily digest',          desc:'Summary of all submissions every morning at 9 AM', color:'#8b5cf6' },
              { key:'integrityAlerts',   label:'Integrity alerts',      desc:'Real-time alert when proctoring flags suspicious activity', color:'#ff4d4d' },
            ].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#444', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.notifications[s.key]} onChange={() => set('notifications', { ...form.notifications, [s.key]: !form.notifications[s.key] })} color={s.color}/>
              </div>
            ))}
            <div>
              <label style={lbl}>Slack webhook URL (optional)</label>
              <input value={form.notifications.slackWebhook} onChange={e => set('notifications.slackWebhook', e.target.value)} placeholder="https://hooks.slack.com/services/..." style={inp}/>
            </div>
          </AccordionSection>

          {/* Error */}
          {error && (
            <div style={{ background:'#ff4d4d11', border:'1px solid #ff4d4d33', borderRadius:8, padding:'8px 14px', color:'#ff6b6b', fontSize:12, marginBottom:8 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:0.99 }} onClick={handleCreate} disabled={submitting}
            style={{
              width:'100%', marginTop:4,
              background: submitting ? '#1e2a3a' : 'linear-gradient(135deg, #1a73e8, #0d47a1)',
              border:'none', borderRadius:10, color: submitting ? '#444' : '#fff',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontSize:14, fontWeight:700, padding:'13px 0',
              boxShadow: submitting ? 'none' : '0 0 24px #1a73e840',
              position:'relative', overflow:'hidden',
            }}
          >
            {!submitting && <motion.div animate={{ x:['-100%','200%'] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }} style={{ position:'absolute', top:0, bottom:0, left:0, width:'40%', background:'linear-gradient(105deg,transparent,rgba(255,255,255,0.12),transparent)', pointerEvents:'none' }}/>}
            {submitting ? '⏳ Creating assessment...' : '🚀 Create Assessment & Get Invite Link'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Candidate Results Modal ──────────────────────────────────────────────────
function CandidateResults({ assessmentId, onClose }) {
  const [results,   setResults]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [note,      setNote]      = useState('');
  const [submNote,  setSubmNote]  = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_BASE}/assessments/${assessmentId}/results`,   { headers:{ 'x-admin-key': ADMIN_KEY } }),
      axios.get(`${API_BASE}/assessments/${assessmentId}/analytics`, { headers:{ 'x-admin-key': ADMIN_KEY } }),
    ]).then(([rRes, aRes]) => {
      setResults(rRes.data.results || []);
      setAnalytics(aRes.data.analytics || null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [assessmentId]);

  useEffect(() => { load(); }, [load]);

  const makeDecision = async (userId, decision) => {
    try {
      await axios.post(`${API_BASE}/assessments/${assessmentId}/results/${userId}/decision`,
        { decision }, { headers:{ 'x-admin-key': ADMIN_KEY } }
      );
      load();
    } catch(e) { console.error(e); }
  };

  const saveNote = async (userId) => {
    if (!note.trim()) return;
    setSubmNote(true);
    try {
      await axios.post(`${API_BASE}/assessments/${assessmentId}/results/${userId}/note`,
        { note }, { headers:{ 'x-admin-key': ADMIN_KEY } }
      );
      setNote('');
    } catch(e) { console.error(e); } finally { setSubmNote(false); }
  };

  const passThreshold = 200;

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale:0.92 }} animate={{ scale:1 }}
        style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:20, width:'100%', maxWidth:780, maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #1e2a3a', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 style={{ margin:0, color:'#e8e8e8', fontSize:17, fontWeight:800 }}>👥 Candidate Results</h2>
          <button onClick={onClose} style={{ background:'#1e2a3a', border:'none', color:'#888', cursor:'pointer', fontSize:16, width:30, height:30, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
          {['results','analytics'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ flex:1, padding:'10px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color: activeTab === t ? '#1a73e8' : '#444', borderBottom:`2px solid ${activeTab === t ? '#1a73e8' : 'transparent'}`, transition:'all .2s' }}>
              {t}
            </button>
          ))}
        </div>

        <div style={{ padding:'20px 24px', flex:1, overflowY:'auto' }}>

          {loading && <div style={{ color:'#333', textAlign:'center', padding:40 }}>Loading...</div>}

          {/* ── RESULTS TAB ── */}
          {!loading && activeTab === 'results' && (
            <>
              {results.length === 0 ? (
                <div style={{ color:'#333', textAlign:'center', padding:48 }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
                  No candidates have completed this assessment yet.
                </div>
              ) : (
                <>
                  {/* Stats row */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
                    {[
                      { label:'Candidates', value:results.length, color:'#1a73e8' },
                      { label:'Avg Score',  value:Math.round(results.reduce((a,r)=>a+(r.totalScore||0),0)/results.length), color:'#a855f7' },
                      { label:'Pass Rate',  value:`${Math.round((results.filter(r=>(r.totalScore||0)>=passThreshold).length/results.length)*100)}%`, color:'#00c896' },
                      { label:'Avg Flags',  value:Math.round(results.reduce((a,r)=>a+(r.violationCount||0),0)/results.length), color:'#f5c542' },
                    ].map(s => (
                      <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                        <div style={{ color:s.color, fontSize:20, fontWeight:900 }}>{s.value}</div>
                        <div style={{ color:'#444', fontSize:9, marginTop:2, textTransform:'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Candidate rows */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {results.map((r, i) => {
                      const isOpen = selected?.userId === r.userId;
                      const passed = (r.totalScore || 0) >= passThreshold;
                      const dec    = r.decision?.value;
                      return (
                        <motion.div key={r.userId} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                          style={{ background: isOpen ? '#1a73e808' : '#060910', border:`1px solid ${isOpen ? '#1a73e840' : '#1e2a3a'}`, borderRadius:10, overflow:'hidden', transition:'all .2s' }}>
                          <div onClick={() => setSelected(isOpen ? null : r)} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer' }}>
                            {/* Rank badge */}
                            <span style={{ width:26, height:26, borderRadius:'50%', background: i===0?'#f5c54222':i===1?'#88888822':i===2?'#cd7f3222':'#1e2a3a', border:`1px solid ${i===0?'#f5c54244':i===1?'#88888844':i===2?'#cd7f3244':'#333'}`, color:i===0?'#f5c542':i===1?'#888':i===2?'#cd7f32':'#555', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                              {i+1}
                            </span>

                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:600 }}>{r.displayName || 'Candidate'}</div>
                              <div style={{ color:'#555', fontSize:11 }}>{r.email} · {timeAgo(r.completedAt)}{r.autoSubmitted?' (auto)':''}</div>
                            </div>

                            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                              {[{v:r.solved?.length||0,l:'solved',c:'#00c896'},{v:r.totalScore||0,l:'pts',c:'#a855f7'},{v:r.violationCount||0,l:'flags',c:(r.violationCount||0)>3?'#ff4d4d':'#f5c542'}].map(s=>(
                                <div key={s.l} style={{ textAlign:'center' }}>
                                  <div style={{ color:s.c, fontSize:13, fontWeight:700 }}>{s.v}</div>
                                  <div style={{ color:'#444', fontSize:9 }}>{s.l}</div>
                                </div>
                              ))}
                            </div>

                            {/* Decision / strength badge */}
                            <div style={{
                              background: dec==='hire'||dec==='schedule-next-round'?'#00c89622':dec==='reject'?'#ff4d4d11':passed?'#00c89611':'#ff4d4d11',
                              border:`1px solid ${dec==='hire'||dec==='schedule-next-round'?'#00c89644':dec==='reject'?'#ff4d4d33':passed?'#00c89633':'#ff4d4d22'}`,
                              borderRadius:99, padding:'3px 10px',
                              color: dec==='hire'||dec==='schedule-next-round'?'#00c896':dec==='reject'?'#ff6b6b':passed?'#00c896':'#ff6b6b',
                              fontSize:9, fontWeight:700, flexShrink:0,
                            }}>
                              {dec==='hire'?'✅ Hired':dec==='schedule-next-round'?'📅 Scheduled':dec==='reject'?'❌ Rejected':dec==='hold'?'⏸ On Hold':passed?'✓ Passed':'Weak'}
                            </div>
                          </div>

                          {/* Expanded panel */}
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                                style={{ borderTop:'1px solid #1e2a3a', padding:'14px 16px' }}>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                                  <div>
                                    <div style={{ color:'#555', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Problems Solved</div>
                                    {r.solved?.length > 0 ? r.solved.map(pid => <div key={pid} style={{ color:'#00c896', fontSize:11, marginBottom:2 }}>✓ {pid} (+{r.scores?.[pid]||0} pts)</div>) : <div style={{ color:'#333', fontSize:11 }}>None</div>}
                                  </div>
                                  <div>
                                    <div style={{ color:'#555', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Violations</div>
                                    {(r.violations||[]).length>0 ? r.violations.slice(0,4).map((v,vi)=><div key={vi} style={{ color:'#ff6b6b', fontSize:11, marginBottom:2 }}>⚠ {v.type?.replace(/_/g,' ')} {v.timestamp ? `· ${new Date(v.timestamp).toLocaleTimeString()}` : ''}</div>) : <div style={{ color:'#00c896', fontSize:11 }}>No violations ✓</div>}
                                  </div>
                                </div>

                                {/* Decision buttons */}
                                <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                                  {[
                                    { id:'hire',                label:'Hire',          color:'#00c896', bg:'#00c89620' },
                                    { id:'schedule-next-round', label:'Schedule next', color:'#1a73e8', bg:'#1a73e820' },
                                    { id:'hold',                label:'Hold',          color:'#f5c542', bg:'#f5c54220' },
                                    { id:'reject',              label:'Pass',          color:'#ff4d4d', bg:'#ff4d4d14' },
                                  ].map(d => (
                                    <button key={d.id} onClick={() => makeDecision(r.userId, d.id)}
                                      style={{ background: dec===d.id?d.bg:'#1e2a3a', border:`1px solid ${dec===d.id?d.color+'60':'#1e2a3a'}`, borderRadius:8, color:dec===d.id?d.color:'#666', cursor:'pointer', fontSize:11, fontWeight:700, padding:'6px 12px', transition:'all .2s' }}>
                                      {d.label}
                                    </button>
                                  ))}
                                </div>

                                {/* Recruiter note */}
                                <div>
                                  {(r.recruiterNotes||[]).length > 0 && (
                                    <div style={{ marginBottom:8 }}>
                                      {r.recruiterNotes.map((n,ni) => (
                                        <div key={ni} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:6, padding:'6px 10px', marginBottom:4, color:'#aaa', fontSize:11 }}>
                                          {n.note} <span style={{ color:'#333', fontSize:9 }}>— {n.addedAt}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div style={{ display:'flex', gap:8 }}>
                                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="Add private recruiter note..." style={{ ...inp, fontSize:11 }}/>
                                    <button onClick={() => saveNote(r.userId)} disabled={submNote||!note.trim()}
                                      style={{ background:'#1a73e822', border:'1px solid #1a73e844', borderRadius:8, color:'#1a73e8', cursor:'pointer', fontSize:11, fontWeight:700, padding:'0 12px', flexShrink:0, opacity:submNote||!note.trim()?0.4:1 }}>
                                      Save
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── ANALYTICS TAB ── */}
          {!loading && activeTab === 'analytics' && analytics && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {[
                  { label:'Completed',      value:analytics.completed,       color:'#00c896' },
                  { label:'In Progress',    value:analytics.inProgress,      color:'#f5c542' },
                  { label:'Invited',        value:analytics.invited,         color:'#1a73e8' },
                  { label:'Pass Rate',      value:`${analytics.passRate}%`,  color:'#00c896' },
                  { label:'Avg Score',      value:analytics.avgScore,        color:'#a855f7' },
                  { label:'Avg Time (min)', value:analytics.avgCompletionMin,color:'#06b6d4' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                    <div style={{ color:s.color, fontSize:22, fontWeight:900 }}>{s.value}</div>
                    <div style={{ color:'#444', fontSize:9, marginTop:2, textTransform:'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Score distribution */}
              <div style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Score Distribution</div>
                {Object.entries(analytics.scoreDistribution||{}).map(([range, count]) => {
                  const pct = analytics.completed > 0 ? Math.round((count / analytics.completed) * 100) : 0;
                  return (
                    <div key={range} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ color:'#555', fontSize:10, width:56, flexShrink:0 }}>{range}</span>
                      <div style={{ flex:1, height:6, background:'#1e2a3a', borderRadius:99, overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:.8 }} style={{ height:'100%', background:'linear-gradient(90deg,#1a73e8,#a855f7)', borderRadius:99 }}/>
                      </div>
                      <span style={{ color:'#888', fontSize:10, width:28, textAlign:'right' }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Decisions */}
              <div style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:12 }}>Decision Breakdown</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[
                    { key:'hire',                label:'Hired',      color:'#00c896' },
                    { key:'schedule-next-round', label:'Scheduled',  color:'#1a73e8' },
                    { key:'hold',                label:'On Hold',    color:'#f5c542' },
                    { key:'reject',              label:'Rejected',   color:'#ff4d4d' },
                  ].map(d => (
                    <div key={d.key} style={{ textAlign:'center', padding:'8px', background:'#0d1117', borderRadius:8, border:`1px solid ${d.color}20` }}>
                      <div style={{ color:d.color, fontSize:18, fontWeight:900 }}>{analytics.decisions?.[d.key]||0}</div>
                      <div style={{ color:'#444', fontSize:9, textTransform:'uppercase', marginTop:2 }}>{d.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main CompanyDashboard ────────────────────────────────────────────────────
export default function CompanyDashboard({ user }) {
  const navigate = useNavigate();
  const [assessments,   setAssessments]   = useState([]);
  const [problems,      setProblems]      = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [viewResults,   setViewResults]   = useState(null);
  const [showPlagiarism,setShowPlagiarism]= useState(null);
  const [copiedLink,    setCopiedLink]    = useState('');
  const [newAssessment, setNewAssessment] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [companyFilter, setCompanyFilter] = useState('');

  const loadAssessments = useCallback((company) => {
    if (!company) return;
    axios.get(`${API_BASE}/assessments/company/${encodeURIComponent(company)}`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    }).then(res => setAssessments(res.data.assessments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get(`${API_BASE}/problems?limit=200`)
      .then(r => setProblems(r.data.problems || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const handleCreated = (data) => {
    setNewAssessment(data);
    setAssessments(prev => [{
      id:              data.assessmentId,
      title:           'New Assessment',
      inviteLink:      data.inviteLink,
      candidateCount:  0,
      createdAt:       new Date(),
    }, ...prev]);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial, sans-serif' }}>
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <button onClick={() => navigate(-1)} style={{ background:'transparent', border:'1px solid #1e2a3a', borderRadius:8, color:'#555', cursor:'pointer', fontSize:12, padding:'6px 14px', marginBottom:16 }}>← Back</button>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
            <div>
              <h1 style={{ margin:0, fontSize:24, fontWeight:900 }}>🏢 Company Assessment Portal</h1>
              <p style={{ margin:'4px 0 0', color:'#555', fontSize:13 }}>Create assessments, invite candidates, view ranked results and analytics.</p>
            </div>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={() => setShowCreate(true)}
              style={{ background:'linear-gradient(135deg,#1a73e8,#0d47a1)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, padding:'10px 20px', boxShadow:'0 0 20px #1a73e830' }}>
              + Create Assessment
            </motion.button>
          </div>
        </div>

        {/* New assessment banner */}
        <AnimatePresence>
          {newAssessment && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ background:'#00c89611', border:'1px solid #00c89644', borderRadius:14, padding:'16px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ fontSize:20 }}>✅</span>
              <div style={{ flex:1 }}>
                <div style={{ color:'#00c896', fontWeight:700, fontSize:14 }}>Assessment created! Share this link with candidates:</div>
                <div style={{ color:'#e8e8e8', fontSize:12, marginTop:4, wordBreak:'break-all' }}>{newAssessment.inviteLink}</div>
                {newAssessment.candidatesInvited > 0 && <div style={{ color:'#00c89699', fontSize:11, marginTop:3 }}>📨 {newAssessment.candidatesInvited} invitation{newAssessment.candidatesInvited !== 1 ? 's' : ''} sent</div>}
              </div>
              <button onClick={() => copyLink(newAssessment.inviteLink)}
                style={{ background: copiedLink === newAssessment.inviteLink ? '#00c89622' : '#1e2a3a', border:'1px solid #1e2a3a', borderRadius:8, color:'#e8e8e8', cursor:'pointer', fontSize:12, fontWeight:600, padding:'6px 14px', flexShrink:0 }}>
                {copiedLink === newAssessment.inviteLink ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button onClick={() => setNewAssessment(null)} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:16 }}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:28 }}>
          {[
            { step:'1', icon:'📋', title:'Create',   desc:'Pick problems, set duration, configure proctoring and scoring' },
            { step:'2', icon:'📨', title:'Invite',   desc:'Share the link or add candidate emails directly in the form' },
            { step:'3', icon:'💻', title:'Test',     desc:'Candidates solve problems in a timed, proctored environment' },
            { step:'4', icon:'📊', title:'Analyze',  desc:'View ranked results, analytics, and make hire/reject decisions' },
          ].map(s => (
            <div key={s.step} style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ background:'#1a73e822', border:'1px solid #1a73e844', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', color:'#1a73e8', fontSize:11, fontWeight:900, flexShrink:0 }}>{s.step}</span>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <span style={{ color:'#e8e8e8', fontSize:13, fontWeight:700 }}>{s.title}</span>
              </div>
              <p style={{ margin:0, color:'#555', fontSize:11, lineHeight:1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Load by company */}
        <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
          <input value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadAssessments(companyFilter)} placeholder="Filter by company name..." style={{ ...inp, flex:1 }}/>
          <button onClick={() => loadAssessments(companyFilter)} style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:8, color:'#1a73e8', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 16px', flexShrink:0 }}>Load</button>
        </div>

        {/* Assessments list */}
        {assessments.length === 0 ? (
          <div style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:16, padding:'48px 32px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
            <h2 style={{ color:'#e8e8e8', margin:'0 0 8px' }}>No assessments yet</h2>
            <p style={{ color:'#555', fontSize:14, margin:'0 0 20px' }}>
              Create your first assessment and send the link to candidates.<br/>
              <strong style={{ color:'#1a73e8' }}>Free forever.</strong> HackerRank charges $25,000/year for this.
            </p>
            <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }} onClick={() => setShowCreate(true)}
              style={{ background:'linear-gradient(135deg,#1a73e8,#0d47a1)', border:'none', borderRadius:10, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, padding:'12px 28px' }}>
              + Create Your First Assessment
            </motion.button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {assessments.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#e8e8e8', fontSize:14, fontWeight:700 }}>{a.title}</div>
                  <div style={{ color:'#555', fontSize:12, marginTop:2 }}>
                    {a.candidateCount||0} candidate{a.candidateCount!==1?'s':''} · Created {timeAgo(a.createdAt)}
                    {a.targetRole && <span style={{ color:'#1a73e8', marginLeft:6 }}>· {a.targetRole}</span>}
                    {a.status === 'archived' && <span style={{ color:'#ff4d4d', marginLeft:6 }}>· Archived</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => copyLink(a.inviteLink || `https://dsa-life-simulator-frontend.vercel.app/Assessment/${a.id}`)}
                    style={{ background:'#1e2a3a', border:'1px solid #1e2a3a', borderRadius:8, color:'#888', cursor:'pointer', fontSize:12, padding:'6px 12px' }}>
                    {copiedLink.includes(a.id) ? '✓ Copied!' : '🔗 Copy Link'}
                  </button>
                  <button onClick={() => setViewResults(a.id)}
                    style={{ background:'#1a73e811', border:'1px solid #1a73e833', borderRadius:8, color:'#1a73e8', cursor:'pointer', fontSize:12, fontWeight:600, padding:'6px 12px' }}>
                    📊 Results
                  </button>
                  <button onClick={() => setShowPlagiarism(a.id)}
                    style={{ background:'#f59e0b11', border:'1px solid #f59e0b33', borderRadius:8, color:'#f59e0b', cursor:'pointer', fontSize:12, fontWeight:600, padding:'6px 12px' }}>
                    🔍 Plagiarism
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateAssessmentModal problems={problems} onClose={() => setShowCreate(false)} onCreate={handleCreated}/>}
        {viewResults && <CandidateResults assessmentId={viewResults} onClose={() => setViewResults(null)}/>}
        {showPlagiarism && <PlagiarismReport assessmentId={showPlagiarism} onClose={() => setShowPlagiarism(null)}/>}
      </AnimatePresence>
    </div>
  );
}
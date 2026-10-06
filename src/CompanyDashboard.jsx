import './CompanyDashboard.css';
import PlagiarismReport from './PlagiarismReport';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import API_BASE from './config';
const ADMIN_KEY = process.env.REACT_APP_ADMIN_KEY || '';
import './CompanyDashboard.css';
async function authHeaders() {
  const u = getAuth().currentUser;
  if (!u) return {};
  return { Authorization: `Bearer ${await u.getIdToken()}` };
}
function timeAgo(ts) {
  if (!ts) return '';
  const date = ts._seconds ? new Date(ts._seconds * 1000) : ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
const linkFor = (a) => a.inviteLink || `${window.location.origin}/Assessment/${a.id}`;

// ─── Shared Styles (create form + results) ────────────────────────────────────
const inp = { width:'100%', background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, color:'#e8e8e8', fontSize:13, padding:'8px 12px', outline:'none', boxSizing:'border-box' };
const lbl = { color:'#8a97ad', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', display:'block', marginBottom:5 };

function Toggle({ on, onChange, color = '#1a73e8' }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} style={{ width:40, height:22, borderRadius:11, flexShrink:0, cursor:'pointer', padding:0, background: on ? color : '#1e2a3a', border:`1px solid ${on ? color : '#333'}`, position:'relative', transition:'background .2s' }}>
      <span style={{ position:'absolute', top:2, left: on ? 19 : 2, width:16, height:16, borderRadius:'50%', background:'#fff', transition:'left .2s' }} />
    </button>
  );
}
function AccordionSection({ title, subtitle, color, icon, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border:`1px solid ${open ? color + '40' : '#1e2a3a'}`, borderLeft:`3px solid ${open ? color : '#1e2a3a'}`, borderRadius:10, overflow:'hidden', marginBottom:8, transition:'border-color .2s' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} style={{ width:'100%', background: open ? color + '08' : '#060910', border:'none', padding:'11px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>{icon}</span>
        <div style={{ flex:1, textAlign:'left' }}>
          <span style={{ color: open ? '#e8e8e8' : '#aaa', fontSize:13, fontWeight:700 }}>{title}</span>
          {subtitle && !open && <span style={{ color:'#666', fontSize:11, marginLeft:8 }}>{subtitle}</span>}
        </div>
        {badge && <span style={{ background: color+'22', border:`1px solid ${color}40`, borderRadius:99, padding:'2px 8px', color, fontSize:9, fontWeight:800 }}>{badge}</span>}
        <span style={{ color:'#777', fontSize:12, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>▼</span>
      </button>
      {open && <div style={{ padding:'14px 16px', borderTop:`1px solid ${color}20` }}>{children}</div>}
    </div>
  );
}

// ─── Hiring templates ─────────────────────────────────────────────────────────
// Each one fills the real create form and picks matching problems from your library.
const HIRING_TEMPLATES = [
  { id:'dsa', name:'Core DSA', icon:'{ }', color:'#4c8dff', desc:'Arrays, hashing, trees and graphs. The classic SWE coding screen.', form:{ template:'coding-challenge', targetRole:'', durationMinutes:75, difficultyMix:{ easy:30, medium:50, hard:20 }, skillTags:['Arrays','Hash Table','Trees','Graphs','DP'] }, count:3, kw:['array','hash','tree','graph','dynamic','dp'] },
  { id:'fe', name:'Frontend Developer', icon:'</>', color:'#ff6bd6', desc:'String and data-shaping problems suited to UI engineers.', form:{ template:'coding-challenge', targetRole:'Frontend Engineer', durationMinutes:60, difficultyMix:{ easy:40, medium:60, hard:0 }, skillTags:['String','Hash Table','Arrays'] }, count:3, kw:['string','hash','array','stack'] },
  { id:'sys', name:'Systems Engineer', icon:'SYS', color:'#f4b740', desc:'Graphs, heaps and scheduling-style problems for infra roles.', form:{ template:'coding-challenge', targetRole:'DevOps / SRE', durationMinutes:90, difficultyMix:{ easy:0, medium:60, hard:40 }, skillTags:['Graphs','Heap','Concurrency'] }, count:3, kw:['graph','heap','priority','concurren','bfs','dfs','topolog'] },
  { id:'be', name:'Backend & APIs', icon:'API', color:'#35e0ff', desc:'Caching, design and hashing problems for service engineers.', form:{ template:'coding-challenge', targetRole:'Backend Engineer', durationMinutes:75, difficultyMix:{ easy:0, medium:60, hard:40 }, skillTags:['Hash Table','APIs','Sorting'] }, count:3, kw:['hash','design','cache','lru','queue','sort'] },
  { id:'ng', name:'New Grad Screen', icon:'NG', color:'#39ff88', desc:'Short, fair filter for high-volume campus hiring.', form:{ template:'coding-challenge', targetRole:'', durationMinutes:45, difficultyMix:{ easy:50, medium:50, hard:0 }, skillTags:['Arrays','String'] }, count:2, kw:['array','string','two pointer'] },
  { id:'sql', name:'Data & SQL', icon:'SQL', color:'#b18cff', desc:'Query and data-handling problems for data roles.', form:{ template:'coding-challenge', targetRole:'Data Engineer', durationMinutes:60, difficultyMix:{ easy:30, medium:70, hard:0 }, skillTags:['SQL','Sorting'] }, count:3, kw:['sql','database','sort','join'] },
];
function pickProblems(problems, tpl) {
  const mix = tpl.form.difficultyMix, total = tpl.count;
  const want = { Easy: Math.round((mix.easy / 100) * total), Medium: Math.round((mix.medium / 100) * total), Hard: 0 };
  want.Hard = Math.max(0, total - want.Easy - want.Medium);
  const matches = (p) => (p.tags || []).some((t) => tpl.kw.some((k) => String(t).toLowerCase().includes(k))) || tpl.kw.some((k) => String(p.title || '').toLowerCase().includes(k));
  const chosen = [];
  ['Easy', 'Medium', 'Hard'].forEach((d) => {
    const pool = problems.filter((p) => p.difficulty === d && !chosen.includes(p));
    const ordered = [...pool.filter(matches), ...pool.filter((p) => !matches(p))];
    chosen.push(...ordered.slice(0, want[d]));
  });
  if (chosen.length < total) chosen.push(...problems.filter((p) => !chosen.includes(p)).slice(0, total - chosen.length));
  return chosen;
}

// ─── Create Assessment Modal ──────────────────────────────────────────────────
function CreateAssessmentModal({ problems, initial, onClose, onCreate }) {
  const TEMPLATES = [
    { id:'coding-challenge', label:'Coding Challenge', emoji:'💻', desc:'DSA problems, live editor, auto-graded' },
    { id:'system-design',    label:'System Design',   emoji:'🏗️', desc:'Architecture questions, chat-based'  },
    { id:'full-stack',       label:'Full-Stack',      emoji:'🔗', desc:'Mix of coding, design, behaviorals'  },
    { id:'custom',           label:'Custom',          emoji:'⚙️', desc:'Build from scratch'                  },
  ];
  const [form, setForm] = useState(() => ({
    title:'', description:'', companyName:'', companyLogo:'💼', targetRole:'', template:'coding-challenge',
    problemIds:[], customProblems:[], durationMinutes:60, difficultyMix:{ easy:30, medium:50, hard:20 }, skillTags:[],
    defaultLanguage:'python3', allowedLanguages:['python3','javascript','java','cpp17','c'],
    integrity:{ proctored:true, webcam:false, browserLockdown:false, randomizeOrder:false, plagiarism:true, aiTracking:true, hideTimer:false },
    scoring:{ mode:'auto', passThreshold:70, partialCredit:true, codeQuality:false, aiHiringReport:true, showScoreToCandidate:false },
    access:{ type:'open', password:'', allowedDomain:'', maxCandidates:'', maxAttempts:1, cooldownHours:24, requireEmailVerification:true, allowLanguageSwitching:true, expiresAt:'' },
    invitedEmails:[], sendImmediately:true,
    branding:{ logoUrl:'', accentColor:'#1a73e8', welcomeMessage:'', completionMessage:'' },
    notifications:{ emailOnCompletion:true, slackWebhook:'', dailyDigest:false, integrityAlerts:true },
    ...(initial || {}),
  }));
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingCustom, setEditingCustom] = useState(null);
  const BLANK_Q = () => ({ id: 'custom-' + Date.now(), title: '', description: '', difficulty: 'Medium', tags: [], constraints: '', points: 100,
    examples: [{ input: '', output: '', explanation: '' }], testCases: [{ input: '', output: '', hidden: true }], _tagInput: '' });
  const [customDraft, setCustomDraft] = useState(BLANK_Q);

  const set = (path, val) => setForm(f => {
    const parts = path.split('.');
    if (parts.length === 1) return { ...f, [path]: val };
    return { ...f, [parts[0]]: { ...f[parts[0]], [parts[1]]: val } };
  });
  const toggleProblem = (id) => set('problemIds', form.problemIds.includes(id) ? form.problemIds.filter(p => p !== id) : [...form.problemIds, id]);
  const toggleTag = (tag) => set('skillTags', form.skillTags.includes(tag) ? form.skillTags.filter(t => t !== tag) : [...form.skillTags, tag]);
  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !e.includes('@') || form.invitedEmails.includes(e)) return;
    set('invitedEmails', [...form.invitedEmails, e]); setEmailInput('');
  };
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !showCustomForm) onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose, showCustomForm]);

  const handleCreate = async () => {
    if (!form.title || !form.companyName) { setError('Title and company name are required.'); return; }
    if (form.problemIds.length === 0 && (form.customProblems || []).length === 0 && form.template !== 'system-design') {
      setError('Select at least one problem or add a custom question.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const payload = { ...form, expiresAt: form.access.expiresAt || undefined, proctored: form.integrity.proctored };
      const res = await axios.post(`${API_BASE}/assessments`, payload, { headers: await authHeaders() });
      onCreate({ ...res.data, title: form.title, companyName: form.companyName, targetRole: form.targetRole });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment.');
    } finally { setSubmitting(false); }
  };

  const diffColor = { Easy:'#00c896', Medium:'#f5c542', Hard:'#ff4d4d' };
  const SKILL_TAGS = ['Arrays','DP','Graphs','Trees','Binary Search','SQL','React','APIs','Sorting','Concurrency','Bit Manipulation','String','Hash Table','Heap','Two Pointers'];
  const activeIntegrityCount = Object.values(form.integrity).filter(Boolean).length;
  const customDisabled = !customDraft.title.trim() || !customDraft.description.trim();

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'Inter, system-ui, sans-serif' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="ca-title" initial={{ scale:0.96, y:16 }} animate={{ scale:1, y:0 }}
        style={{ background:'#0b1020', border:'1px solid #4c8dff55', borderRadius:20, padding:0, width:'100%', maxWidth:680, maxHeight:'92vh', overflowY:'auto', position:'relative', boxShadow:'0 30px 80px rgba(0,0,0,.6), 0 0 40px rgba(76,141,255,.15)' }}>
        <div style={{ position:'sticky', top:0, zIndex:10, background:'#0b1020', borderBottom:'1px solid #1e2a3a', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'20px 20px 0 0' }}>
          <div>
            <h2 id="ca-title" style={{ margin:0, color:'#eef2f8', fontSize:18, fontWeight:800 }}>{initial?._templateName ? `${initial._templateName} assessment` : 'Create assessment'}</h2>
            <p style={{ margin:'2px 0 0', color:'#8a97ad', fontSize:12 }}>
              {initial?._templateName ? 'Pre-filled from the template. Change anything you like. · ' : ''}
              {form.problemIds.length} problem{form.problemIds.length !== 1 ? 's' : ''} selected
              {form.invitedEmails.length > 0 ? ` · ${form.invitedEmails.length} candidate${form.invitedEmails.length !== 1 ? 's' : ''} to invite` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background:'#1e2a3a', border:'none', color:'#bbb', cursor:'pointer', fontSize:16, width:34, height:34, borderRadius:8 }}>✕</button>
        </div>

        <div style={{ padding:'16px 20px 24px' }}>
          <AccordionSection title="Template & Basics" icon="🎯" color="#4c8dff" defaultOpen badge="required">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:14 }}>
              {TEMPLATES.map(t => (
                <button type="button" key={t.id} onClick={() => set('template', t.id)} aria-pressed={form.template === t.id}
                  style={{ background: form.template === t.id ? '#4c8dff14' : '#060910', border:`1px solid ${form.template === t.id ? '#4c8dff' : '#1e2a3a'}`, borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}><span style={{ fontSize:16 }}>{t.emoji}</span><span style={{ color: form.template === t.id ? '#8fb6ff' : '#ccc', fontSize:12, fontWeight:700 }}>{t.label}</span></div>
                  <div style={{ color:'#8a97ad', fontSize:10 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div><label style={lbl} htmlFor="ca-co">Company Name *</label><input id="ca-co" value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="e.g. Google, Stripe" style={inp}/></div>
              <div><label style={lbl} htmlFor="ca-t">Assessment Title *</label><input id="ca-t" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Backend Engineer Round 1" style={inp}/></div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl} htmlFor="ca-role">Target Role</label>
                <select id="ca-role" value={form.targetRole} onChange={e => set('targetRole', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  <option value="">Select role...</option>
                  {['Backend Engineer','Frontend Engineer','Full-Stack Engineer','Data Engineer','DevOps / SRE','ML Engineer','Engineering Manager'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div><label style={lbl} htmlFor="ca-logo">Company Logo (emoji or URL)</label><input id="ca-logo" value={form.companyLogo} onChange={e => set('companyLogo', e.target.value)} placeholder="💼 or https://..." style={inp}/></div>
            </div>
            <div><label style={lbl} htmlFor="ca-desc">Description / Instructions</label><textarea id="ca-desc" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Welcome to our technical assessment. Read each question carefully..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          </AccordionSection>

          <AccordionSection title="Problems & Difficulty" icon="💻" color="#a855f7" defaultOpen badge={`${form.problemIds.length} selected`}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
              {[{k:'easy',label:'Easy',color:'#00c896'},{k:'medium',label:'Medium',color:'#f5c542'},{k:'hard',label:'Hard',color:'#ff4d4d'}].map(d => (
                <div key={d.k} style={{ background:'#060910', border:`1px solid ${d.color}30`, borderRadius:8, padding:'10px 10px 8px' }}>
                  <div style={{ fontSize:10, color:'#8a97ad', marginBottom:6 }}>{d.label}</div>
                  <div style={{ fontSize:18, fontWeight:900, color:d.color, marginBottom:4 }}>{form.difficultyMix[d.k]}%</div>
                  <input type="range" aria-label={`${d.label} share`} min={0} max={100} step={5} value={form.difficultyMix[d.k]} onChange={e => set('difficultyMix', { ...form.difficultyMix, [d.k]: Number(e.target.value) })} style={{ width:'100%' }}/>
                </div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
              <div><label style={lbl} htmlFor="ca-dur">Duration (min)</label><input id="ca-dur" type="number" value={form.durationMinutes} onChange={e => set('durationMinutes', Number(e.target.value))} min={15} max={300} style={inp}/></div>
              <div>
                <label style={lbl} htmlFor="ca-lang">Default Language</label>
                <select id="ca-lang" value={form.defaultLanguage} onChange={e => set('defaultLanguage', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                  {['python3','javascript','java','cpp17','c','csharp','go','rust'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div><label style={lbl} htmlFor="ca-exp">Expires At</label><input id="ca-exp" type="datetime-local" value={form.access.expiresAt} onChange={e => set('access.expiresAt', e.target.value)} style={inp}/></div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Skill Tags</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {SKILL_TAGS.map(t => { const on = form.skillTags.includes(t); return (
                  <button type="button" key={t} aria-pressed={on} onClick={() => toggleTag(t)} style={{ background: on ? '#a855f722' : '#060910', border:`1px solid ${on ? '#a855f760' : '#1e2a3a'}`, borderRadius:99, padding:'3px 10px', color: on ? '#c99bff' : '#8a97ad', fontSize:10, fontWeight:600, cursor:'pointer' }}>{t}</button>
                ); })}
              </div>
            </div>
            {(form.customProblems||[]).length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ ...lbl, marginBottom:6 }}>✏️ Custom Questions ({form.customProblems.length})</div>
                {form.customProblems.map((q, qi) => (
                  <div key={q.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#0d1f0d', border:'1px solid #00c89630', borderRadius:8, marginBottom:5 }}>
                    <div style={{ flex:1, minWidth:0 }}><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600 }}>{q.title || 'Untitled question'}</div><div style={{ color:'#8a97ad', fontSize:10 }}>{q.tags.join(' · ')} · {q.points} pts</div></div>
                    <span style={{ color:diffColor[q.difficulty]||'#888', fontSize:9, fontWeight:700, background:(diffColor[q.difficulty]||'#888')+'22', padding:'2px 7px', borderRadius:99 }}>{q.difficulty}</span>
                    <button type="button" aria-label="Edit question" onClick={() => { setCustomDraft({...q, _tagInput:''}); setEditingCustom(qi); setShowCustomForm(true); }} style={{ background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:12 }}>✏️</button>
                    <button type="button" aria-label="Remove question" onClick={() => set('customProblems', form.customProblems.filter((_,i)=>i!==qi))} style={{ background:'none', border:'none', color:'#ff6b6b', cursor:'pointer', fontSize:13 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6, gap:8, flexWrap:'wrap' }}>
                <span style={{ ...lbl, margin:0 }}>Select Problems ({form.problemIds.length} from library{(form.customProblems||[]).length>0?` + ${form.customProblems.length} custom`:''})</span>
                <button type="button" onClick={() => { setCustomDraft(BLANK_Q()); setEditingCustom(null); setShowCustomForm(true); }} style={{ background:'#00c89614', border:'1px solid #00c89640', borderRadius:7, color:'#00c896', cursor:'pointer', fontSize:11, fontWeight:700, padding:'5px 11px' }}>✏️ Create custom question</button>
              </div>
              <div style={{ border:'1px solid #1e2a3a', borderRadius:10, maxHeight:220, overflowY:'auto', background:'#060910' }}>
                {problems.length === 0 ? <div style={{ padding:20, color:'#8a97ad', fontSize:13, textAlign:'center' }}>No problems in library yet.</div>
                  : problems.map((p, i) => { const sel = form.problemIds.includes(p.id); return (
                    <button type="button" key={p.id} aria-pressed={sel} onClick={() => toggleProblem(p.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 14px', border:'none', borderBottom: i < problems.length - 1 ? '1px solid #0f1923' : 'none', cursor:'pointer', background: sel ? '#a855f710' : 'transparent', textAlign:'left' }}>
                      <span style={{ width:16, height:16, borderRadius:4, border:`2px solid ${sel ? '#a855f7' : '#444'}`, background: sel ? '#a855f7' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, color:'#fff' }}>{sel ? '✓' : ''}</span>
                      <span style={{ flex:1, minWidth:0 }}><span style={{ display:'block', color:'#e8e8e8', fontSize:12, fontWeight:600 }}>{p.title}</span><span style={{ display:'block', color:'#8a97ad', fontSize:10 }}>{p.tags?.slice(0,2).join(' · ')}</span></span>
                      <span style={{ color:diffColor[p.difficulty]||'#888', fontSize:10, fontWeight:700, flexShrink:0 }}>{p.difficulty}</span>
                    </button>
                  ); })}
              </div>
            </div>

            {showCustomForm && (
              <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.88)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={e => e.target === e.currentTarget && setShowCustomForm(false)}>
                <div role="dialog" aria-modal="true" aria-labelledby="cq-title" style={{ background:'#0b1020', border:'1px solid #00c89640', borderRadius:18, width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', padding:'0 0 24px' }}>
                  <div style={{ position:'sticky', top:0, background:'#0b1020', borderBottom:'1px solid #1e2a3a', padding:'16px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:10 }}>
                    <div><h3 id="cq-title" style={{ margin:0, color:'#e8e8e8', fontSize:15, fontWeight:800 }}>✏️ {editingCustom !== null ? 'Edit' : 'Create'} Custom Question</h3><p style={{ margin:'2px 0 0', color:'#8a97ad', fontSize:11 }}>This question will appear only in this assessment</p></div>
                    <button type="button" aria-label="Close" onClick={() => setShowCustomForm(false)} style={{ background:'#1e2a3a', border:'none', color:'#bbb', cursor:'pointer', fontSize:14, width:30, height:30, borderRadius:7 }}>✕</button>
                  </div>
                  <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:13 }}>
                    <div><label style={lbl} htmlFor="cq-t">Question Title *</label><input id="cq-t" value={customDraft.title} onChange={e => setCustomDraft(d=>({...d,title:e.target.value}))} placeholder="e.g. Design a rate limiter for our payments API" style={inp}/></div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div><span style={lbl}>Difficulty</span><div style={{ display:'flex', gap:6 }}>
                        {['Easy','Medium','Hard'].map(d => (
                          <button type="button" key={d} aria-pressed={customDraft.difficulty===d} onClick={() => setCustomDraft(dr=>({...dr, difficulty:d, points: d==='Easy'?50:d==='Medium'?100:200}))}
                            style={{ flex:1, padding:'7px 0', borderRadius:8, border:`1px solid ${customDraft.difficulty===d ? diffColor[d]+'80' : '#1e2a3a'}`, background: customDraft.difficulty===d ? diffColor[d]+'18' : '#060910', color: customDraft.difficulty===d ? diffColor[d] : '#8a97ad', fontSize:11, fontWeight:700, cursor:'pointer' }}>{d}</button>
                        ))}</div></div>
                      <div><label style={lbl} htmlFor="cq-pts">Points</label><input id="cq-pts" type="number" value={customDraft.points} onChange={e => setCustomDraft(d=>({...d,points:Number(e.target.value)}))} min={10} max={500} style={inp}/></div>
                    </div>
                    <div><label style={lbl} htmlFor="cq-d">Problem Description *</label><textarea id="cq-d" value={customDraft.description} onChange={e => setCustomDraft(d=>({...d,description:e.target.value}))} placeholder="Describe the problem clearly. Include context, constraints, and what the candidate should do..." rows={4} style={{ ...inp, resize:'vertical', lineHeight:1.6 }}/></div>
                    <div><label style={lbl} htmlFor="cq-c">Constraints (optional)</label><textarea id="cq-c" value={customDraft.constraints} onChange={e => setCustomDraft(d=>({...d,constraints:e.target.value}))} placeholder={'e.g. 1 ≤ n ≤ 10^5\nTime limit: 2 seconds'} rows={2} style={{ ...inp, resize:'vertical' }}/></div>
                    <div>
                      <label style={lbl} htmlFor="cq-tag">Tags</label>
                      <input id="cq-tag" value={customDraft._tagInput||''} onChange={e => setCustomDraft(d=>({...d,_tagInput:e.target.value}))}
                        onKeyDown={e => { if (e.key==='Enter' && customDraft._tagInput?.trim()) { e.preventDefault(); setCustomDraft(d=>({...d, tags:[...d.tags, d._tagInput.trim()], _tagInput:''})); } }}
                        placeholder="Type a tag and press Enter" style={{ ...inp, fontSize:11, marginBottom:6 }}/>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {customDraft.tags.map(t => (
                          <span key={t} style={{ background:'#1a73e815', border:'1px solid #1a73e830', borderRadius:99, padding:'2px 8px', color:'#8fb6ff', fontSize:10, display:'flex', alignItems:'center', gap:4 }}>{t}
                            <button type="button" aria-label={`Remove ${t}`} onClick={() => setCustomDraft(d=>({...d,tags:d.tags.filter(x=>x!==t)}))} style={{ background:'none', border:'none', color:'#8fb6ff', cursor:'pointer', padding:0, fontSize:12 }}>✕</button></span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}><span style={{ ...lbl, margin:0 }}>Examples (shown to candidate)</span>
                        <button type="button" onClick={() => setCustomDraft(d=>({...d,examples:[...d.examples,{input:'',output:'',explanation:''}]}))} style={{ background:'none', border:'1px solid #1e2a3a', borderRadius:6, color:'#aaa', cursor:'pointer', fontSize:11, padding:'2px 8px' }}>+ Add</button></div>
                      {customDraft.examples.map((ex, ei) => (
                        <div key={ei} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:8, padding:'10px 12px', marginBottom:7 }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:6 }}>
                            <div><span style={{ ...lbl, fontSize:9 }}>Input</span><textarea aria-label="Example input" value={ex.input} onChange={e=>setCustomDraft(d=>({...d,examples:d.examples.map((x,i)=>i===ei?{...x,input:e.target.value}:x)}))} rows={2} style={{ ...inp, fontSize:11, resize:'vertical' }}/></div>
                            <div><span style={{ ...lbl, fontSize:9 }}>Expected Output</span><textarea aria-label="Example output" value={ex.output} onChange={e=>setCustomDraft(d=>({...d,examples:d.examples.map((x,i)=>i===ei?{...x,output:e.target.value}:x)}))} rows={2} style={{ ...inp, fontSize:11, resize:'vertical' }}/></div>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                            <div style={{ flex:1 }}><span style={{ ...lbl, fontSize:9 }}>Explanation (optional)</span><input aria-label="Example explanation" value={ex.explanation} onChange={e=>setCustomDraft(d=>({...d,examples:d.examples.map((x,i)=>i===ei?{...x,explanation:e.target.value}:x)}))} style={{ ...inp, fontSize:11 }}/></div>
                            {customDraft.examples.length > 1 && <button type="button" aria-label="Remove example" onClick={()=>setCustomDraft(d=>({...d,examples:d.examples.filter((_,i)=>i!==ei)}))} style={{ background:'none', border:'none', color:'#ff6b6b', cursor:'pointer', fontSize:16, marginTop:18 }}>✕</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}><span style={{ ...lbl, margin:0 }}>Test Cases (hidden ones are used for grading)</span>
                        <button type="button" onClick={()=>setCustomDraft(d=>({...d,testCases:[...d.testCases,{input:'',output:'',hidden:true}]}))} style={{ background:'none', border:'1px solid #1e2a3a', borderRadius:6, color:'#aaa', cursor:'pointer', fontSize:11, padding:'2px 8px' }}>+ Add</button></div>
                      {customDraft.testCases.map((tc, ti) => (
                        <div key={ti} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                          <input aria-label="Test input" value={tc.input} onChange={e=>setCustomDraft(d=>({...d,testCases:d.testCases.map((x,i)=>i===ti?{...x,input:e.target.value}:x)}))} placeholder="Input" style={{ ...inp, flex:1, fontSize:11 }}/>
                          <span style={{ color:'#555', flexShrink:0 }}>→</span>
                          <input aria-label="Expected output" value={tc.output} onChange={e=>setCustomDraft(d=>({...d,testCases:d.testCases.map((x,i)=>i===ti?{...x,output:e.target.value}:x)}))} placeholder="Expected output" style={{ ...inp, flex:1, fontSize:11 }}/>
                          <button type="button" aria-label={tc.hidden ? 'Hidden from candidate' : 'Visible to candidate'} onClick={()=>setCustomDraft(d=>({...d,testCases:d.testCases.map((x,i)=>i===ti?{...x,hidden:!x.hidden}:x)}))} style={{ background: tc.hidden?'#ff4d4d22':'#1e2a3a', border:`1px solid ${tc.hidden?'#ff4d4d44':'#1e2a3a'}`, borderRadius:6, color:tc.hidden?'#ff6b6b':'#aaa', cursor:'pointer', fontSize:10, padding:'5px 8px', flexShrink:0 }}>{tc.hidden ? '🔒' : '👁'}</button>
                          {customDraft.testCases.length > 1 && <button type="button" aria-label="Remove test case" onClick={()=>setCustomDraft(d=>({...d,testCases:d.testCases.filter((_,i)=>i!==ti)}))} style={{ background:'none', border:'none', color:'#ff6b6b', cursor:'pointer', fontSize:14 }}>✕</button>}
                        </div>
                      ))}
                    </div>
                    <button type="button" disabled={customDisabled}
                      onClick={() => {
                        const cleaned = { ...customDraft }; delete cleaned._tagInput;
                        const prev = form.customProblems || [];
                        set('customProblems', editingCustom !== null ? prev.map((q,i) => i===editingCustom ? cleaned : q) : [...prev, cleaned]);
                        setShowCustomForm(false); setEditingCustom(null);
                      }}
                      style={{ width:'100%', padding:'12px 0', borderRadius:10, background: customDisabled ? '#1e2a3a' : 'linear-gradient(135deg,#00c896,#059669)', border:'none', color: customDisabled ? '#666' : '#fff', cursor: customDisabled ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700 }}>
                      {editingCustom !== null ? '💾 Save Changes' : '✅ Add to Assessment'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </AccordionSection>

          <AccordionSection title="Integrity & Proctoring" icon="🛡️" color="#f97316" badge={`${activeIntegrityCount} active`}>
            {[
              { key:'proctored', label:'Proctored session', desc:'Log all tab switches, copy/paste, and suspicious activity', color:'#f97316' },
              { key:'webcam', label:'Webcam monitoring', desc:'Periodic snapshots for recruiter review. Requires permission', color:'#f97316' },
              { key:'browserLockdown', label:'Browser lockdown', desc:'Prevent new tabs, DevTools, and external resources', color:'#ff4d4d' },
              { key:'randomizeOrder', label:'Randomize question order', desc:'Shuffle problems so each candidate sees a different order', color:'#f59e0b' },
              { key:'plagiarism', label:'Plagiarism detection', desc:'Flag code similarity against known solutions and other submissions', color:'#f97316' },
              { key:'aiTracking', label:'AI usage tracking', desc:'Detect and log AI-assisted code patterns', color:'#f97316' },
              { key:'hideTimer', label:'Hide timer from candidate', desc:'Candidate cannot see remaining time', color:'#f59e0b' },
            ].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, paddingBottom:10, marginBottom:10 }}>
                <div style={{ flex:1 }}><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:2 }}>{s.label}</div><div style={{ color:'#8a97ad', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.integrity[s.key]} onChange={() => set('integrity', { ...form.integrity, [s.key]: !form.integrity[s.key] })} color={s.color}/>
              </div>
            ))}
          </AccordionSection>

          <AccordionSection title="Scoring & Evaluation" icon="📊" color="#10b981">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
              {[{id:'auto',label:'Auto-grade',desc:'All test cases run automatically. Results instant',icon:'🤖'},{id:'manual',label:'Manual review',desc:'Reviewer grades manually. AI suggests a score',icon:'👤'}].map(m => (
                <button type="button" key={m.id} aria-pressed={form.scoring.mode === m.id} onClick={() => set('scoring.mode', m.id)} style={{ background: form.scoring.mode === m.id ? '#10b98114' : '#060910', border:`1px solid ${form.scoring.mode === m.id ? '#10b981' : '#1e2a3a'}`, borderRadius:8, padding:'10px 12px', cursor:'pointer', textAlign:'left' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}><span>{m.icon}</span><span style={{ color: form.scoring.mode === m.id ? '#34d399' : '#ccc', fontSize:12, fontWeight:700 }}>{m.label}</span></div>
                  <div style={{ color:'#8a97ad', fontSize:10 }}>{m.desc}</div>
                </button>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl} htmlFor="ca-pass">Pass threshold (points)</label><input id="ca-pass" type="number" value={form.scoring.passThreshold} onChange={e => set('scoring.passThreshold', Number(e.target.value))} min={0} style={inp}/></div>
              <div style={{ display:'flex', alignItems:'flex-end' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, width:'100%' }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600 }}>Partial credit</div><div style={{ color:'#8a97ad', fontSize:10 }}>Award points for partially passing solutions</div></div>
                <Toggle on={form.scoring.partialCredit} onChange={() => set('scoring.partialCredit', !form.scoring.partialCredit)} color="#10b981"/></div></div>
            </div>
            {[{ key:'codeQuality', label:'Code quality score', desc:'AI rates readability and naming in addition to correctness' },
              { key:'aiHiringReport', label:'Generate AI hiring report', desc:'Full report with dimension scores, recommendation, and evidence' },
              { key:'showScoreToCandidate', label:'Show score to candidate', desc:'Candidates see their result immediately after submitting' }].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#8a97ad', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.scoring[s.key]} onChange={() => set('scoring', { ...form.scoring, [s.key]: !form.scoring[s.key] })} color="#10b981"/>
              </div>
            ))}
          </AccordionSection>

          <AccordionSection title="Access Control" icon="🔐" color="#06b6d4">
            <div style={{ marginBottom:12 }}>
              <label style={lbl} htmlFor="ca-acc">Access type</label>
              <select id="ca-acc" value={form.access.type} onChange={e => set('access.type', e.target.value)} style={{ ...inp, cursor:'pointer' }}>
                <option value="open">Open: anyone with the link can attempt</option>
                <option value="invite-only">Invite only: only emailed candidates</option>
                <option value="password">Password protected: candidate needs a code</option>
                <option value="domain">Domain restricted: only @yourcompany.com emails</option>
              </select>
            </div>
            {form.access.type === 'password' && <div style={{ marginBottom:12 }}><label style={lbl} htmlFor="ca-pw">Access Code</label><input id="ca-pw" value={form.access.password} onChange={e => set('access.password', e.target.value)} placeholder="e.g. GOOGLE2024" style={inp}/></div>}
            {form.access.type === 'domain' && <div style={{ marginBottom:12 }}><label style={lbl} htmlFor="ca-dom">Allowed Domain</label><input id="ca-dom" value={form.access.allowedDomain} onChange={e => set('access.allowedDomain', e.target.value)} placeholder="yourcompany.com" style={inp}/></div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl} htmlFor="ca-max">Max candidates</label><input id="ca-max" type="number" value={form.access.maxCandidates} onChange={e => set('access.maxCandidates', e.target.value)} placeholder="Unlimited" min={1} style={inp}/></div>
              <div><label style={lbl} htmlFor="ca-att">Max attempts per candidate</label>
                <select id="ca-att" value={form.access.maxAttempts} onChange={e => set('access.maxAttempts', Number(e.target.value))} style={{ ...inp, cursor:'pointer' }}>{[1,2,3].map(n => <option key={n} value={n}>{n} {n===1?'(no retakes)':''}</option>)}</select></div>
            </div>
            {[{ key:'requireEmailVerification', label:'Require email verification', desc:'Candidate must verify email before starting' },
              { key:'allowLanguageSwitching', label:'Allow language switching', desc:'Candidates can change coding language mid-assessment' }].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#8a97ad', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.access[s.key]} onChange={() => set('access', { ...form.access, [s.key]: !form.access[s.key] })} color="#06b6d4"/>
              </div>
            ))}
          </AccordionSection>

          <AccordionSection title="Invite Candidates" icon="📨" color="#ec4899" badge={form.invitedEmails.length > 0 ? `${form.invitedEmails.length} queued` : 'optional'}>
            <div style={{ display:'flex', gap:8, marginBottom:10 }}>
              <input aria-label="Candidate email" value={emailInput} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }} placeholder="candidate@email.com" type="email" style={{ ...inp, flex:1 }}/>
              <button type="button" onClick={addEmail} style={{ background:'#ec489922', border:'1px solid #ec489944', borderRadius:8, color:'#f472b6', cursor:'pointer', fontSize:12, fontWeight:700, padding:'8px 14px', flexShrink:0 }}>+ Add</button>
            </div>
            {form.invitedEmails.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
                {form.invitedEmails.map(e => (
                  <span key={e} style={{ background:'#ec489911', border:'1px solid #ec489933', borderRadius:99, padding:'3px 10px', color:'#f472b6', fontSize:10, display:'flex', alignItems:'center', gap:5 }}>{e}
                    <button type="button" aria-label={`Remove ${e}`} onClick={() => set('invitedEmails', form.invitedEmails.filter(x => x !== e))} style={{ background:'none', border:'none', color:'#f472b6', cursor:'pointer', padding:0, fontSize:12 }}>✕</button></span>
                ))}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>Send invites immediately on create</div><div style={{ color:'#8a97ad', fontSize:10 }}>Email candidates as soon as the assessment is published</div></div>
              <Toggle on={form.sendImmediately} onChange={() => set('sendImmediately', !form.sendImmediately)} color="#ec4899"/>
            </div>
          </AccordionSection>

          <AccordionSection title="Branding & Messages" icon="🎨" color="#f59e0b">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
              <div><label style={lbl} htmlFor="ca-lu">Company logo URL</label><input id="ca-lu" value={form.branding.logoUrl} onChange={e => set('branding.logoUrl', e.target.value)} placeholder="https://yourcompany.com/logo.png" style={inp}/></div>
              <div><label style={lbl} htmlFor="ca-ac">Brand accent color</label>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="color" aria-label="Accent color picker" value={form.branding.accentColor} onChange={e => set('branding.accentColor', e.target.value)} style={{ ...inp, width:60, padding:4, cursor:'pointer' }}/>
                  <input id="ca-ac" value={form.branding.accentColor} onChange={e => set('branding.accentColor', e.target.value)} style={{ ...inp, flex:1 }}/>
                </div></div>
            </div>
            <div style={{ marginBottom:10 }}><label style={lbl} htmlFor="ca-wm">Welcome message (shown before start)</label><textarea id="ca-wm" value={form.branding.welcomeMessage} onChange={e => set('branding.welcomeMessage', e.target.value)} placeholder="Welcome! This assessment tests your problem-solving skills..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
            <div><label style={lbl} htmlFor="ca-cm">Completion message (shown after submit)</label><textarea id="ca-cm" value={form.branding.completionMessage} onChange={e => set('branding.completionMessage', e.target.value)} placeholder="Thank you for completing the assessment..." rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          </AccordionSection>

          <AccordionSection title="Notifications" icon="🔔" color="#8b5cf6">
            {[{ key:'emailOnCompletion', label:'Email on completion', desc:'Notify recruiters when a candidate submits', color:'#8b5cf6' },
              { key:'dailyDigest', label:'Daily digest', desc:'Summary of all submissions every morning', color:'#8b5cf6' },
              { key:'integrityAlerts', label:'Integrity alerts', desc:'Alert when proctoring flags suspicious activity', color:'#ff4d4d' }].map(s => (
              <div key={s.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:10 }}>
                <div><div style={{ color:'#e8e8e8', fontSize:12, fontWeight:600, marginBottom:1 }}>{s.label}</div><div style={{ color:'#8a97ad', fontSize:10 }}>{s.desc}</div></div>
                <Toggle on={form.notifications[s.key]} onChange={() => set('notifications', { ...form.notifications, [s.key]: !form.notifications[s.key] })} color={s.color}/>
              </div>
            ))}
            <div><label style={lbl} htmlFor="ca-slack">Slack webhook URL (optional)</label><input id="ca-slack" value={form.notifications.slackWebhook} onChange={e => set('notifications.slackWebhook', e.target.value)} placeholder="https://hooks.slack.com/services/..." style={inp}/></div>
          </AccordionSection>

          {error && <div role="alert" style={{ background:'#ff4d4d11', border:'1px solid #ff4d4d33', borderRadius:8, padding:'8px 14px', color:'#ff8a8a', fontSize:12, marginBottom:8 }}>{error}</div>}
          <button type="button" onClick={handleCreate} disabled={submitting}
            style={{ width:'100%', marginTop:4, background: submitting ? '#1e2a3a' : 'linear-gradient(180deg, #5b98ff, #2f6bf0)', border:'none', borderRadius:12, color: submitting ? '#777' : '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize:15, fontWeight:800, padding:'14px 0', boxShadow: submitting ? 'none' : '0 0 0 1px rgba(150,190,255,.6) inset, 0 10px 30px rgba(47,107,240,.45)' }}>
            {submitting ? 'Creating assessment…' : 'Create assessment & get invite link'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Candidate Results Modal ──────────────────────────────────────────────────
function CandidateResults({ assessmentId, onClose }) {
  const [results, setResults] = useState([]);
  const [threshold, setThreshold] = useState(70);
  const [analytics, setAnalytics] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [note, setNote] = useState('');
  const [submNote, setSubmNote] = useState(false);
  const [activeTab, setActiveTab] = useState('results');

  const load = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const headers = await authHeaders();
      const [rRes, aRes] = await Promise.all([
        axios.get(`${API_BASE}/assessments/${assessmentId}/results`, { headers }),
        axios.get(`${API_BASE}/assessments/${assessmentId}/analytics`, { headers }),
      ]);
      setResults(rRes.data.results || []); setThreshold(rRes.data.passThreshold ?? 70); setAnalytics(aRes.data.analytics || null);
    } catch (e) { setLoadError(e.response?.data?.error || 'Could not load results.'); }
    finally { setLoading(false); }
  }, [assessmentId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [onClose]);

  const makeDecision = async (userId, decision) => {
    try { await axios.post(`${API_BASE}/assessments/${assessmentId}/results/${userId}/decision`, { decision }, { headers: await authHeaders() }); load(); }
    catch (e) { console.error(e); }
  };
  const saveNote = async (userId) => {
    if (!note.trim()) return;
    setSubmNote(true);
    try { await axios.post(`${API_BASE}/assessments/${assessmentId}/results/${userId}/note`, { note }, { headers: await authHeaders() }); setNote(''); load(); }
    catch (e) { console.error(e); } finally { setSubmNote(false); }
  };
  const didPass = (r) => (typeof r.passed === 'boolean' ? r.passed : (r.totalScore || 0) >= threshold);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'Inter, system-ui, sans-serif' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-labelledby="cr-title" initial={{ scale:0.96 }} animate={{ scale:1 }}
        style={{ background:'#0b1020', border:'1px solid #1e2a3a', borderRadius:20, width:'100%', maxWidth:780, maxHeight:'92vh', overflowY:'auto', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #1e2a3a', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <h2 id="cr-title" style={{ margin:0, color:'#eef2f8', fontSize:18, fontWeight:800 }}>Candidate results</h2>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background:'#1e2a3a', border:'none', color:'#bbb', cursor:'pointer', fontSize:16, width:34, height:34, borderRadius:8 }}>✕</button>
        </div>
        <div role="tablist" style={{ display:'flex', borderBottom:'1px solid #1e2a3a', flexShrink:0 }}>
          {['results','analytics'].map(t => (
            <button type="button" role="tab" aria-selected={activeTab === t} key={t} onClick={() => setActiveTab(t)}
              style={{ flex:1, padding:'12px', background:'none', border:'none', cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color: activeTab === t ? '#8fb6ff' : '#8a97ad', borderBottom:`2px solid ${activeTab === t ? '#4c8dff' : 'transparent'}` }}>{t}</button>
          ))}
        </div>
        <div style={{ padding:'20px 24px', flex:1, overflowY:'auto' }}>
          {loading && <div style={{ color:'#8a97ad', textAlign:'center', padding:40 }}>Loading…</div>}
          {!loading && loadError && <div role="alert" style={{ color:'#ff8a8a', textAlign:'center', padding:40 }}>{loadError}</div>}
          {!loading && !loadError && activeTab === 'results' && (results.length === 0 ? (
            <div style={{ color:'#8a97ad', textAlign:'center', padding:48 }}>No candidates have completed this assessment yet.</div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
                {[{ label:'Candidates', value:results.length, color:'#8fb6ff' },
                  { label:'Avg Score', value:Math.round(results.reduce((a,r)=>a+(r.totalScore||0),0)/results.length), color:'#c99bff' },
                  { label:'Pass Rate', value:`${Math.round((results.filter(didPass).length/results.length)*100)}%`, color:'#34d399' },
                  { label:'Avg Flags', value:Math.round(results.reduce((a,r)=>a+(r.violationCount||0),0)/results.length), color:'#f5c542' }].map(s => (
                  <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ color:s.color, fontSize:20, fontWeight:900 }}>{s.value}</div><div style={{ color:'#8a97ad', fontSize:9, marginTop:2, textTransform:'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {results.map((r, i) => {
                  const isOpen = selected?.userId === r.userId, passed = didPass(r), dec = r.decision?.value;
                  const good = dec==='hire'||dec==='schedule-next-round';
                  return (
                    <div key={r.userId} style={{ background: isOpen ? '#4c8dff0c' : '#060910', border:`1px solid ${isOpen ? '#4c8dff55' : '#1e2a3a'}`, borderRadius:10, overflow:'hidden' }}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setSelected(isOpen ? null : r)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', cursor:'pointer', background:'none', border:'none', textAlign:'left', flexWrap:'wrap' }}>
                        <span style={{ width:26, height:26, borderRadius:'50%', background: i===0?'#f5c54222':'#1e2a3a', border:`1px solid ${i===0?'#f5c54266':'#333'}`, color:i===0?'#f5c542':'#aaa', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                        <span style={{ flex:1, minWidth:140 }}><span style={{ display:'block', color:'#e8e8e8', fontSize:13, fontWeight:600 }}>{r.displayName || 'Candidate'}</span><span style={{ display:'block', color:'#8a97ad', fontSize:11 }}>{r.email} · {timeAgo(r.completedAt)}{r.autoSubmitted?' (auto)':''}</span></span>
                        <span style={{ display:'flex', gap:12 }}>
                          {[{v:r.solved?.length||0,l:'solved',c:'#34d399'},{v:r.totalScore||0,l:'pts',c:'#c99bff'},{v:r.violationCount||0,l:'flags',c:(r.violationCount||0)>3?'#ff6b6b':'#f5c542'}].map(s=>(
                            <span key={s.l} style={{ textAlign:'center' }}><span style={{ display:'block', color:s.c, fontSize:13, fontWeight:700 }}>{s.v}</span><span style={{ display:'block', color:'#8a97ad', fontSize:9 }}>{s.l}</span></span>
                          ))}
                        </span>
                        <span style={{ background: good?'#00c89622':dec==='reject'?'#ff4d4d14':passed?'#00c89614':'#ff4d4d14', border:`1px solid ${good?'#00c89655':dec==='reject'?'#ff4d4d44':passed?'#00c89644':'#ff4d4d33'}`, borderRadius:99, padding:'3px 10px', color: good||(!dec&&passed)?'#34d399':dec==='hold'?'#f5c542':'#ff8a8a', fontSize:10, fontWeight:700, flexShrink:0 }}>
                          {dec==='hire'?'Hired':dec==='schedule-next-round'?'Next round':dec==='reject'?'Rejected':dec==='hold'?'On hold':passed?'Passed':'Below bar'}
                        </span>
                      </button>
                      {isOpen && (
                        <div style={{ borderTop:'1px solid #1e2a3a', padding:'14px 16px' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                            <div><div style={{ ...lbl }}>Problems solved</div>{r.solved?.length > 0 ? r.solved.map(pid => <div key={pid} style={{ color:'#34d399', fontSize:11, marginBottom:2 }}>✓ {pid} (+{r.scores?.[pid]||0} pts)</div>) : <div style={{ color:'#8a97ad', fontSize:11 }}>None</div>}</div>
                            <div><div style={{ ...lbl }}>Violations</div>{(r.violations||[]).length>0 ? r.violations.slice(0,4).map((v,vi)=><div key={vi} style={{ color:'#ff8a8a', fontSize:11, marginBottom:2 }}>⚠ {v.type?.replace(/_/g,' ')} {v.timestamp ? `· ${new Date(v.timestamp).toLocaleTimeString()}` : ''}</div>) : <div style={{ color:'#34d399', fontSize:11 }}>No violations</div>}</div>
                          </div>
                          <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                            {[{ id:'hire', label:'Hire', color:'#34d399' },{ id:'schedule-next-round', label:'Schedule next round', color:'#8fb6ff' },{ id:'hold', label:'Hold', color:'#f5c542' },{ id:'reject', label:'Reject', color:'#ff8a8a' }].map(d => (
                              <button type="button" key={d.id} aria-pressed={dec===d.id} onClick={() => makeDecision(r.userId, d.id)} style={{ background: dec===d.id?d.color+'22':'#1e2a3a', border:`1px solid ${dec===d.id?d.color:'#1e2a3a'}`, borderRadius:8, color:dec===d.id?d.color:'#bbb', cursor:'pointer', fontSize:12, fontWeight:700, padding:'7px 12px' }}>{d.label}</button>
                            ))}
                          </div>
                          {(r.recruiterNotes||[]).length > 0 && <div style={{ marginBottom:8 }}>{r.recruiterNotes.map((n,ni) => <div key={ni} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:6, padding:'6px 10px', marginBottom:4, color:'#ccc', fontSize:11 }}>{n.note} <span style={{ color:'#8a97ad', fontSize:9 }}>· {n.addedAt ? new Date(n.addedAt).toLocaleString() : ''}</span></div>)}</div>}
                          <div style={{ display:'flex', gap:8 }}>
                            <input aria-label="Private recruiter note" value={note} onChange={e => setNote(e.target.value)} placeholder="Add private recruiter note..." style={{ ...inp, fontSize:12 }}/>
                            <button type="button" onClick={() => saveNote(r.userId)} disabled={submNote||!note.trim()} style={{ background:'#4c8dff22', border:'1px solid #4c8dff55', borderRadius:8, color:'#8fb6ff', cursor:'pointer', fontSize:12, fontWeight:700, padding:'0 14px', flexShrink:0, opacity:submNote||!note.trim()?0.5:1 }}>Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ))}
          {!loading && !loadError && activeTab === 'analytics' && analytics && (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
                {[{ label:'Completed', value:analytics.completed, color:'#34d399' },{ label:'In Progress', value:analytics.inProgress, color:'#f5c542' },{ label:'Invited', value:analytics.invited, color:'#8fb6ff' },
                  { label:'Pass Rate', value:`${analytics.passRate}%`, color:'#34d399' },{ label:'Avg Score', value:analytics.avgScore, color:'#c99bff' },{ label:'Avg Time (min)', value:analytics.avgCompletionMin, color:'#22d3ee' }].map(s => (
                  <div key={s.label} style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'12px 14px', textAlign:'center' }}><div style={{ color:s.color, fontSize:22, fontWeight:900 }}>{s.value}</div><div style={{ color:'#8a97ad', fontSize:9, marginTop:2, textTransform:'uppercase' }}>{s.label}</div></div>
                ))}
              </div>
              <div style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <div style={{ ...lbl, marginBottom:12 }}>Score distribution</div>
                {Object.entries(analytics.scoreDistribution||{}).map(([range, count]) => { const pct = analytics.completed > 0 ? Math.round((count / analytics.completed) * 100) : 0; return (
                  <div key={range} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <span style={{ color:'#8a97ad', fontSize:10, width:56, flexShrink:0 }}>{range}</span>
                    <div style={{ flex:1, height:6, background:'#1e2a3a', borderRadius:99, overflow:'hidden' }}><div style={{ width:`${pct}%`, height:'100%', background:'linear-gradient(90deg,#4c8dff,#a855f7)', borderRadius:99 }}/></div>
                    <span style={{ color:'#bbb', fontSize:10, width:28, textAlign:'right' }}>{count}</span>
                  </div>
                ); })}
              </div>
              <div style={{ background:'#060910', border:'1px solid #1e2a3a', borderRadius:10, padding:'14px 16px' }}>
                <div style={{ ...lbl, marginBottom:12 }}>Decision breakdown</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                  {[{ key:'hire', label:'Hired', color:'#34d399' },{ key:'schedule-next-round', label:'Next round', color:'#8fb6ff' },{ key:'hold', label:'On Hold', color:'#f5c542' },{ key:'reject', label:'Rejected', color:'#ff8a8a' }].map(d => (
                    <div key={d.key} style={{ textAlign:'center', padding:'8px', background:'#0b1020', borderRadius:8, border:`1px solid ${d.color}33` }}><div style={{ color:d.color, fontSize:18, fontWeight:900 }}>{analytics.decisions?.[d.key]||0}</div><div style={{ color:'#8a97ad', fontSize:9, textTransform:'uppercase', marginTop:2 }}>{d.label}</div></div>
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

// ─── Main portal ──────────────────────────────────────────────────────────────
const STEPS = [['1', 'Create', 'Pick problems, duration, proctoring'], ['2', 'Invite', 'Share the link or add emails'], ['3', 'Test', 'Timed, proctored environment'], ['4', 'Analyze', 'Ranked results and hire decisions']];
const DC = ['#39ff88', '#f4b740', '#ff5b6b'];

export default function CompanyDashboard({ user }) {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [pipeline, setPipeline] = useState({ created: 0, invited: 0, completed: 0 });
  const [listState, setListState] = useState('loading');     // loading | ready | error
  const [listError, setListError] = useState('');
  const [problems, setProblems] = useState([]);
  const [createWith, setCreateWith] = useState(null);         // null | {} | template prefill
  const [viewResults, setViewResults] = useState(null);
  const [showPlagiarism, setShowPlagiarism] = useState(null);
  const [copiedLink, setCopiedLink] = useState('');
  const [newAssessment, setNewAssessment] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [sel, setSel] = useState(null);

  const loadMine = useCallback(async () => {
    if (!user?.uid) { setListState('error'); setListError('Sign in to create and manage assessments.'); return; }
    try {
      const res = await axios.get(`${API_BASE}/assessments/mine`, { headers: await authHeaders() });
      setAssessments(res.data.assessments || []); setPipeline(res.data.pipeline || { created: 0, invited: 0, completed: 0 }); setListState('ready');
    } catch (e) { setListError(e.response?.data?.error || 'Could not load your assessments.'); setListState('error'); }
  }, [user?.uid]);
  useEffect(() => { loadMine(); }, [loadMine]);
  useEffect(() => { axios.get(`${API_BASE}/problems?limit=200`).then((r) => setProblems(r.data.problems || [])).catch(() => {}); }, []);

  const copyLink = async (link) => {
    try { await navigator.clipboard.writeText(link); } catch (e) { window.prompt('Copy this link:', link); }
    setCopiedLink(link); setTimeout(() => setCopiedLink(''), 2000);
  };
  const handleCreated = (data) => { setNewAssessment(data); setSel(1); loadMine(); };

  const applyTemplate = (t) => {
    const picks = pickProblems(problems, t);
    setCreateWith({ ...t.form, title: t.name, problemIds: picks.map((p) => p.id), _templateName: t.name });
  };
  const picksByTemplate = useMemo(() => Object.fromEntries(HIRING_TEMPLATES.map((t) => [t.id, pickProblems(problems, t)])), [problems]);

  // Pipeline stage from real data
  const stage = pipeline.created === 0 ? 0 : pipeline.completed > 0 ? 3 : pipeline.invited > 0 ? 2 : 1;
  const step = sel ?? stage;
  const latest = assessments.find((a) => a.status !== 'archived');
  const latestWithResults = assessments.find((a) => a.candidateCount > 0);
  const counts = [pipeline.created ? `${pipeline.created} created` : '', pipeline.invited ? `${pipeline.invited} invited` : '', pipeline.completed ? `${pipeline.completed} completed` : '', latestWithResults ? 'results ready' : ''];
  const info = [
    pipeline.created ? `${pipeline.created} active assessment${pipeline.created === 1 ? '' : 's'}. Create another from a template below.` : 'Start with a template below, or create from scratch.',
    pipeline.invited ? `${pipeline.invited} candidate${pipeline.invited === 1 ? '' : 's'} invited by email.` : latest ? 'Share your invite link, or add candidate emails when you create an assessment.' : 'Invites unlock once your first assessment exists.',
    pipeline.completed ? `${pipeline.completed} candidate${pipeline.completed === 1 ? '' : 's'} have completed an assessment.` : 'Candidates take the test from your invite link.',
    latestWithResults ? `Ranked results are ready for "${latestWithResults.title}".` : 'Results and rankings appear as candidates finish.',
  ][step];
  const action = step === 0 ? <button type="button" className="cta sm" onClick={() => setCreateWith({})}>Create assessment</button>
    : step === 1 && latest ? <button type="button" className="cta sm" onClick={() => copyLink(linkFor(latest))}>{copiedLink === linkFor(latest) ? '✓ Copied' : 'Copy latest invite link'}</button>
    : step === 3 && latestWithResults ? <button type="button" className="cta sm" onClick={() => setViewResults(latestWithResults.id)}>View ranked results</button> : null;
  const shown = assessments.filter((a) => !companyFilter.trim() || (a.companyName || '').toLowerCase().includes(companyFilter.trim().toLowerCase()));

  return (
    <div className="ap">
      <div className="page">
        <div className="top"><button type="button" className="ghost" onClick={() => navigate(-1)}>&larr; Back</button></div>
        <div className="hero">
          <div><span className="eyebrow"><i />COMPANY ASSESSMENT PORTAL</span>
            <h1>Hire on <span>real signal</span></h1>
            <p className="lede">Create proctored coding assessments, invite candidates, and get ranked results with analytics. Free for your team.</p></div>
          <button type="button" className="cta" onClick={() => setCreateWith({})} disabled={!user?.uid}>+ Create Assessment</button>
        </div>

        {newAssessment && (
          <div className="banner" role="status">
            <span style={{ flex: 1, minWidth: 220 }}><b>"{newAssessment.title}" is live.</b> Share this link with candidates:<code>{newAssessment.inviteLink}</code>
              {newAssessment.candidatesInvited > 0 && <small style={{ display: 'block', marginTop: 4, color: '#9dffc6' }}>{newAssessment.candidatesInvited} invitation{newAssessment.candidatesInvited !== 1 ? 's' : ''} queued</small>}</span>
            <button type="button" className="cta sm" onClick={() => copyLink(newAssessment.inviteLink)}>{copiedLink === newAssessment.inviteLink ? '✓ Copied' : 'Copy link'}</button>
            <button type="button" className="ghost" aria-label="Dismiss" onClick={() => setNewAssessment(null)}>✕</button>
          </div>
        )}
        {listState === 'error' && <div className="warn" role="alert">{listError}</div>}

        <div className="pipeWrap"><section className="pipe" aria-label="Hiring pipeline">
          <div className="track">
            <div className="rail" aria-hidden="true"><div className="fill" style={{ width: `${(stage / 3) * 100}%` }} /></div>
            {STEPS.map(([n, t, d], i) => (
              <button type="button" key={t} className={`node${i < stage ? ' done' : i === stage ? ' now' : ''}`} aria-expanded={step === i} onClick={() => setSel(i)} aria-label={`Step ${n}: ${t}. ${d}`}>
                <span className="orb">{i < stage ? '✓' : n}</span><b>{t}</b><small>{d}</small><span className="count">{counts[i]}</span>
              </button>
            ))}
          </div>
          <div className="stepInfo" role="status"><span><b>{STEPS[step][1]}:</b> {info}</span>{action}</div>
        </section></div>

        <section aria-labelledby="ap-th">
          <div className="shd"><h2 id="ap-th">Pre-built hiring templates</h2><p>Launch a calibrated assessment in one click. Problems are picked from your library, and you can change anything.</p></div>
          <div className="tgrid">
            {HIRING_TEMPLATES.map((t) => {
              const picks = picksByTemplate[t.id] || [], mix = [t.form.difficultyMix.easy, t.form.difficultyMix.medium, t.form.difficultyMix.hard];
              return (
                <article key={t.id} className="tpl" style={{ '--tc': t.color }}
                  onPointerMove={(e) => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; e.currentTarget.style.transform = `perspective(900px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`; }}
                  onPointerLeave={(e) => { e.currentTarget.style.transform = ''; }}>
                  <span className="ic" aria-hidden="true">{t.icon}</span><h3>{t.name}</h3><p>{t.desc}</p>
                  <div className="specs"><div>DURATION<b>{t.form.durationMinutes} min</b></div><div>PROBLEMS<b>{t.count}</b></div><div>PROCTORED<b>Yes</b></div></div>
                  <div className="mix" aria-hidden="true">{mix.map((v, i) => (v ? <i key={i} style={{ flex: v, background: DC[i] }} /> : null))}</div>
                  <div className="mixlab">{['Easy', 'Medium', 'Hard'].map((l, i) => (mix[i] ? <span key={l} style={{ '--c': DC[i] }}>{mix[i]}% {l}</span> : null))}</div>
                  <div className="tags">{t.form.skillTags.map((g) => <span key={g}>{g}</span>)}</div>
                  <div className="picks">{problems.length ? <>Picks <b>{picks.map((p) => p.title).join(', ')}</b></> : 'Loading your problem library…'}</div>
                  <button type="button" className="cta sm" onClick={() => applyTemplate(t)} disabled={!user?.uid}>Use template</button>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="ap-ah">
          <div className="shd"><h2 id="ap-ah">Your assessments</h2><p>{listState === 'ready' ? (assessments.length ? `${assessments.length} assessment${assessments.length === 1 ? '' : 's'}` : 'Nothing yet. Pick a template above to launch your first one.') : listState === 'loading' ? 'Loading…' : ''}</p></div>
          {assessments.length > 0 && <div className="filter"><input aria-label="Filter by company name" placeholder="Filter by company name" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} /></div>}
          <div className="alist">
            {listState === 'ready' && assessments.length > 0 && shown.length === 0 && <div className="empty">No assessments match that company.</div>}
            {shown.map((a) => (
              <div key={a.id} className="arow">
                <div><b>{a.title}</b><small>{a.companyName} · {a.durationMinutes} min · {a.problemCount} problem{a.problemCount === 1 ? '' : 's'} · created {timeAgo(a.createdAt)}{a.targetRole ? ` · ${a.targetRole}` : ''}{a.status === 'archived' && <span className="tagArch"> · Archived</span>}</small></div>
                <div className="k">INVITED<strong>{a.invitedCount}</strong></div>
                <div className="k">COMPLETED<strong>{a.candidateCount}</strong></div>
                <div className="acts">
                  {a.status !== 'archived' && <span className="live">LIVE</span>}
                  <button type="button" className="ghost" onClick={() => copyLink(linkFor(a))}>{copiedLink === linkFor(a) ? '✓ Copied' : 'Copy link'}</button>
                  <button type="button" className="ghost" onClick={() => setShowPlagiarism(a.id)}>Plagiarism</button>
                  <button type="button" className="cta sm" onClick={() => setViewResults(a.id)}>Results</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {createWith && <CreateAssessmentModal key="create" problems={problems} initial={createWith} onClose={() => setCreateWith(null)} onCreate={handleCreated} />}
        {viewResults && <CandidateResults key="results" assessmentId={viewResults} onClose={() => setViewResults(null)} />}
        {showPlagiarism && <PlagiarismReport key="plag" assessmentId={showPlagiarism} onClose={() => setShowPlagiarism(null)} />}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Create Assessment Modal ────────────────────────────────────────────────────
function CreateAssessmentModal({ problems, onClose, onCreate }) {
  const [form, setForm] = useState({
    title:           '',
    description:     '',
    companyName:     '',
    companyLogo:     '🏢',
    problemIds:      [],
    durationMinutes: 60,
    proctored:       true,
    defaultLanguage: 'python3',
    expiresAt:       '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const toggleProblem = (id) => {
    setForm(f => ({
      ...f,
      problemIds: f.problemIds.includes(id)
        ? f.problemIds.filter(p => p !== id)
        : [...f.problemIds, id],
    }));
  };

  const handleCreate = async () => {
    if (!form.title || !form.companyName || form.problemIds.length === 0) {
      setError('Title, company name, and at least one problem are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/assessments`, form, {
        headers: { 'x-admin-key': ADMIN_KEY },
      });
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const diffColor = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background:   '#0d1117',
          border:       '1px solid #1a73e844',
          borderRadius: 20,
          padding:      '28px',
          width:        '100%',
          maxWidth:     640,
          maxHeight:    '90vh',
          overflowY:    'auto',
          position:     'relative',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #1a73e8, transparent)',
          borderRadius: '20px 20px 0 0',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: '#e8e8e8', fontSize: 18, fontWeight: 800 }}>
            📋 Create Assessment
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Company + Title row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                Company Name *
              </label>
              <input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder="e.g. Google, Startup XYZ"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Assessment Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Backend Engineer Round 1"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Instructions for the candidate..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {/* Duration + Proctoring */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Duration (minutes)</label>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                min={15} max={240}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Default Language</label>
              <select
                value={form.defaultLanguage}
                onChange={e => setForm(f => ({ ...f, defaultLanguage: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {['python3','javascript','java','cpp17','c','csharp','go','rust'].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Expires At</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Proctoring toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div
              onClick={() => setForm(f => ({ ...f, proctored: !f.proctored }))}
              style={{
                width: 40, height: 22, borderRadius: 11,
                background: form.proctored ? '#1a73e8' : '#1e2a3a',
                position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                border: `1px solid ${form.proctored ? '#1a73e8' : '#333'}`,
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: form.proctored ? 19 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600 }}>
                Proctored Assessment
              </div>
              <div style={{ color: '#555', fontSize: 11 }}>
                Log tab switches, copy/paste, and suspicious activity
              </div>
            </div>
          </label>

          {/* Problem selector */}
          <div>
            <label style={labelStyle}>
              Select Problems * ({form.problemIds.length} selected)
            </label>
            <div style={{
              border: '1px solid #1e2a3a', borderRadius: 10,
              maxHeight: 220, overflowY: 'auto', background: '#060910',
            }}>
              {problems.length === 0 ? (
                <div style={{ padding: 20, color: '#333', fontSize: 13, textAlign: 'center' }}>
                  No problems available. Seed the database first.
                </div>
              ) : (
                problems.map((p, i) => {
                  const isSelected = form.problemIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProblem(p.id)}
                      style={{
                        display:       'flex',
                        alignItems:    'center',
                        gap:           10,
                        padding:       '10px 14px',
                        borderBottom:  i < problems.length - 1 ? '1px solid #0f1923' : 'none',
                        cursor:        'pointer',
                        background:    isSelected ? '#1a73e811' : 'transparent',
                        transition:    'background 0.15s',
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: `2px solid ${isSelected ? '#1a73e8' : '#333'}`,
                        background: isSelected ? '#1a73e8' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 10, color: '#fff',
                      }}>
                        {isSelected ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 600 }}>{p.title}</div>
                        <div style={{ color: '#555', fontSize: 10 }}>{p.tags?.slice(0,2).join(' · ')}</div>
                      </div>
                      <span style={{
                        color: diffColor[p.difficulty] || '#888',
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                      }}>
                        {p.difficulty}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {error && (
            <div style={{
              background: '#ff4d4d11', border: '1px solid #ff4d4d33',
              borderRadius: 8, padding: '8px 14px',
              color: '#ff6b6b', fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCreate}
            disabled={submitting}
            style={{
              background:   submitting ? '#1e2a3a' : 'linear-gradient(135deg, #1a73e8, #0d47a1)',
              border:       'none', borderRadius: 10,
              color:        submitting ? '#444' : '#fff',
              cursor:       submitting ? 'not-allowed' : 'pointer',
              fontSize:     14, fontWeight: 700, padding: '12px 0',
              marginTop:    4,
            }}
          >
            {submitting ? '⏳ Creating...' : '🚀 Create Assessment & Get Invite Link'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Candidate Results Modal ────────────────────────────────────────────────────
function CandidateResults({ assessmentId, onClose }) {
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/assessments/${assessmentId}/results`, {
      headers: { 'x-admin-key': ADMIN_KEY },
    })
      .then(res => setResults(res.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
        style={{
          background: '#0d1117', border: '1px solid #1e2a3a',
          borderRadius: 20, padding: '28px',
          width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#e8e8e8', fontSize: 18, fontWeight: 800 }}>
            👥 Candidate Results
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ color: '#333', textAlign: 'center', padding: 40 }}>Loading results...</div>
        ) : results.length === 0 ? (
          <div style={{ color: '#333', textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            No candidates have completed this assessment yet.
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Candidates', value: results.length,                                                         color: '#1a73e8' },
                { label: 'Avg Score',        value: Math.round(results.reduce((a, r) => a + (r.totalScore || 0), 0) / results.length), color: '#a855f7' },
                { label: 'Pass Rate',        value: `${Math.round((results.filter(r => (r.totalScore || 0) >= 200).length / results.length) * 100)}%`, color: '#00c896' },
                { label: 'Avg Violations',   value: Math.round(results.reduce((a, r) => a + (r.violationCount || 0), 0) / results.length), color: '#f5c542' },
              ].map(s => (
                <div key={s.label} style={{
                  background: '#060910', border: '1px solid #1e2a3a',
                  borderRadius: 10, padding: '10px 14px', textAlign: 'center',
                }}>
                  <div style={{ color: s.color, fontSize: 20, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 10, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Candidate table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {results.map((r, i) => (
                <motion.div
                  key={r.userId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(selected?.userId === r.userId ? null : r)}
                  style={{
                    background:   selected?.userId === r.userId ? '#1a73e811' : '#060910',
                    border:       `1px solid ${selected?.userId === r.userId ? '#1a73e844' : '#1e2a3a'}`,
                    borderRadius: 10,
                    padding:      '12px 16px',
                    cursor:       'pointer',
                    transition:   'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Rank */}
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? '#f5c54222' : i === 1 ? '#88888822' : i === 2 ? '#cd7f3222' : '#1e2a3a',
                      border: `1px solid ${i === 0 ? '#f5c54244' : i === 1 ? '#88888844' : i === 2 ? '#cd7f3244' : '#333'}`,
                      color: i === 0 ? '#f5c542' : i === 1 ? '#888' : i === 2 ? '#cd7f32' : '#555',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {i + 1}
                    </span>

                    {/* Name + status */}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600 }}>
                        {r.displayName || 'Candidate'}
                      </div>
                      <div style={{ color: '#555', fontSize: 11 }}>
                        {r.email} · Completed {timeAgo(r.completedAt)}
                        {r.autoSubmitted && ' (auto-submitted)'}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#00c896', fontSize: 14, fontWeight: 700 }}>
                          {r.solved?.length || 0}
                        </div>
                        <div style={{ color: '#444', fontSize: 9 }}>solved</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#a855f7', fontSize: 14, fontWeight: 700 }}>
                          {r.totalScore || 0}
                        </div>
                        <div style={{ color: '#444', fontSize: 9 }}>score</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          color: (r.violationCount || 0) > 3 ? '#ff4d4d' : '#f5c542',
                          fontSize: 14, fontWeight: 700,
                        }}>
                          {r.violationCount || 0}
                        </div>
                        <div style={{ color: '#444', fontSize: 9 }}>flags</div>
                      </div>
                    </div>

                    {/* Hire/reject badge */}
                    <div style={{
                      background: (r.totalScore || 0) >= 200 ? '#00c89622' : '#ff4d4d11',
                      border:     `1px solid ${(r.totalScore || 0) >= 200 ? '#00c89644' : '#ff4d4d22'}`,
                      borderRadius: 20, padding: '3px 10px',
                      color: (r.totalScore || 0) >= 200 ? '#00c896' : '#ff6b6b',
                      fontSize: 10, fontWeight: 700,
                    }}>
                      {(r.totalScore || 0) >= 200 ? '✓ Strong' : 'Weak'}
                    </div>
                  </div>

                  {/* Expanded view */}
                  <AnimatePresence>
                    {selected?.userId === r.userId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1e2a3a' }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                              Problems Solved
                            </div>
                            {r.solved?.length > 0 ? r.solved.map(pid => (
                              <div key={pid} style={{ color: '#00c896', fontSize: 11, marginBottom: 2 }}>
                                ✓ {pid} (+{r.scores?.[pid] || 0} pts)
                              </div>
                            )) : (
                              <div style={{ color: '#444', fontSize: 11 }}>None</div>
                            )}
                          </div>
                          <div>
                            <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                              Violations Logged
                            </div>
                            {(r.violations || []).length > 0 ? (
                              r.violations.slice(0, 5).map((v, vi) => (
                                <div key={vi} style={{ color: '#ff6b6b', fontSize: 11, marginBottom: 2 }}>
                                  ⚠ {v.type?.replace('_', ' ')} — {v.timestamp ? new Date(v.timestamp).toLocaleTimeString() : ''}
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#00c896', fontSize: 11 }}>No violations ✓</div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Shared Styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width:        '100%',
  background:   '#060910',
  border:       '1px solid #1e2a3a',
  borderRadius: 8,
  color:        '#e8e8e8',
  fontSize:     13,
  padding:      '8px 12px',
  outline:      'none',
  boxSizing:    'border-box',
};

const labelStyle = {
  color:          '#555',
  fontSize:       11,
  fontWeight:     700,
  textTransform:  'uppercase',
  letterSpacing:  '0.06em',
  display:        'block',
  marginBottom:   6,
};

// ── Main CompanyDashboard ──────────────────────────────────────────────────────
export default function CompanyDashboard({ user }) {
  const navigate = useNavigate();

  const [assessments,    setAssessments]    = useState([]);
  const [problems,       setProblems]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showCreate,     setShowCreate]     = useState(false);
  const [viewResults,    setViewResults]    = useState(null);
  const [copiedLink,     setCopiedLink]     = useState('');
  const [newAssessment,  setNewAssessment]  = useState(null);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/problems?limit=200`),
    ]).then(([probRes]) => {
      setProblems(probRes.data.problems || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const handleCreated = (data) => {
    setNewAssessment(data);
    setAssessments(prev => [{
      id:    data.assessmentId,
      title: 'New Assessment',
      link:  data.inviteLink,
      candidateCount: 0,
      createdAt: new Date(),
    }, ...prev]);
  };

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#0a0a14',
      color:      '#e8e8e8',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent', border: '1px solid #1e2a3a',
              borderRadius: 8, color: '#555', cursor: 'pointer',
              fontSize: 12, padding: '6px 14px', marginBottom: 16,
            }}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>🏢 Company Assessment Portal</h1>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
                Create technical assessments, invite candidates, view ranked results.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              style={{
                background:   'linear-gradient(135deg, #1a73e8, #0d47a1)',
                border:       'none', borderRadius: 10,
                color:        '#fff', cursor: 'pointer',
                fontSize:     13, fontWeight: 700, padding: '10px 20px',
                boxShadow:    '0 0 20px #1a73e833',
              }}
            >
              + Create Assessment
            </motion.button>
          </div>
        </div>

        {/* New assessment result */}
        <AnimatePresence>
          {newAssessment && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background:   '#00c89611',
                border:       '1px solid #00c89644',
                borderRadius: 14,
                padding:      '16px 20px',
                marginBottom: 20,
                display:      'flex',
                alignItems:   'center',
                gap:          12,
                flexWrap:     'wrap',
              }}
            >
              <span style={{ fontSize: 20 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#00c896', fontWeight: 700, fontSize: 14 }}>
                  Assessment created! Share this invite link with candidates:
                </div>
                <div style={{ color: '#e8e8e8', fontSize: 12, marginTop: 4, wordBreak: 'break-all' }}>
                  {newAssessment.inviteLink}
                </div>
              </div>
              <button
                onClick={() => copyLink(newAssessment.inviteLink)}
                style={{
                  background:   copiedLink === newAssessment.inviteLink ? '#00c89622' : '#1e2a3a',
                  border:       '1px solid #1e2a3a',
                  borderRadius: 8, color: '#e8e8e8', cursor: 'pointer',
                  fontSize:     12, fontWeight: 600, padding: '6px 14px',
                  flexShrink:   0,
                }}
              >
                {copiedLink === newAssessment.inviteLink ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              <button
                onClick={() => setNewAssessment(null)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* How it works */}
        <div style={{
          display:      'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap:          12,
          marginBottom: 28,
        }}>
          {[
            { step: '1', icon: '📋', title: 'Create',  desc: 'Pick problems, set duration, enable proctoring' },
            { step: '2', icon: '🔗', title: 'Invite',  desc: 'Share the link with your candidates' },
            { step: '3', icon: '💻', title: 'Test',    desc: 'Candidates solve problems in timed environment' },
            { step: '4', icon: '📊', title: 'Review',  desc: 'See ranked results with violation reports' },
          ].map(s => (
            <div key={s.step} style={{
              background: '#0d1117', border: '1px solid #1e2a3a',
              borderRadius: 12, padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{
                  background: '#1a73e822', border: '1px solid #1a73e844',
                  borderRadius: '50%', width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#1a73e8', fontSize: 11, fontWeight: 900, flexShrink: 0,
                }}>{s.step}</span>
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>{s.title}</span>
              </div>
              <p style={{ margin: 0, color: '#555', fontSize: 11, lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Assessments list */}
        {assessments.length === 0 ? (
          <div style={{
            background: '#0d1117', border: '1px solid #1e2a3a',
            borderRadius: 16, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ color: '#e8e8e8', margin: '0 0 8px' }}>No assessments yet</h2>
            <p style={{ color: '#555', fontSize: 14, margin: '0 0 20px' }}>
              Create your first assessment and send the link to candidates.
              <br/>
              <strong style={{ color: '#1a73e8' }}>Free forever.</strong> HackerRank charges $25,000/year for this.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreate(true)}
              style={{
                background: 'linear-gradient(135deg, #1a73e8, #0d47a1)',
                border: 'none', borderRadius: 10,
                color: '#fff', cursor: 'pointer',
                fontSize: 14, fontWeight: 700, padding: '12px 28px',
              }}
            >
              + Create Your First Assessment
            </motion.button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assessments.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  background: '#0d1117', border: '1px solid #1e2a3a',
                  borderRadius: 12, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e8e8e8', fontSize: 14, fontWeight: 700 }}>{a.title}</div>
                  <div style={{ color: '#555', fontSize: 12, marginTop: 2 }}>
                    {a.candidateCount || 0} candidates · Created {timeAgo(a.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => copyLink(a.inviteLink || `https://dsa-life-simulator-frontend.vercel.app/assessment/${a.id}`)}
                    style={{
                      background: '#1e2a3a', border: '1px solid #1e2a3a',
                      borderRadius: 8, color: '#888', cursor: 'pointer',
                      fontSize: 12, padding: '6px 12px',
                    }}
                  >
                    {copiedLink.includes(a.id) ? '✓ Copied!' : '🔗 Copy Link'}
                  </button>
                  <button
                    onClick={() => setViewResults(a.id)}
                    style={{
                      background: '#1a73e811', border: '1px solid #1a73e833',
                      borderRadius: 8, color: '#1a73e8', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, padding: '6px 12px',
                    }}
                  >
                    📊 View Results
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateAssessmentModal
            problems={problems}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreated}
          />
        )}
        {viewResults && (
          <CandidateResults
            assessmentId={viewResults}
            onClose={() => setViewResults(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
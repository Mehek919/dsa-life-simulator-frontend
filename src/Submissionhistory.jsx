import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Constants ──────────────────────────────────────────────────────────────────
const LANG_COLORS = {
  python3:    '#3776ab', python2:    '#3776ab',
  javascript: '#f7df1e', typescript: '#3178c6',
  java:       '#ed8b00', cpp17:      '#00599c',
  cpp14:      '#00599c', c:          '#555555',
  csharp:     '#68217a', go:         '#00add8',
  rust:       '#ce422b', kotlin:     '#7f52ff',
  swift:      '#fa7343', ruby:       '#cc342d',
};

const LANG_LABELS = {
  python3: 'Python 3', python2: 'Python 2',
  javascript: 'JavaScript', typescript: 'TypeScript',
  java: 'Java', cpp17: 'C++17', cpp14: 'C++14',
  c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust',
  kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby',
};

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Stars({ count, max = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize: 11, color: i < count ? '#f5c542' : '#333' }}>★</span>
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   '#0d1117',
        border:       `1px solid ${color}33`,
        borderRadius: 14,
        padding:      '16px 20px',
        boxShadow:    `0 0 16px ${color}11`,
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0.6,
      }} />
      <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ color, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </motion.div>
  );
}

// ── Language Bar ──────────────────────────────────────────────────────────────
function LanguageBar({ submissions }) {
  const counts = {};
  submissions.forEach(s => {
    const lang = LANG_LABELS[s.language] || s.language || 'Unknown';
    counts[lang] = (counts[lang] || 0) + 1;
  });
  const total   = submissions.length;
  const sorted  = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0) return null;

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a',
      borderRadius: 14, padding: '16px 20px',
    }}>
      <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        🗣️ Languages Used
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(([lang, count]) => {
          const pct   = Math.round((count / total) * 100);
          const color = LANG_COLORS[Object.keys(LANG_LABELS).find(k => LANG_LABELS[k] === lang)] || '#888';
          return (
            <div key={lang}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#c8c8c8', fontSize: 12 }}>{lang}</span>
                <span style={{ color: '#555', fontSize: 11 }}>{count} ({pct}%)</span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#1e2a3a', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: color, borderRadius: 2 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function ActivityHeatmap({ submissions }) {
  const now     = new Date();
  const days    = 52 * 7;
  const counts  = {};

  submissions.forEach(s => {
    const date = s.createdAt?._seconds
      ? new Date(s.createdAt._seconds * 1000)
      : new Date(s.createdAt);
    const key = date.toISOString().split('T')[0];
    counts[key] = (counts[key] || 0) + 1;
  });

  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d   = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    cells.push({ date: key, count: counts[key] || 0 });
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1);

  const getColor = (count) => {
    if (count === 0) return '#1e2a3a';
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return '#00c89633';
    if (intensity < 0.5)  return '#00c89666';
    if (intensity < 0.75) return '#00c896aa';
    return '#00c896';
  };

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div style={{
      background: '#0d1117', border: '1px solid #1e2a3a',
      borderRadius: 14, padding: '16px 20px',
    }}>
      <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        📅 Submission Activity
      </div>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map((cell, di) => (
              <div
                key={di}
                title={`${cell.date}: ${cell.count} submission${cell.count !== 1 ? 's' : ''}`}
                style={{
                  width: 10, height: 10, borderRadius: 2,
                  background: getColor(cell.count),
                  cursor: 'default',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <span style={{ color: '#444', fontSize: 9 }}>Less</span>
        {['#1e2a3a', '#00c89633', '#00c89666', '#00c896aa', '#00c896'].map(c => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ color: '#444', fontSize: 9 }}>More</span>
      </div>
    </div>
  );
}

// ── Submission Row ────────────────────────────────────────────────────────────
function SubmissionRow({ sub, idx, onClick, isSelected }) {
  const langColor = LANG_COLORS[sub.language] || '#888';
  const diffColor = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' }[sub.difficulty] || '#888';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      onClick={() => onClick(sub)}
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '12px 16px',
        background:   isSelected ? '#1a73e811' : '#0d1117',
        border:       `1px solid ${isSelected ? '#1a73e844' : '#1e2a3a'}`,
        borderRadius: 10,
        cursor:       'pointer',
        transition:   'all 0.2s',
      }}
      whileHover={{ borderColor: '#1a73e844', x: 2 }}
    >
      {/* Status */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: sub.allPassed ? '#00c896' : '#ff4d4d',
        boxShadow:  `0 0 6px ${sub.allPassed ? '#00c896' : '#ff4d4d'}`,
      }} />

      {/* Problem title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600, truncate: true }}>
          {sub.problemTitle || 'Unknown Problem'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
          <span style={{
            background: langColor + '22', border: `1px solid ${langColor}44`,
            borderRadius: 20, padding: '1px 8px',
            color: langColor, fontSize: 10, fontWeight: 600,
          }}>
            {LANG_LABELS[sub.language] || sub.language}
          </span>
          {sub.difficulty && (
            <span style={{ color: diffColor, fontSize: 10 }}>{sub.difficulty}</span>
          )}
          {sub.allPassed && <Stars count={sub.stars || 0} />}
        </div>
      </div>

      {/* Test results */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ color: sub.allPassed ? '#00c896' : '#ff4d4d', fontSize: 12, fontWeight: 700 }}>
          {sub.passed}/{sub.total}
        </div>
        <div style={{ color: '#444', fontSize: 10 }}>tests</div>
      </div>

      {/* Time */}
      <div style={{ color: '#444', fontSize: 11, flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
        {timeAgo(sub.createdAt)}
      </div>
    </motion.div>
  );
}

// ── Code Viewer ───────────────────────────────────────────────────────────────
function CodeViewer({ submission, onClose }) {
  const langColor = LANG_COLORS[submission.language] || '#888';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        position:   'fixed',
        right:      0, top: 0, bottom: 0,
        width:      '50%',
        background: '#0d1117',
        border:     '1px solid #1e2a3a',
        borderRight: 'none',
        zIndex:     100,
        display:    'flex',
        flexDirection: 'column',
        boxShadow:  '-4px 0 40px #00000088',
      }}
    >
      {/* Header */}
      <div style={{
        padding:      '16px 20px',
        borderBottom: '1px solid #1e2a3a',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
        flexShrink:   0,
      }}>
        <div>
          <div style={{ color: '#e8e8e8', fontSize: 14, fontWeight: 700 }}>
            {submission.problemTitle}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{
              background: langColor + '22', border: `1px solid ${langColor}44`,
              borderRadius: 20, padding: '1px 8px',
              color: langColor, fontSize: 10, fontWeight: 600,
            }}>
              {LANG_LABELS[submission.language] || submission.language}
            </span>
            <span style={{
              background: submission.allPassed ? '#00c89622' : '#ff4d4d22',
              border:     `1px solid ${submission.allPassed ? '#00c89644' : '#ff4d4d44'}`,
              borderRadius: 20, padding: '1px 8px',
              color:      submission.allPassed ? '#00c896' : '#ff4d4d',
              fontSize:   10, fontWeight: 600,
            }}>
              {submission.allPassed ? '✓ Accepted' : '✗ Failed'} — {submission.passed}/{submission.total} tests
            </span>
            {submission.allPassed && <Stars count={submission.stars || 0} />}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid #1e2a3a',
            borderRadius: 8, color: '#666', cursor: 'pointer',
            fontSize: 16, padding: '4px 10px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        display:      'flex',
        gap:          12,
        padding:      '12px 20px',
        borderBottom: '1px solid #1e2a3a',
        flexShrink:   0,
        flexWrap:     'wrap',
      }}>
        {[
          { label: 'Submitted',  value: timeAgo(submission.createdAt) },
          { label: 'Hints Used', value: submission.hintsUsed || 0 },
          { label: 'Language',   value: LANG_LABELS[submission.language] || submission.language },
        ].map(s => (
          <div key={s.label} style={{
            background: '#060910', border: '1px solid #1e2a3a',
            borderRadius: 8, padding: '6px 12px',
          }}>
            <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ color: '#c8c8c8', fontSize: 12, fontWeight: 600 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Code */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <pre style={{
          margin:     0,
          padding:    '20px',
          color:      '#e8e8e8',
          fontSize:   13,
          fontFamily: '"Fira Code", "Cascadia Code", monospace',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
        }}>
          {submission.code || '// No code saved'}
        </pre>
      </div>
    </motion.div>
  );
}

// ── Main SubmissionHistory ─────────────────────────────────────────────────────
export default function SubmissionHistory({ user, userData }) {
  const navigate = useNavigate();

  const [submissions,   setSubmissions]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('all'); // all | accepted | failed
  const [langFilter,    setLangFilter]    = useState('all');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState(null);
  const [page,          setPage]          = useState(1);
  const PER_PAGE = 20;

  const fetchSubmissions = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/submissions/${user.uid}`);
      setSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Stats
  const total     = submissions.length;
  const accepted  = submissions.filter(s => s.allPassed).length;
  const rate      = total > 0 ? Math.round((accepted / total) * 100) : 0;
  const streak    = userData?.streak || 0;
  const uniqueProblems = new Set(submissions.filter(s => s.allPassed).map(s => s.problemId)).size;

  // All languages used
  const languages = [...new Set(submissions.map(s => s.language).filter(Boolean))];

  // Filtered submissions
  const filtered = submissions.filter(s => {
    if (filter === 'accepted' && !s.allPassed) return false;
    if (filter === 'failed'   &&  s.allPassed) return false;
    if (langFilter !== 'all'  && s.language !== langFilter) return false;
    if (search && !s.problemTitle?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <div style={{
      minHeight:  '100vh',
      background: '#0a0a14',
      color:      '#e8e8e8',
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
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
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>📋 Submission History</h1>
          <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
            Every problem you've attempted — accepted, failed, and everything in between.
          </p>
        </motion.div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard icon="📊" label="Total Submissions" value={total}          color="#1a73e8" />
          <StatCard icon="✅" label="Accepted"          value={accepted}       color="#00c896" sub={`${rate}% acceptance rate`} />
          <StatCard icon="💻" label="Problems Solved"   value={uniqueProblems} color="#a855f7" sub="unique problems" />
          <StatCard icon="🔥" label="Current Streak"    value={`${streak}d`}   color="#f5c542" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 24 }}>
          <ActivityHeatmap submissions={submissions} />
          <LanguageBar submissions={submissions} />
        </div>

        {/* Filters */}
        <div style={{
          display:      'flex',
          gap:          10,
          marginBottom: 16,
          flexWrap:     'wrap',
          alignItems:   'center',
        }}>
          {/* Status filter */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { key: 'all',      label: 'All',      color: '#1a73e8' },
              { key: 'accepted', label: '✓ Accepted', color: '#00c896' },
              { key: 'failed',   label: '✗ Failed',   color: '#ff4d4d' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                style={{
                  background:   filter === f.key ? f.color + '22' : 'transparent',
                  border:       `1px solid ${filter === f.key ? f.color + '66' : '#1e2a3a'}`,
                  borderRadius: 20,
                  color:        filter === f.key ? f.color : '#555',
                  cursor:       'pointer',
                  fontSize:     12, fontWeight: 600,
                  padding:      '5px 14px',
                  transition:   'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Language filter */}
          {languages.length > 0 && (
            <select
              value={langFilter}
              onChange={e => { setLangFilter(e.target.value); setPage(1); }}
              style={{
                background: '#0d1117', border: '1px solid #1e2a3a',
                borderRadius: 8, color: '#e8e8e8', fontSize: 12,
                padding: '5px 10px', cursor: 'pointer', outline: 'none',
              }}
            >
              <option value="all">All Languages</option>
              {languages.map(l => (
                <option key={l} value={l}>{LANG_LABELS[l] || l}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search problems..."
            style={{
              background: '#0d1117', border: '1px solid #1e2a3a',
              borderRadius: 8, color: '#e8e8e8', fontSize: 12,
              padding: '5px 12px', outline: 'none', width: 180,
            }}
            onFocus={e => e.target.style.borderColor = '#1a73e844'}
            onBlur={e => e.target.style.borderColor = '#1e2a3a'}
          />

          <span style={{ color: '#444', fontSize: 12, marginLeft: 'auto' }}>
            {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Submission list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{
                height: 62, background: '#0d1117', borderRadius: 10,
                border: '1px solid #1e2a3a', animation: 'pulse 1.5s infinite',
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0',
            color: '#333', fontSize: 14,
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            {total === 0
              ? 'No submissions yet. Start solving problems!'
              : 'No submissions match your filters.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {paginated.map((sub, i) => (
                <SubmissionRow
                  key={sub.id}
                  sub={sub}
                  idx={i}
                  onClick={setSelected}
                  isSelected={selected?.id === sub.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: '#0d1117', border: '1px solid #1e2a3a',
                    borderRadius: 8, color: page === 1 ? '#333' : '#888',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12, padding: '6px 14px',
                  }}
                >
                  ← Prev
                </button>
                <span style={{ color: '#555', fontSize: 12, padding: '6px 0' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: '#0d1117', border: '1px solid #1e2a3a',
                    borderRadius: 8, color: page === totalPages ? '#333' : '#888',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 12, padding: '6px 14px',
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Code viewer panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
            />
            <CodeViewer submission={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
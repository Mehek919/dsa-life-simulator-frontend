import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Time formatter ─────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const date = new Date(ts);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Company badge colors ───────────────────────────────────────────────────────
const COMPANY_COLORS = {
  Google:    '#4285f4',
  Amazon:    '#ff9900',
  Meta:      '#0081fb',
  Microsoft: '#00a4ef',
  Apple:     '#a2aaad',
  Bloomberg: '#ff7800',
  Goldman:   '#7399c6',
  LinkedIn:  '#0a66c2',
  Uber:      '#000000',
  Airbnb:    '#ff5a5f',
  Twitter:   '#1da1f2',
  Lyft:      '#ff00bf',
  Adobe:     '#ff0000',
};

// ── Company Frequency Panel ────────────────────────────────────────────────────
function CompanyFrequencyPanel({ problemSlug, companies = [], user, problemId }) {
  const [frequency,  setFrequency]  = useState({});
  const [loading,    setLoading]    = useState(true);
  const [reporting,  setReporting]  = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reported,   setReported]   = useState(false);
  const [selCompany, setSelCompany] = useState('');

  useEffect(() => {
    if (!problemSlug) return;
    axios.get(`${API_BASE}/company-frequency/${problemSlug}`)
      .then(res => setFrequency(res.data.frequency || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [problemSlug]);

  // Merge known companies with frequency data
  const allCompanies = { ...frequency };
  companies.forEach(c => { if (!allCompanies[c]) allCompanies[c] = 0; });

  const sorted = Object.entries(allCompanies)
    .filter(([c]) => c !== 'lastReported')
    .sort((a, b) => b[1] - a[1]);

  const maxFreq = sorted[0]?.[1] || 1;

  const handleReport = async () => {
    if (!selCompany || !user?.uid) return;
    setReporting(true);
    try {
      const res = await axios.post(`${API_BASE}/company-frequency/${problemSlug}/report`, {
        userId:  user.uid,
        company: selCompany,
      });
      setFrequency(res.data.frequency || {});
      setReported(true);
      setShowReport(false);
    } catch {}
    setReporting(false);
  };

  return (
    <div style={{
      background:   '#0d1117',
      border:       '1px solid #1e2a3a',
      borderRadius: 14,
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:        '14px 16px',
        borderBottom:   '1px solid #1e2a3a',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
      }}>
        <span style={{ color: '#e8e8e8', fontWeight: 700, fontSize: 13 }}>
          🏢 Company Frequency
        </span>
        <button
          onClick={() => setShowReport(s => !s)}
          style={{
            background:   reported ? '#00c89622' : '#1a73e822',
            border:       `1px solid ${reported ? '#00c89644' : '#1a73e844'}`,
            borderRadius: 20,
            color:        reported ? '#00c896' : '#1a73e8',
            cursor:       'pointer',
            fontSize:     10, fontWeight: 700,
            padding:      '3px 10px',
          }}
        >
          {reported ? '✓ Reported' : '+ Report'}
        </button>
      </div>

      {/* Report form */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ borderBottom: '1px solid #1e2a3a', padding: '12px 16px', background: '#060910' }}
          >
            <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
              Was this asked in your interview?
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {Object.keys(COMPANY_COLORS).map(c => (
                <button
                  key={c}
                  onClick={() => setSelCompany(c)}
                  style={{
                    background:   selCompany === c ? COMPANY_COLORS[c] + '33' : 'transparent',
                    border:       `1px solid ${selCompany === c ? COMPANY_COLORS[c] : '#1e2a3a'}`,
                    borderRadius: 20,
                    color:        selCompany === c ? COMPANY_COLORS[c] : '#666',
                    cursor:       'pointer',
                    fontSize:     11, padding: '3px 10px',
                    transition:   'all 0.15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
            <button
              onClick={handleReport}
              disabled={!selCompany || reporting}
              style={{
                background:   selCompany ? '#1a73e8' : '#1e2a3a',
                border:       'none', borderRadius: 8,
                color:        selCompany ? '#fff' : '#444',
                cursor:       selCompany ? 'pointer' : 'not-allowed',
                fontSize:     12, fontWeight: 700,
                padding:      '6px 16px',
              }}
            >
              {reporting ? 'Submitting...' : 'Submit Report'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frequency bars */}
      <div style={{ padding: '12px 16px' }}>
        {loading ? (
          <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>Loading...</div>
        ) : sorted.length === 0 ? (
          <div style={{ color: '#333', fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
            No frequency data yet. Be the first to report!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(([company, count]) => {
              const color = COMPANY_COLORS[company] || '#888';
              const pct   = count > 0 ? (count / maxFreq) * 100 : 5;
              return (
                <div key={company}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: color, fontSize: 12, fontWeight: 600 }}>{company}</span>
                    <span style={{ color: '#555', fontSize: 11 }}>
                      {count > 0 ? `${count} report${count !== 1 ? 's' : ''}` : 'Not reported'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 5, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{ height: '100%', background: color, borderRadius: 3, opacity: count > 0 ? 1 : 0.2 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comment Card ───────────────────────────────────────────────────────────────
function CommentCard({ comment, userId, onUpvote, onDelete }) {
  const isOwner   = comment.userId === userId;
  const hasUpvoted = comment.upvotedBy?.includes(userId);

  const typeColors = {
    solution:   { bg: '#00c89611', border: '#00c89633', label: '✅ Solution', color: '#00c896' },
    question:   { bg: '#f5c54211', border: '#f5c54233', label: '❓ Question', color: '#f5c542' },
    discussion: { bg: '#1a73e811', border: '#1a73e833', label: '💬 Discussion', color: '#1a73e8' },
  };
  const typeStyle = typeColors[comment.type] || typeColors.discussion;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background:   '#0d1117',
        border:       `1px solid ${comment.pinned ? '#f5c54244' : '#1e2a3a'}`,
        borderRadius: 12,
        padding:      '14px 16px',
        position:     'relative',
      }}
    >
      {comment.pinned && (
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: '#f5c54222', border: '1px solid #f5c54244',
          borderRadius: 20, padding: '1px 8px',
          color: '#f5c542', fontSize: 9, fontWeight: 700,
        }}>
          📌 PINNED
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#1e2a3a', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#888', flexShrink: 0,
        }}>
          {comment.photoURL
            ? <img src={comment.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (comment.displayName?.[0] || '?')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#e8e8e8', fontSize: 12, fontWeight: 700 }}>
              {comment.displayName || 'Anonymous'}
            </span>
            <span style={{
              background: typeStyle.bg, border: `1px solid ${typeStyle.border}`,
              borderRadius: 20, padding: '1px 7px',
              color: typeStyle.color, fontSize: 9, fontWeight: 700,
            }}>
              {typeStyle.label}
            </span>
            <span style={{
              background: '#1e2a3a', borderRadius: 20, padding: '1px 7px',
              color: '#555', fontSize: 9,
            }}>
              Lv.{comment.level || 1}
            </span>
          </div>
          <span style={{ color: '#444', fontSize: 10 }}>{timeAgo(comment.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{
        color:      '#c8c8c8',
        fontSize:   13,
        lineHeight: 1.7,
        marginBottom: 10,
        whiteSpace: 'pre-wrap',
        wordBreak:  'break-word',
      }}>
        {comment.content}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={() => onUpvote(comment.id)}
          style={{
            background:   hasUpvoted ? '#1a73e822' : 'transparent',
            border:       `1px solid ${hasUpvoted ? '#1a73e844' : '#1e2a3a'}`,
            borderRadius: 20,
            color:        hasUpvoted ? '#1a73e8' : '#555',
            cursor:       'pointer',
            fontSize:     11, padding: '3px 10px',
            display:      'flex', alignItems: 'center', gap: 4,
            transition:   'all 0.15s',
          }}
        >
          ▲ {comment.upvotes || 0}
        </button>

        {isOwner && (
          <button
            onClick={() => onDelete(comment.id)}
            style={{
              background:   'transparent',
              border:       '1px solid #ff4d4d22',
              borderRadius: 20,
              color:        '#ff6b6b',
              cursor:       'pointer',
              fontSize:     10, padding: '3px 10px',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ProblemDiscussions ────────────────────────────────────────────────────
export default function ProblemDiscussions({
  problem,
  user,
  userData,
  isSolved = false,
}) {
  const [tab,        setTab]        = useState('discussion'); // discussion | solution | question
  const [comments,   setComments]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [content,    setContent]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchComments = useCallback(async () => {
    if (!problem?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/discussions/${problem.id}`, {
        params: { type: tab },
      });
      setComments(res.data.comments || []);
    } catch {}
    setLoading(false);
  }, [problem?.id, tab]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    if (!user?.uid) { setError('Sign in to comment'); return; }
    if (tab === 'solution' && !isSolved) {
      setError('Solve the problem first to share a solution');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await axios.post(`${API_BASE}/discussions/${problem.id}/comment`, {
        userId:  user.uid,
        content: content.trim(),
        type:    tab,
      });
      setContent('');
      showToast('Posted successfully!');
      fetchComments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post');
    }
    setSubmitting(false);
  };

  const handleUpvote = async (commentId) => {
    if (!user?.uid) return;
    try {
      await axios.post(`${API_BASE}/discussions/${problem.id}/upvote/${commentId}`, {
        userId: user.uid,
      });
      fetchComments();
    } catch {}
  };

  const handleDelete = async (commentId) => {
    if (!user?.uid) return;
    try {
      await axios.delete(`${API_BASE}/discussions/${problem.id}/${commentId}`, {
        data: { userId: user.uid },
      });
      showToast('Comment deleted');
      fetchComments();
    } catch {}
  };

  const TABS = [
    { key: 'discussion', label: '💬 Discussion' },
    { key: 'solution',   label: '✅ Solutions'  },
    { key: 'question',   label: '❓ Questions'  },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Company Frequency */}
      <div style={{ marginBottom: 16 }}>
        <CompanyFrequencyPanel
          problemSlug={problem?.slug || problem?.id}
          companies={problem?.companies || []}
          user={user}
          problemId={problem?.id}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background:   tab === t.key ? '#1a73e822' : 'transparent',
              border:       `1px solid ${tab === t.key ? '#1a73e844' : '#1e2a3a'}`,
              borderRadius: 20,
              color:        tab === t.key ? '#1a73e8' : '#555',
              cursor:       'pointer',
              fontSize:     12, fontWeight: tab === t.key ? 700 : 400,
              padding:      '5px 14px',
              transition:   'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Solutions locked notice */}
      {tab === 'solution' && !isSolved && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            background:   '#f5c54211',
            border:       '1px solid #f5c54233',
            borderRadius: 12,
            padding:      '16px 20px',
            marginBottom: 16,
            textAlign:    'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
          <div style={{ color: '#f5c542', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Solutions are locked
          </div>
          <div style={{ color: '#888', fontSize: 12 }}>
            Solve this problem to unlock community solutions and share your own.
          </div>
        </motion.div>
      )}

      {/* Comment composer */}
      {(tab !== 'solution' || isSolved) && (
        <div style={{
          background:   '#0d1117',
          border:       '1px solid #1e2a3a',
          borderRadius: 12,
          padding:      '14px',
          marginBottom: 16,
        }}>
          <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            {tab === 'solution' ? '📝 Share your solution approach' : tab === 'question' ? '❓ Ask a question' : '💬 Add to discussion'}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              tab === 'solution'
                ? 'Explain your approach, time/space complexity, and key insights...'
                : tab === 'question'
                  ? 'Ask anything about this problem — approach, edge cases, complexity...'
                  : 'Share thoughts, tips, or discussion about this problem...'
            }
            rows={4}
            style={{
              width:        '100%',
              background:   '#060910',
              border:       '1px solid #1e2a3a',
              borderRadius: 8,
              color:        '#e8e8e8',
              fontSize:     13,
              padding:      '10px 12px',
              outline:      'none',
              resize:       'vertical',
              boxSizing:    'border-box',
              fontFamily:   'Arial, sans-serif',
              lineHeight:   1.6,
            }}
            onFocus={e => e.target.style.borderColor = '#1a73e844'}
            onBlur={e => e.target.style.borderColor = '#1e2a3a'}
          />

          {error && (
            <div style={{ color: '#ff6b6b', fontSize: 12, marginTop: 6 }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ color: '#444', fontSize: 11 }}>
              {content.length}/2000
            </span>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting || !content.trim() || content.length > 2000}
              style={{
                background:   submitting || !content.trim() ? '#1e2a3a' : '#1a73e8',
                border:       'none',
                borderRadius: 8,
                color:        submitting || !content.trim() ? '#444' : '#fff',
                cursor:       submitting || !content.trim() ? 'not-allowed' : 'pointer',
                fontSize:     12, fontWeight: 700,
                padding:      '7px 18px',
              }}
            >
              {submitting ? 'Posting...' : 'Post'}
            </motion.button>
          </div>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 100, background: '#0d1117', borderRadius: 12, border: '1px solid #1e2a3a', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#333' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {tab === 'solution' ? '✅' : tab === 'question' ? '❓' : '💬'}
          </div>
          <div style={{ fontSize: 13 }}>
            {tab === 'solution'
              ? 'No solutions shared yet. Be the first!'
              : tab === 'question'
                ? 'No questions yet. Ask away!'
                : 'Start the discussion!'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              userId={user?.uid}
              onUpvote={handleUpvote}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position:     'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background:   '#00c89622', border: '1px solid #00c89644',
              borderRadius: 30, padding: '8px 20px',
              color:        '#00c896', fontSize: 13, fontWeight: 600,
              zIndex:       999,
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
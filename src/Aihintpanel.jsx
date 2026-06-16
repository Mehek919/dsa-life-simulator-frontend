import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

export default function AIHintPanel({
  problem,
  user,
  code,
  language,
  isSolved,
  testResults,
  onHintUsed,
}) {
  const [tab,       setTab]       = useState('hints');   // hints | editorial | review
  const [hints,     setHints]     = useState([]);
  const [editorial, setEditorial] = useState(null);
  const [review,    setReview]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [expanded,  setExpanded]  = useState(false);

  const creditCost = (hints.length + 1) * 5;

  const getHint = async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/ai-hints/${problem.id}/hint`, {
        userId:    user.uid,
        code,
        language,
        hintLevel: hints.length + 1,
      });
      setHints(prev => [...prev, res.data.hint]);
      onHintUsed?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get hint');
    }
    setLoading(false);
  };

  const getEditorial = async () => {
    if (!user?.uid || !isSolved) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/ai-hints/${problem.id}/editorial`, {
        userId: user.uid,
      });
      setEditorial(res.data.editorial);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load editorial');
    }
    setLoading(false);
  };

  const getReview = async () => {
    if (!user?.uid || !code) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/ai-hints/${problem.id}/review`, {
        userId:   user.uid,
        code,
        language,
        passed:   testResults?.filter(r => r.passed).length || 0,
        total:    testResults?.length || 0,
      });
      setReview(res.data.review);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get review');
    }
    setLoading(false);
  };

  const TABS = [
    { key: 'hints',     label: '💡 Hints',     locked: false },
    { key: 'editorial', label: '📖 Editorial',  locked: !isSolved },
    { key: 'review',    label: '🤖 AI Review',  locked: !code },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setExpanded(e => !e)}
        style={{
          width:        '100%',
          background:   expanded ? '#a855f722' : '#0d1117',
          border:       `1px solid ${expanded ? '#a855f744' : '#1e2a3a'}`,
          borderRadius: 12,
          color:        expanded ? '#a855f7' : '#888',
          cursor:       'pointer',
          fontSize:     13, fontWeight: 700,
          padding:      '10px 16px',
          display:      'flex', alignItems: 'center', justifyContent: 'space-between',
          transition:   'all 0.2s',
          marginBottom: expanded ? 0 : 0,
        }}
      >
        <span>🤖 AI Assistant</span>
        <span style={{ fontSize: 18 }}>{expanded ? '▲' : '▼'}</span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: '0 0 12px 12px', borderTop: 'none', padding: '16px' }}>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
                {TABS.map(t => (
                  <button key={t.key} onClick={() => !t.locked && setTab(t.key)}
                    style={{
                      flex: 1, background: tab === t.key ? '#a855f722' : 'transparent',
                      border: `1px solid ${tab === t.key ? '#a855f744' : '#1e2a3a'}`,
                      borderRadius: 8, color: t.locked ? '#333' : tab === t.key ? '#a855f7' : '#555',
                      cursor: t.locked ? 'not-allowed' : 'pointer', fontSize: 11, fontWeight: 600,
                      padding: '5px 4px', transition: 'all 0.2s',
                    }}
                  >
                    {t.label}
                    {t.locked && ' 🔒'}
                  </button>
                ))}
              </div>

              {/* Hints tab */}
              {tab === 'hints' && (
                <div>
                  {hints.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 12 }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>💡</div>
                      <div style={{ color: '#888', fontSize: 12, lineHeight: 1.5 }}>
                        Stuck? Get a contextual hint based on your code.
                        <br />Each hint costs {creditCost} credits.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {hints.map((hint, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          style={{ background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10, padding: '10px 13px' }}>
                          <div style={{ color: '#a855f7', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                            💡 Hint {i + 1}
                          </div>
                          <div style={{ color: '#c8c8c8', fontSize: 12, lineHeight: 1.6 }}>{hint}</div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {hints.length < 3 && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={getHint} disabled={loading}
                      style={{
                        width: '100%', background: loading ? '#1e2a3a' : 'linear-gradient(135deg, #a855f7, #7c3aed)',
                        border: 'none', borderRadius: 8, color: loading ? '#444' : '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, padding: '9px 0',
                      }}
                    >
                      {loading ? '⏳ Getting hint...' : `💡 Get Hint ${hints.length + 1} (${creditCost} credits)`}
                    </motion.button>
                  )}
                  {hints.length >= 3 && (
                    <div style={{ color: '#555', fontSize: 11, textAlign: 'center', padding: '4px 0' }}>
                      All hints used. Try the editorial after solving!
                    </div>
                  )}
                </div>
              )}

              {/* Editorial tab */}
              {tab === 'editorial' && (
                <div>
                  {!editorial ? (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📖</div>
                      <div style={{ color: '#888', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                        Full editorial with intuition, approach, and interview tips.
                        <br />Available after solving.
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} onClick={getEditorial} disabled={loading || !isSolved}
                        style={{ background: isSolved && !loading ? 'linear-gradient(135deg, #1a73e8, #0d47a1)' : '#1e2a3a', border: 'none', borderRadius: 8, color: isSolved && !loading ? '#fff' : '#444', cursor: isSolved && !loading ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, padding: '9px 20px' }}>
                        {loading ? '⏳ Generating...' : isSolved ? '📖 Generate Editorial' : '🔒 Solve first'}
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <div style={{ color: '#c8c8c8', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {editorial.content}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Code review tab */}
              {tab === 'review' && (
                <div>
                  {!review ? (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>🤖</div>
                      <div style={{ color: '#888', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
                        Get a senior engineer's code review — bugs, optimizations, and FAANG interview score.
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} onClick={getReview} disabled={loading || !code}
                        style={{ background: code && !loading ? 'linear-gradient(135deg, #00c896, #1a73e8)' : '#1e2a3a', border: 'none', borderRadius: 8, color: code && !loading ? '#fff' : '#444', cursor: code && !loading ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700, padding: '9px 20px' }}>
                        {loading ? '⏳ Reviewing...' : '🤖 Review My Code'}
                      </motion.button>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                      <div style={{ color: '#c8c8c8', fontSize: 12, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {review}
                      </div>
                      <button onClick={() => setReview(null)}
                        style={{ marginTop: 10, background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 11, padding: '5px 12px' }}>
                        Re-review
                      </button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div style={{ color: '#ff6b6b', fontSize: 11, marginTop: 8, textAlign: 'center' }}>{error}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
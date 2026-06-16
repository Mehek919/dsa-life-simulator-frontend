import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

// ── ProblemSolver ─────────────────────────────────────────────────────────────
// Loads a problem from Firestore via backend, renders CodeEditor,
// and handles submission → XP/credits award back to the user.

export default function ProblemSolver({ user, userData, setUserData }) {
  const { problemId } = useParams();
  const navigate      = useNavigate();

  const [problem,  setProblem]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  // ── Load problem ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!problemId) return;
    setLoading(true);
    axios
      .get(`${API_BASE}/problems/${problemId}`)
      .then(res => {
        if (res.data?.problem) setProblem(res.data.problem);
        else setError('Problem not found.');
      })
      .catch(() => setError('Failed to load problem.'))
      .finally(() => setLoading(false));
  }, [problemId]);

  // ── Handle submission ───────────────────────────────────────────────────────
  const handleSubmit = async (code, langId, testResults) => {
    if (!user?.uid) return { passed: false };

    const passed      = testResults.filter(r => r.passed).length;
    const total       = testResults.length;
    const allPassed   = passed === total && total > 0;

    try {
      const res = await axios.post(`${API_BASE}/problems/${problemId}/submit`, {
        userId:      user.uid,
        code,
        language:    langId,
        passed,
        total,
        allPassed,
        testResults: testResults.map(r => ({
          label:   r.label || '',
          passed:  r.passed,
          time:    r.time   || null,
          memory:  r.memory || null,
        })),
      });

      const data = res.data || {};

      // Update local userData with new XP/credits
      if (data.newXp !== undefined && typeof setUserData === 'function') {
        setUserData(prev => ({
          ...prev,
          xp:      data.newXp,
          credits: data.newCredits,
          level:   data.newLevel,
        }));
      }

      return {
        passed:       allPassed,
        passedCount:  passed,
        total,
        xp:           data.xpAwarded      || 0,
        credits:      data.creditsAwarded  || 0,
        newXp:        data.newXp,
        newLevel:     data.newLevel,
      };
    } catch (err) {
      console.error('Submit error:', err);
      // Still return local result even if backend fails
      return { passed: allPassed, passedCount: passed, total, xp: 0, credits: 0 };
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     '#0a0a14',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#555',
        fontFamily:     'Arial, sans-serif',
        flexDirection:  'column',
        gap:            16,
      }}>
        <div style={{
          width:        32, height: 32,
          border:       '3px solid #1e2a3a',
          borderTop:    '3px solid #22d3ee',
          borderRadius: '50%',
          animation:    'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 14 }}>Loading problem...</span>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !problem) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     '#0a0a14',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#ff6b6b',
        fontFamily:     'Arial, sans-serif',
        flexDirection:  'column',
        gap:            16,
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ fontSize: 15 }}>{error || 'Problem not found.'}</div>
        <button
          onClick={() => navigate('/hub')}
          style={{
            background:   'transparent',
            border:       '1px solid #ff4d4d44',
            borderRadius: 10,
            color:        '#ff6b6b',
            cursor:       'pointer',
            fontSize:     13,
            padding:      '8px 20px',
            marginTop:    8,
          }}
        >
          ← Back to Hub
        </button>
      </div>
    );
  }

  // ── Render editor ───────────────────────────────────────────────────────────
  return (
    <CodeEditor
      problem={problem}
      user={user}
      onSubmit={handleSubmit}
      defaultLanguage="python3"
    />
  );
}

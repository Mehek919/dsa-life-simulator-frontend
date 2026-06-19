import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

export default function ProblemSolver({ user, userData, setUserData, mode = "odyssey", }) {
  const { problemId } = useParams();
  const navigate = useNavigate();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProblem() {
      if (!problemId) {
        setError('Missing problem id.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setProblem(null);

      try {
        const safeId = encodeURIComponent(problemId);
        const res = await axios.get(`${API_BASE}/problems/${safeId}`);

        if (res.data?.problem) {
          setProblem(res.data.problem);
        } else {
          setError(`Problem not found: ${problemId}`);
        }
      } catch (err) {
        console.error('Problem load error:', {
          problemId,
          url: `${API_BASE}/problems/${problemId}`,
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });

        const status = err.response?.status;
        const backendMsg = err.response?.data?.error;

        if (status === 404) {
          setError(`Problem not found in backend: ${problemId}`);
        } else if (backendMsg) {
          setError(`Backend error: ${backendMsg}`);
        } else {
          setError(`Failed to load problem: ${problemId}`);
        }
      } finally {
        setLoading(false);
      }
    }

    loadProblem();
  }, [problemId]);

  const handleSubmit = async (code, langId, testResults) => {
    if (!user?.uid) return { passed: false };

    const passed = testResults.filter(r => r.passed).length;
    const total = testResults.length;
    const allPassed = passed === total && total > 0;

    try {
      const safeId = encodeURIComponent(problemId);

      const res = await axios.post(`${API_BASE}/problems/${safeId}/submit`, {
        userId: user.uid,
        code,
        language: langId,
        passed,
        total,
        allPassed,
        testResults: testResults.map(r => ({
          label: r.label || '',
          passed: r.passed,
          time: r.time || null,
          memory: r.memory || null,
        })),
      });

      const data = res.data || {};

      if (data.newXp !== undefined && typeof setUserData === 'function') {
        setUserData(prev => ({
          ...prev,
          xp: data.newXp,
          credits: data.newCredits,
          level: data.newLevel,
        }));
      }

      return {
        passed: allPassed,
        passedCount: passed,
        total,
        xp: data.xpAwarded || 0,
        credits: data.creditsAwarded || 0,
        newXp: data.newXp,
        newLevel: data.newLevel,
      };
    } catch (err) {
      console.error('Submit error:', err.response?.data || err.message);
      return {
        passed: allPassed,
        passedCount: passed,
        total,
        xp: 0,
        credits: 0,
      };
    }
  };

  const goBack = () => {
    if (problemId?.startsWith('roadmap-')) {
      navigate('/roadmap');
    } else {
      navigate('/odyssey');
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#555',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #1e2a3a',
          borderTop: '3px solid #22d3ee',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 14 }}>Loading problem...</span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff6b6b',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36 }}>⚠️</div>

        <div style={{ fontSize: 16, fontWeight: 700 }}>
          {error || 'Problem not found.'}
        </div>

        <div style={{ color: '#777', fontSize: 12, maxWidth: 520 }}>
          Open DevTools → Console. This updated file now prints the exact backend status and response.
        </div>

        <button
          onClick={goBack}
          style={{
            background: 'transparent',
            border: '1px solid #ff4d4d44',
            borderRadius: 10,
            color: '#ff6b6b',
            cursor: 'pointer',
            fontSize: 13,
            padding: '8px 20px',
            marginTop: 8,
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <CodeEditor
      problem={problem}
      user={user}
      onSubmit={handleSubmit}
      defaultLanguage="python3"
    />
  );
}

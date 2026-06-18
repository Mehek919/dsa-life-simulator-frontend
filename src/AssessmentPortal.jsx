import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';
import WebcamMonitor from './WebcamMonitor';

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function useProctoring({ enabled, onViolation }) {
  const tabSwitches    = useRef(0);
  const copyPasteCount = useRef(0);

  const logViolation = useCallback((type, detail = '') => {
    const v = { type, detail, timestamp: new Date().toISOString() };
    onViolation?.(v);
  }, [onViolation]);

  useEffect(() => {
    if (!enabled) return;
    const handleVisibility = () => {
      if (document.hidden) { tabSwitches.current++; logViolation('tab_switch', `Tab switch #${tabSwitches.current}`); }
    };
    const handleCopy       = () => { copyPasteCount.current++; logViolation('copy', 'Copied text'); };
    const handlePaste      = () => { copyPasteCount.current++; logViolation('paste', 'Pasted text'); };
    const handleRightClick = (e) => { e.preventDefault(); logViolation('right_click'); };
    const handleKeyDown    = (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) { e.preventDefault(); logViolation('devtools_attempt'); }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy',             handleCopy);
    document.addEventListener('paste',            handlePaste);
    document.addEventListener('contextmenu',      handleRightClick);
    document.addEventListener('keydown',          handleKeyDown);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy',             handleCopy);
      document.removeEventListener('paste',            handlePaste);
      document.removeEventListener('contextmenu',      handleRightClick);
      document.removeEventListener('keydown',          handleKeyDown);
    };
  }, [enabled, logViolation]);
}

function AssessmentTimer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    const t = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onExpire]);
  const pct   = (remaining / totalSeconds) * 100;
  const isLow = remaining < 300;
  const color = isLow ? '#ff4d4d' : remaining < 900 ? '#f5c542' : '#00c896';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0d1117', border: `1px solid ${color}44`, borderRadius: 10, padding: '8px 16px', boxShadow: isLow ? `0 0 16px ${color}33` : 'none' }}>
      <span style={{ fontSize: 14 }}>⏱</span>
      <div>
        <motion.div animate={isLow ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} style={{ color, fontSize: 20, fontWeight: 900, fontFamily: 'monospace' }}>
          {formatTime(remaining)}
        </motion.div>
        <div style={{ width: 80, height: 3, background: '#1e2a3a', borderRadius: 2, marginTop: 2 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s linear' }} />
        </div>
      </div>
    </div>
  );
}

function ViolationBanner({ violation, onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [violation, onDismiss]);
  const messages = { tab_switch: '⚠️ Tab switch detected — logged.', copy: '⚠️ Copy detected — proctored.', paste: '⚠️ Paste detected — proctored.', right_click: '⚠️ Right click blocked — proctored.', devtools_attempt: '⚠️ DevTools attempt blocked — proctored.' };
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#ff4d4d22', border: '1px solid #ff4d4d66', borderRadius: 10, padding: '10px 20px', color: '#ff6b6b', fontWeight: 700 }}>
      {messages[violation?.type] || '⚠️ Activity detected and logged.'}
    </motion.div>
  );
}

function ProblemNav({ problems, current, solved, scores, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px', width: 220, flexShrink: 0, borderRight: '1px solid #1e2a3a', background: '#060910', overflowY: 'auto' }}>
      <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Problems ({solved.length}/{problems.length} solved)
      </div>
      {problems.map((p, i) => {
        const isSolved  = solved.includes(p.id);
        const isCurrent = i === current;
        const diffColor = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' }[p.difficulty] || '#888';
        return (
          <button key={p.id} onClick={() => onSelect(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isCurrent ? '#1a73e811' : isSolved ? '#00c89608' : 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isSolved ? '#00c89622' : '#1e2a3a', border: `1px solid ${isSolved ? '#00c89644' : '#333'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
              {isSolved ? '✓' : i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isCurrent ? '#e8e8e8' : '#c8c8c8' }}>{p.title}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                <span style={{ color: diffColor, fontSize: 9, fontWeight: 700 }}>{p.difficulty}</span>
                {isSolved && scores[p.id] && <span style={{ color: '#00c896', fontSize: 9 }}>+{scores[p.id]}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AssessmentIntro({ assessment, onStart }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ background: '#0d1117', border: '1px solid #1a73e844', borderRadius: 20, padding: '36px', maxWidth: 560, width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #1a73e8, transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#1a73e822', border: '1px solid #1a73e844', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {assessment.companyLogo || '🏢'}
          </div>
          <div>
            <div style={{ color: '#1a73e8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Technical Assessment</div>
            <div style={{ color: '#e8e8e8', fontSize: 18, fontWeight: 800 }}>{assessment.companyName || 'Company'}</div>
          </div>
        </div>
        <h2 style={{ margin: '0 0 8px', color: '#e8e8e8', fontSize: 20, fontWeight: 700 }}>{assessment.title}</h2>
        <p style={{ margin: '0 0 24px', color: '#666', fontSize: 14, lineHeight: 1.6 }}>{assessment.description || 'Complete all problems within the time limit.'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { icon: '⏱', label: 'Duration',  value: `${assessment.durationMinutes || 60} minutes` },
            { icon: '📝', label: 'Problems',  value: `${assessment.problems?.length || 0} questions` },
            { icon: '💻', label: 'Languages', value: assessment.allowedLanguages?.join(', ') || 'All' },
            { icon: '🔒', label: 'Proctored', value: assessment.proctored ? 'Yes — webcam + activity' : 'No' },
          ].map(d => (
            <div key={d.label} style={{ background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{d.icon} {d.label}</div>
              <div style={{ color: '#c8c8c8', fontSize: 13, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#ff4d4d0a', border: '1px solid #ff4d4d22', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
          <div style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>⚠️ Rules</div>
          <ul style={{ margin: 0, padding: '0 0 0 16px', color: '#888', fontSize: 12, lineHeight: 1.8 }}>
            <li>Webcam will be active — ensure face is visible throughout</li>
            <li>Do not switch tabs or open other applications</li>
            <li>Do not copy-paste from external sources</li>
            <li>All activity and webcam snapshots are reviewed by the company</li>
            <li>Once started, the timer cannot be paused</li>
          </ul>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24, cursor: 'pointer', color: '#888', fontSize: 13, lineHeight: 1.5 }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, cursor: 'pointer' }} />
          I agree to the assessment rules including webcam monitoring. My activity will be logged and shared with {assessment.companyName || 'the company'}.
        </label>
        <motion.button whileHover={{ scale: agreed ? 1.02 : 1 }} whileTap={{ scale: agreed ? 0.98 : 1 }} onClick={() => agreed && onStart()}
          style={{ width: '100%', background: agreed ? 'linear-gradient(135deg, #1a73e8, #0d47a1)' : '#1e2a3a', border: 'none', borderRadius: 12, color: agreed ? '#fff' : '#444', cursor: agreed ? 'pointer' : 'not-allowed', padding: '12px 16px', fontWeight: 800 }}>
          {agreed ? '🚀 Start Assessment' : 'Please agree to the rules first'}
        </motion.button>
      </motion.div>
    </div>
  );
}

function AssessmentComplete({ assessment, solved, scores, totalTime, violations }) {
  const navigate   = useNavigate();
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxScore   = (assessment.problems || []).reduce((a, p) => a + ({ Easy: 100, Medium: 200, Hard: 300 }[p.difficulty] || 100), 0);
  const pct        = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const timeUsed   = (assessment.durationMinutes * 60) - totalTime;
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Arial, sans-serif', color: '#e8e8e8' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ background: '#0d1117', border: '1px solid #00c89644', borderRadius: 20, padding: '40px', maxWidth: 480, width: '100%' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '📝'}</div>
        <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900 }}>Assessment Complete!</h2>
        <p style={{ color: '#666', margin: '0 0 28px', fontSize: 14 }}>Your results have been submitted to {assessment.companyName || 'the company'}.</p>
        <div style={{ marginBottom: 28, position: 'relative', display: 'inline-block' }}>
          <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={60} cy={60} r={50} fill="none" stroke="#1e2a3a" strokeWidth={8} />
            <motion.circle cx={60} cy={60} r={50} fill="none" stroke={pct >= 70 ? '#00c896' : pct >= 40 ? '#f5c542' : '#ff4d4d'} strokeWidth={8} strokeLinecap="round" strokeDasharray={314} initial={{ strokeDashoffset: 314 }} animate={{ strokeDashoffset: 314 - (pct / 100) * 314 }} transition={{ duration: 0.8 }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#e8e8e8', fontSize: 22, fontWeight: 900 }}>{pct}%</div>
            <div style={{ color: '#555', fontSize: 10 }}>Score</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Problems Solved', value: `${solved.length}/${assessment.problems?.length || 0}`, color: '#00c896' },
            { label: 'Total Score',     value: `${totalScore}/${maxScore}`,                            color: '#a855f7' },
            { label: 'Time Used',       value: formatTime(timeUsed),                                   color: '#1a73e8' },
          ].map(s => (
            <div key={s.label} style={{ background: '#060910', border: '1px solid #1e2a3a', borderRadius: 10, padding: '10px 8px' }}>
              <div style={{ color: s.color, fontSize: 16, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: '#444', fontSize: 9, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {violations?.length > 0 && (
          <div style={{ background: '#ff4d4d0a', border: '1px solid #ff4d4d22', borderRadius: 10, padding: '10px 14px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ {violations.length} activity flag{violations.length !== 1 ? 's' : ''} recorded</div>
            <div style={{ color: '#666', fontSize: 11 }}>Included in your submission report.</div>
          </div>
        )}
        <p style={{ color: '#555', fontSize: 13, margin: '0 0 24px' }}>The hiring team will review your submission within 3-5 business days.</p>
        <button onClick={() => navigate('/world')} style={{ width: '100%', background: 'linear-gradient(135deg, #1a73e8, #0d47a1)', border: 'none', borderRadius: 12, color: '#fff', cursor: 'pointer', padding: '12px 16px', fontWeight: 800 }}>
          Back to World →
        </button>
      </motion.div>
    </div>
  );
}

export default function AssessmentPortal({ user, userData, setUserData }) {
  const navigate         = useNavigate();
  const { assessmentId } = useParams();

  const [assessment,    setAssessment]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [phase,         setPhase]         = useState('intro');
  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [solved,        setSolved]        = useState([]);
  const [scores,        setScores]        = useState({});
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [violations,    setViolations]    = useState([]);
  const [lastViolation, setLastViolation] = useState(null);
  const [toast,         setToast]         = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleViolation = useCallback((v) => {
    setViolations(prev => [...prev, v]);
    setLastViolation(v);
  }, []);

  useProctoring({
    enabled:     phase === 'active' && !!assessment?.proctored,
    onViolation: handleViolation,
  });

  useEffect(() => {
    if (!assessmentId) return;
    axios.get(`${API_BASE}/assessments/${assessmentId}`)
      .then(res => { setAssessment(res.data.assessment); setTimeLeft((res.data.assessment.durationMinutes || 60) * 60); })
      .catch(() => navigate('/world'))
      .finally(() => setLoading(false));
  }, [assessmentId, navigate]);

  const handleStart = async () => {
    try {
      await axios.post(`${API_BASE}/assessments/${assessmentId}/start`, { userId: user?.uid });
      setPhase('active');
    } catch { showToast('Failed to start assessment.', 'error'); }
  };

  const handleSubmit = async (code, langId, testResults) => {
    const problem   = assessment?.problems?.[currentIdx];
    if (!problem)   return { passed: false };
    const passed    = testResults.filter(r => r.passed).length;
    const total     = testResults.length;
    const allPassed = passed === total && total > 0;
    const score     = allPassed ? ({ Easy: 100, Medium: 200, Hard: 300 }[problem.difficulty] || 100) : 0;
    try {
      await axios.post(`${API_BASE}/assessments/${assessmentId}/submit`, {
        userId: user.uid, problemId: problem.id, code, language: langId,
        passed, total, allPassed, score, testResults, violations: violations.length,
      });
      if (allPassed) {
        setSolved(prev => [...new Set([...prev, problem.id])]);
        setScores(prev => ({ ...prev, [problem.id]: score }));
        showToast(`✅ Correct! +${score} points`);
        const next = assessment.problems.findIndex((p, i) => i > currentIdx && !solved.includes(p.id));
        if (next !== -1) setTimeout(() => setCurrentIdx(next), 1000);
      } else {
        showToast(`❌ ${passed}/${total} tests — keep trying`, 'error');
      }
      return { passed: allPassed, passedCount: passed, total, xp: 0, credits: 0 };
    } catch {
      showToast('Submission failed.', 'error');
      return { passed: false, passedCount: passed, total };
    }
  };

  const handleTimeExpire = useCallback(async () => {
    if (phase !== 'active') return;
    try { await axios.post(`${API_BASE}/assessments/${assessmentId}/complete`, { userId: user?.uid, solved, scores, violations, completedAt: new Date().toISOString(), autoSubmitted: true }); } catch {}
    setPhase('complete');
  }, [phase, assessmentId, user?.uid, solved, scores, violations]);

  const handleComplete = async () => {
    try { await axios.post(`${API_BASE}/assessments/${assessmentId}/complete`, { userId: user?.uid, solved, scores, violations, completedAt: new Date().toISOString(), autoSubmitted: false }); } catch {}
    setPhase('complete');
  };

  // show a short toast when storage snapshot metadata saved via backend
  const handleSnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    showToast(`Snapshot #${snapshot.index} captured`);
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Arial, sans-serif' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} style={{ width: 36, height: 36, border: '3px solid #1e2a3a', borderTop: '3px solid #1a73e8', borderRadius: '50%' }} />
      <div style={{ color: '#555', fontSize: 13 }}>Loading assessment...</div>
    </div>
  );

  if (phase === 'intro')    return <AssessmentIntro assessment={assessment || {}} onStart={handleStart} />;
  if (phase === 'complete') return <AssessmentComplete assessment={assessment || {}} solved={solved} scores={scores} totalTime={timeLeft} violations={violations} />;

  const problems       = assessment?.problems || [];
  const currentProblem = problems[currentIdx];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a14', fontFamily: 'Arial, sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #1e2a3a', background: '#0d1117', flexShrink: 0, gap: 10, flexWrap: 'wrap' }}>
        {/* Left — company info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{assessment?.companyLogo || '💼'}</span>
          <div>
            <div style={{ color: '#1a73e8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{assessment?.companyName} — Technical Assessment</div>
            <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 700 }}>{assessment?.title}</div>
          </div>
        </div>

        {/* Right — controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Score */}
          <div style={{ background: '#a855f711', border: '1px solid #a855f733', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase' }}>Score</div>
            <div style={{ color: '#a855f7', fontSize: 16, fontWeight: 900 }}>{Object.values(scores).reduce((a, b) => a + b, 0)}</div>
          </div>

          {/* Violation count */}
          {violations.length > 0 && (
            <div style={{ background: '#ff4d4d11', border: '1px solid #ff4d4d33', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d4d' }} />
              <span style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 600 }}>{violations.length} flag{violations.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Timer */}
          <AssessmentTimer totalSeconds={assessment?.durationMinutes * 60 || 3600} onExpire={handleTimeExpire} />

          {/* Submit */}
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleComplete}
            style={{ background: 'linear-gradient(135deg, #00c896, #1a73e8)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: '8px 16px' }}>
            Submit Assessment →
          </motion.button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ProblemNav problems={problems} current={currentIdx} solved={solved} scores={scores} onSelect={setCurrentIdx} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {currentProblem && (
            <CodeEditor problem={currentProblem} user={user} onSubmit={handleSubmit} defaultLanguage={assessment?.defaultLanguage || 'python3'} />
          )}
        </div>
      </div>

      <AnimatePresence>
        {lastViolation && <ViolationBanner violation={lastViolation} onDismiss={() => setLastViolation(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: toast.type === 'error' ? '#ff4d4d22' : '#00c89622', border: `1px solid ${toast.type === 'error' ? '#ff4d4d44' : '#00c89644'}`, padding: '10px 16px', borderRadius: 8, color: toast.type === 'error' ? '#ff6b6b' : '#00c896', fontWeight: 700 }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Webcam Monitor for proctored assessments */}
      {assessment?.proctored && (
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 1200 }}>
          <WebcamMonitor
            assessmentId={assessmentId}
            userId={user?.uid}
            enabled={phase === 'active'}
            snapshotInterval={60}
            onViolation={handleViolation}
            onError={handleViolation}
            onSnapshot={handleSnapshot}
          />
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
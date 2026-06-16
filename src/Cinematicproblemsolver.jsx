import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

// ── Typewriter effect ──────────────────────────────────────────────────────────
function Typewriter({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const [done,      setDone]      = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    setDone(false);

    const timer = setInterval(() => {
      if (idx.current < text.length) {
        setDisplayed(text.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(timer);
        setDone(true);
        onDone?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onDone]);

  return (
    <span>
      {displayed}
      {!done && <span style={{ animation: 'blink 1s infinite', color: '#1a73e8' }}>|</span>}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </span>
  );
}

// ── Star Rating ────────────────────────────────────────────────────────────────
function StarRating({ stars, max = 3 }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: i * 0.15, type: 'spring', stiffness: 200 }}
          style={{
            fontSize:   24,
            color:      i < stars ? '#f5c542' : '#333',
            filter:     i < stars ? 'drop-shadow(0 0 8px #f5c542)' : 'none',
          }}
        >
          ★
        </motion.span>
      ))}
    </div>
  );
}

// ── XP Burst Animation ─────────────────────────────────────────────────────────
function XPBurst({ xp, credits }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
    >
      {[
        { value: `+${xp} XP`,      color: '#a855f7', glow: '#a855f744' },
        { value: `+${credits} CR`, color: '#f5c542', glow: '#f5c54244' },
      ].map(({ value, color, glow }) => (
        <motion.div
          key={value}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:   glow,
            border:       `1px solid ${color}66`,
            borderRadius: 30,
            padding:      '8px 24px',
            color,
            fontSize:     20,
            fontWeight:   900,
            boxShadow:    `0 0 20px ${glow}`,
          }}
        >
          {value}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Cinematic Scene ────────────────────────────────────────────────────────────
function CinematicScene({ problem, onReveal }) {
  const [sceneTyped,    setSceneTyped]    = useState(false);
  const [showRevealBtn, setShowRevealBtn] = useState(false);

  const companyColor = {
    Google:    '#4285f4',
    Amazon:    '#ff9900',
    Apple:     '#a2aaad',
    Meta:      '#0081fb',
    Microsoft: '#00a4ef',
  }[problem.companies?.[0]] || '#1a73e8';

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#0a0a14',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
      fontFamily:     'Arial, sans-serif',
      position:       'relative',
      overflow:       'hidden',
    }}>
      {/* Cinematic orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 6, repeat: Infinity }}
          style={{
            position: 'absolute', width: 500, height: 500,
            background: companyColor, borderRadius: '50%',
            left: '30%', top: '20%',
            transform: 'translate(-50%,-50%)',
            filter: 'blur(120px)',
          }}
        />
      </div>

      {/* Film grain overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
        opacity: 0.4,
      }} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{ maxWidth: 680, width: '100%', position: 'relative', zIndex: 1 }}
      >
        {/* Company badge */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}
        >
          <div style={{
            background:   companyColor + '22',
            border:       `1px solid ${companyColor}44`,
            borderRadius: 20, padding: '4px 14px',
            color:        companyColor, fontSize: 12, fontWeight: 700,
          }}>
            📍 {problem.companies?.[0] || 'FAANG'}
          </div>
          <div style={{
            background:   '#ff4d4d22',
            border:       '1px solid #ff4d4d44',
            borderRadius: 20, padding: '4px 14px',
            color:        '#ff4d4d', fontSize: 12, fontWeight: 700,
          }}>
            {problem.difficulty}
          </div>
          {problem.isBoss && (
            <div style={{
              background:   '#ff4d4d33',
              border:       '1px solid #ff4d4d66',
              borderRadius: 20, padding: '4px 14px',
              color:        '#ff4d4d', fontSize: 12, fontWeight: 900,
              animation:    'pulse 2s infinite',
            }}>
              ⚔️ BOSS PROBLEM
            </div>
          )}
        </motion.div>

        {/* Problem title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontSize:      28, fontWeight: 900,
            margin:        '0 0 28px',
            background:    `linear-gradient(135deg, #e8e8e8, ${companyColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {problem.title}
        </motion.h1>

        {/* Cinematic scene text */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            background:     '#0d1117',
            border:         `1px solid ${companyColor}33`,
            borderRadius:   16,
            padding:        '24px 28px',
            marginBottom:   24,
            position:       'relative',
            overflow:       'hidden',
          }}
        >
          <div style={{
            position:   'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${companyColor}, transparent)`,
          }} />

          <div style={{ color: companyColor, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            🎬 Mission Briefing
          </div>

          <p style={{
            color: '#c8c8c8', fontSize: 15, lineHeight: 1.8,
            margin: 0, fontStyle: 'italic',
          }}>
            <Typewriter
              text={problem.scene || problem.story || problem.description}
              speed={14}
              onDone={() => {
                setSceneTyped(true);
                setTimeout(() => setShowRevealBtn(true), 500);
              }}
            />
          </p>
        </motion.div>

        {/* Memory hook */}
        <AnimatePresence>
          {sceneTyped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background:   '#a855f711',
                border:       '1px solid #a855f733',
                borderRadius: 12,
                padding:      '12px 18px',
                marginBottom: 24,
                display:      'flex',
                alignItems:   'center',
                gap:          10,
              }}
            >
              <span style={{ fontSize: 18 }}>🧠</span>
              <span style={{ color: '#c8a8f7', fontSize: 13, fontStyle: 'italic' }}>
                {problem.memoryHook}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rewards preview */}
        <AnimatePresence>
          {sceneTyped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display:        'flex',
                gap:            10,
                marginBottom:   28,
                justifyContent: 'center',
                flexWrap:       'wrap',
              }}
            >
              {[
                { icon: '⚡', value: `+${problem.xp} XP`,      color: '#a855f7' },
                { icon: '💰', value: `+${problem.credits} Credits`, color: '#f5c542' },
                { icon: '⭐', value: 'Up to 3 stars',           color: '#f5c542' },
                { icon: '🏆', value: problem.isBoss ? 'Chapter Badge' : 'Progress', color: '#00c896' },
              ].map(r => (
                <div key={r.value} style={{
                  background:   r.color + '11',
                  border:       `1px solid ${r.color}33`,
                  borderRadius: 20, padding: '4px 14px',
                  color:        r.color, fontSize: 12, fontWeight: 600,
                  display:      'flex', alignItems: 'center', gap: 5,
                }}>
                  <span>{r.icon}</span>
                  <span>{r.value}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reveal button */}
        <AnimatePresence>
          {showRevealBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onReveal}
              style={{
                width:        '100%',
                background:   `linear-gradient(135deg, ${companyColor}, ${companyColor}88)`,
                border:       'none',
                borderRadius: 14,
                color:        '#fff',
                cursor:       'pointer',
                fontSize:     16,
                fontWeight:   800,
                padding:      '16px 0',
                boxShadow:    `0 0 30px ${companyColor}55`,
                letterSpacing: '0.03em',
              }}
            >
              🚀 Accept the Mission →
            </motion.button>
          )}
        </AnimatePresence>

        {/* Skip button */}
        {sceneTyped && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={onReveal}
            style={{
              display:      'block',
              margin:       '12px auto 0',
              background:   'transparent',
              border:       'none',
              color:        '#444',
              cursor:       'pointer',
              fontSize:     12,
            }}
          >
            Skip intro →
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}

// ── Result Screen ──────────────────────────────────────────────────────────────
function ResultScreen({ problem, result, onContinue, onRetry }) {
  const stars = result.allPassed
    ? result.hintsUsed === 0 ? 3 : result.hintsUsed <= 2 ? 2 : 1
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position:       'fixed', inset: 0, zIndex: 999,
        background:     'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     'Arial, sans-serif',
      }}
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 150 }}
        style={{
          background:   '#0d1117',
          border:       `1px solid ${result.allPassed ? '#00c89644' : '#ff4d4d44'}`,
          borderRadius: 20,
          padding:      '40px',
          maxWidth:     480,
          width:        '100%',
          textAlign:    'center',
          boxShadow:    result.allPassed ? '0 0 60px #00c89622' : '0 0 60px #ff4d4d22',
        }}
      >
        {/* Result emoji */}
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5 }}
          style={{ fontSize: 64, marginBottom: 16 }}
        >
          {result.allPassed ? (problem.isBoss ? '🏆' : '✅') : '❌'}
        </motion.div>

        <h2 style={{
          margin:   '0 0 8px',
          color:    result.allPassed ? '#00c896' : '#ff4d4d',
          fontSize: 26, fontWeight: 900,
        }}>
          {result.allPassed
            ? problem.isBoss ? 'BOSS DEFEATED!' : 'Mission Complete!'
            : 'Mission Failed'}
        </h2>

        <p style={{ color: '#666', fontSize: 14, margin: '0 0 24px' }}>
          {result.allPassed
            ? `${result.passed}/${result.total} test cases passed`
            : `${result.passed}/${result.total} test cases passed — try again`}
        </p>

        {/* Stars */}
        {result.allPassed && (
          <div style={{ marginBottom: 24 }}>
            <StarRating stars={stars} max={3} />
            <p style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
              {stars === 3 ? 'Perfect — no hints used!' : stars === 2 ? 'Great — minimal hints' : 'Solved — with hints'}
            </p>
          </div>
        )}

        {/* XP burst */}
        {result.allPassed && (
          <div style={{ marginBottom: 28 }}>
            <XPBurst xp={result.xp || 0} credits={result.credits || 0} />
          </div>
        )}

        {/* Pattern learned */}
        <div style={{
          background:   '#a855f711', border: '1px solid #a855f733',
          borderRadius: 10, padding: '10px 16px', marginBottom: 24,
          textAlign: 'left',
        }}>
          <div style={{ color: '#a855f7', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
            Pattern Learned
          </div>
          <div style={{ color: '#c8a8f7', fontSize: 13 }}>
            {problem.pattern}
          </div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
            {problem.memoryHook}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!result.allPassed && (
            <button
              onClick={onRetry}
              style={{
                flex:         1,
                background:   '#1e2a3a',
                border:       '1px solid #1e2a3a',
                borderRadius: 10,
                color:        '#888',
                cursor:       'pointer',
                fontSize:     14, fontWeight: 600,
                padding:      '12px 0',
              }}
            >
              Try Again
            </button>
          )}
          <button
            onClick={onContinue}
            style={{
              flex:         1,
              background:   result.allPassed
                ? 'linear-gradient(135deg, #00c896, #1a73e8)'
                : '#1e2a3a',
              border:       'none',
              borderRadius: 10,
              color:        '#fff',
              cursor:       'pointer',
              fontSize:     14, fontWeight: 700,
              padding:      '12px 0',
              boxShadow:    result.allPassed ? '0 0 20px #00c89633' : 'none',
            }}
          >
            {result.allPassed ? 'Continue →' : 'Back to Map'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main CinematicProblemSolver ────────────────────────────────────────────────
export default function CinematicProblemSolver({ user, userData, setUserData }) {
  const { problemId } = useParams();
  const navigate      = useNavigate();

  const [problem,    setProblem]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [phase,      setPhase]      = useState('cinematic'); // cinematic | editor | result
  const [result,     setResult]     = useState(null);
  const [hintsUsed,  setHintsUsed]  = useState(0);

  useEffect(() => {
    if (!problemId) return;
    setLoading(true);
    axios.get(`${API_BASE}/problems/${problemId}`)
      .then(res => {
        if (res.data?.problem) setProblem(res.data.problem);
        else setError('Problem not found.');
      })
      .catch(() => setError('Failed to load problem.'))
      .finally(() => setLoading(false));
  }, [problemId]);

  const handleSubmit = async (code, langId, testResults) => {
    const passed    = testResults.filter(r => r.passed).length;
    const total     = testResults.length;
    const allPassed = passed === total && total > 0;

    const stars = allPassed
      ? hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1
      : 0;

    try {
      const res = await axios.post(`${API_BASE}/problems/${problemId}/submit`, {
        userId:      user.uid,
        code,
        language:    langId,
        passed,
        total,
        allPassed,
        stars,
        hintsUsed,
        testResults: testResults.map(r => ({
          label:  r.label || '',
          passed: r.passed,
          time:   r.time   || null,
          memory: r.memory || null,
        })),
      });

      const data = res.data || {};

      if (data.newXp !== undefined && typeof setUserData === 'function') {
        setUserData(prev => ({
          ...prev,
          xp:      data.newXp,
          credits: data.newCredits,
          level:   data.newLevel,
        }));
      }

      const submitResult = {
        allPassed,
        passed,
        total,
        xp:       data.xpAwarded      || 0,
        credits:  data.creditsAwarded  || 0,
        stars,
        hintsUsed,
      };

      setResult(submitResult);
      setPhase('result');

      return {
        passed:      allPassed,
        passedCount: passed,
        total,
        xp:          data.xpAwarded     || 0,
        credits:     data.creditsAwarded || 0,
      };
    } catch (err) {
      console.error('Submit error:', err);
      const submitResult = { allPassed, passed, total, xp: 0, credits: 0, stars, hintsUsed };
      setResult(submitResult);
      setPhase('result');
      return { passed: allPassed, passedCount: passed, total, xp: 0, credits: 0 };
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, fontFamily: 'Arial, sans-serif',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ width: 36, height: 36, border: '3px solid #1e2a3a', borderTop: '3px solid #1a73e8', borderRadius: '50%' }}
        />
        <div style={{ color: '#555', fontSize: 13 }}>Loading mission briefing...</div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ fontSize: 32 }}>⚠️</div>
        <div style={{ color: '#ff6b6b', fontSize: 15 }}>{error || 'Mission not found.'}</div>
        <button
          onClick={() => navigate('/hub')}
          style={{
            background: 'transparent', border: '1px solid #ff4d4d44',
            borderRadius: 10, color: '#ff6b6b', cursor: 'pointer',
            fontSize: 13, padding: '8px 20px',
          }}
        >
          ← Back to Hub
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {/* ── Phase 1: Cinematic intro ── */}
      {phase === 'cinematic' && (
        <motion.div key="cinematic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <CinematicScene
            problem={problem}
            onReveal={() => setPhase('editor')}
          />
        </motion.div>
      )}

      {/* ── Phase 2: Code editor ── */}
      {phase === 'editor' && (
        <motion.div
          key="editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ height: '100vh' }}
        >
          <CodeEditor
            problem={problem}
            user={user}
            onSubmit={handleSubmit}
            onHintUsed={() => setHintsUsed(h => h + 1)}
            defaultLanguage="python3"
          />
        </motion.div>
      )}

      {/* ── Phase 3: Result screen (overlays editor) ── */}
      {phase === 'result' && result && (
        <>
          <motion.div
            key="editor-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ height: '100vh' }}
          >
            <CodeEditor
              problem={problem}
              user={user}
              onSubmit={handleSubmit}
              defaultLanguage="python3"
            />
          </motion.div>
          <ResultScreen
            problem={problem}
            result={result}
            onContinue={() => navigate('/hub')}
            onRetry={() => {
              setPhase('editor');
              setResult(null);
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
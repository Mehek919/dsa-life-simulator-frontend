import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Animated Background ────────────────────────────────────────────────────────
function Background({ accentColor }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#0a0a14', overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.07, 0.13, 0.07] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', borderRadius: '50%',
          width: 500, height: 500,
          background: accentColor || '#a855f7',
          left: '10%', top: '10%',
          transform: 'translate(-50%,-50%)',
          filter: 'blur(100px)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        style={{
          position: 'absolute', borderRadius: '50%',
          width: 400, height: 400,
          background: '#1a73e8',
          right: '10%', bottom: '15%',
          transform: 'translate(50%,50%)',
          filter: 'blur(100px)',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'linear-gradient(#ffffff03 1px,transparent 1px),' +
          'linear-gradient(90deg,#ffffff03 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
    </div>
  );
}

// ── Particle burst for role reveal ────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    angle: (i / 18) * 360,
    delay: i * 0.04,
    color: ['#a855f7','#1a73e8','#00c896','#f5c542','#ff6b6b'][i % 5],
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: '50vw', y: '50vh', scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: `calc(50vw + ${Math.cos((p.angle * Math.PI) / 180) * 280}px)`,
            y: `calc(50vh + ${Math.sin((p.angle * Math.PI) / 180) * 280}px)`,
            scale: [0, 1.4, 0],
          }}
          transition={{ duration: 1.4, delay: p.delay, ease: 'easeOut' }}
          style={{
            position: 'absolute', width: 8, height: 8,
            borderRadius: '50%', background: p.color,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ── Stage: Intro ───────────────────────────────────────────────────────────────
function IntroStage({ onStart, loading, userName }) {
  return (
    <motion.div
      key="intro"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        style={{ fontSize: 64, marginBottom: 16 }}
      >
        🎭
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{
          fontSize: 36, fontWeight: 900, color: '#e8e8e8',
          margin: '0 0 10px', letterSpacing: '-0.5px',
        }}
      >
        Welcome, {userName?.split(' ')[0] || 'Developer'}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{ color: '#666', fontSize: 15, margin: '0 0 32px', lineHeight: 1.6 }}
      >
        Before you enter the world, we need to figure out who you are as a developer.
        Answer 5 questions honestly — your Life Role will shape your entire journey.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        style={{
          background: '#0d1117', border: '1px solid #1e2a3a',
          borderRadius: 16, padding: '20px 28px',
          marginBottom: 28, textAlign: 'left',
        }}
      >
        {[
          { icon: '🧠', text: '5 questions about how you think and work' },
          { icon: '🎭', text: 'AI assigns your unique Life Role' },
          { icon: '⚡', text: 'Takes about 3 minutes' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 0',
              borderBottom: i < 2 ? '1px solid #0f1923' : 'none',
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ color: '#888', fontSize: 13 }}>{item.text}</span>
          </motion.div>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        disabled={loading}
        style={{
          width: '100%',
          background: loading
            ? '#1e2a3a'
            : 'linear-gradient(135deg, #a855f7, #1a73e8)',
          border: 'none', borderRadius: 14,
          color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 700,
          padding: '14px 0',
          boxShadow: loading ? 'none' : '0 0 30px #a855f744',
          transition: 'all 0.3s',
        }}
      >
        {loading ? '⏳ Preparing your questions...' : '🚀 Begin Onboarding'}
      </motion.button>
    </motion.div>
  );
}

// ── Stage: Questions ───────────────────────────────────────────────────────────
function QuestionsStage({ questions, currentQ, answers, onAnswer, onNext, onPrev, loading }) {
  const q        = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const answer   = answers[currentQ] || '';
  const isLast   = currentQ === questions.length - 1;

  return (
    <motion.div
      key="questions"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 600, width: '100%' }}
    >
      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <span style={{ color: '#555', fontSize: 12 }}>
            Question {currentQ + 1} of {questions.length}
          </span>
          <span style={{ color: '#a855f7', fontSize: 12, fontWeight: 700 }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div style={{
          width: '100%', height: 4, background: '#1e2a3a',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #a855f7, #1a73e8)',
              borderRadius: 2,
            }}
          />
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
          {questions.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width:      i === currentQ ? 20 : 6,
                background: i < currentQ ? '#a855f7' : i === currentQ ? '#1a73e8' : '#1e2a3a',
              }}
              style={{ height: 6, borderRadius: 3, transition: 'all 0.3s' }}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          style={{
            background: '#0d1117',
            border: '1px solid #1e2a3a',
            borderRadius: 18,
            padding: '28px 28px 24px',
            boxShadow: '0 0 40px #a855f711',
          }}
        >
          {/* Category tag */}
          {q.category && (
            <div style={{
              display: 'inline-block',
              background: '#a855f711', border: '1px solid #a855f733',
              borderRadius: 20, padding: '3px 12px',
              color: '#a855f7', fontSize: 11, fontWeight: 700,
              marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {q.category}
            </div>
          )}

          <h2 style={{
            color: '#e8e8e8', fontSize: 20, fontWeight: 700,
            margin: '0 0 20px', lineHeight: 1.4,
          }}>
            {q.question}
          </h2>

          <textarea
            value={answer}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Share your honest thoughts..."
            rows={5}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#060910',
              border: `1px solid ${answer.length > 0 ? '#a855f755' : '#1e2a3a'}`,
              borderRadius: 12, color: '#e8e8e8',
              fontSize: 14, lineHeight: 1.6,
              padding: '14px 16px',
              outline: 'none', resize: 'vertical',
              transition: 'border-color 0.3s',
              fontFamily: 'Arial, sans-serif',
            }}
            onFocus={e => e.target.style.borderColor = '#a855f7'}
            onBlur={e => e.target.style.borderColor = answer.length > 0 ? '#a855f755' : '#1e2a3a'}
          />

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: 6,
          }}>
            <span style={{ color: '#333', fontSize: 11 }}>
              {answer.trim().length} characters
            </span>
            {answer.trim().length > 0 && answer.trim().length < 10 && (
              <span style={{ color: '#f5c542', fontSize: 11 }}>
                A bit more detail helps...
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              onClick={onPrev}
              disabled={currentQ === 0}
              style={{
                flex: 1,
                background: '#0d1117', border: '1px solid #1e2a3a',
                borderRadius: 12, color: currentQ === 0 ? '#333' : '#888',
                cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, padding: '12px 0',
                transition: 'all 0.2s',
              }}
            >
              ← Back
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNext}
              disabled={loading || answer.trim().length < 1}
              style={{
                flex: 2,
                background: answer.trim().length < 1 || loading
                  ? '#1e2a3a'
                  : isLast
                    ? 'linear-gradient(135deg, #f5c542, #ff6b6b)'
                    : 'linear-gradient(135deg, #a855f7, #1a73e8)',
                border: 'none', borderRadius: 12,
                color: answer.trim().length < 1 ? '#444' : '#fff',
                cursor: answer.trim().length < 1 || loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700, padding: '12px 0',
                boxShadow: answer.trim().length > 0 && !loading
                  ? isLast ? '0 0 20px #f5c54233' : '0 0 20px #a855f733'
                  : 'none',
                transition: 'all 0.3s',
              }}
            >
              {loading
                ? '⏳ Analyzing your answers...'
                : isLast
                  ? '✨ Reveal My Role'
                  : 'Next →'}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Stage: Role Reveal ─────────────────────────────────────────────────────────
function RoleRevealStage({ roleData, onEnter }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <motion.div
      key="role"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}
    >
      {/* Particle burst */}
      <Particles />

      {/* Role title — cinematic entrance */}
      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.3 }}
        onAnimationComplete={() => setRevealed(true)}
        style={{ marginBottom: 8 }}
      >
        <motion.div
          animate={{ textShadow: revealed ? ['0 0 20px #a855f7', '0 0 60px #a855f7', '0 0 20px #a855f7'] : '0 0 0px transparent' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            fontSize: 52, fontWeight: 900, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #a855f7, #1a73e8, #00c896)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1, marginBottom: 12,
          }}
        >
          {roleData.primaryRole}
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{ color: '#888', fontSize: 15, margin: '0 0 28px', lineHeight: 1.6 }}
      >
        {roleData.roleDescription}
      </motion.p>

      {/* Details card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        style={{
          background: '#0d1117', border: '1px solid #a855f733',
          borderRadius: 18, padding: '24px 28px',
          marginBottom: 24, textAlign: 'left',
          boxShadow: '0 0 40px #a855f711',
        }}
      >
        {/* Traits */}
        {roleData.traits?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              🎯 Traits
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {roleData.traits.map((trait, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 + i * 0.07 }}
                  style={{
                    background: '#a855f711', border: '1px solid #a855f744',
                    borderRadius: 20, padding: '4px 14px',
                    color: '#a855f7', fontSize: 12, fontWeight: 600,
                  }}
                >
                  {trait}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {roleData.strengths?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              💪 Strengths
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {roleData.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.08 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                >
                  <span style={{ color: '#00c896', fontSize: 14, marginTop: 1 }}>✓</span>
                  <span style={{ color: '#c8c8c8', fontSize: 13, lineHeight: 1.5 }}>{s}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        {roleData.reasoning && (
          <div>
            <div style={{ color: '#555', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              🧠 Why This Role
            </div>
            <p style={{ color: '#777', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
              {roleData.reasoning}
            </p>
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onEnter}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #a855f7, #1a73e8)',
          border: 'none', borderRadius: 14,
          color: '#fff', cursor: 'pointer',
          fontSize: 16, fontWeight: 800, padding: '16px 0',
          boxShadow: '0 0 40px #a855f755',
          letterSpacing: '0.02em',
        }}
      >
        🌍 Enter The World →
      </motion.button>
    </motion.div>
  );
}

// ── Main Onboarding Component ──────────────────────────────────────────────────
const Onboarding = ({ user, onComplete }) => {
  const navigate = useNavigate();

  const [stage,           setStage]           = useState('intro');
  const [questions,       setQuestions]       = useState([]);
  const [answers,         setAnswers]         = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [loading,         setLoading]         = useState(false);
  const [roleData,        setRoleData]        = useState(null);
  const [error,           setError]           = useState('');

  // ── Generate questions ──
  const handleStart = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/onboard/generate-questions`, {
        name:  user.displayName,
        email: user.email,
      });
      setQuestions(res.data.questions || []);
      setStage('questions');
    } catch (err) {
      console.error(err);
      setError('Failed to generate questions. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  // ── Answer change ──
  const handleAnswer = (value) => {
    setAnswers(prev => ({ ...prev, [currentQuestion]: value }));
  };

  // ── Next / submit ──
  const handleNext = async () => {
    const answer = (answers[currentQuestion] || '').trim();
    if (!answer) return;

    const isLast = currentQuestion === questions.length - 1;

    if (!isLast) {
      setCurrentQuestion(q => q + 1);
      return;
    }

    // Submit all answers
    setLoading(true);
    setError('');
    try {
      const answerArray = questions.map((_, i) => answers[i] || '');
      const res = await axios.post(`${API_BASE}/onboard/analyze-answers`, {
        userId:    user.uid,
        name:      user.displayName,
        questions,
        answers:   answerArray,
      });
      setRoleData(res.data.roleAnalysis);
      setStage('role');
    } catch (err) {
      console.error(err);
      setError('Failed to analyze answers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) setCurrentQuestion(q => q - 1);
  };

  const handleEnterWorld = () => {
    if (onComplete) onComplete(roleData);
    navigate('/world');
  };

  // ── Accent color per stage ──
  const accentColor = stage === 'role' ? '#a855f7' : stage === 'questions' ? '#1a73e8' : '#a855f7';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Arial, sans-serif',
      position: 'relative',
    }}>
      <Background accentColor={accentColor} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
            background: '#ff4d4d11', border: '1px solid #ff4d4d44',
            borderRadius: 12, padding: '10px 20px',
            color: '#ff6b6b', fontSize: 13, zIndex: 100,
          }}
        >
          {error}
        </motion.div>
      )}

      <div style={{ position: 'relative', zIndex: 1, width: '100%',
        display: 'flex', justifyContent: 'center' }}>
        <AnimatePresence mode="wait">
          {stage === 'intro' && (
            <IntroStage
              key="intro"
              onStart={handleStart}
              loading={loading}
              userName={user?.displayName}
            />
          )}
          {stage === 'questions' && questions.length > 0 && (
            <QuestionsStage
              key="questions"
              questions={questions}
              currentQ={currentQuestion}
              answers={answers}
              onAnswer={handleAnswer}
              onNext={handleNext}
              onPrev={handlePrev}
              loading={loading}
            />
          )}
          {stage === 'role' && roleData && (
            <RoleRevealStage
              key="role"
              roleData={roleData}
              onEnter={handleEnterWorld}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
export default Onboarding;



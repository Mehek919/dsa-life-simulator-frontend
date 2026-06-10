import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const DIFFICULTY_COLORS = {
  easy:   { badge: '#00ff88', glow: '0 0 12px #00ff8866', label: '⚡ Easy'   },
  medium: { badge: '#f5a623', glow: '0 0 12px #f5a62366', label: '🔥 Medium' },
  hard:   { badge: '#ff4d4d', glow: '0 0 12px #ff4d4d66', label: '💀 Hard'   },
};

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

export default function DailyChallenge({ user, userData, onClose, onRewardsEarned }) {
  const [challenges,     setChallenges]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [activeIdx,      setActiveIdx]      = useState(null);
  const [answer,         setAnswer]         = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [toast,          setToast]          = useState(null);
  const [dateKey,        setDateKey]        = useState('');
  const [completedCount, setCompletedCount] = useState(0);
  const [bonusAwarded,   setBonusAwarded]   = useState(false);

  // ✅ SINGLE fetchChallenges wrapped in useCallback
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = user?.uid;
      const topic  = userData?.topic || 'Array';

      if (!userId) {
        console.error('❌ NO USER ID:', user);
        setError('User not authenticated');
        return;
      }

      console.log('📡 User ID:', userId);  // ✅ ADD THIS
      console.log('📡 Topic:', topic);      // ✅ ADD THIS
      console.log('📡 API Base:', API_BASE); // ✅ ADD THIS

      const res = await axios.get(
        `${API_BASE}/daily-challenges/${userId}`,
        { params: { topic } }
      );

      console.log('📡 Fetching challenges for:', userId, topic);

      const res = await axios.get(
        `${API_BASE}/daily-challenges/${userId}`,
        { params: { topic } }
      );

      console.log('✅ Challenges received:', res.data);

      setChallenges(res.data.challenges || []);
      setDateKey(res.data.dateKey || '');
      setCompletedCount(
        (res.data.challenges || []).filter(c => c.completed).length
      );
    } catch (e) {
      console.error('❌ Fetch failed:', e.response?.data || e.message);
      setError('Failed to load today\'s challenges. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, userData?.topic]);

  // ✅ useEffect depends on fetchChallenges
  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // ✅ handleSubmit
  const handleSubmit = useCallback(async (challengeId) => {
    if (!answer.trim() || answer.trim().length < 10) {
      showToast('⚠️ Please write at least 10 characters.', 'warn');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/daily-challenges/${user?.uid}/submit/${challengeId}`,
        {
          userId:      user?.uid,
          challengeId,
          answer,
          topic:       userData?.topic || 'Array',
        }
      );

      const d = res.data;
      console.log('✅ Submit response:', d);

      setChallenges(prev =>
        prev.map(c =>
          c.id === challengeId
            ? { ...c, completed: true, submittedAnswer: answer }
            : c
        )
      );

      const newCount = completedCount + 1;
      setCompletedCount(newCount);
      if (d.bonusAwarded) setBonusAwarded(true);
      setActiveIdx(null);
      setAnswer('');

      if (onRewardsEarned) {
        onRewardsEarned({
          newCredits: d.newCredits,
          newXp:      d.newXp,
          newLevel:   d.newLevel,
        });
      }

      showToast(
        d.bonusAwarded
          ? `🔥 Bonus unlocked! +${d.creditsAwarded} Credits +${d.xpAwarded} XP`
          : `✅ +${d.creditsAwarded} Credits  +${d.xpAwarded} XP`,
        'success'
      );
    } catch (e) {
      console.error('❌ Submit failed:', e.response?.data || e.message);
      const msg = e.response?.data?.error || 'Submission failed.';
      showToast(`❌ ${msg}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }, [user?.uid, userData?.topic, answer, completedCount, onRewardsEarned]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const progressPct = challenges.length > 0
    ? (completedCount / challenges.length) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={styles.overlay}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1,    opacity: 1, y: 0  }}
        exit={{    scale: 0.85, opacity: 0, y: 40  }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        style={styles.panel}
      >
        {/* ── Header ── */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🏢 Daily Office Challenges</h2>
            <p style={styles.subtitle}>
              {dateKey} &nbsp;•&nbsp; Level {userData?.level || 1} —{' '}
              {LEVEL_NAMES[userData?.level] || 'Junior'} &nbsp;•&nbsp;
              Topic: <span style={{ color: '#1a73e8' }}>{userData?.topic || 'Array'}</span>
            </p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {/* ── Progress Bar ── */}
        <div style={styles.progressWrap}>
          <div style={{ ...styles.progressBar, width: `${progressPct}%` }} />
        </div>
        <p style={styles.progressLabel}>
          {completedCount}/{challenges.length || 3} Completed
          {completedCount === challenges.length && challenges.length > 0 && !bonusAwarded
            && ' 🔥 Claiming bonus...'}
          {bonusAwarded && ' 🏆 Bonus Claimed!'}
        </p>

        {/* ── Loading ── */}
        {loading && (
          <div style={styles.center}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={styles.spinner}
            />
            <p style={{ color: '#aaa', marginTop: 14 }}>
              🤖 AI is generating your challenges...
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={styles.center}>
            <p style={{ color: '#ff4d4d' }}>{error}</p>
            <button onClick={fetchChallenges} style={styles.retryBtn}>
              🔄 Retry
            </button>
          </div>
        )}

        {/* ── Challenge Cards ── */}
        {!loading && !error && (
          <div style={styles.cardList}>
            {challenges.map((ch, i) => {
              const dc     = DIFFICULTY_COLORS[ch.difficulty] || DIFFICULTY_COLORS.medium;
              const isOpen = activeIdx === i;
              const isDone = ch.completed;

              return (
                <motion.div
                  key={ch.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0  }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    ...styles.card,
                    boxShadow: isOpen
                      ? dc.glow
                      : isDone
                        ? '0 0 10px #00ff8844'
                        : '0 2px 12px #00000066',
                    border: `1px solid ${
                      isDone   ? '#00ff8866'
                      : isOpen ? dc.badge
                               : '#1e2a3a'
                    }`,
                    opacity: isDone && !isOpen ? 0.75 : 1,
                  }}
                >
                  {/* Card Header Row */}
                  <div
                    style={styles.cardHeader}
                    onClick={() => {
                      if (isDone) return;
                      setActiveIdx(isOpen ? null : i);
                      setAnswer('');
                    }}
                  >
                    <div style={styles.cardLeft}>
                      <span style={{ ...styles.slotLabel, color: dc.badge }}>
                        {dc.label}
                      </span>
                      <span style={styles.cardTitle}>{ch.title}</span>
                    </div>
                    <div style={styles.cardRight}>
                      <span style={{ color: '#f5c542', fontSize: 13 }}>
                        +{ch.creditsReward}💰 +{ch.xpReward}⭐
                      </span>
                      {isDone
                        ? <span style={{ color: '#00ff88', fontSize: 18 }}>✔</span>
                        : <span style={{ color: '#888', fontSize: 16 }}>
                            {isOpen ? '▲' : '▼'}
                          </span>
                      }
                    </div>
                  </div>

                  {/* Expanded body */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{    opacity: 0, height: 0      }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={styles.cardBody}>
                          <p style={styles.description}>{ch.description}</p>
                          <p style={styles.expectedFormat}>
                            📝 <strong>Format:</strong> {ch.expectedFormat}
                          </p>
                          <textarea
                            style={styles.textarea}
                            placeholder="Write your answer here..."
                            value={answer}
                            onChange={e => setAnswer(e.target.value)}
                            rows={5}
                          />
                          <button
                            style={styles.submitBtn}
                            onClick={() => handleSubmit(ch.id)}
                            disabled={submitting}
                          >
                            {submitting ? '⏳ Submitting...' : '🚀 Submit Answer'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Completed preview */}
                  {isDone && (
                    <div style={styles.completedPreview}>
                      ✅ Submitted: "{ch.submittedAnswer?.slice(0, 80)}..."
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ── Bonus Banner ── */}
        <AnimatePresence>
          {bonusAwarded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1   }}
              exit={{    opacity: 0, scale: 0.8  }}
              style={styles.bonusBanner}
            >
              🏆 All Done! Bonus <strong>+50 Credits</strong> &amp;{' '}
              <strong>+100 XP</strong> earned! 🔥
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toast ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: 30  }}
              style={{
                ...styles.toast,
                background:
                  toast.type === 'success' ? '#1a3a2a'
                  : toast.type === 'warn'  ? '#3a2a00'
                  : '#3a1a1a',
                borderColor:
                  toast.type === 'success' ? '#00ff88'
                  : toast.type === 'warn'  ? '#f5a623'
                  : '#ff4d4d',
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.82)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  panel: {
    background: '#0d1117',
    border: '1px solid #1a73e8',
    borderRadius: '18px',
    width: '100%',
    maxWidth: '680px',
    maxHeight: '88vh',
    overflowY: 'auto',
    padding: '28px',
    position: 'relative',
    boxShadow: '0 0 40px #1a73e844',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '18px',
  },
  title:    { color: '#fff', fontSize: '22px', fontWeight: 700, margin: 0 },
  subtitle: { color: '#888', fontSize: '13px', marginTop: '4px' },
  closeBtn: {
    background: 'none',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#aaa',
    cursor: 'pointer',
    padding: '6px 12px',
    fontSize: '16px',
  },
  progressWrap: {
    background: '#1a1a2e',
    borderRadius: '8px',
    height: '8px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg,#1a73e8,#00ff88)',
    transition: 'width 0.5s ease',
  },
  progressLabel: { color: '#888', fontSize: '12px', marginBottom: '20px' },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
  },
  spinner: {
    width: '40px', height: '40px',
    border: '4px solid #1a73e8',
    borderTop: '4px solid transparent',
    borderRadius: '50%',
  },
  retryBtn: {
    marginTop: '14px',
    background: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 22px',
    cursor: 'pointer',
  },
  cardList:  { display: 'flex', flexDirection: 'column', gap: '14px' },
  card: {
    background: '#111827',
    borderRadius: '12px',
    padding: '16px 18px',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft:   { display: 'flex', flexDirection: 'column', gap: '4px' },
  slotLabel:  { fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' },
  cardTitle:  { color: '#e8e8e8', fontSize: '15px', fontWeight: 600 },
  cardRight:  { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  cardBody:   { marginTop: '14px' },
  description:    { color: '#bbb', fontSize: '14px', lineHeight: '1.6', marginBottom: '10px' },
  expectedFormat: { color: '#888', fontSize: '13px', marginBottom: '14px' },
  textarea: {
    width: '100%',
    background: '#0d1117',
    border: '1px solid #1e2a3a',
    borderRadius: '8px',
    color: '#e8e8e8',
    fontSize: '14px',
    padding: '12px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  submitBtn: {
    marginTop: '12px',
    background: 'linear-gradient(135deg,#1a73e8,#0d47a1)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
    width: '100%',
  },
  completedPreview: { marginTop: '10px', color: '#00ff8888', fontSize: '12px', fontStyle: 'italic' },
  bonusBanner: {
    marginTop: '20px',
    background: 'linear-gradient(135deg,#1a3a2a,#0d2a1a)',
    border: '1px solid #00ff88',
    borderRadius: '12px',
    padding: '16px 20px',
    color: '#00ff88',
    textAlign: 'center',
    fontSize: '15px',
  },
  toast: {
    position: 'fixed',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    border: '1px solid',
    borderRadius: '10px',
    padding: '12px 24px',
    color: '#fff',
    fontSize: '14px',
    zIndex: 9999,
    whiteSpace: 'nowrap',
  },
};

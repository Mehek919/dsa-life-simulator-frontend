import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import CodeEditor from './CodeEditor';

// ── Constants ──────────────────────────────────────────────────────────────────
const CONTEST_DURATION = 90 * 60; // 90 minutes in seconds

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  const diff  = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Countdown Timer ────────────────────────────────────────────────────────────
function CountdownTimer({ endTime, onExpire }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => {
      const end  = endTime?._seconds ? endTime._seconds * 1000 : new Date(endTime).getTime();
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) onExpire?.();
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  const pct     = endTime ? (remaining / CONTEST_DURATION) * 100 : 0;
  const isLow   = remaining < 600; // last 10 minutes
  const color   = isLow ? '#ff4d4d' : remaining < 1800 ? '#f5c542' : '#00c896';

  return (
    <div style={{
      background:   '#0d1117',
      border:       `1px solid ${color}44`,
      borderRadius: 12,
      padding:      '12px 20px',
      textAlign:    'center',
      minWidth:     140,
      boxShadow:    isLow ? `0 0 20px ${color}33` : 'none',
    }}>
      <div style={{ color: '#555', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        Time Remaining
      </div>
      <motion.div
        animate={isLow ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ color, fontSize: 24, fontWeight: 900, fontFamily: 'monospace' }}
      >
        {formatTime(remaining)}
      </motion.div>
      <div style={{ width: '100%', height: 3, background: '#1e2a3a', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1s linear' }} />
      </div>
    </div>
  );
}

// ── Problem Tab ────────────────────────────────────────────────────────────────
function ProblemTab({ problem, idx, solved, score, onClick, isActive }) {
  const diffColor = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' }[problem.difficulty] || '#888';

  return (
    <button
      onClick={onClick}
      style={{
        background:   isActive ? '#1a73e811' : 'transparent',
        border:       `1px solid ${isActive ? '#1a73e844' : solved ? '#00c89644' : '#1e2a3a'}`,
        borderRadius: 8,
        padding:      '8px 14px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        transition:   'all 0.2s',
        color:        '#e8e8e8',
        fontSize:     13,
        fontWeight:   isActive ? 700 : 400,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%',
        background: solved ? '#00c89622' : diffColor + '22',
        border:     `1px solid ${solved ? '#00c89644' : diffColor + '44'}`,
        display:    'flex', alignItems: 'center', justifyContent: 'center',
        fontSize:   10, fontWeight: 700,
        color:      solved ? '#00c896' : diffColor,
        flexShrink: 0,
      }}>
        {solved ? '✓' : idx + 1}
      </span>
      <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {problem.title}
      </span>
      {solved && (
        <span style={{ color: '#00c896', fontSize: 10, fontWeight: 700, marginLeft: 'auto' }}>
          +{score}
        </span>
      )}
    </button>
  );
}

// ── Leaderboard Panel ──────────────────────────────────────────────────────────
function LeaderboardPanel({ contestId, userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contestId) return;
    axios.get(`${API_BASE}/contests/${contestId}/leaderboard`)
      .then(res => setEntries(res.data.leaderboard || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    const interval = setInterval(() => {
      axios.get(`${API_BASE}/contests/${contestId}/leaderboard`)
        .then(res => setEntries(res.data.leaderboard || []))
        .catch(() => {});
    }, 30000); // refresh every 30s

    return () => clearInterval(interval);
  }, [contestId]);

  return (
    <div style={{
      background:    '#0d1117',
      border:        '1px solid #1e2a3a',
      borderRadius:  14,
      overflow:      'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e2a3a' }}>
        <span style={{ color: '#e8e8e8', fontWeight: 700, fontSize: 13 }}>🏆 Live Rankings</span>
      </div>
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, color: '#333', fontSize: 13, textAlign: 'center' }}>Loading...</div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 20, color: '#333', fontSize: 13, textAlign: 'center' }}>No submissions yet</div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={entry.userId}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '10px 16px',
                borderBottom: '1px solid #0f1923',
                background:   entry.userId === userId ? '#1a73e811' : 'transparent',
              }}
            >
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                background: i === 0 ? '#f5c54222' : i === 1 ? '#88888822' : i === 2 ? '#cd7f3222' : '#1e2a3a',
                border:     `1px solid ${i === 0 ? '#f5c54244' : i === 1 ? '#88888844' : i === 2 ? '#cd7f3244' : '#1e2a3a'}`,
                color:      i === 0 ? '#f5c542' : i === 1 ? '#888' : i === 2 ? '#cd7f32' : '#555',
                display:    'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:   11, fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color:    entry.userId === userId ? '#1a73e8' : '#e8e8e8',
                  fontSize: 12, fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {entry.displayName || 'Anonymous'}
                  {entry.userId === userId && ' (you)'}
                </div>
                <div style={{ color: '#555', fontSize: 10 }}>
                  {entry.solved}/{entry.totalProblems} solved
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#a855f7', fontSize: 13, fontWeight: 700 }}>{entry.score}</div>
                <div style={{ color: '#444', fontSize: 10 }}>{entry.penalty ? `-${entry.penalty}m` : ''}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Contest Lobby ──────────────────────────────────────────────────────────────
function ContestLobby({ contest, user, onJoin, joining }) {
  const timeUntilStart = contest?.startTime
    ? Math.max(0, Math.floor((new Date(contest.startTime._seconds * 1000).getTime() - Date.now()) / 1000))
    : 0;

  const diffCounts = (contest?.problems || []).reduce((acc, p) => {
    acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background:   '#0d1117',
          border:       '1px solid #a855f744',
          borderRadius: 20,
          padding:      '32px',
          boxShadow:    '0 0 40px #a855f711',
          position:     'relative',
          overflow:     'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #a855f7, #1a73e8, transparent)',
        }} />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#e8e8e8' }}>
            {contest?.title || 'Weekly Contest'}
          </h1>
          <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>
            {contest?.description || 'Solve problems, earn rating, climb the leaderboard.'}
          </p>
        </div>

        {/* Contest details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { icon: '⏱', label: 'Duration', value: '90 minutes' },
            { icon: '📝', label: 'Problems', value: `${contest?.problems?.length || 4}` },
            { icon: '👥', label: 'Registered', value: `${contest?.participants || 0}` },
          ].map(d => (
            <div key={d.label} style={{
              background: '#060910', border: '1px solid #1e2a3a',
              borderRadius: 10, padding: '12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{d.icon}</div>
              <div style={{ color: '#e8e8e8', fontSize: 16, fontWeight: 700 }}>{d.value}</div>
              <div style={{ color: '#555', fontSize: 10 }}>{d.label}</div>
            </div>
          ))}
        </div>

        {/* Problem difficulty breakdown */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#555', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Problem Breakdown
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(diffCounts).map(([diff, count]) => {
              const color = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' }[diff] || '#888';
              return (
                <div key={diff} style={{
                  background: color + '11', border: `1px solid ${color}33`,
                  borderRadius: 20, padding: '4px 14px',
                  color, fontSize: 12, fontWeight: 600,
                }}>
                  {count}× {diff}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scoring info */}
        <div style={{
          background: '#a855f711', border: '1px solid #a855f733',
          borderRadius: 10, padding: '12px 16px', marginBottom: 24,
          fontSize: 12, color: '#c8a8f7', lineHeight: 1.6,
        }}>
          <strong>Scoring:</strong> Easy = 100pts · Medium = 200pts · Hard = 300pts<br/>
          <strong>Penalty:</strong> -5 points per wrong submission<br/>
          <strong>Rating:</strong> Changes based on rank vs other participants
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onJoin}
          disabled={joining}
          style={{
            width:        '100%',
            background:   joining ? '#1e2a3a' : 'linear-gradient(135deg, #a855f7, #1a73e8)',
            border:       'none',
            borderRadius: 12,
            color:        '#fff',
            cursor:       joining ? 'not-allowed' : 'pointer',
            fontSize:     15, fontWeight: 800,
            padding:      '14px 0',
            boxShadow:    joining ? 'none' : '0 0 30px #a855f744',
          }}
        >
          {joining ? '⏳ Joining...' : '🚀 Join Contest'}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── Main WeeklyContest Component ───────────────────────────────────────────────
export default function WeeklyContest({ user, userData, setUserData }) {
  const navigate    = useNavigate();
  const { contestId } = useParams();

  const [contests,     setContests]     = useState([]);
  const [contest,      setContest]      = useState(null);
  const [phase,        setPhase]        = useState('lobby'); // lobby | active | ended
  const [activeIdx,    setActiveIdx]    = useState(0);
  const [solved,       setSolved]       = useState({});
  const [scores,       setScores]       = useState({});
  const [penalties,    setPenalties]    = useState({});
  const [loading,      setLoading]      = useState(true);
  const [joining,      setJoining]      = useState(false);
  const [showLB,       setShowLB]       = useState(true);
  const [toast,        setToast]        = useState(null);
  const [ratingChange, setRatingChange] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch contests list ──────────────────────────────────────────────────────
  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/contests`);
      setContests(res.data.contests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch specific contest ───────────────────────────────────────────────────
  const fetchContest = useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/contests/${id}`);
      const c   = res.data.contest;
      setContest(c);

      // Determine phase
      const now   = Date.now();
      const start = c.startTime?._seconds * 1000 || 0;
      const end   = c.endTime?._seconds   * 1000 || 0;

      if (now < start) setPhase('lobby');
      else if (now < end) setPhase('active');
      else setPhase('ended');

      // Load existing solved state for this user
      if (user?.uid && c.submissions?.[user.uid]) {
        const userSubs = c.submissions[user.uid];
        const solvedMap = {};
        const scoreMap  = {};
        userSubs.forEach(s => {
          if (s.allPassed) {
            solvedMap[s.problemId] = true;
            scoreMap[s.problemId]  = s.score || 0;
          }
        });
        setSolved(solvedMap);
        setScores(scoreMap);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (contestId) fetchContest(contestId);
    else fetchContests();
  }, [contestId, fetchContest, fetchContests]);

  // ── Join contest ─────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!user?.uid || !contest) return;
    setJoining(true);
    try {
      await axios.post(`${API_BASE}/contests/${contest.id}/join`, { userId: user.uid });
      setPhase('active');
      showToast('🚀 Contest started! Good luck!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to join contest.', 'error');
    } finally {
      setJoining(false);
    }
  };

  // ── Submit problem ───────────────────────────────────────────────────────────
  const handleSubmit = async (code, langId, testResults) => {
    const problem   = contest?.problems?.[activeIdx];
    if (!problem || !user?.uid) return { passed: false };

    const passed    = testResults.filter(r => r.passed).length;
    const total     = testResults.length;
    const allPassed = passed === total && total > 0;

    // Calculate score
    const baseScore  = { Easy: 100, Medium: 200, Hard: 300 }[problem.difficulty] || 100;
    const penaltyKey = problem.id;
    const currentPenalty = penalties[penaltyKey] || 0;
    const finalScore = allPassed ? Math.max(0, baseScore - currentPenalty) : 0;

    try {
      const res = await axios.post(`${API_BASE}/contests/${contest.id}/submit`, {
        userId:     user.uid,
        problemId:  problem.id,
        code,
        language:   langId,
        passed,
        total,
        allPassed,
        score:      finalScore,
        testResults,
      });

      if (allPassed) {
        setSolved(prev => ({ ...prev, [problem.id]: true }));
        setScores(prev => ({ ...prev, [problem.id]: finalScore }));
        showToast(`✅ Accepted! +${finalScore} points`);

        if (res.data.ratingChange) {
          setRatingChange(res.data.ratingChange);
        }

        if (res.data.newXp && typeof setUserData === 'function') {
          setUserData(prev => ({
            ...prev,
            xp:      res.data.newXp,
            credits: res.data.newCredits,
            level:   res.data.newLevel,
          }));
        }
      } else {
        // Add penalty
        setPenalties(prev => ({ ...prev, [penaltyKey]: (prev[penaltyKey] || 0) + 5 }));
        showToast(`❌ Wrong — ${passed}/${total} tests. -5 penalty points`, 'error');
      }

      return {
        passed:      allPassed,
        passedCount: passed,
        total,
        xp:          res.data.xpAwarded || 0,
        credits:     res.data.creditsAwarded || 0,
      };
    } catch (err) {
      showToast('Submission failed. Try again.', 'error');
      return { passed: false, passedCount: passed, total };
    }
  };

  const handleContestEnd = () => {
    setPhase('ended');
    showToast('⏰ Contest ended! Final rankings being calculated...', 'info');
  };

  const problems = contest?.problems || [];
  const activeProblem = problems[activeIdx];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  // ── Contest list view ────────────────────────────────────────────────────────
  if (!contestId) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a14',
        color: '#e8e8e8', fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 24px 60px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent', border: '1px solid #1e2a3a',
              borderRadius: 8, color: '#555', cursor: 'pointer',
              fontSize: 12, padding: '6px 14px', marginBottom: 20,
            }}
          >
            ← Back
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900 }}>🏆 Weekly Contests</h1>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
                Compete live every week. Earn rating. Climb the global leaderboard.
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ color: '#333', textAlign: 'center', padding: 60 }}>Loading contests...</div>
          ) : contests.length === 0 ? (
            <div style={{
              background: '#0d1117', border: '1px solid #1e2a3a',
              borderRadius: 16, padding: '48px 32px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <h2 style={{ color: '#e8e8e8', margin: '0 0 8px' }}>No contests yet</h2>
              <p style={{ color: '#555', fontSize: 14, margin: 0 }}>
                The first Weekly Contest launches Sunday at 8 PM IST.<br/>
                Check back soon!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contests.map((c, i) => {
                const now   = Date.now();
                const start = c.startTime?._seconds * 1000 || 0;
                const end   = c.endTime?._seconds   * 1000 || 0;
                const isLive   = now >= start && now < end;
                const isEnded  = now >= end;
                const isUpcoming = now < start;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/contest/${c.id}`)}
                    style={{
                      background:   '#0d1117',
                      border:       `1px solid ${isLive ? '#00c89644' : '#1e2a3a'}`,
                      borderRadius: 14,
                      padding:      '20px 24px',
                      cursor:       'pointer',
                      transition:   'all 0.2s',
                      boxShadow:    isLive ? '0 0 20px #00c89622' : 'none',
                      position:     'relative',
                      overflow:     'hidden',
                    }}
                    whileHover={{ borderColor: '#1a73e844', x: 4 }}
                  >
                    {isLive && (
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                        background: 'linear-gradient(90deg, transparent, #00c896, transparent)',
                      }} />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <h3 style={{ margin: 0, color: '#e8e8e8', fontSize: 16, fontWeight: 700 }}>
                            {c.title}
                          </h3>
                          <span style={{
                            background:   isLive ? '#00c89622' : isEnded ? '#1e2a3a' : '#a855f722',
                            border:       `1px solid ${isLive ? '#00c89644' : isEnded ? '#1e2a3a' : '#a855f744'}`,
                            borderRadius: 20, padding: '2px 10px',
                            color:        isLive ? '#00c896' : isEnded ? '#555' : '#a855f7',
                            fontSize:     10, fontWeight: 700,
                          }}>
                            {isLive ? '🔴 LIVE' : isEnded ? 'Ended' : '⏰ Upcoming'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, color: '#555', fontSize: 12 }}>
                          <span>📝 {c.problems?.length || 4} problems</span>
                          <span>👥 {c.participants || 0} participants</span>
                          <span>⏱ 90 minutes</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#1a73e8', fontSize: 14, fontWeight: 700 }}>
                          {isLive ? 'Join Now →' : isEnded ? 'View Results →' : 'Register →'}
                        </div>
                        <div style={{ color: '#444', fontSize: 11, marginTop: 2 }}>
                          {isLive ? 'Contest is live!' : isEnded ? timeAgo(c.endTime) : 'Starts soon'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                background: '#0d1117', border: '1px solid #1a73e844',
                borderRadius: 30, padding: '10px 24px',
                color: '#e8e8e8', fontSize: 13, fontWeight: 600,
                boxShadow: '0 4px 20px #00000066', zIndex: 999, whiteSpace: 'nowrap',
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
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
          style={{ width: 36, height: 36, border: '3px solid #1e2a3a', borderTop: '3px solid #a855f7', borderRadius: '50%' }}
        />
        <div style={{ color: '#555', fontSize: 13 }}>Loading contest...</div>
      </div>
    );
  }

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1e2a3a' }}>
          <button
            onClick={() => navigate('/contest')}
            style={{
              background: 'transparent', border: '1px solid #1e2a3a',
              borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12, padding: '6px 14px',
            }}
          >
            ← All Contests
          </button>
        </div>
        <ContestLobby contest={contest} user={user} onJoin={handleJoin} joining={joining} />
      </div>
    );
  }

  // ── Active contest ───────────────────────────────────────────────────────────
  if (phase === 'active' && contest) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        background: '#0a0a14', fontFamily: 'Arial, sans-serif', overflow: 'hidden',
      }}>
        {/* Contest header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 16px',
          borderBottom:   '1px solid #1e2a3a',
          background:     '#0d1117',
          flexShrink:     0,
          flexWrap:       'wrap',
          gap:            8,
        }}>
          {/* Problem tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {problems.map((p, i) => (
              <ProblemTab
                key={p.id}
                problem={p}
                idx={i}
                solved={solved[p.id]}
                score={scores[p.id]}
                isActive={i === activeIdx}
                onClick={() => setActiveIdx(i)}
              />
            ))}
          </div>

          {/* Score + Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#a855f711', border: '1px solid #a855f733',
              borderRadius: 10, padding: '8px 16px', textAlign: 'center',
            }}>
              <div style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
              <div style={{ color: '#a855f7', fontSize: 18, fontWeight: 900 }}>{totalScore}</div>
            </div>

            <CountdownTimer endTime={contest.endTime} onExpire={handleContestEnd} />

            <button
              onClick={() => setShowLB(b => !b)}
              style={{
                background: '#1e2a3a', border: '1px solid #1e2a3a',
                borderRadius: 8, color: '#888', cursor: 'pointer',
                fontSize: 12, padding: '6px 12px',
              }}
            >
              {showLB ? 'Hide LB' : '🏆 Rankings'}
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Code editor */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeProblem && (
              <CodeEditor
                problem={activeProblem}
                user={user}
                onSubmit={handleSubmit}
                defaultLanguage="python3"
              />
            )}
          </div>

          {/* Leaderboard sidebar */}
          <AnimatePresence>
            {showLB && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                style={{ flexShrink: 0, overflow: 'hidden', borderLeft: '1px solid #1e2a3a' }}
              >
                <div style={{ width: 280, padding: 12, height: '100%', overflowY: 'auto' }}>
                  <LeaderboardPanel contestId={contest.id} userId={user?.uid} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              style={{
                position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
                background: toast.type === 'error' ? '#ff4d4d22' : '#00c89622',
                border: `1px solid ${toast.type === 'error' ? '#ff4d4d44' : '#00c89644'}`,
                borderRadius: 30, padding: '10px 24px',
                color: toast.type === 'error' ? '#ff6b6b' : '#00c896',
                fontSize: 13, fontWeight: 600,
                boxShadow: '0 4px 20px #00000066', zIndex: 999, whiteSpace: 'nowrap',
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Contest ended ────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a14',
      color: '#e8e8e8', fontFamily: 'Arial, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: '#0d1117', border: '1px solid #a855f744',
          borderRadius: 20, padding: '40px', textAlign: 'center', maxWidth: 400,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏁</div>
        <h2 style={{ margin: '0 0 8px', color: '#e8e8e8', fontSize: 24, fontWeight: 900 }}>
          Contest Ended
        </h2>
        <p style={{ color: '#666', margin: '0 0 20px', fontSize: 14 }}>
          Your final score: <strong style={{ color: '#a855f7' }}>{totalScore}</strong>
        </p>
        <p style={{ color: '#666', margin: '0 0 28px', fontSize: 14 }}>
          Problems solved: <strong style={{ color: '#00c896' }}>
            {Object.keys(solved).length}/{problems.length}
          </strong>
        </p>

        {ratingChange && (
          <div style={{
            background: ratingChange > 0 ? '#00c89622' : '#ff4d4d22',
            border: `1px solid ${ratingChange > 0 ? '#00c89644' : '#ff4d4d44'}`,
            borderRadius: 12, padding: '12px', marginBottom: 20,
          }}>
            <div style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>Rating Change</div>
            <div style={{
              color: ratingChange > 0 ? '#00c896' : '#ff4d4d',
              fontSize: 24, fontWeight: 900,
            }}>
              {ratingChange > 0 ? '+' : ''}{ratingChange}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/contest')}
            style={{
              flex: 1, background: '#1e2a3a', border: '1px solid #1e2a3a',
              borderRadius: 10, color: '#888', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, padding: '10px 0',
            }}
          >
            All Contests
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #a855f7, #1a73e8)',
              border: 'none', borderRadius: 10, color: '#fff',
              cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: '10px 0',
            }}
          >
            View Rankings →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
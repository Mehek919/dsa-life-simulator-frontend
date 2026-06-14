import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', padding: 40, background: '#0f0f1a', minHeight: '100vh' }}>
          <h2>⚠️ Something went wrong</h2>
          <pre style={{ color: '#ff6b6b', fontSize: 12 }}>
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const TOPICS = ['Array', 'LinkedList', 'Stack', 'Queue', 'Tree', 'Graph', 'DynamicProgramming'];
const PHASE = {
  LOBBY:   'LOBBY',
  WAITING: 'WAITING',
  BATTLE:  'BATTLE',
  RESULT:  'RESULT',
};

export default function Arena({ user, userData, setUserData }) {
  const navigate  = useNavigate();
  const socketRef = useRef(null);

  const [phase,       setPhase]       = useState(PHASE.LOBBY);
  const [topic,       setTopic]       = useState('Array');
  const [opponent,    setOpponent]    = useState(null);
  const [challenge,   setChallenge]   = useState(null);
  const [battleId,    setBattleId]    = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [submitted,   setSubmitted]   = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(90);
  const [startTime,   setStartTime]   = useState(null);
  const [result,      setResult]      = useState(null);
  const [opponentMsg, setOpponentMsg] = useState('');
  const timerRef = useRef(null);

  // ── Fetch arena leaderboard on mount ──────────────────────────────────────
  useEffect(() => {
    axios.get(`${API_BASE}/leaderboard/arena`)
      .then(res => {
        console.log('Arena leaderboard:', res.data);
      })
      .catch(err => {
        console.error('Leaderboard fetch failed:', err);
      });
  }, []);

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback((timeout = false) => {
    if (submitted) return;
    setSubmitted(true);
    clearInterval(timerRef.current);

    const timeTaken = startTime ? Date.now() - startTime : 90000;

    socketRef.current.emit('arena:submit_answer', {
      battleId,
      userId:   user.uid,
      answer:   timeout ? null : selected,
      timeTaken,
    });
  }, [submitted, startTime, battleId, user?.uid, selected]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('arena:waiting', ({ message }) => {
      console.log(message);
    });

    socket.on('arena:battle_start', ({ battleId, challenge, opponent, startTime }) => {
      setBattleId(battleId);
      setChallenge(challenge);
      setOpponent(opponent);
      setStartTime(startTime);
      setTimeLeft(90);
      setPhase(PHASE.BATTLE);
      console.log('⚔️ Battle started!', battleId);
    });

    socket.on('arena:opponent_answered', ({ message }) => {
      setOpponentMsg(message);
      setTimeout(() => setOpponentMsg(''), 4000);
    });

    socket.on('arena:battle_result', (resultData) => {
      clearInterval(timerRef.current);
      setResult(resultData);
      setPhase(PHASE.RESULT);

      if (setUserData) {
        const myData = resultData.player1.userId === user.uid
          ? resultData.player1
          : resultData.player2;

        setUserData(prev => ({
          ...prev,
          elo:     myData.newElo,
          credits: (prev?.credits || 0) + myData.credits,
        }));
      }
    });

    socket.on('arena:error', ({ message }) => {
      alert('❌ ' + message);
      setPhase(PHASE.LOBBY);
    });

    return () => {
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, setUserData]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== PHASE.BATTLE) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, handleSubmit]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function joinQueue() {
    setPhase(PHASE.WAITING);
    socketRef.current.emit('arena:join_queue', {
      userId:      user.uid,
      displayName: user.displayName,
      photoURL:    user.photoURL,
      elo:         userData?.elo || 1000,
      topic,
    });
  }

  function cancelQueue() {
    socketRef.current.emit('arena:leave_queue');
    setPhase(PHASE.LOBBY);
  }

  function backToLobby() {
    setPhase(PHASE.LOBBY);
    setOpponent(null);
    setChallenge(null);
    setBattleId(null);
    setSelected(null);
    setSubmitted(false);
    setTimeLeft(90);
    setResult(null);
    setOpponentMsg('');
  }

  const timerColor =
    timeLeft > 30 ? '#00ff88' :
    timeLeft > 10 ? '#ffaa00' : '#ff4444';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    }}>
      <AnimatePresence mode="wait">

        {/* ══ LOBBY ══════════════════════════════════════ */}
        {phase === PHASE.LOBBY && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{ maxWidth: 600, margin: '0 auto', paddingTop: 60 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 64 }}>⚔️</div>
              <h1 style={{
                fontSize: 36, fontWeight: 900,
                background: 'linear-gradient(90deg, #ff6b6b, #ffd93d)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 8,
              }}>
                Arena
              </h1>
              <p style={{ color: '#888', fontSize: 16 }}>1v1 Real-Time DSA Battles</p>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 24 }}>
                <Stat label="Your ELO"       value={userData?.elo           || 1000} color="#ffd93d" />
                <Stat label="Battles Won"    value={userData?.battlesWon    || 0}    color="#00ff88" />
                <Stat label="Battles Played" value={userData?.battlesPlayed || 0}    color="#1a73e8" />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <p style={{ color: '#aaa', marginBottom: 10, fontSize: 14 }}>🎯 Choose Battle Topic</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TOPICS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 20,
                      border:     `2px solid ${topic === t ? '#ff6b6b' : '#333'}`,
                      background:  topic === t ? 'rgba(255,107,107,0.15)' : 'transparent',
                      color:       topic === t ? '#ff6b6b' : '#888',
                      cursor:      'pointer',
                      fontSize:    13,
                      fontWeight:  topic === t ? 700 : 400,
                      transition:  'all 0.2s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={joinQueue}
              style={{
                width: '100%', padding: '18px',
                background: 'linear-gradient(135deg, #ff6b6b, #ee0979)',
                border: 'none', borderRadius: 14,
                color: '#fff', fontSize: 18, fontWeight: 800,
                cursor: 'pointer', letterSpacing: 1,
                boxShadow: '0 0 30px rgba(255,107,107,0.4)',
              }}
            >
              ⚔️ Find Match
            </motion.button>

            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: 16, width: '100%', padding: '12px',
                background: 'transparent', border: '1px solid #333',
                borderRadius: 10, color: '#666', cursor: 'pointer', fontSize: 14,
              }}
            >
              ← Back to World
            </button>
          </motion.div>
        )}

        {/* ══ WAITING ════════════════════════════════════ */}
        {phase === PHASE.WAITING && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ maxWidth: 400, margin: '0 auto', paddingTop: 120, textAlign: 'center' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: 64, marginBottom: 24 }}
            >
              ⚔️
            </motion.div>

            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Finding Opponent...</h2>
            <p style={{ color: '#888', marginBottom: 8 }}>
              Topic: <strong style={{ color: '#ff6b6b' }}>{topic}</strong>
            </p>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>
              Matching you with someone near your ELO ({userData?.elo || 1000})
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                  style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff6b6b' }}
                />
              ))}
            </div>

            <button
              onClick={cancelQueue}
              style={{
                padding: '12px 32px', background: 'transparent',
                border: '1px solid #444', borderRadius: 10,
                color: '#888', cursor: 'pointer', fontSize: 14,
              }}
            >
              Cancel Match
            </button>
          </motion.div>
        )}

        {/* ══ BATTLE ═════════════════════════════════════ */}
        {phase === PHASE.BATTLE && challenge && (
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ maxWidth: 700, margin: '0 auto' }}
          >
            {/* Top bar */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12,
            }}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <PlayerCard
                  name={user.displayName?.split(' ')[0]}
                  photoURL={user.photoURL}
                  elo={userData?.elo || 1000}
                  label="YOU"
                  color="#00ff88"
                />

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>TIME LEFT</div>
                  <div style={{
                    fontSize: 42, fontWeight: 900,
                    color: timerColor,
                    textShadow: `0 0 20px ${timerColor}`,
                    transition: 'color 0.5s',
                    fontFamily: 'monospace',
                  }}>
                    {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                    {String(timeLeft % 60).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>VS</div>
                </div>

                {opponent && (
                  <PlayerCard
                    name={opponent.displayName?.split(' ')[0]}
                    photoURL={opponent.photoURL}
                    elo={opponent.elo || 1000}
                    label="OPPONENT"
                    color="#ff6b6b"
                    flip
                  />
                )}
              </div>
            </div>

            {/* Opponent toast */}
            <AnimatePresence>
              {opponentMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    background: 'rgba(255,170,0,0.15)',
                    border: '1px solid rgba(255,170,0,0.4)',
                    borderRadius: 10, padding: '10px 16px',
                    textAlign: 'center', color: '#ffaa00',
                    fontSize: 14, marginBottom: 16,
                  }}
                >
                  {opponentMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Challenge card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: 16, padding: 24,
              boxShadow: '0 0 30px rgba(255,107,107,0.1)',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                  background: 'rgba(255,107,107,0.2)', color: '#ff6b6b',
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                }}>
                  {challenge.topic} · {challenge.difficulty}
                </span>
              </div>
              <h3 style={{ fontSize: 18, marginBottom: 8, lineHeight: 1.5 }}>
                {challenge.title}
              </h3>
              <p style={{ color: '#aaa', lineHeight: 1.8, fontSize: 15 }}>
                {challenge.question}
              </p>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challenge.options.map((opt, i) => {
                  const isSelected = selected === opt;
                  return (
                    <motion.button
                      key={i}
                      whileHover={!submitted ? { scale: 1.01 } : {}}
                      whileTap={!submitted  ? { scale: 0.99 } : {}}
                      onClick={() => !submitted && setSelected(opt)}
                      style={{
                        padding: '14px 20px',
                        background:   isSelected ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.04)',
                        border:       `2px solid ${isSelected ? '#ff6b6b' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 12,
                        color:        isSelected ? '#ff6b6b' : '#ccc',
                        cursor:       submitted ? 'default' : 'pointer',
                        fontSize:     15,
                        textAlign:    'left',
                        boxShadow:    isSelected ? '0 0 15px rgba(255,107,107,0.2)' : 'none',
                        transition:   'all 0.2s',
                      }}
                    >
                      <span style={{ fontWeight: 700, marginRight: 10, color: '#555' }}>
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            {!submitted ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSubmit(false)}
                disabled={!selected}
                style={{
                  width: '100%', padding: '16px',
                  background: selected
                    ? 'linear-gradient(135deg, #ff6b6b, #ee0979)'
                    : 'rgba(255,255,255,0.05)',
                  border: 'none', borderRadius: 12,
                  color:      selected ? '#fff' : '#444',
                  fontSize:   16, fontWeight: 700,
                  cursor:     selected ? 'pointer' : 'not-allowed',
                  boxShadow:  selected ? '0 0 20px rgba(255,107,107,0.4)' : 'none',
                  transition: 'all 0.3s',
                }}
              >
                ⚡ Submit Answer
              </motion.button>
            ) : (
              <div style={{
                width: '100%', padding: '16px',
                background: 'rgba(255,170,0,0.1)',
                border: '1px solid rgba(255,170,0,0.3)',
                borderRadius: 12, textAlign: 'center',
                color: '#ffaa00', fontSize: 16,
              }}>
                ⏳ Waiting for opponent...
              </div>
            )}
          </motion.div>
        )}

        {/* ══ RESULT ═════════════════════════════════════ */}
        {phase === PHASE.RESULT && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ maxWidth: 600, margin: '0 auto', paddingTop: 40, textAlign: 'center' }}
          >
            {(() => {
              const myData   = result.player1.userId === user.uid ? result.player1 : result.player2;
              const isWinner = result.winnerId === user.uid;
              const isDraw   = result.resultType === 'both_wrong';

              return (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    style={{ fontSize: 80, marginBottom: 12 }}
                  >
                    {isDraw ? '🤝' : isWinner ? '🏆' : '💀'}
                  </motion.div>

                  <h1 style={{
                    fontSize: 40, fontWeight: 900, marginBottom: 8,
                    color:      isDraw ? '#ffaa00' : isWinner ? '#00ff88' : '#ff4444',
                    textShadow: `0 0 30px ${isDraw ? '#ffaa00' : isWinner ? '#00ff88' : '#ff4444'}`,
                  }}>
                    {isDraw ? 'DRAW' : isWinner ? 'VICTORY!' : 'DEFEATED'}
                  </h1>

                  <p style={{ color: '#888', marginBottom: 28, fontSize: 16 }}>
                    {result.resultType === 'forfeit'
                      ? '🏃 Opponent disconnected'
                      : isDraw
                      ? 'Both answered incorrectly'
                      : isWinner
                      ? 'You solved it correctly!'
                      : 'Better luck next time!'}
                  </p>

                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12, marginBottom: 24,
                  }}>
                    <StatBox
                      label="Credits Earned"
                      value={`+${myData.credits}💰`}
                      color="#ffd93d"
                    />
                    <StatBox
                      label="ELO Change"
                      value={`${myData.newElo - myData.oldElo >= 0 ? '+' : ''}${myData.newElo - myData.oldElo}`}
                      color={myData.newElo >= myData.oldElo ? '#00ff88' : '#ff4444'}
                    />
                    <StatBox
                      label="Time Taken"
                      value={myData.timeTaken ? `${(myData.timeTaken / 1000).toFixed(1)}s` : 'N/A'}
                      color="#1a73e8"
                    />
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={backToLobby}
                    style={{
                      padding: '14px 40px',
                      background: 'linear-gradient(135deg, #ff6b6b, #ee0979)',
                      border: 'none', borderRadius: 12,
                      color: '#fff', fontSize: 16, fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 0 20px rgba(255,107,107,0.4)',
                    }}
                  >
                    Play Again
                  </motion.button>
                </>
              );
            })()}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '14px 10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#666' }}>{label}</div>
    </div>
  );
}

function PlayerCard({ name, photoURL, elo, label, color, flip = false }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: flip ? 'row-reverse' : 'row',
      alignItems: 'center', gap: 10,
    }}>
      <img
        src={photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
        alt={name}
        style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${color}` }}
      />
      <div style={{ textAlign: flip ? 'right' : 'left' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 12, color: '#666' }}>ELO {elo}</div>
      </div>
    </div>
  );
}
const App = () => (
  <ErrorBoundary>
  </ErrorBoundary>
);



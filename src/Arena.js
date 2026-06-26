import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
import { tracedFetch } from './usePerformance';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const TOPICS = [
  { id: 'Array', label: 'Array', icon: '▦', level: 'Beginner' },
  { id: 'String', label: 'String', icon: 'Aa', level: 'Beginner' },
  { id: 'HashTable', label: 'Hash Table', icon: '#', level: 'Core' },
  { id: 'LinkedList', label: 'Linked List', icon: '⛓️', level: 'Core' },
  { id: 'Stack', label: 'Stack', icon: '▤', level: 'Core' },
  { id: 'Queue', label: 'Queue', icon: '⇄', level: 'Core' },
  { id: 'Deque', label: 'Deque', icon: '↔', level: 'Core' },
  { id: 'Tree', label: 'Tree', icon: '🌳', level: 'Core' },
  { id: 'BinaryTree', label: 'Binary Tree', icon: '🌲', level: 'Core' },
  { id: 'BST', label: 'BST', icon: '🔎', level: 'Core' },
  { id: 'Heap', label: 'Heap / PQ', icon: '⛰️', level: 'Core' },
  { id: 'Graph', label: 'Graph', icon: '🕸️', level: 'Advanced' },
  { id: 'BFS', label: 'BFS', icon: '🌊', level: 'Advanced' },
  { id: 'DFS', label: 'DFS', icon: '🕳️', level: 'Advanced' },
  { id: 'Backtracking', label: 'Backtracking', icon: '♟️', level: 'Advanced' },
  { id: 'DynamicProgramming', label: 'Dynamic Programming', icon: '🧠', level: 'Advanced' },
  { id: 'Greedy', label: 'Greedy', icon: '💰', level: 'Advanced' },
  { id: 'BinarySearch', label: 'Binary Search', icon: '🎯', level: 'Core' },
  { id: 'SlidingWindow', label: 'Sliding Window', icon: '🪟', level: 'Core' },
  { id: 'TwoPointers', label: 'Two Pointers', icon: '⇆', level: 'Core' },
  { id: 'PrefixSum', label: 'Prefix Sum', icon: '∑', level: 'Core' },
  { id: 'Matrix', label: 'Matrix', icon: '▦', level: 'Core' },
  { id: 'Recursion', label: 'Recursion', icon: '🔁', level: 'Core' },
  { id: 'BitManipulation', label: 'Bit Manipulation', icon: '⚙️', level: 'Advanced' },
  { id: 'Trie', label: 'Trie', icon: '🔤', level: 'Advanced' },
  { id: 'UnionFind', label: 'Union Find', icon: '🔗', level: 'Advanced' },
  { id: 'TopologicalSort', label: 'Topological Sort', icon: '📈', level: 'Advanced' },
  { id: 'ShortestPath', label: 'Shortest Path', icon: '🛣️', level: 'Advanced' },
  { id: 'SegmentTree', label: 'Segment Tree', icon: '🏗️', level: 'Expert' },
  { id: 'Math', label: 'Math', icon: 'π', level: 'Core' },
];

const PHASE = {
  LOBBY: 'LOBBY',
  WAITING: 'WAITING',
  BATTLE: 'BATTLE',
  RESULT: 'RESULT',
};

const levelColor = {
  Beginner: '#22c55e',
  Core: '#38bdf8',
  Advanced: '#f59e0b',
  Expert: '#ef4444',
};

export default function Arena({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [phase, setPhase] = useState(PHASE.LOBBY);
  const [topic, setTopic] = useState('Array');
  const [opponent, setOpponent] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [battleId, setBattleId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [startTime, setStartTime] = useState(null);
  const [result, setResult] = useState(null);
  const [opponentMsg, setOpponentMsg] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');

  const timerRef = useRef(null);

  const selectedTopic = TOPICS.find(t => t.id === topic) || TOPICS[0];

  const handleSubmit = useCallback((timeout = false) => {
    if (submitted) return;

    setSubmitted(true);
    clearInterval(timerRef.current);

    const timeTaken = startTime ? Date.now() - startTime : 90000;

    socketRef.current.emit('arena:submit_answer', {
      battleId,
      userId: user.uid,
      answer: timeout ? null : selected,
      timeTaken,
    });
  }, [submitted, startTime, battleId, user?.uid, selected]);

  useEffect(() => {
    tracedFetch('fetch_leaderboard', () =>
      axios.get(`${API_BASE}/leaderboard/arena`)
    ).then(data => {
      console.log('Arena leaderboard:', data);
    }).catch(err => {
      console.error('Leaderboard fetch failed:', err);
    });
  }, []);

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
      setSelected(null);
      setSubmitted(false);
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
          elo: myData.newElo,
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
  }, [user?.uid, setUserData]);

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

  function joinQueue() {
    setPhase(PHASE.WAITING);

    socketRef.current.emit('arena:join_queue', {
      userId: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      elo: userData?.elo || 1000,
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
    timeLeft > 30 ? '#22c55e' :
    timeLeft > 10 ? '#f59e0b' : '#ef4444';

  const filteredTopics = topicFilter === 'All'
    ? TOPICS
    : TOPICS.filter(t => t.level === topicFilter);

  return (
    <div className="arena-page">
      <style>{`
        .arena-page {
          min-height: 100vh;
          color: #fff;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 18% 12%, rgba(244,63,94,.26), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(168,85,247,.24), transparent 32%),
            radial-gradient(circle at 50% 85%, rgba(14,165,233,.16), transparent 36%),
            linear-gradient(180deg, #070713 0%, #0a0618 44%, #03040a 100%);
          padding: 24px;
          position: relative;
          overflow-x: hidden;
        }

        .arena-page:before {
          content: "";
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 44px 44px;
          mask-image: radial-gradient(circle at center, black, transparent 76%);
          pointer-events: none;
        }

        .arena-shell {
          max-width: 1220px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .glass {
          background: linear-gradient(180deg, rgba(15,23,42,.78), rgba(2,6,23,.72));
          border: 1px solid rgba(148,163,184,.16);
          box-shadow: 0 24px 80px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(22px);
          border-radius: 28px;
        }

        .lobby-hero {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .war-room {
          padding: 30px;
          position: relative;
          overflow: hidden;
          min-height: 285px;
        }

        .war-room:after {
          content: "";
          position: absolute;
          width: 320px;
          height: 320px;
          right: -100px;
          top: -120px;
          background: linear-gradient(135deg, #fb7185, #ec4899);
          filter: blur(85px);
          opacity: .28;
          border-radius: 999px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(236,72,153,.12);
          border: 1px solid rgba(236,72,153,.32);
          color: #f9a8d4;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .title {
          font-size: clamp(42px, 7vw, 82px);
          line-height: .88;
          letter-spacing: -0.08em;
          margin: 24px 0 14px;
          font-weight: 1000;
        }

        .title span {
          background: linear-gradient(135deg, #fff, #fb7185, #f97316);
          -webkit-background-clip: text;
          color: transparent;
        }

        .sub {
          margin: 0;
          max-width: 660px;
          color: #94a3b8;
          font-size: 14px;
          line-height: 1.7;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 24px;
        }

        .stat-card {
          padding: 14px;
          border-radius: 18px;
          background: rgba(15,23,42,.74);
          border: 1px solid rgba(148,163,184,.14);
        }

        .stat-card b {
          display: block;
          font-size: 22px;
          line-height: 1;
        }

        .stat-card small {
          display: block;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-top: 7px;
        }

        .opponent-radar {
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .radar-circle {
          width: 210px;
          height: 210px;
          margin: 8px auto 18px;
          border-radius: 50%;
          border: 1px solid rgba(236,72,153,.25);
          position: relative;
          background:
            radial-gradient(circle, rgba(236,72,153,.16) 0 2px, transparent 3px),
            radial-gradient(circle, rgba(236,72,153,.08), transparent 62%);
          box-shadow: 0 0 55px rgba(236,72,153,.2);
        }

        .radar-circle:before,
        .radar-circle:after {
          content: "";
          position: absolute;
          inset: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.09);
        }

        .radar-circle:after {
          inset: 68px;
        }

        .radar-line {
          position: absolute;
          width: 50%;
          height: 2px;
          left: 50%;
          top: 50%;
          transform-origin: left center;
          background: linear-gradient(90deg, #ec4899, transparent);
          animation: radarSpin 3s linear infinite;
        }

        @keyframes radarSpin {
          to { transform: rotate(360deg); }
        }

        .section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 20px 0 12px;
        }

        .section-head h2 {
          margin: 0;
          color: #e2e8f0;
          font-size: 15px;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .section-head span {
          color: #fb7185;
          font-size: 11px;
          font-weight: 900;
        }

        .filter-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .filter-btn {
          border: 1px solid rgba(148,163,184,.16);
          background: rgba(15,23,42,.68);
          color: #94a3b8;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          transition: .2s;
        }

        .filter-btn.active {
          color: #fff;
          border-color: rgba(251,113,133,.55);
          background: rgba(251,113,133,.14);
          box-shadow: 0 0 25px rgba(251,113,133,.18);
        }

        .topic-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .topic-card {
          min-height: 102px;
          border-radius: 22px;
          padding: 14px;
          background: rgba(15,23,42,.72);
          border: 1px solid rgba(148,163,184,.14);
          color: #cbd5e1;
          cursor: pointer;
          text-align: left;
          position: relative;
          overflow: hidden;
          transition: .22s ease;
        }

        .topic-card:hover {
          transform: translateY(-3px);
          border-color: rgba(251,113,133,.45);
        }

        .topic-card.active {
          background: linear-gradient(180deg, rgba(236,72,153,.22), rgba(15,23,42,.82));
          border-color: rgba(236,72,153,.72);
          box-shadow: 0 0 42px rgba(236,72,153,.22);
          transform: translateY(-3px);
        }

        .topic-icon {
          font-size: 22px;
          height: 28px;
          margin-bottom: 12px;
        }

        .topic-label {
          font-size: 12px;
          font-weight: 950;
          line-height: 1.25;
        }

        .topic-level {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 8px;
          font-weight: 1000;
          padding: 3px 7px;
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.1);
        }

        .lobby-bottom {
          display: grid;
          grid-template-columns: 1fr .42fr;
          gap: 18px;
          margin-top: 18px;
        }

        .control-card {
          padding: 22px;
        }

        .selected-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px;
          border-radius: 20px;
          background: rgba(15,23,42,.74);
          border: 1px solid rgba(148,163,184,.14);
          margin-bottom: 14px;
        }

        .primary-btn {
          width: 100%;
          border: none;
          border-radius: 22px;
          color: #fff;
          cursor: pointer;
          padding: 18px;
          font-size: 17px;
          font-weight: 1000;
          background: linear-gradient(135deg, #fb7185, #ec4899, #f97316);
          box-shadow: 0 0 45px rgba(236,72,153,.35);
        }

        .secondary-btn {
          width: 100%;
          margin-top: 12px;
          border: 1px solid rgba(148,163,184,.14);
          border-radius: 18px;
          background: rgba(15,23,42,.55);
          color: #94a3b8;
          cursor: pointer;
          padding: 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .waiting-box,
        .result-box,
        .battle-box {
          max-width: 980px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .waiting-box {
          padding-top: 70px;
          text-align: center;
        }

        .waiting-card {
          padding: 36px;
        }

        .pulse-sword {
          font-size: 74px;
          margin-bottom: 20px;
          filter: drop-shadow(0 0 30px rgba(236,72,153,.6));
        }

        .dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 26px 0;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ec4899;
        }

        .battle-top {
          display: grid;
          grid-template-columns: 1fr 180px 1fr;
          gap: 14px;
          align-items: center;
          margin-bottom: 18px;
        }

        .timer-box {
          text-align: center;
          padding: 18px;
        }

        .timer-main {
          font-size: 42px;
          font-weight: 1000;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .challenge-card {
          padding: 24px;
          margin-bottom: 16px;
        }

        .question-title {
          font-size: 24px;
          margin: 14px 0 8px;
          line-height: 1.3;
        }

        .question-text {
          color: #cbd5e1;
          line-height: 1.8;
          font-size: 15px;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .option-btn {
          padding: 16px 18px;
          border-radius: 18px;
          color: #cbd5e1;
          text-align: left;
          cursor: pointer;
          background: rgba(15,23,42,.72);
          border: 1px solid rgba(148,163,184,.15);
          transition: .2s;
        }

        .option-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(236,72,153,.45);
        }

        .option-btn.active {
          color: #fff;
          background: rgba(236,72,153,.16);
          border-color: rgba(236,72,153,.65);
          box-shadow: 0 0 28px rgba(236,72,153,.18);
        }

        .toast {
          background: rgba(245,158,11,.12);
          border: 1px solid rgba(245,158,11,.34);
          border-radius: 16px;
          padding: 12px 16px;
          text-align: center;
          color: #fbbf24;
          font-size: 14px;
          margin-bottom: 16px;
        }

        .result-box {
          padding-top: 35px;
          text-align: center;
        }

        .result-card {
          padding: 36px;
        }

        @media (max-width: 980px) {
          .lobby-hero,
          .lobby-bottom,
          .battle-top {
            grid-template-columns: 1fr;
          }

          .topic-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .option-grid {
            grid-template-columns: 1fr;
          }

          .arena-page {
            padding: 14px;
          }
        }
      `}</style>

      <AnimatePresence mode="wait">
        {phase === PHASE.LOBBY && (
          <motion.div
            key="lobby"
            className="arena-shell"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="lobby-hero">
              <div className="glass war-room">
                <div className="badge">⚔️ Real-Time DSA War Room</div>
                <h1 className="title">
                  Enter the <span>Arena</span>
                </h1>
                <p className="sub">
                  Pick a roadmap topic, match with a real opponent, and solve under pressure.
                  This is not practice mode — this is ranked 1v1 battle simulation.
                </p>

                <div className="stats-grid">
                  <div className="stat-card">
                    <b style={{ color: '#facc15' }}>{userData?.elo || 1000}</b>
                    <small>Your ELO</small>
                  </div>
                  <div className="stat-card">
                    <b style={{ color: '#22c55e' }}>{userData?.battlesWon || 0}</b>
                    <small>Battles Won</small>
                  </div>
                  <div className="stat-card">
                    <b style={{ color: '#38bdf8' }}>{userData?.battlesPlayed || 0}</b>
                    <small>Battles Played</small>
                  </div>
                </div>
              </div>

              <div className="glass opponent-radar">
                <div className="badge">🛰️ Matchmaking Radar</div>
                <div className="radar-circle">
                  <div className="radar-line" />
                </div>
                <div className="selected-row" style={{ marginBottom: 0 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 900 }}>
                      SELECTED TOPIC
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 4 }}>
                      {selectedTopic.icon} {selectedTopic.label}
                    </div>
                  </div>
                  <span style={{
                    color: levelColor[selectedTopic.level],
                    fontSize: 11,
                    fontWeight: 1000,
                    padding: '6px 9px',
                    borderRadius: 999,
                    background: `${levelColor[selectedTopic.level]}18`,
                    border: `1px solid ${levelColor[selectedTopic.level]}55`,
                  }}>
                    {selectedTopic.level}
                  </span>
                </div>
              </div>
            </div>

            <div className="section-head">
              <h2>Choose Battle Topic</h2>
              <span>{TOPICS.length} roadmap topics</span>
            </div>

            <div className="filter-row">
              {['All', 'Beginner', 'Core', 'Advanced', 'Expert'].map(f => (
                <button
                  key={f}
                  onClick={() => setTopicFilter(f)}
                  className={`filter-btn ${topicFilter === f ? 'active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="topic-grid">
              {filteredTopics.map(t => (
                <motion.button
                  key={t.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setTopic(t.id)}
                  className={`topic-card ${topic === t.id ? 'active' : ''}`}
                >
                  <span
                    className="topic-level"
                    style={{ color: levelColor[t.level] }}
                  >
                    {t.level}
                  </span>
                  <div className="topic-icon">{t.icon}</div>
                  <div className="topic-label">{t.label}</div>
                </motion.button>
              ))}
            </div>

            <div className="lobby-bottom">
              <div className="glass control-card">
                <div className="selected-row">
                  <div>
                    <div style={{ color: '#64748b', fontSize: 11, fontWeight: 900 }}>
                      BATTLE LOADOUT
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 1000, marginTop: 4 }}>
                      {selectedTopic.icon} {selectedTopic.label}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontSize: 11, fontWeight: 900 }}>
                      MODE
                    </div>
                    <div style={{ color: '#fb7185', fontSize: 16, fontWeight: 1000, marginTop: 4 }}>
                      Ranked 1v1
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={joinQueue}
                  className="primary-btn"
                >
                  ⚔️ Find Rival
                </motion.button>

                <button onClick={() => navigate('/')} className="secondary-btn">
                  ← Back to World
                </button>
              </div>

              <div className="glass control-card">
                <div className="section-head" style={{ marginTop: 0 }}>
                  <h2>Battle Rules</h2>
                  <span>90 sec</span>
                </div>

                {[
                  ['⚡', 'Fastest correct answer wins'],
                  ['🎯', 'Topic decides the challenge pool'],
                  ['📈', 'ELO changes after every match'],
                  ['💰', 'Winner earns credits'],
                ].map(([icon, text]) => (
                  <div
                    key={text}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '11px 0',
                      borderBottom: '1px solid rgba(148,163,184,.1)',
                      color: '#cbd5e1',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {phase === PHASE.WAITING && (
          <motion.div
            key="waiting"
            className="waiting-box"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
          >
            <div className="glass waiting-card">
              <motion.div
                className="pulse-sword"
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚔️
              </motion.div>

              <h1 style={{ fontSize: 36, margin: '0 0 8px', fontWeight: 1000 }}>
                Searching Rival...
              </h1>

              <p style={{ color: '#94a3b8', margin: 0 }}>
                Topic: <b style={{ color: '#fb7185' }}>{selectedTopic.label}</b> · ELO near {userData?.elo || 1000}
              </p>

              <div className="dots">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="dot"
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.25, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                  />
                ))}
              </div>

              <button onClick={cancelQueue} className="secondary-btn">
                Cancel Match
              </button>
            </div>
          </motion.div>
        )}

        {phase === PHASE.BATTLE && challenge && (
          <motion.div
            key="battle"
            className="battle-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="battle-top">
              <PlayerCard
                name={user.displayName?.split(' ')[0] || 'You'}
                photoURL={user.photoURL}
                elo={userData?.elo || 1000}
                label="YOU"
                color="#22c55e"
              />

              <div className="glass timer-box">
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 1000, letterSpacing: '.12em' }}>
                  TIME LEFT
                </div>
                <div className="timer-main" style={{ color: timerColor, textShadow: `0 0 26px ${timerColor}` }}>
                  {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                  {String(timeLeft % 60).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 900 }}>
                  LIVE DUEL
                </div>
              </div>

              {opponent && (
                <PlayerCard
                  name={opponent.displayName?.split(' ')[0] || 'Opponent'}
                  photoURL={opponent.photoURL}
                  elo={opponent.elo || 1000}
                  label="OPPONENT"
                  color="#fb7185"
                  flip
                />
              )}
            </div>

            <AnimatePresence>
              {opponentMsg && (
                <motion.div
                  className="toast"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {opponentMsg}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass challenge-card">
              <div className="badge">
                {challenge.topic} · {challenge.difficulty}
              </div>

              <h2 className="question-title">{challenge.title}</h2>
              <p className="question-text">{challenge.question}</p>
            </div>

            <div className="option-grid">
              {challenge.options.map((opt, i) => {
                const isSelected = selected === opt;

                return (
                  <motion.button
                    key={i}
                    whileTap={!submitted ? { scale: 0.98 } : {}}
                    onClick={() => !submitted && setSelected(opt)}
                    className={`option-btn ${isSelected ? 'active' : ''}`}
                    style={{ cursor: submitted ? 'default' : 'pointer' }}
                  >
                    <span style={{ fontWeight: 1000, color: '#fb7185', marginRight: 10 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </motion.button>
                );
              })}
            </div>

            {!submitted ? (
              <motion.button
                whileHover={selected ? { scale: 1.015 } : {}}
                whileTap={selected ? { scale: 0.98 } : {}}
                onClick={() => handleSubmit(false)}
                disabled={!selected}
                className="primary-btn"
                style={{
                  opacity: selected ? 1 : 0.45,
                  cursor: selected ? 'pointer' : 'not-allowed',
                }}
              >
                ⚡ Lock Answer
              </motion.button>
            ) : (
              <div className="toast">
                ⏳ Answer locked. Waiting for opponent...
              </div>
            )}
          </motion.div>
        )}

        {phase === PHASE.RESULT && result && (
          <motion.div
            key="result"
            className="result-box"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {(() => {
              const myData = result.player1.userId === user.uid ? result.player1 : result.player2;
              const isWinner = result.winnerId === user.uid;
              const isDraw = result.resultType === 'both_wrong';

              return (
                <div className="glass result-card">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
                    style={{ fontSize: 86, marginBottom: 10 }}
                  >
                    {isDraw ? '🤝' : isWinner ? '🏆' : '💀'}
                  </motion.div>

                  <h1
                    style={{
                      fontSize: 44,
                      fontWeight: 1000,
                      margin: '0 0 8px',
                      color: isDraw ? '#f59e0b' : isWinner ? '#22c55e' : '#ef4444',
                      textShadow: `0 0 35px ${isDraw ? '#f59e0b' : isWinner ? '#22c55e' : '#ef4444'}`,
                    }}
                  >
                    {isDraw ? 'DRAW' : isWinner ? 'VICTORY!' : 'DEFEATED'}
                  </h1>

                  <p style={{ color: '#94a3b8', marginBottom: 28 }}>
                    {result.resultType === 'forfeit'
                      ? '🏃 Opponent disconnected'
                      : isDraw
                        ? 'Both answered incorrectly'
                        : isWinner
                          ? 'You solved it correctly!'
                          : 'Better luck next time!'}
                  </p>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    marginBottom: 24,
                  }}>
                    <StatBox label="Credits Earned" value={`+${myData.credits}💰`} color="#facc15" />
                    <StatBox
                      label="ELO Change"
                      value={`${myData.newElo - myData.oldElo >= 0 ? '+' : ''}${myData.newElo - myData.oldElo}`}
                      color={myData.newElo >= myData.oldElo ? '#22c55e' : '#ef4444'}
                    />
                    <StatBox
                      label="Time Taken"
                      value={myData.timeTaken ? `${(myData.timeTaken / 1000).toFixed(1)}s` : 'N/A'}
                      color="#38bdf8"
                    />
                  </div>

                  <div style={{
                    background: 'rgba(34,197,94,.08)',
                    border: '1px solid rgba(34,197,94,.25)',
                    borderRadius: 18,
                    padding: 16,
                    marginBottom: 24,
                    textAlign: 'left',
                  }}>
                    <p style={{ color: '#22c55e', fontWeight: 900, margin: '0 0 6px' }}>
                      ✅ Correct Answer: {result.correctAnswer}
                    </p>
                    <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                      {result.explanation}
                    </p>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 26,
                  }}>
                    <EloCard name="You" oldElo={myData.oldElo} newElo={myData.newElo} isYou />
                    <EloCard
                      name="Opponent"
                      oldElo={
                        result.player1.userId === user.uid
                          ? result.player2.oldElo
                          : result.player1.oldElo
                      }
                      newElo={
                        result.player1.userId === user.uid
                          ? result.player2.newElo
                          : result.player1.newElo
                      }
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button onClick={backToLobby} className="primary-btn">
                      ⚔️ Play Again
                    </button>
                    <button onClick={() => navigate('/')} className="secondary-btn" style={{ marginTop: 0 }}>
                      🌍 Back to World
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlayerCard({ name, photoURL, elo, label, color, flip = false }) {
  return (
    <div
      className="glass"
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: flip ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <img
        src={photoURL || `https://ui-avatars.com/api/?name=${name}&background=random`}
        alt={name}
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          boxShadow: `0 0 24px ${color}55`,
        }}
      />

      <div style={{ textAlign: flip ? 'right' : 'left' }}>
        <div style={{
          fontSize: 10,
          color,
          fontWeight: 1000,
          letterSpacing: '.12em',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 950 }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 800 }}>
          ELO {elo}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(15,23,42,.72)',
      border: '1px solid rgba(148,163,184,.14)',
      borderRadius: 18,
      padding: '16px 10px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 1000, color, marginBottom: 5 }}>
        {value}
      </div>
      <div style={{
        fontSize: 10,
        color: '#64748b',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
      }}>
        {label}
      </div>
    </div>
  );
}

function EloCard({ name, oldElo, newElo, isYou = false }) {
  const diff = newElo - oldElo;
  const color = diff >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div style={{
      background: isYou ? 'rgba(34,197,94,.08)' : 'rgba(15,23,42,.72)',
      border: `1px solid ${isYou ? 'rgba(34,197,94,.24)' : 'rgba(148,163,184,.14)'}`,
      borderRadius: 18,
      padding: 16,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight: 900 }}>
        {name}
      </div>
      <div style={{ fontSize: 24, fontWeight: 1000 }}>
        {newElo}
      </div>
      <div style={{ fontSize: 13, color, marginTop: 4, fontWeight: 900 }}>
        {diff >= 0 ? '+' : ''}{diff} ELO
      </div>
    </div>
  );
}


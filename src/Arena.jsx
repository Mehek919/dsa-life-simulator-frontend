import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import API_BASE from './config';
import { tracedFetch } from './usePerformance';
import './Arena.css';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const BATTLE_SECONDS = 90;

// Topics (same ids the backend uses) with a champion glyph, tagline and signature skills
const TOPICS = [
  { id: 'Array', label: 'Array', level: 'Beginner', glyph: '[ ]', tag: 'The first blade every coder masters.', skills: ['Two pointers', 'Prefix sums', 'In-place swaps'] },
  { id: 'String', label: 'String', level: 'Beginner', glyph: '"ab"', tag: 'Words are weapons. Slice them fast.', skills: ['Sliding window', 'Hashing chars', 'Palindromes'] },
  { id: 'HashTable', label: 'Hash Table', level: 'Core', glyph: '#{}', tag: 'Instant lookups. Zero hesitation.', skills: ['Frequency maps', 'Two-sum tricks', 'Dedup'] },
  { id: 'LinkedList', label: 'Linked List', level: 'Core', glyph: 'o→o', tag: 'Follow the chain, never lose the head.', skills: ['Fast & slow', 'Reversal', 'Dummy nodes'] },
  { id: 'Stack', label: 'Stack', level: 'Core', glyph: '|≡|', tag: 'Last in, first to strike.', skills: ['Monotonic stack', 'Parsing', 'Undo logic'] },
  { id: 'Queue', label: 'Queue', level: 'Core', glyph: '→→', tag: 'Patience, order, and throughput.', skills: ['FIFO flow', 'Simulation', 'Level order'] },
  { id: 'Deque', label: 'Deque', level: 'Core', glyph: '⇄', tag: 'Strikes from both ends.', skills: ['Window max', '0-1 BFS', 'Double ends'] },
  { id: 'Tree', label: 'Tree', level: 'Core', glyph: '⋀', tag: 'Roots, branches, and recursion.', skills: ['Traversals', 'Depth', 'Subtrees'] },
  { id: 'BinaryTree', label: 'Binary Tree', level: 'Core', glyph: '⋀⋀', tag: 'Two children, endless puzzles.', skills: ['DFS orders', 'LCA', 'Path sums'] },
  { id: 'BST', label: 'BST', level: 'Core', glyph: '≤⋀', tag: 'Order in every branch.', skills: ['Inorder magic', 'Validate', 'Kth smallest'] },
  { id: 'Heap', label: 'Heap / PQ', level: 'Core', glyph: '△', tag: 'Always grabs the best first.', skills: ['Top K', 'Merge K', 'Scheduling'] },
  { id: 'Graph', label: 'Graph', level: 'Advanced', glyph: '◇–◇', tag: 'Everything connects. Map it.', skills: ['Adjacency', 'Cycles', 'Components'] },
  { id: 'BFS', label: 'BFS', level: 'Advanced', glyph: '◎', tag: 'Ripples outward, finds the shortest.', skills: ['Level search', 'Multi-source', 'Grids'] },
  { id: 'DFS', label: 'DFS', level: 'Advanced', glyph: '↓↓', tag: 'Dives deep before it looks back.', skills: ['Recursion', 'Islands', 'Ordering'] },
  { id: 'Backtracking', label: 'Backtracking', level: 'Advanced', glyph: '↩', tag: 'Try, fail, undo, conquer.', skills: ['Permutations', 'Pruning', 'N-Queens'] },
  { id: 'DynamicProgramming', label: 'Dynamic Programming', level: 'Advanced', glyph: 'dp[]', tag: 'Remembers every past battle.', skills: ['Memoization', 'Tabulation', 'State design'] },
  { id: 'Greedy', label: 'Greedy', level: 'Advanced', glyph: 'max', tag: 'Takes the best move, right now.', skills: ['Intervals', 'Exchange args', 'Sorting'] },
  { id: 'BinarySearch', label: 'Binary Search', level: 'Core', glyph: 'lo|hi', tag: 'Halves the battlefield each turn.', skills: ['Bounds', 'On answer', 'Rotated arrays'] },
  { id: 'SlidingWindow', label: 'Sliding Window', level: 'Core', glyph: '[▭]', tag: 'Glides across, never looks back.', skills: ['Fixed window', 'Variable window', 'Counts'] },
  { id: 'TwoPointers', label: 'Two Pointers', level: 'Core', glyph: '↑ ↑', tag: 'Two strikers closing in.', skills: ['Converging', 'Partition', 'Sorted pairs'] },
  { id: 'PrefixSum', label: 'Prefix Sum', level: 'Core', glyph: 'Σ', tag: 'Precompute once, answer instantly.', skills: ['Range sums', '2D prefix', 'Subarray sums'] },
  { id: 'Matrix', label: 'Matrix', level: 'Core', glyph: '▦', tag: 'A grid is just a battlefield.', skills: ['Spiral', 'Rotation', 'Grid walks'] },
  { id: 'Recursion', label: 'Recursion', level: 'Core', glyph: 'f(f)', tag: 'Calls on itself for backup.', skills: ['Base cases', 'Divide & conquer', 'Call stack'] },
  { id: 'BitManipulation', label: 'Bit Manipulation', level: 'Advanced', glyph: '1&0', tag: 'Fights at the level of bits.', skills: ['XOR tricks', 'Masks', 'Bit counts'] },
  { id: 'Trie', label: 'Trie', level: 'Advanced', glyph: 't·r', tag: 'Every prefix, instantly.', skills: ['Autocomplete', 'Word search', 'Prefix counts'] },
  { id: 'UnionFind', label: 'Union Find', level: 'Advanced', glyph: '∪', tag: 'Unites the scattered.', skills: ['Path compression', 'Union by rank', 'Components'] },
  { id: 'TopologicalSort', label: 'Topological Sort', level: 'Advanced', glyph: '→⊢', tag: 'Knows what must come first.', skills: ["Kahn's algorithm", 'DFS order', 'Cycle check'] },
  { id: 'ShortestPath', label: 'Shortest Path', level: 'Advanced', glyph: '⇝', tag: 'Always finds the fastest route.', skills: ['Dijkstra', 'Bellman-Ford', '0-1 weights'] },
  { id: 'SegmentTree', label: 'Segment Tree', level: 'Expert', glyph: '[⋀]', tag: 'Range queries at legendary speed.', skills: ['Range updates', 'Lazy propagation', 'Merge nodes'] },
  { id: 'Math', label: 'Math', level: 'Core', glyph: 'π', tag: 'Numbers bend to its will.', skills: ['GCD & primes', 'Modular math', 'Combinatorics'] },
];
const LEVEL_COLOR = { Beginner: '#39d98a', Core: '#35c4e6', Advanced: '#f4b740', Expert: '#ff2d55' };
const LEVEL_RANK = { Beginner: 1, Core: 2, Advanced: 3, Expert: 4 };
// Same ELO bands as the Arena record on the profile
const ELO_TIERS = [['Bronze', 0, '#c98a52'], ['Gold', 1000, '#f2c14e'], ['Diamond', 1200, '#6aa8ff'], ['Master', 1500, '#c084fc'], ['Grandmaster', 1800, '#ff4d4d']];
const PHASE = { LOBBY: 'LOBBY', WAITING: 'WAITING', FOUND: 'FOUND', BATTLE: 'BATTLE', RESULT: 'RESULT' };
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const avatarUrl = (name, photoURL) => photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Player')}&background=random`;

function makeBolt() {
  let x = Math.random() * 600, y = Math.random() < 0.5 ? 0 : 100; let d = `M${x.toFixed(0)} ${y}`;
  const dir = y === 0 ? 1 : -1, steps = 6 + Math.floor(Math.random() * 5);
  for (let k = 0; k < steps; k++) { x += (Math.random() - 0.5) * 70; y += dir * (100 / steps) * (0.6 + Math.random() * 0.8); d += ` L${x.toFixed(0)} ${Math.max(0, Math.min(100, y)).toFixed(0)}`; }
  return d;
}

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
  const [timeLeft, setTimeLeft] = useState(BATTLE_SECONDS);
  const [result, setResult] = useState(null);
  const [opponentMsg, setOpponentMsg] = useState('');
  const [topicFilter, setTopicFilter] = useState('All');
  const [stats, setStats] = useState(null);           // live telemetry from the server
  const [searchSecs, setSearchSecs] = useState(0);
  const [toast, setToast] = useState('');
  const [flash, setFlash] = useState(0);
  const timerRef = useRef(null), foundTimer = useRef(null), localStart = useRef(null), searchStart = useRef(null);

  const selectedTopic = TOPICS.find((t) => t.id === topic) || TOPICS[0];
  const accent = LEVEL_COLOR[selectedTopic.level];
  const elo = userData?.elo || 1000;
  const wins = userData?.arenaWins ?? userData?.battlesWon ?? 0;
  const played = userData?.battlesPlayed || 0;
  const tierIdx = ELO_TIERS.reduce((a, t, i) => (elo >= t[1] ? i : a), 0), tier = ELO_TIERS[tierIdx], nextTier = ELO_TIERS[tierIdx + 1];
  const tierPct = nextTier ? Math.max(2, Math.round((elo - tier[1]) / (nextTier[1] - tier[1]) * 100)) : 100;

  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id); }, [toast]);

  // ── Submit (time measured from when this browser received the battle start) ──
  const handleSubmit = useCallback((timeout = false) => {
    if (submitted || !socketRef.current) return;
    setSubmitted(true);
    clearInterval(timerRef.current);
    const timeTaken = localStart.current ? Date.now() - localStart.current : BATTLE_SECONDS * 1000;
    socketRef.current.emit('arena:submit_answer', { battleId, userId: user.uid, answer: timeout ? null : selected, timeTaken });
  }, [submitted, battleId, user?.uid, selected]);

  useEffect(() => {
    tracedFetch('fetch_leaderboard', () => axios.get(`${API_BASE}/leaderboard/arena`)).catch((err) => console.error('Leaderboard fetch failed:', err));
  }, []);

  // ── Socket ──
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = socket;
    const joinLobby = () => socket.emit('arena:lobby_join');
    socket.on('connect', joinLobby);
    socket.on('arena:stats', (s) => setStats(s));
    socket.on('arena:waiting', ({ message }) => console.log(message));
    socket.on('arena:battle_start', ({ battleId: id, challenge: ch, opponent: opp }) => {
      localStart.current = Date.now();
      setBattleId(id); setChallenge(ch); setOpponent(opp); setTimeLeft(BATTLE_SECONDS); setSelected(null); setSubmitted(false);
      setPhase(PHASE.FOUND);                       // a one-second lock-on moment, then the duel
      clearTimeout(foundTimer.current);
      foundTimer.current = setTimeout(() => setPhase(PHASE.BATTLE), reduceMotion() ? 0 : 1000);
    });
    socket.on('arena:opponent_answered', ({ message }) => { setOpponentMsg(message); setTimeout(() => setOpponentMsg(''), 4000); });
    socket.on('arena:battle_result', (resultData) => {
      clearInterval(timerRef.current); clearTimeout(foundTimer.current);
      setResult(resultData); setPhase(PHASE.RESULT);
      if (setUserData) {
        const myData = resultData.player1.userId === user.uid ? resultData.player1 : resultData.player2;
        const won = resultData.winnerId === user.uid, lost = resultData.winnerId && !won;
        setUserData((prev) => ({
          ...prev, elo: myData.newElo, credits: (prev?.credits || 0) + myData.credits,
          battlesPlayed: (prev?.battlesPlayed || 0) + 1,
          arenaWins: (prev?.arenaWins || 0) + (won ? 1 : 0), arenaLosses: (prev?.arenaLosses || 0) + (lost ? 1 : 0),
        }));
      }
    });
    socket.on('arena:error', ({ message }) => { setToast(message || 'Something went wrong. Try again.'); setPhase(PHASE.LOBBY); });
    return () => { clearTimeout(foundTimer.current); socket.disconnect(); };
  }, [user?.uid, setUserData]);

  // ── Battle countdown ──
  useEffect(() => {
    if (phase !== PHASE.BATTLE) return undefined;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, BATTLE_SECONDS - Math.floor((Date.now() - localStart.current) / 1000));
      setTimeLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); handleSubmit(true); }
    }, 250);
    return () => clearInterval(timerRef.current);
  }, [phase, handleSubmit]);

  // Start each duel and each result at the top of the page
  useEffect(() => {
    if (phase === PHASE.BATTLE || phase === PHASE.RESULT) window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
  }, [phase]);

  // ── Search timer ──
  useEffect(() => {
    if (phase !== PHASE.WAITING) return undefined;
    searchStart.current = Date.now(); setSearchSecs(0);
    const id = setInterval(() => setSearchSecs(Math.floor((Date.now() - searchStart.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [phase]);

  function joinQueue() {
    if (!socketRef.current) return;
    setPhase(PHASE.WAITING);
    socketRef.current.emit('arena:join_queue', { userId: user.uid, displayName: user.displayName, photoURL: user.photoURL, elo, topic });
  }
  function cancelQueue() { if (socketRef.current) socketRef.current.emit('arena:leave_queue'); setPhase(PHASE.LOBBY); }
  function backToLobby() {
    setPhase(PHASE.LOBBY); setOpponent(null); setChallenge(null); setBattleId(null); setSelected(null);
    setSubmitted(false); setTimeLeft(BATTLE_SECONDS); setResult(null); setOpponentMsg('');
  }
  function chooseTopic(id) {
    if (phase !== PHASE.LOBBY) { setToast('Cancel the search to change champion'); return; }
    setTopic(id); setFlash((f) => f + 1);
  }

  // ── 3D radar + emblem while in the lobby ──
  const inLobby = phase === PHASE.LOBBY || phase === PHASE.WAITING || phase === PHASE.FOUND;
  const radarHost = useRef(null), emblemHost = useRef(null), radarRef = useRef(null);
  const accentRef = useRef(accent); accentRef.current = accent;
  useEffect(() => {
    if (!inLobby) return undefined;
    let dead = false, stopEmblem = null;
    import('./ArenaScene').then((m) => {
      if (dead) return;
      if (radarHost.current) radarRef.current = m.mountRadar(radarHost.current, accentRef.current);
      if (emblemHost.current) stopEmblem = m.mountEmblem(emblemHost.current, tier[2]);
    }).catch((e) => console.warn('Arena 3D unavailable:', e));
    return () => { dead = true; if (radarRef.current) radarRef.current.destroy(); radarRef.current = null; if (stopEmblem) stopEmblem(); };
  }, [inLobby, tier[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (radarRef.current) radarRef.current.setColor(accent); }, [accent]);
  useEffect(() => { if (radarRef.current) radarRef.current.setMode(phase === PHASE.WAITING ? 'search' : phase === PHASE.FOUND ? 'found' : 'idle'); }, [phase]);

  // ── Electric arcs on the CTA when ready ──
  const arcRefs = [useRef(null), useRef(null), useRef(null)];
  useEffect(() => {
    if (phase !== PHASE.LOBBY || reduceMotion()) return undefined;
    const id = setInterval(() => {
      arcRefs.forEach((r) => {
        const el = r.current; if (!el || Math.random() > 0.55) return;
        el.setAttribute('d', makeBolt()); el.style.transition = 'none'; el.style.opacity = 1;
        requestAnimationFrame(() => { el.style.transition = 'opacity .35s'; el.style.opacity = 0; });
      });
    }, 420);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = topicFilter === 'All' ? TOPICS : TOPICS.filter((t) => t.level === topicFilter);
  const gridRef = useRef(null);
  const onGridKey = (e) => {
    const btns = [...gridRef.current.querySelectorAll('.ar-champ')], k = btns.indexOf(document.activeElement); if (k < 0) return;
    const cols = Math.max(1, Math.round(gridRef.current.clientWidth / (btns[0].offsetWidth + 10)));
    const n = { ArrowRight: k + 1, ArrowLeft: k - 1, ArrowDown: k + cols, ArrowUp: k - cols }[e.key];
    if (n == null) return; e.preventDefault(); if (btns[n]) btns[n].focus();
  };
  const handle = ((user?.displayName || 'dev').split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const statusTitle = phase === PHASE.WAITING ? 'SEARCHING' : phase === PHASE.FOUND ? 'LOCKED ON' : 'READY';
  const statusSub = phase === PHASE.WAITING ? `Looking for a rival near ELO ${elo}…` : phase === PHASE.FOUND && opponent ? `${opponent.displayName || 'Rival'} · ELO ${opponent.elo || 1000}` : 'Pick a champion and hit Find Rival';
  const timerColor = timeLeft > 30 ? '#39ff88' : timeLeft > 10 ? '#f4b740' : '#ff2d55';
  const dash = (v) => (v == null ? '—' : v);

  return (
    <div className="ar" style={{ '--acc': accent, '--tier': tier[2] }}>
      <div className="ar-crt" aria-hidden="true" />
      <div className="ar-page">
        <div className="ar-top">
          <button className="ar-btn" onClick={() => navigate('/world')}>&larr; World</button>
          <div className="ar-path"><b>{handle}</b>@<i>evoworld</i>:~/arena$</div>
        </div>

        {inLobby && (
          <>
            <div className="ar-row1">
              <section className="ar-card ar-hero" aria-labelledby="ar-h1">
                <span className="ar-kicker"><i />REAL-TIME DSA WAR ROOM</span>
                <h1 id="ar-h1">Enter the <span>Arena</span></h1>
                <p>Pick your champion topic, match with a real opponent, and solve under pressure. Ranked 1v1: every win and loss moves your ELO.</p>
                <div className="ar-tierbox">
                  <div className="ar-emblem" ref={emblemHost} aria-hidden="true" />
                  <div>
                    <div className="ar-tiername">{tier[0].toUpperCase()} TIER</div>
                    <div className="ar-tiersub">{nextTier ? `${nextTier[1] - elo} ELO to ${nextTier[0]}` : 'Top tier reached'}</div>
                    <div className="ar-tbar" role="img" aria-label={`${tierPct}% of the way to ${nextTier ? nextTier[0] : 'the top'}`}><i style={{ width: `${tierPct}%` }} /></div>
                    <div className="ar-tlab"><span>{tier[0]} {tier[1]}</span><span>{nextTier ? `${nextTier[0]} ${nextTier[1]}` : ''}</span></div>
                    <div className="ar-ladder">{ELO_TIERS.map((t, i) => <span key={t[0]} style={{ '--c': t[2] }} className={i <= tierIdx ? 'on' : ''}>{t[0].slice(0, 4).toUpperCase()}</span>)}</div>
                  </div>
                </div>
                <div className="ar-stats">
                  <div className="ar-stat"><b style={{ color: '#f4b740' }}>{elo}</b><small>YOUR ELO</small></div>
                  <div className="ar-stat"><b style={{ color: '#39ff88' }}>{wins}</b><small>BATTLES WON</small></div>
                  <div className="ar-stat"><b style={{ color: '#35c4e6' }}>{played}</b><small>BATTLES PLAYED</small></div>
                </div>
              </section>

              <section className="ar-card ar-radar" aria-label="Matchmaking radar">
                <div className="hd"><span className="ar-kicker"><i />MATCHMAKING RADAR</span><span className="ar-live">{stats ? 'live' : 'connecting…'}</span></div>
                <div className="ar-radar3d" ref={radarHost} aria-hidden="true" />
                <div className="ar-status" role="status" style={{ position: 'relative', bottom: 'auto', marginTop: -64, marginBottom: 14 }}><b>{statusTitle}</b><span>{statusSub}</span></div>
                <div className="ar-tele" aria-label="Live arena stats">
                  <div><small>IN THE ARENA</small><b>{dash(stats?.online)}</b></div>
                  <div><small>SEARCHING NOW</small><b>{dash(stats?.waiting)}</b>{stats?.waitingTopic && <em>{(TOPICS.find((t) => t.id === stats.waitingTopic) || {}).label || stats.waitingTopic}</em>}</div>
                  <div><small>LIVE BATTLES</small><b>{dash(stats?.live)}</b></div>
                  <div><small>AVG WAIT</small><b>{stats?.avgWaitMs != null ? mmss(stats.avgWaitMs / 1000) : '—'}</b></div>
                </div>
              </section>
            </div>

            <div className="ar-sel">
              <section aria-labelledby="ar-selh">
                <div className="ar-selhd">
                  <h2 id="ar-selh">CHOOSE YOUR CHAMPION</h2>
                  <div className="ar-filters" role="group" aria-label="Filter by tier">
                    {['All', 'Beginner', 'Core', 'Advanced', 'Expert'].map((f) => <button key={f} aria-pressed={topicFilter === f} onClick={() => setTopicFilter(f)}>{f}</button>)}
                  </div>
                </div>
                <div className="ar-grid" ref={gridRef} role="group" aria-label="Battle topics" onKeyDown={onGridKey}>
                  {filtered.map((t) => (
                    <button key={t.id} className={`ar-champ${t.level === 'Expert' ? ' expert' : ''}`} style={{ '--c': LEVEL_COLOR[t.level] }} aria-pressed={topic === t.id} onClick={() => chooseTopic(t.id)}>
                      <span className="shine" /><span className="g" aria-hidden="true">{t.glyph}</span>
                      <span><b>{t.label}</b><small>{t.level.toUpperCase()}</small></span>
                    </button>
                  ))}
                </div>
              </section>

              <aside>
                <section key={flash} className={`ar-card ar-splash${flash ? ' flash' : ''}`} style={{ '--c': accent }} aria-live="polite">
                  <div className="ar-splashtop">
                    <div className="ar-bigglyph" aria-hidden="true">{selectedTopic.glyph}</div>
                    <span className="tier">{selectedTopic.level.toUpperCase()}</span>
                    <h3>{selectedTopic.label}</h3>
                    <p className="tag">{selectedTopic.tag}</p>
                  </div>
                  <div className="ar-splashbody">
                    <div className="ar-skills">{selectedTopic.skills.map((s) => <span key={s}>{s}</span>)}</div>
                    <div className="ar-diff">Difficulty <i>{[1, 2, 3, 4].map((n) => <b key={n} className={n <= LEVEL_RANK[selectedTopic.level] ? 'on' : ''} />)}</i></div>
                    <div className="ar-rules">
                      <h4>BATTLE RULES <b>{BATTLE_SECONDS} SEC</b></h4>
                      <ul><li>Fastest correct answer wins</li><li>Topic decides the challenge pool</li><li>ELO changes after every match</li><li>Winner earns credits</li></ul>
                    </div>
                  </div>
                </section>

                <div className="ar-ctawrap sticky">
                  <button className={`ar-cta${phase === PHASE.WAITING ? ' searching' : phase === PHASE.FOUND ? ' found' : ''}`}
                    onClick={phase === PHASE.LOBBY ? joinQueue : phase === PHASE.WAITING ? cancelQueue : undefined}
                    aria-label={phase === PHASE.LOBBY ? `Find rival, ranked 1v1, ${selectedTopic.label}` : phase === PHASE.WAITING ? 'Searching. Activate to cancel' : 'Rival found'}>
                    {phase === PHASE.LOBBY && <span className="sheen" />}
                    <svg viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true"><path className="arc" ref={arcRefs[0]} /><path className="arc" ref={arcRefs[1]} /><path className="arc" ref={arcRefs[2]} /></svg>
                    <span>{phase === PHASE.LOBBY ? '⚔ FIND RIVAL' : phase === PHASE.WAITING ? `SEARCHING ${mmss(searchSecs)}` : 'RIVAL FOUND'}</span>
                    <small>{phase === PHASE.LOBBY ? `RANKED 1V1 · ${selectedTopic.label.toUpperCase()}` : phase === PHASE.WAITING ? 'TAP TO CANCEL' : 'BATTLE STARTING…'}</small>
                  </button>
                  {phase === PHASE.FOUND && opponent && (
                    <div className="ar-found" role="status">
                      <img src={avatarUrl(opponent.displayName, opponent.photoURL)} alt="" />
                      <span><b>{opponent.displayName || 'Rival'}</b><small>ELO {opponent.elo || 1000}</small></span>
                    </div>
                  )}
                  <button className="ar-btn ar-back" onClick={() => navigate('/world')}>&larr; Back to World</button>
                </div>
              </aside>
            </div>
          </>
        )}

        {phase === PHASE.BATTLE && challenge && (
          <div className="ar-battle">
            <div className="ar-battletop">
              <div className="ar-card ar-player" style={{ '--pc': '#39ff88' }}>
                <img src={avatarUrl(user.displayName, user.photoURL)} alt="" />
                <div><small>YOU</small><b>{user.displayName?.split(' ')[0] || 'You'}</b><span>ELO {elo}</span></div>
              </div>
              <div className="ar-card ar-timer" role="timer" aria-live="off">
                <small>TIME LEFT</small><b style={{ color: timerColor, textShadow: `0 0 26px ${timerColor}` }}>{mmss(timeLeft)}</b><small>LIVE DUEL</small>
              </div>
              {opponent && (
                <div className="ar-card ar-player flip" style={{ '--pc': '#ff2d55' }}>
                  <img src={avatarUrl(opponent.displayName, opponent.photoURL)} alt="" />
                  <div><small>OPPONENT</small><b>{opponent.displayName?.split(' ')[0] || 'Opponent'}</b><span>ELO {opponent.elo || 1000}</span></div>
                </div>
              )}
            </div>
            {opponentMsg && <div className="ar-note" role="status">{opponentMsg}</div>}
            <div className="ar-card ar-question">
              <span className="ar-kicker">{challenge.topic} · {challenge.difficulty}</span>
              <h2>{challenge.title}</h2>
              <p>{challenge.question}</p>
            </div>
            <div className="ar-options" role="group" aria-label="Answer options">
              {challenge.options.map((opt, i) => (
                <button key={i} className="ar-option" aria-pressed={selected === opt} disabled={submitted} onClick={() => setSelected(opt)}>
                  <b>{String.fromCharCode(65 + i)}.</b>{opt}
                </button>
              ))}
            </div>
            {!submitted
              ? <button className="ar-lock" disabled={!selected} onClick={() => handleSubmit(false)}>⚡ LOCK ANSWER</button>
              : <div className="ar-note" role="status">Answer locked. Waiting for your opponent…</div>}
          </div>
        )}

        {phase === PHASE.RESULT && result && (() => {
          const myData = result.player1.userId === user.uid ? result.player1 : result.player2;
          const other = result.player1.userId === user.uid ? result.player2 : result.player1;
          const isWinner = result.winnerId === user.uid, isDraw = result.resultType === 'both_wrong';
          const color = isDraw ? '#f4b740' : isWinner ? '#39ff88' : '#ff2d55';
          const diff = myData.newElo - myData.oldElo, odiff = other.newElo - other.oldElo;
          return (
            <div className="ar-result">
              <div className="ar-card ar-resultcard">
                <div style={{ fontSize: 72 }} aria-hidden="true">{isDraw ? '🤝' : isWinner ? '🏆' : '💀'}</div>
                <h1 style={{ color, textShadow: `0 0 35px ${color}` }}>{isDraw ? 'DRAW' : isWinner ? 'VICTORY!' : 'DEFEATED'}</h1>
                <p style={{ color: '#b0a3ad', margin: 0 }}>{result.resultType === 'forfeit' ? 'Opponent disconnected' : isDraw ? 'Both answered incorrectly' : isWinner ? 'You solved it correctly!' : 'Better luck next time!'}</p>
                <div className="ar-r3">
                  <div className="ar-box"><b style={{ color: '#f4b740' }}>+{myData.credits}</b><small>CREDITS EARNED</small></div>
                  <div className="ar-box"><b style={{ color: diff >= 0 ? '#39ff88' : '#ff2d55' }}>{diff >= 0 ? '+' : ''}{diff}</b><small>ELO CHANGE</small></div>
                  <div className="ar-box"><b style={{ color: '#35c4e6' }}>{myData.timeTaken ? `${(myData.timeTaken / 1000).toFixed(1)}s` : 'N/A'}</b><small>TIME TAKEN</small></div>
                </div>
                <div className="ar-answer"><b>Correct answer: {result.correctAnswer}</b><p>{result.explanation}</p></div>
                <div className="ar-r2" style={{ marginBottom: 18 }}>
                  <div className="ar-box"><small>YOU</small><b>{myData.newElo}</b><small style={{ color: diff >= 0 ? '#39ff88' : '#ff2d55' }}>{diff >= 0 ? '+' : ''}{diff} ELO</small></div>
                  <div className="ar-box"><small>OPPONENT</small><b>{other.newElo}</b><small style={{ color: odiff >= 0 ? '#39ff88' : '#ff2d55' }}>{odiff >= 0 ? '+' : ''}{odiff} ELO</small></div>
                </div>
                <div className="ar-r2">
                  <button className="ar-lock" onClick={backToLobby}>⚔ PLAY AGAIN</button>
                  <button className="ar-btn" onClick={() => navigate('/world')}>Back to World</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
      {toast && <div className="ar-toast" role="status">{toast}</div>}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from './firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import axios from 'axios';
import API_BASE from './config';
import { useNavigate } from 'react-router-dom';
import './Hub.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOPICS       = ['Array', 'String', 'Tree', 'Graph', 'DP', 'LinkedList', 'Stack', 'Queue', 'Hash Table', 'Binary Search', 'Sorting', 'Recursion'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SORTS        = [['newest', 'Newest', 'newest'], ['popular', 'Popular', 'attempts'], ['rating', 'Top rated', 'rating']]; // [key, label, backend sort]
const LEVEL_NAMES  = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const DC = { easy: '#39ff88', medium: '#f4b740', hard: '#ff5b5b' };
const SOLVE_REWARD = { credits: 15, xp: 30 };   // what /challenges/:id/attempt pays for a correct answer
const MIN_COST = 10, MAX_COST = 100;            // the backend's publishing price limits
const EVENT_META = {
  challenge_solved:    { icon: '✅', label: 'solved a challenge' },
  challenge_published: { icon: '📢', label: 'published a challenge' },
  level_up:            { icon: '🚀', label: 'leveled up' },
  arena_win:           { icon: '⚔️', label: 'won an arena battle' },
  challenge_attempted: { icon: '🎯', label: 'attempted a challenge' },
  problem_solved:      { icon: '💻', label: 'solved a coding problem' },
  default:             { icon: '📌', label: 'did something' },
};

// The Lab and the Hub store topics/difficulties differently ("DP" vs "DynamicProgramming", "Medium" vs "medium").
// Everything is compared through these keys so both kinds of challenges show up under the same filter.
const topicKey = (t) => { const k = String(t || '').replace(/\s+/g, '').toLowerCase(); return k === 'dp' ? 'dynamicprogramming' : k; };
const TOPIC_LABELS = { dynamicprogramming: 'Dynamic Programming', linkedlist: 'Linked List', hashtable: 'Hash Table', binarysearch: 'Binary Search' };
const topicLabel = (t) => TOPIC_LABELS[topicKey(t)] || t;
const diffKey = (d) => String(d || '').toLowerCase();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Platform-made practice puzzles for when the community has nothing yet (no credits, answers checked locally)
const STARTERS = [
  { id: 's1', topic: 'Array', difficulty: 'easy', question: 'What is the time complexity of reading `arr[i]` from an array?', options: ['`O(1)`', '`O(log n)`', '`O(n)`', '`O(n log n)`'], answer: 0, why: 'Arrays are contiguous in memory, so any index is a direct address calculation.' },
  { id: 's2', topic: 'LinkedList', difficulty: 'easy', question: 'Which technique detects a cycle in a singly linked list using O(1) extra space?', options: ['A hash set of visited nodes', 'Fast and slow pointers (Floyd)', 'Reversing the list', 'Sorting the nodes'], answer: 1, why: 'If there is a cycle, a pointer moving two steps eventually meets one moving one step. A hash set also works but uses O(n) space.' },
  { id: 's3', topic: 'Stack', difficulty: 'easy', question: 'Which structure is the natural fit for checking whether brackets like `([]{})` are balanced?', options: ['Queue', 'Min-heap', 'Stack', 'Hash map'], answer: 2, why: 'Each closing bracket must match the most recent unmatched opening one: last in, first out.' },
  { id: 's4', topic: 'Queue', difficulty: 'medium', question: 'Breadth-first search uses which structure to decide the next node to visit?', options: ['Stack', 'Queue', 'Priority queue', 'Hash set'], answer: 1, why: 'A FIFO queue visits nodes level by level. Swap it for a stack and you get a depth-first order instead.' },
  { id: 's5', topic: 'Tree', difficulty: 'medium', question: 'Which traversal of a binary search tree visits its keys in sorted order?', options: ['Preorder', 'Postorder', 'Level order', 'Inorder'], answer: 3, why: 'Inorder visits left subtree, node, then right subtree, which matches the BST ordering.' },
  { id: 's6', topic: 'Graph', difficulty: 'medium', question: "Dijkstra's algorithm can return wrong shortest paths when the graph has…", options: ['Negative edge weights', 'Cycles', 'Undirected edges', 'More than 1000 nodes'], answer: 0, why: 'Dijkstra finalizes a node the moment it is popped. A later negative edge could make that distance shorter. Use Bellman-Ford instead.' },
  { id: 's7', topic: 'DP', difficulty: 'hard', question: 'The classic DP for the longest common subsequence of strings of length m and n runs in…', options: ['`O(m + n)`', '`O(m · n)`', '`O(2^(m+n))`', '`O(m log n)`'], answer: 1, why: 'It fills an (m+1) × (n+1) table, doing constant work per cell.' },
  { id: 's8', topic: 'Stack', difficulty: 'hard', question: 'A monotonic stack finds the next greater element for every index of an array in…', options: ['`O(n^2)`', '`O(n log n)`', '`O(n)`', '`O(log n)`'], answer: 2, why: 'Each index is pushed once and popped at most once, so the total work is linear.' },
].map((s) => ({ ...s, starter: true }));

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${Math.max(0, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function Rich({ text }) {
  return <>{String(text || '').split(/(`[^`]+`)/g).map((p, i) => (p.startsWith('`') && p.endsWith('`') && p.length > 2 ? <code key={i}>{p.slice(1, -1)}</code> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}
const Tag = ({ color, children }) => <span className="tagc" style={{ color }}>{children}</span>;

// ─── Answer block: starters are checked locally, community challenges through the real attempt route ───
function PlayBlock({ item, userId, onAttempt, onRate, onResult, autoFocus }) {
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null);   // { ok, correctIdx, why }
  const [busy, setBusy] = useState(false);
  const [hover, setHover] = useState(0);
  const firstRef = useRef(null);
  useEffect(() => { if (autoFocus && firstRef.current) firstRef.current.focus(); }, [autoFocus]);
  const own = !item.starter && item.createdBy === userId;
  const already = !item.starter && item.alreadyAttempted && !result;

  async function choose(i) {
    if (busy || result) return;
    setPicked(i);
    if (item.starter) {
      const ok = i === item.answer; const r = { ok, correctIdx: item.answer, why: item.why };
      setResult(r); onResult && onResult(ok); return;
    }
    setBusy(true);
    const res = await onAttempt(item, item.options[i]);
    setBusy(false);
    if (!res) { setPicked(null); return; }
    const correctIdx = res.isCorrect ? i : null; // wrong answers stay secret, as the backend intends
    setResult({ ok: res.isCorrect, correctIdx, why: res.isCorrect ? res.explanation : 'The answer stays hidden so others can still try. You can rate the challenge below.' });
    onResult && onResult(res.isCorrect);
  }

  if (own) return <p className="mine">This is your challenge. Others earn +{SOLVE_REWARD.credits} credits for solving it, and you earn 5 credits each time they do.</p>;
  return (
    <>
      {already
        ? <p className="mine">✔ You already attempted this challenge.</p>
        : <div className="play" role="group" aria-label="Answer options">
            {item.options.map((o, i) => (
              <button key={i} ref={i === 0 ? firstRef : undefined} className={`ans${result && result.correctIdx === i ? ' right' : ''}${result && !result.ok && picked === i ? ' wrong' : ''}`}
                disabled={!!result || busy} onClick={() => choose(i)}><b>{'ABCD'[i]}.</b><Rich text={o} /></button>
            ))}
          </div>}
      <div className="verdict" aria-live="polite">
        {busy && 'Checking…'}
        {result && <><b className={result.ok ? 'ok' : 'no'}>{result.ok ? 'Correct!' : 'Not quite.'}</b>{' '}
          {result.ok && !item.starter && <span className="reward">+{SOLVE_REWARD.credits} credits, +{SOLVE_REWARD.xp} XP. </span>}{result.why}</>}
      </div>
      {!item.starter && (item.alreadyAttempted || result) && !item.alreadyRated && onRate && (
        <div className="stars" onMouseLeave={() => setHover(0)}>Rate it:
          {[1, 2, 3, 4, 5].map((s) => <button key={s} className={s <= hover ? 'on' : ''} aria-label={`Rate ${s} of 5`} onMouseEnter={() => setHover(s)} onFocus={() => setHover(s)} onClick={() => onRate(item.id, s)}>★</button>)}
        </div>
      )}
      {!item.starter && item.alreadyRated && <p className="mine">⭐ You rated this challenge.</p>}
    </>
  );
}

// ─── Live feed (unchanged Firestore listener, new look) ───────────────────────
function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newIds, setNewIds] = useState(new Set());
  useEffect(() => {
    let alive = true, first = true, clearT = null;
    const q = query(collection(db, 'activityFeed'), orderBy('createdAt', 'desc'), limit(30));
    const unsub = onSnapshot(q, (snap) => {
      if (!first) {
        const fresh = new Set(snap.docChanges().filter((c) => c.type === 'added').map((c) => c.doc.id));
        if (fresh.size) { setNewIds(fresh); clearTimeout(clearT); clearT = setTimeout(() => setNewIds(new Set()), 3000); }
      }
      first = false;
      if (alive) { setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); }
    }, () => { if (alive) setLoading(false); });
    return () => { alive = false; clearTimeout(clearT); unsub(); };
  }, []);
  if (loading) return <div className="placeholder">Loading activity…</div>;
  if (!events.length) return <div className="placeholder">No community activity yet. Be the first! 🌱</div>;
  return (
    <ul className="feed" aria-live="polite">
      {events.map((ev) => {
        const m = EVENT_META[ev.type] || EVENT_META.default;
        return (
          <li key={ev.id} className={newIds.has(ev.id) ? 'fresh' : ''}>
            <span className="ico">{ev.photoURL ? <img src={ev.photoURL} alt="" /> : m.icon}</span>
            <span><b>{ev.name || 'Someone'}</b> {m.label}{ev.message ? <span style={{ color: 'var(--muted)' }}> · {ev.message}</span> : null}
              <small>{m.icon} {timeAgo(ev.createdAt)}{newIds.has(ev.id) && <span className="live">● LIVE</span>}</small></span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
export default function Hub({ user, userData, setUserData }) {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [communityProblems, setCommunityProblems] = useState([]);
  const [probLoading, setProbLoading] = useState(true);
  const [creators, setCreators] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('mcq');
  const [sort, setSort] = useState('newest');
  const [topicF, setTopicF] = useState('all');
  const [diffF, setDiffF] = useState('all');
  const [mcqSearch, setMcqSearch] = useState('');
  const [probSearch, setProbSearch] = useState('');
  const [probTopic, setProbTopic] = useState('');
  const [probDiff, setProbDiff] = useState('');
  const [openId, setOpenId] = useState(null);
  const [solvedStarters, setSolvedStarters] = useState(() => new Set());
  const uid = user?.uid;

  const toastT = useRef(null);
  const showToast = useCallback((msg, type = 'success') => { setToast({ msg, type }); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 3200); }, []);
  useEffect(() => () => clearTimeout(toastT.current), []);

  // ── Data ──
  const fetchChallenges = useCallback(async () => {
    setChallengeLoading(true); setError('');
    try {
      const backendSort = (SORTS.find((s) => s[0] === sort) || SORTS[0])[2];
      const res = await axios.get(`${API_BASE}/challenges`, { params: { sort: backendSort } });   // topic/level are filtered here, see topicKey
      setChallenges((res.data.challenges || []).map((ch) => ({ ...ch, alreadyAttempted: ch.attemptedBy?.includes(uid), alreadyRated: ch.ratedBy?.includes(uid) })));
    } catch (e) { setError('Failed to load challenges.'); }
    finally { setChallengeLoading(false); }
  }, [sort, uid]);
  useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

  useEffect(() => {
    axios.get(`${API_BASE}/leaderboard/creators`).then((res) => setCreators((res.data.leaderboard || []).slice(0, 5))).catch(() => setCreators([]));
  }, []);

  const fetchCommunityProblems = useCallback(async () => {
    setProbLoading(true);
    try {
      const params = { limit: 100 };
      if (probDiff) params.difficulty = probDiff;
      if (probTopic) params.tag = probTopic;
      if (probSearch) params.search = probSearch;
      const res = await axios.get(`${API_BASE}/problems`, { params });
      setCommunityProblems((res.data.problems || []).filter((p) => !p.district && !p.chapter && p.createdBy));
    } catch (err) { console.error('fetchCommunityProblems error:', err); }
    finally { setProbLoading(false); }
  }, [probDiff, probTopic, probSearch]);
  useEffect(() => { if (activeTab === 'community-problems') fetchCommunityProblems(); }, [activeTab, fetchCommunityProblems]);

  // ── Attempt / rate (real routes) ──
  const handleAttempt = async (challenge, answer) => {
    if (!uid) return null;
    try {
      const res = await axios.post(`${API_BASE}/challenges/${challenge.id}/attempt`, { userId: uid, answer });
      const { isCorrect, attempterReward, explanation } = res.data;
      if (isCorrect && attempterReward && setUserData) setUserData((prev) => ({ ...prev, credits: attempterReward.newCredits, xp: attempterReward.newXp, level: attempterReward.newLevel }));
      setChallenges((list) => list.map((c) => (c.id === challenge.id ? { ...c, alreadyAttempted: true, attempts: (c.attempts || 0) + 1, passes: (c.passes || 0) + (isCorrect ? 1 : 0) } : c)));
      return { isCorrect, explanation: explanation || '' };
    } catch (err) { showToast(err.response?.data?.error || 'Attempt failed.', 'error'); return null; }
  };
  const handleRate = async (challengeId, rating) => {
    if (!uid) return;
    try {
      const res = await axios.post(`${API_BASE}/challenges/${challengeId}/rate`, { userId: uid, rating });
      setChallenges((list) => list.map((c) => (c.id === challengeId ? { ...c, alreadyRated: true, rating: res.data.newRating, ratingCount: res.data.ratingCount } : c)));
      showToast(`⭐ Rated ${rating}/5`);
    } catch (err) { showToast(err.response?.data?.error || 'Rating failed.', 'error'); }
  };

  // ── Explore data ──
  const community = challenges.length > 0;
  const pool = community ? challenges : STARTERS;
  const visible = useMemo(() => pool.filter((p) =>
    (topicF === 'all' || topicKey(p.topic) === topicF) && (diffF === 'all' || diffKey(p.difficulty) === diffF) &&
    (!mcqSearch.trim() || String(p.question).toLowerCase().includes(mcqSearch.trim().toLowerCase()))), [pool, topicF, diffF, mcqSearch]);
  const trend = useMemo(() => {
    const counts = {}; pool.forEach((p) => { const k = topicKey(p.topic); counts[k] = counts[k] || { n: 0, label: topicLabel(p.topic) }; counts[k].n++; });
    return Object.entries(counts).sort((a, b) => b[1].n - a[1].n).slice(0, 6);
  }, [pool]);
  const topicChips = useMemo(() => {
    const seen = new Map(); [...TOPICS, ...pool.map((p) => p.topic)].forEach((t) => { const k = topicKey(t); if (!seen.has(k)) seen.set(k, topicLabel(t)); });
    return [...seen.entries()];
  }, [pool]);
  const daily = useMemo(() => {
    const day = Math.floor(Date.now() / 864e5);
    if (community) { const fresh = challenges.filter((c) => !c.alreadyAttempted && c.createdBy !== uid); const list = fresh.length ? fresh : challenges; return list[day % list.length]; }
    return STARTERS[day % STARTERS.length];
  }, [community, challenges, uid]);

  // ── 3D cube in the Challenge of the Day ──
  const cubeHost = useRef(null), cubeRef = useRef(null);
  const showExplore = activeTab === 'mcq' && !challengeLoading;
  useEffect(() => {
    if (!showExplore) return undefined;
    let dead = false;
    import('./HubScene').then((m) => { if (!dead && cubeHost.current) cubeRef.current = m.mountCube(cubeHost.current); }).catch(() => {});
    return () => { dead = true; if (cubeRef.current) cubeRef.current.destroy(); cubeRef.current = null; };
  }, [showExplore]);
  const onDailyResult = (ok) => { if (cubeRef.current) cubeRef.current.burst(ok); if (daily?.starter && ok) setSolvedStarters((s) => new Set(s).add(daily.id)); };

  // ── Play pop-up ──
  const opened = openId ? pool.find((p) => p.id === openId) : null;
  const lastFocus = useRef(null);
  const openPlay = (id) => { lastFocus.current = document.activeElement; setOpenId(id); };
  const closePlay = useCallback(() => { setOpenId(null); setTimeout(() => { if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus(); }, 0); }, []);
  useEffect(() => {
    if (!openId) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closePlay(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [openId, closePlay]);

  // ── Create tab state ──
  const [form, setForm] = useState({ question: '', options: ['', '', '', ''], correctIdx: null, topic: 'Array', difficulty: 'Easy', creditCost: MIN_COST, explanation: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [snapIdx, setSnapIdx] = useState(null);
  const credits = userData?.credits ?? 0;
  const cost = Math.min(MAX_COST, Math.max(MIN_COST, Math.round(Number(form.creditCost) || MIN_COST)));
  const formError = form.question.trim().length < 10 ? 'Write a question (at least 10 characters)'
    : form.options.some((o) => !o.trim()) ? 'Fill in all four options'
    : new Set(form.options.map((o) => o.trim().toLowerCase())).size < 4 ? 'Two options are the same'
    : form.correctIdx == null ? 'Click a letter to mark the correct answer'
    : credits < cost ? `You need ${cost} credits, you have ${credits}` : null;
  const markCorrect = (i) => { setForm((f) => ({ ...f, correctIdx: i })); setSnapIdx(i); };
  const handlePublish = async () => {
    if (formError || !uid) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API_BASE}/challenges/publish`, {
        userId: uid, creatorName: user.displayName || 'Anonymous',
        question: form.question.trim(), options: form.options.map((o) => o.trim()), correctAnswer: form.options[form.correctIdx].trim(),
        explanation: form.explanation.trim(), topic: form.topic, difficulty: form.difficulty, creditCost: cost,
      });
      if (setUserData) setUserData((prev) => ({ ...prev, credits: res.data.newCredits != null ? res.data.newCredits : Math.max(0, (prev?.credits || 0) - cost), challengesCreated: (prev?.challengesCreated || 0) + 1 }));
      showToast('🎉 Challenge published!');
      setForm({ question: '', options: ['', '', '', ''], correctIdx: null, topic: 'Array', difficulty: 'Easy', creditCost: MIN_COST, explanation: '' });
      setActiveTab('mcq'); fetchChallenges();
    } catch (err) { showToast(err.response?.data?.error || 'Publish failed.', 'error'); }
    setSubmitting(false);
  };

  // live card tilt
  const cardRef = useRef(null);
  const tilt = (e) => { if (reduceMotion() || !cardRef.current) return; const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; cardRef.current.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`; };
  const untilt = () => { if (cardRef.current) cardRef.current.style.transform = ''; };

  // tabs keyboard
  const TABS = [['mcq', 'MCQ Challenges'], ['community-problems', 'Community Problems'], ['create', 'Create'], ['feed', 'Live Feed']];
  const tabRefs = useRef({});
  const onTabKey = (e) => { const i = TABS.findIndex((t) => t[0] === activeTab), n = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i + TABS.length - 1) % TABS.length }[e.key]; if (n == null) return; e.preventDefault(); setActiveTab(TABS[n][0]); const el = tabRefs.current[TABS[n][0]]; if (el) el.focus(); };
  const handle = ((user?.displayName || 'dev').split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';
  const level = userData?.level ?? 1;

  return (
    <div className="hb">
      <div className="crt" aria-hidden="true" />
      <div className="page">
        <div className="top">
          <button className="btn" onClick={() => navigate('/world')}>&larr; World</button>
          <div className="path"><b>{handle}</b>@<i>evoworld</i>:~/hub$</div>
          <span className="pill"><b>{credits}</b> credits</span><span className="pill">Lv.{level} {LEVEL_NAMES[level] || 'Legend'}</span>
          <button className="btn" onClick={() => navigate('/game')}>Go to Odyssey &rarr;</button>
        </div>
        <span className="kicker"><i />COMMUNITY HUB</span>
        <h1 className="title">Puzzles made by <span>players</span></h1>
        <p className="lede">MCQ challenges and community-created coding problems. For FAANG problems, see the <a href="/game" onClick={(e) => { e.preventDefault(); navigate('/game'); }}>Engineer's Odyssey</a>.</p>

        <div className="tabs" role="tablist" aria-label="Hub sections" onKeyDown={onTabKey}>
          {TABS.map(([k, label]) => <button key={k} ref={(el) => { tabRefs.current[k] = el; }} id={`hb-tab-${k}`} className="tab" role="tab" aria-selected={activeTab === k} tabIndex={activeTab === k ? 0 : -1} onClick={() => setActiveTab(k)}>{label}</button>)}
        </div>

        <main className="panel" role="tabpanel" aria-labelledby={`hb-tab-${activeTab}`}>
          {/* ── MCQ explore ── */}
          {activeTab === 'mcq' && (challengeLoading
            ? <div className="bento">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ gridColumn: 'span 4' }} />)}</div>
            : error ? <div className="card placeholder" style={{ color: '#ff8a8a' }}>{error} <button className="btn" onClick={fetchChallenges}>Retry</button></div>
            : (
            <div className="bento">
              {daily && (
                <section className="card b cotd" aria-labelledby="hb-cotd">
                  <div>
                    <span className="kicker"><i />CHALLENGE OF THE DAY</span>
                    <h3 id="hb-cotd"><Rich text={daily.question} /></h3>
                    <div className="meta"><Tag color={DC[diffKey(daily.difficulty)]}>{diffKey(daily.difficulty).toUpperCase()}</Tag><Tag color="#c99bff">{topicLabel(daily.topic).toUpperCase()}</Tag>
                      {daily.starter ? <Tag color="#35e0ff">STARTER · BY EVOWORLD</Tag> : <Tag color="#f4b740">+{SOLVE_REWARD.credits} CR · BY {String(daily.creatorName || 'ANONYMOUS').toUpperCase()}</Tag>}</div>
                    <PlayBlock key={daily.id} item={daily} userId={uid} onAttempt={handleAttempt} onRate={handleRate} onResult={onDailyResult} />
                  </div>
                  <div className="cube" ref={cubeHost} aria-hidden="true" />
                </section>
              )}
              <div className="side">
                <section className="card b" aria-labelledby="hb-tr"><h2 id="hb-tr">{community ? 'trending tags' : 'starter tags'}</h2>
                  <div className="trend">{trend.map(([k, v]) => <button key={k} onClick={() => setTopicF(k)}>#{v.label.replace(/ /g, '')}<small>{v.n}</small></button>)}</div></section>
                <section className="card b creators" aria-labelledby="hb-cr"><h2 id="hb-cr">top creators</h2>
                  {creators.length
                    ? creators.map((c, i) => <div key={c.uid || i} className="slot"><span className="av" style={{ borderStyle: 'solid' }}>{c.photoURL ? <img src={c.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : `#${i + 1}`}</span>
                        <span>{c.name || 'Anonymous'}<small>{c.challengesCreated} challenge{c.challengesCreated === 1 ? '' : 's'}{c.avgChallengeRating ? ` · ★ ${Number(c.avgChallengeRating).toFixed(1)}` : ''}</small></span><span style={{ color: 'var(--amber)', fontSize: 12 }}>{c.photoURL ? `#${i + 1}` : ''}</span></div>)
                    : <div className="slot"><span className="av">#1</span><span>This spot is open<small>Publish the first challenge and lead the board</small></span><span /></div>}
                  <button className="cta" style={{ width: '100%', marginTop: 10 }} onClick={() => setActiveTab('create')}>Create a challenge</button></section>
              </div>
              <div className="card filters" role="group" aria-label="Filters">
                <input className="search" placeholder="Search questions" aria-label="Search questions" value={mcqSearch} onChange={(e) => setMcqSearch(e.target.value)} />
                <button className="chip" aria-pressed={topicF === 'all'} onClick={() => setTopicF('all')}>All topics</button>
                {topicChips.map(([k, label]) => <button key={k} className="chip" aria-pressed={topicF === k} onClick={() => setTopicF(k)}>{label}</button>)}
                <span className="sep" />
                {['all', 'easy', 'medium', 'hard'].map((d) => <button key={d} className="chip d" style={{ '--c': DC[d] || '#fff' }} aria-pressed={diffF === d} onClick={() => setDiffF(d)}>{d === 'all' ? 'All levels' : cap(d)}</button>)}
                {community && <><span className="sep" />{SORTS.map(([k, label]) => <button key={k} className="chip" aria-pressed={sort === k} onClick={() => setSort(k)}>{label}</button>)}</>}
              </div>
              <div className="gridh"><h2>{community ? 'COMMUNITY CHALLENGES' : 'STARTER PUZZLES'}</h2><span>{community ? `${visible.length} challenge${visible.length === 1 ? '' : 's'}` : 'Made by EvoWorld while the community warms up · practice, no credits'}</span></div>
              <div className="puzzles">
                {visible.length ? visible.map((p) => {
                  const own = !p.starter && p.createdBy === uid;
                  const cls = p.starter ? (solvedStarters.has(p.id) ? ' done' : '') : own ? ' own' : p.alreadyAttempted ? ' attempted' : '';
                  return (
                    <button key={p.id} className={`pz${cls}`} style={{ '--c': DC[diffKey(p.difficulty)] || '#c99bff' }} onClick={() => openPlay(p.id)}>
                      <span className="meta"><Tag color={DC[diffKey(p.difficulty)]}>{diffKey(p.difficulty).toUpperCase()}</Tag><Tag color="#c99bff">{topicLabel(p.topic)}</Tag></span>
                      <span className="q"><Rich text={p.question} /></span>
                      {p.starter ? <span className="by">Starter · by EvoWorld</span>
                        : <span className="stats"><span>by {p.creatorName || 'Anonymous'}</span><span>🎯 {p.attempts ?? 0}</span><span>✅ {p.passes ?? 0}</span><span>⭐ {p.rating ? Number(p.rating).toFixed(1) : '—'}</span>{!own && <span className="reward">+{SOLVE_REWARD.credits} CR</span>}</span>}
                    </button>
                  );
                }) : <div className="empty">No puzzles match these filters.</div>}
              </div>
            </div>
          ))}

          {/* ── Community coding problems ── */}
          {activeTab === 'community-problems' && (
            <div>
              <div className="card filters" style={{ marginBottom: 12 }} role="group" aria-label="Problem filters">
                <input className="search" placeholder="Search community problems" aria-label="Search community problems" value={probSearch} onChange={(e) => setProbSearch(e.target.value)} />
                <select className="community-select" style={{ minHeight: 40, padding: '0 10px' }} value={probTopic} onChange={(e) => setProbTopic(e.target.value)} aria-label="Topic"><option value="">All topics</option>{TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}</select>
                <select className="community-select" style={{ minHeight: 40, padding: '0 10px' }} value={probDiff} onChange={(e) => setProbDiff(e.target.value)} aria-label="Difficulty"><option value="">All difficulties</option>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                <button className="btn" onClick={() => navigate('/game')}>150 FAANG problems &rarr; Odyssey</button>
              </div>
              {probLoading ? <div className="placeholder">Loading problems…</div>
                : communityProblems.length === 0
                  ? <div className="card placeholder">No community coding problems yet. Be the first to create one in the Lab.<br /><button className="cta" style={{ marginTop: 14 }} onClick={() => navigate('/lab')}>Go to the Lab</button></div>
                  : communityProblems.map((p, i) => {
                      const rate = p.totalSubmissions > 0 ? Math.round((p.totalSolves / p.totalSubmissions) * 100) : null;
                      return (
                        <button key={p.id} className="probrow" onClick={() => navigate(`/solve/${p.id}`)}>
                          <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{i + 1}</span>
                          <span><b>{p.title}</b><small>{[...(p.tags || []).slice(0, 3), `by ${p.authorName || 'Community'}`].join(' · ')}</small></span>
                          <span className="stats">{rate !== null && <span>{rate}% acceptance</span>}<span>{p.totalSolves ?? 0} solved</span><Tag color={DC[diffKey(p.difficulty)]}>{p.difficulty}</Tag><span style={{ color: 'var(--cyan)', fontWeight: 800 }}>Solve &rarr;</span></span>
                        </button>
                      );
                    })}
            </div>
          )}

          {/* ── Create: split workspace ── */}
          {activeTab === 'create' && (
            <div className="split">
              <section className="card form" aria-labelledby="hb-ch">
                <h2 id="hb-ch">Create an MCQ challenge</h2>
                <p>Quiz-style questions for the community. For coding problems, use the <a href="/lab" onClick={(e) => { e.preventDefault(); navigate('/lab'); }}>Lab</a>.</p>
                <label className="lab" htmlFor="hb-q">QUESTION <span className="count">{form.question.length} / 300</span></label>
                <textarea id="hb-q" maxLength={300} value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="What is the time complexity of binary search?" />
                <span className="lab" id="hb-olab">OPTIONS · <b>click a letter to mark the correct answer</b></span>
                <div className="opts" role="radiogroup" aria-labelledby="hb-olab"
                  onKeyDown={(e) => { const b = e.target.closest('.bubble'); if (!b) return; const i = +b.dataset.i, n = { ArrowDown: (i + 1) % 4, ArrowRight: (i + 1) % 4, ArrowUp: (i + 3) % 4, ArrowLeft: (i + 3) % 4 }[e.key]; if (n == null) return; e.preventDefault(); markCorrect(n); const nb = e.currentTarget.querySelectorAll('.bubble')[n]; if (nb) nb.focus(); }}>
                  {form.options.map((o, i) => (
                    <div key={i} className="opt">
                      <button className={`bubble${snapIdx === i && !reduceMotion() ? ' snap' : ''}`} role="radio" aria-checked={form.correctIdx === i} aria-label={`Mark option ${'ABCD'[i]} as correct`} data-i={i}
                        tabIndex={form.correctIdx === i || (form.correctIdx == null && i === 0) ? 0 : -1} onClick={() => markCorrect(i)} onAnimationEnd={() => setSnapIdx(null)}>{'ABCD'[i]}</button>
                      <input maxLength={120} value={o} placeholder={`Option ${'ABCD'[i]}`} aria-label={`Option ${'ABCD'[i]}`} onChange={(e) => setForm((f) => ({ ...f, options: f.options.map((x, k) => (k === i ? e.target.value : x)) }))} />
                    </div>
                  ))}
                </div>
                <div className="row3">
                  <div><label className="lab" htmlFor="hb-t">TOPIC</label><select id="hb-t" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}>{TOPICS.map((t) => <option key={t} value={t}>{topicLabel(t)}</option>)}</select></div>
                  <div><label className="lab" htmlFor="hb-d">DIFFICULTY</label><select id="hb-d" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>{DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label className="lab" htmlFor="hb-c">PUBLISH COST</label><input id="hb-c" type="number" min={MIN_COST} max={MAX_COST} value={form.creditCost} onChange={(e) => setForm((f) => ({ ...f, creditCost: e.target.value }))} /></div>
                </div>
                <label className="lab" htmlFor="hb-ex">EXPLANATION <span style={{ fontWeight: 400, letterSpacing: 0 }}>· optional, shown to players who solve it</span></label>
                <textarea id="hb-ex" maxLength={500} style={{ minHeight: 64 }} value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} placeholder="Why the correct answer is right." />
                <div className="cost">Publishing costs {cost} credits ({MIN_COST} to {MAX_COST}). You have {credits}. You earn 5 credits each time someone solves it.</div>
                <button className="publish" disabled={!!formError || submitting} onClick={handlePublish}>{submitting ? 'PUBLISHING…' : 'PUBLISH MCQ CHALLENGE'}</button>
                <div className="why" role="status">{formError ? `To publish: ${formError.charAt(0).toLowerCase()}${formError.slice(1)}` : 'Ready to publish.'}</div>
              </section>
              <section className="card mock" aria-label="Live card mockup">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="kicker"><i />LIVE CARD · AS PLAYERS SEE IT</span>
                  <button className="switch" role="switch" aria-checked={showKey} onClick={() => setShowKey((s) => !s)}><i />Show answer</button>
                </div>
                <div className="stage" onPointerMove={tilt} onPointerLeave={untilt}>
                  <div className="livecard" ref={cardRef}>
                    <span className="meta"><Tag color={DC[diffKey(form.difficulty)]}>{form.difficulty.toUpperCase()}</Tag><Tag color="#c99bff">{topicLabel(form.topic)}</Tag><Tag color="#f4b740">+{SOLVE_REWARD.credits} CR TO SOLVE</Tag></span>
                    <div className={`q${form.question.trim() ? '' : ' ph'}`}>{form.question.trim() ? <Rich text={form.question} /> : 'Your question appears here…'}</div>
                    {form.options.map((o, i) => <div key={i} className={`o${o.trim() ? '' : ' ph'}${showKey && form.correctIdx === i ? ' key' : ''}`}><b>{'ABCD'[i]}.</b>{o.trim() ? <Rich text={o} /> : `Option ${'ABCD'[i]}`}</div>)}
                    <div className="foot"><span>by {user?.displayName || 'you'}</span><span>0 attempts · new</span></div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ── Live feed ── */}
          {activeTab === 'feed' && (
            <section className="card b" aria-labelledby="hb-feed">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><h2 id="hb-feed" style={{ margin: 0 }}>live community feed</h2><span className="livebadge"><i />Real-time</span></div>
              <ActivityFeed />
            </section>
          )}
        </main>
      </div>

      {opened && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) closePlay(); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hb-mq">
            <header><span className="meta"><Tag color={DC[diffKey(opened.difficulty)]}>{diffKey(opened.difficulty).toUpperCase()}</Tag><Tag color="#c99bff">{topicLabel(opened.topic)}</Tag>
              {opened.starter ? <Tag color="#35e0ff">STARTER</Tag> : <Tag color="#f4b740">+{SOLVE_REWARD.credits} CR</Tag>}</span><button className="btn" onClick={closePlay}>Close</button></header>
            <h3 id="hb-mq" style={{ margin: '14px 0 4px', fontSize: 18, lineHeight: 1.45 }}><Rich text={opened.question} /></h3>
            {!opened.starter && <div className="stats" style={{ marginBottom: 6 }}><span>by {opened.creatorName || 'Anonymous'}</span><span>🎯 {opened.attempts ?? 0} attempts</span><span>✅ {opened.passes ?? 0} solved</span><span>⭐ {opened.rating ? Number(opened.rating).toFixed(1) : '—'}/5</span></div>}
            <PlayBlock key={opened.id} item={opened} userId={uid} onAttempt={handleAttempt} onRate={handleRate} autoFocus
              onResult={(ok) => { if (opened.starter && ok) setSolvedStarters((s) => new Set(s).add(opened.id)); }} />
          </div>
        </div>
      )}
      {toast && <div className={`toast${toast.type === 'error' ? ' error' : ''}`} role="status">{toast.msg}</div>}
    </div>
  );
}

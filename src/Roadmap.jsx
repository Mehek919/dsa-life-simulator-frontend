import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ── Learning tracks ────────────────────────────────────────────────────────────
const TRACKS = [
  {
    id:       'arrays',
    title:    'Arrays & Hashing',
    icon:     '📦',
    color:    '#00c896',
    glow:     '#00c89633',
    xpReward: 500,
    desc:     'The foundation of every interview. Master this first.',
    level:    1,
    problems: ['two-sum','valid-anagram','product-of-array-except-self','maximum-subarray','best-time-to-buy-sell-stock'],
    skills:   ['Hash Maps', 'Prefix Sums', 'Two Pointers', 'Sliding Window'],
  },
  {
    id:       'binary-search',
    title:    'Binary Search',
    icon:     '🔍',
    color:    '#1a73e8',
    glow:     '#1a73e833',
    xpReward: 600,
    desc:     'O(log n) thinking. Used in 60% of Google interviews.',
    level:    2,
    requires: 'arrays',
    problems: ['binary-search','search-rotated-sorted-array','find-minimum-rotated','kth-largest-element'],
    skills:   ['Binary Search', 'Modified Binary Search', 'QuickSelect'],
  },
  {
    id:       'linked-lists',
    title:    'Linked Lists',
    icon:     '🔗',
    color:    '#a855f7',
    glow:     '#a855f733',
    xpReward: 600,
    desc:     'Pointer manipulation mastery. Every FAANG asks this.',
    level:    2,
    requires: 'arrays',
    problems: ['reverse-linked-list','linked-list-cycle','merge-k-sorted-lists'],
    skills:   ['Two Pointers', 'Fast & Slow Pointers', 'Reversal'],
  },
  {
    id:       'trees',
    title:    'Trees & BST',
    icon:     '🌲',
    color:    '#10b981',
    glow:     '#10b98133',
    xpReward: 700,
    desc:     'DFS, BFS, and BST operations. The heart of system design.',
    level:    3,
    requires: 'linked-lists',
    problems: ['max-depth-binary-tree','validate-bst','binary-tree-level-order-traversal'],
    skills:   ['DFS', 'BFS', 'BST Operations', 'Tree DP'],
  },
  {
    id:       'graphs',
    title:    'Graphs',
    icon:     '🕸️',
    color:    '#f59e0b',
    glow:     '#f59e0b33',
    xpReward: 800,
    desc:     'Social networks, maps, dependencies. Senior-level mastery.',
    level:    3,
    requires: 'trees',
    problems: ['number-of-islands','course-schedule'],
    skills:   ['DFS/BFS', 'Union Find', 'Topological Sort', 'Dijkstra'],
  },
  {
    id:       'dynamic-programming',
    title:    'Dynamic Programming',
    icon:     '💎',
    color:    '#ff4d4d',
    glow:     '#ff4d4d33',
    xpReward: 1000,
    desc:     'The final boss. Master DP and you can crack any interview.',
    level:    4,
    requires: 'graphs',
    problems: ['climbing-stairs','coin-change','longest-common-subsequence'],
    skills:   ['Memoization', '1D DP', '2D DP', 'Knapsack', 'Interval DP'],
  },
  {
    id:       'heaps',
    title:    'Heaps & Priority Queues',
    icon:     '⛰️',
    color:    '#06b6d4',
    glow:     '#06b6d433',
    xpReward: 700,
    desc:     'Real-time top-k problems. Used in every streaming system.',
    level:    3,
    requires: 'trees',
    problems: ['kth-largest-element','merge-k-sorted-lists'],
    skills:   ['Min-Heap', 'Max-Heap', 'Top-K Pattern'],
  },
  {
    id:       'backtracking',
    title:    'Backtracking',
    icon:     '🌀',
    color:    '#8b5cf6',
    glow:     '#8b5cf633',
    xpReward: 900,
    desc:     'Combinatorics, permutations, N-Queens. The elegance of recursion.',
    level:    4,
    requires: 'dynamic-programming',
    problems: ['n-queens','word-search-ii','palindrome-partitioning'],
    skills:   ['Backtrack Template', 'Pruning', 'State Space Search'],
  },
];

// ── Progress Ring ──────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 44 }) {
  const r    = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={4} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
        fill={color} fontSize={10} fontWeight={900} fontFamily="Arial"
      >{pct}%</text>
    </svg>
  );
}

// ── Track Card ────────────────────────────────────────────────────────────────
function TrackCard({ track, progress, isLocked, onStart, idx }) {
  const [hovered, setHovered] = useState(false);
  const pct     = progress?.pct     || 0;
  const solved  = progress?.solved  || 0;
  const total   = track.problems.length;
  const isComplete = solved >= total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !isLocked && onStart(track)}
      style={{
        position:     'relative',
        background:   isLocked ? '#0a0a14' : hovered ? `linear-gradient(135deg, #0d1117, ${track.color}11)` : '#0d1117',
        border:       `1px solid ${isLocked ? '#1e2a3a' : isComplete ? track.color + '88' : hovered ? track.color + '66' : track.color + '33'}`,
        borderRadius: 18,
        padding:      '20px',
        cursor:       isLocked ? 'not-allowed' : 'pointer',
        opacity:      isLocked ? 0.5 : 1,
        transition:   'all 0.3s',
        overflow:     'hidden',
        boxShadow:    hovered && !isLocked ? `0 0 30px ${track.glow}` : 'none',
      }}
    >
      {/* Top glow line */}
      {!isLocked && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${track.color}, transparent)`, opacity: hovered ? 1 : 0.4 }} />
      )}

      {/* Complete badge */}
      {isComplete && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: track.color + '22', border: `1px solid ${track.color}44`, borderRadius: 20, padding: '3px 10px', color: track.color, fontSize: 10, fontWeight: 700 }}>
          ✓ Complete
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <motion.div
          animate={hovered && !isLocked ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: isLocked ? '#1e2a3a' : `linear-gradient(135deg, ${track.color}33, ${track.color}11)`,
            border: `1px solid ${isLocked ? '#333' : track.color + '44'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
            boxShadow: !isLocked && hovered ? `0 0 16px ${track.glow}` : 'none',
          }}
        >
          {isLocked ? '🔒' : track.icon}
        </motion.div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              background: isLocked ? '#1e2a3a' : track.color + '22',
              border:     `1px solid ${isLocked ? '#333' : track.color + '33'}`,
              borderRadius: 20, padding: '1px 8px',
              color: isLocked ? '#444' : track.color, fontSize: 9, fontWeight: 700,
            }}>
              Level {track.level}
            </span>
            <span style={{ color: '#f5c542', fontSize: 10, fontWeight: 600 }}>+{track.xpReward} XP</span>
          </div>
          <h3 style={{ margin: 0, color: isLocked ? '#333' : '#e8e8e8', fontSize: 15, fontWeight: 800 }}>
            {track.title}
          </h3>
        </div>
        {!isLocked && <ProgressRing pct={pct} color={track.color} size={44} />}
      </div>

      {/* Description */}
      <p style={{ margin: '0 0 14px', color: isLocked ? '#333' : '#666', fontSize: 12, lineHeight: 1.6 }}>
        {track.desc}
      </p>

      {/* Progress bar */}
      {!isLocked && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: '#555', fontSize: 10 }}>{solved}/{total} problems</span>
            <span style={{ color: track.color, fontSize: 10, fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ width: '100%', height: 5, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ height: '100%', background: track.color, borderRadius: 3 }}
            />
          </div>
        </div>
      )}

      {/* Skills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {track.skills.map(skill => (
          <span key={skill} style={{
            background:   '#1e2a3a',
            borderRadius: 20, padding: '2px 8px',
            color:        isLocked ? '#333' : '#666', fontSize: 10,
          }}>
            {skill}
          </span>
        ))}
      </div>

      {/* Locked reason */}
      {isLocked && track.requires && (
        <div style={{ marginTop: 12, color: '#444', fontSize: 11 }}>
          🔒 Complete "{TRACKS.find(t => t.id === track.requires)?.title}" first
        </div>
      )}
    </motion.div>
  );
}

// ── Track Detail Modal ────────────────────────────────────────────────────────
function TrackDetail({ track, userProgress, onClose, onSolveProblem }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{ background: '#0d1117', border: `1px solid ${track.color}44`, borderRadius: 20, padding: '28px', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${track.color}, transparent)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 36 }}>{track.icon}</span>
            <div>
              <h2 style={{ margin: 0, color: '#e8e8e8', fontSize: 20, fontWeight: 900 }}>{track.title}</h2>
              <span style={{ color: track.color, fontSize: 12 }}>+{track.xpReward} XP on completion</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>✕</button>
        </div>

        <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{track.desc}</p>

        {/* Skills learned */}
        <div style={{ background: track.color + '11', border: `1px solid ${track.color}22`, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ color: track.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Skills You'll Master</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {track.skills.map(s => (
              <span key={s} style={{ background: track.color + '22', border: `1px solid ${track.color}33`, borderRadius: 20, padding: '3px 10px', color: track.color, fontSize: 11, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Problem list */}
        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Problems ({track.problems.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {track.problems.map((slug, i) => {
            // solvedProblems is a map not array — check by key
            const solvedMap = userProgress?.solvedProblems || {};
            const isSolved  = !!(solvedMap[slug]);
            return (
              <div
                key={slug}
                onClick={() => { navigate(`/solve/${id}`); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSolved ? '#00c89608' : '#060910',
                  border: `1px solid ${isSolved ? '#00c89633' : '#1e2a3a'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: isSolved ? '#00c89622' : '#1e2a3a',
                  border: `1px solid ${isSolved ? '#00c89644' : '#333'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isSolved ? '#00c896' : '#555', fontSize: 11, fontWeight: 700,
                }}>
                  {isSolved ? '✓' : i + 1}
                </div>
                <span style={{ color: isSolved ? '#888' : '#c8c8c8', fontSize: 13, flex: 1 }}>
                  {slug.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                </span>
                <span style={{ color: '#1a73e8', fontSize: 11 }}>Solve →</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Certificate Card ──────────────────────────────────────────────────────────
function CertificateCard({ cert, earned }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background:   earned ? `linear-gradient(135deg, #0d1117, ${cert.color}11)` : '#0a0a14',
        border:       `1px solid ${earned ? cert.color + '44' : '#1e2a3a'}`,
        borderRadius: 14,
        padding:      '16px',
        textAlign:    'center',
        opacity:      earned ? 1 : 0.4,
        position:     'relative',
        overflow:     'hidden',
        boxShadow:    earned ? `0 0 20px ${cert.color}22` : 'none',
      }}
    >
      {earned && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${cert.color}, transparent)` }} />
      )}
      <div style={{ fontSize: 32, marginBottom: 8, filter: earned ? 'none' : 'grayscale(1)' }}>{cert.badge}</div>
      <div style={{ color: earned ? cert.color : '#444', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{cert.title}</div>
      <div style={{ color: '#555', fontSize: 10, lineHeight: 1.5 }}>{cert.desc}</div>
      {earned && (
        <div style={{ marginTop: 10, background: cert.color + '22', border: `1px solid ${cert.color}44`, borderRadius: 20, padding: '2px 10px', color: cert.color, fontSize: 9, fontWeight: 700, display: 'inline-block' }}>
          ✓ EARNED
        </div>
      )}
    </motion.div>
  );
}

// ── Main Roadmap ──────────────────────────────────────────────────────────────
export default function Roadmap({ user, userData }) {
  const navigate = useNavigate();
  const [tab,          setTab]          = useState('tracks');    // tracks | certificates | bookmarks
  const [selected,     setSelected]     = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [allCerts,     setAllCerts]     = useState({});
  const [bookmarks,    setBookmarks]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    // Fetch independently — if one route doesn't exist yet, don't crash the whole page
    Promise.allSettled([
      axios.get(`${API_BASE}/certificates/${user.uid}`).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/bookmarks/${user.uid}`).catch(() => ({ data: {} })),
    ]).then(([certRes, bookRes]) => {
      const certData = certRes.value?.data || certRes.data || {};
      const bookData = bookRes.value?.data || bookRes.data || {};
      setCertificates(certData.certificates || []);
      setAllCerts(certData.all || {});
      setBookmarks(bookData.bookmarks || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user?.uid]);

  // Calculate track progress
  const getTrackProgress = (track) => {
    // solvedProblems is a map { [problemSlug]: { stars, xpAwarded... } } — use Object.keys
    const solvedMap = userData?.solvedProblems || {};
    const solved    = track.problems.filter(slug => solvedMap[slug]?.stars >= 0 || solvedMap[slug]).length;
    const pct    = Math.round((solved / track.problems.length) * 100);
    return { solved, pct };
  };

  // Check if track is unlocked
  const isUnlocked = (track) => {
    if (!track.requires) return true;
    const reqTrack    = TRACKS.find(t => t.id === track.requires);
    if (!reqTrack)    return true;
    const reqProgress = getTrackProgress(reqTrack);
    return reqProgress.solved >= reqTrack.problems.length;
  };

  const earnedIds = new Set(certificates.map(c => c.certId));

  const TABS = [
    { key: 'tracks',       label: '🗺️ Learning Paths' },
    { key: 'certificates', label: '🏆 Certificates'   },
    { key: 'bookmarks',    label: '🔖 Bookmarks'       },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        {[{ c:'#00c896',l:'5%',t:'20%',s:300 },{ c:'#1a73e8',l:'85%',t:'60%',s:250 },{ c:'#f59e0b',l:'50%',t:'80%',s:200 }].map((o,i) => (
          <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.s, height:o.s, background:o.c, left:o.l, top:o.t, transform:'translate(-50%,-50%)', filter:'blur(100px)', opacity:0.05 }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '28px 24px 80px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
          <button onClick={() => navigate('/world')} style={{ background: 'transparent', border: '1px solid #1e2a3a', borderRadius: 8, color: '#555', cursor: 'pointer', fontSize: 12, padding: '6px 14px', marginBottom: 16 }}>← World</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 40 }}>🗺️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Learning Roadmap</h1>
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
                Master DSA in the right order. Each track builds on the last.
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#555', fontSize: 11 }}>Overall Progress</span>
                <span style={{ color: '#1a73e8', fontSize: 11, fontWeight: 700 }}>
                  {userData?.problemsSolved || 0}/145 problems
                </span>
              </div>
              <div style={{ width: '100%', height: 6, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${((userData?.problemsSolved || 0) / 145) * 100}%` }} transition={{ duration: 1.2 }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #00c896, #1a73e8, #f59e0b)', borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'XP',    value: userData?.xp || 0,           color: '#a855f7' },
                { label: 'Certs', value: certificates.length,         color: '#f5c542' },
                { label: 'Saved', value: bookmarks.length,            color: '#1a73e8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: s.color, fontSize: 16, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: 9 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background:   tab === t.key ? '#1a73e822' : 'transparent',
              border:       `1px solid ${tab === t.key ? '#1a73e844' : '#1e2a3a'}`,
              borderRadius: 20, color: tab === t.key ? '#1a73e8' : '#555',
              cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              padding: '6px 16px', transition: 'all 0.2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Learning Tracks */}
        {tab === 'tracks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {TRACKS.map((track, idx) => (
              <TrackCard
                key={track.id}
                track={track}
                progress={getTrackProgress(track)}
                isLocked={!isUnlocked(track)}
                onStart={setSelected}
                idx={idx}
              />
            ))}
          </div>
        )}

        {/* Certificates */}
        {tab === 'certificates' && (
          <div>
            <div style={{ background: '#f5c54211', border: '1px solid #f5c54233', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>🏆</span>
              <div>
                <div style={{ color: '#f5c542', fontWeight: 700, fontSize: 13 }}>
                  {certificates.length} / {Object.keys(allCerts).length} Certificates Earned
                </div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                  Each certificate awards +500 XP and +100 Credits. Share on LinkedIn to attract recruiters.
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(allCerts).map(([certId, cert]) => (
                <CertificateCard key={certId} cert={cert} earned={earnedIds.has(certId)} />
              ))}
            </div>
          </div>
        )}

        {/* Bookmarks */}
        {tab === 'bookmarks' && (
          <div>
            {bookmarks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#333' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔖</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 6 }}>No bookmarks yet</div>
                <div style={{ fontSize: 13 }}>Bookmark problems to save them for later practice.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookmarks.map((b, i) => {
                  const diffColor = { Easy: '#00c896', Medium: '#f5c542', Hard: '#ff4d4d' }[b.difficulty] || '#888';
                  return (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/solve/${b.problemId}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <span style={{ fontSize: 18 }}>🔖</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600 }}>{b.problemTitle || b.problemId}</div>
                        <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>Bookmarked {b.createdAt ? new Date(b.createdAt._seconds * 1000).toLocaleDateString() : ''}</div>
                      </div>
                      <span style={{ color: diffColor, fontSize: 11, fontWeight: 700, background: diffColor + '22', border: `1px solid ${diffColor}44`, borderRadius: 20, padding: '2px 10px' }}>{b.difficulty}</span>
                      <span style={{ color: '#1a73e8', fontSize: 12 }}>Solve →</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Track detail modal */}
      <AnimatePresence>
        {selected && (
          <TrackDetail track={selected} userProgress={userData} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
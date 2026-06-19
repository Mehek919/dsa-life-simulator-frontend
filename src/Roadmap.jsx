import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';
const p = (slug, title, coming = false) => ({
  id: slug,
  title,
  comingSoon: coming,
});

const TRACKS = [
  {
    id: 'arrays',
    title: 'Arrays & Hashing',
    icon: '📦',
    color: '#00c896',
    glow: '#00c89633',
    xpReward: 500,
    desc: 'Cloud telemetry, deduplication, hash maps, prefix scans.',
    level: 1,
    problems: [
      p('ms-two-sum',              'Two Sum'),
      p('ms-contains-duplicate',   'Contains Duplicate'),
      p('ms-missing-number',       'Missing Number'),
      p('ms-product-except-self',  'Product of Array Except Self'),
      p('ms-maximum-subarray',     "Maximum Subarray — Kadane's"),
      p('ms-subarray-sum-k',       'Subarray Sum Equals K'),
      p('sf-subarray-sum',         'Chatter Feed Engagement Analyzer'),
      p('ms-find-anagrams',        'Find All Anagrams in String'),
      p('ora-merge-sorted-array',  'Merge Sorted Array'),
      p('ora-rotate-array',        'Rotate Array'),
      p('sf-best-time-stock',      'Best Time to Buy and Sell Stock'),
      p('ms-meeting-rooms',        'Meeting Rooms'),
      p('ms-meeting-rooms-ii',     'Meeting Rooms II — Min Rooms'),
      p('adobe-merge-intervals',   'Merge Intervals'),
      p('adobe-non-overlapping-intervals', 'Non-Overlapping Intervals'),
    ],
    skills: ['Hash Maps', 'Prefix Sums', 'Two Pointers', 'Sliding Window'],
  },
  {
    id: 'strings',
    title: 'Strings',
    icon: '🔤',
    color: '#38bdf8',
    glow: '#38bdf833',
    xpReward: 500,
    desc: 'AI logs, parsing, autocomplete, natural language systems.',
    level: 1,
    problems: [
      p('ms-valid-parentheses',    'Valid Parentheses'),
      p('ms-reverse-words',        'Reverse Words in a String'),
      p('ms-valid-palindrome-skip','Valid Palindrome II'),
      p('ora-longest-common-prefix','Longest Common Prefix'),
      p('ora-valid-anagram',       'Valid Anagram'),
      p('ms-longest-substring',    'Longest Substring Without Repeating'),
      p('ms-find-anagrams',        'Find All Anagrams in String'),
      p('adobe-string-compression','String Compression'),
      p('ms-minimum-window',       'Minimum Window Substring'),
      p('sf-minimum-window',       'Einstein GPT RAG Retriever'),
      p('adobe-word-break',        'Word Break — InDesign Text Reflow'),
      p('sf-word-break',           'Salesforce Marketing Template Validator'),
      p('ora-missing-ranges',      'Missing Ranges'),
      p('ms-decode-ways',          'Decode Ways — Azure Incident Decoder'),
      p('ms-edit-distance',        'Edit Distance — GitHub Merge Conflict'),
    ],
    skills: ['Parsing', 'Frequency Map', 'Sliding Window', 'DP on Strings'],
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    icon: '🔍',
    color: '#1a73e8',
    glow: '#1a73e833',
    xpReward: 600,
    desc: 'Search space reduction for cloud-scale optimization.',
    level: 2,
    requires: 'arrays',
    problems: [
      p('ms-binary-search',        'Binary Search — The O(log n) God'),
      p('ora-search-insert-position','Search Insert Position'),
      p('ora-first-bad-version',   'First Bad Version'),
      p('ora-kth-largest',         'Kth Largest Element in Array'),
      p('ora-k-closest-points',    'K Closest Points to Origin'),
      p('adobe-top-k-frequent-words','Top K Frequent Words'),
      p('ms-decode-ways',          'Decode Ways'),
      p('ora-container-most-water','Container With Most Water'),
      p('ms-word-ladder',          'Word Ladder — BFS on Implicit Graph'),
      p('ora-merge-k-sorted-intervals','Merge K Sorted Lists'),
    ],
    skills: ['Binary Search', 'Search Space', 'Lower Bound', 'Heap / QuickSelect'],
  },
  {
    id: 'linked-lists',
    title: 'Linked Lists',
    icon: '🔗',
    color: '#a855f7',
    glow: '#a855f733',
    xpReward: 600,
    desc: 'Streaming systems, memory pipelines, pointer rewiring.',
    level: 2,
    requires: 'arrays',
    problems: [
      p('ms-reverse-linked-list',  'Reverse Linked List'),
      p('ms-linked-list-cycle',    "Linked List Cycle — Floyd's"),
      p('sf-reverse-linked-list-sf','Salesforce Timeline Reversal'),
      p('ms-lru-cache',            'LRU Cache — Azure Cache Design'),
      p('ora-merge-k-sorted-intervals','Merge K Sorted Lists'),
      p('ora-merge-sorted-array',  'Merge Sorted Arrays'),
    ],
    skills: ['Pointers', 'Fast & Slow', 'Reversal', 'LRU Design'],
  },
  {
    id: 'stack-queue',
    title: 'Stack & Queue',
    icon: '📚',
    color: '#f97316',
    glow: '#f9731633',
    xpReward: 650,
    desc: 'Event processing, compiler safety, queues, stacks.',
    level: 2,
    requires: 'arrays',
    problems: [
      p('ms-valid-parentheses',    'Valid Parentheses'),
      p('ms-circular-queue',       'Design Circular Queue'),
      p('ms-minimum-window',       'Minimum Window Substring'),
      p('ora-basic-calculator',    'Basic Calculator — SQL Expression Engine'),
      p('ora-remove-invalid-parens','Remove Invalid Parentheses'),
      p('adobe-largest-rectangle', 'Largest Rectangle in Histogram'),
      p('sf-mulesoft-rate-limiter','MuleSoft API Rate Limiter'),
      p('ora-browser-history',     'Design Browser History'),
    ],
    skills: ['Stack', 'Queue', 'Monotonic Stack', 'Design'],
  },
  {
    id: 'trees',
    title: 'Trees & BST',
    icon: '🌲',
    color: '#10b981',
    glow: '#10b98133',
    xpReward: 700,
    desc: 'Cloud hierarchy, decision trees, DFS, BFS.',
    level: 3,
    requires: 'linked-lists',
    problems: [
      p('ms-max-depth-tree',       'Maximum Depth of Binary Tree'),
      p('ms-invert-binary-tree',   'Invert Binary Tree — The Tweet'),
      p('ms-serialize-deserialize-tree','Serialize / Deserialize Binary Tree'),
      p('adobe-serialize-tree',    'XD Component Library Sync Protocol'),
      p('bcm-serialize-bst',       'Serialize / Deserialize BST'),
      p('sf-level-order-traversal','Level Order Traversal — Org Chart'),
      p('ms-course-schedule',      'Course Schedule — Cycle Detection'),
      p('sf-course-schedule-ii',   'Course Schedule II — Topological Sort'),
      p('ms-clone-graph',          'Clone Graph — Azure Sandbox'),
      p('sf-clone-graph',          'Salesforce Sandbox Deep Clone'),
      p('sf-all-paths-dag',        'All Paths in DAG — Flow Validator'),
      p('bcm-implement-trie',      'Implement Trie — BGP Routing Table'),
      p('ms-design-add-search-words','Design Add and Search Words'),
    ],
    skills: ['DFS', 'BFS', 'BST', 'Trie', 'Level Order'],
  },
  {
    id: 'graphs',
    title: 'Graphs',
    icon: '🕸️',
    color: '#f59e0b',
    glow: '#f59e0b33',
    xpReward: 800,
    desc: 'Networks, routing, distributed systems, dependencies.',
    level: 3,
    requires: 'trees',
    problems: [
      p('ms-number-of-islands',    'Number of Islands — The Immortal'),
      p('sf-number-of-islands-sf', 'Salesforce Region Cluster Counter'),
      p('ms-pacific-atlantic',     'Pacific Atlantic Water Flow'),
      p('ora-max-area-island',     'Max Area of Island'),
      p('ms-pacific-atlantic',     'Power BI Dual-Sink Lineage'),
      p('sf-accounts-merge',       'Accounts Merge — CRM Deduplication'),
      p('ora-redundant-connection','Redundant Connection — RAC Cluster'),
      p('sf-network-delay',        'Network Delay Time — Dijkstra\'s'),
      p('bcm-network-delay',       'Broadcom Packet Latency Calculator'),
      p('ms-word-ladder',          'Word Ladder — BFS Graph'),
      p('ora-word-search-ii',      'Word Search II — Oracle Text Engine'),
      p('bcm-word-search-ii-broadcom','Broadcom EDA Multi-Signal Router'),
      p('ms-alien-dictionary',     'Alien Dictionary — Topological Sort'),
    ],
    skills: ['DFS/BFS', 'Union Find', 'Topological Sort', 'Dijkstra'],
  },
  {
    id: 'dynamic-programming',
    title: 'Dynamic Programming',
    icon: '💎',
    color: '#ff4d4d',
    glow: '#ff4d4d33',
    xpReward: 1000,
    desc: 'AI planning, cost optimization, state transitions.',
    level: 4,
    requires: 'graphs',
    problems: [
      p('ms-climbing-stairs',      'Climbing Stairs — Fibonacci'),
      p('bcm-climbing-stairs-broadcom','ASIC Pipeline Traversal Counter'),
      p('ms-house-robber',         'House Robber — Azure Budget Optimizer'),
      p('bcm-house-robber',        'Broadcom IP Block Power Maximizer'),
      p('ms-coin-change',          'Coin Change — Vending Machine'),
      p('bcm-coin-change',         'Broadcom PCIe Lane Allocator'),
      p('ms-maximum-subarray',     'Maximum Subarray — Kadane\'s'),
      p('ms-decode-ways',          'Decode Ways'),
      p('ora-unique-paths',        'Unique Paths — Navigation Flow'),
      p('ora-partition-equal-subset','Partition Equal Subset Sum'),
      p('adobe-max-product-subarray','Maximum Product Subarray'),
      p('adobe-word-break',        'Word Break'),
      p('adobe-stock-buy-sell-cooldown', 'Stock Buy Sell With Cooldown', true),
      p('bcm-lcs',                 'Longest Common Subsequence'),
      p('ms-edit-distance',        'Edit Distance — Levenshtein'),
    ],
    skills: ['Memoization', 'Tabulation', 'Knapsack', '1D/2D DP'],
  },
  {
    id: 'backtracking',
    title: 'Backtracking',
    icon: '🌀',
    color: '#8b5cf6',
    glow: '#8b5cf633',
    xpReward: 900,
    desc: 'Constraint solving, AI agents, search-space pruning.',
    level: 4,
    requires: 'dynamic-programming',
    problems: [
      p('bcm-generate-parentheses','Generate Parentheses — VHDL Generator'),
      p('bcm-combination-sum',     'Combination Sum — Power Budget'),
      p('bcm-word-search',         'Word Search — ASIC Trace Finder'),
      p('adobe-word-search-ii',    'Word Search II — Firefly Prompt Matcher'),
      p('ora-word-search-ii',      'Word Search II — Oracle Text Search'),
      p('sf-all-paths-dag',        'All Paths in DAG'),
    ],
    skills: ['Recursion', 'Pruning', 'State Search', 'Trie + DFS'],
  },
];
const getUniqueProblems = () => {
  const map = new Map();

  TRACKS.forEach(track => {
    track.problems.forEach(problem => {
      if (!problem.comingSoon) {
        map.set(problem.id, problem);
      }
    });
  });

  return Array.from(map.values());
};

const ROADMAP_TOTAL = getUniqueProblems().length;

function ProgressRing({ pct, color, size = 44 }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={4} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={color}
        fontSize={10}
        fontWeight={900}
        fontFamily="Arial"
      >
        {pct}%
      </text>
    </svg>
  );
}

function TrackCard({ track, progress, isLocked, onStart, idx }) {
  const [hovered, setHovered] = useState(false);
  const pct = progress?.pct || 0;
  const solved = progress?.solved || 0;
  const total = track.problems.length;
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
        position: 'relative',
        background: isLocked ? '#0a0a14' : hovered ? `linear-gradient(135deg, #0d1117, ${track.color}11)` : '#0d1117',
        border: `1px solid ${isLocked ? '#1e2a3a' : isComplete ? track.color + '88' : hovered ? track.color + '66' : track.color + '33'}`,
        borderRadius: 18,
        padding: 20,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        transition: 'all 0.3s',
        overflow: 'hidden',
        boxShadow: hovered && !isLocked ? `0 0 30px ${track.glow}` : 'none',
      }}
    >
      {!isLocked && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${track.color}, transparent)`, opacity: hovered ? 1 : 0.4 }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: isLocked ? '#1e2a3a' : `linear-gradient(135deg, ${track.color}33, ${track.color}11)`,
          border: `1px solid ${isLocked ? '#333' : track.color + '44'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          {isLocked ? '🔒' : track.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            background: isLocked ? '#1e2a3a' : track.color + '22',
            border: `1px solid ${isLocked ? '#333' : track.color + '33'}`,
            borderRadius: 20,
            padding: '1px 8px',
            color: isLocked ? '#444' : track.color,
            fontSize: 9,
            fontWeight: 700,
          }}>
            Level {track.level}
          </span>

          <h3 style={{ margin: '6px 0 0', color: isLocked ? '#333' : '#e8e8e8', fontSize: 15, fontWeight: 800 }}>
            {track.title}
          </h3>
        </div>

        {!isLocked && <ProgressRing pct={pct} color={track.color} size={44} />}
      </div>

      <p style={{ margin: '0 0 14px', color: isLocked ? '#333' : '#666', fontSize: 12, lineHeight: 1.6 }}>
        {track.desc}
      </p>

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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {track.skills.map(skill => (
          <span key={skill} style={{
            background: '#1e2a3a',
            borderRadius: 20,
            padding: '2px 8px',
            color: isLocked ? '#333' : '#666',
            fontSize: 10,
          }}>
            {skill}
          </span>
        ))}
      </div>

      {isLocked && track.requires && (
        <div style={{ marginTop: 12, color: '#444', fontSize: 11 }}>
          🔒 Complete "{TRACKS.find(t => t.id === track.requires)?.title}" first
        </div>
      )}
    </motion.div>
  );
}

function TrackDetail({ track, userProgress, onClose }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: '#0d1117',
          border: `1px solid ${track.color}44`,
          borderRadius: 20,
          padding: 28,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
        }}
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

          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>
            ✕
          </button>
        </div>

        <p style={{ color: '#666', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>{track.desc}</p>

        <div style={{
          background: track.color + '11',
          border: `1px solid ${track.color}22`,
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
        }}>
          <div style={{
            color: track.color,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 8,
          }}>
            Skills You'll Master
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {track.skills.map(s => (
              <span key={s} style={{
                background: track.color + '22',
                border: `1px solid ${track.color}33`,
                borderRadius: 20,
                padding: '3px 10px',
                color: track.color,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        <div style={{ color: '#555', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Problems ({track.problems.length})
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {track.problems.map((p, i) => {
            const solvedMap = userProgress?.solvedProblems || {};
            const isSolved  = !!solvedMap[p.id];
            const isComingSoon = !!p.comingSoon;

            const handleClick = () => {
              if (isComingSoon) return;
              navigate(`/roadmap-solve/${p.id}`);
            };

            return (
              <div
                key={p.id}
                onClick={handleClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: isSolved ? '#00c89608' : isComingSoon ? '#0a0a14' : '#060910',
                  border: `1px solid ${isSolved ? '#00c89633' : isComingSoon ? '#1e2a3a' : '#1e2a3a'}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  cursor: isComingSoon ? 'not-allowed' : 'pointer',
                  opacity: isComingSoon ? 0.5 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!isComingSoon) e.currentTarget.style.borderColor = track.color + '44'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isSolved ? '#00c89633' : '#1e2a3a'; }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: isSolved ? '#00c89622' : '#1e2a3a',
                  border: `1px solid ${isSolved ? '#00c89644' : '#333'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: isSolved ? '#00c896' : '#555',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {isSolved ? '✓' : isComingSoon ? '🔒' : i + 1}
                </div>

                <span style={{ color: isSolved ? '#888' : isComingSoon ? '#444' : '#c8c8c8', fontSize: 13, flex: 1 }}>
                  {p.title}
                </span>

                {isComingSoon
                  ? <span style={{ color: '#333', fontSize: 10 }}>Coming Soon</span>
                  : isSolved
                    ? <span style={{ color: '#00c896', fontSize: 11 }}>✓ Solved</span>
                    : <span style={{ color: '#1a73e8', fontSize: 11 }}>Solve →</span>
                }
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

function CertificateCard({ cert, earned }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: earned ? `linear-gradient(135deg, #0d1117, ${cert.color}11)` : '#0a0a14',
        border: `1px solid ${earned ? cert.color + '44' : '#1e2a3a'}`,
        borderRadius: 14,
        padding: 16,
        textAlign: 'center',
        opacity: earned ? 1 : 0.4,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 8 }}>{cert.badge}</div>
      <div style={{ color: earned ? cert.color : '#444', fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{cert.title}</div>
      <div style={{ color: '#555', fontSize: 10, lineHeight: 1.5 }}>{cert.desc}</div>
    </motion.div>
  );
}

export default function Roadmap({ user, userData }) {
  const navigate = useNavigate();

  const [tab, setTab] = useState('tracks');
  const [selected, setSelected] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [allCerts, setAllCerts] = useState({});
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user?.uid) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const [certRes, bookRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/certificates/${user.uid}`),
          axios.get(`${API_BASE}/bookmarks/${user.uid}`),
        ]);

        const certData = certRes.status === 'fulfilled'
          ? certRes.value.data
          : {};

        const bookData = bookRes.status === 'fulfilled'
          ? bookRes.value.data
          : {};

        if (!isMounted) return;

        setCertificates(certData.certificates || []);
        setAllCerts(certData.allCerts || certData.allCertificates || certData.availableCertificates || {});
        setBookmarks(bookData.bookmarks || []);
      } catch (err) {
        console.error('Roadmap load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const getTrackProgress = (track) => {
    const solvedMap   = userData?.solvedProblems || {};
    const realProbs   = track.problems.filter(p => !p.comingSoon);
    const solved      = realProbs.filter(p => !!solvedMap[p.id]).length;
    const total       = realProbs.length;
    const pct         = total > 0 ? Math.round((solved / total) * 100) : 0;
    return { solved, pct, total };
  };

  const isUnlocked = (track) => {
    if (!track.requires) return true;
    const reqTrack = TRACKS.find(t => t.id === track.requires);
    if (!reqTrack) return true;
    const reqProgress = getTrackProgress(reqTrack);
    return reqProgress.solved >= 1;
  };
  const roadmapSolved = getUniqueProblems()
   .filter(p => userData?.solvedProblems?.[p.id])
   .length;
  const ROADMAP_REAL_TOTAL = getUniqueProblems().length;
  const earnedIds = new Set(certificates.map(c => c.certId));

  const TABS = [
    { key: 'tracks', label: '🗺️ Learning Paths' },
    { key: 'certificates', label: '🏆 Certificates' },
    { key: 'bookmarks', label: '🔖 Bookmarks' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
        Loading roadmap...
      </div>
    );
  }

  if (!user?.uid) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
        Please login first.
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a14', color: '#e8e8e8', fontFamily: 'Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1000, margin: '0 auto', padding: '28px 24px 80px' }}>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
            <button
              onClick={() => navigate('/world')}
              style={{
                background: 'transparent',
                border: '1px solid #1e2a3a',
                borderRadius: 8,
                color: '#555',
                cursor: 'pointer',
                fontSize: 12,
                padding: '6px 14px',
                marginBottom: 16,
              }}
            >
              ← World
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
              <div style={{ fontSize: 40 }}>🗺️</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>Learning Roadmap</h1>
                <p style={{ margin: '4px 0 0', color: '#555', fontSize: 13 }}>
                  Master future-ready DSA in the right order.
                </p>
              </div>
            </div>

            <div style={{ background: '#0d1117', border: '1px solid #1e2a3a', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#555', fontSize: 11 }}>Overall Progress</span>
                  <span style={{ color: '#1a73e8', fontSize: 11, fontWeight: 700 }}>
                    {roadmapSolved}/{ROADMAP_REAL_TOTAL} problems
                  </span>
                </div>

                <div style={{ width: '100%', height: 6, background: '#1e2a3a', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ROADMAP_REAL_TOTAL > 0 ? (roadmapSolved / ROADMAP_REAL_TOTAL) * 100 : 0}%` }}
                    transition={{ duration: 1.2 }}
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #00c896, #1a73e8, #f59e0b)',
                      borderRadius: 3,
                    }} />
                </div>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  background: tab === t.key ? '#1a73e822' : 'transparent',
                  border: `1px solid ${tab === t.key ? '#1a73e844' : '#1e2a3a'}`,
                  borderRadius: 20,
                  color: tab === t.key ? '#1a73e8' : '#555',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: tab === t.key ? 700 : 400,
                  padding: '6px 16px',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'tracks' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {TRACKS.map((track, idx) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  progress={getTrackProgress(track)}
                  isLocked={!isUnlocked(track)}
                  onStart={setSelected}
                  idx={idx} />
              ))}
            </div>
          )}

          {tab === 'certificates' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {Object.entries(allCerts).map(([certId, cert]) => (
                <CertificateCard key={certId} cert={cert} earned={earnedIds.has(certId)} />
              ))}
            </div>
          )}

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
                  {bookmarks.map((b, i) => (
                    <motion.div
                      key={b.id || i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/solve/${b.problemId}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: '#0d1117',
                        border: '1px solid #1e2a3a',
                        borderRadius: 12,
                        padding: '14px 18px',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>🔖</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 600 }}>
                          {b.problemTitle || b.problemId}
                        </div>
                      </div>
                      <span style={{ color: '#1a73e8', fontSize: 12 }}>Solve →</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <TrackDetail
              track={selected}
              userProgress={userData}
              onClose={() => setSelected(null)} />
          )}
        </AnimatePresence>
      </div>
 )
}
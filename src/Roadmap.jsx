import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

// ─────────────────────────────────────────────────────────────────────────────
// TRACKS — every slug is confirmed to exist in Firestore.
// Adding a new problem: verify its slug in Firebase Console first.
// ─────────────────────────────────────────────────────────────────────────────
const p = (slug, title) => ({ id: slug, title });

const TRACKS = [
  {
    id: 'arrays', title: 'Arrays & Hashing', icon: '📦',
    color: '#00c896', glow: '#00c89633', xpReward: 500, level: 1,
    desc: 'Cloud telemetry, deduplication, hash maps, prefix sums.',
    skills: ['Hash Maps', 'Prefix Sums', 'Two Pointers', 'Sliding Window'],
    problems: [
      p('ms-two-sum',             'Two Sum — The Interview That Started It All'),
      p('ms-contains-duplicate',  'Contains Duplicate — Azure Deduplication'),
      p('ms-missing-number',      'Missing Number — Azure VM Inventory Glitch'),
      p('ms-product-except-self', 'Product Except Self — No Division Challenge'),
      p('ms-maximum-subarray',    'Maximum Subarray — Kadane\'s Algorithm'),
      p('ms-subarray-sum-k',      'Subarray Sum Equals K — Azure Billing'),
      p('ms-find-anagrams',       'Find All Anagrams — Defender Scanner'),
      p('ms-meeting-rooms',       'Meeting Rooms — Teams Apocalypse'),
      p('ms-meeting-rooms-ii',    'Meeting Rooms II — Min Conference Rooms'),
      p('adobe-merge-intervals',  'Merge Intervals — After Effects Timeline'),
      p('adobe-non-overlapping-intervals', 'Non-Overlapping Intervals — CC Sync'),
      p('sf-subarray-sum',        'Chatter Feed Engagement Analyzer'),
      p('sf-find-all-anagrams',   'Salesforce Schema Anagram Search'),
      p('ora-merge-sorted-array', 'Merge Sorted Array — Oracle Merge Join'),
      p('ora-rotate-array',       'Rotate Array — Oracle Buffer Rotation'),
    ],
  },
  {
    id: 'strings', title: 'Strings', icon: '🔤',
    color: '#38bdf8', glow: '#38bdf833', xpReward: 500, level: 1,
    desc: 'AI logs, parsing, autocomplete, natural language systems.',
    skills: ['Parsing', 'Frequency Map', 'Sliding Window', 'DP on Strings'],
    problems: [
      p('ms-valid-parentheses',    'Valid Parentheses — Universal Syntax Checker'),
      p('ms-reverse-words',        'Reverse Words — Clippy\'s Revenge'),
      p('ms-valid-palindrome-skip','Valid Palindrome II — Xbox Gamertag'),
      p('ora-longest-common-prefix','Longest Common Prefix — GoldenGate'),
      p('ora-valid-anagram',       'Valid Anagram — Oracle Schema Validator'),
      p('ms-longest-substring',    'Longest Substring — Copilot Context Window'),
      p('adobe-string-compression','String Compression — Adobe Rush Mobile'),
      p('ms-minimum-window',       'Minimum Window Substring — Sentinel'),
      p('sf-minimum-window',       'Einstein GPT RAG Document Retriever'),
      p('adobe-word-break',        'Word Break — InDesign Text Reflow'),
      p('sf-word-break',           'Salesforce Marketing Template Validator'),
      p('ms-decode-ways',          'Decode Ways — Azure Incident Decoder'),
      p('ms-edit-distance',        'Edit Distance — GitHub Merge Conflict'),
      p('adobe-edit-distance',     'Photoshop History State Diff'),
      p('ora-missing-ranges',      'Missing Ranges — Oracle Sequence Gap'),
    ],
  },
  {
    id: 'binary-search', title: 'Binary Search', icon: '🔍',
    color: '#1a73e8', glow: '#1a73e833', xpReward: 600, level: 2,
    requires: 'arrays',
    desc: 'Search space reduction for cloud-scale optimization.',
    skills: ['Binary Search', 'Search Space', 'Lower Bound', 'Heap'],
    problems: [
      p('ms-binary-search',        'Binary Search — The O(log n) God'),
      p('ora-search-insert-position','Search Insert Position — B-Tree Index'),
      p('ora-first-bad-version',   'First Bad Version — Oracle Patch Finder'),
      p('ora-kth-largest',         'Kth Largest — Java GC Priority Queue'),
      p('ora-k-closest-points',    'K Closest Points — OCI Proximity Engine'),
      p('adobe-top-k-frequent-words','Top K Frequent Words — Adobe Stock'),
      p('ora-container-most-water','Container With Most Water — OCI Capacity'),
      p('ms-find-anagrams',        'Sliding Window — Defender Pattern Scanner'),
      p('ora-merge-k-sorted-intervals','Merge K Sorted Lists — ODI Merger'),
      p('ora-merge-sorted-lists',  'Merge Sorted Lists — Multi-Source Merge'),
    ],
  },
  {
    id: 'linked-lists', title: 'Linked Lists', icon: '🔗',
    color: '#a855f7', glow: '#a855f733', xpReward: 600, level: 2,
    requires: 'arrays',
    desc: 'Streaming systems, memory pipelines, pointer rewiring.',
    skills: ['Pointers', 'Fast & Slow', 'Reversal', 'LRU Design'],
    problems: [
      p('ms-reverse-linked-list',  'Reverse Linked List — 30 Years, Same Answer'),
      p('ms-linked-list-cycle',    'Linked List Cycle — Floyd\'s Algorithm'),
      p('sf-reverse-linked-list-sf','Activity Timeline Reversal — Salesforce'),
      p('ms-lru-cache',            'LRU Cache — Azure Cache That Never Sleeps'),
      p('ora-merge-sorted-lists',  'Merge K Sorted Lists — Oracle ETL'),
      p('ora-merge-sorted-array',  'Merge Sorted Array — Oracle Merge Join'),
    ],
  },
  {
    id: 'stack-queue', title: 'Stack & Queue', icon: '📚',
    color: '#f97316', glow: '#f9731633', xpReward: 650, level: 2,
    requires: 'arrays',
    desc: 'Event processing, compiler safety, queues, monotonic stacks.',
    skills: ['Stack', 'Queue', 'Monotonic Stack', 'Design'],
    problems: [
      p('ms-valid-parentheses',    'Valid Parentheses — Universal Syntax Checker'),
      p('ms-circular-queue',       'Circular Queue — Teams Message Ring Buffer'),
      p('ora-basic-calculator',    'Basic Calculator — Oracle SQL Optimizer'),
      p('ora-remove-invalid-parens','Remove Invalid Parentheses — PL/SQL Error'),
      p('adobe-largest-rectangle', 'Largest Rectangle — Lightroom Histogram'),
      p('ora-largest-rectangle-histogram','Oracle APEX Chart Max Fill Area'),
      p('sf-mulesoft-rate-limiter','MuleSoft API Rate Limiter — Sliding Window'),
      p('ora-browser-history',     'Design Browser History — Oracle APEX'),
    ],
  },
  {
    id: 'trees', title: 'Trees & BST', icon: '🌲',
    color: '#10b981', glow: '#10b98133', xpReward: 700, level: 3,
    requires: 'linked-lists',
    desc: 'Cloud hierarchy, decision trees, DFS, BFS, Tries.',
    skills: ['DFS', 'BFS', 'BST', 'Trie', 'Level Order'],
    problems: [
      p('ms-max-depth-tree',       'Max Depth — Azure Resource Hierarchy'),
      p('ms-invert-binary-tree',   'Invert Binary Tree — The Tweet'),
      p('ms-serialize-deserialize-tree','Serialize Tree — OneDrive Sync'),
      p('adobe-serialize-tree',    'XD Component Library Sync Protocol'),
      p('bcm-serialize-bst',       'Serialize BST — Broadcom EDA Circuit'),
      p('sf-level-order-traversal','Level Order — Salesforce Org Chart'),
      p('ms-course-schedule',      'Course Schedule — Cycle Detector'),
      p('sf-course-schedule-ii',   'Course Schedule II — Trailhead Resolver'),
      p('ms-clone-graph',          'Clone Graph — Azure Sandbox Cloner'),
      p('sf-clone-graph',          'Clone Graph — Salesforce Sandbox Clone'),
      p('bcm-implement-trie',      'Implement Trie — BGP Routing Table'),
      p('ms-alien-dictionary',     'Alien Dictionary — Azure DevOps Language'),
    ],
  },
  {
    id: 'graphs', title: 'Graphs', icon: '🕸️',
    color: '#f59e0b', glow: '#f59e0b33', xpReward: 800, level: 3,
    requires: 'trees',
    desc: 'Networks, routing, distributed systems, dependencies.',
    skills: ['DFS/BFS', 'Union Find', 'Topological Sort', 'Dijkstra'],
    problems: [
      p('ms-number-of-islands',    'Number of Islands — Never Retires'),
      p('sf-number-of-islands-sf', 'Salesforce Region Cluster Counter'),
      p('ms-pacific-atlantic',     'Pacific Atlantic — Power BI Lineage'),
      p('ora-max-area-island',     'Max Area Island — Oracle Cloud Regions'),
      p('sf-accounts-merge',       'Accounts Merge — CRM Deduplication Engine'),
      p('ora-redundant-connection','Redundant Connection — Oracle RAC Cluster'),
      p('sf-network-delay',        'Network Delay — Salesforce Data Centers'),
      p('bcm-network-delay',       'Packet Latency — Broadcom Switch Fabric'),
      p('ms-word-ladder',          'Word Ladder — Cortana\'s Vocabulary Bridge'),
      p('ora-word-search-ii',      'Word Search II — Oracle Text Full-Search'),
      p('bcm-word-search-ii-broadcom','Multi-Signal Route Validator — Broadcom'),
    ],
  },
  {
    id: 'dynamic-programming', title: 'Dynamic Programming', icon: '💎',
    color: '#ff4d4d', glow: '#ff4d4d33', xpReward: 1000, level: 4,
    requires: 'graphs',
    desc: 'AI planning, cost optimization, state machine transitions.',
    skills: ['Memoization', 'Tabulation', '1D/2D DP', 'Knapsack'],
    problems: [
      p('ms-climbing-stairs',      'Climbing Stairs — Asked 500 Million Times'),
      p('bcm-climbing-stairs-broadcom','ASIC Pipeline Traversal Counter'),
      p('bcm-min-cost-stairs',     'Min Cost Climbing Stairs — Energy Optimizer'),
      p('ms-house-robber',         'House Robber — Azure Budget Optimizer'),
      p('bcm-house-robber',        'Broadcom IP Block Power Maximizer'),
      p('ms-coin-change',          'Coin Change — Microsoft Vending Machine'),
      p('bcm-coin-change',         'PCIe Lane Allocator — Broadcom'),
      p('sf-coin-change-salesforce','Salesforce Credits Optimizer'),
      p('ms-maximum-subarray',     'Maximum Subarray — Kadane\'s Algorithm'),
      p('sf-max-subarray-salesforce','Salesforce Quota Peak Streak'),
      p('ms-decode-ways',          'Decode Ways — Azure Incident Decoder'),
      p('ora-unique-paths',        'Unique Paths — Oracle APEX Navigation'),
      p('ora-partition-equal-subset','Partition Equal Subset — Exadata Load'),
      p('adobe-max-product-subarray','Max Product Subarray — Illustrator'),
      p('bcm-lcs',                 'Longest Common Subsequence — Firmware Diff'),
    ],
  },
  {
    id: 'backtracking', title: 'Backtracking', icon: '🌀',
    color: '#8b5cf6', glow: '#8b5cf633', xpReward: 900, level: 4,
    requires: 'dynamic-programming',
    desc: 'Constraint solving, AI agents, search-space pruning.',
    skills: ['Recursion', 'Pruning', 'State Search', 'Trie + DFS'],
    problems: [
      p('bcm-generate-parentheses','Generate Parentheses — VHDL Generator'),
      p('bcm-combination-sum',     'Combination Sum — Power Budget Config'),
      p('bcm-word-search',         'Word Search — ASIC Trace Path Finder'),
      p('adobe-word-search-ii',    'Word Search II — Adobe Firefly Matcher'),
      p('ora-word-search-ii',      'Word Search II — Oracle Text Engine'),
      p('ms-alien-dictionary',     'Alien Dictionary — Topological Sort'),
    ],
  },
];

const ROADMAP_TOTAL = TRACKS.reduce((s, t) => s + t.problems.length, 0);

// ─────────────────────────────────────────────────────────────────────────────
// SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 44 }) {
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2a3a" strokeWidth={4} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
        transition={{ duration: 1, ease: 'easeOut' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
        fill={color} fontSize={10} fontWeight={900} fontFamily="Arial">
        {pct}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK CARD
// ─────────────────────────────────────────────────────────────────────────────
function TrackCard({ track, progress, isLocked, onStart, idx }) {
  const [hovered, setHovered] = useState(false);
  const { pct = 0, solved = 0 } = progress;
  const total      = track.problems.length;
  const isComplete = solved >= total && total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={() => !isLocked && onStart(track)}
      style={{
        position: 'relative',
        background: isLocked ? '#0a0a14' : hovered ? `linear-gradient(135deg,#0d1117,${track.color}11)` : '#0d1117',
        border: `1px solid ${isLocked ? '#1e2a3a' : isComplete ? track.color+'88' : hovered ? track.color+'66' : track.color+'33'}`,
        borderRadius: 18, padding: 20,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.5 : 1, transition: 'all 0.3s',
        overflow: 'hidden',
        boxShadow: hovered && !isLocked ? `0 0 30px ${track.glow}` : 'none',
      }}
    >
      {!isLocked && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${track.color},transparent)`, opacity: hovered ? 1 : 0.4 }} />
      )}

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ width:48, height:48, borderRadius:14, background: isLocked ? '#1e2a3a' : `linear-gradient(135deg,${track.color}33,${track.color}11)`, border:`1px solid ${isLocked ? '#333' : track.color+'44'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
          {isLocked ? '🔒' : track.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ background: isLocked ? '#1e2a3a' : track.color+'22', border:`1px solid ${isLocked ? '#333' : track.color+'33'}`, borderRadius:20, padding:'1px 8px', color: isLocked ? '#444' : track.color, fontSize:9, fontWeight:700 }}>
            Level {track.level}
          </span>
          <h3 style={{ margin:'6px 0 0', color: isLocked ? '#333' : '#e8e8e8', fontSize:15, fontWeight:800 }}>{track.title}</h3>
        </div>
        {!isLocked && <ProgressRing pct={pct} color={track.color} size={44} />}
      </div>

      <p style={{ margin:'0 0 14px', color: isLocked ? '#333' : '#666', fontSize:12, lineHeight:1.6 }}>{track.desc}</p>

      {!isLocked && (
        <div style={{ marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ color:'#555', fontSize:10 }}>{solved}/{total} problems</span>
            <span style={{ color:track.color, fontSize:10, fontWeight:600 }}>{pct}%</span>
          </div>
          <div style={{ width:'100%', height:5, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} transition={{ duration:0.8 }}
              style={{ height:'100%', background:track.color, borderRadius:3 }} />
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
        {track.skills.map(s => (
          <span key={s} style={{ background:'#1e2a3a', borderRadius:20, padding:'2px 8px', color: isLocked ? '#333' : '#666', fontSize:10 }}>{s}</span>
        ))}
      </div>

      {isLocked && track.requires && (
        <div style={{ marginTop:12, color:'#444', fontSize:11 }}>
          🔒 Solve any problem in "{TRACKS.find(t => t.id === track.requires)?.title}" first
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRACK DETAIL PANEL
// ─────────────────────────────────────────────────────────────────────────────
function TrackDetail({ track, userProgress, onClose }) {
  const navigate = useNavigate();
  const solvedMap = userProgress?.solvedProblems || {};

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <motion.div initial={{ scale:0.9, y:20 }} animate={{ scale:1, y:0 }}
        style={{ background:'#0d1117', border:`1px solid ${track.color}44`, borderRadius:20, padding:28, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', position:'relative' }}>

        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,transparent,${track.color},transparent)` }} />

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:36 }}>{track.icon}</span>
            <div>
              <h2 style={{ margin:0, color:'#e8e8e8', fontSize:20, fontWeight:900 }}>{track.title}</h2>
              <span style={{ color:track.color, fontSize:12 }}>+{track.xpReward} XP on completion</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#555', cursor:'pointer', fontSize:20 }}>✕</button>
        </div>

        <p style={{ color:'#666', fontSize:13, lineHeight:1.6, marginBottom:20 }}>{track.desc}</p>

        {/* Skills */}
        <div style={{ background:track.color+'11', border:`1px solid ${track.color}22`, borderRadius:10, padding:'12px 16px', marginBottom:20 }}>
          <div style={{ color:track.color, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Skills You'll Master</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {track.skills.map(s => (
              <span key={s} style={{ background:track.color+'22', border:`1px solid ${track.color}33`, borderRadius:20, padding:'3px 10px', color:track.color, fontSize:11, fontWeight:600 }}>{s}</span>
            ))}
          </div>
        </div>

        {/* Problems list */}
        <div style={{ color:'#555', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
          Problems ({track.problems.length})
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {track.problems.map((prob, i) => {
            const isSolved = !!solvedMap[prob.id];
            return (
              <motion.div key={prob.id}
                initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                transition={{ delay: i * 0.025 }}
                onClick={() => navigate(`/solve/${prob.id}`)}
                whileHover={{ x:3, borderColor: track.color+'55' }}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  background: isSolved ? '#00c89608' : '#060910',
                  border:`1px solid ${isSolved ? '#00c89633' : '#1e2a3a'}`,
                  borderRadius:10, padding:'10px 14px',
                  cursor:'pointer', transition:'border-color 0.15s',
                }}>

                {/* Number/check circle */}
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background: isSolved ? '#00c89622' : '#1e2a3a', border:`1px solid ${isSolved ? '#00c89644' : '#333'}`, display:'flex', alignItems:'center', justifyContent:'center', color: isSolved ? '#00c896' : '#555', fontSize:11, fontWeight:700 }}>
                  {isSolved ? '✓' : i + 1}
                </div>

                {/* Title */}
                <span style={{ color: isSolved ? '#888' : '#c8c8c8', fontSize:13, flex:1, lineHeight:1.4 }}>
                  {prob.title}
                </span>

                {/* Right badge */}
                {isSolved
                  ? <span style={{ color:'#00c896', fontSize:11, fontWeight:700, flexShrink:0 }}>✓ Solved</span>
                  : <span style={{ color: track.color, fontSize:11, flexShrink:0 }}>Solve →</span>
                }
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE CARD
// ─────────────────────────────────────────────────────────────────────────────
function CertificateCard({ cert, earned }) {
  return (
    <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
      style={{ background: earned ? `linear-gradient(135deg,#0d1117,${cert.color}11)` : '#0a0a14', border:`1px solid ${earned ? cert.color+'44' : '#1e2a3a'}`, borderRadius:14, padding:16, textAlign:'center', opacity: earned ? 1 : 0.4 }}>
      <div style={{ fontSize:32, marginBottom:8 }}>{cert.badge}</div>
      <div style={{ color: earned ? cert.color : '#444', fontSize:12, fontWeight:800, marginBottom:4 }}>{cert.title}</div>
      <div style={{ color:'#555', fontSize:10, lineHeight:1.5 }}>{cert.desc}</div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Roadmap({ user, userData }) {
  const navigate = useNavigate();

  const [tab,          setTab]          = useState('tracks');
  const [selected,     setSelected]     = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [allCerts,     setAllCerts]     = useState({});
  const [bookmarks,    setBookmarks]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    Promise.allSettled([
      axios.get(`${API_BASE}/certificates/${user.uid}`).catch(() => ({ data: {} })),
      axios.get(`${API_BASE}/bookmarks/${user.uid}`).catch(() => ({ data: {} })),
    ]).then(([certRes, bookRes]) => {
      const cd = certRes.value?.data || certRes.data || {};
      const bd = bookRes.value?.data  || bookRes.data  || {};
      setCertificates(cd.certificates || []);
      setAllCerts(cd.all || {});
      setBookmarks(bd.bookmarks || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user?.uid]);

  // Progress helpers — solvedProblems is a map {slug: {stars...}}
  const getTrackProgress = (track) => {
    const sm     = userData?.solvedProblems || {};
    const solved = track.problems.filter(pr => !!sm[pr.id]).length;
    const pct    = track.problems.length > 0 ? Math.round((solved / track.problems.length) * 100) : 0;
    return { solved, pct };
  };

  const isUnlocked = (track) => {
    if (!track.requires) return true;
    const req = TRACKS.find(t => t.id === track.requires);
    if (!req) return true;
    return getTrackProgress(req).solved >= 1; // 1 solve = unlock next track
  };

  const roadmapSolved = TRACKS.flatMap(t => t.problems).filter(pr => userData?.solvedProblems?.[pr.id]).length;
  const earnedIds     = new Set(certificates.map(c => c.certId));

  const TABS = [
    { key: 'tracks',       label: '🗺️ Learning Paths' },
    { key: 'certificates', label: '🏆 Certificates'    },
    { key: 'bookmarks',    label: '🔖 Bookmarks'        },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a14', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, fontFamily:'Arial,sans-serif' }}>
        <motion.div animate={{ rotate:360 }} transition={{ duration:0.8, repeat:Infinity, ease:'linear' }}
          style={{ width:36, height:36, border:'3px solid #1e2a3a', borderTop:'3px solid #1a73e8', borderRadius:'50%' }} />
        <div style={{ color:'#555', fontSize:13 }}>Loading your roadmap...</div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#0a0a14', color:'#e8e8e8', fontFamily:'Arial,sans-serif', position:'relative', overflow:'hidden' }}>

      {/* Ambient orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none' }}>
        {[{c:'#00c896',l:'5%',t:'20%',s:300},{c:'#1a73e8',l:'85%',t:'60%',s:250},{c:'#f59e0b',l:'50%',t:'80%',s:200}].map((o,i) => (
          <div key={i} style={{ position:'absolute', borderRadius:'50%', width:o.s, height:o.s, background:o.c, left:o.l, top:o.t, transform:'translate(-50%,-50%)', filter:'blur(100px)', opacity:0.05 }} />
        ))}
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:1000, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* ── Header ── */}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} style={{ marginBottom:28 }}>
          <button onClick={() => navigate('/world')}
            style={{ background:'transparent', border:'1px solid #1e2a3a', borderRadius:8, color:'#555', cursor:'pointer', fontSize:12, padding:'6px 14px', marginBottom:16 }}>
            ← World
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
            <div style={{ fontSize:40 }}>🗺️</div>
            <div>
              <h1 style={{ margin:0, fontSize:28, fontWeight:900 }}>Learning Roadmap</h1>
              <p style={{ margin:'4px 0 0', color:'#555', fontSize:13 }}>Master DSA in the right order. Every problem links directly to the solver.</p>
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'14px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ color:'#555', fontSize:11 }}>Overall Progress</span>
              <span style={{ color:'#1a73e8', fontSize:11, fontWeight:700 }}>{roadmapSolved}/{ROADMAP_TOTAL} problems</span>
            </div>
            <div style={{ width:'100%', height:6, background:'#1e2a3a', borderRadius:3, overflow:'hidden' }}>
              <motion.div initial={{ width:0 }}
                animate={{ width:`${ROADMAP_TOTAL > 0 ? (roadmapSolved / ROADMAP_TOTAL) * 100 : 0}%` }}
                transition={{ duration:1.2 }}
                style={{ height:'100%', background:'linear-gradient(90deg,#00c896,#1a73e8,#f59e0b)', borderRadius:3 }} />
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', gap:6, marginBottom:24 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ background: tab===t.key ? '#1a73e822' : 'transparent', border:`1px solid ${tab===t.key ? '#1a73e844' : '#1e2a3a'}`, borderRadius:20, color: tab===t.key ? '#1a73e8' : '#555', cursor:'pointer', fontSize:12, fontWeight: tab===t.key ? 700 : 400, padding:'6px 16px' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tracks tab ── */}
        {tab === 'tracks' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {TRACKS.map((track, idx) => (
              <TrackCard key={track.id} track={track} progress={getTrackProgress(track)}
                isLocked={!isUnlocked(track)} onStart={setSelected} idx={idx} />
            ))}
          </div>
        )}

        {/* ── Certificates tab ── */}
        {tab === 'certificates' && (
          Object.keys(allCerts).length === 0
            ? <div style={{ textAlign:'center', padding:'48px 0', color:'#333' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#444', marginBottom:6 }}>No certificates yet</div>
                <div style={{ fontSize:13 }}>Complete a learning track to earn your first certificate.</div>
              </div>
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
                {Object.entries(allCerts).map(([certId, cert]) => (
                  <CertificateCard key={certId} cert={cert} earned={earnedIds.has(certId)} />
                ))}
              </div>
        )}

        {/* ── Bookmarks tab ── */}
        {tab === 'bookmarks' && (
          bookmarks.length === 0
            ? <div style={{ textAlign:'center', padding:'48px 0', color:'#333' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🔖</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#444', marginBottom:6 }}>No bookmarks yet</div>
                <div style={{ fontSize:13 }}>Bookmark problems to save them for later practice.</div>
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {bookmarks.map((b, i) => (
                  <motion.div key={b.id||i} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                    transition={{ delay: i*0.04 }} onClick={() => navigate(`/solve/${b.problemId}`)}
                    style={{ display:'flex', alignItems:'center', gap:12, background:'#0d1117', border:'1px solid #1e2a3a', borderRadius:12, padding:'14px 18px', cursor:'pointer' }}>
                    <span style={{ fontSize:18 }}>🔖</span>
                    <div style={{ flex:1 }}>
                      <div style={{ color:'#e8e8e8', fontSize:13, fontWeight:600 }}>{b.problemTitle || b.problemId}</div>
                    </div>
                    <span style={{ color:'#1a73e8', fontSize:12 }}>Solve →</span>
                  </motion.div>
                ))}
              </div>
        )}
      </div>

      {/* ── Track detail overlay ── */}
      <AnimatePresence>
        {selected && (
          <TrackDetail track={selected} userProgress={userData} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
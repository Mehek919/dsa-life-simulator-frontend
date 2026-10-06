import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE from './config';
import './Roadmap.css';

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

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };
const byId = Object.fromEntries(TRACKS.map((t) => [t.id, t]));
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const realProblems = (track) => track.problems.filter((x) => !x.comingSoon);
const getUniqueProblems = () => { const map = new Map(); TRACKS.forEach((t) => realProblems(t).forEach((x) => map.set(x.id, x))); return Array.from(map.values()); };
const ROADMAP_TOTAL = getUniqueProblems().length;
const RING_C = 2 * Math.PI * 28;

// ─── Track card: radial ring, fog of war when locked ──────────────────────────
function TrackCard({ track, progress, locked, onOpen }) {
  const done = progress.total > 0 && progress.solved >= progress.total;
  const req = track.requires ? byId[track.requires] : null;
  const lockText = req ? `Solve 1 problem in "${req.title}" to unlock` : '';
  return (
    <button id={`rm-${track.id}`} className={`mod${locked ? ' locked' : ''}${done ? ' done' : ''}`} style={{ '--c': track.color }} aria-disabled={locked}
      aria-label={`${track.title}, level ${track.level}, ${locked ? `locked. ${lockText}` : `${progress.pct} percent complete, ${progress.solved} of ${progress.total} problems`}`}
      onClick={() => onOpen(track, locked, lockText)}>
      <span className="hd">
        <span className="ring"><svg viewBox="0 0 66 66"><circle className="bg" cx="33" cy="33" r="28" /><circle className="pg" cx="33" cy="33" r="28" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - progress.pct / 100)} /></svg>
          <span className="ic" aria-hidden="true">{track.icon}</span></span>
        <span><span className="lv">LEVEL {track.level}</span><span className="xpchip">+{track.xpReward} XP</span><h3>{track.title}</h3></span>
        <span className="pct">{locked ? '' : `${progress.pct}%`}</span>
      </span>
      <p>{track.desc}</p>
      <span className="meta"><span>{progress.solved}/{progress.total} problems</span><span>{done ? 'cleared' : locked ? 'locked' : 'in progress'}</span></span>
      <span className="chips">{track.skills.map((s) => <span key={s}>{s}</span>)}</span>
      {locked && <span className="fog"><span className="lk" aria-hidden="true">🔒</span><small>{lockText}</small></span>}
    </button>
  );
}

// ─── Track detail pop-up (same problem links as before) ───────────────────────
function TrackDetail({ track, solvedMap, onClose }) {
  const navigate = useNavigate();
  const closeRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement; if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
  }, [onClose]);
  const real = realProblems(track), solved = real.filter((x) => solvedMap[x.id]).length;
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="rm-dt" style={{ '--c': track.color }}>
        <header>
          <div><span className="lv">LEVEL {track.level}</span><h2 id="rm-dt">{track.icon} {track.title}</h2><div className="sub">+{track.xpReward} XP on completion · {solved}/{real.length} solved</div></div>
          <button className="btn" ref={closeRef} onClick={onClose}>Close</button>
        </header>
        <p>{track.desc}</p>
        <span className="chips">{track.skills.map((s) => <span key={s}>{s}</span>)}</span>
        <div className="plist">
          {track.problems.map((x, i) => {
            const isSolved = !!solvedMap[x.id], soon = !!x.comingSoon;
            return (
              <button key={`${x.id}-${i}`} className={`prow${isSolved ? ' solved' : ''}`} disabled={soon} onClick={() => navigate(`/roadmap-solve/${x.id}`)}>
                <span className="n">{isSolved ? '✓' : soon ? '🔒' : i + 1}</span>
                <span>{x.title}{soon && <small> · coming soon</small>}</span>
                <span className="go">{soon ? '' : isSolved ? 'Solved ✓' : 'Solve →'}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
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
  const [toast, setToast] = useState('');
  const solvedMap = useMemo(() => userData?.solvedProblems || {}, [userData?.solvedProblems]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user?.uid) { if (alive) setLoading(false); return; }
      try {
        const [certRes, bookRes] = await Promise.allSettled([axios.get(`${API_BASE}/certificates/${user.uid}`), axios.get(`${API_BASE}/bookmarks/${user.uid}`)]);
        const certData = certRes.status === 'fulfilled' ? certRes.value.data : {};
        const bookData = bookRes.status === 'fulfilled' ? bookRes.value.data : {};
        if (!alive) return;
        setCertificates(certData.certificates || []);
        // the certificates route returns the full list as `all`
        setAllCerts(certData.all || certData.allCerts || certData.allCertificates || certData.availableCertificates || {});
        setBookmarks(bookData.bookmarks || []);
      } catch (err) { console.error('Roadmap load error:', err); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [user?.uid]);

  useEffect(() => { if (!toast) return undefined; const id = setTimeout(() => setToast(''), 2600); return () => clearTimeout(id); }, [toast]);

  // ── Progress (one rule everywhere: coming-soon problems don't count) ──
  const progressOf = useCallback((track) => {
    const real = realProblems(track), solved = real.filter((x) => !!solvedMap[x.id]).length, total = real.length;
    return { solved, total, pct: total > 0 ? Math.round((solved / total) * 100) : 0 };
  }, [solvedMap]);
  // Same unlock rule as before: one solved problem in the prerequisite track
  const isUnlocked = useCallback((track) => { if (!track.requires) return true; const req = byId[track.requires]; return !req || progressOf(req).solved >= 1; }, [progressOf]);
  const roadmapSolved = getUniqueProblems().filter((x) => solvedMap[x.id]).length;
  const tracksDone = TRACKS.filter((t) => { const pr = progressOf(t); return pr.total > 0 && pr.solved >= pr.total; }).length;
  const earnedIds = new Set(certificates.map((c) => c.certId));
  const level = userData?.level ?? 1, xp = userData?.xp ?? 0;
  const MILES = [
    ['First solve', 'Solve any roadmap problem', roadmapSolved >= 1],
    ['Level 2 open', 'Solve 1 Arrays & Hashing problem', TRACKS.some((t) => t.level === 2 && isUnlocked(t))],
    ['First track', 'Finish every problem in one track', tracksDone >= 1],
    ['Halfway', `Solve ${Math.ceil(ROADMAP_TOTAL / 2)} roadmap problems`, roadmapSolved >= ROADMAP_TOTAL / 2],
    ['Roadmap master', `Solve all ${ROADMAP_TOTAL}`, roadmapSolved >= ROADMAP_TOTAL],
  ];

  // ── Unfog animation for tracks that unlocked since the last visit ──
  const memKey = `roadmap:${user?.uid || 'anon'}`;
  const [justOpened, setJustOpened] = useState(() => new Set());
  useEffect(() => {
    if (loading) return;
    const open = TRACKS.filter(isUnlocked).map((t) => t.id);
    let prev = null; try { prev = JSON.parse(localStorage.getItem(memKey) || 'null'); } catch (e) { prev = null; }
    if (Array.isArray(prev)) { const fresh = open.filter((id) => !prev.includes(id)); if (fresh.length) { setJustOpened(new Set(fresh)); setToast(`Unlocked: ${fresh.map((id) => byId[id].title).join(', ')}`); } }
    try { localStorage.setItem(memKey, JSON.stringify(open)); } catch (e) { /* ignore */ }
  }, [loading, isUnlocked, memKey]);

  // ── Tracks between modules, measured in the map's own coordinates so they follow the 3D tilt ──
  const mapRef = useRef(null), [paths, setPaths] = useState([]);
  const measure = useCallback(() => {
    const map = mapRef.current; if (!map) return;
    const pos = (el) => { let x = 0, y = 0, n = el; while (n && n !== map) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
    const out = [];
    TRACKS.forEach((t) => {
      if (!t.requires) return; const ea = document.getElementById(`rm-${t.requires}`), eb = document.getElementById(`rm-${t.id}`); if (!ea || !eb) return;
      const a = pos(ea), b = pos(eb), from = byId[t.requires]; let x1, y1, x2, y2, d;
      if (Math.abs(a.y - b.y) < 8) { const ltr = a.x < b.x; x1 = ltr ? a.x + a.w : a.x; x2 = ltr ? b.x : b.x + b.w; y1 = y2 = a.y + a.h / 2; d = `M${x1} ${y1} L${x2} ${y2}`; }
      else { x1 = a.x + a.w / 2; y1 = a.y + a.h; x2 = b.x + b.w / 2; y2 = b.y; const my = (y1 + y2) / 2; d = `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`; }
      out.push({ key: `${t.requires}-${t.id}`, d, x1, y1, x2, y2, lit: isUnlocked(t), color: from.color });
    });
    setPaths(out);
  }, [isUnlocked]);
  useEffect(() => {
    if (tab !== 'tracks' || loading) return undefined;
    const id = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => measure()); if (mapRef.current) ro.observe(mapRef.current);
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, [tab, loading, measure]);

  const openTrack = useCallback((track, locked, lockText) => { if (locked) { setToast(`Locked: ${lockText}`); return; } setSelected(track); }, []);
  const closeTrack = useCallback(() => setSelected(null), []);
  const TABS = [['tracks', 'Learning Paths'], ['certificates', 'Certificates'], ['bookmarks', 'Bookmarks']];
  const onTabKey = (e) => { const i = TABS.findIndex((t) => t[0] === tab), n = { ArrowRight: (i + 1) % 3, ArrowLeft: (i + 2) % 3 }[e.key]; if (n == null) return; e.preventDefault(); setTab(TABS[n][0]); const el = document.getElementById(`rm-tab-${TABS[n][0]}`); if (el) el.focus(); };
  const handle = ((user?.displayName || 'dev').split(' ')[0] || 'dev').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev';

  if (loading) return <div className="rm"><div className="center">loading roadmap…</div></div>;
  if (!user?.uid) return <div className="rm"><div className="center">Please log in first.</div></div>;
  const levels = [...new Set(TRACKS.map((t) => t.level))].sort((a, b) => a - b);

  return (
    <div className="rm">
      <div className="crt" aria-hidden="true" />
      <div className="page">
        <div className="top"><button className="btn" onClick={() => navigate('/world')}>&larr; World</button><div className="path"><b>{handle}</b>@<i>evoworld</i>:~/roadmap$</div></div>

        {/* ── Epic banner ── */}
        <section className="banner" aria-labelledby="rm-h1">
          <div className="grid" aria-hidden="true" />
          <div className="bhead">
            <div><span className="kicker"><i />LEARNING ROADMAP</span><h1 id="rm-h1">Master DSA in the <span>right order</span></h1><p>Future-ready paths. Each track unlocks the next.</p></div>
            <div className="kpis" aria-label="Your stats">
              <div><small>TOTAL XP</small><b style={{ color: '#a78bfa' }}>{xp.toLocaleString()}</b></div>
              <div><small>RANK</small><b className="rank">{(LEVEL_NAMES[level] || 'Legend').toUpperCase()}</b></div>
              <div><small>TRACKS</small><b>{tracksDone}/{TRACKS.length}</b></div>
            </div>
          </div>
          <div className="bigbar">
            <div className="hd"><span>Overall progress</span><span><b>{roadmapSolved}</b> / {ROADMAP_TOTAL} problems</span></div>
            <div className="track" role="img" aria-label={`${roadmapSolved} of ${ROADMAP_TOTAL} roadmap problems solved`}><i className="fill" style={{ width: `${ROADMAP_TOTAL ? (roadmapSolved / ROADMAP_TOTAL) * 100 : 0}%` }} /></div>
          </div>
          <div className="miles" aria-label="Milestones">
            {MILES.map(([title, hint, on]) => <div key={title} className={`mile${on ? ' on' : ''}`}><b>{title}</b>{on ? 'Unlocked' : hint}</div>)}
          </div>
        </section>

        <div className="tabs" role="tablist" aria-label="Roadmap sections" onKeyDown={onTabKey}>
          {TABS.map(([k, label]) => <button key={k} id={`rm-tab-${k}`} className="tab" role="tab" aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}>{label}</button>)}
        </div>

        <section role="tabpanel" aria-labelledby={`rm-tab-${tab}`}>
          {tab === 'tracks' && (
            <div className="mapwrap">
              <div className="map" ref={mapRef}>
                <svg className="tracks" aria-hidden="true" viewBox={mapRef.current ? `0 0 ${mapRef.current.offsetWidth} ${mapRef.current.offsetHeight}` : undefined}>
                  {paths.map((pth) => (
                    <g key={pth.key}>
                      <path className="base" d={pth.d} />
                      <path className={pth.lit ? 'lit' : 'dim'} style={{ '--c': pth.color }} d={pth.d} />
                      <circle className="stop" cx={pth.x1} cy={pth.y1} r="6" stroke={pth.lit ? pth.color : '#3a4a48'} />
                      <circle className="stop" cx={pth.x2} cy={pth.y2} r="6" stroke={pth.lit ? pth.color : '#3a4a48'} />
                    </g>
                  ))}
                </svg>
                {levels.map((lv) => {
                  const row = TRACKS.filter((t) => t.level === lv);
                  return (
                    <div key={lv} className="level">
                      <div className="lvlab">LEVEL<b>{lv}</b></div>
                      <div className={`row n${Math.min(3, row.length)}`}>
                        {row.map((t) => (
                          <div key={t.id} className={justOpened.has(t.id) && !reduceMotion() ? 'unfogwrap' : ''}>
                            <TrackCard track={t} progress={progressOf(t)} locked={!isUnlocked(t)} onOpen={openTrack} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'certificates' && (Object.keys(allCerts).length === 0
            ? <div className="sidepanel">No certificates available right now.</div>
            : <div className="certs">{Object.entries(allCerts).map(([id, c]) => {
                const on = earnedIds.has(id);
                return <div key={id} className={`cert${on ? '' : ' off'}`} style={on ? { '--c': c.color } : undefined}><div className="b" aria-hidden="true">{c.badge}</div><b>{c.title}</b><small>{c.desc}</small><div><span className="tag">{on ? 'EARNED' : 'LOCKED'}</span></div></div>;
              })}</div>)}

          {tab === 'bookmarks' && (bookmarks.length === 0
            ? <div className="sidepanel">No bookmarks yet. Bookmark problems to save them for later practice.</div>
            : <div className="marks">{bookmarks.map((b, i) => <button key={b.id || i} className="mark" onClick={() => navigate(`/solve/${b.problemId}`)}><span aria-hidden="true">🔖</span><span>{b.problemTitle || b.problemId}</span><span>Solve →</span></button>)}</div>)}
        </section>
      </div>
      {selected && <TrackDetail track={selected} solvedMap={solvedMap} onClose={closeTrack} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

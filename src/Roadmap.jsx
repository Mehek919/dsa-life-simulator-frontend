import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import API_BASE from './config';

const TRACKS = [
  { id: 'arrays', title: 'Arrays & Hashing', icon: '📦', color: '#00c896', tags: ['Array', 'Hash Table', 'Arrays & Hashing'], skills: ['Hash Maps', 'Prefix Sums', 'Two Pointers'] },
  { id: 'strings', title: 'Strings', icon: '🔤', color: '#38bdf8', tags: ['String', 'Strings'], skills: ['Frequency Map', 'Sliding Window', 'Parsing'] },
  { id: 'binary-search', title: 'Binary Search', icon: '🔍', color: '#1a73e8', tags: ['Binary Search'], skills: ['Search Space', 'Lower Bound', 'Rotated Array'] },
  { id: 'linked-list', title: 'Linked List', icon: '🔗', color: '#a855f7', tags: ['Linked List', 'LinkedList'], skills: ['Fast Slow Pointer', 'Reverse', 'Merge'] },
  { id: 'stack-queue', title: 'Stack & Queue', icon: '📚', color: '#f97316', tags: ['Stack', 'Queue', 'Stack & Queue'], skills: ['Monotonic Stack', 'BFS Queue', 'Parentheses'] },
  { id: 'trees', title: 'Trees & BST', icon: '🌲', color: '#10b981', tags: ['Tree', 'BST', 'Trees & BST'], skills: ['DFS', 'BFS', 'Tree DP'] },
  { id: 'graphs', title: 'Graphs', icon: '🕸️', color: '#f59e0b', tags: ['Graph', 'Graphs', 'Union Find'], skills: ['DFS/BFS', 'Topo Sort', 'Union Find'] },
  { id: 'dp', title: 'Dynamic Programming', icon: '💎', color: '#ff4d4d', tags: ['DP', 'Dynamic Programming'], skills: ['Memoization', 'Tabulation', 'Knapsack'] },
  { id: 'backtracking', title: 'Backtracking', icon: '🌀', color: '#8b5cf6', tags: ['Backtracking', 'Recursion'], skills: ['Recursion', 'Pruning', 'State Search'] },
];

function isRoadmapProblem(p) {
  return (
    p.source === 'roadmap' ||
    p.isRoadmap === true ||
    p.roadmap === true ||
    p.problemType === 'roadmap'
  );
}

function isOdysseyProblem(p) {
  return Boolean(
    p.district ||
    p.chapter ||
    p.company ||
    p.enterpriseOnly ||
    p.odyssey ||
    p.isOdyssey ||
    p.gameProblem ||
    p.source === 'odyssey' ||
    p.source === 'faang' ||
    p.type === 'game' ||
    p.problemType === 'odyssey'
  );
}

function matchesTrack(problem, track) {
  const haystack = [
    problem.title,
    problem.pattern,
    problem.topic,
    problem.roadmapTopic,
    problem.category,
    ...(problem.tags || []),
  ].join(' ').toLowerCase();

  return track.tags.some(tag => haystack.includes(tag.toLowerCase()));
}

function ProgressBar({ value, color }) {
  return (
    <div style={{ height: 6, background: '#1e2a3a', borderRadius: 999, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7 }}
        style={{ height: '100%', background: color }}
      />
    </div>
  );
}

function TrackModal({ track, problems, progress, onClose }) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          width: '100%',
          maxWidth: 760,
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#0d1117',
          border: `1px solid ${track.color}55`,
          borderRadius: 20,
          padding: 24,
        }}
      >
        <button
          onClick={onClose}
          style={{
            float: 'right',
            background: 'transparent',
            border: 0,
            color: '#777',
            fontSize: 22,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        <h2 style={{ margin: 0, color: '#fff' }}>
          {track.icon} {track.title}
        </h2>

        <p style={{ color: '#777', fontSize: 13 }}>
          Future-ready roadmap problems for 2026–2030 skills. Odyssey/FAANG game problems are hidden here.
        </p>

        <div style={{ margin: '16px 0' }}>
          <ProgressBar value={progress.pct} color={track.color} />
          <div style={{ color: '#777', fontSize: 12, marginTop: 6 }}>
            {progress.solved}/{problems.length} solved
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {problems.length === 0 ? (
            <div style={{ color: '#777', padding: 20, border: '1px solid #1e2a3a', borderRadius: 12 }}>
              No roadmap problems found for this track. Run your roadmap seed file first.
            </div>
          ) : (
            problems.map((p, i) => {
              const solved = progress.solvedIds.has(p.id);
              const diffColor = {
                Easy: '#00c896',
                Medium: '#f5c542',
                Hard: '#ff4d4d',
              }[p.difficulty] || '#888';

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/solve/${p.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 15px',
                    background: solved ? `${track.color}10` : '#060910',
                    border: `1px solid ${solved ? track.color + '55' : '#1e2a3a'}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: solved ? track.color : '#555', width: 24 }}>
                    {solved ? '✓' : i + 1}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e8e8e8', fontWeight: 700, fontSize: 14 }}>
                      {p.title}
                    </div>
                    <div style={{ color: '#555', fontSize: 11, marginTop: 3 }}>
                      {p.pattern || p.futureSkill || p.topic || p.tags?.slice(0, 3).join(' · ')}
                    </div>
                  </div>

                  <span style={{
                    color: diffColor,
                    border: `1px solid ${diffColor}55`,
                    background: `${diffColor}18`,
                    borderRadius: 999,
                    padding: '3px 9px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}>
                    {p.difficulty || 'Practice'}
                  </span>

                  <span style={{ color: '#1a73e8', fontSize: 12 }}>Solve →</span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Roadmap({ user, userData }) {
  const navigate = useNavigate();

  const [problems, setProblems] = useState([]);
  const [progress, setProgress] = useState({});
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        const [problemRes, progressRes] = await Promise.all([
          axios.get(`${API_BASE}/problems`, {
            params: {
              roadmapOnly: true,
              source: 'roadmap',
              limit: 500,
            },
          }).catch(() => axios.get(`${API_BASE}/problems`, { params: { limit: 500 } })),

          user?.uid
            ? axios.get(`${API_BASE}/problems/progress/${user.uid}`).catch(() => ({ data: { progress: {} } }))
            : Promise.resolve({ data: { progress: {} } }),
        ]);

        const allProblems = problemRes.data.problems || [];

        const roadmapOnlyProblems = allProblems.filter((p) => {
          if (isOdysseyProblem(p)) return false;
          return isRoadmapProblem(p);
        });

        setProblems(roadmapOnlyProblems);
        setProgress(progressRes.data.progress || {});
      } catch (err) {
        console.error('Roadmap load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRoadmap();
  }, [user?.uid]);

  const solvedIds = useMemo(() => {
    const ids = new Set(userData?.solvedProblems || []);
    Object.entries(progress || {}).forEach(([id, p]) => {
      if (p?.solved) ids.add(id);
    });
    return ids;
  }, [progress, userData?.solvedProblems]);

  const trackProblems = useMemo(() => {
    const map = {};
    TRACKS.forEach(track => {
      map[track.id] = problems.filter(p => matchesTrack(p, track));
    });
    return map;
  }, [problems]);

  const getProgress = track => {
    const list = trackProblems[track.id] || [];
    const solved = list.filter(p => solvedIds.has(p.id)).length;

    return {
      solved,
      total: list.length,
      pct: list.length ? Math.round((solved / list.length) * 100) : 0,
      solvedIds,
    };
  };

  const totalSolved = problems.filter(p => solvedIds.has(p.id)).length;
  const totalProblems = problems.length;
  const overallPct = totalProblems ? Math.round((totalSolved / totalProblems) * 100) : 0;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a14',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
      }}>
        Loading roadmap...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a14',
      color: '#e8e8e8',
      fontFamily: 'Arial, sans-serif',
      padding: '28px 20px 80px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/world')}
          style={{
            background: 'transparent',
            border: '1px solid #1e2a3a',
            borderRadius: 8,
            color: '#777',
            cursor: 'pointer',
            padding: '7px 14px',
            marginBottom: 20,
          }}
        >
          ← World
        </button>

        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900 }}>
          🗺️ DSA Roadmap
        </h1>

        <p style={{ color: '#666', fontSize: 14 }}>
          Future-skill roadmap practice for Microsoft, Oracle, Salesforce, Adobe, Broadcom and cloud-era interviews.
        </p>

        <div style={{
          background: '#0d1117',
          border: '1px solid #1e2a3a',
          borderRadius: 14,
          padding: 18,
          margin: '22px 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#777', fontSize: 12 }}>Roadmap Progress</span>
            <span style={{ color: '#1a73e8', fontWeight: 800, fontSize: 12 }}>
              {totalSolved}/{totalProblems}
            </span>
          </div>
          <ProgressBar value={overallPct} color="#1a73e8" />
        </div>

        {totalProblems === 0 && (
          <div style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 14,
            padding: 18,
            color: '#9ca3af',
            marginBottom: 22,
            fontSize: 13,
          }}>
            No roadmap problems found. Run your roadmap seed file, and make sure each roadmap problem has
            <span style={{ color: '#38bdf8' }}> source: "roadmap"</span> or
            <span style={{ color: '#38bdf8' }}> isRoadmap: true</span>.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {TRACKS.map((track, idx) => {
            const p = getProgress(track);

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedTrack(track)}
                style={{
                  background: '#0d1117',
                  border: `1px solid ${track.color}44`,
                  borderRadius: 18,
                  padding: 18,
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${track.color}10`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: `${track.color}18`,
                    border: `1px solid ${track.color}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {track.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: 16 }}>
                      {track.title}
                    </h3>
                    <div style={{ color: track.color, fontSize: 11, marginTop: 3 }}>
                      {p.total} roadmap problems
                    </div>
                  </div>
                </div>

                <ProgressBar value={p.pct} color={track.color} />

                <div style={{ color: '#666', fontSize: 12, marginTop: 8 }}>
                  {p.solved}/{p.total} solved · {p.pct}%
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {track.skills.map(skill => (
                    <span
                      key={skill}
                      style={{
                        color: '#777',
                        background: '#1e2a3a',
                        borderRadius: 999,
                        padding: '3px 8px',
                        fontSize: 10,
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedTrack && (
          <TrackModal
            track={selectedTrack}
            problems={trackProblems[selectedTrack.id] || []}
            progress={getProgress(selectedTrack)}
            onClose={() => setSelectedTrack(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
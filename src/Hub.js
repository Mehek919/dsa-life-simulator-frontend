import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import axios from 'axios';
import API_BASE from './config';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────
const TOPICS = ['Array', 'String', 'Tree', 'Graph', 'DP', 'LinkedList', 'Stack', 'Queue'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const SORT_OPTIONS = [
  { value: 'newest',    label: '🕐 Newest'     },
  { value: 'popular',  label: '🔥 Popular'    },
  { value: 'rating',   label: '⭐ Top Rated'  },
];

const EVENT_META = {
  challenge_solved:    { icon: '✅', color: 'text-green-400',  label: 'solved a challenge'   },
  challenge_published: { icon: '📢', color: 'text-blue-400',   label: 'published a challenge' },
  level_up:            { icon: '🚀', color: 'text-yellow-400', label: 'leveled up!'            },
  arena_win:           { icon: '⚔️', color: 'text-red-400',    label: 'won an arena battle'   },
  challenge_attempted: { icon: '🎯', color: 'text-purple-400', label: 'attempted a challenge' },
  default:             { icon: '📌', color: 'text-gray-400',   label: 'did something'         },
};

const LEVEL_NAMES = { 1: 'Junior', 2: 'Mid', 3: 'Senior', 4: 'Lead', 5: 'Legend' };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getMeta(type) {
  return EVENT_META[type] || EVENT_META.default;
}

// ─── ActivityFeed Sub-component ───────────────────────────────────────────────
function ActivityFeed() {
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [newIds, setNewIds]     = useState(new Set());

  useEffect(() => {
    const q = query(
      collection(db, 'activityFeed'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsub = onSnapshot(q, (snap) => {
      const incoming = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // highlight truly new docs (not on first load)
      if (!loading) {
        const freshIds = new Set(
          snap.docChanges()
            .filter((c) => c.type === 'added')
            .map((c) => c.doc.id)
        );
        if (freshIds.size > 0) {
          setNewIds(freshIds);
          setTimeout(() => setNewIds(new Set()), 3000);
        }
      }

      setEvents(incoming);
      setLoading(false);
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 mt-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center mt-6">
        No community activity yet. Be the first! 🌱
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2 mt-2 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
      <AnimatePresence initial={false}>
        {events.map((ev) => {
          const meta = getMeta(ev.type);
          const isNew = newIds.has(ev.id);
          return (
            <motion.li
              key={ev.id}
              layout
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all
                ${isNew
                  ? 'border-cyan-500/60 bg-cyan-900/20 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                  : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
            >
              {/* Avatar or icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden text-sm">
                {ev.photoURL
                  ? <img src={ev.photoURL} alt="avatar" className="w-full h-full object-cover rounded-full" />
                  : <span>{meta.icon}</span>
                }
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-semibold text-white truncate">
                    {ev.name || 'Someone'}
                  </span>{' '}
                  <span className={`${meta.color}`}>{meta.label}</span>
                  {ev.message && (
                    <span className="text-gray-400">
                      {' — '}{ev.message}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {meta.icon} {timeAgo(ev.createdAt)}
                  {isNew && (
                    <span className="ml-2 text-cyan-400 font-bold animate-pulse">● LIVE</span>
                  )}
                </p>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

// ─── Main Hub Component ───────────────────────────────────────────────────────
export default function Hub({ user, userData, setUserData }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [challenges,     setChallenges]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [toast,          setToast]          = useState(null);
  const [activeTab,      setActiveTab]      = useState('browse'); // 'browse' | 'create' | 'feed'
  const [filters,        setFilters]        = useState({ topic: '', difficulty: '', sort: 'newest' });
  const [submitting,     setSubmitting]     = useState(false);

  // create-challenge form
  const [form, setForm] = useState({
    question: '',
    options:  ['', '', '', ''],
    correctAnswer: '',
    topic:    'Array',
    difficulty: 'Easy',
    creditCost: 10,
  });

  // ── Fetch challenges ───────────────────────────────────────────────────────
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.topic)      params.topic      = filters.topic;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.sort)       params.sort       = filters.sort;

      const res = await axios.get(`${API_BASE}/challenges`, { params });
      const enriched = (res.data.challenges || []).map((ch) => ({
        ...ch,
        alreadyAttempted: ch.attemptedBy?.includes(user?.uid),
        alreadyRated:     ch.ratedBy?.includes(user?.uid),
      }));
      setChallenges(enriched);
    } catch (err) {
      console.error('fetchChallenges error:', err);
      setError('Failed to load challenges.');
    } finally {
      setLoading(false);
    }
  }, [filters, user?.uid]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Attempt challenge ──────────────────────────────────────────────────────
  const handleAttempt = async (challenge, answer) => {
    if (!user?.uid) return;
    try {
      const res = await axios.post(
        `${API_BASE}/challenges/${challenge.id}/attempt`,
        { userId: user.uid, answer }
      );
      const { correct, message, credits, xp } = res.data;
      showToast(
        correct
          ? `✅ Correct! +${credits} credits, +${xp} XP`
          : `❌ Wrong. ${message || 'Try again.'}`,
        correct ? 'success' : 'error'
      );
      if (correct && setUserData) {
        setUserData((prev) => ({
          ...prev,
          credits: (prev?.credits || 0) + (credits || 0),
          xp:      (prev?.xp      || 0) + (xp      || 0),
        }));
      }
      fetchChallenges();
    } catch (err) {
      showToast(err.response?.data?.error || 'Attempt failed.', 'error');
    }
  };

  // ── Rate challenge ─────────────────────────────────────────────────────────
  const handleRate = async (challengeId, rating) => {
    if (!user?.uid) return;
    try {
      await axios.post(`${API_BASE}/challenges/${challengeId}/rate`, {
        userId: user.uid,
        rating,
      });
      showToast(`⭐ Rated ${rating}/5`);
      fetchChallenges();
    } catch (err) {
      showToast(err.response?.data?.error || 'Rating failed.', 'error');
    }
  };

  // ── Publish challenge ──────────────────────────────────────────────────────
  const handlePublish = async () => {
    const { question, options, correctAnswer, topic, difficulty, creditCost } = form;
    if (!question.trim() || options.some((o) => !o.trim()) || !correctAnswer.trim()) {
      showToast('Please fill in all fields.', 'error');
      return;
    }
    if (!options.includes(correctAnswer)) {
      showToast('Correct answer must match one of the options.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/challenges/publish`, {
        userId:        user.uid,
        creatorName:   user.displayName || 'Anonymous',
        question,
        options,
        correctAnswer,
        topic,
        difficulty,
        creditCost:    Number(creditCost),
      });
      showToast('🎉 Challenge published!');
      setForm({ question: '', options: ['', '', '', ''], correctAnswer: '', topic: 'Array', difficulty: 'Easy', creditCost: 10 });
      setActiveTab('browse');
      fetchChallenges();
      if (setUserData) {
        setUserData((prev) => ({
          ...prev,
          credits: (prev?.credits || 0) - Number(creditCost),
          challengesCreated: (prev?.challengesCreated || 0) + 1,
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Publish failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white font-mono p-4 md:p-8">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl text-sm font-bold
              ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">🏢 Community Hub</h1>
          <p className="text-gray-400 text-sm mt-1">
            Create, solve, and compete with the community
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-white/10 px-3 py-1.5 rounded-lg">
            💰 {userData?.credits ?? 0} credits
          </span>
          <span className="bg-white/10 px-3 py-1.5 rounded-lg">
            ⚡ Lv.{userData?.level ?? 1} {LEVEL_NAMES[userData?.level ?? 1]}
          </span>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
        {[
          { key: 'browse', label: '🔍 Browse'  },
          { key: 'create', label: '✏️ Create'   },
          { key: 'feed',   label: '📡 Live Feed' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === tab.key
                ? 'bg-cyan-500 text-black'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TAB: BROWSE
      ════════════════════════════════════════════════ */}
      {activeTab === 'browse' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={filters.topic}
              onChange={(e) => setFilters((f) => ({ ...f, topic: e.target.value }))}
              className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Topics</option>
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={filters.difficulty}
              onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))}
              className="bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            {SORT_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilters((f) => ({ ...f, sort: s.value }))}
                className={`px-3 py-2 rounded-lg text-sm transition-all
                  ${filters.sort === s.value
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Challenge list */}
          {loading && (
            <div className="grid gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-red-400 bg-red-900/20 border border-red-800 rounded-xl p-4">
              {error}
            </div>
          )}

          {!loading && !error && challenges.length === 0 && (
            <p className="text-gray-500 text-center mt-12">
              No challenges found. Try different filters or create one! 🎯
            </p>
          )}

          <div className="grid gap-4">
            <AnimatePresence>
              {challenges.map((ch) => (
                <ChallengeCard
                  key={ch.id}
                  challenge={ch}
                  userId={user?.uid}
                  onAttempt={handleAttempt}
                  onRate={handleRate}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          TAB: CREATE
      ════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-cyan-400 mb-6">✏️ Create a Challenge</h2>

          <div className="flex flex-col gap-5">
            {/* Question */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Question *</label>
              <textarea
                rows={3}
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="What is the time complexity of binary search?"
                className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white resize-none focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Options */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Options (A–D) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.options.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...form.options];
                      updated[i] = e.target.value;
                      setForm((f) => ({ ...f, options: updated }));
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    className="bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                ))}
              </div>
            </div>

            {/* Correct answer */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Correct Answer * (must match one option exactly)</label>
              <input
                value={form.correctAnswer}
                onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                placeholder="O(log n)"
                className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Topic / Difficulty / Cost */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Topic</label>
                <select
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white"
                >
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                <select
                  value={form.difficulty}
                  onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Credit Cost</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={form.creditCost}
                  onChange={(e) => setForm((f) => ({ ...f, creditCost: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Cost warning */}
            <p className="text-xs text-yellow-400">
              ⚠️ Publishing costs {form.creditCost} credits. You have {userData?.credits ?? 0}.
            </p>

            {/* Submit */}
            <button
              onClick={handlePublish}
              disabled={submitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {submitting ? '🚀 Publishing…' : '📢 Publish Challenge'}
            </button>
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════
          TAB: LIVE FEED
      ════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-cyan-400">📡 Live Community Feed</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Real-time
            </span>
          </div>
          <ActivityFeed />
        </motion.div>
      )}
    </div>
  );
}

// ─── ChallengeCard ────────────────────────────────────────────────────────────
function ChallengeCard({ challenge, userId, onAttempt, onRate }) {
  const [selected,    setSelected]    = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const diffColor = {
    Easy:   'text-green-400 border-green-800 bg-green-900/20',
    Medium: 'text-yellow-400 border-yellow-800 bg-yellow-900/20',
    Hard:   'text-red-400 border-red-800 bg-red-900/20',
  }[challenge.difficulty] || 'text-gray-400 border-gray-700 bg-gray-800/20';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/40 transition-all"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-sm text-white font-medium leading-snug flex-1">
          {challenge.question}
        </p>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded border ${diffColor}`}>
            {challenge.difficulty}
          </span>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
            {challenge.topic}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
        <span>👤 {challenge.creatorName || 'Anonymous'}</span>
        <span>🎯 {challenge.attempts ?? 0} attempts</span>
        <span>✅ {challenge.passes ?? 0} passes</span>
        <span>⭐ {challenge.rating ? challenge.rating.toFixed(1) : '—'} / 5</span>
        <span>💰 {challenge.creditCost ?? 10} credits</span>
      </div>

      {/* Attempt section */}
      {!challenge.alreadyAttempted && challenge.createdBy !== userId && (
        <div className="mt-3">
          {!showOptions ? (
            <button
              onClick={() => setShowOptions(true)}
              className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-3 py-1.5 rounded-lg hover:bg-cyan-500/30 transition-all"
            >
              🎯 Attempt Challenge
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              {challenge.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`text-left text-xs px-3 py-2 rounded-lg border transition-all
                    ${selected === opt
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/30'
                    }`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => selected && onAttempt(challenge, selected)}
                  disabled={!selected}
                  className="flex-1 text-xs bg-cyan-500 text-black font-bold py-2 rounded-lg disabled:opacity-40 hover:bg-cyan-400 transition-all"
                >
                  Submit Answer
                </button>
                <button
                  onClick={() => { setShowOptions(false); setSelected(''); }}
                  className="text-xs bg-white/10 text-gray-300 px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {challenge.alreadyAttempted && (
        <p className="text-xs text-gray-500 mt-2">✔ Already attempted</p>
      )}

      {/* Rating section */}
      {challenge.alreadyAttempted && !challenge.alreadyRated && challenge.createdBy !== userId && (
        <div className="flex items-center gap-1 mt-3">
          <span className="text-xs text-gray-400 mr-1">Rate:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => onRate(challenge.id, star)}
              className={`text-lg transition-all ${
                star <= hoveredStar ? 'text-yellow-400' : 'text-gray-600'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {challenge.alreadyRated && (
        <p className="text-xs text-gray-500 mt-2">⭐ Already rated</p>
      )}
    </motion.div>
  );
}



